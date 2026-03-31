import React from 'react';
import { QueuedBatchJob } from '../types';
import { getWorkflowEntryLabelKey, WorkflowEntry } from '../utils/workflowTimeline';
import { getTranslation, Language } from '../utils/translations';

export type WorkspaceWorkflowTimelineEntry = WorkflowEntry & {
    displayMessage: string;
};

export type WorkspaceWorkflowThoughtEntry = {
    id: string;
    shortId: string;
    prompt: string | null;
    thoughts: string;
    createdAtLabel: string;
};

type WorkspaceWorkflowDetailPanelProps = {
    currentLanguage: Language;
    entries: WorkspaceWorkflowTimelineEntry[];
    batchProgress: {
        completed: number;
        total: number;
    };
    queuedJobs: QueuedBatchJob[];
    resultStatusSummary?: string | null;
    resultStatusTone?: 'warning' | 'success' | null;
    thoughtEntries?: WorkspaceWorkflowThoughtEntry[];
    thoughtsText?: string | null;
    thoughtsPlaceholder?: string | null;
    contextPanel?: React.ReactNode;
};

function WorkspaceWorkflowDetailPanel({
    currentLanguage,
    entries,
    batchProgress,
    queuedJobs,
    resultStatusSummary,
    resultStatusTone,
    thoughtEntries = [],
    thoughtsText,
    thoughtsPlaceholder,
    contextPanel,
}: WorkspaceWorkflowDetailPanelProps) {
    const t = (key: string) => getTranslation(currentLanguage, key);
    const activeQueueStates = new Set(['JOB_STATE_PENDING', 'JOB_STATE_RUNNING']);
    const issueQueueStates = new Set(['JOB_STATE_FAILED', 'JOB_STATE_CANCELLED', 'JOB_STATE_EXPIRED']);
    const activeQueueCount = queuedJobs.filter((job) => activeQueueStates.has(job.state)).length;
    const importReadyQueueCount = queuedJobs.filter(
        (job) => job.state === 'JOB_STATE_SUCCEEDED' && job.importedAt == null,
    ).length;
    const issueQueueCount = queuedJobs.filter((job) => issueQueueStates.has(job.state)).length;
    const thoughtsBodyText = thoughtsText || thoughtsPlaceholder || null;
    const resultStatusClassName =
        resultStatusTone === 'warning'
            ? 'rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm leading-6 text-amber-800 dark:border-amber-500/20 dark:bg-amber-950/20 dark:text-amber-200'
            : 'rounded-2xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 text-sm leading-6 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-950/20 dark:text-emerald-200';

    return (
        <div data-testid="workspace-workflow-detail-panel" className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-4">
                <div className="nbu-overlay-card-neutral rounded-[24px] border p-4">
                    <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                        {t('workflowStatusLabel')}
                    </div>
                    <div className="mt-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {entries[0]?.displayMessage || t('workspacePanelStatusReserved')}
                    </div>
                </div>
                <div className="nbu-overlay-card-neutral rounded-[24px] border p-4">
                    <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                        {t('queuedBatchJobsTitle')}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        {batchProgress.total > 0 ? (
                            <span className="nbu-chip border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-950/20 dark:text-amber-200">
                                {batchProgress.completed}/{batchProgress.total}
                            </span>
                        ) : null}
                        {activeQueueCount > 0 ? (
                            <span className="nbu-chip">
                                {t('queuedBatchJobsActiveCount').replace('{0}', String(activeQueueCount))}
                            </span>
                        ) : null}
                        {importReadyQueueCount > 0 ? (
                            <span className="nbu-chip">
                                {t('queuedBatchJobsImportReadyCount').replace('{0}', String(importReadyQueueCount))}
                            </span>
                        ) : null}
                        {issueQueueCount > 0 ? (
                            <span className="nbu-chip">
                                {t('queuedBatchJobsClosedIssuesCount').replace('{0}', String(issueQueueCount))}
                            </span>
                        ) : null}
                        {batchProgress.total === 0 &&
                        activeQueueCount === 0 &&
                        importReadyQueueCount === 0 &&
                        issueQueueCount === 0 ? (
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                {t('workspacePanelStatusReserved')}
                            </span>
                        ) : null}
                    </div>
                </div>
                <div className="nbu-overlay-card-neutral rounded-[24px] border p-4 lg:col-span-2">
                    <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                        {t('stageGroundingResultStatus')}
                    </div>
                    <div className={`mt-3 ${resultStatusClassName}`}>
                        {resultStatusSummary || t('workspacePanelStatusReserved')}
                    </div>
                </div>
            </div>

            {thoughtEntries.length > 0 ? (
                <div
                    data-testid="workspace-workflow-detail-thoughts"
                    className="nbu-overlay-card-neutral rounded-[24px] border p-4"
                >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                            {t('workspaceInsightsAllThoughts')}
                        </div>
                        <span className="nbu-chip px-2.5 py-1 text-[10px] font-semibold">
                            {t('workspaceInsightsTurnsCount').replace('{0}', String(thoughtEntries.length))}
                        </span>
                    </div>
                    <div className="mt-3 space-y-3">
                        {thoughtEntries.map((entry) => (
                            <div
                                key={entry.id}
                                data-testid={`workspace-workflow-thought-entry-${entry.shortId}`}
                                className="rounded-[20px] border border-gray-200/80 bg-white/70 px-3 py-3 dark:border-white/10 dark:bg-white/[0.03]"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                                        <span className="nbu-chip px-2 py-0.5 text-[10px] font-mono text-gray-500 dark:text-gray-400">
                                            {entry.shortId}
                                        </span>
                                        {entry.prompt ? (
                                            <span className="min-w-0 break-words text-xs text-gray-500 dark:text-gray-400">
                                                {entry.prompt.length > 88
                                                    ? `${entry.prompt.slice(0, 88)}...`
                                                    : entry.prompt}
                                            </span>
                                        ) : null}
                                    </div>
                                    <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
                                        {entry.createdAtLabel}
                                    </span>
                                </div>
                                <div className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-gray-700 dark:text-gray-200">
                                    {entry.thoughts}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : thoughtsBodyText ? (
                <div
                    data-testid="workspace-workflow-detail-thoughts"
                    className="nbu-overlay-card-neutral rounded-[24px] border p-4"
                >
                    <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                        {t('workspaceInsightsAllThoughts')}
                    </div>
                    <div className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-gray-700 dark:text-gray-200">
                        {thoughtsBodyText}
                    </div>
                </div>
            ) : null}

            {contextPanel ? <div data-testid="workspace-workflow-detail-context">{contextPanel}</div> : null}

            <div data-testid="workspace-workflow-detail-list" className="space-y-3">
                {entries.length > 0 ? (
                    entries.map((entry, index) => (
                        <div
                            key={`${entry.timestamp || 'no-time'}-${index}`}
                            data-testid={`workspace-workflow-detail-entry-${index}`}
                            className={`rounded-[24px] border px-4 py-4 ${entry.border}`}
                        >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <span className={`text-sm font-bold ${entry.tone}`}>{entry.icon}</span>
                                    <span className="nbu-status-pill">{t(getWorkflowEntryLabelKey(entry))}</span>
                                </div>
                                {entry.timestamp ? (
                                    <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
                                        {entry.timestamp}
                                    </span>
                                ) : null}
                            </div>
                            <div className="mt-3 break-words text-sm leading-6 text-gray-700 dark:text-gray-200">
                                {entry.displayMessage}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="nbu-overlay-card-neutral rounded-[24px] border border-dashed px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                        {t('workspacePanelStatusReserved')}
                    </div>
                )}
            </div>
        </div>
    );
}

export default React.memo(WorkspaceWorkflowDetailPanel);
