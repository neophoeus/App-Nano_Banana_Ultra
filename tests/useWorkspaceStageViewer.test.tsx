import { describe, expect, it, vi } from 'vitest';
import { buildStageTopRightModel } from '../hooks/useWorkspaceStageViewer';

const translationMap: Record<string, string> = {
    workspaceSourceBadge: 'Source',
    stageContextContinuationDiffers: 'Continuation differs',
    stageGroundingResultStatus: 'Grounding result',
    stageActionContinueFromHere: 'Continue with this image',
    stageActionEdit: 'Edit',
    stageOpenViewer: 'Open Viewer',
    stageActionAddToObjectReference: 'Add to Object Reference',
    stageActionAddToCharacterReference: 'Add to Character Reference',
    stageActionBranchFromHere: 'Branch From Here',
    stageActionClear: 'Clear',
    statusGenerating: 'Generating…',
};

const t = (key: string) => translationMap[key] || key;

const createArgs = (
    overrides: Partial<Parameters<typeof buildStageTopRightModel>[0]> = {},
): Parameters<typeof buildStageTopRightModel>[0] => ({
    hasActiveStageImage: true,
    hasLinkedHistoryTurn: true,
    currentStageIsCurrentSource: true,
    isGenerating: false,
    layoutBucket: 'wide',
    currentStageOriginLabel: 'Upload',
    currentStageBranchLabel: 'Main',
    continuationDiffers: true,
    hasMeaningfulResultStatus: true,
    resultStatusTone: 'warning',
    onContinueFromStageSource: vi.fn(),
    onEdit: vi.fn(),
    onOpenViewer: vi.fn(),
    onAddToObjectReference: vi.fn(),
    onAddToCharacterReference: vi.fn(),
    onBranchFromStageSource: vi.fn(),
    onClear: vi.fn(),
    t,
    ...overrides,
});

describe('buildStageTopRightModel', () => {
    it('builds the standard staged-history matrix with canonical visible and overflow action order', () => {
        const model = buildStageTopRightModel(createArgs());

        expect(model?.contextChips.map((chip) => chip.key)).toEqual(['current-source', 'branch', 'result-status']);
        expect(model?.overflowContextChips).toEqual([]);
        expect(model?.visibleActions.map((action) => action.key)).toEqual(['edit', 'open-viewer']);
        expect(model?.overflowActions.map((action) => action.key)).toEqual([
            'add-object-reference',
            'add-character-reference',
            'clear',
        ]);
    });

    it('omits the divergence chip when the staged turn still matches the continuation source', () => {
        const model = buildStageTopRightModel(
            createArgs({
                continuationDiffers: false,
                hasMeaningfulResultStatus: false,
                resultStatusTone: null,
            }),
        );

        expect(model?.contextChips.map((chip) => chip.key)).toEqual(['current-source', 'branch']);
        expect(model?.overflowContextChips).toEqual([]);
        expect(model?.visibleActions.map((action) => action.key)).toEqual(['edit', 'open-viewer']);
        expect(model?.overflowActions.map((action) => action.key)).toEqual([
            'add-object-reference',
            'add-character-reference',
            'clear',
        ]);
    });

    it('keeps stage context but removes source-owner actions when continue or branch handlers are omitted', () => {
        const model = buildStageTopRightModel(
            createArgs({
                onContinueFromStageSource: undefined,
                onBranchFromStageSource: undefined,
            }),
        );

        expect(model?.contextChips.map((chip) => chip.key)).toEqual(['current-source', 'branch', 'result-status']);
        expect(model?.visibleActions.map((action) => action.key)).toEqual(['edit', 'open-viewer']);
        expect(model?.overflowActions.map((action) => action.key)).toEqual([
            'add-object-reference',
            'add-character-reference',
            'clear',
        ]);
    });

    it('uses the same current source chip for no-linked-history stage-only follow-up', () => {
        const model = buildStageTopRightModel(
            createArgs({
                hasLinkedHistoryTurn: false,
                currentStageIsCurrentSource: true,
                currentStageBranchLabel: null,
                continuationDiffers: false,
                hasMeaningfulResultStatus: false,
                resultStatusTone: null,
                onContinueFromStageSource: undefined,
                onBranchFromStageSource: undefined,
            }),
        );

        expect(model?.contextChips.map((chip) => chip.key)).toEqual(['current-source']);
        expect(model?.overflowContextChips).toEqual([]);
        expect(model?.visibleActions.map((action) => action.key)).toEqual([
            'edit',
            'open-viewer',
            'add-object-reference',
        ]);
        expect(model?.overflowActions.map((action) => action.key)).toEqual(['add-character-reference', 'clear']);
    });

    it('caps compact staged-history state to three context chips and two visible actions before overflow', () => {
        const model = buildStageTopRightModel(createArgs({ layoutBucket: 'compact' }));

        expect(model?.contextChips.map((chip) => chip.key)).toEqual(['current-source', 'branch', 'result-status']);
        expect(model?.overflowContextChips).toEqual([]);
        expect(model?.visibleActions.map((action) => action.key)).toEqual(['edit', 'open-viewer']);
        expect(model?.overflowActions.map((action) => action.key)).toEqual([
            'add-object-reference',
            'add-character-reference',
            'clear',
        ]);
    });

    it('keeps edit and open viewer visible first for compact no-linked-history states', () => {
        const model = buildStageTopRightModel(
            createArgs({
                layoutBucket: 'compact',
                hasLinkedHistoryTurn: false,
                currentStageIsCurrentSource: true,
                currentStageBranchLabel: null,
                continuationDiffers: false,
                hasMeaningfulResultStatus: false,
                resultStatusTone: null,
                onContinueFromStageSource: undefined,
                onBranchFromStageSource: undefined,
            }),
        );

        expect(model?.contextChips.map((chip) => chip.key)).toEqual(['current-source']);
        expect(model?.overflowContextChips).toEqual([]);
        expect(model?.visibleActions.map((action) => action.key)).toEqual(['edit', 'open-viewer']);
        expect(model?.overflowActions.map((action) => action.key)).toEqual([
            'add-object-reference',
            'add-character-reference',
            'clear',
        ]);
    });

    it('preserves source context while replacing normal stage actions with a passive generating state', () => {
        const model = buildStageTopRightModel(createArgs({ isGenerating: true }));

        expect(model?.contextChips.map((chip) => chip.key)).toEqual(['current-source', 'branch']);
        expect(model?.overflowContextChips).toEqual([]);
        expect(model?.visibleActions.map((action) => action.key)).toEqual(['generating']);
        expect(model?.overflowActions).toEqual([]);
    });

    it('drops the source chip when the staged history image is not the operative current source', () => {
        const model = buildStageTopRightModel(
            createArgs({
                currentStageIsCurrentSource: false,
                continuationDiffers: false,
                hasMeaningfulResultStatus: false,
                resultStatusTone: null,
            }),
        );

        expect(model?.contextChips.map((chip) => chip.key)).toEqual(['branch']);
        expect(model?.overflowContextChips).toEqual([]);
    });

    it('returns null when there is no staged image', () => {
        const model = buildStageTopRightModel(createArgs({ hasActiveStageImage: false }));

        expect(model).toBeNull();
    });
});
