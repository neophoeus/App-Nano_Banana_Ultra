/** @vitest-environment jsdom */

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ImageEditor from '../components/ImageEditor';
import { getTranslation } from '../utils/translations';

const renderEditor = ({
    currentLanguage = 'en',
    prompt = 'Editor prompt',
    onPromptChange = vi.fn(),
    leftDockTopOffset = 96,
    root,
}: {
    currentLanguage?: 'en' | 'zh_TW';
    prompt?: string;
    onPromptChange?: ReturnType<typeof vi.fn>;
    leftDockTopOffset?: number | null;
    root: Root;
} = {}) => {
    act(() => {
        root.render(
            <ImageEditor
                initialImageUrl="https://example.com/source.png"
                initialPrompt="Initial prompt"
                initialObjectImages={['object-a']}
                initialCharacterImages={['character-a']}
                initialRatio="1:1"
                initialSize="1K"
                initialBatchSize={1}
                prompt={prompt}
                onPromptChange={onPromptChange}
                objectImages={['object-b']}
                onObjectImagesChange={vi.fn()}
                characterImages={['character-b']}
                onCharacterImagesChange={vi.fn()}
                mode="inpaint"
                onModeChange={vi.fn()}
                ratio="16:9"
                onRatioChange={vi.fn()}
                size="2K"
                onSizeChange={vi.fn()}
                batchSize={3}
                onBatchSizeChange={vi.fn()}
                onGenerate={vi.fn()}
                onCancel={vi.fn()}
                isGenerating={false}
                currentLanguage={currentLanguage}
                error={null}
                onErrorClear={vi.fn()}
                imageModel="gemini-3.1-flash-image-preview"
                onModelChange={vi.fn()}
                leftDockTopOffset={leftDockTopOffset}
            />,
        );
    });

    return { onPromptChange };
};

describe('ImageEditor quantity reset behavior', () => {
    let container: HTMLDivElement;
    let root: Root;
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        window.localStorage.clear();
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
        consoleErrorSpy.mockRestore();
        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
    });

    it('does not replay the stale initial batch size when editor reset is pressed after quantity changed to 3', () => {
        const handlePromptChange = vi.fn();
        const handleObjectImagesChange = vi.fn();
        const handleCharacterImagesChange = vi.fn();
        const handleRatioChange = vi.fn();
        const handleSizeChange = vi.fn();
        const handleBatchSizeChange = vi.fn();

        act(() => {
            root.render(
                <ImageEditor
                    initialImageUrl="https://example.com/source.png"
                    initialPrompt="Initial prompt"
                    initialObjectImages={['object-a']}
                    initialCharacterImages={['character-a']}
                    initialRatio="1:1"
                    initialSize="1K"
                    initialBatchSize={1}
                    prompt="Editor prompt"
                    onPromptChange={handlePromptChange}
                    objectImages={['object-b']}
                    onObjectImagesChange={handleObjectImagesChange}
                    characterImages={['character-b']}
                    onCharacterImagesChange={handleCharacterImagesChange}
                    mode="inpaint"
                    onModeChange={vi.fn()}
                    ratio="16:9"
                    onRatioChange={handleRatioChange}
                    size="2K"
                    onSizeChange={handleSizeChange}
                    batchSize={3}
                    onBatchSizeChange={handleBatchSizeChange}
                    onGenerate={vi.fn()}
                    onCancel={vi.fn()}
                    isGenerating={false}
                    currentLanguage="en"
                    error={null}
                    onErrorClear={vi.fn()}
                    imageModel="gemini-3.1-flash-image-preview"
                    onModelChange={vi.fn()}
                    leftDockTopOffset={96}
                />,
            );
        });

        const resetButton = Array.from(container.querySelectorAll('button')).find(
            (candidate) => candidate.textContent?.trim() === getTranslation('en', 'btnReset'),
        ) as HTMLButtonElement | undefined;

        expect(resetButton).toBeTruthy();

        act(() => {
            resetButton?.click();
        });

        expect(handlePromptChange).toHaveBeenCalledWith('Initial prompt');
        expect(handleObjectImagesChange).toHaveBeenCalledWith(['object-a']);
        expect(handleCharacterImagesChange).toHaveBeenCalledWith(['character-a']);
        expect(handleRatioChange).toHaveBeenCalledWith('1:1');
        expect(handleSizeChange).toHaveBeenCalledWith('1K');
        expect(handleBatchSizeChange).not.toHaveBeenCalled();
    });

    it('does not render a standalone prompt card inside the editor canvas stack', () => {
        const handlePromptChange = vi.fn();
        renderEditor({ root, currentLanguage: 'zh_TW', onPromptChange: handlePromptChange });

        expect(container.querySelector('[data-testid="editor-prompt-card"]')).toBeNull();
        expect(container.querySelector('[data-testid="editor-prompt-input"]')).toBeNull();
        expect(handlePromptChange).not.toHaveBeenCalled();
    });

    it('does not show a doodle-entry toast when switching into doodle', () => {
        renderEditor({ root, currentLanguage: 'en' });

        const doodleModeButton = container.querySelector('[data-testid="editor-doodle-mode"]') as HTMLButtonElement;
        expect(doodleModeButton).toBeTruthy();

        act(() => {
            doodleModeButton.click();
        });

        expect(container.querySelector('[data-testid="editor-toast"]')).toBeNull();
    });

    it('shows the visible-text onboarding notice every time the text tool is activated', () => {
        renderEditor({ root, currentLanguage: 'en' });

        const doodleModeButton = container.querySelector('[data-testid="editor-doodle-mode"]') as HTMLButtonElement;
        expect(doodleModeButton).toBeTruthy();

        act(() => {
            doodleModeButton.click();
        });

        const textToolButton = container.querySelector('[data-testid="editor-text-tool"]') as HTMLButtonElement;
        expect(textToolButton).toBeTruthy();
        expect(textToolButton.getAttribute('title')).toContain(getTranslation('en', 'editorTextToolHintTitle'));

        act(() => {
            textToolButton.click();
        });

        const firstUseModal = container.querySelector('[data-testid="editor-text-first-use-modal"]') as HTMLDivElement;
        expect(firstUseModal).toBeTruthy();
        expect(firstUseModal.textContent).toContain(getTranslation('en', 'editorTextFirstUseTitle'));
        expect(firstUseModal.textContent).toContain(getTranslation('en', 'editorTextFirstUseBody'));

        const confirmButton = container.querySelector(
            '[data-testid="editor-text-first-use-confirm"]',
        ) as HTMLButtonElement;
        expect(confirmButton).toBeTruthy();

        act(() => {
            confirmButton.click();
        });

        expect(container.querySelector('[data-testid="editor-text-first-use-modal"]')).toBeNull();

        act(() => {
            textToolButton.click();
        });

        const reopenedModal = container.querySelector('[data-testid="editor-text-first-use-modal"]') as HTMLDivElement;
        expect(reopenedModal).toBeTruthy();
        expect(reopenedModal.textContent).toContain(getTranslation('en', 'editorTextFirstUseTitle'));
    });
});
