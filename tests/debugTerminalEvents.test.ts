import { describe, expect, it } from 'vitest';
import {
    DEBUG_TERMINAL_MAX_EVENTS,
    DEBUG_TERMINAL_REQUEST_ID_HEADER,
    DEBUG_TERMINAL_STORAGE_KEY,
    emitDebugTerminalEvent,
    sanitizeDebugTerminalPayload,
    subscribeDebugTerminalEvents,
    summarizeDebugTerminalPayload,
    trimDebugTerminalEvents,
} from '../utils/debugTerminalEvents';

describe('debugTerminalEvents', () => {
    it('uses the Ultra diagnostic storage contract', () => {
        expect(DEBUG_TERMINAL_STORAGE_KEY).toBe('nbu_ultra_debug_terminal_events');
        expect(DEBUG_TERMINAL_MAX_EVENTS).toBe(500);
        expect(DEBUG_TERMINAL_REQUEST_ID_HEADER).toBe('X-NBU-Debug-Request-ID');
    });

    it('redacts sensitive keys and image payloads while preserving prompts and urls', () => {
        const sanitized = sanitizeDebugTerminalPayload({
            apiKey: 'secret-key',
            Authorization: 'Bearer token-value',
            prompt: 'visible prompt text',
            sourceUrl: 'https://example.test/source',
            imageUrl: 'data:image/png;base64,ABCDEFGHIJKLMNOPQRSTUVWXYZ',
            editingInput: 'data:image/png;base64,ABCDEFGHIJKLMNOPQRSTUVWXYZ',
            objectImageInputs: ['data:image/png;base64,AAA', 'data:image/png;base64,BBB'],
            inlineData: {
                mimeType: 'image/png',
                data: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
            },
        }) as Record<string, unknown>;

        expect(sanitized.apiKey).toEqual({ redacted: true, reason: 'sensitive-key' });
        expect(sanitized.Authorization).toEqual({ redacted: true, reason: 'sensitive-key' });
        expect(sanitized.prompt).toBe('visible prompt text');
        expect(sanitized.sourceUrl).toBe('https://example.test/source');
        expect(sanitized.imageUrl).toEqual({
            redacted: true,
            type: 'data-url',
            length: 'data:image/png;base64,ABCDEFGHIJKLMNOPQRSTUVWXYZ'.length,
            preview: 'data:image/png;base64,',
        });
        expect(sanitized.objectImageInputs).toEqual({
            redacted: true,
            reason: 'image-array',
            count: 2,
        });
        expect((sanitized.inlineData as Record<string, unknown>).data).toEqual({
            redacted: true,
            reason: 'inline-data',
            mimeType: 'image/png',
            length: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.length,
        });
    });

    it('summarizes large diagnostic payloads', () => {
        expect(summarizeDebugTerminalPayload([{ id: 'one' }, { id: 'two' }])).toEqual({
            summarized: true,
            type: 'array',
            count: 2,
        });

        expect(summarizeDebugTerminalPayload({ name: 'job-1', state: 'JOB_STATE_RUNNING', extra: true })).toEqual({
            summarized: true,
            type: 'object',
            keys: ['name', 'state', 'extra'],
            keyCount: 3,
            name: 'job-1',
            state: 'JOB_STATE_RUNNING',
        });
    });

    it('emits sanitized events with correlation metadata to subscribers', () => {
        let receivedEvent: any = null;
        const unsubscribe = subscribeDebugTerminalEvents((event) => {
            receivedEvent = event;
        });

        const emittedEvent: any = emitDebugTerminalEvent({
            kind: 'request',
            label: 'Request prepared',
            source: 'generation',
            route: '/api/images/generate',
            method: 'POST',
            correlationId: 'dbg-123',
            payload: {
                apiKey: 'top-secret',
                contents: 'keep this',
            },
        });

        unsubscribe();

        expect(receivedEvent).not.toBeNull();
        expect(receivedEvent?.id).toBe(emittedEvent.id);
        expect(receivedEvent?.requestId).toBe('dbg-123');
        expect(receivedEvent?.correlationId).toBe('dbg-123');
        expect(receivedEvent?.route).toBe('/api/images/generate');
        expect(receivedEvent?.payload).toEqual({
            apiKey: { redacted: true, reason: 'sensitive-key' },
            contents: 'keep this',
        });
    });

    it('trims event history to the latest Ultra diagnostic entries', () => {
        const trimmedEvents = trimDebugTerminalEvents(
            Array.from({ length: 540 }, (_, index) => ({
                id: `event-${index}`,
                kind: 'log' as const,
                label: `event ${index}`,
                timestamp: index,
            })),
        );

        expect(trimmedEvents).toHaveLength(500);
        expect(trimmedEvents[0]?.id).toBe('event-40');
        expect(trimmedEvents.at(-1)?.id).toBe('event-539');
    });

    it('coalesces rapid burst workspace snapshot save events within 300ms', () => {
        const events = [
            {
                id: 'ws-1',
                kind: 'log' as const,
                label: 'Local workspace snapshot save',
                source: 'workspace' as const,
                phase: 'save',
                timestamp: 1000,
            },
            {
                id: 'ws-2',
                kind: 'log' as const,
                label: 'Local workspace snapshot save',
                source: 'workspace' as const,
                phase: 'save',
                timestamp: 1050,
            },
            {
                id: 'ws-3',
                kind: 'log' as const,
                label: 'Local workspace snapshot save',
                source: 'workspace' as const,
                phase: 'save',
                timestamp: 1100,
            },
            {
                id: 'gen-1',
                kind: 'request' as const,
                label: 'Image #1: Request prepared',
                source: 'generation' as const,
                timestamp: 1200,
            },
        ];

        const trimmed = trimDebugTerminalEvents(events);
        expect(trimmed).toHaveLength(2);
        expect(trimmed[0].id).toBe('ws-3');
        expect(trimmed[1].id).toBe('gen-1');
    });

    it('caps routine workspace events to protect generation and error history from eviction', () => {
        const events = [
            {
                id: 'important-generation-event',
                kind: 'request' as const,
                label: 'Image #1: Request completed',
                source: 'generation' as const,
                timestamp: 100,
            },
            ...Array.from({ length: 120 }, (_, index) => ({
                id: `ws-routine-${index}`,
                kind: 'log' as const,
                label: 'Local workspace snapshot saved',
                source: 'workspace' as const,
                phase: 'saved',
                timestamp: 1000 + index * 500,
            })),
        ];

        const trimmed = trimDebugTerminalEvents(events);
        expect(trimmed.some((e) => e.id === 'important-generation-event')).toBe(true);
        const routineWs = trimmed.filter((e) => e.source === 'workspace' && e.kind !== 'error');
        expect(routineWs).toHaveLength(80);
    });
});
