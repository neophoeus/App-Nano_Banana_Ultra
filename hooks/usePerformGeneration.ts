import { useCallback, MutableRefObject } from 'react';
import {
    AspectRatio,
    ConversationRequestContext,
    ExecutionMode,
    GenerationLineageContext,
    ImageSize,
    ImageStyle,
    ImageModel,
    GeneratedImage as GeneratedImageType,
    OutputFormat,
    StructuredOutputMode,
    ThinkingLevel,
} from '../types';
import { generateImageWithGemini, checkApiKey, promptForApiKey } from '../services/geminiService';
import { buildSavedImageLoadUrl, saveImageToLocal, generateThumbnail } from '../utils/imageSaveUtils';
import { deriveExecutionMode } from '../utils/executionMode';
import { sanitizeSessionHintsForStorage } from '../utils/inlineImageDisplay';

const MODEL_TRANSLATION_KEYS: Record<ImageModel, string> = {
    'gemini-3.1-flash-image-preview': 'modelGemini31Flash',
    'gemini-3-pro-image-preview': 'modelGemini3Pro',
    'gemini-2.5-flash-image': 'modelGemini25Flash',
};

function getModelLabel(t: (key: string) => string, model: ImageModel): string {
    return t(MODEL_TRANSLATION_KEYS[model]);
}

interface UsePerformGenerationProps {
    t: (key: string) => string;
    apiKeyReady: boolean;
    setApiKeyReady: (val: boolean) => void;
    handleApiKeyConnect: () => Promise<boolean>;
    setIsGenerating: (val: boolean) => void;
    setError: (val: string | null) => void;
    setGeneratedImageUrls: (val: React.SetStateAction<string[]>) => void;
    setSelectedImageIndex: (val: number) => void;
    setLogs: (val: React.SetStateAction<string[]>) => void;
    addLog: (msg: string) => void;
    abortControllerRef: MutableRefObject<AbortController | null>;
    objectImages: string[];
    characterImages: string[];
    batchSize: number;
    aspectRatio: AspectRatio;
    outputFormat: OutputFormat;
    structuredOutputMode: StructuredOutputMode;
    temperature: number;
    thinkingLevel: ThinkingLevel;
    includeThoughts: boolean;
    googleSearch: boolean;
    imageSearch: boolean;
    setBatchProgress: (val: { completed: number; total: number }) => void;
    setGenerationMode: (val: string) => void;
    setExecutionMode: (val: ExecutionMode) => void;
    setDisplaySettings: (val: any) => void;
    showNotification: (msg: string, type?: 'info' | 'error') => void;
    setHistory: (val: React.SetStateAction<GeneratedImageType[]>) => void;
    setIsEditing: (val: boolean) => void;
    setEditingImageSource: (val: string | null) => void;
    addPromptToHistory: (prompt: string) => void;
    getGenerationLineageContext?: (params: { mode: string; editingInput?: string }) => GenerationLineageContext | null;
    getConversationRequestContext?: (params: {
        mode: string;
        editingInput?: string;
        batchSize: number;
    }) => ConversationRequestContext | null;
}

