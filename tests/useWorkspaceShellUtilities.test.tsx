/** @vitest-environment jsdom */

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorkspaceShellUtilities } from '../hooks/useWorkspaceShellUtilities';

const { checkApiKeyMock, promptForApiKeyMock } = vi.hoisted(() => ({
    checkApiKeyMock: vi.fn(),
    promptForApiKeyMock: vi.fn(),
}));

vi.mock('../services/geminiService', () => ({
    checkApiKey: checkApiKeyMock,
    promptForApiKey: promptForApiKeyMock,
}));

type HookHandle = ReturnType<typeof useWorkspaceShellUtilities>;

describe('useWorkspaceShellUtilities', () => {
    let container: HTMLDivElement;
    let root: Root;
    let latestHook: HookHandle | null;
    let latestApiKeyReady = false;

    const renderHook = () => {
        function Harness() {
            latestHook = useWorkspaceShellUtilities({
                setApiKeyReady: (value) => {
                    latestApiKeyReady = typeof value === 'function' ? value(latestApiKeyReady) : value;
                },
            });
            return null;
        }

        act(() => {
            root.render(<Harness />);
        });
    };

    beforeEach(() => {
        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
        vi.useFakeTimers();
        localStorage.clear();
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        latestHook = null;
        latestApiKeyReady = false;
        checkApiKeyMock.mockReset();
        promptForApiKeyMock.mockReset();
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
        vi.useRealTimers();
        vi.restoreAllMocks();
        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
    });

    it('replaces the active notification timeout when a newer notification arrives', () => {
        renderHook();
        expect(latestHook?.notification).toBeNull();

        act(() => {
            latestHook?.showNotification('first', 'info');
        });
        expect(latestHook?.notification).toEqual({ msg: 'first', type: 'info' });

        act(() => {
            vi.advanceTimersByTime(2000);
            latestHook?.showNotification('second', 'error');
        });
        expect(latestHook?.notification).toEqual({ msg: 'second', type: 'error' });

        act(() => {
            vi.advanceTimersByTime(1500);
        });
        expect(latestHook?.notification).toEqual({ msg: 'second', type: 'error' });

        act(() => {
            vi.advanceTimersByTime(1500);
        });
        expect(latestHook?.notification).toBeNull();
    });

    it('checks API readiness first, skips the alert when already ready, and persists enter-to-submit toggles', async () => {
        checkApiKeyMock.mockResolvedValue(true);

        renderHook();
        expect(latestHook?.enterToSubmit).toBe(true);
        expect(latestHook?.systemStatusRefreshToken).toBe(0);

        await act(async () => {
            const ready = await latestHook?.handleApiKeyConnect();
            expect(ready).toBe(true);
        });

        expect(promptForApiKeyMock).not.toHaveBeenCalled();
        expect(checkApiKeyMock).toHaveBeenCalledTimes(1);
        expect(latestApiKeyReady).toBe(true);
        expect(latestHook?.systemStatusRefreshToken).toBe(1);

        act(() => {
            latestHook?.toggleEnterToSubmit();
        });
        expect(latestHook?.enterToSubmit).toBe(false);
        expect(localStorage.getItem('nbu_enterToSubmit')).toBe('false');
    });

    it('still prompts when the API key is actually missing', async () => {
        promptForApiKeyMock.mockResolvedValue(undefined);
        checkApiKeyMock.mockResolvedValue(false);

        renderHook();

        await act(async () => {
            const ready = await latestHook?.handleApiKeyConnect();
            expect(ready).toBe(false);
        });

        expect(checkApiKeyMock).toHaveBeenCalledTimes(1);
        expect(promptForApiKeyMock).toHaveBeenCalledTimes(1);
        expect(latestApiKeyReady).toBe(false);
        expect(latestHook?.systemStatusRefreshToken).toBe(1);
    });
});
