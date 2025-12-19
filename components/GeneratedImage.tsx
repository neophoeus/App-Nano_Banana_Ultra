

import React, { useState } from 'react';
import Button from './Button';
import { AspectRatio, ImageSize, ImageStyle } from '../types';
import { Language, getTranslation } from '../utils/translations';

interface GeneratedImageProps {
  imageUrls: string[]; 
  isLoading: boolean;
  prompt?: string;
  error?: string | null;
  settings: {
    aspectRatio: AspectRatio;
    size: ImageSize;
    style: ImageStyle;
    batchSize?: number; 
  };
  generationMode?: string; 
  onEdit?: () => void;
  onGenerate: () => void;
  onAddToReference?: () => void;
  onUpload?: () => void;
  onClear?: () => void;
  onSelectImage?: (url: string) => void;
  selectedImageUrl?: string;
  currentLanguage?: Language;
  currentLog?: string;
}

const GeneratedImage: React.FC<GeneratedImageProps> = ({ 
  imageUrls, 
  isLoading, 
  prompt, 
  error, 
  settings,
  generationMode = "Text to Image",
  onEdit,
  onGenerate,
  onAddToReference,
  onUpload,
  onClear,
  onSelectImage,
  selectedImageUrl,
  currentLanguage = 'en' as Language,
  currentLog = ''
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [justAddedRef, setJustAddedRef] = useState(false);

  const t = (key: string) => getTranslation(currentLanguage, key);

  // Helper to translate style name - remove non-alphanumeric to match translations.ts keys
  const getStyleLabel = (style: string) => {
    const key = 'style' + style.replace(/[^a-zA-Z0-9]/g, '');
    return t(key);
  };

  const activeImage = selectedImageUrl || (imageUrls.length > 0 ? imageUrls[0] : '');
  
  // Show full loading screen ONLY if we are loading AND we have no images yet
  const showFullLoading = isLoading && imageUrls.length === 0;

  // Calculate Progress
  const totalBatch = settings.batchSize || 1;
  const currentCount = imageUrls.length;
  // If loading, we are working on the next one (current + 1), capped at total
  const processingIndex = Math.min(currentCount + 1, totalBatch);

  const handleDownload = () => {
    if (!activeImage) return;
    const link = document.createElement('a');
    link.href = activeImage;
    link.download = `gemini-gen-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddToRefClick = () => {
      if (onAddToReference) {
          onAddToReference();
          setJustAddedRef(true);
          setTimeout(() => setJustAddedRef(false), 2000);
      }
  };

  // Helper for mode colors
  const getModeColor = (mode: string) => {
     // Inpaint / Retouch
     if (mode.includes('Inpaint') || mode.includes('Retouch')) {
         return 'text-pink-600 dark:text-pink-300 border-pink-300 dark:border-pink-500/30 bg-pink-50 dark:bg-pink-500/10 shadow-pink-500/20';
     }
     // Outpaint / Reframe (and catch-all for any legacy upscale labels)
     if (mode.includes('Outpaint') || mode.includes('Reframe') || mode.includes('Reposition') || mode.includes('Upscale') || mode.includes('Refine')) {
         return 'text-blue-600 dark:text-blue-300 border-blue-300 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 shadow-blue-500/20';
     }
     return 'text-amber-600 dark:text-amber-300 border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 shadow-amber-500/20';
  };

  const getTranslatedMode = (mode: string) => {
      if (mode.includes('Inpaint') || mode.includes('Retouch')) {
          return t('modeInpaint');
      }
      // Consolidate all resizing/extending modes to Reframe (Outpaint)
      if (mode.includes('Outpaint') || mode.includes('Reframe') || mode.includes('Reposition') || mode.includes('Upscale') || mode.includes('Refine')) {
          return t('modeOutpaint');
      }
      return mode;
  };

  // Unified Control Panel (Info + Actions) - Top Right
  const ControlPanel = () => (
    <div className="absolute top-4 right-4 z-30 flex flex-col items-end gap-2 pointer-events-none transition-opacity duration-300">
       
       {/* Row 1: Metadata Badges */}
       <div className="flex items-center gap-0.5 bg-white/80 dark:bg-black/60 backdrop-blur-md rounded-lg border border-gray-200 dark:border-white/10 px-3 py-1.5 shadow-xl text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-200 ring-1 ring-black/5 dark:ring-white/5 pointer-events-auto cursor-default transition-colors">
           <span className="text-amber-600 dark:text-amber-400">{settings.aspectRatio}</span>
           <span className="mx-1.5 opacity-30">|</span>
           <span className="text-amber-500 dark:text-amber-200">{settings.size}</span>
           {settings.style !== 'None' && (
             <>
               <span className="mx-1.5 opacity-30">|</span>
               <span className="text-gray-900 dark:text-white opacity-90">{getStyleLabel(settings.style)}</span>
             </>
           )}
           {settings.batchSize && settings.batchSize > 1 && (
             <>
                <span className="mx-1.5 opacity-30">|</span>
                <span className="text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/10 px-1 rounded">{settings.batchSize}x</span>
             </>
           )}
       </div>

       {/* Row 2: Actions (Only show if images exist) */}
       {imageUrls.length > 0 && (
           <div className="flex items-center gap-2 pointer-events-auto animate-[fadeIn_0.2s_ease-out]">
                {/* Tools Group */}
                <div className="flex items-center bg-white/90 dark:bg-[#0a0a0a]/90 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-lg p-1 shadow-xl ring-1 ring-black/5 dark:ring-white/5 gap-0.5 transition-colors">
                    {onAddToReference && (
                        <button 
                            onClick={handleAddToRefClick}
                            className={`p-1.5 rounded-md transition-all ${justAddedRef ? 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10'}`}
                            title={t('actionUseRef')}
                        >
                            {justAddedRef ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            )}
                        </button>
                    )}
                    
                    {onEdit && (
                        <button 
                            onClick={onEdit}
                            className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-md transition-all"
                            title={t('actionEdit')}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                        </button>
                    )}
                    <button 
                        onClick={handleDownload}
                        className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-md transition-all"
                        title={t('actionDownload')}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                    </button>
                    
                    {onClear && (
                        <>
                            <div className="w-px h-4 bg-gray-200 dark:bg-white/10 mx-0.5"></div>
                            <button 
                                onClick={onClear}
                                className="p-1.5 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all"
                                title={t('clearResults')}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </>
                    )}
                </div>
           </div>
       )}
    </div>
  );

  // --- REUSABLE HUD COMPONENT ---
  const HexagonHUD = ({ statusText, progressPercent, logText }: { statusText: string, progressPercent?: number, logText?: string }) => (
      <div className="flex flex-col items-center justify-center z-20 pointer-events-none">
          {/* Hexagon/Circle Spinner */}
          <div className="relative w-32 h-32 flex items-center justify-center mb-6">
              {/* Outer Rings */}
              <div className="absolute inset-0 border-4 border-amber-500/10 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-t-amber-500/40 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-[spin_3s_linear_infinite]"></div>
              <div className="absolute inset-4 border-2 border-amber-300/20 rounded-full border-dashed animate-[spin_8s_linear_infinite_reverse]"></div>
              
              {/* Inner Spinner */}
              <div className="absolute inset-8 border-4 border-t-amber-400 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-[spin_1.5s_linear_infinite]"></div>
              
              {/* Center Icon */}
              <div className="absolute inset-0 flex items-center justify-center text-5xl animate-pulse filter drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]">
                  🍌
              </div>
          </div>
          
          {/* Status Badge */}
          <div className="bg-white/80 dark:bg-black/80 backdrop-blur-xl border border-amber-500/30 rounded-2xl px-8 py-4 shadow-[0_0_40px_rgba(0,0,0,0.2)] dark:shadow-[0_0_40px_rgba(0,0,0,0.6)] flex flex-col items-center min-w-[280px] max-w-[400px]">
              <span className="text-amber-600 dark:text-amber-400 font-black text-[10px] uppercase tracking-[0.3em] mb-2 animate-pulse flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-amber-500 dark:bg-amber-400 rounded-full"></span>
                  {statusText}
                  <span className="w-1.5 h-1.5 bg-amber-500 dark:bg-amber-400 rounded-full"></span>
              </span>
              
              {/* Progress Bar (Optional) */}
              {progressPercent !== undefined && (
                  <div className="w-full h-1 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden mt-1 mb-2">
                      <div 
                          className="h-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)] transition-all duration-300 relative"
                          style={{ width: `${Math.max(5, progressPercent)}%` }}
                      >
                          <div className="absolute inset-0 bg-white/50 animate-[shimmer_1s_infinite]"></div>
                      </div>
                  </div>
              )}

              {/* Log Text */}
              {logText && (
                  <div className="mt-1 pt-2 border-t border-gray-200 dark:border-white/10 w-full text-center">
                      <span className="text-gray-500 dark:text-gray-400 text-[10px] font-mono leading-tight block animate-[fadeIn_0.2s_ease-out]">
                          {logText.replace(/^\[.*?\]\s*/, '')}
                      </span>
                  </div>
              )}
          </div>
      </div>
  );

  // --- FULL LOADING SCREEN (0 images yet) ---
  if (showFullLoading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-[#080808] border border-gray-200 dark:border-gray-800 rounded-2xl p-8 relative overflow-hidden group transition-colors">
        <style>{`
          @keyframes scan {
            0% { top: 0%; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
          }
          .animate-scan {
            animation: scan 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          }
        `}</style>
        
        <ControlPanel />
        
        {/* Cinematic Background Animation */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-200 via-gray-100 to-gray-50 dark:from-gray-900 dark:via-black dark:to-black animate-pulse opacity-50 dark:opacity-100"></div>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent animate-[shimmer_2s_infinite]"></div>

        <div className="flex flex-col items-center z-10 scale-100 transition-all duration-500 w-full max-w-md">
            {/* Mode Badge */}
            <div className={`mb-8 px-4 py-1.5 rounded-full border text-xs font-bold uppercase tracking-[0.2em] shadow-lg animate-bounce ${getModeColor(generationMode)}`}>
                {getTranslatedMode(generationMode)}
            </div>

            <HexagonHUD 
                statusText={t('statusInitializing')} 
                progressPercent={(processingIndex / totalBatch) * 100} 
                logText={currentLog} 
            />
            
            <div className="mt-4 text-xs font-mono text-gray-400 dark:text-gray-500 uppercase tracking-widest">
               {processingIndex} / {totalBatch}
            </div>
        </div>
      </div>
    );
  }

  // --- ERROR STATE (For when a failed history item is selected) ---
  if (error && imageUrls.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-[#080808] border border-gray-200 dark:border-gray-800 rounded-2xl relative overflow-hidden p-8 transition-colors">
        <ControlPanel />
        
        {/* Subtle Background Pattern for Errors */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#fee2e2_0%,_#f9fafb_70%)] dark:bg-[radial-gradient(circle_at_center,_#3f1010_0%,_#000000_70%)] opacity-50"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMWgydjJIMUMxeiIgZmlsbD0iIzQwMCIgZmlsbC1vcGFjaXR5PSIwLjEiLz48L3N2Zz4=')] opacity-5 dark:opacity-20"></div>

        <div className="z-10 flex flex-col items-center text-center max-w-md animate-[fadeIn_0.5s_ease-out]">
            {/* Beautiful Failure Icon */}
            <div className="relative mb-8">
                <div className="w-24 h-24 rounded-full bg-red-100 dark:bg-gradient-to-b dark:from-red-900/20 dark:to-transparent border border-red-200 dark:border-red-500/20 flex items-center justify-center shadow-[0_0_40px_rgba(220,38,38,0.1)]">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-500 dark:text-red-400 drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                {/* Glitch lines */}
                <div className="absolute -left-4 top-10 w-8 h-px bg-red-400/30"></div>
                <div className="absolute -right-4 top-14 w-8 h-px bg-red-400/30"></div>
            </div>

            <h3 className="text-xl font-bold text-red-700 dark:text-red-200 mb-2 tracking-tight">{t('statusFailed')}</h3>
            <div className="h-px w-12 bg-red-300 dark:bg-red-500/30 mx-auto mb-4"></div>
            
            <p className="text-sm text-red-800/80 dark:text-red-200/60 leading-relaxed bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-lg p-4 font-mono">
                {error}
            </p>
            
            {onClear && (
                <div className="mt-8">
                    <Button onClick={onClear} variant="secondary" className="border-red-300 dark:border-red-900/30 hover:border-red-400 dark:hover:border-red-500/30 text-red-700 dark:text-red-300">
                       {t('clearResults')}
                    </Button>
                </div>
            )}
        </div>
      </div>
    );
  }

  // --- EMPTY STATE ---
  if (!activeImage && !isLoading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-[#080808] border-2 border-dashed border-gray-300 dark:border-gray-800 rounded-2xl text-gray-500 group relative overflow-hidden p-8 transition-colors">
        <ControlPanel />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-200/50 dark:to-black/40 pointer-events-none"></div>
        
        <div className="z-10 flex flex-col items-center text-center px-6">
            <div className="w-24 h-24 bg-gradient-to-br from-white to-gray-100 dark:from-gray-900 dark:to-black rounded-3xl flex items-center justify-center mb-6 border border-gray-200 dark:border-gray-800 shadow-xl dark:shadow-2xl group-hover:scale-110 group-hover:border-amber-500/40 group-hover:shadow-[0_0_30px_rgba(245,158,11,0.15)] transition-all duration-500 relative">
                <div className="absolute inset-0 bg-amber-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-pulse"></div>
                <span className="text-5xl filter grayscale group-hover:grayscale-0 transition-all duration-500 drop-shadow-lg">🍌</span>
            </div>
            
            <p className="font-extrabold text-2xl text-gray-800 dark:text-gray-200 mb-3 tracking-tight">{t('readyTitle')}</p>
            <p className="text-sm text-gray-500 max-w-xs text-center mb-8 leading-relaxed font-light">
                {t('readyDesc')}
            </p>

            <div className="flex gap-4">
                {onUpload && (
                  <Button 
                    onClick={onUpload} 
                    variant="secondary" 
                    className="px-6 py-3.5 text-base"
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                    }
                  >
                    {t('uploadEdit')}
                  </Button>
                )}
            </div>
        </div>
      </div>
    );
  }

  // --- MAIN DISPLAY (Result + Partial Loading/Scanning Effect) ---
  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-black transition-colors duration-500">
        {/* Main Image Display */}
        <div 
          className="relative flex-1 bg-gray-50 dark:bg-[#050505] rounded-2xl overflow-hidden group border border-gray-200 dark:border-gray-800 shadow-2xl transition-colors duration-500"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <style>{`
            @keyframes scan {
                0% { top: 0%; opacity: 0; }
                10% { opacity: 1; }
                90% { opacity: 1; }
                100% { top: 100%; opacity: 0; }
            }
            .animate-scan {
                animation: scan 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            }
          `}</style>

          <ControlPanel />

          {/* SCANNING OVERLAY (Active during generation of next batch) */}
          {isLoading && (
            <div className="absolute inset-0 z-40 pointer-events-none animate-[fadeIn_0.3s_ease-out]">
                {/* 1. Darken Background slightly to focus on scan */}
                <div className="absolute inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-[2px] transition-all duration-500"></div>
                
                {/* 2. Scanline Animation */}
                <div className="absolute left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_25px_rgba(251,191,36,1)] animate-scan z-10"></div>
                
                {/* 3. Ambient Pulse Border */}
                <div className="absolute inset-0 border-2 border-amber-500/30 animate-pulse shadow-[inset_0_0_30px_rgba(245,158,11,0.2)]"></div>

                {/* 4. Center HUD */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform scale-75 sm:scale-100">
                    <HexagonHUD 
                        statusText={t('statusScanning')} 
                        progressPercent={(processingIndex / totalBatch) * 100}
                        logText={currentLog} 
                    />
                    <div className="text-center mt-6">
                        <div className="inline-block px-3 py-1 bg-white/80 dark:bg-black/60 rounded-full border border-gray-200 dark:border-gray-700 text-xs font-mono text-gray-500 dark:text-gray-400">
                            {t('statusProcessing')} {processingIndex} / {totalBatch}
                        </div>
                    </div>
                </div>
            </div>
          )}

          <img 
            src={activeImage} 
            alt={prompt || "Generated image"} 
            className="w-full h-full object-contain transition-transform duration-700 ease-out"
            style={{ 
                filter: isLoading ? 'grayscale(30%) contrast(110%)' : 'none',
                transform: isLoading ? 'scale(1.02)' : 'scale(1)' 
            }}
          />
          
          {/* Top Overlay */}
          <div className={`absolute top-0 left-0 right-0 pt-16 pb-6 px-6 bg-gradient-to-b from-white/95 via-white/60 dark:from-black/95 dark:via-black/60 to-transparent transition-opacity duration-300 pointer-events-none ${isHovered && !isLoading ? 'opacity-100' : 'opacity-0'}`}>
            <p className="text-gray-800 dark:text-gray-200 text-sm font-light italic leading-relaxed drop-shadow-md text-center pt-8 max-w-2xl mx-auto">
              "{prompt}"
            </p>
          </div>
        </div>

        {/* Thumbnail Strip */}
        {(imageUrls.length > 1 || (isLoading && imageUrls.length > 0)) && (
            <div className="h-24 mt-4 flex gap-3 overflow-x-auto pb-2 scrollbar-thin shrink-0 px-2">
                {imageUrls.map((url, idx) => (
                    <button
                        key={idx}
                        onClick={() => onSelectImage && onSelectImage(url)}
                        className={`
                            relative aspect-square h-full rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 animate-[fadeIn_0.3s_ease-out]
                            ${activeImage === url 
                                ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)] scale-[0.98]' 
                                : 'border-gray-200 dark:border-gray-800 opacity-60 hover:opacity-100 hover:border-gray-400 dark:hover:border-gray-600'
                            }
                        `}
                    >
                        <img src={url} alt={`Variation ${idx+1}`} className="w-full h-full object-cover bg-gray-100 dark:bg-black" />
                        <div className="absolute top-1 left-1 bg-white/80 dark:bg-black/70 backdrop-blur px-1.5 rounded text-[8px] text-gray-800 dark:text-white font-mono border border-gray-200 dark:border-white/10">
                            #{idx + 1}
                        </div>
                    </button>
                ))}
                {/* Placeholder spinner for pending images */}
                {isLoading && processingIndex > imageUrls.length && (
                    <div className="aspect-square h-full rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-800 bg-gray-100 dark:bg-gray-900/40 flex items-center justify-center flex-shrink-0 animate-pulse">
                        <div className="flex flex-col items-center gap-1">
                            <div className="w-5 h-5 border-2 border-gray-400 dark:border-gray-600 border-t-amber-500 rounded-full animate-spin"></div>
                            <span className="text-[9px] text-gray-400 dark:text-gray-500 font-mono">
                                {imageUrls.length + 1}...
                            </span>
                        </div>
                    </div>
                )}
            </div>
        )}
    </div>
  );
};

export default GeneratedImage;
