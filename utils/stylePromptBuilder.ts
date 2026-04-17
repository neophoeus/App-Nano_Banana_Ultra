import { GenerateOptions } from '../types';
import { buildStyleTransferPrompt, getStyleDefaultLabel, getStylePromptDescriptor, getStylePromptDirective } from './styleRegistry';

type StylePromptBuilderOptions = Pick<
    GenerateOptions,
    'prompt' | 'style' | 'objectImageInputs' | 'characterImageInputs'
>;

export const DEFAULT_REFERENCE_IMAGE_PROMPT =
    'High resolution, seamless integration with surrounding context, maintain consistent lighting and texture.';
export const DEFAULT_TEXT_TO_IMAGE_PROMPT = 'A creative image.';

const STYLED_PROMPT_PREFIX = 'Selected style:';
const SUBJECT_REQUEST_PREFIX = 'Subject and scene request:';
const GOVERNING_STYLE_RULE =
    'Keep the selected style as the governing visual treatment and override conflicting medium, rendering, or finish cues while preserving the subject, composition, and scene intent.';

const normalizePromptValue = (value: string): string => value.replace(/\s+/g, ' ').trim();

const hasReferenceImages = (
    options: Pick<StylePromptBuilderOptions, 'objectImageInputs' | 'characterImageInputs'>,
): boolean => Boolean(options.objectImageInputs?.length || options.characterImageInputs?.length);

const isStructuredStyledPrompt = (prompt: string): boolean => {
    const normalizedPrompt = normalizePromptValue(prompt);
    return normalizedPrompt.startsWith(STYLED_PROMPT_PREFIX) && normalizedPrompt.includes(SUBJECT_REQUEST_PREFIX);
};

export const buildBaseImagePrompt = (
    options: Pick<StylePromptBuilderOptions, 'prompt' | 'objectImageInputs' | 'characterImageInputs'>,
): string => {
    const trimmedPrompt = options.prompt.trim();
    if (trimmedPrompt) {
        return trimmedPrompt;
    }

    return hasReferenceImages(options) ? DEFAULT_REFERENCE_IMAGE_PROMPT : DEFAULT_TEXT_TO_IMAGE_PROMPT;
};

export const buildStyleAwareImagePrompt = (options: StylePromptBuilderOptions): string => {
    const basePrompt = buildBaseImagePrompt(options);

    if (!options.style || options.style === 'None') {
        return basePrompt;
    }

    if (isStructuredStyledPrompt(basePrompt)) {
        return basePrompt;
    }

    const styleTransferPrompt = buildStyleTransferPrompt(options.style);
    if (normalizePromptValue(basePrompt) === normalizePromptValue(styleTransferPrompt)) {
        return basePrompt;
    }

    return [
        `${STYLED_PROMPT_PREFIX} ${getStyleDefaultLabel(options.style)}.`,
        `Style directive: ${getStylePromptDirective(options.style)}`,
        `Style anchors: ${getStylePromptDescriptor(options.style)}.`,
        GOVERNING_STYLE_RULE,
        `${SUBJECT_REQUEST_PREFIX} ${basePrompt}`,
    ].join('\n');
};
