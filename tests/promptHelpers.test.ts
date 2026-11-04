import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    PROMPT_TOOL_FALLBACK_MODEL,
    PROMPT_TOOL_PRIMARY_MODEL,
    buildImageToPromptInstruction,
    buildPromptEnhancerInstruction,
    buildRandomPromptInstruction,
    buildRandomPromptRequest,
    clearPromptToolCongestionCooldowns,
    executePromptToolWithFallback,
    identifyBlockKeywords,
    isTransientPromptToolAvailabilityError,
    normalizePromptToolLanguage,
    resolvePromptToolAttemptChain,
} from '../plugins/utils/promptHelpers';

describe('buildPromptEnhancerInstruction', () => {
    it('requires localized direct rewrite output and allows prompt-only segmentation', () => {
        const instruction = buildPromptEnhancerInstruction('zh_TW');

        expect(instruction).toContain('Traditional Chinese');
        expect(instruction).toContain('Output only final image-generation prompt text');
        expect(instruction).toContain(
            'Every descriptive phrase, style cue, and invented detail must be written in Traditional Chinese.',
        );
        expect(instruction).toContain(
            'Do NOT answer in English or mix languages unless the requested language is English.',
        );
        expect(instruction).toContain(
            'You may return either one dense prompt paragraph or 2-4 short prompt-only blocks separated by line breaks',
        );
        expect(instruction).toContain('Every line or paragraph must remain pure prompt content');
        expect(instruction).toContain("Preserve the user's core concept, subject, intent, and action");
        expect(instruction).toContain(
            'rewrite them naturally in Traditional Chinese unless they are fixed proper nouns',
        );
        expect(instruction).toContain('Do NOT invent a different concept');
        expect(instruction).toContain(
            'Do NOT add analysis, commentary, explanations, headings, labels, numbering, bullet lists, markdown, JSON, or quotes.',
        );
        expect(instruction).not.toContain('{...};');

        // 確保 Prompt Enhancer 中包含風格敏感度（STYLE SENSITIVITY）的指示，防範非光柵寫實風格被隨意加上寫實關鍵字
        expect(instruction).toContain(
            'STYLE SENSITIVITY: Detect if the input style or selected art style is non-photorealistic',
        );
    });
});

describe('buildRandomPromptInstruction', () => {
    it('requires localized direct random output and allows prompt-only segmentation', () => {
        const instruction = buildRandomPromptInstruction('zh_TW');

        expect(instruction).toContain('Traditional Chinese');
        expect(instruction).toContain('Output only final image-generation prompt text');
        expect(instruction).toContain(
            'Do NOT answer in English or mix languages unless the requested language is English.',
        );
        expect(instruction).toContain('2-4 short prompt-only blocks separated by line breaks');
        expect(instruction).toContain(
            'Treat the scaffold as structure only and invent every subject, environment, prop, mood, style blend, and twist yourself.',
        );
        expect(instruction).toContain(
            'Do NOT echo scaffold labels, bracketed placeholders, variable names, or section titles',
        );
        expect(instruction).toContain('surprising, high-variance, and not a recycled stock theme');
        expect(instruction).toContain(
            'Do NOT add analysis, commentary, explanations, headings, labels, numbering, bullet lists, markdown, JSON, or quotes.',
        );
        expect(instruction).not.toContain('{...};');

        // 確保 Random Prompt 中包含風格敏感度（STYLE SENSITIVITY）的指示，促使模型使用媒介特定的藝術字詞
        expect(instruction).toContain(
            'STYLE SENSITIVITY: If you decide to generate or fill in a non-photorealistic art style',
        );
    });
});

describe('buildImageToPromptInstruction', () => {
    it('restores the recovered structured image-to-prompt rules with uncertainty and illegible-text handling', () => {
        const instruction = buildImageToPromptInstruction('zh_TW');

        expect(instruction).toContain('Traditional Chinese');
        expect(instruction).toContain('Output ONLY the final raw image prompt text in Traditional Chinese.');
        expect(instruction).toContain(
            'Do NOT output any headings, section labels, numbering, bullets, conversational preambles, or markdown formatting.',
        );
        expect(instruction).toContain(
            'Every single phrase, descriptive detail, and style cue must be in Traditional Chinese.',
        );
        expect(instruction).toContain('Describe every layer of the image with high density:');
        expect(instruction).toContain(
            'Primary Subject: exact facial features, expression, posture, age, skin/surface textures, clothing details',
        );
        expect(instruction).toContain(
            'The output must flow naturally as dense, descriptive, and highly descriptive text blocks (1 to 3 long paragraphs)',
        );
        expect(instruction).not.toContain('{...};');

        // 確保 Image-to-Prompt 中包含法醫視覺分析協定（Visual Forensic Protocol）的深度描述指示
        expect(instruction).toContain('Visual Forensic Protocol (Exhaustive Analysis)');
        expect(instruction).toContain('Deconstruct complex textures: specify the exact tactile feel of materials');
    });
});

