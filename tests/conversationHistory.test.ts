import { describe, expect, it } from 'vitest';
import { buildConversationHistory } from '../plugins/utils/conversationHistory';

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
});