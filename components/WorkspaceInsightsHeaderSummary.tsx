import React from 'react';
import { getTranslation, Language } from '../utils/translations';

type WorkspaceInsightsHeaderSummaryProps = {
    currentLanguage: Language;
};

const HEADER_SECTION_KEYS = [
    'workspaceInsightsCurrentWork',
    'workspaceInsightsLatestThoughts',
    'workspaceInsightsSourcesCitations',
    'historyFilmstripTitle',
] as const;

export default function WorkspaceInsightsHeaderSummary({ currentLanguage }: WorkspaceInsightsHeaderSummaryProps) {
    const t = (key: string) => getTranslation(currentLanguage, key);

    return (
        <div className="min-w-0 flex-1">
            <p className="nbu-section-eyebrow">{t('workspaceInsightsEyebrow')}</p>
            <h2 className="sr-only">{t('workspaceInsightsTitle')}</h2>
            <div data-testid="workspace-insights-header-summary" className="mt-3 grid grid-cols-2 gap-2">
                {HEADER_SECTION_KEYS.map((key) => (
                    <div
                        key={key}
                        data-testid={`workspace-insights-header-chip-${key}`}
                        className="nbu-inline-panel flex min-h-[3.1rem] items-center justify-center px-3 py-2 text-center"
                    >
                        <span className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                            {t(key)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
