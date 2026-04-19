import { describe, expect, it } from 'vitest';
import { extractBatchImportResults, serializeBatchJob } from '../plugins/utils/batchHelpers';

describe('serializeBatchJob', () => {
    it('keeps official batchStats counts for queue diagnostics', () => {
        const serialized = serializeBatchJob({
            name: 'batches/test-job',
            displayName: 'Queued image batch',
            state: 'JOB_STATE_RUNNING',
            model: 'gemini-3.1-flash-image-preview',
            batchStats: {
                requestCount: '4',
                successfulRequestCount: '1',
                failedRequestCount: '1',
                pendingRequestCount: '2',
            },
            dest: {
                inlinedResponses: [],
            },
        });

        expect(serialized.batchStats).toEqual({
            requestCount: 4,
            successfulRequestCount: 1,
            failedRequestCount: 1,
            pendingRequestCount: 2,
        });
        expect(serialized.hasImportablePayload).toBe(false);
    });

    it('normalizes model resource names returned by the batch list API', () => {
        const serialized = serializeBatchJob({
            name: 'batches/test-job-prefixed-model',
            displayName: 'Queued image batch',
            state: 'JOB_STATE_RUNNING',
            model: 'models/gemini-3.1-flash-image-preview',
            dest: {
                inlinedResponses: [],
            },
        });

        expect(serialized.model).toBe('gemini-3.1-flash-image-preview');
    });

    it('marks jobs with inline responses as having importable payload candidates', () => {
        const serialized = serializeBatchJob({
            name: 'batches/test-job-inline',
            displayName: 'Queued inline batch',
            state: 'JOB_STATE_SUCCEEDED',
            model: 'gemini-3.1-flash-image-preview',
            dest: {
                inlinedResponses: [{ response: { candidates: [] } }],
            },
        });

        expect(serialized.hasImportablePayload).toBe(true);
        expect(serialized.inlinedResponseCount).toBe(1);
    });

    it('preserves inline response count even when official batchStats are absent', () => {
        const serialized = serializeBatchJob({
            name: 'batches/test-job-inline-count-only',
            displayName: 'Queued inline batch count only',
            state: 'JOB_STATE_SUCCEEDED',
            model: 'gemini-3.1-flash-image-preview',
            dest: {
                inlinedResponses: [{ response: {} }, { response: {} }],
            },
        });

        expect(serialized.batchStats).toBeNull();
        expect(serialized.hasImportablePayload).toBe(true);
        expect(serialized.inlinedResponseCount).toBe(2);
    });

    it('marks jobs with response files as importable payload candidates', () => {
        const serialized = serializeBatchJob({
            name: 'batches/test-job-file',
            displayName: 'Queued file batch',
            state: 'JOB_STATE_SUCCEEDED',
            model: 'gemini-3.1-flash-image-preview',
            dest: {
                fileName: 'files/batch-results',
            },
        });

        expect(serialized.responseFileName).toBe('files/batch-results');
        expect(serialized.hasImportablePayload).toBe(true);
        expect(serialized.inlinedResponseCount).toBe(0);
    });
});

