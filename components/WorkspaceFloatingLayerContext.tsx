import React from 'react';

export type WorkspaceFloatingLayerContextValue = {
    hostElement: HTMLDivElement | null;
    floatingZIndex: number;
};

export const WorkspaceFloatingLayerContext = React.createContext<WorkspaceFloatingLayerContextValue | null>(null);

export function useWorkspaceFloatingLayer() {
    return React.useContext(WorkspaceFloatingLayerContext);
}
