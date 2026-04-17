import { ExecutionMode, ImageModel, OutputFormat, ThinkingLevel } from '../types';
import { IMAGE_MODELS, MODEL_CAPABILITIES } from './modelCapabilities';

export type LiveProgressExecutionMode = Extract<ExecutionMode, 'single-turn' | 'chat-continuation'>;
export type LiveProgressArtifactKind = 'thought-text' | 'thought-image' | 'output-text' | 'output-image' | 'thought-signature';
export type LiveProgressTruthfulnessOutcome =
    | 'live-progress'
    | 'hidden-signature-only'
    | 'final-only'
    | 'no-visible-artifacts'
    | 'unstable-ordering'
    | 'transport-unavailable';

export type LiveProgressCapabilityCell = {
    id: string;
    model: ImageModel;
    executionMode: LiveProgressExecutionMode;
    outputFormat: OutputFormat;
    thinkingLevel: ThinkingLevel;
    includeThoughts: boolean;
    expectedEligible: boolean;
    expectedReason?: string;
};

export type LiveProgressGateRequest = {
    model: ImageModel;
    executionMode: ExecutionMode;
    outputFormat: OutputFormat;
    thinkingLevel: ThinkingLevel;
    includeThoughts: boolean;
    batchSize?: number;
};

export type LiveProgressFanOutRequest = LiveProgressGateRequest & {
    batchSize: number;
};

export type LiveProgressStreamTruthSummary = {
    transportOpened: boolean;
    orderingStable: boolean;
    preCompletionArtifactCount: number;
    firstPreCompletionArtifactKind: LiveProgressArtifactKind | null;
    thoughtSignatureObserved: boolean;
    finalRenderArrived: boolean;
    truthfulnessOutcome: LiveProgressTruthfulnessOutcome;
};

const LIVE_PROGRESS_EXECUTION_MODES: LiveProgressExecutionMode[] = ['single-turn', 'chat-continuation'];
const LIVE_PROGRESS_OUTPUT_FORMATS: OutputFormat[] = ['images-only', 'images-and-text'];

const getProbeThinkingLevels = (model: ImageModel): ThinkingLevel[] =>
    model === 'gemini-3.1-flash-image-preview' ? ['minimal', 'high'] : ['disabled'];

export const buildLiveProgressCellId = ({
    model,
    executionMode,
    outputFormat,
    thinkingLevel,
}: {
    model: ImageModel;
    executionMode: LiveProgressExecutionMode;
    outputFormat: OutputFormat;
    thinkingLevel: ThinkingLevel;
}) => [model, executionMode, outputFormat, thinkingLevel].join(':');

export const describeLiveProgressIneligibility = ({
    model,
    executionMode,
    outputFormat,
    thinkingLevel,
    includeThoughts,
    batchSize,
}: LiveProgressGateRequest): string | null => {
    const capability = MODEL_CAPABILITIES[model];

    if (!capability) {
        return `Unsupported model: ${model}`;
    }

    if (typeof batchSize === 'number' && batchSize !== 1) {
        return 'Live progress streaming currently only runs on batch size 1 interactive requests.';
    }

    if (!LIVE_PROGRESS_EXECUTION_MODES.includes(executionMode as LiveProgressExecutionMode)) {
        return 'Live progress streaming currently only runs on single-turn or chat-continuation requests.';
    }

    if (!capability.outputFormats.includes(outputFormat)) {
        return `${model} does not support output format ${outputFormat}.`;
    }

    if (!capability.thinkingLevels.includes(thinkingLevel)) {
        return `${model} does not support thinking level ${thinkingLevel}.`;
    }

    if (!capability.supportsIncludeThoughts) {
        return `${model} does not support returning thoughts for live progress.`;
    }

    if (!includeThoughts) {
        return 'Live progress streaming requires includeThoughts=true so the UI only lights up when real thought artifacts exist.';
    }

    if (model === 'gemini-2.5-flash-image') {
        return 'gemini-2.5-flash-image is excluded from live thought progress acceptance.';
    }

    return null;
};

export const isLiveProgressEligibleRequest = (request: LiveProgressGateRequest): boolean =>
    !describeLiveProgressIneligibility(request);

export const describeLiveProgressFanOutIneligibility = ({
    model,
    executionMode,
    outputFormat,
    thinkingLevel,
    includeThoughts,
    batchSize,
}: LiveProgressFanOutRequest): string | null => {
    if (batchSize <= 1) {
        return 'Live progress fan-out only applies to multi-image interactive requests.';
    }

    if (executionMode !== 'interactive-batch-variants') {
        return 'Live progress fan-out currently only runs on interactive batch-variant requests.';
    }

    return describeLiveProgressIneligibility({
        model,
        executionMode: 'single-turn',
        outputFormat,
        thinkingLevel,
        includeThoughts,
        batchSize: 1,
    });
};

export const isLiveProgressFanOutEligibleRequest = (request: LiveProgressFanOutRequest): boolean =>
    !describeLiveProgressFanOutIneligibility(request);

export const getLiveProgressCapabilityMatrix = (options?: { includeExcluded?: boolean }): LiveProgressCapabilityCell[] => {
    const includeExcluded = options?.includeExcluded ?? true;
    const cells = IMAGE_MODELS.flatMap((model) =>
        LIVE_PROGRESS_EXECUTION_MODES.flatMap((executionMode) =>
            LIVE_PROGRESS_OUTPUT_FORMATS.flatMap((outputFormat) =>
                getProbeThinkingLevels(model).map((thinkingLevel) => {
                    const expectedReason = describeLiveProgressIneligibility({
                        model,
                        executionMode,
                        outputFormat,
                        thinkingLevel,
                        includeThoughts: true,
                        batchSize: 1,
                    });

                    return {
                        id: buildLiveProgressCellId({ model, executionMode, outputFormat, thinkingLevel }),
                        model,
                        executionMode,
                        outputFormat,
                        thinkingLevel,
                        includeThoughts: true,
                        expectedEligible: !expectedReason,
                        expectedReason: expectedReason || undefined,
                    } satisfies LiveProgressCapabilityCell;
                }),
            ),
        ),
    );

    return includeExcluded ? cells : cells.filter((cell) => cell.expectedEligible);
};

export const summarizeLiveProgressTruthfulness = ({
    transportOpened,
    orderingStable,
    preCompletionArtifactCount,
    firstPreCompletionArtifactKind,
    thoughtSignatureObserved,
    finalRenderArrived,
}: Omit<LiveProgressStreamTruthSummary, 'truthfulnessOutcome'>): LiveProgressStreamTruthSummary => {
    let truthfulnessOutcome: LiveProgressTruthfulnessOutcome;

    if (!transportOpened) {
        truthfulnessOutcome = 'transport-unavailable';
    } else if (!orderingStable) {
        truthfulnessOutcome = 'unstable-ordering';
    } else if (preCompletionArtifactCount > 0) {
        truthfulnessOutcome = 'live-progress';
    } else if (thoughtSignatureObserved) {
        truthfulnessOutcome = 'hidden-signature-only';
    } else if (finalRenderArrived) {
        truthfulnessOutcome = 'final-only';
    } else {
        truthfulnessOutcome = 'no-visible-artifacts';
    }

    return {
        transportOpened,
        orderingStable,
        preCompletionArtifactCount,
        firstPreCompletionArtifactKind,
        thoughtSignatureObserved,
        finalRenderArrived,
        truthfulnessOutcome,
    };
};