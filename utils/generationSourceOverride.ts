import { ContinuationLineageAction, GeneratedImage, TurnLineageAction } from '../types';

export type SelectionFirstSourceOverride = {
    sourceHistoryId: string | null;
    sourceLineageAction?: ContinuationLineageAction | null;
};

type ResolveSelectionFirstSourceOverrideArgs = {
    sourceHistoryId?: string | null;
    history: GeneratedImage[];
    branchOriginIdByTurnId: Record<string, string>;
    workspaceSessionSourceHistoryId?: string | null;
    workspaceSessionSourceLineageAction?: ContinuationLineageAction | null;
};

export const resolveSelectionFirstLineageAction = ({
    sourceHistoryId,
    history,
    branchOriginIdByTurnId,
}: {
    sourceHistoryId: string;
    history: GeneratedImage[];
    branchOriginIdByTurnId: Record<string, string>;
}): ContinuationLineageAction => {
    const branchOriginId = branchOriginIdByTurnId[sourceHistoryId] || sourceHistoryId;
    let latestBranchTurn: GeneratedImage | null = null;

    for (const item of history) {
        if (item.status !== 'success') {
            continue;
        }

        const itemBranchOriginId = branchOriginIdByTurnId[item.id] || item.id;
        if (itemBranchOriginId !== branchOriginId) {
            continue;
        }

        if (!latestBranchTurn || item.createdAt > latestBranchTurn.createdAt) {
            latestBranchTurn = item;
        }
    }

    return latestBranchTurn?.id === sourceHistoryId ? 'continue' : 'branch';
};

export const resolveSelectionFirstSourceOverride = ({
    sourceHistoryId,
    history,
    branchOriginIdByTurnId,
    workspaceSessionSourceHistoryId,
    workspaceSessionSourceLineageAction,
}: ResolveSelectionFirstSourceOverrideArgs): SelectionFirstSourceOverride => {
    const resolvedSourceHistoryId = sourceHistoryId ?? null;

    if (!resolvedSourceHistoryId) {
        return {
            sourceHistoryId: null,
            sourceLineageAction: null,
        };
    }

    if (workspaceSessionSourceHistoryId === resolvedSourceHistoryId && workspaceSessionSourceLineageAction) {
        return {
            sourceHistoryId: resolvedSourceHistoryId,
            sourceLineageAction: workspaceSessionSourceLineageAction,
        };
    }

    return {
        sourceHistoryId: resolvedSourceHistoryId,
        sourceLineageAction: resolveSelectionFirstLineageAction({
            sourceHistoryId: resolvedSourceHistoryId,
            history,
            branchOriginIdByTurnId,
        }),
    };
};

export const resolveCurrentStageSelectionFirstSourceOverride = ({
    sourceHistoryId,
    currentStageLineageAction,
    history,
    branchOriginIdByTurnId,
    workspaceSessionSourceHistoryId,
    workspaceSessionSourceLineageAction,
}: ResolveSelectionFirstSourceOverrideArgs & {
    currentStageLineageAction?: TurnLineageAction | null;
}): SelectionFirstSourceOverride => {
    const linkedStageSourceHistoryId = sourceHistoryId ?? null;

    if (!linkedStageSourceHistoryId) {
        return {
            sourceHistoryId: null,
            sourceLineageAction: null,
        };
    }

    const shouldPreferStageSource =
        currentStageLineageAction === 'branch' ||
        (currentStageLineageAction === 'continue' && workspaceSessionSourceHistoryId === linkedStageSourceHistoryId);

    return resolveSelectionFirstSourceOverride({
        sourceHistoryId: shouldPreferStageSource
            ? linkedStageSourceHistoryId
            : (workspaceSessionSourceHistoryId ?? linkedStageSourceHistoryId),
        history,
        branchOriginIdByTurnId,
        workspaceSessionSourceHistoryId,
        workspaceSessionSourceLineageAction,
    });
};