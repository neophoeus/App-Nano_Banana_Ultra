import React from 'react';
import { GeneratedImage, TurnLineageAction } from '../types';
import { BranchSummary } from '../utils/lineage';
import { getTranslation, Language } from '../utils/translations';

type LineageRootGroup = {
    rootId: string;
    branches: Array<{
        branchOriginId: string;
        branchLabel: string;
        turns: GeneratedImage[];
    }>;
};

export type WorkspaceVersionsDetailPanelProps = {
    currentLanguage: Language;
    activeBranchSummary: BranchSummary | null;
    recentBranchSummaries: BranchSummary[];
    branchSummariesCount: number;
    sessionUpdatedLabel: string;
    selectedHistoryId: string | null;
    currentStageSourceHistoryId: string | null;
    lineageRootGroups: LineageRootGroup[];
    onExportWorkspace: () => void;
    onImportWorkspace: () => void;
    onHistorySelect: (item: GeneratedImage) => void;
    onRenameBranch: (item: GeneratedImage) => void;
    getShortTurnId: (historyId?: string | null) => string;
    getBranchAccentClassName: (branchOriginId: string, branchLabel: string) => string;
    renderHistoryTurnSnapshotContent: (args: {
        item: GeneratedImage;
        badges: React.ReactNode;
        actionRow?: React.ReactNode;
        promptClassName?: string;
    }) => React.ReactNode;
    renderHistoryTurnBadges: (args: {
        item: GeneratedImage;
        variant: 'stage-source' | 'session-stack' | 'lineage-map';
        branchLabel?: string;
        isCurrentStageSource?: boolean;
        isActive?: boolean;
    }) => React.ReactNode;
    renderHistoryTurnActionRow: (args: {
        item: GeneratedImage;
        openLabel?: string | null;
        continueLabel?: string | null;
        branchLabel?: string | null;
        renameLabel?: string | null;
        testIds?: {
            open?: string;
            continue?: string;
            branch?: string;
            rename?: string;
        };
        stopPropagation?: boolean;
        renameTarget?: GeneratedImage | null;
    }) => React.ReactNode;
    renderActiveBranchSummaryContent: (branchSummary: BranchSummary) => React.ReactNode;
    showHeader?: boolean;
};

