import { GeneratedImage, ResultPart, StageAsset, WorkspacePersistenceSnapshot } from '../types';

export const WORKSPACE_BLOB_DB_NAME = 'nbu_workspace_blob_store';
export const WORKSPACE_BLOB_STORE_NAME = 'blobs';
export const INLINE_HISTORY_OFFLOAD_THRESHOLD_BYTES = 32 * 1024;

export interface StoredWorkspaceBlobRecord {
    key: string;
    blob: Blob;
    mimeType: string;
    byteSize: number;
    updatedAt: number;
}

const MAX_MEMORY_BLOB_CACHE_ENTRIES = 128;
const memoryBlobCache = new Map<string, string>();

let cachedIdbFactory: IDBFactory | null = null;
let cachedDbPromise: Promise<IDBDatabase | null> | null = null;

const getIndexedDbFactory = (): IDBFactory | null => {
    try {
        if (typeof window !== 'undefined' && window.indexedDB && typeof window.indexedDB.open === 'function') {
            return window.indexedDB;
        }
        if (typeof indexedDB !== 'undefined' && indexedDB && typeof indexedDB.open === 'function') {
            return indexedDB;
        }
    } catch {
        return null;
    }

    return null;
};

export function isIndexedDbAvailable(): boolean {
    return getIndexedDbFactory() !== null;
}

/**
 * Computes a deterministic 64-bit dual-FNV-1a hash key + payload length for a data URL.
 */
export function computeWorkspaceBlobKey(dataUrl: string): string {
    let hashLow = 0x811c9dc5;
    let hashHigh = 0x01000193;
    const length = dataUrl.length;

    for (let index = 0; index < length; index += 1) {
        const code = dataUrl.charCodeAt(index);
        hashLow ^= code;
        hashLow = Math.imul(hashLow, 0x01000193);
        hashHigh ^= code ^ (index & 0xff);
        hashHigh = Math.imul(hashHigh, 0x1000193b);
    }

    const lowHex = (hashLow >>> 0).toString(16).padStart(8, '0');
    const highHex = (hashHigh >>> 0).toString(16).padStart(8, '0');
    return `blob_${highHex}${lowHex}_${length.toString(36)}`;
}

export function registerWorkspaceMemoryBlob(blobKey: string, dataUrl: string): void {
    if (!blobKey || !dataUrl) {
        return;
    }

    if (memoryBlobCache.has(blobKey)) {
        memoryBlobCache.delete(blobKey);
    } else if (memoryBlobCache.size >= MAX_MEMORY_BLOB_CACHE_ENTRIES) {
        const oldestKey = memoryBlobCache.keys().next().value;
        if (typeof oldestKey === 'string') {
            memoryBlobCache.delete(oldestKey);
        }
    }

    memoryBlobCache.set(blobKey, dataUrl);
}

export function getWorkspaceMemoryBlobSync(blobKey: string): string | null {
    if (!blobKey) {
        return null;
    }

    const hit = memoryBlobCache.get(blobKey);
    if (!hit) {
        return null;
    }

    // Refresh LRU order on hit
    memoryBlobCache.delete(blobKey);
    memoryBlobCache.set(blobKey, hit);
    return hit;
}

export function dataUrlToBlob(dataUrl: string): { blob: Blob; mimeType: string } | null {
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
        return null;
    }

    const commaIndex = dataUrl.indexOf(',');
    if (commaIndex <= 5) {
        return null;
    }

    const header = dataUrl.slice(5, commaIndex);
    const payload = dataUrl.slice(commaIndex + 1);
    const headerParts = header.split(';').filter(Boolean);
    const isBase64 = headerParts.includes('base64');
    const mimeType = headerParts.find((part) => part !== 'base64' && part.includes('/')) || 'image/png';

    try {
        if (isBase64) {
            const binaryString = atob(payload);
            const byteLength = binaryString.length;
            const bytes = new Uint8Array(byteLength);
            for (let index = 0; index < byteLength; index += 1) {
                bytes[index] = binaryString.charCodeAt(index);
            }
            return {
                blob: new Blob([bytes], { type: mimeType }),
                mimeType,
            };
        }

        const decoded = decodeURIComponent(payload);
        return {
            blob: new Blob([decoded], { type: mimeType }),
            mimeType,
        };
    } catch {
        return null;
    }
}

