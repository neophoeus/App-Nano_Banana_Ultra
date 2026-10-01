/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it } from 'vitest';
import {
    clearBrowserSavedImageDurableStorage,
    clearBrowserSavedImageMemoryCache,
    clearBrowserWorkspaceSnapshotFromDb,
    loadBrowserSavedImageRecord,
    loadBrowserWorkspaceSnapshotFromDb,
    persistBrowserSavedImageRecord,
    readBrowserSavedImageRecordSync,
    saveBrowserWorkspaceSnapshotToDb,
    calculateBrowserSavedImageDbSize,
    extractBrowserSavedImageFilename,
} from '../utils/browserImageStore';

// In-memory IndexedDB mock
class MockObjectStore {
    data = new Map<string, any>();

    put(value: any, key: string) {
        this.data.set(key, value);
        const req: any = { onsuccess: null, onerror: null };
        setTimeout(() => req.onsuccess?.({ target: { result: key } }), 0);
        return req;
    }

    get(key: string) {
        const val = this.data.get(key);
        const req: any = { result: val, onsuccess: null, onerror: null };
        setTimeout(() => req.onsuccess?.({ target: { result: val } }), 0);
        return req;
    }

    delete(key: string) {
        this.data.delete(key);
        const req: any = { onsuccess: null, onerror: null };
        setTimeout(() => req.onsuccess?.({ target: {} }), 0);
        return req;
    }

    openCursor() {
        const entries = Array.from(this.data.entries());
        let index = 0;
        const req: any = { onsuccess: null, onerror: null };

        const advance = () => {
            if (index < entries.length) {
                const [key, value] = entries[index++];
                const cursor = {
                    key,
                    value,
                    continue: () => setTimeout(advance, 0),
                };
                req.onsuccess?.({ target: { result: cursor } });
            } else {
                req.onsuccess?.({ target: { result: null } });
            }
        };

        setTimeout(advance, 0);
        return req;
    }
}

class MockIDBDatabase {
    stores = new Map<string, MockObjectStore>();
    objectStoreNames = {
        contains: (name: string) => this.stores.has(name),
    };

    createObjectStore(name: string) {
        let store = this.stores.get(name);
        if (!store) {
            store = new MockObjectStore();
            this.stores.set(name, store);
        }
        return store;
    }

    transaction(storeNames: string | string[], mode: string) {
        const tx: any = {
            oncomplete: null,
            onabort: null,
            objectStore: (name: string) => {
                let s = this.stores.get(name);
                if (!s) {
                    s = new MockObjectStore();
                    this.stores.set(name, s);
                }
                return s;
            },
        };
        setTimeout(() => tx.oncomplete?.(), 5);
        return tx;
    }

    close() {}
}

let mockDb = new MockIDBDatabase();

const setupMockIndexedDB = () => {
    mockDb = new MockIDBDatabase();
    (window as any).indexedDB = {
        open: (name: string, version: number) => {
            const req: any = {
                result: mockDb,
                onsuccess: null,
                onerror: null,
                onupgradeneeded: null,
            };
            setTimeout(() => {
                req.onupgradeneeded?.({ target: req });
                req.onsuccess?.({ target: req });
            }, 0);
            return req;
        },
        deleteDatabase: (name: string) => {
            mockDb = new MockIDBDatabase();
            const req: any = { onsuccess: null, onerror: null, onblocked: null };
            setTimeout(() => req.onsuccess?.(), 0);
            return req;
        },
    };
};

describe('browserImageStore', () => {
    beforeEach(async () => {
        setupMockIndexedDB();
        localStorage.clear();
        clearBrowserSavedImageMemoryCache();
        await clearBrowserSavedImageDurableStorage();
    });

    it('persists and retrieves workspace snapshot in IndexedDB', async () => {
        const dummySnapshot = JSON.stringify({
            history: [{ id: 'turn-1', prompt: 'test' }],
            timestamp: Date.now(),
        });

        const saveSuccess = await saveBrowserWorkspaceSnapshotToDb(dummySnapshot);
        expect(saveSuccess).toBe(true);

        const loadedSnapshot = await loadBrowserWorkspaceSnapshotFromDb();
        expect(loadedSnapshot).toBe(dummySnapshot);

        await clearBrowserWorkspaceSnapshotFromDb();
        const afterClear = await loadBrowserWorkspaceSnapshotFromDb();
        expect(afterClear).toBeNull();
    });

    it('persists and retrieves image record in IndexedDB', async () => {
        const filename = 'test-image.png';
        const dataUrl =
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

        const savedPath = await persistBrowserSavedImageRecord(filename, dataUrl, {
            model: 'gemini-3.1-flash-image',
        });

        expect(savedPath).toBe(`/lite/session-images/${filename}`);

        // Synchronous memory cache read
        const syncRecord = readBrowserSavedImageRecordSync(filename);
        expect(syncRecord?.dataUrl).toBe(dataUrl);

        // Asynchronous DB read
        const dbRecord = await loadBrowserSavedImageRecord(filename);
        expect(dbRecord?.dataUrl).toBe(dataUrl);
        expect(dbRecord?.metadata?.filename).toBe(filename);
    });

    it('does not evict full-resolution images when multiple thought process images are cached', async () => {
        const dataUrl =
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

        // Persist 10 full-resolution images
        for (let i = 0; i < 10; i++) {
            await persistBrowserSavedImageRecord(`main-image-${i}.png`, dataUrl);
        }

        // Persist 20 thought process images (with -thought or -part-)
        for (let i = 0; i < 20; i++) {
            await persistBrowserSavedImageRecord(`main-image-0-part-${i}.png`, dataUrl);
        }

        // Verify that the first main-image is STILL in memory cache because thought images
        // are tracked separately and do not consume full-res slots
        const firstMainSync = readBrowserSavedImageRecordSync('main-image-0.png');
        expect(firstMainSync).not.toBeNull();
        expect(firstMainSync?.dataUrl).toBe(dataUrl);

        // Verify that latest thought image is also in memory cache
        const thoughtSync = readBrowserSavedImageRecordSync('main-image-0-part-19.png');
        expect(thoughtSync).not.toBeNull();
        expect(thoughtSync?.dataUrl).toBe(dataUrl);
    });

    it('extracts filename from various virtual image URLs', () => {
        expect(extractBrowserSavedImageFilename('/lite/session-images/test.png')).toBe('test.png');
        expect(extractBrowserSavedImageFilename('browser-img://test.png')).toBe('test.png');
        expect(extractBrowserSavedImageFilename('/api/load-image?filename=test.png')).toBe('test.png');
        expect(extractBrowserSavedImageFilename('/api/load-image?other=1&filename=test.png&foo=bar')).toBe('test.png');
        expect(extractBrowserSavedImageFilename('https://example.com/regular.png')).toBeNull();
    });

    it('calculates DB size and reuses cached value within TTL', async () => {
        const dataUrl =
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        await persistBrowserSavedImageRecord('size-test.png', dataUrl);

        const initialSize = await calculateBrowserSavedImageDbSize(true);
        expect(initialSize).toBeGreaterThan(0);

        // Reusing cache
        const cachedSize = await calculateBrowserSavedImageDbSize(false);
        expect(cachedSize).toBe(initialSize);
    });
});
