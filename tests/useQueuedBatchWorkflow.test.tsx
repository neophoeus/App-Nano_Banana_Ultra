/** @vitest-environment jsdom */

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useQueuedBatchWorkflow } from '../hooks/useQueuedBatchWorkflow';
import { QueuedBatchJob, GeneratedImage } from '../types';

const {
    checkApiKeyMock,
    submitQueuedBatchJobMock,
    getQueuedBatchJobMock,
    cancelQueuedBatchJobMock,
    importQueuedBatchJobResultsMock,
    saveImageToLocalMock,
    generateThumbnailMock,
} = vi.hoisted(() => ({
    checkApiKeyMock: vi.fn(),
    submitQueuedBatchJobMock: vi.fn(),
    getQueuedBatchJobMock: vi.fn(),
    cancelQueuedBatchJobMock: vi.fn(),
    importQueuedBatchJobResultsMock: vi.fn(),
    saveImageToLocalMock: vi.fn(),
    generateThumbnailMock: vi.fn(),
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
    importedAt: overrides.importedAt ?? null,
    error: overrides.error ?? null,
    parentHistoryId: overrides.parentHistoryId ?? null,
    rootHistoryId: overrides.rootHistoryId ?? null,
    sourceHistoryId: overrides.sourceHistoryId ?? 'source-turn-1',
    lineageAction: overrides.lineageAction || 'continue',
    lineageDepth: overrides.lineageDepth ?? 1,
});

describe('useQueuedBatchWorkflow', () => {
    let container: HTMLDivElement;
    let root: Root;
    let latestHook: HookHandle | null;
    let latestHistory: GeneratedImage[];
    let notifications: Array<{ message: string; type?: 'info' | 'error' }>;
    let logs: string[];
    let promptHistory: string[];
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
                structuredOutputMode: overrides.structuredOutputMode ?? 'off',
                temperature: overrides.temperature ?? 1,
                thinkingLevel: overrides.thinkingLevel ?? 'minimal',
                includeThoughts: overrides.includeThoughts ?? true,
                googleSearch: overrides.googleSearch ?? false,
                imageSearch: overrides.imageSearch ?? false,
                currentStageAsset: overrides.currentStageAsset ?? null,
                objectImages: overrides.objectImages ?? [],
                characterImages: overrides.characterImages ?? [],
                getModelLabel: overrides.getModelLabel ?? ((model) => model),
                getGenerationLineageContext: overrides.getGenerationLineageContext ?? (() => ({
                    parentHistoryId: 'parent-turn-1',
                    rootHistoryId: 'root-turn-1',
                    sourceHistoryId: 'source-turn-1',
                    lineageAction: 'continue',
                    lineageDepth: 1,
                })),
                addLog: overrides.addLog ?? ((message) => logs.push(message)),
                addPromptToHistory: overrides.addPromptToHistory ?? ((value) => promptHistory.push(value)),
                showNotification:
                    overrides.showNotification ?? ((message, type) => notifications.push({ message, type })),
                setHistory: (updater) => {
                    latestHistory = typeof updater === 'function' ? updater(latestHistory) : updater;
                },
                history: latestHistory,
                historySelectRef,
                t: overrides.t ?? ((key) => {
                    const translations: Record<string, string> = {
                        errorNoPrompt: 'Please enter a prompt to start!',
                        queuedBatchSubmittedNotice: 'Queued batch job submitted to the official Batch API.',
                        queuedBatchSubmittedLog: 'Queued official batch job {0}.',
                        queuedBatchSubmissionFailedLog: 'Queued batch submission failed: {0}',
                        queuedBatchNoImportableResultsNotice: 'No importable queued results.',
                        queuedBatchImportedNotice: 'Imported {0} queued batch results.',
                        queuedBatchImportedLog: 'Imported {0} queued batch results from {1}.',
                        queuedBatchImportAllLog: 'Imported {0} queued batch results from {1} ready jobs.',
                        queuedBatchImportAllNotice: 'Imported {0} queued batch results from ready jobs.',
                        queuedBatchImportAllNoneNotice:
                            'Ready queued batch jobs did not contain importable image results.',
                        queuedBatchImportWaitingNotice: 'Queued batch jobs are still waiting for importable results.',
                        queuedBatchPolledLog: 'Polled queued batch job {0}: {1}.',
                        queuedBatchReadyToImportNotice: 'Queued batch job {0} is ready to import.',
                        queuedBatchFinishedStateNotice: 'Queued batch job {0} finished with {1}.',
                        queuedBatchPollFailedLog: 'Queued batch poll failed for {0}: {1}',
                        queuedBatchRefreshedLog: 'Refreshed {0} queued batch jobs.',
                        queuedBatchRefreshNoneNotice: 'There are no running queued batch jobs to refresh.',
                        queuedBatchCancelledLog: 'Cancelled queued batch job {0}.',
                        queuedBatchCancelRequestedNotice: 'Queued batch job cancellation requested.',
                        queuedBatchCancelFailedLog: 'Queued batch cancel failed for {0}: {1}',
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
        promptHistory = [];
        selectedHistoryIds = [];

        checkApiKeyMock.mockReset();
        submitQueuedBatchJobMock.mockReset();
        getQueuedBatchJobMock.mockReset();
        cancelQueuedBatchJobMock.mockReset();
        importQueuedBatchJobResultsMock.mockReset();
        saveImageToLocalMock.mockReset();
        generateThumbnailMock.mockReset();

        saveImageToLocalMock.mockResolvedValue('D:/saved/job.png');
        generateThumbnailMock.mockResolvedValue('data:image/jpeg;base64,thumb');
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
        vi.restoreAllMocks();
    });

    it('submits explicit editor queue drafts as Editor Edit jobs', async () => {
        submitQueuedBatchJobMock.mockResolvedValue({
            name: 'batches/job-editor-queue',
            displayName: 'Editor queue job',
            state: 'JOB_STATE_PENDING',
            model: 'gemini-3.1-flash-image-preview',
            createTime: '2025-01-01T00:00:00.000Z',
            updateTime: '2025-01-01T00:00:00.000Z',
            error: null,
            batchStats: null,
        });

        renderHook([]);

        await act(async () => {
            await latestHook!.handleQueueBatchJobFromEditor({
                prompt: 'Queue this editor revision',
                editingInput: 'data:image/png;base64,editor-canvas',
                batchSize: 3,
                imageSize: '2K',
                aspectRatio: '16:9',
                objectImageInputs: ['data:image/png;base64,object-ref'],
                characterImageInputs: ['data:image/png;base64,character-ref'],
            });
        });

        expect(submitQueuedBatchJobMock).toHaveBeenCalledWith(
            expect.objectContaining({
                prompt: 'Queue this editor revision',
                editingInput: 'data:image/png;base64,editor-canvas',
                requestCount: 3,
                imageSize: '2K',
                aspectRatio: '16:9',
                style: 'None',
                objectImageInputs: ['data:image/png;base64,object-ref'],
                characterImageInputs: ['data:image/png;base64,character-ref'],
            }),
        );
        expect(latestHook!.queuedJobs[0]).toEqual(
            expect.objectContaining({
                name: 'batches/job-editor-queue',
                generationMode: 'Editor Edit',
                batchSize: 3,
                imageSize: '2K',
                aspectRatio: '16:9',
            }),
        );
        expect(promptHistory).toEqual(['Queue this editor revision']);
        expect(notifications).toContainEqual({
            message: 'Queued batch job submitted to the official Batch API.',
            type: 'info',
        });
    });

    it('keeps main queue submissions as Text to Image without stale editor state', async () => {
        submitQueuedBatchJobMock.mockResolvedValue({
            name: 'batches/job-main-queue',
            displayName: 'Main queue job',
            state: 'JOB_STATE_PENDING',
            model: 'gemini-3.1-flash-image-preview',
            createTime: '2025-01-01T00:00:00.000Z',
            updateTime: '2025-01-01T00:00:00.000Z',
            error: null,
            batchStats: null,
        });

        renderHook([], [], {
            prompt: 'Queue from the main composer',
        });

        await act(async () => {
            await latestHook!.handleQueueBatchJob();
        });

        expect(submitQueuedBatchJobMock).toHaveBeenCalledWith(
            expect.objectContaining({
                prompt: 'Queue from the main composer',
                editingInput: undefined,
            }),
        );
        expect(latestHook!.queuedJobs[0]).toEqual(
            expect.objectContaining({
                name: 'batches/job-main-queue',
                generationMode: 'Text to Image',
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
        expect(generateThumbnailMock).toHaveBeenCalledWith('data:image/png;base64,AAA');
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
        expect(latestHook!.queuedJobs[0].importedAt).not.toBeNull();
        expect(logs).toContain(`Imported 1 queued batch results from ${readyJob.name}.`);
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
        generateThumbnailMock.mockImplementation(async (imageUrl: string) => `${imageUrl}-thumb`);

        renderHook([firstReadyJob, secondReadyJob]);

        await act(async () => {
            await latestHook!.handleImportAllQueuedJobs();
        });

        expect(importQueuedBatchJobResultsMock).toHaveBeenCalledTimes(2);
        expect(latestHistory).toHaveLength(2);
        expect(latestHook!.queuedJobs.every((job) => job.importedAt !== null)).toBe(true);
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
                importedAt: null,
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
            importedAt: 1710400065000,
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
            importedAt: 1710400065000,
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
            importedAt: 1710400065000,
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
});
