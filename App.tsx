
import React, { useState, useEffect, useRef } from 'react';
import { checkApiKey, promptForApiKey, generateImageWithGemini, enhancePromptWithGemini, generateRandomPrompt, resetAIClient } from './services/geminiService';
import { AspectRatio, ImageSize, ImageStyle, ImageModel, GeneratedImage as GeneratedImageType } from './types';
import Button from './components/Button';
import RatioSelector from './components/RatioSelector';
import SizeSelector from './components/SizeSelector';
import StyleSelector, { getStyleIcon } from './components/StyleSelector';
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
import { usePromptTools } from './hooks/usePromptTools';
import { usePromptHistory, PROMPT_TEMPLATES } from './hooks/usePromptHistory';

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

    // F4: Batch progress tracking
    const [batchProgress, setBatchProgress] = useState<{ completed: number; total: number }>({ completed: 0, total: 0 });

    // F3: Prompt History
    const { promptHistory, addPrompt: addPromptToHistory, removePrompt: removePromptFromHistory, clearHistory: clearPromptHistory } = usePromptHistory();
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
    }, [imageModel, imageSize, aspectRatio, lockedParams]);

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

    const t = (key: string) => getTranslation(currentLang, key);

    // --- Auto Aspect Ratio Logic ---
    useEffect(() => {
        // If no images at all, do nothing (keep user selection)
        if (objectImages.length === 0 && characterImages.length === 0) {
            firstRefImageRef.current = null;
            // If reference images are cleared, reset hasSketch if it was true (safety net)
            if (hasSketch) setHasSketch(false);
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
    }, [objectImages, characterImages, currentLang, hasSketch]);

    // Helper to translate style name
    const getStyleLabel = (style: string) => {
        const key = 'style' + style.replace(/[^a-zA-Z0-9]/g, '');
        return t(key);
    };

    const handleApiKeyConnect = async () => {
        try {
            await promptForApiKey();
            setApiKeyReady(true);
        } catch (e) {
            console.error("Failed to select key", e);
        }
    };

    const showNotification = (message: string, type: 'info' | 'error' = 'info') => {
        setNotification({ msg: message, type });
        setTimeout(() => setNotification(null), 3000);
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

    const performGeneration = async (
        targetPrompt: string,
        targetRatio: AspectRatio | undefined,
        targetSize: ImageSize,
        targetStyle: ImageStyle,
        targetModel: ImageModel,
        editingInput?: string,
        customBatchSize?: number,
        customSize?: ImageSize,
        explicitMode?: string,
        extraObjectImages?: string[],
        extraCharacterImages?: string[]
    ) => {
        // Check if we are in "Style Transfer Mode" (Ref Images + Style Selected)
        // In this mode, we allow empty prompts.
        const isStyleTransfer = (objectImages.length > 0 || characterImages.length > 0) && targetStyle !== 'None' && !editingInput;

        if (!targetPrompt.trim() && !editingInput && !isStyleTransfer) {
            showNotification(t('errorNoPrompt'), 'error');
            return;
        }

        // Auto-fill prompt for Style Transfer if empty
        let finalPrompt = targetPrompt;
        if (isStyleTransfer && !finalPrompt.trim()) {
            finalPrompt = `Transform the visual content of the reference image into ${targetStyle} style. Maintain the original composition but apply the ${targetStyle} aesthetic characteristics strongly.`;
            addLog(t('logAutoFillStyle'));
        }

        if (!apiKeyReady) {
            await handleApiKeyConnect();
            const ready = await checkApiKey();
            if (!ready) return;
            setApiKeyReady(true);
        }

        setIsGenerating(true);
        setError(null);
        setGeneratedImageUrls([]);
        setSelectedImageIndex(0);
        setLogs([]);

        // F1: Create new AbortController for this generation
        const controller = new AbortController();
        abortControllerRef.current = controller;


        let finalObjectInputs: string[] = [];
        let finalCharacterInputs: string[] = [];

        if (editingInput) {
            finalObjectInputs = [editingInput];
            if (extraObjectImages && extraObjectImages.length > 0) {
                finalObjectInputs = [...finalObjectInputs, ...extraObjectImages];
            }
            if (extraCharacterImages && extraCharacterImages.length > 0) {
                finalCharacterInputs = [...extraCharacterImages];
            }
        } else {
            if (objectImages.length > 0) finalObjectInputs = objectImages;
            if (characterImages.length > 0) finalCharacterInputs = characterImages;
        }

        const currentBatchSize = customBatchSize !== undefined ? customBatchSize : batchSize;
        const currentImageSize = customSize || targetSize;

        // F4: Reset progress
        setBatchProgress({ completed: 0, total: currentBatchSize });

        let currentMode = explicitMode;
        if (!currentMode) {
            if (editingInput) currentMode = "Inpainting";
            else if (objectImages.length > 0 || characterImages.length > 0) currentMode = "Image to Image/Mixing";
            else currentMode = "Text to Image";
        }
        setGenerationMode(currentMode);

        const effectiveAspectRatio = editingInput ? targetRatio : (targetRatio || aspectRatio);

        // Update display settings to match THIS generation
        // This allows the UI to show the correct metadata for the generated image
        // without overwriting the user's input fields (sidebar).
        setDisplaySettings({
            prompt: finalPrompt,
            aspectRatio: effectiveAspectRatio || '1:1',
            size: currentImageSize,
            style: targetStyle,
            batchSize: currentBatchSize,
            model: targetModel
        });

        try {
            addLog(t('logMode').replace('{0}', currentMode));
            addLog(t('logSource'));
            addLog(t('logRequesting').replace('{0}', currentBatchSize.toString()).replace('{1}', currentImageSize));

            const handleImageReceived = async (url: string): Promise<string | undefined> => {
                setGeneratedImageUrls(prev => [...prev, url]);
                // F5: Build metadata for auto-save
                const metadata = {
                    prompt: finalPrompt,
                    style: targetStyle,
                    aspectRatio: effectiveAspectRatio || '1:1',
                    size: currentImageSize,
                    mode: currentMode,
                };
                // Auto-save full image to local filesystem
                const prefix = editingInput ? `${targetModel}-edit` : `${targetModel}-gen`;
                const savedPath = await saveImageToLocal(url, prefix, metadata);

                if (savedPath) {
                    const filename = savedPath.split(/[\\/]/).pop();
                    addLog(`💾 Saved: ${filename}`);
                    return filename; // Return filename to be captured in GenerationResult
                } else {
                    addLog('⚠️ Auto-save failed');
                    return undefined;
                }
            };

            const handleLogCallback = (msg: string) => {
                addLog(msg);
            };

            const results = await generateImageWithGemini({
                prompt: finalPrompt,
                aspectRatio: effectiveAspectRatio,
                imageSize: currentImageSize,
                style: targetStyle,
                objectImageInputs: finalObjectInputs,
                characterImageInputs: finalCharacterInputs,
                model: targetModel
            }, currentBatchSize, handleImageReceived, handleLogCallback, controller.signal,
                // F4: Progress callback
                (completed, total) => setBatchProgress({ completed, total })
            );

            // Process Results: generate thumbnails for history (non-blocking)

            const newHistoryItems: GeneratedImageType[] = await Promise.all(
                results.map(async (res) => {
                    // For successful results, generate a lightweight thumbnail for history
                    let thumbnailUrl = '';
                    if (res.status === 'success' && res.url) {
                        try {
                            thumbnailUrl = await generateThumbnail(res.url);
                        } catch {
                            thumbnailUrl = res.url; // Fallback to full URL
                        }
                    }
                    const histItem = {
                        id: crypto.randomUUID(),
                        url: thumbnailUrl,
                        prompt: finalPrompt || "Auto-fill",
                        aspectRatio: effectiveAspectRatio || '1:1',
                        size: currentImageSize,
                        style: targetStyle,
                        model: targetModel,
                        createdAt: Date.now(),
                        mode: currentMode,
                        status: res.status,
                        error: res.error,
                        savedFilename: res.savedFilename // F8: Direct from GenerationResult
                    };
                    return histItem;
                })
            );

            // Update History (F8: No Cap)
            setHistory(prev => [...newHistoryItems, ...prev]);

            // Count Successes
            const successCount = results.filter(r => r.status === 'success').length;
            const failCount = results.filter(r => r.status === 'failed').length;

            if (successCount === 0 && failCount > 0) {
                // All failed
                setError(results[0].error || t('errorAllFailed'));
            }

            if (editingInput && successCount > 0) {
                setIsEditing(false);
                setEditingImageSource(null);
            }

            addLog(t('logSuccessFail').replace('{0}', successCount.toString()).replace('{1}', failCount.toString()));

            // F3: Save prompt to history on any success
            if (successCount > 0 && finalPrompt) {
                addPromptToHistory(finalPrompt);
            }

        } catch (err: any) {
            console.error(err);
            const errorMessage = err.message || "Unknown error";

            if (errorMessage === "API_KEY_INVALID" || errorMessage.includes("API key")) {
                addLog(t('logFatalError').replace('{0}', errorMessage));
                setError(t('errorApiKey'));
                setApiKeyReady(false);
                await promptForApiKey();
            } else {
                // This catch block is for major system failures (e.g. key auth),
                // individual image failures are handled in the results array above.
                setError(errorMessage);
                showNotification(t('statusFailed'), 'error');
            }
        } finally {
            setIsGenerating(false);
            abortControllerRef.current = null;
            setBatchProgress({ completed: 0, total: 0 });
        }
    };

    const handleGenerate = () => {
        performGeneration(prompt, aspectRatio, imageSize, imageStyle, imageModel);
    };

    // F1: Cancel generation
    const handleCancelGeneration = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            setIsGenerating(false);
            addLog('🛑 Generation cancelled by user');
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

        // F7: Restore Input State — respect locked parameters
        setPrompt(item.prompt);
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
                    onClose={() => setIsSketchPadOpen(false)}
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

                {/* Sidebar Controls */}
                <aside
                    className={`
               bg-white dark:bg-[#0a0c10] border-r border-gray-200 dark:border-gray-800 overflow-y-auto scrollbar-thin
               transition-all duration-300 ease-in-out z-[100]
               fixed lg:relative top-0
               ${isSidebarOpen ? 'w-[340px] translate-x-0' : 'w-0 -translate-x-full lg:translate-x-0 lg:w-0 opacity-0'}
            `}
                    style={{
                        height: '100%'
                    }}
                >
                    <div className="px-4 py-2 space-y-3 pb-24 lg:pb-8 min-w-[300px]">
                        {/* Mobile Close */}
                        <div className="lg:hidden flex justify-end items-center pb-2">
                            <button onClick={() => setIsSidebarOpen(false)} className="text-gray-500 p-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-2">
                            {/* Prompt Label & Connect Key */}
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('promptLabel')}</label>

                                {!apiKeyReady ? (
                                    <button
                                        onClick={handleApiKeyConnect}
                                        className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-amber-500/50 hover:text-amber-600 dark:hover:text-amber-400 rounded text-[10px] font-bold transition-all text-gray-500 dark:text-gray-400"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                        </svg>
                                        <span className="truncate max-w-[100px]">{t('connectKey')}</span>
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/30 rounded text-[10px] text-emerald-600 dark:text-emerald-400 font-bold select-none cursor-default shadow-sm">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-[pulse_2s_infinite]"></span>
                                        <span className="truncate max-w-[100px] tracking-wide">{t('connected')}</span>
                                    </div>
                                )}
                            </div>

                            {/* Prompt Text Area */}
                            <div className="relative group">
                                <textarea
                                    className="w-full h-40 bg-gray-50 dark:bg-[#050505] border border-gray-200 dark:border-gray-700 rounded-xl px-3 pt-3 pb-8 text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:ring-1 focus:ring-amber-500/50 resize-none scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-800 scrollbar-track-transparent transition-colors"
                                    placeholder={t('placeholder')}
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (enterToSubmit && e.key === 'Enter' && !e.shiftKey && !isGenerating) {
                                            e.preventDefault();
                                            handleGenerate();
                                        }
                                    }}
                                />

                                {prompt && (
                                    <button
                                        onClick={() => setPrompt('')}
                                        className="absolute top-2 right-2 p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                        title={t('clear')}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M9 2a1 1 0 01-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                )}
                            </div>

                            {/* P7-1: Enter to Submit Toggle */}
                            <div className="flex items-center justify-between px-1">
                                <button
                                    onClick={toggleEnterToSubmit}
                                    className={`flex items-center gap-1.5 text-[10px] font-medium transition-colors ${enterToSubmit ? 'text-amber-500' : 'text-gray-400 dark:text-gray-600'
                                        }`}
                                >
                                    <div className={`w-7 h-3.5 rounded-full transition-colors relative ${enterToSubmit ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-700'
                                        }`}>
                                        <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white shadow transition-all ${enterToSubmit ? 'left-[15px]' : 'left-0.5'
                                            }`} />
                                    </div>
                                    <span>⏎ {t('enterToSend') || 'Enter = Send'}</span>
                                </button>
                                {enterToSubmit && (
                                    <span className="text-[9px] text-gray-400 dark:text-gray-600">{t('shiftEnter')}</span>
                                )}
                            </div>

                            {/* F6: Template & F3: History Quick-Select */}
                            <div className="flex gap-1.5">
                                <button
                                    onClick={() => setShowPromptDropdown(showPromptDropdown === 'templates' ? null : 'templates')}
                                    className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${showPromptDropdown === 'templates'
                                        ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-500/50 text-amber-600 dark:text-amber-400'
                                        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-amber-300 dark:hover:border-amber-500/50'
                                        }`}
                                >
                                    <span>📋</span> {t('templates')}
                                </button>
                                <button
                                    onClick={() => setShowPromptDropdown(showPromptDropdown === 'history' ? null : 'history')}
                                    className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${showPromptDropdown === 'history'
                                        ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-300 dark:border-purple-500/50 text-purple-600 dark:text-purple-400'
                                        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-purple-300 dark:hover:border-purple-500/50'
                                        }`}
                                    disabled={promptHistory.length === 0}
                                >
                                    <span>🕒</span> {t('promptHistory')} {promptHistory.length > 0 && `(${promptHistory.length})`}
                                </button>
                            </div>

                            {/* Dropdown Panel */}
                            {showPromptDropdown && (
                                <div className="max-h-40 overflow-y-auto scrollbar-thin border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-[#0a0c10]">
                                    {showPromptDropdown === 'templates' && PROMPT_TEMPLATES.map(tpl => (
                                        <button
                                            key={tpl.id}
                                            onClick={() => { setPrompt(tpl.prompt); setShowPromptDropdown(null); }}
                                            className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 border-b border-gray-100 dark:border-gray-800 last:border-b-0 transition-colors flex items-center gap-2"
                                        >
                                            <span className="text-base shrink-0">{tpl.icon}</span>
                                            <span className="truncate">{t(tpl.labelKey) || tpl.label}</span>
                                        </button>
                                    ))}
                                    {showPromptDropdown === 'history' && (
                                        <>
                                            {promptHistory.map((item, i) => (
                                                <div key={i} className="flex items-center border-b border-gray-100 dark:border-gray-800 last:border-b-0">
                                                    <button
                                                        onClick={() => { setPrompt(item.text); setShowPromptDropdown(null); }}
                                                        className="flex-1 text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors truncate"
                                                    >
                                                        {item.text.slice(0, 80)}{item.text.length > 80 ? '…' : ''}
                                                    </button>
                                                    <button
                                                        onClick={() => removePromptFromHistory(item.text)}
                                                        className="p-1.5 mr-1 text-gray-400 hover:text-red-500 transition-colors shrink-0"
                                                    >
                                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                                    </button>
                                                </div>
                                            ))}
                                            {promptHistory.length > 2 && (
                                                <button
                                                    onClick={() => { clearPromptHistory(); setShowPromptDropdown(null); }}
                                                    className="w-full text-center px-3 py-1.5 text-[10px] text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                                                >
                                                    {t('clearAll') || 'Clear All'}
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Helper Buttons (Rewrite / Inspire) */}
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={handleSmartRewrite}
                                    disabled={isEnhancingPrompt}
                                    className="flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-amber-300 dark:hover:border-amber-500/50 rounded-lg text-xs font-medium text-amber-600 dark:text-amber-400 transition-all active:scale-95 disabled:opacity-50"
                                    title={t('rewrite')}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-3.5 w-3.5 ${isEnhancingPrompt ? 'animate-spin' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    <span>{t('rewrite')}</span>
                                </button>
                                <button
                                    onClick={handleSurpriseMe}
                                    disabled={isEnhancingPrompt}
                                    className="flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-purple-300 dark:hover:border-purple-500/50 rounded-lg text-xs font-medium text-purple-600 dark:text-purple-400 transition-all active:scale-95 disabled:opacity-50"
                                    title={t('random')}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" /><path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                                    </svg>
                                    <span>{t('random')}</span>
                                </button>
                            </div>

                            {/* Main Generate / Cancel Button */}
                            {isGenerating ? (
                                <button
                                    onClick={handleCancelGeneration}
                                    className="w-full py-3 text-sm shadow-xl rounded-lg font-semibold bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                        <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
                                    </svg>
                                    {t('statusGenerating')} — {t('cancel') || 'Cancel'}
                                </button>
                            ) : (
                                <Button
                                    onClick={handleGenerate}
                                    isLoading={false}
                                    className="w-full py-3 text-sm shadow-xl btn-shimmer"
                                    title={t('generate')}
                                    icon={
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white drop-shadow-md">
                                            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                                        </svg>
                                    }
                                >
                                    {t('generate')}
                                </Button>
                            )}
                        </div>

                        {/* Reference Images: Objects & Characters */}
                        <div className="animate-[fadeIn_0.3s_ease-out]">
                            <div className="h-px bg-gray-200 dark:bg-gray-800 my-4" />
                            <div className="space-y-4">
                                <ImageUploader
                                    images={objectImages}
                                    onImagesChange={setObjectImages}
                                    disabled={isGenerating}
                                    label={t('objectRefs')}
                                    currentLanguage={currentLang}
                                    onWarning={(msg) => showNotification(msg, 'error')}
                                    maxImages={MODEL_CAPABILITIES[imageModel].maxObjects}
                                    prefixTag="Obj"
                                    safeLimit={Math.floor(MODEL_CAPABILITIES[imageModel].maxObjects / 2)}
                                    limitWarningMsg={t('errorMaxRefs')}
                                    onLaunchSketch={handleOpenSketchPad}
                                    onRemove={handleRemoveObjectReference}
                                />
                                {(MODEL_CAPABILITIES[imageModel].maxCharacters > 0) && (
                                    <ImageUploader
                                        images={characterImages}
                                        onImagesChange={setCharacterImages}
                                        disabled={isGenerating}
                                        label={t('characterRefs')}
                                        currentLanguage={currentLang}
                                        onWarning={(msg) => showNotification(msg, 'error')}
                                        maxImages={MODEL_CAPABILITIES[imageModel].maxCharacters}
                                        prefixTag="Char"
                                        safeLimit={Math.floor(MODEL_CAPABILITIES[imageModel].maxCharacters / 2) || 1}
                                        limitWarningMsg={t('errorMaxRefs')}
                                        onRemove={handleRemoveCharacterReference}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Style Selector - MOVED OUT OF TEXTAREA FOR VISIBILITY */}
                        <div className="space-y-2 pt-2">
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center justify-between">
                                <span className="flex items-center gap-1.5">
                                    {t('style')}
                                    <button onClick={() => toggleLock('style')} className={`text-[11px] transition-colors ${lockedParams.style ? 'text-amber-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`} title={lockedParams.style ? t('styleLocked') : t('lockStyle')}>
                                        {lockedParams.style ? '🔒' : '🔓'}
                                    </button>
                                </span>
                                {imageStyle !== 'None' && !lockedParams.style && (
                                    <button
                                        onClick={() => setImageStyle('None')}
                                        className="text-[10px] text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 font-bold uppercase transition-colors"
                                    >
                                        {t('clear')}
                                    </button>
                                )}
                            </label>
                            <button
                                onClick={() => !lockedParams.style && setIsStyleModalOpen(true)}
                                disabled={lockedParams.style}
                                className={`w-full flex items-center justify-between p-2 rounded-xl border transition-all duration-300 group
                            ${lockedParams.style
                                        ? 'opacity-50 cursor-not-allowed grayscale'
                                        : ''}
                            ${imageStyle !== 'None'
                                        ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-300 dark:border-amber-500/50 shadow-md shadow-amber-500/10'
                                        : 'bg-gray-100 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 hover:bg-gray-200 dark:hover:bg-gray-800'
                                    }
                        `}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-1.5 rounded-lg transition-colors ${imageStyle !== 'None' ? 'bg-amber-100 text-amber-500' : 'bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500'}`}>
                                        {getStyleIcon(imageStyle, imageStyle !== 'None')}
                                    </div>
                                    <span className={`text-sm font-bold ${imageStyle !== 'None' ? 'text-amber-700 dark:text-amber-300' : 'text-gray-500 dark:text-gray-400'}`}>
                                        {imageStyle === 'None' ? t('styleNone') : getStyleLabel(imageStyle)}
                                    </span>
                                </div>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-6 pt-2">
                            <ModelSelector
                                selectedModel={imageModel}
                                onSelect={setImageModel}
                                label={t('modelSelect')}
                                disabled={isGenerating || lockedParams.model}
                                isLocked={lockedParams.model}
                                onLockToggle={() => toggleLock('model')}
                                langDict={{
                                    modelGemini3Pro: t('modelGemini3Pro'),
                                    modelGemini31Flash: t('modelGemini31Flash'),
                                    modelGemini25Flash: t('modelGemini25Flash')
                                }}
                                currentLanguage={currentLang}
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <SizeSelector
                                    selectedSize={imageSize}
                                    onSelect={setImageSize}
                                    label={t('resolution')}
                                    disabled={lockedParams.size || MODEL_CAPABILITIES[imageModel].supportedSizes.length === 0}
                                    isLocked={lockedParams.size}
                                    onLockToggle={() => toggleLock('size')}
                                    supportedSizes={MODEL_CAPABILITIES[imageModel].supportedSizes}
                                    currentLanguage={currentLang}
                                />
                                <BatchSelector
                                    batchSize={batchSize}
                                    onSelect={setBatchSize}
                                    disabled={isGenerating}
                                    label={t('batchSize')}
                                    currentLanguage={currentLang}
                                />
                            </div>
                            <RatioSelector
                                selectedRatio={aspectRatio}
                                onSelect={setAspectRatio}
                                label={t('aspectRatio')}
                                disabled={lockedParams.ratio || MODEL_CAPABILITIES[imageModel].supportedRatios.length === 0}
                                isLocked={lockedParams.ratio}
                                onLockToggle={() => toggleLock('ratio')}
                                supportedRatios={MODEL_CAPABILITIES[imageModel].supportedRatios}
                                currentLanguage={currentLang}
                            />
                        </div>
                    </div>
                </aside>

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
