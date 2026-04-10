import React from 'react';
import { QueuedBatchJob } from '../types';
import { getTranslation, Language } from '../utils/translations';
import {
    isQueuedBatchJobActive,
    isQueuedBatchJobAutoImportReady,
    isQueuedBatchJobClosedIssue,
} from '../utils/queuedBatchJobs';
import { getWorkflowEntryLabelKey } from '../utils/workflowTimeline';

export type WorkspaceProgressThoughtEntry = {
    id: string;
    shortId: string;
    prompt: string | null;
    thoughts: string;
    createdAtLabel: string;
    createdAtMs?: number | null;
};

type WorkflowEntryLike = {
    timestamp?: string | null;
    displayMessage: string;
    label: string;
    stage: 'system' | 'input' | 'request' | 'processing' | 'output' | 'history' | 'error';
};

type WorkspaceProgressDetailPanelProps = {
    currentLanguage: Language;
    thoughtEntries?: WorkspaceProgressThoughtEntry[];
    latestWorkflowEntry?: WorkflowEntryLike | null;
    isGenerating?: boolean;
    batchProgress?: {
        completed: number;
        total: number;
    };
    queuedJobs?: QueuedBatchJob[];
    resultStatusSummary?: string | null;
    resultStatusTone?: 'warning' | 'success' | null;
    thoughtsText?: string | null;
    thoughtsPlaceholder?: string | null;
};

