
import { AspectRatio, ImageSize, ImageStyle, GenerateOptions } from "../types";

const jsonHeaders = {
  'Content-Type': 'application/json',
};

async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMessage = payload && typeof payload.error === 'string'
      ? payload.error
      : `Request failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  return payload as T;
}

// Helper to ensure we get the key
export const checkApiKey = async (): Promise<boolean> => {
  try {
    const payload = await fetchJson<{ hasApiKey: boolean }>('/api/runtime-config');
    return payload.hasApiKey;
  } catch {
    return false;
  }
};

export const promptForApiKey = async (): Promise<void> => {
  window.alert('Missing GEMINI_API_KEY. Add it to .env.local and restart the dev server.');
};

// --- Text Utilities (Prompt Engineering) ---

export const enhancePromptWithGemini = async (currentPrompt: string, lang: string = 'en'): Promise<string> => {
  try {
    const response = await fetchJson<{ text: string }>('/api/prompt/enhance', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ currentPrompt, lang }),
    });
    return response.text?.trim() || currentPrompt;
  } catch (e) {
    console.warn("Prompt enhancement failed, using original.", e);
    return currentPrompt;
  }
};

export const generateRandomPrompt = async (lang: string = 'en'): Promise<string> => {
  try {
    const response = await fetchJson<{ text: string }>('/api/prompt/random', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ lang }),
    });
    return response.text?.trim() || "A creative artistic image";
  } catch (e) {
    return "A beautiful creative image, 8k resolution.";
  }
};

// --- Image Generation Logic ---

// Helper to map UI styles to specific, distinctive prompt keywords
const getStyleKeywords = (style: ImageStyle): string => {
  switch (style) {
    // --- PHOTO ---
    case 'Photorealistic': return "photorealistic, hyper-realistic, 8k resolution, raw photo, highly detailed texture, raytracing, sharp focus, dslr quality";
    case 'Cinematic': return "cinematic shot, movie scene, dramatic lighting, shallow depth of field, anamorphic lens flare, color graded, 70mm film stock, wide angle";
    case 'Film Noir': return "film noir style, black and white photography, chiaroscuro lighting, dramatic shadows, high contrast, mysterious atmosphere, 1940s cinema look";
    case 'Vintage Polaroid': return "vintage polaroid photo, instant film aesthetic, soft focus, faded colors, vignette, dust and scratches, retro 80s vibe, white border";
    case 'Macro': return "macro photography, extreme close-up, incredible detail, shallow depth of field, bokeh, unseen textures, sharp focus on subject";
    case 'Long Exposure': return "long exposure photography, light trails, silky smooth water, motion blur, time-lapse feel, dreamy movement, ethereal flow";
    case 'Double Exposure': return "double exposure, superimposed images, dreamlike blending, surreal overlay, multiple exposure photography, ethereal ghosting effect";
    case 'Tilt-Shift': return "tilt-shift photography, miniature world effect, selective focus, blurred background and foreground, high angle shot, toy-like appearance";
    case 'Knolling': return "knolling photography, flat lay, objects arranged at 90 degree angles, organized chaos, clean background, high angle view, product photography";

    // --- CLASSIC ---
    case 'Oil Painting': return "oil painting, impasto technique, visible brushstrokes, textured canvas, vibrant colors, classical art style, masterwork";
    case 'Watercolor': return "watercolor painting, wet-on-wet technique, paper texture, soft blended colors, artistic splashes, dreamy, delicate brushstrokes";
    case 'Pencil Sketch': return "pencil sketch, graphite drawing, hand-drawn, rough lines, shading, cross-hatching, sketchbook aesthetic, monochrome";
    case 'Ukiyo-e': return "ukiyo-e style, japanese woodblock print, flat perspective, bold outlines, traditional japanese patterns, hokusai style, muted colors";
    case 'Ink Wash': return "ink wash painting, sumi-e style, brush and ink, minimal color, expressive brushstrokes, negative space, traditional asian art";
    case 'Impressionism': return "impressionist painting, monet style, visible small brushstrokes, emphasis on light and movement, vibrant colors, open composition";
    case 'Mosaic': return "mosaic art, tile pattern, tessellation, fragmented image, ceramic tiles, grout lines, textured surface, ancient roman aesthetic";
    case 'Pastel': return "soft pastel drawing, chalk texture, powdery finish, gentle colors, blended gradients, dreamy atmosphere, paper grain";
    case 'Art Nouveau': return "art nouveau style, mucha style, organic forms, curved lines, floral motifs, decorative borders, elegant, romantic";
    case 'Baroque': return "baroque art, caravaggio style, dramatic chiaroscuro, rich golden tones, ornate details, grand composition, religious intensity, theatrical lighting";
    case 'Art Deco': return "art deco style, 1920s aesthetic, geometric patterns, symmetrical design, gold and black palette, luxurious, bold lines, gatsby era elegance";

    // --- DIGITAL ---
    case 'Anime': return "anime style, cel shaded, vibrant colors, expressive eyes, dynamic pose, high quality 2D animation, clean linework, soft highlights";
    case '3D Render': return "3d render, octane render, unreal engine 5, raytracing, physically based rendering, volumetric lighting, ultra detailed, cgi";
    case 'Cyberpunk': return "cyberpunk aesthetic, neon lights, futuristic city, high tech low life, synthwave color palette, rain-slicked streets, glowing circuitry";
    case 'Pixel Art': return "pixel art, 16-bit sprite, retro game aesthetic, sharp edges, limited color palette, dithering, nostalgia, arcade style";
    case 'Low Poly': return "low poly art, geometric shapes, faceted surfaces, flat shading, minimalist 3d, polygon mesh aesthetic, retro computer graphics";
    case 'Vaporwave': return "vaporwave aesthetic, retro 80s and 90s, neon pink and blue, glitch effects, surreal statues, grid background, lo-fi nostalgia";
    case 'Isometric': return "isometric view, orthographic projection, detailed diorama, miniature world, clean lines, 3d icon style, precise geometry";
    case 'Vector Art': return "vector art, adobe illustrator style, clean lines, flat colors, solid shapes, scalable graphics aesthetic, crisp edges, minimalist";
    case 'Glitch Art': return "glitch art, datamoshing, digital distortion, pixel sorting, signal noise, chromatic aberration, broken screen effect, aesthetic error";
    case 'Manga': return "manga style, japanese comic, screentone shading, black and white ink, dramatic speed lines, emotional expressions, panel layout feel, detailed crosshatching";
    case 'Chibi': return "chibi style, super deformed, oversized head, tiny body, kawaii cute, big sparkly eyes, simplified features, adorable proportions, pastel colors";

    // --- STYLIZED ---
    case 'Surrealism': return "surrealism, dali style, dreamlike scene, illogical juxtaposition, melting forms, subconscious imagery, bizarre fantasy, magical realism";
    case 'Pop Art': return "pop art, andy warhol style, bold solid colors, repetitive patterns, comic book influence, mass media aesthetic, irony, high contrast";
    case 'Psychedelic': return "psychedelic art, trippy visual, fractals, kaleidoscope patterns, neon colors, swirling forms, hallucinations, optical illusion";
    case 'Gothic': return "gothic art, dark atmosphere, ornate details, medieval architecture, somber mood, spooky, dramatic lighting, romantic horror";
    case 'Steampunk': return "steampunk aesthetic, brass and copper gears, victorian era technology, steam powered machinery, clockwork details, sepia tones";
    case 'Comic Book': return "comic book style, halftone dots, bold ink outlines, dynamic panel composition, vivid saturated colors, action-packed, dramatic shading";
    case 'Fantasy Art': return "fantasy art, enchanted world, mythical creatures, magical atmosphere, ethereal lighting, epic landscapes, otherworldly beauty, concept art";
    case 'Stained Glass': return "stained glass art, vibrant translucent colors, bold black lead lines, intricate patterns, ecclesiastical art, light shining through";
    case 'Graffiti': return "graffiti art, street art style, spray paint texture, vibrant colors, drip effects, urban wall mural, bold tagging, stencil art";

    // --- CRAFT ---
    case 'Claymation': return "claymation style, plasticine texture, stop motion aesthetic, handmade fingerprint details, soft diffused lighting, playful 3D, warm tones";
    case 'Origami': return "origami art, folded paper, sharp creases, geometric shapes, paper texture, layered paper craft, intricate folds, minimal lighting";
    case 'Knitted': return "knitted texture, wool yarn, crochet pattern, soft fabric, detailed stitches, cozy atmosphere, handmade textile art";
    case 'Paper Cutout': return "paper cutout art, layered paper, shadow box effect, depth and dimension, craft paper texture, silhouette, diorama style";
    case 'Wood Carving': return "wood carving, hand-carved texture, natural wood grain, rustic feel, relief sculpture, tactile surface, warm tones";
    case 'Porcelain': return "porcelain texture, glossy ceramic, delicate china, smooth surface, fragile, painted glaze details, cracking effect, elegant";
    case 'Embroidery': return "embroidery art, stitched thread texture, fabric background, detailed needlework, tactile feel, woven pattern, handmade";
    case 'Crystal': return "crystal refraction, faceted glass, prismatic light, translucent, gem-like texture, sparkling, sharp edges, caustic patterns";

    // --- DESIGN ---
    case 'Blueprint': return "blueprint style, technical drawing, cyanotype, white lines on blue background, architectural schematic, detailed measurements, diagram";
    case 'Sticker': return "sticker art, die-cut white border, vector illustration, flat shading, glossy finish, isolated on background, decal style";
    case 'Doodle': return "doodle art, hand-drawn scribbles, notebook paper texture, playful, whimsical, cartoonish, rough sketches, sharpie marker style";
    case 'Neon': return "neon art, glowing glass tubes, vibrant light, dark background, electric atmosphere, cyber aesthetic, light painting";
    case 'Flat Design': return "flat design, minimalist, solid colors, no shadows, clean geometric shapes, modern UI aesthetic, bold typography, material design inspired";
    case 'Miniature': return "miniature model photography, tilt-shift diorama, tiny detailed world, handcrafted scenery, scale model, shallow depth of field, toy-like realism";

    case 'None': return "";
    default: return `${(style as string).toLowerCase()} style, artistic, high quality`;
  }
};

const generateSingleImage = async (
  options: GenerateOptions,
  imgIndex: number = 1,
  onLog?: (msg: string) => void,
  abortSignal?: AbortSignal
): Promise<string> => {
  let finalPrompt = options.prompt;
  const hasInputImages = (options.objectImageInputs && options.objectImageInputs.length > 0) ||
    (options.characterImageInputs && options.characterImageInputs.length > 0);

  if (!finalPrompt || finalPrompt.trim() === "") {
    finalPrompt = hasInputImages
      ? "High resolution, seamless integration with surrounding context, maintain consistent lighting and texture."
      : "A creative image.";
  }

  if (options.style && options.style !== 'None') {
    const styleKeywords = getStyleKeywords(options.style);
    finalPrompt = `${finalPrompt}, ${styleKeywords}`;
  }

  try {
    onLog?.(`Image #${imgIndex}: Sending request...`);

    if (abortSignal?.aborted) {
      throw new Error('ABORTED');
    }

    const apiCall = fetchJson<{ imageUrl: string }>('/api/images/generate', {
      method: 'POST',
      headers: jsonHeaders,
      signal: abortSignal,
      body: JSON.stringify({
        prompt: finalPrompt,
        model: options.model,
        aspectRatio: options.aspectRatio,
        imageSize: options.model === 'gemini-2.5-flash-image' ? undefined : options.imageSize,
        objectImageInputs: options.objectImageInputs,
        characterImageInputs: options.characterImageInputs,
      }),
    });

    const response = abortSignal
      ? await Promise.race([
        apiCall,
        new Promise<never>((_, reject) => {
          if (abortSignal.aborted) reject(new Error('ABORTED'));
          const handler = () => reject(new Error('ABORTED'));
          abortSignal.addEventListener('abort', handler, { once: true });
          apiCall.finally(() => abortSignal.removeEventListener('abort', handler));
        })
      ])
      : await apiCall;

    onLog?.(`Image #${imgIndex}: Success.`);
    return response.imageUrl;
  } catch (error: any) {
    const errorMessage = error.message || "Unknown error";

    if (errorMessage.includes("limit: 0")) {
      throw new Error("API key quota exceeded. This model requires a paid API key or billing enabled.");
    }

    if (errorMessage === 'Model returned no image data.') {
      throw new Error('Server returned empty response. Likely a temporary server issue or silent safety block.');
    }

    throw new Error(errorMessage);
  }
};

