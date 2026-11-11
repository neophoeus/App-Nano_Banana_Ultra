import { GoogleGenAI } from '@google/genai/node';
import { getRegisteredClientSelection, type ApiClientLookupOptions, type ApiKeyTier } from './apiKeyRouter';
import { cleanResponseText } from './apiHelpers';
import { toPromptGeminiThinkingLevel } from './geminiApiConfig';
import type { OptimizationMode } from '../../types';
import { normalizeOptimizationMode } from '../../utils/optimizationMode';

export const PROMPT_TOOL_PRIMARY_MODEL = 'gemini-3.8-flash';
export const PROMPT_TOOL_FALLBACK_MODEL = 'gemini-3.5-flash-lite';
export const PROMPT_TOOL_CONGESTION_COOLDOWN_MS = 60_000;

export type PromptToolModel = typeof PROMPT_TOOL_PRIMARY_MODEL | typeof PROMPT_TOOL_FALLBACK_MODEL;

export type PromptToolFallbackReason = 'none' | 'model-fallback' | 'tier-fallback';

export interface PromptToolAttemptTarget {
    model: PromptToolModel;
    tier: ApiKeyTier;
}

export interface PromptToolAttemptRecord {
    model: PromptToolModel;
    tier: ApiKeyTier;
    status?: number;
    errorMessage?: string;
    skippedDueToCooldown?: boolean;
}

export interface PromptToolExecutionMeta {
    optimizationMode: OptimizationMode;
    model: PromptToolModel;
    effectiveTier: ApiKeyTier;
    requestedTier: ApiKeyTier;
    isFallback: boolean;
    fallbackReason: PromptToolFallbackReason;
}

export interface PromptToolFallbackResult<T> {
    value: T;
    model: PromptToolModel;
    tier: ApiKeyTier;
    usedFallback: boolean;
    executionMeta: PromptToolExecutionMeta;
    attempts: PromptToolAttemptRecord[];
}

const congestionCooldownMap = new Map<string, number>();

export function clearPromptToolCongestionCooldowns(): void {
    congestionCooldownMap.clear();
}

export function isTransientPromptToolAvailabilityError(error: unknown): boolean {
    if (!error) return false;
    const err = error as any;
    const status = err.status ?? err.statusCode ?? err.code ?? err.error?.code ?? err.error?.status;
    const statusNum = typeof status === 'number' ? status : Number(status);

    if (statusNum === 503 || statusNum === 502 || statusNum === 504 || statusNum === 429) {
        return true;
    }

    const msg = String(err.message || err.error?.message || err.statusText || err).toLowerCase();

    if (statusNum === 400 || (statusNum === 401 && !msg.includes('quota'))) {
        return false;
    }

    return (
        msg.includes('503') ||
        msg.includes('502') ||
        msg.includes('504') ||
        msg.includes('429') ||
        msg.includes('unavailable') ||
        msg.includes('resource_exhausted') ||
        msg.includes('high demand') ||
        msg.includes('overloaded') ||
        msg.includes('temporarily unavailable') ||
        msg.includes('rate limit') ||
        msg.includes('quota') ||
        msg.includes('backend error')
    );
}

export function resolvePromptToolAttemptChain(optimizationMode?: OptimizationMode): readonly PromptToolAttemptTarget[] {
    const mode = normalizeOptimizationMode(optimizationMode);

    if (mode === 'quality') {
        return [{ tier: 'paid', model: PROMPT_TOOL_PRIMARY_MODEL }];
    }

    return [
        { tier: 'free', model: PROMPT_TOOL_PRIMARY_MODEL },
        { tier: 'free', model: PROMPT_TOOL_FALLBACK_MODEL },
        { tier: 'paid', model: PROMPT_TOOL_PRIMARY_MODEL },
    ];
}

