/**
 * 3D Gaussian Splatting (3DGS) Perspective & Novel View Guidance Engine.
 *
 * Implements client-side point cloud generation with depth disparity estimation,
 * 3D Euler rotation (Yaw & Pitch), perspective camera projection with motion parallax,
 * depth sorting (back-to-front painter's algorithm), and canvas rendering with
 * bright green (#00ff00) disocclusion background for AI Studio multimodal inpainting.
 */

export interface GaussianSplat {
    /** Normalized X in [-1, 1] adjusted for aspect ratio */
    x: number;
    /** Normalized Y in [-1, 1] */
    y: number;
    /** Estimated depth disparity Z in [-0.5, 0.5] */
    z: number;
    r: number;
    g: number;
    b: number;
    a: number;
    /** Base splat radius in normalized space */
    radius: number;
}

export interface GaussianPointCloud {
    splats: GaussianSplat[];
    originalWidth: number;
    originalHeight: number;
    aspectRatio: number;
}

export interface RevolveCameraParams {
    /** Horizontal rotation in degrees, [-90, 90] */
    yaw: number;
    /** Vertical pitch in degrees, [-45, 45] */
    pitch: number;
    /** Horizontal pan translation in canvas pixels (default 0) */
    panX?: number;
    /** Vertical pan translation in canvas pixels (default 0) */
    panY?: number;
    /** Zoom factor (default 1.0) */
    zoom?: number;
    /** Field of view in degrees (default 50) */
    fov?: number;
    /** Camera distance along Z axis (default 2.4) */
    distance?: number;
}

export interface ProjectedSplat {
    screenX: number;
    screenY: number;
    screenRadius: number;
    depth: number;
    color: string;
}

export const clampAngle = (angle: number, min: number, max: number): number => {
    return Math.max(min, Math.min(max, angle));
};

export const normalizeAngle = (angle: number): number => {
    let a = angle % 360;
    if (a > 180) a -= 360;
    if (a <= -180) a += 360;
    return a === 0 ? 0 : a;
};

/**
 * Rotates a 3D point using Yaw (around Y axis) then Pitch (around X axis).
 */
export const rotatePoint3D = (
    x: number,
    y: number,
    z: number,
    yawDeg: number,
    pitchDeg: number,
): { x: number; y: number; z: number } => {
    const yawRad = (yawDeg * Math.PI) / 180;
    const pitchRad = (pitchDeg * Math.PI) / 180;

    const cosY = Math.cos(yawRad);
    const sinY = Math.sin(yawRad);
    const cosX = Math.cos(pitchRad);
    const sinX = Math.sin(pitchRad);

    // Rotate around Y (Yaw)
    const x1 = x * cosY + z * sinY;
    const y1 = y;
    const z1 = -x * sinY + z * cosY;

    // Rotate around X (Pitch)
    const x2 = x1;
    const y2 = y1 * cosX - z1 * sinX;
    const z2 = y1 * sinX + z1 * cosX;

    return { x: x2, y: y2, z: z2 };
};

/**
 * Projects a 3D point in camera space to 2D normalized screen coordinates [-1, 1].
 */
export const projectPoint3D = (
    x: number,
    y: number,
    z: number,
    fovDeg: number = 50,
    distance: number = 2.4,
): { screenX: number; screenY: number; scale: number; depth: number } | null => {
    // Camera is at (0, 0, distance), looking towards origin
    const zCam = distance - z;
    if (zCam <= 0.1) {
        return null; // Clip points behind or too close to camera
    }

    const fovRad = (fovDeg * Math.PI) / 180;
    const f = 1.0 / Math.tan(fovRad / 2);

    const projX = (x * f) / zCam;
    const projY = (y * f) / zCam;
    const scale = f / zCam;

    return {
        screenX: projX,
        screenY: projY,
        scale,
        depth: zCam,
    };
};

/**
 * Estimate depth disparity for a pixel using monocular spatial priors:
 * - Vertical perspective gradient: lower pixels are foreground (closer), higher pixels are background (further).
 * - Central focus prior: subjects in center are closer to the lens.
 * - Luminance / contrast: bright or distinct features often pop forward.
 */
export const estimatePixelDepth = (normX: number, normY: number, r: number, g: number, b: number): number => {
    // Luminance [0, 1]
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Vertical gradient [0, 1]: bottom (normY = 1) is closer (+0.5), top is further (-0.5)
    const vertGrad = normY - 0.5;

    // Center distance: center (0.5, 0.5) is closer
    const dx = normX - 0.5;
    const dy = normY - 0.5;
    const distFromCenter = Math.min(1, Math.sqrt(dx * dx + dy * dy) * Math.SQRT2);
    const centerPrior = 0.5 - distFromCenter;

    // Depth disparity in [-0.5, 0.5]
    const z = vertGrad * 0.45 + centerPrior * 0.35 + (lum - 0.5) * 0.2;
    return Math.max(-0.5, Math.min(0.5, z * 0.7));
};

export interface PointCloudGenerationOptions {
    /** Target sample resolution along the longest axis (e.g. 96 for draft, 160 for high, 240 for submission) */
    sampleDensity?: 'draft' | 'high' | 'submission' | number;
}

/**
 * Creates a 3D Gaussian Point Cloud from an HTMLImageElement or Canvas image source.
 */
