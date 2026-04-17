import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import WorkspaceInsightsSidebar from '../components/WorkspaceInsightsSidebar';

const buildSidebarProps = (
    overrides: Partial<React.ComponentProps<typeof WorkspaceInsightsSidebar>> = {},
): React.ComponentProps<typeof WorkspaceInsightsSidebar> => ({
    currentLanguage: 'en',
    provenancePanel: null,
    provenanceStatusLabel: null,
    latestWorkflowEntry: null,
    isGenerating: false,
    batchProgress: { completed: 0, total: 0 },
    queuedJobs: [] as any,
    resultStatusSummary: null,
    resultStatusTone: null,
    currentStageAsset: null,
    currentStageBranchSummary: null,
    currentStageSourceTurn: null,
    currentStageSourceHistoryId: null,
    activeBranchSummary: null,
    sessionContinuitySignals: [],
    conversationSummary: null,
    conversationSourceTurn: null,
    sessionSourceTurn: null,
    branchLabelByTurnId: {},
    onHistorySelect: () => undefined,
    getStageOriginLabel: () => 'History',
    getLineageActionLabel: () => 'Continue',
    getLineageActionDescription: () => 'Continue from current turn',
    getShortTurnId: (historyId) => historyId?.slice(0, 8) || '--------',
    getBranchAccentClassName: () => 'border-gray-200 text-gray-700',
    renderHistoryTurnSnapshotContent: ({ item, actionRow }) => (
        <div>
            <div>{item.prompt}</div>
            {actionRow}
        </div>
    ),
    renderHistoryTurnBadges: () => <span>badge</span>,
    renderHistoryTurnActionRow: ({ testIds }) => (
        <div>
            {testIds?.open ? <span data-testid={testIds.open}>open</span> : null}
            {testIds?.continue ? <span data-testid={testIds.continue}>continue</span> : null}
            {testIds?.branch ? <span data-testid={testIds.branch}>branch</span> : null}
            {testIds?.rename ? <span data-testid={testIds.rename}>rename</span> : null}
        </div>
    ),
    ...overrides,
});

