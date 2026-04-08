/** @vitest-environment jsdom */

import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GeneratedImage } from '../types';
import {
    resolveViewerStageSourceSyncArgs,
    useHistorySourceOrchestration,
} from '../hooks/useHistorySourceOrchestration';
import { EMPTY_WORKSPACE_CONVERSATION_STATE } from '../utils/conversationState';
import { EMPTY_WORKSPACE_SESSION } from '../utils/workspacePersistence';

const { loadFullImageMock, persistHistoryThumbnailMock } = vi.hoisted(() => ({
    loadFullImageMock: vi.fn(),
    persistHistoryThumbnailMock: vi.fn(),
}));

vi.mock('../utils/imageSaveUtils', () => ({
    loadFullImage: loadFullImageMock,
    persistHistoryThumbnail: persistHistoryThumbnailMock,
}));

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

const createHistoryLookup = (history: GeneratedImage[]) => (historyId?: string | null) =>
    history.find((item) => item.id === historyId) || null;

describe('resolveViewerStageSourceSyncArgs', () => {
    it('preserves an existing diverged stage source instead of overwriting it from selected history', () => {
        const stageTurn = buildTurn({
            id: 'stage-turn',
            url: 'https://example.com/stage.png',
            lineageAction: 'root',
        });
        const selectedTurn = buildTurn({
            id: 'selected-turn',
            url: 'https://example.com/selected.png',
            parentHistoryId: 'stage-turn',
            rootHistoryId: 'stage-turn',
            sourceHistoryId: 'stage-turn',
            lineageAction: 'continue',
        });
        const result = resolveViewerStageSourceSyncArgs({
            currentViewerImage: stageTurn.url,
            selectedHistoryId: selectedTurn.id,
            currentStageSourceHistoryId: stageTurn.id,
            currentStageLineageAction: 'reopen',
            selectedHistoryLineageAction: 'continue',
            getHistoryTurnById: createHistoryLookup([stageTurn, selectedTurn]),
        });

        expect(result).toEqual({
            origin: 'history',
            url: stageTurn.url,
            savedFilename: undefined,
            sourceHistoryId: stageTurn.id,
            lineageAction: 'reopen',
        });
    });

    it('adopts the selected history turn when the visible viewer image already matches that selection', () => {
        const selectedTurn = buildTurn({
            id: 'selected-turn',
            url: 'https://example.com/selected.png',
            lineageAction: 'continue',
        });
        const result = resolveViewerStageSourceSyncArgs({
            currentViewerImage: selectedTurn.url,
            selectedHistoryId: selectedTurn.id,
            currentStageSourceHistoryId: null,
            currentStageLineageAction: undefined,
            selectedHistoryLineageAction: 'continue',
            getHistoryTurnById: createHistoryLookup([selectedTurn]),
        });

        expect(result).toEqual({
            origin: 'history',
            url: selectedTurn.url,
            savedFilename: undefined,
            sourceHistoryId: selectedTurn.id,
            lineageAction: 'continue',
        });
    });
});

