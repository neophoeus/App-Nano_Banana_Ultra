import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PassThrough, Readable } from 'node:stream';
import { afterEach, describe, expect, it } from 'vitest';
import { imageSavePlugin } from '../plugins/imageSavePlugin';
import {
    createApiRequestContext,
    enforceSameOriginRequest,
    isAllowedLocalOrigin,
    readJsonBody,
} from '../plugins/utils/apiHelpers';
import { validateCapabilityRequest } from '../plugins/utils/requestConfig';

const tempDirs: string[] = [];

const createTempOutputDir = () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nbu-sec-test-'));
    tempDirs.push(dir);
    return dir;
};

afterEach(() => {
    while (tempDirs.length > 0) {
        const dir = tempDirs.pop();
        if (dir && fs.existsSync(dir)) {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    }
});

describe('securityAndApiHelpers', () => {
    it('reassembles multi-byte UTF-8 characters split across TCP chunks without U+FFFD corruption', async () => {
        const payload = {
            prompt: '一隻穿著太空衣的香蕉 🍌🍌 在東京霓虹街頭漫步',
            nested: { note: '測試多位元組切塊邊界' },
        };
        const fullBuffer = Buffer.from(JSON.stringify(payload), 'utf8');
        const stream = new PassThrough();

        const readPromise = readJsonBody<typeof payload>(stream);

        // Split every 2 bytes so 3-byte CJK and 4-byte emoji sequences are guaranteed to be split mid-character
        for (let offset = 0; offset < fullBuffer.length; offset += 2) {
            stream.write(fullBuffer.subarray(offset, Math.min(offset + 2, fullBuffer.length)));
        }
        stream.end();

        const parsed = await readPromise;
        expect(parsed).toEqual(payload);
        expect(parsed.prompt).not.toContain('\uFFFD');
    });

    it('rejects oversized JSON request bodies with statusCode 413', async () => {
        const stream = Readable.from([Buffer.from(JSON.stringify({ large: 'x'.repeat(256) }), 'utf8')]);

        await expect(readJsonBody(stream, 64)).rejects.toMatchObject({
            statusCode: 413,
        });
    });

    it('validates local origins and blocks cross-site or mismatched Origin requests with 403', () => {
        expect(isAllowedLocalOrigin('http://127.0.0.1:22287', '127.0.0.1:22287')).toBe(true);
        expect(isAllowedLocalOrigin('http://localhost:22287', '127.0.0.1:22287')).toBe(true);
        expect(isAllowedLocalOrigin('https://evil.example.com', '127.0.0.1:22287')).toBe(false);
        expect(isAllowedLocalOrigin('http://127.0.0.1:9999', '127.0.0.1:22287')).toBe(false);

        let status = 200;
        let responseBody = '';
        const mockRes = {
            writeHead(nextStatus: number) {
                status = nextStatus;
            },
            end(payload: string) {
                responseBody = payload;
            },
        };

        const crossSiteReq = {
            method: 'POST',
            headers: {
                host: '127.0.0.1:22287',
                'sec-fetch-site': 'cross-site',
            },
        };
        const allowed = enforceSameOriginRequest(
            crossSiteReq,
            mockRes,
            createApiRequestContext(crossSiteReq, '/api/save-image'),
        );
        expect(allowed).toBe(false);
        expect(status).toBe(403);
        expect(JSON.parse(responseBody)).toEqual({
            error: 'Cross-origin requests are not allowed.',
        });
    });

    it('registers /api/save-image, /api/load-image, and /api/load-image-metadata on preview server and blocks cross-origin requests', async () => {
        const outputDir = createTempOutputDir();
        const plugin = imageSavePlugin({ geminiApiKey: 'test-key', outputDir });
        const previewHandlers = new Map<string, (req: any, res: any) => void | Promise<void>>();

        const configurePreviewServer =
            typeof plugin.configurePreviewServer === 'function'
                ? plugin.configurePreviewServer
                : plugin.configurePreviewServer?.handler;
        expect(configurePreviewServer).toBeTypeOf('function');

        configurePreviewServer?.({
            middlewares: {
                use(route: string, handler: (req: any, res: any) => void | Promise<void>) {
                    previewHandlers.set(route, handler);
                },
            },
        } as any);

        expect(previewHandlers.has('/api/save-image')).toBe(true);
        expect(previewHandlers.has('/api/load-image')).toBe(true);
        expect(previewHandlers.has('/api/load-image-metadata')).toBe(true);
        expect(previewHandlers.has('/api/export-results')).toBe(true);

        // Verify cross-origin request to /api/save-image is blocked with 403
        const saveImageHandler = previewHandlers.get('/api/save-image')!;
        let blockedStatus = 200;
        await saveImageHandler(
            {
                method: 'POST',
                headers: {
                    host: '127.0.0.1:22287',
                    origin: 'https://attacker.invalid',
                },
            },
            {
                writeHead(nextStatus: number) {
                    blockedStatus = nextStatus;
                },
                end() {},
            },
        );
        expect(blockedStatus).toBe(403);

        // Verify /api/export-results rejects UNC paths with 400
        const exportHandler = previewHandlers.get('/api/export-results')!;
        const uncReq = Readable.from([
            Buffer.from(JSON.stringify({ targetDir: '\\\\evil-server\\share', items: [] }), 'utf8'),
        ]) as Readable & { method: string; headers: Record<string, string> };
        uncReq.method = 'POST';
        uncReq.headers = { host: '127.0.0.1:22287' };

        let exportStatus = 200;
        let exportPayload: any = null;
        await new Promise<void>((resolve) => {
            exportHandler(uncReq, {
                writeHead(nextStatus: number) {
                    exportStatus = nextStatus;
                },
                end(payload: string) {
                    exportPayload = JSON.parse(payload);
                    resolve();
                },
            });
        });

        expect(exportStatus).toBe(400);
        expect(exportPayload).toEqual({
            success: false,
            error: 'Invalid target directory path.',
        });
    });

    it('rejects out-of-range temperature values in validateCapabilityRequest', () => {
        expect(
            validateCapabilityRequest('gemini-3.1-flash-image', {
                temperature: 2.5,
            }),
        ).toBe('Temperature must be a finite number between 0 and 2.');
        expect(
            validateCapabilityRequest('gemini-3.1-flash-image', {
                temperature: -0.1,
            }),
        ).toBe('Temperature must be a finite number between 0 and 2.');
        expect(
            validateCapabilityRequest('gemini-3.1-flash-image', {
                temperature: 1,
            }),
        ).toBeNull();
    });
});
