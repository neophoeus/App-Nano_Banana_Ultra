import React from 'react';
import WorkspaceProgressCard from './WorkspaceProgressCard';
import {
    topLauncherCompactButtonClassName,
    topLauncherCompactLabelClassName,
} from '../utils/workspaceTopLauncherStyles';
import type { Language } from '../utils/translations';

export const TopLauncherSignal: React.FC<{ active: boolean; dataTestId: string }> = ({
    active,
    dataTestId,
}) => {
    const activeOuterClassName =
        'bg-amber-300/60 shadow-[0_0_18px_rgba(251,191,36,0.52)] dark:bg-amber-300/40 dark:shadow-[0_0_20px_rgba(251,191,36,0.36)]';
    const activeInnerClassName = 'bg-amber-400 ring-2 ring-amber-100/90 dark:bg-amber-300 dark:ring-amber-400/30';
    const inactiveOuterClassName =
        'bg-slate-200/65 ring-1 ring-slate-500/15 shadow-inner shadow-slate-400/20 opacity-95 dark:bg-slate-700/40 dark:ring-slate-400/20 dark:shadow-black/20';
    const inactiveInnerClassName = 'bg-slate-500/70 dark:bg-slate-400/70';

    return (
        <span
            data-testid={dataTestId}
            aria-hidden="true"
            className="relative inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center"
        >
            <span
                className={`absolute inset-0 rounded-full transition-all duration-300 ${
                    active ? `${activeOuterClassName} animate-pulse opacity-100` : inactiveOuterClassName
                }`}
            />
            <span
                className={`relative h-1.5 w-1.5 rounded-full transition-all duration-300 ${
                    active ? activeInnerClassName : inactiveInnerClassName
                }`}
            />
        </span>
    );
};

export interface WorkspaceSupportRailProps {
    currentLanguage: Language;
    progressThoughtsSummaryText: string;
    hasProgressActivity: boolean;
    hasSourceTrailInfo: boolean;
    hasQueuedBatchActivity: boolean;
    supportsQueuedBatch: boolean;
    onOpenProgressDetails: () => void;
    onOpenSourcesDetails: () => void;
    onOpenQueuedBatchJobs: () => void;
    t: (key: string) => string;
}

export function renderWorkspaceSupportRail(props: WorkspaceSupportRailProps): React.ReactElement {
    const {
        currentLanguage,
        progressThoughtsSummaryText,
        hasProgressActivity,
        hasSourceTrailInfo,
        hasQueuedBatchActivity,
        supportsQueuedBatch,
        onOpenProgressDetails,
        onOpenSourcesDetails,
        onOpenQueuedBatchJobs,
        t,
    } = props;

    return (
        <React.Fragment>
            <WorkspaceProgressCard
                currentLanguage={currentLanguage}
                thoughtsText={progressThoughtsSummaryText}
                hasThoughtArtifacts={hasProgressActivity}
                onOpenDetails={onOpenProgressDetails}
            />
            <button
                type="button"
                data-testid="workspace-sources-open-details"
                onClick={onOpenSourcesDetails}
                className={`${topLauncherCompactButtonClassName} nbu-shell-surface-context-rail hover:border-sky-300 dark:hover:border-sky-500/30`}
            >
                <span className="flex min-w-0 items-center gap-2">
                    <TopLauncherSignal active={hasSourceTrailInfo} dataTestId="workspace-sources-signal" />
                    <span className={topLauncherCompactLabelClassName}>{t('workspaceSupportSources')}</span>
                </span>
            </button>
            {supportsQueuedBatch ? (
                <button
                    type="button"
                    data-testid="workspace-queue-open-details"
                    onClick={onOpenQueuedBatchJobs}
                    className={`${topLauncherCompactButtonClassName} nbu-shell-surface-context-rail hover:border-emerald-300 dark:hover:border-emerald-500/30`}
                >
                    <span className="flex min-w-0 items-center gap-2">
                        <TopLauncherSignal active={hasQueuedBatchActivity} dataTestId="workspace-queue-signal" />
                        <span className={topLauncherCompactLabelClassName}>{t('workspaceQueueLauncher')}</span>
                    </span>
                </button>
            ) : null}
        </React.Fragment>
    );
}

export const WorkspaceSupportRail: React.FC<WorkspaceSupportRailProps> = React.memo((props) =>
    renderWorkspaceSupportRail(props),
);

export default WorkspaceSupportRail;
