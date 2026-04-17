import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { GeneratedImage } from '../types';
import { useWorkspaceLineageSelectors } from '../hooks/useWorkspaceLineageSelectors';

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

describe('useWorkspaceLineageSelectors', () => {
    it('keeps stage-source ownership exact when the stage asset is cleared but a history turn stays selected', () => {
        const successfulTurn = buildTurn({
            id: 'ok-turn',
            rootHistoryId: 'ok-turn',
            lineageAction: 'root',
            createdAt: 1,
        });
        const failedTurn = buildTurn({
            id: 'failed-turn',
            url: '',
            status: 'failed',
            error: 'Synthetic failure',
            rootHistoryId: 'ok-turn',
            parentHistoryId: 'ok-turn',
            sourceHistoryId: 'ok-turn',
            lineageAction: 'continue',
            createdAt: 2,
        });
        const history = [failedTurn, successfulTurn];
        const getHistoryTurnById = (historyId?: string | null) => history.find((item) => item.id === historyId) || null;
        let result: ReturnType<typeof useWorkspaceLineageSelectors> | null = null;

        const TestView = () => {
            result = useWorkspaceLineageSelectors({
                history,
                branchNameOverrides: {},
                branchContinuationSourceByBranchOriginId: {},
                workspaceSessionSourceHistoryId: successfulTurn.id,
                workspaceSessionSourceLineageAction: 'continue',
                selectedHistoryId: failedTurn.id,
                currentStageAssetSourceHistoryId: null,
                conversationId: null,
                conversationBranchOriginId: null,
                conversationActiveSourceHistoryId: null,
                conversationTurnIds: [],
                getHistoryTurnById,
                getShortTurnId: (historyId?: string | null) => historyId?.slice(0, 8) || 'none',
            });

            return null;
        };

        renderToStaticMarkup(<TestView />);

        expect(result?.selectedItemModel?.historyId).toBe(failedTurn.id);
        expect(result?.selectedItemModel?.isStageSource).toBe(false);
        expect(result?.currentStageSourceHistoryId).toBeNull();
        expect(result?.currentStageSourceTurn).toBeNull();
    });

    it('keeps the active branch tied to the session continuation source while passive viewing changes only selection/stage state', () => {
        const rootTurn = buildTurn({
            id: 'root-turn',
            rootHistoryId: 'root-turn',
            lineageAction: 'root',
            createdAt: 1,
        });
        const mainTurn = buildTurn({
            id: 'main-turn',
            parentHistoryId: 'root-turn',
            rootHistoryId: 'root-turn',
            sourceHistoryId: 'root-turn',
            lineageAction: 'continue',
            createdAt: 2,
        });
        const branchTurn = buildTurn({
            id: 'branch-turn',
            parentHistoryId: 'main-turn',
            rootHistoryId: 'root-turn',
            sourceHistoryId: 'main-turn',
            lineageAction: 'branch',
            createdAt: 3,
        });
        const history = [branchTurn, mainTurn, rootTurn];
        const getHistoryTurnById = (historyId?: string | null) => history.find((item) => item.id === historyId) || null;
        let result: ReturnType<typeof useWorkspaceLineageSelectors> | null = null;

        const TestView = () => {
            result = useWorkspaceLineageSelectors({
                history,
                branchNameOverrides: {},
                branchContinuationSourceByBranchOriginId: { 'root-turn': 'main-turn' },
                workspaceSessionSourceHistoryId: 'main-turn',
                workspaceSessionSourceLineageAction: 'continue',
                selectedHistoryId: 'branch-turn',
                currentStageAssetSourceHistoryId: 'branch-turn',
                conversationId: null,
                conversationBranchOriginId: null,
                conversationActiveSourceHistoryId: null,
                conversationTurnIds: [],
                getHistoryTurnById,
                getShortTurnId: (historyId?: string | null) => historyId?.slice(0, 8) || 'none',
            });

            return null;
        };

        renderToStaticMarkup(<TestView />);

        expect(result?.activeBranchSummary?.branchOriginId).toBe('root-turn');
        expect(result?.selectedItemModel?.branchOriginId).toBe('branch-turn');
        expect(result?.currentStageBranchSummary?.branchOriginId).toBe('branch-turn');
    });
});
