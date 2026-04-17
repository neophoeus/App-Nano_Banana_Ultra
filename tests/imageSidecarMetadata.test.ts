import { describe, expect, it } from 'vitest';
import { ImageStyle } from '../types';
import { buildImageSidecarMetadata, normalizeImageSidecarMetadata } from '../utils/imageSidecarMetadata';

const baseMetadataArgs = {
    prompt: 'Test prompt',
    model: 'gemini-3.1-flash-image-preview' as const,
    aspectRatio: '1:1' as const,
    requestedImageSize: '2K' as const,
    outputFormat: 'images-only' as const,
    temperature: 1,
    thinkingLevel: 'minimal' as const,
    includeThoughts: true,
    googleSearch: false,
    imageSearch: false,
    generationMode: 'Text to Image',
    executionMode: 'single-turn' as const,
};

describe('imageSidecarMetadata', () => {
    it('writes canonical style ids into new sidecar metadata', () => {
        const metadata = buildImageSidecarMetadata({
            ...baseMetadataArgs,
            style: 'Vintage Polaroid' as unknown as ImageStyle,
        });

        expect(metadata.style).toBe('Vintage Instant Photo');
    });

    it('normalizes legacy style ids from persisted sidecar metadata', () => {
        const metadata = normalizeImageSidecarMetadata({
            ...baseMetadataArgs,
            style: 'Comic Book',
            size: '2K',
        });

        expect(metadata?.style).toBe('Comic Illustration');
    });
});