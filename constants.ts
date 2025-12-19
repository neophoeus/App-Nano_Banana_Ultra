
import { AspectRatio, ImageSize, ImageStyle, ImageStyleCategory } from './types';

export const ASPECT_RATIOS: { value: AspectRatio; label: string; iconClass: string }[] = [
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
];

export const IMAGE_SIZES: ImageSize[] = ['1K', '2K', '4K'];

export const STYLE_CATEGORIES: { id: ImageStyleCategory; label: string }[] = [
  { id: 'All', label: 'All' },
  { id: 'Photography', label: 'Photo' },
  { id: 'Art', label: 'Art' },
  { id: 'Digital', label: 'Digital' },
  { id: 'Unique', label: 'Unique' },
  { id: 'Material', label: 'Material' },
];

// Mapping styles to categories for filtering
export const STYLES_BY_CATEGORY: Record<ImageStyleCategory, ImageStyle[]> = {
  'Photography': ['Photorealistic', 'Cinematic', 'Vintage Polaroid', 'Film Noir', 'Tilt-Shift', 'Macro', 'Fisheye', 'Double Exposure', 'Infrared', 'Long Exposure'],
  'Art': ['Oil Painting', 'Watercolor', 'Pencil Sketch', 'Ukiyo-e', 'Ink Wash', 'Impressionism', 'Stained Glass', 'Mosaic', 'Graffiti', 'Pastel', 'Art Nouveau', 'Abstract'],
  'Digital': ['3D Render', 'Anime', 'Cyberpunk', 'Pixel Art', 'Low Poly', 'Vaporwave', 'Voxel Art', 'Isometric', 'Vector Art', 'Glitch Art', 'Line Art'],
  'Unique': ['Surrealism', 'Comic Book', 'Fantasy Art', 'Steampunk', 'Biomechanical', 'Gothic', 'Pop Art', 'Psychedelic', 'Knolling', 'Blueprint', 'Sticker', 'Doodle'],
  'Material': ['Claymation', 'Origami', 'Neon', 'Knitted', 'Paper Cutout', 'Wood Carving', 'Porcelain', 'Embroidery', 'Crystal', 'Paper Quilling'],
  'All': [] // Populated dynamically below
};

// Flatten all styles for the 'All' category (excluding None, which is handled separately or first)
const allStyles = [
  ...STYLES_BY_CATEGORY['Photography'],
  ...STYLES_BY_CATEGORY['Art'],
  ...STYLES_BY_CATEGORY['Digital'],
  ...STYLES_BY_CATEGORY['Unique'],
  ...STYLES_BY_CATEGORY['Material']
];

STYLES_BY_CATEGORY['All'] = ['None', ...allStyles];
