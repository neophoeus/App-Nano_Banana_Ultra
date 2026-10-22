/**
 * Google AI Studio Shared Compute Pool & Adaptive Pacing Management.
 *
 * In Google AI Studio Build mode / app previews, requests are dispatched via
 * the project's GEMINI_API_KEY to standard Gemini API endpoints.
 * Quotas (RPM / TPM / RPD) are enforced at the Google Cloud Project Usage Tier level
 * and shared dynamic compute pool, with no differentiation between consumer
 * Google One AI Pro / Ultra (5x / 20x) subscription tiers.
 *
 * This module provides:
 * 1. Unified baseline model pacing & adaptive workload delay calculations.
 * 2. Deep Error Packet Inspection (inspectGeminiErrorPacket) for QuotaFailure,
 *    ErrorInfo, RetryInfo, and HTTP status classification.
 * 3. Shared Compute Pool state management & reactive subscriptions.
 */

import { useSyncExternalStore } from 'react';

export type GeminiErrorCategory =
    | 'daily_quota_exhausted'
    | 'transient_rate_limit'
    | 'pool_congestion'
    | 'transient_auth'
    | 'non_retryable_policy'
    | 'transient_network';

export type RetryStrategyKind =
    | 'abort_no_retry'
    | 'server_directed_cooldown'
    | 'adaptive_leaky_bucket_backoff'
    | 'congestion_desync_backoff'
    | 'fast_auth_sync'
    | 'standard_exponential';

export type ComputePoolHealthLevel = 'healthy' | 'throttled' | 'congested' | 'exhausted';

export interface QuotaViolationDetail {
    quotaMetric?: string;
    quotaId?: string;
    quotaValue?: string | number;
    subject?: string;
    description?: string;
    dimensions?: Record<string, string>;
}

export interface DeepErrorPacketAnalysis {
    category: GeminiErrorCategory;
    strategy: RetryStrategyKind;
    shouldRetry: boolean;
    httpStatus: number | null;
    rpcStatus: string | null;
    errorReason: string | null;
    errorDomain: string | null;
    quotaMetric: string | null;
    quotaId: string | null;
    quotaLimitValue: string | null;
    violations: QuotaViolationDetail[];
    extractedRetryDelayMs: number | null;
    recommendedWaitMs: number;
    backoffMultiplier: number;
    maxRetriesOverride?: number;
    poolImpact: ComputePoolHealthLevel;
    rawSummary: string;
}

export interface ComputePoolStatusSnapshot {
    level: ComputePoolHealthLevel;
    pacingMultiplier: number;
    activeCooldownUntil: number;
    activeModel: string | null;
    consecutiveSuccesses: number;
    recentRateLimitCount: number;
    recentCongestionCount: number;
    dailyQuotaExhausted: boolean;
    lastErrorAnalysis: DeepErrorPacketAnalysis | null;
    lastUpdatedAt: number;
}

export interface PacingWorkloadContext {
    imageSize?: string;
    hasReferenceImages?: boolean;
    includeThoughts?: boolean;
}

// Deprecated legacy tier types retained for backward compatibility
export type AiStudioSubscriptionTier = 'pro' | 'ultra_5x' | 'ultra_20x';

export interface AiStudioTierPacingConfig {
    readonly tier: AiStudioSubscriptionTier;
    readonly labelKey: string;
    readonly quotaMultiplier: number;
    readonly proImagePacingMs: number;
    readonly flashImagePacingMs: number;
    readonly promptToolsPacingMs: number;
    readonly default429ProBackoffMs: number;
    readonly default429FlashBackoffMs: number;
    readonly default429TextBackoffMs: number;
}

export const AI_STUDIO_TIER_STORAGE_KEY = 'nbu_ai_studio_subscription_tier';
export const COMPUTE_POOL_STATUS_STORAGE_KEY = 'nbu_compute_pool_status_v1';

export const AI_STUDIO_UNIFIED_PACING_CONFIG = {
    proImagePacingMs: 6000,
    flashImagePacingMs: 3500,
    promptToolsPacingMs: 1000,
    default429ProBackoffMs: 20000,
    default429FlashBackoffMs: 12000,
    default429TextBackoffMs: 6000,
    leakyBucketSafetyMarginMs: 2500,
} as const;

