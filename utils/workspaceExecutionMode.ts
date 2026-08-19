/**
 * Execution Mode Management:
 * Supports 'auto' (detect based on environment / server health),
 * 'local' (force Vite Node backend / local API / disk saving / queued batch),
 * and 'direct' (force client-side @google/genai / AI Studio / IndexedDB saving).
 */

export type WorkspaceExecutionModeSetting = 'auto' | 'local' | 'direct';
export type ResolvedExecutionMode = 'local' | 'direct';

export interface ExecutionCapabilities {
    supportsLocalDiskSave: boolean;
    supportsQueuedBatch: boolean;
    supportsServerStreaming: boolean;
    supportsCustomApiKey: boolean;
    executionModeName: ResolvedExecutionMode;
}

export const EXECUTION_MODE_STORAGE_KEY = 'nbu_execution_mode_setting';

const listeners = new Set<(mode: ResolvedExecutionMode, setting: WorkspaceExecutionModeSetting) => void>();

let currentSetting: WorkspaceExecutionModeSetting = 'auto';
let resolvedMode: ResolvedExecutionMode = 'local';
let isDetecting = false;
let hasDetectedOnce = false;

export const getStoredExecutionModeSetting = (): WorkspaceExecutionModeSetting => {
    if (typeof window === 'undefined') {
        return 'auto';
    }

    try {
        const stored = window.localStorage.getItem(EXECUTION_MODE_STORAGE_KEY);
        if (stored === 'local' || stored === 'direct' || stored === 'auto') {
            return stored;
        }
    } catch {
        // Ignore storage errors.
    }

    return 'auto';
};

export const setStoredExecutionModeSetting = (setting: WorkspaceExecutionModeSetting): void => {
    currentSetting = setting;
    if (typeof window !== 'undefined') {
        try {
            window.localStorage.setItem(EXECUTION_MODE_STORAGE_KEY, setting);
        } catch {
            // Ignore storage errors.
        }
    }

    if (setting === 'local') {
        resolvedMode = 'local';
        notifyListeners();
    } else if (setting === 'direct') {
        resolvedMode = 'direct';
        notifyListeners();
    } else {
        void detectExecutionMode();
    }
};

const notifyListeners = () => {
    listeners.forEach((listener) => listener(resolvedMode, currentSetting));
};

export const subscribeExecutionMode = (
    listener: (mode: ResolvedExecutionMode, setting: WorkspaceExecutionModeSetting) => void,
): (() => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};

export const isAiStudioEnvironment = (): boolean => {
    if (typeof window === 'undefined') {
        return false;
    }

    return Boolean(window.aistudio);
};

export const probeLocalServerHealth = async (timeoutMs = 1500): Promise<boolean> => {
    if (typeof window === 'undefined' || typeof fetch === 'undefined') {
        return false;
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch('/api/health', {
            method: 'GET',
            signal: controller.signal,
            cache: 'no-store',
        });

        clearTimeout(timeoutId);
        return response.ok;
    } catch {
        return false;
    }
};

export const detectExecutionMode = async (): Promise<ResolvedExecutionMode> => {
    currentSetting = getStoredExecutionModeSetting();

    if (currentSetting === 'local') {
        resolvedMode = 'local';
        hasDetectedOnce = true;
        notifyListeners();
        return 'local';
    }

    if (currentSetting === 'direct') {
        resolvedMode = 'direct';
        hasDetectedOnce = true;
        notifyListeners();
        return 'direct';
    }

    if (isDetecting) {
        return resolvedMode;
    }

    isDetecting = true;

    try {
        if (isAiStudioEnvironment()) {
            resolvedMode = 'direct';
        } else {
            const isLocalServerHealthy = await probeLocalServerHealth(1500);
            resolvedMode = isLocalServerHealthy ? 'local' : 'direct';
        }
    } catch {
        resolvedMode = 'direct';
    } finally {
        isDetecting = false;
        hasDetectedOnce = true;
        notifyListeners();
    }

    return resolvedMode;
};

export const getResolvedExecutionMode = (): ResolvedExecutionMode => {
    if (!hasDetectedOnce) {
        currentSetting = getStoredExecutionModeSetting();
        if (currentSetting === 'local') {
            resolvedMode = 'local';
        } else if (currentSetting === 'direct') {
            resolvedMode = 'direct';
        }
    }

    return resolvedMode;
};

export const getExecutionCapabilities = (mode = getResolvedExecutionMode()): ExecutionCapabilities => ({
    supportsLocalDiskSave: mode === 'local',
    supportsQueuedBatch: mode === 'local',
    supportsServerStreaming: mode === 'local',
    supportsCustomApiKey: mode === 'direct',
    executionModeName: mode,
});

export const getCurrentExecutionModeSetting = (): WorkspaceExecutionModeSetting => currentSetting;

// Convenient aliases
export const getExecutionModeSetting = getStoredExecutionModeSetting;
export const setExecutionModeSetting = setStoredExecutionModeSetting;
export const getWorkspaceExecutionCapabilities = getExecutionCapabilities;
export const subscribeWorkspaceExecutionMode = (
    listener: (data: { setting: WorkspaceExecutionModeSetting; resolvedMode: ResolvedExecutionMode }) => void,
) => {
    return subscribeExecutionMode((mode, setting) => {
        listener({ setting, resolvedMode: mode });
    });
};
export const probeExecutionMode = detectExecutionMode;
export const WORKSPACE_EXECUTION_MODE_STORAGE_KEY = EXECUTION_MODE_STORAGE_KEY;
