import { GoogleGenAI } from '@google/genai/node';
import { cleanResponseText, readJsonBody, sendClassifiedApiError, sendJson } from '../utils/apiHelpers';
import {
    buildImageToPromptInstruction,
    buildPromptEnhancerInstruction,
    buildRandomPromptInstruction,
    buildRandomPromptRequest,
    normalizePromptToolLanguage,
    PERMISSIVE_SAFETY_SETTINGS,
} from '../utils/promptHelpers';

type PromptRequestBody = {
    currentPrompt?: string;
    imageDataUrl?: string;
    lang?: string;
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
        if (req.method !== 'POST') {
            sendJson(res, 405, { error: 'Method not allowed' });
            return;
        }

        try {
            const ai = getAIClient();
            const { currentPrompt = '', lang: requestedLang } = await readJsonBody<PromptRequestBody>(req);
            const lang = normalizePromptToolLanguage(requestedLang);
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                config: {
                    systemInstruction: buildPromptEnhancerInstruction(lang),
                    safetySettings: PERMISSIVE_SAFETY_SETTINGS,
                    temperature: 0.35,
                },
                contents:
                    `Current prompt: ${currentPrompt || 'A creative image'}\n\n` +
                    'Rewrite the prompt entirely in the requested UI language while preserving the same concept. Return only the final prompt text. You may use one dense paragraph or a few prompt-only lines separated by line breaks if that improves detail and clarity. No analysis, commentary, headings, or labels.',
            });

            sendJson(res, 200, { text: cleanResponseText(response.text, '') });
        } catch (error: any) {
            sendClassifiedApiError(res, '/api/prompt/enhance', error, 'Prompt enhancement failed', {
                defaultStatus: 502,
            });
        }
    });

    server.use('/api/prompt/random', async (req: any, res: any) => {
        if (req.method !== 'POST') {
            sendJson(res, 405, { error: 'Method not allowed' });
            return;
        }

        try {
            const ai = getAIClient();
            const { lang: requestedLang } = await readJsonBody<PromptRequestBody>(req);
            const lang = normalizePromptToolLanguage(requestedLang);
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                config: {
                    systemInstruction: buildRandomPromptInstruction(lang),
                    safetySettings: PERMISSIVE_SAFETY_SETTINGS,
                    temperature: 0.7,
                },
                contents: buildRandomPromptRequest(),
            });

            sendJson(res, 200, { text: cleanResponseText(response.text, '') });
        } catch (error: any) {
            sendClassifiedApiError(res, '/api/prompt/random', error, 'Random prompt generation failed', {
                defaultStatus: 502,
            });
        }
    });

    server.use('/api/prompt/image-to-prompt', async (req: any, res: any) => {
        if (req.method !== 'POST') {
            sendJson(res, 405, { error: 'Method not allowed' });
            return;
        }

        try {
            const ai = getAIClient();
            const { imageDataUrl = '', lang: requestedLang } = await readJsonBody<PromptRequestBody>(req);
            const lang = normalizePromptToolLanguage(requestedLang);
            const inlineImage = parseInlineImageFromDataUrl(String(imageDataUrl || ''));

            if (!inlineImage || !inlineImage.mimeType.startsWith('image/')) {
                sendJson(res, 400, { error: 'A valid image data URL is required.' });
                return;
            }

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                config: {
                    systemInstruction: buildImageToPromptInstruction(lang),
                    safetySettings: PERMISSIVE_SAFETY_SETTINGS,
                    temperature: 0.25,
                },
                contents: [
                    { inlineData: inlineImage },
                    {
                        text: 'Analyze this image carefully and return a structured image-to-prompt brief in the requested UI language. Describe only details that are visible or strongly supported by the image. If something is uncertain, say so instead of guessing. Keep the final section as a polished generation-ready prompt paragraph in the requested language unless you are quoting visible text.',
                    },
                ],
            });

            sendJson(res, 200, { text: cleanResponseText(response.text, '') });
        } catch (error: any) {
            sendClassifiedApiError(res, '/api/prompt/image-to-prompt', error, 'Image to prompt failed', {
                defaultStatus: 502,
            });
        }
    });
}
