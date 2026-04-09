import { ChangeEvent, Dispatch, MutableRefObject, SetStateAction, useCallback } from 'react';
import { ASPECT_RATIOS } from '../constants';
import {
    constrainImageDimensions,
    loadImageDimensions,
    prepareImageAssetFromFile,
} from '../utils/imageSaveUtils';
import { findClosestAspectRatio, findClosestImageSize } from '../utils/canvasWorkspace';
import {
    AspectRatio,
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
};

type PickerSheet =
    | 'prompt'
    | 'styles'
    | 'settings'
    | 'model'
    | 'ratio'
    | 'size'
    | 'batch'
    | 'references'
    | null;

type UseWorkspaceEditorActionsArgs = {
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
    currentStageAsset: StageAsset | undefined;
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
    primePendingProvenanceContinuation: (sourceHistoryId: string | null) => void;
    performGeneration: (
        prompt: string,
        aspectRatio?: AspectRatio,
        imageSize?: ImageSize,
        style?: string,
        model?: ImageModel,
        editingInput?: string,
        batchSizeOverride?: number,
        _unused?: unknown,
        mode?: string,
        objectImageInputs?: string[],
        characterImageInputs?: string[],
    ) => void;
    queueBatchJobFromEditor: (submission: {
        prompt: string;
        editingInput: string;
        batchSize: number;
        imageSize: ImageSize;
        aspectRatio: AspectRatio;
        objectImageInputs?: string[];
        characterImageInputs?: string[];
        generationMode?: string;
    }) => Promise<void>;
};

export function useWorkspaceEditorActions({
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
        async (nextImageSource: string, sourceDimensions?: { width: number; height: number }) => {
            let editorInitialRatio = aspectRatio;
            let editorInitialSize = imageSize;

            try {
                const measuredDimensions = sourceDimensions || (await loadImageDimensions(nextImageSource));
                const constrainedDimensions = constrainImageDimensions(
                    measuredDimensions.width,
                    measuredDimensions.height,
                );

                if (constrainedDimensions.width > 0 && constrainedDimensions.height > 0) {
                    editorInitialRatio = findClosestAspectRatio(
                        constrainedDimensions.width,
                        constrainedDimensions.height,
                        ASPECT_RATIOS,
                    );
                    editorInitialSize = findClosestImageSize(
                        constrainedDimensions.width,
                        constrainedDimensions.height,
                    );
                }
            } catch (error) {
                console.error('Failed to resolve editor entry settings.', error);
            }

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
            });
            setEditorMode('inpaint');
            setEditorRetouchLockedRatio(editorInitialRatio);
            setAspectRatio(editorInitialRatio);
            setImageSize(editorInitialSize);
            setEditorPrompt('');
            setEditingImageSource(nextImageSource);
            setIsEditing(true);
            setActivePickerSheet(null);
            setError(null);
        },
        [
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
                        width: prepared.width,
                        height: prepared.height,
                    });

                    if (prepared.wasResized) {
                        addLog(t('msgImageResized'));
                        showNotification(t('msgImageResized'), 'info');
                    } else {
                        addLog(t('logImageUploaded'));
                    }
                })
                .catch(() => {
                    showNotification(t('errInvalidImage'), 'error');
                });

            if (uploadInputRef.current) {
                uploadInputRef.current.value = '';
            }
        },
        [addLog, openEditorWithSource, showNotification, t, uploadInputRef],
    );

    const handleOpenEditor = useCallback(() => {
        const activeUrl = getActiveImageUrl();
        if (activeUrl) {
            void openEditorWithSource(activeUrl);
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
            primePendingProvenanceContinuation(currentStageAsset?.sourceHistoryId ?? null);
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
            );
        },
        [
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
            });
        },
        [
            aspectRatio,
            queueBatchJobFromEditor,
            returnToWorkspaceFromEditor,
        ],
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
