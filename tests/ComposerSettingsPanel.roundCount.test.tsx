/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ComposerSettingsPanel from '../components/ComposerSettingsPanel';
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
    batchSize: 1,
    outputFormat: 'images-only' as const,
    thinkingLevel: 'high' as const,
    groundingMode: 'off' as const,
    currentStageAsset: null,
    capability: MODEL_CAPABILITIES['gemini-3.1-flash-image'],
    availableGroundingModes: ['off'] as const,
    temperature: 1,
    isAdvancedSettingsOpen: false,
    generateLabel: 'Generate',
    isQueueBatchDisabled: false,
    queueBatchDisabledReason: null,
    queueBatchModeSummary: '',
    queueBatchGenerateModeSummary: '',
    queueBatchConversationNotice: null,
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
};

describe('ComposerSettingsPanel round count controls', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
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

    it('allows increasing round count when unlocked', () => {
        const onRoundCountChange = vi.fn();

        act(() => {
            root.render(
                <ComposerSettingsPanel
                    {...baseProps}
                    roundCount={1}
                    onRoundCountChange={onRoundCountChange}
                    settingsLocked={false}
                />,
            );
        });

        const increaseBtn = container.querySelector(
            '[data-testid="composer-round-count-increase"]',
        ) as HTMLButtonElement;
        expect(increaseBtn).toBeTruthy();
        expect(increaseBtn.disabled).toBe(false);

        act(() => {
            increaseBtn.click();
        });

        expect(onRoundCountChange).toHaveBeenCalledWith(2);
    });

    it('allows decreasing round count when roundCount > 1', () => {
        const onRoundCountChange = vi.fn();

        act(() => {
            root.render(
                <ComposerSettingsPanel
                    {...baseProps}
                    roundCount={3}
                    onRoundCountChange={onRoundCountChange}
                    settingsLocked={false}
                />,
            );
        });

        const decreaseBtn = container.querySelector(
            '[data-testid="composer-round-count-decrease"]',
        ) as HTMLButtonElement;
        expect(decreaseBtn).toBeTruthy();
        expect(decreaseBtn.disabled).toBe(false);

        act(() => {
            decreaseBtn.click();
        });

        expect(onRoundCountChange).toHaveBeenCalledWith(2);
    });

    it('disables decrease button when roundCount is 1', () => {
        act(() => {
            root.render(<ComposerSettingsPanel {...baseProps} roundCount={1} settingsLocked={false} />);
        });

        const decreaseBtn = container.querySelector(
            '[data-testid="composer-round-count-decrease"]',
        ) as HTMLButtonElement;
        expect(decreaseBtn.disabled).toBe(true);
    });

    it('disables increase button when roundCount reaches 10', () => {
        act(() => {
            root.render(<ComposerSettingsPanel {...baseProps} roundCount={10} settingsLocked={false} />);
        });

        const increaseBtn = container.querySelector(
            '[data-testid="composer-round-count-increase"]',
        ) as HTMLButtonElement;
        expect(increaseBtn.disabled).toBe(true);
    });

    it('allows selecting a round count from the popover grid', () => {
        const onRoundCountChange = vi.fn();

        act(() => {
            root.render(
                <ComposerSettingsPanel
                    {...baseProps}
                    roundCount={1}
                    onRoundCountChange={onRoundCountChange}
                    settingsLocked={false}
                />,
            );
        });

        const trigger = container.querySelector(
            '[data-testid="composer-round-count-grid-trigger"]',
        ) as HTMLButtonElement;
        expect(trigger).toBeTruthy();
        expect(trigger.textContent?.trim()).toBe('1');

        act(() => {
            trigger.click();
        });

        const option5 = container.querySelector('[data-testid="composer-round-count-option-5"]') as HTMLButtonElement;
        expect(option5).toBeTruthy();

        act(() => {
            option5.click();
        });

        expect(onRoundCountChange).toHaveBeenCalledWith(5);
    });

    it('allows adjusting round count even when settings are locked (settingsLocked=true)', () => {
        const onRoundCountChange = vi.fn();

        act(() => {
            root.render(
                <ComposerSettingsPanel
                    {...baseProps}
                    roundCount={2}
                    onRoundCountChange={onRoundCountChange}
                    settingsLocked={true}
                />,
            );
        });

        const decreaseBtn = container.querySelector(
            '[data-testid="composer-round-count-decrease"]',
        ) as HTMLButtonElement;
        const increaseBtn = container.querySelector(
            '[data-testid="composer-round-count-increase"]',
        ) as HTMLButtonElement;
        const trigger = container.querySelector(
            '[data-testid="composer-round-count-grid-trigger"]',
        ) as HTMLButtonElement;

        expect(decreaseBtn.disabled).toBe(false);
        expect(increaseBtn.disabled).toBe(false);
        expect(trigger.disabled).toBe(false);

        act(() => {
            increaseBtn.click();
        });
        expect(onRoundCountChange).toHaveBeenCalledWith(3);

        act(() => {
            decreaseBtn.click();
        });
        expect(onRoundCountChange).toHaveBeenCalledWith(1);

        act(() => {
            trigger.click();
        });
        const option7 = container.querySelector('[data-testid="composer-round-count-option-7"]') as HTMLButtonElement;
        expect(option7).toBeTruthy();

        act(() => {
            option7.click();
        });
        expect(onRoundCountChange).toHaveBeenCalledWith(7);
    });
});