describe('useHistorySourceOrchestration', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        loadFullImageMock.mockReset();
        persistHistoryThumbnailMock.mockReset();
        loadFullImageMock.mockResolvedValue(null);
        persistHistoryThumbnailMock.mockResolvedValue({ url: 'data:image/jpeg;base64,thumb' });
    });

    afterEach(() => {
        root.unmount();
        container.remove();
    });

    const renderHook = (
        item: GeneratedImage,
        overrides: Partial<Parameters<typeof useHistorySourceOrchestration>[0]> = {},
    ) => {
        const applySelectedResultArtifacts = vi.fn();
        const promoteResultArtifactsToSession = vi.fn();
        const setConversationState = vi.fn();
        const setBranchContinuationSourceByBranchOriginId = vi.fn();
        const clearActivePickerSheet = vi.fn();
        const upsertViewerStageSource = vi.fn();
        const setHistory = vi.fn();
        let handle: ReturnType<typeof useHistorySourceOrchestration> | null = null;
        let historyState = [item];

        const TestComponent = () => {
            handle = useHistorySourceOrchestration({
                generatedImageUrls: [],
                selectedImageIndex: 0,
                selectedHistoryId: null,
                isGenerating: false,
                currentStageSourceHistoryId: null,
                currentStageLineageAction: undefined,
                workspaceSession: {
                    ...EMPTY_WORKSPACE_SESSION,
                    source: 'history',
                    sourceHistoryId: 'active-turn',
                    sourceLineageAction: 'continue',
                },
                conversationState: EMPTY_WORKSPACE_CONVERSATION_STATE,
                branchOriginIdByTurnId: {
                    [item.id]: 'root-turn',
                    'active-turn': 'active-turn',
                },
                handleApplyImportedWorkspaceSnapshot: vi.fn(),
                getHistoryTurnById: createHistoryLookup(historyState),
                handleClearResults: vi.fn(),
                resetSelectedOutputState: vi.fn(),
                resetWorkspaceSession: vi.fn(),
                clearAssetRoles: vi.fn(),
                buildResultArtifacts: (historyItem) => ({
                    text: historyItem.text || null,
                    thoughts: historyItem.thoughts || null,
                    grounding: historyItem.grounding || null,
                    metadata: historyItem.metadata || null,
                    sessionHints: historyItem.sessionHints || null,
                    historyId: historyItem.id || null,
                }),
                applySelectedResultArtifacts,
                promoteResultArtifactsToSession,
                setPendingProvenanceContext: vi.fn(),
                setConversationState,
                setBranchContinuationSourceByBranchOriginId,
                setHistory: (updater) => {
                    setHistory(updater);
                    historyState = typeof updater === 'function' ? updater(historyState) : updater;
                },
                setEditingImageSource: vi.fn(),
                setGeneratedImageUrls: vi.fn(),
                setSelectedImageIndex: vi.fn(),
                setSelectedHistoryId: vi.fn(),
                setError: vi.fn(),
                setLogs: vi.fn(),
                setIsGenerating: vi.fn(),
                upsertViewerStageSource,
                addLog: vi.fn(),
                showNotification: vi.fn(),
                t: (key: string) => key,
                clearActivePickerSheet,
                ...overrides,
            });

            return null;
        };

        flushSync(() => {
            root.render(React.createElement(TestComponent));
        });

        return {
            handle: handle!,
            applySelectedResultArtifacts,
            promoteResultArtifactsToSession,
            setConversationState,
            setBranchContinuationSourceByBranchOriginId,
            clearActivePickerSheet,
            upsertViewerStageSource,
            setHistory,
            getHistoryState: () => historyState,
        };
    };

    it('keeps passive history open scoped to stage/view state', () => {
        const historyTurn = buildTurn({
            id: 'history-turn',
            text: 'Viewed result',
            lineageAction: 'continue',
        });
        const {
            handle,
            applySelectedResultArtifacts,
            promoteResultArtifactsToSession,
            setConversationState,
            setBranchContinuationSourceByBranchOriginId,
            upsertViewerStageSource,
        } = renderHook(historyTurn);

        flushSync(() => {
            handle.handleHistorySelect(historyTurn);
        });

        expect(applySelectedResultArtifacts).toHaveBeenCalledWith(
            expect.objectContaining({
                historyId: historyTurn.id,
                text: 'Viewed result',
            }),
        );
        expect(promoteResultArtifactsToSession).not.toHaveBeenCalled();
        expect(setConversationState).not.toHaveBeenCalled();
        expect(setBranchContinuationSourceByBranchOriginId).not.toHaveBeenCalled();
        expect(upsertViewerStageSource).toHaveBeenCalledWith(
            expect.objectContaining({
                sourceHistoryId: historyTurn.id,
                lineageAction: 'reopen',
            }),
        );
    });

    it('promotes continue as the active continuation source without using passive-open semantics', () => {
        const historyTurn = buildTurn({
            id: 'history-turn',
            text: 'Continue result',
            lineageAction: 'continue',
        });
        const {
            handle,
            promoteResultArtifactsToSession,
            setConversationState,
            setBranchContinuationSourceByBranchOriginId,
            clearActivePickerSheet,
        } = renderHook(historyTurn);

        flushSync(() => {
            handle.handleContinueFromHistoryTurn(historyTurn);
        });

        expect(promoteResultArtifactsToSession).toHaveBeenCalledWith(
            expect.objectContaining({ historyId: historyTurn.id }),
            'history',
            expect.objectContaining({
                sessionSourceHistoryId: historyTurn.id,
                sourceLineageAction: 'continue',
            }),
        );
        expect(setConversationState).toHaveBeenCalledTimes(1);
        expect(setBranchContinuationSourceByBranchOriginId).toHaveBeenCalledTimes(1);
        expect(clearActivePickerSheet).toHaveBeenCalledTimes(1);
    });

    it('keeps branch intent explicit without rewriting continuation via passive-open state', () => {
        const historyTurn = buildTurn({
            id: 'history-turn',
            text: 'Branch source',
            lineageAction: 'continue',
        });
        const {
            handle,
            promoteResultArtifactsToSession,
            setConversationState,
            setBranchContinuationSourceByBranchOriginId,
        } = renderHook(historyTurn);

        flushSync(() => {
            handle.handleBranchFromHistoryTurn(historyTurn);
        });

        expect(promoteResultArtifactsToSession).toHaveBeenCalledWith(
            expect.objectContaining({ historyId: historyTurn.id }),
            'history',
            expect.objectContaining({
                sessionSourceHistoryId: historyTurn.id,
                sourceLineageAction: 'branch',
            }),
        );
        expect(setConversationState).toHaveBeenCalledTimes(1);
        expect(setBranchContinuationSourceByBranchOriginId).not.toHaveBeenCalled();
    });

    it('backfills a thumbnail in the background after reopening a legacy file-backed turn without preview media', async () => {
        const legacyTurn = buildTurn({
            id: 'legacy-turn',
            url: '',
            savedFilename: 'legacy-turn.png',
            prompt: 'Legacy restore turn',
        });

        loadFullImageMock.mockResolvedValue('data:image/png;base64,FULL');
        persistHistoryThumbnailMock.mockResolvedValue({
            url: '/api/load-image?filename=legacy-turn-thumb.jpg',
            thumbnailSavedFilename: 'legacy-turn-thumb.jpg',
        });

        const { handle, setHistory, getHistoryState } = renderHook(legacyTurn);

        flushSync(() => {
            handle.handleHistorySelect(legacyTurn);
        });

        await Promise.resolve();
        await Promise.resolve();

        expect(loadFullImageMock).toHaveBeenCalledWith('legacy-turn.png');
        expect(persistHistoryThumbnailMock).toHaveBeenCalledWith(
            'data:image/png;base64,FULL',
            'gemini-3.1-flash-image-preview-history',
            'legacy-turn.png',
        );
        expect(setHistory).toHaveBeenCalledTimes(1);
        expect(getHistoryState()[0]).toEqual(
            expect.objectContaining({
                id: 'legacy-turn',
                url: '/api/load-image?filename=legacy-turn-thumb.jpg',
                thumbnailSavedFilename: 'legacy-turn-thumb.jpg',
            }),
        );
    });
});
