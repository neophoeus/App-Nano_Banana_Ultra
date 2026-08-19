import type { ResultPart } from '../types';

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
};

type ExtractedImageResultPart = {
    sequence: number;
    kind: 'thought-image' | 'output-image';
    imageUrl: string;
    mimeType: string;
    candidateIndex: number;
    partIndex: number;
};

type ExtractedResponsePart = ExtractedTextResultPart | ExtractedImageResultPart;

export type ExtractedGeneratedContent = {
    imageUrl?: string;
    text?: string;
    thoughts?: string;
    resultParts?: ResultPart[];
    imageMimeType?: string;
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

const unwrapGeneratedResponse = (response: any): any => {
    if (response?.response && typeof response.response === 'object') {
        return response.response;
    }

    return response;
};

const resolveGeneratedResponseCandidates = (response: any): any[] => {
    const unwrappedResponse = unwrapGeneratedResponse(response);
    return Array.isArray(unwrappedResponse?.candidates) ? unwrappedResponse.candidates : [];
};

const resolveGeneratedResponsePromptBlockReason = (response: any): string | undefined => {
    const unwrappedResponse = unwrapGeneratedResponse(response);
    const promptFeedback = unwrappedResponse?.promptFeedback ?? unwrappedResponse?.prompt_feedback;
    const blockReason = promptFeedback?.blockReason ?? promptFeedback?.block_reason;

    return typeof blockReason === 'string' && blockReason.length > 0 && blockReason !== 'BLOCK_REASON_UNSPECIFIED'
        ? blockReason
        : undefined;
};

const normalizeGeneratedResponsePart = (part: any): NormalizedGeneratedResponsePart => {
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
};

const normalizeGeneratedResponseCandidate = (candidate: any): NormalizedGeneratedResponseCandidate => {
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
};

const toPublicResultPart = (part: ExtractedResponsePart): ResultPart => {
    if (part.kind === 'thought-text' || part.kind === 'output-text') {
        return {
            sequence: part.sequence,
            kind: part.kind,
            text: part.text,
        };
    }
    if (part.kind === 'thought-image' || part.kind === 'output-image') {
        return {
            sequence: part.sequence,
            kind: part.kind,
            imageUrl: part.imageUrl,
            mimeType: part.mimeType,
        };
    }
    throw new Error(`Unexpected part kind: ${(part as any).kind}`);
};

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

const summarizeExtractedResponseParts = (parts: ExtractedResponsePart[]) => {
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

    const selectedImage = outputImageCandidates.reduce<ExtractedImageResultPart | undefined>((best, candidate) => {
        if (!best) {
            return candidate;
        }

        if (candidate.candidateIndex > best.candidateIndex) {
            return candidate;
        }

        if (candidate.candidateIndex === best.candidateIndex && candidate.partIndex > best.partIndex) {
            return candidate;
        }

        return best;
    }, undefined);

    return {
        imageUrl: selectedImage?.imageUrl,
        text: textParts.length > 0 ? textParts.join('\n\n') : undefined,
        thoughts: thoughtParts.length > 0 ? thoughtParts.join('\n\n') : undefined,
        resultParts: parts.length > 0 ? parts.map((part) => toPublicResultPart(part)) : undefined,
        imageMimeType: selectedImage?.mimeType,
        imagePartCount: imageCandidates.length,
        thoughtImagePartCount: imageCandidates.filter((part) => part.kind === 'thought-image').length,
        outputImagePartCount: outputImageCandidates.length,
    };
};

export function extractGeneratedContent(response: any): ExtractedGeneratedContent {
    const candidates = resolveGeneratedResponseCandidates(response).map((candidate: any) =>
        normalizeGeneratedResponseCandidate(candidate),
    );
    const primaryCandidate = candidates[0];
    const promptBlockReason = resolveGeneratedResponsePromptBlockReason(response);
    const extracted = extractResponsePartsFromCandidates(candidates);
    const summary = summarizeExtractedResponseParts(extracted.extractedParts);
    const extractionIssue =
        candidates.length === 0
            ? 'missing-candidates'
            : extracted.totalPartCount === 0
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
        thoughtSignaturePresent: extracted.thoughtSignaturePresent,
        thoughtSignature: extracted.thoughtSignature,
        promptBlockReason,
        finishReason: primaryCandidate?.finishReason,
        safetyRatings: primaryCandidate?.safetyRatings ?? [],
        candidateCount: candidates.length,
        partCount: extracted.totalPartCount,
        imagePartCount: summary.imagePartCount,
        thoughtImagePartCount: summary.thoughtImagePartCount,
        outputImagePartCount: summary.outputImagePartCount,
        extractionIssue,
    };
}
