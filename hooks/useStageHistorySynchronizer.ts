import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
    GeneratedImage as GeneratedImageType,
    ImageSidecarMetadata,
    ResultArtifacts,
    StageAsset,
    StageAssetRole,
    StageErrorState,
    TurnLineageAction,
} from '../types';
import { buildStageErrorState } from '../utils/generationFailure';
import { buildSavedImageLoadUrl, loadImageMetadata } from '../utils/imageSaveUtils';
import { createImageSidecarMetadataState, normalizeImageSidecarMetadata } from '../utils/imageSidecarMetadata';

type UseStageHistorySynchronizerArgs = {
    currentStageAsset: StageAsset | null;
    selectedHistoryId: string | null;
    getHistoryTurnById: (historyId?: string | null) => GeneratedImageType | null;
    setHistory: React.Dispatch<React.SetStateAction<GeneratedImageType[]>>;
    setGeneratedImageUrls: React.Dispatch<React.SetStateAction<string[]>>;
    setSelectedImageIndex: React.Dispatch<React.SetStateAction<number>>;
    setSelectedHistoryId: React.Dispatch<React.SetStateAction<string | null>>;
    setSelectedMetadata: React.Dispatch<React.SetStateAction<Record<string, unknown> | null>>;
    setError: React.Dispatch<React.SetStateAction<StageErrorState | null>>;
    buildResultArtifacts: (item: GeneratedImageType) => ResultArtifacts;
    applySelectedResultArtifacts: (artifacts: ResultArtifacts | null) => void;
    upsertViewerStageSource: (input: {
        origin: 'history' | 'generated' | 'upload' | 'sketch' | 'editor';
        url: string;
        savedFilename?: string;
        sourceHistoryId?: string;
        lineageAction?: TurnLineageAction;
    }) => void;
    clearAssetRoles: (roles: StageAssetRole[]) => void;
    t: (key: string) => string;
};

export interface UseStageHistorySynchronizerReturn {
    markHistoryItemOpened: (historyId: string) => void;
    getBatchVisualSlotIndex: (item: GeneratedImageType) => number;
    silentlyShowHistoryItemOnStage: (item: GeneratedImageType) => void;
    silentlyShowFailedHistoryItemOnStage: (item: GeneratedImageType) => void;
    currentViewedCompletedHistoryId: string | null;
    currentViewedCompletedHistoryItem: GeneratedImageType | null;
    currentViewedCompletedHistoryMetadata: ImageSidecarMetadata | null;
}

