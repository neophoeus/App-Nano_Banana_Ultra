import React, { useState, useRef, useEffect } from 'react';
import { Language, SUPPORTED_LANGUAGES } from '../utils/translations';

interface LanguageSelectorProps {
    currentLanguage: Language;
    onLanguageChange: (lang: Language) => void;
    className?: string;
    buttonClassName?: string;
    menuClassName?: string;
}

const languageToggleBaseClassName =
    'flex min-w-[50px] items-center justify-center gap-1.5 rounded-full border px-3 py-2.5 shadow-lg transition-colors duration-200';

const languageToggleClosedClassName =
    'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-100 hover:text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-gray-500 dark:hover:bg-gray-700 dark:hover:text-white';

const languageToggleOpenClassName =
    'border-amber-400 bg-white text-amber-700 ring-2 ring-amber-500/15 hover:border-amber-500 hover:bg-amber-50 dark:border-amber-500/60 dark:bg-gray-800 dark:text-amber-300 dark:ring-amber-400/20 dark:hover:border-amber-400 dark:hover:bg-gray-700 dark:hover:text-amber-200';

const languageMenuPanelClassName =
    'absolute top-full right-0 z-50 mt-3 w-40 overflow-hidden animate-[fadeIn_0.1s_ease-out] rounded-xl border border-gray-200 bg-white shadow-2xl ring-1 ring-black/5 dark:border-gray-700 dark:bg-gray-900 dark:ring-white/10';

const languageMenuOptionBaseClassName =
    'flex w-full items-center gap-2 border-b border-gray-100 px-4 py-2.5 text-left text-xs transition-colors last:border-0 dark:border-gray-800';

const languageMenuOptionActiveClassName =
    'bg-amber-50 text-amber-700 font-bold dark:bg-amber-500/20 dark:text-amber-200';

const languageMenuOptionInactiveClassName =
    'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white';

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
    currentLanguage,
    onLanguageChange,
    className = '',
    buttonClassName = '',
    menuClassName = '',
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.value === currentLanguage);

    return (
        <div className={`relative ${isOpen ? 'z-[80]' : 'z-10'} ${className}`} ref={dropdownRef}>
            <button
                data-testid="language-selector-toggle"
                onClick={() => setIsOpen(!isOpen)}
                className={`${languageToggleBaseClassName} ${isOpen ? languageToggleOpenClassName : languageToggleClosedClassName} ${buttonClassName}`}
                title={currentLangObj?.label}
                type="button"
            >
                <span className="font-bold text-xs uppercase tracking-wider">{currentLangObj?.shortLabel}</span>
            </button>

            {isOpen && (
                <div data-testid="language-selector-menu" className={`${languageMenuPanelClassName} ${menuClassName}`}>
                    <div className="nbu-scrollbar-subtle max-h-[60vh] overflow-y-auto py-1">
                        {SUPPORTED_LANGUAGES.map((lang) => (
                            <button
                                key={lang.value}
                                data-testid={`language-option-${lang.value}`}
                                onClick={() => {
                                    onLanguageChange(lang.value);
                                    setIsOpen(false);
                                }}
                                className={`${languageMenuOptionBaseClassName} ${currentLanguage === lang.value ? languageMenuOptionActiveClassName : languageMenuOptionInactiveClassName}`}
                            >
                                <span className="w-5 text-center font-bold opacity-70">{lang.shortLabel}</span>
                                <span className="tracking-wide">{lang.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LanguageSelector;
