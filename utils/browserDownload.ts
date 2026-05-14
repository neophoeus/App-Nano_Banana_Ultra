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
    const response = await fetch(imageUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch image for download (${response.status})`);
    }

    const blob = await response.blob();
    const resolvedFilename =
        filename && /\.[^.]+$/.test(filename)
            ? filename
            : `${filename || filenameStem || DEFAULT_DOWNLOAD_FILENAME_STEM}.${resolveImageDownloadExtension({
                  mimeType: mimeType || blob.type,
                  savedFilename: filename,
                  imageUrl,
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