/** @vitest-environment jsdom */

import { describe, expect, it } from 'vitest';
import { getModelQuotaSpec, MODEL_QUOTA_SPECS } from '../utils/modelCapabilities';

describe('pro and flash model quota handling', () => {
    it('returns correct default quota specs for gemini-3.1-flash-image', () => {
        const spec = getModelQuotaSpec('gemini-3.1-flash-image');
        expect(spec).toEqual({
            defaultRpm: 15,
            defaultTpm: 200000,
            recommendedStaggerMs: 1200,
        });
    });

    it('returns strict RPM and TPM quota specs for gemini-3-pro-image', () => {
        const spec = getModelQuotaSpec('gemini-3-pro-image');
        expect(spec.defaultRpm).toBe(2);
        expect(spec.defaultTpm).toBe(32000);
        expect(spec.recommendedStaggerMs).toBe(5000);
    });

    it('handles legacy preview aliases and arbitrary pro/flash string models correctly', () => {
        const proPreviewSpec = getModelQuotaSpec('gemini-3-pro-image-preview');
        expect(proPreviewSpec.defaultRpm).toBe(2);

        const customProSpec = getModelQuotaSpec('custom-gemini-pro');
        expect(customProSpec.defaultRpm).toBe(2);

        const nullSpec = getModelQuotaSpec(null);
        expect(nullSpec.defaultRpm).toBe(15);
    });
});
