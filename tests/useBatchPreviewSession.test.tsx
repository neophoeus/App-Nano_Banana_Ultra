/** @vitest-environment jsdom */

import { act, useState } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBatchPreviewSession } from '../hooks/useBatchPreviewSession';
import type { BatchPreviewSession, GeneratedImage } from '../types';
import type { ActiveLiveProgressSession } from '../hooks/useWorkspaceShellOwnerState';

type StageAssetRole = 'object' | 'character' | 'stage-source';

type HookHandle = ReturnType<typeof useBatchPreviewSession> & {
    activeBatchPreviewSession: BatchPreviewSession | null;
    activeLiveProgressSession: ActiveLiveProgressSession | null;
};

describe('useBatchPreviewSession', () => {
    let container: HTMLDivElement;
    let root: Root;
    let latestHook: HookHandle | null = null;
    let setGeneratedImageUrlsMock: ReturnType<typeof vi.fn<(urls: string[]) => void>>;
    let setSelectedImageIndexMock: ReturnType<typeof vi.fn<(index: number) => void>>;
    let clearAssetRolesMock: ReturnType<typeof vi.fn<(roles: StageAssetRole[]) => void>>;
    let resetSelectedOutputStateMock: ReturnType<typeof vi.fn<() => void>>;
    let setErrorMock: ReturnType<typeof vi.fn<(error: any) => void>>;
    let getBatchVisualSlotIndexMock: ReturnType<typeof vi.fn<(item: GeneratedImage) => number>>;
    let silentlyShowHistoryItemOnStageMock: ReturnType<typeof vi.fn<(item: GeneratedImage) => void>>;
    let silentlyShowFailedHistoryItemOnStageMock: ReturnType<typeof vi.fn<(item: GeneratedImage) => void>>;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        latestHook = null;
        setGeneratedImageUrlsMock = vi.fn((_urls: string[]) => {});
        setSelectedImageIndexMock = vi.fn((_index: number) => {});
        clearAssetRolesMock = vi.fn((_roles: StageAssetRole[]) => {});
        resetSelectedOutputStateMock = vi.fn(() => {});
        setErrorMock = vi.fn((_error: any) => {});
        getBatchVisualSlotIndexMock = vi.fn((item: GeneratedImage): number => {
            const idx = item.metadata?.batchResultIndex;
            return typeof idx === 'number' ? idx : 0;
        });
        silentlyShowHistoryItemOnStageMock = vi.fn((_item: GeneratedImage) => {});
        silentlyShowFailedHistoryItemOnStageMock = vi.fn((_item: GeneratedImage) => {});
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
    });

    function Harness() {
        const [activeBatchPreviewSession, setActiveBatchPreviewSession] = useState<BatchPreviewSession | null>(null);
        const [activeLiveProgressSession, setActiveLiveProgressSession] = useState<ActiveLiveProgressSession | null>(
            null,
        );

        const session = useBatchPreviewSession({
            activeBatchPreviewSession,
            setActiveBatchPreviewSession,
            activeLiveProgressSession,
            setActiveLiveProgressSession,
            setGeneratedImageUrls: setGeneratedImageUrlsMock,
            setSelectedImageIndex: setSelectedImageIndexMock,
            clearAssetRoles: clearAssetRolesMock,
            resetSelectedOutputState: resetSelectedOutputStateMock,
            setError: setErrorMock,
            getBatchVisualSlotIndex: getBatchVisualSlotIndexMock,
            silentlyShowHistoryItemOnStage: silentlyShowHistoryItemOnStageMock,
            silentlyShowFailedHistoryItemOnStage: silentlyShowFailedHistoryItemOnStageMock,
        });

        latestHook = {
            activeBatchPreviewSession,
            activeLiveProgressSession,
            ...session,
        };

        return null;
    }

    it('initializes a batch preview session on handleBatchPreviewStart', () => {
        act(() => {
            root.render(<Harness />);
        });

        act(() => {
            latestHook?.handleBatchPreviewStart({ sessionId: 'batch-1', batchSize: 3 });
        });

        expect(latestHook?.activeBatchPreviewSession).toEqual({
            id: 'batch-1',
            batchSize: 3,
            didUserInspectExistingImage: false,
            selectedPreviewSlotIndex: null,
            tiles: [
                { id: 'batch-1-0', slotIndex: 0, status: 'waiting', previewUrl: null, stagePreviewUrl: null, error: null },
                { id: 'batch-1-1', slotIndex: 1, status: 'waiting', previewUrl: null, stagePreviewUrl: null, error: null },
                { id: 'batch-1-2', slotIndex: 2, status: 'waiting', previewUrl: null, stagePreviewUrl: null, error: null },
            ],
        });
    });

    it('updates tiles and switches stage preview on ready tile', () => {
        act(() => {
            root.render(<Harness />);
        });

        act(() => {
            latestHook?.handleBatchPreviewStart({ sessionId: 'batch-2', batchSize: 2 });
        });

        act(() => {
            latestHook?.handleBatchPreviewTileUpdate({
                sessionId: 'batch-2',
                tile: {
                    id: 'batch-2-0',
                    slotIndex: 0,
                    status: 'ready',
                    previewUrl: 'data:image/png;base64,preview0',
                    stagePreviewUrl: 'data:image/png;base64,stage0',
                    error: null,
                },
            });
        });

        expect(latestHook?.activeBatchPreviewSession?.tiles[0].status).toBe('ready');
        expect(setGeneratedImageUrlsMock).toHaveBeenCalledWith(['data:image/png;base64,stage0']);
        expect(setSelectedImageIndexMock).toHaveBeenCalledWith(0);
    });

    it('handles tile selection on handleBatchPreviewTileSelect', () => {
        act(() => {
            root.render(<Harness />);
        });

        act(() => {
            latestHook?.handleBatchPreviewStart({ sessionId: 'batch-3', batchSize: 2 });
        });

        act(() => {
            latestHook?.handleBatchPreviewTileSelect({
                id: 'batch-3-1',
                slotIndex: 1,
                status: 'ready',
                previewUrl: 'data:image/png;base64,preview1',
                stagePreviewUrl: 'data:image/png;base64,stage1',
                error: null,
            });
        });

        expect(latestHook?.activeBatchPreviewSession?.didUserInspectExistingImage).toBe(true);
        expect(latestHook?.activeBatchPreviewSession?.selectedPreviewSlotIndex).toBe(1);
        expect(setGeneratedImageUrlsMock).toHaveBeenCalledWith(['data:image/png;base64,stage1']);
        expect(setSelectedImageIndexMock).toHaveBeenCalledWith(0);
        expect(clearAssetRolesMock).toHaveBeenCalledWith(['stage-source']);
        expect(resetSelectedOutputStateMock).toHaveBeenCalledTimes(1);
        expect(setErrorMock).toHaveBeenCalledWith(null);
    });

    it('clears session on handleBatchPreviewClear', () => {
        act(() => {
            root.render(<Harness />);
        });

        act(() => {
            latestHook?.handleBatchPreviewStart({ sessionId: 'batch-4', batchSize: 2 });
        });
        expect(latestHook?.activeBatchPreviewSession).not.toBeNull();

        act(() => {
            latestHook?.handleBatchPreviewClear({ sessionId: 'batch-4' });
        });
        expect(latestHook?.activeBatchPreviewSession).toBeNull();
    });

    it('tracks live progress events and resets', () => {
        act(() => {
            root.render(<Harness />);
        });

        act(() => {
            latestHook?.handleLiveProgressEvent({
                type: 'start',
                sessionId: 'gen-1',
                batchSessionId: 'batch-live',
                slotIndex: 0,
            });
        });

        expect(latestHook?.activeLiveProgressSession?.batchSessionId).toBe('batch-live');
        expect(latestHook?.activeLiveProgressSession?.slots[0].sessionId).toBe('gen-1');

        act(() => {
            latestHook?.handleLiveProgressReset();
        });

        expect(latestHook?.activeLiveProgressSession).toBeNull();
    });
});
