import { MutableRefObject, useCallback } from 'react';
import { AspectRatio, ImageModel, ImageSize, ImageStyle, StageAsset, StickySendIntent } from '../types';

type PerformGeneration = (
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
) => Promise<void> | void;

type UseWorkspaceGenerationActionsArgs = {
    abortControllerRef: MutableRefObject<AbortController | null>;
    prompt: string;
    aspectRatio: AspectRatio;
    imageSize: ImageSize;
    imageStyle: ImageStyle;
    imageModel: ImageModel;
    objectImages: string[];
    characterImages: string[];
    currentStageAsset: StageAsset | null | undefined;
    clearPendingProvenanceContext: () => void;
    primePendingProvenanceContinuation: (sourceHistoryId: string | null) => void;
    resetSelectedOutputState: () => void;
    performGeneration: PerformGeneration;
    onPrepareGenerate: () => void;
    setIsGenerating: (value: boolean) => void;
    addLog: (message: string) => void;
    showNotification: (message: string, type?: 'info' | 'error') => void;
    t: (key: string) => string;
};

export function useWorkspaceGenerationActions({
    abortControllerRef,
    prompt,
    aspectRatio,
    imageSize,
    imageStyle,
    imageModel,
    objectImages,
    characterImages,
    currentStageAsset,
    clearPendingProvenanceContext,
    primePendingProvenanceContinuation,
    resetSelectedOutputState,
    performGeneration,
    onPrepareGenerate,
    setIsGenerating,
    addLog,
    showNotification,
    t,
}: UseWorkspaceGenerationActionsArgs) {
    const handleGenerate = useCallback(() => {
        clearPendingProvenanceContext();
        resetSelectedOutputState();
        onPrepareGenerate();
        performGeneration(prompt, aspectRatio, imageSize, imageStyle, imageModel);
    }, [
        aspectRatio,
        clearPendingProvenanceContext,
        imageModel,
        imageSize,
        imageStyle,
        onPrepareGenerate,
        performGeneration,
        prompt,
        resetSelectedOutputState,
    ]);

    const handleFollowUpGenerate = useCallback(() => {
        if (!currentStageAsset?.url) {
            showNotification(t('followUpEditRequiresStageImage'), 'error');
            return;
        }

        primePendingProvenanceContinuation(currentStageAsset.sourceHistoryId || null);
        resetSelectedOutputState();
        onPrepareGenerate();
        performGeneration(
            prompt,
            aspectRatio,
            imageSize,
            imageStyle,
            imageModel,
            currentStageAsset.url,
            undefined,
            undefined,
            'Follow-up Edit',
            objectImages,
            characterImages,
        );
    }, [
        aspectRatio,
        characterImages,
        currentStageAsset,
        imageModel,
        imageSize,
        imageStyle,
        objectImages,
        onPrepareGenerate,
        performGeneration,
        primePendingProvenanceContinuation,
        prompt,
        resetSelectedOutputState,
        showNotification,
        t,
    ]);

    const handleCancelGeneration = useCallback(() => {
        if (!abortControllerRef.current) {
            return;
        }

        abortControllerRef.current.abort('user-cancelled');
        abortControllerRef.current = null;
        setIsGenerating(false);
        addLog(t('logCancelled'));
    }, [abortControllerRef, addLog, setIsGenerating, t]);

    return {
        handleGenerate,
        handleFollowUpGenerate,
        handleCancelGeneration,
    };
}
