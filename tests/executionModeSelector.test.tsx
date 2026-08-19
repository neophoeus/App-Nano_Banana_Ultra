/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import ExecutionModeSelector from '../components/ExecutionModeSelector';
import { preloadAllTranslations } from '../utils/translations';
import { setExecutionModeSetting, getExecutionModeSetting } from '../utils/workspaceExecutionMode';

describe('ExecutionModeSelector', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeAll(async () => {
        await preloadAllTranslations();
    });

    beforeEach(() => {
        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        localStorage.clear();
        setExecutionModeSetting('auto');
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
        localStorage.clear();
    });

    it('renders mode button and opens menu on click', async () => {
        await act(async () => {
            root.render(<ExecutionModeSelector currentLanguage="zh_TW" />);
        });

        const button = container.querySelector('[data-testid="execution-mode-selector-btn"]') as HTMLButtonElement;
        expect(button).toBeTruthy();

        // Initially menu is closed
        expect(container.querySelector('[data-testid="execution-mode-menu"]')).toBeNull();

        // Click to open
        await act(async () => {
            button.click();
        });

        const menu = container.querySelector('[data-testid="execution-mode-menu"]');
        expect(menu).toBeTruthy();
        expect(menu?.textContent).toContain('本地 API 運行');
        expect(menu?.textContent).toContain('AI Studio 運行');

        // Click direct mode option
        const directOption = container.querySelector(
            '[data-testid="execution-mode-option-direct"]',
        ) as HTMLButtonElement;
        expect(directOption).toBeTruthy();
        expect(directOption.textContent).toContain('AI Studio 運行');

        await act(async () => {
            directOption.click();
        });

        expect(getExecutionModeSetting()).toBe('direct');
        // Menu should be closed after selection
        expect(container.querySelector('[data-testid="execution-mode-menu"]')).toBeNull();

        // Button label should now show AI Studio 運行
        expect(button.textContent).toContain('AI Studio 運行');
    });

    it('renders local mode label correctly in zh_TW', async () => {
        setExecutionModeSetting('local');
        await act(async () => {
            root.render(<ExecutionModeSelector currentLanguage="zh_TW" />);
        });

        const button = container.querySelector('[data-testid="execution-mode-selector-btn"]') as HTMLButtonElement;
        expect(button).toBeTruthy();
        expect(button.textContent).toContain('本地 API 運行');
    });

    it('renders English mode labels and auto badge without legacy Ultra/Lite markers', async () => {
        setExecutionModeSetting('auto');
        await act(async () => {
            root.render(<ExecutionModeSelector currentLanguage="en" />);
        });

        const button = container.querySelector('[data-testid="execution-mode-selector-btn"]') as HTMLButtonElement;
        expect(button).toBeTruthy();
        expect(button.textContent).not.toContain('(Ultra)');
        expect(button.textContent).not.toContain('(Lite)');

        await act(async () => {
            button.click();
        });

        const menu = container.querySelector('[data-testid="execution-mode-menu"]');
        expect(menu).toBeTruthy();
        expect(menu?.textContent).toContain('Local API');
        expect(menu?.textContent).toContain('AI Studio');
        expect(menu?.textContent).not.toContain('(Ultra)');
        expect(menu?.textContent).not.toContain('(Lite)');
    });

    it('renders Japanese mode labels correctly', async () => {
        setExecutionModeSetting('direct');
        await act(async () => {
            root.render(<ExecutionModeSelector currentLanguage="ja" />);
        });

        const button = container.querySelector('[data-testid="execution-mode-selector-btn"]') as HTMLButtonElement;
        expect(button).toBeTruthy();
        expect(button.textContent).toContain('AI Studio 実行');
    });
});
