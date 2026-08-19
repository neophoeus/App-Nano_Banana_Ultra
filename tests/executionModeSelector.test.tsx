/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import ExecutionModeSelector from '../components/ExecutionModeSelector';
import { setExecutionModeSetting, getExecutionModeSetting } from '../utils/workspaceExecutionMode';

describe('ExecutionModeSelector', () => {
    let container: HTMLDivElement;
    let root: Root;

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

        // Click direct mode option
        const directOption = container.querySelector('[data-testid="execution-mode-option-direct"]') as HTMLButtonElement;
        expect(directOption).toBeTruthy();

        await act(async () => {
            directOption.click();
        });

        expect(getExecutionModeSetting()).toBe('direct');
        // Menu should be closed after selection
        expect(container.querySelector('[data-testid="execution-mode-menu"]')).toBeNull();
    });
});
