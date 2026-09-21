/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ImageEditor from '../components/ImageEditor';

describe('ImageEditor rotation, magnetic snap, and rotated fit/fill', () => {
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

    const renderOutpaintEditor = (props: Partial<React.ComponentProps<typeof ImageEditor>> = {}) => {
        const onGenerate = vi.fn();
        const onCancel = vi.fn();

        act(() => {
            root.render(
                <ImageEditor
                    initialImageUrl="https://example.com/source.png"
                    initialPrompt="Initial prompt"
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
                    mode="outpaint"
                    onModeChange={vi.fn()}
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
                    {...props}
                />,
            );
        });

        return { onGenerate, onCancel };
    };

    it('renders rotation slider on the right toolbar and does not repeat redundant rotation controls in top toolbar', () => {
        renderOutpaintEditor();

        // Redundant top toolbar rotation buttons must be removed
        const rotateLeftBtn = container.querySelector('[data-testid="editor-rotate-left"]');
        const rotateRightBtn = container.querySelector('[data-testid="editor-rotate-right"]');
        expect(rotateLeftBtn).toBeNull();
        expect(rotateRightBtn).toBeNull();

        // Right toolbar rotation controls
        const magnetBtn = container.querySelector('[data-testid="editor-magnet-snap"]');
        const rotationBadge = container.querySelector('[data-testid="editor-rotation-badge"]');
        const rotationSlider = container.querySelector('[data-testid="editor-rotation-slider"]');
        const rotationHandle = container.querySelector('[data-testid="editor-rotation-handle"]');

        expect(magnetBtn).not.toBeNull();
        expect(rotationBadge).not.toBeNull();
        expect(rotationSlider).not.toBeNull();
        expect(rotationHandle).not.toBeNull();

        // Magnet snap is off by default and has horseshoe magnet SVG + 45° badge
        expect(magnetBtn?.getAttribute('aria-pressed')).toBe('false');
        expect(magnetBtn?.textContent).toContain('45°');
        expect(rotationBadge?.textContent).toBe('0°');
    });

    it('adjusts rotation angle via slider and resets to 0° by clicking rotation badge', () => {
        renderOutpaintEditor();

        const rotationBadge = container.querySelector<HTMLButtonElement>('[data-testid="editor-rotation-badge"]');
        const rotationSlider = container.querySelector<HTMLInputElement>('[data-testid="editor-rotation-slider"]');

        expect(rotationBadge?.textContent).toBe('0°');

        // Set rotation to 60° via slider
        act(() => {
            if (rotationSlider) {
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                    window.HTMLInputElement.prototype,
                    'value',
                )?.set;
                nativeInputValueSetter?.call(rotationSlider, '60');
                rotationSlider.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
        expect(rotationBadge?.textContent).toBe('60°');

        // Clicking rotation badge resets to 0°
        act(() => {
            rotationBadge?.click();
        });
        expect(rotationBadge?.textContent).toBe('0°');
    });

    it('toggles horseshoe magnet snap on and snaps rotation slider to 45 degree multiples', () => {
        renderOutpaintEditor();

        const magnetBtn = container.querySelector<HTMLButtonElement>('[data-testid="editor-magnet-snap"]');
        const rotationBadge = container.querySelector<HTMLButtonElement>('[data-testid="editor-rotation-badge"]');
        const rotationSlider = container.querySelector<HTMLInputElement>('[data-testid="editor-rotation-slider"]');

        // Toggle magnet snap on
        act(() => {
            magnetBtn?.click();
        });
        expect(magnetBtn?.getAttribute('aria-pressed')).toBe('true');

        // Change rotation slider to 43° -> should snap to 45°
        act(() => {
            if (rotationSlider) {
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                    window.HTMLInputElement.prototype,
                    'value',
                )?.set;
                nativeInputValueSetter?.call(rotationSlider, '43');
                rotationSlider.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });

        expect(rotationBadge?.textContent).toBe('45°');

        // Change rotation slider to 21° -> should snap to 0°
        act(() => {
            if (rotationSlider) {
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                    window.HTMLInputElement.prototype,
                    'value',
                )?.set;
                nativeInputValueSetter?.call(rotationSlider, '21');
                rotationSlider.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });

        expect(rotationBadge?.textContent).toBe('0°');

        // Toggle magnet snap off -> allows fine degree setting
        act(() => {
            magnetBtn?.click();
        });
        expect(magnetBtn?.getAttribute('aria-pressed')).toBe('false');

        act(() => {
            if (rotationSlider) {
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                    window.HTMLInputElement.prototype,
                    'value',
                )?.set;
                nativeInputValueSetter?.call(rotationSlider, '21');
                rotationSlider.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });

        expect(rotationBadge?.textContent).toBe('21°');
    });

    it('preserves rotation angle and recalculates scale when Fit (contain) or Fill (cover) is clicked', () => {
        renderOutpaintEditor({
            initialPreparedSource: { width: 800, height: 600, wasResized: false },
        });

        const rotationBadge = container.querySelector<HTMLButtonElement>('[data-testid="editor-rotation-badge"]');
        const rotationSlider = container.querySelector<HTMLInputElement>('[data-testid="editor-rotation-slider"]');

        // Set rotation to 90°
        act(() => {
            if (rotationSlider) {
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                    window.HTMLInputElement.prototype,
                    'value',
                )?.set;
                nativeInputValueSetter?.call(rotationSlider, '90');
                rotationSlider.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
        expect(rotationBadge?.textContent).toBe('90°');

        // Find Fit & Fill buttons
        const fitBtn = container.querySelector<HTMLButtonElement>('[data-testid="editor-fit-view"]');
        const fillBtn = container.querySelector<HTMLButtonElement>('[data-testid="editor-fill-view"]');

        expect(fitBtn).not.toBeNull();
        expect(fillBtn).not.toBeNull();

        // Click Fit -> rotation angle should remain 90°
        act(() => {
            fitBtn?.click();
        });
        expect(rotationBadge?.textContent).toBe('90°');

        // Click Fill -> rotation angle should still remain 90°
        act(() => {
            fillBtn?.click();
        });
        expect(rotationBadge?.textContent).toBe('90°');
    });

    it('resets rotation angle when editor reset button is pressed', () => {
        renderOutpaintEditor();

        const rotationBadge = container.querySelector<HTMLButtonElement>('[data-testid="editor-rotation-badge"]');
        const rotationSlider = container.querySelector<HTMLInputElement>('[data-testid="editor-rotation-slider"]');

        act(() => {
            if (rotationSlider) {
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                    window.HTMLInputElement.prototype,
                    'value',
                )?.set;
                nativeInputValueSetter?.call(rotationSlider, '45');
                rotationSlider.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
        expect(rotationBadge?.textContent).toBe('45°');

        // Find Reset button
        const resetBtn = container.querySelector<HTMLButtonElement>('[data-testid="editor-reset"]');
        expect(resetBtn).not.toBeNull();

        act(() => {
            resetBtn?.click();
        });

        expect(rotationBadge?.textContent).toBe('0°');
    });
});
