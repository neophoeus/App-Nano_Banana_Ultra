import { describe, expect, it } from 'vitest';
import {
    formatVideoFileSize,
    MAX_VIDEO_UPLOAD_BYTES,
    normalizeVideoMimeType,
    parseYouTubeVideoReferenceUrl,
    validateLocalVideoFile,
} from '../utils/videoReferenceUtils';

describe('videoReferenceUtils', () => {
    describe('normalizeVideoMimeType', () => {
        it('normalizes standard Gemini video MIME types', () => {
            expect(normalizeVideoMimeType('video/mp4')).toBe('video/mp4');
            expect(normalizeVideoMimeType('video/webm')).toBe('video/webm');
            expect(normalizeVideoMimeType('video/mpeg')).toBe('video/mpeg');
            expect(normalizeVideoMimeType('video/3gpp')).toBe('video/3gpp');
            expect(normalizeVideoMimeType('video/x-flv')).toBe('video/x-flv');
        });

        it('maps browser-specific MIME types to Gemini-supported types', () => {
            expect(normalizeVideoMimeType('video/quicktime')).toBe('video/mov');
            expect(normalizeVideoMimeType('video/x-msvideo')).toBe('video/avi');
            expect(normalizeVideoMimeType('video/x-ms-wmv')).toBe('video/wmv');
        });

        it('falls back to filename extension when MIME type is missing or unknown', () => {
            expect(normalizeVideoMimeType('', 'sample.mov')).toBe('video/mov');
            expect(normalizeVideoMimeType(null, 'clip.MP4')).toBe('video/mp4');
            expect(normalizeVideoMimeType('application/octet-stream', 'animation.webm')).toBe('video/webm');
            expect(normalizeVideoMimeType(undefined, 'old.avi')).toBe('video/avi');
            expect(normalizeVideoMimeType('', 'stream.wmv')).toBe('video/wmv');
            expect(normalizeVideoMimeType('', 'video.flv')).toBe('video/x-flv');
            expect(normalizeVideoMimeType('', 'mobile.3gp')).toBe('video/3gpp');
        });

        it('returns null for unsupported types or unknown extensions', () => {
            expect(normalizeVideoMimeType('image/png', 'sample.png')).toBeNull();
            expect(normalizeVideoMimeType('audio/mp3', 'song.mp3')).toBeNull();
            expect(normalizeVideoMimeType(null, 'document.pdf')).toBeNull();
        });
    });

    describe('validateLocalVideoFile', () => {
        it('rejects empty or zero-byte files', () => {
            const result = validateLocalVideoFile({ name: 'empty.mp4', size: 0, type: 'video/mp4' });
            expect(result).toEqual({ ok: false, errorCode: 'empty_file' });
        });

        it('rejects files exceeding MAX_VIDEO_UPLOAD_BYTES', () => {
            const result = validateLocalVideoFile({
                name: 'huge.mp4',
                size: MAX_VIDEO_UPLOAD_BYTES + 1,
                type: 'video/mp4',
            });
            expect(result).toEqual({ ok: false, errorCode: 'file_too_large' });
        });

        it('rejects files with unsupported formats', () => {
            const result = validateLocalVideoFile({ name: 'doc.txt', size: 1024, type: 'text/plain' });
            expect(result).toEqual({ ok: false, errorCode: 'unsupported_mime' });
        });

        it('accepts valid video files within size limit', () => {
            const result = validateLocalVideoFile({
                name: 'sample.mov',
                size: 15 * 1024 * 1024,
                type: 'video/quicktime',
            });
            expect(result).toEqual({ ok: true, mimeType: 'video/mov' });
        });
    });

    describe('parseYouTubeVideoReferenceUrl', () => {
        it('handles standard watch URLs and strips tracking parameters', () => {
            const result = parseYouTubeVideoReferenceUrl(
                'https://www.youtube.com/watch?v=dQw4w9WgXcQ&si=tracking123&t=45s',
            );
            expect(result).toEqual({
                ok: true,
                canonicalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                videoId: 'dQw4w9WgXcQ',
                thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
                displayName: 'YouTube (dQw4w9WgXcQ)',
            });
        });

        it('handles youtu.be short URLs', () => {
            const result = parseYouTubeVideoReferenceUrl('https://youtu.be/dQw4w9WgXcQ?feature=share');
            expect(result).toEqual({
                ok: true,
                canonicalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                videoId: 'dQw4w9WgXcQ',
                thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
                displayName: 'YouTube (dQw4w9WgXcQ)',
            });
        });

        it('handles shorts URLs', () => {
            const result = parseYouTubeVideoReferenceUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ');
            expect(result).toEqual({
                ok: true,
                canonicalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                videoId: 'dQw4w9WgXcQ',
                thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
                displayName: 'YouTube (dQw4w9WgXcQ)',
            });
        });

        it('handles mobile and live URLs', () => {
            const mobileResult = parseYouTubeVideoReferenceUrl('https://m.youtube.com/watch?v=dQw4w9WgXcQ');
            expect(mobileResult.ok).toBe(true);

            const liveResult = parseYouTubeVideoReferenceUrl('https://youtube.com/live/dQw4w9WgXcQ');
            expect(liveResult.ok).toBe(true);
        });

        it('rejects empty input', () => {
            expect(parseYouTubeVideoReferenceUrl('')).toEqual({ ok: false, errorCode: 'empty_url' });
            expect(parseYouTubeVideoReferenceUrl('   ')).toEqual({ ok: false, errorCode: 'empty_url' });
        });

        it('rejects non-YouTube domains and non-http protocols', () => {
            expect(parseYouTubeVideoReferenceUrl('https://vimeo.com/12345678901')).toEqual({
                ok: false,
                errorCode: 'invalid_youtube_url',
            });
            expect(parseYouTubeVideoReferenceUrl('javascript:alert(1)')).toEqual({
                ok: false,
                errorCode: 'invalid_youtube_url',
            });
        });

        it('rejects playlists or channels without valid 11-char video ID', () => {
            expect(parseYouTubeVideoReferenceUrl('https://www.youtube.com/playlist?list=PL12345')).toEqual({
                ok: false,
                errorCode: 'invalid_youtube_url',
            });
            expect(parseYouTubeVideoReferenceUrl('https://www.youtube.com/@channelName')).toEqual({
                ok: false,
                errorCode: 'invalid_youtube_url',
            });
            expect(parseYouTubeVideoReferenceUrl('https://www.youtube.com/watch?v=short')).toEqual({
                ok: false,
                errorCode: 'invalid_youtube_url',
            });
        });
    });

    describe('formatVideoFileSize', () => {
        it('formats byte counts accurately', () => {
            expect(formatVideoFileSize(0)).toBe('0 B');
            expect(formatVideoFileSize(500)).toBe('500 B');
            expect(formatVideoFileSize(1024)).toBe('1.0 KB');
            expect(formatVideoFileSize(1.5 * 1024 * 1024)).toBe('1.5 MB');
            expect(formatVideoFileSize(50.25 * 1024 * 1024)).toBe('50.3 MB');
        });
    });
});
