import React, { lazy, Suspense, useMemo } from 'react';
import ComposerSettingsPanel from './components/ComposerSettingsPanel';
import { DebugTerminalToggleIcon } from './components/DebugTerminalPanel';
import PanelLoadingFallback from './components/PanelLoadingFallback';
import SurfaceLoadingFallback from './components/SurfaceLoadingFallback';
import WorkspaceBottomFooter from './components/WorkspaceBottomFooter';
import WorkspaceDebugTerminalHost from './components/WorkspaceDebugTerminalHost';
import WorkspaceDetailOverlays from './components/WorkspaceDetailOverlays';
import { WorkspaceFloatingLayerContext } from './components/WorkspaceFloatingLayerContext';
import WorkspaceOverlayStack from './components/WorkspaceOverlayStack';
import WorkspaceSideToolPanel from './components/WorkspaceSideToolPanel';
import { renderWorkspaceSupportRail } from './components/WorkspaceSupportRail';
import WorkspaceTopHeader from './components/WorkspaceTopHeader';
import WorkspaceUnifiedHistoryPanel from './components/WorkspaceUnifiedHistoryPanel';
import {
    useWorkspaceOrchestrator,
    useWorkspaceStageViewer,
    useWorkspaceTopHeaderProps,
} from './hooks/useWorkspaceOrchestrator';
import { WorkspaceDomainStoreContext } from './state/workspaceDomainStore';

const ImageEditor = lazy(() => import('./components/ImageEditor'));
const GeneratedImage = lazy(() => import('./components/GeneratedImage'));
const WorkspaceHealthPanel = lazy(() => import('./components/WorkspaceHealthPanel'));
const GroundingProvenancePanel = lazy(() => import('./components/GroundingProvenancePanel'));
const SketchPad = lazy(() => import('./components/SketchPad'));

const stagePanelClassName =
    'min-w-0 nbu-shell-panel nbu-shell-surface-stage-hero min-h-[400px] overflow-hidden p-3 lg:min-h-0 xl:flex-1';

