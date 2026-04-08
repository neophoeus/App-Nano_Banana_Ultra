/**
 * Utility for saving images to local filesystem via Vite server plugin
 * and generating thumbnails for lightweight history display.
 */

import { ImageSidecarMetadata } from '../types';
import { normalizeImageSidecarMetadata } from './imageSidecarMetadata';

const THUMBNAIL_MAX_DIM = 300; // Max width or height for history thumbnails
const LOAD_IMAGE_ENDPOINT = '/api/load-image';
const LOAD_IMAGE_METADATA_ENDPOINT = '/api/load-image-metadata';

export type PreparedImageAsset = {
    dataUrl: string;
    wasResized: boolean;
    width: number;
    height: number;
    mimeType: string;
};

export type PersistedHistoryThumbnail = {
    url: string;
    thumbnailSavedFilename?: string;
    thumbnailInline?: boolean;
};

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

const extractFilenameStem = (filename: string): string => filename.replace(/\.[^.]+$/, '');

const deriveThumbnailFilenameStem = (savedFilename: string): string =>
    `${extractFilenameStem(savedFilename)}-thumbnail`;

export const constrainImageDimensions = (
    width: number,
    height: number,
    maxDimension = 4096,
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

export const normalizeImageDataUrl = (
    dataUrl: string,
    mimeType = 'image/png',
    maxDimension = 4096,
): Promise<PreparedImageAsset> =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            const constrained = constrainImageDimensions(image.width, image.height, maxDimension);
            let width = constrained.width;
            let height = constrained.height;
            let normalizedDataUrl = dataUrl;
            const wasResized = constrained.wasResized;

            if (wasResized) {
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const context = canvas.getContext('2d');
                if (!context) {
                    reject(new Error('Failed to create a normalization canvas context.'));
                    return;
                }

                context.drawImage(image, 0, 0, width, height);
                normalizedDataUrl = canvas.toDataURL(mimeType);
            }

            resolve({
                dataUrl: normalizedDataUrl,
                wasResized,
                width,
                height,
                mimeType,
            });
        };
        image.onerror = () => reject(new Error('Failed to load image for normalization.'));
        image.src = dataUrl;
    });

export const prepareImageAssetFromFile = async (file: File, maxDimension = 4096): Promise<PreparedImageAsset> => {
    const dataUrl = await readFileAsDataUrl(file);
    return normalizeImageDataUrl(dataUrl, file.type || 'image/png', maxDimension);
};

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
): Promise<string | null> {
    const ext = getDataUrlExtension(dataUrl);
    const filename = buildFilename(filenameStem || buildGeneratedFilenameStem(prefix), ext);

    try {
        const res = await fetch('/api/save-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: dataUrl, filename, metadata }),
        });
        const result = await res.json();
        if (result.success) {
            return result.path;
        }
        console.error('Server save failed:', result.error);
        return null;
    } catch (err) {
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
            const MAX_DIM = 200; // Lowered from 300 to 200 to save memory in history state

            let w = img.width;
            let h = img.height;
            if (w > h) {
                if (w > MAX_DIM) {
                    h = Math.round((h *= MAX_DIM / w));
                    w = MAX_DIM;
                }
            } else {
                if (h > MAX_DIM) {
                    w = Math.round((w *= MAX_DIM / h));
                    h = MAX_DIM;
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
    try {
        const res = await fetch(`${LOAD_IMAGE_METADATA_ENDPOINT}?filename=${encodeURIComponent(filename)}`);
        if (res.status === 404) {
            return null;
        }
        if (!res.ok) {
            throw new Error(`Server returned ${res.status}`);
        }

        return normalizeImageSidecarMetadata(await res.json());
    } catch (err) {
        console.error('Failed to load image metadata:', err);
        return null;
    }
}
/**
 * Fetch a full-resolution image from the local filesystem via the server endpoint.
 * Returns a base64 data URL.
 */
export async function loadFullImage(filename: string): Promise<string | null> {
    try {
        const res = await fetch(`/api/load-image?filename=${encodeURIComponent(filename)}`);
        if (!res.ok) throw new Error(`Server returned ${res.status}`);

        const blob = await res.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch (err) {
        console.error('Failed to load full image:', err);
        return null;
    }
}
