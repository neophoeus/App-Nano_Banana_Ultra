
export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '2:3' | '3:2' | '21:9' | '4:5' | '5:4' | '1:4' | '4:1' | '1:8' | '8:1';
export type ImageSize = '512' | '1K' | '2K' | '4K';

export type ImageStyleCategory = 'All' | 'Photo' | 'Classic' | 'Digital' | 'Stylized' | 'Craft' | 'Design';

export type ImageStyle =
  // Base
  'None' |
  // Photo
  'Photorealistic' | 'Cinematic' | 'Film Noir' | 'Vintage Polaroid' | 'Macro' | 'Long Exposure' | 'Double Exposure' | 'Tilt-Shift' | 'Knolling' |
  // Classic
  'Oil Painting' | 'Watercolor' | 'Pencil Sketch' | 'Ukiyo-e' | 'Ink Wash' | 'Impressionism' | 'Mosaic' | 'Pastel' | 'Art Nouveau' | 'Baroque' | 'Art Deco' |
  // Digital
  'Anime' | '3D Render' | 'Cyberpunk' | 'Pixel Art' | 'Low Poly' | 'Vaporwave' | 'Isometric' | 'Vector Art' | 'Glitch Art' | 'Manga' | 'Chibi' |
  // Stylized
  'Surrealism' | 'Pop Art' | 'Psychedelic' | 'Gothic' | 'Steampunk' | 'Comic Book' | 'Fantasy Art' | 'Stained Glass' | 'Graffiti' |
  // Craft
  'Claymation' | 'Origami' | 'Knitted' | 'Paper Cutout' | 'Wood Carving' | 'Porcelain' | 'Embroidery' | 'Crystal' |
  // Design
  'Blueprint' | 'Sticker' | 'Doodle' | 'Neon' | 'Flat Design' | 'Miniature';

export type ImageModel = 'gemini-3.1-flash-image-preview' | 'gemini-3-pro-image-preview' | 'gemini-2.5-flash-image';

export interface GeneratedImage {
  id: string;
  url: string;
  savedFilename?: string;
  prompt: string;
  aspectRatio: AspectRatio;
  size: ImageSize;
  style: ImageStyle;
  model: ImageModel;
  createdAt: number;
  mode?: string;
  status?: 'success' | 'failed';
  error?: string;
}

export interface GenerateOptions {
  prompt: string;
  aspectRatio?: AspectRatio;
  imageSize: ImageSize;
  style: ImageStyle;
  model: ImageModel;
  objectImageInputs?: string[];
  characterImageInputs?: string[];
}
