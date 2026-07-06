import { GoogleGenAI } from '@google/genai/node';
import type { ConversationRequestContext, ResultPart, GroundingMetadata, ImageModel, ImageSize, ResultImagePart } from '../../types';
import { deriveGroundingMode } from '../../utils/groundingMode';
import {
    getGenerationFailureHttpStatus,
    isSafetyBlockedFinishReason,
    resolveGenerationFailureInfo,
} from '../../utils/generationFailure';
import {
    describeLiveProgressIneligibility,
    getLiveProgressCapabilityMatrix,
    LiveProgressArtifactKind,
    LiveProgressCapabilityCell,
    LiveProgressExecutionMode,
    summarizeLiveProgressTruthfulness,
} from '../../utils/liveProgressCapabilities';
import { VALID_IMAGE_MODELS, VALID_IMAGE_SIZES } from '../../utils/modelCapabilities';
import { DEFAULT_TEMPERATURE, normalizeTemperature } from '../../utils/temperature';
import {
    type ApiRequestContext,
    createApiRequestContext,
    logApiRequest,
    logApiError,
    logApiResponse,
    readJsonBody,
    sendClassifiedApiError,
    sendJson,
    startNdjsonStream,
    writeNdjsonEvent,
} from '../utils/apiHelpers';
import { buildConversationHistory } from '../utils/conversationHistory';
import { extractGroundingDetails } from '../utils/groundingExtraction';
import { extractImageDimensionsFromBase64, getImageArea, type ImageDimensions } from '../utils/imageDimensions';
import { buildGenerateParts, normalizeReferenceImages } from '../utils/imageReferences';
import { identifyBlockKeywords } from '../utils/promptHelpers';
import { buildImageRequestConfig, validateCapabilityRequest } from '../utils/requestConfig';

type ImageGenerateBody = {
    prompt?: string;
    model?: string;
    aspectRatio?: string;
    imageSize?: string;
    editingInput?: string;
    objectImageInputs?: string[];
    characterImageInputs?: string[];
    outputFormat?: 'images-only' | 'images-and-text';
    temperature?: number;
    thinkingLevel?: 'disabled' | 'minimal' | 'high';
    includeThoughts?: boolean;
    googleSearch?: boolean;
    imageSearch?: boolean;
    executionMode?: 'single-turn' | 'interactive-batch-variants' | 'chat-continuation' | 'queued-batch-job';
    conversationContext?: ConversationRequestContext | null;
};

type GeneratedResponsePayload = {
    imageUrl?: string;
    text?: string;
    thoughts?: string;
    resultParts?: ResultPart[];
    metadata?: Record<string, unknown>;
    grounding?: GroundingMetadata;
    sessionHints?: Record<string, unknown>;
    conversation?: {
        used: boolean;
        conversationId?: string;
        branchOriginId?: string;
        activeSourceHistoryId?: string;
        priorTurnCount?: number;
        historyLength?: number;
    };
};

type RegisterGenerateRoutesArgs = {
    getAIClient: () => GoogleGenAI;
    resolvedDir: string;
};

type NormalizedGeneratedResponsePart = {
    text?: string;
    thought?: boolean;
    thoughtSignature?: string;
    inlineData?: {
        data: string;
        mimeType: string;
    };
};

type NormalizedGeneratedResponseCandidate = {
    parts: NormalizedGeneratedResponsePart[];
    finishReason?: string;
    safetyRatings: any[];
};

type ExtractedTextResultPart = {
    sequence: number;
    kind: 'thought-text' | 'output-text';
    text: string;
    candidateIndex: number;
    partIndex: number;
};

type ExtractedImageResultPart = {
    sequence: number;
    kind: 'thought-image' | 'output-image';
    imageUrl: string;
    mimeType: string;
    imageDimensions: ImageDimensions | null;
    candidateIndex: number;
    partIndex: number;
};

type ExtractedResponsePart = ExtractedTextResultPart | ExtractedImageResultPart;

type LiveProgressAccumulatorState = {
    aggregatedParts: ExtractedResponsePart[];
    orderingStable: boolean;
    preCompletionArtifactCount: number;
    firstPreCompletionArtifactKind: LiveProgressArtifactKind | null;
    thoughtSignatureObserved: boolean;
};

type ExtractedResponseSummary = {
    imageUrl?: string;
    text?: string;
    thoughts?: string;
    resultParts?: ResultPart[];
    imageMimeType?: string;
    imageDimensions?: ImageDimensions | null;
    imagePartCount: number;
    thoughtImagePartCount: number;
    outputImagePartCount: number;
};

export type ExtractedGeneratedContent = {
    imageUrl?: string;
    text?: string;
    thoughts?: string;
    resultParts?: ResultPart[];
    imageMimeType?: string;
    imageDimensions?: ImageDimensions | null;
    thoughtSignaturePresent: boolean;
    thoughtSignature?: string;
    promptBlockReason?: string;
    finishReason?: string;
    safetyRatings?: any[];
    candidateCount?: number;
    partCount?: number;
    imagePartCount?: number;
    thoughtImagePartCount?: number;
    outputImagePartCount?: number;
    extractionIssue?: 'missing-candidates' | 'missing-parts' | 'no-image-data';
};

type PreparedGenerateRequest = {
    model: string;
    requestConfig: Record<string, unknown>;
    resolvedResponseModalities: string[];
    groundingMode: ReturnType<typeof deriveGroundingMode>;
    effectiveThinkingLevel: string;
    shouldIncludeThoughts: boolean;
    parts: any[];
    conversationHistory: ReturnType<typeof buildConversationHistory>;
    useOfficialConversation: boolean;
};

type ValidationErrorResult = {
    status: number;
    error: string;
};

type LiveProgressProbeBody = {
    cellIds?: string[];
    prompt?: string;
};

type LiveProgressProbeResult = {
    cell: LiveProgressCapabilityCell;
    gatePassed: boolean;
    gateReason?: string;
    transportOpened: boolean;
    eventGatePassed: boolean;
    orderingGatePassed: boolean;
    truthfulnessGatePassed: boolean;
    firstPreCompletionArtifactKind: LiveProgressArtifactKind | null;
    preCompletionArtifactCount: number;
    thoughtSignatureObserved: boolean;
    finalRenderArrived: boolean;
    truthfulnessOutcome: ReturnType<typeof summarizeLiveProgressTruthfulness>['truthfulnessOutcome'];
    error?: string;
};

type StreamStartEvent = {
    type: 'start';
    sessionId: string;
};

