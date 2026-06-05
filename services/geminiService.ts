import {
    DEFAULT_SAFETY_THRESHOLDS,
    GenerateOptions,
    GenerateResponse,
    ImageReceivedResult,
    QueuedBatchJobStats,
    ResultPart,
    ResultImagePart,
    type SafetyThresholds,
} from '../types';
import {
    attachGenerationFailure,
    getGenerationFailure,
    normalizeGenerationFailureInfo,
} from '../utils/generationFailure';
import {
    isLiveProgressFanOutEligibleRequest,
    isLiveProgressEligibleRequest,
    LiveProgressStreamTruthSummary,
} from '../utils/liveProgressCapabilities';
import {
    DEBUG_TERMINAL_REQUEST_ID_HEADER,
    createDebugTerminalCorrelationId,
    emitDebugTerminalEvent,
    summarizeDebugTerminalPayload,
    type DebugTerminalSource,
} from '../utils/debugTerminalEvents';
import { buildStyleAwareImagePrompt } from '../utils/stylePromptBuilder';
import { Language } from '../utils/translations';

const jsonHeaders = {
    'Content-Type': 'application/json',
};

type DebugRequestContext<TResponse = unknown> = {
    source: DebugTerminalSource;
    route?: string;
    endpoint?: string;
    method?: string;
    operation: string;
    phase?: string;
    correlationId?: string;
    requestLabel?: string;
    requestSummary?: string;
    requestPayload?: unknown;
    responseLabel?: string;
    responseSummary?: string | ((payload: TResponse) => string | undefined);
    responsePayload?: unknown | ((payload: TResponse) => unknown);
    errorLabel?: string;
};

type ImageGenerateRequestBody = {
    prompt: string;
    model: GenerateOptions['model'];
    aspectRatio: GenerateOptions['aspectRatio'];
    imageSize: GenerateOptions['imageSize'] | undefined;
    editingInput: GenerateOptions['editingInput'];
    objectImageInputs: GenerateOptions['objectImageInputs'];
    characterImageInputs: GenerateOptions['characterImageInputs'];
    outputFormat: GenerateOptions['outputFormat'];
    temperature: GenerateOptions['temperature'];
    thinkingLevel: GenerateOptions['thinkingLevel'];
    includeThoughts: GenerateOptions['includeThoughts'];
    googleSearch: GenerateOptions['googleSearch'];
    imageSearch: GenerateOptions['imageSearch'];
    safetyThresholds: GenerateOptions['safetyThresholds'];
    executionMode: GenerateOptions['executionMode'];
    conversationContext: GenerateOptions['conversationContext'];
};

function isAbortLikeError(error: unknown): boolean {
    return (
        (error instanceof DOMException && error.name === 'AbortError') ||
        (error instanceof Error && error.message === 'ABORTED')
    );
}

const resolveRequestPath = (input: RequestInfo | URL): string => {
    if (typeof input === 'string') {
        return input;
    }

    if (input instanceof URL) {
        return input.toString();
    }

    return input.url;
};

const buildHeaderRecord = (headers?: HeadersInit): Record<string, string> => {
    if (!headers) {
        return {};
    }

    if (headers instanceof Headers) {
        return Object.fromEntries(headers.entries());
    }

    if (Array.isArray(headers)) {
        return Object.fromEntries(headers);
    }

    return { ...headers };
};

const withDebugRequestHeaders = (headers: HeadersInit | undefined, correlationId: string): Record<string, string> => ({
    ...buildHeaderRecord(headers),
    [DEBUG_TERMINAL_REQUEST_ID_HEADER]: correlationId,
});

const buildDebugResponseSummary = (response: {
    imageUrl?: string;
    text?: string;
    thoughts?: string;
    resultParts?: ResultPart[];
    failure?: GenerateResponse['failure'];
}): string =>
    [
        response.imageUrl ? 'image' : null,
        response.text ? 'text' : null,
        response.thoughts ? 'thoughts' : null,
        response.resultParts?.length ? `${response.resultParts.length} part(s)` : null,
        response.failure?.code ? `failure:${response.failure.code}` : null,
    ]
        .filter(Boolean)
        .join(' | ') || 'no output content';

const buildTextResponseSummary = (text?: string | null): string => {
    const trimmed = text?.trim();
    return trimmed ? `${trimmed.length} chars` : 'empty text';
};

const buildErrorSummary = (error: unknown): string => {
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    const failure = getGenerationFailure(normalizedError);

    return failure ? `${normalizedError.message} (${failure.code})` : normalizedError.message;
};

const emitServiceDebugEvent = ({
    kind,
    label,
    context,
    summary,
    payload,
    status,
    durationMs,
    sessionId,
    batchSessionId,
    slotIndex,
    jobName,
}: {
    kind: 'request' | 'response' | 'error' | 'stream' | 'retry' | 'log';
    label: string;
    context: DebugRequestContext<any> & { source: DebugTerminalSource; operation: string };
    summary?: string;
    payload?: unknown;
    status?: number;
    durationMs?: number;
    sessionId?: string;
    batchSessionId?: string;
    slotIndex?: number;
    jobName?: string;
}) => {
    const route = context.route || context.endpoint;
    emitDebugTerminalEvent({
        kind,
        label,
        source: context.source,
        route,
        endpoint: context.endpoint || route,
        method: context.method || 'GET',
        operation: context.operation,
        phase: context.phase,
        correlationId: context.correlationId,
        status,
        durationMs,
        sessionId,
        batchSessionId,
        slotIndex,
        jobName,
        summary,
        payload,
    });
};

const buildImageGenerateRequestBody = (options: GenerateOptions, finalPrompt: string): ImageGenerateRequestBody => ({
    prompt: finalPrompt,
    model: options.model,
    aspectRatio: options.aspectRatio,
    imageSize: options.model === 'gemini-2.5-flash-image' ? undefined : options.imageSize,
    editingInput: options.editingInput,
    objectImageInputs: options.objectImageInputs,
    characterImageInputs: options.characterImageInputs,
    outputFormat: options.outputFormat,
    temperature: options.temperature,
    thinkingLevel: options.thinkingLevel,
    includeThoughts: options.includeThoughts,
    googleSearch: options.googleSearch,
    imageSearch: options.imageSearch,
    safetyThresholds: options.safetyThresholds,
    executionMode: options.executionMode,
    conversationContext: options.conversationContext,
});

const buildGenerateRequestSummary = (requestBody: ImageGenerateRequestBody, imgIndex: number): string =>
    `Image #${imgIndex} | ${requestBody.model} | ${requestBody.executionMode || 'single-turn'} | ${requestBody.outputFormat || 'images-only'}`;

const buildStreamPartSummary = (part: ResultPart): string =>
    part.kind === 'thought-text' || part.kind === 'output-text'
        ? `${part.kind} #${part.sequence + 1}`
        : `${part.kind} #${part.sequence + 1} (${(part as ResultImagePart).mimeType})`;

const buildBatchJobSummary = (job: RemoteQueuedBatchJob): string =>
    [job.state, job.model, job.hasImportablePayload ? 'importable' : null].filter(Boolean).join(' | ');

const buildQueuedBatchImportSummary = (payload: { results: QueuedBatchImportResult[] }): string => {
    const successCount = payload.results.filter((result) => result.status === 'success').length;
    const failureCount = payload.results.length - successCount;
    return `${payload.results.length} result(s) | ${successCount} success | ${failureCount} failure`;
};

