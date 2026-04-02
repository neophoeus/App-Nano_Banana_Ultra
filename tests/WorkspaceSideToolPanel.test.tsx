import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import WorkspaceSideToolPanel from '../components/WorkspaceSideToolPanel';

describe('WorkspaceSideToolPanel', () => {
    it('surfaces the canonical side-tool actions and embedded reference uploaders', () => {
        const markup = renderToStaticMarkup(
            <WorkspaceSideToolPanel
                currentLanguage="en"
                canEditCurrentImage={true}
                onOpenSketchPad={vi.fn()}
                onOpenEditor={vi.fn()}
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
            />,
        );

        expect(markup).toContain('Image Tools');
        expect(markup).toContain('Edit Current Image');
        expect(markup).toContain('Open SketchPad');
        expect(markup).toContain('Object References');
        expect(markup).toContain('Character References');
        expect(markup).toContain('1 / 4');
        expect(markup).toContain('1 / 2');
        expect(markup).toContain('workspace-side-tools-actions-card');
        expect(markup).toContain('workspace-side-tools-references-card');
        expect(markup).toContain('workspace-side-tools-actions');
        expect(markup).toContain('workspace-side-tool-references');
        expect(markup).toContain('workspace-side-tool-panel');
        expect(markup).not.toContain('Actions');
        expect(markup).not.toContain('Upload Base Image');
        expect(markup).not.toContain('Base image');
        expect(markup).not.toContain('Reference Tray');
        expect(markup).not.toContain('side-tools-open-references');
        expect(markup).not.toContain('Rec. < 2');
    });

    it('shows upload image to edit when no current image is available', () => {
        const markup = renderToStaticMarkup(
            <WorkspaceSideToolPanel
                currentLanguage="en"
                canEditCurrentImage={false}
                onOpenSketchPad={vi.fn()}
                onOpenEditor={vi.fn()}
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
            />,
        );

        expect(markup).toContain('Upload Image To Edit');
        expect(markup).not.toContain('Continue Editing');
    });
});
