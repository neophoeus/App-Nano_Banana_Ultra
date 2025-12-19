

import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { AspectRatio, ImageSize, ImageStyle, GenerateOptions } from "../types";

// Helper to ensure we get the key
export const checkApiKey = async (): Promise<boolean> => {
  const aistudio = (window as any).aistudio;
  if (typeof aistudio?.hasSelectedApiKey === 'function') {
    return await aistudio.hasSelectedApiKey();
  }
  return !!process.env.API_KEY;
};

export const promptForApiKey = async (): Promise<void> => {
  const aistudio = (window as any).aistudio;
  if (typeof aistudio?.openSelectKey === 'function') {
    await aistudio.openSelectKey();
  } else {
    console.warn("AI Studio key selection not available in this environment.");
  }
};

/**
 * SAFETY SETTINGS CONFIGURATION
 * Set to BLOCK_NONE to allow maximum creative freedom for image generation tasks.
 */
const PERMISSIVE_SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// --- Text Utilities (Prompt Engineering) ---

export const enhancePromptWithGemini = async (currentPrompt: string, lang: string = 'en'): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Strict enhancement instruction
  const systemInstruction = `You are an expert image prompt engineer.
  Task: Optimize the user's prompt for a high-quality AI image generator (like Midjourney or Gemini).
  Add details about lighting, texture, composition, and mood.
  CRITICAL RULES:
  1. Output ONLY the raw prompt text.
  2. Do NOT add "Here is the prompt", labels, titles, or quotes.
  3. Keep the original subject matter.
  4. Output in ${lang}.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      config: { 
        systemInstruction: systemInstruction,
        safetySettings: PERMISSIVE_SAFETY_SETTINGS,
        thinkingConfig: { thinkingBudget: 0 }
      },
      contents: currentPrompt || "A creative image",
    });
    
    // Cleanup any residual quotes or newlines just in case
    let cleanText = response.text?.trim() || currentPrompt;
    cleanText = cleanText.replace(/^["']|["']$/g, '');
    return cleanText;
  } catch (e) {
    console.warn("Prompt enhancement failed, using original.", e);
    return currentPrompt; 
  }
};

export const generateRandomPrompt = async (lang: string = 'en'): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const themes = ['Cyberpunk City', 'Fantasy Landscape', 'Sci-Fi Portrait', 'Abstract Fluid Art', 'Macro Nature', 'Retro Poster Design', 'Surrealist Dream', 'Architectural Marvel'];
  const randomTheme = themes[Math.floor(Math.random() * themes.length)];

  const systemInstruction = `You are a creative image prompt generator.
  Task: Generate a single, highly descriptive, and vivid image prompt based on a random theme.
  CRITICAL RULES:
  1. Output ONLY the raw prompt text.
  2. Do NOT include any conversational filler (e.g., "Here is a prompt", "Title:", "Concept:").
  3. Do NOT use markdown code blocks.
  4. The prompt must be ready to copy-paste into an image generator.
  5. Output in ${lang}.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      config: { 
        systemInstruction: systemInstruction,
        safetySettings: PERMISSIVE_SAFETY_SETTINGS,
        thinkingConfig: { thinkingBudget: 0 }
      },
      contents: `Theme: ${randomTheme}. Generate one prompt now.`,
    });
    // Remove any accidental quotes or newlines
    let cleanText = response.text?.trim() || "";
    cleanText = cleanText.replace(/^["']|["']$/g, '');
    return cleanText || "A creative artistic image";
  } catch (e) {
    return "A beautiful creative image, 8k resolution.";
  }
};

// --- Keyword Identification Service ---
// This function asks Gemini Flash to analyze WHY the prompt might have been blocked
const identifyBlockKeywords = async (prompt: string, category: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            config: {
                systemInstruction: `You are a content safety analyzer. 
                Task: Analyze the input text which triggered a "${category}" safety filter.
                Output: Extract specific words, phrases, or visual descriptions that likely caused this policy violation.
                Constraints:
                1. Return ONLY a comma-separated list (e.g. "blood, gore, weapon").
                2. Do NOT output conversational text, definitions, or markdown.
                3. If specific words are not found, output the concept (e.g. "explicit violence").`,
                safetySettings: PERMISSIVE_SAFETY_SETTINGS,
                thinkingConfig: { thinkingBudget: 0 }
            },
            contents: `Text: "${prompt}"`
        });
        const keywords = response.text?.trim();
        // Clean up quotes if present
        const cleanKeywords = keywords?.replace(/^["']|["']$/g, '');
        return cleanKeywords ? `[${cleanKeywords}]` : "";
    } catch {
        return ""; // If analysis fails, return empty string
    }
};

