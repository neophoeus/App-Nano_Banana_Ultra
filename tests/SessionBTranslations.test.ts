import { describe, expect, it } from 'vitest';
import { Language, getTranslation, translations } from '../utils/translations';

const sessionBKeys = [
    'workspaceSideToolRepaintCurrentImage',
    'workspaceSideToolUploadToRepaint',
    'workspaceSideToolDrawReferenceSketch',
    'workspaceViewerApplyPrompt',
    'workspaceViewerPromptAppliedNotice',
] as const;

describe('Session B translations', () => {
    it('keeps the English Session B wording stable', () => {
        expect(getTranslation('en', 'catDesign')).toBe('Design');
        expect(getTranslation('en', 'workspaceSideToolRepaintCurrentImage')).toBe('Repaint Current Image');
        expect(getTranslation('en', 'workspaceSideToolUploadToRepaint')).toBe('Upload Image To Repaint');
        expect(getTranslation('en', 'workspaceSideToolDrawReferenceSketch')).toBe('Draw Reference Sketch');
        expect(getTranslation('en', 'workspaceViewerApplyPrompt')).toBe('Apply Prompt to Composer');
        expect(getTranslation('en', 'workspaceViewerPromptAppliedNotice')).toBe(
            'Composer prompt replaced with the viewer prompt.',
        );
    });

    it('defines the Session B keys in every locale dictionary', () => {
        for (const language of Object.keys(translations) as Language[]) {
            for (const key of sessionBKeys) {
                expect(translations[language][key], `${language} missing ${key}`).toBeTruthy();
                expect(translations[language][key], `${language} unresolved ${key}`).not.toBe(key);
            }
        }
    });
});
