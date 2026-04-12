import { useCallback, useMemo } from 'react';
import { BranchSummary } from '../utils/lineage';
import {
    GeneratedImage,
    SelectedItemModel,
    SelectedItemSummaryStripChip,
    SelectedItemSummaryStripProps,
    TurnLineageAction,
} from '../types';

type HistoryActionButtonVariant = 'primary' | 'secondary' | 'compactPrimary' | 'compactSecondary';

type RenderHistoryActionButtonArgs = {
    label: string;
    onClick: () => void;
    testId?: string;
    variant?: HistoryActionButtonVariant;
    stopPropagation?: boolean;
};

type RenderHistoryTurnSnapshotContentArgs = {
    item: GeneratedImage;
    badges: React.ReactNode;
    actionRow?: React.ReactNode;
    promptClassName?: string;
};

type RenderHistoryTurnActionRowArgs = {
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
};

type RenderHistoryTurnBadgesArgs = {
    item: GeneratedImage;
    variant: 'stage-source' | 'session-stack' | 'lineage-map';
    branchLabel?: string;
    isCurrentStageSource?: boolean;
    isActive?: boolean;
};

type UseHistoryPresentationHelpersArgs = {
    history: GeneratedImage[];
    branchSummaryByOriginId: Record<string, BranchSummary | undefined>;
    effectiveBranchContinuationSourceByBranchOriginId: Record<string, string>;
    getBranchAccentClassName: (branchOriginId: string, branchLabel: string) => string;
    getContinueActionLabel: (item: GeneratedImage) => string;
    getLineageActionLabel: (action?: TurnLineageAction) => string;
    getShortTurnId: (historyId?: string | null) => string;
    handleBranchFromHistoryTurn: (item: GeneratedImage) => void;
    handleContinueFromHistoryTurn: (item: GeneratedImage) => void;
    handleHistorySelect: (item: GeneratedImage) => void;
    handleRenameBranch: (item: GeneratedImage) => void;
    isPromotedContinuationSource: (item: GeneratedImage) => boolean;
    t: (key: string) => string;
};

const historyActionButtonClassNames = {
    primary: 'rounded-full bg-amber-500 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-amber-600',
    secondary:
        'rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-700 hover:border-amber-300 hover:text-amber-700 dark:border-gray-700 dark:bg-[#141922] dark:text-gray-200 dark:hover:border-amber-500/40 dark:hover:text-amber-200',
    compactPrimary: 'rounded bg-amber-500 px-1.5 py-0.5 font-semibold text-white',
    compactSecondary: 'rounded border border-white/20 bg-black/35 px-1.5 py-0.5 font-semibold text-white',
} as const;

const compactSelectedItemModelLabelByModel: Record<GeneratedImage['model'], string> = {
    'gemini-2.5-flash-image': 'Banana',
    'gemini-3.1-flash-image-preview': 'Banana 2',
    'gemini-3-pro-image-preview': 'Banana Pro',
};

