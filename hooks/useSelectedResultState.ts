import { Dispatch, SetStateAction, useCallback, useState } from 'react';
import { GeneratedImage, GroundingMetadata, ResultArtifacts, ResultPart } from '../types';

export type GroundingSelection = { kind: 'bundle'; index: number } | { kind: 'source'; index: number } | null;

type UseSelectedResultStateArgs = {
    initialActiveResult: ResultArtifacts | null;
    initialSelectedHistoryId: string | null;
};

type UseSelectedResultStateReturn = {
    selectedResultText: string | null;
    setSelectedResultText: Dispatch<SetStateAction<string | null>>;
    selectedThoughts: string | null;
    setSelectedThoughts: Dispatch<SetStateAction<string | null>>;
    selectedResultParts: ResultPart[] | null;
    setSelectedResultParts: Dispatch<SetStateAction<ResultPart[] | null>>;
    selectedGrounding: GroundingMetadata | null;
    setSelectedGrounding: Dispatch<SetStateAction<GroundingMetadata | null>>;
    selectedMetadata: Record<string, unknown> | null;
    setSelectedMetadata: Dispatch<SetStateAction<Record<string, unknown> | null>>;
    selectedSessionHints: Record<string, unknown> | null;
    setSelectedSessionHints: Dispatch<SetStateAction<Record<string, unknown> | null>>;
    selectedHistoryId: string | null;
    setSelectedHistoryId: Dispatch<SetStateAction<string | null>>;
    activeGroundingSelection: GroundingSelection;
    setActiveGroundingSelection: Dispatch<SetStateAction<GroundingSelection>>;
    focusLinkedGroundingItems: boolean;
    setFocusLinkedGroundingItems: Dispatch<SetStateAction<boolean>>;
    buildResultArtifacts: (
        item: Pick<GeneratedImage, 'text' | 'thoughts' | 'resultParts' | 'grounding' | 'metadata' | 'sessionHints' | 'id'>,
    ) => ResultArtifacts;
    applySelectedResultArtifacts: (artifacts: ResultArtifacts | null) => void;
    resetSelectedOutputState: () => void;
};

export function useSelectedResultState({
    initialActiveResult,
    initialSelectedHistoryId,
}: UseSelectedResultStateArgs): UseSelectedResultStateReturn {
    const [selectedResultText, setSelectedResultText] = useState<string | null>(
        () => initialActiveResult?.text || null,
    );
    const [selectedThoughts, setSelectedThoughts] = useState<string | null>(
        () => initialActiveResult?.thoughts || null,
    );
    const [selectedResultParts, setSelectedResultParts] = useState<ResultPart[] | null>(
        () => initialActiveResult?.resultParts || null,
    );
    const [selectedGrounding, setSelectedGrounding] = useState<GroundingMetadata | null>(
        () => initialActiveResult?.grounding || null,
    );
    const [selectedMetadata, setSelectedMetadata] = useState<Record<string, unknown> | null>(
        () => initialActiveResult?.metadata || null,
    );
    const [selectedSessionHints, setSelectedSessionHints] = useState<Record<string, unknown> | null>(
        () => initialActiveResult?.sessionHints || null,
    );
    const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(
        () => initialSelectedHistoryId || initialActiveResult?.historyId || null,
    );
    const [activeGroundingSelection, setActiveGroundingSelection] = useState<GroundingSelection>(null);
    const [focusLinkedGroundingItems, setFocusLinkedGroundingItems] = useState(false);

    const buildResultArtifacts = useCallback(
        (
            item: Pick<GeneratedImage, 'text' | 'thoughts' | 'resultParts' | 'grounding' | 'metadata' | 'sessionHints' | 'id'>,
        ): ResultArtifacts => ({
            text: item.text || null,
            thoughts: item.thoughts || null,
            resultParts: item.resultParts || null,
            grounding: item.grounding || null,
            metadata: item.metadata || null,
            sessionHints: item.sessionHints || null,
            historyId: item.id || null,
        }),
        [],
    );

    const applySelectedResultArtifacts = useCallback((artifacts: ResultArtifacts | null) => {
        setSelectedResultText(artifacts?.text || null);
        setSelectedThoughts(artifacts?.thoughts || null);
        setSelectedResultParts(artifacts?.resultParts || null);
        setSelectedGrounding(artifacts?.grounding || null);
        setSelectedMetadata(artifacts?.metadata || null);
        setSelectedSessionHints(artifacts?.sessionHints || null);
        setSelectedHistoryId(artifacts?.historyId || null);
        setActiveGroundingSelection(null);
    }, []);

    const resetSelectedOutputState = useCallback(() => {
        setSelectedResultText(null);
        setSelectedThoughts(null);
        setSelectedResultParts(null);
        setSelectedGrounding(null);
        setSelectedMetadata(null);
        setSelectedSessionHints(null);
        setSelectedHistoryId(null);
        setActiveGroundingSelection(null);
    }, []);

    return {
        selectedResultText,
        setSelectedResultText,
        selectedThoughts,
        setSelectedThoughts,
        selectedResultParts,
        setSelectedResultParts,
        selectedGrounding,
        setSelectedGrounding,
        selectedMetadata,
        setSelectedMetadata,
        selectedSessionHints,
        setSelectedSessionHints,
        selectedHistoryId,
        setSelectedHistoryId,
        activeGroundingSelection,
        setActiveGroundingSelection,
        focusLinkedGroundingItems,
        setFocusLinkedGroundingItems,
        buildResultArtifacts,
        applySelectedResultArtifacts,
        resetSelectedOutputState,
    };
}
