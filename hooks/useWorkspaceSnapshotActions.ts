import {
    ChangeEvent,
    Dispatch,
    MutableRefObject,
    SetStateAction,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';
import {
    GeneratedImage,
    PendingProvenanceContext,
    QueuedBatchJob,
    StageAsset,
    WorkspaceComposerState,
    WorkspaceSessionState,
} from '../types';
import {
    buildWorkspaceSnapshotExportFilename,
    exportWorkspaceSnapshotDocument,
    mergeWorkspaceSnapshots,
    parseWorkspaceSnapshotDocument,
    sanitizeWorkspaceSnapshot,
} from '../utils/workspacePersistence';
import {
    deriveAppliedWorkspaceSnapshotState,
    shouldAnnounceRestoreToastForSnapshot,
} from '../utils/workspaceSnapshotState';
import { getTranslation, Language } from '../utils/translations';
import { encodeWorkflowMessage } from '../utils/workflowTimeline';

export type WorkspaceImportReviewState = {
    fileName: string;
    snapshot: ReturnType<typeof sanitizeWorkspaceSnapshot>;
};

type UseWorkspaceSnapshotActionsArgs = {
    currentLanguage: Language;
    initialShouldAnnounceRestoreToast: boolean;
    isInitialRestoreAnnouncementReady: boolean;
    workspaceImportInputRef: MutableRefObject<HTMLInputElement | null>;
    lastPromotedHistoryIdRef: MutableRefObject<string | null>;
    composeCurrentWorkspaceSnapshot: () => ReturnType<typeof sanitizeWorkspaceSnapshot>;
    showNotification: (message: string, type?: 'info' | 'error') => void;
    addLog: (message: string) => void;
    setHistory: Dispatch<SetStateAction<GeneratedImage[]>>;
    setStagedAssets: Dispatch<SetStateAction<StageAsset[]>>;
    setQueuedJobs: Dispatch<SetStateAction<QueuedBatchJob[]>>;
    setWorkspaceSession: Dispatch<SetStateAction<WorkspaceSessionState>>;
    setBranchNameOverrides: Dispatch<SetStateAction<Record<string, string>>>;
    setBranchContinuationSourceByBranchOriginId: Dispatch<SetStateAction<Record<string, string>>>;
    setConversationState: Dispatch<SetStateAction<ReturnType<typeof sanitizeWorkspaceSnapshot>['conversationState']>>;
    setGeneratedImageUrls: Dispatch<SetStateAction<string[]>>;
    setSelectedImageIndex: Dispatch<SetStateAction<number>>;
    applySelectedResultArtifacts: (artifacts: WorkspaceSessionState['activeResult']) => void;
    setSelectedHistoryId: Dispatch<SetStateAction<string | null>>;
    applyComposerState: (composerState: WorkspaceComposerState) => void;
    setBatchProgress: Dispatch<SetStateAction<{ completed: number; total: number }>>;
    setPendingProvenanceContext: Dispatch<SetStateAction<PendingProvenanceContext | null>>;
    setIsGenerating: Dispatch<SetStateAction<boolean>>;
    setError: Dispatch<SetStateAction<string | null>>;
    setLogs: Dispatch<SetStateAction<string[]>>;
    setIsEditing: Dispatch<SetStateAction<boolean>>;
    setEditingImageSource: Dispatch<SetStateAction<string | null>>;
    setIsViewerOpen: Dispatch<SetStateAction<boolean>>;
    setActivePickerSheet: Dispatch<SetStateAction<any>>;
    setBranchRenameDialog: Dispatch<SetStateAction<any>>;
    setBranchRenameDraft: Dispatch<SetStateAction<string>>;
};

export const useWorkspaceSnapshotActions = ({
    currentLanguage,
    initialShouldAnnounceRestoreToast,
    isInitialRestoreAnnouncementReady,
    workspaceImportInputRef,
    lastPromotedHistoryIdRef,
    composeCurrentWorkspaceSnapshot,
    showNotification,
    addLog,
    setHistory,
    setStagedAssets,
    setQueuedJobs,
    setWorkspaceSession,
    setBranchNameOverrides,
    setBranchContinuationSourceByBranchOriginId,
    setConversationState,
    setGeneratedImageUrls,
    setSelectedImageIndex,
    applySelectedResultArtifacts,
    setSelectedHistoryId,
    applyComposerState,
    setBatchProgress,
    setPendingProvenanceContext,
    setIsGenerating,
    setError,
    setLogs,
    setIsEditing,
    setEditingImageSource,
    setIsViewerOpen,
    setActivePickerSheet,
    setBranchRenameDialog,
    setBranchRenameDraft,
}: UseWorkspaceSnapshotActionsArgs) => {
    const t = useCallback((key: string) => getTranslation(currentLanguage, key), [currentLanguage]);
    const [workspaceImportReview, setWorkspaceImportReview] = useState<WorkspaceImportReviewState | null>(null);
    const initialRestoreToastShownRef = useRef(false);

    const showRestoredToast = useCallback(() => {
        showNotification(t('workspaceRestoreTitle'), 'info');
    }, [showNotification, t]);

    useEffect(() => {
        if (
            initialRestoreToastShownRef.current ||
            !initialShouldAnnounceRestoreToast ||
            !isInitialRestoreAnnouncementReady
        ) {
            return;
        }

        initialRestoreToastShownRef.current = true;
        showRestoredToast();
    }, [initialShouldAnnounceRestoreToast, isInitialRestoreAnnouncementReady, showRestoredToast]);

    const applyWorkspaceSnapshot = useCallback(
        (incomingSnapshot: unknown, options?: { announceRestoreToast?: boolean }) => {
            const appliedSnapshot = deriveAppliedWorkspaceSnapshotState(incomingSnapshot, options);
            const {
                snapshot,
                activeResult,
                selectedHistoryId: nextSelectedHistoryId,
                announceRestoreToast,
            } = appliedSnapshot;
            const latestSuccessfulHistoryId = snapshot.history.find((item) => item.status === 'success')?.id || null;

            setHistory(snapshot.history);
            setStagedAssets(snapshot.stagedAssets);
            setQueuedJobs(snapshot.queuedJobs);
            setWorkspaceSession(snapshot.workspaceSession);
            setBranchNameOverrides(snapshot.branchState.nameOverrides);
            setBranchContinuationSourceByBranchOriginId(snapshot.branchState.continuationSourceByBranchOriginId);
            setConversationState(snapshot.conversationState);
            setGeneratedImageUrls(snapshot.viewState.generatedImageUrls);
            setSelectedImageIndex(snapshot.viewState.selectedImageIndex);
            applySelectedResultArtifacts(activeResult);
            setSelectedHistoryId(nextSelectedHistoryId);
            applyComposerState(snapshot.composerState);
            setBatchProgress({ completed: 0, total: 0 });
            setPendingProvenanceContext(null);
            setIsGenerating(false);
            setError(null);
            setLogs(snapshot.workflowLogs);
            setIsEditing(false);
            setEditingImageSource(null);
            setIsViewerOpen(false);
            setActivePickerSheet(null);
            setBranchRenameDialog(null);
            setBranchRenameDraft('');
            setWorkspaceImportReview(null);
            lastPromotedHistoryIdRef.current = activeResult?.historyId || latestSuccessfulHistoryId;

            if (announceRestoreToast) {
                showRestoredToast();
            }
        },
        [
            applyComposerState,
            applySelectedResultArtifacts,
            lastPromotedHistoryIdRef,
            setActivePickerSheet,
            setBatchProgress,
            setBranchContinuationSourceByBranchOriginId,
            setBranchNameOverrides,
            setBranchRenameDialog,
            setBranchRenameDraft,
            setConversationState,
            setEditingImageSource,
            setError,
            setGeneratedImageUrls,
            setHistory,
            setIsEditing,
            setIsGenerating,
            setIsViewerOpen,
            setLogs,
            setPendingProvenanceContext,
            setQueuedJobs,
            setSelectedHistoryId,
            setSelectedImageIndex,
            setStagedAssets,
            setWorkspaceSession,
            showRestoredToast,
        ],
    );

    const clearImportInput = useCallback(() => {
        if (workspaceImportInputRef.current) {
            workspaceImportInputRef.current.value = '';
        }
    }, [workspaceImportInputRef]);

    const handleCloseWorkspaceImportReview = useCallback(() => {
        setWorkspaceImportReview(null);
        clearImportInput();
    }, [clearImportInput]);

    const handleApplyImportedWorkspaceSnapshot = useCallback(
        (options?: { announceRestoreToast?: boolean }) => {
            if (!workspaceImportReview) {
                return;
            }

            const announceRestoreToast =
                options?.announceRestoreToast ?? shouldAnnounceRestoreToastForSnapshot(workspaceImportReview.snapshot);

            applyWorkspaceSnapshot(workspaceImportReview.snapshot, {
                announceRestoreToast,
            });
            if (!announceRestoreToast) {
                showNotification(
                    t('workspaceSnapshotImportedNotice').replace('{0}', workspaceImportReview.fileName),
                    'info',
                );
            }
            addLog(
                encodeWorkflowMessage(
                    'workspaceSnapshotImportedLog',
                    workspaceImportReview.fileName,
                    workspaceImportReview.snapshot.history.length,
                ),
            );
            clearImportInput();
        },
        [addLog, applyWorkspaceSnapshot, clearImportInput, showNotification, t, workspaceImportReview],
    );

    const handleMergeImportedWorkspaceSnapshot = useCallback(() => {
        if (!workspaceImportReview) {
            return;
        }

        const mergedSnapshot = mergeWorkspaceSnapshots(
            composeCurrentWorkspaceSnapshot(),
            workspaceImportReview.snapshot,
        );

        applyWorkspaceSnapshot(mergedSnapshot, { announceRestoreToast: false });
        showNotification(t('workspaceSnapshotMergedNotice').replace('{0}', workspaceImportReview.fileName), 'info');
        addLog(
            encodeWorkflowMessage(
                'workspaceSnapshotMergedLog',
                workspaceImportReview.snapshot.history.length,
                workspaceImportReview.fileName,
            ),
        );
        clearImportInput();
    }, [
        addLog,
        applyWorkspaceSnapshot,
        clearImportInput,
        composeCurrentWorkspaceSnapshot,
        showNotification,
        t,
        workspaceImportReview,
    ]);

    const handleExportWorkspaceSnapshot = useCallback(() => {
        try {
            const snapshot = composeCurrentWorkspaceSnapshot();
            const blob = new Blob([exportWorkspaceSnapshotDocument(snapshot)], { type: 'application/json' });
            const objectUrl = URL.createObjectURL(blob);
            const downloadLink = document.createElement('a');
            downloadLink.href = objectUrl;
            downloadLink.download = buildWorkspaceSnapshotExportFilename();
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            URL.revokeObjectURL(objectUrl);
            showNotification(
                t('workspaceSnapshotExportedNotice').replace('{0}', String(snapshot.history.length)),
                'info',
            );
            addLog(
                encodeWorkflowMessage(
                    'workspaceSnapshotExportedLog',
                    snapshot.history.length,
                    snapshot.stagedAssets.length,
                ),
            );
        } catch (error) {
            console.error('Failed to export workspace snapshot', error);
            showNotification(t('workspaceSnapshotExportFailed'), 'error');
        }
    }, [addLog, composeCurrentWorkspaceSnapshot, showNotification, t]);

    const handleImportWorkspaceSnapshot = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            if (!file) {
                return;
            }

            const reader = new FileReader();
            reader.onload = () => {
                if (typeof reader.result !== 'string') {
                    showNotification(t('workspaceSnapshotImportReadTextFailed'), 'error');
                    clearImportInput();
                    return;
                }

                const snapshot = parseWorkspaceSnapshotDocument(reader.result);
                if (!snapshot) {
                    showNotification(t('workspaceSnapshotImportInvalidFormat'), 'error');
                    clearImportInput();
                    return;
                }

                setWorkspaceImportReview({
                    fileName: file.name,
                    snapshot,
                });
                clearImportInput();
            };
            reader.onerror = () => {
                showNotification(t('workspaceSnapshotImportReadFailed'), 'error');
                clearImportInput();
            };
            reader.readAsText(file);
        },
        [clearImportInput, showNotification, t],
    );

    return {
        workspaceImportReview,
        setWorkspaceImportReview,
        applyWorkspaceSnapshot,
        handleCloseWorkspaceImportReview,
        handleApplyImportedWorkspaceSnapshot,
        handleMergeImportedWorkspaceSnapshot,
        handleExportWorkspaceSnapshot,
        handleImportWorkspaceSnapshot,
    };
};
