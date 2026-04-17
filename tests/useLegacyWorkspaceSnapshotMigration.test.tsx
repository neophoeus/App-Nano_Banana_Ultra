/** @vitest-environment jsdom */

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLegacyWorkspaceSnapshotMigration } from '../hooks/useLegacyWorkspaceSnapshotMigration';
import { WorkspacePersistenceSnapshot } from '../types';
import { EMPTY_WORKSPACE_SNAPSHOT } from '../utils/workspacePersistence';

const { loadSharedWorkspaceSnapshotMock } = vi.hoisted(() => ({
    loadSharedWorkspaceSnapshotMock: vi.fn(),
}));

vi.mock('../utils/workspacePersistence', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../utils/workspacePersistence')>();

    return {
        ...actual,
        loadSharedWorkspaceSnapshot: loadSharedWorkspaceSnapshotMock,
    };
});

const buildSnapshot = (overrides: Partial<WorkspacePersistenceSnapshot> = {}): WorkspacePersistenceSnapshot => ({
    ...EMPTY_WORKSPACE_SNAPSHOT,
    ...overrides,
});

const buildSharedSnapshot = (prompt: string): WorkspacePersistenceSnapshot =>
    buildSnapshot({
        history: [
            {
                id: 'legacy-turn',
                url: 'https://example.com/legacy.png',
                prompt,
                aspectRatio: '1:1',
                size: '2K',
                style: 'None',
                model: 'gemini-3.1-flash-image-preview',
                createdAt: 10,
                status: 'success',
            },
        ],
    });

const createDeferred = <T,>() => {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });

    return { promise, resolve, reject };
};

describe('useLegacyWorkspaceSnapshotMigration', () => {
    let container: HTMLDivElement;
    let root: Root;
    let currentSnapshot: WorkspacePersistenceSnapshot;
    let applyWorkspaceSnapshot: ReturnType<typeof vi.fn>;
    let addLog: ReturnType<typeof vi.fn>;

    const renderHook = () => {
        function Harness() {
            useLegacyWorkspaceSnapshotMigration({
                t: (key) => key,
                composeCurrentWorkspaceSnapshot: () => currentSnapshot,
                applyWorkspaceSnapshot,
                addLog,
            });
            return null;
        }

        const rerender = () => {
            act(() => {
                root.render(<Harness />);
            });
        };

        rerender();

        return { rerender };
    };

    beforeEach(() => {
        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        currentSnapshot = EMPTY_WORKSPACE_SNAPSHOT;
        applyWorkspaceSnapshot = vi.fn();
        addLog = vi.fn();
        localStorage.clear();
        loadSharedWorkspaceSnapshotMock.mockReset();
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
        vi.restoreAllMocks();
        localStorage.clear();
        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
    });

    it('applies the shared snapshot when the workspace stays empty until restore resolves', async () => {
        const deferred = createDeferred<WorkspacePersistenceSnapshot | null>();
        const sharedSnapshot = buildSharedSnapshot('Restore me');
        loadSharedWorkspaceSnapshotMock.mockReturnValue(deferred.promise);

        renderHook();

        await act(async () => {
            deferred.resolve(sharedSnapshot);
            await deferred.promise;
            await Promise.resolve();
        });

        expect(applyWorkspaceSnapshot).toHaveBeenCalledWith(sharedSnapshot, { announceRestoreToast: true });
        expect(addLog).toHaveBeenCalledTimes(1);
    });

    it('skips a late shared snapshot once the current workspace already has live draft content', async () => {
        const deferred = createDeferred<WorkspacePersistenceSnapshot | null>();
        const sharedSnapshot = buildSharedSnapshot('Legacy prompt');
        loadSharedWorkspaceSnapshotMock.mockReturnValue(deferred.promise);

        renderHook();

        currentSnapshot = buildSnapshot({
            composerState: {
                ...EMPTY_WORKSPACE_SNAPSHOT.composerState,
                prompt: 'Live draft prompt',
            },
        });

        await act(async () => {
            deferred.resolve(sharedSnapshot);
            await deferred.promise;
            await Promise.resolve();
        });

        expect(applyWorkspaceSnapshot).not.toHaveBeenCalled();
        expect(addLog).not.toHaveBeenCalled();
    });

    it('does not retry shared snapshot migration after a later transition into an intentionally empty workspace', async () => {
        currentSnapshot = buildSnapshot({
            composerState: {
                ...EMPTY_WORKSPACE_SNAPSHOT.composerState,
                prompt: 'Live draft prompt',
            },
        });
        loadSharedWorkspaceSnapshotMock.mockResolvedValue(buildSharedSnapshot('Legacy prompt'));

        const { rerender } = renderHook();

        const initialSharedReadCount = loadSharedWorkspaceSnapshotMock.mock.calls.length;
        const initialApplyCount = applyWorkspaceSnapshot.mock.calls.length;
        const initialLogCount = addLog.mock.calls.length;

        currentSnapshot = EMPTY_WORKSPACE_SNAPSHOT;
        rerender();

        await act(async () => {
            await Promise.resolve();
        });

        expect(loadSharedWorkspaceSnapshotMock).toHaveBeenCalledTimes(initialSharedReadCount);
        expect(applyWorkspaceSnapshot).toHaveBeenCalledTimes(initialApplyCount);
        expect(addLog).toHaveBeenCalledTimes(initialLogCount);
    });
});