export async function executePromptToolWithFallback<T>(
    getAIClient: (options?: ApiClientLookupOptions | string) => GoogleGenAI,
    operation: (client: GoogleGenAI, target: PromptToolAttemptTarget) => Promise<T>,
    options?: {
        optimizationMode?: OptimizationMode;
        now?: () => number;
        cooldownMs?: number;
    },
): Promise<PromptToolFallbackResult<T>> {
    const mode = normalizeOptimizationMode(options?.optimizationMode);
    const requestedTier: ApiKeyTier = mode === 'quality' ? 'paid' : 'free';
    const chain = resolvePromptToolAttemptChain(mode);
    const now = options?.now ?? Date.now;
    const cooldownMs = options?.cooldownMs ?? PROMPT_TOOL_CONGESTION_COOLDOWN_MS;

    const attempts: PromptToolAttemptRecord[] = [];
    const currentTime = now();

    const isTargetCooledDown = (target: PromptToolAttemptTarget): boolean => {
        const expiresAt = congestionCooldownMap.get(`${target.tier}:${target.model}`);
        return typeof expiresAt === 'number' && expiresAt > currentTime;
    };

    const allCooledDown = chain.every(isTargetCooledDown);

    let lastError: unknown = null;
    const triedClientKeys = new Set<string>();
    const triedClientObjects = new Map<GoogleGenAI, Set<PromptToolModel>>();

    const extractClientApiKey = (client: GoogleGenAI): string | undefined => {
        const registered = getRegisteredClientSelection(client);
        if (registered?.apiKey) {
            return registered.apiKey;
        }
        const reflected = client && typeof client === 'object' ? Reflect.get(client as object, 'apiKey') : undefined;
        return typeof reflected === 'string' && reflected.length > 0 ? reflected : undefined;
    };

    const hasTriedClientForModel = (client: GoogleGenAI, model: PromptToolModel): boolean => {
        const explicitApiKey = extractClientApiKey(client);
        if (typeof explicitApiKey === 'string' && explicitApiKey.length > 0) {
            return triedClientKeys.has(`${explicitApiKey}:${model}`);
        }
        return triedClientObjects.get(client)?.has(model) ?? false;
    };

    const markClientTriedForModel = (client: GoogleGenAI, model: PromptToolModel): void => {
        const explicitApiKey = extractClientApiKey(client);
        if (typeof explicitApiKey === 'string' && explicitApiKey.length > 0) {
            triedClientKeys.add(`${explicitApiKey}:${model}`);
            return;
        }
        let models = triedClientObjects.get(client);
        if (!models) {
            models = new Set<PromptToolModel>();
            triedClientObjects.set(client, models);
        }
        models.add(model);
    };

    for (let i = 0; i < chain.length; i++) {
        const target = chain[i];
        const key = `${target.tier}:${target.model}`;

        if (!allCooledDown && isTargetCooledDown(target)) {
            attempts.push({
                model: target.model,
                tier: target.tier,
                skippedDueToCooldown: true,
            });
            continue;
        }

        let client: GoogleGenAI;
        try {
            client = getAIClient({ model: target.model, tier: target.tier });
        } catch (clientErr) {
            attempts.push({
                model: target.model,
                tier: target.tier,
                errorMessage: clientErr instanceof Error ? clientErr.message : String(clientErr),
            });
            lastError = clientErr;
            continue;
        }

        if (hasTriedClientForModel(client, target.model)) {
            continue;
        }

        try {
            const value = await operation(client, target);
            congestionCooldownMap.delete(key);

            const registeredSelection = getRegisteredClientSelection(client);
            const effectiveTier: ApiKeyTier = registeredSelection?.effectiveTier ?? target.tier;
            const isModelDowngrade = target.model !== PROMPT_TOOL_PRIMARY_MODEL;
            const isTierSwitch = target.tier !== requestedTier;
            const usedFallback = isModelDowngrade || isTierSwitch;

            let fallbackReason: PromptToolFallbackReason = 'none';
            if (isTierSwitch) {
                fallbackReason = 'tier-fallback';
            } else if (isModelDowngrade) {
                fallbackReason = 'model-fallback';
            }

            const executionMeta: PromptToolExecutionMeta = {
                optimizationMode: mode,
                model: target.model,
                effectiveTier,
                requestedTier,
                isFallback: usedFallback,
                fallbackReason,
            };

            return {
                value,
                model: target.model,
                tier: effectiveTier,
                usedFallback,
                executionMeta,
                attempts,
            };
        } catch (error: any) {
            lastError = error;
            markClientTriedForModel(client, target.model);

            const isTransient = isTransientPromptToolAvailabilityError(error);
            attempts.push({
                model: target.model,
                tier: target.tier,
                status: error?.status ?? error?.statusCode ?? error?.code,
                errorMessage: error?.message || String(error),
            });

            if (isTransient) {
                if (chain.length > 1) {
                    congestionCooldownMap.set(key, currentTime + cooldownMs);
                }
                continue;
            }

            throw error;
        }
    }

    if (lastError) {
        throw lastError;
    }

    throw new Error('All prompt tool attempts failed without a specific error.');
}

const LANGUAGE_INSTRUCTION_NAMES: Record<string, string> = {
    en: 'English',
    zh_TW: 'Traditional Chinese',
    zh_CN: 'Simplified Chinese',
    ja: 'Japanese',
    ko: 'Korean',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    ru: 'Russian',
};

type PromptToolLanguage = keyof typeof LANGUAGE_INSTRUCTION_NAMES;

