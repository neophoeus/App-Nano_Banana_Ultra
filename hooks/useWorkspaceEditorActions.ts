import { ChangeEvent, Dispatch, MutableRefObject, SetStateAction, useCallback } from 'react';
import { ASPECT_RATIOS } from '../constants';
import {
    EDITOR_IMAGE_MAX_DIMENSION,
    constrainImageDimensions,
    loadImageDimensions,
    prepareImageAssetFromFile,
    prepareImageAssetFromSource,
    type PreparedImageAsset,
} from '../utils/imageSaveUtils';
import { resolveCurrentStageSelectionFirstSourceOverride } from '../utils/generationSourceOverride';
import { findClosestAspectRatio, findClosestImageSize } from '../utils/canvasWorkspace';
import {
    AspectRatio,
    ContinuationLineageAction,
    EditorMode,
    ImageModel,
    ImageSize,
    ImageStyle,
    OutputFormat,
    StageAsset,
    StructuredOutputMode,
    ThinkingLevel,
} from '../types';

export type EditorContextSnapshot = {
    prompt: string;
    objectImages: string[];
    characterImages: string[];
    ratio: AspectRatio;
    size: ImageSize;
    batchSize: number;
    model: ImageModel;
    style: ImageStyle;
    outputFormat: OutputFormat;
    structuredOutputMode: StructuredOutputMode;
    temperature: number;
    thinkingLevel: ThinkingLevel;
    includeThoughts: boolean;
    googleSearch: boolean;
    imageSearch: boolean;
    editorInitialRatio?: AspectRatio;
    editorInitialSize?: ImageSize;
    editorPreparedSource?: Pick<PreparedImageAsset, 'width' | 'height' | 'wasResized'>;
    sourceHistoryId?: string | null;
    sourceLineageAction?: ContinuationLineageAction | null;
};

type GenerationSourceOverride = {
    sourceHistoryId: string | null;
    sourceLineageAction?: ContinuationLineageAction | null;
};

type PickerSheet = 'prompt' | 'styles' | 'settings' | 'model' | 'ratio' | 'size' | 'batch' | 'references' | null;

type UseWorkspaceEditorActionsArgs = {
    history: GeneratedImage[];
    branchOriginIdByTurnId: Record<string, string>;
    workspaceSessionSourceHistoryId: string | null;
    workspaceSessionSourceLineageAction?: ContinuationLineageAction | null;
    objectImages: string[];
    characterImages: string[];
    aspectRatio: AspectRatio;
    imageSize: ImageSize;
    batchSize: number;
    imageModel: ImageModel;
    imageStyle: ImageStyle;
    outputFormat: OutputFormat;
    structuredOutputMode: StructuredOutputMode;
    temperature: number;
    thinkingLevel: ThinkingLevel;
    includeThoughts: boolean;
    googleSearch: boolean;
    imageSearch: boolean;
    capability: {
        maxObjects: number;
        maxCharacters: number;
    };
    currentStageAsset: StageAsset | null | undefined;
    editorContextSnapshot: EditorContextSnapshot | null;
    hasSketch: boolean;
    isEditing: boolean;
    uploadInputRef: MutableRefObject<HTMLInputElement | null>;
    setObjectImages: Dispatch<SetStateAction<string[]>>;
    setCharacterImages: Dispatch<SetStateAction<string[]>>;
    setIsEditing: Dispatch<SetStateAction<boolean>>;
    setEditingImageSource: Dispatch<SetStateAction<string | null>>;
    setEditorContextSnapshot: Dispatch<SetStateAction<EditorContextSnapshot | null>>;
    setEditorPrompt: Dispatch<SetStateAction<string>>;
    setAspectRatio: Dispatch<SetStateAction<AspectRatio>>;
    setImageSize: Dispatch<SetStateAction<ImageSize>>;
    setActivePickerSheet: Dispatch<SetStateAction<PickerSheet>>;
    setError: Dispatch<SetStateAction<string | null>>;
    setIsSketchPadOpen: Dispatch<SetStateAction<boolean>>;
    setShowSketchReplaceConfirm: Dispatch<SetStateAction<boolean>>;
    setEditorMode: Dispatch<SetStateAction<EditorMode>>;
    setEditorRetouchLockedRatio: Dispatch<SetStateAction<AspectRatio | null>>;
    restoreEditorComposerState: (snapshot: EditorContextSnapshot) => void;
    getActiveImageUrl: () => string;
    addWorkspaceAsset: (args: {
        role: 'object' | 'character' | 'stage-source';
        origin: 'upload' | 'sketch' | 'generated' | 'history' | 'editor';
        url: string;
        maxAssets?: number;
        isSketch?: boolean;
        preferFront?: boolean;
        sourceHistoryId?: string;
        lineageAction?: 'root' | 'continue' | 'branch' | 'editor-follow-up' | 'reopen';
    }) => void;
    removeAssetAtRoleIndex: (role: 'object' | 'character', index: number) => void;
    clearAssetRoles: (roles: Array<'object' | 'character' | 'stage-source'>) => void;
    showNotification: (message: string, type?: 'info' | 'error') => void;
    addLog: (message: string) => void;
    t: (key: string) => string;
    primePendingProvenanceContinuation: (
        sourceHistoryId: string | null,
        options?: { useExplicitSource?: boolean },
    ) => void;
    performGeneration: (
        prompt: string,
        aspectRatio: AspectRatio | undefined,
        imageSize: ImageSize,
        style: ImageStyle,
        model: ImageModel,
        editingInput?: string,
        batchSizeOverride?: number,
        customSize?: ImageSize,
        mode?: string,
        objectImageInputs?: string[],
        characterImageInputs?: string[],
        sourceOverride?: GenerationSourceOverride | null,
    ) => Promise<void> | void;
    queueBatchJobFromEditor: (submission: {
        prompt: string;
        editingInput: string;
        batchSize: number;
        imageSize: ImageSize;
        aspectRatio: AspectRatio;
        objectImageInputs?: string[];
        characterImageInputs?: string[];
        generationMode?: string;
        sourceOverride?: GenerationSourceOverride | null;
    }) => Promise<void>;
};

