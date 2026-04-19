/** @vitest-environment jsdom */

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WorkspaceViewerOverlay from '../components/WorkspaceViewerOverlay';

const settingsSnapshot = {
    aspectRatio: '16:9' as const,
    imageSize: '2K' as const,
    imageStyle: 'Anime' as const,
    imageModel: 'gemini-3.1-flash-image-preview' as const,
    batchSize: 3,
    outputFormat: 'images-only' as const,
    temperature: 0.7,
    thinkingLevel: 'high' as const,
    includeThoughts: true,
    googleSearch: true,
    imageSearch: false,
};

const sparseSettingsSnapshot = {
    aspectRatio: '16:9' as const,
    imageSize: '2K' as const,
    imageStyle: 'Anime' as const,
    imageModel: 'gemini-3-pro-image-preview' as const,
    batchSize: 1,
    thinkingLevel: 'disabled' as const,
    googleSearch: true,
};

describe('WorkspaceViewerOverlay prompt apply', () => {
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
        vi.restoreAllMocks();
        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
    });

    it('routes the viewer prompt through a dedicated CTA and closes the viewer', () => {
        const handleApplyPrompt = vi.fn();
        const handleClose = vi.fn();
        const handleMoveViewer = vi.fn();

        act(() => {
            root.render(
                <WorkspaceViewerOverlay
                    currentLanguage="en"
                    isOpen={true}
                    activeViewerImage="https://example.com/result.png"
                    generatedImageCount={1}
                    prompt="Viewer prompt"
                    metadataItems={[]}
                    metadataStateMessage={null}
                    effectiveThoughts={null}
                    thoughtStateMessage="No visible thoughts"
                    provenancePanel={<div>provenance</div>}
                    sessionHintEntries={[]}
                    formatSessionHintKey={(key) => key}
                    formatSessionHintValue={(_key, value) => String(value)}
                    onClose={handleClose}
                    onMoveViewer={handleMoveViewer}
                    onApplyPrompt={handleApplyPrompt}
                />,
            );
        });

        const applyButton = container.querySelector('[data-testid="workspace-viewer-apply-prompt"]');
        expect(applyButton?.textContent).toContain('Apply Prompt to Composer');

        act(() => {
            applyButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        expect(handleApplyPrompt).toHaveBeenCalledWith('Viewer prompt');
        expect(handleClose).toHaveBeenCalledTimes(1);
        expect(handleMoveViewer).not.toHaveBeenCalled();
    });

    it('routes the viewer settings through a dedicated CTA and closes the viewer', () => {
        const handleApplySettings = vi.fn();
        const handleClose = vi.fn();

        act(() => {
            root.render(
                <WorkspaceViewerOverlay
                    currentLanguage="en"
                    isOpen={true}
                    activeViewerImage="https://example.com/result.png"
                    generatedImageCount={1}
                    prompt="Viewer prompt"
                    metadataItems={[]}
                    metadataStateMessage={null}
                    effectiveThoughts={null}
                    thoughtStateMessage="No visible thoughts"
                    provenancePanel={<div>provenance</div>}
                    sessionHintEntries={[]}
                    formatSessionHintKey={(key) => key}
                    formatSessionHintValue={(_key, value) => String(value)}
                    onClose={handleClose}
                    onMoveViewer={vi.fn()}
                    settingsSnapshot={settingsSnapshot}
                    onApplySettings={handleApplySettings}
                />,
            );
        });

        const applySettingsButton = container.querySelector('[data-testid="workspace-viewer-apply-settings"]');
        expect(applySettingsButton?.textContent).toContain('Apply Settings to Composer');

        act(() => {
            applySettingsButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        expect(handleApplySettings).toHaveBeenCalledWith(settingsSnapshot);
        expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('keeps the viewer settings CTA available for sparse snapshots', () => {
        const handleApplySettings = vi.fn();

        act(() => {
            root.render(
                <WorkspaceViewerOverlay
                    currentLanguage="en"
                    isOpen={true}
                    activeViewerImage="https://example.com/result.png"
                    generatedImageCount={1}
                    prompt="Viewer prompt"
                    metadataItems={[]}
                    metadataStateMessage={null}
                    effectiveThoughts={null}
                    thoughtStateMessage="No visible thoughts"
                    provenancePanel={<div>provenance</div>}
                    sessionHintEntries={[]}
                    formatSessionHintKey={(key) => key}
                    formatSessionHintValue={(_key, value) => String(value)}
                    onClose={vi.fn()}
                    onMoveViewer={vi.fn()}
                    settingsSnapshot={sparseSettingsSnapshot}
                    onApplySettings={handleApplySettings}
                />,
            );
        });

        const applySettingsButton = container.querySelector('[data-testid="workspace-viewer-apply-settings"]');
        expect(applySettingsButton?.textContent).toContain('Apply Settings to Composer');

        act(() => {
            applySettingsButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        expect(handleApplySettings).toHaveBeenCalledWith(sparseSettingsSnapshot);
    });

    it('hides the viewer prompt CTA when there is no prompt text to apply', () => {
        act(() => {
            root.render(
                <WorkspaceViewerOverlay
                    currentLanguage="en"
                    isOpen={true}
                    activeViewerImage="https://example.com/result.png"
                    generatedImageCount={1}
                    prompt="   "
                    metadataItems={[]}
                    metadataStateMessage={null}
                    effectiveThoughts={null}
                    thoughtStateMessage="No visible thoughts"
                    provenancePanel={<div>provenance</div>}
                    sessionHintEntries={[]}
                    formatSessionHintKey={(key) => key}
                    formatSessionHintValue={(_key, value) => String(value)}
                    onClose={vi.fn()}
                    onMoveViewer={vi.fn()}
                    onApplyPrompt={vi.fn()}
                />,
            );
        });

        expect(container.querySelector('[data-testid="workspace-viewer-apply-prompt"]')).toBeNull();
        expect(container.querySelector('[data-testid="workspace-viewer-apply-settings"]')).toBeNull();
    });
});
