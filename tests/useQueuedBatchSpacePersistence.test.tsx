/** @vitest-environment jsdom */

import React, { act, useState } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useQueuedBatchSpacePersistence } from '../hooks/useQueuedBatchSpacePersistence';
import { QueuedBatchJob } from '../types';

const {
    clearSharedQueuedBatchSpaceSnapshotMock,
    loadSharedQueuedBatchSpaceSnapshotMock,
    saveQueuedBatchSpaceSnapshotMock,
    saveSharedQueuedBatchSpaceSnapshotMock,
} = vi.hoisted(() => ({
    clearSharedQueuedBatchSpaceSnapshotMock: vi.fn(),
    loadSharedQueuedBatchSpaceSnapshotMock: vi.fn(),
    saveQueuedBatchSpaceSnapshotMock: vi.fn(),
    saveSharedQueuedBatchSpaceSnapshotMock: vi.fn(),
}));

vi.mock('../utils/queuedBatchSpacePersistence', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../utils/queuedBatchSpacePersistence')>();

    return {
        ...actual,
        clearSharedQueuedBatchSpaceSnapshot: clearSharedQueuedBatchSpaceSnapshotMock,
        loadSharedQueuedBatchSpaceSnapshot: loadSharedQueuedBatchSpaceSnapshotMock,
        saveQueuedBatchSpaceSnapshot: saveQueuedBatchSpaceSnapshotMock,
        saveSharedQueuedBatchSpaceSnapshot: saveSharedQueuedBatchSpaceSnapshotMock,
    };
});

const buildQueuedJob = (overrides: Partial<QueuedBatchJob> = {}): QueuedBatchJob => ({
    localId: overrides.localId || 'queued-job-1',
    name: overrides.name || `batches/${overrides.localId || 'queued-job-1'}`,
    displayName: overrides.displayName || 'Queued job 1',
    state: overrides.state || 'JOB_STATE_PENDING',
    model: overrides.model || 'gemini-3.1-flash-image-preview',
    prompt: overrides.prompt || 'Queued job prompt',
    generationMode: overrides.generationMode || 'Text to Image',
    aspectRatio: overrides.aspectRatio || '1:1',
    imageSize: overrides.imageSize || '2K',
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
    createdAt: overrides.createdAt ?? 1,
    updatedAt: overrides.updatedAt ?? 1,
    startedAt: overrides.startedAt ?? null,
    completedAt: overrides.completedAt ?? null,
    lastPolledAt: overrides.lastPolledAt ?? null,
    hasImportablePayload: overrides.hasImportablePayload ?? true,
    submissionPending: overrides.submissionPending ?? false,
    importDiagnostic: overrides.importDiagnostic ?? null,
    importIssues: overrides.importIssues ?? null,
    error: overrides.error ?? null,
    parentHistoryId: overrides.parentHistoryId ?? null,
    rootHistoryId: overrides.rootHistoryId ?? null,
    sourceHistoryId: overrides.sourceHistoryId ?? null,
    lineageAction: overrides.lineageAction ?? 'root',
    lineageDepth: overrides.lineageDepth ?? 0,
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

describe('useQueuedBatchSpacePersistence', () => {
    let container: HTMLDivElement;
    let root: Root;
    let latestQueuedJobs: QueuedBatchJob[];
    let updateQueuedJobs: React.Dispatch<React.SetStateAction<QueuedBatchJob[]>>;

    const renderHook = (initialQueuedJobs: QueuedBatchJob[]) => {
        function Harness() {
            const [queuedJobs, setQueuedJobs] = useState(initialQueuedJobs);
            latestQueuedJobs = queuedJobs;
            updateQueuedJobs = setQueuedJobs;

            useQueuedBatchSpacePersistence({ queuedJobs, setQueuedJobs });
            return null;
        }

        act(() => {
            root.render(<Harness />);
        });
    };

    beforeEach(() => {
        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        latestQueuedJobs = [];
        updateQueuedJobs = (() => undefined) as React.Dispatch<React.SetStateAction<QueuedBatchJob[]>>;

        clearSharedQueuedBatchSpaceSnapshotMock.mockReset();
        loadSharedQueuedBatchSpaceSnapshotMock.mockReset();
        saveQueuedBatchSpaceSnapshotMock.mockReset();
        saveSharedQueuedBatchSpaceSnapshotMock.mockReset();
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
        vi.restoreAllMocks();
        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
    });

    it('hydrates shared batch-space jobs before enabling shared backup writes', async () => {
        const deferred = createDeferred<{ snapshot: { queuedJobs: QueuedBatchJob[] } | null; reachable: boolean }>();
        const localJob = buildQueuedJob({ localId: 'local-job', updatedAt: 2 });
        const sharedJob = buildQueuedJob({ localId: 'shared-job', updatedAt: 5 });
        loadSharedQueuedBatchSpaceSnapshotMock.mockReturnValue(deferred.promise);

        renderHook([localJob]);

        expect(saveQueuedBatchSpaceSnapshotMock).toHaveBeenCalledWith({
            queuedJobs: [localJob],
        });
        expect(saveSharedQueuedBatchSpaceSnapshotMock).not.toHaveBeenCalled();

        await act(async () => {
            deferred.resolve({
                snapshot: {
                    queuedJobs: [sharedJob],
                },
                reachable: true,
            });
            await deferred.promise;
            await Promise.resolve();
        });

        expect(latestQueuedJobs).toEqual([sharedJob, localJob]);
        expect(saveSharedQueuedBatchSpaceSnapshotMock).toHaveBeenCalledWith({
            queuedJobs: [sharedJob, localJob],
        });
    });

    it('does not touch the shared backup when the shared batch-space route is unavailable', async () => {
        loadSharedQueuedBatchSpaceSnapshotMock.mockResolvedValue({
            snapshot: null,
            reachable: false,
        });

        renderHook([]);

        await act(async () => {
            await Promise.resolve();
        });

        expect(saveQueuedBatchSpaceSnapshotMock).toHaveBeenCalledWith({
            queuedJobs: [],
        });
        expect(saveSharedQueuedBatchSpaceSnapshotMock).not.toHaveBeenCalled();
        expect(clearSharedQueuedBatchSpaceSnapshotMock).not.toHaveBeenCalled();
    });

    it('clears the shared backup after the last persisted queued job is removed', async () => {
        const localJob = buildQueuedJob({ localId: 'local-job', updatedAt: 2 });
        loadSharedQueuedBatchSpaceSnapshotMock.mockResolvedValue({
            snapshot: null,
            reachable: true,
        });

        renderHook([localJob]);

        await act(async () => {
            await Promise.resolve();
        });

        clearSharedQueuedBatchSpaceSnapshotMock.mockClear();

        act(() => {
            updateQueuedJobs([]);
        });

        expect(clearSharedQueuedBatchSpaceSnapshotMock).toHaveBeenCalledTimes(1);
    });
});