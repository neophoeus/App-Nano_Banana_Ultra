import { useEffect, useState } from 'react';

const DESKTOP_WORKSPACE_PANEL_QUERY = '(min-width: 1280px)';

const getDesktopPanelMatch = () => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return false;
    }

    return window.matchMedia(DESKTOP_WORKSPACE_PANEL_QUERY).matches;
};

export function useResponsivePanelState() {
    const [isDesktop, setIsDesktop] = useState(getDesktopPanelMatch);
    const [isOpen, setIsOpen] = useState(getDesktopPanelMatch);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
            return undefined;
        }

        const mediaQuery = window.matchMedia(DESKTOP_WORKSPACE_PANEL_QUERY);
        const syncState = (matches: boolean) => {
            setIsDesktop(matches);
            setIsOpen(matches);
        };
        const handleChange = (event: MediaQueryListEvent) => {
            syncState(event.matches);
        };

        syncState(mediaQuery.matches);

        if (typeof mediaQuery.addEventListener === 'function') {
            mediaQuery.addEventListener('change', handleChange);

            return () => mediaQuery.removeEventListener('change', handleChange);
        }

        mediaQuery.addListener(handleChange);

        return () => mediaQuery.removeListener(handleChange);
    }, []);

    return {
        isDesktop,
        isOpen,
        setIsOpen,
    };
}
