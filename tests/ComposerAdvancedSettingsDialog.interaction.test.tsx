/** @vitest-environment jsdom */

import { act, useState } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import ComposerAdvancedSettingsDialog from '../components/ComposerAdvancedSettingsDialog';
import { MODEL_CAPABILITIES } from '../constants';
import { DEFAULT_SAFETY_THRESHOLDS, type GroundingMode, type OutputFormat, type ThinkingLevel } from '../types';
import { formatTemperature, TEMPERATURE_STEP } from '../utils/temperature';
import { getTranslation } from '../utils/translations';

function AdvancedSettingsHarness() {
    const [isOpen, setIsOpen] = useState(true);
    const [outputFormat, setOutputFormat] = useState<OutputFormat>('images-only');
    const [temperature, setTemperature] = useState(1);
    const [thinkingLevel, setThinkingLevel] = useState<ThinkingLevel>('disabled');
    const [groundingMode, setGroundingMode] = useState<GroundingMode>('off');
    const [safetyThresholds, setSafetyThresholds] = useState(DEFAULT_SAFETY_THRESHOLDS);

    return (
        <div>
            <div data-testid="committed-output-format">{outputFormat}</div>
            <div data-testid="committed-temperature">{formatTemperature(temperature)}</div>
            <div data-testid="committed-grounding-mode">{groundingMode}</div>
            <div data-testid="committed-safety-harassment">{safetyThresholds.harassment}</div>
            <div data-testid="committed-safety-hate-speech">{safetyThresholds['hate-speech']}</div>
            <div data-testid="committed-safety-sexually-explicit">{safetyThresholds['sexually-explicit']}</div>
            <div data-testid="committed-safety-dangerous-content">{safetyThresholds['dangerous-content']}</div>
            <button data-testid="reopen-advanced-settings" type="button" onClick={() => setIsOpen(true)}>
                Reopen advanced settings
            </button>
            <ComposerAdvancedSettingsDialog
                currentLanguage="en"
                outputFormat={outputFormat}
                thinkingLevel={thinkingLevel}
                groundingMode={groundingMode}
                safetyThresholds={safetyThresholds}
                imageModel="gemini-3-pro-image"
                capability={MODEL_CAPABILITIES['gemini-3-pro-image']}
                availableGroundingModes={['off', 'google-search']}
                temperature={temperature}
                onOutputFormatChange={setOutputFormat}
                onTemperatureChange={setTemperature}
                onThinkingLevelChange={setThinkingLevel}
                onGroundingModeChange={setGroundingMode}
                onSafetyThresholdsChange={setSafetyThresholds}
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
        expect(input).toBeTruthy();

        act(() => {
            input.value = value;
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
        setInputValue('[data-testid="composer-advanced-temperature-input"]', '0.6');

        expect(container.querySelector('[data-testid="committed-output-format"]')?.textContent).toBe('images-only');
        expect(container.querySelector('[data-testid="committed-temperature"]')?.textContent).toBe('1.0');

        const applyButton = container.querySelector(
            '[data-testid="composer-advanced-settings-apply"]',
        ) as HTMLButtonElement;
        act(() => {
            applyButton.click();
        });

        expect(container.querySelector('[data-testid="composer-advanced-settings-dialog"]')).toBeNull();
        expect(container.querySelector('[data-testid="committed-output-format"]')?.textContent).toBe('images-and-text');
        expect(container.querySelector('[data-testid="committed-temperature"]')?.textContent).toBe('0.6');
    });

    it('keeps safety slider edits local until apply is pressed', () => {
        act(() => {
            root.render(<AdvancedSettingsHarness />);
        });

        const toggleButton = container.querySelector('[data-testid="composer-advanced-safety-toggle"]') as HTMLButtonElement;
        act(() => {
            toggleButton.click();
        });

        setInputValue('[data-testid="composer-advanced-safety-slider-harassment"]', '0');

        expect(container.querySelector('[data-testid="committed-safety-harassment"]')?.textContent).toBe('block-none');

        const applyButton = container.querySelector(
            '[data-testid="composer-advanced-settings-apply"]',
        ) as HTMLButtonElement;
        act(() => {
            applyButton.click();
        });

        expect(container.querySelector('[data-testid="committed-safety-harassment"]')?.textContent).toBe('default');
    });

    it('syncs all safety sliders locally while preserving individual overrides', () => {
        act(() => {
            root.render(<AdvancedSettingsHarness />);
        });

        const toggleButton = container.querySelector('[data-testid="composer-advanced-safety-toggle"]') as HTMLButtonElement;
        act(() => {
            toggleButton.click();
        });

        setInputValue('[data-testid="composer-advanced-safety-sync-slider"]', '5');

        expect((container.querySelector('[data-testid="composer-advanced-safety-slider-harassment"]') as HTMLInputElement).value).toBe('5');
        expect((container.querySelector('[data-testid="composer-advanced-safety-slider-hate-speech"]') as HTMLInputElement).value).toBe('5');
        expect((container.querySelector('[data-testid="composer-advanced-safety-slider-sexually-explicit"]') as HTMLInputElement).value).toBe('5');
        expect((container.querySelector('[data-testid="composer-advanced-safety-slider-dangerous-content"]') as HTMLInputElement).value).toBe('5');
        expect(container.querySelector('[data-testid="committed-safety-harassment"]')?.textContent).toBe('block-none');
        expect(container.querySelector('[data-testid="committed-safety-hate-speech"]')?.textContent).toBe('block-none');
        expect(container.querySelector('[data-testid="committed-safety-sexually-explicit"]')?.textContent).toBe('block-none');
        expect(container.querySelector('[data-testid="committed-safety-dangerous-content"]')?.textContent).toBe('block-none');

        setInputValue('[data-testid="composer-advanced-safety-slider-harassment"]', '0');

        expect(container.querySelector('[data-testid="composer-advanced-safety-sync-value"]')?.textContent).toBe(
            getTranslation('en', 'composerAdvancedSafetyMixed'),
        );

        const applyButton = container.querySelector(
            '[data-testid="composer-advanced-settings-apply"]',
        ) as HTMLButtonElement;
        act(() => {
            applyButton.click();
        });

        expect(container.querySelector('[data-testid="committed-safety-harassment"]')?.textContent).toBe('default');
        expect(container.querySelector('[data-testid="committed-safety-hate-speech"]')?.textContent).toBe(
            'block-low-and-above',
        );
        expect(container.querySelector('[data-testid="committed-safety-sexually-explicit"]')?.textContent).toBe(
            'block-low-and-above',
        );
        expect(container.querySelector('[data-testid="committed-safety-dangerous-content"]')?.textContent).toBe(
            'block-low-and-above',
        );
    });

    it('supports 0.05 temperature increments without rounding 1.05 to 1.1', () => {
        act(() => {
            root.render(<AdvancedSettingsHarness />);
        });

        const rangeInput = container.querySelector(
            '[data-testid="composer-advanced-temperature-range"]',
        ) as HTMLInputElement;
        const numberInput = container.querySelector(
            '[data-testid="composer-advanced-temperature-input"]',
        ) as HTMLInputElement;

        expect(rangeInput.getAttribute('step')).toBe(String(TEMPERATURE_STEP));
        expect(numberInput.getAttribute('step')).toBe(String(TEMPERATURE_STEP));

        setInputValue('[data-testid="composer-advanced-temperature-input"]', '1.05');

        const applyButton = container.querySelector(
            '[data-testid="composer-advanced-settings-apply"]',
        ) as HTMLButtonElement;
        act(() => {
            applyButton.click();
        });

        expect(container.querySelector('[data-testid="committed-temperature"]')?.textContent).toBe('1.05');
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

    it('renders the temperature guidance behind the original circular info trigger', () => {
        act(() => {
            root.render(<AdvancedSettingsHarness />);
        });

        expect(container.textContent).toContain(getTranslation('en', 'composerDefaultTemp').replace('{0}', '= 1.0'));
        expect(container.textContent).not.toContain(getTranslation('en', 'composerAdvancedGenerationSectionTitle'));
        expect(container.textContent).not.toContain(getTranslation('en', 'composerAdvancedGroundingSectionTitle'));
        expect(container.textContent).not.toContain(getTranslation('en', 'composerAdvancedGroundingGuideTitle'));
        expect(container.querySelector('[data-testid="composer-advanced-output-format-card"]')).toBeTruthy();
        expect(container.querySelector('[data-testid="composer-advanced-temperature-card"]')).toBeTruthy();
        expect(container.querySelector('[data-testid="composer-advanced-grounding-card"]')).toBeTruthy();
        expect(container.querySelector('[data-testid="composer-advanced-safety-sync-slider"]')).toBeNull();

        const secondaryColumn = container.querySelector(
            '[data-testid="composer-advanced-secondary-column"]',
        ) as HTMLDivElement;
        const groundingCard = container.querySelector('[data-testid="composer-advanced-grounding-card"]') as HTMLElement;
        const safetyCard = container.querySelector('[data-testid="composer-advanced-safety-card"]') as HTMLElement;

        expect(secondaryColumn.contains(groundingCard)).toBe(true);
        expect(secondaryColumn.contains(safetyCard)).toBe(true);
        expect(Boolean(groundingCard.compareDocumentPosition(safetyCard) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(
            true,
        );

        const trigger = container.querySelector(
            '[data-testid="composer-advanced-temperature-guide-hint-trigger"]',
        ) as HTMLButtonElement;
        const panel = container.querySelector(
            '[data-testid="composer-advanced-temperature-guide-hint"]',
        ) as HTMLDivElement;

        expect(trigger.getAttribute('aria-label')).toBe(getTranslation('en', 'groundingProvenanceInsightTemperature'));
        expect(trigger.textContent).toBe('');
        expect(panel.getAttribute('aria-hidden')).toBe('true');

        act(() => {
            trigger.click();
        });

        expect(panel.getAttribute('aria-hidden')).toBe('false');
        expect(panel.closest('[data-modal-floating-layer="true"]')).toBeTruthy();
        expect(panel.textContent).toContain(getTranslation('en', 'composerAdvancedTemperatureGuideHigher'));
        expect(panel.textContent).toContain(getTranslation('en', 'composerAdvancedTemperatureGuideLower'));
        expect(panel.textContent).not.toContain(getTranslation('en', 'composerAdvancedTemperatureGuideDefault'));
    });
});
