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
    ResultPart,
    ThinkingLevel,
    GroundingMetadata,
    ProvenanceContinuityMode,
    StageAsset,
    ResultArtifacts,
    SessionContinuitySource,
    ViewerComposerSettingsSnapshot,
    WorkspaceSettingsDraft,
} from './types';
import ComposerAdvancedSettingsDialog from './components/ComposerAdvancedSettingsDialog';
import ComposerSettingsPanel from './components/ComposerSettingsPanel';
import PanelLoadingFallback from './components/PanelLoadingFallback';
import QueuedBatchJobsPanel from './components/QueuedBatchJobsPanel';
import SurfaceLoadingFallback from './components/SurfaceLoadingFallback';
import WorkspaceDetailModal from './components/WorkspaceDetailModal';
import WorkspaceOverlayStack from './components/WorkspaceOverlayStack';
import WorkspaceSideToolPanel from './components/WorkspaceSideToolPanel';
import WorkspaceSupportDetailSurface from './components/WorkspaceSupportDetailSurface';
import WorkspaceBottomFooter from './components/WorkspaceBottomFooter';
import WorkspaceEvidenceDetailPanel from './components/WorkspaceEvidenceDetailPanel';
import WorkspaceTopHeader from './components/WorkspaceTopHeader';
import WorkspaceUnifiedHistoryPanel from './components/WorkspaceUnifiedHistoryPanel';
import WorkspaceVersionsDetailPanel from './components/WorkspaceVersionsDetailPanel';
import WorkspaceProgressCard from './components/WorkspaceProgressCard';
import WorkspaceProgressDetailPanel from './components/WorkspaceProgressDetailPanel';
import { WorkspaceFloatingLayerContext } from './components/WorkspaceFloatingLayerContext';
import { resolveStyleLabel } from './utils/styleRegistry';
import {
    Language,
    ensureLanguageLoaded,
    getTranslation,
    isLanguageLoaded,
    persistLanguagePreference,
    resolvePreferredLanguage,
} from './utils/translations';
import { ASPECT_RATIOS, IMAGE_MODELS, MODEL_CAPABILITIES, OUTPUT_FORMATS, THINKING_LEVELS } from './constants';
import { buildStageErrorState } from './utils/generationFailure';
import {
    clearSharedWorkspaceSnapshot,
    EMPTY_WORKSPACE_COMPOSER_STATE,
    EMPTY_WORKSPACE_SNAPSHOT,
    EMPTY_WORKSPACE_SESSION,
    loadWorkspaceSnapshot,
    saveWorkspaceSnapshot,
} from './utils/workspacePersistence';
import { loadQueuedBatchSpaceSnapshot } from './utils/queuedBatchSpacePersistence';
import { hasRestorableWorkspaceContent } from './utils/workspaceSnapshotState';
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
import { GenerationLiveProgressEvent } from './services/geminiService';
import { LiveProgressStreamTruthSummary } from './utils/liveProgressCapabilities';
import { usePromptTools } from './hooks/usePromptTools';
import { useComposerState } from './hooks/useComposerState';
import { useGroundingProvenanceView } from './hooks/useGroundingProvenanceView';
import { useGroundingProvenancePanelProps } from './hooks/useGroundingProvenancePanelProps';
import { useHistoryPresentationHelpers } from './hooks/useHistoryPresentationHelpers';
import { useHistorySourceOrchestration } from './hooks/useHistorySourceOrchestration';
import { useImportedWorkspaceReview } from './hooks/useImportedWorkspaceReview';
import { useDocumentThemeMode } from './hooks/useDocumentThemeMode';
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
import { useQueuedBatchSpacePersistence } from './hooks/useQueuedBatchSpacePersistence';
import { useWorkspaceSnapshotPersistence } from './hooks/useWorkspaceSnapshotPersistence';
import { useWorkspaceSnapshotActions } from './hooks/useWorkspaceSnapshotActions';
import { useWorkspaceSurfaceState } from './hooks/useWorkspaceSurfaceState';
import { useQueuedBatchWorkflow } from './hooks/useQueuedBatchWorkflow';
import { useQueuedBatchPresentation } from './hooks/useQueuedBatchPresentation';
import { useWorkspaceGenerationContext } from './hooks/useWorkspaceGenerationContext';
import { useWorkspaceShellUtilities } from './hooks/useWorkspaceShellUtilities';
import { useWorkspaceTransientUiState } from './hooks/useWorkspaceTransientUiState';
import { useLegacyWorkspaceSnapshotMigration } from './hooks/useLegacyWorkspaceSnapshotMigration';
import { resolveCurrentStageSelectionFirstSourceOverride } from './utils/generationSourceOverride';
import { buildSavedImageLoadUrl, loadImageMetadata } from './utils/imageSaveUtils';
import {
    createImageSidecarMetadataState,
    getImageSidecarMetadataState,
    isPersistedImageSidecarMetadata,
    normalizeImageSidecarMetadata,
} from './utils/imageSidecarMetadata';
import { buildViewerComposerSettingsSnapshot } from './utils/viewerComposerSettings';

const ImageEditor = lazy(() => import('./components/ImageEditor'));
const GeneratedImage = lazy(() => import('./components/GeneratedImage'));
const WorkspaceHealthPanel = lazy(() => import('./components/WorkspaceHealthPanel'));
const GroundingProvenancePanel = lazy(() => import('./components/GroundingProvenancePanel'));
const SketchPad = lazy(() => import('./components/SketchPad'));
const getShortTurnId = (historyId?: string | null) => (historyId ? historyId.slice(0, 8) : '--------');

type ProgressThoughtEntry = {
    id: string;
    shortId: string;
    prompt: string | null;
    thoughts: string;
    resultParts: ResultPart[];
    createdAtLabel: string;
    createdAtMs: number | null;
    slotIndex?: number;
    slotLabel?: string;
    isLive?: boolean;
    isFailed?: boolean;
};

type ActiveLiveProgressSlot = {
    slotIndex: number;
    sessionId: string;
    startedAtMs: number;
    resultParts: ResultPart[];
    summary: LiveProgressStreamTruthSummary | null;
};

type ActiveLiveProgressSession = {
    batchSessionId: string;
    startedAtMs: number;
    slots: Record<number, ActiveLiveProgressSlot>;
};

const isThoughtResultPart = (part: ResultPart) => part.kind === 'thought-text' || part.kind === 'thought-image';

