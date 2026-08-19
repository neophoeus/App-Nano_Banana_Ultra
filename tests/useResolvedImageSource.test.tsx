/** @vitest-environment jsdom */

import { flushSync } from 'react-dom';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useResolvedImageSource } from '../hooks/useResolvedImageSource';
import {
    clearBrowserSavedImageRecords,
    persistBrowserSavedImageRecord,
    resolveDisplayImageSource,
    resolveDisplayImageSourceAsync,
} from '../utils/browserImageStore';

describe('useResolvedImageSource & resolveDisplayImageSource', () => {
    let container: HTMLDivElement;
    let root: Root;
    let latestResolved: string | null = null;

    beforeEach(async () => {
        await clearBrowserSavedImageRecords();
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        latestResolved = null;
    });

    afterEach(() => {
        root.unmount();
        container.remove();
    });

    it('returns standard data URLs and http URLs synchronously without mutation', () => {
        const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        expect(resolveDisplayImageSource(dataUrl)).toBe(dataUrl);

        const httpUrl = 'https://example.com/image.png';
        expect(resolveDisplayImageSource(httpUrl)).toBe(httpUrl);
    });

    it('resolves virtual session-image URL from memory cache synchronously', async () => {
        const sampleDataUrl = 'data:image/png;base64,TEST_INLINE_DATA_URL';
        const virtualUrl = await persistBrowserSavedImageRecord('turn-abc-123.png', sampleDataUrl);

        expect(virtualUrl).toBe('/lite/session-images/turn-abc-123.png');
        expect(resolveDisplayImageSource(virtualUrl)).toBe(sampleDataUrl);
    });

    it('resolves virtual session-image URL via useResolvedImageSource hook', async () => {
        const sampleDataUrl = 'data:image/png;base64,TEST_HOOK_DATA_URL';
        const virtualUrl = await persistBrowserSavedImageRecord('turn-hook-test.png', sampleDataUrl);

        function TestComponent({ src }: { src: string }) {
            latestResolved = useResolvedImageSource(src);
            return <div>{latestResolved}</div>;
        }

        flushSync(() => {
            root.render(<TestComponent src={virtualUrl} />);
        });

        expect(latestResolved).toBe(sampleDataUrl);
    });

    it('resolves browser-img:// virtual protocol scheme', async () => {
        const sampleDataUrl = 'data:image/png;base64,TEST_BROWSER_IMG';
        await persistBrowserSavedImageRecord('turn-schema.png', sampleDataUrl);

        const schemeUrl = 'browser-img://turn-schema.png';
        expect(resolveDisplayImageSource(schemeUrl)).toBe(sampleDataUrl);

        const asyncResolved = await resolveDisplayImageSourceAsync(schemeUrl);
        expect(asyncResolved).toBe(sampleDataUrl);
    });
});