export function useHistoryPresentationHelpers({
    history,
    branchSummaryByOriginId,
    effectiveBranchContinuationSourceByBranchOriginId,
    getBranchAccentClassName,
    getContinueActionLabel,
    getLineageActionLabel,
    getShortTurnId,
    handleBranchFromHistoryTurn,
    handleContinueFromHistoryTurn,
    handleHistorySelect,
    handleRenameBranch,
    isPromotedContinuationSource,
    t,
}: UseHistoryPresentationHelpersArgs) {
    const resolveContinueLabel = useCallback(
        (item: GeneratedImage, explicitLabel?: string) => {
            const computedContinueLabel = getContinueActionLabel(item);

            if (explicitLabel) {
                return explicitLabel;
            }

            if (!item.variantGroupId && computedContinueLabel === t('lineageActionContinue')) {
                return t('historyContinueFromTurn');
            }

            return computedContinueLabel;
        },
        [getContinueActionLabel, t],
    );

    const queuedBatchPositionLabelByHistoryId = useMemo(() => {
        const labels: Record<string, string> = {};
        const grouped = history.reduce<Record<string, GeneratedImage[]>>((accumulator, item) => {
            if (item.executionMode !== 'queued-batch-job' || !item.variantGroupId) {
                return accumulator;
            }

            if (!accumulator[item.variantGroupId]) {
                accumulator[item.variantGroupId] = [];
            }

            accumulator[item.variantGroupId].push(item);
            return accumulator;
        }, {});

        Object.values(grouped).forEach((items) => {
            if (items.length <= 1) {
                return;
            }

            const orderedItems = [...items].sort((left, right) => {
                const leftIndex =
                    typeof left.metadata?.batchResultIndex === 'number'
                        ? left.metadata.batchResultIndex
                        : Number.MAX_SAFE_INTEGER;
                const rightIndex =
                    typeof right.metadata?.batchResultIndex === 'number'
                        ? right.metadata.batchResultIndex
                        : Number.MAX_SAFE_INTEGER;
                if (leftIndex !== rightIndex) {
                    return leftIndex - rightIndex;
                }

                return left.createdAt - right.createdAt;
            });

            orderedItems.forEach((item, index) => {
                labels[item.id] = `#${index + 1}/${orderedItems.length}`;
            });
        });

        return labels;
    }, [history]);

    const getQueuedBatchPositionLabel = useCallback(
        (historyId?: string | null) => {
            if (!historyId) {
                return null;
            }

            return queuedBatchPositionLabelByHistoryId[historyId] || null;
        },
        [queuedBatchPositionLabelByHistoryId],
    );

    const getConversationCue = useCallback(
        (item: GeneratedImage) => {
            const threadAnchorId = item.conversationBranchOriginId || item.conversationId;
            const hasThread = Boolean(threadAnchorId);

            return {
                isMemoryTurn: item.executionMode === 'chat-continuation' || hasThread,
                threadLabel:
                    hasThread && threadAnchorId ? `${t('historyBadgeThread')} ${getShortTurnId(threadAnchorId)}` : null,
            };
        },
        [getShortTurnId, t],
    );

    const renderHistoryActionButton = useCallback(
        ({ label, onClick, testId, variant = 'secondary', stopPropagation = false }: RenderHistoryActionButtonArgs) => (
            <button
                type="button"
                data-testid={testId}
                onClick={(event) => {
                    if (stopPropagation) {
                        event.stopPropagation();
                    }
                    onClick();
                }}
                className={historyActionButtonClassNames[variant]}
            >
                {label}
            </button>
        ),
        [],
    );

    const renderHistoryTurnSnapshotContent = useCallback(
        ({
            item,
            badges,
            actionRow,
            promptClassName = 'mt-2 line-clamp-2 text-xs leading-5 text-gray-700 dark:text-gray-200',
        }: RenderHistoryTurnSnapshotContentArgs) => (
            <>
                <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-1.5">{badges}</div>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
                <div className={promptClassName}>{item.prompt}</div>
                {actionRow ? <div className="mt-3 flex flex-wrap gap-2">{actionRow}</div> : null}
            </>
        ),
        [],
    );

    const renderHistoryTurnActionRow = useCallback(
        ({
            item,
            openLabel = t('historyActionOpen'),
            continueLabel,
            branchLabel = t('historyActionBranch'),
            renameLabel = t('historyActionRename'),
            testIds,
            stopPropagation = false,
            renameTarget,
        }: RenderHistoryTurnActionRowArgs) => {
            const resolvedOpenLabel = openLabel === undefined ? t('historyActionOpen') : openLabel;
            const resolvedContinueLabel =
                continueLabel === null ? null : resolveContinueLabel(item, continueLabel ?? undefined);
            const resolvedBranchLabel = branchLabel === undefined ? t('historyActionBranch') : branchLabel;
            const resolvedRenameLabel = renameLabel === undefined ? t('historyActionRename') : renameLabel;

            return (
                <>
                    {resolvedOpenLabel
                        ? renderHistoryActionButton({
                              label: resolvedOpenLabel,
                              testId: testIds?.open,
                              onClick: () => handleHistorySelect(item),
                              variant: 'primary',
                              stopPropagation,
                          })
                        : null}
                    {resolvedContinueLabel
                        ? renderHistoryActionButton({
                              label: resolvedContinueLabel,
                              testId: testIds?.continue,
                              onClick: () => handleContinueFromHistoryTurn(item),
                              stopPropagation,
                          })
                        : null}
                    {resolvedBranchLabel
                        ? renderHistoryActionButton({
                              label: resolvedBranchLabel,
                              testId: testIds?.branch,
                              onClick: () => handleBranchFromHistoryTurn(item),
                              stopPropagation,
                          })
                        : null}
                    {renameTarget
                        ? renderHistoryActionButton({
                              label: resolvedRenameLabel,
                              testId: testIds?.rename,
                              onClick: () => handleRenameBranch(renameTarget),
                              stopPropagation,
                          })
                        : null}
                </>
            );
        },
        [
            handleBranchFromHistoryTurn,
            handleContinueFromHistoryTurn,
            handleHistorySelect,
            handleRenameBranch,
            renderHistoryActionButton,
            resolveContinueLabel,
        ],
    );

    const renderHistoryTurnBadges = useCallback(
        ({
            item,
            variant,
            branchLabel,
            isCurrentStageSource = false,
            isActive = false,
        }: RenderHistoryTurnBadgesArgs) => {
            const conversationCue = getConversationCue(item);
            const queuedBatchPositionBadge = queuedBatchPositionLabelByHistoryId[item.id] ? (
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-500 dark:bg-[#181d26] dark:text-gray-300">
                    {queuedBatchPositionLabelByHistoryId[item.id]}
                </span>
            ) : null;
            const queuedBatchBadge =
                item.executionMode === 'queued-batch-job' ? (
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-sky-700 dark:bg-sky-950/40 dark:text-sky-200">
                        {t('workspaceImportReviewExecutionQueuedBatchJob')}
                    </span>
                ) : null;
            const memoryBadge = conversationCue.isMemoryTurn ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
                    {t('historyBadgeMemory')}
                </span>
            ) : null;
            const threadBadge = conversationCue.threadLabel ? (
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-mono text-gray-500 dark:bg-[#181d26] dark:text-gray-400">
                    {conversationCue.threadLabel}
                </span>
            ) : null;
            const baseModeBadge = (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-600 dark:bg-[#181d26] dark:text-gray-300">
                    {item.mode || t('historyModeImage')}
                </span>
            );
            const splitDepthBadge = (
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-500 dark:bg-[#181d26] dark:text-gray-400">
                    D{item.lineageDepth || 0}
                </span>
            );
            const combinedDepthBadge = (
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-600 dark:bg-[#181d26] dark:text-gray-300">
                    {getLineageActionLabel(item.lineageAction)} · D{item.lineageDepth || 0}
                </span>
            );
            const lineageBadge = (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-600 dark:bg-[#181d26] dark:text-gray-300">
                    {getLineageActionLabel(item.lineageAction)}
                </span>
            );
            const parentBadge = item.parentHistoryId ? (
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-mono text-gray-500 dark:bg-[#181d26] dark:text-gray-400">
                    {t('historyBadgeParent')} {getShortTurnId(item.parentHistoryId)}
                </span>
            ) : null;
            const promotionBadge = isPromotedContinuationSource(item) ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
                    {t('workspaceSourceBadge')}
                </span>
            ) : item.variantGroupId && item.executionMode !== 'queued-batch-job' ? (
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-violet-700 dark:bg-violet-950/40 dark:text-violet-200">
                    {t('historyBadgeCandidate')}
                </span>
            ) : null;

            if (variant === 'stage-source') {
                return (
                    <>
                        {baseModeBadge}
                        {memoryBadge}
                        {threadBadge}
                        {queuedBatchBadge}
                        {queuedBatchPositionBadge}
                        {promotionBadge}
                        {splitDepthBadge}
                        {parentBadge}
                    </>
                );
            }

            if (variant === 'session-stack') {
                return (
                    <>
                        {baseModeBadge}
                        {combinedDepthBadge}
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200">
                            {branchLabel || t('historyBranchMain')}
                        </span>
                        {memoryBadge}
                        {threadBadge}
                        {queuedBatchBadge}
                        {queuedBatchPositionBadge}
                        {promotionBadge}
                        {isCurrentStageSource && (
                            <span
                                data-testid="session-stage-source-badge"
                                className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
                            >
                                {t('workspacePickerStageSource')}
                            </span>
                        )}
                        {isActive && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
                                {t('historyBadgeActive')}
                            </span>
                        )}
                    </>
                );
            }

            return (
                <>
                    {isActive && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
                            {t('historyBadgeActive')}
                        </span>
                    )}
                    {isCurrentStageSource && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
                            {t('workspacePickerStageSource')}
                        </span>
                    )}
                    {branchLabel && (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200">
                            {branchLabel}
                        </span>
                    )}
                    {lineageBadge}
                    {memoryBadge}
                    {threadBadge}
                    {queuedBatchBadge}
                    {queuedBatchPositionBadge}
                    {promotionBadge}
                    {splitDepthBadge}
                    {parentBadge}
                </>
            );
        },
        [
            getConversationCue,
            getLineageActionLabel,
            getShortTurnId,
            isPromotedContinuationSource,
            queuedBatchPositionLabelByHistoryId,
            t,
        ],
    );

    const renderActiveBranchSummaryContent = useCallback(
        (branchSummary: BranchSummary) => (
            <>
                <div className="flex items-center gap-2">
                    <span
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${getBranchAccentClassName(branchSummary.branchOriginId, branchSummary.branchLabel)}`}
                    >
                        {branchSummary.branchLabel}
                    </span>
                    {branchSummary.branchLabel !== branchSummary.autoBranchLabel && (
                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-500 dark:bg-[#181d26] dark:text-gray-400">
                            {t('historyBranchAuto')} {branchSummary.autoBranchLabel}
                        </span>
                    )}
                </div>
                <div className="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-400">
                    {t('historyBranchRoot')} {getShortTurnId(branchSummary.rootId)} ·{' '}
                    {t('historyBranchTurns').replace('{0}', String(branchSummary.turnCount))} ·{' '}
                    {t('historyBranchUpdated')}{' '}
                    {new Date(branchSummary.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                    {t('historyBranchOrigin')} {getShortTurnId(branchSummary.originTurn.id)} ·{' '}
                    {t('historyBranchLatest')} {getShortTurnId(branchSummary.latestTurn.id)}
                </div>
                <div className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                    {t('historyBranchContinuationSource')}{' '}
                    {getShortTurnId(
                        effectiveBranchContinuationSourceByBranchOriginId[branchSummary.branchOriginId] || null,
                    )}
                </div>
                <div className="mt-2 line-clamp-2 text-xs leading-5 text-gray-700 dark:text-gray-200">
                    {branchSummary.latestTurn.prompt}
                </div>
            </>
        ),
        [
            effectiveBranchContinuationSourceByBranchOriginId,
            getBranchAccentClassName,
            getShortTurnId,
            t,
        ],
    );

    const buildSelectedItemSummaryStripProps = useCallback(
        (selectedItem: SelectedItemModel | null): SelectedItemSummaryStripProps | null => {
            if (!selectedItem) {
                return null;
            }

            const chips: SelectedItemSummaryStripChip[] = [];

            if (selectedItem.item.status === 'failed') {
                chips.push({
                    key: 'failed',
                    group: 'status',
                    label: t('lblHistoryFailed'),
                });
            }

            if (selectedItem.isStageSource) {
                chips.push({
                    key: 'stage-source',
                    group: 'status',
                    label: t('workspacePickerStageSource'),
                });
            }

            if (selectedItem.isContinuationSource) {
                chips.push({
                    key: 'continuation-source',
                    group: 'status',
                    label: t('historyBranchContinuationSource'),
                });
            }

            chips.push(
                {
                    key: 'branch',
                    group: 'core',
                    label: selectedItem.branchLabel,
                },
                {
                    key: 'lineage-action',
                    group: 'core',
                    label: getLineageActionLabel(selectedItem.item.lineageAction),
                },
                {
                    key: 'model',
                    group: 'core',
                    label: compactSelectedItemModelLabelByModel[selectedItem.item.model] || selectedItem.item.model,
                },
                {
                    key: 'size',
                    group: 'core',
                    label: selectedItem.item.size,
                },
                {
                    key: 'aspect-ratio',
                    group: 'core',
                    label: selectedItem.item.aspectRatio,
                },
            );

            const queuedBatchPositionLabel = getQueuedBatchPositionLabel(selectedItem.historyId);
            if (queuedBatchPositionLabel) {
                chips.push({
                    key: 'queued-batch-position',
                    group: 'tail',
                    label: queuedBatchPositionLabel,
                });
            }

            const conversationCue = getConversationCue(selectedItem.item);
            if (conversationCue.isMemoryTurn) {
                chips.push({
                    key: 'memory',
                    group: 'tail',
                    label: t('historyBadgeMemory'),
                });
            }

            if (conversationCue.threadLabel) {
                chips.push({
                    key: 'thread',
                    group: 'tail',
                    label: conversationCue.threadLabel,
                });
            }

            const modeLabel = selectedItem.item.mode?.trim();
            if (modeLabel && modeLabel !== t('historyModeImage')) {
                chips.push({
                    key: 'mode',
                    group: 'tail',
                    label: modeLabel,
                });
            }

            chips.push({
                key: 'created-at',
                group: 'tail',
                label: new Date(selectedItem.item.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                }),
            });

            return {
                selectedItem,
                chips,
            };
        },
        [getConversationCue, getLineageActionLabel, getQueuedBatchPositionLabel, t],
    );

    return {
        buildSelectedItemSummaryStripProps,
        renderHistoryActionButton,
        renderHistoryTurnSnapshotContent,
        renderHistoryTurnActionRow,
        renderHistoryTurnBadges,
        renderActiveBranchSummaryContent,
    };
}
