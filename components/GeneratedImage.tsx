import React from 'react';
import Button from './Button';
import HexagonHUD from './HexagonHUD';
import { AspectRatio, ExecutionMode, ImageSize, ImageStyle } from '../types';
import { Language, getTranslation } from '../utils/translations';

export type StageTopRightChipKey = 'current-source' | 'origin' | 'branch' | 'continuation-differs' | 'result-status';
export type StageTopRightChipTone = 'source' | 'branch' | 'divergence' | 'warning' | 'success';

export interface StageTopRightChip {
    key: StageTopRightChipKey;
    label: string;
    tone: StageTopRightChipTone;
}

export type StageTopRightActionKey =
    | 'continue-from-here'
    | 'edit'
    | 'open-viewer'
    | 'add-object-reference'
    | 'add-character-reference'
    | 'branch-from-here'
    | 'clear'
    | 'generating';

export type StageTopRightActionEmphasis = 'primary' | 'secondary' | 'passive' | 'destructive';

export interface StageTopRightAction {
    key: StageTopRightActionKey;
    label: string;
    emphasis: StageTopRightActionEmphasis;
    onClick?: () => void;
}

export interface StageTopRightModel {
    contextChips: StageTopRightChip[];
    overflowContextChips: StageTopRightChip[];
    visibleActions: StageTopRightAction[];
    overflowActions: StageTopRightAction[];
}

interface GeneratedImageProps {
    imageUrls: string[];
    isLoading: boolean;
    prompt?: string;
    error?: string | null;
    settings?: {
        aspectRatio: AspectRatio;
        size: ImageSize;
        style: ImageStyle;
        batchSize?: number;
    };
    aspectRatio?: AspectRatio;
    imageSize?: ImageSize;
    imageStyle?: ImageStyle;
    batchSize?: number;
    generationMode?: string;
    executionMode?: ExecutionMode;
    onEdit?: () => void;
    onGenerate: () => void;
    onAddToObjectReference?: () => void;
    onAddToCharacterReference?: () => void;
    onUpload?: () => void;
    onClear?: () => void;
    onSelectImage?: (url: string) => void;
    selectedImageUrl?: string;
    currentLanguage?: Language;
    currentLog?: string;
    onOpenViewer?: () => void;
    stageTopRight?: StageTopRightModel | null;
}

const stageTopRightChipClassNameByTone: Record<StageTopRightChipTone, string> = {
    source: 'border-emerald-700 bg-emerald-600 text-white shadow-[0_8px_18px_rgba(5,150,105,0.32)] dark:border-emerald-500 dark:bg-emerald-400 dark:text-slate-950',
    branch: 'border-slate-800 bg-slate-700 text-white shadow-[0_8px_18px_rgba(15,23,42,0.32)] dark:border-slate-500 dark:bg-slate-200 dark:text-slate-950',
    divergence:
        'border-emerald-700 bg-emerald-600 text-white shadow-[0_8px_18px_rgba(5,150,105,0.32)] dark:border-emerald-500 dark:bg-emerald-400 dark:text-slate-950',
    warning:
        'border-amber-700 bg-amber-600 text-white shadow-[0_8px_18px_rgba(180,83,9,0.34)] dark:border-amber-500 dark:bg-amber-400 dark:text-slate-950',
    success:
        'border-emerald-700 bg-emerald-600 text-white shadow-[0_8px_18px_rgba(5,150,105,0.32)] dark:border-emerald-500 dark:bg-emerald-400 dark:text-slate-950',
};

