import React, { Suspense, lazy } from 'react';
import { IMAGE_MODELS, MODEL_CAPABILITIES } from '../constants';
import { MAX_DISPLAY_HISTORY, PROMPT_TEMPLATES, PromptHistoryItem } from '../hooks/usePromptHistory';
import { Language } from '../utils/translations';
import { AspectRatio, GeneratedImage, ImageModel, ImageSize, ImageStyle, StageAsset } from '../types';
import Button from './Button';
import BatchSelector from './BatchSelector';
import InfoTooltip from './InfoTooltip';
import ImageUploader from './ImageUploader';
import RatioSelector from './RatioSelector';
import SizeSelector from './SizeSelector';
import StyleSelector from './StyleSelector';
import ThemeToggle from './ThemeToggle';
import WorkspaceModalFrame from './WorkspaceModalFrame';
import WorkspaceSecondaryNav from './WorkspaceSecondaryNav';

const HistoryPanel = lazy(() => import('./HistoryPanel'));
export type PickerSheet =
    | 'prompt'
    | 'history'
    | 'gallery'
    | 'templates'
    | 'styles'
    | 'model'
    | 'ratio'
    | 'size'
    | 'batch'
    | 'references'
    | null;

type WorkspacePickerSheetProps = {
    activePickerSheet: PickerSheet;
    activeSheetTitle: string;
    pickerSheetZIndex: number;
    prompt: string;
    setPrompt: (value: string) => void;
    handleSurpriseMe: () => void;
    handleSmartRewrite: () => void;
    isEnhancingPrompt: boolean;
    closePickerSheet: () => void;
    openPromptSheet: () => void;
    openGallerySheet: () => void;
    openTemplatesSheet: () => void;
    openHistorySheet: () => void;
    openReferencesSheet: () => void;
    promptHistory: PromptHistoryItem[];
    removePrompt: (prompt: string) => void;
    clearPromptHistory: () => void;
    history: GeneratedImage[];
    handleHistorySelect: (item: GeneratedImage) => void;
    handleContinueFromHistoryTurn: (item: GeneratedImage) => void;
    handleBranchFromHistoryTurn: (item: GeneratedImage) => void;
    handleRenameBranch: (item: GeneratedImage) => void;
    isPromotedContinuationSource: (item: GeneratedImage) => boolean;
    getContinueActionLabel: (item: GeneratedImage) => string;
    branchNameOverrides: Record<string, string>;
    selectedHistoryId: string | null;
    currentLanguage: Language;
    handleClearGalleryHistory: () => void;
    t: (key: string) => string;
    imageStyle: ImageStyle;
    setImageStyle: (style: ImageStyle) => void;
    imageModel: ImageModel;
    setImageModel: (model: ImageModel) => void;
    capability: (typeof MODEL_CAPABILITIES)[ImageModel];
    aspectRatio: AspectRatio;
    setAspectRatio: (ratio: AspectRatio) => void;
    imageSize: ImageSize;
    setImageSize: (size: ImageSize) => void;
    batchSize: number;
    setBatchSize: (size: number) => void;
    objectImages: string[];
    characterImages: string[];
    hasSketch: boolean;
    editorBaseAsset: StageAsset | null;
    currentStageAsset: StageAsset | null;
    getStageOriginLabel: (origin?: StageAsset['origin']) => string;
    getLineageActionLabel: (action?: GeneratedImage['lineageAction']) => string;
    handleOpenSketchPad: () => void;
    openUploadDialog: () => void;
    activeViewerImage: string | null;
    handleStageCurrentImageAsEditorBase: () => void;
    handleClearEditorBaseAsset: () => void;
    setObjectImages: (nextImages: string[] | ((prev: string[]) => string[])) => void;
    isGenerating: boolean;
    showNotification: (message: string, type?: 'info' | 'error') => void;
    handleRemoveObjectReference: (index: number) => void;
    setCharacterImages: (nextImages: string[] | ((prev: string[]) => string[])) => void;
    handleRemoveCharacterReference: (index: number) => void;
};

