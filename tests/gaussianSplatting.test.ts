import { describe, expect, it } from 'vitest';
import {
    clampAngle,
    estimatePixelDepth,
    normalizeAngle,
    projectPoint3D,
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
        // Point along Z axis (0, 0, 1) rotated 90 degrees yaw (around Y)
        const rotYaw90 = rotatePoint3D(0, 0, 1, 90, 0);
        expect(rotYaw90.x).toBeCloseTo(1, 4);
        expect(rotYaw90.y).toBeCloseTo(0, 4);
        expect(rotYaw90.z).toBeCloseTo(0, 4);

        // Point along Y axis (0, 1, 0) rotated 90 degrees pitch (around X)
        const rotPitch90 = rotatePoint3D(0, 1, 0, 0, 90);
        expect(rotPitch90.x).toBeCloseTo(0, 4);
        expect(rotPitch90.y).toBeCloseTo(0, 4);
        expect(rotPitch90.z).toBeCloseTo(1, 4);

        // Zero rotation returns identical coordinates
        const rotZero = rotatePoint3D(0.5, -0.3, 0.2, 0, 0);
        expect(rotZero.x).toBeCloseTo(0.5, 5);
        expect(rotZero.y).toBeCloseTo(-0.3, 5);
        expect(rotZero.z).toBeCloseTo(0.2, 5);
    });

    it('projects 3D points to normalized screen coordinates', () => {
        // Origin (0, 0, 0) in front of camera at distance 2.4
        const projOrigin = projectPoint3D(0, 0, 0, 50, 2.4);
        expect(projOrigin).not.toBeNull();
        expect(projOrigin!.screenX).toBeCloseTo(0, 4);
        expect(projOrigin!.screenY).toBeCloseTo(0, 4);
        expect(projOrigin!.depth).toBeCloseTo(2.4, 4);

        // Off-center point projects proportionally
        const projRight = projectPoint3D(0.5, 0, 0, 50, 2.4);
        expect(projRight).not.toBeNull();
        expect(projRight!.screenX).toBeGreaterThan(0);

        // Points behind or at camera are clipped
        const projBehind = projectPoint3D(0, 0, 3.0, 50, 2.4); // zCam = 2.4 - 3.0 = -0.6 <= 0.1
        expect(projBehind).toBeNull();
    });

    it('estimates depth disparity for pixels using luminance and geometric priors', () => {
        // Center pixel foreground
        const centerDepth = estimatePixelDepth(0.5, 0.8, 255, 255, 255);
        // Top-edge background
        const topEdgeDepth = estimatePixelDepth(0.1, 0.1, 50, 50, 50);

        // Depth should stay within [-0.5, 0.5] bounds
        expect(centerDepth).toBeGreaterThanOrEqual(-0.5);
        expect(centerDepth).toBeLessThanOrEqual(0.5);
        expect(topEdgeDepth).toBeGreaterThanOrEqual(-0.5);
        expect(topEdgeDepth).toBeLessThanOrEqual(0.5);

        // Foreground lower-center pixel has greater disparity than distant top pixel
        expect(centerDepth).toBeGreaterThan(topEdgeDepth);
    });
});
