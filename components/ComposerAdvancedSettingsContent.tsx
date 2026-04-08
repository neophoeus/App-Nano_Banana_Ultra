import React from 'react';
import { MODEL_CAPABILITIES, OUTPUT_FORMATS, STRUCTURED_OUTPUT_MODES, THINKING_LEVELS } from '../constants';
import { GroundingMode, ImageModel, OutputFormat, StructuredOutputMode, ThinkingLevel } from '../types';
import { getGroundingModeLabel } from '../utils/groundingMode';
import { STRUCTURED_OUTPUT_FIELD_LABEL_KEYS } from '../utils/structuredOutputPresentation';
import { getTranslation, Language } from '../utils/translations';
import InfoTooltip from './InfoTooltip';

type ComposerAdvancedSettingsContentProps = {
    currentLanguage: Language;
    outputFormat: OutputFormat;
    structuredOutputMode: StructuredOutputMode;
    thinkingLevel: ThinkingLevel;
    groundingMode: GroundingMode;
    imageModel: ImageModel;
    capability: (typeof MODEL_CAPABILITIES)[ImageModel];
    availableGroundingModes: GroundingMode[];
    temperature: number;
    onOutputFormatChange: (value: OutputFormat) => void;
    onStructuredOutputModeChange: (value: StructuredOutputMode) => void;
    onTemperatureChange: (value: number) => void;
    onThinkingLevelChange: (value: ThinkingLevel) => void;
    onGroundingModeChange: (value: GroundingMode) => void;
};

const STRUCTURED_OUTPUT_GUIDE_FIELD_KEYS: Record<StructuredOutputMode, string[]> = {
    off: [],
    'scene-brief': ['summary', 'primarySubjects', 'compositionNotes'],
    'prompt-kit': ['intentSummary', 'subjectCues', 'negativeCues'],
    'quality-check': ['overallAssessment', 'issues', 'revisionPriorities'],
    'shot-plan': ['shotIntent', 'cameraFraming', 'lightingPlan'],
    'delivery-brief': ['deliverySummary', 'mustProtect', 'exportTargets'],
    'revision-brief': ['revisionGoal', 'editTargets', 'riskChecks'],
    'variation-compare': ['comparisonSummary', 'tradeoffs', 'testPrompts'],
};

const STRUCTURED_OUTPUT_PROMPT_READY_FIELD_KEYS: Partial<Record<StructuredOutputMode, string[]>> = {
    'revision-brief': ['finalPrompt'],
    'variation-compare': ['recommendedNextMove', 'testPrompts'],
};

