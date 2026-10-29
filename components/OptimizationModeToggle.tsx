import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAnchoredFloatingPlacement } from '../hooks/useAnchoredFloatingPlacement';
import { OptimizationMode } from '../types';
import { Language, getTranslation } from '../utils/translations';
import { useWorkspaceFloatingLayer } from './WorkspaceFloatingLayerContext';

export interface OptimizationModeToggleProps {
    optimizationMode?: OptimizationMode;
    onOptimizationModeChange?: (mode: OptimizationMode) => void;
    mode?: OptimizationMode;
    onChange?: (mode: OptimizationMode) => void;
    currentLanguage?: Language;
    className?: string;
}

function FlameIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z" />
        </svg>
    );
}

function LeafIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M11 20A7 7 0 0 1 4 13C4 6 11 3 20 3c0 9-3 16-9 17Z" />
            <path d="M9 15c2-2 5-5 11-12" />
        </svg>
    );
}

function InfoIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
        </svg>
    );
}

function CloseIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
        </svg>
    );
}

export const OptimizationModeToggle: React.FC<OptimizationModeToggleProps> = ({
    optimizationMode,
    onOptimizationModeChange,
    mode,
    onChange,
    currentLanguage = 'en' as Language,
    className = '',
}) => {
    const t = (key: string) => getTranslation(currentLanguage, key);
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const dialogId = useId();
    const dialogTitleId = `${dialogId}-title`;

    const controlRef = useRef<HTMLDivElement>(null);
    const infoTriggerRef = useRef<HTMLButtonElement>(null);
    const infoCardRef = useRef<HTMLDivElement>(null);

    const activeMode: OptimizationMode = (optimizationMode ?? mode) === 'eco' ? 'eco' : 'quality';
    const handleModeChange = onOptimizationModeChange ?? onChange;

    const floatingLayer = useWorkspaceFloatingLayer();
    const usesFloatingLayer = Boolean(floatingLayer?.hostElement);
    const { floatingStyle } = useAnchoredFloatingPlacement({
        anchorRef: infoTriggerRef,
        panelRef: infoCardRef,
        isOpen: isInfoOpen,
        preferredHorizontalPlacement: 'end',
        preferredVerticalPlacement: 'bottom',
        autoAdjustHorizontal: true,
        autoAdjustVertical: false,
        offset: 8,
    });

    const isWithinBounds = (target: EventTarget | null) => {
        const node = target as Node | null;
        if (!node) return false;
        return Boolean(controlRef.current?.contains(node) || infoCardRef.current?.contains(node));
    };

    useEffect(() => {
        if (!isInfoOpen) return;

        const handleOutside = (event: Event) => {
            if (!isWithinBounds(event.target)) {
                setIsInfoOpen(false);
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                setIsInfoOpen(false);
            }
        };

        document.addEventListener('pointerdown', handleOutside);
        document.addEventListener('mousedown', handleOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('pointerdown', handleOutside);
            document.removeEventListener('mousedown', handleOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isInfoOpen]);

    const infoCardNode = (
        <div
            ref={infoCardRef}
            id={dialogId}
            data-testid="optimization-mode-info-card"
            role="dialog"
            aria-labelledby={dialogTitleId}
            className={
                usesFloatingLayer
                    ? 'pointer-events-auto w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white p-4 text-xs shadow-2xl ring-1 ring-black/5 animate-[fadeIn_0.15s_ease-out] dark:border-slate-700 dark:bg-slate-900 dark:ring-white/10'
                    : 'absolute top-full right-0 z-50 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white p-4 text-xs shadow-2xl ring-1 ring-black/5 animate-[fadeIn_0.15s_ease-out] dark:border-slate-700 dark:bg-slate-900 dark:ring-white/10'
            }
            style={
                usesFloatingLayer
                    ? {
                          ...floatingStyle,
                          zIndex: floatingLayer?.floatingZIndex,
                      }
                    : undefined
            }
        >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
                <div className="flex items-center gap-2">
                    <InfoIcon className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                    <h3 id={dialogTitleId} className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                        {t('optimizationModeInfoTitle')}
                    </h3>
                </div>
                <button
                    type="button"
                    data-testid="optimization-mode-dialog-close-btn"
                    aria-label={t('workspaceViewerClose')}
                    onClick={() => setIsInfoOpen(false)}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                    <CloseIcon className="h-4 w-4" />
                </button>
            </div>

            <div className="mt-3 space-y-3.5 text-slate-600 dark:text-slate-300 leading-relaxed">
                {/* Quality Mode Details */}
                <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 p-3 dark:border-amber-500/20 dark:bg-amber-950/20">
                    <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-300">
                        <FlameIcon className="h-4 w-4 fill-amber-500/30" />
                        <span>{t('optimizationModeQualityTitle')}</span>
                    </div>
                    <p className="mt-1 text-[11px] leading-normal">{t('optimizationModeQualityDesc')}</p>
                    <p className="mt-1.5 text-[10px] text-amber-800/80 dark:text-amber-200/80">
                        <span className="font-semibold">{t('optimizationModeUseCasesLabel')}</span>{' '}
                        {t('optimizationModeQualityUseCases')}
                    </p>
                </div>

                {/* Eco Mode Details */}
                <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/50 p-3 dark:border-emerald-500/20 dark:bg-emerald-950/20">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300">
                        <LeafIcon className="h-4 w-4 fill-emerald-500/30" />
                        <span>{t('optimizationModeEcoTitle')}</span>
                    </div>
                    <p className="mt-1 text-[11px] leading-normal">{t('optimizationModeEcoDesc')}</p>
                    <div className="mt-2 rounded-lg bg-emerald-100/70 p-2 text-[11px] font-medium text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200">
                        {t('optimizationModeEcoOutputSizeNotice')}
                    </div>
                    <p className="mt-1.5 text-[10px] text-emerald-800/80 dark:text-emerald-200/80">
                        <span className="font-semibold">{t('optimizationModeUseCasesLabel')}</span>{' '}
                        {t('optimizationModeEcoUseCases')}
                    </p>
                </div>
            </div>
        </div>
    );

    return (
        <div
            ref={controlRef}
            data-testid="optimization-mode-control"
            className={`relative inline-flex items-center gap-1.5 ${className}`}
        >
            {/* Sliding Pill Switch */}
            <div
                role="group"
                data-testid="optimization-mode-toggle"
                data-active-mode={activeMode}
                aria-pressed={activeMode === 'eco'}
                aria-label={t('optimizationModeInfoTitle')}
                className="relative inline-grid grid-cols-[1fr_1fr] h-8 items-center rounded-full border border-slate-200/90 bg-slate-100/90 p-0.5 shadow-sm dark:border-white/10 dark:bg-[#12161f]"
            >
                {/* Sliding Thumb */}
                <div
                    data-testid="optimization-mode-thumb"
                    aria-hidden="true"
                    className={`absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] rounded-full transition-all duration-200 ease-out pointer-events-none ${
                        activeMode === 'quality'
                            ? 'left-0.5 bg-white shadow-sm ring-1 ring-amber-500/25 dark:bg-amber-500/20 dark:ring-amber-400/30'
                            : 'left-[calc(50%+1px)] bg-white shadow-sm ring-1 ring-emerald-500/25 dark:bg-emerald-500/20 dark:ring-emerald-400/30'
                    }`}
                />

                <button
                    type="button"
                    role="radio"
                    data-testid="optimization-mode-option-quality"
                    aria-checked={activeMode === 'quality'}
                    onClick={() => handleModeChange?.('quality')}
                    className={`relative z-10 flex h-7 items-center justify-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold transition-colors duration-200 ${
                        activeMode === 'quality'
                            ? 'text-amber-600 dark:text-amber-300'
                            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                >
                    <FlameIcon
                        className={`h-3.5 w-3.5 transition-colors ${
                            activeMode === 'quality'
                                ? 'text-amber-500 fill-amber-500/25'
                                : 'text-slate-400 dark:text-slate-500'
                        }`}
                    />
                    <span>{t('optimizationModeQuality')}</span>
                </button>

                <button
                    type="button"
                    role="radio"
                    data-testid="optimization-mode-option-eco"
                    aria-checked={activeMode === 'eco'}
                    onClick={() => handleModeChange?.('eco')}
                    className={`relative z-10 flex h-7 items-center justify-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold transition-colors duration-200 ${
                        activeMode === 'eco'
                            ? 'text-emerald-600 dark:text-emerald-300'
                            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                >
                    <LeafIcon
                        className={`h-3.5 w-3.5 transition-colors ${
                            activeMode === 'eco'
                                ? 'text-emerald-500 fill-emerald-500/25'
                                : 'text-slate-400 dark:text-slate-500'
                        }`}
                    />
                    <span>{t('optimizationModeEco')}</span>
                </button>
            </div>

            {/* Circular Info Button */}
            <button
                ref={infoTriggerRef}
                type="button"
                data-testid="optimization-mode-info-trigger"
                aria-label={t('optimizationModeInfoTitle')}
                aria-expanded={isInfoOpen}
                aria-haspopup="dialog"
                aria-controls={dialogId}
                onClick={() => setIsInfoOpen((prev) => !prev)}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all duration-200 ${
                    isInfoOpen
                        ? 'border-amber-400 bg-amber-50 text-amber-600 ring-2 ring-amber-500/20 dark:border-amber-500/50 dark:bg-amber-500/20 dark:text-amber-300'
                        : 'border-slate-200/90 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:border-white/10 dark:bg-[#12161f] dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                }`}
            >
                <InfoIcon className="h-4 w-4" />
            </button>

            {/* Floating Info Dialog Card */}
            {isInfoOpen &&
                (usesFloatingLayer && floatingLayer?.hostElement
                    ? createPortal(infoCardNode, floatingLayer.hostElement)
                    : infoCardNode)}
        </div>
    );
};

export default React.memo(OptimizationModeToggle);
