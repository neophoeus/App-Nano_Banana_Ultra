import { useState, useCallback } from 'react';
import { enhancePromptWithGemini, generateRandomPrompt } from '../services/geminiService';

interface UsePromptToolsOptions {
    getLanguageLabel: () => string;
    addLog: (msg: string) => void;
    showNotification: (msg: string, type: 'info' | 'error') => void;
    t: (key: string) => string;
    apiKeyReady: boolean;
    handleApiKeyConnect: () => Promise<boolean>;
}

interface UsePromptToolsReturn {
    isEnhancingPrompt: boolean;
    handleSmartRewrite: (prompt: string, setPrompt: (p: string) => void) => Promise<void>;
    handleSurpriseMe: (setPrompt: (p: string) => void) => Promise<void>;
}

/**
 * Custom hook for AI-powered prompt tools (rewrite and random generation).
 * Extracts prompt enhancement logic from App.tsx.
 */
export function usePromptTools({
    getLanguageLabel,
    addLog,
    showNotification,
    t,
    apiKeyReady,
    handleApiKeyConnect,
}: UsePromptToolsOptions): UsePromptToolsReturn {
    const [isEnhancingPrompt, setIsEnhancingPrompt] = useState(false);

    const handleSmartRewrite = useCallback(async (prompt: string, setPrompt: (p: string) => void) => {
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

        setIsEnhancingPrompt(true);
        try {
            const enhanced = await enhancePromptWithGemini(prompt, getLanguageLabel());
            setPrompt(enhanced);
            addLog(t('logRewriteOk'));
        } catch (e) {
            console.error(e);
            addLog(t('logRewriteFailed'));
        } finally {
            setIsEnhancingPrompt(false);
        }
    }, [apiKeyReady, handleApiKeyConnect, getLanguageLabel, addLog, showNotification, t]);

    const handleSurpriseMe = useCallback(async (setPrompt: (p: string) => void) => {
        if (!apiKeyReady) {
            const ready = await handleApiKeyConnect();
            if (!ready) {
                return;
            }
        }
        setIsEnhancingPrompt(true);
        try {
            const randomPrompt = await generateRandomPrompt(getLanguageLabel());
            setPrompt(randomPrompt);
            addLog(t('logRandomOk'));
        } catch (e) {
            console.error(e);
            addLog(t('logRandomFailed'));
        } finally {
            setIsEnhancingPrompt(false);
        }
    }, [apiKeyReady, handleApiKeyConnect, getLanguageLabel, addLog, t]);

    return {
        isEnhancingPrompt,
        handleSmartRewrite,
        handleSurpriseMe,
    };
}
