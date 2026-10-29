import type { ConversationRequestContext } from '../../types';
import { type ResolvedInlineImage, readInlineImageFromReference } from './imageReferences';
import { isSameInlineImage, resolveRoleMediaResolution } from './mediaResolution';

const THOUGHT_SIGNATURE_VALIDATOR_BYPASS = 'skip_thought_signature_validator';

export interface BuildConversationHistoryOptions {
    model?: string | null;
}

export interface BuiltConversationHistoryResult {
    history: Array<{ role: 'user' | 'model'; parts: Array<Record<string, unknown>> }>;
    lastModelOutputImage: ResolvedInlineImage | null;
    deduplicatedSourceImageCount: number;
    omittedThoughtTextTurnCount: number;
}

export function buildConversationHistoryWithMetadata(
    conversationContext: ConversationRequestContext | null | undefined,
    resolvedDir: string,
    options?: BuildConversationHistoryOptions,
): BuiltConversationHistoryResult {
    if (!conversationContext?.priorTurns?.length) {
        return {
            history: [],
            lastModelOutputImage: null,
            deduplicatedSourceImageCount: 0,
            omittedThoughtTextTurnCount: 0,
        };
    }

    type ValidTurn = {
        turn: NonNullable<ConversationRequestContext['priorTurns']>[number];
        sourceImage: ResolvedInlineImage;
        outputImage: ResolvedInlineImage;
        hasPrecedingGap: boolean;
    };

    const validTurns: ValidTurn[] = [];
    let hasGap = false;

    for (const turn of conversationContext.priorTurns) {
        const sourceImage = readInlineImageFromReference(turn.sourceImage, resolvedDir);
        const outputImage = readInlineImageFromReference(turn.outputImage, resolvedDir);
        if (sourceImage && outputImage) {
            validTurns.push({ turn, sourceImage, outputImage, hasPrecedingGap: hasGap });
            hasGap = false;
        } else {
            hasGap = true;
        }
    }

    if (validTurns.length === 0) {
        return {
            history: [],
            lastModelOutputImage: null,
            deduplicatedSourceImageCount: 0,
            omittedThoughtTextTurnCount: 0,
        };
    }

    let deduplicatedSourceImageCount = 0;
    let omittedThoughtTextTurnCount = 0;
    const history: Array<{ role: 'user' | 'model'; parts: Array<Record<string, unknown>> }> = [];
    const totalValid = validTurns.length;
    const lastModelOutputImage = hasGap ? null : validTurns[totalValid - 1].outputImage;

    for (let index = 0; index < totalValid; index += 1) {
        const { turn, sourceImage, outputImage, hasPrecedingGap } = validTurns[index];
        const isLatestAnchorTurn = index === totalValid - 1;
        const resolutionRole = isLatestAnchorTurn ? 'history-anchor' : 'history-decay';
        const mediaResolution = resolveRoleMediaResolution({
            model: options?.model,
            role: resolutionRole,
        });

        const replayThoughtSignature = turn.thoughtSignature || THOUGHT_SIGNATURE_VALIDATOR_BYPASS;
        const userParts: Array<Record<string, unknown>> = [];

        // Check if the current turn's sourceImage is identical to the adjacent previous turn's outputImage
        const isDuplicateOfPreviousModelOutput =
            index > 0 && !hasPrecedingGap && isSameInlineImage(sourceImage, validTurns[index - 1].outputImage);

        if (isDuplicateOfPreviousModelOutput) {
            deduplicatedSourceImageCount += 1;
            // Omit the redundant duplicate image, ensuring non-empty text part for Gemini API validity
            userParts.push({ text: turn.prompt?.trim() ? turn.prompt : 'Continue editing.' });
        } else {
            userParts.push({
                inlineData: sourceImage,
                ...(mediaResolution ? { mediaResolution } : {}),
            });
            userParts.push({ text: turn.prompt });
        }

        const modelParts: Array<Record<string, unknown>> = [
            {
                inlineData: outputImage,
                thoughtSignature: replayThoughtSignature,
            },
        ];

        // thoughtSignature is the official cryptographic state carrier; omit verbose thought: true text summaries
        if (turn.thoughts) {
            omittedThoughtTextTurnCount += 1;
        }

        if (turn.text) {
            modelParts.push({ text: turn.text });
        }

        history.push({ role: 'user', parts: userParts });
        history.push({ role: 'model', parts: modelParts });
    }

    return {
        history,
        lastModelOutputImage,
        deduplicatedSourceImageCount,
        omittedThoughtTextTurnCount,
    };
}

export function buildConversationHistory(
    conversationContext: ConversationRequestContext | null | undefined,
    resolvedDir: string,
    options?: BuildConversationHistoryOptions,
): Array<{ role: 'user' | 'model'; parts: Array<Record<string, unknown>> }> {
    return buildConversationHistoryWithMetadata(conversationContext, resolvedDir, options).history;
}
