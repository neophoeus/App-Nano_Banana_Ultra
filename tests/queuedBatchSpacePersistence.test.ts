/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueuedBatchJob } from '../types';
import {
    clearSharedQueuedBatchSpaceSnapshot,
    loadSharedQueuedBatchSpaceSnapshot,
    loadQueuedBatchSpaceSnapshot,
    QUEUED_BATCH_SPACE_STORAGE_KEY,
    saveQueuedBatchSpaceSnapshot,
    saveSharedQueuedBatchSpaceSnapshot,
    SHARED_QUEUED_BATCH_SPACE_ENDPOINT,
} from '../utils/queuedBatchSpacePersistence';

const buildQueuedJob = (overrides: Partial<QueuedBatchJob> = {}): QueuedBatchJob => ({
    localId: 'queued-job-1',
    name: 'batches/queued-job-1',
    displayName: 'Queued job 1',
    submissionGroupId: overrides.submissionGroupId || `submission-${overrides.localId || 'queued-job-1'}`,
    submissionItemIndex: overrides.submissionItemIndex ?? 0,
    submissionItemCount: overrides.submissionItemCount ?? 1,
    state: 'JOB_STATE_PENDING',
    model: 'gemini-3.1-flash-image',
    prompt: 'Queued job prompt',
    generationMode: 'Text to Image',
    aspectRatio: '1:1',
    imageSize: '2K',
    style: 'None',
    outputFormat: 'images-only',
    temperature: 1,
    thinkingLevel: 'minimal',
    includeThoughts: true,
    googleSearch: false,
    imageSearch: false,
    batchSize: 1,
    objectImageCount: 0,
    characterImageCount: 0,
    createdAt: 1,
    updatedAt: 1,
    startedAt: null,
    completedAt: null,
    lastPolledAt: null,
    error: null,
    ...overrides,
});

describe('queuedBatchSpacePersistence', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        localStorage.clear();
    });

    it('loads queued jobs from the dedicated batch-space store', () => {
        saveQueuedBatchSpaceSnapshot({
            queuedJobs: [buildQueuedJob()],
        });

        expect(loadQueuedBatchSpaceSnapshot().queuedJobs).toEqual([buildQueuedJob()]);
    });

    it('drops legacy queued jobs without submission grouping metadata from the dedicated batch-space store', () => {
        const {
            submissionGroupId: _submissionGroupId,
            submissionItemIndex: _submissionItemIndex,
            submissionItemCount: _submissionItemCount,
            ...legacyJob
        } = buildQueuedJob({
            localId: 'queued-job-legacy',
            name: 'batches/queued-job-legacy',
            displayName: 'Legacy queued job',
        });

        localStorage.setItem(
            QUEUED_BATCH_SPACE_STORAGE_KEY,
            JSON.stringify({
                queuedJobs: [legacyJob],
            }),
        );

        expect(loadQueuedBatchSpaceSnapshot().queuedJobs).toEqual([]);
    });

    it('clears the dedicated batch-space storage when no jobs remain', () => {
        saveQueuedBatchSpaceSnapshot({
            queuedJobs: [buildQueuedJob()],
        });
        expect(localStorage.getItem(QUEUED_BATCH_SPACE_STORAGE_KEY)).toBeTruthy();

        saveQueuedBatchSpaceSnapshot({
            queuedJobs: [],
        });

        expect(localStorage.getItem(QUEUED_BATCH_SPACE_STORAGE_KEY)).toBeNull();
    });

    it('loads queued jobs from the shared batch-space backup route', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ queuedJobs: [buildQueuedJob()] }),
        });
        vi.stubGlobal('fetch', fetchMock);

        const result = await loadSharedQueuedBatchSpaceSnapshot();

        expect(fetchMock).toHaveBeenCalledWith(
            SHARED_QUEUED_BATCH_SPACE_ENDPOINT,
            expect.objectContaining({
                method: 'GET',
                headers: expect.objectContaining({
                    Accept: 'application/json',
                    'X-NBU-Debug-Request-ID': expect.any(String),
                }),
            }),
        );
        expect(result).toEqual({
            snapshot: {
                queuedJobs: [buildQueuedJob()],
            },
            reachable: true,
        });
    });

    it('uploads queued jobs to the shared batch-space backup route', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ ok: true });
        vi.stubGlobal('fetch', fetchMock);

        await saveSharedQueuedBatchSpaceSnapshot({
            queuedJobs: [buildQueuedJob()],
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0]?.[0]).toBe(SHARED_QUEUED_BATCH_SPACE_ENDPOINT);
        const requestInit = fetchMock.mock.calls[0]?.[1] as { body?: string; method?: string; keepalive?: boolean };
        expect(requestInit.method).toBe('POST');
        expect(requestInit.keepalive).toBe(true);
        expect(JSON.parse(requestInit.body || '{}')).toEqual({
            queuedJobs: [buildQueuedJob()],
        });
    });

    it('posts an explicit empty shared batch-space snapshot when clearing the backup', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ ok: true });
        vi.stubGlobal('fetch', fetchMock);

        await clearSharedQueuedBatchSpaceSnapshot();

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0]?.[0]).toBe(SHARED_QUEUED_BATCH_SPACE_ENDPOINT);
        const requestInit = fetchMock.mock.calls[0]?.[1] as { body?: string; method?: string; keepalive?: boolean };
        expect(requestInit.method).toBe('POST');
        expect(requestInit.keepalive).toBe(true);
        expect(JSON.parse(requestInit.body || '{}')).toEqual({
            queuedJobs: [],
        });
    });
});
