import { describe, expect, it, vi } from 'vitest';
import {
    buildRandomPromptRequest,
    buildImageToPromptInstruction,
    buildPromptEnhancerInstruction,
    buildRandomPromptInstruction,
    normalizePromptToolLanguage,
} from '../plugins/utils/promptHelpers';

describe('buildPromptEnhancerInstruction', () => {
    it('requires localized direct rewrite output and allows prompt-only segmentation', () => {
        const instruction = buildPromptEnhancerInstruction('zh_TW');

        expect(instruction).toContain('Traditional Chinese');
        expect(instruction).toContain('Output only final image-generation prompt text');
        expect(instruction).toContain('Every descriptive phrase, style cue, and invented detail must be written in Traditional Chinese.');
        expect(instruction).toContain('Do NOT answer in English or mix languages unless the requested language is English.');
        expect(instruction).toContain(
            'You may return either one dense prompt paragraph or 2-4 short prompt-only blocks separated by line breaks',
        );
        expect(instruction).toContain('Every line or paragraph must remain pure prompt content');
        expect(instruction).toContain("Preserve the user's core concept, subject, intent, and action");
        expect(instruction).toContain('rewrite them naturally in Traditional Chinese unless they are fixed proper nouns');
        expect(instruction).toContain('Do NOT invent a different concept');
        expect(instruction).toContain(
            'Do NOT add analysis, commentary, explanations, headings, labels, numbering, bullet lists, markdown, JSON, or quotes.',
        );
        expect(instruction).not.toContain('{...};');

        // 確保 Prompt Enhancer 中包含風格敏感度（STYLE SENSITIVITY）的指示，防範非光柵寫實風格被隨意加上寫實關鍵字
        expect(instruction).toContain('STYLE SENSITIVITY: Detect if the input style or selected art style is non-photorealistic');
    });
});

describe('buildRandomPromptInstruction', () => {
    it('requires localized direct random output and allows prompt-only segmentation', () => {
        const instruction = buildRandomPromptInstruction('zh_TW');

        expect(instruction).toContain('Traditional Chinese');
        expect(instruction).toContain('Output only final image-generation prompt text');
        expect(instruction).toContain('Do NOT answer in English or mix languages unless the requested language is English.');
        expect(instruction).toContain('2-4 short prompt-only blocks separated by line breaks');
        expect(instruction).toContain('Treat the scaffold as structure only and invent every subject, environment, prop, mood, style blend, and twist yourself.');
        expect(instruction).toContain('Do NOT echo scaffold labels, bracketed placeholders, variable names, or section titles');
        expect(instruction).toContain('surprising, high-variance, and not a recycled stock theme');
        expect(instruction).toContain(
            'Do NOT add analysis, commentary, explanations, headings, labels, numbering, bullet lists, markdown, JSON, or quotes.',
        );
        expect(instruction).not.toContain('{...};');

        // 確保 Random Prompt 中包含風格敏感度（STYLE SENSITIVITY）的指示，促使模型使用媒介特定的藝術字詞
        expect(instruction).toContain('STYLE SENSITIVITY: If you decide to generate or fill in a non-photorealistic art style');
    });
});

describe('buildImageToPromptInstruction', () => {
    it('restores the recovered structured image-to-prompt rules with uncertainty and illegible-text handling', () => {
        const instruction = buildImageToPromptInstruction('zh_TW');

        expect(instruction).toContain('Traditional Chinese');
        expect(instruction).toContain('Output ONLY the final raw image prompt text in Traditional Chinese.');
        expect(instruction).toContain('Do NOT output any headings, section labels, numbering, bullets, conversational preambles, or markdown formatting.');
        expect(instruction).toContain('Every single phrase, descriptive detail, and style cue must be in Traditional Chinese.');
        expect(instruction).toContain('Describe every layer of the image with high density:');
        expect(instruction).toContain('Primary Subject: exact facial features, expression, posture, age, skin/surface textures, clothing details');
        expect(instruction).toContain('The output must flow naturally as dense, descriptive, and highly descriptive text blocks (1 to 3 long paragraphs)');
        expect(instruction).not.toContain('{...};');

        // 確保 Image-to-Prompt 中包含法醫視覺分析協定（Visual Forensic Protocol）的深度描述指示
        expect(instruction).toContain('Visual Forensic Protocol (Exhaustive Analysis)');
        expect(instruction).toContain('Deconstruct complex textures: specify the exact tactile feel of materials');
    });
});


describe('normalizePromptToolLanguage', () => {
    it('falls back to English for invalid language codes', () => {
        expect(normalizePromptToolLanguage('zh_TW')).toBe('zh_TW');
        expect(normalizePromptToolLanguage('bad-lang')).toBe('en');
        expect(normalizePromptToolLanguage()).toBe('en');
    });
});

describe('buildRandomPromptRequest', () => {
    it('replaces theme seeds with scaffold families whose values are entirely model-invented', () => {
        const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const request = buildRandomPromptRequest();

        expect(request).toContain('Use this scaffold family as invisible structure only and invent every bracketed value yourself.');
        expect(request).toContain('Generate a completely random and creative image prompt.');
        expect(request).toContain('Be unpredictable — surprise the user with something unexpected.');
        expect(request).toContain('Return ONLY the image prompt, nothing else.');
        expect(request).not.toContain('Scaffold family A - cinematic subject');

        randomSpy.mockRestore();
    });
});
