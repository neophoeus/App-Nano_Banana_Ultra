import React from 'react';
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
    selectedHistoryId: string | null;
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
    selectedHistoryId,
    currentStageSourceHistoryId,
    branchLabelByTurnId,
    branchSummaryByOriginId,
    activeBranchOriginId,
    onClear,
    onHistorySelect,
    isPromotedContinuationSource,
    getBranchAccentClassName,
    currentLanguage,
}: RecentHistoryFilmstripProps) {
    const t = (key: string) => getTranslation(currentLanguage, key);
    const activeBranchSummary = activeBranchOriginId ? branchSummaryByOriginId[activeBranchOriginId] || null : null;
    const activeBranchLabel = activeBranchSummary
        ? activeBranchSummary.branchLabel ||
          branchLabelByTurnId[activeBranchSummary.latestTurn.id] ||
          t('historyBranchMain')
        : null;
    const summaryLabel = t('historyFilmstripSummary')
        .replace('{0}', String(recentHistory.length))
        .replace('{1}', String(branchCount));
    const filmstripGridClassName =
        'grid grid-cols-[repeat(3,minmax(108px,108px))] justify-center gap-3 sm:grid-cols-[repeat(4,minmax(108px,108px))] lg:grid-cols-[repeat(6,minmax(112px,112px))] lg:justify-center';

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
                <div className="nbu-scrollbar-subtle -mx-1 overflow-x-auto pb-0">
                    <div className="flex min-w-full justify-center px-1">
                        <div data-testid="filmstrip-grid" className={filmstripGridClassName}>
                            {recentHistory.map((item) => {
                                const isFailed = item.status === 'failed';
                                const selectedHistoryOwnerId = selectedHistoryId || currentStageSourceHistoryId || null;
                                const isSelected =
                                    !isFailed &&
                                    (selectedHistoryOwnerId
                                        ? selectedHistoryOwnerId === item.id
                                        : activeStageImageUrl === item.url);
                                const isCurrentStageSource = currentStageSourceHistoryId === item.id;
                                const isContinuationSource = isPromotedContinuationSource(item);
                                const hasPreviewImage = Boolean(item.url);

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
                                        className={`relative h-[108px] w-[108px] shrink-0 overflow-hidden rounded-[20px] border bg-white/90 transition-[border-color,box-shadow,background-color] duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 lg:h-[112px] lg:w-[112px] dark:bg-slate-950/70 ${isSelected ? 'border-amber-500 shadow-[0_10px_22px_rgba(15,23,42,0.18)]' : isFailed ? 'border-red-300 dark:border-red-800' : 'border-gray-200/80 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-600'}`}
                                    >
                                        {isFailed ? (
                                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-red-50 to-rose-100 px-2 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-red-600 dark:from-red-950/30 dark:to-rose-950/20 dark:text-red-300">
                                                {t('lblHistoryFailed')}
                                            </div>
                                        ) : !hasPreviewImage ? (
                                            <div
                                                data-testid={`filmstrip-card-${item.id}-missing-media`}
                                                className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800"
                                            >
                                                <div className="h-9 w-9 rounded-2xl border border-slate-300/70 bg-white/70 shadow-inner dark:border-slate-700 dark:bg-slate-900/60" />
                                            </div>
                                        ) : (
                                            <img
                                                src={item.url}
                                                alt={t('stageGeneratedImageAlt')}
                                                className="h-full w-full object-cover"
                                            />
                                        )}
                                        {!isFailed && (isCurrentStageSource || isContinuationSource) && (
                                            <div className="pointer-events-none absolute left-1.5 top-1.5 z-10 flex max-w-[calc(100%-0.75rem)] flex-col items-start gap-1">
                                                {isCurrentStageSource && (
                                                    <span
                                                        data-testid={`filmstrip-stage-source-${item.id}`}
                                                        className="rounded-full bg-amber-500/95 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-white shadow-lg whitespace-nowrap"
                                                    >
                                                        {t('workspacePickerStageSource')}
                                                    </span>
                                                )}
                                                {isContinuationSource && (
                                                    <span
                                                        data-testid={`filmstrip-continuation-source-${item.id}`}
                                                        className="rounded-full bg-emerald-500/95 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-white shadow-lg whitespace-nowrap"
                                                    >
                                                        {t('historyBranchContinuationSource')}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        {isSelected && !isFailed && (
                                            <span
                                                data-testid={`filmstrip-selected-${item.id}`}
                                                className="absolute bottom-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-white/80 shadow-[0_0_10px_rgba(250,204,21,0.85)] dark:ring-slate-950/80"
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default React.memo(RecentHistoryFilmstrip);
