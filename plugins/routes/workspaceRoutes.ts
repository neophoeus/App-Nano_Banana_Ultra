import fs from 'fs';
import path from 'path';
import { sanitizeQueuedBatchSpaceSnapshot } from '../../utils/queuedBatchSpacePersistence';
import { sanitizeWorkspaceSnapshot } from '../../utils/workspacePersistence';
import { createApiRequestContext, logApiError, logApiRequest, readJsonBody, sendJson } from '../utils/apiHelpers';

type RegisterWorkspaceRoutesArgs = {
    geminiApiKey?: string;
    resolvedDir: string;
};

type FileBackedSnapshotRouteArgs<T extends object> = {
    route: string;
    snapshotPath: string;
    sanitizeSnapshot: (value: unknown) => T;
    hasContent: (snapshot: T) => boolean;
    writeErrorMessage: string;
};

export function registerWorkspaceRoutes(server: any, { geminiApiKey, resolvedDir }: RegisterWorkspaceRoutesArgs): void {
    const registerFileBackedSnapshotRoute = <T extends object>({
        route,
        snapshotPath,
        sanitizeSnapshot,
        hasContent,
        writeErrorMessage,
    }: FileBackedSnapshotRouteArgs<T>) => {
        const snapshotTempPath = `${snapshotPath}.tmp`;

        const isRetryableSnapshotWriteError = (error: unknown) => {
            const code = (error as NodeJS.ErrnoException)?.code;
            return code === 'EBUSY' || code === 'EPERM';
        };

        const cleanupSnapshotTempFile = () => {
            if (fs.existsSync(snapshotTempPath)) {
                fs.unlinkSync(snapshotTempPath);
            }
        };

        const getLatestSnapshotCandidatePath = () => {
            const hasPrimarySnapshot = fs.existsSync(snapshotPath);
            const hasTempSnapshot = fs.existsSync(snapshotTempPath);

            if (hasPrimarySnapshot && hasTempSnapshot) {
                try {
                    const primaryStat = fs.statSync(snapshotPath);
                    const tempStat = fs.statSync(snapshotTempPath);
                    return tempStat.mtimeMs >= primaryStat.mtimeMs ? snapshotTempPath : snapshotPath;
                } catch {
                    return snapshotTempPath;
                }
            }

            if (hasPrimarySnapshot) {
                return snapshotPath;
            }

            if (hasTempSnapshot) {
                return snapshotTempPath;
            }

            return null;
        };

        const hasUnchangedSnapshotPayload = (payload: string) => {
            const candidatePath = getLatestSnapshotCandidatePath();
            if (!candidatePath) {
                return false;
            }

            try {
                return fs.readFileSync(candidatePath, 'utf-8') === payload;
            } catch {
                return false;
            }
        };

        const finalizeSnapshotWrite = (payload: string) => {
            try {
                fs.renameSync(snapshotTempPath, snapshotPath);
                return;
            } catch (error) {
                if (!isRetryableSnapshotWriteError(error)) {
                    throw error;
                }
            }

            try {
                fs.copyFileSync(snapshotTempPath, snapshotPath);
                cleanupSnapshotTempFile();
                return;
            } catch (error) {
                if (!isRetryableSnapshotWriteError(error)) {
                    throw error;
                }
            }

            fs.writeFileSync(snapshotPath, payload, 'utf-8');
            cleanupSnapshotTempFile();
        };

        const writeSnapshotWithRetry = (snapshot: T) => {
            const payload = JSON.stringify(snapshot, null, 2);
            let lastError: unknown = null;

            if (hasUnchangedSnapshotPayload(payload)) {
                try {
                    cleanupSnapshotTempFile();
                } catch {
                    // Best-effort cleanup of stale temp state.
                }
                return;
            }

            for (let attempt = 0; attempt < 3; attempt += 1) {
                try {
                    fs.writeFileSync(snapshotTempPath, payload, 'utf-8');
                    finalizeSnapshotWrite(payload);
                    return;
                } catch (error) {
                    lastError = error;
                    if (isRetryableSnapshotWriteError(error)) {
                        if (attempt === 2 && fs.existsSync(snapshotTempPath)) {
                            return;
                        }
                    } else {
                        try {
                            cleanupSnapshotTempFile();
                        } catch {
                            // Best-effort temp cleanup before surfacing a non-retryable write failure.
                        }
                    }

                    if (!isRetryableSnapshotWriteError(error) || attempt === 2) {
                        throw error;
                    }

                    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50 * (attempt + 1));
                }
            }

            throw lastError instanceof Error ? lastError : new Error(writeErrorMessage);
        };

        const clearSnapshotFiles = () => {
            if (fs.existsSync(snapshotPath)) {
                fs.unlinkSync(snapshotPath);
            }
            if (fs.existsSync(snapshotTempPath)) {
                fs.unlinkSync(snapshotTempPath);
            }
        };

        const loadSnapshotBackup = () => {
            const candidatePath = getLatestSnapshotCandidatePath();

            if (!candidatePath) {
                return null;
            }

            const data = fs.readFileSync(candidatePath, 'utf-8');
            return sanitizeSnapshot(JSON.parse(data));
        };

        server.use(route, async (req: any, res: any) => {
            const requestContext = createApiRequestContext(req, route);

            if (req.method === 'GET') {
                logApiRequest(requestContext, {
                    source: 'workspace',
                    snapshotPath,
                    phase: 'load',
                });
                try {
                    const snapshot = loadSnapshotBackup();
                    if (!snapshot) {
                        sendJson(res, 200, { snapshot: null }, {
                            requestContext,
                            summary: 'No snapshot backup found',
                            details: {
                                source: 'workspace',
                                snapshotPath,
                                phase: 'load',
                            },
                        });
                        return;
                    }

                    sendJson(res, 200, snapshot, {
                        requestContext,
                        summary: 'Snapshot backup loaded',
                        details: {
                            source: 'workspace',
                            snapshotPath,
                            phase: 'load',
                        },
                    });
                } catch (error: any) {
                    logApiError(route, error, { method: 'GET', snapshotPath, phase: 'load' }, requestContext);
                    try {
                        clearSnapshotFiles();
                    } catch {
                        // Best-effort cleanup of a corrupt or half-written backup file.
                    }
                    sendJson(res, 200, { snapshot: null, recoveredFromError: true }, {
                        requestContext,
                        summary: 'Recovered from corrupt snapshot backup',
                        details: {
                            source: 'workspace',
                            snapshotPath,
                            phase: 'load',
                            recoveredFromError: true,
                        },
                    });
                }
                return;
            }

            if (req.method !== 'POST') {
                sendJson(res, 405, { error: 'Method not allowed' }, { requestContext, summary: 'Method not allowed' });
                return;
            }

            try {
                const snapshot = await readJsonBody<Record<string, unknown>>(req);
                const normalizedSnapshot = sanitizeSnapshot(snapshot);
                logApiRequest(requestContext, {
                    source: 'workspace',
                    snapshotPath,
                    phase: 'save',
                    hasContent: hasContent(normalizedSnapshot),
                });

                if (!hasContent(normalizedSnapshot)) {
                    clearSnapshotFiles();
                    sendJson(res, 200, { success: true, path: snapshotPath, cleared: true }, {
                        requestContext,
                        summary: 'Snapshot backup cleared',
                        details: {
                            source: 'workspace',
                            snapshotPath,
                            phase: 'save',
                            cleared: true,
                        },
                    });
                    return;
                }

                writeSnapshotWithRetry(normalizedSnapshot);
                sendJson(res, 200, { success: true, path: snapshotPath }, {
                    requestContext,
                    summary: 'Snapshot backup saved',
                    details: {
                        source: 'workspace',
                        snapshotPath,
                        phase: 'save',
                    },
                });
            } catch (error: any) {
                logApiError(route, error, { method: 'POST', snapshotPath, phase: 'save' }, requestContext);
                sendJson(
                    res,
                    200,
                    {
                        success: false,
                        path: snapshotPath,
                        error: error.message || writeErrorMessage,
                    },
                    {
                        requestContext,
                        summary: error.message || writeErrorMessage,
                        details: {
                            source: 'workspace',
                            snapshotPath,
                            phase: 'save',
                            success: false,
                        },
                    },
                );
            }
        });
    };

    server.use('/api/health', (req: any, res: any) => {
        const requestContext = createApiRequestContext(req, '/api/health');
        logApiRequest(requestContext, {
            source: 'workspace',
            outputDir: resolvedDir,
        });
        sendJson(
            res,
            200,
            {
                ok: true,
                hasApiKey: Boolean(geminiApiKey || process.env.GEMINI_API_KEY),
                outputDir: resolvedDir,
                timestamp: new Date().toISOString(),
            },
            {
                requestContext,
                summary: 'Health check',
                details: {
                    source: 'workspace',
                    hasApiKey: Boolean(geminiApiKey || process.env.GEMINI_API_KEY),
                },
            },
        );
    });

    server.use('/api/runtime-config', (req: any, res: any) => {
        const requestContext = createApiRequestContext(req, '/api/runtime-config');
        const hasApiKey = Boolean(geminiApiKey || process.env.GEMINI_API_KEY);
        logApiRequest(requestContext, {
            source: 'runtime',
        });
        sendJson(
            res,
            200,
            { hasApiKey },
            {
                requestContext,
                summary: hasApiKey ? 'API key available' : 'API key missing',
                details: {
                    source: 'runtime',
                    hasApiKey,
                },
            },
        );
    });

    registerFileBackedSnapshotRoute({
        route: '/api/workspace-snapshot',
        snapshotPath: path.join(resolvedDir, 'workspace_snapshot.json'),
        sanitizeSnapshot: sanitizeWorkspaceSnapshot,
        hasContent: ({ history, stagedAssets, workflowLogs, viewState, composerState, workspaceSession }) =>
            Boolean(
                history.length ||
                stagedAssets.length ||
                workflowLogs.length ||
                viewState.generatedImageUrls.length ||
                viewState.selectedHistoryId ||
                composerState.prompt.trim() ||
                workspaceSession.activeResult ||
                workspaceSession.sourceHistoryId ||
                workspaceSession.conversationId,
            ),
        writeErrorMessage: 'Failed to save workspace snapshot backup.',
    });

    registerFileBackedSnapshotRoute({
        route: '/api/queued-batch-space',
        snapshotPath: path.join(resolvedDir, 'queued_batch_space.json'),
        sanitizeSnapshot: sanitizeQueuedBatchSpaceSnapshot,
        hasContent: (normalizedSnapshot) => normalizedSnapshot.queuedJobs.length > 0,
        writeErrorMessage: 'Failed to save queued batch space backup.',
    });
}
