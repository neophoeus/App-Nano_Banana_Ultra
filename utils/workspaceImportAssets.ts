import { ResultPart, WorkspacePersistenceSnapshot } from '../types';
import { buildSavedImageLoadUrl, extractSavedFilename, saveImageToLocal } from './imageSaveUtils';
import { parseWorkspaceSnapshotDocument } from './workspacePersistence';

const WORKSPACE_SNAPSHOT_EXPORT_FORMAT = 'nbu-workspace-snapshot';
const WORKSPACE_SNAPSHOT_EXPORT_VERSION = 1;
const LITE_SAVED_IMAGE_PATH_PREFIX = '/lite/session-images/';
const DATA_IMAGE_URL_PATTERN = /^data:image\/[\w+.-]+;base64,/;

type EmbeddedSavedImageRecord = {
    dataUrl: string;
    metadata?: Record<string, unknown>;
    savedAt?: number;
};

type WorkspaceSnapshotExportDocumentWithAssets = {
    format: typeof WORKSPACE_SNAPSHOT_EXPORT_FORMAT;
    version: typeof WORKSPACE_SNAPSHOT_EXPORT_VERSION;
    exportedAt?: string;
    snapshot: unknown;
    assets?: {
        savedImages?: Record<string, unknown>;
    };
};

export type WorkspaceImportAssetSummary = {
    totalEmbeddedAssets: number;
    convertedAssets: number;
    skippedAssets: number;
    renamedAssets: number;
};

