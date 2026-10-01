/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    clearBrowserSavedImageRecords,
    getBrowserSavedImageStorageKey,
    loadBrowserSavedImageDataUrl,
} from '../utils/browserImageStore';
import { buildSavedImageLoadUrl, loadFullImage, loadImageMetadata, saveImageToLocal } from '../utils/imageSaveUtils';
import { setExecutionModeSetting } from '../utils/workspaceExecutionMode';

describe('imageSaveUtils browser persistence', () => {
    beforeEach(async () => {
        localStorage.clear();
        sessionStorage.clear();
        setExecutionModeSetting('direct');
        await clearBrowserSavedImageRecords();
        vi.restoreAllMocks();
    });

    afterEach(async () => {
        await clearBrowserSavedImageRecords();
        vi.unstubAllGlobals();
    });

    it('keeps saved images in session memory without calling server routes or durable browser storage', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        const savedPath = await saveImageToLocal(
            'data:image/png;base64,PRIMARY',
            'gemini',
            { prompt: 'Browser-only persistence' },
            'browser-only-save',
        );

        expect(savedPath).toBe('/lite/session-images/browser-only-save.png');
        expect(buildSavedImageLoadUrl('browser-only-save.png')).toBe('/lite/session-images/browser-only-save.png');
        await expect(loadFullImage('browser-only-save.png')).resolves.toBe('data:image/png;base64,PRIMARY');
        await expect(loadImageMetadata('browser-only-save.png')).resolves.toMatchObject({
            prompt: 'Browser-only persistence',
            filename: 'browser-only-save.png',
            timestamp: expect.any(String),
        });
        expect(localStorage.getItem(getBrowserSavedImageStorageKey('browser-only-save.png'))).toBeNull();
        expect(sessionStorage.getItem(getBrowserSavedImageStorageKey('browser-only-save.png'))).toBeNull();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('can still read legacy saved image urls from persistent localStorage records', async () => {
        localStorage.setItem(
            'nbu_browserSavedImage:restored-image.png',
            JSON.stringify({
                dataUrl: 'data:image/png;base64,RESTORED',
                metadata: { prompt: 'Restored record' },
                savedAt: Date.now(),
            }),
        );

        expect(buildSavedImageLoadUrl('restored-image.png')).toBe('/lite/session-images/restored-image.png');
        await expect(loadBrowserSavedImageDataUrl('restored-image.png')).resolves.toBe(
            'data:image/png;base64,RESTORED',
        );
    });
});
