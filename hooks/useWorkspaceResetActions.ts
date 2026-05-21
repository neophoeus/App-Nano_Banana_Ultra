import { Dispatch, MutableRefObject, SetStateAction, useCallback } from 'react';
import type { WorkspaceDetailModalState } from './useWorkspaceShellOwnerState';
import { clearDebugTerminalEvents } from '../utils/debugTerminalEvents';

type UseWorkspaceResetActionsArgs = {
    lastPromotedHistoryIdRef: MutableRefObject<string | null>;
    handleClearResults: () => void;
    clearAssetRoles: (roles: Array<'object' | 'character' | 'stage-source'>) => void;
    applyEmptyWorkspaceSnapshot: () => void;
    clearSharedWorkspaceSnapshot: () => void | Promise<void>;
    setActiveWorkspaceDetailModal: Dispatch<SetStateAction<WorkspaceDetailModalState>>;
    setIsAdvancedSettingsOpen: Dispatch<SetStateAction<boolean>>;
    setIsSketchPadOpen: Dispatch<SetStateAction<boolean>>;
    setShowSketchReplaceConfirm: Dispatch<SetStateAction<boolean>>;
    clearSettingsSession: () => void;
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
    clearSettingsSession,
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
        clearSettingsSession();
        setSurfaceSharedControlsBottom(null);
        lastPromotedHistoryIdRef.current = null;
        clearDebugTerminalEvents();
    }, [
        applyEmptyWorkspaceSnapshot,
        clearSettingsSession,
        clearSharedWorkspaceSnapshot,
        lastPromotedHistoryIdRef,
        setActiveWorkspaceDetailModal,
        setIsAdvancedSettingsOpen,
        setIsSketchPadOpen,
        setShowSketchReplaceConfirm,
        setSurfaceSharedControlsBottom,
    ]);

    return {
        handleClearCurrentStage,
        handleClearGalleryHistory,
    };
}