function WorkspaceProgressDetailPanel({
    currentLanguage,
    thoughtEntries = [],
    latestWorkflowEntry = null,
    isGenerating = false,
    batchProgress = { completed: 0, total: 0 },
    queuedJobs = [],
    resultStatusSummary = null,
    resultStatusTone = null,
    thoughtsText,
    thoughtsPlaceholder,
}: WorkspaceProgressDetailPanelProps) {
    const t = (key: string) => getTranslation(currentLanguage, key);
    const activeQueueCount = queuedJobs.filter(isQueuedBatchJobActive).length;
    const importReadyQueueCount = queuedJobs.filter(isQueuedBatchJobAutoImportReady).length;
    const issueQueueCount = queuedJobs.filter(isQueuedBatchJobClosedIssue).length;
    const workflowStatusLabel = latestWorkflowEntry
        ? t(getWorkflowEntryLabelKey(latestWorkflowEntry))
        : isGenerating
          ? t('statusGenerating')
          : t('workflowStatusIdle');
    const workflowHeadline = isGenerating
        ? t('statusGenerating')
        : latestWorkflowEntry?.displayMessage || t('workflowStatusIdle');
    const workflowDetailMessage = latestWorkflowEntry?.displayMessage || t('workspacePanelStatusReserved');
    const shouldShowWorkflowDetailMessage = isGenerating && workflowDetailMessage !== workflowHeadline;
    const progressSummaryClassName =
        'rounded-[24px] border border-amber-200/80 bg-amber-50/70 px-4 py-3 dark:border-amber-500/25 dark:bg-[#18130d]';
    const progressPillClassName =
        'inline-flex items-center rounded-full border border-amber-200/80 bg-white/85 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-700 dark:border-amber-500/25 dark:bg-amber-950/45 dark:text-amber-100';
    const progressWorkflowCardClassName =
        'rounded-[24px] border border-amber-200/80 bg-white/92 px-4 py-3 dark:border-amber-500/20 dark:bg-[#111217]';
    const progressAmberChipClassName =
        'nbu-chip border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-100';
    const hasWorkflowSummary = Boolean(
        latestWorkflowEntry ||
        isGenerating ||
        batchProgress.total > 0 ||
        activeQueueCount > 0 ||
        importReadyQueueCount > 0 ||
        issueQueueCount > 0 ||
        resultStatusSummary,
    );
    const resultStatusClassName =
        resultStatusTone === 'warning'
            ? 'rounded-2xl border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-500/25 dark:bg-[#1a140d] dark:text-amber-100'
            : 'rounded-2xl border border-emerald-200/80 bg-emerald-50/90 px-3 py-2 text-xs font-medium text-emerald-800 dark:border-emerald-500/25 dark:bg-[#0f1916] dark:text-emerald-100';
    const thoughtsBodyText = thoughtsText?.trim() ? thoughtsText : null;
    const detailThoughtEntries = React.useMemo(
        () =>
            thoughtEntries.length > 0
                ? [...thoughtEntries].sort((left, right) => {
                      const leftMs = left.createdAtMs ?? Number.MIN_SAFE_INTEGER;
                      const rightMs = right.createdAtMs ?? Number.MIN_SAFE_INTEGER;
                      return rightMs - leftMs;
                  })
                : thoughtsBodyText
                  ? [
                        {
                            id: 'active-session-thoughts',
                            shortId: '--------',
                            prompt: null,
                            thoughts: thoughtsBodyText,
                            createdAtLabel: '',
                            createdAtMs: null,
                        },
                    ]
                  : [],
        [thoughtEntries, thoughtsBodyText],
    );
    const latestThoughtEntry = detailThoughtEntries[0] || null;
    const latestThoughtSnapshot =
        latestThoughtEntry?.thoughts || thoughtsPlaceholder || t('workspacePanelStatusReserved');
    const trimmedProgressSummary =
        latestThoughtSnapshot.length > 180 ? `${latestThoughtSnapshot.slice(0, 177)}...` : latestThoughtSnapshot;
    const latestPromptPreview = latestThoughtEntry?.prompt?.trim()
        ? latestThoughtEntry.prompt.length > 120
            ? `${latestThoughtEntry.prompt.slice(0, 120)}...`
            : latestThoughtEntry.prompt
        : null;
    const thoughtUpdateCountLabel = t('workspaceInsightsItemsCount').replace(
        '{0}',
        String(detailThoughtEntries.length),
    );

    return (
        <div data-testid="workspace-progress-detail-panel" className="space-y-3">
            <div data-testid="workspace-progress-detail-summary" className={progressSummaryClassName}>
                <div className="flex flex-wrap items-center gap-2">
                    <span className={progressPillClassName}>{t('workspaceSupportProgress')}</span>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-200">
                        {detailThoughtEntries.length > 0
                            ? t('workspacePanelStatusEnabled')
                            : t('workspacePanelStatusReserved')}
                    </span>
                </div>
                <div
                    data-testid="workspace-progress-detail-summary-text"
                    className="mt-2 break-words text-sm leading-6 text-slate-700 dark:text-slate-200"
                >
                    {trimmedProgressSummary}
                </div>
            </div>

            {hasWorkflowSummary ? (
                <div data-testid="workspace-progress-workflow-summary" className={progressWorkflowCardClassName}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                            {t('workflowStatusLabel')}
                        </div>
                        <span data-testid="workspace-progress-workflow-status" className={progressPillClassName}>
                            {workflowStatusLabel}
                        </span>
                    </div>
                    <div
                        data-testid="workspace-progress-workflow-headline"
                        className="mt-2.5 break-words text-sm font-semibold leading-6 text-slate-800 dark:text-slate-100"
                    >
                        {workflowHeadline}
                    </div>
                    {shouldShowWorkflowDetailMessage ? (
                        <div
                            data-testid="workspace-progress-workflow-detail"
                            className="mt-2 break-words text-xs leading-5 text-gray-500 dark:text-gray-400"
                        >
                            {workflowDetailMessage}
                        </div>
                    ) : null}
                    {batchProgress.total > 0 ||
                    activeQueueCount > 0 ||
                    importReadyQueueCount > 0 ||
                    issueQueueCount > 0 ? (
                        <div className="mt-2.5 flex flex-wrap gap-2 text-xs">
                            {batchProgress.total > 0 ? (
                                <span
                                    data-testid="workspace-progress-workflow-progress"
                                    className={progressAmberChipClassName}
                                >
                                    {batchProgress.completed}/{batchProgress.total}
                                </span>
                            ) : null}
                            {activeQueueCount > 0 ? (
                                <span data-testid="workspace-progress-workflow-active-queue" className="nbu-chip">
                                    {t('queuedBatchJobsActiveCount').replace('{0}', String(activeQueueCount))}
                                </span>
                            ) : null}
                            {importReadyQueueCount > 0 ? (
                                <span data-testid="workspace-progress-workflow-import-ready-queue" className="nbu-chip">
                                    {t('queuedBatchJobsImportReadyCount').replace('{0}', String(importReadyQueueCount))}
                                </span>
                            ) : null}
                            {issueQueueCount > 0 ? (
                                <span data-testid="workspace-progress-workflow-issue-queue" className="nbu-chip">
                                    {t('queuedBatchJobsClosedIssuesCount').replace('{0}', String(issueQueueCount))}
                                </span>
                            ) : null}
                        </div>
                    ) : null}
                    {resultStatusSummary ? (
                        <div
                            data-testid="workspace-progress-workflow-result-status"
                            className={`${resultStatusClassName} mt-2.5`}
                        >
                            <span className="mr-2 inline-flex rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-current dark:bg-black/35">
                                {t('stageGroundingResultStatus')}
                            </span>
                            <span>{resultStatusSummary}</span>
                        </div>
                    ) : null}
                </div>
            ) : null}

            <div
                data-testid="workspace-progress-accumulated-card"
                className="rounded-[24px] border border-amber-200/80 bg-white/92 px-4 py-3 dark:border-amber-500/20 dark:bg-[#111217]"
            >
                <div className="flex flex-wrap items-center gap-2">
                    <span className={progressPillClassName}>{t('workspaceInsightsLatestThoughts')}</span>
                    {detailThoughtEntries.length > 0 ? (
                        <span
                            data-testid="workspace-progress-accumulated-count"
                            className="nbu-chip px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300"
                        >
                            {thoughtUpdateCountLabel}
                        </span>
                    ) : null}
                </div>
                {latestPromptPreview ? (
                    <div
                        data-testid="workspace-progress-accumulated-prompt"
                        className="mt-2 break-words text-xs leading-5 text-gray-500 dark:text-gray-400"
                    >
                        {latestPromptPreview}
                    </div>
                ) : null}
                <div
                    data-testid="workspace-progress-accumulated-text"
                    className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-800 dark:text-slate-100"
                >
                    {latestThoughtSnapshot}
                </div>
            </div>

            <div data-testid="workspace-progress-detail-stream" className={progressSummaryClassName}>
                <div className="flex flex-wrap items-center gap-2">
                    <span className={progressPillClassName}>{t('workspaceInsightsAllThoughts')}</span>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-200">
                        {detailThoughtEntries.length > 0
                            ? t('workspacePanelStatusEnabled')
                            : t('workspacePanelStatusReserved')}
                    </span>
                </div>
                <div className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {detailThoughtEntries.length > 0
                        ? t('workspaceProgressChronologicalHint')
                        : thoughtsPlaceholder || t('workspacePanelStatusReserved')}
                </div>
            </div>

            <div data-testid="workspace-progress-detail-list" className="space-y-2.5">
                {detailThoughtEntries.length > 0 ? (
                    detailThoughtEntries.map((entry) => (
                        <article
                            key={entry.id}
                            data-testid={`workspace-progress-detail-thought-entry-${entry.shortId}`}
                            className="rounded-[24px] border border-amber-200 bg-white/92 px-4 py-3 dark:border-amber-500/20 dark:bg-[#111217]"
                        >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex min-w-0 flex-wrap items-center gap-2">
                                    <span className="text-sm font-bold text-amber-600 dark:text-amber-300">☼</span>
                                    <span className={progressPillClassName}>{t('workspaceViewerThoughts')}</span>
                                    {entry.shortId !== '--------' ? (
                                        <span className="nbu-chip px-2 py-0.5 text-[10px] font-mono text-gray-500 dark:text-gray-400">
                                            {entry.shortId}
                                        </span>
                                    ) : null}
                                </div>
                                {entry.createdAtLabel ? (
                                    <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
                                        {entry.createdAtLabel}
                                    </span>
                                ) : null}
                            </div>
                            {entry.prompt ? (
                                <div className="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-400">
                                    {entry.prompt.length > 120 ? `${entry.prompt.slice(0, 120)}...` : entry.prompt}
                                </div>
                            ) : null}
                            <div className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-800 dark:text-slate-100">
                                {entry.thoughts}
                            </div>
                        </article>
                    ))
                ) : (
                    <div className="rounded-[24px] border border-dashed px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                        {t('workspacePanelStatusReserved')}
                    </div>
                )}
            </div>
        </div>
    );
}

export default React.memo(WorkspaceProgressDetailPanel);
