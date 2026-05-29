import { describe, expect, it } from 'vitest';
import { HarmBlockThreshold, HarmCategory, ThinkingLevel } from '@google/genai/node';
import { buildGenerateParts } from '../plugins/utils/imageReferences';
import { buildImageRequestConfig, validateCapabilityRequest } from '../plugins/utils/requestConfig';

describe('validateCapabilityRequest', () => {
    it('rejects image sizes the selected model does not support', () => {
        expect(validateCapabilityRequest('gemini-3-pro-image', { imageSize: '512' })).toBe(
            'gemini-3-pro-image does not support image size 512.',
        );
    });

    it('rejects aspect ratios the selected model does not support', () => {
        expect(validateCapabilityRequest('gemini-3-pro-image', { aspectRatio: '1:8' })).toBe(
            'gemini-3-pro-image does not support aspect ratio 1:8.',
        );
    });

    it('allows model-specific size and ratio combinations that are documented as supported', () => {
        expect(
            validateCapabilityRequest('gemini-3.1-flash-image', {
                imageSize: '512',
                aspectRatio: '1:8',
            }),
        ).toBeNull();
    });

    it('rejects thoughts on image models that do not support them', () => {
        expect(
            validateCapabilityRequest('gemini-2.5-flash-image', {
                outputFormat: 'images-and-text',
                includeThoughts: true,
            }),
        ).toBe('gemini-2.5-flash-image does not support returning thoughts.');
    });
});

describe('buildImageRequestConfig', () => {
    it('keeps gemini-3-pro-image on an images-and-text baseline without schema transport', () => {
        const result = buildImageRequestConfig('gemini-3-pro-image', {
            outputFormat: 'images-and-text',
            temperature: 1,
        });

        expect(result.resolvedResponseModalities).toEqual(['IMAGE', 'TEXT']);
        expect(result.requestConfig.responseMimeType).toBeUndefined();
        expect(result.requestConfig.responseJsonSchema).toBeUndefined();
        expect(result.requestConfig.thinkingConfig).toBeUndefined();
    });

    it('builds a thoughts-only control contract on gemini-3-pro-image without schema transport', () => {
        const result = buildImageRequestConfig('gemini-3-pro-image', {
            outputFormat: 'images-and-text',
            includeThoughts: true,
            temperature: 1,
        });

        expect(result.resolvedResponseModalities).toEqual(['IMAGE', 'TEXT']);
        expect(result.shouldIncludeThoughts).toBe(true);
        expect(result.requestConfig.responseMimeType).toBeUndefined();
        expect(result.requestConfig.responseJsonSchema).toBeUndefined();
        expect(result.requestConfig.thinkingConfig).toEqual({
            includeThoughts: true,
        });
    });

    it('keeps gemini-2.5-flash-image on an images-and-text baseline without schema or thoughts', () => {
        const result = buildImageRequestConfig('gemini-2.5-flash-image', {
            outputFormat: 'images-and-text',
            includeThoughts: false,
            temperature: 1,
        });

        expect(result.resolvedResponseModalities).toEqual(['IMAGE', 'TEXT']);
        expect(result.shouldIncludeThoughts).toBe(false);
        expect(result.requestConfig.responseMimeType).toBeUndefined();
        expect(result.requestConfig.responseJsonSchema).toBeUndefined();
        expect(result.requestConfig.thinkingConfig).toBeUndefined();
    });

    it('normalizes temperature to the nearest 0.05 increment before serializing the request', () => {
        const result = buildImageRequestConfig('gemini-3.1-flash-image', {
            outputFormat: 'images-only',
            temperature: 1.03,
        });

        expect(result.requestConfig.temperature).toBe(1.05);
    });

    it('preserves permissive safety defaults when no overrides are provided', () => {
        const result = buildImageRequestConfig('gemini-3.1-flash-image', {
            outputFormat: 'images-only',
        });

        expect(result.requestConfig.safetySettings).toEqual([
            {
                category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
                category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
                category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
                category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold: HarmBlockThreshold.BLOCK_NONE,
            },
        ]);
    });

    it('maps product safety threshold keys to Gemini SDK safety settings', () => {
        const result = buildImageRequestConfig('gemini-3.1-flash-image', {
            outputFormat: 'images-only',
            safetyThresholds: {
                harassment: 'default',
                'hate-speech': 'block-only-high',
                'sexually-explicit': 'off',
                'dangerous-content': 'block-low-and-above',
            },
        });

        expect(result.requestConfig.safetySettings).toEqual([
            {
                category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
            },
            {
                category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                threshold: HarmBlockThreshold.OFF,
            },
            {
                category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
            },
        ]);
    });

    it('omits safety settings when every category uses model default behavior', () => {
        const result = buildImageRequestConfig('gemini-3.1-flash-image', {
            outputFormat: 'images-only',
            safetyThresholds: {
                harassment: 'default',
                'hate-speech': 'default',
                'sexually-explicit': 'default',
                'dangerous-content': 'default',
            },
        });

        expect(result.requestConfig.safetySettings).toBeUndefined();
    });

    it('maps app thinking levels to Gemini SDK enums without changing images-only modality behavior', () => {
        const result = buildImageRequestConfig('gemini-3.1-flash-image', {
            outputFormat: 'images-only',
            thinkingLevel: 'minimal',
            includeThoughts: true,
        });

        expect(result.effectiveThinkingLevel).toBe('minimal');
        expect(result.resolvedResponseModalities).toEqual(['IMAGE']);
        expect(result.requestConfig.thinkingConfig).toEqual({
            thinkingLevel: ThinkingLevel.MINIMAL,
            includeThoughts: true,
        });
    });

    it('omits disabled thinkingLevel from the outbound thinkingConfig', () => {
        const result = buildImageRequestConfig('gemini-3-pro-image', {
            outputFormat: 'images-only',
            includeThoughts: true,
        });

        expect(result.effectiveThinkingLevel).toBe('disabled');
        expect(result.requestConfig.thinkingConfig).toEqual({
            includeThoughts: true,
        });
    });
});

describe('buildGenerateParts', () => {
    it('keeps the plain prompt as the final text part', () => {
        const parts = buildGenerateParts(
            {
                prompt: 'A cinematic alley at sunrise.',
            },
            'd:\\OneDrive\\7_AI@neo.genymt.gmail\\Projects\\App-Nano_Banana_Ultra',
        );

        expect(parts.at(-1)?.text).toBe('A cinematic alley at sunrise.');
    });
});
