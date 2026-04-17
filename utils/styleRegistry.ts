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
    promptDirective: string;
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
    promptDirective: string,
    promptDescriptor: string,
    transferDescriptor: string,
    options: Partial<Pick<StyleRegistryItem, 'defaultLabel' | 'iconId' | 'status' | 'legacyIds' | 'notes'>> = {},
): StyleRegistryItem => ({
    id,
    defaultLabel: options.defaultLabel ?? id,
    categoryId,
    iconId: options.iconId ?? createIconId(id),
    promptDirective,
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
        'Render as a camera-native photograph with physically plausible light and true-to-life materials, not an illustrated or painterly image.',
        'photorealistic image, realistic light response, natural surface detail, sharp subject fidelity, grounded photographic finish',
        'a photorealistic treatment with realistic light response, natural surface detail, and grounded photographic fidelity',
    ),
    createStyle(
        'Cinematic',
        'PhotoFilm',
        'Render as a dramatic cinematic still with film-grade lighting, lens-driven depth, and deliberate framing, not a neutral snapshot.',
        'cinematic still, dramatic lighting, controlled depth of field, deliberate framing, graded color contrast, polished image finish',
        'a cinematic-still treatment with dramatic lighting, deliberate framing, controlled depth of field, and graded color contrast',
    ),
    createStyle(
        'Film Noir',
        'PhotoFilm',
        'Render as a hard-shadowed noir still in monochrome with tense atmosphere and stark contrast, not a modern full-color scene.',
        'film noir, monochrome palette, hard contrast lighting, deep shadow shapes, smoky atmosphere, tense dramatic finish',
        'a film-noir treatment with a monochrome palette, hard contrast lighting, deep shadow shapes, and tense dramatic atmosphere',
    ),
    createStyle(
        'Vintage Instant Photo',
        'PhotoFilm',
        'Render as a vintage instant photograph with faded chemistry, softened focus, and nostalgic print character, not a clean digital image.',
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
        'Render as extreme macro photography with razor focus on minute surface detail and shallow depth separation, not a standard wide scene.',
        'macro photography, extreme close focus, magnified surface detail, shallow depth of field, crisp subject isolation',
        'a macro-photography treatment with extreme close focus, magnified surface detail, and crisp subject isolation',
    ),
    createStyle(
        'Long Exposure',
        'PhotoFilm',
        'Render as long-exposure photography with motion-drawn light and temporal blur, not a frozen split-second capture.',
        'long-exposure photography, motion trails, soft temporal blur, flowing light streaks, atmospheric photographic finish',
        'a long-exposure treatment with motion trails, soft temporal blur, and flowing light behavior',
    ),
    createStyle(
        'Double Exposure',
        'PhotoFilm',
        'Render as double-exposure photography with layered transparent imagery and dreamy overlap, not a single-plane photo.',
        'double-exposure photography, layered imagery, transparent overlap, dreamlike blending, surreal photographic finish',
        'a double-exposure treatment with layered imagery, transparent overlap, and dreamlike visual blending',
    ),
    createStyle(
        'Tilt-Shift',
        'PhotoFilm',
        'Render as tilt-shift photography with selective focus and miniature-scale illusion, not natural full-frame depth.',
        'tilt-shift photography, selective focus, miniature-scale depth cues, blurred foreground and background, compressed photographic scene',
        'a tilt-shift treatment with selective focus, miniature-scale depth cues, and compressed scene perspective',
    ),
    createStyle(
        'Knolling',
        'PhotoFilm',
        'Render as precise knolling photography with overhead order, measured spacing, and object-grid discipline, not a casual still life.',
        'knolling photography, flat-lay arrangement, precise spacing, orderly composition, clean overhead presentation',
        'a knolling treatment with flat-lay arrangement, precise spacing, and clean overhead presentation',
    ),

    createStyle(
        'Oil Painting',
        'PaintDrawing',
        'Render as a rich oil painting with dense pigment, tactile brushwork, and canvas depth, not a smooth digital illustration.',
        'oil painting, visible brush texture, layered pigment, rich color depth, canvas-like painted finish',
        'an oil-painting treatment with visible brush texture, layered pigment, and rich painted surface depth',
    ),
    createStyle(
        'Watercolor',
        'PaintDrawing',
        'Render as watercolor on paper with translucent washes, soft blooms, and delicate edges, not opaque paint.',
        'watercolor painting, translucent washes, soft color diffusion, paper grain, delicate painted finish',
        'a watercolor treatment with translucent washes, soft color diffusion, and paper-grain texture',
    ),
    createStyle(
        'Pencil Sketch',
        'PaintDrawing',
        'Render as a graphite pencil sketch with drawn construction and tonal hand shading, not inked line art.',
        'pencil sketch, graphite linework, tonal shading, hand-drawn structure, sketchbook finish',
        'a pencil-sketch treatment with graphite linework, tonal shading, and hand-drawn structure',
    ),
    createStyle(
        'Ukiyo-e',
        'PaintDrawing',
        'Render as a flat woodblock-inspired ukiyo-e print with bold contour rhythm and compressed depth, not western painterly modeling.',
        'ukiyo-e print, flat layered color, bold contour lines, decorative patterning, compressed depth, woodblock-inspired finish',
        'an ukiyo-e treatment with flat layered color, bold contour lines, decorative patterning, and compressed depth',
    ),
    createStyle(
        'Ink Wash',
        'PaintDrawing',
        'Render as an ink wash painting with fluid tonal gradation and restrained negative space, not full-color illustration.',
        'ink wash painting, fluid brushwork, tonal ink gradients, open negative space, restrained painted finish',
        'an ink-wash treatment with fluid brushwork, tonal ink gradients, and open negative space',
    ),
    createStyle(
        'Impressionism',
        'PaintDrawing',
        'Render as an impressionist painting driven by broken color and luminous fleeting light, not sharply finished realism.',
        'impressionist painting, broken color strokes, luminous atmosphere, softened edges, fleeting light, painterly surface finish',
        'an impressionist treatment with broken color strokes, luminous atmosphere, softened edges, and fleeting light',
    ),
    createStyle(
        'Pastel',
        'PaintDrawing',
        'Render as a soft pastel artwork with powdery pigment, muted edges, and paper tooth, not glossy paint.',
        'pastel drawing, powdery pigment texture, softened edges, muted layered color, paper-surface finish',
        'a pastel treatment with powdery pigment texture, softened edges, and muted layered color',
    ),
    createStyle(
        'Baroque',
        'PaintDrawing',
        'Render as a grand baroque painting with theatrical light falloff, ornate detail, and dramatic visual weight, not minimal modern styling.',
        'baroque painting, dramatic light falloff, rich shadow depth, ornate detailing, grand composition, theatrical painted finish',
        'a baroque treatment with dramatic light falloff, rich shadow depth, ornate detailing, and grand composition',
    ),

    createStyle(
        'Fantasy Art',
        'Illustration',
        'Render as high-atmosphere fantasy illustration with mythic scale, dramatic mood, and embellished materials, not straightforward realism.',
        'fantasy illustration, heightened atmosphere, stylized material richness, dramatic scale cues, evocative mood, imaginative illustrative finish',
        'a fantasy-illustration treatment with heightened atmosphere, stylized material richness, dramatic scale cues, evocative mood, and an imaginative illustrative finish',
    ),
    createStyle(
        'Doodle',
        'Illustration',
        'Render as playful doodle illustration with spontaneous marks and loose hand-drawn energy, not polished commercial art.',
        'doodle illustration, spontaneous hand-drawn marks, loose playful rhythm, simplified shapes, casual line flow, graphic sketch finish',
        'a doodle-illustration treatment with spontaneous hand-drawn marks, loose playful rhythm, and casual line flow',
    ),
    createStyle(
        'Digital Illustration',
        'Illustration',
        'Render as a polished digital illustration with crisp painted forms and refined line control, not loose painterly brushwork or flat editorial graphics.',
        'digital illustration, clean painted shapes, refined linework, controlled shading, layered color, polished illustrative finish',
        'a digital-illustration treatment with clean painted shapes, refined linework, controlled shading, and a polished illustrative finish',
    ),
    createStyle(
        'Painterly Illustration',
        'Illustration',
        'Render as a hand-painted illustration with visible brush motion, soft edges, and expressive paint massing, not clean hard-edged digital rendering.',
        'painterly illustration, visible brush texture, expressive strokes, softened edges, layered color masses, hand-painted finish',
        'a painterly-illustration treatment with visible brush texture, expressive strokes, softened edges, and a hand-painted finish',
    ),
    createStyle(
        'Editorial Illustration',
        'Illustration',
        'Render as a concept-driven editorial illustration with simplified forms and graphic hierarchy, not lush fantasy painting or comic action art.',
        'editorial illustration, concept-driven composition, simplified forms, clear focal hierarchy, graphic clarity, polished illustrative finish',
        'an editorial-illustration treatment with concept-driven composition, simplified forms, clear focal hierarchy, and graphic clarity',
    ),
    createStyle(
        'Concept Art',
        'Illustration',
        'Render as production-style concept art focused on design readability, silhouette clarity, and atmosphere for worldbuilding, not a finished storybook piece.',
        'concept art, design-forward silhouettes, readable forms, material indication, atmospheric lighting, development-painting finish',
        'a concept-art treatment with design-forward silhouettes, readable forms, material indication, atmospheric lighting, and a development-painting finish',
    ),
    createStyle(
        'Line Art',
        'Illustration',
        'Render as pure line art with contour clarity, varied line weight, and minimal fill, not shaded full-render illustration.',
        'line art, clean contours, varied line weight, open negative space, minimal fill, crisp graphic structure',
        'a line-art treatment with clean contours, varied line weight, open negative space, and crisp graphic structure',
    ),
    createStyle(
        'Storybook Illustration',
        'Illustration',
        'Render as a warm narrative storybook illustration with inviting texture, expressive character appeal, and gentle color harmony, not slick graphic design.',
        'storybook illustration, narrative composition, gentle textures, warm color harmony, expressive posing, inviting illustrated finish',
        'a storybook-illustration treatment with narrative composition, gentle textures, warm color harmony, expressive posing, and an inviting illustrated finish',
    ),

    createStyle(
        'Anime',
        'ComicsAnime',
        'Render as polished anime artwork with clean lines, cel-style shading, and vibrant shape language, not monochrome manga print.',
        'anime illustration, clean linework, cel-style shading, expressive shapes, vibrant accent color, polished 2d finish',
        'an anime-style treatment with clean linework, cel-style shading, expressive shapes, and a polished 2d finish',
    ),
    createStyle(
        'Manga',
        'ComicsAnime',
        'Render as manga artwork with black-and-white ink contrast, print-comic energy, and expressive line emphasis, not full-color anime polish.',
        'manga illustration, black-and-white ink work, graphic contrast, expressive line emphasis, print-comic finish',
        'a manga-style treatment with black-and-white ink work, graphic contrast, expressive line emphasis, and a print-comic finish',
    ),
    createStyle(
        'Chibi',
        'ComicsAnime',
        'Render as chibi artwork with intentionally tiny proportions, rounded forms, and cute playful appeal, not standard hero proportions.',
        'chibi illustration, simplified small-body proportions, rounded forms, cute expression emphasis, playful graphic finish',
        'a chibi-style treatment with simplified small-body proportions, rounded forms, cute expression emphasis, and a playful graphic finish',
    ),
    createStyle(
        'Comic Illustration',
        'ComicsAnime',
        'Render as western comic illustration with bold contours, graphic shading, and dynamic panel-ready energy, not anime cel animation or flat editorial art.',
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
        'Render as crisp vector art with geometric simplification, even color fields, and scalable graphic precision, not textured painting.',
        'vector-style illustration, crisp edges, simplified geometric forms, even color regions, clean visual hierarchy, scalable graphic finish',
        'a vector-style treatment with crisp edges, simplified geometric forms, even color regions, and clean visual hierarchy',
    ),
    createStyle(
        'Blueprint',
        'GraphicDesign',
        'Render as technical blueprint graphics with schematic line discipline and plan-drawing clarity, not decorative illustration.',
        'blueprint graphic, technical linework, schematic structure, measurement-like detailing, cyan technical finish',
        'a blueprint-style treatment with technical linework, schematic structure, and cyan technical presentation',
    ),
    createStyle(
        'Sticker',
        'GraphicDesign',
        'Render as a die-cut sticker graphic with isolated silhouette, bold readability, and playful polished simplicity, not a full scenic composition.',
        'sticker illustration, isolated shape, die-cut border feel, graphic simplicity, playful polished finish',
        'a sticker-style treatment with isolated shapes, die-cut border feel, and playful polished graphic simplicity',
    ),
    createStyle(
        'Flat Design',
        'GraphicDesign',
        'Render as flat design with minimal depth, simple blocks, and tidy modern hierarchy, not material-rich or textured rendering.',
        'flat design, minimal depth, clear shape language, simple color blocks, tidy hierarchy, modern graphic finish',
        'a flat-design treatment with minimal depth, clear shape language, simple color blocks, and tidy visual hierarchy',
    ),
    createStyle(
        'Art Nouveau',
        'GraphicDesign',
        'Render as art nouveau with flowing organic ornament, decorative framing, and elegant floral rhythm, not angular modernist geometry.',
        'art nouveau, flowing organic curves, ornamental framing, floral rhythm, elegant silhouette, decorative illustrated finish',
        'an art-nouveau treatment with flowing organic curves, ornamental framing, floral rhythm, and elegant silhouettes',
    ),
    createStyle(
        'Art Deco',
        'GraphicDesign',
        'Render as art deco with streamlined symmetry, stepped geometry, and luxurious ornamental structure, not organic ornamental curves.',
        'art deco, geometric ornament, symmetrical structure, metallic-accent contrast, streamlined decorative finish',
        'an art-deco treatment with geometric ornament, symmetrical structure, metallic-accent contrast, and a streamlined decorative finish',
    ),

    createStyle(
        '3D Render',
        'ThreeDPixel',
        'Render as polished 3d imagery with dimensional materials, believable light interaction, and modeled form clarity, not flat illustration.',
        '3d rendered image, dimensional forms, defined materials, realistic light interaction, clean surface detail, polished rendered finish',
        'a 3d-rendered treatment with dimensional forms, defined materials, realistic light interaction, and a polished rendered finish',
    ),
    createStyle(
        'Pixel Art',
        'ThreeDPixel',
        'Render as intentional pixel art with visible grid logic, limited palette control, and retro low-resolution charm, not smooth high-resolution rendering.',
        'pixel art, grid-based forms, limited palette blocks, crisp edges, retro graphic finish',
        'a pixel-art treatment with grid-based forms, limited palette blocks, crisp edges, and a retro graphic finish',
    ),
    createStyle(
        'Low Poly',
        'ThreeDPixel',
        'Render as low-poly 3d with faceted geometry and planar shading, not dense high-detail modeling.',
        'low-poly rendering, faceted shapes, simplified geometry, planar shading, stylized 3d finish',
        'a low-poly treatment with faceted shapes, simplified geometry, planar shading, and a stylized 3d finish',
    ),
    createStyle(
        'Isometric',
        'ThreeDPixel',
        'Render as isometric illustration with controlled angled space and miniature scene readability, not perspective-heavy cinematic depth.',
        'isometric illustration, angled orthographic space, clean geometry, miniature scene logic, precise structured finish',
        'an isometric treatment with angled orthographic space, clean geometry, miniature scene logic, and precise structure',
    ),
    createStyle(
        'Miniature',
        'ThreeDPixel',
        'Render as a tiny diorama-like world with condensed scale cues and tactile small-object detail, not life-size staging.',
        'miniature-scale scene, condensed spatial layout, tactile tiny details, diorama-like structure, selective depth cues, small-world visual finish',
        'a miniature-scale treatment with condensed spatial layout, tactile tiny details, diorama-like structure, and selective depth cues',
    ),

    createStyle(
        'Mosaic',
        'CraftMaterial',
        'Render as assembled mosaic artwork with tiled fragments, segmented color fields, and crafted surface rhythm, not painted blends.',
        'mosaic artwork, tiled segmentation, assembled color fragments, patterned surface rhythm, tactile crafted finish',
        'a mosaic treatment with tiled segmentation, assembled color fragments, patterned surface rhythm, and tactile crafted texture',
    ),
    createStyle(
        'Stained Glass',
        'CraftMaterial',
        'Render as stained glass with luminous translucent panes and dark leading lines, not flat printed color.',
        'stained-glass artwork, translucent color panels, bold leading lines, luminous segmented surface, decorative crafted finish',
        'a stained-glass treatment with translucent color panels, bold leading lines, and a luminous segmented surface',
    ),
    createStyle(
        'Claymation',
        'CraftMaterial',
        'Render as handmade claymation with molded forms, soft fingerprints, and stop-motion charm, not clean cg plastic.',
        'claymation look, molded forms, soft handmade texture, tactile volume, stop-motion crafted finish',
        'a claymation treatment with molded forms, soft handmade texture, tactile volume, and a stop-motion crafted finish',
    ),
    createStyle(
        'Origami',
        'CraftMaterial',
        'Render as folded origami with crisp paper creases and constructed planes, not sculpted solid mass.',
        'origami sculpture, folded paper planes, crisp creases, geometric paper structure, handcrafted finish',
        'an origami treatment with folded paper planes, crisp creases, geometric paper structure, and handcrafted finish',
    ),
    createStyle(
        'Knitted',
        'CraftMaterial',
        'Render as knitted textile with looped yarn structure, stitched patterning, and soft fabric body, not smooth illustration.',
        'knitted textile, looped yarn texture, stitched pattern rhythm, soft fiber surface, handmade fabric finish',
        'a knitted-textile treatment with looped yarn texture, stitched pattern rhythm, and soft fiber surface detail',
    ),
    createStyle(
        'Paper Cutout',
        'CraftMaterial',
        'Render as layered paper cutout collage with stacked planes, cut edges, and cast-paper depth, not painted gradients.',
        'paper cutout artwork, layered paper planes, crisp silhouette edges, shadowed depth, handcrafted collage finish',
        'a paper-cutout treatment with layered paper planes, crisp silhouette edges, shadowed depth, and handcrafted collage texture',
    ),
    createStyle(
        'Wood Carving',
        'CraftMaterial',
        'Render as carved wood relief with cut grooves, grain visibility, and handcrafted sculpted depth, not polished resin or stone.',
        'wood-carved artwork, carved grooves, visible grain, relief depth, handcrafted material finish',
        'a wood-carved treatment with carved grooves, visible grain, relief depth, and handcrafted material texture',
    ),
    createStyle(
        'Porcelain',
        'CraftMaterial',
        'Render as refined porcelain with glazed ceramic sheen, delicate ornament, and brittle elegant finish, not rough clay or matte plaster.',
        'porcelain surface, smooth glaze, delicate ceramic sheen, refined ornament detail, polished crafted finish',
        'a porcelain treatment with smooth glaze, delicate ceramic sheen, refined ornament detail, and a polished crafted finish',
    ),
    createStyle(
        'Embroidery',
        'CraftMaterial',
        'Render as embroidery with stitched thread paths, textile backing, and needlework relief, not printed pattern.',
        'embroidery artwork, stitched thread texture, layered needlework, textile surface pattern, handmade crafted finish',
        'an embroidery treatment with stitched thread texture, layered needlework, textile surface pattern, and a handmade crafted finish',
    ),
    createStyle(
        'Crystal',
        'CraftMaterial',
        'Render as faceted crystal with prismatic refraction, sharp edges, and luminous transparency, not opaque glass or polished metal.',
        'crystal-like surface, faceted transparency, prismatic light behavior, sharp reflective edges, luminous material finish',
        'a crystal-like treatment with faceted transparency, prismatic light behavior, sharp reflective edges, and luminous material finish',
    ),

    createStyle(
        'Cyberpunk',
        'Experimental',
        'Render as cyberpunk with high-tech urban tension, neon circuitry glow, and synthetic material contrast, not generic futuristic minimalism.',
        'cyberpunk visual language, luminous neon accents, synthetic material contrast, layered technological detail, reflective surfaces, high-tech graphic finish',
        'a cyberpunk treatment with luminous neon accents, synthetic material contrast, layered technological detail, reflective surfaces, and a high-tech graphic finish',
    ),
    createStyle(
        'Vaporwave',
        'Experimental',
        'Render as vaporwave with dreamy retro-digital nostalgia, pastel neon haze, and detached surreal calm, not hard-edged cyberpunk grit.',
        'vaporwave aesthetic, nostalgic digital glow, pastel-neon palette, surreal graphic calm, retro-futurist mood, synthetic visual finish',
        'a vaporwave treatment with nostalgic digital glow, a pastel-neon palette, surreal graphic calm, and retro-futurist mood',
    ),
    createStyle(
        'Glitch Art',
        'Experimental',
        'Render as glitch art with broken signal behavior, channel offsets, and unstable digital fragmentation, not clean graphic symmetry.',
        'glitch art, digital disruption, fragmented signal patterns, color channel offsets, unstable electronic finish',
        'a glitch-art treatment with digital disruption, fragmented signal patterns, color channel offsets, and an unstable electronic finish',
    ),
    createStyle(
        'Surrealism',
        'Experimental',
        'Render as surrealism with impossible juxtapositions, dream logic, and uncanny symbolic space, not straightforward fantasy adventure art.',
        'surrealist image, unexpected juxtapositions, dreamlike logic, altered scale relationships, symbolic atmosphere, uncanny visual finish',
        'a surrealist treatment with unexpected juxtapositions, dreamlike logic, altered scale relationships, and uncanny symbolic atmosphere',
    ),
    createStyle(
        'Pop Art',
        'Experimental',
        'Render as pop art with bold flat color, graphic repetition, and poster punch, not painterly or photoreal realism.',
        'pop art, bold flat color, graphic repetition, sharp contrast, poster-like punch, playful mass-culture finish',
        'a pop-art treatment with bold flat color, graphic repetition, sharp contrast, and poster-like visual punch',
    ),
    createStyle(
        'Psychedelic',
        'Experimental',
        'Render as psychedelic imagery with hallucinatory color flow, optical distortion, and heightened sensory rhythm, not orderly graphic design.',
        'psychedelic image treatment, fluid color transitions, optical rhythm, layered pattern distortion, heightened visual energy, altered-perception finish',
        'a psychedelic treatment with fluid color transitions, optical rhythm, layered pattern distortion, and heightened visual energy',
    ),
    createStyle(
        'Gothic',
        'Experimental',
        'Render as gothic visual art with dark ornament, pointed forms, somber grandeur, and cathedral-like atmosphere, not sleek noir minimalism.',
        'gothic visual style, ornate structure, dark tonal richness, pointed silhouettes, somber atmosphere, dramatic decorative finish',
        'a gothic treatment with ornate structure, dark tonal richness, pointed silhouettes, somber atmosphere, and dramatic decorative finish',
    ),
    createStyle(
        'Steampunk',
        'Experimental',
        'Render as steampunk with retro-industrial engineering, brass mechanics, and handcrafted speculative machinery, not sleek cybernetic futurism.',
        'steampunk visual language, mechanical ornament, brass-toned material accents, retro-industrial detailing, layered craftsmanship, imaginative engineered finish',
        'a steampunk treatment with mechanical ornament, brass-toned material accents, retro-industrial detailing, and imaginative engineered craftsmanship',
    ),
    createStyle(
        'Graffiti',
        'Experimental',
        'Render as graffiti with aerosol texture, street-mark energy, layered tags, and raw expressive rhythm, not neat vector polish.',
        'graffiti-inspired image, spray-texture edges, energetic mark-making, layered color pops, hand-made surface treatment, expressive visual rhythm',
        'a graffiti-inspired treatment with spray-texture edges, energetic mark-making, layered color pops, and expressive visual rhythm',
    ),
    createStyle(
        'Neon',
        'Experimental',
        'Render as neon-lit art driven by glowing tube-like edges, radiant bloom, and electric contrast, not daylight or matte ambient lighting.',
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

export const getStylePromptDirective = (style: ImageStyle): string => {
    if (style === 'None') {
        return '';
    }

    const registryItem = getStyleRegistryItem(style);
    return registryItem?.promptDirective ?? `Render with a ${getStyleDefaultLabel(style).toLowerCase()}-led visual treatment.`;
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

    return [
        `Selected style: ${getStyleDefaultLabel(style)}.`,
        `Style directive: ${getStylePromptDirective(style)}`,
        `Style anchors: ${getStylePromptDescriptor(style)}.`,
        'Apply this selected style to the reference image while preserving the original composition, subject identity, and spatial layout.',
    ].join('\n');
};