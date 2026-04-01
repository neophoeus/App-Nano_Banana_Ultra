import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { useHistoryPresentationHelpers } from '../hooks/useHistoryPresentationHelpers';
import { GeneratedImage } from '../types';

const buildTurn = (overrides: Partial<GeneratedImage> = {}): GeneratedImage => ({
    id: 'turn-1',
    url: 'https://example.com/image.png',
    prompt: 'Prompt',
    aspectRatio: '1:1',
    size: '1K',
    style: 'None',
    model: 'gemini-3.1-flash-image-preview',
    createdAt: 1,
    status: 'success',
    executionMode: 'single-turn',
    ...overrides,
});

describe('useHistoryPresentationHelpers', () => {
    it('uses contextual continue wording for the active branch latest turn when the shared helper is generic', () => {
        const latestTurn = buildTurn({ id: 'turn-latest', lineageAction: 'continue' });
        const originTurn = buildTurn({ id: 'turn-origin', lineageAction: 'root' });

        const TestView = () => {
            const { renderActiveBranchSummaryContent } = useHistoryPresentationHelpers({
                history: [originTurn, latestTurn],
                branchSummaryByOriginId: {
                    'turn-origin': {
                        branchOriginId: 'turn-origin',
                        rootId: 'turn-origin',
                        branchLabel: 'Main',
                        autoBranchLabel: 'Main',
                        createdAt: 1,
                        updatedAt: 1,
                        turnCount: 2,
                        originTurn,
                        latestTurn,
                        turns: [originTurn, latestTurn],
                    },
                },
                effectiveBranchContinuationSourceByBranchOriginId: { 'turn-origin': 'turn-origin' },
                getBranchAccentClassName: () => 'border-gray-200 bg-white text-gray-700',
                getContinueActionLabel: () => 'Continue',
                getLineageActionLabel: () => 'Continue',
                getShortTurnId: (historyId) => historyId || 'none',
                handleBranchFromHistoryTurn: vi.fn(),
                handleContinueFromHistoryTurn: vi.fn(),
                handleHistorySelect: vi.fn(),
                handleRenameBranch: vi.fn(),
                isPromotedContinuationSource: () => false,
                t: (key) =>
                    ({
                        historyActionOpen: 'Open',
                        historyActionBranch: 'Branch',
                        historyActionRename: 'Rename',
                        historyActionOpenLatest: 'Open latest',
                        historyActionOpenOrigin: 'Open origin',
                        historyActionBranchFromOrigin: 'Branch from origin',
                        historyContinueFromTurn: 'Continue from turn',
                        lineageActionContinue: 'Continue',
                        historyBranchAuto: 'auto',
                        historyBranchRoot: 'Root',
                        historyBranchTurns: '{0} turns',
                        historyBranchUpdated: 'updated',
                        historyBranchOrigin: 'Origin',
                        historyBranchLatest: 'latest',
                        historyBranchContinuationSource: 'Continuation source',
                    })[key] || key,
            });

            return (
                <div>
                    {renderActiveBranchSummaryContent({
                        branchOriginId: 'turn-origin',
                        branchLabel: 'Main',
                        autoBranchLabel: 'Main',
                        rootId: 'turn-origin',
                        turnCount: 2,
                        updatedAt: 1,
                        originTurn,
                        latestTurn,
                    } as any)}
                </div>
            );
        };

        const markup = renderToStaticMarkup(<TestView />);

        expect(markup).toContain('Continue from turn');
        expect(markup).not.toContain('>Continue<');
        expect(markup).toContain('active-branch-open-latest');
        expect(markup).toContain('active-branch-continue-latest');
        expect(markup).not.toContain('active-branch-open-origin');
        expect(markup).not.toContain('active-branch-branch-origin');
        expect(markup).not.toContain('Open origin');
        expect(markup).not.toContain('Branch from origin');
    });

    it('renders a single queued-batch result badge for queued history turns', () => {
        const queuedTurn = buildTurn({
            id: 'turn-queued',
            executionMode: 'queued-batch-job',
            variantGroupId: 'batch-1',
            lineageAction: 'continue',
        });

        const TestView = () => {
            const { renderHistoryTurnBadges } = useHistoryPresentationHelpers({
                history: [queuedTurn],
                branchSummaryByOriginId: {},
                effectiveBranchContinuationSourceByBranchOriginId: {},
                getBranchAccentClassName: () => 'border-gray-200 bg-white text-gray-700',
                getContinueActionLabel: () => 'Continue',
                getLineageActionLabel: () => 'Continue',
                getShortTurnId: (historyId) => historyId || 'none',
                handleBranchFromHistoryTurn: vi.fn(),
                handleContinueFromHistoryTurn: vi.fn(),
                handleHistorySelect: vi.fn(),
                handleRenameBranch: vi.fn(),
                isPromotedContinuationSource: () => false,
                t: (key) =>
                    ({
                        workspaceImportReviewExecutionQueuedBatchJob: 'Queued Batch Result',
                        historyModeImage: 'Image',
                        historyBadgeCandidate: 'Candidate',
                        historyBadgeParent: 'Parent',
                        workspaceSourceBadge: 'Source',
                        historyBranchMain: 'Main',
                    })[key] || key,
            });

            return <div>{renderHistoryTurnBadges({ item: queuedTurn, variant: 'stage-source' })}</div>;
        };

        const markup = renderToStaticMarkup(<TestView />);

        expect((markup.match(/Queued Batch Result/g) || []).length).toBe(1);
    });

    it('builds selected-item summary strip props in the frozen canonical order', () => {
        const earlierQueuedTurn = buildTurn({
            id: 'turn-queued-1',
            executionMode: 'queued-batch-job',
            variantGroupId: 'batch-1',
            metadata: { batchResultIndex: 0 },
            createdAt: 1,
        });
        const selectedQueuedTurn = buildTurn({
            id: 'turn-queued-2',
            executionMode: 'queued-batch-job',
            variantGroupId: 'batch-1',
            metadata: { batchResultIndex: 1 },
            createdAt: 2,
            status: 'failed',
            lineageAction: 'branch',
            mode: 'Remix',
        });

        let summaryStripProps: ReturnType<
            ReturnType<typeof useHistoryPresentationHelpers>['buildSelectedItemSummaryStripProps']
        > | null = null;

        const TestView = () => {
            const { buildSelectedItemSummaryStripProps } = useHistoryPresentationHelpers({
                history: [earlierQueuedTurn, selectedQueuedTurn],
                branchSummaryByOriginId: {},
                effectiveBranchContinuationSourceByBranchOriginId: { 'turn-root': 'turn-queued-2' },
                getBranchAccentClassName: () => 'border-gray-200 bg-white text-gray-700',
                getContinueActionLabel: () => 'Continue',
                getLineageActionLabel: (action) => {
                    if (action === 'branch') {
                        return 'Branch';
                    }

                    return 'Root';
                },
                getShortTurnId: (historyId) => historyId?.slice(0, 8) || 'none',
                handleBranchFromHistoryTurn: vi.fn(),
                handleContinueFromHistoryTurn: vi.fn(),
                handleHistorySelect: vi.fn(),
                handleRenameBranch: vi.fn(),
                isPromotedContinuationSource: () => false,
                t: (key) =>
                    ({
                        lblHistoryFailed: 'Failed',
                        workspacePickerStageSource: 'Stage source',
                        historyBranchContinuationSource: 'Continuation source',
                        historyModeImage: 'Image',
                        workspaceImportReviewExecutionQueuedBatchJob: 'Queued batch job',
                    })[key] || key,
            });

            summaryStripProps = buildSelectedItemSummaryStripProps({
                source: 'selected-history',
                historyId: selectedQueuedTurn.id,
                item: selectedQueuedTurn,
                shortId: 'queued-2',
                branchOriginId: 'turn-root',
                branchLabel: 'Branch 2',
                continuationSourceHistoryId: 'turn-queued-2',
                isStageSource: true,
                isContinuationSource: true,
            });

            return null;
        };

        renderToStaticMarkup(<TestView />);

        expect(summaryStripProps?.chips.map((chip) => chip.key)).toEqual([
            'failed',
            'stage-source',
            'continuation-source',
            'branch',
            'lineage-action',
            'model',
            'size',
            'aspect-ratio',
            'queued-batch-position',
            'execution-mode',
            'mode',
            'created-at',
        ]);
        expect(summaryStripProps?.chips.find((chip) => chip.key === 'model')?.label).toBe('Banana 2');
        expect(summaryStripProps?.chips.find((chip) => chip.key === 'queued-batch-position')?.label).toBe('#2/2');
    });

    it('builds the selected-item summary strip state matrix for standard, stage, continuation, and aligned source turns', () => {
        const selectedTurn = buildTurn({
            id: 'turn-matrix',
            createdAt: 3,
            lineageAction: 'continue',
        });

        let standardKeys: string[] = [];
        let stageKeys: string[] = [];
        let continuationKeys: string[] = [];
        let alignedKeys: string[] = [];

        const TestView = () => {
            const { buildSelectedItemSummaryStripProps } = useHistoryPresentationHelpers({
                history: [selectedTurn],
                branchSummaryByOriginId: {},
                effectiveBranchContinuationSourceByBranchOriginId: { 'turn-root': 'turn-matrix' },
                getBranchAccentClassName: () => 'border-gray-200 bg-white text-gray-700',
                getContinueActionLabel: () => 'Continue',
                getLineageActionLabel: () => 'Continue',
                getShortTurnId: (historyId) => historyId?.slice(0, 8) || 'none',
                handleBranchFromHistoryTurn: vi.fn(),
                handleContinueFromHistoryTurn: vi.fn(),
                handleHistorySelect: vi.fn(),
                handleRenameBranch: vi.fn(),
                isPromotedContinuationSource: () => false,
                t: (key) =>
                    ({
                        workspacePickerStageSource: 'Stage source',
                        historyBranchContinuationSource: 'Continuation source',
                        historyModeImage: 'Image',
                    })[key] || key,
            });

            const baseSelectedItem = {
                source: 'selected-history' as const,
                historyId: selectedTurn.id,
                item: selectedTurn,
                shortId: 'matrix',
                branchOriginId: 'turn-root',
                branchLabel: 'Main',
                continuationSourceHistoryId: 'turn-matrix',
            };

            standardKeys =
                buildSelectedItemSummaryStripProps({
                    ...baseSelectedItem,
                    isStageSource: false,
                    isContinuationSource: false,
                })?.chips.map((chip) => chip.key) || [];
            stageKeys =
                buildSelectedItemSummaryStripProps({
                    ...baseSelectedItem,
                    isStageSource: true,
                    isContinuationSource: false,
                })?.chips.map((chip) => chip.key) || [];
            continuationKeys =
                buildSelectedItemSummaryStripProps({
                    ...baseSelectedItem,
                    isStageSource: false,
                    isContinuationSource: true,
                })?.chips.map((chip) => chip.key) || [];
            alignedKeys =
                buildSelectedItemSummaryStripProps({
                    ...baseSelectedItem,
                    isStageSource: true,
                    isContinuationSource: true,
                })?.chips.map((chip) => chip.key) || [];

            return null;
        };

        renderToStaticMarkup(<TestView />);

        expect(standardKeys).toEqual(['branch', 'lineage-action', 'model', 'size', 'aspect-ratio', 'created-at']);
        expect(stageKeys).toEqual([
            'stage-source',
            'branch',
            'lineage-action',
            'model',
            'size',
            'aspect-ratio',
            'created-at',
        ]);
        expect(continuationKeys).toEqual([
            'continuation-source',
            'branch',
            'lineage-action',
            'model',
            'size',
            'aspect-ratio',
            'created-at',
        ]);
        expect(alignedKeys).toEqual([
            'stage-source',
            'continuation-source',
            'branch',
            'lineage-action',
            'model',
            'size',
            'aspect-ratio',
            'created-at',
        ]);
    });

    it('builds selected-item action bar props with Rename Branch only when a branch rename target exists', () => {
        const originTurn = buildTurn({ id: 'turn-origin', createdAt: 1 });
        const latestTurn = buildTurn({
            id: 'turn-latest',
            parentHistoryId: 'turn-origin',
            rootHistoryId: 'turn-origin',
            lineageAction: 'continue',
            createdAt: 2,
        });
        const failedTurn = buildTurn({
            id: 'turn-failed',
            parentHistoryId: 'turn-latest',
            rootHistoryId: 'turn-origin',
            status: 'failed',
            createdAt: 3,
        });

        let offStageActionKeys: Array<string> = [];
        let onStageActionKeys: Array<string> = [];
        let unavailableRenameActionKeys: Array<string> = [];

        const TestView = () => {
            const { buildSelectedItemActionBarProps } = useHistoryPresentationHelpers({
                history: [originTurn, latestTurn, failedTurn],
                branchSummaryByOriginId: {
                    'turn-origin': {
                        branchOriginId: 'turn-origin',
                        rootId: 'turn-origin',
                        branchLabel: 'Main',
                        autoBranchLabel: 'Main',
                        createdAt: 1,
                        updatedAt: 2,
                        turnCount: 2,
                        originTurn,
                        latestTurn,
                        turns: [originTurn, latestTurn],
                    },
                },
                effectiveBranchContinuationSourceByBranchOriginId: {},
                getBranchAccentClassName: () => 'border-gray-200 bg-white text-gray-700',
                getContinueActionLabel: () => 'Continue',
                getLineageActionLabel: () => 'Continue',
                getShortTurnId: (historyId) => historyId || 'none',
                handleBranchFromHistoryTurn: vi.fn(),
                handleContinueFromHistoryTurn: vi.fn(),
                handleHistorySelect: vi.fn(),
                handleRenameBranch: vi.fn(),
                isPromotedContinuationSource: () => false,
                t: (key) =>
                    ({
                        historyActionOpen: 'Open',
                        historyActionBranch: 'Branch',
                        historyActionRename: 'Rename',
                        historyContinueFromTurn: 'Continue from turn',
                        lineageActionContinue: 'Continue',
                    })[key] || key,
            });

            offStageActionKeys =
                buildSelectedItemActionBarProps({
                    source: 'selected-history',
                    historyId: originTurn.id,
                    item: originTurn,
                    shortId: 'selected',
                    branchOriginId: 'turn-origin',
                    branchLabel: 'Main',
                    continuationSourceHistoryId: 'turn-origin',
                    isStageSource: false,
                    isContinuationSource: false,
                })?.actions.map((action) => action.key) || [];

            onStageActionKeys =
                buildSelectedItemActionBarProps({
                    source: 'stage-source',
                    historyId: originTurn.id,
                    item: originTurn,
                    shortId: 'selected',
                    branchOriginId: 'turn-origin',
                    branchLabel: 'Main',
                    continuationSourceHistoryId: 'turn-origin',
                    isStageSource: true,
                    isContinuationSource: false,
                })?.actions.map((action) => action.key) || [];

            unavailableRenameActionKeys =
                buildSelectedItemActionBarProps({
                    source: 'selected-history',
                    historyId: failedTurn.id,
                    item: failedTurn,
                    shortId: 'failed',
                    branchOriginId: 'turn-failed',
                    branchLabel: 'Failed branch',
                    continuationSourceHistoryId: 'turn-latest',
                    isStageSource: false,
                    isContinuationSource: false,
                })?.actions.map((action) => action.key) || [];

            return null;
        };

        renderToStaticMarkup(<TestView />);

        expect(offStageActionKeys).toEqual(['open', 'continue', 'branch', 'rename-branch']);
        expect(onStageActionKeys).toEqual(['continue', 'branch', 'rename-branch']);
        expect(unavailableRenameActionKeys).toEqual(['open', 'continue', 'branch']);
    });
});