const SURPRISE_ME_SCAFFOLDS = [
    // 策略 1: 完全開放式
    `Generate a completely random and creative image prompt.
Be unpredictable — surprise the user with something unexpected.
Return ONLY the image prompt, nothing else.`,

    // 策略 2: 半結構化模板
    `Fill in this image prompt template creatively and unexpectedly:

A [mood/style] scene of [subject] in [setting],
with [lighting] lighting, [color palette] color palette,
rendered in [art style] style.

Be creative. Avoid common/safe choices. Return ONLY the completed prompt.`,

    // 策略 3: 「反常識」驚喜策略
    `Create a surprising image prompt by combining TWO things that don't normally go together.
Make it visually interesting and specific.
Examples of the unexpected pairing concept (DO NOT copy these):
- a samurai in a laundromat
- a lighthouse made of books

Return ONLY the final image prompt, no explanation.`,
];

export function normalizePromptToolLanguage(lang?: string): PromptToolLanguage {
    if (lang && Object.prototype.hasOwnProperty.call(LANGUAGE_INSTRUCTION_NAMES, lang)) {
        return lang as PromptToolLanguage;
    }

    return 'en';
}

export function getPromptToolLanguageName(lang?: string): string {
    return LANGUAGE_INSTRUCTION_NAMES[normalizePromptToolLanguage(lang)];
}

function buildCommonDirectPromptRules(languageName: string): string {
    return `1. Output only final image-generation prompt text in ${languageName}.
2. Every descriptive phrase, style cue, and invented detail must be written in ${languageName}.
3. Do NOT answer in English or mix languages unless the requested language is English.
4. If the source prompt contains another language, translate it into ${languageName} while preserving meaning, except for established proper nouns, artist names, brand names, or model names that should remain unchanged.
5. You may return either one dense prompt paragraph or 2-4 short prompt-only blocks separated by line breaks when segmentation improves detail, clarity, or fidelity.
6. Every line or paragraph must remain pure prompt content ready to send directly to an image model.
7. Make the wording rich, concrete, vivid, and natural-flowing rather than schema-like or list-like.
8. Do NOT add analysis, commentary, explanations, headings, labels, numbering, bullet lists, markdown, JSON, or quotes.`;
}

export function buildPromptEnhancerInstruction(lang: string): string {
    const languageName = getPromptToolLanguageName(lang);
    return `You are an expert image prompt engineer.
Task: Rewrite the user's image prompt into a richer, more precise, production-ready image-generation prompt entirely in ${languageName}.
CRITICAL RULES:
${buildCommonDirectPromptRules(languageName)}
9. Preserve the user's core concept, subject, intent, and action.
10. If the original prompt includes English or mixed-language fragments, rewrite them naturally in ${languageName} unless they are fixed proper nouns.
11. Make the upgrades concrete: strengthen subject detail, styling, pose, composition, setting, lighting, color, material texture, atmosphere, and finish quality.
12. STYLE SENSITIVITY: Detect if the input style or selected art style is non-photorealistic (e.g., Anime, 2D illustration, flat vector art, line drawings, watercolor, pixel art, flat design). If so, you MUST preserve and enhance the visual characteristics of that specific style (e.g., line weight, flat color shapes, paper texture, vector shading) instead of adding photographic terms (such as camera lenses, 35mm lens, 4k resolution, cinematic realistic lighting, realistic fur/skin texture) that clash with the style.
13. If segmentation helps, separate major visual layers across a few prompt-only blocks without using headings or labels.
14. Do NOT invent a different concept or drift away from the original request.
15. Avoid empty filler, weak generic adjectives, or placeholder wording.`;
}

export function buildRandomPromptInstruction(lang: string): string {
    const languageName = getPromptToolLanguageName(lang);
    return `You are a creative image prompt generator.
Task: Fill the provided creative scaffold by inventing every missing value yourself and transform it into one original, generation-ready image prompt entirely in ${languageName}.
CRITICAL RULES:
${buildCommonDirectPromptRules(languageName)}
9. Treat the scaffold as structure only and invent every subject, environment, prop, mood, style blend, and twist yourself.
10. Do NOT echo scaffold labels, bracketed placeholders, variable names, or section titles in the final answer.
11. Make the concept surprising, high-variance, and not a recycled stock theme.
12. Build one internally coherent concept from start to finish.
13. STYLE SENSITIVITY: If you decide to generate or fill in a non-photorealistic art style (e.g., Anime, 2D illustration, flat vector art, line drawings, watercolor, pixel art), you MUST use visual terms specific to that art medium (e.g., cell shading, bold outlines, soft washes, vibrant flat tones) and AVOID camera or photographic jargon (such as depth of field, 35mm lens, realistic texture, cinematic lighting) which breaks the medium's consistency.
14. Weave subject, environment, composition, lighting, color, materials, mood, style, and cinematic or illustrative finish into one cohesive prompt body.
15. If segmentation helps, split the prompt into a few prompt-only blocks so separate visual layers stay dense and clear without becoming sectioned commentary.
16. Avoid empty filler, weak generic adjectives, or placeholder wording.`;
}

