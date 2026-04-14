import React, { useRef } from 'react';
import { StructuredOutputMode } from '../types';
import { WORKSPACE_OVERLAY_Z_INDEX } from '../constants/workspaceOverlays';
import { sanitizeSensitiveDisplayText } from '../utils/inlineImageDisplay';
import { getTranslation, Language } from '../utils/translations';
import { useDocumentThemeMode } from '../hooks/useDocumentThemeMode';
import { useOverlayEscapeDismiss } from '../hooks/useOverlayEscapeDismiss';
import { useOverlayFocusTrap } from '../hooks/useOverlayFocusTrap';
import { useOverlayScrollLock } from '../hooks/useOverlayScrollLock';
import InfoTooltip from './InfoTooltip';
import StructuredOutputActions from './StructuredOutputActions';
import StructuredOutputDisplay from './StructuredOutputDisplay';

type SessionHintEntry = [string, unknown];

type ViewerMetadataItem = {
    key: string;
    label: string;
    value: string;
};

type WorkspaceViewerOverlayProps = {
    currentLanguage: Language;
    isOpen: boolean;
    activeViewerImage: string;
    activeViewerIsFresh?: boolean;
    generatedImageCount: number;
    prompt: string;
    metadataItems?: ViewerMetadataItem[];
    metadataStateMessage?: string | null;
    effectiveResultText: string | null;
    structuredData: Record<string, unknown> | null;
    structuredOutputMode: StructuredOutputMode | null;
    formattedStructuredOutput: string | null;
    effectiveThoughts: string | null;
    thoughtStateMessage: string;
    provenancePanel: React.ReactNode;
    sessionHintEntries: SessionHintEntry[];
    formatSessionHintKey: (key: string) => string;
    formatSessionHintValue: (key: string, value: unknown) => string;
    onClose: () => void;
    onMoveViewer: (direction: 'prev' | 'next') => void;
    onApplyPrompt?: (value: string) => void;
    onReplacePrompt?: (value: string) => void;
    onAppendPrompt?: (value: string) => void;
};

