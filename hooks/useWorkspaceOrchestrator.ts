import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ComposerAdvancedSettingsDialog from '../components/ComposerAdvancedSettingsDialog';
import { SurfaceSharedControlSheet } from '../components/SurfaceSharedControls';
import { IMAGE_MODELS, MODEL_CAPABILITIES } from '../constants';
import {
    ContinuationLineageAction,
    GeneratedImage as GeneratedImageType,
    GroundingMetadata,
    ImageModel,
    OptimizationMode,
    PromptThinkingLevel,
    ProvenanceContinuityMode,
    ResultArtifacts,
    SessionContinuitySource,
} from '../types';
import { EMPTY_WORKSPACE_SESSION } from '../utils/workspacePersistence';
import { resolveCurrentStageSelectionFirstSourceOverride } from '../utils/generationSourceOverride';
import { deriveGroundingMode, getAvailableGroundingModes } from '../utils/groundingMode';
import { buildSavedImageLoadUrl } from '../utils/imageSaveUtils';
import { normalizeOptimizationMode, OPTIMIZATION_MODE_STORAGE_KEY } from '../utils/optimizationMode';
import { loadQueuedBatchSpaceSnapshot } from '../utils/queuedBatchSpacePersistence';
import { resolveStyleLabel } from '../utils/styleRegistry';
import {
    ensureLanguageLoaded,
    getTranslation,
    isLanguageLoaded,
    Language,
    persistLanguagePreference,
} from '../utils/translations';
import {
    clearSharedWorkspaceSnapshot,
    clearStoredWorkspaceSnapshot,
    EMPTY_WORKSPACE_COMPOSER_STATE,
    EMPTY_WORKSPACE_SNAPSHOT,
    loadWorkspaceSnapshot,
    saveWorkspaceSnapshot,
} from '../utils/workspacePersistence';
import { hasRestorableWorkspaceContent } from '../utils/workspaceSnapshotState';
import {
    createStoreFieldSetter,
    createWorkspaceDomainStore,
    shallowEqual,
    useWorkspaceSelector,
} from '../state/workspaceDomainStore';
import { useBatchPreviewSession } from './useBatchPreviewSession';
import { useComposerSettingsPanelProps } from './useComposerSettingsPanelProps';
import { useComposerState } from './useComposerState';
import { useDocumentThemeMode } from './useDocumentThemeMode';
import { useHistoryPresentationHelpers } from './useHistoryPresentationHelpers';
import { useHistorySourceOrchestration } from './useHistorySourceOrchestration';
import { useImageGeneration } from './useImageGeneration';
import { useImportedWorkspaceReview } from './useImportedWorkspaceReview';
import { useLegacyWorkspaceSnapshotMigration } from './useLegacyWorkspaceSnapshotMigration';
import { useOverlayEscapeDismiss } from './useOverlayEscapeDismiss';
import { usePerformGeneration } from './usePerformGeneration';
import { usePromptTools } from './usePromptTools';
import { useProvenanceContinuation } from './useProvenanceContinuation';
import { useQueuedBatchPresentation } from './useQueuedBatchPresentation';
import { useQueuedBatchSpacePersistence } from './useQueuedBatchSpacePersistence';
import { useQueuedBatchWorkflow } from './useQueuedBatchWorkflow';
import { useSelectedResultState } from './useSelectedResultState';
import { useStageHistorySynchronizer } from './useStageHistorySynchronizer';
import { useStageImageDownloadActions } from './useStageImageDownloadActions';
import { useVideoReferenceManager } from './useVideoReferenceManager';
import { useViewerPromptAndMetadataApplyActions } from './useViewerPromptAndMetadataApplyActions';
import { useWorkspaceAppLifecycle } from './useWorkspaceAppLifecycle';
import { useWorkspaceAssets } from './useWorkspaceAssets';
import { useWorkspaceBlobHydration } from './useWorkspaceBlobHydration';
import { useWorkspaceBranchPresentation } from './useWorkspaceBranchPresentation';
import { useWorkspaceBranchRenameDialogProps } from './useWorkspaceBranchRenameDialogProps';
import { useWorkspaceCapabilityConstraints } from './useWorkspaceCapabilityConstraints';
import { useWorkspaceEditorActions } from './useWorkspaceEditorActions';
import { useWorkspaceGenerationActions } from './useWorkspaceGenerationActions';
import { useWorkspaceGenerationContext } from './useWorkspaceGenerationContext';
import { useWorkspaceImportReviewProps } from './useWorkspaceImportReviewProps';
import { useWorkspaceLineageSelectors } from './useWorkspaceLineageSelectors';
import { useWorkspacePickerSheetProps } from './useWorkspacePickerSheetProps';
import { useWorkspaceProgressThoughts } from './useWorkspaceProgressThoughts';
import { useWorkspaceResetActions } from './useWorkspaceResetActions';
import { useWorkspaceSettingsSession } from './useWorkspaceSettingsSession';
import { useWorkspaceShellUtilities } from './useWorkspaceShellUtilities';
import { useWorkspaceShellViewModel } from './useWorkspaceShellViewModel';
import { useWorkspaceSnapshotActions } from './useWorkspaceSnapshotActions';
import { useWorkspaceSnapshotPersistence } from './useWorkspaceSnapshotPersistence';
import { useWorkspaceStageViewer } from './useWorkspaceStageViewer';
import { useWorkspaceSurfaceSharedControlsProps } from './useWorkspaceSurfaceSharedControlsProps';
import type { BranchRenameDialogState } from './useWorkspaceSurfaceState';
import { useWorkspaceTopHeaderProps } from './useWorkspaceTopHeaderProps';
import { useWorkspaceTransientUiState } from './useWorkspaceTransientUiState';
import { useWorkspaceViewerProvenanceState } from './useWorkspaceViewerProvenanceState';

