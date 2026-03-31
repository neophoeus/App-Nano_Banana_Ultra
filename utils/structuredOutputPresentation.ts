import { StructuredOutputMode } from '../types';
import { sanitizeInlineImageDataInText, sanitizeInlineImageDisplayValue } from './inlineImageDisplay';
import { getTranslation, Language } from './translations';

export type StructuredOutputDisplayEntry = {
    key: string;
    label: string;
    kind: 'text' | 'list' | 'json';
    value: string | string[];
};

const PREFERRED_SCENE_BRIEF_ORDER = [
    'summary',
    'sceneType',
    'primarySubjects',
    'visualStyle',
    'colorPalette',
    'compositionNotes',
] as const;

const PREFERRED_PROMPT_KIT_ORDER = [
    'intentSummary',
    'subjectCues',
    'styleCues',
    'lightingCues',
    'compositionCues',
    'negativeCues',
] as const;

const PREFERRED_QUALITY_CHECK_ORDER = [
    'overallAssessment',
    'strengths',
    'issues',
    'revisionPriorities',
    'deliveryNotes',
] as const;

const PREFERRED_SHOT_PLAN_ORDER = [
    'shotIntent',
    'cameraFraming',
    'subjectPlacement',
    'focalElements',
    'lightingPlan',
    'continuityNotes',
] as const;

const PREFERRED_DELIVERY_BRIEF_ORDER = [
    'deliverySummary',
    'approvedElements',
    'mustProtect',
    'finalAdjustments',
    'handoffNotes',
    'exportTargets',
] as const;

const PREFERRED_REVISION_BRIEF_ORDER = [
    'revisionGoal',
    'mustKeep',
    'editTargets',
    'changeSequence',
    'riskChecks',
    'finalPrompt',
] as const;

const PREFERRED_VARIATION_COMPARE_ORDER = [
    'comparisonSummary',
    'strongestOption',
    'keyDifferences',
    'tradeoffs',
    'recommendedNextMove',
    'testPrompts',
] as const;

export const STRUCTURED_OUTPUT_FIELD_LABEL_KEYS: Record<string, string> = {
    summary: 'structuredOutputFieldSummary',
    sceneType: 'structuredOutputFieldSceneType',
    primarySubjects: 'structuredOutputFieldPrimarySubjects',
    visualStyle: 'structuredOutputFieldVisualStyle',
    colorPalette: 'structuredOutputFieldColorPalette',
    compositionNotes: 'structuredOutputFieldCompositionNotes',
    intentSummary: 'structuredOutputFieldIntentSummary',
    subjectCues: 'structuredOutputFieldSubjectCues',
    styleCues: 'structuredOutputFieldStyleCues',
    lightingCues: 'structuredOutputFieldLightingCues',
    compositionCues: 'structuredOutputFieldCompositionCues',
    negativeCues: 'structuredOutputFieldNegativeCues',
    overallAssessment: 'structuredOutputFieldOverallAssessment',
    strengths: 'structuredOutputFieldStrengths',
    issues: 'structuredOutputFieldIssues',
    revisionPriorities: 'structuredOutputFieldRevisionPriorities',
    deliveryNotes: 'structuredOutputFieldDeliveryNotes',
    shotIntent: 'structuredOutputFieldShotIntent',
    cameraFraming: 'structuredOutputFieldCameraFraming',
    subjectPlacement: 'structuredOutputFieldSubjectPlacement',
    focalElements: 'structuredOutputFieldFocalElements',
    lightingPlan: 'structuredOutputFieldLightingPlan',
    continuityNotes: 'structuredOutputFieldContinuityNotes',
    deliverySummary: 'structuredOutputFieldDeliverySummary',
    approvedElements: 'structuredOutputFieldApprovedElements',
    mustProtect: 'structuredOutputFieldMustProtect',
    finalAdjustments: 'structuredOutputFieldFinalAdjustments',
    handoffNotes: 'structuredOutputFieldHandoffNotes',
    exportTargets: 'structuredOutputFieldExportTargets',
    revisionGoal: 'structuredOutputFieldRevisionGoal',
    mustKeep: 'structuredOutputFieldMustKeep',
    editTargets: 'structuredOutputFieldEditTargets',
    changeSequence: 'structuredOutputFieldChangeSequence',
    riskChecks: 'structuredOutputFieldRiskChecks',
    finalPrompt: 'structuredOutputFieldFinalPrompt',
    comparisonSummary: 'structuredOutputFieldComparisonSummary',
    strongestOption: 'structuredOutputFieldStrongestOption',
    keyDifferences: 'structuredOutputFieldKeyDifferences',
    tradeoffs: 'structuredOutputFieldTradeoffs',
    recommendedNextMove: 'structuredOutputFieldRecommendedNextMove',
    testPrompts: 'structuredOutputFieldTestPrompts',
};

export const PRIMARY_TEXT_KEY_BY_MODE: Partial<Record<Exclude<StructuredOutputMode, 'off'>, string>> = {
    'scene-brief': 'summary',
    'prompt-kit': 'intentSummary',
    'quality-check': 'overallAssessment',
    'shot-plan': 'shotIntent',
    'delivery-brief': 'deliverySummary',
    'revision-brief': 'revisionGoal',
    'variation-compare': 'comparisonSummary',
};

const isPrimitiveDisplayValue = (value: unknown): value is string | number | boolean =>
    typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';