const App: React.FC = () => {
    const {
        store,
        isDarkTheme,
        currentLang,
        t,
        systemStatusRefreshToken,
        optimizationMode,
        handleLanguageChange,
        handleOptimizationModeChange,
        handleOpenDebugTerminal,
        uploadInputRef,
        workspaceImportInputRef,
        handleUploadForEdit,
        handleImportWorkspaceSnapshot,
        notification,
        surfaceSharedControlsProps,
        importReviewProps,
        advancedSettingsDialogProps,
        branchRenameDialogProps,
        workspacePickerSheetProps,
        composerSettingsPanelProps,
        workspaceFloatingLayerValue,
        floatingControlsZIndex,
        setWorkspaceFloatingHostElement,
        isSketchPadOpen,
        handleSketchPadSave,
        handleCloseSketchPad,
        showSketchReplaceConfirm,
        handleSketchReplaceCancel,
        handleSketchReplaceConfirm,
        isEditing,
        editingImageSource,
        editorContextSnapshot,
        editorInitialState,
        editorPrompt,
        setEditorPrompt,
        editorObjectImages,
        setEditorObjectImages,
        editorCharacterImages,
        setEditorCharacterImages,
        editorMode,
        setEditorMode,
        aspectRatio,
        setAspectRatio,
        activeEditorLockedAspectRatio,
        imageSize,
        setImageSize,
        batchSize,
        setBatchSize,
        handleEditorGenerate,
        showEditorQueueBatch,
        handleEditorQueueBatch,
        editorQueueDisabledReason,
        closeEditor,
        isGenerating,
        isForegroundGenerationLocked,
        error,
        setError,
        imageModel,
        surfaceSharedControlsBottom,
        groundingProvenancePanelProps,
        generatedImageUrls,
        selectedImageIndex,
        isViewerOpen,
        setIsViewerOpen,
        viewerHistoryItems,
        currentViewedCompletedHistoryId,
        handleViewerSelectHistoryItem,
        viewerPromptValue,
        groundingResolutionStatusSummary,
        groundingResolutionStatusTone,
        stageViewerSettings,
        generationMode,
        executionMode,
        stableHandleGenerate,
        stableHandleOpenEditor,
        stableHandleClearCurrentStage,
        stableHandleDownloadStageImage,
        stableHandleAddToObjectReference,
        capability,
        stableHandleAddToCharacterReference,
        logs,
        currentStageLinkedBranchSummary,
        currentStageHasLinkedHistoryTurn,
        currentStageIsCurrentSource,
        viewerMetadataItems,
        viewerMetadataStateMessage,
        effectiveThoughts,
        thoughtStateMessage,
        sessionHintEntries,
        formatSessionHintKey,
        formatSessionHintValue,
        handleApplyPromptFromViewer,
        viewerSettingsSnapshot,
        handleApplySettingsFromViewer,
        commitPendingViewerSelection,
        history,
        activeBatchPreviewSession,
        handleBatchPreviewTileSelect,
        selectedHistoryId,
        currentSourceHistoryId,
        activeBranchSummary,
        branchSummariesCount,
        handleHistorySelect,
        getBranchAccentClassName,
        handleOpenVersionsDetails,
        handleOpenWorkspaceImportPicker,
        handleExportWorkspaceSnapshot,
        handleOpenExportResultsModal,
        handleCloseExportResultsModal,
        handleOpenClearWorkspaceConfirm,
        handleCloseClearWorkspaceConfirm,
        handleConfirmClearWorkspace,
        progressThoughtsSummaryText,
        hasProgressActivity,
        hasSourceTrailInfo,
        hasQueuedBatchActivity,
        handleOpenProgressDetails,
        handleOpenSourcesDetails,
        handleOpenQueuedBatchJobs,
        canRepaintCurrentImage,
        handleOpenSketchPad,
        handleOpenEditor,
        handleOpenUploadToRepaint,
        objectImages,
        characterImages,
        styleImages,
        setObjectImages,
        setCharacterImages,
        setStyleImages,
        showNotification,
        handleRemoveObjectReference,
        handleRemoveCharacterReference,
        handleRemoveStyleReference,
        handleClearAllReferences,
        videoReference,
        handleVideoReferenceChange,
        handleUploadVideoFile,
        isUploadingVideo,
        cancelActiveVideoUpload,
        activeWorkspaceDetailModal,
        isQueuedBatchSpaceOpen,
        showClearWorkspaceConfirm,
        showExportResultsModal,
        showMetadataViewerDrawer,
        handleCloseMetadataViewer,
        handleApplyBothFromMetadataViewer,
        settingsLocked,
        handleCloseWorkspaceDetailModal,
        progressThoughtEntries,
        handleDownloadThoughtImage,
        latestWorkflowEntry,
        batchProgress,
        queuedJobs,
        getImportedQueuedResultCount,
        provenanceSummaryRows,
        provenanceContinuityMessage,
        groundingStateMessage,
        groundingSupportMessage,
        selectedSourcesCount,
        selectedSupportBundlesCount,
        versionsDetailPanelProps,
        queueBatchConversationNotice,
        getLineageActionLabel,
        getImportedQueuedHistoryItems,
        currentStageSourceHistoryId,
        handleImportAllQueuedJobs,
        handlePollAllQueuedJobs,
        handlePollQueuedJob,
        handleCancelQueuedJob,
        handleImportQueuedJob,
        handleOpenImportedQueuedJob,
        handleOpenLatestImportedQueuedJob,
        handleOpenImportedQueuedHistoryItem,
        handleClearIssueQueuedJobs,
        handleClearImportedQueuedJobs,
        handleRemoveQueuedJob,
        handleRecoverRecentQueuedJobs,
        handleClearStyle,
    } = useWorkspaceOrchestrator();

    const headerConsole = useMemo(
        () => (
            <div className="flex items-center gap-1.5 sm:gap-2">
                <Suspense
                    fallback={
                        <div data-testid="global-health-summary" className="flex items-center gap-1.5 sm:gap-2">
                            <div className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-slate-200/80 bg-white/78 px-2 py-1 text-[10px] font-semibold text-slate-600 dark:border-white/10 dark:bg-[#141922]/82 dark:text-slate-200 sm:px-2.5">
                                <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500"></span>
                                <span>{t('statusPanelLocalApi')}</span>
                            </div>
                            <div className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-slate-200/80 bg-white/78 px-2 py-1 text-[10px] font-semibold text-slate-600 dark:border-white/10 dark:bg-[#141922]/82 dark:text-slate-200 sm:px-2.5">
                                <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500"></span>
                                <span>{t('statusPanelGeminiKey')}</span>
                            </div>
                        </div>
                    }
                >
                    <WorkspaceHealthPanel currentLanguage={currentLang} refreshToken={systemStatusRefreshToken} />
                </Suspense>
                <button
                    type="button"
                    data-testid="debug-terminal-toggle"
                    onClick={handleOpenDebugTerminal}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200/80 bg-white/70 text-slate-500 transition-colors hover:border-cyan-300/80 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 dark:border-white/10 dark:bg-gray-800 dark:text-slate-300 dark:hover:border-cyan-400/50 dark:hover:bg-gray-700 dark:hover:text-cyan-300 sm:h-8 sm:w-8"
                    aria-label={t('debugTerminalOpen')}
                    title={t('debugTerminalOpen')}
                >
                    <DebugTerminalToggleIcon />
                </button>
            </div>
        ),
        [currentLang, handleOpenDebugTerminal, systemStatusRefreshToken, t],
    );

    const viewerProvenancePanel = useMemo(
        () => (
            <Suspense
                fallback={
                    <PanelLoadingFallback
                        label={t('loadingPrepareProvenancePanel')}
                        className={
                            isDarkTheme
                                ? 'rounded-[24px] border border-dashed border-slate-700/70 bg-slate-900/70 px-4 py-6 text-center text-sm text-slate-300'
                                : 'rounded-[24px] border border-dashed border-slate-200 bg-white/90 px-4 py-6 text-center text-sm text-slate-500'
                        }
                    />
                }
            >
                <GroundingProvenancePanel
                    {...groundingProvenancePanelProps}
                    tone={isDarkTheme ? 'dark' : 'light'}
                    scope={isDarkTheme ? 'dark' : 'primary'}
                />
            </Suspense>
        ),
        [groundingProvenancePanelProps, isDarkTheme, t],
    );

    const { workspaceViewerOverlayProps, generatedImageStageProps } = useWorkspaceStageViewer({
        generatedImageUrls,
        selectedImageIndex,
        isViewerOpen,
        setIsViewerOpen,
        isGenerating,
        showStageGeneratingState: isForegroundGenerationLocked && generatedImageUrls.length === 0,
        viewerItems: viewerHistoryItems,
        viewerSelectedHistoryId: currentViewedCompletedHistoryId,
        onSelectViewerItem: handleViewerSelectHistoryItem,
        prompt: viewerPromptValue,
        error,
        resultStatusSummary: groundingResolutionStatusSummary,
        resultStatusTone: groundingResolutionStatusTone,
        settings: stageViewerSettings,
        generationMode,
        executionMode,
        onGenerate: stableHandleGenerate,
        onEdit: stableHandleOpenEditor,
        onClear: stableHandleClearCurrentStage,
        onDownloadStageImage: stableHandleDownloadStageImage,
        onAddToObjectReference: stableHandleAddToObjectReference,
        onAddToCharacterReference: capability.maxCharacters > 0 ? stableHandleAddToCharacterReference : undefined,
        currentLanguage: currentLang,
        currentLog: logs.length > 0 ? logs[logs.length - 1] : '',
        currentStageBranchLabel: currentStageLinkedBranchSummary?.branchLabel || null,
        currentStageHasLinkedHistoryTurn,
        currentStageIsCurrentSource,
        metadataItems: viewerMetadataItems,
        metadataStateMessage: viewerMetadataStateMessage,
        effectiveThoughts,
        thoughtStateMessage,
        provenancePanel: viewerProvenancePanel,
        sessionHintEntries,
        formatSessionHintKey,
        formatSessionHintValue,
        onApplyPrompt: handleApplyPromptFromViewer,
        settingsSnapshot: viewerSettingsSnapshot,
        onApplySettings: handleApplySettingsFromViewer,
        onCloseViewer: commitPendingViewerSelection,
    });

    const historySurface = useMemo(
        () => (
            <WorkspaceUnifiedHistoryPanel
                currentLanguage={currentLang}
                history={history}
                previewTiles={activeBatchPreviewSession?.tiles || []}
                selectedPreviewSlotIndex={activeBatchPreviewSession?.selectedPreviewSlotIndex ?? null}
                onPreviewTileSelect={handleBatchPreviewTileSelect}
                selectedHistoryId={selectedHistoryId}
                currentSourceHistoryId={currentSourceHistoryId}
                activeBranchSummary={activeBranchSummary}
                branchSummariesCount={branchSummariesCount}
                onSelect={handleHistorySelect}
                getBranchAccentClassName={getBranchAccentClassName}
                onOpenVersionsDetails={handleOpenVersionsDetails}
                onImportWorkspace={handleOpenWorkspaceImportPicker}
                onExportWorkspace={handleExportWorkspaceSnapshot}
                onExportResults={handleOpenExportResultsModal}
                onClearWorkspace={handleOpenClearWorkspaceConfirm}
            />
        ),
        [
            activeBranchSummary,
            activeBatchPreviewSession?.selectedPreviewSlotIndex,
            activeBatchPreviewSession?.tiles,
            branchSummariesCount,
            currentLang,
            currentSourceHistoryId,
            getBranchAccentClassName,
            handleBatchPreviewTileSelect,
            handleExportWorkspaceSnapshot,
            handleHistorySelect,
            handleOpenClearWorkspaceConfirm,
            handleOpenExportResultsModal,
            handleOpenVersionsDetails,
            handleOpenWorkspaceImportPicker,
            history,
            selectedHistoryId,
            t,
        ],
    );

    const supportRail = renderWorkspaceSupportRail({
        currentLanguage: currentLang,
        progressThoughtsSummaryText,
        hasProgressActivity,
        hasSourceTrailInfo,
        hasQueuedBatchActivity,
        onOpenProgressDetails: handleOpenProgressDetails,
        onOpenSourcesDetails: handleOpenSourcesDetails,
        onOpenQueuedBatchJobs: handleOpenQueuedBatchJobs,
        t,
    });

    const workspaceTopHeaderProps = useWorkspaceTopHeaderProps({
        headerConsole,
        currentLanguage: currentLang,
        onLanguageChange: handleLanguageChange,
        supportRail,
        optimizationMode,
        onOptimizationModeChange: handleOptimizationModeChange,
    });

    const sideToolPanel = useMemo(
        () => (
            <WorkspaceSideToolPanel
                currentLanguage={currentLang}
                canEditCurrentImage={canRepaintCurrentImage}
                onOpenSketchPad={handleOpenSketchPad}
                onOpenEditor={handleOpenEditor}
                onOpenUploadToRepaint={handleOpenUploadToRepaint}
                objectImages={objectImages}
                characterImages={characterImages}
                styleImages={styleImages}
                maxObjects={capability.maxObjects}
                maxCharacters={capability.maxCharacters}
                maxStyles={capability.maxStyles}
                setObjectImages={setObjectImages}
                setCharacterImages={setCharacterImages}
                setStyleImages={setStyleImages}
                isGenerating={isForegroundGenerationLocked}
                showNotification={showNotification}
                handleRemoveObjectReference={handleRemoveObjectReference}
                handleRemoveCharacterReference={handleRemoveCharacterReference}
                handleRemoveStyleReference={handleRemoveStyleReference}
                handleClearAllReferences={handleClearAllReferences}
                supportsVideo={capability.supportsVideo}
                imageModel={imageModel}
                videoReference={videoReference}
                onVideoReferenceChange={handleVideoReferenceChange}
                onUploadVideoFile={handleUploadVideoFile}
                isUploadingVideo={isUploadingVideo}
                onCancelVideoUpload={cancelActiveVideoUpload}
            />
        ),
        [
            cancelActiveVideoUpload,
            canRepaintCurrentImage,
            capability.maxCharacters,
            capability.maxObjects,
            capability.maxStyles,
            capability.supportsVideo,
            characterImages,
            currentLang,
            handleClearAllReferences,
            handleOpenEditor,
            handleOpenSketchPad,
            handleOpenUploadToRepaint,
            handleRemoveCharacterReference,
            handleRemoveObjectReference,
            handleRemoveStyleReference,
            handleUploadVideoFile,
            handleVideoReferenceChange,
            imageModel,
            isForegroundGenerationLocked,
            isUploadingVideo,
            objectImages,
            setCharacterImages,
            setObjectImages,
            setStyleImages,
            showNotification,
            styleImages,
            t,
            videoReference,
        ],
    );

    const contextProvenanceDetailPanel = useMemo(
        () => (
            <Suspense
                fallback={
                    <PanelLoadingFallback
                        label={t('loadingPrepareProvenancePanel')}
                        className="nbu-dashed-panel px-3 py-5 text-center text-sm text-slate-500 dark:text-slate-300"
                    />
                }
            >
                <GroundingProvenancePanel {...groundingProvenancePanelProps} tone="light" scope="primary" />
            </Suspense>
        ),
        [groundingProvenancePanelProps, t],
    );

    const workspaceOverlayContent = (
        <WorkspaceDetailOverlays
            activeWorkspaceDetailModal={activeWorkspaceDetailModal}
            isQueuedBatchSpaceOpen={isQueuedBatchSpaceOpen}
            showClearWorkspaceConfirm={showClearWorkspaceConfirm}
            showExportResultsModal={showExportResultsModal}
            onCloseExportResultsModal={handleCloseExportResultsModal}
            showMetadataViewerDrawer={showMetadataViewerDrawer}
            onCloseMetadataViewerDrawer={handleCloseMetadataViewer}
            onApplyMetadataPrompt={handleApplyPromptFromViewer}
            onApplyMetadataSettings={handleApplySettingsFromViewer}
            onApplyMetadataBoth={handleApplyBothFromMetadataViewer}
            settingsLocked={settingsLocked}
            history={history}
            showNotification={showNotification}
            currentLang={currentLang}
            t={t}
            onCloseDetailModal={handleCloseWorkspaceDetailModal}
            onCloseClearConfirm={handleCloseClearWorkspaceConfirm}
            onConfirmClearWorkspace={handleConfirmClearWorkspace}
            onExportWorkspaceSnapshot={handleExportWorkspaceSnapshot}
            progressThoughtEntries={progressThoughtEntries}
            onDownloadThoughtImage={handleDownloadThoughtImage}
            latestWorkflowEntry={latestWorkflowEntry}
            isGenerating={isGenerating}
            batchProgress={batchProgress}
            queuedJobs={queuedJobs}
            getImportedQueuedResultCount={getImportedQueuedResultCount}
            groundingResolutionStatusSummary={groundingResolutionStatusSummary}
            groundingResolutionStatusTone={groundingResolutionStatusTone}
            thoughtsText={progressThoughtsSummaryText}
            thoughtStateMessage={thoughtStateMessage}
            provenanceSummaryRows={provenanceSummaryRows}
            provenanceContinuityMessage={provenanceContinuityMessage}
            groundingStateMessage={groundingStateMessage}
            groundingSupportMessage={groundingSupportMessage}
            selectedSourcesCount={selectedSourcesCount}
            selectedSupportBundlesCount={selectedSupportBundlesCount}
            contextProvenanceDetailPanel={contextProvenanceDetailPanel}
            versionsDetailPanelProps={versionsDetailPanelProps}
            queueBatchConversationNotice={queueBatchConversationNotice}
            getLineageActionLabel={getLineageActionLabel}
            getImportedQueuedHistoryItems={getImportedQueuedHistoryItems}
            currentStageSourceHistoryId={currentStageSourceHistoryId}
            onImportAllQueuedJobs={handleImportAllQueuedJobs}
            onPollAllQueuedJobs={handlePollAllQueuedJobs}
            onPollQueuedJob={handlePollQueuedJob}
            onCancelQueuedJob={handleCancelQueuedJob}
            onImportQueuedJob={handleImportQueuedJob}
            onOpenImportedQueuedJob={handleOpenImportedQueuedJob}
            onOpenLatestImportedQueuedJob={handleOpenLatestImportedQueuedJob}
            onOpenImportedQueuedHistoryItem={handleOpenImportedQueuedHistoryItem}
            onClearIssueQueuedJobs={handleClearIssueQueuedJobs}
            onClearImportedQueuedJobs={handleClearImportedQueuedJobs}
            onRemoveQueuedJob={handleRemoveQueuedJob}
            onRecoverRecentQueuedJobs={handleRecoverRecentQueuedJobs}
        />
    );

    const focusSurface = useMemo(
        () => (
            <div className={stagePanelClassName}>
                <Suspense
                    fallback={
                        <PanelLoadingFallback
                            label={t('loadingStageSurface')}
                            className="nbu-dashed-panel flex h-full min-h-[360px] items-center justify-center rounded-[24px] text-sm text-gray-500 dark:text-gray-400 xl:min-h-0"
                        />
                    }
                >
                    <GeneratedImage {...generatedImageStageProps} />
                </Suspense>
            </div>
        ),
        [generatedImageStageProps, t],
    );

    return (
        <WorkspaceDomainStoreContext.Provider value={store}>
            <div className="relative min-h-screen w-full overflow-x-hidden bg-[linear-gradient(180deg,_#fffaf2_0%,_#f8fafc_38%,_#eef3f8_100%)] text-gray-900 transition-colors duration-500 dark:bg-[linear-gradient(180deg,_#111315_0%,_#090b10_46%,_#030405_100%)] dark:text-gray-100">
                <div
                    aria-hidden="true"
                    data-testid="workspace-ambient-backdrop"
                    className="pointer-events-none absolute inset-0 overflow-hidden"
                >
                    <div
                        data-testid="workspace-ambient-glow"
                        className="absolute inset-0 bg-[radial-gradient(ellipse_38vw_560px_at_12%_58px,rgba(251,191,36,0.22)_0%,rgba(251,191,36,0.09)_38%,rgba(251,191,36,0.025)_68%,transparent_100%),radial-gradient(ellipse_34vw_480px_at_84%_36px,rgba(56,189,248,0.14)_0%,rgba(56,189,248,0.06)_38%,rgba(56,189,248,0.015)_68%,transparent_100%),radial-gradient(ellipse_48vw_420px_at_56%_0px,rgba(255,255,255,0.72)_0%,rgba(255,255,255,0.26)_44%,transparent_100%)] dark:bg-[radial-gradient(ellipse_38vw_560px_at_14%_56px,rgba(245,158,11,0.18)_0%,rgba(245,158,11,0.075)_38%,rgba(245,158,11,0.02)_68%,transparent_100%),radial-gradient(ellipse_34vw_480px_at_82%_48px,rgba(14,165,233,0.12)_0%,rgba(14,165,233,0.05)_38%,rgba(14,165,233,0.012)_68%,transparent_100%),radial-gradient(ellipse_48vw_420px_at_50%_0px,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.022)_44%,transparent_100%)]"
                    />
                    <div className="absolute left-[-8%] top-[20%] h-64 w-64 rounded-full bg-amber-200/20 blur-3xl dark:bg-amber-500/10" />
                    <div className="absolute right-[-5%] top-[32%] h-72 w-72 rounded-full bg-sky-200/20 blur-3xl dark:bg-sky-500/10" />
                </div>
                <input
                    id="global-upload-input"
                    type="file"
                    ref={uploadInputRef}
                    onChange={handleUploadForEdit}
                    className="hidden"
                    accept="image/*"
                />
                <input
                    id="workspace-import-input"
                    type="file"
                    ref={workspaceImportInputRef}
                    onChange={handleImportWorkspaceSnapshot}
                    className="hidden"
                    accept="application/json,.json"
                />

                <WorkspaceOverlayStack
                    notification={notification}
                    surfaceSharedControlsProps={surfaceSharedControlsProps}
                    importReviewProps={importReviewProps}
                    advancedSettingsDialogProps={advancedSettingsDialogProps}
                    extraOverlays={workspaceOverlayContent}
                    sketchPadSurface={
                        isSketchPadOpen ? (
                            <Suspense fallback={<SurfaceLoadingFallback label={t('loadingPrepareSketchPad')} />}>
                                <SketchPad
                                    onSave={handleSketchPadSave}
                                    onClose={handleCloseSketchPad}
                                    currentLanguage={currentLang}
                                    imageModel={imageModel}
                                    currentRatio={aspectRatio}
                                />
                            </Suspense>
                        ) : null
                    }
                    showSketchReplaceConfirm={showSketchReplaceConfirm}
                    sketchReplaceTitle={t('sketchReplaceTitle')}
                    sketchReplaceMessage={t('sketchReplaceMsg')}
                    sketchReplaceActionsTitle={t('workspaceRestoreActionsTitle')}
                    sketchReplaceCancelLabel={t('clearHistoryCancel')}
                    sketchReplaceConfirmLabel={t('sketchReplaceConfirm')}
                    onSketchReplaceCancel={handleSketchReplaceCancel}
                    onSketchReplaceConfirm={handleSketchReplaceConfirm}
                    branchRenameDialogProps={branchRenameDialogProps}
                    imageEditorSurface={
                        isEditing ? (
                            editingImageSource ? (
                                <Suspense fallback={<SurfaceLoadingFallback label={t('loadingPrepareUltraEditor')} />}>
                                    <ImageEditor
                                        initialImageUrl={editingImageSource}
                                        initialPreparedSource={editorContextSnapshot?.editorPreparedSource ?? null}
                                        initialPrompt={editorInitialState.prompt}
                                        initialObjectImages={editorInitialState.objectImages}
                                        initialCharacterImages={editorInitialState.characterImages}
                                        initialRatio={editorInitialState.ratio}
                                        initialSize={editorInitialState.size}
                                        initialBatchSize={editorInitialState.batchSize}
                                        prompt={editorPrompt}
                                        onPromptChange={setEditorPrompt}
                                        objectImages={editorObjectImages}
                                        onObjectImagesChange={setEditorObjectImages}
                                        characterImages={editorCharacterImages}
                                        onCharacterImagesChange={setEditorCharacterImages}
                                        mode={editorMode}
                                        onModeChange={setEditorMode}
                                        ratio={aspectRatio}
                                        onRatioChange={setAspectRatio}
                                        lockedAspectRatio={activeEditorLockedAspectRatio}
                                        size={imageSize}
                                        onSizeChange={setImageSize}
                                        batchSize={batchSize}
                                        onBatchSizeChange={setBatchSize}
                                        onGenerate={handleEditorGenerate}
                                        onQueueBatch={showEditorQueueBatch ? handleEditorQueueBatch : undefined}
                                        queueBatchDisabledReason={
                                            showEditorQueueBatch ? null : editorQueueDisabledReason
                                        }
                                        onCancel={closeEditor}
                                        isGenerating={isGenerating}
                                        currentLanguage={currentLang}
                                        error={error?.summary || null}
                                        onErrorClear={() => setError(null)}
                                        imageModel={imageModel}
                                        leftDockTopOffset={
                                            surfaceSharedControlsBottom === null
                                                ? null
                                                : surfaceSharedControlsBottom + 12
                                        }
                                    />
                                </Suspense>
                            ) : (
                                <SurfaceLoadingFallback label={t('loadingPrepareUltraEditor')} />
                            )
                        ) : null
                    }
                    pickerSheetProps={workspacePickerSheetProps}
                    viewerOverlayProps={workspaceViewerOverlayProps}
                />

                <WorkspaceFloatingLayerContext.Provider value={workspaceFloatingLayerValue}>
                    <WorkspaceTopHeader {...workspaceTopHeaderProps} />

                    <WorkspaceDebugTerminalHost store={store} t={t} />

                    <div className="relative z-10 mx-auto flex min-h-screen max-w-[1560px] flex-col px-4 pb-[50px] pt-[100px] lg:px-4 lg:pb-[54px] xl:min-h-0 xl:px-3 xl:pt-[58px]">
                        <main className="mt-0 flex flex-1 flex-col gap-1.5 xl:min-h-0 xl:flex-none">
                            <section
                                data-testid="workspace-main-shell"
                                className="grid min-w-0 gap-1.5 xl:min-h-0 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] xl:items-stretch"
                            >
                                <div
                                    data-testid="workspace-work-column"
                                    className="grid min-w-0 gap-1.5 xl:min-h-0 xl:flex xl:flex-col"
                                >
                                    <section
                                        data-testid="workspace-actions-composer-row"
                                        className="min-w-0 xl:min-h-0 xl:flex xl:flex-1 xl:flex-col"
                                    >
                                        <ComposerSettingsPanel
                                            {...composerSettingsPanelProps}
                                            imageToolsPanel={sideToolPanel}
                                            onClearStyle={handleClearStyle}
                                        />
                                    </section>
                                </div>

                                <div
                                    data-testid="workspace-stage-column"
                                    className="grid min-w-0 gap-1.5 xl:min-h-0 xl:flex xl:flex-col"
                                >
                                    <div data-testid="workspace-history-column" className="min-w-0 xl:min-h-0">
                                        {historySurface}
                                    </div>
                                    <div
                                        data-testid="workspace-stage-surface"
                                        className="min-w-0 xl:flex xl:min-h-0 xl:flex-1 xl:flex-col"
                                    >
                                        {focusSurface}
                                    </div>
                                </div>
                            </section>
                        </main>
                    </div>
                    <div
                        ref={setWorkspaceFloatingHostElement}
                        data-workspace-floating-layer="true"
                        className="pointer-events-none fixed inset-0"
                        style={{ zIndex: floatingControlsZIndex + 1 }}
                    />
                </WorkspaceFloatingLayerContext.Provider>

                <WorkspaceBottomFooter />
            </div>
        </WorkspaceDomainStoreContext.Provider>
    );
};

export default App;
