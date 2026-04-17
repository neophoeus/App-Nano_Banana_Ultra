/** @vitest-environment jsdom */

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import InfoTooltip from '../components/InfoTooltip';

describe('InfoTooltip auto placement', () => {
    let container: HTMLDivElement;
    let root: Root;
    let originalInnerHeight: number;
    let originalRequestAnimationFrame: typeof window.requestAnimationFrame;
    let originalCancelAnimationFrame: typeof window.cancelAnimationFrame;

    beforeEach(() => {
        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);

        originalInnerHeight = window.innerHeight;
        originalRequestAnimationFrame = window.requestAnimationFrame;
        originalCancelAnimationFrame = window.cancelAnimationFrame;

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

    it('falls back below the trigger when top placement does not fit', () => {
        act(() => {
            root.render(
                <InfoTooltip
                    content="Queue help"
                    buttonLabel="Queue"
                    dataTestId="queue-hint"
                    preferredVerticalPlacement="top"
                    autoAdjust={true}
                />,
            );
        });

        const trigger = container.querySelector('[data-testid="queue-hint-trigger"]') as HTMLButtonElement;
        const panel = container.querySelector('[data-testid="queue-hint"]') as HTMLDivElement;
        const rootElement = trigger.parentElement as HTMLDivElement;

        Object.defineProperty(rootElement, 'getBoundingClientRect', {
            configurable: true,
            value: () => ({
                width: 20,
                height: 20,
                top: 8,
                right: 40,
                bottom: 28,
                left: 20,
                x: 20,
                y: 8,
                toJSON: () => ({}),
            }),
        });
        Object.defineProperty(panel, 'getBoundingClientRect', {
            configurable: true,
            value: () => ({
                width: 180,
                height: 120,
                top: 0,
                right: 180,
                bottom: 120,
                left: 0,
                x: 0,
                y: 0,
                toJSON: () => ({}),
            }),
        });

        act(() => {
            trigger.click();
        });

        expect(panel.getAttribute('data-placement-vertical')).toBe('bottom');
    });
});