import { HarmBlockThreshold, HarmCategory, Modality, ThinkingLevel } from '@google/genai/node';
import {
    DEFAULT_SAFETY_THRESHOLDS,
    SAFETY_CATEGORY_KEYS,
    type OutputFormat,
    type SafetyCategoryKey,
    type SafetyThresholdKey,
    type SafetyThresholds,
    type ThinkingLevel as AppThinkingLevel,
} from '../../types';

export { DEFAULT_SAFETY_THRESHOLDS, SAFETY_CATEGORY_KEYS, SAFETY_THRESHOLD_KEYS } from '../../types';
export type { SafetyCategoryKey, SafetyThresholdKey, SafetyThresholds } from '../../types';

const GEMINI_SAFETY_CATEGORY_MAP: Record<SafetyCategoryKey, HarmCategory> = {
    harassment: HarmCategory.HARM_CATEGORY_HARASSMENT,
    'hate-speech': HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    'sexually-explicit': HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    'dangerous-content': HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
};

const GEMINI_SAFETY_THRESHOLD_MAP: Record<Exclude<SafetyThresholdKey, 'default'>, HarmBlockThreshold> = {
    off: HarmBlockThreshold.OFF,
    'block-none': HarmBlockThreshold.BLOCK_NONE,
    'block-only-high': HarmBlockThreshold.BLOCK_ONLY_HIGH,
    'block-medium-and-above': HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    'block-low-and-above': HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
};

export function buildSafetySettings(
    thresholds: Partial<SafetyThresholds> | null | undefined,
): Array<{ category: HarmCategory; threshold: HarmBlockThreshold }> | undefined {
    const resolvedThresholds: Partial<SafetyThresholds> = thresholds || {};
    const safetySettings = SAFETY_CATEGORY_KEYS.flatMap((categoryKey) => {
        const thresholdKey = resolvedThresholds[categoryKey];
        if (!thresholdKey || thresholdKey === 'default') {
            return [];
        }

        return [
            {
                category: GEMINI_SAFETY_CATEGORY_MAP[categoryKey],
                threshold: GEMINI_SAFETY_THRESHOLD_MAP[thresholdKey],
            },
        ];
    });

    return safetySettings.length > 0 ? safetySettings : undefined;
}

export const PERMISSIVE_SAFETY_SETTINGS = buildSafetySettings(DEFAULT_SAFETY_THRESHOLDS) || [];

export function toGeminiThinkingLevel(thinkingLevel: AppThinkingLevel): ThinkingLevel | undefined {
    switch (thinkingLevel) {
        case 'minimal':
            return ThinkingLevel.MINIMAL;
        case 'high':
            return ThinkingLevel.HIGH;
        default:
            return undefined;
    }
}

export function buildGeminiResponseModalities(
    outputFormat: OutputFormat | undefined,
    requiresTextResponse: boolean,
): string[] {
    if (outputFormat === 'images-and-text' || requiresTextResponse) {
        return [Modality.IMAGE, Modality.TEXT];
    }

    return [Modality.IMAGE];
}
