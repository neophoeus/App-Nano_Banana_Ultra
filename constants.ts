import { AspectRatio, ImageSize, OutputFormat, ThinkingLevel } from './types';
import { IMAGE_MODELS, MODEL_CAPABILITIES, type ModelCapability } from './utils/modelCapabilities';
export { STYLE_CATEGORIES, STYLES_BY_CATEGORY } from './utils/styleRegistry';

export { IMAGE_MODELS, MODEL_CAPABILITIES };
export type { ModelCapability };

export const ASPECT_RATIOS: { value: AspectRatio; labelKey: string; iconClass: string }[] = [
    { value: '1:8', labelKey: 'ratioSkyscraper', iconClass: 'aspect-[1/8]' },
    { value: '1:4', labelKey: 'ratioTall', iconClass: 'aspect-[1/4]' },
    { value: '9:16', labelKey: 'ratioPortrait', iconClass: 'aspect-[9/16]' },
    { value: '2:3', labelKey: 'ratioClassicV', iconClass: 'aspect-[2/3]' },
    { value: '3:4', labelKey: 'ratioVertical', iconClass: 'aspect-[3/4]' },
    { value: '4:5', labelKey: 'ratioSocial', iconClass: 'aspect-[4/5]' },
    { value: '1:1', labelKey: 'ratioSquare', iconClass: 'aspect-square' },
    { value: '5:4', labelKey: 'ratioMedium', iconClass: 'aspect-[5/4]' },
    { value: '4:3', labelKey: 'ratioStandard', iconClass: 'aspect-[4/3]' },
    { value: '3:2', labelKey: 'ratioClassicH', iconClass: 'aspect-[3/2]' },
    { value: '16:9', labelKey: 'ratioWidescreen', iconClass: 'aspect-video' },
    { value: '21:9', labelKey: 'ratioCinematic', iconClass: 'aspect-[21/9]' },
    { value: '4:1', labelKey: 'ratioUltraWide', iconClass: 'aspect-[4/1]' },
    { value: '8:1', labelKey: 'ratioPanorama', iconClass: 'aspect-[8/1]' },
];

export const IMAGE_SIZES: ImageSize[] = ['512', '1K', '2K', '4K'];

export const OUTPUT_FORMATS: Array<{ value: OutputFormat; labelKey: string }> = [
    { value: 'images-and-text', labelKey: 'outputFormatImagesAndText' },
    { value: 'images-only', labelKey: 'outputFormatImagesOnly' },
];

export const THINKING_LEVELS: Array<{ value: ThinkingLevel; labelKey: string }> = [
    { value: 'minimal', labelKey: 'thinkingLevelMinimal' },
    { value: 'medium', labelKey: 'thinkingLevelMedium' },
    { value: 'high', labelKey: 'thinkingLevelHigh' },
];

export const getOutputFormatLabelKey = (value: OutputFormat) =>
    OUTPUT_FORMATS.find((option) => option.value === value)?.labelKey ?? 'outputFormatImagesOnly';

export const getThinkingLevelLabelKey = (value: ThinkingLevel) => {
    if (value === 'disabled') {
        return 'thinkingLevelDisabled';
    }

    return THINKING_LEVELS.find((option) => option.value === value)?.labelKey ?? 'thinkingLevelDisabled';
};
