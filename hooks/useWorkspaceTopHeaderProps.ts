import { ReactNode, useMemo } from 'react';
import WorkspaceTopHeader from '../components/WorkspaceTopHeader';
import { Language } from '../utils/translations';

type WorkspaceTopHeaderProps = React.ComponentProps<typeof WorkspaceTopHeader>;

type UseWorkspaceTopHeaderPropsArgs = {
    headerConsole: ReactNode;
    currentLanguage: Language;
    onLanguageChange: (language: Language) => void;
    supportRail?: ReactNode;
};

export function useWorkspaceTopHeaderProps({
    headerConsole,
    currentLanguage,
    onLanguageChange,
    supportRail,
}: UseWorkspaceTopHeaderPropsArgs): WorkspaceTopHeaderProps {
    return useMemo(
        () => ({
            headerConsole,
            currentLanguage,
            onLanguageChange,
            supportRail,
        }),
        [headerConsole, currentLanguage, onLanguageChange, supportRail],
    );
}
