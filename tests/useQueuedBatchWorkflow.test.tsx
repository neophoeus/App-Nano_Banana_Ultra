/** @vitest-environment jsdom */

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useQueuedBatchWorkflow } from '../hooks/useQueuedBatchWorkflow';
import { QueuedBatchJob, GeneratedImage } from '../types';
import { buildStyleTransferPrompt } from '../utils/styleRegistry';

const {
    checkApiKeyMock,
    submitQueuedBatchJobMock,
    getQueuedBatchJobMock,
    cancelQueuedBatchJobMock,
    importQueuedBatchJobResultsMock,
    saveImageToLocalMock,
    generateThumbnailMock,
    persistHistoryThumbnailMock,
} = vi.hoisted(() => ({
    checkApiKeyMock: vi.fn(),
    submitQueuedBatchJobMock: vi.fn(),
    getQueuedBatchJobMock: vi.fn(),
    cancelQueuedBatchJobMock: vi.fn(),
    importQueuedBatchJobResultsMock: vi.fn(),
    saveImageToLocalMock: vi.fn(),
    generateThumbnailMock: vi.fn(),
    persistHistoryThumbnailMock: vi.fn(),
}));

vi.mock('../services/geminiService', () => ({
    checkApiKey: checkApiKeyMock,
    submitQueuedBatchJob: submitQueuedBatchJobMock,
    getQueuedBatchJob: getQueuedBatchJobMock,
    cancelQueuedBatchJob: cancelQueuedBatchJobMock,
    importQueuedBatchJobResults: importQueuedBatchJobResultsMock,
}));

vi.mock('../utils/imageSaveUtils', () => ({
    buildSavedImageLoadUrl: (savedFilename: string) => `/api/load-image?filename=${encodeURIComponent(savedFilename)}`,
    extractSavedFilename: (savedPath: string | null | undefined) => savedPath?.split(/[\\/]/).pop(),
    persistHistoryThumbnail: persistHistoryThumbnailMock,
    saveImageToLocal: saveImageToLocalMock,
    generateThumbnail: generateThumbnailMock,
}));

type HookHandle = ReturnType<typeof useQueuedBatchWorkflow>;
type HookOverrides = Partial<Parameters<typeof useQueuedBatchWorkflow>[0]>;

const buildQueuedJob = (overrides: Partial<QueuedBatchJob> = {}): QueuedBatchJob => ({
    localId: overrides.localId || 'job-ready',
    name: overrides.name || `batches/${overrides.localId || 'job-ready'}`,
    displayName: overrides.displayName || 'Ready queue job',
    state: overrides.state || 'JOB_STATE_SUCCEEDED',
    model: overrides.model || 'gemini-3.1-flash-image-preview',
    prompt: overrides.prompt || 'Import queued result',
    generationMode: overrides.generationMode || 'Text to Image',
    aspectRatio: overrides.aspectRatio || '1:1',
    imageSize: overrides.imageSize || '1K',
    style: overrides.style || 'None',
    outputFormat: overrides.outputFormat || 'images-only',
    temperature: overrides.temperature ?? 1,
    thinkingLevel: overrides.thinkingLevel || 'minimal',
    includeThoughts: overrides.includeThoughts ?? true,
    googleSearch: overrides.googleSearch ?? false,
    imageSearch: overrides.imageSearch ?? false,
    batchSize: overrides.batchSize ?? 1,
    objectImageCount: overrides.objectImageCount ?? 0,
    characterImageCount: overrides.characterImageCount ?? 0,
    createdAt: overrides.createdAt ?? 1710400000000,
    updatedAt: overrides.updatedAt ?? 1710400005000,
    startedAt: overrides.startedAt ?? 1710400001000,
    completedAt: overrides.completedAt ?? 1710400004000,
    lastPolledAt: overrides.lastPolledAt ?? 1710400005000,
    hasImportablePayload: overrides.hasImportablePayload ?? true,
    submissionPending: overrides.submissionPending ?? false,
    importDiagnostic: overrides.importDiagnostic ?? null,
    importIssues: overrides.importIssues ?? null,
    error: overrides.error ?? null,
    parentHistoryId: overrides.parentHistoryId ?? null,
    rootHistoryId: overrides.rootHistoryId ?? null,
    sourceHistoryId: overrides.sourceHistoryId ?? 'source-turn-1',
    lineageAction: overrides.lineageAction || 'continue',
    lineageDepth: overrides.lineageDepth ?? 1,
});

const createDeferred = <T,>() => {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });

    return { promise, resolve, reject };
};

