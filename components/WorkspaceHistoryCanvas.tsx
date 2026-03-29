import React from 'react';

type WorkspaceHistoryCanvasProps = {
    recentLane: React.ReactNode;
    focusSurface: React.ReactNode;
    supportSurface: React.ReactNode;
};

function WorkspaceHistoryCanvas({ recentLane, focusSurface, supportSurface }: WorkspaceHistoryCanvasProps) {
    return (
        <section data-testid="workspace-history-canvas" className="grid gap-5 lg:min-h-0">
            <div data-testid="workspace-history-recent-lane">{recentLane}</div>
            <div
                data-testid="workspace-history-focus-grid"
                className="grid gap-5 lg:min-h-0 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.78fr)]"
            >
                <div data-testid="workspace-history-focus-state">{focusSurface}</div>
                <aside data-testid="workspace-history-support-rail" className="hidden content-start gap-4 xl:grid">
                    {supportSurface}
                </aside>
            </div>
        </section>
    );
}

export default React.memo(WorkspaceHistoryCanvas);
