import fs from 'fs';
import path from 'path';
import os from 'os';
import { Readable } from 'stream';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { registerWorkspaceRoutes } from '../plugins/routes/workspaceRoutes';
import { readImageMetadata, type EmbeddedNanoBananaMeta } from '../plugins/utils/imageMetadataEmbedder';

// Minimal 1x1 PNG generator
const createTestPng = (): Buffer => {
    return Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00,
        0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
        0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x62, 0x60, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc,
        0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ]);
};

type MiddlewareHandler = (req: any, res: any) => void | Promise<void>;

const invokeJsonRoute = async (handler: MiddlewareHandler, body: unknown, method = 'POST') => {
    const chunks = body !== undefined ? [JSON.stringify(body)] : [];
    const req = Readable.from(chunks) as Readable & {
        method: string;
        url?: string;
        headers?: Record<string, string>;
    };
    req.method = method;
    req.url = '/api/export-results';
    req.headers = { host: '127.0.0.1:22287', 'content-type': 'application/json' };

    return await new Promise<{ status: number; body: any }>((resolve, reject) => {
        let status = 200;
        const res = {
            writeHead(nextStatus: number) {
                status = nextStatus;
            },
            end(payload: string) {
                try {
                    resolve({ status, body: JSON.parse(payload) });
                } catch (err) {
                    reject(err);
                }
            },
        };
        Promise.resolve(handler(req, res)).catch(reject);
    });
};

