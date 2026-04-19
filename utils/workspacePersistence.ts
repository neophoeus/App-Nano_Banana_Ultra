import {
    BranchContinuationSourceByOriginId,
    BranchNameOverrides,
    BranchConversationRecord,
    GeneratedImage,
    QueuedBatchJob,
    QueuedBatchJobImportIssue,
    ResultPart,
    StageAsset,
    WorkspaceBranchState,
    WorkspaceComposerState,
    WorkspaceConversationState,
    WorkspacePersistenceSnapshot,
    WorkspaceSessionState,
    WorkspaceViewState,
} from '../types';
import {
    EMPTY_WORKSPACE_CONVERSATION_STATE,
    getNormalizedConversationTurnIds,
    resolveConversationSelectionState,
} from './conversationState';
import { resolveDisplayGenerationFailureInfo } from './generationFailure';
import { sanitizeSessionHintsForStorage } from './inlineImageDisplay';
import { buildLineagePresentation } from './lineage';
import { normalizeImageStyle } from './styleRegistry';

export const WORKSPACE_SNAPSHOT_STORAGE_KEY = 'nbu_workspaceSnapshot';
export const SHARED_WORKSPACE_SNAPSHOT_ENDPOINT = '/api/workspace-snapshot';
const LEGACY_BRANCH_NAME_OVERRIDES_STORAGE_KEY = 'nbu_branchNameOverrides';
const WORKSPACE_SNAPSHOT_EXPORT_FORMAT = 'nbu-workspace-snapshot';
const WORKSPACE_SNAPSHOT_EXPORT_VERSION = 1;
const INLINE_ASSET_URL_PREFIX = 'data:';
const LOAD_IMAGE_ENDPOINT = '/api/load-image';

export const EMPTY_WORKSPACE_SESSION: WorkspaceSessionState = {
    activeResult: null,
    continuityGrounding: null,
    continuitySessionHints: null,
    provenanceMode: null,
    provenanceSourceHistoryId: null,
    conversationId: null,
    conversationBranchOriginId: null,
    conversationActiveSourceHistoryId: null,
    conversationTurnIds: [],
    source: null,
    sourceHistoryId: null,
    sourceLineageAction: null,
    updatedAt: null,
};

export const EMPTY_WORKSPACE_BRANCH_STATE: WorkspaceBranchState = {
    nameOverrides: {},
    continuationSourceByBranchOriginId: {},
};

export const EMPTY_WORKSPACE_VIEW_STATE: WorkspaceViewState = {
    generatedImageUrls: [],
    selectedImageIndex: 0,
    selectedHistoryId: null,
};

export const EMPTY_WORKSPACE_COMPOSER_STATE: WorkspaceComposerState = {
    prompt: '',
    aspectRatio: '1:1',
    imageSize: '2K',
    imageStyle: 'None',
    imageModel: 'gemini-3.1-flash-image-preview',
    batchSize: 1,
    outputFormat: 'images-only',
    temperature: 1,
    thinkingLevel: 'minimal',
    includeThoughts: true,
    googleSearch: false,
    imageSearch: false,
    stickySendIntent: 'independent',
    generationMode: 'Text to Image',
    executionMode: 'single-turn',
};

