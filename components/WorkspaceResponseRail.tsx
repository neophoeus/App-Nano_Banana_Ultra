import React from 'react';
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
}: WorkspaceResponseRailProps) {
    const t = (key: string) => getTranslation(currentLanguage, key);
    const hasAnswerContent = Boolean(formattedStructuredOutput || resultText?.trim());
    const resultTitle = formattedStructuredOutput
        ? t('workspaceViewerStructuredOutput')
        : t('workspaceViewerResultText');
    const statusDotClassName = hasAnswerContent ? 'bg-emerald-500 dark:bg-emerald-300' : 'bg-slate-300 dark:bg-slate-600';

    return (
        <section data-testid="workspace-response-rail" className="grid h-full content-start gap-4">
            <div
                data-testid="workspace-model-output-card"
                className="nbu-shell-panel nbu-shell-surface-output-strip min-h-[212px] p-4 md:p-5"
            >
                <div data-testid="workspace-response-text-card">
                    <div className="mb-4 flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <p className="nbu-section-eyebrow">{t('workspacePanelResponseEyebrow')}</p>
                            <h2 className="mt-1 text-lg font-black text-slate-900 dark:text-slate-100">
                                {resultTitle}
                            </h2>
                            {formattedStructuredOutput && (
                                <div className="mt-3">
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
                            <span
                                aria-hidden="true"
                                className={`h-2 w-2 rounded-full ${statusDotClassName}`}
                            />
                            {hasAnswerContent ? t('workspacePanelStatusEnabled') : t('workspacePanelStatusReserved')}
                        </span>
                    </div>
                    <div className="nbu-soft-well min-h-[132px] px-4 py-4 text-sm leading-7 text-slate-700 dark:text-slate-300">
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
        </section>
    );
}

export default React.memo(WorkspaceResponseRail);
