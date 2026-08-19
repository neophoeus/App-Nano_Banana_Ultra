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
    supportsAutoBackup: boolean;
    supportsStorageWarning: boolean;
    supportsKeepAliveHeartbeat: boolean;
    executionModeName: ResolvedExecutionMode;
}

export const EXECUTION_MODE_STORAGE_KEY = 'nbu_execution_mode_setting';

const listeners = new Set<(mode: ResolvedExecutionMode, setting: WorkspaceExecutionModeSetting) => void>();

export const isLocalhostEnvironment = (): boolean => {
    if (typeof window === 'undefined' || !window.location) {
        return true;
    }

    const hostname = window.location.hostname;
    return (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '[::1]' ||
        hostname.endsWith('.localhost') ||
        hostname.endsWith('.internal')
    );
};

export const isAiStudioEnvironment = (): boolean => {
    if (typeof window === 'undefined') {
        return false;
    }

    return Boolean(window.aistudio);
};

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

const resolveInitialExecutionMode = (): ResolvedExecutionMode => {
    const stored = getStoredExecutionModeSetting();
    if (stored === 'local') {
        return 'local';
    }
    if (stored === 'direct') {
        return 'direct';
    }
    if (typeof window !== 'undefined' && (!isLocalhostEnvironment() || isAiStudioEnvironment())) {
        return 'direct';
    }
    return 'local';
};

let currentSetting: WorkspaceExecutionModeSetting = 'auto';
let resolvedMode: ResolvedExecutionMode = resolveInitialExecutionMode();
let isDetecting = false;
let hasDetectedOnce = false;

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

export const probeLocalServerHealth = async (timeoutMs = 1500): Promise<boolean> => {
    if (typeof window === 'undefined' || typeof fetch === 'undefined') {
        return false;
    }

    if (!isLocalhostEnvironment()) {
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
        if (!response.ok) {
            return false;
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            return false;
        }

        const data = await response.json().catch(() => null);
        return Boolean(data && (data.ok === true || data.status === 'ok'));
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
        if (isAiStudioEnvironment() || !isLocalhostEnvironment()) {
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
        resolvedMode = resolveInitialExecutionMode();
    }

    return resolvedMode;
};

export const getExecutionCapabilities = (mode = getResolvedExecutionMode()): ExecutionCapabilities => ({
    supportsLocalDiskSave: mode === 'local',
    supportsQueuedBatch: mode === 'local',
    supportsServerStreaming: mode === 'local',
    supportsCustomApiKey: mode === 'direct',
    supportsAutoBackup: mode === 'direct',
    supportsStorageWarning: mode === 'direct',
    supportsKeepAliveHeartbeat: mode === 'direct' || isAiStudioEnvironment(),
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
