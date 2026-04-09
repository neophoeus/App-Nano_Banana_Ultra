import React, { useEffect, useMemo, useRef, useState } from 'react';
import { IMAGE_MODELS, MODEL_CAPABILITIES } from '../constants';
import { Language } from '../utils/translations';
import { AspectRatio, GeneratedImage, ImageModel, ImageSize, ImageStyle, WorkspaceSettingsDraft } from '../types';
import BatchSelector from './BatchSelector';
import Button from './Button';
import InfoTooltip from './InfoTooltip';
import ImageUploader from './ImageUploader';
import RatioSelector from './RatioSelector';
import SizeSelector from './SizeSelector';
import StyleSelector from './StyleSelector';
import WorkspaceModalFrame from './WorkspaceModalFrame';

export type PickerSheet =
    | 'prompt'
    | 'styles'
    | 'settings'
    | 'model'
    | 'ratio'
    | 'size'
    | 'batch'
    | 'references'
    | null;

export type GenerationSettingsSheetVariant = 'full' | 'sketch';

type GenerationSettingsDraft = Pick<WorkspaceSettingsDraft, 'imageModel' | 'aspectRatio' | 'imageSize' | 'batchSize'>;

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
    openStylesSheet: () => void;
    openReferencesSheet: () => void;
    openAdvancedSettings?: () => void;
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
    lockedAspectRatio?: AspectRatio | null;
    settingsDraft?: GenerationSettingsDraft;
    onUpdateSettingsDraft?: React.Dispatch<React.SetStateAction<GenerationSettingsDraft>>;
    onApplySettingsDraft?: () => void;
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
    showStyleEntry?: boolean;
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

const renderClearIcon = () => (
    <svg
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-4 w-4"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
        />
    </svg>
);

