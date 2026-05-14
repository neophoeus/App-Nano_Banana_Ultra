import { HarmBlockThreshold, HarmCategory, Modality, ThinkingLevel } from '@google/genai/node';

type OutputFormat = 'images-only' | 'images-and-text';
type AppThinkingLevel = 'disabled' | 'minimal' | 'high';

export const PERMISSIVE_SAFETY_SETTINGS = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

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