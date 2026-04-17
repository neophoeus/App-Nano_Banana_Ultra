import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import WorkspaceVersionsDetailPanel from '../components/WorkspaceVersionsDetailPanel';

describe('WorkspaceVersionsDetailPanel', () => {
    it('shows viewing and continuation-source state directly on lineage cards', () => {
        const markup = renderToStaticMarkup(
            <WorkspaceVersionsDetailPanel
                currentLanguage="en"
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
                currentStageSourceHistoryId="turn-b"
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
                onHistorySelect={() => undefined}
                onRenameBranch={() => undefined}
                getShortTurnId={(historyId) => historyId?.slice(0, 8) || '--------'}
                getBranchAccentClassName={() => 'border-gray-200 text-gray-700'}
                renderHistoryTurnSnapshotContent={({ item, badges, actionRow }) => (
                    <div>
                        <div>{badges}</div>
                        <div>{item.prompt}</div>
                        {actionRow}
                    </div>
                )}
                renderHistoryTurnBadges={({ isActive, isCurrentStageSource }) => (
                    <span>
                        {isActive ? 'Viewing' : ''}
                        {isCurrentStageSource ? 'Continue with this image' : ''}
                    </span>
                )}
                renderHistoryTurnActionRow={({ testIds }) => (
                    <div>{testIds?.open ? <span data-testid={testIds.open}>open</span> : null}</div>
                )}
                renderActiveBranchSummaryContent={() => <div>active branch summary</div>}
                showHeader={false}
            />,
        );

        expect(markup).toContain('workspace-versions-detail-panel');
        expect(markup).toContain('active-branch-card');
        expect(markup).toContain('lineage-map-card');
        expect(markup).toContain('Workspace Snapshot');
        expect(markup).toContain('Version map');
        expect(markup).toContain('active branch summary');
        expect(markup).toContain('Viewing');
        expect(markup).toContain('Continue with this image');
    });
});
