import React from 'react';
import { QueuedBatchJob, ResultPart } from '../types';
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
    resultParts?: ResultPart[];
    createdAtLabel: string;
    createdAtMs?: number | null;
    slotIndex?: number;
    slotLabel?: string;
    isLive?: boolean;
    isFailed?: boolean;
};

const isThoughtResultPart = (part: ResultPart) => part.kind === 'thought-text' || part.kind === 'thought-image';

const getEntryThoughtParts = (entry: WorkspaceProgressThoughtEntry): ResultPart[] =>
    (entry.resultParts || []).filter(isThoughtResultPart).sort((left, right) => left.sequence - right.sequence);

const getEntryThoughtSnapshot = (entry: WorkspaceProgressThoughtEntry, fallbackLabel: string) => {
    const thoughtParts = getEntryThoughtParts(entry);
    const latestThoughtTextPart = [...thoughtParts]
        .reverse()
        .find((part): part is Extract<ResultPart, { kind: 'thought-text' }> => part.kind === 'thought-text');

    if (latestThoughtTextPart?.text.trim()) {
        return latestThoughtTextPart.text.trim();
    }

    if (entry.thoughts.trim()) {
        return entry.thoughts.trim();
    }

    return thoughtParts.some((part) => part.kind === 'thought-image') ? fallbackLabel : '';
};

const truncateText = (value: string, maxLength: number) =>
    value.length > maxLength ? `${value.slice(0, Math.max(0, maxLength - 3))}...` : value;

const getEntryNavigatorLabel = (entry: WorkspaceProgressThoughtEntry, fallbackLabel: string) => {
    if (entry.slotLabel?.trim()) {
        return entry.slotLabel.trim();
    }

    if (entry.shortId !== '--------') {
        return entry.shortId;
    }

    return fallbackLabel;
};

const getPreferredSelectedEntryId = (
    liveEntries: WorkspaceProgressThoughtEntry[],
    archivedEntries: WorkspaceProgressThoughtEntry[],
    allEntries: WorkspaceProgressThoughtEntry[],
) => liveEntries[0]?.id ?? archivedEntries[0]?.id ?? allEntries[0]?.id ?? null;

