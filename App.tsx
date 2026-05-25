import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense, lazy } from 'react';
import {
    BatchPreviewSession,
    BranchNameOverrides,
    GeneratedImage as GeneratedImageType,
    ImageModel,
    ResultPart,
    ViewerComposerSettingsSnapshot,
} from './types';
import ComposerAdvancedSettingsDialog from './components/ComposerAdvancedSettingsDialog';
import ComposerSettingsPanel from './components/ComposerSettingsPanel';
import DebugTerminalPanel, { DebugTerminalToggleIcon } from './components/DebugTerminalPanel';
import PanelLoadingFallback from './components/PanelLoadingFallback';
import SurfaceLoadingFallback from './components/SurfaceLoadingFallback';
import WorkspaceDetailModal from './components/WorkspaceDetailModal';
import WorkspaceModalFrame from './components/WorkspaceModalFrame';
import WorkspaceOverlayStack from './components/WorkspaceOverlayStack';
import WorkspaceSideToolPanel from './components/WorkspaceSideToolPanel';
import WorkspaceSupportDetailSurface from './components/WorkspaceSupportDetailSurface';
import WorkspaceBottomFooter from './components/WorkspaceBottomFooter';
import WorkspaceTopHeader from './components/WorkspaceTopHeader';
import WorkspaceUnifiedHistoryPanel from './components/WorkspaceUnifiedHistoryPanel';
import WorkspaceProgressCard from './components/WorkspaceProgressCard';
import type { WorkspaceProgressThoughtImageDownloadRequest } from './components/WorkspaceProgressDetailPanel';
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
import { IMAGE_MODELS, MODEL_CAPABILITIES } from './constants';
import { buildStageErrorState } from './utils/generationFailure';
import {
    topLauncherCompactButtonClassName,
    topLauncherCompactLabelClassName,
} from './utils/workspaceTopLauncherStyles';
import {
    clearSharedWorkspaceSnapshot,
    EMPTY_WORKSPACE_COMPOSER_STATE,
    EMPTY_WORKSPACE_SNAPSHOT,
    loadWorkspaceSnapshot,
    saveWorkspaceSnapshot,
} from './utils/workspacePersistence';
import { loadQueuedBatchSpaceSnapshot } from './utils/queuedBatchSpacePersistence';
import { hasRestorableWorkspaceContent } from './utils/workspaceSnapshotState';
import { deriveGroundingMode, getAvailableGroundingModes } from './utils/groundingMode';
import { EMPTY_WORKSPACE_CONVERSATION_STATE } from './utils/conversationState';
import { useImageGeneration } from './hooks/useImageGeneration';
import { usePerformGeneration } from './hooks/usePerformGeneration';
import { GenerationLiveProgressEvent } from './services/geminiService';
import { usePromptTools } from './hooks/usePromptTools';
import { useComposerState } from './hooks/useComposerState';
import { useHistoryPresentationHelpers } from './hooks/useHistoryPresentationHelpers';
import { useHistorySourceOrchestration } from './hooks/useHistorySourceOrchestration';
import { useImportedWorkspaceReview } from './hooks/useImportedWorkspaceReview';
import { useDocumentThemeMode } from './hooks/useDocumentThemeMode';
import { useComposerSettingsPanelProps } from './hooks/useComposerSettingsPanelProps';
import { useWorkspaceBranchRenameDialogProps } from './hooks/useWorkspaceBranchRenameDialogProps';
import { useWorkspaceImportReviewProps } from './hooks/useWorkspaceImportReviewProps';
import { useWorkspaceSurfaceSharedControlsProps } from './hooks/useWorkspaceSurfaceSharedControlsProps';
import { useWorkspacePickerSheetProps } from './hooks/useWorkspacePickerSheetProps';
import { useWorkspaceStageViewer } from './hooks/useWorkspaceStageViewer';
import { useWorkspaceTopHeaderProps } from './hooks/useWorkspaceTopHeaderProps';
import { useWorkspaceBranchPresentation } from './hooks/useWorkspaceBranchPresentation';
import { useProvenanceContinuation } from './hooks/useProvenanceContinuation';
import { useSelectedResultState } from './hooks/useSelectedResultState';
import { useWorkspaceAssets } from './hooks/useWorkspaceAssets';
import { useWorkspaceLineageSelectors } from './hooks/useWorkspaceLineageSelectors';
import { useWorkspaceShellViewModel } from './hooks/useWorkspaceShellViewModel';
import { useWorkspaceProgressThoughts } from './hooks/useWorkspaceProgressThoughts';
import { useWorkspaceViewerProvenanceState } from './hooks/useWorkspaceViewerProvenanceState';
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
import { useWorkspaceShellOwnerState } from './hooks/useWorkspaceShellOwnerState';
import { useWorkspaceSettingsSession } from './hooks/useWorkspaceSettingsSession';
import { useWorkspaceTransientUiState } from './hooks/useWorkspaceTransientUiState';
import { useDebugTerminal } from './hooks/useDebugTerminal';
import { useLegacyWorkspaceSnapshotMigration } from './hooks/useLegacyWorkspaceSnapshotMigration';
import { resolveCurrentStageSelectionFirstSourceOverride } from './utils/generationSourceOverride';
import { buildSavedImageLoadUrl, loadImageMetadata } from './utils/imageSaveUtils';
import {
    buildImageSidecarMetadata,
    createImageSidecarMetadataState,
    normalizeImageSidecarMetadata,
} from './utils/imageSidecarMetadata';
import { buildResultPartFilenameStem, buildSavedImageFilenameStem } from './utils/savedImageFilename';
import { downloadImageSource, downloadJsonDocument, stripFilenameExtension } from './utils/browserDownload';
import { WORKSPACE_OVERLAY_Z_INDEX } from './constants/workspaceOverlays';