async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit, debugContext?: DebugRequestContext<T>): Promise<T> {
    const route = debugContext?.route || resolveRequestPath(input);
    const method = debugContext?.method || init?.method || 'GET';
    const correlationId = debugContext?.correlationId || createDebugTerminalCorrelationId('req');
    const startTime = Date.now();
    let response: Response;

    if (debugContext) {
        emitServiceDebugEvent({
            kind: 'request',
            label: debugContext.requestLabel || `${debugContext.operation} request`,
            context: {
                ...debugContext,
                route,
                endpoint: debugContext.endpoint || route,
                method,
                correlationId,
            },
            summary: debugContext.requestSummary,
            payload: debugContext.requestPayload,
        });
    }

    try {
        response = await fetch(input, {
            ...init,
            headers: withDebugRequestHeaders(init?.headers, correlationId),
        });
    } catch (error) {
        if (isAbortLikeError(error)) {
            if (debugContext) {
                emitServiceDebugEvent({
                    kind: 'log',
                    label: debugContext.errorLabel || `${debugContext.operation} aborted`,
                    context: {
                        ...debugContext,
                        route,
                        endpoint: debugContext.endpoint || route,
                        method,
                        correlationId,
                        phase: 'abort',
                    },
                    summary: 'Request aborted',
                    durationMs: Date.now() - startTime,
                    payload: { reason: 'ABORTED' },
                });
            }
            throw new Error('ABORTED');
        }

        if (debugContext) {
            emitServiceDebugEvent({
                kind: 'error',
                label: debugContext.errorLabel || `${debugContext.operation} failed`,
                context: {
                    ...debugContext,
                    route,
                    endpoint: debugContext.endpoint || route,
                    method,
                    correlationId,
                },
                summary: buildErrorSummary(error),
                durationMs: Date.now() - startTime,
                payload: { error },
            });
        }
        throw error;
    }

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
        const errorMessage =
            payload && typeof payload.error === 'string'
                ? payload.error
                : `Request failed with status ${response.status}`;
        const requestError = new Error(errorMessage) as Error & {
            status?: number;
        };
        requestError.name = 'ApiRequestError';
        requestError.status = response.status;

        const failure = normalizeGenerationFailureInfo(payload?.failure);
        if (debugContext) {
            emitServiceDebugEvent({
                kind: 'error',
                label: debugContext.errorLabel || `${debugContext.operation} failed`,
                context: {
                    ...debugContext,
                    route,
                    endpoint: debugContext.endpoint || route,
                    method,
                    correlationId,
                },
                summary: buildErrorSummary(failure ? attachGenerationFailure(new Error(requestError.message), failure) : requestError),
                status: response.status,
                durationMs: Date.now() - startTime,
                payload: {
                    error: requestError,
                    failure,
                    responsePayload: payload,
                },
            });
        }
        if (failure) {
            throw attachGenerationFailure(requestError, failure);
        }

        throw requestError;
    }

    if (debugContext) {
        emitServiceDebugEvent({
            kind: 'response',
            label: debugContext.responseLabel || `${debugContext.operation} response`,
            context: {
                ...debugContext,
                route,
                endpoint: debugContext.endpoint || route,
                method,
                correlationId,
            },
            status: response.status,
            durationMs: Date.now() - startTime,
            summary:
                typeof debugContext.responseSummary === 'function'
                    ? debugContext.responseSummary(payload as T)
                    : debugContext.responseSummary,
            payload:
                typeof debugContext.responsePayload === 'function'
                    ? debugContext.responsePayload(payload as T)
                    : debugContext.responsePayload ?? payload,
        });
    }

    return payload as T;
}

async function fetchNdjson<T>(
    input: RequestInfo | URL,
    init: RequestInit | undefined,
    onEvent: (event: T) => void,
    debugContext?: DebugRequestContext,
): Promise<void> {
    const route = debugContext?.route || resolveRequestPath(input);
    const method = debugContext?.method || init?.method || 'GET';
    const correlationId = debugContext?.correlationId || createDebugTerminalCorrelationId('stream');
    const startTime = Date.now();
    let response: Response;

    if (debugContext) {
        emitServiceDebugEvent({
            kind: 'request',
            label: debugContext.requestLabel || `${debugContext.operation} request`,
            context: {
                ...debugContext,
                route,
                endpoint: debugContext.endpoint || route,
                method,
                correlationId,
            },
            summary: debugContext.requestSummary,
            payload: debugContext.requestPayload,
        });
    }

    try {
        response = await fetch(input, {
            ...init,
            headers: withDebugRequestHeaders(init?.headers, correlationId),
        });
    } catch (error) {
        if (isAbortLikeError(error)) {
            if (debugContext) {
                emitServiceDebugEvent({
                    kind: 'log',
                    label: debugContext.errorLabel || `${debugContext.operation} aborted`,
                    context: {
                        ...debugContext,
                        route,
                        endpoint: debugContext.endpoint || route,
                        method,
                        correlationId,
                        phase: 'abort',
                    },
                    summary: 'Request aborted',
                    durationMs: Date.now() - startTime,
                    payload: { reason: 'ABORTED' },
                });
            }
            throw new Error('ABORTED');
        }

        if (debugContext) {
            emitServiceDebugEvent({
                kind: 'error',
                label: debugContext.errorLabel || `${debugContext.operation} failed`,
                context: {
                    ...debugContext,
                    route,
                    endpoint: debugContext.endpoint || route,
                    method,
                    correlationId,
                },
                summary: buildErrorSummary(error),
                durationMs: Date.now() - startTime,
                payload: { error },
            });
        }
        throw error;
    }

    if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const errorMessage =
            payload && typeof payload.error === 'string'
                ? payload.error
                : `Request failed with status ${response.status}`;
        const requestError = new Error(errorMessage) as Error & {
            status?: number;
        };
        requestError.name = 'ApiRequestError';
        requestError.status = response.status;

        const failure = normalizeGenerationFailureInfo(payload?.failure);
        if (debugContext) {
            emitServiceDebugEvent({
                kind: 'error',
                label: debugContext.errorLabel || `${debugContext.operation} failed`,
                context: {
                    ...debugContext,
                    route,
                    endpoint: debugContext.endpoint || route,
                    method,
                    correlationId,
                },
                summary: buildErrorSummary(failure ? attachGenerationFailure(new Error(requestError.message), failure) : requestError),
                status: response.status,
                durationMs: Date.now() - startTime,
                payload: {
                    error: requestError,
                    failure,
                    responsePayload: payload,
                },
            });
        }
        if (failure) {
            throw attachGenerationFailure(requestError, failure);
        }

        throw requestError;
    }

    if (!response.body) {
        throw new Error('Streaming response body was unavailable.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }

            buffer += decoder.decode(value, { stream: true });

            while (true) {
                const newlineIndex = buffer.indexOf('\n');
                if (newlineIndex < 0) {
                    break;
                }

                const line = buffer.slice(0, newlineIndex).trim();
                buffer = buffer.slice(newlineIndex + 1);

                if (!line) {
                    continue;
                }

                onEvent(JSON.parse(line) as T);
            }
        }

        const trailing = `${buffer}${decoder.decode()}`.trim();
        if (trailing) {
            onEvent(JSON.parse(trailing) as T);
        }
    } catch (error) {
        if (isAbortLikeError(error)) {
            if (debugContext) {
                emitServiceDebugEvent({
                    kind: 'log',
                    label: debugContext.errorLabel || `${debugContext.operation} aborted`,
                    context: {
                        ...debugContext,
                        route,
                        endpoint: debugContext.endpoint || route,
                        method,
                        correlationId,
                        phase: 'abort',
                    },
                    summary: 'Request aborted',
                    durationMs: Date.now() - startTime,
                    payload: { reason: 'ABORTED' },
                });
            }
            throw new Error('ABORTED');
        }

        if (debugContext) {
            emitServiceDebugEvent({
                kind: 'error',
                label: debugContext.errorLabel || `${debugContext.operation} failed`,
                context: {
                    ...debugContext,
                    route,
                    endpoint: debugContext.endpoint || route,
                    method,
                    correlationId,
                    phase: 'parse',
                },
                summary: buildErrorSummary(error),
                status: response.status,
                durationMs: Date.now() - startTime,
                payload: { error },
            });
        }
        throw error;
    }
}

type StreamRouteStartEvent = {
    type: 'start';
    sessionId: string;
};

