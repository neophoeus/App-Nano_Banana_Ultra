import { useCallback } from 'react';
import {
    GeneratedImage,
    GenerationLineageContext,
    StageAsset,
    WorkspaceConversationState,
    WorkspaceSessionState,
} from '../types';
import { buildConversationRequestContext, resolveConversationSelectionState } from '../utils/conversationState';

type UseWorkspaceGenerationContextArgs = {
    currentStageAsset: StageAsset | null;
    workspaceSession: WorkspaceSessionState;
    history: GeneratedImage[];
    conversationState: WorkspaceConversationState;
    branchOriginIdByTurnId: Record<string, string>;
    getHistoryTurnById: (historyId?: string | null) => GeneratedImage | null;
};

export function useWorkspaceGenerationContext({
    currentStageAsset,
    workspaceSession,
    history,
    conversationState,
    branchOriginIdByTurnId,
    getHistoryTurnById,
}: UseWorkspaceGenerationContextArgs) {
    const getGenerationLineageContext = useCallback(
        ({ mode, editingInput }: { mode: string; editingInput?: string }) => {
            const sourceHistoryId =
                currentStageAsset?.sourceHistoryId ??
                workspaceSession.sourceHistoryId ??
                null;
            const sourceTurn = getHistoryTurnById(sourceHistoryId);
            const inheritedAction = currentStageAsset?.lineageAction;

            if (!sourceHistoryId) {
                return {
                    parentHistoryId: null,
                    rootHistoryId: null,
                    sourceHistoryId: null,
                    lineageAction: 'root',
                    lineageDepth: 0,
                } satisfies GenerationLineageContext;
            }

            let lineageAction: GenerationLineageContext['lineageAction'];
            if (editingInput || mode.includes('Inpaint') || mode.includes('Retouch') || mode.includes('Editor')) {
                lineageAction = 'editor-follow-up';
            } else if (inheritedAction === 'branch') {
                lineageAction = 'branch';
            } else {
                lineageAction = 'continue';
            }

            return {
                parentHistoryId: sourceHistoryId,
                rootHistoryId: sourceTurn?.rootHistoryId || sourceTurn?.id || sourceHistoryId,
                sourceHistoryId,
                lineageAction,
                lineageDepth: (sourceTurn?.lineageDepth || 0) + 1,
            } satisfies GenerationLineageContext;
        },
        [
            currentStageAsset?.lineageAction,
            currentStageAsset?.sourceHistoryId,
            getHistoryTurnById,
            workspaceSession.sourceHistoryId,
        ],
    );

    const getConversationRequestContext = useCallback(
        ({ batchSize }: { batchSize: number }) => {
            if (batchSize > 1) {
                return null;
            }

            const activeSourceHistoryId =
                currentStageAsset?.sourceHistoryId ??
                workspaceSession.sourceHistoryId ??
                null;
            if (!activeSourceHistoryId) {
                return null;
            }

            const conversationSelection = resolveConversationSelectionState(conversationState, {
                selectedHistoryId: activeSourceHistoryId,
                preferredBranchOriginId: branchOriginIdByTurnId[activeSourceHistoryId] || activeSourceHistoryId,
                conversationBranchOriginId: workspaceSession.conversationBranchOriginId,
            });
            const branchOriginId =
                conversationSelection.branchOriginId ||
                branchOriginIdByTurnId[activeSourceHistoryId] ||
                activeSourceHistoryId;

            return buildConversationRequestContext({
                activeSourceHistoryId,
                branchOriginId,
                conversationState,
                history,
            });
        },
        [
            branchOriginIdByTurnId,
            conversationState,
            currentStageAsset?.sourceHistoryId,
            history,
            workspaceSession.conversationBranchOriginId,
            workspaceSession.sourceHistoryId,
        ],
    );

    return {
        getGenerationLineageContext,
        getConversationRequestContext,
    };
}
