/** @vitest-environment jsdom */

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WorkspaceDetailOverlays, { WorkspaceDetailOverlaysProps } from '../components/WorkspaceDetailOverlays';

vi.mock('../components/WorkspaceProgressDetailPanel', () => ({
    default: () => <div data-testid="mock-progress-panel">Progress Content</div>,
}));

vi.mock('../components/WorkspaceEvidenceDetailPanel', () => ({
    default: ({ children }: { children?: React.ReactNode }) => (
        <div data-testid="mock-evidence-panel">Evidence Content {children}</div>
    ),
}));

vi.mock('../components/WorkspaceVersionsDetailPanel', () => ({
    default: () => <div data-testid="mock-versions-panel">Versions Content</div>,
}));

vi.mock('../components/QueuedBatchJobsPanel', () => ({
    default: () => <div data-testid="mock-queued-batch-panel">Batch Content</div>,
}));

describe('WorkspaceDetailOverlays', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
    });

    const defaultProps: WorkspaceDetailOverlaysProps = {
        activeWorkspaceDetailModal: null,
        isQueuedBatchSpaceOpen: false,
        showClearWorkspaceConfirm: false,
        showStorageWarningModal: false,
        storageWarningSizeMb: 50,
        currentLang: 'en',
        t: (key: string) => key,
        onCloseDetailModal: vi.fn(),
        onCloseClearConfirm: vi.fn(),
        onConfirmClearWorkspace: vi.fn(),
        onCloseStorageWarningModal: vi.fn(),
        onExportWorkspaceSnapshot: vi.fn(),
        progressThoughtEntries: [],
        onDownloadThoughtImage: vi.fn(),
        latestWorkflowEntry: null,
        isGenerating: false,
        batchProgress: { completed: 0, total: 0 },
        queuedJobs: [],
        getImportedQueuedResultCount: () => 0,
        groundingResolutionStatusSummary: '',
        groundingResolutionStatusTone: 'neutral',
        progressThoughtsSummaryText: '',
        thoughtStateMessage: '',
        provenanceSummaryRows: [],
        provenanceContinuityMessage: '',
        groundingStateMessage: '',
        groundingSupportMessage: '',
        selectedSourcesCount: 0,
        selectedSupportBundlesCount: 0,
        contextProvenanceDetailPanel: <div data-testid="mock-provenance-panel" />,
        versionsDetailPanelProps: {} as any,
        queueBatchConversationNotice: null,
        getLineageActionLabel: (action?: any) => String(action || ''),
        getImportedQueuedHistoryItems: () => [],
        currentStageSourceHistoryId: null,
        onImportAllQueuedJobs: vi.fn(),
        onPollAllQueuedJobs: vi.fn(),
        onPollQueuedJob: vi.fn(),
        onCancelQueuedJob: vi.fn(),
        onImportQueuedJob: vi.fn(),
        onOpenImportedQueuedJob: vi.fn(),
        onOpenLatestImportedQueuedJob: vi.fn(),
        onOpenImportedQueuedHistoryItem: vi.fn(),
        onClearIssueQueuedJobs: vi.fn(),
        onClearImportedQueuedJobs: vi.fn(),
        onRemoveQueuedJob: vi.fn(),
    };

    it('returns null when no modal, clear confirm, or storage warning is active', () => {
        act(() => {
            root.render(<WorkspaceDetailOverlays {...defaultProps} />);
        });
        expect(container.firstChild).toBeNull();
    });

    it('renders progress modal when activeWorkspaceDetailModal is "progress"', async () => {
        act(() => {
            root.render(<WorkspaceDetailOverlays {...defaultProps} activeWorkspaceDetailModal="progress" />);
        });
        expect(container.querySelector('[data-testid="workspace-progress-detail-modal"]')).not.toBeNull();
    });

    it('renders sources modal when activeWorkspaceDetailModal is "sources"', async () => {
        act(() => {
            root.render(<WorkspaceDetailOverlays {...defaultProps} activeWorkspaceDetailModal="sources" />);
        });
        expect(container.querySelector('[data-testid="workspace-sources-detail-modal"]')).not.toBeNull();
    });

    it('renders versions modal when activeWorkspaceDetailModal is "versions"', async () => {
        act(() => {
            root.render(<WorkspaceDetailOverlays {...defaultProps} activeWorkspaceDetailModal="versions" />);
        });
        expect(container.querySelector('[data-testid="workspace-versions-detail-modal"]')).not.toBeNull();
    });

    it('renders queued batch space modal when isQueuedBatchSpaceOpen is true', async () => {
        act(() => {
            root.render(<WorkspaceDetailOverlays {...defaultProps} isQueuedBatchSpaceOpen={true} />);
        });
        expect(container.querySelector('[data-testid="workspace-queued-batch-space-modal"]')).not.toBeNull();
    });

    it('renders clear workspace confirmation modal and responds to buttons', () => {
        const onConfirmClear = vi.fn();
        const onCloseClear = vi.fn();
        act(() => {
            root.render(
                <WorkspaceDetailOverlays
                    {...defaultProps}
                    showClearWorkspaceConfirm={true}
                    onConfirmClearWorkspace={onConfirmClear}
                    onCloseClearConfirm={onCloseClear}
                />,
            );
        });
        const confirmModal = container.querySelector('[data-testid="workspace-unified-history-clear-confirm"]');
        expect(confirmModal).not.toBeNull();

        const confirmBtn = container.querySelector<HTMLButtonElement>(
            '[data-testid="workspace-unified-history-clear-confirm-action"]',
        );
        act(() => {
            confirmBtn?.click();
        });
        expect(onConfirmClear).toHaveBeenCalledTimes(1);

        const cancelBtn = container.querySelector<HTMLButtonElement>(
            '[data-testid="workspace-unified-history-clear-cancel"]',
        );
        act(() => {
            cancelBtn?.click();
        });
        expect(onCloseClear).toHaveBeenCalledTimes(1);
    });

    it('renders storage warning modal and responds to buttons', () => {
        const onCloseStorageWarning = vi.fn();
        const onExport = vi.fn();
        act(() => {
            root.render(
                <WorkspaceDetailOverlays
                    {...defaultProps}
                    showStorageWarningModal={true}
                    storageWarningSizeMb={42}
                    onCloseStorageWarningModal={onCloseStorageWarning}
                    onExportWorkspaceSnapshot={onExport}
                />,
            );
        });
        const storageModal = container.querySelector('[data-testid="workspace-storage-warning-modal"]');
        expect(storageModal).not.toBeNull();

        const closeBtn = container.querySelector<HTMLButtonElement>(
            '[data-testid="workspace-storage-warning-close"]',
        );
        act(() => {
            closeBtn?.click();
        });
        expect(onCloseStorageWarning).toHaveBeenCalledTimes(1);

        const exportBtn = container.querySelector<HTMLButtonElement>(
            '[data-testid="workspace-storage-warning-export"]',
        );
        act(() => {
            exportBtn?.click();
        });
        expect(onCloseStorageWarning).toHaveBeenCalledTimes(2);
        expect(onExport).toHaveBeenCalledTimes(1);
    });
});
