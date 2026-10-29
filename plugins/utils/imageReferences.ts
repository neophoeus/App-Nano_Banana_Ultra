import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { OptimizationMode } from '../../types';
import { normalizeVideoMimeType } from '../../utils/videoReferenceUtils';
import { type PartMediaResolutionPayload, resolveRoleMediaResolution } from './mediaResolution';

const LOAD_IMAGE_ENDPOINT = '/api/load-image';
const RAW_BASE64_PATTERN = /^[A-Za-z0-9+/=]+$/u;

export type ResolvedInlineImage = {
    data: string;
    mimeType: string;
};

export type ResolvedLocalImageFile = {
    filePath: string;
    mimeType: string;
    cleanup: () => void;
};

export type ResolvedFileImage = {
    fileUri: string;
    mimeType: string;
};

export type InlineGeneratePart = {
    text?: string;
    inlineData?: { data: string; mimeType: string };
    fileData?: ResolvedFileImage | { fileUri: string; mimeType: string };
    mediaResolution?: PartMediaResolutionPayload;
};

export type FileGeneratePart = {
    text?: string;
    fileData?: ResolvedFileImage;
};

type ReferenceImage = {
    mimeType?: string | null;
    dataUrl?: string | null;
    savedFilename?: string | null;
};

export type GenerateImageBodyLike = {
    model?: string;
    imageSize?: string;
    prompt?: string;
    editingInput?: string;
    sourceImageInput?: string;
    objectImageInputs?: string[];
    characterImageInputs?: string[];
    styleImageInputs?: string[];
    videoInput?: string;
    videoMimeType?: string;
    optimizationMode?: OptimizationMode | string | null;
};

const inferExtensionFromMimeType = (mimeType: string): string => {
    if (mimeType === 'image/jpeg') {
        return 'jpg';
    }
    if (mimeType === 'image/webp') {
        return 'webp';
    }
    if (mimeType === 'image/gif') {
        return 'gif';
    }
    if (mimeType === 'video/mp4') {
        return 'mp4';
    }
    if (mimeType === 'video/webm') {
        return 'webm';
    }
    if (mimeType === 'video/mov' || mimeType === 'video/quicktime') {
        return 'mov';
    }
    if (mimeType === 'video/mpeg') {
        return 'mpeg';
    }
    if (mimeType === 'video/mpg') {
        return 'mpg';
    }
    if (mimeType === 'video/avi') {
        return 'avi';
    }
    if (mimeType === 'video/wmv') {
        return 'wmv';
    }
    if (mimeType === 'video/3gpp') {
        return '3gp';
    }
    if (mimeType === 'video/x-flv') {
        return 'flv';
    }

    return 'png';
};

const resolveSafeSavedImagePath = (savedFilename: string, resolvedDir: string): string => {
    const safeFilename = path.basename(savedFilename);
    const filePath = path.join(resolvedDir, safeFilename);
    if (!filePath.startsWith(resolvedDir) || !fs.existsSync(filePath)) {
        throw new Error(`Referenced image file could not be loaded: ${safeFilename}`);
    }

    return filePath;
};

const writeTempImageFile = (buffer: Buffer, mimeType: string, tempDir: string): ResolvedLocalImageFile => {
    fs.mkdirSync(tempDir, { recursive: true });
    const extension = inferExtensionFromMimeType(mimeType);
    const filePath = path.join(tempDir, `${crypto.randomUUID()}.${extension}`);
    fs.writeFileSync(filePath, buffer);

    return {
        filePath,
        mimeType,
        cleanup: () => {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        },
    };
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

export function resolveLocalImageInputFile(
    image: string,
    resolvedDir: string,
    tempDir: string,
): ResolvedLocalImageFile {
    const trimmedImage = image.trim();
    const dataUrlMatch = trimmedImage.match(/^data:([^;]+);base64,(.+)$/i);

    if (dataUrlMatch?.[2]) {
        return writeTempImageFile(Buffer.from(dataUrlMatch[2], 'base64'), dataUrlMatch[1] || 'image/png', tempDir);
    }

    const savedFilename = extractSavedFilenameFromLoadImageUrl(trimmedImage);
    if (savedFilename) {
        const filePath = resolveSafeSavedImagePath(savedFilename, resolvedDir);
        return {
            filePath,
            mimeType: inferMimeTypeFromReference({ savedFilename }),
            cleanup: () => {},
        };
    }

    if (RAW_BASE64_PATTERN.test(trimmedImage)) {
        return writeTempImageFile(Buffer.from(trimmedImage, 'base64'), 'image/png', tempDir);
    }

    throw new Error('Unsupported image input format. Expected a data URL, raw base64, or /api/load-image?filename=...');
}

export function pushImagesToParts(
    parts: InlineGeneratePart[],
    images: string[] | undefined,
    prefix: string,
    resolvedDir: string,
    mediaResolution?: PartMediaResolutionPayload,
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
        const part: InlineGeneratePart = {
            inlineData: resolveInlineImageInput(image, resolvedDir),
            ...(mediaResolution ? { mediaResolution } : {}),
        };
        parts.push(part);
    }
}

async function pushFileImagesToParts(
    parts: FileGeneratePart[],
    images: string[] | undefined,
    prefix: string,
    resolveFileImage: (image: string) => Promise<ResolvedFileImage>,
): Promise<void> {
    if (!images?.length) {
        return;
    }

    for (let index = 0; index < images.length; index += 1) {
        const image = images[index];
        if (!image) {
            continue;
        }

        parts.push({ text: `[${prefix}_${index + 1}]` });
        parts.push({ fileData: await resolveFileImage(image) });
    }
}

