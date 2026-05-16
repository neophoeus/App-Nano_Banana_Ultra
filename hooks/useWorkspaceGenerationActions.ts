import { MutableRefObject, useCallback } from 'react';
import { resolveCurrentStageSelectionFirstSourceOverride } from '../utils/generationSourceOverride';
import {
    AspectRatio,
    ContinuationLineageAction,
    GeneratedImage,
    ImageModel,
    ImageSize,
    ImageStyle,
    StageAsset,
} from '../types';

type GenerationSourceOverride = {
    sourceHistoryId: string | null;
    sourceLineageAction?: 'continue' | 'branch' | null;
};

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
    sourceOverride?: GenerationSourceOverride | null,
) => Promise<void> | void;

type UseWorkspaceGenerationActionsArgs = {
    abortControllerRef: MutableRefObject<AbortController | null>;
    setIsCancelFinalizing?: (value: boolean) => void;
    isSurfaceWorkspaceOpen: boolean;
    prompt: string;
    aspectRatio: AspectRatio;
    imageSize: ImageSize;
    imageStyle: ImageStyle;
    imageModel: ImageModel;
    history: GeneratedImage[];
    branchOriginIdByTurnId: Record<string, string>;
    workspaceSessionSourceHistoryId: string | null;
    workspaceSessionSourceLineageAction?: ContinuationLineageAction | null;
    objectImages: string[];
    characterImages: string[];
    currentStageAsset: StageAsset | null | undefined;
    clearPendingProvenanceContext: () => void;
    primePendingProvenanceContinuation: (
        sourceHistoryId: string | null,
        options?: { useExplicitSource?: boolean },
    ) => void;
    resetSelectedOutputState: () => void;
    performGeneration: PerformGeneration;
    onPrepareGenerate: () => void;
    addLog: (message: string) => void;
    showNotification: (message: string, type?: 'info' | 'error') => void;
    t: (key: string) => string;
};

export const resolveEffectiveSurfaceStyle = (imageStyle: ImageStyle, isSurfaceWorkspaceOpen: boolean): ImageStyle =>
    isSurfaceWorkspaceOpen ? 'None' : imageStyle;

export function useWorkspaceGenerationActions({
    abortControllerRef,
    setIsCancelFinalizing,
    isSurfaceWorkspaceOpen,
    prompt,
    aspectRatio,
    imageSize,
    imageStyle,
    imageModel,
    history,
    branchOriginIdByTurnId,
    workspaceSessionSourceHistoryId,
    workspaceSessionSourceLineageAction,
    objectImages,
    characterImages,
    currentStageAsset,
    clearPendingProvenanceContext,
    primePendingProvenanceContinuation,
    resetSelectedOutputState,
    performGeneration,
    onPrepareGenerate,
    addLog,
    showNotification,
    t,
}: UseWorkspaceGenerationActionsArgs) {
    const handleGenerate = useCallback(() => {
        const effectiveStyle = resolveEffectiveSurfaceStyle(imageStyle, isSurfaceWorkspaceOpen);

        clearPendingProvenanceContext();
        resetSelectedOutputState();
        onPrepareGenerate();
        performGeneration(prompt, aspectRatio, imageSize, effectiveStyle, imageModel);
    }, [
        aspectRatio,
        clearPendingProvenanceContext,
        isSurfaceWorkspaceOpen,
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

        const effectiveStyle = resolveEffectiveSurfaceStyle(imageStyle, isSurfaceWorkspaceOpen);

        const sourceOverride = resolveCurrentStageSelectionFirstSourceOverride({
            sourceHistoryId: currentStageAsset.sourceHistoryId ?? null,
            currentStageLineageAction: currentStageAsset.lineageAction,
            history,
            branchOriginIdByTurnId,
            workspaceSessionSourceHistoryId,
            workspaceSessionSourceLineageAction,
        });

        primePendingProvenanceContinuation(sourceOverride.sourceHistoryId ?? null, {
            useExplicitSource: true,
        });
        resetSelectedOutputState();
        onPrepareGenerate();
        performGeneration(
            prompt,
            aspectRatio,
            imageSize,
            effectiveStyle,
            imageModel,
            currentStageAsset.url,
            undefined,
            undefined,
            'Follow-up Edit',
            objectImages,
            characterImages,
            sourceOverride,
        );
    }, [
        aspectRatio,
        branchOriginIdByTurnId,
        characterImages,
        currentStageAsset,
        history,
        isSurfaceWorkspaceOpen,
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
        workspaceSessionSourceHistoryId,
        workspaceSessionSourceLineageAction,
    ]);

    const handleCancelGeneration = useCallback(() => {
        if (!abortControllerRef.current) {
            return;
        }

        setIsCancelFinalizing?.(true);
        abortControllerRef.current.abort('user-cancelled');
        addLog(t('logCancelled'));
    }, [abortControllerRef, addLog, setIsCancelFinalizing, t]);

    return {
        handleGenerate,
        handleFollowUpGenerate,
        handleCancelGeneration,
    };
}
