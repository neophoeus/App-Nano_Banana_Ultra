import { describe, expect, it } from 'vitest';
import { buildStageErrorState, resolveGenerationFailureInfo } from '../utils/generationFailure';

const translations: Record<string, string> = {
    generationFailureSummaryUnknown: 'Unknown failure summary',
    generationFailureSummaryPolicy: 'Policy failure summary',
    generationFailureSummarySafety: 'Safety failure summary',
    generationFailureSummaryTextOnly: 'Text-only failure summary',
    generationFailureSummaryEmpty: 'Insufficient signal failure summary',
    generationFailureSummaryNoImage: 'No-image failure summary',
    generationFailureDetailRetry: 'Retry detail',
    generationFailureDetailPromptBlockReason: 'Policy block reason: {0}.',
    generationFailureDetailSafetyCategories: 'Safety categories: {0}.',
    generationFailureDetailTextOnly: 'Returned text but no image bytes.',
    generationFailureDetailThoughtsOnly: 'Only thought summaries were returned; no image bytes were emitted.',
    generationFailureDetailMissingCandidates: 'Missing candidates detail.',
    generationFailureDetailMissingParts: 'Missing parts detail.',
    generationFailureDetailPossibleBatchSafetySuppression: 'Possible batch safety suppression detail.',
    generationFailureDetailFinishReason: 'Finish reason: {0}.',
};

const t = (key: string) => translations[key] || key;

describe('generationFailure helpers', () => {
    it('classifies text-only model responses before falling back to generic no-image errors', () => {
        const failure = resolveGenerationFailureInfo({
            text: 'Only text came back.',
            finishReason: 'STOP',
            extractionIssue: 'no-image-data',
        });

        expect(failure).toEqual(
            expect.objectContaining({
                code: 'text-only',
                message: 'Model returned text-only content instead of image data.',
                returnedTextContent: true,
            }),
        );
    });

    it('classifies thoughts-only responses as no-image-data while preserving thought-content signal', () => {
        const failure = resolveGenerationFailureInfo({
            thoughts: 'Only thoughts came back.',
            finishReason: 'STOP',
            extractionIssue: 'no-image-data',
        });

        expect(failure).toEqual(
            expect.objectContaining({
                code: 'no-image-data',
                message: 'Model returned no image data.',
                returnedTextContent: false,
                returnedThoughtContent: true,
            }),
        );
    });

    it('uses distinct stage copy for visible text-only and thoughts-only failures', () => {
        const visibleTextFailure = resolveGenerationFailureInfo({
            text: 'Visible text came back.',
            finishReason: 'STOP',
            extractionIssue: 'no-image-data',
        });
        const thoughtsOnlyFailure = resolveGenerationFailureInfo({
            thoughts: 'Only thoughts came back.',
            finishReason: 'STOP',
            extractionIssue: 'no-image-data',
        });

        const visibleTextStageError = buildStageErrorState(t, visibleTextFailure, null);
        const thoughtsOnlyStageError = buildStageErrorState(t, thoughtsOnlyFailure, null);

        expect(visibleTextStageError.summary).toBe('Text-only failure summary');
        expect(thoughtsOnlyStageError.summary).toBe('No-image failure summary');
        expect(thoughtsOnlyStageError.detail).toContain(
            'Only thought summaries were returned; no image bytes were emitted.',
        );
        expect(thoughtsOnlyStageError.detail).toContain('Finish reason: STOP.');
        expect(thoughtsOnlyStageError.detail).toContain('Retry detail');
        expect(thoughtsOnlyStageError.summary).not.toBe(visibleTextStageError.summary);
    });

    it('builds localized empty-response stage copy from failure metadata', () => {
        const stageError = buildStageErrorState(
            t,
            {
                code: 'empty-response',
                message: 'Model returned a response without candidates.',
                extractionIssue: 'missing-candidates',
            },
            null,
        );

        expect(stageError.summary).toBe('Insufficient signal failure summary');
        expect(stageError.detail).toContain('Missing candidates detail.');
        expect(stageError.detail).toContain('Retry detail');
    });

    it('adds a contextual batch-safety note without changing the empty-response code', () => {
        const stageError = buildStageErrorState(
            t,
            {
                code: 'empty-response',
                message: 'Model returned a candidate without content parts.',
                extractionIssue: 'missing-parts',
            },
            null,
            {
                hasSiblingSafetyBlockedFailure: true,
            },
        );

        expect(stageError.summary).toBe('Insufficient signal failure summary');
        expect(stageError.detail).toContain('Missing parts detail.');
        expect(stageError.detail).toContain('Possible batch safety suppression detail.');
        expect(stageError.failure?.code).toBe('empty-response');
    });

    it('classifies IMAGE_SAFETY finish reasons as safety-blocked before missing-parts fallback', () => {
        const failure = resolveGenerationFailureInfo({
            finishReason: 'IMAGE_SAFETY',
            extractionIssue: 'missing-parts',
        });

        expect(failure).toEqual(
            expect.objectContaining({
                code: 'safety-blocked',
                message: 'Model output was blocked by safety filters.',
                finishReason: 'IMAGE_SAFETY',
                extractionIssue: 'missing-parts',
            }),
        );
    });

    it('treats IMAGE_OTHER as no-image-data even when the extracted candidate has no parts', () => {
        const failure = resolveGenerationFailureInfo({
            finishReason: 'IMAGE_OTHER',
            extractionIssue: 'missing-parts',
        });

        expect(failure).toEqual(
            expect.objectContaining({
                code: 'no-image-data',
                message: 'Model returned no image data (finish reason: IMAGE_OTHER).',
                finishReason: 'IMAGE_OTHER',
                extractionIssue: 'missing-parts',
            }),
        );
    });

    it('keeps STOP plus missing-parts on the insufficient-signal path', () => {
        const failure = resolveGenerationFailureInfo({
            finishReason: 'STOP',
            extractionIssue: 'missing-parts',
        });

        expect(failure).toEqual(
            expect.objectContaining({
                code: 'empty-response',
                message: 'Model returned a candidate without content parts.',
                finishReason: 'STOP',
                extractionIssue: 'missing-parts',
            }),
        );
    });

    it('keeps missing-parts on the insufficient-signal path when no finish reason is provided', () => {
        const failure = resolveGenerationFailureInfo({
            extractionIssue: 'missing-parts',
        });

        expect(failure).toEqual(
            expect.objectContaining({
                code: 'empty-response',
                message: 'Model returned a candidate without content parts.',
                extractionIssue: 'missing-parts',
            }),
        );
    });

    it('shows the finish reason when a safety block has no explicit category list', () => {
        const stageError = buildStageErrorState(
            t,
            {
                code: 'safety-blocked',
                message: 'Model output was blocked by safety filters.',
                finishReason: 'IMAGE_SAFETY',
            },
            null,
        );

        expect(stageError.summary).toBe('Safety failure summary');
        expect(stageError.detail).toContain('Finish reason: IMAGE_SAFETY.');
        expect(stageError.detail).toContain('Retry detail');
    });
});
