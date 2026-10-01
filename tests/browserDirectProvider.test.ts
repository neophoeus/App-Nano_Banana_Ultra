/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    browserDirectProvider,
    parseRateLimitWaitMs,
    updateGlobalRateLimitBackoff,
    getModelRateLimitBackoffUntil,
    clearModelRateLimitBackoff,
    setModelLastRequestCompletedAt,
    getModelLastRequestCompletedAt,
    isTransientAiStudioAuthError,
    retryOperation,
    buildGenerateResponseFromSdkResponse,
    detectThinkingLoop,
} from '../services/providers/browserDirectProvider';
import * as imageSaveUtils from '../utils/imageSaveUtils';
import {
    getStoredAiStudioSubscriptionTier,
    setStoredAiStudioSubscriptionTier,
    getModelPacingDelayMs,
    getModelDefault429BackoffMs,
    subscribeAiStudioSubscriptionTier,
    AI_STUDIO_TIER_STORAGE_KEY,
} from '../utils/aiStudioPlan';

describe('BrowserDirectProvider and AI Studio Subscription Tier Pacing', () => {
    beforeEach(() => {
        vi.unstubAllGlobals();
        localStorage.clear();
        setStoredAiStudioSubscriptionTier('pro');
        clearModelRateLimitBackoff('gemini-3-pro-image');
        clearModelRateLimitBackoff('gemini-3.1-flash-image');
        clearModelRateLimitBackoff('gemini-3.8-flash');
    });

    it('has direct provider id', () => {
        expect(browserDirectProvider.id).toBe('direct');
    });

    it('checks api key using gemini credentials', async () => {
        const hasKey = await browserDirectProvider.checkApiKey();
        expect(typeof hasKey).toBe('boolean');
    });

    it('persists and subscribes to AI Studio subscription tier changes', () => {
        let notifiedTier = '';
        const unsubscribe = subscribeAiStudioSubscriptionTier((tier) => {
            notifiedTier = tier;
        });

        expect(getStoredAiStudioSubscriptionTier()).toBe('pro');

        setStoredAiStudioSubscriptionTier('ultra_5x');
        expect(getStoredAiStudioSubscriptionTier()).toBe('ultra_5x');
        expect(localStorage.getItem(AI_STUDIO_TIER_STORAGE_KEY)).toBe('ultra_5x');
        expect(notifiedTier).toBe('ultra_5x');

        setStoredAiStudioSubscriptionTier('ultra_20x');
        expect(getStoredAiStudioSubscriptionTier()).toBe('ultra_20x');
        expect(notifiedTier).toBe('ultra_20x');

        unsubscribe();
    });

    it('calculates IPM pacing delays correctly for Pro, Ultra 5x, and Ultra 20x tiers', () => {
        // Pro Tier (1x)
        setStoredAiStudioSubscriptionTier('pro');
        expect(getModelPacingDelayMs('gemini-3-pro-image', 'pro')).toBe(18000);
        expect(getModelPacingDelayMs('gemini-3.1-flash-image', 'pro')).toBe(12000);
        expect(getModelPacingDelayMs('gemini-3.8-flash', 'pro')).toBe(2000);

        // Ultra 5x Tier
        setStoredAiStudioSubscriptionTier('ultra_5x');
        expect(getModelPacingDelayMs('gemini-3-pro-image', 'ultra_5x')).toBe(9000);
        expect(getModelPacingDelayMs('gemini-3.1-flash-image', 'ultra_5x')).toBe(6000);
        expect(getModelPacingDelayMs('gemini-3.8-flash', 'ultra_5x')).toBe(1000);

        // Ultra 20x Tier
        setStoredAiStudioSubscriptionTier('ultra_20x');
        expect(getModelPacingDelayMs('gemini-3-pro-image', 'ultra_20x')).toBe(4500);
        expect(getModelPacingDelayMs('gemini-3.1-flash-image', 'ultra_20x')).toBe(3000);
        expect(getModelPacingDelayMs('gemini-3.8-flash', 'ultra_20x')).toBe(500);
    });

    it('calculates adaptive workload pacing based on resolution, reference images, and thinking', async () => {
        const { getAdaptiveModelPacingDelayMs, getTier429SafetyMarginMs } = await import('../utils/aiStudioPlan');
        const { extractPacingWorkloadContext } = await import('../services/providers/browserDirectProvider');

        // Pro tier heavy workload (4K + reference + thoughts)
        const heavyWorkload = {
            imageSize: '4K',
            hasReferenceImages: true,
            includeThoughts: true,
        };
        // 12000 (base) + 4000 (4K) + 3000 (reference) + 2000 (thoughts) = 21000ms
        expect(getAdaptiveModelPacingDelayMs('gemini-3.1-flash-image', 'pro', heavyWorkload)).toBe(21000);

        // Ultra 5x heavy workload
        // 6000 (base) + 2000 (4K) + 1500 (reference) + 1000 (thoughts) = 10500ms
        expect(getAdaptiveModelPacingDelayMs('gemini-3.1-flash-image', 'ultra_5x', heavyWorkload)).toBe(10500);

        // Ultra 20x heavy workload
        // 3000 (base) + 1000 (4K) + 500 (reference) + 500 (thoughts) = 5000ms
        expect(getAdaptiveModelPacingDelayMs('gemini-3.1-flash-image', 'ultra_20x', heavyWorkload)).toBe(5000);

        // Tier safety margins
        expect(getTier429SafetyMarginMs('pro')).toBe(3500);
        expect(getTier429SafetyMarginMs('ultra_5x')).toBe(2000);
        expect(getTier429SafetyMarginMs('ultra_20x')).toBe(1500);

        // Extractor
        const extracted = extractPacingWorkloadContext({
            prompt: 'Test',
            model: 'gemini-3.1-flash-image',
            imageSize: '4K',
            characterImageInputs: [{ id: 'char-1' }] as any,
            includeThoughts: true,
        });
        expect(extracted.imageSize).toBe('4K');
        expect(extracted.hasReferenceImages).toBe(true);
        expect(extracted.includeThoughts).toBe(true);
    });

    it('provides tier-based default 429 backoff durations', () => {
        expect(getModelDefault429BackoffMs('gemini-3-pro-image', 'pro')).toBe(30000);
        expect(getModelDefault429BackoffMs('gemini-3.1-flash-image', 'pro')).toBe(20000);
        expect(getModelDefault429BackoffMs('gemini-3-pro-image', 'ultra_20x')).toBe(10000);
    });

    it('parses retry-after header and message strings with jitter and safety margin', () => {
        // Explicit retry-after with Pro safety margin (>= 25000 + 3500 = 28500)
        setStoredAiStudioSubscriptionTier('pro');
        const wait1 = parseRateLimitWaitMs('RESOURCE_EXHAUSTED: retry-after: 25', 'gemini-3-pro-image');
        expect(wait1).toBeGreaterThanOrEqual(28500);

        // Explicit retry in seconds with Pro safety margin (>= 18500 + 3500 = 22000)
        const wait2 = parseRateLimitWaitMs('Please retry in 18.5s', 'gemini-3.1-flash-image');
        expect(wait2).toBeGreaterThanOrEqual(22000);

        // Explicit retry in ms
        const wait3 = parseRateLimitWaitMs('Rate limit hit, retry in 800ms', 'gemini-3.8-flash');
        expect(wait3).toBeGreaterThanOrEqual(4300);

        // Generic 429 without explicit time uses tier default
        setStoredAiStudioSubscriptionTier('pro');
        const wait4 = parseRateLimitWaitMs('429 Too Many Requests: Quota exceeded', 'gemini-3-pro-image');
        expect(wait4).toBeGreaterThanOrEqual(30000);
    });

    it('updates and retrieves model rate limit backoff timestamp', () => {
        const now = Date.now();
        updateGlobalRateLimitBackoff('gemini-3.1-flash-image', '429 RESOURCE_EXHAUSTED: retry in 10s');
        const backoffUntil = getModelRateLimitBackoffUntil('gemini-3.1-flash-image');

        expect(backoffUntil).toBeGreaterThan(now + 9000);

        clearModelRateLimitBackoff('gemini-3.1-flash-image');
        expect(getModelRateLimitBackoffUntil('gemini-3.1-flash-image')).toBe(0);
    });

    it('tracks last request completion timestamp per model', () => {
        expect(getModelLastRequestCompletedAt('gemini-3.1-flash-image')).toBe(0);
        const testTime = Date.now();
        setModelLastRequestCompletedAt('gemini-3.1-flash-image', testTime);
        expect(getModelLastRequestCompletedAt('gemini-3.1-flash-image')).toBe(testTime);
    });

    it('handles countdown ticks and updates rate limit remaining ms', async () => {
        const { setRateLimitNotice, getRateLimitNotice, updateRateLimitRemainingMs, clearRateLimitNotice } =
            await import('../utils/rateLimitNotice');

        setRateLimitNotice({
            active: true,
            model: 'gemini-3-pro-image',
            totalWaitMs: 15000,
            remainingMs: 15000,
            retryCount: 1,
            maxRetries: 5,
            isDismissed: false,
        });

        expect(getRateLimitNotice()?.remainingMs).toBe(15000);

        updateRateLimitRemainingMs(10000);
        expect(getRateLimitNotice()?.remainingMs).toBe(10000);

        clearRateLimitNotice();
        expect(getRateLimitNotice()).toBeNull();
    });

    it('identifies AI Studio transient 401 authentication and token refresh errors', () => {
        const exactUserError =
            '{"error":{"code":401,"message":"Request had invalid authentication credentials. Expected OAuth 2 access token, login cookie or other valid authentication credential. See https://developers.google.com/identity/sign-in/web/devconsole-project.","status":"UNAUTHENTICATED"}}';
        expect(isTransientAiStudioAuthError(exactUserError)).toBe(true);

        expect(isTransientAiStudioAuthError(new Error(exactUserError))).toBe(true);
        expect(
            isTransientAiStudioAuthError({
                status: 401,
                message: 'Expected OAuth 2 access token or login cookie',
            }),
        ).toBe(true);
        expect(
            isTransientAiStudioAuthError({
                error: {
                    code: 401,
                    status: 'UNAUTHENTICATED',
                    message: 'Request had invalid authentication credentials.',
                },
            }),
        ).toBe(true);

        // Non-auth errors should not match
        expect(isTransientAiStudioAuthError(new Error('404 Not Found'))).toBe(false);
        expect(isTransientAiStudioAuthError(new Error('500 Internal Server Error'))).toBe(false);
        expect(isTransientAiStudioAuthError(new Error('429 RESOURCE_EXHAUSTED'))).toBe(false);
        expect(isTransientAiStudioAuthError(null)).toBe(false);
    });

    it('retries once and recovers when encountering transient AI Studio 401 auth error', async () => {
        const logs: string[] = [];
        let callCount = 0;
        const fakeOperation = vi.fn(async () => {
            callCount++;
            if (callCount === 1) {
                throw new Error(
                    'Request had invalid authentication credentials. Expected OAuth 2 access token, login cookie or other valid authentication credential.',
                );
            }
            return { imageUrl: 'data:image/png;base64,success' };
        });

        const result = await retryOperation(fakeOperation, 3, 10, {
            onLog: (msg) => logs.push(msg),
            authRetriesRemaining: 1,
        });

        expect(callCount).toBe(2);
        expect(result.imageUrl).toBe('data:image/png;base64,success');
        expect(logs.some((l) => l.includes('AI Studio 訂閱憑證同步中'))).toBe(true);
    });

    it('bounds transient auth retry to at most 1 attempt when 401 error persists', async () => {
        let callCount = 0;
        const persistentAuthError = new Error(
            'Request had invalid authentication credentials. Expected OAuth 2 access token, login cookie or other valid authentication credential.',
        );
        const fakeOperation = vi.fn(async () => {
            callCount++;
            throw persistentAuthError;
        });

        await expect(
            retryOperation(fakeOperation, 3, 10, {
                authRetriesRemaining: 1,
            }),
        ).rejects.toThrow('Request had invalid authentication credentials');

        // Initial call + exactly 1 auth retry = 2 calls total
        expect(callCount).toBe(2);
    });

    it('resolves actualOutput dimensions via loadImageDimensions when extracted has imageUrl', async () => {
        const spy = vi.spyOn(imageSaveUtils, 'loadImageDimensions').mockResolvedValue({
            width: 1920,
            height: 1080,
        });

        const response = await buildGenerateResponseFromSdkResponse({
            options: {
                prompt: 'test prompt',
                model: 'gemini-3.1-flash-image',
                imageSize: '2K',
                style: 'none',
                outputFormat: 'images-only',
            } as any,
            prepared: {
                requestBody: { imageSize: '2K' },
                resolvedResponseModalities: ['IMAGE'],
                effectiveThinkingLevel: 'high',
                shouldIncludeThoughts: false,
                groundingMode: 'off',
                conversationHistoryResult: { usable: false, history: [] },
                useOfficialConversation: false,
            } as any,
            sdkResponse: {},
            extracted: {
                imageUrl: 'data:image/png;base64,mockImage',
                imageMimeType: 'image/png',
                text: 'test',
                thoughts: '',
                resultParts: [],
                thoughtSignaturePresent: false,
                promptBlockReason: undefined,
                finishReason: undefined,
                safetyRatings: [],
                extractionIssue: undefined,
            },
            imgIndex: 1,
        });

        expect(spy).toHaveBeenCalledWith('data:image/png;base64,mockImage');
        expect(response.metadata?.actualOutput).toEqual({
            width: 1920,
            height: 1080,
            mimeType: 'image/png',
        });
        expect((response.sessionHints as any)?.actualImageDimensions).toBe('1920x1080');

        spy.mockRestore();
    });

    it('gracefully handles loadImageDimensions failure by setting actualOutput to null without throwing ReferenceError', async () => {
        const spy = vi.spyOn(imageSaveUtils, 'loadImageDimensions').mockRejectedValue(new Error('Load failed'));

        const response = await buildGenerateResponseFromSdkResponse({
            options: {
                prompt: 'test prompt',
                model: 'gemini-3-pro-image',
                imageSize: '4K',
                style: 'none',
                outputFormat: 'images-only',
            } as any,
            prepared: {
                requestBody: { imageSize: '4K' },
                resolvedResponseModalities: ['IMAGE'],
                effectiveThinkingLevel: 'high',
                shouldIncludeThoughts: true,
                groundingMode: 'off',
                conversationHistoryResult: { usable: false, history: [] },
                useOfficialConversation: false,
            } as any,
            sdkResponse: {},
            extracted: {
                imageUrl: 'data:image/png;base64,corruptImage',
                imageMimeType: 'image/png',
                text: 'test',
                thoughts: '',
                resultParts: [],
                thoughtSignaturePresent: false,
                promptBlockReason: undefined,
                finishReason: undefined,
                safetyRatings: [],
                extractionIssue: undefined,
            },
            imgIndex: 1,
        });

        expect(spy).toHaveBeenCalledWith('data:image/png;base64,corruptImage');
        expect(response.metadata?.actualOutput).toBeNull();
        expect((response.sessionHints as any)?.actualImageDimensions).toBeUndefined();

        spy.mockRestore();
    });

    describe('detectThinkingLoop', () => {
        it('returns false for empty or short thought strings', () => {
            expect(detectThinkingLoop('')).toBe(false);
            expect(detectThinkingLoop('thinking about this.')).toBe(false);
        });

        it('returns false for varied, non-repetitive reasoning', () => {
            const variedThoughts = [
                'First we analyze the composition of the image.',
                'Next we consider the lighting and color balance.',
                'Then we evaluate the subject placement and depth of field.',
                'Finally we synthesize the final visual rendering.',
            ].join(' ');
            expect(detectThinkingLoop(variedThoughts)).toBe(false);
        });

        it('detects repetitive reasoning loops exceeding threshold', () => {
            const repeatedClause = 'Let me reconsider the precise shade of blue here.';
            const loopThoughts = Array(6).fill(repeatedClause).join(' ');
            expect(detectThinkingLoop(loopThoughts)).toBe(true);
        });
    });

    describe('localStorage persistent rate limit backoff', () => {
        it('persists rate limit backoff to localStorage and restores it', () => {
            updateGlobalRateLimitBackoff('gemini-3.1-flash-image', '429 RESOURCE_EXHAUSTED: retry in 15s');

            const backoff = getModelRateLimitBackoffUntil('gemini-3.1-flash-image');
            expect(backoff).toBeGreaterThan(Date.now());
            expect(localStorage.getItem('nbu_model_rate_limit_backoff_until_gemini-3.1-flash-image')).toBe(
                String(backoff),
            );

            clearModelRateLimitBackoff('gemini-3.1-flash-image');
            expect(localStorage.getItem('nbu_model_rate_limit_backoff_until_gemini-3.1-flash-image')).toBeNull();
            expect(getModelRateLimitBackoffUntil('gemini-3.1-flash-image')).toBe(0);
        });

        it('self-heals and ignores corrupted distant-future backoff timestamps (>120s)', () => {
            const corruptedFutureTime = Date.now() + 500000; // > 120s
            localStorage.setItem('nbu_model_rate_limit_backoff_until_gemini-3-pro-image', String(corruptedFutureTime));

            // Memory is cleared in beforeEach, so it queries localStorage and should self-heal
            expect(getModelRateLimitBackoffUntil('gemini-3-pro-image')).toBe(0);
            expect(localStorage.getItem('nbu_model_rate_limit_backoff_until_gemini-3-pro-image')).toBeNull();
        });
    });
});
