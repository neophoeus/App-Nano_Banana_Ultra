import React from 'react';
import { getWorkflowEntryLabelKey } from '../utils/workflowTimeline';
import { getTranslation, Language } from '../utils/translations';

type WorkflowEntryLike = {
    timestamp?: string | null;
    displayMessage: string;
    label: string;
    stage: 'system' | 'input' | 'request' | 'processing' | 'output' | 'history' | 'error';
};

type WorkspaceWorkflowCardProps = {
    currentLanguage: Language;
    latestWorkflowEntry: WorkflowEntryLike | null;
    isGenerating: boolean;
    thoughtsText?: string | null;
    onOpenDetails: () => void;
};

const LightbulbIcon = ({ hasThoughts }: { hasThoughts: boolean }) => (
    <span
        data-testid="workspace-workflow-thoughts-indicator"
        className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition-all ${
            hasThoughts
                ? 'border-amber-300/70 bg-amber-100/90 text-amber-500 shadow-[0_0_18px_rgba(251,191,36,0.42)] dark:border-amber-400/40 dark:bg-amber-500/12 dark:text-amber-300 dark:shadow-[0_0_20px_rgba(251,191,36,0.28)]'
                : 'border-slate-200 bg-slate-100 text-slate-400 grayscale dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-500'
        }`}
        aria-hidden="true"
    >
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8">
            <path
                d="M9 18h6M10 21h4M8.2 14.7C6.85 13.58 6 11.89 6 10a6 6 0 1 1 12 0c0 1.89-.85 3.58-2.2 4.7-.87.72-1.3 1.5-1.3 2.3H9.5c0-.8-.43-1.58-1.3-2.3Z"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    </span>
);

function WorkspaceWorkflowCard({
    currentLanguage,
    latestWorkflowEntry,
    isGenerating,
    thoughtsText,
    onOpenDetails,
}: WorkspaceWorkflowCardProps) {
    const t = (key: string) => getTranslation(currentLanguage, key);
    const workflowStatusLabel = latestWorkflowEntry
        ? t(getWorkflowEntryLabelKey(latestWorkflowEntry))
        : t('workflowStatusIdle');
    const workflowHeadline = isGenerating
        ? t('statusGenerating')
        : latestWorkflowEntry?.displayMessage || t('workflowStatusIdle');
    const hasThoughts = Boolean(thoughtsText?.trim());

    return (
        <button
            type="button"
            data-testid="workspace-workflow-card"
            onClick={onOpenDetails}
            className="group min-w-0 nbu-shell-panel nbu-shell-surface-context-rail flex w-full items-center gap-4 overflow-hidden px-4 py-4 text-left transition-colors hover:border-amber-300 dark:hover:border-amber-500/30 xl:min-h-[108px]"
        >
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <p className="nbu-section-eyebrow">{t('workspaceInsightsCurrentWork')}</p>
                    <span className="nbu-status-pill">{workflowStatusLabel}</span>
                </div>
                <div
                    data-testid="context-workflow-summary"
                    className="mt-2 truncate text-sm font-semibold text-slate-900 dark:text-slate-100"
                >
                    {workflowHeadline}
                </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
                <LightbulbIcon hasThoughts={hasThoughts} />
                <span
                    data-testid="workspace-workflow-open-details"
                    className="hidden text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 transition-colors group-hover:text-amber-600 dark:text-slate-500 dark:group-hover:text-amber-300 sm:inline"
                >
                    {t('workspacePanelViewDetails')}
                </span>
            </div>
        </button>
    );
}

export default React.memo(WorkspaceWorkflowCard);