// Legacy tier configs mapped to unified values to eliminate arbitrary tier penalties
export const AI_STUDIO_TIER_CONFIGS: Record<AiStudioSubscriptionTier, AiStudioTierPacingConfig> = {
    pro: {
        tier: 'pro',
        labelKey: 'aiStudioTierPro',
        quotaMultiplier: 1,
        proImagePacingMs: AI_STUDIO_UNIFIED_PACING_CONFIG.proImagePacingMs,
        flashImagePacingMs: AI_STUDIO_UNIFIED_PACING_CONFIG.flashImagePacingMs,
        promptToolsPacingMs: AI_STUDIO_UNIFIED_PACING_CONFIG.promptToolsPacingMs,
        default429ProBackoffMs: AI_STUDIO_UNIFIED_PACING_CONFIG.default429ProBackoffMs,
        default429FlashBackoffMs: AI_STUDIO_UNIFIED_PACING_CONFIG.default429FlashBackoffMs,
        default429TextBackoffMs: AI_STUDIO_UNIFIED_PACING_CONFIG.default429TextBackoffMs,
    },
    ultra_5x: {
        tier: 'ultra_5x',
        labelKey: 'aiStudioTierUltra5x',
        quotaMultiplier: 1,
        proImagePacingMs: AI_STUDIO_UNIFIED_PACING_CONFIG.proImagePacingMs,
        flashImagePacingMs: AI_STUDIO_UNIFIED_PACING_CONFIG.flashImagePacingMs,
        promptToolsPacingMs: AI_STUDIO_UNIFIED_PACING_CONFIG.promptToolsPacingMs,
        default429ProBackoffMs: AI_STUDIO_UNIFIED_PACING_CONFIG.default429ProBackoffMs,
        default429FlashBackoffMs: AI_STUDIO_UNIFIED_PACING_CONFIG.default429FlashBackoffMs,
        default429TextBackoffMs: AI_STUDIO_UNIFIED_PACING_CONFIG.default429TextBackoffMs,
    },
    ultra_20x: {
        tier: 'ultra_20x',
        labelKey: 'aiStudioTierUltra20x',
        quotaMultiplier: 1,
        proImagePacingMs: AI_STUDIO_UNIFIED_PACING_CONFIG.proImagePacingMs,
        flashImagePacingMs: AI_STUDIO_UNIFIED_PACING_CONFIG.flashImagePacingMs,
        promptToolsPacingMs: AI_STUDIO_UNIFIED_PACING_CONFIG.promptToolsPacingMs,
        default429ProBackoffMs: AI_STUDIO_UNIFIED_PACING_CONFIG.default429ProBackoffMs,
        default429FlashBackoffMs: AI_STUDIO_UNIFIED_PACING_CONFIG.default429FlashBackoffMs,
        default429TextBackoffMs: AI_STUDIO_UNIFIED_PACING_CONFIG.default429TextBackoffMs,
    },
};

const tierListeners = new Set<(tier: AiStudioSubscriptionTier) => void>();
const computePoolListeners = new Set<(snapshot: ComputePoolStatusSnapshot) => void>();

export const getStoredAiStudioSubscriptionTier = (): AiStudioSubscriptionTier => {
    if (typeof window === 'undefined') {
        return 'pro';
    }

    try {
        const stored = window.localStorage.getItem(AI_STUDIO_TIER_STORAGE_KEY);
        if (stored === 'pro' || stored === 'ultra_5x' || stored === 'ultra_20x') {
            return stored;
        }
    } catch {
        // Ignore storage access errors.
    }

    return 'pro';
};

let currentTier: AiStudioSubscriptionTier = getStoredAiStudioSubscriptionTier();

export const setStoredAiStudioSubscriptionTier = (tier: AiStudioSubscriptionTier): void => {
    currentTier = tier;
    if (typeof window !== 'undefined') {
        try {
            window.localStorage.setItem(AI_STUDIO_TIER_STORAGE_KEY, tier);
        } catch {
            // Ignore storage write errors.
        }
    }

    tierListeners.forEach((listener) => {
        try {
            listener(currentTier);
        } catch {
            // Ignore listener errors.
        }
    });
};

export const subscribeAiStudioSubscriptionTier = (
    listener: (tier: AiStudioSubscriptionTier) => void,
): (() => void) => {
    tierListeners.add(listener);
    return () => {
        tierListeners.delete(listener);
    };
};

export const getAiStudioTierPacingConfig = (
    _tier: AiStudioSubscriptionTier = getStoredAiStudioSubscriptionTier(),
): AiStudioTierPacingConfig => {
    return AI_STUDIO_TIER_CONFIGS.pro;
};

export const isProModel = (model?: string): boolean => {
    const normalized = (model || '').toLowerCase();
    return normalized.includes('pro') && !normalized.includes('flash');
};

export const isImageModel = (model?: string): boolean => {
    const normalized = (model || '').toLowerCase();
    return normalized.includes('image') || normalized.includes('imagen') || normalized.includes('banana');
};

