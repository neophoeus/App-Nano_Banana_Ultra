import React, { useEffect, useState } from 'react';
import { Language, getTranslation } from '../utils/translations';

interface ThemeToggleProps {
    currentLanguage?: Language;
    className?: string;
}

const THEME_STORAGE_KEY = 'theme';
const THEME_EVENT_NAME = 'nbu-theme-change';
const THEME_SWITCHING_CLASS = 'nbu-theme-switching';

let themeSwitchCleanupTimeout: number | null = null;

const getPreferredDarkMode = () => {
    if (typeof window === 'undefined') {
        return true;
    }

    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return storedTheme === 'dark' || (!storedTheme && prefersDark);
};

const syncDocumentTheme = (isDark: boolean) => {
    if (typeof document === 'undefined') {
        return;
    }

    document.documentElement.classList.toggle('dark', isDark);
};

const applyThemeWithTransitionSuppression = (isDark: boolean) => {
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

const ThemeToggle: React.FC<ThemeToggleProps> = ({ currentLanguage = 'en' as Language, className = '' }) => {
    const t = (key: string) => getTranslation(currentLanguage, key);
    const [isDark, setIsDark] = useState(() => getPreferredDarkMode());

    useEffect(() => {
        const syncThemeState = () => {
            const nextIsDark = getPreferredDarkMode();
            applyThemeWithTransitionSuppression(nextIsDark);
            setIsDark(nextIsDark);
        };

        const handleThemeChange = () => {
            if (typeof document === 'undefined') {
                return;
            }

            setIsDark(document.documentElement.classList.contains('dark'));
        };

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleSystemThemeChange = () => {
            if (!window.localStorage.getItem(THEME_STORAGE_KEY)) {
                syncThemeState();
            }
        };

        syncThemeState();
        window.addEventListener('storage', syncThemeState);
        window.addEventListener(THEME_EVENT_NAME, handleThemeChange);
        mediaQuery.addEventListener('change', handleSystemThemeChange);

        return () => {
            window.removeEventListener('storage', syncThemeState);
            window.removeEventListener(THEME_EVENT_NAME, handleThemeChange);
            mediaQuery.removeEventListener('change', handleSystemThemeChange);
        };
    }, []);

    const toggleTheme = () => {
        const newDark = !isDark;
        setIsDark(newDark);

        applyThemeWithTransitionSuppression(newDark);

        if (typeof window !== 'undefined') {
            window.localStorage.setItem(THEME_STORAGE_KEY, newDark ? 'dark' : 'light');
            window.dispatchEvent(new CustomEvent(THEME_EVENT_NAME, { detail: { isDark: newDark } }));
        }
    };

    return (
        <button
            onClick={toggleTheme}
            aria-label={isDark ? t('switchLight') : t('switchDark')}
            className={`
        flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition-all duration-300
        ${
            isDark
                ? 'nbu-overlay-shell text-amber-400 hover:bg-gray-800 hover:text-amber-300'
                : 'nbu-overlay-shell text-amber-600 hover:bg-gray-50 hover:text-amber-700 shadow-amber-500/10'
        }
        ${className}
      `}
            title={isDark ? t('switchLight') : t('switchDark')}
            type="button"
        >
            {isDark ? (
                // Moon Icon
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                    />
                </svg>
            ) : (
                // Sun Icon
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                </svg>
            )}
        </button>
    );
};

export default ThemeToggle;
