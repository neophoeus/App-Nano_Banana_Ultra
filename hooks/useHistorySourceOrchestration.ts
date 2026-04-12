import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import {
    ContinuationLineageAction,
    GeneratedImage as GeneratedImageType,
    PendingProvenanceContext,
    ResultArtifacts,
    SessionContinuitySource,
    TurnLineageAction,
    WorkspaceConversationState,
    WorkspaceSessionState,
    StickySendIntent,
} from '../types';
import { loadFullImage, persistHistoryThumbnail } from '../utils/imageSaveUtils';
import { encodeWorkflowMessage } from '../utils/workflowTimeline';
import {
    EMPTY_WORKSPACE_CONVERSATION_STATE,
    getConversationSelectionState,
    promoteConversationSource,
    resolveConversationSelectionState,
} from '../utils/conversationState';

type PendingImportedWorkspaceAction = {
    action: 'open' | 'continue' | 'branch';
    historyId: string;
} | null;

type PromoteResultArtifactsToSession = (
    artifacts: ResultArtifacts | null,
    source: SessionContinuitySource | null,
    provenanceOverride?: {
        grounding?: WorkspaceSessionState['continuityGrounding'];
        sessionHints?: WorkspaceSessionState['continuitySessionHints'];
        mode?: WorkspaceSessionState['provenanceMode'];
        sourceHistoryId?: string | null;
        sessionSourceHistoryId?: string | null;
        sourceLineageAction?: ContinuationLineageAction | null;
        conversationId?: string | null;
        conversationBranchOriginId?: string | null;
        conversationActiveSourceHistoryId?: string | null;
        conversationTurnIds?: string[];
    },
) => void;

type UseHistorySourceOrchestrationArgs = {
    history: GeneratedImageType[];
    generatedImageUrls: string[];
    selectedImageIndex: number;
    selectedHistoryId: string | null;
    isGenerating: boolean;
    currentStageSourceHistoryId: string | null;
    currentStageLineageAction?: TurnLineageAction;
    workspaceSession: WorkspaceSessionState;
    conversationState: WorkspaceConversationState;
    branchOriginIdByTurnId: Record<string, string>;
    handleApplyImportedWorkspaceSnapshot: (options?: { announceRestoreToast?: boolean }) => void;
    getHistoryTurnById: (historyId?: string | null) => GeneratedImageType | null;
    handleClearResults: () => void;
    resetSelectedOutputState: () => void;
    resetWorkspaceSession: () => void;
    clearAssetRoles: (roles: Array<'object' | 'character' | 'stage-source'>) => void;
    buildResultArtifacts: (
        item: Pick<GeneratedImageType, 'text' | 'thoughts' | 'grounding' | 'metadata' | 'sessionHints' | 'id'>,
    ) => ResultArtifacts;
    applySelectedResultArtifacts: (artifacts: ResultArtifacts | null) => void;
    promoteResultArtifactsToSession: PromoteResultArtifactsToSession;
    setPendingProvenanceContext: Dispatch<SetStateAction<PendingProvenanceContext | null>>;
    setStickySendIntent: Dispatch<SetStateAction<StickySendIntent>>;
    setConversationState: Dispatch<SetStateAction<WorkspaceConversationState>>;
    setBranchContinuationSourceByBranchOriginId: Dispatch<SetStateAction<Record<string, string>>>;
    setHistory: Dispatch<SetStateAction<GeneratedImageType[]>>;
    setEditingImageSource: Dispatch<SetStateAction<string | null>>;
    setGeneratedImageUrls: Dispatch<SetStateAction<string[]>>;
    setSelectedImageIndex: Dispatch<SetStateAction<number>>;
    setSelectedHistoryId: Dispatch<SetStateAction<string | null>>;
    setError: Dispatch<SetStateAction<string | null>>;
    setLogs: Dispatch<SetStateAction<string[]>>;
    setIsGenerating: Dispatch<SetStateAction<boolean>>;
    upsertViewerStageSource: (args: {
        url: string;
        origin: 'generated' | 'history' | 'upload' | 'sketch' | 'editor';
        savedFilename?: string;
        sourceHistoryId?: string;
        lineageAction?: TurnLineageAction;
    }) => void;
    addLog: (message: string) => void;
    showNotification: (message: string, type?: 'info' | 'error') => void;
    t: (key: string) => string;
    clearActivePickerSheet: () => void;
    onHistorySelectWhileGenerating?: (item: GeneratedImageType) => void;
};

