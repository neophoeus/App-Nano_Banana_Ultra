import React, { createContext, SetStateAction, useContext, useRef, useSyncExternalStore } from 'react';
import type { PickerSheet } from '../components/WorkspacePickerSheet';
import type {
    ActiveLiveProgressSession,
    BatchProgressState,
    WorkspaceDetailModalState,
} from '../hooks/useWorkspaceShellOwnerState';
import type { BranchRenameDialogState } from '../hooks/useWorkspaceSurfaceState';
import {
    AspectRatio,
    BatchPreviewSession,
    BranchContinuationSourceByOriginId,
    BranchNameOverrides,
    EditorMode,
    OptimizationMode,
    PendingProvenanceContext,
    PromptThinkingLevel,
    WorkspaceConversationState,
    WorkspacePersistenceSnapshot,
    WorkspaceSessionState,
} from '../types';
import { EMPTY_WORKSPACE_CONVERSATION_STATE } from '../utils/conversationState';
import {
    DEFAULT_OPTIMIZATION_MODE,
    normalizeOptimizationMode,
    OPTIMIZATION_MODE_STORAGE_KEY,
} from '../utils/optimizationMode';
import { isLanguageLoaded, Language, resolvePreferredLanguage } from '../utils/translations';
import { EMPTY_WORKSPACE_SESSION } from '../utils/workspacePersistence';

export interface WorkspaceRuntimeSlice {
    apiKeyReady: boolean;
    currentLang: Language;
    areInitialPreferencesReady: boolean;
    optimizationMode: OptimizationMode;
    promptThinkingLevel: PromptThinkingLevel;
}

export interface WorkspaceSurfaceSlice {
    isDebugTerminalOpen: boolean;
    showExportResultsModal: boolean;
    showMetadataViewerDrawer: boolean;
    activeWorkspaceDetailModal: WorkspaceDetailModalState;
    isQueuedBatchSpaceOpen: boolean;
    showClearWorkspaceConfirm: boolean;
    showSketchReplaceConfirm: boolean;
    isSketchPadOpen: boolean;
    isAdvancedSettingsOpen: boolean;
    isViewerOpen: boolean;
    activePickerSheet: PickerSheet;
    branchRenameDialog: BranchRenameDialogState | null;
    branchRenameDraft: string;
    isEditing: boolean;
    editingImageSource: string | null;
    editorMode: EditorMode;
    editorRetouchLockedRatio: AspectRatio | null;
    surfaceSharedControlsBottom: number | null;
    workspaceFloatingHostElement: HTMLDivElement | null;
}

export interface WorkspaceSessionAndLineageSlice {
    workspaceSession: WorkspaceSessionState;
    pendingProvenanceContext: PendingProvenanceContext | null;
    branchNameOverrides: BranchNameOverrides;
    branchContinuationSourceByBranchOriginId: BranchContinuationSourceByOriginId;
    conversationState: WorkspaceConversationState;
}

export interface WorkspaceExecutionSlice {
    isCancelFinalizing: boolean;
    activeBatchPreviewSession: BatchPreviewSession | null;
    activeLiveProgressSession: ActiveLiveProgressSession | null;
    batchProgress: BatchProgressState;
}

export interface WorkspaceDomainState {
    runtime: WorkspaceRuntimeSlice;
    surface: WorkspaceSurfaceSlice;
    sessionAndLineage: WorkspaceSessionAndLineageSlice;
    execution: WorkspaceExecutionSlice;
}

type SlicePatch<TSlice> = Partial<TSlice> | ((prev: TSlice) => TSlice);

export interface WorkspaceDomainStore {
    getState: () => WorkspaceDomainState;
    setState: (updater: (prev: WorkspaceDomainState) => WorkspaceDomainState) => void;
    subscribe: (listener: () => void) => () => void;
    updateRuntime: (patch: SlicePatch<WorkspaceRuntimeSlice>) => void;
    updateSurface: (patch: SlicePatch<WorkspaceSurfaceSlice>) => void;
    updateSessionAndLineage: (patch: SlicePatch<WorkspaceSessionAndLineageSlice>) => void;
    updateExecution: (patch: SlicePatch<WorkspaceExecutionSlice>) => void;
    resetSurfaceOverlays: () => void;
}

