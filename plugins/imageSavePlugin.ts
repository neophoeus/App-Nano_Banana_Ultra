import fs from 'fs';
import path from 'path';
import { GoogleGenAI, HarmBlockThreshold, HarmCategory } from '@google/genai';
import type { Plugin } from 'vite';

type ImageSavePluginOptions = {
    outputDir?: string;
    geminiApiKey?: string;
};

type PromptRequestBody = {
    currentPrompt?: string;
    lang?: string;
};

type ImageGenerateBody = {
    prompt?: string;
    model?: string;
    aspectRatio?: string;
    imageSize?: string;
    objectImageInputs?: string[];
    characterImageInputs?: string[];
};

const VALID_IMAGE_MODELS = new Set([
    'gemini-3.1-flash-image-preview',
    'gemini-3-pro-image-preview',
    'gemini-2.5-flash-image',
]);

const VALID_IMAGE_SIZES = new Set(['512', '1K', '2K', '4K']);

const PERMISSIVE_SAFETY_SETTINGS = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

function readJsonBody<T>(req: NodeJS.ReadableStream): Promise<T> {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                resolve(JSON.parse(body || '{}') as T);
            } catch (error) {
                reject(error);
            }
        });
        req.on('error', reject);
    });
}

function sendJson(res: any, status: number, payload: unknown): void {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
}

function logApiError(route: string, error: unknown, details?: Record<string, unknown>): void {
    const message = error instanceof Error ? error.message : String(error);
    const payload = details ? { route, message, ...details } : { route, message };
    console.error('[Nano Banana API]', payload);
}

function buildPromptEnhancerInstruction(lang: string): string {
    return `You are an expert image prompt engineer.
Task: Optimize the user's prompt for a high-quality AI image generator (like Midjourney or Gemini).
Add details about lighting, texture, composition, and mood.
CRITICAL RULES:
1. Output ONLY the raw prompt text.
2. Do NOT add "Here is the prompt", labels, titles, or quotes.
3. Keep the original subject matter.
4. Output in ${lang}.`;
}

function buildRandomPromptInstruction(lang: string): string {
    return `You are a creative image prompt generator.
Task: Generate a single, highly descriptive, and vivid image prompt based on a random theme.
CRITICAL RULES:
1. Output ONLY the raw prompt text.
2. Do NOT include any conversational filler (e.g., "Here is a prompt", "Title:", "Concept:").
3. Do NOT use markdown code blocks.
4. The prompt must be ready to copy-paste into an image generator.
5. Output in ${lang}.`;
}

function cleanResponseText(text: string | undefined, fallback: string): string {
    return (text?.trim() || fallback).replace(/^["']|["']$/g, '');
}

function pushImagesToParts(parts: Array<{ text?: string; inlineData?: { data: string; mimeType: string } }>, images: string[] | undefined, prefix: string): void {
    if (!images?.length) {
        return;
    }

    for (let index = 0; index < images.length; index += 1) {
        const image = images[index];
        if (!image) {
            continue;
        }

        parts.push({ text: `[${prefix}_${index + 1}]` });

        const match = image.match(/^data:([^;]+);base64,(.+)$/);
        const mimeType = match?.[1] || 'image/png';
        const data = match?.[2] || image;
        parts.push({ inlineData: { mimeType, data } });
    }
}

async function identifyBlockKeywords(ai: GoogleGenAI, prompt: string, category: string): Promise<string> {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            config: {
                systemInstruction: `You are a content safety analyzer.
Task: Analyze the input text which triggered a "${category}" safety filter.
Output: Extract specific words, phrases, or visual descriptions that likely caused this policy violation.
Constraints:
1. Return ONLY a comma-separated list (e.g. "blood, gore, weapon").
2. Do NOT output conversational text, definitions, or markdown.
3. If specific words are not found, output the concept (e.g. "explicit violence").`,
                safetySettings: PERMISSIVE_SAFETY_SETTINGS,
            },
            contents: `Text: "${prompt}"`,
        });
        const keywords = cleanResponseText(response.text, '');
        return keywords ? `[${keywords}]` : '';
    } catch {
        return '';
    }
}

function extractGeneratedImage(response: any): { imageUrl?: string; finishReason?: string; safetyRatings?: any[] } {
    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts ?? [];
    for (const part of parts) {
        if (part.inlineData?.data) {
            const mimeType = part.inlineData.mimeType || 'image/png';
            return {
                imageUrl: `data:${mimeType};base64,${part.inlineData.data}`,
                finishReason: candidate?.finishReason,
                safetyRatings: candidate?.safetyRatings ?? [],
            };
        }
    }

    return {
        finishReason: candidate?.finishReason,
        safetyRatings: candidate?.safetyRatings ?? [],
    };
}

