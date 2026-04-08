/** @vitest-environment jsdom */

import React, { act, useState } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import ComposerAdvancedSettingsDialog from '../components/ComposerAdvancedSettingsDialog';
import { MODEL_CAPABILITIES } from '../constants';
import type { GroundingMode, OutputFormat, StructuredOutputMode, ThinkingLevel } from '../types';
import { getTranslation } from '../utils/translations';

function AdvancedSettingsHarness() {
    const [isOpen, setIsOpen] = useState(true);
    const [outputFormat, setOutputFormat] = useState<OutputFormat>('images-only');
    const [structuredOutputMode, setStructuredOutputMode] = useState<StructuredOutputMode>('off');
    const [temperature, setTemperature] = useState(1);
    const [thinkingLevel, setThinkingLevel] = useState<ThinkingLevel>('disabled');
    const [groundingMode, setGroundingMode] = useState<GroundingMode>('off');

    return (
        <div>
            <div data-testid="committed-output-format">{outputFormat}</div>
            <div data-testid="committed-structured-output">{structuredOutputMode}</div>
            <div data-testid="committed-temperature">{temperature.toFixed(1)}</div>
            <div data-testid="committed-grounding-mode">{groundingMode}</div>
            <button data-testid="reopen-advanced-settings" type="button" onClick={() => setIsOpen(true)}>
                Reopen advanced settings
            </button>
            <ComposerAdvancedSettingsDialog
                prompt="Test prompt"
                placeholder="Type here"
                enterToSubmit={false}
                isGenerating={false}
                isEnhancingPrompt={false}
                currentLanguage="en"
                imageStyleLabel="None"
                modelLabel={getTranslation('en', 'modelGemini3Pro')}
                aspectRatio="1:1"
                imageSize="2K"
                batchSize={1}
                hasSizePicker={true}
                totalReferenceCount={0}
                objectCount={0}
                characterCount={0}
                maxObjects={4}
                maxCharacters={2}
                outputFormat={outputFormat}
                structuredOutputMode={structuredOutputMode}
                thinkingLevel={thinkingLevel}
                includeThoughts={true}
                groundingMode={groundingMode}
                imageModel="gemini-3-pro-image-preview"
                currentStageAsset={null}
                capability={MODEL_CAPABILITIES['gemini-3-pro-image-preview']}
                availableGroundingModes={['off', 'google-search']}
                temperature={temperature}
                isAdvancedSettingsOpen={isOpen}
                generateLabel="Generate"
                queuedJobs={[]}
                queueBatchModeSummary="Queued batch runs as a separate official job workflow."
                queueBatchConversationNotice="Official chat continuation stays out of queued batch mode."
                getImportedQueuedResultCount={() => 0}
                getImportedQueuedHistoryItems={() => []}
                activeImportedQueuedHistoryId={null}
                onPromptChange={() => {}}
                onToggleEnterToSubmit={() => {}}
                onGenerate={() => {}}
                onQueueBatchJob={() => {}}
                onOpenQueuedBatchJobs={() => {}}
                onCancelGeneration={() => {}}
                onStartNewConversation={() => {}}
                onFollowUpGenerate={() => {}}
                onSurpriseMe={() => {}}
                onSmartRewrite={() => {}}
                onOpenPromptHistory={() => {}}
                onOpenTemplates={() => {}}
                onOpenStyles={() => {}}
                onOpenSettings={() => {}}
                onToggleAdvancedSettings={() => {}}
                onOutputFormatChange={setOutputFormat}
                onStructuredOutputModeChange={setStructuredOutputMode}
                onTemperatureChange={setTemperature}
                onThinkingLevelChange={setThinkingLevel}
                onGroundingModeChange={setGroundingMode}
                onImportAllQueuedJobs={() => {}}
                onPollAllQueuedJobs={() => {}}
                onPollQueuedJob={() => {}}
                onCancelQueuedJob={() => {}}
                onImportQueuedJob={() => {}}
                onOpenImportedQueuedJob={() => {}}
                onOpenLatestImportedQueuedJob={() => {}}
                onOpenImportedQueuedHistoryItem={() => {}}
                onRemoveQueuedJob={() => {}}
                getStageOriginLabel={() => 'Generated'}
                getLineageActionLabel={() => 'Root'}
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
            />
        </div>
    );
}