type StreamResultPartEvent = {
    type: 'result-part';
    sessionId: string;
    part: ResultPart;
};

type StreamCompleteEvent = {
    type: 'complete';
    sessionId: string;
    response: GeneratedResponsePayload;
    summary: ReturnType<typeof summarizeLiveProgressTruthfulness>;
};

type StreamFailureEvent = {
    type: 'failure';
    sessionId: string;
    error: string;
    failure?: ReturnType<typeof resolveGenerationFailureInfo>;
    response?: GeneratedResponsePayload;
    summary: ReturnType<typeof summarizeLiveProgressTruthfulness>;
};

function detectThinkingLoop(thoughts: string | undefined | null): boolean {
    if (!thoughts) return false;
    const sentences = thoughts
        .split(/[.\n!?，。！；？,]+/)
        .map((s) => s.trim())
        .filter((s) => s.length >= 10);
    const counts = new Map<string, number>();
    for (const sentence of sentences) {
        const count = (counts.get(sentence) || 0) + 1;
        if (count >= 5) {
            return true;
        }
        counts.set(sentence, count);
    }
    return false;
}

const DEFAULT_LIVE_PROGRESS_PROBE_PROMPT =
    'Create a polished studio image of a single yellow banana card on a calm neutral background.';

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

function withAbortSignal(requestConfig: Record<string, unknown>, abortSignal?: AbortSignal): Record<string, unknown> {
    return abortSignal ? { ...requestConfig, abortSignal } : requestConfig;
}

function createRequestAbortState(req: any, res: any) {
    const controller = new AbortController();
    let clientDisconnected = false;

    const abort = () => {
        if (res.writableEnded) {
            return;
        }

        clientDisconnected = true;
        if (!controller.signal.aborted) {
            controller.abort('client-disconnected');
        }
    };

    const cleanup = () => {
        req.off?.('aborted', abort);
        res.off?.('close', abort);
        res.off?.('finish', cleanup);
    };

    req.on?.('aborted', abort);
    res.on?.('close', abort);
    res.on?.('finish', cleanup);

    return {
        signal: controller.signal,
        cleanup,
        isDisconnected: () => clientDisconnected || controller.signal.aborted,
        isWritable: () => !clientDisconnected && !res.writableEnded && !res.destroyed,
    };
}

function unwrapGeneratedResponse(response: any): any {
    if (response?.response && typeof response.response === 'object') {
        return response.response;
    }

    return response;
}

function resolveGeneratedResponseCandidates(response: any): any[] {
    const unwrappedResponse = unwrapGeneratedResponse(response);
    return Array.isArray(unwrappedResponse?.candidates) ? unwrappedResponse.candidates : [];
}

function resolveGeneratedResponsePromptBlockReason(response: any): string | undefined {
    const unwrappedResponse = unwrapGeneratedResponse(response);
    const promptFeedback = unwrappedResponse?.promptFeedback ?? unwrappedResponse?.prompt_feedback;
    const blockReason = promptFeedback?.blockReason ?? promptFeedback?.block_reason;

    return typeof blockReason === 'string' && blockReason.length > 0 && blockReason !== 'BLOCK_REASON_UNSPECIFIED'
        ? blockReason
        : undefined;
}

function normalizeGeneratedResponsePart(part: any): NormalizedGeneratedResponsePart {
    const inlineData = part?.inlineData ?? part?.inline_data;
    const data = typeof inlineData?.data === 'string' && inlineData.data.length > 0 ? inlineData.data : undefined;
    const mimeType =
        typeof inlineData?.mimeType === 'string' && inlineData.mimeType.length > 0
            ? inlineData.mimeType
            : typeof inlineData?.mime_type === 'string' && inlineData.mime_type.length > 0
              ? inlineData.mime_type
              : 'image/png';
    const thoughtSignature =
        typeof part?.thoughtSignature === 'string' && part.thoughtSignature.length > 0
            ? part.thoughtSignature
            : typeof part?.thought_signature === 'string' && part.thought_signature.length > 0
              ? part.thought_signature
              : undefined;

    return {
        text: typeof part?.text === 'string' ? part.text : undefined,
        thought: part?.thought === true,
        thoughtSignature,
        inlineData: data
            ? {
                  data,
                  mimeType,
              }
            : undefined,
    };
}

function normalizeGeneratedResponseCandidate(candidate: any): NormalizedGeneratedResponseCandidate {
    const parts = Array.isArray(candidate?.content?.parts)
        ? candidate.content.parts.map((part: any) => normalizeGeneratedResponsePart(part))
        : [];

    return {
        parts,
        finishReason:
            typeof candidate?.finishReason === 'string'
                ? candidate.finishReason
                : typeof candidate?.finish_reason === 'string'
                  ? candidate.finish_reason
                  : undefined,
        safetyRatings: Array.isArray(candidate?.safetyRatings)
            ? candidate.safetyRatings
            : Array.isArray(candidate?.safety_ratings)
              ? candidate.safety_ratings
              : [],
    };
}

const isThoughtResultPart = (part: ResultPart | ExtractedResponsePart) =>
    part.kind === 'thought-text' || part.kind === 'thought-image';

const toPublicResultPart = (part: ExtractedResponsePart): ResultPart => {
    if (part.kind === 'thought-image' || part.kind === 'output-image') {
        return {
            sequence: part.sequence,
            kind: part.kind,
            imageUrl: part.imageUrl,
            mimeType: part.mimeType,
        };
    }
    return {
        sequence: part.sequence,
        kind: part.kind,
        text: (part as ExtractedTextResultPart).text,
    };
};

const buildResultPartKey = (part: ResultPart) => {
    if (part.kind === 'thought-text' || part.kind === 'output-text') {
        return `${part.kind}:${part.text}`;
    }
    const imagePart = part as ResultImagePart;
    return `${imagePart.kind}:${imagePart.mimeType}:${imagePart.imageUrl}`;
};

const countSharedPrefix = (left: string[], right: string[]) => {
    let index = 0;

    while (index < left.length && index < right.length && left[index] === right[index]) {
        index += 1;
    }

    return index;
};

const resequenceExtractedParts = (parts: ExtractedResponsePart[], startSequence: number): ExtractedResponsePart[] =>
    parts.map((part, index) => ({
        ...part,
        sequence: startSequence + index,
    }));

