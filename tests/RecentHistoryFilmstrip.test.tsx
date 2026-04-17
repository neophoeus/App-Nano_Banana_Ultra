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

const getVisibleText = (markup: string) =>
    markup
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

describe('RecentHistoryFilmstrip', () => {
    it('keeps selection aligned to the selected history turn while showing one current source cue', () => {
        const markup = renderToStaticMarkup(
            <RecentHistoryFilmstrip
                recentHistory={[
                    buildTurn({
                        id: 'turn-stage',
                        url: 'https://example.com/stage.png',
                        prompt: 'Visible prompt must stay out of the filmstrip.',
                    }),
                    buildTurn({
                        id: 'turn-continuation',
                        url: 'https://example.com/continuation.png',
                        prompt: 'Second prompt must stay out of the filmstrip.',
                        lineageAction: 'continue',
                    }),
                ]}
                branchCount={2}
                activeStageImageUrl="https://example.com/stage.png"
                selectedHistoryId="turn-continuation"
                currentStageSourceHistoryId="turn-stage"
                currentSourceHistoryId="turn-continuation"
                branchOriginIdByTurnId={{ 'turn-stage': 'turn-stage', 'turn-continuation': 'turn-stage' }}
                branchLabelByTurnId={{ 'turn-stage': 'Main', 'turn-continuation': 'Branch 2' }}
                branchSummaryByOriginId={{}}
                activeBranchOriginId={null}
                onClear={vi.fn()}
                onHistorySelect={vi.fn()}
                onContinueFromHistoryTurn={vi.fn()}
                onBranchFromHistoryTurn={vi.fn()}
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
        const visibleText = getVisibleText(markup);

        expect(markup).toContain('filmstrip-current-source-turn-continuation');
        expect(markup).not.toContain('filmstrip-current-source-turn-stage');
        expect(markup).toContain('filmstrip-selected-turn-continuation');
        expect(markup).not.toContain('filmstrip-selected-turn-stage');
        expect(markup).toContain('filmstrip-desc');
        expect(markup).toContain('filmstrip-desc-trigger');
        expect(markup).not.toContain('filmstrip-desc-details');
        expect(markup).not.toContain('filmstrip-desc-summary');
        expect(markup).toContain('Recent Turns');
        expect(markup).toContain('filmstrip-grid');
        expect(markup).toContain('overflow-x-auto');
        expect(markup).toContain('grid-cols-[repeat(3,minmax(108px,108px))]');
        expect(markup).toContain('sm:grid-cols-[repeat(4,minmax(108px,108px))]');
        expect(markup).toContain('lg:grid-cols-[repeat(6,minmax(112px,112px))]');
        expect(markup).toContain('lg:justify-center');
        expect(markup).toContain('rounded-[20px]');
        expect(markup).toContain('h-[108px]');
        expect(markup).not.toContain('Visible prompt must stay out of the filmstrip.');
        expect(markup).not.toContain('Second prompt must stay out of the filmstrip.');
        expect(visibleText).not.toContain('Visible prompt must stay out of the filmstrip.');
        expect(visibleText).not.toContain('Second prompt must stay out of the filmstrip.');
        expect(markup).not.toContain('filmstrip-open-turn-stage');
        expect(markup).not.toContain('filmstrip-continue-turn-stage');
        expect(markup).not.toContain('filmstrip-branch-turn-stage');
        expect(markup).not.toContain('Open gallery');
    });

    it('removes queued-batch metadata from filmstrip tokens', () => {
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
                selectedHistoryId={null}
                currentStageSourceHistoryId={null}
                currentSourceHistoryId={null}
                branchOriginIdByTurnId={{ 'turn-1': 'turn-1' }}
                branchLabelByTurnId={{ 'turn-1': 'Main' }}
                branchSummaryByOriginId={{}}
                activeBranchOriginId={null}
                onClear={vi.fn()}
                onHistorySelect={vi.fn()}
                onContinueFromHistoryTurn={vi.fn()}
                onBranchFromHistoryTurn={vi.fn()}
                getContinueActionLabel={() => 'Continue'}
                getBranchAccentClassName={() => 'border-gray-200 bg-white text-gray-700'}
                getLineageActionLabel={() => 'Continue'}
                getQueuedBatchPositionLabel={() => '#1/2'}
                currentLanguage="en"
                renderHistoryActionButton={({ label, testId }) => (
                    <button key={testId} data-testid={testId}>
                        {label}
                    </button>
                )}
            />,
        );

        expect(markup).not.toContain('Queued Batch Result');
        expect(markup).not.toContain('#1/2');
    });

    it('renders a placeholder instead of an empty-src img when a turn has no media url', () => {
        const markup = renderToStaticMarkup(
            <RecentHistoryFilmstrip
                recentHistory={[buildTurn({ url: '' })]}
                branchCount={1}
                activeStageImageUrl={null}
                selectedHistoryId={null}
                currentStageSourceHistoryId={null}
                currentSourceHistoryId={null}
                branchOriginIdByTurnId={{ 'turn-1': 'turn-1' }}
                branchLabelByTurnId={{ 'turn-1': 'Main' }}
                branchSummaryByOriginId={{}}
                activeBranchOriginId={null}
                onClear={vi.fn()}
                onHistorySelect={vi.fn()}
                onContinueFromHistoryTurn={vi.fn()}
                onBranchFromHistoryTurn={vi.fn()}
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

        expect(markup).toContain('filmstrip-card-turn-1-missing-media');
        expect(markup).not.toContain('src=""');
    });
});
