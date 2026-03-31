import React, { useRef, useState, useEffect } from 'react';
import { WORKSPACE_SKETCH_Z_INDEX } from '../constants/workspaceOverlays';
import { Language, getTranslation } from '../utils/translations';
import { MODEL_CAPABILITIES } from '../constants';
import { AspectRatio, ImageModel } from '../types';
import {
    applyWheelZoomDelta,
    appendPointToLatestStroke,
    buildCanvasDimensionsForRatio,
    canvasHasVisibleContent,
    canRedoHistoryState,
    canUndoHistoryState,
    commitHistoryPresent,
    createHistoryState,
    exportCanvasWithBackground,
    fitWorkspaceToViewport,
    redoHistoryState,
    renderWorkspaceCanvas,
    replaceHistoryPresent,
    resetHistoryState,
    screenPointToWorkspacePoint,
    undoHistoryState,
    type WorkspaceHistoryState,
    type WorkspaceStroke,
    type WorkspaceViewport,
} from '../utils/canvasWorkspace';

interface SketchPadProps {
    onSave: (base64: string) => void;
    onClose: () => void;
    currentLanguage?: Language;
    imageModel: ImageModel;
    currentRatio: AspectRatio;
}

type ToolType = 'pen' | 'eraser' | 'pan';

const buildDefaultViewport = (): WorkspaceViewport => ({
    x: 0,
    y: 0,
    zoom: 1,
});

