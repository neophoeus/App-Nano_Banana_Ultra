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
    });
});

describe('buildImageToPromptInstruction', () => {
    it('restores the recovered structured image-to-prompt rules with uncertainty and illegible-text handling', () => {
        const instruction = buildImageToPromptInstruction('zh_TW');

        expect(instruction).toContain('Traditional Chinese');
        expect(instruction).toContain('Output ONLY the final image-generation prompt text in Traditional Chinese.');
        expect(instruction).toContain('Do NOT use any section headers, labels, bullets, lists, markdown, JSON, or conversational filler.');
        expect(instruction).toContain('Do NOT drift into English or mix languages unless the requested language is English.');
        expect(instruction).toContain('Describe only details that are literally visible or strongly supported by the image. Avoid guesswork, speculation, or hallucinated elements.');
        expect(instruction).toContain('Capture all critical visual aspects: subject identity, precise action, poses, expressions, clothing, environment/background details, lighting quality (source, color, shadows), color palette, composition angle, and overall mood and style.');
        expect(instruction).toContain('Ensure the output flows naturally as one or two dense descriptive paragraphs.');
        expect(instruction).not.toContain('{...};');
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
