import { GoogleGenAI } from '@google/genai/node';
import type { PartMediaResolutionLevel } from '@google/genai';
import {
    cleanResponseText,
    createApiRequestContext,
    logApiRequest,
    readJsonBody,
    sendClassifiedApiError,
    sendJson,
} from '../utils/apiHelpers';
import type { ApiClientLookupOptions } from '../utils/apiKeyRouter';
import type { OptimizationMode } from '../../types';
import {
    buildImageToPromptInstruction,
    buildPromptEnhancerInstruction,
    buildRandomPromptInstruction,
    buildRandomPromptRequest,
    executePromptToolWithFallback,
    normalizePromptToolLanguage,
} from '../utils/promptHelpers';
import { extractUsageMetadata, resolveRoleMediaResolution } from '../utils/mediaResolution';
import { toPromptGeminiThinkingLevel } from '../utils/geminiApiConfig';
import { resolveEffectivePromptThinkingLevel } from '../../utils/optimizationMode';

type PromptRequestBody = {
    currentPrompt?: string;
    imageDataUrl?: string;
    lang?: string;
    thinkingLevel?: 'low' | 'medium' | 'high';
    optimizationMode?: OptimizationMode;
};

function parseInlineImageFromDataUrl(imageDataUrl: string): { data: string; mimeType: string } | null {
    const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/i);
    if (!match?.[2]) {
        return null;
    }

    return {
        mimeType: match[1] || 'image/png',
        data: match[2],
    };
}

type RegisterPromptRoutesArgs = {
    getAIClient: (options?: ApiClientLookupOptions | string) => GoogleGenAI;
};