// --- Image Generation Logic ---

// Helper to map UI styles to specific, distinctive prompt keywords
const getStyleKeywords = (style: ImageStyle): string => {
  switch (style) {
    // --- PHOTOGRAPHY ---
    case 'Photorealistic': return "photorealistic, hyper-realistic, 8k resolution, raw photo, highly detailed texture, raytracing, sharp focus, dslr quality";
    case 'Cinematic': return "cinematic shot, movie scene, dramatic lighting, shallow depth of field, anamorphic lens flare, color graded, 70mm film stock, wide angle";
    case 'Vintage Polaroid': return "vintage polaroid photo, instant film aesthetic, soft focus, faded colors, vignette, dust and scratches, retro 80s vibe, white border";
    case 'Film Noir': return "film noir style, black and white photography, chiaroscuro lighting, dramatic shadows, high contrast, mysterious atmosphere, 1940s cinema look";
    case 'Tilt-Shift': return "tilt-shift photography, miniature world effect, selective focus, blurred background and foreground, high angle shot, toy-like appearance";
    case 'Macro': return "macro photography, extreme close-up, incredible detail, shallow depth of field, bokeh, unseen textures, sharp focus on subject";
    case 'Fisheye': return "fisheye lens, ultra-wide angle, distorted perspective, spherical distortion, dynamic composition, gopro aesthetic, 180 degree view";
    case 'Double Exposure': return "double exposure, superimposed images, dreamlike blending, surreal overlay, multiple exposure photography, ethereal ghosting effect";
    case 'Infrared': return "infrared photography, false color, surreal color palette, dreamlike atmosphere, snowy white foliage, pink sky, aerochrome film style";
    case 'Long Exposure': return "long exposure photography, light trails, silky smooth water, motion blur, time-lapse feel, dreamy movement, ethereal flow";

    // --- ART ---
    case 'Watercolor': return "watercolor painting, wet-on-wet technique, paper texture, soft blended colors, artistic splashes, dreamy, delicate brushstrokes";
    case 'Oil Painting': return "oil painting, impasto technique, visible brushstrokes, textured canvas, vibrant colors, classical art style, masterwork";
    case 'Pencil Sketch': return "pencil sketch, graphite drawing, hand-drawn, rough lines, shading, cross-hatching, sketchbook aesthetic, monochrome";
    case 'Ukiyo-e': return "ukiyo-e style, japanese woodblock print, flat perspective, bold outlines, traditional japanese patterns, hokusai style, muted colors";
    case 'Ink Wash': return "ink wash painting, sumi-e style, brush and ink, minimal color, expressive brushstrokes, negative space, traditional asian art";
    case 'Impressionism': return "impressionist painting, monet style, visible small brushstrokes, emphasis on light and movement, vibrant colors, open composition";
    case 'Stained Glass': return "stained glass art, vibrant translucent colors, bold black lead lines, intricate patterns, ecclesiastical art, light shining through";
    case 'Mosaic': return "mosaic art, tile pattern, tessellation, fragmented image, ceramic tiles, grout lines, textured surface, ancient roman aesthetic";
    case 'Graffiti': return "graffiti art, street art style, spray paint texture, vibrant colors, drip effects, urban wall mural, bold tagging, stencil art";
    case 'Pastel': return "soft pastel drawing, chalk texture, powdery finish, gentle colors, blended gradients, dreamy atmosphere, paper grain";
    case 'Art Nouveau': return "art nouveau style, mucha style, organic forms, curved lines, floral motifs, decorative borders, elegant, romantic";
    case 'Abstract': return "abstract art, non-representational, geometric shapes, fluid forms, bold color palette, emotional expression, avant-garde composition";

    // --- DIGITAL ---
    case 'Anime': return "anime style, cel shaded, vibrant colors, expressive eyes, dynamic pose, studio ghibli or makoto shinkai aesthetic, high quality 2d animation";
    case '3D Render': return "3d render, octane render, unreal engine 5, raytracing, physically based rendering, volumetric lighting, ultra detailed, cgi";
    case 'Cyberpunk': return "cyberpunk aesthetic, neon lights, futuristic city, high tech low life, synthwave color palette, rain-slicked streets, glowing circuitry";
    case 'Pixel Art': return "pixel art, 16-bit sprite, retro game aesthetic, sharp edges, limited color palette, dithering, nostalgia, arcade style";
    case 'Low Poly': return "low poly art, geometric shapes, faceted surfaces, flat shading, minimalist 3d, polygon mesh aesthetic, retro computer graphics";
    case 'Vaporwave': return "vaporwave aesthetic, retro 80s and 90s, neon pink and blue, glitch effects, surreal statues, grid background, lo-fi nostalgia";
    case 'Voxel Art': return "voxel art, blocky aesthetic, minecraft style, 3d pixel art, isometric view, lego-like structure, cube-based rendering";
    case 'Isometric': return "isometric view, orthographic projection, detailed diorama, miniature world, clean lines, 3d icon style, precise geometry";
    case 'Vector Art': return "vector art, adobe illustrator style, clean lines, flat colors, solid shapes, scalable graphics aesthetic, crisp edges, minimalist";
    case 'Glitch Art': return "glitch art, datamoshing, digital distortion, pixel sorting, signal noise, chromatic aberration, broken screen effect, aesthetic error";
    case 'Line Art': return "line art, continuous line drawing, minimalist, black and white, clean strokes, vector lines, outline only, tattoo design style";

    // --- UNIQUE ---
    case 'Surrealism': return "surrealism, dali style, dreamlike scene, illogical juxtaposition, melting forms, subconscious imagery, bizarre fantasy, magical realism";
    case 'Comic Book': return "comic book style, halftone dots, bold ink outlines, speech bubbles, dynamic action, marvel or dc comics aesthetic, vibrant colors";
    case 'Fantasy Art': return "fantasy art, digital painting, dungeons and dragons style, epic scale, magical atmosphere, detailed environment, concept art";
    case 'Steampunk': return "steampunk aesthetic, brass and copper gears, victorian era technology, steam powered machinery, clockwork details, sepia tones";
    case 'Biomechanical': return "biomechanical art, H.R. Giger style, organic and mechanical fusion, dark sci-fi, intricate details, alien structure, metallic texture";
    case 'Gothic': return "gothic art, dark atmosphere, ornate details, medieval architecture, somber mood, spooky, dramatic lighting, romantic horror";
    case 'Pop Art': return "pop art, andy warhol style, bold solid colors, repetitive patterns, comic book influence, mass media aesthetic, irony, high contrast";
    case 'Psychedelic': return "psychedelic art, trippy visual, fractals, kaleidoscope patterns, neon colors, swirling forms, hallucinations, optical illusion";
    case 'Knolling': return "knolling photography, flat lay, objects arranged at 90 degree angles, organized chaos, clean background, high angle view, product photography";
    case 'Blueprint': return "blueprint style, technical drawing, cyanotype, white lines on blue background, architectural schematic, detailed measurements, diagram";
    case 'Sticker': return "sticker art, die-cut white border, vector illustration, flat shading, glossy finish, isolated on background, decal style";
    case 'Doodle': return "doodle art, hand-drawn scribbles, notebook paper texture, playful, whimsical, cartoonish, rough sketches, sharpie marker style";

    // --- MATERIAL ---
    case 'Claymation': return "claymation style, plasticine texture, stop motion aesthetic, aardman animation style, fingerprint details, soft lighting, handmade feel";
    case 'Origami': return "origami art, folded paper, sharp creases, geometric shapes, paper texture, layered paper craft, intricate folds, minimal lighting";
    case 'Neon': return "neon art, glowing glass tubes, vibrant light, dark background, electric atmosphere, cyber aesthetic, light painting";
    case 'Knitted': return "knitted texture, wool yarn, crochet pattern, soft fabric, detailed stitches, cozy atmosphere, handmade textile art";
    case 'Paper Cutout': return "paper cutout art, layered paper, shadow box effect, depth and dimension, craft paper texture, silhouette, diorama style";
    case 'Wood Carving': return "wood carving, hand-carved texture, natural wood grain, rustic feel, relief sculpture, tactile surface, warm tones";
    case 'Porcelain': return "porcelain texture, glossy ceramic, delicate china, smooth surface, fragile, painted glaze details, cracking effect, elegant";
    case 'Embroidery': return "embroidery art, stitched thread texture, fabric background, detailed needlework, tactile feel, woven pattern, handmade";
    case 'Crystal': return "crystal refraction, faceted glass, prismatic light, translucent, gem-like texture, sparkling, sharp edges, caustic patterns";
    case 'Paper Quilling': return "paper quilling art, rolled paper strips, intricate coils, edge-on paper texture, colorful filigree, dimensional craft";

    case 'None': return ""; 
    default: return `${(style as string).toLowerCase()} style, artistic, high quality`;
  }
};

