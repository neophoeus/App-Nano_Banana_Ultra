import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import type { BatchPreviewSession, GeneratedImage as GeneratedImageType, ResultPart } from '../types';
import type { ActiveLiveProgressSession } from './useWorkspaceShellOwnerState';
import type { GenerationLiveProgressEvent } from '../services/geminiService';

export const buildResultPartIdentityKey = (part: ResultPart) =>
    'text' in part
        ? `${part.kind}:${part.sequence}:${part.text}`
        : `${part.kind}:${part.sequence}:${part.mimeType}:${part.imageUrl}`;

export interface UseBatchPreviewSessionOptions {
    activeBatchPreviewSession: BatchPreviewSession | null;
    setActiveBatchPreviewSession: Dispatch<SetStateAction<BatchPreviewSession | null>>;
    activeLiveProgressSession: ActiveLiveProgressSession | null;
    setActiveLiveProgressSession: Dispatch<SetStateAction<ActiveLiveProgressSession | null>>;
    setGeneratedImageUrls: (urls: string[]) => void;
    setSelectedImageIndex: (index: number) => void;
    clearAssetRoles: (roles: Array<'object' | 'character' | 'stage-source'>) => void;
    resetSelectedOutputState: () => void;
    setError: (error: any) => void;
    getBatchVisualSlotIndex: (item: GeneratedImageType) => number;
    silentlyShowHistoryItemOnStage: (item: GeneratedImageType) => void;
    silentlyShowFailedHistoryItemOnStage: (item: GeneratedImageType) => void;
}

