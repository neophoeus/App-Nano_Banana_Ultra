import { useMemo } from 'react';
import type { WorkspaceProgressThoughtEntry } from '../components/WorkspaceProgressDetailPanel';
import { GeneratedImage as GeneratedImageType, ResultPart, ResultTextPart, WorkspaceSessionState } from '../types';

type ActiveLiveProgressSlotLike = {
    slotIndex: number;
    startedAtMs: number;
    resultParts: ResultPart[];
};

type ActiveLiveProgressSessionLike = {
    batchSessionId: string;
    slots: Record<number, ActiveLiveProgressSlotLike>;
};

type HistoryBranchLike = {
    turns: GeneratedImageType[];
} | null;

type UseWorkspaceProgressThoughtsArgs = {
    selectedHistoryId: string | null;
    getHistoryTurnById: (historyId?: string | null) => GeneratedImageType | null;
    selectedResultParts: ResultPart[] | null;
    selectedThoughts: string | null;
    effectiveResultParts: ResultPart[] | null;
    effectiveThoughts: string | null;
    workspaceSession: WorkspaceSessionState;
    sessionUpdatedLabel: string;
    isGenerating: boolean;
    activeLiveProgressSession: ActiveLiveProgressSessionLike | null;
    prompt: string;
    history: GeneratedImageType[];
    currentStageBranchSummary: HistoryBranchLike;
    activeBranchSummary: HistoryBranchLike;
    currentStageSourceTurn: GeneratedImageType | null;
    getShortTurnId: (historyId?: string | null) => string;
    groundingQueries: string[];
    selectedSourcesCount: number;
    selectedSupportBundlesCount: number;
    searchEntryPointRenderedContent: string | null;
    effectiveSessionHints: Record<string, unknown> | null;
    t: (key: string) => string;
};

const isThoughtResultPart = (part: ResultPart) => part.kind === 'thought-text' || part.kind === 'thought-image';

const getThoughtResultParts = (parts?: ResultPart[] | null): ResultPart[] =>
    (parts || []).filter(isThoughtResultPart).sort((left, right) => left.sequence - right.sequence);

const buildThoughtSummaryFromParts = (parts: ResultPart[], fallbackLabel: string) => {
    const latestThoughtTextPart = [...parts]
        .reverse()
        .find((part): part is ResultTextPart => part.kind === 'thought-text');

    if (latestThoughtTextPart?.text.trim()) {
        return latestThoughtTextPart.text.trim();
    }

    return parts.some((part) => part.kind === 'thought-image') ? fallbackLabel : '';
};

const formatTimeLabel = (timestampMs: number) =>
    new Date(timestampMs).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
    });

const dedupeEntriesById = (entries: WorkspaceProgressThoughtEntry[]) =>
    entries.filter((entry, index, allEntries) => allEntries.findIndex((candidate) => candidate.id === entry.id) === index);

