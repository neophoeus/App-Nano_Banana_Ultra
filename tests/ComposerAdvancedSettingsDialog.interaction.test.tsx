/** @vitest-environment jsdom */

import { act, useState } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import ComposerAdvancedSettingsDialog from '../components/ComposerAdvancedSettingsDialog';
import { MODEL_CAPABILITIES } from '../constants';
import { type GroundingMode, type OutputFormat, type ThinkingLevel } from '../types';
import { formatTemperature, TEMPERATURE_STEP } from '../utils/temperature';
import { getTranslation } from '../utils/translations';

function AdvancedSettingsHarness() {
    const [isOpen, setIsOpen] = useState(true);
    const [outputFormat, setOutputFormat] = useState<OutputFormat>('images-only');
    const [temperature, setTemperature] = useState(1);
    const [thinkingLevel, setThinkingLevel] = useState<ThinkingLevel>('disabled');
    const [groundingMode, setGroundingMode] = useState<GroundingMode>('off');

    return (
        <div>
            <div data-testid="committed-output-format">{outputFormat}</div>
            <div data-testid="committed-temperature">{formatTemperature(temperature)}</div>
            <div data-testid="committed-grounding-mode">{groundingMode}</div>
            <button data-testid="reopen-advanced-settings" type="button" onClick={() => setIsOpen(true)}>
                Reopen advanced settings
            </button>
            <ComposerAdvancedSettingsDialog
                currentLanguage="en"
                outputFormat={outputFormat}
                thinkingLevel={thinkingLevel}
                groundingMode={groundingMode}
                imageModel="gemini-3-pro-image"
                capability={MODEL_CAPABILITIES['gemini-3-pro-image']}
                availableGroundingModes={['off', 'google-search']}
                temperature={temperature}
                onOutputFormatChange={setOutputFormat}
                onTemperatureChange={setTemperature}
                onThinkingLevelChange={setThinkingLevel}
                onGroundingModeChange={setGroundingMode}
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

    it('renders the temperature guidance behind the original circular info trigger and omits safety card', () => {
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
        expect(container.querySelector('[data-testid="composer-advanced-safety-card"]')).toBeNull();

        const secondaryColumn = container.querySelector(
            '[data-testid="composer-advanced-secondary-column"]',
        ) as HTMLDivElement;
        const groundingCard = container.querySelector(
            '[data-testid="composer-advanced-grounding-card"]',
        ) as HTMLElement;

        expect(secondaryColumn.contains(groundingCard)).toBe(true);

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

    it('shows a warning alert if thinkingLevel is high and temperature is above 1.0', () => {
        act(() => {
            root.render(
                <ComposerAdvancedSettingsDialog
                    currentLanguage="en"
                    outputFormat="images-only"
                    thinkingLevel="high"
                    groundingMode="off"
                    imageModel="gemini-3.1-flash-image"
                    capability={MODEL_CAPABILITIES['gemini-3.1-flash-image']}
                    availableGroundingModes={['off', 'google-search']}
                    temperature={1.5}
                    onOutputFormatChange={() => {}}
                    onTemperatureChange={() => {}}
                    onThinkingLevelChange={() => {}}
                    onGroundingModeChange={() => {}}
                    isOpen={true}
                    onClose={() => {}}
                />,
            );
        });

        // Check that warning appears
        let warning = container.querySelector('[data-testid="composer-advanced-thinking-temp-warning"]');
        expect(warning).toBeTruthy();
        expect(warning?.textContent).toContain(getTranslation('en', 'composerAdvancedHighThinkingHighTempWarning'));

        // Re-render with temperature 1.0
        act(() => {
            root.render(
                <ComposerAdvancedSettingsDialog
                    currentLanguage="en"
                    outputFormat="images-only"
                    thinkingLevel="high"
                    groundingMode="off"
                    imageModel="gemini-3.1-flash-image"
                    capability={MODEL_CAPABILITIES['gemini-3.1-flash-image']}
                    availableGroundingModes={['off', 'google-search']}
                    temperature={1.0}
                    onOutputFormatChange={() => {}}
                    onTemperatureChange={() => {}}
                    onThinkingLevelChange={() => {}}
                    onGroundingModeChange={() => {}}
                    isOpen={true}
                    onClose={() => {}}
                />,
            );
        });

        // Warning should disappear
        warning = container.querySelector('[data-testid="composer-advanced-thinking-temp-warning"]');
        expect(warning).toBeFalsy();
    });
});