const extractResponsePartsFromCandidates = (candidates: NormalizedGeneratedResponseCandidate[]) => {
    const extractedParts: ExtractedResponsePart[] = [];
    let thoughtSignaturePresent = false;
    let thoughtSignature: string | undefined;
    let totalPartCount = 0;
    let sequence = 0;

    candidates.forEach((candidate, candidateIndex) => {
        totalPartCount += candidate.parts.length;

        candidate.parts.forEach((part, partIndex) => {
            if (typeof part.thoughtSignature === 'string' && part.thoughtSignature.length > 0) {
                thoughtSignaturePresent = true;
                thoughtSignature = thoughtSignature || part.thoughtSignature;
            }

            if (typeof part.text === 'string' && part.text.trim()) {
                extractedParts.push({
                    sequence,
                    kind:
                        part.thought === true || typeof part.thoughtSignature === 'string'
                            ? 'thought-text'
                            : 'output-text',
                    text: part.text.trim(),
                    candidateIndex,
                    partIndex,
                });
                sequence += 1;
            }

            if (!part.inlineData?.data) {
                return;
            }

            const mimeType = part.inlineData.mimeType || 'image/png';
            if (!mimeType.startsWith('image/')) {
                return;
            }

            extractedParts.push({
                sequence,
                kind: part.thought === true ? 'thought-image' : 'output-image',
                imageUrl: `data:${mimeType};base64,${part.inlineData.data}`,
                mimeType,
                imageDimensions: extractImageDimensionsFromBase64(part.inlineData.data, mimeType),
                candidateIndex,
                partIndex,
            });
            sequence += 1;
        });
    });

    return {
        extractedParts,
        thoughtSignaturePresent,
        thoughtSignature,
        totalPartCount,
    };
};

const summarizeExtractedResponseParts = (parts: ExtractedResponsePart[]): ExtractedResponseSummary => {
    const textParts: string[] = [];
    const thoughtParts: string[] = [];
    const imageCandidates = parts.filter(
        (part): part is ExtractedImageResultPart => part.kind === 'thought-image' || part.kind === 'output-image',
    );
    const outputImageCandidates = imageCandidates.filter((part) => part.kind === 'output-image');

    parts.forEach((part) => {
        if (part.kind === 'thought-text') {
            thoughtParts.push(part.text);
        } else if (part.kind === 'output-text') {
            textParts.push(part.text);
        }
    });

    const selectedImage = outputImageCandidates.reduce<ExtractedImageResultPart | undefined>(
        (bestCandidate, candidate) => {
            if (!bestCandidate) {
                return candidate;
            }

            const bestArea = getImageArea(bestCandidate.imageDimensions);
            const candidateArea = getImageArea(candidate.imageDimensions);
            if (candidateArea > bestArea) {
                return candidate;
            }
            if (candidateArea === bestArea && candidate.candidateIndex > bestCandidate.candidateIndex) {
                return candidate;
            }
            if (
                candidateArea === bestArea &&
                candidate.candidateIndex === bestCandidate.candidateIndex &&
                candidate.partIndex > bestCandidate.partIndex
            ) {
                return candidate;
            }

            return bestCandidate;
        },
        undefined,
    );

    return {
        imageUrl: selectedImage?.imageUrl,
        text: textParts.length > 0 ? textParts.join('\n\n') : undefined,
        thoughts: thoughtParts.length > 0 ? thoughtParts.join('\n\n') : undefined,
        resultParts: parts.length > 0 ? parts.map((part) => toPublicResultPart(part)) : undefined,
        imageMimeType: selectedImage?.mimeType,
        imageDimensions: selectedImage?.imageDimensions,
        imagePartCount: imageCandidates.length,
        thoughtImagePartCount: imageCandidates.filter((part) => part.kind === 'thought-image').length,
        outputImagePartCount: outputImageCandidates.length,
    };
};

const buildExtractedGeneratedContent = ({
    parts,
    thoughtSignaturePresent,
    thoughtSignature,
    promptBlockReason,
    finishReason,
    safetyRatings,
    candidateCount,
    partCount,
}: {
    parts: ExtractedResponsePart[];
    thoughtSignaturePresent: boolean;
    thoughtSignature?: string;
    promptBlockReason?: string;
    finishReason?: string;
    safetyRatings?: any[];
    candidateCount: number;
    partCount: number;
}): ExtractedGeneratedContent => {
    const summary = summarizeExtractedResponseParts(parts);
    const extractionIssue =
        candidateCount === 0
            ? 'missing-candidates'
            : partCount === 0
              ? 'missing-parts'
              : summary.outputImagePartCount === 0
                ? 'no-image-data'
                : undefined;

    return {
        imageUrl: summary.imageUrl,
        text: summary.text,
        thoughts: summary.thoughts,
        resultParts: summary.resultParts,
        imageMimeType: summary.imageMimeType,
        imageDimensions: summary.imageDimensions,
        thoughtSignaturePresent,
        thoughtSignature,
        promptBlockReason,
        finishReason,
        safetyRatings: safetyRatings ?? [],
        candidateCount,
        partCount,
        imagePartCount: summary.imagePartCount,
        thoughtImagePartCount: summary.thoughtImagePartCount,
        outputImagePartCount: summary.outputImagePartCount,
        extractionIssue,
    };
};

export const createLiveProgressAccumulatorState = (): LiveProgressAccumulatorState => ({
    aggregatedParts: [],
    orderingStable: true,
    preCompletionArtifactCount: 0,
    firstPreCompletionArtifactKind: null,
    thoughtSignatureObserved: false,
});