export function useWorkspaceProgressThoughts({
    selectedHistoryId,
    getHistoryTurnById,
    selectedResultParts,
    selectedThoughts,
    effectiveResultParts,
    effectiveThoughts,
    workspaceSession,
    sessionUpdatedLabel,
    isGenerating,
    activeLiveProgressSession,
    prompt,
    history,
    currentStageBranchSummary,
    activeBranchSummary,
    currentStageSourceTurn,
    getShortTurnId,
    groundingQueries,
    selectedSourcesCount,
    selectedSupportBundlesCount,
    searchEntryPointRenderedContent,
    effectiveSessionHints,
    t,
}: UseWorkspaceProgressThoughtsArgs) {
    const effectiveThoughtParts = useMemo(() => getThoughtResultParts(effectiveResultParts), [effectiveResultParts]);
    const selectedProgressHistoryItem = useMemo(
        () => (selectedHistoryId ? getHistoryTurnById(selectedHistoryId) : null),
        [getHistoryTurnById, selectedHistoryId],
    );
    const selectedProgressThoughtParts = useMemo(() => {
        const selectedThoughtParts = getThoughtResultParts(selectedResultParts);

        if (selectedThoughtParts.length > 0) {
            return selectedThoughtParts;
        }

        return getThoughtResultParts(selectedProgressHistoryItem?.resultParts);
    }, [selectedProgressHistoryItem, selectedResultParts]);
    const selectedProgressThoughtsText = useMemo(() => {
        const trimmedSelectedThoughts = selectedThoughts?.trim();
        if (trimmedSelectedThoughts) {
            return trimmedSelectedThoughts;
        }

        const trimmedHistoryThoughts = selectedProgressHistoryItem?.thoughts?.trim();
        if (trimmedHistoryThoughts) {
            return trimmedHistoryThoughts;
        }

        return buildThoughtSummaryFromParts(selectedProgressThoughtParts, t('workspaceViewerThoughts'));
    }, [selectedProgressHistoryItem, selectedProgressThoughtParts, selectedThoughts, t]);
    const selectedProgressEntry = useMemo<WorkspaceProgressThoughtEntry | null>(() => {
        if (!selectedProgressHistoryItem) {
            return null;
        }

        if (!selectedProgressThoughtsText && selectedProgressThoughtParts.length === 0) {
            return null;
        }

        const createdAtMs = selectedProgressHistoryItem.createdAt ?? workspaceSession.updatedAt ?? null;

        return {
            id: selectedProgressHistoryItem.id,
            shortId: getShortTurnId(selectedProgressHistoryItem.id),
            prompt: selectedProgressHistoryItem.prompt || null,
            thoughts: selectedProgressThoughtsText,
            resultParts: selectedProgressThoughtParts,
            createdAtMs,
            createdAtLabel: createdAtMs != null ? formatTimeLabel(createdAtMs) : sessionUpdatedLabel,
            isFailed: selectedProgressHistoryItem.status === 'failed',
        } satisfies WorkspaceProgressThoughtEntry;
    }, [
        getShortTurnId,
        selectedProgressHistoryItem,
        selectedProgressThoughtParts,
        selectedProgressThoughtsText,
        sessionUpdatedLabel,
        workspaceSession.updatedAt,
    ]);
    const liveProgressThoughtEntries = useMemo<WorkspaceProgressThoughtEntry[]>(() => {
        if (!isGenerating || !activeLiveProgressSession) {
            return [];
        }

        return Object.values(activeLiveProgressSession.slots)
            .map((slot) => {
                const slotThoughtParts = getThoughtResultParts(slot.resultParts);
                if (slotThoughtParts.length === 0) {
                    return null;
                }

                return {
                    id: `live-${activeLiveProgressSession.batchSessionId}-${slot.slotIndex}`,
                    shortId: `slot-${String(slot.slotIndex + 1).padStart(2, '0')}`,
                    prompt: prompt || null,
                    thoughts:
                        buildThoughtSummaryFromParts(slotThoughtParts, t('workspaceViewerThoughts')) ||
                        t('workspaceViewerThoughts'),
                    resultParts: slotThoughtParts,
                    createdAtMs: slot.startedAtMs,
                    createdAtLabel: formatTimeLabel(slot.startedAtMs),
                    slotIndex: slot.slotIndex,
                    slotLabel: `#${slot.slotIndex + 1}`,
                    isLive: true,
                } satisfies WorkspaceProgressThoughtEntry;
            })
            .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
    }, [activeLiveProgressSession, isGenerating, prompt, t]);
    const liveProgressThoughtsText = useMemo(
        () => liveProgressThoughtEntries[0]?.thoughts || '',
        [liveProgressThoughtEntries],
    );
    const effectiveProgressThoughtsText = useMemo(() => {
        const trimmedEffectiveThoughts = effectiveThoughts?.trim();
        if (trimmedEffectiveThoughts) {
            return trimmedEffectiveThoughts;
        }

        return buildThoughtSummaryFromParts(effectiveThoughtParts, t('workspaceViewerThoughts'));
    }, [effectiveThoughtParts, effectiveThoughts, t]);
    const progressThoughtsSummaryText = useMemo(
        () => liveProgressThoughtsText || selectedProgressThoughtsText || effectiveProgressThoughtsText,
        [effectiveProgressThoughtsText, liveProgressThoughtsText, selectedProgressThoughtsText],
    );
    const progressHistoryThoughtTurns = useMemo<GeneratedImageType[]>(() => {
        const hasThoughtArtifacts = (turn: GeneratedImageType) =>
            Boolean(turn.thoughts?.trim()) || getThoughtResultParts(turn.resultParts).length > 0;

        const relevantHistoryTurns =
            workspaceSession.conversationTurnIds.length > 0
                ? workspaceSession.conversationTurnIds
                      .map((historyId) => getHistoryTurnById(historyId))
                      .filter((item): item is NonNullable<typeof item> => Boolean(item))
                : currentStageBranchSummary?.turns && currentStageBranchSummary.turns.length > 0
                  ? currentStageBranchSummary.turns
                  : activeBranchSummary?.turns && activeBranchSummary.turns.length > 0
                    ? activeBranchSummary.turns
                    : currentStageSourceTurn
                      ? [currentStageSourceTurn]
                      : [];
        const failedThoughtTurns = history.filter((turn) => turn.status === 'failed' && hasThoughtArtifacts(turn));

        return [...relevantHistoryTurns, ...failedThoughtTurns]
            .filter(hasThoughtArtifacts)
            .filter((turn, index, turns) => turns.findIndex((candidate) => candidate.id === turn.id) === index)
            .sort(
                (left, right) =>
                    (right.createdAt ?? Number.MIN_SAFE_INTEGER) - (left.createdAt ?? Number.MIN_SAFE_INTEGER),
            );
    }, [
        activeBranchSummary,
        currentStageBranchSummary,
        currentStageSourceTurn,
        getHistoryTurnById,
        history,
        workspaceSession.conversationTurnIds,
    ]);
    const hasProgressActivity = Boolean(
        liveProgressThoughtEntries.length > 0 ||
            selectedProgressEntry ||
            progressHistoryThoughtTurns.length > 0 ||
            effectiveProgressThoughtsText ||
            effectiveThoughtParts.length > 0,
    );
    const hasSourceTrailInfo = Boolean(
        groundingQueries.length > 0 ||
            selectedSourcesCount > 0 ||
            selectedSupportBundlesCount > 0 ||
            Boolean(searchEntryPointRenderedContent?.trim()) ||
            effectiveSessionHints?.groundingMetadataReturned ||
            effectiveSessionHints?.groundingSupportsReturned,
    );
    const progressThoughtEntries = useMemo<WorkspaceProgressThoughtEntry[]>(() => {
        const mapTurnToThoughtEntry = (turn: GeneratedImageType): WorkspaceProgressThoughtEntry => {
            const turnThoughtParts = getThoughtResultParts(turn.resultParts);

            return {
                id: turn.id,
                shortId: getShortTurnId(turn.id),
                prompt: turn.prompt || null,
                thoughts: turn.thoughts?.trim() || buildThoughtSummaryFromParts(turnThoughtParts, t('workspaceViewerThoughts')),
                resultParts: turnThoughtParts,
                createdAtMs: turn.createdAt,
                createdAtLabel: formatTimeLabel(turn.createdAt),
                isFailed: turn.status === 'failed',
            };
        };
        const mergeWithLiveEntries = (entries: WorkspaceProgressThoughtEntry[]) => {
            const archivedEntries = dedupeEntriesById(entries);

            if (liveProgressThoughtEntries.length === 0) {
                return archivedEntries;
            }

            const liveEntryIds = new Set(liveProgressThoughtEntries.map((entry) => entry.id));
            return [...liveProgressThoughtEntries, ...archivedEntries.filter((entry) => !liveEntryIds.has(entry.id))];
        };

        const archivedThoughtEntries = dedupeEntriesById([
            ...(selectedProgressEntry ? [selectedProgressEntry] : []),
            ...progressHistoryThoughtTurns.map(mapTurnToThoughtEntry),
        ]).sort((left, right) => {
            const leftMs = left.createdAtMs ?? Number.MIN_SAFE_INTEGER;
            const rightMs = right.createdAtMs ?? Number.MIN_SAFE_INTEGER;

            return rightMs - leftMs;
        });

        if (archivedThoughtEntries.length > 0) {
            return mergeWithLiveEntries(archivedThoughtEntries);
        }

        if (!effectiveProgressThoughtsText && effectiveThoughtParts.length === 0) {
            return mergeWithLiveEntries([]);
        }

        return mergeWithLiveEntries([
            {
                id: currentStageSourceTurn?.id || workspaceSession.sourceHistoryId || 'active-session',
                shortId: getShortTurnId(currentStageSourceTurn?.id || workspaceSession.sourceHistoryId),
                prompt: prompt || null,
                thoughts: effectiveProgressThoughtsText,
                resultParts: effectiveThoughtParts,
                createdAtMs: workspaceSession.updatedAt || null,
                createdAtLabel: sessionUpdatedLabel,
            },
        ]);
    }, [
        currentStageSourceTurn,
        effectiveProgressThoughtsText,
        effectiveThoughtParts,
        getShortTurnId,
        liveProgressThoughtEntries,
        prompt,
        progressHistoryThoughtTurns,
        selectedProgressEntry,
        sessionUpdatedLabel,
        t,
        workspaceSession.sourceHistoryId,
        workspaceSession.updatedAt,
    ]);

    return {
        progressThoughtEntries,
        progressThoughtsSummaryText,
        hasProgressActivity,
        hasSourceTrailInfo,
    };
}