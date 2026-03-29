import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import RecentHistoryFilmstrip from '../components/RecentHistoryFilmstrip';
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

describe('RecentHistoryFilmstrip', () => {
    it('uses contextual continue wording for plain turns', () => {
        const markup = renderToStaticMarkup(
            <RecentHistoryFilmstrip
                recentHistory={[buildTurn({ lineageAction: 'continue' })]}
                branchCount={1}
                activeStageImageUrl={null}
                currentStageSourceHistoryId={null}
                branchOriginIdByTurnId={{ 'turn-1': 'turn-1' }}
                branchLabelByTurnId={{ 'turn-1': 'Main' }}
                branchSummaryByOriginId={{}}
                activeBranchOriginId={null}
                onClear={vi.fn()}
                onHistorySelect={vi.fn()}
                onContinueFromHistoryTurn={vi.fn()}
                onBranchFromHistoryTurn={vi.fn()}
                isPromotedContinuationSource={() => false}
                getContinueActionLabel={() => 'Continue'}
                getBranchAccentClassName={() => 'border-gray-200 bg-white text-gray-700'}
                getLineageActionLabel={() => 'Continue'}
                getQueuedBatchPositionLabel={() => null}
                currentLanguage="en"
                renderHistoryActionButton={({ label, testId }) => (
                    <button key={testId} data-testid={testId}>
                        {label}
                    </button>
                )}
            />,
        );

        expect(markup).toContain('Continue from turn');
        expect(markup).toContain('filmstrip-desc');
        expect(markup).toContain('filmstrip-desc-trigger');
        expect(markup).not.toContain('filmstrip-desc-details');
        expect(markup).not.toContain('filmstrip-desc-summary');
        expect(markup).toContain('Recent Turns');
        expect(markup).not.toContain('Open gallery');
    });

    it('renders queued filmstrip items with one queued-batch result badge', () => {
        const markup = renderToStaticMarkup(
            <RecentHistoryFilmstrip
                recentHistory={[
                    buildTurn({
                        executionMode: 'queued-batch-job',
                        variantGroupId: 'batch-1',
                        lineageAction: 'continue',
                    }),
                ]}
                branchCount={1}
                activeStageImageUrl={null}
                currentStageSourceHistoryId={null}
                branchOriginIdByTurnId={{ 'turn-1': 'turn-1' }}
                branchLabelByTurnId={{ 'turn-1': 'Main' }}
                branchSummaryByOriginId={{}}
                activeBranchOriginId={null}
                onClear={vi.fn()}
                onHistorySelect={vi.fn()}
                onContinueFromHistoryTurn={vi.fn()}
                onBranchFromHistoryTurn={vi.fn()}
                isPromotedContinuationSource={() => false}
                getContinueActionLabel={() => 'Continue'}
                getBranchAccentClassName={() => 'border-gray-200 bg-white text-gray-700'}
                getLineageActionLabel={() => 'Continue'}
                getQueuedBatchPositionLabel={() => null}
                currentLanguage="en"
                renderHistoryActionButton={({ label, testId }) => (
                    <button key={testId} data-testid={testId}>
                        {label}
                    </button>
                )}
            />,
        );

        expect((markup.match(/Queued Batch Result/g) || []).length).toBe(1);
    });
});
