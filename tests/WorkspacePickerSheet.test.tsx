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
    it('keeps gallery sheet history actions on open-plus-rename instead of continue-or-branch', () => {
        const t = (key: string) => getTranslation('en', key);
        const markup = renderToStaticMarkup(
            <WorkspacePickerSheet
                activePickerSheet="gallery"
                activeSheetTitle="Gallery"
                pickerSheetZIndex={120}
                prompt="Prompt"
                setPrompt={vi.fn()}
                handleSurpriseMe={vi.fn()}
                handleSmartRewrite={vi.fn()}
                isEnhancingPrompt={false}
                closePickerSheet={vi.fn()}
                openPromptSheet={vi.fn()}
                openGallerySheet={vi.fn()}
                openTemplatesSheet={vi.fn()}
                openHistorySheet={vi.fn()}
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
                objectImages={[]}
                characterImages={[]}
                hasSketch={false}
                editorBaseAsset={null}
                currentStageAsset={null}
                getStageOriginLabel={(origin) => (origin ? `Origin: ${origin}` : 'Origin: none')}
                getLineageActionLabel={(action) => (action ? `Lineage: ${action}` : 'Lineage: none')}
                handleOpenSketchPad={vi.fn()}
                openUploadDialog={vi.fn()}
                activeViewerImage={null}
                handleStageCurrentImageAsEditorBase={vi.fn()}
                handleClearEditorBaseAsset={vi.fn()}
                setObjectImages={vi.fn()}
                isGenerating={false}
                showNotification={vi.fn()}
                handleRemoveObjectReference={vi.fn()}
                setCharacterImages={vi.fn()}
                handleRemoveCharacterReference={vi.fn()}
            />,
        );

        expect(markup).toContain('Gallery');
        expect(markup).toContain(t('workspacePickerLoading'));
        expect(markup).not.toContain('history-open-turn-1');
        expect(markup).not.toContain('history-rename-turn-1');
    });

    it('keeps references-sheet editor-base and stage-source copy summary-first', () => {
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
                openGallerySheet={vi.fn()}
                openTemplatesSheet={vi.fn()}
                openHistorySheet={vi.fn()}
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
                objectImages={['one.png']}
                characterImages={['char.png']}
                hasSketch={true}
                editorBaseAsset={{ id: 'editor-base', type: 'generated', label: 'Editor Base', origin: 'history' }}
                currentStageAsset={{
                    id: 'stage-source',
                    type: 'generated',
                    label: 'Stage Source',
                    origin: 'history',
                    sourceHistoryId: 'turn-1',
                    lineageAction: 'continued',
                }}
                getStageOriginLabel={(origin) => (origin ? `Origin: ${origin}` : 'Origin: none')}
                getLineageActionLabel={(action) => (action ? `Lineage: ${action}` : 'Lineage: none')}
                handleOpenSketchPad={vi.fn()}
                openUploadDialog={vi.fn()}
                activeViewerImage="viewer.png"
                handleStageCurrentImageAsEditorBase={vi.fn()}
                handleClearEditorBaseAsset={vi.fn()}
                setObjectImages={vi.fn()}
                isGenerating={false}
                showNotification={vi.fn()}
                handleRemoveObjectReference={vi.fn()}
                setCharacterImages={vi.fn()}
                handleRemoveCharacterReference={vi.fn()}
            />,
        );

        expect(markup).toContain('picker-references-editor-base-card');
        expect(markup).toContain('picker-references-editor-base-hint-trigger');
        expect(markup).toContain('picker-references-character-card');
        expect(markup).toContain('picker-references-character-hint-trigger');
        expect(markup).toContain('picker-references-stage-source-card');
        expect(markup).toContain('picker-references-stage-source-hint-trigger');
        expect(markup).not.toContain('picker-references-editor-base-details');
        expect(markup).not.toContain('picker-references-character-details');
        expect(markup).not.toContain('picker-references-stage-source-details');
        expect(markup).not.toContain('group-open:rotate-180');
        expect(markup).toContain('1 / 4');
        expect(markup).toContain('Origin: history');
        expect(markup).toContain('Lineage: continued');
        expect(markup).toContain(t('workspacePickerCharacterHint'));
        expect(markup).toContain(t('workspacePickerEditorBaseHint'));
        expect(markup).toContain(t('workspacePickerStageSourceHint'));
    });
});
