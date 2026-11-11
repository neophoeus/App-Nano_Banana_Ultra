/** @vitest-environment jsdom */

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ComposerAdvancedSettingsContent from '../components/ComposerAdvancedSettingsContent';
import ExportResultsModal from '../components/ExportResultsModal';
import WorkspaceModalFrame from '../components/WorkspaceModalFrame';
import { MODEL_CAPABILITIES } from '../constants';
import { useOverlayEscapeDismiss } from '../hooks/useOverlayEscapeDismiss';
import { GeneratedImage } from '../types';
import { disposeWebGL2Resources, renderGaussianSplatsWebGL2 } from '../utils/gaussianSplatting';
import { getTranslation, preloadAllTranslations, SUPPORTED_LANGUAGES } from '../utils/translations';

function StackedOverlaysHarness({
    isFirstOpen,
    isSecondOpen,
    onCloseFirst,
    onCloseSecond,
}: {
    isFirstOpen: boolean;
    isSecondOpen: boolean;
    onCloseFirst: () => void;
    onCloseSecond: () => void;
}) {
    useOverlayEscapeDismiss(isFirstOpen, onCloseFirst);
    useOverlayEscapeDismiss(isSecondOpen, onCloseSecond);
    return (
        <div>
            {isFirstOpen ? <div data-testid="overlay-1">First</div> : null}
            {isSecondOpen ? <div data-testid="overlay-2">Second</div> : null}
        </div>
    );
}

