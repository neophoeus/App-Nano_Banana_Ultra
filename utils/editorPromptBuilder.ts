import type { EditorMode } from '../types';

export type EditorRetouchMode = 'mask' | 'doodle';
export type EditorOutpaintIntent = 'reframe-upscale' | 'crop-zoom-extend' | 'pan-extend' | 'balanced-extend';
export type BlankSide = 'left' | 'right' | 'top' | 'bottom';

type DimensionSize = {
    w: number;
    h: number;
};

type OutpaintTransform = {
    x: number;
    y: number;
    scale: number;
};

export interface OutpaintGeometryAnalysis {
    intent: EditorOutpaintIntent;
    coversCanvas: boolean;
    blankSides: BlankSide[];
    blankMargins: Record<BlankSide, number>;
    containScale: number;
    zoomedBeyondFit: boolean;
    offCenter: boolean;
}

interface BuildEditorPromptInput {
    mode: EditorMode;
    retouchMode?: EditorRetouchMode;
    prompt: string;
    visibleTextLabels?: string[];
    outpaintContext?: {
        frameDims: DimensionSize;
        originalDims: DimensionSize;
        imgTransform: OutpaintTransform;
    };
}

interface BuildEditorPromptResult {
    finalPrompt: string;
    finalModeLabel: string;
    outpaintAnalysis?: OutpaintGeometryAnalysis;
}

const BLANK_MARGIN_THRESHOLD = 1;
const POSITION_TOLERANCE = 12;
const ZOOM_INTENT_MULTIPLIER = 1.08;

const normalizeSentence = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) {
        return '';
    }

    return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
};

const joinPromptSegments = (prompt: string, segments: string[]): string =>
    [prompt, ...segments].map(normalizeSentence).filter(Boolean).join(' ');

const formatFrameEdgeList = (sides: BlankSide[], noun: 'side' | 'edge'): string => {
    const sideLabels = sides.map((side) => `the ${side} ${noun}`);

    if (sideLabels.length === 0) {
        return noun === 'edge' ? 'the frame edges' : 'the frame sides';
    }

    if (sideLabels.length === 1) {
        return sideLabels[0];
    }

    if (sideLabels.length === 2) {
        return `${sideLabels[0]} and ${sideLabels[1]}`;
    }

    return `${sideLabels.slice(0, -1).join(', ')}, and ${sideLabels[sideLabels.length - 1]}`;
};

const formatBlankSideList = (blankSides: BlankSide[]): string => {
    if (blankSides.length === 0) {
        return 'the blank margins';
    }

    if (blankSides.length === 1) {
        return `the blank margin on ${formatFrameEdgeList(blankSides, 'side')}`;
    }

    if (blankSides.length === 2) {
        return `the blank margins on ${formatFrameEdgeList(blankSides, 'side')}`;
    }

    return `the blank margins on ${formatFrameEdgeList(blankSides, 'side')}`;
};

const buildTransparentRegionInstruction = (blankSides: BlankSide[]): string => {
    if (blankSides.length === 0) {
        return '';
    }

    return `Regenerate only the transparent or blank regions along ${formatFrameEdgeList(blankSides, 'side')}.`;
};

const WHITE_BLOCK_AVOIDANCE_INSTRUCTION =
    'Treat transparent, blank, or missing regions as areas to fully render with real image content, not as white boxes, white paint, placeholder blocks, or empty matte fill unless the prompt explicitly asks for white shapes or white background elements.';

export const formatVisibleTextInstruction = (labels: string[]): string => {
    if (labels.length === 0) {
        return '';
    }

    const quotedLabels = labels.map((label) => `"${label.replace(/"/g, '\\"')}"`).join(', ');
    return `Render these canvas text labels as visible text in the final image: ${quotedLabels}. Keep the wording exact unless the prompt explicitly asks to change it.`;
};

