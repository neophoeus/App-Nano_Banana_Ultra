import { Dispatch, SetStateAction, useCallback, useRef, useState } from 'react';
import {
    abortActivePromptTools,
    consumeLastPromptToolExecutionMeta,
    enhancePromptWithGemini,
    generatePromptFromImage,
    generateRandomPrompt,
} from '../services/geminiService';
import type { OptimizationMode, PromptThinkingLevel } from '../types';
import { prepareImageAssetFromFile } from '../utils/imageSaveUtils';
import { resolveEffectivePromptThinkingLevel, resolveImageToPromptMaxDimension } from '../utils/optimizationMode';
import { Language } from '../utils/translations';

type PromptToolId = 'image-to-prompt' | 'inspiration' | 'rewrite';

function notifyPromptToolFallback(
    showNotification: (msg: string, type: 'info' | 'error') => void,
    addLog: (msg: string) => void,
    t: (key: string) => string,
): void {
    const meta = consumeLastPromptToolExecutionMeta();
    if (!meta?.isFallback) {
        return;
    }

    let messageKey = 'promptToolFallbackModelNotice';
    if (meta.fallbackReason === 'tier-fallback') {
        messageKey = 'promptToolFallbackPaidTierNotice';
    }

    const message = t(messageKey);
    showNotification(message, 'info');
    addLog(message);
}

interface UsePromptToolsOptions {
    currentLanguage: Language;
    prompt: string;
    promptThinkingLevel?: PromptThinkingLevel;
    optimizationMode?: OptimizationMode;
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
    cancelPromptTools: () => void;
}

const isAbortPromptToolError = (error: unknown): boolean =>
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && (error.name === 'AbortError' || error.message === 'ABORTED'));

/**
 * Custom hook for AI-powered prompt tools (rewrite and random generation).
 * Extracts prompt enhancement logic from App.tsx.
 */
export function usePromptTools({
    currentLanguage,
    prompt,
    promptThinkingLevel = 'low',
    optimizationMode,
    setPrompt,
    addLog,
    showNotification,
    t,
    apiKeyReady,
    handleApiKeyConnect,
}: UsePromptToolsOptions): UsePromptToolsReturn {
    const [isEnhancingPrompt, setIsEnhancingPrompt] = useState(false);
    const [activePromptTool, setActivePromptTool] = useState<PromptToolId | null>(null);
    const requestSequenceRef = useRef(0);

    const cancelPromptTools = useCallback(() => {
        requestSequenceRef.current += 1;
        abortActivePromptTools?.();
        setIsEnhancingPrompt(false);
        setActivePromptTool(null);
    }, []);

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

        const requestId = ++requestSequenceRef.current;
        setActivePromptTool('rewrite');
        setIsEnhancingPrompt(true);
        try {
            const effectiveThinkingLevel = resolveEffectivePromptThinkingLevel(promptThinkingLevel, optimizationMode);
            const enhanced =
                optimizationMode !== undefined
                    ? await enhancePromptWithGemini(prompt, currentLanguage, effectiveThinkingLevel, optimizationMode)
                    : await enhancePromptWithGemini(prompt, currentLanguage, effectiveThinkingLevel);
            if (requestId !== requestSequenceRef.current) {
                return;
            }
            setPrompt(enhanced);
            addLog(t('logRewriteOk'));
            notifyPromptToolFallback(showNotification, addLog, t);
        } catch (e) {
            if (requestId !== requestSequenceRef.current || isAbortPromptToolError(e)) {
                return;
            }
            console.error(e);
            showNotification(t('logRewriteFailed'), 'error');
            addLog(t('logRewriteFailed'));
        } finally {
            if (requestId === requestSequenceRef.current) {
                setIsEnhancingPrompt(false);
                setActivePromptTool(null);
            }
        }
    }, [
        apiKeyReady,
        currentLanguage,
        handleApiKeyConnect,
        addLog,
        optimizationMode,
        prompt,
        promptThinkingLevel,
        setPrompt,
        showNotification,
        t,
    ]);

    const handleSurpriseMe = useCallback(async () => {
        if (!apiKeyReady) {
            const ready = await handleApiKeyConnect();
            if (!ready) {
                return;
            }
        }
        const requestId = ++requestSequenceRef.current;
        setActivePromptTool('inspiration');
        setIsEnhancingPrompt(true);
        try {
            const effectiveThinkingLevel = resolveEffectivePromptThinkingLevel(promptThinkingLevel, optimizationMode);
            const randomPrompt =
                optimizationMode !== undefined
                    ? await generateRandomPrompt(currentLanguage, effectiveThinkingLevel, optimizationMode)
                    : await generateRandomPrompt(currentLanguage, effectiveThinkingLevel);
            if (requestId !== requestSequenceRef.current) {
                return;
            }
            setPrompt(randomPrompt);
            addLog(t('logRandomOk'));
            notifyPromptToolFallback(showNotification, addLog, t);
        } catch (e) {
            if (requestId !== requestSequenceRef.current || isAbortPromptToolError(e)) {
                return;
            }
            console.error(e);
            showNotification(t('logRandomFailed'), 'error');
            addLog(t('logRandomFailed'));
        } finally {
            if (requestId === requestSequenceRef.current) {
                setIsEnhancingPrompt(false);
                setActivePromptTool(null);
            }
        }
    }, [
        apiKeyReady,
        currentLanguage,
        handleApiKeyConnect,
        addLog,
        optimizationMode,
        promptThinkingLevel,
        setPrompt,
        showNotification,
        t,
    ]);

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

            const requestId = ++requestSequenceRef.current;
            setActivePromptTool('image-to-prompt');
            setIsEnhancingPrompt(true);
            try {
                const maxDimension = resolveImageToPromptMaxDimension(optimizationMode);
                const preparedImage = await prepareImageAssetFromFile(file, maxDimension);
                if (requestId !== requestSequenceRef.current) {
                    return;
                }
                const effectiveThinkingLevel = resolveEffectivePromptThinkingLevel(
                    promptThinkingLevel,
                    optimizationMode,
                );
                const generatedPrompt =
                    optimizationMode !== undefined
                        ? await generatePromptFromImage(
                              preparedImage.dataUrl,
                              currentLanguage,
                              effectiveThinkingLevel,
                              optimizationMode,
                          )
                        : await generatePromptFromImage(preparedImage.dataUrl, currentLanguage, effectiveThinkingLevel);
                if (requestId !== requestSequenceRef.current) {
                    return;
                }
                setPrompt(generatedPrompt);
                addLog(t('logImageToPromptOk'));
                notifyPromptToolFallback(showNotification, addLog, t);
            } catch (error) {
                if (requestId !== requestSequenceRef.current || isAbortPromptToolError(error)) {
                    return;
                }
                console.error(error);
                if (error instanceof Error && /invalid image|failed to read|failed to load/i.test(error.message)) {
                    showNotification(t('errInvalidImage'), 'error');
                } else {
                    showNotification(t('logImageToPromptFailed'), 'error');
                }
                addLog(t('logImageToPromptFailed'));
            } finally {
                if (requestId === requestSequenceRef.current) {
                    setIsEnhancingPrompt(false);
                    setActivePromptTool(null);
                }
            }
        },
        [
            apiKeyReady,
            currentLanguage,
            handleApiKeyConnect,
            addLog,
            optimizationMode,
            promptThinkingLevel,
            setPrompt,
            showNotification,
            t,
        ],
    );

    return {
        isEnhancingPrompt,
        activePromptTool,
        handleSmartRewrite,
        handleSurpriseMe,
        handleImageToPrompt,
        cancelPromptTools,
    };
}