export const EMPTY_WORKSPACE_SNAPSHOT: WorkspacePersistenceSnapshot = {
    history: [],
    stagedAssets: [],
    workflowLogs: [],
    queuedJobs: [],
    workspaceSession: EMPTY_WORKSPACE_SESSION,
    branchState: EMPTY_WORKSPACE_BRANCH_STATE,
    conversationState: EMPTY_WORKSPACE_CONVERSATION_STATE,
    viewState: EMPTY_WORKSPACE_VIEW_STATE,
    composerState: EMPTY_WORKSPACE_COMPOSER_STATE,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const isInlineAssetUrl = (value: string): boolean => value.startsWith(INLINE_ASSET_URL_PREFIX);
const isNonEmptyAssetUrl = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

const buildLoadImageUrl = (savedFilename: string): string =>
    `${LOAD_IMAGE_ENDPOINT}?filename=${encodeURIComponent(savedFilename)}`;

const isImageResultPart = (part: ResultPart): part is Extract<ResultPart, { imageUrl: string }> =>
    part.kind === 'thought-image' || part.kind === 'output-image';

const sanitizeResultParts = (value: unknown): ResultPart[] | undefined => {
    if (!Array.isArray(value)) {
        return undefined;
    }

    return value.flatMap((part) => {
        if (!isRecord(part) || typeof part.sequence !== 'number' || typeof part.kind !== 'string') {
            return [];
        }

        if ((part.kind === 'thought-text' || part.kind === 'output-text') && typeof part.text === 'string') {
            return [
                {
                    sequence: part.sequence,
                    kind: part.kind,
                    text: part.text,
                } satisfies ResultPart,
            ];
        }

        if (
            (part.kind === 'thought-image' || part.kind === 'output-image') &&
            typeof part.imageUrl === 'string' &&
            typeof part.mimeType === 'string'
        ) {
            return [
                {
                    sequence: part.sequence,
                    kind: part.kind,
                    imageUrl: part.imageUrl,
                    mimeType: part.mimeType,
                    savedFilename: typeof part.savedFilename === 'string' ? part.savedFilename : undefined,
                } satisfies ResultPart,
            ];
        }

        return [];
    });
};

const buildPersistableResultPart = (part: ResultPart): ResultPart => {
    if (!isImageResultPart(part)) {
        return part;
    }

    if (part.savedFilename) {
        return {
            ...part,
            imageUrl: buildLoadImageUrl(part.savedFilename),
        };
    }

    if (isInlineAssetUrl(part.imageUrl)) {
        return {
            ...part,
            imageUrl: '',
        };
    }

    return part;
};

const buildRuntimeResultPart = (part: ResultPart): ResultPart => {
    if (!isImageResultPart(part)) {
        return part;
    }

    if (part.savedFilename) {
        return {
            ...part,
            imageUrl: buildLoadImageUrl(part.savedFilename),
        };
    }

    if (isInlineAssetUrl(part.imageUrl)) {
        return {
            ...part,
            imageUrl: '',
        };
    }

    return part;
};

const getHistoryThumbnailLoadUrl = (item: GeneratedImage): string | null =>
    typeof item.thumbnailSavedFilename === 'string' && item.thumbnailSavedFilename.trim().length > 0
        ? buildLoadImageUrl(item.thumbnailSavedFilename)
        : null;

const hasPersistableInlineThumbnail = (item: GeneratedImage): boolean =>
    item.thumbnailInline === true && isInlineAssetUrl(item.url);

const isLegacyFullResolutionHistoryUrl = (item: GeneratedImage): boolean =>
    Boolean(
        item.savedFilename && !getHistoryThumbnailLoadUrl(item) && item.url === buildLoadImageUrl(item.savedFilename),
    );

const shouldStripInlineGeneratedStageAssetForPersistence = (asset: StageAsset): boolean =>
    isInlineAssetUrl(asset.url) &&
    !asset.savedFilename &&
    (asset.origin === 'generated' || asset.origin === 'history' || asset.origin === 'editor');

const buildPersistableHistoryItem = (item: GeneratedImage): GeneratedImage => {
    const thumbnailLoadUrl = getHistoryThumbnailLoadUrl(item);

    if (thumbnailLoadUrl) {
        return {
            ...item,
            url: thumbnailLoadUrl,
            resultParts: item.resultParts?.map(buildPersistableResultPart),
        };
    }

    if (hasPersistableInlineThumbnail(item)) {
        return {
            ...item,
            resultParts: item.resultParts?.map(buildPersistableResultPart),
        };
    }

    if (isLegacyFullResolutionHistoryUrl(item) || isInlineAssetUrl(item.url)) {
        return {
            ...item,
            url: '',
            resultParts: item.resultParts?.map(buildPersistableResultPart),
        };
    }

    return {
        ...item,
        resultParts: item.resultParts?.map(buildPersistableResultPart),
    };
};

const buildPersistableStageAsset = (asset: StageAsset): StageAsset => {
    if (asset.savedFilename && isInlineAssetUrl(asset.url)) {
        return {
            ...asset,
            url: buildLoadImageUrl(asset.savedFilename),
        };
    }

    if (shouldStripInlineGeneratedStageAssetForPersistence(asset)) {
        return {
            ...asset,
            url: '',
        };
    }

    return asset;
};

const collectRuntimeInlineHistoryIds = (
    history: GeneratedImage[],
    snapshot: Pick<WorkspacePersistenceSnapshot, 'viewState' | 'workspaceSession' | 'conversationState'>,
): Set<string> => {
    const historyById = new Map(history.map((item) => [item.id, item]));
    const preservedHistoryIds = new Set<string>();
    const pushHistoryId = (historyId?: string | null) => {
        if (historyId) {
            preservedHistoryIds.add(historyId);
        }
    };

    pushHistoryId(snapshot.viewState.selectedHistoryId);
    pushHistoryId(snapshot.workspaceSession.activeResult?.historyId);
    pushHistoryId(snapshot.workspaceSession.sourceHistoryId);
    snapshot.workspaceSession.conversationTurnIds.forEach(pushHistoryId);

    Object.values(snapshot.conversationState.byBranchOriginId).forEach((record) => {
        pushHistoryId(record.activeSourceHistoryId);
        record.turnIds.forEach(pushHistoryId);
    });

    let changed = true;
    while (changed) {
        changed = false;

        preservedHistoryIds.forEach((historyId) => {
            const item = historyById.get(historyId);
            if (!item) {
                return;
            }

            [item.conversationSourceHistoryId, item.parentHistoryId, item.rootHistoryId, item.sourceHistoryId].forEach(
                (relatedHistoryId) => {
                    if (relatedHistoryId && !preservedHistoryIds.has(relatedHistoryId)) {
                        preservedHistoryIds.add(relatedHistoryId);
                        changed = true;
                    }
                },
            );
        });
    }

    return preservedHistoryIds;
};

const buildRuntimeHistoryItem = (item: GeneratedImage, preservedInlineHistoryIds: Set<string>): GeneratedImage => {
    const thumbnailLoadUrl = getHistoryThumbnailLoadUrl(item);

    if (thumbnailLoadUrl) {
        return {
            ...item,
            url: thumbnailLoadUrl,
            resultParts: item.resultParts?.map(buildRuntimeResultPart),
        };
    }

    if (hasPersistableInlineThumbnail(item)) {
        return {
            ...item,
            resultParts: item.resultParts?.map(buildRuntimeResultPart),
        };
    }

    if (
        isLegacyFullResolutionHistoryUrl(item) ||
        (!item.savedFilename && isInlineAssetUrl(item.url) && !preservedInlineHistoryIds.has(item.id)) ||
        (item.savedFilename && isInlineAssetUrl(item.url) && !preservedInlineHistoryIds.has(item.id))
    ) {
        return {
            ...item,
            url: '',
            resultParts: item.resultParts?.map(buildRuntimeResultPart),
        };
    }

    return {
        ...item,
        resultParts: item.resultParts?.map(buildRuntimeResultPart),
    };
};

const shouldPreserveRuntimeStageAsset = (asset: StageAsset, preservedInlineHistoryIds: Set<string>): boolean =>
    asset.role === 'stage-source' &&
    Boolean(asset.sourceHistoryId && preservedInlineHistoryIds.has(asset.sourceHistoryId));

const buildRuntimeStageAsset = (asset: StageAsset, preservedInlineHistoryIds: Set<string>): StageAsset => {
    if (asset.savedFilename && isInlineAssetUrl(asset.url)) {
        return {
            ...asset,
            url: buildLoadImageUrl(asset.savedFilename),
        };
    }

    if (
        shouldStripInlineGeneratedStageAssetForPersistence(asset) &&
        !shouldPreserveRuntimeStageAsset(asset, preservedInlineHistoryIds)
    ) {
        return {
            ...asset,
            url: '',
        };
    }

    return asset;
};

const buildRuntimeWorkspaceSnapshot = (snapshot: WorkspacePersistenceSnapshot): WorkspacePersistenceSnapshot => {
    const normalized = sanitizeWorkspaceSnapshot(snapshot);
    const preservedInlineHistoryIds = collectRuntimeInlineHistoryIds(normalized.history, normalized);
    const historyWithRuntimeAssets = normalized.history.map((item) =>
        buildRuntimeHistoryItem(item, preservedInlineHistoryIds),
    );
    const filteredHistoryWithRuntimeAssets = historyWithRuntimeAssets.filter(
        (item) =>
            item.status === 'failed' ||
            isNonEmptyAssetUrl(item.url) ||
            Boolean(item.savedFilename) ||
            Boolean(item.thumbnailSavedFilename) ||
            item.thumbnailInline === true ||
            item.prompt.trim().length > 0 ||
            Boolean(item.text?.trim()) ||
            Boolean(item.thoughts?.trim()) ||
            Boolean(item.resultParts?.length),
    );
    const selectedHistoryItem =
        filteredHistoryWithRuntimeAssets.find((item) => item.id === normalized.viewState.selectedHistoryId) || null;
    const stagedAssetsWithRuntimeAssets = normalized.stagedAssets.map((asset) =>
        buildRuntimeStageAsset(asset, preservedInlineHistoryIds),
    );
    const currentStageAsset = stagedAssetsWithRuntimeAssets.find((asset) => asset.role === 'stage-source') || null;
    const filteredGeneratedImageUrls = normalized.viewState.generatedImageUrls.filter((url) => !isInlineAssetUrl(url));
    const restoredStageUrl =
        currentStageAsset?.url ||
        filteredGeneratedImageUrls[0] ||
        (selectedHistoryItem?.savedFilename ? buildLoadImageUrl(selectedHistoryItem.savedFilename) : null) ||
        selectedHistoryItem?.url ||
        null;

    return sanitizeWorkspaceSnapshot({
        ...normalized,
        history: filteredHistoryWithRuntimeAssets,
        stagedAssets: stagedAssetsWithRuntimeAssets,
        viewState: {
            ...normalized.viewState,
            generatedImageUrls: restoredStageUrl ? [restoredStageUrl] : filteredGeneratedImageUrls,
            selectedImageIndex: 0,
            selectedHistoryId: selectedHistoryItem?.id || null,
        },
    });
};

const isStorageQuotaError = (error: unknown): boolean => {
    if (typeof error !== 'object' || error === null) {
        return false;
    }

    const storageError = error as { name?: string; code?: number; message?: string };
    return (
        storageError.name === 'QuotaExceededError' ||
        storageError.code === 22 ||
        storageError.code === 1014 ||
        storageError.message?.toLowerCase().includes('quota') === true
    );
};

const buildPersistableWorkspaceSnapshot = (
    snapshot: WorkspacePersistenceSnapshot,
    options?: { aggressive?: boolean },
): WorkspacePersistenceSnapshot => {
    const normalized = sanitizeWorkspaceSnapshot(snapshot);
    const historyWithLinkedAssets = normalized.history.map(buildPersistableHistoryItem);
    const selectedHistoryItem =
        historyWithLinkedAssets.find((item) => item.id === normalized.viewState.selectedHistoryId) || null;
    const stagedAssetsWithLinkedAssets = normalized.stagedAssets.map(buildPersistableStageAsset);
    const currentStageAsset = stagedAssetsWithLinkedAssets.find((asset) => asset.role === 'stage-source') || null;
    const filteredGeneratedImageUrls = normalized.viewState.generatedImageUrls.filter((url) => !isInlineAssetUrl(url));
    const restoredStageUrl =
        filteredGeneratedImageUrls[0] ||
        currentStageAsset?.url ||
        (selectedHistoryItem?.savedFilename ? buildLoadImageUrl(selectedHistoryItem.savedFilename) : null) ||
        selectedHistoryItem?.url ||
        null;

    return sanitizeWorkspaceSnapshot({
        ...normalized,
        history: options?.aggressive
            ? historyWithLinkedAssets.map((item) =>
                  isInlineAssetUrl(item.url)
                      ? {
                            ...item,
                            url: '',
                        }
                      : item,
              )
            : historyWithLinkedAssets,
        stagedAssets: options?.aggressive
            ? stagedAssetsWithLinkedAssets.map((asset) =>
                  isInlineAssetUrl(asset.url)
                      ? {
                            ...asset,
                            url: '',
                        }
                      : asset,
              )
            : stagedAssetsWithLinkedAssets,
        queuedJobs: [],
        viewState: {
            ...normalized.viewState,
            generatedImageUrls: restoredStageUrl ? [restoredStageUrl] : filteredGeneratedImageUrls,
            selectedImageIndex: (restoredStageUrl ? 1 : filteredGeneratedImageUrls.length) === 0 ? 0 : 0,
        },
    });
};

const sanitizeBranchNameOverrides = (value: unknown): BranchNameOverrides => {
    if (!isRecord(value)) {
        return {};
    }

    return Object.fromEntries(
        Object.entries(value).filter(([key, item]) => typeof key === 'string' && typeof item === 'string'),
    );
};

const sanitizeHistory = (value: unknown): GeneratedImage[] => {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.flatMap((item) => {
        if (
            !(
                isRecord(item) &&
                typeof item.id === 'string' &&
                typeof item.url === 'string' &&
                typeof item.prompt === 'string'
            )
        ) {
            return [];
        }

        const sessionHints =
            sanitizeSessionHintsForStorage(
                isRecord(item.sessionHints) ? (item.sessionHints as Record<string, unknown>) : null,
            ) || undefined;
        const normalizedFailure = resolveDisplayGenerationFailureInfo({
            failure: item.failure,
            error: typeof item.error === 'string' ? item.error : null,
            promptBlockReason: isRecord(sessionHints) ? sessionHints.promptBlockReason : null,
            finishReason: isRecord(sessionHints) ? sessionHints.finishReason : null,
            blockedSafetyCategories: isRecord(sessionHints) ? sessionHints.blockedSafetyCategories : null,
            extractionIssue: isRecord(sessionHints) ? sessionHints.extractionIssue : null,
            returnedTextContent: isRecord(sessionHints) ? sessionHints.textReturned === true : false,
            returnedThoughtContent: isRecord(sessionHints) ? sessionHints.thoughtsReturned === true : false,
        });
        const failureContext =
            isRecord(item.failureContext) && item.failureContext.hasSiblingSafetyBlockedFailure === true
                ? { hasSiblingSafetyBlockedFailure: true }
                : undefined;

        return [
            {
                ...(item as GeneratedImage),
                style: normalizeImageStyle(item.style),
                resultParts: sanitizeResultParts(item.resultParts),
                openedAt:
                    typeof item.openedAt === 'number' && Number.isFinite(item.openedAt)
                        ? item.openedAt
                        : item.openedAt === null
                          ? null
                          : undefined,
                failure: normalizedFailure || undefined,
                failureContext,
                sessionHints,
            },
        ];
    });
};

const sanitizeStagedAssets = (value: unknown): StageAsset[] => {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.filter(
        (item): item is StageAsset =>
            isRecord(item) &&
            typeof item.id === 'string' &&
            typeof item.url === 'string' &&
            typeof item.role === 'string' &&
            typeof item.origin === 'string' &&
            typeof item.createdAt === 'number',
    );
};

const sanitizeWorkflowLogs = (value: unknown): string[] => {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.filter((item): item is string => typeof item === 'string');
};

const sanitizeQueuedBatchJobImportIssues = (value: unknown): QueuedBatchJobImportIssue[] => {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.flatMap((item): QueuedBatchJobImportIssue[] => {
        if (
            !(
                isRecord(item) &&
                typeof item.index === 'number' &&
                Number.isFinite(item.index) &&
                typeof item.error === 'string'
            )
        ) {
            return [];
        }

        const normalizedError = item.error.trim();
        if (!normalizedError) {
            return [];
        }

        const finishReason =
            typeof item.finishReason === 'string' && item.finishReason.trim().length > 0
                ? item.finishReason.trim()
                : null;
        const extractionIssue =
            item.extractionIssue === 'missing-candidates' ||
            item.extractionIssue === 'missing-parts' ||
            item.extractionIssue === 'no-image-data'
                ? item.extractionIssue
                : null;
        const blockedSafetyCategories = Array.isArray(item.blockedSafetyCategories)
            ? item.blockedSafetyCategories.filter(
                  (entry): entry is string => typeof entry === 'string' && entry.trim().length > 0,
              )
            : [];

        return [
            {
                index: Math.max(0, Math.floor(item.index)),
                error: normalizedError,
                ...(finishReason ? { finishReason } : {}),
                ...(extractionIssue ? { extractionIssue } : {}),
                ...(blockedSafetyCategories.length > 0 ? { blockedSafetyCategories } : {}),
                ...(item.returnedTextContent === true ? { returnedTextContent: true } : {}),
                ...(item.returnedThoughtContent === true ? { returnedThoughtContent: true } : {}),
            },
        ];
    });
};

export const sanitizeQueuedBatchJobs = (value: unknown): QueuedBatchJob[] => {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.flatMap((item): QueuedBatchJob[] => {
        if (
            !(
                isRecord(item) &&
                typeof item.localId === 'string' &&
                typeof item.name === 'string' &&
                typeof item.displayName === 'string' &&
                typeof item.state === 'string' &&
                typeof item.model === 'string' &&
                typeof item.prompt === 'string' &&
                typeof item.aspectRatio === 'string' &&
                typeof item.imageSize === 'string' &&
                typeof item.style === 'string' &&
                typeof item.outputFormat === 'string' &&
                typeof item.temperature === 'number' &&
                typeof item.thinkingLevel === 'string' &&
                typeof item.includeThoughts === 'boolean' &&
                typeof item.googleSearch === 'boolean' &&
                typeof item.imageSearch === 'boolean' &&
                typeof item.batchSize === 'number' &&
                typeof item.objectImageCount === 'number' &&
                typeof item.characterImageCount === 'number' &&
                typeof item.createdAt === 'number' &&
                typeof item.updatedAt === 'number'
            )
        ) {
            return [];
        }

        const importDiagnostic =
            item.importDiagnostic === 'no-payload' || item.importDiagnostic === 'extraction-failure'
                ? item.importDiagnostic
                : null;
        const hasExplicitImportIssues = Array.isArray(item.importIssues) || item.importIssues === null;
        const importIssues = sanitizeQueuedBatchJobImportIssues(item.importIssues);
        const migratedHasInlinedResponses =
            typeof item.hasInlinedResponses === 'boolean'
                ? item.hasInlinedResponses
                : importDiagnostic === 'extraction-failure'
                  ? true
                  : importDiagnostic === 'no-payload'
                    ? false
                    : item.state === 'JOB_STATE_SUCCEEDED'
                      ? true
                      : undefined;
        const { importedAt: _importedAt, ...queuedJobWithoutImportedAt } = item as QueuedBatchJob & {
            importedAt?: unknown;
        };

        return [
            {
                ...queuedJobWithoutImportedAt,
                style: normalizeImageStyle(item.style),
                ...(importDiagnostic ? { importDiagnostic } : {}),
                ...(hasExplicitImportIssues ? { importIssues: importIssues.length > 0 ? importIssues : null } : {}),
                ...(typeof migratedHasInlinedResponses === 'boolean'
                    ? { hasInlinedResponses: migratedHasInlinedResponses }
                    : {}),
            },
        ];
    });
};

const sanitizeConversationRecord = (branchOriginId: string, value: unknown): BranchConversationRecord | null => {
    if (!isRecord(value)) {
        return null;
    }

    const conversationId = typeof value.conversationId === 'string' ? value.conversationId : null;
    if (!conversationId) {
        return null;
    }

    const record: BranchConversationRecord = {
        conversationId,
        branchOriginId,
        activeSourceHistoryId: typeof value.activeSourceHistoryId === 'string' ? value.activeSourceHistoryId : null,
        turnIds: Array.isArray(value.turnIds)
            ? value.turnIds.filter((item): item is string => typeof item === 'string')
            : [],
        startedAt:
            typeof value.startedAt === 'number' && Number.isFinite(value.startedAt) ? value.startedAt : Date.now(),
        updatedAt: typeof value.updatedAt === 'number' && Number.isFinite(value.updatedAt) ? value.updatedAt : null,
    };

    return {
        ...record,
        turnIds: getNormalizedConversationTurnIds(record),
    };
};

const sanitizeWorkspaceConversationState = (value: unknown): WorkspaceConversationState => {
    if (!isRecord(value) || !isRecord(value.byBranchOriginId)) {
        return EMPTY_WORKSPACE_CONVERSATION_STATE;
    }

    return {
        byBranchOriginId: Object.fromEntries(
            Object.entries(value.byBranchOriginId)
                .map(([branchOriginId, record]) => [branchOriginId, sanitizeConversationRecord(branchOriginId, record)])
                .filter((entry): entry is [string, BranchConversationRecord] => Boolean(entry[1])),
        ),
    };
};

const sanitizeWorkspaceSession = (value: unknown): WorkspaceSessionState => {
    if (!isRecord(value)) {
        return EMPTY_WORKSPACE_SESSION;
    }

    const activeResult = isRecord(value.activeResult)
        ? {
              ...value.activeResult,
              resultParts: sanitizeResultParts(value.activeResult.resultParts) || null,
              sessionHints: sanitizeSessionHintsForStorage(
                  isRecord(value.activeResult.sessionHints)
                      ? (value.activeResult.sessionHints as Record<string, unknown>)
                      : null,
              ),
          }
        : null;

    return {
        ...EMPTY_WORKSPACE_SESSION,
        ...value,
        activeResult: activeResult as WorkspaceSessionState['activeResult'],
        continuitySessionHints: sanitizeSessionHintsForStorage(
            isRecord(value.continuitySessionHints) ? (value.continuitySessionHints as Record<string, unknown>) : null,
        ),
        conversationId: typeof value.conversationId === 'string' ? value.conversationId : null,
        conversationBranchOriginId:
            typeof value.conversationBranchOriginId === 'string' ? value.conversationBranchOriginId : null,
        conversationActiveSourceHistoryId:
            typeof value.conversationActiveSourceHistoryId === 'string'
                ? value.conversationActiveSourceHistoryId
                : null,
        conversationTurnIds: Array.isArray(value.conversationTurnIds)
            ? value.conversationTurnIds.filter((item): item is string => typeof item === 'string')
            : [],
        sourceLineageAction:
            value.sourceLineageAction === 'continue' || value.sourceLineageAction === 'branch'
                ? value.sourceLineageAction
                : null,
    } as WorkspaceSessionState;
};

const normalizeWorkspaceSessionConversation = ({
    history,
    branchState,
    conversationState,
    viewState: _viewState,
    workspaceSession,
}: {
    history: GeneratedImage[];
    branchState: WorkspaceBranchState;
    conversationState: WorkspaceConversationState;
    viewState: WorkspaceViewState;
    workspaceSession: WorkspaceSessionState;
}): WorkspaceSessionState => {
    const selectedHistoryId = workspaceSession.sourceHistoryId || workspaceSession.activeResult?.historyId || null;

    if (!selectedHistoryId) {
        return {
            ...workspaceSession,
            conversationId: null,
            conversationBranchOriginId: null,
            conversationActiveSourceHistoryId: null,
            conversationTurnIds: [],
        };
    }

    const { branchOriginIdByTurnId } = buildLineagePresentation(history, branchState.nameOverrides);
    const conversationSelection = resolveConversationSelectionState(conversationState, {
        selectedHistoryId,
        preferredBranchOriginId: branchOriginIdByTurnId[selectedHistoryId] || selectedHistoryId,
        conversationBranchOriginId: workspaceSession.conversationBranchOriginId,
    });

    return {
        ...workspaceSession,
        conversationId: conversationSelection.conversationId,
        conversationBranchOriginId: conversationSelection.conversationId ? conversationSelection.branchOriginId : null,
        conversationActiveSourceHistoryId: conversationSelection.conversationActiveSourceHistoryId,
        conversationTurnIds: conversationSelection.conversationTurnIds,
    };
};

const sanitizeWorkspaceViewState = (value: unknown): WorkspaceViewState => {
    if (!isRecord(value)) {
        return EMPTY_WORKSPACE_VIEW_STATE;
    }

    const generatedImageUrls = Array.isArray(value.generatedImageUrls)
        ? value.generatedImageUrls.filter(isNonEmptyAssetUrl)
        : [];
    const selectedImageIndex =
        typeof value.selectedImageIndex === 'number' && Number.isFinite(value.selectedImageIndex)
            ? value.selectedImageIndex
            : 0;
    const normalizedIndex =
        generatedImageUrls.length === 0 ? 0 : Math.max(0, Math.min(selectedImageIndex, generatedImageUrls.length - 1));

    return {
        generatedImageUrls,
        selectedImageIndex: normalizedIndex,
        selectedHistoryId: typeof value.selectedHistoryId === 'string' ? value.selectedHistoryId : null,
    };
};

const sanitizeWorkspaceComposerState = (value: unknown): WorkspaceComposerState => {
    if (!isRecord(value)) {
        return EMPTY_WORKSPACE_COMPOSER_STATE;
    }

    return {
        ...EMPTY_WORKSPACE_COMPOSER_STATE,
        ...value,
        prompt: typeof value.prompt === 'string' ? value.prompt : EMPTY_WORKSPACE_COMPOSER_STATE.prompt,
        imageStyle: normalizeImageStyle(value.imageStyle),
        batchSize:
            typeof value.batchSize === 'number' && Number.isFinite(value.batchSize)
                ? value.batchSize
                : EMPTY_WORKSPACE_COMPOSER_STATE.batchSize,
        temperature:
            typeof value.temperature === 'number' && Number.isFinite(value.temperature)
                ? value.temperature
                : EMPTY_WORKSPACE_COMPOSER_STATE.temperature,
        includeThoughts: Boolean(value.includeThoughts),
        googleSearch: Boolean(value.googleSearch),
        imageSearch: Boolean(value.imageSearch),
        stickySendIntent:
            value.stickySendIntent === 'memory' || value.stickySendIntent === 'independent'
                ? value.stickySendIntent
                : EMPTY_WORKSPACE_COMPOSER_STATE.stickySendIntent,
        generationMode:
            typeof value.generationMode === 'string'
                ? value.generationMode
                : EMPTY_WORKSPACE_COMPOSER_STATE.generationMode,
        executionMode:
            typeof value.executionMode === 'string'
                ? value.executionMode
                : EMPTY_WORKSPACE_COMPOSER_STATE.executionMode,
    } as WorkspaceComposerState;
};

export const sanitizeWorkspaceSnapshot = (value: unknown): WorkspacePersistenceSnapshot => {
    if (!isRecord(value)) {
        return EMPTY_WORKSPACE_SNAPSHOT;
    }

    const history = sanitizeHistory(value.history);
    const rawWorkspaceSession = sanitizeWorkspaceSession(value.workspaceSession);
    const conversationState = sanitizeWorkspaceConversationState(value.conversationState);
    const branchState: WorkspaceBranchState = {
        nameOverrides: sanitizeBranchNameOverrides(
            isRecord(value.branchState) ? value.branchState.nameOverrides : undefined,
        ),
        continuationSourceByBranchOriginId: sanitizeBranchContinuationSourceByOriginId(
            isRecord(value.branchState) ? value.branchState.continuationSourceByBranchOriginId : undefined,
        ),
    };

    if (
        Object.keys(branchState.continuationSourceByBranchOriginId).length === 0 &&
        rawWorkspaceSession.sourceHistoryId &&
        rawWorkspaceSession.sourceLineageAction !== 'branch'
    ) {
        const { branchOriginIdByTurnId } = buildLineagePresentation(history, branchState.nameOverrides);
        const branchOriginId =
            branchOriginIdByTurnId[rawWorkspaceSession.sourceHistoryId] || rawWorkspaceSession.sourceHistoryId;
        branchState.continuationSourceByBranchOriginId = {
            [branchOriginId]: rawWorkspaceSession.sourceHistoryId,
        };
    }

    const viewState = sanitizeWorkspaceViewState(value.viewState);
    const workspaceSession = normalizeWorkspaceSessionConversation({
        history,
        branchState,
        conversationState,
        viewState,
        workspaceSession: rawWorkspaceSession,
    });

    return {
        history,
        stagedAssets: sanitizeStagedAssets(value.stagedAssets),
        workflowLogs: sanitizeWorkflowLogs(value.workflowLogs),
        queuedJobs: sanitizeQueuedBatchJobs(value.queuedJobs),
        workspaceSession,
        branchState,
        conversationState,
        viewState,
        composerState: sanitizeWorkspaceComposerState(value.composerState),
    };
};

export const loadWorkspaceSnapshot = (): WorkspacePersistenceSnapshot => {
    const raw = localStorage.getItem(WORKSPACE_SNAPSHOT_STORAGE_KEY);

    if (!raw) {
        return {
            ...EMPTY_WORKSPACE_SNAPSHOT,
            branchState: {
                nameOverrides: sanitizeBranchNameOverrides(
                    (() => {
                        const legacyRaw = localStorage.getItem(LEGACY_BRANCH_NAME_OVERRIDES_STORAGE_KEY);
                        if (!legacyRaw) {
                            return undefined;
                        }

                        try {
                            return JSON.parse(legacyRaw);
                        } catch {
                            return undefined;
                        }
                    })(),
                ),
                continuationSourceByBranchOriginId: {},
            },
        };
    }

    try {
        const parsed = JSON.parse(raw);

        if (!isRecord(parsed)) {
            return EMPTY_WORKSPACE_SNAPSHOT;
        }

        return buildRuntimeWorkspaceSnapshot(parsed);
    } catch {
        return EMPTY_WORKSPACE_SNAPSHOT;
    }
};

export const saveWorkspaceSnapshot = (snapshot: WorkspacePersistenceSnapshot): void => {
    const normalized = sanitizeWorkspaceSnapshot(snapshot);
    const localSnapshot = buildPersistableWorkspaceSnapshot(normalized);
    const compactSnapshot = buildPersistableWorkspaceSnapshot(normalized, { aggressive: true });

    try {
        localStorage.setItem(WORKSPACE_SNAPSHOT_STORAGE_KEY, JSON.stringify(localSnapshot));
        return;
    } catch (error) {
        if (!isStorageQuotaError(error)) {
            console.warn('[workspacePersistence] Failed to persist workspace snapshot.', error);
            return;
        }
    }

    try {
        localStorage.setItem(WORKSPACE_SNAPSHOT_STORAGE_KEY, JSON.stringify(compactSnapshot));
    } catch (error) {
        console.warn('[workspacePersistence] Failed to persist compact workspace snapshot.', error);
    }
};

export const loadSharedWorkspaceSnapshot = async (): Promise<WorkspacePersistenceSnapshot | null> => {
    try {
        const response = await fetch(SHARED_WORKSPACE_SNAPSHOT_ENDPOINT, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
            },
        });

        if (!response.ok) {
            return null;
        }

        const payload = await response.json();
        if (isRecord(payload) && 'snapshot' in payload) {
            return payload.snapshot ? buildRuntimeWorkspaceSnapshot(payload.snapshot) : null;
        }

        return buildRuntimeWorkspaceSnapshot(payload);
    } catch {
        return null;
    }
};

