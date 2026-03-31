import React from 'react';
import { getExecutionModeLabel } from '../utils/executionMode';
import { getTranslation, Language } from '../utils/translations';
import { GeneratedImage } from '../types';
import InfoTooltip from './InfoTooltip';

type BranchSummary = {
    branchOriginId: string;
    branchLabel?: string;
    turnCount: number;
    latestTurn: GeneratedImage;
};

type RecentHistoryFilmstripProps = {
    recentHistory: GeneratedImage[];
    branchCount: number;
    activeStageImageUrl: string | null;
    currentStageSourceHistoryId: string | null;
    branchOriginIdByTurnId: Record<string, string>;
    branchLabelByTurnId: Record<string, string>;
    branchSummaryByOriginId: Record<string, BranchSummary | undefined>;
    activeBranchOriginId: string | null;
    onClear: () => void;
    onHistorySelect: (item: GeneratedImage) => void;
    onContinueFromHistoryTurn: (item: GeneratedImage) => void;
    onBranchFromHistoryTurn: (item: GeneratedImage) => void;
    isPromotedContinuationSource: (item: GeneratedImage) => boolean;
    getContinueActionLabel: (item: GeneratedImage) => string;
    getBranchAccentClassName: (branchOriginId: string, branchLabel: string) => string;
    getLineageActionLabel: (action?: GeneratedImage['lineageAction']) => string;
    getQueuedBatchPositionLabel: (item: GeneratedImage) => string | null;
    currentLanguage: Language;
    renderHistoryActionButton: (args: {
        label: string;
        onClick: () => void;
        testId?: string;
        variant?: 'primary' | 'secondary' | 'compactPrimary' | 'compactSecondary';
        stopPropagation?: boolean;
    }) => React.ReactNode;
};

