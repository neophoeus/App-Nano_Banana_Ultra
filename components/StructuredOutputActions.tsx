import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StructuredOutputMode } from '../types';
import { writeTextToClipboard } from '../utils/clipboard';
import { getTranslation, Language } from '../utils/translations';
import { formatStructuredOutputMarkdown, formatStructuredOutputPlainText } from '../utils/structuredOutputPresentation';

type StructuredOutputActionsProps = {
    currentLanguage: Language;
    structuredData: Record<string, unknown> | null;
    structuredOutputMode: StructuredOutputMode | null;
    formattedStructuredOutput: string | null;
    fallbackText?: string | null;
    variant?: 'light' | 'dark';
};

type CopyState = 'json' | 'text' | null;
type MenuPlacement = {
    horizontal: 'start' | 'end';
    vertical: 'top' | 'bottom';
};

const DEFAULT_MENU_PLACEMENT: MenuPlacement = {
    horizontal: 'end',
    vertical: 'bottom',
};

const buildStructuredOutputExportFilename = (
    mode: StructuredOutputMode | null,
    format: 'json' | 'txt' | 'md',
    date = new Date(),
) => {
    const isoStamp = date.toISOString().replace(/[:.]/g, '-');
    return `structured-output-${mode || 'result'}-${format}-${isoStamp}.${format}`;
};

const downloadStructuredOutputFile = (content: string, mimeType: string, filename: string) => {
    const blob = new Blob([content], { type: mimeType });
    const downloadUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = downloadUrl;
    downloadLink.download = filename;
    downloadLink.click();
    URL.revokeObjectURL(downloadUrl);
};

