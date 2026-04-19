import { Dispatch, SetStateAction, useCallback, useState } from 'react';
import { enhancePromptWithGemini, generatePromptFromImage, generateRandomPrompt } from '../services/geminiService';
import { prepareImageAssetFromFile } from '../utils/imageSaveUtils';
import { Language } from '../utils/translations';

const IMAGE_TO_PROMPT_MAX_DIMENSION = 2048;
type PromptToolId = 'image-to-prompt' | 'inspiration' | 'rewrite';

interface UsePromptToolsOptions {
    currentLanguage: Language;
    prompt: string;
    setPrompt: Dispatch<SetStateAction<string>>;
    addLog: (msg: string) => void;
    showNotification: (msg: string, type: 'info' | 'error') => void;
    t: (key: string) => string;
    apiKeyReady: boolean;
    handleApiKeyConnect: () => Promise<boolean>;
}

interface UsePromptToolsReturn {
    isEnhancingPrompt: boolean;
    activePromptTool: PromptToolId | null;
    handleSmartRewrite: () => Promise<void>;
    handleSurpriseMe: () => Promise<void>;
    handleImageToPrompt: (file: File) => Promise<void>;
}

/**
 * Custom hook for AI-powered prompt tools (rewrite and random generation).
 * Extracts prompt enhancement logic from App.tsx.
 */
export function usePromptTools({
    currentLanguage,
    prompt,
    setPrompt,
    addLog,
    showNotification,
    t,
    apiKeyReady,
    handleApiKeyConnect,
}: UsePromptToolsOptions): UsePromptToolsReturn {
    const [isEnhancingPrompt, setIsEnhancingPrompt] = useState(false);
    const [activePromptTool, setActivePromptTool] = useState<PromptToolId | null>(null);

    const handleSmartRewrite = useCallback(async () => {
        if (!prompt.trim()) {
            showNotification(t('errEnterIdea'), 'error');
            return;
        }
        if (!apiKeyReady) {
            const ready = await handleApiKeyConnect();
            if (!ready) {
                return;
            }
        }

        setActivePromptTool('rewrite');
        setIsEnhancingPrompt(true);
        try {
            const enhanced = await enhancePromptWithGemini(prompt, currentLanguage);
            setPrompt(enhanced);
            addLog(t('logRewriteOk'));
        } catch (e) {
            console.error(e);
            showNotification(t('logRewriteFailed'), 'error');
            addLog(t('logRewriteFailed'));
        } finally {
            setIsEnhancingPrompt(false);
            setActivePromptTool(null);
        }
    }, [apiKeyReady, currentLanguage, handleApiKeyConnect, addLog, prompt, setPrompt, showNotification, t]);

    const handleSurpriseMe = useCallback(async () => {
        if (!apiKeyReady) {
            const ready = await handleApiKeyConnect();
            if (!ready) {
                return;
            }
        }
        setActivePromptTool('inspiration');
        setIsEnhancingPrompt(true);
        try {
            const randomPrompt = await generateRandomPrompt(currentLanguage);
            setPrompt(randomPrompt);
            addLog(t('logRandomOk'));
        } catch (e) {
            console.error(e);
            addLog(t('logRandomFailed'));
        } finally {
            setIsEnhancingPrompt(false);
            setActivePromptTool(null);
        }
    }, [apiKeyReady, currentLanguage, handleApiKeyConnect, addLog, setPrompt, t]);

    const handleImageToPrompt = useCallback(
        async (file: File) => {
            if (!file.type.startsWith('image/')) {
                showNotification(t('errInvalidImage'), 'error');
                return;
            }

            if (!apiKeyReady) {
                const ready = await handleApiKeyConnect();
                if (!ready) {
                    return;
                }
            }

            setActivePromptTool('image-to-prompt');
            setIsEnhancingPrompt(true);
            try {
                const preparedImage = await prepareImageAssetFromFile(file, IMAGE_TO_PROMPT_MAX_DIMENSION);
                const generatedPrompt = await generatePromptFromImage(preparedImage.dataUrl, currentLanguage);
                setPrompt(generatedPrompt);
                addLog(t('logImageToPromptOk'));
            } catch (error) {
                console.error(error);
                if (error instanceof Error && /invalid image|failed to read|failed to load/i.test(error.message)) {
                    showNotification(t('errInvalidImage'), 'error');
                } else {
                    showNotification(t('logImageToPromptFailed'), 'error');
                }
                addLog(t('logImageToPromptFailed'));
            } finally {
                setIsEnhancingPrompt(false);
                setActivePromptTool(null);
            }
        },
        [apiKeyReady, currentLanguage, handleApiKeyConnect, addLog, setPrompt, showNotification, t],
    );

    return {
        isEnhancingPrompt,
        activePromptTool,
        handleSmartRewrite,
        handleSurpriseMe,
        handleImageToPrompt,
    };
}
