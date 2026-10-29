import { SupportedVideoMimeType } from '../types';

export const MAX_VIDEO_UPLOAD_BYTES = 200 * 1024 * 1024; // 200 MB

export const SUPPORTED_VIDEO_MIME_TYPES: readonly SupportedVideoMimeType[] = [
    'video/mp4',
    'video/webm',
    'video/mov',
    'video/mpeg',
    'video/mpg',
    'video/avi',
    'video/wmv',
    'video/3gpp',
    'video/x-flv',
] as const;

export const VIDEO_FILE_ACCEPT_ATTR =
    'video/mp4,video/webm,video/quicktime,video/mpeg,video/avi,video/x-msvideo,video/x-ms-wmv,video/3gpp,video/x-flv,.mp4,.mov,.webm,.mpeg,.mpg,.avi,.wmv,.3gp,.flv';

const YOUTUBE_HOSTS = new Set([
    'youtube.com',
    'www.youtube.com',
    'm.youtube.com',
    'youtu.be',
]);

const YOUTUBE_VIDEO_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;

const EXTENSION_MIME_MAP: Record<string, SupportedVideoMimeType> = {
    '.mp4': 'video/mp4',
    '.mov': 'video/mov',
    '.webm': 'video/webm',
    '.mpeg': 'video/mpeg',
    '.mpg': 'video/mpg',
    '.avi': 'video/avi',
    '.wmv': 'video/wmv',
    '.3gp': 'video/3gpp',
    '.3gpp': 'video/3gpp',
    '.flv': 'video/x-flv',
};

const BROWSER_MIME_NORMALIZATION_MAP: Record<string, SupportedVideoMimeType> = {
    'video/quicktime': 'video/mov',
    'video/x-msvideo': 'video/avi',
    'video/x-ms-wmv': 'video/wmv',
    'video/mp4': 'video/mp4',
    'video/webm': 'video/webm',
    'video/mpeg': 'video/mpeg',
    'video/mpg': 'video/mpg',
    'video/avi': 'video/avi',
    'video/wmv': 'video/wmv',
    'video/3gpp': 'video/3gpp',
    'video/x-flv': 'video/x-flv',
};

/**
 * Normalizes browser-reported video MIME types or falls back to filename extension.
 */
export function normalizeVideoMimeType(
    rawMimeType?: string | null,
    filename?: string | null,
): SupportedVideoMimeType | null {
    const cleanMime = rawMimeType?.trim().toLowerCase();
    if (cleanMime && cleanMime in BROWSER_MIME_NORMALIZATION_MAP) {
        return BROWSER_MIME_NORMALIZATION_MAP[cleanMime];
    }

    if (filename) {
        const lastDotIndex = filename.lastIndexOf('.');
        if (lastDotIndex !== -1) {
            const ext = filename.slice(lastDotIndex).toLowerCase();
            if (ext in EXTENSION_MIME_MAP) {
                return EXTENSION_MIME_MAP[ext];
            }
        }
    }

    return null;
}

export type LocalVideoValidationResult =
    | { ok: true; mimeType: SupportedVideoMimeType }
    | { ok: false; errorCode: 'empty_file' | 'file_too_large' | 'unsupported_mime' };

/**
 * Validates a local video file before uploading.
 */
export function validateLocalVideoFile(file: {
    name: string;
    size: number;
    type: string;
}): LocalVideoValidationResult {
    if (!file || typeof file.size !== 'number' || file.size <= 0) {
        return { ok: false, errorCode: 'empty_file' };
    }

    if (file.size > MAX_VIDEO_UPLOAD_BYTES) {
        return { ok: false, errorCode: 'file_too_large' };
    }

    const mimeType = normalizeVideoMimeType(file.type, file.name);
    if (!mimeType) {
        return { ok: false, errorCode: 'unsupported_mime' };
    }

    return { ok: true, mimeType };
}

export type YouTubeUrlParseResult =
    | {
          ok: true;
          canonicalUrl: string;
          videoId: string;
          thumbnailUrl: string;
          displayName: string;
      }
    | { ok: false; errorCode: 'empty_url' | 'invalid_youtube_url' };

/**
 * Validates and normalizes YouTube video URLs (watch, shorts, live, youtu.be).
 * Extracts canonical URL, 11-char video ID, and thumbnail.
 */
export function parseYouTubeVideoReferenceUrl(rawInput: string): YouTubeUrlParseResult {
    const trimmed = rawInput?.trim();
    if (!trimmed) {
        return { ok: false, errorCode: 'empty_url' };
    }

    let parsedUrl: URL;
    try {
        parsedUrl = new URL(trimmed);
    } catch {
        return { ok: false, errorCode: 'invalid_youtube_url' };
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        return { ok: false, errorCode: 'invalid_youtube_url' };
    }

    const hostname = parsedUrl.hostname.toLowerCase();
    if (!YOUTUBE_HOSTS.has(hostname)) {
        return { ok: false, errorCode: 'invalid_youtube_url' };
    }

    let extractedVideoId: string | null = null;

    if (hostname === 'youtu.be') {
        const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
        if (pathSegments.length > 0) {
            extractedVideoId = pathSegments[0];
        }
    } else {
        const pathname = parsedUrl.pathname;
        if (pathname === '/watch') {
            extractedVideoId = parsedUrl.searchParams.get('v');
        } else if (
            pathname.startsWith('/shorts/') ||
            pathname.startsWith('/live/') ||
            pathname.startsWith('/embed/') ||
            pathname.startsWith('/v/')
        ) {
            const segments = pathname.split('/').filter(Boolean);
            if (segments.length >= 2) {
                extractedVideoId = segments[1];
            }
        }
    }

    if (!extractedVideoId || !YOUTUBE_VIDEO_ID_REGEX.test(extractedVideoId)) {
        return { ok: false, errorCode: 'invalid_youtube_url' };
    }

    return {
        ok: true,
        canonicalUrl: `https://www.youtube.com/watch?v=${extractedVideoId}`,
        videoId: extractedVideoId,
        thumbnailUrl: `https://i.ytimg.com/vi/${extractedVideoId}/hqdefault.jpg`,
        displayName: `YouTube (${extractedVideoId})`,
    };
}

/**
 * Formats file size in bytes to human-readable string.
 */
export function formatVideoFileSize(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) {
        return '0 B';
    }

    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
