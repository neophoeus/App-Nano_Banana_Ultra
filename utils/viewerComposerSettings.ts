import {
    AspectRatio,
    GeneratedImage,
    GroundingMode,
    ImageModel,
    ImageSize,
    ImageStyle,
    OutputFormat,
    ThinkingLevel,
    ViewerComposerSettingsSnapshot,
    WorkspaceComposerState,
} from '../types';
import { getGroundingFlagsFromMode } from './groundingMode';
import { IMAGE_MODELS, MODEL_CAPABILITIES } from './modelCapabilities';
import { EMPTY_WORKSPACE_COMPOSER_STATE } from './workspacePersistence';

type ViewerComposerSettingsState = Pick<
    WorkspaceComposerState,
    | 'aspectRatio'
    | 'imageSize'
    | 'imageStyle'
    | 'imageModel'
    | 'batchSize'
    | 'outputFormat'
    | 'temperature'
    | 'thinkingLevel'
    | 'includeThoughts'
    | 'googleSearch'
    | 'imageSearch'
>;

const VALID_ASPECT_RATIOS = new Set<AspectRatio>([
    '1:1',
    '16:9',
    '9:16',
    '4:3',
    '3:4',
    '2:3',
    '3:2',
    '21:9',
    '4:5',
    '5:4',
    '1:4',
    '4:1',
    '1:8',
    '8:1',
]);
const VALID_IMAGE_SIZES = new Set<ImageSize>(['512', '1K', '2K', '4K']);
const VALID_OUTPUT_FORMATS = new Set<OutputFormat>(['images-only', 'images-and-text']);
const VALID_THINKING_LEVELS = new Set<ThinkingLevel>(['disabled', 'minimal', 'high']);

const isAspectRatioValue = (value: unknown): value is AspectRatio =>
    typeof value === 'string' && VALID_ASPECT_RATIOS.has(value as AspectRatio);

const isImageModelValue = (value: unknown): value is ImageModel =>
    typeof value === 'string' && IMAGE_MODELS.includes(value as ImageModel);

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

const clampTemperature = (value: number) => Math.max(0, Math.min(2, value));

const normalizeViewerBatchSize = (value: number) => Math.max(1, Math.round(value));

const resolveFallbackOutputFormat = (imageModel: ImageModel): OutputFormat => {
    const capability = MODEL_CAPABILITIES[imageModel];

    if (capability.outputFormats.includes(EMPTY_WORKSPACE_COMPOSER_STATE.outputFormat)) {
        return EMPTY_WORKSPACE_COMPOSER_STATE.outputFormat;
    }

    return capability.outputFormats[0] || 'images-only';
};

const resolveFallbackThinkingLevel = (imageModel: ImageModel): ThinkingLevel => {
    const capability = MODEL_CAPABILITIES[imageModel];

    if (capability.thinkingLevels.includes(EMPTY_WORKSPACE_COMPOSER_STATE.thinkingLevel)) {
        return EMPTY_WORKSPACE_COMPOSER_STATE.thinkingLevel;
    }

    if (capability.thinkingLevels.includes('minimal')) {
        return 'minimal';
    }

    return capability.thinkingLevels[0] || 'disabled';
};

export const buildViewerComposerSettingsSnapshot = (
    historyItem: Pick<GeneratedImage, 'aspectRatio' | 'size' | 'style' | 'model'> | null,
    metadata: Record<string, unknown> | null,
): ViewerComposerSettingsSnapshot | null => {
    if (!historyItem) {
        return null;
    }

    const imageModel = isImageModelValue(metadata?.model) ? metadata.model : historyItem.model;
    const capability = MODEL_CAPABILITIES[imageModel];
    const aspectRatio = isAspectRatioValue(metadata?.aspectRatio) ? metadata.aspectRatio : historyItem.aspectRatio;
    const imageSize = isImageSizeValue(metadata?.requestedImageSize)
        ? metadata.requestedImageSize
        : capability.supportedSizes.length > 0 && isImageSizeValue(metadata?.size)
          ? metadata.size
          : capability.supportedSizes.length > 0
            ? historyItem.size
            : undefined;
    const imageStyle =
        typeof metadata?.style === 'string' && metadata.style.trim().length > 0
            ? (metadata.style as ImageStyle)
            : historyItem.style;
    const batchSize =
        typeof metadata?.batchSize === 'number' && Number.isFinite(metadata.batchSize)
            ? normalizeViewerBatchSize(metadata.batchSize)
            : 1;

    let googleSearch = typeof metadata?.googleSearch === 'boolean' ? metadata.googleSearch : undefined;
    let imageSearch = typeof metadata?.imageSearch === 'boolean' ? metadata.imageSearch : undefined;

    if ((googleSearch === undefined || imageSearch === undefined) && isGroundingModeValue(metadata?.groundingMode)) {
        const groundingFlags = getGroundingFlagsFromMode(metadata.groundingMode);

        if (googleSearch === undefined) {
            googleSearch = groundingFlags.googleSearch;
        }
        if (imageSearch === undefined) {
            imageSearch = groundingFlags.imageSearch;
        }
    }

    return {
        aspectRatio,
        imageStyle,
        imageModel,
        batchSize,
        ...(imageSize ? { imageSize } : {}),
        ...(isOutputFormatValue(metadata?.outputFormat) ? { outputFormat: metadata.outputFormat } : {}),
        ...(typeof metadata?.temperature === 'number' && Number.isFinite(metadata.temperature)
            ? { temperature: metadata.temperature }
            : {}),
        ...(isThinkingLevelValue(metadata?.thinkingLevel) ? { thinkingLevel: metadata.thinkingLevel } : {}),
        ...(typeof metadata?.includeThoughts === 'boolean' ? { includeThoughts: metadata.includeThoughts } : {}),
        ...(typeof googleSearch === 'boolean' ? { googleSearch } : {}),
        ...(typeof imageSearch === 'boolean' ? { imageSearch } : {}),
    };
};

