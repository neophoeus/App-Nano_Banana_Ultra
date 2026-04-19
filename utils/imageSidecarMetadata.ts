import {
    AspectRatio,
    ExecutionMode,
    GroundingMode,
    ImageModel,
    ImageSidecarMetadata,
    ImageSidecarMetadataState,
    ImageSize,
    ImageStyle,
    OutputFormat,
    ThinkingLevel,
} from '../types';
import { deriveGroundingMode, getGroundingFlagsFromMode } from './groundingMode';
import { MODEL_CAPABILITIES, VALID_IMAGE_SIZES } from './modelCapabilities';
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

const VALID_OUTPUT_FORMATS = new Set<OutputFormat>(['images-only', 'images-and-text']);
const VALID_THINKING_LEVELS = new Set<ThinkingLevel>(['disabled', 'minimal', 'high']);
const OUTPUT_DIMENSION_SIZE_LABELS: Record<string, ImageSize> = {
    '512x512': '512',
    '1024x1024': '1K',
    '2048x2048': '2K',
    '4096x4096': '4K',
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const isImageModelValue = (value: unknown): value is ImageModel =>
    typeof value === 'string' && Object.prototype.hasOwnProperty.call(MODEL_CAPABILITIES, value);

const isImageSizeValue = (value: unknown): value is ImageSize =>
    typeof value === 'string' && VALID_IMAGE_SIZES.has(value as ImageSize);

const isOutputFormatValue = (value: unknown): value is OutputFormat =>
    typeof value === 'string' && VALID_OUTPUT_FORMATS.has(value as OutputFormat);

const isThinkingLevelValue = (value: unknown): value is ThinkingLevel =>
    typeof value === 'string' && VALID_THINKING_LEVELS.has(value as ThinkingLevel);

const isGroundingModeValue = (value: unknown): value is GroundingMode =>
    value === 'off' ||
    value === 'google-search' ||
    value === 'image-search' ||
    value === 'google-search-plus-image-search';

const resolveFallbackThinkingLevel = (model: ImageModel): ThinkingLevel => {
    const capability = MODEL_CAPABILITIES[model];

    if (capability.thinkingLevels.includes('minimal')) {
        return 'minimal';
    }

    return capability.thinkingLevels[0] || 'disabled';
};

const resolveFallbackOutputFormat = (model: ImageModel): OutputFormat => {
    const capability = MODEL_CAPABILITIES[model];

    if (capability.outputFormats.includes('images-only')) {
        return 'images-only';
    }

    return capability.outputFormats[0] || 'images-only';
};

const deriveActualOutputImageSize = (actualOutput: unknown): ImageSize | undefined => {
    if (!isRecord(actualOutput)) {
        return undefined;
    }

    const width = actualOutput.width;
    const height = actualOutput.height;
    if (typeof width !== 'number' || typeof height !== 'number') {
        return undefined;
    }

    return OUTPUT_DIMENSION_SIZE_LABELS[`${width}x${height}`];
};

const resolveGroundingFlags = (value: Record<string, unknown>) => {
    let googleSearch = typeof value.googleSearch === 'boolean' ? value.googleSearch : undefined;
    let imageSearch = typeof value.imageSearch === 'boolean' ? value.imageSearch : undefined;

    if ((googleSearch === undefined || imageSearch === undefined) && isGroundingModeValue(value.groundingMode)) {
        const groundingFlags = getGroundingFlagsFromMode(value.groundingMode);

        if (googleSearch === undefined) {
            googleSearch = groundingFlags.googleSearch;
        }
        if (imageSearch === undefined) {
            imageSearch = groundingFlags.imageSearch;
        }
    }

    return { googleSearch, imageSearch };
};

export const buildImageSidecarMetadata = ({
    prompt,
    model,
    style,
    aspectRatio,
    requestedImageSize,
    outputFormat,
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
}: BuildImageSidecarMetadataArgs): ImageSidecarMetadata =>
    normalizeImageSidecarMetadata({
        prompt,
        model,
        style: normalizeImageStyle(style),
        aspectRatio,
        requestedImageSize,
        size: requestedImageSize,
        outputFormat,
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
    }) as ImageSidecarMetadata;

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

    const {
        requestedImageSize: _requestedImageSize,
        size: _size,
        outputFormat: _outputFormat,
        thinkingLevel: _thinkingLevel,
        includeThoughts: _includeThoughts,
        googleSearch: _googleSearch,
        imageSearch: _imageSearch,
        groundingMode: _groundingMode,
        style: _style,
        ...rest
    } = value;

    const model = isImageModelValue(value.model) ? value.model : null;
    const capability = model ? MODEL_CAPABILITIES[model] : null;
    const actualOutputImageSize = deriveActualOutputImageSize(value.actualOutput);
    const rawRequestedImageSize = isImageSizeValue(value.requestedImageSize) ? value.requestedImageSize : undefined;
    const rawLegacySize = isImageSizeValue(value.size) ? value.size : undefined;

    let requestedImageSize = rawRequestedImageSize;
    let size = rawLegacySize;
    let outputFormat = isOutputFormatValue(value.outputFormat) ? value.outputFormat : undefined;
    let thinkingLevel = isThinkingLevelValue(value.thinkingLevel) ? value.thinkingLevel : undefined;
    let includeThoughts = typeof value.includeThoughts === 'boolean' ? value.includeThoughts : undefined;
    let { googleSearch, imageSearch } = resolveGroundingFlags(value);

    if (capability && model) {
        if (capability.supportedSizes.length === 0) {
            requestedImageSize = undefined;
            size = actualOutputImageSize;
        } else {
            requestedImageSize =
                rawRequestedImageSize && capability.supportedSizes.includes(rawRequestedImageSize)
                    ? rawRequestedImageSize
                    : undefined;

            const normalizedLegacySize =
                rawLegacySize && capability.supportedSizes.includes(rawLegacySize) ? rawLegacySize : undefined;
            const normalizedActualOutputSize =
                actualOutputImageSize && capability.supportedSizes.includes(actualOutputImageSize)
                    ? actualOutputImageSize
                    : undefined;

            size = normalizedActualOutputSize || normalizedLegacySize || requestedImageSize;
        }

        if (outputFormat && !capability.outputFormats.includes(outputFormat)) {
            outputFormat = resolveFallbackOutputFormat(model);
        }

        if (thinkingLevel && !capability.thinkingLevels.includes(thinkingLevel)) {
            thinkingLevel = resolveFallbackThinkingLevel(model);
        }

        if (!capability.supportsIncludeThoughts) {
            includeThoughts = false;
        }
        if (!capability.supportsGoogleSearch) {
            googleSearch = false;
        }
        if (!capability.supportsImageSearch) {
            imageSearch = false;
        }
    }

    const groundingMode =
        typeof googleSearch === 'boolean' || typeof imageSearch === 'boolean' || isGroundingModeValue(value.groundingMode)
            ? deriveGroundingMode(Boolean(googleSearch), Boolean(imageSearch))
            : undefined;

    return {
        ...(rest as ImageSidecarMetadata),
        style: normalizeImageStyle(value.style),
        ...(requestedImageSize ? { requestedImageSize } : {}),
        ...(size ? { size } : {}),
        ...(outputFormat ? { outputFormat } : {}),
        ...(thinkingLevel ? { thinkingLevel } : {}),
        ...(typeof includeThoughts === 'boolean' ? { includeThoughts } : {}),
        ...(typeof googleSearch === 'boolean' ? { googleSearch } : {}),
        ...(typeof imageSearch === 'boolean' ? { imageSearch } : {}),
        ...(groundingMode ? { groundingMode } : {}),
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
