/** @vitest-environment jsdom */

import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useImageGeneration } from '../hooks/useImageGeneration';
import { WorkspacePersistenceSnapshot } from '../types';
import { EMPTY_WORKSPACE_SNAPSHOT } from '../utils/workspacePersistence';

type HookHandle = ReturnType<typeof useImageGeneration>;

const buildSnapshot = (overrides: Partial<WorkspacePersistenceSnapshot> = {}): WorkspacePersistenceSnapshot => ({
    ...EMPTY_WORKSPACE_SNAPSHOT,
    ...overrides,
});

describe('useImageGeneration', () => {
    let container: HTMLDivElement;
    let root: Root;
    let latestHook: HookHandle | null;

    const renderHook = (snapshot: WorkspacePersistenceSnapshot) => {
        function Harness() {
            latestHook = useImageGeneration(snapshot);
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
    });

    afterEach(() => {
        root.unmount();
        container.remove();
        latestHook = null;
    });

    it('hydrates generation mode and display settings from the restored composer snapshot', () => {
        renderHook(
            buildSnapshot({
                composerState: {
                    ...EMPTY_WORKSPACE_SNAPSHOT.composerState,
                    prompt: 'Restored prompt',
                    aspectRatio: '21:9',
                    imageSize: '4K',
                    imageStyle: 'Anime',
                    imageModel: 'gemini-2.5-flash-image',
                    batchSize: 3,
                    outputFormat: 'images-and-text',
                    temperature: 0.7,
                    thinkingLevel: 'high',
                    includeThoughts: false,
                    googleSearch: true,
                    imageSearch: true,
                    generationMode: 'Follow-up Edit',
                    executionMode: 'chat-continuation',
                },
            }),
        );

        expect(latestHook?.generationMode).toBe('Follow-up Edit');
        expect(latestHook?.executionMode).toBe('chat-continuation');
        expect(latestHook?.displaySettings).toEqual({
            prompt: 'Restored prompt',
            aspectRatio: '21:9',
            size: '4K',
            style: 'Anime',
            model: 'gemini-2.5-flash-image',
            batchSize: 3,
            outputFormat: 'images-and-text',
            temperature: 0.7,
            thinkingLevel: 'high',
            includeThoughts: false,
            googleSearch: true,
            imageSearch: true,
        });
    });
});
