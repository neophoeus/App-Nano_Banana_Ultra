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
    SelectedItemActionBarProps,
    SelectedItemSummaryStripProps,
    StageAsset,
    ResultArtifacts,
    SessionContinuitySource,
} from './types';
import RecentHistoryFilmstrip from './components/RecentHistoryFilmstrip';
import ComposerAdvancedSettingsDialog from './components/ComposerAdvancedSettingsDialog';
import ComposerSettingsPanel from './components/ComposerSettingsPanel';
import PanelLoadingFallback from './components/PanelLoadingFallback';
import QueuedBatchJobsPanel from './components/QueuedBatchJobsPanel';
import SelectedItemActionBar from './components/SelectedItemActionBar';
import SelectedItemSummaryStrip from './components/SelectedItemSummaryStrip';
import SurfaceLoadingFallback from './components/SurfaceLoadingFallback';
import WorkspaceDetailModal from './components/WorkspaceDetailModal';
import WorkspaceGalleryCard from './components/WorkspaceGalleryCard';
import WorkspaceHistoryCanvas from './components/WorkspaceHistoryCanvas';
import WorkspaceInsightsSidebar from './components/WorkspaceInsightsSidebar';
import WorkspaceOverlayStack from './components/WorkspaceOverlayStack';
import WorkspaceResponseRail from './components/WorkspaceResponseRail';
import WorkspaceSideToolPanel from './components/WorkspaceSideToolPanel';
import WorkspaceTopHeader from './components/WorkspaceTopHeader';
import WorkspaceVersionsDetailPanel from './components/WorkspaceVersionsDetailPanel';
import WorkspaceWorkflowCard from './components/WorkspaceWorkflowCard';
import WorkspaceWorkflowDetailPanel from './components/WorkspaceWorkflowDetailPanel';
import { Language, ensureLanguageLoaded, getTranslation, persistLanguagePreference } from './utils/translations';
import { ASPECT_RATIOS, IMAGE_MODELS, MODEL_CAPABILITIES, OUTPUT_FORMATS, THINKING_LEVELS } from './constants';
import {
    EMPTY_WORKSPACE_COMPOSER_STATE,
    EMPTY_WORKSPACE_SESSION,
    loadWorkspaceSnapshot,
} from './utils/workspacePersistence';
import { hasRestorableWorkspaceContent } from './utils/workspaceSnapshotState';
import {
    deriveGroundingMode,
    getAvailableGroundingModes,
    getGroundingFlagsFromMode,
    getGroundingModeLabel,
} from './utils/groundingMode';
import { inferExecutionModeFromHistoryItem } from './utils/executionMode';
import { buildWorkflowTimeline, renderWorkflowMessage } from './utils/workflowTimeline';
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
const WorkspaceHealthPanel = lazy(() => import('./components/WorkspaceHealthPanel'));
const GroundingProvenancePanel = lazy(() => import('./components/GroundingProvenancePanel'));
const SketchPad = lazy(() => import('./components/SketchPad'));
const getShortTurnId = (historyId?: string | null) => (historyId ? historyId.slice(0, 8) : '--------');

type WorkflowThoughtEntry = {
    id: string;
    shortId: string;
    prompt: string | null;
    thoughts: string;
    createdAtLabel: string;
    createdAtMs: number | null;
};

const parseWorkflowTimestampMs = (timestamp: string | null | undefined, anchorMs: number): number | null => {
    if (!timestamp) {
        return null;
    }

    const match = timestamp.match(/^(\d{2}):(\d{2}):(\d{2})$/);
    if (!match) {
        return null;
    }

    const parsedDate = new Date(anchorMs);
    parsedDate.setHours(Number(match[1]), Number(match[2]), Number(match[3]), 0);

    let parsedMs = parsedDate.getTime();
    if (parsedMs - anchorMs > 12 * 60 * 60 * 1000) {
        parsedMs -= 24 * 60 * 60 * 1000;
    }

    return parsedMs;
};

