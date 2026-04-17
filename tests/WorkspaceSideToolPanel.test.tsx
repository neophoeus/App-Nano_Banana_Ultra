import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import WorkspaceSideToolPanel from '../components/WorkspaceSideToolPanel';

describe('WorkspaceSideToolPanel', () => {
    it('surfaces the canonical side-tool actions and a collapsed reference summary by default', () => {
        const markup = renderToStaticMarkup(
            <WorkspaceSideToolPanel
                currentLanguage="en"
                canEditCurrentImage={true}
                onOpenSketchPad={vi.fn()}
                onOpenEditor={vi.fn()}
                onOpenUploadToRepaint={vi.fn()}
                objectImages={['object.png']}
                characterImages={['character.png']}
                maxObjects={4}
                maxCharacters={2}
                setObjectImages={vi.fn()}
                setCharacterImages={vi.fn()}
                isGenerating={false}
                showNotification={vi.fn()}
                handleRemoveObjectReference={vi.fn()}
                handleRemoveCharacterReference={vi.fn()}
                handleClearAllReferences={vi.fn()}
            />,
        );

        expect(markup).toContain('Image Tools');
        expect(markup).toContain('Upload Image To Repaint');
        expect(markup).toContain('Repaint Current Image');
        expect(markup).toContain('Draw Reference Sketch');
        expect(markup).toContain('References');
        expect(markup).toContain('>Clear<');
        expect(markup).toContain('border-red-200/80 bg-red-50/90');
        expect(markup).toContain('Objects 1/4');
        expect(markup).toContain('Characters 1/2');
        expect(markup).toContain('workspace-side-tools-actions-card');
        expect(markup).toContain('workspace-side-tools-references-card');
        expect(markup).toContain('workspace-side-tools-actions');
        expect(markup).toContain('workspace-side-tool-panel-disclosure');
        expect(markup).toContain('workspace-side-tool-panel-summary');
        expect(markup).toContain('workspace-side-tools-references-toggle');
        expect(markup).toContain('workspace-side-tools-references-clear-all');
        expect(markup).toContain('workspace-side-tools-references-summary');
        expect(markup).toContain('workspace-side-tools-references-summary-object');
        expect(markup).toContain('workspace-side-tools-references-summary-character');
        expect(markup).toContain('font-black tracking-[0.01em] text-amber-700 dark:text-amber-200');
        expect(markup).toContain('workspace-side-tool-panel');
        expect(markup).toContain('side-tools-upload-to-repaint-icon');
        expect(markup).toContain('side-tools-repaint-current-icon');
        expect(markup).toContain('side-tools-open-sketchpad-icon');
        expect(markup).toContain('aria-expanded="false"');
        expect(markup).toContain('justify-start');
        expect(markup).toContain('overflow-visible');
        expect(markup).toContain('text-[12px]');
        expect(markup).toContain('leading-[1.15]');
        expect(markup).toContain('h-5');
        expect(markup).not.toContain('data-testid="workspace-side-tool-references"');
        expect(markup).not.toContain('M12 6v12M6 12h12');
        expect(markup).not.toContain('Actions');
        expect(markup).not.toContain('Upload Base Image');
        expect(markup).not.toContain('Base image');
        expect(markup).not.toContain('Reference Tray');
        expect(markup).not.toContain('side-tools-open-references');
        expect(markup).not.toContain('Rec. < 2');
        expect(markup).not.toContain('Object References');
        expect(markup).not.toContain('Character References');
        expect(markup).not.toContain('Clear All');
        expect(markup).not.toContain('Edit Current Image');
        expect(markup).not.toContain('Open SketchPad');
        expect(markup).not.toContain('workspace-side-tools-sketch-card');
    });

    it('shows upload image to edit when no current image is available', () => {
        const markup = renderToStaticMarkup(
            <WorkspaceSideToolPanel
                currentLanguage="en"
                canEditCurrentImage={false}
                onOpenSketchPad={vi.fn()}
                onOpenEditor={vi.fn()}
                onOpenUploadToRepaint={vi.fn()}
                objectImages={[]}
                characterImages={[]}
                maxObjects={4}
                maxCharacters={2}
                setObjectImages={vi.fn()}
                setCharacterImages={vi.fn()}
                isGenerating={false}
                showNotification={vi.fn()}
                handleRemoveObjectReference={vi.fn()}
                handleRemoveCharacterReference={vi.fn()}
                handleClearAllReferences={vi.fn()}
            />,
        );

        expect(markup).toContain('Upload Image To Repaint');
        expect(markup).toContain('Repaint Current Image');
        expect(markup).toContain('Objects 0/4');
        expect(markup).toContain('Characters 0/2');
        expect(markup).toContain('font-semibold text-slate-500 dark:text-slate-400');
        expect(markup).toContain('side-tools-upload-to-repaint-icon');
        expect(markup).toContain('side-tools-repaint-current-icon');
        expect(markup).toContain('data-testid="side-tools-repaint-current"');
        expect(markup).toContain('disabled=""');
        expect(markup).not.toContain('Continue Editing');
        expect(markup).not.toContain('Upload Image To Edit');
        expect(markup).not.toContain('font-black tracking-[0.01em] text-amber-700 dark:text-amber-200');
    });

    it('only emphasizes the populated reference type inside the collapsed summary', () => {
        const markup = renderToStaticMarkup(
            <WorkspaceSideToolPanel
                currentLanguage="en"
                canEditCurrentImage={true}
                onOpenSketchPad={vi.fn()}
                onOpenEditor={vi.fn()}
                onOpenUploadToRepaint={vi.fn()}
                objectImages={['object.png']}
                characterImages={[]}
                maxObjects={4}
                maxCharacters={2}
                setObjectImages={vi.fn()}
                setCharacterImages={vi.fn()}
                isGenerating={false}
                showNotification={vi.fn()}
                handleRemoveObjectReference={vi.fn()}
                handleRemoveCharacterReference={vi.fn()}
                handleClearAllReferences={vi.fn()}
            />,
        );

        expect(markup).toContain('Objects 1/4');
        expect(markup).toContain('Characters 0/2');
        expect(markup).toContain(
            'data-testid="workspace-side-tools-references-summary-object" class="shrink-0 font-black tracking-[0.01em] text-amber-700 dark:text-amber-200"',
        );
        expect(markup).toContain(
            'data-testid="workspace-side-tools-references-summary-character" class="shrink-0 font-semibold text-slate-500 dark:text-slate-400"',
        );
    });
});
