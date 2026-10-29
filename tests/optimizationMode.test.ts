import { describe, expect, it } from 'vitest';
import {
    ECO_IMAGE_TO_PROMPT_MAX_DIMENSION,
    ECO_MAX_CONVERSATION_TURNS,
    normalizeOptimizationMode,
    QUALITY_IMAGE_TO_PROMPT_MAX_DIMENSION,
    resolveEffectiveGenerationThinking,
    resolveEffectivePromptThinkingLevel,
    resolveImageToPromptMaxDimension,
} from '../utils/optimizationMode';
import { PART_MEDIA_RESOLUTION_LEVEL, resolveRoleMediaResolution } from '../plugins/utils/mediaResolution';
import { buildConversationHistoryWithMetadata } from '../plugins/utils/conversationHistory';
import { buildImageRequestConfig } from '../plugins/utils/requestConfig';
import type { ConversationRequestContext } from '../types';

describe('optimizationMode domain logic and contracts', () => {
    describe('normalizeOptimizationMode', () => {
        it('normalizes valid and fallback values', () => {
            expect(normalizeOptimizationMode('eco')).toBe('eco');
            expect(normalizeOptimizationMode('quality')).toBe('quality');
            expect(normalizeOptimizationMode('')).toBe('quality');
            expect(normalizeOptimizationMode(null)).toBe('quality');
            expect(normalizeOptimizationMode(undefined)).toBe('quality');
            expect(normalizeOptimizationMode('unknown')).toBe('quality');
        });
    });

    describe('resolveEffectiveGenerationThinking', () => {
        it('converges to minimal thinking and suppresses thoughts in eco mode for flash models', () => {
            const result = resolveEffectiveGenerationThinking({
                model: 'gemini-3.1-flash-image',
                thinkingLevel: 'high',
                includeThoughts: true,
                optimizationMode: 'eco',
            });
            expect(result).toEqual({
                thinkingLevel: 'minimal',
                includeThoughts: false,
            });
        });

        it('converges to disabled thinking and suppresses thoughts in eco mode for pro models', () => {
            const result = resolveEffectiveGenerationThinking({
                model: 'gemini-3-pro-image',
                thinkingLevel: 'disabled',
                includeThoughts: true,
                optimizationMode: 'eco',
            });
            expect(result).toEqual({
                thinkingLevel: 'disabled',
                includeThoughts: false,
            });
        });

        it('converges to minimal thinking in eco mode for nano-banana-2.1', () => {
            const result = resolveEffectiveGenerationThinking({
                model: 'gemini-nano-banana-2.1',
                thinkingLevel: 'high',
                includeThoughts: true,
                optimizationMode: 'eco',
            });
            expect(result).toEqual({
                thinkingLevel: 'minimal',
                includeThoughts: false,
            });
        });

        it('preserves user thinking preferences in quality mode', () => {
            const flashResult = resolveEffectiveGenerationThinking({
                model: 'gemini-3.1-flash-image',
                thinkingLevel: 'high',
                includeThoughts: true,
                optimizationMode: 'quality',
            });
            expect(flashResult).toEqual({
                thinkingLevel: 'high',
                includeThoughts: true,
            });

            const proResult = resolveEffectiveGenerationThinking({
                model: 'gemini-3-pro-image',
                thinkingLevel: 'disabled',
                includeThoughts: true,
                optimizationMode: 'quality',
            });
            expect(proResult).toEqual({
                thinkingLevel: 'disabled',
                includeThoughts: true,
            });
        });
    });

    describe('resolveEffectivePromptThinkingLevel', () => {
        it('converges prompt tools to low thinking in eco mode', () => {
            expect(resolveEffectivePromptThinkingLevel('high', 'eco')).toBe('low');
            expect(resolveEffectivePromptThinkingLevel('medium', 'eco')).toBe('low');
            expect(resolveEffectivePromptThinkingLevel('low', 'eco')).toBe('low');
        });

        it('retains user prompt thinking level in quality mode', () => {
            expect(resolveEffectivePromptThinkingLevel('high', 'quality')).toBe('high');
            expect(resolveEffectivePromptThinkingLevel('medium', 'quality')).toBe('medium');
            expect(resolveEffectivePromptThinkingLevel('low', 'quality')).toBe('low');
            expect(resolveEffectivePromptThinkingLevel(null, 'quality')).toBe('low');
        });
    });

    describe('resolveImageToPromptMaxDimension', () => {
        it('returns 2048 for eco mode and 3072 for quality mode', () => {
            expect(resolveImageToPromptMaxDimension('eco')).toBe(ECO_IMAGE_TO_PROMPT_MAX_DIMENSION);
            expect(resolveImageToPromptMaxDimension('eco')).toBe(2048);
            expect(resolveImageToPromptMaxDimension('quality')).toBe(QUALITY_IMAGE_TO_PROMPT_MAX_DIMENSION);
            expect(resolveImageToPromptMaxDimension('quality')).toBe(3072);
        });
    });

    describe('resolveRoleMediaResolution in Quality vs. Eco modes', () => {
        it('compresses character references from ULTRA_HIGH to HIGH in eco mode', () => {
            const qualityRes = resolveRoleMediaResolution({
                model: 'gemini-3.1-flash-image',
                role: 'character',
                optimizationMode: 'quality',
            });
            expect(qualityRes).toEqual({ level: PART_MEDIA_RESOLUTION_LEVEL.ULTRA_HIGH });

            const ecoRes = resolveRoleMediaResolution({
                model: 'gemini-3.1-flash-image',
                role: 'character',
                optimizationMode: 'eco',
            });
            expect(ecoRes).toEqual({ level: PART_MEDIA_RESOLUTION_LEVEL.HIGH });
        });

        it('compresses 4K edit and source references from ULTRA_HIGH to HIGH in eco mode', () => {
            const quality4K = resolveRoleMediaResolution({
                model: 'gemini-3.1-flash-image',
                role: 'edit',
                imageSize: '4K',
                optimizationMode: 'quality',
            });
            expect(quality4K).toEqual({ level: PART_MEDIA_RESOLUTION_LEVEL.ULTRA_HIGH });

            const eco4K = resolveRoleMediaResolution({
                model: 'gemini-3.1-flash-image',
                role: 'edit',
                imageSize: '4K',
                optimizationMode: 'eco',
            });
            expect(eco4K).toEqual({ level: PART_MEDIA_RESOLUTION_LEVEL.HIGH });

            const eco2K = resolveRoleMediaResolution({
                model: 'gemini-3.1-flash-image',
                role: 'edit',
                imageSize: '2K',
                optimizationMode: 'eco',
            });
            expect(eco2K).toEqual({ level: PART_MEDIA_RESOLUTION_LEVEL.MEDIUM });
        });

        it('compresses object references and history anchors to MEDIUM in eco mode', () => {
            const objEco = resolveRoleMediaResolution({
                model: 'gemini-3.1-flash-image',
                role: 'object',
                optimizationMode: 'eco',
            });
            expect(objEco).toEqual({ level: PART_MEDIA_RESOLUTION_LEVEL.MEDIUM });

            const anchorEco = resolveRoleMediaResolution({
                model: 'gemini-3.1-flash-image',
                role: 'history-anchor',
                optimizationMode: 'eco',
            });
            expect(anchorEco).toEqual({ level: PART_MEDIA_RESOLUTION_LEVEL.MEDIUM });
        });

        it('compresses style references and history decay turns to LOW in eco mode', () => {
            const styleEco = resolveRoleMediaResolution({
                model: 'gemini-3-pro-image',
                role: 'style',
                optimizationMode: 'eco',
            });
            expect(styleEco).toEqual({ level: PART_MEDIA_RESOLUTION_LEVEL.LOW });

            const decayEco = resolveRoleMediaResolution({
                model: 'gemini-3.1-flash-image',
                role: 'history-decay',
                optimizationMode: 'eco',
            });
            expect(decayEco).toEqual({ level: PART_MEDIA_RESOLUTION_LEVEL.LOW });
        });

        it('keeps video references at LOW across both modes', () => {
            const videoQuality = resolveRoleMediaResolution({
                model: 'gemini-nano-banana-2.1',
                role: 'video',
                optimizationMode: 'quality',
            });
            const videoEco = resolveRoleMediaResolution({
                model: 'gemini-nano-banana-2.1',
                role: 'video',
                optimizationMode: 'eco',
            });
            expect(videoQuality).toEqual({ level: PART_MEDIA_RESOLUTION_LEVEL.LOW });
            expect(videoEco).toEqual({ level: PART_MEDIA_RESOLUTION_LEVEL.LOW });
        });

        it('returns undefined for models lacking per-part resolution in both modes', () => {
            expect(
                resolveRoleMediaResolution({
                    model: 'gemini-2.5-flash-image',
                    role: 'character',
                    optimizationMode: 'eco',
                }),
            ).toBeUndefined();
            expect(
                resolveRoleMediaResolution({
                    model: 'gemini-2.5-flash-image',
                    role: 'character',
                    optimizationMode: 'quality',
                }),
            ).toBeUndefined();
        });
    });

    describe('buildConversationHistoryWithMetadata in Eco mode', () => {
        const dummyBase64 = (marker: string) =>
            `data:image/png;base64,${Buffer.from(`image-${marker}`).toString('base64')}`;

        const createMockConversationContext = (turnCount: number): ConversationRequestContext => ({
            conversationId: 'conv-eco-test',
            branchOriginId: 'root-turn',
            activeSourceHistoryId: `history-turn-${turnCount}`,
            priorTurns: Array.from({ length: turnCount }, (_, i) => ({
                historyId: `turn-${i + 1}`,
                prompt: `Prompt for turn ${i + 1}`,
                sourceImage: { dataUrl: dummyBase64(`src-${i + 1}`) },
                outputImage: { dataUrl: dummyBase64(`out-${i + 1}`) },
                text: null,
                thoughtSignature: `sig-${i + 1}`,
                thoughts: `Thought for turn ${i + 1}`,
            })),
        });

        it('retains all turns in quality mode', () => {
            const context = createMockConversationContext(4);
            const result = buildConversationHistoryWithMetadata(context, '/tmp/test', {
                model: 'gemini-3.1-flash-image',
                optimizationMode: 'quality',
            });

            expect(result.truncatedTurnCount).toBe(0);
            expect(result.history).toHaveLength(8); // 4 user + 4 model parts
            expect(result.lastModelOutputImage?.data).toBe(Buffer.from('image-out-4').toString('base64'));
        });

        it(`truncates older turns to the latest ${ECO_MAX_CONVERSATION_TURNS} turns in eco mode while retaining boundary image and signatures`, () => {
            const context = createMockConversationContext(4);
            const result = buildConversationHistoryWithMetadata(context, '/tmp/test', {
                model: 'gemini-3.1-flash-image',
                optimizationMode: 'eco',
            });

            expect(result.truncatedTurnCount).toBe(2);
            expect(result.history).toHaveLength(4); // 2 user + 2 model parts

            // First retained user turn is turn 3: it must retain its sourceImage as anchor
            const firstUserPart = result.history[0].parts;
            expect(firstUserPart[0]).toMatchObject({
                inlineData: {
                    data: Buffer.from('image-src-3').toString('base64'),
                    mimeType: 'image/png',
                },
                mediaResolution: { level: PART_MEDIA_RESOLUTION_LEVEL.LOW },
            });
            expect(firstUserPart[1]).toEqual({ text: 'Prompt for turn 3' });

            // First retained model turn is turn 3: contains outputImage and thoughtSignature
            const firstModelPart = result.history[1].parts;
            expect(firstModelPart[0]).toEqual({
                inlineData: {
                    data: Buffer.from('image-out-3').toString('base64'),
                    mimeType: 'image/png',
                },
                thoughtSignature: 'sig-3',
            });

            // Second retained user turn is turn 4 (latest anchor):
            const secondUserPart = result.history[2].parts;
            expect(secondUserPart[0]).toMatchObject({
                inlineData: {
                    data: Buffer.from('image-src-4').toString('base64'),
                    mimeType: 'image/png',
                },
                mediaResolution: { level: PART_MEDIA_RESOLUTION_LEVEL.MEDIUM },
            });

            // Second retained model turn:
            const secondModelPart = result.history[3].parts;
            expect(secondModelPart[0]).toEqual({
                inlineData: {
                    data: Buffer.from('image-out-4').toString('base64'),
                    mimeType: 'image/png',
                },
                thoughtSignature: 'sig-4',
            });

            expect(result.lastModelOutputImage?.data).toBe(Buffer.from('image-out-4').toString('base64'));
        });
    });

    describe('buildImageRequestConfig preserves user output resolution', () => {
        it('preserves user-selected 4K, 2K, and 1K imageSize while converging thinking in eco mode', () => {
            const config4K = buildImageRequestConfig('gemini-3.1-flash-image', {
                imageSize: '4K',
                thinkingLevel: 'high',
                includeThoughts: true,
                optimizationMode: 'eco',
            });
            expect(config4K.requestConfig.imageConfig).toEqual({ imageSize: '4K' });
            expect(config4K.effectiveThinkingLevel).toBe('minimal');
            expect(config4K.shouldIncludeThoughts).toBe(false);

            const config2K = buildImageRequestConfig('gemini-3-pro-image', {
                imageSize: '2K',
                thinkingLevel: 'disabled',
                includeThoughts: true,
                optimizationMode: 'eco',
            });
            expect(config2K.requestConfig.imageConfig).toEqual({ imageSize: '2K' });
            expect(config2K.effectiveThinkingLevel).toBe('disabled');
            expect(config2K.shouldIncludeThoughts).toBe(false);

            const config1K = buildImageRequestConfig('gemini-nano-banana-2.1', {
                imageSize: '1K',
                thinkingLevel: 'high',
                includeThoughts: true,
                optimizationMode: 'eco',
            });
            expect(config1K.requestConfig.imageConfig).toEqual({ imageSize: '1K' });
            expect(config1K.effectiveThinkingLevel).toBe('minimal');
            expect(config1K.shouldIncludeThoughts).toBe(false);
        });
    });
});
