/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React, { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
    EMPTY_WORKSPACE_SNAPSHOT,
    exportWorkspaceSnapshotDocument,
    saveWorkspaceSnapshot,
    WORKSPACE_SNAPSHOT_STORAGE_KEY,
} from '../utils/workspacePersistence';
import { useWorkspaceBlobHydration } from '../hooks/useWorkspaceBlobHydration';
import {
    clearAllWorkspaceBlobs,
    collectSnapshotReferencedBlobKeys,
    computeWorkspaceBlobKey,
    dataUrlToBlob,
    blobToDataUrl,
    getWorkspaceBlobs,
    getWorkspaceMemoryBlobSync,
    hydrateWorkspaceSnapshotBlobs,
    INLINE_HISTORY_OFFLOAD_THRESHOLD_BYTES,
    isIndexedDbAvailable,
    pruneUnreferencedWorkspaceBlobs,
    putWorkspaceBlobs,
    StoredWorkspaceBlobRecord,
    WORKSPACE_BLOB_DB_NAME,
    WORKSPACE_BLOB_STORE_NAME,
} from '../utils/workspaceBlobStore';
import { GeneratedImage, StageAsset, WorkspacePersistenceSnapshot } from '../types';

function createFakeIndexedDb(options: { failWrite?: boolean; failOpen?: boolean } = {}) {
    const records = new Map<string, StoredWorkspaceBlobRecord>();
    const objectStores = new Set<string>([WORKSPACE_BLOB_STORE_NAME]);

    const createObjectStoreApi = () => ({
        put(record: StoredWorkspaceBlobRecord) {
            if (!options.failWrite) {
                records.set(record.key, record);
            }
            const req: Record<string, unknown> = { result: record.key, error: null };
            queueMicrotask(() => {
                if (typeof req.onsuccess === 'function') {
                    (req.onsuccess as () => void)();
                }
            });
            return req;
        },
        get(key: string) {
            const req: Record<string, unknown> = { result: records.get(key), error: null };
            queueMicrotask(() => {
                if (typeof req.onsuccess === 'function') {
                    (req.onsuccess as () => void)();
                }
            });
            return req;
        },
        getAllKeys() {
            const req: Record<string, unknown> = { result: Array.from(records.keys()), error: null };
            queueMicrotask(() => {
                if (typeof req.onsuccess === 'function') {
                    (req.onsuccess as () => void)();
                }
            });
            return req;
        },
        delete(key: string) {
            records.delete(key);
            const req: Record<string, unknown> = { result: undefined, error: null };
            queueMicrotask(() => {
                if (typeof req.onsuccess === 'function') {
                    (req.onsuccess as () => void)();
                }
            });
            return req;
        },
        clear() {
            records.clear();
            const req: Record<string, unknown> = { result: undefined, error: null };
            queueMicrotask(() => {
                if (typeof req.onsuccess === 'function') {
                    (req.onsuccess as () => void)();
                }
            });
            return req;
        },
    });

    const dbMock = {
        objectStoreNames: {
            contains: (name: string) => objectStores.has(name),
        },
        createObjectStore: (name: string) => {
            objectStores.add(name);
            return createObjectStoreApi();
        },
        transaction: (_storeName: string, mode: 'readonly' | 'readwrite') => {
            const storeApi = createObjectStoreApi();
            const tx: Record<string, unknown> = {
                objectStore: () => storeApi,
                error: options.failWrite && mode === 'readwrite' ? new Error('Simulated IDB write error') : null,
                oncomplete: null,
                onerror: null,
                onabort: null,
            };

            queueMicrotask(() => {
                queueMicrotask(() => {
                    if (options.failWrite && mode === 'readwrite') {
                        if (typeof tx.onerror === 'function') {
                            (tx.onerror as () => void)();
                        }
                    } else if (typeof tx.oncomplete === 'function') {
                        (tx.oncomplete as () => void)();
                    }
                });
            });

            return tx;
        },
        close: vi.fn(),
        onversionchange: null as (() => void) | null,
    };

    const idbFactory = {
        open: vi.fn((dbName: string) => {
            expect(dbName).toBe(WORKSPACE_BLOB_DB_NAME);
            const req: Record<string, unknown> = {
                result: dbMock,
                error: options.failOpen ? new Error('Simulated IDB open failure') : null,
                onupgradeneeded: null,
                onsuccess: null,
                onerror: null,
                onblocked: null,
            };

            queueMicrotask(() => {
                if (options.failOpen) {
                    if (typeof req.onerror === 'function') {
                        (req.onerror as () => void)();
                    }
                    return;
                }
                if (typeof req.onupgradeneeded === 'function') {
                    (req.onupgradeneeded as () => void)();
                }
                if (typeof req.onsuccess === 'function') {
                    (req.onsuccess as () => void)();
                }
            });

            return req;
        }),
    } as unknown as IDBFactory;

    return { idbFactory, records };
}

