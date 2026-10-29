import { describe, expect, it } from 'vitest';
import { buildConversationHistory, buildConversationHistoryWithMetadata } from '../plugins/utils/conversationHistory';

const RESOLVED_DIR = 'd:/OneDrive/7_AI@neo.genymt.gmail/Projects/App-Nano_Banana_Ultra/output';
const GIF_DATA = 'R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

describe('buildConversationHistory', () => {
    it('attaches the stored thought signature to the replayed model image part', () => {
        const history = buildConversationHistory(
            {
                conversationId: 'conversation-1',
                branchOriginId: 'root-turn',
                activeSourceHistoryId: 'turn-1',
                priorTurns: [
                    {
                        historyId: 'turn-1',
                        prompt: 'Update the poster copy',
                        sourceImage: {
                            dataUrl: `data:image/gif;base64,${GIF_DATA}`,
                            mimeType: 'image/gif',
                        },
                        outputImage: {
                            dataUrl: `data:image/gif;base64,${GIF_DATA}`,
                            mimeType: 'image/gif',
                        },
                        text: 'Poster updated',
                        thoughts: null,
                        thoughtSignature: 'sig-1',
                    },
                ],
            },
            RESOLVED_DIR,
        );

        expect(history).toEqual([
            {
                role: 'user',
                parts: [
                    {
                        inlineData: {
                            mimeType: 'image/gif',
                            data: GIF_DATA,
                        },
                    },
                    { text: 'Update the poster copy' },
                ],
            },
            {
                role: 'model',
                parts: [
                    {
                        inlineData: {
                            mimeType: 'image/gif',
                            data: GIF_DATA,
                        },
                        thoughtSignature: 'sig-1',
                    },
                    { text: 'Poster updated' },
                ],
            },
        ]);
    });

    it('uses the official validator-bypass signature for legacy turns that have no stored signature', () => {
        const history = buildConversationHistory(
            {
                conversationId: 'conversation-1',
                branchOriginId: 'root-turn',
                activeSourceHistoryId: 'turn-legacy',
                priorTurns: [
                    {
                        historyId: 'turn-legacy',
                        prompt: 'Make the label gold foil',
                        sourceImage: {
                            dataUrl: `data:image/gif;base64,${GIF_DATA}`,
                            mimeType: 'image/gif',
                        },
                        outputImage: {
                            dataUrl: `data:image/gif;base64,${GIF_DATA}`,
                            mimeType: 'image/gif',
                        },
                        text: 'Gold foil label applied',
                        thoughts: null,
                        thoughtSignature: null,
                    },
                ],
            },
            RESOLVED_DIR,
        );

        expect(history[1].parts[0]).toEqual({
            inlineData: {
                mimeType: 'image/gif',
                data: GIF_DATA,
            },
            thoughtSignature: 'skip_thought_signature_validator',
        });
    });

    it('deduplicates adjacent-turn duplicate source image in sequential multi-turn history', () => {
        const turn1Output = 'IMAGE_DATA_TURN1';
        const turn2Output = 'IMAGE_DATA_TURN2';

        const history = buildConversationHistory(
            {
                conversationId: 'conversation-2',
                branchOriginId: 'root-turn',
                activeSourceHistoryId: 'turn-2',
                priorTurns: [
                    {
                        historyId: 'turn-1',
                        prompt: 'First edit turn',
                        sourceImage: { dataUrl: `data:image/gif;base64,${GIF_DATA}`, mimeType: 'image/gif' },
                        outputImage: { dataUrl: `data:image/gif;base64,${turn1Output}`, mimeType: 'image/gif' },
                        text: 'First edit done',
                        thoughts: 'Initial reasoning',
                        thoughtSignature: 'sig-turn-1',
                    },
                    {
                        historyId: 'turn-2',
                        prompt: 'Second edit turn continuing from turn 1',
                        // sourceImage is byte-identical to turn 1 outputImage!
                        sourceImage: { dataUrl: `data:image/gif;base64,${turn1Output}`, mimeType: 'image/gif' },
                        outputImage: { dataUrl: `data:image/gif;base64,${turn2Output}`, mimeType: 'image/gif' },
                        text: 'Second edit done',
                        thoughts: 'Second reasoning',
                        thoughtSignature: 'sig-turn-2',
                    },
                ],
            },
            RESOLVED_DIR,
        );

        expect(history).toHaveLength(4);
        // Turn 1 user part has inlineData
        expect(history[0].parts).toHaveLength(2);
        expect(history[0].parts[0]).toHaveProperty('inlineData');

        // Turn 1 model part has output image and signature
        expect(history[1].parts[0]).toMatchObject({
            inlineData: { data: turn1Output },
            thoughtSignature: 'sig-turn-1',
        });

        // Turn 2 user part has sourceImage deduplicated! Only text prompt remains.
        expect(history[2].parts).toEqual([{ text: 'Second edit turn continuing from turn 1' }]);

        // Turn 2 model part has output image and signature
        expect(history[3].parts[0]).toMatchObject({
            inlineData: { data: turn2Output },
            thoughtSignature: 'sig-turn-2',
        });
    });

    it('applies tiered mediaResolution (MEDIUM for older turns, HIGH for anchor turn) on supported models', () => {
        const turn1Output = 'IMAGE_DATA_T1';
        const turn2Output = 'IMAGE_DATA_T2';

        const { history, lastModelOutputImage, deduplicatedSourceImageCount, omittedThoughtTextTurnCount } =
            buildConversationHistoryWithMetadata(
                {
                    conversationId: 'conversation-decay',
                    branchOriginId: 'root-turn',
                    activeSourceHistoryId: 'turn-2',
                    priorTurns: [
                        {
                            historyId: 'turn-1',
                            prompt: 'First turn',
                            sourceImage: { dataUrl: `data:image/gif;base64,${GIF_DATA}`, mimeType: 'image/gif' },
                            outputImage: { dataUrl: `data:image/gif;base64,${turn1Output}`, mimeType: 'image/gif' },
                            text: 'First done',
                            thoughts: 'Long reasoning clauses',
                            thoughtSignature: 'sig-1',
                        },
                        {
                            historyId: 'turn-2',
                            prompt: 'Second turn',
                            sourceImage: { dataUrl: 'data:image/gif;base64,NEW_ANCHOR_SOURCE', mimeType: 'image/gif' },
                            outputImage: { dataUrl: `data:image/gif;base64,${turn2Output}`, mimeType: 'image/gif' },
                            text: 'Second done',
                            thoughts: 'More reasoning clauses',
                            thoughtSignature: 'sig-2',
                        },
                    ],
                },
                RESOLVED_DIR,
                { model: 'gemini-3.1-flash-image' },
            );

        expect(deduplicatedSourceImageCount).toBe(0);
        expect(omittedThoughtTextTurnCount).toBe(2);
        expect(lastModelOutputImage?.data).toBe(turn2Output);

        // Turn 1 (older turn) has MEDIUM resolution (560 tokens) on user sourceImage
        expect(history[0].parts[0]).toMatchObject({
            mediaResolution: { level: 'MEDIA_RESOLUTION_MEDIUM' },
        });

        // Turn 2 (latest anchor turn) has HIGH resolution (1,120 tokens) on user sourceImage
        expect(history[2].parts[0]).toMatchObject({
            mediaResolution: { level: 'MEDIA_RESOLUTION_HIGH' },
        });
    });

    it('retains sourceImage when branch turn source differs from previous output', () => {
        const turn1Output = 'IMAGE_DATA_T1';
        const branchSource = 'DIFFERENT_IMAGE_BRANCH';

        const history = buildConversationHistory(
            {
                conversationId: 'conversation-branch',
                branchOriginId: 'root-turn',
                activeSourceHistoryId: 'turn-2',
                priorTurns: [
                    {
                        historyId: 'turn-1',
                        prompt: 'First turn',
                        sourceImage: { dataUrl: `data:image/gif;base64,${GIF_DATA}`, mimeType: 'image/gif' },
                        outputImage: { dataUrl: `data:image/gif;base64,${turn1Output}`, mimeType: 'image/gif' },
                        text: 'First done',
                        thoughts: null,
                        thoughtSignature: 'sig-1',
                    },
                    {
                        historyId: 'turn-2',
                        prompt: 'Branch from different image',
                        sourceImage: { dataUrl: `data:image/gif;base64,${branchSource}`, mimeType: 'image/gif' },
                        outputImage: { dataUrl: `data:image/gif;base64,${GIF_DATA}`, mimeType: 'image/gif' },
                        text: 'Branch done',
                        thoughts: null,
                        thoughtSignature: 'sig-2',
                    },
                ],
            },
            RESOLVED_DIR,
        );

        // Because sourceImage differed from turn 1 output, it is kept!
        expect(history[2].parts[0]).toMatchObject({
            inlineData: { data: branchSource },
        });
    });

    it('resets deduplication across skipped missing-file turns and falls back on empty deduplicated prompts', () => {
        const turn1Output = 'IMAGE_DATA_T1';
        const turn3Output = 'IMAGE_DATA_T3';

        const result = buildConversationHistoryWithMetadata(
            {
                conversationId: 'conversation-gap',
                branchOriginId: 'root-turn',
                activeSourceHistoryId: 'turn-4-missing',
                priorTurns: [
                    {
                        historyId: 'turn-1',
                        prompt: 'First turn',
                        sourceImage: { dataUrl: `data:image/gif;base64,${GIF_DATA}`, mimeType: 'image/gif' },
                        outputImage: { dataUrl: `data:image/gif;base64,${turn1Output}`, mimeType: 'image/gif' },
                        text: 'First done',
                        thoughts: null,
                        thoughtSignature: 'sig-1',
                    },
                    {
                        historyId: 'turn-2-missing',
                        prompt: 'Missing file turn',
                        sourceImage: { savedFilename: 'non-existent-file-12345.png', mimeType: 'image/png' },
                        outputImage: { dataUrl: `data:image/gif;base64,${GIF_DATA}`, mimeType: 'image/gif' },
                        text: null,
                        thoughts: null,
                        thoughtSignature: 'sig-2',
                    },
                    {
                        historyId: 'turn-3-after-gap',
                        prompt: 'After gap turn',
                        // Matches turn-1 output, but turn-2 was skipped so must NOT be deduplicated!
                        sourceImage: { dataUrl: `data:image/gif;base64,${turn1Output}`, mimeType: 'image/gif' },
                        outputImage: { dataUrl: `data:image/gif;base64,${turn3Output}`, mimeType: 'image/gif' },
                        text: 'Third done',
                        thoughts: null,
                        thoughtSignature: 'sig-3',
                    },
                    {
                        historyId: 'turn-4-empty-prompt',
                        prompt: '   ',
                        // Adjacent to turn-3 output with empty prompt -> deduplicated with non-empty fallback text
                        sourceImage: { dataUrl: `data:image/gif;base64,${turn3Output}`, mimeType: 'image/gif' },
                        outputImage: { dataUrl: `data:image/gif;base64,${GIF_DATA}`, mimeType: 'image/gif' },
                        text: 'Fourth done',
                        thoughts: null,
                        thoughtSignature: 'sig-4',
                    },
                    {
                        historyId: 'turn-5-trailing-missing',
                        prompt: 'Trailing missing file',
                        sourceImage: { savedFilename: 'missing-final-999.png', mimeType: 'image/png' },
                        outputImage: { savedFilename: 'missing-final-out-999.png', mimeType: 'image/png' },
                        text: null,
                        thoughts: null,
                        thoughtSignature: null,
                    },
                ],
            },
            RESOLVED_DIR,
        );

        // Turn 3 after gap retained its sourceImage; Turn 4 adjacent duplicate was deduplicated with fallback text
        expect(result.deduplicatedSourceImageCount).toBe(1);
        expect(result.history[2].parts[0]).toMatchObject({
            inlineData: { data: turn1Output },
        });
        expect(result.history[4].parts).toEqual([{ text: 'Continue editing.' }]);
        // Trailing skipped turn resets lastModelOutputImage to null so current live turn won't deduplicate across gap
        expect(result.lastModelOutputImage).toBeNull();
    });
});
