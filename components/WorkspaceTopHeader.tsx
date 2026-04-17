import React from 'react';
import { Language } from '../utils/translations';
import LanguageSelector from './LanguageSelector';
import ThemeToggle from './ThemeToggle';

type WorkspaceTopHeaderProps = {
    headerConsole: React.ReactNode;
    currentLanguage: Language;
    onLanguageChange: (language: Language) => void;
    supportRail?: React.ReactNode;
};

function BananaMark() {
    return (
        <span
            data-testid="workspace-brand-logo"
            className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-100 shadow-[0_8px_18px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-gradient-to-br dark:from-[#171b24] dark:to-[#0a0d12] dark:shadow-[0_10px_24px_rgba(0,0,0,0.28)]"
            aria-hidden="true"
        >
            <span className="absolute inset-0 rounded-2xl bg-amber-500/8"></span>
            <span className="relative text-[16px] leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.12)]">🍌</span>
        </span>
    );
}

function WorkspaceTopHeader({
    headerConsole,
    currentLanguage,
    onLanguageChange,
    supportRail,
}: WorkspaceTopHeaderProps) {
    const supportRailItems = React.Children.toArray(supportRail).flatMap((child) => {
        if (React.isValidElement(child) && child.type === React.Fragment) {
            return React.Children.toArray(child.props.children);
        }

        return [child];
    });
    const supportRailItemCount = supportRailItems.length;
    const supportRailColumnClassName =
                supportRailItemCount <= 1
                        ? 'grid-cols-1'
                        : supportRailItemCount === 2
                            ? 'grid-cols-2 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]'
                            : 'grid-cols-3';

    return (
        <header data-testid="workspace-top-header" className="pointer-events-none fixed inset-x-0 top-0 z-30 shrink-0">
            <div className="mx-auto w-full max-w-[1560px] px-4 lg:px-4 xl:px-3">
                <div
                    data-testid="workspace-top-band"
                    className="flex flex-col gap-1.5 xl:grid xl:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] xl:items-end"
                >
                    <div className="min-w-0">
                        <div
                            data-testid="workspace-top-header-bar"
                            className="pointer-events-auto nbu-shell-panel relative z-30 flex h-12 w-full min-w-0 items-center gap-2 rounded-b-[24px] rounded-t-none px-3 sm:gap-3 sm:px-4 xl:h-[52px]"
                        >
                            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                                <div className="flex min-w-0 items-center gap-2">
                                    <BananaMark />
                                    <span className="max-w-[118px] truncate text-[12px] font-black tracking-[0.08em] text-slate-900 dark:text-slate-100 sm:max-w-none sm:text-[13px]">
                                        NANO BANANA ULTRA
                                    </span>
                                </div>
                                <div className="hidden h-5 w-px bg-slate-200/80 sm:block dark:bg-white/10" />
                                <div className="min-w-0 shrink-0">{headerConsole}</div>
                            </div>
                            <div className="min-w-0 flex-1" />
                            <div className="flex shrink-0 items-center gap-2">
                                <ThemeToggle currentLanguage={currentLanguage} className="h-8 w-8 shadow-none" />
                                <LanguageSelector
                                    currentLanguage={currentLanguage}
                                    onLanguageChange={onLanguageChange}
                                    className="shrink-0"
                                    buttonClassName="h-8 min-w-[44px] px-2.5 py-0 shadow-none"
                                    menuClassName="mt-2 w-36"
                                />
                            </div>
                        </div>
                    </div>
                    {supportRail ? (
                        <section
                            data-testid="workspace-insights-collapsible"
                            className={`pointer-events-auto grid w-full ${supportRailColumnClassName} gap-1.5 xl:self-end`}
                        >
                            {supportRail}
                        </section>
                    ) : null}
                </div>
            </div>
        </header>
    );
}

export default React.memo(WorkspaceTopHeader);