export const getModelPacingDelayMs = (model?: string, _legacyTier?: string): number => {
    if (isProModel(model)) {
        return AI_STUDIO_UNIFIED_PACING_CONFIG.proImagePacingMs;
    }
    if (isImageModel(model)) {
        return AI_STUDIO_UNIFIED_PACING_CONFIG.flashImagePacingMs;
    }
    return AI_STUDIO_UNIFIED_PACING_CONFIG.promptToolsPacingMs;
};

export const getModelDefault429BackoffMs = (model?: string, _legacyTier?: string): number => {
    if (isProModel(model)) {
        return AI_STUDIO_UNIFIED_PACING_CONFIG.default429ProBackoffMs;
    }
    if (isImageModel(model)) {
        return AI_STUDIO_UNIFIED_PACING_CONFIG.default429FlashBackoffMs;
    }
    return AI_STUDIO_UNIFIED_PACING_CONFIG.default429TextBackoffMs;
};

export const getUnified429SafetyMarginMs = (): number => {
    return AI_STUDIO_UNIFIED_PACING_CONFIG.leakyBucketSafetyMarginMs;
};

export const getTier429SafetyMarginMs = (_legacyTier?: string): number => {
    return getUnified429SafetyMarginMs();
};

// ---------------------------------------------------------------------------
// Compute Pool State Management
// ---------------------------------------------------------------------------

const createInitialComputePoolSnapshot = (): ComputePoolStatusSnapshot => ({
    level: 'healthy',
    pacingMultiplier: 1.0,
    activeCooldownUntil: 0,
    activeModel: null,
    consecutiveSuccesses: 0,
    recentRateLimitCount: 0,
    recentCongestionCount: 0,
    dailyQuotaExhausted: false,
    lastErrorAnalysis: null,
    lastUpdatedAt: Date.now(),
});

let currentComputePoolSnapshot: ComputePoolStatusSnapshot = (() => {
    if (typeof window === 'undefined') {
        return createInitialComputePoolSnapshot();
    }
    try {
        const raw = window.localStorage.getItem(COMPUTE_POOL_STATUS_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            const now = Date.now();
            if (parsed && typeof parsed === 'object') {
                const cooldown = Number(parsed.activeCooldownUntil) || 0;
                // Self-healing: if cooldown expired or corrupted (> 180s in future), reset to healthy
                const isCooldownValid = cooldown > now && cooldown < now + 180000;
                return {
                    level: isCooldownValid ? (parsed.level || 'throttled') : 'healthy',
                    pacingMultiplier: isCooldownValid ? (Number(parsed.pacingMultiplier) || 1.5) : 1.0,
                    activeCooldownUntil: isCooldownValid ? cooldown : 0,
                    activeModel: parsed.activeModel || null,
                    consecutiveSuccesses: Number(parsed.consecutiveSuccesses) || 0,
                    recentRateLimitCount: Number(parsed.recentRateLimitCount) || 0,
                    recentCongestionCount: Number(parsed.recentCongestionCount) || 0,
                    dailyQuotaExhausted: Boolean(parsed.dailyQuotaExhausted && isCooldownValid),
                    lastErrorAnalysis: parsed.lastErrorAnalysis || null,
                    lastUpdatedAt: Number(parsed.lastUpdatedAt) || now,
                };
            }
        }
    } catch {
        // Ignore read errors
    }
    return createInitialComputePoolSnapshot();
})();

const persistComputePoolStatus = (snapshot: ComputePoolStatusSnapshot): void => {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(COMPUTE_POOL_STATUS_STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
        // Ignore write errors
    }
};

const notifyComputePoolListeners = (): void => {
    computePoolListeners.forEach((listener) => {
        try {
            listener(currentComputePoolSnapshot);
        } catch (error) {
            console.error('[ComputePoolStatus] Listener error:', error);
        }
    });
};

export const getComputePoolStatus = (): ComputePoolStatusSnapshot => {
    const now = Date.now();
    // Auto-decay if cooldown expired and we were throttled/congested
    if (
        currentComputePoolSnapshot.activeCooldownUntil > 0 &&
        currentComputePoolSnapshot.activeCooldownUntil <= now &&
        (currentComputePoolSnapshot.level === 'throttled' || currentComputePoolSnapshot.level === 'congested')
    ) {
        currentComputePoolSnapshot = {
            ...currentComputePoolSnapshot,
            level: 'healthy',
            pacingMultiplier: 1.0,
            activeCooldownUntil: 0,
            lastUpdatedAt: now,
        };
        persistComputePoolStatus(currentComputePoolSnapshot);
    }
    return currentComputePoolSnapshot;
};

export const getComputePoolPacingMultiplier = (): number => {
    const status = getComputePoolStatus();
    switch (status.level) {
        case 'congested':
            return 1.8;
        case 'throttled':
            return 1.5;
        case 'exhausted':
            return 2.0;
        case 'healthy':
        default:
            return 1.0;
    }
};

