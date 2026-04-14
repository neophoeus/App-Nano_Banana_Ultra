import { Dispatch, SetStateAction, useMemo } from 'react';
import BranchRenameDialog from '../components/BranchRenameDialog';
import SurfaceSharedControls, { SurfaceSharedControlsVariant } from '../components/SurfaceSharedControls';
import WorkspaceImportReview from '../components/WorkspaceImportReview';
import {
    AspectRatio,
    GroundingMode,
    ImageModel,
    ImageSize,
    ImageStyle,
    OutputFormat,
    StructuredOutputMode,
    ThinkingLevel,
} from '../types';
import { type ModelCapability } from '../utils/modelCapabilities';
import { getTranslation, Language } from '../utils/translations';

type BranchRenameDialogProps = React.ComponentProps<typeof BranchRenameDialog>;
type SurfaceSharedControlsProps = React.ComponentProps<typeof SurfaceSharedControls>;
type WorkspaceImportReviewProps = React.ComponentProps<typeof WorkspaceImportReview>;

type ImportReviewBranchActions = {
    openLatest: WorkspaceImportReviewProps['onReplaceAndOpenLatest'];
    continueLatest: WorkspaceImportReviewProps['onReplaceAndContinueLatest'];
    branchLatest: WorkspaceImportReviewProps['onReplaceAndBranchLatest'];
    openBranchLatest: WorkspaceImportReviewProps['onReplaceAndOpenBranchLatest'];
    continueBranchLatest: WorkspaceImportReviewProps['onReplaceAndContinueBranchLatest'];
    branchFromBranchLatest: WorkspaceImportReviewProps['onReplaceAndBranchFromBranchLatest'];
};

type UseWorkspaceOverlayAuxiliaryPropsArgs = {
    currentLanguage: Language;
    isSurfaceWorkspaceOpen: boolean;
    isAdvancedSettingsOpen: boolean;
    isEditing: boolean;
    activePickerSheet: SurfaceSharedControlsProps['activePickerSheet'];
    settingsVariant: SurfaceSharedControlsVariant;
    totalReferenceCount: number;
    hasSurfacePrompt: boolean;
    imageStyle: ImageStyle;
    imageModel: ImageModel;
    capability: ModelCapability;
    availableGroundingModes: GroundingMode[];
    aspectRatio: AspectRatio;
    imageSize: ImageSize;
    batchSize: number;
    outputFormat: OutputFormat;
    structuredOutputMode: StructuredOutputMode;
    temperature: number;
    thinkingLevel: ThinkingLevel;
    includeThoughts: boolean;
    groundingMode: GroundingMode;
    objectImageCount: number;
    characterImageCount: number;
    maxObjects: number;
    maxCharacters: number;
    floatingControlsZIndex: number;
    onSurfaceSharedControlsBottomChange: (bottom: number) => void;
    openSurfacePickerSheet: SurfaceSharedControlsProps['onOpenSheet'];
    openAdvancedSettings: () => void;
    getStyleLabel: (style: ImageStyle) => string;
    getModelLabel: (model: ImageModel) => string;
    workspaceImportReview: WorkspaceImportReviewProps['review'] | null;
    importedBranchSummaries: WorkspaceImportReviewProps['importedBranchSummaries'];
    importedLatestTurn: WorkspaceImportReviewProps['importedLatestTurn'];
    importedLatestSuccessfulTurn: WorkspaceImportReviewProps['importedLatestSuccessfulTurn'];
    isImportedPromotedContinuationSource: WorkspaceImportReviewProps['isPromotedContinuationSource'];
    getImportedContinueActionLabel: WorkspaceImportReviewProps['getContinueActionLabel'];
    handleCloseWorkspaceImportReview: WorkspaceImportReviewProps['onClose'];
    handleMergeImportedWorkspaceSnapshot: WorkspaceImportReviewProps['onMerge'];
    handleApplyImportedWorkspaceSnapshot: WorkspaceImportReviewProps['onReplace'];
    importReviewBranchActions: ImportReviewBranchActions;
    branchRenameDialog: {
        branchOriginId: string;
        autoLabel: string;
    } | null;
    getShortTurnId: (historyId?: string | null) => string;
    branchRenameDraft: string;
    setBranchRenameDraft: Dispatch<SetStateAction<string>>;
    closeBranchRenameDialog: BranchRenameDialogProps['onClose'];
    handleSubmitBranchRename: BranchRenameDialogProps['onSubmit'];
};

