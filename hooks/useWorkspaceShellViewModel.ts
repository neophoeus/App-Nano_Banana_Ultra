import { useMemo } from 'react';
import { WORKSPACE_SURFACE_Z_INDEX } from '../constants/workspaceOverlays';
import { GenerationSettings } from '../types';
import { buildWorkflowTimeline, renderWorkflowMessage, workflowMessageIncludes } from '../utils/workflowTimeline';

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

type UseWorkspaceShellViewModelArgs = {
    generatedImageCount: number;
    isGenerating: boolean;
    displaySettings: GenerationSettings;
    prompt: string;
    surfacePrompt: string;
    aspectRatio: GenerationSettings['aspectRatio'];
    imageSize: GenerationSettings['size'];
    imageStyle: GenerationSettings['style'];
    imageModel: GenerationSettings['model'];
    batchSize: number;
    outputFormat: GenerationSettings['outputFormat'];
    structuredOutputMode: GenerationSettings['structuredOutputMode'];
    temperature: number;
    thinkingLevel: GenerationSettings['thinkingLevel'];
    includeThoughts: boolean;
    googleSearch: boolean;
    imageSearch: boolean;
    logs: string[];
    currentStageSourceHistoryId: string | null;
    getShortTurnId: (historyId?: string | null) => string;
    activePickerSheet: PickerSheet;
    isEditing: boolean;
    isSketchPadOpen: boolean;
    objectImageCount: number;
    characterImageCount: number;
    t: (key: string) => string;
};

export function useWorkspaceShellViewModel({
    generatedImageCount,
    isGenerating,
    displaySettings,
    prompt,
    surfacePrompt,
    aspectRatio,
    imageSize,
    imageStyle,
    imageModel,
    batchSize,
    outputFormat,
    structuredOutputMode,
    temperature,
    thinkingLevel,
    includeThoughts,
    googleSearch,
    imageSearch,
    logs,
    currentStageSourceHistoryId,
    getShortTurnId,
    activePickerSheet,
    isEditing,
    isSketchPadOpen,
    objectImageCount,
    characterImageCount,
    t,
}: UseWorkspaceShellViewModelArgs) {
    const viewSettings = useMemo<GenerationSettings>(
        () =>
            generatedImageCount > 0 || isGenerating
                ? displaySettings
                : {
                      prompt,
                      aspectRatio,
                      size: imageSize,
                      style: imageStyle,
                      model: imageModel,
                      batchSize,
                      outputFormat,
                      structuredOutputMode,
                      temperature,
                      thinkingLevel,
                      includeThoughts,
                      googleSearch,
                      imageSearch,
                  },
        [
            aspectRatio,
            batchSize,
            displaySettings,
            generatedImageCount,
            googleSearch,
            imageModel,
            imageSearch,
            imageSize,
            imageStyle,
            includeThoughts,
            isGenerating,
            outputFormat,
            prompt,
            structuredOutputMode,
            temperature,
            thinkingLevel,
        ],
    );

    const currentStageSourceShortId = currentStageSourceHistoryId ? getShortTurnId(currentStageSourceHistoryId) : null;

    const latestWorkflowEntry = useMemo(() => {
        const latestEntry = buildWorkflowTimeline(logs, 8).reverse()[0];

        if (!latestEntry) {
            return null;
        }

        return {
            ...latestEntry,
            displayMessage: renderWorkflowMessage(latestEntry.message, t),
            isCurrentStageSourceEntry: Boolean(
                currentStageSourceShortId && workflowMessageIncludes(latestEntry.message, currentStageSourceShortId, t),
            ),
        };
    }, [currentStageSourceShortId, logs, t]);

    const activeSheetTitle = useMemo(() => {
        switch (activePickerSheet) {
            case 'prompt':
                return t('workspaceSheetTitlePrompt');
            case 'styles':
                return t('workspaceSheetTitleStyles');
            case 'settings':
                return t('workspaceSheetTitleGenerationSettings');
            case 'model':
                return t('workspaceSheetTitleModel');
            case 'ratio':
                return t('workspaceSheetTitleRatio');
            case 'size':
                return t('workspaceSheetTitleSize');
            case 'batch':
                return t('workspaceSheetTitleBatch');
            case 'references':
                return t('workspaceSheetTitleReferences');
            default:
                return '';
        }
    }, [activePickerSheet, t]);

    const isSurfaceWorkspaceOpen = isEditing || isSketchPadOpen;
    const floatingControlsZIndex = isSketchPadOpen
        ? WORKSPACE_SURFACE_Z_INDEX.floatingControls.sketch
        : isEditing
          ? WORKSPACE_SURFACE_Z_INDEX.floatingControls.editor
          : WORKSPACE_SURFACE_Z_INDEX.floatingControls.shell;
    const pickerSheetZIndex = isSketchPadOpen
        ? WORKSPACE_SURFACE_Z_INDEX.pickerSheet.sketch
        : isEditing
          ? WORKSPACE_SURFACE_Z_INDEX.pickerSheet.editor
          : WORKSPACE_SURFACE_Z_INDEX.pickerSheet.shell;
    const activeSurfaceSheetLabel = activePickerSheet ? activeSheetTitle : t('workspaceSurfaceReady');
    const surfacePromptPreview = surfacePrompt.trim()
        ? surfacePrompt.trim().slice(0, 64)
        : t('workspaceSurfacePromptEmpty');
    const totalReferenceCount = objectImageCount + characterImageCount;

    return {
        viewSettings,
        currentStageSourceShortId,
        latestWorkflowEntry,
        activeSheetTitle,
        isSurfaceWorkspaceOpen,
        floatingControlsZIndex,
        pickerSheetZIndex,
        activeSurfaceSheetLabel,
        surfacePromptPreview,
        totalReferenceCount,
    };
}
