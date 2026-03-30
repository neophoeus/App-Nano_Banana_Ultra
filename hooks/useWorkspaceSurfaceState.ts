import { Dispatch, SetStateAction, useCallback, useEffect, useState } from 'react';
import { type SurfaceSharedControlSheet } from '../components/SurfaceSharedControls';
import { type PickerSheet } from '../components/WorkspacePickerSheet';

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
    isAdvancedSettingsOpen: boolean;
    setIsAdvancedSettingsOpen: Dispatch<SetStateAction<boolean>>;
    isViewerOpen: boolean;
    setIsViewerOpen: Dispatch<SetStateAction<boolean>>;
    activePickerSheet: PickerSheet;
    setActivePickerSheet: Dispatch<SetStateAction<PickerSheet>>;
    closePickerSheet: () => void;
    isSurfaceSharedControlsOpen: boolean;
    setIsSurfaceSharedControlsOpen: Dispatch<SetStateAction<boolean>>;
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
    const [activePickerSheet, setActivePickerSheet] = useState<PickerSheet>(null);
    const [isAdvancedSettingsOpen, setIsAdvancedSettingsOpen] = useState(false);
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const [branchRenameDialog, setBranchRenameDialog] = useState<BranchRenameDialogState | null>(null);
    const [branchRenameDraft, setBranchRenameDraft] = useState('');
    const [isSurfaceSharedControlsOpen, setIsSurfaceSharedControlsOpen] = useState(false);

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
        setIsSurfaceSharedControlsOpen(true);
        setActivePickerSheet(sheet);
    }, []);

    useEffect(() => {
        if (!branchRenameDialog) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                closeBranchRenameDialog();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [branchRenameDialog, closeBranchRenameDialog]);

    return {
        isSketchPadOpen,
        setIsSketchPadOpen,
        showSketchReplaceConfirm,
        setShowSketchReplaceConfirm,
        isAdvancedSettingsOpen,
        setIsAdvancedSettingsOpen,
        isViewerOpen,
        setIsViewerOpen,
        activePickerSheet,
        setActivePickerSheet,
        closePickerSheet,
        isSurfaceSharedControlsOpen,
        setIsSurfaceSharedControlsOpen,
        branchRenameDialog,
        setBranchRenameDialog,
        branchRenameDraft,
        setBranchRenameDraft,
        openBranchRenameDialog,
        closeBranchRenameDialog,
        openSurfacePickerSheet,
    };
}
