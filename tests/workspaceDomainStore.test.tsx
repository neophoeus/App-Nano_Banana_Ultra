/** @vitest-environment jsdom */

import React, { act, useRef, useState } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WorkspaceDebugTerminalHost from '../components/WorkspaceDebugTerminalHost';
import { useStageHistorySynchronizer } from '../hooks/useStageHistorySynchronizer';
import { useVideoReferenceManager } from '../hooks/useVideoReferenceManager';
import { useViewerPromptAndMetadataApplyActions } from '../hooks/useViewerPromptAndMetadataApplyActions';
import { checkApiKey, uploadReferenceVideo } from '../services/geminiService';
import {
    createStoreFieldSetter,
    createWorkspaceDomainStore,
    shallowEqual,
    useWorkspaceDomainStore,
    useWorkspaceSelector,
    WorkspaceDomainStoreContext,
} from '../state/workspaceDomainStore';
import { GeneratedImage, ImageSidecarMetadata, VideoReferenceItem } from '../types';
import { emitDebugTerminalEvent } from '../utils/debugTerminalEvents';
import { loadImageMetadata } from '../utils/imageSaveUtils';
import { normalizeImageSidecarMetadata } from '../utils/imageSidecarMetadata';
import { EMPTY_WORKSPACE_SNAPSHOT } from '../utils/workspacePersistence';

vi.mock('../services/geminiService', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../services/geminiService')>();
    return {
        ...actual,
        checkApiKey: vi.fn(),
        uploadReferenceVideo: vi.fn(),
    };
});

vi.mock('../utils/imageSaveUtils', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../utils/imageSaveUtils')>();
    return {
        ...actual,
        loadImageMetadata: vi.fn(),
    };
});

