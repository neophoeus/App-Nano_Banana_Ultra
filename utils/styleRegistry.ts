import { ImageStyle, ImageStyleCategory } from '../types';

export type ActiveImageStyle = Exclude<ImageStyle, 'None'>;
export type ActiveStyleCategoryId = Exclude<ImageStyleCategory, 'All'>;

export type StyleCategoryRegistryItem = {
    id: ImageStyleCategory;
    defaultLabel: string;
    order: number;
};

export type StyleRegistryItem = {
    id: ActiveImageStyle;
    defaultLabel: string;
    categoryId: ActiveStyleCategoryId;
    iconId: string;
    promptDescriptor: string;
    transferDescriptor: string;
    status: 'active' | 'legacy';
    legacyIds: string[];
    notes?: string;
};

const sanitizeTranslationKeyPart = (value: string) => value.replace(/[^a-zA-Z0-9]/g, '');

const createIconId = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const createCategory = (id: ImageStyleCategory, defaultLabel: string, order: number): StyleCategoryRegistryItem => ({
    id,
    defaultLabel,
    order,
});

const createStyle = (
    id: ActiveImageStyle,
    categoryId: ActiveStyleCategoryId,
    promptDescriptor: string,
    transferDescriptor: string,
    options: Partial<Pick<StyleRegistryItem, 'defaultLabel' | 'iconId' | 'status' | 'legacyIds' | 'notes'>> = {},
): StyleRegistryItem => ({
    id,
    defaultLabel: options.defaultLabel ?? id,
    categoryId,
    iconId: options.iconId ?? createIconId(id),
    promptDescriptor,
    transferDescriptor,
    status: options.status ?? 'active',
    legacyIds: options.legacyIds ?? [],
    ...(options.notes ? { notes: options.notes } : {}),
});

export const STYLE_CATEGORY_REGISTRY: readonly StyleCategoryRegistryItem[] = [
    createCategory('All', 'All', 0),
    createCategory('PhotoFilm', 'Photo & Film', 1),
    createCategory('PaintDrawing', 'Paint & Drawing', 2),
    createCategory('Illustration', 'Illustration', 3),
    createCategory('ComicsAnime', 'Comics & Anime', 4),
    createCategory('GraphicDesign', 'Graphic Design', 5),
    createCategory('ThreeDPixel', '3D & Pixel', 6),
    createCategory('CraftMaterial', 'Craft & Material', 7),
    createCategory('Experimental', 'Experimental', 8),
];