export default function WorkspaceViewerOverlay({
    currentLanguage,
    isOpen,
    activeViewerImage,
    activeViewerIsFresh = false,
    generatedImageCount,
    prompt,
    metadataItems = [],
    metadataStateMessage = null,
    effectiveResultText,
    structuredData,
    structuredOutputMode,
    formattedStructuredOutput,
    effectiveThoughts,
    thoughtStateMessage,
    provenancePanel,
    sessionHintEntries,
    formatSessionHintKey,
    formatSessionHintValue,
    onClose,
    onMoveViewer,
    onApplyPrompt,
    onReplacePrompt,
    onAppendPrompt,
}: WorkspaceViewerOverlayProps) {
    const dialogRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const isDarkTheme = useDocumentThemeMode();
    useOverlayEscapeDismiss(isOpen && Boolean(activeViewerImage), onClose);
    useOverlayFocusTrap(dialogRef, {
        isEnabled: isOpen && Boolean(activeViewerImage),
        initialFocusRef: closeButtonRef,
    });
    useOverlayScrollLock(isOpen && Boolean(activeViewerImage));

    if (!isOpen || !activeViewerImage) {
        return null;
    }

    const t = (key: string) => getTranslation(currentLanguage, key);
    const renderTextPreview = (value: string, limit = 140) => {
        const trimmedValue = sanitizeSensitiveDisplayText(value).trim();
        if (trimmedValue.length <= limit) {
            return trimmedValue;
        }
        return `${trimmedValue.slice(0, limit).trimEnd()}...`;
    };
    const displayPrompt = sanitizeSensitiveDisplayText(prompt || t('workspaceViewerPromptEmpty'));
    const canApplyPrompt = Boolean(onApplyPrompt && prompt.trim());
    const thoughtsValue = sanitizeSensitiveDisplayText(effectiveThoughts || thoughtStateMessage);
    const sessionHintsSummary =
        sessionHintEntries.length > 0
            ? `${formatSessionHintKey(sessionHintEntries[0][0])}: ${formatSessionHintValue(sessionHintEntries[0][0], sessionHintEntries[0][1])}`
            : t('workspaceViewerSessionHintsEmpty');
    const renderedMetadataItems = metadataItems.filter((item) => item.value.trim().length > 0);
    const infoTooltipTone = isDarkTheme ? 'dark' : 'light';
    const structuredOutputActionsVariant = isDarkTheme ? 'dark' : 'light';
    const viewerSidebarCardClassName =
        'rounded-2xl border border-slate-200/80 bg-white/75 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:border-slate-800/90 dark:bg-[#11161d] dark:shadow-none';
    const viewerSidebarDashedCardClassName =
        'rounded-2xl border border-dashed border-slate-200/80 bg-white/75 px-3 py-2.5 text-sm text-slate-700 dark:border-slate-800/90 dark:bg-[#0f141b] dark:text-slate-200';
    const viewerSidebarSummaryCardClassName =
        'flex items-start justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/75 px-3 py-2.5 dark:border-slate-800/90 dark:bg-[#11161d]';
    const viewerSessionHintRowClassName =
        'flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800/85 dark:bg-[#131922]';

    return (
        <div
            data-testid="workspace-viewer-overlay"
            className="fixed inset-0 flex items-stretch justify-stretch bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.76),_rgba(226,232,240,0.82)_38%,_rgba(15,23,42,0.32)_100%)] p-0 backdrop-blur-md dark:bg-[radial-gradient(circle_at_top,_rgba(18,26,36,0.34),_rgba(4,6,11,0.9)_42%,_rgba(0,0,0,0.98)_100%)] dark:backdrop-blur-sm sm:p-3"
            style={{ zIndex: WORKSPACE_OVERLAY_Z_INDEX.viewer }}
            onClick={onClose}
            role="presentation"
        >
            <div
                ref={dialogRef}
                className="relative flex h-full w-full flex-col sm:max-h-[calc(100vh-1.5rem)]"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label={t('workspaceViewerTitle')}
                tabIndex={-1}
            >
                <button
                    ref={closeButtonRef}
                    type="button"
                    data-testid="workspace-viewer-close"
                    aria-label={t('workspaceViewerClose')}
                    title={t('workspaceViewerClose')}
                    onClick={onClose}
                    className="pointer-events-auto absolute right-3 top-3 z-30 rounded-full border border-slate-200/90 bg-white/92 p-3 text-slate-600 shadow-[0_18px_45px_rgba(15,23,42,0.16)] transition-colors hover:border-slate-300 hover:bg-white dark:border-white/15 dark:bg-slate-950/88 dark:text-slate-200 dark:hover:border-white/25 dark:hover:bg-slate-900 sm:right-4 sm:top-4"
                >
                    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                        <path d="M5 5 15 15M15 5 5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                    <span className="sr-only">{t('workspaceViewerClose')}</span>
                </button>

                <div className="grid min-h-0 flex-1 grid-rows-[minmax(48vh,1fr)_minmax(0,auto)] gap-0 overflow-hidden border border-slate-200/80 bg-white/96 shadow-[0_30px_100px_rgba(15,23,42,0.2)] dark:border-white/10 dark:bg-[#05070b] dark:shadow-2xl sm:rounded-[28px] lg:grid-cols-[minmax(0,1fr)_320px] lg:grid-rows-1">
                    <div className="relative flex min-h-0 items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_center,_rgba(56,189,248,0.18),_transparent_38%),linear-gradient(180deg,_#f8fafc_0%,_#dbe4f0_100%)] px-3 pb-3 pt-14 dark:bg-[radial-gradient(circle_at_center,_rgba(245,158,11,0.15),_transparent_35%),linear-gradient(180deg,_#0c1118_0%,_#040608_100%)] sm:px-4 sm:pb-4 sm:pt-16 lg:pt-4">
                        {activeViewerIsFresh ? (
                            <span
                                data-testid="workspace-viewer-new-badge"
                                className="absolute left-3 top-3 z-20 inline-flex items-center rounded-full border border-emerald-300/70 bg-emerald-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-800 shadow-[0_0_18px_rgba(16,185,129,0.16)] dark:border-emerald-500 dark:bg-emerald-400 dark:text-slate-950 dark:shadow-[0_0_18px_rgba(34,197,94,0.35)] sm:left-4 sm:top-4"
                            >
                                {t('workspaceViewerNewBadge')}
                            </span>
                        ) : null}

                        {generatedImageCount > 1 && (
                            <>
                                <button
                                    onClick={() => onMoveViewer('prev')}
                                    className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-slate-300/80 bg-white/88 px-2.5 py-2.5 text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.12)] transition-colors hover:border-slate-400 hover:bg-white dark:border-white/15 dark:bg-black/45 dark:text-white/80 dark:shadow-none dark:hover:bg-black/65 sm:left-4"
                                >
                                    ‹
                                </button>
                                <button
                                    onClick={() => onMoveViewer('next')}
                                    className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-slate-300/80 bg-white/88 px-2.5 py-2.5 text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.12)] transition-colors hover:border-slate-400 hover:bg-white dark:border-white/15 dark:bg-black/45 dark:text-white/80 dark:shadow-none dark:hover:bg-black/65 sm:right-4"
                                >
                                    ›
                                </button>
                            </>
                        )}

                        <img
                            src={activeViewerImage}
                            alt={displayPrompt || t('workspaceViewerImageAlt')}
                            className="max-h-full max-w-full rounded-[24px] border border-white/70 object-contain shadow-[0_24px_80px_rgba(15,23,42,0.22)] dark:border-white/10 dark:shadow-2xl"
                        />
                    </div>

                    <div
                        data-testid="workspace-viewer-sidebar"
                        className="flex min-h-0 max-h-[42vh] flex-col border-t border-slate-200/80 bg-[linear-gradient(180deg,_rgba(248,250,252,0.98)_0%,_rgba(241,245,249,0.96)_100%)] text-slate-900 dark:border-white/10 dark:bg-[linear-gradient(180deg,_rgba(17,22,30,0.98)_0%,_rgba(9,12,18,0.98)_100%)] dark:text-white lg:max-h-none lg:border-l lg:border-t-0"
                    >
                        <div
                            data-testid="workspace-viewer-sidebar-scroll"
                            className="nbu-scrollbar-subtle min-h-0 flex-1 overflow-y-auto p-4 pr-3"
                        >
                            <div className="space-y-3.5">
                                <div>
                                    <div
                                        data-testid="workspace-viewer-prompt-label"
                                        className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-white/45"
                                    >
                                        {t('workspaceViewerPrompt')}
                                    </div>
                                    <p
                                        data-testid="workspace-viewer-prompt-value"
                                        className="mt-2 text-sm leading-6 text-slate-700 dark:text-white/85"
                                    >
                                        {displayPrompt}
                                    </p>
                                    {canApplyPrompt && (
                                        <button
                                            type="button"
                                            data-testid="workspace-viewer-apply-prompt"
                                            onClick={() => {
                                                onApplyPrompt?.(prompt);
                                                onClose();
                                            }}
                                            className="mt-3 inline-flex items-center rounded-full border border-amber-300/80 bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800 transition-colors hover:border-amber-400 hover:bg-amber-200 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:border-amber-400/50 dark:hover:bg-amber-900/55"
                                        >
                                            {t('workspaceViewerApplyPrompt')}
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-white/70">
                                    {renderedMetadataItems.map((item) => (
                                        <div key={item.key} className={viewerSidebarCardClassName}>
                                            {item.label}
                                            <br />
                                            <span className="mt-1 block text-sm font-semibold text-slate-900 dark:text-white">
                                                {item.value}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                {metadataStateMessage ? (
                                    <div
                                        data-testid="workspace-viewer-metadata-state"
                                        className="rounded-2xl border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-xs leading-5 text-amber-800 dark:border-amber-500/30 dark:bg-[#1b1610] dark:text-amber-100/90"
                                    >
                                        {metadataStateMessage}
                                    </div>
                                ) : null}

                                <div>
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-white/45">
                                                <span>
                                                    {formattedStructuredOutput
                                                        ? t('workspaceViewerStructuredOutput')
                                                        : t('workspaceViewerResultText')}
                                                </span>
                                                {formattedStructuredOutput && (
                                                    <InfoTooltip
                                                        tone={infoTooltipTone}
                                                        dataTestId="workspace-viewer-structured-output-hint"
                                                        buttonLabel={t('workspaceViewerStructuredOutputHint')}
                                                        content={t('workspaceViewerStructuredOutputHint')}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                        {formattedStructuredOutput && (
                                            <StructuredOutputActions
                                                currentLanguage={currentLanguage}
                                                structuredData={structuredData}
                                                structuredOutputMode={structuredOutputMode}
                                                formattedStructuredOutput={formattedStructuredOutput}
                                                fallbackText={
                                                    effectiveResultText || t('workspaceViewerResultTextEmpty')
                                                }
                                                variant={structuredOutputActionsVariant}
                                            />
                                        )}
                                    </div>
                                    <div className={`mt-2 ${viewerSidebarDashedCardClassName}`}>
                                        <StructuredOutputDisplay
                                            currentLanguage={currentLanguage}
                                            structuredData={structuredData}
                                            structuredOutputMode={structuredOutputMode}
                                            formattedStructuredOutput={formattedStructuredOutput}
                                            fallbackText={effectiveResultText || t('workspaceViewerResultTextEmpty')}
                                            variant="full"
                                            onReplacePrompt={onReplacePrompt}
                                            onAppendPrompt={onAppendPrompt}
                                        />
                                    </div>
                                </div>

                                <div data-testid="workspace-viewer-thoughts-details">
                                    <div
                                        data-testid="workspace-viewer-thoughts-summary"
                                        className={viewerSidebarSummaryCardClassName}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-white/45">
                                                {t('workspaceViewerThoughts')}
                                            </div>
                                            <div className="mt-2 text-sm text-slate-700 dark:text-white/75">
                                                {renderTextPreview(thoughtsValue)}
                                            </div>
                                        </div>
                                    </div>
                                    <div
                                        data-testid="workspace-viewer-thoughts-body"
                                        className={`mt-2 ${viewerSidebarDashedCardClassName}`}
                                    >
                                        {thoughtsValue}
                                    </div>
                                </div>

                                <div>
                                    <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-white/45">
                                        {t('workspaceViewerProvenance')}
                                    </div>
                                    <div className="mt-2">{provenancePanel}</div>
                                </div>

                                <div data-testid="workspace-viewer-session-hints-details">
                                    <div
                                        data-testid="workspace-viewer-session-hints-summary"
                                        className={viewerSidebarSummaryCardClassName}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div
                                                data-testid="workspace-viewer-session-hints-label"
                                                className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-white/45"
                                            >
                                                {t('workspaceViewerSessionHints')}
                                            </div>
                                            <div className="mt-2 flex items-center gap-2 text-sm text-slate-700 dark:text-white/75">
                                                <span className="min-w-0 flex-1 break-words">
                                                    {renderTextPreview(sessionHintsSummary, 120)}
                                                </span>
                                                {sessionHintEntries.length > 0 && (
                                                    <span
                                                        data-testid="workspace-viewer-session-hints-count"
                                                        className="shrink-0 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:border-slate-700/80 dark:bg-[#0f141b] dark:text-slate-300"
                                                    >
                                                        {sessionHintEntries.length}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div
                                        data-testid="workspace-viewer-session-hints"
                                        className={`mt-2 space-y-2 ${viewerSidebarDashedCardClassName}`}
                                    >
                                        {sessionHintEntries.length > 0
                                            ? sessionHintEntries.map(([key, value]) => (
                                                  <div key={key} className={viewerSessionHintRowClassName}>
                                                      <span className="font-semibold text-slate-800 dark:text-white/80">
                                                          {formatSessionHintKey(key)}
                                                      </span>
                                                      <span className="max-w-[16rem] whitespace-pre-wrap break-words text-right text-slate-500 dark:text-white/60">
                                                          {formatSessionHintValue(key, value)}
                                                      </span>
                                                  </div>
                                              ))
                                            : t('workspaceViewerSessionHintsEmpty')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
