import { getBlockedSafetyCategories, resolveGenerationFailureInfo } from '../../utils/generationFailure';
import { extractGroundingDetails, type GroundingSource, type GroundingSupport } from './groundingExtraction';

export type BatchJobResponsePayload = {
    name: string;
    displayName: string;
    state: string;
    model: string;
    createTime?: string;
    updateTime?: string;
    startTime?: string;
    endTime?: string;
    error?: string | null;
    hasInlinedResponses: boolean;
    inlinedResponseCount?: number;
    batchStats?: BatchJobStatsPayload | null;
};

export type BatchJobStatsPayload = {
    requestCount: number;
    successfulRequestCount: number;
    failedRequestCount: number;
    pendingRequestCount: number;
};

export type BatchImportResultGrounding = {
    enabled: boolean;
    imageSearch?: boolean;
    webQueries?: string[];
    imageQueries?: string[];
    searchEntryPointAvailable?: boolean;
    searchEntryPointRenderedContent?: string;
    supports?: GroundingSupport[];
    sources?: GroundingSource[];
};

export type BatchImportResultPayload = {
    index: number;
    status: 'success' | 'failed';
    imageUrl?: string;
    text?: string;
    thoughts?: string;
    grounding?: BatchImportResultGrounding;
    sessionHints?: Record<string, unknown>;
    error?: string;
};

type ExtractedGeneratedContent = {
    imageUrl?: string;
    text?: string;
    thoughts?: string;
    imageMimeType?: string;
    imageDimensions?: { width: number; height: number } | null;
    thoughtSignaturePresent: boolean;
    thoughtSignature?: string;
    promptBlockReason?: string;
    finishReason?: string;
    safetyRatings?: any[];
    candidateCount?: number;
    partCount?: number;
    imagePartCount?: number;
    extractionIssue?: 'missing-candidates' | 'missing-parts' | 'no-image-data';
};

export function resolveBatchJobStateName(state: unknown): string {
    if (typeof state === 'string' && state.length > 0) {
        return state;
    }
    if (
        state &&
        typeof state === 'object' &&
        'name' in state &&
        typeof (state as { name?: unknown }).name === 'string'
    ) {
        return (state as { name: string }).name;
    }

    return 'JOB_STATE_PENDING';
}

function normalizeBatchJobModelName(model: unknown): string {
    const rawModel = String(model || '').trim();
    if (!rawModel) {
        return '';
    }

    return rawModel.replace(/^models\//, '');
}

function parseBatchStatCount(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.max(0, Math.floor(value));
    }

    if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
            return Math.max(0, Math.floor(parsed));
        }
    }

    return 0;
}

function serializeBatchJobStats(batchStats: any): BatchJobStatsPayload | null {
    if (!batchStats) {
        return null;
    }

    const requestCount = parseBatchStatCount(batchStats.requestCount);
    const successfulRequestCount = parseBatchStatCount(batchStats.successfulRequestCount);
    const failedRequestCount = parseBatchStatCount(batchStats.failedRequestCount);
    const pendingRequestCount = parseBatchStatCount(batchStats.pendingRequestCount);

    if (requestCount === 0 && successfulRequestCount === 0 && failedRequestCount === 0 && pendingRequestCount === 0) {
        return null;
    }

    return {
        requestCount,
        successfulRequestCount,
        failedRequestCount,
        pendingRequestCount,
    };
}

export function serializeBatchJob(batchJob: any): BatchJobResponsePayload {
    const inlinedResponses = Array.isArray(batchJob?.dest?.inlinedResponses) ? batchJob.dest.inlinedResponses : [];

    return {
        name: String(batchJob?.name || ''),
        displayName: String(batchJob?.displayName || batchJob?.name || 'Queued Batch Job'),
        state: resolveBatchJobStateName(batchJob?.state),
        model: normalizeBatchJobModelName(batchJob?.model),
        createTime: typeof batchJob?.createTime === 'string' ? batchJob.createTime : undefined,
        updateTime: typeof batchJob?.updateTime === 'string' ? batchJob.updateTime : undefined,
        startTime: typeof batchJob?.startTime === 'string' ? batchJob.startTime : undefined,
        endTime: typeof batchJob?.endTime === 'string' ? batchJob.endTime : undefined,
        error: batchJob?.error?.message || batchJob?.error?.details || null,
        inlinedResponseCount: inlinedResponses.length,
        batchStats: serializeBatchJobStats(batchJob?.batchStats),
        hasInlinedResponses: inlinedResponses.length > 0,
    };
}

function readBatchJobErrorMessage(error: any): string | undefined {
    if (typeof error === 'string' && error.trim().length > 0) {
        return error.trim();
    }
    if (typeof error?.message === 'string' && error.message.trim().length > 0) {
        return error.message.trim();
    }
    if (typeof error?.details === 'string' && error.details.trim().length > 0) {
        return error.details.trim();
    }

    return undefined;
}

