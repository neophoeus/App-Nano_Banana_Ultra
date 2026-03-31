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
    QueuedBatchJobState,
    StageAsset,
    StructuredOutputMode,
} from '../types';
import { generateThumbnail, saveImageToLocal } from '../utils/imageSaveUtils';
import { sanitizeSessionHintsForStorage } from '../utils/inlineImageDisplay';
import { useQueuedBatchJobs } from './useQueuedBatchJobs';

const QUEUED_BATCH_JOB_STATES: QueuedBatchJobState[] = [
    'JOB_STATE_PENDING',
    'JOB_STATE_RUNNING',
    'JOB_STATE_SUCCEEDED',
    'JOB_STATE_FAILED',
    'JOB_STATE_CANCELLED',
    'JOB_STATE_EXPIRED',
];
const QUEUED_BATCH_REFRESHABLE_STATES: QueuedBatchJobState[] = ['JOB_STATE_PENDING', 'JOB_STATE_RUNNING'];
const QUEUED_BATCH_AUTO_REFRESH_INTERVAL_MS = 45_000;

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

const isQueuedBatchJobRefreshable = (job: QueuedBatchJob) => QUEUED_BATCH_REFRESHABLE_STATES.includes(job.state);
const isQueuedBatchJobImportReady = (job: QueuedBatchJob) => job.state === 'JOB_STATE_SUCCEEDED' && !job.importedAt;
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
    editorBaseAsset: StageAsset | null;
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

