/** @vitest-environment jsdom */

import React, { act, useState } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WorkspacePickerSheet, { PickerSheet } from '../components/WorkspacePickerSheet';
import { MODEL_CAPABILITIES } from '../constants';
import { getTranslation } from '../utils/translations';

const t = (key: string) => getTranslation('en', key);

function PromptSheetHarness({ initialPrompt = 'Committed prompt' }: { initialPrompt?: string }) {
    const [prompt, setPrompt] = useState(initialPrompt);
    const [activePickerSheet, setActivePickerSheet] = useState<PickerSheet>('prompt');

    return (
        <div>
            <div data-testid="committed-prompt">{prompt}</div>
            <button data-testid="reopen-prompt-sheet" type="button" onClick={() => setActivePickerSheet('prompt')}>
                Reopen prompt sheet
            </button>
            <WorkspacePickerSheet
                activePickerSheet={activePickerSheet}
                activeSheetTitle={t('workspaceSheetTitlePrompt')}
                pickerSheetZIndex={120}
                prompt={prompt}
                setPrompt={setPrompt}
                handleSurpriseMe={vi.fn()}
                handleSmartRewrite={vi.fn()}
                isEnhancingPrompt={false}
                closePickerSheet={() => setActivePickerSheet(null)}
                openPromptSheet={vi.fn()}
                openTemplatesSheet={vi.fn()}
                openHistorySheet={vi.fn()}
                openStylesSheet={vi.fn()}
                openReferencesSheet={vi.fn()}
                promptHistory={[]}
                removePrompt={vi.fn()}
                clearPromptHistory={vi.fn()}
                history={[]}
                handleHistorySelect={vi.fn()}
                handleContinueFromHistoryTurn={vi.fn()}
                handleBranchFromHistoryTurn={vi.fn()}
                handleRenameBranch={vi.fn()}
                isPromotedContinuationSource={() => false}
                getContinueActionLabel={() => 'Continue from turn'}
                branchNameOverrides={{}}
                selectedHistoryId={null}
                currentLanguage="en"
                handleClearGalleryHistory={vi.fn()}
                t={t}
                imageStyle="none"
                setImageStyle={vi.fn()}
                imageModel="gemini-3.1-flash-image-preview"
                setImageModel={vi.fn()}
                capability={MODEL_CAPABILITIES['gemini-3.1-flash-image-preview']}
                aspectRatio="1:1"
                setAspectRatio={vi.fn()}
                imageSize="1024x1024"
                setImageSize={vi.fn()}
                batchSize={1}
                setBatchSize={vi.fn()}
                settingsVariant="full"
                objectImages={[]}
                characterImages={[]}
                setObjectImages={vi.fn()}
                isGenerating={false}
                showNotification={vi.fn()}
                handleRemoveObjectReference={vi.fn()}
                setCharacterImages={vi.fn()}
                handleRemoveCharacterReference={vi.fn()}
                showStyleEntry={false}
            />
        </div>
    );
}

describe('WorkspacePickerSheet prompt draft flow', () => {
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

    const getPromptInput = () => container.querySelector('[data-testid="shared-prompt-input"]') as HTMLTextAreaElement;
    const setPromptInputValue = (value: string) => {
        const input = getPromptInput();
        act(() => {
            const valueSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
            valueSetter?.call(input, value);
            input.dispatchEvent(new Event('input', { bubbles: true }));
        });
    };

    it('keeps prompt edits local until apply is pressed', () => {
        act(() => {
            root.render(<PromptSheetHarness />);
        });

        expect(getPromptInput().value).toBe('Committed prompt');
        setPromptInputValue('Draft-only prompt');

        expect(getPromptInput().value).toBe('Draft-only prompt');
        expect(container.querySelector('[data-testid="committed-prompt"]')?.textContent).toBe('Committed prompt');

        const applyButton = container.querySelector('[data-testid="shared-prompt-apply"]') as HTMLButtonElement;
        act(() => {
            applyButton.click();
        });

        expect(container.querySelector('[data-testid="shared-prompt-input"]')).toBeNull();
        expect(container.querySelector('[data-testid="committed-prompt"]')?.textContent).toBe('Draft-only prompt');
    });

    it('discards prompt draft edits when close is used', () => {
        act(() => {
            root.render(<PromptSheetHarness />);
        });

        setPromptInputValue('Discarded draft');

        const closeButton = container.querySelector('[data-testid="picker-sheet-close"]') as HTMLButtonElement;
        act(() => {
            closeButton.click();
        });

        expect(container.querySelector('[data-testid="shared-prompt-input"]')).toBeNull();
        expect(container.querySelector('[data-testid="committed-prompt"]')?.textContent).toBe('Committed prompt');

        const reopenButton = container.querySelector('[data-testid="reopen-prompt-sheet"]') as HTMLButtonElement;
        act(() => {
            reopenButton.click();
        });

        expect(getPromptInput().value).toBe('Committed prompt');
    });

    it('clears only the draft textarea until apply commits the change', () => {
        act(() => {
            root.render(<PromptSheetHarness />);
        });

        const clearButton = container.querySelector('[data-testid="shared-prompt-clear"]') as HTMLButtonElement;

        act(() => {
            clearButton.click();
        });

        expect(getPromptInput().value).toBe('');
        expect(container.querySelector('[data-testid="committed-prompt"]')?.textContent).toBe('Committed prompt');

        const applyButton = container.querySelector('[data-testid="shared-prompt-apply"]') as HTMLButtonElement;
        act(() => {
            applyButton.click();
        });

        expect(container.querySelector('[data-testid="committed-prompt"]')?.textContent).toBe('');
    });
});