describe('WorkspaceInsightsSidebar', () => {
    it('renders current work and provenance without the moved Versions ownership surfaces', () => {
        const markup = renderToStaticMarkup(
            <WorkspaceInsightsSidebar
                {...buildSidebarProps({
                    provenancePanel: <div data-testid="provenance-fragment">provenance body</div>,
                    provenanceStatusLabel: 'Prepared',
                    latestWorkflowEntry: {
                        displayMessage: 'Processing queued import.',
                        label: 'Processing',
                        stage: 'processing',
                        timestamp: '10:05',
                    },
                    batchProgress: { completed: 2, total: 4 },
                    queuedJobs: [
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
                            hasInlinedResponses: true,
                            error: null,
                        },
                        {
                            localId: 'job-no-payload',
                            name: 'batches/job-no-payload',
                            displayName: 'No payload queue job',
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
                            hasInlinedResponses: false,
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
                    ] as any,
                    resultStatusSummary: 'Google Search + Image Search · Requested 4K · Actual 1K',
                    resultStatusTone: 'warning',
                    thoughtsText:
                        'Keep the neon storefront depth, then continue from the current stage source once the queue settles.',
                    thoughtsPlaceholder: 'Thoughts were requested but not returned for this result.',
                    currentStageAsset: {
                        id: 'stage-source',
                        url: 'stage.png',
                        role: 'stage-source',
                        origin: 'history',
                        createdAt: Date.now(),
                        lineageAction: 'continue',
                    },
                    currentStageBranchSummary: {
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
                    currentStageSourceTurn: { id: 'turn-a', prompt: 'Session prompt A' } as any,
                    currentStageSourceHistoryId: 'turn-a',
                    activeBranchSummary: {
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
                    sessionContinuitySignals: ['history-linked'],
                    conversationSummary: {
                        conversationIdShort: 'conv-001',
                        branchLabel: 'Main',
                        activeSourceShortId: 'turn-a',
                        activeTurnNumber: 2,
                        turnCount: 2,
                        isCurrentStageSource: true,
                    },
                    conversationSourceTurn: { id: 'turn-a', prompt: 'Session prompt A' } as any,
                    sessionSourceTurn: { id: 'turn-a', prompt: 'Session prompt A' } as any,
                    branchLabelByTurnId: { 'turn-a': 'Main' },
                })}
            />,
        );

        expect(markup).toContain('context-system-panel');
        expect(markup).toContain('current-work-section');
        expect(markup).toContain('current-work-thoughts-section');
        expect(markup).toContain('current-version-identity');
        expect(markup).toContain('current-stage-source-details');
        expect(markup).toContain('continuity-source-section');
        expect(markup).toContain('conversation-continuity-details');
        expect(markup).toContain('session-continuity-details');
        expect(markup).toContain('context-provenance-section');
        expect(markup).toContain('provenance-fragment');
        expect(markup).toContain('Prepared');
        expect(markup).toContain('workspace-insights-header-summary');
        expect(markup).toContain('workspace-insights-header-chip-workspaceInsightsLatestThoughts');
        expect(markup).toContain('workspace-insights-header-chip-historyFilmstripTitle');
        expect(markup).toContain('context-workflow-summary');
        expect(markup).toContain('context-workflow-progress');
        expect(markup).toContain('context-workflow-active-queue');
        expect(markup).toContain('context-workflow-import-ready-queue');
        expect(markup).toContain('context-workflow-issue-queue');
        expect(markup).toContain('context-workflow-result-status');
        expect(markup).toContain('context-workflow-queue-hint');
        expect(markup).toContain('Current Work');
        expect(markup).toContain('Latest Thoughts');
        expect(markup).toContain('Current version');
        expect(markup).toContain('Sources &amp; Citations');
        expect(markup).toContain('Chat history');
        expect(markup).toContain('Current image');
        expect(markup).toContain('This session');
        expect(markup).toContain('What carries over');
        expect(markup).toContain('Processing queued import.');
        expect(markup).toContain('2/4');
        expect(markup).toContain('1 active');
        expect(markup).toContain('1 ready to import');
        expect(markup).toContain('1 closed with issues');
        expect(markup).toContain('turn 2');
        expect(markup).toContain('Google Search + Image Search · Requested 4K · Actual 1K');
        expect(markup).toContain(
            'Keep the neon storefront depth, then continue from the current stage source once the queue settles.',
        );
        expect(markup).toContain('History</span>');
        expect(markup).toContain('History Route');
        expect(markup).toContain('This route returns to this source turn in history.');
        expect(markup).toContain('current-stage-source-open');
        expect(markup).toContain('conversation-continuity-open');
        expect(markup).toContain('session-continuity-open');
        expect(markup).not.toContain('versions-section');
        expect(markup).not.toContain('session-stack-section');
        expect(markup).not.toContain('lineage-map-card');
        expect(markup).not.toContain('Recent turns');
        expect(markup).not.toContain('Version map');
        expect(markup).not.toContain('session-stack-open-turn-a');
        expect(markup).not.toContain('lineage-map-open-turn-a');
        expect(markup).not.toContain('context-timeline-section');
        expect(markup).not.toContain('context-timeline-tooltip');
        expect(markup).not.toContain('open-session-replay');
        expect(markup).not.toContain('Source details');
        expect(markup).not.toContain('Open gallery');
        expect(markup).not.toContain('Open prompt history');
    });

    it('does not render the moved version empty states in the sidebar', () => {
        const markup = renderToStaticMarkup(<WorkspaceInsightsSidebar {...buildSidebarProps()} />);

        expect(markup).toContain('current-work-section');
        expect(markup).not.toContain('versions-section');
        expect(markup).not.toContain('session-stack-section');
        expect(markup).not.toContain('lineage-map-card');
        expect(markup).not.toContain('Recent successful turns land here for quick reopen, continue, and branching.');
        expect(markup).not.toContain(
            'Once multiple successful turns accumulate, their root and branch relationships will appear here.',
        );
    });

    it('can render the rail content without repeating the header block', () => {
        const markup = renderToStaticMarkup(<WorkspaceInsightsSidebar {...buildSidebarProps({ showHeader: false })} />);

        expect(markup).toContain('current-work-section');
        expect(markup).not.toContain('workspace-insights-header-summary');
    });

    it('supports a compact density mode for workflow detail modal context', () => {
        const markup = renderToStaticMarkup(
            <WorkspaceInsightsSidebar
                {...buildSidebarProps({
                    showHeader: false,
                    compact: true,
                    thoughtsText: 'Compact workflow context should stay readable while using less vertical space.',
                })}
            />,
        );

        expect(markup).toContain(
            'context-system-panel" class="nbu-shell-panel nbu-shell-surface-context-rail overflow-hidden p-2.5 lg:min-h-0"',
        );
        expect(markup).toContain('current-work-section" class="space-y-2.5 text-sm text-gray-600 dark:text-gray-300"');
        expect(markup).toContain('current-work-thoughts-section');
        expect(markup).toContain('Compact workflow context should stay readable while using less vertical space.');
        expect(markup).not.toContain('workspace-insights-header-summary');
    });

    it('can suppress duplicated workflow summary and latest thoughts for workflow detail modal side context', () => {
        const markup = renderToStaticMarkup(
            <WorkspaceInsightsSidebar
                {...buildSidebarProps({
                    showHeader: false,
                    compact: true,
                    showWorkflowSummary: false,
                    showThoughtsSection: false,
                    thoughtsText: 'This thought should only live in the main workflow event list.',
                    latestWorkflowEntry: {
                        displayMessage: 'Result returned.',
                        label: 'Output',
                        stage: 'output',
                        timestamp: '10:12',
                    },
                })}
            />,
        );

        expect(markup).toContain('current-work-section');
        expect(markup).not.toContain('context-workflow-summary');
        expect(markup).not.toContain('current-work-thoughts-section');
        expect(markup).not.toContain('This thought should only live in the main workflow event list.');
    });

    it('renders a single continuity source without a nested disclosure summary', () => {
        const markup = renderToStaticMarkup(
            <WorkspaceInsightsSidebar
                {...buildSidebarProps({
                    sessionContinuitySignals: ['official-chat'],
                    conversationSummary: {
                        conversationIdShort: 'conv-001',
                        branchLabel: 'Main',
                        activeSourceShortId: 'turn-a',
                        activeTurnNumber: 2,
                        turnCount: 2,
                        isCurrentStageSource: false,
                    },
                    conversationSourceTurn: { id: 'turn-a', prompt: 'Session prompt A' } as any,
                    branchLabelByTurnId: { 'turn-a': 'Main' },
                    renderHistoryTurnActionRow: ({ testIds }) => (
                        <div>{testIds?.open ? <span data-testid={testIds.open}>open</span> : null}</div>
                    ),
                })}
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
