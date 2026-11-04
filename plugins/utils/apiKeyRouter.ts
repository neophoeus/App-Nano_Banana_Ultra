import { GoogleGenAI } from '@google/genai/node';

/**
 * Dual API key router (Free Tier / Paid Tier).
 *
 * Why this exists: Gemini API billing is bound to the Google Cloud project behind an API key,
 * not to individual requests. A key from a billing-enabled project is charged at Paid Tier rates
 * even for models that offer a free quota (e.g. `gemini-3.8-flash`). To actually consume the free
 * quota, free-eligible traffic must be sent with a key from a project WITHOUT billing, while
 * paid-only models (all Nano Banana image models, grounding, Batch API, Files API) keep using the
 * billing-enabled key.
 */

export type ApiKeyTier = 'free' | 'paid';

export type ApiKeyTierMode = 'dual' | 'paid-only' | 'free-only' | 'missing';

export interface ApiKeyRouterConfigInput {
    geminiApiKey?: string;
    geminiPaidApiKey?: string;
    geminiFreeApiKey?: string;
    freeTierModels?: string[] | string;
    env?: Record<string, string | undefined>;
}

export interface ResolvedApiKeyConfig {
    paidApiKey: string;
    freeApiKey: string;
    freeTierModels: Set<string>;
    hasApiKey: boolean;
    hasPaidApiKey: boolean;
    hasFreeApiKey: boolean;
    apiKeyTierMode: ApiKeyTierMode;
}

export interface ApiClientLookupOptions {
    model?: string;
    tier?: ApiKeyTier;
    googleSearch?: boolean;
    imageSearch?: boolean;
    requiresBatch?: boolean;
    requiresFilesApi?: boolean;
}

export interface ResolvedApiKeySelection {
    apiKey: string;
    effectiveTier: ApiKeyTier;
    requestedTier: ApiKeyTier;
    isFallback: boolean;
}

export type GetAIClient = (options?: ApiClientLookupOptions | string) => GoogleGenAI;

export const DEFAULT_FREE_TIER_MODELS: readonly string[] = [
    'gemini-3.8-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
];

export const MISSING_API_KEY_ERROR_MESSAGE =
    'Missing GEMINI_API_KEY. Add GEMINI_PAID_API_KEY / GEMINI_FREE_API_KEY (or GEMINI_API_KEY) to .env.local and restart the dev server.';

// Template values such as `YOUR_API_KEY_HERE` from .env.example must never be sent upstream.
const PLACEHOLDER_KEY_PATTERN = /^YOUR_[A-Z0-9_]*_HERE$/i;

