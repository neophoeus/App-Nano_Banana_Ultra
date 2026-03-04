import { useState, useCallback, Dispatch, SetStateAction } from 'react';
import { AspectRatio, ImageSize, ImageStyle, ImageModel, GeneratedImage as GeneratedImageType } from '../types';



interface GenerationState {
    generatedImageUrls: string[];
    selectedImageIndex: number;
    isGenerating: boolean;
    generationMode: string;
    error: string | null;
    logs: string[];
    history: GeneratedImageType[];
    displaySettings: {
        prompt: string;
        aspectRatio: AspectRatio;
        size: ImageSize;
        style: ImageStyle;
        model: ImageModel;
        batchSize: number;
    };
}

interface UseImageGenerationReturn extends GenerationState {
    setGeneratedImageUrls: Dispatch<SetStateAction<string[]>>;
    setSelectedImageIndex: Dispatch<SetStateAction<number>>;
    setIsGenerating: Dispatch<SetStateAction<boolean>>;
    setGenerationMode: Dispatch<SetStateAction<string>>;
    setError: Dispatch<SetStateAction<string | null>>;
    setLogs: Dispatch<SetStateAction<string[]>>;
    setHistory: Dispatch<SetStateAction<GeneratedImageType[]>>;
    setDisplaySettings: Dispatch<SetStateAction<GenerationState['displaySettings']>>;
    addLog: (message: string) => void;
    getActiveImageUrl: () => string;
    handleClearResults: () => void;
    handleClearHistory: () => void;
}

/**
 * Custom hook encapsulating image generation state and operations.
 * Extracts ~200 lines of state + logic from App.tsx.
 */
export function useImageGeneration(): UseImageGenerationReturn {
    const [generatedImageUrls, setGeneratedImageUrls] = useState<string[]>([]);
    const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationMode, setGenerationMode] = useState<string>("Text to Image");
    const [error, setError] = useState<string | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [history, setHistory] = useState<GeneratedImageType[]>([]);
    const [displaySettings, setDisplaySettings] = useState<GenerationState['displaySettings']>({
        prompt: '',
        aspectRatio: '1:1',
        size: '2K',
        style: 'None',
        model: 'gemini-3.1-flash-image-preview',
        batchSize: 1
    });

    const addLog = useCallback((message: string) => {
        const timestamp = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const MAX_LOGS = 200;
        setLogs(prev => [...prev, `[${timestamp}] ${message}`].slice(-MAX_LOGS));
    }, []);



    const getActiveImageUrl = useCallback(() => {
        if (generatedImageUrls.length > 0 && selectedImageIndex < generatedImageUrls.length) {
            return generatedImageUrls[selectedImageIndex];
        }
        return '';
    }, [generatedImageUrls, selectedImageIndex]);

    const handleClearResults = useCallback(() => {
        setGeneratedImageUrls([]);
        setSelectedImageIndex(0);
        setError(null);
    }, []);

    const handleClearHistory = useCallback(() => {
        setHistory([]);
        setGeneratedImageUrls([]);
        setSelectedImageIndex(0);
        setError(null);
    }, []);

    // performGeneration is intentionally left in App.tsx because it has too many
    // cross-cutting dependencies (referenceImages, prompt, apiKey, editor state, etc.)
    // Moving it here would require passing 15+ parameters which defeats the purpose.
    // Instead, only the STATE is encapsulated here.

    return {
        generatedImageUrls, setGeneratedImageUrls,
        selectedImageIndex, setSelectedImageIndex,
        isGenerating, setIsGenerating,
        generationMode, setGenerationMode,
        error, setError,
        logs, setLogs,
        history, setHistory,
        displaySettings, setDisplaySettings,
        addLog,
        getActiveImageUrl,
        handleClearResults,
        handleClearHistory,
    };
}