type StreamRouteResultPartEvent = {
    type: 'result-part';
    sessionId: string;
    part: ResultPart;
};

type StreamRouteCompleteEvent = {
    type: 'complete';
    sessionId: string;
    response: GenerateResponse;
    summary: LiveProgressStreamTruthSummary;
};

type StreamRouteFailureEvent = {
    type: 'failure';
    sessionId: string;
    error: string;
    failure?: GenerateResponse['failure'];
    response?: GenerateResponse;
    summary: LiveProgressStreamTruthSummary;
};

type StreamRouteEvent =
    | StreamRouteStartEvent
    | StreamRouteResultPartEvent
    | StreamRouteCompleteEvent
    | StreamRouteFailureEvent;

export type GenerationLiveProgressEvent =
    | {
          type: 'start';
          sessionId: string;
          slotIndex?: number;
          batchSessionId?: string;
      }
    | {
          type: 'result-part';
          sessionId: string;
          part: ResultPart;
          slotIndex?: number;
          batchSessionId?: string;
      }
    | {
          type: 'summary';
          sessionId: string;
          summary: LiveProgressStreamTruthSummary;
          slotIndex?: number;
          batchSessionId?: string;
      };

type GenerationLiveProgressEventContext = {
    slotIndex?: number;
    batchSessionId?: string;
};

type LiveProgressClientAccumulator = {
    resultParts: ResultPart[];
    summary: LiveProgressStreamTruthSummary | null;
};

type StreamGenerationResponse = {
    response: GenerateResponse;
    didReceiveStreamEvent: boolean;
};

type GenerationResultPartialResponse = Pick<
    GenerateResponse,
    'text' | 'thoughts' | 'resultParts' | 'metadata' | 'grounding' | 'sessionHints' | 'conversation'
>;

type InitialBatchAttemptOutcome = {
    result: GenerationResult;
    needsRecovery: boolean;
};

const buildResultPartIdentityKey = (part: ResultPart) =>
    part.kind === 'thought-text' || part.kind === 'output-text'
        ? `${part.kind}:${part.sequence}:${part.text}`
        : `${part.kind}:${part.sequence}:${(part as ResultImagePart).mimeType}:${(part as ResultImagePart).imageUrl}`;

const mergeResultPartCollections = (
    baseParts: ResultPart[] | undefined,
    accumulatedParts: ResultPart[],
): ResultPart[] | undefined => {
    if (!baseParts?.length && accumulatedParts.length === 0) {
        return undefined;
    }

    const mergedParts = [...(baseParts || [])];
    const seenKeys = new Set(mergedParts.map(buildResultPartIdentityKey));

    accumulatedParts.forEach((part) => {
        const identityKey = buildResultPartIdentityKey(part);
        if (seenKeys.has(identityKey)) {
            return;
        }

        seenKeys.add(identityKey);
        mergedParts.push(part);
    });

    return mergedParts.sort((left, right) => left.sequence - right.sequence);
};

const buildResultPartTextSummary = (
    resultParts: ResultPart[] | undefined,
    kind: Extract<ResultPart['kind'], 'thought-text' | 'output-text'>,
): string | undefined => {
    const summary = (resultParts || [])
        .map((part) => (part.kind === kind ? part.text.trim() : ''))
        .filter(Boolean)
        .join('\n\n');

    return summary || undefined;
};

const mergeAccumulatedStreamPartialResponse = <
    T extends GenerateResponse | GenerationResultPartialResponse | undefined,
>(
    partialResponse: T,
    accumulator: LiveProgressClientAccumulator,
): T => {
    if (accumulator.summary?.orderingStable !== true || accumulator.resultParts.length === 0) {
        return partialResponse;
    }

    const mergedResultParts = mergeResultPartCollections(partialResponse?.resultParts, accumulator.resultParts);
    if (!mergedResultParts?.length) {
        return partialResponse;
    }

    return {
        ...(partialResponse || {}),
        text: partialResponse?.text ?? buildResultPartTextSummary(mergedResultParts, 'output-text'),
        thoughts: partialResponse?.thoughts ?? buildResultPartTextSummary(mergedResultParts, 'thought-text'),
        resultParts: mergedResultParts,
    } as T;
};

const buildLiveProgressEvent = (
    event: GenerationLiveProgressEvent,
    context?: GenerationLiveProgressEventContext,
): GenerationLiveProgressEvent => {
    if (typeof context?.slotIndex !== 'number' && !context?.batchSessionId) {
        return event;
    }

    return {
        ...event,
        ...(typeof context?.slotIndex === 'number' ? { slotIndex: context.slotIndex } : {}),
        ...(context?.batchSessionId ? { batchSessionId: context.batchSessionId } : {}),
    };
};

const delayWithAbort = async (delayMs: number, abortSignal?: AbortSignal): Promise<void> => {
    if (delayMs <= 0) {
        return;
    }

    await new Promise<void>((resolve, reject) => {
        const onAbort = () => {
            clearTimeout(timer);
            reject(new Error('ABORTED'));
        };
        const timer = setTimeout(() => {
            if (abortSignal) {
                abortSignal.removeEventListener('abort', onAbort);
            }
            resolve();
        }, delayMs);

        if (abortSignal) {
            if (abortSignal.aborted) {
                clearTimeout(timer);
                reject(new Error('ABORTED'));
                return;
            }

            abortSignal.addEventListener('abort', onAbort, { once: true });
        }
    });
};

const shouldUseLiveProgressStream = (options: GenerateOptions, batchSize: number): boolean =>
    isLiveProgressEligibleRequest({
        model: options.model,
        executionMode: options.executionMode || 'single-turn',
        outputFormat: options.outputFormat || 'images-only',
        thinkingLevel:
            options.thinkingLevel || (options.model === 'gemini-3.1-flash-image' ? 'minimal' : 'disabled'),
        includeThoughts: Boolean(options.includeThoughts),
        batchSize,
    });

const shouldUseLiveProgressFanOut = (options: GenerateOptions, batchSize: number): boolean =>
    options.executionMode === 'interactive-batch-variants' &&
    isLiveProgressFanOutEligibleRequest({
        model: options.model,
        executionMode: options.executionMode,
        outputFormat: options.outputFormat || 'images-only',
        thinkingLevel:
            options.thinkingLevel || (options.model === 'gemini-3.1-flash-image' ? 'minimal' : 'disabled'),
        includeThoughts: Boolean(options.includeThoughts),
        batchSize,
    });

const isRetryableImageAbsenceFailure = (failure?: GenerateResponse['failure']): boolean =>
    failure?.code === 'no-image-data' || failure?.code === 'text-only';

const isRetryableImageAbsenceMessage = (message?: string): boolean => {
    const normalizedMessage = message?.toLowerCase() || '';
    return normalizedMessage.includes('no image data') || normalizedMessage.includes('text-only');
};

const shouldAttemptImageAbsenceRecovery = (result: GenerationResult): boolean =>
    result.status === 'failed' &&
    (isRetryableImageAbsenceFailure(result.failure) || isRetryableImageAbsenceMessage(result.error));

const buildSuccessGenerationResult = (
    slotIndex: number,
    response: GenerateResponse,
    receivedResult?: ImageReceivedResult,
): GenerationResult => ({
    slotIndex,
    status: 'success',
    url: response.imageUrl,
    displayUrl: receivedResult?.displayUrl || response.imageUrl,
    savedFilename: receivedResult?.savedFilename,
    text: response.text,
    thoughts: response.thoughts,
    resultParts: response.resultParts,
    metadata: response.metadata,
    grounding: response.grounding,
    sessionHints: response.sessionHints,
    conversation: response.conversation,
});

