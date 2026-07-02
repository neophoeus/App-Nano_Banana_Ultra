import { useCallback, MutableRefObject } from 'react';
import {
    AspectRatio,
    BatchPreviewTile,
    ConversationRequestContext,
    ExecutionMode,
    GenerationFailureDisplayContext,
    StageErrorState,
    GenerationLineageContext,
    ImageReceivedResult,
    ImageSize,
    ImageStyle,
    ImageModel,
    GeneratedImage as GeneratedImageType,
    OutputFormat,
    ResultPart,
    ResultImagePart,
    SafetyThresholds,
    ThinkingLevel,
} from '../types';
import {
    GenerationLiveProgressEvent,
    GenerationResult,
    generateImageWithGemini,
    checkApiKey,
    promptForApiKey,
} from '../services/geminiService';
import { emitDebugTerminalEvent } from '../utils/debugTerminalEvents';
import { buildStageErrorState, getGenerationFailure } from '../utils/generationFailure';
import {
    buildSavedImageLoadUrl,
    extractSavedFilename,
    persistHistoryThumbnail,
    saveImageToLocal,
} from '../utils/imageSaveUtils';
import { buildImageSidecarMetadata, normalizeImageSidecarMetadata } from '../utils/imageSidecarMetadata';
import { deriveExecutionMode } from '../utils/executionMode';
import { sanitizeSessionHintsForStorage } from '../utils/inlineImageDisplay';
import {
    buildResultPartFilenameStem as buildSavedResultPartFilenameStem,
    buildSavedImageFilenameStem,
} from '../utils/savedImageFilename';
import { buildStyleTransferPrompt } from '../utils/styleRegistry';

const MODEL_TRANSLATION_KEYS: Record<ImageModel, string> = {
    'gemini-3.1-flash-image': 'modelGemini31Flash',
    'gemini-3.1-flash-lite-image': 'modelGemini31FlashLite',
    'gemini-3-pro-image': 'modelGemini3Pro',
    'gemini-2.5-flash-image': 'modelGemini25Flash',
};

function getModelLabel(t: (key: string) => string, model: ImageModel): string {
    return t(MODEL_TRANSLATION_KEYS[model]);
}

function getBatchResultIndex(item: GeneratedImageType): number {
    const candidateIndex = item.metadata?.batchResultIndex;
    return typeof candidateIndex === 'number' && Number.isFinite(candidateIndex) ? candidateIndex : -1;
}

function sortBatchHistoryItemsByVisualOrder(items: GeneratedImageType[]): GeneratedImageType[] {
    return [...items].sort((leftItem, rightItem) => {
        const leftIndex = getBatchResultIndex(leftItem);
        const rightIndex = getBatchResultIndex(rightItem);

        if (leftIndex !== rightIndex) {
            return rightIndex - leftIndex;
        }

        return rightItem.createdAt - leftItem.createdAt;
    });
}

function buildFailureDisplayContext(
    result: { status?: string; failure?: { code: string } | null },
    batchHasSiblingSafetyBlockedFailure: boolean,
): GenerationFailureDisplayContext | undefined {
    if (
        result.status === 'failed' &&
        result.failure?.code === 'empty-response' &&
        batchHasSiblingSafetyBlockedFailure
    ) {
        return {
            hasSiblingSafetyBlockedFailure: true,
        };
    }

    return undefined;
}

function isCancelledGenerationResult(result: GenerationResult): boolean {
    return result.status === 'failed' && (result.error === 'Generation cancelled' || result.error === 'ABORTED');
}

function isAbortGenerationMessage(message: string): boolean {
    return message === 'ABORTED' || message === 'Generation cancelled';
}

