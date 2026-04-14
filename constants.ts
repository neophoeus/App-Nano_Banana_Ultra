import {
    AspectRatio,
    ImageSize,
    OutputFormat,
    StructuredOutputMode,
    ThinkingLevel,
} from './types';
import { IMAGE_MODELS, MODEL_CAPABILITIES, type ModelCapability } from './utils/modelCapabilities';
export { STYLE_CATEGORIES, STYLES_BY_CATEGORY } from './utils/styleRegistry';

export { IMAGE_MODELS, MODEL_CAPABILITIES };
export type { ModelCapability };

export const ASPECT_RATIOS: { value: AspectRatio; label: string; iconClass: string }[] = [
    { value: '1:8', label: 'Skyscraper', iconClass: 'aspect-[1/8]' },
    { value: '1:4', label: 'Tall', iconClass: 'aspect-[1/4]' },
    { value: '9:16', label: 'Portrait', iconClass: 'aspect-[9/16]' },
    { value: '2:3', label: 'Classic V', iconClass: 'aspect-[2/3]' },
    { value: '3:4', label: 'Vertical', iconClass: 'aspect-[3/4]' },
    { value: '4:5', label: 'Social', iconClass: 'aspect-[4/5]' },
    { value: '1:1', label: 'Square', iconClass: 'aspect-square' },
    { value: '5:4', label: 'Medium', iconClass: 'aspect-[5/4]' },
    { value: '4:3', label: 'Standard', iconClass: 'aspect-[4/3]' },
    { value: '3:2', label: 'Classic H', iconClass: 'aspect-[3/2]' },
    { value: '16:9', label: 'Widescreen', iconClass: 'aspect-video' },
    { value: '21:9', label: 'Cinematic', iconClass: 'aspect-[21/9]' },
    { value: '4:1', label: 'Ultra Wide', iconClass: 'aspect-[4/1]' },
    { value: '8:1', label: 'Panorama', iconClass: 'aspect-[8/1]' },
];

export const IMAGE_SIZES: ImageSize[] = ['512', '1K', '2K', '4K'];

export const OUTPUT_FORMATS: Array<{ value: OutputFormat; label: string }> = [
    { value: 'images-and-text', label: 'Images & text' },
    { value: 'images-only', label: 'Images only' },
];

export const STRUCTURED_OUTPUT_MODES: Array<{ value: StructuredOutputMode; label: string }> = [
    { value: 'off', label: 'Off' },
    { value: 'scene-brief', label: 'Scene brief' },
    { value: 'prompt-kit', label: 'Prompt kit' },
    { value: 'quality-check', label: 'Quality check' },
    { value: 'shot-plan', label: 'Shot plan' },
    { value: 'delivery-brief', label: 'Delivery brief' },
    { value: 'revision-brief', label: 'Revision brief' },
    { value: 'variation-compare', label: 'Variation compare' },
];

export const THINKING_LEVELS: Array<{ value: ThinkingLevel; label: string }> = [
    { value: 'minimal', label: 'Minimal' },
    { value: 'high', label: 'High' },
];
