import fs from 'fs';
import path from 'path';
import type { Plugin } from 'vite';

/**
 * Vite plugin that provides a server endpoint for saving generated images
 * directly to the local filesystem, bypassing browser download dialogs.
 * 
 * POST /api/save-image
 * Body: JSON { data: string (base64 data URL), filename: string }
 * Response: JSON { success: boolean, path?: string, error?: string }
 */
export function imageSavePlugin(outputDir?: string): Plugin {
    const resolvedDir = outputDir || path.resolve(process.cwd(), 'output');

    return {
        name: 'vite-plugin-image-save',
        configureServer(server) {
            // Ensure output directory exists
            if (!fs.existsSync(resolvedDir)) {
                fs.mkdirSync(resolvedDir, { recursive: true });
            }

            server.middlewares.use('/api/save-image', (req, res) => {
                if (req.method !== 'POST') {
                    res.writeHead(405, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
                    return;
                }

                let body = '';
                req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
                req.on('end', () => {
                    try {
                        const { data, filename, metadata } = JSON.parse(body);

                        if (!data || !filename) {
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: false, error: 'Missing data or filename' }));
                            return;
                        }

                        // Extract raw base64 from data URL
                        const match = data.match(/^data:image\/([\w+]+);base64,(.+)$/);
                        if (!match) {
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: false, error: 'Invalid data URL format' }));
                            return;
                        }

                        const buffer = Buffer.from(match[2], 'base64');
                        const filePath = path.join(resolvedDir, filename);

                        fs.writeFileSync(filePath, buffer);

                        // F5: Write metadata sidecar JSON if provided
                        if (metadata && typeof metadata === 'object') {
                            const jsonPath = filePath.replace(/\.\w+$/, '.json');
                            const sidecar = {
                                ...metadata,
                                filename,
                                timestamp: new Date().toISOString(),
                            };
                            fs.writeFileSync(jsonPath, JSON.stringify(sidecar, null, 2), 'utf-8');
                        }

                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, path: filePath }));
                    } catch (err: any) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, error: err.message }));
                    }
                });
            });

            // F8: Load full image endpoint
            server.middlewares.use('/api/load-image', (req, res) => {
                if (req.method !== 'GET') {
                    res.writeHead(405, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
                    return;
                }

                const url = new URL(req.url!, `http://${req.headers.host}`);
                const filename = url.searchParams.get('filename');

                if (!filename) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Missing filename' }));
                    return;
                }

                // Security: Prevent directory traversal
                const safeFilename = path.basename(filename);
                const filePath = path.join(resolvedDir, safeFilename);

                // Ensure file exists and is within output dir
                if (!fs.existsSync(filePath) || !filePath.startsWith(resolvedDir)) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'File not found' }));
                    return;
                }

                try {
                    const ext = path.extname(filePath).toLowerCase().replace('.', '');
                    const mimeType = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/webp';
                    const fileBuffer = fs.readFileSync(filePath);

                    res.writeHead(200, {
                        'Content-Type': mimeType,
                        'Content-Length': fileBuffer.length
                    });
                    res.end(fileBuffer);
                } catch (err: any) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: err.message }));
                }
            });

            // --- Prompt History Endpoints ---

            // F3 (Permanent): Save prompt history
            server.middlewares.use('/api/save-prompts', (req, res) => {
                if (req.method !== 'POST') {
                    res.writeHead(405, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
                    return;
                }

                let body = '';
                req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
                req.on('end', () => {
                    try {
                        const historyData = JSON.parse(body);
                        const promptsPath = path.join(resolvedDir, 'prompt_history.json');
                        fs.writeFileSync(promptsPath, JSON.stringify(historyData, null, 2), 'utf-8');

                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true }));
                    } catch (err: any) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, error: err.message }));
                    }
                });
            });

            // F3 (Permanent): Load prompt history
            server.middlewares.use('/api/load-prompts', (req, res) => {
                if (req.method !== 'GET') {
                    res.writeHead(405, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
                    return;
                }

                try {
                    const promptsPath = path.join(resolvedDir, 'prompt_history.json');
                    if (fs.existsSync(promptsPath)) {
                        const data = fs.readFileSync(promptsPath, 'utf-8');
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(data);
                    } else {
                        // Return empty array if file does not exist yet
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify([]));
                    }
                } catch (err: any) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: err.message }));
                }
            });

            console.log(`\n  🍌 Image auto-save enabled → ${resolvedDir}\n`);
        }
    };
}
