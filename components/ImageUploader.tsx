import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Language, getTranslation } from '../utils/translations';
import {
    ensureReferencePreviewDataUrl,
    getReferencePreviewDataUrl,
    prepareImagePreviewAssetFromFile,
} from '../utils/imageSaveUtils';
import LazyHistoryImage from './LazyHistoryImage';

interface ImageUploaderProps {
    images: string[];
    onImagesChange: (images: string[]) => void;
    disabled?: boolean;
    label?: string;
    currentLanguage?: Language;
    onWarning?: (message: string) => void;
    maxImages?: number;
    limitWarningMsg?: string; // New prop for custom limit message
    safeLimit?: number; // Visual indicator for "safe" amount of images
    onLaunchSketch?: () => void; // Renamed prop to trigger sketch pad
    onRemove?: (index: number) => void; // Add this prop
    prefixTag?: string; // e.g. "Obj", "Char"
    hideHeader?: boolean; // Hide the label+count header row
    gridColumns?: 3 | 5;
    lazyMountImages?: boolean;
}

type ImageUploaderGridItemProps = {
    displayImage: string | null;
    imageAlt: string;
    index: number;
    disabled?: boolean;
    isDenseGrid: boolean;
    isSafe: boolean;
    isDragged: boolean;
    displayLabel: string;
    lazyMountImages: boolean;
    onRemove: (index: number) => void;
    onDragStart: (event: React.DragEvent, index: number) => void;
    onDragOver: (event: React.DragEvent) => void;
    onDrop: (event: React.DragEvent, index: number) => void;
    onDragEnd: () => void;
};

const ImageUploaderGridItem = React.memo(function ImageUploaderGridItem({
    displayImage,
    imageAlt,
    index,
    disabled,
    isDenseGrid,
    isSafe,
    isDragged,
    displayLabel,
    lazyMountImages,
    onRemove,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
}: ImageUploaderGridItemProps) {
    const handleDragStart = useCallback(
        (event: React.DragEvent) => {
            onDragStart(event, index);
        },
        [index, onDragStart],
    );
    const handleDrop = useCallback(
        (event: React.DragEvent) => {
            onDrop(event, index);
        },
        [index, onDrop],
    );
    const handleRemoveClick = useCallback(() => {
        onRemove(index);
    }, [index, onRemove]);
    const imageClassName = 'h-full w-full object-cover pointer-events-none';
    const placeholderClassName = isSafe
        ? 'h-full w-full bg-emerald-100/80 dark:bg-emerald-950/35'
        : 'h-full w-full bg-slate-100 dark:bg-slate-800/70';
    const placeholderTestId = `image-uploader-thumbnail-placeholder-${index}`;
    const imageTestId = `image-uploader-thumbnail-${index}`;

    return (
        <div
            draggable={!disabled}
            onDragStart={handleDragStart}
            onDragOver={onDragOver}
            onDrop={handleDrop}
            onDragEnd={onDragEnd}
            className={`relative group aspect-square ${isDenseGrid ? 'rounded-[10px]' : 'rounded-lg'} overflow-hidden border transition-all duration-300 ${!disabled ? 'cursor-grab active:cursor-grabbing' : ''}
                ${
                    isSafe
                        ? 'border-emerald-500/30 bg-emerald-50 dark:bg-emerald-900/10 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
                }
                ${isDragged ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}`}
        >
            {!displayImage ? (
                <div data-testid={placeholderTestId} className={placeholderClassName} />
            ) : lazyMountImages ? (
                <LazyHistoryImage
                    src={displayImage}
                    alt={imageAlt}
                    wrapperClassName="h-full w-full"
                    className={imageClassName}
                    placeholderClassName={placeholderClassName}
                    rootMargin="220px"
                    dataTestId={imageTestId}
                    placeholderTestId={placeholderTestId}
                />
            ) : (
                <img
                    src={displayImage}
                    alt={imageAlt}
                    className={imageClassName}
                    loading="lazy"
                    decoding="async"
                    data-testid={imageTestId}
                />
            )}

            <div
                className={`absolute top-1 left-1 backdrop-blur-[4px] ${isDenseGrid ? 'px-1 py-0.5 text-[8px]' : 'px-1.5 py-0.5 text-[9px]'} rounded font-mono border
                ${
                    isSafe
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-100 border-emerald-500/30'
                        : 'bg-white/70 dark:bg-black/70 text-gray-800 dark:text-white border-white/10'
                }`}
            >
                {displayLabel}
            </div>

            <button
                type="button"
                onClick={handleRemoveClick}
                disabled={disabled}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-red-400 drop-shadow-lg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                >
                    <path
                        fillRule="evenodd"
                        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                        clipRule="evenodd"
                    />
                </svg>
            </button>
        </div>
    );
});

