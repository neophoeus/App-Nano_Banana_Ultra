import { describe, expect, it } from 'vitest';
import { GeneratedImage, WorkspacePersistenceSnapshot } from '../types';
import { EMPTY_WORKSPACE_SNAPSHOT } from '../utils/workspacePersistence';
import {
    buildDisplaySettingsFromComposerState,
    buildWorkspaceComposerStateFromHistoryItem,
    deriveAppliedWorkspaceSnapshotState,
    hasRestorableWorkspaceContent,
    shouldShowRestoreNoticeForSnapshot,
} from '../utils/workspaceSnapshotState';

const buildHistoryTurn = (overrides: Partial<GeneratedImage> = {}): GeneratedImage => ({
    id: 'turn-1',
    url: 'https://example.com/image.png',
    prompt: 'Imported prompt',
    aspectRatio: '16:9',
    size: '1K',
    style: 'Anime',
    model: 'gemini-3.1-flash-image-preview',
    createdAt: 1,
    ...overrides,
});

describe('workspaceSnapshotState', () => {
    it('detects whether a restored notice should be shown', () => {
        expect(shouldShowRestoreNoticeForSnapshot(EMPTY_WORKSPACE_SNAPSHOT)).toBe(false);

        const withHistory: WorkspacePersistenceSnapshot = {
            ...EMPTY_WORKSPACE_SNAPSHOT,
            history: [buildHistoryTurn()],
        };
        expect(shouldShowRestoreNoticeForSnapshot(withHistory)).toBe(true);

        const withViewerImages: WorkspacePersistenceSnapshot = {
            ...EMPTY_WORKSPACE_SNAPSHOT,
            viewState: {
                ...EMPTY_WORKSPACE_SNAPSHOT.viewState,
                generatedImageUrls: ['https://example.com/view.png'],
            },
        };
        expect(shouldShowRestoreNoticeForSnapshot(withViewerImages)).toBe(true);

        const withPromptOnly: WorkspacePersistenceSnapshot = {
            ...EMPTY_WORKSPACE_SNAPSHOT,
            composerState: {
                ...EMPTY_WORKSPACE_SNAPSHOT.composerState,
                prompt: 'Recovered prompt draft',
            },
        };
        expect(shouldShowRestoreNoticeForSnapshot(withPromptOnly)).toBe(true);

        const withQueuedJobsOnly: WorkspacePersistenceSnapshot = {
            ...EMPTY_WORKSPACE_SNAPSHOT,
            queuedJobs: [
                {
                    localId: 'queued-job-1',
                    name: 'recovered-batch',
                    displayName: 'Recovered batch',
                    state: 'queued',
                    model: 'gemini-3.1-flash-image-preview',
                    prompt: 'Recovered queued batch',
                    aspectRatio: '1:1',
                    imageSize: '2K',
                    style: 'None',
                    outputFormat: 'images-only',
                    temperature: 1,
                    thinkingLevel: 'minimal',
                    includeThoughts: true,
                    googleSearch: false,
                    imageSearch: false,
                    batchSize: 1,
                    objectImageCount: 0,
                    characterImageCount: 0,
                    createdAt: 1,
                    updatedAt: 1,
                    restoredFromSnapshot: true,
                },
            ],
        };
        expect(shouldShowRestoreNoticeForSnapshot(withQueuedJobsOnly)).toBe(true);
    });

    it('shares the same restorable-content detection used by migration flows', () => {
        expect(hasRestorableWorkspaceContent(EMPTY_WORKSPACE_SNAPSHOT)).toBe(false);

        const withWorkflowLogsOnly: WorkspacePersistenceSnapshot = {
            ...EMPTY_WORKSPACE_SNAPSHOT,
            workflowLogs: ['[12:00:00] Restored workspace state.'],
        };

        expect(hasRestorableWorkspaceContent(withWorkflowLogsOnly)).toBe(true);
        expect(shouldShowRestoreNoticeForSnapshot(withWorkflowLogsOnly)).toBe(true);
    });

    it('maps composer state into display settings', () => {
        const displaySettings = buildDisplaySettingsFromComposerState({
            ...EMPTY_WORKSPACE_SNAPSHOT.composerState,
            prompt: 'Stage prompt',
            aspectRatio: '4:5',
            imageSize: '4K',
            imageStyle: 'Film Noir',
            imageModel: 'gemini-3-pro-image-preview',
            batchSize: 3,
            outputFormat: 'images-and-text',
            temperature: 0.6,
            thinkingLevel: 'high',
            includeThoughts: true,
            googleSearch: true,
            imageSearch: true,
        });

        expect(displaySettings).toEqual({
            prompt: 'Stage prompt',
            aspectRatio: '4:5',
            size: '4K',
            style: 'Film Noir',
            model: 'gemini-3-pro-image-preview',
            batchSize: 3,
            outputFormat: 'images-and-text',
            structuredOutputMode: 'off',
            temperature: 0.6,
            thinkingLevel: 'high',
            includeThoughts: true,
            googleSearch: true,
            imageSearch: true,
        });
    });

    it('builds composer state from a history turn with runtime defaults', () => {
        const flashTurn = buildHistoryTurn({
            metadata: {},
            grounding: { enabled: true, imageSearch: true },
            sessionHints: {
                googleSearchRequested: false,
                imageSearchRequested: true,
                groundingMode: 'image-search',
            },
            mode: 'Follow-up Edit',
        });

        expect(buildWorkspaceComposerStateFromHistoryItem(flashTurn)).toMatchObject({
            prompt: 'Imported prompt',
            aspectRatio: '16:9',
            imageSize: '1K',
            imageStyle: 'Anime',
            imageModel: 'gemini-3.1-flash-image-preview',
            outputFormat: 'images-only',
            temperature: 1,
            thinkingLevel: 'minimal',
            googleSearch: false,
            imageSearch: true,
            generationMode: 'Follow-up Edit',
            executionMode: 'single-turn',
        });

        const proTurn = buildHistoryTurn({
            model: 'gemini-3-pro-image-preview',
            metadata: {
                outputFormat: 'images-and-text',
                temperature: 0.2,
                thinkingLevel: 'high',
                includeThoughts: true,
            },
        });

        expect(buildWorkspaceComposerStateFromHistoryItem(proTurn)).toMatchObject({
            imageModel: 'gemini-3-pro-image-preview',
            outputFormat: 'images-and-text',
            temperature: 0.2,
            thinkingLevel: 'high',
            includeThoughts: true,
            executionMode: 'single-turn',
        });

        const variantTurn = buildHistoryTurn({
            variantGroupId: 'variant-group-1',
        });

        expect(buildWorkspaceComposerStateFromHistoryItem(variantTurn)).toMatchObject({
            executionMode: 'interactive-batch-variants',
        });
    });

    it('derives an applied snapshot plan with selected history fallback', () => {
        const plan = deriveAppliedWorkspaceSnapshotState(
            {
                history: [buildHistoryTurn()],
                stagedAssets: [],
                workspaceSession: {
                    ...EMPTY_WORKSPACE_SNAPSHOT.workspaceSession,
                    activeResult: {
                        text: 'Imported result',
                        thoughts: null,
                        grounding: null,
                        metadata: null,
                        sessionHints: null,
                        historyId: 'turn-1',
                    },
                },
                branchState: { nameOverrides: {}, continuationSourceByBranchOriginId: {} },
                viewState: {
                    generatedImageUrls: ['https://example.com/view.png'],
                    selectedImageIndex: 0,
                    selectedHistoryId: null,
                },
                composerState: {
                    ...EMPTY_WORKSPACE_SNAPSHOT.composerState,
                    prompt: 'Imported prompt',
                    imageSize: '1K',
                },
            },
            { showRestoreNotice: true },
        );

        expect(plan.snapshot.composerState.prompt).toBe('Imported prompt');
        expect(plan.displaySettings.prompt).toBe('Imported prompt');
        expect(plan.selectedHistoryId).toBe('turn-1');
        expect(plan.showRestoreNotice).toBe(true);
    });

    it('keeps imported provenance continuity fields when deriving snapshot state', () => {
        const plan = deriveAppliedWorkspaceSnapshotState({
            history: [
                buildHistoryTurn({
                    id: 'turn-0',
                    prompt: 'Root turn',
                    lineageAction: 'root',
                    rootHistoryId: 'turn-0',
                }),
                buildHistoryTurn({
                    id: 'turn-1',
                    prompt: 'Follow-up turn',
                    parentHistoryId: 'turn-0',
                    sourceHistoryId: 'turn-0',
                    rootHistoryId: 'turn-0',
                    lineageAction: 'continue',
                    conversationId: 'conversation-1234',
                    conversationBranchOriginId: 'turn-0',
                }),
            ],
            stagedAssets: [],
            workspaceSession: {
                ...EMPTY_WORKSPACE_SNAPSHOT.workspaceSession,
                activeResult: {
                    text: 'Imported result',
                    thoughts: null,
                    grounding: null,
                    metadata: null,
                    sessionHints: { groundingMetadataReturned: true },
                    historyId: 'turn-1',
                },
                continuityGrounding: {
                    enabled: true,
                    sources: [{ title: 'Example Source', url: 'https://example.com' }],
                },
                continuitySessionHints: {
                    groundingMetadataReturned: true,
                    provenanceInherited: true,
                },
                provenanceMode: 'inherited',
                provenanceSourceHistoryId: 'turn-0',
                conversationId: 'conversation-1234',
                conversationBranchOriginId: 'turn-1',
                conversationActiveSourceHistoryId: 'turn-1',
                conversationTurnIds: ['turn-1'],
                source: 'history',
                sourceHistoryId: 'turn-1',
            },
            branchState: { nameOverrides: {}, continuationSourceByBranchOriginId: { 'turn-0': 'turn-1' } },
            conversationState: {
                byBranchOriginId: {
                    'turn-0': {
                        conversationId: 'conversation-1234',
                        branchOriginId: 'turn-0',
                        activeSourceHistoryId: 'turn-1',
                        turnIds: ['turn-1'],
                        startedAt: 1,
                        updatedAt: 2,
                    },
                },
            },
            viewState: {
                generatedImageUrls: ['https://example.com/view.png'],
                selectedImageIndex: 0,
                selectedHistoryId: 'turn-1',
            },
            composerState: {
                ...EMPTY_WORKSPACE_SNAPSHOT.composerState,
                prompt: 'Imported prompt',
                imageSize: '1K',
                googleSearch: true,
            },
        });

        expect(plan.snapshot.workspaceSession.provenanceMode).toBe('inherited');
        expect(plan.snapshot.workspaceSession.provenanceSourceHistoryId).toBe('turn-0');
        expect(plan.snapshot.workspaceSession.continuityGrounding?.sources?.[0]?.title).toBe('Example Source');
        expect(plan.snapshot.workspaceSession.conversationId).toBe('conversation-1234');
        expect(plan.snapshot.workspaceSession.conversationBranchOriginId).toBe('turn-0');
        expect(plan.snapshot.workspaceSession.conversationActiveSourceHistoryId).toBe('turn-1');
        expect(plan.snapshot.workspaceSession.conversationTurnIds).toEqual(['turn-1']);
    });

    it('reconciles stale conversation session fields from persisted conversation state', () => {
        const plan = deriveAppliedWorkspaceSnapshotState({
            history: [
                buildHistoryTurn({
                    id: 'root-turn',
                    prompt: 'Root turn',
                    lineageAction: 'root',
                    rootHistoryId: 'root-turn',
                }),
                buildHistoryTurn({
                    id: 'follow-up-turn',
                    prompt: 'Follow-up turn',
                    parentHistoryId: 'root-turn',
                    sourceHistoryId: 'root-turn',
                    rootHistoryId: 'root-turn',
                    lineageAction: 'continue',
                }),
            ],
            stagedAssets: [],
            workspaceSession: {
                ...EMPTY_WORKSPACE_SNAPSHOT.workspaceSession,
                activeResult: {
                    text: 'Imported result',
                    thoughts: null,
                    grounding: null,
                    metadata: null,
                    sessionHints: null,
                    historyId: 'follow-up-turn',
                },
                conversationId: 'stale-conversation',
                conversationBranchOriginId: 'stale-branch',
                conversationActiveSourceHistoryId: 'stale-turn',
                conversationTurnIds: ['stale-turn'],
                source: 'history',
                sourceHistoryId: 'follow-up-turn',
            },
            branchState: { nameOverrides: {}, continuationSourceByBranchOriginId: { 'root-turn': 'follow-up-turn' } },
            conversationState: {
                byBranchOriginId: {
                    'root-turn': {
                        conversationId: 'conversation-restored',
                        branchOriginId: 'root-turn',
                        activeSourceHistoryId: 'follow-up-turn',
                        turnIds: ['follow-up-turn'],
                        startedAt: 1,
                        updatedAt: 2,
                    },
                },
            },
            viewState: {
                generatedImageUrls: ['https://example.com/view.png'],
                selectedImageIndex: 0,
                selectedHistoryId: 'follow-up-turn',
            },
            composerState: {
                ...EMPTY_WORKSPACE_SNAPSHOT.composerState,
                prompt: 'Imported prompt',
                imageSize: '1K',
            },
        });

        expect(plan.snapshot.workspaceSession.conversationId).toBe('conversation-restored');
        expect(plan.snapshot.workspaceSession.conversationBranchOriginId).toBe('root-turn');
        expect(plan.snapshot.workspaceSession.conversationActiveSourceHistoryId).toBe('follow-up-turn');
        expect(plan.snapshot.workspaceSession.conversationTurnIds).toEqual(['follow-up-turn']);
    });
});
