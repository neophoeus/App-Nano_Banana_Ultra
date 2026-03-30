import React from 'react';
import { getTranslation, Language } from '../utils/translations';

type WorkspaceSourcesCitationsPanelProps = {
    currentLanguage: Language;
    hasContent: boolean;
    statusLabel: string;
    children: React.ReactNode;
};

function WorkspaceSourcesCitationsPanel({
    currentLanguage,
    hasContent,
    statusLabel,
    children,
}: WorkspaceSourcesCitationsPanelProps) {
    const t = (key: string) => getTranslation(currentLanguage, key);
    const statusDotClassName = hasContent
        ? 'bg-emerald-500 dark:bg-emerald-300'
        : 'bg-slate-300 dark:bg-slate-600';

    return (
        <aside
            data-testid="workspace-sources-citations-panel"
            className="nbu-shell-panel nbu-shell-surface-context-rail space-y-4 overflow-hidden p-4 lg:min-h-0"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <p className="nbu-section-eyebrow">{t('workspacePanelSourceTrailEyebrow')}</p>
                    <h2 className="mt-1 text-lg font-black text-slate-900 dark:text-slate-100">
                        {t('workspaceInsightsSourcesCitations')}
                    </h2>
                </div>
                <span className="nbu-status-pill inline-flex items-center gap-2 whitespace-nowrap">
                    <span
                        aria-hidden="true"
                        className={`h-2 w-2 rounded-full ${statusDotClassName}`}
                    />
                    {statusLabel}
                </span>
            </div>

            <div data-testid="context-provenance-section">{children}</div>
        </aside>
    );
}

export default React.memo(WorkspaceSourcesCitationsPanel);