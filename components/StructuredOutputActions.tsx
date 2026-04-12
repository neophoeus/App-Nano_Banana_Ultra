import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { StructuredOutputMode } from '../types';
import { useAnchoredFloatingPlacement } from '../hooks/useAnchoredFloatingPlacement';
import { writeTextToClipboard } from '../utils/clipboard';
import { getTranslation, Language } from '../utils/translations';
import { formatStructuredOutputMarkdown, formatStructuredOutputPlainText } from '../utils/structuredOutputPresentation';
import { useModalFloatingLayer } from './ModalFloatingLayerContext';

type StructuredOutputActionsProps = {
    currentLanguage: Language;
    structuredData: Record<string, unknown> | null;
    structuredOutputMode: StructuredOutputMode | null;
    formattedStructuredOutput: string | null;
    fallbackText?: string | null;
    variant?: 'light' | 'dark';
};

type CopyState = 'json' | 'text' | null;
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
    const menuRef = useRef<HTMLDivElement | null>(null);
    const summaryButtonRef = useRef<HTMLButtonElement | null>(null);
    const menuPanelRef = useRef<HTMLDivElement | null>(null);
    const resetTimerRef = useRef<number | null>(null);
    const modalFloatingLayer = useModalFloatingLayer();
    const usesFloatingLayer = Boolean(modalFloatingLayer?.hostElement);
    const { floatingStyle, resolvedHorizontalPlacement, resolvedVerticalPlacement } = useAnchoredFloatingPlacement({
        anchorRef: summaryButtonRef,
        autoAdjustHorizontal: true,
        autoAdjustVertical: true,
        isOpen: isMenuOpen,
        panelRef: menuPanelRef,
        preferredHorizontalPlacement: 'end',
        preferredVerticalPlacement: 'bottom',
    });
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
        if (!isMenuOpen) {
            return undefined;
        }

        const isWithinMenuBoundary = (target: EventTarget | null) => {
            const targetNode = target as Node | null;
            if (!targetNode) {
                return false;
            }

            return Boolean(menuRef.current?.contains(targetNode) || menuPanelRef.current?.contains(targetNode));
        };

        const handlePointerDown = (event: PointerEvent) => {
            if (!isWithinMenuBoundary(event.target)) {
                setIsMenuOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            setIsMenuOpen(false);
        };

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleEscape);
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
            setIsMenuOpen(false);
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
        setIsMenuOpen(false);
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
        setIsMenuOpen(false);
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
        setIsMenuOpen(false);
    };

    const menuHorizontalPlacementClassName =
        resolvedHorizontalPlacement === 'start' ? 'left-0 translate-x-0' : 'right-0 translate-x-0';
    const menuVerticalPlacementClassName = resolvedVerticalPlacement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2';
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
    const sharedPanelClassName = `nbu-floating-panel w-[min(18rem,calc(100vw-2rem))] rounded-2xl p-2 transition sm:w-44 ${
        isMenuOpen ? 'visible opacity-100' : 'pointer-events-none invisible opacity-0'
    }`;
    const menuPanelNode = (
        <div
            ref={menuPanelRef}
            data-testid="structured-output-actions-panel"
            data-placement-horizontal={resolvedHorizontalPlacement}
            data-placement-vertical={resolvedVerticalPlacement}
            aria-hidden={!isMenuOpen}
            className={
                usesFloatingLayer
                    ? `pointer-events-auto ${sharedPanelClassName}`
                    : `absolute ${menuHorizontalPlacementClassName} ${menuVerticalPlacementClassName} z-20 ${sharedPanelClassName}`
            }
            style={
                usesFloatingLayer
                    ? {
                          ...floatingStyle,
                          zIndex: modalFloatingLayer?.floatingZIndex,
                      }
                    : undefined
            }
        >
            <div data-testid="structured-output-actions-copy-group-label" className={sectionLabelClassName}>
                {t('structuredOutputActionsCopyGroup')}
            </div>
            <button type="button" onClick={() => void handleCopy(jsonText, 'json')} className={menuItemClassName}>
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
    );

    return (
        <div data-testid="structured-output-actions" ref={menuRef} className="relative inline-flex">
            <div data-testid="structured-output-actions-menu" className="group relative inline-flex">
                <button
                    ref={summaryButtonRef}
                    type="button"
                    data-testid="structured-output-actions-summary"
                    aria-expanded={isMenuOpen}
                    onClick={() => setIsMenuOpen((value) => !value)}
                    className={summaryClassName}
                >
                    <span>{t('structuredOutputActionsLabel')}</span>
                    <svg
                        aria-hidden="true"
                        viewBox="0 0 20 20"
                        fill="none"
                        className={`h-4 w-4 text-current/70 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}
                    >
                        <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                </button>
                {usesFloatingLayer && modalFloatingLayer?.hostElement
                    ? createPortal(menuPanelNode, modalFloatingLayer.hostElement)
                    : menuPanelNode}
            </div>
        </div>
    );
}