export const applyLiveProgressChunkToAccumulator = (
    state: LiveProgressAccumulatorState,
    response: any,
): {
    state: LiveProgressAccumulatorState;
    newParts: ResultPart[];
} => {
    const candidates = resolveGeneratedResponseCandidates(response).map((candidate: any) =>
        normalizeGeneratedResponseCandidate(candidate),
    );
    const extracted = extractResponsePartsFromCandidates(candidates);
    const currentPublicParts = extracted.extractedParts.map((part) => toPublicResultPart(part));
    const aggregatePublicParts = state.aggregatedParts.map((part) => toPublicResultPart(part));
    const currentKeys = currentPublicParts.map((part) => buildResultPartKey(part));
    const aggregateKeys = aggregatePublicParts.map((part) => buildResultPartKey(part));
    const sharedPrefixLength = countSharedPrefix(currentKeys, aggregateKeys);
    let nextState: LiveProgressAccumulatorState = {
        ...state,
        thoughtSignatureObserved: state.thoughtSignatureObserved || extracted.thoughtSignaturePresent,
    };
    let newParts: ResultPart[] = [];

    if (currentKeys.length === 0) {
        return { state: nextState, newParts };
    }

    if (sharedPrefixLength === currentKeys.length && currentKeys.length <= aggregateKeys.length) {
        return { state: nextState, newParts };
    }

    if (sharedPrefixLength === aggregateKeys.length) {
        const appendedParts = resequenceExtractedParts(
            extracted.extractedParts.slice(sharedPrefixLength),
            state.aggregatedParts.length,
        );
        newParts = appendedParts.map((part) => toPublicResultPart(part));
        nextState = {
            ...nextState,
            aggregatedParts: [...state.aggregatedParts, ...appendedParts],
        };
    } else if (sharedPrefixLength === 0) {
        const appendedParts = resequenceExtractedParts(extracted.extractedParts, state.aggregatedParts.length);
        newParts = appendedParts.map((part) => toPublicResultPart(part));
        nextState = {
            ...nextState,
            aggregatedParts: [...state.aggregatedParts, ...appendedParts],
        };
    } else {
        const existingKeys = new Set(aggregateKeys);
        const appendedParts = resequenceExtractedParts(
            extracted.extractedParts.filter((part) => !existingKeys.has(buildResultPartKey(toPublicResultPart(part)))),
            state.aggregatedParts.length,
        );
        newParts = appendedParts.map((part) => toPublicResultPart(part));
        nextState = {
            ...nextState,
            aggregatedParts: [...state.aggregatedParts, ...appendedParts],
            orderingStable: false,
        };
        return { state: nextState, newParts };
    }

    if (nextState.orderingStable) {
        const firstThoughtPart = newParts.find((part) => isThoughtResultPart(part));
        const newThoughtPartCount = newParts.filter((part) => isThoughtResultPart(part)).length;
        nextState = {
            ...nextState,
            preCompletionArtifactCount: nextState.preCompletionArtifactCount + newThoughtPartCount,
            firstPreCompletionArtifactKind:
                nextState.firstPreCompletionArtifactKind ||
                firstThoughtPart?.kind ||
                nextState.firstPreCompletionArtifactKind,
        };
    }

    return {
        state: nextState,
        newParts,
    };
};

export function extractGeneratedContent(response: any): ExtractedGeneratedContent {
    const candidates = resolveGeneratedResponseCandidates(response).map((candidate: any) =>
        normalizeGeneratedResponseCandidate(candidate),
    );
    const primaryCandidate = candidates[0];
    const promptBlockReason = resolveGeneratedResponsePromptBlockReason(response);
    const extracted = extractResponsePartsFromCandidates(candidates);
    return buildExtractedGeneratedContent({
        parts: extracted.extractedParts,
        thoughtSignaturePresent: extracted.thoughtSignaturePresent,
        thoughtSignature: extracted.thoughtSignature,
        promptBlockReason,
        finishReason: primaryCandidate?.finishReason,
        safetyRatings: primaryCandidate?.safetyRatings ?? [],
        candidateCount: candidates.length,
        partCount: extracted.totalPartCount,
    });
}

export function extractStreamCompletionContent(
    state: LiveProgressAccumulatorState,
    response?: any,
): ExtractedGeneratedContent {
    const lastChunkExtracted = response
        ? extractGeneratedContent(response)
        : extractGeneratedContent({ candidates: [] });

    if (!state.orderingStable) {
        return lastChunkExtracted;
    }

    const hasAccumulatedActivity = state.aggregatedParts.length > 0 || state.thoughtSignatureObserved;
    const normalizedCandidateCount = Math.max(lastChunkExtracted.candidateCount ?? 0, hasAccumulatedActivity ? 1 : 0);
    const normalizedPartCount = Math.max(
        lastChunkExtracted.partCount ?? 0,
        state.aggregatedParts.length + (state.thoughtSignatureObserved ? 1 : 0),
    );

    return buildExtractedGeneratedContent({
        parts: state.aggregatedParts,
        thoughtSignaturePresent: state.thoughtSignatureObserved || lastChunkExtracted.thoughtSignaturePresent,
        thoughtSignature: lastChunkExtracted.thoughtSignature,
        promptBlockReason: lastChunkExtracted.promptBlockReason,
        finishReason: lastChunkExtracted.finishReason,
        safetyRatings: lastChunkExtracted.safetyRatings ?? [],
        candidateCount: normalizedCandidateCount,
        partCount: normalizedPartCount,
    });
}

function validateInteractiveGenerateRequest(
    routePath: string,
    body: ImageGenerateBody,
    requestContext?: ApiRequestContext,
): { model: string; objectImageInputs: string[]; characterImageInputs: string[] } | ValidationErrorResult {
    const model = String(body.model || 'gemini-3.1-flash-image');

    if (!VALID_IMAGE_MODELS.has(model as ImageModel)) {
        logApiError(routePath, new Error('Unsupported model'), { model }, requestContext);
        return { status: 400, error: `Unsupported model: ${model}` };
    }

    if (body.imageSize && !VALID_IMAGE_SIZES.has(body.imageSize as ImageSize)) {
        logApiError(routePath, new Error('Unsupported image size'), {
            imageSize: body.imageSize,
            model,
        }, requestContext);
        return { status: 400, error: `Unsupported image size: ${body.imageSize}` };
    }

    const capabilityError = validateCapabilityRequest(model, body);
    if (capabilityError) {
        logApiError(routePath, new Error('Unsupported capability request'), {
            model,
            capabilityError,
            body,
        }, requestContext);
        return { status: 400, error: capabilityError };
    }

    if (body.executionMode === 'queued-batch-job') {
        return {
            status: 400,
            error: 'Queued batch jobs must use /api/batches/create instead of the interactive generate route.',
        };
    }

    const { objectImageInputs, characterImageInputs } = normalizeReferenceImages(body);
    const totalReferenceImages = objectImageInputs.length + characterImageInputs.length;
    if (model === 'gemini-2.5-flash-image' && totalReferenceImages > 3) {
        logApiError(routePath, new Error('Too many reference images for gemini-2.5-flash-image'), {
            totalReferenceImages,
        }, requestContext);
        return {
            status: 400,
            error: 'gemini-2.5-flash-image works best with up to 3 input images according to current docs.',
        };
    }

    return {
        model,
        objectImageInputs,
        characterImageInputs,
    };
}