export const recordComputePoolError = (
    analysis: DeepErrorPacketAnalysis,
    model?: string,
    cooldownUntil?: number,
): ComputePoolStatusSnapshot => {
    const now = Date.now();
    const effectiveCooldownUntil = cooldownUntil && cooldownUntil > now ? cooldownUntil : 0;
    const isDaily = analysis.category === 'daily_quota_exhausted';
    const isCongestion = analysis.category === 'pool_congestion';
    const isRateLimit = analysis.category === 'transient_rate_limit';

    let nextLevel: ComputePoolHealthLevel = 'healthy';
    let nextMultiplier = 1.0;

    if (isDaily) {
        nextLevel = 'exhausted';
        nextMultiplier = 2.0;
    } else if (isCongestion) {
        nextLevel = 'congested';
        nextMultiplier = 1.8;
    } else if (isRateLimit) {
        nextLevel = 'throttled';
        nextMultiplier = 1.5;
    } else {
        nextLevel = currentComputePoolSnapshot.level;
        nextMultiplier = currentComputePoolSnapshot.pacingMultiplier;
    }

    currentComputePoolSnapshot = {
        level: nextLevel,
        pacingMultiplier: nextMultiplier,
        activeCooldownUntil: Math.max(currentComputePoolSnapshot.activeCooldownUntil, effectiveCooldownUntil),
        activeModel: model || currentComputePoolSnapshot.activeModel,
        consecutiveSuccesses: 0,
        recentRateLimitCount: currentComputePoolSnapshot.recentRateLimitCount + (isRateLimit ? 1 : 0),
        recentCongestionCount: currentComputePoolSnapshot.recentCongestionCount + (isCongestion ? 1 : 0),
        dailyQuotaExhausted: isDaily || currentComputePoolSnapshot.dailyQuotaExhausted,
        lastErrorAnalysis: analysis,
        lastUpdatedAt: now,
    };

    persistComputePoolStatus(currentComputePoolSnapshot);
    notifyComputePoolListeners();
    return currentComputePoolSnapshot;
};

export const recordComputePoolSuccess = (model?: string): ComputePoolStatusSnapshot => {
    const now = Date.now();
    const consecutive = currentComputePoolSnapshot.consecutiveSuccesses + 1;
    const isCooling = currentComputePoolSnapshot.activeCooldownUntil > now;

    let nextLevel = currentComputePoolSnapshot.level;
    let nextMultiplier = currentComputePoolSnapshot.pacingMultiplier;

    if (currentComputePoolSnapshot.level === 'congested') {
        if (consecutive >= 4) {
            nextLevel = 'healthy';
            nextMultiplier = 1.0;
        } else if (consecutive >= 2) {
            nextLevel = 'throttled';
            nextMultiplier = 1.5;
        }
    } else if (currentComputePoolSnapshot.level === 'throttled' || currentComputePoolSnapshot.level === 'exhausted') {
        if (!isCooling || consecutive >= 2) {
            nextLevel = 'healthy';
            nextMultiplier = 1.0;
        }
    } else {
        nextLevel = 'healthy';
        nextMultiplier = 1.0;
    }

    currentComputePoolSnapshot = {
        ...currentComputePoolSnapshot,
        level: nextLevel,
        pacingMultiplier: nextMultiplier,
        activeCooldownUntil: nextLevel === 'healthy' ? 0 : currentComputePoolSnapshot.activeCooldownUntil,
        activeModel: model || currentComputePoolSnapshot.activeModel,
        consecutiveSuccesses: consecutive,
        dailyQuotaExhausted: false,
        lastUpdatedAt: now,
    };

    persistComputePoolStatus(currentComputePoolSnapshot);
    notifyComputePoolListeners();
    return currentComputePoolSnapshot;
};

export const resetComputePoolStatus = (): ComputePoolStatusSnapshot => {
    currentComputePoolSnapshot = createInitialComputePoolSnapshot();
    persistComputePoolStatus(currentComputePoolSnapshot);
    notifyComputePoolListeners();
    return currentComputePoolSnapshot;
};

export const subscribeComputePoolStatus = (
    listener: (snapshot: ComputePoolStatusSnapshot) => void,
): (() => void) => {
    computePoolListeners.add(listener);
    return () => {
        computePoolListeners.delete(listener);
    };
};

export function useComputePoolStatus(): ComputePoolStatusSnapshot {
    return useSyncExternalStore(subscribeComputePoolStatus, getComputePoolStatus, getComputePoolStatus);
}

// ---------------------------------------------------------------------------
// Adaptive Workload + Pool Pacing Delay
// ---------------------------------------------------------------------------

