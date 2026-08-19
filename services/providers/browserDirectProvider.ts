import { GoogleGenAI } from '@google/genai';
import {
    DEFAULT_SAFETY_THRESHOLDS,
    GenerateOptions,
    GenerateResponse,
    ImageReceivedResult,
    ResultImagePart,
    ResultPart,
    ResultTextPart,
    type PromptThinkingLevel,
    type SafetyThresholds,
} from '../../types';
import {
    buildImageToPromptInstruction,
    buildPromptEnhancerInstruction,
    buildRandomPromptInstruction,
    buildRandomPromptRequest,
    normalizePromptToolLanguage,
} from '../../utils/geminiPromptHelpers';
import { buildSafetySettings, toPromptGeminiThinkingLevel } from '../../utils/geminiApiConfig';
import {
    attachGenerationFailure,
    getGenerationFailure,
    normalizeGenerationFailureInfo,
    resolveGenerationFailureInfo,
} from '../../utils/generationFailure';
import { buildBrowserConversationHistory, buildBrowserGenerateParts } from '../../utils/browserGeminiParts';
import { extractGeneratedContent } from '../../utils/geminiResponseExtraction';
import { LiveProgressStreamTruthSummary, summarizeLiveProgressTruthfulness } from '../../utils/liveProgressCapabilities';
import { hasConfiguredGeminiApiKey, promptForGeminiApiKey, resolveGeminiApiKey } from '../../utils/geminiCredentials';
import { loadImageDimensions } from '../../utils/imageSaveUtils';
import { buildStyleAwareImagePrompt } from '../../utils/stylePromptBuilder';
import { DEFAULT_TEMPERATURE, normalizeTemperature } from '../../utils/temperature';
import { Language } from '../../utils/translations';
import { extractGroundingDetails } from '../../utils/geminiGroundingExtraction';
import { buildImageRequestConfig, validateCapabilityRequest } from '../../utils/geminiRequestConfig';
import { emitDebugTerminalEvent } from '../../utils/debugTerminalEvents';
import type { GenerationLiveProgressEvent, ProgressCallbacks, WorkspaceExecutionProvider } from './types';

function isAbortLikeError(error: unknown): boolean {
    return (
        (error instanceof DOMException && error.name === 'AbortError') ||
        (error instanceof Error && error.message === 'ABORTED')
    );
}

function throwIfAborted(abortSignal?: AbortSignal): void {
    if (abortSignal?.aborted) {
        throw new Error('ABORTED');
    }
}

function withAbortSignal<T extends { abortSignal?: AbortSignal }>(config: T, abortSignal?: AbortSignal): T {
    return abortSignal ? { ...config, abortSignal } : config;
}

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

type InlinePromptToolImage = {
    data: string;
    mimeType: string;
};

type GenerationResultPartialResponse = Pick<
    GenerateResponse,
    'text' | 'thoughts' | 'resultParts' | 'metadata' | 'grounding' | 'sessionHints' | 'conversation'
>;

type InitialBatchAttemptOutcome = {
    result: any;
    needsRecovery: boolean;
};

type BrowserLiveProgressAccumulator = {
    resultParts: ResultPart[];
    orderingStable: boolean;
    preCompletionArtifactCount: number;
    firstPreCompletionArtifactKind: LiveProgressStreamTruthSummary['firstPreCompletionArtifactKind'];
    thoughtSignatureObserved: boolean;
};