export default function StructuredOutputActions({
    currentLanguage,
    structuredData,
    structuredOutputMode,
    formattedStructuredOutput,
    fallbackText,
    variant = 'light',
}: StructuredOutputActionsProps) {
    const t = (key: string) => getTranslation(currentLanguage, key);
    const [copyState, setCopyState] = useState<CopyState>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [menuPlacement, setMenuPlacement] = useState<MenuPlacement>(DEFAULT_MENU_PLACEMENT);
    const menuRef = useRef<HTMLDetailsElement | null>(null);
    const menuPanelRef = useRef<HTMLDivElement | null>(null);
    const resetTimerRef = useRef<number | null>(null);
    const jsonText = useMemo(() => {
        if (structuredData) {
            return JSON.stringify(structuredData, null, 2);
        }

        return formattedStructuredOutput || fallbackText || '';
    }, [fallbackText, formattedStructuredOutput, structuredData]);
    const plainText = useMemo(
        () =>
            formatStructuredOutputPlainText(structuredData, currentLanguage, structuredOutputMode) ||
            fallbackText ||
            '',
        [currentLanguage, fallbackText, structuredData, structuredOutputMode],
    );
    const markdownText = useMemo(
        () =>
            formatStructuredOutputMarkdown(structuredData, currentLanguage, structuredOutputMode) ||
            plainText ||
            jsonText,
        [currentLanguage, jsonText, plainText, structuredData, structuredOutputMode],
    );

    useEffect(() => {
        return () => {
            if (resetTimerRef.current != null && typeof window !== 'undefined') {
                window.clearTimeout(resetTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!isMenuOpen || typeof window === 'undefined') {
            return undefined;
        }

        const updatePlacement = () => {
            const summaryElement = menuRef.current?.querySelector('summary');
            const anchorRect = summaryElement?.getBoundingClientRect();
            const panelRect = menuPanelRef.current?.getBoundingClientRect();

            if (!anchorRect || !panelRect) {
                return;
            }

            const viewportPadding = 16;
            const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
            const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
            const availableRight = viewportWidth - anchorRect.left - viewportPadding;
            const availableLeft = anchorRect.right - viewportPadding;
            const availableBottom = viewportHeight - anchorRect.bottom - viewportPadding;
            const availableTop = anchorRect.top - viewportPadding;
            const nextPlacement: MenuPlacement = {
                horizontal:
                    panelRect.width <= availableRight || availableRight >= availableLeft ? 'start' : 'end',
                vertical:
                    panelRect.height <= availableBottom || availableBottom >= availableTop ? 'bottom' : 'top',
            };

            setMenuPlacement((previous) =>
                previous.horizontal === nextPlacement.horizontal && previous.vertical === nextPlacement.vertical
                    ? previous
                    : nextPlacement,
            );
        };

        const frameId = window.requestAnimationFrame(updatePlacement);
        window.addEventListener('resize', updatePlacement);
        window.addEventListener('scroll', updatePlacement, true);

        return () => {
            window.cancelAnimationFrame(frameId);
            window.removeEventListener('resize', updatePlacement);
            window.removeEventListener('scroll', updatePlacement, true);
        };
    }, [isMenuOpen]);

    if (!structuredData && !formattedStructuredOutput) {
        return null;
    }

    const scheduleReset = () => {
        if (typeof window === 'undefined') {
            return;
        }

        if (resetTimerRef.current != null) {
            window.clearTimeout(resetTimerRef.current);
        }

        resetTimerRef.current = window.setTimeout(() => {
            setCopyState(null);
            resetTimerRef.current = null;
        }, 1800);
    };

    const handleCopy = async (value: string, type: CopyState) => {
        if (!value) {
            return;
        }

        try {
            await writeTextToClipboard(value);
            setCopyState(type);
            scheduleReset();
            if (menuRef.current) {
                menuRef.current.open = false;
            }
        } catch {
            setCopyState(null);
        }
    };

    const handleExportJson = () => {
        if (typeof document === 'undefined' || !jsonText) {
            return;
        }

        downloadStructuredOutputFile(
            jsonText,
            'application/json',
            buildStructuredOutputExportFilename(structuredOutputMode, 'json'),
        );
        if (menuRef.current) {
            menuRef.current.open = false;
        }
    };

    const handleExportText = () => {
        if (typeof document === 'undefined' || !(plainText || jsonText)) {
            return;
        }

        downloadStructuredOutputFile(
            plainText || jsonText,
            'text/plain;charset=utf-8',
            buildStructuredOutputExportFilename(structuredOutputMode, 'txt'),
        );
        if (menuRef.current) {
            menuRef.current.open = false;
        }
    };

    const handleExportMarkdown = () => {
        if (typeof document === 'undefined' || !markdownText) {
            return;
        }

        downloadStructuredOutputFile(
            markdownText,
            'text/markdown;charset=utf-8',
            buildStructuredOutputExportFilename(structuredOutputMode, 'md'),
        );
        if (menuRef.current) {
            menuRef.current.open = false;
        }
    };

    const buttonClassName =
        variant === 'dark'
            ? 'nbu-control-button px-3 py-1.5 text-xs text-slate-200'
            : 'nbu-control-button px-3 py-1.5 text-xs';
    const menuHorizontalPlacementClassName =
        menuPlacement.horizontal === 'start' ? 'left-0 translate-x-0' : 'right-0 translate-x-0';
    const menuVerticalPlacementClassName =
        menuPlacement.vertical === 'top' ? 'bottom-full mb-2' : 'top-full mt-2';
    const menuPanelClassName =
        variant === 'dark'
            ? `nbu-floating-panel absolute ${menuHorizontalPlacementClassName} ${menuVerticalPlacementClassName} z-20 w-[min(18rem,calc(100vw-2rem))] rounded-2xl p-2 sm:w-44`
            : `nbu-floating-panel absolute ${menuHorizontalPlacementClassName} ${menuVerticalPlacementClassName} z-20 w-[min(18rem,calc(100vw-2rem))] rounded-2xl p-2 sm:w-44`;
    const summaryClassName =
        variant === 'dark'
            ? 'nbu-control-button flex cursor-pointer list-none items-center gap-2 px-3 py-1.5 text-xs text-slate-200'
            : 'nbu-control-button flex cursor-pointer list-none items-center gap-2 px-3 py-1.5 text-xs';
    const menuItemClassName =
        variant === 'dark'
            ? 'w-full rounded-xl px-3 py-2 text-left text-xs font-semibold text-white/80 transition-colors hover:bg-white/10'
            : 'w-full rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100';
    const sectionLabelClassName =
        variant === 'dark'
            ? 'px-3 pb-1 pt-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/45'
            : 'px-3 pb-1 pt-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400';
    const dividerClassName = variant === 'dark' ? 'my-1 border-t border-white/10' : 'my-1 border-t border-slate-200';

    return (
        <div data-testid="structured-output-actions" className="relative inline-flex">
            <details
                data-testid="structured-output-actions-menu"
                className="group relative"
                ref={menuRef}
                onToggle={(event) => {
                    const nextIsOpen = event.currentTarget.open;
                    setIsMenuOpen(nextIsOpen);
                    if (!nextIsOpen) {
                        setMenuPlacement(DEFAULT_MENU_PLACEMENT);
                    }
                }}
            >
                <summary data-testid="structured-output-actions-summary" className={summaryClassName}>
                    <span>{t('structuredOutputActionsLabel')}</span>
                    <svg
                        aria-hidden="true"
                        viewBox="0 0 20 20"
                        fill="none"
                        className="h-4 w-4 text-current/70 transition-transform group-open:rotate-180"
                    >
                        <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                </summary>

                <div
                    ref={menuPanelRef}
                    data-placement-horizontal={menuPlacement.horizontal}
                    data-placement-vertical={menuPlacement.vertical}
                    className={menuPanelClassName}
                >
                    <div data-testid="structured-output-actions-copy-group-label" className={sectionLabelClassName}>
                        {t('structuredOutputActionsCopyGroup')}
                    </div>
                    <button
                        type="button"
                        onClick={() => void handleCopy(jsonText, 'json')}
                        className={menuItemClassName}
                    >
                        {copyState === 'json' ? t('structuredOutputCopied') : t('structuredOutputCopyJson')}
                    </button>
                    <button
                        type="button"
                        onClick={() => void handleCopy(plainText || jsonText, 'text')}
                        className={menuItemClassName}
                    >
                        {copyState === 'text' ? t('structuredOutputCopied') : t('structuredOutputCopyText')}
                    </button>
                    <div className={dividerClassName} />
                    <div data-testid="structured-output-actions-export-group-label" className={sectionLabelClassName}>
                        {t('structuredOutputActionsExportGroup')}
                    </div>
                    <button type="button" onClick={handleExportJson} className={menuItemClassName}>
                        {t('structuredOutputExportJson')}
                    </button>
                    <button type="button" onClick={handleExportText} className={menuItemClassName}>
                        {t('structuredOutputExportText')}
                    </button>
                    <button type="button" onClick={handleExportMarkdown} className={menuItemClassName}>
                        {t('structuredOutputExportMarkdown')}
                    </button>
                </div>
            </details>
        </div>
    );
}
