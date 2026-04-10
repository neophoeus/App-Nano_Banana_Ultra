export const THEME_STORAGE_KEY = 'theme';
export const THEME_EVENT_NAME = 'nbu-theme-change';
const THEME_SWITCHING_CLASS = 'nbu-theme-switching';

let themeSwitchCleanupTimeout: number | null = null;

export const getPreferredDarkMode = (): boolean => {
    if (typeof window === 'undefined') {
        return true;
    }

    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    const prefersDark =
        typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: dark)').matches : false;
    return storedTheme === 'dark' || (!storedTheme && prefersDark);
};

export const syncDocumentTheme = (isDark: boolean): void => {
    if (typeof document === 'undefined') {
        return;
    }

    document.documentElement.classList.toggle('dark', isDark);
};

export const applyThemeWithTransitionSuppression = (isDark: boolean): void => {
    if (typeof document === 'undefined') {
        return;
    }

    const root = document.documentElement;

    root.classList.add(THEME_SWITCHING_CLASS);
    syncDocumentTheme(isDark);

    void root.offsetWidth;

    if (typeof window === 'undefined') {
        root.classList.remove(THEME_SWITCHING_CLASS);
        return;
    }

    if (themeSwitchCleanupTimeout !== null) {
        window.clearTimeout(themeSwitchCleanupTimeout);
    }

    themeSwitchCleanupTimeout = window.setTimeout(() => {
        root.classList.remove(THEME_SWITCHING_CLASS);
        themeSwitchCleanupTimeout = null;
    }, 0);
};

export const syncThemeFromStoredPreference = (): boolean => {
    const isDark = getPreferredDarkMode();
    applyThemeWithTransitionSuppression(isDark);
    return isDark;
};

export const persistThemePreference = (isDark: boolean): void => {
    if (typeof window === 'undefined') {
        return;
    }

    window.localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
    window.dispatchEvent(new CustomEvent(THEME_EVENT_NAME, { detail: { isDark } }));
};
