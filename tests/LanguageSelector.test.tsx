/** @vitest-environment jsdom */

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LanguageSelector from '../components/LanguageSelector';

describe('LanguageSelector', () => {
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
        vi.restoreAllMocks();
        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
    });

    it('uses solid panel surfaces and stable hover classes for the toggle and menu options', () => {
        const onLanguageChange = vi.fn();

        act(() => {
            root.render(<LanguageSelector currentLanguage="en" onLanguageChange={onLanguageChange} />);
        });

        const toggle = container.querySelector('[data-testid="language-selector-toggle"]') as HTMLButtonElement | null;

        expect(toggle).toBeTruthy();
        expect(toggle?.className).toContain('border-gray-300 bg-white text-gray-700');
        expect(toggle?.className).toContain('hover:bg-gray-100');
        expect(toggle?.className).toContain('dark:bg-gray-800');
        expect(toggle?.className).toContain('dark:hover:bg-gray-700');
        expect(toggle?.className).not.toContain('nbu-overlay-shell');

        act(() => {
            toggle?.click();
        });

        const openToggle = container.querySelector(
            '[data-testid="language-selector-toggle"]',
        ) as HTMLButtonElement | null;
        const menu = container.querySelector('[data-testid="language-selector-menu"]') as HTMLDivElement | null;
        const activeOption = container.querySelector('[data-testid="language-option-en"]') as HTMLButtonElement | null;
        const inactiveOption = container.querySelector(
            '[data-testid="language-option-zh_TW"]',
        ) as HTMLButtonElement | null;

        expect(openToggle?.className).toContain('border-amber-400 bg-white text-amber-700');
        expect(openToggle?.className).toContain('dark:bg-gray-800');
        expect(openToggle?.className).toContain('dark:hover:bg-gray-700');
        expect(menu).toBeTruthy();
        expect(menu?.className).toContain('border-gray-200 bg-white');
        expect(menu?.className).toContain('dark:border-gray-700 dark:bg-gray-900');
        expect(menu?.className).not.toContain('nbu-overlay-shell');
        expect(activeOption?.className).toContain('bg-amber-50 text-amber-700 font-bold');
        expect(activeOption?.className).toContain('dark:bg-amber-500/20 dark:text-amber-200');
        expect(inactiveOption?.className).toContain('text-gray-700 hover:bg-gray-100 hover:text-gray-900');
        expect(inactiveOption?.className).toContain('dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white');
    });
});