const buildResultPartIdentityKey = (part: ResultPart) =>
    part.kind === 'thought-text' || part.kind === 'output-text'
        ? `${part.kind}:${part.sequence}:${part.text}`
        : `${part.kind}:${part.sequence}:${part.mimeType}:${part.imageUrl}`;

const getThoughtResultParts = (parts?: ResultPart[] | null): ResultPart[] =>
    (parts || []).filter(isThoughtResultPart).sort((left, right) => left.sequence - right.sequence);

const buildThoughtSummaryFromParts = (parts: ResultPart[], fallbackLabel: string) => {
    const text = parts
        .map((part) => (part.kind === 'thought-text' ? part.text.trim() : ''))
        .filter(Boolean)
        .join('\n\n');

    if (text) {
        return text;
    }

    return parts.some((part) => part.kind === 'thought-image') ? fallbackLabel : '';
};

const areWorkspaceSettingsDraftsEqual = (left: WorkspaceSettingsDraft, right: WorkspaceSettingsDraft) =>
    left.imageModel === right.imageModel &&
    left.aspectRatio === right.aspectRatio &&
    left.imageSize === right.imageSize &&
    left.batchSize === right.batchSize &&
    left.outputFormat === right.outputFormat &&
    left.temperature === right.temperature &&
    left.thinkingLevel === right.thinkingLevel &&
    left.groundingMode === right.groundingMode;

const TopLauncherSignal = ({ active, dataTestId }: { active: boolean; dataTestId: string }) => {
    const activeOuterClassName =
        'bg-amber-300/60 shadow-[0_0_18px_rgba(251,191,36,0.52)] dark:bg-amber-300/40 dark:shadow-[0_0_20px_rgba(251,191,36,0.36)]';
    const activeInnerClassName = 'bg-amber-400 ring-2 ring-amber-100/90 dark:bg-amber-300 dark:ring-amber-400/30';
    const inactiveOuterClassName =
        'bg-slate-200/65 ring-1 ring-slate-500/15 shadow-inner shadow-slate-400/20 opacity-95 dark:bg-slate-700/40 dark:ring-slate-400/20 dark:shadow-black/20';
    const inactiveInnerClassName = 'bg-slate-500/70 dark:bg-slate-400/70';

    return (
        <span
            data-testid={dataTestId}
            aria-hidden="true"
            className="relative inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center"
        >
            <span
                className={`absolute inset-0 rounded-full transition-all duration-300 ${
                    active ? `${activeOuterClassName} animate-pulse opacity-100` : inactiveOuterClassName
                }`}
            />
            <span
                className={`relative h-1.5 w-1.5 rounded-full transition-all duration-300 ${
                    active ? activeInnerClassName : inactiveInnerClassName
                }`}
            />
        </span>
    );
};

