import React, { useCallback, useRef, useState } from 'react';
import { VideoReferenceItem } from '../types';
import { getTranslation, Language } from '../utils/translations';
import {
    formatVideoFileSize,
    parseYouTubeVideoReferenceUrl,
    validateLocalVideoFile,
    VIDEO_FILE_ACCEPT_ATTR,
} from '../utils/videoReferenceUtils';

export interface VideoReferenceUploaderProps {
    videoReference: VideoReferenceItem | null;
    onVideoReferenceChange: (next: VideoReferenceItem | null) => void;
    onUploadVideoFile?: (file: File, signal: AbortSignal) => Promise<VideoReferenceItem>;
    onWarning?: (message: string) => void;
    isUploading?: boolean;
    onCancelUpload?: () => void;
    disabled?: boolean;
    currentLanguage?: Language;
    compact?: boolean;
}

function FilmIcon({ className = 'h-4 w-4' }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <rect width="20" height="20" x="2" y="2" rx="2.18" ry="2.18" />
            <line x1="7" x2="7" y1="2" y2="22" />
            <line x1="17" x2="17" y1="2" y2="22" />
            <line x1="2" x2="22" y1="12" y2="12" />
            <line x1="2" x2="7" y1="7" y2="7" />
            <line x1="2" x2="7" y1="17" y2="17" />
            <line x1="17" x2="22" y1="7" y2="7" />
            <line x1="17" x2="22" y1="17" y2="17" />
        </svg>
    );
}

function YouTubeIcon({ className = 'h-4 w-4' }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
        >
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
    );
}

function DismissIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
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
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    );
}

