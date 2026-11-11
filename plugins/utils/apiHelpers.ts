export const DEBUG_REQUEST_ID_HEADER = 'X-NBU-Debug-Request-ID';

export type ApiRequestContext = {
    route: string;
    method: string;
    requestId?: string;
    startedAt: number;
};

const getRequestHeader = (req: any, headerName: string): string | undefined => {
    const headerValue = req?.headers?.[headerName.toLowerCase()] ?? req?.headers?.[headerName];

    if (Array.isArray(headerValue)) {
        return headerValue.find((value) => typeof value === 'string' && value.trim().length > 0)?.trim();
    }

    return typeof headerValue === 'string' && headerValue.trim().length > 0 ? headerValue.trim() : undefined;
};

const buildApiResponseHeaders = (
    headers: Record<string, string>,
    requestContext?: ApiRequestContext,
): Record<string, string> => {
    if (!requestContext?.requestId) {
        return headers;
    }

    return {
        ...headers,
        [DEBUG_REQUEST_ID_HEADER]: requestContext.requestId,
    };
};

const getRequestDurationMs = (requestContext?: ApiRequestContext): number | undefined => {
    if (!requestContext) {
        return undefined;
    }

    return Date.now() - requestContext.startedAt;
};

export function createApiRequestContext(req: any, route: string): ApiRequestContext {
    return {
        route,
        method: String(req?.method || 'GET').toUpperCase(),
        requestId: getRequestHeader(req, DEBUG_REQUEST_ID_HEADER),
        startedAt: Date.now(),
    };
}

export function logApiRequest(requestContext: ApiRequestContext, details?: Record<string, unknown>): void {
    console.log('[Nano Banana API]', {
        kind: 'request',
        route: requestContext.route,
        method: requestContext.method,
        requestId: requestContext.requestId,
        ...(details || {}),
    });
}

export function logApiResponse(
    requestContext: ApiRequestContext,
    status: number,
    details?: Record<string, unknown>,
): void {
    console.log('[Nano Banana API]', {
        kind: 'response',
        route: requestContext.route,
        method: requestContext.method,
        requestId: requestContext.requestId,
        status,
        durationMs: getRequestDurationMs(requestContext),
        ...(details || {}),
    });
}

export const DEFAULT_MAX_JSON_BODY_BYTES = 50 * 1024 * 1024;

const isLoopbackHostname = (hostname: string): boolean => {
    const normalized = hostname.trim().toLowerCase();
    return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '[::1]' || normalized === '::1';
};

const parseHostAndPort = (rawHost: string): { hostname: string; port: string } => {
    try {
        const parsed = new URL(`http://${rawHost}`);
        return {
            hostname: parsed.hostname.toLowerCase(),
            port: parsed.port || '80',
        };
    } catch {
        return {
            hostname: rawHost.trim().toLowerCase(),
            port: '',
        };
    }
};

export function isAllowedLocalOrigin(originHeader?: string, hostHeader?: string): boolean {
    if (!originHeader) {
        return true;
    }

    try {
        const parsedOrigin = new URL(originHeader);
        if (parsedOrigin.protocol !== 'http:' && parsedOrigin.protocol !== 'https:') {
            return false;
        }

        if (!hostHeader) {
            return isLoopbackHostname(parsedOrigin.hostname);
        }

        const originHost = parsedOrigin.host.toLowerCase();
        const targetHost = hostHeader.trim().toLowerCase();
        if (originHost === targetHost) {
            return true;
        }

        const parsedTarget = parseHostAndPort(targetHost);
        const originPort = parsedOrigin.port || (parsedOrigin.protocol === 'https:' ? '443' : '80');
        if (
            isLoopbackHostname(parsedOrigin.hostname) &&
            isLoopbackHostname(parsedTarget.hostname) &&
            originPort === parsedTarget.port
        ) {
            return true;
        }

        return false;
    } catch {
        return false;
    }
}

export function enforceSameOriginRequest(req: any, res: any, requestContext?: ApiRequestContext): boolean {
    const secFetchSite = getRequestHeader(req, 'sec-fetch-site')?.toLowerCase();
    if (secFetchSite === 'cross-site') {
        sendJson(
            res,
            403,
            { error: 'Cross-origin requests are not allowed.' },
            {
                requestContext,
                summary: 'Blocked cross-site request (Sec-Fetch-Site)',
            },
        );
        return false;
    }

    const originHeader = getRequestHeader(req, 'origin');
    const hostHeader = getRequestHeader(req, 'host');
    if (originHeader && !isAllowedLocalOrigin(originHeader, hostHeader)) {
        sendJson(
            res,
            403,
            { error: 'Cross-origin requests are not allowed.' },
            {
                requestContext,
                summary: 'Blocked cross-origin request (Origin mismatch)',
            },
        );
        return false;
    }

    return true;
}