export const saveSharedWorkspaceSnapshot = async (
    snapshot: WorkspacePersistenceSnapshot,
    options?: { allowClearing?: boolean },
): Promise<void> => {
    const normalized = sanitizeWorkspaceSnapshot(snapshot);
    const persistableSnapshot = buildPersistableWorkspaceSnapshot(normalized);
    const hasContent = Boolean(
        normalized.history.length ||
        normalized.stagedAssets.length ||
        normalized.workflowLogs.length ||
        normalized.viewState.generatedImageUrls.length ||
        normalized.viewState.selectedHistoryId ||
        normalized.composerState.prompt.trim() ||
        normalized.workspaceSession.activeResult ||
        normalized.workspaceSession.sourceHistoryId ||
        normalized.workspaceSession.conversationId,
    );

    if (!hasContent && !options?.allowClearing) {
        return;
    }

    try {
        await fetch(SHARED_WORKSPACE_SNAPSHOT_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(persistableSnapshot),
            keepalive: true,
        });
    } catch {
        // Ignore backup persistence failures and keep local snapshot writes non-blocking.
    }
};

export const clearSharedWorkspaceSnapshot = async (): Promise<void> => {
    await saveSharedWorkspaceSnapshot(EMPTY_WORKSPACE_SNAPSHOT, { allowClearing: true });
};

