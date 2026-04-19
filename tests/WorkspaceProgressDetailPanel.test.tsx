/** @vitest-environment jsdom */

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import WorkspaceProgressDetailPanel from '../components/WorkspaceProgressDetailPanel';
import { QueuedBatchJob } from '../types';

describe('WorkspaceProgressDetailPanel', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
    });

    it('renders the new overview plus history navigator and selected detail stream', () => {
        const queuedJobs = [
            {
                localId: 'job-running',
                state: 'JOB_STATE_RUNNING',
            },
            {
                localId: 'job-ready',
                state: 'JOB_STATE_SUCCEEDED',
                hasImportablePayload: true,
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

        expect(markup).toContain('workspace-progress-detail-summary');
        expect(markup).toContain('workspace-progress-workflow-summary');
        expect(markup).toContain('workspace-progress-detail-layout');
        expect(markup).toContain('workspace-progress-detail-navigator');
        expect(markup).toContain('workspace-progress-detail-history-nav');
        expect(markup).toContain('workspace-progress-detail-selected-panel');
        expect(markup).toContain('workspace-progress-detail-history-entry-turn-2');
        expect(markup).toContain('workspace-progress-detail-history-entry-turn-1');
        expect(markup).toContain('workspace-progress-detail-selected-content');
        expect(markup).toContain('Progress');
        expect(markup).toContain('Workflow');
        expect(markup).toContain('Recent Turns');
        expect(markup).toContain('All Thoughts');
        expect(markup).toContain('2 items');
        expect(markup).toContain('2 turns');
        expect(markup).toContain('Grounding result');
        expect(markup).toContain('Grounding metadata restored from the imported workspace.');
        expect(markup).toContain('Increase contrast in the reflections only and keep the jacket texture readable.');
        expect(markup).not.toContain('workspace-progress-accumulated-card');
        expect(markup).not.toContain('workspace-progress-detail-stream');
        expect(markup).not.toContain('workspace-progress-detail-slot-grid');
        expect(markup).not.toContain('workspace-progress-detail-history-list');
    });

    it('shows the empty navigator state when no thought entries are available', () => {
        const markup = renderToStaticMarkup(
            <WorkspaceProgressDetailPanel
                currentLanguage="en"
                thoughtEntries={[]}
                thoughtsText={null}
                thoughtsPlaceholder="No thoughts yet"
            />,
        );

        expect(markup).toContain('workspace-progress-detail-summary');
        expect(markup).toContain('workspace-progress-detail-empty');
        expect(markup).toContain('No thoughts yet');
        expect(markup).toContain('workspace-progress-detail-selected-panel');
        expect(markup).not.toContain('workspace-progress-workflow-summary');
        expect(markup).not.toContain('workspace-progress-detail-live-nav');
        expect(markup).not.toContain('workspace-progress-detail-history-nav');
    });

    it('lets the user switch between live slots and archived thought entries', () => {
        act(() => {
            root.render(
                <WorkspaceProgressDetailPanel
                    currentLanguage="en"
                    isGenerating={true}
                    thoughtEntries={[
                        {
                            id: 'live-batch-0',
                            shortId: 'slot-01',
                            slotIndex: 0,
                            slotLabel: '#1',
                            isLive: true,
                            prompt: 'Keep the composition and push warmer key light.',
                            thoughts: 'Warm the light first, then preserve skin texture.',
                            resultParts: [
                                {
                                    sequence: 0,
                                    kind: 'thought-text',
                                    text: 'Warm the light first, then preserve skin texture.',
                                },
                            ],
                            createdAtLabel: '10:16',
                            createdAtMs: 1710252960000,
                        },
                        {
                            id: 'live-batch-1',
                            shortId: 'slot-02',
                            slotIndex: 1,
                            slotLabel: '#2',
                            isLive: true,
                            prompt: 'Keep the composition and push cooler rim light.',
                            thoughts: 'Separate the subject with the rim light without flattening the jacket folds.',
                            resultParts: [
                                {
                                    sequence: 0,
                                    kind: 'thought-text',
                                    text: 'Separate the subject with the rim light without flattening the jacket folds.',
                                },
                            ],
                            createdAtLabel: '10:16',
                            createdAtMs: 1710252960000,
                        },
                        {
                            id: 'turn-1',
                            shortId: 'turn-1',
                            prompt: 'Restore the jacket texture from the previous turn.',
                            thoughts: 'Keep the original jacket grain and sharpen only the poster edges.',
                            createdAtLabel: '10:12',
                            createdAtMs: 1710252720000,
                        },
                    ]}
                    latestWorkflowEntry={{
                        displayMessage: 'Generating 2 live variants.',
                        label: 'Generating variants',
                        stage: 'processing',
                        timestamp: '10:16',
                    }}
                    batchProgress={{ completed: 0, total: 2 }}
                />,
            );
        });

        const selectedContent = () =>
            container.querySelector('[data-testid="workspace-progress-detail-selected-content"]') as HTMLDivElement;
        const selectedLabel = () =>
            container.querySelector('[data-testid="workspace-progress-detail-selected-label"]') as HTMLSpanElement;

        expect(container.querySelector('[data-testid="workspace-progress-detail-live-nav"]')).toBeTruthy();
        expect(container.querySelector('[data-testid="workspace-progress-detail-history-nav"]')).toBeTruthy();
        expect(selectedLabel().textContent).toBe('#1');
        expect(selectedContent().textContent).toContain('Warm the light first, then preserve skin texture.');
        expect(container.querySelector('[data-testid="workspace-progress-detail-selected-live"]')).toBeTruthy();

        const secondLiveButton = container.querySelector(
            '[data-testid="workspace-progress-detail-live-entry-1"]',
        ) as HTMLButtonElement;
        act(() => {
            secondLiveButton.click();
        });

        expect(selectedLabel().textContent).toBe('#2');
        expect(selectedContent().textContent).toContain(
            'Separate the subject with the rim light without flattening the jacket folds.',
        );
        expect(selectedContent().textContent).not.toContain('Warm the light first, then preserve skin texture.');

        const historyButton = container.querySelector(
            '[data-testid="workspace-progress-detail-history-entry-turn-1"]',
        ) as HTMLButtonElement;
        act(() => {
            historyButton.click();
        });

        expect(selectedLabel().textContent).toBe('turn-1');
        expect(selectedContent().textContent).toContain(
            'Keep the original jacket grain and sharpen only the poster edges.',
        );
        expect(container.querySelector('[data-testid="workspace-progress-detail-selected-live"]')).toBeNull();
    });

    it('shows archived failed entries with a failed cue and replays their thought stream', () => {
        act(() => {
            root.render(
                <WorkspaceProgressDetailPanel
                    currentLanguage="en"
                    thoughtEntries={[
                        {
                            id: 'turn-success',
                            shortId: 'turn-suc',
                            prompt: 'Keep the hero image stable and clean up the storefront reflections.',
                            thoughts: 'Preserve the storefront silhouette and reduce the brightest glare first.',
                            createdAtLabel: '10:18',
                            createdAtMs: 1710253080000,
                        },
                        {
                            id: 'failed-stream-turn',
                            shortId: 'failed-s',
                            prompt: 'Retry the failed pass but keep the poster geometry locked.',
                            thoughts: 'Failed turn thought text survives selection.',
                            resultParts: [
                                {
                                    sequence: 0,
                                    kind: 'thought-text',
                                    text: 'Failed turn thought text survives selection.',
                                },
                                {
                                    sequence: 1,
                                    kind: 'thought-image',
                                    imageUrl: '/api/load-image?filename=failed-thought.png',
                                },
                            ],
                            createdAtLabel: '10:17',
                            createdAtMs: 1710253020000,
                            isFailed: true,
                        },
                    ]}
                />,
            );
        });

        const failedHistoryButton = container.querySelector(
            '[data-testid="workspace-progress-detail-history-entry-failed-s"]',
        ) as HTMLButtonElement | null;
        const failedHistoryStatus = container.querySelector(
            '[data-testid="workspace-progress-detail-history-entry-status-failed-s"]',
        ) as HTMLSpanElement | null;

        expect(container.querySelector('[data-testid="workspace-progress-detail-history-nav"]')).toBeTruthy();
        expect(failedHistoryButton).toBeTruthy();
        expect(failedHistoryStatus?.textContent).toContain('Failed');

        act(() => {
            failedHistoryButton?.click();
        });

        expect(container.querySelector('[data-testid="workspace-progress-detail-selected-failed"]')).toBeTruthy();
        expect(
            (container.querySelector(
                '[data-testid="workspace-progress-detail-part-text-failed-s-0"]',
            ) as HTMLElement | null)?.textContent,
        ).toContain('Failed turn thought text survives selection.');
        expect(
            (container.querySelector(
                '[data-testid="workspace-progress-detail-part-image-failed-s-1"] img',
            ) as HTMLImageElement | null)?.getAttribute('src'),
        ).toBe('/api/load-image?filename=failed-thought.png');
    });
});