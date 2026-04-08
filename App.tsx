import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense, lazy } from 'react';
import {
    AspectRatio,
    BatchPreviewSession,
    BranchNameOverrides,
    EditorMode,
    ExecutionMode,
    GeneratedImage as GeneratedImageType,
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
    WorkspaceSettingsDraft,
} from './types';
import ComposerAdvancedSettingsDialog from './components/ComposerAdvancedSettingsDialog';
import ComposerSettingsPanel from './components/ComposerSettingsPanel';
import PanelLoadingFallback from './components/PanelLoadingFallback';
import QueuedBatchJobsPanel from './components/QueuedBatchJobsPanel';
import SelectedItemActionBar from './components/SelectedItemActionBar';
import SelectedItemSummaryStrip from './components/SelectedItemSummaryStrip';
import SurfaceLoadingFallback from './components/SurfaceLoadingFallback';
import WorkspaceDetailModal from './components/WorkspaceDetailModal';
import WorkspaceHistoryCanvas from './components/WorkspaceHistoryCanvas';
import WorkspaceInsightsSidebar from './components/WorkspaceInsightsSidebar';
import WorkspaceOverlayStack from './components/WorkspaceOverlayStack';
import WorkspaceResponseRail from './components/WorkspaceResponseRail';
import WorkspaceSideToolPanel from './components/WorkspaceSideToolPanel';
import WorkspaceBottomFooter from './components/WorkspaceBottomFooter';
import WorkspaceTopHeader from './components/WorkspaceTopHeader';
import WorkspaceUnifiedHistoryPanel from './components/WorkspaceUnifiedHistoryPanel';
import WorkspaceVersionsDetailPanel from './components/WorkspaceVersionsDetailPanel';
import WorkspaceWorkflowCard from './components/WorkspaceWorkflowCard';
import WorkspaceWorkflowDetailPanel from './components/WorkspaceWorkflowDetailPanel';
import { Language, ensureLanguageLoaded, getTranslation, persistLanguagePreference } from './utils/translations';
import { ASPECT_RATIOS, IMAGE_MODELS, MODEL_CAPABILITIES, OUTPUT_FORMATS, THINKING_LEVELS } from './constants';
import {
    EMPTY_WORKSPACE_COMPOSER_STATE,
    EMPTY_WORKSPACE_SNAPSHOT,
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
import { normalizeStructuredOutputMode } from './utils/structuredOutputs';
import { buildSavedImageLoadUrl, loadImageMetadata } from './utils/imageSaveUtils';
import {
    createImageSidecarMetadataState,
    getImageSidecarMetadataState,
    isPersistedImageSidecarMetadata,
} from './utils/imageSidecarMetadata';

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

const areWorkspaceSettingsDraftsEqual = (left: WorkspaceSettingsDraft, right: WorkspaceSettingsDraft) =>
    left.imageModel === right.imageModel &&
    left.aspectRatio === right.aspectRatio &&
    left.imageSize === right.imageSize &&
    left.batchSize === right.batchSize &&
    left.outputFormat === right.outputFormat &&
    left.structuredOutputMode === right.structuredOutputMode &&
    left.temperature === right.temperature &&
    left.thinkingLevel === right.thinkingLevel &&
    left.groundingMode === right.groundingMode;

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
    const [editorMode, setEditorMode] = useState<EditorMode>('inpaint');
    const [editorRetouchLockedRatio, setEditorRetouchLockedRatio] = useState<AspectRatio | null>(null);
    const [surfaceSharedControlsBottom, setSurfaceSharedControlsBottom] = useState<number | null>(null);
    const [settingsSessionDraft, setSettingsSessionDraft] = useState<WorkspaceSettingsDraft | null>(null);
    const [settingsSessionReturnToGeneration, setSettingsSessionReturnToGeneration] = useState(false);
    const [activeWorkspaceDetailModal, setActiveWorkspaceDetailModal] = useState<
        'workflow' | 'answer' | 'sources' | 'versions' | 'queued-jobs' | null
    >(null);
    const [editingImageSource, setEditingImageSource] = useState<string | null>(null);
    const [batchProgress, setBatchProgress] = useState({ completed: 0, total: 0 });
    const [activeBatchPreviewSession, setActiveBatchPreviewSession] = useState<BatchPreviewSession | null>(null);
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
        openSurfacePickerSheet,
    } = useWorkspaceSurfaceState();

    const uploadInputRef = useRef<HTMLInputElement>(null);
    const workspaceImportInputRef = useRef<HTMLInputElement>(null);
    const composerPromptTextareaRef = useRef<HTMLTextAreaElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const lastPromotedHistoryIdRef = useRef<string | null>(null);
    const queuedBatchHistorySelectRef = useRef<((item: import('./types').GeneratedImage) => void) | null>(null);
    const activeBatchPreviewSessionRef = useRef<BatchPreviewSession | null>(null);

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
        setSelectedMetadata,
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
    const {
        editorContextSnapshot,
        setEditorContextSnapshot,
        editorPrompt,
        setEditorPrompt,
        editorObjectImages,
        setEditorObjectImages,
        editorCharacterImages,
        setEditorCharacterImages,
        editorInitialState,
    } = useWorkspaceTransientUiState({
        selectedGrounding,
        activeResultGrounding: workspaceSession.activeResult?.grounding || null,
        activeGroundingSelection,
        setActiveGroundingSelection,
        setFocusLinkedGroundingItems,
        isEditing,
        objectImages,
        characterImages,
        aspectRatio,
        imageSize,
        batchSize,
    });
    const surfaceObjectImages = isEditing ? editorObjectImages : objectImages;
    const surfaceCharacterImages = isEditing ? editorCharacterImages : characterImages;
    const setSurfaceObjectImages = isEditing ? setEditorObjectImages : setObjectImages;
    const setSurfaceCharacterImages = isEditing ? setEditorCharacterImages : setCharacterImages;

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
    useEffect(() => {
        activeBatchPreviewSessionRef.current = activeBatchPreviewSession;
    }, [activeBatchPreviewSession]);

    const markHistoryItemOpened = useCallback(
        (historyId: string) => {
            setHistory((previousHistory) =>
                previousHistory.map((historyItem) =>
                    historyItem.id === historyId && historyItem.status === 'success' && historyItem.openedAt == null
                        ? {
                              ...historyItem,
                              openedAt: Date.now(),
                          }
                        : historyItem,
                ),
            );
        },
        [setHistory],
    );

    const getBatchVisualSlotIndex = useCallback((item: GeneratedImageType) => {
        const candidateSlotIndex = item.metadata?.batchResultIndex;
        return typeof candidateSlotIndex === 'number' && Number.isFinite(candidateSlotIndex) ? candidateSlotIndex : -1;
    }, []);

    const silentlyShowHistoryItemOnStage = useCallback(
        (item: GeneratedImageType) => {
            const stageUrl = item.savedFilename ? buildSavedImageLoadUrl(item.savedFilename) : item.url;
            if (!stageUrl) {
                return;
            }

            setGeneratedImageUrls([stageUrl]);
            setSelectedImageIndex(0);
            setSelectedHistoryId(item.id);
            applySelectedResultArtifacts(buildResultArtifacts(item));
            setError(null);
            upsertViewerStageSource({
                origin: 'history',
                url: stageUrl,
                savedFilename: item.savedFilename,
                sourceHistoryId: item.id,
                lineageAction: item.lineageAction,
            });
        },
        [
            applySelectedResultArtifacts,
            buildResultArtifacts,
            setError,
            setGeneratedImageUrls,
            setSelectedHistoryId,
            setSelectedImageIndex,
            upsertViewerStageSource,
        ],
    );

    const silentlyShowFailedHistoryItemOnStage = useCallback(
        (item: GeneratedImageType) => {
            setGeneratedImageUrls([]);
            setSelectedImageIndex(0);
            setSelectedHistoryId(item.id);
            applySelectedResultArtifacts(null);
            setError(item.error || t('statusFailed'));
            clearAssetRoles(['stage-source']);
        },
        [
            applySelectedResultArtifacts,
            clearAssetRoles,
            setError,
            setGeneratedImageUrls,
            setSelectedHistoryId,
            setSelectedImageIndex,
            t,
        ],
    );

    const currentViewedCompletedHistoryId = useMemo(() => {
        const candidateHistoryId = currentStageAsset?.sourceHistoryId || selectedHistoryId;
        const candidateHistoryItem = getHistoryTurnById(candidateHistoryId);

        return candidateHistoryItem?.status === 'success' ? candidateHistoryItem.id : null;
    }, [currentStageAsset?.sourceHistoryId, getHistoryTurnById, selectedHistoryId]);
    const currentViewedCompletedHistoryItem = useMemo(
        () => (currentViewedCompletedHistoryId ? getHistoryTurnById(currentViewedCompletedHistoryId) : null),
        [currentViewedCompletedHistoryId, getHistoryTurnById],
    );
    const currentViewedCompletedHistoryMetadata = useMemo(() => {
        const metadata = currentViewedCompletedHistoryItem?.metadata;
        return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
            ? (metadata as Record<string, unknown>)
            : null;
    }, [currentViewedCompletedHistoryItem]);

    const previousViewedCompletedHistoryIdRef = useRef<string | null>(currentViewedCompletedHistoryId);
    const hydratedSidecarHistoryIdRef = useRef<string | null>(null);

    useEffect(() => {
        const previousViewedCompletedHistoryId = previousViewedCompletedHistoryIdRef.current;

        if (previousViewedCompletedHistoryId && previousViewedCompletedHistoryId !== currentViewedCompletedHistoryId) {
            const previousHistoryItem = getHistoryTurnById(previousViewedCompletedHistoryId);
            if (previousHistoryItem?.status === 'success' && previousHistoryItem.openedAt == null) {
                markHistoryItemOpened(previousViewedCompletedHistoryId);
            }
        }

        previousViewedCompletedHistoryIdRef.current = currentViewedCompletedHistoryId;
    }, [currentViewedCompletedHistoryId, getHistoryTurnById, markHistoryItemOpened]);

    useEffect(() => {
        let isDisposed = false;

        if (!currentViewedCompletedHistoryItem) {
            if (hydratedSidecarHistoryIdRef.current) {
                hydratedSidecarHistoryIdRef.current = null;
                setSelectedMetadata(null);
            }
            return;
        }

        hydratedSidecarHistoryIdRef.current = currentViewedCompletedHistoryItem.id;

        if (!currentViewedCompletedHistoryItem.savedFilename) {
            setSelectedMetadata(createImageSidecarMetadataState('missing'));
            return;
        }

        setSelectedMetadata(createImageSidecarMetadataState('loading'));

        void loadImageMetadata(currentViewedCompletedHistoryItem.savedFilename).then((metadata) => {
            if (isDisposed || hydratedSidecarHistoryIdRef.current !== currentViewedCompletedHistoryItem.id) {
                return;
            }

            const mergedMetadata =
                metadata && currentViewedCompletedHistoryMetadata
                    ? ({ ...currentViewedCompletedHistoryMetadata, ...metadata } as Record<string, unknown>)
                    : metadata;

            setSelectedMetadata(mergedMetadata || createImageSidecarMetadataState('missing'));
        });

        return () => {
            isDisposed = true;
        };
    }, [currentViewedCompletedHistoryItem, currentViewedCompletedHistoryMetadata, setSelectedMetadata]);

    const handleBatchPreviewStart = useCallback(
        ({ sessionId, batchSize }: { sessionId: string; batchSize: number }) => {
            setActiveBatchPreviewSession({
                id: sessionId,
                batchSize,
                didUserInspectExistingImage: false,
                tiles: Array.from({ length: batchSize }, (_, slotIndex) => ({
                    id: `${sessionId}-${slotIndex}`,
                    slotIndex,
                    status: 'pending',
                    previewUrl: null,
                    error: null,
                })),
            });
        },
        [],
    );

    const handleBatchPreviewTileUpdate = useCallback(
        ({ sessionId, tile }: { sessionId: string; tile: BatchPreviewSession['tiles'][number] }) => {
            setActiveBatchPreviewSession((previousSession) => {
                if (!previousSession || previousSession.id !== sessionId) {
                    return previousSession;
                }

                return {
                    ...previousSession,
                    tiles: previousSession.tiles.map((candidateTile) =>
                        candidateTile.slotIndex === tile.slotIndex ? { ...candidateTile, ...tile } : candidateTile,
                    ),
                };
            });
        },
        [],
    );

    const handleBatchPreviewComplete = useCallback(
        ({ sessionId, historyItems }: { sessionId: string; historyItems: GeneratedImageType[] }) => {
            const currentPreviewSession = activeBatchPreviewSessionRef.current;
            if (!currentPreviewSession || currentPreviewSession.id !== sessionId) {
                return;
            }

            setActiveBatchPreviewSession(null);

            if (currentPreviewSession.didUserInspectExistingImage) {
                return;
            }

            const orderedBatchHistoryItems = [...historyItems].sort(
                (leftItem, rightItem) => getBatchVisualSlotIndex(rightItem) - getBatchVisualSlotIndex(leftItem),
            );
            const autoOpenHistoryItem =
                orderedBatchHistoryItems.find(
                    (historyItem) => historyItem.status === 'success' && (historyItem.savedFilename || historyItem.url),
                ) || orderedBatchHistoryItems[0];

            if (autoOpenHistoryItem) {
                if (autoOpenHistoryItem.status === 'failed') {
                    silentlyShowFailedHistoryItemOnStage(autoOpenHistoryItem);
                } else {
                    silentlyShowHistoryItemOnStage(autoOpenHistoryItem);
                }
            }
        },
        [getBatchVisualSlotIndex, silentlyShowFailedHistoryItemOnStage, silentlyShowHistoryItemOnStage],
    );

    const handleBatchPreviewClear = useCallback(({ sessionId }: { sessionId: string }) => {
        setActiveBatchPreviewSession((previousSession) => (previousSession?.id === sessionId ? null : previousSession));
    }, []);

    const handleHistorySelectionDuringGeneration = useCallback(() => {
        setActiveBatchPreviewSession((previousSession) =>
            previousSession
                ? {
                      ...previousSession,
                      didUserInspectExistingImage: true,
                  }
                : previousSession,
        );
    }, []);

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
    const activeEditorLockedAspectRatio = isEditing && editorMode === 'inpaint' ? editorRetouchLockedRatio : null;
    const compatibleEditorLockedModels = useMemo(
        () =>
            activeEditorLockedAspectRatio
                ? IMAGE_MODELS.filter((model) =>
                      MODEL_CAPABILITIES[model].supportedRatios.includes(activeEditorLockedAspectRatio),
                  )
                : IMAGE_MODELS,
        [activeEditorLockedAspectRatio],
    );

    const normalizeSettingsSessionDraft = useCallback(
        (draft: WorkspaceSettingsDraft): WorkspaceSettingsDraft => {
            let nextImageModel = draft.imageModel;

            if (
                activeEditorLockedAspectRatio &&
                !MODEL_CAPABILITIES[nextImageModel].supportedRatios.includes(activeEditorLockedAspectRatio)
            ) {
                nextImageModel =
                    IMAGE_MODELS.find((model) =>
                        MODEL_CAPABILITIES[model].supportedRatios.includes(activeEditorLockedAspectRatio),
                    ) || nextImageModel;
            }

            const nextCapability = MODEL_CAPABILITIES[nextImageModel];
            const nextAspectRatio = activeEditorLockedAspectRatio
                ? activeEditorLockedAspectRatio
                : nextCapability.supportedRatios.includes(draft.aspectRatio)
                  ? draft.aspectRatio
                  : nextCapability.supportedRatios.includes('1:1')
                    ? '1:1'
                    : nextCapability.supportedRatios[0] || draft.aspectRatio;
            const nextImageSize =
                nextCapability.supportedSizes.length === 0
                    ? draft.imageSize
                    : nextCapability.supportedSizes.includes(draft.imageSize)
                      ? draft.imageSize
                      : nextCapability.supportedSizes.includes('1K')
                        ? '1K'
                        : nextCapability.supportedSizes[0];
            const nextStructuredOutputMode = nextCapability.supportsStructuredOutputs
                ? normalizeStructuredOutputMode(draft.structuredOutputMode)
                : 'off';
            const nextThinkingLevel = nextCapability.thinkingLevels.includes(draft.thinkingLevel)
                ? draft.thinkingLevel
                : nextCapability.thinkingLevels.includes('minimal')
                  ? 'minimal'
                  : nextCapability.thinkingLevels[0] || 'disabled';
            const nextGroundingMode = getAvailableGroundingModes(nextCapability).includes(draft.groundingMode)
                ? draft.groundingMode
                : 'off';
            let nextOutputFormat = nextCapability.outputFormats.includes(draft.outputFormat)
                ? draft.outputFormat
                : nextCapability.outputFormats[0];

            if (nextStructuredOutputMode !== 'off' || getGroundingFlagsFromMode(nextGroundingMode).imageSearch) {
                nextOutputFormat = 'images-and-text';
            }

            return {
                ...draft,
                imageModel: nextImageModel,
                aspectRatio: nextAspectRatio,
                imageSize: nextImageSize,
                outputFormat: nextOutputFormat,
                structuredOutputMode: nextStructuredOutputMode,
                temperature: Math.max(0, Math.min(2, draft.temperature)),
                thinkingLevel: nextThinkingLevel,
                groundingMode: nextGroundingMode,
            };
        },
        [activeEditorLockedAspectRatio],
    );
    const buildSettingsSessionDraft = useCallback(
        () =>
            normalizeSettingsSessionDraft({
                imageModel,
                aspectRatio,
                imageSize,
                batchSize,
                outputFormat,
                structuredOutputMode,
                temperature,
                thinkingLevel,
                groundingMode,
            }),
        [
            normalizeSettingsSessionDraft,
            imageModel,
            aspectRatio,
            imageSize,
            batchSize,
            outputFormat,
            structuredOutputMode,
            temperature,
            thinkingLevel,
            groundingMode,
        ],
    );
    const updateSettingsSessionDraft = useCallback(
        (updater: React.SetStateAction<WorkspaceSettingsDraft>) => {
            setSettingsSessionDraft((previous) => {
                const baseDraft = previous ?? buildSettingsSessionDraft();
                const nextDraft =
                    typeof updater === 'function'
                        ? (updater as (value: WorkspaceSettingsDraft) => WorkspaceSettingsDraft)(baseDraft)
                        : updater;

                return normalizeSettingsSessionDraft(nextDraft);
            });
        },
        [buildSettingsSessionDraft, normalizeSettingsSessionDraft],
    );
    const clearSettingsSession = useCallback(() => {
        setSettingsSessionDraft(null);
        setSettingsSessionReturnToGeneration(false);
    }, []);
    const settingsSessionView = useMemo(
        () => settingsSessionDraft ?? buildSettingsSessionDraft(),
        [buildSettingsSessionDraft, settingsSessionDraft],
    );
    const settingsSessionCapability = useMemo(
        () => MODEL_CAPABILITIES[settingsSessionView.imageModel],
        [settingsSessionView.imageModel],
    );
    const settingsSessionAvailableGroundingModes = useMemo(
        () => getAvailableGroundingModes(settingsSessionCapability),
        [settingsSessionCapability],
    );
    const generationSettingsDraft = useMemo(
        () => ({
            imageModel: settingsSessionView.imageModel,
            aspectRatio: settingsSessionView.aspectRatio,
            imageSize: settingsSessionView.imageSize,
            batchSize: settingsSessionView.batchSize,
        }),
        [
            settingsSessionView.aspectRatio,
            settingsSessionView.batchSize,
            settingsSessionView.imageModel,
            settingsSessionView.imageSize,
        ],
    );
    const openGenerationSettingsSession = useCallback(() => {
        setSettingsSessionDraft((previous) => previous ?? buildSettingsSessionDraft());
        setSettingsSessionReturnToGeneration(false);
        setIsAdvancedSettingsOpen(false);
        setActivePickerSheet('settings');
    }, [buildSettingsSessionDraft, setActivePickerSheet, setIsAdvancedSettingsOpen]);
    const openAdvancedSettingsSession = useCallback(() => {
        setSettingsSessionDraft((previous) => previous ?? buildSettingsSessionDraft());
        setSettingsSessionReturnToGeneration(false);
        setActivePickerSheet(null);
        setIsAdvancedSettingsOpen(true);
    }, [buildSettingsSessionDraft, setActivePickerSheet, setIsAdvancedSettingsOpen]);
    const openAdvancedSettingsFromGeneration = useCallback(() => {
        setSettingsSessionDraft((previous) => previous ?? buildSettingsSessionDraft());
        setSettingsSessionReturnToGeneration(true);
        setActivePickerSheet(null);
        setIsAdvancedSettingsOpen(true);
    }, [buildSettingsSessionDraft, setActivePickerSheet, setIsAdvancedSettingsOpen]);
    const handleCloseSettingsSheetSession = useCallback(() => {
        clearSettingsSession();
        closePickerSheet();
    }, [clearSettingsSession, closePickerSheet]);
    const handleCloseAdvancedSettingsSession = useCallback(() => {
        if (settingsSessionReturnToGeneration) {
            setIsAdvancedSettingsOpen(false);
            setSettingsSessionReturnToGeneration(false);
            setActivePickerSheet('settings');
            return;
        }

        setIsAdvancedSettingsOpen(false);
        clearSettingsSession();
    }, [clearSettingsSession, setActivePickerSheet, setIsAdvancedSettingsOpen, settingsSessionReturnToGeneration]);
    const handleApplySettingsSessionDraft = useCallback(() => {
        const nextDraft = normalizeSettingsSessionDraft(settingsSessionDraft ?? buildSettingsSessionDraft());
        const nextCapability = MODEL_CAPABILITIES[nextDraft.imageModel];

        setImageModel(nextDraft.imageModel);
        setAspectRatio(nextDraft.aspectRatio);
        if (nextCapability.supportedSizes.length > 0) {
            setImageSize(nextDraft.imageSize);
        }
        setBatchSize(nextDraft.batchSize);
        setOutputFormat(nextDraft.outputFormat);
        setStructuredOutputMode(nextDraft.structuredOutputMode);
        setTemperature(nextDraft.temperature);
        setThinkingLevel(nextDraft.thinkingLevel);
        setGroundingMode(nextDraft.groundingMode);
        setActivePickerSheet(null);
        setIsAdvancedSettingsOpen(false);
        clearSettingsSession();
    }, [
        buildSettingsSessionDraft,
        clearSettingsSession,
        normalizeSettingsSessionDraft,
        setActivePickerSheet,
        setAspectRatio,
        setBatchSize,
        setGroundingMode,
        setImageModel,
        setImageSize,
        setIsAdvancedSettingsOpen,
        setOutputFormat,
        setStructuredOutputMode,
        setTemperature,
        setThinkingLevel,
        settingsSessionDraft,
    ]);
    const handleUpdateGenerationSettingsDraft = useCallback(
        (
            updater: React.SetStateAction<
                Pick<WorkspaceSettingsDraft, 'imageModel' | 'aspectRatio' | 'imageSize' | 'batchSize'>
            >,
        ) => {
            updateSettingsSessionDraft((previous) => {
                const baseGenerationDraft = {
                    imageModel: previous.imageModel,
                    aspectRatio: previous.aspectRatio,
                    imageSize: previous.imageSize,
                    batchSize: previous.batchSize,
                };
                const nextGenerationDraft =
                    typeof updater === 'function'
                        ? (
                              updater as (
                                  value: Pick<
                                      WorkspaceSettingsDraft,
                                      'imageModel' | 'aspectRatio' | 'imageSize' | 'batchSize'
                                  >,
                              ) => Pick<
                                  WorkspaceSettingsDraft,
                                  'imageModel' | 'aspectRatio' | 'imageSize' | 'batchSize'
                              >
                          )(baseGenerationDraft)
                        : updater;

                return {
                    ...previous,
                    ...nextGenerationDraft,
                };
            });
        },
        [updateSettingsSessionDraft],
    );
    const handleSettingsSessionStructuredOutputModeChange = useCallback(
        (nextMode: WorkspaceSettingsDraft['structuredOutputMode']) => {
            const normalizedMode = normalizeStructuredOutputMode(nextMode);
            const shouldUpgrade = normalizedMode !== 'off' && settingsSessionView.outputFormat !== 'images-and-text';

            updateSettingsSessionDraft((previous) => ({
                ...previous,
                structuredOutputMode: normalizedMode,
                outputFormat: normalizedMode !== 'off' ? 'images-and-text' : previous.outputFormat,
            }));

            if (shouldUpgrade) {
                showNotification(t('composerStructuredOutputUpgradeNotice'), 'info');
            }
        },
        [settingsSessionView.outputFormat, showNotification, t, updateSettingsSessionDraft],
    );
    const handleSettingsSessionGroundingModeChange = useCallback(
        (nextMode: WorkspaceSettingsDraft['groundingMode']) => {
            const nextFlags = getGroundingFlagsFromMode(nextMode);
            const shouldUpgrade = nextFlags.imageSearch && settingsSessionView.outputFormat !== 'images-and-text';

            updateSettingsSessionDraft((previous) => ({
                ...previous,
                groundingMode: nextMode,
                outputFormat: nextFlags.imageSearch ? 'images-and-text' : previous.outputFormat,
            }));

            if (shouldUpgrade) {
                showNotification(t('composerGroundingImageSearchUpgradeNotice'), 'info');
            }
        },
        [settingsSessionView.outputFormat, showNotification, t, updateSettingsSessionDraft],
    );

    useEffect(() => {
        if (isEditing) {
            return;
        }

        setEditorMode('inpaint');
        setEditorRetouchLockedRatio(null);
    }, [isEditing]);

    useEffect(() => {
        if (!activeEditorLockedAspectRatio) {
            return;
        }

        if (aspectRatio !== activeEditorLockedAspectRatio) {
            setAspectRatio(activeEditorLockedAspectRatio);
            return;
        }

        if (compatibleEditorLockedModels.length === 0 || compatibleEditorLockedModels.includes(imageModel)) {
            return;
        }

        const nextModel = compatibleEditorLockedModels[0];
        setImageModel(nextModel);
        showNotification(
            t('editorRetouchModelAutoSwitch')
                .replace('{0}', getModelLabel(nextModel))
                .replace('{1}', activeEditorLockedAspectRatio),
            'info',
        );
    }, [
        activeEditorLockedAspectRatio,
        aspectRatio,
        compatibleEditorLockedModels,
        getModelLabel,
        imageModel,
        setAspectRatio,
        setImageModel,
        showNotification,
        t,
    ]);
    useEffect(() => {
        setSettingsSessionDraft((previous) => {
            if (!previous) {
                return previous;
            }

            const normalizedDraft = normalizeSettingsSessionDraft(previous);
            return areWorkspaceSettingsDraftsEqual(previous, normalizedDraft) ? previous : normalizedDraft;
        });
    }, [normalizeSettingsSessionDraft]);
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
        workspaceSessionSourceLineageAction: workspaceSession.sourceLineageAction || null,
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
        currentStageAsset,
        workspaceSession,
        history,
        conversationState,
        branchOriginIdByTurnId,
        getHistoryTurnById,
    });

    const viewerHistoryItems = useMemo(
        () =>
            successfulHistory
                .map((historyItem) => ({
                    id: historyItem.id,
                    url: historyItem.savedFilename
                        ? buildSavedImageLoadUrl(historyItem.savedFilename)
                        : historyItem.url,
                    isFresh: historyItem.openedAt == null,
                }))
                .filter((historyItem) => Boolean(historyItem.url)),
        [successfulHistory],
    );

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
        onBatchPreviewStart: handleBatchPreviewStart,
        onBatchPreviewTileUpdate: handleBatchPreviewTileUpdate,
        onBatchPreviewComplete: handleBatchPreviewComplete,
        onBatchPreviewClear: handleBatchPreviewClear,
    });

    const {
        isEnhancingPrompt: isEnhancingComposerPrompt,
        handleSmartRewrite: handleComposerSmartRewrite,
        handleSurpriseMe: handleComposerSurpriseMe,
    } = usePromptTools({
        currentLanguage: currentLang,
        prompt,
        setPrompt,
        addLog,
        showNotification,
        t,
        apiKeyReady,
        handleApiKeyConnect,
    });
    const {
        isEnhancingPrompt: isEnhancingEditorPrompt,
        handleSmartRewrite: handleEditorSmartRewrite,
        handleSurpriseMe: handleEditorSurpriseMe,
    } = usePromptTools({
        currentLanguage: currentLang,
        prompt: editorPrompt,
        setPrompt: setEditorPrompt,
        addLog,
        showNotification,
        t,
        apiKeyReady,
        handleApiKeyConnect,
    });

    useWorkspaceAppLifecycle({
        historyCount: history.length,
        generatedImageCount: generatedImageUrls.length,
        objectImages,
        characterImages,
        setApiKeyReady,
        setCurrentLang,
        setInitialPreferencesReady: setAreInitialPreferencesReady,
        setAspectRatio,
        addLog,
        t,
    });

    useWorkspaceCapabilityConstraints({
        capability,
        imageSize,
        aspectRatio,
        lockedAspectRatio: activeEditorLockedAspectRatio,
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
    const handlePrepareGenerate = useCallback(() => {
        clearAssetRoles(['stage-source']);
    }, [clearAssetRoles]);

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
        onPrepareGenerate: handlePrepareGenerate,
        setIsGenerating,
        addLog,
        showNotification,
        t,
    });
    const {
        queuedJobs,
        setQueuedJobs,
        isRecoveringRecentQueuedJobs,
        handleQueueBatchJob,
        handleQueueBatchJobFromEditor,
        handlePollQueuedJob,
        handlePollAllQueuedJobs,
        handleCancelQueuedJob,
        handleRecoverRecentQueuedJobs,
        handleImportQueuedJob,
        handleImportAllQueuedJobs,
        handleOpenImportedQueuedJob,
        handleOpenLatestImportedQueuedJob,
        handleOpenImportedQueuedHistoryItem,
        handleClearIssueQueuedJobs,
        handleClearImportedQueuedJobs,
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
    const applyEmptyWorkspaceSnapshot = useCallback(() => {
        applyWorkspaceSnapshot(EMPTY_WORKSPACE_SNAPSHOT);
    }, [applyWorkspaceSnapshot]);

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
        handleEditorGenerate,
        handleEditorQueueBatch,
        handleSketchReplaceCancel,
        handleSketchReplaceConfirm,
        handleCloseSketchPad,
    } = useWorkspaceEditorActions({
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
        queueBatchJobFromEditor: handleQueueBatchJobFromEditor,
    });
    const handleSurfaceRemoveObjectReference = useCallback(
        (indexToRemove: number) => {
            if (isEditing) {
                setEditorObjectImages((previous) => previous.filter((_, index) => index !== indexToRemove));
                return;
            }

            handleRemoveObjectReference(indexToRemove);
        },
        [handleRemoveObjectReference, isEditing, setEditorObjectImages],
    );
    const handleSurfaceRemoveCharacterReference = useCallback(
        (indexToRemove: number) => {
            if (isEditing) {
                setEditorCharacterImages((previous) => previous.filter((_, index) => index !== indexToRemove));
                return;
            }

            handleRemoveCharacterReference(indexToRemove);
        },
        [handleRemoveCharacterReference, isEditing, setEditorCharacterImages],
    );

    const { handleClearCurrentStage, handleClearGalleryHistory } = useWorkspaceResetActions({
        lastPromotedHistoryIdRef,
        handleClearResults,
        clearAssetRoles,
        applyEmptyWorkspaceSnapshot,
        clearPromptHistory,
        setActiveWorkspaceDetailModal,
        setIsAdvancedSettingsOpen,
        setIsSketchPadOpen,
        setShowSketchReplaceConfirm,
        setSettingsSessionDraft,
        setSettingsSessionReturnToGeneration,
        setSurfaceSharedControlsBottom,
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
        setPendingProvenanceContext,
        setConversationState,
        setBranchContinuationSourceByBranchOriginId,
        setHistory,
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
        onHistorySelectWhileGenerating: handleHistorySelectionDuringGeneration,
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
        totalReferenceCount,
    } = useWorkspaceShellViewModel({
        generatedImageCount: generatedImageUrls.length,
        isGenerating,
        displaySettings,
        prompt,
        surfacePrompt: isEditing ? editorPrompt : prompt,
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
        objectImageCount: surfaceObjectImages.length,
        characterImageCount: surfaceCharacterImages.length,
        t,
    });

    useEffect(() => {
        if (!isSurfaceWorkspaceOpen) {
            setSurfaceSharedControlsBottom(null);
        }
    }, [isSurfaceWorkspaceOpen]);

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
    const handleOpenSurfacePickerSheet = useCallback(
        (sheet: Parameters<typeof openSurfacePickerSheet>[0]) => {
            if (sheet === 'settings') {
                openGenerationSettingsSession();
                return;
            }

            openSurfacePickerSheet(sheet);
        },
        [openGenerationSettingsSession, openSurfacePickerSheet],
    );
    const { surfaceSharedControlsProps, importReviewProps, branchRenameDialogProps } =
        useWorkspaceOverlayAuxiliaryProps({
            isSurfaceWorkspaceOpen,
            isAdvancedSettingsOpen,
            isEditing,
            activePickerSheet,
            settingsVariant: isSketchPadOpen ? 'sketch' : 'full',
            totalReferenceCount,
            hasSurfacePrompt: Boolean((isEditing ? editorPrompt : prompt).trim()),
            imageStyle,
            imageModel,
            aspectRatio,
            imageSize,
            batchSize,
            outputFormat,
            structuredOutputMode: effectiveStructuredOutputMode,
            temperature,
            thinkingLevel,
            includeThoughts,
            groundingMode,
            objectImageCount: surfaceObjectImages.length,
            characterImageCount: surfaceCharacterImages.length,
            maxObjects: capability.maxObjects,
            maxCharacters: capability.maxCharacters,
            floatingControlsZIndex,
            onSurfaceSharedControlsBottomChange: setSurfaceSharedControlsBottom,
            currentLanguage: currentLang,
            openSurfacePickerSheet: handleOpenSurfacePickerSheet,
            openAdvancedSettings: openAdvancedSettingsSession,
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
        });
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
    const handleClearStyle = useCallback(() => {
        setImageStyle('None');
    }, [setImageStyle]);
    const composerSettingsPanelProps = useComposerSettingsPanelProps({
        prompt,
        placeholder: t('placeholder'),
        enterToSubmit,
        isGenerating,
        isEnhancingPrompt: isEnhancingComposerPrompt,
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
        handleSurpriseMe: handleComposerSurpriseMe,
        handleSmartRewrite: handleComposerSmartRewrite,
        openSettings: openGenerationSettingsSession,
        openAdvancedSettings: openAdvancedSettingsSession,
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
                  outputFormat: settingsSessionView.outputFormat,
                  structuredOutputMode: settingsSessionView.structuredOutputMode,
                  thinkingLevel: settingsSessionView.thinkingLevel,
                  groundingMode: settingsSessionView.groundingMode,
                  imageModel: settingsSessionView.imageModel,
                  capability: settingsSessionCapability,
                  availableGroundingModes: settingsSessionAvailableGroundingModes,
                  temperature: settingsSessionView.temperature,
                  onOutputFormatChange: (value) =>
                      updateSettingsSessionDraft((previous) => ({
                          ...previous,
                          outputFormat: value,
                      })),
                  onStructuredOutputModeChange: handleSettingsSessionStructuredOutputModeChange,
                  onTemperatureChange: (value) =>
                      updateSettingsSessionDraft((previous) => ({
                          ...previous,
                          temperature: value,
                      })),
                  onThinkingLevelChange: (value) =>
                      updateSettingsSessionDraft((previous) => ({
                          ...previous,
                          thinkingLevel: value,
                      })),
                  onGroundingModeChange: handleSettingsSessionGroundingModeChange,
                  isOpen: true,
                  onApply: handleApplySettingsSessionDraft,
                  onClose: handleCloseAdvancedSettingsSession,
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
    const focusComposerPromptTextarea = useCallback(() => {
        if (typeof window === 'undefined') {
            return;
        }

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
    }, []);
    const replaceComposerPromptText = useCallback(
        (value: string, noticeKey: string) => {
            const normalizedValue = value.trim();
            if (!normalizedValue) {
                return;
            }

            setPrompt(normalizedValue);
            showNotification(t(noticeKey), 'info');
            focusComposerPromptTextarea();
        },
        [focusComposerPromptTextarea, setPrompt, showNotification, t],
    );
    const handleReplacePromptFromStructuredOutput = useCallback(
        (value: string) => {
            replaceComposerPromptText(value, 'structuredOutputReplacePromptNotice');
        },
        [replaceComposerPromptText],
    );
    const handleApplyPromptFromViewer = useCallback(
        (value: string) => {
            replaceComposerPromptText(value, 'workspaceViewerPromptAppliedNotice');
        },
        [replaceComposerPromptText],
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
            focusComposerPromptTextarea();
        },
        [focusComposerPromptTextarea, prompt, setPrompt, showNotification, t],
    );
    const getOutputFormatSummaryLabel = useCallback(
        (value: string) => OUTPUT_FORMATS.find((option) => option.value === value)?.label ?? value,
        [],
    );
    const getThinkingLevelSummaryLabel = useCallback(
        (value: string) =>
            THINKING_LEVELS.find((option) => option.value === value)?.label ??
            (value === 'disabled' ? t('structuredOutputModeOff') : value),
        [t],
    );
    const getThoughtVisibilitySummaryLabel = useCallback(
        (value: boolean) => t(value ? 'composerVisibilityVisible' : 'composerVisibilityHidden'),
        [t],
    );
    const getMetadataGroundingModeLabel = useCallback((metadata: Record<string, unknown> | null | undefined) => {
        if (typeof metadata?.groundingMode === 'string') {
            switch (metadata.groundingMode) {
                case 'off':
                case 'google-search':
                case 'image-search':
                case 'google-search-plus-image-search':
                    return getGroundingModeLabel(metadata.groundingMode as GroundingMode);
                default:
                    return metadata.groundingMode;
            }
        }

        if (typeof metadata?.googleSearch === 'boolean' || typeof metadata?.imageSearch === 'boolean') {
            return getGroundingModeLabel(
                deriveGroundingMode(Boolean(metadata?.googleSearch), Boolean(metadata?.imageSearch)),
            );
        }

        return null;
    }, []);
    const viewerMetadataSidecarState = getImageSidecarMetadataState(selectedMetadata);
    const viewerHasPersistedSidecarMetadata = isPersistedImageSidecarMetadata(selectedMetadata);
    const viewerMetadataStatus = useMemo(() => {
        if (!currentViewedCompletedHistoryItem) {
            return 'ready' as const;
        }

        if (viewerMetadataSidecarState) {
            return viewerMetadataSidecarState;
        }

        if (viewerHasPersistedSidecarMetadata) {
            return 'ready' as const;
        }

        return currentViewedCompletedHistoryItem.savedFilename ? ('loading' as const) : ('missing' as const);
    }, [currentViewedCompletedHistoryItem, viewerHasPersistedSidecarMetadata, viewerMetadataSidecarState]);
    const viewerMetadataLoadingLabel = t('workspaceViewerMetadataLoading');
    const viewerMetadataUnavailableLabel = t('workspaceViewerMetadataUnavailable');
    const viewerMetadataStateMessage =
        viewerMetadataStatus === 'loading'
            ? viewerMetadataLoadingLabel
            : viewerMetadataStatus === 'missing'
              ? viewerMetadataUnavailableLabel
              : null;
    const resolveViewerMetadataValue = useCallback(
        (sidecarValue: string | null, fallbackValue: string) => {
            if (viewerMetadataStatus === 'loading') {
                return viewerMetadataLoadingLabel;
            }

            if (viewerMetadataStatus === 'missing') {
                return viewerMetadataUnavailableLabel;
            }

            if (viewerHasPersistedSidecarMetadata) {
                return sidecarValue || viewerMetadataUnavailableLabel;
            }

            return sidecarValue || fallbackValue;
        },
        [
            viewerHasPersistedSidecarMetadata,
            viewerMetadataLoadingLabel,
            viewerMetadataStatus,
            viewerMetadataUnavailableLabel,
        ],
    );
    const viewerMetadataAspectRatio = resolveViewerMetadataValue(
        typeof selectedMetadata?.aspectRatio === 'string' ? selectedMetadata.aspectRatio : null,
        viewSettings.aspectRatio,
    );
    const viewerMetadataSize = resolveViewerMetadataValue(
        typeof selectedMetadata?.requestedImageSize === 'string'
            ? selectedMetadata.requestedImageSize
            : typeof selectedMetadata?.size === 'string'
              ? selectedMetadata.size
              : null,
        viewSettings.size,
    );
    const viewerMetadataStyleLabel = resolveViewerMetadataValue(
        typeof selectedMetadata?.style === 'string' ? getStyleLabel(selectedMetadata.style as ImageStyle) : null,
        getStyleLabel(viewSettings.style),
    );
    const viewerMetadataModelLabel = resolveViewerMetadataValue(
        selectedMetadata?.model === 'gemini-3.1-flash-image-preview' ||
            selectedMetadata?.model === 'gemini-3-pro-image-preview' ||
            selectedMetadata?.model === 'gemini-2.5-flash-image'
            ? getModelLabel(selectedMetadata.model as ImageModel)
            : typeof selectedMetadata?.model === 'string'
              ? selectedMetadata.model
              : null,
        getModelLabel(viewSettings.model),
    );
    const viewerMetadataTemperature = resolveViewerMetadataValue(
        typeof selectedMetadata?.temperature === 'number' ? selectedMetadata.temperature.toFixed(1) : null,
        viewSettings.temperature.toFixed(1),
    );
    const viewerMetadataOutputFormat = resolveViewerMetadataValue(
        typeof selectedMetadata?.outputFormat === 'string'
            ? getOutputFormatSummaryLabel(selectedMetadata.outputFormat)
            : null,
        getOutputFormatSummaryLabel(viewSettings.outputFormat),
    );
    const viewerMetadataThinkingLevel = resolveViewerMetadataValue(
        typeof selectedMetadata?.thinkingLevel === 'string'
            ? getThinkingLevelSummaryLabel(selectedMetadata.thinkingLevel)
            : null,
        getThinkingLevelSummaryLabel(viewSettings.thinkingLevel),
    );
    const viewerMetadataGrounding = resolveViewerMetadataValue(
        getMetadataGroundingModeLabel(selectedMetadata),
        getGroundingModeLabel(deriveGroundingMode(viewSettings.googleSearch, viewSettings.imageSearch)),
    );
    const viewerMetadataReturnThoughts = resolveViewerMetadataValue(
        typeof selectedMetadata?.includeThoughts === 'boolean'
            ? getThoughtVisibilitySummaryLabel(selectedMetadata.includeThoughts)
            : null,
        getThoughtVisibilitySummaryLabel(viewSettings.includeThoughts),
    );
    const viewerMetadataItems = useMemo(
        () => [
            { key: 'ratio', label: t('workspaceViewerRatio'), value: viewerMetadataAspectRatio },
            { key: 'size', label: t('workspaceViewerSize'), value: viewerMetadataSize },
            { key: 'style', label: t('workspaceViewerStyle'), value: viewerMetadataStyleLabel },
            { key: 'model', label: t('workspaceViewerModel'), value: viewerMetadataModelLabel },
            {
                key: 'temperature',
                label: t('groundingProvenanceInsightTemperature'),
                value: viewerMetadataTemperature,
            },
            {
                key: 'output-format',
                label: t('groundingProvenanceInsightOutputFormat'),
                value: viewerMetadataOutputFormat,
            },
            {
                key: 'thinking-level',
                label: t('groundingProvenanceInsightThinkingLevel'),
                value: viewerMetadataThinkingLevel,
            },
            {
                key: 'grounding',
                label: t('groundingProvenanceInsightGrounding'),
                value: viewerMetadataGrounding,
            },
            {
                key: 'return-thoughts',
                label: t('groundingProvenanceInsightReturnThoughts'),
                value: viewerMetadataReturnThoughts,
            },
        ],
        [
            t,
            viewerMetadataAspectRatio,
            viewerMetadataGrounding,
            viewerMetadataModelLabel,
            viewerMetadataOutputFormat,
            viewerMetadataReturnThoughts,
            viewerMetadataSize,
            viewerMetadataStyleLabel,
            viewerMetadataTemperature,
            viewerMetadataThinkingLevel,
        ],
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
    const currentStageIsPendingBranchSource = Boolean(
        currentStageHasLinkedHistoryTurn &&
        currentStageSourceTurn &&
        workspaceSession.sourceLineageAction === 'branch' &&
        workspaceSession.sourceHistoryId === currentStageSourceTurn.id,
    );
    const currentStageContinuationDiffers = Boolean(
        currentStageHasLinkedHistoryTurn &&
        currentStageSourceTurn &&
        !currentStageIsPendingBranchSource &&
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
    const handleViewerSelectHistoryItem = useCallback(
        (historyId: string) => {
            const historyItem = getHistoryTurnById(historyId);
            if (historyItem) {
                handleHistorySelect(historyItem);
            }
        },
        [getHistoryTurnById, handleHistorySelect],
    );
    const { activeViewerImage, workspaceViewerOverlayProps, generatedImageStageProps } = useWorkspaceStageViewer({
        generatedImageUrls,
        selectedImageIndex,
        setSelectedImageIndex,
        isViewerOpen,
        setIsViewerOpen,
        isGenerating,
        showStageGeneratingState: isGenerating && generatedImageUrls.length === 0,
        viewerItems: viewerHistoryItems,
        viewerSelectedHistoryId: currentViewedCompletedHistoryId,
        onSelectViewerItem: handleViewerSelectHistoryItem,
        prompt: viewSettings.prompt,
        error,
        resultStatusSummary: groundingResolutionStatusSummary,
        resultStatusTone: groundingResolutionStatusTone,
        settings: stageViewerSettings,
        generationMode,
        executionMode,
        onGenerate: handleGenerate,
        onEdit: handleOpenEditor,
        onUpload: handleOpenEditor,
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
        metadataItems: viewerMetadataItems,
        metadataStateMessage: viewerMetadataStateMessage,
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
        onApplyPrompt: handleApplyPromptFromViewer,
        onReplacePrompt: handleReplacePromptFromStructuredOutput,
        onAppendPrompt: handleAppendPromptFromStructuredOutput,
    });
    const handleCloseWorkspacePickerSheet = useCallback(() => {
        if (activePickerSheet === 'settings') {
            handleCloseSettingsSheetSession();
            return;
        }

        closePickerSheet();
    }, [activePickerSheet, closePickerSheet, handleCloseSettingsSheetSession]);
    const workspacePickerSheetProps = useWorkspacePickerSheetProps({
        activePickerSheet,
        activeSheetTitle,
        pickerSheetZIndex,
        prompt: isEditing ? editorPrompt : prompt,
        setPrompt: isEditing ? setEditorPrompt : setPrompt,
        handleSurpriseMe: isEditing ? handleEditorSurpriseMe : handleComposerSurpriseMe,
        handleSmartRewrite: isEditing ? handleEditorSmartRewrite : handleComposerSmartRewrite,
        isEnhancingPrompt: isEditing ? isEnhancingEditorPrompt : isEnhancingComposerPrompt,
        closePickerSheet: handleCloseWorkspacePickerSheet,
        openPromptSheet: () => setActivePickerSheet('prompt'),
        openTemplatesSheet: () => setActivePickerSheet('templates'),
        openHistorySheet: () => setActivePickerSheet('history'),
        openStylesSheet: () => {
            if (!isEditing) {
                setActivePickerSheet('styles');
            }
        },
        openReferencesSheet: () => setActivePickerSheet('references'),
        openAdvancedSettings: openAdvancedSettingsFromGeneration,
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
        lockedAspectRatio: activeEditorLockedAspectRatio,
        settingsDraft: generationSettingsDraft,
        onUpdateSettingsDraft: handleUpdateGenerationSettingsDraft,
        onApplySettingsDraft: handleApplySettingsSessionDraft,
        batchSize,
        setBatchSize,
        settingsVariant: isSketchPadOpen ? 'sketch' : 'full',
        objectImages: surfaceObjectImages,
        characterImages: surfaceCharacterImages,
        setObjectImages: setSurfaceObjectImages,
        isGenerating,
        showNotification,
        handleRemoveObjectReference: handleSurfaceRemoveObjectReference,
        setCharacterImages: setSurfaceCharacterImages,
        handleRemoveCharacterReference: handleSurfaceRemoveCharacterReference,
        showStyleEntry: !isEditing,
    });
    const historySurface = useMemo(
        () => (
            <WorkspaceUnifiedHistoryPanel
                currentLanguage={currentLang}
                history={history}
                previewTiles={activeBatchPreviewSession?.tiles || []}
                selectedItemDock={selectedItemDock || undefined}
                selectedHistoryId={selectedHistoryId}
                currentStageSourceHistoryId={currentStageSourceHistoryId}
                activeBranchSummary={activeBranchSummary}
                branchSummariesCount={branchSummaries.length}
                onSelect={handleHistorySelect}
                isPromotedContinuationSource={isPromotedContinuationSource}
                getBranchAccentClassName={getBranchAccentClassName}
                onClearWorkspace={handleClearGalleryHistory}
            />
        ),
        [
            activeBranchSummary,
            activeBatchPreviewSession?.tiles,
            branchSummaries.length,
            currentLang,
            currentStageSourceHistoryId,
            getBranchAccentClassName,
            handleClearGalleryHistory,
            handleHistorySelect,
            history,
            isPromotedContinuationSource,
            selectedHistoryId,
            selectedItemDock,
        ],
    );
    const stagePanelClassName =
        'min-w-0 nbu-shell-panel nbu-shell-surface-stage-hero min-h-[400px] overflow-hidden p-3 lg:min-h-0 lg:flex-1 xl:h-full xl:min-h-0 xl:p-0';
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
                canEditCurrentImage={Boolean(activeViewerImage)}
                onOpenSketchPad={handleOpenSketchPad}
                onOpenEditor={handleOpenEditor}
                objectImages={objectImages}
                characterImages={characterImages}
                maxObjects={capability.maxObjects}
                maxCharacters={capability.maxCharacters}
                setObjectImages={setObjectImages}
                setCharacterImages={setCharacterImages}
                isGenerating={isGenerating}
                showNotification={showNotification}
                handleRemoveObjectReference={handleRemoveObjectReference}
                handleRemoveCharacterReference={handleRemoveCharacterReference}
            />
        ),
        [
            activeViewerImage,
            capability.maxCharacters,
            capability.maxObjects,
            characterImages,
            currentLang,
            handleOpenEditor,
            handleOpenSketchPad,
            handleRemoveCharacterReference,
            handleRemoveObjectReference,
            isGenerating,
            objectImages,
            setCharacterImages,
            setObjectImages,
            showNotification,
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
                    isRecoveringRecentQueuedJobs={isRecoveringRecentQueuedJobs}
                    getLineageActionLabel={getLineageActionLabel}
                    getImportedQueuedResultCount={getImportedQueuedResultCount}
                    getImportedQueuedHistoryItems={getImportedQueuedHistoryItems}
                    activeImportedQueuedHistoryId={currentStageSourceHistoryId}
                    onRecoverRecentQueuedJobs={handleRecoverRecentQueuedJobs}
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
                />
            </WorkspaceDetailModal>
        ) : null;
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
                                onQueueBatch={handleEditorQueueBatch}
                                onCancel={closeEditor}
                                isGenerating={isGenerating}
                                currentLanguage={currentLang}
                                currentLog={logs.length > 0 ? logs[logs.length - 1] : ''}
                                error={error}
                                onErrorClear={() => setError(null)}
                                imageModel={imageModel}
                                onModelChange={setImageModel}
                                leftDockTopOffset={
                                    surfaceSharedControlsBottom === null ? null : surfaceSharedControlsBottom + 12
                                }
                            />
                        </Suspense>
                    ) : null
                }
                pickerSheetProps={workspacePickerSheetProps}
                viewerOverlayProps={workspaceViewerOverlayProps}
            />

            <WorkspaceTopHeader {...workspaceTopHeaderProps} />

            <div className="relative z-10 mx-auto flex min-h-screen max-w-[1560px] flex-col px-4 pb-[50px] pt-[54px] lg:px-4 lg:pb-[54px] xl:px-3">
                <main className="mt-0 flex flex-1 flex-col gap-1.5">
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
                                focusSurface={focusSurface}
                                historySurface={historySurface}
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

                    <section data-testid="workspace-actions-composer-row" className="min-w-0">
                        <ComposerSettingsPanel
                            {...composerSettingsPanelProps}
                            imageToolsPanel={sideToolPanel}
                            onClearStyle={handleClearStyle}
                        />
                    </section>
                </main>
            </div>

            <WorkspaceBottomFooter />
        </div>
    );
};

export default App;
