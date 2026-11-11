import { Dispatch, SetStateAction, useCallback, useState } from 'react';
import { type SurfaceSharedControlSheet } from '../components/SurfaceSharedControls';
import { type PickerSheet } from '../components/WorkspacePickerSheet';
import { useOverlayEscapeDismiss } from './useOverlayEscapeDismiss';

export type BranchRenameDialogState = {
    branchOriginId: string;
    currentLabel: string;
    autoLabel: string;
};

type UseWorkspaceSurfaceStateReturn = {
    isSketchPadOpen: boolean;
    setIsSketchPadOpen: Dispatch<SetStateAction<boolean>>;
    showSketchReplaceConfirm: boolean;
    setShowSketchReplaceConfirm: Dispatch<SetStateAction<boolean>>;
    showClearWorkspaceConfirm: boolean;
    setShowClearWorkspaceConfirm: Dispatch<SetStateAction<boolean>>;
    isAdvancedSettingsOpen: boolean;
    setIsAdvancedSettingsOpen: Dispatch<SetStateAction<boolean>>;
    isViewerOpen: boolean;
    setIsViewerOpen: Dispatch<SetStateAction<boolean>>;
    activePickerSheet: PickerSheet;
    setActivePickerSheet: Dispatch<SetStateAction<PickerSheet>>;
    closePickerSheet: () => void;
    branchRenameDialog: BranchRenameDialogState | null;
    setBranchRenameDialog: Dispatch<SetStateAction<BranchRenameDialogState | null>>;
    branchRenameDraft: string;
    setBranchRenameDraft: Dispatch<SetStateAction<string>>;
    openBranchRenameDialog: (nextState: BranchRenameDialogState) => void;
    closeBranchRenameDialog: () => void;
    openSurfacePickerSheet: (sheet: SurfaceSharedControlSheet) => void;
};

export function useWorkspaceSurfaceState(): UseWorkspaceSurfaceStateReturn {
    const [isSketchPadOpen, setIsSketchPadOpen] = useState(false);
    const [showSketchReplaceConfirm, setShowSketchReplaceConfirm] = useState(false);
    const [showClearWorkspaceConfirm, setShowClearWorkspaceConfirm] = useState(false);
    const [activePickerSheet, setActivePickerSheet] = useState<PickerSheet>(null);
    const [isAdvancedSettingsOpen, setIsAdvancedSettingsOpen] = useState(false);
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const [branchRenameDialog, setBranchRenameDialog] = useState<BranchRenameDialogState | null>(null);
    const [branchRenameDraft, setBranchRenameDraft] = useState('');

    const closeBranchRenameDialog = useCallback(() => {
        setBranchRenameDialog(null);
        setBranchRenameDraft('');
    }, []);

    const openBranchRenameDialog = useCallback((nextState: BranchRenameDialogState) => {
        setBranchRenameDialog(nextState);
        setBranchRenameDraft(nextState.currentLabel);
    }, []);

    const closePickerSheet = useCallback(() => {
        setActivePickerSheet(null);
    }, []);

    const openSurfacePickerSheet = useCallback((sheet: SurfaceSharedControlSheet) => {
        setActivePickerSheet(sheet);
    }, []);

    useOverlayEscapeDismiss(Boolean(branchRenameDialog), closeBranchRenameDialog);

    return {
        isSketchPadOpen,
        setIsSketchPadOpen,
        showSketchReplaceConfirm,
        setShowSketchReplaceConfirm,
        showClearWorkspaceConfirm,
        setShowClearWorkspaceConfirm,
        isAdvancedSettingsOpen,
        setIsAdvancedSettingsOpen,
        isViewerOpen,
        setIsViewerOpen,
        activePickerSheet,
        setActivePickerSheet,
        closePickerSheet,
        branchRenameDialog,
        setBranchRenameDialog,
        branchRenameDraft,
        setBranchRenameDraft,
        openBranchRenameDialog,
        closeBranchRenameDialog,
        openSurfacePickerSheet,
    };
}