export const exportWorkspaceSnapshotDocument = (snapshot: WorkspacePersistenceSnapshot): string =>
    JSON.stringify(
        {
            format: WORKSPACE_SNAPSHOT_EXPORT_FORMAT,
            version: WORKSPACE_SNAPSHOT_EXPORT_VERSION,
            exportedAt: new Date().toISOString(),
            snapshot: buildPersistableWorkspaceSnapshot(snapshot),
        },
        null,
        2,
    );

export const parseWorkspaceSnapshotDocument = (raw: string): WorkspacePersistenceSnapshot | null => {
    try {
        const parsed = JSON.parse(raw);

        if (isRecord(parsed) && parsed.format === WORKSPACE_SNAPSHOT_EXPORT_FORMAT && 'snapshot' in parsed) {
            return buildRuntimeWorkspaceSnapshot(parsed.snapshot);
        }

        return buildRuntimeWorkspaceSnapshot(parsed);
    } catch {
        return null;
    }
};

export const buildWorkspaceSnapshotExportFilename = (date = new Date()): string => {
    const isoStamp = date.toISOString().replace(/[:]/g, '-').replace(/\..+$/, '');
    return `nano-banana-workspace-${isoStamp}.json`;
};

const remapHistoryReferences = (
    history: GeneratedImage[],
): { history: GeneratedImage[]; idMap: Map<string, string> } => {
    const idMap = new Map<string, string>();

    history.forEach((item) => {
        idMap.set(item.id, crypto.randomUUID());
    });

    return {
        history: history.map((item) => ({
            ...item,
            id: idMap.get(item.id) || item.id,
            conversationSourceHistoryId: item.conversationSourceHistoryId
                ? idMap.get(item.conversationSourceHistoryId) || item.conversationSourceHistoryId
                : item.conversationSourceHistoryId,
            parentHistoryId: item.parentHistoryId
                ? idMap.get(item.parentHistoryId) || item.parentHistoryId
                : item.parentHistoryId,
            rootHistoryId: item.rootHistoryId
                ? idMap.get(item.rootHistoryId) || item.rootHistoryId
                : item.rootHistoryId,
            sourceHistoryId: item.sourceHistoryId
                ? idMap.get(item.sourceHistoryId) || item.sourceHistoryId
                : item.sourceHistoryId,
        })),
        idMap,
    };
};