export const normalizeViewerComposerSettingsSnapshot = (
    snapshot: ViewerComposerSettingsSnapshot,
    currentImageSize: ImageSize = EMPTY_WORKSPACE_COMPOSER_STATE.imageSize,
): ViewerComposerSettingsState => {
    const capability = MODEL_CAPABILITIES[snapshot.imageModel];
    const fallbackOutputFormat = resolveFallbackOutputFormat(snapshot.imageModel);
    const fallbackThinkingLevel = resolveFallbackThinkingLevel(snapshot.imageModel);
    const fallbackIncludeThoughts = capability.supportsIncludeThoughts
        ? EMPTY_WORKSPACE_COMPOSER_STATE.includeThoughts
        : false;
    const fallbackGoogleSearch = capability.supportsGoogleSearch ? EMPTY_WORKSPACE_COMPOSER_STATE.googleSearch : false;
    const fallbackImageSearch = capability.supportsImageSearch ? EMPTY_WORKSPACE_COMPOSER_STATE.imageSearch : false;

    const aspectRatio = capability.supportedRatios.includes(snapshot.aspectRatio)
        ? snapshot.aspectRatio
        : capability.supportedRatios.includes(EMPTY_WORKSPACE_COMPOSER_STATE.aspectRatio)
          ? EMPTY_WORKSPACE_COMPOSER_STATE.aspectRatio
          : capability.supportedRatios.includes('1:1')
            ? '1:1'
            : capability.supportedRatios[0] || snapshot.aspectRatio;
    const imageSize =
        capability.supportedSizes.length === 0
                        ? currentImageSize
                        : snapshot.imageSize && capability.supportedSizes.includes(snapshot.imageSize)
              ? snapshot.imageSize
              : capability.supportedSizes.includes('1K')
                ? '1K'
                : capability.supportedSizes.includes(EMPTY_WORKSPACE_COMPOSER_STATE.imageSize)
                  ? EMPTY_WORKSPACE_COMPOSER_STATE.imageSize
                                    : capability.supportedSizes[0] || currentImageSize;
    const outputFormat =
        snapshot.outputFormat && capability.outputFormats.includes(snapshot.outputFormat)
            ? snapshot.outputFormat
            : fallbackOutputFormat;
    const temperature = capability.supportsTemperature
        ? clampTemperature(
              typeof snapshot.temperature === 'number' && Number.isFinite(snapshot.temperature)
                  ? snapshot.temperature
                  : EMPTY_WORKSPACE_COMPOSER_STATE.temperature,
          )
        : EMPTY_WORKSPACE_COMPOSER_STATE.temperature;
    const thinkingLevel =
        snapshot.thinkingLevel && capability.thinkingLevels.includes(snapshot.thinkingLevel)
            ? snapshot.thinkingLevel
            : fallbackThinkingLevel;
    const includeThoughts = capability.supportsIncludeThoughts
        ? typeof snapshot.includeThoughts === 'boolean'
            ? snapshot.includeThoughts
            : fallbackIncludeThoughts
        : false;

    let googleSearch = typeof snapshot.googleSearch === 'boolean' ? snapshot.googleSearch : fallbackGoogleSearch;
    let imageSearch = typeof snapshot.imageSearch === 'boolean' ? snapshot.imageSearch : fallbackImageSearch;

    if (!capability.supportsGoogleSearch) {
        googleSearch = false;
    }
    if (!capability.supportsImageSearch) {
        imageSearch = false;
    }

    return {
        aspectRatio,
        imageSize,
        imageStyle: snapshot.imageStyle,
        imageModel: snapshot.imageModel,
        batchSize: normalizeViewerBatchSize(snapshot.batchSize),
        outputFormat:
            imageSearch && capability.outputFormats.includes('images-and-text') ? 'images-and-text' : outputFormat,
        temperature,
        thinkingLevel,
        includeThoughts,
        googleSearch,
        imageSearch,
    };
};