describe('Export Results Route (/api/export-results)', () => {
    let testOutputDir: string;
    let testSourceDir: string;
    let exportHandler: MiddlewareHandler;
    let clearOutputHandler: MiddlewareHandler;

    beforeEach(() => {
        testOutputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nbu-export-test-'));
        testSourceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nbu-source-test-'));
        const routes = new Map<string, MiddlewareHandler>();
        const mockServer = {
            use(route: string, handler: MiddlewareHandler) {
                routes.set(route, handler);
            },
        };
        registerWorkspaceRoutes(mockServer, { geminiApiKey: 'test-key', resolvedDir: testSourceDir });
        exportHandler = routes.get('/api/export-results')!;
        clearOutputHandler = routes.get('/api/clear-output')!;
    });

    afterEach(() => {
        try {
            fs.rmSync(testOutputDir, { recursive: true, force: true });
            fs.rmSync(testSourceDir, { recursive: true, force: true });
        } catch {
            // Ignore cleanup errors
        }
    });

    it('exports data-url images with embedded metadata and resolves filename collisions via POST /api/export-results', async () => {
        const pngBuf = createTestPng();
        const dataUrl = `data:image/png;base64,${pngBuf.toString('base64')}`;

        const meta1: EmbeddedNanoBananaMeta = {
            id: 'turn-1',
            prompt: 'Test prompt 1',
            model: 'gemini-3.1-flash-image',
            aspectRatio: '1:1',
            size: '1K',
            style: 'Anime',
            exportSourceType: 'product',
            parentHistoryId: 'turn-1',
        };

        const meta2: EmbeddedNanoBananaMeta = {
            id: 'turn-2',
            prompt: 'Test prompt 2',
            model: 'gemini-3.1-flash-image',
            aspectRatio: '1:1',
            size: '1K',
            style: 'Realistic',
            exportSourceType: 'product',
            parentHistoryId: 'turn-2',
        };

        const response = await invokeJsonRoute(exportHandler, {
            targetDir: `" ${testOutputDir} "`,
            items: [
                { imageUrl: dataUrl, baseFilename: 'banana_export', metadata: meta1 },
                { imageUrl: dataUrl, baseFilename: 'banana_export', metadata: meta2 },
            ],
        });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.exportedCount).toBe(2);

        const file1Path = path.join(testOutputDir, 'banana_export.png');
        const file2Path = path.join(testOutputDir, 'banana_export_1.png');
        expect(fs.existsSync(file1Path)).toBe(true);
        expect(fs.existsSync(file2Path)).toBe(true);

        const read1 = readImageMetadata(fs.readFileSync(file1Path));
        expect(read1.parameters).toContain('Test prompt 1');
        expect(read1.parameters).toContain('Anime');

        const read2 = readImageMetadata(fs.readFileSync(file2Path));
        expect(read2.parameters).toContain('Test prompt 2');
        expect(read2.parameters).toContain('Realistic');
    });

    it('loads source image from resolvedDir and merges sidecar .json metadata automatically', async () => {
        const sourcePng = createTestPng();
        const sourceFileName = 'source_test_sidecar.png';
        fs.writeFileSync(path.join(testSourceDir, sourceFileName), sourcePng);

        const sidecarContent = {
            outputFormat: 'png',
            actualOutput: { width: 1024, height: 1024, mimeType: 'image/png' },
            groundingMode: 'google-search',
            groundingSources: [{ title: 'Example Ref', url: 'https://example.com' }],
            temperature: 0.7,
            thinkingLevel: 'high',
        };
        fs.writeFileSync(path.join(testSourceDir, 'source_test_sidecar.json'), JSON.stringify(sidecarContent));

        const inputMeta: EmbeddedNanoBananaMeta = {
            id: 'turn-sidecar-1',
            prompt: 'Sidecar test prompt',
            model: 'gemini-3.1-flash-image',
            aspectRatio: '1:1',
            size: '1K',
            style: 'Anime',
            exportSourceType: 'product',
            parentHistoryId: 'turn-sidecar-1',
        };

        const response = await invokeJsonRoute(exportHandler, {
            targetDir: testOutputDir,
            items: [
                {
                    imageUrl: `/api/load-image?filename=${encodeURIComponent(sourceFileName)}`,
                    baseFilename: 'sidecar_merged',
                    metadata: inputMeta,
                },
            ],
        });

        expect(response.status).toBe(200);
        expect(response.body.exportedCount).toBe(1);

        const outPath = path.join(testOutputDir, 'sidecar_merged.png');
        const extracted = readImageMetadata(fs.readFileSync(outPath));
        expect(extracted.parameters).toContain('1024x1024 (image/png)');
        expect(extracted.parameters).toContain('google-search');
        expect(extracted.parameters).toContain('Example Ref (https://example.com)');
        expect(extracted.parameters).toContain('Temperature: 0.7');
    });

    it('returns 400 Bad Request for illegal characters in targetDir or when targetDir equals workspace output directory', async () => {
        const invalidCharRes = await invokeJsonRoute(exportHandler, {
            targetDir: 'D:\\Invalid*Dir?Name',
            items: [],
        });
        expect(invalidCharRes.status).toBe(400);
        expect(invalidCharRes.body.success).toBe(false);

        const sameDirRes = await invokeJsonRoute(exportHandler, {
            targetDir: testSourceDir,
            items: [],
        });
        expect(sameDirRes.status).toBe(400);
        expect(sameDirRes.body.success).toBe(false);
        expect(sameDirRes.body.error).toContain('cannot be the same');
    });

    it('clears images and sidecars via POST /api/clear-output while preserving queued_batch_space.json', async () => {
        // Create dummy files in testSourceDir
        const img1 = path.join(testSourceDir, 'test1.jpg');
        const json1 = path.join(testSourceDir, 'test1.json');
        const batchFile = path.join(testSourceDir, 'queued_batch_space.json');
        const batchTmp = path.join(testSourceDir, 'queued_batch_space.json.tmp');

        fs.writeFileSync(img1, 'fake-image');
        fs.writeFileSync(json1, '{}');
        fs.writeFileSync(batchFile, '{"queuedJobs":[]}');
        fs.writeFileSync(batchTmp, '{"queuedJobs":[]}');

        const res = await invokeJsonRoute(clearOutputHandler, {}, 'POST');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.deletedCount).toBe(2);

        expect(fs.existsSync(img1)).toBe(false);
        expect(fs.existsSync(json1)).toBe(false);
        expect(fs.existsSync(batchFile)).toBe(true);
        expect(fs.existsSync(batchTmp)).toBe(true);
    });
});
