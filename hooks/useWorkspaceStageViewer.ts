import { Dispatch, ReactNode, SetStateAction, useCallback, useMemo } from 'react';
import type GeneratedImageStage from '../components/GeneratedImage';
import type WorkspaceViewerOverlay from '../components/WorkspaceViewerOverlay';
import { StageTopRightAction, StageTopRightChip } from '../components/GeneratedImage';
import { ImageModel, StructuredOutputMode } from '../types';
import { StageTopRightLayoutBucket, useStageTopRightLayoutBucket } from './useStageTopRightLayoutBucket';
import { Language, getTranslation } from '../utils/translations';

type SessionHintEntry = [string, unknown];

type GeneratedImageStageProps = React.ComponentProps<typeof GeneratedImageStage>;
type WorkspaceViewerOverlayProps = React.ComponentProps<typeof WorkspaceViewerOverlay>;
type StageTopRightViewModel = NonNullable<GeneratedImageStageProps['stageTopRight']>;
type ViewerHistoryItem = {
    id: string;
    url: string;
    isFresh: boolean;
};

type BuildStageTopRightModelArgs = {
    hasActiveStageImage: boolean;
    hasLinkedHistoryTurn: boolean;
    isGenerating: boolean;
    layoutBucket: StageTopRightLayoutBucket;
    currentStageOriginLabel: string | null;
    currentStageBranchLabel: string | null;
    continuationDiffers: boolean;
    hasMeaningfulResultStatus: boolean;
    resultStatusTone: 'warning' | 'success' | null;
    onContinueFromStageSource?: () => void;
    onEdit?: () => void;
    onOpenViewer?: () => void;
    onAddToObjectReference?: () => void;
    onAddToCharacterReference?: () => void;
    onBranchFromStageSource?: () => void;
    onClear?: () => void;
    t: (key: string) => string;
};

const getContextChipBuckets = (
    contextChips: StageTopRightChip[],
    layoutBucket: StageTopRightLayoutBucket,
): Pick<StageTopRightViewModel, 'contextChips' | 'overflowContextChips'> => {
    if (layoutBucket === 'wide') {
        return {
            contextChips,
            overflowContextChips: [],
        };
    }

    return {
        contextChips: contextChips.slice(0, 3),
        overflowContextChips: contextChips.slice(3),
    };
};

const getActionBuckets = (
    primaryVisibleActions: StageTopRightAction[],
    lowerPriorityActions: StageTopRightAction[],
    layoutBucket: StageTopRightLayoutBucket,
): Pick<StageTopRightViewModel, 'visibleActions' | 'overflowActions'> => {
    const maxVisibleActions = layoutBucket === 'compact' ? 2 : primaryVisibleActions.length;

    return {
        visibleActions: primaryVisibleActions.slice(0, maxVisibleActions),
        overflowActions: [...primaryVisibleActions.slice(maxVisibleActions), ...lowerPriorityActions],
    };
};

