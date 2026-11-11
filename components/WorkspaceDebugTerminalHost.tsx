import React, { useCallback } from 'react';
import DebugTerminalPanel from './DebugTerminalPanel';
import { useDebugTerminal } from '../hooks/useDebugTerminal';
import { useWorkspaceSelector, WorkspaceDomainStore } from '../state/workspaceDomainStore';

type WorkspaceDebugTerminalHostProps = {
    store: WorkspaceDomainStore;
    t: (key: string) => string;
};

const ActiveDebugTerminalPanel: React.FC<{
    t: (key: string) => string;
    onClose: () => void;
}> = ({ t, onClose }) => {
    const debugTerminal = useDebugTerminal();

    return (
        <DebugTerminalPanel
            events={debugTerminal.events}
            filteredEvents={debugTerminal.filteredEvents}
            selectedEvent={debugTerminal.selectedEvent}
            selectedEventId={debugTerminal.selectedEventId}
            filter={debugTerminal.filter}
            sourceFilter={debugTerminal.sourceFilter}
            routeFilter={debugTerminal.routeFilter}
            searchQuery={debugTerminal.searchQuery}
            activeCorrelationId={debugTerminal.activeCorrelationId}
            autoScroll={debugTerminal.autoScroll}
            kindCounts={debugTerminal.kindCounts}
            sourceOptions={debugTerminal.sourceOptions}
            routeOptions={debugTerminal.routeOptions}
            t={t}
            onFilterChange={debugTerminal.setFilter}
            onSourceFilterChange={debugTerminal.setSourceFilter}
            onRouteFilterChange={debugTerminal.setRouteFilter}
            onSearchQueryChange={debugTerminal.setSearchQuery}
            onActiveCorrelationIdChange={debugTerminal.setActiveCorrelationId}
            onSelectEvent={(eventId) => debugTerminal.setSelectedEventId(eventId)}
            onAutoScrollChange={debugTerminal.setAutoScroll}
            onClear={debugTerminal.clearEvents}
            onClose={onClose}
        />
    );
};

const WorkspaceDebugTerminalHost: React.FC<WorkspaceDebugTerminalHostProps> = ({ store, t }) => {
    const isDebugTerminalOpen = useWorkspaceSelector(store, (state) => state.surface.isDebugTerminalOpen);

    const handleClose = useCallback(() => {
        store.updateSurface({ isDebugTerminalOpen: false });
    }, [store]);

    if (!isDebugTerminalOpen) {
        return null;
    }

    return <ActiveDebugTerminalPanel t={t} onClose={handleClose} />;
};

export default React.memo(WorkspaceDebugTerminalHost);
