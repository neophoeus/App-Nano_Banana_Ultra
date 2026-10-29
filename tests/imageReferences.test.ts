import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildGenerateParts } from '../plugins/utils/imageReferences';

const ONE_BY_ONE_PNG_BASE64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZ0AAAAASUVORK5CYII=';

const tempDirs: string[] = [];

afterEach(() => {
    while (tempDirs.length > 0) {
        const nextDir = tempDirs.pop();
        if (nextDir && fs.existsSync(nextDir)) {
            fs.rmSync(nextDir, { recursive: true, force: true });
        }
    }
});

describe('imageReferences', () => {
    it('resolves file-backed load-image URLs into inline image parts', () => {
        const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nano-banana-image-ref-'));
        tempDirs.push(outputDir);
        fs.writeFileSync(path.join(outputDir, 'queued-source.png'), Buffer.from(ONE_BY_ONE_PNG_BASE64, 'base64'));

        const parts = buildGenerateParts(
            {
                prompt: 'Queue a staged follow-up edit',
                editingInput: '/api/load-image?filename=queued-source.png',
            },
            outputDir,
        );

        expect(parts).toEqual([
            { text: '[Edit_1]' },
            {
                inlineData: {
                    mimeType: 'image/png',
                    data: ONE_BY_ONE_PNG_BASE64,
                },
            },
            { text: 'Queue a staged follow-up edit' },
        ]);
    });

    it('fails early when a referenced file-backed input cannot be loaded', () => {
        const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nano-banana-image-ref-missing-'));
        tempDirs.push(outputDir);

        expect(() =>
            buildGenerateParts(
                {
                    prompt: 'Queue a staged follow-up edit',
                    editingInput: '/api/load-image?filename=missing-source.png',
                },
                outputDir,
            ),
        ).toThrow('Referenced image file could not be loaded: missing-source.png');
    });

    it('attaches role-aware per-part mediaResolution for Gemini 3 and Gemini 4 models', () => {
        const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nano-banana-image-ref-roles-'));
        tempDirs.push(outputDir);
        fs.writeFileSync(path.join(outputDir, 'char.png'), Buffer.from(ONE_BY_ONE_PNG_BASE64, 'base64'));
        fs.writeFileSync(path.join(outputDir, 'style.png'), Buffer.from(ONE_BY_ONE_PNG_BASE64, 'base64'));
        fs.writeFileSync(path.join(outputDir, 'edit.png'), Buffer.from(ONE_BY_ONE_PNG_BASE64, 'base64'));

        const parts4k = buildGenerateParts(
            {
                model: 'gemini-nano-banana-2.1',
                imageSize: '4K',
                prompt: 'Create high precision character render',
                characterImageInputs: ['/api/load-image?filename=char.png'],
                editingInput: '/api/load-image?filename=edit.png',
            },
            outputDir,
        );

        // Character reference gets ULTRA_HIGH (2,240 tokens)
        const charPart = parts4k.find(
            (p) => p.inlineData && p.mediaResolution?.level === 'MEDIA_RESOLUTION_ULTRA_HIGH',
        );
        expect(charPart).toBeTruthy();
        expect(parts4k).toContainEqual({
            text: '[Char_1]',
        });
        expect(parts4k).toContainEqual({
            inlineData: { mimeType: 'image/png', data: ONE_BY_ONE_PNG_BASE64 },
            mediaResolution: { level: 'MEDIA_RESOLUTION_ULTRA_HIGH' },
        });

        // 4K Edit gets ULTRA_HIGH
        expect(parts4k[1]).toEqual({
            inlineData: { mimeType: 'image/png', data: ONE_BY_ONE_PNG_BASE64 },
            mediaResolution: { level: 'MEDIA_RESOLUTION_ULTRA_HIGH' },
        });

        // Style reference on gemini-3-pro-image gets MEDIUM (560 tokens, 50% savings)
        const partsPro = buildGenerateParts(
            {
                model: 'gemini-3-pro-image',
                imageSize: '1K',
                prompt: 'Apply style transfer',
                styleImageInputs: ['/api/load-image?filename=style.png'],
                editingInput: '/api/load-image?filename=edit.png',
            },
            outputDir,
        );

        expect(partsPro).toContainEqual({
            inlineData: { mimeType: 'image/png', data: ONE_BY_ONE_PNG_BASE64 },
            mediaResolution: { level: 'MEDIA_RESOLUTION_MEDIUM' },
        });
        // 1K Edit gets HIGH (1,120 tokens)
        expect(partsPro[1]).toEqual({
            inlineData: { mimeType: 'image/png', data: ONE_BY_ONE_PNG_BASE64 },
            mediaResolution: { level: 'MEDIA_RESOLUTION_HIGH' },
        });
    });

    it('does not attach per-part mediaResolution for gemini-2.5-flash-image', () => {
        const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nano-banana-image-ref-25-'));
        tempDirs.push(outputDir);
        fs.writeFileSync(path.join(outputDir, 'sample.png'), Buffer.from(ONE_BY_ONE_PNG_BASE64, 'base64'));

        const parts25 = buildGenerateParts(
            {
                model: 'gemini-2.5-flash-image',
                prompt: 'Legacy flash image test',
                objectImageInputs: ['/api/load-image?filename=sample.png'],
            },
            outputDir,
        );

        expect(parts25).toEqual([
            { text: '[Obj_1]' },
            {
                inlineData: {
                    mimeType: 'image/png',
                    data: ONE_BY_ONE_PNG_BASE64,
                },
            },
            { text: 'Legacy flash image test' },
        ]);
        expect(parts25[1].mediaResolution).toBeUndefined();
    });
});