const buildFailedGenerationResult = (
    slotIndex: number,
    error: unknown,
    partialResponse?: GenerationResultPartialResponse,
): GenerationResult => {
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    const failure = getGenerationFailure(normalizedError);
    const carriedPartialResponse =
        partialResponse ||
        ((normalizedError as Error & { partialResponse?: GenerationResultPartialResponse }).partialResponse ??
            undefined);

    return {
        slotIndex,
        status: 'failed',
        error: normalizedError.message,
        failure: failure || undefined,
        text: carriedPartialResponse?.text,
        thoughts: carriedPartialResponse?.thoughts,
        resultParts: carriedPartialResponse?.resultParts,
        metadata: carriedPartialResponse?.metadata,
        grounding: carriedPartialResponse?.grounding,
        sessionHints: carriedPartialResponse?.sessionHints,
        conversation: carriedPartialResponse?.conversation,
    };
};

const mergeRecoveredFailureResult = (
    initialResult: GenerationResult,
    recoveryResult: GenerationResult,
): GenerationResult => ({
    ...recoveryResult,
    slotIndex: initialResult.slotIndex,
    error: recoveryResult.error || initialResult.error,
    failure: recoveryResult.failure || initialResult.failure,
    text: recoveryResult.text ?? initialResult.text,
    thoughts: recoveryResult.thoughts ?? initialResult.thoughts,
    resultParts:
        recoveryResult.resultParts && recoveryResult.resultParts.length > 0
            ? recoveryResult.resultParts
            : initialResult.resultParts,
    metadata: recoveryResult.metadata ?? initialResult.metadata,
    grounding: recoveryResult.grounding ?? initialResult.grounding,
    sessionHints: recoveryResult.sessionHints ?? initialResult.sessionHints,
    conversation: recoveryResult.conversation ?? initialResult.conversation,
});

const executeBlockingImageAttempt = async (
    options: GenerateOptions,
    slotIndex: number,
    onImageReceived:
        | ((
              url: string,
              slotIndex: number,
          ) => Promise<ImageReceivedResult | undefined> | ImageReceivedResult | undefined)
        | undefined,
    onLog?: (msg: string) => void,
    abortSignal?: AbortSignal,
): Promise<GenerationResult> => {
    const correlationId = createDebugTerminalCorrelationId('image');

    try {
        const response = await generateSingleImage(options, slotIndex + 1, onLog, abortSignal, correlationId);
        if (!response.imageUrl) {
            throw new Error('Model returned no image data.');
        }

        const receivedResult = onImageReceived ? await onImageReceived(response.imageUrl, slotIndex) : undefined;
        return buildSuccessGenerationResult(slotIndex, response, receivedResult);
    } catch (error) {
        if (error instanceof Error && error.message === 'ABORTED') {
            return {
                slotIndex,
                status: 'failed',
                error: 'Generation cancelled',
            };
        }

        return buildFailedGenerationResult(slotIndex, error);
    }
};

const executeBlockingImageAttemptWithTransientRetry = async (
    options: GenerateOptions,
    slotIndex: number,
    onImageReceived:
        | ((
              url: string,
              slotIndex: number,
          ) => Promise<ImageReceivedResult | undefined> | ImageReceivedResult | undefined)
        | undefined,
    onLog?: (msg: string) => void,
    abortSignal?: AbortSignal,
): Promise<GenerationResult> => {
    const correlationId = createDebugTerminalCorrelationId('image');

    try {
        const response = await retryOperation(
            () => generateSingleImage(options, slotIndex + 1, onLog, abortSignal, correlationId),
            3,
            1500,
            {
                backoffMultiplier: 2,
                maxDelay: 8000,
                abortSignal,
                onLog,
                correlationId,
                route: '/api/images/generate',
                source: 'generation',
                operation: `Image #${slotIndex + 1}: blocking generation`,
            },
        );

        if (!response.imageUrl) {
            throw new Error('Model returned no image data.');
        }

        const receivedResult = onImageReceived ? await onImageReceived(response.imageUrl, slotIndex) : undefined;
        return buildSuccessGenerationResult(slotIndex, response, receivedResult);
    } catch (error) {
        if (error instanceof Error && error.message === 'ABORTED') {
            return {
                slotIndex,
                status: 'failed',
                error: 'Generation cancelled',
            };
        }

        return buildFailedGenerationResult(slotIndex, error);
    }
};

// Helper to ensure we get the key
export const checkApiKey = async (): Promise<boolean> => {
    try {
        const payload = await fetchJson<{ hasApiKey: boolean }>('/api/runtime-config', undefined, {
            source: 'runtime',
            route: '/api/runtime-config',
            method: 'GET',
            operation: 'Runtime config',
            requestLabel: 'Runtime config request',
            requestSummary: 'Check API key availability',
            responseLabel: 'Runtime config response',
            responseSummary: (result: { hasApiKey: boolean }) => (result.hasApiKey ? 'API key available' : 'API key missing'),
            responsePayload: (result: { hasApiKey: boolean }) => ({ hasApiKey: result.hasApiKey }),
            errorLabel: 'Runtime config request failed',
        });
        return payload.hasApiKey;
    } catch {
        return false;
    }
};

