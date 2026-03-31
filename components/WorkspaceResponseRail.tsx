import React from 'react';
import { useResponsivePanelState } from '../hooks/useResponsivePanelState';
import StructuredOutputActions from './StructuredOutputActions';
import StructuredOutputDisplay from './StructuredOutputDisplay';
import { StructuredOutputMode } from '../types';
import { getTranslation, Language } from '../utils/translations';

type WorkspaceResponseRailProps = {
    currentLanguage: Language;
    resultText: string | null;
    structuredData: Record<string, unknown> | null;
    structuredOutputMode: StructuredOutputMode | null;
    formattedStructuredOutput: string | null;
    resultPlaceholder: string;
    onReplacePrompt?: (value: string) => void;
    onAppendPrompt?: (value: string) => void;
    presentation?: 'collapsible-card' | 'detail-panel';
};

function WorkspaceResponseRail({
    currentLanguage,
    resultText,
    structuredData,
    structuredOutputMode,
    formattedStructuredOutput,
    resultPlaceholder,
    onReplacePrompt,
    onAppendPrompt,
    presentation = 'collapsible-card',
}: WorkspaceResponseRailProps) {
    const t = (key: string) => getTranslation(currentLanguage, key);
    const { isDesktop, isOpen, setIsOpen } = useResponsivePanelState();
    const isDetailPanel = presentation === 'detail-panel';
    const hasAnswerContent = Boolean(formattedStructuredOutput || resultText?.trim());
    const resultTitle = formattedStructuredOutput
        ? t('workspaceViewerStructuredOutput')
        : t('workspaceViewerResultText');
    const statusDotClassName = hasAnswerContent
        ? 'bg-emerald-500 dark:bg-emerald-300'
        : 'bg-slate-300 dark:bg-slate-600';

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

    const content = (
        <div
            data-testid="workspace-model-output-card"
            className={
                isDetailPanel ? 'flex min-h-0 flex-col' : 'flex h-full min-h-0 flex-col px-3 pb-3 md:px-4 md:pb-4'
            }
        >
            <div data-testid="workspace-response-text-card" className="flex flex-1 min-h-0 flex-col">
                <div
                    className={
                        isDetailPanel
                            ? 'flex items-start justify-between gap-3'
                            : 'flex items-start justify-between gap-3 pt-3 xl:pt-4'
                    }
                >
                    <div className="min-w-0 flex-1">
                        <p className="nbu-section-eyebrow">{t('workspacePanelResponseEyebrow')}</p>
                        <h2 className="mt-1 text-[15px] font-black text-slate-900 dark:text-slate-100">
                            {resultTitle}
                        </h2>
                        {formattedStructuredOutput && (
                            <div className="mt-2.5">
                                <StructuredOutputActions
                                    currentLanguage={currentLanguage}
                                    structuredData={structuredData}
                                    structuredOutputMode={structuredOutputMode}
                                    formattedStructuredOutput={formattedStructuredOutput}
                                    fallbackText={resultText || resultPlaceholder}
                                />
                            </div>
                        )}
                    </div>
                    <span className="nbu-status-pill inline-flex items-center gap-2 whitespace-nowrap">
                        <span aria-hidden="true" className={`h-2 w-2 rounded-full ${statusDotClassName}`} />
                        {hasAnswerContent ? t('workspacePanelStatusEnabled') : t('workspacePanelStatusReserved')}
                    </span>
                </div>
                <div
                    className={
                        isDetailPanel
                            ? 'nbu-soft-well nbu-scrollbar-subtle mt-3 max-h-[60vh] min-h-[220px] overflow-y-auto px-3 py-3 text-sm leading-6 text-slate-700 dark:text-slate-300'
                            : 'nbu-soft-well nbu-scrollbar-subtle mt-3 min-h-[116px] flex-1 overflow-y-auto px-3 py-3 text-sm leading-6 text-slate-700 dark:text-slate-300'
                    }
                >
                    <StructuredOutputDisplay
                        currentLanguage={currentLanguage}
                        structuredData={structuredData}
                        structuredOutputMode={structuredOutputMode}
                        formattedStructuredOutput={formattedStructuredOutput}
                        fallbackText={resultText || resultPlaceholder}
                        variant="compact"
                        onReplacePrompt={onReplacePrompt}
                        onAppendPrompt={onAppendPrompt}
                    />
                </div>
            </div>
        </div>
    );

    if (isDetailPanel) {
        return (
            <div data-testid="workspace-response-rail" className="min-w-0">
                {content}
            </div>
        );
    }

    return (
        <details
            data-testid="workspace-response-rail"
            open={isOpen}
            onToggle={(event) => {
                if (isDesktop) {
                    return;
                }

                setIsOpen(event.currentTarget.open);
            }}
            className="group min-w-0 nbu-shell-panel nbu-shell-surface-output-strip overflow-hidden xl:h-[380px] xl:min-h-0"
        >
            <summary
                data-testid="workspace-response-rail-summary"
                className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 text-left xl:hidden [&::-webkit-details-marker]:hidden"
            >
                <span className="text-[15px] font-black text-slate-900 dark:text-slate-100">{resultTitle}</span>
                {renderDisclosureChevron()}
            </summary>

            {content}
        </details>
    );
}

export default React.memo(WorkspaceResponseRail);
