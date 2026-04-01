import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import WorkspaceHistoryCanvas from '../components/WorkspaceHistoryCanvas';

describe('WorkspaceHistoryCanvas', () => {
    it('keeps a 50/50 desktop focus grid and places Recent Turns above Versions in the right support rail', () => {
        const markup = renderToStaticMarkup(
            <WorkspaceHistoryCanvas
                currentLanguage="en"
                selectedItemDock={<div data-testid="selected-item-dock-content">Selected item dock</div>}
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
                onExportWorkspace={() => undefined}
                onImportWorkspace={() => undefined}
                onOpenVersionsDetails={() => undefined}
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
        expect(markup).toContain('workspace-history-selected-item-dock');
        expect(markup).toContain('xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]');
        expect(markup).toContain('history-versions-shell');
        expect(markup).toContain('nbu-stage-hero-filmstrip-shell');
        expect(markup).not.toContain('xl:h-[264px]');
        expect(markup).toContain('history-versions-header');
        expect(markup).toContain('mb-1.5 flex min-w-0 items-start justify-end gap-3 xl:justify-between');
        expect(markup).toContain('history-versions-toolbar');
        expect(markup).toContain('history-versions-branch-row');
        expect(markup).toContain('history-versions-quick-actions');
        expect(markup).toContain('history-versions-section');
        expect(markup).toContain('history-versions-open-details');
        expect(markup).toContain('history-import-workspace');
        expect(markup).toContain('history-export-workspace');
        expect(markup).toContain('Versions');
        expect(markup).toContain('Current version');
        expect(markup).toContain('View details');
        expect(markup).toContain('Import Workspace');
        expect(markup).toContain('Export Workspace');
        expect(markup).not.toContain('history-workspace-snapshot-strip');
        expect(markup).not.toContain('history-workspace-snapshot-actions');
        expect(markup).not.toContain('Workspace Snapshot');
        expect(markup).not.toContain('active-branch-card');
        expect(markup).not.toContain('lineage-map-card');
        expect(markup).not.toContain('lineage-map-open-turn-a');
        expect(markup).toContain('support-surface-content');
        expect(markup).not.toContain('session-stack-section');
        expect(markup.indexOf('focus-surface-content')).toBeLessThan(markup.indexOf('recent-lane-content'));
        expect(markup.indexOf('selected-item-dock-content')).toBeLessThan(markup.indexOf('recent-lane-content'));
        expect(markup.indexOf('recent-lane-content')).toBeLessThan(markup.indexOf('history-versions-shell'));
        expect(markup.indexOf('workspaceInsightsVersions')).toBe(-1);
        expect(markup.indexOf('Versions')).toBeLessThan(markup.indexOf('history-versions-open-details'));
        expect(markup.indexOf('history-versions-open-details')).toBeLessThan(
            markup.indexOf('history-import-workspace'),
        );
        expect(markup.indexOf('history-import-workspace')).toBeLessThan(markup.indexOf('history-export-workspace'));
        expect(markup.indexOf('history-versions-shell')).toBeLessThan(markup.indexOf('support-surface-content'));
    });
});
