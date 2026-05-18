/**
 * Utility for saving images to local filesystem via Vite server plugin
 * and generating thumbnails for lightweight history display.
 */

import { ImageSidecarMetadata } from '../types';
import {
    DEBUG_TERMINAL_REQUEST_ID_HEADER,
    createDebugTerminalCorrelationId,
    emitDebugTerminalEvent,
} from './debugTerminalEvents';
import { normalizeImageSidecarMetadata } from './imageSidecarMetadata';

const THUMBNAIL_MAX_DIM = 200; // Max width or height for lightweight preview thumbnails
const LOAD_IMAGE_ENDPOINT = '/api/load-image';
const LOAD_IMAGE_METADATA_ENDPOINT = '/api/load-image-metadata';
const REFERENCE_PREVIEW_CACHE_LIMIT = 96;

export const EDITOR_IMAGE_MAX_DIMENSION = 4096;

const referencePreviewCache = new Map<string, string>();
const referencePreviewInFlight = new Map<string, Promise<string>>();

export type PreparedImageAsset = {
    dataUrl: string;
    wasResized: boolean;
    width: number;
    height: number;
    mimeType: string;
};

export type PreparedImagePreviewAsset = PreparedImageAsset & {
    previewDataUrl: string;
};

export type PersistedHistoryThumbnail = {
    url: string;
    thumbnailSavedFilename?: string;
    thumbnailInline?: boolean;
};

type SaveImageToLocalOptions = {
    filename?: string;
    dedupe?: boolean;
};

const emitImageFileDebugEvent = ({
    kind,
    label,
    summary,
    payload,
    route,
    method,
    correlationId,
    status,
    phase,
}: {
    kind: 'request' | 'response' | 'error' | 'log';
    label: string;
    summary?: string;
    payload?: unknown;
    route: string;
    method: 'GET' | 'POST';
    correlationId: string;
    status?: number;
    phase?: string;
}) => {
    emitDebugTerminalEvent({
        kind,
        label,
        summary,
        payload,
        source: 'image-file',
        route,
        endpoint: route,
        method,
        operation: 'Image file',
        correlationId,
        status,
        phase,
    });
};

const withImageFileDebugHeaders = (headers: Record<string, string>, correlationId: string): Record<string, string> => ({
    ...headers,
    [DEBUG_TERMINAL_REQUEST_ID_HEADER]: correlationId,
});

export const buildSavedImageLoadUrl = (savedFilename: string): string =>
    `${LOAD_IMAGE_ENDPOINT}?filename=${encodeURIComponent(savedFilename)}`;

export const extractSavedFilename = (savedPath: string | null | undefined): string | undefined =>
    savedPath ? savedPath.split(/[\\/]/).pop() : undefined;

const getDataUrlExtension = (dataUrl: string): string =>
    dataUrl.startsWith('data:image/png')
        ? 'png'
        : dataUrl.startsWith('data:image/jpeg')
          ? 'jpg'
          : dataUrl.startsWith('data:image/webp')
            ? 'webp'
            : 'png';

const buildGeneratedFilenameStem = (prefix: string): string => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `${prefix}_${timestamp}_${crypto.randomUUID().slice(0, 8)}`;
};

const buildFilename = (stem: string, ext: string) => `${stem}.${ext}`;

const sanitizeRequestedFilename = (value: string): string | null => {
    const filename = value.split(/[\\/]/).pop()?.trim();
    return filename || null;
};

const extractFilenameStem = (filename: string): string => filename.replace(/\.[^.]+$/, '');

const deriveThumbnailFilenameStem = (savedFilename: string): string =>
    `${extractFilenameStem(savedFilename)}-thumbnail`;

const touchReferencePreviewCacheEntry = (source: string, previewDataUrl: string): string => {
    if (referencePreviewCache.has(source)) {
        referencePreviewCache.delete(source);
    }

    referencePreviewCache.set(source, previewDataUrl);

    while (referencePreviewCache.size > REFERENCE_PREVIEW_CACHE_LIMIT) {
        const oldestSource = referencePreviewCache.keys().next().value;
        if (typeof oldestSource !== 'string') {
            break;
        }
        referencePreviewCache.delete(oldestSource);
    }

    return previewDataUrl;
};

const resolveImageSourceMimeType = (imageSource: string, fallback = 'image/png'): string => {
    const match = imageSource.match(/^data:([^;,]+)[;,]/);
    return match?.[1] || fallback;
};

const readBlobAsDataUrl = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to convert blob to data URL.'));
        reader.readAsDataURL(blob);
    });

