import { Modality, ThinkingLevel } from '@google/genai/node';
import {
    type OutputFormat,
    type ThinkingLevel as AppThinkingLevel,
} from '../../types';

export function toGeminiThinkingLevel(thinkingLevel: AppThinkingLevel): ThinkingLevel | undefined {
    switch (thinkingLevel) {
        case 'minimal':
            return ThinkingLevel.MINIMAL;
        case 'medium':
            return ThinkingLevel.MEDIUM;
        case 'high':
            return ThinkingLevel.HIGH;
        default:
            return undefined;
    }
}

export function toPromptGeminiThinkingLevel(thinkingLevel?: string): ThinkingLevel {
    switch (thinkingLevel) {
        case 'medium':
            return ThinkingLevel.MEDIUM;
        case 'high':
            return ThinkingLevel.HIGH;
        case 'low':
        default:
            return ThinkingLevel.LOW;
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
