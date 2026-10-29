import type { AspectRatio, ImageModel, ImageSize, OptimizationMode } from '../../types';
import { buildGroundingToolConfig, deriveGroundingMode } from '../../utils/groundingMode';
import { MODEL_CAPABILITIES } from '../../utils/modelCapabilities';
import { resolveEffectiveGenerationThinking } from '../../utils/optimizationMode';
import { normalizeTemperature } from '../../utils/temperature';
import { buildGeminiResponseModalities, toGeminiThinkingLevel } from './geminiApiConfig';

type ImageGenerateBodyLike = {
    model?: string;
    aspectRatio?: string;
    imageSize?: string;
    styleImageInputs?: string[];
    videoInput?: string;
    outputFormat?: 'images-only' | 'images-and-text';
    temperature?: number;
    thinkingLevel?: 'disabled' | 'minimal' | 'medium' | 'high';
    includeThoughts?: boolean;
    googleSearch?: boolean;
    imageSearch?: boolean;
    optimizationMode?: OptimizationMode | string | null;
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

    const normalizedSize = body.imageSize === '512px' ? '512' : body.imageSize;
    if (normalizedSize && !capability.supportedSizes.includes(normalizedSize as ImageSize)) {
        return `${model} does not support image size ${body.imageSize}.`;
    }

    if (body.styleImageInputs && body.styleImageInputs.length > 0) {
        if (capability.maxStyles === 0) {
            return `${model} does not support style reference images.`;
        }
        if (body.styleImageInputs.length > capability.maxStyles) {
            return `${model} supports up to ${capability.maxStyles} style reference images.`;
        }
    }

    if (body.videoInput && !capability.supportsVideo) {
        return `${model} does not support video inputs.`;
    }

    const requestedThinking =
        body.thinkingLevel ||
        (capability.thinkingLevels.includes('medium')
            ? 'medium'
            : capability.thinkingLevels.includes('minimal')
              ? 'minimal'
              : 'disabled');
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
        imageConfig.imageSize = body.imageSize === '512' ? '512px' : body.imageSize;
    }

    const requiresTextForGroundingMetadata = Boolean(body.imageSearch);
    const resolvedResponseModalities = buildGeminiResponseModalities(
        body.outputFormat,
        requiresTextForGroundingMetadata,
    );

    const capability = MODEL_CAPABILITIES[model as ImageModel];
    const supportsTemperature = capability ? capability.supportsTemperature : true;

    const requestConfig: Record<string, unknown> = {
        responseModalities: resolvedResponseModalities,
        imageConfig,
        ...(supportsTemperature && typeof body.temperature === 'number'
            ? { temperature: normalizeTemperature(body.temperature) }
            : {}),
    };

    const effectiveThinking = resolveEffectiveGenerationThinking({
        model,
        thinkingLevel: body.thinkingLevel,
        includeThoughts: body.includeThoughts,
        optimizationMode: body.optimizationMode,
    });
    const effectiveThinkingLevel: AppThinkingLevel = effectiveThinking.thinkingLevel;
    const shouldIncludeThoughts = effectiveThinking.includeThoughts;
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