export const mergeWorkspaceSnapshots = (
    baseSnapshot: WorkspacePersistenceSnapshot,
    incomingSnapshot: WorkspacePersistenceSnapshot,
): WorkspacePersistenceSnapshot => {
    const base = sanitizeWorkspaceSnapshot(baseSnapshot);
    const incoming = sanitizeWorkspaceSnapshot(incomingSnapshot);
    const remappedIncoming = remapHistoryReferences(incoming.history);
    const mergedBranchNameOverrides = {
        ...base.branchState.nameOverrides,
        ...Object.fromEntries(
            Object.entries(incoming.branchState.nameOverrides).map(([historyId, label]) => [
                remappedIncoming.idMap.get(historyId) || historyId,
                label,
            ]),
        ),
    };
    const mergedContinuationSourceByBranchOriginId = {
        ...base.branchState.continuationSourceByBranchOriginId,
        ...Object.fromEntries(
            Object.entries(incoming.branchState.continuationSourceByBranchOriginId).map(
                ([branchOriginId, historyId]) => [
                    remappedIncoming.idMap.get(branchOriginId) || branchOriginId,
                    remappedIncoming.idMap.get(historyId) || historyId,
                ],
            ),
        ),
    };
    const mergedConversationState: WorkspaceConversationState = {
        byBranchOriginId: {
            ...base.conversationState.byBranchOriginId,
            ...Object.fromEntries(
                Object.entries(incoming.conversationState.byBranchOriginId).map(([branchOriginId, record]) => {
                    const remappedBranchOriginId = remappedIncoming.idMap.get(branchOriginId) || branchOriginId;
                    return [
                        remappedBranchOriginId,
                        {
                            ...record,
                            branchOriginId: remappedBranchOriginId,
                            activeSourceHistoryId: record.activeSourceHistoryId
                                ? remappedIncoming.idMap.get(record.activeSourceHistoryId) ||
                                  record.activeSourceHistoryId
                                : null,
                            turnIds: record.turnIds.map((turnId) => remappedIncoming.idMap.get(turnId) || turnId),
                        },
                    ];
                }),
            ),
        },
    };
    const mergedWorkspaceSession: WorkspaceSessionState = {
        ...base.workspaceSession,
        conversationBranchOriginId: base.workspaceSession.conversationBranchOriginId,
        conversationId: base.workspaceSession.conversationId,
        conversationActiveSourceHistoryId: base.workspaceSession.conversationActiveSourceHistoryId,
        conversationTurnIds: base.workspaceSession.conversationTurnIds,
    };

    return sanitizeWorkspaceSnapshot({
        ...base,
        history: [...remappedIncoming.history, ...base.history].sort((left, right) => right.createdAt - left.createdAt),
        workflowLogs: base.workflowLogs,
        queuedJobs: [],
        workspaceSession: mergedWorkspaceSession,
        branchState: {
            nameOverrides: mergedBranchNameOverrides,
            continuationSourceByBranchOriginId: mergedContinuationSourceByBranchOriginId,
        },
        conversationState: mergedConversationState,
    });
};

const sanitizeBranchContinuationSourceByOriginId = (value: unknown): BranchContinuationSourceByOriginId => {
    if (!isRecord(value)) {
        return {};
    }

    return Object.fromEntries(
        Object.entries(value).filter(([key, item]) => typeof key === 'string' && typeof item === 'string'),
    );
};
