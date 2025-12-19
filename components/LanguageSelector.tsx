

import React, { useState, useRef, useEffect } from 'react';
import { Language, SUPPORTED_LANGUAGES } from '../utils/translations';

interface LanguageSelectorProps {
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ currentLanguage, onLanguageChange }) => {
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

  const currentLangObj = SUPPORTED_LANGUAGES.find(l => l.value === currentLanguage);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
            flex items-center gap-1.5 px-3 py-2.5 rounded-full shadow-lg transition-all duration-300 min-w-[50px] justify-center
            ${isOpen 
                ? 'bg-gray-800 border-amber-500/50 text-amber-400 ring-2 ring-amber-500/20' 
                : 'bg-white dark:bg-[#0a0c10]/90 backdrop-blur-md border border-gray-200 dark:border-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-500 hover:text-gray-900 dark:hover:text-white'
            }
        `}
        title={currentLangObj?.label}
      >
        <span className="font-bold text-xs uppercase tracking-wider">{currentLangObj?.shortLabel}</span>
      </button>

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-3 w-40 bg-white/95 dark:bg-[#161b22]/95 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.1)] dark:shadow-[0_0_30px_rgba(0,0,0,0.5)] z-50 overflow-hidden animate-[fadeIn_0.1s_ease-out] ring-1 ring-black/5 dark:ring-white/10">
          <div className="py-1 max-h-[60vh] overflow-y-auto scrollbar-thin">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.value}
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