function buildPreparedGenerateRequest(
    model: string,
    body: ImageGenerateBody,
    resolvedDir: string,
): PreparedGenerateRequest {
    const { requestConfig, resolvedResponseModalities, groundingMode, effectiveThinkingLevel, shouldIncludeThoughts } =
        buildImageRequestConfig(model, body);
    const parts = buildGenerateParts(body, resolvedDir);
    const conversationHistory = buildConversationHistory(body.conversationContext, resolvedDir);
    const useOfficialConversation = body.executionMode === 'chat-continuation' && Boolean(body.conversationContext);

    return {
        model,
        requestConfig,
        resolvedResponseModalities,
        groundingMode,
        effectiveThinkingLevel,
        shouldIncludeThoughts,
        parts,
        conversationHistory,
        useOfficialConversation,
    };
}

async function executeBlockingGenerateRequest(
    ai: GoogleGenAI,
    prepared: PreparedGenerateRequest,
    abortSignal?: AbortSignal,
) {
    const requestConfig = withAbortSignal(prepared.requestConfig, abortSignal);

    return prepared.useOfficialConversation
        ? await ai.chats
              .create({
                  model: prepared.model,
                  config: requestConfig,
                  history: prepared.conversationHistory,
              })
              .sendMessage({
                  message: prepared.parts,
                  config: requestConfig,
              })
        : await ai.models.generateContent({
              model: prepared.model,
              contents: { parts: prepared.parts },
              config: requestConfig,
          });
}

async function executeStreamingGenerateRequest(
    ai: GoogleGenAI,
    prepared: PreparedGenerateRequest,
    abortSignal?: AbortSignal,
) {
    const requestConfig = withAbortSignal(prepared.requestConfig, abortSignal);

    return prepared.useOfficialConversation
        ? await ai.chats
              .create({
                  model: prepared.model,
                  config: requestConfig,
                  history: prepared.conversationHistory,
              })
              .sendMessageStream({
                  message: prepared.parts,
                  config: requestConfig,
              })
        : await ai.models.generateContentStream({
              model: prepared.model,
              contents: { parts: prepared.parts },
              config: requestConfig,
          });
}

function buildGeneratedResponsePayload(
    model: string,
    body: ImageGenerateBody,
    prepared: PreparedGenerateRequest,
    extracted: ExtractedGeneratedContent,
    groundingDetails: ReturnType<typeof extractGroundingDetails>,
    streamSummary?: ReturnType<typeof summarizeLiveProgressTruthfulness>,
): GeneratedResponsePayload {
    return {
        imageUrl: extracted.imageUrl,
        text: extracted.text,
        thoughts: extracted.thoughts,
        resultParts: extracted.resultParts,
        metadata: {
            model,
            outputFormat: body.outputFormat || 'images-only',
            temperature:
                typeof body.temperature === 'number' ? normalizeTemperature(body.temperature) : DEFAULT_TEMPERATURE,
            thinkingLevel: prepared.effectiveThinkingLevel,
            includeThoughts: prepared.shouldIncludeThoughts,
            requestedAspectRatio: body.aspectRatio || null,
            requestedImageSize: body.imageSize || null,
            actualOutput: extracted.imageDimensions
                ? {
                      width: extracted.imageDimensions.width,
                      height: extracted.imageDimensions.height,
                      mimeType: extracted.imageMimeType || 'image/png',
                  }
                : null,
        },
        grounding: {
            enabled: Boolean(body.googleSearch || body.imageSearch),
            imageSearch: Boolean(body.imageSearch),
            webQueries: groundingDetails.webQueries,
            imageQueries: groundingDetails.imageQueries,
            searchEntryPointAvailable: groundingDetails.searchEntryPointAvailable,
            searchEntryPointRenderedContent: groundingDetails.searchEntryPointRenderedContent,
            supports: groundingDetails.supports,
            sources: groundingDetails.sources,
        },
        sessionHints: {
            googleSearchRequested: Boolean(body.googleSearch),
            imageSearchRequested: Boolean(body.imageSearch),
            outputFormatRequested: body.outputFormat || 'images-only',
            responseModalitiesActual: prepared.resolvedResponseModalities.join('+'),
            thinkingLevelRequested: prepared.effectiveThinkingLevel,
            includeThoughtsRequested: prepared.shouldIncludeThoughts,
            imageSizeRequested: body.imageSize || null,
            actualImageWidth: extracted.imageDimensions?.width,
            actualImageHeight: extracted.imageDimensions?.height,
            actualImageMimeType: extracted.imageMimeType,
            actualImageDimensions: extracted.imageDimensions
                ? `${extracted.imageDimensions.width}x${extracted.imageDimensions.height}`
                : undefined,
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
            liveProgressTruthfulnessOutcome: streamSummary?.truthfulnessOutcome,
            liveProgressOrderingStable: streamSummary?.orderingStable,
            liveProgressPreCompletionArtifactCount: streamSummary?.preCompletionArtifactCount,
            liveProgressFirstPreCompletionArtifactKind: streamSummary?.firstPreCompletionArtifactKind,
            liveProgressThoughtSignatureObserved: streamSummary?.thoughtSignatureObserved,
            liveProgressFinalRenderArrived: streamSummary?.finalRenderArrived,
        },
        conversation: {
            used: prepared.useOfficialConversation,
            conversationId: body.conversationContext?.conversationId,
            branchOriginId: body.conversationContext?.branchOriginId,
            activeSourceHistoryId: body.conversationContext?.activeSourceHistoryId,
            priorTurnCount: body.conversationContext?.priorTurns.length || 0,
            historyLength: prepared.conversationHistory.length + (prepared.useOfficialConversation ? 2 : 0),
        },
    };
}

