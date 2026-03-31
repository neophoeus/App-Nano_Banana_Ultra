import React, { useRef, useState, useEffect, useCallback } from 'react';
import Button from './Button';
import { WORKSPACE_EDITOR_Z_INDEX } from '../constants/workspaceOverlays';
import { ImageSize, AspectRatio, ImageModel } from '../types';
import { Language, getTranslation } from '../utils/translations';
import { MODEL_CAPABILITIES } from '../constants';
import {
    appendPointToLatestStroke,
    applyPanDelta,
    applyWheelZoomDelta,
    canRedoHistoryState,
    canUndoHistoryState,
    commitHistoryPresent,
    createHistoryState,
    drawStrokesToCanvas,
    drawTextLabelsToCanvas,
    fitImageToViewport,
    redoHistoryState,
    replaceHistoryPresent,
    resetHistoryState,
    screenPointToWorkspacePoint,
    undoHistoryState,
    type WorkspaceHistoryState,
} from '../utils/canvasWorkspace';

interface ImageEditorProps {
    initialImageUrl: string;
    initialPrompt: string;
    initialObjectImages: string[];
    initialCharacterImages: string[];
    initialRatio: AspectRatio;
    initialSize: ImageSize;
    initialBatchSize: number;
    prompt: string;
    onPromptChange: React.Dispatch<React.SetStateAction<string>>;
    objectImages: string[];
    onObjectImagesChange: React.Dispatch<React.SetStateAction<string[]>>;
    characterImages: string[];
    onCharacterImagesChange: React.Dispatch<React.SetStateAction<string[]>>;
    ratio: AspectRatio;
    onRatioChange: React.Dispatch<React.SetStateAction<AspectRatio>>;
    size: ImageSize;
    onSizeChange: React.Dispatch<React.SetStateAction<ImageSize>>;
    batchSize: number;
    onBatchSizeChange: React.Dispatch<React.SetStateAction<number>>;
    onGenerate: (
        prompt: string,
        imageBase64: string,
        batchSize: number,
        size: ImageSize,
        mode: string,
        objectImages?: string[],
        characterImages?: string[],
        targetRatio?: AspectRatio,
    ) => void;
    onCancel: (options?: { discardSharedContext?: boolean }) => void;
    isGenerating: boolean;
    currentLanguage?: Language;
    currentLog?: string;
    error?: string | null;
    onErrorClear?: () => void;
    imageModel: ImageModel;
    onModelChange: (model: ImageModel) => void;
}

type EditMode = 'inpaint' | 'outpaint';
type RetouchMode = 'mask' | 'doodle'; // Distinguish between Masking (Inpaint) and Doodling (Sketch)
type InteractionType = 'idle' | 'panning_viewport' | 'drawing' | 'moving_image';

interface DrawPath {
    points: { x: number; y: number }[];
    brushSize: number;
    color: string; // Added color support
}

interface TextLabel {
    x: number;
    y: number;
    text: string;
    color: string;
}

interface DoodleOverlayState {
    paths: DrawPath[];
    texts: TextLabel[];
}

interface ViewportState {
    x: number;
    y: number;
    zoom: number;
}

const MAX_DIMENSION = 4096;
const DOODLE_COLORS = ['#ef4444', '#eab308', '#3b82f6', '#22c55e', '#ffffff']; // Red, Yellow, Blue, Green, White

import HexagonHUD from './HexagonHUD';

