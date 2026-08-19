const normalizeApiKey = (value: unknown): string | null => {
    if (typeof value !== 'string') {
        return null;
    }

    const normalizedValue = value.trim();
    return normalizedValue.length > 0 ? normalizedValue : null;
};

const getAiStudioHost = (): AiStudioHost | null => {
    if (typeof window === 'undefined') {
        return null;
    }

    return window.aistudio || null;
};

export const getEnvGeminiApiKey = (): string | null => {
    return normalizeApiKey(process.env.API_KEY) || normalizeApiKey(process.env.GEMINI_API_KEY);
};

export const resolveGeminiApiKey = (): string | null => getEnvGeminiApiKey();

export const hasConfiguredGeminiApiKey = async (): Promise<boolean> => {
    const aiStudioHost = getAiStudioHost();
    if (typeof aiStudioHost?.hasSelectedApiKey === 'function') {
        const hasSelected = await aiStudioHost.hasSelectedApiKey();
        if (hasSelected) {
            return true;
        }
    }

    return Boolean(resolveGeminiApiKey());
};

export const promptForGeminiApiKey = async (): Promise<void> => {
    const aiStudioHost = getAiStudioHost();
    if (typeof aiStudioHost?.openSelectKey === 'function') {
        await aiStudioHost.openSelectKey();
    }
};
