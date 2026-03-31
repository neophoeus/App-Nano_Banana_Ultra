/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorkspacePersistenceSnapshot } from '../types';
import { buildConversationRequestContext } from '../utils/conversationState';
import {
    EMPTY_WORKSPACE_SNAPSHOT,
    exportWorkspaceSnapshotDocument,
    loadWorkspaceSnapshot,
    mergeWorkspaceSnapshots,
    parseWorkspaceSnapshotDocument,
    saveSharedWorkspaceSnapshot,
    saveWorkspaceSnapshot,
    sanitizeWorkspaceSnapshot,
    WORKSPACE_SNAPSHOT_STORAGE_KEY,
} from '../utils/workspacePersistence';

const baseSnapshot: WorkspacePersistenceSnapshot = {
    ...EMPTY_WORKSPACE_SNAPSHOT,
    workflowLogs: ['[10:00:00] Sending request', '[10:00:02] Success'],
    history: [
        {
            id: 'base-turn',
            url: 'https://example.com/base.png',
            prompt: 'Base prompt',
            aspectRatio: '1:1',
            size: '2K',
            style: 'None',
            model: 'gemini-3.1-flash-image-preview',
            createdAt: 20,
        },
    ],
    composerState: {
        ...EMPTY_WORKSPACE_SNAPSHOT.composerState,
        prompt: 'Base composer prompt',
    },
    branchState: {
        nameOverrides: {
            'base-turn': 'Main',
        },
        continuationSourceByBranchOriginId: {
            'base-turn': 'base-turn',
        },
    },
};

const incomingSnapshot: WorkspacePersistenceSnapshot = {
    ...EMPTY_WORKSPACE_SNAPSHOT,
    workflowLogs: ['[09:59:58] Imported request', '[10:00:01] Imported history loaded'],
    queuedJobs: [
        {
            localId: 'import-job-local',
            name: 'batches/import-job',
            displayName: 'Imported queued job',
            state: 'JOB_STATE_PENDING',
            model: 'gemini-3.1-flash-image-preview',
            prompt: 'Imported queued prompt',
            generationMode: 'Text to Image',
            aspectRatio: '1:1',
            imageSize: '1K',
            style: 'Anime',
            outputFormat: 'images-only',
            temperature: 1,
            thinkingLevel: 'minimal',
            includeThoughts: true,
            googleSearch: false,
            imageSearch: false,
            batchSize: 2,
            objectImageCount: 0,
            characterImageCount: 0,
            createdAt: 12,
            updatedAt: 13,
            startedAt: null,
            completedAt: null,
            lastPolledAt: null,
            importedAt: null,
            error: null,
        },
    ],
    history: [
        {
            id: 'import-root',
            url: 'https://example.com/root.png',
            prompt: 'Imported root',
            aspectRatio: '1:1',
            size: '1K',
            style: 'Anime',
            model: 'gemini-3.1-flash-image-preview',
            createdAt: 10,
            lineageAction: 'root',
            rootHistoryId: 'import-root',
        },
        {
            id: 'import-branch',
            url: 'https://example.com/branch.png',
            prompt: 'Imported branch',
            aspectRatio: '1:1',
            size: '1K',
            style: 'Anime',
            model: 'gemini-3.1-flash-image-preview',
            createdAt: 11,
            parentHistoryId: 'import-root',
            rootHistoryId: 'import-root',
            sourceHistoryId: 'import-root',
            lineageAction: 'branch',
        },
    ],
    branchState: {
        nameOverrides: {
            'import-root': 'Imported Branch',
        },
        continuationSourceByBranchOriginId: {
            'import-root': 'import-branch',
        },
    },
    conversationState: {
        byBranchOriginId: {
            'import-root': {
                conversationId: 'conversation-import-root',
                branchOriginId: 'import-root',
                activeSourceHistoryId: 'import-branch',
                turnIds: ['import-branch'],
                startedAt: 10,
                updatedAt: 11,
            },
        },
    },
};

