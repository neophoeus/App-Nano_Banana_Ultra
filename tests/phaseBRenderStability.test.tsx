/** @vitest-environment jsdom */

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WORKSPACE_SNAPSHOT_STORAGE_KEY } from '../utils/workspacePersistence';

type RenderTracker = {
    renders: number;
    changedKeys: string[][];
};

const trackers = vi.hoisted(() => ({
    generatedImage: { renders: 0, changedKeys: [] as string[][] },
    recentHistoryFilmstrip: { renders: 0, changedKeys: [] as string[][] },
    workspaceHistoryCanvas: { renders: 0, changedKeys: [] as string[][] },
    composerSettingsPanel: { renders: 0, changedKeys: [] as string[][] },
    workspaceSideToolPanel: { renders: 0, changedKeys: [] as string[][] },
}));

const recordRender = (tracker: RenderTracker, props: Record<string, unknown>, previous?: Record<string, unknown>) => {
    tracker.renders += 1;
    if (!previous) {
        tracker.changedKeys.push(Object.keys(props));
        return;
    }

    const changedKeys = Object.keys({ ...previous, ...props }).filter((key) => previous[key] !== props[key]);
    tracker.changedKeys.push(changedKeys);
};

vi.mock('../components/GeneratedImage', async () => {
    const ReactModule = await vi.importActual<typeof import('react')>('react');
    const Component = ReactModule.memo((props: Record<string, unknown>) => {
        const previousPropsRef = ReactModule.useRef<Record<string, unknown>>();
        recordRender(trackers.generatedImage, props, previousPropsRef.current);
        previousPropsRef.current = props;
        return <div data-testid="mock-generated-image" />;
    });
    return { default: Component };
});

vi.mock('../components/RecentHistoryFilmstrip', async () => {
    const ReactModule = await vi.importActual<typeof import('react')>('react');
    const Component = ReactModule.memo((props: Record<string, unknown>) => {
        const previousPropsRef = ReactModule.useRef<Record<string, unknown>>();
        recordRender(trackers.recentHistoryFilmstrip, props, previousPropsRef.current);
        previousPropsRef.current = props;
        return <div data-testid="mock-recent-history-filmstrip" />;
    });
    return { default: Component };
});

vi.mock('../components/WorkspaceHistoryCanvas', async () => {
    const ReactModule = await vi.importActual<typeof import('react')>('react');
    const Component = ReactModule.memo((props: Record<string, unknown>) => {
        const previousPropsRef = ReactModule.useRef<Record<string, unknown>>();
        recordRender(trackers.workspaceHistoryCanvas, props, previousPropsRef.current);
        previousPropsRef.current = props;
        return (
            <div data-testid="mock-workspace-history-canvas">
                {props.recentLane as React.ReactNode}
                {props.focusSurface as React.ReactNode}
                {props.supportSurface as React.ReactNode}
            </div>
        );
    });
    return { default: Component };
});

vi.mock('../components/ComposerSettingsPanel', async () => {
    const ReactModule = await vi.importActual<typeof import('react')>('react');
    const Component = ReactModule.memo((props: Record<string, unknown>) => {
        const previousPropsRef = ReactModule.useRef<Record<string, unknown>>();
        recordRender(trackers.composerSettingsPanel, props, previousPropsRef.current);
        previousPropsRef.current = props;
        return (
            <div data-testid="mock-composer-settings-panel">
                <button onClick={() => (props.onToggleAdvancedSettings as (() => void) | undefined)?.()}>
                    Advanced Settings
                </button>
                <button onClick={() => (props.onOpenReferences as (() => void) | undefined)?.()}>
                    Open References
                </button>
            </div>
        );
    });
    return { default: Component };
});

vi.mock('../components/WorkspaceSideToolPanel', async () => {
    const ReactModule = await vi.importActual<typeof import('react')>('react');
    const Component = ReactModule.memo((props: Record<string, unknown>) => {
        const previousPropsRef = ReactModule.useRef<Record<string, unknown>>();
        recordRender(trackers.workspaceSideToolPanel, props, previousPropsRef.current);
        previousPropsRef.current = props;
        return <div data-testid="mock-workspace-side-tool-panel" />;
    });
    return { default: Component };
});

vi.mock('../components/WorkspaceHealthPanel', () => ({
    default: () => <div data-testid="mock-global-log-console" />,
}));

vi.mock('../components/ImageEditor', () => ({
    default: () => <div data-testid="mock-image-editor" />,
}));

vi.mock('../components/SketchPad', () => ({
    default: () => <div data-testid="mock-sketchpad" />,
}));

const loadApp = async () => {
    const module = await import('../App');
    return module.default;
};