export default function WorkspacePickerSheet({
    activePickerSheet,
    activeSheetTitle,
    pickerSheetZIndex,
    prompt,
    setPrompt,
    isEnhancingPrompt,
    closePickerSheet,
    handleSurpriseMe,
    handleSmartRewrite,
    openPromptSheet,
    openStylesSheet,
    openReferencesSheet,
    openAdvancedSettings = () => {},
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
    lockedAspectRatio = null,
    settingsDraft,
    onUpdateSettingsDraft,
    onApplySettingsDraft,
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
    showStyleEntry = true,
}: WorkspacePickerSheetProps) {
    const [localSettingsDraft, setLocalSettingsDraft] = useState<GenerationSettingsDraft>({
        imageModel,
        aspectRatio,
        imageSize,
        batchSize,
    });
    const resolvedSettingsDraft = settingsDraft ?? localSettingsDraft;
    const updateSettingsDraft = onUpdateSettingsDraft ?? setLocalSettingsDraft;
    const [promptDraft, setPromptDraft] = useState(prompt);
    const previousActivePickerSheetRef = useRef<PickerSheet>(null);
    const promptTextareaRef = useRef<HTMLTextAreaElement | null>(null);

    useEffect(() => {
        if (activePickerSheet !== 'settings' || settingsDraft) {
            return;
        }

        setLocalSettingsDraft({
            imageModel,
            aspectRatio,
            imageSize,
            batchSize,
        });
    }, [activePickerSheet, aspectRatio, batchSize, imageModel, imageSize, settingsDraft]);

    const settingsDraftCapability = useMemo(
        () => MODEL_CAPABILITIES[resolvedSettingsDraft.imageModel],
        [resolvedSettingsDraft.imageModel],
    );
    const availableModelOptions = useMemo(
        () =>
            lockedAspectRatio
                ? IMAGE_MODELS.filter((model) => MODEL_CAPABILITIES[model].supportedRatios.includes(lockedAspectRatio))
                : IMAGE_MODELS,
        [lockedAspectRatio],
    );
    const settingsDraftRatioOptions = lockedAspectRatio ? [lockedAspectRatio] : settingsDraftCapability.supportedRatios;
    const activeRatioOptions = lockedAspectRatio ? [lockedAspectRatio] : capability.supportedRatios;

    useEffect(() => {
        if (activePickerSheet !== 'settings' || settingsDraft) {
            return;
        }

        setLocalSettingsDraft((previous) => {
            let nextDraft = previous;

            if (lockedAspectRatio) {
                if (nextDraft.aspectRatio !== lockedAspectRatio) {
                    nextDraft = {
                        ...nextDraft,
                        aspectRatio: lockedAspectRatio,
                    };
                }

                if (!MODEL_CAPABILITIES[nextDraft.imageModel].supportedRatios.includes(lockedAspectRatio)) {
                    nextDraft = {
                        ...nextDraft,
                        imageModel: availableModelOptions[0] || nextDraft.imageModel,
                    };
                }
            }

            const nextDraftCapability = MODEL_CAPABILITIES[nextDraft.imageModel];

            if (!lockedAspectRatio && !nextDraftCapability.supportedRatios.includes(nextDraft.aspectRatio)) {
                nextDraft = {
                    ...nextDraft,
                    aspectRatio: nextDraftCapability.supportedRatios[0] || '1:1',
                };
            }

            if (
                settingsVariant === 'full' &&
                nextDraftCapability.supportedSizes.length > 0 &&
                !nextDraftCapability.supportedSizes.includes(nextDraft.imageSize)
            ) {
                nextDraft = {
                    ...nextDraft,
                    imageSize: nextDraftCapability.supportedSizes[0],
                };
            }

            return nextDraft;
        });
    }, [activePickerSheet, availableModelOptions, lockedAspectRatio, settingsDraft, settingsVariant]);

    useEffect(() => {
        if (activePickerSheet === 'prompt' && previousActivePickerSheetRef.current !== 'prompt') {
            setPromptDraft(prompt);
        }

        previousActivePickerSheetRef.current = activePickerSheet;
    }, [activePickerSheet, prompt]);

    useEffect(() => {
        if (activePickerSheet === 'styles' && !showStyleEntry) {
            closePickerSheet();
        }
    }, [activePickerSheet, closePickerSheet, showStyleEntry]);

    if (!activePickerSheet || (activePickerSheet === 'styles' && !showStyleEntry)) {
        return null;
    }

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
        if (onApplySettingsDraft) {
            onApplySettingsDraft();
            return;
        }

        setImageModel(resolvedSettingsDraft.imageModel);
        setAspectRatio(resolvedSettingsDraft.aspectRatio);

        if (settingsVariant === 'full') {
            if (settingsDraftCapability.supportedSizes.length > 0) {
                setImageSize(resolvedSettingsDraft.imageSize);
            }
            setBatchSize(resolvedSettingsDraft.batchSize);
        }

        closePickerSheet();
    };

    const handleCloseCurrentPickerSheet = () => {
        if (activePickerSheet === 'prompt') {
            setPromptDraft(prompt);
        }

        closePickerSheet();
    };

    const handleApplyPromptDraft = () => {
        setPrompt(promptDraft);
        closePickerSheet();
    };

    const handleClearPromptDraft = () => {
        setPromptDraft('');
        promptTextareaRef.current?.focus();
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
                        <div className="relative mt-3">
                            <textarea
                                ref={promptTextareaRef}
                                data-testid="shared-prompt-input"
                                value={promptDraft}
                                onChange={(event) => setPromptDraft(event.target.value)}
                                className="h-36 w-full rounded-2xl border border-gray-200/80 bg-[linear-gradient(180deg,rgba(255,251,245,0.96),rgba(255,255,255,0.92))] px-3.5 py-2.5 pr-12 text-sm text-gray-800 outline-none transition-colors focus:border-amber-400 dark:border-gray-700/80 dark:bg-[linear-gradient(180deg,rgba(23,28,36,0.94),rgba(14,18,24,0.9))] dark:text-gray-100"
                                placeholder={t('workspacePickerSharedPromptPlaceholder')}
                            />
                            <button
                                type="button"
                                data-testid="shared-prompt-clear"
                                aria-label={t('clear')}
                                title={t('clear')}
                                disabled={promptDraft.length === 0}
                                onClick={handleClearPromptDraft}
                                className="absolute right-3 top-3 rounded-full border border-gray-200/80 bg-white/92 p-2 text-gray-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700/80 dark:bg-gray-950/70 dark:text-gray-500 dark:hover:border-red-900/40 dark:hover:bg-red-950/30 dark:hover:text-red-300"
                            >
                                {renderClearIcon()}
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button
                            data-testid="shared-prompt-apply"
                            onClick={handleApplyPromptDraft}
                            disabled={isEnhancingPrompt}
                        >
                            {t('generationSettingsApply')}
                        </Button>
                    </div>
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
                                {availableModelOptions.map((model) => {
                                    const isActive = model === resolvedSettingsDraft.imageModel;
                                    return (
                                        <button
                                            key={model}
                                            type="button"
                                            onClick={() =>
                                                updateSettingsDraft((previous) => ({
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
                                    selectedRatio={resolvedSettingsDraft.aspectRatio}
                                    onSelect={(nextRatio) =>
                                        updateSettingsDraft((previous) => ({
                                            ...previous,
                                            aspectRatio: nextRatio,
                                        }))
                                    }
                                    currentLanguage={currentLanguage}
                                    supportedRatios={settingsDraftRatioOptions}
                                    disabled={Boolean(lockedAspectRatio)}
                                    label=""
                                />
                            </div>

                            {settingsVariant === 'full' && settingsDraftCapability.supportedSizes.length > 0 ? (
                                <div className="nbu-overlay-card-neutral rounded-[28px] border p-4">
                                    <SizeSelector
                                        selectedSize={resolvedSettingsDraft.imageSize}
                                        onSelect={(nextSize) =>
                                            updateSettingsDraft((previous) => ({
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
                                        batchSize={resolvedSettingsDraft.batchSize}
                                        onSelect={(nextBatchSize) =>
                                            updateSettingsDraft((previous) => ({
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

                    <div className="flex items-center justify-between gap-3">
                        <Button
                            type="button"
                            variant="secondary"
                            className="rounded-[16px]"
                            data-testid="generation-settings-open-advanced"
                            onClick={openAdvancedSettings}
                        >
                            {t('composerToolbarAdvancedSettings')}
                        </Button>

                        <Button
                            type="button"
                            data-testid="generation-settings-apply"
                            onClick={handleApplyGenerationSettings}
                        >
                            {t('generationSettingsApply')}
                        </Button>
                    </div>
                </div>
            );
        }

        if (activePickerSheet === 'model') {
            return (
                <div className="space-y-2">
                    {availableModelOptions.map((model) => {
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
                    supportedRatios={activeRatioOptions}
                    disabled={Boolean(lockedAspectRatio)}
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
            dataTestId="workspace-picker-sheet"
            zIndex={pickerSheetZIndex}
            maxWidthClass="max-w-4xl"
            onClose={handleCloseCurrentPickerSheet}
            closeLabel={t('branchRenameClose')}
            closeButtonTestId="picker-sheet-close"
            title={activeSheetTitle}
            backdropClassName="bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.18),_transparent_34%),rgba(15,23,42,0.74)] backdrop-blur-md"
            panelClassName="nbu-overlay-panel-neutral max-h-[85vh]"
            headerClassName="flex items-center justify-between border-b border-gray-200/80 px-4 py-3.5 dark:border-gray-700/80"
            closeButtonClassName="nbu-control-button px-3 py-1.5 text-[11px] font-semibold"
        >
            <div className="max-h-[calc(85vh-74px)] overflow-y-auto p-4">{renderPickerSheetContent()}</div>
        </WorkspaceModalFrame>
    );
}