export const ACTIVE_STYLE_REGISTRY_ITEMS: readonly StyleRegistryItem[] = [
    createStyle(
        'Photorealistic',
        'PhotoFilm',
        'photorealistic image, realistic light response, natural surface detail, sharp subject fidelity, grounded photographic finish',
        'a photorealistic treatment with realistic light response, natural surface detail, and grounded photographic fidelity',
    ),
    createStyle(
        'Cinematic',
        'PhotoFilm',
        'cinematic still, dramatic lighting, controlled depth of field, deliberate framing, graded color contrast, polished image finish',
        'a cinematic-still treatment with dramatic lighting, deliberate framing, controlled depth of field, and graded color contrast',
    ),
    createStyle(
        'Film Noir',
        'PhotoFilm',
        'film noir, monochrome palette, hard contrast lighting, deep shadow shapes, smoky atmosphere, tense dramatic finish',
        'a film-noir treatment with a monochrome palette, hard contrast lighting, deep shadow shapes, and tense dramatic atmosphere',
    ),
    createStyle(
        'Vintage Instant Photo',
        'PhotoFilm',
        'vintage instant photo, softened focus, faded color palette, paper-border framing, subtle surface wear, nostalgic photographic finish',
        'a vintage instant-photo treatment with softened focus, faded color palette, paper-border framing, subtle surface wear, and nostalgic photographic character',
        {
            legacyIds: ['Vintage Polaroid'],
            notes: 'Hard-migrated from Vintage Polaroid.',
        },
    ),
    createStyle(
        'Macro',
        'PhotoFilm',
        'macro photography, extreme close focus, magnified surface detail, shallow depth of field, crisp subject isolation',
        'a macro-photography treatment with extreme close focus, magnified surface detail, and crisp subject isolation',
    ),
    createStyle(
        'Long Exposure',
        'PhotoFilm',
        'long-exposure photography, motion trails, soft temporal blur, flowing light streaks, atmospheric photographic finish',
        'a long-exposure treatment with motion trails, soft temporal blur, and flowing light behavior',
    ),
    createStyle(
        'Double Exposure',
        'PhotoFilm',
        'double-exposure photography, layered imagery, transparent overlap, dreamlike blending, surreal photographic finish',
        'a double-exposure treatment with layered imagery, transparent overlap, and dreamlike visual blending',
    ),
    createStyle(
        'Tilt-Shift',
        'PhotoFilm',
        'tilt-shift photography, selective focus, miniature-scale depth cues, blurred foreground and background, compressed photographic scene',
        'a tilt-shift treatment with selective focus, miniature-scale depth cues, and compressed scene perspective',
    ),
    createStyle(
        'Knolling',
        'PhotoFilm',
        'knolling photography, flat-lay arrangement, precise spacing, orderly composition, clean overhead presentation',
        'a knolling treatment with flat-lay arrangement, precise spacing, and clean overhead presentation',
    ),

    createStyle(
        'Oil Painting',
        'PaintDrawing',
        'oil painting, visible brush texture, layered pigment, rich color depth, canvas-like painted finish',
        'an oil-painting treatment with visible brush texture, layered pigment, and rich painted surface depth',
    ),
    createStyle(
        'Watercolor',
        'PaintDrawing',
        'watercolor painting, translucent washes, soft color diffusion, paper grain, delicate painted finish',
        'a watercolor treatment with translucent washes, soft color diffusion, and paper-grain texture',
    ),
    createStyle(
        'Pencil Sketch',
        'PaintDrawing',
        'pencil sketch, graphite linework, tonal shading, hand-drawn structure, sketchbook finish',
        'a pencil-sketch treatment with graphite linework, tonal shading, and hand-drawn structure',
    ),
    createStyle(
        'Ukiyo-e',
        'PaintDrawing',
        'ukiyo-e print, flat layered color, bold contour lines, decorative patterning, compressed depth, woodblock-inspired finish',
        'an ukiyo-e treatment with flat layered color, bold contour lines, decorative patterning, and compressed depth',
    ),
    createStyle(
        'Ink Wash',
        'PaintDrawing',
        'ink wash painting, fluid brushwork, tonal ink gradients, open negative space, restrained painted finish',
        'an ink-wash treatment with fluid brushwork, tonal ink gradients, and open negative space',
    ),
    createStyle(
        'Impressionism',
        'PaintDrawing',
        'impressionist painting, broken color strokes, luminous atmosphere, softened edges, fleeting light, painterly surface finish',
        'an impressionist treatment with broken color strokes, luminous atmosphere, softened edges, and fleeting light',
    ),
    createStyle(
        'Pastel',
        'PaintDrawing',
        'pastel drawing, powdery pigment texture, softened edges, muted layered color, paper-surface finish',
        'a pastel treatment with powdery pigment texture, softened edges, and muted layered color',
    ),
    createStyle(
        'Baroque',
        'PaintDrawing',
        'baroque painting, dramatic light falloff, rich shadow depth, ornate detailing, grand composition, theatrical painted finish',
        'a baroque treatment with dramatic light falloff, rich shadow depth, ornate detailing, and grand composition',
    ),

    createStyle(
        'Fantasy Art',
        'Illustration',
        'fantasy illustration, heightened atmosphere, stylized material richness, dramatic scale cues, evocative mood, imaginative illustrative finish',
        'a fantasy-illustration treatment with heightened atmosphere, stylized material richness, dramatic scale cues, evocative mood, and an imaginative illustrative finish',
    ),
    createStyle(
        'Doodle',
        'Illustration',
        'doodle illustration, spontaneous hand-drawn marks, loose playful rhythm, simplified shapes, casual line flow, graphic sketch finish',
        'a doodle-illustration treatment with spontaneous hand-drawn marks, loose playful rhythm, and casual line flow',
    ),
    createStyle(
        'Digital Illustration',
        'Illustration',
        'digital illustration, clean painted shapes, refined linework, controlled shading, layered color, polished illustrative finish',
        'a digital-illustration treatment with clean painted shapes, refined linework, controlled shading, and a polished illustrative finish',
    ),
    createStyle(
        'Painterly Illustration',
        'Illustration',
        'painterly illustration, visible brush texture, expressive strokes, softened edges, layered color masses, hand-painted finish',
        'a painterly-illustration treatment with visible brush texture, expressive strokes, softened edges, and a hand-painted finish',
    ),
    createStyle(
        'Editorial Illustration',
        'Illustration',
        'editorial illustration, concept-driven composition, simplified forms, clear focal hierarchy, graphic clarity, polished illustrative finish',
        'an editorial-illustration treatment with concept-driven composition, simplified forms, clear focal hierarchy, and graphic clarity',
    ),
    createStyle(
        'Concept Art',
        'Illustration',
        'concept art, design-forward silhouettes, readable forms, material indication, atmospheric lighting, development-painting finish',
        'a concept-art treatment with design-forward silhouettes, readable forms, material indication, atmospheric lighting, and a development-painting finish',
    ),
    createStyle(
        'Line Art',
        'Illustration',
        'line art, clean contours, varied line weight, open negative space, minimal fill, crisp graphic structure',
        'a line-art treatment with clean contours, varied line weight, open negative space, and crisp graphic structure',
    ),
    createStyle(
        'Storybook Illustration',
        'Illustration',
        'storybook illustration, narrative composition, gentle textures, warm color harmony, expressive posing, inviting illustrated finish',
        'a storybook-illustration treatment with narrative composition, gentle textures, warm color harmony, expressive posing, and an inviting illustrated finish',
    ),

    createStyle(
        'Anime',
        'ComicsAnime',
        'anime illustration, clean linework, cel-style shading, expressive shapes, vibrant accent color, polished 2d finish',
        'an anime-style treatment with clean linework, cel-style shading, expressive shapes, and a polished 2d finish',
    ),
    createStyle(
        'Manga',
        'ComicsAnime',
        'manga illustration, black-and-white ink work, graphic contrast, expressive line emphasis, print-comic finish',
        'a manga-style treatment with black-and-white ink work, graphic contrast, expressive line emphasis, and a print-comic finish',
    ),
    createStyle(
        'Chibi',
        'ComicsAnime',
        'chibi illustration, simplified small-body proportions, rounded forms, cute expression emphasis, playful graphic finish',
        'a chibi-style treatment with simplified small-body proportions, rounded forms, cute expression emphasis, and a playful graphic finish',
    ),
    createStyle(
        'Comic Illustration',
        'ComicsAnime',
        'comic illustration, bold contour lines, graphic shading, dynamic composition, punchy color separation, energetic illustrated finish',
        'a comic-illustration treatment with bold contour lines, graphic shading, dynamic composition, and punchy color separation',
        {
            legacyIds: ['Comic Book'],
            notes: 'Hard-migrated from Comic Book.',
        },
    ),

    createStyle(
        'Vector Art',
        'GraphicDesign',
        'vector-style illustration, crisp edges, simplified geometric forms, even color regions, clean visual hierarchy, scalable graphic finish',
        'a vector-style treatment with crisp edges, simplified geometric forms, even color regions, and clean visual hierarchy',
    ),
    createStyle(
        'Blueprint',
        'GraphicDesign',
        'blueprint graphic, technical linework, schematic structure, measurement-like detailing, cyan technical finish',
        'a blueprint-style treatment with technical linework, schematic structure, and cyan technical presentation',
    ),
    createStyle(
        'Sticker',
        'GraphicDesign',
        'sticker illustration, isolated shape, die-cut border feel, graphic simplicity, playful polished finish',
        'a sticker-style treatment with isolated shapes, die-cut border feel, and playful polished graphic simplicity',
    ),
    createStyle(
        'Flat Design',
        'GraphicDesign',
        'flat design, minimal depth, clear shape language, simple color blocks, tidy hierarchy, modern graphic finish',
        'a flat-design treatment with minimal depth, clear shape language, simple color blocks, and tidy visual hierarchy',
    ),
    createStyle(
        'Art Nouveau',
        'GraphicDesign',
        'art nouveau, flowing organic curves, ornamental framing, floral rhythm, elegant silhouette, decorative illustrated finish',
        'an art-nouveau treatment with flowing organic curves, ornamental framing, floral rhythm, and elegant silhouettes',
    ),
    createStyle(
        'Art Deco',
        'GraphicDesign',
        'art deco, geometric ornament, symmetrical structure, metallic-accent contrast, streamlined decorative finish',
        'an art-deco treatment with geometric ornament, symmetrical structure, metallic-accent contrast, and a streamlined decorative finish',
    ),

    createStyle(
        '3D Render',
        'ThreeDPixel',
        '3d rendered image, dimensional forms, defined materials, realistic light interaction, clean surface detail, polished rendered finish',
        'a 3d-rendered treatment with dimensional forms, defined materials, realistic light interaction, and a polished rendered finish',
    ),
    createStyle(
        'Pixel Art',
        'ThreeDPixel',
        'pixel art, grid-based forms, limited palette blocks, crisp edges, retro graphic finish',
        'a pixel-art treatment with grid-based forms, limited palette blocks, crisp edges, and a retro graphic finish',
    ),
    createStyle(
        'Low Poly',
        'ThreeDPixel',
        'low-poly rendering, faceted shapes, simplified geometry, planar shading, stylized 3d finish',
        'a low-poly treatment with faceted shapes, simplified geometry, planar shading, and a stylized 3d finish',
    ),
    createStyle(
        'Isometric',
        'ThreeDPixel',
        'isometric illustration, angled orthographic space, clean geometry, miniature scene logic, precise structured finish',
        'an isometric treatment with angled orthographic space, clean geometry, miniature scene logic, and precise structure',
    ),
    createStyle(
        'Miniature',
        'ThreeDPixel',
        'miniature-scale scene, condensed spatial layout, tactile tiny details, diorama-like structure, selective depth cues, small-world visual finish',
        'a miniature-scale treatment with condensed spatial layout, tactile tiny details, diorama-like structure, and selective depth cues',
    ),

    createStyle(
        'Mosaic',
        'CraftMaterial',
        'mosaic artwork, tiled segmentation, assembled color fragments, patterned surface rhythm, tactile crafted finish',
        'a mosaic treatment with tiled segmentation, assembled color fragments, patterned surface rhythm, and tactile crafted texture',
    ),
    createStyle(
        'Stained Glass',
        'CraftMaterial',
        'stained-glass artwork, translucent color panels, bold leading lines, luminous segmented surface, decorative crafted finish',
        'a stained-glass treatment with translucent color panels, bold leading lines, and a luminous segmented surface',
    ),
    createStyle(
        'Claymation',
        'CraftMaterial',
        'claymation look, molded forms, soft handmade texture, tactile volume, stop-motion crafted finish',
        'a claymation treatment with molded forms, soft handmade texture, tactile volume, and a stop-motion crafted finish',
    ),
    createStyle(
        'Origami',
        'CraftMaterial',
        'origami sculpture, folded paper planes, crisp creases, geometric paper structure, handcrafted finish',
        'an origami treatment with folded paper planes, crisp creases, geometric paper structure, and handcrafted finish',
    ),
    createStyle(
        'Knitted',
        'CraftMaterial',
        'knitted textile, looped yarn texture, stitched pattern rhythm, soft fiber surface, handmade fabric finish',
        'a knitted-textile treatment with looped yarn texture, stitched pattern rhythm, and soft fiber surface detail',
    ),
    createStyle(
        'Paper Cutout',
        'CraftMaterial',
        'paper cutout artwork, layered paper planes, crisp silhouette edges, shadowed depth, handcrafted collage finish',
        'a paper-cutout treatment with layered paper planes, crisp silhouette edges, shadowed depth, and handcrafted collage texture',
    ),
    createStyle(
        'Wood Carving',
        'CraftMaterial',
        'wood-carved artwork, carved grooves, visible grain, relief depth, handcrafted material finish',
        'a wood-carved treatment with carved grooves, visible grain, relief depth, and handcrafted material texture',
    ),
    createStyle(
        'Porcelain',
        'CraftMaterial',
        'porcelain surface, smooth glaze, delicate ceramic sheen, refined ornament detail, polished crafted finish',
        'a porcelain treatment with smooth glaze, delicate ceramic sheen, refined ornament detail, and a polished crafted finish',
    ),
    createStyle(
        'Embroidery',
        'CraftMaterial',
        'embroidery artwork, stitched thread texture, layered needlework, textile surface pattern, handmade crafted finish',
        'an embroidery treatment with stitched thread texture, layered needlework, textile surface pattern, and a handmade crafted finish',
    ),
    createStyle(
        'Crystal',
        'CraftMaterial',
        'crystal-like surface, faceted transparency, prismatic light behavior, sharp reflective edges, luminous material finish',
        'a crystal-like treatment with faceted transparency, prismatic light behavior, sharp reflective edges, and luminous material finish',
    ),

    createStyle(
        'Cyberpunk',
        'Experimental',
        'cyberpunk visual language, luminous neon accents, synthetic material contrast, layered technological detail, reflective surfaces, high-tech graphic finish',
        'a cyberpunk treatment with luminous neon accents, synthetic material contrast, layered technological detail, reflective surfaces, and a high-tech graphic finish',
    ),
    createStyle(
        'Vaporwave',
        'Experimental',
        'vaporwave aesthetic, nostalgic digital glow, pastel-neon palette, surreal graphic calm, retro-futurist mood, synthetic visual finish',
        'a vaporwave treatment with nostalgic digital glow, a pastel-neon palette, surreal graphic calm, and retro-futurist mood',
    ),
    createStyle(
        'Glitch Art',
        'Experimental',
        'glitch art, digital disruption, fragmented signal patterns, color channel offsets, unstable electronic finish',
        'a glitch-art treatment with digital disruption, fragmented signal patterns, color channel offsets, and an unstable electronic finish',
    ),
    createStyle(
        'Surrealism',
        'Experimental',
        'surrealist image, unexpected juxtapositions, dreamlike logic, altered scale relationships, symbolic atmosphere, uncanny visual finish',
        'a surrealist treatment with unexpected juxtapositions, dreamlike logic, altered scale relationships, and uncanny symbolic atmosphere',
    ),
    createStyle(
        'Pop Art',
        'Experimental',
        'pop art, bold flat color, graphic repetition, sharp contrast, poster-like punch, playful mass-culture finish',
        'a pop-art treatment with bold flat color, graphic repetition, sharp contrast, and poster-like visual punch',
    ),
    createStyle(
        'Psychedelic',
        'Experimental',
        'psychedelic image treatment, fluid color transitions, optical rhythm, layered pattern distortion, heightened visual energy, altered-perception finish',
        'a psychedelic treatment with fluid color transitions, optical rhythm, layered pattern distortion, and heightened visual energy',
    ),
    createStyle(
        'Gothic',
        'Experimental',
        'gothic visual style, ornate structure, dark tonal richness, pointed silhouettes, somber atmosphere, dramatic decorative finish',
        'a gothic treatment with ornate structure, dark tonal richness, pointed silhouettes, somber atmosphere, and dramatic decorative finish',
    ),
    createStyle(
        'Steampunk',
        'Experimental',
        'steampunk visual language, mechanical ornament, brass-toned material accents, retro-industrial detailing, layered craftsmanship, imaginative engineered finish',
        'a steampunk treatment with mechanical ornament, brass-toned material accents, retro-industrial detailing, and imaginative engineered craftsmanship',
    ),
    createStyle(
        'Graffiti',
        'Experimental',
        'graffiti-inspired image, spray-texture edges, energetic mark-making, layered color pops, hand-made surface treatment, expressive visual rhythm',
        'a graffiti-inspired treatment with spray-texture edges, energetic mark-making, layered color pops, and expressive visual rhythm',
    ),
    createStyle(
        'Neon',
        'Experimental',
        'neon-lit image, glowing line accents, radiant edge light, luminous color bloom, electric contrast, graphic light-driven finish',
        'a neon-lit treatment with glowing line accents, radiant edge light, luminous color bloom, electric contrast, and a graphic light-driven finish',
    ),
] as const;