export function buildStageTopRightModel({
    hasActiveStageImage,
    hasLinkedHistoryTurn,
    isGenerating,
    layoutBucket,
    currentStageOriginLabel,
    currentStageBranchLabel,
    continuationDiffers,
    hasMeaningfulResultStatus,
    resultStatusTone,
    onContinueFromStageSource,
    onEdit,
    onOpenViewer,
    onAddToObjectReference,
    onAddToCharacterReference,
    onBranchFromStageSource,
    onClear,
    t,
}: BuildStageTopRightModelArgs): StageTopRightViewModel | null {
    if (!hasActiveStageImage) {
        return null;
    }

    const normalizedResultStatusTone =
        resultStatusTone === 'warning' || resultStatusTone === 'success' ? resultStatusTone : null;

    const contextChips: StageTopRightViewModel['contextChips'] = [];

    if (hasLinkedHistoryTurn) {
        contextChips.push({
            key: 'stage-source',
            label: t('workspacePickerStageSource'),
            tone: 'source',
        });
    } else if (currentStageOriginLabel) {
        contextChips.push({
            key: 'origin',
            label: currentStageOriginLabel,
            tone: 'source',
        });
    }

    if (currentStageBranchLabel) {
        contextChips.push({
            key: 'branch',
            label: currentStageBranchLabel,
            tone: 'branch',
        });
    }

    if (isGenerating) {
        return {
            ...getContextChipBuckets(contextChips, layoutBucket),
            visibleActions: [
                {
                    key: 'generating',
                    label: t('statusGenerating'),
                    emphasis: 'passive',
                },
            ],
            overflowActions: [],
        };
    }

    if (hasLinkedHistoryTurn && hasMeaningfulResultStatus && normalizedResultStatusTone) {
        contextChips.push({
            key: 'result-status',
            label: t('stageGroundingResultStatus'),
            tone: normalizedResultStatusTone,
        });
    }

    const primaryVisibleActions: StageTopRightAction[] = [];
    const lowerPriorityActions: StageTopRightAction[] = [];

    if (onEdit) {
        primaryVisibleActions.push({
            key: 'edit',
            label: t('stageActionEdit'),
            emphasis: 'secondary',
            onClick: onEdit,
        });
    }

    if (onOpenViewer) {
        primaryVisibleActions.push({
            key: 'open-viewer',
            label: t('stageOpenViewer'),
            emphasis: 'secondary',
            onClick: onOpenViewer,
        });
    }

    if (!hasLinkedHistoryTurn && onAddToObjectReference) {
        primaryVisibleActions.push({
            key: 'add-object-reference',
            label: t('stageActionAddToObjectReference'),
            emphasis: 'secondary',
            onClick: onAddToObjectReference,
        });
    }

    if (hasLinkedHistoryTurn && onAddToObjectReference) {
        lowerPriorityActions.push({
            key: 'add-object-reference',
            label: t('stageActionAddToObjectReference'),
            emphasis: 'secondary',
            onClick: onAddToObjectReference,
        });
    }

    if (onAddToCharacterReference) {
        lowerPriorityActions.push({
            key: 'add-character-reference',
            label: t('stageActionAddToCharacterReference'),
            emphasis: 'secondary',
            onClick: onAddToCharacterReference,
        });
    }

    if (onClear) {
        lowerPriorityActions.push({
            key: 'clear',
            label: t('stageActionClear'),
            emphasis: 'destructive',
            onClick: onClear,
        });
    }

    return {
        ...getContextChipBuckets(contextChips, layoutBucket),
        ...getActionBuckets(primaryVisibleActions, lowerPriorityActions, layoutBucket),
    };
}

type UseWorkspaceStageViewerArgs = {
    generatedImageUrls: string[];
    selectedImageIndex: number;
    setSelectedImageIndex: Dispatch<SetStateAction<number>>;
    isViewerOpen: boolean;
    setIsViewerOpen: Dispatch<SetStateAction<boolean>>;
    isGenerating: boolean;
    showStageGeneratingState?: boolean;
    viewerItems?: ViewerHistoryItem[];
    viewerSelectedHistoryId?: string | null;
    onSelectViewerItem?: (historyId: string) => void;
    prompt: string;
    error: string | null;
    resultStatusSummary: string | null;
    resultStatusTone: 'warning' | 'success' | null;
    settings: {
        aspectRatio: GeneratedImageStageProps['aspectRatio'];
        imageSize: GeneratedImageStageProps['imageSize'];
        imageStyle: GeneratedImageStageProps['imageStyle'];
        batchSize: GeneratedImageStageProps['batchSize'];
        model: ImageModel;
    };
    generationMode: GeneratedImageStageProps['generationMode'];
    executionMode: GeneratedImageStageProps['executionMode'];
    onGenerate: () => void;
    onEdit: () => void;
    onUpload: () => void;
    onClear: () => void;
    onAddToObjectReference: () => void;
    onAddToCharacterReference?: () => void;
    onContinueFromStageSource?: () => void;
    onBranchFromStageSource?: () => void;
    currentLanguage: Language;
    currentLog: string;
    currentStageOriginLabel: string | null;
    currentStageBranchLabel: string | null;
    currentStageHasLinkedHistoryTurn: boolean;
    currentStageContinuationDiffers: boolean;
    metadataItems: WorkspaceViewerOverlayProps['metadataItems'];
    metadataStateMessage: string | null;
    effectiveResultText: string | null;
    structuredData: Record<string, unknown> | null;
    structuredOutputMode: StructuredOutputMode | null;
    formattedStructuredOutput: string | null;
    effectiveThoughts: string | null;
    thoughtStateMessage: string;
    provenancePanel: ReactNode;
    sessionHintEntries: SessionHintEntry[];
    formatSessionHintKey: (key: string) => string;
    formatSessionHintValue: (key: string, value: unknown) => string;
    onApplyPrompt?: (value: string) => void;
    onReplacePrompt?: (value: string) => void;
    onAppendPrompt?: (value: string) => void;
};