const ImageUploader: React.FC<ImageUploaderProps> = ({
    images,
    onImagesChange,
    disabled,
    label,
    currentLanguage = 'en' as Language,
    onWarning,
    maxImages = 5,
    limitWarningMsg,
    safeLimit,
    onLaunchSketch,
    onRemove,
    prefixTag,
    hideHeader,
    gridColumns = 3,
    lazyMountImages = false,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [previewVersion, setPreviewVersion] = useState(0);

    const t = useCallback((key: string) => getTranslation(currentLanguage, key), [currentLanguage]);
    const resolvedLabel = label || t('references');
    const isDenseGrid = gridColumns === 5;
    const gridClassName = isDenseGrid ? 'grid-cols-5 gap-1.5' : 'grid-cols-3 gap-2';

    useEffect(() => {
        const missingPreviewImages = Array.from(new Set(images)).filter((image) => !getReferencePreviewDataUrl(image));

        if (missingPreviewImages.length === 0) {
            return undefined;
        }

        let cancelled = false;

        void (async () => {
            for (const image of missingPreviewImages) {
                const previewBefore = getReferencePreviewDataUrl(image);
                await ensureReferencePreviewDataUrl(image);

                if (cancelled) {
                    return;
                }

                if (!previewBefore && getReferencePreviewDataUrl(image)) {
                    setPreviewVersion((version) => version + 1);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [images]);

    const imageEntries = useMemo(() => {
        const keyCounts = new Map<string, number>();

        return images.map((image, index) => {
            const occurrence = (keyCounts.get(image) ?? 0) + 1;
            keyCounts.set(image, occurrence);

            return {
                displayImage: getReferencePreviewDataUrl(image) ?? null,
                image,
                index,
                key: occurrence === 1 ? image : `${image}::${occurrence}`,
            };
        });
    }, [images, previewVersion]);

    const processFiles = useCallback(
        async (files: File[]) => {
            const validFiles = files.filter((file) => file.type.startsWith('image/'));
            if (validFiles.length === 0) {
                return;
            }

            const remainingSlots = maxImages - images.length;
            if (remainingSlots <= 0) {
                onWarning?.(limitWarningMsg || t('errorMaxRefs').replace('{0}', maxImages.toString()));
                return;
            }

            if (validFiles.length > remainingSlots) {
                onWarning?.(limitWarningMsg || t('errorMaxRefs').replace('{0}', maxImages.toString()));
            }

            const filesToProcess = validFiles.slice(0, remainingSlots);

            try {
                const preparedImages = await Promise.all(
                    filesToProcess.map((file) => prepareImagePreviewAssetFromFile(file)),
                );
                onImagesChange([...images, ...preparedImages.map((prepared) => prepared.dataUrl)]);
                if (preparedImages.some((prepared) => prepared.wasResized)) {
                    onWarning?.(t('msgImageResized'));
                }
            } catch {
                onWarning?.(t('errInvalidImage'));
            }
        },
        [images, limitWarningMsg, maxImages, onImagesChange, onWarning, t],
    );

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            void processFiles(Array.from(e.target.files));
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, [processFiles]);

    const removeImage = useCallback((indexToRemove: number) => {
        if (onRemove) {
            onRemove(indexToRemove);
        } else {
            onImagesChange(images.filter((_, index) => index !== indexToRemove));
        }
    }, [images, onImagesChange, onRemove]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
    }, [disabled]);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (disabled) return;

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            void processFiles(Array.from(e.dataTransfer.files));
        }
    }, [disabled, processFiles]);

    const handleItemDragStart = useCallback((e: React.DragEvent, index: number) => {
        e.stopPropagation();
        if (disabled) return;
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    }, [disabled]);

    const handleItemDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }, []);

    const handleItemDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        e.stopPropagation();
        if (disabled || draggedIndex === null || draggedIndex === dropIndex) {
            setDraggedIndex(null);
            return;
        }

        const newImages = [...images];
        const [movedItem] = newImages.splice(draggedIndex, 1);
        newImages.splice(dropIndex, 0, movedItem);

        onImagesChange(newImages);
        setDraggedIndex(null);
    }, [disabled, draggedIndex, images, onImagesChange]);

    const handleItemDragEnd = useCallback(() => {
        setDraggedIndex(null);
    }, []);

    return (
        <div className="space-y-1.5 relative">
            {!hideHeader && (
                <div className="flex justify-between items-end">
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {resolvedLabel}
                        </label>
                        {onLaunchSketch && (
                            <button
                                onClick={onLaunchSketch}
                                disabled={disabled}
                                className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-[9px] font-bold border border-amber-200 dark:border-amber-500/30 transition-all"
                                title={t('sketchTitle')}
                            >
                                <span className="text-[10px]">✏️</span> {t('btnSketch')}
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <span
                            className={`text-[10px] ${images.length >= maxImages ? 'text-red-500 dark:text-red-400' : 'text-gray-500'}`}
                        >
                            {images.length} / {maxImages}
                        </span>
                    </div>
                </div>
            )}

            <div className={`grid ${gridClassName} ${images.length > 0 ? 'mb-2' : ''}`}>
                {imageEntries.map(({ displayImage, image, index, key }) => {
                    const isSafe = safeLimit !== undefined && index < safeLimit;

                    return (
                        <ImageUploaderGridItem
                            key={key}
                            displayImage={displayImage}
                            imageAlt={`Ref ${index + 1}`}
                            index={index}
                            disabled={disabled}
                            isDenseGrid={isDenseGrid}
                            isSafe={isSafe}
                            isDragged={draggedIndex === index}
                            displayLabel={prefixTag ? `[${prefixTag}_${index + 1}]` : `${t('uploadRefIndex')} ${index + 1}`}
                            lazyMountImages={lazyMountImages}
                            onRemove={removeImage}
                            onDragStart={handleItemDragStart}
                            onDragOver={handleItemDragOver}
                            onDrop={handleItemDrop}
                            onDragEnd={handleItemDragEnd}
                        />
                    );
                })}

                {images.length > 0 && images.length < maxImages && (
                    <button
                        type="button"
                        onClick={() => !disabled && fileInputRef.current?.click()}
                        disabled={disabled}
                        className={`aspect-square ${isDenseGrid ? 'rounded-[10px]' : 'rounded-lg'} border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500 transition-all flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300`}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className={isDenseGrid ? 'h-4 w-4' : 'h-5 w-5'}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        {!isDenseGrid ? <span className="mt-1 text-[9px] font-medium">{t('uploadAdd')}</span> : null}
                    </button>
                )}
            </div>

            {images.length === 0 && (
                <div
                    onClick={() => !disabled && fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`
            border-2 border-dashed rounded-xl p-3 transition-all flex flex-col items-center justify-center gap-1.5 min-h-[60px]
            ${disabled ? 'opacity-50 cursor-not-allowed border-gray-300 dark:border-gray-800' : 'cursor-pointer'}
            ${
                isDragging
                    ? 'border-yellow-500 bg-yellow-500/10'
                    : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/30 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-gray-400 dark:hover:border-gray-600'
            }
          `}
                >
                    <div
                        className={`p-1.5 rounded-full ${isDragging ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'}`}
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
                                strokeWidth={1.5}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                        </svg>
                    </div>
                    <div className="text-center">
                        <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300">
                            {resolvedLabel}
                        </p>
                    </div>
                </div>
            )}

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                multiple
                className="hidden"
                disabled={disabled}
            />
        </div>
    );
};

export default ImageUploader;
