export const BROWSER_SAVED_IMAGE_PATH_PREFIX = '/lite/session-images/';
export const BROWSER_SAVED_IMAGE_STORAGE_KEY_PREFIX = 'nbu_browserSavedImage:';

const BROWSER_IMAGE_DB_NAME = 'nbu-lite-browser-images';
const BROWSER_IMAGE_DB_STORE = 'saved-images';
const BROWSER_IMAGE_DB_VERSION = 1;

export type BrowserSavedImageRecord = {
    dataUrl: string;
    metadata?: Record<string, unknown>;
    savedAt: number;
};

export type BrowserSavedImageRecordMap = Record<string, BrowserSavedImageRecord>;

const browserSavedImageCache = new Map<string, BrowserSavedImageRecord>();
let browserImageDbPromise: Promise<IDBDatabase | null> | null = null;

export const getBrowserSavedImageStorageKey = (savedFilename: string): string =>
    `${BROWSER_SAVED_IMAGE_STORAGE_KEY_PREFIX}${savedFilename}`;

const enrichBrowserSavedImageMetadata = (
    savedFilename: string,
    savedAt: number,
    metadata?: Record<string, unknown>,
): Record<string, unknown> | undefined => {
    if (!metadata) {
        return undefined;
    }

    return {
        ...metadata,
        filename: typeof metadata.filename === 'string' ? metadata.filename : savedFilename,
        timestamp: typeof metadata.timestamp === 'string' ? metadata.timestamp : new Date(savedAt).toISOString(),
    };
};

const getBrowserStorage = (kind: 'localStorage' | 'sessionStorage'): Storage | null => {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const storage = window[kind];
        return typeof storage === 'undefined' ? null : storage;
    } catch {
        return null;
    }
};

const normalizeBrowserSavedImageRecord = (value: unknown, savedFilename = ''): BrowserSavedImageRecord | null => {
    if (!value || typeof value !== 'object') {
        return null;
    }

    const candidate = value as {
        dataUrl?: unknown;
        metadata?: unknown;
        savedAt?: unknown;
    };

    if (typeof candidate.dataUrl !== 'string' || candidate.dataUrl.length === 0) {
        return null;
    }

    const savedAt = typeof candidate.savedAt === 'number' ? candidate.savedAt : Date.now();
    const metadata =
        candidate.metadata && typeof candidate.metadata === 'object'
            ? (candidate.metadata as Record<string, unknown>)
            : undefined;

    return {
        dataUrl: candidate.dataUrl,
        metadata: savedFilename ? enrichBrowserSavedImageMetadata(savedFilename, savedAt, metadata) : metadata,
        savedAt,
    };
};

const readBrowserSavedImageRecordFromStorage = (
    storage: Storage | null,
    savedFilename: string,
): BrowserSavedImageRecord | null => {
    if (!storage) {
        return null;
    }

    const storageKey = getBrowserSavedImageStorageKey(savedFilename);

    try {
        const rawRecord = storage.getItem(storageKey);
        if (!rawRecord) {
            return null;
        }

        const parsedRecord = normalizeBrowserSavedImageRecord(JSON.parse(rawRecord), savedFilename);
        if (!parsedRecord) {
            storage.removeItem(storageKey);
            return null;
        }

        browserSavedImageCache.set(savedFilename, parsedRecord);
        return parsedRecord;
    } catch {
        try {
            storage.removeItem(storageKey);
        } catch {
            // Ignore storage cleanup failures.
        }

        return null;
    }
};

const cacheBrowserSavedImageRecord = (savedFilename: string, record: BrowserSavedImageRecord): void => {
    browserSavedImageCache.set(savedFilename, record);

    // Evict oldest full-resolution images if memory cache exceeds a limit (e.g. 10 full-res images)
    const fullResKeys: string[] = [];
    const thumbnailKeys: string[] = [];
    for (const key of browserSavedImageCache.keys()) {
        if (key.includes('-thumbnail')) {
            thumbnailKeys.push(key);
        } else {
            fullResKeys.push(key);
        }
    }

    if (fullResKeys.length > 10) {
        // Sort by savedAt ascending (oldest first)
        const sortedKeys = fullResKeys.sort((a, b) => {
            const recA = browserSavedImageCache.get(a);
            const recB = browserSavedImageCache.get(b);
            return (recA?.savedAt || 0) - (recB?.savedAt || 0);
        });

        // Evict the oldest ones until we have at most 10
        const toEvictCount = sortedKeys.length - 10;
        for (let i = 0; i < toEvictCount; i++) {
            browserSavedImageCache.delete(sortedKeys[i]);
        }
    }

    // Evict oldest thumbnails if thumbnail memory cache exceeds a limit (e.g. 40 thumbnails)
    if (thumbnailKeys.length > 40) {
        // Sort by savedAt ascending (oldest first)
        const sortedThumbnailKeys = thumbnailKeys.sort((a, b) => {
            const recA = browserSavedImageCache.get(a);
            const recB = browserSavedImageCache.get(b);
            return (recA?.savedAt || 0) - (recB?.savedAt || 0);
        });

        // Evict the oldest ones until we have at most 40
        const toEvictCount = sortedThumbnailKeys.length - 40;
        for (let i = 0; i < toEvictCount; i++) {
            browserSavedImageCache.delete(sortedThumbnailKeys[i]);
        }
    }
};