describe('workspaceDomainStore', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        vi.clearAllMocks();
        window.localStorage.clear();
        HTMLElement.prototype.scrollIntoView = vi.fn();
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        if ((globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT) {
            act(() => {
                root.unmount();
            });
            (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
        } else {
            root.unmount();
        }
        container.remove();
        window.localStorage.clear();
    });

    it('initializes slices from snapshot and isolates selector re-renders across slices', () => {
        const store = createWorkspaceDomainStore({
            ...EMPTY_WORKSPACE_SNAPSHOT,
            branchState: {
                nameOverrides: { 'root-1': 'Hero Branch' },
                continuationSourceByBranchOriginId: { 'root-1': 'turn-2' },
            },
        });

        expect(store.getState().sessionAndLineage.branchNameOverrides).toEqual({ 'root-1': 'Hero Branch' });

        let runtimeRenderCount = 0;
        let surfaceRenderCount = 0;

        function RuntimeConsumer() {
            const apiKeyReady = useWorkspaceSelector(store, (state) => state.runtime.apiKeyReady);
            runtimeRenderCount += 1;
            return <div data-testid="runtime-val">{String(apiKeyReady)}</div>;
        }

        function SurfaceConsumer() {
            const surfacePair = useWorkspaceSelector(
                store,
                (state) => ({
                    isViewerOpen: state.surface.isViewerOpen,
                    showExportResultsModal: state.surface.showExportResultsModal,
                }),
                shallowEqual,
            );
            surfaceRenderCount += 1;
            return (
                <div data-testid="surface-val">
                    {String(surfacePair.isViewerOpen)}-{String(surfacePair.showExportResultsModal)}
                </div>
            );
        }

        flushSync(() => {
            root.render(
                <WorkspaceDomainStoreContext.Provider value={store}>
                    <RuntimeConsumer />
                    <SurfaceConsumer />
                </WorkspaceDomainStoreContext.Provider>,
            );
        });

        expect(runtimeRenderCount).toBe(1);
        expect(surfaceRenderCount).toBe(1);

        // Updating an unrelated surface field (isDebugTerminalOpen) should cause 0 renders on both consumers
        flushSync(() => {
            store.updateSurface({ isDebugTerminalOpen: true });
        });
        expect(runtimeRenderCount).toBe(1);
        expect(surfaceRenderCount).toBe(1);

        // Updating isViewerOpen should re-render only SurfaceConsumer, not RuntimeConsumer
        flushSync(() => {
            store.updateSurface({ isViewerOpen: true });
        });
        expect(runtimeRenderCount).toBe(1);
        expect(surfaceRenderCount).toBe(2);

        // Resetting surface overlays keeps isDebugTerminalOpen and resets modals/sheets
        flushSync(() => {
            store.resetSurfaceOverlays();
        });
        expect(store.getState().surface.isViewerOpen).toBe(false);
        expect(store.getState().surface.isDebugTerminalOpen).toBe(true);
    });

    it('supports functional SetStateAction updates via createStoreFieldSetter', () => {
        const store = createWorkspaceDomainStore(EMPTY_WORKSPACE_SNAPSHOT);
        const setBatchProgress = createStoreFieldSetter(
            () => store.getState().execution,
            store.updateExecution,
            'batchProgress',
        );

        setBatchProgress({ completed: 1, total: 4 });
        expect(store.getState().execution.batchProgress).toEqual({ completed: 1, total: 4 });

        setBatchProgress((prev) => ({ ...prev, completed: prev.completed + 1 }));
        expect(store.getState().execution.batchProgress).toEqual({ completed: 2, total: 4 });
    });

    it('isolates WorkspaceDebugTerminalHost so closed-terminal background events cause 0 host re-renders', () => {
        const store = createWorkspaceDomainStore(EMPTY_WORKSPACE_SNAPSHOT);
        let siblingRenderCount = 0;

        function SiblingStageProbe() {
            const storeFromCtx = useWorkspaceDomainStore();
            const isEditing = useWorkspaceSelector(storeFromCtx, (state) => state.surface.isEditing);
            siblingRenderCount += 1;
            return <div data-testid="sibling-probe">{String(isEditing)}</div>;
        }

        const t = vi.fn((key: string) => key);

        flushSync(() => {
            root.render(
                <WorkspaceDomainStoreContext.Provider value={store}>
                    <SiblingStageProbe />
                    <WorkspaceDebugTerminalHost store={store} t={t} />
                </WorkspaceDomainStoreContext.Provider>,
            );
        });

        expect(siblingRenderCount).toBe(1);
        expect(container.querySelector('[data-testid="debug-terminal-panel"]')).toBeNull();

        flushSync(() => {
            emitDebugTerminalEvent({
                kind: 'request',
                label: 'Silent background event',
                source: 'workspace',
            });
        });

        expect(siblingRenderCount).toBe(1);

        flushSync(() => {
            store.updateSurface({ isDebugTerminalOpen: true });
        });

        expect(siblingRenderCount).toBe(1);
        expect(container.textContent).toContain('Silent background event');
    });

    it('applies viewer prompt and metadata settings via useViewerPromptAndMetadataApplyActions', () => {
        const setPrompt = vi.fn();
        const applyViewerComposerSettingsSnapshot = vi.fn().mockReturnValue(true);
        const setShowMetadataViewerDrawer = vi.fn();
        const showNotification = vi.fn();
        const t = vi.fn((key: string) => key);

        let actions: ReturnType<typeof useViewerPromptAndMetadataApplyActions> | null = null;

        function ActionHarness() {
            const textareaRef = useRef<HTMLTextAreaElement | null>(null);
            const [, setDummy] = useState(0);
            void setDummy;
            actions = useViewerPromptAndMetadataApplyActions({
                composerPromptTextareaRef: textareaRef,
                setPrompt,
                applyViewerComposerSettingsSnapshot,
                setShowMetadataViewerDrawer,
                showNotification,
                t,
            });
            return <textarea ref={textareaRef} defaultValue="init" />;
        }

        flushSync(() => {
            root.render(<ActionHarness />);
        });

        actions!.handleApplyBothFromMetadataViewer('  refined prompt  ', {
            aspectRatio: '16:9',
            imageSize: '2K',
            imageStyle: 'None',
            imageModel: 'gemini-3.1-flash-image',
            batchSize: 1,
        });

        expect(applyViewerComposerSettingsSnapshot).toHaveBeenCalledTimes(1);
        expect(setPrompt).toHaveBeenCalledWith('refined prompt');
        expect(setShowMetadataViewerDrawer).toHaveBeenCalledWith(false);
        expect(showNotification).toHaveBeenCalledWith('metadataViewerApplyBothSuccessNotice', 'info');
    });

    it('uploads video references and aborts in-flight uploads cleanly via useVideoReferenceManager', async () => {
        (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
        vi.mocked(checkApiKey).mockResolvedValue(true);
        const setApiKeyReadySpy = vi.fn();
        const handleApiKeyConnect = vi.fn().mockResolvedValue(true);
        const t = vi.fn((key: string) => key);

        let manager: ReturnType<typeof useVideoReferenceManager> | null = null;

        function VideoManagerHarness() {
            const [apiKeyReady, setApiKeyReadyState] = useState(false);
            const setApiKeyReady: React.Dispatch<React.SetStateAction<boolean>> = (value) => {
                setApiKeyReadySpy(value);
                setApiKeyReadyState(value);
            };
            manager = useVideoReferenceManager({
                imageModel: 'gemini-nano-banana-2.1',
                apiKeyReady,
                setApiKeyReady,
                handleApiKeyConnect,
                t,
            });
            return null;
        }

        act(() => {
            root.render(<VideoManagerHarness />);
        });

        vi.mocked(uploadReferenceVideo).mockResolvedValueOnce({
            name: 'files/video-123',
            fileUri: 'https://generativelanguage.googleapis.com/v1beta/files/video-123',
            mimeType: 'video/mp4',
            displayName: 'clip.mp4',
            sizeBytes: 2048,
            expiresAt: '2026-12-01T00:00:00Z',
        });

        const videoFile = new File(['video-bytes'], 'clip.mp4', { type: 'video/mp4' });
        let uploadedRef: VideoReferenceItem | null = null;
        await act(async () => {
            uploadedRef = await manager!.handleUploadVideoFile(videoFile);
        });

        expect(handleApiKeyConnect).toHaveBeenCalledTimes(1);
        expect(setApiKeyReadySpy).toHaveBeenCalledWith(true);
        expect(uploadedRef).toMatchObject({
            sourceType: 'upload',
            uri: 'https://generativelanguage.googleapis.com/v1beta/files/video-123',
            mimeType: 'video/mp4',
            displayName: 'clip.mp4',
        });
        expect(manager!.videoReference?.uri).toBe('https://generativelanguage.googleapis.com/v1beta/files/video-123');
        expect(manager!.isUploadingVideo).toBe(false);

        // Now start a second upload and cancel it while in-flight to verify AbortController race protection
        let capturedSignal: AbortSignal | undefined;
        let resolveSlowUpload: ((val: Awaited<ReturnType<typeof uploadReferenceVideo>>) => void) | null = null;
        vi.mocked(uploadReferenceVideo).mockImplementationOnce((_file, options) => {
            capturedSignal = options?.signal;
            return new Promise((resolve) => {
                resolveSlowUpload = resolve;
            });
        });

        let secondUploadPromise: Promise<unknown> | null = null;
        act(() => {
            secondUploadPromise = manager!.handleUploadVideoFile(videoFile);
        });
        expect(manager!.isUploadingVideo).toBe(true);

        act(() => {
            manager!.cancelActiveVideoUpload();
        });
        expect(capturedSignal?.aborted).toBe(true);
        expect(manager!.isUploadingVideo).toBe(false);

        await act(async () => {
            resolveSlowUpload!({
                name: 'files/stale-video',
                fileUri: 'https://generativelanguage.googleapis.com/v1beta/files/stale-video',
                mimeType: 'video/mp4',
                displayName: 'stale.mp4',
                sizeBytes: 1024,
                expiresAt: '2026-12-01T00:00:00Z',
            });
            await expect(secondUploadPromise).rejects.toThrow('ABORTED');
        });

        // Stale cancelled upload must not overwrite the previously committed videoReference
        expect(manager!.videoReference?.uri).toBe('https://generativelanguage.googleapis.com/v1beta/files/video-123');
    });

    it('marks viewed turns opened on navigation and discards stale async sidecar metadata via useStageHistorySynchronizer', async () => {
        (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
        let resolveTurn1Metadata: ((meta: ImageSidecarMetadata | null) => void) | null = null;
        let resolveTurn2Metadata: ((meta: ImageSidecarMetadata | null) => void) | null = null;

        vi.mocked(loadImageMetadata).mockImplementation((filename?: string | null) => {
            if (filename === 'turn-1.png') {
                return new Promise((resolve) => {
                    resolveTurn1Metadata = resolve;
                });
            }
            return new Promise((resolve) => {
                resolveTurn2Metadata = resolve;
            });
        });

        const initialTurns: GeneratedImage[] = [
            {
                id: 'turn-1',
                url: 'data:image/png;base64,VFVSTjE=',
                savedFilename: 'turn-1.png',
                prompt: 'Turn 1 prompt',
                aspectRatio: '1:1',
                size: '1K',
                style: 'None',
                model: 'gemini-nano-banana-2.1',
                createdAt: 1000,
                status: 'success',
                openedAt: null,
            },
            {
                id: 'turn-2',
                url: 'data:image/png;base64,VFVSTjI=',
                savedFilename: 'turn-2.png',
                prompt: 'Turn 2 prompt',
                aspectRatio: '16:9',
                size: '2K',
                style: 'None',
                model: 'gemini-3.1-flash-image',
                createdAt: 2000,
                status: 'success',
                openedAt: null,
            },
        ];

        let latestHistory = initialTurns;
        let latestMetadata: Record<string, unknown> | null = null;
        let switchTurn: ((id: string) => void) | null = null;

        function SynchronizerHarness() {
            const [history, setHistory] = useState<GeneratedImage[]>(initialTurns);
            const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>('turn-1');
            const [selectedMetadata, setSelectedMetadata] = useState<Record<string, unknown> | null>(null);
            latestHistory = history;
            latestMetadata = selectedMetadata;
            switchTurn = setSelectedHistoryId;

            useStageHistorySynchronizer({
                currentStageAsset: null,
                selectedHistoryId,
                getHistoryTurnById: (id) => history.find((item) => item.id === id) || null,
                setHistory,
                setGeneratedImageUrls: vi.fn(),
                setSelectedImageIndex: vi.fn(),
                setSelectedHistoryId,
                setSelectedMetadata,
                setError: vi.fn(),
                buildResultArtifacts: () => ({
                    text: null,
                    thoughts: null,
                    resultParts: null,
                    grounding: null,
                    metadata: null,
                    sessionHints: null,
                    historyId: null,
                }),
                applySelectedResultArtifacts: vi.fn(),
                upsertViewerStageSource: vi.fn(),
                clearAssetRoles: vi.fn(),
                t: (key) => key,
            });
            return null;
        }

        await act(async () => {
            root.render(<SynchronizerHarness />);
        });

        expect(latestHistory.find((item) => item.id === 'turn-1')?.openedAt).toBeNull();

        // Switch from turn-1 to turn-2 BEFORE turn-1's loadImageMetadata resolves
        await act(async () => {
            switchTurn!('turn-2');
        });

        // Navigating away from turn-1 marks turn-1 as opened automatically
        expect(typeof latestHistory.find((item) => item.id === 'turn-1')?.openedAt).toBe('number');

        // Resolve turn-2 first, then resolve stale turn-1 afterwards
        await act(async () => {
            resolveTurn2Metadata!(
                normalizeImageSidecarMetadata({ prompt: 'Turn 2 sidecar prompt', model: 'gemini-3.1-flash-image' }),
            );
        });
        expect(latestMetadata).toMatchObject({ prompt: 'Turn 2 sidecar prompt' });

        await act(async () => {
            resolveTurn1Metadata!(
                normalizeImageSidecarMetadata({
                    prompt: 'Stale Turn 1 sidecar prompt',
                    model: 'gemini-nano-banana-2.1',
                }),
            );
        });

        // Stale turn-1 metadata resolution must be ignored so turn-2's metadata remains active
        expect(latestMetadata).toMatchObject({ prompt: 'Turn 2 sidecar prompt' });
    });
});