type UseQueuedBatchWorkflowReturn = {
    queuedJobs: QueuedBatchJob[];
    setQueuedJobs: Dispatch<SetStateAction<QueuedBatchJob[]>>;
    handleQueueBatchJob: () => Promise<void>;
    handlePollQueuedJob: (localId: string) => Promise<void>;
    handlePollAllQueuedJobs: (options?: { silent?: boolean; reason?: 'manual' | 'auto' }) => Promise<void>;
    handleCancelQueuedJob: (localId: string) => Promise<void>;
    handleImportQueuedJob: (localId: string) => Promise<void>;
    handleImportAllQueuedJobs: () => Promise<void>;
    handleOpenImportedQueuedJob: (localId: string) => void;
    handleOpenLatestImportedQueuedJob: (localId: string) => void;
    handleOpenImportedQueuedHistoryItem: (historyId: string) => void;
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
    editorBaseAsset,
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
    const formatMessage = useCallback(
        (key: string, ...values: Array<string | number>) =>
            values.reduce((message, value, index) => message.replace(`{${index}}`, String(value)), t(key)),
        [t],
    );

    const { queuedJobs, setQueuedJobs, upsertQueuedJob, removeQueuedJob, markQueuedJobImported } = useQueuedBatchJobs({
        initialQueuedJobs,
    });
    const queuedJobRefreshInFlightRef = useRef<Set<string>>(new Set());

    const buildQueuedJobGenerationDraft = useCallback(() => {
        const editingInput = editorBaseAsset?.url ?? currentStageAsset?.url ?? undefined;
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
        const generationMode = editorBaseAsset?.url
            ? 'Editor Edit'
            : currentStageAsset?.url
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
        };
    }, [
        characterImages,
        currentStageAsset?.url,
        editorBaseAsset?.url,
        getGenerationLineageContext,
        imageStyle,
        objectImages,
        prompt,
    ]);

    const mapRemoteQueuedJobToLocal = useCallback(
        (remoteJob: RemoteQueuedJob, seed: RemoteQueuedJobSeed): QueuedBatchJob => {
            const createdAt = parseBatchJobTimestamp(remoteJob.createTime) || Date.now();
            const updatedAt = parseBatchJobTimestamp(remoteJob.updateTime) || Date.now();
            const startedAt = parseBatchJobTimestamp(remoteJob.startTime);
            const completedAt = parseBatchJobTimestamp(remoteJob.endTime);

            return {
                localId: seed.localId,
                name: remoteJob.name,
                displayName: remoteJob.displayName,
                restoredFromSnapshot: seed.restoredFromSnapshot,
                state: normalizeQueuedBatchJobState(remoteJob.state),
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
                objectImageCount: seed.objectImageCount,
                characterImageCount: seed.characterImageCount,
                createdAt,
                updatedAt,
                startedAt,
                completedAt,
                lastPolledAt: null,
                importedAt: seed.importedAt,
                error: remoteJob.error || null,
                parentHistoryId: seed.parentHistoryId,
                rootHistoryId: seed.rootHistoryId,
                sourceHistoryId: seed.sourceHistoryId,
                lineageAction: seed.lineageAction,
                lineageDepth: seed.lineageDepth,
            };
        },
        [],
    );

    const handleQueueBatchJob = useCallback(async () => {
        const draft = buildQueuedJobGenerationDraft();
        if (!draft) {
            showNotification(t('errorNoPrompt'), 'error');
            return;
        }

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
        const seed = {
            localId,
            prompt: draft.finalPrompt,
            restoredFromSnapshot: false,
            generationMode: draft.generationMode,
            aspectRatio,
            imageSize,
            style: imageStyle,
            outputFormat,
            structuredOutputMode,
            temperature,
            thinkingLevel,
            includeThoughts,
            googleSearch,
            imageSearch,
            batchSize,
            objectImageCount: draft.finalObjectInputs.length,
            characterImageCount: draft.finalCharacterInputs.length,
            importedAt: null,
            parentHistoryId: draft.lineageContext?.parentHistoryId || null,
            rootHistoryId: draft.lineageContext?.rootHistoryId || null,
            sourceHistoryId: draft.lineageContext?.sourceHistoryId || null,
            lineageAction: draft.lineageContext?.lineageAction || 'root',
            lineageDepth: draft.lineageContext?.lineageDepth || 0,
        } as const;

        try {
            const remoteJob = await submitQueuedBatchJob({
                prompt: draft.finalPrompt,
                aspectRatio,
                imageSize,
                style: imageStyle,
                model: imageModel,
                editingInput: draft.editingInput,
                objectImageInputs: draft.finalObjectInputs,
                characterImageInputs: draft.finalCharacterInputs,
                outputFormat,
                structuredOutputMode,
                temperature,
                thinkingLevel,
                includeThoughts,
                googleSearch,
                imageSearch,
                requestCount: batchSize,
                displayName: `${getModelLabel(imageModel)} queued ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
            });

            upsertQueuedJob(mapRemoteQueuedJobToLocal(remoteJob, seed));
            addLog(formatMessage('queuedBatchSubmittedLog', remoteJob.name));
            showNotification(t('queuedBatchSubmittedNotice'), 'info');
            if (draft.finalPrompt) {
                addPromptToHistory(draft.finalPrompt);
            }
        } catch (error: any) {
            const message = error?.message || 'Queued batch job submission failed.';
            addLog(formatMessage('queuedBatchSubmissionFailedLog', message));
            showNotification(message, 'error');
        }
    }, [
        addLog,
        addPromptToHistory,
        apiKeyReady,
        aspectRatio,
        batchSize,
        buildQueuedJobGenerationDraft,
        formatMessage,
        getModelLabel,
        googleSearch,
        handleApiKeyConnect,
        imageModel,
        imageSearch,
        imageSize,
        imageStyle,
        includeThoughts,
        mapRemoteQueuedJobToLocal,
        outputFormat,
        structuredOutputMode,
        setApiKeyReady,
        showNotification,
        t,
        temperature,
        thinkingLevel,
        upsertQueuedJob,
    ]);

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

                if (stateChanged && options?.reason === 'auto') {
                    if (nextJob.state === 'JOB_STATE_SUCCEEDED') {
                        showNotification(formatMessage('queuedBatchReadyToImportNotice', job.displayName), 'info');
                    } else if (nextJob.state === 'JOB_STATE_FAILED' || nextJob.state === 'JOB_STATE_EXPIRED') {
                        showNotification(
                            formatMessage(
                                'queuedBatchFinishedStateNotice',
                                job.displayName,
                                nextJob.state.replace('JOB_STATE_', '').toLowerCase(),
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

    const importQueuedJob = useCallback(
        async (localId: string, options?: { silent?: boolean }) => {
            const job = queuedJobs.find((candidate) => candidate.localId === localId);
            if (!job) {
                return 0;
            }

            try {
                const { job: remoteJob, results } = await importQueuedBatchJobResults(job.name);
                const importedHistoryItems: GeneratedImage[] = await Promise.all(
                    results
                        .filter((result) => result.status === 'success' && result.imageUrl)
                        .map(async (result) => {
                            let thumbnailUrl = result.imageUrl as string;
                            let savedFilename: string | undefined;

                            try {
                                const savedPath = await saveImageToLocal(
                                    result.imageUrl as string,
                                    `${job.model}-batch`,
                                    {
                                        prompt: job.prompt,
                                        style: job.style,
                                        aspectRatio: job.aspectRatio,
                                        size: job.imageSize,
                                        mode: job.generationMode || 'Queued Batch Job',
                                        batchJobName: job.name,
                                        batchResultIndex: result.index,
                                    },
                                );
                                savedFilename = savedPath ? savedPath.split(/[\\/]/).pop() : undefined;
                            } catch {
                                savedFilename = undefined;
                            }

                            try {
                                thumbnailUrl = await generateThumbnail(result.imageUrl as string);
                            } catch {
                                thumbnailUrl = result.imageUrl as string;
                            }

                            return {
                                id: crypto.randomUUID(),
                                url: thumbnailUrl,
                                savedFilename,
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
                                metadata: {
                                    batchJobName: job.name,
                                    batchResultIndex: result.index,
                                    outputFormat: job.outputFormat,
                                    structuredOutputMode: job.structuredOutputMode || 'off',
                                    temperature: job.temperature,
                                    thinkingLevel: job.thinkingLevel,
                                    includeThoughts: job.includeThoughts,
                                },
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
                    if (!options?.silent) {
                        showNotification(t('queuedBatchNoImportableResultsNotice'), 'error');
                    }
                    return 0;
                }

                setHistory((previous) => [...importedHistoryItems, ...previous]);
                markQueuedJobImported(localId);
                upsertQueuedJob({
                    ...mapRemoteQueuedJobToLocal(remoteJob, job),
                    importedAt: Date.now(),
                    lastPolledAt: Date.now(),
                });
                historySelectRef.current?.(importedHistoryItems[0]);
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
        const readyJobs = queuedJobs.filter(isQueuedBatchJobImportReady);
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
        handlePollQueuedJob,
        handlePollAllQueuedJobs,
        handleCancelQueuedJob,
        handleImportQueuedJob,
        handleImportAllQueuedJobs,
        handleOpenImportedQueuedJob,
        handleOpenLatestImportedQueuedJob,
        handleOpenImportedQueuedHistoryItem,
        handleRemoveQueuedJob,
    };
}
