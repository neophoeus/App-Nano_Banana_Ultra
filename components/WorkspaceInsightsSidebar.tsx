import React from 'react';
import { GeneratedImage, QueuedBatchJob, StageAsset, TurnLineageAction } from '../types';
import { getTranslation, Language } from '../utils/translations';
import { BranchSummary } from '../utils/lineage';
import { getWorkflowEntryLabelKey, type WorkflowStage } from '../utils/workflowTimeline';
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
type TimelineEntry = {
    timestamp?: string | null;
    message: string;
    displayMessage: string;
    stage: WorkflowStage;
    border: string;
    tone: string;
    icon: string;
    label: string;
    isCurrentStageSourceEntry: boolean;
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
    currentStageAsset: StageAsset | null;
    currentStageBranchSummary: BranchSummary | null;
    currentStageSourceTurn: GeneratedImage | null;
    currentStageSourceHistoryId: string | null;
    activeBranchSummary: BranchSummary | null;
    recentBranchSummaries: BranchSummary[];
    branchSummariesCount: number;
    sessionUpdatedLabel: string;
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
    sessionTurnStack: GeneratedImage[];
    selectedHistoryId: string | null;
    branchLabelByTurnId: Record<string, string>;
    lineageRootGroups: LineageRootGroup[];
    timelineEntries: TimelineEntry[];
    sessionHintEntries: Array<[string, unknown]>;
    onOpenSessionReplay: () => void;
    onHistorySelect: (item: GeneratedImage) => void;
    onRenameBranch: (item: GeneratedImage) => void;
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
    renderActiveBranchSummaryContent: (branchSummary: BranchSummary) => React.ReactNode;
    formatSessionHintKey: (key: string) => string;
    formatSessionHintValue: (value: unknown) => string;
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
    currentStageAsset,
    currentStageBranchSummary,
    currentStageSourceTurn,
    currentStageSourceHistoryId,
    activeBranchSummary,
    recentBranchSummaries,
    branchSummariesCount,
    sessionUpdatedLabel,
    sessionContinuitySignals,
    conversationSummary,
    conversationSourceTurn,
    sessionSourceTurn,
    sessionTurnStack,
    selectedHistoryId,
    branchLabelByTurnId,
    lineageRootGroups,
    timelineEntries,
    sessionHintEntries,
    onOpenSessionReplay,
    onHistorySelect,
    onRenameBranch,
    getStageOriginLabel,
    getLineageActionLabel,
    getLineageActionDescription,
    getShortTurnId,
    getBranchAccentClassName,
    renderHistoryTurnSnapshotContent,
    renderHistoryTurnBadges,
    renderHistoryTurnActionRow,
    renderActiveBranchSummaryContent,
    formatSessionHintKey,
    formatSessionHintValue,
}: WorkspaceInsightsSidebarProps) {
    const t = (key: string) => getTranslation(currentLanguage, key);
    const activeQueueStates = new Set(['JOB_STATE_PENDING', 'JOB_STATE_RUNNING']);
    const issueQueueStates = new Set(['JOB_STATE_FAILED', 'JOB_STATE_CANCELLED', 'JOB_STATE_EXPIRED']);
    const getTimelineEntryLabel = (entry: TimelineEntry) => t(getWorkflowEntryLabelKey(entry));
    const sourceActionShellClassName = 'nbu-dashed-panel p-3';
    const sectionCardClassName = 'nbu-soft-well px-4 py-3';
    const collapsibleSectionClassName = 'group nbu-inline-panel px-4 py-3';
    const detailSurfaceClassName =
        'nbu-inline-panel px-3 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.05)] dark:shadow-none';
    const inlineSurfaceClassName = 'nbu-inline-panel px-3 py-3';
    const dashedSurfaceClassName = 'nbu-dashed-panel p-3';
    const quietMonoPillClassName = 'nbu-quiet-pill px-2 py-0.5 text-[10px] font-mono';
    const compactControlButtonClassName = 'nbu-control-button px-3 py-1.5 text-[11px] font-semibold';
    const nestedSectionDividerClassName = 'border-t border-gray-200/80 pt-4 dark:border-gray-800';
    const latestTimelineEntry = timelineEntries[0] || null;
    const timelineHistoryEntries = timelineEntries.slice(1);
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
                                {t('sessionReplayCurrentStageSource')}
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
                                {t('sessionReplayCurrentStageSource')}
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

    const renderTimelineEntry = (entry: TimelineEntry, index: number) => (
        <div
            data-testid={entry.isCurrentStageSourceEntry ? 'timeline-stage-source-entry' : undefined}
            key={`${entry.timestamp || 'no-time'}-${index}-${entry.message}`}
            className={`rounded-2xl border px-3 py-3 ${entry.isCurrentStageSourceEntry ? 'ring-1 ring-amber-300/80 dark:ring-amber-500/30' : ''} ${entry.border}`}
        >
            <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                    <span className={`shrink-0 text-sm font-bold ${entry.tone}`}>{entry.icon}</span>
                    <span
                        className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${entry.border} ${entry.tone}`}
                    >
                        {getTimelineEntryLabel(entry)}
                    </span>
                    {entry.isCurrentStageSourceEntry && (
                        <span
                            data-testid="timeline-stage-source-badge"
                            className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
                        >
                            {t('sessionReplayCurrentStageSource')}
                        </span>
                    )}
                </div>
                {entry.timestamp && (
                    <span className="shrink-0 text-[11px] text-gray-400 dark:text-gray-500">{entry.timestamp}</span>
                )}
            </div>
            <div className="mt-2 text-sm leading-6 text-gray-700 dark:text-gray-200">{entry.displayMessage}</div>
            {entry.isCurrentStageSourceEntry && currentStageSourceTurn && (
                <div className="mt-3">
                    {renderOwnerRouteActionShell(
                        renderHistoryTurnActionRow({
                            item: currentStageSourceTurn,
                            openLabel: t('historyActionOpenInHistory'),
                            continueLabel: null,
                            branchLabel: null,
                            testIds: {
                                open: 'timeline-source-open',
                            },
                        }),
                    )}
                </div>
            )}
        </div>
    );

    return (
        <aside
            data-testid="context-system-panel"
            className="nbu-shell-panel nbu-shell-surface-context-rail overflow-hidden p-4 lg:min-h-0"
        >
            <div className="flex flex-col gap-5">
                {showHeader ? (
                    <div className="flex items-start justify-between gap-3">
                        <WorkspaceInsightsHeaderSummary currentLanguage={currentLanguage} />
                        <span className="nbu-status-pill">{t('workspaceInsightsPhaseLabel')}</span>
                    </div>
                ) : null}
                <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                    <div data-testid="current-work-section" className={`${sectionCardClassName} space-y-4`}>
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <div className="text-xs uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                                    {t('workspaceInsightsCurrentWork')}
                                </div>
                            </div>
                            <span className="nbu-status-pill">{workflowStatusLabel || t('workflowStatusIdle')}</span>
                        </div>

                        <div data-testid="context-workflow-summary" className={inlineSurfaceClassName}>
                            <div className="flex items-center justify-between gap-3">
                                <div className="text-xs uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                                    {t('workflowStatusLabel')}
                                </div>
                                {latestWorkflowEntry ? (
                                    <span className="nbu-status-pill">{workflowStatusLabel}</span>
                                ) : null}
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
                                            {t('queuedBatchJobsImportReadyCount').replace(
                                                '{0}',
                                                String(importReadyQueueCount),
                                            )}
                                        </span>
                                    )}
                                    {issueQueueCount > 0 && (
                                        <span data-testid="context-workflow-issue-queue" className="nbu-chip">
                                            {t('queuedBatchJobsClosedIssuesCount').replace(
                                                '{0}',
                                                String(issueQueueCount),
                                            )}
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
                                        <div
                                            className={`flex items-start justify-between gap-3 ${collapsibleSectionClassName}`}
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="text-[11px] leading-5 text-gray-500 dark:text-gray-400">
                                                    {continuitySourceLabels.join(' · ')}
                                                </div>
                                            </div>
                                            <span className="text-[11px] text-gray-400 dark:text-gray-500">
                                                {t('workspaceInsightsItemsCount').replace(
                                                    '{0}',
                                                    String(continuitySourceCount),
                                                )}
                                            </span>
                                        </div>
                                    ) : null}
                                    <div className="space-y-3">{continuitySourceCards}</div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div data-testid="versions-section" className={`${sectionCardClassName} space-y-4`}>
                        <div className="flex items-center justify-between gap-3">
                            <div className="text-xs uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                                {t('workspaceInsightsVersions')}
                            </div>
                            <div className="flex flex-wrap items-center justify-end gap-2 text-[11px] text-gray-400 dark:text-gray-500">
                                <span>{sessionUpdatedLabel}</span>
                                <span>
                                    {t('workspaceInsightsBranchesCount').replace('{0}', String(branchSummariesCount))}
                                </span>
                            </div>
                        </div>

                        <div data-testid="active-branch-card" className="space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <div className="text-xs uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                                    {t('workspaceInsightsActiveBranch')}
                                </div>
                                <span className="text-[11px] text-gray-400 dark:text-gray-500">
                                    {t('workspaceInsightsBranchesCount').replace('{0}', String(branchSummariesCount))}
                                </span>
                            </div>
                            {activeBranchSummary ? (
                                <div className="space-y-3">
                                    <div className={inlineSurfaceClassName}>
                                        {renderActiveBranchSummaryContent(activeBranchSummary)}
                                    </div>
                                    {recentBranchSummaries.length > 1 && (
                                        <div
                                            data-testid="active-branch-switcher-section"
                                            className={`${collapsibleSectionClassName} space-y-3`}
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
                                            <div className="flex flex-wrap gap-2 border-t border-gray-200/80 pt-3 dark:border-gray-800">
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
                                    )}
                                </div>
                            ) : (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {t('workspaceInsightsBranchesEmpty')}
                                </div>
                            )}
                        </div>

                        <div className={nestedSectionDividerClassName}>
                            <div data-testid="session-stack-section" className="space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="text-xs uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                                            {t('workspaceInsightsSessionTurnStack')}
                                        </div>
                                        {sessionTurnStack.length > 0 && (
                                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                                                <span className="nbu-chip px-2 py-0.5 font-mono">
                                                    {getShortTurnId(sessionTurnStack[0]?.id)}
                                                </span>
                                                <span>
                                                    {branchLabelByTurnId[sessionTurnStack[0]?.id || ''] ||
                                                        t('historyBranchMain')}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-[11px] text-gray-400 dark:text-gray-500">
                                        {t('workspaceInsightsTurnsCount').replace(
                                            '{0}',
                                            String(sessionTurnStack.length),
                                        )}
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {sessionTurnStack.length > 0 ? (
                                        sessionTurnStack.map((item) => {
                                            const isActiveTurn = selectedHistoryId === item.id;
                                            const isCurrentStageSource = currentStageSourceHistoryId === item.id;
                                            return (
                                                <div
                                                    data-testid={`session-stack-card-${item.id}`}
                                                    key={item.id}
                                                    className={
                                                        isActiveTurn
                                                            ? 'rounded-2xl border border-amber-300 bg-amber-50 px-3 py-3 dark:border-amber-500/40 dark:bg-amber-950/20'
                                                            : inlineSurfaceClassName
                                                    }
                                                >
                                                    {renderHistoryTurnSnapshotContent({
                                                        item,
                                                        badges: renderHistoryTurnBadges({
                                                            item,
                                                            variant: 'session-stack',
                                                            branchLabel:
                                                                branchLabelByTurnId[item.id] || t('historyBranchMain'),
                                                            isCurrentStageSource,
                                                            isActive: isActiveTurn,
                                                        }),
                                                        promptClassName:
                                                            'mt-2 line-clamp-2 text-xs leading-5 text-gray-600 dark:text-gray-300',
                                                        actionRow: (
                                                            <div className="space-y-2">
                                                                {renderOwnerRouteActionShell(
                                                                    renderHistoryTurnActionRow({
                                                                        item,
                                                                        openLabel: t('historyActionOpenInHistory'),
                                                                        continueLabel: null,
                                                                        branchLabel: null,
                                                                        renameLabel: null,
                                                                        testIds: {
                                                                            open: `session-stack-open-${item.id}`,
                                                                        },
                                                                    }),
                                                                    `session-stack-owner-route-${item.id}`,
                                                                )}
                                                                <div className="flex flex-wrap gap-2">
                                                                    {renderHistoryTurnActionRow({
                                                                        item,
                                                                        openLabel: null,
                                                                        continueLabel: null,
                                                                        branchLabel: null,
                                                                        renameTarget: item,
                                                                        testIds: {
                                                                            rename: `session-stack-rename-${item.id}`,
                                                                        },
                                                                    })}
                                                                </div>
                                                            </div>
                                                        ),
                                                    })}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {t('workspaceInsightsSessionTurnStackEmpty')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div data-testid="lineage-map-card" className={`${nestedSectionDividerClassName} space-y-3`}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <div className="text-xs uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                                        {t('workspaceInsightsLineageMap')}
                                    </div>
                                    {activeBranchSummary && (
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
                                    )}
                                </div>
                                <span className="text-[11px] text-gray-400 dark:text-gray-500">
                                    {t('workspaceInsightsRootsCount').replace('{0}', String(lineageRootGroups.length))}
                                </span>
                            </div>
                            <div className="space-y-2 border-t border-gray-200/80 pt-3 dark:border-gray-800">
                                {lineageRootGroups.length > 0 ? (
                                    lineageRootGroups.map((rootGroup) => (
                                        <div key={`root-group-${rootGroup.rootId}`} className="nbu-inline-panel p-3">
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
                                            <div className="mt-3 space-y-3">
                                                {rootGroup.branches.map((branch) => (
                                                    <div
                                                        key={`branch-group-${branch.branchOriginId}`}
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
                                                                {branch.branchOriginId !== rootGroup.rootId && (
                                                                    <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                                                        {t('historyBranchOrigin')}{' '}
                                                                        {getShortTurnId(branch.branchOriginId)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="mt-3 space-y-2">
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
                                                                            if (
                                                                                event.key === 'Enter' ||
                                                                                event.key === ' '
                                                                            ) {
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
                                                                            }),
                                                                            promptClassName:
                                                                                'mt-2 line-clamp-2 text-xs leading-5 text-gray-600 dark:text-gray-300',
                                                                            actionRow: renderOwnerRouteActionShell(
                                                                                renderHistoryTurnActionRow({
                                                                                    item,
                                                                                    continueLabel: null,
                                                                                    branchLabel: null,
                                                                                    stopPropagation: true,
                                                                                    testIds: {
                                                                                        open: `lineage-map-open-${item.id}`,
                                                                                    },
                                                                                }),
                                                                                `lineage-map-owner-route-${item.id}`,
                                                                            ),
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
                    {provenancePanel ? (
                        <div data-testid="context-provenance-section" className={`${sectionCardClassName} space-y-3`}>
                            <div className="flex items-center justify-between gap-3">
                                <div className="text-xs uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                                    {t('workspaceInsightsSourcesCitations')}
                                </div>
                                {provenanceStatusLabel ? (
                                    <span className="nbu-status-pill">{provenanceStatusLabel}</span>
                                ) : null}
                            </div>
                            <div>{provenancePanel}</div>
                        </div>
                    ) : null}

                    <div data-testid="context-timeline-section" className={`${sectionCardClassName} space-y-4`}>
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <div className="text-xs uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                                    {t('workspaceInsightsActivity')}
                                </div>
                                <div className="mt-2 flex items-center gap-2">
                                    <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                                        {t('workspaceInsightsTimelineTitle')}
                                    </div>
                                    <InfoTooltip
                                        content={t('workspaceInsightsTimelineDesc')}
                                        buttonLabel={t('workspaceInsightsTimelineTitle')}
                                        dataTestId="context-timeline-tooltip"
                                    />
                                </div>
                            </div>
                            <div className="shrink-0 flex flex-wrap items-center justify-end gap-2">
                                <button
                                    data-testid="open-session-replay"
                                    onClick={onOpenSessionReplay}
                                    className="nbu-control-button px-3 py-1.5 text-xs"
                                >
                                    {t('workspaceInsightsReplaySession')}
                                </button>
                            </div>
                        </div>
                        <div className="mt-3 space-y-3">
                            {latestTimelineEntry ? (
                                <div data-testid="timeline-latest-summary" className="space-y-2">
                                    {renderTimelineEntry(latestTimelineEntry, 0)}
                                </div>
                            ) : (
                                <div className="nbu-dashed-panel px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                                    {t('workspaceInsightsTimelineEmpty')}
                                </div>
                            )}
                            {timelineHistoryEntries.length > 0 && (
                                <div
                                    data-testid="timeline-history-section"
                                    className={`${timelineHistoryEntries.length > 1 ? 'border-t border-gray-200/80 pt-3 dark:border-gray-800' : ''} space-y-2`}
                                >
                                    {timelineHistoryEntries.map((entry, index) =>
                                        renderTimelineEntry(entry, index + 1),
                                    )}
                                </div>
                            )}
                        </div>
                        <div
                            data-testid="session-hints-section"
                            className={`${nestedSectionDividerClassName} space-y-3`}
                        >
                            <div className="flex items-center justify-between gap-3">
                                <h4 className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                                    {t('workspaceViewerSessionHints')}
                                </h4>
                                {sessionHintEntries.length > 0 && (
                                    <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
                                        {t('workspaceInsightsItemsCount').replace(
                                            '{0}',
                                            String(sessionHintEntries.length),
                                        )}
                                    </span>
                                )}
                            </div>
                            <div className="space-y-2">
                                {sessionHintEntries.length > 0 ? (
                                    sessionHintEntries.map(([key, value]) => (
                                        <div
                                            key={key}
                                            className="nbu-soft-well flex items-start justify-between gap-3 px-3 py-2 text-xs"
                                        >
                                            <span className="font-semibold text-gray-600 dark:text-gray-300">
                                                {formatSessionHintKey(key)}
                                            </span>
                                            <span className="max-w-[15rem] whitespace-pre-wrap break-words text-right text-gray-500 dark:text-gray-400">
                                                {formatSessionHintValue(value)}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="nbu-dashed-panel px-4 py-5 text-sm text-gray-500 dark:text-gray-400">
                                        {t('workspaceInsightsSessionHintsEmpty')}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
}

export default React.memo(WorkspaceInsightsSidebar);
