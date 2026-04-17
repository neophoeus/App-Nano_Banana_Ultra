import { describe, expect, it, vi } from 'vitest';

vi.mock('@google/genai', () => ({
    GoogleGenAI: class MockGoogleGenAI {},
    HarmBlockThreshold: { BLOCK_NONE: 'BLOCK_NONE' },
    HarmCategory: {
        HARM_CATEGORY_HARASSMENT: 'harassment',
        HARM_CATEGORY_HATE_SPEECH: 'hate',
        HARM_CATEGORY_SEXUALLY_EXPLICIT: 'sexual',
        HARM_CATEGORY_DANGEROUS_CONTENT: 'danger',
    },
}));

import { extractGeneratedContent } from '../plugins/routes/generateRoutes';

function createPngBase64(width: number, height: number): string {
    const buffer = Buffer.alloc(24);
    buffer[0] = 0x89;
    buffer.write('PNG', 1, 'ascii');
    buffer[4] = 0x0d;
    buffer[5] = 0x0a;
    buffer[6] = 0x1a;
    buffer[7] = 0x0a;
    buffer.writeUInt32BE(width, 16);
    buffer.writeUInt32BE(height, 20);
    return buffer.toString('base64');
}

describe('extractGeneratedContent', () => {
    it('prefers the largest returned inline image part', () => {
        const previewImage = createPngBase64(1024, 1024);
        const finalImage = createPngBase64(4096, 4096);

        const extracted = extractGeneratedContent({
            candidates: [
                {
                    content: {
                        parts: [
                            {
                                inlineData: {
                                    mimeType: 'image/png',
                                    data: previewImage,
                                },
                            },
                            {
                                text: 'Reasoning trace',
                                thought: true,
                            },
                            {
                                inlineData: {
                                    mimeType: 'image/png',
                                    data: finalImage,
                                },
                            },
                        ],
                    },
                    finishReason: 'STOP',
                    safetyRatings: [],
                },
            ],
        });

        expect(extracted.imageUrl).toBe(`data:image/png;base64,${finalImage}`);
        expect(extracted.imageDimensions).toEqual({ width: 4096, height: 4096 });
        expect(extracted.thoughts).toBe('Reasoning trace');
        expect(extracted.candidateCount).toBe(1);
        expect(extracted.partCount).toBe(3);
        expect(extracted.imagePartCount).toBe(2);
        expect(extracted.extractionIssue).toBeUndefined();
    });

    it('accepts wrapped batch responses with snake_case image fields', () => {
        const batchImage = createPngBase64(2048, 1024);

        const extracted = extractGeneratedContent({
            response: {
                candidates: [
                    {
                        content: {
                            parts: [
                                {
                                    inline_data: {
                                        mime_type: 'image/png',
                                        data: batchImage,
                                    },
                                    thought_signature: 'sig-batch-1',
                                },
                            ],
                        },
                        finish_reason: 'STOP',
                        safety_ratings: [{ category: 'SAFE' }],
                    },
                ],
            },
        });

        expect(extracted.imageUrl).toBe(`data:image/png;base64,${batchImage}`);
        expect(extracted.imageDimensions).toEqual({ width: 2048, height: 1024 });
        expect(extracted.thoughtSignaturePresent).toBe(true);
        expect(extracted.thoughtSignature).toBe('sig-batch-1');
        expect(extracted.finishReason).toBe('STOP');
        expect(extracted.imagePartCount).toBe(1);
    });

    it('can recover image data from later candidates when the first candidate is empty', () => {
        const fallbackImage = createPngBase64(1536, 1536);

        const extracted = extractGeneratedContent({
            candidates: [
                {
                    content: {
                        parts: [],
                    },
                    finishReason: 'STOP',
                },
                {
                    content: {
                        parts: [
                            {
                                inlineData: {
                                    mimeType: 'image/png',
                                    data: fallbackImage,
                                },
                            },
                        ],
                    },
                    finishReason: 'STOP',
                },
            ],
        });

        expect(extracted.imageUrl).toBe(`data:image/png;base64,${fallbackImage}`);
        expect(extracted.candidateCount).toBe(2);
        expect(extracted.partCount).toBe(1);
        expect(extracted.imagePartCount).toBe(1);
        expect(extracted.extractionIssue).toBeUndefined();
    });

    it('reads prompt block reasons from wrapped prompt feedback payloads', () => {
        const extracted = extractGeneratedContent({
            response: {
                prompt_feedback: {
                    block_reason: 'PROHIBITED_CONTENT',
                },
            },
        });

        expect(extracted.promptBlockReason).toBe('PROHIBITED_CONTENT');
        expect(extracted.candidateCount).toBe(0);
        expect(extracted.extractionIssue).toBe('missing-candidates');
    });
});