// Internal function to generate a single image (NO RETRY inside here, retries are handled by caller)
const generateSingleImage = async (
    ai: GoogleGenAI, 
    options: GenerateOptions, 
    imgIndex: number = 1,
    onLog?: (msg: string) => void
): Promise<string> => {
  
  let finalPrompt = options.prompt;
  const hasInputImages = options.imageInputs && options.imageInputs.length > 0;
  
  // --- PRECISE AUTO-FILLING LOGIC ---
  if (!finalPrompt || finalPrompt.trim() === "") {
     if (hasInputImages) {
       // If empty prompt with ref images, assume style transfer or variation
       finalPrompt = "High resolution, seamless integration with surrounding context, maintain consistent lighting and texture.";
     } else {
       finalPrompt = "A creative image.";
     }
  }

  // Only append style if explicitly selected
  if (options.style && options.style !== 'None') {
    const styleKeywords = getStyleKeywords(options.style);
    finalPrompt = `${finalPrompt}, ${styleKeywords}`;
  }

  const parts: any[] = [];
  
  if (hasInputImages) {
    for (const imgInput of options.imageInputs!) {
      if (!imgInput) continue;
      let mimeType = 'image/png';
      const match = imgInput.match(/^data:([^;]+);base64,/);
      if (match && match[1]) mimeType = match[1];
      const base64Data = imgInput.includes('base64,') ? imgInput.split('base64,')[1] : imgInput;
      parts.push({ inlineData: { data: base64Data, mimeType: mimeType } });
    }
  }

  parts.push({ text: finalPrompt });

  const imageConfig: any = { imageSize: options.imageSize };

  // FIX: Allow all ratios selected by the user to be passed to the API.
  // The API (Gemini 3 Pro Image) supports more than the basic 5 ratios.
  if (options.aspectRatio) {
      imageConfig.aspectRatio = options.aspectRatio;
  }

  try {
      onLog?.(`Image #${imgIndex}: Sending request...`);

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts: parts },
        config: { 
            imageConfig: imageConfig,
            safetySettings: PERMISSIVE_SAFETY_SETTINGS
        },
      });

      // --- CHECK PROMPT FEEDBACK (Blocking happened BEFORE generation) ---
      if (response.promptFeedback) {
          const { blockReason } = response.promptFeedback;
          // Cast to string to avoid TypeScript strict check errors against potentially incompatible types
          const reasonStr = blockReason as unknown as string;
          if (reasonStr && reasonStr !== 'BLOCK_REASON_UNSPECIFIED' && reasonStr !== 'NONE') {
               // This is a definitive block on the input prompt
               throw new Error(`PROMPT_BLOCKED: ${blockReason}`);
          }
      }

      // Check for inline data (Success)
      if (response.candidates && response.candidates.length > 0) {
        const candidate = response.candidates[0];

        if (candidate.content && candidate.content.parts) {
          for (const part of candidate.content.parts) {
            if (part.inlineData) {
              const mimeType = part.inlineData.mimeType || 'image/png';
              const url = `data:${mimeType};base64,${part.inlineData.data}`;
              onLog?.(`Image #${imgIndex}: Success.`);
              return url;
            }
          }
        }
        
        // If we have candidates but no image, check finishReason
        const finishReason = candidate.finishReason;
        
        // Detailed Safety Analysis for Output Blocking
        if (finishReason === 'SAFETY') {
            const ratings = candidate?.safetyRatings ?? [];
            const blockedCategories = ratings
                .filter((r: any) => r.probability === 'HIGH' || r.probability === 'MEDIUM' || r.blocked)
                .map((r: any) => {
                    const cat = String(r.category ?? 'UNKNOWN');
                    return cat.replace('HARM_CATEGORY_', '').replace(/_/g, ' ').toLowerCase();
                });
            
            const reason = blockedCategories.length > 0 
                ? blockedCategories.join(', ') 
                : 'Unknown Safety Filter';
                
            onLog?.(`Image #${imgIndex}: Output blocked by filter.`);
            try {
               const specificKeywords = await identifyBlockKeywords(finalPrompt, reason);
               throw new Error(`SAFETY_BLOCK: ${reason} ${specificKeywords}`);
            } catch {
               throw new Error(`SAFETY_BLOCK: ${reason}`);
            }
        }
        
        if (finishReason === 'OTHER') {
            throw new Error("Generic Block (Other)");
        }
      }

      // If candidates array is empty AND promptFeedback didn't catch it, it's a true empty response (server glitch or silent block)
      throw new Error("EMPTY_RESPONSE");

  } catch (error: any) {
      let errorMessage = error.message || "Unknown error";
      
      // Handle "Limit: 0" Quota Errors
      if (errorMessage.includes("limit: 0")) {
           throw new Error("API key quota exceeded. This model requires a paid API key or billing enabled.");
      }
      
      // Handle Prompt Blocks specifically
      if (errorMessage.startsWith("PROMPT_BLOCKED")) {
           const reason = errorMessage.split(': ')[1];
           throw new Error(`Prompt rejected by policy: ${reason}. Please modify your prompt.`);
      }

      if (errorMessage === "EMPTY_RESPONSE") {
          throw new Error("Server returned empty response. Likely a temporary server issue or silent safety block.");
      }
      
      if (errorMessage.startsWith("SAFETY_BLOCK")) {
          const blockReason = errorMessage.split(': ')[1];
          throw new Error(`Blocked by filter: ${blockReason}`);
      }
      
      throw new Error(errorMessage);
  }
};

