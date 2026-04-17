import { describe, expect, it } from 'vitest';
import { GeneratedImage, WorkspaceConversationState } from '../types';
import {
    EMPTY_WORKSPACE_CONVERSATION_STATE,
    buildConversationRequestContext,
    getConversationSelectionState,
    promoteConversationSource,
    recordConversationTurn,
} from '../utils/conversationState';

const rootTurn: GeneratedImage = {
    id: 'root-turn',
    url: 'https://example.com/root.png',
    savedFilename: 'root.png',
    prompt: 'Root prompt',
    aspectRatio: '1:1',
    size: '1K',
    style: 'None',
    model: 'gemini-3.1-flash-image-preview',
    createdAt: 10,
};

const followUpTurn: GeneratedImage = {
    id: 'follow-up-turn',
    url: 'https://example.com/follow-up.png',
    savedFilename: 'follow-up.png',
    prompt: 'Follow-up prompt',
    aspectRatio: '1:1',
    size: '1K',
    style: 'None',
    model: 'gemini-3.1-flash-image-preview',
    createdAt: 11,
    sourceHistoryId: 'root-turn',
    conversationSourceHistoryId: 'root-turn',
    text: 'Follow-up text',
    thoughts: 'Follow-up thoughts',
    sessionHints: {
        thoughtSignature: 'sig-1',
    },
};

describe('conversationState', () => {
    it('creates and records a branch conversation timeline', () => {
        const promoted = promoteConversationSource(EMPTY_WORKSPACE_CONVERSATION_STATE, 'root-turn', 'root-turn');
        const promotedRecord = promoted.byBranchOriginId['root-turn'];

        expect(promotedRecord).toBeTruthy();
        expect(promotedRecord.activeSourceHistoryId).toBe('root-turn');
        expect(promotedRecord.turnIds).toEqual(['root-turn']);

        const recorded = recordConversationTurn(promoted, {
            branchOriginId: 'root-turn',
            conversationId: promotedRecord.conversationId,
            nextActiveSourceHistoryId: 'follow-up-turn',
            turnId: 'follow-up-turn',
        });

        expect(recorded.byBranchOriginId['root-turn'].conversationId).toBe(promotedRecord.conversationId);
        expect(recorded.byBranchOriginId['root-turn'].activeSourceHistoryId).toBe('follow-up-turn');
        expect(recorded.byBranchOriginId['root-turn'].turnIds).toEqual(['root-turn', 'follow-up-turn']);
    });

    it('branches from an existing source turn into a new conversation id anchored to that source', () => {
        const existingConversationState: WorkspaceConversationState = {
            byBranchOriginId: {
                'root-turn': {
                    conversationId: 'conversation-1',
                    branchOriginId: 'root-turn',
                    activeSourceHistoryId: 'follow-up-turn',
                    turnIds: ['root-turn', 'follow-up-turn'],
                    startedAt: 1,
                    updatedAt: 2,
                },
            },
        };

        const branched = promoteConversationSource(
            existingConversationState,
            'follow-up-turn',
            'follow-up-turn',
            'branch',
        );

        expect(branched.byBranchOriginId['follow-up-turn']).toBeTruthy();
        expect(branched.byBranchOriginId['follow-up-turn'].conversationId).not.toBe('conversation-1');
        expect(branched.byBranchOriginId['follow-up-turn'].activeSourceHistoryId).toBe('follow-up-turn');
        expect(branched.byBranchOriginId['follow-up-turn'].turnIds).toEqual(['follow-up-turn']);
    });

    it('reuses prior turns when rebuilding conversation request context', () => {
        const conversationState: WorkspaceConversationState = {
            byBranchOriginId: {
                'root-turn': {
                    conversationId: 'conversation-1',
                    branchOriginId: 'root-turn',
                    activeSourceHistoryId: 'follow-up-turn',
                    turnIds: ['follow-up-turn'],
                    startedAt: 1,
                    updatedAt: 2,
                },
            },
        };

        const context = buildConversationRequestContext({
            activeSourceHistoryId: 'follow-up-turn',
            branchOriginId: 'root-turn',
            conversationState,
            history: [followUpTurn, rootTurn],
        });

        expect(context).toEqual({
            conversationId: 'conversation-1',
            branchOriginId: 'root-turn',
            activeSourceHistoryId: 'follow-up-turn',
            priorTurns: [
                {
                    historyId: 'follow-up-turn',
                    prompt: 'Follow-up prompt',
                    sourceImage: {
                        savedFilename: 'root.png',
                        mimeType: 'image/png',
                    },
                    outputImage: {
                        savedFilename: 'follow-up.png',
                        mimeType: 'image/png',
                    },
                    text: 'Follow-up text',
                    thoughts: 'Follow-up thoughts',
                    thoughtSignature: 'sig-1',
                },
            ],
        });
    });

    it('restores selection metadata for a turn inside a conversation timeline', () => {
        const conversationState: WorkspaceConversationState = {
            byBranchOriginId: {
                branchA: {
                    conversationId: 'conversation-A',
                    branchOriginId: 'branchA',
                    activeSourceHistoryId: 'turn-2',
                    turnIds: ['turn-1', 'turn-2'],
                    startedAt: 1,
                    updatedAt: 2,
                },
            },
        };

        expect(getConversationSelectionState(conversationState, 'branchA', 'turn-1')).toEqual({
            conversationId: 'conversation-A',
            conversationActiveSourceHistoryId: 'turn-1',
            conversationTurnIds: ['turn-1'],
        });
    });

    it('includes an active source turn even before later conversation turns are recorded', () => {
        const conversationState: WorkspaceConversationState = {
            byBranchOriginId: {
                'root-turn': {
                    conversationId: 'conversation-seeded',
                    branchOriginId: 'root-turn',
                    activeSourceHistoryId: 'follow-up-turn',
                    turnIds: [],
                    startedAt: 1,
                    updatedAt: 2,
                },
            },
        };

        expect(getConversationSelectionState(conversationState, 'root-turn', 'follow-up-turn')).toEqual({
            conversationId: 'conversation-seeded',
            conversationActiveSourceHistoryId: 'follow-up-turn',
            conversationTurnIds: ['follow-up-turn'],
        });

        const context = buildConversationRequestContext({
            activeSourceHistoryId: 'follow-up-turn',
            branchOriginId: 'root-turn',
            conversationState,
            history: [followUpTurn, rootTurn],
        });

        expect(context?.priorTurns.map((turn) => turn.historyId)).toEqual(['follow-up-turn']);
    });

    it('preserves a missing active source turn when the next turn is recorded', () => {
        const conversationState: WorkspaceConversationState = {
            byBranchOriginId: {
                'root-turn': {
                    conversationId: 'conversation-seeded',
                    branchOriginId: 'root-turn',
                    activeSourceHistoryId: 'root-turn',
                    turnIds: [],
                    startedAt: 1,
                    updatedAt: 2,
                },
            },
        };

        const nextState = recordConversationTurn(conversationState, {
            branchOriginId: 'root-turn',
            conversationId: 'conversation-seeded',
            nextActiveSourceHistoryId: 'follow-up-turn',
            turnId: 'follow-up-turn',
        });

        expect(nextState.byBranchOriginId['root-turn'].activeSourceHistoryId).toBe('follow-up-turn');
        expect(nextState.byBranchOriginId['root-turn'].turnIds).toEqual(['root-turn', 'follow-up-turn']);
    });
});
