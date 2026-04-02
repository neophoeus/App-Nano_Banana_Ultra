import { Dispatch, SetStateAction, useMemo } from 'react';
import BranchRenameDialog from '../components/BranchRenameDialog';
import SurfaceSharedControls, { SurfaceSharedControlsVariant } from '../components/SurfaceSharedControls';
import WorkspaceImportReview from '../components/WorkspaceImportReview';
import { AspectRatio, ImageModel, ImageSize, ImageStyle } from '../types';
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
    isSurfaceSharedControlsOpen: boolean;
    isAdvancedSettingsOpen: boolean;
    isEditing: boolean;
    activeSurfaceSheetLabel: string;
    activePickerSheet: SurfaceSharedControlsProps['activePickerSheet'] | 'history' | 'templates';
    surfacePromptPreview: string;
    settingsVariant: SurfaceSharedControlsVariant;
    totalReferenceCount: number;
    imageStyle: ImageStyle;
    imageModel: ImageModel;
    aspectRatio: AspectRatio;
    imageSize: ImageSize;
    batchSize: number;
    objectImageCount: number;
    characterImageCount: number;
    maxObjects: number;
    maxCharacters: number;
    floatingControlsZIndex: number;
    setIsSurfaceSharedControlsOpen: Dispatch<SetStateAction<boolean>>;
    setIsAdvancedSettingsOpen: Dispatch<SetStateAction<boolean>>;
    openSurfacePickerSheet: SurfaceSharedControlsProps['onOpenSheet'];
    getStyleLabel: (style: ImageStyle) => string;
    getModelLabel: (model: ImageModel) => string;
    openPromptSheet: () => void;
    openPromptHistorySheet: () => void;
    openReferencesSheet: () => void;
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
    isSurfaceSharedControlsOpen,
    isAdvancedSettingsOpen,
    isEditing,
    activeSurfaceSheetLabel,
    activePickerSheet,
    surfacePromptPreview,
    settingsVariant,
    totalReferenceCount,
    imageStyle,
    imageModel,
    aspectRatio,
    imageSize,
    batchSize,
    objectImageCount,
    characterImageCount,
    maxObjects,
    maxCharacters,
    floatingControlsZIndex,
    setIsSurfaceSharedControlsOpen,
    setIsAdvancedSettingsOpen,
    openSurfacePickerSheet,
    getStyleLabel,
    getModelLabel,
    openPromptSheet,
    openPromptHistorySheet,
    openReferencesSheet,
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
                      isOpen: isSurfaceSharedControlsOpen,
                      workspaceLabel: getTranslation(currentLanguage, isEditing ? 'editorTitle' : 'sketchTitle'),
                      stateDescription: getTranslation(
                          currentLanguage,
                          isEditing ? 'surfaceSharedControlsStateDescEditor' : 'surfaceSharedControlsStateDesc',
                      ).replace('{0}', getTranslation(currentLanguage, isEditing ? 'editorTitle' : 'sketchTitle')),
                      activeSheetLabel: activeSurfaceSheetLabel,
                      activePickerSheet:
                          activePickerSheet === 'history' || activePickerSheet === 'templates'
                              ? null
                              : activePickerSheet,
                      isAdvancedSettingsOpen,
                      promptPreview: surfacePromptPreview,
                      totalReferenceCount,
                      styleLabel: getStyleLabel(imageStyle),
                      modelLabel: getModelLabel(imageModel),
                      aspectRatio,
                      imageSize,
                      batchSize,
                      objectImageCount,
                      characterImageCount,
                      maxObjects,
                      maxCharacters,
                      settingsVariant,
                      containerClassName: 'fixed right-4 top-20 flex flex-col items-end gap-3 md:right-5 md:top-24',
                      containerStyle: { zIndex: floatingControlsZIndex },
                      onToggleOpen: () => setIsSurfaceSharedControlsOpen((previous) => !previous),
                      onClosePanel: () => setIsSurfaceSharedControlsOpen(false),
                      onOpenSheet: openSurfacePickerSheet,
                      onOpenAdvancedSettings: () => {
                          setIsSurfaceSharedControlsOpen(false);
                          setIsAdvancedSettingsOpen(true);
                      },
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
            activeSurfaceSheetLabel,
            aspectRatio,
            batchSize,
            branchRenameDialog,
            branchRenameDraft,
            characterImageCount,
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
            imageModel,
            imageSize,
            imageStyle,
            isAdvancedSettingsOpen,
            importReviewBranchActions,
            importedBranchSummaries,
            importedLatestSuccessfulTurn,
            importedLatestTurn,
            isEditing,
            isImportedPromotedContinuationSource,
            isSurfaceSharedControlsOpen,
            isSurfaceWorkspaceOpen,
            maxCharacters,
            maxObjects,
            objectImageCount,
            openPromptHistorySheet,
            openPromptSheet,
            openReferencesSheet,
            openSurfacePickerSheet,
            settingsVariant,
            setBranchRenameDraft,
            setIsAdvancedSettingsOpen,
            setIsSurfaceSharedControlsOpen,
            surfacePromptPreview,
            totalReferenceCount,
            workspaceImportReview,
        ],
    );
}