describe('normalizePromptToolLanguage', () => {
    it('falls back to English for invalid language codes', () => {
        expect(normalizePromptToolLanguage('zh_TW')).toBe('zh_TW');
        expect(normalizePromptToolLanguage('bad-lang')).toBe('en');
        expect(normalizePromptToolLanguage()).toBe('en');
    });
});

describe('buildRandomPromptRequest', () => {
    it('replaces theme seeds with scaffold families whose values are entirely model-invented', () => {
        const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const request = buildRandomPromptRequest();

        expect(request).toContain(
            'Use this scaffold family as invisible structure only and invent every bracketed value yourself.',
        );
        expect(request).toContain('Generate a completely random and creative image prompt.');
        expect(request).toContain('Be unpredictable — surprise the user with something unexpected.');
        expect(request).toContain('Return ONLY the image prompt, nothing else.');
        expect(request).not.toContain('Scaffold family A - cinematic subject');

        randomSpy.mockRestore();
    });
});

describe('isTransientPromptToolAvailabilityError', () => {
    it('recognizes 503, 502, 504, 429 and high demand error messages', () => {
        expect(isTransientPromptToolAvailabilityError({ status: 503 })).toBe(true);
        expect(isTransientPromptToolAvailabilityError({ statusCode: 502 })).toBe(true);
        expect(isTransientPromptToolAvailabilityError({ code: 504 })).toBe(true);
        expect(isTransientPromptToolAvailabilityError({ status: 429 })).toBe(true);
        expect(
            isTransientPromptToolAvailabilityError(
                new Error(
                    '{"error":{"code":503,"message":"This model is currently experiencing high demand.","status":"UNAVAILABLE"}}',
                ),
            ),
        ).toBe(true);
        expect(
            isTransientPromptToolAvailabilityError(new Error('Resource has been exhausted (e.g. check quota)')),
        ).toBe(true);
        expect(isTransientPromptToolAvailabilityError(new Error('Rate limit exceeded'))).toBe(true);
    });

    it('rejects 400 Bad Request and unrelated errors', () => {
        expect(isTransientPromptToolAvailabilityError({ status: 400, message: 'Invalid argument' })).toBe(false);
        expect(isTransientPromptToolAvailabilityError(new Error('SyntaxError: unexpected token'))).toBe(false);
        expect(isTransientPromptToolAvailabilityError(null)).toBe(false);
        expect(isTransientPromptToolAvailabilityError(undefined)).toBe(false);
    });
});

describe('resolvePromptToolAttemptChain', () => {
    it('returns paid primary and fallback for quality mode', () => {
        const qualityChain = resolvePromptToolAttemptChain('quality');
        expect(qualityChain).toEqual([
            { tier: 'paid', model: PROMPT_TOOL_PRIMARY_MODEL },
            { tier: 'paid', model: PROMPT_TOOL_FALLBACK_MODEL },
        ]);

        // Default when undefined is quality
        expect(resolvePromptToolAttemptChain(undefined)).toEqual(qualityChain);
    });

    it('returns 4-stage cascading chain for eco mode', () => {
        const ecoChain = resolvePromptToolAttemptChain('eco');
        expect(ecoChain).toEqual([
            { tier: 'free', model: PROMPT_TOOL_PRIMARY_MODEL },
            { tier: 'free', model: PROMPT_TOOL_FALLBACK_MODEL },
            { tier: 'paid', model: PROMPT_TOOL_PRIMARY_MODEL },
            { tier: 'paid', model: PROMPT_TOOL_FALLBACK_MODEL },
        ]);
    });
});