export type GenerationResult = {
  status: 'success' | 'failed';
  url?: string;
  error?: string;
  savedFilename?: string;
};

// F2: Retry helper with exponential backoff
interface RetryOptions {
  backoffMultiplier?: number;
  maxDelay?: number;
  abortSignal?: AbortSignal;
  onLog?: (msg: string) => void;
}
const retryOperation = async <T>(operation: () => Promise<T>, retries: number, delayMs: number = 1500, opts?: RetryOptions): Promise<T> => {
  const { backoffMultiplier = 2, maxDelay = 8000, abortSignal, onLog } = opts || {};
  try {
    return await operation();
  } catch (error: any) {
    // Never retry these deterministic errors
    const msg = error.message || "";
    if (msg.includes("PROMPT_BLOCKED") || msg.includes("SAFETY_BLOCK") || msg.includes("policy") || msg.includes("quota") || msg === 'ABORTED') {
      throw error;
    }

    if (abortSignal?.aborted) throw new Error('ABORTED');

    if (retries > 0) {
      // Retry transient errors only
      if (msg.includes("EMPTY_RESPONSE") || msg.includes("500") || msg.includes("503") || msg.includes("429") || msg.includes("fetch")) {
        // Parse Retry-After header for 429 (rate limit)
        let waitMs = delayMs;
        if (msg.includes("429")) {
          const retryAfterMatch = msg.match(/retry.?after[:\s]*(\d+)/i);
          if (retryAfterMatch) waitMs = Math.max(waitMs, parseInt(retryAfterMatch[1]) * 1000);
        }
        onLog?.(`⏳ Retrying in ${(waitMs / 1000).toFixed(1)}s... (${retries} left)`);
        // F1-FIX: Use abortable delay so cancel takes effect during retry wait
        await new Promise<void>((resolve, reject) => {
          const handler = () => { clearTimeout(timer); reject(new Error('ABORTED')); };
          const timer = setTimeout(() => {
            if (abortSignal) abortSignal.removeEventListener('abort', handler);
            resolve();
          }, waitMs);
          if (abortSignal) {
            if (abortSignal.aborted) { clearTimeout(timer); reject(new Error('ABORTED')); return; }
            abortSignal.addEventListener('abort', handler, { once: true });
          }
        });
        const nextDelay = Math.min(waitMs * backoffMultiplier, maxDelay);
        return retryOperation(operation, retries - 1, nextDelay, opts);
      }
    }
    throw error;
  }
};

