import {
    BranchConversationRecord,
    ConversationImageAssetReference,
    ConversationRequestContext,
    ConversationTurnReference,
    GeneratedImage,
    WorkspaceConversationState,
} from '../types';

const createConversationId = (): string => {
    if (globalThis.crypto?.randomUUID) {
        return globalThis.crypto.randomUUID();
    }

    return `conversation-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

const inferMimeTypeFromUrl = (url?: string | null): string | null => {
    if (!url) {
        return null;
    }

    const dataUrlMatch = url.match(/^data:([^;]+);base64,/i);
    if (dataUrlMatch?.[1]) {
        return dataUrlMatch[1];
    }

    if (/\.jpe?g($|\?)/i.test(url)) {
        return 'image/jpeg';
    }
    if (/\.webp($|\?)/i.test(url)) {
        return 'image/webp';
    }

    return 'image/png';
};

const buildImageAssetReference = (item: GeneratedImage | null): ConversationImageAssetReference | null => {
    if (!item) {
        return null;
    }

    if (item.savedFilename) {
        return {
            savedFilename: item.savedFilename,
            mimeType: inferMimeTypeFromUrl(item.savedFilename),
        };
    }

    if (item.url) {
        return {
            dataUrl: item.url,
            mimeType: inferMimeTypeFromUrl(item.url),
        };
    }

    return null;
};

const getThoughtSignatureFromTurn = (turn: GeneratedImage): string | null => {
    const candidate = turn.sessionHints?.thoughtSignature;
    return typeof candidate === 'string' && candidate.trim().length > 0 ? candidate : null;
};

export const EMPTY_WORKSPACE_CONVERSATION_STATE: WorkspaceConversationState = {
    byBranchOriginId: {},
};

export const getNormalizedConversationTurnIds = (record: BranchConversationRecord | undefined | null): string[] => {
    if (!record) {
        return [];
    }

    if (!record.activeSourceHistoryId) {
        return [...record.turnIds];
    }

    if (record.turnIds.includes(record.activeSourceHistoryId)) {
        return [...record.turnIds];
    }

    return [...record.turnIds, record.activeSourceHistoryId];
};

export const buildConversationTurnReference = (
    turn: GeneratedImage,
    sourceTurn: GeneratedImage | null,
): ConversationTurnReference | null => {
    const sourceImage = buildImageAssetReference(sourceTurn);
    const outputImage = buildImageAssetReference(turn);
    const expectsSourceImage = Boolean(turn.conversationSourceHistoryId || turn.sourceHistoryId);

    if (!outputImage || (expectsSourceImage && !sourceImage)) {
        return null;
    }

    return {
        historyId: turn.id,
        prompt: turn.prompt,
        sourceImage,
        outputImage,
        text: turn.text || null,
        thoughts: turn.thoughts || null,
        thoughtSignature: getThoughtSignatureFromTurn(turn),
    };
};

export const buildConversationRequestContext = ({
    activeSourceHistoryId,
    branchOriginId,
    conversationState,
    history,
}: {
    activeSourceHistoryId: string;
    branchOriginId: string;
    conversationState: WorkspaceConversationState;
    history: GeneratedImage[];
}): ConversationRequestContext | null => {
    const historyById = new Map(history.map((item) => [item.id, item]));
    const existingRecord = conversationState.byBranchOriginId[branchOriginId];
    const relevantTurnIds = existingRecord
        ? (() => {
              const normalizedTurnIds = getNormalizedConversationTurnIds(existingRecord);
              const sourceIndex = normalizedTurnIds.indexOf(activeSourceHistoryId);
              return sourceIndex >= 0 ? normalizedTurnIds.slice(0, sourceIndex + 1) : normalizedTurnIds;
          })()
        : [];
    const priorTurns = relevantTurnIds
        .map((turnId) => {
            const turn = historyById.get(turnId);
            if (!turn) {
                return null;
            }

            const sourceTurn = historyById.get(turn.conversationSourceHistoryId || turn.sourceHistoryId || '');
            return buildConversationTurnReference(turn, sourceTurn || null);
        })
        .filter((turn): turn is ConversationTurnReference => Boolean(turn));

    return {
        conversationId: existingRecord?.conversationId || createConversationId(),
        branchOriginId,
        activeSourceHistoryId,
        priorTurns,
    };
};

export const promoteConversationSource = (
    conversationState: WorkspaceConversationState,
    branchOriginId: string,
    nextSourceHistoryId: string,
    intent: 'continue' | 'branch' = 'continue',
): WorkspaceConversationState => {
    const existingRecord = conversationState.byBranchOriginId[branchOriginId];
    if (!existingRecord) {
        return {
            byBranchOriginId: {
                ...conversationState.byBranchOriginId,
                [branchOriginId]: {
                    conversationId: createConversationId(),
                    branchOriginId,
                    activeSourceHistoryId: nextSourceHistoryId,
                    turnIds: [nextSourceHistoryId],
                    startedAt: Date.now(),
                    updatedAt: Date.now(),
                },
            },
        };
    }

    const normalizedTurnIds = getNormalizedConversationTurnIds(existingRecord);
    const existingIndex = normalizedTurnIds.indexOf(nextSourceHistoryId);
    const shouldReuseConversation = intent === 'continue' && existingIndex >= 0;
    const nextRecord: BranchConversationRecord = {
        conversationId: shouldReuseConversation ? existingRecord.conversationId : createConversationId(),
        branchOriginId,
        activeSourceHistoryId: nextSourceHistoryId,
        turnIds: shouldReuseConversation ? normalizedTurnIds.slice(0, existingIndex + 1) : [nextSourceHistoryId],
        startedAt: shouldReuseConversation ? existingRecord.startedAt : Date.now(),
        updatedAt: Date.now(),
    };

    return {
        byBranchOriginId: {
            ...conversationState.byBranchOriginId,
            [branchOriginId]: nextRecord,
        },
    };
};

export const recordConversationTurn = (
    conversationState: WorkspaceConversationState,
    params: {
        branchOriginId: string;
        conversationId: string;
        nextActiveSourceHistoryId: string;
        turnId: string;
    },
): WorkspaceConversationState => {
    const existingRecord = conversationState.byBranchOriginId[params.branchOriginId];
    const existingTurnIds = getNormalizedConversationTurnIds(existingRecord);
    const nextTurnIds = existingTurnIds.includes(params.turnId) ? existingTurnIds : [...existingTurnIds, params.turnId];

    return {
        byBranchOriginId: {
            ...conversationState.byBranchOriginId,
            [params.branchOriginId]: {
                conversationId: params.conversationId,
                branchOriginId: params.branchOriginId,
                activeSourceHistoryId: params.nextActiveSourceHistoryId,
                turnIds: nextTurnIds,
                startedAt: existingRecord?.startedAt || Date.now(),
                updatedAt: Date.now(),
            },
        },
    };
};

export const getConversationSelectionState = (
    conversationState: WorkspaceConversationState,
    branchOriginId: string,
    selectedHistoryId: string,
): {
    conversationId: string | null;
    conversationActiveSourceHistoryId: string | null;
    conversationTurnIds: string[];
} => {
    const record = conversationState.byBranchOriginId[branchOriginId];
    if (!record) {
        return {
            conversationId: null,
            conversationActiveSourceHistoryId: null,
            conversationTurnIds: [],
        };
    }

    const normalizedTurnIds = getNormalizedConversationTurnIds(record);
    const selectedTurnIndex = normalizedTurnIds.indexOf(selectedHistoryId);
    if (selectedTurnIndex >= 0) {
        return {
            conversationId: record.conversationId,
            conversationActiveSourceHistoryId: selectedHistoryId,
            conversationTurnIds: normalizedTurnIds.slice(0, selectedTurnIndex + 1),
        };
    }

    if (record.activeSourceHistoryId === selectedHistoryId) {
        return {
            conversationId: record.conversationId,
            conversationActiveSourceHistoryId: selectedHistoryId,
            conversationTurnIds: normalizedTurnIds,
        };
    }

    return {
        conversationId: null,
        conversationActiveSourceHistoryId: null,
        conversationTurnIds: [],
    };
};

export const resolveConversationSelectionState = (
    conversationState: WorkspaceConversationState,
    params: {
        selectedHistoryId: string;
        preferredBranchOriginId?: string | null;
        conversationBranchOriginId?: string | null;
    },
): {
    branchOriginId: string | null;
    conversationId: string | null;
    conversationActiveSourceHistoryId: string | null;
    conversationTurnIds: string[];
} => {
    const candidateBranchOriginIds = [
        params.preferredBranchOriginId,
        params.conversationBranchOriginId,
        params.selectedHistoryId,
    ].filter((candidate, index, all): candidate is string => Boolean(candidate) && all.indexOf(candidate) === index);

    for (const branchOriginId of candidateBranchOriginIds) {
        const selection = getConversationSelectionState(conversationState, branchOriginId, params.selectedHistoryId);
        if (selection.conversationId) {
            return {
                branchOriginId,
                ...selection,
            };
        }
    }

    const matchingRecord = Object.entries(conversationState.byBranchOriginId).find(
        ([, record]) =>
            record.activeSourceHistoryId === params.selectedHistoryId ||
            record.turnIds.includes(params.selectedHistoryId),
    );

    if (!matchingRecord) {
        return {
            branchOriginId: null,
            conversationId: null,
            conversationActiveSourceHistoryId: null,
            conversationTurnIds: [],
        };
    }

    const [branchOriginId] = matchingRecord;
    return {
        branchOriginId,
        ...getConversationSelectionState(conversationState, branchOriginId, params.selectedHistoryId),
    };
};
