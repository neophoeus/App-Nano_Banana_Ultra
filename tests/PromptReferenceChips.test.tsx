/** @vitest-environment jsdom */

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import './setupTranslations';
import {
    PromptReferenceChips,
    PromptReferencedBadges,
    resolveDisplayReferenceImage,
} from '../components/PromptReferenceChips';

describe('PromptReferenceChips', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
    });

    it('returns null when no reference images are provided', () => {
        const markup = renderToStaticMarkup(
            <PromptReferenceChips objectImages={[]} characterImages={[]} onInsertTag={vi.fn()} />,
        );
        expect(markup).toBe('');
    });

    it('renders object and character quick tag chips correctly', () => {
        const onInsertTag = vi.fn();
        act(() => {
            root.render(
                <PromptReferenceChips
                    objectImages={['data:image/png;base64,obj1', 'data:image/png;base64,obj2']}
                    characterImages={['data:image/png;base64,char1']}
                    onInsertTag={onInsertTag}
                    currentLanguage="zh_TW"
                />,
            );
        });

        const chipsContainer = container.querySelector('[data-testid="composer-reference-chips"]');
        expect(chipsContainer).not.toBeNull();

        const objChip1 = container.querySelector(
            '[data-testid="composer-reference-chip-[Obj_1]"]',
        ) as HTMLButtonElement;
        const objChip2 = container.querySelector(
            '[data-testid="composer-reference-chip-[Obj_2]"]',
        ) as HTMLButtonElement;
        const charChip1 = container.querySelector(
            '[data-testid="composer-reference-chip-[Char_1]"]',
        ) as HTMLButtonElement;

        expect(objChip1).not.toBeNull();
        expect(objChip2).not.toBeNull();
        expect(charChip1).not.toBeNull();

        // Clicking a chip triggers onInsertTag
        act(() => {
            objChip1.click();
        });
        expect(onInsertTag).toHaveBeenCalledWith('[Obj_1]');

        act(() => {
            charChip1.click();
        });
        expect(onInsertTag).toHaveBeenCalledWith('[Char_1]');
    });

    it('shows and hides hover preview tooltip when hovering over a chip', () => {
        act(() => {
            root.render(
                <PromptReferenceChips
                    objectImages={['data:image/png;base64,obj1']}
                    characterImages={[]}
                    onInsertTag={vi.fn()}
                    currentLanguage="en"
                />,
            );
        });

        const chipButton = container.querySelector(
            '[data-testid="composer-reference-chip-[Obj_1]"]',
        ) as HTMLButtonElement;
        const chipContainer = chipButton.parentElement as HTMLElement;

        // Before hover, tooltip is not rendered
        expect(container.querySelector('[data-testid="reference-tag-tooltip-[Obj_1]"]')).toBeNull();

        // Focus/pointerenter shows tooltip popping downwards
        act(() => {
            chipButton.focus();
        });
        const tooltip = container.querySelector('[data-testid="reference-tag-tooltip-[Obj_1]"]');
        expect(tooltip).not.toBeNull();
        expect(tooltip?.className).toContain('top-full');
        expect(container.textContent).toContain('Click to insert');

        // Blur/pointerleave hides tooltip
        act(() => {
            chipButton.blur();
        });
        expect(container.querySelector('[data-testid="reference-tag-tooltip-[Obj_1]"]')).toBeNull();
    });

    it('disables chips when disabled prop is true', () => {
        act(() => {
            root.render(
                <PromptReferenceChips
                    objectImages={['data:image/png;base64,obj1']}
                    onInsertTag={vi.fn()}
                    disabled={true}
                />,
            );
        });

        const chipButton = container.querySelector(
            '[data-testid="composer-reference-chip-[Obj_1]"]',
        ) as HTMLButtonElement;
        expect(chipButton.disabled).toBe(true);
    });
});

