import { useState, useEffect, useCallback } from 'react';
import {
    ExecutionCapabilities,
    ResolvedExecutionMode,
    WorkspaceExecutionModeSetting,
    detectExecutionMode,
    getCurrentExecutionModeSetting,
    getExecutionCapabilities,
    getResolvedExecutionMode,
    setStoredExecutionModeSetting,
    subscribeExecutionMode,
} from '../utils/workspaceExecutionMode';

export interface UseWorkspaceExecutionModeResult {
    setting: WorkspaceExecutionModeSetting;
    resolvedMode: ResolvedExecutionMode;
    capabilities: ExecutionCapabilities;
    setSetting: (setting: WorkspaceExecutionModeSetting) => void;
    refreshDetection: () => Promise<ResolvedExecutionMode>;
}

export const useWorkspaceExecutionMode = (): UseWorkspaceExecutionModeResult => {
    const [setting, setSettingState] = useState<WorkspaceExecutionModeSetting>(getCurrentExecutionModeSetting);
    const [resolvedMode, setResolvedMode] = useState<ResolvedExecutionMode>(getResolvedExecutionMode);

    useEffect(() => {
        const unsubscribe = subscribeExecutionMode((newMode, newSetting) => {
            setResolvedMode(newMode);
            setSettingState(newSetting);
        });

        void detectExecutionMode();

        return unsubscribe;
    }, []);

    const setSetting = useCallback((newSetting: WorkspaceExecutionModeSetting) => {
        setStoredExecutionModeSetting(newSetting);
    }, []);

    const refreshDetection = useCallback(async () => {
        return await detectExecutionMode();
    }, []);

    return {
        setting,
        resolvedMode,
        capabilities: getExecutionCapabilities(resolvedMode),
        setSetting,
        refreshDetection,
    };
};