const generateSingleImageStream = async (
    options: GenerateOptions,
    imgIndex: number = 1,
    onLog?: (msg: string) => void,
    abortSignal?: AbortSignal,
    onLiveProgressEvent?: (event: GenerationLiveProgressEvent) => void,
    eventContext?: GenerationLiveProgressEventContext,
    correlationId?: string,
): Promise<StreamGenerationResponse> => {
    const finalPrompt = buildStyleAwareImagePrompt(options);
    const requestBody = buildImageGenerateRequestBody(options, finalPrompt);
    const resolvedCorrelationId = correlationId || createDebugTerminalCorrelationId('stream');
    const streamStartTime = Date.now();
    let finalResponse: GenerateResponse | null = null;
    let streamFailure: StreamRouteFailureEvent | null = null;
    let didReceiveStreamEvent = false;
    const streamAccumulator: LiveProgressClientAccumulator = {
        resultParts: [],
        summary: null,
    };

    try {
        onLog?.(`Image #${imgIndex}: Opening live progress stream...`);

        if (abortSignal?.aborted) {
            throw new Error('ABORTED');
        }

        await fetchNdjson<StreamRouteEvent>(
            '/api/images/generate-stream',
            {
                method: 'POST',
                headers: jsonHeaders,
                signal: abortSignal,
                body: JSON.stringify(requestBody),
            },
            (event) => {
                didReceiveStreamEvent = true;

                if (event.type === 'start') {
                    emitServiceDebugEvent({
                        kind: 'stream',
                        label: `Image #${imgIndex}: Stream opened`,
                        context: {
                            source: 'generation',
                            operation: 'Image stream',
                            route: '/api/images/generate-stream',
                            method: 'POST',
                            phase: 'start',
                            correlationId: resolvedCorrelationId,
                        },
                        summary: event.sessionId,
                        sessionId: event.sessionId,
                        batchSessionId: eventContext?.batchSessionId,
                        slotIndex: eventContext?.slotIndex,
                        payload: { event },
                    });
                    onLiveProgressEvent?.(
                        buildLiveProgressEvent(
                            {
                                type: 'start',
                                sessionId: event.sessionId,
                            },
                            eventContext,
                        ),
                    );
                    return;
                }

                if (event.type === 'result-part') {
                    const identityKey = buildResultPartIdentityKey(event.part);
                    const alreadyTracked = streamAccumulator.resultParts.some(
                        (part) => buildResultPartIdentityKey(part) === identityKey,
                    );

                    if (!alreadyTracked) {
                        streamAccumulator.resultParts = [...streamAccumulator.resultParts, event.part].sort(
                            (left, right) => left.sequence - right.sequence,
                        );
                    }

                    emitServiceDebugEvent({
                        kind: 'stream',
                        label: `Image #${imgIndex}: Stream part`,
                        context: {
                            source: 'generation',
                            operation: 'Image stream',
                            route: '/api/images/generate-stream',
                            method: 'POST',
                            phase: 'result-part',
                            correlationId: resolvedCorrelationId,
                        },
                        summary: buildStreamPartSummary(event.part),
                        sessionId: event.sessionId,
                        batchSessionId: eventContext?.batchSessionId,
                        slotIndex: eventContext?.slotIndex,
                        payload: { part: event.part, accumulatedResultParts: streamAccumulator.resultParts.length },
                    });

                    onLiveProgressEvent?.(
                        buildLiveProgressEvent(
                            {
                                type: 'result-part',
                                sessionId: event.sessionId,
                                part: event.part,
                            },
                            eventContext,
                        ),
                    );
                    return;
                }

                if (event.type === 'complete') {
                    streamAccumulator.summary = event.summary;
                    finalResponse = mergeAccumulatedStreamPartialResponse(event.response, streamAccumulator);
                    emitServiceDebugEvent({
                        kind: 'stream',
                        label: `Image #${imgIndex}: Stream complete`,
                        context: {
                            source: 'generation',
                            operation: 'Image stream',
                            route: '/api/images/generate-stream',
                            method: 'POST',
                            phase: 'complete',
                            correlationId: resolvedCorrelationId,
                        },
                        summary: event.summary.truthfulnessOutcome,
                        sessionId: event.sessionId,
                        batchSessionId: eventContext?.batchSessionId,
                        slotIndex: eventContext?.slotIndex,
                        payload: { summary: event.summary },
                    });
                    onLiveProgressEvent?.(
                        buildLiveProgressEvent(
                            {
                                type: 'summary',
                                sessionId: event.sessionId,
                                summary: event.summary,
                            },
                            eventContext,
                        ),
                    );
                    return;
                }

                streamAccumulator.summary = event.summary;
                streamFailure = {
                    ...event,
                    response: mergeAccumulatedStreamPartialResponse(event.response, streamAccumulator),
                };
                emitServiceDebugEvent({
                    kind: 'error',
                    label: `Image #${imgIndex}: Stream failure event`,
                    context: {
                        source: 'generation',
                        operation: 'Image stream',
                        route: '/api/images/generate-stream',
                        method: 'POST',
                        phase: 'failure',
                        correlationId: resolvedCorrelationId,
                    },
                    summary: event.error,
                    sessionId: event.sessionId,
                    batchSessionId: eventContext?.batchSessionId,
                    slotIndex: eventContext?.slotIndex,
                    payload: {
                        error: event.error,
                        failure: event.failure,
                        response: streamFailure.response,
                        summary: event.summary,
                    },
                });
                onLiveProgressEvent?.(
                    buildLiveProgressEvent(
                        {
                            type: 'summary',
                            sessionId: event.sessionId,
                            summary: event.summary,
                        },
                        eventContext,
                    ),
                );
            },
            {
                source: 'generation',
                route: '/api/images/generate-stream',
                method: 'POST',
                operation: 'Image stream',
                correlationId: resolvedCorrelationId,
                requestLabel: `Image #${imgIndex}: Stream request`,
                requestSummary: buildGenerateRequestSummary(requestBody, imgIndex),
                requestPayload: requestBody,
                errorLabel: `Image #${imgIndex}: Stream request failed`,
            },
        );
    } catch (error) {
        if (isAbortLikeError(error)) {
            throw new Error('ABORTED');
        }

        const streamError = error as Error & { didReceiveStreamEvent?: boolean; partialResponse?: GenerateResponse };
        streamError.didReceiveStreamEvent = didReceiveStreamEvent;
        streamError.partialResponse = mergeAccumulatedStreamPartialResponse(
            streamError.partialResponse,
            streamAccumulator,
        );
        emitServiceDebugEvent({
            kind: 'error',
            label: `Image #${imgIndex}: Stream failed`,
            context: {
                source: 'generation',
                operation: 'Image stream',
                route: '/api/images/generate-stream',
                method: 'POST',
                phase: 'exception',
                correlationId: resolvedCorrelationId,
            },
            summary: buildErrorSummary(streamError),
            durationMs: Date.now() - streamStartTime,
            batchSessionId: eventContext?.batchSessionId,
            slotIndex: eventContext?.slotIndex,
            payload: {
                error: streamError,
                partialResponse: streamError.partialResponse,
                didReceiveStreamEvent,
            },
        });
        throw streamError;
    }

    const failurePayload = streamFailure as StreamRouteFailureEvent | null;
    if (failurePayload) {
        const requestError = new Error(failurePayload.error) as Error & {
            didReceiveStreamEvent?: boolean;
            partialResponse?: GenerateResponse;
        };
        requestError.didReceiveStreamEvent = didReceiveStreamEvent;
        requestError.partialResponse = failurePayload.response;

        if (failurePayload.failure) {
            throw attachGenerationFailure(requestError, failurePayload.failure);
        }

        throw requestError;
    }

    if (!finalResponse) {
        const requestError = new Error('Streaming response completed without a final payload.') as Error & {
            didReceiveStreamEvent?: boolean;
        };
        requestError.didReceiveStreamEvent = didReceiveStreamEvent;
        emitServiceDebugEvent({
            kind: 'error',
            label: `Image #${imgIndex}: Stream completed without payload`,
            context: {
                source: 'generation',
                operation: 'Image stream',
                route: '/api/images/generate-stream',
                method: 'POST',
                phase: 'final-payload',
                correlationId: resolvedCorrelationId,
            },
            summary: requestError.message,
            durationMs: Date.now() - streamStartTime,
            batchSessionId: eventContext?.batchSessionId,
            slotIndex: eventContext?.slotIndex,
        });
        throw requestError;
    }

    onLog?.(`Image #${imgIndex}: Success.`);

    emitServiceDebugEvent({
        kind: 'response',
        label: `Image #${imgIndex}: Stream response`,
        context: {
            source: 'generation',
            operation: 'Image stream',
            route: '/api/images/generate-stream',
            method: 'POST',
            phase: 'final-response',
            correlationId: resolvedCorrelationId,
        },
        durationMs: Date.now() - streamStartTime,
        summary: buildDebugResponseSummary(finalResponse),
        batchSessionId: eventContext?.batchSessionId,
        slotIndex: eventContext?.slotIndex,
        payload: finalResponse,
    });

    return {
        response: finalResponse,
        didReceiveStreamEvent,
    };
};

const executeInteractiveStreamSlot = async (
    options: GenerateOptions,
    slotIndex: number,
    onImageReceived:
        | ((
              url: string,
              slotIndex: number,
          ) => Promise<ImageReceivedResult | undefined> | ImageReceivedResult | undefined)
        | undefined,
    onLog?: (msg: string) => void,
    abortSignal?: AbortSignal,
    onLiveProgressEvent?: (event: GenerationLiveProgressEvent) => void,
    eventContext?: GenerationLiveProgressEventContext,
): Promise<GenerationResult> => {
    const correlationId = createDebugTerminalCorrelationId('stream');

    try {
        const streamed = await generateSingleImageStream(
            options,
            slotIndex + 1,
            onLog,
            abortSignal,
            onLiveProgressEvent,
            eventContext,
            correlationId,
        );

        if (!streamed.response.imageUrl) {
            throw new Error('Model returned no image data.');
        }

        const receivedResult = onImageReceived
            ? await onImageReceived(streamed.response.imageUrl, slotIndex)
            : undefined;
        return buildSuccessGenerationResult(slotIndex, streamed.response, receivedResult);
    } catch (error: any) {
        if (error.message === 'ABORTED') {
            return {
                slotIndex,
                status: 'failed',
                error: 'Generation cancelled',
            };
        }

        if (!error.didReceiveStreamEvent) {
            onLog?.(`Image #${slotIndex + 1}: Live progress stream unavailable, falling back to blocking request.`);

            const blockingFallbackResult = await executeBlockingImageAttemptWithTransientRetry(
                options,
                slotIndex,
                onImageReceived,
                onLog,
                abortSignal,
            );

            if (shouldAttemptImageAbsenceRecovery(blockingFallbackResult)) {
                onLog?.(`Image #${slotIndex + 1}: Blocking request returned no final image. Retrying once.`);
                const recoveredResult = await executeBlockingImageAttempt(
                    options,
                    slotIndex,
                    onImageReceived,
                    onLog,
                    abortSignal,
                );
                return recoveredResult.status === 'success'
                    ? recoveredResult
                    : mergeRecoveredFailureResult(blockingFallbackResult, recoveredResult);
            }

            return blockingFallbackResult;
        }

        const streamedFailureResult = buildFailedGenerationResult(slotIndex, error);

        if (shouldAttemptImageAbsenceRecovery(streamedFailureResult)) {
            onLog?.(
                `Image #${slotIndex + 1}: Live progress returned no final image. Retrying once with blocking request.`,
            );
            const recoveredResult = await executeBlockingImageAttempt(
                options,
                slotIndex,
                onImageReceived,
                onLog,
                abortSignal,
            );
            return recoveredResult.status === 'success'
                ? recoveredResult
                : mergeRecoveredFailureResult(streamedFailureResult, recoveredResult);
        }

        return streamedFailureResult;
    }
};
export const promptForApiKey = async (): Promise<void> => {
    window.alert('Missing GEMINI_API_KEY. Add it to .env.local and restart the dev server.');
};

