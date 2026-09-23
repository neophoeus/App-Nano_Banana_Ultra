/** @vitest-environment jsdom */

import { act, type Dispatch, type SetStateAction } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AspectRatio, StageAsset } from '../types';

const {
    checkApiKeyMock,
    ensureLanguageLoadedMock,
    isLanguageLoadedMock,
    persistLanguagePreferenceMock,
    resolvePreferredLanguageMock,
    syncThemeFromStoredPreferenceMock,
    calculateBrowserSavedImageDbSizeMock,
} = vi.hoisted(() => ({
    checkApiKeyMock: vi.fn(async () => true),
    ensureLanguageLoadedMock: vi.fn(async () => undefined),
    isLanguageLoadedMock: vi.fn(() => true),
    persistLanguagePreferenceMock: vi.fn(),
    resolvePreferredLanguageMock: vi.fn(() => 'en'),
    syncThemeFromStoredPreferenceMock: vi.fn(),
    calculateBrowserSavedImageDbSizeMock: vi.fn(async () => 0),
}));

vi.mock('../services/geminiService', () => ({
    checkApiKey: checkApiKeyMock,
}));

vi.mock('../utils/translations', () => ({
    ensureLanguageLoaded: ensureLanguageLoadedMock,
    isLanguageLoaded: isLanguageLoadedMock,
    persistLanguagePreference: persistLanguagePreferenceMock,
    resolvePreferredLanguage: resolvePreferredLanguageMock,
}));

vi.mock('../utils/theme', () => ({
    syncThemeFromStoredPreference: syncThemeFromStoredPreferenceMock,
}));

vi.mock('../utils/browserImageStore', () => ({
    calculateBrowserSavedImageDbSize: calculateBrowserSavedImageDbSizeMock,
}));

import { useWorkspaceAppLifecycle } from '../hooks/useWorkspaceAppLifecycle';

const createStateSetter = <T,>() => vi.fn() as unknown as Dispatch<SetStateAction<T>>;

const buildStageAsset = (overrides: Partial<StageAsset> = {}): StageAsset => ({
    id: overrides.id ?? 'asset-1',
    url: overrides.url ?? 'https://example.com/reference.png',
    role: overrides.role ?? 'object',
    origin: overrides.origin ?? 'upload',
    createdAt: overrides.createdAt ?? 1,
    ...overrides,
});