type StyleRegistryRecord = Record<ActiveImageStyle, StyleRegistryItem>;

export const STYLE_REGISTRY: StyleRegistryRecord = ACTIVE_STYLE_REGISTRY_ITEMS.reduce((record, item) => {
    record[item.id] = item;
    return record;
}, {} as StyleRegistryRecord);

export const STYLE_CATEGORIES: ImageStyleCategory[] = STYLE_CATEGORY_REGISTRY.map((item) => item.id);

export const ACTIVE_STYLE_IDS: ActiveImageStyle[] = ACTIVE_STYLE_REGISTRY_ITEMS.filter(
    (item) => item.status === 'active',
).map((item) => item.id) as ActiveImageStyle[];

export const STYLES_BY_CATEGORY: Record<ImageStyleCategory, ImageStyle[]> = STYLE_CATEGORIES.reduce(
    (record, categoryId) => {
        record[categoryId] =
            categoryId === 'All'
                ? ['None', ...ACTIVE_STYLE_IDS]
                : ACTIVE_STYLE_REGISTRY_ITEMS.filter(
                      (item) => item.categoryId === categoryId && item.status === 'active',
                  ).map((item) => item.id);
        return record;
    },
    {} as Record<ImageStyleCategory, ImageStyle[]>,
);

const findStyleRegistryItem = (value: string): StyleRegistryItem | undefined => {
    if (value in STYLE_REGISTRY) {
        return STYLE_REGISTRY[value as ActiveImageStyle];
    }

    return ACTIVE_STYLE_REGISTRY_ITEMS.find((item) => item.legacyIds.includes(value));
};