// --- Text Utilities (Prompt Engineering) ---

export const enhancePromptWithGemini = async (
    currentPrompt: string,
    lang: Language,
    safetyThresholds: Partial<SafetyThresholds> = DEFAULT_SAFETY_THRESHOLDS,
): Promise<string> => {
    const correlationId = createDebugTerminalCorrelationId('prompt');
    const requestPayload = { currentPrompt, lang, safetyThresholds };
    const response = await fetchJson<{ text: string }>(
        '/api/prompt/enhance',
        {
            method: 'POST',
            headers: jsonHeaders,
            body: JSON.stringify(requestPayload),
        },
        {
            source: 'prompt-tools',
            route: '/api/prompt/enhance',
            method: 'POST',
            operation: 'Prompt enhancer',
            correlationId,
            requestLabel: 'Prompt enhancer request',
            requestSummary: `Prompt enhancer (${lang})`,
            requestPayload,
            responseLabel: 'Prompt enhancer response',
            responseSummary: (result: { text: string }) => buildTextResponseSummary(result.text),
            responsePayload: (result: { text: string }) => ({ text: result.text }),
            errorLabel: 'Prompt enhancer failed',
        },
    );

    const promptText = response.text?.trim();
    if (!promptText) {
        emitServiceDebugEvent({
            kind: 'error',
            label: 'Prompt enhancer returned empty text',
            context: {
                source: 'prompt-tools',
                operation: 'Prompt enhancer',
                route: '/api/prompt/enhance',
                method: 'POST',
                phase: 'validation',
                correlationId,
            },
            summary: 'Prompt enhancement returned empty text.',
            payload: { response },
        });
        throw new Error('Prompt enhancement returned empty text.');
    }

    return promptText;
};

export const generateRandomPrompt = async (
    lang: Language,
    safetyThresholds: Partial<SafetyThresholds> = DEFAULT_SAFETY_THRESHOLDS,
): Promise<string> => {
    const correlationId = createDebugTerminalCorrelationId('prompt');
    const requestPayload = { lang, safetyThresholds };
    const response = await fetchJson<{ text: string }>(
        '/api/prompt/random',
        {
            method: 'POST',
            headers: jsonHeaders,
            body: JSON.stringify(requestPayload),
        },
        {
            source: 'prompt-tools',
            route: '/api/prompt/random',
            method: 'POST',
            operation: 'Random prompt',
            correlationId,
            requestLabel: 'Random prompt request',
            requestSummary: `Random prompt (${lang})`,
            requestPayload,
            responseLabel: 'Random prompt response',
            responseSummary: (result: { text: string }) => buildTextResponseSummary(result.text),
            responsePayload: (result: { text: string }) => ({ text: result.text }),
            errorLabel: 'Random prompt failed',
        },
    );

    const promptText = response.text?.trim();
    if (!promptText) {
        emitServiceDebugEvent({
            kind: 'error',
            label: 'Random prompt returned empty text',
            context: {
                source: 'prompt-tools',
                operation: 'Random prompt',
                route: '/api/prompt/random',
                method: 'POST',
                phase: 'validation',
                correlationId,
            },
            summary: 'Random prompt generation returned empty text.',
            payload: { response },
        });
        throw new Error('Random prompt generation returned empty text.');
    }

    return promptText;
};

export const generatePromptFromImage = async (
    imageDataUrl: string,
    lang: Language,
    safetyThresholds: Partial<SafetyThresholds> = DEFAULT_SAFETY_THRESHOLDS,
): Promise<string> => {
    const correlationId = createDebugTerminalCorrelationId('prompt');
    const requestPayload = { imageDataUrl, lang, safetyThresholds };
    const response = await fetchJson<{ text: string }>(
        '/api/prompt/image-to-prompt',
        {
            method: 'POST',
            headers: jsonHeaders,
            body: JSON.stringify(requestPayload),
        },
        {
            source: 'prompt-tools',
            route: '/api/prompt/image-to-prompt',
            method: 'POST',
            operation: 'Image to prompt',
            correlationId,
            requestLabel: 'Image-to-prompt request',
            requestSummary: `Image-to-prompt (${lang})`,
            requestPayload,
            responseLabel: 'Image-to-prompt response',
            responseSummary: (result: { text: string }) => buildTextResponseSummary(result.text),
            responsePayload: (result: { text: string }) => ({ text: result.text }),
            errorLabel: 'Image-to-prompt failed',
        },
    );

    const promptText = response.text?.trim();
    if (!promptText) {
        emitServiceDebugEvent({
            kind: 'error',
            label: 'Image-to-prompt returned empty text',
            context: {
                source: 'prompt-tools',
                operation: 'Image to prompt',
                route: '/api/prompt/image-to-prompt',
                method: 'POST',
                phase: 'validation',
                correlationId,
            },
            summary: 'Image to prompt returned empty text.',
            payload: { response },
        });
        throw new Error('Image to prompt returned empty text.');
    }

    return promptText;
};

// --- Image Generation Logic ---

const generateSingleImage = async (
    options: GenerateOptions,
    imgIndex: number = 1,
    onLog?: (msg: string) => void,
    abortSignal?: AbortSignal,
    correlationId?: string,
): Promise<GenerateResponse> => {
    const finalPrompt = buildStyleAwareImagePrompt(options);
    const requestBody = buildImageGenerateRequestBody(options, finalPrompt);

    try {
        onLog?.(`Image #${imgIndex}: Sending request...`);

        if (abortSignal?.aborted) {
            throw new Error('ABORTED');
        }

        const response = await fetchJson<GenerateResponse>(
            '/api/images/generate',
            {
                method: 'POST',
                headers: jsonHeaders,
                signal: abortSignal,
                body: JSON.stringify(requestBody),
            },
            {
                source: 'generation',
                route: '/api/images/generate',
                method: 'POST',
                operation: 'Image generation',
                correlationId,
                requestLabel: `Image #${imgIndex}: Blocking request`,
                requestSummary: buildGenerateRequestSummary(requestBody, imgIndex),
                requestPayload: requestBody,
                responseLabel: `Image #${imgIndex}: Blocking response`,
                responseSummary: (result: GenerateResponse) => buildDebugResponseSummary(result),
                responsePayload: (result: GenerateResponse) => result,
                errorLabel: `Image #${imgIndex}: Blocking request failed`,
            },
        );

        onLog?.(`Image #${imgIndex}: Success.`);
        return response;
    } catch (error: any) {
        if (isAbortLikeError(error)) {
            throw new Error('ABORTED');
        }

        const failure = getGenerationFailure(error);
        if (failure) {
            throw attachGenerationFailure(new Error(failure.message), failure);
        }

        const errorMessage = error.message || 'Unknown error';

        if (errorMessage.includes('limit: 0')) {
            throw new Error('API key quota exceeded. This model requires a paid API key or billing enabled.');
        }

        throw new Error(errorMessage);
    }
};

