import React, { useState, useEffect } from 'react';
import { WORKSPACE_OVERLAY_Z_INDEX } from '../constants/workspaceOverlays';
import { BranchNameOverrides, GeneratedImage } from '../types';
import { Language, getTranslation } from '../utils/translations';

interface HistoryPanelProps {
    history: GeneratedImage[];
    onSelect: (item: GeneratedImage) => void;
    onContinueFromTurn?: (item: GeneratedImage) => void;
    onBranchFromTurn?: (item: GeneratedImage) => void;
    onRenameBranch?: (item: GeneratedImage) => void;
    isPromotedContinuationSource?: (item: GeneratedImage) => boolean;
    getContinueActionLabel?: (item: GeneratedImage) => string;
    branchNameOverrides?: BranchNameOverrides;
    selectedUrl?: string;
    selectedId?: string;
    disabled?: boolean;
    title?: string;
    currentLanguage?: Language;
    onClear?: () => void;
    surface?: 'default' | 'embedded';
    currentStageSourceHistoryId?: string | null;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({
    history,
    onSelect,
    isPromotedContinuationSource,
    selectedUrl,
    selectedId,
    disabled,
    title,
    currentLanguage = 'en' as Language,
    onClear,
    surface = 'default',
    currentStageSourceHistoryId = null,
}) => {
    const [page, setPage] = useState(0);
    const [showConfirm, setShowConfirm] = useState(false);
    const pageSize = 4;
    const t = (key: string) => getTranslation(currentLanguage, key);

    // Reset to first page when history changes (e.g. new image generated)
    useEffect(() => {
        setPage(0);
    }, [history]);

    if (history.length === 0) return null;

    const resolvedTitle = title || t('workspacePickerPromptHistoryTitle');

    const totalPages = Math.ceil(history.length / pageSize);
    const displayedHistory = history.slice(page * pageSize, (page + 1) * pageSize);
    const isEmbedded = surface === 'embedded';
    const panelClassName = isEmbedded
        ? `transition-opacity duration-300 ${disabled ? 'opacity-40 pointer-events-none select-none' : ''}`
        : `mt-8 animate-[fadeIn_0.5s_ease-out] border-t border-gray-200 dark:border-gray-800 pt-6 transition-opacity duration-300 ${disabled ? 'opacity-40 pointer-events-none select-none' : ''}`;
    const headerClassName = isEmbedded
        ? 'mb-3 flex items-center justify-between gap-3 px-0.5'
        : 'mb-4 flex items-center justify-between px-1';
    const titleClassName = isEmbedded
        ? 'flex items-center gap-2 text-[15px] font-black text-slate-900 dark:text-slate-100'
        : 'text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2';
    const titleIconClassName = isEmbedded ? 'h-4 w-4 text-slate-400 dark:text-slate-500' : 'h-4 w-4';

    return (
        <div className={panelClassName}>
            <div className={headerClassName}>
                <h3 className={titleClassName}>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={titleIconClassName}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                    {resolvedTitle}
                </h3>

                <div className="flex items-center gap-3">
                    {onClear && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowConfirm(true);
                            }}
                            className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                            title={t('clearHistory')}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                            </svg>
                        </button>
                    )}

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="nbu-segmented-tray flex items-center rounded-lg p-0.5">
                            <button
                                onClick={() => setPage((p) => Math.max(0, p - 1))}
                                disabled={page === 0}
                                className="p-1 text-gray-400 hover:text-gray-800 dark:hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 transition-colors"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </button>
                            <span className="text-[10px] px-2 text-gray-600 dark:text-gray-500 font-mono select-none min-w-[30px] text-center">
                                {page + 1}/{totalPages}
                            </span>
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                                disabled={page === totalPages - 1}
                                className="p-1 text-gray-400 hover:text-gray-800 dark:hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 transition-colors"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </button>
                        </div>
                    )}

                    <span className="nbu-quiet-pill min-w-[24px] text-center font-mono text-xs shadow-inner">
                        {history.length}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {displayedHistory.map((item) => {
                    const isFailed = item.status === 'failed';
                    const isSelected = selectedId ? selectedId === item.id : selectedUrl === item.url;
                    const isContinuationSource = isPromotedContinuationSource
                        ? isPromotedContinuationSource(item)
                        : false;
                    const isCurrentStageSource = currentStageSourceHistoryId === item.id;
                    const hasPreviewImage = Boolean(item.url);

                    return (
                        <div
                            key={item.id}
                            role="button"
                            tabIndex={disabled ? -1 : 0}
                            aria-disabled={disabled ? 'true' : 'false'}
                            data-testid={`history-card-${item.id}`}
                            onClick={() => !disabled && onSelect(item)}
                            onKeyDown={(e) => {
                                if (disabled) return;
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    onSelect(item);
                                }
                            }}
                            className={`
              relative aspect-square rounded-xl overflow-hidden border bg-white/90 transition-[border-color,box-shadow,background-color] duration-200 animate-[fadeIn_0.3s_ease-out] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 dark:bg-slate-950/70
              ${
                  isSelected && !isFailed
                      ? 'border-amber-500 ring-2 ring-amber-500/30 ring-offset-2 ring-offset-white dark:ring-offset-black z-10 shadow-[0_10px_24px_rgba(15,23,42,0.18)]'
                      : isFailed
                        ? 'border-red-300 dark:border-red-800'
                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-600'
              }
              ${disabled ? 'cursor-not-allowed' : ''}
            `}
                        >
                            {isFailed ? (
                                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-red-50 to-rose-100 px-2 text-center dark:from-red-950/30 dark:to-rose-950/20">
                                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-red-600 dark:text-red-300">
                                        {t('lblHistoryFailed')}
                                    </span>
                                </div>
                            ) : !hasPreviewImage ? (
                                <div
                                    data-testid={`history-card-${item.id}-missing-media`}
                                    className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800"
                                >
                                    <div className="h-8 w-8 rounded-2xl border border-slate-300/70 bg-white/70 shadow-inner dark:border-slate-700 dark:bg-slate-900/60" />
                                </div>
                            ) : (
                                <img
                                    src={item.url}
                                    alt={t('stageGeneratedImageAlt')}
                                    className="w-full h-full object-cover bg-gray-100 dark:bg-gray-900"
                                    loading="lazy"
                                />
                            )}

                            {!isFailed && (isCurrentStageSource || isContinuationSource) && (
                                <div className="pointer-events-none absolute left-2 top-2 z-10 flex max-w-[calc(100%-1rem)] flex-col items-start gap-1.5">
                                    {isCurrentStageSource && (
                                        <span
                                            data-testid={`history-stage-source-${item.id}`}
                                            className="rounded-full bg-amber-500/95 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-white shadow-lg whitespace-nowrap"
                                        >
                                            {t('workspacePickerStageSource')}
                                        </span>
                                    )}
                                    {isContinuationSource && (
                                        <span
                                            data-testid={`history-continuation-source-${item.id}`}
                                            className="rounded-full bg-emerald-500/95 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-white shadow-lg whitespace-nowrap"
                                        >
                                            {t('historyBranchContinuationSource')}
                                        </span>
                                    )}
                                </div>
                            )}

                            {isSelected && !isFailed && (
                                <div
                                    data-testid={`history-selected-${item.id}`}
                                    className="absolute bottom-2 right-2 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-white/80 shadow-[0_0_10px_rgba(250,204,21,0.85)] dark:ring-slate-950/80"
                                ></div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Clear Confirmation Modal */}
            {showConfirm && (
                <div
                    className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
                    style={{ zIndex: WORKSPACE_OVERLAY_Z_INDEX.historyConfirm }}
                    onClick={() => setShowConfirm(false)}
                >
                    <div
                        className="nbu-modal-shell w-full max-w-sm overflow-hidden transform scale-100 transition-all"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 text-center">
                            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-400">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-6 w-6"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                                {t('clearHistoryTitle')}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                                {t('clearHistoryMsg')}
                            </p>
                        </div>
                        <div className="flex gap-2 border-t border-gray-100 bg-gray-50 p-2 dark:border-gray-800 dark:bg-gray-900/50">
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all"
                            >
                                {t('clearHistoryCancel')}
                            </button>
                            <button
                                onClick={() => {
                                    setShowConfirm(false);
                                    if (onClear) onClear();
                                }}
                                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30 transition-all"
                            >
                                {t('clearHistoryConfirm')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HistoryPanel;