type PreparedBrowserGenerateRequest = {
    debugRequestId: string;
    requestBody: {
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
    requestConfig: ReturnType<typeof buildImageRequestConfig>['requestConfig'];
    resolvedResponseModalities: ReturnType<typeof buildImageRequestConfig>['resolvedResponseModalities'];
    groundingMode: ReturnType<typeof buildImageRequestConfig>['groundingMode'];
    effectiveThinkingLevel: ReturnType<typeof buildImageRequestConfig>['effectiveThinkingLevel'];
    shouldIncludeThoughts: ReturnType<typeof buildImageRequestConfig>['shouldIncludeThoughts'];
    parts: Awaited<ReturnType<typeof buildBrowserGenerateParts>>;
    conversationHistoryResult: Awaited<ReturnType<typeof buildBrowserConversationHistory>>;
    useOfficialConversation: boolean;
    ai: GoogleGenAI;
};

type DebugGeminiAuthState = {
    source: 'env' | 'aistudio-intercepted' | 'missing';
    hasVisibleEnvKey: boolean;
    hasAiStudioHost: boolean;
};

const isTextResultPart = (part: ResultPart): part is ResultTextPart =>
    part.kind === 'thought-text' || part.kind === 'output-text';

const isImageResultPart = (part: ResultPart): part is ResultImagePart =>
    part.kind === 'thought-image' || part.kind === 'output-image';

const isOutputImageResultPart = (part: ResultPart): part is ResultImagePart & { kind: 'output-image' } =>
    part.kind === 'output-image';

const buildResultPartIdentityKey = (part: ResultPart) =>
    isTextResultPart(part)
        ? `${part.kind}:${part.sequence}:${part.text}`
        : `${part.kind}:${part.sequence}:${part.mimeType}:${part.imageUrl}`;

const isThoughtResultPart = (part: ResultPart): boolean =>
    part.kind === 'thought-text' || part.kind === 'thought-image';

const createBrowserLiveProgressAccumulator = (): BrowserLiveProgressAccumulator => ({
    resultParts: [],
    orderingStable: true,
    preCompletionArtifactCount: 0,
    firstPreCompletionArtifactKind: null,
    thoughtSignatureObserved: false,
});

const countSharedPrefix = (left: string[], right: string[]): number => {
    let sharedPrefixLength = 0;

    while (
        sharedPrefixLength < left.length &&
        sharedPrefixLength < right.length &&
        left[sharedPrefixLength] === right[sharedPrefixLength]
    ) {
        sharedPrefixLength += 1;
    }

    return sharedPrefixLength;
};

const resequenceResultParts = (parts: ResultPart[], startingSequence: number): ResultPart[] =>
    parts.map((part, index) => ({
        ...part,
        sequence: startingSequence + index,
    }));

const summarizeResultParts = (parts: ResultPart[]) => {
    const outputTextParts: string[] = [];
    const thoughtTextParts: string[] = [];
    const imageParts = parts.filter(isImageResultPart);
    const outputImageParts = imageParts.filter(isOutputImageResultPart);
    let selectedOutputImage: (ResultImagePart & { kind: 'output-image' }) | undefined;

    outputImageParts.forEach((candidate) => {
        if (!selectedOutputImage || candidate.sequence > selectedOutputImage.sequence) {
            selectedOutputImage = candidate;
        }
    });

    parts.forEach((part) => {
        if (part.kind === 'thought-text') {
            thoughtTextParts.push(part.text.trim());
            return;
        }

        if (part.kind === 'output-text') {
            outputTextParts.push(part.text.trim());
        }
    });

    return {
        imageUrl: selectedOutputImage?.imageUrl,
        imageMimeType: selectedOutputImage?.mimeType,
        text: outputTextParts.filter(Boolean).join('\n\n') || undefined,
        thoughts: thoughtTextParts.filter(Boolean).join('\n\n') || undefined,
        resultParts: parts.length > 0 ? parts : undefined,
        imagePartCount: imageParts.length,
        thoughtImagePartCount: imageParts.filter((part) => part.kind === 'thought-image').length,
        outputImagePartCount: outputImageParts.length,
    };
};

const buildCompletedBrowserStreamExtraction = (
    state: BrowserLiveProgressAccumulator,
    lastChunk: any,
): ReturnType<typeof extractGeneratedContent> => {
    const lastChunkExtracted = lastChunk
        ? extractGeneratedContent(lastChunk)
        : extractGeneratedContent({ candidates: [] } as any);

    if (!state.orderingStable || (state.resultParts.length === 0 && !state.thoughtSignatureObserved)) {
        return lastChunkExtracted;
    }

    const summary = summarizeResultParts(state.resultParts);
    const normalizedCandidateCount = Math.max(
        lastChunkExtracted.candidateCount ?? 0,
        state.resultParts.length > 0 || state.thoughtSignatureObserved ? 1 : 0,
    );
    const normalizedPartCount = Math.max(
        lastChunkExtracted.partCount ?? 0,
        state.resultParts.length + (state.thoughtSignatureObserved ? 1 : 0),
    );
    const extractionIssue =
        normalizedCandidateCount === 0
            ? 'missing-candidates'
            : normalizedPartCount === 0
              ? 'missing-parts'
              : summary.outputImagePartCount === 0
                ? 'no-image-data'
                : undefined;

    return {
        ...lastChunkExtracted,
        imageUrl: summary.imageUrl ?? lastChunkExtracted.imageUrl,
        text: lastChunkExtracted.text ?? summary.text,
        thoughts: lastChunkExtracted.thoughts ?? summary.thoughts,
        resultParts: summary.resultParts ?? lastChunkExtracted.resultParts,
        imageMimeType: summary.imageMimeType ?? lastChunkExtracted.imageMimeType,
        candidateCount: normalizedCandidateCount,
        partCount: normalizedPartCount,
        imagePartCount: Math.max(lastChunkExtracted.imagePartCount ?? 0, summary.imagePartCount),
        thoughtImagePartCount: Math.max(lastChunkExtracted.thoughtImagePartCount ?? 0, summary.thoughtImagePartCount),
        outputImagePartCount: Math.max(lastChunkExtracted.outputImagePartCount ?? 0, summary.outputImagePartCount),
        extractionIssue,
    };
};

const applyBrowserStreamChunkToAccumulator = (
    state: BrowserLiveProgressAccumulator,
    response: any,
): {
    state: BrowserLiveProgressAccumulator;
    newParts: ResultPart[];
    extracted: ReturnType<typeof extractGeneratedContent>;
} => {
    const extracted = extractGeneratedContent(response);
    const currentResultParts = [...(extracted.resultParts || [])].sort((left, right) => left.sequence - right.sequence);
    const currentKeys = currentResultParts.map(buildResultPartIdentityKey);
    const aggregateKeys = state.resultParts.map(buildResultPartIdentityKey);
    const sharedPrefixLength = countSharedPrefix(currentKeys, aggregateKeys);
    let nextState: BrowserLiveProgressAccumulator = {
        ...state,
        thoughtSignatureObserved: state.thoughtSignatureObserved || extracted.thoughtSignaturePresent,
    };
    let newParts: ResultPart[] = [];

    if (currentKeys.length === 0) {
        return { state: nextState, newParts, extracted };
    }

    if (sharedPrefixLength === currentKeys.length && currentKeys.length <= aggregateKeys.length) {
        return { state: nextState, newParts, extracted };
    }

    if (sharedPrefixLength === aggregateKeys.length) {
        newParts = resequenceResultParts(currentResultParts.slice(sharedPrefixLength), state.resultParts.length);
        nextState = {
            ...nextState,
            resultParts: [...state.resultParts, ...newParts],
        };
    } else if (sharedPrefixLength === 0) {
        newParts = resequenceResultParts(currentResultParts, state.resultParts.length);
        nextState = {
            ...nextState,
            resultParts: [...state.resultParts, ...newParts],
        };
    } else {
        nextState = {
            ...nextState,
            orderingStable: false,
        };
        return { state: nextState, newParts: [], extracted };
    }

    const newThoughtParts = newParts.filter((part) => isThoughtResultPart(part));
    if (nextState.orderingStable && newThoughtParts.length > 0) {
        nextState = {
            ...nextState,
            preCompletionArtifactCount: nextState.preCompletionArtifactCount + newThoughtParts.length,
            firstPreCompletionArtifactKind:
                nextState.firstPreCompletionArtifactKind ||
                newThoughtParts[0].kind ||
                nextState.firstPreCompletionArtifactKind,
        };
    }

    return {
        state: nextState,
        newParts,
        extracted,
    };
};

const buildBrowserLiveProgressSummary = (
    state: BrowserLiveProgressAccumulator,
    finalRenderArrived: boolean,
    transportOpened: boolean,
): LiveProgressStreamTruthSummary =>
    summarizeLiveProgressTruthfulness({
        transportOpened,
        orderingStable: state.orderingStable,
        preCompletionArtifactCount: state.preCompletionArtifactCount,
        firstPreCompletionArtifactKind: state.firstPreCompletionArtifactKind,
        thoughtSignatureObserved: state.thoughtSignatureObserved,
        finalRenderArrived,
    });

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

const cleanPromptToolResponseText = (text: string | undefined, fallback: string): string =>
    (text?.trim() || fallback).replace(/^["']|["']$/g, '');

const AI_STUDIO_API_UNAVAILABLE_ERROR = 'Gemini API is not available in this AI Studio session.';
const AI_STUDIO_INTERCEPTED_API_KEY = 'AISTUDIO_INTERCEPTED_KEY';

const createDebugRequestId = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    return `request-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const resolveGeminiClientAuthState = (): DebugGeminiAuthState => {
    const hasVisibleEnvKey = Boolean(resolveGeminiApiKey());
    const hasAiStudioHost = typeof window !== 'undefined' && Boolean(window.aistudio);

    return {
        source: hasVisibleEnvKey ? 'env' : hasAiStudioHost ? 'aistudio-intercepted' : 'missing',
        hasVisibleEnvKey,
        hasAiStudioHost,
    };
};

const buildGenerationRequestSummary = (options: GenerateOptions, imgIndex: number): string =>
    `Image #${imgIndex}: ${options.model} via ${options.executionMode || 'single-turn'}`;

const buildResponseSummary = (response: GenerateResponse): string =>
    [
        response.imageUrl ? 'image' : null,
        response.text ? 'text' : null,
        response.thoughts ? 'thoughts' : null,
        response.failure?.code ? `failure:${response.failure.code}` : null,
    ]
        .filter(Boolean)
        .join(' | ') || 'no output content';

const buildErrorSummary = (error: unknown): string => {
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    const failure = getGenerationFailure(normalizedError);

    return failure ? `${normalizedError.message} (${failure.code})` : normalizedError.message;
};

const emitGenerationDebugEvent = ({
    kind,
    label,
    summary,
    payload,
    requestId,
    sessionId,
    slotIndex,
}: {
    kind: 'request' | 'response' | 'error' | 'stream' | 'retry' | 'log';
    label: string;
    summary?: string;
    payload?: unknown;
    requestId?: string;
    sessionId?: string;
    slotIndex?: number;
}) => {
    emitDebugTerminalEvent({
        kind,
        label,
        summary,
        payload,
        requestId,
        sessionId,
        slotIndex,
    });
};

const getGeminiClient = (): GoogleGenAI => {
    let apiKey = resolveGeminiApiKey();
    if (!apiKey) {
        if (typeof window !== 'undefined' && window.aistudio) {
            apiKey = AI_STUDIO_INTERCEPTED_API_KEY;
        } else {
            throw new Error(AI_STUDIO_API_UNAVAILABLE_ERROR);
        }
    }

    return new GoogleGenAI({
        apiKey,
        httpOptions: {
            headers: {
                'User-Agent': 'aistudio-build',
            },
        },
    });
};

const prepareBrowserGenerateRequest = async (
    options: GenerateOptions,
    imgIndex: number,
    onLog?: (msg: string) => void,
    abortSignal?: AbortSignal,
): Promise<PreparedBrowserGenerateRequest> => {
    const debugRequestId = createDebugRequestId();
    const finalPrompt = buildStyleAwareImagePrompt(options);
    const requestBody = {
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
    };

    if (abortSignal?.aborted) {
        throw new Error('ABORTED');
    }

    const capabilityError = validateCapabilityRequest(options.model, requestBody);
    if (capabilityError) {
        throw new Error(capabilityError);
    }

    const { requestConfig, resolvedResponseModalities, groundingMode, effectiveThinkingLevel, shouldIncludeThoughts } =
        buildImageRequestConfig(options.model, requestBody);
    const parts = await buildBrowserGenerateParts(requestBody);
    const conversationHistoryResult = await buildBrowserConversationHistory(options.conversationContext);
    const useOfficialConversation =
        options.executionMode === 'chat-continuation' &&
        Boolean(options.conversationContext) &&
        conversationHistoryResult.usable;

    if (options.executionMode === 'chat-continuation' && !conversationHistoryResult.usable) {
        onLog?.(
            `Image #${imgIndex}: Conversation history could not be reconstructed from browser-available assets. Falling back to a single-turn request.`,
        );
    }

    emitGenerationDebugEvent({
        kind: 'request',
        label: `Image #${imgIndex}: Request prepared`,
        summary: buildGenerationRequestSummary(options, imgIndex),
        requestId: debugRequestId,
        payload: {
            requestBody,
            requestConfig,
            resolvedResponseModalities,
            groundingMode,
            effectiveThinkingLevel,
            shouldIncludeThoughts,
            parts,
            conversationHistory: {
                usable: conversationHistoryResult.usable,
                historyLength: conversationHistoryResult.history.length,
            },
            useOfficialConversation,
            auth: resolveGeminiClientAuthState(),
        },
    });

    return {
        debugRequestId,
        requestBody,
        requestConfig,
        resolvedResponseModalities,
        groundingMode,
        effectiveThinkingLevel,
        shouldIncludeThoughts,
        parts,
        conversationHistoryResult,
        useOfficialConversation,
        ai: getGeminiClient(),
    };
};

const buildGenerateResponseFromSdkResponse = async ({
    options,
    prepared,
    sdkResponse,
    extracted,
    imgIndex,
    onLog,
    abortSignal,
}: {
    options: GenerateOptions;
    prepared: PreparedBrowserGenerateRequest;
    sdkResponse: any;
    extracted: ReturnType<typeof extractGeneratedContent>;
    imgIndex: number;
    onLog?: (msg: string) => void;
    abortSignal?: AbortSignal;
}): Promise<GenerateResponse> => {
    throwIfAborted(abortSignal);

    const groundingDetails = extractGroundingDetails(sdkResponse || {});
    const actualOutput = extracted.imageUrl
        ? await loadImageDimensions(extracted.imageUrl)
              .then(({ width, height }) => ({
                  width,
                  height,
                  mimeType: extracted.imageMimeType || 'image/png',
              }))
              .catch(() => null)
        : null;

    throwIfAborted(abortSignal);

    if (!extracted.imageUrl) {
        const failure = resolveGenerationFailureInfo({
            text: extracted.text,
            thoughts: extracted.thoughts,
            promptBlockReason: extracted.promptBlockReason,
            finishReason: extracted.finishReason,
            safetyRatings: extracted.safetyRatings,
            extractionIssue: extracted.extractionIssue,
        });

        throw attachGenerationFailure(new Error(failure.message), failure);
    }

    const response: GenerateResponse = {
        imageUrl: extracted.imageUrl,
        text: extracted.text,
        thoughts: extracted.thoughts,
        resultParts: extracted.resultParts,
        metadata: {
            model: options.model,
            outputFormat: options.outputFormat || 'images-only',
            temperature:
                typeof options.temperature === 'number'
                    ? normalizeTemperature(options.temperature)
                    : DEFAULT_TEMPERATURE,
            thinkingLevel: prepared.effectiveThinkingLevel,
            includeThoughts: prepared.shouldIncludeThoughts,
            requestedAspectRatio: options.aspectRatio || null,
            requestedImageSize: prepared.requestBody.imageSize || null,
            actualOutput,
        },
        grounding: {
            enabled: Boolean(options.googleSearch || options.imageSearch),
            imageSearch: Boolean(options.imageSearch),
            webQueries: groundingDetails.webQueries,
            imageQueries: groundingDetails.imageQueries,
            searchEntryPointAvailable: groundingDetails.searchEntryPointAvailable,
            searchEntryPointRenderedContent: groundingDetails.searchEntryPointRenderedContent,
            supports: groundingDetails.supports,
            sources: groundingDetails.sources,
        },
        sessionHints: {
            googleSearchRequested: Boolean(options.googleSearch),
            imageSearchRequested: Boolean(options.imageSearch),
            outputFormatRequested: options.outputFormat || 'images-only',
            responseModalitiesActual: prepared.resolvedResponseModalities.join('+'),
            thinkingLevelRequested: prepared.effectiveThinkingLevel,
            includeThoughtsRequested: prepared.shouldIncludeThoughts,
            imageSizeRequested: prepared.requestBody.imageSize || null,
            actualImageWidth: actualOutput?.width,
            actualImageHeight: actualOutput?.height,
            actualImageMimeType: actualOutput?.mimeType,
            actualImageDimensions: actualOutput ? `${actualOutput.width}x${actualOutput.height}` : undefined,
            groundingMode: prepared.groundingMode,
            groundingMetadataReturned: Boolean(
                groundingDetails.searchEntryPointAvailable || groundingDetails.sources.length,
            ),
            textReturned: Boolean(extracted.text),
            thoughtsReturned: Boolean(extracted.thoughts),
            thoughtImagesReturned: Boolean(extracted.thoughtImagePartCount),
            resultPartsReturned: extracted.resultParts?.length || 0,
            thoughtSignatureReturned: extracted.thoughtSignaturePresent,
            thoughtSignature: extracted.thoughtSignature,
            sourcesReturned: groundingDetails.sources.length,
            webQueriesReturned: groundingDetails.webQueries.length,
            imageQueriesReturned: groundingDetails.imageQueries.length,
            groundingSupportsReturned: groundingDetails.supports.length,
            officialConversationUsed: prepared.useOfficialConversation,
        },
        conversation: {
            used: prepared.useOfficialConversation,
            conversationId: options.conversationContext?.conversationId,
            branchOriginId: options.conversationContext?.branchOriginId,
            activeSourceHistoryId: options.conversationContext?.activeSourceHistoryId,
            priorTurnCount: options.conversationContext?.priorTurns.length || 0,
            historyLength:
                prepared.conversationHistoryResult.history.length + (prepared.useOfficialConversation ? 2 : 0),
        },
    };

    throwIfAborted(abortSignal);
    onLog?.(`Image #${imgIndex}: Success.`);
    return response;
};

const parseInlineImageFromDataUrl = (imageDataUrl: string): InlinePromptToolImage | null => {
    const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/i);
    if (!match?.[2]) {
        return null;
    }

    return {
        mimeType: match[1] || 'image/png',
        data: match[2],
    };
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
    partialResponse?: GenerationResultPartialResponse,
) => {
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    const failure = getGenerationFailure(normalizedError);
    const carriedPartialResponse =
        partialResponse ||
        ((normalizedError as Error & { partialResponse?: GenerationResultPartialResponse }).partialResponse ??
            undefined);

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

const mergeRecoveredFailureResult = (
    initialResult: any,
    recoveryResult: any,
) => ({
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

const modelRateLimitBackoffs = new Map<string, number>();

const getModelRateLimitBackoffUntil = (model: string): number => {
    return modelRateLimitBackoffs.get(model) || 0;
};

const clearModelRateLimitBackoff = (model: string): void => {
    modelRateLimitBackoffs.delete(model);
};

const updateGlobalRateLimitBackoff = (model: string, msg: string): void => {
    const isRateLimit = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED');
    if (!isRateLimit) {
        return;
    }

    const retryAfterMatch = msg.match(/retry.?after[:\s]*(\d+)/i);
    const jitter = Math.random() * 1500;
    let calculatedWaitMs = 1500;

    if (retryAfterMatch) {
        calculatedWaitMs = Math.max(calculatedWaitMs, parseInt(retryAfterMatch[1], 10) * 1000 + jitter);
    } else {
        const retryInMatch = msg.match(/retry\s+in\s+([\d.]+)\s*(ms|s)/i);
        if (retryInMatch) {
            const value = parseFloat(retryInMatch[1]);
            const isMs = retryInMatch[2].toLowerCase() === 'ms';
            const ms = isMs ? value : value * 1000;
            calculatedWaitMs = Math.max(calculatedWaitMs, Math.ceil(ms) + 600 + jitter);
        } else {
            calculatedWaitMs = Math.max(calculatedWaitMs, 60000 + jitter);
        }
    }

    const nextBackoff = Date.now() + calculatedWaitMs;
    modelRateLimitBackoffs.set(model, Math.max(getModelRateLimitBackoffUntil(model), nextBackoff));
};

interface DirectRetryOptions {
    backoffMultiplier?: number;
    maxDelay?: number;
    abortSignal?: AbortSignal;
    onLog?: (msg: string) => void;
    model?: string;
    initialRetries?: number;
}

const retryOperation = async <T>(
    operation: () => Promise<T>,
    retries: number,
    delayMs: number = 1500,
    opts?: DirectRetryOptions,
): Promise<T> => {
    const { backoffMultiplier = 2, maxDelay = 8000, abortSignal, onLog, model, initialRetries = retries } = opts || {};
    try {
        const now = Date.now();
        const backoffUntil = model ? getModelRateLimitBackoffUntil(model) : 0;
        if (now < backoffUntil) {
            const extraWait = backoffUntil - now;
            const releaseJitter = Math.random() * 1000;
            const totalWait = extraWait + releaseJitter;
            onLog?.(`⏳ Rate limit backoff active, stalling request for ${(totalWait / 1000).toFixed(1)}s...`);
            await delayWithAbort(totalWait, abortSignal);
        }
        return await operation();
    } catch (error: any) {
        const msg = error.message || '';
        const isDeterministicQuota = msg.includes('limit: 0') || (msg.includes('quota') && !msg.includes('429') && !msg.includes('RESOURCE_EXHAUSTED'));
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

        if (model) {
            updateGlobalRateLimitBackoff(model, msg);
        }

        if (retries > 0) {
            const isRateLimit = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED');
            if (
                msg.includes('EMPTY_RESPONSE') ||
                msg.includes('500') ||
                msg.includes('503') ||
                isRateLimit ||
                msg.includes('fetch')
            ) {
                const waitMs = isRateLimit && model
                    ? Math.max(delayMs, getModelRateLimitBackoffUntil(model) - Date.now())
                    : delayMs;

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
): Promise<GenerateResponse> => {
    onLog?.(`Image #${imgIndex}: Sending request...`);
    const prepared = await prepareBrowserGenerateRequest(options, imgIndex, onLog, abortSignal);
    const requestConfig = withAbortSignal(prepared.requestConfig, abortSignal);
    throwIfAborted(abortSignal);

    try {
        const response = prepared.useOfficialConversation
            ? await prepared.ai.chats
                  .create({
                      model: options.model,
                      config: requestConfig,
                      history: prepared.conversationHistoryResult.history,
                  })
                  .sendMessage({
                      message: prepared.parts,
                      config: requestConfig,
                  })
            : await prepared.ai.models.generateContent({
                  model: options.model,
                  contents: { parts: prepared.parts },
                  config: requestConfig,
              });

        throwIfAborted(abortSignal);
        const extracted = extractGeneratedContent(response);
        const generateResponse = await buildGenerateResponseFromSdkResponse({
            options,
            prepared,
            sdkResponse: response,
            extracted,
            imgIndex,
            onLog,
            abortSignal,
        });

        if (options.model) {
            clearModelRateLimitBackoff(options.model);
        }

        emitGenerationDebugEvent({
            kind: 'response',
            label: `Image #${imgIndex}: Request completed`,
            summary: buildResponseSummary(generateResponse),
            requestId: prepared.debugRequestId,
            payload: {
                response: generateResponse,
            },
        });

        return generateResponse;
    } catch (error: any) {
        if (isAbortLikeError(error)) {
            throw new Error('ABORTED');
        }

        if (options.model) {
            updateGlobalRateLimitBackoff(options.model, error.message || '');
        }

        emitGenerationDebugEvent({
            kind: 'error',
            label: `Image #${imgIndex}: Request failed`,
            summary: buildErrorSummary(error),
            requestId: prepared.debugRequestId,
            payload: {
                error,
                failure: getGenerationFailure(error),
            },
        });

        throw error;
    }
};

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
    try {
        const isProModel = options.model?.toLowerCase().includes('pro');
        const maxRetries = isProModel ? 6 : 3;

        const response = await retryOperation(
            () => generateSingleImage(options, slotIndex + 1, onLog, abortSignal),
            maxRetries,
            1500,
            {
                backoffMultiplier: 2,
                maxDelay: 8000,
                abortSignal,
                onLog,
                model: options.model,
                initialRetries: maxRetries,
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

export class BrowserDirectProvider implements WorkspaceExecutionProvider {
    readonly id = 'direct' as const;

    async checkApiKey(): Promise<boolean> {
        return hasConfiguredGeminiApiKey();
    }

    async promptForApiKey(): Promise<void> {
        await promptForGeminiApiKey();
    }

    async generateImages(
        options: GenerateOptions,
        batchSize: number = 1,
        callbacks: ProgressCallbacks = {},
    ): Promise<any[]> {
        const { onImageReceived, onLog, abortSignal, onProgress, onResult, onSlotStart } = callbacks;
        let completedCount = 0;

        const finalizeBatchResult = (result: any) => {
            completedCount += 1;
            onProgress?.(completedCount, batchSize);
            onResult?.(result);
            return result;
        };

        const results: any[] = [];
        const isUnitTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

        for (let index = 0; index < batchSize; index++) {
            if (index > 0 && !isUnitTest) {
                try {
                    const isProModel = options.model?.toLowerCase().includes('pro');
                    const staggerDelay = isProModel ? 15000 : 5000;
                    await delayWithAbort(staggerDelay, abortSignal);
                } catch (error) {
                    results.push(
                        finalizeBatchResult({
                            slotIndex: index,
                            status: 'failed',
                            error:
                                error instanceof Error && error.message === 'ABORTED'
                                    ? 'Generation cancelled'
                                    : String(error),
                        }),
                    );
                    continue;
                }
            }

            if (abortSignal?.aborted) {
                results.push(
                    finalizeBatchResult({
                        slotIndex: index,
                        status: 'failed',
                        error: 'Generation cancelled',
                    }),
                );
                continue;
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
                results.push(finalizeBatchResult(initialResult));
                continue;
            }

            if (shouldAttemptImageAbsenceRecovery(initialResult)) {
                onLog?.(`Image #${index + 1}: No final image returned. Scheduling one recovery attempt.`);

                if (!isUnitTest) {
                    try {
                        const isProModel = options.model?.toLowerCase().includes('pro');
                        const staggerDelay = isProModel ? 15000 : 5000;
                        await delayWithAbort(staggerDelay, abortSignal);
                    } catch (error) {
                        results.push(
                            finalizeBatchResult({
                                slotIndex: index,
                                status: 'failed',
                                error: 'Generation cancelled',
                            }),
                        );
                        continue;
                    }
                }

                if (abortSignal?.aborted) {
                    results.push(
                        finalizeBatchResult({
                            slotIndex: index,
                            status: 'failed',
                            error: 'Generation cancelled',
                        }),
                    );
                    continue;
                }

                onLog?.(`Image #${index + 1}: Retrying once after image-absence failure.`);
                const recoveredResult = await executeBlockingImageAttempt(
                    options,
                    index,
                    onImageReceived,
                    onLog,
                    abortSignal,
                );
                const finalizedResult =
                    recoveredResult.status === 'success'
                        ? recoveredResult
                        : mergeRecoveredFailureResult(initialResult, recoveredResult);

                if (finalizedResult.status === 'failed') {
                    onLog?.(`Image #${index + 1} Failed: ${finalizedResult.error}`);
                }

                results.push(finalizeBatchResult(finalizedResult));
                continue;
            }

            onLog?.(`Image #${index + 1} Failed: ${initialResult.error}`);
            results.push(finalizeBatchResult(initialResult));
        }

        return results;
    }

    async enhancePrompt(
        currentPrompt: string,
        lang: Language,
        safetyThresholds: Partial<SafetyThresholds> = DEFAULT_SAFETY_THRESHOLDS,
        thinkingLevel: PromptThinkingLevel = 'low',
    ): Promise<string> {
        const normalizedLanguage = normalizePromptToolLanguage(lang);
        const requestId = createDebugRequestId();
        const resolvedSafetySettings = buildSafetySettings(safetyThresholds ?? DEFAULT_SAFETY_THRESHOLDS);
        const requestPayload = {
            model: 'gemini-3.7-flash',
            config: {
                systemInstruction: buildPromptEnhancerInstruction(normalizedLanguage),
                ...(resolvedSafetySettings ? { safetySettings: resolvedSafetySettings } : {}),
                thinkingConfig: {
                    thinkingLevel: toPromptGeminiThinkingLevel(thinkingLevel),
                },
            },
            contents: `Original prompt to rewrite: "${currentPrompt || 'A creative image'}"`,
        };

        const response = await retryOperation(() => getGeminiClient().models.generateContent(requestPayload), 2, 1500, {
            backoffMultiplier: 2,
            maxDelay: 8000,
        });
        const promptText = cleanPromptToolResponseText(response.text, '');
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
        const normalizedLanguage = normalizePromptToolLanguage(lang);
        const requestId = createDebugRequestId();
        const resolvedSafetySettings = buildSafetySettings(safetyThresholds ?? DEFAULT_SAFETY_THRESHOLDS);
        const requestPayload = {
            model: 'gemini-3.7-flash',
            config: {
                systemInstruction: buildRandomPromptInstruction(normalizedLanguage),
                ...(resolvedSafetySettings ? { safetySettings: resolvedSafetySettings } : {}),
                thinkingConfig: {
                    thinkingLevel: toPromptGeminiThinkingLevel(thinkingLevel),
                },
            },
            contents: buildRandomPromptRequest(),
        };

        const response = await retryOperation(() => getGeminiClient().models.generateContent(requestPayload), 2, 1500, {
            backoffMultiplier: 2,
            maxDelay: 8000,
        });
        const promptText = cleanPromptToolResponseText(response.text, '');
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
        const normalizedLanguage = normalizePromptToolLanguage(lang);
        const requestId = createDebugRequestId();
        const parsedImage = parseInlineImageFromDataUrl(imageDataUrl);
        if (!parsedImage) {
            throw new Error('Failed to parse uploaded image data for prompt generation.');
        }

        const resolvedSafetySettings = buildSafetySettings(safetyThresholds ?? DEFAULT_SAFETY_THRESHOLDS);
        const requestPayload = {
            model: 'gemini-3.7-flash',
            config: {
                systemInstruction: buildImageToPromptInstruction(normalizedLanguage),
                ...(resolvedSafetySettings ? { safetySettings: resolvedSafetySettings } : {}),
                thinkingConfig: {
                    thinkingLevel: toPromptGeminiThinkingLevel(thinkingLevel),
                },
            },
            contents: [
                {
                    parts: [
                        {
                            inlineData: {
                                mimeType: parsedImage.mimeType,
                                data: parsedImage.data,
                            },
                        },
                        {
                            text: `Analyze this image and describe it as a detailed, ready-to-generate image prompt in ${normalizedLanguage}.`,
                        },
                    ],
                },
            ],
        };

        const response = await retryOperation(() => getGeminiClient().models.generateContent(requestPayload), 2, 1500, {
            backoffMultiplier: 2,
            maxDelay: 8000,
        });
        const promptText = cleanPromptToolResponseText(response.text, '');
        if (!promptText) {
            throw new Error('Image to prompt returned empty text.');
        }

        return promptText;
    }
}

export const browserDirectProvider = new BrowserDirectProvider();
