import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense, lazy } from 'react';
import {
    AspectRatio,
    BranchNameOverrides,
    ExecutionMode,
    GroundingMode,
    ImageSize,
    ImageStyle,
    ImageModel,
    OutputFormat,
    ThinkingLevel,
    GroundingMetadata,
    ProvenanceContinuityMode,
    StageAsset,
    ResultArtifacts,
    SessionContinuitySource,
} from './types';
import RecentHistoryFilmstrip from './components/RecentHistoryFilmstrip';
import ComposerAdvancedSettingsDialog from './components/ComposerAdvancedSettingsDialog';
import ComposerSettingsPanel from './components/ComposerSettingsPanel';
import PanelLoadingFallback from './components/PanelLoadingFallback';
import SurfaceLoadingFallback from './components/SurfaceLoadingFallback';
import WorkspaceHistoryCanvas from './components/WorkspaceHistoryCanvas';
import WorkspaceInsightsHeaderSummary from './components/WorkspaceInsightsHeaderSummary';
import WorkspaceInsightsSidebar from './components/WorkspaceInsightsSidebar';
import WorkspaceOverlayStack from './components/WorkspaceOverlayStack';
import WorkspaceResponseRail from './components/WorkspaceResponseRail';
import WorkspaceSideToolPanel from './components/WorkspaceSideToolPanel';
import WorkspaceTopHeader from './components/WorkspaceTopHeader';
import { Language, ensureLanguageLoaded, getTranslation } from './utils/translations';
import { ASPECT_RATIOS, IMAGE_MODELS, MODEL_CAPABILITIES, OUTPUT_FORMATS, THINKING_LEVELS } from './constants';
import {
    EMPTY_WORKSPACE_COMPOSER_STATE,
    EMPTY_WORKSPACE_SESSION,
    loadWorkspaceSnapshot,
} from './utils/workspacePersistence';
import { shouldShowRestoreNoticeForSnapshot } from './utils/workspaceSnapshotState';
import {
    deriveGroundingMode,
    getAvailableGroundingModes,
    getGroundingFlagsFromMode,
    getGroundingModeLabel,
} from './utils/groundingMode';
import { inferExecutionModeFromHistoryItem } from './utils/executionMode';
import { EMPTY_WORKSPACE_CONVERSATION_STATE } from './utils/conversationState';
import { useImageGeneration } from './hooks/useImageGeneration';
import { usePerformGeneration } from './hooks/usePerformGeneration';
import { usePromptTools } from './hooks/usePromptTools';
import { usePromptHistory, PROMPT_TEMPLATES, MAX_DISPLAY_HISTORY } from './hooks/usePromptHistory';
import { useComposerState } from './hooks/useComposerState';
import { useGroundingProvenanceView } from './hooks/useGroundingProvenanceView';
import { useGroundingProvenancePanelProps } from './hooks/useGroundingProvenancePanelProps';
import { useHistoryPresentationHelpers } from './hooks/useHistoryPresentationHelpers';
import { useHistorySourceOrchestration } from './hooks/useHistorySourceOrchestration';
import { useImportedWorkspaceReview } from './hooks/useImportedWorkspaceReview';
import { useComposerSettingsPanelProps } from './hooks/useComposerSettingsPanelProps';
import { useWorkspaceInsightsSidebarProps } from './hooks/useWorkspaceInsightsSidebarProps';
import { useWorkspaceOverlayAuxiliaryProps } from './hooks/useWorkspaceOverlayAuxiliaryProps';
import { useWorkspacePickerSheetProps } from './hooks/useWorkspacePickerSheetProps';
import { useRecentHistoryFilmstripProps } from './hooks/useRecentHistoryFilmstripProps';
import { useWorkspaceStageViewer } from './hooks/useWorkspaceStageViewer';
import { useWorkspaceTopHeaderProps } from './hooks/useWorkspaceTopHeaderProps';
import { useWorkspaceBranchPresentation } from './hooks/useWorkspaceBranchPresentation';
import { useProvenanceContinuation } from './hooks/useProvenanceContinuation';
import { useSelectedResultState } from './hooks/useSelectedResultState';
import { useWorkspaceAssets } from './hooks/useWorkspaceAssets';
import { useWorkspaceLineageSelectors } from './hooks/useWorkspaceLineageSelectors';
import { useWorkspaceShellViewModel } from './hooks/useWorkspaceShellViewModel';
import { useWorkspaceCapabilityConstraints } from './hooks/useWorkspaceCapabilityConstraints';
import { useWorkspaceGenerationActions } from './hooks/useWorkspaceGenerationActions';
import { useWorkspaceAppLifecycle } from './hooks/useWorkspaceAppLifecycle';
import { useWorkspaceSessionState } from './hooks/useWorkspaceSessionState';
import { useWorkspaceEditorActions } from './hooks/useWorkspaceEditorActions';
import { useWorkspaceResetActions } from './hooks/useWorkspaceResetActions';
import { useWorkspaceSnapshotPersistence } from './hooks/useWorkspaceSnapshotPersistence';
import { useWorkspaceSnapshotActions } from './hooks/useWorkspaceSnapshotActions';
import { useWorkspaceSurfaceState } from './hooks/useWorkspaceSurfaceState';
import { useQueuedBatchWorkflow } from './hooks/useQueuedBatchWorkflow';
import { useQueuedBatchPresentation } from './hooks/useQueuedBatchPresentation';
import { useWorkspaceGenerationContext } from './hooks/useWorkspaceGenerationContext';
import { useWorkspaceShellUtilities } from './hooks/useWorkspaceShellUtilities';
import { useWorkspaceTransientUiState } from './hooks/useWorkspaceTransientUiState';
import { useLegacyWorkspaceSnapshotMigration } from './hooks/useLegacyWorkspaceSnapshotMigration';

const ImageEditor = lazy(() => import('./components/ImageEditor'));
const GeneratedImage = lazy(() => import('./components/GeneratedImage'));
const GlobalLogConsole = lazy(() => import('./components/GlobalLogConsole'));
const GroundingProvenancePanel = lazy(() => import('./components/GroundingProvenancePanel'));
const SketchPad = lazy(() => import('./components/SketchPad'));
const getShortTurnId = (historyId?: string | null) => (historyId ? historyId.slice(0, 8) : '--------');

