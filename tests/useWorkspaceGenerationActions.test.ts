import { describe, expect, it } from 'vitest';
import { resolveEffectiveSurfaceStyle } from '../hooks/useWorkspaceGenerationActions';

describe('useWorkspaceGenerationActions', () => {
    it('forces style none whenever a shared-controls surface is open', () => {
        expect(resolveEffectiveSurfaceStyle('Cinematic', true)).toBe('None');
        expect(resolveEffectiveSurfaceStyle('Comic Illustration', true)).toBe('None');
    });

    it('preserves the composer style when no shared-controls surface is open', () => {
        expect(resolveEffectiveSurfaceStyle('Cinematic', false)).toBe('Cinematic');
        expect(resolveEffectiveSurfaceStyle('None', false)).toBe('None');
    });
});