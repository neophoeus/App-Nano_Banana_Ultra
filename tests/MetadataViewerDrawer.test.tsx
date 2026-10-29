/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MetadataViewerDrawer from '../components/MetadataViewerDrawer';
import { createITXtChunk } from '../plugins/utils/imageMetadataEmbedder';
import {
    convertMetadataToViewerSnapshot,
    extractNanoBananaMetadata,
    formatMetadataForCli,
    parseImageEmbeddedMetadata,
    parseParametersString,
} from '../utils/imageEmbeddedMetadataReader';
import { getTranslation } from '../utils/translations';

describe('imageEmbeddedMetadataReader core utilities', () => {
    it('parses A1111 / Civitai parameters string format and maps parameters into metadata', () => {
        const raw =
            'A cute golden retriever puppy sitting in a meadow\nNegative prompt: blurry, ugly, low quality\nSteps: 25, Sampler: DPM++ 2M Karras, CFG scale: 7, Seed: 987654, Size: 1024x1024, Model: sd-xl-base, Style: Cinematic, Aspect Ratio: 16:9, Temperature: 0.8, Thinking Level: high';
        const parsed = parseParametersString(raw);

        expect(parsed.prompt).toBe('A cute golden retriever puppy sitting in a meadow');
        expect(parsed.negativePrompt).toBe('blurry, ugly, low quality');
        expect(parsed.params['Steps']).toBe('25');
        expect(parsed.params['Size']).toBe('1024x1024');
        expect(parsed.params['Model']).toBe('sd-xl-base');
        expect(parsed.params['Style']).toBe('Cinematic');
        expect(parsed.params['Aspect Ratio']).toBe('16:9');

        const itxtBuf = createITXtChunk('parameters', raw);
        const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
        const iendChunk = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);
        const fullPng = Buffer.concat([pngHeader, itxtBuf, iendChunk]);
        const extracted = extractNanoBananaMetadata(new Uint8Array(fullPng).buffer);
        expect(extracted?.prompt).toBe('A cute golden retriever puppy sitting in a meadow');
        expect(extracted?.model).toBe('sd-xl-base');
        expect(extracted?.style).toBe('Cinematic');
        expect(extracted?.aspectRatio).toBe('16:9');
        expect(extracted?.size).toBe('1024x1024');
        expect(extracted?.temperature).toBe(0.8);
        expect(extracted?.thinkingLevel).toBe('high');
    });

    it('extracts embedded Nano Banana metadata from PNG iTXt chunk', () => {
        const payload = {
            prompt: 'Futuristic sci-fi city with neon lights',
            model: 'gemini-3.1-flash-image',
            style: 'Cyberpunk',
            aspectRatio: '16:9',
            size: '2K',
            temperature: 1,
            thinkingLevel: 'medium',
        };

        const itxtBuf = createITXtChunk('nano_banana_meta', JSON.stringify(payload));
        // Build minimal valid PNG with IHDR + iTXt + IEND
        const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
        const iendChunk = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);
        const fullPng = Buffer.concat([pngHeader, itxtBuf, iendChunk]);

        const uint8Array = new Uint8Array(fullPng);
        const rawMeta = parseImageEmbeddedMetadata(uint8Array.buffer);
        expect(rawMeta['nano_banana_meta']).toBeDefined();

        const extracted = extractNanoBananaMetadata(uint8Array.buffer);
        expect(extracted).not.toBeNull();
        expect(extracted?.prompt).toBe('Futuristic sci-fi city with neon lights');
        expect(extracted?.model).toBe('gemini-3.1-flash-image');
        expect(extracted?.style).toBe('Cyberpunk');

        const snapshot = convertMetadataToViewerSnapshot(extracted);
        expect(snapshot).not.toBeNull();
        expect(snapshot?.aspectRatio).toBe('16:9');
        expect(snapshot?.imageModel).toBe('gemini-3.1-flash-image');
    });

    it('extracts metadata using sidecar JSON fallback when image has no embedded metadata', () => {
        const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
        const iendChunk = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);
        const emptyPng = Buffer.concat([pngHeader, iendChunk]);

        const sidecar = {
            prompt: 'Prompt from sidecar json',
            model: 'imagen-3.0-generate-002',
            aspectRatio: '1:1',
            size: '1K',
        };

        const extracted = extractNanoBananaMetadata(new Uint8Array(emptyPng).buffer, sidecar);
        expect(extracted).not.toBeNull();
        expect(extracted?.prompt).toBe('Prompt from sidecar json');
    });

    it('formats metadata for CLI output', () => {
        const metaMap = {
            nano_banana_meta: JSON.stringify({
                prompt: 'Banana art on canvas',
                model: 'imagen-3.0-generate-002',
                aspectRatio: '1:1',
                size: '1K',
            }),
        };
        const cliOutput = formatMetadataForCli('sample.png', metaMap);
        expect(cliOutput).toContain('sample.png');
        expect(cliOutput).toContain('Banana art on canvas');
        expect(cliOutput).toContain('imagen-3.0-generate-002');
    });
});