const sanitizeApiKey = (value: unknown): string => {
    if (typeof value !== 'string') {
        return '';
    }

    const unquoted = value
        .trim()
        .replace(/^(['"])(.*)\1$/, '$2')
        .trim();
    if (!unquoted || PLACEHOLDER_KEY_PATTERN.test(unquoted)) {
        return '';
    }

    return unquoted;
};

export function parseFreeTierModels(input?: string[] | string): Set<string> {
    const rawEntries = Array.isArray(input) ? input : typeof input === 'string' ? input.split(',') : [];
    const models = rawEntries
        .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
        .filter((entry) => entry.length > 0);

    return new Set(models.length > 0 ? models : DEFAULT_FREE_TIER_MODELS);
}

const resolveApiKeyTierMode = (hasPaidApiKey: boolean, hasFreeApiKey: boolean): ApiKeyTierMode => {
    if (hasPaidApiKey && hasFreeApiKey) {
        return 'dual';
    }
    if (hasPaidApiKey) {
        return 'paid-only';
    }
    if (hasFreeApiKey) {
        return 'free-only';
    }
    return 'missing';
};

export function resolveApiKeyConfig(input?: ApiKeyRouterConfigInput): ResolvedApiKeyConfig {
    const env = input?.env ?? process.env;
    // Explicit plugin options win over process env; GEMINI_API_KEY stays the legacy paid key for backward compat.
    const paidApiKey =
        sanitizeApiKey(input?.geminiPaidApiKey) ||
        sanitizeApiKey(input?.geminiApiKey) ||
        sanitizeApiKey(env.GEMINI_PAID_API_KEY) ||
        sanitizeApiKey(env.GEMINI_API_KEY);
    const freeApiKey = sanitizeApiKey(input?.geminiFreeApiKey) || sanitizeApiKey(env.GEMINI_FREE_API_KEY);
    const freeTierModels = parseFreeTierModels(input?.freeTierModels ?? env.GEMINI_FREE_TIER_MODELS);
    const hasPaidApiKey = paidApiKey.length > 0;
    const hasFreeApiKey = freeApiKey.length > 0;

    return {
        paidApiKey,
        freeApiKey,
        freeTierModels,
        hasApiKey: hasPaidApiKey || hasFreeApiKey,
        hasPaidApiKey,
        hasFreeApiKey,
        apiKeyTierMode: resolveApiKeyTierMode(hasPaidApiKey, hasFreeApiKey),
    };
}

const normalizeLookupOptions = (options?: ApiClientLookupOptions | string): ApiClientLookupOptions => {
    if (typeof options === 'string') {
        return { model: options };
    }

    return options ?? {};
};

export function resolveTargetApiKeyTier(
    options?: ApiClientLookupOptions | string,
    freeTierModels: ReadonlySet<string> = new Set(DEFAULT_FREE_TIER_MODELS),
): ApiKeyTier {
    const normalized = normalizeLookupOptions(options);

    // Grounding, Batch API and Files API are unavailable on the Free Tier, and uploaded file URIs are
    // scoped to the uploading project, so these always override any requested/model-derived tier.
    if (normalized.googleSearch || normalized.imageSearch || normalized.requiresBatch || normalized.requiresFilesApi) {
        return 'paid';
    }

    if (normalized.tier) {
        return normalized.tier;
    }

    if (normalized.model && freeTierModels.has(normalized.model)) {
        return 'free';
    }

    return 'paid';
}

export function resolveApiKeySelection(
    config: ResolvedApiKeyConfig,
    options?: ApiClientLookupOptions | string,
): ResolvedApiKeySelection {
    const requestedTier = resolveTargetApiKeyTier(options, config.freeTierModels);
    const preferredKey = requestedTier === 'free' ? config.freeApiKey : config.paidApiKey;

    if (preferredKey) {
        return { apiKey: preferredKey, effectiveTier: requestedTier, requestedTier, isFallback: false };
    }

    // Single-key setups keep working: fall back to whichever key is configured.
    const fallbackTier: ApiKeyTier = requestedTier === 'free' ? 'paid' : 'free';
    const fallbackKey = fallbackTier === 'free' ? config.freeApiKey : config.paidApiKey;

    if (fallbackKey) {
        return { apiKey: fallbackKey, effectiveTier: fallbackTier, requestedTier, isFallback: true };
    }

    // Message prefix must stay "Missing GEMINI_API_KEY" so classifyApiErrorStatus maps it to HTTP 503.
    throw new Error(MISSING_API_KEY_ERROR_MESSAGE);
}

export function createApiClientRouter(
    input?: ApiKeyRouterConfigInput,
    clientFactory: (apiKey: string) => GoogleGenAI = (apiKey) => new GoogleGenAI({ apiKey }),
): {
    getAIClient: GetAIClient;
    getSelection: (options?: ApiClientLookupOptions | string) => ResolvedApiKeySelection;
    getConfig: () => ResolvedApiKeyConfig;
} {
    // One client per distinct API key: concurrent free/paid requests never share or overwrite a mutable client.
    const clientCache = new Map<string, GoogleGenAI>();

    // Resolved on every call so env changes (and the legacy lazy process.env lookup) keep working.
    const getConfig = () => resolveApiKeyConfig(input);

    const getSelection = (options?: ApiClientLookupOptions | string) => resolveApiKeySelection(getConfig(), options);

    const getAIClient: GetAIClient = (options) => {
        const { apiKey } = getSelection(options);
        const cachedClient = clientCache.get(apiKey);
        if (cachedClient) {
            return cachedClient;
        }

        const client = clientFactory(apiKey);
        clientCache.set(apiKey, client);
        return client;
    };

    return { getAIClient, getSelection, getConfig };
}
