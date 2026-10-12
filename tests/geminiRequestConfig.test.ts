import { describe, expect, it } from 'vitest';
import { HarmBlockThreshold, HarmCategory, ThinkingLevel } from '@google/genai';
import { buildImageRequestConfig, validateCapabilityRequest } from '../utils/geminiRequestConfig';

describe('validateCapabilityRequest', () => {
    it('rejects unsupported thoughts on gemini-2.5-flash-image', () => {
        expect(
            validateCapabilityRequest('gemini-2.5-flash-image', {
                outputFormat: 'images-and-text',
                includeThoughts: true,
            }),
        ).toBe('gemini-2.5-flash-image does not support returning thoughts.');
    });
});

describe('buildImageRequestConfig', () => {
    it('maps app thinking levels to Gemini SDK enums for browser requests', () => {
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

    it('omits disabled thinkingLevel from the outbound browser thinkingConfig', () => {
        const result = buildImageRequestConfig('gemini-3-pro-image', {
            outputFormat: 'images-only',
            includeThoughts: true,
        });

        expect(result.effectiveThinkingLevel).toBe('disabled');
        expect(result.requestConfig.thinkingConfig).toEqual({
            includeThoughts: true,
        });
    });

    it('preserves permissive safety defaults when no browser overrides are provided', () => {
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

    it('maps browser safety threshold keys to Gemini SDK safety settings', () => {
        const result = buildImageRequestConfig('gemini-3.1-flash-image', {
            outputFormat: 'images-only',
            safetyThresholds: {
                harassment: 'default',
                'hate-speech': 'block-only-high',
                'sexually-explicit': 'off',
                'dangerous-content': 'block-medium-and-above',
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
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
        ]);
    });

    it('omits browser safety settings when every category uses model default behavior', () => {
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

    it('keeps uppercase modality tokens when image grounding metadata needs text', () => {
        const result = buildImageRequestConfig('gemini-3.1-flash-image', {
            outputFormat: 'images-only',
            imageSearch: true,
        });

        expect(result.resolvedResponseModalities).toEqual(['IMAGE', 'TEXT']);
    });

    it('omits temperature from outbound browser config for gemini-nano-banana-2.1', () => {
        const result = buildImageRequestConfig('gemini-nano-banana-2.1', {
            outputFormat: 'images-only',
            temperature: 1.0,
        });

        expect(result.requestConfig.temperature).toBeUndefined();
    });
});
