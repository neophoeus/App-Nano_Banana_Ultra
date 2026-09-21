/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStageImageDownloadActions } from '../hooks/useStageImageDownloadActions';
import type { GeneratedImage } from '../types';
import * as browserDownload from '../utils/browserDownload';

vi.mock('../utils/browserDownload', () => ({
    downloadImageSource: vi.fn().mockResolvedValue('test-image.png'),
    downloadJsonDocument: vi.fn(),
    stripFilenameExtension: vi.fn((name: string) => name.replace(/\.[^/.]+$/, '')),
}));

type HookHandle = ReturnType<typeof useStageImageDownloadActions>;

describe('useStageImageDownloadActions', () => {
    let container: HTMLDivElement;
    let root: Root;
    let latestHook: HookHandle | null = null;
    let showNotificationMock: ReturnType<typeof vi.fn<(message: string, type: 'error' | 'info') => void>>;

    const mockHistoryItem: GeneratedImage = {
        id: 'hist-1',
        url: 'data:image/png;base64,image1',
        prompt: 'test prompt',
        aspectRatio: '1:1',
        size: '1K',
        style: 'None',
        model: 'gemini-3.1-flash-image',
        createdAt: 1710000000000,
        mode: 'Text to Image',
        executionMode: 'single-turn',
        status: 'success',
        text: 'test text',
        metadata: {
            prompt: 'persisted prompt',
            model: 'gemini-3.1-flash-image',
        },
    };

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        latestHook = null;
        showNotificationMock = vi.fn((_message: string, _type: 'error' | 'info') => {});
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
    });

    function Harness({
        options = {},
    }: {
        options?: Partial<Parameters<typeof useStageImageDownloadActions>[0]>;
    }) {
        const hook = useStageImageDownloadActions({
            history: [mockHistoryItem],
            currentViewedCompletedHistoryItem: mockHistoryItem,
            selectedMetadata: null,
            viewPrompt: 'active prompt',
            stageViewerSettings: {
                model: 'gemini-3.1-flash-image',
                imageStyle: 'None',
                aspectRatio: '1:1',
                imageSize: '1K',
                batchSize: 1,
            },
            outputFormat: 'images-only',
            temperature: 1,
            thinkingLevel: 'minimal',
            includeThoughts: false,
            googleSearch: false,
            imageSearch: false,
            generationMode: 'Text to Image',
            executionMode: 'single-turn',
            selectedImageIndex: 0,
            getHistoryTurnById: (id?: string | null) => (id === 'hist-1' ? mockHistoryItem : null),
            showNotification: showNotificationMock,
            t: (key: string) => key,
            ...options,
        });

        latestHook = hook;
        return null;
    }

    it('downloads stage image and sidecar JSON successfully', async () => {
        act(() => {
            root.render(<Harness />);
        });

        await act(async () => {
            await latestHook?.handleDownloadStageImage(mockHistoryItem.url);
        });

        expect(browserDownload.downloadImageSource).toHaveBeenCalled();
        expect(browserDownload.downloadJsonDocument).toHaveBeenCalledWith(
            expect.objectContaining({
                prompt: 'persisted prompt',
                filename: 'test-image.png',
            }),
            'test-image.json',
        );
        expect(showNotificationMock).toHaveBeenCalledWith('stageDownloadCompleteNotice', 'info');
    });

    it('downloads thought image part successfully', async () => {
        act(() => {
            root.render(<Harness />);
        });

        await act(async () => {
            await latestHook?.handleDownloadThoughtImage({
                imageUrl: 'data:image/png;base64,thought1',
                mimeType: 'image/png',
                entryId: 'hist-1',
                shortId: 'hist-1-short',
                slotIndex: 0,
                sequence: 1,
            });
        });

        expect(browserDownload.downloadImageSource).toHaveBeenCalledWith(
            'data:image/png;base64,thought1',
            expect.objectContaining({
                mimeType: 'image/png',
            }),
        );
        expect(showNotificationMock).toHaveBeenCalledWith('thoughtImageDownloadCompleteNotice', 'info');
    });

    it('handles download failure and shows error notification', async () => {
        vi.spyOn(browserDownload, 'downloadImageSource').mockRejectedValueOnce(new Error('Network error'));
        act(() => {
            root.render(<Harness />);
        });

        await act(async () => {
            await latestHook?.handleDownloadStageImage('invalid-url');
        });

        expect(showNotificationMock).toHaveBeenCalledWith('stageDownloadFailedNotice', 'error');
    });
});
