import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Language, getTranslation } from '../utils/translations';
import {
    buildSavedImageLoadUrl,
    ensureReferencePreviewDataUrl,
    getReferencePreviewDataUrl,
} from '../utils/imageSaveUtils';

function UserIcon({ className = 'w-2.5 h-2.5' }: { className?: string }) {
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
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    );
}

function PaletteIcon({ className = 'w-2.5 h-2.5' }: { className?: string }) {
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
            <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
            <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
            <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
            <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
        </svg>
    );
}

function ImageIcon({ className = 'w-2.5 h-2.5' }: { className?: string }) {
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
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </svg>
    );
}

function AlertTriangleIcon({ className = 'w-3 h-3' }: { className?: string }) {
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
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    );
}

export interface ReferenceChipItem {
    id: string;
    tag: string;
    type: 'Obj' | 'Char' | 'Style';
    index: number; // 0-based
    displayIndex: number; // 1-based
    image: string;
}

export interface PromptReferenceChipsProps {
    objectImages?: string[];
    characterImages?: string[];
    styleImages?: string[];
    onInsertTag: (tag: string) => void;
    currentLanguage?: Language;
    disabled?: boolean;
}

export interface PromptReferencedBadgesProps {
    prompt: string;
    objectImages?: string[];
    characterImages?: string[];
    styleImages?: string[];
    onRemoveTag?: (tag: string) => void;
    onSelectTagInTextarea?: (tag: string) => void;
    currentLanguage?: Language;
    disabled?: boolean;
}

/**
 * Resolves immediate thumbnail source with cache fallback
 */
export const resolveDisplayReferenceImage = (image: string | undefined | null): string => {
    if (!image) {
        return '';
    }
    const cached = getReferencePreviewDataUrl(image);
    if (cached) {
        return cached;
    }
    if (
        image.startsWith('data:') ||
        image.startsWith('http://') ||
        image.startsWith('https://') ||
        image.startsWith('blob:')
    ) {
        return image;
    }
    return buildSavedImageLoadUrl(image);
};

interface ChipHoverTooltipProps {
    tag: string;
    label: string;
    imageSrc: string;
    hintText: string;
    align?: 'center' | 'left' | 'right';
    placement?: 'top' | 'bottom';
}

const ChipHoverTooltip: React.FC<ChipHoverTooltipProps> = React.memo(
    ({ tag, label, imageSrc, hintText, align = 'center', placement = 'bottom' }) => {
        const alignClassName =
            align === 'left' ? 'left-0' : align === 'right' ? 'right-0' : 'left-1/2 -translate-x-1/2';
        const placementClassName = placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2';
        const arrowAlignClassName =
            align === 'left' ? 'left-5' : align === 'right' ? 'right-5' : 'left-1/2 -translate-x-1/2';
        const arrowPositionClassName = placement === 'top' ? '-bottom-1 border-b border-r' : '-top-1 border-l border-t';

        return (
            <div
                role="tooltip"
                data-testid={`reference-tag-tooltip-${tag}`}
                className={`pointer-events-none absolute ${placementClassName} ${alignClassName} z-40 flex flex-col items-center rounded-xl border border-slate-200/90 bg-white/95 p-2 shadow-2xl backdrop-blur-md transition-all dark:border-slate-700/90 dark:bg-slate-900/95`}
                style={{ width: '110px' }}
            >
                <div className="relative mb-1.5 h-20 w-20 overflow-hidden rounded-lg border border-slate-200/70 bg-slate-100 shadow-inner dark:border-slate-700/60 dark:bg-slate-800">
                    {imageSrc ? (
                        <img
                            src={imageSrc}
                            alt={tag}
                            className="h-full w-full object-cover"
                            loading="eager"
                            decoding="async"
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">
                            ...
                        </div>
                    )}
                </div>
                <div className="w-full text-center">
                    <span className="block font-mono text-[11px] font-bold text-slate-800 dark:text-slate-100">
                        {tag}
                    </span>
                    <span className="block truncate text-[10px] text-slate-500 dark:text-slate-400">{label}</span>
                    <span className="mt-0.5 block text-[9px] text-amber-600 dark:text-amber-400 font-medium">
                        {hintText}
                    </span>
                </div>
                <div
                    className={`absolute ${arrowPositionClassName} ${arrowAlignClassName} h-2 w-2 rotate-45 border-slate-200/90 bg-white/95 dark:border-slate-700/90 dark:bg-slate-900/95`}
                />
            </div>
        );
    },
);
ChipHoverTooltip.displayName = 'ChipHoverTooltip';

