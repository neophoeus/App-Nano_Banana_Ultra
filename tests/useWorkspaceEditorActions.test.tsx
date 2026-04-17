/** @vitest-environment jsdom */

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type StageErrorState } from '../types';

const {
    constrainImageDimensionsMock,
    loadImageDimensionsMock,
    prepareImageAssetFromFileMock,
    prepareImageAssetFromSourceMock,
} = vi.hoisted(() => ({
    constrainImageDimensionsMock: vi.fn(),
    loadImageDimensionsMock: vi.fn(),
    prepareImageAssetFromFileMock: vi.fn(),
    prepareImageAssetFromSourceMock: vi.fn(),
}));

vi.mock('../utils/imageSaveUtils', () => ({
    constrainImageDimensions: constrainImageDimensionsMock,
    loadImageDimensions: loadImageDimensionsMock,
    prepareImageAssetFromFile: prepareImageAssetFromFileMock,
    prepareImageAssetFromSource: prepareImageAssetFromSourceMock,
    EDITOR_IMAGE_MAX_DIMENSION: 4096,
}));

import { useWorkspaceEditorActions, type EditorContextSnapshot } from '../hooks/useWorkspaceEditorActions';

type HookHandle = ReturnType<typeof useWorkspaceEditorActions>;

const buildEditorContextSnapshot = (): EditorContextSnapshot => ({
    prompt: 'Editor prompt',
    objectImages: ['object-a'],
    characterImages: ['character-a'],
    ratio: '21:9',
    size: '4K',
    batchSize: 3,
    model: 'gemini-3.1-flash-image-preview',
    style: 'None',
    outputFormat: 'images-only',
    temperature: 1,
    thinkingLevel: 'minimal',
    includeThoughts: false,
    googleSearch: false,
    imageSearch: false,
    sourceHistoryId: 'source-turn',
    sourceLineageAction: 'continue',
});

const buildHistoryTurn = (overrides: Record<string, unknown> = {}) => ({
    id: 'history-turn',
    url: 'https://example.com/history.png',
    prompt: 'History prompt',
    aspectRatio: '1:1',
    size: '1K',
    style: 'None',
    model: 'gemini-3.1-flash-image-preview',
    createdAt: 1,
    status: 'success',
    ...overrides,
});

const createStateSetter = <T,>() => vi.fn() as unknown as React.Dispatch<React.SetStateAction<T>>;