describe('workspacePersistence', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        localStorage.clear();
    });

    it('round-trips the wrapped export document', () => {
        const serialized = exportWorkspaceSnapshotDocument(baseSnapshot);
        const parsed = parseWorkspaceSnapshotDocument(serialized);

        expect(parsed).not.toBeNull();
        expect(parsed?.composerState.prompt).toBe('Base composer prompt');
        expect(parsed?.history).toHaveLength(1);
        expect(parsed?.workflowLogs).toEqual(baseSnapshot.workflowLogs);
    });

    it('merges imported turns with remapped ids and branch overrides', () => {
        const merged = mergeWorkspaceSnapshots(baseSnapshot, incomingSnapshot);
        const importedTurns = merged.history.filter((item) => item.prompt.startsWith('Imported'));
        const importedRoot = importedTurns.find((item) => item.prompt === 'Imported root');
        const importedBranch = importedTurns.find((item) => item.prompt === 'Imported branch');

        expect(merged.history).toHaveLength(3);
        expect(merged.composerState.prompt).toBe('Base composer prompt');
        expect(importedRoot).toBeTruthy();
        expect(importedBranch).toBeTruthy();
        expect(importedRoot?.id).not.toBe('import-root');
        expect(importedBranch?.id).not.toBe('import-branch');
        expect(importedBranch?.parentHistoryId).toBe(importedRoot?.id);
        expect(importedBranch?.rootHistoryId).toBe(importedRoot?.id);
        expect(importedBranch?.sourceHistoryId).toBe(importedRoot?.id);
        expect(Object.values(merged.branchState.nameOverrides)).toContain('Imported Branch');
        expect(Object.keys(merged.branchState.nameOverrides)).not.toContain('import-root');
        expect(merged.branchState.continuationSourceByBranchOriginId[importedRoot?.id || '']).toBe(importedBranch?.id);
        expect(merged.conversationState.byBranchOriginId[importedRoot?.id || '']?.conversationId).toBe(
            'conversation-import-root',
        );
        expect(merged.conversationState.byBranchOriginId[importedRoot?.id || '']?.activeSourceHistoryId).toBe(
            importedBranch?.id,
        );
        expect(merged.conversationState.byBranchOriginId[importedRoot?.id || '']?.turnIds).toEqual([
            importedBranch?.id,
        ]);
        expect(merged.workflowLogs).toEqual(baseSnapshot.workflowLogs);
        expect(merged.queuedJobs).toEqual(incomingSnapshot.queuedJobs);
    });

    it('sanitizes and preserves queued jobs in workspace snapshots', () => {
        const restored = sanitizeWorkspaceSnapshot({
            ...EMPTY_WORKSPACE_SNAPSHOT,
            queuedJobs: incomingSnapshot.queuedJobs,
        });

        expect(restored.queuedJobs).toEqual(incomingSnapshot.queuedJobs);
    });

    it('strips oversized thought signatures from restored history and session hints', () => {
        const opaqueThoughtSignature = 'A'.repeat(512);
        const restored = sanitizeWorkspaceSnapshot({
            ...EMPTY_WORKSPACE_SNAPSHOT,
            history: [
                {
                    id: 'turn-with-signature',
                    url: 'https://example.com/turn.png',
                    prompt: 'Opaque signature turn',
                    aspectRatio: '1:1',
                    size: '1K',
                    style: 'None',
                    model: 'gemini-3.1-flash-image-preview',
                    createdAt: 1,
                    sessionHints: {
                        thoughtSignatureReturned: true,
                        thoughtSignature: opaqueThoughtSignature,
                    },
                },
            ],
            workspaceSession: {
                ...EMPTY_WORKSPACE_SNAPSHOT.workspaceSession,
                activeResult: {
                    text: 'Opaque signature result',
                    thoughts: null,
                    grounding: null,
                    metadata: null,
                    sessionHints: {
                        thoughtSignatureReturned: true,
                        thoughtSignature: opaqueThoughtSignature,
                    },
                    historyId: 'turn-with-signature',
                },
                continuitySessionHints: {
                    thoughtSignatureReturned: true,
                    thoughtSignature: opaqueThoughtSignature,
                },
                source: 'generated',
                sourceHistoryId: 'turn-with-signature',
            },
            viewState: {
                ...EMPTY_WORKSPACE_SNAPSHOT.viewState,
                selectedHistoryId: 'turn-with-signature',
            },
        });

        expect(restored.history[0].sessionHints).toEqual({
            thoughtSignatureReturned: true,
        });
        expect(restored.workspaceSession.activeResult?.sessionHints).toEqual({
            thoughtSignatureReturned: true,
        });
        expect(restored.workspaceSession.continuitySessionHints).toEqual({
            thoughtSignatureReturned: true,
        });
    });

    it('drops unsaved inline generated payloads from persisted local snapshots while preserving uploads', () => {
        const unsavedHistoryUrl = 'data:image/png;base64,UNSAVEDHISTORYPAYLOAD';
        const savedHistoryUrl = 'data:image/png;base64,SAVEDHISTORYPAYLOAD';
        const unsavedGeneratedStageUrl = 'data:image/png;base64,UNSAVEDSTAGEPAYLOAD';
        const uploadedReferenceUrl = 'data:image/png;base64,UPLOADEDREFERENCEPAYLOAD';

        saveWorkspaceSnapshot({
            ...EMPTY_WORKSPACE_SNAPSHOT,
            history: [
                {
                    id: 'unsaved-turn',
                    url: unsavedHistoryUrl,
                    prompt: 'Unsaved result',
                    aspectRatio: '1:1',
                    size: '1K',
                    style: 'None',
                    model: 'gemini-3.1-flash-image-preview',
                    createdAt: 1,
                },
                {
                    id: 'saved-turn',
                    url: savedHistoryUrl,
                    savedFilename: 'saved-turn.png',
                    prompt: 'Saved result',
                    aspectRatio: '1:1',
                    size: '1K',
                    style: 'None',
                    model: 'gemini-3.1-flash-image-preview',
                    createdAt: 2,
                },
            ],
            stagedAssets: [
                {
                    id: 'generated-stage',
                    url: unsavedGeneratedStageUrl,
                    role: 'stage-source',
                    origin: 'generated',
                    createdAt: 3,
                },
                {
                    id: 'uploaded-reference',
                    url: uploadedReferenceUrl,
                    role: 'object',
                    origin: 'upload',
                    createdAt: 4,
                },
            ],
        });

        const rawSnapshot = localStorage.getItem(WORKSPACE_SNAPSHOT_STORAGE_KEY);
        expect(rawSnapshot).toBeTruthy();

        const persisted = JSON.parse(rawSnapshot || '{}') as WorkspacePersistenceSnapshot;
        const unsavedTurn = persisted.history.find((item) => item.id === 'unsaved-turn');
        const savedTurn = persisted.history.find((item) => item.id === 'saved-turn');
        const generatedStage = persisted.stagedAssets.find((asset) => asset.id === 'generated-stage');
        const uploadedReference = persisted.stagedAssets.find((asset) => asset.id === 'uploaded-reference');

        expect(unsavedTurn?.url).toBe('');
        expect(savedTurn?.url).toBe('/api/load-image?filename=saved-turn.png');
        expect(generatedStage?.url).toBe('');
        expect(uploadedReference?.url).toBe(uploadedReferenceUrl);
        expect(rawSnapshot).not.toContain('UNSAVEDHISTORYPAYLOAD');
        expect(rawSnapshot).not.toContain('UNSAVEDSTAGEPAYLOAD');
    });

    it('omits unsaved inline generated payloads from shared snapshot uploads', async () => {
        const unsavedHistoryUrl = 'data:image/png;base64,UNSAVEDSHAREDHISTORYPAYLOAD';
        const unsavedGeneratedStageUrl = 'data:image/png;base64,UNSAVEDSHAREDSTAGEPAYLOAD';
        const uploadedReferenceUrl = 'data:image/png;base64,SHAREDUPLOADEDREFERENCEPAYLOAD';
        const fetchMock = vi.fn().mockResolvedValue({ ok: true });
        vi.stubGlobal('fetch', fetchMock);

        await saveSharedWorkspaceSnapshot({
            ...EMPTY_WORKSPACE_SNAPSHOT,
            history: [
                {
                    id: 'shared-unsaved-turn',
                    url: unsavedHistoryUrl,
                    prompt: 'Shared unsaved result',
                    aspectRatio: '1:1',
                    size: '1K',
                    style: 'None',
                    model: 'gemini-3.1-flash-image-preview',
                    createdAt: 1,
                },
            ],
            stagedAssets: [
                {
                    id: 'shared-generated-stage',
                    url: unsavedGeneratedStageUrl,
                    role: 'stage-source',
                    origin: 'generated',
                    createdAt: 2,
                },
                {
                    id: 'shared-uploaded-reference',
                    url: uploadedReferenceUrl,
                    role: 'object',
                    origin: 'upload',
                    createdAt: 3,
                },
            ],
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const requestInit = fetchMock.mock.calls[0]?.[1] as { body?: string };
        const uploadedSnapshot = JSON.parse(requestInit.body || '{}') as WorkspacePersistenceSnapshot;

        expect(uploadedSnapshot.history[0]?.url).toBe('');
        expect(uploadedSnapshot.stagedAssets.find((asset) => asset.id === 'shared-generated-stage')?.url).toBe('');
        expect(uploadedSnapshot.stagedAssets.find((asset) => asset.id === 'shared-uploaded-reference')?.url).toBe(
            uploadedReferenceUrl,
        );
        expect(requestInit.body).not.toContain('UNSAVEDSHAREDHISTORYPAYLOAD');
        expect(requestInit.body).not.toContain('UNSAVEDSHAREDSTAGEPAYLOAD');
    });

    it('does not revive unsaved inline generated payloads when loading legacy local snapshots', () => {
        const legacyHistoryUrl = 'data:image/png;base64,LEGACYUNSAVEDHISTORYPAYLOAD';
        const legacyGeneratedStageUrl = 'data:image/png;base64,LEGACYUNSAVEDSTAGEPAYLOAD';
        const uploadedReferenceUrl = 'data:image/png;base64,LEGACYUPLOADEDREFERENCEPAYLOAD';

        localStorage.setItem(
            WORKSPACE_SNAPSHOT_STORAGE_KEY,
            JSON.stringify({
                ...EMPTY_WORKSPACE_SNAPSHOT,
                history: [
                    {
                        id: 'legacy-unsaved-turn',
                        url: legacyHistoryUrl,
                        prompt: 'Legacy unsaved result',
                        aspectRatio: '1:1',
                        size: '1K',
                        style: 'None',
                        model: 'gemini-3.1-flash-image-preview',
                        createdAt: 1,
                    },
                ],
                stagedAssets: [
                    {
                        id: 'legacy-generated-stage',
                        url: legacyGeneratedStageUrl,
                        role: 'stage-source',
                        origin: 'generated',
                        createdAt: 2,
                    },
                    {
                        id: 'legacy-uploaded-reference',
                        url: uploadedReferenceUrl,
                        role: 'object',
                        origin: 'upload',
                        createdAt: 3,
                    },
                ],
            }),
        );

        const loaded = loadWorkspaceSnapshot();

        expect(loaded.history[0]?.url).toBe('');
        expect(loaded.stagedAssets.find((asset) => asset.id === 'legacy-generated-stage')?.url).toBe('');
        expect(loaded.stagedAssets.find((asset) => asset.id === 'legacy-uploaded-reference')?.url).toBe(
            uploadedReferenceUrl,
        );
    });

    it('preserves selected official conversation images needed for restored continuation requests', () => {
        const conversationImageUrl = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

        localStorage.setItem(
            WORKSPACE_SNAPSHOT_STORAGE_KEY,
            JSON.stringify({
                ...EMPTY_WORKSPACE_SNAPSHOT,
                history: [
                    {
                        id: 'chat-follow-up-turn',
                        url: conversationImageUrl,
                        prompt: 'Official chat follow-up turn',
                        aspectRatio: '1:1',
                        size: '1K',
                        style: 'None',
                        model: 'gemini-3.1-flash-image-preview',
                        createdAt: 2,
                        executionMode: 'chat-continuation',
                        conversationId: 'chatconv1-restore-path',
                        conversationBranchOriginId: 'chat-root-turn',
                        conversationSourceHistoryId: 'chat-root-turn',
                        sourceHistoryId: 'chat-root-turn',
                        parentHistoryId: 'chat-root-turn',
                        rootHistoryId: 'chat-root-turn',
                        lineageAction: 'continue',
                        lineageDepth: 1,
                        text: 'Official chat follow-up text',
                    },
                    {
                        id: 'chat-root-turn',
                        url: conversationImageUrl,
                        prompt: 'Official chat root turn',
                        aspectRatio: '1:1',
                        size: '1K',
                        style: 'None',
                        model: 'gemini-3.1-flash-image-preview',
                        createdAt: 1,
                        executionMode: 'single-turn',
                        lineageAction: 'root',
                        lineageDepth: 0,
                        text: 'Official chat root text',
                    },
                ],
                workspaceSession: {
                    ...EMPTY_WORKSPACE_SNAPSHOT.workspaceSession,
                    source: 'history',
                    sourceHistoryId: 'chat-follow-up-turn',
                },
                branchState: {
                    nameOverrides: {
                        'chat-root-turn': 'Chat Branch',
                    },
                    continuationSourceByBranchOriginId: {
                        'chat-root-turn': 'chat-follow-up-turn',
                    },
                },
                conversationState: {
                    byBranchOriginId: {
                        'chat-root-turn': {
                            conversationId: 'chatconv1-restore-path',
                            branchOriginId: 'chat-root-turn',
                            activeSourceHistoryId: 'chat-follow-up-turn',
                            turnIds: ['chat-follow-up-turn'],
                            startedAt: 10,
                            updatedAt: 11,
                        },
                    },
                },
                viewState: {
                    ...EMPTY_WORKSPACE_SNAPSHOT.viewState,
                    generatedImageUrls: [conversationImageUrl],
                    selectedHistoryId: 'chat-follow-up-turn',
                },
            }),
        );

        const loaded = loadWorkspaceSnapshot();
        const conversationContext = buildConversationRequestContext({
            activeSourceHistoryId: loaded.workspaceSession.conversationActiveSourceHistoryId || 'chat-follow-up-turn',
            branchOriginId: loaded.workspaceSession.conversationBranchOriginId || 'chat-root-turn',
            conversationState: loaded.conversationState,
            history: loaded.history,
        });

        expect(loaded.history.find((item) => item.id === 'chat-follow-up-turn')?.url).toBe(conversationImageUrl);
        expect(loaded.history.find((item) => item.id === 'chat-root-turn')?.url).toBe(conversationImageUrl);
        expect(loaded.viewState.generatedImageUrls).toEqual([conversationImageUrl]);
        expect(conversationContext).toEqual({
            conversationId: 'chatconv1-restore-path',
            branchOriginId: 'chat-root-turn',
            activeSourceHistoryId: 'chat-follow-up-turn',
            priorTurns: [
                {
                    historyId: 'chat-follow-up-turn',
                    prompt: 'Official chat follow-up turn',
                    sourceImage: {
                        dataUrl: conversationImageUrl,
                        mimeType: 'image/gif',
                    },
                    outputImage: {
                        dataUrl: conversationImageUrl,
                        mimeType: 'image/gif',
                    },
                    text: 'Official chat follow-up text',
                    thoughts: null,
                    thoughtSignature: null,
                },
            ],
        });
    });

    it('rehydrates workspace session conversation state from the selected turn', () => {
        const restored = sanitizeWorkspaceSnapshot({
            ...incomingSnapshot,
            conversationState: {
                byBranchOriginId: {
                    'import-root': {
                        conversationId: 'conversation-import-root',
                        branchOriginId: 'import-root',
                        activeSourceHistoryId: 'import-branch',
                        turnIds: [],
                        startedAt: 10,
                        updatedAt: 11,
                    },
                },
            },
            workspaceSession: {
                ...EMPTY_WORKSPACE_SNAPSHOT.workspaceSession,
                activeResult: {
                    text: 'Imported branch result',
                    thoughts: null,
                    grounding: null,
                    metadata: null,
                    sessionHints: null,
                    historyId: 'import-branch',
                },
                conversationId: 'stale-conversation',
                conversationBranchOriginId: 'stale-branch',
                conversationActiveSourceHistoryId: 'stale-turn',
                conversationTurnIds: ['stale-turn'],
                source: 'history',
                sourceHistoryId: 'import-branch',
            },
            viewState: {
                ...EMPTY_WORKSPACE_SNAPSHOT.viewState,
                selectedHistoryId: 'import-branch',
            },
        });

        expect(restored.workspaceSession.conversationId).toBe('conversation-import-root');
        expect(restored.workspaceSession.conversationBranchOriginId).toBe('import-root');
        expect(restored.workspaceSession.conversationActiveSourceHistoryId).toBe('import-branch');
        expect(restored.workspaceSession.conversationTurnIds).toEqual(['import-branch']);
        expect(restored.conversationState.byBranchOriginId['import-root']?.turnIds).toEqual(['import-branch']);
    });

    it('clears stale workspace session conversation state when no selected turn maps to a conversation', () => {
        const restored = sanitizeWorkspaceSnapshot({
            ...baseSnapshot,
            workspaceSession: {
                ...EMPTY_WORKSPACE_SNAPSHOT.workspaceSession,
                conversationId: 'stale-conversation',
                conversationBranchOriginId: 'stale-branch',
                conversationActiveSourceHistoryId: 'stale-turn',
                conversationTurnIds: ['stale-turn'],
            },
        });

        expect(restored.workspaceSession.conversationId).toBeNull();
        expect(restored.workspaceSession.conversationBranchOriginId).toBeNull();
        expect(restored.workspaceSession.conversationActiveSourceHistoryId).toBeNull();
        expect(restored.workspaceSession.conversationTurnIds).toEqual([]);
    });

    it('falls back to a compact local snapshot when retained inline assets exceed localStorage quota', () => {
        const snapshot: WorkspacePersistenceSnapshot = {
            ...EMPTY_WORKSPACE_SNAPSHOT,
            stagedAssets: [
                {
                    id: 'uploaded-object',
                    url: 'data:image/png;base64,uploaded-object-payload',
                    role: 'object',
                    origin: 'upload',
                    createdAt: 100,
                },
            ],
            viewState: {
                generatedImageUrls: ['data:image/png;base64,full-image-a', 'data:image/png;base64,full-image-b'],
                selectedImageIndex: 1,
                selectedHistoryId: null,
            },
        };

        const originalSetItem = Storage.prototype.setItem;
        const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
            const parsed = JSON.parse(value);
            if (
                key === WORKSPACE_SNAPSHOT_STORAGE_KEY &&
                typeof parsed?.stagedAssets?.[0]?.url === 'string' &&
                parsed.stagedAssets[0].url.startsWith('data:image/')
            ) {
                throw new DOMException('Quota exceeded', 'QuotaExceededError');
            }

            return originalSetItem.call(this, key, value);
        });

        expect(() => saveWorkspaceSnapshot(snapshot)).not.toThrow();
        expect(setItemSpy).toHaveBeenCalledTimes(2);

        const stored = JSON.parse(localStorage.getItem(WORKSPACE_SNAPSHOT_STORAGE_KEY) || 'null');
        expect(stored.viewState.generatedImageUrls).toEqual([]);
        expect(stored.viewState.selectedHistoryId).toBeNull();
        expect(stored.stagedAssets[0].url).toBe('');
    });

    it('always strips inline generated image urls from local snapshots before quota fallback is needed', () => {
        const snapshot: WorkspacePersistenceSnapshot = {
            ...EMPTY_WORKSPACE_SNAPSHOT,
            history: [
                {
                    id: 'kept-turn',
                    url: 'data:image/jpeg;base64,thumb-inline',
                    savedFilename: 'kept-turn.jpg',
                    prompt: 'Keep the history item intact unless quota fallback is needed',
                    aspectRatio: '1:1',
                    size: '2K',
                    style: 'None',
                    model: 'gemini-3.1-flash-image-preview',
                    createdAt: 200,
                },
            ],
            viewState: {
                generatedImageUrls: ['data:image/png;base64,stage-a', 'https://example.com/persistable-stage.png'],
                selectedImageIndex: 1,
                selectedHistoryId: 'kept-turn',
            },
        };

        expect(() => saveWorkspaceSnapshot(snapshot)).not.toThrow();

        const stored = JSON.parse(localStorage.getItem(WORKSPACE_SNAPSHOT_STORAGE_KEY) || 'null');
        expect(stored.viewState.generatedImageUrls).toEqual(['https://example.com/persistable-stage.png']);
        expect(stored.viewState.selectedImageIndex).toBe(0);
        expect(stored.history[0].url).toBe('/api/load-image?filename=kept-turn.jpg');
    });

    it('uses saved output links for staged assets when restoring the stage from local snapshots', () => {
        const snapshot: WorkspacePersistenceSnapshot = {
            ...EMPTY_WORKSPACE_SNAPSHOT,
            stagedAssets: [
                {
                    id: 'stage-source-1',
                    url: 'data:image/png;base64,stage-inline',
                    savedFilename: 'stage-source-1.png',
                    role: 'stage-source',
                    origin: 'history',
                    createdAt: 300,
                    sourceHistoryId: 'history-1',
                    lineageAction: 'continue',
                },
            ],
            viewState: {
                generatedImageUrls: [],
                selectedImageIndex: 0,
                selectedHistoryId: null,
            },
        };

        expect(() => saveWorkspaceSnapshot(snapshot)).not.toThrow();

        const stored = JSON.parse(localStorage.getItem(WORKSPACE_SNAPSHOT_STORAGE_KEY) || 'null');
        expect(stored.stagedAssets[0].url).toBe('/api/load-image?filename=stage-source-1.png');
        expect(stored.viewState.generatedImageUrls).toEqual(['/api/load-image?filename=stage-source-1.png']);
        expect(stored.viewState.selectedImageIndex).toBe(0);
    });

    it('removes inline image payloads from saved local snapshots when all visual surfaces are file-backed', () => {
        const snapshot: WorkspacePersistenceSnapshot = {
            ...EMPTY_WORKSPACE_SNAPSHOT,
            history: [
                {
                    id: 'history-1',
                    url: 'data:image/png;base64,history-inline',
                    savedFilename: 'history-1.png',
                    prompt: 'History image',
                    aspectRatio: '1:1',
                    size: '2K',
                    style: 'None',
                    model: 'gemini-3.1-flash-image-preview',
                    createdAt: 400,
                },
            ],
            stagedAssets: [
                {
                    id: 'stage-source-2',
                    url: 'data:image/png;base64,stage-inline',
                    savedFilename: 'stage-source-2.png',
                    role: 'stage-source',
                    origin: 'history',
                    createdAt: 401,
                    sourceHistoryId: 'history-1',
                    lineageAction: 'reopen',
                },
            ],
            viewState: {
                generatedImageUrls: ['data:image/png;base64,viewer-inline'],
                selectedImageIndex: 0,
                selectedHistoryId: 'history-1',
            },
        };

        expect(() => saveWorkspaceSnapshot(snapshot)).not.toThrow();

        const storedPayload = localStorage.getItem(WORKSPACE_SNAPSHOT_STORAGE_KEY) || '';
        expect(storedPayload).not.toContain('data:image/');
    });
});