export type GenerationResult = {
    status: 'success' | 'failed';
    url?: string;
    error?: string;
};

// Retry helper
const retryOperation = async <T>(operation: () => Promise<T>, retries: number, delayMs: number = 1000): Promise<T> => {
    try {
        return await operation();
    } catch (error: any) {
        // DO NOT RETRY if the error is deterministic (Prompt Blocked or Safety Block)
        const msg = error.message || "";
        if (msg.includes("PROMPT_BLOCKED") || msg.includes("SAFETY_BLOCK") || msg.includes("policy") || msg.includes("quota")) {
             throw error;
        }

        if (retries > 0) {
            // Only retry for transient or vague errors
            if (msg.includes("EMPTY_RESPONSE") || msg.includes("500") || msg.includes("503") || msg.includes("fetch")) {
                console.log(`Retrying operation... (${retries} left). Error: ${msg}`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
                return retryOperation(operation, retries - 1, delayMs);
            }
        }
        throw error;
    }
};

// --- Frontend Integration (Gemini SDK) ---
export const generateImageWithGemini = async (
  options: GenerateOptions, 
  batchSize: number = 1,
  onImageReceived?: (url: string) => void,
  onLog?: (msg: string) => void
): Promise<GenerationResult[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // PARALLEL EXECUTION WITH STAGGER
  const STAGGER_DELAY_MS = 300; 

  const promises = Array.from({ length: batchSize }).map(async (_, index) => {
      // Stagger delay
      if (index > 0) await new Promise(resolve => setTimeout(resolve, index * STAGGER_DELAY_MS));

      try {
        // Wrap with retry logic (1 retry allowed for reliability)
        const url = await retryOperation(
            () => generateSingleImage(ai, options, index + 1, onLog), 
            1, 
            1500 // Wait 1.5s before retry
        );
        if (onImageReceived) onImageReceived(url);
        return { status: 'success' as const, url };
      } catch (e: any) {
        onLog?.(`Image #${index + 1} Failed: ${e.message}`);
        return { status: 'failed' as const, error: e.message };
      }
  });
  
  const results = await Promise.all(promises);
  
  return results;
};
