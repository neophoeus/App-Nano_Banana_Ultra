import { StructuredOutputMode } from '../types';
import { sanitizeInlineImageDataInText, sanitizeInlineImageDisplayValue } from './inlineImageDisplay';

export type StructuredOutputDefinition = {
    label: string;
    promptInstruction: string;
    responseMimeType: 'application/json';
    responseJsonSchema: Record<string, unknown>;
};

export const DEFAULT_STRUCTURED_OUTPUT_MODE: StructuredOutputMode = 'off';

export const STRUCTURED_OUTPUT_DEFINITIONS: Record<Exclude<StructuredOutputMode, 'off'>, StructuredOutputDefinition> = {
    'scene-brief': {
        label: 'Scene brief',
        promptInstruction:
            'Return the text response as JSON only. Describe the generated result as a concise production-facing scene brief with summary, subjects, visual style, palette, and composition notes.',
        responseMimeType: 'application/json',
        responseJsonSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                summary: { type: 'string' },
                sceneType: { type: 'string' },
                primarySubjects: {
                    type: 'array',
                    items: { type: 'string' },
                },
                visualStyle: {
                    type: 'array',
                    items: { type: 'string' },
                },
                colorPalette: {
                    type: 'array',
                    items: { type: 'string' },
                },
                compositionNotes: { type: 'string' },
            },
            required: ['summary', 'sceneType', 'primarySubjects', 'visualStyle', 'colorPalette', 'compositionNotes'],
        },
    },
    'prompt-kit': {
        label: 'Prompt kit',
        promptInstruction:
            'Return the text response as JSON only. Extract a concise reusable prompt kit from the generated result with an intent summary plus subject, style, lighting, composition, and avoid cues.',
        responseMimeType: 'application/json',
        responseJsonSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                intentSummary: { type: 'string' },
                subjectCues: {
                    type: 'array',
                    items: { type: 'string' },
                },
                styleCues: {
                    type: 'array',
                    items: { type: 'string' },
                },
                lightingCues: {
                    type: 'array',
                    items: { type: 'string' },
                },
                compositionCues: {
                    type: 'array',
                    items: { type: 'string' },
                },
                negativeCues: {
                    type: 'array',
                    items: { type: 'string' },
                },
            },
            required: ['intentSummary', 'subjectCues', 'styleCues', 'lightingCues', 'compositionCues', 'negativeCues'],
        },
    },
    'quality-check': {
        label: 'Quality check',
        promptInstruction:
            'Return the text response as JSON only. Evaluate the generated result as a concise quality check with an overall assessment, strengths, issues, revision priorities, and delivery notes.',
        responseMimeType: 'application/json',
        responseJsonSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                overallAssessment: { type: 'string' },
                strengths: {
                    type: 'array',
                    items: { type: 'string' },
                },
                issues: {
                    type: 'array',
                    items: { type: 'string' },
                },
                revisionPriorities: {
                    type: 'array',
                    items: { type: 'string' },
                },
                deliveryNotes: { type: 'string' },
            },
            required: ['overallAssessment', 'strengths', 'issues', 'revisionPriorities', 'deliveryNotes'],
        },
    },
    'shot-plan': {
        label: 'Shot plan',
        promptInstruction:
            'Return the text response as JSON only. Translate the generated result into a concise shot plan with shot intent, camera framing, subject placement, focal elements, lighting plan, and continuity notes.',
        responseMimeType: 'application/json',
        responseJsonSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                shotIntent: { type: 'string' },
                cameraFraming: { type: 'string' },
                subjectPlacement: {
                    type: 'array',
                    items: { type: 'string' },
                },
                focalElements: {
                    type: 'array',
                    items: { type: 'string' },
                },
                lightingPlan: {
                    type: 'array',
                    items: { type: 'string' },
                },
                continuityNotes: { type: 'string' },
            },
            required: [
                'shotIntent',
                'cameraFraming',
                'subjectPlacement',
                'focalElements',
                'lightingPlan',
                'continuityNotes',
            ],
        },
    },
    'delivery-brief': {
        label: 'Delivery brief',
        promptInstruction:
            'Return the text response as JSON only. Summarize the generated result as a concise delivery brief with a delivery summary, approved elements, must-protect details, final adjustments, handoff notes, and export targets.',
        responseMimeType: 'application/json',
        responseJsonSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                deliverySummary: { type: 'string' },
                approvedElements: {
                    type: 'array',
                    items: { type: 'string' },
                },
                mustProtect: {
                    type: 'array',
                    items: { type: 'string' },
                },
                finalAdjustments: {
                    type: 'array',
                    items: { type: 'string' },
                },
                handoffNotes: { type: 'string' },
                exportTargets: {
                    type: 'array',
                    items: { type: 'string' },
                },
            },
            required: [
                'deliverySummary',
                'approvedElements',
                'mustProtect',
                'finalAdjustments',
                'handoffNotes',
                'exportTargets',
            ],
        },
    },
    'revision-brief': {
        label: 'Revision brief',
        promptInstruction:
            'Return the text response as JSON only. Turn the generated result into a concise revision brief with a revision goal, elements to keep, edit targets, change sequence, risk checks, and a final revision prompt.',
        responseMimeType: 'application/json',
        responseJsonSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                revisionGoal: { type: 'string' },
                mustKeep: {
                    type: 'array',
                    items: { type: 'string' },
                },
                editTargets: {
                    type: 'array',
                    items: { type: 'string' },
                },
                changeSequence: {
                    type: 'array',
                    items: { type: 'string' },
                },
                riskChecks: {
                    type: 'array',
                    items: { type: 'string' },
                },
                finalPrompt: { type: 'string' },
            },
            required: ['revisionGoal', 'mustKeep', 'editTargets', 'changeSequence', 'riskChecks', 'finalPrompt'],
        },
    },
    'variation-compare': {
        label: 'Variation compare',
        promptInstruction:
            'Return the text response as JSON only. Compare the generated result as if it were one candidate among nearby variations with a comparison summary, strongest option, key differences, tradeoffs, recommended next move, and test prompts.',
        responseMimeType: 'application/json',
        responseJsonSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                comparisonSummary: { type: 'string' },
                strongestOption: { type: 'string' },
                keyDifferences: {
                    type: 'array',
                    items: { type: 'string' },
                },
                tradeoffs: {
                    type: 'array',
                    items: { type: 'string' },
                },
                recommendedNextMove: { type: 'string' },
                testPrompts: {
                    type: 'array',
                    items: { type: 'string' },
                },
            },
            required: [
                'comparisonSummary',
                'strongestOption',
                'keyDifferences',
                'tradeoffs',
                'recommendedNextMove',
                'testPrompts',
            ],
        },
    },
};

