/** @vitest-environment jsdom */

import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useDebugTerminal } from '../hooks/useDebugTerminal';
import { DEBUG_TERMINAL_STORAGE_KEY, emitDebugTerminalEvent } from '../utils/debugTerminalEvents';

type HookHandle = ReturnType<typeof useDebugTerminal>;

describe('useDebugTerminal', () => {
    let container: HTMLDivElement;
    let root: Root;
    let latestHook: HookHandle | null;

    const renderHook = () => {
        function Harness() {
            latestHook = useDebugTerminal();
            return null;
        }

        flushSync(() => {
            root.render(<Harness />);
        });
    };

    beforeEach(() => {
        window.localStorage.clear();
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        latestHook = null;
    });

    afterEach(() => {
        root.unmount();
        container.remove();
        window.localStorage.clear();
        latestHook = null;
    });

    it('hydrates stored debug events and clears them on demand', () => {
        window.localStorage.setItem(
            DEBUG_TERMINAL_STORAGE_KEY,
            JSON.stringify([
                {
                    id: 'stored-event',
                    kind: 'response',
                    label: 'Stored event',
                    timestamp: 123,
                    source: 'generation',
                    route: '/api/images/generate',
                    payload: { ok: true },
                },
            ]),
        );

        renderHook();

        expect(latestHook?.events).toHaveLength(1);
        expect(latestHook?.selectedEvent?.id).toBe('stored-event');
        expect(latestHook?.sourceOptions).toEqual(['generation']);
        expect(latestHook?.routeOptions).toEqual(['/api/images/generate']);

        flushSync(() => {
            latestHook?.clearEvents();
        });

        expect(latestHook?.events).toHaveLength(0);
        expect(window.localStorage.getItem(DEBUG_TERMINAL_STORAGE_KEY)).toBe('[]');
    });

    it('subscribes to emitted events and filters by kind source route correlation and search', () => {
        renderHook();

        flushSync(() => {
            emitDebugTerminalEvent({
                kind: 'request',
                label: 'Generate request',
                source: 'generation',
                route: '/api/images/generate',
                correlationId: 'corr-1',
                payload: { prompt: 'alpha prompt' },
            });
            emitDebugTerminalEvent({
                kind: 'error',
                label: 'Batch failed',
                source: 'batch',
                route: '/api/batches/create',
                correlationId: 'corr-2',
                payload: { error: 'beta failure' },
            });
        });

        expect(latestHook?.events).toHaveLength(2);
        expect(latestHook?.selectedEvent?.label).toBe('Batch failed');
        expect(latestHook?.kindCounts.request).toBe(1);
        expect(latestHook?.kindCounts.error).toBe(1);

        flushSync(() => {
            latestHook?.setFilter('error');
        });
        expect(latestHook?.filteredEvents.map((event) => event.label)).toEqual(['Batch failed']);

        flushSync(() => {
            latestHook?.setFilter('all');
            latestHook?.setSourceFilter('generation');
        });
        expect(latestHook?.filteredEvents.map((event) => event.label)).toEqual(['Generate request']);

        flushSync(() => {
            latestHook?.setSourceFilter('all');
            latestHook?.setRouteFilter('/api/batches/create');
        });
        expect(latestHook?.filteredEvents.map((event) => event.label)).toEqual(['Batch failed']);

        flushSync(() => {
            latestHook?.setRouteFilter('all');
            latestHook?.setActiveCorrelationId('corr-1');
        });
        expect(latestHook?.filteredEvents.map((event) => event.label)).toEqual(['Generate request']);

        flushSync(() => {
            latestHook?.setActiveCorrelationId(null);
            latestHook?.setSearchQuery('beta');
        });
        expect(latestHook?.filteredEvents.map((event) => event.label)).toEqual(['Batch failed']);
    });
});