describe('useWorkspaceAppLifecycle', () => {
    let container: HTMLDivElement;
    let root: Root;
    let originalImage: typeof Image;
    let imageConstructCount: number;
    const imageDimensionsBySrc = new Map<string, { width: number; height: number }>();

    class MockImage {
        onload: null | (() => void) = null;
        onerror: null | (() => void) = null;
        width = 0;
        height = 0;
        private currentSrc = '';

        constructor() {
            imageConstructCount += 1;
        }

        set src(value: string) {
            this.currentSrc = value;
            const dimensions = imageDimensionsBySrc.get(value);
            if (!dimensions) {
                return;
            }

            this.width = dimensions.width;
            this.height = dimensions.height;
            queueMicrotask(() => {
                this.onload?.();
            });
        }

        get src() {
            return this.currentSrc;
        }
    }

    const renderHook = (overrides: Partial<Parameters<typeof useWorkspaceAppLifecycle>[0]> = {}) => {
        const setApiKeyReady = createStateSetter<boolean>();
        const setCurrentLang = createStateSetter<any>();
        const setInitialPreferencesReady = createStateSetter<boolean>();
        const setAspectRatio = createStateSetter<AspectRatio>();
        const addLog = vi.fn();
        const showNotification = vi.fn();

        function Harness() {
            useWorkspaceAppLifecycle({
                historyCount: 0,
                generatedImageCount: 0,
                orderedReferenceAssets: [],
                hasDraftPrompt: false,
                aspectRatio: '1:1',
                setApiKeyReady,
                setCurrentLang,
                setInitialPreferencesReady,
                setAspectRatio,
                addLog,
                showNotification,
                t: (key) => (key === 'autoRatioSet' ? 'Ratio auto-set to {0}' : key),
                ...overrides,
            });

            return null;
        }

        act(() => {
            root.render(<Harness />);
        });

        return {
            setAspectRatio,
            addLog,
            showNotification,
        };
    };

    const renderHookWithUnmount = (overrides: Partial<Parameters<typeof useWorkspaceAppLifecycle>[0]> = {}) => {
        const setApiKeyReady = overrides.setApiKeyReady ?? createStateSetter<boolean>();
        const setCurrentLang = overrides.setCurrentLang ?? createStateSetter<any>();
        const setInitialPreferencesReady = overrides.setInitialPreferencesReady ?? createStateSetter<boolean>();
        const setAspectRatio = overrides.setAspectRatio ?? createStateSetter<AspectRatio>();
        const addLog = overrides.addLog ?? vi.fn();
        const showNotification = overrides.showNotification ?? vi.fn();

        function Harness() {
            useWorkspaceAppLifecycle({
                historyCount: 0,
                generatedImageCount: 0,
                orderedReferenceAssets: [],
                hasDraftPrompt: false,
                aspectRatio: '1:1',
                setApiKeyReady,
                setCurrentLang,
                setInitialPreferencesReady,
                setAspectRatio,
                addLog,
                showNotification,
                t: (key) => (key === 'autoRatioSet' ? 'Ratio auto-set to {0}' : key),
                ...overrides,
            });

            return null;
        }

        act(() => {
            root.render(<Harness />);
        });

        return {
            unmount: () => root.unmount(),
            setApiKeyReady,
            setAspectRatio,
            addLog,
            showNotification,
        };
    };

    const flushEffects = async () => {
        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });
    };

    beforeEach(() => {
        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        imageDimensionsBySrc.clear();
        imageConstructCount = 0;
        checkApiKeyMock.mockClear();
        ensureLanguageLoadedMock.mockClear();
        isLanguageLoadedMock.mockClear();
        persistLanguagePreferenceMock.mockClear();
        resolvePreferredLanguageMock.mockClear();
        syncThemeFromStoredPreferenceMock.mockClear();
        originalImage = globalThis.Image;
        globalThis.Image = MockImage as unknown as typeof Image;
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
        globalThis.Image = originalImage;
        vi.restoreAllMocks();
        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
    });

    it('auto-selects the closest ratio for uploaded references and emits a log plus toast when the ratio changes', async () => {
        imageDimensionsBySrc.set('https://example.com/reference-wide.png', { width: 1600, height: 900 });

        const { setAspectRatio, addLog, showNotification } = renderHook({
            orderedReferenceAssets: [
                buildStageAsset({
                    id: 'uploaded-ref',
                    url: 'https://example.com/reference-wide.png',
                    origin: 'upload',
                }),
            ],
        });

        await flushEffects();

        expect(setAspectRatio).toHaveBeenCalledWith('16:9');
        expect(addLog).toHaveBeenCalledWith('Ratio auto-set to 16:9');
        expect(showNotification).toHaveBeenCalledWith('Ratio auto-set to 16:9', 'info');
    });

    it('prioritizes a saved sketch ratio over later uploaded references', async () => {
        imageDimensionsBySrc.set('https://example.com/reference-wide.png', { width: 1600, height: 900 });

        const { setAspectRatio, addLog, showNotification } = renderHook({
            orderedReferenceAssets: [
                buildStageAsset({
                    id: 'sketch-ref',
                    url: 'data:image/png;base64,sketch',
                    origin: 'sketch',
                    isSketch: true,
                    aspectRatio: '3:4',
                }),
                buildStageAsset({
                    id: 'uploaded-ref',
                    url: 'https://example.com/reference-wide.png',
                    origin: 'upload',
                }),
            ],
        });

        await flushEffects();

        expect(setAspectRatio).toHaveBeenCalledWith('3:4');
        expect(addLog).toHaveBeenCalledWith('Ratio auto-set to 3:4');
        expect(showNotification).toHaveBeenCalledWith('Ratio auto-set to 3:4', 'info');
        expect(imageConstructCount).toBe(0);
    });

    it('does not emit a log or toast when the computed auto ratio already matches the current ratio', async () => {
        imageDimensionsBySrc.set('https://example.com/reference-square.png', { width: 1200, height: 1200 });

        const { setAspectRatio, addLog, showNotification } = renderHook({
            orderedReferenceAssets: [
                buildStageAsset({
                    id: 'uploaded-ref',
                    url: 'https://example.com/reference-square.png',
                    origin: 'upload',
                }),
            ],
            aspectRatio: '1:1',
        });

        await flushEffects();

        expect(setAspectRatio).not.toHaveBeenCalled();
        expect(addLog).not.toHaveBeenCalled();
        expect(showNotification).not.toHaveBeenCalled();
    });

    it('does not emit a log or toast or change aspect ratio when settings are locked', async () => {
        imageDimensionsBySrc.set('https://example.com/reference-wide.png', { width: 1600, height: 900 });

        const { setAspectRatio, addLog, showNotification } = renderHook({
            orderedReferenceAssets: [
                buildStageAsset({
                    id: 'uploaded-ref',
                    url: 'https://example.com/reference-wide.png',
                    origin: 'upload',
                }),
            ],
            aspectRatio: '1:1',
            settingsLocked: true,
        });

        await flushEffects();

        expect(setAspectRatio).not.toHaveBeenCalled();
        expect(addLog).not.toHaveBeenCalled();
        expect(showNotification).not.toHaveBeenCalled();
    });

    it('blocks beforeunload with localized export guidance when draft workspace data exists', async () => {
        renderHook({
            hasDraftPrompt: true,
            t: (key) =>
                key === 'windowCloseWarningMsg'
                    ? 'Closing this app will discard the workspace. Export first.'
                    : key === 'autoRatioSet'
                      ? 'Ratio auto-set to {0}'
                      : key,
        });

        await flushEffects();

        const event = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
        Object.defineProperty(event, 'returnValue', {
            configurable: true,
            writable: true,
            value: '',
        });
        const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

        const dispatchResult = window.dispatchEvent(event);

        expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
        expect(event.returnValue).toBe('Closing this app will discard the workspace. Export first.');
        expect(dispatchResult).toBe(false);
    });

    it('sets up API key retry polling and periodic background heartbeat checks, and cleans them up on unmount', async () => {
        vi.useFakeTimers();
        checkApiKeyMock.mockReset();
        // Initially checkApiKey returns false to trigger polling
        checkApiKeyMock.mockResolvedValue(false);

        const setApiKeyReady = createStateSetter<boolean>();
        const { unmount } = renderHookWithUnmount({ setApiKeyReady, supportsKeepAliveHeartbeat: true });

        // Let the asynchronous verifyApiKeyWithRetry start
        await act(async () => {
            await Promise.resolve();
        });

        // The first initial call has run
        expect(checkApiKeyMock).toHaveBeenCalledTimes(1);

        // Advance timers by 500ms to trigger the first polling retry
        await act(async () => {
            await vi.advanceTimersByTimeAsync(500);
        });
        expect(checkApiKeyMock).toHaveBeenCalledTimes(2);

        // Change mock so that next check returns true (key is now ready)
        checkApiKeyMock.mockResolvedValue(true);

        // Advance by 9500ms (cumulative 10000ms from start) to trigger the 10s heartbeat
        await act(async () => {
            await vi.advanceTimersByTimeAsync(9500);
        });

        // It should have called setApiKeyReady(true) from the heartbeat
        expect(setApiKeyReady).toHaveBeenCalledWith(true);

        // Unmount the component to trigger cleanup
        act(() => {
            unmount();
        });

        // Clear mock history to verify no new calls occur
        checkApiKeyMock.mockClear();

        // Advance timers by another 10 seconds, no more checks or state updates should run
        await act(async () => {
            await vi.advanceTimersByTimeAsync(10000);
        });

        expect(checkApiKeyMock).not.toHaveBeenCalled();
        vi.useRealTimers();
    });

    it('triggers storage warning callback and logs when IndexedDB storage exceeds 300MB threshold', async () => {
        vi.useFakeTimers();
        calculateBrowserSavedImageDbSizeMock.mockResolvedValue(301 * 1024 * 1024); // 301MB

        const onStorageWarning = vi.fn();
        const addLog = vi.fn();

        renderHook({
            supportsStorageWarning: true,
            onStorageWarning,
            addLog,
            t: (key) => (key === 'workspaceStorageWarningNotice' ? 'Storage warning notice {0}' : key),
        });

        // Let the initial async checkStorageAndWarn run
        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(onStorageWarning).toHaveBeenCalledWith(301);
        expect(addLog).toHaveBeenCalledWith('Storage warning notice 301');

        onStorageWarning.mockClear();
        addLog.mockClear();

        // Advance timers by 30 seconds to trigger interval check
        await act(async () => {
            await vi.advanceTimersByTimeAsync(30000);
        });

        // Since it's already shown, it should not trigger again
        expect(onStorageWarning).not.toHaveBeenCalled();

        // Now drop the size below threshold
        calculateBrowserSavedImageDbSizeMock.mockResolvedValue(200 * 1024 * 1024); // 200MB
        await act(async () => {
            await vi.advanceTimersByTimeAsync(30000);
        });

        // Increase it again above threshold
        calculateBrowserSavedImageDbSizeMock.mockResolvedValue(350 * 1024 * 1024); // 350MB
        await act(async () => {
            await vi.advanceTimersByTimeAsync(30000);
        });

        expect(onStorageWarning).toHaveBeenCalledWith(350);

        vi.useRealTimers();
    });

    it('suppresses storage warning callback and logs when auto export backup is enabled', async () => {
        vi.useFakeTimers();
        calculateBrowserSavedImageDbSizeMock.mockResolvedValue(350 * 1024 * 1024); // 350MB

        const onStorageWarning = vi.fn();
        const addLog = vi.fn();

        renderHook({
            supportsStorageWarning: true,
            onStorageWarning,
            addLog,
            autoExportTrigger: 'both',
            t: (key) => (key === 'workspaceStorageWarningNotice' ? 'Storage warning notice {0}' : key),
        });

        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(onStorageWarning).not.toHaveBeenCalled();
        expect(addLog).not.toHaveBeenCalled();

        vi.useRealTimers();
    });
});
