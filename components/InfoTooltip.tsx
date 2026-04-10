import React, { useEffect, useId, useRef, useState } from 'react';

type InfoTooltipProps = {
    content: React.ReactNode;
    buttonLabel: string;
    buttonText?: string;
    ariaLabel?: string;
    dataTestId?: string;
    tone?: 'light' | 'dark';
    align?: 'left' | 'right';
    preferredVerticalPlacement?: 'top' | 'bottom';
    autoAdjust?: boolean;
};

export default function InfoTooltip({
    content,
    buttonLabel,
    buttonText,
    ariaLabel,
    dataTestId,
    tone = 'light',
    align = 'left',
    preferredVerticalPlacement = 'bottom',
    autoAdjust = false,
}: InfoTooltipProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [resolvedVerticalPlacement, setResolvedVerticalPlacement] = useState<'top' | 'bottom'>(
        preferredVerticalPlacement,
    );
    const tooltipId = useId();
    const rootRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setResolvedVerticalPlacement(preferredVerticalPlacement);
    }, [preferredVerticalPlacement]);

    useEffect(() => {
        if (!isOpen) {
            return undefined;
        }

        const handlePointerDown = (event: PointerEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen || !autoAdjust || typeof window === 'undefined') {
            return undefined;
        }

        const updatePlacement = () => {
            const rootRect = rootRef.current?.getBoundingClientRect();
            const panelRect = panelRef.current?.getBoundingClientRect();

            if (!rootRect || !panelRect) {
                return;
            }

            const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
            const viewportPadding = 16;
            const availableTop = rootRect.top - viewportPadding;
            const availableBottom = viewportHeight - rootRect.bottom - viewportPadding;
            const preferredFits =
                preferredVerticalPlacement === 'top'
                    ? panelRect.height <= availableTop
                    : panelRect.height <= availableBottom;
            const fallbackFits =
                preferredVerticalPlacement === 'top'
                    ? panelRect.height <= availableBottom
                    : panelRect.height <= availableTop;
            const nextPlacement = preferredFits || !fallbackFits
                ? preferredVerticalPlacement
                : preferredVerticalPlacement === 'top'
                  ? 'bottom'
                  : 'top';

            setResolvedVerticalPlacement(nextPlacement);
        };

        const frameId = window.requestAnimationFrame(updatePlacement);
        window.addEventListener('resize', updatePlacement);
        window.addEventListener('scroll', updatePlacement, true);

        return () => {
            window.cancelAnimationFrame(frameId);
            window.removeEventListener('resize', updatePlacement);
            window.removeEventListener('scroll', updatePlacement, true);
        };
    }, [autoAdjust, isOpen, preferredVerticalPlacement]);

    const buttonClassName =
        tone === 'dark'
            ? 'border-white/15 bg-white/5 text-white/55 hover:bg-white/10 hover:text-white/80 focus:ring-white/20'
            : 'border-gray-200 bg-white text-gray-500 hover:border-amber-300 hover:text-amber-700 focus:ring-amber-200 dark:border-gray-700 dark:bg-[#12161d] dark:text-gray-400 dark:hover:border-amber-400/40 dark:hover:text-amber-200 dark:focus:ring-amber-500/20';
    const panelClassName =
        tone === 'dark'
            ? 'border-white/10 bg-[#0d1117] text-white/80 shadow-[0_18px_50px_rgba(0,0,0,0.38)]'
            : 'border-gray-200 bg-white text-gray-700 shadow-[0_18px_45px_rgba(15,23,42,0.14)] dark:border-gray-700 dark:bg-[#0f141c] dark:text-gray-200 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]';
    const usesTextTrigger = Boolean(buttonText);
    const triggerClassName = usesTextTrigger
        ? `inline-flex min-h-6 items-center justify-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] transition focus:outline-none focus:ring-2 ${buttonClassName}`
        : `inline-flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-black transition focus:outline-none focus:ring-2 ${buttonClassName}`;
    const alignmentClassName =
        align === 'right'
            ? 'left-1/2 -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0'
            : 'left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0';
    const verticalPlacementClassName =
        resolvedVerticalPlacement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2';

    return (
        <div
            ref={rootRef}
            className="relative inline-flex shrink-0"
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
            onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    setIsOpen(false);
                }
            }}
        >
            <button
                type="button"
                aria-label={ariaLabel || buttonLabel}
                aria-describedby={isOpen ? tooltipId : undefined}
                aria-expanded={isOpen}
                data-testid={dataTestId ? `${dataTestId}-trigger` : undefined}
                onClick={() => setIsOpen((value) => !value)}
                onFocus={() => setIsOpen(true)}
                className={triggerClassName}
            >
                {buttonText ? <span>{buttonText}</span> : null}
                <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    fill="none"
                    className={buttonText ? 'h-3 w-3' : 'h-3.5 w-3.5'}
                >
                    <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.5" />
                    <path
                        d="M10 8v4"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <circle cx="10" cy="5.6" r="0.9" fill="currentColor" />
                </svg>
            </button>
            <div
                ref={panelRef}
                id={tooltipId}
                role="tooltip"
                aria-hidden={!isOpen}
                data-testid={dataTestId}
                data-placement-vertical={resolvedVerticalPlacement}
                className={`absolute ${alignmentClassName} ${verticalPlacementClassName} z-50 w-[min(16rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] rounded-2xl border px-3 py-2 text-xs leading-5 transition ${panelClassName} ${
                    isOpen ? 'visible opacity-100' : 'pointer-events-none invisible opacity-0'
                }`}
            >
                {content}
            </div>
        </div>
    );
}
