import { Dispatch, MutableRefObject, SetStateAction, useCallback, useEffect, useRef } from 'react';
import {
    cancelQueuedBatchJob,
    checkApiKey,
    getQueuedBatchJob,
    importQueuedBatchJobResults,
    submitQueuedBatchJob,
} from '../services/geminiService';
import {
    GeneratedImage,
    GenerationLineageContext,
    ImageModel,
    QueuedBatchJob,
    QueuedBatchJobImportDiagnostic,
    QueuedBatchJobImportIssue,
    QueuedBatchJobStats,
    QueuedBatchJobState,
    StageAsset,
} from '../types';
import { formatGenerationFailureDisplayMessage } from '../utils/generationFailure';
import { extractSavedFilename, persistHistoryThumbnail, saveImageToLocal } from '../utils/imageSaveUtils';
import { buildImageSidecarMetadata } from '../utils/imageSidecarMetadata';
import { resolveCurrentStageSelectionFirstSourceOverride } from '../utils/generationSourceOverride';
import { sanitizeSessionHintsForStorage } from '../utils/inlineImageDisplay';
import {
    isQueuedBatchJobAutoImportReady,
    isQueuedBatchJobClearableIssue,
    isQueuedBatchJobRefreshable,
} from '../utils/queuedBatchJobs';
import { buildStyleTransferPrompt } from '../utils/styleRegistry';
import { useQueuedBatchJobs } from './useQueuedBatchJobs';

const QUEUED_BATCH_JOB_STATES: QueuedBatchJobState[] = [
    'JOB_STATE_PENDING',
    'JOB_STATE_RUNNING',
    'JOB_STATE_SUCCEEDED',
    'JOB_STATE_FAILED',
    'JOB_STATE_CANCELLED',
    'JOB_STATE_EXPIRED',
];
const QUEUED_BATCH_AUTO_REFRESH_INTERVAL_MS = 45_000;
const QUEUED_BATCH_OUTPUT_FORMAT: QueuedBatchJob['outputFormat'] = 'images-only';
const QUEUED_BATCH_INCLUDE_THOUGHTS = false;

const isQueuedBatchJobNameUnrecoverable = (message: string) => {
    const normalized = message.toLowerCase();
    return normalized.includes('could not parse the batch name') || normalized.includes('invalid batch name');
};

