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

    it('executes batch slots sequentially and notifies progress in order', async () => {
        const events: string[] = [];
        const fetchMock = vi.fn().mockImplementation(async (url: string) => {
            if (url.includes('/api/health')) {
                return new Response(JSON.stringify({ ok: true }), { status: 200 });
            }
            if (url.includes('/api/images/generate')) {
                return new Response(
                    JSON.stringify({
                        candidates: [
                            {
                                content: {
                                    parts: [
                                        {
                                            inlineData: {
                                                mimeType: 'image/png',
                                                data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                                            },
                                        },
                                    ],
                                },
                            },
                        ],
                    }),
                    { status: 200 },
                );
            }
            return new Response('Not found', { status: 404 });
        });
        vi.stubGlobal('fetch', fetchMock);

        const results = await localBackendProvider.generateImages(
            {
                prompt: 'Test prompt',
                aspectRatio: '1:1',
                imageSize: '1K',
                style: 'None',
                model: 'gemini-3.1-flash-image',
            },
            2,
            {
                onSlotStart: (slotIndex) => {
                    events.push(`start-${slotIndex}`);
                },
                onProgress: (completed, total) => {
                    events.push(`progress-${completed}/${total}`);
                },
                onResult: (res) => {
                    events.push(`result-${res.slotIndex}`);
                },
            },
        );

        expect(results).toHaveLength(2);
        expect(events).toEqual(['start-0', 'progress-1/2', 'result-0', 'start-1', 'progress-2/2', 'result-1']);
    });
});