export function useWorkspaceOverlayAuxiliaryProps({
    currentLanguage,
    isSurfaceWorkspaceOpen,
    isAdvancedSettingsOpen,
    isEditing,
    activePickerSheet,
    settingsVariant,
    totalReferenceCount,
    hasSurfacePrompt,
    imageStyle,
    imageModel,
    capability,
    availableGroundingModes,
    aspectRatio,
    imageSize,
    batchSize,
    outputFormat,
    structuredOutputMode,
    temperature,
    thinkingLevel,
    includeThoughts,
    groundingMode,
    objectImageCount,
    characterImageCount,
    maxObjects,
    maxCharacters,
    floatingControlsZIndex,
    onSurfaceSharedControlsBottomChange,
    openSurfacePickerSheet,
    openAdvancedSettings,
    getStyleLabel,
    getModelLabel,
    workspaceImportReview,
    importedBranchSummaries,
    importedLatestTurn,
    importedLatestSuccessfulTurn,
    isImportedPromotedContinuationSource,
    getImportedContinueActionLabel,
    handleCloseWorkspaceImportReview,
    handleMergeImportedWorkspaceSnapshot,
    handleApplyImportedWorkspaceSnapshot,
    importReviewBranchActions,
    branchRenameDialog,
    getShortTurnId,
    branchRenameDraft,
    setBranchRenameDraft,
    closeBranchRenameDialog,
    handleSubmitBranchRename,
}: UseWorkspaceOverlayAuxiliaryPropsArgs) {
    return useMemo(
        () => ({
            surfaceSharedControlsProps: isSurfaceWorkspaceOpen
                ? ({
                      currentLanguage,
                      activePickerSheet,
                      isAdvancedSettingsOpen,
                      totalReferenceCount,
                      hasPrompt: hasSurfacePrompt,
                      styleLabel: getStyleLabel(imageStyle),
                      capability,
                      availableGroundingModes,
                      modelLabel: getModelLabel(imageModel),
                      aspectRatio,
                      imageSize,
                      batchSize,
                      outputFormat,
                      structuredOutputMode,
                      temperature,
                      thinkingLevel,
                      includeThoughts,
                      groundingMode,
                      objectImageCount,
                      characterImageCount,
                      maxObjects,
                      maxCharacters,
                      settingsVariant,
                      showStyleControl: !isEditing,
                      containerClassName: 'fixed left-4 top-20 md:left-5 md:top-24',
                      containerStyle: { zIndex: floatingControlsZIndex },
                      onBottomOffsetChange: onSurfaceSharedControlsBottomChange,
                      onOpenSheet: openSurfacePickerSheet,
                      onOpenAdvancedSettings: openAdvancedSettings,
                  } satisfies SurfaceSharedControlsProps)
                : null,
            importReviewProps: workspaceImportReview
                ? ({
                      currentLanguage,
                      review: workspaceImportReview,
                      importedBranchSummaries,
                      importedLatestTurn,
                      importedLatestSuccessfulTurn,
                      isPromotedContinuationSource: isImportedPromotedContinuationSource,
                      getContinueActionLabel: getImportedContinueActionLabel,
                      onClose: handleCloseWorkspaceImportReview,
                      onMerge: handleMergeImportedWorkspaceSnapshot,
                      onReplace: handleApplyImportedWorkspaceSnapshot,
                      onReplaceAndOpenLatest: importReviewBranchActions.openLatest,
                      onReplaceAndContinueLatest: importReviewBranchActions.continueLatest,
                      onReplaceAndBranchLatest: importReviewBranchActions.branchLatest,
                      onReplaceAndOpenBranchLatest: importReviewBranchActions.openBranchLatest,
                      onReplaceAndContinueBranchLatest: importReviewBranchActions.continueBranchLatest,
                      onReplaceAndBranchFromBranchLatest: importReviewBranchActions.branchFromBranchLatest,
                  } satisfies WorkspaceImportReviewProps)
                : null,
            branchRenameDialogProps: branchRenameDialog
                ? ({
                      currentLanguage,
                      branchOriginShortId: getShortTurnId(branchRenameDialog.branchOriginId),
                      autoLabel: branchRenameDialog.autoLabel,
                      draft: branchRenameDraft,
                      onDraftChange: setBranchRenameDraft,
                      onUseAutomaticLabel: () => setBranchRenameDraft(branchRenameDialog.autoLabel),
                      onReset: () => setBranchRenameDraft(''),
                      onClose: closeBranchRenameDialog,
                      onSubmit: handleSubmitBranchRename,
                  } satisfies BranchRenameDialogProps)
                : null,
        }),
        [
            activePickerSheet,
            aspectRatio,
            batchSize,
            branchRenameDialog,
            branchRenameDraft,
            characterImageCount,
            capability,
            closeBranchRenameDialog,
            currentLanguage,
            floatingControlsZIndex,
            getImportedContinueActionLabel,
            getModelLabel,
            getShortTurnId,
            getStyleLabel,
            handleApplyImportedWorkspaceSnapshot,
            handleCloseWorkspaceImportReview,
            handleMergeImportedWorkspaceSnapshot,
            handleSubmitBranchRename,
            groundingMode,
            imageModel,
            imageSize,
            imageStyle,
            includeThoughts,
            availableGroundingModes,
            onSurfaceSharedControlsBottomChange,
            openAdvancedSettings,
            isAdvancedSettingsOpen,
            importReviewBranchActions,
            importedBranchSummaries,
            importedLatestSuccessfulTurn,
            importedLatestTurn,
            isEditing,
            isImportedPromotedContinuationSource,
            isSurfaceWorkspaceOpen,
            maxCharacters,
            maxObjects,
            objectImageCount,
            openSurfacePickerSheet,
            outputFormat,
            settingsVariant,
            setBranchRenameDraft,
            structuredOutputMode,
            temperature,
            thinkingLevel,
            totalReferenceCount,
            hasSurfacePrompt,
            workspaceImportReview,
        ],
    );
}
