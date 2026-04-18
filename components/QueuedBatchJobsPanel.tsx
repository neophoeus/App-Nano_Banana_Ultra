import React from 'react';
import { GeneratedImage, QueuedBatchJob } from '../types';
import { formatGenerationFailureDisplayMessage } from '../utils/generationFailure';
import { Language, getTranslation } from '../utils/translations';
import {
    getQueuedBatchJobImportDiagnostic,
    isQueuedBatchJobActive,
    isQueuedBatchJobAutoImportReady,
    isQueuedBatchJobClearableIssue,
    isQueuedBatchJobClosedIssue,
    isQueuedBatchJobExtractionFailure,
    isQueuedBatchJobImported,
    isQueuedBatchJobImportReady,
    isQueuedBatchJobNoPayload,
    isQueuedBatchJobRetryableImport,
} from '../utils/queuedBatchJobs';
import InfoTooltip from './InfoTooltip';

type QueuedBatchJobsPanelProps = {
    currentLanguage: Language;
    queuedJobs: QueuedBatchJob[];
    surface?: 'default' | 'embedded';
    queueBatchConversationNotice: string | null;
    isRecoveringRecentQueuedJobs?: boolean;
    getLineageActionLabel: (action?: QueuedBatchJob['lineageAction']) => string;
    getImportedQueuedResultCount: (job: QueuedBatchJob) => number;
    getImportedQueuedHistoryItems: (job: QueuedBatchJob) => GeneratedImage[];
    activeImportedQueuedHistoryId: string | null;
    onRecoverRecentQueuedJobs: () => void;
    onImportAllQueuedJobs: () => void;
    onPollAllQueuedJobs: () => void;
    onPollQueuedJob: (localId: string) => void;
    onCancelQueuedJob: (localId: string) => void;
    onImportQueuedJob: (localId: string) => void;
    onOpenImportedQueuedJob: (localId: string) => void;
    onOpenLatestImportedQueuedJob: (localId: string) => void;
    onOpenImportedQueuedHistoryItem: (historyId: string) => void;
    onClearIssueQueuedJobs?: () => void;
    onClearImportedQueuedJobs?: () => void;
    onRemoveQueuedJob: (localId: string) => void;
};

type JobTimelineEvent = {
    key: string;
    label: string;
    timestamp: number;
    toneClassName?: string;
};

type ActionGroup = {
    key: string;
    label: string;
    testId: string;
    actions: React.ReactNode[];
};

const formatCompactTime = (timestamp: number) =>
    new Date(timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
    });

const HOUR_MS = 60 * 60 * 1000;
const QUEUED_BATCH_TARGET_WINDOW_MS = 24 * HOUR_MS;
const QUEUED_BATCH_EXPIRY_WINDOW_MS = 48 * HOUR_MS;
const QUEUED_BATCH_NEAR_EXPIRY_WINDOW_MS = QUEUED_BATCH_EXPIRY_WINDOW_MS - 6 * HOUR_MS;

const formatBatchStatsSummary = (job: QueuedBatchJob, t: (key: string) => string) => {
    if (!job.batchStats) {
        return null;
    }

    return [
        `${job.batchStats.successfulRequestCount} ${t('queuedBatchStateSucceeded')}`,
        `${job.batchStats.pendingRequestCount} ${t('queuedBatchStatePending')}`,
        `${job.batchStats.failedRequestCount} ${t('queuedBatchStateFailed')}`,
    ].join(' · ');
};

const getQueuedJobAgeWarning = (job: QueuedBatchJob, t: (key: string) => string, currentTimestamp: number) => {
    if (!isQueuedBatchJobActive(job) || job.submissionPending) {
        return null;
    }

    const ageMs = currentTimestamp - job.createdAt;
    if (!Number.isFinite(ageMs) || ageMs < QUEUED_BATCH_TARGET_WINDOW_MS) {
        return null;
    }

    const ageHours = Math.max(24, Math.floor(ageMs / HOUR_MS)).toString();
    if (ageMs >= QUEUED_BATCH_NEAR_EXPIRY_WINDOW_MS) {
        return {
            label: t('queuedBatchJobsNearExpiryWarning').replace('{0}', ageHours),
            className:
                'rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
        };
    }

    return {
        label: t('queuedBatchJobsPastTargetWarning').replace('{0}', ageHours),
        className:
            'rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
    };
};

