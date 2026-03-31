import React, { useState, useRef, useEffect } from 'react';
import { Language, SUPPORTED_LANGUAGES } from '../utils/translations';

interface LanguageSelectorProps {
    currentLanguage: Language;
    onLanguageChange: (lang: Language) => void;
    className?: string;
    buttonClassName?: string;
    menuClassName?: string;
}

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
                className={`
            flex min-w-[50px] items-center justify-center gap-1.5 rounded-full px-3 py-2.5 shadow-lg transition-all duration-300
            ${
                isOpen
                    ? 'bg-gray-800 border-amber-500/50 text-amber-400 ring-2 ring-amber-500/20'
                    : 'nbu-overlay-shell text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:text-white'
            }
            ${buttonClassName}
        `}
                title={currentLangObj?.label}
                type="button"
            >
                <span className="font-bold text-xs uppercase tracking-wider">{currentLangObj?.shortLabel}</span>
            </button>

            {isOpen && (
                <div
                    className={`nbu-overlay-shell absolute top-full right-0 z-50 mt-3 w-40 overflow-hidden animate-[fadeIn_0.1s_ease-out] rounded-xl ring-1 ring-black/5 dark:ring-white/10 ${menuClassName}`}
                >
                    <div className="py-1 max-h-[60vh] overflow-y-auto nbu-scrollbar-subtle">
                        {SUPPORTED_LANGUAGES.map((lang) => (
                            <button
                                key={lang.value}
                                data-testid={`language-option-${lang.value}`}
                                onClick={() => {
                                    onLanguageChange(lang.value);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2.5 text-xs flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-800/50 last:border-0 ${currentLanguage === lang.value ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 font-bold' : 'text-gray-700 dark:text-gray-300'}`}
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
