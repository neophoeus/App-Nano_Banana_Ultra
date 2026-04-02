import {
    AspectRatio,
    ImageSize,
    ImageStyle,
    ImageStyleCategory,
    OutputFormat,
    StructuredOutputMode,
    ThinkingLevel,
} from './types';
import { IMAGE_MODELS, MODEL_CAPABILITIES, type ModelCapability } from './utils/modelCapabilities';

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

export const STYLE_CATEGORIES: { id: ImageStyleCategory; label: string }[] = [
    { id: 'All', label: 'All' },
    { id: 'Photo', label: 'Photo' },
    { id: 'Classic', label: 'Classic' },
    { id: 'Digital', label: 'Digital' },
    { id: 'Stylized', label: 'Stylized' },
    { id: 'Craft', label: 'Craft' },
    { id: 'Design', label: 'Design' },
];

// Mapping styles to categories for filtering
export const STYLES_BY_CATEGORY: Record<ImageStyleCategory, ImageStyle[]> = {
    Photo: [
        'Photorealistic',
        'Cinematic',
        'Film Noir',
        'Vintage Polaroid',
        'Macro',
        'Long Exposure',
        'Double Exposure',
        'Tilt-Shift',
        'Knolling',
    ],
    Classic: [
        'Oil Painting',
        'Watercolor',
        'Pencil Sketch',
        'Ukiyo-e',
        'Ink Wash',
        'Impressionism',
        'Mosaic',
        'Pastel',
        'Art Nouveau',
        'Baroque',
        'Art Deco',
    ],
    Digital: [
        'Anime',
        '3D Render',
        'Cyberpunk',
        'Pixel Art',
        'Low Poly',
        'Vaporwave',
        'Isometric',
        'Vector Art',
        'Glitch Art',
        'Manga',
        'Chibi',
    ],
    Stylized: [
        'Surrealism',
        'Pop Art',
        'Psychedelic',
        'Gothic',
        'Steampunk',
        'Comic Book',
        'Fantasy Art',
        'Stained Glass',
        'Graffiti',
    ],
    Craft: ['Claymation', 'Origami', 'Knitted', 'Paper Cutout', 'Wood Carving', 'Porcelain', 'Embroidery', 'Crystal'],
    Design: ['Blueprint', 'Sticker', 'Doodle', 'Neon', 'Flat Design', 'Miniature'],
    All: [], // Populated dynamically below
};

// Flatten all styles for the 'All' category (excluding None, which is handled separately or first)
const allStyles = [
    ...STYLES_BY_CATEGORY['Photo'],
    ...STYLES_BY_CATEGORY['Classic'],
    ...STYLES_BY_CATEGORY['Digital'],
    ...STYLES_BY_CATEGORY['Stylized'],
    ...STYLES_BY_CATEGORY['Craft'],
    ...STYLES_BY_CATEGORY['Design'],
];

STYLES_BY_CATEGORY['All'] = ['None', ...allStyles];
