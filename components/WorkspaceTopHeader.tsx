import React from 'react';
import { Language } from '../utils/translations';
import LanguageSelector from './LanguageSelector';
import ThemeToggle from './ThemeToggle';

type WorkspaceTopHeaderProps = {
    headerConsole: React.ReactNode;
    currentLanguage: Language;
    onLanguageChange: (language: Language) => void;
};

function WorkspaceTopHeader({ headerConsole, currentLanguage, onLanguageChange }: WorkspaceTopHeaderProps) {
    return (
        <header className="relative z-30 shrink-0">
            <div className="nbu-shell-panel nbu-shell-surface-header relative z-30 mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-3 rounded-full px-4 py-3">
                <div className="flex items-center gap-3 rounded-full bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 px-4 py-2 text-sm font-black uppercase tracking-[0.22em] text-black shadow-lg">
                    <span>NBU</span>
                    <span className="hidden sm:inline">Nano Banana Ultra</span>
                </div>
                <div className="min-w-0 max-w-full">{headerConsole}</div>
                <ThemeToggle currentLanguage={currentLanguage} />
                <LanguageSelector currentLanguage={currentLanguage} onLanguageChange={onLanguageChange} />
            </div>
        </header>
    );
}

export default React.memo(WorkspaceTopHeader);
