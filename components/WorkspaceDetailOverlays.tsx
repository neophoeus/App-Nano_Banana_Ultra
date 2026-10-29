import React, { Suspense, lazy, useState, useEffect } from 'react';
import WorkspaceSupportDetailSurface from './WorkspaceSupportDetailSurface';
import WorkspaceDetailModal from './WorkspaceDetailModal';
import WorkspaceModalFrame from './WorkspaceModalFrame';
import ExportResultsModal from './ExportResultsModal';
import MetadataViewerDrawer from './MetadataViewerDrawer';
import PanelLoadingFallback from './PanelLoadingFallback';
import { WORKSPACE_OVERLAY_Z_INDEX } from '../constants/workspaceOverlays';
import type { Language } from '../utils/translations';
import type { BatchProgressState, WorkspaceDetailModalState } from '../hooks/useWorkspaceShellOwnerState';
import type { GeneratedImage, QueuedBatchJob, TurnLineageAction, ViewerComposerSettingsSnapshot } from '../types';
import type { WorkspaceProgressThoughtImageDownloadRequest } from './WorkspaceProgressDetailPanel';
import type { default as WorkspaceVersionsDetailPanelComponent } from './WorkspaceVersionsDetailPanel';

const WorkspaceProgressDetailPanel = lazy(() => import('./WorkspaceProgressDetailPanel'));
const WorkspaceEvidenceDetailPanel = lazy(() => import('./WorkspaceEvidenceDetailPanel'));
const WorkspaceVersionsDetailPanel = lazy(() => import('./WorkspaceVersionsDetailPanel'));
const QueuedBatchJobsPanel = lazy(() => import('./QueuedBatchJobsPanel'));

function AlertTriangleIcon({ className = 'w-4 h-4' }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    );
}

export interface WorkspaceDetailOverlaysProps {
    activeWorkspaceDetailModal: WorkspaceDetailModalState;
    isQueuedBatchSpaceOpen: boolean;
    showClearWorkspaceConfirm: boolean;
    showExportResultsModal?: boolean;
    onCloseExportResultsModal?: () => void;
    showMetadataViewerDrawer?: boolean;
    onCloseMetadataViewerDrawer?: () => void;
    onApplyMetadataPrompt?: (prompt: string) => void;
    onApplyMetadataSettings?: (snapshot: ViewerComposerSettingsSnapshot) => void;
    onApplyMetadataBoth?: (prompt: string, snapshot: ViewerComposerSettingsSnapshot) => void;
    settingsLocked?: boolean;
    history?: GeneratedImage[];
    showNotification?: (message: string, type?: 'info' | 'error') => void;
    currentLang: Language;
    t: (key: string) => string;
    onCloseDetailModal: () => void;
    onCloseClearConfirm: () => void;
    onConfirmClearWorkspace: (clearOutput?: boolean) => void | Promise<void>;
    onExportWorkspaceSnapshot: () => Promise<void> | void;

    // Progress Modal Props
    progressThoughtEntries: any[];
    onDownloadThoughtImage: (req: WorkspaceProgressThoughtImageDownloadRequest) => Promise<void>;
    latestWorkflowEntry: any;
    isGenerating: boolean;
    batchProgress: BatchProgressState;
    queuedJobs: QueuedBatchJob[];
    getImportedQueuedResultCount: (job: QueuedBatchJob) => number;
    groundingResolutionStatusSummary: string | null;
    groundingResolutionStatusTone: any;
    thoughtsText?: string;
    progressThoughtsSummaryText?: string;
    thoughtStateMessage: string;

    // Sources Modal Props
    provenanceSummaryRows: any[];
    provenanceContinuityMessage: string;
    groundingStateMessage: string;
    groundingSupportMessage: string;
    selectedSourcesCount: number;
    selectedSupportBundlesCount: number;
    contextProvenanceDetailPanel: React.ReactNode;

    // Versions Modal Props
    versionsDetailPanelProps: React.ComponentProps<typeof WorkspaceVersionsDetailPanelComponent>;

