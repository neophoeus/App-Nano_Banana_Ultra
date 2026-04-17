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
        expect(instruction).toContain('Output every section heading, body sentence, and final prompt in Traditional Chinese.');
        expect(instruction).toContain('Do NOT drift into English or mixed language unless the requested language is English.');
        expect(instruction).toContain(
            'Output a plain-text multi-section brief in this exact order: Scene Overview, Subjects and Composition, Visual Details, Lighting and Color, Mood and Style, Final Prompt.',
        );
        expect(instruction).toContain('Use naturally translated section headings and body text in Traditional Chinese.');
        expect(instruction).toContain('Each section must contain concrete visual evidence from the image');
        expect(instruction).toContain(
            'If a requested detail is uncertain or only weakly supported, say it is unclear, subtle, likely, or not significant rather than presenting it as certain.',
        );
        expect(instruction).toContain('If text in the image is unreadable, describe it as illegible rather than guessing.');
        expect(instruction).toContain(
            'In Scene Overview, establish the environment, overall scale, genre or era cues, and any visible creative twist that reframes the scene.',
        );
        expect(instruction).toContain(
            'In Subjects and Composition, identify the main subject first, then secondary subjects or supporting figures if present; describe visual hierarchy, composition structure, and the visible camera angle or lens feel.',
        );
        expect(instruction).toContain(
            'In Visual Details, describe secondary elements, materials, textures, micro-details, visible depth-of-field behavior, and any hidden details that are truly present on closer inspection.',
        );
        expect(instruction).toContain(
            'In Lighting and Color, describe light source behavior, shadow character, atmospheric depth, palette logic, color temperature, and dominant or accent colors.',
        );
        expect(instruction).toContain(
            'In Mood and Style, describe the emotional tone, style fusion, and rendering finish.',
        );
        expect(instruction).toContain('one polished generation-ready prompt paragraph');
        expect(instruction).toContain('Do NOT use markdown code fences, JSON, bullet lists, quotes, or conversational filler.');
        expect(instruction).not.toContain('Output only final image-generation prompt text');
        expect(instruction).not.toContain('Use exactly these section headings');
        expect(instruction).not.toContain('without mentioning uncertainty');
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
        expect(request).toContain('Scaffold family A - cinematic subject tableau:');
        expect(request).toContain('[central subject identity and silhouette]');
        expect(request).toContain('Do not output headings, bullets, brackets, placeholder names, or commentary.');
        expect(request).not.toContain('Theme:');

        randomSpy.mockRestore();
    });
});