const stageTopRightOverflowChipClassNameByTone: Record<StageTopRightChipTone, string> = {
    source: 'border-emerald-500 bg-emerald-300 text-slate-950 shadow-[0_5px_12px_rgba(5,150,105,0.18)] dark:border-emerald-500 dark:bg-emerald-300 dark:text-slate-950',
    branch: 'border-slate-400 bg-slate-300 text-slate-800 shadow-[0_5px_12px_rgba(71,85,105,0.16)] dark:border-slate-500 dark:bg-slate-300 dark:text-slate-950',
    divergence:
        'border-emerald-500 bg-emerald-300 text-slate-950 shadow-[0_5px_12px_rgba(5,150,105,0.18)] dark:border-emerald-500 dark:bg-emerald-300 dark:text-slate-950',
    warning:
        'border-amber-500 bg-amber-300 text-slate-950 shadow-[0_5px_12px_rgba(217,119,6,0.18)] dark:border-amber-500 dark:bg-amber-300 dark:text-slate-950',
    success:
        'border-emerald-500 bg-emerald-300 text-slate-950 shadow-[0_5px_12px_rgba(5,150,105,0.18)] dark:border-emerald-500 dark:bg-emerald-300 dark:text-slate-950',
};

const stageTopRightVisibleActionClassNameByEmphasis: Record<
    Exclude<StageTopRightActionEmphasis, 'destructive'>,
    string
> = {
    primary:
        'border-amber-500 bg-amber-300 text-slate-950 hover:border-amber-600 hover:bg-amber-400 dark:border-amber-600 dark:bg-amber-500 dark:text-white dark:hover:border-amber-500 dark:hover:bg-amber-400',
    secondary:
        'border-gray-300 bg-gray-200 text-gray-800 hover:border-gray-400 hover:bg-gray-300 dark:border-gray-500 dark:bg-gray-600 dark:text-white dark:hover:border-gray-400 dark:hover:bg-gray-500',
    passive:
        'cursor-default border-gray-300 bg-gray-200 text-gray-700 dark:border-gray-500 dark:bg-gray-600 dark:text-white',
};

const stageTopRightOverflowTriggerClassName =
    'inline-flex h-7 w-7 cursor-pointer list-none items-center justify-center rounded-full border border-gray-300 bg-gray-200 text-sm font-semibold text-gray-800 transition-colors hover:border-gray-400 hover:bg-gray-300 dark:border-gray-500 dark:bg-gray-600 dark:text-white dark:hover:border-gray-400 dark:hover:bg-gray-500 [&::-webkit-details-marker]:hidden';

const stageTopRightOverflowMenuClassName =
    'absolute right-0 top-full mt-2 grid min-w-[220px] gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-700 dark:bg-slate-950';

const resolveStageOverflowActionClassName = (action: StageTopRightAction) =>
    action.emphasis === 'destructive'
        ? 'text-rose-700 hover:bg-rose-50 dark:text-rose-700 dark:hover:bg-rose-50'
        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800/70';

const resolveStageOverflowChipClassName = (chip: StageTopRightChip) =>
    `inline-flex w-fit items-center rounded-full border px-2 py-1 text-[10px] font-semibold leading-none whitespace-nowrap ${stageTopRightOverflowChipClassNameByTone[chip.tone]}`;