export type PreparedWorkspaceImport = {
    snapshot: WorkspacePersistenceSnapshot;
    assetSummary: WorkspaceImportAssetSummary | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const isWorkspaceSnapshotExportDocumentWithAssets = (
    value: unknown,
): value is WorkspaceSnapshotExportDocumentWithAssets =>
    isRecord(value) &&
    value.format === WORKSPACE_SNAPSHOT_EXPORT_FORMAT &&
    value.version === WORKSPACE_SNAPSHOT_EXPORT_VERSION &&
    'snapshot' in value &&
    isRecord(value.assets) &&
    isRecord(value.assets.savedImages);

const sanitizeSavedFilename = (value: string): string | null => {
    const filename = value.split(/[\\/]/).pop()?.trim();
    return filename || null;
};

const normalizeEmbeddedSavedImageRecord = (value: unknown): EmbeddedSavedImageRecord | null => {
    if (!isRecord(value) || typeof value.dataUrl !== 'string' || !DATA_IMAGE_URL_PATTERN.test(value.dataUrl)) {
        return null;
    }

    return {
        dataUrl: value.dataUrl,
        metadata: isRecord(value.metadata) ? value.metadata : undefined,
        savedAt: typeof value.savedAt === 'number' && Number.isFinite(value.savedAt) ? value.savedAt : undefined,
    };
};

const cloneRecord = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const rewriteFilename = (value: unknown, filenameMap: Map<string, string>): string | undefined => {
    if (typeof value !== 'string') {
        return undefined;
    }

    return filenameMap.get(value) || filenameMap.get(value.trim()) || undefined;
};

const rewriteSavedFilenameField = (value: Record<string, unknown>, key: string, filenameMap: Map<string, string>) => {
    const rewrittenFilename = rewriteFilename(value[key], filenameMap);
    if (rewrittenFilename) {
        value[key] = rewrittenFilename;
    }
};

const rewriteResultParts = (value: unknown, filenameMap: Map<string, string>): void => {
    if (!Array.isArray(value)) {
        return;
    }

    value.forEach((part) => {
        if (!isRecord(part)) {
            return;
        }

        const rewrittenFilename = rewriteFilename(part.savedFilename, filenameMap);
        if (rewrittenFilename) {
            part.savedFilename = rewrittenFilename;
            part.imageUrl = buildSavedImageLoadUrl(rewrittenFilename);
        }
    });
};

const rewriteLiteAssetUrl = (
    value: unknown,
    savedFilename: unknown,
    filenameMap: Map<string, string>,
): string | undefined => {
    if (typeof savedFilename !== 'string' || savedFilename.trim().length === 0) {
        return undefined;
    }

    const effectiveFilename = filenameMap.get(savedFilename) || savedFilename;
    if (typeof value !== 'string') {
        return buildSavedImageLoadUrl(effectiveFilename);
    }

    if (
        value.length === 0 ||
        value.startsWith('data:') ||
        value.startsWith(LITE_SAVED_IMAGE_PATH_PREFIX) ||
        filenameMap.has(savedFilename)
    ) {
        return buildSavedImageLoadUrl(effectiveFilename);
    }

    return undefined;
};

const rewriteWorkspaceSnapshotFilenames = (snapshot: unknown, filenameMap: Map<string, string>): unknown => {
    if (!isRecord(snapshot)) {
        return snapshot;
    }

    const rewrittenSnapshot = cloneRecord(snapshot);

    if (Array.isArray(rewrittenSnapshot.history)) {
        rewrittenSnapshot.history.forEach((item: unknown) => {
            if (!isRecord(item)) {
                return;
            }

            rewriteSavedFilenameField(item, 'savedFilename', filenameMap);
            rewriteSavedFilenameField(item, 'thumbnailSavedFilename', filenameMap);
            rewriteResultParts(item.resultParts, filenameMap);
        });
    }

    if (Array.isArray(rewrittenSnapshot.stagedAssets)) {
        rewrittenSnapshot.stagedAssets.forEach((asset: unknown) => {
            if (!isRecord(asset)) {
                return;
            }

            rewriteSavedFilenameField(asset, 'savedFilename', filenameMap);
            const rewrittenUrl = rewriteLiteAssetUrl(asset.url, asset.savedFilename, filenameMap);
            if (rewrittenUrl) {
                asset.url = rewrittenUrl;
            }
        });
    }

    if (isRecord(rewrittenSnapshot.workspaceSession) && isRecord(rewrittenSnapshot.workspaceSession.activeResult)) {
        rewriteResultParts(rewrittenSnapshot.workspaceSession.activeResult.resultParts, filenameMap);
    }

    return rewrittenSnapshot;
};

const persistEmbeddedSavedImages = async (
    savedImages: Record<string, unknown>,
): Promise<{ filenameMap: Map<string, string>; summary: WorkspaceImportAssetSummary }> => {
    const filenameMap = new Map<string, string>();
    const summary: WorkspaceImportAssetSummary = {
        totalEmbeddedAssets: Object.keys(savedImages).length,
        convertedAssets: 0,
        skippedAssets: 0,
        renamedAssets: 0,
    };

    for (const [rawFilename, rawRecord] of Object.entries(savedImages)) {
        const requestedFilename = sanitizeSavedFilename(rawFilename);
        const record = normalizeEmbeddedSavedImageRecord(rawRecord);

        if (!requestedFilename || !record) {
            summary.skippedAssets += 1;
            continue;
        }

        const savedPath = await saveImageToLocal(record.dataUrl, 'workspace-import', record.metadata, undefined, {
            filename: requestedFilename,
            dedupe: true,
        });
        const savedFilename = extractSavedFilename(savedPath);

        if (!savedFilename) {
            summary.skippedAssets += 1;
            continue;
        }

        summary.convertedAssets += 1;

        if (savedFilename !== rawFilename) {
            filenameMap.set(rawFilename, savedFilename);
        }
        if (savedFilename !== requestedFilename) {
            filenameMap.set(requestedFilename, savedFilename);
            summary.renamedAssets += 1;
        }
    }

    return { filenameMap, summary };
};

export const prepareImportedWorkspaceSnapshotDocument = async (
    raw: string,
): Promise<PreparedWorkspaceImport | null> => {
    let parsed: unknown;

    try {
        parsed = JSON.parse(raw);
    } catch {
        return null;
    }

    if (!isWorkspaceSnapshotExportDocumentWithAssets(parsed)) {
        const snapshot = parseWorkspaceSnapshotDocument(raw);
        return snapshot ? { snapshot, assetSummary: null } : null;
    }

    const { filenameMap, summary } = await persistEmbeddedSavedImages(parsed.assets.savedImages);
    const normalizedDocument = {
        ...parsed,
        snapshot: rewriteWorkspaceSnapshotFilenames(parsed.snapshot, filenameMap),
        assets: undefined,
    };
    const snapshot = parseWorkspaceSnapshotDocument(JSON.stringify(normalizedDocument));

    return snapshot ? { snapshot, assetSummary: summary } : null;
};
