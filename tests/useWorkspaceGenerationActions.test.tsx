/** @vitest-environment jsdom */

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorkspaceGenerationActions } from '../hooks/useWorkspaceGenerationActions';
import { GeneratedImage } from '../types';

type HookHandle = ReturnType<typeof useWorkspaceGenerationActions>;

const buildTurn = (overrides: Partial<GeneratedImage> = {}): GeneratedImage => ({
    id: 'turn-1',
    url: 'https://example.com/image.png',
    prompt: 'Prompt',
    aspectRatio: '1:1',
    size: '1K',
    style: 'None',
    model: 'gemini-3.1-flash-image-preview',
    createdAt: 1,
    status: 'success',
    ...overrides,
});

describe('useWorkspaceGenerationActions', () => {
    let container: HTMLDivElement;
    let root: Root;
    let latestHook: HookHandle | null;
    let props: Parameters<typeof useWorkspaceGenerationActions>[0];

    const renderHook = () => {
        function Harness() {
            latestHook = useWorkspaceGenerationActions(props);
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

        props = {
            abortControllerRef: { current: null },
            prompt: 'Refine the staged image',
            aspectRatio: '1:1',
            imageSize: '1K',
            imageStyle: 'None',
            imageModel: 'gemini-3.1-flash-image-preview',
            history: [],
            branchOriginIdByTurnId: {},
            workspaceSessionSourceHistoryId: null,
            workspaceSessionSourceLineageAction: null,
            objectImages: ['object-ref'],
            characterImages: ['character-ref'],
            currentStageAsset: null,
            clearPendingProvenanceContext: vi.fn(),
            primePendingProvenanceContinuation: vi.fn(),
            resetSelectedOutputState: vi.fn(),
            performGeneration: vi.fn(),
            onPrepareGenerate: vi.fn(),
            setIsGenerating: vi.fn(),
            addLog: vi.fn(),
            showNotification: vi.fn(),
            t: (key: string) => key,
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

    it('treats upload-only staged follow-up edits as explicit fresh roots', () => {
        props.currentStageAsset = {
            id: 'upload-stage',
            url: 'data:image/png;base64,UPLOAD',
            role: 'stage-source',
            origin: 'upload',
            createdAt: 1,
        };
        props.history = [
            buildTurn({
                id: 'stale-turn',
                rootHistoryId: 'stale-turn',
                lineageAction: 'root',
            }),
        ];
        props.branchOriginIdByTurnId = {
            'stale-turn': 'stale-turn',
        };
        props.workspaceSessionSourceHistoryId = 'stale-turn';
        props.workspaceSessionSourceLineageAction = 'branch';

        renderHook();

        act(() => {
            latestHook?.handleFollowUpGenerate();
        });

        expect(props.primePendingProvenanceContinuation).toHaveBeenCalledWith(null, {
            useExplicitSource: true,
        });
        expect(props.performGeneration).toHaveBeenCalledWith(
            'Refine the staged image',
            '1:1',
            '1K',
            'None',
            'gemini-3.1-flash-image-preview',
            'data:image/png;base64,UPLOAD',
            undefined,
            undefined,
            'Follow-up Edit',
            ['object-ref'],
            ['character-ref'],
            {
                sourceHistoryId: null,
                sourceLineageAction: null,
            },
        );
    });

    it('preserves an explicit pending branch source for linked staged follow-up edits', () => {
        props.currentStageAsset = {
            id: 'branch-stage',
            url: 'data:image/png;base64,BRANCH',
            role: 'stage-source',
            origin: 'history',
            createdAt: 1,
            sourceHistoryId: 'branch-source-turn',
            lineageAction: 'reopen',
        };
        props.history = [
            buildTurn({
                id: 'branch-source-turn',
                rootHistoryId: 'root-turn',
                lineageAction: 'continue',
            }),
        ];
        props.branchOriginIdByTurnId = {
            'branch-source-turn': 'root-turn',
        };
        props.workspaceSessionSourceHistoryId = 'branch-source-turn';
        props.workspaceSessionSourceLineageAction = 'branch';

        renderHook();

        act(() => {
            latestHook?.handleFollowUpGenerate();
        });

        expect(props.primePendingProvenanceContinuation).toHaveBeenCalledWith('branch-source-turn', {
            useExplicitSource: true,
        });
        expect(props.performGeneration).toHaveBeenCalledWith(
            'Refine the staged image',
            '1:1',
            '1K',
            'None',
            'gemini-3.1-flash-image-preview',
            'data:image/png;base64,BRANCH',
            undefined,
            undefined,
            'Follow-up Edit',
            ['object-ref'],
            ['character-ref'],
            {
                sourceHistoryId: 'branch-source-turn',
                sourceLineageAction: 'branch',
            },
        );
    });

    it('prefers a branch-marked current stage source over a stale workspace continuation source', () => {
        props.currentStageAsset = {
            id: 'branch-stage',
            url: 'data:image/png;base64,BRANCH',
            role: 'stage-source',
            origin: 'history',
            createdAt: 3,
            sourceHistoryId: 'older-turn',
            lineageAction: 'branch',
        };
        props.history = [
            buildTurn({
                id: 'older-turn',
                rootHistoryId: 'root-turn',
                lineageAction: 'continue',
                createdAt: 1,
            }),
            buildTurn({
                id: 'latest-turn',
                parentHistoryId: 'older-turn',
                rootHistoryId: 'root-turn',
                sourceHistoryId: 'older-turn',
                lineageAction: 'continue',
                createdAt: 2,
            }),
        ];
        props.branchOriginIdByTurnId = {
            'older-turn': 'root-turn',
            'latest-turn': 'root-turn',
        };
        props.workspaceSessionSourceHistoryId = 'latest-turn';
        props.workspaceSessionSourceLineageAction = 'continue';

        renderHook();

        act(() => {
            latestHook?.handleFollowUpGenerate();
        });

        expect(props.primePendingProvenanceContinuation).toHaveBeenCalledWith('older-turn', {
            useExplicitSource: true,
        });
        expect(props.performGeneration).toHaveBeenCalledWith(
            'Refine the staged image',
            '1:1',
            '1K',
            'None',
            'gemini-3.1-flash-image-preview',
            'data:image/png;base64,BRANCH',
            undefined,
            undefined,
            'Follow-up Edit',
            ['object-ref'],
            ['character-ref'],
            {
                sourceHistoryId: 'older-turn',
                sourceLineageAction: 'branch',
            },
        );
    });
});