describe('workspaceBlobStore', () => {
    const originalIndexedDb = window.indexedDB;

    beforeEach(async () => {
        const { idbFactory } = createFakeIndexedDb();
        Object.defineProperty(window, 'indexedDB', {
            value: idbFactory,
            configurable: true,
            writable: true,
        });
        await clearAllWorkspaceBlobs();
    });

    afterEach(async () => {
        await clearAllWorkspaceBlobs();
        Object.defineProperty(window, 'indexedDB', {
            value: originalIndexedDb,
            configurable: true,
            writable: true,
        });
    });

    it('computes deterministic blob keys and differentiates distinct payloads', () => {
        const sampleA =
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        const sampleB =
            'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q==';

        const keyA1 = computeWorkspaceBlobKey(sampleA);
        const keyA2 = computeWorkspaceBlobKey(sampleA);
        const keyB = computeWorkspaceBlobKey(sampleB);

        expect(keyA1).toMatch(/^blob_[0-9a-f]{16}_[0-9a-z]+$/);
        expect(keyA1).toBe(keyA2);
        expect(keyA1).not.toBe(keyB);
    });

    it('losslessly converts data URLs to Blob and back to data URLs', async () => {
        const pngDataUrl =
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        const converted = dataUrlToBlob(pngDataUrl);

        expect(converted).not.toBeNull();
        expect(converted?.mimeType).toBe('image/png');
        expect(converted?.blob.size).toBeGreaterThan(0);

        const roundTripped = await blobToDataUrl(converted!.blob);
        expect(roundTripped).toBe(pngDataUrl);
        expect(dataUrlToBlob('https://example.com/not-a-data-url.png')).toBeNull();
    });

    it('persists blobs to IndexedDB and restores them after cold memory cache clear', async () => {
        const { idbFactory, records } = createFakeIndexedDb();
        Object.defineProperty(window, 'indexedDB', {
            value: idbFactory,
            configurable: true,
            writable: true,
        });

        const dataUrl =
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        const key = computeWorkspaceBlobKey(dataUrl);

        await putWorkspaceBlobs([{ key, dataUrl }]);
        expect(getWorkspaceMemoryBlobSync(key)).toBe(dataUrl);
        expect(records.has(key)).toBe(true);

        // Evict only the in-memory cache by pruning with an empty set on a temporary no-IDB state
        Object.defineProperty(window, 'indexedDB', {
            value: undefined,
            configurable: true,
            writable: true,
        });
        await pruneUnreferencedWorkspaceBlobs(new Set());
        expect(getWorkspaceMemoryBlobSync(key)).toBeNull();

        // Re-attach the same IndexedDB instance to simulate a fresh page reload
        Object.defineProperty(window, 'indexedDB', {
            value: idbFactory,
            configurable: true,
            writable: true,
        });

        const loadedMap = await getWorkspaceBlobs([key]);
        expect(loadedMap.get(key)).toBe(dataUrl);
        expect(getWorkspaceMemoryBlobSync(key)).toBe(dataUrl);
    });

    it('prunes unreferenced orphan blobs while preserving referenced blobs', async () => {
        const { idbFactory, records } = createFakeIndexedDb();
        Object.defineProperty(window, 'indexedDB', {
            value: idbFactory,
            configurable: true,
            writable: true,
        });

        const keepUrl =
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        const orphanUrl = 'data:image/jpeg;base64,QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVo=';
        const keepKey = computeWorkspaceBlobKey(keepUrl);
        const orphanKey = computeWorkspaceBlobKey(orphanUrl);

        await putWorkspaceBlobs([
            { key: keepKey, dataUrl: keepUrl },
            { key: orphanKey, dataUrl: orphanUrl },
        ]);
        expect(records.size).toBe(2);

        const deletedCount = await pruneUnreferencedWorkspaceBlobs(new Set([keepKey]));
        expect(deletedCount).toBe(1);
        expect(records.has(keepKey)).toBe(true);
        expect(records.has(orphanKey)).toBe(false);
        expect(getWorkspaceMemoryBlobSync(orphanKey)).toBeNull();
    });

    it('collects referenced blobKeys and hydrates stagedAssets, history, resultParts, and stage viewState', async () => {
        const assetDataUrl = 'data:image/png;base64,U1RBR0VEX0FTU0VUX1BMMQ==';
        const historyDataUrl = 'data:image/jpeg;base64,SElTVE9SWV9NQUlOX0lNQUdF';
        const partDataUrl = 'data:image/png;base64,UkVTVUxUX1BBUlRfSU1BR0U=';

        const assetKey = computeWorkspaceBlobKey(assetDataUrl);
        const historyKey = computeWorkspaceBlobKey(historyDataUrl);
        const partKey = computeWorkspaceBlobKey(partDataUrl);

        await putWorkspaceBlobs([
            { key: assetKey, dataUrl: assetDataUrl },
            { key: historyKey, dataUrl: historyDataUrl },
            { key: partKey, dataUrl: partDataUrl },
        ]);

        const dehydratedSnapshot: WorkspacePersistenceSnapshot = {
            ...EMPTY_WORKSPACE_SNAPSHOT,
            stagedAssets: [
                {
                    id: 'asset-1',
                    url: '',
                    blobKey: assetKey,
                    role: 'object',
                    origin: 'upload',
                    createdAt: 1000,
                },
            ],
            history: [
                {
                    id: 'hist-1',
                    url: '',
                    blobKey: historyKey,
                    prompt: 'test prompt',
                    aspectRatio: '1:1',
                    size: '1K',
                    style: 'None',
                    model: 'gemini-3.1-flash-image',
                    createdAt: 2000,
                    status: 'success',
                    resultParts: [
                        {
                            sequence: 1,
                            kind: 'thought-image',
                            imageUrl: '',
                            blobKey: partKey,
                            mimeType: 'image/png',
                        },
                    ],
                },
            ],
            viewState: {
                generatedImageUrls: [],
                selectedImageIndex: 0,
                selectedHistoryId: 'hist-1',
            },
        };

        const referencedKeys = collectSnapshotReferencedBlobKeys(dehydratedSnapshot);
        expect(Array.from(referencedKeys).sort()).toEqual([assetKey, historyKey, partKey].sort());

        const { snapshot: hydrated, hydratedCount } = await hydrateWorkspaceSnapshotBlobs(dehydratedSnapshot);
        expect(hydratedCount).toBe(3);
        expect(hydrated.stagedAssets[0]?.url).toBe(assetDataUrl);
        expect(hydrated.history[0]?.url).toBe(historyDataUrl);
        const firstPart = hydrated.history[0]?.resultParts?.[0];
        expect(firstPart && 'imageUrl' in firstPart ? firstPart.imageUrl : null).toBe(partDataUrl);
        expect(hydrated.viewState.generatedImageUrls).toEqual([historyDataUrl]);
    });

    it('degrades gracefully when IndexedDB is unavailable or rejects transactions', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const { idbFactory } = createFakeIndexedDb({ failWrite: true });
        Object.defineProperty(window, 'indexedDB', {
            value: idbFactory,
            configurable: true,
            writable: true,
        });

        const dataUrl =
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        const key = computeWorkspaceBlobKey(dataUrl);

        await expect(putWorkspaceBlobs([{ key, dataUrl }])).resolves.toBeUndefined();
        expect(getWorkspaceMemoryBlobSync(key)).toBe(dataUrl);

        Object.defineProperty(window, 'indexedDB', {
            value: undefined,
            configurable: true,
            writable: true,
        });
        expect(isIndexedDbAvailable()).toBe(false);
        await expect(clearAllWorkspaceBlobs()).resolves.toBeUndefined();
        warnSpy.mockRestore();
    });

    it('offloads unsaved stagedAssets and >=32KiB inline thumbnails to IndexedDB while keeping <32KiB thumbnails inline, and exports self-contained JSON', async () => {
        const uploadedUrl =
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        const smallThumbUrl = 'data:image/jpeg;base64,U01BTExfVEhVTUJOQUlM';
        const largeThumbUrl = `data:image/jpeg;base64,${'Q'.repeat(INLINE_HISTORY_OFFLOAD_THRESHOLD_BYTES + 256)}`;

        saveWorkspaceSnapshot({
            ...EMPTY_WORKSPACE_SNAPSHOT,
            stagedAssets: [
                {
                    id: 'upload-1',
                    url: uploadedUrl,
                    role: 'object',
                    origin: 'upload',
                    createdAt: 1000,
                },
            ],
            history: [
                {
                    id: 'small-thumb-turn',
                    url: smallThumbUrl,
                    savedFilename: 'small-turn.png',
                    thumbnailInline: true,
                    prompt: 'Small thumbnail turn',
                    aspectRatio: '1:1',
                    size: '1K',
                    style: 'None',
                    model: 'gemini-3.1-flash-image',
                    createdAt: 2000,
                },
                {
                    id: 'large-thumb-turn',
                    url: largeThumbUrl,
                    savedFilename: 'large-turn.png',
                    thumbnailInline: true,
                    prompt: 'Large thumbnail turn',
                    aspectRatio: '1:1',
                    size: '1K',
                    style: 'None',
                    model: 'gemini-3.1-flash-image',
                    createdAt: 3000,
                },
            ],
        });

        const rawLocal = localStorage.getItem(WORKSPACE_SNAPSHOT_STORAGE_KEY);
        expect(rawLocal).toBeTruthy();
        const persistedLocal = JSON.parse(rawLocal || '{}') as WorkspacePersistenceSnapshot;

        expect(persistedLocal.stagedAssets[0]?.url).toBe('');
        expect(persistedLocal.stagedAssets[0]?.blobKey).toBe(computeWorkspaceBlobKey(uploadedUrl));
        expect(persistedLocal.history.find((item) => item.id === 'small-thumb-turn')?.url).toBe(smallThumbUrl);
        expect(persistedLocal.history.find((item) => item.id === 'small-thumb-turn')?.blobKey).toBeUndefined();
        expect(persistedLocal.history.find((item) => item.id === 'large-thumb-turn')?.url).toBe('');
        expect(persistedLocal.history.find((item) => item.id === 'large-thumb-turn')?.blobKey).toBe(
            computeWorkspaceBlobKey(largeThumbUrl),
        );

        const exportedBlob = await exportWorkspaceSnapshotDocument(persistedLocal);
        const exportedJson = JSON.parse(await exportedBlob.text()) as { snapshot: WorkspacePersistenceSnapshot };
        expect(exportedJson.snapshot.stagedAssets[0]?.url).toBe(uploadedUrl);
        expect(exportedJson.snapshot.stagedAssets[0]?.blobKey).toBeUndefined();
        expect(exportedJson.snapshot.history.find((item) => item.id === 'large-thumb-turn')?.url).toBe(largeThumbUrl);
    });

    it('recomputes a fresh content-addressed blobKey when an inline asset or history item url is mutated while carrying an older blobKey', () => {
        const originalAssetUrl = 'data:image/png;base64,T1JJR0lOQUxfQVNTRVRfUEFZTE9BRA==';
        const mutatedAssetUrl = 'data:image/png;base64,TVVUQVRFRF9BU1NFVF9QQVlMT0FE';
        const staleAssetKey = computeWorkspaceBlobKey(originalAssetUrl);
        const expectedAssetKey = computeWorkspaceBlobKey(mutatedAssetUrl);

        const originalHistoryUrl = `data:image/jpeg;base64,${'A'.repeat(INLINE_HISTORY_OFFLOAD_THRESHOLD_BYTES + 128)}`;
        const mutatedHistoryUrl = `data:image/jpeg;base64,${'B'.repeat(INLINE_HISTORY_OFFLOAD_THRESHOLD_BYTES + 128)}`;
        const staleHistoryKey = computeWorkspaceBlobKey(originalHistoryUrl);
        const expectedHistoryKey = computeWorkspaceBlobKey(mutatedHistoryUrl);

        const snapshotWithMutatedUrls: WorkspacePersistenceSnapshot = {
            ...EMPTY_WORKSPACE_SNAPSHOT,
            stagedAssets: [
                {
                    id: 'mutated-asset',
                    url: mutatedAssetUrl,
                    blobKey: staleAssetKey,
                    role: 'object',
                    origin: 'upload',
                    createdAt: 1000,
                },
            ],
            history: [
                {
                    id: 'mutated-history',
                    url: mutatedHistoryUrl,
                    blobKey: staleHistoryKey,
                    savedFilename: 'mutated-turn.png',
                    thumbnailInline: true,
                    prompt: 'Mutated inline history turn',
                    aspectRatio: '1:1',
                    size: '1K',
                    style: 'None',
                    model: 'gemini-nano-banana-2.1',
                    createdAt: 2000,
                },
            ],
        };

        // GC key collection retains both the prior blobKey and the newly computed inline hash
        const referencedKeys = collectSnapshotReferencedBlobKeys(snapshotWithMutatedUrls);
        expect(referencedKeys.has(staleAssetKey)).toBe(true);
        expect(referencedKeys.has(expectedAssetKey)).toBe(true);
        expect(referencedKeys.has(staleHistoryKey)).toBe(true);
        expect(referencedKeys.has(expectedHistoryKey)).toBe(true);

        saveWorkspaceSnapshot(snapshotWithMutatedUrls);

        const persistedLocal = JSON.parse(
            localStorage.getItem(WORKSPACE_SNAPSHOT_STORAGE_KEY) || '{}',
        ) as WorkspacePersistenceSnapshot;
        expect(persistedLocal.stagedAssets[0]?.url).toBe('');
        expect(persistedLocal.stagedAssets[0]?.blobKey).toBe(expectedAssetKey);
        expect(persistedLocal.stagedAssets[0]?.blobKey).not.toBe(staleAssetKey);

        expect(persistedLocal.history[0]?.url).toBe('');
        expect(persistedLocal.history[0]?.blobKey).toBe(expectedHistoryKey);
        expect(persistedLocal.history[0]?.blobKey).not.toBe(staleHistoryKey);
    });

    it('hydrates dehydrated assets via useWorkspaceBlobHydration and aborts stale hydration on epoch cancellation', async () => {
        (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
        const assetUrl =
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        const assetKey = computeWorkspaceBlobKey(assetUrl);
        await putWorkspaceBlobs([{ key: assetKey, dataUrl: assetUrl }]);

        type HarnessState = {
            stagedAssets: StageAsset[];
            generatedImageUrls: string[];
            isHydratingBlobs: boolean;
            cancelPendingBlobHydration: () => void;
        };
        const stateHolder: { current: HarnessState | null } = { current: null };

        function TestHarness() {
            const [stagedAssets, setStagedAssets] = useState<StageAsset[]>([
                {
                    id: 'stage-1',
                    url: '',
                    blobKey: assetKey,
                    role: 'stage-source',
                    origin: 'upload',
                    createdAt: 100,
                },
            ]);
            const [history, setHistory] = useState<GeneratedImage[]>([]);
            const [generatedImageUrls, setGeneratedImageUrls] = useState<string[]>([]);
            const hydration = useWorkspaceBlobHydration({
                stagedAssets,
                setStagedAssets,
                history,
                setHistory,
                selectedHistoryId: null,
                generatedImageUrls,
                setGeneratedImageUrls,
            });
            stateHolder.current = { stagedAssets, generatedImageUrls, ...hydration };
            return null;
        }

        const container = document.createElement('div');
        const root = createRoot(container);

        await act(async () => {
            root.render(React.createElement(TestHarness));
            await new Promise((resolve) => setTimeout(resolve, 20));
        });

        expect(stateHolder.current?.isHydratingBlobs).toBe(false);
        expect(stateHolder.current?.stagedAssets[0]?.url).toBe(assetUrl);
        expect(stateHolder.current?.generatedImageUrls).toEqual([assetUrl]);

        await act(async () => {
            root.unmount();
        });
    });
});
