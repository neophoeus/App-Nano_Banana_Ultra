import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import GeneratedImage from '../components/GeneratedImage';

describe('GeneratedImage', () => {
    it('renders actual output badge when actual dimensions are known', () => {
        const markup = renderToStaticMarkup(
            <GeneratedImage
                imageUrls={['https://example.com/result.png']}
                isLoading={false}
                prompt="Test prompt"
                actualOutputLabel="1K"
                resultStatusSummary="Google Search + Image Search · Requested 4K · Actual 1K"
                resultStatusTone="warning"
                settings={{
                    aspectRatio: '1:1',
                    size: '4K',
                    style: 'None',
                    model: 'gemini-3.1-flash-image-preview',
                    batchSize: 1,
                }}
                generationMode="Text to Image"
                executionMode="single-turn"
                onGenerate={() => {}}
            />,
        );

        expect(markup).toContain('Actual output');
        expect(markup).toContain('1K');
        expect(markup).toContain('Grounded result');
        expect(markup).toContain('Requested 4K');
    });

    it('does not surface duplicate tool actions on the selected-image stage', () => {
        const markup = renderToStaticMarkup(
            <GeneratedImage
                imageUrls={['https://example.com/result.png']}
                isLoading={false}
                prompt="Test prompt"
                settings={{
                    aspectRatio: '1:1',
                    size: '1K',
                    style: 'None',
                    model: 'gemini-3.1-flash-image-preview',
                    batchSize: 1,
                }}
                generationMode="Text to Image"
                executionMode="single-turn"
                onGenerate={() => {}}
                onEdit={() => {}}
                onAddToObjectReference={() => {}}
                onAddToCharacterReference={() => {}}
                onClear={() => {}}
                currentLanguage="en"
            />,
        );

        expect(markup).not.toContain('Use as Reference');
        expect(markup).not.toContain('Edit & Repaint');
        expect(markup).toContain('Clear View');
    });

    it('locks the selected-image stage into a square frame', () => {
        const markup = renderToStaticMarkup(
            <GeneratedImage
                imageUrls={['https://example.com/result.png']}
                isLoading={false}
                prompt="Square stage"
                settings={{
                    aspectRatio: '3:4',
                    size: '1K',
                    style: 'None',
                    model: 'gemini-3.1-flash-image-preview',
                    batchSize: 1,
                }}
                generationMode="Text to Image"
                executionMode="single-turn"
                onGenerate={() => {}}
            />,
        );

        const stageFrameTag = markup.match(/<div[^>]*data-testid="generated-image-stage-frame"[^>]*>/)?.[0];

        expect(stageFrameTag).toBeDefined();
        expect(stageFrameTag).toContain('aspect-square');
    });
});
