import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import WorkspaceProgressDetailPanel from '../components/WorkspaceProgressDetailPanel';
import { QueuedBatchJob } from '../types';

describe('WorkspaceProgressDetailPanel', () => {
    it('renders a compact workflow summary above the accumulated thought snapshot and chronological thought stream', () => {
        const queuedJobs = [
            {
                localId: 'job-running',
                state: 'JOB_STATE_RUNNING',
            },
            {
                localId: 'job-ready',
                state: 'JOB_STATE_SUCCEEDED',
                hasInlinedResponses: true,
                importedAt: null,
            },
            {
                localId: 'job-issue',
                state: 'JOB_STATE_FAILED',
            },
        ] as QueuedBatchJob[];
        const markup = renderToStaticMarkup(
            <WorkspaceProgressDetailPanel
                currentLanguage="en"
                thoughtEntries={[
                    {
                        id: 'turn-1',
                        shortId: 'turn-1',
                        prompt: 'Refine the storefront lighting and keep the poster layout.',
                        thoughts: 'Lock the framing first, then preserve the foreground face proportions.',
                        createdAtLabel: '10:11',
                        createdAtMs: 1710252660000,
                    },
                    {
                        id: 'turn-2',
                        shortId: 'turn-2',
                        prompt: 'Push the contrast further without crushing the shadows.',
                        thoughts: 'Increase contrast in the reflections only and keep the jacket texture readable.',
                        createdAtLabel: '10:13',
                        createdAtMs: 1710252780000,
                    },
                ]}
                latestWorkflowEntry={{
                    displayMessage:
                        'Workspace snapshot imported from ui-import-provenance-live-workspace.json (1 turns).',
                    label: 'Imported workspace snapshot',
                    stage: 'history',
                    timestamp: '10:14',
                }}
                batchProgress={{ completed: 1, total: 3 }}
                queuedJobs={queuedJobs}
                resultStatusSummary="Grounding metadata restored from the imported workspace."
                resultStatusTone="success"
            />,
        );

        const latestThoughtEntryIndex = markup.indexOf('workspace-progress-detail-thought-entry-turn-2');
        const earlierThoughtEntryIndex = markup.indexOf('workspace-progress-detail-thought-entry-turn-1');
        const workflowSummaryIndex = markup.indexOf('workspace-progress-workflow-summary');
        const accumulatedCardIndex = markup.indexOf('workspace-progress-accumulated-card');
        const streamIndex = markup.indexOf('workspace-progress-detail-stream');

        expect(markup).toContain('workspace-progress-detail-panel');
        expect(markup).toContain('workspace-progress-detail-summary');
        expect(markup).toContain('workspace-progress-workflow-summary');
        expect(markup).toContain('workspace-progress-workflow-status');
        expect(markup).toContain('dark:bg-[#18130d]');
        expect(markup).toContain('dark:bg-[#111217]');
        expect(markup).toContain('dark:bg-amber-950/45');
        expect(markup).toContain('dark:bg-[#0f1916]');
        expect(markup).toContain('workspace-progress-workflow-headline');
        expect(markup).toContain('workspace-progress-workflow-progress');
        expect(markup).toContain('workspace-progress-workflow-active-queue');
        expect(markup).toContain('workspace-progress-workflow-import-ready-queue');
        expect(markup).toContain('workspace-progress-workflow-issue-queue');
        expect(markup).toContain('workspace-progress-workflow-result-status');
        expect(markup).toContain('workspace-progress-accumulated-card');
        expect(markup).toContain('workspace-progress-accumulated-count');
        expect(markup).toContain('workspace-progress-accumulated-prompt');
        expect(markup).toContain('workspace-progress-accumulated-text');
        expect(markup).toContain('workspace-progress-detail-stream');
        expect(markup).toContain('workspace-progress-detail-list');
        expect(markup).toContain('workspace-progress-detail-thought-entry-turn-1');
        expect(markup).toContain('workspace-progress-detail-thought-entry-turn-2');
        expect(markup).toContain('Thinking updates from the active turn appear here in chronological order.');
        expect(markup).toContain('Progress');
        expect(markup).toContain('Workflow');
        expect(markup).toContain('History');
        expect(markup).toContain(
            'Workspace snapshot imported from ui-import-provenance-live-workspace.json (1 turns).',
        );
        expect(markup).toContain('1/3');
        expect(markup).toContain('1 active');
        expect(markup).toContain('1 ready to import');
        expect(markup).toContain('1 closed with issues');
        expect(markup).toContain('Grounded result');
        expect(markup).toContain('Grounding metadata restored from the imported workspace.');
        expect(markup).toContain('Latest Thoughts');
        expect(markup).toContain('All Thoughts');
        expect(markup).toContain('2 items');
        expect(markup).toContain('Thoughts');
        expect(markup).toContain('Refine the storefront lighting and keep the poster layout.');
        expect(markup).toContain('Increase contrast in the reflections only and keep the jacket texture readable.');
        expect(workflowSummaryIndex).toBeGreaterThan(-1);
        expect(accumulatedCardIndex).toBeGreaterThan(workflowSummaryIndex);
        expect(accumulatedCardIndex).toBeGreaterThan(-1);
        expect(streamIndex).toBeGreaterThan(accumulatedCardIndex);
        expect(latestThoughtEntryIndex).toBeGreaterThan(streamIndex);
        expect(earlierThoughtEntryIndex).toBeGreaterThan(latestThoughtEntryIndex);
        expect(markup).not.toContain('workspace-progress-detail-entry-0');
        expect(markup).not.toContain('workspace-progress-detail-context');
        expect(markup).not.toContain('workspace-progress-workflow-queue-hint');
        expect(markup).not.toContain('current-stage-source');
    });

    it('falls back to the placeholder when no thought entries or workflow state are available', () => {
        const markup = renderToStaticMarkup(
            <WorkspaceProgressDetailPanel
                currentLanguage="en"
                thoughtEntries={[]}
                thoughtsText={null}
                thoughtsPlaceholder="No thoughts yet"
            />,
        );

        expect(markup).toContain('workspace-progress-accumulated-card');
        expect(markup).toContain('workspace-progress-detail-stream');
        expect(markup).toContain('No thoughts yet');
        expect(markup).not.toContain('workspace-progress-workflow-summary');
        expect(markup).not.toContain('workspace-progress-accumulated-count');
        expect(markup).not.toContain('workspace-progress-detail-thought-entry-');
    });

    it('shows the latest workflow message as a short secondary line only while generation is active', () => {
        const markup = renderToStaticMarkup(
            <WorkspaceProgressDetailPanel
                currentLanguage="en"
                isGenerating={true}
                latestWorkflowEntry={{
                    displayMessage: 'Queued batch job recovered from the remote list.',
                    label: 'Recovered batch job',
                    stage: 'history',
                    timestamp: '10:15',
                }}
                thoughtsPlaceholder="No thoughts yet"
            />,
        );

        expect(markup).toContain('workspace-progress-workflow-summary');
        expect(markup).toContain('workspace-progress-workflow-detail');
        expect(markup).toContain('Generating…');
        expect(markup).toContain('Queued batch job recovered from the remote list.');
    });
});