export default function ComposerAdvancedSettingsContent({
    currentLanguage,
    outputFormat,
    structuredOutputMode,
    thinkingLevel,
    groundingMode,
    imageModel,
    capability,
    availableGroundingModes,
    temperature,
    onOutputFormatChange,
    onStructuredOutputModeChange,
    onTemperatureChange,
    onThinkingLevelChange,
    onGroundingModeChange,
}: ComposerAdvancedSettingsContentProps) {
    const t = (key: string) => getTranslation(currentLanguage, key);
    const getStructuredOutputModeLabel = (value: StructuredOutputMode) => {
        switch (value) {
            case 'scene-brief':
                return t('structuredOutputModeSceneBrief');
            case 'prompt-kit':
                return t('structuredOutputModePromptKit');
            case 'quality-check':
                return t('structuredOutputModeQualityCheck');
            case 'shot-plan':
                return t('structuredOutputModeShotPlan');
            case 'delivery-brief':
                return t('structuredOutputModeDeliveryBrief');
            case 'revision-brief':
                return t('structuredOutputModeRevisionBrief');
            case 'variation-compare':
                return t('structuredOutputModeVariationCompare');
            default:
                return t('structuredOutputModeOff');
        }
    };
    const getStructuredOutputModeGuide = (value: StructuredOutputMode) => {
        switch (value) {
            case 'scene-brief':
                return t('composerAdvancedStructuredOutputGuideSceneBrief');
            case 'prompt-kit':
                return t('composerAdvancedStructuredOutputGuidePromptKit');
            case 'quality-check':
                return t('composerAdvancedStructuredOutputGuideQualityCheck');
            case 'shot-plan':
                return t('composerAdvancedStructuredOutputGuideShotPlan');
            case 'delivery-brief':
                return t('composerAdvancedStructuredOutputGuideDeliveryBrief');
            case 'revision-brief':
                return t('composerAdvancedStructuredOutputGuideRevisionBrief');
            case 'variation-compare':
                return t('composerAdvancedStructuredOutputGuideVariationCompare');
            default:
                return t('composerAdvancedStructuredOutputGuideOff');
        }
    };
    const getStructuredOutputModeGuideFields = (value: StructuredOutputMode) =>
        STRUCTURED_OUTPUT_GUIDE_FIELD_KEYS[value].map(
            (fieldKey) =>
                getTranslation(currentLanguage, STRUCTURED_OUTPUT_FIELD_LABEL_KEYS[fieldKey] || '') || fieldKey,
        );
    const getStructuredOutputModePromptReadyGuide = (value: StructuredOutputMode) => {
        switch (value) {
            case 'revision-brief':
                return t('structuredOutputPromptReadyHintRevisionBrief');
            case 'variation-compare':
                return t('structuredOutputPromptReadyHintVariationCompare');
            default:
                return null;
        }
    };
    const getStructuredOutputModePromptReadyFields = (value: StructuredOutputMode) =>
        (STRUCTURED_OUTPUT_PROMPT_READY_FIELD_KEYS[value] || []).map(
            (fieldKey) =>
                getTranslation(currentLanguage, STRUCTURED_OUTPUT_FIELD_LABEL_KEYS[fieldKey] || '') || fieldKey,
        );
    const showGroundingResolutionWarning =
        imageModel === 'gemini-3.1-flash-image-preview' &&
        (groundingMode === 'image-search' || groundingMode === 'google-search-plus-image-search');
    const groundingGuideRows = [
        t('composerAdvancedGroundingGuideFlashGoogle'),
        t('composerAdvancedGroundingGuideFlashImage'),
        t('composerAdvancedGroundingGuideProGoogle'),
    ];

    return (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
            <div className={`nbu-soft-well p-4 ${availableGroundingModes.length > 1 ? '' : 'xl:col-span-2'}`}>
                <div className="grid gap-4 md:grid-cols-2">
                    {capability.outputFormats.length > 1 && (
                        <label className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
                            <span className="block text-xs font-bold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                                {t('groundingProvenanceInsightOutputFormat')}
                            </span>
                            <select
                                data-testid="composer-advanced-output-format"
                                value={outputFormat}
                                onChange={(event) => onOutputFormatChange(event.target.value as OutputFormat)}
                                className="nbu-input-surface w-full px-4 py-3"
                            >
                                {OUTPUT_FORMATS.filter((option) => capability.outputFormats.includes(option.value)).map(
                                    (option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ),
                                )}
                            </select>
                        </label>
                    )}

                    {capability.supportsStructuredOutputs && (
                        <div className="space-y-2 text-sm text-gray-700 dark:text-gray-200 md:col-span-2">
                            <div className="flex items-center gap-2">
                                <span className="block text-xs font-bold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                                    {t('composerAdvancedStructuredOutput')}
                                </span>
                                <InfoTooltip
                                    dataTestId="composer-advanced-structured-output-hint"
                                    buttonLabel={t('composerAdvancedStructuredOutputDesc')}
                                    content={t('composerAdvancedStructuredOutputDesc')}
                                />
                            </div>
                            <select
                                data-testid="composer-advanced-structured-output-select"
                                value={structuredOutputMode}
                                onChange={(event) =>
                                    onStructuredOutputModeChange(event.target.value as StructuredOutputMode)
                                }
                                className="nbu-input-surface w-full px-4 py-3"
                            >
                                {STRUCTURED_OUTPUT_MODES.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {getStructuredOutputModeLabel(option.value)}
                                    </option>
                                ))}
                            </select>
                            <div
                                data-testid="composer-advanced-structured-output-guide"
                                className="rounded-2xl border border-emerald-200/80 bg-emerald-50/70 px-4 py-3 dark:border-emerald-500/20 dark:bg-emerald-950/20"
                            >
                                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700/80 dark:text-emerald-200/70">
                                    {getStructuredOutputModeLabel(structuredOutputMode)}
                                </div>
                                <div className="mt-1 text-xs leading-6 text-emerald-900 dark:text-emerald-100">
                                    {getStructuredOutputModeGuide(structuredOutputMode)}
                                </div>
                                {getStructuredOutputModeGuideFields(structuredOutputMode).length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {getStructuredOutputModeGuideFields(structuredOutputMode).map((fieldLabel) => (
                                            <span
                                                key={fieldLabel}
                                                className="rounded-full border border-emerald-200 bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-emerald-900 dark:border-emerald-400/30 dark:bg-emerald-900/30 dark:text-emerald-100"
                                            >
                                                {fieldLabel}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                {getStructuredOutputModePromptReadyGuide(structuredOutputMode) && (
                                    <div
                                        data-testid="composer-advanced-structured-output-next-prompt-guide"
                                        className="mt-3 rounded-2xl border border-sky-200/80 bg-white/70 px-3 py-3 dark:border-sky-400/20 dark:bg-sky-950/20"
                                    >
                                        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-700/80 dark:text-sky-200/70">
                                            {t('structuredOutputPromptReady')}
                                        </div>
                                        <div className="mt-1 text-[11px] leading-5 text-sky-900 dark:text-sky-100">
                                            {getStructuredOutputModePromptReadyGuide(structuredOutputMode)}
                                        </div>
                                        {getStructuredOutputModePromptReadyFields(structuredOutputMode).length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {getStructuredOutputModePromptReadyFields(structuredOutputMode).map(
                                                    (fieldLabel) => (
                                                        <span
                                                            key={fieldLabel}
                                                            className="rounded-full border border-sky-200 bg-white/85 px-2.5 py-1 text-[11px] font-semibold text-sky-900 dark:border-sky-400/30 dark:bg-sky-900/30 dark:text-sky-100"
                                                        >
                                                            {fieldLabel}
                                                        </span>
                                                    ),
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {capability.supportsTemperature && (
                        <div className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
                            <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                                <span>{t('groundingProvenanceInsightTemperature')}</span>
                                <span className="rounded-full border border-gray-200 bg-white/80 px-2 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-gray-500 dark:border-gray-700 dark:bg-gray-900/70 dark:text-gray-300">
                                    {t('composerDefaultTemp').replace('{0}', '= 1.0')}
                                </span>
                            </div>
                            <div className="nbu-input-surface flex items-center gap-3 px-4 py-3">
                                <input
                                    data-testid="composer-advanced-temperature-range"
                                    type="range"
                                    min="0"
                                    max="2"
                                    step="0.1"
                                    value={temperature}
                                    onChange={(event) => onTemperatureChange(Number(event.target.value))}
                                    className="flex-1"
                                />
                                <input
                                    data-testid="composer-advanced-temperature-input"
                                    type="number"
                                    min="0"
                                    max="2"
                                    step="0.1"
                                    value={temperature}
                                    onChange={(event) =>
                                        onTemperatureChange(Math.max(0, Math.min(2, Number(event.target.value) || 0)))
                                    }
                                    className="nbu-input-surface w-20 rounded-xl px-2 py-1.5 text-right"
                                />
                            </div>
                            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/70 px-4 py-3 text-xs leading-6 text-amber-900 dark:border-amber-500/20 dark:bg-amber-950/20 dark:text-amber-100">
                                <div>{t('composerAdvancedTemperatureGuideHigher')}</div>
                                <div>{t('composerAdvancedTemperatureGuideLower')}</div>
                            </div>
                        </div>
                    )}

                    {capability.thinkingLevels.some((level) => level !== 'disabled') && (
                        <label className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
                            <span className="block text-xs font-bold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
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
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                    )}
                </div>
            </div>

            {availableGroundingModes.length > 1 && (
                <div className="nbu-soft-well p-4">
                    <label className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
                        <div className="flex items-center gap-2">
                            <span className="block text-xs font-bold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                                {t('composerAdvancedGroundingMode')}
                            </span>
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
                                    {getGroundingModeLabel(mode)}
                                </option>
                            ))}
                        </select>
                    </label>

                    {showGroundingResolutionWarning && (
                        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                            {t('composerAdvancedGroundingResolutionWarningFlashImageSearch')}
                        </div>
                    )}

                    <div data-testid="composer-advanced-grounding-guide" className="nbu-subpanel mt-4 p-3">
                        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                            {t('composerAdvancedGroundingGuideTitle')}
                        </div>
                        <div className="mt-3 space-y-2">
                            {groundingGuideRows.map((row) => (
                                <div
                                    key={row}
                                    className="nbu-inline-panel px-3 py-2 text-xs leading-relaxed text-gray-700 dark:text-gray-200"
                                >
                                    {row}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