const canvasToDataUrl = (canvas: HTMLCanvasElement, mimeType: string, quality?: number): Promise<string> =>
    new Promise((resolve, reject) => {
        if (typeof canvas.toBlob !== 'function') {
            resolve(canvas.toDataURL(mimeType, quality));
            return;
        }

        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    reject(new Error('Failed to encode canvas output.'));
                    return;
                }

                void readBlobAsDataUrl(blob).then(resolve).catch(reject);
            },
            mimeType,
            quality,
        );
    });

const loadImageElement = (imageSource: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Failed to load image.'));
        image.src = imageSource;
    });

const normalizeLoadedImageSource = async (
    image: HTMLImageElement,
    source: string,
    mimeType: string,
    maxDimension: number,
): Promise<PreparedImageAsset> => {
    const constrained = constrainImageDimensions(image.width, image.height, maxDimension);

    if (!constrained.wasResized) {
        return {
            dataUrl: source,
            wasResized: false,
            width: constrained.width,
            height: constrained.height,
            mimeType: resolveImageSourceMimeType(source, mimeType),
        };
    }

    const canvas = document.createElement('canvas');
    canvas.width = constrained.width;
    canvas.height = constrained.height;
    const context = canvas.getContext('2d');
    if (!context) {
        throw new Error('Failed to create a normalization canvas context.');
    }

    context.drawImage(image, 0, 0, constrained.width, constrained.height);
    const normalizedDataUrl = await canvasToDataUrl(canvas, mimeType);

    return {
        dataUrl: normalizedDataUrl,
        wasResized: true,
        width: constrained.width,
        height: constrained.height,
        mimeType,
    };
};

export const constrainImageDimensions = (
    width: number,
    height: number,
    maxDimension = EDITOR_IMAGE_MAX_DIMENSION,
): { width: number; height: number; wasResized: boolean } => {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
        return { width: 0, height: 0, wasResized: false };
    }

    if (width <= maxDimension && height <= maxDimension) {
        return { width, height, wasResized: false };
    }

    if (width > height) {
        return {
            width: maxDimension,
            height: Math.round((height * maxDimension) / width),
            wasResized: true,
        };
    }

    return {
        width: Math.round((width * maxDimension) / height),
        height: maxDimension,
        wasResized: true,
    };
};

export const loadImageDimensions = (imageSource: string): Promise<{ width: number; height: number }> =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            resolve({
                width: image.width,
                height: image.height,
            });
        };
        image.onerror = () => reject(new Error('Failed to load image dimensions.'));
        image.src = imageSource;
    });

export const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
        reader.readAsDataURL(file);
    });

export const prepareImageAssetFromSource = async (
    imageSource: string,
    maxDimension = EDITOR_IMAGE_MAX_DIMENSION,
    mimeType = 'image/png',
): Promise<PreparedImageAsset> => {
    const image = await loadImageElement(imageSource);
    return normalizeLoadedImageSource(image, imageSource, mimeType, maxDimension);
};

export const normalizeImageDataUrl = (
    dataUrl: string,
    mimeType = 'image/png',
    maxDimension = EDITOR_IMAGE_MAX_DIMENSION,
): Promise<PreparedImageAsset> => prepareImageAssetFromSource(dataUrl, maxDimension, mimeType);

export const prepareImageAssetFromFile = async (
    file: File,
    maxDimension = EDITOR_IMAGE_MAX_DIMENSION,
): Promise<PreparedImageAsset> => {
    const dataUrl = await readFileAsDataUrl(file);
    return normalizeImageDataUrl(dataUrl, file.type || 'image/png', maxDimension);
};

export const clearReferencePreviewCache = (): void => {
    referencePreviewCache.clear();
    referencePreviewInFlight.clear();
};

export const getReferencePreviewDataUrl = (source: string): string | undefined => {
    const cachedPreview = referencePreviewCache.get(source);
    return cachedPreview ? touchReferencePreviewCacheEntry(source, cachedPreview) : undefined;
};

export const setReferencePreviewDataUrl = (source: string, previewDataUrl: string): string =>
    touchReferencePreviewCacheEntry(source, previewDataUrl);

/**
 * Save a full-resolution image to the local filesystem via the server endpoint.
 * Optionally saves a JSON sidecar with generation metadata.
 * @returns The saved file path on success, or null on failure.
 */
