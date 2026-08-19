import { loadBrowserSavedImageDataUrl, BROWSER_SAVED_IMAGE_PATH_PREFIX } from './browserImageStore';

const IMAGE_MIME_TYPE_EXTENSION_MAP: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
};

const DEFAULT_DOWNLOAD_FILENAME_STEM = 'generated-image';
const DEFAULT_IMAGE_EXTENSION = 'png';

const triggerObjectUrlDownload = (objectUrl: string, filename: string) => {
    const downloadLink = document.createElement('a');
    downloadLink.href = objectUrl;
    downloadLink.download = filename;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(objectUrl);
};

const getFilenameExtension = (value: string): string | null => {
    const match = value.match(/\.([^.?#/\\]+)(?:$|[?#])/);
    return match?.[1]?.toLowerCase() || null;
};

const getDataUrlMimeType = (value: string): string | null => {
    const match = value.match(/^data:([^;,]+)[;,]/i);
    return match?.[1]?.toLowerCase() || null;
};

export const stripFilenameExtension = (filename: string): string => filename.replace(/\.[^.]+$/, '');

export const resolveImageDownloadExtension = ({
    mimeType,
    savedFilename,
    imageUrl,
}: {
    mimeType?: string | null;
    savedFilename?: string | null;
    imageUrl?: string | null;
}): string => {
    const savedFilenameExtension = savedFilename ? getFilenameExtension(savedFilename) : null;
    if (savedFilenameExtension) {
        return savedFilenameExtension;
    }

    const normalizedMimeType = mimeType?.trim().toLowerCase() || getDataUrlMimeType(imageUrl || '');
    if (normalizedMimeType && IMAGE_MIME_TYPE_EXTENSION_MAP[normalizedMimeType]) {
        return IMAGE_MIME_TYPE_EXTENSION_MAP[normalizedMimeType];
    }

    const imageUrlExtension = imageUrl ? getFilenameExtension(imageUrl) : null;
    return imageUrlExtension || DEFAULT_IMAGE_EXTENSION;
};

export async function downloadImageSource(
    imageUrl: string,
    {
        filename,
        filenameStem,
        mimeType,
    }: {
        filename?: string;
        filenameStem?: string;
        mimeType?: string | null;
    } = {},
): Promise<string> {
    let resolvedUrl = imageUrl;
    let blob: Blob | null = null;

    if (imageUrl.startsWith(BROWSER_SAVED_IMAGE_PATH_PREFIX)) {
        const key = imageUrl.slice(BROWSER_SAVED_IMAGE_PATH_PREFIX.length);
        const dataUrl = await loadBrowserSavedImageDataUrl(key).catch(() => null);
        if (dataUrl) {
            resolvedUrl = dataUrl;
        }
    } else if (filename && !imageUrl.startsWith('data:')) {
        const dataUrl = await loadBrowserSavedImageDataUrl(filename).catch(() => null);
        if (dataUrl) {
            resolvedUrl = dataUrl;
        }
    }

    try {
        const response = await fetch(resolvedUrl);
        if (response.ok) {
            blob = await response.blob();
        }
    } catch {
        // If direct fetch fails, fallback to loading from indexedDB browser store
        const fallbackFilename =
            filename ||
            (imageUrl.includes('filename=') ? decodeURIComponent(imageUrl.split('filename=')[1]) : undefined);
        if (fallbackFilename) {
            const dataUrl = await loadBrowserSavedImageDataUrl(fallbackFilename).catch(() => null);
            if (dataUrl) {
                const fallbackResponse = await fetch(dataUrl);
                if (fallbackResponse.ok) {
                    blob = await fallbackResponse.blob();
                    resolvedUrl = dataUrl;
                }
            }
        }
    }

    if (!blob) {
        throw new Error('Failed to fetch image for download');
    }

    const resolvedFilename =
        filename && /\.[^.]+$/.test(filename)
            ? filename
            : `${filename || filenameStem || DEFAULT_DOWNLOAD_FILENAME_STEM}.${resolveImageDownloadExtension({
                  mimeType: mimeType || blob.type,
                  savedFilename: filename,
                  imageUrl: resolvedUrl,
              })}`;
    const objectUrl = URL.createObjectURL(blob);
    triggerObjectUrlDownload(objectUrl, resolvedFilename);
    return resolvedFilename;
}

export function downloadJsonDocument(value: unknown, filename: string): string {
    const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: 'application/json' });
    const objectUrl = URL.createObjectURL(blob);
    triggerObjectUrlDownload(objectUrl, filename);
    return filename;
}