const uint8ArrayToBase64 = (bytes: Uint8Array): string => {
    const chunkSize = 0x8000;
    const chunks: string[] = [];

    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        const slice = bytes.subarray(offset, offset + chunkSize);
        chunks.push(String.fromCharCode(...slice));
    }

    return btoa(chunks.join(''));
};

export async function blobToDataUrl(blob: Blob): Promise<string> {
    const mimeType = blob.type || 'image/png';

    if (typeof blob.arrayBuffer === 'function') {
        const buffer = await blob.arrayBuffer();
        const base64 = uint8ArrayToBase64(new Uint8Array(buffer));
        return `data:${mimeType};base64,${base64}`;
    }

    return new Promise<string>((resolve, reject) => {
        if (typeof FileReader === 'undefined') {
            reject(new Error('FileReader is not available in this environment.'));
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
            } else {
                reject(new Error('FileReader did not produce a data URL string.'));
            }
        };
        reader.onerror = () => {
            reject(reader.error || new Error('Failed to read Blob as data URL.'));
        };
        reader.readAsDataURL(blob);
    });
}

const openWorkspaceBlobDb = (): Promise<IDBDatabase | null> => {
    const idb = getIndexedDbFactory();
    if (!idb) {
        return Promise.resolve(null);
    }

    if (cachedDbPromise && cachedIdbFactory === idb) {
        return cachedDbPromise;
    }

    cachedIdbFactory = idb;
    cachedDbPromise = new Promise<IDBDatabase | null>((resolve) => {
        try {
            const request = idb.open(WORKSPACE_BLOB_DB_NAME, 1);

            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(WORKSPACE_BLOB_STORE_NAME)) {
                    db.createObjectStore(WORKSPACE_BLOB_STORE_NAME, { keyPath: 'key' });
                }
            };

            request.onsuccess = () => {
                const db = request.result;
                db.onversionchange = () => {
                    db.close();
                    if (cachedIdbFactory === idb) {
                        cachedDbPromise = null;
                    }
                };
                resolve(db);
            };

            request.onerror = () => {
                cachedDbPromise = null;
                resolve(null);
            };

            request.onblocked = () => {
                cachedDbPromise = null;
                resolve(null);
            };
        } catch {
            cachedDbPromise = null;
            resolve(null);
        }
    });

    return cachedDbPromise;
};

export async function putWorkspaceBlobs(entries: Array<{ key: string; dataUrl: string }>): Promise<void> {
    if (!Array.isArray(entries) || entries.length === 0) {
        return;
    }

    const deduplicatedEntries = new Map<string, string>();
    for (const entry of entries) {
        if (
            entry &&
            typeof entry.key === 'string' &&
            entry.key &&
            typeof entry.dataUrl === 'string' &&
            entry.dataUrl.startsWith('data:')
        ) {
            registerWorkspaceMemoryBlob(entry.key, entry.dataUrl);
            deduplicatedEntries.set(entry.key, entry.dataUrl);
        }
    }

    if (deduplicatedEntries.size === 0 || !isIndexedDbAvailable()) {
        return;
    }

    const records: StoredWorkspaceBlobRecord[] = [];
    const now = Date.now();
    for (const [key, dataUrl] of deduplicatedEntries.entries()) {
        const converted = dataUrlToBlob(dataUrl);
        if (converted) {
            records.push({
                key,
                blob: converted.blob,
                mimeType: converted.mimeType,
                byteSize: converted.blob.size,
                updatedAt: now,
            });
        }
    }

    if (records.length === 0) {
        return;
    }

    const db = await openWorkspaceBlobDb();
    if (!db) {
        return;
    }

    await new Promise<void>((resolve) => {
        try {
            const tx = db.transaction(WORKSPACE_BLOB_STORE_NAME, 'readwrite');
            const store = tx.objectStore(WORKSPACE_BLOB_STORE_NAME);

            for (const record of records) {
                store.put(record);
            }

            tx.oncomplete = () => resolve();
            tx.onerror = () => {
                console.warn('Failed to persist workspace blobs in IndexedDB:', tx.error);
                resolve();
            };
            tx.onabort = () => resolve();
        } catch (error) {
            console.warn('Failed to open IndexedDB transaction for putWorkspaceBlobs:', error);
            resolve();
        }
    });
}

