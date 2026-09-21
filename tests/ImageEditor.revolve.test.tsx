/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ImageEditor from '../components/ImageEditor';

describe('ImageEditor revolve mode (3D Gaussian Splatting perspective, pan, and zoom)', () => {
    let container: HTMLDivElement;
    let root: Root;
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        window.localStorage.clear();
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
        consoleErrorSpy.mockRestore();
        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
    });

    const renderRevolveEditor = (props: Partial<React.ComponentProps<typeof ImageEditor>> = {}) => {
        const onGenerate = vi.fn();
        const onCancel = vi.fn();
        const onModeChange = vi.fn();

        act(() => {
            root.render(
                <ImageEditor
                    initialImageUrl="https://example.com/source.png"
                    initialPrompt="A futuristic city on Mars"
                    initialObjectImages={[]}
                    initialCharacterImages={[]}
                    initialRatio="1:1"
                    initialSize="1K"
                    initialBatchSize={1}
                    prompt="A futuristic city on Mars"
                    onPromptChange={vi.fn()}
                    objectImages={[]}
                    onObjectImagesChange={vi.fn()}
                    characterImages={[]}
                    onCharacterImagesChange={vi.fn()}
                    mode="revolve"
                    onModeChange={onModeChange}
                    ratio="1:1"
                    onRatioChange={vi.fn()}
                    size="1K"
                    onSizeChange={vi.fn()}
                    batchSize={1}
                    onBatchSizeChange={vi.fn()}
                    onGenerate={onGenerate}
                    onCancel={onCancel}
                    isGenerating={false}
                    currentLanguage="en"
                    error={null}
                    imageModel="gemini-3.1-flash-image"
                    leftDockTopOffset={120}
                    {...props}
                />,
            );
        });

        return { onGenerate, onCancel, onModeChange };
    };

    it('renders revolve mode button, 3DGS canvas, left dock tools, and right sliders', () => {
        renderRevolveEditor();

        const revolveBtn = container.querySelector('[data-testid="editor-mode-revolve"]');
        expect(revolveBtn).not.toBeNull();

        const canvas = container.querySelector('[data-testid="editor-revolve-canvas"]');
        expect(canvas).not.toBeNull();

        // Left dock tools
        const orbitTool = container.querySelector('[data-testid="editor-revolve-orbit-tool"]');
        const panTool = container.querySelector('[data-testid="editor-revolve-pan-tool"]');
        expect(orbitTool).not.toBeNull();
        expect(panTool).not.toBeNull();

        // Right sliders
        const yawSlider = container.querySelector('[data-testid="editor-revolve-yaw-slider"]');
        const pitchSlider = container.querySelector('[data-testid="editor-revolve-pitch-slider"]');
        const zoomSlider = container.querySelector('[data-testid="editor-revolve-zoom-slider"]');
        expect(yawSlider).not.toBeNull();
        expect(pitchSlider).not.toBeNull();
        expect(zoomSlider).not.toBeNull();
    });

    it('supports quick camera perspective angle presets and angle reset badges', () => {
        renderRevolveEditor();

        const presetLeft = container.querySelector('[data-testid="editor-revolve-preset-left"]') as HTMLButtonElement;
        const presetHigh = container.querySelector('[data-testid="editor-revolve-preset-high"]') as HTMLButtonElement;
        const yawBadge = container.querySelector('[data-testid="editor-revolve-yaw-badge"]') as HTMLButtonElement;
        const pitchBadge = container.querySelector('[data-testid="editor-revolve-pitch-badge"]') as HTMLButtonElement;
        const zoomBadge = container.querySelector('[data-testid="editor-revolve-zoom-badge"]') as HTMLButtonElement;

        expect(yawBadge.textContent).toContain('Y: 0°');
        expect(pitchBadge.textContent).toContain('P: 0°');
        expect(zoomBadge.textContent).toContain('Z: 100%');

        // Click Left (-30°)
        act(() => {
            presetLeft.click();
        });
        expect(yawBadge.textContent).toContain('-30°');

        // Click High (+20°)
        act(() => {
            presetHigh.click();
        });
        expect(pitchBadge.textContent).toContain('+20°');

        // Click Yaw badge to reset Yaw
        act(() => {
            yawBadge.click();
        });
        expect(yawBadge.textContent).toContain('Y: 0°');

        // Click Pitch badge to reset Pitch
        act(() => {
            pitchBadge.click();
        });
        expect(pitchBadge.textContent).toContain('P: 0°');
    });

    it('adjusts yaw, pitch, and zoom via right toolbar sliders', () => {
        renderRevolveEditor();

        const yawSlider = container.querySelector('[data-testid="editor-revolve-yaw-slider"]') as HTMLInputElement;
        const pitchSlider = container.querySelector('[data-testid="editor-revolve-pitch-slider"]') as HTMLInputElement;
        const zoomSlider = container.querySelector('[data-testid="editor-revolve-zoom-slider"]') as HTMLInputElement;
        const yawBadge = container.querySelector('[data-testid="editor-revolve-yaw-badge"]') as HTMLButtonElement;
        const pitchBadge = container.querySelector('[data-testid="editor-revolve-pitch-badge"]') as HTMLButtonElement;
        const zoomBadge = container.querySelector('[data-testid="editor-revolve-zoom-badge"]') as HTMLButtonElement;

        // Change Yaw to 45
        act(() => {
            const proto = Object.getPrototypeOf(yawSlider);
            const valueSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
            valueSetter?.call(yawSlider, '45');
            yawSlider.dispatchEvent(new Event('change', { bubbles: true }));
        });
        expect(yawBadge.textContent).toContain('+45°');

        // Change Pitch to -15
        act(() => {
            const proto = Object.getPrototypeOf(pitchSlider);
            const valueSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
            valueSetter?.call(pitchSlider, '-15');
            pitchSlider.dispatchEvent(new Event('change', { bubbles: true }));
        });
        expect(pitchBadge.textContent).toContain('-15°');

        // Change Zoom to 150%
        act(() => {
            const proto = Object.getPrototypeOf(zoomSlider);
            const valueSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
            valueSetter?.call(zoomSlider, '150');
            zoomSlider.dispatchEvent(new Event('change', { bubbles: true }));
        });
        expect(zoomBadge.textContent).toContain('Z: 150%');

        // Click Zoom badge to reset to 100%
        act(() => {
            zoomBadge.click();
        });
        expect(zoomBadge.textContent).toContain('Z: 100%');

        // Reset all via reset button
        const resetBtn = container.querySelector('[data-testid="editor-revolve-reset"]') as HTMLButtonElement;
        act(() => {
            resetBtn.click();
        });
        expect(yawBadge.textContent).toContain('Y: 0°');
        expect(pitchBadge.textContent).toContain('P: 0°');
        expect(zoomBadge.textContent).toContain('Z: 100%');
    });

    it('switches between orbit and pan tools and pans the 3D scene on drag', () => {
        renderRevolveEditor();

        const panTool = container.querySelector('[data-testid="editor-revolve-pan-tool"]') as HTMLButtonElement;
        const orbitTool = container.querySelector('[data-testid="editor-revolve-orbit-tool"]') as HTMLButtonElement;
        const surface = container.querySelector('[data-testid="editor-event-surface"]') as HTMLDivElement;

        expect(panTool).not.toBeNull();
        expect(orbitTool).not.toBeNull();

        // Switch to Pan tool
        act(() => {
            panTool.click();
        });

        // Drag to pan the scene
        act(() => {
            const PointerEventCtor = window.PointerEvent || MouseEvent;
            surface.dispatchEvent(
                new PointerEventCtor('pointerdown', { bubbles: true, clientX: 100, clientY: 100, button: 0 }),
            );
        });
        act(() => {
            const PointerEventCtor = window.PointerEvent || MouseEvent;
            surface.dispatchEvent(
                new PointerEventCtor('pointermove', { bubbles: true, clientX: 160, clientY: 140, button: 0 }),
            );
        });
        act(() => {
            const PointerEventCtor = window.PointerEvent || MouseEvent;
            surface.dispatchEvent(new PointerEventCtor('pointerup', { bubbles: true }));
        });

        // Pan badge should appear showing delta
        const panBadge = container.querySelector('[data-testid="editor-revolve-pan-badge"]') as HTMLButtonElement;
        expect(panBadge).not.toBeNull();
        expect(panBadge.textContent).toContain('Pan: 60, 40');

        // Clicking pan badge resets pan
        act(() => {
            panBadge.click();
        });
        expect(container.querySelector('[data-testid="editor-revolve-pan-badge"]')).toBeNull();
    });

    it('zooms 3D viewpoint on wheel in revolve mode', () => {
        renderRevolveEditor();

        const surface = container.querySelector('[data-testid="editor-event-surface"]') as HTMLDivElement;
        const zoomBadge = container.querySelector('[data-testid="editor-revolve-zoom-badge"]') as HTMLButtonElement;

        expect(zoomBadge.textContent).toContain('Z: 100%');

        // Wheel forward (zoom in)
        act(() => {
            surface.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: -100 }));
        });

        expect(zoomBadge.textContent).not.toContain('Z: 100%');
    });

    it('pans the 3D scene directly via mouse right-click drag even when orbit tool is active', () => {
        renderRevolveEditor();

        const orbitTool = container.querySelector('[data-testid="editor-revolve-orbit-tool"]') as HTMLButtonElement;
        const surface = container.querySelector('[data-testid="editor-event-surface"]') as HTMLDivElement;

        expect(orbitTool).not.toBeNull();

        // Right-click drag (button: 2, buttons: 2)
        act(() => {
            const PointerEventCtor = window.PointerEvent || MouseEvent;
            surface.dispatchEvent(
                new PointerEventCtor('pointerdown', {
                    bubbles: true,
                    clientX: 200,
                    clientY: 200,
                    button: 2,
                    buttons: 2,
                }),
            );
        });
        act(() => {
            const PointerEventCtor = window.PointerEvent || MouseEvent;
            surface.dispatchEvent(
                new PointerEventCtor('pointermove', {
                    bubbles: true,
                    clientX: 245,
                    clientY: 230,
                    button: 2,
                    buttons: 2,
                }),
            );
        });
        act(() => {
            const PointerEventCtor = window.PointerEvent || MouseEvent;
            surface.dispatchEvent(new PointerEventCtor('pointerup', { bubbles: true, button: 2 }));
        });

        // Pan badge should appear showing delta (dx: 45, dy: 30)
        const panBadge = container.querySelector('[data-testid="editor-revolve-pan-badge"]') as HTMLButtonElement;
        expect(panBadge).not.toBeNull();
        expect(panBadge.textContent).toContain('Pan: 45, 30');
    });

    it('prevents browser context menu on event surface in revolve mode', () => {
        renderRevolveEditor();

        const surface = container.querySelector('[data-testid="editor-event-surface"]') as HTMLDivElement;
        expect(surface).not.toBeNull();

        const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
        act(() => {
            surface.dispatchEvent(event);
        });

        expect(event.defaultPrevented).toBe(true);
    });

    it('submits generation payload with Revolving mode label, 3DGS guidance, rotation, and framing', async () => {
        const originalImage = window.Image;
        const originalCreateElement = document.createElement.bind(document);

        const mockCtx = {
            drawImage: vi.fn(),
            fillRect: vi.fn(),
            beginPath: vi.fn(),
            arc: vi.fn(),
            fill: vi.fn(),
            save: vi.fn(),
            restore: vi.fn(),
            translate: vi.fn(),
            rotate: vi.fn(),
            scale: vi.fn(),
            clearRect: vi.fn(),
            getImageData: vi.fn(() => ({
                data: new Uint8ClampedArray(400),
                width: 10,
                height: 10,
            })),
        };

        vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
            if (tagName === 'canvas') {
                const canvas = originalCreateElement('canvas');
                vi.spyOn(canvas, 'getContext').mockImplementation((type: string) => {
                    if (type === '2d') return mockCtx as any;
                    return null;
                });
                vi.spyOn(canvas, 'toDataURL').mockReturnValue('data:image/png;base64,mockRevolveData');
                return canvas;
            }
            return originalCreateElement(tagName);
        });

        class MockImage {
            width = 800;
            height = 600;
            onload: (() => void) | null = null;
            set src(_value: string) {
                queueMicrotask(() => {
                    this.onload?.();
                });
            }
        }
        window.Image = MockImage as any;

        try {
            const { onGenerate } = renderRevolveEditor({
                initialPreparedSource: { width: 800, height: 600, wasResized: false },
            });

            await act(async () => {
                await new Promise((r) => setTimeout(r, 60));
            });

            // Rotate camera to Right (+30°)
            const presetRight = container.querySelector(
                '[data-testid="editor-revolve-preset-right"]',
            ) as HTMLButtonElement;
            act(() => {
                presetRight.click();
            });

            // Zoom to 140%
            const zoomSlider = container.querySelector(
                '[data-testid="editor-revolve-zoom-slider"]',
            ) as HTMLInputElement;
            act(() => {
                const proto = Object.getPrototypeOf(zoomSlider);
                const valueSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
                valueSetter?.call(zoomSlider, '140');
                zoomSlider.dispatchEvent(new Event('change', { bubbles: true }));
            });

            // Click Render
            const generateBtn = container.querySelector('[data-testid="editor-generate"]') as HTMLButtonElement;
            act(() => {
                generateBtn.click();
            });

            expect(onGenerate).toHaveBeenCalledTimes(1);
            const [submittedPrompt, , , , modeLabel, submittedObjectImages, , , submittedSourceImage] =
                onGenerate.mock.calls[0];

            expect(modeLabel).toBe('Revolving');
            expect(submittedPrompt).toContain(
                'Render [Src_1] from the 3D camera viewpoint in [Edit_1] (yaw=30°, pitch=0°, zoom 1.40x).',
            );
            expect(submittedPrompt).toContain(
                'Inpaint the green background areas to complete the scene, preserving the subject, style, lighting, and details from [Src_1].',
            );
            expect(submittedPrompt).not.toContain('[Obj_1]');
            expect(submittedPrompt).not.toContain('[Obj_2]');
            expect(submittedSourceImage).toBe('https://example.com/source.png');
            expect(submittedObjectImages).toEqual([]);
        } finally {
            window.Image = originalImage;
            vi.restoreAllMocks();
        }
    });

    it('switches to revolve mode when clicking the revolve tab button', () => {
        const onModeChange = vi.fn();
        act(() => {
            root.render(
                <ImageEditor
                    initialImageUrl="https://example.com/source.png"
                    initialPrompt="Test prompt"
                    initialObjectImages={[]}
                    initialCharacterImages={[]}
                    initialRatio="1:1"
                    initialSize="1K"
                    initialBatchSize={1}
                    prompt="Test prompt"
                    onPromptChange={vi.fn()}
                    objectImages={[]}
                    onObjectImagesChange={vi.fn()}
                    characterImages={[]}
                    onCharacterImagesChange={vi.fn()}
                    mode="inpaint"
                    onModeChange={onModeChange}
                    ratio="1:1"
                    onRatioChange={vi.fn()}
                    size="1K"
                    onSizeChange={vi.fn()}
                    batchSize={1}
                    onBatchSizeChange={vi.fn()}
                    onGenerate={vi.fn()}
                    onCancel={vi.fn()}
                    isGenerating={false}
                    currentLanguage="en"
                    error={null}
                    imageModel="gemini-3.1-flash-image"
                />,
            );
        });

        const revolveBtn = container.querySelector('[data-testid="editor-mode-revolve"]') as HTMLButtonElement;
        expect(revolveBtn).not.toBeNull();

        act(() => {
            revolveBtn.click();
        });

        expect(onModeChange).toHaveBeenCalledWith('revolve');
    });

    it('queues batch submission payload in revolve mode with independent source image input', async () => {
        const onQueueBatch = vi.fn();
        const originalImage = window.Image;
        const originalCreateElement = document.createElement.bind(document);

        const mockCtx = {
            fillStyle: '',
            fillRect: vi.fn(),
            beginPath: vi.fn(),
            arc: vi.fn(),
            fill: vi.fn(),
            save: vi.fn(),
            restore: vi.fn(),
            translate: vi.fn(),
            rotate: vi.fn(),
            scale: vi.fn(),
            clearRect: vi.fn(),
            drawImage: vi.fn(),
            getImageData: vi.fn(() => ({
                data: new Uint8ClampedArray(400),
                width: 10,
                height: 10,
            })),
        };

        vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
            if (tagName === 'canvas') {
                const canvas = originalCreateElement('canvas');
                vi.spyOn(canvas, 'getContext').mockImplementation((type: string) => {
                    if (type === '2d') return mockCtx as any;
                    return null;
                });
                vi.spyOn(canvas, 'toDataURL').mockReturnValue('data:image/png;base64,mockRevolveData');
                return canvas;
            }
            return originalCreateElement(tagName);
        });

        class MockImage {
            width = 800;
            height = 600;
            onload: (() => void) | null = null;
            set src(_value: string) {
                queueMicrotask(() => {
                    this.onload?.();
                });
            }
        }
        window.Image = MockImage as any;

        try {
            renderRevolveEditor({
                initialPreparedSource: { width: 800, height: 600, wasResized: false },
                supportsQueuedBatch: true,
                onQueueBatch,
                objectImages: ['https://example.com/extra-ref.png'],
            });

            await act(async () => {
                await new Promise((r) => setTimeout(r, 60));
            });

            const queueBtn = container.querySelector('[data-testid="editor-queue-batch"]') as HTMLButtonElement;
            expect(queueBtn).not.toBeNull();
            act(() => {
                queueBtn.click();
            });

            expect(onQueueBatch).toHaveBeenCalledTimes(1);
            const [submittedPrompt, , , , modeLabel, submittedObjectImages, , , submittedSourceImage] =
                onQueueBatch.mock.calls[0];

            expect(modeLabel).toBe('Revolving');
            expect(submittedPrompt).toContain('Render [Src_1] from the 3D camera viewpoint in [Edit_1]');
            expect(submittedPrompt).toContain(
                'Inpaint the green background areas to complete the scene, preserving the subject, style, lighting, and details from [Src_1].',
            );
            expect(submittedPrompt).not.toContain('[Obj_1]');
            expect(submittedPrompt).not.toContain('[Obj_2]');
            expect(submittedSourceImage).toBe('https://example.com/source.png');
            expect(submittedObjectImages).toEqual(['https://example.com/extra-ref.png']);
        } finally {
            window.Image = originalImage;
            vi.restoreAllMocks();
        }
    });
});
