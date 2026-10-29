/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import VideoReferenceUploader from '../components/VideoReferenceUploader';
import { PromptReferenceChips, PromptReferencedBadges } from '../components/PromptReferenceChips';
import WorkspaceSideToolPanel from '../components/WorkspaceSideToolPanel';
import { useWorkspaceShellViewModel } from '../hooks/useWorkspaceShellViewModel';
import { VideoReferenceItem } from '../types';

function setInputValue(input: HTMLInputElement, value: string) {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    nativeInputValueSetter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('VideoReferenceUploader', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
    });

    it('renders upload tab by default with dropzone and file input', () => {
        const onVideoReferenceChange = vi.fn();
        const onUploadVideoFile = vi.fn();
        const onWarning = vi.fn();

        act(() => {
            root.render(
                <VideoReferenceUploader
                    currentLanguage="en"
                    videoReference={null}
                    onVideoReferenceChange={onVideoReferenceChange}
                    onUploadVideoFile={onUploadVideoFile}
                    onWarning={onWarning}
                />,
            );
        });

        const dropzone = container.querySelector('[data-testid="video-reference-dropzone"]');
        expect(dropzone).not.toBeNull();
        expect(container.querySelector('[data-testid="video-reference-file-input"]')).not.toBeNull();
        expect(container.querySelector('[data-testid="video-reference-tab-upload"]')).not.toBeNull();
        expect(container.querySelector('[data-testid="video-reference-tab-youtube"]')).not.toBeNull();
        expect(container.textContent).toContain('Upload Video');
        expect(container.textContent).toContain('YouTube URL');
    });

    it('switches to YouTube tab and processes valid YouTube URL', async () => {
        const onVideoReferenceChange = vi.fn();
        const onUploadVideoFile = vi.fn();
        const onWarning = vi.fn();

        act(() => {
            root.render(
                <VideoReferenceUploader
                    currentLanguage="en"
                    videoReference={null}
                    onVideoReferenceChange={onVideoReferenceChange}
                    onUploadVideoFile={onUploadVideoFile}
                    onWarning={onWarning}
                />,
            );
        });

        const youtubeTab = container.querySelector('[data-testid="video-reference-tab-youtube"]') as HTMLButtonElement;
        expect(youtubeTab).not.toBeNull();

        act(() => {
            youtubeTab.click();
        });

        const input = container.querySelector('[data-testid="video-reference-youtube-input"]') as HTMLInputElement;
        const applyBtn = container.querySelector(
            '[data-testid="video-reference-youtube-submit-btn"]',
        ) as HTMLButtonElement;
        expect(input).not.toBeNull();
        expect(applyBtn).not.toBeNull();

        // Enter valid URL using React value setter
        act(() => {
            setInputValue(input, 'https://youtu.be/dQw4w9WgXcQ');
        });

        await act(async () => {
            applyBtn.click();
        });

        expect(onVideoReferenceChange).toHaveBeenCalledWith(
            expect.objectContaining({
                sourceType: 'youtube',
                uri: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                displayName: 'YouTube (dQw4w9WgXcQ)',
                youtubeVideoId: 'dQw4w9WgXcQ',
            }),
        );
        expect(onWarning).not.toHaveBeenCalled();
    });

    it('rejects invalid YouTube URL with warning', async () => {
        const onVideoReferenceChange = vi.fn();
        const onUploadVideoFile = vi.fn();
        const onWarning = vi.fn();

        act(() => {
            root.render(
                <VideoReferenceUploader
                    currentLanguage="en"
                    videoReference={null}
                    onVideoReferenceChange={onVideoReferenceChange}
                    onUploadVideoFile={onUploadVideoFile}
                    onWarning={onWarning}
                />,
            );
        });

        const youtubeTab = container.querySelector('[data-testid="video-reference-tab-youtube"]') as HTMLButtonElement;
        act(() => {
            youtubeTab.click();
        });

        const input = container.querySelector('[data-testid="video-reference-youtube-input"]') as HTMLInputElement;
        const applyBtn = container.querySelector(
            '[data-testid="video-reference-youtube-submit-btn"]',
        ) as HTMLButtonElement;

        // Enter invalid URL
        act(() => {
            setInputValue(input, 'https://example.com/not-youtube');
        });

        await act(async () => {
            applyBtn.click();
        });

        expect(onVideoReferenceChange).not.toHaveBeenCalled();
        expect(onWarning).toHaveBeenCalledWith(expect.stringContaining('YouTube'));
    });

    it('renders active video reference card and allows removal', () => {
        const onVideoReferenceChange = vi.fn();
        const onUploadVideoFile = vi.fn();
        const onWarning = vi.fn();

        const videoItem: VideoReferenceItem = {
            sourceType: 'youtube',
            uri: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            displayName: 'YouTube: dQw4w9WgXcQ',
            mimeType: 'video/mp4',
            youtubeVideoId: 'dQw4w9WgXcQ',
            createdAt: Date.now(),
        };

        act(() => {
            root.render(
                <VideoReferenceUploader
                    currentLanguage="en"
                    videoReference={videoItem}
                    onVideoReferenceChange={onVideoReferenceChange}
                    onUploadVideoFile={onUploadVideoFile}
                    onWarning={onWarning}
                />,
            );
        });

        const activeCard = container.querySelector('[data-testid="video-reference-card"]');
        expect(activeCard).not.toBeNull();
        expect(container.textContent).toContain('YouTube: dQw4w9WgXcQ');

        const removeBtn = container.querySelector('[data-testid="video-reference-remove-btn"]') as HTMLButtonElement;
        expect(removeBtn).not.toBeNull();

        act(() => {
            removeBtn.click();
        });

        expect(onVideoReferenceChange).toHaveBeenCalledWith(null);
    });

    it('handles file upload successfully', async () => {
        const onVideoReferenceChange = vi.fn();
        const mockUploadedItem: VideoReferenceItem = {
            sourceType: 'upload',
            uri: 'https://generativelanguage.googleapis.com/v1beta/files/test-file-123',
            displayName: 'sample-video.mp4',
            mimeType: 'video/mp4',
            fileSizeBytes: 1024 * 1024 * 5,
            createdAt: Date.now(),
        };
        const onUploadVideoFile = vi.fn().mockResolvedValue(mockUploadedItem);
        const onWarning = vi.fn();

        act(() => {
            root.render(
                <VideoReferenceUploader
                    currentLanguage="en"
                    videoReference={null}
                    onVideoReferenceChange={onVideoReferenceChange}
                    onUploadVideoFile={onUploadVideoFile}
                    onWarning={onWarning}
                />,
            );
        });

        const fileInput = container.querySelector('[data-testid="video-reference-file-input"]') as HTMLInputElement;
        const validFile = new File(['mock content'], 'sample-video.mp4', { type: 'video/mp4' });

        await act(async () => {
            Object.defineProperty(fileInput, 'files', {
                value: [validFile],
                writable: true,
            });
            fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        });

        expect(onUploadVideoFile).toHaveBeenCalledWith(validFile, expect.any(AbortSignal));
        expect(onVideoReferenceChange).toHaveBeenCalledWith(mockUploadedItem);
    });

    it('rejects oversized files before uploading', async () => {
        const onVideoReferenceChange = vi.fn();
        const onUploadVideoFile = vi.fn();
        const onWarning = vi.fn();

        act(() => {
            root.render(
                <VideoReferenceUploader
                    currentLanguage="en"
                    videoReference={null}
                    onVideoReferenceChange={onVideoReferenceChange}
                    onUploadVideoFile={onUploadVideoFile}
                    onWarning={onWarning}
                />,
            );
        });

        const fileInput = container.querySelector('[data-testid="video-reference-file-input"]') as HTMLInputElement;
        const oversizedFile = new File(['mock'], 'giant.mp4', { type: 'video/mp4' });
        Object.defineProperty(oversizedFile, 'size', { value: 201 * 1024 * 1024 });

        await act(async () => {
            Object.defineProperty(fileInput, 'files', {
                value: [oversizedFile],
                writable: true,
            });
            fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        });

        expect(onUploadVideoFile).not.toHaveBeenCalled();
        expect(onVideoReferenceChange).not.toHaveBeenCalled();
        expect(onWarning).toHaveBeenCalledWith(expect.stringContaining('200MB'));
    });

    it('handles upload failure gracefully', async () => {
        const onVideoReferenceChange = vi.fn();
        const onUploadVideoFile = vi.fn().mockRejectedValue(new Error('Network error'));
        const onWarning = vi.fn();

        act(() => {
            root.render(
                <VideoReferenceUploader
                    currentLanguage="en"
                    videoReference={null}
                    onVideoReferenceChange={onVideoReferenceChange}
                    onUploadVideoFile={onUploadVideoFile}
                    onWarning={onWarning}
                />,
            );
        });

        const fileInput = container.querySelector('[data-testid="video-reference-file-input"]') as HTMLInputElement;
        const validFile = new File(['mock content'], 'sample-video.mp4', { type: 'video/mp4' });

        await act(async () => {
            Object.defineProperty(fileInput, 'files', {
                value: [validFile],
                writable: true,
            });
            fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        });

        expect(onUploadVideoFile).toHaveBeenCalled();
        expect(onVideoReferenceChange).not.toHaveBeenCalled();
        expect(onWarning).toHaveBeenCalledWith('Network error');
    });

    it('renders controlled uploading state and allows cancellation', () => {
        const onCancelUpload = vi.fn();

        act(() => {
            root.render(
                <VideoReferenceUploader
                    currentLanguage="en"
                    videoReference={null}
                    onVideoReferenceChange={vi.fn()}
                    isUploading={true}
                    onCancelUpload={onCancelUpload}
                />,
            );
        });

        const cancelBtn = container.querySelector(
            '[data-testid="video-reference-cancel-upload-btn"]',
        ) as HTMLButtonElement;
        expect(cancelBtn).not.toBeNull();

        act(() => {
            cancelBtn.click();
        });

        expect(onCancelUpload).toHaveBeenCalledTimes(1);
    });

    it('allows inserting [Video_1] reference tag from PromptReferenceChips', () => {
        const onInsertTag = vi.fn();
        const onClearVideoReference = vi.fn();
        const videoItem: VideoReferenceItem = {
            sourceType: 'youtube',
            uri: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            displayName: 'YouTube (dQw4w9WgXcQ)',
            mimeType: 'video/mp4',
            youtubeVideoId: 'dQw4w9WgXcQ',
            createdAt: Date.now(),
        };

        act(() => {
            root.render(
                <PromptReferenceChips
                    currentLanguage="en"
                    videoReference={videoItem}
                    onClearVideoReference={onClearVideoReference}
                    onInsertTag={onInsertTag}
                />,
            );
        });

        const insertBtn = container.querySelector(
            '[data-testid="composer-reference-chip-video-btn"]',
        ) as HTMLButtonElement;
        expect(insertBtn).not.toBeNull();
        expect(insertBtn.textContent).toContain('[Video_1]');

        act(() => {
            insertBtn.click();
        });

        expect(onInsertTag).toHaveBeenCalledWith('[Video_1]');
    });

    it('does not abort controlled background upload when unmounted by closing floating popover', async () => {
        let capturedSignal: AbortSignal | null = null;
        let resolveUpload: ((item: VideoReferenceItem) => void) | null = null;
        const onUploadVideoFile = vi.fn(
            (_file: File, signal: AbortSignal) =>
                new Promise<VideoReferenceItem>((resolve) => {
                    capturedSignal = signal;
                    resolveUpload = resolve;
                }),
        );

        act(() => {
            root.render(
                <VideoReferenceUploader
                    currentLanguage="en"
                    videoReference={null}
                    onVideoReferenceChange={vi.fn()}
                    onUploadVideoFile={onUploadVideoFile}
                    isUploading={false}
                    onCancelUpload={vi.fn()}
                />,
            );
        });

        const fileInput = container.querySelector('[data-testid="video-reference-file-input"]') as HTMLInputElement;
        const validFile = new File(['mock content'], 'background-clip.mp4', { type: 'video/mp4' });

        act(() => {
            Object.defineProperty(fileInput, 'files', {
                value: [validFile],
                writable: true,
            });
            fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        });

        expect(onUploadVideoFile).toHaveBeenCalledTimes(1);
        expect(capturedSignal).not.toBeNull();

        // Simulate floating popover closing while upload is still in progress
        act(() => {
            root.render(<div />);
        });

        expect((capturedSignal as AbortSignal | null)?.aborted).toBe(false);

        // Cleanly resolve pending promise
        await act(async () => {
            resolveUpload?.({
                sourceType: 'upload',
                uri: 'https://generativelanguage.googleapis.com/v1beta/files/bg-123',
                displayName: 'background-clip.mp4',
                mimeType: 'video/mp4',
                createdAt: Date.now(),
            });
        });
    });

    it('tracks [Video_1] cited and orphan badges in PromptReferencedBadges', () => {
        const onRemoveTag = vi.fn();
        const videoItem: VideoReferenceItem = {
            sourceType: 'youtube',
            uri: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            displayName: 'YouTube (dQw4w9WgXcQ)',
            mimeType: 'video/mp4',
            youtubeVideoId: 'dQw4w9WgXcQ',
            createdAt: Date.now(),
        };

        act(() => {
            root.render(
                <PromptReferencedBadges
                    currentLanguage="en"
                    prompt="Recreate the lighting from [Video_1]"
                    videoReference={videoItem}
                    onRemoveTag={onRemoveTag}
                />,
            );
        });

        expect(container.querySelector('[data-testid="composer-cited-badge-[Video_1]"]')).not.toBeNull();
        expect(container.querySelector('[data-testid="composer-orphan-tag-[Video_1]"]')).toBeNull();

        // When videoReference is removed, [Video_1] becomes an orphan tag
        act(() => {
            root.render(
                <PromptReferencedBadges
                    currentLanguage="en"
                    prompt="Recreate the lighting from [Video_1]"
                    videoReference={null}
                    onRemoveTag={onRemoveTag}
                />,
            );
        });

        expect(container.querySelector('[data-testid="composer-orphan-tag-[Video_1]"]')).not.toBeNull();
    });

    it('integrates video reference summary and controlled upload props in WorkspaceSideToolPanel', () => {
        const onCancelVideoUpload = vi.fn();

        act(() => {
            root.render(
                <WorkspaceSideToolPanel
                    currentLanguage="en"
                    canEditCurrentImage={false}
                    onOpenSketchPad={vi.fn()}
                    onOpenEditor={vi.fn()}
                    onOpenUploadToRepaint={vi.fn()}
                    objectImages={[]}
                    characterImages={[]}
                    styleImages={[]}
                    supportsVideo={true}
                    videoReference={null}
                    onVideoReferenceChange={vi.fn()}
                    onUploadVideoFile={vi.fn()}
                    isUploadingVideo={true}
                    onCancelVideoUpload={onCancelVideoUpload}
                    maxObjects={6}
                    maxCharacters={4}
                    maxStyles={0}
                    setObjectImages={vi.fn()}
                    setCharacterImages={vi.fn()}
                    isGenerating={false}
                    showNotification={vi.fn()}
                    handleRemoveObjectReference={vi.fn()}
                    handleRemoveCharacterReference={vi.fn()}
                    handleClearAllReferences={vi.fn()}
                />,
            );
        });

        const videoSummaryCount = container.querySelector(
            '[data-testid="workspace-side-tools-references-summary-video-count"]',
        );
        expect(videoSummaryCount?.textContent).toBe('0/1');

        const toggleBtn = container.querySelector(
            '[data-testid="workspace-side-tools-references-toggle"]',
        ) as HTMLButtonElement;
        act(() => {
            toggleBtn.click();
        });

        const cancelUploadBtn = container.querySelector(
            '[data-testid="video-reference-cancel-upload-btn"]',
        ) as HTMLButtonElement;
        expect(cancelUploadBtn).not.toBeNull();

        act(() => {
            cancelUploadBtn.click();
        });

        expect(onCancelVideoUpload).toHaveBeenCalledTimes(1);
    });

    it('calculates totalReferenceCount in useWorkspaceShellViewModel correctly with styles and video', () => {
        let hookResult = null as ReturnType<typeof useWorkspaceShellViewModel> | null;

        function TestHarness() {
            hookResult = useWorkspaceShellViewModel({
                generatedImageCount: 0,
                isGenerating: false,
                displaySettings: {
                    prompt: '',
                    aspectRatio: '1:1',
                    size: '1K',
                    style: 'None',
                    model: 'gemini-nano-banana-2.1',
                    batchSize: 1,
                    outputFormat: 'images-only',
                    temperature: 1,
                    thinkingLevel: 'disabled',
                    includeThoughts: false,
                    googleSearch: false,
                    imageSearch: false,
                },
                prompt: '',
                surfacePrompt: '',
                aspectRatio: '1:1',
                imageSize: '1K',
                imageStyle: 'None',
                imageModel: 'gemini-nano-banana-2.1',
                batchSize: 1,
                outputFormat: 'images-only',
                temperature: 1,
                thinkingLevel: 'disabled',
                includeThoughts: false,
                googleSearch: false,
                imageSearch: false,
                logs: [],
                currentStageSourceHistoryId: null,
                getShortTurnId: () => '',
                activePickerSheet: null,
                isEditing: false,
                isSketchPadOpen: false,
                objectImageCount: 2,
                characterImageCount: 1,
                styleImageCount: 2,
                hasVideoInput: true,
                t: (k) => k,
            });
            return null;
        }

        act(() => {
            root.render(<TestHarness />);
        });

        // 2 objects + 1 character + 2 styles + 1 video = 6
        expect(hookResult?.totalReferenceCount).toBe(6);
    });
});