function registerMiddlewares(server: any, resolvedDir: string, geminiApiKey?: string): void {
    let aiClient: GoogleGenAI | null = null;

    const getAIClient = () => {
        const apiKey = geminiApiKey || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('Missing GEMINI_API_KEY. Add it to .env.local and restart the dev server.');
        }
        if (!aiClient) {
            aiClient = new GoogleGenAI({ apiKey });
        }
        return aiClient;
    };

    if (!fs.existsSync(resolvedDir)) {
        fs.mkdirSync(resolvedDir, { recursive: true });
    }

    server.use('/api/health', (_req: any, res: any) => {
        sendJson(res, 200, {
            ok: true,
            hasApiKey: Boolean(geminiApiKey || process.env.GEMINI_API_KEY),
            outputDir: resolvedDir,
            timestamp: new Date().toISOString(),
        });
    });

    server.use('/api/runtime-config', (_req: any, res: any) => {
        sendJson(res, 200, { hasApiKey: Boolean(geminiApiKey || process.env.GEMINI_API_KEY) });
    });

    server.use('/api/prompt/enhance', async (req: any, res: any) => {
        if (req.method !== 'POST') {
            sendJson(res, 405, { error: 'Method not allowed' });
            return;
        }

        try {
            const ai = getAIClient();
            const { currentPrompt = '', lang = 'en' } = await readJsonBody<PromptRequestBody>(req);
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                config: {
                    systemInstruction: buildPromptEnhancerInstruction(lang),
                    safetySettings: PERMISSIVE_SAFETY_SETTINGS,
                },
                contents: currentPrompt || 'A creative image',
            });

            sendJson(res, 200, { text: cleanResponseText(response.text, currentPrompt) });
        } catch (error: any) {
            logApiError('/api/prompt/enhance', error);
            sendJson(res, 500, { error: error.message || 'Prompt enhancement failed' });
        }
    });

    server.use('/api/prompt/random', async (req: any, res: any) => {
        if (req.method !== 'POST') {
            sendJson(res, 405, { error: 'Method not allowed' });
            return;
        }

        const themes = [
            'Cyberpunk City', 'Fantasy Landscape', 'Sci-Fi Portrait', 'Abstract Fluid Art', 'Macro Nature', 'Retro Poster Design', 'Surrealist Dream', 'Architectural Marvel',
            'Steampunk Invention', 'Noir Detective Scene', 'Isometric Room', 'Pixel Art Game Level', 'Renaissance Oil Painting', 'Vaporwave Statue', 'Gothic Cathedral',
            'Ukiyo-e Wave', 'Origami Animal', 'Neon Tokyo Street', 'Post-Apocalyptic Ruin', 'Double Exposure Portrait', 'Knolling Photography', 'Bioluminescent Forest',
            'Minimalist Vector Icon', 'Claymation Character', 'Space Nebula', 'Underwater Coral Reef', 'Cinematic Movie Still', 'Vintage Botanical Illustration'
        ];

        try {
            const ai = getAIClient();
            const { lang = 'en' } = await readJsonBody<PromptRequestBody>(req);
            const randomTheme = themes[Math.floor(Math.random() * themes.length)];
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                config: {
                    systemInstruction: buildRandomPromptInstruction(lang),
                    safetySettings: PERMISSIVE_SAFETY_SETTINGS,
                },
                contents: `Theme: ${randomTheme}. Generate one prompt now.`,
            });

            sendJson(res, 200, { text: cleanResponseText(response.text, 'A creative artistic image') });
        } catch (error: any) {
            logApiError('/api/prompt/random', error);
            sendJson(res, 500, { error: error.message || 'Random prompt generation failed' });
        }
    });

    server.use('/api/images/generate', async (req: any, res: any) => {
        if (req.method !== 'POST') {
            sendJson(res, 405, { error: 'Method not allowed' });
            return;
        }

        try {
            const ai = getAIClient();
            const body = await readJsonBody<ImageGenerateBody>(req);
            const model = String(body.model || 'gemini-3.1-flash-image-preview');

            if (!VALID_IMAGE_MODELS.has(model)) {
                logApiError('/api/images/generate', new Error('Unsupported model'), { model });
                sendJson(res, 400, { error: `Unsupported model: ${model}` });
                return;
            }

            if (body.imageSize && !VALID_IMAGE_SIZES.has(body.imageSize)) {
                logApiError('/api/images/generate', new Error('Unsupported image size'), { imageSize: body.imageSize, model });
                sendJson(res, 400, { error: `Unsupported image size: ${body.imageSize}` });
                return;
            }

            const objectImageInputs = Array.isArray(body.objectImageInputs) ? body.objectImageInputs : [];
            const characterImageInputs = Array.isArray(body.characterImageInputs) ? body.characterImageInputs : [];
            const totalReferenceImages = objectImageInputs.length + characterImageInputs.length;
            if (model === 'gemini-2.5-flash-image' && totalReferenceImages > 3) {
                logApiError('/api/images/generate', new Error('Too many reference images for gemini-2.5-flash-image'), { totalReferenceImages });
                sendJson(res, 400, { error: 'gemini-2.5-flash-image works best with up to 3 input images according to current docs.' });
                return;
            }

            const parts: Array<{ text?: string; inlineData?: { data: string; mimeType: string } }> = [];
            pushImagesToParts(parts, objectImageInputs, 'Obj');
            pushImagesToParts(parts, characterImageInputs, 'Char');
            parts.push({ text: String(body.prompt || 'A creative image.') });

            const imageConfig: Record<string, string> = {};
            if (body.aspectRatio) {
                imageConfig.aspectRatio = body.aspectRatio;
            }
            if (model !== 'gemini-2.5-flash-image' && body.imageSize) {
                imageConfig.imageSize = body.imageSize;
            }

            const response = await ai.models.generateContent({
                model,
                contents: { parts },
                config: {
                    responseModalities: ['IMAGE'],
                    imageConfig,
                    safetySettings: PERMISSIVE_SAFETY_SETTINGS,
                },
            });

            const blockReason = response.promptFeedback?.blockReason as string | undefined;
            if (blockReason && blockReason !== 'BLOCK_REASON_UNSPECIFIED' && blockReason !== 'NONE') {
                logApiError('/api/images/generate', new Error('Prompt rejected by policy'), { blockReason, model });
                sendJson(res, 400, { error: `Prompt rejected by policy: ${blockReason}. Please modify your prompt.` });
                return;
            }

            const extracted = extractGeneratedImage(response);
            if (extracted.imageUrl) {
                sendJson(res, 200, { imageUrl: extracted.imageUrl });
                return;
            }

            if (extracted.finishReason === 'SAFETY') {
                const blockedCategories = (extracted.safetyRatings ?? [])
                    .filter((rating: any) => rating.probability === 'HIGH' || rating.probability === 'MEDIUM' || rating.blocked)
                    .map((rating: any) => String(rating.category ?? 'UNKNOWN').replace('HARM_CATEGORY_', '').replace(/_/g, ' ').toLowerCase());
                const reason = blockedCategories.length > 0 ? blockedCategories.join(', ') : 'Unknown Safety Filter';
                const specificKeywords = await identifyBlockKeywords(ai, String(body.prompt || ''), reason);
                logApiError('/api/images/generate', new Error('Output blocked by safety filter'), { reason, model });
                sendJson(res, 400, { error: `Blocked by filter: ${reason} ${specificKeywords}`.trim() });
                return;
            }

            logApiError('/api/images/generate', new Error('Model returned no image data'), { model, finishReason: extracted.finishReason || 'UNKNOWN' });
            sendJson(res, 502, { error: 'Model returned no image data.' });
        } catch (error: any) {
            logApiError('/api/images/generate', error);
            sendJson(res, 500, { error: error.message || 'Image generation failed' });
        }
    });
}

