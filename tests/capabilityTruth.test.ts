import { describe, expect, it } from 'vitest';
import { MODEL_CAPABILITIES } from '../constants';
import {
    buildGroundingToolConfig,
    deriveGroundingMode,
    getAvailableGroundingModes,
    getGroundingFlagsFromMode,
} from '../utils/groundingMode';

describe('capability truth', () => {
    it('allows image-plus-text output across all image generation models', () => {
        expect(MODEL_CAPABILITIES['gemini-3.1-flash-image-preview'].outputFormats).toContain('images-and-text');
        expect(MODEL_CAPABILITIES['gemini-3-pro-image-preview'].outputFormats).toContain('images-and-text');
        expect(MODEL_CAPABILITIES['gemini-2.5-flash-image'].outputFormats).toContain('images-and-text');
    });

    it('marks gemini-3-pro-image-preview as supporting standard Google Search grounding', () => {
        expect(MODEL_CAPABILITIES['gemini-3-pro-image-preview'].supportsGoogleSearch).toBe(true);
        expect(MODEL_CAPABILITIES['gemini-3-pro-image-preview'].supportsImageSearch).toBe(false);
    });

    it('treats Gemini 3 image models as thought-summary capable and keeps 2.5 flash image disabled', () => {
        expect(MODEL_CAPABILITIES['gemini-3.1-flash-image-preview'].supportsIncludeThoughts).toBe(true);
        expect(MODEL_CAPABILITIES['gemini-3-pro-image-preview'].supportsIncludeThoughts).toBe(true);
        expect(MODEL_CAPABILITIES['gemini-2.5-flash-image'].supportsIncludeThoughts).toBe(false);
    });

    it('only exposes configurable thinking levels on gemini-3.1-flash-image-preview', () => {
        expect(MODEL_CAPABILITIES['gemini-3.1-flash-image-preview'].thinkingLevels).toEqual(['minimal', 'high']);
        expect(MODEL_CAPABILITIES['gemini-3-pro-image-preview'].thinkingLevels).toEqual(['disabled']);
        expect(MODEL_CAPABILITIES['gemini-2.5-flash-image'].thinkingLevels).toEqual(['disabled']);
    });

    it('does not expose a structured-output capability flag on current image generation paths', () => {
        expect('supportsStructuredOutputs' in MODEL_CAPABILITIES['gemini-3.1-flash-image-preview']).toBe(false);
        expect('supportsStructuredOutputs' in MODEL_CAPABILITIES['gemini-3-pro-image-preview']).toBe(false);
        expect('supportsStructuredOutputs' in MODEL_CAPABILITIES['gemini-2.5-flash-image']).toBe(false);
    });

    it('assembles image-only search without silently bundling web search', () => {
        expect(buildGroundingToolConfig('image-search')).toEqual({
            googleSearch: {
                searchTypes: {
                    imageSearch: {},
                },
            },
        });
    });

    it('reports the correct grounding mode for each search combination', () => {
        expect(deriveGroundingMode(false, false)).toBe('off');
        expect(deriveGroundingMode(true, false)).toBe('google-search');
        expect(deriveGroundingMode(false, true)).toBe('image-search');
        expect(deriveGroundingMode(true, true)).toBe('google-search-plus-image-search');
    });

    it('derives grounding flags and available mode options explicitly', () => {
        expect(getGroundingFlagsFromMode('google-search-plus-image-search')).toEqual({
            googleSearch: true,
            imageSearch: true,
        });
        expect(getAvailableGroundingModes(MODEL_CAPABILITIES['gemini-3.1-flash-image-preview'])).toEqual([
            'off',
            'google-search',
            'image-search',
            'google-search-plus-image-search',
        ]);
        expect(getAvailableGroundingModes(MODEL_CAPABILITIES['gemini-3-pro-image-preview'])).toEqual([
            'off',
            'google-search',
        ]);
    });
});
