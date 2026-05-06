import { useCallback } from 'react';
import {
    ContinuationLineageAction,
    GeneratedImage,
    GenerationLineageContext,
    StageAsset,
    StickySendIntent,
    WorkspaceConversationState,
    WorkspaceSessionState,
} from '../types';
import { buildConversationRequestContext, resolveConversationSelectionState } from '../utils/conversationState';
import { isEditingGenerationMode } from '../utils/generationMode';
import { resolveSelectionFirstSourceOverride } from '../utils/generationSourceOverride';

type GenerationSourceOverride = {
    sourceHistoryId: string | null;
    sourceLineageAction?: ContinuationLineageAction | null;
};

type UseWorkspaceGenerationContextArgs = {
    currentStageAsset: StageAsset | null;
    workspaceSession: WorkspaceSessionState;
    history: GeneratedImage[];
    conversationState: WorkspaceConversationState;
    stickySendIntent: StickySendIntent;
    branchOriginIdByTurnId: Record<string, string>;
    getHistoryTurnById: (historyId?: string | null) => GeneratedImage | null;
};

export function useWorkspaceGenerationContext({
    currentStageAsset,
    workspaceSession,
    history,
    conversationState,
    stickySendIntent,
    branchOriginIdByTurnId,
    getHistoryTurnById,
}: UseWorkspaceGenerationContextArgs) {
    const getGenerationLineageContext = useCallback(
        ({
            mode,
            editingInput,
            sourceOverride,
        }: {
            mode: string;
            editingInput?: string;
            sourceOverride?: GenerationSourceOverride | null;
        }) => {
            const hasSourceOverride = sourceOverride !== undefined;
            const isEditingRequest = isEditingGenerationMode(mode, editingInput);
            const sourceHistoryId = hasSourceOverride
                ? (sourceOverride?.sourceHistoryId ?? null)
                : isEditingRequest
                  ? (currentStageAsset?.sourceHistoryId ?? workspaceSession.sourceHistoryId ?? null)
                  : (workspaceSession.sourceHistoryId ?? null);
            const sourceTurn = getHistoryTurnById(sourceHistoryId);
            const selectionFirstSourceOverride =
                !hasSourceOverride && sourceHistoryId
                    ? resolveSelectionFirstSourceOverride({
                          sourceHistoryId,
                          history,
                          branchOriginIdByTurnId,
                          workspaceSessionSourceHistoryId: workspaceSession.sourceHistoryId,
                          workspaceSessionSourceLineageAction: workspaceSession.sourceLineageAction,
                      })
                    : null;

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
            if (hasSourceOverride) {
                lineageAction = sourceOverride?.sourceLineageAction === 'branch' ? 'branch' : 'continue';
            } else if (selectionFirstSourceOverride?.sourceLineageAction === 'branch') {
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
            branchOriginIdByTurnId,
            currentStageAsset?.sourceHistoryId,
            getHistoryTurnById,
            history,
            workspaceSession.sourceLineageAction,
            workspaceSession.sourceHistoryId,
        ],
    );

    const getConversationRequestContext = useCallback(
        ({
            batchSize,
            sourceOverride,
        }: {
            mode?: string;
            editingInput?: string;
            batchSize: number;
            sourceOverride?: GenerationSourceOverride | null;
        }) => {
            if (stickySendIntent !== 'memory') {
                return null;
            }

            if (batchSize > 1) {
                return null;
            }

            const hasSourceOverride = sourceOverride !== undefined;
            const activeSourceHistoryId = hasSourceOverride
                ? (sourceOverride?.sourceHistoryId ?? null)
                : (workspaceSession.sourceHistoryId ?? null);
            if (!activeSourceHistoryId) {
                return null;
            }

            const resolvedSourceLineageAction = hasSourceOverride
                ? (sourceOverride?.sourceLineageAction ?? null)
                : (workspaceSession.sourceLineageAction ?? null);
            const preferredBranchOriginId =
                resolvedSourceLineageAction === 'branch'
                    ? activeSourceHistoryId
                    : branchOriginIdByTurnId[activeSourceHistoryId] || activeSourceHistoryId;

            const conversationSelection = resolveConversationSelectionState(conversationState, {
                selectedHistoryId: activeSourceHistoryId,
                preferredBranchOriginId,
                conversationBranchOriginId: hasSourceOverride
                    ? preferredBranchOriginId
                    : workspaceSession.conversationBranchOriginId,
            });
            const branchOriginId = conversationSelection.branchOriginId || preferredBranchOriginId;

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
            history,
            stickySendIntent,
            workspaceSession.conversationBranchOriginId,
            workspaceSession.sourceLineageAction,
            workspaceSession.sourceHistoryId,
        ],
    );

    return {
        getGenerationLineageContext,
        getConversationRequestContext,
    };
}