const App: React.FC = () => {
    const [initialWorkspaceSnapshot] = useState(() => loadWorkspaceSnapshot());
    const initialActiveResult = initialWorkspaceSnapshot.workspaceSession.activeResult;
    const initialComposerState = initialWorkspaceSnapshot.composerState || EMPTY_WORKSPACE_COMPOSER_STATE;
    const [apiKeyReady, setApiKeyReady] = useState(false);
    const [currentLang, setCurrentLang] = useState<Language>('en');
    const [isEditing, setIsEditing] = useState(false);
    const [editingImageSource, setEditingImageSource] = useState<string | null>(null);
    const [batchProgress, setBatchProgress] = useState({ completed: 0, total: 0 });
    const [branchNameOverrides, setBranchNameOverrides] = useState<BranchNameOverrides>(
        () => initialWorkspaceSnapshot.branchState.nameOverrides,
    );
    const [branchContinuationSourceByBranchOriginId, setBranchContinuationSourceByBranchOriginId] = useState<
        Record<string, string>
    >(() => initialWorkspaceSnapshot.branchState.continuationSourceByBranchOriginId);
    const [conversationState, setConversationState] = useState(
        () => initialWorkspaceSnapshot.conversationState || EMPTY_WORKSPACE_CONVERSATION_STATE,
    );
    const {
        isSketchPadOpen,
        setIsSketchPadOpen,
        showSketchReplaceConfirm,
        setShowSketchReplaceConfirm,
        activePickerSheet,
        setActivePickerSheet,
        closePickerSheet,
        isAdvancedSettingsOpen,
        setIsAdvancedSettingsOpen,
        isViewerOpen,
        setIsViewerOpen,
        branchRenameDialog,
        setBranchRenameDialog,
        branchRenameDraft,
        setBranchRenameDraft,
        openBranchRenameDialog,
        closeBranchRenameDialog,
        isSessionReplayOpen,
        setIsSessionReplayOpen,
        isSurfaceSharedControlsOpen,
        setIsSurfaceSharedControlsOpen,
        openSurfacePickerSheet,
    } = useWorkspaceSurfaceState();

    const uploadInputRef = useRef<HTMLInputElement>(null);
    const workspaceImportInputRef = useRef<HTMLInputElement>(null);
    const composerPromptTextareaRef = useRef<HTMLTextAreaElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const lastPromotedHistoryIdRef = useRef<string | null>(null);
    const queuedBatchHistorySelectRef = useRef<((item: import('./types').GeneratedImage) => void) | null>(null);

    const {
        generatedImageUrls,
        setGeneratedImageUrls,
        selectedImageIndex,
        setSelectedImageIndex,
        isGenerating,
        setIsGenerating,
        generationMode,
        setGenerationMode,
        executionMode,
        setExecutionMode,
        error,
        setError,
        logs,
        setLogs,
        history,
        setHistory,
        displaySettings,
        setDisplaySettings,
        addLog,
        getActiveImageUrl,
        handleClearResults,
        handleClearHistory,
    } = useImageGeneration(initialWorkspaceSnapshot);

    const {
        prompt,
        setPrompt,
        aspectRatio,
        setAspectRatio,
        imageSize,
        setImageSize,
        imageStyle,
        setImageStyle,
        imageModel,
        setImageModel,
        batchSize,
        setBatchSize,
        outputFormat,
        setOutputFormat,
        structuredOutputMode,
        setStructuredOutputMode,
        temperature,
        setTemperature,
        thinkingLevel,
        setThinkingLevel,
        includeThoughts,
        setIncludeThoughts,
        googleSearch,
        setGoogleSearch,
        imageSearch,
        setImageSearch,
        composerState,
        applyComposerState,
        setGroundingMode,
        restoreEditorComposerState,
    } = useComposerState({
        initialComposerState,
        generationMode,
        executionMode,
        setGenerationMode,
        setExecutionMode,
        setDisplaySettings,
    });
    const {
        stagedAssets,
        setStagedAssets,
        objectImages,
        characterImages,
        editorBaseAsset,
        currentStageAsset,
        hasSketch,
        setObjectImages,
        setCharacterImages,
        addWorkspaceAsset,
        clearAssetRoles,
        removeAssetAtRoleIndex,
        upsertViewerStageSource,
    } = useWorkspaceAssets({
        initialStagedAssets: initialWorkspaceSnapshot.stagedAssets,
    });
    const {
        promptHistory,
        addPrompt: addPromptToHistory,
        removePrompt,
        clearHistory: clearPromptHistory,
    } = usePromptHistory();
    const {
        selectedResultText,
        selectedThoughts,
        selectedStructuredData,
        selectedGrounding,
        selectedMetadata,
        selectedSessionHints,
        selectedHistoryId,
        setSelectedHistoryId,
        activeGroundingSelection,
        setActiveGroundingSelection,
        focusLinkedGroundingItems,
        setFocusLinkedGroundingItems,
        buildResultArtifacts,
        applySelectedResultArtifacts,
        resetSelectedOutputState,
    } = useSelectedResultState({
        initialActiveResult,
        initialSelectedHistoryId: initialWorkspaceSnapshot.viewState.selectedHistoryId || null,
    });
    const {
        workspaceSession,
        setWorkspaceSession,
        pendingProvenanceContext,
        setPendingProvenanceContext,
        promoteResultArtifactsToSession,
        resetWorkspaceSession,
    } = useWorkspaceSessionState({
        initialWorkspaceSession: initialWorkspaceSnapshot.workspaceSession,
    });
    const {
        notification,
        showNotification,
        systemStatusRefreshToken,
        enterToSubmit,
        toggleEnterToSubmit,
        handleApiKeyConnect,
    } = useWorkspaceShellUtilities({
        setApiKeyReady,
    });
    const { editorContextSnapshot, setEditorContextSnapshot, editorInitialState } = useWorkspaceTransientUiState({
        selectedGrounding,
        activeResultGrounding: workspaceSession.activeResult?.grounding || null,
        activeGroundingSelection,
        setActiveGroundingSelection,
        setFocusLinkedGroundingItems,
        isEditing,
        prompt,
        objectImages,
        characterImages,
        aspectRatio,
        imageSize,
        batchSize,
    });

    const handleLanguageChange = useCallback(
        (nextLanguage: Language) => {
            if (nextLanguage === currentLang) {
                return;
            }

            void ensureLanguageLoaded(nextLanguage)
                .then(() => {
                    setCurrentLang(nextLanguage);
                })
                .catch((error) => {
                    console.error(`Failed to load translations for ${nextLanguage}.`, error);
                });
        },
        [currentLang],
    );
    const t = useCallback((key: string) => getTranslation(currentLang, key), [currentLang]);
    const capability = MODEL_CAPABILITIES[imageModel];
    const groundingMode = deriveGroundingMode(googleSearch, imageSearch);
    const availableGroundingModes = useMemo(() => getAvailableGroundingModes(capability), [capability]);
    const historyById = useMemo(() => new Map(history.map((item) => [item.id, item])), [history]);
    const getHistoryTurnById = useCallback(
        (historyId?: string | null) => {
            if (!historyId) {
                return null;
            }

            return historyById.get(historyId) || null;
        },
        [historyById],
    );
    const getStyleLabel = useCallback(
        (style: string) => {
            const key = 'style' + style.replace(/[^a-zA-Z0-9]/g, '');
            return t(key);
        },
        [t],
    );

    const getModelLabel = useCallback(
        (model: ImageModel) => {
            if (model === 'gemini-3.1-flash-image-preview') {
                return t('modelGemini31Flash');
            }
            if (model === 'gemini-3-pro-image-preview') {
                return t('modelGemini3Pro');
            }
            return t('modelGemini25Flash');
        },
        [t],
    );
    const lineageBranchLabelConfig = useMemo(
        () => ({
            main: t('historyBranchMain'),
            branchNumber: t('historyBranchNumber'),
        }),
        [t],
    );
    const lineageContinueActionLabels = useMemo(
        () => ({
            continue: t('lineageActionContinue'),
            promoteVariant: t('historyContinuePromoteVariant'),
            sourceActive: t('historyContinueSourceActive'),
        }),
        [t],
    );

    const recentHistory = useMemo(() => history.slice(0, 12), [history]);
    const sessionTurnStack = useMemo(() => history.filter((item) => item.status === 'success').slice(0, 4), [history]);
    const {
        successfulHistory,
        branchLabelByTurnId,
        branchLabelByOriginId,
        branchOriginIdByTurnId,
        autoBranchLabelByOriginId,
        effectiveBranchContinuationSourceByBranchOriginId,
        branchSummaries,
        branchSummaryByOriginId,
        lineageRootGroups,
        latestRestorableTurn,
        latestSuccessfulRestorableTurn,
        activeBranchSummary,
        currentStageSourceHistoryId,
        currentStageSourceTurn,
        currentStageBranchSummary,
        conversationSourceTurn,
        conversationSummary,
        recentBranchSummaries,
        isPromotedContinuationSource,
        getContinueActionLabel,
    } = useWorkspaceLineageSelectors({
        history,
        branchNameOverrides,
        branchContinuationSourceByBranchOriginId,
        workspaceSessionSourceHistoryId: workspaceSession.sourceHistoryId,
        branchLabelConfig: lineageBranchLabelConfig,
        continueActionLabels: lineageContinueActionLabels,
        selectedHistoryId,
        currentStageAssetSourceHistoryId: currentStageAsset?.sourceHistoryId || null,
        conversationId: workspaceSession.conversationId,
        conversationBranchOriginId: workspaceSession.conversationBranchOriginId,
        conversationActiveSourceHistoryId: workspaceSession.conversationActiveSourceHistoryId,
        conversationTurnIds: workspaceSession.conversationTurnIds,
        getHistoryTurnById,
        getShortTurnId,
    });

    const { getGenerationLineageContext, getConversationRequestContext } = useWorkspaceGenerationContext({
        editorBaseAsset,
        currentStageAsset,
        workspaceSession,
        history,
        conversationState,
        branchOriginIdByTurnId,
        getHistoryTurnById,
    });

    const { performGeneration } = usePerformGeneration({
        t,
        apiKeyReady,
        setApiKeyReady,
        handleApiKeyConnect,
        setIsGenerating,
        setError,
        setGeneratedImageUrls,
        setSelectedImageIndex,
        setLogs,
        addLog,
        abortControllerRef,
        objectImages,
        characterImages,
        batchSize,
        aspectRatio,
        outputFormat,
        structuredOutputMode,
        temperature,
        thinkingLevel,
        includeThoughts,
        googleSearch,
        imageSearch,
        setBatchProgress,
        setGenerationMode,
        setExecutionMode,
        setDisplaySettings,
        showNotification,
        setHistory,
        setIsEditing,
        setEditingImageSource,
        addPromptToHistory,
        getGenerationLineageContext,
        getConversationRequestContext,
    });

    const { isEnhancingPrompt, handleSmartRewrite, handleSurpriseMe } = usePromptTools({
        currentLanguage: currentLang,
        prompt,
        setPrompt,
        addLog,
        showNotification,
        t,
        apiKeyReady,
        handleApiKeyConnect,
    });

    useWorkspaceAppLifecycle({
        historyCount: history.length,
        generatedImageCount: generatedImageUrls.length,
        initialComposerState,
        initialWorkflowLogs: initialWorkspaceSnapshot.workflowLogs,
        objectImages,
        characterImages,
        setApiKeyReady,
        setCurrentLang,
        setAspectRatio,
        applyComposerState,
        logsLength: logs.length,
        setLogs,
        addLog,
        t,
    });

    useWorkspaceCapabilityConstraints({
        capability,
        imageSize,
        aspectRatio,
        outputFormat,
        structuredOutputMode,
        thinkingLevel,
        includeThoughts,
        googleSearch,
        imageSearch,
        setImageSize,
        setAspectRatio,
        setOutputFormat,
        setStructuredOutputMode,
        setThinkingLevel,
        setIncludeThoughts,
        setGoogleSearch,
        setImageSearch,
        setObjectImages,
        setCharacterImages,
        showNotification,
        t,
    });

    const { clearPendingProvenanceContext, primePendingProvenanceContinuation } = useProvenanceContinuation({
        selectedGrounding,
        selectedSessionHints,
        workspaceSession,
        currentStageAssetSourceHistoryId: currentStageAsset?.sourceHistoryId || null,
        pendingProvenanceContext,
        setPendingProvenanceContext,
        history,
        generatedImageCount: generatedImageUrls.length,
        isGenerating,
        lastPromotedHistoryIdRef,
        buildResultArtifacts,
        conversationState,
        setConversationState,
        promoteResultArtifactsToSession,
        applySelectedResultArtifacts,
        selectedHistoryId,
        addLog,
        t,
    });

    const { handleGenerate, handleFollowUpGenerate, handleCancelGeneration } = useWorkspaceGenerationActions({
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
        setIsGenerating,
        addLog,
        showNotification,
        t,
    });
    const {
        queuedJobs,
        setQueuedJobs,
        handleQueueBatchJob,
        handlePollQueuedJob,
        handlePollAllQueuedJobs,
        handleCancelQueuedJob,
        handleImportQueuedJob,
        handleImportAllQueuedJobs,
        handleOpenImportedQueuedJob,
        handleOpenLatestImportedQueuedJob,
        handleOpenImportedQueuedHistoryItem,
        handleRemoveQueuedJob,
    } = useQueuedBatchWorkflow({
        initialQueuedJobs: initialWorkspaceSnapshot.queuedJobs || [],
        history,
        apiKeyReady,
        setApiKeyReady,
        handleApiKeyConnect,
        prompt,
        imageStyle,
        imageModel,
        batchSize,
        aspectRatio,
        imageSize,
        outputFormat,
        structuredOutputMode,
        temperature,
        thinkingLevel,
        includeThoughts,
        googleSearch,
        imageSearch,
        currentStageAsset,
        editorBaseAsset,
        objectImages,
        characterImages,
        getModelLabel,
        getGenerationLineageContext,
        addLog,
        addPromptToHistory,
        showNotification,
        setHistory,
        historySelectRef: queuedBatchHistorySelectRef,
        t,
    });
    const {
        queueBatchModeSummary,
        queueBatchConversationNotice,
        getImportedQueuedHistoryItems,
        getImportedQueuedResultCount,
        getQueuedBatchPositionLabel,
    } = useQueuedBatchPresentation({
        editorBaseAsset,
        currentStageAsset,
        objectImageCount: objectImages.length,
        characterImageCount: characterImages.length,
        workspaceSession,
        history,
        t,
    });

    const { composeCurrentWorkspaceSnapshot } = useWorkspaceSnapshotPersistence({
        history,
        stagedAssets,
        workflowLogs: logs,
        queuedJobs,
        workspaceSession,
        branchNameOverrides,
        branchContinuationSourceByBranchOriginId,
        generatedImageUrls,
        selectedImageIndex,
        selectedHistoryId,
        composerState,
        conversationState,
    });

    const {
        workspaceImportReview,
        showWorkspaceRestoreNotice,
        setShowWorkspaceRestoreNotice,
        applyWorkspaceSnapshot,
        handleCloseWorkspaceImportReview,
        handleApplyImportedWorkspaceSnapshot,
        handleMergeImportedWorkspaceSnapshot,
        handleExportWorkspaceSnapshot,
        handleImportWorkspaceSnapshot,
    } = useWorkspaceSnapshotActions({
        currentLanguage: currentLang,
        initialShowRestoreNotice: shouldShowRestoreNoticeForSnapshot(initialWorkspaceSnapshot),
        workspaceImportInputRef,
        lastPromotedHistoryIdRef,
        composeCurrentWorkspaceSnapshot,
        showNotification,
        addLog,
        setHistory,
        setStagedAssets,
        setQueuedJobs,
        setWorkspaceSession,
        setBranchNameOverrides,
        setBranchContinuationSourceByBranchOriginId,
        setConversationState,
        setGeneratedImageUrls,
        setSelectedImageIndex,
        applySelectedResultArtifacts,
        setSelectedHistoryId,
        applyComposerState,
        setBatchProgress,
        setPendingProvenanceContext,
        setIsGenerating,
        setError,
        setLogs,
        setIsEditing,
        setEditingImageSource,
        setIsViewerOpen,
        setActivePickerSheet,
        setBranchRenameDialog,
        setBranchRenameDraft,
    });

    useLegacyWorkspaceSnapshotMigration({
        t,
        composeCurrentWorkspaceSnapshot,
        applyWorkspaceSnapshot,
        showNotification,
        addLog,
    });

    const {
        closeEditor,
        handleAddToCharacterReference,
        handleAddToObjectReference,
        handleOpenSketchPad,
        handleSketchPadSave,
        handleRemoveObjectReference,
        handleRemoveCharacterReference,
        handleUploadForEdit,
        handleOpenEditor,
        handleStageCurrentImageAsEditorBase,
        handleClearEditorBaseAsset,
        handleEditorGenerate,
        handleSketchReplaceCancel,
        handleSketchReplaceConfirm,
        handleCloseSketchPad,
    } = useWorkspaceEditorActions({
        prompt,
        objectImages,
        characterImages,
        aspectRatio,
        imageSize,
        batchSize,
        imageModel,
        capability,
        currentStageAsset,
        editorBaseAsset,
        editorContextSnapshot,
        hasSketch,
        isEditing,
        uploadInputRef,
        setObjectImages,
        setCharacterImages,
        setIsEditing,
        setEditingImageSource,
        setEditorContextSnapshot,
        setActivePickerSheet,
        setError,
        setIsSketchPadOpen,
        setShowSketchReplaceConfirm,
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
    });

    const { handleClearCurrentStage, handleClearGalleryHistory } = useWorkspaceResetActions({
        activePickerSheet,
        lastPromotedHistoryIdRef,
        handleClearResults,
        handleClearHistory,
        resetSelectedOutputState,
        clearAssetRoles,
        resetWorkspaceSession,
        closePickerSheet,
        setBranchNameOverrides,
        setBranchContinuationSourceByBranchOriginId,
        setConversationState,
        setSelectedHistoryId,
    });

    const {
        handleStartNewConversation,
        handleHistorySelect,
        handleContinueFromHistoryTurn,
        handleBranchFromHistoryTurn,
        handleImportReviewDirectAction,
    } = useHistorySourceOrchestration({
        generatedImageUrls,
        selectedImageIndex,
        selectedHistoryId,
        isGenerating,
        currentStageLineageAction: currentStageAsset?.lineageAction,
        workspaceSession,
        conversationState,
        branchOriginIdByTurnId,
        handleApplyImportedWorkspaceSnapshot,
        getHistoryTurnById,
        handleClearResults,
        resetSelectedOutputState,
        resetWorkspaceSession,
        clearAssetRoles,
        buildResultArtifacts,
        applySelectedResultArtifacts,
        promoteResultArtifactsToSession,
        applyComposerState,
        setPendingProvenanceContext,
        setConversationState,
        setBranchContinuationSourceByBranchOriginId,
        setEditingImageSource,
        setGeneratedImageUrls,
        setSelectedImageIndex,
        setSelectedHistoryId,
        setError,
        setLogs,
        setIsGenerating,
        upsertViewerStageSource,
        addLog,
        showNotification,
        t,
        clearActivePickerSheet: closePickerSheet,
    });
    queuedBatchHistorySelectRef.current = handleHistorySelect;
    const {
        importedBranchSummaries,
        importedLatestTurn,
        importedLatestSuccessfulTurn,
        isImportedPromotedContinuationSource,
        getImportedContinueActionLabel,
        importReviewBranchActions,
    } = useImportedWorkspaceReview({
        workspaceImportReview,
        handleImportReviewDirectAction,
        continueActionLabels: {
            continue: t('lineageActionContinue'),
            promoteVariant: t('historyContinuePromoteVariant'),
            sourceActive: t('historyContinueSourceActive'),
        },
    });
    const {
        getLineageActionLabel,
        getStageOriginLabel,
        getLineageActionDescription,
        handleRenameBranch,
        handleSubmitBranchRename,
        getBranchAccentClassName,
    } = useWorkspaceBranchPresentation({
        autoBranchLabelByOriginId,
        branchLabelByOriginId,
        branchLabelByTurnId,
        branchOriginIdByTurnId,
        branchRenameDialog,
        branchRenameDraft,
        openBranchRenameDialog,
        closeBranchRenameDialog,
        setBranchNameOverrides,
        showNotification,
        addLog,
        getShortTurnId,
        t,
    });
    const {
        renderHistoryActionButton,
        renderHistoryTurnSnapshotContent,
        renderHistoryTurnActionRow,
        renderHistoryTurnBadges,
        renderActiveBranchSummaryContent,
    } = useHistoryPresentationHelpers({
        history,
        effectiveBranchContinuationSourceByBranchOriginId,
        getBranchAccentClassName,
        getContinueActionLabel,
        getLineageActionLabel,
        getShortTurnId,
        handleBranchFromHistoryTurn,
        handleContinueFromHistoryTurn,
        handleHistorySelect,
        handleRenameBranch,
        isPromotedContinuationSource,
        t,
    });

    const {
        viewSettings,
        currentStageSourceShortId,
        timelineEntries,
        activeSheetTitle,
        isSurfaceWorkspaceOpen,
        floatingControlsZIndex,
        pickerSheetZIndex,
        activeSurfaceSheetLabel,
        surfacePromptPreview,
        totalReferenceCount,
    } = useWorkspaceShellViewModel({
        generatedImageCount: generatedImageUrls.length,
        isGenerating,
        displaySettings,
        prompt,
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
        objectImageCount: objectImages.length,
        characterImageCount: characterImages.length,
        setIsSurfaceSharedControlsOpen,
        t,
    });

    const {
        effectiveResultText,
        effectiveThoughts,
        effectiveStructuredData,
        effectiveStructuredOutputMode,
        formattedStructuredOutput,
        effectiveMetadata,
        effectiveSessionHints,
        actualOutputDimensions,
        actualOutputSizeLabel,
        groundingResolutionStatusSummary,
        groundingResolutionStatusTone,
        sessionUpdatedLabel,
        sessionContinuitySignals,
        insightRows,
        selectedSources,
        selectedSupportBundles,
        activeSupportBundle,
        activeSource,
        activeSourceIndexSet,
        activeSourceTitleSet,
        activeBundleIndexSet,
        sourceCitationCountByIndex,
        relatedSourcesForSelectedBundle,
        otherSourcesForSelectedBundle,
        relatedBundlesForSelectedSource,
        activeGroundingReuseSnippet,
        activeGroundingReuseLabel,
        activeGroundingAppendPreview,
        activeGroundingReplacePreview,
        activeGroundingHasExistingPrompt,
        activeGroundingCurrentPromptText,
        activeGroundingAppendCueText,
        displayedSources,
        displayedSupportBundles,
        groundingQueries,
        searchEntryPointRenderedContent,
        attributionOverviewRows,
        uncitedSources,
        citedSourceIndexSet,
        citedSourceTitleSet,
        sourceAttributionStatusMessage,
        entryPointStatusMessage,
        sessionHintEntries,
        formatSessionHintKey,
        formatSessionHintValue,
        formatSourceHost,
        handleAppendGroundingSelectionToPrompt,
        handleReplacePromptWithGroundingSelection,
        thoughtStateMessage,
        groundingStateMessage,
        groundingSupportMessage,
        provenanceContinuityMessage,
        sessionSourceTurn,
        provenanceSourceTurn,
        provenanceSummaryRows,
        provenanceSelectionMessage,
    } = useGroundingProvenanceView({
        selectedResultText,
        selectedThoughts,
        selectedStructuredData,
        selectedGrounding,
        selectedMetadata,
        selectedSessionHints,
        workspaceSession,
        viewSettings,
        activeGroundingSelection,
        focusLinkedGroundingItems,
        getHistoryTurnById,
        getShortTurnId,
        currentStageSourceHistoryId,
        setPrompt,
        showNotification,
        addLog,
        t,
    });
    const groundingProvenancePanelProps = useGroundingProvenancePanelProps({
        currentLanguage: currentLang,
        insightRows,
        provenanceSummaryRows,
        attributionOverviewRows,
        provenanceSourceTurn,
        currentStageSourceHistoryId,
        getShortTurnId,
        renderHistoryTurnActionRow,
        provenanceContinuityMessage,
        provenanceSelectionMessage,
        activeGroundingSelection,
        setActiveGroundingSelection,
        focusLinkedGroundingItems,
        setFocusLinkedGroundingItems,
        displayedSources,
        displayedSupportBundles,
        uncitedSources,
        citedSourceIndexSet,
        citedSourceTitleSet,
        sourceAttributionStatusMessage,
        entryPointStatusMessage,
        activeSource,
        activeSupportBundle,
        activeSourceIndexSet,
        activeSourceTitleSet,
        activeBundleIndexSet,
        sourceCitationCountByIndex,
        relatedSourcesForSelectedBundle,
        otherSourcesForSelectedBundle,
        relatedBundlesForSelectedSource,
        activeGroundingReuseSnippet,
        activeGroundingReuseLabel,
        activeGroundingAppendPreview,
        activeGroundingReplacePreview,
        activeGroundingHasExistingPrompt,
        activeGroundingCurrentPromptText,
        activeGroundingAppendCueText,
        formatSourceHost,
        handleAppendGroundingSelectionToPrompt,
        handleReplacePromptWithGroundingSelection,
        groundingStateMessage,
        groundingSupportMessage,
        groundingQueries,
        searchEntryPointRenderedContent,
    });
    const {
        surfaceSharedControlsProps,
        restoreNoticeProps,
        importReviewProps,
        branchRenameDialogProps,
        sessionReplayDialogProps,
    } = useWorkspaceOverlayAuxiliaryProps({
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
        objectImageCount: objectImages.length,
        characterImageCount: characterImages.length,
        maxObjects: capability.maxObjects,
        maxCharacters: capability.maxCharacters,
        floatingControlsZIndex,
        currentLanguage: currentLang,
        onLanguageChange: handleLanguageChange,
        setIsSurfaceSharedControlsOpen,
        setIsAdvancedSettingsOpen,
        openSurfacePickerSheet,
        getStyleLabel,
        getModelLabel,
        showWorkspaceRestoreNotice,
        historyCount: history.length,
        stagedAssetCount: stagedAssets.length,
        viewerImageCount: generatedImageUrls.length,
        activeBranchLabel: activeBranchSummary?.branchLabel || null,
        latestRestorableTurn,
        latestSuccessfulRestorableTurn,
        handleHistorySelect,
        handleContinueFromHistoryTurn,
        handleBranchFromHistoryTurn,
        setShowWorkspaceRestoreNotice,
        getContinueActionLabel,
        handleStartNewConversation,
        openPromptSheet: () => setActivePickerSheet('prompt'),
        openGallerySheet: () => setActivePickerSheet('gallery'),
        openPromptHistorySheet: () => setActivePickerSheet('history'),
        openReferencesSheet: () => setActivePickerSheet('references'),
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
        isSessionReplayOpen,
        logs,
        currentStageSourceShortId,
        currentStageSourceTurn,
        setIsSessionReplayOpen,
    });
    const handleOpenSessionReplay = useCallback(() => {
        setIsSessionReplayOpen(true);
    }, [setIsSessionReplayOpen]);
    const handleOpenUploadDialog = useCallback(() => {
        uploadInputRef.current?.click();
    }, []);
    const handleOpenReferencesSheet = useCallback(() => {
        setActivePickerSheet('references');
    }, [setActivePickerSheet]);
    const latestTimelineEntry = timelineEntries[0] || null;
    const workspaceInsightsSidebarProps = useWorkspaceInsightsSidebarProps({
        currentLanguage: currentLang,
        latestWorkflowEntry: latestTimelineEntry,
        isGenerating,
        batchProgress,
        queuedJobs,
        resultStatusSummary: groundingResolutionStatusSummary,
        resultStatusTone: groundingResolutionStatusTone,
        currentStageAsset,
        currentStageBranchSummary,
        currentStageSourceTurn,
        currentStageSourceHistoryId,
        activeBranchSummary,
        recentBranchSummaries,
        branchSummariesCount: branchSummaries.length,
        sessionUpdatedLabel,
        sessionContinuitySignals,
        conversationSummary,
        conversationSourceTurn,
        sessionSourceTurn,
        sessionTurnStack,
        selectedHistoryId,
        branchLabelByTurnId,
        lineageRootGroups,
        timelineEntries,
        sessionHintEntries,
        onOpenSessionReplay: handleOpenSessionReplay,
        onHistorySelect: handleHistorySelect,
        onRenameBranch: handleRenameBranch,
        getStageOriginLabel,
        getLineageActionLabel,
        getLineageActionDescription,
        getShortTurnId,
        getBranchAccentClassName,
        renderHistoryTurnSnapshotContent,
        renderHistoryTurnBadges,
        renderHistoryTurnActionRow,
        renderActiveBranchSummaryContent,
        formatSessionHintKey,
        formatSessionHintValue,
    });
    const composerSettingsPanelProps = useComposerSettingsPanelProps({
        prompt,
        placeholder: t('placeholder'),
        enterToSubmit,
        isGenerating,
        isEnhancingPrompt,
        currentLanguage: currentLang,
        imageStyleLabel: getStyleLabel(imageStyle),
        outputFormat,
        structuredOutputMode,
        thinkingLevel,
        includeThoughts,
        groundingMode,
        imageModel,
        aspectRatio,
        imageSize,
        batchSize,
        currentStageAsset,
        capability,
        availableGroundingModes,
        temperature,
        isAdvancedSettingsOpen,
        generateLabel: t('generate'),
        hasSizePicker: capability.supportedSizes.length > 0,
        totalReferenceCount,
        objectCount: objectImages.length,
        characterCount: characterImages.length,
        maxObjects: capability.maxObjects,
        maxCharacters: capability.maxCharacters,
        queuedJobs,
        queueBatchModeSummary,
        queueBatchConversationNotice,
        getImportedQueuedResultCount,
        getImportedQueuedHistoryItems,
        activeImportedQueuedHistoryId: selectedHistoryId,
        promptTextareaRef: composerPromptTextareaRef,
        setPrompt,
        toggleEnterToSubmit,
        handleGenerate,
        handleQueueBatchJob,
        handleCancelGeneration,
        handleStartNewConversation,
        handleFollowUpGenerate,
        handleOpenEditor,
        handleSurpriseMe,
        handleSmartRewrite,
        setActivePickerSheet,
        handleExportWorkspaceSnapshot,
        workspaceImportInputRef,
        setIsAdvancedSettingsOpen,
        setOutputFormat,
        setStructuredOutputMode,
        setTemperature,
        setThinkingLevel,
        setGroundingMode,
        getGroundingFlagsFromMode,
        showNotification,
        t,
        handleImportAllQueuedJobs,
        handlePollAllQueuedJobs,
        handlePollQueuedJob,
        handleCancelQueuedJob,
        handleImportQueuedJob,
        handleOpenImportedQueuedJob,
        handleOpenLatestImportedQueuedJob,
        handleOpenImportedQueuedHistoryItem,
        handleRemoveQueuedJob,
        getStageOriginLabel,
        getLineageActionLabel,
    });
    const advancedSettingsDialogProps: React.ComponentProps<typeof ComposerAdvancedSettingsDialog> | null =
        isAdvancedSettingsOpen
            ? {
                  ...composerSettingsPanelProps,
                  isOpen: true,
                  onClose: () => setIsAdvancedSettingsOpen(false),
              }
            : null;
    const headerConsole = useMemo(
        () => (
            <Suspense
                fallback={
                    <PanelLoadingFallback
                        label={t('loadingActivityConsole')}
                        className="min-w-[220px] rounded-full border border-gray-200/80 bg-white/70 px-4 py-2 text-center text-xs text-gray-500 dark:border-gray-700 dark:bg-[#141922] dark:text-gray-400"
                    />
                }
            >
                <GlobalLogConsole
                    currentLanguage={currentLang}
                    refreshToken={systemStatusRefreshToken}
                    isSuppressed={showWorkspaceRestoreNotice}
                />
            </Suspense>
        ),
        [currentLang, showWorkspaceRestoreNotice, systemStatusRefreshToken, t],
    );
    const workspaceTopHeaderProps = useWorkspaceTopHeaderProps({
        headerConsole,
        currentLanguage: currentLang,
        onLanguageChange: handleLanguageChange,
    });
    const handleReplacePromptFromStructuredOutput = useCallback(
        (value: string) => {
            const normalizedValue = value.trim();
            if (!normalizedValue) {
                return;
            }

            setPrompt(normalizedValue);
            showNotification(t('structuredOutputReplacePromptNotice'), 'info');

            if (typeof window !== 'undefined') {
                window.requestAnimationFrame(() => {
                    const textarea = composerPromptTextareaRef.current;
                    if (!textarea) {
                        return;
                    }

                    try {
                        textarea.focus({ preventScroll: false });
                    } catch {
                        textarea.focus();
                    }

                    const cursorIndex = textarea.value.length;
                    textarea.setSelectionRange(cursorIndex, cursorIndex);
                });
            }
        },
        [setPrompt, showNotification, t],
    );
    const handleAppendPromptFromStructuredOutput = useCallback(
        (value: string) => {
            const normalizedValue = value.trim();
            if (!normalizedValue) {
                return;
            }

            const nextPrompt = prompt.trim() ? `${prompt.trim()}\n\n${normalizedValue}` : normalizedValue;
            setPrompt(nextPrompt);
            showNotification(t('structuredOutputAppendPromptNotice'), 'info');

            if (typeof window !== 'undefined') {
                window.requestAnimationFrame(() => {
                    const textarea = composerPromptTextareaRef.current;
                    if (!textarea) {
                        return;
                    }

                    try {
                        textarea.focus({ preventScroll: false });
                    } catch {
                        textarea.focus();
                    }

                    const cursorIndex = textarea.value.length;
                    textarea.setSelectionRange(cursorIndex, cursorIndex);
                });
            }
        },
        [prompt, setPrompt, showNotification, t],
    );
    const stageViewerSettings = useMemo(
        () => ({
            aspectRatio: viewSettings.aspectRatio,
            imageSize: viewSettings.size,
            imageStyle: viewSettings.style,
            model: viewSettings.model,
            batchSize: viewSettings.batchSize,
        }),
        [viewSettings.aspectRatio, viewSettings.batchSize, viewSettings.model, viewSettings.size, viewSettings.style],
    );
    const darkProvenancePanel = useMemo(
        () => (
            <Suspense
                fallback={
                    <PanelLoadingFallback
                        label={t('loadingPrepareProvenancePanel')}
                        className="rounded-[24px] border border-dashed border-slate-700/70 bg-slate-900/70 px-4 py-6 text-center text-sm text-slate-300"
                    />
                }
            >
                <GroundingProvenancePanel {...groundingProvenancePanelProps} tone="dark" scope="dark" />
            </Suspense>
        ),
        [groundingProvenancePanelProps, t],
    );
    const { activeViewerImage, workspaceViewerOverlayProps, generatedImageStageProps } = useWorkspaceStageViewer({
        generatedImageUrls,
        selectedImageIndex,
        setSelectedImageIndex,
        isViewerOpen,
        setIsViewerOpen,
        isGenerating,
        prompt: viewSettings.prompt,
        error,
        actualOutputLabel: actualOutputSizeLabel || actualOutputDimensions,
        resultStatusSummary: groundingResolutionStatusSummary,
        resultStatusTone: groundingResolutionStatusTone,
        settings: stageViewerSettings,
        generationMode,
        executionMode,
        onGenerate: handleGenerate,
        onEdit: handleOpenEditor,
        onUpload: handleOpenUploadDialog,
        onClear: handleClearCurrentStage,
        onAddToObjectReference: handleAddToObjectReference,
        onAddToCharacterReference: capability.maxCharacters > 0 ? handleAddToCharacterReference : undefined,
        currentLanguage: currentLang,
        currentLog: logs.length > 0 ? logs[logs.length - 1] : '',
        styleLabel: getStyleLabel(viewSettings.style),
        modelLabel: getModelLabel(viewSettings.model),
        effectiveResultText,
        structuredData: effectiveStructuredData,
        structuredOutputMode: effectiveStructuredOutputMode,
        formattedStructuredOutput,
        effectiveThoughts,
        thoughtStateMessage,
        provenancePanel: darkProvenancePanel,
        sessionHintEntries,
        formatSessionHintKey,
        formatSessionHintValue,
        onReplacePrompt: handleReplacePromptFromStructuredOutput,
        onAppendPrompt: handleAppendPromptFromStructuredOutput,
    });
    const workspacePickerSheetProps = useWorkspacePickerSheetProps({
        activePickerSheet,
        activeSheetTitle,
        pickerSheetZIndex,
        prompt,
        setPrompt,
        handleSurpriseMe,
        handleSmartRewrite,
        isEnhancingPrompt,
        closePickerSheet,
        openPromptSheet: () => setActivePickerSheet('prompt'),
        openGallerySheet: () => setActivePickerSheet('gallery'),
        openTemplatesSheet: () => setActivePickerSheet('templates'),
        openHistorySheet: () => setActivePickerSheet('history'),
        openReferencesSheet: () => setActivePickerSheet('references'),
        promptHistory,
        removePrompt,
        clearPromptHistory,
        history,
        handleHistorySelect,
        handleContinueFromHistoryTurn,
        handleBranchFromHistoryTurn,
        handleRenameBranch,
        isPromotedContinuationSource,
        getContinueActionLabel,
        branchNameOverrides,
        selectedHistoryId,
        currentLanguage: currentLang,
        handleClearGalleryHistory,
        t,
        imageStyle,
        setImageStyle,
        imageModel,
        setImageModel,
        capability,
        aspectRatio,
        setAspectRatio,
        imageSize,
        setImageSize,
        batchSize,
        setBatchSize,
        objectImages,
        characterImages,
        hasSketch,
        editorBaseAsset,
        currentStageAsset,
        getStageOriginLabel,
        getLineageActionLabel,
        handleOpenSketchPad,
        openUploadDialog: handleOpenUploadDialog,
        activeViewerImage,
        handleStageCurrentImageAsEditorBase,
        handleClearEditorBaseAsset,
        setObjectImages,
        isGenerating,
        showNotification,
        handleRemoveObjectReference,
        setCharacterImages,
        handleRemoveCharacterReference,
    });
    const recentHistoryFilmstripProps = useRecentHistoryFilmstripProps({
        recentHistory,
        branchCount: branchSummaries.length,
        activeStageImageUrl: activeViewerImage || null,
        currentStageSourceHistoryId,
        branchOriginIdByTurnId,
        branchLabelByTurnId,
        branchSummaryByOriginId,
        activeBranchOriginId: activeBranchSummary?.branchOriginId || null,
        onClear: handleClearGalleryHistory,
        onHistorySelect: handleHistorySelect,
        onContinueFromHistoryTurn: handleContinueFromHistoryTurn,
        onBranchFromHistoryTurn: handleBranchFromHistoryTurn,
        isPromotedContinuationSource,
        getContinueActionLabel,
        getBranchAccentClassName,
        getLineageActionLabel,
        getQueuedBatchPositionLabel,
        currentLanguage: currentLang,
        renderHistoryActionButton,
    });
    const shellPanelClassName = 'nbu-shell-panel nbu-shell-surface-stage-hero p-4';
    const stagePanelClassName =
        'nbu-shell-panel nbu-shell-surface-stage-hero min-h-[440px] overflow-hidden p-4 lg:min-h-0 lg:flex-1';
    const responseTextPlaceholder =
        effectiveStructuredOutputMode !== 'off'
            ? t('workspaceViewerStructuredOutput')
            : viewSettings.outputFormat === 'images-and-text'
              ? t('workspacePanelResultTextReady')
              : t('workspacePanelResultTextReserved');
    const sideToolPanel = useMemo(
        () => (
            <WorkspaceSideToolPanel
                currentLanguage={currentLang}
                editorBaseAsset={editorBaseAsset}
                currentStageAsset={currentStageAsset}
                onUploadBaseImage={handleOpenUploadDialog}
                onOpenSketchPad={handleOpenSketchPad}
                onOpenEditor={handleOpenEditor}
                getStageOriginLabel={getStageOriginLabel}
                getLineageActionLabel={getLineageActionLabel}
            />
        ),
        [
            currentLang,
            currentStageAsset,
            editorBaseAsset,
            getLineageActionLabel,
            getStageOriginLabel,
            handleOpenEditor,
            handleOpenSketchPad,
            handleOpenUploadDialog,
        ],
    );
    const contextProvenanceStatusLabel =
        viewSettings.googleSearch || viewSettings.imageSearch
            ? t('workspacePanelStatusPrepared')
            : t('workspacePanelStatusReserved');
    const contextProvenancePanel = useMemo(
        () => (
            <Suspense
                fallback={
                    <PanelLoadingFallback
                        label={t('loadingPrepareProvenancePanel')}
                        className="nbu-dashed-panel px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-300"
                    />
                }
            >
                <GroundingProvenancePanel {...groundingProvenancePanelProps} tone="light" scope="primary" />
            </Suspense>
        ),
        [groundingProvenancePanelProps, t],
    );
    const recentLane = useMemo(
        () => (
            <div className={shellPanelClassName}>
                <RecentHistoryFilmstrip {...recentHistoryFilmstripProps} />
            </div>
        ),
        [recentHistoryFilmstripProps],
    );
    const focusSurface = useMemo(
        () => (
            <div className={stagePanelClassName}>
                <Suspense
                    fallback={
                        <PanelLoadingFallback
                            label={t('loadingStageSurface')}
                            className="nbu-dashed-panel flex h-full min-h-[420px] items-center justify-center rounded-[28px] text-sm text-gray-500 dark:text-gray-400"
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
        <div className="relative min-h-screen w-full overflow-x-hidden bg-[linear-gradient(180deg,_#fffaf2_0%,_#f8fafc_38%,_#eef3f8_100%)] text-gray-900 transition-colors duration-500 dark:bg-[linear-gradient(180deg,_#111315_0%,_#090b10_46%,_#030405_100%)] dark:text-gray-100">
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-[320px] bg-[radial-gradient(circle_at_12%_18%,rgba(251,191,36,0.24),transparent_24%),radial-gradient(circle_at_84%_10%,rgba(56,189,248,0.14),transparent_20%),radial-gradient(circle_at_56%_0%,rgba(255,255,255,0.72),transparent_34%)] dark:bg-[radial-gradient(circle_at_14%_16%,rgba(245,158,11,0.20),transparent_22%),radial-gradient(circle_at_82%_14%,rgba(14,165,233,0.12),transparent_18%),radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.06),transparent_34%)]" />
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
                restoreNoticeProps={restoreNoticeProps}
                importReviewProps={importReviewProps}
                advancedSettingsDialogProps={advancedSettingsDialogProps}
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
                sessionReplayDialogProps={sessionReplayDialogProps}
                imageEditorSurface={
                    isEditing ? (
                        <Suspense fallback={<SurfaceLoadingFallback label={t('loadingPrepareUltraEditor')} />}>
                            <ImageEditor
                                initialImageUrl={editingImageSource || ''}
                                initialPrompt={editorInitialState.prompt}
                                initialObjectImages={editorInitialState.objectImages}
                                initialCharacterImages={editorInitialState.characterImages}
                                initialRatio={editorInitialState.ratio}
                                initialSize={editorInitialState.size}
                                initialBatchSize={editorInitialState.batchSize}
                                prompt={prompt}
                                onPromptChange={setPrompt}
                                objectImages={objectImages}
                                onObjectImagesChange={setObjectImages}
                                characterImages={characterImages}
                                onCharacterImagesChange={setCharacterImages}
                                ratio={aspectRatio}
                                onRatioChange={setAspectRatio}
                                size={imageSize}
                                onSizeChange={setImageSize}
                                batchSize={batchSize}
                                onBatchSizeChange={setBatchSize}
                                onGenerate={handleEditorGenerate}
                                onCancel={closeEditor}
                                isGenerating={isGenerating}
                                currentLanguage={currentLang}
                                currentLog={logs.length > 0 ? logs[logs.length - 1] : ''}
                                error={error}
                                onErrorClear={() => setError(null)}
                                imageModel={imageModel}
                                onModelChange={setImageModel}
                            />
                        </Suspense>
                    ) : null
                }
                pickerSheetProps={workspacePickerSheetProps}
                viewerOverlayProps={workspaceViewerOverlayProps}
            />

            <div className="relative z-10 mx-auto flex min-h-screen max-w-[1560px] flex-col px-4 pb-6 pt-4 lg:px-6 lg:pb-8">
                <main className="mt-4 flex flex-1 flex-col gap-5">
                    <WorkspaceTopHeader {...workspaceTopHeaderProps} />

                    <WorkspaceResponseRail
                        currentLanguage={currentLang}
                        resultText={effectiveResultText}
                        structuredData={effectiveStructuredData}
                        structuredOutputMode={effectiveStructuredOutputMode}
                        formattedStructuredOutput={formattedStructuredOutput}
                        resultPlaceholder={responseTextPlaceholder}
                        thoughtsText={effectiveThoughts}
                        thoughtsPlaceholder={thoughtStateMessage}
                        onReplacePrompt={handleReplacePromptFromStructuredOutput}
                        onAppendPrompt={handleAppendPromptFromStructuredOutput}
                    />

                    <section
                        data-testid="workspace-insights-collapsible"
                        className="nbu-shell-panel nbu-shell-surface-context-rail p-4"
                    >
                        <div
                            data-testid="workspace-insights-collapsible-summary"
                            className="flex items-start justify-between gap-3"
                        >
                            <WorkspaceInsightsHeaderSummary currentLanguage={currentLang} />
                            <span className="nbu-status-pill">{t('workspaceInsightsPhaseLabel')}</span>
                        </div>
                        <div className="mt-4 border-t border-gray-200/80 pt-4 dark:border-gray-800">
                            <WorkspaceInsightsSidebar
                                {...workspaceInsightsSidebarProps}
                                showHeader={false}
                                provenancePanel={contextProvenancePanel}
                                provenanceStatusLabel={contextProvenanceStatusLabel}
                            />
                        </div>
                    </section>

                    <section className="grid gap-5">
                        <div className="flex min-w-0 flex-col gap-5">
                            <WorkspaceHistoryCanvas
                                recentLane={recentLane}
                                focusSurface={focusSurface}
                                supportSurface={sideToolPanel}
                            />
                        </div>
                    </section>

                    <div className="order-3 xl:hidden">{sideToolPanel}</div>

                    <div className="order-4 xl:order-none">
                        <ComposerSettingsPanel {...composerSettingsPanelProps} />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default App;
