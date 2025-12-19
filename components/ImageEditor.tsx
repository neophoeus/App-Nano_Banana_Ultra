

import React, { useRef, useState, useEffect, useCallback } from 'react';
import Button from './Button';
import RatioSelector from './RatioSelector';
import SizeSelector from './SizeSelector';
import BatchSelector from './BatchSelector';
import ImageUploader from './ImageUploader';
import { ImageSize, AspectRatio } from '../types';
import { Language, getTranslation } from '../utils/translations';
import { ASPECT_RATIOS } from '../constants';

interface ImageEditorProps {
  initialImageUrl: string;
  initialPrompt: string;
  initialSize: ImageSize;
  onGenerate: (prompt: string, imageBase64: string, batchSize: number, size: ImageSize, mode: string, refImages?: string[], targetRatio?: AspectRatio) => void;
  onCancel: () => void;
  isGenerating: boolean;
  currentLanguage?: Language;
  currentLog?: string;
  error?: string | null;
  onErrorClear?: () => void;
}

type EditMode = 'inpaint' | 'outpaint';
type InteractionType = 'idle' | 'panning_viewport' | 'drawing_mask' | 'moving_image';

interface DrawPath {
  points: {x: number, y: number}[];
  brushSize: number;
}

interface ViewportState {
    x: number;
    y: number;
    zoom: number;
}

const MAX_DIMENSION = 4096;