function SpinnerIcon({ className = 'h-4 w-4' }: { className?: string }) {
    return (
        <svg
            className={`${className} animate-spin`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
        >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647Z"
            />
        </svg>
    );
}

export const VideoReferenceUploader: React.FC<VideoReferenceUploaderProps> = ({
    videoReference,
    onVideoReferenceChange,
    onUploadVideoFile,
    onWarning,
    isUploading: isUploadingProp,
    onCancelUpload,
    disabled = false,
    currentLanguage = 'en',
    compact = false,
}) => {
    const t = useCallback((key: string) => getTranslation(currentLanguage, key), [currentLanguage]);

    const [activeTab, setActiveTab] = useState<'upload' | 'youtube'>('upload');
    const [youtubeUrlInput, setYoutubeUrlInput] = useState('');
    const [localIsUploading, setLocalIsUploading] = useState(false);
    const [thumbnailError, setThumbnailError] = useState(false);

    const isControlledUploading = isUploadingProp !== undefined;
    const isUploading = isControlledUploading ? isUploadingProp : localIsUploading;
    const isControlledUploadingRef = useRef(isControlledUploading);
    isControlledUploadingRef.current = isControlledUploading;

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    React.useEffect(() => {
        return () => {
            if (!isControlledUploadingRef.current) {
                abortControllerRef.current?.abort();
            }
        };
    }, []);

    const handleFileSelected = async (file: File) => {
        if (!file) return;

        const validation = validateLocalVideoFile(file);
        if (!validation.ok) {
            if (validation.errorCode === 'empty_file') {
                onWarning?.(t('videoRefErrorEmptyFile'));
            } else if (validation.errorCode === 'file_too_large') {
                onWarning?.(t('videoRefErrorTooLarge'));
            } else {
                onWarning?.(t('videoRefErrorUnsupportedMime'));
            }
            return;
        }

        if (!onUploadVideoFile) {
            onWarning?.('Video upload handler is not configured.');
            return;
        }

        abortControllerRef.current?.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setLocalIsUploading(true);
        try {
            const uploadedItem = await onUploadVideoFile(file, controller.signal);
            if (!controller.signal.aborted) {
                if (!isControlledUploadingRef.current) {
                    onVideoReferenceChange(uploadedItem);
                }
                setThumbnailError(false);
            }
        } catch (err: any) {
            if (
                controller.signal.aborted ||
                err?.name === 'AbortError' ||
                err?.message === 'ABORTED'
            ) {
                return;
            }
            const msg = err?.message || t('videoRefErrorUploadFailed');
            onWarning?.(msg);
        } finally {
            if (abortControllerRef.current === controller) {
                setLocalIsUploading(false);
                abortControllerRef.current = null;
            }
        }
    };

    const handleCancelUpload = () => {
        abortControllerRef.current?.abort();
        abortControllerRef.current = null;
        setLocalIsUploading(false);
        onCancelUpload?.();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (file) {
            void handleFileSelected(file);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (disabled || isUploading) return;
        const file = e.dataTransfer.files?.[0];
        if (file) {
            void handleFileSelected(file);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const handleAttachYouTube = () => {
        const result = parseYouTubeVideoReferenceUrl(youtubeUrlInput);
        if (!result.ok) {
            onWarning?.(t('videoRefErrorInvalidYoutube'));
            return;
        }

        const item: VideoReferenceItem = {
            sourceType: 'youtube',
            uri: result.canonicalUrl,
            mimeType: 'video/mp4',
            displayName: result.displayName,
            youtubeVideoId: result.videoId,
            thumbnailUrl: result.thumbnailUrl,
            createdAt: Date.now(),
        };

        onVideoReferenceChange(item);
        setYoutubeUrlInput('');
        setThumbnailError(false);
    };

    const handleRemoveReference = () => {
        if (isUploading) {
            handleCancelUpload();
        }
        onVideoReferenceChange(null);
        setThumbnailError(false);
    };

    // Render active video reference card
    if (videoReference) {
        const isYouTube = videoReference.sourceType === 'youtube';
        const sourceLabel = isYouTube ? t('videoRefSourceYoutube') : t('videoRefSourceFilesApi');

        return (
            <div
                data-testid="video-reference-card"
                className="nbu-inline-panel rounded-xl border border-amber-300/80 bg-amber-50/70 p-2.5 dark:border-amber-400/30 dark:bg-amber-950/20"
            >
                <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-amber-200/90 bg-white/90 shadow-sm dark:border-amber-400/30 dark:bg-slate-900/90">
                            {videoReference.thumbnailUrl && !thumbnailError ? (
                                <img
                                    src={videoReference.thumbnailUrl}
                                    alt={videoReference.displayName}
                                    className="h-full w-full object-cover"
                                    onError={() => setThumbnailError(true)}
                                />
                            ) : isYouTube ? (
                                <YouTubeIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                            ) : (
                                <FilmIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                                <span className="inline-flex shrink-0 items-center rounded-full border border-amber-300/80 bg-white/90 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-700 dark:border-amber-400/30 dark:bg-slate-950/70 dark:text-amber-300">
                                    {sourceLabel}
                                </span>
                                <span
                                    data-testid="video-reference-name"
                                    className="truncate text-[11px] font-bold text-slate-800 dark:text-slate-100"
                                    title={videoReference.displayName}
                                >
                                    {videoReference.displayName}
                                </span>
                            </div>
                            <p className="mt-0.5 truncate text-[10px] text-slate-500 dark:text-slate-400">
                                {videoReference.fileSizeBytes
                                    ? formatVideoFileSize(videoReference.fileSizeBytes)
                                    : videoReference.uri}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        data-testid="video-reference-remove-btn"
                        onClick={handleRemoveReference}
                        disabled={disabled}
                        aria-label={t('videoRefRemove')}
                        title={t('videoRefRemove')}
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-rose-200/80 bg-white/90 text-rose-600 transition-colors hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-rose-900/60 dark:bg-slate-900/90 dark:text-rose-300 dark:hover:bg-rose-950/40"
                    >
                        <DismissIcon className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div data-testid="video-reference-uploader" className="space-y-2">
            {/* Tab buttons */}
            <div className="flex rounded-lg border border-slate-200/80 bg-slate-100/80 p-0.5 dark:border-slate-700/80 dark:bg-slate-800/80">
                <button
                    type="button"
                    data-testid="video-reference-tab-upload"
                    onClick={() => setActiveTab('upload')}
                    disabled={disabled || isUploading}
                    className={`flex-1 rounded-md px-2 py-1 text-[11px] font-bold transition-all ${
                        activeTab === 'upload'
                            ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100'
                            : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                >
                    <span className="flex items-center justify-center gap-1">
                        <FilmIcon className="h-3 w-3" />
                        <span>{t('videoRefUploadTab')}</span>
                    </span>
                </button>
                <button
                    type="button"
                    data-testid="video-reference-tab-youtube"
                    onClick={() => setActiveTab('youtube')}
                    disabled={disabled || isUploading}
                    className={`flex-1 rounded-md px-2 py-1 text-[11px] font-bold transition-all ${
                        activeTab === 'youtube'
                            ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100'
                            : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                >
                    <span className="flex items-center justify-center gap-1">
                        <YouTubeIcon className="h-3 w-3 text-red-600 dark:text-red-400" />
                        <span>{t('videoRefYoutubeTab')}</span>
                    </span>
                </button>
            </div>

            {/* Tab content */}
            {activeTab === 'upload' ? (
                <div
                    data-testid="video-reference-dropzone"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onClick={() => !isUploading && !disabled && fileInputRef.current?.click()}
                    className={`group relative flex min-h-[88px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-3 text-center transition-all ${
                        isUploading
                            ? 'border-amber-400 bg-amber-50/50 dark:border-amber-500/50 dark:bg-amber-950/20'
                            : 'border-slate-300/80 bg-slate-50/60 hover:border-amber-400 hover:bg-amber-50/30 dark:border-slate-700/80 dark:bg-slate-900/40 dark:hover:border-amber-500/40 dark:hover:bg-amber-950/15'
                    } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        data-testid="video-reference-file-input"
                        accept={VIDEO_FILE_ACCEPT_ATTR}
                        onChange={handleInputChange}
                        disabled={disabled || isUploading}
                        className="hidden"
                    />

                    {isUploading ? (
                        <div className="flex flex-col items-center gap-2">
                            <SpinnerIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                {t('videoRefUploading')}
                            </span>
                            <button
                                type="button"
                                data-testid="video-reference-cancel-upload-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleCancelUpload();
                                }}
                                className="mt-1 rounded-full border border-slate-300/80 bg-white/90 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-rose-950/40"
                            >
                                {t('videoRefCancelUpload')}
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-1">
                            <FilmIcon className="h-5 w-5 text-slate-400 transition-colors group-hover:text-amber-500 dark:text-slate-500 dark:group-hover:text-amber-400" />
                            <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                                {t('videoRefUploadHint')}
                            </p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500">
                                {t('videoRefUploadSubHint')}
                            </p>
                        </div>
                    )}
                </div>
            ) : (
                <div data-testid="video-reference-youtube-form" className="space-y-1.5">
                    <div className="flex gap-1.5">
                        <input
                            type="url"
                            data-testid="video-reference-youtube-input"
                            value={youtubeUrlInput}
                            onChange={(e) => setYoutubeUrlInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAttachYouTube();
                                }
                            }}
                            disabled={disabled}
                            placeholder={t('videoRefYoutubePlaceholder')}
                            className="flex-1 rounded-lg border border-slate-200/80 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none transition-colors focus:border-amber-400 focus:ring-1 focus:ring-amber-400 dark:border-slate-700/80 dark:bg-slate-900 dark:text-slate-100"
                        />
                        <button
                            type="button"
                            data-testid="video-reference-youtube-submit-btn"
                            onClick={handleAttachYouTube}
                            disabled={disabled || !youtubeUrlInput.trim()}
                            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-amber-300/80 bg-amber-500 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-amber-400/40 dark:bg-amber-600 dark:hover:bg-amber-500"
                        >
                            {t('videoRefYoutubeApply')}
                        </button>
                    </div>
                    <p className="px-1 text-[10px] text-slate-400 dark:text-slate-500">
                        {t('videoRefYoutubeHint')}
                    </p>
                </div>
            )}
        </div>
    );
};

export default VideoReferenceUploader;

