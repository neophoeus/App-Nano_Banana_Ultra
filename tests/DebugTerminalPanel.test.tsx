import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import DebugTerminalPanel from '../components/DebugTerminalPanel';
import type { DebugTerminalEvent } from '../utils/debugTerminalEvents';

const translate = (key: string) => key;

describe('DebugTerminalPanel', () => {
    it('renders diagnostic filters, status badges, event rows, and selected JSON', () => {
        const events: DebugTerminalEvent[] = [
            {
                id: 'event-1',
                kind: 'response',
                label: 'Generation response',
                timestamp: 123,
                source: 'generation',
                route: '/api/images/generate',
                method: 'POST',
                status: 200,
                durationMs: 1260,
                correlationId: 'corr-1234567890',
                summary: 'image | text',
                payload: { text: 'visible result' },
            },
        ];

        const markup = renderToStaticMarkup(
            <DebugTerminalPanel
                events={events}
                filteredEvents={events}
                selectedEvent={events[0]}
                selectedEventId="event-1"
                filter="all"
                sourceFilter="all"
                routeFilter="all"
                searchQuery=""
                activeCorrelationId={null}
                autoScroll={true}
                kindCounts={{ all: 1, request: 0, response: 1, error: 0, stream: 0, retry: 0, log: 0 }}
                sourceOptions={['generation']}
                routeOptions={['/api/images/generate']}
                t={translate}
                onFilterChange={vi.fn()}
                onSourceFilterChange={vi.fn()}
                onRouteFilterChange={vi.fn()}
                onSearchQueryChange={vi.fn()}
                onActiveCorrelationIdChange={vi.fn()}
                onSelectEvent={vi.fn()}
                onAutoScrollChange={vi.fn()}
                onClear={vi.fn()}
                onClose={vi.fn()}
            />,
        );

        expect(markup).toContain('debug-terminal-panel');
        expect(markup).toContain('debug-terminal-source-filter');
        expect(markup).toContain('debug-terminal-route-filter');
        expect(markup).toContain('debug-terminal-search');
        expect(markup).toContain('/api/images/generate');
        expect(markup).toContain('200');
        expect(markup).toContain('1.3s');
        expect(markup).toContain('visible result');
        expect(markup).toContain('debugTerminalFocusCorrelation');
        expect(markup).not.toContain('debug-terminal-pool-status');
        expect(markup).not.toContain('debug-terminal-reset-pool-btn');
    });

    it('renders deep error packet inspection card when selected event has deepErrorAnalysis', () => {
        const errorEvent: DebugTerminalEvent = {
            id: 'event-err-1',
            kind: 'retry',
            label: 'Transient rate limit backoff',
            timestamp: 456,
            source: 'generation',
            route: 'browser-direct',
            status: 429,
            summary: 'RESOURCE_EXHAUSTED',
            payload: {
                deepErrorAnalysis: {
                    category: 'transient_rate_limit',
                    strategy: 'server_directed_cooldown',
                    recommendedWaitMs: 18500,
                    quotaMetric: 'generate_content_requests_per_minute',
                    quotaLimitValue: '200000',
                    extractedRetryDelayMs: 22925,
                },
            },
        };

        const markup = renderToStaticMarkup(
            <DebugTerminalPanel
                events={[errorEvent]}
                filteredEvents={[errorEvent]}
                selectedEvent={errorEvent}
                selectedEventId="event-err-1"
                filter="all"
                sourceFilter="all"
                routeFilter="all"
                searchQuery=""
                activeCorrelationId={null}
                autoScroll={false}
                kindCounts={{ all: 1, request: 0, response: 0, error: 0, stream: 0, retry: 1, log: 0 }}
                sourceOptions={['generation']}
                routeOptions={['browser-direct']}
                t={translate}
                onFilterChange={vi.fn()}
                onSourceFilterChange={vi.fn()}
                onRouteFilterChange={vi.fn()}
                onSearchQueryChange={vi.fn()}
                onActiveCorrelationIdChange={vi.fn()}
                onSelectEvent={vi.fn()}
                onAutoScrollChange={vi.fn()}
                onClear={vi.fn()}
                onClose={vi.fn()}
            />,
        );

        expect(markup).toContain('debug-terminal-deep-error-card');
        expect(markup).toContain('debugTerminalDeepErrorCardTitle');
        expect(markup).toContain('transient_rate_limit');
        expect(markup).toContain('server_directed_cooldown');
        expect(markup).toContain('18500ms');
        expect(markup).toContain('generate_content_requests_per_minute');
        expect(markup).toContain('200000');
        expect(markup).toContain('22.9s');
    });
});
