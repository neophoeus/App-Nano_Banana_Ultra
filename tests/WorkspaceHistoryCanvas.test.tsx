import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import WorkspaceHistoryCanvas from '../components/WorkspaceHistoryCanvas';

describe('WorkspaceHistoryCanvas', () => {
    it('keeps the recent lane above the focus state and now owns the relocated Versions surface', () => {
        const markup = renderToStaticMarkup(
            <WorkspaceHistoryCanvas
                currentLanguage="en"
                recentLane={<div data-testid="recent-lane-content">Recent lane</div>}
                focusSurface={<div data-testid="focus-surface-content">Focus surface</div>}
                supportSurface={<div data-testid="support-surface-content">Support surface</div>}
                activeBranchSummary={
                    {
                        branchOriginId: 'root-a',
                        branchLabel: 'Main',
                        autoBranchLabel: 'Main',
                        rootId: 'root-a',
                        turnCount: 2,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                        originTurn: { id: 'turn-a', prompt: 'Version prompt A' },
                        latestTurn: { id: 'turn-b', prompt: 'Version prompt B' },
                        turns: [
                            { id: 'turn-a', prompt: 'Version prompt A' },
                            { id: 'turn-b', prompt: 'Version prompt B' },
                        ],
                    } as any
                }
                recentBranchSummaries={[
                    {
                        branchOriginId: 'root-a',
                        branchLabel: 'Main',
                        autoBranchLabel: 'Main',
                        rootId: 'root-a',
                        turnCount: 2,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                        originTurn: { id: 'turn-a', prompt: 'Version prompt A' },
                        latestTurn: { id: 'turn-b', prompt: 'Version prompt B' },
                        turns: [
                            { id: 'turn-a', prompt: 'Version prompt A' },
                            { id: 'turn-b', prompt: 'Version prompt B' },
                        ],
                    } as any,
                ]}
                branchSummariesCount={1}
                sessionUpdatedLabel="just now"
                selectedHistoryId="turn-a"
                lineageRootGroups={[
                    {
                        rootId: 'root-a',
                        branches: [
                            {
                                branchOriginId: 'root-a',
                                branchLabel: 'Main',
                                turns: [
                                    { id: 'turn-a', prompt: 'Version prompt A' } as any,
                                    { id: 'turn-b', prompt: 'Version prompt B' } as any,
                                ],
                            },
                        ],
                    },
                ]}
                onHistorySelect={() => undefined}
                onRenameBranch={() => undefined}
                getShortTurnId={(historyId) => historyId?.slice(0, 8) || '--------'}
                getBranchAccentClassName={() => 'border-gray-200 text-gray-700'}
                renderHistoryTurnSnapshotContent={({ item, actionRow }) => (
                    <div>
                        <div>{item.prompt}</div>
                        {actionRow}
                    </div>
                )}
                renderHistoryTurnBadges={() => <span>badge</span>}
                renderHistoryTurnActionRow={({ testIds }) => (
                    <div>{testIds?.open ? <span data-testid={testIds.open}>open</span> : null}</div>
                )}
                renderActiveBranchSummaryContent={() => <div>active branch</div>}
            />,
        );

        expect(markup).toContain('workspace-history-canvas');
        expect(markup).toContain('workspace-history-recent-lane');
        expect(markup).toContain('workspace-history-focus-state');
        expect(markup).toContain('workspace-history-support-rail');
        expect(markup).toContain('history-versions-section');
        expect(markup).toContain('active-branch-card');
        expect(markup).toContain('lineage-map-card');
        expect(markup).toContain('Versions');
        expect(markup).toContain('Current version');
        expect(markup).toContain('Version map');
        expect(markup).toContain('lineage-map-open-turn-a');
        expect(markup).toContain('support-surface-content');
        expect(markup).not.toContain('session-stack-section');
        expect(markup.indexOf('recent-lane-content')).toBeLessThan(markup.indexOf('focus-surface-content'));
        expect(markup.indexOf('focus-surface-content')).toBeLessThan(markup.indexOf('support-surface-content'));
    });
});
