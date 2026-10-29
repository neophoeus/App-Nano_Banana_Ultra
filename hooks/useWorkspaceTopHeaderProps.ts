import { ReactNode, useMemo } from 'react';
import WorkspaceTopHeader from '../components/WorkspaceTopHeader';
import { OptimizationMode } from '../types';
import { Language } from '../utils/translations';

type WorkspaceTopHeaderProps = React.ComponentProps<typeof WorkspaceTopHeader>;

type UseWorkspaceTopHeaderPropsArgs = {
    headerConsole: ReactNode;
    currentLanguage: Language;
    onLanguageChange: (language: Language) => void;
    supportRail?: ReactNode;
    optimizationMode?: OptimizationMode;
    onOptimizationModeChange?: (mode: OptimizationMode) => void;
};

export function useWorkspaceTopHeaderProps({
    headerConsole,
    currentLanguage,
    onLanguageChange,
    supportRail,
    optimizationMode,
    onOptimizationModeChange,
}: UseWorkspaceTopHeaderPropsArgs): WorkspaceTopHeaderProps {
    return useMemo(
        () => ({
            headerConsole,
            currentLanguage,
            onLanguageChange,
            supportRail,
            optimizationMode,
            onOptimizationModeChange,
        }),
        [headerConsole, currentLanguage, onLanguageChange, supportRail, optimizationMode, onOptimizationModeChange],
    );
}