export const createGaussianPointCloudFromImage = (
    imageSource: CanvasImageSource,
    width: number,
    height: number,
    options: PointCloudGenerationOptions = {},
): GaussianPointCloud => {
    const density = options.sampleDensity ?? 'draft';
    const targetSteps =
        typeof density === 'number' ? density : density === 'submission' ? 240 : density === 'high' ? 160 : 96;

    const aspect = width / Math.max(1, height);
    let sampleW: number;
    let sampleH: number;

    if (aspect >= 1) {
        sampleW = targetSteps;
        sampleH = Math.max(16, Math.round(targetSteps / aspect));
    } else {
        sampleH = targetSteps;
        sampleW = Math.max(16, Math.round(targetSteps * aspect));
    }

    // Use an offscreen canvas to sample image pixels
    const canvas = document.createElement('canvas');
    canvas.width = sampleW;
    canvas.height = sampleH;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) {
        return { splats: [], originalWidth: width, originalHeight: height, aspectRatio: aspect };
    }

    ctx.drawImage(imageSource, 0, 0, sampleW, sampleH);
    const imgData = ctx.getImageData(0, 0, sampleW, sampleH);
    const data = imgData.data;

    const splats: GaussianSplat[] = [];
    const baseRadius = (1.4 / Math.max(sampleW, sampleH)) * 2; // slight overlap to prevent holes

    for (let sy = 0; sy < sampleH; sy++) {
        const normY = (sy + 0.5) / sampleH;
        // World Y centered at 0 in [-1, 1] (flipped for canvas Y)
        const y3D = -(normY * 2 - 1);

        for (let sx = 0; sx < sampleW; sx++) {
            const normX = (sx + 0.5) / sampleW;
            // World X centered at 0 in [-aspect, aspect]
            const x3D = (normX * 2 - 1) * aspect;

            const idx = (sy * sampleW + sx) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const a = data[idx + 3] / 255;

            if (a < 0.05) continue; // skip transparent pixels

            const z3D = estimatePixelDepth(normX, normY, r, g, b);

            splats.push({
                x: x3D,
                y: y3D,
                z: z3D,
                r,
                g,
                b,
                a,
                radius: baseRadius,
            });
        }
    }

    return {
        splats,
        originalWidth: width,
        originalHeight: height,
        aspectRatio: aspect,
    };
};

/**
 * Projects point cloud splats to screen space and depth-sorts back-to-front.
 */
export const projectAndSortSplats = (
    cloud: GaussianPointCloud,
    camera: RevolveCameraParams,
    viewportWidth: number,
    viewportHeight: number,
): ProjectedSplat[] => {
    const { splats } = cloud;
    const yaw = clampAngle(camera.yaw, -90, 90);
    const pitch = clampAngle(camera.pitch, -45, 45);
    const fov = camera.fov ?? 50;
    const distance = camera.distance ?? 2.4;

    const projected: ProjectedSplat[] = [];
    const halfW = viewportWidth / 2;
    const halfH = viewportHeight / 2;
    const minViewportDim = Math.min(halfW, halfH);
    const zoom = Math.max(0.1, camera.zoom ?? 1.0);
    const panX = camera.panX ?? 0;
    const panY = camera.panY ?? 0;

    for (let i = 0; i < splats.length; i++) {
        const s = splats[i];
        const rot = rotatePoint3D(s.x, s.y, s.z, yaw, pitch);
        const proj = projectPoint3D(rot.x, rot.y, rot.z, fov, distance);
        if (!proj) continue;

        const screenX = halfW + panX + proj.screenX * minViewportDim * zoom;
        const screenY = halfH + panY - proj.screenY * minViewportDim * zoom; // Invert Y for canvas space
        const screenRadius = Math.max(1, s.radius * proj.scale * minViewportDim * zoom);

        projected.push({
            screenX,
            screenY,
            screenRadius,
            depth: proj.depth,
            color: `rgba(${s.r},${s.g},${s.b},${s.a})`,
        });
    }

    // Sort back-to-front (largest depth/distance from camera first)
    projected.sort((a, b) => b.depth - a.depth);
    return projected;
};

/**
 * Renders 3D Gaussian Splats onto a canvas with a bright green (#00ff00) disocclusion background.
 */
export const renderGaussianSplatsToCanvas = (
    ctx: CanvasRenderingContext2D,
    cloud: GaussianPointCloud,
    camera: RevolveCameraParams,
    width: number,
    height: number,
    options?: {
        clearColor?: string;
        splatScaleMultiplier?: number;
        renderMode?: 'splat' | 'smooth';
    },
): void => {
    const clearColor = options?.clearColor ?? '#00ff00';
    const scaleMul = options?.splatScaleMultiplier ?? 1.25;
    const renderMode = options?.renderMode ?? 'smooth';

    // Fill background with bright green mask (represents disoccluded areas for Gemini)
    ctx.fillStyle = clearColor;
    ctx.fillRect(0, 0, width, height);

    const projected = projectAndSortSplats(cloud, camera, width, height);

    if (renderMode === 'smooth') {
        // Continuous micro-quads prevent circular bubble disc artifacts and render significantly faster
        for (let i = 0; i < projected.length; i++) {
            const p = projected[i];
            const r = p.screenRadius * scaleMul;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.screenX - r, p.screenY - r, r * 2, r * 2);
        }
    } else {
        for (let i = 0; i < projected.length; i++) {
            const p = projected[i];
            const r = p.screenRadius * scaleMul;

            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.screenX, p.screenY, r, 0, Math.PI * 2);
            ctx.fill();
        }
    }
};