describe('PromptReferencedBadges', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
    });

    it('returns null when prompt has no reference tags', () => {
        const markup = renderToStaticMarkup(
            <PromptReferencedBadges
                prompt="A standard landscape without tags"
                objectImages={['data:image/png;base64,obj1']}
            />,
        );
        expect(markup).toBe('');
    });

    it('identifies and displays valid referenced tags with select and hover preview', () => {
        const onSelect = vi.fn();
        act(() => {
            root.render(
                <PromptReferencedBadges
                    prompt="An illustration of [Char_1] holding [Obj_1]"
                    objectImages={['data:image/png;base64,obj1']}
                    characterImages={['data:image/png;base64,char1']}
                    onSelectTagInTextarea={onSelect}
                    currentLanguage="zh_TW"
                />,
            );
        });

        expect(container.querySelector('[data-testid="composer-referenced-badges-bar"]')).not.toBeNull();
        const charBadge = container.querySelector('[data-testid="composer-cited-badge-[Char_1]"]') as HTMLButtonElement;
        const objBadge = container.querySelector('[data-testid="composer-cited-badge-[Obj_1]"]') as HTMLButtonElement;

        expect(charBadge).not.toBeNull();
        expect(objBadge).not.toBeNull();

        // Clicking badge calls onSelectTagInTextarea
        act(() => {
            charBadge.click();
        });
        expect(onSelect).toHaveBeenCalledWith('[Char_1]');

        // Focus/hover shows tooltip popping upwards
        act(() => {
            charBadge.focus();
        });
        const citedTooltip = container.querySelector('[data-testid="reference-tag-tooltip-[Char_1]"]');
        expect(citedTooltip).not.toBeNull();
        expect(citedTooltip?.className).toContain('bottom-full');
    });

    it('identifies orphan tags when referenced image does not exist, and allows removal', () => {
        const onRemoveTag = vi.fn();
        act(() => {
            root.render(
                <PromptReferencedBadges
                    prompt="A scene with [Obj_1] and [Obj_2] and [Char_9]"
                    objectImages={['data:image/png;base64,obj1']} // Only 1 object image, Obj_2 is orphan
                    characterImages={[]} // No character image, Char_9 is orphan
                    onRemoveTag={onRemoveTag}
                    currentLanguage="zh_TW"
                />,
            );
        });

        expect(container.querySelector('[data-testid="composer-cited-badge-[Obj_1]"]')).not.toBeNull();
        expect(container.querySelector('[data-testid="composer-orphan-tag-[Obj_2]"]')).not.toBeNull();
        expect(container.querySelector('[data-testid="composer-orphan-tag-[Char_9]"]')).not.toBeNull();

        // Individual remove button
        const removeButtons = container.querySelectorAll('[data-testid^="composer-orphan-tag-"] button');
        expect(removeButtons.length).toBe(2);
        act(() => {
            (removeButtons[0] as HTMLButtonElement).click();
        });
        expect(onRemoveTag).toHaveBeenCalledWith('[Obj_2]');

        // Clean all orphans button
        const cleanAllBtn = container.querySelector('[data-testid="composer-clean-all-orphans"]') as HTMLButtonElement;
        expect(cleanAllBtn).not.toBeNull();
        act(() => {
            cleanAllBtn.click();
        });
        expect(onRemoveTag).toHaveBeenCalledWith('[Obj_2]');
        expect(onRemoveTag).toHaveBeenCalledWith('[Char_9]');
    });
});

describe('resolveDisplayReferenceImage', () => {
    it('returns empty string for nullish or empty source', () => {
        expect(resolveDisplayReferenceImage(null)).toBe('');
        expect(resolveDisplayReferenceImage(undefined)).toBe('');
        expect(resolveDisplayReferenceImage('')).toBe('');
    });

    it('returns data URLs and web URLs as-is when not cached', () => {
        expect(resolveDisplayReferenceImage('data:image/png;base64,test')).toBe('data:image/png;base64,test');
        expect(resolveDisplayReferenceImage('https://example.com/test.jpg')).toBe('https://example.com/test.jpg');
        expect(resolveDisplayReferenceImage('blob:http://localhost/1234')).toBe('blob:http://localhost/1234');
    });

    it('converts saved filename using buildSavedImageLoadUrl', () => {
        const result = resolveDisplayReferenceImage('gemini_saved_img.png');
        expect(result).toContain('gemini_saved_img.png');
    });
});
