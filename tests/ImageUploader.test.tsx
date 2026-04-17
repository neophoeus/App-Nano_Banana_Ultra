/** @vitest-environment jsdom */

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ImageUploader from '../components/ImageUploader';
import { clearReferencePreviewCache, setReferencePreviewDataUrl } from '../utils/imageSaveUtils';

describe('ImageUploader', () => {
    let container: HTMLDivElement;
    let root: Root;
    let observerCallback: IntersectionObserverCallback | null;
    let originalIntersectionObserver: typeof window.IntersectionObserver;

    beforeEach(() => {
        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        observerCallback = null;
        originalIntersectionObserver = window.IntersectionObserver;
        clearReferencePreviewCache();

        class MockIntersectionObserver implements IntersectionObserver {
            readonly root = null;
            readonly rootMargin = '220px';
            readonly thresholds = [0.01];

            constructor(callback: IntersectionObserverCallback) {
                observerCallback = callback;
            }

            disconnect() {}
            observe() {}
            takeRecords() {
                return [];
            }
            unobserve() {}
        }

        Object.defineProperty(window, 'IntersectionObserver', {
            configurable: true,
            writable: true,
            value: MockIntersectionObserver,
        });
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
        Object.defineProperty(window, 'IntersectionObserver', {
            configurable: true,
            writable: true,
            value: originalIntersectionObserver,
        });
        clearReferencePreviewCache();
        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
    });

    it('supports a denser five-column reference grid for compact reference trays', () => {
        const markup = renderToStaticMarkup(
            <ImageUploader
                images={['object-1.png', 'object-2.png']}
                onImagesChange={vi.fn()}
                currentLanguage="en"
                maxImages={5}
                gridColumns={5}
                prefixTag="Obj"
            />,
        );

        expect(markup).toContain('grid-cols-5');
        expect(markup).toContain('gap-1.5');
        expect(markup).toContain('rounded-[10px]');
        expect(markup).toContain('h-4 w-4');
        expect(markup).not.toContain('Add</span>');
    });

    it('renders cached preview thumbnails instead of the original full-resolution reference source', () => {
        setReferencePreviewDataUrl('fullres-object.png', 'preview-object.png');

        const markup = renderToStaticMarkup(
            <ImageUploader
                images={['fullres-object.png']}
                onImagesChange={vi.fn()}
                currentLanguage="en"
                maxImages={5}
                gridColumns={5}
                prefixTag="Obj"
            />,
        );

        expect(markup).toContain('src="preview-object.png"');
        expect(markup).not.toContain('src="fullres-object.png"');
    });

    it('keeps reference thumbnails as placeholders until they intersect when lazy mounting is enabled', () => {
        setReferencePreviewDataUrl('object-1.png', 'preview-object-1.png');

        act(() => {
            root.render(
                <ImageUploader
                    images={['object-1.png']}
                    onImagesChange={vi.fn()}
                    currentLanguage="en"
                    maxImages={5}
                    gridColumns={5}
                    prefixTag="Obj"
                    lazyMountImages={true}
                />,
            );
        });

        expect(container.querySelector('[data-testid="image-uploader-thumbnail-placeholder-0"]')).toBeTruthy();
        expect(container.querySelector('[data-testid="image-uploader-thumbnail-0"]')).toBeNull();

        act(() => {
            observerCallback?.(
                [
                    {
                        isIntersecting: true,
                        intersectionRatio: 1,
                    } as IntersectionObserverEntry,
                ],
                {} as IntersectionObserver,
            );
        });

        expect(container.querySelector('[data-testid="image-uploader-thumbnail-0"]')).toBeTruthy();
        expect(container.querySelector('[data-testid="image-uploader-thumbnail-placeholder-0"]')).toBeNull();
        expect(container.querySelector('[data-testid="image-uploader-thumbnail-0"]')?.getAttribute('src')).toBe(
            'preview-object-1.png',
        );
    });

    it('generates preview thumbnails in the background for uncached references before rendering them', async () => {
        const originalImage = window.Image;
        const originalCreateElement = document.createElement.bind(document);
        const drawImage = vi.fn();
        const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
            if (tagName.toLowerCase() === 'canvas') {
                return {
                    width: 0,
                    height: 0,
                    getContext: () => ({ drawImage }),
                    toDataURL: () => 'data:image/jpeg;base64,generated-preview',
                } as unknown as HTMLCanvasElement;
            }

            return originalCreateElement(tagName);
        }) as typeof document.createElement);

        class MockImage {
            onload: (() => void) | null = null;
            onerror: (() => void) | null = null;
            width = 1600;
            height = 1200;

            set src(_value: string) {
                queueMicrotask(() => {
                    this.onload?.();
                });
            }
        }

        Object.defineProperty(window, 'Image', {
            configurable: true,
            writable: true,
            value: MockImage,
        });

        act(() => {
            root.render(
                <ImageUploader
                    images={['uncached-fullres.png']}
                    onImagesChange={vi.fn()}
                    currentLanguage="en"
                    maxImages={5}
                    gridColumns={5}
                    prefixTag="Obj"
                />,
            );
        });

        expect(container.querySelector('[data-testid="image-uploader-thumbnail-placeholder-0"]')).toBeTruthy();
        expect(container.querySelector('[data-testid="image-uploader-thumbnail-0"]')).toBeNull();

        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(drawImage).toHaveBeenCalledTimes(1);
        expect(container.querySelector('[data-testid="image-uploader-thumbnail-0"]')?.getAttribute('src')).toBe(
            'data:image/jpeg;base64,generated-preview',
        );
        expect(container.querySelector('[data-testid="image-uploader-thumbnail-placeholder-0"]')).toBeNull();

        createElementSpy.mockRestore();
        Object.defineProperty(window, 'Image', {
            configurable: true,
            writable: true,
            value: originalImage,
        });
    });
});