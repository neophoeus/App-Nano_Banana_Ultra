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
    rotation?: number;
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
    revolveContext?: {
        yaw: number;
        pitch: number;
        panX?: number;
        panY?: number;
        zoom?: number;
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

    const rotation = imgTransform.rotation ?? 0;
    const normalizedRot = ((rotation % 360) + 360) % 360;
    const isOrthogonal =
        normalizedRot === 0 || normalizedRot === 180 || (normalizedRot % 90 === 0 && originalDims.w === originalDims.h);
    const coversCanvas = blankSides.length === 0 && isOrthogonal;
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
    revolveContext,
}: BuildEditorPromptInput): BuildEditorPromptResult => {
    const finalModeLabel = mode === 'inpaint' ? 'Inpainting' : mode === 'revolve' ? 'Revolving' : 'Outpainting';

    if (mode === 'revolve') {
        const yaw = revolveContext?.yaw ?? 0;
        const pitch = revolveContext?.pitch ?? 0;
        const panX = revolveContext?.panX ?? 0;
        const panY = revolveContext?.panY ?? 0;
        const zoom = revolveContext?.zoom ?? 1;
        const yawDesc =
            yaw > 0
                ? `rotated ${Math.abs(yaw)}° to the right`
                : yaw < 0
                  ? `rotated ${Math.abs(yaw)}° to the left`
                  : 'centered horizontally';
        const pitchDesc =
            pitch > 0
                ? `elevated ${Math.abs(pitch)}° upwards (high angle)`
                : pitch < 0
                  ? `lowered ${Math.abs(pitch)}° downwards (low angle)`
                  : 'eye-level';

        const framingSegments: string[] = [];
        if (Math.abs(zoom - 1.0) > 0.05) {
            framingSegments.push(
                zoom > 1
                    ? `Camera zoom-in framing factor ${zoom.toFixed(2)}x (closer view).`
                    : `Camera zoom-out framing factor ${zoom.toFixed(2)}x (wider field).`,
            );
        }
        if (Math.abs(panX) > 2 || Math.abs(panY) > 2) {
            framingSegments.push(`Camera spatial offset / translation applied for reframing.`);
        }

        return {
            finalPrompt: joinPromptSegments(prompt, [
                `Synthesize a novel 3D spatial viewpoint of the scene with camera rotation: yaw=${yaw}° (${yawDesc}), pitch=${pitch}° (${pitchDesc}).`,
                ...framingSegments,
                'The input image provides 3D Gaussian splatting spatial guidance with 3D parallax perspective.',
                'The bright green (R:0, G:255, B:0) background areas represent disocclusion gaps created by the viewpoint change that must be photorealistically inpainted and completed with natural scene environment, geometry, consistent lighting, and perspective.',
                'Preserve the identity, textures, structure, and artistic style of the subject and scene from the original image.',
                'Blend repainted disocclusion areas seamlessly and ensure no green pixels remain.',
            ]),
            finalModeLabel,
        };
    }

    if (mode === 'inpaint') {
        if (retouchMode === 'mask') {
            return {
                finalPrompt: joinPromptSegments(prompt, [
                    'The bright green (R:0, G:255, B:0) areas represent the region to repaint based on the prompt.',
                    'Preserve everything outside the green areas exactly as shown.',
                    'Blend the repainted regions seamlessly and ensure no green pixels remain.',
                ]),
                finalModeLabel,
            };
        }

        const visibleTextInstruction = formatVisibleTextInstruction(visibleTextLabels);
        return {
            finalPrompt: joinPromptSegments(prompt, [
                'Use the doodles as spatial guidance for the edit.',
                'Preserve content outside the edited areas exactly as shown.',
                'Integrate changes naturally with consistent lighting, perspective, and texture.',
                visibleTextInstruction,
            ]),
            finalModeLabel,
        };
    }

    if (!outpaintContext) {
        return {
            finalPrompt: joinPromptSegments(prompt, [
                'The bright green (R:0, G:255, B:0) areas represent the region to repaint based on the prompt.',
                'Preserve everything outside the green areas exactly as shown.',
                'Blend the repainted regions seamlessly and ensure no green pixels remain.',
            ]),
            finalModeLabel,
        };
    }

    const outpaintAnalysis = analyzeOutpaintGeometry(outpaintContext);
    const { coversCanvas } = outpaintAnalysis;

    return {
        finalPrompt: joinPromptSegments(prompt, [
            coversCanvas
                ? 'The frame is already fully covered. Perform detail recovery and clarity enhancement only.'
                : 'The bright green (R:0, G:255, B:0) areas represent the region to repaint based on the prompt. Preserve everything outside the green areas exactly as shown. Blend the repainted regions seamlessly and ensure no green pixels remain.',
        ]),
        finalModeLabel,
        outpaintAnalysis,
    };
};