export async function saveImageToLocal(
    dataUrl: string,
    prefix: string = 'gemini',
    metadata?: Record<string, unknown>,
    filenameStem?: string,
    options?: SaveImageToLocalOptions,
): Promise<string | null> {
    const ext = getDataUrlExtension(dataUrl);
    const filename = options?.filename
        ? sanitizeRequestedFilename(options.filename) ||
          buildFilename(filenameStem || buildGeneratedFilenameStem(prefix), ext)
        : buildFilename(filenameStem || buildGeneratedFilenameStem(prefix), ext);
    const correlationId = createDebugTerminalCorrelationId('imagefile');
    const requestPayload = {
        filename,
        dedupe: options?.dedupe === true,
        hasMetadata: Boolean(metadata),
        metadataKeys: metadata ? Object.keys(metadata).slice(0, 8) : [],
    };

    emitImageFileDebugEvent({
        kind: 'request',
        label: 'Save image request',
        summary: filename,
        payload: requestPayload,
        route: '/api/save-image',
        method: 'POST',
        correlationId,
    });

    try {
        const res = await fetch('/api/save-image', {
            method: 'POST',
            headers: withImageFileDebugHeaders({ 'Content-Type': 'application/json' }, correlationId),
            body: JSON.stringify({ data: dataUrl, filename, metadata, dedupe: options?.dedupe === true }),
        });
        const result = await res.json();
        if (result.success) {
            emitImageFileDebugEvent({
                kind: 'response',
                label: 'Save image response',
                summary: result.path || filename,
                payload: { ...requestPayload, path: result.path || null },
                route: '/api/save-image',
                method: 'POST',
                correlationId,
                status: res.status,
            });
            return result.path;
        }
        emitImageFileDebugEvent({
            kind: 'error',
            label: 'Save image failed',
            summary: result.error || 'Server save failed',
            payload: { ...requestPayload, error: result.error || null },
            route: '/api/save-image',
            method: 'POST',
            correlationId,
            status: res.status,
        });
        console.error('Server save failed:', result.error);
        return null;
    } catch (err) {
        emitImageFileDebugEvent({
            kind: 'error',
            label: 'Save image failed',
            summary: err instanceof Error ? err.message : 'Unknown image save error',
            payload: requestPayload,
            route: '/api/save-image',
            method: 'POST',
            correlationId,
        });
        console.error('Failed to save image to local:', err);
        return null;
    }
}

/**
 * Generate a small thumbnail from a full-resolution data URL.
 * Returns a compressed JPEG data URL suitable for in-memory history.
 */
export const generateThumbnail = (dataUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');

            let w = img.width;
            let h = img.height;
            if (w > h) {
                if (w > THUMBNAIL_MAX_DIM) {
                    h = Math.round((h *= THUMBNAIL_MAX_DIM / w));
                    w = THUMBNAIL_MAX_DIM;
                }
            } else {
                if (h > THUMBNAIL_MAX_DIM) {
                    w = Math.round((w *= THUMBNAIL_MAX_DIM / h));
                    h = THUMBNAIL_MAX_DIM;
                }
            }

            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, w, h);
                // Lower quality to 0.5 to drastically reduce base64 size for local storage cache
                resolve(canvas.toDataURL('image/jpeg', 0.5));
            } else {
                resolve(dataUrl);
            }
        };
        img.onerror = () => {
            reject(new Error('Failed to generate thumbnail'));
        };
        img.src = dataUrl;
    });
};

export const ensureReferencePreviewDataUrl = async (source: string): Promise<string> => {
    const cachedPreview = getReferencePreviewDataUrl(source);
    if (cachedPreview) {
        return cachedPreview;
    }

    const pendingPreview = referencePreviewInFlight.get(source);
    if (pendingPreview) {
        return pendingPreview;
    }

    const previewPromise = generateThumbnail(source)
        .catch(() => source)
        .then((previewDataUrl) => touchReferencePreviewCacheEntry(source, previewDataUrl))
        .finally(() => {
            referencePreviewInFlight.delete(source);
        });

    referencePreviewInFlight.set(source, previewPromise);
    return previewPromise;
};

export const prepareImagePreviewAssetFromFile = async (
    file: File,
    maxDimension = EDITOR_IMAGE_MAX_DIMENSION,
): Promise<PreparedImagePreviewAsset> => {
    const preparedImage = await prepareImageAssetFromFile(file, maxDimension);
    const previewDataUrl = await ensureReferencePreviewDataUrl(preparedImage.dataUrl);

    return {
        ...preparedImage,
        previewDataUrl,
    };
};

