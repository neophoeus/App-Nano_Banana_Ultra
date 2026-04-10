/** @vitest-environment jsdom */

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import StructuredOutputActions from '../components/StructuredOutputActions';

describe('StructuredOutputActions auto placement', () => {
    let container: HTMLDivElement;
    let root: Root;
    let originalInnerWidth: number;
    let originalInnerHeight: number;
    let originalRequestAnimationFrame: typeof window.requestAnimationFrame;
    let originalCancelAnimationFrame: typeof window.cancelAnimationFrame;

    beforeEach(() => {
        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);

        originalInnerWidth = window.innerWidth;
        originalInnerHeight = window.innerHeight;
        originalRequestAnimationFrame = window.requestAnimationFrame;
        originalCancelAnimationFrame = window.cancelAnimationFrame;

        Object.defineProperty(window, 'innerWidth', {
            configurable: true,
            value: 800,
        });
        Object.defineProperty(window, 'innerHeight', {
            configurable: true,
            value: 600,
        });
        Object.defineProperty(window, 'requestAnimationFrame', {
            configurable: true,
            value: (callback: FrameRequestCallback) => {
                callback(0);
                return 1;
            },
        });
        Object.defineProperty(window, 'cancelAnimationFrame', {
            configurable: true,
            value: () => undefined,
        });
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
        Object.defineProperty(window, 'innerWidth', {
            configurable: true,
            value: originalInnerWidth,
        });
        Object.defineProperty(window, 'innerHeight', {
            configurable: true,
            value: originalInnerHeight,
        });
        Object.defineProperty(window, 'requestAnimationFrame', {
            configurable: true,
            value: originalRequestAnimationFrame,
        });
        Object.defineProperty(window, 'cancelAnimationFrame', {
            configurable: true,
            value: originalCancelAnimationFrame,
        });
        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
    });

    it('opens upward and to the right when the anchor is near the lower-left corner', () => {
        act(() => {
            root.render(
                <StructuredOutputActions
                    currentLanguage="en"
                    structuredData={{ summary: 'Test summary' }}
                    structuredOutputMode="scene-brief"
                    formattedStructuredOutput={'{"summary":"Test summary"}'}
                />,
            );
        });

        const details = container.querySelector('[data-testid="structured-output-actions-menu"]') as HTMLDetailsElement;
        const summary = container.querySelector('[data-testid="structured-output-actions-summary"]') as HTMLElement;
        const panel = container.querySelector('[data-placement-horizontal]') as HTMLDivElement;

        Object.defineProperty(summary, 'getBoundingClientRect', {
            configurable: true,
            value: () => ({
                width: 84,
                height: 28,
                top: 500,
                right: 104,
                bottom: 528,
                left: 20,
                x: 20,
                y: 500,
                toJSON: () => ({}),
            }),
        });
        Object.defineProperty(panel, 'getBoundingClientRect', {
            configurable: true,
            value: () => ({
                width: 176,
                height: 220,
                top: 0,
                right: 176,
                bottom: 220,
                left: 0,
                x: 0,
                y: 0,
                toJSON: () => ({}),
            }),
        });

        act(() => {
            details.open = true;
            details.dispatchEvent(new Event('toggle'));
        });

        expect(panel.getAttribute('data-placement-horizontal')).toBe('start');
        expect(panel.getAttribute('data-placement-vertical')).toBe('top');
    });
});