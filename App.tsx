
import React, { useState, useEffect, useRef } from 'react';
import { checkApiKey, promptForApiKey, generateImageWithGemini, enhancePromptWithGemini, generateRandomPrompt } from './services/geminiService';
import { AspectRatio, ImageSize, ImageStyle, GeneratedImage as GeneratedImageType } from './types';
import Button from './components/Button';
import RatioSelector from './components/RatioSelector';
import SizeSelector from './components/SizeSelector';
import StyleSelector, { getStyleIcon } from './components/StyleSelector';
import GeneratedImage from './components/GeneratedImage';
import HistoryPanel from './components/HistoryPanel';
import ImageEditor from './components/ImageEditor';
import ImageUploader from './components/ImageUploader';
import BatchSelector from './components/BatchSelector';
import LanguageSelector from './components/LanguageSelector';
import GlobalLogConsole from './components/GlobalLogConsole';
import ThemeToggle from './components/ThemeToggle';
import DoodleBoard from './components/DoodleBoard';
import { Language, getTranslation, SUPPORTED_LANGUAGES } from './utils/translations';
import { ASPECT_RATIOS } from './constants';

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
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  
  // Doodle Board State
  const [isDoodleOpen, setIsDoodleOpen] = useState(false);
  const [hasSketch, setHasSketch] = useState(false); // Track if a sketch is present
  const [showSketchReplaceConfirm, setShowSketchReplaceConfirm] = useState(false);
  
  // Display Settings (Decoupled from Input Settings)
  // This ensures the generated image view reflects exactly what was used to generate it,
  // without overwriting the user's current input state (important for Editor return).
  const [displaySettings, setDisplaySettings] = useState<{
    prompt: string;
    aspectRatio: AspectRatio;
    size: ImageSize;
    style: ImageStyle;
    batchSize: number;
  }>({
    prompt: '',
    aspectRatio: '1:1',
    size: '2K',
    style: 'None',
    batchSize: 1
  });

  const [generatedImageUrls, setGeneratedImageUrls] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationMode, setGenerationMode] = useState<string>("Text to Image");
  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  
  const [history, setHistory] = useState<GeneratedImageType[]>([]);
  
  // Sidebar State (Default Open)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Editing State
  const [isEditing, setIsEditing] = useState(false);
  const [editingImageSource, setEditingImageSource] = useState<string | null>(null);

  // Auto Download State
  const [autoDownload, setAutoDownload] = useState(true);

  // Direct Upload for Editor
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // Toast Notification State
  const [notification, setNotification] = useState<{msg: string, type: 'info' | 'error'} | null>(null);

  // Track the first image to prevent redundant ratio calculations
  const firstRefImageRef = useRef<string | null>(null);

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
    
    // Add browser native unload warning
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (history.length > 0 || generatedImageUrls.length > 0) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [history.length, generatedImageUrls.length]);

  const t = (key: string) => getTranslation(currentLang, key);

  // --- Auto Aspect Ratio Logic ---
  useEffect(() => {
    // If no images, do nothing (keep user selection)
    if (referenceImages.length === 0) {
        firstRefImageRef.current = null;
        // If reference images are cleared, reset hasSketch if it was true (safety net)
        if (hasSketch) setHasSketch(false); 
        return;
    }

    const firstImage = referenceImages[0];

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
  }, [referenceImages, currentLang, hasSketch]); 

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
      setTimeout(() => setNotification(null), 4000);
  };

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second:'2-digit' });
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const downloadImage = (url: string, prefix: string = 'nano-banana') => {
    try {
        const link = document.createElement('a');
        link.href = url;
        link.download = `${prefix}-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (e) {
        console.error("Auto-download failed", e);
    }
  };

  const getActiveImageUrl = () => {
     if (generatedImageUrls.length > 0 && selectedImageIndex < generatedImageUrls.length) {
         return generatedImageUrls[selectedImageIndex];
     }
     return '';
  };

  const handleClearResults = () => {
      setGeneratedImageUrls([]);
      setSelectedImageIndex(0);
      setError(null);
  };

  const handleClearHistory = () => {
    if (history.length === 0) return;
    setHistory([]);
    handleClearResults(); // Clear view as well
    addLog(t('logHistoryCleared'));
    showNotification(t('clearHistory') + " OK", 'info');
  };

  const handleAddToReference = () => {
    const activeUrl = getActiveImageUrl();
    if (!activeUrl) return;
    if (referenceImages.length >= 9) {
      showNotification(t('errorMaxRefs'), 'error');
      return;
    }
    setReferenceImages(prev => [...prev, activeUrl]);
    addLog(t('logAddedToRef'));
    showNotification(t('notificationAddedToRef'), 'info');
  };

  // --- Doodle / Reference Logic ---

  const handleOpenDoodle = () => {
      // If we already have a sketch in references, warn user
      if (hasSketch && referenceImages.length > 0) {
          setShowSketchReplaceConfirm(true);
      } else {
          setIsDoodleOpen(true);
      }
  };

  const handleDoodleSave = (base64: string) => {
      let newRefs = [...referenceImages];
      
      if (hasSketch && newRefs.length > 0) {
          // Scenario: Replace existing sketch at index 0
          newRefs[0] = base64;
      } else {
          // Scenario: New sketch, insert at top
          newRefs.unshift(base64);
          
          // Truncate if > 9
          if (newRefs.length > 9) {
              newRefs.pop();
          }
          setHasSketch(true);
      }
      
      setReferenceImages(newRefs);
      setIsDoodleOpen(false);
      showNotification(t('notificationAddedToRef'), 'info');
  };

  const handleRemoveReference = (indexToRemove: number) => {
      // If removing the first image and it was a sketch, reset the flag
      if (indexToRemove === 0 && hasSketch) {
          setHasSketch(false);
      }
      setReferenceImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const getLanguageLabel = () => {
      const langObj = SUPPORTED_LANGUAGES.find(l => l.value === currentLang);
      return langObj ? langObj.label : 'English';
  };

  const handleSmartRewrite = async () => {
    if (!prompt.trim()) {
       showNotification(t('errEnterIdea'), 'error');
       return;
    }
    if (!apiKeyReady) await handleApiKeyConnect();
    
    setIsEnhancingPrompt(true);
    try {
       const enhanced = await enhancePromptWithGemini(prompt, getLanguageLabel());
       setPrompt(enhanced);
       addLog(t('logRewriteOk'));
    } catch (e) {
       console.error(e);
       addLog(t('logRewriteFailed'));
    } finally {
       setIsEnhancingPrompt(false);
    }
  };

  const handleSurpriseMe = async () => {
    if (!apiKeyReady) await handleApiKeyConnect();
    setIsEnhancingPrompt(true);
    try {
       const randomPrompt = await generateRandomPrompt(getLanguageLabel());
       setPrompt(randomPrompt);
       addLog(t('logRandomOk'));
    } catch (e) {
       console.error(e);
       addLog(t('logRandomFailed'));
    } finally {
       setIsEnhancingPrompt(false);
    }
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
    editingInput?: string,
    customBatchSize?: number,
    customSize?: ImageSize,
    explicitMode?: string,
    extraRefImages?: string[]
  ) => {
    // Check if we are in "Style Transfer Mode" (Ref Images + Style Selected)
    // In this mode, we allow empty prompts.
    const isStyleTransfer = referenceImages.length > 0 && targetStyle !== 'None' && !editingInput;

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
    
    let finalImageInputs: string[] = [];
    if (editingInput) {
      finalImageInputs = [editingInput];
      if (extraRefImages && extraRefImages.length > 0) {
          finalImageInputs = [...finalImageInputs, ...extraRefImages];
      }
    } else if (referenceImages.length > 0) {
      finalImageInputs = referenceImages;
    }

    const currentBatchSize = customBatchSize !== undefined ? customBatchSize : batchSize;
    const currentImageSize = customSize || targetSize;

    let currentMode = explicitMode;
    if (!currentMode) {
      if (editingInput) currentMode = "Inpainting";
      else if (referenceImages.length > 0) currentMode = "Image to Image";
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
        batchSize: currentBatchSize
    });

    try {
        addLog(t('logMode').replace('{0}', currentMode));
        addLog(t('logSource'));
        addLog(t('logRequesting').replace('{0}', currentBatchSize.toString()).replace('{1}', currentImageSize));
        
        const handleImageReceived = (url: string) => {
             setGeneratedImageUrls(prev => [...prev, url]);
             if (autoDownload) {
                 downloadImage(url, editingInput ? 'gemini-edit' : 'gemini-gen');
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
          imageInputs: finalImageInputs
        }, currentBatchSize, handleImageReceived, handleLogCallback);

        // Process Results
        const newHistoryItems: GeneratedImageType[] = results.map(res => {
            return {
                id: Date.now().toString(36) + Math.random().toString(36).substr(2),
                url: res.status === 'success' ? res.url! : '',
                prompt: finalPrompt || "Auto-fill",
                aspectRatio: effectiveAspectRatio || '1:1',
                size: currentImageSize,
                style: targetStyle,
                createdAt: Date.now(),
                mode: currentMode,
                status: res.status,
                error: res.error
            };
        });

        // Update History with both successes and failures
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
    }
  };

  const handleGenerate = () => {
    performGeneration(prompt, aspectRatio, imageSize, imageStyle);
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
        setGeneratedImageUrls([item.url]);
        setSelectedImageIndex(0);
        setError(null);
        setLogs([`[${new Date(item.createdAt).toLocaleTimeString()}] ${t('logHistoryLoaded')}`]);
    }

    // Restore Input State
    setPrompt(item.prompt);
    setAspectRatio(item.aspectRatio);
    setImageSize(item.size);
    setImageStyle(item.style);
    
    // Update Display State to match selected history item
    setDisplaySettings({
        prompt: item.prompt,
        aspectRatio: item.aspectRatio,
        size: item.size,
        style: item.style,
        batchSize: 1
    });
    
    // Auto-detect mode
    const histMode = item.mode || "Text to Image";
    setGenerationMode(histMode);
    
    setReferenceImages([]); // Reset references for history load
    
    setIsGenerating(false);
  };

  const handleOpenEditor = () => {
    const activeUrl = getActiveImageUrl();
    if (activeUrl) {
      setEditingImageSource(activeUrl);
      setIsEditing(true);
      setError(null); // Clear any previous errors when starting edit from active image
    } else {
       uploadInputRef.current?.click();
    }
  };

  const handleEditorGenerate = (editPrompt: string, imageBase64: string, editBatchSize: number, editSize: ImageSize, mode: string, refImages?: string[], targetRatio?: AspectRatio) => {
    // FORCE style to 'None' for editor to ignore homepage selection
    performGeneration(editPrompt, targetRatio, imageSize, 'None', imageBase64, editBatchSize, editSize, mode, refImages);
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
      batchSize: displaySettings.batchSize
  } : {
      aspectRatio: aspectRatio,
      size: imageSize,
      style: imageStyle,
      batchSize: batchSize
  };

  return (
    <div className="h-screen w-full bg-gray-50 dark:bg-[#050505] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50 via-white to-gray-100 dark:from-[#1a1c29] dark:via-[#0f1115] dark:to-black text-gray-900 dark:text-gray-100 font-sans selection:bg-amber-500/30 selection:text-amber-200 relative overflow-hidden flex flex-col transition-colors duration-500">
      
      {/* Floating Controls Container (Log + Lang + Theme) */}
      <div className="fixed bottom-4 right-4 z-[9999] flex items-end gap-2 pointer-events-none">
          <div className="pointer-events-auto">
              <GlobalLogConsole logs={logs} isLoading={isGenerating} currentLanguage={currentLang} />
          </div>
          <div className="pointer-events-auto flex flex-col gap-2">
              <ThemeToggle />
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

      {/* Doodle Board Modal */}
      {isDoodleOpen && (
          <DoodleBoard 
              onSave={handleDoodleSave}
              onClose={() => setIsDoodleOpen(false)}
              currentLanguage={currentLang}
          />
      )}

      {/* Sketch Replacement Confirmation Dialog */}
      {showSketchReplaceConfirm && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.1s_ease-out]" onClick={() => setShowSketchReplaceConfirm(false)}>
            <div className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-gray-700 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden p-6 text-center transform scale-100" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                    {t('doodleReplaceTitle')}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                    {t('doodleReplaceMsg')}
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
                            setIsDoodleOpen(true);
                        }}
                        className="flex-1 py-2.5 px-4 rounded-xl text-sm font-bold text-white shadow-lg transition-all bg-amber-500 hover:bg-amber-600 shadow-amber-500/30"
                    >
                        {t('doodleReplaceConfirm')}
                    </button>
                </div>
            </div>
        </div>
      )}

      <input 
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
        />
      )}

      <div className="flex-1 flex overflow-hidden relative">
          
          {/* Sidebar Controls */}
          <aside 
            className={`
               bg-white dark:bg-[#0a0c10] border-r border-gray-200 dark:border-gray-800 overflow-y-auto scrollbar-thin
               transition-all duration-300 ease-in-out z-40
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
                       />
                       
                       {prompt && (
                           <button 
                               onClick={() => setPrompt('')} 
                               className="absolute top-2 right-2 p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                               title={t('clear')}
                           >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                           </button>
                       )}
                   </div>

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

                   {/* Main Generate Button */}
                   <Button 
                        onClick={handleGenerate} 
                        isLoading={isGenerating} 
                        className="w-full py-3 text-sm shadow-xl"
                        title={t('generate')}
                        icon={
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white drop-shadow-md">
                                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                            </svg>
                        }
                   >
                        {isGenerating ? t('statusGenerating') : t('generate')}
                   </Button>
                </div>
                
                {/* Reference Images */}
                <div className="animate-[fadeIn_0.3s_ease-out]">
                    <div className="h-px bg-gray-200 dark:bg-gray-800 my-4" />
                    <ImageUploader 
                      images={referenceImages}
                      onImagesChange={setReferenceImages} 
                      disabled={isGenerating}
                      label={t('refImages')}
                      currentLanguage={currentLang}
                      onWarning={(msg) => showNotification(msg, 'error')}
                      maxImages={9}
                      safeLimit={5}
                      limitWarningMsg={t('errorMaxRefs')}
                      onLaunchDoodle={handleOpenDoodle}
                      onRemove={handleRemoveReference}
                    />
                </div>

                {/* Style Selector - MOVED OUT OF TEXTAREA FOR VISIBILITY */}
                <div className="space-y-2 pt-2">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex justify-between">
                       {t('style')}
                       {imageStyle !== 'None' && (
                           <button 
                               onClick={() => setImageStyle('None')}
                               className="text-[10px] text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 font-bold uppercase transition-colors"
                           >
                               {t('clear')}
                           </button>
                       )}
                    </label>
                    <button 
                        onClick={() => setIsStyleModalOpen(true)}
                        className={`w-full flex items-center justify-between p-2 rounded-xl border transition-all duration-300 group
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
                    <div className="grid grid-cols-2 gap-3">
                        <SizeSelector selectedSize={imageSize} onSelect={setImageSize} label={t('resolution')} />
                        <BatchSelector batchSize={batchSize} onSelect={setBatchSize} disabled={isGenerating} label={t('batchSize')} />
                    </div>
                    <RatioSelector selectedRatio={aspectRatio} onSelect={setAspectRatio} label={t('aspectRatio')} currentLanguage={currentLang} />
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
               
               {/* Right: Auto Download + Privacy */}
               <div className="flex items-center gap-6">
                   <div className="flex flex-col items-end gap-1">
                     <div className="flex items-center gap-3">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider cursor-pointer select-none" htmlFor="auto-download">
                           {t('autoDownload')}
                        </label>
                        <button 
                           id="auto-download"
                           onClick={() => setAutoDownload(!autoDownload)}
                           className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${autoDownload ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-700'}`}
                        >
                           <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform duration-300 ${autoDownload ? 'left-6' : 'left-1'}`}></div>
                        </button>
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
                           batchSize: displaySettings.batchSize 
                         } : {
                           aspectRatio: aspectRatio,
                           size: imageSize,
                           style: imageStyle,
                           batchSize: batchSize 
                         }}
                         error={error}
                         onEdit={generatedImageUrls.length > 0 ? handleOpenEditor : undefined}
                         onGenerate={handleGenerate}
                         onAddToReference={generatedImageUrls.length > 0 ? handleAddToReference : undefined}
                         onUpload={() => uploadInputRef.current?.click()}
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
      </div>

      {isSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default App;
