import {
    DEFAULT_SAFETY_THRESHOLDS,
    GenerateOptions,
    GenerateResponse,
    ImageReceivedResult,
    QueuedBatchJobStats,
    ResultPart,
    ResultImagePart,
    type PromptThinkingLevel,
    type SafetyThresholds,
} from '../../types';
import {
    attachGenerationFailure,
    getGenerationFailure,
    normalizeGenerationFailureInfo,
} from '../../utils/generationFailure';
import {
    isLiveProgressFanOutEligibleRequest,
    isLiveProgressEligibleRequest,
    LiveProgressStreamTruthSummary,
} from '../../utils/liveProgressCapabilities';
import {
    DEBUG_TERMINAL_REQUEST_ID_HEADER,
    createDebugTerminalCorrelationId,
    emitDebugTerminalEvent,
    summarizeDebugTerminalPayload,
    type DebugTerminalSource,
} from '../../utils/debugTerminalEvents';
import { buildStyleAwareImagePrompt } from '../../utils/stylePromptBuilder';
import { Language } from '../../utils/translations';
import type { GenerationLiveProgressEvent, ProgressCallbacks, WorkspaceExecutionProvider } from './types';

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

interface LocalRetryOptions {
    backoffMultiplier?: number;
    maxDelay?: number;
    abortSignal?: AbortSignal;
    onLog?: (msg: string) => void;
    correlationId?: string;
    route?: string;
    source?: DebugTerminalSource;
    operation?: string;
}

let globalRateLimitBackoffUntil = 0;

const retryOperation = async <T>(
    operation: () => Promise<T>,
    retries: number,
    delayMs: number = 1500,
    opts?: LocalRetryOptions,
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
        const now = Date.now();
        if (now < globalRateLimitBackoffUntil) {
            const extraWait = globalRateLimitBackoffUntil - now;
            const releaseJitter = Math.random() * 1000;
            const totalWait = extraWait + releaseJitter;
            onLog?.(`⏳ Rate limit backoff active, stalling request for ${(totalWait / 1000).toFixed(1)}s...`);
            await delayWithAbort(totalWait, abortSignal);
        }
        return await operation();
    } catch (error: any) {
        const msg = error.message || '';
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

        const isRateLimit = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED');
        let calculatedWaitMs = delayMs;

        if (isRateLimit) {
            const retryAfterMatch = msg.match(/retry.?after[:\s]*(\d+)/i);
            const jitter = Math.random() * 1500;
            let hasParsedTime = false;
            if (retryAfterMatch) {
                calculatedWaitMs = Math.max(calculatedWaitMs, parseInt(retryAfterMatch[1], 10) * 1000 + jitter);
                hasParsedTime = true;
            } else {
                const retryInMatch = msg.match(/retry\s+in\s+([\d.]+)\s*(ms|s)/i);
                if (retryInMatch) {
                    const value = parseFloat(retryInMatch[1]);
                    const isMs = retryInMatch[2].toLowerCase() === 'ms';
                    const ms = isMs ? value : value * 1000;
                    calculatedWaitMs = Math.max(calculatedWaitMs, Math.ceil(ms) + 600 + jitter);
                    hasParsedTime = true;
                }
            }
            if (!hasParsedTime) {
                calculatedWaitMs = Math.max(calculatedWaitMs, 60000 + jitter);
            }
            globalRateLimitBackoffUntil = Math.max(globalRateLimitBackoffUntil, Date.now() + calculatedWaitMs);
        }

        if (retries > 0) {
            if (
                msg.includes('EMPTY_RESPONSE') ||
                msg.includes('500') ||
                msg.includes('503') ||
                isRateLimit ||
                msg.includes('fetch')
            ) {
                const waitMs = isRateLimit
                    ? Math.max(calculatedWaitMs, globalRateLimitBackoffUntil - Date.now())
                    : calculatedWaitMs;

                onLog?.(`⏳ Retrying in ${(waitMs / 1000).toFixed(1)}s... (${retries} left)`);
                await delayWithAbort(waitMs, abortSignal);
                const effectiveMaxDelay = isRateLimit ? Math.max(maxDelay, 60000) : maxDelay;
                const nextDelay = Math.min(waitMs * backoffMultiplier, effectiveMaxDelay);
                return retryOperation(operation, retries - 1, nextDelay, opts);
            }
        }
        throw error;
    }
};

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

