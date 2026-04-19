import { GoogleGenAI, HarmBlockThreshold, HarmCategory } from '@google/genai/node';
import { cleanResponseText } from './apiHelpers';

export const PERMISSIVE_SAFETY_SETTINGS = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

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
    `Scaffold family A - cinematic subject tableau:
[central subject identity and silhouette]
[precise action or suspended moment]
[environment, era, and world logic]
[wardrobe, props, tools, or biological surface details]
[supporting figures or layered background activity]
[framing, camera distance, angle, lens feel, and depth behavior]
[lighting design, shadow character, weather, or atmospheric effects]
[color script, material texture, and finish quality]
[a subtle narrative clue]
[an unexpected twist that sharpens memorability]`,
    `Scaffold family B - environment-first world tableau:
[place, scale, architecture, or terrain]
[main focal structure, vehicle, creature, or phenomenon]
[foreground anchors and background depth layers]
[signs of life, ritual, conflict, industry, or abandonment]
[time of day, climate, and ambient motion]
[composition path and perspective logic]
[lighting source behavior and atmospheric depth]
[palette logic, surface wear, and tactile details]
[genre blend or cultural design language]
[a surprising discovery or contradiction]`,
    `Scaffold family C - graphic or surreal concept piece:
[iconic focal form or transformed object]
[hybrid style blend across two or three influences]
[bold compositional geometry or negative-space strategy]
[symbolic secondary motifs]
[lighting, glow, or shadow behavior]
[color contrast system and material finish]
[micro details that reward close inspection]
[emotional tone or conceptual tension]
[a strange but coherent twist]`,
    `Scaffold family D - intimate macro or artifact study:
[small-scale subject, specimen, food, machine, relic, or crafted object]
[extreme close-up focal zone and texture hierarchy]
[tool marks, wear, condensation, fibers, particles, or residue]
[supporting context that hints at a larger story]
[depth of field behavior and lens character]
[lighting direction, reflections, translucency, or subsurface effects]
[color temperature relationships and surface finish]
[a surprising transformation, contamination, or impossible material property]`,
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
11. Make the upgrades concrete: strengthen subject detail, styling, pose, composition, setting, lighting, color, camera feel, material texture, atmosphere, and finish quality.
12. If segmentation helps, separate major visual layers across a few prompt-only blocks without using headings or labels.
13. Do NOT invent a different concept or drift away from the original request.
14. Avoid empty filler, weak generic adjectives, or placeholder wording.`;
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
13. Weave subject, environment, composition, lighting, color, materials, mood, style, and cinematic or illustrative finish into one cohesive prompt body.
14. If segmentation helps, split the prompt into a few prompt-only blocks so separate visual layers stay dense and clear without becoming sectioned commentary.
15. Avoid empty filler, weak generic adjectives, or placeholder wording.`;
}

export function buildImageToPromptInstruction(lang: string): string {
    const languageName = getPromptToolLanguageName(lang);
    return `You are an expert image prompt engineer.
Task: Analyze the uploaded image with forensic care and convert it into a detailed, structured image-to-prompt brief in ${languageName} that stays faithful to visible evidence.
CRITICAL RULES:
1. Output every section heading, body sentence, and final prompt in ${languageName}.
2. Do NOT drift into English or mixed language unless the requested language is English.
3. Only preserve non-${languageName} text when it is literally visible in the image or is an established proper noun that must stay unchanged.
4. Output a plain-text multi-section brief in this exact order: Scene Overview, Subjects and Composition, Visual Details, Lighting and Color, Mood and Style, Final Prompt.
5. Use naturally translated section headings and body text in ${languageName}.
6. Each section must contain concrete visual evidence from the image, not generic filler.
7. Preserve what is actually visible instead of inventing unrelated elements.
8. If a requested detail is uncertain or only weakly supported, say it is unclear, subtle, likely, or not significant rather than presenting it as certain.
9. If text in the image is unreadable, describe it as illegible rather than guessing.
10. In Scene Overview, establish the environment, overall scale, genre or era cues, and any visible creative twist that reframes the scene.
11. In Subjects and Composition, identify the main subject first, then secondary subjects or supporting figures if present; describe visual hierarchy, composition structure, and the visible camera angle or lens feel.
12. In Visual Details, describe secondary elements, materials, textures, micro-details, visible depth-of-field behavior, and any hidden details that are truly present on closer inspection. If no significant hidden details are visible, say so rather than inventing them.
13. In Lighting and Color, describe light source behavior, shadow character, atmospheric depth, palette logic, color temperature, and dominant or accent colors.
14. In Mood and Style, describe the emotional tone, style fusion, and rendering finish. Mood should capture feeling or narrative charge, while rendering finish should capture the observable medium, polish, or surface treatment.
15. In Final Prompt, write one polished generation-ready prompt paragraph that synthesizes the observations without repeating the section labels.
16. Do NOT use markdown code fences, JSON, bullet lists, quotes, or conversational filler.`;
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
