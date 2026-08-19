interface AiStudioHost {
    hasSelectedApiKey?: () => boolean | Promise<boolean>;
    openSelectKey?: () => void | Promise<void>;
}

interface Window {
    aistudio?: AiStudioHost;
}

declare namespace NodeJS {
    interface ProcessEnv {
        API_KEY?: string;
        GEMINI_API_KEY?: string;
    }
}
