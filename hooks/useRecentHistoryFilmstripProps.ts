import { useLayoutEffect, useMemo, useRef } from 'react';
import RecentHistoryFilmstrip from '../components/RecentHistoryFilmstrip';

type RecentHistoryFilmstripProps = React.ComponentProps<typeof RecentHistoryFilmstrip>;

export function useRecentHistoryFilmstripProps({
    recentHistory,
    branchCount,
    activeStageImageUrl,
    selectedHistoryId,
    currentStageSourceHistoryId,
    currentSourceHistoryId,
    branchOriginIdByTurnId,
    branchLabelByTurnId,
    branchSummaryByOriginId,
    activeBranchOriginId,
    onClear,
    onHistorySelect,
    onContinueFromHistoryTurn,
    onBranchFromHistoryTurn,
    getContinueActionLabel,
    getBranchAccentClassName,
    getLineageActionLabel,
    getQueuedBatchPositionLabel,
    currentLanguage,
    renderHistoryActionButton,
}: RecentHistoryFilmstripProps) {
    type HistoryItem = (typeof recentHistory)[number];

    const latestHandlersRef = useRef({
        onClear,
        onHistorySelect,
        onContinueFromHistoryTurn,
        onBranchFromHistoryTurn,
        getContinueActionLabel,
        getBranchAccentClassName,
        getLineageActionLabel,
        getQueuedBatchPositionLabel,
        renderHistoryActionButton,
    });

    useLayoutEffect(() => {
        latestHandlersRef.current = {
            onClear,
            onHistorySelect,
            onContinueFromHistoryTurn,
            onBranchFromHistoryTurn,
            getContinueActionLabel,
            getBranchAccentClassName,
            getLineageActionLabel,
            getQueuedBatchPositionLabel,
            renderHistoryActionButton,
        };
    }, [
        onClear,
        onHistorySelect,
        onContinueFromHistoryTurn,
        onBranchFromHistoryTurn,
        getContinueActionLabel,
        getBranchAccentClassName,
        getLineageActionLabel,
        getQueuedBatchPositionLabel,
        renderHistoryActionButton,
    ]);

    return useMemo(
        () => ({
            recentHistory,
            branchCount,
            activeStageImageUrl,
            selectedHistoryId,
            currentStageSourceHistoryId,
            currentSourceHistoryId,
            branchOriginIdByTurnId,
            branchLabelByTurnId,
            branchSummaryByOriginId,
            activeBranchOriginId,
            onClear: () => latestHandlersRef.current.onClear(),
            onHistorySelect: (item: HistoryItem) => latestHandlersRef.current.onHistorySelect(item),
            onContinueFromHistoryTurn: (item: HistoryItem) => latestHandlersRef.current.onContinueFromHistoryTurn(item),
            onBranchFromHistoryTurn: (item: HistoryItem) => latestHandlersRef.current.onBranchFromHistoryTurn(item),
            getContinueActionLabel: (item: HistoryItem) => latestHandlersRef.current.getContinueActionLabel(item),
            getBranchAccentClassName: (branchOriginId: string, branchLabel: string) =>
                latestHandlersRef.current.getBranchAccentClassName(branchOriginId, branchLabel),
            getLineageActionLabel: (action?: HistoryItem['lineageAction']) =>
                latestHandlersRef.current.getLineageActionLabel(action),
            getQueuedBatchPositionLabel: (item: HistoryItem) =>
                latestHandlersRef.current.getQueuedBatchPositionLabel(item),
            currentLanguage,
            renderHistoryActionButton: (args: Parameters<typeof renderHistoryActionButton>[0]) =>
                latestHandlersRef.current.renderHistoryActionButton(args),
        }),
        [
            recentHistory,
            branchCount,
            activeStageImageUrl,
            selectedHistoryId,
            currentStageSourceHistoryId,
            currentSourceHistoryId,
            branchOriginIdByTurnId,
            branchLabelByTurnId,
            branchSummaryByOriginId,
            activeBranchOriginId,
            currentLanguage,
        ],
    );
}
