import { describe, expect, it } from 'vitest';
import {
    buildResultPartFilenameStem,
    buildSavedImageFilenameStem,
    getSavedImageWorkflowSlug,
    normalizeSavedImageModelId,
} from '../utils/savedImageFilename';

describe('savedImageFilename helpers', () => {
    it('normalizes remote model resource names before building stems', () => {
        expect(normalizeSavedImageModelId('models/gemini-3.1-flash-image-preview')).toBe(
            'gemini-3.1-flash-image-preview',
        );
    });

    it('maps workflow modes to stable ASCII slugs', () => {
        expect(getSavedImageWorkflowSlug('Text to Image')).toBe('txt2img');
        expect(getSavedImageWorkflowSlug('Image to Image/Mixing')).toBe('ref2img');
        expect(getSavedImageWorkflowSlug('Follow-up Edit')).toBe('followup');
        expect(getSavedImageWorkflowSlug('Editor Edit')).toBe('editor-edit');
        expect(getSavedImageWorkflowSlug('Inpainting')).toBe('editor-retouch');
        expect(getSavedImageWorkflowSlug('Outpaint')).toBe('editor-reframe');
    });

    it('builds deterministic saved image stems from model, timestamp, slot, and workflow', () => {
        expect(
            buildSavedImageFilenameStem({
                model: 'gemini-3.1-flash-image-preview',
                mode: 'Image to Image/Mixing',
                slotIndex: 2,
                createdAt: new Date('2026-05-06T14:35:22.000Z'),
                requestId: 'A7C9F2E1-1234-5678-9999-000000000000',
            }),
        ).toBe('gemini-3.1-flash-image-preview_20260506-143522_03-a7c9f2e1_ref2img');
    });

    it('derives result part stems from the saved primary filename when available', () => {
        expect(
            buildResultPartFilenameStem({
                model: 'gemini-3-pro-image-preview',
                mode: 'Text to Image',
                slotIndex: 0,
                createdAt: new Date('2026-05-06T14:35:22.000Z'),
                requestId: 'fedcba98-1234-5678-9999-000000000000',
                sequence: 7,
                sourceSavedFilename: 'gemini-3-pro-image-preview_20260506-143522_01-fedcba98_txt2img.jpg',
            }),
        ).toBe('gemini-3-pro-image-preview_20260506-143522_01-fedcba98_txt2img-part-07');
    });
});
