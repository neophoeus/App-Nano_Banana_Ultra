
export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '2:3' | '3:2' | '21:9' | '4:5' | '5:4';
export type ImageSize = '1K' | '2K' | '4K';

export type ImageStyleCategory = 'All' | 'Photography' | 'Art' | 'Digital' | 'Unique' | 'Material';

export type ImageStyle = 
  // Base
  'None' | 
  // Photography
  'Photorealistic' | 'Cinematic' | 'Vintage Polaroid' | 'Film Noir' | 'Tilt-Shift' | 'Macro' | 'Fisheye' | 'Double Exposure' | 'Infrared' | 'Long Exposure' |
  // Art
  'Watercolor' | 'Oil Painting' | 'Pencil Sketch' | 'Ukiyo-e' | 'Ink Wash' | 'Impressionism' | 'Stained Glass' | 'Mosaic' | 'Graffiti' | 'Pastel' | 'Art Nouveau' | 'Abstract' |
  // Digital
  'Anime' | '3D Render' | 'Cyberpunk' | 'Pixel Art' | 'Low Poly' | 'Vaporwave' | 'Voxel Art' | 'Isometric' | 'Vector Art' | 'Glitch Art' | 'Line Art' |
  // Unique
  'Surrealism' | 'Comic Book' | 'Fantasy Art' | 'Steampunk' | 'Biomechanical' | 'Gothic' | 'Pop Art' | 'Psychedelic' | 'Knolling' | 'Blueprint' | 'Sticker' | 'Doodle' |
  // Material
  'Claymation' | 'Origami' | 'Neon' | 'Knitted' | 'Paper Cutout' | 'Wood Carving' | 'Porcelain' | 'Embroidery' | 'Crystal' | 'Paper Quilling';

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  aspectRatio: AspectRatio;
  size: ImageSize;
  style: ImageStyle;
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
  imageInputs?: string[];
}