async function buildFailureResponse(
    ai: GoogleGenAI,
    routePath: string,
    prompt: string,
    model: string,
    prepared: PreparedGenerateRequest,
    extracted: ExtractedGeneratedContent,
    requestContext?: ApiRequestContext,
): Promise<{
    error: string;
    failure: ReturnType<typeof resolveGenerationFailureInfo>;
    status: number;
}> {
    const failure = resolveGenerationFailureInfo({
        text: extracted.text,
        thoughts: extracted.thoughts,
        promptBlockReason: extracted.promptBlockReason,
        finishReason: extracted.finishReason,
        safetyRatings: extracted.safetyRatings,
        extractionIssue: extracted.extractionIssue,
    });

    if (failure.code === 'safety-blocked') {
        const blockedCategories = (failure.blockedSafetyCategories ?? [])
            .filter((category) => typeof category === 'string' && category.trim().length > 0)
            .map((category) => category.trim());
        const reason =
            blockedCategories.length > 0
                ? blockedCategories.join(', ')
                : isSafetyBlockedFinishReason(failure.finishReason)
                  ? failure.finishReason || 'Unknown Safety Filter'
                  : 'Unknown Safety Filter';
        const specificKeywords = await identifyBlockKeywords(ai, prompt, reason);
        logApiError(routePath, new Error('Output blocked by safety filter'), { reason, model }, requestContext);
        return {
            error: `${failure.message} ${specificKeywords}`.trim(),
            failure,
            status: getGenerationFailureHttpStatus(failure),
        };
    }

    logApiError(routePath, new Error('Model returned no image data'), {
        model,
        finishReason: extracted.finishReason || 'UNKNOWN',
        responseModalitiesActual: prepared.resolvedResponseModalities,
        candidateCount: extracted.candidateCount ?? 0,
        partCount: extracted.partCount ?? 0,
        imagePartCount: extracted.imagePartCount ?? 0,
        textReturned: Boolean(extracted.text),
        textLength: extracted.text?.length ?? 0,
        thoughtsReturned: Boolean(extracted.thoughts),
        extractionIssue: extracted.extractionIssue || null,
    }, requestContext);

    return {
        error: failure.message,
        failure,
        status: getGenerationFailureHttpStatus(failure),
    };
}

function buildStreamTruthSummary(
    state: LiveProgressAccumulatorState,
    finalRenderArrived: boolean,
    transportOpened: boolean,
) {
    return summarizeLiveProgressTruthfulness({
        transportOpened,
        orderingStable: state.orderingStable,
        preCompletionArtifactCount: state.preCompletionArtifactCount,
        firstPreCompletionArtifactKind: state.firstPreCompletionArtifactKind,
        thoughtSignatureObserved: state.thoughtSignatureObserved,
        finalRenderArrived,
    });
}

async function runLiveProgressProbeCell(
    ai: GoogleGenAI,
    resolvedDir: string,
    cell: LiveProgressCapabilityCell,
    prompt: string,
): Promise<LiveProgressProbeResult> {
    const gateReason = describeLiveProgressIneligibility({
        model: cell.model,
        executionMode: cell.executionMode,
        outputFormat: cell.outputFormat,
        thinkingLevel: cell.thinkingLevel,
        includeThoughts: cell.includeThoughts,
        batchSize: 1,
    });

    if (gateReason) {
        return {
            cell,
            gatePassed: false,
            gateReason,
            transportOpened: false,
            eventGatePassed: false,
            orderingGatePassed: false,
            truthfulnessGatePassed: false,
            firstPreCompletionArtifactKind: null,
            preCompletionArtifactCount: 0,
            thoughtSignatureObserved: false,
            finalRenderArrived: false,
            truthfulnessOutcome: 'final-only',
        };
    }

    const body: ImageGenerateBody = {
        prompt,
        model: cell.model,
        outputFormat: cell.outputFormat,
        includeThoughts: cell.includeThoughts,
        thinkingLevel: cell.thinkingLevel,
        executionMode: cell.executionMode as LiveProgressExecutionMode,
        googleSearch: false,
        imageSearch: false,
    };
    const validated = validateInteractiveGenerateRequest('/api/images/live-progress-probe', body);
    if ('status' in validated) {
        return {
            cell,
            gatePassed: false,
            gateReason: validated.error,
            transportOpened: false,
            eventGatePassed: false,
            orderingGatePassed: false,
            truthfulnessGatePassed: false,
            firstPreCompletionArtifactKind: null,
            preCompletionArtifactCount: 0,
            thoughtSignatureObserved: false,
            finalRenderArrived: false,
            truthfulnessOutcome: 'final-only',
            error: validated.error,
        };
    }

    const prepared = buildPreparedGenerateRequest(validated.model, body, resolvedDir);
    const stream = await executeStreamingGenerateRequest(ai, prepared);
    let state = createLiveProgressAccumulatorState();
    let lastChunk: any = null;
    let transportOpened = false;

    for await (const chunk of stream) {
        transportOpened = true;
        lastChunk = chunk;
        const applied = applyLiveProgressChunkToAccumulator(state, chunk);
        state = applied.state;
    }

    const extracted = extractStreamCompletionContent(state, lastChunk);
    const summary = buildStreamTruthSummary(state, Boolean(extracted?.imageUrl), transportOpened);

    return {
        cell,
        gatePassed: true,
        transportOpened,
        eventGatePassed: transportOpened && state.preCompletionArtifactCount > 0,
        orderingGatePassed: summary.orderingStable,
        truthfulnessGatePassed: summary.truthfulnessOutcome === 'live-progress',
        firstPreCompletionArtifactKind: summary.firstPreCompletionArtifactKind,
        preCompletionArtifactCount: summary.preCompletionArtifactCount,
        thoughtSignatureObserved: summary.thoughtSignatureObserved,
        finalRenderArrived: summary.finalRenderArrived,
        truthfulnessOutcome: summary.truthfulnessOutcome,
    };
}