export function useStageHistorySynchronizer({
    currentStageAsset,
    selectedHistoryId,
    getHistoryTurnById,
    setHistory,
    setGeneratedImageUrls,
    setSelectedImageIndex,
    setSelectedHistoryId,
    setSelectedMetadata,
    setError,
    buildResultArtifacts,
    applySelectedResultArtifacts,
    upsertViewerStageSource,
    clearAssetRoles,
    t,
}: UseStageHistorySynchronizerArgs): UseStageHistorySynchronizerReturn {
    const markHistoryItemOpened = useCallback(
        (historyId: string) => {
            setHistory((previousHistory) =>
                previousHistory.map((historyItem) =>
                    historyItem.id === historyId && historyItem.status === 'success' && historyItem.openedAt == null
                        ? {
                              ...historyItem,
                              openedAt: Date.now(),
                          }
                        : historyItem,
                ),
            );
        },
        [setHistory],
    );

    const getBatchVisualSlotIndex = useCallback((item: GeneratedImageType) => {
        const candidateSlotIndex = item.metadata?.batchResultIndex;
        return typeof candidateSlotIndex === 'number' && Number.isFinite(candidateSlotIndex) ? candidateSlotIndex : -1;
    }, []);

    const silentlyShowHistoryItemOnStage = useCallback(
        (item: GeneratedImageType) => {
            const stageUrl = item.savedFilename ? buildSavedImageLoadUrl(item.savedFilename) : item.url;
            if (!stageUrl) {
                return;
            }

            setGeneratedImageUrls([stageUrl]);
            setSelectedImageIndex(0);
            setSelectedHistoryId(item.id);
            applySelectedResultArtifacts(buildResultArtifacts(item));
            setError(null);
            upsertViewerStageSource({
                origin: 'history',
                url: stageUrl,
                savedFilename: item.savedFilename,
                sourceHistoryId: item.id,
                lineageAction: item.lineageAction,
            });
        },
        [
            applySelectedResultArtifacts,
            buildResultArtifacts,
            setError,
            setGeneratedImageUrls,
            setSelectedHistoryId,
            setSelectedImageIndex,
            upsertViewerStageSource,
        ],
    );

    const silentlyShowFailedHistoryItemOnStage = useCallback(
        (item: GeneratedImageType) => {
            setGeneratedImageUrls([]);
            setSelectedImageIndex(0);
            setSelectedHistoryId(item.id);
            applySelectedResultArtifacts(buildResultArtifacts(item));
            setError(buildStageErrorState(t, item.failure, item.error || t('statusFailed'), item.failureContext));
            clearAssetRoles(['stage-source']);
        },
        [
            applySelectedResultArtifacts,
            buildResultArtifacts,
            clearAssetRoles,
            setError,
            setGeneratedImageUrls,
            setSelectedHistoryId,
            setSelectedImageIndex,
            t,
        ],
    );

    useEffect(() => {
        setError((currentError) => {
            if (!currentError) {
                return currentError;
            }

            const candidateHistoryId = currentStageAsset?.sourceHistoryId || selectedHistoryId;
            const candidateHistoryItem = candidateHistoryId ? getHistoryTurnById(candidateHistoryId) : null;
            if (candidateHistoryItem?.status === 'failed') {
                return buildStageErrorState(
                    t,
                    candidateHistoryItem.failure,
                    candidateHistoryItem.error || t('statusFailed'),
                    candidateHistoryItem.failureContext,
                );
            }

            return buildStageErrorState(t, currentError.failure, currentError.rawError, currentError.displayContext);
        });
    }, [currentStageAsset?.sourceHistoryId, getHistoryTurnById, selectedHistoryId, setError, t]);

    const currentViewedCompletedHistoryId = useMemo(() => {
        const candidateHistoryId = currentStageAsset?.sourceHistoryId || selectedHistoryId;
        const candidateHistoryItem = getHistoryTurnById(candidateHistoryId);

        return candidateHistoryItem?.status === 'success' ? candidateHistoryItem.id : null;
    }, [currentStageAsset?.sourceHistoryId, getHistoryTurnById, selectedHistoryId]);

    const currentViewedCompletedHistoryItem = useMemo(
        () => (currentViewedCompletedHistoryId ? getHistoryTurnById(currentViewedCompletedHistoryId) : null),
        [currentViewedCompletedHistoryId, getHistoryTurnById],
    );

    const currentViewedCompletedHistoryMetadata = useMemo(() => {
        const metadata = currentViewedCompletedHistoryItem?.metadata;
        return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
            ? normalizeImageSidecarMetadata(metadata)
            : null;
    }, [currentViewedCompletedHistoryItem]);

    const previousViewedCompletedHistoryIdRef = useRef<string | null>(currentViewedCompletedHistoryId);
    const hydratedSidecarHistoryIdRef = useRef<string | null>(null);

    useEffect(() => {
        const previousViewedCompletedHistoryId = previousViewedCompletedHistoryIdRef.current;

        if (previousViewedCompletedHistoryId && previousViewedCompletedHistoryId !== currentViewedCompletedHistoryId) {
            const previousHistoryItem = getHistoryTurnById(previousViewedCompletedHistoryId);
            if (previousHistoryItem?.status === 'success' && previousHistoryItem.openedAt == null) {
                markHistoryItemOpened(previousViewedCompletedHistoryId);
            }
        }

        previousViewedCompletedHistoryIdRef.current = currentViewedCompletedHistoryId;
    }, [currentViewedCompletedHistoryId, getHistoryTurnById, markHistoryItemOpened]);

    useEffect(() => {
        let isDisposed = false;

        if (!currentViewedCompletedHistoryItem) {
            if (hydratedSidecarHistoryIdRef.current) {
                hydratedSidecarHistoryIdRef.current = null;
                setSelectedMetadata(null);
            }
            return;
        }

        hydratedSidecarHistoryIdRef.current = currentViewedCompletedHistoryItem.id;

        if (!currentViewedCompletedHistoryItem.savedFilename) {
            setSelectedMetadata(currentViewedCompletedHistoryMetadata || createImageSidecarMetadataState('missing'));
            return;
        }

        if (currentViewedCompletedHistoryMetadata) {
            setSelectedMetadata(currentViewedCompletedHistoryMetadata);
        } else {
            setSelectedMetadata(createImageSidecarMetadataState('loading'));
        }

        void loadImageMetadata(currentViewedCompletedHistoryItem.savedFilename).then((metadata) => {
            if (isDisposed || hydratedSidecarHistoryIdRef.current !== currentViewedCompletedHistoryItem.id) {
                return;
            }

            const mergedMetadata = normalizeImageSidecarMetadata(
                currentViewedCompletedHistoryMetadata || metadata
                    ? {
                          ...(currentViewedCompletedHistoryMetadata || {}),
                          ...(metadata || {}),
                      }
                    : null,
            );

            setSelectedMetadata(mergedMetadata || createImageSidecarMetadataState('missing'));
        });

        return () => {
            isDisposed = true;
        };
    }, [currentViewedCompletedHistoryItem, currentViewedCompletedHistoryMetadata, setSelectedMetadata]);

    return {
        markHistoryItemOpened,
        getBatchVisualSlotIndex,
        silentlyShowHistoryItemOnStage,
        silentlyShowFailedHistoryItemOnStage,
        currentViewedCompletedHistoryId,
        currentViewedCompletedHistoryItem,
        currentViewedCompletedHistoryMetadata,
    };
}
