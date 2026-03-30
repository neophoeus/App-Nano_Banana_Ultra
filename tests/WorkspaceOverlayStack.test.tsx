import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import WorkspaceOverlayStack from '../components/WorkspaceOverlayStack';

vi.mock('../components/BranchRenameDialog', () => ({
    default: () => <div data-testid="mock-branch-rename-dialog" />,
}));

vi.mock('../components/ComposerAdvancedSettingsDialog', () => ({
    default: () => <div data-testid="mock-composer-advanced-settings-dialog" />,
}));

vi.mock('../components/SurfaceSharedControls', () => ({
    default: () => <div data-testid="mock-surface-shared-controls" />,
}));

vi.mock('../components/WorkspaceImportReview', () => ({
    default: () => <div data-testid="mock-workspace-import-review" />,
}));

vi.mock('../components/WorkspaceModalFrame', () => ({
    default: ({ children }: { children?: React.ReactNode }) => <div data-testid="mock-workspace-modal">{children}</div>,
}));

vi.mock('../components/WorkspacePickerSheet', () => ({
    default: () => <div data-testid="mock-workspace-picker-sheet" />,
}));

vi.mock('../components/WorkspaceRestoreNotice', () => ({
    default: () => <div data-testid="mock-workspace-restore-notice" />,
}));

vi.mock('../components/WorkspaceViewerOverlay', () => ({
    default: () => <div data-testid="mock-workspace-viewer-overlay" />,
}));

describe('WorkspaceOverlayStack', () => {
    it('renders the base picker and viewer overlays when optional dialogs are absent', () => {
        const markup = renderToStaticMarkup(
            <WorkspaceOverlayStack
                notification={null}
                surfaceSharedControlsProps={null}
                restoreNoticeProps={null}
                importReviewProps={null}
                advancedSettingsDialogProps={null}
                sketchPadSurface={null}
                showSketchReplaceConfirm={false}
                sketchReplaceTitle="Replace"
                sketchReplaceMessage="Replace current sketch"
                sketchReplaceActionsTitle="Choose next step"
                sketchReplaceCancelLabel="Cancel"
                sketchReplaceConfirmLabel="Confirm"
                onSketchReplaceCancel={vi.fn()}
                onSketchReplaceConfirm={vi.fn()}
                branchRenameDialogProps={null}
                imageEditorSurface={null}
                pickerSheetProps={{} as any}
                viewerOverlayProps={{} as any}
            />,
        );

        expect(markup).toContain('mock-workspace-picker-sheet');
        expect(markup).toContain('mock-workspace-viewer-overlay');
        expect(markup).not.toContain('mock-workspace-modal');
    });

    it('renders sketch replace confirm with shared summary and action sections', () => {
        const markup = renderToStaticMarkup(
            <WorkspaceOverlayStack
                notification={null}
                surfaceSharedControlsProps={null}
                restoreNoticeProps={null}
                importReviewProps={null}
                advancedSettingsDialogProps={null}
                sketchPadSurface={null}
                showSketchReplaceConfirm={true}
                sketchReplaceTitle="Replace Sketch?"
                sketchReplaceMessage="Only one sketch allowed. Replace the existing one?"
                sketchReplaceActionsTitle="Choose next step"
                sketchReplaceCancelLabel="Cancel"
                sketchReplaceConfirmLabel="Replace"
                onSketchReplaceCancel={vi.fn()}
                onSketchReplaceConfirm={vi.fn()}
                branchRenameDialogProps={null}
                imageEditorSurface={null}
                pickerSheetProps={{} as any}
                viewerOverlayProps={{} as any}
            />,
        );

        expect(markup).toContain('workspace-sketch-replace-summary');
        expect(markup).toContain('workspace-sketch-replace-actions');
        expect(markup).toContain('Replace Sketch?');
        expect(markup).toContain('Choose next step');
        expect(markup).toContain('Only one sketch allowed. Replace the existing one?');
    });
});
