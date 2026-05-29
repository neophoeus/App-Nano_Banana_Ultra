import type { AspectRatio, ImageModel, ImageSize } from '../../types';
import { buildGroundingToolConfig, deriveGroundingMode } from '../../utils/groundingMode';
import { MODEL_CAPABILITIES } from '../../utils/modelCapabilities';
import { normalizeTemperature } from '../../utils/temperature';
import {
    buildGeminiResponseModalities,
    buildSafetySettings,
    DEFAULT_SAFETY_THRESHOLDS,
    type SafetyThresholds,
    toGeminiThinkingLevel,
} from './geminiApiConfig';

type ImageGenerateBodyLike = {
    model?: string;
    aspectRatio?: string;
    imageSize?: string;
    outputFormat?: 'images-only' | 'images-and-text';
    temperature?: number;
    thinkingLevel?: 'disabled' | 'minimal' | 'high';
    includeThoughts?: boolean;
    googleSearch?: boolean;
    imageSearch?: boolean;
    safetyThresholds?: Partial<SafetyThresholds>;
};

type AppThinkingLevel = NonNullable<ImageGenerateBodyLike['thinkingLevel']>;

export function validateCapabilityRequest(model: string, body: ImageGenerateBodyLike): string | null {
    const capability = MODEL_CAPABILITIES[model as ImageModel];
    if (!capability) {
        return `Unsupported model: ${model}`;
    }

    const requestedFormat = body.outputFormat || 'images-only';
    if (!capability.outputFormats.includes(requestedFormat)) {
        return `${model} does not support output format ${requestedFormat}.`;
    }

    if (body.aspectRatio && !capability.supportedRatios.includes(body.aspectRatio as AspectRatio)) {
        return `${model} does not support aspect ratio ${body.aspectRatio}.`;
    }

    if (body.imageSize && !capability.supportedSizes.includes(body.imageSize as ImageSize)) {
        return `${model} does not support image size ${body.imageSize}.`;
    }

    const requestedThinking =
        body.thinkingLevel || (capability.thinkingLevels.includes('minimal') ? 'minimal' : 'disabled');
    if (!capability.thinkingLevels.includes(requestedThinking)) {
        return `${model} does not support thinking level ${requestedThinking}.`;
    }

    if (body.includeThoughts && !capability.supportsIncludeThoughts) {
        return `${model} does not support returning thoughts.`;
    }

    if (body.googleSearch && !capability.supportsGoogleSearch) {
        return `${model} does not support Google Search grounding.`;
    }

    if (body.imageSearch && !capability.supportsImageSearch) {
        return `${model} does not support grounded image search.`;
    }

    return null;
}

export function buildImageRequestConfig(
    model: string,
    body: ImageGenerateBodyLike,
): {
    requestConfig: Record<string, unknown>;
    resolvedResponseModalities: string[];
    groundingMode: ReturnType<typeof deriveGroundingMode>;
    effectiveThinkingLevel: AppThinkingLevel;
    shouldIncludeThoughts: boolean;
} {
    const imageConfig: Record<string, string> = {};
    if (body.aspectRatio) {
        imageConfig.aspectRatio = body.aspectRatio;
    }
    if (model !== 'gemini-2.5-flash-image' && body.imageSize) {
        imageConfig.imageSize = body.imageSize;
    }

    const requiresTextForGroundingMetadata = Boolean(body.imageSearch);
    const resolvedResponseModalities = buildGeminiResponseModalities(
        body.outputFormat,
        requiresTextForGroundingMetadata,
    );

    const requestConfig: Record<string, unknown> = {
        responseModalities: resolvedResponseModalities,
        imageConfig,
        temperature: typeof body.temperature === 'number' ? normalizeTemperature(body.temperature) : undefined,
    };

    const safetySettings = buildSafetySettings(body.safetyThresholds ?? DEFAULT_SAFETY_THRESHOLDS);
    if (safetySettings) {
        requestConfig.safetySettings = safetySettings;
    }

    const capability = MODEL_CAPABILITIES[model as ImageModel];
    const effectiveThinkingLevel: AppThinkingLevel =
        body.thinkingLevel || (model === 'gemini-3.1-flash-image' ? 'minimal' : 'disabled');
    const shouldIncludeThoughts = Boolean(body.includeThoughts) && capability.supportsIncludeThoughts;
    const geminiThinkingLevel = toGeminiThinkingLevel(effectiveThinkingLevel);
    if (geminiThinkingLevel || shouldIncludeThoughts) {
        requestConfig.thinkingConfig = {
            ...(geminiThinkingLevel ? { thinkingLevel: geminiThinkingLevel } : {}),
            includeThoughts: shouldIncludeThoughts,
        };
    }

    const groundingMode = deriveGroundingMode(Boolean(body.googleSearch), Boolean(body.imageSearch));
    const groundingTool = buildGroundingToolConfig(groundingMode);
    if (groundingTool) {
        requestConfig.tools = [groundingTool];
    }

    return {
        requestConfig,
        resolvedResponseModalities,
        groundingMode,
        effectiveThinkingLevel,
        shouldIncludeThoughts,
    };
}
