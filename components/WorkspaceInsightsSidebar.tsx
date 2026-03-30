import React from 'react';
import { GeneratedImage, QueuedBatchJob, StageAsset, TurnLineageAction } from '../types';
import { getTranslation, Language } from '../utils/translations';
import { BranchSummary } from '../utils/lineage';
import { getWorkflowEntryLabelKey } from '../utils/workflowTimeline';
import InfoTooltip from './InfoTooltip';
import WorkspaceInsightsHeaderSummary from './WorkspaceInsightsHeaderSummary';

type WorkflowEntryLike = {
    timestamp?: string | null;
    displayMessage: string;
    label: string;
    stage: 'system' | 'input' | 'request' | 'processing' | 'output' | 'history' | 'error';
};

type LineageRootGroup = {
    rootId: string;
    branches: Array<{
        branchOriginId: string;
        branchLabel: string;
        turns: GeneratedImage[];
    }>;
};
type WorkspaceInsightsSidebarProps = {
    currentLanguage: Language;
    showHeader?: boolean;
    provenancePanel?: React.ReactNode;
    provenanceStatusLabel?: string | null;
    latestWorkflowEntry: WorkflowEntryLike | null;
    isGenerating: boolean;
    batchProgress: {
        completed: number;
        total: number;
    };
    queuedJobs: QueuedBatchJob[];
    resultStatusSummary?: string | null;
    resultStatusTone?: 'warning' | 'success' | null;
    thoughtsText?: string | null;
    thoughtsPlaceholder?: string | null;
    currentStageAsset: StageAsset | null;
    currentStageBranchSummary: BranchSummary | null;
    currentStageSourceTurn: GeneratedImage | null;
    currentStageSourceHistoryId: string | null;
    activeBranchSummary: BranchSummary | null;
    sessionContinuitySignals: string[];
    conversationSummary: {
        conversationIdShort: string;
        branchLabel: string;
        activeSourceShortId: string;
        activeTurnNumber: number | null;
        turnCount: number;
        isCurrentStageSource: boolean;
    } | null;
    conversationSourceTurn: GeneratedImage | null;
    sessionSourceTurn: GeneratedImage | null;
    branchLabelByTurnId: Record<string, string>;
    onHistorySelect: (item: GeneratedImage) => void;
    getStageOriginLabel: (origin?: StageAsset['origin']) => string;
    getLineageActionLabel: (action?: TurnLineageAction) => string;
    getLineageActionDescription: (action?: TurnLineageAction) => string;
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
};