export type GenerationResult = {
    slotIndex: number;
    status: 'success' | 'failed';
    url?: string;
    displayUrl?: string;
    error?: string;
    failure?: GenerateResponse['failure'];
    savedFilename?: string;
    text?: string;
    thoughts?: string;
    resultParts?: ResultPart[];
    metadata?: Record<string, unknown>;
    grounding?: GenerateResponse['grounding'];
    sessionHints?: GenerateResponse['sessionHints'];
    conversation?: GenerateResponse['conversation'];
};

export type RemoteQueuedBatchJob = {
    name: string;
    displayName: string;
    state: string;
    model: string;
    createTime?: string;
    updateTime?: string;
    startTime?: string;
    endTime?: string;
    error?: string | null;
    hasImportablePayload: boolean;
    inlinedResponseCount?: number;
    batchStats?: QueuedBatchJobStats | null;
};

export type QueuedBatchImportResult = {
    index: number;
    status: 'success' | 'failed';
    imageUrl?: string;
    text?: string;
    thoughts?: string;
    grounding?: GenerateResponse['grounding'];
    sessionHints?: Record<string, unknown>;
    error?: string;
};

type SubmitQueuedBatchOptions = GenerateOptions & {
    requestCount: number;
    displayName?: string;
};

export const submitQueuedBatchJob = async (options: SubmitQueuedBatchOptions): Promise<RemoteQueuedBatchJob> => {
    const finalPrompt = buildStyleAwareImagePrompt(options);
    const requestPayload = {
        ...buildImageGenerateRequestBody(options, finalPrompt),
        executionMode: 'queued-batch-job' as const,
        requestCount: 1,
        displayName: options.displayName,
    };

    const response = await fetchJson<{ job: RemoteQueuedBatchJob }>(
        '/api/batches/create',
        {
            method: 'POST',
            headers: jsonHeaders,
            body: JSON.stringify(requestPayload),
        },
        {
            source: 'batch',
            route: '/api/batches/create',
            method: 'POST',
            operation: 'Batch create',
            requestLabel: 'Batch create request',
            requestSummary: `${options.model} | ${options.displayName || 'untitled'} | ${options.requestCount} request(s)`,
            requestPayload,
            responseLabel: 'Batch create response',
            responseSummary: (result: { job: RemoteQueuedBatchJob }) => buildBatchJobSummary(result.job),
            responsePayload: (result: { job: RemoteQueuedBatchJob }) => ({ job: result.job }),
            errorLabel: 'Batch create failed',
        },
    );

    return response.job;
};

export const getQueuedBatchJob = async (name: string): Promise<RemoteQueuedBatchJob> => {
    const requestPayload = { name };
    const response = await fetchJson<{ job: RemoteQueuedBatchJob }>(
        '/api/batches/get',
        {
            method: 'POST',
            headers: jsonHeaders,
            body: JSON.stringify(requestPayload),
        },
        {
            source: 'batch',
            route: '/api/batches/get',
            method: 'POST',
            operation: 'Batch get',
            requestLabel: 'Batch status request',
            requestSummary: name,
            requestPayload,
            responseLabel: 'Batch status response',
            responseSummary: (result: { job: RemoteQueuedBatchJob }) => buildBatchJobSummary(result.job),
            responsePayload: (result: { job: RemoteQueuedBatchJob }) => ({ job: result.job }),
            errorLabel: 'Batch status request failed',
        },
    );

    return response.job;
};

export const cancelQueuedBatchJob = async (name: string): Promise<RemoteQueuedBatchJob> => {
    const requestPayload = { name };
    const response = await fetchJson<{ job: RemoteQueuedBatchJob }>(
        '/api/batches/cancel',
        {
            method: 'POST',
            headers: jsonHeaders,
            body: JSON.stringify(requestPayload),
        },
        {
            source: 'batch',
            route: '/api/batches/cancel',
            method: 'POST',
            operation: 'Batch cancel',
            requestLabel: 'Batch cancel request',
            requestSummary: name,
            requestPayload,
            responseLabel: 'Batch cancel response',
            responseSummary: (result: { job: RemoteQueuedBatchJob }) => buildBatchJobSummary(result.job),
            responsePayload: (result: { job: RemoteQueuedBatchJob }) => ({ job: result.job }),
            errorLabel: 'Batch cancel failed',
        },
    );

    return response.job;
};

export const importQueuedBatchJobResults = async (
    name: string,
): Promise<{ job: RemoteQueuedBatchJob; results: QueuedBatchImportResult[] }> => {
    const requestPayload = { name };
    return await fetchJson<{ job: RemoteQueuedBatchJob; results: QueuedBatchImportResult[] }>(
        '/api/batches/import',
        {
            method: 'POST',
            headers: jsonHeaders,
            body: JSON.stringify(requestPayload),
        },
        {
            source: 'batch',
            route: '/api/batches/import',
            method: 'POST',
            operation: 'Batch import',
            requestLabel: 'Batch import request',
            requestSummary: name,
            requestPayload,
            responseLabel: 'Batch import response',
            responseSummary: (result: { job: RemoteQueuedBatchJob; results: QueuedBatchImportResult[] }) => buildQueuedBatchImportSummary(result),
            responsePayload: (result: { job: RemoteQueuedBatchJob; results: QueuedBatchImportResult[] }) => ({
                job: result.job,
                resultsSummary: summarizeDebugTerminalPayload(result.results),
            }),
            errorLabel: 'Batch import failed',
        },
    );
};

// F2: Retry helper with exponential backoff
interface RetryOptions {
    backoffMultiplier?: number;
    maxDelay?: number;
    abortSignal?: AbortSignal;
    onLog?: (msg: string) => void;
    correlationId?: string;
    route?: string;
    source?: DebugTerminalSource;
    operation?: string;
}
const retryOperation = async <T>(
    operation: () => Promise<T>,
    retries: number,
    delayMs: number = 1500,
    opts?: RetryOptions,
): Promise<T> => {
    const {
        backoffMultiplier = 2,
        maxDelay = 8000,
        abortSignal,
        onLog,
        correlationId,
        route,
        source,
        operation: operationLabel,
    } = opts || {};
    try {
        return await operation();
    } catch (error: any) {
        // Never retry these deterministic errors
        const msg = error.message || '';
        // 429 and RESOURCE_EXHAUSTED represent transient rate limits/quotas that can be retried.
        const isDeterministicQuota = msg.includes('quota') && !msg.includes('429') && !msg.includes('RESOURCE_EXHAUSTED');
        if (
            msg.includes('PROMPT_BLOCKED') ||
            msg.includes('SAFETY_BLOCK') ||
            msg.includes('policy') ||
            isDeterministicQuota ||
            msg === 'ABORTED'
        ) {
            throw error;
        }

        if (abortSignal?.aborted) throw new Error('ABORTED');

        if (retries > 0) {
            // Retry transient errors only
            if (
                msg.includes('EMPTY_RESPONSE') ||
                msg.includes('500') ||
                msg.includes('503') ||
                msg.includes('429') ||
                msg.includes('RESOURCE_EXHAUSTED') ||
                msg.includes('fetch')
            ) {
                // Parse Retry-After header or "retry in X.Xs" for 429/RESOURCE_EXHAUSTED rate limits
                let waitMs = delayMs;
                if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
                    const retryAfterMatch = msg.match(/retry.?after[:\s]*(\d+)/i);
                    if (retryAfterMatch) {
                        waitMs = Math.max(waitMs, parseInt(retryAfterMatch[1]) * 1000);
                    } else {
                        // Attempt to extract dynamic wait time from message (e.g. "Please retry in 27.67s")
                        const retryInMatch = msg.match(/retry\s+in\s+([\d.]+)\s*s/i);
                        if (retryInMatch) {
                            // Convert to milliseconds and add a 1500ms safety buffer
                            waitMs = Math.max(waitMs, Math.ceil(parseFloat(retryInMatch[1]) * 1000) + 1500);
                        }
                    }
                }
                onLog?.(`⏳ Retrying in ${(waitMs / 1000).toFixed(1)}s... (${retries} left)`);
                emitServiceDebugEvent({
                    kind: 'retry',
                    label: 'Retry scheduled',
                    context: {
                        source: source || 'generation',
                        operation: operationLabel || 'Retry operation',
                        route,
                        method: 'POST',
                        phase: 'retry',
                        correlationId,
                    },
                    summary: `${msg || 'Transient failure'} -> ${(waitMs / 1000).toFixed(1)}s delay`,
                    payload: {
                        error: error instanceof Error ? error : new Error(String(error)),
                        retriesRemaining: retries,
                        waitMs,
                    },
                });
                // F1-FIX: Use abortable delay so cancel takes effect during retry wait
                await new Promise<void>((resolve, reject) => {
                    const handler = () => {
                        clearTimeout(timer);
                        reject(new Error('ABORTED'));
                    };
                    const timer = setTimeout(() => {
                        if (abortSignal) abortSignal.removeEventListener('abort', handler);
                        resolve();
                    }, waitMs);
                    if (abortSignal) {
                        if (abortSignal.aborted) {
                            clearTimeout(timer);
                            reject(new Error('ABORTED'));
                            return;
                        }
                        abortSignal.addEventListener('abort', handler, { once: true });
                    }
                });
                // Relax max delay to 60s for 429/RESOURCE_EXHAUSTED quota limits
                const effectiveMaxDelay = (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED'))
                    ? Math.max(maxDelay, 60000)
                    : maxDelay;
                const nextDelay = Math.min(waitMs * backoffMultiplier, effectiveMaxDelay);
                return retryOperation(operation, retries - 1, nextDelay, opts);
            }
        }
        throw error;
    }
};