const ImageEditor: React.FC<ImageEditorProps> = ({
  initialImageUrl,
  initialPrompt,
  initialSize,
  onGenerate,
  onCancel,
  isGenerating,
  currentLanguage = 'en' as Language,
  currentLog = '',
  error,
  onErrorClear
}) => {
  const t = (key: string) => getTranslation(currentLanguage, key);

  // --- Core State ---
  const [mode, setMode] = useState<EditMode>('inpaint');
  const [prompt, setPrompt] = useState(initialPrompt);
  const [refImages, setRefImages] = useState<string[]>([]);
  const [ratio, setRatio] = useState<AspectRatio>('1:1');
  const [size, setSize] = useState<ImageSize>(initialSize);
  const [batchSize, setBatchSize] = useState(1);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);

  // --- Image & Canvas Data ---
  const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);
  const [originalDims, setOriginalDims] = useState<{w: number, h: number}>({ w: 0, h: 0 });
  
  // --- Viewport State (Global Zoom/Pan) ---
  const [viewport, setViewport] = useState<ViewportState>({ x: 0, y: 0, zoom: 0.5 });
  
  // --- Inpaint State ---
  const [inpaintTool, setInpaintTool] = useState<'brush' | 'pan'>('brush');
  const [brushSize, setBrushSize] = useState(40);
  const [drawPaths, setDrawPaths] = useState<DrawPath[]>([]);
  const [redoPaths, setRedoPaths] = useState<DrawPath[]>([]);
  
  // --- Outpaint State ---
  // transform: The offset/scale of the IMAGE relative to the Frame
  const [imgTransform, setImgTransform] = useState({ x: 0, y: 0, scale: 1 });
  
  // --- Interaction State ---
  const [interactionState, setInteractionState] = useState<InteractionType>('idle');
  const [pointerStart, setPointerStart] = useState({ x: 0, y: 0 });
  const [stateStart, setStateStart] = useState<any>(null); // Snapshot of state at drag start
  const [cursorPos, setCursorPos] = useState<{x: number, y: number} | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Refs
  const eventSurfaceRef = useRef<HTMLDivElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const hasInitializedRatio = useRef(false);

  // --- UI Helpers ---
  const [toast, setToast] = useState<{msg: string, type: 'info'|'error'} | null>(null);
  const showToast = (msg: string, type: 'info'|'error' = 'info') => {
      setToast({ msg, type });
      setTimeout(() => setToast(null), 3000);
  };
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showModeSwitchConfirm, setShowModeSwitchConfirm] = useState<{target: EditMode} | null>(null);

  // --- Initialization ---
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = initialImageUrl;
    img.onload = () => {
        let w = img.width;
        let h = img.height;
        let src = img.src;

        // Auto Resize > 4K
        if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
            const scale = MAX_DIMENSION / Math.max(w, h);
            w = Math.round(w * scale);
            h = Math.round(h * scale);
            const cvs = document.createElement('canvas');
            cvs.width = w;
            cvs.height = h;
            const ctx = cvs.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, w, h);
                src = cvs.toDataURL('image/png');
                showToast(t('warningResized4K'), 'info');
            }
        }

        setOriginalDims({ w, h });
        const finalImg = new Image();
        finalImg.onload = () => setImgElement(finalImg);
        finalImg.src = src;

        // Auto Resolution Selection
        const totalPixels = w * h;
        if (totalPixels <= 1024 * 1024 * 1.5) {
            setSize('1K');
        } else if (totalPixels <= 2048 * 2048 * 1.5) {
            setSize('2K');
        } else {
            setSize('4K');
        }

        // Smart Ratio Init (Once)
        if (!hasInitializedRatio.current) {
            const numRatio = w / h;
            let best = '1:1';
            let minDiff = Infinity;
            ASPECT_RATIOS.forEach(r => {
                const [rw, rh] = r.value.split(':').map(Number);
                const diff = Math.abs(numRatio - (rw/rh));
                if (diff < minDiff) { minDiff = diff; best = r.value; }
            });
            setRatio(best as AspectRatio);
            hasInitializedRatio.current = true;
        }

        // Fit Viewport
        if (eventSurfaceRef.current) {
            const { clientWidth, clientHeight } = eventSurfaceRef.current;
            const padding = 0.8;
            const fitZoom = Math.min((clientWidth * padding) / w, (clientHeight * padding) / h);
            setViewport({ x: 0, y: 0, zoom: fitZoom });
        }
    };
  }, [initialImageUrl]);

  // --- Keyboard Listeners (Space to Pan) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Space') setIsSpacePressed(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
        if (e.code === 'Space') setIsSpacePressed(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // --- Geometry Helpers ---
  const getFrameDims = useCallback(() => {
      if (mode === 'inpaint') return { w: originalDims.w, h: originalDims.h };
      
      const [rw, rh] = ratio.split(':').map(Number);
      const ratioVal = rw / rh;
      const base = Math.max(originalDims.w, originalDims.h);
      
      // Calculate target frame size
      if (ratioVal > 1) return { w: base, h: base / ratioVal };
      return { w: base * ratioVal, h: base };
  }, [mode, ratio, originalDims]);

  const frameDims = getFrameDims();

  // --- Helper: Fit Image to Frame ---
  const fitImageToFrame = (type: 'contain' | 'cover') => {
      if (originalDims.w === 0) return;
      const frame = getFrameDims();
      
      const scaleW = frame.w / originalDims.w;
      const scaleH = frame.h / originalDims.h;
      
      let scale = 1;
      if (type === 'contain') scale = Math.min(scaleW, scaleH); // Fit completely inside (Outpaint default)
      if (type === 'cover') scale = Math.max(scaleW, scaleH); // Cover completely (Reframe default)
      
      // Animate transition (simple state set)
      setImgTransform({ x: 0, y: 0, scale: scale });
  };

  // --- Helper: Align Image ---
  const alignImage = (alignment: 'top' | 'bottom' | 'left' | 'right') => {
      if (originalDims.w === 0) return;
      const frame = getFrameDims();
      const scaledW = originalDims.w * imgTransform.scale;
      const scaledH = originalDims.h * imgTransform.scale;

      setImgTransform(prev => {
          let newX = prev.x;
          let newY = prev.y;

          // Note: Coordinates are relative to center (0,0)
          switch (alignment) {
              case 'top':
                  // Top of image (-scaledH/2) aligns with Top of frame (-frame.h/2)
                  // newY - scaledH/2 = -frame.h/2
                  newY = (-frame.h / 2) + (scaledH / 2);
                  break;
              case 'bottom':
                  // Bottom of image (scaledH/2) aligns with Bottom of frame (frame.h/2)
                  // newY + scaledH/2 = frame.h/2
                  newY = (frame.h / 2) - (scaledH / 2);
                  break;
              case 'left':
                  // Left of image (-scaledW/2) aligns with Left of frame (-frame.w/2)
                  // newX - scaledW/2 = -frame.w/2
                  newX = (-frame.w / 2) + (scaledW / 2);
                  break;
              case 'right':
                  // Right of image (scaledW/2) aligns with Right of frame (frame.w/2)
                  // newX + scaledW/2 = frame.w/2
                  newX = (frame.w / 2) - (scaledW / 2);
                  break;
          }
          return { ...prev, x: newX, y: newY };
      });
  };

  // --- Interaction Logic (The "New Method") ---

  // 1. Coordinate Mapping: Screen -> Content
  const screenToContent = (screenX: number, screenY: number) => {
      if (!eventSurfaceRef.current) return { x: 0, y: 0 };
      const rect = eventSurfaceRef.current.getBoundingClientRect();
      const relX = screenX - rect.left - (rect.width / 2); // Relative to center
      const relY = screenY - rect.top - (rect.height / 2);
      
      // Untranslate Viewport
      const contentX = (relX - viewport.x) / viewport.zoom;
      const contentY = (relY - viewport.y) / viewport.zoom;
      
      return { x: contentX, y: contentY };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
      if (isGenerating) return; // Block interaction during generation
      e.preventDefault(); // Prevent text selection
      const { clientX, clientY } = e;
      setPointerStart({ x: clientX, y: clientY });

      // Middle Mouse or Spacebar -> ALWAYS Pan Viewport
      if (e.button === 1 || e.buttons === 4 || isSpacePressed) {
          setInteractionState('panning_viewport');
          setStateStart({ ...viewport });
          return;
      }

      // Left Click Actions
      if (e.button === 0) {
          if (mode === 'inpaint') {
              if (inpaintTool === 'pan') {
                  setInteractionState('panning_viewport');
                  setStateStart({ ...viewport });
              } else {
                  setInteractionState('drawing_mask');
                  const { x, y } = screenToContent(clientX, clientY);
                  // Content is centered. Convert to top-left based coords for canvas drawing
                  const canvasX = x + originalDims.w / 2;
                  const canvasY = y + originalDims.h / 2;
                  setDrawPaths(prev => [...prev, { points: [{ x: canvasX, y: canvasY }], brushSize }]);
              }
          } else {
              // Outpaint: Drag Image
              setInteractionState('moving_image');
              setStateStart({ ...imgTransform });
          }
      }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
      const { clientX, clientY } = e;
      setCursorPos({ x: clientX, y: clientY });

      if (interactionState === 'idle') return;

      const dx = clientX - pointerStart.x;
      const dy = clientY - pointerStart.y;

      if (interactionState === 'panning_viewport') {
          setViewport({
              ...stateStart,
              x: stateStart.x + dx,
              y: stateStart.y + dy
          });
      } else if (interactionState === 'moving_image') {
          // Move image relative to scale
          setImgTransform({
              ...stateStart,
              x: stateStart.x + (dx / viewport.zoom),
              y: stateStart.y + (dy / viewport.zoom)
          });
      } else if (interactionState === 'drawing_mask') {
          const { x, y } = screenToContent(clientX, clientY);
          const canvasX = x + originalDims.w / 2;
          const canvasY = y + originalDims.h / 2;

          setDrawPaths(prev => {
              const last = prev[prev.length - 1];
              if (!last) return prev;
              const newPoints = [...last.points, { x: canvasX, y: canvasY }];
              return [...prev.slice(0, -1), { ...last, points: newPoints }];
          });
      }
  };

  const handlePointerUp = () => {
      setInteractionState('idle');
  };

  const handleWheel = (e: React.WheelEvent) => {
      if (isGenerating) return;
      // Global Zoom logic
      const zoomSensitivity = 0.001;
      const delta = -e.deltaY * zoomSensitivity;

      // In OUTPAINT mode, wheel should control IMAGE scale (like the slider)
      // In INPAINT mode, wheel controls VIEWPORT zoom
      if (mode === 'outpaint') {
          const newScale = Math.min(Math.max(0.1, imgTransform.scale + delta), 5);
          setImgTransform(prev => ({ ...prev, scale: newScale }));
      } else {
          const newZoom = Math.min(Math.max(0.05, viewport.zoom + delta), 5);
          setViewport(prev => ({ ...prev, zoom: newZoom }));
      }
  };

  // --- Render Mask Canvas ---
  useEffect(() => {
      if (mode === 'inpaint' && maskCanvasRef.current && originalDims.w > 0) {
          const ctx = maskCanvasRef.current.getContext('2d');
          if (ctx) {
              ctx.clearRect(0, 0, originalDims.w, originalDims.h);
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';
              
              drawPaths.forEach(path => {
                  ctx.lineWidth = path.brushSize;
                  // Use solid color here. Transparency is handled by the canvas CSS opacity.
                  // This prevents overlapping strokes from becoming darker/more opaque.
                  ctx.strokeStyle = '#ff3232'; 
                  ctx.beginPath();
                  if (path.points.length > 0) {
                      ctx.moveTo(path.points[0].x, path.points[0].y);
                      path.points.forEach(p => ctx.lineTo(p.x, p.y));
                  }
                  ctx.stroke();
              });
          }
      }
  }, [drawPaths, originalDims, mode]);

  // --- Mode Switching & History ---
  const handleSwitchMode = (target: EditMode) => {
      if (target === mode) return;
      // Check for unsaved changes
      const hasChanges = (mode === 'inpaint' && drawPaths.length > 0) || 
                         (mode === 'outpaint' && (imgTransform.x !== 0 || imgTransform.y !== 0 || imgTransform.scale !== 1));
      
      if (hasChanges) {
          setShowModeSwitchConfirm({ target });
      } else {
          setMode(target);
          resetTools(true); // Keep prompt when switching modes
      }
  };
  
  const resetTools = (keepPrompt: boolean = false) => {
      setDrawPaths([]);
      setRedoPaths([]);
      setImgTransform({ x: 0, y: 0, scale: 1 });
      setInpaintTool('brush');
      if (!keepPrompt) {
          setPrompt(initialPrompt);
      }
      setRefImages([]);
      
      // Reset Viewport to fit the image freshly
      if (eventSurfaceRef.current && originalDims.w > 0) {
          const { clientWidth, clientHeight } = eventSurfaceRef.current;
          const padding = 0.8;
          const fitZoom = Math.min((clientWidth * padding) / originalDims.w, (clientHeight * padding) / originalDims.h);
          setViewport({ x: 0, y: 0, zoom: fitZoom });
      }
  };

  const confirmModeSwitch = () => {
      if (showModeSwitchConfirm) {
          setMode(showModeSwitchConfirm.target);
          resetTools(true); // Keep prompt when switching modes after confirmation
          setShowModeSwitchConfirm(null);
      }
  };

  // --- Safe Exit Logic ---
  const handleExit = () => {
      if (isGenerating) return; // Prevent exit during generation
      // Check if there are any modifications
      const hasChanges = (mode === 'inpaint' && drawPaths.length > 0) || 
                         (mode === 'outpaint' && (imgTransform.x !== 0 || imgTransform.y !== 0 || imgTransform.scale !== 1)) ||
                         (prompt !== initialPrompt);
      
      if (hasChanges) {
          setShowExitConfirm(true);
      } else {
          onCancel();
      }
  };

  // --- Final Generation ---
  const handleGenerateClick = () => {
      if (!imgElement || originalDims.w === 0) return;
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = frameDims.w;
      canvas.height = frameDims.h;

      // Ensure High Quality scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Smart Logic Variables
      let finalPrompt = prompt;
      let finalModeLabel = mode === 'inpaint' ? 'Inpainting' : 'Outpainting';

      if (mode === 'inpaint') {
          // Draw image
          ctx.drawImage(imgElement, 0, 0, originalDims.w, originalDims.h);
          // Draw mask (composite destination-out to make it transparent)
          ctx.globalCompositeOperation = 'destination-out';
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          drawPaths.forEach(path => {
              ctx.lineWidth = path.brushSize;
              ctx.beginPath();
              if (path.points.length > 0) {
                  ctx.moveTo(path.points[0].x, path.points[0].y);
                  path.points.forEach(p => ctx.lineTo(p.x, p.y));
              }
              ctx.stroke();
          });
          
          // Prompt handling handled in geminiService via "Seamless fill" fallback

      } else {
          // Outpaint: Draw Source Image with transforms
          // Origin is center
          ctx.translate(frameDims.w / 2, frameDims.h / 2);
          ctx.translate(imgTransform.x, imgTransform.y);
          ctx.scale(imgTransform.scale, imgTransform.scale);
          ctx.drawImage(imgElement, -originalDims.w / 2, -originalDims.h / 2);

          // === SMART DETECTION: Check if image covers the canvas ===
          // Canvas Center in absolute coords is (frameDims.w/2, frameDims.h/2)
          // Image Center relative to canvas top-left is:
          const cx = frameDims.w / 2;
          const cy = frameDims.h / 2;
          const imgCX = cx + imgTransform.x;
          const imgCY = cy + imgTransform.y;
          
          // Scaled image dimensions
          const sw = originalDims.w * imgTransform.scale;
          const sh = originalDims.h * imgTransform.scale;
          
          // Image boundaries relative to canvas top-left
          const imgLeft = imgCX - (sw / 2);
          const imgRight = imgCX + (sw / 2);
          const imgTop = imgCY - (sh / 2);
          const imgBottom = imgCY + (sh / 2);
          
          // Check if image boundaries exceed or equal canvas boundaries (with 1px epsilon)
          const coversCanvas = imgLeft <= 1 && imgRight >= frameDims.w - 1 && imgTop <= 1 && imgBottom >= frameDims.h - 1;
          
          if (coversCanvas) {
              // User zoomed in -> Intent is cropping/reframe/upscaling
              // We inject specific quality instructions to prevent hallucinations when the context is tight
              const defaultReframeInstruction = "High fidelity upscale, sharpen details, improve texture quality, maintain original composition.";

              if (!finalPrompt || finalPrompt.trim() === "") {
                  finalPrompt = defaultReframeInstruction;
              } else {
                  // If user input exists, append instructions
                  finalPrompt = `${finalPrompt}, ${defaultReframeInstruction}`;
              }
          } else {
              // User left gaps -> Intent is standard Outpainting
              // Leave finalPrompt empty to trigger "Seamless fill" in service, or use user prompt
          }
      }

      const base64 = canvas.toDataURL('image/png');
      onGenerate(
          finalPrompt,
          base64,
          batchSize,
          size,
          finalModeLabel,
          refImages,
          ratio
      );
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-row bg-gray-100 dark:bg-[#050505] animate-[fadeIn_0.2s_ease-out] select-none text-gray-900 dark:text-gray-200 overflow-hidden transition-colors duration-300">
        {/* CSS for Scanner Animation */}
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

        {/* === GLOBAL OVERLAYS === */}
        {toast && (
            <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[500] pointer-events-none">
                <div className={`${toast.type === 'error' ? 'bg-red-500/90' : 'bg-amber-500/90'} text-white px-6 py-2 rounded-full shadow-2xl backdrop-blur-md font-bold text-sm`}>
                    {toast.msg}
                </div>
            </div>
        )}

        {/* --- ERROR MODAL --- */}
        {error && (
            <div className="fixed inset-0 z-[1000] bg-black/50 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-[fadeIn_0.2s_ease-out]">
                <div className="bg-white dark:bg-[#161b22] border border-red-200 dark:border-red-500/30 w-full max-w-md rounded-2xl shadow-[0_0_50px_rgba(220,38,38,0.2)] overflow-hidden flex flex-col items-center p-8 text-center relative transition-colors">
                     {/* Decorative Background */}
                     <div className="absolute inset-0 bg-gradient-to-b from-red-50 to-transparent dark:from-red-500/5 dark:to-transparent pointer-events-none"></div>

                     <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center border border-red-200 dark:border-red-500/20 mb-6 shadow-xl">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                         </svg>
                     </div>

                     <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('editorErrorTitle')}</h3>
                     <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-8 max-h-[100px] overflow-y-auto scrollbar-thin px-2">{error}</p>

                     <div className="flex gap-4 w-full">
                         <button 
                            onClick={onErrorClear} 
                            className="flex-1 py-3 px-4 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold text-sm transition-colors border border-gray-200 dark:border-gray-700"
                         >
                            {t('editorErrorReturn')}
                         </button>
                         <button 
                            onClick={handleGenerateClick} 
                            className="flex-1 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-colors shadow-lg shadow-red-900/20"
                         >
                            {t('editorErrorRetry')}
                         </button>
                     </div>
                </div>
            </div>
        )}

        {(showExitConfirm || showModeSwitchConfirm) && (
            <div className="fixed inset-0 z-[600] bg-black/50 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-gray-700 p-6 rounded-2xl shadow-2xl max-w-sm w-full text-center space-y-4 animate-[scaleIn_0.1s_ease-out] transition-colors">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{showExitConfirm ? t('editorDiscard') : t('editorSwitchTitle')}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
                            {showExitConfirm ? t('editorDiscardMsg') : t('warningSwitchMode')}
                        </p>
                    </div>
                    <div className="flex gap-3 pt-2">
                         <button onClick={() => { setShowExitConfirm(false); setShowModeSwitchConfirm(null); }} className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg transition-colors font-medium text-sm">{t('editorKeep')}</button>
                         <button onClick={() => showExitConfirm ? onCancel() : confirmModeSwitch()} className="flex-1 px-4 py-2 bg-red-50 dark:bg-red-900/50 hover:bg-red-100 dark:hover:bg-red-800/60 text-red-600 dark:text-red-200 border border-red-200 dark:border-red-500/20 rounded-lg transition-colors font-medium text-sm">{showExitConfirm ? t('editorYesDiscard') : t('editorSwitchBtn')}</button>
                    </div>
                </div>
            </div>
        )}

        {/* === SIDEBAR === */}
        <div className={`bg-white dark:bg-[#0a0c10] border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300 z-50 ${isSidebarOpen ? 'w-80 translate-x-0' : 'w-0 -translate-x-full opacity-0 overflow-hidden'} ${isGenerating ? 'pointer-events-none grayscale opacity-50' : ''}`}>
             <div className="p-4 flex flex-col h-full overflow-y-auto scrollbar-thin w-80">
                 <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">🍌 {t('editorTitle')}</h2>
                    <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-gray-500 dark:text-gray-400">✕</button>
                 </div>
                 
                 {/* Mode Toggle */}
                 <div className="grid grid-cols-2 bg-gray-100 dark:bg-gray-900 rounded-lg p-1 border border-gray-200 dark:border-gray-800 mb-6 gap-1">
                     <button onClick={() => handleSwitchMode('inpaint')} className={`flex items-center justify-center gap-2 py-2.5 px-2 text-xs font-bold rounded-lg transition-all ${mode === 'inpaint' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-md' : 'text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800/50'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        <span>{t('modeInpaint')}</span>
                     </button>
                     <button onClick={() => handleSwitchMode('outpaint')} className={`flex items-center justify-center gap-2 py-2.5 px-2 text-xs font-bold rounded-lg transition-all ${mode === 'outpaint' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-md' : 'text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800/50'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h6v2H5v4H3V3zm12 0h6v6h-2V5h-4V3zm0 14h4v-4h2v6h-6v-2zM3 15h2v4h4v2H3v-6z" />
                        </svg>
                        <span>{t('modeOutpaint')}</span>
                     </button>
                 </div>

                 {/* Settings */}
                 <div className="space-y-6 flex-1">
                     <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">{t('promptLabel')}</label>
                        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} className="w-full h-24 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:ring-1 focus:ring-amber-500/50 resize-none transition-colors" placeholder={t('editorPromptDesc')}></textarea>
                     </div>
                     <BatchSelector batchSize={batchSize} onSelect={setBatchSize} label={t('batchSize')} />
                     <SizeSelector selectedSize={size} onSelect={setSize} label={t('resolution')} />
                     <RatioSelector selectedRatio={ratio} onSelect={setRatio} label={t('aspectRatio')} currentLanguage={currentLanguage} disabled={mode === 'inpaint'} />
                     <ImageUploader 
                        images={refImages} 
                        onImagesChange={setRefImages} 
                        maxImages={3} 
                        safeLimit={1}
                        label={t('refImages')} 
                        currentLanguage={currentLanguage} 
                        onWarning={(msg) => showToast(msg, 'error')}
                        limitWarningMsg={t('warningRefLimitEditor')}
                     />
                 </div>
             </div>
        </div>

        {/* === MAIN WORKSPACE === */}
        <div className="flex-1 relative bg-gray-200 dark:bg-[#050505] overflow-hidden flex flex-col transition-colors">
            
            {/* --- UI LAYER (Z-50) --- */}
            {/* pointer-events-none lets clicks pass through, but children with auto catch them */}
            <div className={`absolute inset-0 z-50 pointer-events-none flex flex-col justify-between p-4 ${isGenerating ? 'opacity-50' : ''}`}>
                {/* Top Bar */}
                <div className="flex justify-between items-start">
                     <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="pointer-events-auto p-3 bg-white/90 dark:bg-gray-900/80 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                     </button>
                     
                     {/* History Actions */}
                     <div className="pointer-events-auto flex gap-2 bg-white/90 dark:bg-gray-900/90 rounded-xl border border-gray-200 dark:border-gray-700 p-1.5 shadow-xl transition-colors">
                        {mode === 'inpaint' ? (
                            <>
                                <button onClick={() => {
                                    if (drawPaths.length === 0) return;
                                    setRedoPaths([...redoPaths, drawPaths[drawPaths.length - 1]]);
                                    setDrawPaths(drawPaths.slice(0, -1));
                                }} disabled={drawPaths.length === 0 || isGenerating} className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded disabled:opacity-30 transition-colors">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                                </button>
                                <button onClick={() => {
                                    if (redoPaths.length === 0) return;
                                    setDrawPaths([...drawPaths, redoPaths[redoPaths.length - 1]]);
                                    setRedoPaths(redoPaths.slice(0, -1));
                                }} disabled={redoPaths.length === 0 || isGenerating} className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded disabled:opacity-30 transition-colors">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" /></svg>
                                </button>
                                <div className="w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>
                                <button onClick={() => resetTools(false)} disabled={isGenerating} className="px-3 text-xs font-bold text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded uppercase transition-colors disabled:opacity-50">{t('btnReset')}</button>
                            </>
                        ) : (
                             <>
                                <button onClick={() => fitImageToFrame('contain')} disabled={isGenerating} className="px-3 py-1.5 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors" title="Fit to Frame">{t('btnFit')}</button>
                                <button onClick={() => fitImageToFrame('cover')} disabled={isGenerating} className="px-3 py-1.5 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors" title="Fill Frame">{t('btnFill')}</button>
                                
                                <div className="w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>
                                
                                {/* ALIGNMENT TOOLS */}
                                <button onClick={() => alignImage('top')} disabled={isGenerating} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors" title={t('btnAlignTop')}>
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3h14M12 21V7m-4 4l4-4 4 4" /></svg>
                                </button>
                                <button onClick={() => alignImage('bottom')} disabled={isGenerating} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors" title={t('btnAlignBottom')}>
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 21h14M12 3v14m-4-4l4 4 4-4" /></svg>
                                </button>
                                <button onClick={() => alignImage('left')} disabled={isGenerating} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors" title={t('btnAlignLeft')}>
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5v14m18-7H7m4-4l-4 4 4 4" /></svg>
                                </button>
                                <button onClick={() => alignImage('right')} disabled={isGenerating} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors" title={t('btnAlignRight')}>
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 5v14M3 12h14m-4-4l4 4-4 4" /></svg>
                                </button>

                                <div className="w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>
                                <button onClick={() => resetTools(false)} disabled={isGenerating} className="px-3 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded uppercase transition-colors disabled:opacity-50">{t('btnReset')}</button>
                             </>
                        )}
                     </div>

                     <button onClick={handleExit} disabled={isGenerating} className="pointer-events-auto p-3 bg-red-100 dark:bg-red-900/40 rounded-full border border-red-200 dark:border-red-500/30 hover:bg-red-200 dark:hover:bg-red-900/80 text-red-600 dark:text-red-200 transition-colors shadow-lg disabled:opacity-30 disabled:cursor-not-allowed">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                     </button>
                </div>

                {/* Center Tools */}
                <div className="flex-1 relative">
                    {/* Left Tools (Inpaint Only) */}
                    {mode === 'inpaint' && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 flex flex-col gap-2 bg-white/90 dark:bg-gray-900/90 rounded-xl border border-gray-200 dark:border-gray-700 p-1.5 shadow-xl pointer-events-auto transition-colors">
                            <button onClick={() => setInpaintTool('pan')} disabled={isGenerating} className={`p-3 rounded-lg transition-colors disabled:opacity-50 ${inpaintTool === 'pan' ? 'bg-amber-500 text-black shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" /></svg>
                            </button>
                            <button onClick={() => setInpaintTool('brush')} disabled={isGenerating} className={`p-3 rounded-lg transition-colors disabled:opacity-50 ${inpaintTool === 'brush' ? 'bg-amber-500 text-black shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                        </div>
                    )}

                    {/* Right Sliders */}
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-6 pointer-events-auto">
                         {mode === 'inpaint' && (
                            <div className="flex flex-col items-center gap-2 bg-white/90 dark:bg-gray-900/90 rounded-full border border-gray-200 dark:border-gray-700 py-3 px-1.5 shadow-xl transition-colors">
                                <div className="text-gray-500 dark:text-gray-400 mb-1">
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                </div>
                                <div className="h-32 w-2 relative flex justify-center">
                                     <input type="range" min="5" max="200" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} 
                                        disabled={isGenerating}
                                        className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-32 -rotate-90 origin-center bg-transparent appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-amber-500 [&::-webkit-slider-thumb]:rounded-full disabled:opacity-50" 
                                        style={{width: '128px'}} />
                                </div>
                            </div>
                         )}
                         
                         <div className="flex flex-col items-center gap-2 bg-white/90 dark:bg-gray-900/90 rounded-full border border-gray-200 dark:border-gray-700 py-3 px-1.5 shadow-xl transition-colors">
                             <div className="text-gray-500 dark:text-gray-400 mb-1">
                                {mode === 'inpaint' ? (
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                ) : (
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                                )}
                             </div>
                             <div className="h-32 w-2 relative flex justify-center">
                                 <input 
                                     type="range" 
                                     min="0.1" 
                                     max="5" 
                                     step="0.05"
                                     value={mode === 'inpaint' ? viewport.zoom : imgTransform.scale} 
                                     onChange={(e) => {
                                         const v = Number(e.target.value);
                                         if (mode === 'inpaint') setViewport(p => ({...p, zoom: v}));
                                         else setImgTransform(p => ({...p, scale: v}));
                                     }}
                                     disabled={isGenerating}
                                     className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-32 -rotate-90 origin-center bg-transparent appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full disabled:opacity-50"
                                     style={{width: '128px'}}
                                 />
                             </div>
                         </div>
                    </div>
                </div>

                <div className="pointer-events-auto mx-auto pb-4 flex flex-col items-center gap-2">
                    <Button 
                        onClick={handleGenerateClick} 
                        isLoading={isGenerating} 
                        className={`
                            shadow-[0_0_40px_rgba(245,158,11,0.6)] border border-yellow-200/60 
                            bg-gradient-to-r from-amber-600 via-yellow-500 to-orange-600 
                            bg-[length:200%_auto] px-8 py-3.5 rounded-full text-lg font-black tracking-widest min-w-[240px] 
                            relative group overflow-hidden transition-all duration-300
                            ${isGenerating ? 'animate-pulse opacity-80 cursor-wait' : 'animate-gradient-xy hover:scale-105'}
                        `}
                        icon={
                            // Magic Repaint Icon: Brush + Sparkles
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 text-yellow-100 drop-shadow-md mr-1 ${isGenerating ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11l-4-4M11 19l-4-4" strokeOpacity="0.5" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 3l-2 2m2-2l-2-2m2 2l2 2m-2-2l2-2" className="animate-pulse" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l-1 1m1-1l-1-1m1 1l1 1m-1-1l1-1" className="animate-pulse" style={{animationDelay: '0.2s'}} />
                            </svg>
                        }
                    >
                       <span className="relative z-10 drop-shadow-md">
                           {isGenerating ? t('statusProcessing') : t('btnRender')}
                       </span>
                       <div className="absolute inset-0 bg-white/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </Button>
                </div>
            </div>

            {/* --- EVENT SURFACE (Z-10) --- */}
            <div 
                ref={eventSurfaceRef}
                className={`absolute inset-0 z-10 touch-none w-full h-full 
                    ${interactionState === 'panning_viewport' ? 'cursor-grabbing' : ''}
                    ${mode === 'inpaint' && inpaintTool === 'brush' ? 'cursor-none' : ''}
                    ${mode === 'outpaint' ? 'cursor-move' : ''}
                    ${mode === 'inpaint' && inpaintTool === 'pan' && interactionState === 'idle' ? 'cursor-grab' : ''}
                    ${isGenerating ? 'pointer-events-none cursor-wait' : ''}
                `}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={() => { handlePointerUp(); setIsHovering(false); }}
                onPointerEnter={() => setIsHovering(true)}
                onWheel={handleWheel}
            />

            {/* --- SCANNING OVERLAY (Z-40) --- */}
            {isGenerating && (
                <div className="absolute inset-0 z-40 pointer-events-none overflow-hidden animate-[fadeIn_0.5s_ease-out]">
                    {/* Darken Backdrop */}
                    <div className="absolute inset-0 bg-white/50 dark:bg-black/40 backdrop-blur-[1px] transition-opacity duration-500"></div>
                    
                    {/* Scanline Animation */}
                    <div className="absolute left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_25px_rgba(251,191,36,1)] animate-scan z-10"></div>
                    
                    {/* Ambient Pulse */}
                    <div className="absolute inset-0 bg-amber-500/5 animate-pulse"></div>

                    {/* Central HUD */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center gap-6 z-20">
                        {/* Hexagon/Circle Spinner */}
                        <div className="relative w-32 h-32 flex items-center justify-center">
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
                        
                        {/* Log Text */}
                        <div className="bg-white/80 dark:bg-black/80 backdrop-blur-xl border border-amber-500/30 rounded-2xl px-8 py-4 shadow-[0_0_40px_rgba(0,0,0,0.2)] dark:shadow-[0_0_40px_rgba(0,0,0,0.6)] flex flex-col items-center min-w-[320px] max-w-[400px]">
                            <span className="text-amber-600 dark:text-amber-400 font-black text-[10px] uppercase tracking-[0.3em] mb-2 animate-pulse flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-amber-500 dark:bg-amber-400 rounded-full"></span>
                                {t('statusProcessing')}
                                <span className="w-1.5 h-1.5 bg-amber-500 dark:bg-amber-400 rounded-full"></span>
                            </span>
                            <span className="text-gray-600 dark:text-gray-300 text-xs font-mono text-center leading-relaxed">
                                {currentLog.replace(/^\[.*?\]\s*/, '') || "Initializing..."}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* --- CONTENT LAYER (Z-0) --- */}
            <div className="absolute inset-0 z-0 overflow-hidden bg-gray-200 dark:bg-[#101010] flex items-center justify-center pointer-events-none transition-colors">
                
                {/* Transform Group (Pan/Zoom) */}
                <div 
                    className="origin-center will-change-transform"
                    style={{
                        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`
                    }}
                >
                    {mode === 'inpaint' ? (
                        // INPAINT MODE: Show Image + Canvas Overlay
                        <div className="relative shadow-2xl" style={{ width: originalDims.w, height: originalDims.h }}>
                            {/* Background Image */}
                            <img src={initialImageUrl} className="w-full h-full block" alt="Source" />
                            
                            {/* Mask Canvas (Visual) */}
                            <canvas 
                                ref={maskCanvasRef} 
                                width={originalDims.w} 
                                height={originalDims.h} 
                                className="absolute inset-0 w-full h-full opacity-60 mix-blend-normal" 
                            />
                            
                            {/* Visual Border */}
                            <div className={`absolute inset-0 border pointer-events-none transition-colors duration-500 ${isGenerating ? 'border-amber-500/50 shadow-[inset_0_0_50px_rgba(245,158,11,0.2)]' : 'border-white/20'}`} />
                        </div>
                    ) : (
                        // OUTPAINT MODE: Show Frame + Scaled Image
                        <div className={`relative shadow-2xl bg-checkerboard overflow-hidden border transition-colors duration-500 ${isGenerating ? 'border-amber-500/50' : 'border-gray-400 dark:border-gray-700'}`} style={{ width: frameDims.w, height: frameDims.h }}>
                            
                            {/* Movable Image Group */}
                            <div className="absolute top-1/2 left-1/2 origin-center" style={{
                                width: originalDims.w, 
                                height: originalDims.h,
                                transform: `translate(-50%, -50%) translate(${imgTransform.x}px, ${imgTransform.y}px) scale(${imgTransform.scale})`
                            }}>
                                <img src={initialImageUrl} className="w-full h-full object-cover shadow-xl" alt="Source" />
                                <div className={`absolute inset-0 border-2 transition-colors ${isGenerating ? 'border-amber-500/30' : 'border-blue-500/50'}`} />
                            </div>

                            {/* Frame Overlay */}
                            <div className="absolute inset-0 pointer-events-none border-4 border-amber-500 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] z-10">
                                <div className="absolute -top-6 left-0 bg-amber-500 text-black px-2 py-0.5 rounded-t text-xs font-bold">{ratio}</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- CUSTOM CURSOR (Brush) --- */}
            {mode === 'inpaint' && inpaintTool === 'brush' && isHovering && cursorPos && !isGenerating && (
                <div 
                    className="fixed pointer-events-none rounded-full border border-white/80 bg-red-500/40 z-[999] backdrop-invert"
                    style={{ 
                        left: cursorPos.x, 
                        top: cursorPos.y, 
                        width: brushSize * viewport.zoom, 
                        height: brushSize * viewport.zoom, 
                        transform: 'translate(-50%, -50%)' 
                    }}
                />
            )}

        </div>
    </div>
  );
};

export default ImageEditor;
