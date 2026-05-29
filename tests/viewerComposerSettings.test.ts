import { describe, expect, it } from 'vitest';
import {
    buildViewerComposerSettingsSnapshot,
    normalizeViewerComposerSettingsSnapshot,
} from '../utils/viewerComposerSettings';

describe('viewerComposerSettings', () => {
    it('builds a snapshot for sparse pro-model metadata without hiding the CTA', () => {
        const snapshot = buildViewerComposerSettingsSnapshot(
            {
                aspectRatio: '16:9',
                size: '2K',
                style: 'Anime',
                model: 'gemini-3-pro-image',
            },
            {
                model: 'gemini-3-pro-image',
                thinkingLevel: 'disabled',
                googleSearch: true,
            },
        );

        expect(snapshot).toEqual({
            aspectRatio: '16:9',
            imageSize: '2K',
            imageStyle: 'Anime',
            imageModel: 'gemini-3-pro-image',
            batchSize: 1,
            thinkingLevel: 'disabled',
            googleSearch: true,
        });
    });

    it('does not backfill requested size from history for models without size control', () => {
        const snapshot = buildViewerComposerSettingsSnapshot(
            {
                aspectRatio: '16:9',
                size: '4K',
                style: 'None',
                model: 'gemini-2.5-flash-image',
            },
            {
                model: 'gemini-2.5-flash-image',
            },
        );

        expect(snapshot).toEqual({
            aspectRatio: '16:9',
            imageStyle: 'None',
            imageModel: 'gemini-2.5-flash-image',
            batchSize: 1,
        });
    });

    it('preserves the current composer size while normalizing no-size model snapshots', () => {
        const normalized = normalizeViewerComposerSettingsSnapshot(
            {
                aspectRatio: '16:9',
                imageStyle: 'None',
                imageModel: 'gemini-2.5-flash-image',
                batchSize: 1,
            },
            '1K',
        );

        expect(normalized).toEqual({
            aspectRatio: '16:9',
            imageSize: '1K',
            imageStyle: 'None',
            imageModel: 'gemini-2.5-flash-image',
            batchSize: 1,
            outputFormat: 'images-only',
            temperature: 1,
            thinkingLevel: 'disabled',
            includeThoughts: false,
            googleSearch: false,
            imageSearch: false,
        });
    });

    it('quantizes supported-model temperatures to the nearest 0.05 increment', () => {
        const normalized = normalizeViewerComposerSettingsSnapshot({
            aspectRatio: '1:1',
            imageSize: '2K',
            imageStyle: 'None',
            imageModel: 'gemini-3.1-flash-image',
            batchSize: 1,
            temperature: 1.03,
        });

        expect(normalized.temperature).toBe(1.05);
    });
});
