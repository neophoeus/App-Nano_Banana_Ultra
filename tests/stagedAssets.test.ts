import { describe, expect, it } from 'vitest';
import { addStageAsset } from '../utils/stagedAssets';
import { StageAsset } from '../types';

describe('stagedAssets', () => {
    it('keeps singleton stage assets stable when the same stage source is re-applied', () => {
        const existingStageSource: StageAsset = {
            id: 'stage-source-1',
            url: 'https://example.com/source.png',
            role: 'stage-source',
            origin: 'history',
            createdAt: 1,
            sourceHistoryId: 'turn-1',
            lineageAction: 'continue',
        };

        const result = addStageAsset([existingStageSource], {
            role: 'stage-source',
            origin: 'history',
            url: 'https://example.com/source.png',
            sourceHistoryId: 'turn-1',
            lineageAction: 'continue',
        });

        expect(result).toBeInstanceOf(Array);
        expect(result).toBe(result);
        expect(result).toEqual([existingStageSource]);
        expect(result[0]).toBe(existingStageSource);
    });

    it('replaces singleton stage assets when the source metadata changes', () => {
        const existingStageSource: StageAsset = {
            id: 'stage-source-1',
            url: 'https://example.com/source.png',
            role: 'stage-source',
            origin: 'history',
            createdAt: 1,
            sourceHistoryId: 'turn-1',
            lineageAction: 'continue',
        };

        const result = addStageAsset([existingStageSource], {
            role: 'stage-source',
            origin: 'generated',
            url: 'https://example.com/source.png',
            sourceHistoryId: 'turn-2',
            lineageAction: 'reopen',
        });

        expect(result).toHaveLength(1);
        expect(result[0]).not.toBe(existingStageSource);
        expect(result[0]).toMatchObject({
            role: 'stage-source',
            origin: 'generated',
            url: 'https://example.com/source.png',
            sourceHistoryId: 'turn-2',
            lineageAction: 'reopen',
        });
    });
});
