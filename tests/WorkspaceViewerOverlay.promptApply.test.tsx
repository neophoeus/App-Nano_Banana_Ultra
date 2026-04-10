/** @vitest-environment jsdom */

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WorkspaceViewerOverlay from '../components/WorkspaceViewerOverlay';

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

    it('routes the viewer prompt through a dedicated CTA, closes the viewer, and avoids structured-output prompt actions', () => {
        const handleApplyPrompt = vi.fn();
        const handleReplacePrompt = vi.fn();
        const handleAppendPrompt = vi.fn();
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
                    aspectRatio="1:1"
                    size="1K"
                    styleLabel="Cinematic"
                    model="Gemini 3.1 Flash"
                    effectiveResultText="Viewer text"
                    structuredData={null}
                    structuredOutputMode={null}
                    formattedStructuredOutput={null}
                    effectiveThoughts={null}
                    thoughtStateMessage="No visible thoughts"
                    provenancePanel={<div>provenance</div>}
                    sessionHintEntries={[]}
                    formatSessionHintKey={(key) => key}
                    formatSessionHintValue={(_key, value) => String(value)}
                    onClose={handleClose}
                    onMoveViewer={handleMoveViewer}
                    onApplyPrompt={handleApplyPrompt}
                    onReplacePrompt={handleReplacePrompt}
                    onAppendPrompt={handleAppendPrompt}
                />,
            );
        });

        const applyButton = container.querySelector('[data-testid="workspace-viewer-apply-prompt"]');
        expect(applyButton?.textContent).toContain('Apply Prompt to Composer');

        act(() => {
            applyButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        expect(handleApplyPrompt).toHaveBeenCalledWith('Viewer prompt');
        expect(handleReplacePrompt).not.toHaveBeenCalled();
        expect(handleAppendPrompt).not.toHaveBeenCalled();
        expect(handleClose).toHaveBeenCalledTimes(1);
        expect(handleMoveViewer).not.toHaveBeenCalled();
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
                    aspectRatio="1:1"
                    size="1K"
                    styleLabel="None"
                    model="Gemini 3.1 Flash"
                    effectiveResultText="Viewer text"
                    structuredData={null}
                    structuredOutputMode={null}
                    formattedStructuredOutput={null}
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
    });
});