const renderPanelLoadingState = (label: string, className?: string) => (
    <div
        className={
            className ||
            'nbu-overlay-card-neutral rounded-[28px] border border-dashed px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400'
        }
    >
        {label}
    </div>
);

export default function WorkspacePickerSheet({
    activePickerSheet,
    activeSheetTitle,
    pickerSheetZIndex,
    prompt,
    setPrompt,
    handleSurpriseMe,
    handleSmartRewrite,
    isEnhancingPrompt,
    closePickerSheet,
    openPromptSheet,
    openGallerySheet,
    openTemplatesSheet,
    openHistorySheet,
    openReferencesSheet,
    promptHistory,
    removePrompt,
    clearPromptHistory,
    history,
    handleHistorySelect,
    handleContinueFromHistoryTurn,
    handleBranchFromHistoryTurn,
    handleRenameBranch,
    isPromotedContinuationSource,
    getContinueActionLabel,
    branchNameOverrides,
    selectedHistoryId,
    currentLanguage,
    handleClearGalleryHistory,
    t,
    imageStyle,
    setImageStyle,
    imageModel,
    setImageModel,
    capability,
    aspectRatio,
    setAspectRatio,
    imageSize,
    setImageSize,
    batchSize,
    setBatchSize,
    objectImages,
    characterImages,
    hasSketch,
    editorBaseAsset,
    currentStageAsset,
    getStageOriginLabel,
    getLineageActionLabel,
    handleOpenSketchPad,
    openUploadDialog,
    activeViewerImage,
    handleStageCurrentImageAsEditorBase,
    handleClearEditorBaseAsset,
    setObjectImages,
    isGenerating,
    showNotification,
    handleRemoveObjectReference,
    setCharacterImages,
    handleRemoveCharacterReference,
}: WorkspacePickerSheetProps) {
    if (!activePickerSheet) {
        return null;
    }

    const secondaryNavItems = [
        {
            id: 'prompt',
            label: t('promptLabel'),
            onClick: openPromptSheet,
            isActive: activePickerSheet === 'prompt',
        },
        {
            id: 'gallery',
            label: t('workspaceSheetTitleGallery'),
            onClick: openGallerySheet,
            isActive: activePickerSheet === 'gallery',
        },
        {
            id: 'history',
            label: t('workspacePickerPromptHistoryTitle'),
            onClick: openHistorySheet,
            isActive: activePickerSheet === 'history',
        },
        {
            id: 'templates',
            label: t('templates'),
            onClick: openTemplatesSheet,
            isActive: activePickerSheet === 'templates',
        },
        {
            id: 'references',
            label: t('workspaceSheetTitleReferences'),
            onClick: openReferencesSheet,
            isActive: activePickerSheet === 'references',
        },
    ];

    const getModelLabel = (model: ImageModel) => {
        if (model === 'gemini-3.1-flash-image-preview') {
            return t('modelGemini31Flash');
        }
        if (model === 'gemini-3-pro-image-preview') {
            return t('modelGemini3Pro');
        }
        return t('modelGemini25Flash');
    };

    const getModelSupportLabel = (model: ImageModel) => {
        if (MODEL_CAPABILITIES[model].supportsImageSearch) {
            return t('workspacePickerModelSupportImageSearch');
        }
        if (MODEL_CAPABILITIES[model].supportsGoogleSearch) {
            return t('workspacePickerModelSupportGoogleSearch');
        }
        return t('workspacePickerModelSupportImageOnly');
    };

    const renderPickerSheetContent = () => {
        if (activePickerSheet === 'prompt') {
            return (
                <div className="space-y-4">
                    <div className="nbu-overlay-card-neutral rounded-3xl border p-4">
                        <label className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                            {t('workspacePickerSharedPrompt')}
                        </label>
                        <textarea
                            data-testid="shared-prompt-input"
                            value={prompt}
                            onChange={(event) => setPrompt(event.target.value)}
                            className="mt-3 h-40 w-full rounded-2xl border border-gray-200/80 bg-[linear-gradient(180deg,rgba(255,251,245,0.96),rgba(255,255,255,0.92))] px-4 py-3 text-sm text-gray-800 outline-none transition-colors focus:border-amber-400 dark:border-gray-700/80 dark:bg-[linear-gradient(180deg,rgba(23,28,36,0.94),rgba(14,18,24,0.9))] dark:text-gray-100"
                            placeholder={t('workspacePickerSharedPromptPlaceholder')}
                        />
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" onClick={handleSurpriseMe} disabled={isEnhancingPrompt}>
                            {t('workspacePickerInspiration')}
                        </Button>
                        <Button variant="secondary" onClick={handleSmartRewrite} disabled={isEnhancingPrompt}>
                            {t('rewrite')}
                        </Button>
                        <Button variant="secondary" onClick={openTemplatesSheet}>
                            {t('templates')}
                        </Button>
                        <Button variant="secondary" onClick={openHistorySheet}>
                            {t('workspacePickerPromptHistoryTitle')}
                        </Button>
                    </div>
                </div>
            );
        }

        if (activePickerSheet === 'history') {
            return (
                <div className="space-y-2">
                    {promptHistory.length === 0 && (
                        <div className="nbu-overlay-card-neutral rounded-2xl border border-dashed px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                            {t('workspacePickerNoSavedPrompts')}
                        </div>
                    )}
                    {promptHistory.slice(0, MAX_DISPLAY_HISTORY).map((item, index) => (
                        <div
                            key={`${item.usedAt}-${index}`}
                            className="nbu-overlay-card-neutral flex items-center gap-2 rounded-2xl border px-3 py-3"
                        >
                            <button
                                onClick={() => {
                                    setPrompt(item.text);
                                    closePickerSheet();
                                }}
                                className="flex-1 text-left text-sm text-gray-700 dark:text-gray-200"
                            >
                                {item.text}
                            </button>
                            <button
                                onClick={() => removePrompt(item.text)}
                                className="rounded-lg px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                            >
                                {t('workspacePickerRemovePrompt')}
                            </button>
                        </div>
                    ))}
                    {promptHistory.length > 0 && (
                        <button
                            onClick={() => {
                                clearPromptHistory();
                                closePickerSheet();
                            }}
                            className="w-full rounded-2xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-950/30"
                        >
                            {t('workspacePickerClearPromptHistory')}
                        </button>
                    )}
                </div>
            );
        }

        if (activePickerSheet === 'gallery') {
            return history.length > 0 ? (
                <Suspense fallback={renderPanelLoadingState(t('workspacePickerLoading'))}>
                    <HistoryPanel
                        history={history}
                        onSelect={(item) => {
                            handleHistorySelect(item);
                            closePickerSheet();
                        }}
                        onRenameBranch={handleRenameBranch}
                        isPromotedContinuationSource={isPromotedContinuationSource}
                        getContinueActionLabel={getContinueActionLabel}
                        branchNameOverrides={branchNameOverrides}
                        selectedId={selectedHistoryId || undefined}
                        currentLanguage={currentLanguage}
                        onClear={handleClearGalleryHistory}
                        title={t('workspacePickerFullGallery')}
                    />
                </Suspense>
            ) : (
                <div className="nbu-overlay-card-neutral rounded-2xl border border-dashed px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                    {t('workspacePickerEmptyGallery')}
                </div>
            );
        }

        if (activePickerSheet === 'templates') {
            return (
                <div className="grid gap-2 md:grid-cols-2">
                    {PROMPT_TEMPLATES.map((template) => (
                        <button
                            key={template.id}
                            onClick={() => {
                                setPrompt(
                                    template.promptKey ? t(template.promptKey) || template.prompt : template.prompt,
                                );
                                closePickerSheet();
                            }}
                            className="nbu-overlay-card-neutral rounded-2xl border px-4 py-4 text-left transition-colors hover:border-amber-400 hover:bg-amber-50 dark:hover:border-amber-500/40 dark:hover:bg-amber-950/20"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-xl">{template.icon}</span>
                                <div>
                                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                                        {t(template.labelKey) || template.label}
                                    </div>
                                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                        {template.prompt.slice(0, 96)}...
                                    </div>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            );
        }

        if (activePickerSheet === 'styles') {
            return (
                <StyleSelector
                    selectedStyle={imageStyle}
                    onSelect={(style) => {
                        setImageStyle(style);
                        closePickerSheet();
                    }}
                    currentLanguage={currentLanguage}
                    label=""
                    className="max-h-[65vh]"
                />
            );
        }

        if (activePickerSheet === 'model') {
            return (
                <div className="space-y-2">
                    {IMAGE_MODELS.map((model) => {
                        const isActive = model === imageModel;
                        return (
                            <button
                                key={model}
                                onClick={() => {
                                    setImageModel(model);
                                    closePickerSheet();
                                }}
                                className={`w-full rounded-2xl border px-4 py-4 text-left transition-colors ${isActive ? 'border-amber-500 bg-amber-50 text-amber-700 dark:border-amber-500 dark:bg-amber-950/30 dark:text-amber-200' : 'nbu-overlay-card-neutral text-gray-800 hover:border-gray-300 dark:text-gray-200 dark:hover:border-gray-700'}`}
                            >
                                <div className="font-semibold">{getModelLabel(model)}</div>
                                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    {getModelSupportLabel(model)}
                                </div>
                            </button>
                        );
                    })}
                </div>
            );
        }

        if (activePickerSheet === 'ratio') {
            return (
                <RatioSelector
                    selectedRatio={aspectRatio}
                    onSelect={(ratio) => {
                        setAspectRatio(ratio);
                        closePickerSheet();
                    }}
                    currentLanguage={currentLanguage}
                    supportedRatios={capability.supportedRatios}
                    label=""
                />
            );
        }

        if (activePickerSheet === 'size') {
            return (
                <SizeSelector
                    selectedSize={imageSize}
                    onSelect={(size) => {
                        setImageSize(size);
                        closePickerSheet();
                    }}
                    currentLanguage={currentLanguage}
                    supportedSizes={capability.supportedSizes.length > 0 ? capability.supportedSizes : undefined}
                    label=""
                />
            );
        }

        if (activePickerSheet === 'batch') {
            return (
                <BatchSelector
                    batchSize={batchSize}
                    onSelect={(size) => {
                        setBatchSize(size);
                        closePickerSheet();
                    }}
                    currentLanguage={currentLanguage}
                    label=""
                />
            );
        }

        if (activePickerSheet === 'references') {
            return (
                <div className="space-y-5">
                    <div className="grid gap-3 md:grid-cols-3">
                        <div className="nbu-overlay-card-neutral rounded-2xl border px-4 py-3 text-sm">
                            <div className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                                {t('workspacePickerObjects')}
                            </div>
                            <div className="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                                {objectImages.length} / {capability.maxObjects}
                            </div>
                            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {hasSketch ? t('workspacePickerHasSketchAsset') : t('workspacePickerNoSketchAsset')}
                            </div>
                        </div>
                        <div
                            data-testid="picker-references-character-card"
                            className="nbu-overlay-card-neutral rounded-2xl border px-4 py-3 text-sm"
                        >
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                                    <span>{t('workspacePickerCharacters')}</span>
                                    <InfoTooltip
                                        dataTestId="picker-references-character-hint"
                                        buttonLabel={t('workspacePickerCharacterHint')}
                                        content={t('workspacePickerCharacterHint')}
                                    />
                                </div>
                                <div className="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    {characterImages.length} / {capability.maxCharacters}
                                </div>
                            </div>
                        </div>
                        <div
                            data-testid="picker-references-editor-base-card"
                            className="nbu-overlay-card-neutral rounded-2xl border px-4 py-3 text-sm"
                        >
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                                    <span>{t('workspacePickerEditorBase')}</span>
                                    <InfoTooltip
                                        dataTestId="picker-references-editor-base-hint"
                                        buttonLabel={t('workspacePickerEditorBaseHint')}
                                        content={t('workspacePickerEditorBaseHint')}
                                    />
                                </div>
                                <div className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    {editorBaseAsset
                                        ? getStageOriginLabel(editorBaseAsset.origin)
                                        : t('stageOriginNotStaged')}
                                </div>
                            </div>
                        </div>
                        <div
                            data-testid="picker-references-stage-source-card"
                            className="nbu-overlay-card-neutral rounded-2xl border px-4 py-3 text-sm md:col-span-3"
                        >
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                                    <span>{t('workspacePickerStageSource')}</span>
                                    <InfoTooltip
                                        dataTestId="picker-references-stage-source-hint"
                                        buttonLabel={t('workspacePickerStageSourceHint')}
                                        content={t('workspacePickerStageSourceHint')}
                                    />
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-900 dark:text-gray-100">
                                    <span className="rounded-full border border-gray-200 px-2.5 py-1 text-xs dark:border-gray-700">
                                        {getStageOriginLabel(currentStageAsset?.origin)}
                                    </span>
                                    {currentStageAsset?.sourceHistoryId && (
                                        <span className="rounded-full border border-gray-200 px-2.5 py-1 text-xs dark:border-gray-700">
                                            {t('workspacePickerHistoryLinked')}
                                        </span>
                                    )}
                                    {currentStageAsset?.lineageAction && (
                                        <span className="rounded-full border border-gray-200 px-2.5 py-1 text-xs dark:border-gray-700">
                                            {getLineageActionLabel(currentStageAsset.lineageAction)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="secondary" onClick={handleOpenSketchPad}>
                            {t('workspacePickerOpenSketchPad')}
                        </Button>
                        <Button variant="secondary" onClick={openUploadDialog}>
                            {t('workspacePickerUploadBaseImage')}
                        </Button>
                        {activeViewerImage && (
                            <Button variant="secondary" onClick={handleStageCurrentImageAsEditorBase}>
                                {t('workspacePickerUseCurrentStageAsEditorBase')}
                            </Button>
                        )}
                        {editorBaseAsset && (
                            <Button variant="secondary" onClick={handleClearEditorBaseAsset}>
                                {t('workspacePickerClearEditorBase')}
                            </Button>
                        )}
                    </div>

                    <ImageUploader
                        images={objectImages}
                        onImagesChange={setObjectImages}
                        disabled={isGenerating}
                        label={t('objectRefs')}
                        currentLanguage={currentLanguage}
                        onWarning={(msg) => showNotification(msg, 'error')}
                        maxImages={capability.maxObjects}
                        prefixTag="Obj"
                        safeLimit={Math.max(1, Math.floor(capability.maxObjects / 2))}
                        onRemove={handleRemoveObjectReference}
                    />

                    {capability.maxCharacters > 0 && (
                        <ImageUploader
                            images={characterImages}
                            onImagesChange={setCharacterImages}
                            disabled={isGenerating}
                            label={t('characterRefs')}
                            currentLanguage={currentLanguage}
                            onWarning={(msg) => showNotification(msg, 'error')}
                            maxImages={capability.maxCharacters}
                            prefixTag="Char"
                            safeLimit={Math.max(1, Math.floor(capability.maxCharacters / 2))}
                            onRemove={handleRemoveCharacterReference}
                        />
                    )}
                </div>
            );
        }

        return renderPanelLoadingState(t('workspacePickerLoading'));
    };

    return (
        <WorkspaceModalFrame
            zIndex={pickerSheetZIndex}
            maxWidthClass="max-w-4xl"
            onClose={closePickerSheet}
            closeLabel={t('branchRenameClose')}
            closeButtonTestId="picker-sheet-close"
            title={activeSheetTitle}
            headerExtra={
                <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
                    <WorkspaceSecondaryNav items={secondaryNavItems} className="min-w-0 flex-1" />
                    <ThemeToggle currentLanguage={currentLanguage} className="h-9 w-9" />
                </div>
            }
            backdropClassName="bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.18),_transparent_34%),rgba(15,23,42,0.74)] backdrop-blur-md"
            panelClassName="nbu-overlay-panel-neutral max-h-[85vh]"
            headerClassName="flex items-center justify-between border-b border-gray-200/80 px-5 py-4 dark:border-gray-700/80"
            closeButtonClassName="nbu-control-button px-3 py-2 text-sm"
        >
            <div className="max-h-[calc(85vh-80px)] overflow-y-auto p-5">{renderPickerSheetContent()}</div>
        </WorkspaceModalFrame>
    );
}