export function registerPromptRoutes(server: any, { getAIClient }: RegisterPromptRoutesArgs): void {
    server.use('/api/prompt/enhance', async (req: any, res: any) => {
        const requestContext = createApiRequestContext(req, '/api/prompt/enhance');

        if (req.method !== 'POST') {
            sendJson(res, 405, { error: 'Method not allowed' }, { requestContext, summary: 'Method not allowed' });
            return;
        }

        try {
            const {
                currentPrompt = '',
                lang: requestedLang,
                thinkingLevel,
                optimizationMode,
            } = await readJsonBody<PromptRequestBody>(req);
            const lang = normalizePromptToolLanguage(requestedLang);
            const effectiveThinkingLevel = resolveEffectivePromptThinkingLevel(thinkingLevel, optimizationMode);
            logApiRequest(requestContext, {
                source: 'prompt-tools',
                lang,
                thinkingLevel: effectiveThinkingLevel,
                optimizationMode,
                promptLength: currentPrompt.trim().length,
            });

            const result = await executePromptToolWithFallback(
                getAIClient,
                async (ai, target) => {
                    const response = await ai.models.generateContent({
                        model: target.model,
                        config: {
                            systemInstruction: buildPromptEnhancerInstruction(lang),
                            thinkingConfig: {
                                thinkingLevel: toPromptGeminiThinkingLevel(effectiveThinkingLevel),
                            },
                        },
                        contents: `Original prompt to rewrite: "${currentPrompt || 'A creative image'}"`,
                    });
                    const text = cleanResponseText(response.text, '');
                    return { text };
                },
                { optimizationMode },
            );

            sendJson(
                res,
                200,
                { text: result.value.text, executionMeta: result.executionMeta },
                {
                    requestContext,
                    summary: `${lang} prompt enhancement (${result.model}, ${result.tier})`,
                    details: {
                        source: 'prompt-tools',
                        textLength: result.value.text.length,
                        model: result.model,
                        tier: result.tier,
                        isFallback: result.usedFallback,
                        fallbackReason: result.executionMeta.fallbackReason,
                    },
                },
            );
        } catch (error: any) {
            sendClassifiedApiError(res, '/api/prompt/enhance', error, 'Prompt enhancement failed', {
                defaultStatus: 502,
                requestContext,
                details: {
                    source: 'prompt-tools',
                },
            });
        }
    });

    server.use('/api/prompt/random', async (req: any, res: any) => {
        const requestContext = createApiRequestContext(req, '/api/prompt/random');

        if (req.method !== 'POST') {
            sendJson(res, 405, { error: 'Method not allowed' }, { requestContext, summary: 'Method not allowed' });
            return;
        }

        try {
            const { lang: requestedLang, thinkingLevel, optimizationMode } = await readJsonBody<PromptRequestBody>(req);
            const lang = normalizePromptToolLanguage(requestedLang);
            const effectiveThinkingLevel = resolveEffectivePromptThinkingLevel(thinkingLevel, optimizationMode);
            logApiRequest(requestContext, {
                source: 'prompt-tools',
                lang,
                thinkingLevel: effectiveThinkingLevel,
                optimizationMode,
            });

            const result = await executePromptToolWithFallback(
                getAIClient,
                async (ai, target) => {
                    const response = await ai.models.generateContent({
                        model: target.model,
                        config: {
                            systemInstruction: buildRandomPromptInstruction(lang),
                            thinkingConfig: {
                                thinkingLevel: toPromptGeminiThinkingLevel(effectiveThinkingLevel),
                            },
                        },
                        contents: buildRandomPromptRequest(),
                    });
                    const text = cleanResponseText(response.text, '');
                    return { text };
                },
                { optimizationMode },
            );

            sendJson(
                res,
                200,
                { text: result.value.text, executionMeta: result.executionMeta },
                {
                    requestContext,
                    summary: `${lang} random prompt (${result.model}, ${result.tier})`,
                    details: {
                        source: 'prompt-tools',
                        textLength: result.value.text.length,
                        model: result.model,
                        tier: result.tier,
                        isFallback: result.usedFallback,
                        fallbackReason: result.executionMeta.fallbackReason,
                    },
                },
            );
        } catch (error: any) {
            sendClassifiedApiError(res, '/api/prompt/random', error, 'Random prompt generation failed', {
                defaultStatus: 502,
                requestContext,
                details: {
                    source: 'prompt-tools',
                },
            });
        }
    });

    server.use('/api/prompt/image-to-prompt', async (req: any, res: any) => {
        const requestContext = createApiRequestContext(req, '/api/prompt/image-to-prompt');

        if (req.method !== 'POST') {
            sendJson(res, 405, { error: 'Method not allowed' }, { requestContext, summary: 'Method not allowed' });
            return;
        }

        try {
            const {
                imageDataUrl = '',
                lang: requestedLang,
                thinkingLevel,
                optimizationMode,
            } = await readJsonBody<PromptRequestBody>(req);
            const lang = normalizePromptToolLanguage(requestedLang);
            const effectiveThinkingLevel = resolveEffectivePromptThinkingLevel(thinkingLevel, optimizationMode);
            const inlineImage = parseInlineImageFromDataUrl(String(imageDataUrl || ''));
            logApiRequest(requestContext, {
                source: 'prompt-tools',
                lang,
                thinkingLevel: effectiveThinkingLevel,
                optimizationMode,
                hasImageDataUrl: Boolean(imageDataUrl),
            });

            if (!inlineImage || !inlineImage.mimeType.startsWith('image/')) {
                sendJson(
                    res,
                    400,
                    { error: 'A valid image data URL is required.' },
                    {
                        requestContext,
                        summary: 'Missing valid image data URL',
                        details: {
                            source: 'prompt-tools',
                            lang,
                        },
                    },
                );
                return;
            }

            const result = await executePromptToolWithFallback(
                getAIClient,
                async (ai, target) => {
                    const mediaResolution = resolveRoleMediaResolution({
                        model: target.model,
                        role: 'forensic-prompt',
                        optimizationMode,
                    });

                    const response = await ai.models.generateContent({
                        model: target.model,
                        config: {
                            systemInstruction: buildImageToPromptInstruction(lang),
                            thinkingConfig: {
                                thinkingLevel: toPromptGeminiThinkingLevel(effectiveThinkingLevel),
                            },
                        },
                        contents: [
                            {
                                inlineData: inlineImage,
                                ...(mediaResolution
                                    ? { mediaResolution: { level: mediaResolution.level as PartMediaResolutionLevel } }
                                    : {}),
                            },
                            {
                                text: 'Analyze this image carefully and generate a highly detailed, extremely accurate image prompt in the requested language describing it. Focus on absolute forensic precision, documenting every single detail, object, texture, color shade, camera setting, and art medium characteristic without summarization. Output only the prompt itself without any headings, labels, sections, or commentary.',
                            },
                        ],
                    });

                    const text = cleanResponseText(response.text, '');
                    const tokenUsage = extractUsageMetadata(response);
                    return { text, tokenUsage: tokenUsage || undefined };
                },
                { optimizationMode },
            );

            sendJson(
                res,
                200,
                {
                    text: result.value.text,
                    tokenUsage: result.value.tokenUsage,
                    executionMeta: result.executionMeta,
                },
                {
                    requestContext,
                    summary: `${lang} image-to-prompt (${result.model}, ${result.tier})`,
                    details: {
                        source: 'prompt-tools',
                        textLength: result.value.text.length,
                        mimeType: inlineImage.mimeType,
                        tokenUsage: result.value.tokenUsage,
                        model: result.model,
                        tier: result.tier,
                        isFallback: result.usedFallback,
                        fallbackReason: result.executionMeta.fallbackReason,
                    },
                },
            );
        } catch (error: any) {
            sendClassifiedApiError(res, '/api/prompt/image-to-prompt', error, 'Image to prompt failed', {
                defaultStatus: 502,
                requestContext,
                details: {
                    source: 'prompt-tools',
                },
            });
        }
    });
}
