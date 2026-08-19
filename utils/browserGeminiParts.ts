import type { ConversationImageAssetReference, ConversationRequestContext } from '../types';
import { buildSavedImageLoadUrl } from './imageSaveUtils';
import { loadBrowserSavedImageDataUrl, BROWSER_SAVED_IMAGE_PATH_PREFIX } from './browserImageStore';

const DATA_URL_PATTERN = /^data:([^;]+);base64,(.+)$/i;
const RAW_BASE64_PATTERN = /^[A-Za-z0-9+/=]+$/u;
const THOUGHT_SIGNATURE_VALIDATOR_BYPASS = 'skip_thought_signature_validator';

export type BrowserInlineImage = {
    data: string;
    mimeType: string;
};

export type BrowserGeneratePart = {
    text?: string;
    inlineData?: BrowserInlineImage;
};

type BrowserGenerateBodyLike = {
    prompt?: string;
    editingInput?: string;
    objectImageInputs?: string[];
    characterImageInputs?: string[];
};

export type BrowserConversationHistoryResult = {
    history: Array<{ role: 'user' | 'model'; parts: Array<Record<string, unknown>> }>;
    usable: boolean;
};

const parseInlineImageDataUrl = (imageSource: string): BrowserInlineImage | null => {
    const match = imageSource.match(DATA_URL_PATTERN);
    if (!match?.[2]) {
        return null;
    }

    return {
        mimeType: match[1] || 'image/png',
        data: match[2],
    };
};

const blobToDataUrl = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read the fetched image input.'));
        reader.readAsDataURL(blob);
    });

const fetchImageAsInlineData = async (imageSource: string): Promise<BrowserInlineImage> => {
    const response = await fetch(imageSource);
    if (!response.ok) {
        throw new Error(`Failed to load image input (${response.status}).`);
    }

    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) {
        throw new Error('Referenced input did not resolve to an image.');
    }

    const dataUrl = await blobToDataUrl(blob);
    const inlineImage = parseInlineImageDataUrl(dataUrl);
    if (!inlineImage) {
        throw new Error('Failed to convert the fetched image input into inline data.');
    }

    return inlineImage;
};

export const resolveBrowserInlineImage = async (imageSource: string): Promise<BrowserInlineImage> => {
    const trimmedSource = imageSource.trim();
    if (!trimmedSource) {
        throw new Error('Image input was empty.');
    }

    if (trimmedSource.startsWith(BROWSER_SAVED_IMAGE_PATH_PREFIX)) {
        const filename = trimmedSource.split(/[\\/]/).pop();
        if (filename) {
            const dataUrl = await loadBrowserSavedImageDataUrl(filename);
            if (dataUrl) {
                const inlineImage = parseInlineImageDataUrl(dataUrl);
                if (inlineImage) {
                    return inlineImage;
                }
            }
        }
    }

    const inlineImage = parseInlineImageDataUrl(trimmedSource);
    if (inlineImage) {
        return inlineImage;
    }

    if (RAW_BASE64_PATTERN.test(trimmedSource)) {
        return {
            mimeType: 'image/png',
            data: trimmedSource,
        };
    }

    return fetchImageAsInlineData(trimmedSource);
};

const pushImagesToParts = async (
    parts: BrowserGeneratePart[],
    images: string[] | undefined,
    prefix: string,
): Promise<void> => {
    if (!images?.length) {
        return;
    }

    for (let index = 0; index < images.length; index += 1) {
        const image = images[index];
        if (!image) {
            continue;
        }

        parts.push({ text: `[${prefix}_${index + 1}]` });
        parts.push({ inlineData: await resolveBrowserInlineImage(image) });
    }
};

export const buildBrowserGenerateParts = async (body: BrowserGenerateBodyLike): Promise<BrowserGeneratePart[]> => {
    const parts: BrowserGeneratePart[] = [];
    const prompt = String(body.prompt || 'A creative image.');

    await pushImagesToParts(parts, body.editingInput ? [body.editingInput] : [], 'Edit');
    await pushImagesToParts(parts, Array.isArray(body.objectImageInputs) ? body.objectImageInputs : [], 'Obj');
    await pushImagesToParts(parts, Array.isArray(body.characterImageInputs) ? body.characterImageInputs : [], 'Char');
    parts.push({ text: prompt });

    return parts;
};

const resolveConversationReference = async (
    reference: ConversationImageAssetReference | null | undefined,
): Promise<BrowserInlineImage | null> => {
    if (!reference) {
        return null;
    }

    if (reference.dataUrl) {
        return parseInlineImageDataUrl(reference.dataUrl);
    }

    if (reference.savedFilename) {
        return resolveBrowserInlineImage(buildSavedImageLoadUrl(reference.savedFilename));
    }

    return null;
};

export const buildBrowserConversationHistory = async (
    conversationContext: ConversationRequestContext | null | undefined,
): Promise<BrowserConversationHistoryResult> => {
    if (!conversationContext?.priorTurns?.length) {
        return { history: [], usable: true };
    }

    const history: BrowserConversationHistoryResult['history'] = [];

    for (const turn of conversationContext.priorTurns) {
        let sourceImage: BrowserInlineImage | null;
        let outputImage: BrowserInlineImage | null;

        try {
            sourceImage = await resolveConversationReference(turn.sourceImage);
            outputImage = await resolveConversationReference(turn.outputImage);
        } catch {
            return { history: [], usable: false };
        }

        if (!sourceImage || !outputImage) {
            return { history: [], usable: false };
        }

        const replayThoughtSignature = turn.thoughtSignature || THOUGHT_SIGNATURE_VALIDATOR_BYPASS;
        const userParts: Array<Record<string, unknown>> = [{ inlineData: sourceImage }, { text: turn.prompt }];
        const modelParts: Array<Record<string, unknown>> = [
            {
                inlineData: outputImage,
                thoughtSignature: replayThoughtSignature,
            },
        ];

        if (turn.thoughts) {
            modelParts.push({
                text: turn.thoughts,
                thought: true,
            });
        }

        if (turn.text) {
            modelParts.push({ text: turn.text });
        }

        history.push({ role: 'user', parts: userParts });
        history.push({ role: 'model', parts: modelParts });
    }

    return { history, usable: true };
};
