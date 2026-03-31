import { GoogleGenAI } from '@google/genai';
import type { ConversationRequestContext, StructuredOutputMode } from '../../types';
import { VALID_IMAGE_MODELS, VALID_IMAGE_SIZES } from '../../utils/modelCapabilities';
import { normalizeStructuredOutputMode, parseStructuredOutputText } from '../../utils/structuredOutputs';
import { logApiError, readJsonBody, sendClassifiedApiError, sendJson } from '../utils/apiHelpers';
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
    structuredOutputMode?: StructuredOutputMode;
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
    structuredData?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    grounding?: {
        enabled: boolean;
        imageSearch?: boolean;
        sources?: Array<{ title: string; url: string }>;
    };
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

export function extractGeneratedContent(response: any): {
    imageUrl?: string;
    text?: string;
    thoughts?: string;
    imageMimeType?: string;
    imageDimensions?: ImageDimensions | null;
    thoughtSignaturePresent: boolean;
    thoughtSignature?: string;
    finishReason?: string;
    safetyRatings?: any[];
} {
    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts ?? [];
    const textParts: string[] = [];
    const thoughtParts: string[] = [];
    let thoughtSignaturePresent = false;
    let thoughtSignature: string | undefined;
    const imageCandidates: Array<{
        imageUrl: string;
        imageMimeType: string;
        imageDimensions: ImageDimensions | null;
        partIndex: number;
    }> = [];

    parts.forEach((part: any, partIndex: number) => {
        if (part.inlineData?.data) {
            const mimeType = part.inlineData.mimeType || 'image/png';
            if (!mimeType.startsWith('image/')) {
                return;
            }

            imageCandidates.push({
                imageUrl: `data:${mimeType};base64,${part.inlineData.data}`,
                imageMimeType: mimeType,
                imageDimensions: extractImageDimensionsFromBase64(part.inlineData.data, mimeType),
                partIndex,
            });
        }
        if (typeof part.thoughtSignature === 'string' && part.thoughtSignature.length > 0) {
            thoughtSignaturePresent = true;
            thoughtSignature = thoughtSignature || part.thoughtSignature;
        }
        if (typeof part.text === 'string' && part.text.trim()) {
            if (part.thought === true || typeof part.thoughtSignature === 'string') {
                thoughtParts.push(part.text.trim());
            } else {
                textParts.push(part.text.trim());
            }
        }
    });

    const selectedImage = imageCandidates.reduce<
        | {
              imageUrl: string;
              imageMimeType: string;
              imageDimensions: ImageDimensions | null;
              partIndex: number;
          }
        | undefined
    >((bestCandidate, candidate) => {
        if (!bestCandidate) {
            return candidate;
        }

        const bestArea = getImageArea(bestCandidate.imageDimensions);
        const candidateArea = getImageArea(candidate.imageDimensions);
        if (candidateArea > bestArea) {
            return candidate;
        }
        if (candidateArea === bestArea && candidate.partIndex > bestCandidate.partIndex) {
            return candidate;
        }

        return bestCandidate;
    }, undefined);

    return {
        imageUrl: selectedImage?.imageUrl,
        text: textParts.length > 0 ? textParts.join('\n\n') : undefined,
        thoughts: thoughtParts.length > 0 ? thoughtParts.join('\n\n') : undefined,
        imageMimeType: selectedImage?.imageMimeType,
        imageDimensions: selectedImage?.imageDimensions,
        thoughtSignaturePresent,
        thoughtSignature,
        finishReason: candidate?.finishReason,
        safetyRatings: candidate?.safetyRatings ?? [],
    };
}