const openBrowserImageDb = async (): Promise<IDBDatabase | null> => {
    if (browserImageDbPromise) {
        return browserImageDbPromise;
    }

    browserImageDbPromise = new Promise((resolve) => {
        if (typeof indexedDB === 'undefined') {
            resolve(null);
            return;
        }

        try {
            const request = indexedDB.open(BROWSER_IMAGE_DB_NAME, BROWSER_IMAGE_DB_VERSION);

            request.onupgradeneeded = () => {
                const database = request.result;
                if (!database.objectStoreNames.contains(BROWSER_IMAGE_DB_STORE)) {
                    database.createObjectStore(BROWSER_IMAGE_DB_STORE);
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve(null);
        } catch {
            resolve(null);
        }
    });

    return browserImageDbPromise;
};

const writeBrowserSavedImageRecordToDb = async (
    savedFilename: string,
    record: BrowserSavedImageRecord,
): Promise<void> => {
    const database = await openBrowserImageDb();
    if (!database) {
        return;
    }

    return await new Promise<void>((resolve) => {
        try {
            const transaction = database.transaction(BROWSER_IMAGE_DB_STORE, 'readwrite');
            const store = transaction.objectStore(BROWSER_IMAGE_DB_STORE);
            const request = store.put(record, savedFilename);
            request.onsuccess = () => resolve();
            request.onerror = () => resolve();
            transaction.oncomplete = () => resolve();
            transaction.onabort = () => resolve();
        } catch {
            resolve();
        }
    });
};

const readBrowserSavedImageRecordFromDb = async (savedFilename: string): Promise<BrowserSavedImageRecord | null> => {
    const database = await openBrowserImageDb();
    if (!database) {
        return null;
    }

    return await new Promise<BrowserSavedImageRecord | null>((resolve) => {
        try {
            const transaction = database.transaction(BROWSER_IMAGE_DB_STORE, 'readonly');
            const store = transaction.objectStore(BROWSER_IMAGE_DB_STORE);
            const request = store.get(savedFilename);
            request.onsuccess = () => resolve(normalizeBrowserSavedImageRecord(request.result, savedFilename));
            request.onerror = () => resolve(null);
            transaction.onabort = () => resolve(null);
        } catch {
            resolve(null);
        }
    });
};

export const readBrowserSavedImageRecordSync = (savedFilename: string): BrowserSavedImageRecord | null => {
    const cachedRecord = browserSavedImageCache.get(savedFilename);
    if (cachedRecord) {
        return cachedRecord;
    }

    return (
        readBrowserSavedImageRecordFromStorage(getBrowserStorage('localStorage'), savedFilename) ||
        readBrowserSavedImageRecordFromStorage(getBrowserStorage('sessionStorage'), savedFilename)
    );
};

export const persistBrowserSavedImageRecord = async (
    savedFilename: string,
    dataUrl: string,
    metadata?: Record<string, unknown>,
): Promise<string> => {
    const savedAt = Date.now();
    const record: BrowserSavedImageRecord = {
        dataUrl,
        metadata: enrichBrowserSavedImageMetadata(savedFilename, savedAt, metadata),
        savedAt,
    };

    cacheBrowserSavedImageRecord(savedFilename, record);
    void writeBrowserSavedImageRecordToDb(savedFilename, record);

    return `${BROWSER_SAVED_IMAGE_PATH_PREFIX}${savedFilename}`;
};

export const loadBrowserSavedImageRecord = async (savedFilename: string): Promise<BrowserSavedImageRecord | null> => {
    const syncRecord = readBrowserSavedImageRecordSync(savedFilename);
    if (syncRecord) {
        return syncRecord;
    }

    const dbRecord = await readBrowserSavedImageRecordFromDb(savedFilename);
    if (!dbRecord) {
        return null;
    }

    cacheBrowserSavedImageRecord(savedFilename, dbRecord);
    return dbRecord;
};

export const collectBrowserSavedImageRecords = async (
    savedFilenames: Iterable<string>,
): Promise<BrowserSavedImageRecordMap> => {
    const uniqueSavedFilenames = Array.from(
        new Set(
            Array.from(savedFilenames).filter(
                (savedFilename): savedFilename is string =>
                    typeof savedFilename === 'string' && savedFilename.trim().length > 0,
            ),
        ),
    );

    const resolvedEntries = await Promise.all(
        uniqueSavedFilenames.map(
            async (savedFilename) =>
                [savedFilename, await loadBrowserSavedImageRecord(savedFilename)] as [string, BrowserSavedImageRecord | null],
        ),
    );

    return resolvedEntries.reduce<BrowserSavedImageRecordMap>((records, [savedFilename, record]) => {
        if (record) {
            records[savedFilename] = record;
        }

        return records;
    }, {});
};

export const hydrateBrowserSavedImageRecords = (records: Record<string, unknown>): void => {
    Object.entries(records).forEach(([savedFilename, value]) => {
        const normalizedRecord = normalizeBrowserSavedImageRecord(value, savedFilename);
        if (!normalizedRecord) {
            return;
        }

        cacheBrowserSavedImageRecord(savedFilename, normalizedRecord);
    });
};

export const clearBrowserSavedImageMemoryCache = (): void => {
    browserSavedImageCache.clear();
};

const clearBrowserSavedImageRecordsFromStorage = (storage: Storage | null): void => {
    if (!storage) {
        return;
    }

    for (let index = storage.length - 1; index >= 0; index -= 1) {
        const key = storage.key(index);
        if (key?.startsWith(BROWSER_SAVED_IMAGE_STORAGE_KEY_PREFIX)) {
            storage.removeItem(key);
        }
    }
};

const deleteBrowserImageDatabase = async (): Promise<void> => {
    if (typeof indexedDB === 'undefined') {
        return;
    }

    const existingDatabase = browserImageDbPromise ? await browserImageDbPromise.catch(() => null) : null;
    existingDatabase?.close();
    browserImageDbPromise = null;

    await new Promise<void>((resolve) => {
        try {
            const request = indexedDB.deleteDatabase(BROWSER_IMAGE_DB_NAME);
            request.onsuccess = () => resolve();
            request.onerror = () => resolve();
            request.onblocked = () => resolve();
        } catch {
            resolve();
        }
    });
};

export const clearBrowserSavedImageDurableStorage = async (): Promise<void> => {
    clearBrowserSavedImageRecordsFromStorage(getBrowserStorage('localStorage'));
    clearBrowserSavedImageRecordsFromStorage(getBrowserStorage('sessionStorage'));
    await deleteBrowserImageDatabase();
};

export const clearBrowserSavedImageRecords = async ({ includeMemory = true } = {}): Promise<void> => {
    if (includeMemory) {
        clearBrowserSavedImageMemoryCache();
    }

    await clearBrowserSavedImageDurableStorage();
};

export const buildBrowserSavedImageLoadUrl = (savedFilename: string): string =>
    `${BROWSER_SAVED_IMAGE_PATH_PREFIX}${savedFilename}`;

export const findSavedFilenameByDataUrl = (dataUrl: string): string | undefined => {
    for (const [filename, record] of browserSavedImageCache.entries()) {
        if (record.dataUrl === dataUrl) {
            return filename;
        }
    }
    return undefined;
};

export const loadBrowserSavedImageDataUrl = async (savedFilename: string): Promise<string | null> =>
    (await loadBrowserSavedImageRecord(savedFilename))?.dataUrl || null;

export const loadBrowserSavedImageMetadata = async (
    savedFilename: string,
): Promise<Record<string, unknown> | undefined> => (await loadBrowserSavedImageRecord(savedFilename))?.metadata;

export const calculateBrowserSavedImageDbSize = async (): Promise<number> => {
    const database = await openBrowserImageDb();
    if (!database) {
        return 0;
    }
    return await new Promise<number>((resolve) => {
        try {
            const transaction = database.transaction(BROWSER_IMAGE_DB_STORE, 'readonly');
            const store = transaction.objectStore(BROWSER_IMAGE_DB_STORE);
            const request = store.openCursor();
            let totalSize = 0;
            request.onsuccess = (event) => {
                const cursor = (event.target as any).result;
                if (cursor) {
                    const record = cursor.value;
                    if (record && typeof record.dataUrl === 'string') {
                        totalSize += record.dataUrl.length;
                    }
                    cursor.continue();
                } else {
                    resolve(totalSize);
                }
            };
            request.onerror = () => resolve(0);
        } catch {
            resolve(0);
        }
    });
};
