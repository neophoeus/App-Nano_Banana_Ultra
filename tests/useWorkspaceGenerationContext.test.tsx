import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { GeneratedImage, StageAsset, WorkspaceConversationState } from '../types';
import { useWorkspaceGenerationContext } from '../hooks/useWorkspaceGenerationContext';
import { EMPTY_WORKSPACE_CONVERSATION_STATE } from '../utils/conversationState';
import { EMPTY_WORKSPACE_SESSION } from '../utils/workspacePersistence';

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

const buildStageAsset = (overrides: Partial<StageAsset> = {}): StageAsset => ({
    id: 'stage-asset',
    url: 'https://example.com/stage.png',
    role: 'stage-source',
    origin: 'history',
    createdAt: 1,
    ...overrides,
});

const createHistoryLookup = (history: GeneratedImage[]) => (historyId?: string | null) =>
    history.find((item) => item.id === historyId) || null;

describe('useWorkspaceGenerationContext', () => {
    it('uses the active continuation source instead of a passively reopened stage turn for normal generation', () => {
        const continuationTurn = buildTurn({
            id: 'continuation-turn',
            rootHistoryId: 'continuation-turn',
            lineageAction: 'root',
            createdAt: 1,
        });
        const viewedTurn = buildTurn({
            id: 'viewed-turn',
            parentHistoryId: 'continuation-turn',
            rootHistoryId: 'continuation-turn',
            sourceHistoryId: 'continuation-turn',
            lineageAction: 'continue',
            createdAt: 2,
        });
        const history = [viewedTurn, continuationTurn];
        let lineageContext: ReturnType<
            ReturnType<typeof useWorkspaceGenerationContext>['getGenerationLineageContext']
        > | null = null;

        const TestView = () => {
            const { getGenerationLineageContext } = useWorkspaceGenerationContext({
                currentStageAsset: buildStageAsset({
                    sourceHistoryId: viewedTurn.id,
                    lineageAction: 'reopen',
                }),
                workspaceSession: {
                    ...EMPTY_WORKSPACE_SESSION,
                    source: 'history',
                    sourceHistoryId: continuationTurn.id,
                    sourceLineageAction: 'continue',
                },
                history,
                conversationState: EMPTY_WORKSPACE_CONVERSATION_STATE,
                stickySendIntent: 'independent',
                branchOriginIdByTurnId: {
                    [continuationTurn.id]: continuationTurn.id,
                    [viewedTurn.id]: continuationTurn.id,
                },
                getHistoryTurnById: createHistoryLookup(history),
            });

            lineageContext = getGenerationLineageContext({ mode: 'Text to Image' });
            return null;
        };

        renderToStaticMarkup(<TestView />);

        expect(lineageContext).toMatchObject({
            parentHistoryId: continuationTurn.id,
            sourceHistoryId: continuationTurn.id,
            lineageAction: 'continue',
        });
    });

    it('preserves an explicit pending branch source even when the stage view diverges', () => {
        const branchSourceTurn = buildTurn({
            id: 'branch-source-turn',
            parentHistoryId: 'root-turn',
            rootHistoryId: 'root-turn',
            sourceHistoryId: 'root-turn',
            lineageAction: 'continue',
            createdAt: 2,
        });
        const viewedTurn = buildTurn({
            id: 'viewed-turn',
            parentHistoryId: 'root-turn',
            rootHistoryId: 'root-turn',
            sourceHistoryId: 'root-turn',
            lineageAction: 'continue',
            createdAt: 3,
        });
        const history = [viewedTurn, branchSourceTurn];
        const conversationState: WorkspaceConversationState = {
            byBranchOriginId: {
                [branchSourceTurn.id]: {
                    conversationId: 'conversation-1',
                    branchOriginId: branchSourceTurn.id,
                    activeSourceHistoryId: branchSourceTurn.id,
                    turnIds: [branchSourceTurn.id],
                    startedAt: 1,
                    updatedAt: 2,
                },
            },
        };
        let lineageContext: ReturnType<
            ReturnType<typeof useWorkspaceGenerationContext>['getGenerationLineageContext']
        > | null = null;
        let conversationContext: ReturnType<
            ReturnType<typeof useWorkspaceGenerationContext>['getConversationRequestContext']
        > | null = null;

        const TestView = () => {
            const { getGenerationLineageContext, getConversationRequestContext } = useWorkspaceGenerationContext({
                currentStageAsset: buildStageAsset({
                    sourceHistoryId: viewedTurn.id,
                    lineageAction: 'reopen',
                }),
                workspaceSession: {
                    ...EMPTY_WORKSPACE_SESSION,
                    source: 'history',
                    sourceHistoryId: branchSourceTurn.id,
                    sourceLineageAction: 'branch',
                    conversationBranchOriginId: branchSourceTurn.id,
                },
                history,
                conversationState,
                stickySendIntent: 'memory',
                branchOriginIdByTurnId: {
                    [branchSourceTurn.id]: 'root-turn',
                    [viewedTurn.id]: 'root-turn',
                },
                getHistoryTurnById: createHistoryLookup(history),
            });

            lineageContext = getGenerationLineageContext({ mode: 'Text to Image' });
            conversationContext = getConversationRequestContext({ batchSize: 1 });
            return null;
        };

        renderToStaticMarkup(<TestView />);

        expect(lineageContext).toMatchObject({
            parentHistoryId: branchSourceTurn.id,
            sourceHistoryId: branchSourceTurn.id,
            lineageAction: 'branch',
        });
        expect(conversationContext).toMatchObject({
            branchOriginId: branchSourceTurn.id,
            activeSourceHistoryId: branchSourceTurn.id,
        });
    });

    it('does not build official conversation context when sticky send intent is independent', () => {
        const sourceTurn = buildTurn({
            id: 'source-turn',
            rootHistoryId: 'source-turn',
            lineageAction: 'root',
        });
        const history = [sourceTurn];
        const conversationState: WorkspaceConversationState = {
            byBranchOriginId: {
                [sourceTurn.id]: {
                    conversationId: 'conversation-1',
                    branchOriginId: sourceTurn.id,
                    activeSourceHistoryId: sourceTurn.id,
                    turnIds: [sourceTurn.id],
                    startedAt: 1,
                    updatedAt: 2,
                },
            },
        };
        let conversationContext: ReturnType<
            ReturnType<typeof useWorkspaceGenerationContext>['getConversationRequestContext']
        > | null = null;

        const TestView = () => {
            const { getConversationRequestContext } = useWorkspaceGenerationContext({
                currentStageAsset: buildStageAsset({
                    sourceHistoryId: sourceTurn.id,
                    lineageAction: 'reopen',
                }),
                workspaceSession: {
                    ...EMPTY_WORKSPACE_SESSION,
                    source: 'history',
                    sourceHistoryId: sourceTurn.id,
                    sourceLineageAction: 'continue',
                    conversationBranchOriginId: sourceTurn.id,
                },
                history,
                conversationState,
                stickySendIntent: 'independent',
                branchOriginIdByTurnId: {
                    [sourceTurn.id]: sourceTurn.id,
                },
                getHistoryTurnById: createHistoryLookup(history),
            });

            conversationContext = getConversationRequestContext({ batchSize: 1 });
            return null;
        };

        renderToStaticMarkup(<TestView />);

        expect(conversationContext).toBeNull();
    });

    it('uses selection-first continue lineage for follow-up edits from the latest visible stage turn', () => {
        const continuationTurn = buildTurn({
            id: 'continuation-turn',
            rootHistoryId: 'continuation-turn',
            lineageAction: 'root',
            createdAt: 1,
        });
        const stageTurn = buildTurn({
            id: 'stage-turn',
            parentHistoryId: 'continuation-turn',
            rootHistoryId: 'continuation-turn',
            sourceHistoryId: 'continuation-turn',
            lineageAction: 'continue',
            createdAt: 2,
        });
        const history = [stageTurn, continuationTurn];
        let lineageContext: ReturnType<
            ReturnType<typeof useWorkspaceGenerationContext>['getGenerationLineageContext']
        > | null = null;

        const TestView = () => {
            const { getGenerationLineageContext } = useWorkspaceGenerationContext({
                currentStageAsset: buildStageAsset({
                    sourceHistoryId: stageTurn.id,
                    lineageAction: 'reopen',
                }),
                workspaceSession: {
                    ...EMPTY_WORKSPACE_SESSION,
                    source: 'history',
                    sourceHistoryId: continuationTurn.id,
                    sourceLineageAction: 'branch',
                },
                history,
                conversationState: EMPTY_WORKSPACE_CONVERSATION_STATE,
                stickySendIntent: 'independent',
                branchOriginIdByTurnId: {
                    [continuationTurn.id]: continuationTurn.id,
                    [stageTurn.id]: continuationTurn.id,
                },
                getHistoryTurnById: createHistoryLookup(history),
            });

            lineageContext = getGenerationLineageContext({
                mode: 'Follow-up Edit',
                editingInput: 'https://example.com/stage-edit.png',
            });
            return null;
        };

        renderToStaticMarkup(<TestView />);

        expect(lineageContext).toMatchObject({
            parentHistoryId: stageTurn.id,
            sourceHistoryId: stageTurn.id,
            lineageAction: 'continue',
        });
    });

    it('uses selection-first branch lineage for follow-up edits from an older visible stage turn', () => {
        const rootTurn = buildTurn({
            id: 'root-turn',
            rootHistoryId: 'root-turn',
            lineageAction: 'root',
            createdAt: 1,
        });
        const olderStageTurn = buildTurn({
            id: 'older-stage-turn',
            parentHistoryId: rootTurn.id,
            rootHistoryId: rootTurn.id,
            sourceHistoryId: rootTurn.id,
            lineageAction: 'continue',
            createdAt: 2,
        });
        const latestTurn = buildTurn({
            id: 'latest-turn',
            parentHistoryId: olderStageTurn.id,
            rootHistoryId: rootTurn.id,
            sourceHistoryId: olderStageTurn.id,
            lineageAction: 'continue',
            createdAt: 3,
        });
        const history = [latestTurn, olderStageTurn, rootTurn];
        let lineageContext: ReturnType<
            ReturnType<typeof useWorkspaceGenerationContext>['getGenerationLineageContext']
        > | null = null;

        const TestView = () => {
            const { getGenerationLineageContext } = useWorkspaceGenerationContext({
                currentStageAsset: buildStageAsset({
                    sourceHistoryId: olderStageTurn.id,
                    lineageAction: 'branch',
                }),
                workspaceSession: {
                    ...EMPTY_WORKSPACE_SESSION,
                    source: 'history',
                    sourceHistoryId: latestTurn.id,
                    sourceLineageAction: 'continue',
                },
                history,
                conversationState: EMPTY_WORKSPACE_CONVERSATION_STATE,
                stickySendIntent: 'independent',
                branchOriginIdByTurnId: {
                    [rootTurn.id]: rootTurn.id,
                    [olderStageTurn.id]: rootTurn.id,
                    [latestTurn.id]: rootTurn.id,
                },
                getHistoryTurnById: createHistoryLookup(history),
            });

            lineageContext = getGenerationLineageContext({
                mode: 'Follow-up Edit',
                editingInput: 'https://example.com/older-stage-edit.png',
            });
            return null;
        };

        renderToStaticMarkup(<TestView />);

        expect(lineageContext).toMatchObject({
            parentHistoryId: olderStageTurn.id,
            sourceHistoryId: olderStageTurn.id,
            lineageAction: 'branch',
        });
    });

    it('uses editor source overrides to align branch lineage and conversation context with the selected stage turn', () => {
        const branchSourceTurn = buildTurn({
            id: 'branch-source-turn',
            rootHistoryId: 'root-turn',
            lineageAction: 'continue',
            createdAt: 2,
        });
        const viewedTurn = buildTurn({
            id: 'viewed-turn',
            parentHistoryId: 'root-turn',
            rootHistoryId: 'root-turn',
            sourceHistoryId: 'root-turn',
            lineageAction: 'continue',
            createdAt: 3,
        });
        const history = [viewedTurn, branchSourceTurn];
        const sourceOverride = {
            sourceHistoryId: branchSourceTurn.id,
            sourceLineageAction: 'branch' as const,
        };
        const conversationState: WorkspaceConversationState = {
            byBranchOriginId: {
                [branchSourceTurn.id]: {
                    conversationId: 'conversation-branch',
                    branchOriginId: branchSourceTurn.id,
                    activeSourceHistoryId: branchSourceTurn.id,
                    turnIds: [branchSourceTurn.id],
                    startedAt: 1,
                    updatedAt: 2,
                },
            },
        };
        let lineageContext: ReturnType<
            ReturnType<typeof useWorkspaceGenerationContext>['getGenerationLineageContext']
        > | null = null;
        let conversationContext: ReturnType<
            ReturnType<typeof useWorkspaceGenerationContext>['getConversationRequestContext']
        > | null = null;

        const TestView = () => {
            const { getGenerationLineageContext, getConversationRequestContext } = useWorkspaceGenerationContext({
                currentStageAsset: buildStageAsset({
                    sourceHistoryId: viewedTurn.id,
                    lineageAction: 'reopen',
                }),
                workspaceSession: {
                    ...EMPTY_WORKSPACE_SESSION,
                    source: 'history',
                    sourceHistoryId: 'continuation-turn',
                    sourceLineageAction: 'continue',
                    conversationBranchOriginId: 'root-turn',
                },
                history,
                conversationState,
                stickySendIntent: 'memory',
                branchOriginIdByTurnId: {
                    [branchSourceTurn.id]: 'root-turn',
                    [viewedTurn.id]: 'root-turn',
                },
                getHistoryTurnById: createHistoryLookup(history),
            });

            lineageContext = getGenerationLineageContext({
                mode: 'Editor Edit',
                editingInput: 'data:image/png;base64,EDIT',
                sourceOverride,
            });
            conversationContext = getConversationRequestContext({
                batchSize: 1,
                sourceOverride,
            });
            return null;
        };

        renderToStaticMarkup(<TestView />);

        expect(lineageContext).toMatchObject({
            parentHistoryId: branchSourceTurn.id,
            rootHistoryId: branchSourceTurn.rootHistoryId,
            sourceHistoryId: branchSourceTurn.id,
            lineageAction: 'branch',
        });
        expect(conversationContext).toMatchObject({
            conversationId: 'conversation-branch',
            branchOriginId: branchSourceTurn.id,
            activeSourceHistoryId: branchSourceTurn.id,
        });
    });
});