const initialSnapshot = {
    history: [
        {
            id: 'history-turn-1',
            url: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
            prompt: 'Existing stage image',
            aspectRatio: '1:1',
            size: '1K',
            style: 'None',
            model: 'gemini-3.1-flash-image-preview',
            createdAt: 1710200000000,
            mode: 'Text to Image',
            executionMode: 'single-turn',
            status: 'success',
            text: 'Existing output',
            rootHistoryId: 'history-turn-1',
            lineageAction: 'root',
            lineageDepth: 0,
        },
    ],
    stagedAssets: [
        {
            id: 'stage-asset-1',
            role: 'stage-source',
            origin: 'generated',
            url: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
            createdAt: 1710200000000,
            sourceHistoryId: 'history-turn-1',
            lineageAction: 'root',
        },
    ],
    workflowLogs: [],
    queuedJobs: [],
    workspaceSession: {
        activeResult: {
            text: 'Existing output',
            thoughts: null,
            grounding: null,
            metadata: null,
            sessionHints: null,
            historyId: 'history-turn-1',
        },
        continuityGrounding: null,
        continuitySessionHints: null,
        provenanceMode: null,
        provenanceSourceHistoryId: null,
        conversationId: null,
        conversationBranchOriginId: null,
        conversationActiveSourceHistoryId: null,
        conversationTurnIds: [],
        source: 'history',
        sourceHistoryId: 'history-turn-1',
        updatedAt: 1710200000000,
    },
    branchState: {
        nameOverrides: {},
        continuationSourceByBranchOriginId: {},
    },
    conversationState: {
        byBranchOriginId: {},
    },
    viewState: {
        generatedImageUrls: ['data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='],
        selectedImageIndex: 0,
        selectedHistoryId: 'history-turn-1',
    },
    composerState: {
        prompt: 'Stability check prompt',
        aspectRatio: '1:1',
        imageSize: '1K',
        imageStyle: 'None',
        imageModel: 'gemini-3.1-flash-image-preview',
        batchSize: 1,
        outputFormat: 'images-only',
        temperature: 1,
        thinkingLevel: 'minimal',
        includeThoughts: false,
        googleSearch: false,
        imageSearch: false,
        generationMode: 'Text to Image',
        executionMode: 'single-turn',
    },
};

const waitFor = async <T,>(callback: () => T, timeout = 4000): Promise<T> => {
    const startedAt = Date.now();

    while (true) {
        try {
            return callback();
        } catch (error) {
            if (Date.now() - startedAt >= timeout) {
                throw error;
            }

            await act(async () => {
                await new Promise((resolve) => window.setTimeout(resolve, 20));
            });
        }
    }
};

const clickButton = async (label: string) => {
    const button = await waitFor(() =>
        Array.from(document.querySelectorAll('button')).find((candidate) => candidate.textContent?.includes(label)),
    );
    expect(button).toBeTruthy();
    await act(async () => {
        (button as HTMLButtonElement).click();
    });
};

const assertNoAdditionalRenders = (tracker: RenderTracker, initialRenderCount: number, label: string) => {
    if (tracker.renders !== initialRenderCount) {
        throw new Error(
            `${label} rerendered. Expected ${initialRenderCount}, received ${tracker.renders}. Changed props: ${JSON.stringify(tracker.changedKeys.at(-1) || [])}`,
        );
    }
};

describe('Phase B render stability', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(async () => {
        Object.values(trackers).forEach((tracker) => {
            tracker.renders = 0;
            tracker.changedKeys = [];
        });

        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);

        localStorage.clear();
        localStorage.setItem(WORKSPACE_SNAPSHOT_STORAGE_KEY, JSON.stringify(initialSnapshot));

        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: vi.fn().mockImplementation((query: string) => ({
                matches: false,
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            })),
        });

        global.fetch = vi.fn(async (input: RequestInfo | URL) => {
            const url = String(input);
            if (url === '/api/runtime-config') {
                return new Response(JSON.stringify({ hasApiKey: true }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            if (url === '/api/load-prompts') {
                return new Response(JSON.stringify({ prompts: [] }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            if (url === '/api/workspace-snapshot') {
                return new Response(JSON.stringify({ ok: true, snapshot: null }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            return new Response(JSON.stringify({ ok: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }) as typeof fetch;

        const App = await loadApp();
        await act(async () => {
            root.render(<App />);
        });

        await waitFor(() => document.querySelector('[data-testid="mock-generated-image"]'));
    });

    afterEach(async () => {
        await act(async () => {
            root.unmount();
        });
        container.remove();
        localStorage.clear();
        vi.restoreAllMocks();
    });

    it('does not rerender stage/history memo surfaces when toggling advanced settings', async () => {
        const initialGeneratedImageRenders = trackers.generatedImage.renders;
        const initialRecentHistoryRenders = trackers.recentHistoryFilmstrip.renders;
        const initialHistoryCanvasRenders = trackers.workspaceHistoryCanvas.renders;

        await clickButton('Advanced Settings');

        assertNoAdditionalRenders(trackers.generatedImage, initialGeneratedImageRenders, 'GeneratedImage');
        assertNoAdditionalRenders(
            trackers.recentHistoryFilmstrip,
            initialRecentHistoryRenders,
            'RecentHistoryFilmstrip',
        );
        assertNoAdditionalRenders(
            trackers.workspaceHistoryCanvas,
            initialHistoryCanvasRenders,
            'WorkspaceHistoryCanvas',
        );
        expect(trackers.composerSettingsPanel.renders).toBeGreaterThan(0);
    });

    it('does not rerender stage/history memo surfaces when opening references from the composer owner route', async () => {
        const initialGeneratedImageRenders = trackers.generatedImage.renders;
        const initialRecentHistoryRenders = trackers.recentHistoryFilmstrip.renders;
        const initialHistoryCanvasRenders = trackers.workspaceHistoryCanvas.renders;

        await clickButton('Open References');

        assertNoAdditionalRenders(trackers.generatedImage, initialGeneratedImageRenders, 'GeneratedImage');
        assertNoAdditionalRenders(
            trackers.recentHistoryFilmstrip,
            initialRecentHistoryRenders,
            'RecentHistoryFilmstrip',
        );
        assertNoAdditionalRenders(
            trackers.workspaceHistoryCanvas,
            initialHistoryCanvasRenders,
            'WorkspaceHistoryCanvas',
        );
    });
});
