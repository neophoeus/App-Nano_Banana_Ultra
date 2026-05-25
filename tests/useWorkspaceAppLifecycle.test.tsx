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
} = vi.hoisted(() => ({
    checkApiKeyMock: vi.fn(async () => true),
    ensureLanguageLoadedMock: vi.fn(async () => undefined),
    isLanguageLoadedMock: vi.fn(() => true),
    persistLanguagePreferenceMock: vi.fn(),
    resolvePreferredLanguageMock: vi.fn(() => 'en'),
    syncThemeFromStoredPreferenceMock: vi.fn(),
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
});