import { useEffect, useState } from 'react';
import {
    getOutputFormatLabelKey,
    getThinkingLevelLabelKey,
    MODEL_CAPABILITIES,
    OUTPUT_FORMATS,
    THINKING_LEVELS,
} from '../constants';
import {
    DEFAULT_SAFETY_THRESHOLDS,
    GroundingMode,
    ImageModel,
    OutputFormat,
    SAFETY_CATEGORY_KEYS,
    SAFETY_THRESHOLD_KEYS,
    type SafetyCategoryKey,
    type SafetyThresholdKey,
    type SafetyThresholds,
    ThinkingLevel,
} from '../types';
import { getGroundingModeTranslationKey } from '../utils/groundingMode';
import { DEFAULT_TEMPERATURE, formatTemperature, normalizeTemperature, TEMPERATURE_STEP } from '../utils/temperature';
import { getTranslation, Language } from '../utils/translations';
import InfoTooltip from './InfoTooltip';

const SAFETY_CATEGORY_LABEL_KEYS: Record<SafetyCategoryKey, string> = {
    harassment: 'generationFailureValueSafetyCategoryHarassment',
    'hate-speech': 'generationFailureValueSafetyCategoryHateSpeech',
    'sexually-explicit': 'generationFailureValueSafetyCategorySexuallyExplicit',
    'dangerous-content': 'generationFailureValueSafetyCategoryDangerousContent',
};

const SAFETY_THRESHOLD_LABEL_KEYS: Record<SafetyThresholdKey, string> = {
    default: 'composerAdvancedSafetyThresholdDefault',
    off: 'composerAdvancedSafetyThresholdOff',
    'block-none': 'composerAdvancedSafetyThresholdBlockNone',
    'block-only-high': 'composerAdvancedSafetyThresholdBlockOnlyHigh',
    'block-medium-and-above': 'composerAdvancedSafetyThresholdBlockMediumAndAbove',
    'block-low-and-above': 'composerAdvancedSafetyThresholdBlockLowAndAbove',
};

type ComposerAdvancedSettingsContentProps = {
    currentLanguage: Language;
    outputFormat: OutputFormat;
    thinkingLevel: ThinkingLevel;
    groundingMode: GroundingMode;
    safetyThresholds: SafetyThresholds;
    imageModel: ImageModel;
    capability: (typeof MODEL_CAPABILITIES)[ImageModel];
    availableGroundingModes: GroundingMode[];
    temperature: number;
    onOutputFormatChange: (value: OutputFormat) => void;
    onTemperatureChange: (value: number) => void;
    onThinkingLevelChange: (value: ThinkingLevel) => void;
    onGroundingModeChange: (value: GroundingMode) => void;
    onSafetyThresholdsChange: (value: SafetyThresholds) => void;
};

