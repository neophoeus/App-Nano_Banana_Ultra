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
    it('removes the gallery picker route now that gallery lives in the main workspace rail', () => {
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
        expect(markup).toContain(t('workspacePickerNoSavedPrompts'));
        expect(markup).not.toContain(t('workspaceSheetTitleGallery'));
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
});
