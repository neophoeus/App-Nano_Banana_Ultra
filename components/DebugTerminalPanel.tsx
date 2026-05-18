import React, { useEffect, useMemo, useRef } from 'react';
import { WORKSPACE_OVERLAY_Z_INDEX } from '../constants/workspaceOverlays';
import type { DebugTerminalFilter, DebugTerminalSourceFilter } from '../hooks/useDebugTerminal';
import type { DebugTerminalEvent, DebugTerminalEventKind, DebugTerminalSource } from '../utils/debugTerminalEvents';
import WorkspaceModalFrame from './WorkspaceModalFrame';

type DebugTerminalPanelProps = {
    events: DebugTerminalEvent[];
    filteredEvents: DebugTerminalEvent[];
    selectedEvent: DebugTerminalEvent | null;
    selectedEventId: string | null;
    filter: DebugTerminalFilter;
    sourceFilter: DebugTerminalSourceFilter;
    routeFilter: string;
    searchQuery: string;
    activeCorrelationId: string | null;
    autoScroll: boolean;
    kindCounts: Record<DebugTerminalEventKind | 'all', number>;
    sourceOptions: DebugTerminalSource[];
    routeOptions: string[];
    t: (key: string) => string;
    onFilterChange: (filter: DebugTerminalFilter) => void;
    onSourceFilterChange: (filter: DebugTerminalSourceFilter) => void;
    onRouteFilterChange: (filter: string) => void;
    onSearchQueryChange: (query: string) => void;
    onActiveCorrelationIdChange: (correlationId: string | null) => void;
    onSelectEvent: (eventId: string) => void;
    onAutoScrollChange: (value: boolean) => void;
    onClear: () => void;
    onClose: () => void;
};

const FILTERS: DebugTerminalFilter[] = ['all', 'request', 'response', 'error', 'stream', 'retry', 'log'];

const EVENT_KIND_TONE: Record<DebugTerminalEventKind, string> = {
    request: 'border-cyan-400/40 bg-cyan-400/10 text-cyan-700 dark:text-cyan-200',
    response: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-700 dark:text-emerald-200',
    error: 'border-rose-400/40 bg-rose-400/10 text-rose-700 dark:text-rose-200',
    stream: 'border-sky-400/40 bg-sky-400/10 text-sky-700 dark:text-sky-200',
    retry: 'border-amber-400/50 bg-amber-400/10 text-amber-700 dark:text-amber-200',
    log: 'border-slate-400/40 bg-slate-400/10 text-slate-700 dark:text-slate-200',
};

const SOURCE_LABEL_KEY: Record<DebugTerminalSource, string> = {
    generation: 'debugTerminalSourceGeneration',
    'prompt-tools': 'debugTerminalSourcePromptTools',
    batch: 'debugTerminalSourceBatch',
    workspace: 'debugTerminalSourceWorkspace',
    runtime: 'debugTerminalSourceRuntime',
    'image-file': 'debugTerminalSourceImageFile',
    backend: 'debugTerminalSourceBackend',
    workflow: 'debugTerminalSourceWorkflow',
    unknown: 'debugTerminalSourceUnknown',
};