const ImageEditor = lazy(() => import('./components/ImageEditor'));
const GeneratedImage = lazy(() => import('./components/GeneratedImage'));
const WorkspaceHealthPanel = lazy(() => import('./components/WorkspaceHealthPanel'));
const GroundingProvenancePanel = lazy(() => import('./components/GroundingProvenancePanel'));
const WorkspaceProgressDetailPanel = lazy(() => import('./components/WorkspaceProgressDetailPanel'));
const WorkspaceEvidenceDetailPanel = lazy(() => import('./components/WorkspaceEvidenceDetailPanel'));
const WorkspaceVersionsDetailPanel = lazy(() => import('./components/WorkspaceVersionsDetailPanel'));
const QueuedBatchJobsPanel = lazy(() => import('./components/QueuedBatchJobsPanel'));
const SketchPad = lazy(() => import('./components/SketchPad'));
const getShortTurnId = (historyId?: string | null) => (historyId ? historyId.slice(0, 8) : '--------');

const buildResultPartIdentityKey = (part: ResultPart) =>
    'text' in part
        ? `${part.kind}:${part.sequence}:${part.text}`
        : `${part.kind}:${part.sequence}:${part.mimeType}:${part.imageUrl}`;

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
    const [initialQueuedBatchSpaceSnapshot] = useState(() => loadQueuedBatchSpaceSnapshot());
    const initialActiveResult = initialWorkspaceSnapshot.workspaceSession.activeResult;
    const initialComposerState = initialWorkspaceSnapshot.composerState || EMPTY_WORKSPACE_COMPOSER_STATE;
    const [apiKeyReady, setApiKeyReady] = useState(false);
    const [isCancelFinalizing, setIsCancelFinalizing] = useState(false);
    const [isDebugTerminalOpen, setIsDebugTerminalOpen] = useState(false);
    const isDarkTheme = useDocumentThemeMode();
    const [currentLang, setCurrentLang] = useState<Language>(() => {
        const preferredLanguage = resolvePreferredLanguage();
        return isLanguageLoaded(preferredLanguage) ? preferredLanguage : 'en';
    });
    const {
        areInitialPreferencesReady,
        setAreInitialPreferencesReady,
        isEditing,
        setIsEditing,
        editingImageSource,
        setEditingImageSource,
        editorMode,
        setEditorMode,
        editorRetouchLockedRatio,
        setEditorRetouchLockedRatio,
        activeBatchPreviewSession,
        setActiveBatchPreviewSession,
        activeLiveProgressSession,
        setActiveLiveProgressSession,
        batchProgress,
        setBatchProgress,
        activeWorkspaceDetailModal,
        setActiveWorkspaceDetailModal,
        isQueuedBatchSpaceOpen,
        setIsQueuedBatchSpaceOpen,
        surfaceSharedControlsBottom,
        setSurfaceSharedControlsBottom,
        workspaceFloatingHostElement,
        setWorkspaceFloatingHostElement,
    } = useWorkspaceShellOwnerState();
    const [branchNameOverrides, setBranchNameOverrides] = useState<BranchNameOverrides>(
        () => initialWorkspaceSnapshot.branchState.nameOverrides,
    );
    const [branchContinuationSourceByBranchOriginId, setBranchContinuationSourceByBranchOriginId] = useState<
        Record<string, string>
    >(() => initialWorkspaceSnapshot.branchState.continuationSourceByBranchOriginId);
    const [conversationState, setConversationState] = useState(
        () => initialWorkspaceSnapshot.conversationState || EMPTY_WORKSPACE_CONVERSATION_STATE,
    );
    const debugTerminal = useDebugTerminal();
    const {
        isSketchPadOpen,
        setIsSketchPadOpen,
        showSketchReplaceConfirm,
        setShowSketchReplaceConfirm,
        showClearWorkspaceConfirm,
        setShowClearWorkspaceConfirm,
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
    } = useImageGeneration(initialWorkspaceSnapshot);
    const isForegroundGenerationLocked = isGenerating && !isCancelFinalizing;

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
        safetyThresholds,
        setSafetyThresholds,
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
        orderedReferenceAssets,
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

            // 立即同步更新語言狀態，確保重寫與圖轉提示詞工具能立即以最新語言發送 API 請求
            setCurrentLang(nextLanguage);

            if (isLanguageLoaded(nextLanguage)) {
                return;
            }

            void ensureLanguageLoaded(nextLanguage).catch((error) => {
                if (languageChangeRequestRef.current === requestId) {
                    // 若加載翻譯失敗，回滾到原本的語言狀態
                    setCurrentLang(currentLang);
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

            const mergedMetadata = metadata
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
                selectedPreviewSlotIndex: null,
                tiles: Array.from({ length: batchSize }, (_, slotIndex) => ({
                    id: `${sessionId}-${slotIndex}`,
                    slotIndex,
                    status: 'pending',
                    previewUrl: null,
                    stagePreviewUrl: null,
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
                const selectedPreviewSlotIndex = currentPreviewSession.selectedPreviewSlotIndex;
                if (typeof selectedPreviewSlotIndex === 'number') {
                    const selectedCommittedItem = historyItems.find(
                        (historyItem) =>
                            historyItem.status === 'success' &&
                            getBatchVisualSlotIndex(historyItem) === selectedPreviewSlotIndex &&
                            (historyItem.savedFilename || historyItem.url),
                    );

                    if (selectedCommittedItem) {
                        silentlyShowHistoryItemOnStage(selectedCommittedItem);
                    }
                }

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

    const handleBatchPreviewTileSelect = useCallback(
        (tile: BatchPreviewSession['tiles'][number]) => {
            if (tile.status !== 'ready') {
                return;
            }

            const stagePreviewUrl = tile.stagePreviewUrl || tile.previewUrl;
            if (!stagePreviewUrl) {
                return;
            }

            setActiveBatchPreviewSession((previousSession) =>
                previousSession
                    ? {
                          ...previousSession,
                          didUserInspectExistingImage: true,
                          selectedPreviewSlotIndex: tile.slotIndex,
                      }
                    : previousSession,
            );
            setGeneratedImageUrls([stagePreviewUrl]);
            setSelectedImageIndex(0);
            clearAssetRoles(['stage-source']);
            resetSelectedOutputState();
            setError(null);
        },
        [clearAssetRoles, resetSelectedOutputState, setError, setGeneratedImageUrls, setSelectedImageIndex],
    );

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
                      selectedPreviewSlotIndex: null,
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
    const {
        clearSettingsSession,
        generationSettingsDraft,
        handleApplySettingsSessionDraft,
        handleCloseAdvancedSettingsSession,
        handleCloseSettingsSheetSession,
        handleSettingsSessionGroundingModeChange,
        handleUpdateGenerationSettingsDraft,
        openAdvancedSettingsFromGeneration,
        openAdvancedSettingsSession,
        openGenerationSettingsSession,
        settingsSessionAvailableGroundingModes,
        settingsSessionCapability,
        settingsSessionView,
        updateSettingsSessionDraft,
    } = useWorkspaceSettingsSession({
        activeEditorLockedAspectRatio,
        imageModel,
        aspectRatio,
        imageSize,
        batchSize,
        outputFormat,
        temperature,
        thinkingLevel,
        groundingMode,
        safetyThresholds,
        closePickerSheet,
        setActivePickerSheet,
        setIsAdvancedSettingsOpen,
        setImageModel,
        setAspectRatio,
        setImageSize,
        setBatchSize,
        setOutputFormat,
        setTemperature,
        setThinkingLevel,
        setGroundingMode,
        setSafetyThresholds,
        showNotification,
        t,
    });

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
        lineageRootGroups,
        activeBranchSummary,
        currentStageSourceHistoryId,
        currentStageSourceTurn,
        currentStageBranchSummary,
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
        setIsCancelFinalizing,
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
        safetyThresholds,
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
        safetyThresholds,
        setPrompt,
        addLog,
        showNotification,
        t,
        apiKeyReady,
        handleApiKeyConnect,
    });
    const { isEnhancingPrompt: isEnhancingEditorPrompt } = usePromptTools({
        currentLanguage: currentLang,
        prompt: editorPrompt,
        safetyThresholds,
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
        orderedReferenceAssets,
        hasDraftPrompt: prompt.trim().length > 0,
        aspectRatio,
        setApiKeyReady,
        setCurrentLang,
        setInitialPreferencesReady: setAreInitialPreferencesReady,
        setAspectRatio,
        addLog,
        showNotification,
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
        setIsCancelFinalizing,
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
        queueBatchGenerateModeSummary,
        queueBatchConversationNotice,
        getImportedQueuedHistoryItems,
        getImportedQueuedResultCount,
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
        handleQueueBatchFollowUpJob,
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
        clearSettingsSession,
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
        effectiveSessionHints,
        groundingResolutionStatusSummary,
        groundingResolutionStatusTone,
        sessionUpdatedLabel,
        selectedSources,
        selectedSupportBundles,
        groundingQueries,
        searchEntryPointRenderedContent,
        sessionHintEntries,
        formatSessionHintKey,
        formatSessionHintValue,
        thoughtStateMessage,
        groundingStateMessage,
        groundingSupportMessage,
        provenanceContinuityMessage,
        provenanceSummaryRows,
        groundingProvenancePanelProps,
        viewerMetadataItems,
        viewerMetadataStateMessage,
        viewerSettingsSnapshot,
    } = useWorkspaceViewerProvenanceState({
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
        currentLanguage: currentLang,
        renderHistoryTurnActionRow,
        setActiveGroundingSelection,
        setFocusLinkedGroundingItems,
        currentViewedCompletedHistoryItem,
        currentViewedCompletedHistoryMetadata,
        getStyleLabel,
        getModelLabel,
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
    const surfaceSharedControlsProps = useWorkspaceSurfaceSharedControlsProps({
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
        groundingMode,
        objectImageCount: surfaceObjectImages.length,
        characterImageCount: surfaceCharacterImages.length,
        floatingControlsZIndex,
        onSurfaceSharedControlsBottomChange: setSurfaceSharedControlsBottom,
        currentLanguage: currentLang,
        openSurfacePickerSheet: handleOpenSurfacePickerSheet,
        openAdvancedSettings: openAdvancedSettingsSession,
        getModelLabel,
    });
    const importReviewProps = useWorkspaceImportReviewProps({
        currentLanguage: currentLang,
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
    });
    const branchRenameDialogProps = useWorkspaceBranchRenameDialogProps({
        currentLanguage: currentLang,
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
        isGenerating: isForegroundGenerationLocked,
        isActionLocked: isGenerating,
        isCancelFinalizing,
        isEnhancingPrompt: isEnhancingComposerPrompt,
        activePromptTool: activeComposerPromptTool,
        currentLanguage: currentLang,
        imageStyleLabel: getStyleLabel(imageStyle),
        outputFormat,
        thinkingLevel,
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
        isQueueBatchDisabled,
        queueBatchDisabledReason,
        queueBatchModeSummary,
        queueBatchGenerateModeSummary,
        queueBatchConversationNotice,
        promptTextareaRef: composerPromptTextareaRef,
        setPrompt,
        setStickySendIntent,
        toggleEnterToSubmit,
        handleGenerate,
        handleQueueBatchJob,
        handleQueueBatchFollowUpJob,
        handleCancelGeneration,
        handleStartNewConversation,
        handleFollowUpGenerate,
        handleSurpriseMe: handleComposerSurpriseMe,
        handleSmartRewrite: handleComposerSmartRewrite,
        handleImageToPrompt: handleComposerImageToPrompt,
        openSettings: openGenerationSettingsSession,
        openAdvancedSettings: openAdvancedSettingsSession,
        setActivePickerSheet,
        t,
        getStageOriginLabel,
        getLineageActionLabel,
    });
    const advancedSettingsDialogProps: React.ComponentProps<typeof ComposerAdvancedSettingsDialog> | null =
        isAdvancedSettingsOpen
            ? {
                  currentLanguage: currentLang,
                  outputFormat: settingsSessionView.outputFormat,
                  thinkingLevel: settingsSessionView.thinkingLevel,
                  groundingMode: settingsSessionView.groundingMode,
                  safetyThresholds: settingsSessionView.safetyThresholds,
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
                  onSafetyThresholdsChange: (value) =>
                      updateSettingsSessionDraft((previous) => ({
                          ...previous,
                          safetyThresholds: value,
                      })),
                  onGroundingModeChange: handleSettingsSessionGroundingModeChange,
                  isOpen: true,
                  onApply: handleApplySettingsSessionDraft,
                  onClose: handleCloseAdvancedSettingsSession,
              }
            : null;
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
                    onClick={() => setIsDebugTerminalOpen(true)}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200/80 bg-white/70 text-slate-500 transition-colors hover:border-cyan-300/80 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 dark:border-white/10 dark:bg-[#141922]/78 dark:text-slate-300 dark:hover:border-cyan-400/50 dark:hover:text-slate-50"
                    aria-label={t('debugTerminalOpen')}
                    title={t('debugTerminalOpen')}
                >
                    <DebugTerminalToggleIcon />
                </button>
            </div>
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
    const currentStageIsCurrentSource = Boolean(
        generatedImageUrls.length > 0 &&
        (!currentStageHasLinkedHistoryTurn ||
            (currentStageSourceHistoryId && currentStageSourceHistoryId === currentSourceHistoryId)),
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
    const handleViewerSelectHistoryItem = useCallback(
        (historyId: string) => {
            const historyItem = getHistoryTurnById(historyId);
            if (historyItem) {
                handleHistorySelect(historyItem, { deferLineageCommit: true });
            }
        },
        [getHistoryTurnById, handleHistorySelect],
    );
    const handleDownloadStageImage = useCallback(
        async (imageUrl: string) => {
            try {
                const matchedHistoryItem =
                    history.find(
                        (item) =>
                            item.status === 'success' &&
                            (item.savedFilename ? buildSavedImageLoadUrl(item.savedFilename) : item.url) === imageUrl,
                    ) || null;
                const preferredMetadata =
                    matchedHistoryItem?.id === currentViewedCompletedHistoryItem?.id
                        ? normalizeImageSidecarMetadata(selectedMetadata)
                        : null;
                const persistedHistoryMetadata = normalizeImageSidecarMetadata(matchedHistoryItem?.metadata);
                const fallbackMetadata = buildImageSidecarMetadata({
                    prompt: matchedHistoryItem?.prompt || viewSettings.prompt,
                    model: matchedHistoryItem?.model || stageViewerSettings.model,
                    style: matchedHistoryItem?.style || stageViewerSettings.imageStyle,
                    aspectRatio: matchedHistoryItem?.aspectRatio || stageViewerSettings.aspectRatio,
                    requestedImageSize: matchedHistoryItem?.size || stageViewerSettings.imageSize,
                    outputFormat,
                    temperature,
                    thinkingLevel,
                    includeThoughts,
                    googleSearch,
                    imageSearch,
                    generationMode: matchedHistoryItem?.mode || generationMode,
                    executionMode: matchedHistoryItem?.executionMode || executionMode,
                    batchSize: stageViewerSettings.batchSize,
                });
                const baseMetadata = preferredMetadata || persistedHistoryMetadata || fallbackMetadata;
                const imageFilename = await downloadImageSource(imageUrl, {
                    filename: matchedHistoryItem?.savedFilename,
                    filenameStem: buildSavedImageFilenameStem({
                        model: matchedHistoryItem?.model || stageViewerSettings.model,
                        mode: matchedHistoryItem?.mode || generationMode,
                        slotIndex: selectedImageIndex,
                        createdAt: matchedHistoryItem ? new Date(matchedHistoryItem.createdAt) : new Date(),
                        requestId: matchedHistoryItem?.id || crypto.randomUUID(),
                    }),
                });
                const metadataFilename = `${stripFilenameExtension(imageFilename)}.json`;
                downloadJsonDocument(
                    {
                        ...baseMetadata,
                        filename: baseMetadata.filename || imageFilename,
                        timestamp:
                            typeof baseMetadata.timestamp === 'string' && baseMetadata.timestamp.trim()
                                ? baseMetadata.timestamp
                                : new Date(matchedHistoryItem?.createdAt || Date.now()).toISOString(),
                    },
                    metadataFilename,
                );
                showNotification(t('stageDownloadCompleteNotice'), 'info');
            } catch (error) {
                console.error('Failed to download stage image', error);
                showNotification(t('stageDownloadFailedNotice'), 'error');
            }
        },
        [
            currentViewedCompletedHistoryItem?.id,
            executionMode,
            generationMode,
            googleSearch,
            history,
            imageSearch,
            includeThoughts,
            outputFormat,
            selectedImageIndex,
            selectedMetadata,
            showNotification,
            stageViewerSettings.aspectRatio,
            stageViewerSettings.batchSize,
            stageViewerSettings.imageSize,
            stageViewerSettings.imageStyle,
            stageViewerSettings.model,
            t,
            temperature,
            thinkingLevel,
            viewSettings.prompt,
        ],
    );
    const handleDownloadThoughtImage = useCallback(
        async ({
            imageUrl,
            mimeType,
            savedFilename,
            entryId,
            slotIndex,
            sequence,
        }: WorkspaceProgressThoughtImageDownloadRequest) => {
            try {
                const historyItem = getHistoryTurnById(entryId);
                await downloadImageSource(imageUrl, {
                    filename: savedFilename,
                    filenameStem: buildResultPartFilenameStem({
                        model: historyItem?.model || stageViewerSettings.model,
                        mode: historyItem?.mode || generationMode,
                        slotIndex: typeof slotIndex === 'number' ? slotIndex : selectedImageIndex,
                        createdAt: historyItem ? new Date(historyItem.createdAt) : new Date(),
                        requestId: historyItem?.id || entryId || crypto.randomUUID(),
                        sequence,
                        sourceSavedFilename: historyItem?.savedFilename,
                    }),
                    mimeType,
                });
                showNotification(t('thoughtImageDownloadCompleteNotice'), 'info');
            } catch (error) {
                console.error('Failed to download thought image', error);
                showNotification(t('thoughtImageDownloadFailedNotice'), 'error');
            }
        },
        [generationMode, getHistoryTurnById, selectedImageIndex, showNotification, stageViewerSettings.model, t],
    );
    const stableHandleGenerateRef = useRef(handleGenerate);
    stableHandleGenerateRef.current = handleGenerate;
    const stableHandleGenerate = useCallback(() => {
        stableHandleGenerateRef.current();
    }, []);

    const stableHandleOpenEditorRef = useRef(handleOpenEditor);
    stableHandleOpenEditorRef.current = handleOpenEditor;
    const stableHandleOpenEditor = useCallback(() => {
        stableHandleOpenEditorRef.current();
    }, []);

    const stableHandleClearCurrentStageRef = useRef(handleClearCurrentStage);
    stableHandleClearCurrentStageRef.current = handleClearCurrentStage;
    const stableHandleClearCurrentStage = useCallback(() => {
        stableHandleClearCurrentStageRef.current();
    }, []);

    const stableHandleDownloadStageImageRef = useRef(handleDownloadStageImage);
    stableHandleDownloadStageImageRef.current = handleDownloadStageImage;
    const stableHandleDownloadStageImage = useCallback((imageUrl: string) => {
        return stableHandleDownloadStageImageRef.current(imageUrl);
    }, []);

    const stableHandleAddToObjectReferenceRef = useRef(handleAddToObjectReference);
    stableHandleAddToObjectReferenceRef.current = handleAddToObjectReference;
    const stableHandleAddToObjectReference = useCallback(() => {
        stableHandleAddToObjectReferenceRef.current();
    }, []);

    const stableHandleAddToCharacterReferenceRef = useRef(handleAddToCharacterReference);
    stableHandleAddToCharacterReferenceRef.current = handleAddToCharacterReference;
    const stableHandleAddToCharacterReference = useCallback(() => {
        stableHandleAddToCharacterReferenceRef.current();
    }, []);

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
        isEnhancingPrompt: isEditing ? isEnhancingEditorPrompt : isEnhancingComposerPrompt,
        closePickerSheet: handleCloseWorkspacePickerSheet,
        openAdvancedSettings: openAdvancedSettingsFromGeneration,
        currentLanguage: currentLang,
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
        isGenerating: isForegroundGenerationLocked,
        showNotification,
        handleRemoveObjectReference: handleSurfaceRemoveObjectReference,
        setCharacterImages: setSurfaceCharacterImages,
        handleRemoveCharacterReference: handleSurfaceRemoveCharacterReference,
        showStyleEntry: !isEditing,
    });
    const handleOpenClearWorkspaceConfirm = useCallback(() => {
        setShowClearWorkspaceConfirm(true);
    }, [setShowClearWorkspaceConfirm]);
    const handleCloseClearWorkspaceConfirm = useCallback(() => {
        setShowClearWorkspaceConfirm(false);
    }, [setShowClearWorkspaceConfirm]);
    const handleConfirmClearWorkspace = useCallback(() => {
        setShowClearWorkspaceConfirm(false);
        handleClearGalleryHistory();
    }, [handleClearGalleryHistory, setShowClearWorkspaceConfirm]);
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
                branchSummariesCount={branchSummaries.length}
                onSelect={handleHistorySelect}
                getBranchAccentClassName={getBranchAccentClassName}
                onOpenVersionsDetails={handleOpenVersionsDetails}
                onImportWorkspace={handleOpenWorkspaceImportPicker}
                onExportWorkspace={handleExportWorkspaceSnapshot}
                onClearWorkspace={handleOpenClearWorkspaceConfirm}
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
            handleOpenClearWorkspaceConfirm,
            handleBatchPreviewTileSelect,
            handleHistorySelect,
            handleOpenVersionsDetails,
            handleOpenWorkspaceImportPicker,
            history,
            selectedHistoryId,
        ],
    );
    const stagePanelClassName =
        'min-w-0 nbu-shell-panel nbu-shell-surface-stage-hero min-h-[400px] overflow-hidden p-3 lg:min-h-0 xl:flex-1';
    const hasQueuedBatchActivity = queuedJobs.length > 0;
    const { progressThoughtEntries, progressThoughtsSummaryText, hasProgressActivity, hasSourceTrailInfo } =
        useWorkspaceProgressThoughts({
            selectedHistoryId,
            getHistoryTurnById,
            selectedResultParts,
            selectedThoughts,
            effectiveResultParts,
            effectiveThoughts,
            workspaceSession,
            sessionUpdatedLabel,
            isGenerating,
            activeLiveProgressSession,
            prompt,
            history,
            currentStageBranchSummary,
            activeBranchSummary,
            currentStageSourceTurn,
            getShortTurnId,
            groundingQueries,
            selectedSourcesCount: selectedSources.length,
            selectedSupportBundlesCount: selectedSupportBundles.length,
            searchEntryPointRenderedContent: searchEntryPointRenderedContent ?? null,
            effectiveSessionHints,
            t,
        });
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
                className={`${topLauncherCompactButtonClassName} nbu-shell-surface-context-rail hover:border-sky-300 dark:hover:border-sky-500/30`}
            >
                <span className="flex min-w-0 items-center gap-2">
                    <TopLauncherSignal active={hasSourceTrailInfo} dataTestId="workspace-sources-signal" />
                    <span className={topLauncherCompactLabelClassName}>{t('workspaceSupportSources')}</span>
                </span>
            </button>
            <button
                type="button"
                data-testid="workspace-queue-open-details"
                onClick={handleOpenQueuedBatchJobs}
                className={`${topLauncherCompactButtonClassName} nbu-shell-surface-context-rail hover:border-emerald-300 dark:hover:border-emerald-500/30`}
            >
                <span className="flex min-w-0 items-center gap-2">
                    <TopLauncherSignal active={hasQueuedBatchActivity} dataTestId="workspace-queue-signal" />
                    <span className={topLauncherCompactLabelClassName}>{t('workspaceQueueLauncher')}</span>
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
                isGenerating={isForegroundGenerationLocked}
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
            isForegroundGenerationLocked,
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
                if (activeWorkspaceDetailModal === 'progress') {
                    return (
                        <WorkspaceSupportDetailSurface
                            dataTestId="workspace-progress-detail-modal"
                            title={t('workspaceSupportProgress')}
                            closeLabel={t('workspaceViewerClose')}
                            onClose={handleCloseWorkspaceDetailModal}
                            compact={true}
                            desktopWidthClass="max-w-[1120px]"
                        >
                            <Suspense
                                fallback={
                                    <PanelLoadingFallback
                                        label={t('workspaceSupportProgress')}
                                        className="nbu-dashed-panel min-h-[220px] rounded-[20px] px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                                    />
                                }
                            >
                                <WorkspaceProgressDetailPanel
                                    currentLanguage={currentLang}
                                    thoughtEntries={progressThoughtEntries}
                                    onDownloadThoughtImage={handleDownloadThoughtImage}
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
                            </Suspense>
                        </WorkspaceSupportDetailSurface>
                    );
                }

                return (
                    <WorkspaceSupportDetailSurface
                        dataTestId="workspace-sources-detail-modal"
                        title={t('workspaceSupportSources')}
                        closeLabel={t('workspaceViewerClose')}
                        onClose={handleCloseWorkspaceDetailModal}
                    >
                        <Suspense
                            fallback={
                                <PanelLoadingFallback
                                    label={t('workspaceSupportSources')}
                                    className="nbu-dashed-panel min-h-[220px] rounded-[20px] px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                                />
                            }
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
                        </Suspense>
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
                <Suspense
                    fallback={
                        <PanelLoadingFallback
                            label={t('workspaceInsightsVersions')}
                            className="nbu-dashed-panel min-h-[220px] rounded-[20px] px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                        />
                    }
                >
                    <WorkspaceVersionsDetailPanel {...versionsDetailPanelProps} showHeader={false} />
                </Suspense>
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
                <Suspense
                    fallback={
                        <PanelLoadingFallback
                            label={t('queuedBatchJobsTitle')}
                            className="nbu-dashed-panel min-h-[220px] rounded-[20px] px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                        />
                    }
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
                </Suspense>
            </WorkspaceSupportDetailSurface>
        ) : null;
    const workspaceClearConfirmOverlay = showClearWorkspaceConfirm ? (
        <WorkspaceModalFrame
            dataTestId="workspace-unified-history-clear-confirm"
            zIndex={WORKSPACE_OVERLAY_Z_INDEX.historyConfirm}
            maxWidthClass="max-w-sm"
            onClose={handleCloseClearWorkspaceConfirm}
            closeLabel={t('clearHistoryCancel')}
            title={t('clearHistoryTitle')}
            description={t('clearHistoryMsg')}
            hideCloseButton
            panelClassName="nbu-modal-shell"
            headerClassName="justify-center border-b-0 px-6 pt-6 pb-4 text-center"
            headerExtra={
                <div className="mt-4 flex justify-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                        </svg>
                    </div>
                </div>
            }
        >
            <div className="flex gap-2 border-t border-gray-100 bg-gray-50 p-2 dark:border-gray-800 dark:bg-gray-900/50">
                <button
                    type="button"
                    data-testid="workspace-unified-history-clear-cancel"
                    onClick={handleCloseClearWorkspaceConfirm}
                    className="flex-1 rounded-xl border border-transparent px-4 py-2.5 text-sm font-bold text-gray-600 transition-all hover:border-gray-200 hover:bg-white dark:text-gray-300 dark:hover:border-gray-700 dark:hover:bg-gray-800"
                >
                    {t('clearHistoryCancel')}
                </button>
                <button
                    type="button"
                    data-testid="workspace-unified-history-clear-confirm-action"
                    onClick={handleConfirmClearWorkspace}
                    className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-500/30 transition-all hover:bg-red-600"
                >
                    {t('clearHistoryConfirm')}
                </button>
            </div>
        </WorkspaceModalFrame>
    ) : null;
    const workspaceOverlayContent =
        workspaceDetailOverlays || workspaceClearConfirmOverlay ? (
            <>
                {workspaceDetailOverlays}
                {workspaceClearConfirmOverlay}
            </>
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
                                    queueBatchDisabledReason={showEditorQueueBatch ? null : editorQueueDisabledReason}
                                    onCancel={closeEditor}
                                    isGenerating={isGenerating}
                                    currentLanguage={currentLang}
                                    error={error?.summary || null}
                                    onErrorClear={() => setError(null)}
                                    imageModel={imageModel}
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

                {isDebugTerminalOpen ? (
                    <DebugTerminalPanel
                        events={debugTerminal.events}
                        filteredEvents={debugTerminal.filteredEvents}
                        selectedEvent={debugTerminal.selectedEvent}
                        selectedEventId={debugTerminal.selectedEventId}
                        filter={debugTerminal.filter}
                        sourceFilter={debugTerminal.sourceFilter}
                        routeFilter={debugTerminal.routeFilter}
                        searchQuery={debugTerminal.searchQuery}
                        activeCorrelationId={debugTerminal.activeCorrelationId}
                        autoScroll={debugTerminal.autoScroll}
                        kindCounts={debugTerminal.kindCounts}
                        sourceOptions={debugTerminal.sourceOptions}
                        routeOptions={debugTerminal.routeOptions}
                        t={t}
                        onFilterChange={debugTerminal.setFilter}
                        onSourceFilterChange={debugTerminal.setSourceFilter}
                        onRouteFilterChange={debugTerminal.setRouteFilter}
                        onSearchQueryChange={debugTerminal.setSearchQuery}
                        onActiveCorrelationIdChange={debugTerminal.setActiveCorrelationId}
                        onSelectEvent={(eventId) => debugTerminal.setSelectedEventId(eventId)}
                        onAutoScrollChange={debugTerminal.setAutoScroll}
                        onClear={debugTerminal.clearEvents}
                        onClose={() => setIsDebugTerminalOpen(false)}
                    />
                ) : null}

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
