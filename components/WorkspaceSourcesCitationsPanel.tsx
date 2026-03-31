import React from 'react';
import { useResponsivePanelState } from '../hooks/useResponsivePanelState';
import { getTranslation, Language } from '../utils/translations';

type WorkspaceSourcesCitationsPanelProps = {
    currentLanguage: Language;
    hasContent: boolean;
    statusLabel: string;
    onOpenDetails?: () => void;
    children: React.ReactNode;
};

function WorkspaceSourcesCitationsPanel({
    currentLanguage,
    hasContent,
    statusLabel,
    onOpenDetails,
    children,
}: WorkspaceSourcesCitationsPanelProps) {
    const t = (key: string) => getTranslation(currentLanguage, key);
    const { isDesktop, isOpen, setIsOpen } = useResponsivePanelState();
    const statusDotClassName = hasContent ? 'bg-emerald-500 dark:bg-emerald-300' : 'bg-slate-300 dark:bg-slate-600';

    const renderDisclosureChevron = () => (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-180 dark:text-gray-500"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
        >
            <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 011.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
            />
        </svg>
    );

    return (
        <details
            data-testid="workspace-sources-citations-panel"
            open={isOpen}
            onToggle={(event) => {
                if (isDesktop) {
                    return;
                }

                setIsOpen(event.currentTarget.open);
            }}
            className="group min-w-0 nbu-shell-panel nbu-shell-surface-context-rail overflow-hidden xl:h-[380px] xl:min-h-0"
        >
            <summary
                data-testid="workspace-sources-citations-summary"
                className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 text-left xl:hidden [&::-webkit-details-marker]:hidden"
            >
                <span className="text-[15px] font-black text-slate-900 dark:text-slate-100">
                    {t('workspaceInsightsSourcesCitations')}
                </span>
                {renderDisclosureChevron()}
            </summary>

            <div className="flex h-full min-h-0 flex-col px-3 pb-3 md:px-4 md:pb-4">
                <div className="flex items-start justify-between gap-3 pt-3 xl:pt-4">
                    <div className="min-w-0 flex-1">
                        <p className="nbu-section-eyebrow">{t('workspacePanelSourceTrailEyebrow')}</p>
                        <h2 className="mt-1 text-[15px] font-black text-slate-900 dark:text-slate-100">
                            {t('workspaceInsightsSourcesCitations')}
                        </h2>
                    </div>
                    <span className="nbu-status-pill inline-flex items-center gap-2 whitespace-nowrap">
                        <span aria-hidden="true" className={`h-2 w-2 rounded-full ${statusDotClassName}`} />
                        {statusLabel}
                    </span>
                </div>

                <div className="mt-3 flex flex-1 min-h-0 flex-col">
                    <div
                        data-testid="context-provenance-section"
                        className="nbu-scrollbar-subtle min-h-0 flex-1 overflow-x-hidden overflow-y-auto pr-1"
                    >
                        {children}
                    </div>
                    {onOpenDetails ? (
                        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-200/80 pt-3 dark:border-gray-800">
                            <button
                                type="button"
                                data-testid="workspace-sources-open-details"
                                onClick={onOpenDetails}
                                className="nbu-control-button px-3 py-1.5 text-[11px] font-semibold"
                            >
                                {t('workspacePanelViewDetails')}
                            </button>
                        </div>
                    ) : null}
                </div>
            </div>
        </details>
    );
}

export default React.memo(WorkspaceSourcesCitationsPanel);
