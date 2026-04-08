import { Dispatch, MutableRefObject, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import {
    cancelQueuedBatchJob,
    checkApiKey,
    getQueuedBatchJob,
    importQueuedBatchJobResults,
    listQueuedBatchJobs,
    submitQueuedBatchJob,
} from '../services/geminiService';
import {
    GeneratedImage,
    GenerationLineageContext,
    ImageModel,
    QueuedBatchJob,
    QueuedBatchJobImportDiagnostic,
    QueuedBatchJobStats,
    QueuedBatchJobState,
    StageAsset,
    StructuredOutputMode,
} from '../types';
import { extractSavedFilename, persistHistoryThumbnail, saveImageToLocal } from '../utils/imageSaveUtils';
import { buildImageSidecarMetadata } from '../utils/imageSidecarMetadata';
import { sanitizeSessionHintsForStorage } from '../utils/inlineImageDisplay';
import {
    isQueuedBatchJobAutoImportReady,
    isQueuedBatchJobClearableIssue,
    isQueuedBatchJobImported,
    isQueuedBatchJobImportReady,
    isQueuedBatchJobRefreshable,
} from '../utils/queuedBatchJobs';
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
const RECOVER_RECENT_BATCH_PAGE_SIZE = 50;

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
    | 'structuredOutputMode'
    | 'temperature'
    | 'thinkingLevel'
    | 'includeThoughts'
    | 'googleSearch'
    | 'imageSearch'
    | 'batchSize'
    | 'objectImageCount'
    | 'characterImageCount'
    | 'importedAt'
    | 'hasInlinedResponses'
    | 'submissionPending'
    | 'importDiagnostic'
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
    hasInlinedResponses: boolean;
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
    structuredOutputMode: StructuredOutputMode;
    temperature: number;
    thinkingLevel: QueuedBatchJob['thinkingLevel'];
    includeThoughts: boolean;
    googleSearch: boolean;
    imageSearch: boolean;
    currentStageAsset: StageAsset | null;
    objectImages: string[];
    characterImages: string[];
    getModelLabel: (model: ImageModel) => string;
    getGenerationLineageContext: (params: { mode: string; editingInput?: string }) => GenerationLineageContext;
    addLog: (message: string) => void;
    addPromptToHistory: (prompt: string) => void;
    showNotification: (message: string, type?: 'info' | 'error') => void;
    setHistory: Dispatch<SetStateAction<GeneratedImage[]>>;
    historySelectRef: MutableRefObject<((item: GeneratedImage) => void) | null>;
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
    structuredOutputMode: StructuredOutputMode;
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
};

