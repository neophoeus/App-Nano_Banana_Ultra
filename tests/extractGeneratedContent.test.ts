import { describe, expect, it } from 'vitest';
import {
    applyLiveProgressChunkToAccumulator,
    createLiveProgressAccumulatorState,
    extractGeneratedContent,
    extractStreamCompletionContent,
} from '../plugins/routes/generateRoutes';

const ONE_BY_ONE_PNG_BASE64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+kvvYAAAAASUVORK5CYII=';

function createResponse(parts: Array<Record<string, unknown>>, finishReason: string = 'STOP') {
    return {
        candidates: [
            {
                finishReason,
                content: {
                    parts,
                },
            },
        ],
    };
}

describe('extractGeneratedContent', () => {
    it('separates image, visible text, and thought parts from the same candidate', () => {
        const extracted = extractGeneratedContent(
            createResponse([
                {
                    text: 'Internal reasoning',
                    thought: true,
                    thoughtSignature: 'sig-1',
                },
                {
                    text: '{"summary":"Visible structured text"}',
                },
                {
                    inlineData: {
                        mimeType: 'image/png',
                        data: ONE_BY_ONE_PNG_BASE64,
                    },
                },
            ]),
        );

        expect(extracted.imageUrl).toBe(`data:image/png;base64,${ONE_BY_ONE_PNG_BASE64}`);
        expect(extracted.text).toBe('{"summary":"Visible structured text"}');
        expect(extracted.thoughts).toBe('Internal reasoning');
        expect(extracted.thoughtSignaturePresent).toBe(true);
        expect(extracted.thoughtSignature).toBe('sig-1');
        expect(extracted.candidateCount).toBe(1);
        expect(extracted.partCount).toBe(3);
        expect(extracted.imagePartCount).toBe(1);
        expect(extracted.extractionIssue).toBeUndefined();
    });

    it('keeps visible text empty when the response only contains thought parts', () => {
        const extracted = extractGeneratedContent(
            createResponse([
                {
                    text: 'Thought-only reasoning',
                    thought: true,
                    thoughtSignature: 'sig-thought-only',
                },
            ]),
        );

        expect(extracted.text).toBeUndefined();
        expect(extracted.thoughts).toBe('Thought-only reasoning');
        expect(extracted.thoughtSignaturePresent).toBe(true);
        expect(extracted.thoughtSignature).toBe('sig-thought-only');
    });

    it('captures visible text even when a thought part appears before it', () => {
        const extracted = extractGeneratedContent(
            createResponse([
                {
                    text: 'Thought comes first',
                    thought: true,
                },
                {
                    text: 'Visible description arrives second',
                },
            ]),
        );

        expect(extracted.text).toBe('Visible description arrives second');
        expect(extracted.thoughts).toBe('Thought comes first');
        expect(extracted.partCount).toBe(2);
    });

    it('reports no-image-data when a response contains thoughts but no image bytes', () => {
        const extracted = extractGeneratedContent(
            createResponse([
                {
                    text: 'Thought-only reasoning',
                    thought: true,
                },
                {
                    text: 'Visible text without image bytes',
                },
            ]),
        );

        expect(extracted.imageUrl).toBeUndefined();
        expect(extracted.text).toBe('Visible text without image bytes');
        expect(extracted.thoughts).toBe('Thought-only reasoning');
        expect(extracted.imagePartCount).toBe(0);
        expect(extracted.extractionIssue).toBe('no-image-data');
        expect(extracted.finishReason).toBe('STOP');
    });

    it('uses accumulated streamed artifacts when the final chunk only contains a hidden thought signature', () => {
        let state = createLiveProgressAccumulatorState();
        const firstChunk = createResponse([
            {
                text: 'Live reasoning before the render',
                thought: true,
            },
            {
                inlineData: {
                    mimeType: 'image/png',
                    data: ONE_BY_ONE_PNG_BASE64,
                },
                thought: true,
            },
            {
                inlineData: {
                    mimeType: 'image/png',
                    data: ONE_BY_ONE_PNG_BASE64,
                },
            },
        ]);
        const finalChunk = createResponse([
            {
                thoughtSignature: 'sig-final-only',
            },
        ]);

        state = applyLiveProgressChunkToAccumulator(state, firstChunk).state;
        state = applyLiveProgressChunkToAccumulator(state, finalChunk).state;

        const extracted = extractStreamCompletionContent(state, finalChunk);

        expect(extracted.imageUrl).toBe(`data:image/png;base64,${ONE_BY_ONE_PNG_BASE64}`);
        expect(extracted.thoughts).toBe('Live reasoning before the render');
        expect(extracted.resultParts).toEqual([
            {
                sequence: 0,
                kind: 'thought-text',
                text: 'Live reasoning before the render',
            },
            {
                sequence: 1,
                kind: 'thought-image',
                imageUrl: `data:image/png;base64,${ONE_BY_ONE_PNG_BASE64}`,
                mimeType: 'image/png',
            },
            {
                sequence: 2,
                kind: 'output-image',
                imageUrl: `data:image/png;base64,${ONE_BY_ONE_PNG_BASE64}`,
                mimeType: 'image/png',
            },
        ]);
        expect(extracted.thoughtSignaturePresent).toBe(true);
        expect(extracted.thoughtImagePartCount).toBe(1);
        expect(extracted.outputImagePartCount).toBe(1);
        expect(extracted.extractionIssue).toBeUndefined();
    });

    it('preserves accumulated thought artifacts even when no final output image ever arrives', () => {
        let state = createLiveProgressAccumulatorState();
        const firstChunk = createResponse([
            {
                text: 'Visible thinking survives the failed render',
                thought: true,
            },
            {
                inlineData: {
                    mimeType: 'image/png',
                    data: ONE_BY_ONE_PNG_BASE64,
                },
                thought: true,
            },
        ]);
        const finalChunk = createResponse([
            {
                thoughtSignature: 'sig-thought-only-final',
            },
        ]);

        state = applyLiveProgressChunkToAccumulator(state, firstChunk).state;
        state = applyLiveProgressChunkToAccumulator(state, finalChunk).state;

        const extracted = extractStreamCompletionContent(state, finalChunk);

        expect(extracted.imageUrl).toBeUndefined();
        expect(extracted.thoughts).toBe('Visible thinking survives the failed render');
        expect(extracted.resultParts).toEqual([
            {
                sequence: 0,
                kind: 'thought-text',
                text: 'Visible thinking survives the failed render',
            },
            {
                sequence: 1,
                kind: 'thought-image',
                imageUrl: `data:image/png;base64,${ONE_BY_ONE_PNG_BASE64}`,
                mimeType: 'image/png',
            },
        ]);
        expect(extracted.thoughtImagePartCount).toBe(1);
        expect(extracted.outputImagePartCount).toBe(0);
        expect(extracted.extractionIssue).toBe('no-image-data');
    });
});