export const generateImageWithGemini = async (
    options: GenerateOptions,
    batchSize: number = 1,
    onImageReceived?:
        | ((
              url: string,
              slotIndex: number,
          ) => Promise<ImageReceivedResult | undefined> | ImageReceivedResult | undefined)
        | undefined,
    onLog?: (msg: string) => void,
    abortSignal?: AbortSignal,
    onProgress?: (completed: number, total: number) => void, // F4: Batch progress
    onResult?: (result: GenerationResult) => void,
    onLiveProgressEvent?: (event: GenerationLiveProgressEvent) => void,
): Promise<GenerationResult[]> => {
    if (batchSize === 1 && shouldUseLiveProgressStream(options, batchSize)) {
        const singleResult = await executeInteractiveStreamSlot(
            options,
            0,
            onImageReceived,
            onLog,
            abortSignal,
            onLiveProgressEvent,
        );

        onProgress?.(1, 1);
        onResult?.(singleResult);
        return [singleResult];
    }

    if (batchSize > 1 && shouldUseLiveProgressFanOut(options, batchSize)) {
        const STREAM_FAN_OUT_CONCURRENCY = 2;
        const STREAM_FAN_OUT_STAGGER_MS = 150;
        const streamBatchSessionId = options.liveProgressBatchSessionId || crypto.randomUUID();
        const streamOptions: GenerateOptions = {
            ...options,
            executionMode: 'single-turn',
        };
        const results = new Array<GenerationResult>(batchSize);
        let completedCount = 0;
        let nextSlotIndex = 0;

        const finalizeFanOutResult = (result: GenerationResult): GenerationResult => {
            completedCount += 1;
            onProgress?.(completedCount, batchSize);
            onResult?.(result);
            return result;
        };

        const runNextSlot = async (): Promise<void> => {
            const slotIndex = nextSlotIndex;
            nextSlotIndex += 1;

            if (slotIndex >= batchSize) {
                return;
            }

            try {
                await delayWithAbort(slotIndex * STREAM_FAN_OUT_STAGGER_MS, abortSignal);
            } catch (error) {
                results[slotIndex] = finalizeFanOutResult({
                    slotIndex,
                    status: 'failed',
                    error:
                        error instanceof Error && error.message === 'ABORTED' ? 'Generation cancelled' : String(error),
                });
                await runNextSlot();
                return;
            }

            if (abortSignal?.aborted) {
                results[slotIndex] = finalizeFanOutResult({
                    slotIndex,
                    status: 'failed',
                    error: 'Generation cancelled',
                });
                await runNextSlot();
                return;
            }

            const slotResult = await executeInteractiveStreamSlot(
                streamOptions,
                slotIndex,
                onImageReceived,
                onLog,
                abortSignal,
                onLiveProgressEvent,
                {
                    slotIndex,
                    batchSessionId: streamBatchSessionId,
                },
            );
            results[slotIndex] = finalizeFanOutResult(slotResult);
            await runNextSlot();
        };

        await Promise.all(
            Array.from({ length: Math.min(STREAM_FAN_OUT_CONCURRENCY, batchSize) }, async () => {
                await runNextSlot();
            }),
        );

        return results;
    }

    // PARALLEL EXECUTION WITH STAGGER
    const STAGGER_DELAY_MS = 300;
    let completedCount = 0;

    const finalizeBatchResult = (result: GenerationResult): GenerationResult => {
        completedCount++;
        onProgress?.(completedCount, batchSize);
        onResult?.(result);
        return result;
    };

    const promises = Array.from({ length: batchSize }).map(async (_, index): Promise<InitialBatchAttemptOutcome> => {
        // Stagger delay
        if (index > 0) await new Promise((resolve) => setTimeout(resolve, index * STAGGER_DELAY_MS));

        // F1: Check abort before starting each image
        if (abortSignal?.aborted) {
            return {
                result: finalizeBatchResult({
                    slotIndex: index,
                    status: 'failed',
                    error: 'Generation cancelled',
                }),
                needsRecovery: false,
            };
        }

        const initialResult = await executeBlockingImageAttemptWithTransientRetry(
            options,
            index,
            onImageReceived,
            onLog,
            abortSignal,
        );

        if (initialResult.status === 'success') {
            return {
                result: finalizeBatchResult(initialResult),
                needsRecovery: false,
            };
        }

        if (initialResult.error === 'Generation cancelled') {
            return {
                result: finalizeBatchResult(initialResult),
                needsRecovery: false,
            };
        }

        if (shouldAttemptImageAbsenceRecovery(initialResult)) {
            onLog?.(`Image #${index + 1}: No final image returned. Scheduling one recovery attempt.`);
            return {
                result: initialResult,
                needsRecovery: true,
            };
        }

        onLog?.(`Image #${index + 1} Failed: ${initialResult.error}`);
        return {
            result: finalizeBatchResult(initialResult),
            needsRecovery: false,
        };
    });

    const initialOutcomes = await Promise.all(promises);
    const results = initialOutcomes.map((outcome) => outcome.result);

    for (const outcome of initialOutcomes) {
        if (!outcome.needsRecovery) {
            continue;
        }

        const slotIndex = outcome.result.slotIndex;
        onLog?.(`Image #${slotIndex + 1}: Retrying once after image-absence failure.`);
        const recoveredResult = await executeBlockingImageAttempt(
            options,
            slotIndex,
            onImageReceived,
            onLog,
            abortSignal,
        );
        const finalizedResult =
            recoveredResult.status === 'success'
                ? recoveredResult
                : mergeRecoveredFailureResult(outcome.result, recoveredResult);

        if (finalizedResult.status === 'failed') {
            onLog?.(`Image #${slotIndex + 1} Failed: ${finalizedResult.error}`);
        }

        results[slotIndex] = finalizeBatchResult(finalizedResult);
    }

    return results;
};
