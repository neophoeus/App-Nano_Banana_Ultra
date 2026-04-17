/** @vitest-environment jsdom */

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { WORKSPACE_SNAPSHOT_STORAGE_KEY } from '../utils/workspacePersistence';
import { LANGUAGE_STORAGE_KEY } from '../utils/translations';
import { THEME_STORAGE_KEY } from '../utils/theme';

const { saveImageToLocalMock, generateThumbnailMock, persistHistoryThumbnailMock, loadFullImageMock } = vi.hoisted(
    () => ({
        saveImageToLocalMock: vi.fn(),
        generateThumbnailMock: vi.fn(),
        persistHistoryThumbnailMock: vi.fn(),
        loadFullImageMock: vi.fn(),
    }),
);

vi.mock('../components/GeneratedImage', () => ({
    default: ({ stageTopRight }: { stageTopRight?: { visibleActions?: Array<{ key: string; onClick?: () => void }>; overflowActions?: Array<{ key: string; onClick?: () => void }> } }) => {
        const clearAction = [...(stageTopRight?.visibleActions || []), ...(stageTopRight?.overflowActions || [])].find(
            (action) => action.key === 'clear',
        );

        return (
            <div data-testid="mock-generated-image">
                {clearAction ? (
                    <button type="button" data-testid="mock-generated-image-clear" onClick={clearAction.onClick}>
                        Clear stage
                    </button>
                ) : null}
            </div>
        );
    },
}));

vi.mock('../components/WorkspaceHealthPanel', () => ({
    default: () => <div data-testid="mock-global-log-console" />,
}));

vi.mock('../components/ImageEditor', () => ({
    default: () => <div data-testid="mock-image-editor" />,
}));

vi.mock('../components/SketchPad', () => ({
    default: () => <div data-testid="mock-sketchpad" />,
}));

vi.mock('../utils/imageSaveUtils', async () => {
    const actual = await vi.importActual<typeof import('../utils/imageSaveUtils')>('../utils/imageSaveUtils');
    return {
        ...actual,
        persistHistoryThumbnail: persistHistoryThumbnailMock,
        saveImageToLocal: saveImageToLocalMock,
        generateThumbnail: generateThumbnailMock,
        loadFullImage: loadFullImageMock,
    };
});

