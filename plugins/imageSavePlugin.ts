import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import type { Plugin } from 'vite';
import { sendClassifiedApiError, sendJson } from './utils/apiHelpers';
import { extractImageDetailsFromDataUrl } from './utils/imageDimensions';
import { registerBatchRoutes } from './routes/batchRoutes';
import { registerGenerateRoutes } from './routes/generateRoutes';
import { registerPromptRoutes } from './routes/promptRoutes';
import { registerWorkspaceRoutes } from './routes/workspaceRoutes';

type ImageSavePluginOptions = {
    outputDir?: string;
    geminiApiKey?: string;
};

const resolveSafeOutputFilePath = (resolvedDir: string, filename: string) =>
    path.join(resolvedDir, path.basename(filename));

const resolveSidecarPath = (filePath: string) => {
    const parsedPath = path.parse(filePath);
    return path.join(parsedPath.dir, `${parsedPath.name}.json`);
};

function registerMiddlewares(server: any, resolvedDir: string, geminiApiKey?: string): void {
    let aiClient: GoogleGenAI | null = null;

    const getAIClient = () => {
        const apiKey = geminiApiKey || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('Missing GEMINI_API_KEY. Add it to .env.local and restart the dev server.');
        }
        if (!aiClient) {
            aiClient = new GoogleGenAI({ apiKey });
        }
        return aiClient;
    };

    if (!fs.existsSync(resolvedDir)) {
        fs.mkdirSync(resolvedDir, { recursive: true });
    }

    registerWorkspaceRoutes(server, { geminiApiKey, resolvedDir });
    registerPromptRoutes(server, { getAIClient });
    registerGenerateRoutes(server, { getAIClient, resolvedDir });
    registerBatchRoutes(server, { getAIClient, resolvedDir });
}

/**
 * Vite plugin that provides a server endpoint for saving generated images
 * directly to the local filesystem, bypassing browser download dialogs.
 *
 * POST /api/save-image
 * Body: JSON { data: string (base64 data URL), filename: string }
 * Response: JSON { success: boolean, path?: string, error?: string }
 */
export function imageSavePlugin(options?: ImageSavePluginOptions): Plugin {
    const resolvedDir = options?.outputDir || path.resolve(process.cwd(), 'output');

    return {
        name: 'vite-plugin-image-save',
        configureServer(server) {
            registerMiddlewares(server.middlewares, resolvedDir, options?.geminiApiKey);

            server.middlewares.use('/api/save-image', (req, res) => {
                if (req.method !== 'POST') {
                    sendJson(res, 405, { success: false, error: 'Method not allowed' });
                    return;
                }

                let body = '';
                req.on('data', (chunk: Buffer) => {
                    body += chunk.toString();
                });
                req.on('end', () => {
                    try {
                        const { data, filename, metadata } = JSON.parse(body);

                        if (!data || !filename) {
                            sendJson(res, 400, { success: false, error: 'Missing data or filename' });
                            return;
                        }

                        // Extract raw base64 from data URL
                        const match = data.match(/^data:image\/([\w+]+);base64,(.+)$/);
                        if (!match) {
                            sendJson(res, 400, { success: false, error: 'Invalid data URL format' });
                            return;
                        }

                        const buffer = Buffer.from(match[2], 'base64');
                        const imageDetails = extractImageDetailsFromDataUrl(data);
                        // Prevent directory traversal attacks
                        const safeFilename = path.basename(filename);
                        const filePath = resolveSafeOutputFilePath(resolvedDir, safeFilename);

                        fs.writeFileSync(filePath, buffer);

                        // F5: Write metadata sidecar JSON if provided
                        if (metadata && typeof metadata === 'object') {
                            const jsonPath = resolveSidecarPath(filePath);
                            const sidecar = {
                                ...metadata,
                                actualOutput: imageDetails?.dimensions
                                    ? {
                                          width: imageDetails.dimensions.width,
                                          height: imageDetails.dimensions.height,
                                          mimeType: imageDetails.mimeType,
                                      }
                                    : null,
                                filename: safeFilename,
                                timestamp: new Date().toISOString(),
                            };
                            fs.writeFileSync(jsonPath, JSON.stringify(sidecar, null, 2), 'utf-8');
                        }

                        sendJson(res, 200, { success: true, path: filePath });
                    } catch (err: any) {
                        sendClassifiedApiError(res, '/api/save-image', err, 'Failed to save image', {
                            basePayload: { success: false },
                            defaultStatus: 500,
                        });
                    }
                });
            });

            // F8: Load full image endpoint
            server.middlewares.use('/api/load-image', (req, res) => {
                if (req.method !== 'GET') {
                    sendJson(res, 405, { success: false, error: 'Method not allowed' });
                    return;
                }

                const url = new URL(req.url!, `http://${req.headers.host}`);
                const filename = url.searchParams.get('filename');

                if (!filename) {
                    sendJson(res, 400, { success: false, error: 'Missing filename' });
                    return;
                }

                // Security: Prevent directory traversal
                const safeFilename = path.basename(filename);
                const filePath = resolveSafeOutputFilePath(resolvedDir, safeFilename);

                // Ensure file exists and is within output dir
                if (!fs.existsSync(filePath) || !filePath.startsWith(resolvedDir)) {
                    sendJson(res, 404, { success: false, error: 'File not found' });
                    return;
                }

                try {
                    const ext = path.extname(filePath).toLowerCase().replace('.', '');
                    const mimeType =
                        ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/webp';
                    const fileBuffer = fs.readFileSync(filePath);

                    res.writeHead(200, {
                        'Content-Type': mimeType,
                        'Content-Length': fileBuffer.length,
                    });
                    res.end(fileBuffer);
                } catch (err: any) {
                    sendClassifiedApiError(res, '/api/load-image', err, 'Failed to load image', {
                        basePayload: { success: false },
                        defaultStatus: 500,
                    });
                }
            });

            server.middlewares.use('/api/load-image-metadata', (req, res) => {
                if (req.method !== 'GET') {
                    sendJson(res, 405, { success: false, error: 'Method not allowed' });
                    return;
                }

                const url = new URL(req.url!, `http://${req.headers.host}`);
                const filename = url.searchParams.get('filename');

                if (!filename) {
                    sendJson(res, 400, { success: false, error: 'Missing filename' });
                    return;
                }

                const safeFilename = path.basename(filename);
                const filePath = resolveSafeOutputFilePath(resolvedDir, safeFilename);
                const sidecarPath = resolveSidecarPath(filePath);

                if (!fs.existsSync(sidecarPath) || !sidecarPath.startsWith(resolvedDir)) {
                    sendJson(res, 404, { success: false, error: 'Metadata not found' });
                    return;
                }

                try {
                    const sidecar = fs.readFileSync(sidecarPath, 'utf-8');
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(sidecar);
                } catch (err: any) {
                    sendClassifiedApiError(res, '/api/load-image-metadata', err, 'Failed to load image metadata', {
                        basePayload: { success: false },
                        defaultStatus: 500,
                    });
                }
            });

            console.log(`\n  🍌 Image auto-save enabled → ${resolvedDir}\n`);
            console.log('  🍌 Health check → /api/health');
        },
        configurePreviewServer(server) {
            registerMiddlewares(server.middlewares, resolvedDir, options?.geminiApiKey);
        },
    };
}