    // Queued Batch Space Modal Props
    queueBatchConversationNotice: any;
    getLineageActionLabel: (action?: TurnLineageAction) => string;
    getImportedQueuedHistoryItems: (job: QueuedBatchJob) => GeneratedImage[];
    currentStageSourceHistoryId: string | null;
    onImportAllQueuedJobs: () => Promise<void> | void;
    onPollAllQueuedJobs: () => Promise<void> | void;
    onPollQueuedJob: (localId: string) => Promise<void> | void;
    onCancelQueuedJob: (localId: string) => Promise<void> | void;
    onImportQueuedJob: (localId: string) => Promise<void> | void;
    onOpenImportedQueuedJob: (localId: string) => void;
    onOpenLatestImportedQueuedJob: (localId: string) => void;
    onOpenImportedQueuedHistoryItem: (historyId: string) => void;
    onClearIssueQueuedJobs: () => void;
    onClearImportedQueuedJobs: () => void;
    onRemoveQueuedJob: (localId: string) => void;
    onRecoverRecentQueuedJobs?: () => Promise<void> | void;
}

export const WorkspaceDetailOverlays: React.FC<WorkspaceDetailOverlaysProps> = React.memo(
    ({
        activeWorkspaceDetailModal,
        isQueuedBatchSpaceOpen,
        showClearWorkspaceConfirm,
        showExportResultsModal = false,
        onCloseExportResultsModal,
        showMetadataViewerDrawer = false,
        onCloseMetadataViewerDrawer,
        onApplyMetadataPrompt,
        onApplyMetadataSettings,
        onApplyMetadataBoth,
        settingsLocked = false,
        history = [],
        showNotification,
        currentLang,
        t,
        onCloseDetailModal,
        onCloseClearConfirm,
        onConfirmClearWorkspace,
        onExportWorkspaceSnapshot,
        progressThoughtEntries,
        onDownloadThoughtImage,
        latestWorkflowEntry,
        isGenerating,
        batchProgress,
        queuedJobs,
        getImportedQueuedResultCount,
        groundingResolutionStatusSummary,
        groundingResolutionStatusTone,
        thoughtsText,
        progressThoughtsSummaryText,
        thoughtStateMessage,
        provenanceSummaryRows,
        provenanceContinuityMessage,
        groundingStateMessage,
        groundingSupportMessage,
        selectedSourcesCount,
        selectedSupportBundlesCount,
        contextProvenanceDetailPanel,
        versionsDetailPanelProps,
        queueBatchConversationNotice,
        getLineageActionLabel,
        getImportedQueuedHistoryItems,
        currentStageSourceHistoryId,
        onImportAllQueuedJobs,
        onPollAllQueuedJobs,
        onPollQueuedJob,
        onCancelQueuedJob,
        onImportQueuedJob,
        onOpenImportedQueuedJob,
        onOpenLatestImportedQueuedJob,
        onOpenImportedQueuedHistoryItem,
        onClearIssueQueuedJobs,
        onClearImportedQueuedJobs,
        onRemoveQueuedJob,
        onRecoverRecentQueuedJobs,
    }) => {
        const [clearOutputFiles, setClearOutputFiles] = useState(false);

        useEffect(() => {
            if (!showClearWorkspaceConfirm) {
                setClearOutputFiles(false);
            }
        }, [showClearWorkspaceConfirm]);

        const effectiveThoughtsText = thoughtsText ?? progressThoughtsSummaryText ?? '';
        const detailModalContent =
            activeWorkspaceDetailModal === 'progress' ? (
                <WorkspaceSupportDetailSurface
                    dataTestId="workspace-progress-detail-modal"
                    title={t('workspaceSupportProgress')}
                    closeLabel={t('workspaceViewerClose')}
                    onClose={onCloseDetailModal}
                    compact={true}
                    desktopWidthClass="max-w-[1120px]"
                >
                    <Suspense
                        fallback={
                            <PanelLoadingFallback
                                label={t('workspaceSupportProgress')}
                                className="nbu-dashed-panel min-h-[220px] rounded-[20px] px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                            />
                        }
                    >
                        <WorkspaceProgressDetailPanel
                            currentLanguage={currentLang}
                            thoughtEntries={progressThoughtEntries}
                            onDownloadThoughtImage={onDownloadThoughtImage}
                            latestWorkflowEntry={latestWorkflowEntry}
                            isGenerating={isGenerating}
                            batchProgress={batchProgress}
                            queuedJobs={queuedJobs}
                            getImportedQueuedResultCount={getImportedQueuedResultCount}
                            resultStatusSummary={groundingResolutionStatusSummary}
                            resultStatusTone={groundingResolutionStatusTone}
                            thoughtsText={effectiveThoughtsText}
                            thoughtsPlaceholder={thoughtStateMessage}
                        />
                    </Suspense>
                </WorkspaceSupportDetailSurface>
            ) : activeWorkspaceDetailModal === 'sources' ? (
                <WorkspaceSupportDetailSurface
                    dataTestId="workspace-sources-detail-modal"
                    title={t('workspaceSupportSources')}
                    closeLabel={t('workspaceViewerClose')}
                    onClose={onCloseDetailModal}
                >
                    <Suspense
                        fallback={
                            <PanelLoadingFallback
                                label={t('workspaceSupportSources')}
                                className="nbu-dashed-panel min-h-[220px] rounded-[20px] px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                            />
                        }
                    >
                        <WorkspaceEvidenceDetailPanel
                            currentLanguage={currentLang}
                            provenanceSummaryRows={provenanceSummaryRows}
                            provenanceContinuityMessage={provenanceContinuityMessage}
                            groundingStateMessage={groundingStateMessage}
                            groundingSupportMessage={groundingSupportMessage}
                            totalSourceCount={selectedSourcesCount}
                            totalSupportBundleCount={selectedSupportBundlesCount}
                        >
                            {contextProvenanceDetailPanel}
                        </WorkspaceEvidenceDetailPanel>
                    </Suspense>
                </WorkspaceSupportDetailSurface>
            ) : activeWorkspaceDetailModal === 'versions' ? (
                <WorkspaceDetailModal
                    dataTestId="workspace-versions-detail-modal"
                    title={t('workspaceInsightsVersions')}
                    closeLabel={t('workspaceViewerClose')}
                    onClose={onCloseDetailModal}
                >
                    <Suspense
                        fallback={
                            <PanelLoadingFallback
                                label={t('workspaceInsightsVersions')}
                                className="nbu-dashed-panel min-h-[220px] rounded-[20px] px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                            />
                        }
                    >
                        <WorkspaceVersionsDetailPanel {...versionsDetailPanelProps} showHeader={false} />
                    </Suspense>
                </WorkspaceDetailModal>
            ) : isQueuedBatchSpaceOpen ? (
                <WorkspaceSupportDetailSurface
                    dataTestId="workspace-queued-batch-space-modal"
                    title={t('queuedBatchJobsTitle')}
                    closeLabel={t('workspaceViewerClose')}
                    onClose={onCloseDetailModal}
                    description={t('queuedBatchJobsDesc')}
                    desktopWidthClass="max-w-[980px]"
                >
                    <Suspense
                        fallback={
                            <PanelLoadingFallback
                                label={t('queuedBatchJobsTitle')}
                                className="nbu-dashed-panel min-h-[220px] rounded-[20px] px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                            />
                        }
                    >
                        <QueuedBatchJobsPanel
                            currentLanguage={currentLang}
                            queuedJobs={queuedJobs}
                            surface="embedded"
                            queueBatchConversationNotice={queueBatchConversationNotice}
                            getLineageActionLabel={getLineageActionLabel}
                            getImportedQueuedResultCount={getImportedQueuedResultCount}
                            getImportedQueuedHistoryItems={getImportedQueuedHistoryItems}
                            activeImportedQueuedHistoryId={currentStageSourceHistoryId}
                            onImportAllQueuedJobs={onImportAllQueuedJobs}
                            onPollAllQueuedJobs={onPollAllQueuedJobs}
                            onPollQueuedJob={onPollQueuedJob}
                            onCancelQueuedJob={onCancelQueuedJob}
                            onImportQueuedJob={onImportQueuedJob}
                            onOpenImportedQueuedJob={onOpenImportedQueuedJob}
                            onOpenLatestImportedQueuedJob={onOpenLatestImportedQueuedJob}
                            onOpenImportedQueuedHistoryItem={onOpenImportedQueuedHistoryItem}
                            onClearIssueQueuedJobs={onClearIssueQueuedJobs}
                            onClearImportedQueuedJobs={onClearImportedQueuedJobs}
                            onRemoveQueuedJob={onRemoveQueuedJob}
                            onRecoverRecentQueuedJobs={onRecoverRecentQueuedJobs}
                        />
                    </Suspense>
                </WorkspaceSupportDetailSurface>
            ) : null;

        const clearConfirmOverlay = showClearWorkspaceConfirm ? (
            <WorkspaceModalFrame
                dataTestId="workspace-unified-history-clear-confirm"
                zIndex={WORKSPACE_OVERLAY_Z_INDEX.historyConfirm}
                maxWidthClass="max-w-md"
                onClose={() => {
                    setClearOutputFiles(false);
                    onCloseClearConfirm();
                }}
                closeLabel={t('clearHistoryCancel')}
                title={t('clearHistoryTitle')}
                description={t('clearHistoryMsg')}
                hideCloseButton
                panelClassName="nbu-modal-shell"
                headerClassName="justify-center border-b-0 px-6 pt-6 pb-2 text-center"
                headerExtra={
                    <div className="mt-4 flex justify-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-6 w-6"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                            </svg>
                        </div>
                    </div>
                }
            >
                <div className="space-y-3 px-6 pb-4 text-left">
                    <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs leading-relaxed text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                        <div className="flex items-start gap-2">
                            <AlertTriangleIcon className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                            <span>{t('clearHistoryExportReminder')}</span>
                        </div>
                    </div>
                    <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs transition-colors hover:bg-slate-100/60 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:bg-slate-800/40">
                        <input
                            type="checkbox"
                            data-testid="workspace-clear-output-checkbox"
                            checked={clearOutputFiles}
                            onChange={(e) => setClearOutputFiles(e.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400 dark:border-slate-700"
                        />
                        <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {t('clearHistoryIncludeOutputLabel')}
                            </span>
                            <span className="text-slate-500 dark:text-slate-400">
                                {t('clearHistoryIncludeOutputHint')}
                            </span>
                        </div>
                    </label>
                </div>
                <div className="flex gap-2 border-t border-gray-100 bg-gray-50 p-2 dark:border-gray-800 dark:bg-gray-900/50">
                    <button
                        type="button"
                        data-testid="workspace-unified-history-clear-cancel"
                        onClick={() => {
                            setClearOutputFiles(false);
                            onCloseClearConfirm();
                        }}
                        className="flex-1 rounded-xl border border-transparent px-4 py-2.5 text-sm font-bold text-gray-600 transition-all hover:border-gray-200 hover:bg-white dark:text-gray-300 dark:hover:border-gray-700 dark:hover:bg-gray-800"
                    >
                        {t('clearHistoryCancel')}
                    </button>
                    <button
                        type="button"
                        data-testid="workspace-unified-history-clear-confirm-action"
                        onClick={() => onConfirmClearWorkspace(clearOutputFiles)}
                        className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-500/30 transition-all hover:bg-red-600"
                    >
                        {t('clearHistoryConfirm')}
                    </button>
                </div>
            </WorkspaceModalFrame>
        ) : null;

        if (!detailModalContent && !clearConfirmOverlay && !showExportResultsModal && !showMetadataViewerDrawer) {
            return null;
        }

        return (
            <>
                {detailModalContent}
                {clearConfirmOverlay}
                {showExportResultsModal && onCloseExportResultsModal && (
                    <ExportResultsModal
                        isOpen={showExportResultsModal}
                        onClose={onCloseExportResultsModal}
                        history={history}
                        t={t}
                        showNotification={showNotification}
                    />
                )}
                {showMetadataViewerDrawer && onCloseMetadataViewerDrawer && (
                    <MetadataViewerDrawer
                        isOpen={showMetadataViewerDrawer}
                        onClose={onCloseMetadataViewerDrawer}
                        currentLanguage={currentLang}
                        t={t}
                        onApplyPrompt={onApplyMetadataPrompt}
                        onApplySettings={onApplyMetadataSettings}
                        onApplyBoth={onApplyMetadataBoth}
                        settingsLocked={settingsLocked}
                        showNotification={showNotification}
                    />
                )}
            </>
        );
    },
);

export default WorkspaceDetailOverlays;