function WorkspaceVersionsDetailPanel({
    currentLanguage,
    activeBranchSummary,
    recentBranchSummaries,
    branchSummariesCount,
    sessionUpdatedLabel,
    selectedHistoryId,
    currentStageSourceHistoryId,
    lineageRootGroups,
    onExportWorkspace,
    onImportWorkspace,
    onHistorySelect,
    onRenameBranch,
    getShortTurnId,
    getBranchAccentClassName,
    renderHistoryTurnSnapshotContent,
    renderHistoryTurnBadges,
    renderHistoryTurnActionRow,
    renderActiveBranchSummaryContent,
    showHeader = true,
}: WorkspaceVersionsDetailPanelProps) {
    const t = (key: string) => getTranslation(currentLanguage, key);
    const collapsibleSectionClassName = 'group nbu-inline-panel px-3 py-2.5';
    const inlineSurfaceClassName = 'nbu-inline-panel px-3 py-2.5';
    const dashedSurfaceClassName = 'nbu-dashed-panel p-2.5';
    const quietMonoPillClassName = 'nbu-quiet-pill px-2 py-0.5 text-[10px] font-mono';
    const compactControlButtonClassName = 'nbu-control-button px-3 py-1.5 text-[11px] font-semibold';
    const nestedSectionCardClassName = 'nbu-inline-panel px-3 py-2.5';
    const snapshotActionStripClassName = `${nestedSectionCardClassName} space-y-2.5`;
    const snapshotActionButtonClassName =
        'nbu-control-button flex w-full items-center justify-center rounded-[18px] px-3 py-2 text-[12px] font-semibold';

    return (
        <div data-testid="workspace-versions-detail-panel" className="space-y-3">
            {showHeader ? (
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <h2 className="text-[15px] font-black text-slate-900 dark:text-slate-100">
                            {t('workspaceInsightsVersions')}
                        </h2>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2 text-[11px] text-gray-400 dark:text-gray-500">
                        <span>{sessionUpdatedLabel}</span>
                        <span>{t('workspaceInsightsBranchesCount').replace('{0}', String(branchSummariesCount))}</span>
                    </div>
                </div>
            ) : null}

            <div data-testid="history-workspace-snapshot-strip" className={snapshotActionStripClassName}>
                <div className="text-xs uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                    {t('workspaceSnapshotActionsTitle')}
                </div>
                <div data-testid="history-workspace-snapshot-actions" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                        type="button"
                        data-testid="history-import-workspace"
                        onClick={onImportWorkspace}
                        className={snapshotActionButtonClassName}
                    >
                        {t('composerToolbarImportWorkspace')}
                    </button>
                    <button
                        type="button"
                        data-testid="history-export-workspace"
                        onClick={onExportWorkspace}
                        className={snapshotActionButtonClassName}
                    >
                        {t('composerToolbarExportWorkspace')}
                    </button>
                </div>
            </div>

            <div data-testid="active-branch-card" className={`${nestedSectionCardClassName} space-y-2.5`}>
                <div className="flex items-center justify-between gap-3">
                    <div className="text-xs uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                        {t('workspaceInsightsActiveBranch')}
                    </div>
                    <span className="text-[11px] text-gray-400 dark:text-gray-500">
                        {t('workspaceInsightsBranchesCount').replace('{0}', String(branchSummariesCount))}
                    </span>
                </div>
                {activeBranchSummary ? (
                    <div className="space-y-2.5">
                        <div className={inlineSurfaceClassName}>
                            {renderActiveBranchSummaryContent(activeBranchSummary)}
                        </div>
                        {recentBranchSummaries.length > 1 ? (
                            <div
                                data-testid="active-branch-switcher-section"
                                className={`${collapsibleSectionClassName} space-y-2.5`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="text-[11px] leading-5 text-gray-500 dark:text-gray-400">
                                            {recentBranchSummaries[0].branchLabel} ·{' '}
                                            {recentBranchSummaries[0].turnCount}
                                        </div>
                                    </div>
                                    <span className="text-[11px] text-gray-400 dark:text-gray-500">
                                        {t('workspaceInsightsItemsCount').replace(
                                            '{0}',
                                            String(recentBranchSummaries.length),
                                        )}
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-2 border-t border-gray-200/80 pt-2.5 dark:border-gray-800">
                                    {recentBranchSummaries.map((branch) => {
                                        const isActiveBranch =
                                            branch.branchOriginId === activeBranchSummary.branchOriginId;
                                        return (
                                            <button
                                                key={branch.branchOriginId}
                                                data-testid={`active-branch-switch-${branch.branchOriginId}`}
                                                onClick={() => onHistorySelect(branch.latestTurn)}
                                                className={`${isActiveBranch ? 'rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-700 transition-colors dark:border-amber-500/40 dark:bg-amber-950/20 dark:text-amber-200' : compactControlButtonClassName}`}
                                            >
                                                {branch.branchLabel} · {branch.turnCount}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : null}
                    </div>
                ) : (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                        {t('workspaceInsightsBranchesEmpty')}
                    </div>
                )}
            </div>

            <div data-testid="lineage-map-card" className={`${nestedSectionCardClassName} space-y-2.5`}>
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <div className="text-xs uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                            {t('workspaceInsightsLineageMap')}
                        </div>
                        {activeBranchSummary ? (
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                                <span
                                    className={`rounded-full border px-2.5 py-1 font-bold uppercase tracking-[0.16em] ${getBranchAccentClassName(activeBranchSummary.branchOriginId, activeBranchSummary.branchLabel)}`}
                                >
                                    {activeBranchSummary.branchLabel}
                                </span>
                                <span>
                                    {t('workspaceInsightsTurnsCount').replace(
                                        '{0}',
                                        String(activeBranchSummary.turnCount),
                                    )}
                                </span>
                            </div>
                        ) : null}
                    </div>
                    <span className="text-[11px] text-gray-400 dark:text-gray-500">
                        {t('workspaceInsightsRootsCount').replace('{0}', String(lineageRootGroups.length))}
                    </span>
                </div>
                <div className="space-y-2 border-t border-gray-200/80 pt-2.5 dark:border-gray-800">
                    {lineageRootGroups.length > 0 ? (
                        lineageRootGroups.map((rootGroup) => (
                            <div key={`root-group-${rootGroup.rootId}`} className="nbu-inline-panel p-2.5">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-2">
                                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
                                            {t('workspaceInsightsRoot')}
                                        </span>
                                        <span className={quietMonoPillClassName}>
                                            {getShortTurnId(rootGroup.rootId)}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                        {t('workspaceInsightsBranchesCount').replace(
                                            '{0}',
                                            String(rootGroup.branches.length),
                                        )}
                                    </span>
                                </div>
                                <div className="mt-2.5 space-y-2.5">
                                    {rootGroup.branches.map((branch) => (
                                        <div
                                            key={`branch-group-${branch.branchOriginId}`}
                                            data-testid={`lineage-map-branch-${branch.branchOriginId}`}
                                            className={dashedSurfaceClassName}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${getBranchAccentClassName(branch.branchOriginId, branch.branchLabel)}`}
                                                    >
                                                        {branch.branchLabel}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                                        {t('workspaceInsightsTurnsCount').replace(
                                                            '{0}',
                                                            String(branch.turns.length),
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => onRenameBranch(branch.turns[0])}
                                                        className={compactControlButtonClassName}
                                                    >
                                                        {t('historyActionRename')}
                                                    </button>
                                                    {branch.branchOriginId !== rootGroup.rootId ? (
                                                        <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                                            {t('historyBranchOrigin')}{' '}
                                                            {getShortTurnId(branch.branchOriginId)}
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </div>
                                            <div className="mt-2.5 space-y-2">
                                                {branch.turns.map((item) => {
                                                    const isActiveTurn = selectedHistoryId === item.id;
                                                    return (
                                                        <div
                                                            key={`lineage-${item.id}`}
                                                            data-testid={`lineage-map-turn-${item.id}`}
                                                            role="button"
                                                            tabIndex={0}
                                                            onClick={() => onHistorySelect(item)}
                                                            onKeyDown={(event) => {
                                                                if (event.key === 'Enter' || event.key === ' ') {
                                                                    event.preventDefault();
                                                                    onHistorySelect(item);
                                                                }
                                                            }}
                                                            className={`block w-full rounded-2xl border px-3 py-2 text-left transition-colors ${isActiveTurn ? 'border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-950/20' : 'nbu-inline-panel hover:border-amber-300 dark:hover:border-amber-500/30'}`}
                                                        >
                                                            {renderHistoryTurnSnapshotContent({
                                                                item,
                                                                badges: renderHistoryTurnBadges({
                                                                    item,
                                                                    variant: 'lineage-map',
                                                                    branchLabel: branch.branchLabel,
                                                                    isCurrentStageSource:
                                                                        currentStageSourceHistoryId === item.id,
                                                                    isActive: isActiveTurn,
                                                                }),
                                                                promptClassName:
                                                                    'mt-2 line-clamp-2 text-xs leading-5 text-gray-600 dark:text-gray-300',
                                                            })}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                            {t('workspaceInsightsLineageEmpty')}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default React.memo(WorkspaceVersionsDetailPanel);
