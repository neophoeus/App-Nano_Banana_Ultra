/** @vitest-environment jsdom */

import { flushSync } from 'react-dom';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useComposerState } from '../hooks/useComposerState';
import { EMPTY_WORKSPACE_COMPOSER_STATE } from '../utils/workspacePersistence';

type HookHandle = ReturnType<typeof useComposerState>;

describe('useComposerState lock behavior', () => {
    let container: HTMLDivElement;
    let root: Root;
    let latestHook: HookHandle | null;

    const renderHook = () => {
        function Harness() {
            latestHook = useComposerState({
                initialComposerState: {
                    ...EMPTY_WORKSPACE_COMPOSER_STATE,
                    prompt: 'Original prompt',
                    aspectRatio: '1:1',
                    imageSize: '1K',
                    imageModel: 'gemini-3.1-flash-image',
                    imageStyle: 'None',
                    batchSize: 1,
                    outputFormat: 'images-only',
                    temperature: 1.0,
                    thinkingLevel: 'disabled',
                    includeThoughts: false,
                    googleSearch: false,
                    imageSearch: false,
                },
                generationMode: 'Text to Image',
                executionMode: 'single-turn',
                setGenerationMode: vi.fn(),
                setExecutionMode: vi.fn(),
                setDisplaySettings: vi.fn(),
            });

            return null;
        }

        flushSync(() => {
            root.render(<Harness />);
        });
    };

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        latestHook = null;
        localStorage.clear();
    });

    afterEach(() => {
        root.unmount();
        container.remove();
        vi.restoreAllMocks();
    });

    it('should be unlocked by default', () => {
        renderHook();
        expect(latestHook!.settingsLocked).toBe(false);
    });

    it('should lock settings when toggled', () => {
        renderHook();
        flushSync(() => {
            latestHook!.setSettingsLocked(true);
        });
        expect(latestHook!.settingsLocked).toBe(true);
        expect(localStorage.getItem('nbu_settings_locked')).toBe('true');
    });

    it('should ignore settings updates when locked', () => {
        renderHook();
        flushSync(() => {
            latestHook!.setSettingsLocked(true);
        });

        flushSync(() => {
            latestHook!.setAspectRatio('16:9');
            latestHook!.setImageSize('2K');
            latestHook!.setImageStyle('Anime');
            latestHook!.setImageModel('gemini-3-pro-image');
            latestHook!.setBatchSize(4);
            latestHook!.setPrompt('New prompt');
        });

        expect(latestHook!.composerState.aspectRatio).toBe('1:1');
        expect(latestHook!.composerState.imageSize).toBe('1K');
        expect(latestHook!.composerState.imageStyle).toBe('None');
        expect(latestHook!.composerState.imageModel).toBe('gemini-3.1-flash-image');
        expect(latestHook!.composerState.batchSize).toBe(1);
        expect(latestHook!.composerState.prompt).toBe('New prompt');
    });

    it('should preserve locked settings when applyComposerState is called', () => {
        renderHook();
        flushSync(() => {
            latestHook!.setSettingsLocked(true);
        });

        flushSync(() => {
            latestHook!.applyComposerState({
                ...EMPTY_WORKSPACE_COMPOSER_STATE,
                prompt: 'Apply incoming prompt',
                aspectRatio: '16:9',
                imageSize: '2K',
                imageStyle: 'Anime',
                imageModel: 'gemini-3-pro-image',
                batchSize: 3,
            });
        });

        expect(latestHook!.composerState.prompt).toBe('Apply incoming prompt');
        expect(latestHook!.composerState.aspectRatio).toBe('1:1');
        expect(latestHook!.composerState.imageSize).toBe('1K');
        expect(latestHook!.composerState.imageStyle).toBe('None');
        expect(latestHook!.composerState.imageModel).toBe('gemini-3.1-flash-image');
        expect(latestHook!.composerState.batchSize).toBe(1);
    });
});
