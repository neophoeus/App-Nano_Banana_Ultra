/** @vitest-environment jsdom */

import { act, createRef } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ComposerSettingsPanel from '../components/ComposerSettingsPanel';
import { WorkspaceFloatingLayerContext } from '../components/WorkspaceFloatingLayerContext';
import { MODEL_CAPABILITIES } from '../constants';
import { getTranslation } from '../utils/translations';

const baseProps = {
    prompt: 'Test prompt',
    placeholder: 'Type here',
    enterToSubmit: false,
    isGenerating: false,
    isActionLocked: false,
    isCancelFinalizing: false,
    isEnhancingPrompt: false,
    activePromptTool: null,
    currentLanguage: 'en' as const,
    imageStyleLabel: 'None',
    modelLabel: getTranslation('en', 'modelGemini31Flash'),
    aspectRatio: '1:1' as const,
    imageSize: '2K' as const,
    batchSize: 3,
    outputFormat: 'images-only' as const,
    thinkingLevel: 'high' as const,
    groundingMode: 'off' as const,
    currentStageAsset: null,
    capability: MODEL_CAPABILITIES['gemini-3.1-flash-image-preview'],
    availableGroundingModes: ['off', 'google-search', 'image-search', 'google-search-plus-image-search'] as ('off' | 'google-search' | 'image-search' | 'google-search-plus-image-search')[],
    temperature: 1,
    isAdvancedSettingsOpen: true,
    generateLabel: 'Generate',
    isQueueBatchDisabled: false,
    queueBatchDisabledReason: null,
    queueBatchModeSummary: 'Queued batch runs as a separate official job workflow.',
    queueBatchGenerateModeSummary: 'Queued prompt-only batch ignores the staged image.',
    queueBatchConversationNotice: 'Official chat continuation stays out of queued batch mode.',
    onPromptChange: vi.fn(),
    stickySendIntent: 'independent' as const,
    onStickySendIntentChange: vi.fn(),
    onToggleEnterToSubmit: vi.fn(),
    onGenerate: vi.fn(),
    onQueueBatchJob: vi.fn(),
    onQueueBatchFollowUpJob: vi.fn(),
    onCancelGeneration: vi.fn(),
    onStartNewConversation: vi.fn(),
    onFollowUpGenerate: vi.fn(),
    onImageToPrompt: vi.fn(),
    onSurpriseMe: vi.fn(),
    onSmartRewrite: vi.fn(),
    onOpenStyles: vi.fn(),
    onOpenSettings: vi.fn(),
    onToggleAdvancedSettings: vi.fn(),
    getStageOriginLabel: () => 'Generated',
    getLineageActionLabel: () => 'Root',
    onClearStyle: vi.fn(),
    imageToolsPanel: <div data-testid="embedded-image-tools">Embedded Image Tools</div>,
};