describe('extractBatchImportResults', () => {
    it('reports extraction failures separately when inline responses contain no image data', () => {
        const results = extractBatchImportResults(
            {
                state: 'JOB_STATE_SUCCEEDED',
                dest: {
                    inlinedResponses: [{ response: { candidates: [{ content: { parts: [] } }] } }],
                },
            },
            () => ({
                text: 'Narration only',
                thoughts: 'Need another render pass',
                thoughtSignaturePresent: false,
            }),
        );

        expect(results).toEqual([
            expect.objectContaining({
                index: 0,
                status: 'failed',
                text: 'Narration only',
                thoughts: 'Need another render pass',
                error: 'Model returned text-only content instead of image data.',
                sessionHints: expect.objectContaining({
                    textReturned: true,
                    thoughtsReturned: true,
                }),
            }),
        ]);
    });

    it('surfaces malformed response diagnostics when a batch entry has no candidates', () => {
        const results = extractBatchImportResults(
            {
                state: 'JOB_STATE_SUCCEEDED',
                dest: {
                    inlinedResponses: [{ response: {} }],
                },
            },
            () => ({
                thoughtSignaturePresent: false,
                candidateCount: 0,
                partCount: 0,
                imagePartCount: 0,
                extractionIssue: 'missing-candidates',
            }),
        );

        expect(results).toEqual([
            expect.objectContaining({
                index: 0,
                status: 'failed',
                error: 'Model returned a response without candidates.',
                sessionHints: expect.objectContaining({
                    extractionIssue: 'missing-candidates',
                    candidateCount: 0,
                    partCount: 0,
                    imagePartCount: 0,
                }),
            }),
        ]);
    });

    it('surfaces prompt block reasons when the model rejects the prompt before returning candidates', () => {
        const results = extractBatchImportResults(
            {
                state: 'JOB_STATE_SUCCEEDED',
                dest: {
                    inlinedResponses: [{ response: {} }],
                },
            },
            () => ({
                thoughtSignaturePresent: false,
                promptBlockReason: 'PROHIBITED_CONTENT',
                candidateCount: 0,
                partCount: 0,
                imagePartCount: 0,
                extractionIssue: 'missing-candidates',
            }),
        );
        expect(results).toEqual([
            expect.objectContaining({
                index: 0,
                status: 'failed',
                error: 'Prompt was rejected by policy (block reason: PROHIBITED_CONTENT).',
                sessionHints: expect.objectContaining({
                    promptBlockReason: 'PROHIBITED_CONTENT',
                    extractionIssue: 'missing-candidates',
                }),
            }),
        ]);
    });

    it('surfaces blocked safety categories when the model returns a safety-filtered candidate without images', () => {
        const results = extractBatchImportResults(
            {
                state: 'JOB_STATE_SUCCEEDED',
                dest: {
                    inlinedResponses: [{ response: { candidates: [{ content: { parts: [] } }] } }],
                },
            },
            () => ({
                thoughtSignaturePresent: false,
                finishReason: 'STOP',
                candidateCount: 1,
                partCount: 0,
                imagePartCount: 0,
                extractionIssue: 'missing-parts',
                safetyRatings: [
                    {
                        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                        probability: 'HIGH',
                    },
                ],
            }),
        );

        expect(results).toEqual([
            expect.objectContaining({
                index: 0,
                status: 'failed',
                error: 'Model output was blocked by safety filters (sexually explicit).',
                sessionHints: expect.objectContaining({
                    blockedSafetyCategories: ['sexually explicit'],
                    safetyRatingsReturned: 1,
                    extractionIssue: 'missing-parts',
                }),
            }),
        ]);
    });

    it('surfaces NO_IMAGE finish reasons when the model completes without any image parts', () => {
        const results = extractBatchImportResults(
            {
                state: 'JOB_STATE_SUCCEEDED',
                dest: {
                    inlinedResponses: [{ response: { candidates: [{ content: {} }] } }],
                },
            },
            () => ({
                thoughtSignaturePresent: false,
                finishReason: 'NO_IMAGE',
                candidateCount: 1,
                partCount: 0,
                imagePartCount: 0,
                extractionIssue: 'missing-parts',
            }),
        );

        expect(results).toEqual([
            expect.objectContaining({
                index: 0,
                status: 'failed',
                error: 'Model returned no image data (finish reason: NO_IMAGE).',
                sessionHints: expect.objectContaining({
                    finishReason: 'NO_IMAGE',
                    extractionIssue: 'missing-parts',
                }),
            }),
        ]);
    });

    it('surfaces IMAGE_OTHER finish reasons instead of falling back to empty-response when candidates have no parts', () => {
        const results = extractBatchImportResults(
            {
                state: 'JOB_STATE_SUCCEEDED',
                dest: {
                    inlinedResponses: [{ response: { candidates: [{ content: {} }] } }],
                },
            },
            () => ({
                thoughtSignaturePresent: false,
                finishReason: 'IMAGE_OTHER',
                candidateCount: 1,
                partCount: 0,
                imagePartCount: 0,
                extractionIssue: 'missing-parts',
            }),
        );

        expect(results).toEqual([
            expect.objectContaining({
                index: 0,
                status: 'failed',
                error: 'Model returned no image data (finish reason: IMAGE_OTHER).',
                sessionHints: expect.objectContaining({
                    finishReason: 'IMAGE_OTHER',
                    extractionIssue: 'missing-parts',
                }),
            }),
        ]);
    });

    it('returns explicit per-entry batch errors when no response payload is present', () => {
        const results = extractBatchImportResults(
            {
                state: 'JOB_STATE_SUCCEEDED',
                dest: {
                    inlinedResponses: [{ error: { message: 'The batch request entry failed upstream.' } }],
                },
            },
            () => ({
                thoughtSignaturePresent: false,
            }),
        );

        expect(results).toEqual([
            expect.objectContaining({
                index: 0,
                status: 'failed',
                error: 'The batch request entry failed upstream.',
                sessionHints: expect.objectContaining({
                    entryErrorPresent: true,
                    entryErrorMessage: 'The batch request entry failed upstream.',
                }),
            }),
        ]);
    });

    it('parses file-backed JSONL batch results that mix responses and per-request errors', () => {
        const results = extractBatchImportResults(
            {
                state: 'JOB_STATE_SUCCEEDED',
                dest: {
                    fileName: 'files/batch-results',
                },
            },
            () => ({
                imageUrl: 'data:image/png;base64,CCC',
                text: 'Imported from JSONL result file',
                thoughtSignaturePresent: false,
            }),
            [
                JSON.stringify({ key: 'request-2', response: { candidates: [{ content: { parts: [] } }] } }),
                JSON.stringify({ key: 'request-1', error: { message: 'The first request failed upstream.' } }),
            ].join('\n'),
        );

        expect(results).toEqual([
            expect.objectContaining({
                index: 0,
                status: 'failed',
                error: 'The first request failed upstream.',
                sessionHints: expect.objectContaining({
                    requestKey: 'request-1',
                    entryErrorMessage: 'The first request failed upstream.',
                }),
            }),
            expect.objectContaining({
                index: 1,
                status: 'success',
                imageUrl: 'data:image/png;base64,CCC',
                text: 'Imported from JSONL result file',
                sessionHints: expect.objectContaining({
                    requestKey: 'request-2',
                }),
            }),
        ]);
    });
});