const formatTime = (timestamp: number): string =>
    new Date(timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

const formatDuration = (durationMs?: number): string | null => {
    if (typeof durationMs !== 'number') {
        return null;
    }

    return durationMs >= 1000 ? `${(durationMs / 1000).toFixed(1)}s` : `${Math.round(durationMs)}ms`;
};

function DebugTerminalIcon() {
    return (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16v12H4z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="m7 10 2 2-2 2M12 15h5" />
        </svg>
    );
}

export function DebugTerminalToggleIcon() {
    return <DebugTerminalIcon />;
}

export default function DebugTerminalPanel({
    events,
    filteredEvents,
    selectedEvent,
    selectedEventId,
    filter,
    sourceFilter,
    routeFilter,
    searchQuery,
    activeCorrelationId,
    autoScroll,
    kindCounts,
    sourceOptions,
    routeOptions,
    t,
    onFilterChange,
    onSourceFilterChange,
    onRouteFilterChange,
    onSearchQueryChange,
    onActiveCorrelationIdChange,
    onSelectEvent,
    onAutoScrollChange,
    onClear,
    onClose,
}: DebugTerminalPanelProps) {
    const listEndRef = useRef<HTMLDivElement | null>(null);
    const selectedEventJson = useMemo(() => JSON.stringify(selectedEvent || {}, null, 2), [selectedEvent]);
    const selectedCorrelationId = selectedEvent?.correlationId || selectedEvent?.requestId || null;

    useEffect(() => {
        if (autoScroll) {
            listEndRef.current?.scrollIntoView({ block: 'end' });
        }
    }, [autoScroll, filteredEvents.length]);

    const handleExport = () => {
        if (typeof window === 'undefined') {
            return;
        }

        const blob = new Blob([JSON.stringify(events, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `nano-banana-ultra-diagnostics-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        anchor.click();
        URL.revokeObjectURL(url);
    };

    const handleCopySelected = () => {
        if (!selectedEvent || typeof navigator === 'undefined') {
            return;
        }

        void navigator.clipboard?.writeText(selectedEventJson);
    };

    return (
        <WorkspaceModalFrame
            dataTestId="debug-terminal-panel"
            zIndex={WORKSPACE_OVERLAY_Z_INDEX.debugTerminal}
            maxWidthClass="max-w-[1560px]"
            onClose={onClose}
            closeLabel={t('debugTerminalClose')}
            eyebrow={t('debugTerminalEyebrow')}
            title={t('debugTerminalTitle')}
            description={t('debugTerminalDescription')}
            closeButtonTestId="debug-terminal-close"
            containerClassName="items-center justify-center"
            panelClassName="border border-slate-200 bg-slate-950 text-slate-100 shadow-[0_30px_90px_rgba(0,0,0,0.38)] dark:border-white/10 dark:bg-[#060910]"
            headerClassName="border-b border-white/10 px-5 py-4"
            closeButtonClassName="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-[11px] font-semibold text-slate-100 transition hover:bg-white/14"
            backdropClassName="bg-slate-950/74 backdrop-blur-md"
            headerExtra={
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                    <span>{t('debugTerminalEventCount').replace('{0}', events.length.toString())}</span>
                    <span aria-hidden="true">/</span>
                    <span>{t('debugTerminalFilteredCount').replace('{0}', filteredEvents.length.toString())}</span>
                    {activeCorrelationId ? (
                        <button
                            type="button"
                            data-testid="debug-terminal-clear-correlation"
                            onClick={() => onActiveCorrelationIdChange(null)}
                            className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2 py-0.5 font-bold text-cyan-100 transition hover:bg-cyan-300/16"
                        >
                            {t('debugTerminalCorrelationActive').replace('{0}', activeCorrelationId.slice(0, 12))}
                        </button>
                    ) : null}
                </div>
            }
        >
            <div className="flex h-[min(78vh,800px)] flex-col gap-3 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_34%),linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.98))] p-3 sm:p-4">
                <div className="flex flex-wrap items-center gap-2">
                    {FILTERS.map((filterName) => (
                        <button
                            key={filterName}
                            type="button"
                            data-testid={`debug-terminal-filter-${filterName}`}
                            onClick={() => onFilterChange(filterName)}
                            className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${
                                filter === filterName
                                    ? 'border-cyan-300 bg-cyan-300/16 text-cyan-100'
                                    : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                            }`}
                        >
                            {t(`debugTerminalFilter${filterName[0].toUpperCase()}${filterName.slice(1)}`)}
                            <span className="ml-1 text-slate-500">{kindCounts[filterName]}</span>
                        </button>
                    ))}
                    <select
                        data-testid="debug-terminal-source-filter"
                        value={sourceFilter}
                        onChange={(event) => onSourceFilterChange(event.target.value as DebugTerminalSourceFilter)}
                        className="rounded-full border border-white/10 bg-slate-950/80 px-3 py-1.5 text-[11px] font-bold text-slate-300 outline-none transition hover:bg-white/10"
                    >
                        <option value="all">{t('debugTerminalSourceAll')}</option>
                        {sourceOptions.map((source) => (
                            <option key={source} value={source}>
                                {t(SOURCE_LABEL_KEY[source])}
                            </option>
                        ))}
                    </select>
                    <select
                        data-testid="debug-terminal-route-filter"
                        value={routeFilter}
                        onChange={(event) => onRouteFilterChange(event.target.value)}
                        className="max-w-[240px] rounded-full border border-white/10 bg-slate-950/80 px-3 py-1.5 text-[11px] font-bold text-slate-300 outline-none transition hover:bg-white/10"
                    >
                        <option value="all">{t('debugTerminalRouteAll')}</option>
                        {routeOptions.map((route) => (
                            <option key={route} value={route}>
                                {route}
                            </option>
                        ))}
                    </select>
                    <input
                        data-testid="debug-terminal-search"
                        value={searchQuery}
                        onChange={(event) => onSearchQueryChange(event.target.value)}
                        placeholder={t('debugTerminalSearchPlaceholder')}
                        className="min-w-[180px] flex-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-300/60 focus:bg-white/8"
                    />
                    <button
                        type="button"
                        data-testid="debug-terminal-autoscroll"
                        onClick={() => onAutoScrollChange(!autoScroll)}
                        className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${
                            autoScroll
                                ? 'border-emerald-300/70 bg-emerald-300/12 text-emerald-100'
                                : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                        }`}
                    >
                        {autoScroll ? t('debugTerminalAutoScrollOn') : t('debugTerminalAutoScrollOff')}
                    </button>
                    <button
                        type="button"
                        data-testid="debug-terminal-copy-selected"
                        onClick={handleCopySelected}
                        disabled={!selectedEvent}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                        {t('debugTerminalCopySelected')}
                    </button>
                    <button
                        type="button"
                        data-testid="debug-terminal-export"
                        onClick={handleExport}
                        disabled={events.length === 0}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                        {t('debugTerminalExport')}
                    </button>
                    <button
                        type="button"
                        data-testid="debug-terminal-clear"
                        onClick={onClear}
                        disabled={events.length === 0}
                        className="rounded-full border border-rose-300/30 bg-rose-400/10 px-3 py-1.5 text-[11px] font-bold text-rose-100 transition hover:bg-rose-400/16 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                        {t('debugTerminalClear')}
                    </button>
                </div>

                <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(320px,0.85fr)_minmax(0,1.15fr)]">
                    <section className="nbu-scrollbar-subtle min-h-0 overflow-y-auto rounded-[22px] border border-white/10 bg-black/28 p-2 font-mono">
                        {filteredEvents.length === 0 ? (
                            <div className="flex h-full min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-400">
                                {t('debugTerminalEmpty')}
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                {filteredEvents.map((event) => {
                                    const isSelected = selectedEventId === event.id || selectedEvent?.id === event.id;
                                    const eventRoute = event.route || event.endpoint;
                                    const eventCorrelationId = event.correlationId || event.requestId;
                                    const durationLabel = formatDuration(event.durationMs);

                                    return (
                                        <button
                                            key={event.id}
                                            type="button"
                                            data-testid={`debug-terminal-event-${event.kind}`}
                                            onClick={() => onSelectEvent(event.id)}
                                            className={`w-full rounded-2xl border p-3 text-left transition ${
                                                isSelected
                                                    ? 'border-cyan-300/60 bg-cyan-300/10'
                                                    : 'border-white/8 bg-white/[0.035] hover:border-white/16 hover:bg-white/[0.06]'
                                            }`}
                                        >
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase ${EVENT_KIND_TONE[event.kind]}`}>
                                                    {event.kind}
                                                </span>
                                                {event.source ? (
                                                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                                                        {event.source}
                                                    </span>
                                                ) : null}
                                                {typeof event.status === 'number' ? (
                                                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                                                        {event.status}
                                                    </span>
                                                ) : null}
                                                {durationLabel ? (
                                                    <span className="text-[11px] text-slate-500">{durationLabel}</span>
                                                ) : null}
                                                <span className="text-[11px] text-slate-500">{formatTime(event.timestamp)}</span>
                                                {typeof event.slotIndex === 'number' ? (
                                                    <span className="text-[11px] text-slate-500">#{event.slotIndex + 1}</span>
                                                ) : null}
                                            </div>
                                            <div className="mt-2 truncate text-[12px] font-bold text-slate-100">{event.label}</div>
                                            {eventRoute ? <div className="mt-1 truncate text-[11px] text-cyan-200/65">{eventRoute}</div> : null}
                                            {event.summary ? (
                                                <div className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-400">{event.summary}</div>
                                            ) : null}
                                            {eventCorrelationId ? (
                                                <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500">
                                                    <span>{eventCorrelationId.slice(0, 18)}</span>
                                                    <span
                                                        role="button"
                                                        tabIndex={0}
                                                        onClick={(clickEvent) => {
                                                            clickEvent.stopPropagation();
                                                            onActiveCorrelationIdChange(eventCorrelationId);
                                                        }}
                                                        onKeyDown={(keyEvent) => {
                                                            if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
                                                                keyEvent.preventDefault();
                                                                keyEvent.stopPropagation();
                                                                onActiveCorrelationIdChange(eventCorrelationId);
                                                            }
                                                        }}
                                                        className="rounded-full border border-cyan-300/20 px-2 py-0.5 font-bold text-cyan-200/80 hover:bg-cyan-300/10"
                                                    >
                                                        {t('debugTerminalFocusCorrelation')}
                                                    </span>
                                                </div>
                                            ) : null}
                                        </button>
                                    );
                                })}
                                <div ref={listEndRef} />
                            </div>
                        )}
                    </section>

                    <section className="nbu-scrollbar-subtle min-h-0 overflow-auto rounded-[22px] border border-white/10 bg-black/36 p-4 font-mono">
                        {selectedEvent ? (
                            <>
                                <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                                    {selectedCorrelationId ? (
                                        <button
                                            type="button"
                                            data-testid="debug-terminal-focus-selected-correlation"
                                            onClick={() => onActiveCorrelationIdChange(selectedCorrelationId)}
                                            className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2.5 py-1 font-bold text-cyan-100 transition hover:bg-cyan-300/16"
                                        >
                                            {t('debugTerminalFocusCorrelation')}
                                        </button>
                                    ) : null}
                                    {selectedEvent.operation ? <span>{selectedEvent.operation}</span> : null}
                                    {selectedEvent.phase ? <span>{selectedEvent.phase}</span> : null}
                                </div>
                                <pre data-testid="debug-terminal-selected-json" className="whitespace-pre-wrap break-words text-[11px] leading-5 text-cyan-50/90">
                                    {selectedEventJson}
                                </pre>
                            </>
                        ) : (
                            <div className="flex h-full min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-400">
                                {t('debugTerminalSelectEvent')}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </WorkspaceModalFrame>
    );
}