const TopLauncherSignal = ({ active, dataTestId }: { active: boolean; dataTestId: string }) => {
    const activeOuterClassName =
        'bg-amber-300/60 shadow-[0_0_18px_rgba(251,191,36,0.52)] dark:bg-amber-300/40 dark:shadow-[0_0_20px_rgba(251,191,36,0.36)]';
    const activeInnerClassName = 'bg-amber-400 ring-2 ring-amber-100/90 dark:bg-amber-300 dark:ring-amber-400/30';

    return (
        <span
            data-testid={dataTestId}
            aria-hidden="true"
            className="relative inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center"
        >
            <span
                className={`absolute inset-0 rounded-full transition-all duration-300 ${
                    active
                        ? `${activeOuterClassName} animate-pulse opacity-100`
                        : 'bg-white/90 ring-1 ring-slate-300/80 opacity-100 dark:bg-slate-100/10 dark:ring-slate-500/70'
                }`}
            />
            <span
                className={`relative h-1.5 w-1.5 rounded-full transition-all duration-300 ${
                    active ? activeInnerClassName : 'bg-slate-400 dark:bg-slate-200'
                }`}
            />
        </span>
    );
};

const App: React.FC = () => {
    const [initialWorkspaceSnapshot] = useState(() => loadWorkspaceSnapshot());
    const initialActiveResult = initialWorkspaceSnapshot.workspaceSession.activeResult;
    const initialComposerState = initialWorkspaceSnapshot.composerState || EMPTY_WORKSPACE_COMPOSER_STATE;
    const [apiKeyReady, setApiKeyReady] = useState(false);
    const [currentLang, setCurrentLang] = useState<Language>('en');
    const [areInitialPreferencesReady, setAreInitialPreferencesReady] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [activeWorkspaceDetailModal, setActiveWorkspaceDetailModal] = useState<
        'workflow' | 'answer' | 'sources' | 'versions' | 'queued-jobs' | null
    >(null);
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
                    persistLanguagePreference(nextLanguage);
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
        activeBranchSummary,
        selectedItemModel,
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
        setInitialPreferencesReady: setAreInitialPreferencesReady,
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
        applyWorkspaceSnapshot,
        handleCloseWorkspaceImportReview,
        handleApplyImportedWorkspaceSnapshot,
        handleMergeImportedWorkspaceSnapshot,
        handleExportWorkspaceSnapshot,
        handleImportWorkspaceSnapshot,
    } = useWorkspaceSnapshotActions({
        currentLanguage: currentLang,
        initialShouldAnnounceRestoreToast: hasRestorableWorkspaceContent(initialWorkspaceSnapshot),
        isInitialRestoreAnnouncementReady: areInitialPreferencesReady,
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
        addLog,
    });

    const handleOpenWorkspaceImportPicker = useCallback(() => {
        workspaceImportInputRef.current?.click();
    }, []);

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
        currentStageSourceHistoryId: currentStageAsset?.sourceHistoryId || null,
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
        buildSelectedItemActionBarProps,
        buildSelectedItemSummaryStripProps,
        renderHistoryActionButton,
        renderHistoryTurnSnapshotContent,
        renderHistoryTurnActionRow,
        renderHistoryTurnBadges,
        renderActiveBranchSummaryContent,
    } = useHistoryPresentationHelpers({
        history,
        branchSummaryByOriginId,
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
    const selectedItemActionBarProps = useMemo<SelectedItemActionBarProps | null>(
        () => buildSelectedItemActionBarProps(selectedItemModel),
        [buildSelectedItemActionBarProps, selectedItemModel],
    );
    const selectedItemSummaryStripProps = useMemo<SelectedItemSummaryStripProps | null>(
        () => buildSelectedItemSummaryStripProps(selectedItemModel),
        [buildSelectedItemSummaryStripProps, selectedItemModel],
    );
    const selectedItemDock = useMemo(
        () =>
            selectedItemSummaryStripProps || selectedItemActionBarProps ? (
                <div data-testid="selected-item-dock" className="grid min-w-0 gap-1.5">
                    {selectedItemSummaryStripProps ? (
                        <SelectedItemSummaryStrip currentLanguage={currentLang} {...selectedItemSummaryStripProps} />
                    ) : null}
                    {selectedItemActionBarProps ? (
                        <SelectedItemActionBar currentLanguage={currentLang} {...selectedItemActionBarProps} />
                    ) : null}
                </div>
            ) : null,
        [currentLang, selectedItemActionBarProps, selectedItemSummaryStripProps],
    );

    const {
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
        displayedSources,
        displayedSupportBundles,
        activeGroundingAppendPreview,
        activeGroundingReplacePreview,
        activeGroundingHasExistingPrompt,
        activeGroundingCurrentPromptText,
        activeGroundingAppendCueText,
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
        activeGroundingReuseSnippet,
        activeGroundingReuseLabel,
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
        totalSourceCount: selectedSources.length,
        totalSupportBundleCount: selectedSupportBundles.length,
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
    const { surfaceSharedControlsProps, importReviewProps, branchRenameDialogProps } =
        useWorkspaceOverlayAuxiliaryProps({
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
            setIsSurfaceSharedControlsOpen,
            setIsAdvancedSettingsOpen,
            openSurfacePickerSheet,
            getStyleLabel,
            getModelLabel,
            openPromptSheet: () => setActivePickerSheet('prompt'),
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
        });
    const handleOpenUploadDialog = useCallback(() => {
        uploadInputRef.current?.click();
    }, []);
    const handleOpenReferencesSheet = useCallback(() => {
        setActivePickerSheet('references');
    }, [setActivePickerSheet]);
    const handleCloseWorkspaceDetailModal = useCallback(() => {
        setActiveWorkspaceDetailModal(null);
    }, []);
    const handleOpenWorkflowDetails = useCallback(() => {
        setActiveWorkspaceDetailModal('workflow');
    }, []);
    const handleOpenAnswerDetails = useCallback(() => {
        setActiveWorkspaceDetailModal('answer');
    }, []);
    const handleOpenSourceDetails = useCallback(() => {
        setActiveWorkspaceDetailModal('sources');
    }, []);
    const handleOpenVersionsDetails = useCallback(() => {
        setActiveWorkspaceDetailModal('versions');
    }, []);
    const handleOpenQueuedBatchJobs = useCallback(() => {
        setActiveWorkspaceDetailModal('queued-jobs');
    }, []);
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
        activeImportedQueuedHistoryId: currentStageSourceHistoryId,
        promptTextareaRef: composerPromptTextareaRef,
        setPrompt,
        toggleEnterToSubmit,
        handleGenerate,
        handleQueueBatchJob,
        handleOpenQueuedBatchJobs,
        handleCancelGeneration,
        handleStartNewConversation,
        handleFollowUpGenerate,
        handleOpenEditor,
        handleSurpriseMe,
        handleSmartRewrite,
        setActivePickerSheet,
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
        ),
        [currentLang, systemStatusRefreshToken, t],
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
    const currentStageLinkedHistoryId = currentStageAsset?.sourceHistoryId || null;
    const currentStageHasLinkedHistoryTurn = Boolean(
        currentStageLinkedHistoryId &&
        currentStageSourceTurn &&
        currentStageSourceTurn.id === currentStageLinkedHistoryId,
    );
    const currentStageLinkedBranchSummary = currentStageHasLinkedHistoryTurn ? currentStageBranchSummary : null;
    const currentStageContinuationSourceHistoryId = currentStageLinkedBranchSummary
        ? effectiveBranchContinuationSourceByBranchOriginId[currentStageLinkedBranchSummary.branchOriginId] || null
        : null;
    const currentStageContinuationDiffers = Boolean(
        currentStageHasLinkedHistoryTurn &&
        currentStageSourceTurn &&
        currentStageContinuationSourceHistoryId &&
        currentStageContinuationSourceHistoryId !== currentStageSourceTurn.id,
    );
    const currentStageOriginLabel = currentStageAsset
        ? getStageOriginLabel(currentStageAsset.origin)
        : generatedImageUrls.length > 0
          ? getStageOriginLabel('generated')
          : null;
    const handleContinueFromStageSource = useCallback(() => {
        if (currentStageHasLinkedHistoryTurn && currentStageSourceTurn) {
            handleContinueFromHistoryTurn(currentStageSourceTurn);
        }
    }, [currentStageHasLinkedHistoryTurn, currentStageSourceTurn, handleContinueFromHistoryTurn]);
    const handleBranchFromStageSource = useCallback(() => {
        if (currentStageHasLinkedHistoryTurn && currentStageSourceTurn) {
            handleBranchFromHistoryTurn(currentStageSourceTurn);
        }
    }, [currentStageHasLinkedHistoryTurn, currentStageSourceTurn, handleBranchFromHistoryTurn]);
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
        onContinueFromStageSource: currentStageHasLinkedHistoryTurn ? handleContinueFromStageSource : undefined,
        onBranchFromStageSource: currentStageHasLinkedHistoryTurn ? handleBranchFromStageSource : undefined,
        currentLanguage: currentLang,
        currentLog: logs.length > 0 ? logs[logs.length - 1] : '',
        currentStageOriginLabel,
        currentStageBranchLabel: currentStageLinkedBranchSummary?.branchLabel || null,
        currentStageHasLinkedHistoryTurn,
        currentStageContinuationDiffers,
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
        selectedHistoryId,
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
    const gallerySupportSurface = useMemo(
        () => (
            <WorkspaceGalleryCard
                currentLanguage={currentLang}
                history={history}
                onSelect={handleHistorySelect}
                onRenameBranch={handleRenameBranch}
                isPromotedContinuationSource={isPromotedContinuationSource}
                getContinueActionLabel={getContinueActionLabel}
                branchNameOverrides={branchNameOverrides}
                selectedHistoryId={selectedHistoryId}
                currentStageSourceHistoryId={currentStageSourceHistoryId}
                onClear={handleClearGalleryHistory}
            />
        ),
        [
            branchNameOverrides,
            currentLang,
            currentStageSourceHistoryId,
            getContinueActionLabel,
            handleClearGalleryHistory,
            handleHistorySelect,
            handleRenameBranch,
            history,
            isPromotedContinuationSource,
            selectedHistoryId,
        ],
    );
    const shellPanelClassName = 'min-w-0 nbu-shell-panel nbu-shell-surface-stage-hero p-3';
    const stagePanelClassName =
        'min-w-0 nbu-shell-panel nbu-shell-surface-stage-hero min-h-[440px] overflow-hidden p-3 lg:min-h-0 lg:flex-1';
    const topLauncherCompactButtonClassName =
        'group nbu-shell-panel flex h-[40px] min-w-0 items-center justify-center px-3 py-2 text-center transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,23,42,0.12)] dark:hover:shadow-[0_18px_40px_rgba(2,6,23,0.38)] min-h-[40px]';
    const topLauncherCompactLabelClassName =
        'whitespace-nowrap text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400';
    const responseTextPlaceholder =
        effectiveStructuredOutputMode !== 'off'
            ? t('workspaceViewerStructuredOutput')
            : viewSettings.outputFormat === 'images-and-text'
              ? t('workspacePanelResultTextReady')
              : t('workspacePanelResultTextReserved');
    const hasResponseInfo = Boolean(
        effectiveResultText?.trim() || (effectiveStructuredData && Object.keys(effectiveStructuredData).length > 0),
    );
    const hasSourceTrailInfo = Boolean(
        groundingQueries.length > 0 ||
        selectedSources.length > 0 ||
        selectedSupportBundles.length > 0 ||
        Boolean(searchEntryPointRenderedContent?.trim()) ||
        effectiveSessionHints?.groundingMetadataReturned ||
        effectiveSessionHints?.groundingSupportsReturned,
    );
    const workflowThoughtEntries = useMemo<WorkflowThoughtEntry[]>(() => {
        const historyTurns =
            workspaceSession.conversationTurnIds.length > 0
                ? workspaceSession.conversationTurnIds
                      .map((historyId) => getHistoryTurnById(historyId))
                      .filter((item): item is NonNullable<typeof item> => Boolean(item))
                : currentStageBranchSummary?.turns && currentStageBranchSummary.turns.length > 0
                  ? currentStageBranchSummary.turns
                  : activeBranchSummary?.turns && activeBranchSummary.turns.length > 0
                    ? activeBranchSummary.turns
                    : currentStageSourceTurn
                      ? [currentStageSourceTurn]
                      : [];
        const uniqueTurns = historyTurns.filter(
            (turn, index, turns) => turns.findIndex((candidate) => candidate.id === turn.id) === index,
        );
        const thoughtTurns = uniqueTurns
            .filter((turn) => Boolean(turn.thoughts?.trim()))
            .map((turn) => ({
                id: turn.id,
                shortId: getShortTurnId(turn.id),
                prompt: turn.prompt || null,
                thoughts: turn.thoughts!.trim(),
                createdAtMs: turn.createdAt,
                createdAtLabel: new Date(turn.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                }),
            }))
            .reverse();

        if (thoughtTurns.length > 0) {
            return thoughtTurns;
        }

        const fallbackThoughts = effectiveThoughts?.trim();

        if (!fallbackThoughts) {
            return [];
        }

        return [
            {
                id: currentStageSourceTurn?.id || workspaceSession.sourceHistoryId || 'active-session',
                shortId: getShortTurnId(currentStageSourceTurn?.id || workspaceSession.sourceHistoryId),
                prompt: prompt || null,
                thoughts: fallbackThoughts,
                createdAtMs: workspaceSession.updatedAt || null,
                createdAtLabel: sessionUpdatedLabel,
            },
        ];
    }, [
        activeBranchSummary,
        currentStageBranchSummary,
        currentStageSourceTurn,
        effectiveThoughts,
        getHistoryTurnById,
        prompt,
        sessionUpdatedLabel,
        workspaceSession.conversationTurnIds,
        workspaceSession.sourceHistoryId,
    ]);
    const workflowTimelineAnchorMs = useMemo(() => {
        const candidates = [
            workspaceSession.updatedAt,
            currentStageSourceTurn?.createdAt,
            currentStageBranchSummary?.updatedAt,
            activeBranchSummary?.updatedAt,
            history[0]?.createdAt,
        ].filter((value): value is number => typeof value === 'number' && value > 0);

        return candidates.length > 0 ? Math.max(...candidates) : Date.now();
    }, [
        activeBranchSummary?.updatedAt,
        currentStageBranchSummary?.updatedAt,
        currentStageSourceTurn?.createdAt,
        history,
        workspaceSession.updatedAt,
    ]);
    const workflowTimelineEntries = useMemo(
        () =>
            buildWorkflowTimeline(logs, 14)
                .slice()
                .reverse()
                .map((entry, index, timelineEntries) => ({
                    ...entry,
                    displayMessage: renderWorkflowMessage(entry.message, t),
                    sortTimestampMs: parseWorkflowTimestampMs(entry.timestamp, workflowTimelineAnchorMs),
                    sortOrder: timelineEntries.length - index,
                })),
        [logs, t, workflowTimelineAnchorMs],
    );
    const workflowDetailContextPanel = useMemo(
        () => (
            <WorkspaceInsightsSidebar
                currentLanguage={currentLang}
                showHeader={false}
                compact={true}
                showWorkflowSummary={false}
                showThoughtsSection={false}
                latestWorkflowEntry={latestWorkflowEntry}
                isGenerating={isGenerating}
                batchProgress={batchProgress}
                queuedJobs={queuedJobs}
                resultStatusSummary={groundingResolutionStatusSummary}
                resultStatusTone={groundingResolutionStatusTone}
                thoughtsText={effectiveThoughts}
                thoughtsPlaceholder={thoughtStateMessage}
                currentStageAsset={currentStageAsset}
                currentStageBranchSummary={currentStageBranchSummary}
                currentStageSourceTurn={currentStageSourceTurn}
                currentStageSourceHistoryId={currentStageAsset?.sourceHistoryId || null}
                activeBranchSummary={null}
                sessionContinuitySignals={sessionContinuitySignals}
                conversationSummary={conversationSummary}
                conversationSourceTurn={conversationSourceTurn}
                sessionSourceTurn={sessionSourceTurn}
                branchLabelByTurnId={branchLabelByTurnId}
                onHistorySelect={handleHistorySelect}
                getStageOriginLabel={getStageOriginLabel}
                getLineageActionLabel={getLineageActionLabel}
                getLineageActionDescription={getLineageActionDescription}
                getShortTurnId={getShortTurnId}
                getBranchAccentClassName={getBranchAccentClassName}
                renderHistoryTurnSnapshotContent={renderHistoryTurnSnapshotContent}
                renderHistoryTurnBadges={renderHistoryTurnBadges}
                renderHistoryTurnActionRow={renderHistoryTurnActionRow}
            />
        ),
        [
            batchProgress,
            branchLabelByTurnId,
            conversationSourceTurn,
            conversationSummary,
            currentLang,
            currentStageAsset,
            currentStageBranchSummary,
            currentStageSourceTurn,
            effectiveThoughts,
            getBranchAccentClassName,
            getLineageActionDescription,
            getLineageActionLabel,
            getShortTurnId,
            getStageOriginLabel,
            groundingResolutionStatusSummary,
            groundingResolutionStatusTone,
            handleHistorySelect,
            isGenerating,
            latestWorkflowEntry,
            queuedJobs,
            renderHistoryTurnActionRow,
            renderHistoryTurnBadges,
            renderHistoryTurnSnapshotContent,
            sessionContinuitySignals,
            sessionSourceTurn,
            thoughtStateMessage,
        ],
    );
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
    const versionsDetailPanelProps = useMemo(
        () => ({
            currentLanguage: currentLang,
            activeBranchSummary,
            recentBranchSummaries,
            branchSummariesCount: branchSummaries.length,
            sessionUpdatedLabel,
            selectedHistoryId,
            lineageRootGroups,
            onExportWorkspace: handleExportWorkspaceSnapshot,
            onImportWorkspace: handleOpenWorkspaceImportPicker,
            onHistorySelect: handleHistorySelect,
            onRenameBranch: handleRenameBranch,
            getShortTurnId,
            getBranchAccentClassName,
            renderHistoryTurnSnapshotContent,
            renderHistoryTurnBadges,
            renderHistoryTurnActionRow,
            renderActiveBranchSummaryContent,
        }),
        [
            activeBranchSummary,
            branchSummaries.length,
            currentLang,
            getBranchAccentClassName,
            getShortTurnId,
            handleExportWorkspaceSnapshot,
            handleHistorySelect,
            handleOpenWorkspaceImportPicker,
            handleRenameBranch,
            lineageRootGroups,
            recentBranchSummaries,
            renderActiveBranchSummaryContent,
            renderHistoryTurnActionRow,
            renderHistoryTurnBadges,
            renderHistoryTurnSnapshotContent,
            selectedHistoryId,
            sessionUpdatedLabel,
        ],
    );
    const workspaceDetailOverlays =
        activeWorkspaceDetailModal === 'workflow' ? (
            <WorkspaceDetailModal
                dataTestId="workspace-workflow-detail-modal"
                title={t('workflowStatusLabel')}
                closeLabel={t('workspaceViewerClose')}
                onClose={handleCloseWorkspaceDetailModal}
                compact={true}
            >
                <WorkspaceWorkflowDetailPanel
                    currentLanguage={currentLang}
                    entries={workflowTimelineEntries}
                    batchProgress={batchProgress}
                    queuedJobs={queuedJobs}
                    resultStatusSummary={groundingResolutionStatusSummary}
                    resultStatusTone={groundingResolutionStatusTone}
                    thoughtEntries={workflowThoughtEntries}
                    thoughtsText={effectiveThoughts}
                    thoughtsPlaceholder={thoughtStateMessage}
                    contextPanel={workflowDetailContextPanel}
                />
            </WorkspaceDetailModal>
        ) : activeWorkspaceDetailModal === 'answer' ? (
            <WorkspaceDetailModal
                dataTestId="workspace-answer-detail-modal"
                title={t('workspacePanelResponseEyebrow')}
                closeLabel={t('workspaceViewerClose')}
                onClose={handleCloseWorkspaceDetailModal}
            >
                <WorkspaceResponseRail
                    currentLanguage={currentLang}
                    resultText={effectiveResultText}
                    structuredData={effectiveStructuredData}
                    structuredOutputMode={effectiveStructuredOutputMode}
                    formattedStructuredOutput={formattedStructuredOutput}
                    resultPlaceholder={responseTextPlaceholder}
                    onReplacePrompt={handleReplacePromptFromStructuredOutput}
                    onAppendPrompt={handleAppendPromptFromStructuredOutput}
                    presentation="detail-panel"
                />
            </WorkspaceDetailModal>
        ) : activeWorkspaceDetailModal === 'sources' ? (
            <WorkspaceDetailModal
                dataTestId="workspace-sources-detail-modal"
                title={t('workspaceInsightsSourcesCitations')}
                closeLabel={t('workspaceViewerClose')}
                onClose={handleCloseWorkspaceDetailModal}
            >
                {contextProvenanceDetailPanel}
            </WorkspaceDetailModal>
        ) : activeWorkspaceDetailModal === 'versions' ? (
            <WorkspaceDetailModal
                dataTestId="workspace-versions-detail-modal"
                title={t('workspaceInsightsVersions')}
                closeLabel={t('workspaceViewerClose')}
                onClose={handleCloseWorkspaceDetailModal}
            >
                <WorkspaceVersionsDetailPanel {...versionsDetailPanelProps} showHeader={false} />
            </WorkspaceDetailModal>
        ) : activeWorkspaceDetailModal === 'queued-jobs' ? (
            <WorkspaceDetailModal
                dataTestId="workspace-queued-batch-detail-modal"
                title={t('queuedBatchJobsTitle')}
                closeLabel={t('workspaceViewerClose')}
                onClose={handleCloseWorkspaceDetailModal}
                description={t('queuedBatchJobsDesc')}
            >
                <QueuedBatchJobsPanel
                    currentLanguage={currentLang}
                    queuedJobs={queuedJobs}
                    surface="embedded"
                    queueBatchConversationNotice={queueBatchConversationNotice}
                    getLineageActionLabel={getLineageActionLabel}
                    getImportedQueuedResultCount={getImportedQueuedResultCount}
                    getImportedQueuedHistoryItems={getImportedQueuedHistoryItems}
                    activeImportedQueuedHistoryId={currentStageSourceHistoryId}
                    onImportAllQueuedJobs={handleImportAllQueuedJobs}
                    onPollAllQueuedJobs={handlePollAllQueuedJobs}
                    onPollQueuedJob={handlePollQueuedJob}
                    onCancelQueuedJob={handleCancelQueuedJob}
                    onImportQueuedJob={handleImportQueuedJob}
                    onOpenImportedQueuedJob={handleOpenImportedQueuedJob}
                    onOpenLatestImportedQueuedJob={handleOpenLatestImportedQueuedJob}
                    onOpenImportedQueuedHistoryItem={handleOpenImportedQueuedHistoryItem}
                    onRemoveQueuedJob={handleRemoveQueuedJob}
                />
            </WorkspaceDetailModal>
        ) : null;
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
                            className="nbu-dashed-panel flex h-full min-h-[420px] items-center justify-center rounded-[24px] text-sm text-gray-500 dark:text-gray-400"
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
                importReviewProps={importReviewProps}
                advancedSettingsDialogProps={advancedSettingsDialogProps}
                extraOverlays={workspaceDetailOverlays}
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

            <div className="relative z-10 mx-auto flex min-h-screen max-w-[1560px] flex-col px-4 pb-6 pt-0 lg:px-6 lg:pb-8">
                <main className="mt-0 flex flex-1 flex-col gap-1.5">
                    <WorkspaceTopHeader {...workspaceTopHeaderProps} />

                    <section
                        data-testid="workspace-insights-collapsible"
                        className="grid gap-1.5 lg:grid-cols-[minmax(0,1fr)_144px_176px] lg:items-stretch"
                    >
                        <WorkspaceWorkflowCard
                            currentLanguage={currentLang}
                            latestWorkflowEntry={latestWorkflowEntry}
                            isGenerating={isGenerating}
                            thoughtsText={effectiveThoughts}
                            onOpenDetails={handleOpenWorkflowDetails}
                        />

                        <button
                            type="button"
                            data-testid="workspace-answer-open-details"
                            onClick={handleOpenAnswerDetails}
                            className={`${topLauncherCompactButtonClassName} nbu-shell-surface-output-strip hover:border-emerald-300 dark:hover:border-emerald-500/30`}
                        >
                            <span className="flex min-w-0 items-center gap-2">
                                <TopLauncherSignal active={hasResponseInfo} dataTestId="workspace-answer-signal" />
                                <span className={topLauncherCompactLabelClassName}>
                                    {t('workspacePanelResponseEyebrow')}
                                </span>
                            </span>
                        </button>

                        <button
                            type="button"
                            data-testid="workspace-sources-open-details"
                            onClick={handleOpenSourceDetails}
                            className={`${topLauncherCompactButtonClassName} nbu-shell-surface-provenance-summary hover:border-sky-300 dark:hover:border-sky-500/30`}
                        >
                            <span className="flex min-w-0 items-center gap-2">
                                <TopLauncherSignal active={hasSourceTrailInfo} dataTestId="workspace-sources-signal" />
                                <span className={topLauncherCompactLabelClassName}>
                                    {t('workspacePanelSourceTrailEyebrow')}
                                </span>
                            </span>
                        </button>
                    </section>

                    <section className="grid gap-1.5">
                        <div className="flex min-w-0 flex-col gap-1.5">
                            <WorkspaceHistoryCanvas
                                currentLanguage={currentLang}
                                selectedItemDock={selectedItemDock}
                                recentLane={recentLane}
                                focusSurface={focusSurface}
                                supportSurface={gallerySupportSurface}
                                activeBranchSummary={activeBranchSummary}
                                recentBranchSummaries={recentBranchSummaries}
                                branchSummariesCount={branchSummaries.length}
                                sessionUpdatedLabel={sessionUpdatedLabel}
                                selectedHistoryId={selectedHistoryId}
                                lineageRootGroups={lineageRootGroups}
                                onExportWorkspace={handleExportWorkspaceSnapshot}
                                onImportWorkspace={handleOpenWorkspaceImportPicker}
                                onOpenVersionsDetails={handleOpenVersionsDetails}
                                onHistorySelect={handleHistorySelect}
                                onRenameBranch={handleRenameBranch}
                                getShortTurnId={getShortTurnId}
                                getBranchAccentClassName={getBranchAccentClassName}
                                renderHistoryTurnSnapshotContent={renderHistoryTurnSnapshotContent}
                                renderHistoryTurnBadges={renderHistoryTurnBadges}
                                renderHistoryTurnActionRow={renderHistoryTurnActionRow}
                                renderActiveBranchSummaryContent={renderActiveBranchSummaryContent}
                            />
                        </div>
                    </section>

                    <section
                        data-testid="workspace-actions-composer-row"
                        className="grid gap-1.5 xl:grid-cols-[minmax(280px,320px)_minmax(0,1fr)] xl:items-start"
                    >
                        <div className="order-2 xl:order-1">{sideToolPanel}</div>
                        <div className="order-1 min-w-0 xl:order-2">
                            <ComposerSettingsPanel {...composerSettingsPanelProps} />
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
};

export default App;
