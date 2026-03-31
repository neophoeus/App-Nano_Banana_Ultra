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
        recentLane,
        focusSurface,
        supportSurface,
        activeBranchSummary,
        branchSummariesCount,
        sessionUpdatedLabel,
        selectedHistoryId,
        lineageRootGroups,
        onOpenVersionsDetails,
        getShortTurnId,
    } = props;
    const t = (key: string) => getTranslation(currentLanguage, key);
    const { isDesktop, isOpen, setIsOpen } = useResponsivePanelState();
    const currentTurnId = selectedHistoryId || activeBranchSummary?.latestTurn.id || null;

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
        <section data-testid="workspace-history-canvas" className="grid min-w-0 gap-4 lg:min-h-0">
            <div data-testid="workspace-history-recent-lane">{recentLane}</div>
            <div
                data-testid="workspace-history-focus-grid"
                className="grid gap-4 lg:min-h-0 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.78fr)]"
            >
                <div data-testid="workspace-history-focus-state" className="min-w-0">
                    {focusSurface}
                </div>
                <aside data-testid="workspace-history-support-rail" className="grid min-w-0 content-start gap-3">
                    <details
                        data-testid="history-versions-section"
                        open={isOpen}
                        onToggle={(event) => {
                            if (isDesktop) {
                                return;
                            }

                            setIsOpen(event.currentTarget.open);
                        }}
                        className="group min-w-0 nbu-soft-well overflow-hidden xl:h-[264px] xl:min-h-0"
                    >
                        <summary
                            data-testid="history-versions-summary"
                            className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 text-left xl:hidden [&::-webkit-details-marker]:hidden"
                        >
                            <span className="text-[15px] font-black text-slate-900 dark:text-slate-100">
                                {t('workspaceInsightsVersions')}
                            </span>
                            {renderDisclosureChevron()}
                        </summary>

                        <div data-testid="history-versions-shell" className="flex h-full min-h-0 flex-col px-3 pb-3">
                            <div className="flex items-start justify-between gap-3 pt-3 xl:pt-0">
                                <div className="min-w-0 flex-1">
                                    <h2 className="text-[15px] font-black text-slate-900 dark:text-slate-100">
                                        {t('workspaceInsightsVersions')}
                                    </h2>
                                </div>
                                <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 text-right text-[11px] text-gray-400 dark:text-gray-500">
                                    <span>{sessionUpdatedLabel}</span>
                                    <span>
                                        {t('workspaceInsightsBranchesCount').replace(
                                            '{0}',
                                            String(branchSummariesCount),
                                        )}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-3 flex flex-1 min-h-0 flex-col">
                                <div className="nbu-scrollbar-subtle min-h-0 flex-1 overflow-x-hidden overflow-y-auto pr-1">
                                    <div className="nbu-inline-panel space-y-3 px-3 py-3">
                                        <div className="grid gap-2 sm:grid-cols-3">
                                            <div className="min-w-0 rounded-2xl border border-gray-200 bg-white px-3 py-2 dark:border-gray-800 dark:bg-[#0f141b]">
                                                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">
                                                    {t('workspaceInsightsActiveBranch')}
                                                </div>
                                                <div className="mt-2 break-words text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                    {activeBranchSummary?.branchLabel ||
                                                        t('workspaceInsightsBranchesEmpty')}
                                                </div>
                                            </div>
                                            <div className="min-w-0 rounded-2xl border border-gray-200 bg-white px-3 py-2 dark:border-gray-800 dark:bg-[#0f141b]">
                                                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">
                                                    {t('historyFilmstripTitle')}
                                                </div>
                                                <div className="mt-2 break-all text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                    {currentTurnId ? getShortTurnId(currentTurnId) : '--------'}
                                                </div>
                                            </div>
                                            <div className="min-w-0 rounded-2xl border border-gray-200 bg-white px-3 py-2 dark:border-gray-800 dark:bg-[#0f141b]">
                                                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">
                                                    {t('workspaceInsightsBranchesCount').replace(
                                                        '{0}',
                                                        String(branchSummariesCount),
                                                    )}
                                                </div>
                                                <div className="mt-2 break-words text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                    {t('workspaceInsightsRootsCount').replace(
                                                        '{0}',
                                                        String(lineageRootGroups.length),
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        {activeBranchSummary ? (
                                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
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
                                            </div>
                                        ) : null}
                                    </div>
                                </div>

                                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-200/80 pt-3 dark:border-gray-800">
                                    <button
                                        type="button"
                                        data-testid="history-versions-open-details"
                                        onClick={onOpenVersionsDetails}
                                        className="nbu-control-button px-3 py-1.5 text-[11px] font-semibold"
                                    >
                                        {t('workspacePanelViewDetails')}
                                    </button>
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