describe('MetadataViewerDrawer component', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);

        // Mock clipboard
        Object.assign(navigator, {
            clipboard: {
                writeText: vi.fn().mockResolvedValue(undefined),
            },
        });
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
        vi.restoreAllMocks();
    });

    it('does not render when isOpen is false', () => {
        act(() => {
            root.render(
                <MetadataViewerDrawer
                    isOpen={false}
                    onClose={vi.fn()}
                    currentLanguage="zh_TW"
                    t={(key) => getTranslation('zh_TW', key as any)}
                />,
            );
        });

        expect(container.querySelector('[data-testid="metadata-viewer-drawer"]')).toBeNull();
    });

    it('renders drawer and dropzone when isOpen is true', () => {
        act(() => {
            root.render(
                <MetadataViewerDrawer
                    isOpen={true}
                    onClose={vi.fn()}
                    currentLanguage="zh_TW"
                    t={(key) => getTranslation('zh_TW', key as any)}
                />,
            );
        });

        expect(container.querySelector('[data-testid="metadata-viewer-drawer"]')).toBeTruthy();
        expect(container.querySelector('[data-testid="metadata-viewer-dropzone"]')).toBeTruthy();
    });

    it('supports applying prompt and settings when callbacks are triggered', () => {
        const onApplyPrompt = vi.fn();
        const onApplySettings = vi.fn();
        const onApplyBoth = vi.fn();
        const showNotification = vi.fn();
        const onClose = vi.fn();

        const sampleImages = [
            {
                name: 'test.png',
                url: 'blob:http://localhost/dummy.png',
                rawMeta: {},
                parsedMeta: {
                    prompt: 'A picturesque mountain landscape',
                    model: 'gemini-3.1-flash-image',
                    aspectRatio: '16:9',
                    size: '2K',
                    style: 'Cinematic',
                },
                sidecar: null,
            },
        ];

        act(() => {
            root.render(
                <MetadataViewerDrawer
                    isOpen={true}
                    onClose={onClose}
                    currentLanguage="zh_TW"
                    t={(key) => getTranslation('zh_TW', key as any)}
                    onApplyPrompt={onApplyPrompt}
                    onApplySettings={onApplySettings}
                    onApplyBoth={onApplyBoth}
                    showNotification={showNotification}
                    initialImages={sampleImages}
                />,
            );
        });

        const applyBothBtn = container.querySelector('[data-testid="metadata-viewer-apply-both"]') as HTMLButtonElement;
        const applyPromptBtn = container.querySelector(
            '[data-testid="metadata-viewer-apply-prompt"]',
        ) as HTMLButtonElement;
        const applySettingsBtn = container.querySelector(
            '[data-testid="metadata-viewer-apply-settings"]',
        ) as HTMLButtonElement;

        expect(applyBothBtn).toBeTruthy();
        expect(applyPromptBtn).toBeTruthy();
        expect(applySettingsBtn).toBeTruthy();
        expect(applyBothBtn.disabled).toBe(false);
        expect(applyPromptBtn.disabled).toBe(false);
        expect(applySettingsBtn.disabled).toBe(false);

        act(() => {
            applyPromptBtn.click();
        });
        expect(onApplyPrompt).toHaveBeenCalledWith('A picturesque mountain landscape');

        act(() => {
            applySettingsBtn.click();
        });
        expect(onApplySettings).toHaveBeenCalled();

        act(() => {
            applyBothBtn.click();
        });
        expect(onApplyBoth).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
    });

    it('respects settingsLocked=true and blocks apply settings while allowing apply prompt', () => {
        const onApplyPrompt = vi.fn();
        const onApplySettings = vi.fn();
        const onApplyBoth = vi.fn();
        const showNotification = vi.fn();
        const onClose = vi.fn();

        const sampleImages = [
            {
                name: 'test.png',
                url: 'blob:http://localhost/dummy.png',
                rawMeta: {},
                parsedMeta: {
                    prompt: 'Landscape with locked settings',
                    model: 'gemini-3.1-flash-image',
                    aspectRatio: '1:1',
                    size: '1K',
                },
                sidecar: null,
            },
        ];

        act(() => {
            root.render(
                <MetadataViewerDrawer
                    isOpen={true}
                    onClose={onClose}
                    currentLanguage="zh_TW"
                    t={(key) => getTranslation('zh_TW', key as any)}
                    onApplyPrompt={onApplyPrompt}
                    onApplySettings={onApplySettings}
                    onApplyBoth={onApplyBoth}
                    settingsLocked={true}
                    showNotification={showNotification}
                    initialImages={sampleImages}
                />,
            );
        });

        const applySettingsBtn = container.querySelector(
            '[data-testid="metadata-viewer-apply-settings"]',
        ) as HTMLButtonElement;
        const applyBothBtn = container.querySelector('[data-testid="metadata-viewer-apply-both"]') as HTMLButtonElement;

        act(() => {
            applySettingsBtn.click();
        });
        expect(showNotification).toHaveBeenCalledWith(getTranslation('zh_TW', 'settingsLockedNotice'), 'info');
        expect(onApplySettings).not.toHaveBeenCalled();

        act(() => {
            applyBothBtn.click();
        });
        // Prompt is still applied even when settings are locked
        expect(onApplyPrompt).toHaveBeenCalledWith('Landscape with locked settings');
        expect(onApplySettings).not.toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
    });

    it('handles file upload with embedded PNG metadata and ignores unsupported files', async () => {
        const onApplyPrompt = vi.fn();
        URL.createObjectURL = vi.fn(() => 'blob:http://localhost/uploaded.png');
        URL.revokeObjectURL = vi.fn();

        act(() => {
            root.render(
                <MetadataViewerDrawer
                    isOpen={true}
                    onClose={vi.fn()}
                    currentLanguage="zh_TW"
                    t={(key) => getTranslation('zh_TW', key as any)}
                    onApplyPrompt={onApplyPrompt}
                />,
            );
        });

        const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
        expect(fileInput).toBeTruthy();

        const itxtBuf = createITXtChunk(
            'nano_banana_meta',
            JSON.stringify({ prompt: 'Uploaded PNG prompt', model: 'gemini-3.1-flash-image' }),
        );
        const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
        const iendChunk = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);
        const fullPng = Buffer.concat([pngHeader, itxtBuf, iendChunk]);

        const pngFile = new File([new Uint8Array(fullPng)], 'uploaded.png', { type: 'image/png' });
        Object.defineProperty(pngFile, 'arrayBuffer', {
            value: () => Promise.resolve(new Uint8Array(fullPng).buffer),
        });

        await act(async () => {
            Object.defineProperty(fileInput, 'files', {
                value: [pngFile],
                configurable: true,
            });
            fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        });

        const previewImg = container.querySelector('[data-testid="metadata-viewer-preview-image"]');
        expect(previewImg).toBeTruthy();

        const applyPromptBtn = container.querySelector(
            '[data-testid="metadata-viewer-apply-prompt"]',
        ) as HTMLButtonElement;
        act(() => {
            applyPromptBtn.click();
        });
        expect(onApplyPrompt).toHaveBeenCalledWith('Uploaded PNG prompt');
    });

    it('handles standalone sidecar JSON file upload and extracts metadata', async () => {
        const onApplyPrompt = vi.fn();

        act(() => {
            root.render(
                <MetadataViewerDrawer
                    isOpen={true}
                    onClose={vi.fn()}
                    currentLanguage="zh_TW"
                    t={(key) => getTranslation('zh_TW', key as any)}
                    onApplyPrompt={onApplyPrompt}
                />,
            );
        });

        const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
        const sidecarContent = JSON.stringify({
            prompt: 'Prompt from standalone JSON',
            model: 'gemini-3.1-flash-lite-image',
            generationMode: 'Text to Image',
            timestamp: '2026-10-29T08:53:34.587Z',
        });
        const jsonFile = new File([sidecarContent], 'gemini_test.json', { type: 'application/json' });
        Object.defineProperty(jsonFile, 'text', {
            value: () => Promise.resolve(sidecarContent),
        });

        await act(async () => {
            Object.defineProperty(fileInput, 'files', {
                value: [jsonFile],
                configurable: true,
            });
            fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        });

        const applyPromptBtn = container.querySelector(
            '[data-testid="metadata-viewer-apply-prompt"]',
        ) as HTMLButtonElement;
        expect(applyPromptBtn).toBeTruthy();

        act(() => {
            applyPromptBtn.click();
        });
        expect(onApplyPrompt).toHaveBeenCalledWith('Prompt from standalone JSON');
    });
});
