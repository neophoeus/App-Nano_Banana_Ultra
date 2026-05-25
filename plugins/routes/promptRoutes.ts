import { GoogleGenAI } from '@google/genai/node';
import {
    cleanResponseText,
    createApiRequestContext,
    logApiRequest,
    readJsonBody,
    sendClassifiedApiError,
    sendJson,
} from '../utils/apiHelpers';
import {
    buildImageToPromptInstruction,
    buildPromptEnhancerInstruction,
    buildRandomPromptInstruction,
    buildRandomPromptRequest,
    normalizePromptToolLanguage,
} from '../utils/promptHelpers';
import { buildSafetySettings, DEFAULT_SAFETY_THRESHOLDS, type SafetyThresholds } from '../utils/geminiApiConfig';

type PromptRequestBody = {
    currentPrompt?: string;
    imageDataUrl?: string;
    lang?: string;
    safetyThresholds?: Partial<SafetyThresholds>;
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
    getAIClient: () => GoogleGenAI;
};

export function registerPromptRoutes(server: any, { getAIClient }: RegisterPromptRoutesArgs): void {
    server.use('/api/prompt/enhance', async (req: any, res: any) => {
        const requestContext = createApiRequestContext(req, '/api/prompt/enhance');

        if (req.method !== 'POST') {
            sendJson(res, 405, { error: 'Method not allowed' }, { requestContext, summary: 'Method not allowed' });
            return;
        }

        try {
            const ai = getAIClient();
            const { currentPrompt = '', lang: requestedLang, safetyThresholds } = await readJsonBody<PromptRequestBody>(req);
            const lang = normalizePromptToolLanguage(requestedLang);
            const resolvedSafetySettings = buildSafetySettings(safetyThresholds ?? DEFAULT_SAFETY_THRESHOLDS);
            logApiRequest(requestContext, {
                source: 'prompt-tools',
                lang,
                promptLength: currentPrompt.trim().length,
            });
            const response = await ai.models.generateContent({
                model: 'gemini-3.5-flash',
                config: {
                    systemInstruction: buildPromptEnhancerInstruction(lang),
                    ...(resolvedSafetySettings ? { safetySettings: resolvedSafetySettings } : {}),
                    temperature: 0.35,
                },
                contents: `Original prompt to rewrite: "${currentPrompt || 'A creative image'}"`,
            });

            const text = cleanResponseText(response.text, '');
            sendJson(
                res,
                200,
                { text },
                {
                    requestContext,
                    summary: `${lang} prompt enhancement`,
                    details: {
                        source: 'prompt-tools',
                        textLength: text.length,
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
            const ai = getAIClient();
            const { lang: requestedLang, safetyThresholds } = await readJsonBody<PromptRequestBody>(req);
            const lang = normalizePromptToolLanguage(requestedLang);
            const resolvedSafetySettings = buildSafetySettings(safetyThresholds ?? DEFAULT_SAFETY_THRESHOLDS);
            logApiRequest(requestContext, {
                source: 'prompt-tools',
                lang,
            });
            const response = await ai.models.generateContent({
                model: 'gemini-3.5-flash',
                config: {
                    systemInstruction: buildRandomPromptInstruction(lang),
                    ...(resolvedSafetySettings ? { safetySettings: resolvedSafetySettings } : {}),
                    temperature: 0.7,
                },
                contents: buildRandomPromptRequest(),
            });

            const text = cleanResponseText(response.text, '');
            sendJson(
                res,
                200,
                { text },
                {
                    requestContext,
                    summary: `${lang} random prompt`,
                    details: {
                        source: 'prompt-tools',
                        textLength: text.length,
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
            const ai = getAIClient();
            const { imageDataUrl = '', lang: requestedLang, safetyThresholds } = await readJsonBody<PromptRequestBody>(req);
            const lang = normalizePromptToolLanguage(requestedLang);
            const inlineImage = parseInlineImageFromDataUrl(String(imageDataUrl || ''));
            const resolvedSafetySettings = buildSafetySettings(safetyThresholds ?? DEFAULT_SAFETY_THRESHOLDS);
            logApiRequest(requestContext, {
                source: 'prompt-tools',
                lang,
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

            const response = await ai.models.generateContent({
                model: 'gemini-3.5-flash',
                config: {
                    systemInstruction: buildImageToPromptInstruction(lang),
                    ...(resolvedSafetySettings ? { safetySettings: resolvedSafetySettings } : {}),
                    temperature: 0.3,
                },
                contents: [
                    { inlineData: inlineImage },
                    {
                        text: 'Analyze this image carefully and generate a highly detailed, extremely accurate image prompt in the requested language describing it. Focus on absolute forensic precision, documenting every single detail, object, texture, color shade, camera setting, and art medium characteristic without summarization. Output only the prompt itself without any headings, labels, sections, or commentary.',
                    },
                ],
            });

            const text = cleanResponseText(response.text, '');
            sendJson(
                res,
                200,
                { text },
                {
                    requestContext,
                    summary: `${lang} image-to-prompt`,
                    details: {
                        source: 'prompt-tools',
                        textLength: text.length,
                        mimeType: inlineImage.mimeType,
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
