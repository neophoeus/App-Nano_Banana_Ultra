import React from 'react';
import { getTranslation, Language } from '../utils/translations';
import {
    topLauncherCompactButtonClassName,
    topLauncherCompactLabelClassName,
} from '../utils/workspaceTopLauncherStyles';

type WorkspaceProgressCardProps = {
    currentLanguage: Language;
    thoughtsText?: string | null;
    hasThoughtArtifacts?: boolean;
    onOpenDetails: () => void;
};

function WorkspaceProgressCard({
    currentLanguage,
    thoughtsText,
    hasThoughtArtifacts,
    onOpenDetails,
}: WorkspaceProgressCardProps) {
    const t = (key: string) => getTranslation(currentLanguage, key);
    const hasThoughts = hasThoughtArtifacts ?? Boolean(thoughtsText?.trim());
    const inactiveOuterClassName =
        'bg-slate-200/65 ring-1 ring-slate-500/15 shadow-inner shadow-slate-400/20 opacity-95 dark:bg-slate-700/40 dark:ring-slate-400/20 dark:shadow-black/20';
    const inactiveInnerClassName = 'bg-slate-500/70 dark:bg-slate-400/70';

    return (
        <button
            type="button"
            data-testid="workspace-progress-open-details"
            onClick={onOpenDetails}
            className={`${topLauncherCompactButtonClassName} nbu-shell-surface-context-rail hover:border-amber-300 dark:hover:border-amber-500/30`}
        >
            <div className="flex min-w-0 items-center gap-2">
                <span
                    data-testid="workspace-progress-signal"
                    aria-hidden="true"
                    className="relative inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center"
                >
                    <span
                        className={`absolute inset-0 rounded-full transition-all duration-300 ${
                            hasThoughts
                                ? 'bg-amber-300/60 shadow-[0_0_18px_rgba(251,191,36,0.52)] animate-pulse opacity-100 dark:bg-amber-300/40 dark:shadow-[0_0_20px_rgba(251,191,36,0.36)]'
                                : inactiveOuterClassName
                        }`}
                    />
                    <span
                        className={`relative h-1.5 w-1.5 rounded-full transition-all duration-300 ${
                            hasThoughts
                                ? 'bg-amber-400 ring-2 ring-amber-100/90 dark:bg-amber-300 dark:ring-amber-400/30'
                                : inactiveInnerClassName
                        }`}
                    />
                </span>
                <span className={topLauncherCompactLabelClassName}>{t('workspaceSupportProgress')}</span>
            </div>
        </button>
    );
}

export default React.memo(WorkspaceProgressCard);