const resolveInitialLanguage = (): Language => {
    const preferredLanguage = resolvePreferredLanguage();
    return isLanguageLoaded(preferredLanguage) ? preferredLanguage : 'en';
};

const resolveInitialOptimizationMode = (): OptimizationMode => {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            const saved = window.localStorage.getItem(OPTIMIZATION_MODE_STORAGE_KEY);
            if (saved) {
                return normalizeOptimizationMode(saved);
            }
        }
    } catch {
        // Ignore storage read errors
    }

    return DEFAULT_OPTIMIZATION_MODE;
};

const resolveInitialPromptThinkingLevel = (): PromptThinkingLevel => {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            const saved = window.localStorage.getItem('nb_prompt_thinking_level');
            if (saved === 'low' || saved === 'medium' || saved === 'high') {
                return saved;
            }
        }
    } catch {
        // Ignore storage read errors
    }

    return 'low';
};

export const INITIAL_SURFACE_SLICE: WorkspaceSurfaceSlice = {
    isDebugTerminalOpen: false,
    showExportResultsModal: false,
    showMetadataViewerDrawer: false,
    activeWorkspaceDetailModal: null,
    isQueuedBatchSpaceOpen: false,
    showClearWorkspaceConfirm: false,
    showSketchReplaceConfirm: false,
    isSketchPadOpen: false,
    isAdvancedSettingsOpen: false,
    isViewerOpen: false,
    activePickerSheet: null,
    branchRenameDialog: null,
    branchRenameDraft: '',
    isEditing: false,
    editingImageSource: null,
    editorMode: 'inpaint',
    editorRetouchLockedRatio: null,
    surfaceSharedControlsBottom: null,
    workspaceFloatingHostElement: null,
};

export const INITIAL_EXECUTION_SLICE: WorkspaceExecutionSlice = {
    isCancelFinalizing: false,
    activeBatchPreviewSession: null,
    activeLiveProgressSession: null,
    batchProgress: { completed: 0, total: 0 },
};

export function shallowEqual<T>(left: T, right: T): boolean {
    if (Object.is(left, right)) {
        return true;
    }

    if (typeof left !== 'object' || left === null || typeof right !== 'object' || right === null) {
        return false;
    }

    const leftRecord = left as Record<string, unknown>;
    const rightRecord = right as Record<string, unknown>;
    const leftKeys = Object.keys(leftRecord);
    const rightKeys = Object.keys(rightRecord);

    if (leftKeys.length !== rightKeys.length) {
        return false;
    }

    for (const key of leftKeys) {
        if (!Object.prototype.hasOwnProperty.call(rightRecord, key) || !Object.is(leftRecord[key], rightRecord[key])) {
            return false;
        }
    }

    return true;
}

const applySlicePatch = <TSlice extends object>(prevSlice: TSlice, patch: SlicePatch<TSlice>): TSlice => {
    const nextCandidate = typeof patch === 'function' ? patch(prevSlice) : { ...prevSlice, ...patch };
    return shallowEqual(prevSlice, nextCandidate) ? prevSlice : nextCandidate;
};

