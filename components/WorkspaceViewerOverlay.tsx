import React, { useRef } from 'react';
import { StructuredOutputMode } from '../types';
import { WORKSPACE_OVERLAY_Z_INDEX } from '../constants/workspaceOverlays';
import { sanitizeSensitiveDisplayText } from '../utils/inlineImageDisplay';
import { getTranslation, Language } from '../utils/translations';
import { useOverlayEscapeDismiss } from '../hooks/useOverlayEscapeDismiss';
import { useOverlayFocusTrap } from '../hooks/useOverlayFocusTrap';
import { useOverlayScrollLock } from '../hooks/useOverlayScrollLock';
import InfoTooltip from './InfoTooltip';
import StructuredOutputActions from './StructuredOutputActions';
import StructuredOutputDisplay from './StructuredOutputDisplay';

type SessionHintEntry = [string, unknown];

type WorkspaceViewerOverlayProps = {
    currentLanguage: Language;
    isOpen: boolean;
    activeViewerImage: string;
    generatedImageCount: number;
    prompt: string;
    aspectRatio: string;
    size: string;
    styleLabel: string;
    model: string;
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
    onReplacePrompt?: (value: string) => void;
    onAppendPrompt?: (value: string) => void;
};

export default function WorkspaceViewerOverlay({
    currentLanguage,
    isOpen,
    activeViewerImage,
    generatedImageCount,
    prompt,
    aspectRatio,
    size,
    styleLabel,
    model,
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
    onReplacePrompt,
    onAppendPrompt,
}: WorkspaceViewerOverlayProps) {
    const dialogRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
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
    const thoughtsValue = sanitizeSensitiveDisplayText(effectiveThoughts || thoughtStateMessage);
    const sessionHintsSummary =
        sessionHintEntries.length > 0
            ? `${formatSessionHintKey(sessionHintEntries[0][0])}: ${formatSessionHintValue(sessionHintEntries[0][0], sessionHintEntries[0][1])}`
            : t('workspaceViewerSessionHintsEmpty');

    return (
        <div
            data-testid="workspace-viewer-overlay"
            className="fixed inset-0 flex items-center justify-center bg-black/88 p-3 backdrop-blur-sm"
            style={{ zIndex: WORKSPACE_OVERLAY_Z_INDEX.viewer }}
            onClick={onClose}
            role="presentation"
        >
            <div
                ref={dialogRef}
                className="relative flex h-full max-h-[92vh] w-full max-w-6xl flex-col"
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
                    className="pointer-events-auto absolute -right-5 -top-5 z-30 rounded-full border border-red-200 bg-red-100 p-3 text-red-600 shadow-lg transition-colors hover:bg-red-200 dark:border-red-500/30 dark:bg-red-900/40 dark:text-red-200 dark:hover:bg-red-900/80"
                >
                    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                        <path d="M5 5 15 15M15 5 5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                    <span className="sr-only">{t('workspaceViewerClose')}</span>
                </button>

                <div className="grid min-h-0 flex-1 gap-0 overflow-hidden rounded-[28px] border border-white/10 bg-[#05070b] shadow-2xl lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="relative flex min-h-0 items-center justify-center bg-[radial-gradient(circle_at_center,_rgba(245,158,11,0.15),_transparent_35%),linear-gradient(180deg,_#0c1118_0%,_#040608_100%)] p-3">
                        {generatedImageCount > 1 && (
                            <>
                                <button
                                    onClick={() => onMoveViewer('prev')}
                                    className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/15 bg-black/45 px-2.5 py-2.5 text-white/80 hover:bg-black/65"
                                >
                                    ‹
                                </button>
                                <button
                                    onClick={() => onMoveViewer('next')}
                                    className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/15 bg-black/45 px-2.5 py-2.5 text-white/80 hover:bg-black/65"
                                >
                                    ›
                                </button>
                            </>
                        )}

                        <img
                            src={activeViewerImage}
                            alt={displayPrompt || t('workspaceViewerImageAlt')}
                            className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl"
                        />
                    </div>

                    <div
                        data-testid="workspace-viewer-sidebar"
                        className="flex min-h-0 flex-col border-l border-white/10 bg-[#0a0d12] text-white"
                    >
                        <div
                            data-testid="workspace-viewer-sidebar-scroll"
                            className="nbu-scrollbar-subtle min-h-0 flex-1 overflow-y-auto p-4 pr-3"
                        >
                            <div className="space-y-3.5">
                                <div>
                                    <div
                                        data-testid="workspace-viewer-prompt-label"
                                        className="text-xs font-bold uppercase tracking-[0.16em] text-white/45"
                                    >
                                        {t('workspaceViewerPrompt')}
                                    </div>
                                    <p
                                        data-testid="workspace-viewer-prompt-value"
                                        className="mt-2 text-sm leading-6 text-white/85"
                                    >
                                        {displayPrompt}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs text-white/70">
                                    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5">
                                        {t('workspaceViewerRatio')}
                                        <br />
                                        <span className="mt-1 block text-sm font-semibold text-white">
                                            {aspectRatio}
                                        </span>
                                    </div>
                                    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5">
                                        {t('workspaceViewerSize')}
                                        <br />
                                        <span className="mt-1 block text-sm font-semibold text-white">{size}</span>
                                    </div>
                                    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5">
                                        {t('workspaceViewerStyle')}
                                        <br />
                                        <span className="mt-1 block text-sm font-semibold text-white">
                                            {styleLabel}
                                        </span>
                                    </div>
                                    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5">
                                        {t('workspaceViewerModel')}
                                        <br />
                                        <span className="mt-1 block text-sm font-semibold text-white">{model}</span>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                                                <span>
                                                    {formattedStructuredOutput
                                                        ? t('workspaceViewerStructuredOutput')
                                                        : t('workspaceViewerResultText')}
                                                </span>
                                                {formattedStructuredOutput && (
                                                    <InfoTooltip
                                                        tone="dark"
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
                                                variant="dark"
                                            />
                                        )}
                                    </div>
                                    <div className="mt-2 rounded-2xl border border-dashed border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white/75">
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
                                        className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                                                {t('workspaceViewerThoughts')}
                                            </div>
                                            <div className="mt-2 text-sm text-white/75">
                                                {renderTextPreview(thoughtsValue)}
                                            </div>
                                        </div>
                                    </div>
                                    <div
                                        data-testid="workspace-viewer-thoughts-body"
                                        className="mt-2 rounded-2xl border border-dashed border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white/75"
                                    >
                                        {thoughtsValue}
                                    </div>
                                </div>

                                <div>
                                    <div className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                                        {t('workspaceViewerProvenance')}
                                    </div>
                                    <div className="mt-2">{provenancePanel}</div>
                                </div>

                                <div data-testid="workspace-viewer-session-hints-details">
                                    <div
                                        data-testid="workspace-viewer-session-hints-summary"
                                        className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div
                                                data-testid="workspace-viewer-session-hints-label"
                                                className="text-xs font-bold uppercase tracking-[0.16em] text-white/45"
                                            >
                                                {t('workspaceViewerSessionHints')}
                                            </div>
                                            <div className="mt-2 flex items-center gap-2 text-sm text-white/75">
                                                <span className="min-w-0 flex-1 break-words">
                                                    {renderTextPreview(sessionHintsSummary, 120)}
                                                </span>
                                                {sessionHintEntries.length > 0 && (
                                                    <span
                                                        data-testid="workspace-viewer-session-hints-count"
                                                        className="shrink-0 rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/60"
                                                    >
                                                        {sessionHintEntries.length}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div
                                        data-testid="workspace-viewer-session-hints"
                                        className="mt-2 space-y-2 rounded-2xl border border-dashed border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white/75"
                                    >
                                        {sessionHintEntries.length > 0
                                            ? sessionHintEntries.map(([key, value]) => (
                                                  <div
                                                      key={key}
                                                      className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-black/10 px-3 py-2 text-xs"
                                                  >
                                                      <span className="font-semibold text-white/80">
                                                          {formatSessionHintKey(key)}
                                                      </span>
                                                      <span className="max-w-[16rem] whitespace-pre-wrap break-words text-right text-white/60">
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
