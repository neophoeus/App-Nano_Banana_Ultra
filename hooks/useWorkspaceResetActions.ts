import { Dispatch, MutableRefObject, SetStateAction, useCallback } from 'react';
import { WorkspaceSettingsDraft } from '../types';

type UseWorkspaceResetActionsArgs = {
    lastPromotedHistoryIdRef: MutableRefObject<string | null>;
    handleClearResults: () => void;
    clearAssetRoles: (roles: Array<'object' | 'character' | 'stage-source'>) => void;
    applyEmptyWorkspaceSnapshot: () => void;
    clearSharedWorkspaceSnapshot: () => void | Promise<void>;
    setActiveWorkspaceDetailModal: Dispatch<SetStateAction<'progress' | 'sources' | 'versions' | 'queued-jobs' | null>>;
    setIsAdvancedSettingsOpen: Dispatch<SetStateAction<boolean>>;
    setIsSketchPadOpen: Dispatch<SetStateAction<boolean>>;
    setShowSketchReplaceConfirm: Dispatch<SetStateAction<boolean>>;
    setSettingsSessionDraft: Dispatch<SetStateAction<WorkspaceSettingsDraft | null>>;
    setSettingsSessionReturnToGeneration: Dispatch<SetStateAction<boolean>>;
    setSurfaceSharedControlsBottom: Dispatch<SetStateAction<number | null>>;
};

export function useWorkspaceResetActions({
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
}: UseWorkspaceResetActionsArgs) {
    const handleClearCurrentStage = useCallback(() => {
        handleClearResults();
        clearAssetRoles(['stage-source']);
    }, [clearAssetRoles, handleClearResults]);

    const handleClearGalleryHistory = useCallback(() => {
        applyEmptyWorkspaceSnapshot();
        void clearSharedWorkspaceSnapshot();
        setActiveWorkspaceDetailModal(null);
        setIsAdvancedSettingsOpen(false);
        setIsSketchPadOpen(false);
        setShowSketchReplaceConfirm(false);
        setSettingsSessionDraft(null);
        setSettingsSessionReturnToGeneration(false);
        setSurfaceSharedControlsBottom(null);
        lastPromotedHistoryIdRef.current = null;
    }, [
        applyEmptyWorkspaceSnapshot,
        clearSharedWorkspaceSnapshot,
        lastPromotedHistoryIdRef,
        setActiveWorkspaceDetailModal,
        setIsAdvancedSettingsOpen,
        setIsSketchPadOpen,
        setSettingsSessionDraft,
        setSettingsSessionReturnToGeneration,
        setShowSketchReplaceConfirm,
        setSurfaceSharedControlsBottom,
    ]);

    return {
        handleClearCurrentStage,
        handleClearGalleryHistory,
    };
}
