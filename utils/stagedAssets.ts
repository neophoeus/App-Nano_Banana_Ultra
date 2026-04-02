import { StageAsset, StageAssetOrigin, StageAssetRole, TurnLineageAction } from '../types';

type CreateStageAssetOptions = {
    role: StageAssetRole;
    origin: StageAssetOrigin;
    url: string;
    savedFilename?: string;
    isSketch?: boolean;
    sourceHistoryId?: string;
    lineageAction?: TurnLineageAction;
};

type AddStageAssetOptions = CreateStageAssetOptions & {
    maxAssets?: number;
    preferFront?: boolean;
};

const createStageAssetId = () => {
    if (globalThis.crypto?.randomUUID) {
        return globalThis.crypto.randomUUID();
    }

    return `asset-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

export const createStageAsset = ({
    role,
    origin,
    url,
    savedFilename,
    isSketch,
    sourceHistoryId,
    lineageAction,
}: CreateStageAssetOptions): StageAsset => ({
    id: createStageAssetId(),
    url,
    savedFilename,
    role,
    origin,
    createdAt: Date.now(),
    isSketch,
    sourceHistoryId,
    lineageAction,
});

export const getStageAssetsByRole = (assets: StageAsset[], role: StageAssetRole): StageAsset[] =>
    assets.filter((asset) => asset.role === role);

export const getStageAssetUrlsByRole = (assets: StageAsset[], role: StageAssetRole): string[] =>
    getStageAssetsByRole(assets, role).map((asset) => asset.url);

export const clearStageAssetsByRoles = (assets: StageAsset[], roles: StageAssetRole[]): StageAsset[] =>
    assets.filter((asset) => !roles.includes(asset.role));

export const replaceStageAssetRoleUrls = (
    assets: StageAsset[],
    role: StageAssetRole,
    nextUrls: string[],
): StageAsset[] => {
    const withoutRole = assets.filter((asset) => asset.role !== role);
    const existingRoleAssets = assets.filter((asset) => asset.role === role);
    const usedIds = new Set<string>();

    const rebuiltRoleAssets = nextUrls.map((url) => {
        const existing = existingRoleAssets.find((asset) => asset.url === url && !usedIds.has(asset.id));
        if (existing) {
            usedIds.add(existing.id);
            return existing;
        }

        return createStageAsset({ role, origin: 'upload', url });
    });

    return [...withoutRole, ...rebuiltRoleAssets];
};

export const addStageAsset = (assets: StageAsset[], options: AddStageAssetOptions): StageAsset[] => {
    const { role, origin, url, savedFilename, isSketch, sourceHistoryId, lineageAction, maxAssets, preferFront } =
        options;

    if (role === 'stage-source') {
        const existingSingletonAsset = assets.find((asset) => asset.role === role);
        if (
            existingSingletonAsset &&
            existingSingletonAsset.url === url &&
            existingSingletonAsset.savedFilename === savedFilename &&
            existingSingletonAsset.origin === origin &&
            existingSingletonAsset.sourceHistoryId === sourceHistoryId &&
            existingSingletonAsset.lineageAction === lineageAction
        ) {
            return assets;
        }

        const withoutSingletonRole = assets.filter((asset) => asset.role !== role);
        return [
            ...withoutSingletonRole,
            createStageAsset({ role, origin, url, savedFilename, sourceHistoryId, lineageAction }),
        ];
    }

    const existingRoleAssets = assets.filter((asset) => asset.role === role);
    const dedupedRoleAssets = existingRoleAssets.filter((asset) => asset.url !== url && !(isSketch && asset.isSketch));
    const nextRoleAssets = preferFront
        ? [
              createStageAsset({ role, origin, url, savedFilename, isSketch, sourceHistoryId, lineageAction }),
              ...dedupedRoleAssets,
          ]
        : [
              ...dedupedRoleAssets,
              createStageAsset({ role, origin, url, savedFilename, isSketch, sourceHistoryId, lineageAction }),
          ];
    const trimmedRoleAssets =
        typeof maxAssets === 'number'
            ? preferFront
                ? nextRoleAssets.slice(0, maxAssets)
                : nextRoleAssets.slice(-maxAssets)
            : nextRoleAssets;

    return [...assets.filter((asset) => asset.role !== role), ...trimmedRoleAssets];
};