const buildJobTimeline = (job: QueuedBatchJob, t: (key: string) => string): JobTimelineEvent[] => {
    const events: JobTimelineEvent[] = [
        {
            key: 'submitted',
            label: t('queuedBatchTimelineSubmitted'),
            timestamp: job.createdAt,
        },
    ];

    if (job.startedAt) {
        events.push({
            key: 'started',
            label: t('queuedBatchTimelineStarted'),
            timestamp: job.startedAt,
        });
    }

    if (job.lastPolledAt) {
        events.push({
            key: 'checked',
            label: t('queuedBatchTimelineChecked'),
            timestamp: job.lastPolledAt,
        });
    }

    if (job.completedAt) {
        events.push({
            key: 'completed',
            label:
                job.state === 'JOB_STATE_SUCCEEDED' ? t('queuedBatchTimelineFinished') : t('queuedBatchTimelineClosed'),
            timestamp: job.completedAt,
            toneClassName:
                job.state === 'JOB_STATE_SUCCEEDED'
                    ? 'border-emerald-200 text-emerald-700 dark:border-emerald-500/40 dark:text-emerald-300'
                    : 'border-rose-200 text-rose-700 dark:border-rose-500/40 dark:text-rose-300',
        });
    }

    if (job.importedAt) {
        events.push({
            key: 'imported',
            label: t('queuedBatchTimelineImported'),
            timestamp: job.importedAt,
            toneClassName: 'border-emerald-200 text-emerald-700 dark:border-emerald-500/40 dark:text-emerald-300',
        });
    }

    return events.sort((left, right) => left.timestamp - right.timestamp);
};

const getQueuedImportIssueDisplayText = (
    t: (key: string) => string,
    issue: NonNullable<QueuedBatchJob['importIssues']>[number],
) =>
    formatGenerationFailureDisplayMessage(
        t,
        {
            error: issue.error,
            finishReason: issue.finishReason,
            blockedSafetyCategories: issue.blockedSafetyCategories,
            extractionIssue: issue.extractionIssue,
            returnedTextContent: issue.returnedTextContent,
            returnedThoughtContent: issue.returnedThoughtContent,
        },
        { includeRetryDetail: false },
    ) || issue.error;

const getQueuedJobErrorDisplayText = (
    t: (key: string) => string,
    job: QueuedBatchJob,
    importIssues: NonNullable<QueuedBatchJob['importIssues']>,
) => {
    if (!job.error) {
        return null;
    }

    const representativeImportIssue = importIssues[0];
    return (
        formatGenerationFailureDisplayMessage(
            t,
            {
                error: job.error,
                finishReason: representativeImportIssue?.finishReason,
                blockedSafetyCategories: representativeImportIssue?.blockedSafetyCategories,
                extractionIssue: representativeImportIssue?.extractionIssue,
                returnedTextContent: representativeImportIssue?.returnedTextContent,
                returnedThoughtContent: representativeImportIssue?.returnedThoughtContent,
            },
            { includeRetryDetail: false },
        ) || job.error
    );
};