/**
 * Calculates adaptive pacing delay based on model, workload context, and real-time
 * compute pool health status (unified across all users, independent of subscription tiers).
 */
export const getAdaptiveModelPacingDelayMs = (
    model?: string,
    workloadOrLegacyTier?: PacingWorkloadContext | string,
    maybeWorkload?: PacingWorkloadContext,
): number => {
    const workload =
        typeof workloadOrLegacyTier === 'object' && workloadOrLegacyTier !== null
            ? workloadOrLegacyTier
            : maybeWorkload;

    const baseDelay = getModelPacingDelayMs(model);
    if (!workload || !isImageModel(model)) {
        const poolMultiplier = getComputePoolPacingMultiplier();
        return Math.round(baseDelay * poolMultiplier);
    }

    let workloadBuffer = 0;
    const is4K = (workload.imageSize || '').toUpperCase() === '4K';
    const is2K = (workload.imageSize || '').toUpperCase() === '2K';

    if (is4K) {
        workloadBuffer += 2000;
    } else if (is2K) {
        workloadBuffer += 1000;
    }

    if (workload.hasReferenceImages) {
        workloadBuffer += 1500;
    }

    if (workload.includeThoughts) {
        workloadBuffer += 1000;
    }

    const poolMultiplier = getComputePoolPacingMultiplier();
    return Math.round((baseDelay + workloadBuffer) * poolMultiplier);
};

// ---------------------------------------------------------------------------
// Deep Error Packet Inspection & Retry Strategy Engine
// ---------------------------------------------------------------------------

function safeExtractJsonObjects(text: string): any[] {
    const results: any[] = [];
    if (!text || typeof text !== 'string') return results;

    let braceCount = 0;
    let startIndex = -1;
    let inString = false;
    let escape = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (escape) {
            escape = false;
            continue;
        }

        if (char === '\\') {
            escape = true;
            continue;
        }

        if (char === '"') {
            inString = !inString;
            continue;
        }

        if (inString) continue;

        if (char === '{') {
            if (braceCount === 0) {
                startIndex = i;
            }
            braceCount++;
        } else if (char === '}') {
            braceCount--;
            if (braceCount === 0 && startIndex !== -1) {
                const candidate = text.slice(startIndex, i + 1);
                try {
                    const parsed = JSON.parse(candidate);
                    if (parsed && typeof parsed === 'object') {
                        results.push(parsed);
                    }
                } catch {
                    // Ignore non-json bracket pairs
                }
                startIndex = -1;
            } else if (braceCount < 0) {
                braceCount = 0;
                startIndex = -1;
            }
        }
    }

    return results;
}

function parseRetryDelayStringToMs(val: unknown): number | null {
    if (typeof val === 'number' && !isNaN(val)) {
        return val > 1000 ? val : val * 1000;
    }
    if (typeof val === 'object' && val !== null) {
        const seconds = Number((val as any).seconds) || 0;
        const nanos = Number((val as any).nanos) || 0;
        if (seconds > 0 || nanos > 0) {
            return seconds * 1000 + Math.round(nanos / 1000000);
        }
    }
    if (typeof val !== 'string') return null;

    const trimmed = val.trim();
    const match = trimmed.match(/^([\d.]+)\s*(ms|s|seconds|second|minutes|min)?$/i);
    if (match) {
        const num = parseFloat(match[1]);
        const unit = (match[2] || 's').toLowerCase();
        if (unit === 'ms') return Math.ceil(num);
        if (unit.startsWith('min')) return Math.ceil(num * 60000);
        return Math.ceil(num * 1000);
    }
    return null;
}

/**
 * Deeply inspects an outbound or intercepted Gemini API error packet.
 * Analyzes HTTP statuses, nested Google RPC details (QuotaFailure, ErrorInfo, RetryInfo),
 * and string payloads to classify the root cause and generate a concrete retry decision.
 */
