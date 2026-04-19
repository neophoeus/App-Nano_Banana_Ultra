import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import './setupTranslations';
import QueuedBatchJobsPanel from '../components/QueuedBatchJobsPanel';

const QUEUED_IMPORTED_DATA_URL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

describe('QueuedBatchJobsPanel', () => {
    it('renders queue summary counts, job states, timelines, and job actions', () => {
        const markup = renderToStaticMarkup(
            <QueuedBatchJobsPanel
                currentLanguage="en"
                queueBatchConversationNotice="Queued batch jobs keep source lineage, but they do not send official multi-turn conversation history."
                queuedJobs={[
                    {
                        localId: 'job-pending',
                        name: 'batches/job-pending',
                        displayName: 'Pending panorama batch',
                        state: 'JOB_STATE_PENDING',
                        model: 'gemini-3.1-flash-image-preview',
                        prompt: 'Create a queued panorama',
                        generationMode: 'Text to Image',
                        aspectRatio: '16:9',
                        imageSize: '1K',
                        style: 'None',
                        outputFormat: 'images-only',
                        temperature: 1,
                        thinkingLevel: 'minimal',
                        includeThoughts: true,
                        googleSearch: false,
                        imageSearch: false,
                        batchSize: 1,
                        batchStats: {
                            requestCount: 2,
                            successfulRequestCount: 0,
                            failedRequestCount: 0,
                            pendingRequestCount: 2,
                        },
                        objectImageCount: 0,
                        characterImageCount: 0,
                        createdAt: 1710400000000,
                        updatedAt: 1710400000000,
                        startedAt: null,
                        completedAt: null,
                        lastPolledAt: null,
                        error: null,
                        sourceHistoryId: 'queued-source-turn',
                        lineageAction: 'continue',
                    },
                    {
                        localId: 'job-ready',
                        name: 'batches/job-ready',
                        displayName: 'Ready character batch',
                        state: 'JOB_STATE_SUCCEEDED',
                        model: 'gemini-3-pro-image-preview',
                        prompt: 'Import queued character results',
                        generationMode: 'Follow-up Edit',
                        aspectRatio: '1:1',
                        imageSize: '1K',
                        style: 'Anime',
                        outputFormat: 'images-and-text',
                        temperature: 1,
                        thinkingLevel: 'minimal',
                        includeThoughts: true,
                        googleSearch: false,
                        imageSearch: false,
                        batchSize: 1,
                        batchStats: {
                            requestCount: 1,
                            successfulRequestCount: 1,
                            failedRequestCount: 0,
                            pendingRequestCount: 0,
                        },
                        objectImageCount: 1,
                        characterImageCount: 1,
                        createdAt: 1710400010000,
                        updatedAt: 1710400030000,
                        startedAt: 1710400015000,
                        completedAt: 1710400020000,
                        lastPolledAt: 1710400030000,
                        hasImportablePayload: true,
                        error: null,
                    },
                    {
                        localId: 'job-imported',
                        name: 'batches/job-imported',
                        displayName: 'Imported archive batch',
                        state: 'JOB_STATE_SUCCEEDED',
                        model: 'gemini-3.1-flash-image-preview',
                        prompt: 'Imported queued results',
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
                        createdAt: 1710400040000,
                        updatedAt: 1710400060000,
                        startedAt: 1710400045000,
                        completedAt: 1710400050000,
                        lastPolledAt: 1710400060000,
                        error: null,
                    },
                    {
                        localId: 'job-failed',
                        name: 'batches/job-failed',
                        displayName: 'Failed storyboard batch',
                        restoredFromSnapshot: true,
                        state: 'JOB_STATE_FAILED',
                        model: 'gemini-3.1-flash-image-preview',
                        prompt: 'Generate failed storyboard',
                        generationMode: 'Text to Image',
                        aspectRatio: '16:9',
                        imageSize: '1K',
                        style: 'None',
                        outputFormat: 'images-only',
                        temperature: 1,
                        thinkingLevel: 'minimal',
                        includeThoughts: true,
                        googleSearch: false,
                        imageSearch: false,
                        batchSize: 4,
                        objectImageCount: 0,
                        characterImageCount: 0,
                        createdAt: 1710400070000,
                        updatedAt: 1710400080000,
                        startedAt: 1710400075000,
                        completedAt: 1710400080000,
                        lastPolledAt: 1710400080000,
                        error: 'Upstream batch failed.',
                    },
                ]}
                getLineageActionLabel={(action) => action || 'root'}
                getImportedQueuedResultCount={(job) => (job.localId === 'job-imported' ? 2 : 0)}
                getImportedQueuedHistoryItems={(job) =>
                    job.localId === 'job-imported'
                        ? [
                              {
                                  id: 'history-imported-1',
                                  url: QUEUED_IMPORTED_DATA_URL,
                                  prompt: 'Imported queued results',
                                  text: 'Imported queued batch result text',
                                  aspectRatio: '1:1',
                                  size: '1K',
                                  style: 'None',
                                  model: 'gemini-3.1-flash-image-preview',
                                  createdAt: 1710400065000,
                                  executionMode: 'queued-batch-job',
                                  variantGroupId: job.name,
                                  status: 'success',
                                  metadata: { batchResultIndex: 0 },
                              },
                              {
                                  id: 'history-imported-2',
                                  url: QUEUED_IMPORTED_DATA_URL,
                                  prompt: 'Imported queued results alternate angle',
                                  text: 'Imported queued batch result text two',
                                  aspectRatio: '1:1',
                                  size: '1K',
                                  style: 'None',
                                  model: 'gemini-3.1-flash-image-preview',
                                  createdAt: 1710400066000,
                                  executionMode: 'queued-batch-job',
                                  variantGroupId: job.name,
                                  status: 'success',
                                  metadata: { batchResultIndex: 1 },
                              },
                          ]
                        : []
                }
                activeImportedQueuedHistoryId="history-imported-1"
                onImportAllQueuedJobs={vi.fn()}
                onPollAllQueuedJobs={vi.fn()}
                onPollQueuedJob={vi.fn()}
                onCancelQueuedJob={vi.fn()}
                onImportQueuedJob={vi.fn()}
                onOpenImportedQueuedJob={vi.fn()}
                onOpenLatestImportedQueuedJob={vi.fn()}
                onOpenImportedQueuedHistoryItem={vi.fn()}
                onRemoveQueuedJob={vi.fn()}
            />,
        );

        expect(markup).toContain('Queued Batch Jobs');
        expect(markup).toContain('queued-batch-panel-guidance');
        expect(markup).toContain('queued-batch-panel-guidance-trigger');
        expect(markup).toContain('queued-batch-panel-notice');
        expect(markup).toContain('queued-batch-panel-notice-trigger');
        expect(markup).not.toContain('queued-batch-panel-guidance-details');
        expect(markup).not.toContain('queued-batch-panel-guidance-summary');
        expect(markup).toContain('1 active');
        expect(markup).toContain('1 ready to import');
        expect(markup).toContain('1 closed with issues');
        expect(markup).toContain('4 tracked');
        expect(markup).toContain('Continuity note');
        expect(markup).toContain(
            'Tracked official Gemini Batch API jobs stay here while pending or running. Batch API targets completion within 24 hours, but image jobs can continue until the service expires them after 48 hours.',
        );
        expect(markup).toContain('Import ready results');
        expect(markup).toContain('queued-batch-panel-monitor-group');
        expect(markup).toContain('queued-batch-panel-results-group');
        expect(markup).toContain('queued-batch-panel-cleanup-group');
        expect(markup).toContain('queued-batch-panel-results-count');
        expect(markup).toContain('Clear non-importable');
        expect(markup).toContain('Clear imported');
        expect(markup).toContain('Cleanup');
        expect(markup).toContain('Pending panorama batch');
        expect(markup).toContain('Pending');
        expect(markup).toContain('queued-batch-job-job-pending-request-count');
        expect(markup).toContain('2 request(s)');
        expect(markup).toContain('queued-batch-job-job-pending-resource-name');
        expect(markup).toContain('batches/job-pending');
        expect(markup).toContain('queued-batch-job-job-pending-batch-stats');
        expect(markup).toContain('0 Succeeded · 2 Pending · 0 Failed');
        expect(markup).toContain('Ready character batch');
        expect(markup).toContain('Succeeded');
        expect(markup).toContain('1 Succeeded · 0 Pending · 0 Failed');
        expect(markup).toContain('Imported archive batch');
        expect(markup).toContain('Imported');
        expect(markup).toContain('2x');
        expect(markup).toContain('Failed storyboard batch');
        expect(markup).toContain('Failed');
        expect(markup).toContain('Restored history');
        expect(markup).toContain('not a live queue failure');
        expect(markup).toContain('Upstream batch failed.');
        expect(markup).toContain('Submitted');
        expect(markup).toContain('Finished');
        expect(markup).toContain('Imported');
        expect(markup).toContain('Status');
        expect(markup).toContain('Results');
        expect(markup).toContain('Remove');
        expect(markup).toContain('Check status');
        expect(markup).toContain('Cancel');
        expect(markup).toContain('Import');
        expect(markup).toContain('Open #1/2');
        expect(markup).toContain('Open latest #2/2');
        expect(markup).toContain('Remove');
        expect(markup).toContain('queued-batch-job-job-imported-preview-details');
        expect(markup).toContain('queued-batch-job-job-imported-preview-summary-shell');
        expect(markup).toContain('group-open:rotate-180');
        expect(markup).toContain('queued-batch-job-job-imported-preview-summary');
        expect(markup).toContain('queued-batch-job-job-imported-preview-prev');
        expect(markup).toContain('queued-batch-job-job-imported-preview-next');
        expect(markup).toContain('queued-batch-job-job-imported-preview-active-cue');
        expect(markup).toContain('queued-batch-job-job-imported-preview-active-result');
        expect(markup).toContain('queued-batch-job-job-imported-preview-active-prompt');
        expect(markup).toContain('queued-batch-job-job-imported-preview-rail');
        expect(markup).toContain('queued-batch-job-job-imported-preview-0');
        expect(markup).toContain('queued-batch-job-job-imported-preview-1');
        expect(markup).toContain('queued-batch-job-job-imported-preview-0-active');
        expect(markup).toContain('queued-batch-job-job-imported-preview-0-cue');
        expect(markup).toContain('queued-batch-job-job-imported-preview-1-cue');
        expect(markup).toContain('Result Text');
        expect(markup).toContain('Prompt');
        expect(markup).toContain('title="Imported queued batch result text · Imported queued results"');
        expect(markup).toContain('title="Imported queued batch result text"');
        expect(markup).toContain('title="Imported queued batch result text two"');
        expect(markup).toContain('Imported queued batch result text');
        expect(markup).toContain('Imported queued results');
        expect(markup).toContain('Imported queued batch result text two');
        expect(markup).toContain('queued-batch-job-job-ready-import');
        expect(markup).toContain('queued-batch-job-job-imported-open');
        expect(markup).toContain('queued-batch-job-job-imported-open-latest');
        expect(markup).toContain('queued-batch-job-job-imported-imported-count');
        expect(markup).toContain('queued-batch-job-job-pending-cancel');
        expect(markup).toContain('queued-batch-job-job-pending-monitor-group');
        expect(markup).toContain('queued-batch-job-job-ready-results-group');
        expect(markup).toContain('queued-batch-job-job-imported-cleanup-group');
        expect(markup).not.toContain('queued-batch-job-job-failed-poll');
        expect(markup).toContain('queued-batch-job-job-failed-restored-history');
        expect(markup).toContain('queued-batch-job-job-failed-restored-history-note');
    });

    it('renders authoritative request count and resource name when local batch size is stale', () => {
        const markup = renderToStaticMarkup(
            <QueuedBatchJobsPanel
                currentLanguage="en"
                queueBatchConversationNotice={null}
                queuedJobs={[
                    {
                        localId: 'job-stale-count',
                        name: 'batches/job-stale-count',
                        displayName: 'Stale count batch',
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
                        includeThoughts: false,
                        googleSearch: false,
                        imageSearch: false,
                        batchSize: 1,
                        batchStats: {
                            requestCount: 2,
                            successfulRequestCount: 1,
                            failedRequestCount: 1,
                            pendingRequestCount: 0,
                        },
                        objectImageCount: 0,
                        characterImageCount: 0,
                        createdAt: 1710400000000,
                        updatedAt: 1710400030000,
                        startedAt: 1710400015000,
                        completedAt: 1710400020000,
                        lastPolledAt: 1710400030000,
                        hasImportablePayload: true,
                        error: null,
                    },
                ]}
                getLineageActionLabel={(action) => action || 'root'}
                getImportedQueuedResultCount={() => 0}
                getImportedQueuedHistoryItems={() => []}
                activeImportedQueuedHistoryId={null}
                onImportAllQueuedJobs={vi.fn()}
                onPollAllQueuedJobs={vi.fn()}
                onPollQueuedJob={vi.fn()}
                onCancelQueuedJob={vi.fn()}
                onImportQueuedJob={vi.fn()}
                onOpenImportedQueuedJob={vi.fn()}
                onOpenLatestImportedQueuedJob={vi.fn()}
                onOpenImportedQueuedHistoryItem={vi.fn()}
                onRemoveQueuedJob={vi.fn()}
            />,
        );

        expect(markup).toContain('queued-batch-job-job-stale-count-request-count');
        expect(markup).toContain('2 request(s)');
        expect(markup).toContain('queued-batch-job-job-stale-count-resource-name');
        expect(markup).toContain('batches/job-stale-count');
    });

    it('shows queue age warnings after the 24h target and near the 48h expiry window', () => {
        vi.useFakeTimers();
        vi.setSystemTime(1710562000000);

        try {
            const markup = renderToStaticMarkup(
                <QueuedBatchJobsPanel
                    currentLanguage="en"
                    queueBatchConversationNotice={null}
                    queuedJobs={
                        [
                            {
                                localId: 'job-target',
                                name: 'batches/job-target',
                                displayName: 'Over target batch',
                                state: 'JOB_STATE_PENDING',
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
                                createdAt: 1710472000000,
                                updatedAt: 1710562000000,
                                startedAt: null,
                                completedAt: null,
                                lastPolledAt: null,
                                error: null,
                            },
                            {
                                localId: 'job-near-expiry',
                                name: 'batches/job-near-expiry',
                                displayName: 'Near expiry batch',
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
                                createdAt: 1710400000000,
                                updatedAt: 1710562000000,
                                startedAt: 1710401000000,
                                completedAt: null,
                                lastPolledAt: 1710562000000,
                                error: null,
                            },
                        ] as any
                    }
                    getLineageActionLabel={(action) => action || 'root'}
                    getImportedQueuedResultCount={() => 0}
                    getImportedQueuedHistoryItems={() => []}
                    activeImportedQueuedHistoryId={null}
                    onImportAllQueuedJobs={vi.fn()}
                    onPollAllQueuedJobs={vi.fn()}
                    onPollQueuedJob={vi.fn()}
                    onCancelQueuedJob={vi.fn()}
                    onImportQueuedJob={vi.fn()}
                    onOpenImportedQueuedJob={vi.fn()}
                    onOpenLatestImportedQueuedJob={vi.fn()}
                    onOpenImportedQueuedHistoryItem={vi.fn()}
                    onRemoveQueuedJob={vi.fn()}
                />,
            );

            expect(markup).toContain('queued-batch-job-job-target-age-warning');
            expect(markup).toContain('25h old · past 24h target');
            expect(markup).toContain('queued-batch-job-job-near-expiry-age-warning');
            expect(markup).toContain('45h old · near 48h expiry');
        } finally {
            vi.useRealTimers();
        }
    });

    it('renders a no-payload diagnostic for succeeded jobs that finished without inline responses', () => {
        const markup = renderToStaticMarkup(
            <QueuedBatchJobsPanel
                currentLanguage="en"
                queueBatchConversationNotice={null}
                queuedJobs={[
                    {
                        localId: 'job-no-payload',
                        name: 'batches/job-no-payload',
                        displayName: 'No payload queue job',
                        state: 'JOB_STATE_SUCCEEDED',
                        model: 'gemini-3.1-flash-image-preview',
                        prompt: 'Succeeded without inline payload',
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
                        createdAt: 1710400010000,
                        updatedAt: 1710400030000,
                        startedAt: 1710400015000,
                        completedAt: 1710400020000,
                        lastPolledAt: 1710400030000,
                        hasImportablePayload: false,
                        importDiagnostic: 'no-payload',
                        error: null,
                    },
                ]}
                getLineageActionLabel={(action) => action || 'root'}
                getImportedQueuedResultCount={() => 0}
                getImportedQueuedHistoryItems={() => []}
                activeImportedQueuedHistoryId={null}
                onImportAllQueuedJobs={vi.fn()}
                onPollAllQueuedJobs={vi.fn()}
                onPollQueuedJob={vi.fn()}
                onCancelQueuedJob={vi.fn()}
                onImportQueuedJob={vi.fn()}
                onOpenImportedQueuedJob={vi.fn()}
                onOpenLatestImportedQueuedJob={vi.fn()}
                onOpenImportedQueuedHistoryItem={vi.fn()}
                onRemoveQueuedJob={vi.fn()}
            />,
        );

        expect(markup).toContain('This batch job finished without any inline image payload to import.');
        expect(markup).toContain('queued-batch-job-job-no-payload-import-diagnostic');
        expect(markup).toContain('data-testid="queued-batch-job-job-no-payload-import-unavailable"');
        expect(markup).toContain('Import unavailable');
        expect(markup).toContain('disabled=""');
        expect(markup).toContain('0 ready to import');
    });

    it('prefers a specific extraction failure message over the generic import diagnostic copy', () => {
        const markup = renderToStaticMarkup(
            <QueuedBatchJobsPanel
                currentLanguage="en"
                queueBatchConversationNotice={null}
                queuedJobs={[
                    {
                        localId: 'job-specific-error',
                        name: 'batches/job-specific-error',
                        displayName: 'Specific extraction error batch',
                        state: 'JOB_STATE_SUCCEEDED',
                        model: 'gemini-3.1-flash-image-preview',
                        prompt: 'Prompt rejected upstream',
                        generationMode: 'Follow-up Edit',
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
                        createdAt: 1710400010000,
                        updatedAt: 1710400030000,
                        startedAt: 1710400015000,
                        completedAt: 1710400020000,
                        lastPolledAt: 1710400030000,
                        hasImportablePayload: true,
                        importDiagnostic: 'extraction-failure',
                        error: 'Prompt was rejected by policy (block reason: PROHIBITED_CONTENT).',
                    },
                ]}
                getLineageActionLabel={(action) => action || 'root'}
                getImportedQueuedResultCount={() => 0}
                getImportedQueuedHistoryItems={() => []}
                activeImportedQueuedHistoryId={null}
                onImportAllQueuedJobs={vi.fn()}
                onPollAllQueuedJobs={vi.fn()}
                onPollQueuedJob={vi.fn()}
                onCancelQueuedJob={vi.fn()}
                onImportQueuedJob={vi.fn()}
                onOpenImportedQueuedJob={vi.fn()}
                onOpenLatestImportedQueuedJob={vi.fn()}
                onOpenImportedQueuedHistoryItem={vi.fn()}
                onRemoveQueuedJob={vi.fn()}
            />,
        );

        expect(markup).toContain(
            'The prompt was blocked before image generation started. Policy block reason: blocked for prohibited content.',
        );
        expect(markup).toContain('data-testid="queued-batch-job-job-specific-error-retry-import"');
        expect(markup).toContain('Retry import');
        expect(markup).toContain('0 ready to import');
        expect(markup).not.toContain('No image results were available to import from this batch job.');
        expect(markup).not.toContain('queued-batch-job-job-specific-error-import-diagnostic');
    });

    it('renders per-request import issue details when a queued batch import summary hides multiple failures', () => {
        const markup = renderToStaticMarkup(
            <QueuedBatchJobsPanel
                currentLanguage="en"
                queueBatchConversationNotice={null}
                queuedJobs={[
                    {
                        localId: 'job-multi-issue',
                        name: 'batches/job-multi-issue',
                        displayName: 'Multi issue batch',
                        state: 'JOB_STATE_SUCCEEDED',
                        model: 'gemini-3.1-flash-image-preview',
                        prompt: 'Prompt',
                        generationMode: 'Follow-up Edit',
                        aspectRatio: '1:1',
                        imageSize: '1K',
                        style: 'None',
                        outputFormat: 'images-only',
                        temperature: 1,
                        thinkingLevel: 'minimal',
                        includeThoughts: true,
                        googleSearch: false,
                        imageSearch: false,
                        batchSize: 2,
                        objectImageCount: 0,
                        characterImageCount: 0,
                        createdAt: 1710400010000,
                        updatedAt: 1710400030000,
                        startedAt: 1710400015000,
                        completedAt: 1710400020000,
                        lastPolledAt: 1710400030000,
                        hasImportablePayload: true,
                        importDiagnostic: 'extraction-failure',
                        importIssues: [
                            {
                                index: 0,
                                error: 'Model returned no image data (finish reason: STOP).',
                            },
                            {
                                index: 1,
                                error: 'Model returned no image data (finish reason: NO_IMAGE).',
                            },
                        ],
                        error: 'Model returned no image data (finish reason: STOP). (+1 more)',
                    },
                ]}
                getLineageActionLabel={(action) => action || 'root'}
                getImportedQueuedResultCount={() => 0}
                getImportedQueuedHistoryItems={() => []}
                activeImportedQueuedHistoryId={null}
                onImportAllQueuedJobs={vi.fn()}
                onPollAllQueuedJobs={vi.fn()}
                onPollQueuedJob={vi.fn()}
                onCancelQueuedJob={vi.fn()}
                onImportQueuedJob={vi.fn()}
                onOpenImportedQueuedJob={vi.fn()}
                onOpenLatestImportedQueuedJob={vi.fn()}
                onOpenImportedQueuedHistoryItem={vi.fn()}
                onRemoveQueuedJob={vi.fn()}
            />,
        );

        expect(markup).toContain('queued-batch-job-job-multi-issue-import-issues');
        expect(markup).toContain('queued-batch-job-job-multi-issue-import-issue-0');
        expect(markup).toContain('queued-batch-job-job-multi-issue-import-issue-1');
        expect(markup).toContain('#1');
        expect(markup).toContain('#2');
        expect(markup).toContain(
            'The request completed, but the model did not return image data. Model finish reason: completed without image output.',
        );
        expect(markup).toContain(
            'The request completed, but the model did not return image data. Model finish reason: completed without returning an image.',
        );
    });

    it('suppresses duplicate title guidance in embedded mode and keeps bottom breathing room', () => {
        const markup = renderToStaticMarkup(
            <QueuedBatchJobsPanel
                currentLanguage="en"
                surface="embedded"
                queueBatchConversationNotice="Queued batch jobs keep source lineage, but they do not send official multi-turn conversation history."
                queuedJobs={[
                    {
                        localId: 'job-embedded',
                        name: 'batches/job-embedded',
                        displayName: 'Embedded batch',
                        state: 'JOB_STATE_PENDING',
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
                        createdAt: 1710400000000,
                        updatedAt: 1710400000000,
                        startedAt: null,
                        completedAt: null,
                        lastPolledAt: null,
                        error: null,
                    },
                ]}
                getLineageActionLabel={(action) => action || 'root'}
                getImportedQueuedResultCount={() => 0}
                getImportedQueuedHistoryItems={() => []}
                activeImportedQueuedHistoryId={null}
                onImportAllQueuedJobs={vi.fn()}
                onPollAllQueuedJobs={vi.fn()}
                onPollQueuedJob={vi.fn()}
                onCancelQueuedJob={vi.fn()}
                onImportQueuedJob={vi.fn()}
                onOpenImportedQueuedJob={vi.fn()}
                onOpenLatestImportedQueuedJob={vi.fn()}
                onOpenImportedQueuedHistoryItem={vi.fn()}
                onRemoveQueuedJob={vi.fn()}
            />,
        );

        expect(markup).toContain('min-w-0 pb-4');
        expect(markup).toContain('queued-batch-panel-notice');
        expect(markup).toContain('Continuity note');
        expect(markup).not.toContain('queued-batch-panel-guidance');
        expect(markup).not.toContain(
            'Tracked official Gemini Batch API jobs stay here while pending or running. Batch API targets completion within 24 hours, but image jobs can continue until the service expires them after 48 hours.',
        );
    });

    it('renders every queue state label and localizes generation modes', () => {
        const markup = renderToStaticMarkup(
            <QueuedBatchJobsPanel
                currentLanguage="zh_TW"
                queueBatchConversationNotice={null}
                queuedJobs={
                    [
                        {
                            localId: 'job-pending',
                            name: 'batches/job-pending',
                            displayName: 'pending',
                            state: 'JOB_STATE_PENDING',
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
                            updatedAt: 1,
                            startedAt: null,
                            completedAt: null,
                            lastPolledAt: null,
                            error: null,
                        },
                        {
                            localId: 'job-running',
                            name: 'batches/job-running',
                            displayName: 'running',
                            state: 'JOB_STATE_RUNNING',
                            model: 'gemini-3.1-flash-image-preview',
                            prompt: 'Prompt',
                            generationMode: 'Follow-up Edit',
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
                            updatedAt: 1,
                            startedAt: 1,
                            completedAt: null,
                            lastPolledAt: null,
                            error: null,
                        },
                        {
                            localId: 'job-succeeded',
                            name: 'batches/job-succeeded',
                            displayName: 'succeeded',
                            state: 'JOB_STATE_SUCCEEDED',
                            model: 'gemini-3.1-flash-image-preview',
                            prompt: 'Prompt',
                            generationMode: 'Image to Image',
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
                            updatedAt: 1,
                            startedAt: 1,
                            completedAt: 1,
                            lastPolledAt: 1,
                            error: null,
                        },
                        {
                            localId: 'job-failed',
                            name: 'batches/job-failed',
                            displayName: 'failed',
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
                            updatedAt: 1,
                            startedAt: 1,
                            completedAt: 1,
                            lastPolledAt: 1,
                            error: null,
                        },
                        {
                            localId: 'job-cancelled',
                            name: 'batches/job-cancelled',
                            displayName: 'cancelled',
                            state: 'JOB_STATE_CANCELLED',
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
                            updatedAt: 1,
                            startedAt: 1,
                            completedAt: 1,
                            lastPolledAt: 1,
                            error: null,
                        },
                        {
                            localId: 'job-expired',
                            name: 'batches/job-expired',
                            displayName: 'expired',
                            state: 'JOB_STATE_EXPIRED',
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
                            updatedAt: 1,
                            startedAt: 1,
                            completedAt: 1,
                            lastPolledAt: 1,
                            error: null,
                        },
                    ] as any
                }
                getLineageActionLabel={(action) => action || 'root'}
                getImportedQueuedResultCount={() => 0}
                getImportedQueuedHistoryItems={() => []}
                activeImportedQueuedHistoryId={null}
                onImportAllQueuedJobs={vi.fn()}
                onPollAllQueuedJobs={vi.fn()}
                onPollQueuedJob={vi.fn()}
                onCancelQueuedJob={vi.fn()}
                onImportQueuedJob={vi.fn()}
                onOpenImportedQueuedJob={vi.fn()}
                onOpenLatestImportedQueuedJob={vi.fn()}
                onOpenImportedQueuedHistoryItem={vi.fn()}
                onRemoveQueuedJob={vi.fn()}
            />,
        );

        expect(markup).toContain('待處理');
        expect(markup).toContain('執行中');
        expect(markup).toContain('已完成');
        expect(markup).toContain('失敗');
        expect(markup).toContain('已取消');
        expect(markup).toContain('已過期');
        expect(markup).toContain('文生圖');
        expect(markup).toContain('後續編修');
        expect(markup).toContain('圖生圖');
        expect(markup).not.toContain('Text to Image');
        expect(markup).not.toContain('Follow-up Edit');
        expect(markup).not.toContain('Image to Image');
    });

    it('renders Editor Edit as the waiting-list mode label for editor-origin queue jobs', () => {
        const markup = renderToStaticMarkup(
            <QueuedBatchJobsPanel
                currentLanguage="ja"
                queueBatchConversationNotice={null}
                queuedJobs={[
                    {
                        localId: 'job-editor-edit',
                        name: 'batches/job-editor-edit',
                        displayName: 'Editor queue job',
                        state: 'JOB_STATE_PENDING',
                        model: 'gemini-3.1-flash-image-preview',
                        prompt: 'Queue editor edit',
                        generationMode: 'Editor Edit',
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
                        createdAt: 1710400000000,
                        updatedAt: 1710400000000,
                        startedAt: null,
                        completedAt: null,
                        lastPolledAt: null,
                        error: null,
                    },
                ]}
                getLineageActionLabel={() => 'root'}
                getImportedQueuedResultCount={() => 0}
                getImportedQueuedHistoryItems={() => []}
                activeImportedQueuedHistoryId={null}
                onImportAllQueuedJobs={vi.fn()}
                onPollAllQueuedJobs={vi.fn()}
                onPollQueuedJob={vi.fn()}
                onCancelQueuedJob={vi.fn()}
                onImportQueuedJob={vi.fn()}
                onOpenImportedQueuedJob={vi.fn()}
                onOpenLatestImportedQueuedJob={vi.fn()}
                onOpenImportedQueuedHistoryItem={vi.fn()}
                onRemoveQueuedJob={vi.fn()}
            />,
        );

        expect(markup).toContain('Editor Edit');
    });

    it('shows workflow guidance when no queued jobs are currently tracked', () => {
        const markup = renderToStaticMarkup(
            <QueuedBatchJobsPanel
                currentLanguage="en"
                queuedJobs={[]}
                surface="embedded"
                queueBatchConversationNotice={null}
                getLineageActionLabel={(action) => action || 'root'}
                getImportedQueuedResultCount={() => 0}
                getImportedQueuedHistoryItems={() => []}
                activeImportedQueuedHistoryId={null}
                onImportAllQueuedJobs={vi.fn()}
                onPollAllQueuedJobs={vi.fn()}
                onPollQueuedJob={vi.fn()}
                onCancelQueuedJob={vi.fn()}
                onImportQueuedJob={vi.fn()}
                onOpenImportedQueuedJob={vi.fn()}
                onOpenLatestImportedQueuedJob={vi.fn()}
                onOpenImportedQueuedHistoryItem={vi.fn()}
                onRemoveQueuedJob={vi.fn()}
            />,
        );

        expect(markup).toContain('queued-batch-panel-empty');
        expect(markup).toContain(
            'Check status here, import finished results into history when they are ready, then remove the entry when the workflow is done.',
        );
    });
});