const GeneratedImage: React.FC<GeneratedImageProps> = ({
    imageUrls,
    isLoading,
    prompt,
    error,
    settings,
    batchSize,
    generationMode = 'Text to Image',
    onUpload,
    onClear,
    onSelectImage,
    selectedImageUrl,
    currentLanguage = 'en' as Language,
    currentLog = '',
    onOpenViewer,
    stageTopRight,
}) => {
    const resolvedBatchSize = batchSize ?? settings?.batchSize;

    const t = (key: string) => getTranslation(currentLanguage, key);

    const activeImage = selectedImageUrl || (imageUrls.length > 0 ? imageUrls[0] : '');

    // Show full loading screen ONLY if we are loading AND we have no images yet
    const showFullLoading = isLoading && imageUrls.length === 0;

    // Calculate Progress
    const totalBatch = resolvedBatchSize || 1;
    const currentCount = imageUrls.length;
    // If loading, we are working on the next one (current + 1), capped at total
    const processingIndex = Math.min(currentCount + 1, totalBatch);

    // Helper for mode colors
    const getModeColor = (mode: string) => {
        // Inpaint / Retouch
        if (mode.includes('Inpaint') || mode.includes('Retouch')) {
            return 'text-pink-600 dark:text-pink-300 border-pink-300 dark:border-pink-500/30 bg-pink-50 dark:bg-pink-500/10 shadow-pink-500/20';
        }
        // Outpaint / Reframe (and catch-all for any legacy upscale labels)
        if (
            mode.includes('Outpaint') ||
            mode.includes('Reframe') ||
            mode.includes('Reposition') ||
            mode.includes('Upscale') ||
            mode.includes('Refine')
        ) {
            return 'text-blue-600 dark:text-blue-300 border-blue-300 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 shadow-blue-500/20';
        }
        return 'text-amber-600 dark:text-amber-300 border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 shadow-amber-500/20';
    };

    const getTranslatedMode = (mode: string) => {
        if (mode.includes('Inpaint') || mode.includes('Retouch')) {
            return t('modeInpaint');
        }
        // Consolidate all resizing/extending modes to Reframe (Outpaint)
        if (
            mode.includes('Outpaint') ||
            mode.includes('Reframe') ||
            mode.includes('Reposition') ||
            mode.includes('Upscale') ||
            mode.includes('Refine')
        ) {
            return t('modeOutpaint');
        }
        return mode;
    };

    const StageFrame = ({ children }: { children: React.ReactNode }) => (
        <div className="mx-auto flex h-full min-h-0 w-full flex-1 items-center justify-center">
            <div
                data-testid="generated-image-stage-frame"
                className="relative aspect-square w-full max-w-full xl:h-full xl:w-auto xl:max-h-full xl:max-w-full"
            >
                {children}
            </div>
        </div>
    );

    const StageTopRightCluster = () => {
        if (!stageTopRight || !activeImage) {
            return null;
        }

        return (
            <div
                data-testid="stage-top-right-cluster"
                className="pointer-events-none absolute left-3 right-3 top-3 z-30 flex flex-col items-end gap-2 sm:left-auto sm:right-4 sm:top-4"
            >
                {stageTopRight.contextChips.length > 0 ? (
                    <div
                        data-testid="stage-top-right-context-row"
                        className="pointer-events-auto flex w-full max-w-[240px] flex-wrap items-center justify-end gap-1.5 sm:max-w-[320px]"
                    >
                        {stageTopRight.contextChips.map((chip) => (
                            <span
                                key={chip.key}
                                data-testid={`stage-top-right-chip-${chip.key}`}
                                className={`inline-flex h-5 shrink-0 items-center rounded-full border px-2 text-[10px] font-semibold leading-none whitespace-nowrap ${stageTopRightChipClassNameByTone[chip.tone]}`}
                            >
                                {chip.label}
                            </span>
                        ))}
                    </div>
                ) : null}

                {stageTopRight.visibleActions.length > 0 ||
                stageTopRight.overflowActions.length > 0 ||
                stageTopRight.overflowContextChips.length > 0 ? (
                    <div
                        data-testid="stage-top-right-actions-row"
                        className="pointer-events-auto flex w-full max-w-[240px] items-center justify-end gap-2 sm:max-w-[320px]"
                    >
                        {stageTopRight.visibleActions.map((action) =>
                            action.emphasis === 'passive' ? (
                                <span
                                    key={action.key}
                                    data-testid={`stage-top-right-action-${action.key}`}
                                    className={`inline-flex h-7 shrink-0 items-center justify-center rounded-full border px-3 text-[11px] font-semibold whitespace-nowrap ${stageTopRightVisibleActionClassNameByEmphasis.passive}`}
                                >
                                    {action.label}
                                </span>
                            ) : (
                                <button
                                    key={action.key}
                                    type="button"
                                    data-testid={`stage-top-right-action-${action.key}`}
                                    onClick={action.onClick}
                                    className={`inline-flex h-7 shrink-0 items-center justify-center rounded-full border px-3 text-[11px] font-semibold whitespace-nowrap transition-colors ${stageTopRightVisibleActionClassNameByEmphasis[action.emphasis]}`}
                                >
                                    {action.label}
                                </button>
                            ),
                        )}

                        {stageTopRight.overflowActions.length > 0 || stageTopRight.overflowContextChips.length > 0 ? (
                            <details data-testid="stage-top-right-overflow" className="relative shrink-0">
                                <summary
                                    data-testid="stage-top-right-overflow-trigger"
                                    aria-label={t('stageActionMore')}
                                    title={t('stageActionMore')}
                                    className={stageTopRightOverflowTriggerClassName}
                                >
                                    •••
                                </summary>
                                <div
                                    data-testid="stage-top-right-overflow-menu"
                                    className={stageTopRightOverflowMenuClassName}
                                >
                                    {stageTopRight.overflowContextChips.length > 0 ? (
                                        <div
                                            data-testid="stage-top-right-overflow-context"
                                            className="mb-1 grid gap-1 border-b border-slate-200/80 pb-2 dark:border-slate-700/80"
                                        >
                                            {stageTopRight.overflowContextChips.map((chip) => (
                                                <span
                                                    key={chip.key}
                                                    data-testid={`stage-top-right-overflow-chip-${chip.key}`}
                                                    className={resolveStageOverflowChipClassName(chip)}
                                                >
                                                    {chip.label}
                                                </span>
                                            ))}
                                        </div>
                                    ) : null}
                                    {stageTopRight.overflowActions.map((action) => (
                                        <button
                                            key={action.key}
                                            type="button"
                                            data-testid={`stage-top-right-overflow-action-${action.key}`}
                                            onClick={action.onClick}
                                            className={`inline-flex w-full items-center justify-start rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors ${resolveStageOverflowActionClassName(action)}`}
                                        >
                                            {action.label}
                                        </button>
                                    ))}
                                </div>
                            </details>
                        ) : null}
                    </div>
                ) : null}
            </div>
        );
    };

    // --- FULL LOADING SCREEN (0 images yet) ---
    if (showFullLoading) {
        return (
            <div className="flex min-w-0 h-full w-full flex-col">
                <StageFrame>
                    <div className="nbu-stage-surface group relative flex h-full w-full flex-col items-center justify-center p-8">
                        <style>{`
          @keyframes scan {
            0% { top: 0%; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
          }
          .animate-scan {
            animation: scan 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          }
        `}</style>

                        {/* Cinematic Background Animation */}
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-200 via-gray-100 to-gray-50 dark:from-gray-900 dark:via-black dark:to-black animate-pulse opacity-50 dark:opacity-100"></div>
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent animate-[shimmer_2s_infinite]"></div>

                        <div className="z-10 flex w-full max-w-md scale-100 flex-col items-center transition-transform duration-500">
                            {/* Mode Badge */}
                            <div
                                className={`mb-8 px-4 py-1.5 rounded-full border text-xs font-bold uppercase tracking-[0.2em] shadow-lg animate-bounce ${getModeColor(generationMode)}`}
                            >
                                {getTranslatedMode(generationMode)}
                            </div>

                            <HexagonHUD
                                statusText={t('statusInitializing')}
                                progressPercent={(processingIndex / totalBatch) * 100}
                                logText={currentLog}
                            />

                            <div className="mt-4 text-xs font-mono text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                                {processingIndex} / {totalBatch}
                            </div>
                        </div>
                    </div>
                </StageFrame>
            </div>
        );
    }

    // --- ERROR STATE (For when a failed history item is selected) ---
    if (error && imageUrls.length === 0) {
        return (
            <div className="flex min-w-0 h-full w-full flex-col">
                <StageFrame>
                    <div className="nbu-stage-surface relative flex h-full w-full flex-col items-center justify-center p-8">
                        {/* Subtle Background Pattern for Errors */}
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#fee2e2_0%,_#f9fafb_70%)] dark:bg-[radial-gradient(circle_at_center,_#3f1010_0%,_#000000_70%)] opacity-50"></div>
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMWgydjJIMUMxeiIgZmlsbD0iIzQwMCIgZmlsbC1vcGFjaXR5PSIwLjEiLz48L3N2Zz4=')] opacity-5 dark:opacity-20"></div>

                        <div className="z-10 flex flex-col items-center text-center max-w-md animate-[fadeIn_0.5s_ease-out]">
                            {/* Beautiful Failure Icon */}
                            <div className="relative mb-8">
                                <div className="w-24 h-24 rounded-full bg-red-100 dark:bg-gradient-to-b dark:from-red-900/20 dark:to-transparent border border-red-200 dark:border-red-500/20 flex items-center justify-center shadow-[0_0_40px_rgba(220,38,38,0.1)]">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-10 w-10 text-red-500 dark:text-red-400 drop-shadow-md"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={1.5}
                                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                        />
                                    </svg>
                                </div>
                                {/* Glitch lines */}
                                <div className="absolute -left-4 top-10 w-8 h-px bg-red-400/30"></div>
                                <div className="absolute -right-4 top-14 w-8 h-px bg-red-400/30"></div>
                            </div>

                            <h3 className="text-xl font-bold text-red-700 dark:text-red-200 mb-2 tracking-tight">
                                {t('statusFailed')}
                            </h3>
                            <div className="h-px w-12 bg-red-300 dark:bg-red-500/30 mx-auto mb-4"></div>

                            <p className="text-sm text-red-800/80 dark:text-red-200/60 leading-relaxed bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-lg p-4 font-mono">
                                {error}
                            </p>

                            {onClear && (
                                <div className="mt-8">
                                    <Button
                                        onClick={onClear}
                                        variant="secondary"
                                        className="border-red-300 dark:border-red-900/30 hover:border-red-400 dark:hover:border-red-500/30 text-red-700 dark:text-red-300"
                                    >
                                        {t('clearResults')}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </StageFrame>
            </div>
        );
    }

    // --- EMPTY STATE ---
    if (!activeImage && !isLoading) {
        return (
            <div className="flex min-w-0 h-full w-full flex-col">
                <StageFrame>
                    <div className="nbu-empty-state-panel group relative flex h-full w-full flex-col items-center justify-center overflow-hidden border-2 border-dashed text-gray-500">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-200/50 dark:to-black/40 pointer-events-none"></div>

                        <div className="z-10 flex flex-col items-center text-center px-6">
                            <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-3xl border border-gray-200 bg-gradient-to-br from-white to-gray-100 shadow-xl transition-[transform,border-color,box-shadow] duration-500 group-hover:scale-110 group-hover:border-amber-500/40 group-hover:shadow-[0_0_30px_rgba(245,158,11,0.15)] dark:border-gray-800 dark:from-gray-900 dark:to-black dark:shadow-2xl">
                                <div className="absolute inset-0 bg-amber-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-pulse"></div>
                                <span className="text-5xl filter grayscale drop-shadow-lg transition-[filter] duration-500 group-hover:grayscale-0">
                                    🍌
                                </span>
                            </div>

                            <p className="font-extrabold text-2xl text-gray-800 dark:text-gray-200 mb-3 tracking-tight">
                                {t('readyTitle')}
                            </p>
                            <p className="max-w-sm text-center text-sm leading-relaxed font-light text-gray-500">
                                {t('readyDesc')}
                            </p>
                        </div>
                    </div>
                </StageFrame>
            </div>
        );
    }

    // --- MAIN DISPLAY (Result + Partial Loading/Scanning Effect) ---
    return (
        <div className="flex min-w-0 h-full w-full flex-col">
            {/* Main Image Display */}
            <StageFrame>
                <div className="nbu-stage-surface relative h-full w-full group shadow-2xl">
                    <StageTopRightCluster />

                    <img
                        src={activeImage}
                        alt={t('stageGeneratedImageAlt')}
                        className={`h-full w-full object-contain transition-transform duration-700 ease-out ${onOpenViewer ? 'cursor-zoom-in' : ''}`}
                        style={{ transform: 'scale(1)' }}
                        onClick={() => {
                            onOpenViewer?.();
                        }}
                    />
                </div>
            </StageFrame>
        </div>
    );
};

export default React.memo(GeneratedImage);