const restoredOfficialConversationSnapshot = {
    history: [
        {
            id: 'chat-follow-up-turn',
            url: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
            prompt: 'Official chat follow-up turn',
            aspectRatio: '1:1',
            size: '1K',
            style: 'None',
            model: 'gemini-3.1-flash-image-preview',
            createdAt: 1710200001000,
            mode: 'Follow-up Edit',
            executionMode: 'chat-continuation',
            status: 'success',
            text: 'Official chat follow-up text',
            conversationId: 'chatconv1-restore-path',
            conversationBranchOriginId: 'chat-root-turn',
            conversationSourceHistoryId: 'chat-root-turn',
            conversationTurnIndex: 0,
            parentHistoryId: 'chat-root-turn',
            rootHistoryId: 'chat-root-turn',
            sourceHistoryId: 'chat-root-turn',
            lineageAction: 'continue',
            lineageDepth: 1,
        },
        {
            id: 'chat-root-turn',
            url: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
            prompt: 'Official chat root turn',
            aspectRatio: '1:1',
            size: '1K',
            style: 'None',
            model: 'gemini-3.1-flash-image-preview',
            createdAt: 1710200000000,
            mode: 'Text to Image',
            executionMode: 'single-turn',
            status: 'success',
            text: 'Official chat root text',
            rootHistoryId: 'chat-root-turn',
            lineageAction: 'root',
            lineageDepth: 0,
        },
    ],
    stagedAssets: [],
    workflowLogs: [],
    queuedJobs: [],
    workspaceSession: {
        activeResult: {
            text: 'Official chat follow-up text',
            thoughts: null,
            grounding: null,
            metadata: null,
            sessionHints: {
                thoughtSignatureReturned: true,
                restoredFromSnapshot: true,
            },
            historyId: 'chat-follow-up-turn',
        },
        continuityGrounding: null,
        continuitySessionHints: {
            thoughtSignatureReturned: true,
            restoredFromSnapshot: true,
        },
        provenanceMode: null,
        provenanceSourceHistoryId: null,
        conversationId: 'chatconv1-restore-path',
        conversationBranchOriginId: 'chat-root-turn',
        conversationActiveSourceHistoryId: 'chat-follow-up-turn',
        conversationTurnIds: ['chat-follow-up-turn'],
        source: 'history',
        sourceHistoryId: 'chat-follow-up-turn',
        updatedAt: 1710200003000,
    },
    branchState: {
        nameOverrides: {
            'chat-root-turn': 'Chat Branch',
        },
        continuationSourceByBranchOriginId: {
            'chat-root-turn': 'chat-follow-up-turn',
        },
    },
    conversationState: {
        byBranchOriginId: {
            'chat-root-turn': {
                conversationId: 'chatconv1-restore-path',
                branchOriginId: 'chat-root-turn',
                activeSourceHistoryId: 'chat-follow-up-turn',
                turnIds: ['chat-follow-up-turn'],
                startedAt: 1710200000500,
                updatedAt: 1710200001500,
            },
        },
    },
    viewState: {
        generatedImageUrls: ['data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='],
        selectedImageIndex: 0,
        selectedHistoryId: 'chat-follow-up-turn',
    },
    composerState: {
        prompt: 'Restored official conversation workspace',
        aspectRatio: '1:1',
        imageSize: '1K',
        imageStyle: 'None',
        imageModel: 'gemini-3.1-flash-image-preview',
        batchSize: 1,
        outputFormat: 'images-only',
        temperature: 1,
        thinkingLevel: 'minimal',
        includeThoughts: true,
        googleSearch: false,
        imageSearch: false,
        stickySendIntent: 'memory',
        generationMode: 'Follow-up Edit',
        executionMode: 'chat-continuation',
    },
};

