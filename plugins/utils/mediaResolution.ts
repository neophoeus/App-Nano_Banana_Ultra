import type {
    ImageModel,
    ImageSize,
    MediaResolutionRole,
    PartMediaResolutionLevelValue,
    TokenUsageMetadata,
} from '../../types';
import { MODEL_CAPABILITIES } from '../../utils/modelCapabilities';
import type { ResolvedInlineImage } from './imageReferences';

export type PartMediaResolutionPayload = {
    level: PartMediaResolutionLevelValue;
};

export const PART_MEDIA_RESOLUTION_LEVEL: Record<string, PartMediaResolutionLevelValue> = {
    UNSPECIFIED: 'MEDIA_RESOLUTION_UNSPECIFIED',
    LOW: 'MEDIA_RESOLUTION_LOW',
    MEDIUM: 'MEDIA_RESOLUTION_MEDIUM',
    HIGH: 'MEDIA_RESOLUTION_HIGH',
    ULTRA_HIGH: 'MEDIA_RESOLUTION_ULTRA_HIGH',
};

const EXTRA_SUPPORTED_PER_PART_MODELS = new Set<string>(['gemini-3.8-flash', 'gemini-4-argon']);

export function supportsModelPerPartMediaResolution(model?: string | null): boolean {
    if (!model || typeof model !== 'string') {
        return false;
    }

    const trimmed = model.trim();
    if (!trimmed) {
        return false;
    }

    if (EXTRA_SUPPORTED_PER_PART_MODELS.has(trimmed)) {
        return true;
    }

    const normalizedModel = trimmed.replace(/-preview$/i, '') as ImageModel;
    const capability = MODEL_CAPABILITIES[normalizedModel];
    if (capability && typeof capability.supportsPerPartMediaResolution === 'boolean') {
        return capability.supportsPerPartMediaResolution;
    }

    // Default to false for legacy models like gemini-2.5-flash-image
    if (normalizedModel === 'gemini-2.5-flash-image') {
        return false;
    }

    // Gemini 3 and Gemini 4 family models support per-part media resolution
    return /^(gemini-3|gemini-4|gemini-nano-banana-2)/i.test(normalizedModel);
}

export function resolveRoleMediaResolution(params: {
    model?: string | null;
    role: MediaResolutionRole;
    imageSize?: ImageSize | string | null;
}): PartMediaResolutionPayload | undefined {
    if (!supportsModelPerPartMediaResolution(params.model)) {
        return undefined;
    }

    const normalizedSize = params.imageSize === '512px' ? '512' : params.imageSize;

    switch (params.role) {
        case 'character':
        case 'forensic-prompt':
            return { level: PART_MEDIA_RESOLUTION_LEVEL.ULTRA_HIGH };

        case 'edit':
        case 'source':
            return normalizedSize === '4K'
                ? { level: PART_MEDIA_RESOLUTION_LEVEL.ULTRA_HIGH }
                : { level: PART_MEDIA_RESOLUTION_LEVEL.HIGH };

        case 'object':
        case 'history-anchor':
            return { level: PART_MEDIA_RESOLUTION_LEVEL.HIGH };

        case 'style':
        case 'history-decay':
            return { level: PART_MEDIA_RESOLUTION_LEVEL.MEDIUM };

        case 'video':
            return { level: PART_MEDIA_RESOLUTION_LEVEL.LOW };

        default:
            return { level: PART_MEDIA_RESOLUTION_LEVEL.HIGH };
    }
}

export function isSameInlineImage(
    left: ResolvedInlineImage | null | undefined,
    right: ResolvedInlineImage | null | undefined,
): boolean {
    if (!left || !right || typeof left.data !== 'string' || typeof right.data !== 'string') {
        return false;
    }

    if (left.mimeType && right.mimeType && left.mimeType !== right.mimeType) {
        return false;
    }

    if (left.data.length !== right.data.length) {
        return false;
    }

    return left.data === right.data;
}

export function promptReferencesTag(prompt: string | undefined | null, tag: string): boolean {
    if (typeof prompt !== 'string' || !prompt.trim() || !tag) {
        return false;
    }

    return prompt.includes(tag);
}

function parseTokenCount(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.max(0, Math.floor(value));
    }
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
            return Math.max(0, Math.floor(parsed));
        }
    }
    return 0;
}

export function extractUsageMetadata(response: unknown): TokenUsageMetadata | null {
    if (!response || typeof response !== 'object') {
        return null;
    }

    const candidate = response as Record<string, unknown>;
    const unwrapped =
        candidate.response && typeof candidate.response === 'object'
            ? (candidate.response as Record<string, unknown>)
            : candidate;

    const raw = (unwrapped.usageMetadata ?? unwrapped.usage_metadata) as Record<string, unknown> | undefined;
    if (!raw || typeof raw !== 'object') {
        return null;
    }

    const promptTokenCount = parseTokenCount(raw.promptTokenCount ?? raw.prompt_token_count);
    const candidatesTokenCount = parseTokenCount(raw.candidatesTokenCount ?? raw.candidates_token_count);
    const thoughtsTokenCount = parseTokenCount(raw.thoughtsTokenCount ?? raw.thoughts_token_count);
    const totalTokenCount = parseTokenCount(raw.totalTokenCount ?? raw.total_token_count);
    const cachedContentTokenCount = parseTokenCount(raw.cachedContentTokenCount ?? raw.cached_content_token_count);

    if (
        promptTokenCount === 0 &&
        candidatesTokenCount === 0 &&
        thoughtsTokenCount === 0 &&
        totalTokenCount === 0 &&
        cachedContentTokenCount === 0
    ) {
        return null;
    }

    return {
        promptTokenCount,
        candidatesTokenCount,
        thoughtsTokenCount,
        totalTokenCount: totalTokenCount || promptTokenCount + candidatesTokenCount + thoughtsTokenCount,
        cachedContentTokenCount,
    };
}
