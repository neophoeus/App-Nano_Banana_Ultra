import { BranchNameOverrides, GeneratedImage } from '../types';

type LineagePresentation = {
    branchLabelByTurnId: Record<string, string>;
    branchLabelByOriginId: Record<string, string>;
    branchOriginIdByTurnId: Record<string, string>;
    autoBranchLabelByOriginId: Record<string, string>;
};

type LineageLabelConfig = {
    main?: string;
    branchNumber?: string;
};

export type BranchSummary = {
    branchOriginId: string;
    rootId: string;
    branchLabel: string;
    autoBranchLabel: string;
    createdAt: number;
    updatedAt: number;
    turnCount: number;
    originTurn: GeneratedImage;
    latestTurn: GeneratedImage;
    turns: GeneratedImage[];
};

const getTurnRootId = (turn: GeneratedImage) => turn.rootHistoryId || turn.id;

const DEFAULT_LINEAGE_LABELS: Required<LineageLabelConfig> = {
    main: 'Main',
    branchNumber: 'Branch {0}',
};

const getDefaultLineageLabels = (): Required<LineageLabelConfig> => DEFAULT_LINEAGE_LABELS;

const formatAutoBranchLabel = (branchIndex: number, labels?: LineageLabelConfig): string => {
    const defaultLabels = getDefaultLineageLabels();
    const mainLabel = labels?.main || defaultLabels.main;
    const branchNumberLabel = labels?.branchNumber || defaultLabels.branchNumber;

    if (branchIndex === 0) {
        return mainLabel;
    }

    return branchNumberLabel.replace('{0}', String(branchIndex));
};

export const buildLineagePresentation = (
    history: GeneratedImage[],
    branchNameOverrides: BranchNameOverrides = {},
    labels?: LineageLabelConfig,
): LineagePresentation => {
    const successfulTurns = history
        .filter((turn) => turn.status === 'success')
        .sort((left, right) => left.createdAt - right.createdAt);
    const byId = new Map(successfulTurns.map((turn) => [turn.id, turn]));
    const branchOriginIdByTurnId: Record<string, string> = {};

    successfulTurns.forEach((turn) => {
        if (!turn.parentHistoryId) {
            branchOriginIdByTurnId[turn.id] = turn.id;
            return;
        }

        const parent = byId.get(turn.parentHistoryId);
        const parentBranchOriginId = parent ? branchOriginIdByTurnId[parent.id] || parent.id : getTurnRootId(turn);

        branchOriginIdByTurnId[turn.id] = turn.lineageAction === 'branch' ? turn.id : parentBranchOriginId;
    });

    const branchLabelByTurnId: Record<string, string> = {};
    const branchLabelByOriginId: Record<string, string> = {};
    const autoBranchLabelByOriginId: Record<string, string> = {};
    const branchOrderByRoot = new Map<string, string[]>();

    successfulTurns.forEach((turn) => {
        const rootId = getTurnRootId(turn);
        const branchOriginId = branchOriginIdByTurnId[turn.id] || turn.id;
        const existing = branchOrderByRoot.get(rootId) || [];

        if (!existing.includes(branchOriginId)) {
            existing.push(branchOriginId);
            branchOrderByRoot.set(rootId, existing);
        }

        const branchIndex = existing.indexOf(branchOriginId);
        const autoLabel = formatAutoBranchLabel(branchIndex, labels);
        const displayLabel = branchNameOverrides[branchOriginId] || autoLabel;

        autoBranchLabelByOriginId[branchOriginId] = autoLabel;
        branchLabelByOriginId[branchOriginId] = displayLabel;
        branchLabelByTurnId[turn.id] = displayLabel;
    });

    return {
        branchLabelByTurnId,
        branchLabelByOriginId,
        branchOriginIdByTurnId,
        autoBranchLabelByOriginId,
    };
};

export const buildBranchSummaries = (
    history: GeneratedImage[],
    branchNameOverrides: BranchNameOverrides = {},
    labels?: LineageLabelConfig,
): BranchSummary[] => {
    const successfulTurns = history
        .filter((turn) => turn.status === 'success')
        .sort((left, right) => left.createdAt - right.createdAt);
    const { branchLabelByOriginId, branchOriginIdByTurnId, autoBranchLabelByOriginId } = buildLineagePresentation(
        successfulTurns,
        branchNameOverrides,
        labels,
    );
    const grouped = new Map<string, GeneratedImage[]>();

    successfulTurns.forEach((turn) => {
        const branchOriginId = branchOriginIdByTurnId[turn.id] || turn.id;
        const existing = grouped.get(branchOriginId) || [];
        existing.push(turn);
        grouped.set(branchOriginId, existing);
    });

    return Array.from(grouped.entries())
        .map(([branchOriginId, turns]) => {
            const latestTurn = turns[turns.length - 1];
            const firstTurn = turns[0];
            const rootId = latestTurn.rootHistoryId || latestTurn.id;

            return {
                branchOriginId,
                rootId,
                branchLabel:
                    branchLabelByOriginId[branchOriginId] ||
                    autoBranchLabelByOriginId[branchOriginId] ||
                    formatAutoBranchLabel(0, labels),
                autoBranchLabel: autoBranchLabelByOriginId[branchOriginId] || formatAutoBranchLabel(0, labels),
                createdAt: firstTurn.createdAt,
                updatedAt: latestTurn.createdAt,
                turnCount: turns.length,
                originTurn: firstTurn,
                latestTurn,
                turns,
            } satisfies BranchSummary;
        })
        .sort((left, right) => right.updatedAt - left.updatedAt);
};
