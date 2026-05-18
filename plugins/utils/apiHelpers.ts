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

export function readJsonBody<T>(req: NodeJS.ReadableStream): Promise<T> {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', (chunk: Buffer) => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                resolve(JSON.parse(body || '{}') as T);
            } catch (error) {
                reject(error);
            }
        });
        req.on('error', reject);
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

export function writeNdjsonEvent(res: any, payload: unknown): void {
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