const parseBatchJobTimestamp = (value?: string): number | null => {
    if (!value) {
        return null;
    }

    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const normalizeQueuedBatchJobState = (value: string): QueuedBatchJobState => {
    if (QUEUED_BATCH_JOB_STATES.includes(value as QueuedBatchJobState)) {
        return value as QueuedBatchJobState;
    }

    return 'JOB_STATE_PENDING';
};

const summarizeQueuedBatchImportErrors = (
    results: Array<{ status: 'success' | 'failed'; imageUrl?: string; error?: string }>,
): string | null => {
    const uniqueMessages = Array.from(
        new Set(
            results
                .map((result) => (typeof result.error === 'string' ? result.error.trim() : ''))
                .filter((message) => message.length > 0),
        ),
    );

    if (uniqueMessages.length === 0) {
        return null;
    }
    if (uniqueMessages.length === 1) {
        return uniqueMessages[0];
    }

    return `${uniqueMessages[0]} (+${uniqueMessages.length - 1} more)`;
};

type QueuedBatchImportResultLike = {
    index: number;
    status: 'success' | 'failed';
    imageUrl?: string;
    error?: string;
    sessionHints?: Record<string, unknown>;
};

const normalizeQueuedBatchImportIssueExtraction = (value: unknown): QueuedBatchJobImportIssue['extractionIssue'] => {
    if (value === 'missing-candidates' || value === 'missing-parts' || value === 'no-image-data') {
        return value;
    }

    return null;
};

const buildQueuedBatchImportIssues = (results: QueuedBatchImportResultLike[]): QueuedBatchJobImportIssue[] =>
    results.flatMap((result): QueuedBatchJobImportIssue[] => {
        if (result.status === 'success' && result.imageUrl) {
            return [];
        }

        const normalizedError = typeof result.error === 'string' ? result.error.trim() : '';
        if (!normalizedError) {
            return [];
        }

        const sessionHints =
            result.sessionHints && typeof result.sessionHints === 'object'
                ? (result.sessionHints as Record<string, unknown>)
                : null;
        const blockedSafetyCategories = Array.isArray(sessionHints?.blockedSafetyCategories)
            ? sessionHints.blockedSafetyCategories.filter(
                  (entry): entry is string => typeof entry === 'string' && entry.trim().length > 0,
              )
            : [];
        const finishReason =
            typeof sessionHints?.finishReason === 'string' && sessionHints.finishReason.trim().length > 0
                ? sessionHints.finishReason.trim()
                : null;

        return [
            {
                index: Number.isFinite(result.index) ? Math.max(0, Math.floor(result.index)) : 0,
                error: normalizedError,
                ...(finishReason ? { finishReason } : {}),
                ...(normalizeQueuedBatchImportIssueExtraction(sessionHints?.extractionIssue)
                    ? { extractionIssue: normalizeQueuedBatchImportIssueExtraction(sessionHints?.extractionIssue) }
                    : {}),
                ...(blockedSafetyCategories.length > 0 ? { blockedSafetyCategories } : {}),
                ...(sessionHints?.textReturned === true ? { returnedTextContent: true } : {}),
                ...(sessionHints?.thoughtsReturned === true ? { returnedThoughtContent: true } : {}),
            },
        ];
    });

const localizeQueuedBatchFailureMessage = (
    t: (key: string) => string,
    error: string | null | undefined,
    importIssues?: QueuedBatchJobImportIssue[] | null,
) => {
    if (!error) {
        return null;
    }

    const representativeIssue = Array.isArray(importIssues) ? importIssues[0] : null;
    return (
        formatGenerationFailureDisplayMessage(
            t,
            {
                error,
                finishReason: representativeIssue?.finishReason,
                blockedSafetyCategories: representativeIssue?.blockedSafetyCategories,
                extractionIssue: representativeIssue?.extractionIssue,
                returnedTextContent: representativeIssue?.returnedTextContent,
                returnedThoughtContent: representativeIssue?.returnedThoughtContent,
            },
            { includeRetryDetail: false },
        ) || error
    );
};

const normalizeQueuedBatchStateLabel = (state: QueuedBatchJobState) => state.replace('JOB_STATE_', '').toLowerCase();

const sortQueuedBatchImportedHistory = (left: GeneratedImage, right: GeneratedImage) => {
    const leftIndex =
        typeof left.metadata?.batchResultIndex === 'number' ? left.metadata.batchResultIndex : Number.MAX_SAFE_INTEGER;
    const rightIndex =
        typeof right.metadata?.batchResultIndex === 'number'
            ? right.metadata.batchResultIndex
            : Number.MAX_SAFE_INTEGER;
    if (leftIndex !== rightIndex) {
        return leftIndex - rightIndex;
    }

    return left.createdAt - right.createdAt;
};

type GenerationSourceOverride = {
    sourceHistoryId: string | null;
    sourceLineageAction?: 'continue' | 'branch' | null;
};

type RemoteQueuedJobSeed = Pick<
    QueuedBatchJob,
    | 'localId'
    | 'prompt'
    | 'restoredFromSnapshot'
    | 'generationMode'
    | 'aspectRatio'
    | 'imageSize'
    | 'style'
    | 'outputFormat'
    | 'temperature'
    | 'thinkingLevel'
    | 'includeThoughts'
    | 'googleSearch'
    | 'imageSearch'
    | 'batchSize'
    | 'objectImageCount'
    | 'characterImageCount'
    | 'hasImportablePayload'
    | 'submissionPending'
    | 'importDiagnostic'
    | 'importIssues'
    | 'error'
    | 'parentHistoryId'
    | 'rootHistoryId'
    | 'sourceHistoryId'
    | 'lineageAction'
    | 'lineageDepth'
>;

type RemoteQueuedJob = {
    name: string;
    displayName: string;
    state: string;
    model: ImageModel;
    createTime?: string;
    updateTime?: string;
    startTime?: string;
    endTime?: string;
    error?: string | null;
    hasImportablePayload: boolean;
    inlinedResponseCount?: number;
    batchStats?: QueuedBatchJobStats | null;
};

type UseQueuedBatchWorkflowArgs = {
    initialQueuedJobs: QueuedBatchJob[];
    history: GeneratedImage[];
    apiKeyReady: boolean;
    setApiKeyReady: Dispatch<SetStateAction<boolean>>;
    handleApiKeyConnect: () => Promise<boolean>;
    prompt: string;
    imageStyle: string;
    imageModel: ImageModel;
    batchSize: number;
    aspectRatio: QueuedBatchJob['aspectRatio'];
    imageSize: QueuedBatchJob['imageSize'];
    outputFormat: QueuedBatchJob['outputFormat'];
    temperature: number;
    thinkingLevel: QueuedBatchJob['thinkingLevel'];
    includeThoughts: boolean;
    googleSearch: boolean;
    imageSearch: boolean;
    currentStageAsset: StageAsset | null;
    branchOriginIdByTurnId: Record<string, string>;
    workspaceSessionSourceHistoryId: string | null;
    workspaceSessionSourceLineageAction?: 'continue' | 'branch' | null;
    objectImages: string[];
    characterImages: string[];
    getModelLabel: (model: ImageModel) => string;
    getGenerationLineageContext: (params: {
        mode: string;
        editingInput?: string;
        sourceOverride?: GenerationSourceOverride | null;
    }) => GenerationLineageContext;
    addLog: (message: string) => void;
    showNotification: (message: string, type?: 'info' | 'error') => void;
    setHistory: Dispatch<SetStateAction<GeneratedImage[]>>;
    historySelectRef: MutableRefObject<((item: GeneratedImage) => void) | null>;
    canQueueComposerBatch: boolean;
    queueBatchDisabledReason: string | null;
    canQueueEditorBatch: boolean;
    editorQueueDisabledReason: string | null;
    t: (key: string) => string;
};

type QueuedBatchJobGenerationDraft = {
    finalPrompt: string;
    editingInput?: string;
    generationMode: string;
    lineageContext: GenerationLineageContext;
    finalObjectInputs: string[];
    finalCharacterInputs: string[];
    batchSize: number;
    aspectRatio: QueuedBatchJob['aspectRatio'];
    imageSize: QueuedBatchJob['imageSize'];
    style: QueuedBatchJob['style'];
    model: ImageModel;
    outputFormat: QueuedBatchJob['outputFormat'];
    temperature: number;
    thinkingLevel: QueuedBatchJob['thinkingLevel'];
    includeThoughts: boolean;
    googleSearch: boolean;
    imageSearch: boolean;
    displayName: string;
};

type EditorQueuedBatchJobSubmission = {
    prompt: string;
    editingInput: string;
    batchSize: number;
    imageSize: QueuedBatchJob['imageSize'];
    aspectRatio: QueuedBatchJob['aspectRatio'];
    objectImageInputs?: string[];
    characterImageInputs?: string[];
    generationMode?: string;
    sourceOverride?: GenerationSourceOverride | null;
};

const normalizeQueuedBatchCount = (value: number | null | undefined): number | null => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return null;
    }

    const normalized = Math.max(0, Math.floor(value));
    return normalized > 0 ? normalized : null;
};

const resolveQueuedBatchRequestCount = (
    remoteJob: Pick<RemoteQueuedJob, 'batchStats' | 'inlinedResponseCount'>,
    fallbackCount: number,
) =>
    normalizeQueuedBatchCount(remoteJob.batchStats?.requestCount) ??
    normalizeQueuedBatchCount(remoteJob.inlinedResponseCount) ??
    normalizeQueuedBatchCount(fallbackCount) ??
    1;

