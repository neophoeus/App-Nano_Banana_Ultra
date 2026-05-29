/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { ResultPart, WorkspacePersistenceSnapshot } from '../types';
import { prepareImportedWorkspaceSnapshotDocument } from '../utils/workspaceImportAssets';
import { EMPTY_WORKSPACE_SNAPSHOT } from '../utils/workspacePersistence';

const buildLiteWorkspaceDocument = (
    snapshotOverrides: Partial<WorkspacePersistenceSnapshot>,
    savedImages: Record<string, unknown>,
) =>
    JSON.stringify({
        format: 'nbu-workspace-snapshot',
        version: 1,
        exportedAt: '2026-05-16T00:00:00.000Z',
        snapshot: {
            ...EMPTY_WORKSPACE_SNAPSHOT,
            ...snapshotOverrides,
        },
        assets: {
            savedImages,
        },
    });

const createSuccessfulFetchMock = (renameByFilename: Record<string, string> = {}) =>
    vi.fn(async (_url: string, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body || '{}'));
        const filename = renameByFilename[body.filename] || body.filename;

        return {
            json: async () => ({ success: true, path: `D:\\output\\${filename}`, filename }),
        } as Response;
    });

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('prepareImportedWorkspaceSnapshotDocument', () => {
    it('persists Lite embedded images and restores Ultra load urls across imported snapshot surfaces', async () => {
        const fetchMock = createSuccessfulFetchMock();
        vi.stubGlobal('fetch', fetchMock);

        const thoughtPart: ResultPart = {
            sequence: 1,
            kind: 'thought-image',
            imageUrl: '',
            mimeType: 'image/png',
            savedFilename: 'portable-thought.png',
        };
        const serialized = buildLiteWorkspaceDocument(
            {
                history: [
                    {
                        id: 'portable-turn',
                        url: '',
                        savedFilename: 'portable-turn.png',
                        thumbnailSavedFilename: 'portable-turn-thumbnail.jpg',
                        prompt: 'Portable turn',
                        aspectRatio: '1:1',
                        size: '1K',
                        style: 'None',
                        model: 'gemini-3.1-flash-image',
                        createdAt: 100,
                        resultParts: [thoughtPart],
                    },
                ],
                stagedAssets: [
                    {
                        id: 'portable-stage',
                        url: '/lite/session-images/portable-stage.png',
                        savedFilename: 'portable-stage.png',
                        role: 'stage-source',
                        origin: 'history',
                        createdAt: 110,
                        sourceHistoryId: 'portable-turn',
                    },
                ],
                viewState: {
                    ...EMPTY_WORKSPACE_SNAPSHOT.viewState,
                    selectedHistoryId: 'portable-turn',
                },
            },
            {
                'portable-turn.png': {
                    dataUrl: 'data:image/png;base64,TURN',
                    metadata: { prompt: 'Portable turn metadata' },
                    savedAt: 1715515200000,
                },
                'portable-turn-thumbnail.jpg': {
                    dataUrl: 'data:image/jpeg;base64,THUMB',
                    savedAt: 1715515200001,
                },
                'portable-thought.png': {
                    dataUrl: 'data:image/png;base64,THOUGHT',
                    metadata: { kind: 'thought-image' },
                    savedAt: 1715515200002,
                },
                'portable-stage.png': {
                    dataUrl: 'data:image/png;base64,STAGE',
                    savedAt: 1715515200003,
                },
            },
        );

        const prepared = await prepareImportedWorkspaceSnapshotDocument(serialized);

        expect(prepared?.assetSummary).toEqual({
            totalEmbeddedAssets: 4,
            convertedAssets: 4,
            skippedAssets: 0,
            renamedAssets: 0,
        });
        expect(fetchMock).toHaveBeenCalledTimes(4);
        expect(fetchMock.mock.calls.map(([, init]) => JSON.parse(String(init?.body)).filename)).toEqual([
            'portable-turn.png',
            'portable-turn-thumbnail.jpg',
            'portable-thought.png',
            'portable-stage.png',
        ]);
        expect(prepared?.snapshot.history[0]?.url).toBe('/api/load-image?filename=portable-turn-thumbnail.jpg');
        expect(prepared?.snapshot.history[0]?.resultParts?.[0]).toMatchObject({
            imageUrl: '/api/load-image?filename=portable-thought.png',
            savedFilename: 'portable-thought.png',
        });
        expect(prepared?.snapshot.stagedAssets[0]?.url).toBe('/api/load-image?filename=portable-stage.png');
        expect(prepared?.snapshot.viewState.generatedImageUrls).toEqual([
            '/api/load-image?filename=portable-stage.png',
        ]);
    });

    it('rewrites snapshot references when an embedded image save is deduped', async () => {
        vi.stubGlobal('fetch', createSuccessfulFetchMock({ 'portable-turn.png': 'portable-turn-1.png' }));

        const serialized = buildLiteWorkspaceDocument(
            {
                history: [
                    {
                        id: 'portable-turn',
                        url: '',
                        savedFilename: 'portable-turn.png',
                        prompt: 'Portable turn',
                        aspectRatio: '1:1',
                        size: '1K',
                        style: 'None',
                        model: 'gemini-3.1-flash-image',
                        createdAt: 100,
                    },
                ],
                viewState: {
                    ...EMPTY_WORKSPACE_SNAPSHOT.viewState,
                    selectedHistoryId: 'portable-turn',
                },
            },
            {
                'portable-turn.png': {
                    dataUrl: 'data:image/png;base64,TURN',
                    savedAt: 1715515200000,
                },
            },
        );

        const prepared = await prepareImportedWorkspaceSnapshotDocument(serialized);

        expect(prepared?.assetSummary).toEqual({
            totalEmbeddedAssets: 1,
            convertedAssets: 1,
            skippedAssets: 0,
            renamedAssets: 1,
        });
        expect(prepared?.snapshot.history[0]?.savedFilename).toBe('portable-turn-1.png');
        expect(prepared?.snapshot.viewState.generatedImageUrls).toEqual([
            '/api/load-image?filename=portable-turn-1.png',
        ]);
    });
});
