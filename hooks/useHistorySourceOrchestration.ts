import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import {
    GeneratedImage as GeneratedImageType,
    PendingProvenanceContext,
    ResultArtifacts,
    SessionContinuitySource,
    TurnLineageAction,
    WorkspaceComposerState,
    WorkspaceConversationState,
    WorkspaceSessionState,
} from '../types';
import { loadFullImage } from '../utils/imageSaveUtils';
import { encodeWorkflowMessage } from '../utils/workflowTimeline';
import { buildWorkspaceComposerStateFromHistoryItem } from '../utils/workspaceSnapshotState';
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
        conversationId?: string | null;
        conversationBranchOriginId?: string | null;
        conversationActiveSourceHistoryId?: string | null;
        conversationTurnIds?: string[];
    },
) => void;

type UseHistorySourceOrchestrationArgs = {
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
    clearAssetRoles: (roles: Array<'object' | 'character' | 'editor-base' | 'stage-source'>) => void;
    buildResultArtifacts: (
        item: Pick<GeneratedImageType, 'text' | 'thoughts' | 'grounding' | 'metadata' | 'sessionHints' | 'id'>,
    ) => ResultArtifacts;
    applySelectedResultArtifacts: (artifacts: ResultArtifacts | null) => void;
    promoteResultArtifactsToSession: PromoteResultArtifactsToSession;
    applyComposerState: (nextComposerState: WorkspaceComposerState) => void;
    setPendingProvenanceContext: Dispatch<SetStateAction<PendingProvenanceContext | null>>;
    setConversationState: Dispatch<SetStateAction<WorkspaceConversationState>>;
    setBranchContinuationSourceByBranchOriginId: Dispatch<SetStateAction<Record<string, string>>>;
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

export function useHistorySourceOrchestration({
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
    clearActivePickerSheet,
}: UseHistorySourceOrchestrationArgs) {
    const [pendingImportedWorkspaceAction, setPendingImportedWorkspaceAction] =
        useState<PendingImportedWorkspaceAction>(null);
    const selectedHistoryLineageActionRef = useRef<TurnLineageAction | undefined>(currentStageLineageAction);
    const handleStartNewConversation = useCallback(() => {
        handleClearResults();
        setPendingProvenanceContext(null);
        resetSelectedOutputState();
        resetWorkspaceSession();
        setConversationState(EMPTY_WORKSPACE_CONVERSATION_STATE);
        setEditingImageSource(null);
        clearAssetRoles(['stage-source', 'editor-base']);
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
        showNotification,
        t,
    ]);

    const handleHistorySelect = useCallback(
        (item: GeneratedImageType, options?: { preserveComposer?: boolean; lineageAction?: TurnLineageAction }) => {
            const preserveComposer = Boolean(options?.preserveComposer);
            const lineageAction = options?.lineageAction || 'reopen';
            const shortHistoryId = item.id.slice(0, 8);

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
                      sessionSourceHistoryId: item.id,
                  }
                : { sessionSourceHistoryId: item.id };
            const branchOriginId = lineageAction === 'branch' ? item.id : branchOriginIdByTurnId[item.id] || item.id;
            const nextConversationState =
                lineageAction === 'continue' || lineageAction === 'branch'
                    ? promoteConversationSource(conversationState, branchOriginId, item.id, lineageAction)
                    : conversationState;
            const conversationSelection =
                lineageAction === 'continue' || lineageAction === 'branch'
                    ? {
                          branchOriginId,
                          ...getConversationSelectionState(nextConversationState, branchOriginId, item.id),
                      }
                    : resolveConversationSelectionState(nextConversationState, {
                          selectedHistoryId: item.id,
                          preferredBranchOriginId: branchOriginId,
                          conversationBranchOriginId:
                              item.conversationBranchOriginId || workspaceSession.conversationBranchOriginId,
                      });

            setGeneratedImageUrls([item.url]);
            setSelectedImageIndex(0);
            applySelectedResultArtifacts(historyArtifacts);
            promoteResultArtifactsToSession(historyArtifacts, 'history', {
                ...provenanceOverride,
                conversationId: conversationSelection.conversationId,
                conversationBranchOriginId: conversationSelection.conversationId
                    ? conversationSelection.branchOriginId
                    : null,
                conversationActiveSourceHistoryId: conversationSelection.conversationActiveSourceHistoryId,
                conversationTurnIds: conversationSelection.conversationTurnIds,
            });
            setError(null);
            setLogs([
                `[${new Date(item.createdAt).toLocaleTimeString()}] ${encodeWorkflowMessage('historySourceLoadedLog')}`,
            ]);

            if (lineageAction === 'continue') {
                setBranchContinuationSourceByBranchOriginId((prev) => ({
                    ...prev,
                    [branchOriginId]: item.id,
                }));
                setConversationState(nextConversationState);
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
                setConversationState(nextConversationState);
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
                    .then((fullUrl) => {
                        if (fullUrl) {
                            setGeneratedImageUrls([fullUrl]);
                            upsertViewerStageSource({
                                origin: 'history',
                                url: fullUrl,
                                savedFilename: item.savedFilename,
                                sourceHistoryId: item.id,
                                lineageAction,
                            });
                        }
                    })
                    .catch((err) => {
                        console.warn('loadFullImage failed:', err.message);
                    });
            }

            if (!preserveComposer) {
                applyComposerState(buildWorkspaceComposerStateFromHistoryItem(item));
            }

            clearAssetRoles(['object', 'character', 'editor-base']);
            setIsGenerating(false);
        },
        [
            addLog,
            applyComposerState,
            applySelectedResultArtifacts,
            branchOriginIdByTurnId,
            buildResultArtifacts,
            clearAssetRoles,
            conversationState,
            promoteResultArtifactsToSession,
            setBranchContinuationSourceByBranchOriginId,
            setConversationState,
            setError,
            setGeneratedImageUrls,
            setIsGenerating,
            setLogs,
            setSelectedHistoryId,
            setSelectedImageIndex,
            showNotification,
            t,
            upsertViewerStageSource,
            workspaceSession,
        ],
    );

    const handleContinueFromHistoryTurn = useCallback(
        (item: GeneratedImageType) => {
            handleHistorySelect(item, { preserveComposer: false, lineageAction: 'continue' });
            clearActivePickerSheet();
        },
        [clearActivePickerSheet, handleHistorySelect],
    );

    const handleBranchFromHistoryTurn = useCallback(
        (item: GeneratedImageType) => {
            handleHistorySelect(item, { preserveComposer: true, lineageAction: 'branch' });
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
