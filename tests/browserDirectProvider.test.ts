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
    inspectGeminiErrorPacket,
    getComputePoolStatus,
    recordComputePoolError,
    recordComputePoolSuccess,
    resetComputePoolStatus,
    getComputePoolPacingMultiplier,
    loadComputePoolStatusFromStorage,
} from '../utils/aiStudioPlan';

describe('BrowserDirectProvider and AI Studio Subscription Tier Pacing', () => {
    beforeEach(() => {
        vi.unstubAllGlobals();
        localStorage.clear();
        setStoredAiStudioSubscriptionTier('pro');
        clearModelRateLimitBackoff('gemini-3-pro-image');
        clearModelRateLimitBackoff('gemini-3.1-flash-image');
        clearModelRateLimitBackoff('gemini-3.8-flash');
        resetComputePoolStatus();
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

    it('calculates unified IPM pacing delays across models regardless of legacy subscription tiers', () => {
        // Unified Pacing: Pro Image 6000ms, Flash Image 3500ms, Prompt Tools 1000ms
        setStoredAiStudioSubscriptionTier('pro');
        expect(getModelPacingDelayMs('gemini-3-pro-image')).toBe(6000);
        expect(getModelPacingDelayMs('gemini-3.1-flash-image')).toBe(3500);
        expect(getModelPacingDelayMs('gemini-3.8-flash')).toBe(1000);

        // Same unified values when legacy tier parameters are passed
        setStoredAiStudioSubscriptionTier('ultra_5x');
        expect(getModelPacingDelayMs('gemini-3-pro-image', 'ultra_5x')).toBe(6000);
        expect(getModelPacingDelayMs('gemini-3.1-flash-image', 'ultra_5x')).toBe(3500);
        expect(getModelPacingDelayMs('gemini-3.8-flash', 'ultra_5x')).toBe(1000);

        setStoredAiStudioSubscriptionTier('ultra_20x');
        expect(getModelPacingDelayMs('gemini-3-pro-image', 'ultra_20x')).toBe(6000);
        expect(getModelPacingDelayMs('gemini-3.1-flash-image', 'ultra_20x')).toBe(3500);
        expect(getModelPacingDelayMs('gemini-3.8-flash', 'ultra_20x')).toBe(1000);
    });

    it('calculates adaptive workload pacing based on resolution, reference images, and thinking', async () => {
        const { getAdaptiveModelPacingDelayMs, getUnified429SafetyMarginMs, resetComputePoolStatus } =
            await import('../utils/aiStudioPlan');
        const { extractPacingWorkloadContext } = await import('../services/providers/browserDirectProvider');

        resetComputePoolStatus();

        // Heavy workload (4K + reference + thoughts)
        const heavyWorkload = {
            imageSize: '4K',
            hasReferenceImages: true,
            includeThoughts: true,
        };
        // Unified healthy pool (1.0x): 3500 (base) + 2000 (4K) + 1500 (reference) + 1000 (thoughts) = 8000ms
        expect(getAdaptiveModelPacingDelayMs('gemini-3.1-flash-image', heavyWorkload)).toBe(8000);

        // Pro model heavy workload: 6000 + 2000 + 1500 + 1000 = 10500ms
        expect(getAdaptiveModelPacingDelayMs('gemini-3-pro-image', heavyWorkload)).toBe(10500);

        // Unified 429 safety margin
        expect(getUnified429SafetyMarginMs()).toBe(2500);

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

    it('provides unified default 429 backoff durations', () => {
        expect(getModelDefault429BackoffMs('gemini-3-pro-image')).toBe(20000);
        expect(getModelDefault429BackoffMs('gemini-3.1-flash-image')).toBe(12000);
        expect(getModelDefault429BackoffMs('gemini-3.8-flash')).toBe(6000);
    });

    it('parses retry-after header and message strings with jitter and unified safety margin', () => {
        // Explicit retry-after with unified safety margin (>= 25000 + 2500 = 27500)
        const wait1 = parseRateLimitWaitMs('RESOURCE_EXHAUSTED: retry-after: 25', 'gemini-3-pro-image');
        expect(wait1).toBeGreaterThanOrEqual(27500);

        // Explicit retry in seconds with unified safety margin (>= 18500 + 2500 = 21000)
        const wait2 = parseRateLimitWaitMs('Please retry in 18.5s', 'gemini-3.1-flash-image');
        expect(wait2).toBeGreaterThanOrEqual(21000);

        // Explicit retry in ms
        const wait3 = parseRateLimitWaitMs('Rate limit hit, retry in 800ms', 'gemini-3.8-flash');
        expect(wait3).toBeGreaterThanOrEqual(3300);

        // Generic 429 without explicit time uses unified default
        const wait4 = parseRateLimitWaitMs('429 Too Many Requests: Quota exceeded', 'gemini-3-pro-image');
        expect(wait4).toBeGreaterThanOrEqual(20000);
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

    describe('inspectGeminiErrorPacket (Deep Error Packet Inspection)', () => {
        it('identifies daily quota exhaustion from Google RPC QuotaFailure', () => {
            const error = {
                status: 429,
                message: 'RESOURCE_EXHAUSTED',
                details: [
                    {
                        '@type': 'type.googleapis.com/google.rpc.QuotaFailure',
                        violations: [
                            {
                                quotaMetric: 'generate_content_requests_per_day',
                                quotaId: 'GenerateContentRequestsPerDay',
                                description: 'Quota exceeded for quota metric RequestsPerDay',
                            },
                        ],
                    },
                ],
            };

            const analysis = inspectGeminiErrorPacket(error, 'gemini-3-pro-image');
            expect(analysis.category).toBe('daily_quota_exhausted');
            expect(analysis.strategy).toBe('abort_no_retry');
            expect(analysis.shouldRetry).toBe(false);
            expect(analysis.poolImpact).toBe('exhausted');
            expect(analysis.quotaMetric).toBe('generate_content_requests_per_day');
        });

        it('identifies shared pool congestion from 503 UNAVAILABLE or MODEL_OVERLOADED', () => {
            const error = new Error('503 Service Unavailable: The model is overloaded. Please try again later.');
            const analysis = inspectGeminiErrorPacket(error, 'gemini-3.1-flash-image');

            expect(analysis.category).toBe('pool_congestion');
            expect(analysis.strategy).toBe('congestion_desync_backoff');
            expect(analysis.shouldRetry).toBe(true);
            expect(analysis.poolImpact).toBe('congested');
            expect(analysis.recommendedWaitMs).toBeGreaterThanOrEqual(4000);
        });

        it('identifies transient rate limit and extracts retry delay from RetryInfo', () => {
            const error = {
                code: 429,
                message: 'Rate limit exceeded',
                details: [
                    {
                        '@type': 'type.googleapis.com/google.rpc.RetryInfo',
                        retryDelay: '12s',
                    },
                ],
            };

            const analysis = inspectGeminiErrorPacket(error, 'gemini-3-pro-image');
            expect(analysis.category).toBe('transient_rate_limit');
            expect(analysis.strategy).toBe('server_directed_cooldown');
            expect(analysis.shouldRetry).toBe(true);
            expect(analysis.extractedRetryDelayMs).toBe(12000);
            expect(analysis.recommendedWaitMs).toBeGreaterThanOrEqual(14500); // 12000 + 2500 margin
        });

        it('identifies transient AI Studio auth errors with fast auth sync strategy', () => {
            const error = new Error('401 Unauthorized: Invalid authentication credentials. OAuth 2 access token has expired.');
            const analysis = inspectGeminiErrorPacket(error, 'gemini-3.8-flash');

            expect(analysis.category).toBe('transient_auth');
            expect(analysis.strategy).toBe('fast_auth_sync');
            expect(analysis.shouldRetry).toBe(true);
            expect(analysis.maxRetriesOverride).toBe(1);
        });

        it('identifies non-retryable policy or safety blocks', () => {
            const error = new Error('PROMPT_BLOCKED: Content violates safety policies');
            const analysis = inspectGeminiErrorPacket(error, 'gemini-3-pro-image');

            expect(analysis.category).toBe('non_retryable_policy');
            expect(analysis.strategy).toBe('abort_no_retry');
            expect(analysis.shouldRetry).toBe(false);
        });

        it('identifies generationFailure safety-blocked code and filters message as non-retryable policy', () => {
            const safetyError = new Error('Model output was blocked by safety filters.');
            (safetyError as any).generationFailure = {
                code: 'safety-blocked',
                message: 'Model output was blocked by safety filters.',
            };

            const analysis = inspectGeminiErrorPacket(safetyError, 'gemini-3.1-flash-image');
            expect(analysis.category).toBe('non_retryable_policy');
            expect(analysis.strategy).toBe('abort_no_retry');
            expect(analysis.shouldRetry).toBe(false);
        });

        it('parses real-world Gemini 429 TPM input token limit without false-positive daily exhaustion', () => {
            const tpmErrorText =
                'You exceeded your current quota, please check your plan and billing details. For more information see https://ai.google.dev/gemini-api/docs/rate-limits.\n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_paid_tier_input_token_count, limit: 200000, model: gemini-3.1-flash-image\nPlease retry in 22.924543136s.';
            const analysis = inspectGeminiErrorPacket(tpmErrorText, 'gemini-3.1-flash-image');

            expect(analysis.category).toBe('transient_rate_limit');
            expect(analysis.shouldRetry).toBe(true);
            expect(analysis.strategy).toBe('server_directed_cooldown');
            expect(analysis.quotaMetric).toBe(
                'generativelanguage.googleapis.com/generate_content_paid_tier_input_token_count',
            );
            expect(analysis.quotaLimitValue).toBe('200000');
            expect(analysis.extractedRetryDelayMs).toBe(22925);
            expect(analysis.recommendedWaitMs).toBeGreaterThanOrEqual(25425);
        });

        it('parses real-world Gemini 429 RPM limit without false-positive daily exhaustion', () => {
            const rpmErrorText =
                'You exceeded your current quota, please check your plan and billing details.\n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_requests_per_model, limit: 20, model: gemini-3-pro-image\nPlease retry in 16.365016553s.';
            const analysis = inspectGeminiErrorPacket(rpmErrorText, 'gemini-3-pro-image');

            expect(analysis.category).toBe('transient_rate_limit');
            expect(analysis.shouldRetry).toBe(true);
            expect(analysis.quotaMetric).toBe('generativelanguage.googleapis.com/generate_requests_per_model');
            expect(analysis.quotaLimitValue).toBe('20');
            expect(analysis.extractedRetryDelayMs).toBe(16366);
        });

        it('parses real-world Gemini 429 RPD limit with compound duration (4h35m32.187s) accurately', () => {
            const rpdErrorText =
                'You exceeded your current quota, please check your plan and billing details.\n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_requests_per_model_per_day, limit: 1000, model: gemini-nano-banana-2.1\nPlease retry in 4h35m32.187215148s.';
            const analysis = inspectGeminiErrorPacket(rpdErrorText, 'gemini-nano-banana-2.1');

            expect(analysis.category).toBe('daily_quota_exhausted');
            expect(analysis.shouldRetry).toBe(false);
            expect(analysis.strategy).toBe('abort_no_retry');
            expect(analysis.quotaMetric).toBe('generativelanguage.googleapis.com/generate_requests_per_model_per_day');
            expect(analysis.quotaLimitValue).toBe('1000');
            // Must NOT truncate to 4000ms: ~16,532,188 ms (> 4.5 hours)
            expect(analysis.extractedRetryDelayMs).toBe(16532188);
        });
    });

    describe('Compute Pool Status Store & Reactive Transitions', () => {
        it('starts in healthy state with pacing multiplier 1.0', () => {
            const status = getComputePoolStatus();
            expect(status.level).toBe('healthy');
            expect(status.pacingMultiplier).toBe(1.0);
            expect(status.dailyQuotaExhausted).toBe(false);
            expect(getComputePoolPacingMultiplier()).toBe(1.0);
        });

        it('transitions to throttled and increases multiplier on transient rate limit', () => {
            const analysis = inspectGeminiErrorPacket('429 RESOURCE_EXHAUSTED: retry in 10s', 'gemini-3-pro-image');
            const updated = recordComputePoolError(analysis, 'gemini-3-pro-image', Date.now() + 10000);

            expect(updated.level).toBe('throttled');
            expect(updated.pacingMultiplier).toBe(1.5);
            expect(getComputePoolPacingMultiplier()).toBe(1.5);
        });

        it('transitions to congested and increases multiplier on pool congestion', () => {
            const analysis = inspectGeminiErrorPacket('503 Service Unavailable: overloaded', 'gemini-3-pro-image');
            const updated = recordComputePoolError(analysis, 'gemini-3-pro-image', Date.now() + 8000);

            expect(updated.level).toBe('congested');
            expect(updated.pacingMultiplier).toBe(1.8);
            expect(getComputePoolPacingMultiplier()).toBe(1.8);
        });

        it('transitions to exhausted on daily quota exhaustion', () => {
            const analysis = inspectGeminiErrorPacket(
                '429 Quota exceeded: RequestsPerDay limit 0 reached',
                'gemini-3-pro-image',
            );
            const updated = recordComputePoolError(analysis, 'gemini-3-pro-image', Date.now() + 60000);

            expect(updated.level).toBe('exhausted');
            expect(updated.dailyQuotaExhausted).toBe(true);
            expect(getComputePoolPacingMultiplier()).toBe(2.0);
        });

        it('recovers gradually upon consecutive successes', () => {
            // First congest it
            const analysis = inspectGeminiErrorPacket('503 Service Unavailable: overloaded', 'gemini-3-pro-image');
            recordComputePoolError(analysis, 'gemini-3-pro-image', Date.now() + 8000);
            expect(getComputePoolStatus().level).toBe('congested');

            // Success 1
            recordComputePoolSuccess('gemini-3-pro-image');
            expect(getComputePoolStatus().consecutiveSuccesses).toBe(1);

            // Success 2 -> steps down from congested to throttled
            recordComputePoolSuccess('gemini-3-pro-image');
            expect(getComputePoolStatus().level).toBe('throttled');

            // Success 3
            recordComputePoolSuccess('gemini-3-pro-image');
            // Success 4 -> recovers completely to healthy
            const recovered = recordComputePoolSuccess('gemini-3-pro-image');
            expect(recovered.level).toBe('healthy');
            expect(recovered.pacingMultiplier).toBe(1.0);
        });

        it('resets back to healthy when resetComputePoolStatus is invoked', () => {
            const analysis = inspectGeminiErrorPacket('429 RESOURCE_EXHAUSTED', 'gemini-3-pro-image');
            recordComputePoolError(analysis, 'gemini-3-pro-image', Date.now() + 10000);
            expect(getComputePoolStatus().level).toBe('throttled');

            const reset = resetComputePoolStatus();
            expect(reset.level).toBe('healthy');
            expect(reset.pacingMultiplier).toBe(1.0);
            expect(getComputePoolStatus().level).toBe('healthy');
        });

        it('isolates exhausted status to specific models without penalizing healthy models', () => {
            resetComputePoolStatus();
            const rpdAnalysis = inspectGeminiErrorPacket(
                '* Quota exceeded for metric: generativelanguage.googleapis.com/generate_requests_per_model_per_day, limit: 1000\nPlease retry in 4h',
                'gemini-nano-banana-2.1',
            );
            recordComputePoolError(rpdAnalysis, 'gemini-nano-banana-2.1');

            const status = getComputePoolStatus();
            expect(status.level).toBe('exhausted');
            expect(status.exhaustedModels).toContain('gemini-nano-banana-2.1');

            // The exhausted model gets the 2.0x penalty
            expect(getComputePoolPacingMultiplier('gemini-nano-banana-2.1')).toBe(2.0);
            // Healthy models avoid the 2.0x penalty
            expect(getComputePoolPacingMultiplier('gemini-3.1-flash-image')).toBe(1.0);

            // Succeeding on the healthy model restores active pool level to healthy while keeping exhausted model tracked
            const afterSuccess = recordComputePoolSuccess('gemini-3.1-flash-image');
            expect(afterSuccess.level).toBe('healthy');
            expect(afterSuccess.exhaustedModels).toContain('gemini-nano-banana-2.1');
            expect(getComputePoolPacingMultiplier('gemini-nano-banana-2.1')).toBe(2.0);
        });

        it('does not double-count recent rate limit errors when called with the same error object', () => {
            resetComputePoolStatus();
            const err = new Error('429 Quota exceeded: retry in 10s');
            updateGlobalRateLimitBackoff('gemini-3-pro-image', err);
            const countAfterFirst = getComputePoolStatus().recentRateLimitCount;

            updateGlobalRateLimitBackoff('gemini-3-pro-image', err);
            const countAfterSecond = getComputePoolStatus().recentRateLimitCount;

            expect(countAfterSecond).toBe(countAfterFirst);
        });

        it('auto-decays stale compute pool status across sessions/days (> 6 hours)', () => {
            resetComputePoolStatus();
            const analysis = inspectGeminiErrorPacket('429 RESOURCE_EXHAUSTED: retry in 10s', 'gemini-3-pro-image');
            recordComputePoolError(analysis, 'gemini-3-pro-image', Date.now() + 10000);
            expect(getComputePoolStatus().recentRateLimitCount).toBe(1);

            // Simulate loading a stale snapshot from yesterday (> 6 hours ago)
            const staleTime = Date.now() - 7 * 60 * 60 * 1000;
            localStorage.setItem(
                'nbu_compute_pool_status_v1',
                JSON.stringify({
                    level: 'throttled',
                    pacingMultiplier: 1.5,
                    activeCooldownUntil: 0,
                    activeModel: 'gemini-3-pro-image',
                    consecutiveSuccesses: 0,
                    recentRateLimitCount: 104,
                    recentCongestionCount: 12,
                    dailyQuotaExhausted: true,
                    exhaustedModels: ['gemini-nano-banana-2.1'],
                    lastUpdatedAt: staleTime,
                }),
            );

            // Loading from storage rehydrates and applies stale check
            const current = loadComputePoolStatusFromStorage();
            expect(current.level).toBe('healthy');
            expect(current.recentRateLimitCount).toBe(0);
            expect(current.recentCongestionCount).toBe(0);
            expect(current.dailyQuotaExhausted).toBe(false);
            expect(current.exhaustedModels).toEqual([]);
        });
    });

    describe('retryOperation with Deep Error Packet Analysis', () => {
        it('immediately aborts without retrying when daily quota is exhausted', async () => {
            let attempts = 0;
            const dailyExhaustionError = {
                status: 429,
                message: 'RESOURCE_EXHAUSTED: RequestsPerDay quota reached',
                details: [
                    {
                        '@type': 'type.googleapis.com/google.rpc.QuotaFailure',
                        violations: [{ quotaMetric: 'RequestsPerDay', quotaId: 'DailyRPD' }],
                    },
                ],
            };

            await expect(
                retryOperation(
                    async () => {
                        attempts += 1;
                        throw dailyExhaustionError;
                    },
                    3,
                    100,
                    {
                        model: 'gemini-3-pro-image',
                    },
                ),
            ).rejects.toEqual(dailyExhaustionError);

            // Must have aborted on attempt 1 without attempting retries
            expect(attempts).toBe(1);
        });

        it('terminates remaining batch slots early when Slot 0 fails with daily quota exhaustion', async () => {
            (window as any).aistudio = {};
            const fetchMock = vi
                .fn()
                .mockRejectedValue(
                    new Error(
                        'You exceeded your current quota, please check your plan and billing details.\n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_requests_per_model_per_day, limit: 1000, model: gemini-3.1-flash-image\nPlease retry in 4h35m32.187215148s.',
                    ),
                );
            vi.stubGlobal('fetch', fetchMock);

            const logs: string[] = [];
            const slotStarts: number[] = [];
            const results = await browserDirectProvider.generateImages(
                {
                    prompt: 'A banana in space',
                    model: 'gemini-3.1-flash-image',
                    aspectRatio: '1:1',
                    imageSize: '1K',
                } as any,
                4,
                {
                    onLog: (msg) => logs.push(msg),
                    onSlotStart: (slot) => slotStarts.push(slot),
                },
            );

            // Only Slot 0 should have started and called fetch once; Slots 1, 2, 3 are skipped immediately
            expect(slotStarts).toEqual([0]);
            expect(fetchMock).toHaveBeenCalledTimes(1);
            expect(results).toHaveLength(4);
            expect(results.every((r) => r.status === 'failed')).toBe(true);
            expect(results[3].failure).toBeDefined();
            expect(logs.some((msg) => msg.includes('每日配額已耗盡'))).toBe(true);
        });

        it('uses server-directed cooldown rather than latched exponential delay on subsequent retries', async () => {
            let attempt = 0;
            const fakeOperation = vi.fn(async () => {
                attempt++;
                if (attempt === 1) {
                    // First failure: asks for 20s
                    throw new Error('Please retry in 20s');
                }
                if (attempt === 2) {
                    // Second failure: server says retry in 5s
                    throw new Error('Please retry in 5s');
                }
                return { success: true };
            });

            const logs: string[] = [];
            // Start with delayMs = 80000 from a previous attempt
            const result = await retryOperation(fakeOperation, 3, 80000, {
                model: 'gemini-3-pro-image',
                onLog: (msg) => logs.push(msg),
            });

            expect(result).toEqual({ success: true });
            expect(attempt).toBe(3);
            // Verify attempt 2 was not locked to 80s or attempt 1's 20s: waitMs should be ~7.5s-9.0s (5s + 2.5s margin + jitter)
            const secondRetryLog = logs.find((l) => l.includes('(2 left)'));
            expect(secondRetryLog).toBeDefined();
            expect(secondRetryLog).toMatch(/Retrying in [789]\.\ds/);
        });
    });
});
