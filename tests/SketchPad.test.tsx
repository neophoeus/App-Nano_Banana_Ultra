/** @vitest-environment jsdom */

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SketchPad from '../components/SketchPad';

describe('SketchPad', () => {
    let container: HTMLDivElement;
    let root: Root;
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
        consoleErrorSpy.mockRestore();
        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
    });

    it('keeps the zoom slider controlled after the initial auto-fit effect runs', () => {
        act(() => {
            root.render(
                <SketchPad
                    onSave={vi.fn()}
                    onClose={vi.fn()}
                    currentLanguage="en"
                    imageModel="gemini-3.1-flash-image-preview"
                    currentRatio="1:1"
                />,
            );
        });

        const zoomSlider = container.querySelector('input[type="range"][title="Zoom"]') as HTMLInputElement | null;

        expect(zoomSlider).toBeTruthy();
        expect(zoomSlider?.value).toBe('1');
        expect(
            consoleErrorSpy.mock.calls.some(([message]) =>
                String(message).includes('A component is changing a controlled input to be uncontrolled'),
            ),
        ).toBe(false);
    });
});