export function inspectGeminiErrorPacket(error: unknown, model?: string): DeepErrorPacketAnalysis {
    let rawSummary = '';
    if (error instanceof Error) {
        rawSummary = error.message;
    } else if (typeof error === 'string') {
        rawSummary = error;
    } else if (typeof (error as any)?.message === 'string') {
        rawSummary = (error as any).message;
    } else {
        try {
            rawSummary = JSON.stringify(error) || '';
        } catch {
            rawSummary = String(error ?? '');
        }
    }

    const lowerSummary = rawSummary.toLowerCase();

    // 1. Gather all potential JSON root objects (from error itself and from error.message)
    const candidates: any[] = [];
    if (error && typeof error === 'object') {
        candidates.push(error);
        if ((error as any).error) candidates.push((error as any).error);
        if ((error as any).response) candidates.push((error as any).response);
    }
    candidates.push(...safeExtractJsonObjects(rawSummary));

    // 2. Extract structured fields
    let httpStatus: number | null = null;
    let rpcStatus: string | null = null;
    let errorReason: string | null = null;
    let errorDomain: string | null = null;
    let quotaMetric: string | null = null;
    let quotaId: string | null = null;
    let quotaLimitValue: string | null = null;
    let extractedRetryDelayMs: number | null = null;
    const violations: QuotaViolationDetail[] = [];

    // Check direct status properties
    if (typeof (error as any)?.status === 'number') httpStatus = (error as any).status;
    else if (typeof (error as any)?.code === 'number') httpStatus = (error as any).code;

    for (const obj of candidates) {
        if (!httpStatus && typeof obj.code === 'number') httpStatus = obj.code;
        if (!httpStatus && typeof obj.status === 'number') httpStatus = obj.status;
        if (!rpcStatus && typeof obj.status === 'string') rpcStatus = obj.status;

        // Traverse details array if present
        const details = Array.isArray(obj.details)
            ? obj.details
            : Array.isArray(obj.error?.details)
              ? obj.error.details
              : [];

        for (const detail of details) {
            if (!detail || typeof detail !== 'object') continue;
            const type = detail['@type'] || detail.type || '';

            if (type.includes('QuotaFailure') || Array.isArray(detail.violations)) {
                const viols = detail.violations || [];
                for (const v of viols) {
                    violations.push({
                        quotaMetric: v.quotaMetric || v.metric,
                        quotaId: v.quotaId || v.id,
                        quotaValue: v.quotaValue || v.limit,
                        subject: v.subject,
                        description: v.description,
                        dimensions: v.dimensions,
                    });
                    if (!quotaMetric && (v.quotaMetric || v.metric)) quotaMetric = v.quotaMetric || v.metric;
                    if (!quotaId && (v.quotaId || v.id)) quotaId = v.quotaId || v.id;
                    if (!quotaLimitValue && (v.quotaValue != null || v.limit != null)) {
                        quotaLimitValue = String(v.quotaValue ?? v.limit);
                    }
                }
            }

            if (type.includes('ErrorInfo')) {
                if (!errorReason && detail.reason) errorReason = detail.reason;
                if (!errorDomain && detail.domain) errorDomain = detail.domain;
                if (detail.metadata && typeof detail.metadata === 'object') {
                    if (!quotaMetric && detail.metadata.quota_metric) quotaMetric = detail.metadata.quota_metric;
                    if (!quotaLimitValue && detail.metadata.quota_limit_value) {
                        quotaLimitValue = detail.metadata.quota_limit_value;
                    }
                }
            }

            if (type.includes('RetryInfo')) {
                const parsedDelay = parseRetryDelayStringToMs(detail.retryDelay || detail.delay);
                if (parsedDelay !== null && (extractedRetryDelayMs === null || parsedDelay > extractedRetryDelayMs)) {
                    extractedRetryDelayMs = parsedDelay;
                }
            }
        }

        // Retry-After header extraction from response
        const headers = obj.headers;
        if (headers && typeof headers.get === 'function') {
            const retryHeader = headers.get('retry-after');
            if (retryHeader) {
                const headerSeconds = parseInt(retryHeader, 10);
                if (!isNaN(headerSeconds) && headerSeconds > 0) {
                    extractedRetryDelayMs = Math.max(extractedRetryDelayMs || 0, headerSeconds * 1000);
                }
            }
        }
    }

    // 3. Fallback regex extraction for retry durations in text
    if (extractedRetryDelayMs === null) {
        const retryAfterMatch = rawSummary.match(/retry.?after[:\s]*(\d+)/i);
        if (retryAfterMatch) {
            extractedRetryDelayMs = parseInt(retryAfterMatch[1], 10) * 1000;
        } else {
            const retryInMatch = rawSummary.match(/retry\s+in\s+([\d.]+)\s*(ms|s|seconds|second|minutes|min)?/i);
            if (retryInMatch) {
                extractedRetryDelayMs = parseRetryDelayStringToMs(
                    `${retryInMatch[1]}${retryInMatch[2] || 's'}`,
                );
            } else {
                const waitMatch = rawSummary.match(/wait\s+([\d.]+)\s*(ms|s|seconds|second)?/i);
                if (waitMatch) {
                    extractedRetryDelayMs = parseRetryDelayStringToMs(
                        `${waitMatch[1]}${waitMatch[2] || 's'}`,
                    );
                }
            }
        }
    }

    // 4. Infer HTTP status if not explicit
    if (!httpStatus) {
        if (lowerSummary.includes('429') || rpcStatus === 'RESOURCE_EXHAUSTED') httpStatus = 429;
        else if (lowerSummary.includes('503') || rpcStatus === 'UNAVAILABLE') httpStatus = 503;
        else if (lowerSummary.includes('500') || rpcStatus === 'INTERNAL') httpStatus = 500;
        else if (lowerSummary.includes('502')) httpStatus = 502;
        else if (lowerSummary.includes('504') || rpcStatus === 'DEADLINE_EXCEEDED') httpStatus = 504;
        else if (lowerSummary.includes('401') || rpcStatus === 'UNAUTHENTICATED') httpStatus = 401;
        else if (lowerSummary.includes('403') || rpcStatus === 'PERMISSION_DENIED') httpStatus = 403;
        else if (lowerSummary.includes('400') || rpcStatus === 'INVALID_ARGUMENT') httpStatus = 400;
    }

    // 5. Categorize and determine Retry Strategy
    const isAuth401 =
        httpStatus === 401 ||
        rpcStatus === 'UNAUTHENTICATED' ||
        lowerSummary.includes('oauth 2 access token') ||
        lowerSummary.includes('login cookie') ||
        (lowerSummary.includes('invalid authentication credentials') && httpStatus === 401);

    const isDailyQuota =
        lowerSummary.includes('perday') ||
        lowerSummary.includes('per_day') ||
        lowerSummary.includes('requestsperday') ||
        lowerSummary.includes('tokensperday') ||
        lowerSummary.includes('daily') ||
        lowerSummary.includes('rpd') ||
        lowerSummary.includes('limit: 0') ||
        quotaLimitValue === '0' ||
        (quotaMetric && /day|daily|rpd/i.test(quotaMetric)) ||
        (errorReason === 'BILLING_DISABLED') ||
        lowerSummary.includes('billing details');

    const isCongestion =
        httpStatus === 503 ||
        httpStatus === 502 ||
        httpStatus === 504 ||
        httpStatus === 529 ||
        rpcStatus === 'UNAVAILABLE' ||
        errorReason === 'MODEL_OVERLOADED' ||
        lowerSummary.includes('overloaded') ||
        lowerSummary.includes('high demand') ||
        lowerSummary.includes('capacity') ||
        lowerSummary.includes('shared pool') ||
        lowerSummary.includes('temporarily unavailable') ||
        (httpStatus === 500 && lowerSummary.includes('internal'));

    const isRateLimit =
        httpStatus === 429 ||
        rpcStatus === 'RESOURCE_EXHAUSTED' ||
        lowerSummary.includes('rate limit') ||
        lowerSummary.includes('resource_exhausted') ||
        lowerSummary.includes('quota exceeded') ||
        lowerSummary.includes('tpm') ||
        lowerSummary.includes('rpm') ||
        lowerSummary.includes('ipm') ||
        extractedRetryDelayMs !== null;

    const isPolicyOrSafety =
        lowerSummary.includes('prompt_blocked') ||
        lowerSummary.includes('safety_block') ||
        lowerSummary.includes('policy') ||
        lowerSummary.includes('thinking loop detected') ||
        rawSummary === 'ABORTED' ||
        httpStatus === 400;

    // Rule A: Policy, safety, or thinking loop -> never retry
    if (isPolicyOrSafety) {
        return {
            category: 'non_retryable_policy',
            strategy: 'abort_no_retry',
            shouldRetry: false,
            httpStatus,
            rpcStatus,
            errorReason,
            errorDomain,
            quotaMetric,
            quotaId,
            quotaLimitValue,
            violations,
            extractedRetryDelayMs: null,
            recommendedWaitMs: 0,
            backoffMultiplier: 1.0,
            poolImpact: 'healthy',
            rawSummary,
        };
    }

    // Rule B: Transient Auth in AI Studio -> fast 1-shot retry
    if (isAuth401) {
        return {
            category: 'transient_auth',
            strategy: 'fast_auth_sync',
            shouldRetry: true,
            httpStatus: 401,
            rpcStatus: rpcStatus || 'UNAUTHENTICATED',
            errorReason: errorReason || 'AUTH_TOKEN_SYNC',
            errorDomain,
            quotaMetric,
            quotaId,
            quotaLimitValue,
            violations,
            extractedRetryDelayMs: 1500,
            recommendedWaitMs: 1500,
            backoffMultiplier: 1.0,
            maxRetriesOverride: 1,
            poolImpact: 'healthy',
            rawSummary,
        };
    }

    // Rule C: Daily Quota or Hard Limit: 0 reached -> immediate abort (waiting 20s won't reset daily limit)
    if (
        isDailyQuota &&
        (isRateLimit || lowerSummary.includes('quota') || errorReason === 'BILLING_DISABLED' || lowerSummary.includes('billing'))
    ) {
        return {
            category: 'daily_quota_exhausted',
            strategy: 'abort_no_retry',
            shouldRetry: false,
            httpStatus: httpStatus || 429,
            rpcStatus: rpcStatus || 'RESOURCE_EXHAUSTED',
            errorReason: errorReason || 'DAILY_QUOTA_EXHAUSTED',
            errorDomain,
            quotaMetric: quotaMetric || 'RequestsPerDay',
            quotaId,
            quotaLimitValue,
            violations,
            extractedRetryDelayMs,
            recommendedWaitMs: 0,
            backoffMultiplier: 1.0,
            maxRetriesOverride: 0,
            poolImpact: 'exhausted',
            rawSummary,
        };
    }

    // Rule D: Shared compute pool congestion (503 / Model Overloaded) -> anti-resonance desynchronized retry
    if (isCongestion) {
        const baseCongestionDelay = extractedRetryDelayMs
            ? Math.max(4000, extractedRetryDelayMs)
            : 8000;
        const desyncJitter = Math.random() * 4000; // Wide 0-4s random dispersion to prevent harmonic re-collision
        const totalCongestionWait = Math.round(baseCongestionDelay + desyncJitter);

        return {
            category: 'pool_congestion',
            strategy: 'congestion_desync_backoff',
            shouldRetry: true,
            httpStatus: httpStatus || 503,
            rpcStatus: rpcStatus || 'UNAVAILABLE',
            errorReason: errorReason || 'MODEL_OVERLOADED',
            errorDomain,
            quotaMetric,
            quotaId,
            quotaLimitValue,
            violations,
            extractedRetryDelayMs,
            recommendedWaitMs: totalCongestionWait,
            backoffMultiplier: 1.8,
            maxRetriesOverride: 4,
            poolImpact: 'congested',
            rawSummary,
        };
    }

    // Rule E: Transient Rate Limit (429 RPM/TPM/IPM) -> Leaky Bucket Cooldown
    if (isRateLimit) {
        const safetyMargin = getUnified429SafetyMarginMs(); // 2500ms
        const jitter = Math.random() * 1500;

        if (extractedRetryDelayMs !== null && extractedRetryDelayMs > 0) {
            const preciseWait = Math.max(1500, Math.ceil(extractedRetryDelayMs + safetyMargin + jitter));
            return {
                category: 'transient_rate_limit',
                strategy: 'server_directed_cooldown',
                shouldRetry: true,
                httpStatus: 429,
                rpcStatus: rpcStatus || 'RESOURCE_EXHAUSTED',
                errorReason: errorReason || 'RATE_LIMIT_EXCEEDED',
                errorDomain,
                quotaMetric: quotaMetric || 'RequestsPerMinute',
                quotaId,
                quotaLimitValue,
                violations,
                extractedRetryDelayMs,
                recommendedWaitMs: preciseWait,
                backoffMultiplier: 1.8,
                poolImpact: 'throttled',
                rawSummary,
            };
        }

        const defaultBackoff = getModelDefault429BackoffMs(model);
        const adaptiveWait = Math.round(defaultBackoff + jitter);

        return {
            category: 'transient_rate_limit',
            strategy: 'adaptive_leaky_bucket_backoff',
            shouldRetry: true,
            httpStatus: 429,
            rpcStatus: rpcStatus || 'RESOURCE_EXHAUSTED',
            errorReason: errorReason || 'RATE_LIMIT_EXCEEDED',
            errorDomain,
            quotaMetric: quotaMetric || 'RequestsPerMinute',
            quotaId,
            quotaLimitValue,
            violations,
            extractedRetryDelayMs: null,
            recommendedWaitMs: adaptiveWait,
            backoffMultiplier: 1.8,
            poolImpact: 'throttled',
            rawSummary,
        };
    }

    // Rule F: Transient network / fetch / empty response
    const networkJitter = Math.random() * 1000;
    return {
        category: 'transient_network',
        strategy: 'standard_exponential',
        shouldRetry: true,
        httpStatus,
        rpcStatus,
        errorReason,
        errorDomain,
        quotaMetric,
        quotaId,
        quotaLimitValue,
        violations,
        extractedRetryDelayMs: null,
        recommendedWaitMs: Math.round(2000 + networkJitter),
        backoffMultiplier: 2.0,
        poolImpact: 'healthy',
        rawSummary,
    };
}

export const parseRateLimitWaitMs = (errorOrMsg: unknown, model?: string): number => {
    const analysis = inspectGeminiErrorPacket(errorOrMsg, model);
    return analysis.recommendedWaitMs > 0
        ? analysis.recommendedWaitMs
        : getModelDefault429BackoffMs(model) + Math.random() * 2000;
};