export function useBatchPreviewSession(options: UseBatchPreviewSessionOptions) {
    const {
        activeBatchPreviewSession,
        setActiveBatchPreviewSession,
        setActiveLiveProgressSession,
        setGeneratedImageUrls,
        setSelectedImageIndex,
        clearAssetRoles,
        resetSelectedOutputState,
        setError,
        getBatchVisualSlotIndex,
        silentlyShowHistoryItemOnStage,
        silentlyShowFailedHistoryItemOnStage,
    } = options;

    const activeBatchPreviewSessionRef = useRef<BatchPreviewSession | null>(activeBatchPreviewSession);

    useEffect(() => {
        activeBatchPreviewSessionRef.current = activeBatchPreviewSession;
    }, [activeBatchPreviewSession]);

    const handleBatchPreviewStart = useCallback(
        ({ sessionId, batchSize }: { sessionId: string; batchSize: number }) => {
            const nextSession: BatchPreviewSession = {
                id: sessionId,
                batchSize,
                didUserInspectExistingImage: false,
                selectedPreviewSlotIndex: null,
                tiles: Array.from({ length: batchSize }, (_, slotIndex) => ({
                    id: `${sessionId}-${slotIndex}`,
                    slotIndex,
                    status: 'waiting',
                    previewUrl: null,
                    stagePreviewUrl: null,
                    error: null,
                })),
            };
            activeBatchPreviewSessionRef.current = nextSession;
            setActiveBatchPreviewSession(nextSession);
        },
        [setActiveBatchPreviewSession],
    );

    const handleBatchPreviewTileUpdate = useCallback(
        ({ sessionId, tile }: { sessionId: string; tile: BatchPreviewSession['tiles'][number] }) => {
            let stageUrlToPreview: string | null = null;

            setActiveBatchPreviewSession((previousSession) => {
                const baseSession =
                    previousSession && previousSession.id === sessionId
                        ? previousSession
                        : activeBatchPreviewSessionRef.current?.id === sessionId
                          ? activeBatchPreviewSessionRef.current
                          : null;

                if (!baseSession) {
                    return previousSession;
                }

                const nextTiles = baseSession.tiles.map((candidateTile) => {
                    if (candidateTile.slotIndex !== tile.slotIndex) {
                        return candidateTile;
                    }
                    const mergedPreviewUrl = tile.previewUrl ?? candidateTile.previewUrl;
                    const mergedStagePreviewUrl =
                        tile.stagePreviewUrl ??
                        candidateTile.stagePreviewUrl ??
                        tile.previewUrl ??
                        candidateTile.previewUrl;

                    return {
                        ...candidateTile,
                        ...tile,
                        previewUrl: mergedPreviewUrl,
                        stagePreviewUrl: mergedStagePreviewUrl,
                    };
                });

                const updatedTile = nextTiles.find((candidateTile) => candidateTile.slotIndex === tile.slotIndex);
                if (
                    updatedTile &&
                    (tile.status === 'ready' || tile.status === 'committed') &&
                    !baseSession.didUserInspectExistingImage
                ) {
                    const resolvedStageUrl = updatedTile.stagePreviewUrl || updatedTile.previewUrl;
                    if (resolvedStageUrl) {
                        stageUrlToPreview = resolvedStageUrl;
                    }
                }

                const nextSession: BatchPreviewSession = {
                    ...baseSession,
                    tiles: nextTiles,
                };
                activeBatchPreviewSessionRef.current = nextSession;
                return nextSession;
            });

            // Synchronously update activeBatchPreviewSessionRef.current for non-batched/immediate readers
            const currentSession = activeBatchPreviewSessionRef.current;
            if (currentSession && currentSession.id === sessionId) {
                const nextTiles = currentSession.tiles.map((candidateTile) => {
                    if (candidateTile.slotIndex !== tile.slotIndex) {
                        return candidateTile;
                    }
                    const mergedPreviewUrl = tile.previewUrl ?? candidateTile.previewUrl;
                    const mergedStagePreviewUrl =
                        tile.stagePreviewUrl ??
                        candidateTile.stagePreviewUrl ??
                        tile.previewUrl ??
                        candidateTile.previewUrl;

                    return {
                        ...candidateTile,
                        ...tile,
                        previewUrl: mergedPreviewUrl,
                        stagePreviewUrl: mergedStagePreviewUrl,
                    };
                });
                const nextSession: BatchPreviewSession = {
                    ...currentSession,
                    tiles: nextTiles,
                };
                activeBatchPreviewSessionRef.current = nextSession;

                if (
                    (tile.status === 'ready' || tile.status === 'committed') &&
                    !currentSession.didUserInspectExistingImage
                ) {
                    const candidateStageUrl =
                        tile.stagePreviewUrl ||
                        tile.previewUrl ||
                        nextTiles.find((t) => t.slotIndex === tile.slotIndex)?.stagePreviewUrl;
                    if (candidateStageUrl) {
                        stageUrlToPreview = candidateStageUrl;
                    }
                }
            }

            if (stageUrlToPreview) {
                setGeneratedImageUrls([stageUrlToPreview]);
                setSelectedImageIndex(0);
            }
        },
        [setActiveBatchPreviewSession, setGeneratedImageUrls, setSelectedImageIndex],
    );

    const handleBatchPreviewComplete = useCallback(
        ({ sessionId, historyItems }: { sessionId: string; historyItems: GeneratedImageType[] }) => {
            const currentPreviewSession = activeBatchPreviewSessionRef.current;
            if (!currentPreviewSession || currentPreviewSession.id !== sessionId) {
                return;
            }

            activeBatchPreviewSessionRef.current = null;
            setActiveBatchPreviewSession(null);

            if (currentPreviewSession.didUserInspectExistingImage) {
                const selectedPreviewSlotIndex = currentPreviewSession.selectedPreviewSlotIndex;
                if (typeof selectedPreviewSlotIndex === 'number') {
                    const selectedCommittedItem = historyItems.find(
                        (historyItem) =>
                            historyItem.status === 'success' &&
                            getBatchVisualSlotIndex(historyItem) === selectedPreviewSlotIndex &&
                            (historyItem.savedFilename || historyItem.url),
                    );

                    if (selectedCommittedItem) {
                        silentlyShowHistoryItemOnStage(selectedCommittedItem);
                    }
                }

                return;
            }

            const orderedBatchHistoryItems = [...historyItems].sort(
                (leftItem, rightItem) => getBatchVisualSlotIndex(rightItem) - getBatchVisualSlotIndex(leftItem),
            );
            const autoOpenHistoryItem =
                orderedBatchHistoryItems.find(
                    (historyItem) => historyItem.status === 'success' && (historyItem.savedFilename || historyItem.url),
                ) || orderedBatchHistoryItems[0];

            if (autoOpenHistoryItem) {
                if (autoOpenHistoryItem.status === 'failed') {
                    silentlyShowFailedHistoryItemOnStage(autoOpenHistoryItem);
                } else {
                    silentlyShowHistoryItemOnStage(autoOpenHistoryItem);
                }
            }
        },
        [
            getBatchVisualSlotIndex,
            setActiveBatchPreviewSession,
            silentlyShowFailedHistoryItemOnStage,
            silentlyShowHistoryItemOnStage,
        ],
    );

    const handleBatchPreviewClear = useCallback(
        ({ sessionId }: { sessionId: string }) => {
            if (activeBatchPreviewSessionRef.current?.id === sessionId) {
                activeBatchPreviewSessionRef.current = null;
            }
            setActiveBatchPreviewSession((previousSession) =>
                previousSession?.id === sessionId ? null : previousSession,
            );
        },
        [setActiveBatchPreviewSession],
    );

    const handleBatchPreviewTileSelect = useCallback(
        (tile: BatchPreviewSession['tiles'][number]) => {
            if (tile.status !== 'ready' && tile.status !== 'committed') {
                return;
            }

            const stagePreviewUrl = tile.stagePreviewUrl || tile.previewUrl;
            if (!stagePreviewUrl) {
                return;
            }

            if (activeBatchPreviewSessionRef.current) {
                activeBatchPreviewSessionRef.current = {
                    ...activeBatchPreviewSessionRef.current,
                    didUserInspectExistingImage: true,
                    selectedPreviewSlotIndex: tile.slotIndex,
                };
            }

            setActiveBatchPreviewSession((previousSession) =>
                previousSession
                    ? {
                          ...previousSession,
                          didUserInspectExistingImage: true,
                          selectedPreviewSlotIndex: tile.slotIndex,
                      }
                    : previousSession,
            );
            setGeneratedImageUrls([stagePreviewUrl]);
            setSelectedImageIndex(0);
            clearAssetRoles(['stage-source']);
            resetSelectedOutputState();
            setError(null);
        },
        [
            clearAssetRoles,
            resetSelectedOutputState,
            setActiveBatchPreviewSession,
            setError,
            setGeneratedImageUrls,
            setSelectedImageIndex,
        ],
    );

    const handleLiveProgressReset = useCallback(() => {
        setActiveLiveProgressSession(null);
    }, [setActiveLiveProgressSession]);

    const handleLiveProgressEvent = useCallback(
        (event: GenerationLiveProgressEvent) => {
            const batchSessionId = event.batchSessionId || event.sessionId;
            const slotIndex = event.slotIndex ?? 0;

            setActiveLiveProgressSession((previousSession) => {
                const nextSession =
                    previousSession && previousSession.batchSessionId === batchSessionId
                        ? previousSession
                        : {
                              batchSessionId,
                              startedAtMs: Date.now(),
                              slots: {},
                          };

                if (event.type === 'start') {
                    return {
                        ...nextSession,
                        slots: {
                            ...nextSession.slots,
                            [slotIndex]: {
                                slotIndex,
                                sessionId: event.sessionId,
                                startedAtMs: Date.now(),
                                resultParts: [],
                                summary: null,
                            },
                        },
                    };
                }

                const previousSlot = nextSession.slots[slotIndex];
                const nextSlot =
                    previousSlot && previousSlot.sessionId === event.sessionId
                        ? previousSlot
                        : {
                              slotIndex,
                              sessionId: event.sessionId,
                              startedAtMs: previousSlot?.startedAtMs ?? Date.now(),
                              resultParts: previousSlot?.resultParts || [],
                              summary: previousSlot?.summary || null,
                          };

                if (event.type === 'summary') {
                    return {
                        ...nextSession,
                        slots: {
                            ...nextSession.slots,
                            [slotIndex]: {
                                ...nextSlot,
                                summary: event.summary,
                            },
                        },
                    };
                }
                const partKey = buildResultPartIdentityKey(event.part);
                const alreadyIncluded = nextSlot.resultParts.some(
                    (candidate) => buildResultPartIdentityKey(candidate) === partKey,
                );

                if (alreadyIncluded) {
                    return nextSession;
                }

                return {
                    ...nextSession,
                    slots: {
                        ...nextSession.slots,
                        [slotIndex]: {
                            ...nextSlot,
                            resultParts: [...nextSlot.resultParts, event.part].sort(
                                (left, right) => left.sequence - right.sequence,
                            ),
                        },
                    },
                };
            });
        },
        [setActiveLiveProgressSession],
    );

    const handleHistorySelectionDuringGeneration = useCallback(() => {
        if (activeBatchPreviewSessionRef.current) {
            activeBatchPreviewSessionRef.current = {
                ...activeBatchPreviewSessionRef.current,
                didUserInspectExistingImage: true,
                selectedPreviewSlotIndex: null,
            };
        }
        setActiveBatchPreviewSession((previousSession) =>
            previousSession
                ? {
                      ...previousSession,
                      didUserInspectExistingImage: true,
                      selectedPreviewSlotIndex: null,
                  }
                : previousSession,
        );
    }, [setActiveBatchPreviewSession]);

    return {
        activeBatchPreviewSessionRef,
        handleBatchPreviewStart,
        handleBatchPreviewTileUpdate,
        handleBatchPreviewComplete,
        handleBatchPreviewClear,
        handleBatchPreviewTileSelect,
        handleLiveProgressReset,
        handleLiveProgressEvent,
        handleHistorySelectionDuringGeneration,
    };
}
