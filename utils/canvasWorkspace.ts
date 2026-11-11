import { AspectRatio, ImageSize } from '../types';

const IMAGE_SIZE_MAX_DIMENSIONS: Record<ImageSize, number> = {
    '512': 512,
    '512px': 512,
    '1K': 1024,
    '2K': 2048,
    '4K': 4096,
};

export interface WorkspacePoint {
    x: number;
    y: number;
}

export interface WorkspaceStroke {
    points: WorkspacePoint[];
    brushSize: number;
    color: string;
}

export interface WorkspaceTextLabel {
    x: number;
    y: number;
    text: string;
    color: string;
}

export interface WorkspaceViewport {
    x: number;
    y: number;
    zoom: number;
}

export interface WorkspaceRect {
    left: number;
    top: number;
    width: number;
    height: number;
}

export interface WorkspaceSafeArea {
    top: number;
    bottom: number;
    left: number;
    right: number;
}

export interface WorkspaceHistoryState<T> {
    past: T[];
    present: T;
    future: T[];
}

export const findClosestAspectRatio = (
    width: number,
    height: number,
    ratios: Array<{ value: string }>,
): AspectRatio => {
    const numericRatio = width / height;
    let bestRatio = '1:1';
    let smallestDiff = Infinity;

    ratios.forEach((ratio) => {
        const [ratioWidth, ratioHeight] = ratio.value.split(':').map(Number);
        const diff = Math.abs(numericRatio - ratioWidth / ratioHeight);
        if (diff < smallestDiff) {
            smallestDiff = diff;
            bestRatio = ratio.value;
        }
    });

    return bestRatio as AspectRatio;
};

export const findClosestImageSize = (width: number, height: number): ImageSize => {
    const longestEdge = Math.max(width, height);
    let bestSize: ImageSize = '1K';
    let smallestDiff = Infinity;

    Object.entries(IMAGE_SIZE_MAX_DIMENSIONS).forEach(([size, maxDimension]) => {
        const diff = Math.abs(longestEdge - maxDimension);
        if (diff < smallestDiff) {
            smallestDiff = diff;
            bestSize = size as ImageSize;
        }
    });

    return bestSize;
};

export const fitImageToViewport = (
    contentWidth: number,
    contentHeight: number,
    viewportWidth: number,
    viewportHeight: number,
    padding = 0.8,
) => ({
    x: 0,
    y: 0,
    zoom: Math.min((viewportWidth * padding) / contentWidth, (viewportHeight * padding) / contentHeight),
});

export const fitWorkspaceToViewport = (
    contentWidth: number,
    contentHeight: number,
    viewportWidth: number,
    viewportHeight: number,
    safeArea: WorkspaceSafeArea,
    padding = 1,
): WorkspaceViewport => {
    const availableWidth = viewportWidth - (safeArea.left + safeArea.right);
    const availableHeight = viewportHeight - (safeArea.top + safeArea.bottom);

    if (availableWidth <= 0 || availableHeight <= 0) {
        return { x: 0, y: 0, zoom: 1 };
    }

    const zoom = Math.min((availableWidth * padding) / contentWidth, (availableHeight * padding) / contentHeight);
    const screenCenterX = viewportWidth / 2;
    const screenCenterY = viewportHeight / 2;
    const safeCenterX = safeArea.left + availableWidth / 2;
    const safeCenterY = safeArea.top + availableHeight / 2;

    return {
        x: safeCenterX - screenCenterX,
        y: safeCenterY - screenCenterY,
        zoom,
    };
};

export const screenPointToWorkspacePoint = (
    screenX: number,
    screenY: number,
    bounds: WorkspaceRect,
    viewport: WorkspaceViewport,
): WorkspacePoint => {
    const relX = screenX - bounds.left - bounds.width / 2;
    const relY = screenY - bounds.top - bounds.height / 2;

    return {
        x: (relX - viewport.x) / viewport.zoom,
        y: (relY - viewport.y) / viewport.zoom,
    };
};

export const applyPanDelta = (viewport: WorkspaceViewport, deltaX: number, deltaY: number): WorkspaceViewport => ({
    ...viewport,
    x: viewport.x + deltaX,
    y: viewport.y + deltaY,
});

export const clampZoom = (zoom: number, min = 0.05, max = 5) => Math.min(Math.max(min, zoom), max);

export const applyWheelZoomDelta = (currentZoom: number, deltaY: number, sensitivity = 0.001, min = 0.05, max = 5) => {
    const delta = -deltaY * sensitivity;
    return clampZoom(currentZoom + delta, min, max);
};

export const appendPointToLatestStroke = (paths: WorkspaceStroke[], point: WorkspacePoint): WorkspaceStroke[] => {
    const last = paths[paths.length - 1];
    if (!last) {
        return paths;
    }

    return [
        ...paths.slice(0, -1),
        {
            ...last,
            points: [...last.points, point],
        },
    ];
};