type UseQueuedBatchWorkflowReturn = {
    queuedJobs: QueuedBatchJob[];
    setQueuedJobs: Dispatch<SetStateAction<QueuedBatchJob[]>>;
    isRecoveringRecentQueuedJobs: boolean;
    handleQueueBatchJob: () => Promise<void>;
    handleQueueBatchJobFromEditor: (submission: EditorQueuedBatchJobSubmission) => Promise<void>;
    handlePollQueuedJob: (localId: string) => Promise<void>;
    handlePollAllQueuedJobs: (options?: { silent?: boolean; reason?: 'manual' | 'auto' }) => Promise<void>;
    handleCancelQueuedJob: (localId: string) => Promise<void>;
    handleRecoverRecentQueuedJobs: () => Promise<void>;
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
    structuredOutputMode,
    temperature,
    thinkingLevel,
    includeThoughts,
    googleSearch,
    imageSearch,
    currentStageAsset,
    objectImages,
    characterImages,
    getModelLabel,
    getGenerationLineageContext,
    addLog,
    addPromptToHistory,
    showNotification,
    setHistory,
    historySelectRef,
    t,
}: UseQueuedBatchWorkflowArgs): UseQueuedBatchWorkflowReturn {
    const [isRecoveringRecentQueuedJobs, setIsRecoveringRecentQueuedJobs] = useState(false);
    const formatMessage = useCallback(
        (key: string, ...values: Array<string | number>) =>
            values.reduce((message, value, index) => message.replace(`{${index}}`, String(value)), t(key)),
        [t],
    );

    const { queuedJobs, setQueuedJobs, upsertQueuedJob, removeQueuedJob, removeQueuedJobs, markQueuedJobImported } =
        useQueuedBatchJobs({
            initialQueuedJobs,
        });
    const queuedJobRefreshInFlightRef = useRef<Set<string>>(new Set());

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
              : `Transform the visual content of the reference image into ${imageStyle} style. Maintain the original composition but apply the ${imageStyle} aesthetic characteristics strongly.`;
        const generationMode = currentStageAsset?.url
            ? 'Follow-up Edit'
            : objectImages.length > 0 || characterImages.length > 0
              ? 'Image to Image/Mixing'
              : 'Text to Image';
        const lineageContext = getGenerationLineageContext({ mode: generationMode, editingInput });

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
            structuredOutputMode,
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
        characterImages,
        currentStageAsset?.url,
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
        structuredOutputMode,
        temperature,
        thinkingLevel,
    ]);

    const mapRemoteQueuedJobToLocal = useCallback(
        (remoteJob: RemoteQueuedJob, seed: RemoteQueuedJobSeed): QueuedBatchJob => {
            const createdAt = parseBatchJobTimestamp(remoteJob.createTime) || Date.now();
            const updatedAt = parseBatchJobTimestamp(remoteJob.updateTime) || Date.now();
            const startedAt = parseBatchJobTimestamp(remoteJob.startTime);
            const completedAt = parseBatchJobTimestamp(remoteJob.endTime);
            const state = normalizeQueuedBatchJobState(remoteJob.state);
            const hasInlinedResponses = Boolean(remoteJob.hasInlinedResponses);
            const importDiagnostic: QueuedBatchJobImportDiagnostic | null =
                state === 'JOB_STATE_SUCCEEDED' && !hasInlinedResponses
                    ? 'no-payload'
                    : hasInlinedResponses && seed.importDiagnostic === 'extraction-failure'
                      ? 'extraction-failure'
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
                structuredOutputMode: seed.structuredOutputMode,
                temperature: seed.temperature,
                thinkingLevel: seed.thinkingLevel,
                includeThoughts: seed.includeThoughts,
                googleSearch: seed.googleSearch,
                imageSearch: seed.imageSearch,
                batchSize: seed.batchSize,
                batchStats: remoteJob.batchStats || null,
                objectImageCount: seed.objectImageCount,
                characterImageCount: seed.characterImageCount,
                createdAt,
                updatedAt,
                startedAt,
                completedAt,
                lastPolledAt: null,
                importedAt: seed.importedAt,
                hasInlinedResponses,
                submissionPending: false,
                importDiagnostic,
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

    const buildRecoveredQueuedJobSeed = useCallback(
        (remoteJob: RemoteQueuedJob): RemoteQueuedJobSeed => {
            const existingJob = queuedJobs.find((candidate) => candidate.name === remoteJob.name);
            if (existingJob) {
                return {
                    localId: existingJob.localId,
                    prompt: existingJob.prompt,
                    restoredFromSnapshot: existingJob.restoredFromSnapshot,
                    generationMode: existingJob.generationMode,
                    aspectRatio: existingJob.aspectRatio,
                    imageSize: existingJob.imageSize,
                    style: existingJob.style,
                    outputFormat: existingJob.outputFormat,
                    structuredOutputMode: existingJob.structuredOutputMode,
                    temperature: existingJob.temperature,
                    thinkingLevel: existingJob.thinkingLevel,
                    includeThoughts: existingJob.includeThoughts,
                    googleSearch: existingJob.googleSearch,
                    imageSearch: existingJob.imageSearch,
                    batchSize: existingJob.batchSize,
                    objectImageCount: existingJob.objectImageCount,
                    characterImageCount: existingJob.characterImageCount,
                    importedAt: existingJob.importedAt,
                    hasInlinedResponses: existingJob.hasInlinedResponses,
                    submissionPending: existingJob.submissionPending,
                    importDiagnostic: existingJob.importDiagnostic,
                    error: existingJob.error,
                    parentHistoryId: existingJob.parentHistoryId,
                    rootHistoryId: existingJob.rootHistoryId,
                    sourceHistoryId: existingJob.sourceHistoryId,
                    lineageAction: existingJob.lineageAction,
                    lineageDepth: existingJob.lineageDepth,
                };
            }

            const recoveredHistoryItems = history
                .filter((item) => item.executionMode === 'queued-batch-job' && item.variantGroupId === remoteJob.name)
                .sort(sortQueuedBatchImportedHistory);
            const firstRecoveredHistoryItem = recoveredHistoryItems[0];
            const lastRecoveredHistoryItem = recoveredHistoryItems[recoveredHistoryItems.length - 1];
            const recoveredMetadata = (firstRecoveredHistoryItem?.metadata || {}) as Record<string, unknown>;
            const recoveredOutputFormat =
                recoveredMetadata.outputFormat === 'images-and-text' ? 'images-and-text' : 'images-only';
            const recoveredStructuredOutputMode =
                typeof recoveredMetadata.structuredOutputMode === 'string'
                    ? (recoveredMetadata.structuredOutputMode as StructuredOutputMode)
                    : 'off';
            const recoveredThinkingLevel =
                recoveredMetadata.thinkingLevel === 'disabled' ||
                recoveredMetadata.thinkingLevel === 'minimal' ||
                recoveredMetadata.thinkingLevel === 'high'
                    ? (recoveredMetadata.thinkingLevel as QueuedBatchJob['thinkingLevel'])
                    : 'minimal';

            return {
                localId: remoteJob.name,
                prompt: firstRecoveredHistoryItem?.prompt || remoteJob.displayName || remoteJob.name,
                restoredFromSnapshot: false,
                generationMode: firstRecoveredHistoryItem?.mode || 'Recovered Batch Job',
                aspectRatio: firstRecoveredHistoryItem?.aspectRatio || '1:1',
                imageSize: firstRecoveredHistoryItem?.size || '1K',
                style: firstRecoveredHistoryItem?.style || 'None',
                outputFormat: recoveredOutputFormat,
                structuredOutputMode: recoveredStructuredOutputMode,
                temperature:
                    typeof recoveredMetadata.temperature === 'number' && Number.isFinite(recoveredMetadata.temperature)
                        ? recoveredMetadata.temperature
                        : 1,
                thinkingLevel: recoveredThinkingLevel,
                includeThoughts:
                    typeof recoveredMetadata.includeThoughts === 'boolean'
                        ? recoveredMetadata.includeThoughts
                        : Boolean(firstRecoveredHistoryItem?.thoughts),
                googleSearch: false,
                imageSearch: false,
                batchSize: remoteJob.batchStats?.requestCount || recoveredHistoryItems.length || 1,
                objectImageCount: 0,
                characterImageCount: 0,
                importedAt: lastRecoveredHistoryItem?.createdAt || null,
                hasInlinedResponses: remoteJob.hasInlinedResponses,
                submissionPending: false,
                importDiagnostic: null,
                error: null,
                parentHistoryId: firstRecoveredHistoryItem?.parentHistoryId || null,
                rootHistoryId: firstRecoveredHistoryItem?.rootHistoryId || null,
                sourceHistoryId: firstRecoveredHistoryItem?.sourceHistoryId || null,
                lineageAction: firstRecoveredHistoryItem?.lineageAction || 'root',
                lineageDepth: firstRecoveredHistoryItem?.lineageDepth || 0,
            };
        },
        [history, queuedJobs],
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

            const localId = crypto.randomUUID();
            const createdAt = Date.now();
            const seed = {
                localId,
                prompt: draft.finalPrompt,
                restoredFromSnapshot: false,
                generationMode: draft.generationMode,
                aspectRatio: draft.aspectRatio,
                imageSize: draft.imageSize,
                style: draft.style,
                outputFormat: draft.outputFormat,
                structuredOutputMode: draft.structuredOutputMode,
                temperature: draft.temperature,
                thinkingLevel: draft.thinkingLevel,
                includeThoughts: draft.includeThoughts,
                googleSearch: draft.googleSearch,
                imageSearch: draft.imageSearch,
                batchSize: draft.batchSize,
                objectImageCount: draft.finalObjectInputs.length,
                characterImageCount: draft.finalCharacterInputs.length,
                importedAt: null,
                hasInlinedResponses: false,
                submissionPending: true,
                importDiagnostic: null,
                parentHistoryId: draft.lineageContext?.parentHistoryId || null,
                rootHistoryId: draft.lineageContext?.rootHistoryId || null,
                sourceHistoryId: draft.lineageContext?.sourceHistoryId || null,
                lineageAction: draft.lineageContext?.lineageAction || 'root',
                lineageDepth: draft.lineageContext?.lineageDepth || 0,
            } as const;

            upsertQueuedJob({
                localId,
                name: `local-pending/${localId}`,
                displayName: draft.displayName,
                restoredFromSnapshot: false,
                state: 'JOB_STATE_PENDING',
                model: draft.model,
                prompt: draft.finalPrompt,
                generationMode: draft.generationMode,
                aspectRatio: draft.aspectRatio,
                imageSize: draft.imageSize,
                style: draft.style,
                outputFormat: draft.outputFormat,
                structuredOutputMode: draft.structuredOutputMode,
                temperature: draft.temperature,
                thinkingLevel: draft.thinkingLevel,
                includeThoughts: draft.includeThoughts,
                googleSearch: draft.googleSearch,
                imageSearch: draft.imageSearch,
                batchSize: draft.batchSize,
                batchStats: null,
                objectImageCount: draft.finalObjectInputs.length,
                characterImageCount: draft.finalCharacterInputs.length,
                createdAt,
                updatedAt: createdAt,
                startedAt: null,
                completedAt: null,
                lastPolledAt: null,
                importedAt: null,
                hasInlinedResponses: false,
                submissionPending: true,
                importDiagnostic: null,
                error: null,
                parentHistoryId: seed.parentHistoryId,
                rootHistoryId: seed.rootHistoryId,
                sourceHistoryId: seed.sourceHistoryId,
                lineageAction: seed.lineageAction,
                lineageDepth: seed.lineageDepth,
            });

            try {
                const remoteJob = await submitQueuedBatchJob({
                    prompt: draft.finalPrompt,
                    aspectRatio: draft.aspectRatio,
                    imageSize: draft.imageSize,
                    style: draft.style,
                    model: draft.model,
                    editingInput: draft.editingInput,
                    objectImageInputs: draft.finalObjectInputs,
                    characterImageInputs: draft.finalCharacterInputs,
                    outputFormat: draft.outputFormat,
                    structuredOutputMode: draft.structuredOutputMode,
                    temperature: draft.temperature,
                    thinkingLevel: draft.thinkingLevel,
                    includeThoughts: draft.includeThoughts,
                    googleSearch: draft.googleSearch,
                    imageSearch: draft.imageSearch,
                    requestCount: draft.batchSize,
                    displayName: draft.displayName,
                });

                upsertQueuedJob(mapRemoteQueuedJobToLocal(remoteJob, seed));
                addLog(formatMessage('queuedBatchSubmittedLog', remoteJob.name));
                showNotification(t('queuedBatchSubmittedNotice'), 'info');
                if (draft.finalPrompt) {
                    addPromptToHistory(draft.finalPrompt);
                }
            } catch (error: any) {
                const message = error?.message || 'Queued batch job submission failed.';
                removeQueuedJob(localId);
                addLog(formatMessage('queuedBatchSubmissionFailedLog', message));
                showNotification(message, 'error');
            }
        },
        [
            addLog,
            addPromptToHistory,
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
        const draft = buildQueuedJobGenerationDraft();
        if (!draft) {
            showNotification(t('errorNoPrompt'), 'error');
            return;
        }

        await submitQueuedBatchDraft(draft);
    }, [buildQueuedJobGenerationDraft, showNotification, submitQueuedBatchDraft, t]);

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
        }: EditorQueuedBatchJobSubmission) => {
            if (!editorPrompt.trim() || !editingInput) {
                showNotification(t('errorNoPrompt'), 'error');
                return;
            }

            const lineageContext = getGenerationLineageContext({ mode: generationMode, editingInput });
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
                structuredOutputMode,
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
            getGenerationLineageContext,
            googleSearch,
            imageModel,
            imageSearch,
            includeThoughts,
            outputFormat,
            showNotification,
            structuredOutputMode,
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
                    importedAt: job.importedAt,
                };
                const stateChanged = nextJob.state !== job.state;

                upsertQueuedJob(nextJob);

                if (!options?.silent || stateChanged) {
                    addLog(formatMessage('queuedBatchPolledLog', job.name, remoteJob.state));
                }

                if (!options?.silent && options?.reason === 'manual') {
                    if (nextJob.state === 'JOB_STATE_SUCCEEDED') {
                        if (nextJob.hasInlinedResponses === false) {
                            showNotification(t('queuedBatchNoPayloadResultsNotice'), 'error');
                        } else if (nextJob.error) {
                            showNotification(nextJob.error, 'error');
                        } else if (isQueuedBatchJobImportReady(nextJob)) {
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
                    if (isQueuedBatchJobImportReady(nextJob)) {
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
                    importedAt: job.importedAt,
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

    const handleRecoverRecentQueuedJobs = useCallback(async () => {
        if (isRecoveringRecentQueuedJobs) {
            return;
        }

        setIsRecoveringRecentQueuedJobs(true);

        try {
            const remoteJobs = await listQueuedBatchJobs(RECOVER_RECENT_BATCH_PAGE_SIZE);
            let recoveredCount = 0;
            let refreshedCount = 0;
            const hydratedJobs = await Promise.all(
                remoteJobs.map(async (remoteJob) => {
                    const existingJob = queuedJobs.find((candidate) => candidate.name === remoteJob.name);
                    const shouldHydrate =
                        !existingJob ||
                        existingJob.lastPolledAt == null ||
                        (existingJob.state === 'JOB_STATE_SUCCEEDED' &&
                            existingJob.importedAt == null &&
                            existingJob.hasInlinedResponses !== true);

                    if (!shouldHydrate) {
                        return { remoteJob, existingJob, hydratedJob: null as RemoteQueuedJob | null };
                    }

                    try {
                        const hydratedJob = await getQueuedBatchJob(remoteJob.name);
                        return { remoteJob, existingJob, hydratedJob };
                    } catch {
                        return { remoteJob, existingJob, hydratedJob: null as RemoteQueuedJob | null };
                    }
                }),
            );

            hydratedJobs.forEach(({ remoteJob, existingJob, hydratedJob }) => {
                const sourceJob = hydratedJob || remoteJob;
                const nextJob = mapRemoteQueuedJobToLocal(sourceJob, buildRecoveredQueuedJobSeed(sourceJob));
                upsertQueuedJob(
                    hydratedJob
                        ? {
                              ...nextJob,
                              lastPolledAt: Date.now(),
                          }
                        : nextJob,
                );
                if (!existingJob) {
                    recoveredCount += 1;
                } else if (hydratedJob) {
                    refreshedCount += 1;
                }
            });

            if (recoveredCount > 0) {
                addLog(formatMessage('queuedBatchRecoverRecentLog', recoveredCount));
                addLog(t('queuedBatchRecoverRecentMetadataHint'));
                showNotification(formatMessage('queuedBatchRecoverRecentNotice', recoveredCount), 'info');
                return;
            }

            if (refreshedCount > 0) {
                addLog(formatMessage('queuedBatchRecoverRecentRefreshedLog', refreshedCount));
                showNotification(formatMessage('queuedBatchRecoverRecentAlreadyTrackedNotice', refreshedCount), 'info');
                return;
            }

            showNotification(t('queuedBatchRecoverRecentNoneNotice'), 'info');
        } catch (error: any) {
            const message = error?.message || 'Failed to recover recent batch jobs.';
            addLog(formatMessage('queuedBatchRecoverRecentFailedLog', message));
            showNotification(message, 'error');
        } finally {
            setIsRecoveringRecentQueuedJobs(false);
        }
    }, [
        addLog,
        buildRecoveredQueuedJobSeed,
        formatMessage,
        isRecoveringRecentQueuedJobs,
        mapRemoteQueuedJobToLocal,
        queuedJobs,
        showNotification,
        t,
        upsertQueuedJob,
    ]);

    const importQueuedJob = useCallback(
        async (localId: string, options?: { silent?: boolean }) => {
            const job = queuedJobs.find((candidate) => candidate.localId === localId);
            if (!job) {
                return 0;
            }

            try {
                const { job: remoteJob, results } = await importQueuedBatchJobResults(job.name);
                const successfulResults = results.filter((result) => result.status === 'success' && result.imageUrl);
                const failedResults = results.filter((result) => result.status !== 'success' || !result.imageUrl);
                const importFailureSummary = summarizeQueuedBatchImportErrors(results);
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
                            structuredOutputMode: job.structuredOutputMode || 'off',
                            temperature: job.temperature,
                            thinkingLevel: job.thinkingLevel,
                            includeThoughts: job.includeThoughts,
                            googleSearch: job.googleSearch,
                            imageSearch: job.imageSearch,
                            generationMode: job.generationMode || 'Queued Batch Job',
                            executionMode: 'queued-batch-job',
                            batchSize: job.batchSize,
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
                            structuredData: result.structuredData,
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
                    const importDiagnostic: QueuedBatchJobImportDiagnostic = remoteJob.hasInlinedResponses
                        ? 'extraction-failure'
                        : 'no-payload';
                    const importFailureMessage = importFailureSummary || remoteJob.error || null;

                    upsertQueuedJob({
                        ...mapRemoteQueuedJobToLocal(remoteJob, job),
                        importedAt: job.importedAt,
                        lastPolledAt: Date.now(),
                        importDiagnostic,
                        error:
                            importDiagnostic === 'extraction-failure' ? importFailureMessage : remoteJob.error || null,
                    });

                    if (!options?.silent) {
                        if (importFailureSummary) {
                            addLog(
                                `Queued batch import found no usable image results for ${job.name}: ${importFailureSummary}`,
                            );
                        }
                        const notificationMessage =
                            importDiagnostic === 'no-payload'
                                ? t('queuedBatchNoPayloadResultsNotice')
                                : importFailureMessage || t('queuedBatchNoImportableResultsNotice');
                        showNotification(notificationMessage, 'error');
                    }
                    return 0;
                }

                setHistory((previous) => [...importedHistoryItems, ...previous]);
                markQueuedJobImported(localId);
                upsertQueuedJob({
                    ...mapRemoteQueuedJobToLocal(remoteJob, job),
                    importedAt: Date.now(),
                    lastPolledAt: Date.now(),
                    importDiagnostic: null,
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
            historySelectRef,
            mapRemoteQueuedJobToLocal,
            markQueuedJobImported,
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
        const readyJobs = queuedJobs.filter(isQueuedBatchJobAutoImportReady);
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
    }, [addLog, formatMessage, importQueuedJob, queuedJobs, showNotification, t]);

    const getImportedQueuedHistoryItems = useCallback(
        (localId: string) => {
            const job = queuedJobs.find((candidate) => candidate.localId === localId);
            if (!job?.importedAt) {
                return [];
            }

            return history
                .filter((item) => item.executionMode === 'queued-batch-job' && item.variantGroupId === job.name)
                .sort(sortQueuedBatchImportedHistory);
        },
        [history, queuedJobs],
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
        const importedJobs = queuedJobs.filter(isQueuedBatchJobImported);
        if (importedJobs.length === 0) {
            return;
        }

        removeQueuedJobs(importedJobs.map((job) => job.localId));
        addLog(formatMessage('queuedBatchClearImportedLog', importedJobs.length));
        showNotification(formatMessage('queuedBatchClearImportedNotice', importedJobs.length), 'info');
    }, [addLog, formatMessage, queuedJobs, removeQueuedJobs, showNotification]);

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
        isRecoveringRecentQueuedJobs,
        handleQueueBatchJob,
        handleQueueBatchJobFromEditor,
        handlePollQueuedJob,
        handlePollAllQueuedJobs,
        handleCancelQueuedJob,
        handleRecoverRecentQueuedJobs,
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