describe('Step 5 UI lifecycle, accessibility, export deduplication, and 9-locale translations', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
        vi.restoreAllMocks();
    });

    it('dismisses only the topmost active overlay on Escape (LIFO stack)', () => {
        const onCloseFirst = vi.fn();
        const onCloseSecond = vi.fn();

        act(() => {
            root.render(
                <StackedOverlaysHarness
                    isFirstOpen={true}
                    isSecondOpen={true}
                    onCloseFirst={onCloseFirst}
                    onCloseSecond={onCloseSecond}
                />,
            );
        });

        act(() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        });

        expect(onCloseSecond).toHaveBeenCalledTimes(1);
        expect(onCloseFirst).not.toHaveBeenCalled();

        act(() => {
            root.render(
                <StackedOverlaysHarness
                    isFirstOpen={true}
                    isSecondOpen={false}
                    onCloseFirst={onCloseFirst}
                    onCloseSecond={onCloseSecond}
                />,
            );
        });

        act(() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        });

        expect(onCloseFirst).toHaveBeenCalledTimes(1);
    });

    it('wires aria-labelledby and aria-describedby on WorkspaceModalFrame', () => {
        act(() => {
            root.render(
                <WorkspaceModalFrame
                    dataTestId="test-modal-frame"
                    zIndex={100}
                    maxWidthClass="max-w-lg"
                    title="Accessible Modal Title"
                    description="Accessible Modal Description"
                    closeLabel="Close"
                    onClose={vi.fn()}
                >
                    <div>Modal Body</div>
                </WorkspaceModalFrame>,
            );
        });

        const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
        expect(dialog).toBeTruthy();
        const labelledById = dialog.getAttribute('aria-labelledby');
        const describedById = dialog.getAttribute('aria-describedby');
        expect(labelledById).toBeTruthy();
        expect(describedById).toBeTruthy();
        expect(document.getElementById(labelledById!)?.textContent).toBe('Accessible Modal Title');
        expect(document.getElementById(describedById!)?.textContent).toBe('Accessible Modal Description');
    });

    it('distinguishes data URLs with identical 128-char prefixes and skips duplicate single output-image resultParts in ExportResultsModal', () => {
        const sharedPrefix = 'data:image/png;base64,' + 'A'.repeat(160);
        const dataUrlOne = `${sharedPrefix}_UNIQUE_TAIL_ONE_1111111111111111`;
        const dataUrlTwo = `${sharedPrefix}_UNIQUE_TAIL_TWO_2222222222222222`;

        const history: GeneratedImage[] = [
            {
                id: 'turn-1',
                url: dataUrlOne,
                prompt: 'First image',
                aspectRatio: '1:1',
                size: '1K',
                style: 'None',
                model: 'gemini-3.1-flash-image',
                createdAt: 1000,
                status: 'success',
                resultParts: [
                    {
                        sequence: 0,
                        kind: 'output-image',
                        imageUrl: '/api/load-image?filename=turn-1-part.png',
                        savedFilename: 'turn-1-part.png',
                        mimeType: 'image/png',
                    },
                ],
            },
            {
                id: 'turn-2',
                url: dataUrlTwo,
                prompt: 'Second image',
                aspectRatio: '1:1',
                size: '1K',
                style: 'None',
                model: 'gemini-3.1-flash-image',
                createdAt: 2000,
                status: 'success',
            },
        ];

        act(() => {
            root.render(
                <ExportResultsModal
                    isOpen={true}
                    history={history}
                    onClose={vi.fn()}
                    showNotification={vi.fn()}
                    t={(key) => getTranslation('en', key)}
                />,
            );
        });

        // Both distinct data URLs should be counted (2 images), while the single output-image resultPart is not duplicated into a 3rd export
        expect(container.textContent).toContain('2');
        expect(container.textContent).not.toContain('3');
    });

    it('allows intermediate decimal typing in ComposerAdvancedSettingsContent temperature input and normalizes on blur', () => {
        const onTemperatureChange = vi.fn();

        act(() => {
            root.render(
                <ComposerAdvancedSettingsContent
                    currentLanguage="en"
                    outputFormat="images-and-text"
                    thinkingLevel="minimal"
                    groundingMode="off"
                    imageModel="gemini-3.1-flash-image"
                    capability={MODEL_CAPABILITIES['gemini-3.1-flash-image']}
                    availableGroundingModes={['off', 'google-search']}
                    temperature={1}
                    onOutputFormatChange={vi.fn()}
                    onTemperatureChange={onTemperatureChange}
                    onThinkingLevelChange={vi.fn()}
                    onGroundingModeChange={vi.fn()}
                />,
            );
        });

        const input = container.querySelector(
            '[data-testid="composer-advanced-temperature-input"]',
        ) as HTMLInputElement;
        expect(input).toBeTruthy();
        expect(input.value).toBe('1.0');

        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;

        act(() => {
            input.focus();
            nativeInputValueSetter?.call(input, '');
            input.dispatchEvent(new Event('input', { bubbles: true }));
        });

        // Clearing input should not immediately force temperature to 0
        expect(input.value).toBe('');
        expect(onTemperatureChange).not.toHaveBeenCalled();

        act(() => {
            input.blur();
        });

        // Blurring an empty draft restores formatted current temperature
        expect(input.value).toBe('1.0');
    });

    it('disposes WebGL2 shaders, program, VBOs, and VAO via disposeWebGL2Resources', () => {
        const deleteVertexArray = vi.fn();
        const deleteBuffer = vi.fn();
        const deleteProgram = vi.fn();
        const deleteShader = vi.fn();

        const mockGl = {
            VERTEX_SHADER: 0x8b31,
            FRAGMENT_SHADER: 0x8b30,
            COMPILE_STATUS: 0x8b81,
            LINK_STATUS: 0x8b82,
            ARRAY_BUFFER: 0x8892,
            STATIC_DRAW: 0x88e4,
            DYNAMIC_DRAW: 0x88e8,
            FLOAT: 0x1406,
            DEPTH_TEST: 0x0b71,
            LEQUAL: 0x0203,
            BLEND: 0x0be2,
            SRC_ALPHA: 0x0302,
            ONE_MINUS_SRC_ALPHA: 0x0303,
            COLOR_BUFFER_BIT: 0x4000,
            DEPTH_BUFFER_BIT: 0x0100,
            TRIANGLE_STRIP: 0x0005,
            createShader: vi.fn(() => ({})),
            shaderSource: vi.fn(),
            compileShader: vi.fn(),
            getShaderParameter: vi.fn(() => true),
            createProgram: vi.fn(() => ({})),
            attachShader: vi.fn(),
            linkProgram: vi.fn(),
            getProgramParameter: vi.fn(() => true),
            createVertexArray: vi.fn(() => ({})),
            bindVertexArray: vi.fn(),
            createBuffer: vi.fn(() => ({})),
            bindBuffer: vi.fn(),
            bufferData: vi.fn(),
            enableVertexAttribArray: vi.fn(),
            vertexAttribPointer: vi.fn(),
            vertexAttribDivisor: vi.fn(),
            getUniformLocation: vi.fn(() => ({})),
            deleteVertexArray,
            deleteBuffer,
            deleteProgram,
            deleteShader,
        } as unknown as WebGL2RenderingContext;

        const rendered = renderGaussianSplatsWebGL2(
            mockGl,
            { splats: [], originalWidth: 64, originalHeight: 64, aspectRatio: 1 },
            { yaw: 0, pitch: 0 },
            64,
            64,
        );
        expect(rendered).toBe(true);

        disposeWebGL2Resources(mockGl);
        expect(deleteVertexArray).toHaveBeenCalledTimes(1);
        expect(deleteBuffer).toHaveBeenCalledTimes(2);
        expect(deleteProgram).toHaveBeenCalledTimes(1);
        expect(deleteShader).toHaveBeenCalledTimes(2);
    });

    it('loads all 9 locales and provides complete translations for new and localized keys', async () => {
        await preloadAllTranslations();

        const requiredKeys = [
            'queuedBatchJobsRecoverRecent',
            'metadataViewerApplyBothSuccessNotice',
            'metadataViewerNoPrompt',
            'metadataViewerModelResponse',
            'composerAdvancedHighThinkingHighTempWarning',
            'generationFailureSummaryThinkingLoop',
            'generationFailureDetailThinkingLoop',
        ];

        for (const { value: lang } of SUPPORTED_LANGUAGES) {
            for (const key of requiredKeys) {
                const translated = getTranslation(lang, key);
                expect(translated, `Missing translation for ${lang}.${key}`).toBeTruthy();
                expect(translated, `Untranslated key fallback for ${lang}.${key}`).not.toBe(key);
            }
        }

        // Verify non-English locales no longer fall back to English for ThinkingLoop strings
        for (const lang of ['ja', 'ko', 'es', 'fr', 'de', 'ru'] as const) {
            expect(getTranslation(lang, 'generationFailureSummaryThinkingLoop')).not.toBe('Thinking Loop Detected');
        }
    });
});
