import React from 'react';
import { WorkspaceImportReviewState } from '../hooks/useWorkspaceSnapshotActions';
import { WORKSPACE_OVERLAY_Z_INDEX } from '../constants/workspaceOverlays';
import { BranchSummary } from '../utils/lineage';
import { GeneratedImage } from '../types';
import { getExecutionModeLabel } from '../utils/executionMode';
import { getTranslation, Language } from '../utils/translations';
import InfoTooltip from './InfoTooltip';
import ThemeToggle from './ThemeToggle';
import WorkspaceModalFrame from './WorkspaceModalFrame';

type WorkspaceImportReviewProps = {
    currentLanguage: Language;
    review: WorkspaceImportReviewState;
    importedBranchSummaries: BranchSummary[];
    importedLatestTurn: GeneratedImage | null;
    importedLatestSuccessfulTurn: GeneratedImage | null;
    isPromotedContinuationSource?: (item: GeneratedImage) => boolean;
    getContinueActionLabel?: (item: GeneratedImage) => string;
    onClose: () => void;
    onMerge: () => void;
    onReplace: () => void;
    onReplaceAndOpenLatest?: () => void;
    onReplaceAndContinueLatest?: () => void;
    onReplaceAndBranchLatest?: () => void;
    onReplaceAndOpenBranchLatest?: (branchOriginId: string) => void;
    onReplaceAndContinueBranchLatest?: (branchOriginId: string) => void;
    onReplaceAndBranchFromBranchLatest?: (branchOriginId: string) => void;
};