function WorkspaceInsightsSidebar({
    currentLanguage,
    showHeader = true,
    provenancePanel,
    provenanceStatusLabel,
    latestWorkflowEntry,
    isGenerating,
    batchProgress,
    queuedJobs,
    resultStatusSummary,
    resultStatusTone,
    thoughtsText = null,
    thoughtsPlaceholder = null,
    currentStageAsset,
    currentStageBranchSummary,
    currentStageSourceTurn,
    currentStageSourceHistoryId,
    activeBranchSummary,
    sessionContinuitySignals,
    conversationSummary,
    conversationSourceTurn,
    sessionSourceTurn,
    branchLabelByTurnId,
    onHistorySelect,
    getStageOriginLabel,
    getLineageActionLabel,
    getLineageActionDescription,
    getShortTurnId,
    getBranchAccentClassName,
    renderHistoryTurnSnapshotContent,
    renderHistoryTurnBadges,
    renderHistoryTurnActionRow,
}: WorkspaceInsightsSidebarProps) {
    const t = (key: string) => getTranslation(currentLanguage, key);
    const activeQueueStates = new Set(['JOB_STATE_PENDING', 'JOB_STATE_RUNNING']);
    const issueQueueStates = new Set(['JOB_STATE_FAILED', 'JOB_STATE_CANCELLED', 'JOB_STATE_EXPIRED']);
    const sourceActionShellClassName = 'nbu-dashed-panel p-3';
    const sectionCardClassName = 'nbu-soft-well px-4 py-3';
    const collapsibleSectionClassName = 'group nbu-inline-panel px-4 py-3';
    const detailSurfaceClassName =
        'nbu-inline-panel px-3 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.05)] dark:shadow-none';
    const inlineSurfaceClassName = 'nbu-inline-panel px-3 py-3';
    const dashedSurfaceClassName = 'nbu-dashed-panel p-3';
    const quietMonoPillClassName = 'nbu-quiet-pill px-2 py-0.5 text-[10px] font-mono';
    const activeQueueCount = queuedJobs.filter((job) => activeQueueStates.has(job.state)).length;
    const importReadyQueueCount = queuedJobs.filter(
        (job) => job.state === 'JOB_STATE_SUCCEEDED' && job.importedAt == null,
    ).length;
    const issueQueueCount = queuedJobs.filter((job) => issueQueueStates.has(job.state)).length;
    const hasQueueWorkflowSummary = activeQueueCount > 0 || issueQueueCount > 0 || importReadyQueueCount > 0;
    const workflowStatusLabel = latestWorkflowEntry ? t(getWorkflowEntryLabelKey(latestWorkflowEntry)) : null;
    const workflowHeadline = isGenerating
        ? t('statusGenerating')
        : latestWorkflowEntry?.displayMessage || t('workflowStatusIdle');
    const workflowDetailMessage = latestWorkflowEntry?.displayMessage || t('workspacePanelStatusReserved');
    const shouldShowWorkflowDetailMessage = workflowDetailMessage !== workflowHeadline;
    const thoughtsBodyText = thoughtsText || thoughtsPlaceholder || null;
    const resultStatusClassName =
        resultStatusTone === 'warning'
            ? 'rounded-2xl border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-500/20 dark:bg-amber-950/20 dark:text-amber-200'
            : 'rounded-2xl border border-emerald-200/80 bg-emerald-50/90 px-3 py-2 text-xs font-medium text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-950/20 dark:text-emerald-200';
    const continuitySourceLabels = [
        conversationSummary ? t('workspaceInsightsOfficialConversation') : null,
        sessionSourceTurn ? t('workspaceInsightsSessionSource') : null,
    ].filter((label): label is string => Boolean(label));
    const continuitySourceCount = continuitySourceLabels.length;

    const renderPromptPreview = (value?: string | null) => {
        const preview = value?.trim();
        if (!preview) {
            return null;
        }

        return preview.length > 72 ? `${preview.slice(0, 72)}...` : preview;
    };
    const renderOwnerRouteActionShell = (actionRow: React.ReactNode, testId?: string) => (
        <div data-testid={testId} className={`${sourceActionShellClassName} space-y-3`}>
            <div className="flex items-center gap-2">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-200">
                    {t('historyActionOwnerRoute')}
                </div>
                <InfoTooltip
                    content={t('historyActionOwnerRouteHint')}
                    buttonLabel={t('historyActionOwnerRoute')}
                    dataTestId={testId ? `${testId}-hint` : undefined}
                />
            </div>
            <div className="flex flex-wrap gap-2">{actionRow}</div>
        </div>
    );

    const renderCompactSourceDetails = ({
        testId,
        eyebrow,
        label,
        item,
        badges,
        actionRow,
    }: {
        testId: string;
        eyebrow?: string | null;
        label: string;
        item: GeneratedImage;
        badges: React.ReactNode;
        actionRow?: React.ReactNode;
    }) => (
        <div data-testid={testId} className={`mt-3 ${collapsibleSectionClassName} space-y-3`}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    {eyebrow ? (
                        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                            {eyebrow}
                        </div>
                    ) : null}
                    <div
                        className={`${eyebrow ? 'mt-1' : ''} flex flex-wrap items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400`}
                    >
                        <span className="nbu-chip px-2 py-0.5 font-mono">{getShortTurnId(item.id)}</span>
                        <span>{label}</span>
                    </div>
                    {renderPromptPreview(item.prompt) && (
                        <div className="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-400">
                            {renderPromptPreview(item.prompt)}
                        </div>
                    )}
                </div>
            </div>
            <div className={detailSurfaceClassName}>
                {renderHistoryTurnSnapshotContent({
                    item,
                    badges,
                })}
            </div>
            {actionRow ? renderOwnerRouteActionShell(actionRow) : null}
        </div>
    );

    const continuitySourceCards = (
        <>
            {conversationSummary && (
                <div
                    data-testid="conversation-continuity-card"
                    className="nbu-context-rail-callout rounded-2xl border px-3 py-3"
                >
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                            {t('workspaceInsightsOfficialConversation')}
                        </div>
                        <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-mono text-sky-700 dark:bg-sky-950/30 dark:text-sky-200">
                            {conversationSummary.conversationIdShort}
                        </span>
                        <span className="nbu-chip px-2 py-0.5 text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                            {t('workspaceInsightsTurnsCount').replace('{0}', String(conversationSummary.turnCount))}
                        </span>
                        {conversationSummary.activeTurnNumber !== null && (
                            <span
                                data-testid="conversation-turn-position-badge"
                                className="nbu-chip px-2 py-0.5 text-[10px] font-semibold text-gray-500 dark:text-gray-400"
                            >
                                {t('workspaceInsightsConversationTurnPosition').replace(
                                    '{0}',
                                    String(conversationSummary.activeTurnNumber),
                                )}
                            </span>
                        )}
                        {conversationSummary.isCurrentStageSource && (
                            <span
                                data-testid="conversation-stage-source-badge"
                                className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
                            >
                                {t('workflowCurrentStageSource')}
                            </span>
                        )}
                    </div>
                    <div className="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-400">
                        {t('workspaceInsightsConversationBranchActiveSource')
                            .replace('{0}', conversationSummary.branchLabel)
                            .replace('{1}', conversationSummary.activeSourceShortId)}
                    </div>
                    {conversationSourceTurn
                        ? renderCompactSourceDetails({
                              testId: 'conversation-continuity-details',
                              label: conversationSummary.branchLabel,
                              item: conversationSourceTurn,
                              badges: renderHistoryTurnBadges({
                                  item: conversationSourceTurn,
                                  variant: 'stage-source',
                              }),
                              actionRow: renderHistoryTurnActionRow({
                                  item: conversationSourceTurn,
                                  openLabel: t('historyActionOpenInHistory'),
                                  continueLabel: null,
                                  branchLabel: null,
                                  testIds: {
                                      open: 'conversation-continuity-open',
                                  },
                              }),
                          })
                        : null}
                </div>
            )}
            {sessionSourceTurn && (
                <div data-testid="session-continuity-source-card" className={inlineSurfaceClassName}>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                            {t('workspaceInsightsSessionSource')}
                        </div>
                        <span className={quietMonoPillClassName}>{getShortTurnId(sessionSourceTurn.id)}</span>
                        {currentStageSourceHistoryId === sessionSourceTurn.id && (
                            <span
                                data-testid="session-continuity-stage-badge"
                                className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
                            >
                                {t('workflowCurrentStageSource')}
                            </span>
                        )}
                    </div>
                    {renderCompactSourceDetails({
                        testId: 'session-continuity-details',
                        label:
                            branchLabelByTurnId[sessionSourceTurn.id] ||
                            currentStageBranchSummary?.branchLabel ||
                            t('historyBranchMain'),
                        item: sessionSourceTurn,
                        badges: renderHistoryTurnBadges({
                            item: sessionSourceTurn,
                            variant: 'stage-source',
                        }),
                        actionRow: renderHistoryTurnActionRow({
                            item: sessionSourceTurn,
                            openLabel: t('historyActionOpenInHistory'),
                            continueLabel: null,
                            branchLabel: null,
                            testIds: {
                                open: 'session-continuity-open',
                            },
                        }),
                    })}
                </div>
            )}
        </>
    );

    return (
        <aside
            data-testid="context-system-panel"
            className="nbu-shell-panel nbu-shell-surface-context-rail overflow-hidden p-4 lg:min-h-0"
        >
            <div className="space-y-5">
                {showHeader ? (
                    <div className="flex items-start justify-between gap-3">
                        <WorkspaceInsightsHeaderSummary currentLanguage={currentLanguage} />
                        <span className="nbu-status-pill">{t('workspaceInsightsPhaseLabel')}</span>
                    </div>
                ) : null}
                <div data-testid="current-work-section" className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <p className="nbu-section-eyebrow">{t('workflowStatusLabel')}</p>
                            <h2 className="mt-1 text-lg font-black text-slate-900 dark:text-slate-100">
                                {t('workspaceInsightsCurrentWork')}
                            </h2>
                        </div>
                        <span className="nbu-status-pill">{workflowStatusLabel || t('workflowStatusIdle')}</span>
                    </div>

                    <div data-testid="context-workflow-summary" className={inlineSurfaceClassName}>
                        <div className="flex items-center justify-between gap-3">
                            <div className="text-xs uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                                {t('workflowStatusLabel')}
                            </div>
                            {latestWorkflowEntry ? <span className="nbu-status-pill">{workflowStatusLabel}</span> : null}
                        </div>
                        <div className="mt-3 space-y-3">
                            <div>
                                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    {workflowHeadline}
                                </div>
                                {shouldShowWorkflowDetailMessage && (
                                    <div
                                        data-testid="context-workflow-message"
                                        className="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-400"
                                    >
                                        {workflowDetailMessage}
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs">
                                {batchProgress.total > 0 && (
                                    <span
                                        data-testid="context-workflow-progress"
                                        className="nbu-chip border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-950/20 dark:text-amber-200"
                                    >
                                        {batchProgress.completed}/{batchProgress.total}
                                    </span>
                                )}
                                {activeQueueCount > 0 && (
                                    <span data-testid="context-workflow-active-queue" className="nbu-chip">
                                        {t('queuedBatchJobsActiveCount').replace('{0}', String(activeQueueCount))}
                                    </span>
                                )}
                                {importReadyQueueCount > 0 && (
                                    <span data-testid="context-workflow-import-ready-queue" className="nbu-chip">
                                        {t('queuedBatchJobsImportReadyCount').replace('{0}', String(importReadyQueueCount))}
                                    </span>
                                )}
                                {issueQueueCount > 0 && (
                                    <span data-testid="context-workflow-issue-queue" className="nbu-chip">
                                        {t('queuedBatchJobsClosedIssuesCount').replace('{0}', String(issueQueueCount))}
                                    </span>
                                )}
                            </div>
                            {resultStatusSummary && (
                                <div data-testid="context-workflow-result-status" className={resultStatusClassName}>
                                    <span className="mr-2 inline-flex rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-current dark:bg-black/20">
                                        {t('stageGroundingResultStatus')}
                                    </span>
                                    <span>{resultStatusSummary}</span>
                                </div>
                            )}
                            {hasQueueWorkflowSummary && (
                                <div data-testid="context-workflow-queue-hint" className={dashedSurfaceClassName}>
                                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                                        {t('queuedBatchJobsTitle')}
                                    </div>
                                    <div className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                                        {t('queuedBatchJobsWorkflowHint')}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {thoughtsBodyText ? (
                        <div data-testid="current-work-thoughts-section" className={inlineSurfaceClassName}>
                            <div className="text-xs uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                                {t('workspaceInsightsLatestThoughts')}
                            </div>
                            <div
                                data-testid="current-work-thoughts-body"
                                className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-700 dark:text-gray-300"
                            >
                                {thoughtsBodyText}
                            </div>
                        </div>
                    ) : null}

                    {activeBranchSummary ? (
                        <button
                            type="button"
                            data-testid="current-version-identity"
                            onClick={() => onHistorySelect(activeBranchSummary.latestTurn)}
                            className={`${inlineSurfaceClassName} w-full text-left transition-colors hover:border-amber-300 dark:hover:border-amber-500/30`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="text-xs uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                                    {t('workspaceInsightsActiveBranch')}
                                </div>
                                <span className="text-[11px] text-gray-400 dark:text-gray-500">
                                    {t('workspaceInsightsTurnsCount').replace('{0}', String(activeBranchSummary.turnCount))}
                                </span>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                <span
                                    className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${getBranchAccentClassName(activeBranchSummary.branchOriginId, activeBranchSummary.branchLabel)}`}
                                >
                                    {activeBranchSummary.branchLabel}
                                </span>
                                <span className="nbu-chip px-2 py-0.5 text-[10px] font-mono text-gray-500 dark:text-gray-400">
                                    {getShortTurnId(activeBranchSummary.latestTurn.id)}
                                </span>
                            </div>
                            <div className="mt-2 line-clamp-2 text-xs leading-5 text-gray-500 dark:text-gray-400">
                                {activeBranchSummary.latestTurn.prompt}
                            </div>
                        </button>
                    ) : null}

                    <div data-testid="current-stage-source" className={inlineSurfaceClassName}>
                        <div className="flex items-center justify-between gap-3">
                            <div className="text-xs uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                                {t('workspaceInsightsCurrentImage')}
                            </div>
                        </div>
                        {currentStageAsset ? (
                            <div className="mt-3 space-y-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="nbu-chip text-[10px] font-bold uppercase tracking-[0.16em]">
                                        {getStageOriginLabel(currentStageAsset.origin)}
                                    </span>
                                    <span className="nbu-chip text-[10px] font-bold uppercase tracking-[0.16em]">
                                        {getLineageActionLabel(currentStageAsset.lineageAction)}
                                    </span>
                                    {currentStageBranchSummary && (
                                        <span
                                            className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${getBranchAccentClassName(currentStageBranchSummary.branchOriginId, currentStageBranchSummary.branchLabel)}`}
                                        >
                                            {currentStageBranchSummary.branchLabel}
                                        </span>
                                    )}
                                    {currentStageSourceTurn && (
                                        <span className="nbu-chip px-2 py-0.5 text-[10px] font-mono text-gray-500 dark:text-gray-400">
                                            {getShortTurnId(currentStageSourceTurn.id)}
                                        </span>
                                    )}
                                </div>
                                <div className="text-xs leading-5 text-gray-500 dark:text-gray-400">
                                    {getLineageActionDescription(currentStageAsset.lineageAction)}
                                </div>
                                {currentStageSourceTurn ? (
                                    renderCompactSourceDetails({
                                        testId: 'current-stage-source-details',
                                        label:
                                            currentStageBranchSummary?.branchLabel ||
                                            getStageOriginLabel(currentStageAsset.origin),
                                        item: currentStageSourceTurn,
                                        badges: renderHistoryTurnBadges({
                                            item: currentStageSourceTurn,
                                            variant: 'stage-source',
                                        }),
                                        actionRow: renderHistoryTurnActionRow({
                                            item: currentStageSourceTurn,
                                            openLabel: t('historyActionOpenInHistory'),
                                            continueLabel: null,
                                            branchLabel: null,
                                            renameLabel: t('workspaceInsightsRenameBranch'),
                                            renameTarget: currentStageBranchSummary?.latestTurn || null,
                                            testIds: {
                                                open: 'current-stage-source-open',
                                                rename: 'current-stage-source-rename',
                                            },
                                        }),
                                    })
                                ) : (
                                    <div className="rounded-2xl border border-dashed border-gray-300 px-3 py-3 text-xs leading-5 text-gray-500 dark:border-gray-700 dark:text-gray-400">
                                        {t('workspaceCurrentStageSourceNoLinkedHistory')}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                {t('workspaceInsightsStageSourceEmpty')}
                            </div>
                        )}
                    </div>

                    <div data-testid="session-continuity-section" className={inlineSurfaceClassName}>
                        <div className="text-xs uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                            {t('workspaceInsightsSessionContinuity')}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {sessionContinuitySignals.length > 0 ? (
                                sessionContinuitySignals.map((signal) => (
                                    <span key={signal} className="nbu-chip">
                                        {signal}
                                    </span>
                                ))
                            ) : (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {t('workspaceInsightsNoContinuitySignals')}
                                </span>
                            )}
                        </div>
                        {continuitySourceCount > 0 && (
                            <div data-testid="continuity-source-section" className="mt-3 space-y-3">
                                {continuitySourceCount > 1 ? (
                                    <div className={`flex items-start justify-between gap-3 ${collapsibleSectionClassName}`}>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-[11px] leading-5 text-gray-500 dark:text-gray-400">
                                                {continuitySourceLabels.join(' · ')}
                                            </div>
                                        </div>
                                        <span className="text-[11px] text-gray-400 dark:text-gray-500">
                                            {t('workspaceInsightsItemsCount').replace('{0}', String(continuitySourceCount))}
                                        </span>
                                    </div>
                                ) : null}
                                <div className="space-y-3">{continuitySourceCards}</div>
                            </div>
                        )}
                    </div>
                </div>
                {provenancePanel ? (
                    <div data-testid="context-provenance-section" className={`${sectionCardClassName} space-y-3`}>
                        <div className="flex items-center justify-between gap-3">
                            <div className="text-xs uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                                {t('workspaceInsightsSourcesCitations')}
                            </div>
                            {provenanceStatusLabel ? <span className="nbu-status-pill">{provenanceStatusLabel}</span> : null}
                        </div>
                        <div>{provenancePanel}</div>
                    </div>
                ) : null}
            </div>
        </aside>
    );
}

export default React.memo(WorkspaceInsightsSidebar);
