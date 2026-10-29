/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';

vi.mock('../components/GeneratedImage', () => ({
    default: () => <div data-testid="mock-generated-image" />,
}));

vi.mock('../components/WorkspaceHealthPanel', () => ({
    default: () => <div data-testid="mock-global-log-console" />,
}));

vi.mock('../components/ImageEditor', () => ({
    default: () => <div data-testid="mock-image-editor" />,
}));

vi.mock('../components/SketchPad', () => ({
    default: () => <div data-testid="mock-sketchpad" />,
}));

vi.mock('../utils/imageSaveUtils', async () => {
    const actual = await vi.importActual<typeof import('../utils/imageSaveUtils')>('../utils/imageSaveUtils');
    return {
        ...actual,
        persistHistoryThumbnail: vi.fn(),
        saveImageToLocal: vi.fn(),
        generateThumbnail: vi.fn(),
        loadFullImage: vi.fn(),
    };
});

describe('App Ambient Backdrop & Glow', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);

        Object.defineProperty(window, 'matchMedia', {
            configurable: true,
            writable: true,
            value: vi.fn().mockImplementation((query: string) => ({
                matches: false,
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            })),
        });
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
        vi.clearAllMocks();
    });

    it('renders full-bleed ambient backdrop with zero fixed-height clipping and smooth multi-stop eased gradients', async () => {
        await act(async () => {
            root.render(<App />);
        });

        const backdrop = container.querySelector('[data-testid="workspace-ambient-backdrop"]');
        expect(backdrop).not.toBeNull();
        expect(backdrop?.getAttribute('aria-hidden')).toBe('true');
        expect(backdrop?.className).toContain('pointer-events-none');
        expect(backdrop?.className).toContain('absolute');
        expect(backdrop?.className).toContain('inset-0');
        expect(backdrop?.className).toContain('overflow-hidden');

        const glow = container.querySelector('[data-testid="workspace-ambient-glow"]');
        expect(glow).not.toBeNull();
        expect(glow?.className).toContain('absolute');
        expect(glow?.className).toContain('inset-0');
        // Crucial regression guard: must not have fixed-height container that truncates the glow
        expect(glow?.className).not.toContain('h-[320px]');

        // Viewport-proportional and multi-stop gradient assertions
        expect(glow?.className).toContain('ellipse_38vw_560px');
        expect(glow?.className).toContain('ellipse_34vw_480px');
        expect(glow?.className).toContain('ellipse_48vw_420px');
        expect(glow?.className).toContain('dark:bg-[radial-gradient');

        // Side orbs are preserved within the backdrop
        const orbs = backdrop?.querySelectorAll('.blur-3xl');
        expect(orbs?.length).toBe(2);
    });
});
