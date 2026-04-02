import { Dispatch, SetStateAction, useCallback, useMemo, useState } from 'react';
import {
    AspectRatio,
    ExecutionMode,
    GenerationSettings,
    GroundingMode,
    ImageModel,
    ImageSize,
    ImageStyle,
    OutputFormat,
    StructuredOutputMode,
    ThinkingLevel,
    WorkspaceComposerState,
} from '../types';
import { getGroundingFlagsFromMode } from '../utils/groundingMode';
import { buildDisplaySettingsFromComposerState } from '../utils/workspaceSnapshotState';
import { normalizeStructuredOutputMode } from '../utils/structuredOutputs';

type UseComposerStateArgs = {
    initialComposerState: WorkspaceComposerState;
    generationMode: string;
    executionMode: ExecutionMode;
    setGenerationMode: Dispatch<SetStateAction<string>>;
    setExecutionMode: Dispatch<SetStateAction<ExecutionMode>>;
    setDisplaySettings: Dispatch<SetStateAction<GenerationSettings>>;
};

type UseComposerStateReturn = {
    prompt: string;
    setPrompt: Dispatch<SetStateAction<string>>;
    aspectRatio: AspectRatio;
    setAspectRatio: Dispatch<SetStateAction<AspectRatio>>;
    imageSize: ImageSize;
    setImageSize: Dispatch<SetStateAction<ImageSize>>;
    imageStyle: ImageStyle;
    setImageStyle: Dispatch<SetStateAction<ImageStyle>>;
    imageModel: ImageModel;
    setImageModel: Dispatch<SetStateAction<ImageModel>>;
    batchSize: number;
    setBatchSize: Dispatch<SetStateAction<number>>;
    outputFormat: OutputFormat;
    setOutputFormat: Dispatch<SetStateAction<OutputFormat>>;
    structuredOutputMode: StructuredOutputMode;
    setStructuredOutputMode: Dispatch<SetStateAction<StructuredOutputMode>>;
    temperature: number;
    setTemperature: Dispatch<SetStateAction<number>>;
    thinkingLevel: ThinkingLevel;
    setThinkingLevel: Dispatch<SetStateAction<ThinkingLevel>>;
    includeThoughts: boolean;
    setIncludeThoughts: Dispatch<SetStateAction<boolean>>;
    googleSearch: boolean;
    setGoogleSearch: Dispatch<SetStateAction<boolean>>;
    imageSearch: boolean;
    setImageSearch: Dispatch<SetStateAction<boolean>>;
    composerState: WorkspaceComposerState;
    applyComposerState: (nextComposerState: WorkspaceComposerState) => void;
    setGroundingMode: (mode: GroundingMode) => void;
    restoreEditorComposerState: (
        snapshot: {
            ratio: AspectRatio;
            size: ImageSize;
            batchSize: number;
            model?: ImageModel;
            style?: ImageStyle;
            outputFormat?: OutputFormat;
            structuredOutputMode?: StructuredOutputMode;
            temperature?: number;
            thinkingLevel?: ThinkingLevel;
            includeThoughts?: boolean;
            googleSearch?: boolean;
            imageSearch?: boolean;
        } | null,
    ) => void;
};