const SketchPad: React.FC<SketchPadProps> = ({ onSave, onClose, currentLanguage = 'en', imageModel, currentRatio }) => {
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
    const [historyState, setHistoryState] = useState<WorkspaceHistoryState<WorkspaceStroke[]>>(() =>
        createHistoryState([]),
    );

    // --- Canvas/View State ---
    const [canvasDims, setCanvasDims] = useState({ w: 800, h: 800 });
    const [transform, setTransform] = useState<WorkspaceViewport>(() => buildDefaultViewport());
    const [hasFitInitially, setHasFitInitially] = useState(false);

    // --- UI State ---
    const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
    const [confirmAction, setConfirmAction] = useState<'close' | 'use' | 'use_blank' | null>(null);

    const t = (key: string) => getTranslation(currentLanguage as Language, key);
    const paths = historyState.present;

    // --- Canvas Init & History ---

    // 1. Calculate Base Resolution based on Ratio
    useEffect(() => {
        setCanvasDims(buildCanvasDimensionsForRatio(currentRatio));
        setHistoryState(resetHistoryState([]));
        setTransform(buildDefaultViewport());
        setHasFitInitially(false); // Reset fit flag to trigger auto-fit
    }, [currentRatio]);

    // 2. Render Vector Paths into Raster Canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');
        if (!canvas || !context || canvasDims.w <= 0) {
            return;
        }

        renderWorkspaceCanvas(context, canvas.width, canvas.height, paths, { backgroundColor: '#ffffff' });
    }, [canvasDims, paths]);

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
        const safeArea = {
            top: isMobile ? 80 : 90,
            bottom: isMobile ? 180 : 140,
            left: isMobile ? 20 : 40,
            right: isMobile ? 80 : 120,
        };

        setTransform(fitWorkspaceToViewport(canvasDims.w, canvasDims.h, clientWidth, clientHeight, safeArea));
    };

    // --- History Logic ---
    const handleUndo = () => setHistoryState((previous) => undoHistoryState(previous));
    const handleRedo = () => setHistoryState((previous) => redoHistoryState(previous));

    // --- Interaction Logic ---

    const getCoordinates = (clientX: number, clientY: number) => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return { x: 0, y: 0 };
        const point = screenPointToWorkspacePoint(clientX, clientY, container.getBoundingClientRect(), transform);
        return {
            x: point.x + canvas.width / 2,
            y: point.y + canvas.height / 2,
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
            setHistoryState((previous) =>
                commitHistoryPresent(previous, [
                    ...previous.present,
                    {
                        points: [{ x, y }],
                        brushSize: lineWidth,
                        color: activeTool === 'eraser' ? '#ffffff' : color,
                    },
                ]),
            );
        }
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        const { clientX, clientY } = e;
        setCursorPos({ x: clientX, y: clientY });

        if (isPanning) {
            e.preventDefault();
            setTransform({
                ...transform,
                x: clientX - startPan.x,
                y: clientY - startPan.y,
            });
            return;
        }

        if (isDrawing) {
            e.preventDefault();
            const { x, y } = getCoordinates(clientX, clientY);
            setHistoryState((previous) =>
                replaceHistoryPresent(previous, appendPointToLatestStroke(previous.present, { x, y })),
            );
        }
    };

    const handlePointerUp = () => {
        if (isPanning) setIsPanning(false);
        if (isDrawing) setIsDrawing(false);
    };

    const handleWheel = (e: React.WheelEvent) => {
        setTransform((previous) => ({
            ...previous,
            zoom: applyWheelZoomDelta(previous.zoom, e.deltaY, 0.001, 0.1, 5),
        }));
    };

    const handleClear = () => {
        setHistoryState((previous) => commitHistoryPresent(previous, []));
    };

    // --- Empty Check Logic ---
    const checkIfCanvasIsEmpty = (canvas: HTMLCanvasElement): boolean => {
        return !canvasHasVisibleContent(canvas);
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

    const handleConfirm = () => {
        if (confirmAction === 'close' || confirmAction === 'use_blank') onClose();
        else if (confirmAction === 'use') {
            if (canvasRef.current) {
                onSave(exportCanvasWithBackground(canvasRef.current));
            }
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

    // Enforce model constraints dynamically
    useEffect(() => {
        const supported = MODEL_CAPABILITIES[imageModel].supportedRatios;
        if (!supported.includes(currentRatio)) {
            setHistoryState(resetHistoryState([]));
        }
    }, [imageModel, currentRatio]);

    return (
        <div
            data-testid="sketchpad"
            className="fixed inset-0 flex flex-col bg-gray-100 dark:bg-[#050505] animate-[fadeIn_0.2s_ease-out] select-none overflow-hidden"
            style={{ zIndex: WORKSPACE_SKETCH_Z_INDEX.root }}
        >
            {/* === TOP HEADER (Actions & Nav) === */}
            <div className="absolute top-0 left-0 right-0 z-50 flex justify-between items-center p-3 pointer-events-none">
                {/* Left: History */}
                <div className="pointer-events-auto flex gap-2">
                    {/* Undo / Redo */}
                    <div className="nbu-toolbar-shell flex p-0.5">
                        <button
                            onClick={handleUndo}
                            disabled={!canUndoHistoryState(historyState)}
                            className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 transition-colors"
                            title={t('toolUndo')}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                                />
                            </svg>
                        </button>
                        <div className="w-px bg-gray-200 dark:bg-gray-700 mx-0.5 my-1"></div>
                        <button
                            onClick={handleRedo}
                            disabled={!canRedoHistoryState(historyState)}
                            className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 transition-colors"
                            title={t('toolRedo')}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6"
                                />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="pointer-events-auto flex gap-2">
                    <button
                        onClick={triggerUse}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all hover:scale-105 active:scale-95"
                    >
                        {t('sketchUse')}
                    </button>
                    <button
                        data-testid="sketchpad-close"
                        onClick={triggerClose}
                        className="nbu-toolbar-shell p-2 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-500 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-300"
                        title={t('sketchExitTitle')}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
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
                        transform: `translate(calc(-50% + ${transform.x}px), calc(-50% + ${transform.y}px)) scale(${transform.zoom})`,
                        backgroundImage:
                            'linear-gradient(45deg, #888 25%, transparent 25%), linear-gradient(-45deg, #888 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #888 75%), linear-gradient(-45deg, transparent 75%, #888 75%)',
                        backgroundSize: '20px 20px',
                        backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                        transformOrigin: 'center',
                    }}
                ></div>

                {/* Canvas Transform Wrapper */}
                <div
                    style={{
                        transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.zoom})`,
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
                        className="fixed pointer-events-none rounded-full border shadow-sm"
                        style={{
                            zIndex: WORKSPACE_SKETCH_Z_INDEX.brushCursor,
                            left: cursorPos.x,
                            top: cursorPos.y,
                            width: lineWidth * transform.zoom,
                            height: lineWidth * transform.zoom,
                            transform: 'translate(-50%, -50%)',
                            backgroundColor: activeTool === 'eraser' ? 'rgba(255, 255, 255, 0.5)' : `${color}40`,
                            borderColor: activeTool === 'eraser' ? '#333' : color,
                            borderWidth: '2px',
                            boxShadow: '0 0 5px rgba(0,0,0,0.2)',
                        }}
                    />
                )}
            </div>

            {/* === BOTTOM FLOATING TOOLBAR === */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-3 items-center w-full px-4 pointer-events-none">
                {/* Tool Selection Pill */}
                <div className="nbu-toolbar-shell pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto p-2 nbu-scrollbar-subtle">
                    {/* Pan Tool (Hand) */}
                    <button
                        onClick={() => setActiveTool('pan')}
                        className={`p-3 rounded-xl transition-all ${activeTool === 'pan' ? 'bg-amber-500 text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                        title={t('toolPan')}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11"
                            />
                        </svg>
                    </button>

                    <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-1"></div>

                    {/* Pen Tool */}
                    <button
                        onClick={() => setActiveTool('pen')}
                        title={t('toolPen')}
                        className={`p-3 rounded-xl transition-all ${activeTool === 'pen' ? 'bg-amber-500 text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                        </svg>
                    </button>

                    {/* Eraser Tool */}
                    <button
                        onClick={() => setActiveTool('eraser')}
                        title={t('toolEraser')}
                        className={`p-3 rounded-xl transition-all ${activeTool === 'eraser' ? 'bg-amber-500 text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.358 12.642l-7.999-8a2.001 2.001 0 00-2.829 0l-7.999 8a2.001 2.001 0 000 2.828l7.999 8c.78.78 2.047.78 2.828 0l7.999-8a2.001 2.001 0 000-2.828zM9.529 6.05l2.829 2.829-7.999 8-2.829-2.829 7.999-8z" />
                        </svg>
                    </button>

                    <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-1"></div>

                    {/* P7-5: Preset Color Swatches */}
                    <div className="flex items-center gap-0.5 mx-1">
                        {['#000000', '#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7'].map(
                            (c) => (
                                <button
                                    key={c}
                                    onClick={() => {
                                        setColor(c);
                                        setActiveTool('pen');
                                    }}
                                    className={`w-4 h-4 rounded-full border transition-transform hover:scale-125 ${
                                        color === c
                                            ? 'ring-2 ring-amber-500 ring-offset-1 dark:ring-offset-gray-900 scale-110'
                                            : 'border-gray-300 dark:border-gray-600'
                                    }`}
                                    style={{ backgroundColor: c }}
                                    title={c}
                                />
                            ),
                        )}
                    </div>

                    {/* Color Palette */}
                    <div className="relative group mx-1">
                        <button className="p-3 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8z"
                                />
                                <circle cx="7.5" cy="10.5" r="1" fill="currentColor" stroke="none" />
                                <circle cx="12" cy="7.5" r="1" fill="currentColor" stroke="none" />
                                <circle cx="16.5" cy="10.5" r="1" fill="currentColor" stroke="none" />
                            </svg>
                            <div
                                className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full border border-white dark:border-gray-800 shadow-sm"
                                style={{ backgroundColor: color }}
                            ></div>
                        </button>
                        <input
                            type="color"
                            value={color}
                            onChange={(e) => {
                                setColor(e.target.value);
                                setActiveTool('pen');
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            title={t('chooseColor')}
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
                            title={t('toolSize')}
                        />
                    </div>

                    <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-1"></div>

                    {/* Clear */}
                    <button
                        onClick={handleClear}
                        className="p-3 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-xl transition-colors"
                        title={t('sketchClear')}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                        </svg>
                    </button>
                </div>
            </div>

            {/* === RIGHT SIDE FLOATING ZOOM === */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2 pointer-events-none">
                <div className="nbu-toolbar-shell pointer-events-auto flex flex-col items-center gap-3 rounded-full px-2 py-4">
                    <button
                        onClick={handleFitScreen}
                        className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-300 hover:text-amber-500 transition-colors"
                        title={t('btnFit')}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <rect x="4" y="4" width="16" height="12" rx="1" strokeWidth={2} />
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 2v2M2 16h20M7 16l-2 5M17 16l2 5"
                            />
                        </svg>
                    </button>
                    <div className="h-32 w-2 relative flex justify-center">
                        <input
                            type="range"
                            min="0.1"
                            max="5"
                            step="0.1"
                            value={transform.zoom}
                            onChange={(e) => setTransform((prev) => ({ ...prev, zoom: Number(e.target.value) }))}
                            className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-32 -rotate-90 origin-center bg-transparent appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-amber-500 [&::-webkit-slider-thumb]:rounded-full"
                            style={{ width: '128px' }}
                            title={t('toolZoom')}
                        />
                    </div>
                </div>
            </div>

            {/* === CONFIRMATION DIALOG === */}
            {confirmAction && (
                <div
                    className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.1s_ease-out]"
                    style={{ zIndex: WORKSPACE_SKETCH_Z_INDEX.confirm }}
                    onClick={() => setConfirmAction(null)}
                >
                    <div
                        className="nbu-modal-shell w-full max-w-sm overflow-hidden p-6 text-center transform scale-100"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                            {confirmAction === 'close'
                                ? t('sketchExitTitle')
                                : confirmAction === 'use_blank'
                                  ? t('sketchBlankWarn')
                                  : confirmAction === 'change_ratio'
                                    ? t('sketchRatioWarnTitle')
                                    : t('sketchUse') + '?'}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                            {confirmAction === 'close'
                                ? t('sketchExitMsg')
                                : confirmAction === 'use_blank'
                                  ? t('sketchBlankMsg')
                                  : confirmAction === 'change_ratio'
                                    ? t('sketchRatioWarnMsg')
                                    : t('sketchLeaveWarning')}
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmAction(null)}
                                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                {confirmAction === 'use_blank' ? t('sketchEmptyKeep') : t('clearHistoryCancel')}
                            </button>
                            <button
                                onClick={handleConfirm}
                                className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold text-white shadow-lg transition-all ${confirmAction === 'close' || confirmAction === 'use_blank' || confirmAction === 'change_ratio' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30' : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30'}`}
                            >
                                {confirmAction === 'close'
                                    ? t('sketchExitConfirm')
                                    : confirmAction === 'use_blank'
                                      ? t('sketchEmptyClose')
                                      : confirmAction === 'change_ratio'
                                        ? t('sketchRatioChange')
                                        : t('sketchUse')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SketchPad;
