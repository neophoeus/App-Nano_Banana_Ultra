import { beforeAll, describe, expect, it } from 'vitest';
import {
    getGenerationModeTranslationKey,
    isEditingGenerationMode,
    normalizeGenerationModeKind,
    resolveGenerationModeLabel,
} from '../utils/generationMode';
import { getTranslation, preloadAllTranslations, SUPPORTED_LANGUAGES, translations } from '../utils/translations';

beforeAll(async () => {
    await preloadAllTranslations();
});

describe('generationMode helpers', () => {
    it('normalizes current stored generation mode strings into canonical kinds', () => {
        expect(normalizeGenerationModeKind('Text to Image')).toBe('text-to-image');
        expect(normalizeGenerationModeKind('Image to Image/Mixing')).toBe('reference-image-generation');
        expect(normalizeGenerationModeKind('Image to Image')).toBe('reference-image-generation');
        expect(normalizeGenerationModeKind('Follow-up Edit')).toBe('follow-up-edit');
        expect(normalizeGenerationModeKind('Editor Edit')).toBe('editor-edit');
        expect(normalizeGenerationModeKind('Inpainting')).toBe('retouch');
        expect(normalizeGenerationModeKind('Outpaint')).toBe('reframe');
        expect(normalizeGenerationModeKind('Revolve')).toBe('revolve');
        expect(normalizeGenerationModeKind('Camera Angle 3D Orbit')).toBe('revolve');
    });

    it('maps generation modes to translation keys for precise workflow labels', () => {
        expect(getGenerationModeTranslationKey('Text to Image')).toBe('generationModeTextToImage');
        expect(getGenerationModeTranslationKey('Image to Image/Mixing')).toBe('generationModeReferenceImage');
        expect(getGenerationModeTranslationKey('Editor Edit')).toBe('generationModeEditorEdit');
        expect(getGenerationModeTranslationKey('Follow-up Edit')).toBe('workspaceViewerFollowUpEdit');
        expect(getGenerationModeTranslationKey('Revolve')).toBe('modeRevolve');
    });

    it('returns localized labels for precise workflow display surfaces', () => {
        expect(resolveGenerationModeLabel('Text to Image', (key) => getTranslation('zh_TW', key))).toBe('文生圖');
        expect(resolveGenerationModeLabel('Image to Image/Mixing', (key) => getTranslation('zh_TW', key))).toBe(
            '參考圖生成',
        );
        expect(resolveGenerationModeLabel('Editor Edit', (key) => getTranslation('ja', key))).toBe('エディタ再描画');
        expect(resolveGenerationModeLabel('Revolve', (key) => getTranslation('zh_TW', key))).toBe('重新環視');
    });

    it('defines the new workflow translation keys across every supported locale', () => {
        for (const { value } of SUPPORTED_LANGUAGES) {
            expect(translations[value]).toHaveProperty('generationModeTextToImage');
            expect(translations[value]).toHaveProperty('generationModeReferenceImage');
            expect(translations[value]).toHaveProperty('generationModeEditorEdit');
            expect(translations[value]).toHaveProperty('modeRevolve');
        }
    });

    it('recognizes editing requests without depending on ad hoc string includes in callers', () => {
        expect(isEditingGenerationMode('Editor Edit')).toBe(true);
        expect(isEditingGenerationMode('Inpainting')).toBe(true);
        expect(isEditingGenerationMode('Revolve')).toBe(true);
        expect(isEditingGenerationMode('Text to Image')).toBe(false);
        expect(isEditingGenerationMode('Follow-up Edit', 'data:image/png;base64,AAA')).toBe(true);
    });
});