/**
 * PromptReferenceChips:
 * Displays quick-insert tag buttons for all currently uploaded reference images
 * with lightweight thumbnail avatars and hover preview cards.
 */
export const PromptReferenceChips: React.FC<PromptReferenceChipsProps> = ({
    objectImages = [],
    characterImages = [],
    styleImages = [],
    onInsertTag,
    currentLanguage = 'en' as Language,
    disabled = false,
}) => {
    const [hoveredTag, setHoveredTag] = useState<string | null>(null);
    const [, setPreviewVersion] = useState(0);

    const isZh = currentLanguage.startsWith('zh');
    const objectLabel = getTranslation(currentLanguage, 'objectRefs') || (isZh ? '物件參考' : 'Object Reference');
    const characterLabel =
        getTranslation(currentLanguage, 'characterRefs') || (isZh ? '角色參考' : 'Character Reference');
    const styleLabel = getTranslation(currentLanguage, 'styleRefs') || (isZh ? '風格參考' : 'Style Reference');
    const insertHint = isZh ? '點擊插入提示詞' : 'Click to insert';

    // Synchronize lightweight cached thumbnails for images
    useEffect(() => {
        const allImages = [...objectImages, ...characterImages, ...styleImages];
        const missing = Array.from(new Set(allImages)).filter((img) => img && !getReferencePreviewDataUrl(img));

        if (missing.length === 0) {
            return undefined;
        }

        let cancelled = false;
        void (async () => {
            for (const img of missing) {
                const hadPreview = getReferencePreviewDataUrl(img);
                await ensureReferencePreviewDataUrl(img);
                if (cancelled) return;
                if (!hadPreview && getReferencePreviewDataUrl(img)) {
                    setPreviewVersion((v) => v + 1);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [objectImages, characterImages, styleImages]);

    const chipItems: ReferenceChipItem[] = useMemo(() => {
        const items: ReferenceChipItem[] = [];

        objectImages.forEach((image, index) => {
            if (!image) return;
            items.push({
                id: `Obj_${index + 1}`,
                tag: `[Obj_${index + 1}]`,
                type: 'Obj',
                index,
                displayIndex: index + 1,
                image,
            });
        });

        characterImages.forEach((image, index) => {
            if (!image) return;
            items.push({
                id: `Char_${index + 1}`,
                tag: `[Char_${index + 1}]`,
                type: 'Char',
                index,
                displayIndex: index + 1,
                image,
            });
        });

        styleImages.forEach((image, index) => {
            if (!image) return;
            items.push({
                id: `Style_${index + 1}`,
                tag: `[Style_${index + 1}]`,
                type: 'Style',
                index,
                displayIndex: index + 1,
                image,
            });
        });

        return items;
    }, [objectImages, characterImages, styleImages]);

    if (chipItems.length === 0) {
        return null;
    }

    return (
        <div data-testid="composer-reference-chips" className="flex min-w-0 flex-wrap items-center gap-1.5 py-1">
            <span className="shrink-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {isZh ? '參考圖快捷標籤:' : 'Reference Tags:'}
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
                {chipItems.map((item, itemIdx) => {
                    const isHovered = hoveredTag === item.tag;
                    const displayImage = resolveDisplayReferenceImage(item.image);
                    const isChar = item.type === 'Char';
                    const isStyle = item.type === 'Style';
                    const labelText = `${isChar ? characterLabel : isStyle ? styleLabel : objectLabel} ${item.displayIndex}`;

                    return (
                        <div
                            key={item.tag}
                            className="relative inline-flex"
                            onMouseEnter={() => setHoveredTag(item.tag)}
                            onMouseLeave={() => setHoveredTag(null)}
                            onPointerEnter={() => setHoveredTag(item.tag)}
                            onPointerLeave={() => setHoveredTag(null)}
                        >
                            <button
                                type="button"
                                data-testid={`composer-reference-chip-${item.tag}`}
                                disabled={disabled}
                                onClick={() => onInsertTag(item.tag)}
                                onFocus={() => setHoveredTag(item.tag)}
                                onBlur={() => setHoveredTag(null)}
                                aria-label={`${labelText}: ${item.tag}`}
                                className={`group inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-mono font-medium transition-all focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-50 ${
                                    isChar
                                        ? 'border-fuchsia-200/90 bg-fuchsia-50/90 text-fuchsia-800 hover:border-fuchsia-300 hover:bg-fuchsia-100 hover:shadow-sm dark:border-fuchsia-500/30 dark:bg-fuchsia-950/30 dark:text-fuchsia-200 dark:hover:border-fuchsia-400/50 dark:hover:bg-fuchsia-950/50'
                                        : isStyle
                                          ? 'border-amber-200/90 bg-amber-50/90 text-amber-800 hover:border-amber-300 hover:bg-amber-100 hover:shadow-sm dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-200 dark:hover:border-amber-400/50 dark:hover:bg-amber-950/50'
                                          : 'border-sky-200/90 bg-sky-50/90 text-sky-800 hover:border-sky-300 hover:bg-sky-100 hover:shadow-sm dark:border-sky-500/30 dark:bg-sky-950/30 dark:text-sky-200 dark:hover:border-sky-400/50 dark:hover:bg-sky-950/50'
                                }`}
                            >
                                <span className="relative flex h-4 w-4 shrink-0 overflow-hidden rounded-full border border-black/10 dark:border-white/20">
                                    {displayImage ? (
                                        <img
                                            src={displayImage}
                                            alt={item.tag}
                                            className="h-full w-full object-cover"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <span className="flex h-full w-full items-center justify-center bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                                            {isChar ? (
                                                <UserIcon className="h-2.5 w-2.5" />
                                            ) : isStyle ? (
                                                <PaletteIcon className="h-2.5 w-2.5" />
                                            ) : (
                                                <ImageIcon className="h-2.5 w-2.5" />
                                            )}
                                        </span>
                                    )}
                                </span>
                                <span className="font-bold">{item.tag}</span>
                                <span className="opacity-60 transition-opacity group-hover:opacity-100 font-sans text-[10px]">
                                    +
                                </span>
                            </button>

                            {isHovered && (
                                <ChipHoverTooltip
                                    tag={item.tag}
                                    label={labelText}
                                    imageSrc={displayImage}
                                    hintText={insertHint}
                                    align={itemIdx === 0 ? 'left' : 'center'}
                                    placement="bottom"
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

/**
 * PromptReferencedBadges:
 * Automatically scans the prompt text for `[Obj_N]` and `[Char_N]` tags.
 * Displays referenced tags with hover image preview, and highlights orphan/invalid tags.
 */
export const PromptReferencedBadges: React.FC<PromptReferencedBadgesProps> = ({
    prompt,
    objectImages = [],
    characterImages = [],
    styleImages = [],
    onRemoveTag,
    onSelectTagInTextarea,
    currentLanguage = 'en' as Language,
    disabled = false,
}) => {
    const [hoveredTag, setHoveredTag] = useState<string | null>(null);

    const isZh = currentLanguage.startsWith('zh');
    const objectLabel = getTranslation(currentLanguage, 'objectRefs') || (isZh ? '物件參考' : 'Object Reference');
    const characterLabel =
        getTranslation(currentLanguage, 'characterRefs') || (isZh ? '角色參考' : 'Character Reference');
    const styleLabel = getTranslation(currentLanguage, 'styleRefs') || (isZh ? '風格參考' : 'Style Reference');
    const referencedTitle = isZh ? '提示詞已引用:' : 'Prompt cited:';
    const notUploadedTitle = isZh ? '未上傳' : 'Not uploaded';
    const removeTitle = isZh ? '從提示詞移除' : 'Remove from prompt';

    const citedTags = useMemo(() => {
        if (!prompt) return [];
        const matches = prompt.match(/\[(Char|Obj|Style)_[1-9]\d*\]/g) || [];
        const unique = Array.from(new Set(matches));

        return unique.map((tag) => {
            const parsed = tag.match(/\[(Char|Obj|Style)_([1-9]\d*)\]/);
            if (!parsed) {
                return { tag, type: 'Obj' as const, index: 0, isValid: false, image: '' };
            }
            const type = parsed[1] as 'Char' | 'Obj' | 'Style';
            const index = parseInt(parsed[2], 10) - 1;

            if (type === 'Char') {
                const isValid = index >= 0 && index < characterImages.length && Boolean(characterImages[index]);
                return {
                    tag,
                    type,
                    index,
                    displayIndex: index + 1,
                    isValid,
                    image: isValid ? characterImages[index] : '',
                };
            }

            if (type === 'Style') {
                const isValid = index >= 0 && index < styleImages.length && Boolean(styleImages[index]);
                return {
                    tag,
                    type,
                    index,
                    displayIndex: index + 1,
                    isValid,
                    image: isValid ? styleImages[index] : '',
                };
            }

            const isValid = index >= 0 && index < objectImages.length && Boolean(objectImages[index]);
            return {
                tag,
                type,
                index,
                displayIndex: index + 1,
                isValid,
                image: isValid ? objectImages[index] : '',
            };
        });
    }, [prompt, objectImages, characterImages, styleImages]);

    if (citedTags.length === 0) {
        return null;
    }

    const hasAnyOrphan = citedTags.some((c) => !c.isValid);

    return (
        <div
            data-testid="composer-referenced-badges-bar"
            className="flex min-w-0 flex-wrap items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50/70 px-2 py-1 dark:border-slate-800/80 dark:bg-slate-900/60"
        >
            <span className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3 text-slate-400">
                    <path
                        fillRule="evenodd"
                        d="M15.621 4.379a3 3 0 00-4.242 0l-7 7a3 3 0 004.241 4.243h.001l.497-.5a.75.75 0 011.064 1.057l-.498.501-.002.002a4.5 4.5 0 01-6.364-6.364l7-7a4.5 4.5 0 016.368 6.36l-3.455 3.553A2.625 2.625 0 119.5 9.525l3.45-3.451a.75.75 0 111.061 1.06l-3.45 3.451a1.125 1.125 0 001.587 1.595l3.454-3.553a3 3 0 000-4.248z"
                        clipRule="evenodd"
                    />
                </svg>
                {referencedTitle}
            </span>

            <div className="flex flex-wrap items-center gap-1">
                {citedTags.map((item) => {
                    const isHovered = hoveredTag === item.tag;
                    const displayImage = item.isValid ? resolveDisplayReferenceImage(item.image) : '';
                    const isChar = item.type === 'Char';
                    const isStyle = item.type === 'Style';
                    const labelText = item.isValid
                        ? `${isChar ? characterLabel : isStyle ? styleLabel : objectLabel} ${item.displayIndex}`
                        : `${item.tag} (${notUploadedTitle})`;

                    if (!item.isValid) {
                        return (
                            <div
                                key={item.tag}
                                className="inline-flex items-center gap-1 rounded-md border border-amber-300/80 bg-amber-50 px-1.5 py-0.5 font-mono text-[10px] text-amber-800 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-200"
                                data-testid={`composer-orphan-tag-${item.tag}`}
                            >
                                <span title={labelText} className="inline-flex items-center gap-1">
                                    <AlertTriangleIcon className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                                    <span>{item.tag}</span>
                                </span>
                                <span className="text-[9px] opacity-75 font-sans">({notUploadedTitle})</span>
                                {onRemoveTag && (
                                    <button
                                        type="button"
                                        disabled={disabled}
                                        aria-label={`${removeTitle} ${item.tag}`}
                                        title={`${removeTitle} ${item.tag}`}
                                        onClick={() => onRemoveTag(item.tag)}
                                        className="ml-0.5 rounded p-0.5 text-amber-600 hover:bg-amber-200 hover:text-amber-950 focus:outline-none dark:text-amber-400 dark:hover:bg-amber-900/60 dark:hover:text-amber-100"
                                    >
                                        <svg className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
                                            <path
                                                fillRule="evenodd"
                                                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        );
                    }

                    return (
                        <div
                            key={item.tag}
                            className="relative inline-flex"
                            onMouseEnter={() => setHoveredTag(item.tag)}
                            onMouseLeave={() => setHoveredTag(null)}
                            onPointerEnter={() => setHoveredTag(item.tag)}
                            onPointerLeave={() => setHoveredTag(null)}
                        >
                            <button
                                type="button"
                                data-testid={`composer-cited-badge-${item.tag}`}
                                onClick={() => onSelectTagInTextarea?.(item.tag)}
                                onFocus={() => setHoveredTag(item.tag)}
                                onBlur={() => setHoveredTag(null)}
                                aria-label={`${labelText}: ${item.tag}`}
                                className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[10px] transition-colors focus:outline-none focus:ring-1 focus:ring-amber-400 ${
                                    isChar
                                        ? 'border-fuchsia-200/90 bg-fuchsia-50/70 text-fuchsia-700 hover:bg-fuchsia-100 dark:border-fuchsia-500/25 dark:bg-fuchsia-950/25 dark:text-fuchsia-300 dark:hover:bg-fuchsia-950/40'
                                        : isStyle
                                          ? 'border-amber-200/90 bg-amber-50/70 text-amber-700 hover:bg-amber-100 dark:border-amber-500/25 dark:bg-amber-950/25 dark:text-amber-300 dark:hover:bg-amber-950/40'
                                          : 'border-sky-200/90 bg-sky-50/70 text-sky-700 hover:bg-sky-100 dark:border-sky-500/25 dark:bg-sky-950/25 dark:text-sky-300 dark:hover:bg-sky-950/40'
                                }`}
                            >
                                <span className="relative flex h-3.5 w-3.5 shrink-0 overflow-hidden rounded-full border border-black/10 dark:border-white/20">
                                    {displayImage ? (
                                        <img
                                            src={displayImage}
                                            alt={item.tag}
                                            className="h-full w-full object-cover"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <span className="flex h-full w-full items-center justify-center bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                                            {isChar ? (
                                                <UserIcon className="h-2.5 w-2.5" />
                                            ) : (
                                                <ImageIcon className="h-2.5 w-2.5" />
                                            )}
                                        </span>
                                    )}
                                </span>
                                <span>{item.tag}</span>
                            </button>

                            {isHovered && (
                                <ChipHoverTooltip
                                    tag={item.tag}
                                    label={labelText}
                                    imageSrc={displayImage}
                                    hintText={isZh ? '提示詞中引用' : 'Referenced in prompt'}
                                    placement="top"
                                />
                            )}
                        </div>
                    );
                })}
            </div>

            {hasAnyOrphan && onRemoveTag && (
                <button
                    type="button"
                    data-testid="composer-clean-all-orphans"
                    onClick={() => {
                        citedTags.filter((c) => !c.isValid).forEach((c) => onRemoveTag(c.tag));
                    }}
                    className="ml-auto text-[10px] text-amber-700 underline hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100"
                >
                    {isZh ? '清理失效標籤' : 'Clean invalid tags'}
                </button>
            )}
        </div>
    );
};

export default PromptReferenceChips;
