import fs from 'fs';
import path from 'path';
import type { StructuredOutputMode } from '../../types';
import { appendStructuredOutputInstruction, normalizeStructuredOutputMode } from '../../utils/structuredOutputs';

const LOAD_IMAGE_ENDPOINT = '/api/load-image';
const RAW_BASE64_PATTERN = /^[A-Za-z0-9+/=]+$/u;

export type ResolvedInlineImage = {
    data: string;
    mimeType: string;
};

type ReferenceImage = {
    mimeType?: string | null;
    dataUrl?: string | null;
    savedFilename?: string | null;
};

type GenerateImageBodyLike = {
    prompt?: string;
    editingInput?: string;
    objectImageInputs?: string[];
    characterImageInputs?: string[];
    structuredOutputMode?: StructuredOutputMode;
};

export function inferMimeTypeFromReference(reference?: ReferenceImage | null): string {
    if (reference?.mimeType) {
        return reference.mimeType;
    }

    const dataUrlMatch = reference?.dataUrl?.match(/^data:([^;]+);base64,/i);
    if (dataUrlMatch?.[1]) {
        return dataUrlMatch[1];
    }

    if (/\.jpe?g$/i.test(reference?.savedFilename || '')) {
        return 'image/jpeg';
    }
    if (/\.webp$/i.test(reference?.savedFilename || '')) {
        return 'image/webp';
    }

    return 'image/png';
}

export function readInlineImageFromReference(
    reference: ReferenceImage | null | undefined,
    resolvedDir: string,
): ResolvedInlineImage | null {
    if (!reference) {
        return null;
    }

    if (reference.dataUrl) {
        const match = reference.dataUrl.match(/^data:([^;]+);base64,(.+)$/i);
        if (match?.[2]) {
            return {
                mimeType: match[1] || inferMimeTypeFromReference(reference),
                data: match[2],
            };
        }
    }

    if (!reference.savedFilename) {
        return null;
    }

    const safeFilename = path.basename(reference.savedFilename);
    const filePath = path.join(resolvedDir, safeFilename);
    if (!filePath.startsWith(resolvedDir) || !fs.existsSync(filePath)) {
        return null;
    }

    return {
        mimeType: inferMimeTypeFromReference(reference),
        data: fs.readFileSync(filePath).toString('base64'),
    };
}

function extractSavedFilenameFromLoadImageUrl(value: string): string | null {
    try {
        const parsed = new URL(value, 'http://localhost');
        if (parsed.pathname !== LOAD_IMAGE_ENDPOINT) {
            return null;
        }

        const filename = parsed.searchParams.get('filename');
        return filename ? path.basename(filename) : null;
    } catch {
        return null;
    }
}

export function resolveInlineImageInput(image: string, resolvedDir: string): ResolvedInlineImage {
    const trimmedImage = image.trim();
    const dataUrlMatch = trimmedImage.match(/^data:([^;]+);base64,(.+)$/i);

    if (dataUrlMatch?.[2]) {
        return {
            mimeType: dataUrlMatch[1] || 'image/png',
            data: dataUrlMatch[2],
        };
    }

    const savedFilename = extractSavedFilenameFromLoadImageUrl(trimmedImage);
    if (savedFilename) {
        const resolvedImage = readInlineImageFromReference({ savedFilename }, resolvedDir);
        if (!resolvedImage) {
            throw new Error(`Referenced image file could not be loaded: ${savedFilename}`);
        }

        return resolvedImage;
    }

    if (RAW_BASE64_PATTERN.test(trimmedImage)) {
        return {
            mimeType: 'image/png',
            data: trimmedImage,
        };
    }

    throw new Error('Unsupported image input format. Expected a data URL, raw base64, or /api/load-image?filename=...');
}

export function pushImagesToParts(
    parts: Array<{ text?: string; inlineData?: { data: string; mimeType: string } }>,
    images: string[] | undefined,
    prefix: string,
    resolvedDir: string,
): void {
    if (!images?.length) {
        return;
    }

    for (let index = 0; index < images.length; index += 1) {
        const image = images[index];
        if (!image) {
            continue;
        }

        parts.push({ text: `[${prefix}_${index + 1}]` });
        parts.push({ inlineData: resolveInlineImageInput(image, resolvedDir) });
    }
}

export function normalizeReferenceImages(body: GenerateImageBodyLike): {
    objectImageInputs: string[];
    characterImageInputs: string[];
} {
    return {
        objectImageInputs: Array.isArray(body.objectImageInputs) ? body.objectImageInputs : [],
        characterImageInputs: Array.isArray(body.characterImageInputs) ? body.characterImageInputs : [],
    };
}

export function buildGenerateParts(
    body: GenerateImageBodyLike,
    resolvedDir: string,
): Array<{ text?: string; inlineData?: { data: string; mimeType: string } }> {
    const { objectImageInputs, characterImageInputs } = normalizeReferenceImages(body);
    const parts: Array<{ text?: string; inlineData?: { data: string; mimeType: string } }> = [];

    pushImagesToParts(parts, body.editingInput ? [body.editingInput] : [], 'Edit', resolvedDir);
    pushImagesToParts(parts, objectImageInputs, 'Obj', resolvedDir);
    pushImagesToParts(parts, characterImageInputs, 'Char', resolvedDir);
    parts.push({
        text: appendStructuredOutputInstruction(
            String(body.prompt || 'A creative image.'),
            normalizeStructuredOutputMode(body.structuredOutputMode),
        ),
    });

    return parts;
}