async function persistResultParts(
    resultParts: ResultPart[] | undefined,
    options: {
        model: ImageModel;
        mode: string;
        prefix: string;
        slotIndex: number;
        requestCreatedAt: Date;
        requestId: string;
        sourceSavedFilename?: string;
        primaryOutputImageUrl?: string;
        primaryOutputDisplayUrl?: string;
        primaryOutputSavedFilename?: string;
    },
): Promise<ResultPart[] | undefined> {
    if (!resultParts?.length) {
        return undefined;
    }

    return Promise.all(
        resultParts.map(async (part) => {
            if (part.kind === 'thought-text' || part.kind === 'output-text') {
                return part;
            }

            const imagePart = part as ResultImagePart;

            if (options.primaryOutputImageUrl && imagePart.imageUrl === options.primaryOutputImageUrl) {
                return {
                    ...imagePart,
                    imageUrl: options.primaryOutputDisplayUrl || imagePart.imageUrl,
                    savedFilename: options.primaryOutputSavedFilename || imagePart.savedFilename,
                };
            }

            const savedPath = await saveImageToLocal(
                imagePart.imageUrl,
                `${options.prefix}-thought`,
                {
                    kind: imagePart.kind,
                    slotIndex: options.slotIndex,
                    sequence: imagePart.sequence,
                },
                buildSavedResultPartFilenameStem({
                    model: options.model,
                    mode: options.mode,
                    slotIndex: options.slotIndex,
                    createdAt: options.requestCreatedAt,
                    requestId: options.requestId,
                    sequence: imagePart.sequence,
                    sourceSavedFilename: options.sourceSavedFilename,
                }),
            );
            const savedFilename = extractSavedFilename(savedPath);

            if (!savedFilename) {
                return imagePart;
            }

            return {
                ...imagePart,
                imageUrl: buildSavedImageLoadUrl(savedFilename),
                savedFilename,
            };
        }),
    );
}

type GenerationSourceOverride = {
    sourceHistoryId: string | null;
    sourceLineageAction?: 'continue' | 'branch' | null;
};

interface UsePerformGenerationProps {
    t: (key: string) => string;
    apiKeyReady: boolean;
    setApiKeyReady: (val: boolean) => void;
    handleApiKeyConnect: () => Promise<boolean>;
    setIsGenerating: (val: boolean) => void;
    setIsCancelFinalizing?: (val: boolean) => void;
    setError: (val: StageErrorState | null) => void;
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
    temperature: number;
    thinkingLevel: ThinkingLevel;
    includeThoughts: boolean;
    googleSearch: boolean;
    imageSearch: boolean;
    safetyThresholds: SafetyThresholds;
    setBatchProgress: (val: { completed: number; total: number }) => void;
    setGenerationMode: (val: string) => void;
    setExecutionMode: (val: ExecutionMode) => void;
    setDisplaySettings: (val: any) => void;
    showNotification: (msg: string, type?: 'info' | 'error') => void;
    setHistory: (val: React.SetStateAction<GeneratedImageType[]>) => void;
    setIsEditing: (val: boolean) => void;
    setEditingImageSource: (val: string | null) => void;
    getGenerationLineageContext?: (params: {
        mode: string;
        editingInput?: string;
        sourceOverride?: GenerationSourceOverride | null;
    }) => GenerationLineageContext | null;
    getConversationRequestContext?: (params: {
        mode: string;
        editingInput?: string;
        batchSize: number;
        sourceOverride?: GenerationSourceOverride | null;
    }) => ConversationRequestContext | null;
    onBatchPreviewStart?: (args: { sessionId: string; batchSize: number }) => void;
    onBatchPreviewTileUpdate?: (args: { sessionId: string; tile: BatchPreviewTile }) => void;
    onBatchPreviewComplete?: (args: { sessionId: string; historyItems: GeneratedImageType[] }) => void;
    onBatchPreviewClear?: (args: { sessionId: string }) => void;
    onLiveProgressEvent?: (event: GenerationLiveProgressEvent) => void;
    onLiveProgressReset?: () => void;
}