export async function getWorkspaceBlobs(keys: string[]): Promise<Map<string, string>> {
    const resolved = new Map<string, string>();
    if (!Array.isArray(keys) || keys.length === 0) {
        return resolved;
    }

    const missingKeys: string[] = [];
    const seenKeys = new Set<string>();

    for (const rawKey of keys) {
        if (typeof rawKey !== 'string' || !rawKey || seenKeys.has(rawKey)) {
            continue;
        }
        seenKeys.add(rawKey);

        const cachedDataUrl = getWorkspaceMemoryBlobSync(rawKey);
        if (cachedDataUrl) {
            resolved.set(rawKey, cachedDataUrl);
        } else {
            missingKeys.push(rawKey);
        }
    }

    if (missingKeys.length === 0 || !isIndexedDbAvailable()) {
        return resolved;
    }

    const db = await openWorkspaceBlobDb();
    if (!db) {
        return resolved;
    }

    const records = await new Promise<StoredWorkspaceBlobRecord[]>((resolve) => {
        try {
            const tx = db.transaction(WORKSPACE_BLOB_STORE_NAME, 'readonly');
            const store = tx.objectStore(WORKSPACE_BLOB_STORE_NAME);
            const fetchedRecords: StoredWorkspaceBlobRecord[] = [];
            let remaining = missingKeys.length;

            const checkDone = () => {
                remaining -= 1;
                if (remaining <= 0) {
                    resolve(fetchedRecords);
                }
            };

            for (const key of missingKeys) {
                const request = store.get(key);
                request.onsuccess = () => {
                    const result = request.result as StoredWorkspaceBlobRecord | undefined;
                    if (result && result.key && result.blob) {
                        fetchedRecords.push(result);
                    }
                    checkDone();
                };
                request.onerror = () => {
                    checkDone();
                };
            }
        } catch {
            resolve([]);
        }
    });

    for (const record of records) {
        try {
            const dataUrl = await blobToDataUrl(record.blob);
            if (dataUrl.startsWith('data:')) {
                registerWorkspaceMemoryBlob(record.key, dataUrl);
                resolved.set(record.key, dataUrl);
            }
        } catch (error) {
            console.warn(`Failed to decode workspace blob ${record.key}:`, error);
        }
    }

    return resolved;
}

export async function pruneUnreferencedWorkspaceBlobs(referencedKeys: ReadonlySet<string>): Promise<number> {
    for (const cachedKey of Array.from(memoryBlobCache.keys())) {
        if (!referencedKeys.has(cachedKey)) {
            memoryBlobCache.delete(cachedKey);
        }
    }

    if (!isIndexedDbAvailable()) {
        return 0;
    }

    const db = await openWorkspaceBlobDb();
    if (!db) {
        return 0;
    }

    return new Promise<number>((resolve) => {
        try {
            const tx = db.transaction(WORKSPACE_BLOB_STORE_NAME, 'readwrite');
            const store = tx.objectStore(WORKSPACE_BLOB_STORE_NAME);
            const getAllKeysRequest = store.getAllKeys();
            let deletedCount = 0;

            getAllKeysRequest.onsuccess = () => {
                const allKeys = Array.isArray(getAllKeysRequest.result) ? getAllKeysRequest.result : [];
                for (const key of allKeys) {
                    if (typeof key === 'string' && !referencedKeys.has(key)) {
                        store.delete(key);
                        deletedCount += 1;
                    }
                }
            };

            tx.oncomplete = () => resolve(deletedCount);
            tx.onerror = () => resolve(0);
            tx.onabort = () => resolve(0);
        } catch {
            resolve(0);
        }
    });
}

