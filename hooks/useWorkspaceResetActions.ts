import { Dispatch, MutableRefObject, SetStateAction, useCallback } from 'react';
import { WorkspaceConversationState } from '../types';
import { EMPTY_WORKSPACE_CONVERSATION_STATE } from '../utils/conversationState';

type PickerSheet =
    | 'prompt'
    | 'history'
    | 'templates'
    | 'styles'
    | 'model'
    | 'ratio'
    | 'size'
    | 'batch'
    | 'references'
    | null;

type UseWorkspaceResetActionsArgs = {
    activePickerSheet: PickerSheet;
    lastPromotedHistoryIdRef: MutableRefObject<string | null>;
    handleClearResults: () => void;
    handleClearHistory: () => void;
    resetSelectedOutputState: () => void;
    clearAssetRoles: (roles: Array<'object' | 'character' | 'stage-source'>) => void;
    resetWorkspaceSession: () => void;
    closePickerSheet: () => void;
    setBranchNameOverrides: Dispatch<SetStateAction<Record<string, string>>>;
    setBranchContinuationSourceByBranchOriginId: Dispatch<SetStateAction<Record<string, string>>>;
    setConversationState: Dispatch<SetStateAction<WorkspaceConversationState>>;
    setSelectedHistoryId: Dispatch<SetStateAction<string | null>>;
};

export function useWorkspaceResetActions({
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
}: UseWorkspaceResetActionsArgs) {
    const handleClearCurrentStage = useCallback(() => {
        handleClearResults();
        clearAssetRoles(['stage-source']);
    }, [clearAssetRoles, handleClearResults]);

    const handleClearGalleryHistory = useCallback(() => {
        handleClearHistory();
        resetSelectedOutputState();
        setBranchNameOverrides({});
        setBranchContinuationSourceByBranchOriginId({});
        setConversationState(EMPTY_WORKSPACE_CONVERSATION_STATE);
        setSelectedHistoryId(null);
        lastPromotedHistoryIdRef.current = null;
        resetWorkspaceSession();
        clearAssetRoles(['stage-source']);
    }, [
        clearAssetRoles,
        closePickerSheet,
        handleClearHistory,
        lastPromotedHistoryIdRef,
        resetSelectedOutputState,
        resetWorkspaceSession,
        setBranchContinuationSourceByBranchOriginId,
        setBranchNameOverrides,
        setConversationState,
        setSelectedHistoryId,
    ]);

    return {
        handleClearCurrentStage,
        handleClearGalleryHistory,
    };
}