export function useWorkspaceStageViewer({
    generatedImageUrls,
    selectedImageIndex,
    setSelectedImageIndex,
    isViewerOpen,
    setIsViewerOpen,
    isGenerating,
    showStageGeneratingState = isGenerating,
    viewerItems = [],
    viewerSelectedHistoryId = null,
    onSelectViewerItem,
    prompt,
    error,
    resultStatusSummary,
    resultStatusTone,
    settings,
    generationMode,
    executionMode,
    onGenerate,
    onEdit,
    onUpload,
    onClear,
    onAddToObjectReference,
    onAddToCharacterReference,
    onContinueFromStageSource,
    onBranchFromStageSource,
    currentLanguage,
    currentLog,
    currentStageOriginLabel,
    currentStageBranchLabel,
    currentStageHasLinkedHistoryTurn,
    currentStageContinuationDiffers,
    metadataItems,
    metadataStateMessage,
    effectiveResultText,
    structuredData,
    structuredOutputMode,
    formattedStructuredOutput,
    effectiveThoughts,
    thoughtStateMessage,
    provenancePanel,
    sessionHintEntries,
    formatSessionHintKey,
    formatSessionHintValue,
    onApplyPrompt,
    onReplacePrompt,
    onAppendPrompt,
}: UseWorkspaceStageViewerArgs) {
    const stageTopRightLayoutBucket = useStageTopRightLayoutBucket();
    const activeViewerHistoryItem = useMemo(() => {
        if (viewerItems.length === 0) {
            return null;
        }

        const selectedViewerHistoryItem = viewerSelectedHistoryId
            ? viewerItems.find((viewerItem) => viewerItem.id === viewerSelectedHistoryId)
            : null;

        return selectedViewerHistoryItem || viewerItems[0] || null;
    }, [viewerItems, viewerSelectedHistoryId]);
    const activeViewerImage = useMemo(
        () => activeViewerHistoryItem?.url || generatedImageUrls[selectedImageIndex] || generatedImageUrls[0] || '',
        [activeViewerHistoryItem, generatedImageUrls, selectedImageIndex],
    );

    const handleSelectGeneratedImage = useCallback(
        (url: string) => {
            const index = generatedImageUrls.findIndex((imageUrl) => imageUrl === url);
            if (index >= 0) {
                setSelectedImageIndex(index);
            }
        },
        [generatedImageUrls, setSelectedImageIndex],
    );

    const openViewer = useCallback(() => {
        if (activeViewerImage) {
            setIsViewerOpen(true);
        }
    }, [activeViewerImage, setIsViewerOpen]);

    const closeViewer = useCallback(() => {
        setIsViewerOpen(false);
    }, [setIsViewerOpen]);

    const stageTopRight = useMemo(
        () =>
            buildStageTopRightModel({
                hasActiveStageImage: Boolean(activeViewerImage),
                hasLinkedHistoryTurn: currentStageHasLinkedHistoryTurn,
                isGenerating: showStageGeneratingState,
                layoutBucket: stageTopRightLayoutBucket,
                currentStageOriginLabel,
                currentStageBranchLabel,
                continuationDiffers: currentStageContinuationDiffers,
                hasMeaningfulResultStatus: Boolean(
                    resultStatusSummary?.trim() && (resultStatusTone === 'warning' || resultStatusTone === 'success'),
                ),
                resultStatusTone,
                onContinueFromStageSource,
                onEdit,
                onOpenViewer: openViewer,
                onAddToObjectReference,
                onAddToCharacterReference,
                onBranchFromStageSource,
                onClear,
                t: (key) => getTranslation(currentLanguage, key),
            }),
        [
            activeViewerImage,
            currentLanguage,
            currentStageBranchLabel,
            currentStageContinuationDiffers,
            currentStageHasLinkedHistoryTurn,
            currentStageOriginLabel,
            showStageGeneratingState,
            onAddToCharacterReference,
            onAddToObjectReference,
            onBranchFromStageSource,
            onClear,
            onContinueFromStageSource,
            onEdit,
            openViewer,
            resultStatusSummary,
            resultStatusTone,
            stageTopRightLayoutBucket,
        ],
    );

    const moveViewer = useCallback(
        (direction: 'prev' | 'next') => {
            if (viewerItems.length <= 1 || !onSelectViewerItem) {
                return;
            }

            const currentIndex = viewerSelectedHistoryId
                ? viewerItems.findIndex((viewerItem) => viewerItem.id === viewerSelectedHistoryId)
                : -1;
            const baseIndex = currentIndex >= 0 ? currentIndex : 0;
            const nextIndex =
                direction === 'prev'
                    ? baseIndex === 0
                        ? viewerItems.length - 1
                        : baseIndex - 1
                    : baseIndex === viewerItems.length - 1
                      ? 0
                      : baseIndex + 1;

            onSelectViewerItem(viewerItems[nextIndex].id);
        },
        [onSelectViewerItem, viewerItems, viewerSelectedHistoryId],
    );

    const workspaceViewerOverlayProps = useMemo(
        () =>
            ({
                currentLanguage,
                isOpen: isViewerOpen,
                activeViewerImage,
                activeViewerIsFresh: activeViewerHistoryItem?.isFresh || false,
                generatedImageCount: viewerItems.length,
                prompt,
                metadataItems,
                metadataStateMessage,
                effectiveResultText,
                structuredData,
                structuredOutputMode,
                formattedStructuredOutput,
                effectiveThoughts,
                thoughtStateMessage,
                provenancePanel,
                sessionHintEntries,
                formatSessionHintKey,
                formatSessionHintValue,
                onClose: closeViewer,
                onMoveViewer: moveViewer,
                onApplyPrompt,
                onReplacePrompt,
                onAppendPrompt,
            }) satisfies WorkspaceViewerOverlayProps,
        [
            activeViewerImage,
            activeViewerHistoryItem?.isFresh,
            closeViewer,
            currentLanguage,
            effectiveResultText,
            structuredData,
            structuredOutputMode,
            formattedStructuredOutput,
            effectiveThoughts,
            formatSessionHintKey,
            formatSessionHintValue,
            isViewerOpen,
            metadataItems,
            moveViewer,
            onApplyPrompt,
            onAppendPrompt,
            onReplacePrompt,
            prompt,
            provenancePanel,
            sessionHintEntries,
            metadataStateMessage,
            thoughtStateMessage,
            viewerItems.length,
        ],
    );

    const generatedImageStageProps = useMemo(
        () =>
            ({
                imageUrls: generatedImageUrls,
                isLoading: showStageGeneratingState,
                prompt,
                error,
                aspectRatio: settings.aspectRatio,
                imageSize: settings.imageSize,
                imageStyle: settings.imageStyle,
                batchSize: settings.batchSize,
                generationMode,
                executionMode,
                onGenerate,
                onUpload,
                onSelectImage: handleSelectGeneratedImage,
                selectedImageUrl: generatedImageUrls[selectedImageIndex],
                currentLanguage,
                currentLog: showStageGeneratingState ? currentLog : '',
                onOpenViewer: openViewer,
                stageTopRight,
            }) satisfies GeneratedImageStageProps,
        [
            currentLanguage,
            currentLog,
            error,
            executionMode,
            generatedImageUrls,
            generationMode,
            handleSelectGeneratedImage,
            showStageGeneratingState,
            onGenerate,
            onUpload,
            openViewer,
            prompt,
            selectedImageIndex,
            settings.aspectRatio,
            settings.batchSize,
            settings.imageSize,
            settings.imageStyle,
            stageTopRight,
        ],
    );

    return {
        activeViewerImage,
        generatedImageStageProps,
        workspaceViewerOverlayProps,
    };
}
