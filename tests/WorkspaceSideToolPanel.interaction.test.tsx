/** @vitest-environment jsdom */

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WorkspaceSideToolPanel from '../components/WorkspaceSideToolPanel';

function installMatchMedia(matches: boolean) {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
            matches,
            media: query,
            onchange: null,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            addListener: vi.fn(),
            removeListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });
}

const baseProps = {
    currentLanguage: 'en' as const,
    canEditCurrentImage: true,
    onOpenSketchPad: vi.fn(),
    onOpenEditor: vi.fn(),
    onOpenUploadToRepaint: vi.fn(),
    objectImages: ['object.png'],
    characterImages: ['character.png'],
    maxObjects: 4,
    maxCharacters: 2,
    setObjectImages: vi.fn(),
    setCharacterImages: vi.fn(),
    isGenerating: false,
    showNotification: vi.fn(),
    handleRemoveObjectReference: vi.fn(),
    handleRemoveCharacterReference: vi.fn(),
    handleClearAllReferences: vi.fn(),
};

describe('WorkspaceSideToolPanel references interactions', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
        installMatchMedia(true);
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
        vi.restoreAllMocks();
        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
    });

    it('surfaces the right-aligned localized clear action beside the references title and clears every reference at once', () => {
        const handleClearAllReferences = vi.fn();

        act(() => {
            root.render(<WorkspaceSideToolPanel {...baseProps} handleClearAllReferences={handleClearAllReferences} />);
        });

        const clearAllButton = container.querySelector(
            '[data-testid="workspace-side-tools-references-clear-all"]',
        ) as HTMLButtonElement;

        expect(clearAllButton).toBeInstanceOf(HTMLButtonElement);
        expect(clearAllButton.disabled).toBe(false);
        expect(clearAllButton.textContent).toBe('Clear');
        expect((clearAllButton.parentElement as HTMLDivElement).className).toContain('justify-between');

        act(() => {
            clearAllButton.click();
        });

        expect(handleClearAllReferences).toHaveBeenCalledTimes(1);
    });

    it('keeps the small clear action disabled when no references are attached', () => {
        act(() => {
            root.render(
                <WorkspaceSideToolPanel
                    {...baseProps}
                    objectImages={[]}
                    characterImages={[]}
                    handleClearAllReferences={vi.fn()}
                />,
            );
        });

        const clearAllButton = container.querySelector(
            '[data-testid="workspace-side-tools-references-clear-all"]',
        ) as HTMLButtonElement;

        expect(clearAllButton.disabled).toBe(true);
    });

    it('keeps the floating references dialog available from the merged card toggle while leaving the toggle itself icon-free', () => {
        act(() => {
            root.render(<WorkspaceSideToolPanel {...baseProps} />);
        });

        const toggleButton = container.querySelector(
            '[data-testid="workspace-side-tools-references-toggle"]',
        ) as HTMLButtonElement;

        expect(toggleButton.querySelector('svg')).toBeNull();
        expect(container.querySelector('[data-testid="workspace-side-tool-references"]')).toBeNull();

        act(() => {
            toggleButton.click();
        });

        const floatingDialog = container.querySelector(
            '[data-testid="workspace-side-tool-references"]',
        ) as HTMLDivElement;
        const closeButton = container.querySelector('button[aria-label="Close"]') as HTMLButtonElement;

        expect(floatingDialog).toBeInstanceOf(HTMLDivElement);
        expect(closeButton).toBeInstanceOf(HTMLButtonElement);
        expect(closeButton.querySelector('svg')).toBeInstanceOf(SVGSVGElement);

        act(() => {
            closeButton.click();
        });

        expect(container.querySelector('[data-testid="workspace-side-tool-references"]')).toBeNull();
    });
});
