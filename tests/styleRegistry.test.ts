import { describe, expect, it } from 'vitest';
import {
    STYLE_CATEGORIES,
    STYLES_BY_CATEGORY,
    buildStyleTransferPrompt,
    getStyleIconId,
    getStylePromptDescriptor,
    getStylePromptDirective,
    getStyleTranslationKey,
    normalizeImageStyle,
} from '../utils/styleRegistry';

describe('styleRegistry', () => {
    it('exposes the new taxonomy and includes the illustration expansion styles', () => {
        expect(STYLE_CATEGORIES).toEqual([
            'All',
            'PhotoFilm',
            'PaintDrawing',
            'Illustration',
            'ComicsAnime',
            'GraphicDesign',
            'ThreeDPixel',
            'CraftMaterial',
            'Experimental',
        ]);

        expect(STYLES_BY_CATEGORY.Illustration).toEqual(
            expect.arrayContaining([
                'Digital Illustration',
                'Painterly Illustration',
                'Editorial Illustration',
                'Concept Art',
                'Line Art',
                'Storybook Illustration',
            ]),
        );
        expect(STYLES_BY_CATEGORY.All).toContain('Digital Illustration');
        expect(STYLES_BY_CATEGORY.PhotoFilm).toContain('Vintage Instant Photo');
        expect(STYLES_BY_CATEGORY.ComicsAnime).toContain('Comic Illustration');
        expect(
            STYLES_BY_CATEGORY.All.filter((style) => style !== 'None').every((style) => getStylePromptDirective(style).length > 0),
        ).toBe(true);
    });

    it('keeps rewritten descriptors broad instead of locking to named artists or tools', () => {
        const descriptorChecks = [
            { style: 'Ukiyo-e' as const, bannedTerms: ['hokusai'] },
            { style: 'Impressionism' as const, bannedTerms: ['monet'] },
            { style: 'Art Nouveau' as const, bannedTerms: ['mucha'] },
            { style: 'Baroque' as const, bannedTerms: ['caravaggio'] },
            { style: '3D Render' as const, bannedTerms: ['octane', 'unreal engine'] },
            { style: 'Vector Art' as const, bannedTerms: ['adobe illustrator'] },
            { style: 'Surrealism' as const, bannedTerms: ['dali'] },
            { style: 'Pop Art' as const, bannedTerms: ['warhol'] },
            { style: 'Flat Design' as const, bannedTerms: ['material design'] },
            { style: 'Vintage Instant Photo' as const, bannedTerms: ['polaroid'] },
            { style: 'Cyberpunk' as const, bannedTerms: ['futuristic city'] },
            { style: 'Fantasy Art' as const, bannedTerms: ['mythical creatures'] },
            { style: 'Graffiti' as const, bannedTerms: ['urban wall'] },
        ];

        for (const { style, bannedTerms } of descriptorChecks) {
            const descriptor = getStylePromptDescriptor(style).toLowerCase();
            const directive = getStylePromptDirective(style).toLowerCase();
            for (const term of bannedTerms) {
                expect(descriptor).not.toContain(term);
                expect(directive).not.toContain(term);
            }
        }
    });

    it('normalizes stored style ids and builds richer shared transfer prompts', () => {
        expect(normalizeImageStyle('Digital Illustration')).toBe('Digital Illustration');
        expect(normalizeImageStyle('Vintage Polaroid')).toBe('Vintage Instant Photo');
        expect(normalizeImageStyle('Comic Book')).toBe('Comic Illustration');
        expect(normalizeImageStyle('')).toBe('None');
        expect(buildStyleTransferPrompt('Digital Illustration')).toContain('Selected style: Digital Illustration.');
        expect(buildStyleTransferPrompt('Digital Illustration')).toContain('Style directive:');
        expect(buildStyleTransferPrompt('Digital Illustration')).toContain('Style anchors:');
        expect(buildStyleTransferPrompt('Comic Illustration')).toContain('Selected style: Comic Illustration.');
        expect(getStyleTranslationKey('Vintage Polaroid')).toBe('styleVintageInstantPhoto');
        expect(getStyleIconId('Comic Book')).toBe(getStyleIconId('Comic Illustration'));
    });
});