describe('useWorkspaceEditorActions', () => {
    let container: HTMLDivElement;
    let root: Root;
    let latestHook: HookHandle | null;
    let props: Parameters<typeof useWorkspaceEditorActions>[0];

    const renderHook = () => {
        function Harness() {
            latestHook = useWorkspaceEditorActions(props);
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
        latestHook = null;

        constrainImageDimensionsMock.mockReset();
        constrainImageDimensionsMock.mockImplementation((width: number, height: number) => ({
            width,
            height,
            wasResized: false,
        }));
        loadImageDimensionsMock.mockReset();
        prepareImageAssetFromFileMock.mockReset();
        prepareImageAssetFromSourceMock.mockReset();

        props = {
            history: [],
            branchOriginIdByTurnId: {},
            workspaceSessionSourceHistoryId: null,
            workspaceSessionSourceLineageAction: null,
            objectImages: ['workspace-object'],
            characterImages: ['workspace-character'],
            aspectRatio: '1:1',
            imageSize: '1K',
            batchSize: 1,
            imageModel: 'gemini-3.1-flash-image-preview',
            imageStyle: 'None',
            outputFormat: 'images-only',
            temperature: 1,
            thinkingLevel: 'minimal',
            includeThoughts: false,
            googleSearch: false,
            imageSearch: false,
            capability: {
                maxObjects: 4,
                maxCharacters: 4,
            },
            currentStageAsset: undefined,
            editorContextSnapshot: buildEditorContextSnapshot(),
            hasSketch: false,
            isEditing: true,
            uploadInputRef: { current: null },
            setObjectImages: createStateSetter<string[]>(),
            setCharacterImages: createStateSetter<string[]>(),
            setIsEditing: createStateSetter<boolean>(),
            setEditingImageSource: createStateSetter<string | null>(),
            setEditorContextSnapshot: createStateSetter<EditorContextSnapshot | null>(),
            setEditorPrompt: createStateSetter<string>(),
            setAspectRatio: createStateSetter<'1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '3:2' | '2:3' | '21:9'>(),
            setImageSize: createStateSetter<'1K' | '2K' | '4K'>(),
            setActivePickerSheet: createStateSetter<
                | 'prompt'
                | 'history'
                | 'templates'
                | 'styles'
                | 'settings'
                | 'model'
                | 'ratio'
                | 'size'
                | 'batch'
                | 'references'
                | null
            >(),
            setError: createStateSetter<StageErrorState | null>(),
            setIsSketchPadOpen: createStateSetter<boolean>(),
            setShowSketchReplaceConfirm: createStateSetter<boolean>(),
            setEditorMode: createStateSetter<'inpaint' | 'outpaint'>(),
            setEditorRetouchLockedRatio: createStateSetter<
                '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '3:2' | '2:3' | '21:9' | null
            >(),
            restoreEditorComposerState: vi.fn(),
            getActiveImageUrl: vi.fn(() => ''),
            addWorkspaceAsset: vi.fn(),
            removeAssetAtRoleIndex: vi.fn(),
            clearAssetRoles: vi.fn(),
            showNotification: vi.fn(),
            addLog: vi.fn(),
            t: (key: string) => key,
            primePendingProvenanceContinuation: vi.fn(),
            performGeneration: vi.fn(),
            queueBatchJobFromEditor: vi.fn(async () => {}),
        };
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
        vi.restoreAllMocks();
        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
    });

    it('restores shared composer context by default when closing the editor', () => {
        renderHook();

        act(() => {
            latestHook?.closeEditor();
        });

        expect(props.restoreEditorComposerState).toHaveBeenCalledWith(props.editorContextSnapshot);
        expect(props.setObjectImages).toHaveBeenCalledWith(props.editorContextSnapshot?.objectImages);
        expect(props.setCharacterImages).toHaveBeenCalledWith(props.editorContextSnapshot?.characterImages);
        expect(props.setIsEditing).toHaveBeenCalledWith(false);
        expect(props.setEditingImageSource).toHaveBeenCalledWith(null);
    });

    it('allows callers to skip shared composer restoration explicitly', () => {
        renderHook();

        act(() => {
            latestHook?.closeEditor({ discardSharedContext: false });
        });

        expect(props.restoreEditorComposerState).not.toHaveBeenCalled();
        expect(props.setObjectImages).not.toHaveBeenCalled();
        expect(props.setCharacterImages).not.toHaveBeenCalled();
        expect(props.setIsEditing).toHaveBeenCalledWith(false);
        expect(props.setEditingImageSource).toHaveBeenCalledWith(null);
    });

    it('snapshots branch intent when the current stage selection itself points at an older turn', async () => {
        const olderTurn = buildHistoryTurn({
            id: 'older-turn',
            rootHistoryId: 'root-turn',
            lineageAction: 'continue',
            createdAt: 1,
        });
        const latestTurn = buildHistoryTurn({
            id: 'latest-turn',
            parentHistoryId: 'older-turn',
            rootHistoryId: 'root-turn',
            sourceHistoryId: 'older-turn',
            lineageAction: 'continue',
            createdAt: 2,
        });

        loadImageDimensionsMock.mockResolvedValue({ width: 1024, height: 1024 });
        props.history = [olderTurn, latestTurn] as Parameters<typeof useWorkspaceEditorActions>[0]['history'];
        props.branchOriginIdByTurnId = {
            'older-turn': 'root-turn',
            'latest-turn': 'root-turn',
        };
        props.workspaceSessionSourceHistoryId = 'older-turn';
        props.workspaceSessionSourceLineageAction = 'branch';
        props.currentStageAsset = {
            id: 'stage-source',
            url: 'data:image/png;base64,stage',
            role: 'stage-source',
            origin: 'history',
            createdAt: 3,
            sourceHistoryId: 'older-turn',
            lineageAction: 'reopen',
        };
        props.getActiveImageUrl = vi.fn(() => 'data:image/png;base64,stage');

        renderHook();

        await act(async () => {
            latestHook?.handleOpenEditor();
            await Promise.resolve();
        });

        expect(props.setEditorContextSnapshot).toHaveBeenCalledWith(
            expect.objectContaining({
                sourceHistoryId: 'older-turn',
                sourceLineageAction: 'branch',
            }),
        );
    });

    it('prefers the current workspace source selection over a stale linked stage asset when opening the editor', async () => {
        const olderTurn = buildHistoryTurn({
            id: 'older-turn',
            rootHistoryId: 'root-turn',
            lineageAction: 'continue',
            createdAt: 1,
        });
        const latestTurn = buildHistoryTurn({
            id: 'latest-turn',
            parentHistoryId: 'older-turn',
            rootHistoryId: 'root-turn',
            sourceHistoryId: 'older-turn',
            lineageAction: 'continue',
            createdAt: 2,
        });

        loadImageDimensionsMock.mockResolvedValue({ width: 1024, height: 1024 });
        props.history = [olderTurn, latestTurn] as Parameters<typeof useWorkspaceEditorActions>[0]['history'];
        props.branchOriginIdByTurnId = {
            'older-turn': 'root-turn',
            'latest-turn': 'root-turn',
        };
        props.workspaceSessionSourceHistoryId = 'older-turn';
        props.workspaceSessionSourceLineageAction = 'branch';
        props.currentStageAsset = {
            id: 'stage-source',
            url: 'data:image/png;base64,stage',
            role: 'stage-source',
            origin: 'history',
            createdAt: 3,
            sourceHistoryId: 'latest-turn',
            lineageAction: 'reopen',
        };
        props.getActiveImageUrl = vi.fn(() => 'data:image/png;base64,stage');

        renderHook();

        await act(async () => {
            latestHook?.handleOpenEditor();
            await Promise.resolve();
        });

        expect(props.setEditorContextSnapshot).toHaveBeenCalledWith(
            expect.objectContaining({
                sourceHistoryId: 'older-turn',
                sourceLineageAction: 'branch',
            }),
        );
    });

    it('prefers a branch-marked current stage source over a stale workspace continuation source', async () => {
        const olderTurn = buildHistoryTurn({
            id: 'older-turn',
            rootHistoryId: 'root-turn',
            lineageAction: 'continue',
            createdAt: 1,
        });
        const latestTurn = buildHistoryTurn({
            id: 'latest-turn',
            parentHistoryId: 'older-turn',
            rootHistoryId: 'root-turn',
            sourceHistoryId: 'older-turn',
            lineageAction: 'continue',
            createdAt: 2,
        });

        loadImageDimensionsMock.mockResolvedValue({ width: 1024, height: 1024 });
        props.history = [olderTurn, latestTurn] as Parameters<typeof useWorkspaceEditorActions>[0]['history'];
        props.branchOriginIdByTurnId = {
            'older-turn': 'root-turn',
            'latest-turn': 'root-turn',
        };
        props.workspaceSessionSourceHistoryId = 'latest-turn';
        props.workspaceSessionSourceLineageAction = 'continue';
        props.currentStageAsset = {
            id: 'stage-source',
            url: 'data:image/png;base64,stage',
            role: 'stage-source',
            origin: 'history',
            createdAt: 3,
            sourceHistoryId: 'older-turn',
            lineageAction: 'branch',
        };
        props.getActiveImageUrl = vi.fn(() => 'data:image/png;base64,stage');

        renderHook();

        await act(async () => {
            latestHook?.handleOpenEditor();
            await Promise.resolve();
        });

        expect(props.setEditorContextSnapshot).toHaveBeenCalledWith(
            expect.objectContaining({
                sourceHistoryId: 'older-turn',
                sourceLineageAction: 'branch',
            }),
        );
    });

    it('opens uploaded editor sources without inheriting stale workspace lineage', async () => {
        prepareImageAssetFromFileMock.mockResolvedValue({
            dataUrl: 'data:image/png;base64,upload',
            width: 800,
            height: 600,
            wasResized: false,
        });
        props.currentStageAsset = {
            id: 'stale-stage-source',
            url: 'data:image/png;base64,stale',
            role: 'stage-source',
            origin: 'history',
            createdAt: 2,
            sourceHistoryId: 'stale-turn',
            lineageAction: 'reopen',
        };

        renderHook();

        await act(async () => {
            latestHook?.handleUploadForEdit({
                target: {
                    files: [new File(['upload'], 'upload.png', { type: 'image/png' })],
                },
            } as React.ChangeEvent<HTMLInputElement>);
            await Promise.resolve();
        });

        expect(props.setEditorContextSnapshot).toHaveBeenCalledWith(
            expect.objectContaining({
                editorPreparedSource: {
                    width: 800,
                    height: 600,
                    wasResized: false,
                },
                sourceHistoryId: null,
                sourceLineageAction: null,
            }),
        );
        expect(props.setEditingImageSource).toHaveBeenCalledWith('data:image/png;base64,upload');
        expect(props.addLog).toHaveBeenCalledWith('logImageUploaded');
        expect(props.showNotification).not.toHaveBeenCalledWith('msgImageResized', 'info');
    });

    it('prepares oversized stage sources once before opening the editor', async () => {
        loadImageDimensionsMock.mockResolvedValue({ width: 8192, height: 6144 });
        constrainImageDimensionsMock.mockReturnValue({ width: 4096, height: 3072, wasResized: true });
        prepareImageAssetFromSourceMock.mockResolvedValue({
            dataUrl: 'data:image/png;base64,prepared-stage',
            width: 4096,
            height: 3072,
            wasResized: true,
            mimeType: 'image/png',
        });
        props.getActiveImageUrl = vi.fn(() => 'https://example.com/large-stage.png');

        renderHook();

        await act(async () => {
            latestHook?.handleOpenEditor();
            await Promise.resolve();
        });

        expect(prepareImageAssetFromSourceMock).toHaveBeenCalledWith('https://example.com/large-stage.png', 4096);
        expect(props.setEditorContextSnapshot).toHaveBeenCalledWith(
            expect.objectContaining({
                editorInitialSize: '4K',
                editorPreparedSource: {
                    width: 4096,
                    height: 3072,
                    wasResized: true,
                },
            }),
        );
        expect(props.setEditingImageSource).toHaveBeenCalledWith(null);
        expect(props.setEditingImageSource).toHaveBeenCalledWith('data:image/png;base64,prepared-stage');
        expect(props.addLog).toHaveBeenCalledWith('msgImageResized');
        expect(props.showNotification).toHaveBeenCalledWith('msgImageResized', 'info');
    });

    it('preserves explicit null editor lineage overrides when generating from upload-only sources', () => {
        props.currentStageAsset = {
            id: 'stale-stage-source',
            url: 'data:image/png;base64,stale',
            role: 'stage-source',
            origin: 'history',
            createdAt: 2,
            sourceHistoryId: 'stale-turn',
            lineageAction: 'reopen',
        };
        props.editorContextSnapshot = {
            ...buildEditorContextSnapshot(),
            sourceHistoryId: null,
            sourceLineageAction: null,
        };

        renderHook();

        act(() => {
            latestHook?.handleEditorGenerate(
                'Editor upload prompt',
                'data:image/png;base64,editor',
                2,
                '2K',
                'Editor Edit',
                ['object-ref'],
                ['character-ref'],
                '16:9',
            );
        });

        expect(props.primePendingProvenanceContinuation).toHaveBeenCalledWith(null, {
            useExplicitSource: true,
        });
        expect(props.performGeneration).toHaveBeenCalledWith(
            'Editor upload prompt',
            '16:9',
            '2K',
            'None',
            'gemini-3.1-flash-image-preview',
            'data:image/png;base64,editor',
            2,
            undefined,
            'Editor Edit',
            ['object-ref'],
            ['character-ref'],
            {
                sourceHistoryId: null,
                sourceLineageAction: null,
            },
        );
    });

    it('passes branch-preserving source overrides into editor queued batch submissions', async () => {
        props.editorContextSnapshot = {
            ...buildEditorContextSnapshot(),
            sourceHistoryId: 'older-turn',
            sourceLineageAction: 'branch',
        };

        renderHook();

        await act(async () => {
            await latestHook?.handleEditorQueueBatch(
                'Editor queued branch prompt',
                'data:image/png;base64,editor',
                3,
                '2K',
                'Editor Edit',
                ['object-ref'],
                ['character-ref'],
                '16:9',
            );
        });

        expect(props.queueBatchJobFromEditor).toHaveBeenCalledWith({
            prompt: 'Editor queued branch prompt',
            editingInput: 'data:image/png;base64,editor',
            batchSize: 3,
            imageSize: '2K',
            aspectRatio: '16:9',
            objectImageInputs: ['object-ref'],
            characterImageInputs: ['character-ref'],
            generationMode: 'Editor Edit',
            sourceOverride: {
                sourceHistoryId: 'older-turn',
                sourceLineageAction: 'branch',
            },
        });
    });

    it('preserves explicit null editor lineage overrides when queueing from upload-only sources', async () => {
        props.editorContextSnapshot = {
            ...buildEditorContextSnapshot(),
            sourceHistoryId: null,
            sourceLineageAction: null,
        };

        renderHook();

        await act(async () => {
            await latestHook?.handleEditorQueueBatch(
                'Editor upload queue prompt',
                'data:image/png;base64,editor',
                2,
                '2K',
                'Editor Edit',
                ['object-ref'],
                ['character-ref'],
                '16:9',
            );
        });

        expect(props.queueBatchJobFromEditor).toHaveBeenCalledWith({
            prompt: 'Editor upload queue prompt',
            editingInput: 'data:image/png;base64,editor',
            batchSize: 2,
            imageSize: '2K',
            aspectRatio: '16:9',
            objectImageInputs: ['object-ref'],
            characterImageInputs: ['character-ref'],
            generationMode: 'Editor Edit',
            sourceOverride: {
                sourceHistoryId: null,
                sourceLineageAction: null,
            },
        });
    });
});