const humanizeStructuredOutputKey = (value: string) => {
    const normalized = value
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/[_-]+/g, ' ')
        .trim();

    if (!normalized) {
        return value;
    }

    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const buildOrderedKeys = (
    structuredData: Record<string, unknown>,
    structuredOutputMode?: StructuredOutputMode | null,
) => {
    if (structuredOutputMode === 'scene-brief') {
        return [
            ...PREFERRED_SCENE_BRIEF_ORDER.filter((key) => key in structuredData),
            ...Object.keys(structuredData).filter((key) => !PREFERRED_SCENE_BRIEF_ORDER.includes(key as never)),
        ];
    }

    if (structuredOutputMode === 'prompt-kit') {
        return [
            ...PREFERRED_PROMPT_KIT_ORDER.filter((key) => key in structuredData),
            ...Object.keys(structuredData).filter((key) => !PREFERRED_PROMPT_KIT_ORDER.includes(key as never)),
        ];
    }

    if (structuredOutputMode === 'quality-check') {
        return [
            ...PREFERRED_QUALITY_CHECK_ORDER.filter((key) => key in structuredData),
            ...Object.keys(structuredData).filter((key) => !PREFERRED_QUALITY_CHECK_ORDER.includes(key as never)),
        ];
    }

    if (structuredOutputMode === 'shot-plan') {
        return [
            ...PREFERRED_SHOT_PLAN_ORDER.filter((key) => key in structuredData),
            ...Object.keys(structuredData).filter((key) => !PREFERRED_SHOT_PLAN_ORDER.includes(key as never)),
        ];
    }

    if (structuredOutputMode === 'delivery-brief') {
        return [
            ...PREFERRED_DELIVERY_BRIEF_ORDER.filter((key) => key in structuredData),
            ...Object.keys(structuredData).filter((key) => !PREFERRED_DELIVERY_BRIEF_ORDER.includes(key as never)),
        ];
    }

    if (structuredOutputMode === 'revision-brief') {
        return [
            ...PREFERRED_REVISION_BRIEF_ORDER.filter((key) => key in structuredData),
            ...Object.keys(structuredData).filter((key) => !PREFERRED_REVISION_BRIEF_ORDER.includes(key as never)),
        ];
    }

    if (structuredOutputMode === 'variation-compare') {
        return [
            ...PREFERRED_VARIATION_COMPARE_ORDER.filter((key) => key in structuredData),
            ...Object.keys(structuredData).filter((key) => !PREFERRED_VARIATION_COMPARE_ORDER.includes(key as never)),
        ];
    }

    return Object.keys(structuredData);
};

export const buildStructuredOutputDisplayEntries = (
    structuredData: Record<string, unknown>,
    currentLanguage: Language,
    structuredOutputMode?: StructuredOutputMode | null,
): StructuredOutputDisplayEntry[] => {
    return buildOrderedKeys(structuredData, structuredOutputMode).reduce<StructuredOutputDisplayEntry[]>(
        (entries, key) => {
            const value = structuredData[key];

            if (Array.isArray(value) && value.every(isPrimitiveDisplayValue)) {
                const normalizedValues = value.map((item) => String(item).trim()).filter(Boolean);
                if (normalizedValues.length > 0) {
                    entries.push({
                        key,
                        label:
                            getTranslation(currentLanguage, STRUCTURED_OUTPUT_FIELD_LABEL_KEYS[key] || '') ||
                            humanizeStructuredOutputKey(key),
                        kind: 'list',
                        value: normalizedValues,
                    });
                }
                return entries;
            }

            if (isPrimitiveDisplayValue(value)) {
                const normalizedValue = sanitizeInlineImageDataInText(String(value)).trim();
                if (normalizedValue) {
                    entries.push({
                        key,
                        label:
                            getTranslation(currentLanguage, STRUCTURED_OUTPUT_FIELD_LABEL_KEYS[key] || '') ||
                            humanizeStructuredOutputKey(key),
                        kind: 'text',
                        value: normalizedValue,
                    });
                }
                return entries;
            }

            if (value && typeof value === 'object') {
                entries.push({
                    key,
                    label:
                        getTranslation(currentLanguage, STRUCTURED_OUTPUT_FIELD_LABEL_KEYS[key] || '') ||
                        humanizeStructuredOutputKey(key),
                    kind: 'json',
                    value: JSON.stringify(sanitizeInlineImageDisplayValue(value), null, 2),
                });
            }

            return entries;
        },
        [],
    );
};

export const formatStructuredOutputPlainText = (
    structuredData: Record<string, unknown> | null | undefined,
    currentLanguage: Language,
    structuredOutputMode?: StructuredOutputMode | null,
): string | null => {
    if (!structuredData) {
        return null;
    }

    const entries = buildStructuredOutputDisplayEntries(structuredData, currentLanguage, structuredOutputMode);
    if (entries.length === 0) {
        return null;
    }

    return entries
        .map((entry) => {
            if (entry.kind === 'list' && Array.isArray(entry.value)) {
                return `${entry.label}: ${entry.value.join(', ')}`;
            }

            return `${entry.label}: ${String(entry.value)}`;
        })
        .join('\n\n');
};

export const formatStructuredOutputMarkdown = (
    structuredData: Record<string, unknown> | null | undefined,
    currentLanguage: Language,
    structuredOutputMode?: StructuredOutputMode | null,
): string | null => {
    if (!structuredData) {
        return null;
    }

    const entries = buildStructuredOutputDisplayEntries(structuredData, currentLanguage, structuredOutputMode);
    if (entries.length === 0) {
        return null;
    }

    return entries
        .map((entry) => {
            if (entry.kind === 'list' && Array.isArray(entry.value)) {
                return [`## ${entry.label}`, ...entry.value.map((item) => `- ${item}`)].join('\n');
            }

            if (entry.kind === 'json') {
                return [`## ${entry.label}`, '```json', String(entry.value), '```'].join('\n');
            }

            return [`## ${entry.label}`, String(entry.value)].join('\n\n');
        })
        .join('\n\n');
};
