import {
    AspectRatio,
    ExecutionMode,
    ImageModel,
    ImageSidecarMetadata,
    ImageSidecarMetadataState,
    ImageSize,
    ImageStyle,
    OutputFormat,
    StructuredOutputMode,
    ThinkingLevel,
} from '../types';
import { deriveGroundingMode } from './groundingMode';
import { normalizeImageStyle } from './styleRegistry';

export const IMAGE_SIDECAR_METADATA_STATE_KEY = '__nanoBananaSidecarState';

export type ImageSidecarMetadataStateRecord = Record<string, unknown> & {
    [IMAGE_SIDECAR_METADATA_STATE_KEY]: ImageSidecarMetadataState;
};

type BuildImageSidecarMetadataArgs = {
    prompt: string;
    model: ImageModel;
    style: ImageStyle;
    aspectRatio: AspectRatio;
    requestedImageSize: ImageSize;
    outputFormat: OutputFormat;
    structuredOutputMode: StructuredOutputMode;
    temperature: number;
    thinkingLevel: ThinkingLevel;
    includeThoughts: boolean;
    googleSearch: boolean;
    imageSearch: boolean;
    generationMode: string;
    executionMode: ExecutionMode;
    batchSize?: number;
    batchJobName?: string;
    batchResultIndex?: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

export const buildImageSidecarMetadata = ({
    prompt,
    model,
    style,
    aspectRatio,
    requestedImageSize,
    outputFormat,
    structuredOutputMode,
    temperature,
    thinkingLevel,
    includeThoughts,
    googleSearch,
    imageSearch,
    generationMode,
    executionMode,
    batchSize,
    batchJobName,
    batchResultIndex,
}: BuildImageSidecarMetadataArgs): ImageSidecarMetadata => ({
    prompt,
    model,
    style: normalizeImageStyle(style),
    aspectRatio,
    requestedImageSize,
    size: requestedImageSize,
    outputFormat,
    structuredOutputMode,
    temperature,
    thinkingLevel,
    includeThoughts,
    googleSearch,
    imageSearch,
    groundingMode: deriveGroundingMode(googleSearch, imageSearch),
    generationMode,
    mode: generationMode,
    executionMode,
    ...(typeof batchSize === 'number' ? { batchSize } : {}),
    ...(typeof batchResultIndex === 'number' ? { batchResultIndex } : {}),
    ...(typeof batchJobName === 'string' && batchJobName.trim() ? { batchJobName } : {}),
});

export const createImageSidecarMetadataState = (state: ImageSidecarMetadataState): ImageSidecarMetadataStateRecord => ({
    [IMAGE_SIDECAR_METADATA_STATE_KEY]: state,
});

export const getImageSidecarMetadataState = (
    metadata: Record<string, unknown> | null | undefined,
): ImageSidecarMetadataState | null => {
    if (!metadata) {
        return null;
    }

    const state = metadata[IMAGE_SIDECAR_METADATA_STATE_KEY];
    return state === 'loading' || state === 'missing' ? state : null;
};

export const isImageSidecarMetadataStateRecord = (
    metadata: Record<string, unknown> | null | undefined,
): metadata is ImageSidecarMetadataStateRecord => getImageSidecarMetadataState(metadata) !== null;

export const normalizeImageSidecarMetadata = (value: unknown): ImageSidecarMetadata | null => {
    if (!isRecord(value)) {
        return null;
    }

    if (isImageSidecarMetadataStateRecord(value)) {
        return null;
    }

    return {
        ...(value as ImageSidecarMetadata),
        style: normalizeImageStyle(value.style),
    } as ImageSidecarMetadata;
};

export const isPersistedImageSidecarMetadata = (
    metadata: Record<string, unknown> | null | undefined,
): metadata is ImageSidecarMetadata => {
    const normalizedMetadata = normalizeImageSidecarMetadata(metadata);
    return Boolean(
        normalizedMetadata &&
        (typeof normalizedMetadata.filename === 'string' || typeof normalizedMetadata.timestamp === 'string'),
    );
};