/**
 * Vite plugin that provides a server endpoint for saving generated images
 * directly to the local filesystem, bypassing browser download dialogs.
 * 
 * POST /api/save-image
 * Body: JSON { data: string (base64 data URL), filename: string }
 * Response: JSON { success: boolean, path?: string, error?: string }
 */
export function imageSavePlugin(options?: ImageSavePluginOptions): Plugin {
    const resolvedDir = options?.outputDir || path.resolve(process.cwd(), 'output');

    return {
        name: 'vite-plugin-image-save',
        configureServer(server) {
            registerMiddlewares(server.middlewares, resolvedDir, options?.geminiApiKey);

            server.middlewares.use('/api/save-image', (req, res) => {
                if (req.method !== 'POST') {
                    sendJson(res, 405, { success: false, error: 'Method not allowed' });
                    return;
                }

                let body = '';
                req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
                req.on('end', () => {
                    try {
                        const { data, filename, metadata } = JSON.parse(body);

                        if (!data || !filename) {
                            sendJson(res, 400, { success: false, error: 'Missing data or filename' });
                            return;
                        }

                        // Extract raw base64 from data URL
                        const match = data.match(/^data:image\/([\w+]+);base64,(.+)$/);
                        if (!match) {
                            sendJson(res, 400, { success: false, error: 'Invalid data URL format' });
                            return;
                        }

                        const buffer = Buffer.from(match[2], 'base64');
                        // Prevent directory traversal attacks
                        const safeFilename = path.basename(filename);
                        const filePath = path.join(resolvedDir, safeFilename);

                        fs.writeFileSync(filePath, buffer);

                        // F5: Write metadata sidecar JSON if provided
                        if (metadata && typeof metadata === 'object') {
                            const jsonPath = filePath.replace(/\.\w+$/, '.json');
                            const sidecar = {
                                ...metadata,
                                filename,
                                timestamp: new Date().toISOString(),
                            };
                            fs.writeFileSync(jsonPath, JSON.stringify(sidecar, null, 2), 'utf-8');
                        }

                        sendJson(res, 200, { success: true, path: filePath });
                    } catch (err: any) {
                        sendJson(res, 500, { success: false, error: err.message });
                    }
                });
            });

            // F8: Load full image endpoint
            server.middlewares.use('/api/load-image', (req, res) => {
                if (req.method !== 'GET') {
                    sendJson(res, 405, { success: false, error: 'Method not allowed' });
                    return;
                }

                const url = new URL(req.url!, `http://${req.headers.host}`);
                const filename = url.searchParams.get('filename');

                if (!filename) {
                    sendJson(res, 400, { success: false, error: 'Missing filename' });
                    return;
                }

                // Security: Prevent directory traversal
                const safeFilename = path.basename(filename);
                const filePath = path.join(resolvedDir, safeFilename);

                // Ensure file exists and is within output dir
                if (!fs.existsSync(filePath) || !filePath.startsWith(resolvedDir)) {
                    sendJson(res, 404, { success: false, error: 'File not found' });
                    return;
                }

                try {
                    const ext = path.extname(filePath).toLowerCase().replace('.', '');
                    const mimeType = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/webp';
                    const fileBuffer = fs.readFileSync(filePath);

                    res.writeHead(200, {
                        'Content-Type': mimeType,
                        'Content-Length': fileBuffer.length
                    });
                    res.end(fileBuffer);
                } catch (err: any) {
                    sendJson(res, 500, { success: false, error: err.message });
                }
            });

            // --- Prompt History Endpoints ---

            // F3 (Permanent): Save prompt history
            server.middlewares.use('/api/save-prompts', (req, res) => {
                if (req.method !== 'POST') {
                    sendJson(res, 405, { success: false, error: 'Method not allowed' });
                    return;
                }

                let body = '';
                req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
                req.on('end', () => {
                    try {
                        const historyData = JSON.parse(body);
                        const promptsPath = path.join(resolvedDir, 'prompt_history.json');
                        fs.writeFileSync(promptsPath, JSON.stringify(historyData, null, 2), 'utf-8');

                        sendJson(res, 200, { success: true });
                    } catch (err: any) {
                        sendJson(res, 500, { success: false, error: err.message });
                    }
                });
            });

            // F3 (Permanent): Load prompt history
            server.middlewares.use('/api/load-prompts', (req, res) => {
                if (req.method !== 'GET') {
                    sendJson(res, 405, { success: false, error: 'Method not allowed' });
                    return;
                }

                try {
                    const promptsPath = path.join(resolvedDir, 'prompt_history.json');
                    if (fs.existsSync(promptsPath)) {
                        const data = fs.readFileSync(promptsPath, 'utf-8');
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(data);
                    } else {
                        // Return empty array if file does not exist yet
                        sendJson(res, 200, []);
                    }
                } catch (err: any) {
                    sendJson(res, 500, { success: false, error: err.message });
                }
            });

            console.log(`\n  🍌 Image auto-save enabled → ${resolvedDir}\n`);
            console.log('  🍌 Health check → /api/health');
        },
        configurePreviewServer(server) {
            registerMiddlewares(server.middlewares, resolvedDir, options?.geminiApiKey);
        }
    };
}
