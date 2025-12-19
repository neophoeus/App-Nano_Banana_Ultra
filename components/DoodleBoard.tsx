

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Language, getTranslation } from '../utils/translations';
import { ASPECT_RATIOS } from '../constants';
import { AspectRatio } from '../types';

interface DoodleBoardProps {
  onSave: (base64: string) => void;
  onClose: () => void;
  currentLanguage?: Language;
}

type ToolType = 'pen' | 'eraser' | 'pan';

const DoodleBoard: React.FC<DoodleBoardProps> = ({ onSave, onClose, currentLanguage = 'en' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // --- Tools State ---
  const [activeTool, setActiveTool] = useState<ToolType>('pen');
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(2);
  
  // --- Interaction State ---
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  
  // --- History State ---
  const [history, setHistory] = useState<string[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);

  // --- Canvas/View State ---
  const [currentRatio, setCurrentRatio] = useState<AspectRatio>('1:1');
  const [canvasDims, setCanvasDims] = useState({ w: 800, h: 800 });
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [hasFitInitially, setHasFitInitially] = useState(false);
  
  // --- UI State ---
  const [cursorPos, setCursorPos] = useState<{x: number, y: number} | null>(null);
  const [showRatioMenu, setShowRatioMenu] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'close' | 'use' | 'use_blank' | 'change_ratio' | null>(null);
  const [pendingRatio, setPendingRatio] = useState<AspectRatio | null>(null);

  const t = (key: string) => getTranslation(currentLanguage as Language, key);

  // --- Canvas Init & History ---
  
  // 1. Calculate Base Resolution based on Ratio
  useEffect(() => {
    const [rW, rH] = currentRatio.split(':').map(Number);
    const base = 1024; // High quality base
    const ratio = rW / rH;
    
    let w, h;
    if (ratio > 1) {
        w = base;
        h = Math.round(base / ratio);
    } else {
        h = base;
        w = Math.round(base * ratio);
    }
    setCanvasDims({ w, h });
    setHasFitInitially(false); // Reset fit flag to trigger auto-fit
  }, [currentRatio]);

  // 2. Initialize Canvas Context & Background
  useEffect(() => {
      const canvas = canvasRef.current;
      if (canvas && canvasDims.w > 0) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
             // Only fill white if fresh
             if (history.length === 0) {
                 ctx.fillStyle = '#ffffff';
                 ctx.fillRect(0, 0, canvas.width, canvas.height);
                 saveState(canvas);
             }
          }
      }
  }, [canvasDims]);

  // 3. Auto-Fit to Screen
  useEffect(() => {
      if (!hasFitInitially && containerRef.current && canvasDims.w > 0) {
          handleFitScreen();
          setHasFitInitially(true);
      }
  }, [canvasDims, hasFitInitially]);

  const handleFitScreen = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      
      const isMobile = clientWidth < 768;
      
      // Precise Safe Area Calculation to avoid UI overlaps
      const safeArea = {
          top: isMobile ? 80 : 90,
          bottom: isMobile ? 180 : 140, // Mobile address bar area + toolbar needs more space
          left: isMobile ? 20 : 40,
          right: isMobile ? 80 : 120    // Right slider clearance
      };
      
      const availableW = clientWidth - (safeArea.left + safeArea.right);
      const availableH = clientHeight - (safeArea.top + safeArea.bottom);
      
      if (availableW <= 0 || availableH <= 0) return;
      
      const scaleX = availableW / canvasDims.w;
      const scaleY = availableH / canvasDims.h;
      
      const newScale = Math.min(scaleX, scaleY);
      
      const screenCenterX = clientWidth / 2;
      const screenCenterY = clientHeight / 2;
      
      const safeCenterX = safeArea.left + (availableW / 2);
      const safeCenterY = safeArea.top + (availableH / 2);
      
      const offsetX = safeCenterX - screenCenterX;
      const offsetY = safeCenterY - screenCenterY;
      
      setTransform({ x: offsetX, y: offsetY, scale: newScale });
  };

  // --- History Logic ---
  const saveState = (c: HTMLCanvasElement = canvasRef.current!) => {
      if(!c) return;
      const dataUrl = c.toDataURL();
      const newHistory = history.slice(0, historyStep + 1);
      newHistory.push(dataUrl);
      if (newHistory.length > 20) newHistory.shift();
      setHistory(newHistory);
      setHistoryStep(newHistory.length - 1);
  };

  const loadHistory = (step: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx && history[step]) {
          const img = new Image();
          img.onload = () => {
              ctx.clearRect(0,0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0);
          };
          img.src = history[step];
          setHistoryStep(step);
      }
  };

  const handleUndo = () => { if (historyStep > 0) loadHistory(historyStep - 1); };
  const handleRedo = () => { if (historyStep < history.length - 1) loadHistory(historyStep + 1); };

  // --- Interaction Logic ---

  const getCoordinates = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      // Allow multi-touch gestures to pass through if needed, 
      // but here we block mainly to handle logic.
      if (e.target !== canvasRef.current && activeTool !== 'pan') return;

      const { clientX, clientY } = e;

      // Middle mouse or Spacebar -> Temporary Pan
      if (e.button === 1 || e.buttons === 4 || activeTool === 'pan') {
          e.preventDefault();
          setIsPanning(true);
          setStartPan({ x: clientX - transform.x, y: clientY - transform.y });
          return;
      }

      // Drawing Tools
      if (e.button === 0 && (activeTool === 'pen' || activeTool === 'eraser')) {
          e.preventDefault();
          setIsDrawing(true);
          const { x, y } = getCoordinates(clientX, clientY);
          const ctx = canvasRef.current?.getContext('2d');
          if (ctx) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = activeTool === 'eraser' ? '#ffffff' : color;
            ctx.lineWidth = lineWidth;
          }
      }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      const { clientX, clientY } = e;
      setCursorPos({ x: clientX, y: clientY });

      if (isPanning) {
          e.preventDefault();
          setTransform(prev => ({
              ...prev,
              x: clientX - startPan.x,
              y: clientY - startPan.y
          }));
          return;
      }

      if (isDrawing) {
          e.preventDefault();
          const { x, y } = getCoordinates(clientX, clientY);
          const ctx = canvasRef.current?.getContext('2d');
          if (ctx) {
              ctx.lineTo(x, y);
              ctx.stroke();
          }
      }
  };

  const handlePointerUp = () => {
      if (isPanning) setIsPanning(false);
      if (isDrawing) {
          setIsDrawing(false);
          saveState();
      }
  };

  const handleWheel = (e: React.WheelEvent) => {
      // Zoom
      const scaleAmount = -e.deltaY * 0.001;
      const newScale = Math.min(Math.max(0.1, transform.scale + scaleAmount), 5);
      setTransform(prev => ({ ...prev, scale: newScale }));
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      saveState(canvas);
    }
  };

  // --- Empty Check Logic ---
  const checkIfCanvasIsEmpty = (canvas: HTMLCanvasElement): boolean => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return true;
      try {
          const w = canvas.width;
          const h = canvas.height;
          const imgData = ctx.getImageData(0, 0, w, h);
          const data = imgData.data;
          
          for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              const a = data[i + 3];

              // Treat transparent (alpha < 10) as empty
              if (a < 10) continue; 
              
              // If visible and NOT white (allow tolerance for minor compression/aa artifacts)
              // If we see color darker than 250, we assume it's content
              if (r < 250 || g < 250 || b < 250) return false;
          }
          return true;
      } catch (e) {
          return false;
      }
  };

  const triggerClose = () => {
      const canvas = canvasRef.current;
      const isEmpty = canvas ? checkIfCanvasIsEmpty(canvas) : true;
      if (isEmpty) onClose();
      else setConfirmAction('close');
  };

  const triggerUse = () => {
      const canvas = canvasRef.current;
      const isEmpty = canvas ? checkIfCanvasIsEmpty(canvas) : true;
      if (isEmpty) setConfirmAction('use_blank');
      else setConfirmAction('use');
  };

  const applyRatioChange = (newRatio: AspectRatio) => {
      setHistory([]); 
      setHistoryStep(-1);
      setCurrentRatio(newRatio);
      setShowRatioMenu(false);
      setTransform({x: 0, y: 0, scale: 1}); // Reset view logic will trigger effect
      setHasFitInitially(false);
  };

  const handleConfirm = () => {
      if (confirmAction === 'close' || confirmAction === 'use_blank') onClose();
      else if (confirmAction === 'use') {
          if (canvasRef.current) {
              // Create a temporary canvas to composite the drawing onto a white background
              // This ensures that even if the drawing layer has transparency, the saved image is opaque white.
              const canvas = canvasRef.current;
              const w = canvas.width;
              const h = canvas.height;
              
              const tempCanvas = document.createElement('canvas');
              tempCanvas.width = w;
              tempCanvas.height = h;
              const tCtx = tempCanvas.getContext('2d');
              
              if (tCtx) {
                  // 1. Fill White
                  tCtx.fillStyle = '#ffffff';
                  tCtx.fillRect(0, 0, w, h);
                  // 2. Draw original canvas on top
                  tCtx.drawImage(canvas, 0, 0);
                  // 3. Save result
                  onSave(tempCanvas.toDataURL('image/png'));
              } else {
                  // Fallback
                  onSave(canvas.toDataURL('image/png'));
              }
          }
      }
      else if (confirmAction === 'change_ratio' && pendingRatio) {
          applyRatioChange(pendingRatio);
          setPendingRatio(null);
      }
      setConfirmAction(null);
  };

  // --- Keyboard Shortcuts ---
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.code === 'Space') {
             if (containerRef.current) containerRef.current.style.cursor = 'grab';
          }
      };
      const handleKeyUp = (e: KeyboardEvent) => {
          if (e.code === 'Space') {
             if (containerRef.current) containerRef.current.style.cursor = 'default';
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      return () => {
          window.removeEventListener('keydown', handleKeyDown);
          window.removeEventListener('keyup', handleKeyUp);
      };
  }, []);

  return (
    <div className="fixed inset-0 z-[10001] flex flex-col bg-gray-100 dark:bg-[#050505] animate-[fadeIn_0.2s_ease-out] select-none overflow-hidden">
        
        {/* === TOP HEADER (Actions & Nav) === */}
        <div className="absolute top-0 left-0 right-0 z-50 flex justify-between items-center p-3 pointer-events-none">
            {/* Left: Ratio & Clear */}
            <div className="pointer-events-auto flex gap-2">
                {/* Ratio Button */}
                <div className="relative">
                    <button 
                        onClick={() => setShowRatioMenu(!showRatioMenu)}
                        className="flex items-center gap-1 px-3 py-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <span>{currentRatio}</span>
                        <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {showRatioMenu && (
                        <div className="absolute top-full left-0 mt-2 w-32 bg-white dark:bg-[#161b22] border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden z-[100] max-h-[60vh] overflow-y-auto">
                            {ASPECT_RATIOS.map((r) => (
                                <button
                                    key={r.value}
                                    onClick={() => {
                                        if (currentRatio === r.value) return;
                                        
                                        const canvas = canvasRef.current;
                                        // If canvas has content, warn user
                                        if (canvas && !checkIfCanvasIsEmpty(canvas)) {
                                            setPendingRatio(r.value);
                                            setConfirmAction('change_ratio');
                                            setShowRatioMenu(false);
                                        } else {
                                            // Empty canvas, just switch
                                            applyRatioChange(r.value);
                                        }
                                    }}
                                    className={`w-full text-left px-3 py-2 text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-800 ${currentRatio === r.value ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'text-gray-600 dark:text-gray-400'}`}
                                >
                                    {r.value}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Undo / Redo */}
                <div className="flex bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg p-0.5">
                    <button onClick={handleUndo} disabled={historyStep <= 0} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                    </button>
                    <div className="w-px bg-gray-200 dark:bg-gray-700 mx-0.5 my-1"></div>
                    <button onClick={handleRedo} disabled={historyStep >= history.length - 1} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" /></svg>
                    </button>
                </div>
            </div>

            {/* Right: Actions */}
            <div className="pointer-events-auto flex gap-2">
                <button 
                    onClick={triggerUse}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all hover:scale-105 active:scale-95"
                >
                    {t('doodleUse')}
                </button>
                <button 
                    onClick={triggerClose}
                    className="p-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-50 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
        </div>

        {/* === MAIN CANVAS AREA === */}
        <div 
            ref={containerRef}
            className={`flex-1 relative overflow-hidden flex items-center justify-center touch-none
                ${activeTool === 'pan' || isPanning ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'}
            `}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onWheel={handleWheel}
        >
            {/* Background Grid (Fixed Large Element to avoid edges appearing) */}
            <div 
                className="absolute pointer-events-none opacity-10" 
                style={{
                    left: '50%',
                    top: '50%',
                    width: '50000px', // Large enough to cover reasonable panning/zooming without showing edges
                    height: '50000px',
                    // Use translate with calc to position the center of this huge div at the viewport center relative to transform
                    transform: `translate(calc(-50% + ${transform.x}px), calc(-50% + ${transform.y}px)) scale(${transform.scale})`,
                    backgroundImage: 'linear-gradient(45deg, #888 25%, transparent 25%), linear-gradient(-45deg, #888 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #888 75%), linear-gradient(-45deg, transparent 75%, #888 75%)',
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                    transformOrigin: 'center'
                }}
            ></div>

            {/* Canvas Transform Wrapper */}
            <div 
                style={{
                    transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                }}
                className="shadow-2xl shadow-black/50 transition-transform duration-75 ease-out origin-center"
            >
                <canvas 
                    ref={canvasRef}
                    width={canvasDims.w}
                    height={canvasDims.h}
                    className="block bg-white touch-none"
                />
            </div>

            {/* Brush Cursor */}
            {activeTool !== 'pan' && !isPanning && cursorPos && (
                <div 
                    className="fixed pointer-events-none rounded-full border shadow-sm z-[2500]"
                    style={{
                        left: cursorPos.x,
                        top: cursorPos.y,
                        width: lineWidth * transform.scale,
                        height: lineWidth * transform.scale,
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: activeTool === 'eraser' ? 'rgba(255, 255, 255, 0.5)' : `${color}40`,
                        borderColor: activeTool === 'eraser' ? '#333' : color,
                        borderWidth: '2px',
                        boxShadow: '0 0 5px rgba(0,0,0,0.2)'
                    }}
                />
            )}
        </div>

        {/* === BOTTOM FLOATING TOOLBAR === */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-3 items-center w-full px-4 pointer-events-none">
            
            {/* Tool Selection Pill */}
            <div className="pointer-events-auto bg-white/90 dark:bg-[#161b22]/90 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl p-2 flex items-center gap-1 overflow-x-auto max-w-full scrollbar-thin">
                
                {/* Pan Tool (Hand) */}
                <button onClick={() => setActiveTool('pan')} className={`p-3 rounded-xl transition-all ${activeTool === 'pan' ? 'bg-amber-500 text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" /></svg>
                </button>

                <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-1"></div>

                {/* Pen Tool */}
                <button onClick={() => setActiveTool('pen')} className={`p-3 rounded-xl transition-all ${activeTool === 'pen' ? 'bg-amber-500 text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>

                {/* Eraser Tool */}
                <button onClick={() => setActiveTool('eraser')} className={`p-3 rounded-xl transition-all ${activeTool === 'eraser' ? 'bg-amber-500 text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.358 12.642l-7.999-8a2.001 2.001 0 00-2.829 0l-7.999 8a2.001 2.001 0 000 2.828l7.999 8c.78.78 2.047.78 2.828 0l7.999-8a2.001 2.001 0 000-2.828zM9.529 6.05l2.829 2.829-7.999 8-2.829-2.829 7.999-8z" /></svg>
                </button>

                <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-1"></div>

                {/* Color Palette */}
                <div className="relative group mx-1">
                    <button className="p-3 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8z" />
                           <circle cx="7.5" cy="10.5" r="1" fill="currentColor" stroke="none"/>
                           <circle cx="12" cy="7.5" r="1" fill="currentColor" stroke="none"/>
                           <circle cx="16.5" cy="10.5" r="1" fill="currentColor" stroke="none"/>
                        </svg>
                        <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full border border-white dark:border-gray-800 shadow-sm" style={{ backgroundColor: color }}></div>
                    </button>
                    <input 
                        type="color" 
                        value={color}
                        onChange={(e) => { setColor(e.target.value); setActiveTool('pen'); }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        title="Choose color"
                    />
                </div>

                {/* Size */}
                <div className="flex items-center px-2">
                    <input 
                        type="range" 
                        min="1" 
                        max="80" 
                        value={lineWidth} 
                        onChange={(e) => setLineWidth(Number(e.target.value))} 
                        className="w-20 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-amber-500 [&::-webkit-slider-thumb]:rounded-full"
                    />
                </div>

                <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-1"></div>

                {/* Clear */}
                <button 
                    onClick={handleClear}
                    className="p-3 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-xl transition-colors"
                    title={t('doodleClear')}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
            </div>
        </div>

        {/* === RIGHT SIDE FLOATING ZOOM === */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2 pointer-events-none">
             <div className="pointer-events-auto bg-white/90 dark:bg-[#161b22]/90 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-full py-4 px-2 shadow-xl flex flex-col items-center gap-3">
                 <button onClick={handleFitScreen} className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-300 hover:text-amber-500 transition-colors" title={t('btnFit')}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <rect x="4" y="4" width="16" height="12" rx="1" strokeWidth={2} />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v2M2 16h20M7 16l-2 5M17 16l2 5" />
                    </svg>
                 </button>
                 <div className="h-32 w-2 relative flex justify-center">
                     <input 
                         type="range" 
                         min="0.1" 
                         max="5" 
                         step="0.1"
                         value={transform.scale} 
                         onChange={(e) => setTransform(prev => ({ ...prev, scale: Number(e.target.value) }))} 
                         className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-32 -rotate-90 origin-center bg-transparent appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-amber-500 [&::-webkit-slider-thumb]:rounded-full"
                         style={{width: '128px'}}
                     />
                 </div>
             </div>
        </div>

        {/* === CONFIRMATION DIALOG === */}
        {confirmAction && (
             <div className="fixed inset-0 z-[2600] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.1s_ease-out]" onClick={() => setConfirmAction(null)}>
                 <div className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-gray-700 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden p-6 text-center transform scale-100" onClick={e => e.stopPropagation()}>
                     <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                         {confirmAction === 'close' ? t('doodleExitTitle') : 
                          confirmAction === 'use_blank' ? t('doodleBlankWarn') : 
                          confirmAction === 'change_ratio' ? t('doodleRatioWarnTitle') :
                          t('doodleUse') + '?'}
                     </h3>
                     <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                         {confirmAction === 'close' 
                             ? t('doodleExitMsg') 
                             : confirmAction === 'use_blank' 
                                 ? t('doodleBlankMsg') 
                                 : confirmAction === 'change_ratio'
                                    ? t('doodleRatioWarnMsg')
                                    : t('doodleLeaveWarning')
                         }
                     </p>
                     
                     <div className="flex gap-3">
                         <button 
                             onClick={() => setConfirmAction(null)}
                             className="flex-1 py-2.5 px-4 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                         >
                             {confirmAction === 'use_blank' ? t('doodleEmptyKeep') : t('clearHistoryCancel')}
                         </button>
                         <button 
                             onClick={handleConfirm}
                             className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold text-white shadow-lg transition-all ${confirmAction === 'close' || confirmAction === 'use_blank' || confirmAction === 'change_ratio' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30' : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30'}`}
                         >
                             {confirmAction === 'close' ? t('doodleExitConfirm') : 
                              confirmAction === 'use_blank' ? t('doodleEmptyClose') : 
                              confirmAction === 'change_ratio' ? t('doodleRatioChange') :
                              t('doodleUse')}
                         </button>
                     </div>
                 </div>
             </div>
        )}
    </div>
  );
};

export default DoodleBoard;