export const getStyleRegistryItem = (style: unknown): StyleRegistryItem | undefined => {
    if (typeof style !== 'string') {
        return undefined;
    }

    const normalized = style.trim();
    if (!normalized || normalized === 'None') {
        return undefined;
    }

    return findStyleRegistryItem(normalized);
};

export const normalizeImageStyle = (input: unknown): ImageStyle => {
    if (typeof input !== 'string') {
        return 'None';
    }

    const normalized = input.trim();
    if (!normalized || normalized === 'None') {
        return 'None';
    }

    return findStyleRegistryItem(normalized)?.id ?? 'None';
};

export const getStyleTranslationKey = (style: string): string => {
    if (style === 'None') {
        return 'styleNone';
    }

    const canonicalStyle = getStyleRegistryItem(style)?.id ?? style;
    return `style${sanitizeTranslationKeyPart(canonicalStyle)}`;
};

export const getStyleCategoryTranslationKey = (categoryId: ImageStyleCategory): string => `cat${categoryId}`;

export const getStyleDefaultLabel = (style: string): string => {
    if (style === 'None') {
        return 'None';
    }

    return getStyleRegistryItem(style)?.defaultLabel ?? style;
};

export const getStyleCategoryDefaultLabel = (categoryId: ImageStyleCategory): string =>
    STYLE_CATEGORY_REGISTRY.find((item) => item.id === categoryId)?.defaultLabel ?? categoryId;