export async function persistHistoryThumbnail(
    dataUrl: string,
    prefix: string,
    sourceSavedFilename?: string,
): Promise<PersistedHistoryThumbnail> {
    let thumbnailUrl = dataUrl;

    try {
        thumbnailUrl = await generateThumbnail(dataUrl);
    } catch {
        thumbnailUrl = dataUrl;
    }

    try {
        const thumbnailFilenameStem = sourceSavedFilename
            ? deriveThumbnailFilenameStem(sourceSavedFilename)
            : undefined;
        const savedPath = await saveImageToLocal(thumbnailUrl, `${prefix}-thumbnail`, undefined, thumbnailFilenameStem);
        const thumbnailSavedFilename = extractSavedFilename(savedPath);

        if (thumbnailSavedFilename) {
            return {
                url: buildSavedImageLoadUrl(thumbnailSavedFilename),
                thumbnailSavedFilename,
            };
        }
    } catch {
        // Fall back to the inline preview for the current session only.
    }

    return {
        url: thumbnailUrl,
        thumbnailInline: true,
    };
}

export async function loadImageMetadata(filename: string): Promise<ImageSidecarMetadata | null> {
    const correlationId = createDebugTerminalCorrelationId('imagefile');
    const route = `${LOAD_IMAGE_METADATA_ENDPOINT}?filename=${encodeURIComponent(filename)}`;

    emitImageFileDebugEvent({
        kind: 'request',
        label: 'Load image metadata request',
        summary: filename,
        payload: { filename },
        route,
        method: 'GET',
        correlationId,
    });

    try {
        const res = await fetch(route, {
            headers: withImageFileDebugHeaders({}, correlationId),
        });
        if (res.status === 404) {
            emitImageFileDebugEvent({
                kind: 'response',
                label: 'Load image metadata response',
                summary: 'Metadata not found',
                payload: { filename, found: false },
                route,
                method: 'GET',
                correlationId,
                status: res.status,
            });
            return null;
        }
        if (!res.ok) {
            throw new Error(`Server returned ${res.status}`);
        }

        const metadata = normalizeImageSidecarMetadata(await res.json());
        emitImageFileDebugEvent({
            kind: 'response',
            label: 'Load image metadata response',
            summary: metadata ? 'Metadata loaded' : 'Metadata empty',
            payload: {
                filename,
                found: Boolean(metadata),
                metadataKeys: metadata ? Object.keys(metadata).slice(0, 8) : [],
            },
            route,
            method: 'GET',
            correlationId,
            status: res.status,
        });
        return metadata;
    } catch (err) {
        emitImageFileDebugEvent({
            kind: 'error',
            label: 'Load image metadata failed',
            summary: err instanceof Error ? err.message : 'Unknown metadata load error',
            payload: { filename },
            route,
            method: 'GET',
            correlationId,
        });
        console.error('Failed to load image metadata:', err);
        return null;
    }
}
/**
 * Fetch a full-resolution image from the local filesystem via the server endpoint.
 * Returns a base64 data URL.
 */
export async function loadFullImage(filename: string): Promise<string | null> {
    const correlationId = createDebugTerminalCorrelationId('imagefile');
    const route = `${LOAD_IMAGE_ENDPOINT}?filename=${encodeURIComponent(filename)}`;

    emitImageFileDebugEvent({
        kind: 'request',
        label: 'Load full image request',
        summary: filename,
        payload: { filename },
        route,
        method: 'GET',
        correlationId,
    });

    try {
        const res = await fetch(route, {
            headers: withImageFileDebugHeaders({}, correlationId),
        });
        if (!res.ok) throw new Error(`Server returned ${res.status}`);

        const blob = await res.blob();
        const dataUrl = await new Promise<string | null>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });

        if (!dataUrl) {
            emitImageFileDebugEvent({
                kind: 'error',
                label: 'Load full image failed',
                summary: 'Failed to read image blob as data URL',
                payload: { filename, size: blob.size, mimeType: blob.type || null },
                route,
                method: 'GET',
                correlationId,
                status: res.status,
                phase: 'read-blob',
            });
            return null;
        }

        emitImageFileDebugEvent({
            kind: 'response',
            label: 'Load full image response',
            summary: `${filename} (${blob.type || 'unknown'})`,
            payload: { filename, size: blob.size, mimeType: blob.type || null },
            route,
            method: 'GET',
            correlationId,
            status: res.status,
        });

        return dataUrl;
    } catch (err) {
        emitImageFileDebugEvent({
            kind: 'error',
            label: 'Load full image failed',
            summary: err instanceof Error ? err.message : 'Unknown full image load error',
            payload: { filename },
            route,
            method: 'GET',
            correlationId,
        });
        console.error('Failed to load full image:', err);
        return null;
    }
}
