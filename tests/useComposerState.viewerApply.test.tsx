/** @vitest-environment jsdom */

import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ViewerComposerSettingsSnapshot } from '../types';
import { useComposerState } from '../hooks/useComposerState';
import { EMPTY_WORKSPACE_COMPOSER_STATE } from '../utils/workspacePersistence';

type HookHandle = ReturnType<typeof useComposerState>;

describe('useComposerState viewer apply', () => {
    let container: HTMLDivElement;
    let root: Root;
    let latestHook: HookHandle | null;
    let setGenerationMode: ReturnType<typeof vi.fn>;
    let setExecutionMode: ReturnType<typeof vi.fn>;
    let setDisplaySettings: ReturnType<typeof vi.fn>;

    const renderHook = () => {
        function Harness() {
            latestHook = useComposerState({
                initialComposerState: {
                    ...EMPTY_WORKSPACE_COMPOSER_STATE,
                    prompt: 'Keep this prompt',
                    aspectRatio: '1:1',
                    imageSize: '2K',
                    imageModel: 'gemini-3.1-flash-image-preview',
                    outputFormat: 'images-and-text',
                    thinkingLevel: 'high',
                    googleSearch: true,
                    imageSearch: true,
                },
                generationMode: 'Text to Image',
                executionMode: 'single-turn',
                setGenerationMode,
                setExecutionMode,
                setDisplaySettings,
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
        setGenerationMode = vi.fn();
        setExecutionMode = vi.fn();
        setDisplaySettings = vi.fn();
    });

    afterEach(() => {
        root.unmount();
        container.remove();
        vi.restoreAllMocks();
    });

    it('preserves prompt state while normalizing pro-model viewer settings', () => {
        renderHook();

        const snapshot: ViewerComposerSettingsSnapshot = {
            aspectRatio: '1:8',
            imageSize: '512',
            imageStyle: 'Anime',
            imageModel: 'gemini-3-pro-image-preview',
            batchSize: 3.4,
            outputFormat: 'images-only',
            temperature: 4,
            thinkingLevel: 'disabled',
            includeThoughts: true,
            googleSearch: true,
        };

        flushSync(() => {
            latestHook!.applyViewerComposerSettingsSnapshot(snapshot);
        });

        expect(latestHook!.composerState.prompt).toBe('Keep this prompt');
        expect(latestHook!.composerState.imageModel).toBe('gemini-3-pro-image-preview');
        expect(latestHook!.composerState.aspectRatio).toBe('1:1');
        expect(latestHook!.composerState.imageSize).toBe('1K');
        expect(latestHook!.composerState.batchSize).toBe(3);
        expect(latestHook!.composerState.outputFormat).toBe('images-only');
        expect(latestHook!.composerState.temperature).toBe(2);
        expect(latestHook!.composerState.thinkingLevel).toBe('disabled');
        expect(latestHook!.composerState.includeThoughts).toBe(true);
        expect(latestHook!.composerState.googleSearch).toBe(true);
        expect(latestHook!.composerState.imageSearch).toBe(false);
        expect(setGenerationMode).not.toHaveBeenCalled();
        expect(setExecutionMode).not.toHaveBeenCalled();
        expect(setDisplaySettings).toHaveBeenLastCalledWith(
            expect.objectContaining({
                prompt: 'Keep this prompt',
                aspectRatio: '1:1',
                size: '1K',
                style: 'Anime',
                model: 'gemini-3-pro-image-preview',
                batchSize: 3,
                outputFormat: 'images-only',
                temperature: 2,
                thinkingLevel: 'disabled',
                includeThoughts: true,
                googleSearch: true,
                imageSearch: false,
            }),
        );
    });

    it('keeps the current composer size when applying no-size model settings', () => {
        renderHook();

        const snapshot: ViewerComposerSettingsSnapshot = {
            aspectRatio: '16:9',
            imageStyle: 'None',
            imageModel: 'gemini-2.5-flash-image',
            batchSize: 2.2,
            thinkingLevel: 'high' as const,
            includeThoughts: true,
            googleSearch: true,
            imageSearch: true,
        };

        flushSync(() => {
            latestHook!.applyViewerComposerSettingsSnapshot(snapshot);
        });

        expect(latestHook!.composerState.prompt).toBe('Keep this prompt');
        expect(latestHook!.composerState.imageModel).toBe('gemini-2.5-flash-image');
        expect(latestHook!.composerState.aspectRatio).toBe('16:9');
        expect(latestHook!.composerState.imageSize).toBe('2K');
        expect(latestHook!.composerState.batchSize).toBe(2);
        expect(latestHook!.composerState.outputFormat).toBe('images-only');
        expect(latestHook!.composerState.temperature).toBe(1);
        expect(latestHook!.composerState.thinkingLevel).toBe('disabled');
        expect(latestHook!.composerState.includeThoughts).toBe(false);
        expect(latestHook!.composerState.googleSearch).toBe(false);
        expect(latestHook!.composerState.imageSearch).toBe(false);
        expect(setDisplaySettings).toHaveBeenLastCalledWith(
            expect.objectContaining({
                prompt: 'Keep this prompt',
                aspectRatio: '16:9',
                size: '2K',
                style: 'None',
                model: 'gemini-2.5-flash-image',
                batchSize: 2,
                outputFormat: 'images-only',
                temperature: 1,
                thinkingLevel: 'disabled',
                includeThoughts: false,
                googleSearch: false,
                imageSearch: false,
            }),
        );
    });
});
