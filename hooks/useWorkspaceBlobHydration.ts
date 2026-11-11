import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GeneratedImage, ResultPart, StageAsset } from '../types';
import { getWorkspaceBlobs, isIndexedDbAvailable } from '../utils/workspaceBlobStore';

type UseWorkspaceBlobHydrationArgs = {
    stagedAssets: StageAsset[];
    setStagedAssets: React.Dispatch<React.SetStateAction<StageAsset[]>>;
    history: GeneratedImage[];
    setHistory: React.Dispatch<React.SetStateAction<GeneratedImage[]>>;
    selectedHistoryId: string | null;
    generatedImageUrls: string[];
    setGeneratedImageUrls: React.Dispatch<React.SetStateAction<string[]>>;
};

export interface UseWorkspaceBlobHydrationReturn {
    isHydratingBlobs: boolean;
    cancelPendingBlobHydration: () => void;
}

const collectUnhydratedResultPartKeys = (parts: ResultPart[] | undefined, target: Set<string>): void => {
    if (!Array.isArray(parts)) {
        return;
    }

    for (const part of parts) {
        if (
            (part.kind === 'thought-image' || part.kind === 'output-image') &&
            typeof part.blobKey === 'string' &&
            part.blobKey &&
            !part.imageUrl
        ) {
            target.add(part.blobKey);
        }
    }
};

export function useWorkspaceBlobHydration({
    stagedAssets,
    setStagedAssets,
    history,
    setHistory,
    selectedHistoryId,
    generatedImageUrls,
    setGeneratedImageUrls,
}: UseWorkspaceBlobHydrationArgs): UseWorkspaceBlobHydrationReturn {
    const hydrationEpochRef = useRef(0);
    const attemptedBlobKeysRef = useRef<Set<string>>(new Set());

    const pendingBlobKeys = useMemo(() => {
        if (!isIndexedDbAvailable()) {
            return [];
        }

        const keys = new Set<string>();
        for (const asset of stagedAssets) {
            if (asset.blobKey && !asset.url && !attemptedBlobKeysRef.current.has(asset.blobKey)) {
                keys.add(asset.blobKey);
            }
        }

        for (const item of history) {
            if (item.blobKey && !item.url && !attemptedBlobKeysRef.current.has(item.blobKey)) {
                keys.add(item.blobKey);
            }
            const partKeys = new Set<string>();
            collectUnhydratedResultPartKeys(item.resultParts, partKeys);
            for (const partKey of partKeys) {
                if (!attemptedBlobKeysRef.current.has(partKey)) {
                    keys.add(partKey);
                }
            }
        }

        return Array.from(keys);
    }, [history, stagedAssets]);

    const [isHydratingBlobs, setIsHydratingBlobs] = useState<boolean>(() => pendingBlobKeys.length > 0);

    const cancelPendingBlobHydration = useCallback(() => {
        hydrationEpochRef.current += 1;
        attemptedBlobKeysRef.current.clear();
        setIsHydratingBlobs(false);
    }, []);

    useEffect(() => {
        if (pendingBlobKeys.length === 0) {
            setIsHydratingBlobs(false);
            return;
        }

        const requestEpoch = hydrationEpochRef.current + 1;
        hydrationEpochRef.current = requestEpoch;
        for (const key of pendingBlobKeys) {
            attemptedBlobKeysRef.current.add(key);
        }
        setIsHydratingBlobs(true);

        let isCancelled = false;

        void getWorkspaceBlobs(pendingBlobKeys)
            .then((resolvedMap) => {
                if (isCancelled || hydrationEpochRef.current !== requestEpoch) {
                    return;
                }

                if (resolvedMap.size > 0) {
                    setStagedAssets((prevAssets) => {
                        let didChange = false;
                        const nextAssets = prevAssets.map((asset) => {
                            if (asset.blobKey && !asset.url) {
                                const hydratedUrl = resolvedMap.get(asset.blobKey);
                                if (hydratedUrl) {
                                    didChange = true;
                                    return {
                                        ...asset,
                                        url: hydratedUrl,
                                    };
                                }
                            }
                            return asset;
                        });
                        return didChange ? nextAssets : prevAssets;
                    });

                    setHistory((prevHistory) => {
                        let didChange = false;
                        const nextHistory = prevHistory.map((item) => {
                            let itemChanged = false;
                            let nextUrl = item.url;
                            if (item.blobKey && !item.url) {
                                const hydratedUrl = resolvedMap.get(item.blobKey);
                                if (hydratedUrl) {
                                    nextUrl = hydratedUrl;
                                    itemChanged = true;
                                }
                            }

                            let nextResultParts = item.resultParts;
                            if (Array.isArray(item.resultParts)) {
                                let partsChanged = false;
                                const updatedParts = item.resultParts.map((part) => {
                                    if (
                                        (part.kind === 'thought-image' || part.kind === 'output-image') &&
                                        part.blobKey &&
                                        !part.imageUrl
                                    ) {
                                        const hydratedPartUrl = resolvedMap.get(part.blobKey);
                                        if (hydratedPartUrl) {
                                            partsChanged = true;
                                            return {
                                                ...part,
                                                imageUrl: hydratedPartUrl,
                                            };
                                        }
                                    }
                                    return part;
                                });
                                if (partsChanged) {
                                    nextResultParts = updatedParts;
                                    itemChanged = true;
                                }
                            }

                            if (!itemChanged) {
                                return item;
                            }

                            didChange = true;
                            return {
                                ...item,
                                url: nextUrl,
                                ...(nextResultParts !== undefined ? { resultParts: nextResultParts } : {}),
                            };
                        });

                        return didChange ? nextHistory : prevHistory;
                    });

                    if (generatedImageUrls.filter(Boolean).length === 0) {
                        const stageSourceAsset = stagedAssets.find((asset) => asset.role === 'stage-source');
                        const selectedItem = selectedHistoryId
                            ? history.find((item) => item.id === selectedHistoryId)
                            : null;
                        const candidateKey = stageSourceAsset?.blobKey || selectedItem?.blobKey || null;
                        const hydratedStageUrl = candidateKey ? resolvedMap.get(candidateKey) : null;
                        if (hydratedStageUrl) {
                            setGeneratedImageUrls((prevUrls) =>
                                prevUrls.filter(Boolean).length === 0 ? [hydratedStageUrl] : prevUrls,
                            );
                        }
                    }
                }
            })
            .finally(() => {
                if (!isCancelled && hydrationEpochRef.current === requestEpoch) {
                    setIsHydratingBlobs(false);
                }
            });

        return () => {
            isCancelled = true;
        };
    }, [
        generatedImageUrls,
        history,
        pendingBlobKeys,
        selectedHistoryId,
        setGeneratedImageUrls,
        setHistory,
        setStagedAssets,
        stagedAssets,
    ]);

    return {
        isHydratingBlobs,
        cancelPendingBlobHydration,
    };
}
