import { Dispatch, SetStateAction, useMemo } from 'react';
import BranchRenameDialog from '../components/BranchRenameDialog';
import SurfaceSharedControls from '../components/SurfaceSharedControls';
import WorkspaceImportReview from '../components/WorkspaceImportReview';
import WorkspaceRestoreNotice from '../components/WorkspaceRestoreNotice';
import { AspectRatio, GeneratedImage, ImageModel, ImageSize, ImageStyle } from '../types';
import { getTranslation, Language } from '../utils/translations';

type BranchRenameDialogProps = React.ComponentProps<typeof BranchRenameDialog>;
type SurfaceSharedControlsProps = React.ComponentProps<typeof SurfaceSharedControls>;
type WorkspaceImportReviewProps = React.ComponentProps<typeof WorkspaceImportReview>;
type WorkspaceRestoreNoticeProps = React.ComponentProps<typeof WorkspaceRestoreNotice>;

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
    onLanguageChange: Dispatch<SetStateAction<Language>>;
    isSurfaceWorkspaceOpen: boolean;
    isSurfaceSharedControlsOpen: boolean;
    isAdvancedSettingsOpen: boolean;
    isEditing: boolean;
    activeSurfaceSheetLabel: string;
    activePickerSheet: SurfaceSharedControlsProps['activePickerSheet'] | 'history' | 'gallery' | 'templates';
    surfacePromptPreview: string;
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
    showWorkspaceRestoreNotice: boolean;
    historyCount: number;
    stagedAssetCount: number;
    viewerImageCount: number;
    activeBranchLabel: string | null;
    latestRestorableTurn: GeneratedImage | null;
    latestSuccessfulRestorableTurn: GeneratedImage | null;
    handleHistorySelect: (item: GeneratedImage) => void;
    handleContinueFromHistoryTurn: (item: GeneratedImage) => void;
    handleBranchFromHistoryTurn: (item: GeneratedImage) => void;
    setShowWorkspaceRestoreNotice: Dispatch<SetStateAction<boolean>>;
    getContinueActionLabel: (item: GeneratedImage) => string;
    handleStartNewConversation: () => void;
    openPromptSheet: () => void;
    openGallerySheet: () => void;
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
    onLanguageChange,
    isSurfaceWorkspaceOpen,
    isSurfaceSharedControlsOpen,
    isAdvancedSettingsOpen,
    isEditing,
    activeSurfaceSheetLabel,
    activePickerSheet,
    surfacePromptPreview,
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
    showWorkspaceRestoreNotice,
    historyCount,
    stagedAssetCount,
    viewerImageCount,
    activeBranchLabel,
    latestRestorableTurn,
    latestSuccessfulRestorableTurn,
    handleHistorySelect,
    handleContinueFromHistoryTurn,
    handleBranchFromHistoryTurn,
    setShowWorkspaceRestoreNotice,
    getContinueActionLabel,
    handleStartNewConversation,
    openPromptSheet,
    openGallerySheet,
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
                      activeSheetLabel: activeSurfaceSheetLabel,
                      activePickerSheet:
                          activePickerSheet === 'history' ||
                          activePickerSheet === 'gallery' ||
                          activePickerSheet === 'templates'
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
            restoreNoticeProps: showWorkspaceRestoreNotice
                ? ({
                      currentLanguage,
                      onLanguageChange,
                      historyCount,
                      stagedAssetCount,
                      viewerImageCount,
                      activeBranchLabel,
                      onOpenLatestTurn: latestRestorableTurn
                          ? () => {
                                handleHistorySelect(latestRestorableTurn);
                                setShowWorkspaceRestoreNotice(false);
                            }
                          : undefined,
                      onContinueRestoredChain: latestSuccessfulRestorableTurn
                          ? () => {
                                handleContinueFromHistoryTurn(latestSuccessfulRestorableTurn);
                                setShowWorkspaceRestoreNotice(false);
                            }
                          : undefined,
                      continueActionLabel: latestSuccessfulRestorableTurn
                          ? (() => {
                                const resolvedLabel = getContinueActionLabel(latestSuccessfulRestorableTurn);
                                const genericContinueLabel = getTranslation(currentLanguage, 'lineageActionContinue');
                                return resolvedLabel !== genericContinueLabel
                                    ? resolvedLabel
                                    : getTranslation(currentLanguage, 'workspaceRestoreContinueChain');
                            })()
                          : undefined,
                      onBranchFromRestore: latestSuccessfulRestorableTurn
                          ? () => {
                                handleBranchFromHistoryTurn(latestSuccessfulRestorableTurn);
                                setShowWorkspaceRestoreNotice(false);
                            }
                          : undefined,
                      onUseSettingsClearChain: () => {
                          handleStartNewConversation();
                          setShowWorkspaceRestoreNotice(false);
                      },
                      onDismiss: () => setShowWorkspaceRestoreNotice(false),
                  } satisfies WorkspaceRestoreNoticeProps)
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
            activeBranchLabel,
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
            getContinueActionLabel,
            getImportedContinueActionLabel,
            getModelLabel,
            getShortTurnId,
            getStyleLabel,
            handleApplyImportedWorkspaceSnapshot,
            handleBranchFromHistoryTurn,
            handleCloseWorkspaceImportReview,
            handleContinueFromHistoryTurn,
            handleHistorySelect,
            handleMergeImportedWorkspaceSnapshot,
            handleStartNewConversation,
            handleSubmitBranchRename,
            historyCount,
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
            latestRestorableTurn,
            latestSuccessfulRestorableTurn,
            maxCharacters,
            maxObjects,
            objectImageCount,
            onLanguageChange,
            openGallerySheet,
            openPromptHistorySheet,
            openPromptSheet,
            openReferencesSheet,
            openSurfacePickerSheet,
            setBranchRenameDraft,
            setIsAdvancedSettingsOpen,
            setIsSurfaceSharedControlsOpen,
            setShowWorkspaceRestoreNotice,
            showWorkspaceRestoreNotice,
            stagedAssetCount,
            surfacePromptPreview,
            totalReferenceCount,
            viewerImageCount,
            workspaceImportReview,
        ],
    );
}