export function buildImageToPromptInstruction(lang: string): string {
    const languageName = getPromptToolLanguageName(lang);
    return `You are an expert image prompt engineer.
Task: Analyze the uploaded image with absolute forensic precision and translate every visible element into a highly comprehensive, extremely detailed, and generation-ready image prompt in ${languageName}.
CRITICAL RULES:
1. Output ONLY the final raw image prompt text in ${languageName}.
2. Do NOT output any headings, section labels, numbering, bullets, conversational preambles, or markdown formatting.
3. Every single phrase, descriptive detail, and style cue must be in ${languageName}. Do NOT drift into English unless quoting text visible in the image or proper nouns.
4. Describe every layer of the image with high density:
   - Primary Subject: exact facial features, expression, posture, age, skin/surface textures, clothing details (materials, folds, patterns, stitching, accessories).
   - Environment and Background: setting details, secondary elements, foreground anchors, depth layers, architecture, signs of life, or weather conditions.
   - Lighting and Atmospheric Effects: light sources, light direction, shadows (sharp, soft, long), light temperature, global illumination, dust motes, fog, haze, reflections, or translucent effects.
   - Color Palette: dominant colors, accent colors, gradients, color harmony, and saturation levels.
   - Composition and Camera: camera angle (low, high, eye-level), framing (extreme close-up, medium shot, wide shot), lens characteristics (shallow depth of field, bokeh, sharp focus, wide-angle distortion), and composition guidelines.
   - Style and Finish: art medium or rendering style (e.g., oil painting brushstrokes, flat vector color blocks, cel shading, digital 3D rendering material feel, octane render look), and overall mood or narrative atmosphere.
5. Visual Forensic Protocol (Exhaustive Analysis):
   - You must conduct a thorough visual audit. Do not overlook secondary objects, background textures, or peripheral elements.
   - Deconstruct complex textures: specify the exact tactile feel of materials (e.g., weathered oak, polished brass, coarse linen, glossy plastic, damp soil, velvety moss).
   - Be specific with colors: use descriptive shades and hues (e.g., amber, crimson, turquoise, charcoal, warm ivory) rather than generic color names.
   - For human/creature subjects: detail the exact mood conveyed by the expression (e.g., subtle smirk, intense gaze, quiet contemplation) and micro-features like hair strands, skin wrinkles, or fabric weave.
   - For abstract, stylized, or non-photorealistic art: detail the medium specifics, such as visible paper tooth, paint drips, cross-hatching density, or digital shaders/specularity.
   - If there is text in the image that is illegible, describe its visual style, font, color, and location instead of ignoring it.
6. Do not summarize or simplify. Capture the maximum amount of visual detail and nuance to recreate the image as faithfully as possible.
7. The output must flow naturally as dense, descriptive, and highly descriptive text blocks (1 to 3 long paragraphs), with every word directly generative for an image model. Avoid generic fillers like "photorealistic" or "ultra-detailed" and replace them with specific sensory descriptions.`;
}

export function buildRandomPromptRequest(): string {
    const scaffold = SURPRISE_ME_SCAFFOLDS[Math.floor(Math.random() * SURPRISE_ME_SCAFFOLDS.length)];

    return `Use this scaffold family as invisible structure only and invent every bracketed value yourself.

${scaffold}

Turn the scaffold into one fluent, production-ready image prompt. Keep it surprising, specific, and directly generative. Do not output headings, bullets, brackets, placeholder names, or commentary.`;
}

export async function identifyBlockKeywords(
    ai: GoogleGenAI,
    prompt: string,
    category: string,
    thinkingLevel: string = 'low',
): Promise<string> {
    const models = [PROMPT_TOOL_PRIMARY_MODEL, PROMPT_TOOL_FALLBACK_MODEL];
    for (const model of models) {
        try {
            const response = await ai.models.generateContent({
                model,
                config: {
                    systemInstruction: `You are a content safety analyzer.
Task: Analyze the input text which triggered a "${category}" safety filter.
Output: Extract specific words, phrases, or visual descriptions that likely caused this policy violation.
Constraints:
1. Return ONLY a comma-separated list (e.g. "blood, gore, weapon").
2. Do NOT output conversational text, definitions, or markdown.
3. If specific words are not found, output the concept (e.g. "explicit violence").`,
                    thinkingConfig: {
                        thinkingLevel: toPromptGeminiThinkingLevel(thinkingLevel),
                    },
                },
                contents: `Text: "${prompt}"`,
            });
            const keywords = cleanResponseText(response.text, '');
            if (keywords) {
                return `[${keywords}]`;
            }
            return '';
        } catch {
            continue;
        }
    }
    return '';
}