type ResolveViewerStageSourceSyncArgs = {
    currentViewerImage: string;
    selectedHistoryId: string | null;
    currentStageSourceHistoryId: string | null;
    currentStageLineageAction?: TurnLineageAction;
    selectedHistoryLineageAction?: TurnLineageAction;
    getHistoryTurnById: (historyId?: string | null) => GeneratedImageType | null;
};

export const resolveViewerStageSourceSyncArgs = ({
    currentViewerImage,
    selectedHistoryId,
    currentStageSourceHistoryId,
    currentStageLineageAction,
    selectedHistoryLineageAction,
    getHistoryTurnById,
}: ResolveViewerStageSourceSyncArgs) => {
    if (!currentViewerImage) {
        return null;
    }

    const selectedHistoryItem = selectedHistoryId ? getHistoryTurnById(selectedHistoryId) : null;
    const shouldUseSelectedHistory = Boolean(
        selectedHistoryId &&
        selectedHistoryItem &&
        (currentStageSourceHistoryId === selectedHistoryId || selectedHistoryItem.url === currentViewerImage),
    );
    const nextSourceHistoryId = shouldUseSelectedHistory ? selectedHistoryId : currentStageSourceHistoryId;
    const nextHistoryItem = nextSourceHistoryId ? getHistoryTurnById(nextSourceHistoryId) : null;

    return {
        origin: nextSourceHistoryId ? ('history' as const) : ('generated' as const),
        url: currentViewerImage,
        savedFilename: nextHistoryItem?.savedFilename,
        sourceHistoryId: nextSourceHistoryId || undefined,
        lineageAction: shouldUseSelectedHistory ? selectedHistoryLineageAction : currentStageLineageAction,
    };
};

const isInlineHistoryPreviewUrl = (value?: string | null) => Boolean(value && value.startsWith('data:'));