export function readJsonBody<T>(
    req: NodeJS.ReadableStream,
    maxBytes: number = DEFAULT_MAX_JSON_BODY_BYTES,
): Promise<T> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        let receivedBytes = 0;
        let settled = false;

        req.on('data', (chunk: Buffer | string) => {
            if (settled) {
                return;
            }

            const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), 'utf8');
            receivedBytes += bufferChunk.length;
            if (receivedBytes > maxBytes) {
                settled = true;
                const payloadTooLargeError = new Error(
                    `JSON request body exceeds maximum allowed size (${maxBytes} bytes).`,
                );
                (payloadTooLargeError as any).statusCode = 413;
                reject(payloadTooLargeError);
                return;
            }

            chunks.push(bufferChunk);
        });
        req.on('end', () => {
            if (settled) {
                return;
            }
            settled = true;
            try {
                const body = chunks.length > 0 ? Buffer.concat(chunks).toString('utf8') : '';
                resolve(JSON.parse(body || '{}') as T);
            } catch (error) {
                reject(error);
            }
        });
        req.on('error', (error) => {
            if (settled) {
                return;
            }
            settled = true;
            reject(error);
        });
    });
}

export function sendJson(
    res: any,
    status: number,
    payload: unknown,
    options?: {
        requestContext?: ApiRequestContext;
        summary?: string;
        details?: Record<string, unknown>;
    },
): void {
    res.writeHead(status, buildApiResponseHeaders({ 'Content-Type': 'application/json' }, options?.requestContext));
    res.end(JSON.stringify(payload));

    if (options?.requestContext) {
        logApiResponse(options.requestContext, status, {
            summary: options.summary,
            ...(options.details || {}),
        });
    }
}

export function startNdjsonStream(
    res: any,
    status: number = 200,
    options?: {
        requestContext?: ApiRequestContext;
        summary?: string;
        details?: Record<string, unknown>;
    },
): void {
    res.writeHead(
        status,
        buildApiResponseHeaders(
            {
                'Content-Type': 'application/x-ndjson; charset=utf-8',
                'Cache-Control': 'no-cache, no-transform',
                Connection: 'keep-alive',
                'X-Accel-Buffering': 'no',
            },
            options?.requestContext,
        ),
    );
    res.flushHeaders?.();

    if (options?.requestContext) {
        logApiResponse(options.requestContext, status, {
            phase: 'stream-open',
            summary: options.summary,
            ...(options.details || {}),
        });
    }
}

export function writeNdjsonEvent<T = unknown>(res: any, payload: T): void {
    res.write(`${JSON.stringify(payload)}\n`);
}

export function logApiError(
    route: string,
    error: unknown,
    details?: Record<string, unknown>,
    requestContext?: ApiRequestContext,
): void {
    const message = error instanceof Error ? error.message : String(error);
    const payload = details ? { route, message, ...details } : { route, message };
    console.error('[Nano Banana API]', payload);

    if (requestContext) {
        console.error('[Nano Banana API]', {
            kind: 'error',
            route,
            method: requestContext.method,
            requestId: requestContext.requestId,
            durationMs: getRequestDurationMs(requestContext),
            message,
            ...(details || {}),
        });
        return;
    }

    console.error('[Nano Banana API]', {
        kind: 'error',
        route,
        message,
        ...(details || {}),
    });
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message.trim()) {
        return error.message;
    }

    if (typeof error === 'string' && error.trim()) {
        return error;
    }

    return fallback;
}

export function classifyApiErrorStatus(error: unknown, fallbackStatus: number): number {
    const statusCandidate = Number((error as any)?.status ?? (error as any)?.statusCode);
    if (Number.isInteger(statusCandidate) && statusCandidate >= 400 && statusCandidate < 600) {
        return statusCandidate;
    }

    const code = typeof (error as any)?.code === 'string' ? String((error as any).code).toUpperCase() : '';
    const message = getApiErrorMessage(error, '').toLowerCase();

    if (error instanceof SyntaxError) {
        return 400;
    }

    if (message.startsWith('missing gemini_api_key')) {
        return 503;
    }

    if (code === 'ENOENT') {
        return 404;
    }

    if (code === 'ENOSPC') {
        return 507;
    }

    if (code === 'EBUSY' || code === 'EPERM' || code === 'EACCES') {
        return 503;
    }

    if (/quota|rate limit|too many requests/.test(message)) {
        return 429;
    }

    if (
        /timeout|timed out|fetch failed|network|socket hang up|econnreset|econnrefused|enotfound|ehostunreach/.test(
            message,
        )
    ) {
        return 503;
    }

    return fallbackStatus;
}

export function sendClassifiedApiError(
    res: any,
    route: string,
    error: unknown,
    fallbackMessage: string,
    options?: {
        defaultStatus?: number;
        basePayload?: Record<string, unknown>;
        details?: Record<string, unknown>;
        requestContext?: ApiRequestContext;
        summary?: string;
    },
): void {
    const status = classifyApiErrorStatus(error, options?.defaultStatus ?? 500);

    logApiError(route, error, options?.details, options?.requestContext);
    sendJson(
        res,
        status,
        {
            ...(options?.basePayload || {}),
            error: getApiErrorMessage(error, fallbackMessage),
        },
        {
            requestContext: options?.requestContext,
            summary: options?.summary || getApiErrorMessage(error, fallbackMessage),
            details: {
                phase: 'error',
                ...(options?.details || {}),
            },
        },
    );
}

export function cleanResponseText(text: string | undefined, fallback: string): string {
    return (text?.trim() || fallback).replace(/^["']|["']$/g, '');
}
