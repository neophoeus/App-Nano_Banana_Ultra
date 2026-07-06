import { describe, expect, it } from 'vitest';
import { buildEditorPrompt } from '../utils/editorPromptBuilder';

describe('editorPromptBuilder', () => {
    it('keeps mask prompt semantics constrained to the masked region', () => {
        const result = buildEditorPrompt({
            mode: 'inpaint',
            retouchMode: 'mask',
            prompt: 'Replace the mug with a glass vase',
        });

        expect(result.finalPrompt).toContain('Replace the mug with a glass vase.');
        expect(result.finalPrompt).toContain(
            'The bright green (R:0, G:255, B:0) areas represent the region to repaint based on the prompt.',
        );
        expect(result.finalPrompt).toContain('Preserve everything outside the green areas exactly as shown.');
        expect(result.finalPrompt).toContain(
            'Blend the repainted regions seamlessly and ensure no green pixels remain.',
        );
    });

    it('treats doodles as spatial guidance and baked labels as visible text intent', () => {
        const result = buildEditorPrompt({
            mode: 'inpaint',
            retouchMode: 'doodle',
            prompt: 'Turn the sign into neon',
            visibleTextLabels: ['Open Late'],
        });

        expect(result.finalPrompt).toContain('Turn the sign into neon.');
        expect(result.finalPrompt).toContain('Use the doodles as spatial guidance for the edit.');
        expect(result.finalPrompt).toContain('Preserve content outside the edited areas exactly as shown.');
        expect(result.finalPrompt).toContain('Integrate changes naturally with consistent lighting, perspective, and texture.');
        expect(result.finalPrompt).toContain('"Open Late"');
    });

    it('uses a detail-recovery-only contract when the submitted outpaint frame is already fully covered', () => {
        const result = buildEditorPrompt({
            mode: 'outpaint',
            prompt: '',
            outpaintContext: {
                frameDims: { w: 1000, h: 1000 },
                originalDims: { w: 1000, h: 1000 },
                imgTransform: { x: 0, y: 0, scale: 1 },
            },
        });

        expect(result.finalPrompt).toContain(
            'The frame is already fully covered. Perform detail recovery and clarity enhancement only.',
        );
    });

    it('uses the same preservation contract for blank-side outpaint regardless of whether the frame came from pan or zoom history', () => {
        const panResult = buildEditorPrompt({
            mode: 'outpaint',
            prompt: '',
            outpaintContext: {
                frameDims: { w: 1000, h: 500 },
                originalDims: { w: 800, h: 500 },
                imgTransform: { x: -100, y: 0, scale: 1 },
            },
        });
        const zoomResult = buildEditorPrompt({
            mode: 'outpaint',
            prompt: '',
            outpaintContext: {
                frameDims: { w: 1000, h: 500 },
                originalDims: { w: 800, h: 500 },
                imgTransform: { x: -52, y: 0, scale: 1.12 },
            },
        });

        expect(panResult.finalPrompt).toBe(zoomResult.finalPrompt);
        expect(panResult.finalPrompt).toContain(
            'The bright green (R:0, G:255, B:0) areas represent the region to repaint based on the prompt. Preserve everything outside the green areas exactly as shown. Blend the repainted regions seamlessly and ensure no green pixels remain.',
        );
    });

    it('instructs the model to regenerate the green regions for outpaint frames', () => {
        const result = buildEditorPrompt({
            mode: 'outpaint',
            prompt: '',
            outpaintContext: {
                frameDims: { w: 1000, h: 1000 },
                originalDims: { w: 800, h: 600 },
                imgTransform: { x: 80, y: -80, scale: 1.4 },
            },
        });

        expect(result.finalPrompt).toContain(
            'The bright green (R:0, G:255, B:0) areas represent the region to repaint based on the prompt. Preserve everything outside the green areas exactly as shown. Blend the repainted regions seamlessly and ensure no green pixels remain.',
        );
        expect(result.finalPrompt).not.toContain('Keep the existing crop anchored');
        expect(result.finalPrompt).not.toContain('Keep the existing crop locked');
    });
});