export const generateImageWithGemini = async (
  options: GenerateOptions,
  batchSize: number = 1,
  onImageReceived?: (url: string) => Promise<string | undefined> | string | undefined,
  onLog?: (msg: string) => void,
  abortSignal?: AbortSignal,
  onProgress?: (completed: number, total: number) => void  // F4: Batch progress
): Promise<GenerationResult[]> => {
  // PARALLEL EXECUTION WITH STAGGER
  const STAGGER_DELAY_MS = 300;
  let completedCount = 0;

  const promises = Array.from({ length: batchSize }).map(async (_, index) => {
    // Stagger delay
    if (index > 0) await new Promise(resolve => setTimeout(resolve, index * STAGGER_DELAY_MS));

    // F1: Check abort before starting each image
    if (abortSignal?.aborted) return { status: 'failed' as const, error: 'Generation cancelled' };

    try {
      // F2: 3 retries with exponential backoff (1.5s → 3s → 6s)
      const url = await retryOperation(
        () => generateSingleImage(options, index + 1, onLog, abortSignal),
        3,
        1500,
        { backoffMultiplier: 2, maxDelay: 8000, abortSignal, onLog }
      );
      let savedFilename: string | undefined;
      if (onImageReceived) savedFilename = await onImageReceived(url);
      completedCount++;
      onProgress?.(completedCount, batchSize);
      return { status: 'success' as const, url, savedFilename };
    } catch (e: any) {
      completedCount++;
      onProgress?.(completedCount, batchSize);
      if (e.message === 'ABORTED') return { status: 'failed' as const, error: 'Generation cancelled' };
      onLog?.(`Image #${index + 1} Failed: ${e.message}`);
      return { status: 'failed' as const, error: e.message };
    }
  });

  const results = await Promise.all(promises);

  return results;
};