const normalizeQueuedBatchDraft = (draft: QueuedBatchJobGenerationDraft): QueuedBatchJobGenerationDraft => ({
    ...draft,
    outputFormat: QUEUED_BATCH_OUTPUT_FORMAT,
    includeThoughts: QUEUED_BATCH_INCLUDE_THOUGHTS,
});

type UseQueuedBatchWorkflowReturn = {
    queuedJobs: QueuedBatchJob[];
    setQueuedJobs: Dispatch<SetStateAction<QueuedBatchJob[]>>;
    handleQueueBatchJob: () => Promise<void>;
    handleQueueBatchJobFromEditor: (submission: EditorQueuedBatchJobSubmission) => Promise<void>;
    handlePollQueuedJob: (localId: string) => Promise<void>;
    handlePollAllQueuedJobs: (options?: { silent?: boolean; reason?: 'manual' | 'auto' }) => Promise<void>;
    handleCancelQueuedJob: (localId: string) => Promise<void>;
    handleImportQueuedJob: (localId: string) => Promise<void>;
    handleImportAllQueuedJobs: () => Promise<void>;
    handleOpenImportedQueuedJob: (localId: string) => void;
    handleOpenLatestImportedQueuedJob: (localId: string) => void;
    handleOpenImportedQueuedHistoryItem: (historyId: string) => void;
    handleClearIssueQueuedJobs: () => void;
    handleClearImportedQueuedJobs: () => void;
    handleRemoveQueuedJob: (localId: string) => void;
};