describe('useQueuedBatchWorkflow', () => {
    let container: HTMLDivElement;
    let root: Root;
    let latestHook: HookHandle | null;
    let latestHistory: GeneratedImage[];
    let notifications: Array<{ message: string; type?: 'info' | 'error' }>;
    let logs: string[];
    let selectedHistoryIds: string[];

    const renderHook = (
        initialQueuedJobs: QueuedBatchJob[],
        initialHistory: GeneratedImage[] = [],
        overrides: HookOverrides = {},
    ) => {
        const historySelectRef = { current: (item: GeneratedImage) => selectedHistoryIds.push(item.id) };

        function Harness() {
            latestHook = useQueuedBatchWorkflow({
                initialQueuedJobs,
                apiKeyReady: overrides.apiKeyReady ?? true,
                setApiKeyReady: overrides.setApiKeyReady ?? vi.fn(),
                handleApiKeyConnect: overrides.handleApiKeyConnect ?? vi.fn().mockResolvedValue(true),
                prompt: overrides.prompt ?? 'Queued test prompt',
                imageStyle: overrides.imageStyle ?? 'None',
                imageModel: overrides.imageModel ?? 'gemini-3.1-flash-image-preview',
                batchSize: overrides.batchSize ?? 1,
                aspectRatio: overrides.aspectRatio ?? '1:1',
                imageSize: overrides.imageSize ?? '1K',
                outputFormat: overrides.outputFormat ?? 'images-only',
                temperature: overrides.temperature ?? 1,
                thinkingLevel: overrides.thinkingLevel ?? 'minimal',
                includeThoughts: overrides.includeThoughts ?? true,
                googleSearch: overrides.googleSearch ?? false,
                imageSearch: overrides.imageSearch ?? false,
                currentStageAsset: overrides.currentStageAsset ?? null,
                branchOriginIdByTurnId: overrides.branchOriginIdByTurnId ?? {},
                workspaceSessionSourceHistoryId: overrides.workspaceSessionSourceHistoryId ?? null,
                workspaceSessionSourceLineageAction: overrides.workspaceSessionSourceLineageAction ?? null,
                objectImages: overrides.objectImages ?? [],
                characterImages: overrides.characterImages ?? [],
                getModelLabel: overrides.getModelLabel ?? ((model) => model),
                getGenerationLineageContext:
                    overrides.getGenerationLineageContext ??
                    (() => ({
                        parentHistoryId: 'parent-turn-1',
                        rootHistoryId: 'root-turn-1',
                        sourceHistoryId: 'source-turn-1',
                        lineageAction: 'continue',
                        lineageDepth: 1,
                    })),
                addLog: overrides.addLog ?? ((message) => logs.push(message)),
                showNotification:
                    overrides.showNotification ?? ((message, type) => notifications.push({ message, type })),
                setHistory: (updater) => {
                    latestHistory = typeof updater === 'function' ? updater(latestHistory) : updater;
                },
                history: latestHistory,
                historySelectRef,
                canQueueComposerBatch: overrides.canQueueComposerBatch ?? true,
                queueBatchDisabledReason: overrides.queueBatchDisabledReason ?? null,
                canQueueEditorBatch: overrides.canQueueEditorBatch ?? true,
                editorQueueDisabledReason: overrides.editorQueueDisabledReason ?? null,
                t:
                    overrides.t ??
                    ((key) => {
                        const translations: Record<string, string> = {
                            errorNoPrompt: 'Please enter a prompt to start!',
                            queuedBatchSubmittedNotice: 'Queued batch job submitted to the official Batch API.',
                            queuedBatchSubmittedLog: 'Queued official batch job {0}.',
                            queuedBatchSubmissionFailedLog: 'Queued batch submission failed: {0}',
                            queueBatchEditDisabledReason: 'Queued edits are disabled.',
                            queueBatchMemoryContinuationDisabledReason:
                                'Queued jobs cannot continue an official memory conversation. Start a new conversation or switch to Independent send.',
                            queuedBatchNoPayloadResultsNotice: 'Queued batch finished without inline payload.',
                            queuedBatchNoImportableResultsNotice: 'No importable queued results.',
                            queuedBatchImportedNotice: 'Imported {0} queued batch results.',
                            queuedBatchImportedLog: 'Imported {0} queued batch results from {1}.',
                            queuedBatchImportAllLog: 'Imported {0} queued batch results from {1} ready jobs.',
                            queuedBatchImportAllNotice: 'Imported {0} queued batch results from ready jobs.',
                            queuedBatchImportAllNoneNotice:
                                'Ready queued batch jobs did not contain importable image results.',
                            queuedBatchImportWaitingNotice:
                                'Queued batch jobs are still waiting for importable results.',
                            queuedBatchPolledLog: 'Polled queued batch job {0}: {1}.',
                            queuedBatchReadyToImportNotice: 'Queued batch job {0} is ready to import.',
                            queuedBatchFinishedStateNotice: 'Queued batch job {0} finished with {1}.',
                            queuedBatchPollFailedLog: 'Queued batch poll failed for {0}: {1}',
                            queuedBatchRefreshedLog: 'Refreshed {0} queued batch jobs.',
                            queuedBatchRefreshNoneNotice: 'There are no running queued batch jobs to refresh.',
                            queuedBatchCancelledLog: 'Cancelled queued batch job {0}.',
                            queuedBatchCancelRequestedNotice: 'Queued batch job cancellation requested.',
                            queuedBatchCancelFailedLog: 'Queued batch cancel failed for {0}: {1}',
                            queuedBatchClearIssuesNotice: 'Cleared {0} non-importable queued batch jobs.',
                            queuedBatchClearImportedNotice: 'Cleared {0} imported queued batch jobs.',
                            queuedBatchClearIssuesLog:
                                'Cleared {0} non-importable queued batch jobs from the local queue.',
                            queuedBatchClearImportedLog: 'Cleared {0} imported queued batch jobs from the local queue.',
                            generationFailureSummaryUnknown:
                                'The request failed before a trustworthy reason could be identified.',
                            generationFailureSummaryPolicy:
                                'The prompt was blocked before image generation started.',
                            generationFailureSummarySafety: 'The image output was blocked by safety filters.',
                            generationFailureSummaryTextOnly: 'The model responded with text only and no image.',
                            generationFailureSummaryEmpty:
                                'The model response did not include enough information to identify a trustworthy cause.',
                            generationFailureSummaryNoImage:
                                'The request completed, but the model did not return image data.',
                            generationFailureDetailRetry: 'Try revising the prompt or retrying later.',
                            generationFailureDetailPromptBlockReason: 'Policy block reason: {0}.',
                            generationFailureDetailSafetyCategories: 'Safety categories: {0}.',
                            generationFailureDetailTextOnly:
                                'Text content was returned, but no image bytes were emitted.',
                            generationFailureDetailThoughtsOnly:
                                'Only model thought summaries were returned, but no image bytes were emitted.',
                            generationFailureDetailMissingCandidates:
                                'No model output candidates were returned in the response.',
                            generationFailureDetailMissingParts:
                                'A model output candidate was returned, but it contained no content blocks.',
                            generationFailureDetailPossibleBatchSafetySuppression:
                                'Another result in this batch was explicitly blocked by image safety filters. This attempt may have been suppressed for the same reason, but the response did not provide enough signal to confirm it.',
                            generationFailureDetailFinishReason: 'Model finish reason: {0}.',
                            generationFailureValuePromptBlockReasonBlocklist:
                                'blocked by restricted-term rules',
                            generationFailureValuePromptBlockReasonProhibitedContent:
                                'blocked for prohibited content',
                            generationFailureValuePromptBlockReasonSafety: 'blocked by policy safety rules',
                            generationFailureValuePromptBlockReasonUnspecified: 'blocked by policy rules',
                            generationFailureValuePromptBlockReasonOther: 'blocked by policy rules',
                            generationFailureValueFinishReasonStop: 'completed without image output',
                            generationFailureValueFinishReasonNoImage: 'completed without returning an image',
                            generationFailureValueFinishReasonUnspecified:
                                'completed without a specific image result reason',
                            generationFailureValueFinishReasonImageSafety: 'blocked by image safety filters',
                            generationFailureValueFinishReasonImageProhibitedContent:
                                'blocked for prohibited image content',
                            generationFailureValueFinishReasonBlocklist: 'blocked by blocklist rules',
                            generationFailureValueFinishReasonProhibitedContent:
                                'blocked for prohibited content',
                            generationFailureValueFinishReasonImageOther: 'completed without image output',
                            generationFailureValueFinishReasonSafety: 'blocked by safety filters',
                            generationFailureValueFinishReasonBlocked: 'blocked by model policy',
                            generationFailureValueFinishReasonOther: 'another non-image completion state',
                            generationFailureValueSafetyCategoryHarassment: 'harassment',
                            generationFailureValueSafetyCategoryHateSpeech: 'hate speech',
                            generationFailureValueSafetyCategorySexuallyExplicit: 'sexually explicit',
                            generationFailureValueSafetyCategoryDangerousContent: 'dangerous content',
                            generationFailureValueSafetyCategoryOther: 'other safety policy',
                        };
                        return translations[key] || key;
                    }),
            });
            return null;
        }

        act(() => {
            latestHistory = initialHistory;
            root.render(<Harness />);
        });
    };

    beforeEach(() => {
        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        latestHook = null;
        latestHistory = [];
        notifications = [];
        logs = [];
        selectedHistoryIds = [];

        checkApiKeyMock.mockReset();
        submitQueuedBatchJobMock.mockReset();
        getQueuedBatchJobMock.mockReset();
        cancelQueuedBatchJobMock.mockReset();
        importQueuedBatchJobResultsMock.mockReset();
        saveImageToLocalMock.mockReset();
        generateThumbnailMock.mockReset();
        persistHistoryThumbnailMock.mockReset();

        saveImageToLocalMock.mockResolvedValue('D:/saved/job.png');
        generateThumbnailMock.mockResolvedValue('data:image/jpeg;base64,thumb');
        persistHistoryThumbnailMock.mockResolvedValue({ url: 'data:image/jpeg;base64,thumb' });
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
        vi.restoreAllMocks();
    });

    it('submits explicit editor queue drafts when editor queue policy allows', async () => {
        const getGenerationLineageContext = vi.fn(({ sourceOverride }) => ({
            parentHistoryId: sourceOverride?.sourceHistoryId || 'parent-turn-1',
            rootHistoryId: sourceOverride?.sourceHistoryId || 'root-turn-1',
            sourceHistoryId: sourceOverride?.sourceHistoryId || 'source-turn-1',
            lineageAction: sourceOverride?.sourceLineageAction === 'branch' ? 'branch' : 'continue',
            lineageDepth: 2,
        }));
        const sourceOverride = {
            sourceHistoryId: 'editor-source-turn',
            sourceLineageAction: 'branch' as const,
        };

        submitQueuedBatchJobMock.mockResolvedValue({
            name: 'batches/editor-queue-job',
            displayName: 'Editor queue job',
            state: 'JOB_STATE_PENDING',
            model: 'gemini-3.1-flash-image-preview',
            createTime: '2025-01-01T00:00:00.000Z',
            updateTime: '2025-01-01T00:00:00.000Z',
            error: null,
            batchStats: null,
            hasImportablePayload: false,
        });

        renderHook([], [], {
            getGenerationLineageContext,
            outputFormat: 'images-and-text',
            includeThoughts: true,
        });

        await act(async () => {
            await latestHook!.handleQueueBatchJobFromEditor({
                prompt: 'Queue this editor revision',
                editingInput: 'data:image/png;base64,editor-canvas',
                batchSize: 3,
                imageSize: '2K',
                aspectRatio: '16:9',
                objectImageInputs: ['data:image/png;base64,object-ref'],
                characterImageInputs: ['data:image/png;base64,character-ref'],
                sourceOverride,
            });
        });

        expect(getGenerationLineageContext).toHaveBeenCalledWith(
            expect.objectContaining({
                sourceOverride,
            }),
        );
        expect(submitQueuedBatchJobMock).toHaveBeenCalledWith(
            expect.objectContaining({
                prompt: 'Queue this editor revision',
                editingInput: 'data:image/png;base64,editor-canvas',
                objectImageInputs: ['data:image/png;base64,object-ref'],
                characterImageInputs: ['data:image/png;base64,character-ref'],
                outputFormat: 'images-only',
                includeThoughts: false,
            }),
        );
        expect(latestHook!.queuedJobs[0]).toEqual(
            expect.objectContaining({
                generationMode: 'Editor Edit',
                sourceHistoryId: 'editor-source-turn',
                lineageAction: 'branch',
            }),
        );
    });

    it('keeps main queue submissions as Text to Image without stale editor state', async () => {
        const submitDeferred = createDeferred<{
            name: string;
            displayName: string;
            state: string;
            model: string;
            createTime: string;
            updateTime: string;
            error: null;
            batchStats: null;
            hasImportablePayload: boolean;
        }>();
        submitQueuedBatchJobMock.mockReturnValue(submitDeferred.promise);

        renderHook([], [], {
            prompt: 'Queue from the main composer',
            outputFormat: 'images-and-text',
            includeThoughts: true,
        });

        let submitPromise: Promise<void>;

        await act(async () => {
            submitPromise = latestHook!.handleQueueBatchJob();
            await Promise.resolve();
        });

        expect(latestHook!.queuedJobs[0]).toEqual(
            expect.objectContaining({
                state: 'JOB_STATE_PENDING',
                generationMode: 'Text to Image',
                submissionPending: true,
                outputFormat: 'images-only',
                includeThoughts: false,
            }),
        );

        await act(async () => {
            submitDeferred.resolve({
                name: 'batches/job-main-queue',
                displayName: 'Main queue job',
                state: 'JOB_STATE_PENDING',
                model: 'gemini-3.1-flash-image-preview',
                createTime: '2025-01-01T00:00:00.000Z',
                updateTime: '2025-01-01T00:00:00.000Z',
                error: null,
                batchStats: null,
                hasImportablePayload: false,
            });
            await submitPromise!;
        });

        expect(submitQueuedBatchJobMock).toHaveBeenCalledWith(
            expect.objectContaining({
                prompt: 'Queue from the main composer',
                editingInput: undefined,
                outputFormat: 'images-only',
                includeThoughts: false,
            }),
        );
        expect(latestHook!.queuedJobs[0]).toEqual(
            expect.objectContaining({
                name: 'batches/job-main-queue',
                generationMode: 'Text to Image',
                outputFormat: 'images-only',
                includeThoughts: false,
            }),
        );
    });

    it('uses the shared style-transfer fallback when queueing reference-led illustration jobs without a prompt', async () => {
        const submitDeferred = createDeferred<{
            name: string;
            displayName: string;
            state: string;
            model: string;
            createTime: string;
            updateTime: string;
            error: null;
            batchStats: null;
            hasImportablePayload: boolean;
        }>();
        submitQueuedBatchJobMock.mockReturnValue(submitDeferred.promise);

        renderHook([], [], {
            prompt: '   ',
            imageStyle: 'Digital Illustration',
            objectImages: ['data:image/png;base64,REF'],
        });

        let submitPromise: Promise<void>;

        await act(async () => {
            submitPromise = latestHook!.handleQueueBatchJob();
            await Promise.resolve();
        });

        await act(async () => {
            submitDeferred.resolve({
                name: 'batches/job-style-transfer',
                displayName: 'Style transfer queue job',
                state: 'JOB_STATE_PENDING',
                model: 'gemini-3.1-flash-image-preview',
                createTime: '2025-01-01T00:00:00.000Z',
                updateTime: '2025-01-01T00:00:00.000Z',
                error: null,
                batchStats: null,
                hasImportablePayload: false,
            });
            await submitPromise!;
        });

        expect(submitQueuedBatchJobMock).toHaveBeenCalledWith(
            expect.objectContaining({
                prompt: buildStyleTransferPrompt('Digital Illustration'),
                style: 'Digital Illustration',
                objectImageInputs: ['data:image/png;base64,REF'],
            }),
        );
        expect(latestHook!.queuedJobs[0]).toEqual(
            expect.objectContaining({
                generationMode: 'Image to Image/Mixing',
                prompt: buildStyleTransferPrompt('Digital Illustration'),
            }),
        );
    });

    it('queues upload-only staged image edits after resetting lineage to a fresh root', async () => {
        const getGenerationLineageContext = vi.fn(({ sourceOverride }) => ({
            parentHistoryId: sourceOverride?.sourceHistoryId || null,
            rootHistoryId: sourceOverride?.sourceHistoryId || null,
            sourceHistoryId: sourceOverride?.sourceHistoryId || null,
            lineageAction: sourceOverride?.sourceHistoryId
                ? sourceOverride.sourceLineageAction === 'branch'
                    ? 'branch'
                    : 'continue'
                : 'root',
            lineageDepth: sourceOverride?.sourceHistoryId ? 1 : 0,
        }));

        submitQueuedBatchJobMock.mockResolvedValue({
            name: 'batches/upload-stage-queue-job',
            displayName: 'Upload stage queue job',
            state: 'JOB_STATE_PENDING',
            model: 'gemini-3.1-flash-image-preview',
            createTime: '2025-01-01T00:00:00.000Z',
            updateTime: '2025-01-01T00:00:00.000Z',
            error: null,
            batchStats: null,
            hasImportablePayload: false,
        });

        renderHook([], [], {
            prompt: 'Queue the staged upload as a follow-up edit',
            currentStageAsset: {
                id: 'upload-stage',
                url: 'data:image/png;base64,UPLOAD',
                role: 'stage-source',
                origin: 'upload',
                createdAt: 1,
            },
            workspaceSessionSourceHistoryId: 'stale-turn',
            workspaceSessionSourceLineageAction: 'branch',
            getGenerationLineageContext,
        });

        await act(async () => {
            await latestHook!.handleQueueBatchJob();
        });

        expect(getGenerationLineageContext).toHaveBeenCalledWith(
            expect.objectContaining({
                mode: 'Image to Image/Mixing',
                sourceOverride: {
                    sourceHistoryId: null,
                    sourceLineageAction: null,
                },
            }),
        );
        expect(submitQueuedBatchJobMock).toHaveBeenCalledWith(
            expect.objectContaining({
                prompt: 'Queue the staged upload as a follow-up edit',
                editingInput: 'data:image/png;base64,UPLOAD',
            }),
        );
        expect(latestHook!.queuedJobs[0]).toEqual(
            expect.objectContaining({
                generationMode: 'Image to Image/Mixing',
                sourceHistoryId: null,
                lineageAction: 'root',
            }),
        );
    });

    it('imports a ready queued job into workspace history and marks it imported', async () => {
        const readyJob = buildQueuedJob();
        importQueuedBatchJobResultsMock.mockResolvedValue({
            job: {
                name: readyJob.name,
                displayName: readyJob.displayName,
                state: 'JOB_STATE_SUCCEEDED',
                model: readyJob.model,
                createTime: '2025-01-01T00:00:00.000Z',
                updateTime: '2025-01-01T00:05:00.000Z',
                startTime: '2025-01-01T00:01:00.000Z',
                endTime: '2025-01-01T00:05:00.000Z',
                error: null,
                hasImportablePayload: true,
            },
            results: [
                {
                    index: 0,
                    status: 'success',
                    imageUrl: 'data:image/png;base64,AAA',
                    text: 'Imported queued text',
                    thoughts: 'Queued thoughts',
                    grounding: { enabled: true },
                    sessionHints: { restored: true },
                },
            ],
        });

        renderHook([readyJob]);
        expect(latestHook).toBeTruthy();

        await act(async () => {
            await latestHook!.handleImportQueuedJob(readyJob.localId);
        });

        expect(importQueuedBatchJobResultsMock).toHaveBeenCalledWith(readyJob.name);
        expect(saveImageToLocalMock).toHaveBeenCalledWith(
            'data:image/png;base64,AAA',
            `${readyJob.model}-batch`,
            expect.objectContaining({
                prompt: readyJob.prompt,
                batchJobName: readyJob.name,
                batchResultIndex: 0,
            }),
        );
        expect(persistHistoryThumbnailMock).toHaveBeenCalledWith(
            'data:image/png;base64,AAA',
            `${readyJob.model}-batch`,
            'job.png',
        );
        expect(latestHistory).toHaveLength(1);
        expect(latestHistory[0]).toEqual(
            expect.objectContaining({
                url: 'data:image/jpeg;base64,thumb',
                savedFilename: 'job.png',
                prompt: readyJob.prompt,
                executionMode: 'queued-batch-job',
                variantGroupId: readyJob.name,
                text: 'Imported queued text',
                thoughts: 'Queued thoughts',
                sourceHistoryId: readyJob.sourceHistoryId,
                lineageAction: readyJob.lineageAction,
                lineageDepth: readyJob.lineageDepth,
            }),
        );
        expect(selectedHistoryIds).toEqual([latestHistory[0].id]);
        expect(logs).toContain(`Imported 1 queued batch results from ${readyJob.name}.`);
        expect(notifications).toContainEqual({
            message: 'Imported 1 queued batch results.',
            type: 'info',
        });
    });

    it('imports successful queued results even when some batch entries fail', async () => {
        const readyJob = buildQueuedJob({
            localId: 'job-partial-import',
            name: 'batches/job-partial-import',
            displayName: 'Partial import queue job',
            batchSize: 4,
        });
        importQueuedBatchJobResultsMock.mockResolvedValue({
            job: {
                name: readyJob.name,
                displayName: readyJob.displayName,
                state: 'JOB_STATE_SUCCEEDED',
                model: readyJob.model,
                createTime: '2025-01-01T00:00:00.000Z',
                updateTime: '2025-01-01T00:05:00.000Z',
                startTime: '2025-01-01T00:01:00.000Z',
                endTime: '2025-01-01T00:05:00.000Z',
                error: null,
                hasImportablePayload: true,
            },
            results: [
                {
                    index: 0,
                    status: 'success',
                    imageUrl: 'data:image/png;base64,AAA',
                },
                {
                    index: 1,
                    status: 'failed',
                    error: 'Model returned a response without candidates.',
                },
            ],
        });

        renderHook([readyJob]);

        await act(async () => {
            await latestHook!.handleImportQueuedJob(readyJob.localId);
        });

        expect(latestHistory).toHaveLength(1);
        expect(latestHook!.queuedJobs[0]).toEqual(
            expect.objectContaining({
                localId: readyJob.localId,
                importDiagnostic: null,
            }),
        );
        expect(logs).toContain(
            `Queued batch import skipped 1 non-importable results for ${readyJob.name}: Model returned a response without candidates.`,
        );
        expect(notifications).toContainEqual({
            message: 'Imported 1 queued batch results.',
            type: 'info',
        });
    });

    it('imports all ready jobs and emits the aggregate import notice once', async () => {
        const firstReadyJob = buildQueuedJob({
            localId: 'job-ready-1',
            name: 'batches/job-ready-1',
            displayName: 'Ready queue job 1',
        });
        const secondReadyJob = buildQueuedJob({
            localId: 'job-ready-2',
            name: 'batches/job-ready-2',
            displayName: 'Ready queue job 2',
            updatedAt: 1710400010000,
        });
        importQueuedBatchJobResultsMock
            .mockResolvedValueOnce({
                job: {
                    name: firstReadyJob.name,
                    displayName: firstReadyJob.displayName,
                    state: 'JOB_STATE_SUCCEEDED',
                    model: firstReadyJob.model,
                    createTime: '2025-01-01T00:00:00.000Z',
                    updateTime: '2025-01-01T00:02:00.000Z',
                    startTime: '2025-01-01T00:01:00.000Z',
                    endTime: '2025-01-01T00:02:00.000Z',
                    error: null,
                    hasImportablePayload: true,
                },
                results: [
                    {
                        index: 0,
                        status: 'success',
                        imageUrl: 'data:image/png;base64,AAA',
                        text: 'First imported result',
                    },
                ],
            })
            .mockResolvedValueOnce({
                job: {
                    name: secondReadyJob.name,
                    displayName: secondReadyJob.displayName,
                    state: 'JOB_STATE_SUCCEEDED',
                    model: secondReadyJob.model,
                    createTime: '2025-01-01T00:00:00.000Z',
                    updateTime: '2025-01-01T00:03:00.000Z',
                    startTime: '2025-01-01T00:01:00.000Z',
                    endTime: '2025-01-01T00:03:00.000Z',
                    error: null,
                    hasImportablePayload: true,
                },
                results: [
                    {
                        index: 0,
                        status: 'success',
                        imageUrl: 'data:image/png;base64,BBB',
                        text: 'Second imported result',
                    },
                ],
            });

        saveImageToLocalMock.mockResolvedValue('D:/saved/imported.png');
        persistHistoryThumbnailMock.mockImplementation(async (imageUrl: string) => ({ url: `${imageUrl}-thumb` }));

        renderHook([firstReadyJob, secondReadyJob]);

        await act(async () => {
            await latestHook!.handleImportAllQueuedJobs();
        });

        expect(importQueuedBatchJobResultsMock).toHaveBeenCalledTimes(2);
        expect(latestHistory).toHaveLength(2);
        expect(logs).toContain('Imported 2 queued batch results from 2 ready jobs.');
        expect(notifications).toContainEqual({
            message: 'Imported 2 queued batch results from ready jobs.',
            type: 'info',
        });
        expect(notifications).not.toContainEqual({
            message: 'Imported 1 queued batch results.',
            type: 'info',
        });
    });

    it('skips known extraction failures during import-all retries', async () => {
        const retryableReadyJob = buildQueuedJob({
            localId: 'job-ready-retryable',
            name: 'batches/job-ready-retryable',
            displayName: 'Retryable ready queue job',
        });
        const failedReadyJob = buildQueuedJob({
            localId: 'job-ready-failed',
            name: 'batches/job-ready-failed',
            displayName: 'Failed ready queue job',
            importDiagnostic: 'extraction-failure',
            error: 'Model returned no image data.',
        });

        importQueuedBatchJobResultsMock.mockResolvedValueOnce({
            job: {
                name: retryableReadyJob.name,
                displayName: retryableReadyJob.displayName,
                state: 'JOB_STATE_SUCCEEDED',
                model: retryableReadyJob.model,
                createTime: '2025-01-01T00:00:00.000Z',
                updateTime: '2025-01-01T00:02:00.000Z',
                startTime: '2025-01-01T00:01:00.000Z',
                endTime: '2025-01-01T00:02:00.000Z',
                error: null,
                hasImportablePayload: true,
            },
            results: [
                {
                    index: 0,
                    status: 'success',
                    imageUrl: 'data:image/png;base64,AAA',
                    text: 'Imported queued result',
                },
            ],
        });

        saveImageToLocalMock.mockResolvedValue('D:/saved/imported.png');
        persistHistoryThumbnailMock.mockResolvedValue({ url: 'data:image/png;base64,AAA-thumb' });

        renderHook([retryableReadyJob, failedReadyJob]);

        await act(async () => {
            await latestHook!.handleImportAllQueuedJobs();
        });

        expect(importQueuedBatchJobResultsMock).toHaveBeenCalledTimes(1);
        expect(importQueuedBatchJobResultsMock).toHaveBeenCalledWith(retryableReadyJob.name);
        expect(latestHook!.queuedJobs).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    localId: retryableReadyJob.localId,
                }),
                expect.objectContaining({
                    localId: failedReadyJob.localId,
                    importDiagnostic: 'extraction-failure',
                    error: 'Model returned no image data.',
                }),
            ]),
        );
        expect(logs).toContain('Imported 1 queued batch results from 1 ready jobs.');
        expect(notifications).toContainEqual({
            message: 'Imported 1 queued batch results from ready jobs.',
            type: 'info',
        });
    });

    it('polls running queued jobs, updates state, and emits auto-ready feedback on transitions', async () => {
        const runningJob = buildQueuedJob({
            localId: 'job-running',
            name: 'batches/job-running',
            displayName: 'Running queue job',
            state: 'JOB_STATE_RUNNING',
            completedAt: null,
            lastPolledAt: Date.now(),
        });

        getQueuedBatchJobMock.mockResolvedValue({
            name: runningJob.name,
            displayName: runningJob.displayName,
            state: 'JOB_STATE_SUCCEEDED',
            model: runningJob.model,
            createTime: '2025-01-01T00:00:00.000Z',
            updateTime: '2025-01-01T00:05:00.000Z',
            startTime: '2025-01-01T00:01:00.000Z',
            endTime: '2025-01-01T00:05:00.000Z',
            error: null,
            hasImportablePayload: true,
        });

        renderHook([runningJob]);

        await act(async () => {
            await latestHook!.handlePollAllQueuedJobs({ silent: true, reason: 'auto' });
        });

        expect(getQueuedBatchJobMock).toHaveBeenCalledWith(runningJob.name);
        expect(latestHook!.queuedJobs[0]).toEqual(
            expect.objectContaining({
                localId: runningJob.localId,
                state: 'JOB_STATE_SUCCEEDED',
                name: runningJob.name,
            }),
        );
        expect(latestHook!.queuedJobs[0].completedAt).not.toBeNull();
        expect(logs).toContain(`Polled queued batch job ${runningJob.name}: JOB_STATE_SUCCEEDED.`);
        expect(logs).not.toContain('Refreshed 1 queued batch jobs.');
        expect(notifications).toContainEqual({
            message: 'Queued batch job Running queue job is ready to import.',
            type: 'info',
        });
    });

    it('does not mark polled jobs as import-ready when the batch finished without inline responses', async () => {
        const runningJob = buildQueuedJob({
            localId: 'job-running-no-payload',
            name: 'batches/job-running-no-payload',
            displayName: 'No payload queue job',
            state: 'JOB_STATE_RUNNING',
            completedAt: null,
            lastPolledAt: Date.now(),
        });

        getQueuedBatchJobMock.mockResolvedValue({
            name: runningJob.name,
            displayName: runningJob.displayName,
            state: 'JOB_STATE_SUCCEEDED',
            model: runningJob.model,
            createTime: '2025-01-01T00:00:00.000Z',
            updateTime: '2025-01-01T00:05:00.000Z',
            startTime: '2025-01-01T00:01:00.000Z',
            endTime: '2025-01-01T00:05:00.000Z',
            error: null,
            hasImportablePayload: false,
        });

        renderHook([runningJob]);

        await act(async () => {
            await latestHook!.handlePollAllQueuedJobs({ silent: true, reason: 'auto' });
        });

        expect(latestHook!.queuedJobs[0]).toEqual(
            expect.objectContaining({
                localId: runningJob.localId,
                state: 'JOB_STATE_SUCCEEDED',
                hasImportablePayload: false,
                importDiagnostic: 'no-payload',
            }),
        );
        expect(notifications).not.toContainEqual({
            message: 'Queued batch job No payload queue job is ready to import.',
            type: 'info',
        });
    });

    it('cancels a running queued job and records cancellation feedback', async () => {
        const runningJob = buildQueuedJob({
            localId: 'job-cancel',
            name: 'batches/job-cancel',
            displayName: 'Cancelable queue job',
            state: 'JOB_STATE_RUNNING',
            completedAt: null,
            lastPolledAt: Date.now(),
        });

        cancelQueuedBatchJobMock.mockResolvedValue({
            name: runningJob.name,
            displayName: runningJob.displayName,
            state: 'JOB_STATE_CANCELLED',
            model: runningJob.model,
            createTime: '2025-01-01T00:00:00.000Z',
            updateTime: '2025-01-01T00:06:00.000Z',
            startTime: '2025-01-01T00:01:00.000Z',
            endTime: '2025-01-01T00:06:00.000Z',
            error: null,
        });

        renderHook([runningJob]);

        await act(async () => {
            await latestHook!.handleCancelQueuedJob(runningJob.localId);
        });

        expect(cancelQueuedBatchJobMock).toHaveBeenCalledWith(runningJob.name);
        expect(latestHook!.queuedJobs[0]).toEqual(
            expect.objectContaining({
                localId: runningJob.localId,
                state: 'JOB_STATE_CANCELLED',
                name: runningJob.name,
            }),
        );
        expect(latestHook!.queuedJobs[0].lastPolledAt).not.toBeNull();
        expect(logs).toContain(`Cancelled queued batch job ${runningJob.name}.`);
        expect(notifications).toContainEqual({
            message: 'Queued batch job cancellation requested.',
            type: 'info',
        });
    });

    it('reports refresh-none when there are no running queued jobs to poll', async () => {
        const completedJob = buildQueuedJob({
            localId: 'job-complete',
            name: 'batches/job-complete',
            displayName: 'Completed queue job',
            state: 'JOB_STATE_SUCCEEDED',
        });

        renderHook([completedJob]);

        await act(async () => {
            await latestHook!.handlePollAllQueuedJobs();
        });

        expect(getQueuedBatchJobMock).not.toHaveBeenCalled();
        expect(logs).toEqual([]);
        expect(notifications).toContainEqual({
            message: 'There are no running queued batch jobs to refresh.',
            type: 'info',
        });
    });

    it('reports poll failures for manual refresh attempts', async () => {
        const runningJob = buildQueuedJob({
            localId: 'job-poll-fail',
            name: 'batches/job-poll-fail',
            displayName: 'Poll failure queue job',
            state: 'JOB_STATE_RUNNING',
            completedAt: null,
            lastPolledAt: Date.now(),
        });

        getQueuedBatchJobMock.mockRejectedValue(new Error('remote poll failed'));

        renderHook([runningJob]);

        await act(async () => {
            await latestHook!.handlePollQueuedJob(runningJob.localId);
        });

        expect(getQueuedBatchJobMock).toHaveBeenCalledWith(runningJob.name);
        expect(latestHook!.queuedJobs[0].state).toBe('JOB_STATE_RUNNING');
        expect(logs).toContain(`Queued batch poll failed for ${runningJob.name}: remote poll failed`);
        expect(notifications).toContainEqual({
            message: 'remote poll failed',
            type: 'error',
        });
    });

    it('marks invalid batch-name jobs as failed so auto-refresh stops retrying them', async () => {
        const runningJob = buildQueuedJob({
            localId: 'job-invalid-name',
            name: 'batches/job-invalid-name',
            displayName: 'Invalid name queue job',
            state: 'JOB_STATE_RUNNING',
            completedAt: null,
            lastPolledAt: Date.now(),
        });

        getQueuedBatchJobMock.mockRejectedValue(new Error('Could not parse the batch name'));

        renderHook([runningJob]);

        await act(async () => {
            await latestHook!.handlePollAllQueuedJobs({ silent: true, reason: 'auto' });
        });

        expect(getQueuedBatchJobMock).toHaveBeenCalledWith(runningJob.name);
        expect(latestHook!.queuedJobs[0]).toEqual(
            expect.objectContaining({
                localId: runningJob.localId,
                restoredFromSnapshot: true,
                state: 'JOB_STATE_FAILED',
                error: 'Could not parse the batch name',
            }),
        );
        expect(latestHook!.queuedJobs[0].lastPolledAt).not.toBeNull();
        expect(latestHook!.queuedJobs[0].completedAt).not.toBeNull();
        expect(logs).toEqual([]);
        expect(notifications).toEqual([]);
    });

    it('reports cancel failures without mutating queued job state', async () => {
        const runningJob = buildQueuedJob({
            localId: 'job-cancel-fail',
            name: 'batches/job-cancel-fail',
            displayName: 'Cancel failure queue job',
            state: 'JOB_STATE_RUNNING',
            completedAt: null,
            lastPolledAt: Date.now(),
        });

        cancelQueuedBatchJobMock.mockRejectedValue(new Error('remote cancel failed'));

        renderHook([runningJob]);

        await act(async () => {
            await latestHook!.handleCancelQueuedJob(runningJob.localId);
        });

        expect(cancelQueuedBatchJobMock).toHaveBeenCalledWith(runningJob.name);
        expect(latestHook!.queuedJobs[0]).toEqual(
            expect.objectContaining({
                localId: runningJob.localId,
                state: 'JOB_STATE_RUNNING',
                name: runningJob.name,
            }),
        );
        expect(logs).toContain(`Queued batch cancel failed for ${runningJob.name}: remote cancel failed`);
        expect(notifications).toContainEqual({
            message: 'remote cancel failed',
            type: 'error',
        });
    });

    it('opens the imported queued history item when requested', () => {
        const importedJob = buildQueuedJob({
            localId: 'job-open-imported',
            name: 'batches/job-open-imported',
            displayName: 'Imported queue job',
            state: 'JOB_STATE_SUCCEEDED',
        });
        const importedHistoryItem: GeneratedImage = {
            id: 'history-imported-1',
            url: 'data:image/jpeg;base64,thumb',
            prompt: importedJob.prompt,
            aspectRatio: importedJob.aspectRatio,
            size: importedJob.imageSize,
            style: importedJob.style,
            model: importedJob.model,
            createdAt: 1710400065000,
            mode: importedJob.generationMode,
            executionMode: 'queued-batch-job',
            variantGroupId: importedJob.name,
            status: 'success',
        };

        renderHook([importedJob], [importedHistoryItem]);

        act(() => {
            latestHook!.handleOpenImportedQueuedJob(importedJob.localId);
        });

        expect(selectedHistoryIds).toEqual([importedHistoryItem.id]);
    });

    it('opens the latest imported queued history item when requested', () => {
        const importedJob = buildQueuedJob({
            localId: 'job-open-imported-latest',
            name: 'batches/job-open-imported-latest',
            displayName: 'Imported queue job latest',
            state: 'JOB_STATE_SUCCEEDED',
        });
        const firstImportedHistoryItem: GeneratedImage = {
            id: 'history-imported-1',
            url: 'data:image/jpeg;base64,thumb-1',
            prompt: importedJob.prompt,
            aspectRatio: importedJob.aspectRatio,
            size: importedJob.imageSize,
            style: importedJob.style,
            model: importedJob.model,
            createdAt: 1710400065000,
            mode: importedJob.generationMode,
            executionMode: 'queued-batch-job',
            variantGroupId: importedJob.name,
            status: 'success',
            metadata: {
                batchResultIndex: 0,
            },
        };
        const latestImportedHistoryItem: GeneratedImage = {
            id: 'history-imported-2',
            url: 'data:image/jpeg;base64,thumb-2',
            prompt: `${importedJob.prompt} latest`,
            aspectRatio: importedJob.aspectRatio,
            size: importedJob.imageSize,
            style: importedJob.style,
            model: importedJob.model,
            createdAt: 1710400066000,
            mode: importedJob.generationMode,
            executionMode: 'queued-batch-job',
            variantGroupId: importedJob.name,
            status: 'success',
            metadata: {
                batchResultIndex: 1,
            },
        };

        renderHook([importedJob], [firstImportedHistoryItem, latestImportedHistoryItem]);

        act(() => {
            latestHook!.handleOpenLatestImportedQueuedJob(importedJob.localId);
        });

        expect(selectedHistoryIds).toEqual([latestImportedHistoryItem.id]);
    });

    it('opens a specific imported queued history item by history id', () => {
        const importedJob = buildQueuedJob({
            localId: 'job-open-imported-specific',
            name: 'batches/job-open-imported-specific',
            displayName: 'Imported queue job preview',
            state: 'JOB_STATE_SUCCEEDED',
        });
        const importedHistoryItem: GeneratedImage = {
            id: 'history-imported-specific-2',
            url: 'data:image/jpeg;base64,thumb-2',
            prompt: `${importedJob.prompt} preview`,
            aspectRatio: importedJob.aspectRatio,
            size: importedJob.imageSize,
            style: importedJob.style,
            model: importedJob.model,
            createdAt: 1710400066000,
            mode: importedJob.generationMode,
            executionMode: 'queued-batch-job',
            variantGroupId: importedJob.name,
            status: 'success',
            metadata: {
                batchResultIndex: 1,
            },
        };

        renderHook([importedJob], [importedHistoryItem]);

        act(() => {
            latestHook!.handleOpenImportedQueuedHistoryItem(importedHistoryItem.id);
        });

        expect(selectedHistoryIds).toEqual([importedHistoryItem.id]);
    });

    it('records a no-payload import diagnostic when a succeeded batch returns no inline responses', async () => {
        const readyJob = buildQueuedJob({
            localId: 'job-no-payload',
            name: 'batches/job-no-payload',
            displayName: 'No payload batch',
        });

        importQueuedBatchJobResultsMock.mockResolvedValue({
            job: {
                name: readyJob.name,
                displayName: readyJob.displayName,
                state: 'JOB_STATE_SUCCEEDED',
                model: readyJob.model,
                createTime: '2025-01-01T00:00:00.000Z',
                updateTime: '2025-01-01T00:05:00.000Z',
                startTime: '2025-01-01T00:01:00.000Z',
                endTime: '2025-01-01T00:05:00.000Z',
                error: null,
                hasImportablePayload: false,
            },
            results: [],
        });

        renderHook([readyJob]);

        await act(async () => {
            await latestHook!.handleImportQueuedJob(readyJob.localId);
        });

        expect(latestHistory).toHaveLength(0);
        expect(latestHook!.queuedJobs[0]).toEqual(
            expect.objectContaining({
                localId: readyJob.localId,
                hasImportablePayload: false,
                importDiagnostic: 'no-payload',
            }),
        );
        expect(notifications).toContainEqual({
            message: 'Queued batch finished without inline payload.',
            type: 'error',
        });
    });

    it('records an extraction-failure diagnostic when inline responses contain no importable images', async () => {
        const readyJob = buildQueuedJob({
            localId: 'job-extraction-failure',
            name: 'batches/job-extraction-failure',
            displayName: 'Extraction failure batch',
        });

        importQueuedBatchJobResultsMock.mockResolvedValue({
            job: {
                name: readyJob.name,
                displayName: readyJob.displayName,
                state: 'JOB_STATE_SUCCEEDED',
                model: readyJob.model,
                createTime: '2025-01-01T00:00:00.000Z',
                updateTime: '2025-01-01T00:05:00.000Z',
                startTime: '2025-01-01T00:01:00.000Z',
                endTime: '2025-01-01T00:05:00.000Z',
                error: null,
                hasImportablePayload: true,
            },
            results: [
                {
                    index: 0,
                    status: 'failed',
                    error: 'Model returned no image data.',
                },
            ],
        });

        renderHook([readyJob]);

        await act(async () => {
            await latestHook!.handleImportQueuedJob(readyJob.localId);
        });

        expect(latestHistory).toHaveLength(0);
        expect(latestHook!.queuedJobs[0]).toEqual(
            expect.objectContaining({
                localId: readyJob.localId,
                hasImportablePayload: true,
                importDiagnostic: 'extraction-failure',
                error: 'Model returned no image data.',
            }),
        );
        expect(logs).toContain(
            `Queued batch import found no usable image results for ${readyJob.name}: Model returned no image data.`,
        );
        expect(notifications).toContainEqual({
            message: 'The request completed, but the model did not return image data.',
            type: 'error',
        });
    });

    it('uses imported result count to correct stale batch size when import responses omit remote counts', async () => {
        const readyJob = buildQueuedJob({
            localId: 'job-import-count-fallback',
            name: 'batches/job-import-count-fallback',
            displayName: 'Import count fallback batch',
            batchSize: 1,
        });

        importQueuedBatchJobResultsMock.mockResolvedValue({
            job: {
                name: readyJob.name,
                displayName: readyJob.displayName,
                state: 'JOB_STATE_SUCCEEDED',
                model: readyJob.model,
                createTime: '2025-01-01T00:00:00.000Z',
                updateTime: '2025-01-01T00:05:00.000Z',
                startTime: '2025-01-01T00:01:00.000Z',
                endTime: '2025-01-01T00:05:00.000Z',
                error: null,
                batchStats: null,
                hasImportablePayload: true,
            },
            results: [
                {
                    index: 0,
                    status: 'success',
                    imageUrl: 'data:image/png;base64,first',
                },
                {
                    index: 1,
                    status: 'success',
                    imageUrl: 'data:image/png;base64,second',
                },
            ],
        });

        renderHook([readyJob]);

        await act(async () => {
            await latestHook!.handleImportQueuedJob(readyJob.localId);
        });

        expect(latestHook!.queuedJobs[0]).toEqual(
            expect.objectContaining({
                localId: readyJob.localId,
                batchSize: 2,
            }),
        );
        expect(latestHistory[0]).toEqual(
            expect.objectContaining({
                metadata: expect.objectContaining({
                    batchSize: 2,
                }),
            }),
        );
    });

    it('blocks queued composer jobs before submission when memory continuation policy disallows queueing', async () => {
        renderHook([], [], {
            canQueueComposerBatch: false,
            queueBatchDisabledReason: 'Memory queue blocked.',
        });

        await act(async () => {
            await latestHook!.handleQueueBatchJob();
        });

        expect(submitQueuedBatchJobMock).not.toHaveBeenCalled();
        expect(notifications).toContainEqual({ message: 'Memory queue blocked.', type: 'error' });
    });

    it('blocks queued editor edits before submission when editor queue policy disallows them', async () => {
        renderHook([], [], {
            canQueueEditorBatch: false,
            editorQueueDisabledReason: 'Editor queue hidden in memory mode.',
        });

        await act(async () => {
            await latestHook!.handleQueueBatchJobFromEditor({
                prompt: 'Queue this editor revision',
                editingInput: 'data:image/png;base64,AAA',
                batchSize: 1,
                imageSize: '1K',
                aspectRatio: '1:1',
                generationMode: 'Editor Edit',
            });
        });

        expect(submitQueuedBatchJobMock).not.toHaveBeenCalled();
        expect(notifications).toContainEqual({ message: 'Editor queue hidden in memory mode.', type: 'error' });
    });

    it('preserves per-request import issues when a multi-request queued batch fails to import', async () => {
        const readyJob = buildQueuedJob({
            localId: 'job-multi-issue-extraction-failure',
            name: 'batches/job-multi-issue-extraction-failure',
            displayName: 'Multi issue extraction failure batch',
            batchSize: 2,
        });

        importQueuedBatchJobResultsMock.mockResolvedValue({
            job: {
                name: readyJob.name,
                displayName: readyJob.displayName,
                state: 'JOB_STATE_SUCCEEDED',
                model: readyJob.model,
                createTime: '2025-01-01T00:00:00.000Z',
                updateTime: '2025-01-01T00:05:00.000Z',
                startTime: '2025-01-01T00:01:00.000Z',
                endTime: '2025-01-01T00:05:00.000Z',
                error: null,
                hasImportablePayload: true,
            },
            results: [
                {
                    index: 0,
                    status: 'failed',
                    error: 'Model returned no image data (finish reason: STOP).',
                    sessionHints: {
                        finishReason: 'STOP',
                        extractionIssue: 'no-image-data',
                    },
                },
                {
                    index: 1,
                    status: 'failed',
                    error: 'Model returned no image data (finish reason: NO_IMAGE).',
                    sessionHints: {
                        finishReason: 'NO_IMAGE',
                        extractionIssue: 'missing-parts',
                    },
                },
            ],
        });

        renderHook([readyJob]);

        await act(async () => {
            await latestHook!.handleImportQueuedJob(readyJob.localId);
        });

        expect(latestHook!.queuedJobs[0]).toEqual(
            expect.objectContaining({
                localId: readyJob.localId,
                importDiagnostic: 'extraction-failure',
                error: 'Model returned no image data (finish reason: STOP). (+1 more)',
                importIssues: [
                    expect.objectContaining({
                        index: 0,
                        error: 'Model returned no image data (finish reason: STOP).',
                        finishReason: 'STOP',
                        extractionIssue: 'no-image-data',
                    }),
                    expect.objectContaining({
                        index: 1,
                        error: 'Model returned no image data (finish reason: NO_IMAGE).',
                        finishReason: 'NO_IMAGE',
                        extractionIssue: 'missing-parts',
                    }),
                ],
            }),
        );
    });

    it('preserves extraction failure details across later status refreshes', async () => {
        const failedImportJob = buildQueuedJob({
            localId: 'job-preserve-import-error',
            name: 'batches/job-preserve-import-error',
            displayName: 'Preserved import error batch',
            importDiagnostic: 'extraction-failure',
            importIssues: [
                {
                    index: 0,
                    error: 'Prompt was rejected by policy (block reason: PROHIBITED_CONTENT).',
                    extractionIssue: 'missing-candidates',
                },
            ],
            error: 'Prompt was rejected by policy (block reason: PROHIBITED_CONTENT).',
        });

        getQueuedBatchJobMock.mockResolvedValue({
            name: failedImportJob.name,
            displayName: failedImportJob.displayName,
            state: 'JOB_STATE_SUCCEEDED',
            model: failedImportJob.model,
            createTime: '2025-01-01T00:00:00.000Z',
            updateTime: '2025-01-01T00:06:00.000Z',
            startTime: '2025-01-01T00:01:00.000Z',
            endTime: '2025-01-01T00:05:00.000Z',
            error: null,
            hasImportablePayload: true,
        });

        renderHook([failedImportJob]);

        await act(async () => {
            await latestHook!.handlePollQueuedJob(failedImportJob.localId);
        });

        expect(latestHook!.queuedJobs[0]).toEqual(
            expect.objectContaining({
                localId: failedImportJob.localId,
                importDiagnostic: 'extraction-failure',
                importIssues: failedImportJob.importIssues,
                error: 'Prompt was rejected by policy (block reason: PROHIBITED_CONTENT).',
            }),
        );
        expect(notifications).toContainEqual({
            message: 'The prompt was blocked before image generation started. Policy block reason: blocked for prohibited content.',
            type: 'error',
        });
    });

    it('clears non-importable queued jobs while keeping active and ready jobs', () => {
        const failedJob = buildQueuedJob({
            localId: 'job-failed',
            name: 'batches/job-failed',
            displayName: 'Failed queue job',
            state: 'JOB_STATE_FAILED',
            hasImportablePayload: false,
            error: 'Upstream batch failed.',
        });
        const extractionFailureJob = buildQueuedJob({
            localId: 'job-extraction-failure-clear',
            name: 'batches/job-extraction-failure-clear',
            displayName: 'Extraction failure queue job',
            importDiagnostic: 'extraction-failure',
            error: 'Model returned no image data.',
        });
        const noPayloadJob = buildQueuedJob({
            localId: 'job-no-payload-clear',
            name: 'batches/job-no-payload-clear',
            displayName: 'No payload queue job',
            hasImportablePayload: false,
            importDiagnostic: 'no-payload',
        });
        const runningJob = buildQueuedJob({
            localId: 'job-running-clear',
            name: 'batches/job-running-clear',
            displayName: 'Running queue job',
            state: 'JOB_STATE_RUNNING',
            completedAt: null,
            hasImportablePayload: false,
            importDiagnostic: null,
            error: null,
        });
        const readyJob = buildQueuedJob({
            localId: 'job-ready-clear',
            name: 'batches/job-ready-clear',
            displayName: 'Ready queue job',
        });

        renderHook([failedJob, extractionFailureJob, noPayloadJob, runningJob, readyJob]);

        act(() => {
            latestHook!.handleClearIssueQueuedJobs();
        });

        expect(latestHook!.queuedJobs).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ localId: runningJob.localId }),
                expect.objectContaining({ localId: readyJob.localId }),
            ]),
        );
        expect(latestHook!.queuedJobs).toHaveLength(2);
        expect(logs).toContain('Cleared 3 non-importable queued batch jobs from the local queue.');
        expect(notifications).toContainEqual({
            message: 'Cleared 3 non-importable queued batch jobs.',
            type: 'info',
        });
    });

    it('clears imported queued jobs without removing imported history items', () => {
        const importedJob = buildQueuedJob({
            localId: 'job-imported-clear',
            name: 'batches/job-imported-clear',
            displayName: 'Imported queue job',
        });
        const readyJob = buildQueuedJob({
            localId: 'job-ready-clear-imported',
            name: 'batches/job-ready-clear-imported',
            displayName: 'Ready queue job',
        });
        const importedHistoryItem: GeneratedImage = {
            id: 'history-imported-clear',
            url: 'data:image/png;base64,AAA',
            prompt: importedJob.prompt,
            aspectRatio: importedJob.aspectRatio,
            size: importedJob.imageSize,
            style: importedJob.style,
            model: importedJob.model,
            createdAt: 1710400100000,
            mode: importedJob.generationMode,
            executionMode: 'queued-batch-job',
            variantGroupId: importedJob.name,
            status: 'success',
            metadata: { batchResultIndex: 0 },
        };

        renderHook([importedJob, readyJob], [importedHistoryItem]);

        act(() => {
            latestHook!.handleClearImportedQueuedJobs();
        });

        expect(latestHook!.queuedJobs).toEqual([expect.objectContaining({ localId: readyJob.localId })]);
        expect(latestHistory).toEqual([importedHistoryItem]);
        expect(logs).toContain('Cleared 1 imported queued batch jobs from the local queue.');
        expect(notifications).toContainEqual({
            message: 'Cleared 1 imported queued batch jobs.',
            type: 'info',
        });
    });
});
