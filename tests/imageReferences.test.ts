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
});