export function useHistorySourceOrchestration({
    history,
    generatedImageUrls,
    selectedImageIndex,
    selectedHistoryId,
    isGenerating,
    currentStageSourceHistoryId,
    currentStageLineageAction,
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
    clearActivePickerSheet,
    onHistorySelectWhileGenerating,
}: UseHistorySourceOrchestrationArgs) {
    const [pendingImportedWorkspaceAction, setPendingImportedWorkspaceAction] =
        useState<PendingImportedWorkspaceAction>(null);
    const selectedHistoryLineageActionRef = useRef<TurnLineageAction | undefined>(currentStageLineageAction);
    const historyThumbnailRepairInFlightRef = useRef<Set<string>>(new Set());
    const repairLegacyHistoryThumbnail = useCallback(
        async (item: GeneratedImageType, fullImageUrl?: string | null) => {
            if (
                !item.savedFilename ||
                item.thumbnailSavedFilename ||
                (!isInlineHistoryPreviewUrl(item.url) && item.url) ||
                historyThumbnailRepairInFlightRef.current.has(item.id)
            ) {
                return;
            }

            historyThumbnailRepairInFlightRef.current.add(item.id);

            try {
                const resolvedFullImageUrl = fullImageUrl || (await loadFullImage(item.savedFilename));
                if (!resolvedFullImageUrl) {
                    return;
                }

                const persistedThumbnail = await persistHistoryThumbnail(
                    resolvedFullImageUrl,
                    `${item.model}-history`,
                    item.savedFilename,
                );
                const hasSafePreview =
                    Boolean(persistedThumbnail.thumbnailSavedFilename) ||
                    persistedThumbnail.url !== resolvedFullImageUrl;

                if (!hasSafePreview) {
                    return;
                }

                setHistory((previousHistory) =>
                    previousHistory.map((historyItem) =>
                        historyItem.id === item.id &&
                        !historyItem.thumbnailSavedFilename &&
                        (!historyItem.url || isInlineHistoryPreviewUrl(historyItem.url))
                            ? {
                                  ...historyItem,
                                  url: persistedThumbnail.url,
                                  thumbnailSavedFilename:
                                      persistedThumbnail.thumbnailSavedFilename || historyItem.thumbnailSavedFilename,
                                  thumbnailInline: persistedThumbnail.thumbnailInline || historyItem.thumbnailInline,
                              }
                            : historyItem,
                    ),
                );
            } catch (error) {
                console.warn('history thumbnail self-heal failed:', error);
            } finally {
                historyThumbnailRepairInFlightRef.current.delete(item.id);
            }
        },
        [setHistory],
    );
    const handleStartNewConversation = useCallback(() => {
        handleClearResults();
        setPendingProvenanceContext(null);
        setStickySendIntent('independent');
        resetSelectedOutputState();
        resetWorkspaceSession();
        setConversationState(EMPTY_WORKSPACE_CONVERSATION_STATE);
        setEditingImageSource(null);
        clearAssetRoles(['stage-source']);
        showNotification(t('historySourceStartConversationNotice'), 'info');
        addLog(encodeWorkflowMessage('historySourceStartConversationLog'));
    }, [
        addLog,
        clearAssetRoles,
        handleClearResults,
        resetSelectedOutputState,
        resetWorkspaceSession,
        setConversationState,
        setEditingImageSource,
        setPendingProvenanceContext,
        setStickySendIntent,
        showNotification,
        t,
    ]);

    const resolveDefaultHistorySelectionLineageAction = useCallback(
        (item: GeneratedImageType): ContinuationLineageAction => {
            const branchOriginId = branchOriginIdByTurnId[item.id] || item.id;
            let latestBranchTurn: GeneratedImageType | null = null;

            history.forEach((historyItem) => {
                if (historyItem.status !== 'success') {
                    return;
                }

                const historyItemBranchOriginId = branchOriginIdByTurnId[historyItem.id] || historyItem.id;
                if (historyItemBranchOriginId !== branchOriginId) {
                    return;
                }

                if (!latestBranchTurn || historyItem.createdAt >= latestBranchTurn.createdAt) {
                    latestBranchTurn = historyItem;
                }
            });

            return latestBranchTurn?.id === item.id ? 'continue' : 'branch';
        },
        [branchOriginIdByTurnId, history],
    );

    const handleHistorySelect = useCallback(
        (item: GeneratedImageType, options?: { lineageAction?: TurnLineageAction }) => {
            const lineageAction =
                options?.lineageAction ||
                (item.status === 'success' ? resolveDefaultHistorySelectionLineageAction(item) : 'reopen');
            const isRouteMutation = lineageAction === 'continue' || lineageAction === 'branch';
            const shortHistoryId = item.id.slice(0, 8);

            if (isGenerating) {
                onHistorySelectWhileGenerating?.(item);
            }

            if (item.status === 'failed') {
                selectedHistoryLineageActionRef.current = undefined;
                setGeneratedImageUrls([]);
                setSelectedImageIndex(0);
                applySelectedResultArtifacts(null);
                setSelectedHistoryId(item.id);
                setError(item.error || t('statusFailed'));
                setLogs([
                    `[${new Date(item.createdAt).toLocaleTimeString()}] ${encodeWorkflowMessage('historySourceFailedLog', item.error || t('statusFailed'))}`,
                ]);
                clearAssetRoles(['stage-source']);
                return;
            }

            const historyArtifacts = buildResultArtifacts(item);
            const shouldPreserveSessionProvenance = workspaceSession.activeResult?.historyId === item.id;
            const provenanceOverride = shouldPreserveSessionProvenance
                ? {
                      grounding: workspaceSession.continuityGrounding,
                      sessionHints: workspaceSession.continuitySessionHints,
                      mode: workspaceSession.provenanceMode,
                      sourceHistoryId: workspaceSession.provenanceSourceHistoryId ?? item.id,
                  }
                : undefined;
            const branchOriginId = lineageAction === 'branch' ? item.id : branchOriginIdByTurnId[item.id] || item.id;
            const nextConversationState = isRouteMutation
                ? promoteConversationSource(conversationState, branchOriginId, item.id, lineageAction)
                : conversationState;
            const conversationSelection = isRouteMutation
                ? {
                      branchOriginId,
                      ...getConversationSelectionState(nextConversationState, branchOriginId, item.id),
                  }
                : null;

            setGeneratedImageUrls([item.url]);
            setSelectedImageIndex(0);
            applySelectedResultArtifacts(historyArtifacts);
            if (isRouteMutation) {
                setBranchContinuationSourceByBranchOriginId((prev) => ({
                    ...prev,
                    [branchOriginId]: item.id,
                }));
                setConversationState(nextConversationState);
                promoteResultArtifactsToSession(historyArtifacts, 'history', {
                    ...provenanceOverride,
                    sessionSourceHistoryId: item.id,
                    sourceLineageAction: lineageAction,
                    conversationId: conversationSelection?.conversationId ?? null,
                    conversationBranchOriginId: conversationSelection?.conversationId
                        ? conversationSelection.branchOriginId
                        : null,
                    conversationActiveSourceHistoryId: conversationSelection?.conversationActiveSourceHistoryId ?? null,
                    conversationTurnIds: conversationSelection?.conversationTurnIds ?? [],
                });
            }
            setError(null);
            setLogs([
                `[${new Date(item.createdAt).toLocaleTimeString()}] ${encodeWorkflowMessage('historySourceLoadedLog')}`,
            ]);

            if (lineageAction === 'continue') {
                showNotification(
                    item.variantGroupId ? t('historySourceVariantContinueNotice') : t('historySourceContinueNotice'),
                    'info',
                );
                addLog(
                    item.variantGroupId
                        ? encodeWorkflowMessage('historySourceVariantContinueLog', shortHistoryId)
                        : encodeWorkflowMessage('historySourceContinueLog', shortHistoryId),
                );
            } else if (lineageAction === 'branch') {
                showNotification(t('historySourceBranchNotice'), 'info');
                addLog(encodeWorkflowMessage('historySourceBranchLog', shortHistoryId));
            } else {
                showNotification(t('historySourceReopenNotice'), 'info');
                addLog(encodeWorkflowMessage('historySourceReopenLog', shortHistoryId));
            }

            selectedHistoryLineageActionRef.current = lineageAction;
            upsertViewerStageSource({
                origin: 'history',
                url: item.url,
                savedFilename: item.savedFilename,
                sourceHistoryId: item.id,
                lineageAction,
            });

            if (item.savedFilename) {
                loadFullImage(item.savedFilename)
                    .then(async (fullUrl) => {
                        if (fullUrl) {
                            setGeneratedImageUrls([fullUrl]);
                            upsertViewerStageSource({
                                origin: 'history',
                                url: fullUrl,
                                savedFilename: item.savedFilename,
                                sourceHistoryId: item.id,
                                lineageAction,
                            });
                            void repairLegacyHistoryThumbnail(item, fullUrl);
                        }
                    })
                    .catch((err) => {
                        console.warn('loadFullImage failed:', err.message);
                    });
            }

            clearAssetRoles(['object', 'character']);
        },
        [
            addLog,
            applySelectedResultArtifacts,
            branchOriginIdByTurnId,
            buildResultArtifacts,
            clearAssetRoles,
            conversationState,
            history,
            isGenerating,
            onHistorySelectWhileGenerating,
            promoteResultArtifactsToSession,
            resolveDefaultHistorySelectionLineageAction,
            setBranchContinuationSourceByBranchOriginId,
            setConversationState,
            setError,
            setGeneratedImageUrls,
            setHistory,
            setLogs,
            setSelectedHistoryId,
            setSelectedImageIndex,
            showNotification,
            t,
            repairLegacyHistoryThumbnail,
            upsertViewerStageSource,
            workspaceSession,
        ],
    );

    useEffect(() => {
        if (isGenerating) {
            return;
        }

        const candidateHistoryId = currentStageSourceHistoryId || selectedHistoryId;
        if (!candidateHistoryId) {
            return;
        }

        const candidateHistoryItem = getHistoryTurnById(candidateHistoryId);
        if (!candidateHistoryItem) {
            return;
        }

        void repairLegacyHistoryThumbnail(candidateHistoryItem);
    }, [
        currentStageSourceHistoryId,
        getHistoryTurnById,
        isGenerating,
        repairLegacyHistoryThumbnail,
        selectedHistoryId,
    ]);

    const handleContinueFromHistoryTurn = useCallback(
        (item: GeneratedImageType) => {
            handleHistorySelect(item, { lineageAction: 'continue' });
            clearActivePickerSheet();
        },
        [clearActivePickerSheet, handleHistorySelect],
    );

    const handleBranchFromHistoryTurn = useCallback(
        (item: GeneratedImageType) => {
            handleHistorySelect(item, { lineageAction: 'branch' });
            clearActivePickerSheet();
        },
        [clearActivePickerSheet, handleHistorySelect],
    );

    const handleImportReviewDirectAction = useCallback(
        (action: 'open' | 'continue' | 'branch', historyId: string) => {
            setPendingImportedWorkspaceAction({ action, historyId });
            handleApplyImportedWorkspaceSnapshot({ announceRestoreToast: true });
        },
        [handleApplyImportedWorkspaceSnapshot],
    );

    useEffect(() => {
        if (!pendingImportedWorkspaceAction) {
            return;
        }

        const importedTurn = getHistoryTurnById(pendingImportedWorkspaceAction.historyId);
        if (!importedTurn) {
            return;
        }

        if (pendingImportedWorkspaceAction.action === 'open') {
            handleHistorySelect(importedTurn);
        } else if (pendingImportedWorkspaceAction.action === 'continue') {
            handleContinueFromHistoryTurn(importedTurn);
        } else {
            handleBranchFromHistoryTurn(importedTurn);
        }

        setPendingImportedWorkspaceAction(null);
    }, [
        getHistoryTurnById,
        handleBranchFromHistoryTurn,
        handleContinueFromHistoryTurn,
        handleHistorySelect,
        pendingImportedWorkspaceAction,
    ]);

    useEffect(() => {
        const currentViewerImage = generatedImageUrls[selectedImageIndex] || generatedImageUrls[0] || '';

        if (!currentViewerImage || isGenerating) {
            return;
        }

        const nextStageSource = resolveViewerStageSourceSyncArgs({
            currentViewerImage,
            selectedHistoryId,
            currentStageSourceHistoryId,
            currentStageLineageAction,
            selectedHistoryLineageAction: selectedHistoryLineageActionRef.current,
            getHistoryTurnById,
        });

        if (!nextStageSource) {
            return;
        }

        upsertViewerStageSource(nextStageSource);
    }, [
        currentStageSourceHistoryId,
        currentStageLineageAction,
        generatedImageUrls,
        getHistoryTurnById,
        isGenerating,
        selectedHistoryId,
        selectedImageIndex,
        upsertViewerStageSource,
    ]);

    return {
        handleStartNewConversation,
        handleHistorySelect,
        handleContinueFromHistoryTurn,
        handleBranchFromHistoryTurn,
        handleImportReviewDirectAction,
    };
}