export async function clearAllWorkspaceBlobs(): Promise<void> {
    memoryBlobCache.clear();

    if (!isIndexedDbAvailable()) {
        return;
    }

    const db = await openWorkspaceBlobDb();
    if (!db) {
        return;
    }

    await new Promise<void>((resolve) => {
        try {
            const tx = db.transaction(WORKSPACE_BLOB_STORE_NAME, 'readwrite');
            const store = tx.objectStore(WORKSPACE_BLOB_STORE_NAME);
            store.clear();
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
            tx.onabort = () => resolve();
        } catch {
            resolve();
        }
    });
}

const collectResultPartsBlobKeys = (parts: ResultPart[] | null | undefined, target: Set<string>): void => {
    if (!Array.isArray(parts)) {
        return;
    }

    for (const part of parts) {
        if (
            part &&
            (part.kind === 'thought-image' || part.kind === 'output-image') &&
            typeof part.blobKey === 'string' &&
            part.blobKey.trim()
        ) {
            target.add(part.blobKey);
        }
    }
};

export function collectSnapshotReferencedBlobKeys(snapshot: WorkspacePersistenceSnapshot): Set<string> {
    const keys = new Set<string>();

    for (const asset of snapshot.stagedAssets || []) {
        if (!asset) {
            continue;
        }
        if (typeof asset.blobKey === 'string' && asset.blobKey.trim()) {
            keys.add(asset.blobKey);
        }
        if (!asset.savedFilename && typeof asset.url === 'string' && asset.url.startsWith('data:')) {
            keys.add(computeWorkspaceBlobKey(asset.url));
        }
    }

    for (const item of snapshot.history || []) {
        if (!item) {
            continue;
        }
        if (typeof item.blobKey === 'string' && item.blobKey.trim()) {
            keys.add(item.blobKey);
        }
        if (
            typeof item.url === 'string' &&
            item.url.startsWith('data:') &&
            item.url.length >= INLINE_HISTORY_OFFLOAD_THRESHOLD_BYTES
        ) {
            keys.add(computeWorkspaceBlobKey(item.url));
        }
        collectResultPartsBlobKeys(item.resultParts, keys);
    }

    collectResultPartsBlobKeys(snapshot.workspaceSession?.activeResult?.resultParts, keys);

    return keys;
}

const hydrateResultPartsWithMap = (
    parts: ResultPart[] | null | undefined,
    resolvedMap: Map<string, string>,
): { parts: ResultPart[] | null | undefined; hydratedCount: number } => {
    if (!Array.isArray(parts) || parts.length === 0) {
        return { parts, hydratedCount: 0 };
    }

    let hydratedCount = 0;
    let didChange = false;

    const nextParts = parts.map((part) => {
        if (
            (part.kind === 'thought-image' || part.kind === 'output-image') &&
            typeof part.blobKey === 'string' &&
            part.blobKey &&
            !part.imageUrl
        ) {
            const hydratedUrl = resolvedMap.get(part.blobKey);
            if (hydratedUrl) {
                didChange = true;
                hydratedCount += 1;
                return {
                    ...part,
                    imageUrl: hydratedUrl,
                };
            }
        }
        return part;
    });

    return {
        parts: didChange ? nextParts : parts,
        hydratedCount,
    };
};

