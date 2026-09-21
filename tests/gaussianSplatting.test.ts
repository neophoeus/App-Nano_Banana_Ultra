/** @vitest-environment jsdom */

import { describe, expect, it, vi } from 'vitest';
import {
    clampAngle,
    computeEdgeAwareDepthField,
    computeSurfaceNormalsAndDiscontinuity,
    createGaussianPointCloudFromImage,
    estimatePixelDepth,
    normalizeAngle,
    projectPoint3D,
    renderGaussianSplatsToCanvas,
    rotatePoint3D,
} from '../utils/gaussianSplatting';

describe('gaussianSplatting 3D math & projection engine', () => {
    it('clamps angles to specified range correctly', () => {
        expect(clampAngle(0, -90, 90)).toBe(0);
        expect(clampAngle(120, -90, 90)).toBe(90);
        expect(clampAngle(-100, -90, 90)).toBe(-90);
        expect(clampAngle(-60, -45, 45)).toBe(-45);
        expect(clampAngle(30, -45, 45)).toBe(30);
    });

    it('normalizes angles within [-180, 180]', () => {
        expect(normalizeAngle(0)).toBe(0);
        expect(normalizeAngle(360)).toBe(0);
        expect(normalizeAngle(450)).toBe(90);
        expect(normalizeAngle(-270)).toBe(90);
        expect(normalizeAngle(180)).toBe(180);
    });

    it('rotates 3D points according to yaw (around Y) and pitch (around X)', () => {
        const rotYaw90 = rotatePoint3D(0, 0, 1, 90, 0);
        expect(rotYaw90.x).toBeCloseTo(1, 4);
        expect(rotYaw90.y).toBeCloseTo(0, 4);
        expect(rotYaw90.z).toBeCloseTo(0, 4);

        const rotPitch90 = rotatePoint3D(0, 1, 0, 0, 90);
        expect(rotPitch90.x).toBeCloseTo(0, 4);
        expect(rotPitch90.y).toBeCloseTo(0, 4);
        expect(rotPitch90.z).toBeCloseTo(1, 4);

        const rotZero = rotatePoint3D(0.5, -0.3, 0.2, 0, 0);
        expect(rotZero.x).toBeCloseTo(0.5, 5);
        expect(rotZero.y).toBeCloseTo(-0.3, 5);
        expect(rotZero.z).toBeCloseTo(0.2, 5);
    });

    it('projects 3D points to normalized screen coordinates', () => {
        const projOrigin = projectPoint3D(0, 0, 0, 50, 2.4);
        expect(projOrigin).not.toBeNull();
        expect(projOrigin!.screenX).toBeCloseTo(0, 4);
        expect(projOrigin!.screenY).toBeCloseTo(0, 4);
        expect(projOrigin!.depth).toBeCloseTo(2.4, 4);

        const projRight = projectPoint3D(0.5, 0, 0, 50, 2.4);
        expect(projRight).not.toBeNull();
        expect(projRight!.screenX).toBeGreaterThan(0);

        const projBehind = projectPoint3D(0, 0, 3.0, 50, 2.4);
        expect(projBehind).toBeNull();
    });

    it('estimates depth disparity for pixels using luminance and geometric priors', () => {
        const centerDepth = estimatePixelDepth(0.5, 0.8, 255, 255, 255);
        const topEdgeDepth = estimatePixelDepth(0.1, 0.1, 50, 50, 50);

        expect(centerDepth).toBeGreaterThanOrEqual(-0.5);
        expect(centerDepth).toBeLessThanOrEqual(0.5);
        expect(topEdgeDepth).toBeGreaterThanOrEqual(-0.5);
        expect(topEdgeDepth).toBeLessThanOrEqual(0.5);

        expect(centerDepth).toBeGreaterThan(topEdgeDepth);
    });

    it('computes edge-aware depth fields with edge-preserving bilateral filtering (Solution A)', () => {
        const width = 16;
        const height = 16;
        const data = new Uint8ClampedArray(width * height * 4);

        // Left half is bright foreground (255, 255, 255), right half is dark background (20, 20, 20)
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const isForeground = x < 8 && y >= 6;
                const val = isForeground ? 240 : 30;
                data[idx] = val;
                data[idx + 1] = val;
                data[idx + 2] = val;
                data[idx + 3] = 255;
            }
        }

        const depthField = computeEdgeAwareDepthField(data, width, height);
        expect(depthField.length).toBe(width * height);

        // Foreground center pixel has greater depth than background top-right pixel
        const fgDepth = depthField[8 * width + 4]; // (x: 4, y: 8) foreground
        const bgDepth = depthField[2 * width + 14]; // (x: 14, y: 2) background
        expect(fgDepth).toBeGreaterThan(bgDepth);

        // Disparity values stay within normalized [-0.5, 0.5] range
        for (let i = 0; i < depthField.length; i++) {
            expect(depthField[i]).toBeGreaterThanOrEqual(-0.5);
            expect(depthField[i]).toBeLessThanOrEqual(0.5);
        }
    });

    it('computes surface normals and identifies occlusion boundary edges', () => {
        const width = 10;
        const height = 10;
        const depthField = new Float32Array(width * height);

        // Create a sharp step edge at x = 5 (foreground to background step)
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                depthField[y * width + x] = x < 5 ? 0.3 : -0.3;
            }
        }

        const { normals, isEdge } = computeSurfaceNormalsAndDiscontinuity(depthField, width, height, 1.0);
        expect(normals.length).toBe(width * height * 3);
        expect(isEdge.length).toBe(width * height);

        // Surface normals must be unit vectors (hypot ≈ 1)
        for (let i = 0; i < width * height; i++) {
            const nx = normals[i * 3];
            const ny = normals[i * 3 + 1];
            const nz = normals[i * 3 + 2];
            const len = Math.hypot(nx, ny, nz);
            expect(len).toBeCloseTo(1, 4);
            expect(nz).toBeGreaterThan(0); // Normals point toward positive Z
        }

        // The boundary at x = 4 and x = 5 should be flagged as an edge discontinuity
        expect(isEdge[4 * width + 4]).toBe(1);
        expect(isEdge[4 * width + 5]).toBe(1);
        // Deep interior pixels should not be flagged as boundary steps
        expect(isEdge[4 * width + 1]).toBe(0);
        expect(isEdge[4 * width + 8]).toBe(0);
    });

    it('creates 3D Gaussian point cloud with surface normals and edge flags', () => {
        // Mock 2D canvas with getImageData
        const originalCreateElement = document.createElement.bind(document);
        const mockData = new Uint8ClampedArray(16 * 16 * 4).fill(200);

        vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
            if (tagName === 'canvas') {
                const canvas = originalCreateElement('canvas');
                vi.spyOn(canvas, 'getContext').mockImplementation((type: string) => {
                    if (type === '2d') {
                        return {
                            drawImage: vi.fn(),
                            getImageData: vi.fn(() => ({
                                data: mockData,
                                width: 16,
                                height: 16,
                            })),
                        } as any;
                    }
                    return null;
                });
                return canvas;
            }
            return originalCreateElement(tagName);
        });

        try {
            const mockImg = {} as CanvasImageSource;
            const cloud = createGaussianPointCloudFromImage(mockImg, 100, 100, { sampleDensity: 16 });

            expect(cloud.splats.length).toBeGreaterThan(0);
            const firstSplat = cloud.splats[0];
            expect(firstSplat.normalX).toBeDefined();
            expect(firstSplat.normalY).toBeDefined();
            expect(firstSplat.normalZ).toBeDefined();
            expect(firstSplat.isEdge).toBeDefined();
        } finally {
            vi.restoreAllMocks();
        }
    });

    it('renders Gaussian splats via 2D canvas fallback when webgl2 is unavailable (Solution B)', () => {
        const mockCtx = {
            fillStyle: '',
            fillRect: vi.fn(),
            beginPath: vi.fn(),
            arc: vi.fn(),
            fill: vi.fn(),
        } as unknown as CanvasRenderingContext2D;

        const cloud = {
            splats: [
                { x: 0, y: 0, z: 0.1, r: 255, g: 100, b: 50, a: 1, radius: 0.05, normalX: 0, normalY: 0, normalZ: 1 },
                {
                    x: 0.2,
                    y: 0.2,
                    z: -0.1,
                    r: 50,
                    g: 150,
                    b: 255,
                    a: 1,
                    radius: 0.05,
                    normalX: 0,
                    normalY: 0,
                    normalZ: 1,
                },
            ],
            originalWidth: 100,
            originalHeight: 100,
            aspectRatio: 1.0,
        };

        const camera = { yaw: 15, pitch: -10, zoom: 1.2 };

        // Test with CanvasRenderingContext2D directly
        renderGaussianSplatsToCanvas(mockCtx, cloud, camera, 400, 400, {
            clearColor: '#00ff00',
            renderMode: 'smooth',
        });

        expect(mockCtx.fillRect).toHaveBeenCalled();

        // Test with HTMLCanvasElement whose webgl2 returns null
        const mockCanvas = {
            getContext: vi.fn((type: string) => {
                if (type === 'webgl2') return null;
                if (type === '2d') return mockCtx;
                return null;
            }),
        } as unknown as HTMLCanvasElement;

        renderGaussianSplatsToCanvas(mockCanvas, cloud, camera, 400, 400, {
            clearColor: '#00ff00',
            renderMode: 'smooth',
        });

        expect(mockCanvas.getContext).toHaveBeenCalledWith('webgl2', expect.any(Object));
        expect(mockCanvas.getContext).toHaveBeenCalledWith('2d');
    });
});