export function useQueuedBatchWorkflow({
    initialQueuedJobs,
    history,
    apiKeyReady,
    setApiKeyReady,
    handleApiKeyConnect,
    prompt,
    imageStyle,
    imageModel,
    batchSize,
    aspectRatio,
    imageSize,
    outputFormat,
    temperature,
    thinkingLevel,
    includeThoughts,
    googleSearch,
    imageSearch,
    currentStageAsset,
    branchOriginIdByTurnId,
    workspaceSessionSourceHistoryId,
    workspaceSessionSourceLineageAction,
    objectImages,
    characterImages,
    getModelLabel,
    getGenerationLineageContext,
    addLog,
    showNotification,
    setHistory,
    historySelectRef,
    canQueueComposerBatch,
    queueBatchDisabledReason,
    canQueueEditorBatch,
    editorQueueDisabledReason,
    t,
}: UseQueuedBatchWorkflowArgs): UseQueuedBatchWorkflowReturn {
    const formatMessage = useCallback(
        (key: string, ...values: Array<string | number>) =>
            values.reduce((message, value, index) => message.replace(`{${index}}`, String(value)), t(key)),
        [t],
    );

    const { queuedJobs, setQueuedJobs, upsertQueuedJob, removeQueuedJob, removeQueuedJobs } = useQueuedBatchJobs({
        initialQueuedJobs,
    });
    const queuedJobRefreshInFlightRef = useRef<Set<string>>(new Set());

    const getImportedQueuedHistoryItemsForJob = useCallback(
        (job: QueuedBatchJob | null | undefined) => {
            if (!job) {
                return [];
            }

            return history
                .filter((item) => item.executionMode === 'queued-batch-job' && item.variantGroupId === job.name)
                .sort(sortQueuedBatchImportedHistory);
        },
        [history],
    );

    const hasImportedQueuedResultsInCurrentWorkspace = useCallback(
        (job: QueuedBatchJob | null | undefined) => getImportedQueuedHistoryItemsForJob(job).length > 0,
        [getImportedQueuedHistoryItemsForJob],
    );

    const isQueuedBatchJobReadyForCurrentWorkspaceImport = useCallback(
        (job: QueuedBatchJob) =>
            isQueuedBatchJobAutoImportReady(job) && !hasImportedQueuedResultsInCurrentWorkspace(job),
        [hasImportedQueuedResultsInCurrentWorkspace],
    );

    const buildQueuedBatchDisplayName = useCallback(
        (model: ImageModel) =>
            `${getModelLabel(model)} queued ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        [getModelLabel],
    );

    const buildQueuedJobGenerationDraft = useCallback((): QueuedBatchJobGenerationDraft | null => {
        const editingInput = currentStageAsset?.url ?? undefined;
        const isStyleTransfer =
            !editingInput && (objectImages.length > 0 || characterImages.length > 0) && imageStyle !== 'None';
        if (!prompt.trim() && !editingInput && !isStyleTransfer) {
            return null;
        }

        const finalPrompt = prompt.trim()
            ? prompt
            : editingInput
              ? 'High resolution, seamless integration with surrounding context, maintain consistent lighting and texture.'
              : buildStyleTransferPrompt(imageStyle);
        const generationMode =
            currentStageAsset?.url || objectImages.length > 0 || characterImages.length > 0
                ? 'Image to Image/Mixing'
                : 'Text to Image';
        const sourceOverride = editingInput
            ? resolveCurrentStageSelectionFirstSourceOverride({
                  sourceHistoryId: currentStageAsset?.sourceHistoryId ?? null,
                  currentStageLineageAction: currentStageAsset?.lineageAction,
                  history,
                  branchOriginIdByTurnId,
                  workspaceSessionSourceHistoryId,
                  workspaceSessionSourceLineageAction,
              })
            : undefined;
        const lineageContext = getGenerationLineageContext({ mode: generationMode, editingInput, sourceOverride });

        return {
            finalPrompt,
            editingInput,
            generationMode,
            lineageContext,
            finalObjectInputs: objectImages,
            finalCharacterInputs: characterImages,
            batchSize,
            aspectRatio,
            imageSize,
            style: imageStyle,
            model: imageModel,
            outputFormat,
            temperature,
            thinkingLevel,
            includeThoughts,
            googleSearch,
            imageSearch,
            displayName: buildQueuedBatchDisplayName(imageModel),
        };
    }, [
        aspectRatio,
        batchSize,
        buildQueuedBatchDisplayName,
        branchOriginIdByTurnId,
        characterImages,
        history,
        currentStageAsset?.lineageAction,
        currentStageAsset?.url,
        currentStageAsset?.sourceHistoryId,
        getGenerationLineageContext,
        googleSearch,
        imageModel,
        imageSearch,
        imageSize,
        imageStyle,
        includeThoughts,
        objectImages,
        outputFormat,
        prompt,
        temperature,
        thinkingLevel,
        workspaceSessionSourceHistoryId,
        workspaceSessionSourceLineageAction,
    ]);

    const mapRemoteQueuedJobToLocal = useCallback(
        (remoteJob: RemoteQueuedJob, seed: RemoteQueuedJobSeed): QueuedBatchJob => {
            const createdAt = parseBatchJobTimestamp(remoteJob.createTime) || Date.now();
            const updatedAt = parseBatchJobTimestamp(remoteJob.updateTime) || Date.now();
            const startedAt = parseBatchJobTimestamp(remoteJob.startTime);
            const completedAt = parseBatchJobTimestamp(remoteJob.endTime);
            const state = normalizeQueuedBatchJobState(remoteJob.state);
            const hasImportablePayload = Boolean(remoteJob.hasImportablePayload);
            const resolvedBatchSize = resolveQueuedBatchRequestCount(remoteJob, seed.batchSize);
            const importDiagnostic: QueuedBatchJobImportDiagnostic | null =
                state === 'JOB_STATE_SUCCEEDED' && !hasImportablePayload
                    ? 'no-payload'
                    : hasImportablePayload && seed.importDiagnostic === 'extraction-failure'
                      ? 'extraction-failure'
                      : null;
            const resolvedImportIssues =
                importDiagnostic === 'extraction-failure' && Array.isArray(seed.importIssues) && seed.importIssues.length > 0
                    ? seed.importIssues
                    : null;
            const resolvedError =
                remoteJob.error || (importDiagnostic === 'extraction-failure' ? seed.error || null : null);

            return {
                localId: seed.localId,
                name: remoteJob.name,
                displayName: remoteJob.displayName,
                restoredFromSnapshot: seed.restoredFromSnapshot,
                state,
                model: remoteJob.model,
                prompt: seed.prompt,
                generationMode: seed.generationMode,
                aspectRatio: seed.aspectRatio,
                imageSize: seed.imageSize,
                style: seed.style,
                outputFormat: seed.outputFormat,
                temperature: seed.temperature,
                thinkingLevel: seed.thinkingLevel,
                includeThoughts: seed.includeThoughts,
                googleSearch: seed.googleSearch,
                imageSearch: seed.imageSearch,
                batchSize: resolvedBatchSize,
                batchStats: remoteJob.batchStats || null,
                objectImageCount: seed.objectImageCount,
                characterImageCount: seed.characterImageCount,
                createdAt,
                updatedAt,
                startedAt,
                completedAt,
                lastPolledAt: null,
                hasImportablePayload,
                submissionPending: false,
                importDiagnostic,
                importIssues: resolvedImportIssues,
                error: resolvedError,
                parentHistoryId: seed.parentHistoryId,
                rootHistoryId: seed.rootHistoryId,
                sourceHistoryId: seed.sourceHistoryId,
                lineageAction: seed.lineageAction,
                lineageDepth: seed.lineageDepth,
            };
        },
        [],
    );

    const submitQueuedBatchDraft = useCallback(
        async (draft: QueuedBatchJobGenerationDraft) => {
            if (!apiKeyReady) {
                const connected = await handleApiKeyConnect();
                if (!connected) {
                    return;
                }
                const ready = await checkApiKey();
                if (!ready) {
                    return;
                }
                setApiKeyReady(true);
            }

            const queuedDraft = normalizeQueuedBatchDraft(draft);

            const localId = crypto.randomUUID();
            const createdAt = Date.now();
            const seed = {
                localId,
                prompt: queuedDraft.finalPrompt,
                restoredFromSnapshot: false,
                generationMode: queuedDraft.generationMode,
                aspectRatio: queuedDraft.aspectRatio,
                imageSize: queuedDraft.imageSize,
                style: queuedDraft.style,
                outputFormat: queuedDraft.outputFormat,
                temperature: queuedDraft.temperature,
                thinkingLevel: queuedDraft.thinkingLevel,
                includeThoughts: queuedDraft.includeThoughts,
                googleSearch: queuedDraft.googleSearch,
                imageSearch: queuedDraft.imageSearch,
                batchSize: queuedDraft.batchSize,
                objectImageCount: queuedDraft.finalObjectInputs.length,
                characterImageCount: queuedDraft.finalCharacterInputs.length,
                hasImportablePayload: false,
                submissionPending: true,
                importDiagnostic: null,
                importIssues: null,
                parentHistoryId: queuedDraft.lineageContext?.parentHistoryId || null,
                rootHistoryId: queuedDraft.lineageContext?.rootHistoryId || null,
                sourceHistoryId: queuedDraft.lineageContext?.sourceHistoryId || null,
                lineageAction: queuedDraft.lineageContext?.lineageAction || 'root',
                lineageDepth: queuedDraft.lineageContext?.lineageDepth || 0,
            } as const;

            upsertQueuedJob({
                localId,
                name: `local-pending/${localId}`,
                displayName: queuedDraft.displayName,
                restoredFromSnapshot: false,
                state: 'JOB_STATE_PENDING',
                model: queuedDraft.model,
                prompt: queuedDraft.finalPrompt,
                generationMode: queuedDraft.generationMode,
                aspectRatio: queuedDraft.aspectRatio,
                imageSize: queuedDraft.imageSize,
                style: queuedDraft.style,
                outputFormat: queuedDraft.outputFormat,
                temperature: queuedDraft.temperature,
                thinkingLevel: queuedDraft.thinkingLevel,
                includeThoughts: queuedDraft.includeThoughts,
                googleSearch: queuedDraft.googleSearch,
                imageSearch: queuedDraft.imageSearch,
                batchSize: queuedDraft.batchSize,
                batchStats: null,
                objectImageCount: queuedDraft.finalObjectInputs.length,
                characterImageCount: queuedDraft.finalCharacterInputs.length,
                createdAt,
                updatedAt: createdAt,
                startedAt: null,
                completedAt: null,
                lastPolledAt: null,
                hasImportablePayload: false,
                submissionPending: true,
                importDiagnostic: null,
                importIssues: null,
                error: null,
                parentHistoryId: seed.parentHistoryId,
                rootHistoryId: seed.rootHistoryId,
                sourceHistoryId: seed.sourceHistoryId,
                lineageAction: seed.lineageAction,
                lineageDepth: seed.lineageDepth,
            });

            try {
                const remoteJob = await submitQueuedBatchJob({
                    prompt: queuedDraft.finalPrompt,
                    aspectRatio: queuedDraft.aspectRatio,
                    imageSize: queuedDraft.imageSize,
                    style: queuedDraft.style,
                    model: queuedDraft.model,
                    editingInput: queuedDraft.editingInput,
                    objectImageInputs: queuedDraft.finalObjectInputs,
                    characterImageInputs: queuedDraft.finalCharacterInputs,
                    outputFormat: queuedDraft.outputFormat,
                    temperature: queuedDraft.temperature,
                    thinkingLevel: queuedDraft.thinkingLevel,
                    includeThoughts: queuedDraft.includeThoughts,
                    googleSearch: queuedDraft.googleSearch,
                    imageSearch: queuedDraft.imageSearch,
                    requestCount: queuedDraft.batchSize,
                    displayName: queuedDraft.displayName,
                });

                upsertQueuedJob(mapRemoteQueuedJobToLocal(remoteJob, seed));
                addLog(formatMessage('queuedBatchSubmittedLog', remoteJob.name));
                showNotification(t('queuedBatchSubmittedNotice'), 'info');
            } catch (error: any) {
                const message = error?.message || 'Queued batch job submission failed.';
                removeQueuedJob(localId);
                addLog(formatMessage('queuedBatchSubmissionFailedLog', message));
                showNotification(message, 'error');
            }
        },
        [
            addLog,
            apiKeyReady,
            formatMessage,
            handleApiKeyConnect,
            mapRemoteQueuedJobToLocal,
            removeQueuedJob,
            setApiKeyReady,
            showNotification,
            t,
            upsertQueuedJob,
        ],
    );

    const handleQueueBatchJob = useCallback(async () => {
        if (!canQueueComposerBatch) {
            showNotification(queueBatchDisabledReason || t('queueBatchMemoryContinuationDisabledReason'), 'error');
            return;
        }

        const draft = buildQueuedJobGenerationDraft();
        if (!draft) {
            showNotification(t('errorNoPrompt'), 'error');
            return;
        }

        await submitQueuedBatchDraft(draft);
    }, [
        buildQueuedJobGenerationDraft,
        canQueueComposerBatch,
        queueBatchDisabledReason,
        showNotification,
        submitQueuedBatchDraft,
        t,
    ]);

    const handleQueueBatchJobFromEditor = useCallback(
        async ({
            prompt: editorPrompt,
            editingInput,
            batchSize: editorBatchSize,
            imageSize: editorImageSize,
            aspectRatio: editorAspectRatio,
            objectImageInputs = [],
            characterImageInputs = [],
            generationMode = 'Editor Edit',
            sourceOverride,
        }: EditorQueuedBatchJobSubmission) => {
            if (!canQueueEditorBatch) {
                showNotification(
                    editorQueueDisabledReason ||
                        queueBatchDisabledReason ||
                        t('queueBatchMemoryContinuationDisabledReason'),
                    'error',
                );
                return;
            }

            if (!editorPrompt.trim() || !editingInput) {
                showNotification(t('errorNoPrompt'), 'error');
                return;
            }

            const lineageContext = getGenerationLineageContext({ mode: generationMode, editingInput, sourceOverride });
            await submitQueuedBatchDraft({
                finalPrompt: editorPrompt,
                editingInput,
                generationMode,
                lineageContext,
                finalObjectInputs: objectImageInputs,
                finalCharacterInputs: characterImageInputs,
                batchSize: editorBatchSize,
                aspectRatio: editorAspectRatio,
                imageSize: editorImageSize,
                style: 'None',
                model: imageModel,
                outputFormat,
                temperature,
                thinkingLevel,
                includeThoughts,
                googleSearch,
                imageSearch,
                displayName: buildQueuedBatchDisplayName(imageModel),
            });
        },
        [
            buildQueuedBatchDisplayName,
            canQueueEditorBatch,
            editorQueueDisabledReason,
            getGenerationLineageContext,
            googleSearch,
            imageModel,
            imageSearch,
            includeThoughts,
            outputFormat,
            queueBatchDisabledReason,
            showNotification,
            submitQueuedBatchDraft,
            t,
            temperature,
            thinkingLevel,
        ],
    );

    const pollQueuedJob = useCallback(
        async (localId: string, options?: { silent?: boolean; reason?: 'manual' | 'auto' }) => {
            const job = queuedJobs.find((candidate) => candidate.localId === localId);
            if (!job) {
                return;
            }

            if (queuedJobRefreshInFlightRef.current.has(localId)) {
                return;
            }

            queuedJobRefreshInFlightRef.current.add(localId);

            try {
                const remoteJob = await getQueuedBatchJob(job.name);
                const updatedAt = Date.now();
                const nextJob = {
                    ...mapRemoteQueuedJobToLocal(remoteJob, job),
                    lastPolledAt: updatedAt,
                };
                const stateChanged = nextJob.state !== job.state;
                const isReadyForCurrentWorkspaceImport = isQueuedBatchJobReadyForCurrentWorkspaceImport(nextJob);
                const hasImportedResultsInCurrentWorkspace = hasImportedQueuedResultsInCurrentWorkspace(nextJob);

                upsertQueuedJob(nextJob);

                if (!options?.silent || stateChanged) {
                    addLog(formatMessage('queuedBatchPolledLog', job.name, remoteJob.state));
                }

                if (!options?.silent && options?.reason === 'manual') {
                    if (nextJob.state === 'JOB_STATE_SUCCEEDED') {
                        if (hasImportedResultsInCurrentWorkspace) {
                            showNotification(formatMessage('queuedBatchPolledLog', job.name, remoteJob.state), 'info');
                        } else if (nextJob.hasImportablePayload === false) {
                            showNotification(t('queuedBatchNoPayloadResultsNotice'), 'error');
                        } else if (nextJob.error) {
                            showNotification(
                                localizeQueuedBatchFailureMessage(t, nextJob.error, nextJob.importIssues) ||
                                    nextJob.error,
                                'error',
                            );
                        } else if (isReadyForCurrentWorkspaceImport) {
                            showNotification(formatMessage('queuedBatchReadyToImportNotice', job.displayName), 'info');
                        } else {
                            showNotification(t('queuedBatchNoImportableResultsNotice'), 'error');
                        }
                    } else if (
                        nextJob.state === 'JOB_STATE_FAILED' ||
                        nextJob.state === 'JOB_STATE_CANCELLED' ||
                        nextJob.state === 'JOB_STATE_EXPIRED'
                    ) {
                        showNotification(
                            localizeQueuedBatchFailureMessage(t, nextJob.error, nextJob.importIssues) ||
                                nextJob.error ||
                                formatMessage(
                                    'queuedBatchFinishedStateNotice',
                                    job.displayName,
                                    normalizeQueuedBatchStateLabel(nextJob.state),
                                ),
                            'error',
                        );
                    } else {
                        showNotification(formatMessage('queuedBatchPolledLog', job.name, remoteJob.state), 'info');
                    }
                }

                if (stateChanged && options?.reason === 'auto') {
                    if (isReadyForCurrentWorkspaceImport) {
                        showNotification(formatMessage('queuedBatchReadyToImportNotice', job.displayName), 'info');
                    } else if (nextJob.state === 'JOB_STATE_FAILED' || nextJob.state === 'JOB_STATE_EXPIRED') {
                        showNotification(
                            formatMessage(
                                'queuedBatchFinishedStateNotice',
                                job.displayName,
                                normalizeQueuedBatchStateLabel(nextJob.state),
                            ),
                            'error',
                        );
                    }
                }
            } catch (error: any) {
                const message = error?.message || 'Failed to poll queued batch job.';
                if (isQueuedBatchJobNameUnrecoverable(message)) {
                    upsertQueuedJob({
                        ...job,
                        restoredFromSnapshot: job.restoredFromSnapshot ?? true,
                        state: 'JOB_STATE_FAILED',
                        updatedAt: Date.now(),
                        completedAt: job.completedAt ?? Date.now(),
                        lastPolledAt: Date.now(),
                        error: message,
                    });
                }
                if (!options?.silent) {
                    addLog(formatMessage('queuedBatchPollFailedLog', job.name, message));
                    showNotification(message, 'error');
                }
            } finally {
                queuedJobRefreshInFlightRef.current.delete(localId);
            }
        },
        [addLog, formatMessage, mapRemoteQueuedJobToLocal, queuedJobs, showNotification, upsertQueuedJob],
    );

    const handlePollQueuedJob = useCallback(
        async (localId: string) => {
            await pollQueuedJob(localId, { silent: false, reason: 'manual' });
        },
        [pollQueuedJob],
    );

    const handlePollAllQueuedJobs = useCallback(
        async (options?: { silent?: boolean; reason?: 'manual' | 'auto' }) => {
            const refreshableJobs = queuedJobs.filter(isQueuedBatchJobRefreshable);
            if (refreshableJobs.length === 0) {
                if (!options?.silent) {
                    showNotification(t('queuedBatchRefreshNoneNotice'), 'info');
                }
                return;
            }

            await Promise.all(
                refreshableJobs.map((job) =>
                    pollQueuedJob(job.localId, {
                        silent: options?.silent,
                        reason: options?.reason,
                    }),
                ),
            );

            if (!options?.silent) {
                addLog(formatMessage('queuedBatchRefreshedLog', refreshableJobs.length));
            }
        },
        [addLog, formatMessage, pollQueuedJob, queuedJobs, showNotification, t],
    );

    const handleCancelQueuedJob = useCallback(
        async (localId: string) => {
            const job = queuedJobs.find((candidate) => candidate.localId === localId);
            if (!job) {
                return;
            }

            try {
                const remoteJob = await cancelQueuedBatchJob(job.name);
                upsertQueuedJob({
                    ...mapRemoteQueuedJobToLocal(remoteJob, job),
                    lastPolledAt: Date.now(),
                });
                addLog(formatMessage('queuedBatchCancelledLog', job.name));
                showNotification(t('queuedBatchCancelRequestedNotice'), 'info');
            } catch (error: any) {
                const message = error?.message || 'Failed to cancel queued batch job.';
                addLog(formatMessage('queuedBatchCancelFailedLog', job.name, message));
                showNotification(message, 'error');
            }
        },
        [addLog, formatMessage, mapRemoteQueuedJobToLocal, queuedJobs, showNotification, t, upsertQueuedJob],
    );

    const importQueuedJob = useCallback(
        async (localId: string, options?: { silent?: boolean }) => {
            const job = queuedJobs.find((candidate) => candidate.localId === localId);
            if (!job) {
                return 0;
            }

            const existingImportedHistoryItems = getImportedQueuedHistoryItemsForJob(job);
            if (existingImportedHistoryItems.length > 0) {
                if (!options?.silent) {
                    historySelectRef.current?.(existingImportedHistoryItems[0]);
                }
                return 0;
            }

            try {
                const { job: remoteJob, results } = await importQueuedBatchJobResults(job.name);
                const successfulResults = results.filter((result) => result.status === 'success' && result.imageUrl);
                const failedResults = results.filter((result) => result.status !== 'success' || !result.imageUrl);
                const resolvedBatchSize = resolveQueuedBatchRequestCount(remoteJob, results.length || job.batchSize);
                const resolvedJobSeed = {
                    ...job,
                    batchSize: resolvedBatchSize,
                };
                const importFailureSummary = summarizeQueuedBatchImportErrors(results);
                const importIssues = buildQueuedBatchImportIssues(results);
                const importedHistoryItems: GeneratedImage[] = await Promise.all(
                    successfulResults.map(async (result) => {
                        let thumbnailUrl = result.imageUrl as string;
                        let savedFilename: string | undefined;
                        let thumbnailSavedFilename: string | undefined;
                        let thumbnailInline: boolean | undefined;
                        const sidecarMetadata = buildImageSidecarMetadata({
                            prompt: job.prompt,
                            model: job.model,
                            style: job.style,
                            aspectRatio: job.aspectRatio,
                            requestedImageSize: job.imageSize,
                            outputFormat: job.outputFormat,
                            temperature: job.temperature,
                            thinkingLevel: job.thinkingLevel,
                            includeThoughts: job.includeThoughts,
                            googleSearch: job.googleSearch,
                            imageSearch: job.imageSearch,
                            generationMode: job.generationMode || 'Queued Batch Job',
                            executionMode: 'queued-batch-job',
                            batchSize: resolvedBatchSize,
                            batchJobName: job.name,
                            batchResultIndex: result.index,
                        });

                        try {
                            const savedPath = await saveImageToLocal(
                                result.imageUrl as string,
                                `${job.model}-batch`,
                                sidecarMetadata,
                            );
                            savedFilename = extractSavedFilename(savedPath);
                        } catch {
                            savedFilename = undefined;
                        }

                        const persistedThumbnail = await persistHistoryThumbnail(
                            result.imageUrl as string,
                            `${job.model}-batch`,
                            savedFilename,
                        );
                        thumbnailUrl = persistedThumbnail.url;
                        thumbnailSavedFilename = persistedThumbnail.thumbnailSavedFilename;
                        thumbnailInline = persistedThumbnail.thumbnailInline;

                        return {
                            id: crypto.randomUUID(),
                            url: thumbnailUrl,
                            savedFilename,
                            thumbnailSavedFilename,
                            thumbnailInline,
                            prompt: job.prompt,
                            aspectRatio: job.aspectRatio,
                            size: job.imageSize,
                            style: job.style,
                            model: job.model,
                            createdAt: Date.now(),
                            mode: job.generationMode || 'Queued Batch Job',
                            executionMode: 'queued-batch-job',
                            variantGroupId: job.name,
                            status: 'success',
                            text: result.text,
                            thoughts: result.thoughts,
                            metadata: sidecarMetadata,
                            grounding: result.grounding,
                            sessionHints: sanitizeSessionHintsForStorage(result.sessionHints || null) || null,
                            conversationId: null,
                            conversationBranchOriginId: null,
                            conversationSourceHistoryId: null,
                            conversationTurnIndex: null,
                            parentHistoryId: job.parentHistoryId || null,
                            rootHistoryId: job.rootHistoryId || null,
                            sourceHistoryId: job.sourceHistoryId || null,
                            lineageAction: job.lineageAction || 'root',
                            lineageDepth: job.lineageDepth || 0,
                        };
                    }),
                );

                if (importedHistoryItems.length === 0) {
                    const importDiagnostic: QueuedBatchJobImportDiagnostic = remoteJob.hasImportablePayload
                        ? 'extraction-failure'
                        : 'no-payload';
                    const importFailureMessage = importFailureSummary || remoteJob.error || null;

                    upsertQueuedJob({
                        ...mapRemoteQueuedJobToLocal(remoteJob, resolvedJobSeed),
                        lastPolledAt: Date.now(),
                        importDiagnostic,
                        importIssues: importIssues.length > 0 ? importIssues : null,
                        error:
                            importDiagnostic === 'extraction-failure' ? importFailureMessage : remoteJob.error || null,
                    });

                    if (!options?.silent) {
                        if (importFailureSummary) {
                            addLog(
                                `Queued batch import found no usable image results for ${job.name}: ${importFailureSummary}`,
                            );
                        }
                        const localizedImportFailureMessage = localizeQueuedBatchFailureMessage(
                            t,
                            importFailureMessage,
                            importIssues,
                        );
                        const notificationMessage =
                            importDiagnostic === 'no-payload'
                                ? t('queuedBatchNoPayloadResultsNotice')
                                : localizedImportFailureMessage || t('queuedBatchNoImportableResultsNotice');
                        showNotification(notificationMessage, 'error');
                    }
                    return 0;
                }

                setHistory((previous) => [...importedHistoryItems, ...previous]);
                upsertQueuedJob({
                    ...mapRemoteQueuedJobToLocal(remoteJob, resolvedJobSeed),
                    lastPolledAt: Date.now(),
                    importDiagnostic: null,
                    importIssues: null,
                    error: null,
                });
                historySelectRef.current?.(importedHistoryItems[0]);
                if (!options?.silent && failedResults.length > 0) {
                    addLog(
                        `Queued batch import skipped ${failedResults.length} non-importable results for ${job.name}: ${importFailureSummary || 'No detailed batch result errors were returned.'}`,
                    );
                }
                addLog(formatMessage('queuedBatchImportedLog', importedHistoryItems.length, job.name));
                if (!options?.silent) {
                    showNotification(formatMessage('queuedBatchImportedNotice', importedHistoryItems.length), 'info');
                }
                return importedHistoryItems.length;
            } catch (error: any) {
                const message = error?.message || 'Failed to import queued batch results.';
                if (!options?.silent) {
                    addLog(formatMessage('queuedBatchImportFailedLog', job.name, message));
                    showNotification(message, 'error');
                }
                return 0;
            }
        },
        [
            addLog,
            formatMessage,
            getImportedQueuedHistoryItemsForJob,
            historySelectRef,
            mapRemoteQueuedJobToLocal,
            queuedJobs,
            setHistory,
            showNotification,
            t,
            upsertQueuedJob,
        ],
    );

    const handleImportQueuedJob = useCallback(
        async (localId: string) => {
            await importQueuedJob(localId, { silent: false });
        },
        [importQueuedJob],
    );

    const handleImportAllQueuedJobs = useCallback(async () => {
        const readyJobs = queuedJobs.filter(isQueuedBatchJobReadyForCurrentWorkspaceImport);
        if (readyJobs.length === 0) {
            showNotification(t('queuedBatchImportWaitingNotice'), 'info');
            return;
        }

        let importedResultCount = 0;
        for (const job of readyJobs) {
            importedResultCount += await importQueuedJob(job.localId, { silent: true });
        }

        if (importedResultCount > 0) {
            addLog(formatMessage('queuedBatchImportAllLog', importedResultCount, readyJobs.length));
            showNotification(formatMessage('queuedBatchImportAllNotice', importedResultCount), 'info');
            return;
        }

        showNotification(t('queuedBatchImportAllNoneNotice'), 'error');
    }, [
        addLog,
        formatMessage,
        importQueuedJob,
        isQueuedBatchJobReadyForCurrentWorkspaceImport,
        queuedJobs,
        showNotification,
        t,
    ]);

    const getImportedQueuedHistoryItems = useCallback(
        (localId: string) => {
            const job = queuedJobs.find((candidate) => candidate.localId === localId);
            return getImportedQueuedHistoryItemsForJob(job);
        },
        [getImportedQueuedHistoryItemsForJob, queuedJobs],
    );

    const handleOpenImportedQueuedJob = useCallback(
        (localId: string) => {
            const importedHistoryItem = getImportedQueuedHistoryItems(localId)[0];
            if (!importedHistoryItem) {
                return;
            }

            historySelectRef.current?.(importedHistoryItem);
        },
        [getImportedQueuedHistoryItems, historySelectRef],
    );

    const handleOpenLatestImportedQueuedJob = useCallback(
        (localId: string) => {
            const importedHistoryItems = getImportedQueuedHistoryItems(localId);
            const importedHistoryItem = importedHistoryItems[importedHistoryItems.length - 1];
            if (!importedHistoryItem) {
                return;
            }

            historySelectRef.current?.(importedHistoryItem);
        },
        [getImportedQueuedHistoryItems, historySelectRef],
    );

    const handleOpenImportedQueuedHistoryItem = useCallback(
        (historyId: string) => {
            const importedHistoryItem = history.find(
                (item) => item.id === historyId && item.executionMode === 'queued-batch-job',
            );
            if (!importedHistoryItem) {
                return;
            }

            historySelectRef.current?.(importedHistoryItem);
        },
        [history, historySelectRef],
    );

    const handleClearIssueQueuedJobs = useCallback(() => {
        const clearableJobs = queuedJobs.filter(isQueuedBatchJobClearableIssue);
        if (clearableJobs.length === 0) {
            return;
        }

        removeQueuedJobs(clearableJobs.map((job) => job.localId));
        addLog(formatMessage('queuedBatchClearIssuesLog', clearableJobs.length));
        showNotification(formatMessage('queuedBatchClearIssuesNotice', clearableJobs.length), 'info');
    }, [addLog, formatMessage, queuedJobs, removeQueuedJobs, showNotification]);

    const handleClearImportedQueuedJobs = useCallback(() => {
        const importedJobs = queuedJobs.filter(hasImportedQueuedResultsInCurrentWorkspace);
        if (importedJobs.length === 0) {
            return;
        }

        removeQueuedJobs(importedJobs.map((job) => job.localId));
        addLog(formatMessage('queuedBatchClearImportedLog', importedJobs.length));
        showNotification(formatMessage('queuedBatchClearImportedNotice', importedJobs.length), 'info');
    }, [
        addLog,
        formatMessage,
        hasImportedQueuedResultsInCurrentWorkspace,
        queuedJobs,
        removeQueuedJobs,
        showNotification,
    ]);

    const handleRemoveQueuedJob = useCallback(
        (localId: string) => {
            removeQueuedJob(localId);
        },
        [removeQueuedJob],
    );

    useEffect(() => {
        const refreshableJobs = queuedJobs.filter(isQueuedBatchJobRefreshable);
        if (refreshableJobs.length === 0) {
            return;
        }

        const shouldRefreshImmediately = refreshableJobs.some(
            (job) =>
                job.lastPolledAt === null || Date.now() - job.lastPolledAt >= QUEUED_BATCH_AUTO_REFRESH_INTERVAL_MS,
        );

        if (shouldRefreshImmediately) {
            void handlePollAllQueuedJobs({ silent: true, reason: 'auto' });
        }

        const intervalId = window.setInterval(() => {
            if (document.hidden) {
                return;
            }

            void handlePollAllQueuedJobs({ silent: true, reason: 'auto' });
        }, QUEUED_BATCH_AUTO_REFRESH_INTERVAL_MS);

        return () => window.clearInterval(intervalId);
    }, [handlePollAllQueuedJobs, queuedJobs]);

    return {
        queuedJobs,
        setQueuedJobs,
        handleQueueBatchJob,
        handleQueueBatchJobFromEditor,
        handlePollQueuedJob,
        handlePollAllQueuedJobs,
        handleCancelQueuedJob,
        handleImportQueuedJob,
        handleImportAllQueuedJobs,
        handleOpenImportedQueuedJob,
        handleOpenLatestImportedQueuedJob,
        handleOpenImportedQueuedHistoryItem,
        handleClearIssueQueuedJobs,
        handleClearImportedQueuedJobs,
        handleRemoveQueuedJob,
    };
}
