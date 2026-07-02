import { AspectRatio, ImageModel, ImageSize, OutputFormat, ThinkingLevel } from '../types';

export interface ModelCapability {
    supportedSizes: ImageSize[];
    supportedRatios: AspectRatio[];
    maxObjects: number;
    maxCharacters: number;
    outputFormats: OutputFormat[];
    supportsTemperature: boolean;
    thinkingLevels: ThinkingLevel[];
    supportsIncludeThoughts: boolean;
    supportsGoogleSearch: boolean;
    supportsImageSearch: boolean;
}

export const IMAGE_MODELS: ImageModel[] = [
    'gemini-3.1-flash-image',
    'gemini-3.1-flash-lite-image',
    'gemini-3-pro-image',
    'gemini-2.5-flash-image',
];

export const VALID_IMAGE_MODELS = new Set<ImageModel>(IMAGE_MODELS);

export const VALID_IMAGE_SIZES = new Set<ImageSize>(['512', '1K', '2K', '4K']);

export const MODEL_CAPABILITIES: Record<ImageModel, ModelCapability> = {
    'gemini-3.1-flash-image': {
        supportedSizes: ['512', '1K', '2K', '4K'],
        supportedRatios: [
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
        ],
        maxObjects: 10,
        maxCharacters: 4,
        outputFormats: ['images-and-text', 'images-only'],
        supportsTemperature: true,
        thinkingLevels: ['minimal', 'high'],
        supportsIncludeThoughts: true,
        supportsGoogleSearch: true,
        supportsImageSearch: true,
    },
    'gemini-3.1-flash-lite-image': {
        supportedSizes: ['1K'],
        supportedRatios: [
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
        ],
        maxObjects: 14,
        maxCharacters: 0,
        outputFormats: ['images-and-text', 'images-only'],
        supportsTemperature: true,
        thinkingLevels: ['minimal', 'high'],
        supportsIncludeThoughts: true,
        supportsGoogleSearch: false,
        supportsImageSearch: false,
    },
    'gemini-3-pro-image': {
        supportedSizes: ['1K', '2K', '4K'],
        supportedRatios: ['1:1', '16:9', '9:16', '4:3', '3:4', '2:3', '3:2', '21:9', '4:5', '5:4'],
        maxObjects: 6,
        maxCharacters: 5,
        outputFormats: ['images-and-text', 'images-only'],
        supportsTemperature: true,
        thinkingLevels: ['disabled'],
        supportsIncludeThoughts: true,
        supportsGoogleSearch: true,
        supportsImageSearch: false,
    },
    'gemini-2.5-flash-image': {
        supportedSizes: [],
        supportedRatios: ['1:1', '16:9', '9:16', '4:3', '3:4', '2:3', '3:2', '21:9', '4:5', '5:4'],
        maxObjects: 3,
        maxCharacters: 0,
        outputFormats: ['images-and-text', 'images-only'],
        supportsTemperature: true,
        thinkingLevels: ['disabled'],
        supportsIncludeThoughts: false,
        supportsGoogleSearch: false,
        supportsImageSearch: false,
    },
};

// Legacy model aliases for backwards compatibility with deprecated preview strings
(MODEL_CAPABILITIES as any)['gemini-3.1-flash-image-preview'] = MODEL_CAPABILITIES['gemini-3.1-flash-image'];
(MODEL_CAPABILITIES as any)['gemini-3.1-flash-lite-image-preview'] = MODEL_CAPABILITIES['gemini-3.1-flash-lite-image'];
(MODEL_CAPABILITIES as any)['gemini-3-pro-image-preview'] = MODEL_CAPABILITIES['gemini-3-pro-image'];