const restoredFailedProgressSelectionSnapshot = {
    ...restoredOfficialConversationSnapshot,
    history: [
        {
            id: 'failed-stream-turn',
            url: '',
            prompt: 'Failed stream turn',
            aspectRatio: '1:1',
            size: '1K',
            style: 'None',
            model: 'gemini-3.1-flash-image-preview',
            createdAt: 1710200002000,
            mode: 'Text to Image',
            executionMode: 'single-turn',
            status: 'failed',
            error: 'Model returned no image data (finish reason: STOP).',
            thoughts: 'Failed turn thought text survives selection.',
            resultParts: [
                {
                    sequence: 0,
                    kind: 'thought-text',
                    text: 'Failed turn thought text survives selection.',
                },
                {
                    sequence: 1,
                    kind: 'thought-image',
                    imageUrl: 'data:image/png;base64,FAILEDTHOUGHTIMAGE',
                    mimeType: 'image/png',
                    savedFilename: 'failed-thought.png',
                },
            ],
            failure: {
                code: 'no-image-data',
                message: 'Model returned no image data (finish reason: STOP).',
                finishReason: 'STOP',
                extractionIssue: 'no-image-data',
            },
            rootHistoryId: 'failed-stream-turn',
            lineageAction: 'root',
            lineageDepth: 0,
        },
        ...restoredOfficialConversationSnapshot.history,
    ],
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

const clickElement = async (element: Element | null) => {
    expect(element).toBeTruthy();
    await act(async () => {
        (element as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
};

const updateTextarea = async (element: HTMLTextAreaElement, value: string) => {
    await act(async () => {
        const descriptor = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value');
        descriptor?.set?.call(element, value);
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
    });
};

describe('App official conversation flow', () => {
    let container: HTMLDivElement;
    let root: Root;
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);

        localStorage.clear();
        localStorage.setItem(WORKSPACE_SNAPSHOT_STORAGE_KEY, JSON.stringify(restoredOfficialConversationSnapshot));

        saveImageToLocalMock.mockReset();
        generateThumbnailMock.mockReset();
        persistHistoryThumbnailMock.mockReset();
        loadFullImageMock.mockReset();

        saveImageToLocalMock.mockResolvedValue('D:/output/conversation.png');
        generateThumbnailMock.mockResolvedValue('data:image/png;base64,BBB');
        persistHistoryThumbnailMock.mockResolvedValue({ url: 'data:image/png;base64,BBB' });
        loadFullImageMock.mockResolvedValue(null);

        fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);

            if (url === '/api/runtime-config') {
                return new Response(JSON.stringify({ hasApiKey: true }), {
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

            if (url === '/api/save-image') {
                return new Response(JSON.stringify({ success: true, path: 'D:/output/conversation.png' }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            if (url.startsWith('/api/load-image-metadata?')) {
                return new Response(JSON.stringify({ error: 'Metadata not found' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            if (url === '/api/images/generate') {
                const requestBody = JSON.parse(String(init?.body || '{}'));
                return new Response(
                    JSON.stringify({
                        imageUrl: 'data:image/png;base64,BBB',
                        text: 'Fresh official conversation reply',
                        thoughts: 'Reasoned follow-up',
                        sessionHints: {
                            officialConversationUsed: true,
                            thoughtSignatureReturned: true,
                        },
                        conversation: {
                            used: true,
                            conversationId: requestBody.conversationContext?.conversationId,
                            branchOriginId: requestBody.conversationContext?.branchOriginId,
                            activeSourceHistoryId: requestBody.conversationContext?.activeSourceHistoryId,
                            priorTurnCount: requestBody.conversationContext?.priorTurns?.length || 0,
                            historyLength: 4,
                        },
                    }),
                    {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' },
                    },
                );
            }

            if (url === '/api/prompt/random') {
                return new Response(JSON.stringify({ text: '繁體中文測試提示詞' }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            throw new Error(`Unhandled fetch: ${url}`);
        });

        vi.stubGlobal('fetch', fetchMock);
        Object.defineProperty(window.navigator, 'language', {
            configurable: true,
            value: 'en-US',
        });
        Object.defineProperty(window, 'matchMedia', {
            configurable: true,
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
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
        localStorage.clear();
        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
    });

    it('continues a restored official conversation through the App request flow and persists the new turn metadata', async () => {
        await act(async () => {
            root.render(<App />);
        });

        await waitFor(() => {
            expect(container.querySelector('textarea')).toBeTruthy();
        });

        const textarea = await waitFor(() => {
            const nextTextarea = container.querySelector('textarea') as HTMLTextAreaElement | null;
            expect(nextTextarea).toBeTruthy();
            return nextTextarea!;
        });
        await updateTextarea(textarea, 'Continue from App integration flow');

        const generateButton = await waitFor(() => {
            const nextButton =
                Array.from(container.querySelectorAll('button')).find((button) =>
                    button.textContent?.includes('Generate'),
                ) || null;
            expect(nextButton).toBeTruthy();
            return nextButton!;
        });
        await clickElement(generateButton);

        const requestBody = await waitFor(() => {
            const call = fetchMock.mock.calls.find(([input]) => String(input) === '/api/images/generate');
            expect(call).toBeTruthy();
            return JSON.parse(String(call?.[1]?.body || '{}'));
        });

        expect(requestBody.executionMode).toBe('chat-continuation');
        expect(requestBody.conversationContext).toEqual({
            conversationId: 'chatconv1-restore-path',
            branchOriginId: 'chat-root-turn',
            activeSourceHistoryId: 'chat-follow-up-turn',
            priorTurns: [
                {
                    historyId: 'chat-follow-up-turn',
                    prompt: 'Official chat follow-up turn',
                    sourceImage: {
                        dataUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
                        mimeType: 'image/gif',
                    },
                    outputImage: {
                        dataUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
                        mimeType: 'image/gif',
                    },
                    text: 'Official chat follow-up text',
                    thoughts: null,
                    thoughtSignature: null,
                },
            ],
        });

        const persistedSnapshot = await waitFor(() => {
            const raw = localStorage.getItem(WORKSPACE_SNAPSHOT_STORAGE_KEY);
            expect(raw).toBeTruthy();
            const snapshot = JSON.parse(String(raw));
            const generatedTurn = snapshot.history.find(
                (item: { prompt?: string }) => item.prompt === 'Continue from App integration flow',
            );
            expect(generatedTurn).toBeTruthy();
            return { snapshot, generatedTurn };
        });

        expect(persistedSnapshot.generatedTurn).toEqual(
            expect.objectContaining({
                executionMode: 'chat-continuation',
                conversationId: 'chatconv1-restore-path',
                conversationBranchOriginId: 'chat-root-turn',
                conversationSourceHistoryId: 'chat-follow-up-turn',
                conversationTurnIndex: 1,
                text: 'Fresh official conversation reply',
                thoughts: 'Reasoned follow-up',
            }),
        );
        expect(persistedSnapshot.snapshot.workspaceSession.conversationId).toBe('chatconv1-restore-path');
        expect(persistedSnapshot.snapshot.workspaceSession.conversationBranchOriginId).toBe('chat-root-turn');
        expect(persistedSnapshot.snapshot.workspaceSession.conversationActiveSourceHistoryId).toBe(
            persistedSnapshot.generatedTurn.id,
        );
        expect(
            persistedSnapshot.snapshot.conversationState.byBranchOriginId['chat-root-turn'].activeSourceHistoryId,
        ).toBe(persistedSnapshot.generatedTurn.id);
        expect(persistedSnapshot.snapshot.conversationState.byBranchOriginId['chat-root-turn'].turnIds).toContain(
            'chat-follow-up-turn',
        );
        expect(persistedSnapshot.snapshot.conversationState.byBranchOriginId['chat-root-turn'].turnIds).toContain(
            persistedSnapshot.generatedTurn.id,
        );
    });

    it('restores saved language and theme preferences on startup', async () => {
        localStorage.removeItem(WORKSPACE_SNAPSHOT_STORAGE_KEY);
        localStorage.setItem(LANGUAGE_STORAGE_KEY, 'zh_TW');
        localStorage.setItem(THEME_STORAGE_KEY, 'dark');

        await act(async () => {
            root.render(<App />);
        });

        await waitFor(() => {
            expect(document.documentElement.classList.contains('dark')).toBe(true);
            expect(container.querySelector('button[title="切換為亮色模式"]')).toBeTruthy();
        });

        expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('zh_TW');
        expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    });

    it('uses the restored UI language for prompt helpers immediately on first render', async () => {
        localStorage.removeItem(WORKSPACE_SNAPSHOT_STORAGE_KEY);
        localStorage.setItem(LANGUAGE_STORAGE_KEY, 'zh_TW');

        await act(async () => {
            root.render(<App />);
        });

        const surpriseButton = await waitFor(() => {
            const button = container.querySelector(
                '[data-testid="composer-quick-tool-inspiration"]',
            ) as HTMLButtonElement | null;
            expect(button).toBeTruthy();
            return button!;
        });
        await clickElement(surpriseButton);

        const requestBody = await waitFor(() => {
            const call = fetchMock.mock.calls.find(([input]) => String(input) === '/api/prompt/random');
            expect(call).toBeTruthy();
            return JSON.parse(String(call?.[1]?.body || '{}'));
        });

        expect(requestBody.lang).toBe('zh_TW');
    });

    it('switches between progress and sources inside the shared detail surface', async () => {
        await act(async () => {
            root.render(<App />);
        });

        expect(document.querySelector('[data-testid="workspace-response-open-details"]')).toBeNull();

        const progressEntry = await waitFor(() => {
            const button = document.querySelector(
                '[data-testid="workspace-progress-open-details"]',
            ) as HTMLButtonElement | null;
            expect(button).toBeTruthy();
            return button!;
        });
        await clickElement(progressEntry);

        await waitFor(() => {
            expect(document.querySelector('[data-testid="workspace-progress-detail-modal"]')).toBeTruthy();
        });

        await waitFor(() => {
            expect(document.querySelector('[data-testid="workspace-progress-detail-summary"]')).toBeTruthy();
        });
        expect(document.querySelector('[data-testid="workspace-support-detail-tab-response"]')).toBeNull();

        const evidenceTab = await waitFor(() => {
            const button = document.querySelector(
                '[data-testid="workspace-support-detail-tab-sources"]',
            ) as HTMLButtonElement | null;
            expect(button).toBeTruthy();
            return button!;
        });
        await clickElement(evidenceTab);

        await waitFor(() => {
            expect(document.querySelector('[data-testid="workspace-sources-detail-modal"]')).toBeTruthy();
        });

        expect(document.querySelector('[data-testid="workspace-evidence-detail-summary"]')).toBeTruthy();

        const thoughtsTab = await waitFor(() => {
            const button = document.querySelector(
                '[data-testid="workspace-support-detail-tab-progress"]',
            ) as HTMLButtonElement | null;
            expect(button).toBeTruthy();
            return button!;
        });
        await clickElement(thoughtsTab);

        await waitFor(() => {
            expect(document.querySelector('[data-testid="workspace-progress-detail-modal"]')).toBeTruthy();
        });
    });

    it('shows persisted failed thought text and image after selecting a failed history item', async () => {
        localStorage.setItem(WORKSPACE_SNAPSHOT_STORAGE_KEY, JSON.stringify(restoredFailedProgressSelectionSnapshot));

        await act(async () => {
            root.render(<App />);
        });

        const failedHistoryCard = await waitFor(() => {
            const card = container.querySelector('[data-testid="history-card-failed-stream-turn"]') as HTMLElement | null;
            expect(card).toBeTruthy();
            return card!;
        });
        await clickElement(failedHistoryCard);

        const progressEntry = await waitFor(() => {
            const button = document.querySelector(
                '[data-testid="workspace-progress-open-details"]',
            ) as HTMLButtonElement | null;
            expect(button).toBeTruthy();
            return button!;
        });
        await clickElement(progressEntry);

        await waitFor(() => {
            expect(document.querySelector('[data-testid="workspace-progress-detail-modal"]')).toBeTruthy();
        });

        await waitFor(() => {
            const summary = document.querySelector(
                '[data-testid="workspace-progress-detail-summary-text"]',
            ) as HTMLElement | null;
            expect(summary).toBeTruthy();
            expect(summary!.textContent).toContain('Failed turn thought text survives selection.');
            return summary!;
        });

        await waitFor(() => {
            const thoughtText = document.querySelector(
                '[data-testid="workspace-progress-detail-part-text-failed-s-0"]',
            ) as HTMLElement | null;
            expect(thoughtText).toBeTruthy();
            expect(thoughtText!.textContent).toContain('Failed turn thought text survives selection.');
            return thoughtText!;
        });

        await waitFor(() => {
            const thoughtImage = document.querySelector(
                '[data-testid="workspace-progress-detail-part-image-failed-s-1"] img',
            ) as HTMLImageElement | null;
            expect(thoughtImage).toBeTruthy();
            expect(thoughtImage!.getAttribute('src')).toBe('/api/load-image?filename=failed-thought.png');
            return thoughtImage!;
        });
    });

    it('disables repaint after clearing the stage even when a restored history selection still exists', async () => {
        await act(async () => {
            root.render(<App />);
        });

        const repaintButton = await waitFor(() => {
            const button = container.querySelector('[data-testid="side-tools-repaint-current"]') as HTMLButtonElement | null;
            expect(button).toBeTruthy();
            return button!;
        });
        expect(repaintButton.disabled).toBe(false);

        const clearButton = await waitFor(() => {
            const button = container.querySelector('[data-testid="mock-generated-image-clear"]') as HTMLButtonElement | null;
            expect(button).toBeTruthy();
            return button!;
        });
        await clickElement(clearButton);

        await waitFor(() => {
            const button = container.querySelector('[data-testid="side-tools-repaint-current"]') as HTMLButtonElement | null;
            expect(button).toBeTruthy();
            expect(button!.disabled).toBe(true);
            return button!;
        });

        const uploadButton = container.querySelector('[data-testid="side-tools-upload-to-repaint"]') as HTMLButtonElement | null;
        expect(uploadButton).toBeTruthy();
        expect(uploadButton!.disabled).toBe(false);
    });
});