const getShortTurnId = (historyId?: string | null) => (historyId ? historyId.slice(0, 8) : '--------');

export function useWorkspaceOrchestrator() {
    const [initialWorkspaceSnapshot] = useState(() => loadWorkspaceSnapshot());
    const [initialQueuedBatchSpaceSnapshot] = useState(() => loadQueuedBatchSpaceSnapshot());
    const [store] = useState(() => createWorkspaceDomainStore(initialWorkspaceSnapshot));

    const initialActiveResult = initialWorkspaceSnapshot.workspaceSession.activeResult;
    const initialComposerState = initialWorkspaceSnapshot.composerState || EMPTY_WORKSPACE_COMPOSER_STATE;
    const isDarkTheme = useDocumentThemeMode();

    const runtimeSlice = useWorkspaceSelector(store, (state) => state.runtime, shallowEqual);
    const sessionAndLineageSlice = useWorkspaceSelector(store, (state) => state.sessionAndLineage, shallowEqual);
    const executionSlice = useWorkspaceSelector(store, (state) => state.execution, shallowEqual);
    const surfaceSlice = useWorkspaceSelector(
        store,
        (state) => ({
            showExportResultsModal: state.surface.showExportResultsModal,
            showMetadataViewerDrawer: state.surface.showMetadataViewerDrawer,
            activeWorkspaceDetailModal: state.surface.activeWorkspaceDetailModal,
            isQueuedBatchSpaceOpen: state.surface.isQueuedBatchSpaceOpen,
            showClearWorkspaceConfirm: state.surface.showClearWorkspaceConfirm,
            showSketchReplaceConfirm: state.surface.showSketchReplaceConfirm,
            isSketchPadOpen: state.surface.isSketchPadOpen,
            isAdvancedSettingsOpen: state.surface.isAdvancedSettingsOpen,
            isViewerOpen: state.surface.isViewerOpen,
            activePickerSheet: state.surface.activePickerSheet,
            branchRenameDialog: state.surface.branchRenameDialog,
            branchRenameDraft: state.surface.branchRenameDraft,
            isEditing: state.surface.isEditing,
            editingImageSource: state.surface.editingImageSource,
            editorMode: state.surface.editorMode,
            editorRetouchLockedRatio: state.surface.editorRetouchLockedRatio,
            surfaceSharedControlsBottom: state.surface.surfaceSharedControlsBottom,
            workspaceFloatingHostElement: state.surface.workspaceFloatingHostElement,
        }),
        shallowEqual,
    );

    const { apiKeyReady, currentLang, areInitialPreferencesReady, optimizationMode, promptThinkingLevel } =
        runtimeSlice;

    const {
        workspaceSession,
        pendingProvenanceContext,
        branchNameOverrides,
        branchContinuationSourceByBranchOriginId,
        conversationState,
    } = sessionAndLineageSlice;

    const { isCancelFinalizing, activeBatchPreviewSession, activeLiveProgressSession, batchProgress } = executionSlice;

    const {
        showExportResultsModal,
        showMetadataViewerDrawer,
        activeWorkspaceDetailModal,
        isQueuedBatchSpaceOpen,
        showClearWorkspaceConfirm,
        showSketchReplaceConfirm,
        isSketchPadOpen,
        isAdvancedSettingsOpen,
        isViewerOpen,
        activePickerSheet,
        branchRenameDialog,
        branchRenameDraft,
        isEditing,
        editingImageSource,
        editorMode,
        editorRetouchLockedRatio,
        surfaceSharedControlsBottom,
        workspaceFloatingHostElement,
    } = surfaceSlice;

    const domainSetters = useMemo(
        () => ({
            setApiKeyReady: createStoreFieldSetter(() => store.getState().runtime, store.updateRuntime, 'apiKeyReady'),
            setCurrentLang: createStoreFieldSetter(() => store.getState().runtime, store.updateRuntime, 'currentLang'),
            setAreInitialPreferencesReady: createStoreFieldSetter(
                () => store.getState().runtime,
                store.updateRuntime,
                'areInitialPreferencesReady',
            ),
            setOptimizationMode: createStoreFieldSetter(
                () => store.getState().runtime,
                store.updateRuntime,
                'optimizationMode',
            ),
            setPromptThinkingLevel: createStoreFieldSetter(
                () => store.getState().runtime,
                store.updateRuntime,
                'promptThinkingLevel',
            ),
            setShowExportResultsModal: createStoreFieldSetter(
                () => store.getState().surface,
                store.updateSurface,
                'showExportResultsModal',
            ),
            setShowMetadataViewerDrawer: createStoreFieldSetter(
                () => store.getState().surface,
                store.updateSurface,
                'showMetadataViewerDrawer',
            ),
            setActiveWorkspaceDetailModal: createStoreFieldSetter(
                () => store.getState().surface,
                store.updateSurface,
                'activeWorkspaceDetailModal',
            ),
            setIsQueuedBatchSpaceOpen: createStoreFieldSetter(
                () => store.getState().surface,
                store.updateSurface,
                'isQueuedBatchSpaceOpen',
            ),
            setShowClearWorkspaceConfirm: createStoreFieldSetter(
                () => store.getState().surface,
                store.updateSurface,
                'showClearWorkspaceConfirm',
            ),
            setShowSketchReplaceConfirm: createStoreFieldSetter(
                () => store.getState().surface,
                store.updateSurface,
                'showSketchReplaceConfirm',
            ),
            setIsSketchPadOpen: createStoreFieldSetter(
                () => store.getState().surface,
                store.updateSurface,
                'isSketchPadOpen',
            ),
            setIsAdvancedSettingsOpen: createStoreFieldSetter(
                () => store.getState().surface,
                store.updateSurface,
                'isAdvancedSettingsOpen',
            ),
            setIsViewerOpen: createStoreFieldSetter(
                () => store.getState().surface,
                store.updateSurface,
                'isViewerOpen',
            ),
            setActivePickerSheet: createStoreFieldSetter(
                () => store.getState().surface,
                store.updateSurface,
                'activePickerSheet',
            ),
            setBranchRenameDialog: createStoreFieldSetter(
                () => store.getState().surface,
                store.updateSurface,
                'branchRenameDialog',
            ),
            setBranchRenameDraft: createStoreFieldSetter(
                () => store.getState().surface,
                store.updateSurface,
                'branchRenameDraft',
            ),
            setIsEditing: createStoreFieldSetter(() => store.getState().surface, store.updateSurface, 'isEditing'),
            setEditingImageSource: createStoreFieldSetter(
                () => store.getState().surface,
                store.updateSurface,
                'editingImageSource',
            ),
            setEditorMode: createStoreFieldSetter(() => store.getState().surface, store.updateSurface, 'editorMode'),
            setEditorRetouchLockedRatio: createStoreFieldSetter(
                () => store.getState().surface,
                store.updateSurface,
                'editorRetouchLockedRatio',
            ),
            setSurfaceSharedControlsBottom: createStoreFieldSetter(
                () => store.getState().surface,
                store.updateSurface,
                'surfaceSharedControlsBottom',
            ),
            setWorkspaceFloatingHostElement: createStoreFieldSetter(
                () => store.getState().surface,
                store.updateSurface,
                'workspaceFloatingHostElement',
            ),
            setWorkspaceSession: createStoreFieldSetter(
                () => store.getState().sessionAndLineage,
                store.updateSessionAndLineage,
                'workspaceSession',
            ),
            setPendingProvenanceContext: createStoreFieldSetter(
                () => store.getState().sessionAndLineage,
                store.updateSessionAndLineage,
                'pendingProvenanceContext',
            ),
            setBranchNameOverrides: createStoreFieldSetter(
                () => store.getState().sessionAndLineage,
                store.updateSessionAndLineage,
                'branchNameOverrides',
            ),
            setBranchContinuationSourceByBranchOriginId: createStoreFieldSetter(
                () => store.getState().sessionAndLineage,
                store.updateSessionAndLineage,
                'branchContinuationSourceByBranchOriginId',
            ),
            setConversationState: createStoreFieldSetter(
                () => store.getState().sessionAndLineage,
                store.updateSessionAndLineage,
                'conversationState',
            ),
            setIsCancelFinalizing: createStoreFieldSetter(
                () => store.getState().execution,
                store.updateExecution,
                'isCancelFinalizing',
            ),
            setActiveBatchPreviewSession: createStoreFieldSetter(
                () => store.getState().execution,
                store.updateExecution,
                'activeBatchPreviewSession',
            ),
            setActiveLiveProgressSession: createStoreFieldSetter(
                () => store.getState().execution,
                store.updateExecution,
                'activeLiveProgressSession',
            ),
            setBatchProgress: createStoreFieldSetter(
                () => store.getState().execution,
                store.updateExecution,
                'batchProgress',
            ),
        }),
        [store],
    );

    const {
        setApiKeyReady,
        setCurrentLang,
        setAreInitialPreferencesReady,
        setOptimizationMode,
        setPromptThinkingLevel,
        setShowExportResultsModal,
        setShowMetadataViewerDrawer,
        setActiveWorkspaceDetailModal,
        setIsQueuedBatchSpaceOpen,
        setShowClearWorkspaceConfirm,
        setShowSketchReplaceConfirm,
        setIsSketchPadOpen,
        setIsAdvancedSettingsOpen,
        setIsViewerOpen,
        setActivePickerSheet,
        setBranchRenameDialog,
        setBranchRenameDraft,
        setIsEditing,
        setEditingImageSource,
        setEditorMode,
        setEditorRetouchLockedRatio,
        setSurfaceSharedControlsBottom,
        setWorkspaceFloatingHostElement,
        setWorkspaceSession,
        setPendingProvenanceContext,
        setBranchNameOverrides,
        setBranchContinuationSourceByBranchOriginId,
        setConversationState,
        setIsCancelFinalizing,
        setActiveBatchPreviewSession,
        setActiveLiveProgressSession,
        setBatchProgress,
    } = domainSetters;

    const closeBranchRenameDialog = useCallback(() => {
        store.updateSurface({
            branchRenameDialog: null,
            branchRenameDraft: '',
        });
    }, [store]);

    const openBranchRenameDialog = useCallback(
        (nextState: BranchRenameDialogState) => {
            store.updateSurface({
                branchRenameDialog: nextState,
                branchRenameDraft: nextState.currentLabel,
            });
        },
        [store],
    );

    const closePickerSheet = useCallback(() => {
        setActivePickerSheet(null);
    }, [setActivePickerSheet]);

    const openSurfacePickerSheet = useCallback(
        (sheet: SurfaceSharedControlSheet) => {
            setActivePickerSheet(sheet);
        },
        [setActivePickerSheet],
    );

    useOverlayEscapeDismiss(Boolean(branchRenameDialog), closeBranchRenameDialog);

    const promoteResultArtifactsToSession = useCallback(
        (
            artifacts: ResultArtifacts | null,
            source: SessionContinuitySource | null,
            provenanceOverride?: {
                grounding?: GroundingMetadata | null;
                sessionHints?: Record<string, unknown> | null;
                mode?: ProvenanceContinuityMode | null;
                sourceHistoryId?: string | null;
                sessionSourceHistoryId?: string | null;
                sourceLineageAction?: ContinuationLineageAction | null;
                conversationId?: string | null;
                conversationBranchOriginId?: string | null;
                conversationActiveSourceHistoryId?: string | null;
                conversationTurnIds?: string[];
            },
        ) => {
            const continuityGrounding = provenanceOverride?.grounding ?? artifacts?.grounding ?? null;
            const continuitySessionHints = provenanceOverride?.sessionHints ?? artifacts?.sessionHints ?? null;
            const provenanceMode = provenanceOverride?.mode ?? (continuityGrounding ? 'live' : null);
            const provenanceSourceHistoryId = provenanceOverride?.sourceHistoryId ?? artifacts?.historyId ?? null;
            const sessionSourceHistoryId =
                provenanceOverride && Object.prototype.hasOwnProperty.call(provenanceOverride, 'sessionSourceHistoryId')
                    ? (provenanceOverride.sessionSourceHistoryId ?? null)
                    : provenanceSourceHistoryId;
            const sourceLineageAction =
                provenanceOverride && Object.prototype.hasOwnProperty.call(provenanceOverride, 'sourceLineageAction')
                    ? (provenanceOverride.sourceLineageAction ?? null)
                    : sessionSourceHistoryId
                      ? 'continue'
                      : null;

            setWorkspaceSession({
                activeResult: artifacts,
                continuityGrounding,
                continuitySessionHints,
                provenanceMode,
                provenanceSourceHistoryId,
                conversationId: provenanceOverride?.conversationId ?? null,
                conversationBranchOriginId: provenanceOverride?.conversationBranchOriginId ?? null,
                conversationActiveSourceHistoryId: provenanceOverride?.conversationActiveSourceHistoryId ?? null,
                conversationTurnIds: provenanceOverride?.conversationTurnIds ?? [],
                source,
                sourceHistoryId: sessionSourceHistoryId,
                sourceLineageAction,
                updatedAt: artifacts ? Date.now() : null,
            });
        },
        [setWorkspaceSession],
    );

    const resetWorkspaceSession = useCallback(() => {
        setWorkspaceSession(EMPTY_WORKSPACE_SESSION);
    }, [setWorkspaceSession]);

    const uploadInputRef = useRef<HTMLInputElement>(null);
    const workspaceImportInputRef = useRef<HTMLInputElement>(null);
    const composerPromptTextareaRef = useRef<HTMLTextAreaElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const languageChangeRequestRef = useRef(0);
    const lastPromotedHistoryIdRef = useRef<string | null>(
        initialWorkspaceSnapshot.history.find((item) => item.status === 'success')?.id ?? null,
    );
    const queuedBatchHistorySelectRef = useRef<((item: GeneratedImageType) => void) | null>(null);
    const cancelPendingHistoryLoadsRef = useRef<(() => void) | null>(null);

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
        stickySendIntent,
        setStickySendIntent,
        roundCount,
        setRoundCount,
        composerState,
        applyComposerState,
        applyViewerComposerSettingsSnapshot,
        setGroundingMode,
        restoreEditorComposerState,
        settingsLocked,
        setSettingsLocked,
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
        styleImages,
        orderedReferenceAssets,
        currentStageAsset,
        hasSketch,
        setObjectImages,
        setCharacterImages,
        setStyleImages,
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

    const { isHydratingBlobs, cancelPendingBlobHydration } = useWorkspaceBlobHydration({
        stagedAssets,
        setStagedAssets,
        history,
        setHistory,
        selectedHistoryId,
        generatedImageUrls,
        setGeneratedImageUrls,
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

    const [languageDictionaryRevision, setLanguageDictionaryRevision] = useState(0);

    const handleLanguageChange = useCallback(
        (nextLanguage: Language) => {
            if (nextLanguage === currentLang) {
                return;
            }

            persistLanguagePreference(nextLanguage);
            const requestId = languageChangeRequestRef.current + 1;
            languageChangeRequestRef.current = requestId;

            setCurrentLang(nextLanguage);

            if (isLanguageLoaded(nextLanguage)) {
                return;
            }

            void ensureLanguageLoaded(nextLanguage)
                .then(() => {
                    if (languageChangeRequestRef.current === requestId) {
                        setLanguageDictionaryRevision((prev) => prev + 1);
                    }
                })
                .catch((error) => {
                    if (languageChangeRequestRef.current === requestId) {
                        setCurrentLang(currentLang);
                        persistLanguagePreference(currentLang);
                    }

                    console.error(`Failed to load translations for ${nextLanguage}.`, error);
                });
        },
        [currentLang, setCurrentLang],
    );

    const t = useCallback(
        (key: string) => getTranslation(currentLang, key),
        [areInitialPreferencesReady, currentLang, languageDictionaryRevision],
    );
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

    const {
        videoReference,
        setVideoReference,
        isUploadingVideo,
        cancelActiveVideoUpload,
        handleVideoReferenceChange,
        handleUploadVideoFile,
    } = useVideoReferenceManager({
        imageModel,
        apiKeyReady,
        setApiKeyReady,
        handleApiKeyConnect,
        t,
    });

    const {
        getBatchVisualSlotIndex,
        silentlyShowHistoryItemOnStage,
        silentlyShowFailedHistoryItemOnStage,
        currentViewedCompletedHistoryId,
        currentViewedCompletedHistoryItem,
        currentViewedCompletedHistoryMetadata,
    } = useStageHistorySynchronizer({
        currentStageAsset,
        selectedHistoryId,
        getHistoryTurnById,
        setHistory,
        setGeneratedImageUrls,
        setSelectedImageIndex,
        setSelectedHistoryId,
        setSelectedMetadata,
        setError,
        buildResultArtifacts,
        applySelectedResultArtifacts,
        upsertViewerStageSource,
        clearAssetRoles,
        t,
    });

    const {
        handleBatchPreviewStart,
        handleBatchPreviewTileUpdate,
        handleBatchPreviewComplete,
        handleBatchPreviewClear,
        handleBatchPreviewTileSelect,
        handleLiveProgressReset,
        handleLiveProgressEvent,
        handleHistorySelectionDuringGeneration,
    } = useBatchPreviewSession({
        activeBatchPreviewSession,
        setActiveBatchPreviewSession,
        activeLiveProgressSession,
        setActiveLiveProgressSession,
        setGeneratedImageUrls,
        setSelectedImageIndex,
        clearAssetRoles,
        resetSelectedOutputState,
        setError,
        getBatchVisualSlotIndex,
        silentlyShowHistoryItemOnStage,
        silentlyShowFailedHistoryItemOnStage,
    });

    const getModelLabel = useCallback(
        (model: ImageModel) => {
            if (model === 'gemini-nano-banana-2.1') {
                return t('modelGeminiNanoBanana21');
            }
            if (model === 'gemini-3.1-flash-image') {
                return t('modelGemini31Flash');
            }
            if (model === 'gemini-3.1-flash-lite-image') {
                return t('modelGemini31FlashLite');
            }
            if (model === 'gemini-3-pro-image') {
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
        showNotification,
        t,
        settingsLocked,
    });

    useEffect(() => {
        if (isEditing) {
            return;
        }

        setEditorMode('inpaint');
        setEditorRetouchLockedRatio(null);
    }, [isEditing, setEditorMode, setEditorRetouchLockedRatio]);

    useEffect(() => {
        if (!activeEditorLockedAspectRatio) {
            return;
        }

        if (aspectRatio !== activeEditorLockedAspectRatio) {
            setAspectRatio(activeEditorLockedAspectRatio, { bypassLock: true });
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

    const handleOptimizationModeChange = useCallback(
        (mode: OptimizationMode) => {
            const normalized = normalizeOptimizationMode(mode);
            setOptimizationMode(normalized);
            try {
                localStorage.setItem(OPTIMIZATION_MODE_STORAGE_KEY, normalized);
            } catch {
                // Ignore localStorage errors
            }
        },
        [setOptimizationMode],
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
        styleImages,
        videoInput: videoReference?.uri,
        videoMimeType: videoReference?.mimeType,
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
        roundCount,
        optimizationMode,
    });

    const handlePromptThinkingLevelChange = useCallback(
        (level: PromptThinkingLevel) => {
            setPromptThinkingLevel(level);
            try {
                localStorage.setItem('nb_prompt_thinking_level', level);
            } catch {
                // Ignore localStorage errors
            }
        },
        [setPromptThinkingLevel],
    );

    const {
        isEnhancingPrompt: isEnhancingComposerPrompt,
        activePromptTool: activeComposerPromptTool,
        handleSmartRewrite: handleComposerSmartRewrite,
        handleSurpriseMe: handleComposerSurpriseMe,
        handleImageToPrompt: handleComposerImageToPrompt,
        cancelPromptTools: cancelComposerPromptTools,
    } = usePromptTools({
        currentLanguage: currentLang,
        prompt,
        promptThinkingLevel,
        optimizationMode,
        setPrompt,
        addLog,
        showNotification,
        t,
        apiKeyReady,
        handleApiKeyConnect,
    });

    const handleAbortWorkspaceOperations = useCallback(() => {
        abortControllerRef.current?.abort('workspace-reset');
        abortControllerRef.current = null;
        setIsCancelFinalizing(false);
        cancelActiveVideoUpload();
        setVideoReference(null);
        cancelComposerPromptTools();
        cancelPendingHistoryLoadsRef.current?.();
        cancelPendingBlobHydration();
    }, [
        cancelActiveVideoUpload,
        cancelComposerPromptTools,
        cancelPendingBlobHydration,
        setIsCancelFinalizing,
        setVideoReference,
    ]);

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
        settingsLocked,
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
        setStyleImages,
        setVideoReference,
        onClearVideoUpload: cancelActiveVideoUpload,
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
        styleImageCount: styleImages.length,
        hasVideoInput: Boolean(videoReference),
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
        handleRecoverRecentQueuedJobs,
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
        styleImages,
        videoInput: videoReference?.uri,
        videoMimeType: videoReference?.mimeType,
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
        optimizationMode,
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
        isHydratingBlobs,
    });

    const {
        workspaceImportReview,
        applyWorkspaceSnapshot,
        handleCloseWorkspaceImportReview,
        handleApplyImportedWorkspaceSnapshot: rawHandleApplyImportedWorkspaceSnapshot,
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
        onAbortWorkspaceOperations: handleAbortWorkspaceOperations,
    });

    const handleApplyImportedWorkspaceSnapshot = useCallback(
        (...args: Parameters<typeof rawHandleApplyImportedWorkspaceSnapshot>) => {
            handleAbortWorkspaceOperations();
            return rawHandleApplyImportedWorkspaceSnapshot(...args);
        },
        [handleAbortWorkspaceOperations, rawHandleApplyImportedWorkspaceSnapshot],
    );

    const applyEmptyWorkspaceSnapshot = useCallback(() => {
        handleAbortWorkspaceOperations();
        clearStoredWorkspaceSnapshot();
        saveWorkspaceSnapshot(EMPTY_WORKSPACE_SNAPSHOT);
        applyWorkspaceSnapshot(EMPTY_WORKSPACE_SNAPSHOT);
    }, [applyWorkspaceSnapshot, handleAbortWorkspaceOperations]);

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

    const handleRemoveStyleReference = useCallback(
        (indexToRemove: number) => {
            removeAssetAtRoleIndex('style', indexToRemove);
        },
        [removeAssetAtRoleIndex],
    );

    const handleClearAllReferences = useCallback(() => {
        clearAssetRoles(['object', 'character', 'style']);
        cancelActiveVideoUpload();
        setVideoReference(null);
    }, [cancelActiveVideoUpload, clearAssetRoles, setVideoReference]);

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
        onAbortWorkspaceOperations: handleAbortWorkspaceOperations,
    });

    const {
        handleStartNewConversation,
        handleHistorySelect,
        handleContinueFromHistoryTurn,
        handleBranchFromHistoryTurn,
        handleImportReviewDirectAction,
        commitPendingViewerSelection,
        cancelPendingHistoryLoads,
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
    cancelPendingHistoryLoadsRef.current = cancelPendingHistoryLoads;

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
        styleImageCount: isEditing ? 0 : styleImages.length,
        hasVideoInput: !isEditing && Boolean(videoReference),
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
    }, [activePickerSheet, isSurfaceWorkspaceOpen, setActivePickerSheet, setSurfaceSharedControlsBottom]);

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
        store.updateSurface({
            activeWorkspaceDetailModal: null,
            isQueuedBatchSpaceOpen: false,
        });
    }, [store]);

    const handleOpenProgressDetails = useCallback(() => {
        store.updateSurface({
            isQueuedBatchSpaceOpen: false,
            activeWorkspaceDetailModal: 'progress',
        });
    }, [store]);

    const workspaceFloatingLayerValue = useMemo(
        () => ({
            floatingZIndex: floatingControlsZIndex + 1,
            hostElement: workspaceFloatingHostElement,
        }),
        [floatingControlsZIndex, workspaceFloatingHostElement],
    );

    const handleOpenSourcesDetails = useCallback(() => {
        store.updateSurface({
            isQueuedBatchSpaceOpen: false,
            activeWorkspaceDetailModal: 'sources',
        });
    }, [store]);

    const handleOpenVersionsDetails = useCallback(() => {
        store.updateSurface({
            isQueuedBatchSpaceOpen: false,
            activeWorkspaceDetailModal: 'versions',
        });
    }, [store]);

    const handleOpenQueuedBatchJobs = useCallback(() => {
        store.updateSurface({
            activeWorkspaceDetailModal: null,
            isQueuedBatchSpaceOpen: true,
        });
    }, [store]);

    const handleClearStyle = useCallback(() => {
        setImageStyle('None');
    }, [setImageStyle]);

    const handleToggleSettingsLock = useCallback(() => {
        setSettingsLocked((prev) => !prev);
    }, [setSettingsLocked]);

    const handleClearVideoReference = useCallback(() => {
        cancelActiveVideoUpload();
        setVideoReference(null);
    }, [cancelActiveVideoUpload, setVideoReference]);

    const handleOpenMetadataViewer = useCallback(() => {
        setShowMetadataViewerDrawer(true);
    }, [setShowMetadataViewerDrawer]);

    const handleCloseMetadataViewer = useCallback(() => {
        setShowMetadataViewerDrawer(false);
    }, [setShowMetadataViewerDrawer]);

    const handleOpenExportResultsModal = useCallback(() => {
        setShowExportResultsModal(true);
    }, [setShowExportResultsModal]);

    const handleCloseExportResultsModal = useCallback(() => {
        setShowExportResultsModal(false);
    }, [setShowExportResultsModal]);

    const handleOpenDebugTerminal = useCallback(() => {
        store.updateSurface({ isDebugTerminalOpen: true });
    }, [store]);

    const composerSettingsPanelProps = useComposerSettingsPanelProps({
        prompt,
        placeholder: t('placeholder'),
        enterToSubmit,
        isGenerating: isForegroundGenerationLocked,
        isActionLocked: isGenerating || isUploadingVideo,
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
        setBatchSize,
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
        roundCount,
        setRoundCount,
        batchProgress,
        settingsLocked,
        onToggleSettingsLock: handleToggleSettingsLock,
        showNotification,
        promptThinkingLevel,
        onPromptThinkingLevelChange: handlePromptThinkingLevelChange,
        objectImages: surfaceObjectImages,
        characterImages: surfaceCharacterImages,
        styleImages,
        videoReference,
        onClearVideoReference: handleClearVideoReference,
        openMetadataViewer: handleOpenMetadataViewer,
    });

    const advancedSettingsDialogProps: React.ComponentProps<typeof ComposerAdvancedSettingsDialog> | null =
        isAdvancedSettingsOpen
            ? {
                  currentLanguage: currentLang,
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

    const { handleApplyPromptFromViewer, handleApplySettingsFromViewer, handleApplyBothFromMetadataViewer } =
        useViewerPromptAndMetadataApplyActions({
            composerPromptTextareaRef,
            setPrompt,
            applyViewerComposerSettingsSnapshot,
            setShowMetadataViewerDrawer,
            showNotification,
            t,
        });

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

    const handleViewerSelectHistoryItem = useCallback(
        (historyId: string) => {
            const historyItem = getHistoryTurnById(historyId);
            if (historyItem) {
                handleHistorySelect(historyItem, { deferLineageCommit: true });
            }
        },
        [getHistoryTurnById, handleHistorySelect],
    );

    const { handleDownloadStageImage, handleDownloadThoughtImage } = useStageImageDownloadActions({
        history,
        currentViewedCompletedHistoryItem,
        selectedMetadata,
        viewPrompt: viewSettings.prompt,
        stageViewerSettings,
        outputFormat,
        temperature,
        thinkingLevel,
        includeThoughts,
        googleSearch,
        imageSearch,
        generationMode,
        executionMode,
        selectedImageIndex,
        getHistoryTurnById,
        showNotification,
        t,
    });

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
        isEnhancingPrompt: isEditing ? false : isEnhancingComposerPrompt,
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
        styleImages,
        setObjectImages: setSurfaceObjectImages,
        isGenerating: isForegroundGenerationLocked,
        showNotification,
        handleRemoveObjectReference: handleSurfaceRemoveObjectReference,
        setCharacterImages: setSurfaceCharacterImages,
        handleRemoveCharacterReference: handleSurfaceRemoveCharacterReference,
        setStyleImages,
        handleRemoveStyleReference,
        showStyleEntry: !isEditing,
        videoReference,
        onVideoReferenceChange: isEditing ? undefined : handleVideoReferenceChange,
        onUploadVideoFile: isEditing ? undefined : handleUploadVideoFile,
        isUploadingVideo: isEditing ? false : isUploadingVideo,
        onCancelVideoUpload: isEditing ? undefined : cancelActiveVideoUpload,
    });

    const handleOpenClearWorkspaceConfirm = useCallback(() => {
        setShowClearWorkspaceConfirm(true);
    }, [setShowClearWorkspaceConfirm]);

    const handleCloseClearWorkspaceConfirm = useCallback(() => {
        setShowClearWorkspaceConfirm(false);
    }, [setShowClearWorkspaceConfirm]);

    const handleConfirmClearWorkspace = useCallback(
        (clearOutput?: boolean) => {
            setShowClearWorkspaceConfirm(false);
            void handleClearGalleryHistory({ clearOutput });
        },
        [handleClearGalleryHistory, setShowClearWorkspaceConfirm],
    );

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

    const canRepaintCurrentImage = Boolean(getActiveImageUrl());

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
            currentStageAsset?.sourceHistoryId,
            getBranchAccentClassName,
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
            workspaceSession.sourceHistoryId,
        ],
    );

    return {
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
        branchSummariesCount: branchSummaries.length,
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
        selectedSourcesCount: selectedSources.length,
        selectedSupportBundlesCount: selectedSupportBundles.length,
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
    };
}

export { useWorkspaceStageViewer, useWorkspaceTopHeaderProps };
