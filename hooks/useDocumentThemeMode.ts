import { useEffect, useState } from 'react';
import { getPreferredDarkMode, THEME_EVENT_NAME, THEME_STORAGE_KEY } from '../utils/theme';

export function useDocumentThemeMode() {
    const [isDarkTheme, setIsDarkTheme] = useState(() => getPreferredDarkMode());

    useEffect(() => {
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            return undefined;
        }

        const syncThemeState = () => {
            setIsDarkTheme(getPreferredDarkMode());
        };

        const handleThemeChange = () => {
            setIsDarkTheme(document.documentElement.classList.contains('dark'));
        };

        const mediaQuery =
            typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: dark)') : null;
        const handleSystemThemeChange = () => {
            if (!window.localStorage.getItem(THEME_STORAGE_KEY)) {
                syncThemeState();
            }
        };

        syncThemeState();
        window.addEventListener('storage', syncThemeState);
        window.addEventListener(THEME_EVENT_NAME, handleThemeChange);
        mediaQuery?.addEventListener('change', handleSystemThemeChange);

        return () => {
            window.removeEventListener('storage', syncThemeState);
            window.removeEventListener(THEME_EVENT_NAME, handleThemeChange);
            mediaQuery?.removeEventListener('change', handleSystemThemeChange);
        };
    }, []);

    return isDarkTheme;
}
