import { Dispatch, SetStateAction, useCallback, useMemo, useState } from 'react';
import {
    AspectRatio,
    DEFAULT_SAFETY_THRESHOLDS,
    ExecutionMode,
    GenerationSettings,
    GroundingMode,
    ImageModel,
    ImageSize,
    ImageStyle,
    OutputFormat,
    SafetyThresholds,
    StickySendIntent,
    ThinkingLevel,
    ViewerComposerSettingsSnapshot,
    WorkspaceComposerState,
} from '../types';
import { getGroundingFlagsFromMode } from '../utils/groundingMode';
import { normalizeTemperature } from '../utils/temperature';
import { normalizeViewerComposerSettingsSnapshot } from '../utils/viewerComposerSettings';
import { buildDisplaySettingsFromComposerState } from '../utils/workspaceSnapshotState';

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
    safetyThresholds: SafetyThresholds;
    setSafetyThresholds: Dispatch<SetStateAction<SafetyThresholds>>;
    stickySendIntent: StickySendIntent;
    setStickySendIntent: Dispatch<SetStateAction<StickySendIntent>>;
    composerState: WorkspaceComposerState;
    applyComposerState: (nextComposerState: WorkspaceComposerState) => void;
    applyViewerComposerSettingsSnapshot: (snapshot: ViewerComposerSettingsSnapshot) => void;
    setGroundingMode: (mode: GroundingMode) => void;
    restoreEditorComposerState: (
        snapshot: {
            ratio: AspectRatio;
            size: ImageSize;
            batchSize: number;
            model?: ImageModel;
            style?: ImageStyle;
            outputFormat?: OutputFormat;
            temperature?: number;
            thinkingLevel?: ThinkingLevel;
            includeThoughts?: boolean;
            googleSearch?: boolean;
            imageSearch?: boolean;
        } | null,
    ) => void;
    settingsLocked: boolean;
    setSettingsLocked: Dispatch<SetStateAction<boolean>>;
};