function resolveGroundingMetadataReturned(response: any, groundingDetails: ReturnType<typeof extractGroundingDetails>) {
    const candidate = response?.candidates?.[0] ?? response?.response?.candidates?.[0];
    return (
        Boolean(candidate?.groundingMetadata || candidate?.grounding_metadata) ||
        groundingDetails.sources.length > 0 ||
        groundingDetails.webQueries.length > 0 ||
        groundingDetails.imageQueries.length > 0 ||
        groundingDetails.supports.length > 0 ||
        groundingDetails.searchEntryPointAvailable
    );
}

export function extractBatchImportResults(
    batchJob: any,
    extractGeneratedContent: (response: any) => ExtractedGeneratedContent,
): BatchImportResultPayload[] {
    const state = resolveBatchJobStateName(batchJob?.state);
    if (state !== 'JOB_STATE_SUCCEEDED') {
        return [];
    }

    const responses = Array.isArray(batchJob?.dest?.inlinedResponses) ? batchJob.dest.inlinedResponses : [];
    return responses.map((entry: any, index: number) => {
        if (entry?.response) {
            const extracted = extractGeneratedContent(entry.response);
            const groundingDetails = extractGroundingDetails(entry.response);
            const blockedSafetyCategories = getBlockedSafetyCategories(extracted.safetyRatings);
            const entryErrorMessage =
                readBatchJobErrorMessage(entry?.error) || readBatchJobErrorMessage(entry?.response?.error);
            const failure = extracted.imageUrl
                ? null
                : resolveGenerationFailureInfo({
                      explicitError: entryErrorMessage,
                      text: extracted.text,
                      thoughts: extracted.thoughts,
                      promptBlockReason: extracted.promptBlockReason,
                      finishReason: extracted.finishReason,
                      safetyRatings: extracted.safetyRatings,
                      extractionIssue: extracted.extractionIssue,
                  });
            return {
                index,
                status: extracted.imageUrl ? 'success' : 'failed',
                imageUrl: extracted.imageUrl,
                text: extracted.text,
                thoughts: extracted.thoughts,
                grounding: {
                    enabled:
                        groundingDetails.sources.length > 0 ||
                        groundingDetails.webQueries.length > 0 ||
                        groundingDetails.imageQueries.length > 0,
                    imageSearch: groundingDetails.imageQueries.length > 0,
                    webQueries: groundingDetails.webQueries,
                    imageQueries: groundingDetails.imageQueries,
                    searchEntryPointAvailable: groundingDetails.searchEntryPointAvailable,
                    searchEntryPointRenderedContent: groundingDetails.searchEntryPointRenderedContent,
                    supports: groundingDetails.supports,
                    sources: groundingDetails.sources,
                },
                sessionHints: {
                    groundingMetadataReturned: resolveGroundingMetadataReturned(entry.response, groundingDetails),
                    textReturned: Boolean(extracted.text),
                    thoughtsReturned: Boolean(extracted.thoughts),
                    thoughtSignatureReturned: extracted.thoughtSignaturePresent,
                    thoughtSignature: extracted.thoughtSignature,
                    promptBlockReason: extracted.promptBlockReason,
                    finishReason: extracted.finishReason,
                    safetyRatingsReturned: Array.isArray(extracted.safetyRatings) ? extracted.safetyRatings.length : 0,
                    blockedSafetyCategories,
                    extractionIssue: extracted.extractionIssue,
                    candidateCount: extracted.candidateCount ?? 0,
                    partCount: extracted.partCount ?? 0,
                    imagePartCount: extracted.imagePartCount ?? 0,
                    entryErrorPresent: Boolean(entryErrorMessage),
                    entryErrorMessage,
                    actualImageWidth: extracted.imageDimensions?.width,
                    actualImageHeight: extracted.imageDimensions?.height,
                    actualImageMimeType: extracted.imageMimeType,
                    actualImageDimensions: extracted.imageDimensions
                        ? `${extracted.imageDimensions.width}x${extracted.imageDimensions.height}`
                        : undefined,
                    sourcesReturned: groundingDetails.sources.length,
                    webQueriesReturned: groundingDetails.webQueries.length,
                    imageQueriesReturned: groundingDetails.imageQueries.length,
                    groundingSupportsReturned: groundingDetails.supports.length,
                },
                error: failure?.message,
            };
        }

        const entryErrorMessage = readBatchJobErrorMessage(entry?.error);

        return {
            index,
            status: 'failed',
            sessionHints: {
                entryErrorPresent: Boolean(entryErrorMessage),
                entryErrorMessage,
            },
            error: entryErrorMessage || 'Batch request failed.',
        };
    });
}
