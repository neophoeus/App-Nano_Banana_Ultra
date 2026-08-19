/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { localBackendProvider } from '../services/providers/localBackendProvider';

describe('LocalBackendProvider', () => {
    beforeEach(() => {
        vi.unstubAllGlobals();
    });

    it('has local provider id', () => {
        expect(localBackendProvider.id).toBe('local');
    });

    it('checks api key via /api/health endpoint', async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);

        const result = await localBackendProvider.checkApiKey();
        expect(result).toBe(true);
        expect(fetchMock).toHaveBeenCalledWith('/api/health');
    });

    it('returns false when /api/health fails', async () => {
        const fetchMock = vi.fn().mockRejectedValue(new Error('Network error'));
        vi.stubGlobal('fetch', fetchMock);

        const result = await localBackendProvider.checkApiKey();
        expect(result).toBe(false);
    });
});