describe('executePromptToolWithFallback', () => {
    beforeEach(() => {
        clearPromptToolCongestionCooldowns();
    });

    it('in quality mode: runs primary paid model when healthy (isFallback: false)', async () => {
        const mockClient = { name: 'paid-client' } as any;
        const getAIClient = vi.fn().mockReturnValue(mockClient);
        const operation = vi.fn().mockResolvedValue({ text: 'rewritten prompt' });

        const result = await executePromptToolWithFallback(getAIClient, operation, { optimizationMode: 'quality' });

        expect(result.usedFallback).toBe(false);
        expect(result.model).toBe(PROMPT_TOOL_PRIMARY_MODEL);
        expect(result.tier).toBe('paid');
        expect(result.executionMeta).toEqual({
            optimizationMode: 'quality',
            model: PROMPT_TOOL_PRIMARY_MODEL,
            effectiveTier: 'paid',
            requestedTier: 'paid',
            isFallback: false,
            fallbackReason: 'none',
        });
        expect(operation).toHaveBeenCalledTimes(1);
        expect(operation).toHaveBeenCalledWith(mockClient, { tier: 'paid', model: PROMPT_TOOL_PRIMARY_MODEL });
    });

    it('in quality mode: falls back to gemini-3.5-flash-lite on paid tier when 3.8-flash hits 503', async () => {
        const mockClient = { name: 'paid-client' } as any;
        const getAIClient = vi.fn().mockReturnValue(mockClient);
        const error503 = { status: 503, message: 'This model is currently experiencing high demand.' };

        const operation = vi
            .fn()
            .mockRejectedValueOnce(error503)
            .mockResolvedValueOnce({ text: 'fallback rewritten prompt' });

        const result = await executePromptToolWithFallback(getAIClient, operation, { optimizationMode: 'quality' });

        expect(result.usedFallback).toBe(true);
        expect(result.model).toBe(PROMPT_TOOL_FALLBACK_MODEL);
        expect(result.tier).toBe('paid');
        expect(result.executionMeta).toEqual({
            optimizationMode: 'quality',
            model: PROMPT_TOOL_FALLBACK_MODEL,
            effectiveTier: 'paid',
            requestedTier: 'paid',
            isFallback: true,
            fallbackReason: 'model-fallback',
        });
        expect(operation).toHaveBeenCalledTimes(2);
    });

    it('in eco mode: runs free primary model when healthy', async () => {
        const freeClient = { name: 'free-client' } as any;
        const getAIClient = vi.fn().mockReturnValue(freeClient);
        const operation = vi.fn().mockResolvedValue({ text: 'free eco prompt' });

        const result = await executePromptToolWithFallback(getAIClient, operation, { optimizationMode: 'eco' });

        expect(result.usedFallback).toBe(false);
        expect(result.model).toBe(PROMPT_TOOL_PRIMARY_MODEL);
        expect(result.tier).toBe('free');
        expect(result.executionMeta.fallbackReason).toBe('none');
    });

    it('in eco mode: falls back to free lite, then paid primary rescue, then paid lite', async () => {
        const freeClient = { apiKey: 'free-key', name: 'free-client' } as any;
        const paidClient = { apiKey: 'paid-key', name: 'paid-client' } as any;
        const getAIClient = vi.fn().mockImplementation((opt) => (opt?.tier === 'paid' ? paidClient : freeClient));

        const error503 = { status: 503, message: 'high demand' };

        // Test stage 2: free:3.8 fails -> free:3.5-flash-lite succeeds (model-fallback)
        const op1 = vi.fn().mockRejectedValueOnce(error503).mockResolvedValueOnce({ text: 'eco lite prompt' });
        const res1 = await executePromptToolWithFallback(getAIClient, op1, { optimizationMode: 'eco' });
        expect(res1.executionMeta.isFallback).toBe(true);
        expect(res1.executionMeta.effectiveTier).toBe('free');
        expect(res1.executionMeta.model).toBe(PROMPT_TOOL_FALLBACK_MODEL);
        expect(res1.executionMeta.fallbackReason).toBe('model-fallback');

        clearPromptToolCongestionCooldowns();

        // Test stage 3: free:3.8 fails -> free:3.5 fails -> paid:3.8 rescue succeeds (tier-fallback)
        const op2 = vi
            .fn()
            .mockRejectedValueOnce(error503)
            .mockRejectedValueOnce(error503)
            .mockResolvedValueOnce({ text: 'paid rescued prompt' });
        const res2 = await executePromptToolWithFallback(getAIClient, op2, { optimizationMode: 'eco' });
        expect(res2.executionMeta.isFallback).toBe(true);
        expect(res2.executionMeta.effectiveTier).toBe('paid');
        expect(res2.executionMeta.model).toBe(PROMPT_TOOL_PRIMARY_MODEL);
        expect(res2.executionMeta.fallbackReason).toBe('tier-fallback');

        clearPromptToolCongestionCooldowns();

        // Test stage 4: free:3.8 fails -> free:3.5 fails -> paid:3.8 fails -> paid:3.5 rescue succeeds (model-and-tier-fallback)
        const op3 = vi
            .fn()
            .mockRejectedValueOnce(error503)
            .mockRejectedValueOnce(error503)
            .mockRejectedValueOnce(error503)
            .mockResolvedValueOnce({ text: 'paid lite rescued prompt' });
        const res3 = await executePromptToolWithFallback(getAIClient, op3, { optimizationMode: 'eco' });
        expect(res3.executionMeta.isFallback).toBe(true);
        expect(res3.executionMeta.effectiveTier).toBe('paid');
        expect(res3.executionMeta.model).toBe(PROMPT_TOOL_FALLBACK_MODEL);
        expect(res3.executionMeta.fallbackReason).toBe('model-and-tier-fallback');
    });

    it('skips cooled-down nodes on subsequent calls within 60s cooldown window', async () => {
        let currentTime = 1000;
        const now = () => currentTime;
        const mockClient = { name: 'mock-client' } as any;
        const getAIClient = vi.fn().mockReturnValue(mockClient);
        const error503 = { status: 503, message: 'high demand' };

        // First call: primary fails with 503, fallback succeeds
        const op1 = vi.fn().mockRejectedValueOnce(error503).mockResolvedValueOnce({ text: 'res1' });
        const res1 = await executePromptToolWithFallback(getAIClient, op1, {
            optimizationMode: 'quality',
            now,
            cooldownMs: 60_000,
        });
        expect(res1.model).toBe(PROMPT_TOOL_FALLBACK_MODEL);
        expect(op1).toHaveBeenCalledTimes(2);

        // Advance time by 30 seconds (still within 60s cooldown)
        currentTime += 30_000;

        // Second call: primary should be skipped due to cooldown, directly hitting fallback
        const op2 = vi.fn().mockResolvedValueOnce({ text: 'res2' });
        const res2 = await executePromptToolWithFallback(getAIClient, op2, {
            optimizationMode: 'quality',
            now,
            cooldownMs: 60_000,
        });
        expect(res2.model).toBe(PROMPT_TOOL_FALLBACK_MODEL);
        expect(op2).toHaveBeenCalledTimes(1);
        expect(res2.attempts).toContainEqual(
            expect.objectContaining({
                model: PROMPT_TOOL_PRIMARY_MODEL,
                tier: 'paid',
                skippedDueToCooldown: true,
            }),
        );
    });

    it('does not catch non-transient 400 errors and aborts immediately', async () => {
        const mockClient = { name: 'mock-client' } as any;
        const getAIClient = vi.fn().mockReturnValue(mockClient);
        const error400 = { status: 400, message: 'Invalid argument provided' };
        const operation = vi.fn().mockRejectedValueOnce(error400);

        await expect(
            executePromptToolWithFallback(getAIClient, operation, { optimizationMode: 'quality' }),
        ).rejects.toEqual(error400);

        expect(operation).toHaveBeenCalledTimes(1);
    });

    it('distinguishes separate client instances without public apiKey and deduplicates identical client references', async () => {
        const freeClient = { models: {} } as any;
        const paidClient = { models: {} } as any;
        const error503 = { status: 503, message: 'high demand' };

        const dualGetAIClient = vi.fn().mockImplementation((opt) => (opt?.tier === 'paid' ? paidClient : freeClient));
        const dualOp = vi
            .fn()
            .mockRejectedValueOnce(error503)
            .mockRejectedValueOnce(error503)
            .mockResolvedValueOnce({ text: 'rescued by distinct paid client instance' });

        const dualResult = await executePromptToolWithFallback(dualGetAIClient, dualOp, {
            optimizationMode: 'eco',
        });
        expect(dualResult.executionMeta.effectiveTier).toBe('paid');
        expect(dualResult.executionMeta.model).toBe(PROMPT_TOOL_PRIMARY_MODEL);
        expect(dualOp).toHaveBeenCalledTimes(3);

        clearPromptToolCongestionCooldowns();

        // Single-key mode: getAIClient returns the exact same client instance for both free and paid tiers
        const sharedGetAIClient = vi.fn().mockReturnValue(paidClient);
        const sharedOp = vi.fn().mockRejectedValue(error503);

        await expect(
            executePromptToolWithFallback(sharedGetAIClient, sharedOp, {
                optimizationMode: 'eco',
            }),
        ).rejects.toEqual(error503);
        // Should only call operation twice (once for primary, once for fallback model), skipping duplicate client+model pairs
        expect(sharedOp).toHaveBeenCalledTimes(2);
    });
});

describe('identifyBlockKeywords', () => {
    it('extracts blocked keywords and falls back to gemini-3.5-flash-lite on primary failure', async () => {
        const generateContentMock = vi
            .fn()
            .mockRejectedValueOnce(new Error('503 UNAVAILABLE'))
            .mockResolvedValueOnce({ text: 'prohibited keyword' });
        const mockAi = {
            models: {
                generateContent: generateContentMock,
            },
        } as any;

        const result = await identifyBlockKeywords(mockAi, 'some input', 'HATE_SPEECH');

        expect(result).toBe('[prohibited keyword]');
        expect(generateContentMock).toHaveBeenCalledTimes(2);
        expect(generateContentMock).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({ model: PROMPT_TOOL_PRIMARY_MODEL }),
        );
        expect(generateContentMock).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({ model: PROMPT_TOOL_FALLBACK_MODEL }),
        );
    });
});
