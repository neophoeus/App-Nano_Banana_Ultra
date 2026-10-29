import type { ImageModel, OptimizationMode, PromptThinkingLevel, ThinkingLevel } from '../types';
import { MODEL_CAPABILITIES } from './modelCapabilities';

export const OPTIMIZATION_MODE_STORAGE_KEY = 'nbu_optimization_mode';
export const DEFAULT_OPTIMIZATION_MODE: OptimizationMode = 'quality';
export const ECO_MAX_CONVERSATION_TURNS = 2;
export const QUALITY_IMAGE_TO_PROMPT_MAX_DIMENSION = 3072;
export const ECO_IMAGE_TO_PROMPT_MAX_DIMENSION = 2048;

export function normalizeOptimizationMode(value: unknown): OptimizationMode {
    return value === 'eco' ? 'eco' : 'quality';
}

export function resolveEffectiveGenerationThinking(
    modelOrParams:
        | {
              model?: string | null;
              thinkingLevel?: ThinkingLevel | null;
              includeThoughts?: boolean | null;
              optimizationMode?: OptimizationMode | string | null;
          }
        | string
        | null
        | undefined,
    thinkingLevel?: ThinkingLevel | null,
    includeThoughts?: boolean | null,
    optimizationMode?: OptimizationMode | string | null,
): {
    thinkingLevel: ThinkingLevel;
    includeThoughts: boolean;
} {
    const isObject = typeof modelOrParams === 'object' && modelOrParams !== null;
    const resolvedModel = isObject ? modelOrParams.model : modelOrParams;
    const resolvedThinkingLevel = isObject ? modelOrParams.thinkingLevel : thinkingLevel;
    const resolvedIncludeThoughts = isObject ? modelOrParams.includeThoughts : includeThoughts;
    const resolvedOptimizationMode = isObject ? modelOrParams.optimizationMode : optimizationMode;

    const mode = normalizeOptimizationMode(resolvedOptimizationMode);
    const model = (resolvedModel?.trim() || '') as ImageModel;
    const capability = MODEL_CAPABILITIES[model];
    const availableThinkingLevels: ThinkingLevel[] = capability?.thinkingLevels || ['disabled'];

    if (mode === 'eco') {
        const ecoThinkingLevel: ThinkingLevel = availableThinkingLevels.includes('minimal')
            ? 'minimal'
            : availableThinkingLevels.includes('disabled')
              ? 'disabled'
              : availableThinkingLevels[0] || 'disabled';

        return {
            thinkingLevel: ecoThinkingLevel,
            includeThoughts: false,
        };
    }

    const defaultThinking: ThinkingLevel = availableThinkingLevels.includes('medium')
        ? 'medium'
        : availableThinkingLevels.includes('minimal')
          ? 'minimal'
          : 'disabled';

    const requestedThinking = resolvedThinkingLevel || defaultThinking;
    const effectiveThinkingLevel = availableThinkingLevels.includes(requestedThinking)
        ? requestedThinking
        : defaultThinking;

    const supportsInclude = Boolean(capability?.supportsIncludeThoughts);
    const effectiveIncludeThoughts = Boolean(resolvedIncludeThoughts) && supportsInclude;

    return {
        thinkingLevel: effectiveThinkingLevel,
        includeThoughts: effectiveIncludeThoughts,
    };
}

export function resolveEffectivePromptThinkingLevel(
    thinkingLevel?: PromptThinkingLevel | null,
    optimizationMode?: OptimizationMode | string | null,
): PromptThinkingLevel {
    const mode = normalizeOptimizationMode(optimizationMode);
    if (mode === 'eco') {
        return 'low';
    }

    if (thinkingLevel === 'high' || thinkingLevel === 'medium' || thinkingLevel === 'low') {
        return thinkingLevel;
    }

    return 'low';
}

export function resolveImageToPromptMaxDimension(optimizationMode?: OptimizationMode | string | null): number {
    const mode = normalizeOptimizationMode(optimizationMode);
    return mode === 'eco' ? ECO_IMAGE_TO_PROMPT_MAX_DIMENSION : QUALITY_IMAGE_TO_PROMPT_MAX_DIMENSION;
}
