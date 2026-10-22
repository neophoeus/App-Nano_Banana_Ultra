import React, { useState, useRef, useEffect } from 'react';
import { Language, getTranslation } from '../utils/translations';
import { useWorkspaceExecutionMode } from '../hooks/useWorkspaceExecutionMode';
import type { WorkspaceExecutionModeSetting } from '../utils/workspaceExecutionMode';
import {
    useComputePoolStatus,
    resetComputePoolStatus,
    ComputePoolHealthLevel,
} from '../utils/aiStudioPlan';

interface ExecutionModeSelectorProps {
    currentLanguage: Language;
    className?: string;
    buttonClassName?: string;
    menuClassName?: string;
}

const getPoolTone = (level: ComputePoolHealthLevel): string => {
    switch (level) {
        case 'congested':
            return 'bg-orange-500';
        case 'throttled':
            return 'bg-amber-500';
        case 'exhausted':
            return 'bg-rose-500';
        case 'healthy':
        default:
            return 'bg-emerald-500';
    }
};

const getPoolLevelKey = (level: ComputePoolHealthLevel): string => {
    switch (level) {
        case 'congested':
            return 'computePoolStatusCongested';
        case 'throttled':
            return 'computePoolStatusThrottled';
        case 'exhausted':
            return 'computePoolStatusExhausted';
        case 'healthy':
        default:
            return 'computePoolStatusHealthy';
    }
};

const ExecutionModeSelector: React.FC<ExecutionModeSelectorProps> = ({
    currentLanguage,
    className = '',
    buttonClassName = '',
    menuClassName = '',
}) => {
    const { setting, resolvedMode, setSetting } = useWorkspaceExecutionMode();
    const poolStatus = useComputePoolStatus();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen]);

    const getModeLabel = (modeSetting: WorkspaceExecutionModeSetting): string => {
        switch (modeSetting) {
            case 'auto':
                return getTranslation(currentLanguage, 'executionModeAuto') || 'Auto';
            case 'local':
                return getTranslation(currentLanguage, 'executionModeLocal') || 'Local API';
            case 'direct':
                return getTranslation(currentLanguage, 'executionModeDirect') || 'AI Studio';
        }
    };

    const getDisplayBadge = () => {
        if (setting === 'auto') {
            if (resolvedMode === 'local') {
                return {
                    icon: '⚡',
                    label: `${getTranslation(currentLanguage, 'executionModeAuto') || 'Auto'} (${getTranslation(currentLanguage, 'executionModeLocal') || 'Local API'})`,
                    badgeColor: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
                };
            }
            return {
                icon: '🌐',
                label: `${getTranslation(currentLanguage, 'executionModeAuto') || 'Auto'} (${getTranslation(currentLanguage, 'executionModeDirect') || 'AI Studio'})`,
                badgeColor: 'text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20',
            };
        }

        if (setting === 'local') {
            return {
                icon: '⚡',
                label: getTranslation(currentLanguage, 'executionModeLocal') || 'Local API',
                badgeColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
            };
        }

        return {
            icon: '🌐',
            label: getTranslation(currentLanguage, 'executionModeDirect') || 'AI Studio',
            badgeColor: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
        };
    };

    const badge = getDisplayBadge();

    const options: WorkspaceExecutionModeSetting[] = ['auto', 'local', 'direct'];
    const isDirectActive = setting === 'direct' || (setting === 'auto' && resolvedMode === 'direct');

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                data-testid="execution-mode-selector-btn"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                className={`flex h-8 items-center gap-1.5 rounded-full border px-2.5 py-0 text-[11px] font-bold tracking-wide transition-colors ${badge.badgeColor} hover:opacity-90 active:scale-95 ${buttonClassName}`}
                title={getTranslation(currentLanguage, 'executionModeSelectorTooltip') || 'Execution Engine Mode'}
            >
                <span className="text-[12px]">{badge.icon}</span>
                <span className="hidden sm:inline">{badge.label}</span>
                <svg
                    className={`h-3 w-3 opacity-60 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div
                    data-testid="execution-mode-menu"
                    className={`absolute right-0 z-50 mt-2 w-56 rounded-2xl border border-slate-200/80 bg-white/95 p-1.5 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-slate-900/95 ${menuClassName}`}
                >
                    <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        {getTranslation(currentLanguage, 'executionModeTitle') || 'Engine Mode'}
                    </div>
                    {options.map((opt) => {
                        const isSelected = setting === opt;
                        const optIcon = opt === 'local' ? '⚡' : opt === 'direct' ? '🌐' : '⚙';
                        return (
                            <button
                                key={opt}
                                type="button"
                                data-testid={`execution-mode-option-${opt}`}
                                onClick={() => {
                                    setSetting(opt);
                                    setIsOpen(false);
                                }}
                                className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-[12px] font-medium transition-colors ${
                                    isSelected
                                        ? 'bg-amber-500/10 font-bold text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
                                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                                }`}
                            >
                                <span className="flex items-center gap-2">
                                    <span>{optIcon}</span>
                                    <span>{getModeLabel(opt)}</span>
                                </span>
                                {isSelected && (
                                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2.5}
                                            d="M5 13l4 4L19 7"
                                        />
                                    </svg>
                                )}
                            </button>
                        );
                    })}

                    {isDirectActive && (
                        <>
                            <div className="my-1.5 border-t border-slate-200/60 dark:border-white/10" />
                            <div
                                data-testid="ai-studio-pool-monitor-card"
                                className="mx-1 my-1 rounded-xl border border-slate-200/70 bg-slate-50/90 p-2.5 text-xs dark:border-white/10 dark:bg-slate-800/80"
                            >
                                <div className="flex items-center justify-between font-semibold text-slate-700 dark:text-slate-200">
                                    <span className="flex items-center gap-1.5">
                                        <span className={`h-2 w-2 rounded-full ${getPoolTone(poolStatus.level)}`} />
                                        <span>{getTranslation(currentLanguage, 'computePoolTitle')}</span>
                                    </span>
                                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                        {getTranslation(currentLanguage, getPoolLevelKey(poolStatus.level))}
                                    </span>
                                </div>
                                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                                    <span>{getTranslation(currentLanguage, 'computePoolPacingMultiplierLabel')}:</span>
                                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                                        {poolStatus.pacingMultiplier.toFixed(1)}x
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    data-testid="compute-pool-reset-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        resetComputePoolStatus();
                                    }}
                                    className="mt-2 flex w-full items-center justify-center rounded-lg border border-slate-200/90 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800 active:scale-95 dark:border-white/10 dark:bg-slate-700/80 dark:text-slate-200 dark:hover:bg-slate-700"
                                >
                                    {getTranslation(currentLanguage, 'computePoolResetBtn')}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default React.memo(ExecutionModeSelector);
