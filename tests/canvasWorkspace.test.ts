import { describe, expect, it } from 'vitest';
import { ASPECT_RATIOS } from '../constants';
import {
    appendPointToLatestStroke,
    applyPanDelta,
    applyWheelZoomDelta,
    buildCanvasDimensionsForRatio,
    canRedoHistoryState,
    canUndoHistoryState,
    commitHistoryPresent,
    createHistoryState,
    findClosestAspectRatio,
    findClosestImageSize,
    fitWorkspaceToViewport,
    redoHistoryState,
    replaceHistoryPresent,
    resetHistoryState,
    screenPointToWorkspacePoint,
    undoHistoryState,
    type WorkspaceStroke,
    type WorkspaceViewport,
} from '../utils/canvasWorkspace';

describe('canvasWorkspace', () => {
    it('fits content into a safe viewport region', () => {
        const fitted = fitWorkspaceToViewport(1000, 500, 1600, 900, {
            top: 100,
            bottom: 100,
            left: 50,
            right: 150,
        });

        expect(fitted.zoom).toBeCloseTo(1.4);
        expect(fitted.x).toBe(-50);
        expect(fitted.y).toBe(0);
    });

    it('converts screen points into workspace coordinates', () => {
        const viewport: WorkspaceViewport = { x: 80, y: -40, zoom: 2 };
        const point = screenPointToWorkspacePoint(
            700,
            300,
            {
                left: 100,
                top: 50,
                width: 1000,
                height: 600,
            },
            viewport,
        );

        expect(point).toEqual({ x: 10, y: -5 });
    });

    it('applies pan deltas without touching zoom', () => {
        expect(applyPanDelta({ x: 10, y: 20, zoom: 1.5 }, -5, 8)).toEqual({
            x: 5,
            y: 28,
            zoom: 1.5,
        });
    });

    it('clamps wheel zoom to the requested range', () => {
        expect(applyWheelZoomDelta(1, -500, 0.001, 0.1, 5)).toBeCloseTo(1.5);
        expect(applyWheelZoomDelta(0.2, 2000, 0.001, 0.1, 5)).toBe(0.1);
        expect(applyWheelZoomDelta(4.9, -1000, 0.001, 0.1, 5)).toBe(5);
    });

    it('appends points immutably to the latest stroke', () => {
        const strokes: WorkspaceStroke[] = [
            {
                points: [{ x: 10, y: 20 }],
                brushSize: 12,
                color: '#111111',
            },
        ];

        const updated = appendPointToLatestStroke(strokes, { x: 30, y: 40 });

        expect(updated).not.toBe(strokes);
        expect(updated[0].points).toEqual([
            { x: 10, y: 20 },
            { x: 30, y: 40 },
        ]);
        expect(strokes[0].points).toEqual([{ x: 10, y: 20 }]);
    });

    it('builds ratio-aware canvas dimensions', () => {
        expect(buildCanvasDimensionsForRatio('16:9')).toEqual({ w: 1024, h: 576 });
        expect(buildCanvasDimensionsForRatio('3:4')).toEqual({ w: 768, h: 1024 });
    });

    it('finds the closest supported aspect ratio for editor entry', () => {
        expect(findClosestAspectRatio(4032, 3024, ASPECT_RATIOS)).toBe('4:3');
        expect(findClosestAspectRatio(1200, 300, ASPECT_RATIOS)).toBe('4:1');
    });

    it('maps source dimensions to the nearest image-size bucket', () => {
        expect(findClosestImageSize(800, 600)).toBe('1K');
        expect(findClosestImageSize(3000, 2000)).toBe('2K');
        expect(findClosestImageSize(4096, 2304)).toBe('4K');
    });

    it('tracks history with a shared past/present/future contract', () => {
        const initial = createHistoryState<WorkspaceStroke[]>([]);
        const firstCommit = commitHistoryPresent(initial, [
            { points: [{ x: 1, y: 2 }], brushSize: 4, color: '#111111' },
        ]);
        const inProgress = replaceHistoryPresent(
            firstCommit,
            appendPointToLatestStroke(firstCommit.present, { x: 3, y: 4 }),
        );
        const undone = undoHistoryState(inProgress);
        const redone = redoHistoryState(undone);

        expect(canUndoHistoryState(initial)).toBe(false);
        expect(canUndoHistoryState(firstCommit)).toBe(true);
        expect(canRedoHistoryState(undone)).toBe(true);
        expect(undone.present).toEqual([]);
        expect(redone.present[0].points).toEqual([
            { x: 1, y: 2 },
            { x: 3, y: 4 },
        ]);
        expect(resetHistoryState([{ points: [{ x: 9, y: 9 }], brushSize: 2, color: '#222222' }])).toEqual({
            past: [],
            present: [{ points: [{ x: 9, y: 9 }], brushSize: 2, color: '#222222' }],
            future: [],
        });
    });
});
