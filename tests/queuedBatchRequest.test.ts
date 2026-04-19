import { afterEach, describe, expect, it, vi } from 'vitest';
import { submitQueuedBatchJob } from '../services/geminiService';
import { buildStyleAwareImagePrompt } from '../utils/stylePromptBuilder';
import { buildStyleTransferPrompt } from '../utils/styleRegistry';

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
                        hasImportablePayload: false,
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

    it('applies the shared style-aware prompt builder to queued batch requests', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            new Response(
                JSON.stringify({
                    job: {
                        name: 'batches/test-style-job',
                        displayName: 'test style job',
                        state: 'JOB_STATE_PENDING',
                        model: 'gemini-3.1-flash-image-preview',
                        hasImportablePayload: false,
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
            style: 'Digital Illustration',
            model: 'gemini-3.1-flash-image-preview',
            outputFormat: 'images-only',
            temperature: 1,
            thinkingLevel: 'minimal',
            includeThoughts: false,
            googleSearch: false,
            imageSearch: false,
            requestCount: 1,
        });

        const [, init] = fetchMock.mock.calls[0];
        const requestBody = JSON.parse(String(init?.body));

        expect(requestBody.prompt).toBe(
            buildStyleAwareImagePrompt({
                prompt: 'Create a queued image batch',
                aspectRatio: '1:1',
                imageSize: '1K',
                style: 'Digital Illustration',
                model: 'gemini-3.1-flash-image-preview',
                outputFormat: 'images-only',
                temperature: 1,
                thinkingLevel: 'minimal',
                includeThoughts: false,
                googleSearch: false,
                imageSearch: false,
            }),
        );
    });

    it('does not re-wrap explicit style-transfer prompts in queued batch requests', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            new Response(
                JSON.stringify({
                    job: {
                        name: 'batches/test-transfer-job',
                        displayName: 'test transfer job',
                        state: 'JOB_STATE_PENDING',
                        model: 'gemini-3.1-flash-image-preview',
                        hasImportablePayload: false,
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
            prompt: buildStyleTransferPrompt('Digital Illustration'),
            aspectRatio: '1:1',
            imageSize: '1K',
            style: 'Digital Illustration',
            model: 'gemini-3.1-flash-image-preview',
            outputFormat: 'images-only',
            temperature: 1,
            thinkingLevel: 'minimal',
            includeThoughts: false,
            googleSearch: false,
            imageSearch: false,
            objectImageInputs: ['data:image/png;base64,REF'],
            requestCount: 1,
        });

        const [, init] = fetchMock.mock.calls[0];
        const requestBody = JSON.parse(String(init?.body));

        expect(requestBody.prompt).toBe(buildStyleTransferPrompt('Digital Illustration'));
    });
});