export function useComposerState({
    initialComposerState,
    generationMode,
    executionMode,
    setGenerationMode,
    setExecutionMode,
    setDisplaySettings,
}: UseComposerStateArgs): UseComposerStateReturn {
    const [settingsLocked, setSettingsLockedState] = useState(() => {
        return localStorage.getItem('nbu_settings_locked') === 'true';
    });

    const setSettingsLocked = useCallback((locked: boolean | ((prev: boolean) => boolean)) => {
        setSettingsLockedState((prev) => {
            const next = typeof locked === 'function' ? locked(prev) : locked;
            localStorage.setItem('nbu_settings_locked', String(next));
            return next;
        });
    }, []);

    const [prompt, setPrompt] = useState(initialComposerState.prompt);
    const [aspectRatio, setAspectRatioState] = useState<AspectRatio>(initialComposerState.aspectRatio);
    const [imageSize, setImageSizeState] = useState<ImageSize>(initialComposerState.imageSize);
    const [imageStyle, setImageStyleState] = useState<ImageStyle>(initialComposerState.imageStyle);
    const [imageModel, setImageModelState] = useState<ImageModel>(initialComposerState.imageModel);
    const [batchSize, setBatchSizeState] = useState(initialComposerState.batchSize);
    const [outputFormat, setOutputFormatState] = useState<OutputFormat>(initialComposerState.outputFormat);
    const [temperature, setTemperatureState] = useState(normalizeTemperature(initialComposerState.temperature));
    const [thinkingLevel, setThinkingLevelState] = useState<ThinkingLevel>(initialComposerState.thinkingLevel);
    const [includeThoughts, setIncludeThoughtsState] = useState(initialComposerState.includeThoughts);
    const [googleSearch, setGoogleSearchState] = useState(initialComposerState.googleSearch);
    const [imageSearch, setImageSearchState] = useState(initialComposerState.imageSearch);
    const [safetyThresholds, setSafetyThresholdsState] = useState<SafetyThresholds>(() => ({
        ...DEFAULT_SAFETY_THRESHOLDS,
        ...(initialComposerState.safetyThresholds || {}),
    }));
    const [stickySendIntent, setStickySendIntent] = useState<StickySendIntent>(
        initialComposerState.stickySendIntent ?? 'independent',
    );

    const setAspectRatio = useCallback((value: SetStateAction<AspectRatio>) => {
        if (settingsLocked) return;
        setAspectRatioState(value);
    }, [settingsLocked]);

    const setImageSize = useCallback((value: SetStateAction<ImageSize>) => {
        if (settingsLocked) return;
        setImageSizeState(value);
    }, [settingsLocked]);

    const setImageStyle = useCallback((value: SetStateAction<ImageStyle>) => {
        if (settingsLocked) return;
        setImageStyleState(value);
    }, [settingsLocked]);

    const setImageModel = useCallback((value: SetStateAction<ImageModel>) => {
        if (settingsLocked) return;
        setImageModelState(value);
    }, [settingsLocked]);

    const setBatchSize = useCallback((value: SetStateAction<number>) => {
        if (settingsLocked) return;
        setBatchSizeState(value);
    }, [settingsLocked]);

    const setOutputFormat = useCallback((value: SetStateAction<OutputFormat>) => {
        if (settingsLocked) return;
        setOutputFormatState(value);
    }, [settingsLocked]);

    const setTemperature: Dispatch<SetStateAction<number>> = useCallback((value) => {
        if (settingsLocked) return;
        setTemperatureState((previous) => normalizeTemperature(typeof value === 'function' ? value(previous) : value));
    }, [settingsLocked]);

    const setThinkingLevel = useCallback((value: SetStateAction<ThinkingLevel>) => {
        if (settingsLocked) return;
        setThinkingLevelState(value);
    }, [settingsLocked]);

    const setIncludeThoughts = useCallback((value: SetStateAction<boolean>) => {
        if (settingsLocked) return;
        setIncludeThoughtsState(value);
    }, [settingsLocked]);

    const setGoogleSearch = useCallback((value: SetStateAction<boolean>) => {
        if (settingsLocked) return;
        setGoogleSearchState(value);
    }, [settingsLocked]);

    const setImageSearch = useCallback((value: SetStateAction<boolean>) => {
        if (settingsLocked) return;
        setImageSearchState(value);
    }, [settingsLocked]);

    const setSafetyThresholds = useCallback((value: SetStateAction<SafetyThresholds>) => {
        if (settingsLocked) return;
        setSafetyThresholdsState(value);
    }, [settingsLocked]);

    const composerState = useMemo<WorkspaceComposerState>(
        () => ({
            prompt,
            aspectRatio,
            imageSize,
            imageStyle,
            imageModel,
            batchSize,
            outputFormat,
            temperature,
            thinkingLevel,
            includeThoughts,
            googleSearch,
            imageSearch,
            safetyThresholds,
            stickySendIntent,
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
            safetyThresholds,
            stickySendIntent,
            outputFormat,
            prompt,
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
            if (!settingsLocked) {
                setAspectRatioState(nextComposerState.aspectRatio);
                setImageSizeState(nextComposerState.imageSize);
                setImageStyleState(nextComposerState.imageStyle);
                setImageModelState(nextComposerState.imageModel);
                setBatchSizeState(nextComposerState.batchSize);
                setOutputFormatState(nextComposerState.outputFormat);
                setTemperatureState(normalizeTemperature(nextComposerState.temperature));
                setThinkingLevelState(nextComposerState.thinkingLevel);
                setIncludeThoughtsState(nextComposerState.includeThoughts);
                setGoogleSearchState(nextComposerState.googleSearch);
                setImageSearchState(nextComposerState.imageSearch);
                setSafetyThresholdsState({
                    ...DEFAULT_SAFETY_THRESHOLDS,
                    ...(nextComposerState.safetyThresholds || {}),
                });
            }
            setStickySendIntent(nextComposerState.stickySendIntent ?? 'independent');
            const mergedComposerState = settingsLocked ? {
                ...nextComposerState,
                aspectRatio,
                imageSize,
                imageStyle,
                imageModel,
                batchSize,
                outputFormat,
                temperature,
                thinkingLevel,
                includeThoughts,
                googleSearch,
                imageSearch,
                safetyThresholds,
            } : nextComposerState;
            syncPresentationState(mergedComposerState);
        },
        [
            syncPresentationState,
            settingsLocked,
            aspectRatio,
            imageSize,
            imageStyle,
            imageModel,
            batchSize,
            outputFormat,
            temperature,
            thinkingLevel,
            includeThoughts,
            googleSearch,
            imageSearch,
            safetyThresholds,
        ],
    );

    const applyViewerComposerSettingsSnapshot = useCallback(
        (snapshot: ViewerComposerSettingsSnapshot) => {
            if (settingsLocked) return;
            const normalizedSettings = normalizeViewerComposerSettingsSnapshot(snapshot, composerState.imageSize);
            const nextComposerState: WorkspaceComposerState = {
                ...composerState,
                ...normalizedSettings,
            };

            setAspectRatioState(normalizedSettings.aspectRatio);
            setImageSizeState(normalizedSettings.imageSize);
            setImageStyleState(normalizedSettings.imageStyle);
            setImageModelState(normalizedSettings.imageModel);
            setBatchSizeState(normalizedSettings.batchSize);
            setOutputFormatState(normalizedSettings.outputFormat);
            setTemperatureState(normalizedSettings.temperature);
            setThinkingLevelState(normalizedSettings.thinkingLevel);
            setIncludeThoughtsState(normalizedSettings.includeThoughts);
            setGoogleSearchState(normalizedSettings.googleSearch);
            setImageSearchState(normalizedSettings.imageSearch);
            setDisplaySettings(buildDisplaySettingsFromComposerState(nextComposerState));
        },
        [composerState, setDisplaySettings, settingsLocked],
    );

    const setGroundingMode = useCallback((mode: GroundingMode) => {
        if (settingsLocked) return;
        const nextFlags = getGroundingFlagsFromMode(mode);
        setGoogleSearchState(nextFlags.googleSearch);
        setImageSearchState(nextFlags.imageSearch);
    }, [settingsLocked]);

    const restoreEditorComposerState = useCallback(
        (
            snapshot: {
                ratio: AspectRatio;
                size: ImageSize;
                batchSize: number;
                model?: ImageModel;
                style?: ImageStyle;
                outputFormat?: OutputFormat;
                temperature?: number;
                thinkingLevel?: ThinkingLevel;
                includeThoughts?: boolean;
                googleSearch?: boolean;
                imageSearch?: boolean;
            } | null,
        ) => {
            if (!snapshot || settingsLocked) {
                return;
            }

            setAspectRatioState(snapshot.ratio);
            setImageSizeState(snapshot.size);
            setBatchSizeState(snapshot.batchSize);

            if (snapshot.model) {
                setImageModelState(snapshot.model);
            }
            if (snapshot.style) {
                setImageStyleState(snapshot.style);
            }
            if (snapshot.outputFormat) {
                setOutputFormatState(snapshot.outputFormat);
            }
            if (typeof snapshot.temperature === 'number') {
                setTemperatureState(normalizeTemperature(snapshot.temperature));
            }
            if (snapshot.thinkingLevel) {
                setThinkingLevelState(snapshot.thinkingLevel);
            }
            if (typeof snapshot.includeThoughts === 'boolean') {
                setIncludeThoughtsState(snapshot.includeThoughts);
            }
            if (typeof snapshot.googleSearch === 'boolean') {
                setGoogleSearchState(snapshot.googleSearch);
            }
            if (typeof snapshot.imageSearch === 'boolean') {
                setImageSearchState(snapshot.imageSearch);
            }
        },
        [settingsLocked],
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
        safetyThresholds,
        setSafetyThresholds,
        stickySendIntent,
        setStickySendIntent,
        composerState,
        applyComposerState,
        applyViewerComposerSettingsSnapshot,
        setGroundingMode,
        restoreEditorComposerState,
        settingsLocked,
        setSettingsLocked,
    };
}