export function registerGenerateRoutes(server: any, { getAIClient, resolvedDir }: RegisterGenerateRoutesArgs): void {
    server.use('/api/images/generate', async (req: any, res: any) => {
        const requestContext = createApiRequestContext(req, '/api/images/generate');
        const requestAbortState = createRequestAbortState(req, res);

        if (req.method !== 'POST') {
            sendJson(res, 405, { error: 'Method not allowed' }, { requestContext, summary: 'Method not allowed' });
            return;
        }

        try {
            const ai = getAIClient();
            const body = await readJsonBody<ImageGenerateBody>(req);
            logApiRequest(requestContext, {
                source: 'generation',
                model: String(body.model || 'gemini-3.1-flash-image'),
                executionMode: body.executionMode || 'single-turn',
                outputFormat: body.outputFormat || 'images-only',
                hasConversationContext: Boolean(body.conversationContext),
                objectImageCount: Array.isArray(body.objectImageInputs) ? body.objectImageInputs.length : 0,
                characterImageCount: Array.isArray(body.characterImageInputs) ? body.characterImageInputs.length : 0,
                hasEditingInput: Boolean(body.editingInput),
                includeThoughts: Boolean(body.includeThoughts),
            });
            const validated = validateInteractiveGenerateRequest('/api/images/generate', body, requestContext);
            if ('status' in validated) {
                sendJson(res, validated.status, { error: validated.error }, {
                    requestContext,
                    summary: validated.error,
                    details: { source: 'generation' },
                });
                return;
            }

            const prepared = buildPreparedGenerateRequest(validated.model, body, resolvedDir);
            const response = await executeBlockingGenerateRequest(ai, prepared, requestAbortState.signal);

            if (requestAbortState.isDisconnected()) {
                return;
            }

            const blockReason = response.promptFeedback?.blockReason as string | undefined;
            if (blockReason && blockReason !== 'BLOCK_REASON_UNSPECIFIED' && blockReason !== 'NONE') {
                const failure = resolveGenerationFailureInfo({ promptBlockReason: blockReason });
                logApiError('/api/images/generate', new Error('Prompt rejected by policy'), {
                    blockReason,
                    model: validated.model,
                }, requestContext);
                if (!requestAbortState.isWritable()) {
                    return;
                }
                sendJson(
                    res,
                    getGenerationFailureHttpStatus(failure),
                    {
                        error: failure.message,
                        failure,
                    },
                    {
                        requestContext,
                        summary: failure.message,
                        details: {
                            source: 'generation',
                            model: validated.model,
                            failureCode: failure.code,
                            blockReason,
                        },
                    },
                );
                return;
            }

            const extracted = extractGeneratedContent(response);
            if (extracted.imageUrl) {
                const groundingDetails = extractGroundingDetails(response);
                const payload = buildGeneratedResponsePayload(
                    validated.model,
                    body,
                    prepared,
                    extracted,
                    groundingDetails,
                );
                if (!requestAbortState.isWritable()) {
                    return;
                }
                sendJson(res, 200, payload, {
                    requestContext,
                    summary: 'Generated image response',
                    details: {
                        source: 'generation',
                        model: validated.model,
                        hasImage: Boolean(payload.imageUrl),
                        textLength: payload.text?.length ?? 0,
                        hasThoughts: Boolean(payload.thoughts),
                        resultPartCount: payload.resultParts?.length ?? 0,
                        hasGrounding: Boolean(payload.grounding),
                    },
                });
                return;
            }

            const failureResponse = await buildFailureResponse(
                ai,
                '/api/images/generate',
                String(body.prompt || ''),
                validated.model,
                prepared,
                extracted,
                requestContext,
            );
            if (!requestAbortState.isWritable()) {
                return;
            }
            sendJson(
                res,
                failureResponse.status,
                {
                    error: failureResponse.error,
                    failure: failureResponse.failure,
                },
                {
                    requestContext,
                    summary: failureResponse.error,
                    details: {
                        source: 'generation',
                        model: validated.model,
                        failureCode: failureResponse.failure.code,
                    },
                },
            );
        } catch (error: any) {
            if (isAbortLikeError(error) || requestAbortState.isDisconnected()) {
                return;
            }

            sendClassifiedApiError(res, '/api/images/generate', error, 'Image generation failed', {
                defaultStatus: 502,
                requestContext,
                details: {
                    source: 'generation',
                },
            });
        } finally {
            requestAbortState.cleanup();
        }
    });

    server.use('/api/images/generate-stream', async (req: any, res: any) => {
        const requestContext = createApiRequestContext(req, '/api/images/generate-stream');
        const requestAbortState = createRequestAbortState(req, res);

        if (req.method !== 'POST') {
            sendJson(res, 405, { error: 'Method not allowed' }, { requestContext, summary: 'Method not allowed' });
            return;
        }

        let sessionId = crypto.randomUUID();
        let liveState = createLiveProgressAccumulatorState();
        let transportOpened = false;

        try {
            const ai = getAIClient();
            const body = await readJsonBody<ImageGenerateBody>(req);
            logApiRequest(requestContext, {
                source: 'generation',
                model: String(body.model || 'gemini-3.1-flash-image'),
                executionMode: body.executionMode || 'single-turn',
                outputFormat: body.outputFormat || 'images-only',
                hasConversationContext: Boolean(body.conversationContext),
                objectImageCount: Array.isArray(body.objectImageInputs) ? body.objectImageInputs.length : 0,
                characterImageCount: Array.isArray(body.characterImageInputs) ? body.characterImageInputs.length : 0,
                hasEditingInput: Boolean(body.editingInput),
                includeThoughts: Boolean(body.includeThoughts),
            });
            const validated = validateInteractiveGenerateRequest('/api/images/generate-stream', body, requestContext);
            if ('status' in validated) {
                sendJson(res, validated.status, { error: validated.error }, {
                    requestContext,
                    summary: validated.error,
                    details: { source: 'generation' },
                });
                return;
            }

            const liveProgressError = describeLiveProgressIneligibility({
                model: validated.model as LiveProgressCapabilityCell['model'],
                executionMode: body.executionMode || 'single-turn',
                outputFormat: body.outputFormat || 'images-only',
                thinkingLevel:
                    body.thinkingLevel ||
                    (validated.model === 'gemini-3.1-flash-image' ? 'minimal' : 'disabled'),
                includeThoughts: Boolean(body.includeThoughts),
                batchSize: 1,
            });
            if (liveProgressError) {
                sendJson(res, 400, { error: liveProgressError }, {
                    requestContext,
                    summary: liveProgressError,
                    details: { source: 'generation', model: validated.model },
                });
                return;
            }

            const prepared = buildPreparedGenerateRequest(validated.model, body, resolvedDir);
            const stream = await executeStreamingGenerateRequest(ai, prepared, requestAbortState.signal);
            let lastChunk: any = null;
            let lastGroundingChunk: any = null;

            if (!requestAbortState.isWritable()) {
                return;
            }

            startNdjsonStream(res, 200, {
                requestContext,
                summary: 'Live progress stream opened',
                details: {
                    source: 'generation',
                    model: validated.model,
                    sessionId,
                },
            });
            transportOpened = true;
            writeNdjsonEvent<StreamStartEvent>(res, {
                type: 'start',
                sessionId,
            });

            const startTime = Date.now();
            for await (const chunk of stream) {
                throwIfAborted(requestAbortState.signal);
                lastChunk = chunk;

                if (chunk?.candidates?.[0]?.groundingMetadata) {
                    lastGroundingChunk = chunk;
                }

                const applied = applyLiveProgressChunkToAccumulator(liveState, chunk);
                liveState = applied.state;

                applied.newParts.forEach((part) => {
                    throwIfAborted(requestAbortState.signal);
                    writeNdjsonEvent<StreamResultPartEvent>(res, {
                        type: 'result-part',
                        sessionId,
                        part,
                    });
                });

                const thoughts = liveState.aggregatedParts
                    .filter((p) => p.kind === 'thought-text')
                    .map((p) => p.text || '')
                    .join('');

                const duration = Date.now() - startTime;
                const hasImage = liveState.aggregatedParts.some((p) => p.kind === 'output-image');

                if (detectThinkingLoop(thoughts)) {
                    throw new Error('Thinking loop detected: repetitive reasoning clauses observed 5 or more times.');
                }
                if (thoughts.length > 12000) {
                    throw new Error('Thinking loop detected: reasoning character limit exceeded 12000 characters.');
                }
                if (duration > 180000 && !hasImage) {
                    throw new Error('Thinking loop detected: stream ran for over 180 seconds without generating an image.');
                }
            }

            throwIfAborted(requestAbortState.signal);

            const extracted = extractStreamCompletionContent(liveState, lastChunk);
            const groundingDetails = extractGroundingDetails(lastGroundingChunk || lastChunk || {});
            const summary = buildStreamTruthSummary(liveState, Boolean(extracted.imageUrl), transportOpened);

            if (extracted.imageUrl) {
                const payload = buildGeneratedResponsePayload(
                    validated.model,
                    body,
                    prepared,
                    extracted,
                    groundingDetails,
                    summary,
                );
                if (!requestAbortState.isWritable()) {
                    return;
                }
                logApiResponse(requestContext, 200, {
                    source: 'generation',
                    phase: 'stream-complete',
                    sessionId,
                    model: validated.model,
                    hasImage: Boolean(payload.imageUrl),
                    textLength: payload.text?.length ?? 0,
                    hasThoughts: Boolean(payload.thoughts),
                    resultPartCount: payload.resultParts?.length ?? 0,
                    truthfulnessOutcome: summary.truthfulnessOutcome,
                });
                writeNdjsonEvent<StreamCompleteEvent>(res, {
                    type: 'complete',
                    sessionId,
                    response: payload,
                    summary,
                });
                if (requestAbortState.isWritable()) {
                    res.end();
                }
                return;
            }

            const failureResponse = await buildFailureResponse(
                ai,
                '/api/images/generate-stream',
                String(body.prompt || ''),
                validated.model,
                prepared,
                extracted,
                requestContext,
            );
            const partialResponse =
                extracted.resultParts?.length || extracted.text || extracted.thoughts
                    ? buildGeneratedResponsePayload(
                          validated.model,
                          body,
                          prepared,
                          extracted,
                          groundingDetails,
                          summary,
                      )
                    : undefined;
            if (!requestAbortState.isWritable()) {
                return;
            }
            logApiResponse(requestContext, failureResponse.status, {
                source: 'generation',
                phase: 'stream-failure',
                sessionId,
                model: validated.model,
                failureCode: failureResponse.failure.code,
                truthfulnessOutcome: summary.truthfulnessOutcome,
                hasPartialResponse: Boolean(partialResponse),
            });
            writeNdjsonEvent<StreamFailureEvent>(res, {
                type: 'failure',
                sessionId,
                error: failureResponse.error,
                failure: failureResponse.failure,
                response: partialResponse,
                summary,
            });
            if (requestAbortState.isWritable()) {
                res.end();
            }
        } catch (error: any) {
            if (isAbortLikeError(error) || requestAbortState.isDisconnected()) {
                return;
            }

            if (res.headersSent) {
                const summary = buildStreamTruthSummary(liveState, false, transportOpened);
                logApiError(
                    '/api/images/generate-stream',
                    error,
                    {
                        source: 'generation',
                        phase: 'stream-active',
                        sessionId,
                        truthfulnessOutcome: summary.truthfulnessOutcome,
                    },
                    requestContext,
                );
                if (!requestAbortState.isWritable()) {
                    return;
                }
                const isLoopError = error?.message?.includes('Thinking loop detected');
                const failure = isLoopError
                    ? resolveGenerationFailureInfo({
                          explicitError: error.message,
                          thoughts: extractStreamCompletionContent(liveState, lastChunk).thoughts,
                      })
                    : undefined;

                writeNdjsonEvent<StreamFailureEvent>(res, {
                    type: 'failure',
                    sessionId,
                    error: error?.message || 'Image generation failed',
                    failure,
                    summary,
                });
                if (requestAbortState.isWritable()) {
                    res.end();
                }
                return;
            }

            sendClassifiedApiError(res, '/api/images/generate-stream', error, 'Image generation failed', {
                defaultStatus: 502,
                requestContext,
                details: {
                    source: 'generation',
                    sessionId,
                },
            });
        } finally {
            requestAbortState.cleanup();
        }
    });

    server.use('/api/images/live-progress-probe', async (req: any, res: any) => {
        if (req.method !== 'POST') {
            sendJson(res, 405, { error: 'Method not allowed' });
            return;
        }

        try {
            const ai = getAIClient();
            const body = await readJsonBody<LiveProgressProbeBody>(req);
            const requestedIds = Array.isArray(body.cellIds)
                ? body.cellIds.filter((value): value is string => typeof value === 'string' && value.length > 0)
                : [];
            const matrix = getLiveProgressCapabilityMatrix({ includeExcluded: true });
            const selectedCells =
                requestedIds.length > 0 ? matrix.filter((cell) => requestedIds.includes(cell.id)) : matrix;
            const unknownCellIds = requestedIds.filter(
                (requestedId) => !matrix.some((cell) => cell.id === requestedId),
            );
            const prompt =
                typeof body.prompt === 'string' && body.prompt.trim()
                    ? body.prompt.trim()
                    : DEFAULT_LIVE_PROGRESS_PROBE_PROMPT;

            const results: LiveProgressProbeResult[] = [];
            for (const cell of selectedCells) {
                results.push(await runLiveProgressProbeCell(ai, resolvedDir, cell, prompt));
            }

            sendJson(res, 200, {
                prompt,
                requestedCellIds: requestedIds,
                unknownCellIds,
                results,
                summary: {
                    total: results.length,
                    gatePassed: results.filter((result) => result.gatePassed).length,
                    truthfulnessPassed: results.filter((result) => result.truthfulnessGatePassed).length,
                    liveProgress: results.filter((result) => result.truthfulnessOutcome === 'live-progress').length,
                },
            });
        } catch (error: any) {
            sendClassifiedApiError(res, '/api/images/live-progress-probe', error, 'Live progress probe failed', {
                defaultStatus: 502,
            });
        }
    });
}
