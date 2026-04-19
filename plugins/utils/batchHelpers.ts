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
    responseFileName?: string;
    hasImportablePayload: boolean;
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
    const responseFileName =
        typeof batchJob?.dest?.fileName === 'string' && batchJob.dest.fileName.trim().length > 0
            ? batchJob.dest.fileName
            : undefined;

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
        responseFileName,
        inlinedResponseCount: inlinedResponses.length,
        batchStats: serializeBatchJobStats(batchJob?.batchStats),
        hasImportablePayload: inlinedResponses.length > 0 || Boolean(responseFileName),
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

function resolveBatchResultIndexFromRequestKey(key: unknown, fallbackIndex: number): number {
    if (typeof key !== 'string') {
        return fallbackIndex;
    }

    const match = key.match(/(\d+)$/u);
    if (!match) {
        return fallbackIndex;
    }

    const parsedIndex = Number(match[1]);
    if (!Number.isFinite(parsedIndex) || parsedIndex <= 0) {
        return fallbackIndex;
    }

    return parsedIndex - 1;
}

function looksLikeGenerateContentResponse(value: unknown): boolean {
    return Boolean(
        value &&
            typeof value === 'object' &&
            ('candidates' in value || 'promptFeedback' in value || 'usageMetadata' in value || 'responseId' in value),
    );
}

function looksLikeBatchStatusObject(value: unknown): boolean {
    return Boolean(
        value &&
            typeof value === 'object' &&
            ('error' in value || 'message' in value || 'code' in value || 'details' in value),
    );
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

function buildBatchImportResultFromResponse(
    response: any,
    index: number,
    extractGeneratedContent: (response: any) => ExtractedGeneratedContent,
    options?: { requestKey?: string; entryErrorMessage?: string },
): BatchImportResultPayload {
    const extracted = extractGeneratedContent(response);
    const groundingDetails = extractGroundingDetails(response);
    const blockedSafetyCategories = getBlockedSafetyCategories(extracted.safetyRatings);
    const failure = extracted.imageUrl
        ? null
        : resolveGenerationFailureInfo({
              explicitError: options?.entryErrorMessage,
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
            requestKey: options?.requestKey,
            groundingMetadataReturned: resolveGroundingMetadataReturned(response, groundingDetails),
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
            entryErrorPresent: Boolean(options?.entryErrorMessage),
            entryErrorMessage: options?.entryErrorMessage,
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

function extractBatchImportResultsFromJsonlContent(
    jsonlContent: string,
    extractGeneratedContent: (response: any) => ExtractedGeneratedContent,
): BatchImportResultPayload[] {
    return jsonlContent
        .split(/\r?\n/u)
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line, lineIndex) => {
            try {
                const parsedLine = JSON.parse(line) as Record<string, unknown>;
                const requestKey = typeof parsedLine.key === 'string' ? parsedLine.key : undefined;
                const index = resolveBatchResultIndexFromRequestKey(requestKey, lineIndex);
                const responsePayload =
                    parsedLine.response ?? (looksLikeGenerateContentResponse(parsedLine) ? parsedLine : null);

                if (responsePayload) {
                    return buildBatchImportResultFromResponse(responsePayload, index, extractGeneratedContent, {
                        requestKey,
                        entryErrorMessage: readBatchJobErrorMessage(parsedLine.error),
                    });
                }

                const errorPayload =
                    parsedLine.error ?? (looksLikeBatchStatusObject(parsedLine) ? parsedLine : { message: undefined });
                const entryErrorMessage = readBatchJobErrorMessage(errorPayload);

                return {
                    index,
                    status: 'failed',
                    sessionHints: {
                        requestKey,
                        entryErrorPresent: Boolean(entryErrorMessage),
                        entryErrorMessage,
                        rawLineType: looksLikeBatchStatusObject(errorPayload) ? 'status' : 'unknown',
                    },
                    error: entryErrorMessage || 'Batch request failed.',
                };
            } catch (error: any) {
                const message = error?.message || 'Failed to parse batch result line.';
                return {
                    index: lineIndex,
                    status: 'failed',
                    sessionHints: {
                        entryErrorPresent: true,
                        entryErrorMessage: message,
                        rawLineType: 'invalid-json',
                    },
                    error: message,
                };
            }
        })
        .sort((left, right) => left.index - right.index);
}

export function extractBatchImportResults(
    batchJob: any,
    extractGeneratedContent: (response: any) => ExtractedGeneratedContent,
    jsonlContent?: string,
): BatchImportResultPayload[] {
    const state = resolveBatchJobStateName(batchJob?.state);
    if (state !== 'JOB_STATE_SUCCEEDED') {
        return [];
    }

    if (typeof jsonlContent === 'string') {
        return extractBatchImportResultsFromJsonlContent(jsonlContent, extractGeneratedContent);
    }

    const responses = Array.isArray(batchJob?.dest?.inlinedResponses) ? batchJob.dest.inlinedResponses : [];
    return responses.map((entry: any, index: number) => {
        if (entry?.response) {
            const entryErrorMessage =
                readBatchJobErrorMessage(entry?.error) || readBatchJobErrorMessage(entry?.response?.error);
            return buildBatchImportResultFromResponse(entry.response, index, extractGeneratedContent, {
                entryErrorMessage,
            });
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
