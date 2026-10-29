/** @vitest-environment jsdom */

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ExportResultsModal from '../components/ExportResultsModal';
import { GeneratedImage } from '../types';

const { exportWorkspaceResultsMock, browseExportFolderMock } = vi.hoisted(() => ({
    exportWorkspaceResultsMock: vi.fn(),
    browseExportFolderMock: vi.fn(),
}));

vi.mock('../services/geminiService', () => ({
    exportWorkspaceResults: exportWorkspaceResultsMock,
    browseExportFolder: browseExportFolderMock,
}));

describe('ExportResultsModal', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        vi.clearAllMocks();
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
    });

    const sampleHistory: GeneratedImage[] = [
        {
            id: 'turn-1',
            url: 'https://example.com/img1.png',
            savedFilename: 'img1.png',
            prompt: 'Cute Cyberpunk Banana',
            model: 'gemini-3.1-flash-image',
            aspectRatio: '1:1',
            size: '1K',
            style: 'Cyberpunk',
            createdAt: 1000,
            status: 'success',
            resultParts: [
                {
                    kind: 'output-image',
                    imageUrl: 'https://example.com/img1.png',
                    savedFilename: 'img1.png',
                    mimeType: 'image/png',
                    sequence: 0,
                },
                {
                    kind: 'output-image',
                    imageUrl: 'https://example.com/var1.png',
                    savedFilename: 'var1.png',
                    mimeType: 'image/png',
                    sequence: 1,
                },
                {
                    kind: 'thought-image',
                    imageUrl: 'https://example.com/thought1.png',
                    savedFilename: 'thought1.png',
                    mimeType: 'image/png',
                    sequence: 2,
                },
            ],
        },
        {
            id: 'turn-2',
            url: 'https://example.com/thumb-thumbnail.png',
            thumbnailSavedFilename: 'thumb-thumbnail.png',
            prompt: 'Thumbnail item',
            model: 'gemini-3.1-flash-image',
            aspectRatio: '1:1',
            size: '1K',
            style: 'None',
            createdAt: 2000,
            status: 'failed',
        },
    ];

    it('returns null when isOpen is false', () => {
        act(() => {
            root.render(
                <ExportResultsModal
                    isOpen={false}
                    onClose={vi.fn()}
                    history={sampleHistory}
                    t={(key) => key}
                />,
            );
        });
        expect(container.firstChild).toBeNull();
    });

    it('renders modal with default export directory and deduplicates primary output from variants', () => {
        act(() => {
            root.render(
                <ExportResultsModal
                    isOpen={true}
                    onClose={vi.fn()}
                    history={sampleHistory}
                    t={(key) => key}
                />,
            );
        });

        const modal = container.querySelector('[data-testid="export-results-modal"]');
        expect(modal).not.toBeNull();

        const input = container.querySelector<HTMLInputElement>('[data-testid="export-results-target-dir-input"]');
        expect(input?.value).toBe('./export');

        // Turn 1 has 1 main image + 1 extra variant (img1.png in resultParts is deduplicated!) = 2
        expect(container.textContent).toContain('2');
    });

    it('browses folder and updates directory input', async () => {
        browseExportFolderMock.mockResolvedValueOnce({ cancelled: false, path: 'D:\\MyCustomOutputs' });

        act(() => {
            root.render(
                <ExportResultsModal
                    isOpen={true}
                    onClose={vi.fn()}
                    history={sampleHistory}
                    t={(key) => key}
                />,
            );
        });

        const browseBtn = container.querySelector<HTMLButtonElement>('[data-testid="export-results-browse-btn"]');
        expect(browseBtn).not.toBeNull();

        await act(async () => {
            browseBtn?.click();
        });

        expect(browseExportFolderMock).toHaveBeenCalledTimes(1);
        const input = container.querySelector<HTMLInputElement>('[data-testid="export-results-target-dir-input"]');
        expect(input?.value).toBe('D:\\MyCustomOutputs');
    });

    it('executes export with embedded metadata, closes modal on success, and aligns base filenames', async () => {
        exportWorkspaceResultsMock.mockResolvedValueOnce({
            success: true,
            outputDir: 'D:\\MyCustomOutputs',
            exportedCount: 2,
            skippedCount: 0,
            errors: [],
        });

        const showNotification = vi.fn();
        const onClose = vi.fn();
        const mockT = (key: string) => (key === 'exportResultsSuccessNotice' ? 'Exported {0} images to {1}' : key);

        act(() => {
            root.render(
                <ExportResultsModal
                    isOpen={true}
                    onClose={onClose}
                    history={sampleHistory}
                    t={mockT}
                    showNotification={showNotification}
                />,
            );
        });

        const confirmBtn = container.querySelector<HTMLButtonElement>('[data-testid="export-results-confirm-btn"]');
        expect(confirmBtn).not.toBeNull();

        await act(async () => {
            confirmBtn?.click();
        });

        expect(exportWorkspaceResultsMock).toHaveBeenCalledTimes(1);
        expect(exportWorkspaceResultsMock).toHaveBeenCalledWith(
            expect.objectContaining({
                targetDir: './export',
                items: expect.arrayContaining([
                    expect.objectContaining({
                        imageUrl: 'img1.png',
                        baseFilename: 'img1',
                    }),
                    expect.objectContaining({
                        imageUrl: 'var1.png',
                        baseFilename: 'var1',
                    }),
                ]),
            }),
        );

        expect(showNotification).toHaveBeenCalledWith(expect.stringContaining('2'), 'info');
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not close modal when export produces errors', async () => {
        exportWorkspaceResultsMock.mockResolvedValueOnce({
            success: false,
            outputDir: 'D:\\MyCustomOutputs',
            exportedCount: 0,
            skippedCount: 1,
            errors: ['Disk full'],
        });

        const showNotification = vi.fn();
        const onClose = vi.fn();

        act(() => {
            root.render(
                <ExportResultsModal
                    isOpen={true}
                    onClose={onClose}
                    history={sampleHistory}
                    t={(k) => k}
                    showNotification={showNotification}
                />,
            );
        });

        const confirmBtn = container.querySelector<HTMLButtonElement>('[data-testid="export-results-confirm-btn"]');
        await act(async () => {
            confirmBtn?.click();
        });

        expect(exportWorkspaceResultsMock).toHaveBeenCalledTimes(1);
        expect(onClose).not.toHaveBeenCalled();
    });
});
