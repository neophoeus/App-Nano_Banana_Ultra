import { afterEach, describe, expect, it, vi } from 'vitest';
import { submitQueuedBatchJob } from '../services/geminiService';

describe('submitQueuedBatchJob', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('omits imageSize for gemini-2.5-flash-image queued batch requests', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            new Response(
                JSON.stringify({
                    job: {
                        name: 'batches/test-job',
                        displayName: 'test job',
                        state: 'JOB_STATE_PENDING',
                        model: 'gemini-2.5-flash-image',
                        hasInlinedResponses: false,
                    },
                }),
                {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                },
            ),
        );
        vi.stubGlobal('fetch', fetchMock);

        await submitQueuedBatchJob({
            prompt: 'Create a queued image batch',
            aspectRatio: '1:1',
            imageSize: '1K',
            style: 'None',
            model: 'gemini-2.5-flash-image',
            outputFormat: 'images-only',
            temperature: 1,
            thinkingLevel: 'disabled',
            includeThoughts: false,
            googleSearch: false,
            imageSearch: false,
            requestCount: 1,
        });

        const [, init] = fetchMock.mock.calls[0];
        const requestBody = JSON.parse(String(init?.body));

        expect(requestBody.imageSize).toBeUndefined();
    });
});
