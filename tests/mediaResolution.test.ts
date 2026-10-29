import { describe, expect, it } from 'vitest';
import {
    extractUsageMetadata,
    isSameInlineImage,
    PART_MEDIA_RESOLUTION_LEVEL,
    promptReferencesTag,
    resolveRoleMediaResolution,
    supportsModelPerPartMediaResolution,
} from '../plugins/utils/mediaResolution';

describe('mediaResolution utility', () => {
    describe('supportsModelPerPartMediaResolution', () => {
        it('returns true for Gemini 3 and Gemini 4 family image models', () => {
            expect(supportsModelPerPartMediaResolution('gemini-nano-banana-2.1')).toBe(true);
            expect(supportsModelPerPartMediaResolution('gemini-3.1-flash-image')).toBe(true);
            expect(supportsModelPerPartMediaResolution('gemini-3.1-flash-lite-image')).toBe(true);
            expect(supportsModelPerPartMediaResolution('gemini-3-pro-image')).toBe(true);
            expect(supportsModelPerPartMediaResolution('gemini-3.8-flash')).toBe(true);
        });

        it('supports preview aliases of supported models', () => {
            expect(supportsModelPerPartMediaResolution('gemini-nano-banana-2.1-preview')).toBe(true);
            expect(supportsModelPerPartMediaResolution('gemini-3.1-flash-image-preview')).toBe(true);
            expect(supportsModelPerPartMediaResolution('gemini-3-pro-image-preview')).toBe(true);
        });

        it('returns false for gemini-2.5-flash-image, unknown models, and empty values', () => {
            expect(supportsModelPerPartMediaResolution('gemini-2.5-flash-image')).toBe(false);
            expect(supportsModelPerPartMediaResolution('gemini-2.5-flash-image-preview')).toBe(false);
            expect(supportsModelPerPartMediaResolution('unknown-model')).toBe(false);
            expect(supportsModelPerPartMediaResolution('')).toBe(false);
            expect(supportsModelPerPartMediaResolution(null)).toBe(false);
            expect(supportsModelPerPartMediaResolution(undefined)).toBe(false);
        });
    });

    describe('resolveRoleMediaResolution', () => {
        it('returns undefined when model does not support per-part media resolution', () => {
            expect(
                resolveRoleMediaResolution({
                    model: 'gemini-2.5-flash-image',
                    role: 'character',
                }),
            ).toBeUndefined();

            expect(
                resolveRoleMediaResolution({
                    model: undefined,
                    role: 'character',
                }),
            ).toBeUndefined();
        });

        it('resolves character reference images to ULTRA_HIGH for 4K facial likeness and costume micro-details', () => {
            const resolution = resolveRoleMediaResolution({
                model: 'gemini-nano-banana-2.1',
                role: 'character',
            });
            expect(resolution).toEqual({ level: PART_MEDIA_RESOLUTION_LEVEL.ULTRA_HIGH });
        });

        it('resolves forensic prompt analysis to ULTRA_HIGH', () => {
            const resolution = resolveRoleMediaResolution({
                model: 'gemini-3.8-flash',
                role: 'forensic-prompt',
            });
            expect(resolution).toEqual({ level: PART_MEDIA_RESOLUTION_LEVEL.ULTRA_HIGH });
        });

        it('resolves edit and source inputs to ULTRA_HIGH when requested imageSize is 4K, otherwise HIGH', () => {
            const edit4k = resolveRoleMediaResolution({
                model: 'gemini-3.1-flash-image',
                role: 'edit',
                imageSize: '4K',
            });
            expect(edit4k).toEqual({ level: PART_MEDIA_RESOLUTION_LEVEL.ULTRA_HIGH });

            const edit2k = resolveRoleMediaResolution({
                model: 'gemini-3.1-flash-image',
                role: 'edit',
                imageSize: '2K',
            });
            expect(edit2k).toEqual({ level: PART_MEDIA_RESOLUTION_LEVEL.HIGH });

            const src1k = resolveRoleMediaResolution({
                model: 'gemini-3-pro-image',
                role: 'source',
                imageSize: '1K',
            });
            expect(src1k).toEqual({ level: PART_MEDIA_RESOLUTION_LEVEL.HIGH });
        });

        it('resolves object reference images to HIGH', () => {
            const resolution = resolveRoleMediaResolution({
                model: 'gemini-3.1-flash-image',
                role: 'object',
            });
            expect(resolution).toEqual({ level: PART_MEDIA_RESOLUTION_LEVEL.HIGH });
        });

        it('resolves style reference images to MEDIUM for 50% token savings without visual degradation', () => {
            const resolution = resolveRoleMediaResolution({
                model: 'gemini-3-pro-image',
                role: 'style',
            });
            expect(resolution).toEqual({ level: PART_MEDIA_RESOLUTION_LEVEL.MEDIUM });
        });

        it('resolves video inputs to LOW to keep frames lightweight', () => {
            const resolution = resolveRoleMediaResolution({
                model: 'gemini-nano-banana-2.1',
                role: 'video',
            });
            expect(resolution).toEqual({ level: PART_MEDIA_RESOLUTION_LEVEL.LOW });
        });

        it('resolves multi-turn history anchor turn to HIGH and older turns to MEDIUM for tiered decay', () => {
            const anchor = resolveRoleMediaResolution({
                model: 'gemini-3.1-flash-image',
                role: 'history-anchor',
            });
            expect(anchor).toEqual({ level: PART_MEDIA_RESOLUTION_LEVEL.HIGH });

            const decay = resolveRoleMediaResolution({
                model: 'gemini-3.1-flash-image',
                role: 'history-decay',
            });
            expect(decay).toEqual({ level: PART_MEDIA_RESOLUTION_LEVEL.MEDIUM });
        });
    });

    describe('isSameInlineImage', () => {
        it('returns true when data and mimeType match', () => {
            const img1 = { data: 'BASE64DATAABC', mimeType: 'image/png' };
            const img2 = { data: 'BASE64DATAABC', mimeType: 'image/png' };
            expect(isSameInlineImage(img1, img2)).toBe(true);
        });

        it('returns false when base64 data differs in length or content', () => {
            const img1 = { data: 'BASE64DATAABC', mimeType: 'image/png' };
            const img2 = { data: 'BASE64DATAXYZ', mimeType: 'image/png' };
            const img3 = { data: 'BASE64DATA', mimeType: 'image/png' };
            expect(isSameInlineImage(img1, img2)).toBe(false);
            expect(isSameInlineImage(img1, img3)).toBe(false);
        });

        it('returns false when mimeType differs', () => {
            const img1 = { data: 'BASE64DATAABC', mimeType: 'image/png' };
            const img2 = { data: 'BASE64DATAABC', mimeType: 'image/jpeg' };
            expect(isSameInlineImage(img1, img2)).toBe(false);
        });

        it('safely handles null and undefined values', () => {
            const valid = { data: 'BASE64DATAABC', mimeType: 'image/png' };
            expect(isSameInlineImage(null, valid)).toBe(false);
            expect(isSameInlineImage(valid, undefined)).toBe(false);
            expect(isSameInlineImage(null, null)).toBe(false);
        });
    });

    describe('promptReferencesTag', () => {
        it('returns true when prompt references the given tag', () => {
            expect(promptReferencesTag('Make [Edit_1] look like [Char_1]', '[Edit_1]')).toBe(true);
            expect(promptReferencesTag('Make [Edit_1] look like [Char_1]', '[Char_1]')).toBe(true);
        });

        it('returns false when prompt does not reference tag or is empty', () => {
            expect(promptReferencesTag('A beautiful sunset over the mountains', '[Edit_1]')).toBe(false);
            expect(promptReferencesTag('', '[Edit_1]')).toBe(false);
            expect(promptReferencesTag(null, '[Edit_1]')).toBe(false);
            expect(promptReferencesTag(undefined, '[Edit_1]')).toBe(false);
        });
    });

    describe('extractUsageMetadata', () => {
        it('extracts camelCase usageMetadata from response', () => {
            const response = {
                usageMetadata: {
                    promptTokenCount: 1120,
                    candidatesTokenCount: 840,
                    thoughtsTokenCount: 150,
                    totalTokenCount: 2110,
                    cachedContentTokenCount: 0,
                },
            };
            const extracted = extractUsageMetadata(response);
            expect(extracted).toEqual({
                promptTokenCount: 1120,
                candidatesTokenCount: 840,
                thoughtsTokenCount: 150,
                totalTokenCount: 2110,
                cachedContentTokenCount: 0,
            });
        });

        it('extracts snake_case usage_metadata from response', () => {
            const response = {
                usage_metadata: {
                    prompt_token_count: '2240',
                    candidates_token_count: '1000',
                    thoughts_token_count: '200',
                    total_token_count: '3440',
                },
            };
            const extracted = extractUsageMetadata(response);
            expect(extracted).toEqual({
                promptTokenCount: 2240,
                candidatesTokenCount: 1000,
                thoughtsTokenCount: 200,
                totalTokenCount: 3440,
                cachedContentTokenCount: 0,
            });
        });

        it('extracts from nested unwrapped response object', () => {
            const response = {
                response: {
                    usageMetadata: {
                        promptTokenCount: 560,
                        candidatesTokenCount: 200,
                        thoughtsTokenCount: 0,
                        totalTokenCount: 760,
                    },
                },
            };
            const extracted = extractUsageMetadata(response);
            expect(extracted?.promptTokenCount).toBe(560);
            expect(extracted?.totalTokenCount).toBe(760);
        });

        it('returns null when usageMetadata is missing or has zero counts', () => {
            expect(extractUsageMetadata({})).toBeNull();
            expect(extractUsageMetadata(null)).toBeNull();
            expect(extractUsageMetadata({ usageMetadata: {} })).toBeNull();
        });
    });
});