const WorkspaceImportReview: React.FC<WorkspaceImportReviewProps> = ({
    currentLanguage,
    review,
    importedBranchSummaries,
    importedLatestTurn,
    importedLatestSuccessfulTurn,
    isPromotedContinuationSource,
    getContinueActionLabel,
    onClose,
    onMerge,
    onReplace,
    onReplaceAndOpenLatest,
    onReplaceAndContinueLatest,
    onReplaceAndBranchLatest,
    onReplaceAndOpenBranchLatest,
    onReplaceAndContinueBranchLatest,
    onReplaceAndBranchFromBranchLatest,
}) => {
    const t = (key: string) => getTranslation(currentLanguage, key);
    const neutralActionButtonClassName = 'nbu-control-button px-4 py-2 text-sm font-semibold';
    const primaryActionClassName =
        'rounded-full bg-amber-500 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-amber-600';
    const continueActionClassName =
        'rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-800 hover:border-amber-300 hover:bg-amber-100 dark:border-amber-500/20 dark:bg-amber-950/20 dark:text-amber-100 dark:hover:border-amber-500/40 dark:hover:bg-amber-950/30';
    const secondaryActionClassName = 'nbu-control-button px-3 py-1.5 text-[11px] font-semibold';
    const locale = currentLanguage === 'zh_TW' ? 'zh-TW' : currentLanguage === 'zh_CN' ? 'zh-CN' : currentLanguage;

    const formatDateTime = (value: string) => new Date(value).toLocaleString(locale);
    const renderPromptPreview = (value?: string | null, limit = 120) => {
        if (!value) {
            return t('workspaceImportReviewNoPromptSaved');
        }

        return value.length > limit ? `${value.slice(0, limit).trimEnd()}...` : value;
    };
    const getModeLabel = (mode?: string | null) => {
        if (!mode) {
            return '';
        }

        const normalized = mode.toLowerCase();
        if (normalized.includes('text')) {
            return t('modeTextToImg');
        }

        if (normalized.includes('image to') || normalized.includes('img2img')) {
            return t('modeImgToImg');
        }

        return mode;
    };

    const getExecutionLabel = (item: GeneratedImage) => {
        switch (item.executionMode) {
            case 'interactive-batch-variants':
                return t('workspaceImportReviewExecutionBatchVariants');
            case 'chat-continuation':
                return t('workspaceImportReviewExecutionChatContinuation');
            case 'queued-batch-job':
                return t('workspaceImportReviewExecutionQueuedBatchJob');
            case 'single-turn':
            default:
                return t('workspaceImportReviewExecutionSingleTurn');
        }
    };
    const getImportContinueLabel = (item: GeneratedImage) => {
        const resolvedLabel = getContinueActionLabel?.(item);
        return resolvedLabel && resolvedLabel !== t('lineageActionContinue')
            ? resolvedLabel
            : t('workspaceImportReviewContinueLatest');
    };
    const renderRouteGuide = (tone: 'neutral' | 'amber' = 'neutral') => {
        const eyebrowClassName =
            tone === 'amber'
                ? 'text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-200'
                : 'text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400';

        return (
            <div className="mb-3">
                <div className={`flex items-center gap-2 ${eyebrowClassName}`}>
                    <span>{t('workspaceImportReviewChooseRoute')}</span>
                    <InfoTooltip
                        dataTestId={`import-review-route-guide-hint-${tone}`}
                        buttonLabel={t('workspaceImportReviewChooseRouteHint')}
                        content={t('workspaceImportReviewChooseRouteHint')}
                        align="right"
                    />
                </div>
            </div>
        );
    };
    const renderRouteGroup = (
        title: string,
        hint: string,
        children: React.ReactNode,
        tone: 'neutral' | 'amber' = 'neutral',
        testId?: string,
    ) => {
        const className =
            tone === 'amber'
                ? 'rounded-2xl border border-amber-200/80 bg-amber-50/60 p-3 dark:border-amber-500/20 dark:bg-amber-950/10'
                : 'rounded-2xl border border-gray-200 bg-white/80 p-3 dark:border-gray-700 dark:bg-[#0d1117]/70';
        const eyebrowClassName =
            tone === 'amber'
                ? 'text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-200'
                : 'text-[10px] font-bold uppercase tracking-[0.16em] text-gray-600 dark:text-gray-300';

        return (
            <div data-testid={testId} className={className}>
                <div className={`flex items-center gap-2 ${eyebrowClassName}`}>
                    <span>{title}</span>
                    <InfoTooltip
                        dataTestId={testId ? `${testId}-hint` : undefined}
                        buttonLabel={hint}
                        content={hint}
                        align="right"
                    />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">{children}</div>
            </div>
        );
    };

    return (
        <WorkspaceModalFrame
            dataTestId="workspace-import-review"
            zIndex={WORKSPACE_OVERLAY_Z_INDEX.importReview}
            maxWidthClass="max-w-4xl"
            onClose={onClose}
            closeLabel={t('branchRenameClose')}
            eyebrow={t('workspaceImportReviewEyebrow')}
            title={t('workspaceImportReviewTitle')}
            headerExtra={
                <div className="mt-4 flex items-center gap-3">
                    <ThemeToggle currentLanguage={currentLanguage} className="h-9 w-9" />
                </div>
            }
            backdropClassName="bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.16),_transparent_36%),rgba(15,23,42,0.7)] backdrop-blur-md"
            panelClassName="max-h-[calc(100vh-2rem)] overflow-y-auto border border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,252,246,0.98),rgba(255,247,232,0.96))] p-6 shadow-[0_32px_120px_rgba(15,23,42,0.28)] dark:border-amber-500/18 dark:bg-[linear-gradient(180deg,rgba(20,16,12,0.98),rgba(10,14,20,0.97))] dark:shadow-[0_32px_120px_rgba(0,0,0,0.48)]"
            headerClassName="flex flex-wrap items-start justify-between gap-4 border-b border-amber-100 pb-5 dark:border-amber-500/10"
            containerClassName="items-start justify-center overflow-y-auto sm:items-center"
        >
            <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-2xl border border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,250,240,0.96),rgba(255,244,227,0.92))] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:border-amber-500/18 dark:bg-[linear-gradient(180deg,rgba(56,38,11,0.42),rgba(28,22,14,0.38))] dark:shadow-[inset_0_1px_0_rgba(255,244,214,0.04)]">
                    <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-200">
                        {t('workspaceImportReviewFile')}
                    </div>
                    <div className="mt-2 break-all text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {review.fileName}
                    </div>
                </div>
                <div className="rounded-2xl border border-gray-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(247,250,252,0.92))] px-4 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.06)] dark:border-gray-700/80 dark:bg-[linear-gradient(180deg,rgba(23,28,36,0.94),rgba(14,18,24,0.9))] dark:shadow-[0_12px_30px_rgba(0,0,0,0.22)]">
                    <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                        {t('workspaceImportReviewTurns')}
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">
                        {review.snapshot.history.length}
                    </div>
                </div>
                <div className="rounded-2xl border border-gray-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(247,250,252,0.92))] px-4 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.06)] dark:border-gray-700/80 dark:bg-[linear-gradient(180deg,rgba(23,28,36,0.94),rgba(14,18,24,0.9))] dark:shadow-[0_12px_30px_rgba(0,0,0,0.22)]">
                    <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                        {t('workspaceImportReviewBranches')}
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">
                        {importedBranchSummaries.length}
                    </div>
                </div>
                <div className="rounded-2xl border border-gray-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(247,250,252,0.92))] px-4 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.06)] dark:border-gray-700/80 dark:bg-[linear-gradient(180deg,rgba(23,28,36,0.94),rgba(14,18,24,0.9))] dark:shadow-[0_12px_30px_rgba(0,0,0,0.22)]">
                    <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                        {t('workspaceImportReviewStagedAssets')}
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">
                        {review.snapshot.stagedAssets.length}
                    </div>
                </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                <div className="rounded-[28px] border border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,250,240,0.94),rgba(255,245,230,0.9))] p-5 shadow-[0_18px_48px_rgba(245,158,11,0.1)] dark:border-amber-500/18 dark:bg-[linear-gradient(180deg,rgba(56,38,11,0.4),rgba(20,19,24,0.92))] dark:shadow-[0_18px_48px_rgba(0,0,0,0.22)]">
                    <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-200">
                        {t('workspaceImportReviewSnapshotSummary')}
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(250,250,252,0.88))] px-4 py-3 shadow-[0_14px_35px_rgba(15,23,42,0.06)] dark:border-gray-700/80 dark:bg-[linear-gradient(180deg,rgba(23,28,36,0.92),rgba(14,18,24,0.9))]">
                            <div className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                                {t('workspaceImportReviewViewerImages')}
                            </div>
                            <div className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {review.snapshot.viewState.generatedImageUrls.length}
                            </div>
                        </div>
                        <div className="rounded-2xl border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(250,250,252,0.88))] px-4 py-3 shadow-[0_14px_35px_rgba(15,23,42,0.06)] dark:border-gray-700/80 dark:bg-[linear-gradient(180deg,rgba(23,28,36,0.92),rgba(14,18,24,0.9))]">
                            <div className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                                {t('promptLabel')}
                            </div>
                            <div className="mt-2 line-clamp-3 text-sm text-gray-700 dark:text-gray-200">
                                {review.snapshot.composerState.prompt || t('workspaceImportReviewNoPromptSaved')}
                            </div>
                        </div>
                        <div className="rounded-2xl border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(250,250,252,0.88))] px-4 py-3 shadow-[0_14px_35px_rgba(15,23,42,0.06)] dark:border-gray-700/80 dark:bg-[linear-gradient(180deg,rgba(23,28,36,0.92),rgba(14,18,24,0.9))]">
                            <div className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                                {t('workspaceImportReviewLatestTurn')}
                            </div>
                            <div className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {importedLatestTurn
                                    ? formatDateTime(importedLatestTurn.createdAt)
                                    : t('workspaceImportReviewNoTurnsSaved')}
                            </div>
                            {importedLatestTurn?.mode && (
                                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    {t('workspaceImportReviewMode')}: {getModeLabel(importedLatestTurn.mode)}
                                </div>
                            )}
                            {importedLatestTurn && (
                                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    {t('workspaceImportReviewExecution')}: {getExecutionLabel(importedLatestTurn)}
                                </div>
                            )}
                        </div>
                        <div className="rounded-2xl border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(250,250,252,0.88))] px-4 py-3 shadow-[0_14px_35px_rgba(15,23,42,0.06)] dark:border-gray-700/80 dark:bg-[linear-gradient(180deg,rgba(23,28,36,0.92),rgba(14,18,24,0.9))]">
                            <div className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                                {t('workspaceImportReviewSessionContinuity')}
                            </div>
                            <div className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {review.snapshot.workspaceSession.source || t('workspaceImportReviewNotActive')}
                            </div>
                            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {review.snapshot.workspaceSession.provenanceMode
                                    ? t('workspaceImportReviewProvenance').replace(
                                          '{0}',
                                          review.snapshot.workspaceSession.provenanceMode,
                                      )
                                    : t('workspaceImportReviewNoProvenance')}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rounded-[28px] border border-gray-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(245,248,251,0.9))] p-5 shadow-[0_16px_48px_rgba(15,23,42,0.08)] dark:border-gray-700/80 dark:bg-[linear-gradient(180deg,rgba(23,28,36,0.94),rgba(14,18,24,0.9))] dark:shadow-[0_16px_48px_rgba(0,0,0,0.28)]">
                    <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                        {t('workspaceImportReviewBranchPreview')}
                    </div>
                    <div className="mt-3 space-y-2">
                        {importedBranchSummaries.length > 0 ? (
                            importedBranchSummaries.slice(0, 4).map((branch) => (
                                <div
                                    key={branch.branchOriginId}
                                    data-testid={`import-review-branch-details-${branch.branchOriginId}`}
                                    className="rounded-2xl border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(250,250,252,0.88))] px-4 py-3 shadow-[0_14px_35px_rgba(15,23,42,0.06)] dark:border-gray-700/80 dark:bg-[linear-gradient(180deg,rgba(23,28,36,0.92),rgba(14,18,24,0.9))]"
                                >
                                    <div
                                        data-testid={`import-review-branch-summary-${branch.branchOriginId}`}
                                        className="flex items-start justify-between gap-3"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                    {branch.branchLabel}
                                                </div>
                                                {isPromotedContinuationSource?.(branch.latestTurn) && (
                                                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200">
                                                        {t('workspaceImportReviewSource')}
                                                    </span>
                                                )}
                                                {!isPromotedContinuationSource?.(branch.latestTurn) &&
                                                    branch.latestTurn.variantGroupId && (
                                                        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-violet-700 dark:bg-violet-950/30 dark:text-violet-200">
                                                            {t('workspaceImportReviewCandidate')}
                                                        </span>
                                                    )}
                                            </div>
                                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                                                <span>
                                                    {t('workspaceRestoreTurns').replace(
                                                        '{0}',
                                                        String(branch.turnCount),
                                                    )}
                                                </span>
                                                <span>
                                                    {t('workspaceImportReviewLatest')}:{' '}
                                                    {formatDateTime(branch.updatedAt)}
                                                </span>
                                            </div>
                                            <div className="mt-2 text-sm leading-6 text-gray-700 dark:text-gray-200">
                                                {renderPromptPreview(branch.latestTurn.prompt)}
                                            </div>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                                            <span>
                                                {t('workspaceImportReviewLatestId').replace(
                                                    '{0}',
                                                    branch.latestTurn.id.slice(0, 8),
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-3 border-t border-gray-200/80 pt-3 dark:border-gray-800">
                                        <div className="text-sm leading-6 text-gray-700 dark:text-gray-200">
                                            {branch.latestTurn.prompt}
                                        </div>
                                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                            {getModeLabel(branch.latestTurn.mode)} ·{' '}
                                            {getExecutionLabel(branch.latestTurn)} ·{' '}
                                            {t('workspaceImportReviewLatestId').replace(
                                                '{0}',
                                                branch.latestTurn.id.slice(0, 8),
                                            )}
                                        </div>
                                        {(onReplaceAndOpenBranchLatest ||
                                            onReplaceAndContinueBranchLatest ||
                                            onReplaceAndBranchFromBranchLatest) && (
                                            <div className="mt-3 rounded-2xl border border-dashed border-gray-200/80 bg-[linear-gradient(180deg,rgba(247,250,252,0.88),rgba(241,245,249,0.82))] p-3 dark:border-gray-700/80 dark:bg-[linear-gradient(180deg,rgba(17,22,31,0.88),rgba(12,16,23,0.82))]">
                                                {renderRouteGuide()}
                                                <div className="grid gap-3 lg:grid-cols-2">
                                                    {onReplaceAndOpenBranchLatest &&
                                                        renderRouteGroup(
                                                            t('workspaceImportReviewHistoryRouteGroup'),
                                                            t('workspaceImportReviewHistoryRouteHint'),
                                                            <button
                                                                data-testid={`import-review-branch-open-${branch.branchOriginId}`}
                                                                type="button"
                                                                onClick={() =>
                                                                    onReplaceAndOpenBranchLatest(branch.branchOriginId)
                                                                }
                                                                className={continueActionClassName}
                                                            >
                                                                {t('workspaceImportReviewOpenLatest')}
                                                            </button>,
                                                            'neutral',
                                                            `import-review-branch-history-group-${branch.branchOriginId}`,
                                                        )}
                                                    {(onReplaceAndContinueBranchLatest ||
                                                        onReplaceAndBranchFromBranchLatest) &&
                                                        renderRouteGroup(
                                                            t('workspaceImportReviewActiveRouteGroup'),
                                                            t('workspaceImportReviewActiveRouteHint'),
                                                            <>
                                                                {onReplaceAndContinueBranchLatest && (
                                                                    <button
                                                                        data-testid={`import-review-branch-continue-${branch.branchOriginId}`}
                                                                        type="button"
                                                                        onClick={() =>
                                                                            onReplaceAndContinueBranchLatest(
                                                                                branch.branchOriginId,
                                                                            )
                                                                        }
                                                                        className={primaryActionClassName}
                                                                    >
                                                                        {getImportContinueLabel(branch.latestTurn)}
                                                                    </button>
                                                                )}
                                                                {onReplaceAndBranchFromBranchLatest && (
                                                                    <button
                                                                        data-testid={`import-review-branch-branch-${branch.branchOriginId}`}
                                                                        type="button"
                                                                        onClick={() =>
                                                                            onReplaceAndBranchFromBranchLatest(
                                                                                branch.branchOriginId,
                                                                            )
                                                                        }
                                                                        className={secondaryActionClassName}
                                                                    >
                                                                        {t('workspaceImportReviewBranchLatest')}
                                                                    </button>
                                                                )}
                                                            </>,
                                                            'neutral',
                                                            `import-review-branch-active-group-${branch.branchOriginId}`,
                                                        )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                                {t('workspaceImportReviewNoBranchLineage')}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {importedLatestSuccessfulTurn && (
                <div
                    data-testid="import-review-replace-latest-details"
                    className="mt-5 rounded-[28px] border border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,250,240,0.94),rgba(255,245,230,0.9))] p-5 shadow-[0_18px_40px_rgba(245,158,11,0.12)] dark:border-amber-500/20 dark:bg-[linear-gradient(180deg,rgba(56,38,11,0.4),rgba(20,19,24,0.92))] dark:shadow-none"
                >
                    <div
                        data-testid="import-review-replace-latest-summary"
                        className="flex items-start justify-between gap-4"
                    >
                        <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-600 dark:text-amber-300">
                                {t('workspaceImportReviewDirectReplacePath')}
                            </div>
                            <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {t('workspaceImportReviewDirectReplaceTitle')}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                                <span>{formatDateTime(importedLatestSuccessfulTurn.createdAt)}</span>
                                <span>{getExecutionLabel(importedLatestSuccessfulTurn)}</span>
                            </div>
                            <div className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                                {renderPromptPreview(importedLatestSuccessfulTurn.prompt)}
                            </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 text-xs text-amber-700 dark:text-amber-200">
                            {isPromotedContinuationSource?.(importedLatestSuccessfulTurn) && (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200">
                                    {t('workspaceImportReviewSource')}
                                </span>
                            )}
                            {!isPromotedContinuationSource?.(importedLatestSuccessfulTurn) &&
                                importedLatestSuccessfulTurn.variantGroupId && (
                                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-violet-700 dark:bg-violet-950/30 dark:text-violet-200">
                                        {t('workspaceImportReviewCandidate')}
                                    </span>
                                )}
                        </div>
                    </div>
                    <div className="mt-3 border-t border-amber-200/80 pt-3 dark:border-amber-500/20">
                        <div className="text-sm leading-6 text-gray-600 dark:text-gray-300">
                            {importedLatestSuccessfulTurn.prompt}
                        </div>
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            {getModeLabel(importedLatestSuccessfulTurn.mode)} ·{' '}
                            {getExecutionLabel(importedLatestSuccessfulTurn)} ·{' '}
                            {formatDateTime(importedLatestSuccessfulTurn.createdAt)}
                        </div>
                        <div className="mt-3 rounded-2xl border border-dashed border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(250,250,252,0.84))] p-3 dark:border-amber-500/20 dark:bg-[linear-gradient(180deg,rgba(24,21,18,0.9),rgba(14,18,24,0.86))]">
                            {renderRouteGuide('amber')}
                            <div className="grid gap-3 lg:grid-cols-2">
                                {onReplaceAndOpenLatest &&
                                    renderRouteGroup(
                                        t('workspaceImportReviewHistoryRouteGroup'),
                                        t('workspaceImportReviewHistoryRouteHint'),
                                        <button
                                            data-testid="import-review-replace-open-latest"
                                            type="button"
                                            onClick={onReplaceAndOpenLatest}
                                            className={continueActionClassName}
                                        >
                                            {t('workspaceImportReviewReplaceOpenLatest')}
                                        </button>,
                                        'amber',
                                        'import-review-replace-history-group',
                                    )}
                                {(onReplaceAndContinueLatest || onReplaceAndBranchLatest) &&
                                    renderRouteGroup(
                                        t('workspaceImportReviewActiveRouteGroup'),
                                        t('workspaceImportReviewActiveRouteHint'),
                                        <>
                                            {onReplaceAndContinueLatest && (
                                                <button
                                                    data-testid="import-review-replace-continue-latest"
                                                    type="button"
                                                    onClick={onReplaceAndContinueLatest}
                                                    className={primaryActionClassName}
                                                >
                                                    {t('workspaceImportReviewReplaceContinueLatest').replace(
                                                        '{0}',
                                                        getImportContinueLabel(importedLatestSuccessfulTurn),
                                                    )}
                                                </button>
                                            )}
                                            {onReplaceAndBranchLatest && (
                                                <button
                                                    data-testid="import-review-replace-branch-latest"
                                                    type="button"
                                                    onClick={onReplaceAndBranchLatest}
                                                    className={secondaryActionClassName}
                                                >
                                                    {t('workspaceImportReviewReplaceBranchLatest')}
                                                </button>
                                            )}
                                        </>,
                                        'amber',
                                        'import-review-replace-active-group',
                                    )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200/80 pt-5 dark:border-gray-800">
                <div className="max-w-2xl text-xs leading-5 text-gray-500 dark:text-gray-400">
                    {t('workspaceImportReviewFooterHint')}
                </div>
                <button type="button" onClick={onClose} className={neutralActionButtonClassName}>
                    {t('clearHistoryCancel')}
                </button>
                <button type="button" onClick={onMerge} className={neutralActionButtonClassName}>
                    {t('workspaceImportReviewMergeTurnsOnly')}
                </button>
                <button
                    type="button"
                    onClick={onReplace}
                    className="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
                >
                    {t('workspaceImportReviewReplaceCurrentWorkspace')}
                </button>
            </div>
        </WorkspaceModalFrame>
    );
};

export default WorkspaceImportReview;
