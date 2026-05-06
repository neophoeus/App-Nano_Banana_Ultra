export type GenerationModeKind =
    | 'text-to-image'
    | 'reference-image-generation'
    | 'follow-up-edit'
    | 'editor-edit'
    | 'retouch'
    | 'reframe'
    | 'unknown';

const normalizeModeValue = (mode?: string | null): string => mode?.trim().toLowerCase() || '';

const includesAny = (value: string, candidates: string[]): boolean =>
    candidates.some((candidate) => value.includes(candidate));

export const normalizeGenerationModeKind = (mode?: string | null): GenerationModeKind => {
    const normalizedMode = normalizeModeValue(mode);

    if (!normalizedMode) {
        return 'text-to-image';
    }

    if (includesAny(normalizedMode, ['editor edit', 'editor-edit', 'editor re-render', 'editor rerender'])) {
        return 'editor-edit';
    }

    if (includesAny(normalizedMode, ['follow-up', 'follow up', 'followup'])) {
        return 'follow-up-edit';
    }

    if (includesAny(normalizedMode, ['image to image', 'img2img', 'mixing', 'reference image'])) {
        return 'reference-image-generation';
    }

    if (includesAny(normalizedMode, ['text to image', 'text-to-image', 'txt2img'])) {
        return 'text-to-image';
    }

    if (includesAny(normalizedMode, ['inpaint', 'inpainting', 'retouch'])) {
        return 'retouch';
    }

    if (includesAny(normalizedMode, ['outpaint', 'outpainting', 'reframe', 'reposition', 'upscale', 'refine'])) {
        return 'reframe';
    }

    return 'unknown';
};

export const getGenerationModeTranslationKey = (mode?: string | null): string | null => {
    switch (normalizeGenerationModeKind(mode)) {
        case 'text-to-image':
            return 'generationModeTextToImage';
        case 'reference-image-generation':
            return 'generationModeReferenceImage';
        case 'follow-up-edit':
            return 'workspaceViewerFollowUpEdit';
        case 'editor-edit':
            return 'generationModeEditorEdit';
        case 'retouch':
            return 'modeInpaint';
        case 'reframe':
            return 'modeOutpaint';
        default:
            return null;
    }
};

export const resolveGenerationModeLabel = (
    mode: string | null | undefined,
    translate: (key: string) => string,
): string => {
    const translationKey = getGenerationModeTranslationKey(mode);
    return translationKey ? translate(translationKey) : mode?.trim() || '';
};

export const isEditingGenerationMode = (mode?: string | null, editingInput?: string | null): boolean => {
    if (editingInput) {
        return true;
    }

    const kind = normalizeGenerationModeKind(mode);
    return kind === 'editor-edit' || kind === 'retouch' || kind === 'reframe';
};
