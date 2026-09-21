import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import type {
    BatchPreviewSession,
    GeneratedImage as GeneratedImageType,
    ResultPart,
} from '../types';
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
            setActiveBatchPreviewSession({
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
            });
        },
        [setActiveBatchPreviewSession],
    );

    const handleBatchPreviewTileUpdate = useCallback(
        ({ sessionId, tile }: { sessionId: string; tile: BatchPreviewSession['tiles'][number] }) => {
            setActiveBatchPreviewSession((previousSession) => {
                if (!previousSession || previousSession.id !== sessionId) {
                    return previousSession;
                }

                const nextSession = {
                    ...previousSession,
                    tiles: previousSession.tiles.map((candidateTile) =>
                        candidateTile.slotIndex === tile.slotIndex ? { ...candidateTile, ...tile } : candidateTile,
                    ),
                };
                activeBatchPreviewSessionRef.current = nextSession;
                return nextSession;
            });

            if (tile.status === 'ready') {
                const stagePreviewUrl = tile.stagePreviewUrl || tile.previewUrl;
                const currentSession = activeBatchPreviewSessionRef.current;
                if (stagePreviewUrl && currentSession?.id === sessionId && !currentSession.didUserInspectExistingImage) {
                    setGeneratedImageUrls([stagePreviewUrl]);
                    setSelectedImageIndex(0);
                }
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
            setActiveBatchPreviewSession((previousSession) => (previousSession?.id === sessionId ? null : previousSession));
        },
        [setActiveBatchPreviewSession],
    );

    const handleBatchPreviewTileSelect = useCallback(
        (tile: BatchPreviewSession['tiles'][number]) => {
            if (tile.status !== 'ready') {
                return;
            }

            const stagePreviewUrl = tile.stagePreviewUrl || tile.previewUrl;
            if (!stagePreviewUrl) {
                return;
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
