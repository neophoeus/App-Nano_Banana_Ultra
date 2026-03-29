import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import WorkspaceInsightsSidebar from '../components/WorkspaceInsightsSidebar';

describe('WorkspaceInsightsSidebar', () => {
    it('renders expanded context sections with a latest timeline summary', () => {
        const markup = renderToStaticMarkup(
            <WorkspaceInsightsSidebar
                currentLanguage="en"
                provenancePanel={<div data-testid="provenance-fragment">provenance body</div>}
                provenanceStatusLabel="Prepared"
                latestWorkflowEntry={{
                    displayMessage: 'Processing queued import.',
                    label: 'Processing',
                    stage: 'processing',
                    timestamp: '10:05',
                }}
                isGenerating={false}
                batchProgress={{ completed: 2, total: 4 }}
                queuedJobs={
                    [
                        {
                            localId: 'job-active',
                            name: 'batches/job-active',
                            displayName: 'Active queue job',
                            state: 'JOB_STATE_RUNNING',
                            model: 'gemini-3.1-flash-image-preview',
                            prompt: 'Prompt',
                            generationMode: 'Text to Image',
                            aspectRatio: '1:1',
                            imageSize: '1K',
                            style: 'None',
                            outputFormat: 'images-only',
                            temperature: 1,
                            thinkingLevel: 'minimal',
                            includeThoughts: true,
                            googleSearch: false,
                            imageSearch: false,
                            batchSize: 1,
                            objectImageCount: 0,
                            characterImageCount: 0,
                            createdAt: 1,
                            updatedAt: 2,
                            startedAt: null,
                            completedAt: null,
                            lastPolledAt: null,
                            importedAt: null,
                            error: null,
                        },
                        {
                            localId: 'job-ready',
                            name: 'batches/job-ready',
                            displayName: 'Ready queue job',
                            state: 'JOB_STATE_SUCCEEDED',
                            model: 'gemini-3.1-flash-image-preview',
                            prompt: 'Prompt',
                            generationMode: 'Text to Image',
                            aspectRatio: '1:1',
                            imageSize: '1K',
                            style: 'None',
                            outputFormat: 'images-only',
                            temperature: 1,
                            thinkingLevel: 'minimal',
                            includeThoughts: true,
                            googleSearch: false,
                            imageSearch: false,
                            batchSize: 1,
                            objectImageCount: 0,
                            characterImageCount: 0,
                            createdAt: 1,
                            updatedAt: 2,
                            startedAt: null,
                            completedAt: null,
                            lastPolledAt: null,
                            importedAt: null,
                            error: null,
                        },
                        {
                            localId: 'job-failed',
                            name: 'batches/job-failed',
                            displayName: 'Failed queue job',
                            state: 'JOB_STATE_FAILED',
                            model: 'gemini-3.1-flash-image-preview',
                            prompt: 'Prompt',
                            generationMode: 'Text to Image',
                            aspectRatio: '1:1',
                            imageSize: '1K',
                            style: 'None',
                            outputFormat: 'images-only',
                            temperature: 1,
                            thinkingLevel: 'minimal',
                            includeThoughts: true,
                            googleSearch: false,
                            imageSearch: false,
                            batchSize: 1,
                            objectImageCount: 0,
                            characterImageCount: 0,
                            createdAt: 1,
                            updatedAt: 2,
                            startedAt: null,
                            completedAt: null,
                            lastPolledAt: null,
                            importedAt: Date.now(),
                            error: 'failed',
                        },
                    ] as any
                }
                resultStatusSummary="Google Search + Image Search · Requested 4K · Actual 1K"
                resultStatusTone="warning"
                currentStageAsset={{
                    id: 'stage-source',
                    url: 'stage.png',
                    role: 'stage-source',
                    origin: 'history',
                    createdAt: Date.now(),
                    lineageAction: 'continue',
                }}
                currentStageBranchSummary={
                    {
                        branchOriginId: 'root-a',
                        branchLabel: 'Main',
                        autoBranchLabel: 'Main',
                        rootId: 'root-a',
                        turnCount: 1,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                        originTurn: { id: 'turn-a', prompt: 'Session prompt A' },
                        latestTurn: { id: 'turn-a', prompt: 'Session prompt A' },
                        turns: [{ id: 'turn-a', prompt: 'Session prompt A' }],
                    } as any
                }
                currentStageSourceTurn={{ id: 'turn-a', prompt: 'Session prompt A' } as any}
                currentStageSourceHistoryId="turn-a"
                activeBranchSummary={
                    {
                        branchOriginId: 'root-a',
                        branchLabel: 'Main',
                        autoBranchLabel: 'Main',
                        rootId: 'root-a',
                        turnCount: 1,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                        originTurn: { id: 'turn-a', prompt: 'Session prompt A' },
                        latestTurn: { id: 'turn-a', prompt: 'Session prompt A' },
                        turns: [{ id: 'turn-a', prompt: 'Session prompt A' }],
                    } as any
                }
                recentBranchSummaries={[
                    {
                        branchOriginId: 'root-a',
                        branchLabel: 'Main',
                        autoBranchLabel: 'Main',
                        rootId: 'root-a',
                        turnCount: 1,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                        originTurn: { id: 'turn-a', prompt: 'Session prompt A' },
                        latestTurn: { id: 'turn-a', prompt: 'Session prompt A' },
                        turns: [{ id: 'turn-a', prompt: 'Session prompt A' }],
                    } as any,
                ]}
                branchSummariesCount={1}
                sessionUpdatedLabel="just now"
                sessionContinuitySignals={['history-linked']}
                conversationSummary={{
                    conversationIdShort: 'conv-001',
                    branchLabel: 'Main',
                    activeSourceShortId: 'turn-a',
                    activeTurnNumber: 2,
                    turnCount: 2,
                    isCurrentStageSource: true,
                }}
                conversationSourceTurn={{ id: 'turn-a', prompt: 'Session prompt A' } as any}
                sessionSourceTurn={{ id: 'turn-a', prompt: 'Session prompt A' } as any}
                sessionTurnStack={[
                    {
                        id: 'turn-a',
                        imageUrl: 'image-a',
                        prompt: 'Session prompt A',
                        timestamp: Date.now(),
                        branchOriginId: 'root-a',
                    } as any,
                ]}
                selectedHistoryId={null}
                branchLabelByTurnId={{ 'turn-a': 'Main' }}
                lineageRootGroups={[
                    {
                        rootId: 'root-a',
                        branches: [
                            {
                                branchOriginId: 'root-a',
                                branchLabel: 'Main',
                                turns: [{ id: 'turn-a', prompt: 'Session prompt A' } as any],
                            },
                        ],
                    },
                ]}
                timelineEntries={[
                    {
                        message: 'latest',
                        displayMessage: 'Latest workflow entry',
                        stage: 'complete' as any,
                        border: 'border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-950/20',
                        tone: 'text-amber-700 dark:text-amber-200',
                        icon: '•',
                        label: 'Complete',
                        isCurrentStageSourceEntry: false,
                        timestamp: '10:10',
                    },
                    {
                        message: 'previous',
                        displayMessage: 'Earlier workflow entry',
                        stage: 'complete' as any,
                        border: 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/30',
                        tone: 'text-slate-700 dark:text-slate-200',
                        icon: '•',
                        label: 'Complete',
                        isCurrentStageSourceEntry: false,
                        timestamp: '10:09',
                    },
                ]}
                sessionHintEntries={[['mode', 'chat']]}
                onOpenSessionReplay={() => undefined}
                onHistorySelect={() => undefined}
                onRenameBranch={() => undefined}
                getStageOriginLabel={() => 'History'}
                getLineageActionLabel={() => 'Continue'}
                getLineageActionDescription={() => 'Continue from current turn'}
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
                    <div>
                        {testIds?.open ? <span data-testid={testIds.open}>open</span> : null}
                        {testIds?.continue ? <span data-testid={testIds.continue}>continue</span> : null}
                        {testIds?.branch ? <span data-testid={testIds.branch}>branch</span> : null}
                        {testIds?.rename ? <span data-testid={testIds.rename}>rename</span> : null}
                    </div>
                )}
                renderActiveBranchSummaryContent={() => <div>active branch</div>}
                formatSessionHintKey={(key) => key}
                formatSessionHintValue={(value) => String(value)}
            />,
        );

        expect(markup).toContain('session-stack-section');
        expect(markup).toContain('context-system-panel');
        expect(markup).toContain('current-work-section');
        expect(markup).toContain('versions-section');
        expect(markup).toContain('workspace-insights-header-summary');
        expect(markup).toContain('workspace-insights-header-summary" class="mt-3 grid grid-cols-2 gap-2"');
        expect(markup).toContain('workspace-insights-header-chip-workspaceInsightsCurrentWork');
        expect(markup).toContain('workspace-insights-header-chip-workspaceInsightsVersions');
        expect(markup).toContain('workspace-insights-header-chip-workspaceInsightsSourcesCitations');
        expect(markup).toContain('workspace-insights-header-chip-workspaceInsightsActivity');
        expect(markup).toContain('context-workflow-summary');
        expect(markup).toContain('context-provenance-section');
        expect(markup).toContain('context-timeline-section');
        expect(markup).toContain('provenance-fragment');
        expect(markup).toContain('Prepared');
        expect(markup).not.toContain('context-workflow-message');
        expect(markup).toContain('context-workflow-progress');
        expect(markup).toContain('context-workflow-active-queue');
        expect(markup).toContain('context-workflow-import-ready-queue');
        expect(markup).toContain('context-workflow-issue-queue');
        expect(markup).toContain('context-workflow-result-status');
        expect(markup).toContain('context-workflow-queue-hint');
        expect(markup).toContain('lineage-map-card');
        expect(markup).toContain('timeline-latest-summary');
        expect(markup).toContain('timeline-history-section');
        expect(markup).not.toContain('timeline-history-summary');
        expect(markup).toContain('Current Work');
        expect(markup).toContain('Versions');
        expect(markup).toContain('Sources &amp; Citations');
        expect(markup).toContain('Activity');
        expect(markup).toContain('Recent activity');
        expect(markup).toContain('Current version');
        expect(markup).toContain('Chat history');
        expect(markup).toContain('Current image');
        expect(markup).toContain('This session');
        expect(markup).toContain('What carries over');
        expect(markup).toContain('Recent turns');
        expect(markup).toContain('Version map');
        expect(markup).toContain('Review session');
        expect(markup).toContain('History</span>');
        expect(markup).toContain('session-hints-section');
        expect(markup).not.toContain('session-hints-summary');
        expect(markup).toContain('continuity-source-section');
        expect(markup).not.toContain('continuity-source-summary');
        expect(markup).not.toContain('current-stage-source-shell');
        expect(markup).not.toContain('current-stage-source-summary');
        expect(markup).not.toContain('Enabled');
        expect(markup).not.toContain('Standby');
        expect(markup).not.toContain('active-branch-switcher-section');
        expect(markup).not.toContain('active-branch-switcher-summary');
        expect(markup).not.toContain('session-stack-summary');
        expect(markup).not.toContain('lineage-map-summary');
        expect(markup).toContain('Processing queued import.');
        expect(markup).toContain('2/4');
        expect(markup).toContain('1 active');
        expect(markup).toContain('1 ready to import');
        expect(markup).toContain('1 closed with issues');
        expect(markup).toContain('turn 2');
        expect(markup).toContain('Google Search + Image Search · Requested 4K · Actual 1K');
        expect(markup).toContain('Latest workflow entry');
        expect(markup).toContain('Earlier workflow entry');
        expect(markup).not.toContain('Live Timeline');
        expect(markup).toContain('current-stage-source-details');
        expect(markup).toContain('conversation-continuity-details');
        expect(markup).toContain('session-continuity-details');
        expect(markup).toContain('History Route');
        expect(markup).toContain('This route returns to this source turn in history.');
        expect(markup).toContain('context-timeline-tooltip');
        expect(markup).toContain('session-stack-open-turn-a');
        expect(markup).toContain('session-stack-owner-route-turn-a');
        expect(markup).toContain('session-stack-rename-turn-a');
        expect(markup).toContain('current-stage-source-open');
        expect(markup).not.toContain('session-stack-continue-turn-a');
        expect(markup).not.toContain('session-stack-branch-turn-a');
        expect(markup).not.toContain('current-stage-source-continue');
        expect(markup).not.toContain('current-stage-source-branch');
        expect(markup).not.toContain('conversation-continuity-continue');
        expect(markup).not.toContain('conversation-continuity-branch');
        expect(markup).not.toContain('session-continuity-continue');
        expect(markup).not.toContain('session-continuity-branch');
        expect(markup).not.toContain('lineage-map-continue-turn-a');
        expect(markup).not.toContain('lineage-map-branch-turn-a');
        expect(markup).not.toContain('timeline-source-continue');
        expect(markup).not.toContain('timeline-source-branch');
        expect(markup).toContain('conversation-continuity-open');
        expect(markup).toContain('session-continuity-open');
        expect(markup).toContain('lineage-map-open-turn-a');
        expect(markup).toContain('lineage-map-owner-route-turn-a');
        expect(markup).not.toContain('Source details');
        expect(markup).not.toContain('Origin root-a');
        expect(markup).not.toContain('Open gallery');
        expect(markup).not.toContain('Open prompt history');
    });

    it('renders session stack and lineage empty copy only once when those sections are empty', () => {
        const sessionStackEmptyMatches = (value: string) =>
            value.match(/Recent successful turns land here for quick reopen, continue, and branching\./g) || [];
        const lineageEmptyMatches = (value: string) =>
            value.match(
                /Once multiple successful turns accumulate, their root and branch relationships will appear here\./g,
            ) || [];

        const markup = renderToStaticMarkup(
            <WorkspaceInsightsSidebar
                currentLanguage="en"
                provenancePanel={null}
                provenanceStatusLabel={null}
                latestWorkflowEntry={null}
                isGenerating={false}
                batchProgress={{ completed: 0, total: 0 }}
                queuedJobs={[] as any}
                resultStatusSummary={null}
                resultStatusTone={null}
                currentStageAsset={null}
                currentStageBranchSummary={null}
                currentStageSourceTurn={null}
                currentStageSourceHistoryId={null}
                activeBranchSummary={null}
                recentBranchSummaries={[]}
                branchSummariesCount={0}
                sessionUpdatedLabel="just now"
                sessionContinuitySignals={[]}
                conversationSummary={null}
                conversationSourceTurn={null}
                sessionSourceTurn={null}
                sessionTurnStack={[]}
                selectedHistoryId={null}
                branchLabelByTurnId={{}}
                lineageRootGroups={[]}
                timelineEntries={[]}
                sessionHintEntries={[]}
                onOpenSessionReplay={() => undefined}
                onHistorySelect={() => undefined}
                onRenameBranch={() => undefined}
                getStageOriginLabel={() => 'History'}
                getLineageActionLabel={() => 'Continue'}
                getLineageActionDescription={() => 'Continue from current turn'}
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
                    <div>
                        {testIds?.open ? <span data-testid={testIds.open}>open</span> : null}
                        {testIds?.continue ? <span data-testid={testIds.continue}>continue</span> : null}
                        {testIds?.branch ? <span data-testid={testIds.branch}>branch</span> : null}
                        {testIds?.rename ? <span data-testid={testIds.rename}>rename</span> : null}
                    </div>
                )}
                renderActiveBranchSummaryContent={() => <div>active branch</div>}
                formatSessionHintKey={(key) => key}
                formatSessionHintValue={(value) => String(value)}
            />,
        );

        expect(markup).toContain('session-stack-section');
        expect(markup).toContain('lineage-map-card');
        expect(sessionStackEmptyMatches(markup)).toHaveLength(1);
        expect(lineageEmptyMatches(markup)).toHaveLength(1);
    });

    it('can render the rail content without repeating the header block', () => {
        const markup = renderToStaticMarkup(
            <WorkspaceInsightsSidebar
                currentLanguage="en"
                showHeader={false}
                provenancePanel={null}
                provenanceStatusLabel={null}
                latestWorkflowEntry={null}
                isGenerating={false}
                batchProgress={{ completed: 0, total: 0 }}
                queuedJobs={[] as any}
                resultStatusSummary={null}
                resultStatusTone={null}
                currentStageAsset={null}
                currentStageBranchSummary={null}
                currentStageSourceTurn={null}
                currentStageSourceHistoryId={null}
                activeBranchSummary={null}
                recentBranchSummaries={[]}
                branchSummariesCount={0}
                sessionUpdatedLabel="just now"
                sessionContinuitySignals={[]}
                conversationSummary={null}
                conversationSourceTurn={null}
                sessionSourceTurn={null}
                sessionTurnStack={[]}
                selectedHistoryId={null}
                branchLabelByTurnId={{}}
                lineageRootGroups={[]}
                timelineEntries={[]}
                sessionHintEntries={[]}
                onOpenSessionReplay={() => undefined}
                onHistorySelect={() => undefined}
                onRenameBranch={() => undefined}
                getStageOriginLabel={() => 'History'}
                getLineageActionLabel={() => 'Continue'}
                getLineageActionDescription={() => 'Continue from current turn'}
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
                    <div>
                        {testIds?.open ? <span data-testid={testIds.open}>open</span> : null}
                        {testIds?.continue ? <span data-testid={testIds.continue}>continue</span> : null}
                        {testIds?.branch ? <span data-testid={testIds.branch}>branch</span> : null}
                        {testIds?.rename ? <span data-testid={testIds.rename}>rename</span> : null}
                    </div>
                )}
                renderActiveBranchSummaryContent={() => <div>active branch</div>}
                formatSessionHintKey={(key) => key}
                formatSessionHintValue={(value) => String(value)}
            />,
        );

        expect(markup).toContain('current-work-section');
        expect(markup).not.toContain('workspace-insights-header-summary');
    });

    it('renders a single continuity source without a nested disclosure summary', () => {
        const markup = renderToStaticMarkup(
            <WorkspaceInsightsSidebar
                currentLanguage="en"
                provenancePanel={null}
                provenanceStatusLabel={null}
                latestWorkflowEntry={null}
                isGenerating={false}
                batchProgress={{ completed: 0, total: 0 }}
                queuedJobs={[] as any}
                resultStatusSummary={null}
                resultStatusTone={null}
                currentStageAsset={null}
                currentStageBranchSummary={null}
                currentStageSourceTurn={null}
                currentStageSourceHistoryId={null}
                activeBranchSummary={null}
                recentBranchSummaries={[]}
                branchSummariesCount={0}
                sessionUpdatedLabel="just now"
                sessionContinuitySignals={['official-chat']}
                conversationSummary={{
                    conversationIdShort: 'conv-001',
                    branchLabel: 'Main',
                    activeSourceShortId: 'turn-a',
                    activeTurnNumber: 2,
                    turnCount: 2,
                    isCurrentStageSource: false,
                }}
                conversationSourceTurn={{ id: 'turn-a', prompt: 'Session prompt A' } as any}
                sessionSourceTurn={null}
                sessionTurnStack={[]}
                selectedHistoryId={null}
                branchLabelByTurnId={{ 'turn-a': 'Main' }}
                lineageRootGroups={[]}
                timelineEntries={[]}
                sessionHintEntries={[]}
                onOpenSessionReplay={() => undefined}
                onHistorySelect={() => undefined}
                onRenameBranch={() => undefined}
                getStageOriginLabel={() => 'History'}
                getLineageActionLabel={() => 'Continue'}
                getLineageActionDescription={() => 'Continue from current turn'}
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
                formatSessionHintKey={(key) => key}
                formatSessionHintValue={(value) => String(value)}
            />,
        );

        expect(markup).toContain('continuity-source-section');
        expect(markup).not.toContain('continuity-source-summary');
        expect(markup).toContain('conversation-continuity-card');
        expect(markup).toContain('conversation-continuity-details');
        expect(markup).toContain('conversation-continuity-open');
        expect(markup).toContain('turn 2');
        expect(markup).not.toContain('session-continuity-source-card');
    });
});