export const STRUCTURED_OUTPUT_OPTIONS: Array<{ value: StructuredOutputMode; label: string }> = [
    { value: 'off', label: 'Off' },
    { value: 'scene-brief', label: STRUCTURED_OUTPUT_DEFINITIONS['scene-brief'].label },
    { value: 'prompt-kit', label: STRUCTURED_OUTPUT_DEFINITIONS['prompt-kit'].label },
    { value: 'quality-check', label: STRUCTURED_OUTPUT_DEFINITIONS['quality-check'].label },
    { value: 'shot-plan', label: STRUCTURED_OUTPUT_DEFINITIONS['shot-plan'].label },
    { value: 'delivery-brief', label: STRUCTURED_OUTPUT_DEFINITIONS['delivery-brief'].label },
    { value: 'revision-brief', label: STRUCTURED_OUTPUT_DEFINITIONS['revision-brief'].label },
    { value: 'variation-compare', label: STRUCTURED_OUTPUT_DEFINITIONS['variation-compare'].label },
];

export function normalizeStructuredOutputMode(value: unknown): StructuredOutputMode {
    if (
        value === 'scene-brief' ||
        value === 'prompt-kit' ||
        value === 'quality-check' ||
        value === 'shot-plan' ||
        value === 'delivery-brief' ||
        value === 'revision-brief' ||
        value === 'variation-compare'
    ) {
        return value;
    }

    return DEFAULT_STRUCTURED_OUTPUT_MODE;
}

export function getStructuredOutputDefinition(
    mode: StructuredOutputMode | null | undefined,
): StructuredOutputDefinition | null {
    if (!mode || mode === 'off') {
        return null;
    }

    return STRUCTURED_OUTPUT_DEFINITIONS[mode] || null;
}

export function appendStructuredOutputInstruction(
    prompt: string,
    mode: StructuredOutputMode | null | undefined,
): string {
    const definition = getStructuredOutputDefinition(mode);
    if (!definition) {
        return prompt;
    }

    return `${prompt}\n\nStructured text response requirement: ${definition.promptInstruction}`;
}

export function parseStructuredOutputText(
    mode: StructuredOutputMode | null | undefined,
    text: string | null | undefined,
): Record<string, unknown> | null {
    if (!getStructuredOutputDefinition(mode) || !text || !text.trim()) {
        return null;
    }

    try {
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed as Record<string, unknown>;
        }
    } catch {
        return null;
    }

    return null;
}

export function formatStructuredOutputDisplay(
    structuredData: Record<string, unknown> | null | undefined,
    fallbackText?: string | null,
): string | null {
    if (structuredData) {
        return JSON.stringify(sanitizeInlineImageDisplayValue(structuredData), null, 2);
    }

    return fallbackText ? sanitizeInlineImageDataInText(fallbackText) : null;
}

export function hasStructuredOutputMode(mode: StructuredOutputMode | null | undefined): boolean {
    return normalizeStructuredOutputMode(mode) !== 'off';
}