const ImageEditor: React.FC<ImageEditorProps> = ({
    initialImageUrl,
    initialPrompt,
    initialObjectImages,
    initialCharacterImages,
    initialRatio,
    initialSize,
    initialBatchSize,
    prompt,
    onPromptChange,
    objectImages,
    onObjectImagesChange,
    characterImages,
    onCharacterImagesChange,
    ratio,
    onRatioChange,
    size,
    onSizeChange,
    batchSize,
    onBatchSizeChange,
    onGenerate,
    onCancel,
    isGenerating,
    currentLanguage = 'en' as Language,
    currentLog = '',
    error,
    onErrorClear,
    imageModel,
    onModelChange,
}) => {
    const t = (key: string) => getTranslation(currentLanguage, key);

    // --- Core State ---
    const [mode, setMode] = useState<EditMode>('inpaint');
    const [retouchMode, setRetouchMode] = useState<RetouchMode>('mask'); // Default to Mask (original behavior)
    // Enforce model constraints dynamically
    useEffect(() => {
        try {
            console.log('ImageEditor Mount: ImageModel is', imageModel);
            const caps = MODEL_CAPABILITIES[imageModel];
            if (!caps) {
                console.error('Missing model capabilities for:', imageModel);
                return;
            }
            if (!caps.supportedSizes.includes(size)) {
                onSizeChange(caps.supportedSizes[0] || '1K');
            }
            if (!caps.supportedRatios.includes(ratio)) {
                onRatioChange('1:1');
            }
            if (objectImages.length > caps.maxObjects) {
                onObjectImagesChange((prev) => prev.slice(0, caps.maxObjects));
            }
            if (characterImages.length > caps.maxCharacters) {
                onCharacterImagesChange((prev) => prev.slice(0, caps.maxCharacters));
            }
        } catch (err) {
            console.error('Error in constraints useEffect:', err);
        }
    }, [
        characterImages,
        imageModel,
        objectImages,
        onCharacterImagesChange,
        onObjectImagesChange,
        onRatioChange,
        onSizeChange,
        ratio,
        size,
    ]);

    // --- Image & Canvas Data ---
    const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);
    const [originalDims, setOriginalDims] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

    // --- Dynamic Brush Scaling ---
    // Calculates a multiplier based on image size relative to 1K (1024px).
    // This ensures a "5px" stroke looks proportionally similar on 4K as it does on 1K.
    const resolutionScale = Math.max(1, Math.max(originalDims.w, originalDims.h) / 1024);

    // --- Viewport State (Global Zoom/Pan) ---
    const [viewport, setViewport] = useState<ViewportState>({ x: 0, y: 0, zoom: 0.5 });

    // --- Tools State ---
    const [activeTool, setActiveTool] = useState<'pan' | 'brush' | 'pen' | 'text'>('brush');

    // Mask State
    const [brushSize, setBrushSize] = useState(40);
    const [maskHistory, setMaskHistory] = useState<WorkspaceHistoryState<DrawPath[]>>(() => createHistoryState([]));

    // Doodle State
    const [doodleHistory, setDoodleHistory] = useState<WorkspaceHistoryState<DoodleOverlayState>>(() =>
        createHistoryState({ paths: [], texts: [] }),
    );
    const [doodleColor, setDoodleColor] = useState<string>('#ef4444');
    const [showTextInput, setShowTextInput] = useState<{ x: number; y: number } | null>(null);
    const textInputRef = useRef<HTMLInputElement>(null);

    // --- Outpaint State ---
    const [imgTransform, setImgTransform] = useState({ x: 0, y: 0, scale: 1 });

    // --- Interaction State ---
    const [interactionState, setInteractionState] = useState<InteractionType>('idle');
    const [pointerStart, setPointerStart] = useState({ x: 0, y: 0 });
    const [stateStart, setStateStart] = useState<ViewportState | { x: number; y: number; scale: number } | null>(null); // Snapshot of state at drag start
    const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
    const [isHovering, setIsHovering] = useState(false);
    const [isSpacePressed, setIsSpacePressed] = useState(false);

    // Refs
    const eventSurfaceRef = useRef<HTMLDivElement>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null); // For Masks and Doodles
    // --- UI Helpers ---
    const [toast, setToast] = useState<{ msg: string; type: 'info' | 'error' } | null>(null);
    const showToast = (msg: string, type: 'info' | 'error' = 'info') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [showModeSwitchConfirm, setShowModeSwitchConfirm] = useState<{ target: EditMode } | null>(null);
    const [showRetouchSwitchConfirm, setShowRetouchSwitchConfirm] = useState<{ target: RetouchMode } | null>(null);
    const maskPaths = maskHistory.present;
    const doodlePaths = doodleHistory.present.paths;
    const textLabels = doodleHistory.present.texts;

    // --- Initialization ---
    useEffect(() => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = initialImageUrl;
        img.onload = () => {
            let w = img.width;
            let h = img.height;
            let src = img.src;

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

            if (eventSurfaceRef.current) {
                const { clientWidth, clientHeight } = eventSurfaceRef.current;
                setViewport(fitImageToViewport(w, h, clientWidth, clientHeight));
            }
        };
    }, [initialImageUrl]);

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

        try {
            const ratioStr = ratio || '1:1';
            const [rw, rh] = ratioStr.split(':').map(Number);
            const ratioVal = rw / rh;
            const base = Math.max(originalDims.w, originalDims.h);

            if (ratioVal > 1) return { w: base, h: base / ratioVal };
            return { w: base * ratioVal, h: base };
        } catch (err) {
            console.error('Error in getFrameDims ratio parsing', err, ratio);
            return { w: 1024, h: 1024 };
        }
    }, [mode, ratio, originalDims]);

    const frameDims = getFrameDims();

    const fitImageToFrame = (type: 'contain' | 'cover') => {
        if (originalDims.w === 0) return;
        const frame = getFrameDims();

        const scaleW = frame.w / originalDims.w;
        const scaleH = frame.h / originalDims.h;

        let scale = 1;
        if (type === 'contain') scale = Math.min(scaleW, scaleH);
        if (type === 'cover') scale = Math.max(scaleW, scaleH);

        setImgTransform({ x: 0, y: 0, scale: scale });
    };

    const alignImage = (alignment: 'top' | 'bottom' | 'left' | 'right') => {
        if (originalDims.w === 0) return;
        const frame = getFrameDims();
        const scaledW = originalDims.w * imgTransform.scale;
        const scaledH = originalDims.h * imgTransform.scale;

        setImgTransform((prev) => {
            let newX = prev.x;
            let newY = prev.y;

            switch (alignment) {
                case 'top':
                    newY = -frame.h / 2 + scaledH / 2;
                    break;
                case 'bottom':
                    newY = frame.h / 2 - scaledH / 2;
                    break;
                case 'left':
                    newX = -frame.w / 2 + scaledW / 2;
                    break;
                case 'right':
                    newX = frame.w / 2 - scaledW / 2;
                    break;
            }
            return { ...prev, x: newX, y: newY };
        });
    };

    // --- Interaction Logic ---

    const screenToContent = (screenX: number, screenY: number) => {
        if (!eventSurfaceRef.current) return { x: 0, y: 0 };
        return screenPointToWorkspacePoint(screenX, screenY, eventSurfaceRef.current.getBoundingClientRect(), viewport);
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        if (isGenerating) return;
        e.preventDefault();
        const { clientX, clientY } = e;
        setPointerStart({ x: clientX, y: clientY });

        // If Text Input is open, close it (unless clicking inside it which is handled by stopProp)
        if (showTextInput) setShowTextInput(null);

        // Pan Logic
        if (e.button === 1 || e.buttons === 4 || isSpacePressed || activeTool === 'pan') {
            setInteractionState('panning_viewport');
            setStateStart({ ...viewport });
            return;
        }

        if (e.button === 0) {
            if (mode === 'inpaint') {
                if (activeTool === 'text') {
                    // Text Tool Click
                    const { x, y } = screenToContent(clientX, clientY);

                    // Boundary check: Prohibit text input outside the image area
                    const halfW = originalDims.w / 2;
                    const halfH = originalDims.h / 2;
                    if (x < -halfW || x > halfW || y < -halfH || y > halfH) {
                        if (showTextInput) setShowTextInput(null);
                        return;
                    }

                    // Position input box using screen coordinates
                    setShowTextInput({ x: clientX, y: clientY });

                    // Focus
                    setTimeout(() => textInputRef.current?.focus(), 10);
                } else {
                    // Brush or Doodle Pen
                    setInteractionState('drawing');
                    const { x, y } = screenToContent(clientX, clientY);
                    const canvasX = x + originalDims.w / 2;
                    const canvasY = y + originalDims.h / 2;

                    // Scale the brush size relative to image resolution (base 1K)
                    const baseDoodleSize = 5;
                    const currentBrushSize =
                        retouchMode === 'doodle' ? baseDoodleSize * resolutionScale : brushSize * resolutionScale;

                    const currentColor = retouchMode === 'doodle' ? doodleColor : '#ff3232';

                    const newPath: DrawPath = {
                        points: [{ x: canvasX, y: canvasY }],
                        brushSize: currentBrushSize,
                        color: currentColor,
                    };

                    if (retouchMode === 'mask') {
                        setMaskHistory((prev) => commitHistoryPresent(prev, [...prev.present, newPath]));
                    } else {
                        setDoodleHistory((prev) =>
                            commitHistoryPresent(prev, {
                                ...prev.present,
                                paths: [...prev.present.paths, newPath],
                            }),
                        );
                    }
                }
            } else {
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

        if (interactionState === 'panning_viewport' && stateStart && 'zoom' in stateStart) {
            setViewport(applyPanDelta(stateStart, dx, dy));
        } else if (interactionState === 'moving_image' && stateStart && 'scale' in stateStart) {
            setImgTransform({
                ...stateStart,
                x: stateStart.x + dx / viewport.zoom,
                y: stateStart.y + dy / viewport.zoom,
            });
        } else if (interactionState === 'drawing') {
            const { x, y } = screenToContent(clientX, clientY);
            const canvasX = x + originalDims.w / 2;
            const canvasY = y + originalDims.h / 2;

            if (retouchMode === 'mask') {
                setMaskHistory((prev) =>
                    replaceHistoryPresent(prev, appendPointToLatestStroke(prev.present, { x: canvasX, y: canvasY })),
                );
            } else {
                setDoodleHistory((prev) =>
                    replaceHistoryPresent(prev, {
                        ...prev.present,
                        paths: appendPointToLatestStroke(prev.present.paths, { x: canvasX, y: canvasY }),
                    }),
                );
            }
        }
    };

    const handlePointerUp = () => {
        setInteractionState('idle');
    };

    const commitText = () => {
        if (!showTextInput || !textInputRef.current) return;
        const val = textInputRef.current.value;
        if (val && val.trim() !== '') {
            const { x, y } = screenToContent(showTextInput.x, showTextInput.y);
            setDoodleHistory((prev) =>
                commitHistoryPresent(prev, {
                    ...prev.present,
                    texts: [
                        ...prev.present.texts,
                        {
                            x: x + originalDims.w / 2,
                            y: y + originalDims.h / 2,
                            text: val,
                            color: doodleColor,
                        },
                    ],
                }),
            );
        }
        setShowTextInput(null);
    };

    const handleTextSubmit = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            commitText();
        }
        if (e.key === 'Escape') {
            setShowTextInput(null);
        }
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (isGenerating) return;

        if (mode === 'outpaint') {
            setImgTransform((prev) => ({ ...prev, scale: applyWheelZoomDelta(prev.scale, e.deltaY, 0.001, 0.1, 5) }));
        } else {
            setViewport((prev) => ({ ...prev, zoom: applyWheelZoomDelta(prev.zoom, e.deltaY) }));
        }
    };

    // --- Render Overlays (Mask / Doodle / Text) ---
    useEffect(() => {
        if (mode === 'inpaint' && overlayCanvasRef.current && originalDims.w > 0) {
            const ctx = overlayCanvasRef.current.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, originalDims.w, originalDims.h);

                // Draw Mask Paths
                if (retouchMode === 'mask') {
                    drawStrokesToCanvas(ctx, maskPaths, { strokeStyle: '#ff3232' });
                }

                // Draw Doodle Paths
                if (retouchMode === 'doodle') {
                    drawStrokesToCanvas(ctx, doodlePaths);

                    // Draw Text Labels
                    const scaledFontSize = Math.max(24, Math.round(32 * resolutionScale));
                    drawTextLabelsToCanvas(ctx, textLabels, {
                        font: `bold ${scaledFontSize}px sans-serif`,
                        textAlign: 'left',
                        textBaseline: 'middle',
                    });
                }
            }
        }
    }, [maskPaths, doodlePaths, textLabels, originalDims, mode, retouchMode, resolutionScale]);

    // --- Mode Switching & History ---
    const handleSwitchMode = (target: EditMode) => {
        if (target === mode) return;
        const hasChanges =
            (mode === 'inpaint' &&
                (maskPaths.length > 0 ||
                    doodlePaths.length > 0 ||
                    textLabels.length > 0 ||
                    canRedoHistoryState(maskHistory) ||
                    canRedoHistoryState(doodleHistory))) ||
            (mode === 'outpaint' && (imgTransform.x !== 0 || imgTransform.y !== 0 || imgTransform.scale !== 1));

        if (hasChanges) {
            setShowModeSwitchConfirm({ target });
        } else {
            setMode(target);
            resetTools(true);
            // When switching to inpaint, ensure we start with mask/brush defaults
            if (target === 'inpaint') {
                setRetouchMode('mask');
                setActiveTool('brush');
            }
        }
    };

    const handleSwitchRetouchMode = (target: RetouchMode) => {
        // Allow switching back to tool if currently panning, even if mode is the same
        if (target === retouchMode) {
            if (target === 'mask') setActiveTool('brush');
            else setActiveTool('pen');
            return;
        }

        const hasData = target === 'mask' ? doodlePaths.length > 0 || textLabels.length > 0 : maskPaths.length > 0;

        if (hasData) {
            setShowRetouchSwitchConfirm({ target });
        } else {
            setRetouchMode(target);
            if (target === 'mask') setActiveTool('brush');
            else setActiveTool('pen');
        }
    };

    const confirmRetouchSwitch = () => {
        if (!showRetouchSwitchConfirm) return;
        const target = showRetouchSwitchConfirm.target;

        // Clear data of previous mode
        if (target === 'mask') {
            setDoodleHistory(resetHistoryState({ paths: [], texts: [] }));
            setActiveTool('brush');
        } else {
            setMaskHistory(resetHistoryState([]));
            setActiveTool('pen');
        }
        setRetouchMode(target);
        setShowRetouchSwitchConfirm(null);
    };

    const resetTools = (keepPrompt: boolean = false) => {
        setMaskHistory(resetHistoryState([]));
        setDoodleHistory(resetHistoryState({ paths: [], texts: [] }));
        setImgTransform({ x: 0, y: 0, scale: 1 });

        // Maintain current retouch mode, reset tool appropriate for that mode
        if (retouchMode === 'doodle') {
            setActiveTool('pen');
        } else {
            setActiveTool('brush');
        }
        // setRetouchMode('mask'); // Removed to keep current mode

        if (!keepPrompt) {
            onPromptChange(initialPrompt);
        }
        onObjectImagesChange(initialObjectImages);
        onCharacterImagesChange(initialCharacterImages);
        onRatioChange(initialRatio);
        onSizeChange(initialSize);
        onBatchSizeChange(initialBatchSize);

        if (eventSurfaceRef.current && originalDims.w > 0) {
            const { clientWidth, clientHeight } = eventSurfaceRef.current;
            setViewport(fitImageToViewport(originalDims.w, originalDims.h, clientWidth, clientHeight));
        }
    };

    const confirmModeSwitch = () => {
        if (showModeSwitchConfirm) {
            setMode(showModeSwitchConfirm.target);
            resetTools(true);
            // When switching to inpaint, ensure we start with mask/brush defaults
            if (showModeSwitchConfirm.target === 'inpaint') {
                setRetouchMode('mask');
                setActiveTool('brush');
            }
            setShowModeSwitchConfirm(null);
        }
    };

    const handleExit = () => {
        if (isGenerating) return;
        const hasChanges =
            maskPaths.length > 0 ||
            doodlePaths.length > 0 ||
            textLabels.length > 0 ||
            canRedoHistoryState(maskHistory) ||
            canRedoHistoryState(doodleHistory) ||
            (mode === 'outpaint' && (imgTransform.x !== 0 || imgTransform.y !== 0 || imgTransform.scale !== 1));

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
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        let finalPrompt = prompt;
        let finalModeLabel = mode === 'inpaint' ? 'Inpainting' : 'Outpainting';

        if (mode === 'inpaint') {
            if (retouchMode === 'mask') {
                // Standard Inpaint: Image + Mask (dest-out)
                ctx.drawImage(imgElement, 0, 0, originalDims.w, originalDims.h);
                ctx.globalCompositeOperation = 'destination-out';
                drawStrokesToCanvas(ctx, maskPaths, { strokeStyle: '#000000' });
                ctx.globalCompositeOperation = 'source-over';

                // Auto-Prompt for Mask
                if (!finalPrompt || finalPrompt.trim() === '') {
                    finalPrompt =
                        'Seamlessly inpaint the masked area to naturally match the surrounding context in structure, texture, lighting, and perspective.';
                } else {
                    finalPrompt = `${finalPrompt}, seamlessly match the lighting, perspective, and texture of the surrounding area.`;
                }
            } else {
                // Doodle Mode: Image + Doodle + Text (Source Over) -> Img2Img/Inpaint with doodle baked in
                // We draw the original image, then doodles on top.
                ctx.drawImage(imgElement, 0, 0, originalDims.w, originalDims.h);
                drawStrokesToCanvas(ctx, doodlePaths);

                const scaledFontSize = Math.max(24, Math.round(32 * resolutionScale));
                drawTextLabelsToCanvas(ctx, textLabels, {
                    font: `bold ${scaledFontSize}px sans-serif`,
                    textAlign: 'left',
                    textBaseline: 'middle',
                });

                // Auto-Prompt for Doodle
                if (!finalPrompt || finalPrompt.trim() === '') {
                    finalPrompt =
                        'Modify the image based on the drawn doodles and text annotations, and seamlessly integrate the changes into the existing scene.';
                } else {
                    finalPrompt = `${finalPrompt}, with strict adherence to the drawn doodle structure and embedded text labels.`;
                }
            }
        } else {
            // Outpaint Logic (Source Image with transforms)
            ctx.translate(frameDims.w / 2, frameDims.h / 2);
            ctx.translate(imgTransform.x, imgTransform.y);
            ctx.scale(imgTransform.scale, imgTransform.scale);
            ctx.drawImage(imgElement, -originalDims.w / 2, -originalDims.h / 2);

            const cx = frameDims.w / 2;
            const cy = frameDims.h / 2;
            const imgCX = cx + imgTransform.x;
            const imgCY = cy + imgTransform.y;
            const sw = originalDims.w * imgTransform.scale;
            const sh = originalDims.h * imgTransform.scale;
            const imgLeft = imgCX - sw / 2;
            const imgRight = imgCX + sw / 2;
            const imgTop = imgCY - sh / 2;
            const imgBottom = imgCY + sh / 2;

            const coversCanvas =
                imgLeft <= 1 && imgRight >= frameDims.w - 1 && imgTop <= 1 && imgBottom >= frameDims.h - 1;

            if (coversCanvas) {
                const defaultReframeInstruction =
                    'High-fidelity upscale. Sharpen details, improve texture quality, and maintain the original composition, lighting, and color balance.';
                if (!finalPrompt || finalPrompt.trim() === '') finalPrompt = defaultReframeInstruction;
                else finalPrompt = `${finalPrompt}, ${defaultReframeInstruction}`;
            } else {
                // Image is smaller than canvas -> Extrapolate/Outpaint
                // Updated instruction to be universally applicable (Objects, People, Scenery)
                const defaultExtendInstruction =
                    'Extrapolate the scene to fill the empty canvas. Seamlessly extend any cropped subjects and naturally continue the environment, preserving anatomy, geometry, texture, perspective, lighting, and overall fidelity.';
                if (!finalPrompt || finalPrompt.trim() === '') finalPrompt = defaultExtendInstruction;
                else finalPrompt = `${finalPrompt}, ${defaultExtendInstruction}`;
            }
        }

        const base64 = canvas.toDataURL('image/png');
        onGenerate(finalPrompt, base64, batchSize, size, finalModeLabel, objectImages, characterImages, ratio);
    };

    return (
        <div
            data-testid="image-editor"
            className="fixed inset-0 flex flex-row bg-gray-100 dark:bg-[#050505] animate-[fadeIn_0.2s_ease-out] select-none overflow-hidden text-gray-900 transition-colors duration-300 dark:text-gray-200"
            style={{ zIndex: WORKSPACE_EDITOR_Z_INDEX.root }}
        >
            <style>{`
          @keyframes scan { 0% { top: 0%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
          .animate-scan { animation: scan 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
          @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        `}</style>

            {toast && (
                <div
                    className="fixed top-8 left-1/2 -translate-x-1/2 pointer-events-none"
                    style={{ zIndex: WORKSPACE_EDITOR_Z_INDEX.toast }}
                >
                    <div
                        className={`${toast.type === 'error' ? 'bg-red-500/90' : 'bg-amber-500/90'} text-white px-6 py-2 rounded-full shadow-2xl backdrop-blur-md font-bold text-sm`}
                    >
                        {toast.msg}
                    </div>
                </div>
            )}

            {/* === LOADING OVERLAY === */}
            {isGenerating && (
                <div
                    className="absolute inset-0 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm animate-[fadeIn_0.3s_ease-out]"
                    style={{ zIndex: WORKSPACE_EDITOR_Z_INDEX.loading }}
                >
                    {/* Scanline Animation */}
                    <div className="absolute left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_25px_rgba(251,191,36,1)] animate-scan z-10 top-1/2"></div>

                    {/* HUD */}
                    <HexagonHUD statusText={t('statusProcessing')} logText={currentLog} />
                </div>
            )}

            {error && (
                <div
                    className="fixed inset-0 bg-black/50 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-[fadeIn_0.2s_ease-out]"
                    style={{ zIndex: WORKSPACE_EDITOR_Z_INDEX.error }}
                >
                    <div className="nbu-modal-shell relative flex w-full max-w-md flex-col items-center overflow-hidden border-red-200 p-8 text-center dark:border-red-500/30">
                        <div className="absolute inset-0 bg-gradient-to-b from-red-50 to-transparent dark:from-red-500/5 dark:to-transparent pointer-events-none"></div>
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center border border-red-200 dark:border-red-500/20 mb-6 shadow-xl">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-8 w-8 text-red-500 dark:text-red-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                            {t('editorErrorTitle')}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-8 max-h-[100px] overflow-y-auto nbu-scrollbar-subtle px-2">
                            {error}
                        </p>
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

            {(showExitConfirm || showModeSwitchConfirm || showRetouchSwitchConfirm) && (
                <div
                    data-testid="editor-exit-confirm"
                    className="fixed inset-0 bg-black/50 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                    style={{ zIndex: WORKSPACE_EDITOR_Z_INDEX.exitConfirm }}
                >
                    <div className="nbu-modal-shell w-full max-w-sm space-y-4 p-6 text-center animate-[scaleIn_0.1s_ease-out]">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                {showExitConfirm ? t('editorDiscard') : t('editorSwitchTitle')}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
                                {showExitConfirm
                                    ? t('editorDiscardMsg')
                                    : showRetouchSwitchConfirm
                                      ? showRetouchSwitchConfirm.target === 'mask'
                                          ? t('warnClearDoodle')
                                          : t('warnClearMask')
                                      : t('warningSwitchMode')}
                            </p>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                data-testid="editor-exit-keep"
                                onClick={() => {
                                    setShowExitConfirm(false);
                                    setShowModeSwitchConfirm(null);
                                    setShowRetouchSwitchConfirm(null);
                                }}
                                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg transition-colors font-medium text-sm"
                            >
                                {t('editorKeep')}
                            </button>
                            <button
                                data-testid="editor-exit-discard"
                                onClick={() => {
                                    if (showExitConfirm) onCancel({ discardSharedContext: true });
                                    else if (showRetouchSwitchConfirm) confirmRetouchSwitch();
                                    else confirmModeSwitch();
                                }}
                                className="flex-1 px-4 py-2 bg-red-50 dark:bg-red-900/50 hover:bg-red-100 dark:hover:bg-red-800/60 text-red-600 dark:text-red-200 border border-red-200 dark:border-red-500/20 rounded-lg transition-colors font-medium text-sm"
                            >
                                {showExitConfirm ? t('editorYesDiscard') : t('editorSwitchBtn')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* === MAIN WORKSPACE === */}
            <div className="flex-1 relative bg-gray-200 dark:bg-[#050505] overflow-hidden flex flex-col transition-colors">
                {/* UI LAYER */}
                <div
                    className={`absolute inset-0 z-50 pointer-events-none flex flex-col justify-between p-4 ${isGenerating ? 'opacity-0' : ''}`}
                >
                    <div className="flex justify-between items-start">
                        {/* Top Actions */}
                        <div className="nbu-toolbar-shell pointer-events-auto flex gap-2 p-1.5 transition-colors">
                            <div className="nbu-toolbar-segment grid grid-cols-2 gap-1 p-1">
                                <button
                                    onClick={() => handleSwitchMode('inpaint')}
                                    className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-all ${mode === 'inpaint' ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-4 w-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                        />
                                    </svg>
                                    <span>{t('modeInpaint')}</span>
                                </button>
                                <button
                                    onClick={() => handleSwitchMode('outpaint')}
                                    className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-all ${mode === 'outpaint' ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-4 w-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M3 3h6v2H5v4H3V3zm12 0h6v6h-2V5h-4V3zm0 14h4v-4h2v6h-6v-2zM3 15h2v4h4v2H3v-6z"
                                        />
                                    </svg>
                                    <span>{t('modeOutpaint')}</span>
                                </button>
                            </div>

                            {mode === 'inpaint' ? (
                                <>
                                    <button
                                        onClick={() => {
                                            if (retouchMode === 'mask') {
                                                setMaskHistory((prev) => undoHistoryState(prev));
                                            } else {
                                                setDoodleHistory((prev) => undoHistoryState(prev));
                                            }
                                        }}
                                        disabled={
                                            retouchMode === 'mask'
                                                ? !canUndoHistoryState(maskHistory)
                                                : !canUndoHistoryState(doodleHistory)
                                        }
                                        className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded disabled:opacity-30 transition-colors"
                                        title={t('toolUndo')}
                                    >
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                                            />
                                        </svg>
                                    </button>

                                    <div className="w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>

                                    {/* REDO BUTTON */}
                                    <button
                                        onClick={() => {
                                            if (retouchMode === 'mask') {
                                                setMaskHistory((prev) => redoHistoryState(prev));
                                            } else {
                                                setDoodleHistory((prev) => redoHistoryState(prev));
                                            }
                                        }}
                                        disabled={
                                            retouchMode === 'mask'
                                                ? !canRedoHistoryState(maskHistory)
                                                : !canRedoHistoryState(doodleHistory)
                                        }
                                        className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded disabled:opacity-30 transition-colors"
                                        title={t('toolRedo')}
                                    >
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6"
                                            />
                                        </svg>
                                    </button>

                                    <div className="w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>
                                    <button
                                        onClick={() => resetTools(false)}
                                        disabled={isGenerating}
                                        className="px-3 text-xs font-bold text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded uppercase transition-colors disabled:opacity-50"
                                    >
                                        {t('btnReset')}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => fitImageToFrame('contain')}
                                        disabled={isGenerating}
                                        className="px-2 py-1.5 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                                        title={t('btnFit')}
                                    >
                                        {t('btnFit')}
                                    </button>
                                    <button
                                        onClick={() => fitImageToFrame('cover')}
                                        disabled={isGenerating}
                                        className="px-2 py-1.5 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                                        title={t('btnFill')}
                                    >
                                        {t('btnFill')}
                                    </button>

                                    <div className="w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>

                                    {/* Alignment Tools */}
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => alignImage('left')}
                                            disabled={isGenerating}
                                            className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                                            title={t('btnAlignLeft')}
                                        >
                                            <svg
                                                className="w-4 h-4"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M4 4h2v16H4V4zm4 4h10v8H8V8z"
                                                />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => alignImage('right')}
                                            disabled={isGenerating}
                                            className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                                            title={t('btnAlignRight')}
                                        >
                                            <svg
                                                className="w-4 h-4"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M20 4h-2v16h2V4zM6 8h10v8H6V8z"
                                                />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => alignImage('top')}
                                            disabled={isGenerating}
                                            className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                                            title={t('btnAlignTop')}
                                        >
                                            <svg
                                                className="w-4 h-4"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M4 4h16v2H4V4zm4 4h8v10H8V8z"
                                                />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => alignImage('bottom')}
                                            disabled={isGenerating}
                                            className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                                            title={t('btnAlignBottom')}
                                        >
                                            <svg
                                                className="w-4 h-4"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M4 20h16v-2H4v2zm4-4h8V6H8v10z"
                                                />
                                            </svg>
                                        </button>
                                    </div>

                                    <div className="w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>
                                    <button
                                        onClick={() => resetTools(false)}
                                        disabled={isGenerating}
                                        className="px-3 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded uppercase transition-colors disabled:opacity-50"
                                    >
                                        {t('btnReset')}
                                    </button>
                                </>
                            )}
                        </div>

                        <button
                            data-testid="editor-close"
                            onClick={handleExit}
                            disabled={isGenerating}
                            className="pointer-events-auto rounded-full border border-red-200 bg-red-100 p-3 text-red-600 shadow-lg transition-colors hover:bg-red-200 disabled:opacity-30 dark:border-red-500/30 dark:bg-red-900/40 dark:text-red-200 dark:hover:bg-red-900/80"
                            title={t('sketchExitTitle')}
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    </div>

                    <div className="flex-1 relative">
                        {/* Left Tools (Inpaint) */}
                        {mode === 'inpaint' && (
                            <div className="nbu-toolbar-shell absolute left-0 top-1/2 flex -translate-y-1/2 flex-col gap-2 p-1.5 pointer-events-auto transition-colors">
                                <button
                                    onClick={() => setActiveTool('pan')}
                                    disabled={isGenerating}
                                    className={`p-3 rounded-lg transition-colors disabled:opacity-50 ${activeTool === 'pan' ? 'bg-amber-500 text-black shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                                    title={t('toolPan')}
                                >
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11"
                                        />
                                    </svg>
                                </button>

                                <div className="w-full h-px bg-gray-200 dark:bg-gray-700 my-0.5"></div>

                                {/* Mask Pen - Marker Icon */}
                                <button
                                    onClick={() => handleSwitchRetouchMode('mask')}
                                    disabled={isGenerating}
                                    className={`p-3 rounded-lg transition-colors disabled:opacity-50 ${retouchMode === 'mask' && activeTool !== 'pan' ? 'bg-amber-500 text-black shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                                    title={t('toolMask')}
                                >
                                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M13.2 3.5l5.3 5.3c.2.2.2.5 0 .7l-8.5 8.5H7v-3L15.5 6.5l-2.3-2.3L4.7 12.7v3.6h-2v-4.3L12.5 2.2c.2-.2.5-.2.7 0zM4 20h16v2H4z" />
                                    </svg>
                                </button>

                                {/* Doodle Pen - Pencil Icon (Explicitly set to ensure it's different) */}
                                <button
                                    onClick={() => handleSwitchRetouchMode('doodle')}
                                    disabled={isGenerating}
                                    className={`p-3 rounded-lg transition-colors disabled:opacity-50 ${retouchMode === 'doodle' && activeTool !== 'pan' ? 'bg-amber-500 text-black shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                                    title={t('toolDoodle')}
                                >
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                        />
                                    </svg>
                                </button>
                            </div>
                        )}

                        {/* Right Tools (Sliders / Colors) */}
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-6 pointer-events-auto">
                            {/* Controls specific to Mask or Doodle */}
                            {mode === 'inpaint' && (
                                <div className="nbu-toolbar-shell flex flex-col items-center gap-2 px-2 py-3 transition-colors">
                                    {retouchMode === 'mask' ? (
                                        <>
                                            <div className="text-gray-500 dark:text-gray-400 mb-1">
                                                {/* Slider Icon - Marker Icon (Matched) */}
                                                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M13.2 3.5l5.3 5.3c.2.2.2.5 0 .7l-8.5 8.5H7v-3L15.5 6.5l-2.3-2.3L4.7 12.7v3.6h-2v-4.3L12.5 2.2c.2-.2.5-.2.7 0zM4 20h16v2H4z" />
                                                </svg>
                                            </div>
                                            <div className="h-32 w-2 relative flex justify-center">
                                                <input
                                                    type="range"
                                                    min="5"
                                                    max="200"
                                                    value={brushSize}
                                                    onChange={(e) => setBrushSize(Number(e.target.value))}
                                                    disabled={isGenerating}
                                                    className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-32 -rotate-90 origin-center bg-transparent appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-amber-500 [&::-webkit-slider-thumb]:rounded-full disabled:opacity-50"
                                                    style={{ width: '128px' }}
                                                    title={t('toolSize')}
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        /* Doodle Controls */
                                        <div className="flex flex-col gap-2">
                                            <button
                                                onClick={() => setActiveTool('pen')}
                                                className={`p-2 rounded-lg ${activeTool === 'pen' ? 'bg-amber-100 text-amber-600' : 'text-gray-400'}`}
                                                title={t('toolPen')}
                                            >
                                                <svg
                                                    className="w-5 h-5"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                                    />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => setActiveTool('text')}
                                                className={`p-2 rounded-lg ${activeTool === 'text' ? 'bg-amber-100 text-amber-600' : 'text-gray-400'}`}
                                                title={t('toolText')}
                                            >
                                                <svg
                                                    className="w-5 h-5"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M4 6h16M12 6v13"
                                                    />
                                                </svg>
                                            </button>
                                            <div className="w-full h-px bg-gray-200 dark:bg-gray-700 my-1"></div>
                                            {/* Colors */}
                                            <div className="flex flex-col gap-2 items-center">
                                                {DOODLE_COLORS.map((c) => (
                                                    <button
                                                        key={c}
                                                        onClick={() => setDoodleColor(c)}
                                                        className={`w-5 h-5 rounded-full border border-gray-300 dark:border-gray-600 shadow-sm ${doodleColor === c ? 'ring-2 ring-amber-500 scale-110' : ''}`}
                                                        style={{ backgroundColor: c }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Zoom Slider */}
                            <div className="nbu-toolbar-shell flex flex-col items-center gap-2 rounded-full px-1.5 py-3 transition-colors">
                                <div className="text-gray-500 dark:text-gray-400 mb-1">
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                        />
                                    </svg>
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
                                            if (mode === 'inpaint') setViewport((p) => ({ ...p, zoom: v }));
                                            else setImgTransform((p) => ({ ...p, scale: v }));
                                        }}
                                        disabled={isGenerating}
                                        className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-32 -rotate-90 origin-center bg-transparent appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full disabled:opacity-50"
                                        style={{ width: '128px' }}
                                        title={t('toolZoom')}
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
                        >
                            <span className="relative z-10 drop-shadow-md">
                                {isGenerating ? t('statusProcessing') : t('btnRender')}
                            </span>
                        </Button>
                    </div>
                </div>

                {/* EVENT SURFACE */}
                <div
                    data-testid="editor-event-surface"
                    ref={eventSurfaceRef}
                    className={`absolute inset-0 z-10 touch-none w-full h-full 
                    ${interactionState === 'panning_viewport' || activeTool === 'pan' ? 'cursor-grab active:cursor-grabbing' : ''}
                    ${mode === 'inpaint' && activeTool === 'brush' ? 'cursor-none' : ''}
                    ${mode === 'inpaint' && activeTool === 'pen' ? 'cursor-crosshair' : ''}
                    ${mode === 'inpaint' && activeTool === 'text' ? 'cursor-text' : ''}
                    ${mode === 'outpaint' ? 'cursor-move' : ''}
                `}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={() => {
                        handlePointerUp();
                        setIsHovering(false);
                    }}
                    onPointerEnter={() => setIsHovering(true)}
                    onWheel={handleWheel}
                />

                {/* CONTENT LAYER */}
                <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden bg-gray-200 dark:bg-[#101010] pointer-events-none transition-colors">
                    <div
                        className="origin-center will-change-transform"
                        style={{
                            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
                        }}
                    >
                        {mode === 'inpaint' ? (
                            <div
                                className="relative shadow-2xl"
                                style={{ width: originalDims.w, height: originalDims.h }}
                            >
                                <img src={initialImageUrl} className="w-full h-full block" alt="Source" />
                                <canvas
                                    ref={overlayCanvasRef}
                                    width={originalDims.w}
                                    height={originalDims.h}
                                    className={`absolute inset-0 w-full h-full mix-blend-normal ${retouchMode === 'mask' ? 'opacity-60' : 'opacity-100'}`}
                                />
                                <div
                                    className={`absolute inset-0 border pointer-events-none transition-colors duration-500 ${isGenerating ? 'border-amber-500/50' : 'border-white/20'}`}
                                />
                            </div>
                        ) : (
                            <div
                                className={`relative shadow-2xl bg-checkerboard overflow-hidden border transition-colors duration-500 ${isGenerating ? 'border-amber-500/50' : 'border-gray-400 dark:border-gray-700'}`}
                                style={{ width: frameDims.w, height: frameDims.h }}
                            >
                                <div
                                    className="absolute top-1/2 left-1/2 origin-center"
                                    style={{
                                        width: originalDims.w,
                                        height: originalDims.h,
                                        transform: `translate(-50%, -50%) translate(${imgTransform.x}px, ${imgTransform.y}px) scale(${imgTransform.scale})`,
                                    }}
                                >
                                    <img
                                        src={initialImageUrl}
                                        className="w-full h-full object-cover shadow-xl"
                                        alt="Source"
                                    />
                                    <div
                                        className={`absolute inset-0 border-2 transition-colors ${isGenerating ? 'border-amber-500/30' : 'border-blue-500/50'}`}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* BRUSH CURSOR */}
                {mode === 'inpaint' &&
                    activeTool === 'brush' &&
                    retouchMode === 'mask' &&
                    isHovering &&
                    cursorPos &&
                    !isGenerating && (
                        <div
                            className="fixed pointer-events-none rounded-full border border-white/80 bg-red-500/40 backdrop-invert"
                            style={{
                                zIndex: WORKSPACE_EDITOR_Z_INDEX.brushCursor,
                                left: cursorPos.x,
                                top: cursorPos.y,
                                width: brushSize * resolutionScale * viewport.zoom,
                                height: brushSize * resolutionScale * viewport.zoom,
                                transform: 'translate(-50%, -50%)',
                            }}
                        />
                    )}
            </div>

            {/* TEXT INPUT OVERLAY (Moved to Root for correct positioning) */}
            {showTextInput && (
                <div
                    className="absolute z-[200] flex items-center gap-1"
                    style={{
                        left: showTextInput.x,
                        top: showTextInput.y,
                        transform: 'translateY(-50%)',
                    }}
                >
                    <input
                        ref={textInputRef}
                        type="text"
                        onKeyDown={handleTextSubmit}
                        className="bg-black/70 text-white border border-white/50 rounded-lg px-3 py-2 text-lg outline-none shadow-xl min-w-[200px] backdrop-blur-sm"
                        placeholder="Enter text..."
                        autoFocus
                    />
                    <button
                        onClick={commitText}
                        className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-lg transition-colors border border-white/20"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
};

export default ImageEditor;