export function usePerformGeneration(options: UsePerformGenerationProps) {
    const {
        t,
        apiKeyReady,
        setApiKeyReady,
        handleApiKeyConnect,
        setIsGenerating,
        setIsCancelFinalizing,
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
        temperature,
        thinkingLevel,
        includeThoughts,
        googleSearch,
        imageSearch,
        safetyThresholds,
        setBatchProgress,
        setGenerationMode,
        setExecutionMode,
        setDisplaySettings,
        showNotification,
        setHistory,
        setIsEditing,
        setEditingImageSource,
        getGenerationLineageContext,
        getConversationRequestContext,
        onBatchPreviewStart,
        onBatchPreviewTileUpdate,
        onBatchPreviewComplete,
        onBatchPreviewClear,
        onLiveProgressEvent,
        onLiveProgressReset,
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
            sourceOverride?: GenerationSourceOverride | null,
        ) => {
            const isStyleTransfer =
                (objectImages.length > 0 || characterImages.length > 0) && targetStyle !== 'None' && !editingInput;

            if (!targetPrompt.trim() && !editingInput && !isStyleTransfer) {
                showNotification(t('errorNoPrompt'), 'error');
                return;
            }

            let finalPrompt = targetPrompt;
            if (isStyleTransfer && !finalPrompt.trim()) {
                finalPrompt = buildStyleTransferPrompt(targetStyle);
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
            setIsCancelFinalizing?.(false);
            setError(null);
            setGeneratedImageUrls([]);
            setSelectedImageIndex(0);
            setLogs([]);
            onLiveProgressReset?.();
            const batchSessionId = crypto.randomUUID();
            let didNotifyBatchPreviewComplete = false;

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
                    mode: explicitMode ?? '',
                    editingInput,
                    batchSize: currentBatchSize,
                    sourceOverride,
                }) || null;
            const currentExecutionMode = conversationContext
                ? 'chat-continuation'
                : deriveExecutionMode(currentBatchSize);
            const variantGroupId = currentExecutionMode === 'interactive-batch-variants' ? crypto.randomUUID() : null;

            setBatchProgress({ completed: 0, total: currentBatchSize });
            onBatchPreviewStart?.({ sessionId: batchSessionId, batchSize: currentBatchSize });

            let currentMode = explicitMode;
            if (!currentMode) {
                if (editingInput) currentMode = 'Inpainting';
                else if (objectImages.length > 0 || characterImages.length > 0) currentMode = 'Image to Image/Mixing';
                else currentMode = 'Text to Image';
            }
            const generationLineage =
                getGenerationLineageContext?.({ mode: currentMode, editingInput, sourceOverride }) || null;
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
                const requestCreatedAt = new Date();
                const requestId = crypto.randomUUID();

                const handleImageReceived = async (url: string, slotIndex: number): Promise<ImageReceivedResult> => {
                    if (controller.signal.aborted) {
                        throw new Error('ABORTED');
                    }

                    const metadata = buildImageSidecarMetadata({
                        prompt: finalPrompt,
                        model: targetModel,
                        style: targetStyle,
                        aspectRatio: effectiveAspectRatio || '1:1',
                        requestedImageSize: currentImageSize,
                        outputFormat,
                        temperature,
                        thinkingLevel,
                        includeThoughts,
                        googleSearch,
                        imageSearch,
                        generationMode: currentMode,
                        executionMode: currentExecutionMode,
                        batchSize: currentBatchSize,
                        batchResultIndex: slotIndex,
                    });
                    const prefix = editingInput ? `${targetModel}-edit` : `${targetModel}-gen`;
                    const savedPath = await saveImageToLocal(
                        url,
                        prefix,
                        metadata,
                        buildSavedImageFilenameStem({
                            model: targetModel,
                            mode: currentMode,
                            slotIndex,
                            createdAt: requestCreatedAt,
                            requestId,
                        }),
                    );
                    const filename = extractSavedFilename(savedPath);
                    const displayUrl = filename ? buildSavedImageLoadUrl(filename) : url;

                    if (controller.signal.aborted) {
                        throw new Error('ABORTED');
                    }

                    onBatchPreviewTileUpdate?.({
                        sessionId: batchSessionId,
                        tile: {
                            id: `${batchSessionId}-${slotIndex}`,
                            slotIndex,
                            status: 'ready',
                            previewUrl: displayUrl,
                            stagePreviewUrl: displayUrl,
                            error: null,
                        },
                    });

                    if (filename) {
                        addLog(t('logSaved').replace('{0}', filename || ''));
                        return {
                            displayUrl,
                            savedFilename: filename,
                        };
                    } else {
                        addLog(t('logAutoSaveFailed'));
                        return {
                            displayUrl,
                        };
                    }
                };

                const handleLogCallback = (msg: string) => {
                    addLog(msg);
                    emitDebugTerminalEvent({
                        kind: 'log',
                        label: msg,
                        summary: msg,
                        source: 'workflow',
                        operation: 'Generation workflow',
                        batchSessionId,
                    });
                };
                const committedSlotIndices = new Set<number>();
                const handleResultCallback = async (res: GenerationResult) => {
                    if (controller.signal.aborted && isCancelledGenerationResult(res)) {
                        return;
                    }

                    if (res.status === 'failed') {
                        onBatchPreviewTileUpdate?.({
                            sessionId: batchSessionId,
                            tile: {
                                id: `${batchSessionId}-${res.slotIndex}`,
                                slotIndex: res.slotIndex,
                                status: 'failed',
                                previewUrl: null,
                                error: res.error || null,
                            },
                        });
                    }

                    const batchResultIndex =
                        typeof res.slotIndex === 'number' && Number.isFinite(res.slotIndex) ? res.slotIndex : 0;

                    if (committedSlotIndices.has(batchResultIndex)) {
                        return;
                    }
                    committedSlotIndices.add(batchResultIndex);

                    const hasSafetyBlocked =
                        (res.status === 'failed' && res.failure?.code === 'safety-blocked') ||
                        batchHistoryItems.some(
                            (item) => item.status === 'failed' && item.failure?.code === 'safety-blocked',
                        );

                    if (hasSafetyBlocked) {
                        batchHistoryItems.forEach((item) => {
                            if (
                                item.status === 'failed' &&
                                item.failure?.code === 'empty-response' &&
                                !item.failureContext?.hasSiblingSafetyBlockedFailure
                            ) {
                                item.failureContext = {
                                    hasSiblingSafetyBlockedFailure: true,
                                };
                                setHistory((prev: GeneratedImageType[]) =>
                                    prev.map((prevItem) =>
                                        prevItem.id === item.id
                                            ? { ...prevItem, failureContext: { hasSiblingSafetyBlockedFailure: true } }
                                            : prevItem,
                                    ),
                                );
                            }
                        });
                    }

                    const currentHasSiblingSafetyBlocked = hasSafetyBlocked;
                    const failureContext = buildFailureDisplayContext(res, currentHasSiblingSafetyBlocked);
                    let thumbnailUrl = '';
                    let thumbnailSavedFilename: string | undefined;
                    let thumbnailInline: boolean | undefined;
                    const sanitizedSessionHints = sanitizeSessionHintsForStorage(res.sessionHints || null);
                    const sidecarMetadata = buildImageSidecarMetadata({
                        prompt: finalPrompt,
                        model: targetModel,
                        style: targetStyle,
                        aspectRatio: effectiveAspectRatio || '1:1',
                        requestedImageSize: currentImageSize,
                        outputFormat,
                        temperature,
                        thinkingLevel,
                        includeThoughts,
                        googleSearch,
                        imageSearch,
                        generationMode: currentMode,
                        executionMode: currentExecutionMode,
                        batchSize: currentBatchSize,
                        batchResultIndex,
                    });
                    const prefix = editingInput ? `${targetModel}-edit` : `${targetModel}-gen`;
                    const persistedResultParts = await persistResultParts(res.resultParts, {
                        model: targetModel,
                        mode: currentMode,
                        prefix,
                        slotIndex: batchResultIndex,
                        requestCreatedAt,
                        requestId,
                        sourceSavedFilename: res.savedFilename,
                        primaryOutputImageUrl: res.url,
                        primaryOutputDisplayUrl: res.displayUrl,
                        primaryOutputSavedFilename: res.savedFilename,
                    });
                    if (res.status === 'success' && res.url) {
                        const persistedThumbnail = await persistHistoryThumbnail(res.url, prefix, res.savedFilename);
                        thumbnailUrl = persistedThumbnail.url;
                        thumbnailSavedFilename = persistedThumbnail.thumbnailSavedFilename;
                        thumbnailInline = persistedThumbnail.thumbnailInline;
                    }

                    const historyItem: GeneratedImageType = {
                        id: crypto.randomUUID(),
                        url: thumbnailUrl,
                        thumbnailSavedFilename,
                        thumbnailInline,
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
                        openedAt: res.status === 'success' ? null : undefined,
                        error: res.error,
                        failure: res.failure,
                        failureContext,
                        savedFilename: res.savedFilename,
                        text: res.text,
                        thoughts: res.thoughts,
                        resultParts: persistedResultParts,
                        metadata:
                            normalizeImageSidecarMetadata({
                                ...sidecarMetadata,
                                ...(res.metadata || {}),
                            }) || sidecarMetadata,
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
                    };

                    batchHistoryItems.push(historyItem);

                    setHistory((prev: GeneratedImageType[]) => [historyItem, ...prev]);

                    onBatchPreviewTileUpdate?.({
                        sessionId: batchSessionId,
                        tile: {
                            id: `${batchSessionId}-${batchResultIndex}`,
                            slotIndex: batchResultIndex,
                            status: 'committed',
                            previewUrl: null,
                            error: null,
                        },
                    });
                };

                const handleSlotStart = (slotIndex: number) => {
                    onBatchPreviewTileUpdate?.({
                        sessionId: batchSessionId,
                        tile: {
                            id: `${batchSessionId}-${slotIndex}`,
                            slotIndex,
                            status: 'pending',
                            previewUrl: null,
                            stagePreviewUrl: null,
                            error: null,
                        },
                    });
                };

                const batchHistoryItems: GeneratedImageType[] = [];

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
                        temperature,
                        thinkingLevel,
                        includeThoughts,
                        googleSearch,
                        imageSearch,
                        safetyThresholds,
                        executionMode: currentExecutionMode,
                        conversationContext,
                        liveProgressBatchSessionId: batchSessionId,
                    },
                    currentBatchSize,
                    handleImageReceived,
                    handleLogCallback,
                    controller.signal,
                    (completed, total) => setBatchProgress({ completed, total }),
                    handleResultCallback,
                    onLiveProgressEvent,
                    handleSlotStart,
                );
                const wasCancelled = controller.signal.aborted;

                const historyResults = wasCancelled
                    ? results.filter((result) => result.status === 'success')
                    : results.filter((result) => !isCancelledGenerationResult(result));

                for (const res of historyResults) {
                    const slotIndex =
                        typeof res.slotIndex === 'number' && Number.isFinite(res.slotIndex) ? res.slotIndex : 0;
                    if (!committedSlotIndices.has(slotIndex)) {
                        await handleResultCallback(res);
                    }
                }

                const orderedHistoryItems = sortBatchHistoryItemsByVisualOrder(batchHistoryItems);

                didNotifyBatchPreviewComplete = true;
                onBatchPreviewComplete?.({
                    sessionId: batchSessionId,
                    historyItems: orderedHistoryItems,
                });

                const successCount = batchHistoryItems.filter((r) => r.status === 'success').length;
                const failCount = batchHistoryItems.filter((r) => r.status === 'failed').length;

                if (!wasCancelled && successCount === 0 && failCount > 0) {
                    const batchHasSiblingSafetyBlockedFailure = batchHistoryItems.some(
                        (item) => item.status === 'failed' && item.failure?.code === 'safety-blocked',
                    );
                    setError(
                        buildStageErrorState(
                            t,
                            batchHistoryItems[0].failure,
                            batchHistoryItems[0].error || t('errorAllFailed'),
                            buildFailureDisplayContext(batchHistoryItems[0], batchHasSiblingSafetyBlockedFailure),
                        ),
                    );
                }

                addLog(
                    t('logSuccessFail').replace('{0}', successCount.toString()).replace('{1}', failCount.toString()),
                );
            } catch (err: any) {
                console.error(err);
                const errorMessage = err.message || 'Unknown error';

                if (errorMessage === 'API_KEY_INVALID' || errorMessage.includes('API key')) {
                    addLog(t('logFatalError').replace('{0}', errorMessage));
                    setError({
                        summary: t('errorApiKey'),
                        detail: null,
                        failure: null,
                    });
                    setApiKeyReady(false);
                    await promptForApiKey();
                } else if (controller.signal.aborted && isAbortGenerationMessage(errorMessage)) {
                    addLog(t('logCancelled'));
                } else {
                    setError(buildStageErrorState(t, getGenerationFailure(err), errorMessage));
                    showNotification(t('statusFailed'), 'error');
                }
            } finally {
                if (!didNotifyBatchPreviewComplete) {
                    onBatchPreviewClear?.({ sessionId: batchSessionId });
                }
                onLiveProgressReset?.();
                setIsCancelFinalizing?.(false);
                setIsGenerating(false);
                abortControllerRef.current = null;
                setBatchProgress({ completed: 0, total: 0 });
            }
        },
        [
            abortControllerRef,
            addLog,
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
            onBatchPreviewClear,
            onBatchPreviewComplete,
            onBatchPreviewStart,
            onBatchPreviewTileUpdate,
            onLiveProgressEvent,
            onLiveProgressReset,
            outputFormat,
            setApiKeyReady,
            setBatchProgress,
            setIsCancelFinalizing,
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
            t,
            temperature,
            thinkingLevel,
        ],
    );

    return { performGeneration };
}
