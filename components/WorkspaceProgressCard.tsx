import React from 'react';
import { getTranslation, Language } from '../utils/translations';

type WorkspaceProgressCardProps = {
    currentLanguage: Language;
    thoughtsText?: string | null;
    hasThoughtArtifacts?: boolean;
    onOpenDetails: () => void;
};

function WorkspaceProgressCard({ currentLanguage, thoughtsText, hasThoughtArtifacts, onOpenDetails }: WorkspaceProgressCardProps) {
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
            className="group min-w-0 nbu-shell-panel nbu-shell-surface-context-rail flex h-[40px] min-h-[40px] w-full items-center justify-center gap-2 overflow-hidden px-2.5 py-2 text-center transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-[0_18px_40px_rgba(15,23,42,0.12)] dark:hover:border-amber-500/30 dark:hover:shadow-[0_18px_40px_rgba(2,6,23,0.38)]"
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
                <span className="whitespace-nowrap text-[9px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400 sm:text-[10px]">
                    {t('workspaceSupportProgress')}
                </span>
            </div>
        </button>
    );
}

export default React.memo(WorkspaceProgressCard);