export default function QueuedBatchJobsPanel({
    currentLanguage,
    queuedJobs,
    surface = 'default',
    queueBatchConversationNotice,
    isRecoveringRecentQueuedJobs = false,
    getLineageActionLabel,
    getImportedQueuedResultCount,
    getImportedQueuedHistoryItems,
    activeImportedQueuedHistoryId,
    onRecoverRecentQueuedJobs,
    onImportAllQueuedJobs,
    onPollAllQueuedJobs,
    onPollQueuedJob,
    onCancelQueuedJob,
    onImportQueuedJob,
    onOpenImportedQueuedJob,
    onOpenLatestImportedQueuedJob,
    onOpenImportedQueuedHistoryItem,
    onClearIssueQueuedJobs = () => undefined,
    onClearImportedQueuedJobs = () => undefined,
    onRemoveQueuedJob,
}: QueuedBatchJobsPanelProps) {
    const t = (key: string) => getTranslation(currentLanguage, key);
    const isEmbedded = surface === 'embedded';
    const showTitleAndGuidance = !isEmbedded;
    const showConversationNoticeInline = Boolean(queueBatchConversationNotice);
    const showHeaderMetaRow = showTitleAndGuidance || showConversationNoticeInline;
    const getTranslatedGenerationModeLabel = (mode?: string | null) => {
        if (!mode) return t('modeTextToImg');
        if (mode.includes('Inpaint') || mode.includes('Retouch')) return t('modeInpaint');
        if (mode.includes('Editor Edit')) return 'Editor Edit';
        if (mode.includes('Text')) return t('modeTextToImg');
        if (mode.includes('Image to')) return t('modeImgToImg');
        if (mode.includes('Follow-up')) return t('workspaceViewerFollowUpEdit');
        if (
            mode.includes('Outpaint') ||
            mode.includes('Reframe') ||
            mode.includes('Reposition') ||
            mode.includes('Upscale') ||
            mode.includes('Refine')
        ) {
            return t('modeOutpaint');
        }

        return mode;
    };
    const neutralActionButtonClassName =
        'nbu-control-button px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40';
    const primaryImportActionButtonClassName =
        'rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600';
    const retryImportActionButtonClassName =
        'rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:border-amber-400 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200';
    const compactNeutralActionButtonClassName = 'nbu-control-button px-2 py-1 text-[11px]';
    const activeImportedPreviewClassName =
        'border-amber-300 bg-[linear-gradient(180deg,rgba(255,251,235,0.96),rgba(255,246,217,0.92))] shadow-[0_0_0_1px_rgba(251,191,36,0.28)] dark:border-amber-500/40 dark:bg-[linear-gradient(180deg,rgba(62,38,9,0.72),rgba(29,20,8,0.9))]';
    const renderDisclosureChevron = () => (
        <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-180 dark:text-gray-500"
        >
            <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
    const renderActionGroups = (jobId: string, groups: ActionGroup[]) => {
        const visibleGroups = groups.filter((group) => group.actions.length > 0);
        if (visibleGroups.length === 0) {
            return null;
        }

        return (
            <div className="flex min-w-[13rem] flex-col gap-2">
                {visibleGroups.map((group) => (
                    <div
                        key={`${jobId}-${group.key}`}
                        data-testid={`queued-batch-job-${jobId}-${group.testId}`}
                        className="nbu-inline-panel p-2"
                    >
                        <div className="px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                            {group.label}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">{group.actions}</div>
                    </div>
                ))}
            </div>
        );
    };
    const importReadyCount = queuedJobs.filter(isQueuedBatchJobAutoImportReady).length;
    const runningCount = queuedJobs.filter(isQueuedBatchJobActive).length;
    const failedCount = queuedJobs.filter((job) => isQueuedBatchJobClosedIssue(job)).length;
    const clearableIssueCount = queuedJobs.filter(isQueuedBatchJobClearableIssue).length;
    const importedCount = queuedJobs.filter(isQueuedBatchJobImported).length;
    const currentTimestamp = Date.now();

    const getQueuedJobStateLabel = (job: QueuedBatchJob) => {
        if (job.state === 'JOB_STATE_PENDING') return t('queuedBatchStatePending');
        if (job.state === 'JOB_STATE_RUNNING') return t('queuedBatchStateRunning');
        if (job.state === 'JOB_STATE_SUCCEEDED') return t('queuedBatchStateSucceeded');
        if (job.state === 'JOB_STATE_FAILED') return t('queuedBatchStateFailed');
        if (job.state === 'JOB_STATE_CANCELLED') return t('queuedBatchStateCancelled');
        if (job.state === 'JOB_STATE_EXPIRED') return t('queuedBatchStateExpired');
        return String(job.state).replace('JOB_STATE_', '').toLowerCase();
    };

    if (queuedJobs.length === 0) {
        if (isEmbedded) {
            return (
                <div
                    data-testid="queued-batch-panel-empty"
                    className="nbu-overlay-card-neutral rounded-[24px] border border-dashed px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                    <div>{t('queuedBatchJobsTrackedCount').replace('{0}', '0')}</div>
                    <div className="mt-2 text-xs leading-6 text-gray-500 dark:text-gray-400">
                        {t('queuedBatchJobsWorkflowHint')}
                    </div>
                    <div className="mt-3 text-xs leading-6 text-gray-500 dark:text-gray-400">
                        {t('queuedBatchRecoverRecentMetadataHint')}
                    </div>
                    <button
                        data-testid="queued-batch-recover-recent-empty"
                        onClick={onRecoverRecentQueuedJobs}
                        disabled={isRecoveringRecentQueuedJobs}
                        className="mt-4 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/20"
                    >
                        {isRecoveringRecentQueuedJobs
                            ? t('queuedBatchRecoverRecentLoading')
                            : t('queuedBatchRecoverRecentAction')}
                    </button>
                </div>
            );
        }

        return (
            <div data-testid="queued-batch-panel-empty" className="nbu-floating-panel mt-4 p-4">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {t('queuedBatchJobsTrackedCount').replace('{0}', '0')}
                </div>
                <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t('queuedBatchJobsWorkflowHint')}</div>
                <div className="mt-2 text-xs leading-6 text-gray-500 dark:text-gray-400">
                    {t('queuedBatchRecoverRecentMetadataHint')}
                </div>
                <button
                    data-testid="queued-batch-recover-recent-empty"
                    onClick={onRecoverRecentQueuedJobs}
                    disabled={isRecoveringRecentQueuedJobs}
                    className="mt-4 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/20"
                >
                    {isRecoveringRecentQueuedJobs
                        ? t('queuedBatchRecoverRecentLoading')
                        : t('queuedBatchRecoverRecentAction')}
                </button>
            </div>
        );
    }

    return (
        <div data-testid="queued-batch-panel" className={isEmbedded ? 'min-w-0 pb-4' : 'nbu-floating-panel mt-4 p-4'}>
            <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                    {showHeaderMetaRow && (
                        <div className="flex flex-wrap items-center gap-2">
                            {showTitleAndGuidance && (
                                <>
                                    <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                                        {t('queuedBatchJobsTitle')}
                                    </h3>
                                    <InfoTooltip
                                        content={t('queuedBatchJobsDesc')}
                                        buttonLabel={t('queuedBatchJobsTitle')}
                                        dataTestId="queued-batch-panel-guidance"
                                    />
                                </>
                            )}
                            {queueBatchConversationNotice && (
                                <>
                                    <span className="text-[11px] font-medium text-amber-700 dark:text-amber-300">
                                        {t('queuedBatchJobsConversationNoticeLabel')}
                                    </span>
                                    <InfoTooltip
                                        content={queueBatchConversationNotice}
                                        buttonLabel={t('queuedBatchJobsConversationNoticeLabel')}
                                        dataTestId="queued-batch-panel-notice"
                                    />
                                </>
                            )}
                        </div>
                    )}
                    <div
                        className={`${showHeaderMetaRow ? 'mt-2 ' : ''}flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400`}
                    >
                        <span data-testid="queued-batch-active-count" className="nbu-quiet-pill">
                            {t('queuedBatchJobsActiveCount').replace('{0}', runningCount.toString())}
                        </span>
                        <span data-testid="queued-batch-import-ready-count" className="nbu-quiet-pill">
                            {t('queuedBatchJobsImportReadyCount').replace('{0}', importReadyCount.toString())}
                        </span>
                        <span data-testid="queued-batch-closed-issues-count" className="nbu-quiet-pill">
                            {t('queuedBatchJobsClosedIssuesCount').replace('{0}', failedCount.toString())}
                        </span>
                    </div>
                </div>
                <div className="flex flex-wrap items-stretch gap-2">
                    <div data-testid="queued-batch-panel-monitor-group" className="nbu-inline-panel p-2">
                        <div className="px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                            {t('queuedBatchJobsMonitorGroup')}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <button
                                data-testid="queued-batch-recover-recent"
                                onClick={onRecoverRecentQueuedJobs}
                                disabled={isRecoveringRecentQueuedJobs}
                                className={neutralActionButtonClassName}
                            >
                                {isRecoveringRecentQueuedJobs
                                    ? t('queuedBatchRecoverRecentLoading')
                                    : t('queuedBatchRecoverRecentAction')}
                            </button>
                            <button
                                data-testid="queued-batch-refresh-all"
                                onClick={onPollAllQueuedJobs}
                                className={neutralActionButtonClassName}
                            >
                                {t('queuedBatchJobsRefreshAll')}
                            </button>
                            <span data-testid="queued-batch-tracked-count" className="nbu-quiet-pill px-3 py-1 text-xs">
                                {t('queuedBatchJobsTrackedCount').replace('{0}', queuedJobs.length.toString())}
                            </span>
                        </div>
                    </div>
                    <div data-testid="queued-batch-panel-results-group" className="nbu-inline-panel p-2">
                        <div className="px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                            {t('queuedBatchJobsResultsGroup')}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span
                                data-testid="queued-batch-panel-results-count"
                                className="nbu-quiet-pill px-3 py-1 text-xs"
                            >
                                {t('queuedBatchJobsImportReadyCount').replace('{0}', importReadyCount.toString())}
                            </span>
                            {importReadyCount > 0 && (
                                <button
                                    data-testid="queued-batch-import-all"
                                    onClick={onImportAllQueuedJobs}
                                    className={primaryImportActionButtonClassName}
                                >
                                    {t('queuedBatchJobsImportReadyAction')}
                                </button>
                            )}
                        </div>
                    </div>
                    <div data-testid="queued-batch-panel-cleanup-group" className="nbu-inline-panel p-2">
                        <div className="px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                            {t('queuedBatchJobsCleanupGroup')}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <button
                                data-testid="queued-batch-clear-issues"
                                onClick={onClearIssueQueuedJobs}
                                disabled={clearableIssueCount === 0}
                                className={neutralActionButtonClassName}
                            >
                                {t('queuedBatchJobsClearIssuesAction')}
                            </button>
                            <button
                                data-testid="queued-batch-clear-imported"
                                onClick={onClearImportedQueuedJobs}
                                disabled={importedCount === 0}
                                className={neutralActionButtonClassName}
                            >
                                {t('queuedBatchJobsClearImportedAction')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                {queuedJobs.map((job) => {
                    const isRestoredHistoricalIssue = Boolean(
                        job.restoredFromSnapshot && isQueuedBatchJobClosedIssue(job),
                    );
                    const canImport = isQueuedBatchJobImportReady(job) && !isQueuedBatchJobExtractionFailure(job);
                    const canRetryImport = isQueuedBatchJobRetryableImport(job);
                    const isImportUnavailable = isQueuedBatchJobNoPayload(job);
                    const canOpenImported = Boolean(job.importedAt);
                    const canCancel = !job.submissionPending && isQueuedBatchJobActive(job);
                    const importedResultCount = canOpenImported ? getImportedQueuedResultCount(job) : 0;
                    const importedHistoryItems = canOpenImported ? getImportedQueuedHistoryItems(job) : [];
                    const importDiagnostic = getQueuedBatchJobImportDiagnostic(job);
                    const importIssues = Array.isArray(job.importIssues)
                        ? job.importIssues.filter((issue) => issue.error.trim().length > 0)
                        : [];
                    const localizedJobError = getQueuedJobErrorDisplayText(t, job, importIssues);
                    const visibleImportIssues =
                        importIssues.length > 1 || (importIssues.length === 1 && importIssues[0].error !== job.error)
                            ? importIssues
                            : [];
                    const localizedVisibleImportIssues = visibleImportIssues.map((issue) => ({
                        issue,
                        displayText: getQueuedImportIssueDisplayText(t, issue),
                    }));
                    const importDiagnosticKey =
                        importDiagnostic === 'no-payload'
                            ? 'queuedBatchNoPayloadResultsNotice'
                            : importDiagnostic === 'extraction-failure'
                              ? 'queuedBatchNoImportableResultsNotice'
                              : null;
                    const shouldShowImportDiagnostic =
                        Boolean(importDiagnosticKey) && !(job.error && importDiagnostic === 'extraction-failure');
                    const hasMultipleImportedResults = importedResultCount > 1;
                    const resolvedActiveImportedIndex = importedHistoryItems.findIndex(
                        (item) => item.id === activeImportedQueuedHistoryId,
                    );
                    const activeImportedIndex = resolvedActiveImportedIndex >= 0 ? resolvedActiveImportedIndex : 0;
                    const activeImportedItem = importedHistoryItems[activeImportedIndex] || null;
                    const activeImportedCueTitle = activeImportedItem
                        ? [activeImportedItem.text, activeImportedItem.prompt].filter(Boolean).join(' · ')
                        : '';
                    const previousImportedItem =
                        importedHistoryItems.length > 1
                            ? importedHistoryItems[
                                  (activeImportedIndex - 1 + importedHistoryItems.length) % importedHistoryItems.length
                              ]
                            : null;
                    const nextImportedItem =
                        importedHistoryItems.length > 1
                            ? importedHistoryItems[(activeImportedIndex + 1) % importedHistoryItems.length]
                            : null;
                    const statusTone =
                        job.state === 'JOB_STATE_SUCCEEDED'
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : isQueuedBatchJobClosedIssue(job)
                              ? 'text-rose-700 dark:text-rose-300'
                              : 'text-amber-700 dark:text-amber-300';
                    const timelineEvents = buildJobTimeline(job, t);
                    const batchStatsSummary = formatBatchStatsSummary(job, t);
                    const ageWarning = getQueuedJobAgeWarning(job, t, currentTimestamp);
                    const monitorActions: React.ReactNode[] = [];

                    if (!isRestoredHistoricalIssue && !job.submissionPending) {
                        monitorActions.push(
                            <button
                                key="poll"
                                data-testid={`queued-batch-job-${job.localId}-poll`}
                                onClick={() => onPollQueuedJob(job.localId)}
                                className={neutralActionButtonClassName}
                            >
                                {t('queuedBatchJobsPoll')}
                            </button>,
                        );
                    }

                    if (canCancel) {
                        monitorActions.push(
                            <button
                                key="cancel"
                                data-testid={`queued-batch-job-${job.localId}-cancel`}
                                onClick={() => onCancelQueuedJob(job.localId)}
                                className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:border-rose-400 dark:border-rose-500/40 dark:text-rose-300"
                            >
                                {t('queuedBatchJobsCancel')}
                            </button>,
                        );
                    }

                    const resultActions: React.ReactNode[] = [];

                    if (canImport) {
                        resultActions.push(
                            <button
                                key="import"
                                data-testid={`queued-batch-job-${job.localId}-import`}
                                onClick={() => onImportQueuedJob(job.localId)}
                                className={primaryImportActionButtonClassName}
                            >
                                {t('queuedBatchJobsImport')}
                            </button>,
                        );
                    }

                    if (canRetryImport) {
                        resultActions.push(
                            <button
                                key="retry-import"
                                data-testid={`queued-batch-job-${job.localId}-retry-import`}
                                onClick={() => onImportQueuedJob(job.localId)}
                                title={localizedJobError || t('queuedBatchJobsRetryImportHint')}
                                className={retryImportActionButtonClassName}
                            >
                                {t('queuedBatchJobsRetryImport')}
                            </button>,
                        );
                    }

                    if (isImportUnavailable) {
                        resultActions.push(
                            <button
                                key="import-unavailable"
                                data-testid={`queued-batch-job-${job.localId}-import-unavailable`}
                                disabled={true}
                                title={t('queuedBatchNoPayloadResultsNotice')}
                                className={neutralActionButtonClassName}
                            >
                                {t('queuedBatchJobsImportUnavailable')}
                            </button>,
                        );
                    }

                    if (canOpenImported) {
                        resultActions.push(
                            <button
                                key="open"
                                data-testid={`queued-batch-job-${job.localId}-open`}
                                onClick={() => onOpenImportedQueuedJob(job.localId)}
                                className={neutralActionButtonClassName}
                            >
                                {hasMultipleImportedResults
                                    ? `${t('historyActionOpen')} #1/${importedResultCount}`
                                    : t('historyActionOpen')}
                            </button>,
                        );
                    }

                    if (hasMultipleImportedResults) {
                        resultActions.push(
                            <button
                                key="open-latest"
                                data-testid={`queued-batch-job-${job.localId}-open-latest`}
                                onClick={() => onOpenLatestImportedQueuedJob(job.localId)}
                                className={neutralActionButtonClassName}
                            >{`${t('historyActionOpenLatest')} #${importedResultCount}/${importedResultCount}`}</button>,
                        );
                    }

                    const cleanupActions: React.ReactNode[] = job.submissionPending
                        ? []
                        : [
                              <button
                                  key="clear"
                                  data-testid={`queued-batch-job-${job.localId}-clear`}
                                  onClick={() => onRemoveQueuedJob(job.localId)}
                                  className={neutralActionButtonClassName}
                              >
                                  {t('queuedBatchJobsClear')}
                              </button>,
                          ];
                    const actionGroups: ActionGroup[] = [
                        {
                            key: 'monitor',
                            label: t('queuedBatchJobsMonitorGroup'),
                            testId: 'monitor-group',
                            actions: monitorActions,
                        },
                        {
                            key: 'results',
                            label: t('queuedBatchJobsResultsGroup'),
                            testId: 'results-group',
                            actions: resultActions,
                        },
                        {
                            key: 'cleanup',
                            label: t('queuedBatchJobsCleanupGroup'),
                            testId: 'cleanup-group',
                            actions: cleanupActions,
                        },
                    ];

                    return (
                        <div
                            data-testid={`queued-batch-job-${job.localId}`}
                            key={job.localId}
                            className="rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-[#11161f]"
                        >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                            {job.displayName}
                                        </span>
                                        <span
                                            data-testid={`queued-batch-job-${job.localId}-state`}
                                            className={`rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${statusTone} dark:bg-[#0b0f15]`}
                                        >
                                            {getQueuedJobStateLabel(job)}
                                        </span>
                                        {ageWarning && (
                                            <span
                                                data-testid={`queued-batch-job-${job.localId}-age-warning`}
                                                className={ageWarning.className}
                                            >
                                                {ageWarning.label}
                                            </span>
                                        )}
                                        {job.importedAt && (
                                            <span
                                                data-testid={`queued-batch-job-${job.localId}-imported`}
                                                className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                                            >
                                                {t('queuedBatchJobsImportedTag')}
                                            </span>
                                        )}
                                        {isRestoredHistoricalIssue && (
                                            <span
                                                data-testid={`queued-batch-job-${job.localId}-restored-history`}
                                                className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                                            >
                                                {t('queuedBatchJobsRestoredHistoryTag')}
                                            </span>
                                        )}
                                        {importedResultCount > 0 && (
                                            <span
                                                data-testid={`queued-batch-job-${job.localId}-imported-count`}
                                                className="rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-700 dark:bg-sky-500/10 dark:text-sky-300"
                                            >
                                                {importedResultCount}x
                                            </span>
                                        )}
                                    </div>
                                            {(() => {
                                                const requestCount =
                                                    typeof job.batchStats?.requestCount === 'number' &&
                                                    job.batchStats.requestCount > 0
                                                        ? job.batchStats.requestCount
                                                        : job.batchSize;

                                                return (
                                                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                        {job.model} ·{' '}
                                                        <span data-testid={`queued-batch-job-${job.localId}-request-count`}>
                                                            {t('queuedBatchJobsRequestCount').replace(
                                                                '{0}',
                                                                requestCount.toString(),
                                                            )}
                                                        </span>{' '}
                                                        · {getTranslatedGenerationModeLabel(job.generationMode)}
                                                    </div>
                                                );
                                            })()}
                                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                <span
                                                    data-testid={`queued-batch-job-${job.localId}-resource-name`}
                                                    className="break-all font-mono text-[11px]"
                                                >
                                                    {job.name}
                                                </span>
                                    </div>
                                    {job.sourceHistoryId && (
                                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                            {t('queuedBatchJobsLinkedSource')} {job.sourceHistoryId.slice(0, 8)}
                                            {job.lineageAction ? ` · ${getLineageActionLabel(job.lineageAction)}` : ''}
                                        </div>
                                    )}
                                    {batchStatsSummary && (
                                        <div
                                            data-testid={`queued-batch-job-${job.localId}-batch-stats`}
                                            className="mt-1 text-xs text-gray-500 dark:text-gray-400"
                                        >
                                            {batchStatsSummary}
                                        </div>
                                    )}
                                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                        {t('queuedBatchJobsUpdated')} {formatCompactTime(job.updatedAt)}
                                        {job.lastPolledAt
                                            ? ` · ${t('queuedBatchJobsLastChecked')} ${formatCompactTime(job.lastPolledAt)}`
                                            : ` · ${t('queuedBatchJobsAwaitingFirstStatus')}`}
                                    </div>
                                    {isRestoredHistoricalIssue && (
                                        <p
                                            data-testid={`queued-batch-job-${job.localId}-restored-history-note`}
                                            className="mt-2 text-xs text-amber-700 dark:text-amber-300"
                                        >
                                            {t('queuedBatchJobsRestoredHistoryHint')}
                                        </p>
                                    )}
                                    <p className="mt-2 line-clamp-2 text-sm text-gray-700 dark:text-gray-200">
                                        {job.prompt}
                                    </p>
                                    {localizedJobError && (
                                        <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">
                                            {localizedJobError}
                                        </p>
                                    )}
                                    {shouldShowImportDiagnostic && importDiagnosticKey && (
                                        <p
                                            data-testid={`queued-batch-job-${job.localId}-import-diagnostic`}
                                            className="mt-2 text-xs text-amber-700 dark:text-amber-300"
                                        >
                                            {t(importDiagnosticKey)}
                                        </p>
                                    )}
                                    {localizedVisibleImportIssues.length > 0 && (
                                        <div
                                            data-testid={`queued-batch-job-${job.localId}-import-issues`}
                                            className="mt-2 space-y-1 text-xs text-amber-700 dark:text-amber-300"
                                        >
                                            {localizedVisibleImportIssues.map(({ issue, displayText }) => (
                                                <p
                                                    key={`${job.localId}-${issue.index}-${issue.error}`}
                                                    data-testid={`queued-batch-job-${job.localId}-import-issue-${issue.index}`}
                                                    className="leading-5"
                                                >
                                                    <span className="font-semibold">#{issue.index + 1}</span>
                                                    {' · '}
                                                    {displayText}
                                                </p>
                                            ))}
                                        </div>
                                    )}
                                    {importedHistoryItems.length > 0 && (
                                        <details
                                            data-testid={`queued-batch-job-${job.localId}-preview-details`}
                                            className="group mt-3 rounded-2xl border border-gray-200 bg-gray-50/70 px-3 py-3 dark:border-gray-700 dark:bg-[#0b0f15]/70"
                                        >
                                            <summary
                                                data-testid={`queued-batch-job-${job.localId}-preview-summary-shell`}
                                                className="flex cursor-pointer list-none items-start justify-between gap-3 marker:hidden"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
                                                        <span>{t('queuedBatchTimelineImported')}</span>
                                                        <span
                                                            data-testid={`queued-batch-job-${job.localId}-preview-summary`}
                                                            className="rounded-full bg-white px-2 py-0.5 dark:bg-[#11161f]"
                                                        >
                                                            {importedHistoryItems.length}x
                                                        </span>
                                                    </div>
                                                    {activeImportedItem && (
                                                        <div
                                                            data-testid={`queued-batch-job-${job.localId}-preview-active-cue`}
                                                            title={activeImportedCueTitle}
                                                            className="mt-2 text-xs leading-5 text-gray-700 dark:text-gray-200"
                                                        >
                                                            {activeImportedItem.text || activeImportedItem.prompt}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {hasMultipleImportedResults &&
                                                        previousImportedItem &&
                                                        nextImportedItem && (
                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    type="button"
                                                                    data-testid={`queued-batch-job-${job.localId}-preview-prev`}
                                                                    onClick={(event) => {
                                                                        event.preventDefault();
                                                                        onOpenImportedQueuedHistoryItem(
                                                                            previousImportedItem.id,
                                                                        );
                                                                    }}
                                                                    title={
                                                                        previousImportedItem.text ||
                                                                        previousImportedItem.prompt
                                                                    }
                                                                    className={compactNeutralActionButtonClassName}
                                                                >
                                                                    ‹
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    data-testid={`queued-batch-job-${job.localId}-preview-next`}
                                                                    onClick={(event) => {
                                                                        event.preventDefault();
                                                                        onOpenImportedQueuedHistoryItem(
                                                                            nextImportedItem.id,
                                                                        );
                                                                    }}
                                                                    title={
                                                                        nextImportedItem.text || nextImportedItem.prompt
                                                                    }
                                                                    className={compactNeutralActionButtonClassName}
                                                                >
                                                                    ›
                                                                </button>
                                                            </div>
                                                        )}
                                                    <span className="shrink-0">{renderDisclosureChevron()}</span>
                                                </div>
                                            </summary>
                                            <div className="mt-3 space-y-2 border-t border-gray-200/80 pt-3 dark:border-gray-700">
                                                {activeImportedItem && (
                                                    <div
                                                        title={activeImportedCueTitle}
                                                        className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-xs leading-5 text-gray-700 dark:border-gray-700 dark:bg-[#11161f] dark:text-gray-200"
                                                    >
                                                        {activeImportedItem.text && (
                                                            <div
                                                                data-testid={`queued-batch-job-${job.localId}-preview-active-result`}
                                                                className="space-y-1"
                                                            >
                                                                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
                                                                    {t('workspaceViewerResultText')}
                                                                </div>
                                                                <div>{activeImportedItem.text}</div>
                                                            </div>
                                                        )}
                                                        {activeImportedItem.prompt && (
                                                            <div
                                                                data-testid={`queued-batch-job-${job.localId}-preview-active-prompt`}
                                                                className={
                                                                    activeImportedItem.text
                                                                        ? 'mt-2 space-y-1 border-t border-gray-200 pt-2 dark:border-gray-700'
                                                                        : 'space-y-1'
                                                                }
                                                            >
                                                                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
                                                                    {t('workspaceViewerPrompt')}
                                                                </div>
                                                                <div>{activeImportedItem.prompt}</div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                <div
                                                    data-testid={`queued-batch-job-${job.localId}-preview-rail`}
                                                    className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory sm:flex-wrap sm:overflow-visible sm:pb-0"
                                                >
                                                    {importedHistoryItems.map((item, index) => {
                                                        const isActiveImportedItem =
                                                            activeImportedQueuedHistoryId === item.id;
                                                        const positionLabel =
                                                            importedHistoryItems.length > 1
                                                                ? `#${index + 1}/${importedHistoryItems.length}`
                                                                : `#${index + 1}`;
                                                        const cueText = item.text || item.prompt;

                                                        return (
                                                            <button
                                                                key={item.id}
                                                                type="button"
                                                                data-testid={`queued-batch-job-${job.localId}-preview-${index}`}
                                                                onClick={() => onOpenImportedQueuedHistoryItem(item.id)}
                                                                title={cueText}
                                                                className={`group w-28 shrink-0 snap-start overflow-hidden rounded-2xl border text-left transition-colors ${isActiveImportedItem ? activeImportedPreviewClassName : 'border-gray-200 bg-gray-50 hover:border-sky-400 dark:border-gray-700 dark:bg-[#0b0f15] dark:hover:border-sky-500/50'}`}
                                                            >
                                                                <div className="relative h-16 w-full overflow-hidden bg-gray-200 dark:bg-gray-900">
                                                                    {item.url ? (
                                                                        <img
                                                                            src={item.url}
                                                                            alt={item.prompt}
                                                                            className="h-full w-full object-cover"
                                                                        />
                                                                    ) : (
                                                                        <div className="flex h-full w-full items-center justify-center text-[9px] font-bold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-300">
                                                                            {t('historyActionOpen')}
                                                                        </div>
                                                                    )}
                                                                    <span className="absolute bottom-1 left-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                                                                        {positionLabel}
                                                                    </span>
                                                                    {isActiveImportedItem && (
                                                                        <span
                                                                            data-testid={`queued-batch-job-${job.localId}-preview-${index}-active`}
                                                                            className="absolute right-1 top-1 rounded-full bg-amber-500/95 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white"
                                                                        >
                                                                            {t('workspacePickerStageSource')}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div
                                                                    data-testid={`queued-batch-job-${job.localId}-preview-${index}-cue`}
                                                                    title={cueText}
                                                                    className="line-clamp-2 min-h-[2.5rem] px-2 py-2 text-[10px] leading-4 text-gray-700 dark:text-gray-200"
                                                                >
                                                                    {cueText}
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </details>
                                    )}
                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                        {timelineEvents.map((event, eventIndex) => (
                                            <span
                                                data-testid={`queued-batch-job-${job.localId}-timeline-${eventIndex}`}
                                                key={`${job.localId}-${event.key}`}
                                                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-600 dark:text-gray-300 ${event.toneClassName || 'border-gray-200 dark:border-gray-700'}`}
                                            >
                                                {event.label} {formatCompactTime(event.timestamp)}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                {renderActionGroups(job.localId, actionGroups)}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