export const drawStrokesToCanvas = (
    ctx: CanvasRenderingContext2D,
    strokes: WorkspaceStroke[],
    options?: { strokeStyle?: string },
) => {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    strokes.forEach((stroke) => {
        if (stroke.points.length === 0) {
            return;
        }

        ctx.lineWidth = stroke.brushSize;
        ctx.strokeStyle = options?.strokeStyle || stroke.color;
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        stroke.points.forEach((point) => ctx.lineTo(point.x, point.y));
        ctx.stroke();
    });
};

export const drawTextLabelsToCanvas = (
    ctx: CanvasRenderingContext2D,
    labels: WorkspaceTextLabel[],
    options?: {
        font?: string;
        textAlign?: CanvasTextAlign;
        textBaseline?: CanvasTextBaseline;
    },
) => {
    ctx.font = options?.font || ctx.font;
    ctx.textAlign = options?.textAlign || 'left';
    ctx.textBaseline = options?.textBaseline || 'middle';

    labels.forEach((label) => {
        ctx.fillStyle = label.color;
        ctx.fillText(label.text, label.x, label.y);
    });
};

export const renderWorkspaceCanvas = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    strokes: WorkspaceStroke[],
    options?: { backgroundColor?: string; strokeStyle?: string },
) => {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = options?.backgroundColor || '#ffffff';
    ctx.fillRect(0, 0, width, height);
    drawStrokesToCanvas(ctx, strokes, options?.strokeStyle ? { strokeStyle: options.strokeStyle } : undefined);
};

export const exportCanvasWithBackground = (canvas: HTMLCanvasElement, backgroundColor = '#ffffff') => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;

    const tempContext = tempCanvas.getContext('2d');
    if (!tempContext) {
        return canvas.toDataURL('image/png');
    }

    tempContext.fillStyle = backgroundColor;
    tempContext.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    tempContext.drawImage(canvas, 0, 0);
    return tempCanvas.toDataURL('image/png');
};

export const canvasHasVisibleContent = (canvas: HTMLCanvasElement, tolerance = 250) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        return false;
    }

    try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let index = 0; index < data.length; index += 4) {
            const red = data[index];
            const green = data[index + 1];
            const blue = data[index + 2];
            const alpha = data[index + 3];

            if (alpha < 10) {
                continue;
            }

            if (red < tolerance || green < tolerance || blue < tolerance) {
                return true;
            }
        }

        return false;
    } catch {
        return true;
    }
};

export const buildCanvasDimensionsForRatio = (ratio: AspectRatio, base = 1024) => {
    const [ratioWidth, ratioHeight] = ratio.split(':').map(Number);
    const numericRatio = ratioWidth / ratioHeight;

    if (numericRatio > 1) {
        return { w: base, h: Math.round(base / numericRatio) };
    }

    return { w: Math.round(base * numericRatio), h: base };
};

export const createHistoryState = <T>(initialPresent: T): WorkspaceHistoryState<T> => ({
    past: [],
    present: initialPresent,
    future: [],
});

export const replaceHistoryPresent = <T>(
    state: WorkspaceHistoryState<T>,
    nextPresent: T,
): WorkspaceHistoryState<T> => ({
    ...state,
    present: nextPresent,
});

export const commitHistoryPresent = <T>(
    state: WorkspaceHistoryState<T>,
    nextPresent: T,
    limit = 20,
): WorkspaceHistoryState<T> => {
    const nextPast = [...state.past, state.present];
    const trimmedPast = nextPast.length > limit ? nextPast.slice(nextPast.length - limit) : nextPast;

    return {
        past: trimmedPast,
        present: nextPresent,
        future: [],
    };
};

export const undoHistoryState = <T>(state: WorkspaceHistoryState<T>): WorkspaceHistoryState<T> => {
    if (state.past.length === 0) {
        return state;
    }

    const previousPresent = state.past[state.past.length - 1];
    return {
        past: state.past.slice(0, -1),
        present: previousPresent,
        future: [state.present, ...state.future],
    };
};

export const redoHistoryState = <T>(state: WorkspaceHistoryState<T>): WorkspaceHistoryState<T> => {
    if (state.future.length === 0) {
        return state;
    }

    const [nextPresent, ...remainingFuture] = state.future;
    return {
        past: [...state.past, state.present],
        present: nextPresent,
        future: remainingFuture,
    };
};

export const resetHistoryState = <T>(initialPresent: T): WorkspaceHistoryState<T> => createHistoryState(initialPresent);

export const canUndoHistoryState = <T>(state: WorkspaceHistoryState<T>) => state.past.length > 0;

export const canRedoHistoryState = <T>(state: WorkspaceHistoryState<T>) => state.future.length > 0;