export function useComposerState({
    initialComposerState,
    generationMode,
    executionMode,
    setGenerationMode,
    setExecutionMode,
    setDisplaySettings,
}: UseComposerStateArgs): UseComposerStateReturn {
    const [prompt, setPrompt] = useState(initialComposerState.prompt);
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>(initialComposerState.aspectRatio);
    const [imageSize, setImageSize] = useState<ImageSize>(initialComposerState.imageSize);
    const [imageStyle, setImageStyle] = useState<ImageStyle>(initialComposerState.imageStyle);
    const [imageModel, setImageModel] = useState<ImageModel>(initialComposerState.imageModel);
    const [batchSize, setBatchSize] = useState(initialComposerState.batchSize);
    const [outputFormat, setOutputFormat] = useState<OutputFormat>(initialComposerState.outputFormat);
    const [structuredOutputMode, setStructuredOutputMode] = useState<StructuredOutputMode>(
        normalizeStructuredOutputMode(initialComposerState.structuredOutputMode),
    );
    const [temperature, setTemperature] = useState(initialComposerState.temperature);
    const [thinkingLevel, setThinkingLevel] = useState<ThinkingLevel>(initialComposerState.thinkingLevel);
    const [includeThoughts, setIncludeThoughts] = useState(initialComposerState.includeThoughts);
    const [googleSearch, setGoogleSearch] = useState(initialComposerState.googleSearch);
    const [imageSearch, setImageSearch] = useState(initialComposerState.imageSearch);

    const composerState = useMemo<WorkspaceComposerState>(
        () => ({
            prompt,
            aspectRatio,
            imageSize,
            imageStyle,
            imageModel,
            batchSize,
            outputFormat,
            structuredOutputMode,
            temperature,
            thinkingLevel,
            includeThoughts,
            googleSearch,
            imageSearch,
            generationMode,
            executionMode,
        }),
        [
            aspectRatio,
            batchSize,
            executionMode,
            generationMode,
            googleSearch,
            imageModel,
            imageSearch,
            imageSize,
            imageStyle,
            includeThoughts,
            outputFormat,
            prompt,
            structuredOutputMode,
            temperature,
            thinkingLevel,
        ],
    );

    const syncPresentationState = useCallback(
        (nextComposerState: WorkspaceComposerState) => {
            setGenerationMode(nextComposerState.generationMode);
            setExecutionMode(nextComposerState.executionMode);
            setDisplaySettings(buildDisplaySettingsFromComposerState(nextComposerState));
        },
        [setDisplaySettings, setExecutionMode, setGenerationMode],
    );

    const applyComposerState = useCallback(
        (nextComposerState: WorkspaceComposerState) => {
            setPrompt(nextComposerState.prompt);
            setAspectRatio(nextComposerState.aspectRatio);
            setImageSize(nextComposerState.imageSize);
            setImageStyle(nextComposerState.imageStyle);
            setImageModel(nextComposerState.imageModel);
            setBatchSize(nextComposerState.batchSize);
            setOutputFormat(nextComposerState.outputFormat);
            setStructuredOutputMode(normalizeStructuredOutputMode(nextComposerState.structuredOutputMode));
            setTemperature(nextComposerState.temperature);
            setThinkingLevel(nextComposerState.thinkingLevel);
            setIncludeThoughts(nextComposerState.includeThoughts);
            setGoogleSearch(nextComposerState.googleSearch);
            setImageSearch(nextComposerState.imageSearch);
            syncPresentationState(nextComposerState);
        },
        [syncPresentationState],
    );

    const setGroundingMode = useCallback((mode: GroundingMode) => {
        const nextFlags = getGroundingFlagsFromMode(mode);
        setGoogleSearch(nextFlags.googleSearch);
        setImageSearch(nextFlags.imageSearch);
    }, []);

    const restoreEditorComposerState = useCallback(
        (
            snapshot: {
                ratio: AspectRatio;
                size: ImageSize;
                batchSize: number;
                model?: ImageModel;
                style?: ImageStyle;
                outputFormat?: OutputFormat;
                structuredOutputMode?: StructuredOutputMode;
                temperature?: number;
                thinkingLevel?: ThinkingLevel;
                includeThoughts?: boolean;
                googleSearch?: boolean;
                imageSearch?: boolean;
            } | null,
        ) => {
            if (!snapshot) {
                return;
            }

            setAspectRatio(snapshot.ratio);
            setImageSize(snapshot.size);
            setBatchSize(snapshot.batchSize);

            if (snapshot.model) {
                setImageModel(snapshot.model);
            }
            if (snapshot.style) {
                setImageStyle(snapshot.style);
            }
            if (snapshot.outputFormat) {
                setOutputFormat(snapshot.outputFormat);
            }
            if (snapshot.structuredOutputMode) {
                setStructuredOutputMode(snapshot.structuredOutputMode);
            }
            if (typeof snapshot.temperature === 'number') {
                setTemperature(snapshot.temperature);
            }
            if (snapshot.thinkingLevel) {
                setThinkingLevel(snapshot.thinkingLevel);
            }
            if (typeof snapshot.includeThoughts === 'boolean') {
                setIncludeThoughts(snapshot.includeThoughts);
            }
            if (typeof snapshot.googleSearch === 'boolean') {
                setGoogleSearch(snapshot.googleSearch);
            }
            if (typeof snapshot.imageSearch === 'boolean') {
                setImageSearch(snapshot.imageSearch);
            }
        },
        [],
    );

    return {
        prompt,
        setPrompt,
        aspectRatio,
        setAspectRatio,
        imageSize,
        setImageSize,
        imageStyle,
        setImageStyle,
        imageModel,
        setImageModel,
        batchSize,
        setBatchSize,
        outputFormat,
        setOutputFormat,
        structuredOutputMode,
        setStructuredOutputMode,
        temperature,
        setTemperature,
        thinkingLevel,
        setThinkingLevel,
        includeThoughts,
        setIncludeThoughts,
        googleSearch,
        setGoogleSearch,
        imageSearch,
        setImageSearch,
        composerState,
        applyComposerState,
        setGroundingMode,
        restoreEditorComposerState,
    };
}