export default function ComposerAdvancedSettingsContent({
    currentLanguage,
    outputFormat,
    thinkingLevel,
    groundingMode,
    safetyThresholds,
    imageModel,
    capability,
    availableGroundingModes,
    temperature,
    onOutputFormatChange,
    onTemperatureChange,
    onThinkingLevelChange,
    onGroundingModeChange,
    onSafetyThresholdsChange,
}: ComposerAdvancedSettingsContentProps) {
    const t = (key: string) => getTranslation(currentLanguage, key);
    const supportsThinkingLevelControl = capability.thinkingLevels.some((level) => level !== 'disabled');
    const hasImageSearchGroundingOption = availableGroundingModes.some(
        (mode) => mode === 'image-search' || mode === 'google-search-plus-image-search',
    );
    const hasSafetyOverrides = SAFETY_CATEGORY_KEYS.some(
        (categoryKey) => safetyThresholds[categoryKey] !== DEFAULT_SAFETY_THRESHOLDS[categoryKey],
    );
    const hasGroundingCard = availableGroundingModes.length > 1;
    const renderSafetyInPrimaryColumn = !hasGroundingCard;
    const renderSafetyInSecondaryColumn = hasGroundingCard;
    const hasLeftColumnContent =
        capability.outputFormats.length > 1 ||
        supportsThinkingLevelControl ||
        capability.supportsTemperature ||
        renderSafetyInPrimaryColumn;
    const hasRightColumnContent = hasGroundingCard;
    const showGroundingResolutionWarning =
        imageModel === 'gemini-3.1-flash-image' &&
        (groundingMode === 'image-search' || groundingMode === 'google-search-plus-image-search');
    const firstSafetyThreshold = safetyThresholds[SAFETY_CATEGORY_KEYS[0]];
    const allSafetyThresholdsMatch = SAFETY_CATEGORY_KEYS.every(
        (categoryKey) => safetyThresholds[categoryKey] === firstSafetyThreshold,
    );
    const allSafetySliderValue = allSafetyThresholdsMatch
        ? SAFETY_THRESHOLD_KEYS.indexOf(firstSafetyThreshold)
        : SAFETY_THRESHOLD_KEYS.indexOf(DEFAULT_SAFETY_THRESHOLDS.harassment);
    const [isSafetyPanelOpen, setIsSafetyPanelOpen] = useState(hasSafetyOverrides);
    const layoutClassName =
        hasLeftColumnContent && hasRightColumnContent
            ? 'grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'
            : 'space-y-4';
    const cardClassName = 'nbu-soft-well space-y-4 p-4';
    const cardLabelClassName =
        'block text-[10px] font-black uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400';
    const temperatureTipsContent = (
        <div className="space-y-2">
            <div>{t('composerAdvancedTemperatureGuideHigher')}</div>
            <div>{t('composerAdvancedTemperatureGuideLower')}</div>
        </div>
    );

    useEffect(() => {
        if (hasSafetyOverrides) {
            setIsSafetyPanelOpen(true);
        }
    }, [hasSafetyOverrides]);

    const handleSafetyThresholdChange = (categoryKey: SafetyCategoryKey, thresholdKey: SafetyThresholdKey) => {
        onSafetyThresholdsChange({
            ...safetyThresholds,
            [categoryKey]: thresholdKey,
        });
    };

    const handleAllSafetyThresholdsChange = (thresholdKey: SafetyThresholdKey) => {
        const nextThresholds = { ...safetyThresholds };

        SAFETY_CATEGORY_KEYS.forEach((categoryKey) => {
            nextThresholds[categoryKey] = thresholdKey;
        });

        onSafetyThresholdsChange(nextThresholds);
    };

    const renderSafetyCard = () => (
        <section
            data-testid="composer-advanced-safety-card"
            className={`${cardClassName} border border-slate-200/80 bg-slate-50/70 dark:border-slate-700/80 dark:bg-slate-950/40`}
        >
            <button
                type="button"
                data-testid="composer-advanced-safety-toggle"
                aria-expanded={isSafetyPanelOpen}
                onClick={() => setIsSafetyPanelOpen((previous) => !previous)}
                className="flex w-full items-center justify-between gap-3 text-left"
            >
                <div className="space-y-1">
                    <div className={cardLabelClassName}>{t('composerAdvancedSafetyTitle')}</div>
                    <div className="text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                        {t('composerAdvancedSafetyNote')}
                    </div>
                </div>
                <span className="rounded-full border border-slate-200 bg-white/85 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200">
                    {isSafetyPanelOpen ? '-' : '+'}
                </span>
            </button>

            {isSafetyPanelOpen && (
                <div data-testid="composer-advanced-safety-panel" className="space-y-4">
                    <div className="space-y-2 rounded-2xl border border-slate-200/80 bg-white/75 p-3 dark:border-slate-700/80 dark:bg-slate-900/60">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                                {t('composerAdvancedSafetyAllLabel')}
                            </span>
                            <span
                                data-testid="composer-advanced-safety-sync-value"
                                className="rounded-full border border-slate-200 bg-white/85 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200"
                            >
                                {allSafetyThresholdsMatch
                                    ? t(SAFETY_THRESHOLD_LABEL_KEYS[firstSafetyThreshold])
                                    : t('composerAdvancedSafetyMixed')}
                            </span>
                        </div>
                        <input
                            data-testid="composer-advanced-safety-sync-slider"
                            type="range"
                            min="0"
                            max={String(SAFETY_THRESHOLD_KEYS.length - 1)}
                            step="1"
                            value={allSafetySliderValue >= 0 ? allSafetySliderValue : 0}
                            onChange={(event) => {
                                const nextThreshold = SAFETY_THRESHOLD_KEYS[Number(event.target.value)] || 'default';
                                handleAllSafetyThresholdsChange(nextThreshold);
                            }}
                            className="w-full"
                        />
                    </div>

                    {SAFETY_CATEGORY_KEYS.map((categoryKey) => {
                        const sliderValue = SAFETY_THRESHOLD_KEYS.indexOf(safetyThresholds[categoryKey]);

                        return (
                            <div key={categoryKey} className="space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                        {t(SAFETY_CATEGORY_LABEL_KEYS[categoryKey])}
                                    </span>
                                    <span
                                        data-testid={`composer-advanced-safety-value-${categoryKey}`}
                                        className="rounded-full border border-slate-200 bg-white/85 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200"
                                    >
                                        {t(SAFETY_THRESHOLD_LABEL_KEYS[safetyThresholds[categoryKey]])}
                                    </span>
                                </div>
                                <input
                                    data-testid={`composer-advanced-safety-slider-${categoryKey}`}
                                    type="range"
                                    min="0"
                                    max={String(SAFETY_THRESHOLD_KEYS.length - 1)}
                                    step="1"
                                    value={sliderValue >= 0 ? sliderValue : 0}
                                    onChange={(event) => {
                                        const nextThreshold =
                                            SAFETY_THRESHOLD_KEYS[Number(event.target.value)] || 'default';
                                        handleSafetyThresholdChange(categoryKey, nextThreshold);
                                    }}
                                    className="w-full"
                                />
                            </div>
                        );
                    })}

                    <div className="grid grid-cols-6 gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
                        {SAFETY_THRESHOLD_KEYS.map((thresholdKey) => (
                            <span key={thresholdKey} className="text-center">
                                {t(SAFETY_THRESHOLD_LABEL_KEYS[thresholdKey])}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );

    return (
        <div data-testid="composer-advanced-layout" className={layoutClassName}>
            {hasLeftColumnContent && (
                <div data-testid="composer-advanced-primary-column" className="space-y-4">
                    {capability.outputFormats.length > 1 && (
                        <section data-testid="composer-advanced-output-format-card" className={cardClassName}>
                            <label className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
                                <span className={cardLabelClassName}>
                                    {t('groundingProvenanceInsightOutputFormat')}
                                </span>
                                <select
                                    data-testid="composer-advanced-output-format"
                                    value={outputFormat}
                                    onChange={(event) => onOutputFormatChange(event.target.value as OutputFormat)}
                                    className="nbu-input-surface w-full px-4 py-3"
                                >
                                    {OUTPUT_FORMATS.filter((option) =>
                                        capability.outputFormats.includes(option.value),
                                    ).map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {t(getOutputFormatLabelKey(option.value))}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </section>
                    )}

                    {supportsThinkingLevelControl && (
                        <section data-testid="composer-advanced-thinking-level-card" className={cardClassName}>
                            <label className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
                                <span className={cardLabelClassName}>
                                    {t('groundingProvenanceInsightThinkingLevel')}
                                </span>
                                <select
                                    value={thinkingLevel}
                                    onChange={(event) => onThinkingLevelChange(event.target.value as ThinkingLevel)}
                                    className="nbu-input-surface w-full px-4 py-3"
                                >
                                    {THINKING_LEVELS.filter((option) =>
                                        capability.thinkingLevels.includes(option.value),
                                    ).map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {t(getThinkingLevelLabelKey(option.value))}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </section>
                    )}

                    {capability.supportsTemperature && (
                        <section data-testid="composer-advanced-temperature-card" className={cardClassName}>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex min-w-0 flex-wrap items-center gap-2">
                                    <span className={cardLabelClassName}>
                                        {t('groundingProvenanceInsightTemperature')}
                                    </span>
                                    <span className="rounded-full border border-gray-200 bg-white/80 px-2 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-gray-500 dark:border-gray-700 dark:bg-gray-900/70 dark:text-gray-300">
                                        {t('composerDefaultTemp').replace(
                                            '{0}',
                                            `= ${formatTemperature(DEFAULT_TEMPERATURE)}`,
                                        )}
                                    </span>
                                </div>
                                <InfoTooltip
                                    dataTestId="composer-advanced-temperature-guide-hint"
                                    buttonLabel={t('groundingProvenanceInsightTemperature')}
                                    content={temperatureTipsContent}
                                />
                            </div>
                            <div className="nbu-input-surface flex items-center gap-3 px-4 py-3">
                                <input
                                    data-testid="composer-advanced-temperature-range"
                                    type="range"
                                    min="0"
                                    max="2"
                                    step={TEMPERATURE_STEP}
                                    value={temperature}
                                    onChange={(event) =>
                                        onTemperatureChange(normalizeTemperature(Number(event.target.value)))
                                    }
                                    className="flex-1"
                                />
                                <input
                                    data-testid="composer-advanced-temperature-input"
                                    type="number"
                                    min="0"
                                    max="2"
                                    step={TEMPERATURE_STEP}
                                    value={formatTemperature(temperature)}
                                    onChange={(event) =>
                                        onTemperatureChange(normalizeTemperature(Number(event.target.value) || 0))
                                    }
                                    className="nbu-input-surface w-20 rounded-xl px-2 py-1.5 text-right"
                                />
                            </div>
                        </section>
                    )}

                    {renderSafetyInPrimaryColumn && renderSafetyCard()}
                </div>
            )}

            {hasRightColumnContent && (
                <div data-testid="composer-advanced-secondary-column" className="space-y-4">
                    {hasGroundingCard && (
                        <section data-testid="composer-advanced-grounding-card" className={cardClassName}>
                            <label className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
                                <div className="flex items-center gap-2">
                                    <span className={cardLabelClassName}>{t('composerAdvancedGroundingMode')}</span>
                                    <InfoTooltip
                                        dataTestId="composer-advanced-grounding-mode-hint"
                                        buttonLabel={t('composerAdvancedGroundingDesc')}
                                        content={t('composerAdvancedGroundingDesc')}
                                    />
                                </div>
                                <select
                                    data-testid="composer-advanced-grounding-mode-select"
                                    value={groundingMode}
                                    onChange={(event) => onGroundingModeChange(event.target.value as GroundingMode)}
                                    className="nbu-input-surface w-full px-4 py-3"
                                >
                                    {availableGroundingModes.map((mode) => (
                                        <option key={mode} value={mode}>
                                            {t(getGroundingModeTranslationKey(mode))}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            {showGroundingResolutionWarning && (
                                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                                    {t('composerAdvancedGroundingResolutionWarningFlashImageSearch')}
                                </div>
                            )}

                            {hasImageSearchGroundingOption && (
                                <div
                                    data-testid="composer-advanced-grounding-guide"
                                    className="rounded-2xl border border-slate-200/80 bg-white/75 px-3 py-2 text-xs leading-relaxed text-gray-700 dark:border-slate-700/80 dark:bg-slate-900/70 dark:text-gray-200"
                                >
                                    {t('composerAdvancedGroundingGuideImageSearchLimit')}
                                </div>
                            )}
                        </section>
                    )}

                    {renderSafetyInSecondaryColumn && renderSafetyCard()}
                </div>
            )}
        </div>
    );
}
