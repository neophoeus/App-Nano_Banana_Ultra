import React from 'react';
import { useResponsivePanelState } from '../hooks/useResponsivePanelState';
import { GeneratedImage } from '../types';
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

type WorkspaceHistoryCanvasProps = {
    currentLanguage: Language;
    selectedItemDock?: React.ReactNode;
    recentLane: React.ReactNode;
    focusSurface: React.ReactNode;
    supportSurface: React.ReactNode;
    activeBranchSummary: BranchSummary | null;
    recentBranchSummaries: BranchSummary[];
    branchSummariesCount: number;
    sessionUpdatedLabel: string;
    selectedHistoryId: string | null;
    lineageRootGroups: LineageRootGroup[];
    onExportWorkspace: () => void;
    onImportWorkspace: () => void;
    onOpenVersionsDetails: () => void;
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
};

function WorkspaceHistoryCanvas(props: WorkspaceHistoryCanvasProps) {
    const {
        currentLanguage,
        selectedItemDock,
        recentLane,
        focusSurface,
        supportSurface,
        activeBranchSummary,
        branchSummariesCount,
        sessionUpdatedLabel,
        selectedHistoryId,
        lineageRootGroups,
        onExportWorkspace,
        onImportWorkspace,
        onOpenVersionsDetails,
        getShortTurnId,
    } = props;
    const t = (key: string) => getTranslation(currentLanguage, key);
    const { isDesktop, isOpen, setIsOpen } = useResponsivePanelState();
    const currentTurnId = selectedHistoryId || activeBranchSummary?.latestTurn.id || null;
    const versionsSummaryChipClassName =
        'nbu-stage-hero-filmstrip-summary rounded-full border px-2.5 py-1 text-[10px] font-semibold text-gray-500 dark:text-gray-300';
    const versionsStatCardClassName =
        'min-w-0 rounded-[20px] border border-gray-200/80 bg-white/92 px-3 py-2.5 shadow-[0_12px_28px_rgba(15,23,42,0.05)] dark:border-gray-800 dark:bg-[#0f141b]/92';
    const versionsStatLabelClassName =
        'text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500';
    const versionsStatValueClassName = 'mt-2 break-words text-sm font-semibold text-gray-900 dark:text-gray-100';
    const versionsActionButtonClassName =
        'rounded-full border border-gray-200/80 px-2.5 py-1 text-[11px] font-semibold text-gray-600 transition-colors hover:border-amber-300 hover:text-amber-700 dark:border-gray-700 dark:text-gray-300 dark:hover:border-amber-500/40 dark:hover:text-amber-200';
    const versionsInlineActions = (
        <div
            data-testid="history-versions-quick-actions"
            className="ml-auto flex flex-wrap items-center justify-end gap-2"
        >
            <button
                type="button"
                data-testid="history-import-workspace"
                onClick={onImportWorkspace}
                className={versionsActionButtonClassName}
            >
                {t('composerToolbarImportWorkspace')}
            </button>
            <button
                type="button"
                data-testid="history-export-workspace"
                onClick={onExportWorkspace}
                className={versionsActionButtonClassName}
            >
                {t('composerToolbarExportWorkspace')}
            </button>
        </div>
    );

    const renderDisclosureChevron = () => (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-180 dark:text-gray-500"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
        >
            <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 011.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
            />
        </svg>
    );

    return (
        <section data-testid="workspace-history-canvas" className="grid min-w-0 gap-1.5 lg:min-h-0">
            <div
                data-testid="workspace-history-focus-grid"
                className="grid gap-1.5 lg:min-h-0 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
            >
                <div data-testid="workspace-history-focus-state" className="min-w-0">
                    {focusSurface}
                </div>
                <aside data-testid="workspace-history-support-rail" className="grid min-w-0 content-start gap-1.5">
                    {selectedItemDock ? (
                        <div data-testid="workspace-history-selected-item-dock" className="min-w-0">
                            {selectedItemDock}
                        </div>
                    ) : null}
                    <div data-testid="workspace-history-recent-lane">{recentLane}</div>
                    <details
                        data-testid="history-versions-section"
                        open={isOpen}
                        onToggle={(event) => {
                            if (isDesktop) {
                                return;
                            }

                            setIsOpen(event.currentTarget.open);
                        }}
                        className="group min-w-0 w-full max-w-full overflow-hidden rounded-[24px] border p-2.5 nbu-stage-hero-filmstrip-shell"
                    >
                        <summary
                            data-testid="history-versions-summary"
                            className="flex w-full max-w-full cursor-pointer list-none items-center justify-between gap-3 px-0.5 py-0.5 text-left xl:hidden [&::-webkit-details-marker]:hidden"
                        >
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[15px] font-black text-slate-900 dark:text-slate-100">
                                        {t('workspaceInsightsVersions')}
                                    </span>
                                    <span className={versionsSummaryChipClassName}>
                                        {t('workspaceInsightsBranchesCount').replace(
                                            '{0}',
                                            String(branchSummariesCount),
                                        )}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`${versionsSummaryChipClassName} hidden sm:inline-flex`}>
                                    {sessionUpdatedLabel}
                                </span>
                                {renderDisclosureChevron()}
                            </div>
                        </summary>

                        <div
                            data-testid="history-versions-shell"
                            className="flex h-full min-h-0 w-full max-w-full flex-col"
                        >
                            <div
                                data-testid="history-versions-header"
                                className="mb-1.5 flex min-w-0 items-start justify-end gap-3 xl:justify-between"
                            >
                                <div className="min-w-0 flex flex-1 items-center gap-2">
                                    <h2 className="hidden text-[15px] font-black text-slate-900 dark:text-slate-100 xl:block">
                                        {t('workspaceInsightsVersions')}
                                    </h2>
                                    <button
                                        type="button"
                                        data-testid="history-versions-open-details"
                                        onClick={onOpenVersionsDetails}
                                        className={versionsActionButtonClassName}
                                    >
                                        {t('workspacePanelViewDetails')}
                                    </button>
                                </div>
                                <div
                                    data-testid="history-versions-toolbar"
                                    className="flex min-w-0 flex-wrap items-center justify-end gap-2 text-right"
                                >
                                    <span className={versionsSummaryChipClassName}>{sessionUpdatedLabel}</span>
                                    <span className={versionsSummaryChipClassName}>
                                        {t('workspaceInsightsBranchesCount').replace(
                                            '{0}',
                                            String(branchSummariesCount),
                                        )}
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-1 min-h-0 flex-col">
                                <div className="nbu-scrollbar-subtle min-h-0 flex-1 overflow-x-hidden overflow-y-auto pr-0.5">
                                    <div className="space-y-1.5 px-0.5 py-0.5">
                                        <div className="grid gap-1.5 sm:grid-cols-3">
                                            <div className={versionsStatCardClassName}>
                                                <div className={versionsStatLabelClassName}>
                                                    {t('workspaceInsightsActiveBranch')}
                                                </div>
                                                <div className={versionsStatValueClassName}>
                                                    {activeBranchSummary?.branchLabel ||
                                                        t('workspaceInsightsBranchesEmpty')}
                                                </div>
                                            </div>
                                            <div className={versionsStatCardClassName}>
                                                <div className={versionsStatLabelClassName}>
                                                    {t('historyFilmstripTitle')}
                                                </div>
                                                <div className={`${versionsStatValueClassName} break-all`}>
                                                    {currentTurnId ? getShortTurnId(currentTurnId) : '--------'}
                                                </div>
                                            </div>
                                            <div className={versionsStatCardClassName}>
                                                <div className={versionsStatLabelClassName}>
                                                    {t('workspaceInsightsBranchesCount').replace(
                                                        '{0}',
                                                        String(branchSummariesCount),
                                                    )}
                                                </div>
                                                <div className={versionsStatValueClassName}>
                                                    {t('workspaceInsightsRootsCount').replace(
                                                        '{0}',
                                                        String(lineageRootGroups.length),
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div
                                            data-testid="history-versions-branch-row"
                                            className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400"
                                        >
                                            {activeBranchSummary ? (
                                                <>
                                                    <span
                                                        className={`rounded-full border px-2.5 py-1 font-bold uppercase tracking-[0.16em] ${props.getBranchAccentClassName(activeBranchSummary.branchOriginId, activeBranchSummary.branchLabel)}`}
                                                    >
                                                        {activeBranchSummary.branchLabel}
                                                    </span>
                                                    <span>
                                                        {t('workspaceInsightsTurnsCount').replace(
                                                            '{0}',
                                                            String(activeBranchSummary.turnCount),
                                                        )}
                                                    </span>
                                                </>
                                            ) : null}
                                            {versionsInlineActions}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </details>
                    {supportSurface ? <div data-testid="workspace-history-support-tools">{supportSurface}</div> : null}
                </aside>
            </div>
        </section>
    );
}

export default React.memo(WorkspaceHistoryCanvas);
