import React from 'react';
import BranchRenameDialog from './BranchRenameDialog';
import ComposerAdvancedSettingsDialog from './ComposerAdvancedSettingsDialog';
import SurfaceSharedControls from './SurfaceSharedControls';
import ThemeToggle from './ThemeToggle';
import WorkspaceImportReview from './WorkspaceImportReview';
import WorkspaceModalFrame from './WorkspaceModalFrame';
import WorkspacePickerSheet from './WorkspacePickerSheet';
import WorkspaceViewerOverlay from './WorkspaceViewerOverlay';
import { WORKSPACE_OVERLAY_Z_INDEX } from '../constants/workspaceOverlays';

type NotificationState = { msg: string; type: 'info' | 'error' } | null;

type WorkspaceOverlayStackProps = {
    notification: NotificationState;
    surfaceSharedControlsProps: React.ComponentProps<typeof SurfaceSharedControls> | null;
    importReviewProps: React.ComponentProps<typeof WorkspaceImportReview> | null;
    advancedSettingsDialogProps: React.ComponentProps<typeof ComposerAdvancedSettingsDialog> | null;
    extraOverlays?: React.ReactNode;
    sketchPadSurface: React.ReactNode;
    showSketchReplaceConfirm: boolean;
    sketchReplaceTitle: string;
    sketchReplaceMessage: string;
    sketchReplaceActionsTitle: string;
    sketchReplaceCancelLabel: string;
    sketchReplaceConfirmLabel: string;
    onSketchReplaceCancel: () => void;
    onSketchReplaceConfirm: () => void;
    branchRenameDialogProps: React.ComponentProps<typeof BranchRenameDialog> | null;
    imageEditorSurface: React.ReactNode;
    pickerSheetProps: React.ComponentProps<typeof WorkspacePickerSheet>;
    viewerOverlayProps: React.ComponentProps<typeof WorkspaceViewerOverlay>;
};

export default function WorkspaceOverlayStack({
    notification,
    surfaceSharedControlsProps,
    importReviewProps,
    advancedSettingsDialogProps,
    extraOverlays,
    sketchPadSurface,
    showSketchReplaceConfirm,
    sketchReplaceTitle,
    sketchReplaceMessage,
    sketchReplaceActionsTitle,
    sketchReplaceCancelLabel,
    sketchReplaceConfirmLabel,
    onSketchReplaceCancel,
    onSketchReplaceConfirm,
    branchRenameDialogProps,
    imageEditorSurface,
    pickerSheetProps,
    viewerOverlayProps,
}: WorkspaceOverlayStackProps) {
    return (
        <>
            {notification && (
                <div
                    className="fixed left-1/2 top-6 -translate-x-1/2"
                    style={{ zIndex: WORKSPACE_OVERLAY_Z_INDEX.notification }}
                >
                    <div
                        className={`${notification.type === 'error' ? 'border-red-300 bg-red-500' : 'border-amber-300 bg-amber-500'} rounded-full border px-5 py-3 text-sm font-semibold text-white shadow-2xl`}
                    >
                        {notification.msg}
                    </div>
                </div>
            )}

            {surfaceSharedControlsProps && <SurfaceSharedControls {...surfaceSharedControlsProps} />}
            {importReviewProps && <WorkspaceImportReview {...importReviewProps} />}
            {advancedSettingsDialogProps && <ComposerAdvancedSettingsDialog {...advancedSettingsDialogProps} />}
            {extraOverlays}
            {sketchPadSurface}

            {showSketchReplaceConfirm && (
                <WorkspaceModalFrame
                    dataTestId="workspace-sketch-replace-confirm"
                    zIndex={WORKSPACE_OVERLAY_Z_INDEX.sketchReplaceConfirm}
                    maxWidthClass="max-w-sm"
                    onClose={onSketchReplaceCancel}
                    closeLabel={sketchReplaceCancelLabel}
                    title={sketchReplaceTitle}
                    description={sketchReplaceMessage}
                    headerExtra={
                        <div className="mt-3 flex items-center gap-2.5">
                            <ThemeToggle
                                currentLanguage={pickerSheetProps.currentLanguage}
                                className="h-8 w-8 shadow-none"
                            />
                        </div>
                    }
                    hideCloseButton
                    backdropClassName="bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.1),_transparent_32%),rgba(15,23,42,0.74)] backdrop-blur-md"
                    panelClassName="nbu-overlay-panel-warm p-5"
                    headerClassName="border-b border-amber-200/80 px-0 pb-4 dark:border-amber-500/18"
                >
                    <div className="space-y-3.5 pt-2">
                        <div
                            data-testid="workspace-sketch-replace-summary"
                            className="nbu-overlay-card-warm rounded-[24px] border p-4"
                        >
                            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-200">
                                {sketchReplaceTitle}
                            </div>
                            <div className="mt-2 text-sm leading-6 text-gray-700 dark:text-gray-200">
                                {sketchReplaceMessage}
                            </div>
                        </div>
                        <div
                            data-testid="workspace-sketch-replace-actions"
                            className="nbu-overlay-card-neutral rounded-[24px] border p-4"
                        >
                            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                                {sketchReplaceActionsTitle}
                            </div>
                            <div className="mt-3 flex gap-2.5 border-t border-gray-200/80 pt-4 dark:border-gray-800">
                                <button
                                    onClick={onSketchReplaceCancel}
                                    className="nbu-control-button flex-1 rounded-xl px-3.5 py-2 text-[13px] font-semibold"
                                >
                                    {sketchReplaceCancelLabel}
                                </button>
                                <button
                                    onClick={onSketchReplaceConfirm}
                                    className="flex-1 rounded-xl bg-amber-500 px-3.5 py-2 text-[13px] font-semibold text-white"
                                >
                                    {sketchReplaceConfirmLabel}
                                </button>
                            </div>
                        </div>
                    </div>
                </WorkspaceModalFrame>
            )}

            {branchRenameDialogProps && <BranchRenameDialog {...branchRenameDialogProps} />}
            {imageEditorSurface}
            <WorkspacePickerSheet {...pickerSheetProps} />
            <WorkspaceViewerOverlay {...viewerOverlayProps} />
        </>
    );
}