export function normalizeReferenceImages(body: GenerateImageBodyLike): {
    objectImageInputs: string[];
    characterImageInputs: string[];
    styleImageInputs: string[];
    videoInput?: string;
    videoMimeType?: string;
} {
    return {
        objectImageInputs: Array.isArray(body.objectImageInputs) ? body.objectImageInputs : [],
        characterImageInputs: Array.isArray(body.characterImageInputs) ? body.characterImageInputs : [],
        styleImageInputs: Array.isArray(body.styleImageInputs) ? body.styleImageInputs : [],
        videoInput:
            typeof body.videoInput === 'string' && body.videoInput.trim().length > 0
                ? body.videoInput.trim()
                : undefined,
        videoMimeType:
            typeof body.videoMimeType === 'string' && body.videoMimeType.trim().length > 0
                ? body.videoMimeType.trim()
                : undefined,
    };
}

export function buildGenerateParts(body: GenerateImageBodyLike, resolvedDir: string): InlineGeneratePart[] {
    const { objectImageInputs, characterImageInputs, styleImageInputs, videoInput } = normalizeReferenceImages(body);
    const parts: InlineGeneratePart[] = [];
    const prompt = String(body.prompt || 'A creative image.');

    const editResolution = resolveRoleMediaResolution({
        model: body.model,
        role: 'edit',
        imageSize: body.imageSize,
        optimizationMode: body.optimizationMode,
    });
    const srcResolution = resolveRoleMediaResolution({
        model: body.model,
        role: 'source',
        imageSize: body.imageSize,
        optimizationMode: body.optimizationMode,
    });
    const charResolution = resolveRoleMediaResolution({
        model: body.model,
        role: 'character',
        imageSize: body.imageSize,
        optimizationMode: body.optimizationMode,
    });
    const objResolution = resolveRoleMediaResolution({
        model: body.model,
        role: 'object',
        imageSize: body.imageSize,
        optimizationMode: body.optimizationMode,
    });
    const styleResolution = resolveRoleMediaResolution({
        model: body.model,
        role: 'style',
        imageSize: body.imageSize,
        optimizationMode: body.optimizationMode,
    });
    const videoResolution = resolveRoleMediaResolution({
        model: body.model,
        role: 'video',
        imageSize: body.imageSize,
        optimizationMode: body.optimizationMode,
    });

    if (videoInput) {
        parts.push({ text: '[Video_1]' });
        const dataMatch = videoInput.match(/^data:([^;]+);base64,(.+)$/i);
        if (dataMatch) {
            parts.push({
                inlineData: {
                    mimeType: normalizeVideoMimeType(dataMatch[1]) || 'video/mp4',
                    data: dataMatch[2],
                },
                ...(videoResolution ? { mediaResolution: videoResolution } : {}),
            });
        } else {
            const resolvedMime = normalizeVideoMimeType(body.videoMimeType) || 'video/mp4';
            parts.push({
                fileData: { fileUri: videoInput, mimeType: resolvedMime },
                ...(videoResolution ? { mediaResolution: videoResolution } : {}),
            });
        }
    }
    pushImagesToParts(parts, body.editingInput ? [body.editingInput] : [], 'Edit', resolvedDir, editResolution);
    pushImagesToParts(parts, body.sourceImageInput ? [body.sourceImageInput] : [], 'Src', resolvedDir, srcResolution);
    pushImagesToParts(parts, objectImageInputs, 'Obj', resolvedDir, objResolution);
    pushImagesToParts(parts, characterImageInputs, 'Char', resolvedDir, charResolution);
    pushImagesToParts(parts, styleImageInputs, 'Style', resolvedDir, styleResolution);
    parts.push({
        text: prompt,
    });

    return parts;
}

export async function buildGenerateFileParts(
    body: GenerateImageBodyLike,
    resolveFileImage: (image: string) => Promise<ResolvedFileImage>,
): Promise<FileGeneratePart[]> {
    const { objectImageInputs, characterImageInputs, styleImageInputs, videoInput } = normalizeReferenceImages(body);
    const parts: FileGeneratePart[] = [];
    const prompt = String(body.prompt || 'A creative image.');

    if (videoInput) {
        parts.push({ text: '[Video_1]' });
        const dataMatch = videoInput.match(/^data:([^;]+);base64,(.+)$/i);
        if (dataMatch) {
            const normalizedMime = normalizeVideoMimeType(dataMatch[1]) || 'video/mp4';
            const normalizedDataUrl = `data:${normalizedMime};base64,${dataMatch[2]}`;
            const resolved = await resolveFileImage(normalizedDataUrl);
            parts.push({ fileData: resolved });
        } else {
            const resolvedMime = normalizeVideoMimeType(body.videoMimeType) || 'video/mp4';
            parts.push({ fileData: { fileUri: videoInput, mimeType: resolvedMime } });
        }
    }
    await pushFileImagesToParts(parts, body.editingInput ? [body.editingInput] : [], 'Edit', resolveFileImage);
    await pushFileImagesToParts(parts, body.sourceImageInput ? [body.sourceImageInput] : [], 'Src', resolveFileImage);
    await pushFileImagesToParts(parts, objectImageInputs, 'Obj', resolveFileImage);
    await pushFileImagesToParts(parts, characterImageInputs, 'Char', resolveFileImage);
    await pushFileImagesToParts(parts, styleImageInputs, 'Style', resolveFileImage);
    parts.push({ text: prompt });

    return parts;
}
