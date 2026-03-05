
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { checkApiKey, promptForApiKey, generateImageWithGemini, enhancePromptWithGemini, generateRandomPrompt, resetAIClient } from './services/geminiService';
import { AspectRatio, ImageSize, ImageStyle, ImageModel, GeneratedImage as GeneratedImageType } from './types';
import Button from './components/Button';
import RatioSelector from './components/RatioSelector';
import SizeSelector from './components/SizeSelector';
import StyleSelector from './components/StyleSelector';
import GeneratedImage from './components/GeneratedImage';
import HistoryPanel from './components/HistoryPanel';
import ImageEditor from './components/ImageEditor';
import ImageUploader from './components/ImageUploader';
import BatchSelector from './components/BatchSelector';
import ModelSelector from './components/ModelSelector';
import LanguageSelector from './components/LanguageSelector';
import GlobalLogConsole from './components/GlobalLogConsole';
import ThemeToggle from './components/ThemeToggle';
import SketchPad from './components/SketchPad';
import { Language, getTranslation, SUPPORTED_LANGUAGES } from './utils/translations';
import { ASPECT_RATIOS, MODEL_CAPABILITIES } from './constants';
import { saveImageToLocal, generateThumbnail, loadFullImage } from './utils/imageSaveUtils';
import { useImageGeneration } from './hooks/useImageGeneration';
import { usePerformGeneration } from './hooks/usePerformGeneration';
import { usePromptTools } from './hooks/usePromptTools';
import { usePromptHistory, PROMPT_TEMPLATES, MAX_DISPLAY_HISTORY } from './hooks/usePromptHistory';
import Sidebar from './components/Sidebar';

