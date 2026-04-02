import { useCallback, useMemo } from 'react';
import { GeneratedImage, QueuedBatchJob, StageAsset, WorkspaceSessionState } from '../types';

type UseQueuedBatchPresentationArgs = {
    currentStageAsset: StageAsset | null;
    objectImageCount: number;
    characterImageCount: number;
    workspaceSession: WorkspaceSessionState;
    history: GeneratedImage[];
    t: (key: string) => string;
};

const sortQueuedBatchHistoryItems = (left: GeneratedImage, right: GeneratedImage) => {
    const leftIndex =
        typeof left.metadata?.batchResultIndex === 'number' ? left.metadata.batchResultIndex : Number.MAX_SAFE_INTEGER;
    const rightIndex =
        typeof right.metadata?.batchResultIndex === 'number'
            ? right.metadata.batchResultIndex
            : Number.MAX_SAFE_INTEGER;
    if (leftIndex !== rightIndex) {
        return leftIndex - rightIndex;
    }

    return left.createdAt - right.createdAt;
};

export function useQueuedBatchPresentation({
    currentStageAsset,
    objectImageCount,
    characterImageCount,
    workspaceSession,
    history,
    t,
}: UseQueuedBatchPresentationArgs) {
    const queueBatchModeSummary = useMemo(() => {
        if (currentStageAsset?.url) {
            return t('queueBatchModeStage');
        }

        if (objectImageCount > 0 || characterImageCount > 0) {
            return t('queueBatchModeReferences');
        }

        return t('queueBatchModePromptOnly');
    }, [characterImageCount, currentStageAsset?.url, objectImageCount, t]);

    const queueBatchConversationNotice = useMemo(
        () =>
            workspaceSession.conversationId ||
            workspaceSession.conversationBranchOriginId ||
            workspaceSession.conversationActiveSourceHistoryId
                ? t('queueBatchConversationNotice')
                : null,
        [
            t,
            workspaceSession.conversationActiveSourceHistoryId,
            workspaceSession.conversationBranchOriginId,
            workspaceSession.conversationId,
        ],
    );

    const queuedBatchHistoryByJobName = useMemo(() => {
        const groupedHistory = new Map<string, GeneratedImage[]>();

        history.forEach((item) => {
            if (item.executionMode !== 'queued-batch-job' || !item.variantGroupId) {
                return;
            }

            const existingItems = groupedHistory.get(item.variantGroupId);
            if (existingItems) {
                existingItems.push(item);
                return;
            }

            groupedHistory.set(item.variantGroupId, [item]);
        });

        groupedHistory.forEach((items, jobName) => {
            groupedHistory.set(jobName, [...items].sort(sortQueuedBatchHistoryItems));
        });

        return groupedHistory;
    }, [history]);

    const getImportedQueuedHistoryItems = useCallback(
        (job: QueuedBatchJob) => queuedBatchHistoryByJobName.get(job.name) || [],
        [queuedBatchHistoryByJobName],
    );

    const getImportedQueuedResultCount = useCallback(
        (job: QueuedBatchJob) => queuedBatchHistoryByJobName.get(job.name)?.length || 0,
        [queuedBatchHistoryByJobName],
    );

    const getQueuedBatchPositionLabel = useCallback(
        (item: GeneratedImage) => {
            if (item.executionMode !== 'queued-batch-job' || !item.variantGroupId) {
                return null;
            }

            const siblings = queuedBatchHistoryByJobName.get(item.variantGroupId) || [];
            if (siblings.length <= 1) {
                return null;
            }

            const itemIndex = siblings.findIndex((candidate) => candidate.id === item.id);
            return itemIndex >= 0 ? `#${itemIndex + 1}/${siblings.length}` : null;
        },
        [queuedBatchHistoryByJobName],
    );

    return {
        queueBatchModeSummary,
        queueBatchConversationNotice,
        getImportedQueuedHistoryItems,
        getImportedQueuedResultCount,
        getQueuedBatchPositionLabel,
    };
}
