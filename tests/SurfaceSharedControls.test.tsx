import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import SurfaceSharedControls from '../components/SurfaceSharedControls';
import { MODEL_CAPABILITIES } from '../constants';
import { getAvailableGroundingModes } from '../utils/groundingMode';
import { getTranslation } from '../utils/translations';

const getButtonMarkup = (markup: string, testId: string) =>
    markup.match(new RegExp(`data-testid="${testId}"[\\s\\S]*?<\\/button>`))?.[0] ?? '';

const getSummaryItemMarkup = (markup: string, itemId: string) =>
    markup.match(new RegExp(`data-testid="shared-controls-summary-item-${itemId}"[\\s\\S]*?<\\/span><\\/span>`))?.[0] ??
    '';

describe('SurfaceSharedControls', () => {
    it('renders a vertical shared-controls stack with per-button summaries and no style entry', () => {
        const modelLabel = getTranslation('en', 'modelGemini31Flash');
        const capability = MODEL_CAPABILITIES['gemini-3.1-flash-image-preview'];
        const markup = renderToStaticMarkup(
            <SurfaceSharedControls
                currentLanguage="en"
                activePickerSheet="prompt"
                isAdvancedSettingsOpen={false}
                totalReferenceCount={3}
                hasPrompt={true}
                capability={capability}
                availableGroundingModes={getAvailableGroundingModes(capability)}
                modelLabel={modelLabel}
                aspectRatio="1:1"
                imageSize="1024x1024"
                batchSize={2}
                outputFormat="images-and-text"
                temperature={1.4}
                thinkingLevel="high"
                includeThoughts={true}
                groundingMode="google-search"
                objectImageCount={2}
                characterImageCount={1}
                maxObjects={10}
                maxCharacters={4}
                settingsVariant="full"
                containerClassName="shared-shell"
                onOpenSheet={vi.fn()}
                onOpenAdvancedSettings={vi.fn()}
            />,
        );
        const modelSummaryMarkup = getSummaryItemMarkup(markup, 'model');
        const promptButtonMarkup = getButtonMarkup(markup, 'shared-control-prompt');
        const settingsButtonMarkup = getButtonMarkup(markup, 'shared-control-settings');
        const advancedButtonMarkup = getButtonMarkup(markup, 'shared-control-advanced-settings');
        const referencesButtonMarkup = getButtonMarkup(markup, 'shared-control-references');

        expect(markup).toContain('shared-controls-panel');
        expect(markup).toContain('shared-controls-toggle');
        expect(markup).toContain('flex min-w-0 items-center gap-2.5');
        expect(markup).not.toContain('data-testid="shared-controls-summary"');
        expect(markup).toContain('shared-controls-actions');
        expect(markup).toContain('mt-2.5 flex flex-col gap-1.5');
        expect(markup).not.toContain('shared-controls-summary-item-thoughts');
        expect(markup).toContain('text-sm font-semibold text-gray-900');
        expect(markup).toContain('px-2 py-px');
        expect(markup).toContain('w-[min(16rem,calc(100vw-2rem))]');
        expect(markup).toContain('rounded-xl border px-2.5 py-2 text-left transition-colors');
        expect(markup).toContain('flex min-w-0 flex-col items-start gap-1.5');
        expect(markup).toContain('text-xs font-semibold leading-[13px]');
        expect(markup).not.toContain('max-w-[min(92vw,21rem)]');
        expect(markup).not.toContain('max-w-[min(92vw,380px)]');
        expect(markup).toContain('Settings');
        expect(markup).toContain('Prompt');
        expect(modelSummaryMarkup).toContain('Nano Banana 2');
        expect(modelSummaryMarkup).not.toContain('gemini-3.1-flash-image-preview');
        expect(markup).not.toContain('aria-expanded');
        expect(markup).not.toContain('sm:col-span-2');
        expect(markup).not.toContain('mt-1 text-xs text-gray-500 dark:text-gray-400');
        expect(markup).toContain('shared-control-prompt');
        expect(markup).toContain('shared-control-settings');
        expect(markup).toContain('shared-control-advanced-settings');
        expect(markup).not.toContain('shared-control-styles');
        expect(markup).toContain('Advanced settings');
        expect(markup).toContain('Generation Settings');
        expect(markup).toContain('Reference Tray');
        expect(promptButtonMarkup).toContain('shared-controls-summary-item-prompt');
        expect(promptButtonMarkup).toContain('Ready');
        expect(settingsButtonMarkup).toContain('shared-controls-summary-item-model');
        expect(settingsButtonMarkup).toContain('shared-controls-summary-item-ratio');
        expect(settingsButtonMarkup).toContain('shared-controls-summary-item-size');
        expect(settingsButtonMarkup).toContain('shared-controls-summary-item-quantity');
        expect(settingsButtonMarkup).not.toContain('shared-controls-summary-item-output-format');
        expect(advancedButtonMarkup).toContain('shared-controls-summary-item-output-format');
        expect(advancedButtonMarkup).toContain('Images &amp; text');
        expect(advancedButtonMarkup).toContain('shared-controls-summary-item-thinking-level');
        expect(advancedButtonMarkup).toContain('High');
        expect(advancedButtonMarkup).toContain('shared-controls-summary-item-grounding');
        expect(advancedButtonMarkup).toContain('Google Search');
        expect(advancedButtonMarkup).toContain('shared-controls-summary-item-temperature');
        expect(advancedButtonMarkup).toContain('1.4');
        expect(advancedButtonMarkup).not.toContain('shared-controls-summary-item-structured-output');
        expect(referencesButtonMarkup).toContain('shared-controls-summary-item-references');
    });

    it('shows advanced-setting chips only inside the advanced-settings button when supported and not off', () => {
        const modelLabel = getTranslation('en', 'modelGemini3Pro');
        const capability = MODEL_CAPABILITIES['gemini-3-pro-image-preview'];
        const markup = renderToStaticMarkup(
            <SurfaceSharedControls
                currentLanguage="en"
                activePickerSheet="settings"
                isAdvancedSettingsOpen={true}
                totalReferenceCount={2}
                hasPrompt={false}
                capability={capability}
                availableGroundingModes={getAvailableGroundingModes(capability)}
                modelLabel={modelLabel}
                aspectRatio="16:9"
                imageSize="2K"
                batchSize={1}
                outputFormat="images-only"
                temperature={1}
                thinkingLevel="disabled"
                includeThoughts={false}
                groundingMode="off"
                objectImageCount={0}
                characterImageCount={0}
                maxObjects={6}
                maxCharacters={5}
                settingsVariant="full"
                containerClassName="shared-shell"
                onOpenSheet={vi.fn()}
                onOpenAdvancedSettings={vi.fn()}
            />,
        );
        const settingsButtonMarkup = getButtonMarkup(markup, 'shared-control-settings');
        const advancedButtonMarkup = getButtonMarkup(markup, 'shared-control-advanced-settings');

        expect(settingsButtonMarkup).not.toContain('shared-controls-summary-item-output-format');
        expect(advancedButtonMarkup).toContain('shared-controls-summary-item-output-format');
        expect(advancedButtonMarkup).toContain('shared-controls-summary-item-temperature');
        expect(advancedButtonMarkup).not.toContain('shared-controls-summary-item-thinking-level');
        expect(advancedButtonMarkup).not.toContain('shared-controls-summary-item-grounding');
        expect(advancedButtonMarkup).not.toContain('Thinking level: Off');
        expect(advancedButtonMarkup).not.toContain('Grounding: Off');
        expect(markup).not.toContain('shared-controls-summary-item-thoughts');
    });

    it('shows only first-layer model and ratio controls for sketch surfaces', () => {
        const modelLabel = getTranslation('en', 'modelGemini25Flash');
        const capability = MODEL_CAPABILITIES['gemini-2.5-flash-image'];
        const markup = renderToStaticMarkup(
            <SurfaceSharedControls
                currentLanguage="en"
                activePickerSheet="model"
                isAdvancedSettingsOpen={false}
                totalReferenceCount={3}
                hasPrompt={true}
                capability={capability}
                availableGroundingModes={getAvailableGroundingModes(capability)}
                modelLabel={modelLabel}
                aspectRatio="3:2"
                imageSize="1024x1024"
                batchSize={2}
                outputFormat="images-only"
                temperature={1}
                thinkingLevel="disabled"
                includeThoughts={false}
                groundingMode="off"
                objectImageCount={2}
                characterImageCount={1}
                maxObjects={10}
                maxCharacters={4}
                settingsVariant="sketch"
                containerClassName="shared-shell"
                onOpenSheet={vi.fn()}
                onOpenAdvancedSettings={vi.fn()}
            />,
        );
        const modelSummaryMarkup = getSummaryItemMarkup(markup, 'model');
        const modelButtonMarkup = getButtonMarkup(markup, 'shared-control-model');
        const ratioButtonMarkup = getButtonMarkup(markup, 'shared-control-ratio');

        expect(markup).not.toContain('data-testid="shared-controls-summary"');
        expect(markup).toContain('shared-controls-actions');
        expect(markup).toContain('w-[min(16rem,calc(100vw-2rem))]');
        expect(markup).toContain('mt-2.5 flex flex-col gap-1.5');
        expect(markup).toContain('px-2 py-px');
        expect(markup).toContain('text-xs font-semibold leading-[13px]');
        expect(markup).toContain('shared-controls-summary-item-model');
        expect(markup).toContain('shared-controls-summary-item-ratio');
        expect(markup).toContain('Settings');
        expect(modelSummaryMarkup).toContain('Nano Banana');
        expect(modelSummaryMarkup).not.toContain('gemini-2.5-flash-image');
        expect(modelButtonMarkup).toContain('shared-controls-summary-item-model');
        expect(ratioButtonMarkup).toContain('shared-controls-summary-item-ratio');
        expect(ratioButtonMarkup).toContain('3:2');
        expect(markup).toContain('shared-control-model');
        expect(markup).toContain('shared-control-ratio');
        expect(markup).not.toContain('shared-control-prompt');
        expect(markup).not.toContain('shared-controls-summary-item-prompt');
        expect(markup).not.toContain('shared-control-styles');
        expect(markup).not.toContain('shared-control-settings');
        expect(markup).not.toContain('shared-control-advanced-settings');
        expect(markup).not.toContain('Reference Tray');
        expect(markup).not.toContain('3 refs');
        expect(markup).not.toContain('mt-1 text-xs text-gray-500 dark:text-gray-400');
    });
});