export async function hydrateWorkspaceSnapshotBlobs(
    snapshot: WorkspacePersistenceSnapshot,
): Promise<{ snapshot: WorkspacePersistenceSnapshot; hydratedCount: number }> {
    const keysToFetch = new Set<string>();

    for (const asset of snapshot.stagedAssets || []) {
        if (asset && typeof asset.blobKey === 'string' && asset.blobKey && !asset.url) {
            keysToFetch.add(asset.blobKey);
        }
    }

    for (const item of snapshot.history || []) {
        if (!item) {
            continue;
        }
        if (typeof item.blobKey === 'string' && item.blobKey && !item.url) {
            keysToFetch.add(item.blobKey);
        }
        if (Array.isArray(item.resultParts)) {
            for (const part of item.resultParts) {
                if (
                    (part.kind === 'thought-image' || part.kind === 'output-image') &&
                    typeof part.blobKey === 'string' &&
                    part.blobKey &&
                    !part.imageUrl
                ) {
                    keysToFetch.add(part.blobKey);
                }
            }
        }
    }

    const activeSessionParts = snapshot.workspaceSession?.activeResult?.resultParts;
    if (Array.isArray(activeSessionParts)) {
        for (const part of activeSessionParts) {
            if (
                (part.kind === 'thought-image' || part.kind === 'output-image') &&
                typeof part.blobKey === 'string' &&
                part.blobKey &&
                !part.imageUrl
            ) {
                keysToFetch.add(part.blobKey);
            }
        }
    }

    if (keysToFetch.size === 0) {
        return { snapshot, hydratedCount: 0 };
    }

    const resolvedMap = await getWorkspaceBlobs(Array.from(keysToFetch));
    if (resolvedMap.size === 0) {
        return { snapshot, hydratedCount: 0 };
    }

    let hydratedCount = 0;
    let stagedAssetsChanged = false;
    const nextStagedAssets: StageAsset[] = (snapshot.stagedAssets || []).map((asset) => {
        if (asset.blobKey && !asset.url) {
            const hydratedUrl = resolvedMap.get(asset.blobKey);
            if (hydratedUrl) {
                stagedAssetsChanged = true;
                hydratedCount += 1;
                return {
                    ...asset,
                    url: hydratedUrl,
                };
            }
        }
        return asset;
    });

    let historyChanged = false;
    const nextHistory: GeneratedImage[] = (snapshot.history || []).map((item) => {
        let itemChanged = false;
        let nextUrl = item.url;
        if (item.blobKey && !item.url) {
            const hydratedUrl = resolvedMap.get(item.blobKey);
            if (hydratedUrl) {
                nextUrl = hydratedUrl;
                itemChanged = true;
                hydratedCount += 1;
            }
        }

        const hydratedPartsResult = hydrateResultPartsWithMap(item.resultParts, resolvedMap);
        if (hydratedPartsResult.hydratedCount > 0) {
            itemChanged = true;
            hydratedCount += hydratedPartsResult.hydratedCount;
        }

        if (!itemChanged) {
            return item;
        }

        historyChanged = true;
        return {
            ...item,
            url: nextUrl,
            ...(hydratedPartsResult.parts ? { resultParts: hydratedPartsResult.parts } : {}),
        };
    });

    let nextWorkspaceSession = snapshot.workspaceSession;
    if (snapshot.workspaceSession?.activeResult?.resultParts) {
        const hydratedSessionParts = hydrateResultPartsWithMap(
            snapshot.workspaceSession.activeResult.resultParts,
            resolvedMap,
        );
        if (hydratedSessionParts.hydratedCount > 0 && hydratedSessionParts.parts) {
            hydratedCount += hydratedSessionParts.hydratedCount;
            nextWorkspaceSession = {
                ...snapshot.workspaceSession,
                activeResult: {
                    ...snapshot.workspaceSession.activeResult,
                    resultParts: hydratedSessionParts.parts,
                },
            };
        }
    }

    let nextViewState = snapshot.viewState;
    if (historyChanged && snapshot.viewState.selectedHistoryId) {
        const selectedHistoryItem = nextHistory.find((item) => item.id === snapshot.viewState.selectedHistoryId);
        if (selectedHistoryItem?.url && snapshot.viewState.generatedImageUrls.filter(Boolean).length === 0) {
            nextViewState = {
                ...snapshot.viewState,
                generatedImageUrls: [selectedHistoryItem.url],
            };
        }
    }

    if (hydratedCount === 0) {
        return { snapshot, hydratedCount: 0 };
    }

    return {
        snapshot: {
            ...snapshot,
            stagedAssets: stagedAssetsChanged ? nextStagedAssets : snapshot.stagedAssets,
            history: historyChanged ? nextHistory : snapshot.history,
            workspaceSession: nextWorkspaceSession,
            viewState: nextViewState,
        },
        hydratedCount,
    };
}
