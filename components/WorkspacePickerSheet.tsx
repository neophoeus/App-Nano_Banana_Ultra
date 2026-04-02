import React, { useEffect, useMemo, useState } from 'react';
import { IMAGE_MODELS, MODEL_CAPABILITIES } from '../constants';
import { MAX_DISPLAY_HISTORY, PROMPT_TEMPLATES, PromptHistoryItem } from '../hooks/usePromptHistory';
import { Language } from '../utils/translations';
import { AspectRatio, GeneratedImage, ImageModel, ImageSize, ImageStyle } from '../types';
import BatchSelector from './BatchSelector';
import Button from './Button';
import InfoTooltip from './InfoTooltip';
import ImageUploader from './ImageUploader';
import RatioSelector from './RatioSelector';
import SizeSelector from './SizeSelector';
import StyleSelector from './StyleSelector';
import ThemeToggle from './ThemeToggle';
import WorkspaceModalFrame from './WorkspaceModalFrame';
import WorkspaceSecondaryNav from './WorkspaceSecondaryNav';

export type PickerSheet =
    | 'prompt'
    | 'history'
    | 'templates'
    | 'styles'
    | 'settings'
    | 'model'
    | 'ratio'
    | 'size'
    | 'batch'
    | 'references'
    | null;

export type GenerationSettingsSheetVariant = 'full' | 'sketch';

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
    openTemplatesSheet: () => void;
    openHistorySheet: () => void;
    openStylesSheet: () => void;
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
    settingsVariant: GenerationSettingsSheetVariant;
    objectImages: string[];
    characterImages: string[];
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
    openTemplatesSheet,
    openHistorySheet,
    openStylesSheet,
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
    settingsVariant,
    objectImages,
    characterImages,
    setObjectImages,
    isGenerating,
    showNotification,
    handleRemoveObjectReference,
    setCharacterImages,
    handleRemoveCharacterReference,
}: WorkspacePickerSheetProps) {
    const [settingsDraft, setSettingsDraft] = useState({
        imageModel,
        aspectRatio,
        imageSize,
        batchSize,
    });

    useEffect(() => {
        if (activePickerSheet !== 'settings') {
            return;
        }

        setSettingsDraft({
            imageModel,
            aspectRatio,
            imageSize,
            batchSize,
        });
    }, [activePickerSheet, aspectRatio, batchSize, imageModel, imageSize]);

    const settingsDraftCapability = useMemo(
        () => MODEL_CAPABILITIES[settingsDraft.imageModel],
        [settingsDraft.imageModel],
    );

    useEffect(() => {
        if (activePickerSheet !== 'settings') {
            return;
        }

        setSettingsDraft((previous) => {
            let nextDraft = previous;

            if (!settingsDraftCapability.supportedRatios.includes(previous.aspectRatio)) {
                nextDraft = {
                    ...nextDraft,
                    aspectRatio: settingsDraftCapability.supportedRatios[0] || '1:1',
                };
            }

            if (
                settingsVariant === 'full' &&
                settingsDraftCapability.supportedSizes.length > 0 &&
                !settingsDraftCapability.supportedSizes.includes(previous.imageSize)
            ) {
                nextDraft = {
                    ...nextDraft,
                    imageSize: settingsDraftCapability.supportedSizes[0],
                };
            }

            return nextDraft;
        });
    }, [activePickerSheet, settingsDraftCapability, settingsVariant]);

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
            id: 'styles',
            label: t('workspaceSheetTitleStyles'),
            onClick: openStylesSheet,
            isActive: activePickerSheet === 'styles',
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

    const getModelTitleLabel = (model: ImageModel) => getModelLabel(model).replace(` (${model})`, '');

    const getModelSupportLabel = (model: ImageModel) => {
        if (MODEL_CAPABILITIES[model].supportsImageSearch) {
            return t('workspacePickerModelSupportImageSearch');
        }
        if (MODEL_CAPABILITIES[model].supportsGoogleSearch) {
            return t('workspacePickerModelSupportGoogleSearch');
        }
        return t('workspacePickerModelSupportImageOnly');
    };

    const handleApplyGenerationSettings = () => {
        setImageModel(settingsDraft.imageModel);
        setAspectRatio(settingsDraft.aspectRatio);

        if (settingsVariant === 'full') {
            if (settingsDraftCapability.supportedSizes.length > 0) {
                setImageSize(settingsDraft.imageSize);
            }
            setBatchSize(settingsDraft.batchSize);
        }

        closePickerSheet();
    };

    const renderModelOptionContent = (model: ImageModel) => (
        <>
            <div className="font-semibold leading-tight">{getModelTitleLabel(model)}</div>
            <div className="mt-1 text-xs font-semibold leading-tight opacity-80">{model}</div>
            <div className="mt-2 text-[11px] leading-5 text-gray-500 dark:text-gray-400">
                {getModelSupportLabel(model)}
            </div>
        </>
    );

    const renderPickerSheetContent = () => {
        if (activePickerSheet === 'prompt') {
            return (
                <div className="space-y-4">
                    <div className="nbu-overlay-card-neutral rounded-3xl border p-3">
                        <label className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                            {t('workspacePickerSharedPrompt')}
                        </label>
                        <textarea
                            data-testid="shared-prompt-input"
                            value={prompt}
                            onChange={(event) => setPrompt(event.target.value)}
                            className="mt-3 h-36 w-full rounded-2xl border border-gray-200/80 bg-[linear-gradient(180deg,rgba(255,251,245,0.96),rgba(255,255,255,0.92))] px-3.5 py-2.5 text-sm text-gray-800 outline-none transition-colors focus:border-amber-400 dark:border-gray-700/80 dark:bg-[linear-gradient(180deg,rgba(23,28,36,0.94),rgba(14,18,24,0.9))] dark:text-gray-100"
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
                        <Button variant="secondary" onClick={openStylesSheet}>
                            {t('workspaceSheetTitleStyles')}
                        </Button>
                    </div>
                </div>
            );
        }

        if (activePickerSheet === 'history') {
            return (
                <div className="space-y-2">
                    {promptHistory.length === 0 && (
                        <div className="nbu-overlay-card-neutral rounded-2xl border border-dashed px-3 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
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

        if (activePickerSheet === 'settings') {
            return (
                <div data-testid="workspace-generation-settings-sheet" className="space-y-4">
                    <div className="flex flex-col gap-4 lg:flex-row">
                        <div
                            data-testid="workspace-generation-settings-model-pane"
                            className="nbu-overlay-card-neutral w-full rounded-[28px] border p-4 lg:w-[320px] lg:shrink-0"
                        >
                            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                                {t('modelSelect')}
                            </div>
                            <div className="mt-3 space-y-2">
                                {IMAGE_MODELS.map((model) => {
                                    const isActive = model === settingsDraft.imageModel;
                                    return (
                                        <button
                                            key={model}
                                            type="button"
                                            onClick={() =>
                                                setSettingsDraft((previous) => ({
                                                    ...previous,
                                                    imageModel: model,
                                                }))
                                            }
                                            className={`w-full rounded-2xl border px-4 py-4 text-left transition-colors ${
                                                isActive
                                                    ? 'border-amber-500 bg-amber-50 text-amber-700 dark:border-amber-500 dark:bg-amber-950/30 dark:text-amber-200'
                                                    : 'nbu-overlay-card-neutral text-gray-800 hover:border-gray-300 dark:text-gray-200 dark:hover:border-gray-700'
                                            }`}
                                        >
                                            {renderModelOptionContent(model)}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div
                            data-testid="workspace-generation-settings-controls-pane"
                            className="flex min-w-0 flex-1 flex-col gap-4"
                        >
                            <div className="nbu-overlay-card-neutral rounded-[28px] border p-4">
                                <RatioSelector
                                    selectedRatio={settingsDraft.aspectRatio}
                                    onSelect={(nextRatio) =>
                                        setSettingsDraft((previous) => ({
                                            ...previous,
                                            aspectRatio: nextRatio,
                                        }))
                                    }
                                    currentLanguage={currentLanguage}
                                    supportedRatios={settingsDraftCapability.supportedRatios}
                                    label=""
                                />
                            </div>

                            {settingsVariant === 'full' && settingsDraftCapability.supportedSizes.length > 0 ? (
                                <div className="nbu-overlay-card-neutral rounded-[28px] border p-4">
                                    <SizeSelector
                                        selectedSize={settingsDraft.imageSize}
                                        onSelect={(nextSize) =>
                                            setSettingsDraft((previous) => ({
                                                ...previous,
                                                imageSize: nextSize,
                                            }))
                                        }
                                        currentLanguage={currentLanguage}
                                        supportedSizes={settingsDraftCapability.supportedSizes}
                                        label=""
                                    />
                                </div>
                            ) : null}

                            {settingsVariant === 'full' ? (
                                <div className="nbu-overlay-card-neutral rounded-[28px] border p-4">
                                    <BatchSelector
                                        batchSize={settingsDraft.batchSize}
                                        onSelect={(nextBatchSize) =>
                                            setSettingsDraft((previous) => ({
                                                ...previous,
                                                batchSize: nextBatchSize,
                                            }))
                                        }
                                        currentLanguage={currentLanguage}
                                        label=""
                                    />
                                </div>
                            ) : null}
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button data-testid="generation-settings-apply" onClick={handleApplyGenerationSettings}>
                            {t('generationSettingsApply')}
                        </Button>
                    </div>
                </div>
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
                                {renderModelOptionContent(model)}
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
                <div className="space-y-4">
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
                activePickerSheet === 'settings' ? undefined : (
                    <div className="mt-3 flex flex-wrap items-start justify-between gap-2.5">
                        <WorkspaceSecondaryNav items={secondaryNavItems} className="min-w-0 flex-1" />
                        <ThemeToggle currentLanguage={currentLanguage} className="h-8 w-8 shadow-none" />
                    </div>
                )
            }
            backdropClassName="bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.18),_transparent_34%),rgba(15,23,42,0.74)] backdrop-blur-md"
            panelClassName="nbu-overlay-panel-neutral max-h-[85vh]"
            headerClassName="flex items-center justify-between border-b border-gray-200/80 px-4 py-3.5 dark:border-gray-700/80"
            closeButtonClassName="nbu-control-button px-3 py-1.5 text-[11px] font-semibold"
        >
            <div className="max-h-[calc(85vh-74px)] overflow-y-auto p-4">{renderPickerSheetContent()}</div>
        </WorkspaceModalFrame>
    );
}