function RecentHistoryFilmstrip({
    recentHistory,
    branchCount,
    activeStageImageUrl,
    currentStageSourceHistoryId,
    branchOriginIdByTurnId,
    branchLabelByTurnId,
    branchSummaryByOriginId,
    activeBranchOriginId,
    onClear,
    onHistorySelect,
    onContinueFromHistoryTurn,
    onBranchFromHistoryTurn,
    isPromotedContinuationSource,
    getContinueActionLabel,
    getBranchAccentClassName,
    getLineageActionLabel,
    getQueuedBatchPositionLabel,
    currentLanguage,
    renderHistoryActionButton,
}: RecentHistoryFilmstripProps) {
    const t = (key: string) => getTranslation(currentLanguage, key);
    const getFilmstripContinueLabel = (item: GeneratedImage) => {
        const continueLabel = getContinueActionLabel(item);

        if (!item.variantGroupId && continueLabel === t('lineageActionContinue')) {
            return t('historyContinueFromTurn');
        }

        return continueLabel;
    };
    const activeBranchSummary = activeBranchOriginId ? branchSummaryByOriginId[activeBranchOriginId] || null : null;
    const activeBranchLabel = activeBranchSummary
        ? activeBranchSummary.branchLabel ||
          branchLabelByTurnId[activeBranchSummary.latestTurn.id] ||
          t('historyBranchMain')
        : null;
    const summaryLabel = t('historyFilmstripSummary')
        .replace('{0}', String(recentHistory.length))
        .replace('{1}', String(branchCount));

    return (
        <div className="nbu-stage-hero-filmstrip-shell min-w-0 max-w-full overflow-hidden rounded-[24px] border p-2.5">
            <div className="mb-2.5 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <h3
                            data-testid="filmstrip-title"
                            className="text-[15px] font-black text-slate-900 dark:text-slate-100"
                        >
                            {t('historyFilmstripTitle')}
                        </h3>
                        <InfoTooltip
                            content={t('historyFilmstripDesc')}
                            buttonLabel={t('historyFilmstripTitle')}
                            dataTestId="filmstrip-desc"
                        />
                    </div>
                </div>
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                    {activeBranchSummary ? (
                        <span
                            data-testid="filmstrip-active-branch"
                            className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${getBranchAccentClassName(activeBranchSummary.branchOriginId, activeBranchLabel || t('historyBranchMain'))}`}
                        >
                            {t('workspaceInsightsActiveBranch')} · {activeBranchLabel}
                        </span>
                    ) : null}
                    <span
                        data-testid="filmstrip-summary"
                        className="nbu-stage-hero-filmstrip-summary rounded-full border px-2.5 py-1 text-[10px] font-semibold text-gray-500 dark:text-gray-300"
                    >
                        {summaryLabel}
                    </span>
                    <button
                        onClick={onClear}
                        className="rounded-full border border-gray-200/80 px-2.5 py-1 text-[11px] font-semibold text-gray-600 hover:border-red-300 hover:text-red-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-red-500/40 dark:hover:text-red-300"
                    >
                        {t('clear')}
                    </button>
                </div>
            </div>

            {recentHistory.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 px-3 py-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    {t('historyFilmstripEmpty')}
                </div>
            ) : (
                <div className="flex max-w-full gap-2.5 overflow-x-auto pb-1">
                    {recentHistory.map((item) => {
                        const isFailed = item.status === 'failed';
                        const isActive = !isFailed && activeStageImageUrl === item.url;
                        const isCurrentStageSource = currentStageSourceHistoryId === item.id;
                        const isQueuedBatchHistoryItem = item.executionMode === 'queued-batch-job';
                        const queuedBatchPositionLabel = getQueuedBatchPositionLabel(item);
                        const branchOriginId = branchOriginIdByTurnId[item.id] || item.id;
                        const branchLabel = branchLabelByTurnId[item.id] || t('historyBranchMain');
                        const branchSummary = branchSummaryByOriginId[branchOriginId];
                        const isActiveBranch = activeBranchOriginId === branchOriginId;
                        const isPromotedSource = isPromotedContinuationSource(item);

                        return (
                            <div
                                key={item.id}
                                data-testid={`filmstrip-card-${item.id}`}
                                onClick={() => onHistorySelect(item)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        onHistorySelect(item);
                                    }
                                }}
                                role="button"
                                tabIndex={0}
                                className={`group relative h-24 w-24 shrink-0 overflow-hidden rounded-[20px] border transition-all ${isActive ? 'border-amber-500 shadow-[0_0_14px_rgba(245,158,11,0.2)]' : isActiveBranch ? 'border-sky-300 shadow-[0_0_12px_rgba(14,165,233,0.14)] dark:border-sky-500/50' : 'border-gray-200/80 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-600'}`}
                            >
                                {isFailed ? (
                                    <div className="flex h-full w-full items-center justify-center bg-red-50 text-xs font-semibold text-red-600 dark:bg-red-950/20 dark:text-red-300">
                                        {t('lblHistoryFailed')}
                                    </div>
                                ) : (
                                    <img src={item.url} alt={item.prompt} className="h-full w-full object-cover" />
                                )}
                                {!isFailed && (
                                    <div className="absolute inset-x-0 top-0 flex items-start justify-between px-1.5 py-1.5">
                                        <span
                                            className={`rounded-full border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em] backdrop-blur-sm ${getBranchAccentClassName(branchOriginId, branchLabel)}`}
                                        >
                                            {branchLabel}
                                        </span>
                                        <div className="flex flex-col items-end gap-1">
                                            {isPromotedSource && (
                                                <span className="rounded-full bg-emerald-500/90 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-white">
                                                    {t('workspaceSourceBadge')}
                                                </span>
                                            )}
                                            {isCurrentStageSource && (
                                                <span
                                                    data-testid="filmstrip-stage-source-badge"
                                                    className="rounded-full bg-amber-500/90 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-white"
                                                >
                                                    {t('workspacePickerStageSource')}
                                                </span>
                                            )}
                                            {isActiveBranch && (
                                                <span className="rounded-full bg-black/55 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-white">
                                                    {t('statusPanelLive')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/88 via-black/50 to-transparent px-2 py-1.5 text-left text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                                    <div>{item.mode || t('historyModeImage')}</div>
                                    {!isQueuedBatchHistoryItem && (
                                        <div className="mt-1 text-[9px] text-white/72">
                                            {getExecutionModeLabel(item.executionMode)}
                                        </div>
                                    )}
                                    {!isFailed && (
                                        <div className="mt-1 flex flex-wrap gap-1 text-[9px] text-white/80">
                                            {isCurrentStageSource && (
                                                <span className="rounded bg-amber-500/90 px-1.5 py-0.5 font-semibold text-white">
                                                    {t('workspacePickerStageSource')}
                                                </span>
                                            )}
                                            {isPromotedSource && (
                                                <span className="rounded bg-emerald-500/90 px-1.5 py-0.5 font-semibold text-white">
                                                    {t('workspaceSourceBadge')}
                                                </span>
                                            )}
                                            {isQueuedBatchHistoryItem && (
                                                <span className="rounded bg-sky-500/90 px-1.5 py-0.5 font-semibold text-white">
                                                    {t('workspaceImportReviewExecutionQueuedBatchJob')}
                                                </span>
                                            )}
                                            {queuedBatchPositionLabel && (
                                                <span className="rounded bg-white/10 px-1.5 py-0.5 font-semibold text-white">
                                                    {queuedBatchPositionLabel}
                                                </span>
                                            )}
                                            {!isPromotedSource && item.variantGroupId && !isQueuedBatchHistoryItem && (
                                                <span className="rounded bg-violet-500/90 px-1.5 py-0.5 font-semibold text-white">
                                                    {t('historyBadgeCandidate')}
                                                </span>
                                            )}
                                            <span className="rounded bg-white/10 px-1.5 py-0.5 font-semibold">
                                                {getLineageActionLabel(item.lineageAction)}
                                            </span>
                                        </div>
                                    )}
                                    {!isFailed && (
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {renderHistoryActionButton({
                                                label: t('historyActionOpen'),
                                                testId: `filmstrip-open-${item.id}`,
                                                onClick: () => onHistorySelect(item),
                                                variant: 'compactSecondary',
                                                stopPropagation: true,
                                            })}
                                            {renderHistoryActionButton({
                                                label: getFilmstripContinueLabel(item),
                                                testId: `filmstrip-continue-${item.id}`,
                                                onClick: () => onContinueFromHistoryTurn(item),
                                                variant: 'compactPrimary',
                                                stopPropagation: true,
                                            })}
                                            {renderHistoryActionButton({
                                                label: t('historyActionBranch'),
                                                testId: `filmstrip-branch-${item.id}`,
                                                onClick: () => onBranchFromHistoryTurn(item),
                                                variant: 'compactSecondary',
                                                stopPropagation: true,
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default React.memo(RecentHistoryFilmstrip);
