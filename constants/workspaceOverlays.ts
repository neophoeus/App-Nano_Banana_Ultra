export const WORKSPACE_OVERLAY_Z_INDEX = {
    supportConsole: 225,
    floatingControls: 220,
    restoreNotice: 230,
    surfaceLoading: 235,
    importReview: 240,
    branchRename: 245,
    pickerSheet: 255,
    advancedSettings: 257,
    viewer: 260,
    sketchReplaceConfirm: 265,
    historyConfirm: 270,
    notification: 300,
} as const;

export const WORKSPACE_SURFACE_Z_INDEX = {
    floatingControls: {
        shell: WORKSPACE_OVERLAY_Z_INDEX.floatingControls,
        editor: 450,
        sketch: 10040,
    },
    pickerSheet: {
        shell: WORKSPACE_OVERLAY_Z_INDEX.pickerSheet,
        editor: 460,
        sketch: 10050,
    },
} as const;

export const WORKSPACE_EDITOR_Z_INDEX = {
    root: 100,
    loading: 300,
    toast: 500,
    exitConfirm: 600,
    brushCursor: 999,
    error: 1000,
} as const;

export const WORKSPACE_SKETCH_Z_INDEX = {
    root: 10001,
    brushCursor: 2500,
    confirm: 2600,
} as const;
