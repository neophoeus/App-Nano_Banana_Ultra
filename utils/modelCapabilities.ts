import { AspectRatio, ImageModel, ImageSize, OutputFormat, ThinkingLevel } from '../types';

export interface ModelCapability {
    supportedSizes: ImageSize[];
    supportedRatios: AspectRatio[];
    maxObjects: number;
    maxCharacters: number;
    maxStyles: number;
    supportsVideo: boolean;
    outputFormats: OutputFormat[];
    supportsTemperature: boolean;
    thinkingLevels: ThinkingLevel[];
    supportsIncludeThoughts: boolean;
    supportsGoogleSearch: boolean;
    supportsImageSearch: boolean;
}

export const IMAGE_MODELS: ImageModel[] = [
    'gemini-nano-banana-2.1',
    'gemini-3.1-flash-image',
    'gemini-3.1-flash-lite-image',
    'gemini-3-pro-image',
    'gemini-2.5-flash-image',
];

export const VALID_IMAGE_MODELS = new Set<ImageModel>(IMAGE_MODELS);

export const VALID_IMAGE_SIZES = new Set<ImageSize>(['512', '512px', '1K', '2K', '4K']);

export const MODEL_CAPABILITIES: Record<ImageModel, ModelCapability> = {
    'gemini-nano-banana-2.1': {
        supportedSizes: ['1K', '2K', '4K'],
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
        maxStyles: 0,
        supportsVideo: true,
        outputFormats: ['images-and-text', 'images-only'],
        // Nano Banana 2.1 (gemini-nano-banana-2.1) has removed temperature parameter support upstream
        supportsTemperature: false,
        thinkingLevels: ['minimal', 'medium', 'high'],
        supportsIncludeThoughts: true,
        supportsGoogleSearch: true,
        supportsImageSearch: true,
    },
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
        maxStyles: 0,
        supportsVideo: true,
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
        maxStyles: 0,
        supportsVideo: true,
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
        maxStyles: 3,
        supportsVideo: false,
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
        maxStyles: 0,
        supportsVideo: false,
        outputFormats: ['images-and-text', 'images-only'],
        supportsTemperature: true,
        thinkingLevels: ['disabled'],
        supportsIncludeThoughts: false,
        supportsGoogleSearch: false,
        supportsImageSearch: false,
    },
};

export interface ModelQuotaSpec {
    defaultRpm: number;
    defaultTpm: number;
    recommendedStaggerMs: number;
}

export const MODEL_QUOTA_SPECS: Record<ImageModel, ModelQuotaSpec> = {
    'gemini-nano-banana-2.1': {
        defaultRpm: 15,
        defaultTpm: 200000,
        recommendedStaggerMs: 1200,
    },
    'gemini-3.1-flash-image': {
        defaultRpm: 15,
        defaultTpm: 200000,
        recommendedStaggerMs: 1200,
    },
    'gemini-3.1-flash-lite-image': {
        defaultRpm: 15,
        defaultTpm: 200000,
        recommendedStaggerMs: 800,
    },
    'gemini-3-pro-image': {
        defaultRpm: 2,
        defaultTpm: 32000,
        recommendedStaggerMs: 5000,
    },
    'gemini-2.5-flash-image': {
        defaultRpm: 15,
        defaultTpm: 200000,
        recommendedStaggerMs: 1200,
    },
};

export const getModelQuotaSpec = (model?: string | null): ModelQuotaSpec => {
    if (!model) {
        return MODEL_QUOTA_SPECS['gemini-nano-banana-2.1'];
    }
    const normalizedModel = model.replace(/-preview$/i, '') as ImageModel;
    if (MODEL_QUOTA_SPECS[normalizedModel]) {
        return MODEL_QUOTA_SPECS[normalizedModel];
    }
    if (model.toLowerCase().includes('pro')) {
        return MODEL_QUOTA_SPECS['gemini-3-pro-image'];
    }
    return MODEL_QUOTA_SPECS['gemini-nano-banana-2.1'];
};

// Legacy model aliases for backwards compatibility with deprecated preview strings
(MODEL_CAPABILITIES as any)['gemini-nano-banana-2.1-preview'] = MODEL_CAPABILITIES['gemini-nano-banana-2.1'];
(MODEL_CAPABILITIES as any)['gemini-3.1-flash-image-preview'] = MODEL_CAPABILITIES['gemini-3.1-flash-image'];
(MODEL_CAPABILITIES as any)['gemini-3.1-flash-lite-image-preview'] = MODEL_CAPABILITIES['gemini-3.1-flash-lite-image'];
(MODEL_CAPABILITIES as any)['gemini-3-pro-image-preview'] = MODEL_CAPABILITIES['gemini-3-pro-image'];