describe('ComposerAdvancedSettingsDialog draft flow', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
    });

    const setSelectValue = (selector: string, value: string) => {
        const input = container.querySelector(selector) as HTMLSelectElement;

        act(() => {
            const valueSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
            valueSetter?.call(input, value);
            input.dispatchEvent(new Event('change', { bubbles: true }));
        });
    };

    const setInputValue = (selector: string, value: string) => {
        const input = container.querySelector(selector) as HTMLInputElement;

        act(() => {
            const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
            valueSetter?.call(input, value);
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        });
    };

    it('keeps advanced edits local until apply is pressed', () => {
        act(() => {
            root.render(<AdvancedSettingsHarness />);
        });

        setSelectValue('[data-testid="composer-advanced-output-format"]', 'images-and-text');
        setSelectValue('[data-testid="composer-advanced-structured-output-select"]', 'variation-compare');
        setInputValue('[data-testid="composer-advanced-temperature-input"]', '0.6');

        expect(container.querySelector('[data-testid="committed-output-format"]')?.textContent).toBe('images-only');
        expect(container.querySelector('[data-testid="committed-structured-output"]')?.textContent).toBe('off');
        expect(container.querySelector('[data-testid="committed-temperature"]')?.textContent).toBe('1.0');

        const applyButton = container.querySelector(
            '[data-testid="composer-advanced-settings-apply"]',
        ) as HTMLButtonElement;
        act(() => {
            applyButton.click();
        });

        expect(container.querySelector('[data-testid="composer-advanced-settings-dialog"]')).toBeNull();
        expect(container.querySelector('[data-testid="committed-output-format"]')?.textContent).toBe('images-and-text');
        expect(container.querySelector('[data-testid="committed-structured-output"]')?.textContent).toBe(
            'variation-compare',
        );
        expect(container.querySelector('[data-testid="committed-temperature"]')?.textContent).toBe('0.6');
    });

    it('treats backdrop and escape dismissals as cancel', () => {
        act(() => {
            root.render(<AdvancedSettingsHarness />);
        });

        setSelectValue('[data-testid="composer-advanced-output-format"]', 'images-and-text');
        setInputValue('[data-testid="composer-advanced-temperature-input"]', '0.4');

        const backdrop = container.querySelector('[data-testid="composer-advanced-settings-dialog"]') as HTMLDivElement;
        act(() => {
            backdrop.click();
        });

        expect(container.querySelector('[data-testid="composer-advanced-settings-dialog"]')).toBeNull();
        expect(container.querySelector('[data-testid="committed-output-format"]')?.textContent).toBe('images-only');
        expect(container.querySelector('[data-testid="committed-temperature"]')?.textContent).toBe('1.0');

        const reopenButton = container.querySelector('[data-testid="reopen-advanced-settings"]') as HTMLButtonElement;
        act(() => {
            reopenButton.click();
        });

        setSelectValue('[data-testid="composer-advanced-output-format"]', 'images-and-text');

        act(() => {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        });

        expect(container.querySelector('[data-testid="composer-advanced-settings-dialog"]')).toBeNull();
        expect(container.querySelector('[data-testid="committed-output-format"]')?.textContent).toBe('images-only');
    });

    it('removes the old generation footer switch', () => {
        act(() => {
            root.render(<AdvancedSettingsHarness />);
        });

        expect(container.querySelector('[data-testid="composer-advanced-settings-open-generation"]')).toBeNull();
    });

    it('renders the temperature guidance copy in the advanced settings body', () => {
        act(() => {
            root.render(<AdvancedSettingsHarness />);
        });

        expect(container.textContent).toContain(getTranslation('en', 'composerDefaultTemp').replace('{0}', '= 1.0'));
        expect(container.textContent).toContain(getTranslation('en', 'composerAdvancedTemperatureGuideHigher'));
        expect(container.textContent).toContain(getTranslation('en', 'composerAdvancedTemperatureGuideLower'));
        expect(container.textContent).not.toContain(getTranslation('en', 'composerAdvancedTemperatureGuideDefault'));
    });
});
