import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    DEBUG_TERMINAL_STORAGE_KEY,
    DebugTerminalEvent,
    DebugTerminalEventKind,
    DebugTerminalSource,
    subscribeDebugTerminalEvents,
    trimDebugTerminalEvents,
    clearDebugTerminalEvents,
} from '../utils/debugTerminalEvents';

export type DebugTerminalFilter = DebugTerminalEventKind | 'all';
export type DebugTerminalSourceFilter = DebugTerminalSource | 'all';

type DebugTerminalKindCounts = Record<DebugTerminalEventKind | 'all', number>;

type UseDebugTerminalReturn = {
    events: DebugTerminalEvent[];
    filteredEvents: DebugTerminalEvent[];
    selectedEvent: DebugTerminalEvent | null;
    selectedEventId: string | null;
    setSelectedEventId: (eventId: string | null) => void;
    filter: DebugTerminalFilter;
    setFilter: (filter: DebugTerminalFilter) => void;
    sourceFilter: DebugTerminalSourceFilter;
    setSourceFilter: (filter: DebugTerminalSourceFilter) => void;
    routeFilter: string;
    setRouteFilter: (filter: string) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    activeCorrelationId: string | null;
    setActiveCorrelationId: (correlationId: string | null) => void;
    autoScroll: boolean;
    setAutoScroll: (value: boolean) => void;
    kindCounts: DebugTerminalKindCounts;
    sourceOptions: DebugTerminalSource[];
    routeOptions: string[];
    clearEvents: () => void;
};

const EMPTY_KIND_COUNTS: DebugTerminalKindCounts = {
    all: 0,
    request: 0,
    response: 0,
    error: 0,
    stream: 0,
    retry: 0,
    log: 0,
};

const readStoredEvents = (): DebugTerminalEvent[] => {
    if (typeof window === 'undefined') {
        return [];
    }

    try {
        const storedValue = window.localStorage.getItem(DEBUG_TERMINAL_STORAGE_KEY);
        if (!storedValue) {
            return [];
        }

        const parsedValue = JSON.parse(storedValue);
        return Array.isArray(parsedValue) ? trimDebugTerminalEvents(parsedValue as DebugTerminalEvent[]) : [];
    } catch {
        return [];
    }
};

const persistEvents = (events: DebugTerminalEvent[]): void => {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        window.localStorage.setItem(DEBUG_TERMINAL_STORAGE_KEY, JSON.stringify(events));
    } catch {
        // Diagnostic history must never block generation or UI interactions.
    }
};

const eventMatchesSearch = (event: DebugTerminalEvent, searchQuery: string): boolean => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
        return true;
    }

    const searchableText = [
        event.kind,
        event.label,
        event.summary,
        event.source,
        event.route,
        event.endpoint,
        event.method,
        event.operation,
        event.phase,
        event.correlationId,
        event.requestId,
        event.sessionId,
        event.batchSessionId,
        event.jobName,
        typeof event.status === 'number' ? String(event.status) : '',
        typeof event.durationMs === 'number' ? String(event.durationMs) : '',
        event.payload ? JSON.stringify(event.payload) : '',
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

    return searchableText.includes(normalizedQuery);
};

export function useDebugTerminal(): UseDebugTerminalReturn {
    const [events, setEvents] = useState<DebugTerminalEvent[]>(readStoredEvents);
    const [filter, setFilter] = useState<DebugTerminalFilter>('all');
    const [sourceFilter, setSourceFilter] = useState<DebugTerminalSourceFilter>('all');
    const [routeFilter, setRouteFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCorrelationId, setActiveCorrelationId] = useState<string | null>(null);
    const [selectedEventId, setSelectedEventId] = useState<string | null>(() => events.at(-1)?.id || null);
    const [autoScroll, setAutoScroll] = useState(true);

    useEffect(() => {
        return subscribeDebugTerminalEvents((event) => {
            setEvents((previousEvents) => {
                const nextEvents = trimDebugTerminalEvents([...previousEvents, event]);
                persistEvents(nextEvents);
                return nextEvents;
            });
            if (autoScroll) {
                setSelectedEventId(event.id);
            }
        });
    }, [autoScroll]);

    useEffect(() => {
        const handleClear = () => {
            setEvents([]);
            setSelectedEventId(null);
            setActiveCorrelationId(null);
        };
        window.addEventListener('nbu_clear_debug_terminal', handleClear);
        return () => {
            window.removeEventListener('nbu_clear_debug_terminal', handleClear);
        };
    }, []);

    const clearEvents = useCallback(() => {
        clearDebugTerminalEvents();
    }, []);

    const kindCounts = useMemo(
        () =>
            events.reduce<DebugTerminalKindCounts>(
                (counts, event) => ({
                    ...counts,
                    all: counts.all + 1,
                    [event.kind]: counts[event.kind] + 1,
                }),
                { ...EMPTY_KIND_COUNTS },
            ),
        [events],
    );

    const sourceOptions = useMemo(
        () =>
            Array.from(new Set(events.map((event) => event.source).filter(Boolean) as DebugTerminalSource[])).sort(),
        [events],
    );
    const routeOptions = useMemo(
        () =>
            Array.from(new Set(events.map((event) => event.route || event.endpoint).filter(Boolean) as string[])).sort(),
        [events],
    );

    const filteredEvents = useMemo(
        () =>
            events.filter((event) => {
                if (filter !== 'all' && event.kind !== filter) {
                    return false;
                }

                if (sourceFilter !== 'all' && event.source !== sourceFilter) {
                    return false;
                }

                if (routeFilter !== 'all' && (event.route || event.endpoint) !== routeFilter) {
                    return false;
                }

                if (activeCorrelationId && event.correlationId !== activeCorrelationId && event.requestId !== activeCorrelationId) {
                    return false;
                }

                return eventMatchesSearch(event, searchQuery);
            }),
        [activeCorrelationId, events, filter, routeFilter, searchQuery, sourceFilter],
    );

    const selectedEvent = useMemo(() => {
        if (selectedEventId) {
            return events.find((event) => event.id === selectedEventId) || filteredEvents.at(-1) || null;
        }

        return filteredEvents.at(-1) || null;
    }, [events, filteredEvents, selectedEventId]);

    return {
        events,
        filteredEvents,
        selectedEvent,
        selectedEventId,
        setSelectedEventId,
        filter,
        setFilter,
        sourceFilter,
        setSourceFilter,
        routeFilter,
        setRouteFilter,
        searchQuery,
        setSearchQuery,
        activeCorrelationId,
        setActiveCorrelationId,
        autoScroll,
        setAutoScroll,
        kindCounts,
        sourceOptions,
        routeOptions,
        clearEvents,
    };
}