const renderThoughtEntryContent = (entry: WorkspaceProgressThoughtEntry, t: (key: string) => string) => {
    const thoughtParts = getEntryThoughtParts(entry);

    if (thoughtParts.length > 0) {
        return thoughtParts.map((part) =>
            part.kind === 'thought-text' ? (
                <div
                    key={`${entry.id}-${part.sequence}`}
                    data-testid={`workspace-progress-detail-part-text-${entry.shortId}-${part.sequence}`}
                    className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-800 dark:text-slate-100"
                >
                    {part.text}
                </div>
            ) : (
                <figure
                    key={`${entry.id}-${part.sequence}`}
                    data-testid={`workspace-progress-detail-part-image-${entry.shortId}-${part.sequence}`}
                    className="overflow-hidden rounded-[20px] border border-amber-200/80 bg-slate-950/70 p-2 dark:border-amber-500/20"
                >
                    <img
                        src={part.imageUrl}
                        alt={t('workspaceViewerThoughts')}
                        className="max-h-72 w-full rounded-[14px] object-contain"
                    />
                </figure>
            ),
        );
    }

    return (
        <div className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-800 dark:text-slate-100">
            {entry.thoughts}
        </div>
    );
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
    const progressFailureChipClassName =
        'nbu-chip border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-950/40 dark:text-red-100';
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
                            resultParts: [],
                            createdAtLabel: '',
                            createdAtMs: null,
                        },
                    ]
                  : [],
        [thoughtEntries, thoughtsBodyText],
    );
    const liveBatchEntries = React.useMemo(
        () =>
            detailThoughtEntries
                .filter((entry) => entry.isLive && typeof entry.slotIndex === 'number')
                .sort((left, right) => (left.slotIndex ?? 0) - (right.slotIndex ?? 0)),
        [detailThoughtEntries],
    );
    const archivedThoughtEntries = React.useMemo(
        () => detailThoughtEntries.filter((entry) => !(entry.isLive && typeof entry.slotIndex === 'number')),
        [detailThoughtEntries],
    );
    const [selectedEntryId, setSelectedEntryId] = React.useState<string | null>(() =>
        getPreferredSelectedEntryId(liveBatchEntries, archivedThoughtEntries, detailThoughtEntries),
    );
    const [hasManualSelection, setHasManualSelection] = React.useState(false);

    React.useEffect(() => {
        const preferredEntryId = getPreferredSelectedEntryId(
            liveBatchEntries,
            archivedThoughtEntries,
            detailThoughtEntries,
        );

        if (!preferredEntryId) {
            if (selectedEntryId !== null) {
                setSelectedEntryId(null);
            }
            if (hasManualSelection) {
                setHasManualSelection(false);
            }
            return;
        }

        const selectedStillExists = selectedEntryId
            ? detailThoughtEntries.some((entry) => entry.id === selectedEntryId)
            : false;

        if (!selectedStillExists) {
            if (selectedEntryId !== preferredEntryId) {
                setSelectedEntryId(preferredEntryId);
            }
            if (hasManualSelection) {
                setHasManualSelection(false);
            }
            return;
        }

        if (!hasManualSelection && liveBatchEntries.length > 0) {
            const selectedIsLive = liveBatchEntries.some((entry) => entry.id === selectedEntryId);

            if (!selectedIsLive && selectedEntryId !== liveBatchEntries[0].id) {
                setSelectedEntryId(liveBatchEntries[0].id);
            }
        }
    }, [archivedThoughtEntries, detailThoughtEntries, hasManualSelection, liveBatchEntries, selectedEntryId]);

    const handleSelectEntry = React.useCallback((entryId: string) => {
        setSelectedEntryId(entryId);
        setHasManualSelection(true);
    }, []);

    const selectedEntry = React.useMemo(
        () => detailThoughtEntries.find((entry) => entry.id === selectedEntryId) || detailThoughtEntries[0] || null,
        [detailThoughtEntries, selectedEntryId],
    );
    const latestThoughtEntry = detailThoughtEntries[0] || null;
    const latestThoughtSnapshot = latestThoughtEntry
        ? getEntryThoughtSnapshot(latestThoughtEntry, t('workspaceViewerThoughts')) ||
          thoughtsPlaceholder ||
          t('workspacePanelStatusReserved')
        : thoughtsPlaceholder || t('workspacePanelStatusReserved');
    const trimmedProgressSummary = truncateText(latestThoughtSnapshot, 220);
    const latestPromptPreview = latestThoughtEntry?.prompt?.trim()
        ? truncateText(latestThoughtEntry.prompt, 180)
        : null;
    const thoughtUpdateCountLabel = t('workspaceInsightsItemsCount').replace(
        '{0}',
        String(detailThoughtEntries.length),
    );
    const historyCountLabel = t('workspaceInsightsTurnsCount').replace('{0}', String(archivedThoughtEntries.length));
    const progressStatusLabel =
        liveBatchEntries.length > 0 || isGenerating
            ? t('statusGenerating')
            : detailThoughtEntries.length > 0
              ? t('workspacePanelStatusEnabled')
              : t('workspacePanelStatusReserved');
    const selectedEntryLabel = selectedEntry ? getEntryNavigatorLabel(selectedEntry, t('workspaceViewerThoughts')) : null;
    const selectedPromptPreview = selectedEntry?.prompt?.trim() ? truncateText(selectedEntry.prompt, 280) : null;
    const selectedThoughtParts = selectedEntry ? getEntryThoughtParts(selectedEntry) : [];
    const navigatorButtonBaseClassName =
        'w-full rounded-[20px] border px-3 py-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70';
    const navigatorButtonIdleClassName =
        'border-slate-200/80 bg-slate-50/85 hover:border-amber-300 hover:bg-amber-50/55 dark:border-slate-700/80 dark:bg-slate-900/45 dark:hover:border-amber-500/30 dark:hover:bg-amber-500/10';
    const navigatorButtonSelectedClassName =
        'border-amber-300 bg-amber-50 text-slate-900 shadow-[0_18px_42px_rgba(245,158,11,0.12)] dark:border-amber-500/30 dark:bg-amber-500/12 dark:text-slate-50';
    const selectionPanelClassName =
        'rounded-[24px] border border-amber-200/80 bg-white/92 px-4 py-4 shadow-[0_18px_48px_rgba(15,23,42,0.08)] dark:border-amber-500/20 dark:bg-[#111217]';

    return (
        <div data-testid="workspace-progress-detail-panel" className="space-y-3">
            <div
                data-testid="workspace-progress-detail-overview"
                className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]"
            >
                <div data-testid="workspace-progress-detail-summary" className={progressSummaryClassName}>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={progressPillClassName}>{t('workspaceSupportProgress')}</span>
                        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-200">
                            {progressStatusLabel}
                        </span>
                        {detailThoughtEntries.length > 0 ? (
                            <span className="nbu-chip px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                                {thoughtUpdateCountLabel}
                            </span>
                        ) : null}
                        {liveBatchEntries.length > 0 ? (
                            <span
                                data-testid="workspace-progress-detail-live-badge"
                                className={progressAmberChipClassName}
                            >
                                {t('workspaceInsightsPhaseLabel')}
                            </span>
                        ) : null}
                        {archivedThoughtEntries.length > 0 ? (
                            <span className="nbu-chip px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                                {historyCountLabel}
                            </span>
                        ) : null}
                    </div>
                    {latestPromptPreview ? (
                        <div className="mt-2 break-words text-xs leading-5 text-amber-800/80 dark:text-amber-100/80">
                            {latestPromptPreview}
                        </div>
                    ) : null}
                    <div
                        data-testid="workspace-progress-detail-summary-text"
                        className="mt-3 break-words text-sm leading-6 text-slate-700 dark:text-slate-200"
                    >
                        {trimmedProgressSummary}
                    </div>
                    <div className="mt-3 text-xs leading-5 text-slate-600 dark:text-slate-300">
                        {detailThoughtEntries.length > 0
                            ? t('workspaceProgressChronologicalHint')
                            : thoughtsPlaceholder || t('workspacePanelStatusReserved')}
                    </div>
                </div>

                <div className="space-y-3">
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
                                    <span
                                        data-testid="workspace-progress-workflow-import-ready-queue"
                                        className="nbu-chip"
                                    >
                                        {t('queuedBatchJobsImportReadyCount').replace(
                                            '{0}',
                                            String(importReadyQueueCount),
                                        )}
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
                </div>
            </div>

            <div
                data-testid="workspace-progress-detail-layout"
                className="space-y-3 xl:grid xl:grid-cols-[minmax(260px,300px)_minmax(0,1fr)] xl:gap-4 xl:space-y-0"
            >
                <div data-testid="workspace-progress-detail-navigator" className="space-y-3">
                    {liveBatchEntries.length > 0 ? (
                        <section data-testid="workspace-progress-detail-live-nav" className={selectionPanelClassName}>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                                        {t('workspaceViewerThoughts')}
                                    </span>
                                    <span className={progressAmberChipClassName}>{t('workspaceInsightsPhaseLabel')}</span>
                                </div>
                                {batchProgress.total > 0 ? (
                                    <span className="nbu-chip px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                                        {batchProgress.completed}/{batchProgress.total}
                                    </span>
                                ) : null}
                            </div>
                            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 xl:block xl:space-y-2 xl:overflow-visible xl:pb-0">
                                {liveBatchEntries.map((entry) => {
                                    const isSelected = entry.id === selectedEntry?.id;
                                    const navigatorLabel = getEntryNavigatorLabel(entry, t('workspaceViewerThoughts'));
                                    const navigatorSnapshot =
                                        getEntryThoughtSnapshot(entry, t('workspaceViewerThoughts')) ||
                                        thoughtsPlaceholder ||
                                        t('workspacePanelStatusReserved');

                                    return (
                                        <button
                                            key={entry.id}
                                            type="button"
                                            data-testid={`workspace-progress-detail-live-entry-${entry.slotIndex}`}
                                            aria-pressed={isSelected}
                                            onClick={() => handleSelectEntry(entry.id)}
                                            className={`${navigatorButtonBaseClassName} min-w-[220px] shrink-0 xl:min-w-0 ${
                                                isSelected ? navigatorButtonSelectedClassName : navigatorButtonIdleClassName
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex min-w-0 items-center gap-2">
                                                    <span className="text-sm font-black text-slate-800 dark:text-slate-100">
                                                        {navigatorLabel}
                                                    </span>
                                                    <span className="nbu-chip px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                                                        {t('workspaceInsightsPhaseLabel')}
                                                    </span>
                                                </div>
                                                {entry.createdAtLabel ? (
                                                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                                        {entry.createdAtLabel}
                                                    </span>
                                                ) : null}
                                            </div>
                                            <div className="mt-2 break-words text-xs leading-5 text-slate-600 dark:text-slate-300">
                                                {truncateText(navigatorSnapshot, 110)}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                    ) : null}

                    {archivedThoughtEntries.length > 0 ? (
                        <section data-testid="workspace-progress-detail-history-nav" className={selectionPanelClassName}>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                                    {t('historyFilmstripTitle')}
                                </span>
                                <span className="nbu-chip px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                                    {historyCountLabel}
                                </span>
                            </div>
                            <div className="mt-3 space-y-2">
                                {archivedThoughtEntries.map((entry) => {
                                    const isSelected = entry.id === selectedEntry?.id;
                                    const navigatorLabel = getEntryNavigatorLabel(entry, t('workspaceViewerThoughts'));
                                    const navigatorSnapshot =
                                        getEntryThoughtSnapshot(entry, t('workspaceViewerThoughts')) ||
                                        thoughtsPlaceholder ||
                                        t('workspacePanelStatusReserved');

                                    return (
                                        <button
                                            key={entry.id}
                                            type="button"
                                            data-testid={`workspace-progress-detail-history-entry-${entry.shortId}`}
                                            aria-pressed={isSelected}
                                            onClick={() => handleSelectEntry(entry.id)}
                                            className={`${navigatorButtonBaseClassName} ${
                                                isSelected ? navigatorButtonSelectedClassName : navigatorButtonIdleClassName
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex min-w-0 items-center gap-2">
                                                    <span className="min-w-0 truncate text-sm font-black text-slate-800 dark:text-slate-100">
                                                        {navigatorLabel}
                                                    </span>
                                                    {entry.isFailed ? (
                                                        <span
                                                            data-testid={`workspace-progress-detail-history-entry-status-${entry.shortId}`}
                                                            className={progressFailureChipClassName}
                                                        >
                                                            {t('lblHistoryFailed')}
                                                        </span>
                                                    ) : null}
                                                </div>
                                                {entry.createdAtLabel ? (
                                                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                                        {entry.createdAtLabel}
                                                    </span>
                                                ) : null}
                                            </div>
                                            <div className="mt-2 break-words text-xs leading-5 text-slate-600 dark:text-slate-300">
                                                {truncateText(navigatorSnapshot, 110)}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                    ) : null}

                    {liveBatchEntries.length === 0 && archivedThoughtEntries.length === 0 ? (
                        <div
                            data-testid="workspace-progress-detail-empty"
                            className="rounded-[24px] border border-dashed px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                        >
                            {thoughtsPlaceholder || t('workspacePanelStatusReserved')}
                        </div>
                    ) : null}
                </div>

                <article data-testid="workspace-progress-detail-selected-panel" className={selectionPanelClassName}>
                    {selectedEntry ? (
                        <>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex min-w-0 flex-wrap items-center gap-2">
                                    <span className={progressPillClassName}>{t('workspaceInsightsAllThoughts')}</span>
                                    {selectedEntryLabel ? (
                                        <span
                                            data-testid="workspace-progress-detail-selected-label"
                                            className="nbu-chip px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300"
                                        >
                                            {selectedEntryLabel}
                                        </span>
                                    ) : null}
                                    {selectedEntry.isLive ? (
                                        <span
                                            data-testid="workspace-progress-detail-selected-live"
                                            className={progressAmberChipClassName}
                                        >
                                            {t('workspaceInsightsPhaseLabel')}
                                        </span>
                                    ) : null}
                                    {selectedEntry.isFailed ? (
                                        <span
                                            data-testid="workspace-progress-detail-selected-failed"
                                            className={progressFailureChipClassName}
                                        >
                                            {t('lblHistoryFailed')}
                                        </span>
                                    ) : null}
                                </div>
                                {selectedEntry.createdAtLabel ? (
                                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                        {selectedEntry.createdAtLabel}
                                    </span>
                                ) : null}
                            </div>

                            {selectedPromptPreview ? (
                                <div
                                    data-testid="workspace-progress-detail-selected-prompt"
                                    className="mt-3 rounded-[20px] border border-slate-200/80 bg-slate-50/85 px-3 py-2 text-xs leading-5 text-slate-600 dark:border-slate-700/80 dark:bg-slate-900/55 dark:text-slate-300"
                                >
                                    {selectedPromptPreview}
                                </div>
                            ) : null}

                            <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                <span className="nbu-chip px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                                    {t('workspaceInsightsItemsCount').replace('{0}', String(selectedThoughtParts.length || 1))}
                                </span>
                                {!selectedEntry.isLive ? (
                                    <span className="nbu-chip px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                                        {t('selectedItemSummaryAnchor')}
                                    </span>
                                ) : null}
                            </div>

                            <div className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
                                {t('workspaceProgressChronologicalHint')}
                            </div>

                            <div
                                data-testid="workspace-progress-detail-selected-content"
                                className="mt-4 space-y-3"
                            >
                                {renderThoughtEntryContent(selectedEntry, t)}
                            </div>
                        </>
                    ) : (
                        <div className="rounded-[24px] border border-dashed px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                            {thoughtsPlaceholder || t('workspacePanelStatusReserved')}
                        </div>
                    )}
                </article>
            </div>
        </div>
    );
}

export default React.memo(WorkspaceProgressDetailPanel);
