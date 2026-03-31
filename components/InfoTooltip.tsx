import React, { useEffect, useId, useRef, useState } from 'react';

type InfoTooltipProps = {
    content: React.ReactNode;
    buttonLabel: string;
    ariaLabel?: string;
    dataTestId?: string;
    tone?: 'light' | 'dark';
    align?: 'left' | 'right';
};

export default function InfoTooltip({
    content,
    buttonLabel,
    ariaLabel,
    dataTestId,
    tone = 'light',
    align = 'left',
}: InfoTooltipProps) {
    const [isOpen, setIsOpen] = useState(false);
    const tooltipId = useId();
    const rootRef = useRef<HTMLDivElement>(null);

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

    const buttonClassName =
        tone === 'dark'
            ? 'border-white/15 bg-white/5 text-white/55 hover:bg-white/10 hover:text-white/80 focus:ring-white/20'
            : 'border-gray-200 bg-white text-gray-500 hover:border-amber-300 hover:text-amber-700 focus:ring-amber-200 dark:border-gray-700 dark:bg-[#12161d] dark:text-gray-400 dark:hover:border-amber-400/40 dark:hover:text-amber-200 dark:focus:ring-amber-500/20';
    const panelClassName =
        tone === 'dark'
            ? 'border-white/10 bg-[#0d1117] text-white/80 shadow-[0_18px_50px_rgba(0,0,0,0.38)]'
            : 'border-gray-200 bg-white text-gray-700 shadow-[0_18px_45px_rgba(15,23,42,0.14)] dark:border-gray-700 dark:bg-[#0f141c] dark:text-gray-200 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]';
    const alignmentClassName =
        align === 'right'
            ? 'left-1/2 -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0'
            : 'left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0';

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
                className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-black transition focus:outline-none focus:ring-2 ${buttonClassName}`}
            >
                <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
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
                id={tooltipId}
                role="tooltip"
                aria-hidden={!isOpen}
                data-testid={dataTestId}
                className={`absolute ${alignmentClassName} top-full z-50 mt-2 w-[min(16rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] rounded-2xl border px-3 py-2 text-xs leading-5 transition ${panelClassName} ${
                    isOpen ? 'visible opacity-100' : 'pointer-events-none invisible opacity-0'
                }`}
            >
                {content}
            </div>
        </div>
    );
}