export function createWorkspaceDomainStore(initialSnapshot: WorkspacePersistenceSnapshot): WorkspaceDomainStore {
    let state: WorkspaceDomainState = {
        runtime: {
            apiKeyReady: false,
            currentLang: resolveInitialLanguage(),
            areInitialPreferencesReady: false,
            optimizationMode: resolveInitialOptimizationMode(),
            promptThinkingLevel: resolveInitialPromptThinkingLevel(),
        },
        surface: { ...INITIAL_SURFACE_SLICE },
        sessionAndLineage: {
            workspaceSession: initialSnapshot.workspaceSession || EMPTY_WORKSPACE_SESSION,
            pendingProvenanceContext: null,
            branchNameOverrides: initialSnapshot.branchState?.nameOverrides || {},
            branchContinuationSourceByBranchOriginId:
                initialSnapshot.branchState?.continuationSourceByBranchOriginId || {},
            conversationState: initialSnapshot.conversationState || EMPTY_WORKSPACE_CONVERSATION_STATE,
        },
        execution: {
            ...INITIAL_EXECUTION_SLICE,
            batchProgress: { completed: 0, total: 0 },
        },
    };

    const listeners = new Set<() => void>();

    const getState = (): WorkspaceDomainState => state;

    const setState = (updater: (prev: WorkspaceDomainState) => WorkspaceDomainState): void => {
        const nextState = updater(state);
        if (Object.is(nextState, state)) {
            return;
        }
        state = nextState;
        listeners.forEach((listener) => listener());
    };

    const subscribe = (listener: () => void): (() => void) => {
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    };

    const updateRuntime = (patch: SlicePatch<WorkspaceRuntimeSlice>): void => {
        setState((prev) => {
            const nextRuntime = applySlicePatch(prev.runtime, patch);
            return Object.is(nextRuntime, prev.runtime) ? prev : { ...prev, runtime: nextRuntime };
        });
    };

    const updateSurface = (patch: SlicePatch<WorkspaceSurfaceSlice>): void => {
        setState((prev) => {
            const nextSurface = applySlicePatch(prev.surface, patch);
            return Object.is(nextSurface, prev.surface) ? prev : { ...prev, surface: nextSurface };
        });
    };

    const updateSessionAndLineage = (patch: SlicePatch<WorkspaceSessionAndLineageSlice>): void => {
        setState((prev) => {
            const nextSessionAndLineage = applySlicePatch(prev.sessionAndLineage, patch);
            return Object.is(nextSessionAndLineage, prev.sessionAndLineage)
                ? prev
                : { ...prev, sessionAndLineage: nextSessionAndLineage };
        });
    };

    const updateExecution = (patch: SlicePatch<WorkspaceExecutionSlice>): void => {
        setState((prev) => {
            const nextExecution = applySlicePatch(prev.execution, patch);
            return Object.is(nextExecution, prev.execution) ? prev : { ...prev, execution: nextExecution };
        });
    };

    const resetSurfaceOverlays = (): void => {
        updateSurface((prev) => ({
            ...INITIAL_SURFACE_SLICE,
            isDebugTerminalOpen: prev.isDebugTerminalOpen,
            workspaceFloatingHostElement: prev.workspaceFloatingHostElement,
        }));
    };

    return {
        getState,
        setState,
        subscribe,
        updateRuntime,
        updateSurface,
        updateSessionAndLineage,
        updateExecution,
        resetSurfaceOverlays,
    };
}

export function createStoreFieldSetter<TSlice extends object, TKey extends keyof TSlice>(
    getSlice: () => TSlice,
    updateSlice: (patch: SlicePatch<TSlice>) => void,
    key: TKey,
): React.Dispatch<SetStateAction<TSlice[TKey]>> {
    return (action: SetStateAction<TSlice[TKey]>) => {
        const currentValue = getSlice()[key];
        const nextValue =
            typeof action === 'function' ? (action as (prev: TSlice[TKey]) => TSlice[TKey])(currentValue) : action;

        if (Object.is(currentValue, nextValue)) {
            return;
        }

        updateSlice({ [key]: nextValue } as unknown as Partial<TSlice>);
    };
}

export function useWorkspaceSelector<TSelected>(
    store: WorkspaceDomainStore,
    selector: (state: WorkspaceDomainState) => TSelected,
    isEqual: (left: TSelected, right: TSelected) => boolean = Object.is,
): TSelected {
    const cacheRef = useRef<{ hasValue: boolean; state: WorkspaceDomainState | null; selected: TSelected | null }>({
        hasValue: false,
        state: null,
        selected: null,
    });

    const getSelection = (): TSelected => {
        const currentState = store.getState();
        if (cacheRef.current.hasValue && Object.is(cacheRef.current.state, currentState)) {
            return cacheRef.current.selected as TSelected;
        }

        const nextSelected = selector(currentState);
        if (cacheRef.current.hasValue && isEqual(cacheRef.current.selected as TSelected, nextSelected)) {
            cacheRef.current.state = currentState;
            return cacheRef.current.selected as TSelected;
        }

        cacheRef.current = {
            hasValue: true,
            state: currentState,
            selected: nextSelected,
        };
        return nextSelected;
    };

    return useSyncExternalStore(store.subscribe, getSelection, getSelection);
}

export const WorkspaceDomainStoreContext = createContext<WorkspaceDomainStore | null>(null);

export function useWorkspaceDomainStore(): WorkspaceDomainStore {
    const store = useContext(WorkspaceDomainStoreContext);
    if (!store) {
        throw new Error('useWorkspaceDomainStore must be used within a WorkspaceDomainStoreContext.Provider.');
    }
    return store;
}