const App: React.FC = () => {
    const [initialWorkspaceSnapshot] = useState(() => loadWorkspaceSnapshot());
    const [initialQueuedBatchSpaceSnapshot] = useState(() =>
        loadQueuedBatchSpaceSnapshot({
            legacyQueuedJobs: initialWorkspaceSnapshot.queuedJobs,
        }),
    );
    const initialActiveResult = initialWorkspaceSnapshot.workspaceSession.activeResult;
    const initialComposerState = initialWorkspaceSnapshot.composerState || EMPTY_WORKSPACE_COMPOSER_STATE;
    const [apiKeyReady, setApiKeyReady] = useState(false);
    const isDarkTheme = useDocumentThemeMode();
    const [currentLang, setCurrentLang] = useState<Language>(() => {
        const preferredLanguage = resolvePreferredLanguage();
        return isLanguageLoaded(preferredLanguage) ? preferredLanguage : 'en';
    });
    const [areInitialPreferencesReady, setAreInitialPreferencesReady] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editorMode, setEditorMode] = useState<EditorMode>('inpaint');
    const [editorRetouchLockedRatio, setEditorRetouchLockedRatio] = useState<AspectRatio | null>(null);
    const [surfaceSharedControlsBottom, setSurfaceSharedControlsBottom] = useState<number | null>(null);
    const [settingsSessionDraft, setSettingsSessionDraft] = useState<WorkspaceSettingsDraft | null>(null);
    const [settingsSessionReturnToGeneration, setSettingsSessionReturnToGeneration] = useState(false);
    const [activeWorkspaceDetailModal, setActiveWorkspaceDetailModal] = useState<
        'progress' | 'sources' | 'versions' | null
    >(null);
    const [isQueuedBatchSpaceOpen, setIsQueuedBatchSpaceOpen] = useState(false);
    const [editingImageSource, setEditingImageSource] = useState<string | null>(null);
    const [batchProgress, setBatchProgress] = useState({ completed: 0, total: 0 });
    const [activeBatchPreviewSession, setActiveBatchPreviewSession] = useState<BatchPreviewSession | null>(null);
    const [activeLiveProgressSession, setActiveLiveProgressSession] = useState<ActiveLiveProgressSession | null>(null);
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
    const languageChangeRequestRef = useRef(0);
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
        stickySendIntent,
        setStickySendIntent,
        composerState,
        applyComposerState,
        applyViewerComposerSettingsSnapshot,
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
        selectedResultText,
        selectedThoughts,
        selectedResultParts,
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
    const isSharedControlsSurfaceOpen = isEditing || isSketchPadOpen;

    const handleLanguageChange = useCallback(
        (nextLanguage: Language) => {
            if (nextLanguage === currentLang) {
                return;
            }

            persistLanguagePreference(nextLanguage);
            const requestId = languageChangeRequestRef.current + 1;
            languageChangeRequestRef.current = requestId;

            if (isLanguageLoaded(nextLanguage)) {
                setCurrentLang(nextLanguage);
                return;
            }

            void ensureLanguageLoaded(nextLanguage)
                .then(() => {
                    if (languageChangeRequestRef.current !== requestId) {
                        return;
                    }

                    setCurrentLang(nextLanguage);
                })
                .catch((error) => {
                    if (languageChangeRequestRef.current === requestId) {
                        persistLanguagePreference(currentLang);
                    }

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
            return resolveStyleLabel(style, t);
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
            applySelectedResultArtifacts(buildResultArtifacts(item));
            setError(buildStageErrorState(t, item.failure, item.error || t('statusFailed'), item.failureContext));
            clearAssetRoles(['stage-source']);
        },
        [
            applySelectedResultArtifacts,
            buildResultArtifacts,
            clearAssetRoles,
            setError,
            setGeneratedImageUrls,
            setSelectedHistoryId,
            setSelectedImageIndex,
            t,
        ],
    );

    useEffect(() => {
        setError((currentError) => {
            if (!currentError) {
                return currentError;
            }

            const candidateHistoryId = currentStageAsset?.sourceHistoryId || selectedHistoryId;
            const candidateHistoryItem = candidateHistoryId ? getHistoryTurnById(candidateHistoryId) : null;
            if (candidateHistoryItem?.status === 'failed') {
                return buildStageErrorState(
                    t,
                    candidateHistoryItem.failure,
                    candidateHistoryItem.error || t('statusFailed'),
                    candidateHistoryItem.failureContext,
                );
            }

            return buildStageErrorState(t, currentError.failure, currentError.rawError, currentError.displayContext);
        });
    }, [currentStageAsset?.sourceHistoryId, getHistoryTurnById, selectedHistoryId, setError, t]);

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
            ? normalizeImageSidecarMetadata(metadata)
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
                metadata
                    ? normalizeImageSidecarMetadata(
                          currentViewedCompletedHistoryMetadata
                              ? { ...currentViewedCompletedHistoryMetadata, ...metadata }
                              : metadata,
                      )
                    : null;

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

    const handleLiveProgressReset = useCallback(() => {
        setActiveLiveProgressSession(null);
    }, []);

    const handleLiveProgressEvent = useCallback((event: GenerationLiveProgressEvent) => {
        const batchSessionId = event.batchSessionId || event.sessionId;
        const slotIndex = event.slotIndex ?? 0;

        setActiveLiveProgressSession((previousSession) => {
            const nextSession =
                previousSession && previousSession.batchSessionId === batchSessionId
                    ? previousSession
                    : {
                          batchSessionId,
                          startedAtMs: Date.now(),
                          slots: {},
                      };

            if (event.type === 'start') {
                return {
                    ...nextSession,
                    slots: {
                        ...nextSession.slots,
                        [slotIndex]: {
                            slotIndex,
                            sessionId: event.sessionId,
                            startedAtMs: Date.now(),
                            resultParts: [],
                            summary: null,
                        },
                    },
                };
            }

            const previousSlot = nextSession.slots[slotIndex];
            const nextSlot =
                previousSlot && previousSlot.sessionId === event.sessionId
                    ? previousSlot
                    : {
                          slotIndex,
                          sessionId: event.sessionId,
                          startedAtMs: previousSlot?.startedAtMs ?? Date.now(),
                          resultParts: previousSlot?.resultParts || [],
                          summary: previousSlot?.summary || null,
                      };

            if (event.type === 'summary') {
                return {
                    ...nextSession,
                    slots: {
                        ...nextSession.slots,
                        [slotIndex]: {
                            ...nextSlot,
                            summary: event.summary,
                        },
                    },
                };
            }
            const partKey = buildResultPartIdentityKey(event.part);
            const alreadyIncluded = nextSlot.resultParts.some(
                (candidate) => buildResultPartIdentityKey(candidate) === partKey,
            );

            if (alreadyIncluded) {
                return nextSession;
            }

            return {
                ...nextSession,
                slots: {
                    ...nextSession.slots,
                    [slotIndex]: {
                        ...nextSlot,
                        resultParts: [...nextSlot.resultParts, event.part].sort(
                            (left, right) => left.sequence - right.sequence,
                        ),
                    },
                },
            };
        });
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

            if (getGroundingFlagsFromMode(nextGroundingMode).imageSearch) {
                nextOutputFormat = 'images-and-text';
            }

            return {
                ...draft,
                imageModel: nextImageModel,
                aspectRatio: nextAspectRatio,
                imageSize: nextImageSize,
                outputFormat: nextOutputFormat,
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
        t,
    ]);
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
        stickySendIntent,
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
    const currentSourceHistoryId = useMemo(
        () =>
            resolveCurrentStageSelectionFirstSourceOverride({
                sourceHistoryId: currentStageAsset?.sourceHistoryId || null,
                currentStageLineageAction: currentStageAsset?.lineageAction || null,
                history,
                branchOriginIdByTurnId,
                workspaceSessionSourceHistoryId: workspaceSession.sourceHistoryId,
                workspaceSessionSourceLineageAction: workspaceSession.sourceLineageAction || null,
            }).sourceHistoryId,
        [
            branchOriginIdByTurnId,
            currentStageAsset?.lineageAction,
            currentStageAsset?.sourceHistoryId,
            history,
            workspaceSession.sourceHistoryId,
            workspaceSession.sourceLineageAction,
        ],
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
        getGenerationLineageContext,
        getConversationRequestContext,
        onBatchPreviewStart: handleBatchPreviewStart,
        onBatchPreviewTileUpdate: handleBatchPreviewTileUpdate,
        onBatchPreviewComplete: handleBatchPreviewComplete,
        onBatchPreviewClear: handleBatchPreviewClear,
        onLiveProgressEvent: handleLiveProgressEvent,
        onLiveProgressReset: handleLiveProgressReset,
    });

    const {
        isEnhancingPrompt: isEnhancingComposerPrompt,
        activePromptTool: activeComposerPromptTool,
        handleSmartRewrite: handleComposerSmartRewrite,
        handleSurpriseMe: handleComposerSurpriseMe,
        handleImageToPrompt: handleComposerImageToPrompt,
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
        thinkingLevel,
        includeThoughts,
        googleSearch,
        imageSearch,
        setImageSize,
        setAspectRatio,
        setOutputFormat,
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
        isSurfaceWorkspaceOpen: isSharedControlsSurfaceOpen,
        prompt,
        aspectRatio,
        imageSize,
        imageStyle,
        imageModel,
        history,
        branchOriginIdByTurnId,
        workspaceSessionSourceHistoryId: workspaceSession.sourceHistoryId,
        workspaceSessionSourceLineageAction: workspaceSession.sourceLineageAction,
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
        canQueueComposerBatch,
        showEditorQueueBatch,
        isQueueBatchDisabled,
        queueBatchDisabledReason,
        editorQueueDisabledReason,
        queueBatchModeSummary,
        queueBatchConversationNotice,
        getImportedQueuedHistoryItems,
        getImportedQueuedResultCount,
        getQueuedBatchPositionLabel,
    } = useQueuedBatchPresentation({
        currentStageAsset,
        objectImageCount: objectImages.length,
        characterImageCount: characterImages.length,
        stickySendIntent,
        workspaceSession,
        conversationState,
        history,
        t,
    });
    const {
        queuedJobs,
        setQueuedJobs,
        handleQueueBatchJob,
        handleQueueBatchJobFromEditor,
        handlePollQueuedJob,
        handlePollAllQueuedJobs,
        handleCancelQueuedJob,
        handleImportQueuedJob,
        handleImportAllQueuedJobs,
        handleOpenImportedQueuedJob,
        handleOpenLatestImportedQueuedJob,
        handleOpenImportedQueuedHistoryItem,
        handleClearIssueQueuedJobs,
        handleClearImportedQueuedJobs,
        handleRemoveQueuedJob,
    } = useQueuedBatchWorkflow({
        initialQueuedJobs: initialQueuedBatchSpaceSnapshot.queuedJobs,
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
        temperature,
        thinkingLevel,
        includeThoughts,
        googleSearch,
        imageSearch,
        currentStageAsset,
        branchOriginIdByTurnId,
        workspaceSessionSourceHistoryId: workspaceSession.sourceHistoryId,
        workspaceSessionSourceLineageAction: workspaceSession.sourceLineageAction,
        objectImages,
        characterImages,
        getModelLabel,
        getGenerationLineageContext,
        addLog,
        showNotification,
        setHistory,
        historySelectRef: queuedBatchHistorySelectRef,
        canQueueComposerBatch,
        queueBatchDisabledReason,
        canQueueEditorBatch: showEditorQueueBatch,
        editorQueueDisabledReason,
        t,
    });
    useQueuedBatchSpacePersistence({ queuedJobs, setQueuedJobs });

    const { composeCurrentWorkspaceSnapshot } = useWorkspaceSnapshotPersistence({
        history,
        stagedAssets,
        workflowLogs: logs,
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
        saveWorkspaceSnapshot(EMPTY_WORKSPACE_SNAPSHOT);
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
        history,
        branchOriginIdByTurnId,
        workspaceSessionSourceHistoryId: workspaceSession.sourceHistoryId,
        workspaceSessionSourceLineageAction: workspaceSession.sourceLineageAction,
        objectImages,
        characterImages,
        aspectRatio,
        imageSize,
        batchSize,
        imageModel,
        imageStyle,
        outputFormat,
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
    const handleOpenUploadToRepaint = useCallback(() => {
        uploadInputRef.current?.click();
    }, []);
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
    const handleClearAllReferences = useCallback(() => {
        clearAssetRoles(['object', 'character']);
    }, [clearAssetRoles]);

    const { handleClearCurrentStage, handleClearGalleryHistory } = useWorkspaceResetActions({
        lastPromotedHistoryIdRef,
        handleClearResults,
        clearAssetRoles,
        applyEmptyWorkspaceSnapshot,
        clearSharedWorkspaceSnapshot,
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
        commitPendingViewerSelection,
    } = useHistorySourceOrchestration({
        history,
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
        setStickySendIntent,
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
    const viewerPromptValue = useMemo(() => {
        const historyPrompt = currentViewedCompletedHistoryItem?.prompt?.trim();
        if (historyPrompt) {
            return historyPrompt;
        }

        const metadataPrompt = typeof selectedMetadata?.prompt === 'string' ? selectedMetadata.prompt.trim() : '';
        if (metadataPrompt) {
            return metadataPrompt;
        }

        return viewSettings.prompt;
    }, [currentViewedCompletedHistoryItem?.prompt, selectedMetadata, viewSettings.prompt]);

    useEffect(() => {
        if (!isSurfaceWorkspaceOpen) {
            setSurfaceSharedControlsBottom(null);
            return;
        }

        if (activePickerSheet === 'styles') {
            setActivePickerSheet(null);
        }
    }, [activePickerSheet, isSurfaceWorkspaceOpen, setActivePickerSheet]);

    const {
        effectiveThoughts,
        effectiveResultParts,
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
        selectedResultParts,
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
            if (sheet === 'styles') {
                return;
            }

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
            activePickerSheet,
            settingsVariant: isSketchPadOpen ? 'sketch' : 'full',
            totalReferenceCount,
            hasSurfacePrompt: Boolean((isEditing ? editorPrompt : prompt).trim()),
            imageModel,
            capability,
            availableGroundingModes,
            aspectRatio,
            imageSize,
            batchSize,
            outputFormat,
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
        setIsQueuedBatchSpaceOpen(false);
    }, []);
    const handleOpenProgressDetails = useCallback(() => {
        setIsQueuedBatchSpaceOpen(false);
        setActiveWorkspaceDetailModal('progress');
    }, []);
    const [workspaceFloatingHostElement, setWorkspaceFloatingHostElement] = useState<HTMLDivElement | null>(null);
    const workspaceFloatingLayerValue = useMemo(
        () => ({
            floatingZIndex: floatingControlsZIndex + 1,
            hostElement: workspaceFloatingHostElement,
        }),
        [floatingControlsZIndex, workspaceFloatingHostElement],
    );
    const handleOpenSourcesDetails = useCallback(() => {
        setIsQueuedBatchSpaceOpen(false);
        setActiveWorkspaceDetailModal('sources');
    }, []);
    const handleOpenVersionsDetails = useCallback(() => {
        setIsQueuedBatchSpaceOpen(false);
        setActiveWorkspaceDetailModal('versions');
    }, []);
    const handleOpenQueuedBatchJobs = useCallback(() => {
        setActiveWorkspaceDetailModal(null);
        setIsQueuedBatchSpaceOpen(true);
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
        activePromptTool: activeComposerPromptTool,
        currentLanguage: currentLang,
        imageStyleLabel: getStyleLabel(imageStyle),
        outputFormat,
        thinkingLevel,
        includeThoughts,
        groundingMode,
        stickySendIntent,
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
        isQueueBatchDisabled,
        queueBatchDisabledReason,
        queueBatchModeSummary,
        queueBatchConversationNotice,
        getImportedQueuedResultCount,
        getImportedQueuedHistoryItems,
        activeImportedQueuedHistoryId: currentStageSourceHistoryId,
        promptTextareaRef: composerPromptTextareaRef,
        setPrompt,
        setStickySendIntent,
        toggleEnterToSubmit,
        handleGenerate,
        handleQueueBatchJob,
        handleOpenQueuedBatchJobs,
        handleCancelGeneration,
        handleStartNewConversation,
        handleFollowUpGenerate,
        handleSurpriseMe: handleComposerSurpriseMe,
        handleSmartRewrite: handleComposerSmartRewrite,
        handleImageToPrompt: handleComposerImageToPrompt,
        openSettings: openGenerationSettingsSession,
        openAdvancedSettings: openAdvancedSettingsSession,
        setActivePickerSheet,
        setIsAdvancedSettingsOpen,
        setOutputFormat,
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
    const focusComposerPromptTextarea = useCallback(
        ({ delayFrames = 1, ensureVisible = false }: { delayFrames?: number; ensureVisible?: boolean } = {}) => {
            if (typeof window === 'undefined') {
                return;
            }

            const normalizedDelayFrames = Math.max(1, delayFrames);
            const focusTextarea = () => {
                const textarea = composerPromptTextareaRef.current;
                if (!textarea) {
                    return;
                }

                if (ensureVisible) {
                    try {
                        textarea.scrollIntoView({ block: 'center', inline: 'nearest' });
                    } catch {
                        textarea.scrollIntoView();
                    }
                }

                try {
                    textarea.focus({ preventScroll: false });
                } catch {
                    textarea.focus();
                }

                const cursorIndex = textarea.value.length;
                textarea.setSelectionRange(cursorIndex, cursorIndex);
            };

            const queueFocus = (remainingFrames: number) => {
                window.requestAnimationFrame(() => {
                    if (remainingFrames > 1) {
                        queueFocus(remainingFrames - 1);
                        return;
                    }

                    focusTextarea();
                });
            };

            queueFocus(normalizedDelayFrames);
        },
        [],
    );
    const replaceComposerPromptText = useCallback(
        (value: string, noticeKey: string, focusOptions?: { delayFrames?: number; ensureVisible?: boolean }) => {
            const normalizedValue = value.trim();
            if (!normalizedValue) {
                return;
            }

            setPrompt(normalizedValue);
            showNotification(t(noticeKey), 'info');
            focusComposerPromptTextarea(focusOptions);
        },
        [focusComposerPromptTextarea, setPrompt, showNotification, t],
    );
    const handleApplyPromptFromViewer = useCallback(
        (value: string) => {
            replaceComposerPromptText(value, 'workspaceViewerPromptAppliedNotice', {
                delayFrames: 2,
                ensureVisible: true,
            });
        },
        [replaceComposerPromptText],
    );
    const handleApplySettingsFromViewer = useCallback(
        (snapshot: ViewerComposerSettingsSnapshot) => {
            applyViewerComposerSettingsSnapshot(snapshot);
            showNotification(t('workspaceViewerSettingsAppliedNotice'), 'info');
            focusComposerPromptTextarea({
                delayFrames: 2,
                ensureVisible: true,
            });
        },
        [applyViewerComposerSettingsSnapshot, focusComposerPromptTextarea, showNotification, t],
    );
    const getOutputFormatSummaryLabel = useCallback(
        (value: string) => OUTPUT_FORMATS.find((option) => option.value === value)?.label ?? value,
        [],
    );
    const getThinkingLevelSummaryLabel = useCallback(
        (value: string) =>
            THINKING_LEVELS.find((option) => option.value === value)?.label ??
            (value === 'disabled' ? 'Disabled' : value),
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
    const viewerSettingsMetadata = useMemo(() => {
        if (!currentViewedCompletedHistoryMetadata && !viewerHasPersistedSidecarMetadata) {
            return null;
        }

        return normalizeImageSidecarMetadata({
            ...(currentViewedCompletedHistoryMetadata || {}),
            ...(viewerHasPersistedSidecarMetadata ? (selectedMetadata as Record<string, unknown>) : {}),
        });
    }, [currentViewedCompletedHistoryMetadata, selectedMetadata, viewerHasPersistedSidecarMetadata]);
    const viewerSettingsSnapshot = useMemo(
        () => buildViewerComposerSettingsSnapshot(currentViewedCompletedHistoryItem, viewerSettingsMetadata),
        [currentViewedCompletedHistoryItem, viewerSettingsMetadata],
    );
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
    const viewerMetadataModel =
        viewerSettingsMetadata?.model === 'gemini-3.1-flash-image-preview' ||
        viewerSettingsMetadata?.model === 'gemini-3-pro-image-preview' ||
        viewerSettingsMetadata?.model === 'gemini-2.5-flash-image'
            ? viewerSettingsMetadata.model
            : currentViewedCompletedHistoryItem?.model || viewSettings.model;
    const viewerMetadataModelSupportsSizeControl = MODEL_CAPABILITIES[viewerMetadataModel].supportedSizes.length > 0;
    const viewerMetadataSize = resolveViewerMetadataValue(
        typeof viewerSettingsMetadata?.size === 'string'
            ? viewerSettingsMetadata.size
            : viewerMetadataModelSupportsSizeControl && typeof viewerSettingsMetadata?.requestedImageSize === 'string'
              ? viewerSettingsMetadata.requestedImageSize
              : null,
        viewerMetadataModelSupportsSizeControl ? viewSettings.size : viewerMetadataUnavailableLabel,
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
    const currentStageIsCurrentSource = Boolean(
        generatedImageUrls.length > 0 &&
        (!currentStageHasLinkedHistoryTurn ||
            (currentStageSourceHistoryId && currentStageSourceHistoryId === currentSourceHistoryId)),
    );
    const currentStageOriginLabel = currentStageAsset
        ? getStageOriginLabel(currentStageAsset.origin)
        : generatedImageUrls.length > 0
          ? getStageOriginLabel('generated')
          : null;
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
    const handleViewerSelectHistoryItem = useCallback(
        (historyId: string) => {
            const historyItem = getHistoryTurnById(historyId);
            if (historyItem) {
                handleHistorySelect(historyItem, { deferLineageCommit: true });
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
        prompt: viewerPromptValue,
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
        currentLanguage: currentLang,
        currentLog: logs.length > 0 ? logs[logs.length - 1] : '',
        currentStageOriginLabel,
        currentStageBranchLabel: currentStageLinkedBranchSummary?.branchLabel || null,
        currentStageHasLinkedHistoryTurn,
        currentStageIsCurrentSource,
        currentStageContinuationDiffers,
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
        openStylesSheet: () => {
            if (!isEditing) {
                setActivePickerSheet('styles');
            }
        },
        openReferencesSheet: () => setActivePickerSheet('references'),
        openAdvancedSettings: openAdvancedSettingsFromGeneration,
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
                selectedHistoryId={selectedHistoryId}
                currentSourceHistoryId={currentSourceHistoryId}
                activeBranchSummary={activeBranchSummary}
                branchSummariesCount={branchSummaries.length}
                onSelect={handleHistorySelect}
                getBranchAccentClassName={getBranchAccentClassName}
                onOpenVersionsDetails={handleOpenVersionsDetails}
                onImportWorkspace={handleOpenWorkspaceImportPicker}
                onExportWorkspace={handleExportWorkspaceSnapshot}
                onClearWorkspace={handleClearGalleryHistory}
            />
        ),
        [
            activeBranchSummary,
            activeBatchPreviewSession?.tiles,
            branchSummaries.length,
            currentSourceHistoryId,
            currentLang,
            getBranchAccentClassName,
            handleExportWorkspaceSnapshot,
            handleClearGalleryHistory,
            handleHistorySelect,
            handleOpenVersionsDetails,
            handleOpenWorkspaceImportPicker,
            history,
            selectedHistoryId,
        ],
    );
    const stagePanelClassName =
        'min-w-0 nbu-shell-panel nbu-shell-surface-stage-hero min-h-[400px] overflow-hidden p-3 lg:min-h-0 xl:flex-1';
    const topLauncherCompactButtonClassName =
        'group nbu-shell-panel flex h-[40px] min-h-[40px] min-w-0 w-full items-center justify-center px-2.5 py-2 text-center transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,23,42,0.12)] dark:hover:shadow-[0_18px_40px_rgba(2,6,23,0.38)]';
    const topLauncherCompactLabelClassName =
        'whitespace-nowrap text-[9px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400 sm:text-[10px]';
    const supportDetailTabButtonClassName =
        'rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors';
    const effectiveThoughtParts = useMemo(() => getThoughtResultParts(effectiveResultParts), [effectiveResultParts]);
    const selectedProgressHistoryItem = useMemo(
        () => (selectedHistoryId ? getHistoryTurnById(selectedHistoryId) : null),
        [getHistoryTurnById, selectedHistoryId],
    );
    const selectedProgressThoughtParts = useMemo(() => {
        const selectedThoughtParts = getThoughtResultParts(selectedResultParts);

        if (selectedThoughtParts.length > 0) {
            return selectedThoughtParts;
        }

        return getThoughtResultParts(selectedProgressHistoryItem?.resultParts);
    }, [selectedProgressHistoryItem, selectedResultParts]);
    const selectedProgressThoughtsText = useMemo(() => {
        const trimmedSelectedThoughts = selectedThoughts?.trim();
        if (trimmedSelectedThoughts) {
            return trimmedSelectedThoughts;
        }

        const trimmedHistoryThoughts = selectedProgressHistoryItem?.thoughts?.trim();
        if (trimmedHistoryThoughts) {
            return trimmedHistoryThoughts;
        }

        return buildThoughtSummaryFromParts(selectedProgressThoughtParts, t('workspaceViewerThoughts'));
    }, [selectedProgressHistoryItem, selectedProgressThoughtParts, selectedThoughts, t]);
    const selectedProgressEntry = useMemo<ProgressThoughtEntry | null>(() => {
        if (!selectedProgressHistoryItem) {
            return null;
        }

        if (!selectedProgressThoughtsText && selectedProgressThoughtParts.length === 0) {
            return null;
        }

        const createdAtMs = selectedProgressHistoryItem.createdAt ?? workspaceSession.updatedAt ?? null;

        return {
            id: selectedProgressHistoryItem.id,
            shortId: getShortTurnId(selectedProgressHistoryItem.id),
            prompt: selectedProgressHistoryItem.prompt || null,
            thoughts: selectedProgressThoughtsText,
            resultParts: selectedProgressThoughtParts,
            createdAtMs,
            createdAtLabel:
                createdAtMs != null
                    ? new Date(createdAtMs).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                      })
                    : sessionUpdatedLabel,
            isFailed: selectedProgressHistoryItem.status === 'failed',
        } satisfies ProgressThoughtEntry;
    }, [
        selectedProgressHistoryItem,
        selectedProgressThoughtParts,
        selectedProgressThoughtsText,
        sessionUpdatedLabel,
        workspaceSession.updatedAt,
    ]);
    const liveProgressThoughtEntries = useMemo<ProgressThoughtEntry[]>(() => {
        if (!isGenerating || !activeLiveProgressSession) {
            return [];
        }

        return Object.values(activeLiveProgressSession.slots)
            .map((slot) => {
                const slotThoughtParts = getThoughtResultParts(slot.resultParts);
                if (slotThoughtParts.length === 0) {
                    return null;
                }

                return {
                    id: `live-${activeLiveProgressSession.batchSessionId}-${slot.slotIndex}`,
                    shortId: `slot-${String(slot.slotIndex + 1).padStart(2, '0')}`,
                    prompt: prompt || null,
                    thoughts:
                        buildThoughtSummaryFromParts(slotThoughtParts, t('workspaceViewerThoughts')) ||
                        t('workspaceViewerThoughts'),
                    resultParts: slotThoughtParts,
                    createdAtMs: slot.startedAtMs,
                    createdAtLabel: new Date(slot.startedAtMs).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                    }),
                    slotIndex: slot.slotIndex,
                    slotLabel: `#${slot.slotIndex + 1}`,
                    isLive: true,
                } satisfies ProgressThoughtEntry;
            })
            .filter((entry): entry is ProgressThoughtEntry => Boolean(entry));
    }, [activeLiveProgressSession, isGenerating, prompt, t]);
    const liveProgressThoughtsText = useMemo(
        () => liveProgressThoughtEntries[0]?.thoughts || '',
        [liveProgressThoughtEntries],
    );
    const effectiveProgressThoughtsText = useMemo(() => {
        const trimmedEffectiveThoughts = effectiveThoughts?.trim();
        if (trimmedEffectiveThoughts) {
            return trimmedEffectiveThoughts;
        }

        return buildThoughtSummaryFromParts(effectiveThoughtParts, t('workspaceViewerThoughts'));
    }, [effectiveThoughtParts, effectiveThoughts, t]);
    const progressThoughtsSummaryText = useMemo(
        () => liveProgressThoughtsText || selectedProgressThoughtsText || effectiveProgressThoughtsText,
        [effectiveProgressThoughtsText, liveProgressThoughtsText, selectedProgressThoughtsText],
    );
    const progressHistoryThoughtTurns = useMemo<GeneratedImageType[]>(() => {
        const hasThoughtArtifacts = (turn: GeneratedImageType) =>
            Boolean(turn.thoughts?.trim()) || getThoughtResultParts(turn.resultParts).length > 0;

        const relevantHistoryTurns =
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
        const failedThoughtTurns = history.filter((turn) => turn.status === 'failed' && hasThoughtArtifacts(turn));

        return [...relevantHistoryTurns, ...failedThoughtTurns]
            .filter(hasThoughtArtifacts)
            .filter((turn, index, turns) => turns.findIndex((candidate) => candidate.id === turn.id) === index)
            .sort(
                (left, right) =>
                    (right.createdAt ?? Number.MIN_SAFE_INTEGER) - (left.createdAt ?? Number.MIN_SAFE_INTEGER),
            );
    }, [
        activeBranchSummary,
        currentStageBranchSummary,
        currentStageSourceTurn,
        getHistoryTurnById,
        history,
        workspaceSession.conversationTurnIds,
    ]);
    const hasProgressActivity = Boolean(
        liveProgressThoughtEntries.length > 0 ||
        selectedProgressEntry ||
        progressHistoryThoughtTurns.length > 0 ||
        effectiveProgressThoughtsText ||
        effectiveThoughtParts.length > 0,
    );
    const hasSourceTrailInfo = Boolean(
        groundingQueries.length > 0 ||
        selectedSources.length > 0 ||
        selectedSupportBundles.length > 0 ||
        Boolean(searchEntryPointRenderedContent?.trim()) ||
        effectiveSessionHints?.groundingMetadataReturned ||
        effectiveSessionHints?.groundingSupportsReturned,
    );
    const supportRail = (
        <>
            <WorkspaceProgressCard
                currentLanguage={currentLang}
                thoughtsText={progressThoughtsSummaryText}
                hasThoughtArtifacts={hasProgressActivity}
                onOpenDetails={handleOpenProgressDetails}
            />
            <button
                type="button"
                data-testid="workspace-sources-open-details"
                onClick={handleOpenSourcesDetails}
                className={`${topLauncherCompactButtonClassName} nbu-shell-surface-provenance-summary hover:border-sky-300 dark:hover:border-sky-500/30`}
            >
                <span className="flex min-w-0 items-center gap-2">
                    <TopLauncherSignal active={hasSourceTrailInfo} dataTestId="workspace-sources-signal" />
                    <span className={topLauncherCompactLabelClassName}>{t('workspaceSupportSources')}</span>
                </span>
            </button>
        </>
    );
    const workspaceTopHeaderProps = useWorkspaceTopHeaderProps({
        headerConsole,
        currentLanguage: currentLang,
        onLanguageChange: handleLanguageChange,
        supportRail,
    });
    const progressThoughtEntries = useMemo<ProgressThoughtEntry[]>(() => {
        const mapTurnToThoughtEntry = (turn: GeneratedImageType): ProgressThoughtEntry => {
            const turnThoughtParts = getThoughtResultParts(turn.resultParts);

            return {
                id: turn.id,
                shortId: getShortTurnId(turn.id),
                prompt: turn.prompt || null,
                thoughts:
                    turn.thoughts?.trim() ||
                    buildThoughtSummaryFromParts(turnThoughtParts, t('workspaceViewerThoughts')),
                resultParts: turnThoughtParts,
                createdAtMs: turn.createdAt,
                createdAtLabel: new Date(turn.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                }),
                isFailed: turn.status === 'failed',
            };
        };
        const dedupeEntriesById = (entries: ProgressThoughtEntry[]) =>
            entries.filter(
                (entry, index, allEntries) => allEntries.findIndex((candidate) => candidate.id === entry.id) === index,
            );
        const mergeWithLiveEntries = (entries: ProgressThoughtEntry[]) => {
            const archivedEntries = dedupeEntriesById(entries);

            if (liveProgressThoughtEntries.length === 0) {
                return archivedEntries;
            }

            const liveEntryIds = new Set(liveProgressThoughtEntries.map((entry) => entry.id));
            return [...liveProgressThoughtEntries, ...archivedEntries.filter((entry) => !liveEntryIds.has(entry.id))];
        };

        const archivedThoughtEntries = dedupeEntriesById([
            ...(selectedProgressEntry ? [selectedProgressEntry] : []),
            ...progressHistoryThoughtTurns.map(mapTurnToThoughtEntry),
        ]).sort((left, right) => {
            const leftMs = left.createdAtMs ?? Number.MIN_SAFE_INTEGER;
            const rightMs = right.createdAtMs ?? Number.MIN_SAFE_INTEGER;

            return rightMs - leftMs;
        });

        if (archivedThoughtEntries.length > 0) {
            return mergeWithLiveEntries(archivedThoughtEntries);
        }

        if (!effectiveProgressThoughtsText && effectiveThoughtParts.length === 0) {
            return mergeWithLiveEntries([]);
        }

        return mergeWithLiveEntries([
            {
                id: currentStageSourceTurn?.id || workspaceSession.sourceHistoryId || 'active-session',
                shortId: getShortTurnId(currentStageSourceTurn?.id || workspaceSession.sourceHistoryId),
                prompt: prompt || null,
                thoughts: effectiveProgressThoughtsText,
                resultParts: effectiveThoughtParts,
                createdAtMs: workspaceSession.updatedAt || null,
                createdAtLabel: sessionUpdatedLabel,
            },
        ]);
    }, [
        currentStageSourceTurn,
        effectiveProgressThoughtsText,
        effectiveThoughtParts,
        liveProgressThoughtEntries,
        prompt,
        progressHistoryThoughtTurns,
        selectedProgressEntry,
        sessionUpdatedLabel,
        t,
        workspaceSession.sourceHistoryId,
        workspaceSession.updatedAt,
    ]);
    const canRepaintCurrentImage = Boolean(getActiveImageUrl());
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
                maxObjects={capability.maxObjects}
                maxCharacters={capability.maxCharacters}
                setObjectImages={setObjectImages}
                setCharacterImages={setCharacterImages}
                isGenerating={isGenerating}
                showNotification={showNotification}
                handleRemoveObjectReference={handleRemoveObjectReference}
                handleRemoveCharacterReference={handleRemoveCharacterReference}
                handleClearAllReferences={handleClearAllReferences}
            />
        ),
        [
            handleClearAllReferences,
            canRepaintCurrentImage,
            capability.maxCharacters,
            capability.maxObjects,
            characterImages,
            currentLang,
            handleOpenEditor,
            handleOpenSketchPad,
            handleOpenUploadToRepaint,
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
            currentStageSourceHistoryId: currentStageAsset?.sourceHistoryId || workspaceSession.sourceHistoryId || null,
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
            currentStageAsset?.sourceHistoryId,
            selectedHistoryId,
            sessionUpdatedLabel,
            workspaceSession.sourceHistoryId,
        ],
    );
    const workspaceDetailOverlays =
        activeWorkspaceDetailModal === 'progress' || activeWorkspaceDetailModal === 'sources' ? (
            (() => {
                const supportDetailHeaderExtra = (
                    <div data-testid="workspace-support-detail-tabs" className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            data-testid="workspace-support-detail-tab-progress"
                            onClick={handleOpenProgressDetails}
                            className={`${supportDetailTabButtonClassName} ${
                                activeWorkspaceDetailModal === 'progress'
                                    ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200'
                                    : 'border-gray-200/80 text-gray-600 hover:border-amber-300 hover:text-amber-700 dark:border-gray-700 dark:text-gray-300 dark:hover:border-amber-500/30 dark:hover:text-amber-200'
                            }`}
                        >
                            {t('workspaceSupportProgress')}
                        </button>
                        <button
                            type="button"
                            data-testid="workspace-support-detail-tab-sources"
                            onClick={handleOpenSourcesDetails}
                            className={`${supportDetailTabButtonClassName} ${
                                activeWorkspaceDetailModal === 'sources'
                                    ? 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200'
                                    : 'border-gray-200/80 text-gray-600 hover:border-sky-300 hover:text-sky-700 dark:border-gray-700 dark:text-gray-300 dark:hover:border-sky-500/30 dark:hover:text-sky-200'
                            }`}
                        >
                            {t('workspaceSupportSources')}
                        </button>
                    </div>
                );

                if (activeWorkspaceDetailModal === 'progress') {
                    return (
                        <WorkspaceSupportDetailSurface
                            dataTestId="workspace-progress-detail-modal"
                            title={t('workspaceSupportProgress')}
                            closeLabel={t('workspaceViewerClose')}
                            onClose={handleCloseWorkspaceDetailModal}
                            compact={true}
                            headerExtra={supportDetailHeaderExtra}
                            desktopWidthClass="max-w-[1120px]"
                        >
                            <WorkspaceProgressDetailPanel
                                currentLanguage={currentLang}
                                thoughtEntries={progressThoughtEntries}
                                latestWorkflowEntry={latestWorkflowEntry}
                                isGenerating={isGenerating}
                                batchProgress={batchProgress}
                                queuedJobs={queuedJobs}
                                getImportedQueuedResultCount={getImportedQueuedResultCount}
                                resultStatusSummary={groundingResolutionStatusSummary}
                                resultStatusTone={groundingResolutionStatusTone}
                                thoughtsText={progressThoughtsSummaryText}
                                thoughtsPlaceholder={thoughtStateMessage}
                            />
                        </WorkspaceSupportDetailSurface>
                    );
                }

                return (
                    <WorkspaceSupportDetailSurface
                        dataTestId="workspace-sources-detail-modal"
                        title={t('workspaceSupportSources')}
                        closeLabel={t('workspaceViewerClose')}
                        onClose={handleCloseWorkspaceDetailModal}
                        headerExtra={supportDetailHeaderExtra}
                    >
                        <WorkspaceEvidenceDetailPanel
                            currentLanguage={currentLang}
                            provenanceSummaryRows={provenanceSummaryRows}
                            provenanceContinuityMessage={provenanceContinuityMessage}
                            groundingStateMessage={groundingStateMessage}
                            groundingSupportMessage={groundingSupportMessage}
                            totalSourceCount={selectedSources.length}
                            totalSupportBundleCount={selectedSupportBundles.length}
                        >
                            {contextProvenanceDetailPanel}
                        </WorkspaceEvidenceDetailPanel>
                    </WorkspaceSupportDetailSurface>
                );
            })()
        ) : activeWorkspaceDetailModal === 'versions' ? (
            <WorkspaceDetailModal
                dataTestId="workspace-versions-detail-modal"
                title={t('workspaceInsightsVersions')}
                closeLabel={t('workspaceViewerClose')}
                onClose={handleCloseWorkspaceDetailModal}
            >
                <WorkspaceVersionsDetailPanel {...versionsDetailPanelProps} showHeader={false} />
            </WorkspaceDetailModal>
        ) : isQueuedBatchSpaceOpen ? (
            <WorkspaceSupportDetailSurface
                dataTestId="workspace-queued-batch-space-modal"
                title={t('queuedBatchJobsTitle')}
                closeLabel={t('workspaceViewerClose')}
                onClose={handleCloseWorkspaceDetailModal}
                description={t('queuedBatchJobsDesc')}
                desktopWidthClass="max-w-[980px]"
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
                    onClearIssueQueuedJobs={handleClearIssueQueuedJobs}
                    onClearImportedQueuedJobs={handleClearImportedQueuedJobs}
                    onRemoveQueuedJob={handleRemoveQueuedJob}
                />
            </WorkspaceSupportDetailSurface>
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
                                    queueBatchDisabledReason={showEditorQueueBatch ? null : editorQueueDisabledReason}
                                    onCancel={closeEditor}
                                    isGenerating={isGenerating}
                                    currentLanguage={currentLang}
                                    currentLog={logs.length > 0 ? logs[logs.length - 1] : ''}
                                    error={error?.message || null}
                                    onErrorClear={() => setError(null)}
                                    imageModel={imageModel}
                                    onModelChange={setImageModel}
                                    leftDockTopOffset={
                                        surfaceSharedControlsBottom === null ? null : surfaceSharedControlsBottom + 12
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

                <div className="relative z-10 mx-auto flex min-h-screen max-w-[1560px] flex-col px-4 pb-[50px] pt-[100px] lg:px-4 lg:pb-[54px] xl:min-h-0 xl:px-3 xl:pt-[58px]">
                    <main className="mt-0 flex flex-1 flex-col gap-1.5 xl:min-h-0 xl:flex-none">
                        <section
                            data-testid="workspace-main-shell"
                            className="grid min-w-0 gap-1.5 xl:min-h-0 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] xl:items-stretch"
                        >
                            <div
                                data-testid="workspace-stage-column"
                                className="min-w-0 xl:flex xl:min-h-0 xl:flex-col"
                            >
                                {focusSurface}
                            </div>

                            <div data-testid="workspace-work-column" className="grid min-w-0 gap-1.5 xl:min-h-0">
                                <div data-testid="workspace-history-column" className="min-w-0 xl:min-h-0">
                                    {historySurface}
                                </div>

                                <section data-testid="workspace-actions-composer-row" className="min-w-0 xl:min-h-0">
                                    <ComposerSettingsPanel
                                        {...composerSettingsPanelProps}
                                        imageToolsPanel={sideToolPanel}
                                        onClearStyle={handleClearStyle}
                                    />
                                </section>
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
    );
};

export default App;
