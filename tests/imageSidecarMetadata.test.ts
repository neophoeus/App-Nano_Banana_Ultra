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

    it('omits unsupported requested size and advanced flags for nano banana 1 metadata', () => {
        const metadata = buildImageSidecarMetadata({
            ...baseMetadataArgs,
            model: 'gemini-2.5-flash-image',
            requestedImageSize: '4K',
            thinkingLevel: 'high' as const,
            includeThoughts: true,
            googleSearch: true,
            imageSearch: true,
            style: 'None',
        });

        expect(metadata.requestedImageSize).toBeUndefined();
        expect(metadata.size).toBeUndefined();
        expect(metadata.thinkingLevel).toBe('disabled');
        expect(metadata.includeThoughts).toBe(false);
        expect(metadata.googleSearch).toBe(false);
        expect(metadata.imageSearch).toBe(false);
        expect(metadata.groundingMode).toBe('off');
    });

    it('derives actual output size separately from requested size when the output is smaller', () => {
        const metadata = normalizeImageSidecarMetadata({
            ...baseMetadataArgs,
            requestedImageSize: '4K',
            size: '4K',
            actualOutput: {
                width: 1024,
                height: 1024,
                mimeType: 'image/png',
            },
        });

        expect(metadata?.requestedImageSize).toBe('4K');
        expect(metadata?.size).toBe('1K');
    });

    it('cleans legacy persisted no-size metadata by dropping fake requests and keeping actual output', () => {
        const metadata = normalizeImageSidecarMetadata({
            ...baseMetadataArgs,
            model: 'gemini-2.5-flash-image',
            requestedImageSize: '4K',
            size: '4K',
            thinkingLevel: 'high',
            includeThoughts: true,
            googleSearch: true,
            imageSearch: true,
            actualOutput: {
                width: 1024,
                height: 1024,
                mimeType: 'image/png',
            },
        });

        expect(metadata?.requestedImageSize).toBeUndefined();
        expect(metadata?.size).toBe('1K');
        expect(metadata?.thinkingLevel).toBe('disabled');
        expect(metadata?.includeThoughts).toBe(false);
        expect(metadata?.googleSearch).toBe(false);
        expect(metadata?.imageSearch).toBe(false);
        expect(metadata?.groundingMode).toBe('off');
    });
});