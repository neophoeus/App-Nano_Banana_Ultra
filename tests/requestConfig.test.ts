import { describe, expect, it } from 'vitest';
import { buildGenerateParts } from '../plugins/utils/imageReferences';
import { buildImageRequestConfig, validateCapabilityRequest } from '../plugins/utils/requestConfig';

describe('validateCapabilityRequest', () => {
    it('rejects image sizes the selected model does not support', () => {
        expect(validateCapabilityRequest('gemini-3-pro-image-preview', { imageSize: '512' })).toBe(
            'gemini-3-pro-image-preview does not support image size 512.',
        );
    });

    it('rejects aspect ratios the selected model does not support', () => {
        expect(validateCapabilityRequest('gemini-3-pro-image-preview', { aspectRatio: '1:8' })).toBe(
            'gemini-3-pro-image-preview does not support aspect ratio 1:8.',
        );
    });

    it('allows model-specific size and ratio combinations that are documented as supported', () => {
        expect(
            validateCapabilityRequest('gemini-3.1-flash-image-preview', {
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
    it('keeps gemini-3-pro-image-preview on an images-and-text baseline without schema transport', () => {
        const result = buildImageRequestConfig('gemini-3-pro-image-preview', {
            outputFormat: 'images-and-text',
            temperature: 1,
        });

        expect(result.resolvedResponseModalities).toEqual(['IMAGE', 'TEXT']);
        expect(result.requestConfig.responseMimeType).toBeUndefined();
        expect(result.requestConfig.responseJsonSchema).toBeUndefined();
        expect(result.requestConfig.thinkingConfig).toBeUndefined();
    });

    it('builds a thoughts-only control contract on gemini-3-pro-image-preview without schema transport', () => {
        const result = buildImageRequestConfig('gemini-3-pro-image-preview', {
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