const App: React.FC = () => {
    const [apiKeyReady, setApiKeyReady] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [currentLang, setCurrentLang] = useState<Language>('en');

    // Default settings
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
    const [imageSize, setImageSize] = useState<ImageSize>('2K');
    const [imageStyle, setImageStyle] = useState<ImageStyle>('None');
    const [isStyleModalOpen, setIsStyleModalOpen] = useState(false);

    // Batch Size State
    const [batchSize, setBatchSize] = useState(1);

    // Reference Images (Remix Functionality)
    const [objectImages, setObjectImages] = useState<string[]>([]);
    const [characterImages, setCharacterImages] = useState<string[]>([]);

    // Sketch Pad State (Renamed from Doodle Board)
    const [isSketchPadOpen, setIsSketchPadOpen] = useState(false);
    const [hasSketch, setHasSketch] = useState(false); // Track if a sketch is present
    const [showSketchReplaceConfirm, setShowSketchReplaceConfirm] = useState(false);

    // --- Image generation state (extracted to custom hook) ---
    const {
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
    } = useImageGeneration();

    // Model State
    const [imageModel, setImageModel] = useState<ImageModel>(displaySettings.model || 'gemini-3.1-flash-image-preview');

    // Sidebar State (Default Open)
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Editing State
    const [isEditing, setIsEditing] = useState(false);
    const [editingImageSource, setEditingImageSource] = useState<string | null>(null);

    // Direct Upload for Editor
    const uploadInputRef = useRef<HTMLInputElement>(null);

    // Toast Notification State
    const [notification, setNotification] = useState<{ msg: string, type: 'info' | 'error' } | null>(null);

    // Track the first image to prevent redundant ratio calculations
    const firstRefImageRef = useRef<string | null>(null);

    // F1: AbortController for cancelling generation
    const abortControllerRef = useRef<AbortController | null>(null);

    // Batch progress
    const [batchProgress, setBatchProgress] = useState({ completed: 0, total: 0 });

    const { promptHistory, addPrompt: addPromptToHistory, removePrompt, clearHistory: clearPromptHistory } = usePromptHistory();

    const [showPromptDropdown, setShowPromptDropdown] = useState<'history' | 'templates' | null>(null);

    // F7: Parameter Lock
    const [lockedParams, setLockedParams] = useState<{ ratio: boolean; size: boolean; style: boolean; model: boolean }>({
        ratio: false, size: false, style: false, model: false
    });
    const toggleLock = (key: 'ratio' | 'size' | 'style' | 'model') => setLockedParams(prev => ({ ...prev, [key]: !prev[key] }));

    // P7-1: Enter to submit toggle
    const [enterToSubmit, setEnterToSubmit] = useState(() => {
        const saved = localStorage.getItem('nbu_enterToSubmit');
        return saved !== null ? saved === 'true' : true;
    });
    const toggleEnterToSubmit = () => {
        setEnterToSubmit(prev => {
            localStorage.setItem('nbu_enterToSubmit', String(!prev));
            return !prev;
        });
    };

    const showNotification = useCallback((message: string, type: 'info' | 'error' = 'info') => {
        setNotification({ msg: message, type });
        setTimeout(() => setNotification(null), 3000);
    }, []);

    const t = useCallback((key: string) => getTranslation(currentLang, key), [currentLang]);

    const handleApiKeyConnect = async () => {
        try {
            await promptForApiKey();
            setApiKeyReady(true);
        } catch (e) {
            console.error("Failed to select key", e);
        }
    };

    const { performGeneration } = usePerformGeneration({
        t, apiKeyReady, setApiKeyReady, handleApiKeyConnect,
        setIsGenerating, setError, setGeneratedImageUrls, setSelectedImageIndex,
        setLogs, addLog, abortControllerRef,
        objectImages, characterImages, batchSize, aspectRatio,
        setBatchProgress, setGenerationMode, setDisplaySettings,
        showNotification, setHistory, setIsEditing, setEditingImageSource,
        addPromptToHistory
    });

    const hasDataRef = useRef(false);
    useEffect(() => {
        hasDataRef.current = history.length > 0 || generatedImageUrls.length > 0;
    }, [history.length, generatedImageUrls.length]);

    // --- Enforce Model Constraints ---
    useEffect(() => {
        const caps = MODEL_CAPABILITIES[imageModel];
        if (caps) {
            // Check Size
            if (caps.supportedSizes.length > 0 && !caps.supportedSizes.includes(imageSize)) {
                // If the selected size is not supported, default to 1K or the closest match
                const fallbackSize = caps.supportedSizes.includes('1K') ? '1K' : caps.supportedSizes[0];
                if (!lockedParams.size) setImageSize(fallbackSize);
            }

            // Check Ratio
            if (caps.supportedRatios.length > 0 && !caps.supportedRatios.includes(aspectRatio)) {
                // Default to 1:1 if unsupported
                const fallbackRatio = caps.supportedRatios.includes('1:1') ? '1:1' : caps.supportedRatios[0];
                if (!lockedParams.ratio) setAspectRatio(fallbackRatio);
            }

            // Check Reference Images Count
            setObjectImages(prevImages => {
                if (prevImages.length > caps.maxObjects) {
                    showNotification(`Object images trimmed to ${caps.maxObjects} due to model constraints.`, 'info');
                    return prevImages.slice(0, caps.maxObjects);
                }
                return prevImages;
            });

            setCharacterImages(prevImages => {
                if (prevImages.length > caps.maxCharacters) {
                    showNotification(`Character images trimmed to ${caps.maxCharacters} due to model constraints.`, 'info');
                    return prevImages.slice(0, caps.maxCharacters);
                }
                return prevImages;
            });
        }
    }, [imageModel, imageSize, aspectRatio, lockedParams, showNotification]);

    useEffect(() => {
        // Initial check for API key
        checkApiKey().then(setApiKeyReady);

        // Try to detect browser language
        const browserLang = navigator.language.split('-')[0];
        if (browserLang === 'zh') {
            setCurrentLang(navigator.language === 'zh-CN' ? 'zh_CN' : 'zh_TW');
        } else if (['ja', 'ko', 'es', 'fr', 'de', 'ru'].includes(browserLang)) {
            setCurrentLang(browserLang as Language);
        }

        // Add browser native unload warning (ref-based to avoid stale closure)
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasDataRef.current) {
                e.preventDefault();
                e.returnValue = '';
                return '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []); // Empty deps: register once, read from ref


    // --- Auto Aspect Ratio Logic ---
    useEffect(() => {
        // If no images at all, do nothing (keep user selection)
        if (objectImages.length === 0 && characterImages.length === 0) {
            firstRefImageRef.current = null;
            return;
        }

        const firstImage = objectImages.length > 0 ? objectImages[0] : characterImages[0];

        // Only run if the first image effectively changed
        if (firstImage === firstRefImageRef.current) return;
        firstRefImageRef.current = firstImage;

        const img = new Image();
        img.src = firstImage;
        img.onload = () => {
            const w = img.width;
            const h = img.height;
            const targetRatio = w / h;

            let bestRatio: AspectRatio = '1:1';
            let minDiff = Infinity;

            ASPECT_RATIOS.forEach(r => {
                const [rw, rh] = r.value.split(':').map(Number);
                const rVal = rw / rh;
                const diff = Math.abs(targetRatio - rVal);
                if (diff < minDiff) {
                    minDiff = diff;
                    bestRatio = r.value;
                }
            });

            setAspectRatio(bestRatio);
            const msg = t('autoRatioSet').replace('{0}', bestRatio);

            // Optional: Add log but don't show annoying notification popup every time
            addLog(msg);
        };
    }, [objectImages, characterImages, currentLang, addLog, t]);

    // Helper to translate style name
    const getStyleLabel = (style: string) => {
        const key = 'style' + style.replace(/[^a-zA-Z0-9]/g, '');
        return t(key);
    };


    const getLanguageLabel = () => {
        const langObj = SUPPORTED_LANGUAGES.find(l => l.value === currentLang);
        return langObj ? langObj.label : 'English';
    };

    // --- Prompt tools (extracted to custom hook) ---
    const { isEnhancingPrompt, handleSmartRewrite: _smartRewrite, handleSurpriseMe: _surpriseMe } = usePromptTools({
        getLanguageLabel,
        addLog,
        showNotification,
        t,
        apiKeyReady,
        handleApiKeyConnect,
    });
    const handleAddToCharacterReference = () => {
        const url = getActiveImageUrl();
        if (url) {
            setCharacterImages(prev => {
                const max = MODEL_CAPABILITIES[imageModel].maxCharacters;
                if (prev.length >= max) {
                    showNotification(t('errorMaxRefs'), 'info');
                    return prev;
                }
                return [...prev, url];
            });
            showNotification(t('notificationAddedToRef'), 'info');
        }
    };

    const handleSmartRewrite = () => _smartRewrite(prompt, setPrompt);
    const handleSurpriseMe = () => _surpriseMe(setPrompt);

    const handleAddToObjectReference = () => {
        const activeUrl = getActiveImageUrl();
        if (!activeUrl) return;
        if (objectImages.length >= MODEL_CAPABILITIES[imageModel].maxObjects) {
            showNotification(t('errorMaxRefs'), 'error');
            return;
        }
        setObjectImages(prev => [...prev, activeUrl]);
        addLog(t('logAddedToRef'));
        showNotification(t('notificationAddedToRef'), 'info');
    };

    // --- Sketch Pad / Reference Logic ---

    const handleOpenSketchPad = () => {
        // If we already have a sketch in references, warn user
        if (hasSketch && objectImages.length > 0) {
            setShowSketchReplaceConfirm(true);
        } else {
            setIsSidebarOpen(false); // Auto-close sidebar
            setIsSketchPadOpen(true);
        }
    };

    const handleSketchPadSave = (base64: string) => {
        let newRefs = [...objectImages];

        if (hasSketch && newRefs.length > 0) {
            // Scenario: Replace existing sketch at index 0
            newRefs[0] = base64;
        } else {
            // Scenario: New sketch, insert at top
            newRefs.unshift(base64);

            // Truncate if > limit
            if (newRefs.length > MODEL_CAPABILITIES[imageModel].maxObjects) {
                newRefs.pop();
            }
            setHasSketch(true);
        }

        setObjectImages(newRefs);
        setIsSketchPadOpen(false);
        setIsSidebarOpen(true); // Auto-open sidebar when sketchpad closes
        showNotification(t('notificationAddedToRef'), 'info');
    };

    const handleRemoveObjectReference = (indexToRemove: number) => {
        // If removing the first image and it was a sketch, reset the flag
        if (indexToRemove === 0 && hasSketch) {
            setHasSketch(false);
        }
        setObjectImages(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleRemoveCharacterReference = (indexToRemove: number) => {
        setCharacterImages(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleUploadForEdit = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showNotification(t('errInvalidImage'), 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
            const result = ev.target?.result as string;

            const img = new Image();
            img.onload = () => {
                const MAX_DIMENSION = 4096;
                let finalResult = result;
                let wasResized = false;

                if (img.width > MAX_DIMENSION || img.height > MAX_DIMENSION) {
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        height = Math.round((height * MAX_DIMENSION) / width);
                        width = MAX_DIMENSION;
                    } else {
                        width = Math.round((width * MAX_DIMENSION) / height);
                        height = MAX_DIMENSION;
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0, width, height);
                        finalResult = canvas.toDataURL(file.type);
                        wasResized = true;
                    }
                }

                setEditingImageSource(finalResult);
                // setPrompt(""); // Don't clear main prompt, just don't bring it in (editor has its own prompt state)
                setIsSidebarOpen(false); // Auto-close sidebar
                setIsEditing(true);
                setError(null); // Clear any previous errors when starting new edit

                if (wasResized) {
                    addLog(t('msgImageResized'));
                    showNotification(t('msgImageResized'), 'info');
                } else {
                    addLog(t('logImageUploaded'));
                }
            };
            img.src = result;
        };
        reader.readAsDataURL(file);
        if (uploadInputRef.current) uploadInputRef.current.value = '';
    };



    const handleGenerate = () => {
        performGeneration(prompt, aspectRatio, imageSize, imageStyle, imageModel);
    };

    // F1: Cancel generation
    const handleCancelGeneration = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            setIsGenerating(false);
            addLog(t('logCancelled'));
        }
    };

    const handleHistorySelect = (item: GeneratedImageType) => {
        if (item.status === 'failed') {
            // Failed Item Selection: Clear current images and show error
            setGeneratedImageUrls([]);
            setSelectedImageIndex(0);
            setError(item.error || t('statusFailed'));
            setLogs([`[${new Date(item.createdAt).toLocaleTimeString()}] History: Failed - ${item.error}`]);
        } else {
            // Success Item Selection
            setGeneratedImageUrls([item.url]); // Show thumbnail first
            setSelectedImageIndex(0);
            setError(null);
            setLogs([`[${new Date(item.createdAt).toLocaleTimeString()}] ${t('logHistoryLoaded')}`]);

            // F8: Load Full Image if available
            if (item.savedFilename) {
                loadFullImage(item.savedFilename).then(fullUrl => {
                    if (fullUrl) {
                        setGeneratedImageUrls([fullUrl]); // Replace thumbnail with full quality
                    }
                }).catch(err => {
                    console.warn('loadFullImage failed:', err.message);
                });
            }
        }

        const handleDeleteHistoryItem = (e: React.MouseEvent, id: string, promptText: string) => {
            e.stopPropagation();
            setHistory(prev => prev.filter(h => h.id !== id));
            // F3: Also remove from saved prompt history if deleted from results history
            removePrompt(promptText);
        };
        // F7: Restore Input State — respect locked parameters
        if (!lockedParams.ratio) setAspectRatio(item.aspectRatio);
        if (!lockedParams.size) setImageSize(item.size);
        if (!lockedParams.style) setImageStyle(item.style);
        if (!lockedParams.model) setImageModel(item.model || 'gemini-3.1-flash-image-preview');

        // Update Display State to match selected history item
        setDisplaySettings({
            prompt: item.prompt,
            aspectRatio: item.aspectRatio,
            size: item.size,
            style: item.style,
            model: item.model || 'gemini-3.1-flash-image-preview',
            batchSize: 1
        });

        // Auto-detect mode
        const histMode = item.mode || "Text to Image";
        setGenerationMode(histMode);

        setObjectImages([]); // Reset references for history load
        setCharacterImages([]);

        setIsGenerating(false);
    };

    const handleOpenEditor = () => {
        const activeUrl = getActiveImageUrl();
        if (activeUrl) {
            console.log("Opening Editor with active URL:", activeUrl);
            setEditingImageSource(activeUrl);
            setIsSidebarOpen(false); // Auto-close sidebar
            setIsEditing(true);
            setError(null);
        } else {
            console.log("Opening Editor via File Upload prompt...");
            const inputEl = document.getElementById('global-upload-input') as HTMLInputElement;
            if (inputEl) {
                inputEl.click();
            } else if (uploadInputRef.current) {
                uploadInputRef.current.click();
            } else {
                console.error("uploadInputRef and global-upload-input are both missing!");
            }
        }
    };

    const handleEditorGenerate = (
        editPrompt: string,
        imageBase64: string,
        editBatchSize: number,
        editSize: ImageSize,
        mode: string,
        objectImages?: string[],
        characterImages?: string[],
        targetRatio?: AspectRatio
    ) => {
        // FORCE style to 'None' for editor to ignore homepage selection
        // Also use editSize as the targetSize (3rd arg) to be explicit
        performGeneration(
            editPrompt,
            targetRatio,
            editSize,
            'None',
            imageModel,
            imageBase64,
            editBatchSize,
            undefined,
            mode,
            objectImages,
            characterImages
        );
    };

    // Determine what settings/prompt to display in the main view
    // 1. If generating or if we have results, show the frozen settings used for this generation (displaySettings)
    // 2. If empty/idle, show the live sidebar state so the user sees what they are setting up
    const isShowingResultOrLoading = generatedImageUrls.length > 0 || isGenerating;

    const viewPrompt = isShowingResultOrLoading ? displaySettings.prompt : prompt;
    const viewSettings = isShowingResultOrLoading ? {
        aspectRatio: displaySettings.aspectRatio,
        size: displaySettings.size,
        style: displaySettings.style,
        batchSize: displaySettings.batchSize,
        model: displaySettings.model
    } : {
        aspectRatio: aspectRatio,
        size: imageSize,
        style: imageStyle,
        batchSize: batchSize,
        model: imageModel
    };

    return (
        <div className="h-screen w-full bg-gray-50 dark:bg-[#050505] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50 via-white to-gray-100 dark:from-[#1a1c29] dark:via-[#0f1115] dark:to-black text-gray-900 dark:text-gray-100 font-sans selection:bg-amber-500/30 selection:text-amber-200 relative overflow-hidden flex flex-col transition-colors duration-500">

            {/* Floating Controls Container (Log + Lang + Theme) */}
            <div className="fixed bottom-4 right-4 z-[9999] flex items-end gap-2 pointer-events-none">
                <div className="pointer-events-auto">
                    <GlobalLogConsole logs={logs} isLoading={isGenerating} currentLanguage={currentLang} />
                </div>
                <div className="pointer-events-auto flex flex-col gap-2">
                    <ThemeToggle currentLanguage={currentLang} />
                    <LanguageSelector currentLanguage={currentLang} onLanguageChange={setCurrentLang} />
                </div>
            </div>

            {notification && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[300] animate-[fadeIn_0.3s_ease-out] w-max max-w-[90vw]">
                    <div className={`${notification.type === 'error' ? 'bg-red-500/90 border-red-400/50 shadow-red-500/40' : 'bg-amber-500/90 border-amber-300/50 shadow-amber-500/40'} text-white px-6 py-3 rounded-full shadow-[0_0_40px_rgba(0,0,0,0.5)] backdrop-blur-md flex items-center gap-3 border`}>
                        {notification.type === 'error' ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        )}
                        <span className="font-extrabold text-sm">{notification.msg}</span>
                    </div>
                </div>
            )}

            {/* Style Selection Modal */}
            {isStyleModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 dark:bg-black/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
                    <div className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-gray-700 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden relative transition-colors">
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#0a0c10]">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                <span className="text-2xl">🎨</span> {t('style')}
                            </h3>
                            <button
                                onClick={() => setIsStyleModalOpen(false)}
                                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto scrollbar-thin bg-gray-50 dark:bg-[#0a0c10]">
                            <StyleSelector
                                selectedStyle={imageStyle}
                                onSelect={(s) => {
                                    setImageStyle(s);
                                    setIsStyleModalOpen(false);
                                }}
                                currentLanguage={currentLang}
                                label=""
                                className="h-full"
                            />
                        </div>
                    </div>
                    <div className="absolute inset-0 -z-10" onClick={() => setIsStyleModalOpen(false)}></div>
                </div>
            )}

            {/* Sketch Pad Modal (Renamed from Doodle Board) */}
            {isSketchPadOpen && (
                <SketchPad
                    onSave={handleSketchPadSave}
                    onClose={() => {
                        setIsSketchPadOpen(false);
                        setIsSidebarOpen(true); // Auto-open sidebar when sketchpad closes
                    }}
                    currentLanguage={currentLang}
                    imageModel={imageModel}
                    onModelChange={setImageModel}
                />
            )}

            {/* Sketch Replacement Confirmation Dialog */}
            {showSketchReplaceConfirm && (
                <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.1s_ease-out]" onClick={() => setShowSketchReplaceConfirm(false)}>
                    <div className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-gray-700 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden p-6 text-center transform scale-100" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                            {t('sketchReplaceTitle')}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                            {t('sketchReplaceMsg')}
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowSketchReplaceConfirm(false)}
                                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                {t('clearHistoryCancel')}
                            </button>
                            <button
                                onClick={() => {
                                    setShowSketchReplaceConfirm(false);
                                    setIsSidebarOpen(false); // Auto-close sidebar
                                    setIsSketchPadOpen(true);
                                }}
                                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-bold text-white shadow-lg transition-all bg-amber-500 hover:bg-amber-600 shadow-amber-500/30"
                            >
                                {t('sketchReplaceConfirm')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <input
                id="global-upload-input"
                type="file"
                ref={uploadInputRef}
                onChange={handleUploadForEdit}
                className="hidden"
                accept="image/*"
            />

            {isEditing && (
                <ImageEditor
                    initialImageUrl={editingImageSource || ''}
                    initialPrompt=""
                    initialSize={imageSize}
                    onGenerate={handleEditorGenerate}
                    onCancel={() => {
                        setIsEditing(false);
                        setEditingImageSource(null);
                        setIsSidebarOpen(true); // Auto-open sidebar when editor closes
                    }}
                    isGenerating={isGenerating}
                    currentLanguage={currentLang}
                    currentLog={logs.length > 0 ? logs[logs.length - 1] : ''}
                    error={error}
                    onErrorClear={() => setError(null)}
                    imageModel={imageModel}
                    onModelChange={setImageModel}
                />
            )}

            <div className="flex-1 flex overflow-hidden relative">
                <Sidebar
                    isSidebarOpen={isSidebarOpen}
                    setIsSidebarOpen={setIsSidebarOpen}
                    prompt={prompt} setPrompt={setPrompt}
                    enterToSubmit={enterToSubmit} toggleEnterToSubmit={toggleEnterToSubmit}
                    handleGenerate={handleGenerate} handleCancelGeneration={handleCancelGeneration} isGenerating={isGenerating}
                    showPromptDropdown={showPromptDropdown} setShowPromptDropdown={setShowPromptDropdown}
                    promptHistory={promptHistory} removePrompt={removePrompt} clearPromptHistory={clearPromptHistory}
                    handleSmartRewrite={handleSmartRewrite} handleSurpriseMe={handleSurpriseMe} isEnhancingPrompt={isEnhancingPrompt}
                    objectImages={objectImages} setObjectImages={setObjectImages}
                    characterImages={characterImages} setCharacterImages={setCharacterImages}
                    imageModel={imageModel} setImageModel={setImageModel}
                    imageSize={imageSize} setImageSize={setImageSize}
                    imageStyle={imageStyle} setImageStyle={setImageStyle}
                    aspectRatio={aspectRatio} setAspectRatio={setAspectRatio}
                    batchSize={batchSize} setBatchSize={setBatchSize}
                    lockedParams={lockedParams} toggleLock={toggleLock}
                    isStyleModalOpen={isStyleModalOpen} setIsStyleModalOpen={setIsStyleModalOpen}
                    currentLang={currentLang} t={t} getStyleLabel={getStyleLabel}
                    showNotification={showNotification} handleOpenSketchPad={handleOpenSketchPad}
                    handleRemoveObjectReference={handleRemoveObjectReference} handleRemoveCharacterReference={handleRemoveCharacterReference}
                    apiKeyReady={apiKeyReady} handleApiKeyConnect={handleApiKeyConnect}
                />

                <main className="flex-1 flex flex-col h-full bg-gray-50 dark:bg-[#050505] relative w-full overflow-hidden transition-colors duration-500">

                    {/* Header Bar */}
                    <div className="flex justify-between items-center px-4 lg:px-6 py-3 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-[#0a0c10] shrink-0 h-16 z-30 transition-colors">
                        {/* Left: Toggle + Logo + Title */}
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white bg-gray-100 dark:bg-gray-800/50 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                title={t('uiToggleSidebar')}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    {isSidebarOpen ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                                    ) : (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    )}
                                </svg>
                            </button>

                            <div className="flex items-center gap-3 group cursor-pointer">
                                <div className="relative w-8 h-8">
                                    <div className="absolute inset-0 bg-amber-500 blur-lg opacity-20 group-hover:opacity-40 transition-opacity rounded-full"></div>
                                    <div className="relative w-full h-full rounded-xl bg-gradient-to-br from-yellow-400 to-orange-600 flex items-center justify-center text-lg shadow-lg shadow-amber-500/20 border border-yellow-300/30">
                                        🍌
                                    </div>
                                </div>
                                <h1 className="text-lg font-black italic tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-yellow-500 via-amber-600 to-yellow-600 dark:from-yellow-200 dark:via-amber-400 dark:to-yellow-200 hidden sm:block">
                                    {t('appTitle')}
                                </h1>
                            </div>
                        </div>

                        {/* Right: Auto-Save Indicator + Privacy */}
                        <div className="flex items-center gap-6">
                            <div className="flex flex-col items-end gap-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-emerald-500 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                        {t('autoDownload')}
                                    </span>
                                    <span className="text-[10px] text-gray-400 dark:text-gray-600 font-mono px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">Renders/API/</span>
                                </div>
                                <span className="text-[10px] text-gray-400 dark:text-gray-600 font-mono tracking-tight hidden sm:inline">{t('privacyNote')}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 lg:p-6 pb-32 lg:pb-6 relative scrollbar-thin">

                        <div className="max-w-5xl mx-auto h-full flex flex-col gap-6">
                            {/* Main Image Container */}
                            <div className="w-full max-w-[600px] aspect-square mx-auto bg-white dark:bg-black/40 rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl relative group overflow-hidden flex flex-col shrink-0 transition-colors">
                                <GeneratedImage
                                    imageUrls={generatedImageUrls}
                                    selectedImageUrl={getActiveImageUrl()}
                                    onSelectImage={(url) => {
                                        const idx = generatedImageUrls.indexOf(url);
                                        if (idx !== -1) setSelectedImageIndex(idx);
                                    }}
                                    isLoading={isGenerating}
                                    generationMode={generationMode}
                                    // Decoupled Display Props with Live Feedback Fallback
                                    // If we are generating or have results, show the frozen settings (displaySettings).
                                    // If we are idle/empty, show live inputs (prompt/aspectRatio/etc) so user sees what they are setting up.
                                    prompt={(generatedImageUrls.length > 0 || isGenerating) ? displaySettings.prompt : prompt}
                                    settings={(generatedImageUrls.length > 0 || isGenerating) ? {
                                        aspectRatio: displaySettings.aspectRatio,
                                        size: displaySettings.size,
                                        style: displaySettings.style,
                                        model: displaySettings.model,
                                        batchSize: displaySettings.batchSize
                                    } : {
                                        aspectRatio: aspectRatio,
                                        size: imageSize,
                                        style: imageStyle,
                                        model: imageModel,
                                        batchSize: batchSize
                                    }}
                                    error={error}
                                    onEdit={generatedImageUrls.length > 0 ? handleOpenEditor : undefined}
                                    onGenerate={handleGenerate}
                                    onAddToObjectReference={generatedImageUrls.length > 0 ? handleAddToObjectReference : undefined}
                                    onAddToCharacterReference={(generatedImageUrls.length > 0 && MODEL_CAPABILITIES[imageModel].maxCharacters > 0) ? handleAddToCharacterReference : undefined}
                                    onUpload={handleOpenEditor}
                                    onClear={handleClearResults}
                                    currentLanguage={currentLang}
                                    currentLog={logs.length > 0 ? logs[logs.length - 1] : ''}
                                />
                            </div>

                            <HistoryPanel
                                history={history}
                                onSelect={handleHistorySelect}
                                selectedUrl={getActiveImageUrl()}
                                disabled={isGenerating}
                                title={t('history')}
                                currentLanguage={currentLang}
                                onClear={handleClearHistory}
                            />

                            <footer className="mt-12 mb-6 text-center opacity-40 hover:opacity-80 transition-opacity duration-500">
                                <p className="text-sm font-black italic tracking-tighter text-gray-400 dark:text-gray-500 mb-1">
                                    {t('appTitle')} <span className="not-italic">🍌</span>
                                </p>
                                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-[10px] uppercase tracking-widest font-bold text-gray-500 dark:text-gray-600">
                                    <a
                                        href="https://neophoeus.art"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="hover:text-amber-500 transition-colors cursor-pointer"
                                    >
                                        {t('footerDesigned')}
                                    </a>
                                    <span className="hidden sm:inline text-gray-400 dark:text-gray-800">•</span>
                                    <span>{t('footerPowered')}</span>
                                </div>
                            </footer>
                        </div>
                    </div>
                </main>
            </div >

            {isSidebarOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40" // z-40 to be over z-30
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}
        </div >
    );
};

export default App;