describe('ComposerSettingsPanel prompt focus wiring', () => {
    let container: HTMLDivElement;
    let root: Root;
    let workspaceFloatingHost: HTMLDivElement | null;

    beforeEach(() => {
        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
        container = document.createElement('div');
        workspaceFloatingHost = null;
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        workspaceFloatingHost?.remove();
        container.remove();
        vi.useRealTimers();
        vi.restoreAllMocks();
        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
    });

    it('forwards the prompt textarea ref to the main composer field', () => {
        const promptTextareaRef = createRef<HTMLTextAreaElement>();

        act(() => {
            root.render(<ComposerSettingsPanel {...baseProps} promptTextareaRef={promptTextareaRef} />);
        });

        expect(promptTextareaRef.current).toBeInstanceOf(HTMLTextAreaElement);
        expect(promptTextareaRef.current?.value).toBe('Test prompt');
    });

    it('routes the composer prompt clear button through the prompt change handler', () => {
        const onPromptChange = vi.fn();

        act(() => {
            root.render(<ComposerSettingsPanel {...baseProps} onPromptChange={onPromptChange} />);
        });

        const clearButton = container.querySelector('[data-testid="composer-prompt-clear"]') as HTMLButtonElement;

        act(() => {
            clearButton.click();
        });

        expect(clearButton.disabled).toBe(false);
        expect(onPromptChange).toHaveBeenCalledTimes(1);
        expect(onPromptChange).toHaveBeenCalledWith('');
    });

    it('disables the composer prompt clear button when the prompt is already empty', () => {
        act(() => {
            root.render(<ComposerSettingsPanel {...baseProps} prompt="" />);
        });

        const clearButton = container.querySelector('[data-testid="composer-prompt-clear"]') as HTMLButtonElement;

        expect(clearButton).toBeInstanceOf(HTMLButtonElement);
        expect(clearButton.disabled).toBe(true);
    });

    it('routes the unified settings strip through the composer-owned opener', () => {
        const onOpenSettings = vi.fn();

        act(() => {
            root.render(<ComposerSettingsPanel {...baseProps} onOpenSettings={onOpenSettings} />);
        });

        const settingsButton = container.querySelector('[data-testid="composer-settings-button"]') as HTMLButtonElement;

        act(() => {
            settingsButton.click();
        });

        expect(onOpenSettings).toHaveBeenCalledTimes(1);
        expect(container.querySelector('[data-testid="composer-reference-context-button"]')).toBeNull();
    });

    it('routes the Image to Prompt quick tool through the hidden file input and forwards the selected file', () => {
        const onImageToPrompt = vi.fn();
        const inputClickSpy = vi.spyOn(HTMLInputElement.prototype, 'click');

        act(() => {
            root.render(<ComposerSettingsPanel {...baseProps} onImageToPrompt={onImageToPrompt} />);
        });

        const triggerButton = container.querySelector(
            '[data-testid="composer-quick-tool-image-to-prompt"]',
        ) as HTMLButtonElement;
        const input = container.querySelector('[data-testid="composer-image-to-prompt-input"]') as HTMLInputElement;
        const file = new File(['pixel'], 'reference.png', { type: 'image/png' });

        act(() => {
            triggerButton.click();
        });

        expect(inputClickSpy).toHaveBeenCalledTimes(1);

        Object.defineProperty(input, 'files', {
            configurable: true,
            value: [file],
        });

        act(() => {
            input.dispatchEvent(new Event('change', { bubbles: true }));
        });

        expect(onImageToPrompt).toHaveBeenCalledTimes(1);
        expect(onImageToPrompt).toHaveBeenCalledWith(file);
    });

    it('shows only the active quick-tool spinner and blocks sibling quick-tool actions while busy', () => {
        const onSurpriseMe = vi.fn();
        const onSmartRewrite = vi.fn();

        act(() => {
            root.render(
                <ComposerSettingsPanel
                    {...baseProps}
                    isEnhancingPrompt={true}
                    activePromptTool="image-to-prompt"
                    onSurpriseMe={onSurpriseMe}
                    onSmartRewrite={onSmartRewrite}
                />,
            );
        });

        const imageButton = container.querySelector(
            '[data-testid="composer-quick-tool-image-to-prompt"]',
        ) as HTMLButtonElement;
        const surpriseButton = container.querySelector(
            '[data-testid="composer-quick-tool-inspiration"]',
        ) as HTMLButtonElement;
        const rewriteButton = container.querySelector(
            '[data-testid="composer-quick-tool-rewrite"]',
        ) as HTMLButtonElement;

        expect(container.querySelector('[data-testid="composer-quick-tool-spinner-image-to-prompt"]')).toBeTruthy();
        expect(container.querySelector('[data-testid="composer-quick-tool-spinner-inspiration"]')).toBeNull();
        expect(container.querySelector('[data-testid="composer-quick-tool-spinner-rewrite"]')).toBeNull();
        expect(imageButton.disabled).toBe(true);
        expect(surpriseButton.disabled).toBe(true);
        expect(rewriteButton.disabled).toBe(true);

        act(() => {
            surpriseButton.click();
            rewriteButton.click();
        });

        expect(onSurpriseMe).not.toHaveBeenCalled();
        expect(onSmartRewrite).not.toHaveBeenCalled();
    });

    it('keeps the style strip always visible and routes clear separately from opening the style modal', () => {
        const onOpenStyles = vi.fn();
        const onClearStyle = vi.fn();

        act(() => {
            root.render(
                <ComposerSettingsPanel
                    {...baseProps}
                    imageStyleLabel="Anime"
                    onOpenStyles={onOpenStyles}
                    onClearStyle={onClearStyle}
                />,
            );
        });

        const styleButton = container.querySelector('[data-testid="composer-style-button"]') as HTMLButtonElement;
        const clearButton = container.querySelector('[data-testid="composer-style-clear"]') as HTMLButtonElement;

        expect(container.querySelector('[data-testid="composer-style-strip"]')).toBeInstanceOf(HTMLDivElement);
        expect(styleButton).toBeInstanceOf(HTMLButtonElement);
        expect(clearButton).toBeInstanceOf(HTMLButtonElement);

        act(() => {
            styleButton.click();
        });

        act(() => {
            clearButton.click();
        });

        expect(onOpenStyles).toHaveBeenCalledTimes(1);
        expect(onClearStyle).toHaveBeenCalledTimes(1);
    });

    it('hides the style clear affordance when the current style is none', () => {
        act(() => {
            root.render(<ComposerSettingsPanel {...baseProps} imageStyleLabel="None" />);
        });

        expect(container.querySelector('[data-testid="composer-style-strip"]')).toBeInstanceOf(HTMLDivElement);
        expect(container.querySelector('[data-testid="composer-style-clear"]')).toBeNull();
    });

    it('routes the relocated Enter behavior toggle through the toggle handler', () => {
        const onToggleEnterToSubmit = vi.fn();

        act(() => {
            root.render(<ComposerSettingsPanel {...baseProps} onToggleEnterToSubmit={onToggleEnterToSubmit} />);
        });

        const enterBehaviorToggle = container.querySelector(
            '[data-testid="composer-enter-behavior-toggle"]',
        ) as HTMLButtonElement;

        act(() => {
            enterBehaviorToggle.click();
        });

        expect(onToggleEnterToSubmit).toHaveBeenCalledTimes(1);
    });

    it('shows background finalizing state after cancel while keeping prompt editing available', () => {
        const onPromptChange = vi.fn();
        const onGenerate = vi.fn();

        act(() => {
            root.render(
                <ComposerSettingsPanel
                    {...baseProps}
                    isActionLocked={true}
                    isCancelFinalizing={true}
                    onPromptChange={onPromptChange}
                    onGenerate={onGenerate}
                />,
            );
        });

        const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
        const finalizingButton = container.querySelector(
            '[data-testid="composer-cancel-finalizing-button"]',
        ) as HTMLButtonElement;
        const finalizingNote = container.querySelector('[data-testid="composer-cancel-finalizing-note"]');
        const valueSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;

        act(() => {
            valueSetter?.call(textarea, 'Queued next prompt');
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
        });

        expect(finalizingButton.disabled).toBe(true);
        expect(finalizingButton.textContent).toContain('Finalizing cancelled run');
        expect(finalizingNote?.textContent).toContain('Completed images are still being written to history');
        expect(onPromptChange).toHaveBeenCalledWith('Queued next prompt');
        expect(onGenerate).not.toHaveBeenCalled();
        expect(container.textContent).not.toContain('Cancel');
    });

    it('keeps the active thumb aligned with the selected Enter behavior option', () => {
        act(() => {
            root.render(<ComposerSettingsPanel {...baseProps} />);
        });

        let thumb = container.querySelector('[data-testid="composer-enter-behavior-thumb"]') as HTMLSpanElement;
        let sendOption = container.querySelector(
            '[data-testid="composer-enter-behavior-send-option"]',
        ) as HTMLSpanElement;
        let newlineOption = container.querySelector(
            '[data-testid="composer-enter-behavior-newline-option"]',
        ) as HTMLSpanElement;

        expect(thumb.getAttribute('data-active-mode')).toBe('newline');
        expect(thumb.className).toContain('top-[calc(50%+0.125rem)]');
        expect(sendOption.getAttribute('data-selected')).toBe('false');
        expect(newlineOption.getAttribute('data-selected')).toBe('true');

        act(() => {
            root.render(<ComposerSettingsPanel {...baseProps} enterToSubmit={true} />);
        });

        thumb = container.querySelector('[data-testid="composer-enter-behavior-thumb"]') as HTMLSpanElement;
        sendOption = container.querySelector('[data-testid="composer-enter-behavior-send-option"]') as HTMLSpanElement;
        newlineOption = container.querySelector(
            '[data-testid="composer-enter-behavior-newline-option"]',
        ) as HTMLSpanElement;

        expect(thumb.getAttribute('data-active-mode')).toBe('send');
        expect(thumb.className).toContain('top-px');
        expect(sendOption.getAttribute('data-selected')).toBe('true');
        expect(newlineOption.getAttribute('data-selected')).toBe('false');
    });

    it('routes bare Enter through Generate when Enter submit is active without a staged image', () => {
        const onGenerate = vi.fn();
        const onFollowUpGenerate = vi.fn();

        act(() => {
            root.render(
                <ComposerSettingsPanel
                    {...baseProps}
                    enterToSubmit={true}
                    onGenerate={onGenerate}
                    onFollowUpGenerate={onFollowUpGenerate}
                />,
            );
        });

        const textarea = container.querySelector('textarea') as HTMLTextAreaElement;

        act(() => {
            textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
        });

        expect(onGenerate).toHaveBeenCalledTimes(1);
        expect(onFollowUpGenerate).not.toHaveBeenCalled();
    });

    it('routes bare Enter through the staged-image continuation action when a stage source exists', () => {
        const onGenerate = vi.fn();
        const onFollowUpGenerate = vi.fn();

        act(() => {
            root.render(
                <ComposerSettingsPanel
                    {...baseProps}
                    enterToSubmit={true}
                    currentStageAsset={{
                        id: 'stage-source-1',
                        url: 'https://example.com/stage-source.png',
                        role: 'stage-source',
                        origin: 'history',
                        createdAt: 1710400010000,
                        lineageAction: 'reopen',
                    }}
                    onGenerate={onGenerate}
                    onFollowUpGenerate={onFollowUpGenerate}
                />,
            );
        });

        const textarea = container.querySelector('textarea') as HTMLTextAreaElement;

        act(() => {
            textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
        });

        expect(onGenerate).not.toHaveBeenCalled();
        expect(onFollowUpGenerate).toHaveBeenCalledTimes(1);
    });

    it('routes staged queue buttons through separate follow-up and generate handlers', () => {
        const onQueueBatchJob = vi.fn();
        const onQueueBatchFollowUpJob = vi.fn();

        act(() => {
            root.render(
                <ComposerSettingsPanel
                    {...baseProps}
                    currentStageAsset={{
                        id: 'stage-source-1',
                        url: 'https://example.com/stage-source.png',
                        role: 'stage-source',
                        origin: 'history',
                        createdAt: 1710400010000,
                        lineageAction: 'reopen',
                    }}
                    onQueueBatchJob={onQueueBatchJob}
                    onQueueBatchFollowUpJob={onQueueBatchFollowUpJob}
                />,
            );
        });

        const primaryQueueButton = container.querySelector(
            '[data-testid="composer-queue-batch-primary-button"]',
        ) as HTMLButtonElement;
        const generateQueueButton = container.querySelector(
            '[data-testid="composer-queue-batch-generate-button"]',
        ) as HTMLButtonElement;

        act(() => {
            primaryQueueButton.click();
            generateQueueButton.click();
        });

        expect(onQueueBatchFollowUpJob).toHaveBeenCalledTimes(1);
        expect(onQueueBatchJob).toHaveBeenCalledTimes(1);
    });

    it('keeps Shift+Enter as newline behavior even when Enter submit is active', () => {
        const onGenerate = vi.fn();
        const onFollowUpGenerate = vi.fn();

        act(() => {
            root.render(
                <ComposerSettingsPanel
                    {...baseProps}
                    enterToSubmit={true}
                    onGenerate={onGenerate}
                    onFollowUpGenerate={onFollowUpGenerate}
                />,
            );
        });

        const textarea = container.querySelector('textarea') as HTMLTextAreaElement;

        act(() => {
            textarea.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true, cancelable: true }),
            );
        });

        expect(onGenerate).not.toHaveBeenCalled();
        expect(onFollowUpGenerate).not.toHaveBeenCalled();
    });

    it('routes whole-button toggle clicks through the explicit change handler', () => {
        const onStickySendIntentChange = vi.fn();

        act(() => {
            root.render(
                <ComposerSettingsPanel
                    {...baseProps}
                    batchSize={1}
                    stickySendIntent="memory"
                    onStickySendIntentChange={onStickySendIntentChange}
                />,
            );
        });

        let independentButton = container.querySelector(
            '[data-testid="composer-sticky-send-intent-independent"]',
        ) as HTMLSpanElement;
        let memoryButton = container.querySelector(
            '[data-testid="composer-sticky-send-intent-memory"]',
        ) as HTMLSpanElement;
        let toggle = container.querySelector('[data-testid="composer-sticky-send-intent-toggle"]') as HTMLButtonElement;
        const thumb = container.querySelector('[data-testid="composer-sticky-send-intent-thumb"]') as HTMLSpanElement;

        expect(toggle.getAttribute('aria-pressed')).toBe('true');
        expect(independentButton.getAttribute('data-selected')).toBe('false');
        expect(memoryButton.getAttribute('data-selected')).toBe('true');
        expect(toggle.getAttribute('data-active-intent')).toBe('memory');
        expect(thumb.getAttribute('data-active-intent')).toBe('memory');

        act(() => {
            toggle.click();
        });

        expect(onStickySendIntentChange).toHaveBeenNthCalledWith(1, 'independent');

        act(() => {
            root.render(
                <ComposerSettingsPanel
                    {...baseProps}
                    batchSize={1}
                    stickySendIntent="independent"
                    onStickySendIntentChange={onStickySendIntentChange}
                />,
            );
        });

        independentButton = container.querySelector(
            '[data-testid="composer-sticky-send-intent-independent"]',
        ) as HTMLSpanElement;
        memoryButton = container.querySelector('[data-testid="composer-sticky-send-intent-memory"]') as HTMLSpanElement;
        toggle = container.querySelector('[data-testid="composer-sticky-send-intent-toggle"]') as HTMLButtonElement;

        expect(toggle.getAttribute('aria-pressed')).toBe('false');
        expect(independentButton.getAttribute('data-selected')).toBe('true');
        expect(memoryButton.getAttribute('data-selected')).toBe('false');

        act(() => {
            toggle.click();
        });

        expect(onStickySendIntentChange).toHaveBeenNthCalledWith(2, 'memory');
    });

    it('opens the info card instead of switching when memory is unavailable', () => {
        vi.useFakeTimers();
        const onStickySendIntentChange = vi.fn();

        act(() => {
            root.render(
                <ComposerSettingsPanel
                    {...baseProps}
                    batchSize={3}
                    stickySendIntent="independent"
                    onStickySendIntentChange={onStickySendIntentChange}
                />,
            );
        });

        const toggle = container.querySelector(
            '[data-testid="composer-sticky-send-intent-toggle"]',
        ) as HTMLButtonElement;

        act(() => {
            toggle.click();
        });

        expect(onStickySendIntentChange).not.toHaveBeenCalled();
        expect(container.textContent).toContain('Keeps the next send inside official conversation memory.');
        expect(container.textContent).toContain('Remembered context increases token usage.');
        expect(container.textContent).toContain('Memory send is available only when quantity is 1.');

        act(() => {
            vi.advanceTimersByTime(3300);
        });

        expect(container.querySelector('[data-testid="composer-sticky-send-intent-info-card"]')).toBeNull();
    });

    it('keeps the manually opened info card visible until it is dismissed', () => {
        vi.useFakeTimers();

        act(() => {
            root.render(<ComposerSettingsPanel {...baseProps} batchSize={3} stickySendIntent="independent" />);
        });

        const infoTrigger = container.querySelector(
            '[data-testid="composer-sticky-send-intent-info-trigger"]',
        ) as HTMLButtonElement;

        act(() => {
            infoTrigger.click();
        });

        expect(
            (container.querySelector('[data-testid="composer-sticky-send-intent-info-card"]') as HTMLDivElement)
                .className,
        ).toContain('bg-white');
        expect(container.textContent).toContain(
            'Uses the selected image and tools without replaying official conversation memory.',
        );

        act(() => {
            vi.advanceTimersByTime(3300);
        });

        expect(container.querySelector('[data-testid="composer-sticky-send-intent-info-card"]')).toBeTruthy();

        act(() => {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        });

        expect(container.querySelector('[data-testid="composer-sticky-send-intent-info-card"]')).toBeNull();
    });

    it('portals the send-intent info card into the workspace floating host and keeps panel clicks inside the boundary', () => {
        workspaceFloatingHost = document.createElement('div');
        workspaceFloatingHost.setAttribute('data-workspace-floating-layer', 'true');
        document.body.appendChild(workspaceFloatingHost);

        act(() => {
            root.render(
                <WorkspaceFloatingLayerContext.Provider
                    value={{ floatingZIndex: 221, hostElement: workspaceFloatingHost }}
                >
                    <ComposerSettingsPanel {...baseProps} batchSize={3} stickySendIntent="independent" />
                </WorkspaceFloatingLayerContext.Provider>,
            );
        });

        const infoTrigger = container.querySelector(
            '[data-testid="composer-sticky-send-intent-info-trigger"]',
        ) as HTMLButtonElement;

        act(() => {
            infoTrigger.click();
        });

        const portaledInfoCard = workspaceFloatingHost.querySelector(
            '[data-testid="composer-sticky-send-intent-info-card"]',
        ) as HTMLDivElement;

        expect(portaledInfoCard).toBeTruthy();
        expect(container.querySelector('[data-testid="composer-sticky-send-intent-info-card"]')).toBeNull();

        act(() => {
            portaledInfoCard.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        });

        expect(
            workspaceFloatingHost.querySelector('[data-testid="composer-sticky-send-intent-info-card"]'),
        ).toBeTruthy();

        act(() => {
            document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        });

        expect(workspaceFloatingHost.querySelector('[data-testid="composer-sticky-send-intent-info-card"]')).toBeNull();
    });

    it('only shows the new conversation reset action while memory send intent is active', () => {
        act(() => {
            root.render(<ComposerSettingsPanel {...baseProps} batchSize={1} stickySendIntent="independent" />);
        });

        expect(
            container
                .querySelector('[data-testid="composer-sticky-send-intent-toggle"]')
                ?.getAttribute('data-active-intent'),
        ).toBe('independent');
        expect(container.textContent).not.toContain('New Conversation');

        act(() => {
            root.render(<ComposerSettingsPanel {...baseProps} batchSize={1} stickySendIntent="memory" />);
        });

        expect(
            container
                .querySelector('[data-testid="composer-sticky-send-intent-toggle"]')
                ?.getAttribute('data-active-intent'),
        ).toBe('memory');
        expect(container.textContent).toContain('New Conversation');
    });
});
