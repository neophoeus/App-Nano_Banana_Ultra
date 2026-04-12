import React from 'react';

export type ModalFloatingLayerContextValue = {
    hostElement: HTMLDivElement | null;
    floatingZIndex: number;
};

export const ModalFloatingLayerContext = React.createContext<ModalFloatingLayerContextValue | null>(null);

export function useModalFloatingLayer() {
    return React.useContext(ModalFloatingLayerContext);
}
