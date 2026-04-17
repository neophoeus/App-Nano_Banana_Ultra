/** @vitest-environment jsdom */

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MODEL_CAPABILITIES } from '../constants';
import { useWorkspaceCapabilityConstraints } from '../hooks/useWorkspaceCapabilityConstraints';

describe('useWorkspaceCapabilityConstraints', () => {
    let container: HTMLDivElement;
    let root: Root;
    let lockedAspectRatio: '1:8' | null;

    const renderHook = (overrides: Partial<Parameters<typeof useWorkspaceCapabilityConstraints>[0]> = {}) => {
        const setImageSize = vi.fn();
        const setAspectRatio = vi.fn();
        const setOutputFormat = vi.fn();
        const setThinkingLevel = vi.fn();
        const setIncludeThoughts = vi.fn();
        const setGoogleSearch = vi.fn();
        const setImageSearch = vi.fn();
        const setObjectImages = vi.fn();
        const setCharacterImages = vi.fn();
        const showNotification = vi.fn();

        function Harness() {
            useWorkspaceCapabilityConstraints({
                capability: MODEL_CAPABILITIES['gemini-3-pro-image-preview'],
                imageSize: '1K',
                aspectRatio: '1:8',
                lockedAspectRatio,
                outputFormat: 'images-only',
                thinkingLevel: 'disabled',
                includeThoughts: true,
                googleSearch: false,
                imageSearch: false,
                setImageSize,
                setAspectRatio,
                setOutputFormat,
                setThinkingLevel,
                setIncludeThoughts,
                setGoogleSearch,
                setImageSearch,
                setObjectImages,
                setCharacterImages,
                showNotification,
                t: (key) => key,
                ...overrides,
            });

            return null;
        }

        act(() => {
            root.render(<Harness />);
        });

        return {
            setImageSize,
            setAspectRatio,
            setOutputFormat,
            setThinkingLevel,
            setIncludeThoughts,
            setGoogleSearch,
            setImageSearch,
            setObjectImages,
            setCharacterImages,
            showNotification,
        };
    };

    beforeEach(() => {
        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        lockedAspectRatio = null;
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
        vi.restoreAllMocks();
        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
    });

    it('falls back unsupported ratios when they are not locked', () => {
        const { setAspectRatio } = renderHook();

        expect(setAspectRatio).toHaveBeenCalledWith('1:1');
    });

    it('preserves a locked retouch ratio while App swaps to a compatible model', () => {
        lockedAspectRatio = '1:8';
        const { setAspectRatio } = renderHook();

        expect(setAspectRatio).not.toHaveBeenCalled();
    });

    it('still auto-enables thoughts on gemini-3-pro-image-preview when they are turned off', () => {
        const { setIncludeThoughts } = renderHook({
            aspectRatio: '1:1',
            outputFormat: 'images-and-text',
            includeThoughts: false,
        });

        expect(setIncludeThoughts).toHaveBeenCalledWith(true);
    });

    it('turns thoughts off on gemini-2.5-flash-image because that model does not support them', () => {
        const { setIncludeThoughts } = renderHook({
            capability: MODEL_CAPABILITIES['gemini-2.5-flash-image'],
            aspectRatio: '1:1',
            outputFormat: 'images-and-text',
            includeThoughts: true,
        });

        expect(setIncludeThoughts).toHaveBeenCalledWith(false);
    });
});