export function usePerformGeneration(options: UsePerformGenerationProps) {
    const {
        t,
        apiKeyReady,
        setApiKeyReady,
        handleApiKeyConnect,
        setIsGenerating,
        setError,
        setGeneratedImageUrls,
        setSelectedImageIndex,
        setLogs,
        addLog,
        abortControllerRef,
        objectImages,
        characterImages,
        batchSize,
        aspectRatio,
        outputFormat,
        structuredOutputMode,
        temperature,
        thinkingLevel,
        includeThoughts,
        googleSearch,
        imageSearch,
        setBatchProgress,
        setGenerationMode,
        setExecutionMode,
        setDisplaySettings,
        showNotification,
        setHistory,
        setIsEditing,
        setEditingImageSource,
        addPromptToHistory,
        getGenerationLineageContext,
        getConversationRequestContext,
    } = options;

    const performGeneration = useCallback(
        async (
            targetPrompt: string,
            targetRatio: AspectRatio | undefined,
            targetSize: ImageSize,
            targetStyle: ImageStyle,
            targetModel: ImageModel,
            editingInput?: string,
            customBatchSize?: number,
            customSize?: ImageSize,
            explicitMode?: string,
            extraObjectImages?: string[],
            extraCharacterImages?: string[],
        ) => {
            const isStyleTransfer =
                (objectImages.length > 0 || characterImages.length > 0) && targetStyle !== 'None' && !editingInput;

            if (!targetPrompt.trim() && !editingInput && !isStyleTransfer) {
                showNotification(t('errorNoPrompt'), 'error');
                return;
            }

            let finalPrompt = targetPrompt;
            if (isStyleTransfer && !finalPrompt.trim()) {
                finalPrompt = `Transform the visual content of the reference image into ${targetStyle} style. Maintain the original composition but apply the ${targetStyle} aesthetic characteristics strongly.`;
                addLog(t('logAutoFillStyle'));
            }

            if (!apiKeyReady) {
                const connected = await handleApiKeyConnect();
                if (!connected) return;
                const ready = await checkApiKey();
                if (!ready) return;
                setApiKeyReady(true);
            }

            setIsGenerating(true);
            setError(null);
            setGeneratedImageUrls([]);
            setSelectedImageIndex(0);
            setLogs([]);

            const controller = new AbortController();
            abortControllerRef.current = controller;

            let finalObjectInputs: string[] = [];
            let finalCharacterInputs: string[] = [];

            if (editingInput) {
                finalObjectInputs = [editingInput];
                if (extraObjectImages && extraObjectImages.length > 0) {
                    finalObjectInputs = [...finalObjectInputs, ...extraObjectImages];
                }
                if (extraCharacterImages && extraCharacterImages.length > 0) {
                    finalCharacterInputs = [...extraCharacterImages];
                }
            } else {
                if (objectImages.length > 0) finalObjectInputs = objectImages;
                if (characterImages.length > 0) finalCharacterInputs = characterImages;
            }

            const currentBatchSize = customBatchSize !== undefined ? customBatchSize : batchSize;
            const currentImageSize = customSize || targetSize;
            const conversationContext =
                getConversationRequestContext?.({
                    mode: explicitMode,
                    editingInput,
                    batchSize: currentBatchSize,
                }) || null;
            const currentExecutionMode = conversationContext
                ? 'chat-continuation'
                : deriveExecutionMode(currentBatchSize);
            const variantGroupId = currentExecutionMode === 'interactive-batch-variants' ? crypto.randomUUID() : null;

            setBatchProgress({ completed: 0, total: currentBatchSize });

            let currentMode = explicitMode;
            if (!currentMode) {
                if (editingInput) currentMode = 'Inpainting';
                else if (objectImages.length > 0 || characterImages.length > 0) currentMode = 'Image to Image/Mixing';
                else currentMode = 'Text to Image';
            }
            const generationLineage = getGenerationLineageContext?.({ mode: currentMode, editingInput }) || null;
            setGenerationMode(currentMode);
            setExecutionMode(currentExecutionMode);

            const effectiveAspectRatio = editingInput ? targetRatio : targetRatio || aspectRatio;

            setDisplaySettings({
                prompt: finalPrompt,
                aspectRatio: effectiveAspectRatio || '1:1',
                size: currentImageSize,
                style: targetStyle,
                batchSize: currentBatchSize,
                model: targetModel,
                outputFormat,
                structuredOutputMode,
                temperature,
                thinkingLevel,
                includeThoughts,
                googleSearch,
                imageSearch,
            });

            try {
                addLog(t('logMode').replace('{0}', currentMode));
                addLog(t('logSource').replace('{0}', getModelLabel(t, targetModel)));
                addLog(t('logRequesting').replace('{0}', currentBatchSize.toString()).replace('{1}', currentImageSize));

                const handleImageReceived = async (url: string): Promise<string | undefined> => {
                    const metadata = {
                        prompt: finalPrompt,
                        style: targetStyle,
                        aspectRatio: effectiveAspectRatio || '1:1',
                        size: currentImageSize,
                        mode: currentMode,
                    };
                    const prefix = editingInput ? `${targetModel}-edit` : `${targetModel}-gen`;
                    const savedPath = await saveImageToLocal(url, prefix, metadata);
                    const filename = savedPath?.split(/[\\/]/).pop();
                    const displayUrl = filename ? buildSavedImageLoadUrl(filename) : url;

                    setGeneratedImageUrls((prev: string[]) => [...prev, displayUrl]);

                    if (filename) {
                        addLog(t('logSaved').replace('{0}', filename || ''));
                        return filename;
                    } else {
                        addLog(t('logAutoSaveFailed'));
                        return undefined;
                    }
                };

                const handleLogCallback = (msg: string) => addLog(msg);

                const results = await generateImageWithGemini(
                    {
                        prompt: finalPrompt,
                        aspectRatio: effectiveAspectRatio,
                        imageSize: currentImageSize,
                        style: targetStyle,
                        objectImageInputs: finalObjectInputs,
                        characterImageInputs: finalCharacterInputs,
                        model: targetModel,
                        outputFormat,
                        structuredOutputMode,
                        temperature,
                        thinkingLevel,
                        includeThoughts,
                        googleSearch,
                        imageSearch,
                        executionMode: currentExecutionMode,
                        conversationContext,
                    },
                    currentBatchSize,
                    handleImageReceived,
                    handleLogCallback,
                    controller.signal,
                    (completed, total) => setBatchProgress({ completed, total }),
                );

                const newHistoryItems: GeneratedImageType[] = [];
                for (const res of results) {
                    let thumbnailUrl = '';
                    const sanitizedSessionHints = sanitizeSessionHintsForStorage(res.sessionHints || null);
                    if (res.status === 'success' && res.url) {
                        try {
                            thumbnailUrl = await generateThumbnail(res.url);
                        } catch {
                            thumbnailUrl = res.url;
                        }
                    }

                    newHistoryItems.push({
                        id: crypto.randomUUID(),
                        url: thumbnailUrl,
                        prompt: finalPrompt || 'Auto-fill',
                        aspectRatio: effectiveAspectRatio || '1:1',
                        size: currentImageSize,
                        style: targetStyle,
                        model: targetModel,
                        createdAt: Date.now(),
                        mode: currentMode,
                        executionMode: currentExecutionMode,
                        variantGroupId,
                        status: res.status,
                        error: res.error,
                        savedFilename: res.savedFilename,
                        text: res.text,
                        thoughts: res.thoughts,
                        structuredData: res.structuredData,
                        metadata: res.metadata,
                        grounding: res.grounding,
                        sessionHints: sanitizedSessionHints || undefined,
                        conversationId: res.conversation?.conversationId || null,
                        conversationBranchOriginId:
                            res.conversation?.branchOriginId || conversationContext?.branchOriginId || null,
                        conversationSourceHistoryId: conversationContext?.activeSourceHistoryId || null,
                        conversationTurnIndex:
                            currentExecutionMode === 'chat-continuation'
                                ? conversationContext?.priorTurns.length || 0
                                : null,
                        parentHistoryId: generationLineage?.parentHistoryId || null,
                        rootHistoryId: generationLineage?.rootHistoryId || null,
                        sourceHistoryId: generationLineage?.sourceHistoryId || null,
                        lineageAction: generationLineage?.lineageAction || 'root',
                        lineageDepth: generationLineage?.lineageDepth || 0,
                    } as GeneratedImageType);
                }

                setHistory((prev: GeneratedImageType[]) => [...newHistoryItems, ...prev]);

                const successCount = results.filter((r) => r.status === 'success').length;
                const failCount = results.filter((r) => r.status === 'failed').length;

                if (successCount === 0 && failCount > 0) {
                    setError(results[0].error || t('errorAllFailed'));
                }

                if (editingInput && successCount > 0) {
                    setIsEditing(false);
                    setEditingImageSource(null);
                }

                addLog(
                    t('logSuccessFail').replace('{0}', successCount.toString()).replace('{1}', failCount.toString()),
                );

                if (successCount > 0 && finalPrompt) {
                    addPromptToHistory(finalPrompt);
                }
            } catch (err: any) {
                console.error(err);
                const errorMessage = err.message || 'Unknown error';

                if (errorMessage === 'API_KEY_INVALID' || errorMessage.includes('API key')) {
                    addLog(t('logFatalError').replace('{0}', errorMessage));
                    setError(t('errorApiKey'));
                    setApiKeyReady(false);
                    await promptForApiKey();
                } else {
                    setError(errorMessage);
                    showNotification(t('statusFailed'), 'error');
                }
            } finally {
                setIsGenerating(false);
                abortControllerRef.current = null;
                setBatchProgress({ completed: 0, total: 0 });
            }
        },
        [
            abortControllerRef,
            addLog,
            addPromptToHistory,
            apiKeyReady,
            aspectRatio,
            batchSize,
            characterImages,
            getConversationRequestContext,
            getGenerationLineageContext,
            googleSearch,
            handleApiKeyConnect,
            imageSearch,
            includeThoughts,
            objectImages,
            outputFormat,
            setApiKeyReady,
            setBatchProgress,
            setDisplaySettings,
            setEditingImageSource,
            setError,
            setExecutionMode,
            setGeneratedImageUrls,
            setGenerationMode,
            setHistory,
            setIsEditing,
            setIsGenerating,
            setLogs,
            setSelectedImageIndex,
            showNotification,
            structuredOutputMode,
            t,
            temperature,
            thinkingLevel,
        ],
    );

    return { performGeneration };
}