export function registerGenerateRoutes(server: any, { getAIClient, resolvedDir }: RegisterGenerateRoutesArgs): void {
    server.use('/api/images/generate', async (req: any, res: any) => {
        if (req.method !== 'POST') {
            sendJson(res, 405, { error: 'Method not allowed' });
            return;
        }

        try {
            const ai = getAIClient();
            const body = await readJsonBody<ImageGenerateBody>(req);
            const model = String(body.model || 'gemini-3.1-flash-image-preview');

            if (!VALID_IMAGE_MODELS.has(model)) {
                logApiError('/api/images/generate', new Error('Unsupported model'), { model });
                sendJson(res, 400, { error: `Unsupported model: ${model}` });
                return;
            }

            if (body.imageSize && !VALID_IMAGE_SIZES.has(body.imageSize)) {
                logApiError('/api/images/generate', new Error('Unsupported image size'), {
                    imageSize: body.imageSize,
                    model,
                });
                sendJson(res, 400, { error: `Unsupported image size: ${body.imageSize}` });
                return;
            }

            const capabilityError = validateCapabilityRequest(model, body);
            if (capabilityError) {
                logApiError('/api/images/generate', new Error('Unsupported capability request'), {
                    model,
                    capabilityError,
                    body,
                });
                sendJson(res, 400, { error: capabilityError });
                return;
            }

            if (body.executionMode === 'queued-batch-job') {
                sendJson(res, 400, {
                    error: 'Queued batch jobs must use /api/batches/create instead of the interactive generate route.',
                });
                return;
            }

            const { objectImageInputs, characterImageInputs } = normalizeReferenceImages(body);
            const totalReferenceImages = objectImageInputs.length + characterImageInputs.length;
            if (model === 'gemini-2.5-flash-image' && totalReferenceImages > 3) {
                logApiError('/api/images/generate', new Error('Too many reference images for gemini-2.5-flash-image'), {
                    totalReferenceImages,
                });
                sendJson(res, 400, {
                    error: 'gemini-2.5-flash-image works best with up to 3 input images according to current docs.',
                });
                return;
            }

            const parts = buildGenerateParts(body, resolvedDir);
            const {
                requestConfig,
                resolvedResponseModalities,
                groundingMode,
                effectiveThinkingLevel,
                shouldIncludeThoughts,
            } = buildImageRequestConfig(model, body);
            const structuredOutputMode = normalizeStructuredOutputMode(body.structuredOutputMode);

            const conversationHistory = buildConversationHistory(body.conversationContext, resolvedDir);
            const useOfficialConversation =
                body.executionMode === 'chat-continuation' && Boolean(body.conversationContext);
            const response = useOfficialConversation
                ? await ai.chats
                      .create({
                          model,
                          config: requestConfig,
                          history: conversationHistory,
                      })
                      .sendMessage({
                          message: parts,
                      })
                : await ai.models.generateContent({
                      model,
                      contents: { parts },
                      config: requestConfig,
                  });

            const blockReason = response.promptFeedback?.blockReason as string | undefined;
            if (blockReason && blockReason !== 'BLOCK_REASON_UNSPECIFIED' && blockReason !== 'NONE') {
                logApiError('/api/images/generate', new Error('Prompt rejected by policy'), { blockReason, model });
                sendJson(res, 400, { error: `Prompt rejected by policy: ${blockReason}. Please modify your prompt.` });
                return;
            }

            const extracted = extractGeneratedContent(response);
            if (extracted.imageUrl) {
                const structuredData = parseStructuredOutputText(structuredOutputMode, extracted.text);
                const groundingDetails = extractGroundingDetails(response);
                const payload: GeneratedResponsePayload = {
                    imageUrl: extracted.imageUrl,
                    text: extracted.text,
                    thoughts: extracted.thoughts,
                    structuredData,
                    metadata: {
                        model,
                        outputFormat: body.outputFormat || 'images-only',
                        structuredOutputMode,
                        temperature: typeof body.temperature === 'number' ? body.temperature : 1,
                        thinkingLevel: effectiveThinkingLevel,
                        includeThoughts: shouldIncludeThoughts,
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
                        structuredOutputMode,
                        responseModalitiesActual: resolvedResponseModalities.join('+'),
                        thinkingLevelRequested: effectiveThinkingLevel,
                        includeThoughtsRequested: shouldIncludeThoughts,
                        imageSizeRequested: body.imageSize || null,
                        actualImageWidth: extracted.imageDimensions?.width,
                        actualImageHeight: extracted.imageDimensions?.height,
                        actualImageMimeType: extracted.imageMimeType,
                        actualImageDimensions: extracted.imageDimensions
                            ? `${extracted.imageDimensions.width}x${extracted.imageDimensions.height}`
                            : undefined,
                        groundingMode,
                        groundingMetadataReturned: Boolean(response.candidates?.[0]?.groundingMetadata),
                        textReturned: Boolean(extracted.text),
                        structuredOutputRequested: structuredOutputMode !== 'off',
                        structuredOutputReturned: Boolean(structuredData),
                        thoughtsReturned: Boolean(extracted.thoughts),
                        thoughtSignatureReturned: extracted.thoughtSignaturePresent,
                        thoughtSignature: extracted.thoughtSignature,
                        sourcesReturned: groundingDetails.sources.length,
                        webQueriesReturned: groundingDetails.webQueries.length,
                        imageQueriesReturned: groundingDetails.imageQueries.length,
                        groundingSupportsReturned: groundingDetails.supports.length,
                        officialConversationUsed: useOfficialConversation,
                    },
                    conversation: {
                        used: useOfficialConversation,
                        conversationId: body.conversationContext?.conversationId,
                        branchOriginId: body.conversationContext?.branchOriginId,
                        activeSourceHistoryId: body.conversationContext?.activeSourceHistoryId,
                        priorTurnCount: body.conversationContext?.priorTurns.length || 0,
                        historyLength: conversationHistory.length + (useOfficialConversation ? 2 : 0),
                    },
                };
                sendJson(res, 200, payload);
                return;
            }

            if (extracted.finishReason === 'SAFETY') {
                const blockedCategories = (extracted.safetyRatings ?? [])
                    .filter(
                        (rating: any) =>
                            rating.probability === 'HIGH' || rating.probability === 'MEDIUM' || rating.blocked,
                    )
                    .map((rating: any) =>
                        String(rating.category ?? 'UNKNOWN')
                            .replace('HARM_CATEGORY_', '')
                            .replace(/_/g, ' ')
                            .toLowerCase(),
                    );
                const reason = blockedCategories.length > 0 ? blockedCategories.join(', ') : 'Unknown Safety Filter';
                const specificKeywords = await identifyBlockKeywords(ai, String(body.prompt || ''), reason);
                logApiError('/api/images/generate', new Error('Output blocked by safety filter'), { reason, model });
                sendJson(res, 400, { error: `Blocked by filter: ${reason} ${specificKeywords}`.trim() });
                return;
            }

            logApiError('/api/images/generate', new Error('Model returned no image data'), {
                model,
                finishReason: extracted.finishReason || 'UNKNOWN',
            });
            sendJson(res, 502, { error: 'Model returned no image data.' });
        } catch (error: any) {
            sendClassifiedApiError(res, '/api/images/generate', error, 'Image generation failed', {
                defaultStatus: 502,
            });
        }
    });
}