export const getStyleIconId = (style: string): string => {
    if (style === 'None') {
        return 'none';
    }

    return getStyleRegistryItem(style)?.iconId ?? 'style-fallback';
};

export const resolveStyleLabel = (style: string, translate: (key: string) => string): string => {
    const translationKey = getStyleTranslationKey(style);
    const translated = translate(translationKey);
    return translated !== translationKey ? translated : getStyleDefaultLabel(style);
};

export const getStylePromptDescriptor = (style: ImageStyle): string => {
    if (style === 'None') {
        return '';
    }

    const registryItem = getStyleRegistryItem(style);
    return registryItem?.promptDescriptor ?? `${getStyleDefaultLabel(style)}, stylized visual treatment`;
};

export const getStyleTransferDescriptor = (style: ImageStyle): string => {
    if (style === 'None') {
        return '';
    }

    const registryItem = getStyleRegistryItem(style);
    return registryItem?.transferDescriptor ?? `a ${getStyleDefaultLabel(style).toLowerCase()} visual treatment`;
};

export const buildStyleTransferPrompt = (style: ImageStyle): string => {
    if (style === 'None') {
        return '';
    }

    return `Transform the visual content of the reference image with ${getStyleTransferDescriptor(style)}. Maintain the original composition while clearly applying the new visual treatment.`;
};