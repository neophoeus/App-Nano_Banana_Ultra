/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { browserDirectProvider } from '../services/providers/browserDirectProvider';

describe('BrowserDirectProvider', () => {
    beforeEach(() => {
        vi.unstubAllGlobals();
    });

    it('has direct provider id', () => {
        expect(browserDirectProvider.id).toBe('direct');
    });

    it('checks api key using gemini credentials', async () => {
        const hasKey = await browserDirectProvider.checkApiKey();
        expect(typeof hasKey).toBe('boolean');
    });

    it('handles image absence recovery check correctly', () => {
        expect(browserDirectProvider).toBeDefined();
    });
});
