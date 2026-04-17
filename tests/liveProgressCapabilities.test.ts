import { describe, expect, it } from 'vitest';
import {
    describeLiveProgressFanOutIneligibility,
    describeLiveProgressIneligibility,
    getLiveProgressCapabilityMatrix,
    summarizeLiveProgressTruthfulness,
} from '../utils/liveProgressCapabilities';

describe('live progress capabilities', () => {
    it('builds the expected included probe matrix for current supported image-model paths', () => {
        const includedCells = getLiveProgressCapabilityMatrix({ includeExcluded: false });

        expect(includedCells).toHaveLength(12);
        expect(includedCells.every((cell) => cell.expectedEligible)).toBe(true);
        expect(includedCells.filter((cell) => cell.model === 'gemini-3.1-flash-image-preview')).toHaveLength(8);
        expect(includedCells.filter((cell) => cell.model === 'gemini-3-pro-image-preview')).toHaveLength(4);
        expect(includedCells.some((cell) => cell.model === 'gemini-2.5-flash-image')).toBe(false);
    });

    it('keeps excluded gemini-2.5 flash image cells visible in the full matrix with explicit reasons', () => {
        const fullMatrix = getLiveProgressCapabilityMatrix({ includeExcluded: true });
        const excludedCells = fullMatrix.filter((cell) => cell.model === 'gemini-2.5-flash-image');

        expect(excludedCells).toHaveLength(4);
        expect(excludedCells.every((cell) => cell.expectedEligible === false)).toBe(true);
        expect(excludedCells.every((cell) => cell.expectedReason?.includes('does not support returning thoughts'))).toBe(true);
    });

    it('rejects ineligible runtime requests before the app attempts live streaming', () => {
        expect(
            describeLiveProgressIneligibility({
                model: 'gemini-3.1-flash-image-preview',
                executionMode: 'interactive-batch-variants',
                outputFormat: 'images-only',
                thinkingLevel: 'minimal',
                includeThoughts: true,
                batchSize: 2,
            }),
        ).toContain('batch size 1');

        expect(
            describeLiveProgressIneligibility({
                model: 'gemini-3-pro-image-preview',
                executionMode: 'single-turn',
                outputFormat: 'images-only',
                thinkingLevel: 'disabled',
                includeThoughts: false,
                batchSize: 1,
            }),
        ).toContain('includeThoughts=true');

        expect(
            describeLiveProgressFanOutIneligibility({
                model: 'gemini-3.1-flash-image-preview',
                executionMode: 'interactive-batch-variants',
                outputFormat: 'images-only',
                thinkingLevel: 'minimal',
                includeThoughts: true,
                batchSize: 2,
            }),
        ).toBeNull();

        expect(
            describeLiveProgressFanOutIneligibility({
                model: 'gemini-3.1-flash-image-preview',
                executionMode: 'chat-continuation',
                outputFormat: 'images-only',
                thinkingLevel: 'minimal',
                includeThoughts: true,
                batchSize: 2,
            }),
        ).toContain('interactive batch-variant requests');
    });

    it('distinguishes live progress from final-only, hidden-signature-only, and unstable ordering outcomes', () => {
        expect(
            summarizeLiveProgressTruthfulness({
                transportOpened: true,
                orderingStable: true,
                preCompletionArtifactCount: 2,
                firstPreCompletionArtifactKind: 'thought-image',
                thoughtSignatureObserved: true,
                finalRenderArrived: true,
            }).truthfulnessOutcome,
        ).toBe('live-progress');

        expect(
            summarizeLiveProgressTruthfulness({
                transportOpened: true,
                orderingStable: true,
                preCompletionArtifactCount: 0,
                firstPreCompletionArtifactKind: null,
                thoughtSignatureObserved: true,
                finalRenderArrived: true,
            }).truthfulnessOutcome,
        ).toBe('hidden-signature-only');

        expect(
            summarizeLiveProgressTruthfulness({
                transportOpened: true,
                orderingStable: true,
                preCompletionArtifactCount: 0,
                firstPreCompletionArtifactKind: null,
                thoughtSignatureObserved: false,
                finalRenderArrived: true,
            }).truthfulnessOutcome,
        ).toBe('final-only');

        expect(
            summarizeLiveProgressTruthfulness({
                transportOpened: true,
                orderingStable: false,
                preCompletionArtifactCount: 1,
                firstPreCompletionArtifactKind: 'thought-text',
                thoughtSignatureObserved: true,
                finalRenderArrived: true,
            }).truthfulnessOutcome,
        ).toBe('unstable-ordering');
    });
});