export const analyzeOutpaintGeometry = ({
    frameDims,
    originalDims,
    imgTransform,
}: {
    frameDims: DimensionSize;
    originalDims: DimensionSize;
    imgTransform: OutpaintTransform;
}): OutpaintGeometryAnalysis => {
    const containScale = Math.min(frameDims.w / originalDims.w, frameDims.h / originalDims.h);
    const cx = frameDims.w / 2;
    const cy = frameDims.h / 2;
    const imgCX = cx + imgTransform.x;
    const imgCY = cy + imgTransform.y;
    const scaledWidth = originalDims.w * imgTransform.scale;
    const scaledHeight = originalDims.h * imgTransform.scale;
    const imgLeft = imgCX - scaledWidth / 2;
    const imgRight = imgCX + scaledWidth / 2;
    const imgTop = imgCY - scaledHeight / 2;
    const imgBottom = imgCY + scaledHeight / 2;

    const blankMargins: Record<BlankSide, number> = {
        left: Math.max(0, imgLeft),
        right: Math.max(0, frameDims.w - imgRight),
        top: Math.max(0, imgTop),
        bottom: Math.max(0, frameDims.h - imgBottom),
    };

    const blankSides = (Object.entries(blankMargins) as [BlankSide, number][])
        .filter(([, margin]) => margin > BLANK_MARGIN_THRESHOLD)
        .map(([side]) => side);

    const coversCanvas = blankSides.length === 0;
    const zoomedBeyondFit = imgTransform.scale > containScale * ZOOM_INTENT_MULTIPLIER;
    const offCenter =
        Math.abs(imgTransform.x) > POSITION_TOLERANCE ||
        Math.abs(imgTransform.y) > POSITION_TOLERANCE ||
        Math.abs(blankMargins.left - blankMargins.right) > POSITION_TOLERANCE ||
        Math.abs(blankMargins.top - blankMargins.bottom) > POSITION_TOLERANCE;

    let intent: EditorOutpaintIntent = 'balanced-extend';
    if (coversCanvas) {
        intent = 'reframe-upscale';
    } else if (zoomedBeyondFit) {
        intent = 'crop-zoom-extend';
    } else {
        const hasAsymmetricBlankSides =
            blankSides.length === 1 ||
            blankSides.includes('left') !== blankSides.includes('right') ||
            blankSides.includes('top') !== blankSides.includes('bottom');

        intent = hasAsymmetricBlankSides || offCenter ? 'pan-extend' : 'balanced-extend';
    }

    return {
        intent,
        coversCanvas,
        blankSides,
        blankMargins,
        containScale,
        zoomedBeyondFit,
        offCenter,
    };
};

export const buildEditorPrompt = ({
    mode,
    retouchMode = 'mask',
    prompt,
    visibleTextLabels = [],
    outpaintContext,
}: BuildEditorPromptInput): BuildEditorPromptResult => {
    const finalModeLabel = mode === 'inpaint' ? 'Inpainting' : 'Outpainting';

    if (mode === 'inpaint') {
        if (retouchMode === 'mask') {
            return {
                finalPrompt: joinPromptSegments(prompt, [
                    'Treat the submitted image as the approved composition',
                    'Preserve all visible unmasked content exactly as shown unless the prompt explicitly asks for broader changes',
                    'Regenerate only the masked region',
                    'Treat the masked cutout as missing image area that must be fully re-rendered, not as a white overlay or placeholder patch',
                    'Blend the repaired region seamlessly into the surrounding image',
                    WHITE_BLOCK_AVOIDANCE_INSTRUCTION,
                    'Maintain or improve clarity, detail, texture, lighting, perspective, and overall fidelity across the final image',
                ]),
                finalModeLabel,
            };
        }

        const visibleTextInstruction = formatVisibleTextInstruction(visibleTextLabels);
        return {
            finalPrompt: joinPromptSegments(prompt, [
                'Treat the submitted image as the approved composition',
                'Use the drawn doodles as spatial guidance for what should change',
                'Preserve visible content outside the intended edited region exactly as shown unless the prompt explicitly asks for broader changes',
                'Render any canvas text as visible text in the final image rather than treating it as hidden instructions',
                'Integrate the changes naturally into the existing scene with consistent lighting, perspective, texture, and composition',
                WHITE_BLOCK_AVOIDANCE_INSTRUCTION,
                'Maintain or improve clarity, detail, texture, lighting, perspective, and overall fidelity across the final image',
                visibleTextInstruction,
            ]),
            finalModeLabel,
        };
    }

    if (!outpaintContext) {
        return {
            finalPrompt: joinPromptSegments(prompt, [
                'Treat the submitted frame as the approved composition',
                'Preserve all currently visible content exactly as shown unless the prompt explicitly asks for broader changes',
                'Regenerate only transparent or blank regions if any remain in the submitted frame; otherwise perform detail recovery and clarity enhancement only',
                WHITE_BLOCK_AVOIDANCE_INSTRUCTION,
                'Do not recenter, zoom out, or recompose the scene unless the prompt explicitly asks for it',
                'Maintain or improve sharpness, detail, texture, lighting, perspective, and overall fidelity across the final submitted frame',
            ]),
            finalModeLabel,
        };
    }

    const outpaintAnalysis = analyzeOutpaintGeometry(outpaintContext);
    const { blankSides, coversCanvas } = outpaintAnalysis;

    return {
        finalPrompt: joinPromptSegments(prompt, [
            'Treat the submitted frame as the approved composition',
            'Preserve all currently visible content exactly as shown unless the prompt explicitly asks for broader changes',
            coversCanvas
                ? 'The submitted frame is already fully covered, so perform detail recovery and clarity enhancement only'
                : buildTransparentRegionInstruction(blankSides),
            WHITE_BLOCK_AVOIDANCE_INSTRUCTION,
            'Do not recenter, zoom out, or recompose the scene unless the prompt explicitly asks for it',
            'Maintain or improve sharpness, detail, texture, lighting, perspective, and overall fidelity across the final submitted frame',
        ]),
        finalModeLabel,
        outpaintAnalysis,
    };
};
