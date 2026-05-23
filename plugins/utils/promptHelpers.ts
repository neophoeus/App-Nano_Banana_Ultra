import { GoogleGenAI } from '@google/genai/node';
import { cleanResponseText } from './apiHelpers';
import { PERMISSIVE_SAFETY_SETTINGS } from './geminiApiConfig';

export { PERMISSIVE_SAFETY_SETTINGS } from './geminiApiConfig';

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

Return ONLY the final image prompt, no explanation.`
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
Task: Analyze the uploaded image with forensic care and convert it into a highly detailed, extremely accurate, and generation-ready image prompt in ${languageName}.
CRITICAL RULES:
1. Output ONLY the final image-generation prompt text in ${languageName}.
2. Do NOT use any section headers, labels, bullets, lists, markdown, JSON, or conversational filler.
3. Every descriptive phrase, style cue, and details must be written in ${languageName}. Do NOT drift into English or mix languages unless the requested language is English.
4. Only preserve non-${languageName} text when it is literally visible in the image or is an established proper noun that must stay unchanged.
5. Describe only details that are literally visible or strongly supported by the image. Avoid guesswork, speculation, or hallucinated elements.
6. Capture all critical visual aspects: subject identity, precise action, poses, expressions, clothing, environment/background details, lighting quality (source, color, shadows), color palette, composition angle, and overall mood and style.
7. Ensure the output flows naturally as one or two dense descriptive paragraphs. Every sentence must be ready to be sent directly to an image generation model.`;
}

export function buildRandomPromptRequest(): string {
    const scaffold = SURPRISE_ME_SCAFFOLDS[Math.floor(Math.random() * SURPRISE_ME_SCAFFOLDS.length)];

    return `Use this scaffold family as invisible structure only and invent every bracketed value yourself.

${scaffold}

Turn the scaffold into one fluent, production-ready image prompt. Keep it surprising, specific, and directly generative. Do not output headings, bullets, brackets, placeholder names, or commentary.`;
}

export async function identifyBlockKeywords(ai: GoogleGenAI, prompt: string, category: string): Promise<string> {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
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
