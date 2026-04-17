import { describe, expect, it } from 'vitest';
import { GeneratedImage } from '../types';
import {
    getContinueActionLabel,
    getEffectiveBranchContinuationSourceByBranchOriginId,
    isPromotedContinuationSource,
} from '../utils/branchContinuation';

const buildTurn = (overrides: Partial<GeneratedImage> = {}): GeneratedImage => ({
    id: 'turn-1',
    url: 'https://example.com/image.png',
    prompt: 'Prompt',
    aspectRatio: '1:1',
    size: '1K',
    style: 'None',
    model: 'gemini-3.1-flash-image-preview',
    createdAt: 1,
    status: 'success',
    ...overrides,
});

describe('branchContinuation', () => {
    it('merges branch continuation sources with session fallback', () => {
        expect(
            getEffectiveBranchContinuationSourceByBranchOriginId(
                { 'branch-a': 'turn-a1' },
                { 'turn-b2': 'branch-b' },
                'turn-b2',
            ),
        ).toEqual({
            'branch-a': 'turn-a1',
            'branch-b': 'turn-b2',
        });
    });

    it("does not project a pending branch selection back onto the source turn's existing branch", () => {
        expect(
            getEffectiveBranchContinuationSourceByBranchOriginId(
                { 'branch-a': 'turn-a1' },
                { 'turn-a2': 'branch-a' },
                'turn-a2',
                'branch',
            ),
        ).toEqual({
            'branch-a': 'turn-a1',
        });
    });

    it('marks only the promoted variant as the continuation source for its branch', () => {
        const firstVariant = buildTurn({ id: 'variant-1', variantGroupId: 'group-1' });
        const secondVariant = buildTurn({ id: 'variant-2', variantGroupId: 'group-1' });
        const branchOriginIdByTurnId = {
            'variant-1': 'root-1',
            'variant-2': 'root-1',
        };
        const continuationMap = { 'root-1': 'variant-2' };

        expect(isPromotedContinuationSource(firstVariant, branchOriginIdByTurnId, continuationMap)).toBe(false);
        expect(isPromotedContinuationSource(secondVariant, branchOriginIdByTurnId, continuationMap)).toBe(true);
    });

    it('uses explicit promotion labels for variants and ordinary continue labels for non-variants', () => {
        const nonVariant = buildTurn({ id: 'root-1', variantGroupId: null });
        const variant = buildTurn({ id: 'variant-1', variantGroupId: 'group-1' });
        const branchOriginIdByTurnId = {
            'root-1': 'root-1',
            'variant-1': 'root-1',
        };

        expect(getContinueActionLabel(nonVariant, branchOriginIdByTurnId, {})).toBe('Continue');
        expect(getContinueActionLabel(variant, branchOriginIdByTurnId, {})).toBe('Promote + continue');
        expect(getContinueActionLabel(variant, branchOriginIdByTurnId, { 'root-1': 'variant-1' })).toBe(
            'Continue source',
        );
    });
});