export function useWorkspaceEditorActions({
    history,
    branchOriginIdByTurnId,
    workspaceSessionSourceHistoryId,
    workspaceSessionSourceLineageAction,
    objectImages,
    characterImages,
    aspectRatio,
    imageSize,
    batchSize,
    imageModel,
    imageStyle,
    outputFormat,
    structuredOutputMode,
    temperature,
    thinkingLevel,
    includeThoughts,
    googleSearch,
    imageSearch,
    capability,
    currentStageAsset,
    editorContextSnapshot,
    hasSketch,
    isEditing,
    uploadInputRef,
    setObjectImages,
    setCharacterImages,
    setIsEditing,
    setEditingImageSource,
    setEditorContextSnapshot,
    setEditorPrompt,
    setAspectRatio,
    setImageSize,
    setActivePickerSheet,
    setError,
    setIsSketchPadOpen,
    setShowSketchReplaceConfirm,
    setEditorMode,
    setEditorRetouchLockedRatio,
    restoreEditorComposerState,
    getActiveImageUrl,
    addWorkspaceAsset,
    removeAssetAtRoleIndex,
    clearAssetRoles,
    showNotification,
    addLog,
    t,
    primePendingProvenanceContinuation,
    performGeneration,
    queueBatchJobFromEditor,
}: UseWorkspaceEditorActionsArgs) {
    const resolveEditorSourceOverride = useCallback(
        (entrySource: 'stage' | 'upload'): GenerationSourceOverride => {
            if (entrySource === 'upload') {
                return {
                    sourceHistoryId: null,
                    sourceLineageAction: null,
                };
            }

            return resolveCurrentStageSelectionFirstSourceOverride({
                sourceHistoryId: currentStageAsset?.sourceHistoryId ?? null,
                currentStageLineageAction: currentStageAsset?.lineageAction,
                history,
                branchOriginIdByTurnId,
                workspaceSessionSourceHistoryId,
                workspaceSessionSourceLineageAction,
            });
        },
        [
            branchOriginIdByTurnId,
            currentStageAsset?.lineageAction,
            currentStageAsset?.sourceHistoryId,
            history,
            workspaceSessionSourceHistoryId,
            workspaceSessionSourceLineageAction,
        ],
    );

    const closeEditor = useCallback(
        (options?: { discardSharedContext?: boolean }) => {
            const shouldRestoreSharedContext = options?.discardSharedContext ?? true;

            if (shouldRestoreSharedContext && editorContextSnapshot) {
                restoreEditorComposerState(editorContextSnapshot);
                setObjectImages(editorContextSnapshot.objectImages);
                setCharacterImages(editorContextSnapshot.characterImages);
            }

            setIsEditing(false);
            setEditingImageSource(null);
        },
        [
            editorContextSnapshot,
            restoreEditorComposerState,
            setCharacterImages,
            setEditingImageSource,
            setIsEditing,
            setObjectImages,
        ],
    );

    const openEditorWithSource = useCallback(
        async (
            nextImageSource: string,
            options?: {
                preparedAsset?: PreparedImageAsset;
                entrySource?: 'stage' | 'upload';
            },
        ) => {
            let editorInitialRatio = aspectRatio;
            let editorInitialSize = imageSize;
            const entrySource = options?.entrySource ?? 'stage';
            let resolvedImageSource = nextImageSource;
            let preparedSource: Pick<PreparedImageAsset, 'width' | 'height' | 'wasResized'> | undefined;

            setActivePickerSheet(null);
            setError(null);
            setIsEditing(true);
            setEditingImageSource(null);

            try {
                const providedPreparedAsset = options?.preparedAsset;
                if (providedPreparedAsset) {
                    resolvedImageSource = providedPreparedAsset.dataUrl;
                    preparedSource = {
                        width: providedPreparedAsset.width,
                        height: providedPreparedAsset.height,
                        wasResized: providedPreparedAsset.wasResized,
                    };
                } else {
                    const measuredDimensions = await loadImageDimensions(nextImageSource);
                    const constrainedDimensions = constrainImageDimensions(
                        measuredDimensions.width,
                        measuredDimensions.height,
                        EDITOR_IMAGE_MAX_DIMENSION,
                    );
                    preparedSource = {
                        width: constrainedDimensions.width,
                        height: constrainedDimensions.height,
                        wasResized: constrainedDimensions.wasResized,
                    };

                    if (constrainedDimensions.wasResized) {
                        const preparedAsset = await prepareImageAssetFromSource(
                            nextImageSource,
                            EDITOR_IMAGE_MAX_DIMENSION,
                        );
                        resolvedImageSource = preparedAsset.dataUrl;
                        preparedSource = {
                            width: preparedAsset.width,
                            height: preparedAsset.height,
                            wasResized: preparedAsset.wasResized,
                        };
                    }
                }

                if (preparedSource.width > 0 && preparedSource.height > 0) {
                    editorInitialRatio = findClosestAspectRatio(
                        preparedSource.width,
                        preparedSource.height,
                        ASPECT_RATIOS,
                    );
                    editorInitialSize = findClosestImageSize(preparedSource.width, preparedSource.height);
                }
            } catch (error) {
                console.error('Failed to resolve editor entry settings.', error);
            }

            if (preparedSource?.wasResized) {
                addLog(t('msgImageResized'));
                showNotification(t('msgImageResized'), 'info');
            } else if (entrySource === 'upload') {
                addLog(t('logImageUploaded'));
            }

            const sourceOverride = resolveEditorSourceOverride(entrySource);

            setEditorContextSnapshot({
                prompt: '',
                objectImages: [...objectImages],
                characterImages: [...characterImages],
                ratio: aspectRatio,
                size: imageSize,
                batchSize,
                model: imageModel,
                style: imageStyle,
                outputFormat,
                structuredOutputMode,
                temperature,
                thinkingLevel,
                includeThoughts,
                googleSearch,
                imageSearch,
                editorInitialRatio,
                editorInitialSize,
                editorPreparedSource: preparedSource,
                sourceHistoryId: sourceOverride.sourceHistoryId,
                sourceLineageAction: sourceOverride.sourceLineageAction,
            });
            setEditorMode('inpaint');
            setEditorRetouchLockedRatio(editorInitialRatio);
            setAspectRatio(editorInitialRatio);
            setImageSize(editorInitialSize);
            setEditorPrompt('');
            setEditingImageSource(resolvedImageSource);
        },
        [
            addLog,
            aspectRatio,
            batchSize,
            characterImages,
            googleSearch,
            imageModel,
            imageSize,
            imageSearch,
            imageStyle,
            includeThoughts,
            outputFormat,
            objectImages,
            resolveEditorSourceOverride,
            setAspectRatio,
            setActivePickerSheet,
            setEditorMode,
            setEditorPrompt,
            setEditingImageSource,
            setEditorContextSnapshot,
            setError,
            setIsEditing,
            setEditorRetouchLockedRatio,
            setImageSize,
            structuredOutputMode,
            temperature,
            thinkingLevel,
            showNotification,
            t,
        ],
    );

    const handleAddToCharacterReference = useCallback(() => {
        const activeUrl = getActiveImageUrl();
        if (!activeUrl) {
            return;
        }

        if (characterImages.length >= capability.maxCharacters) {
            showNotification(t('errorMaxRefs').replace('{0}', capability.maxCharacters.toString()), 'error');
            return;
        }

        addWorkspaceAsset({
            role: 'character',
            origin: 'generated',
            url: activeUrl,
            maxAssets: capability.maxCharacters,
        });
        showNotification(t('notificationAddedToRef'), 'info');
    }, [addWorkspaceAsset, capability.maxCharacters, characterImages.length, getActiveImageUrl, showNotification, t]);

    const handleAddToObjectReference = useCallback(() => {
        const activeUrl = getActiveImageUrl();
        if (!activeUrl) {
            return;
        }

        if (objectImages.length >= capability.maxObjects) {
            showNotification(t('errorMaxRefs').replace('{0}', capability.maxObjects.toString()), 'error');
            return;
        }

        addWorkspaceAsset({
            role: 'object',
            origin: 'generated',
            url: activeUrl,
            maxAssets: capability.maxObjects,
        });
        showNotification(t('notificationAddedToRef'), 'info');
    }, [addWorkspaceAsset, capability.maxObjects, getActiveImageUrl, objectImages.length, showNotification, t]);

    const handleOpenSketchPad = useCallback(() => {
        if (hasSketch && objectImages.length > 0) {
            setShowSketchReplaceConfirm(true);
            return;
        }

        setActivePickerSheet(null);
        setIsSketchPadOpen(true);
    }, [hasSketch, objectImages.length, setActivePickerSheet, setIsSketchPadOpen, setShowSketchReplaceConfirm]);

    const handleSketchPadSave = useCallback(
        (base64: string) => {
            addWorkspaceAsset({
                role: 'object',
                origin: 'sketch',
                url: base64,
                isSketch: true,
                maxAssets: capability.maxObjects,
                preferFront: true,
            });
            setIsSketchPadOpen(false);
            showNotification(t('notificationAddedToRef'), 'info');
        },
        [addWorkspaceAsset, capability.maxObjects, setIsSketchPadOpen, showNotification, t],
    );

    const handleRemoveObjectReference = useCallback(
        (indexToRemove: number) => {
            removeAssetAtRoleIndex('object', indexToRemove);
        },
        [removeAssetAtRoleIndex],
    );

    const handleRemoveCharacterReference = useCallback(
        (indexToRemove: number) => {
            removeAssetAtRoleIndex('character', indexToRemove);
        },
        [removeAssetAtRoleIndex],
    );

    const handleUploadForEdit = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            if (!file) {
                return;
            }

            if (!file.type.startsWith('image/')) {
                showNotification(t('errInvalidImage'), 'error');
                return;
            }

            prepareImageAssetFromFile(file)
                .then((prepared) => {
                    void openEditorWithSource(prepared.dataUrl, {
                        preparedAsset: prepared,
                        entrySource: 'upload',
                    });
                })
                .catch(() => {
                    showNotification(t('errInvalidImage'), 'error');
                });

            if (uploadInputRef.current) {
                uploadInputRef.current.value = '';
            }
        },
        [openEditorWithSource, showNotification, t, uploadInputRef],
    );

    const handleOpenEditor = useCallback(() => {
        const activeUrl = getActiveImageUrl();
        if (activeUrl) {
            void openEditorWithSource(activeUrl, { entrySource: 'stage' });
            return;
        }

        uploadInputRef.current?.click();
    }, [getActiveImageUrl, openEditorWithSource, uploadInputRef]);

    const returnToWorkspaceFromEditor = useCallback(() => {
        setActivePickerSheet(null);
        setIsEditing(false);
        setEditingImageSource(null);
    }, [setActivePickerSheet, setEditingImageSource, setIsEditing]);

    const handleEditorGenerate = useCallback(
        (
            editPrompt: string,
            imageBase64: string,
            editBatchSize: number,
            editSize: ImageSize,
            mode: string,
            extraObjectImages?: string[],
            extraCharacterImages?: string[],
            targetRatio?: AspectRatio,
        ) => {
            const sourceOverride = editorContextSnapshot
                ? {
                      sourceHistoryId: editorContextSnapshot.sourceHistoryId ?? null,
                      sourceLineageAction: editorContextSnapshot.sourceLineageAction ?? null,
                  }
                : undefined;
            const provenanceSourceHistoryId = sourceOverride
                ? (sourceOverride.sourceHistoryId ?? null)
                : (currentStageAsset?.sourceHistoryId ?? null);

            primePendingProvenanceContinuation(provenanceSourceHistoryId, {
                useExplicitSource: Boolean(sourceOverride),
            });
            returnToWorkspaceFromEditor();
            performGeneration(
                editPrompt,
                targetRatio,
                editSize,
                'None',
                imageModel,
                imageBase64,
                editBatchSize,
                undefined,
                mode,
                extraObjectImages,
                extraCharacterImages,
                sourceOverride,
            );
        },
        [
            editorContextSnapshot,
            currentStageAsset?.sourceHistoryId,
            imageModel,
            performGeneration,
            primePendingProvenanceContinuation,
            returnToWorkspaceFromEditor,
        ],
    );

    const handleEditorQueueBatch = useCallback(
        async (
            editPrompt: string,
            imageBase64: string,
            editBatchSize: number,
            editSize: ImageSize,
            _mode: string,
            extraObjectImages?: string[],
            extraCharacterImages?: string[],
            targetRatio?: AspectRatio,
        ) => {
            const sourceOverride = editorContextSnapshot
                ? {
                      sourceHistoryId: editorContextSnapshot.sourceHistoryId ?? null,
                      sourceLineageAction: editorContextSnapshot.sourceLineageAction ?? null,
                  }
                : undefined;

            returnToWorkspaceFromEditor();
            await queueBatchJobFromEditor({
                prompt: editPrompt,
                editingInput: imageBase64,
                batchSize: editBatchSize,
                imageSize: editSize,
                aspectRatio: targetRatio || aspectRatio,
                objectImageInputs: extraObjectImages,
                characterImageInputs: extraCharacterImages,
                generationMode: 'Editor Edit',
                sourceOverride,
            });
        },
        [aspectRatio, editorContextSnapshot, queueBatchJobFromEditor, returnToWorkspaceFromEditor],
    );

    const handleSketchReplaceCancel = useCallback(() => {
        setShowSketchReplaceConfirm(false);
    }, [setShowSketchReplaceConfirm]);

    const handleSketchReplaceConfirm = useCallback(() => {
        setShowSketchReplaceConfirm(false);
        setIsSketchPadOpen(true);
    }, [setIsSketchPadOpen, setShowSketchReplaceConfirm]);

    const handleCloseSketchPad = useCallback(() => {
        setIsSketchPadOpen(false);
    }, [setIsSketchPadOpen]);

    return {
        closeEditor,
        handleAddToCharacterReference,
        handleAddToObjectReference,
        handleOpenSketchPad,
        handleSketchPadSave,
        handleRemoveObjectReference,
        handleRemoveCharacterReference,
        handleUploadForEdit,
        handleOpenEditor,
        handleEditorGenerate,
        handleEditorQueueBatch,
        handleSketchReplaceCancel,
        handleSketchReplaceConfirm,
        handleCloseSketchPad,
    };
}