const isRetryableImageAbsenceFailure = (failure?: GenerateResponse['failure']): boolean =>
    failure?.code === 'no-image-data' || failure?.code === 'text-only';

const isRetryableImageAbsenceMessage = (message?: string): boolean => {
    const normalizedMessage = message?.toLowerCase() || '';
    return normalizedMessage.includes('no image data') || normalizedMessage.includes('text-only');
};

const shouldAttemptImageAbsenceRecovery = (result: any): boolean =>
    result.status === 'failed' &&
    (isRetryableImageAbsenceFailure(result.failure) || isRetryableImageAbsenceMessage(result.error));

const buildSuccessGenerationResult = (
    slotIndex: number,
    response: GenerateResponse,
    receivedResult?: ImageReceivedResult,
) => ({
    slotIndex,
    status: 'success' as const,
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
    partialResponse?: Pick<GenerateResponse, 'text' | 'thoughts' | 'resultParts' | 'metadata' | 'grounding' | 'sessionHints' | 'conversation'>,
) => {
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    const failure = getGenerationFailure(normalizedError);
    const carriedPartialResponse =
        partialResponse ||
        ((normalizedError as Error & { partialResponse?: any }).partialResponse ?? undefined);

    return {
        slotIndex,
        status: 'failed' as const,
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

const mergeRecoveredFailureResult = (initialResult: any, recoveryResult: any) => ({
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
    onImageReceived?: (url: string, slotIndex: number) => Promise<ImageReceivedResult | undefined> | ImageReceivedResult | undefined,
    onLog?: (msg: string) => void,
    abortSignal?: AbortSignal,
) => {
    try {
        const response = await generateSingleImage(options, slotIndex + 1, onLog, abortSignal);
        if (!response.imageUrl) {
            throw new Error('Model returned no image data.');
        }

        const receivedResult = onImageReceived ? await onImageReceived(response.imageUrl, slotIndex) : undefined;
        return buildSuccessGenerationResult(slotIndex, response, receivedResult);
    } catch (error) {
        if (error instanceof Error && error.message === 'ABORTED') {
            return {
                slotIndex,
                status: 'failed' as const,
                error: 'Generation cancelled',
            };
        }

        return buildFailedGenerationResult(slotIndex, error);
    }
};

const executeBlockingImageAttemptWithTransientRetry = async (
    options: GenerateOptions,
    slotIndex: number,
    onImageReceived?: (url: string, slotIndex: number) => Promise<ImageReceivedResult | undefined> | ImageReceivedResult | undefined,
    onLog?: (msg: string) => void,
    abortSignal?: AbortSignal,
) => {
    const correlationId = createDebugTerminalCorrelationId('gen');
    try {
        const isProModel = options.model?.toLowerCase().includes('pro');
        const maxRetries = isProModel ? 6 : 3;

        const response = await retryOperation(
            () => generateSingleImage(options, slotIndex + 1, onLog, abortSignal, correlationId),
            maxRetries,
            1500,
            {
                backoffMultiplier: 2,
                maxDelay: 8000,
                abortSignal,
                onLog,
                correlationId,
                route: '/api/images/generate',
                source: 'generation',
                operation: `Image #${slotIndex + 1} generation`,
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
                status: 'failed' as const,
                error: 'Generation cancelled',
            };
        }

        return buildFailedGenerationResult(slotIndex, error);
    }
};

export class LocalBackendProvider implements WorkspaceExecutionProvider {
    readonly id = 'local' as const;

    async checkApiKey(): Promise<boolean> {
        try {
            const res = await fetch('/api/health');
            return res.ok;
        } catch {
            return false;
        }
    }

    async promptForApiKey(): Promise<void> {
        window.alert('Missing GEMINI_API_KEY. Add it to .env.local and restart the dev server.');
    }

    async generateImages(
        options: GenerateOptions,
        batchSize: number = 1,
        callbacks: ProgressCallbacks = {},
    ): Promise<any[]> {
        const { onImageReceived, onLog, abortSignal, onProgress, onResult, onSlotStart } = callbacks;
        const STAGGER_DELAY_MS = 1000;
        let completedCount = 0;

        const finalizeBatchResult = (result: any) => {
            completedCount += 1;
            onProgress?.(completedCount, batchSize);
            onResult?.(result);
            return result;
        };

        const promises = Array.from({ length: batchSize }).map(async (_, index) => {
            if (index > 0) {
                await delayWithAbort(index * STAGGER_DELAY_MS, abortSignal);
            }

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

            onSlotStart?.(index);
            const initialResult = await executeBlockingImageAttemptWithTransientRetry(
                options,
                index,
                onImageReceived,
                onLog,
                abortSignal,
            );

            if (initialResult.status === 'success' || initialResult.error === 'Generation cancelled') {
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
    }

    async enhancePrompt(
        currentPrompt: string,
        lang: Language,
        safetyThresholds: Partial<SafetyThresholds> = DEFAULT_SAFETY_THRESHOLDS,
        thinkingLevel: PromptThinkingLevel = 'low',
    ): Promise<string> {
        const correlationId = createDebugTerminalCorrelationId('prompt');
        const requestPayload = { currentPrompt, lang, safetyThresholds, thinkingLevel };
        const response = await retryOperation(
            () => fetchJson<{ text: string }>(
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
            ),
            2,
            1500,
            {
                backoffMultiplier: 2,
                maxDelay: 8000,
                correlationId,
                route: '/api/prompt/enhance',
                source: 'prompt-tools',
                operation: 'Prompt enhancer',
            },
        );

        const promptText = response.text?.trim();
        if (!promptText) {
            throw new Error('Prompt enhancement returned empty text.');
        }

        return promptText;
    }

    async generateRandomPrompt(
        lang: Language,
        safetyThresholds: Partial<SafetyThresholds> = DEFAULT_SAFETY_THRESHOLDS,
        thinkingLevel: PromptThinkingLevel = 'low',
    ): Promise<string> {
        const correlationId = createDebugTerminalCorrelationId('prompt');
        const requestPayload = { lang, safetyThresholds, thinkingLevel };
        const response = await retryOperation(
            () => fetchJson<{ text: string }>(
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
            ),
            2,
            1500,
            {
                backoffMultiplier: 2,
                maxDelay: 8000,
                correlationId,
                route: '/api/prompt/random',
                source: 'prompt-tools',
                operation: 'Random prompt',
            },
        );

        const promptText = response.text?.trim();
        if (!promptText) {
            throw new Error('Random prompt generation returned empty text.');
        }

        return promptText;
    }

    async generatePromptFromImage(
        imageDataUrl: string,
        lang: Language,
        safetyThresholds: Partial<SafetyThresholds> = DEFAULT_SAFETY_THRESHOLDS,
        thinkingLevel: PromptThinkingLevel = 'low',
    ): Promise<string> {
        const correlationId = createDebugTerminalCorrelationId('prompt');
        const requestPayload = { imageDataUrl, lang, safetyThresholds, thinkingLevel };
        const response = await retryOperation(
            () => fetchJson<{ text: string }>(
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
            ),
            2,
            1500,
            {
                backoffMultiplier: 2,
                maxDelay: 8000,
                correlationId,
                route: '/api/prompt/image-to-prompt',
                source: 'prompt-tools',
                operation: 'Image to prompt',
            },
        );

        const promptText = response.text?.trim();
        if (!promptText) {
            throw new Error('Image to prompt returned empty text.');
        }

        return promptText;
    }
}

export const localBackendProvider = new LocalBackendProvider();
