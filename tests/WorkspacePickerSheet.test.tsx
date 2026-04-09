import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { MODEL_CAPABILITIES } from '../constants';
import WorkspacePickerSheet from '../components/WorkspacePickerSheet';
import { GeneratedImage } from '../types';
import { getTranslation } from '../utils/translations';

const buildTurn = (overrides: Partial<GeneratedImage> = {}): GeneratedImage => ({
    id: 'turn-1',
    url: 'https://example.com/image.png',
    prompt: 'Prompt',
    aspectRatio: '1:1',
    size: '1K',
    style: 'None',
    model: 'gemini-3.1-flash-image-preview',
    createdAt: 1,
    status: 'success',
    ...overrides,
});

describe('WorkspacePickerSheet', () => {
    it('falls back to the loading shell when a removed prompt-helper route is forced in', () => {
        const t = (key: string) => getTranslation('en', key);
        const markup = renderToStaticMarkup(
            <WorkspacePickerSheet
                activePickerSheet="history"
                activeSheetTitle="Prompt History"
                pickerSheetZIndex={120}
                prompt="Prompt"
                setPrompt={vi.fn()}
                handleSurpriseMe={vi.fn()}
                handleSmartRewrite={vi.fn()}
                isEnhancingPrompt={false}
                closePickerSheet={vi.fn()}
                openPromptSheet={vi.fn()}
                openTemplatesSheet={vi.fn()}
                openHistorySheet={vi.fn()}
                openStylesSheet={vi.fn()}
                openReferencesSheet={vi.fn()}
                promptHistory={[]}
                removePrompt={vi.fn()}
                clearPromptHistory={vi.fn()}
                history={[buildTurn({ lineageAction: 'continue' })]}
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
            />,
        );

        expect(markup).toContain('Prompt History');
    expect(markup).toContain(t('workspacePickerLoading'));
    expect(markup).not.toContain(t('workspacePickerNoSavedPrompts'));
        expect(markup).not.toContain(t('workspaceSheetTitleGallery'));
        expect(markup).not.toContain(t('templates'));
        expect(markup).not.toContain(t('workspaceSheetTitleStyles'));
        expect(markup).not.toContain(t('workspaceSheetTitleReferences'));
        expect(markup).not.toContain(t('switchDark'));
        expect(markup).not.toContain(t('switchLight'));
    });

    it('renders unified generation settings for full and sketch variants', () => {
        const t = (key: string) => getTranslation('en', key);
        const renderSettingsSheet = (settingsVariant: 'full' | 'sketch') =>
            renderToStaticMarkup(
                <WorkspacePickerSheet
                    activePickerSheet="settings"
                    activeSheetTitle={t('workspaceSheetTitleGenerationSettings')}
                    pickerSheetZIndex={120}
                    prompt="Prompt"
                    setPrompt={vi.fn()}
                    handleSurpriseMe={vi.fn()}
                    handleSmartRewrite={vi.fn()}
                    isEnhancingPrompt={false}
                    closePickerSheet={vi.fn()}
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
                    imageSize="1K"
                    setImageSize={vi.fn()}
                    batchSize={2}
                    setBatchSize={vi.fn()}
                    settingsVariant={settingsVariant}
                    objectImages={[]}
                    characterImages={[]}
                    setObjectImages={vi.fn()}
                    isGenerating={false}
                    showNotification={vi.fn()}
                    handleRemoveObjectReference={vi.fn()}
                    setCharacterImages={vi.fn()}
                    handleRemoveCharacterReference={vi.fn()}
                />,
            );

        const fullMarkup = renderSettingsSheet('full');
        const sketchMarkup = renderSettingsSheet('sketch');

        expect(fullMarkup).toContain('workspace-generation-settings-sheet');
        expect(fullMarkup).toContain('workspace-generation-settings-model-pane');
        expect(fullMarkup).toContain('workspace-generation-settings-controls-pane');
        expect(fullMarkup).toContain('Nano Banana 2');
        expect(fullMarkup).toContain('gemini-3.1-flash-image-preview');
        expect(fullMarkup).not.toContain(t('modelGemini31Flash'));
        expect(fullMarkup).toContain(t('workspacePickerModelSupportImageSearch'));
        expect(fullMarkup).toContain(t('resolution'));
        expect(fullMarkup).toContain(t('batchSize'));
        expect(fullMarkup).toContain('generation-settings-open-advanced');
        expect(fullMarkup).toContain(t('composerToolbarAdvancedSettings'));
        expect(fullMarkup).toContain('generation-settings-apply');
        expect(fullMarkup).not.toContain(t('promptLabel'));
        expect(fullMarkup).not.toContain(t('workspacePickerPromptHistoryTitle'));
        expect(fullMarkup).not.toContain(t('templates'));
        expect(fullMarkup).not.toContain(t('workspaceSheetTitleStyles'));
        expect(fullMarkup).not.toContain(t('workspaceSheetTitleReferences'));
        expect(fullMarkup).not.toContain(t('generationSettingsModalDesc'));
        expect(fullMarkup).not.toContain(t('switchDark'));
        expect(fullMarkup).not.toContain(t('switchLight'));

        expect(sketchMarkup).toContain('workspace-generation-settings-sheet');
        expect(sketchMarkup).toContain('workspace-generation-settings-model-pane');
        expect(sketchMarkup).toContain('workspace-generation-settings-controls-pane');
        expect(sketchMarkup).not.toContain(t('resolution'));
        expect(sketchMarkup).not.toContain(t('batchSize'));
        expect(sketchMarkup).toContain('generation-settings-open-advanced');
        expect(sketchMarkup).toContain('generation-settings-apply');
        expect(sketchMarkup).not.toContain(t('generationSettingsModalDescSketch'));
        expect(sketchMarkup).not.toContain(t('switchDark'));
        expect(sketchMarkup).not.toContain(t('switchLight'));
    });

    it('renders references sheet as uploader-only object and character sections', () => {
        const t = (key: string) => getTranslation('en', key);
        const markup = renderToStaticMarkup(
            <WorkspacePickerSheet
                activePickerSheet="references"
                activeSheetTitle="References"
                pickerSheetZIndex={120}
                prompt="Prompt"
                setPrompt={vi.fn()}
                handleSurpriseMe={vi.fn()}
                handleSmartRewrite={vi.fn()}
                isEnhancingPrompt={false}
                closePickerSheet={vi.fn()}
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
                objectImages={['one.png']}
                characterImages={['char.png']}
                setObjectImages={vi.fn()}
                isGenerating={false}
                showNotification={vi.fn()}
                handleRemoveObjectReference={vi.fn()}
                setCharacterImages={vi.fn()}
                handleRemoveCharacterReference={vi.fn()}
            />,
        );

        expect(markup).toContain(t('objectRefs'));
        expect(markup).toContain(t('characterRefs'));
        expect(markup).toContain('1 / 10');
        expect(markup).toContain('1 / 4');
        expect(markup).not.toContain('picker-references-editor-base-card');
        expect(markup).not.toContain('picker-references-stage-source-card');
        expect(markup).not.toContain(t('workspacePickerStageSourceHint'));
        expect(markup).not.toContain('Rec. <');
    });

    it('hides style entry points for editor picker flows', () => {
        const t = (key: string) => getTranslation('en', key);
        const promptMarkup = renderToStaticMarkup(
            <WorkspacePickerSheet
                activePickerSheet="prompt"
                activeSheetTitle={t('workspaceSheetTitlePrompt')}
                pickerSheetZIndex={120}
                prompt="Prompt"
                setPrompt={vi.fn()}
                handleSurpriseMe={vi.fn()}
                handleSmartRewrite={vi.fn()}
                isEnhancingPrompt={false}
                closePickerSheet={vi.fn()}
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
            />,
        );

        const stylesMarkup = renderToStaticMarkup(
            <WorkspacePickerSheet
                activePickerSheet="styles"
                activeSheetTitle={t('workspaceSheetTitleStyles')}
                pickerSheetZIndex={120}
                prompt="Prompt"
                setPrompt={vi.fn()}
                handleSurpriseMe={vi.fn()}
                handleSmartRewrite={vi.fn()}
                isEnhancingPrompt={false}
                closePickerSheet={vi.fn()}
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
            />,
        );

        expect(promptMarkup).toContain('shared-prompt-clear');
        expect(promptMarkup).toContain('shared-prompt-apply');
        expect(promptMarkup).toContain(t('generationSettingsApply'));
        expect(promptMarkup).not.toContain(t('workspacePickerInspiration'));
        expect(promptMarkup).not.toContain(t('rewrite'));
        expect(promptMarkup).not.toContain(t('templates'));
        expect(promptMarkup).not.toContain(t('workspacePickerPromptHistoryTitle'));
        expect(promptMarkup).not.toContain(t('workspaceSheetTitleStyles'));
        expect(stylesMarkup).toBe('');
    });

    it('locks the ratio and filters model options during retouch editor flows', () => {
        const t = (key: string) => getTranslation('en', key);
        const markup = renderToStaticMarkup(
            <WorkspacePickerSheet
                activePickerSheet="settings"
                activeSheetTitle={t('workspaceSheetTitleGenerationSettings')}
                pickerSheetZIndex={120}
                prompt="Prompt"
                setPrompt={vi.fn()}
                handleSurpriseMe={vi.fn()}
                handleSmartRewrite={vi.fn()}
                isEnhancingPrompt={false}
                closePickerSheet={vi.fn()}
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
                aspectRatio="1:8"
                setAspectRatio={vi.fn()}
                imageSize="1K"
                setImageSize={vi.fn()}
                lockedAspectRatio="1:8"
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
            />,
        );

        expect(markup).toContain('gemini-3.1-flash-image-preview');
        expect(markup).not.toContain('gemini-3-pro-image-preview');
        expect(markup).not.toContain('gemini-2.5-flash-image');
        expect(markup).toContain('pointer-events-none');
    });
});
