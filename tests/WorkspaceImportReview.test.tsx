import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import WorkspaceImportReview from '../components/WorkspaceImportReview';
import { GeneratedImage } from '../types';

const buildTurn = (overrides: Partial<GeneratedImage> = {}): GeneratedImage => ({
    id: 'turn-1',
    url: 'https://example.com/image.png',
    prompt: 'Imported prompt',
    aspectRatio: '1:1',
    size: '1K',
    style: 'None',
    model: 'gemini-3.1-flash-image-preview',
    createdAt: '2026-03-17T10:00:00.000Z' as unknown as number,
    status: 'success',
    executionMode: 'single-turn',
    ...overrides,
});

describe('WorkspaceImportReview', () => {
    it('renders branch preview cards expanded with prompt previews and actions', () => {
        const longPrompt =
            'Imported branch prompt with enough descriptive detail to force a preview truncation in the summary shell while preserving the full prompt inside the expanded content for branch actions.';
        const previewPrompt = `${longPrompt.slice(0, 120).trimEnd()}...`;
        const latestTurn = buildTurn({ prompt: longPrompt });
        const markup = renderToStaticMarkup(
            <WorkspaceImportReview
                currentLanguage="en"
                review={
                    {
                        fileName: 'snapshot.json',
                        snapshot: {
                            history: [latestTurn],
                            stagedAssets: [],
                            viewState: { generatedImageUrls: [] },
                            composerState: { prompt: 'Snapshot prompt' },
                            workspaceSession: { source: null, provenanceMode: null },
                        },
                    } as any
                }
                importedBranchSummaries={[
                    {
                        branchOriginId: 'root-1',
                        branchLabel: 'Main',
                        autoBranchLabel: 'Main',
                        rootId: 'root-1',
                        turnCount: 1,
                        updatedAt: '2026-03-17T10:00:00.000Z',
                        originTurn: latestTurn,
                        latestTurn,
                    },
                ]}
                importedLatestTurn={latestTurn}
                importedLatestSuccessfulTurn={null}
                getContinueActionLabel={() => 'Continue latest turn'}
                onClose={vi.fn()}
                onMerge={vi.fn()}
                onReplace={vi.fn()}
                onReplaceAndOpenLatest={vi.fn()}
                onReplaceAndContinueLatest={vi.fn()}
                onReplaceAndBranchLatest={vi.fn()}
                onReplaceAndOpenBranchLatest={vi.fn()}
                onReplaceAndContinueBranchLatest={vi.fn()}
                onReplaceAndBranchFromBranchLatest={vi.fn()}
            />,
        );

        expect(markup).toContain('workspace-import-review');
        expect(markup).toContain('import-review-branch-details-root-1');
        expect(markup).toContain('import-review-branch-summary-root-1');
        expect(markup).toContain(previewPrompt);
        expect(markup).toContain(longPrompt);
        expect(markup).toContain('Choose next step');
        expect(markup).toContain('Replace first, then decide how this imported source should continue.');
        expect(markup).toContain('Open in history');
        expect(markup).toContain('Keep reviewing this imported chain in history.');
        expect(markup).toContain('Set next source');
        expect(markup).toContain('Use this imported turn as the next working source.');
        expect(markup).toContain('import-review-branch-history-group-root-1');
        expect(markup).toContain('import-review-branch-active-group-root-1');
        expect(markup).toContain('Open latest turn');
        expect(markup).toContain('Continue latest turn');
        expect(markup).toContain('Branch from latest turn');
        expect(markup).toContain('border-dashed');
        expect(markup).toContain('Merge keeps your current setup intact. Replace switches to the imported workspace.');
    });

    it('renders the direct replace path expanded with preview-first copy and actions', () => {
        const longPrompt =
            'Latest successful import prompt that should stay preview-first in the direct replace summary while leaving the full restore, continue, and branch actions in the expanded body.';
        const previewPrompt = `${longPrompt.slice(0, 120).trimEnd()}...`;
        const latestTurn = buildTurn({ prompt: longPrompt });
        const markup = renderToStaticMarkup(
            <WorkspaceImportReview
                currentLanguage="en"
                review={
                    {
                        fileName: 'snapshot.json',
                        snapshot: {
                            history: [latestTurn],
                            stagedAssets: [],
                            viewState: { generatedImageUrls: [] },
                            composerState: { prompt: 'Snapshot prompt' },
                            workspaceSession: { source: null, provenanceMode: null },
                        },
                    } as any
                }
                importedBranchSummaries={[]}
                importedLatestTurn={latestTurn}
                importedLatestSuccessfulTurn={latestTurn}
                getContinueActionLabel={() => 'Continue latest turn'}
                onClose={vi.fn()}
                onMerge={vi.fn()}
                onReplace={vi.fn()}
                onReplaceAndOpenLatest={vi.fn()}
                onReplaceAndContinueLatest={vi.fn()}
                onReplaceAndBranchLatest={vi.fn()}
            />,
        );

        expect(markup).toContain('import-review-replace-latest-details');
        expect(markup).toContain('import-review-replace-latest-summary');
        expect(markup).toContain(previewPrompt);
        expect(markup).toContain(longPrompt);
        expect(markup).toContain('Choose next step');
        expect(markup).toContain('Open in history');
        expect(markup).toContain('Set next source');
        expect(markup).toContain('import-review-replace-history-group');
        expect(markup).toContain('import-review-replace-active-group');
        expect(markup).toContain('Replace + open latest turn');
        expect(markup).toContain('Replace + Continue latest turn');
        expect(markup).toContain('Replace + branch from latest turn');
    });
});
