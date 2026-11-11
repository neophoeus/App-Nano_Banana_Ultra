import { useCallback, useEffect } from 'react';
import {
    BranchContinuationSourceByOriginId,
    BranchNameOverrides,
    GeneratedImage,
    StageAsset,
    WorkspaceComposerState,
    WorkspaceConversationState,
    WorkspaceSessionState,
} from '../types';
import { collectSnapshotReferencedBlobKeys, pruneUnreferencedWorkspaceBlobs } from '../utils/workspaceBlobStore';
import {
    sanitizeWorkspaceSnapshot,
    saveSharedWorkspaceSnapshot,
    saveWorkspaceSnapshot,
} from '../utils/workspacePersistence';

type UseWorkspaceSnapshotPersistenceArgs = {
    history: GeneratedImage[];
    stagedAssets: StageAsset[];
    workflowLogs: string[];
    workspaceSession: WorkspaceSessionState;
    branchNameOverrides: BranchNameOverrides;
    branchContinuationSourceByBranchOriginId: BranchContinuationSourceByOriginId;
    generatedImageUrls: string[];
    selectedImageIndex: number;
    selectedHistoryId: string | null;
    composerState: WorkspaceComposerState;
    conversationState: WorkspaceConversationState;
    isHydratingBlobs?: boolean;
};

export function useWorkspaceSnapshotPersistence({
    history,
    stagedAssets,
    workflowLogs,
    workspaceSession,
    branchNameOverrides,
    branchContinuationSourceByBranchOriginId,
    generatedImageUrls,
    selectedImageIndex,
    selectedHistoryId,
    composerState,
    conversationState,
    isHydratingBlobs = false,
}: UseWorkspaceSnapshotPersistenceArgs) {
    const composeCurrentWorkspaceSnapshot = useCallback(
        () =>
            sanitizeWorkspaceSnapshot({
                history,
                stagedAssets,
                workflowLogs,
                queuedJobs: [],
                workspaceSession,
                branchState: {
                    nameOverrides: branchNameOverrides,
                    continuationSourceByBranchOriginId: branchContinuationSourceByBranchOriginId,
                },
                viewState: {
                    generatedImageUrls,
                    selectedImageIndex,
                    selectedHistoryId,
                },
                composerState,
                conversationState,
            }),
        [
            branchContinuationSourceByBranchOriginId,
            branchNameOverrides,
            composerState,
            conversationState,
            generatedImageUrls,
            history,
            selectedHistoryId,
            selectedImageIndex,
            stagedAssets,
            workflowLogs,
            workspaceSession,
        ],
    );

    useEffect(() => {
        const snapshot = composeCurrentWorkspaceSnapshot();
        saveWorkspaceSnapshot(snapshot);
        void saveSharedWorkspaceSnapshot(snapshot);

        if (isHydratingBlobs) {
            return;
        }

        const pruneTimerId = window.setTimeout(() => {
            const referencedKeys = collectSnapshotReferencedBlobKeys(snapshot);
            void pruneUnreferencedWorkspaceBlobs(referencedKeys);
        }, 750);

        return () => {
            window.clearTimeout(pruneTimerId);
        };
    }, [composeCurrentWorkspaceSnapshot, isHydratingBlobs]);

    return {
        composeCurrentWorkspaceSnapshot,
    };
}
