import React, { useRef, useState, useEffect, useCallback } from 'react';
import Button from './Button';
import { WORKSPACE_EDITOR_Z_INDEX } from '../constants/workspaceOverlays';
import { EditorMode, ImageSize, AspectRatio, ImageModel } from '../types';
import { Language, getTranslation } from '../utils/translations';
import { MODEL_CAPABILITIES } from '../constants';
import { resolveDisplayImageSourceAsync } from '../utils/browserImageStore';
import { useResolvedImageSource } from '../hooks/useResolvedImageSource';
import { buildEditorPrompt } from '../utils/editorPromptBuilder';
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
import {
    createGaussianPointCloudFromImage,
    renderGaussianSplatsToCanvas,
    clampAngle,
    type GaussianPointCloud,
} from '../utils/gaussianSplatting';

interface ImageEditorProps {
    initialImageUrl: string;
    initialPreparedSource?: {
        width: number;
        height: number;
        wasResized: boolean;
    } | null;
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
    mode: EditorMode;
    onModeChange: (mode: EditorMode) => void;
    ratio: AspectRatio;
    onRatioChange: React.Dispatch<React.SetStateAction<AspectRatio>>;
    lockedAspectRatio?: AspectRatio | null;
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
        sourceImageInput?: string,
    ) => void;
    onQueueBatch?: (
        prompt: string,
        imageBase64: string,
        batchSize: number,
        size: ImageSize,
        mode: string,
        objectImages?: string[],
        characterImages?: string[],
        targetRatio?: AspectRatio,
        sourceImageInput?: string,
    ) => void | Promise<void>;
    supportsQueuedBatch?: boolean;
    queueBatchDisabledReason?: string | null;
    onCancel: (options?: { discardSharedContext?: boolean }) => void;
    isGenerating: boolean;
    currentLanguage?: Language;
    error?: string | null;
    onErrorClear?: () => void;
    imageModel: ImageModel;
    leftDockTopOffset?: number | null;
}

type EditMode = EditorMode;
type RetouchMode = 'mask' | 'doodle'; // Distinguish between Masking (Inpaint) and Doodling (Sketch)
type InteractionType =
    | 'idle'
    | 'panning_viewport'
    | 'drawing'
    | 'moving_image'
    | 'rotating_image'
    | 'orbiting_revolve'
    | 'panning_revolve';

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

const DOODLE_COLORS = ['#ef4444', '#eab308', '#3b82f6', '#22c55e', '#ffffff']; // Red, Yellow, Blue, Green, White

const normalizeVisibleTextLabels = (labels: TextLabel[]): string[] =>
    Array.from(new Set(labels.map((label) => label.text.trim()).filter((label) => label.length > 0)));

const ImageEditor: React.FC<ImageEditorProps> = ({
    initialImageUrl,
    initialPreparedSource = null,
    initialPrompt,
    initialObjectImages,
    initialCharacterImages,
    initialRatio,
    initialSize,
    prompt,
    onPromptChange,
    objectImages,
    onObjectImagesChange,
    characterImages,
    onCharacterImagesChange,
    mode,
    onModeChange,
    ratio,
    onRatioChange,
    lockedAspectRatio = null,
    size,
    onSizeChange,
    batchSize,
    onGenerate,
    onQueueBatch,
    supportsQueuedBatch = true,
    queueBatchDisabledReason = null,
    onCancel,
    isGenerating,
    currentLanguage = 'en' as Language,
    error,
    onErrorClear,
    imageModel,
    leftDockTopOffset = null,
}) => {
    const t = (key: string) => getTranslation(currentLanguage, key);
    const resolvedInitialImageUrl = useResolvedImageSource(initialImageUrl);

    // --- Core State ---
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
            if (caps.supportedSizes.length > 0 && !caps.supportedSizes.includes(size)) {
                onSizeChange(caps.supportedSizes[0] || '1K');
            }
            if (!caps.supportedRatios.includes(ratio) && (!lockedAspectRatio || ratio !== lockedAspectRatio)) {
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
        lockedAspectRatio,
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
    const [showTextToolFirstUseNotice, setShowTextToolFirstUseNotice] = useState(false);
    const [showTextInput, setShowTextInput] = useState<{ x: number; y: number } | null>(null);
    const textInputRef = useRef<HTMLInputElement>(null);

    // --- Outpaint State ---
    const [imgTransform, setImgTransform] = useState({ x: 0, y: 0, scale: 1, rotation: 0 });
    const [isMagnetActive, setIsMagnetActive] = useState(false); // Default to off per user request
    const [isOverRotationHandle, setIsOverRotationHandle] = useState(false);

    // --- Angle & Magnet Snap Helpers ---
    const normalizeAngle = (angle: number): number => {
        let a = angle % 360;
        if (a > 180) a -= 360;
        if (a <= -180) a += 360;
        return a === 0 ? 0 : a;
    };

    const snapAngle = (angle: number, snap: boolean): number => {
        if (!snap) return Math.round(angle);
        const snapped = Math.round(angle / 45) * 45;
        return normalizeAngle(snapped);
    };

    const handleRotateStep = (delta: number) => {
        setImgTransform((prev) => {
            const targetAngle = prev.rotation + delta;
            return {
                ...prev,
                rotation: normalizeAngle(snapAngle(targetAngle, isMagnetActive)),
            };
        });
    };

    const toggleMagnet = () => {
        setIsMagnetActive((prev) => {
            const next = !prev;
            if (next) {
                setImgTransform((curr) => ({
                    ...curr,
                    rotation: snapAngle(curr.rotation, true),
                }));
            }
            return next;
        });
    };

    const handleRotationChange = (newAngle: number) => {
        setImgTransform((prev) => ({
            ...prev,
            rotation: snapAngle(newAngle, isMagnetActive),
        }));
    };

    // --- Revolve (3D Gaussian Splatting) State ---
    const [revolveTransform, setRevolveTransform] = useState({
        yaw: 0,
        pitch: 0,
        panX: 0,
        panY: 0,
        zoom: 1,
    });
    const [revolveTool, setRevolveTool] = useState<'orbit' | 'pan'>('orbit');
    const pointCloudRef = useRef<GaussianPointCloud | null>(null);
    const revolveCanvasRef = useRef<HTMLCanvasElement>(null);

    // --- Interaction State ---
    const [interactionState, setInteractionState] = useState<InteractionType>('idle');
    const [pointerStart, setPointerStart] = useState({ x: 0, y: 0 });
    const [stateStart, setStateStart] = useState<
        | ViewportState
        | { x: number; y: number; scale: number; rotation?: number }
        | { yaw: number; pitch: number; panX?: number; panY?: number; zoom?: number }
        | null
    >(null); // Snapshot of state at drag start
    const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
    const [isHovering, setIsHovering] = useState(false);
    const [isSpacePressed, setIsSpacePressed] = useState(false);

    // Refs
    const eventSurfaceRef = useRef<HTMLDivElement>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null); // For Masks and Doodles
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [showModeSwitchConfirm, setShowModeSwitchConfirm] = useState<{ target: EditMode } | null>(null);
    const [showRetouchSwitchConfirm, setShowRetouchSwitchConfirm] = useState<{ target: RetouchMode } | null>(null);
    const maskPaths = maskHistory.present;
    const doodlePaths = doodleHistory.present.paths;
    const textLabels = doodleHistory.present.texts;
    const visibleTextLabels = normalizeVisibleTextLabels(textLabels);
    const textToolButtonTitle = `${t('editorTextToolHintTitle')}: ${t('editorTextToolHintBody')}`;
    const activateRetouchMode = (target: RetouchMode) => {
        setRetouchMode(target);
        if (target === 'mask') {
            setActiveTool('brush');
            return;
        }

        setActiveTool('pen');
    };

    const handleActivateTextTool = useCallback(() => {
        setActiveTool('text');
        setShowTextToolFirstUseNotice(true);
    }, []);

    const handleConfirmTextToolFirstUse = useCallback(() => {
        setShowTextToolFirstUseNotice(false);
    }, []);

    useEffect(() => {
        if (mode !== 'inpaint' || retouchMode !== 'doodle' || activeTool !== 'text') {
            setShowTextToolFirstUseNotice(false);
        }
    }, [activeTool, mode, retouchMode]);

    // --- Initialization ---
    useEffect(() => {
        if (!initialImageUrl) {
            return undefined;
        }

        let cancelled = false;
        const resolveAndLoad = async () => {
            const effectiveSrc = await resolveDisplayImageSourceAsync(initialImageUrl);
            if (cancelled) {
                return;
            }

            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                if (cancelled) {
                    return;
                }

                const w = initialPreparedSource?.width || img.width;
                const h = initialPreparedSource?.height || img.height;

                setOriginalDims({ w, h });
                setImgElement(img);

                if (eventSurfaceRef.current) {
                    const { clientWidth, clientHeight } = eventSurfaceRef.current;
                    setViewport(fitImageToViewport(w, h, clientWidth, clientHeight));
                }
            };
            img.src = effectiveSrc;
        };

        void resolveAndLoad();

        return () => {
            cancelled = true;
        };
    }, [initialImageUrl, initialPreparedSource?.height, initialPreparedSource?.width]);

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

    // --- 3D Gaussian Point Cloud Generation ---
    useEffect(() => {
        if (!imgElement || originalDims.w === 0 || originalDims.h === 0) {
            pointCloudRef.current = null;
            return;
        }

        try {
            pointCloudRef.current = createGaussianPointCloudFromImage(imgElement, originalDims.w, originalDims.h, {
                sampleDensity: 'draft',
            });
        } catch (e) {
            console.warn('Failed to build 3DGS point cloud:', e);
            pointCloudRef.current = null;
        }
    }, [imgElement, originalDims.w, originalDims.h]);

    // --- Revolve 3DGS Canvas Rendering ---
    useEffect(() => {
        if (mode !== 'revolve' || !revolveCanvasRef.current) return;
        const canvas = revolveCanvasRef.current;

        if (pointCloudRef.current && pointCloudRef.current.splats.length > 0) {
            renderGaussianSplatsToCanvas(canvas, pointCloudRef.current, revolveTransform, canvas.width, canvas.height);
        } else if (imgElement && originalDims.w > 0) {
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            ctx.translate(
                canvas.width / 2 + (revolveTransform.panX ?? 0),
                canvas.height / 2 + (revolveTransform.panY ?? 0),
            );
            ctx.scale(revolveTransform.zoom ?? 1, revolveTransform.zoom ?? 1);
            ctx.drawImage(imgElement, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
            ctx.restore();
        }
    }, [mode, revolveTransform, originalDims, imgElement]);

    // --- Geometry Helpers ---
    const getFrameDims = useCallback(() => {
        if (mode === 'inpaint' || mode === 'revolve') return { w: originalDims.w, h: originalDims.h };

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
        const rad = ((imgTransform.rotation ?? 0) * Math.PI) / 180;
        const cos = Math.abs(Math.cos(rad));
        const sin = Math.abs(Math.sin(rad));

        let scale = 1;
        if (type === 'contain') {
            const rotatedW = originalDims.w * cos + originalDims.h * sin;
            const rotatedH = originalDims.w * sin + originalDims.h * cos;
            scale = Math.min(frame.w / Math.max(1, rotatedW), frame.h / Math.max(1, rotatedH));
        } else if (type === 'cover') {
            const scaleW = (frame.w * cos + frame.h * sin) / originalDims.w;
            const scaleH = (frame.w * sin + frame.h * cos) / originalDims.h;
            scale = Math.max(scaleW, scaleH);
        }

        setImgTransform((prev) => ({
            x: 0,
            y: 0,
            scale,
            rotation: prev.rotation ?? 0,
        }));
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

        // Revolve 3D interaction (orbit or pan)
        if (mode === 'revolve') {
            if (
                e.button === 1 ||
                e.buttons === 4 ||
                e.button === 2 ||
                (e.buttons & 2) === 2 ||
                isSpacePressed ||
                revolveTool === 'pan'
            ) {
                setInteractionState('panning_revolve');
            } else {
                setInteractionState('orbiting_revolve');
            }
            setStateStart({ ...revolveTransform });
            return;
        }

        // Pan Logic (inpaint / outpaint)
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
                if (isOverRotationHandle) {
                    setInteractionState('rotating_image');
                    return;
                }
                setInteractionState('moving_image');
                setStateStart({ ...imgTransform });
            }
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        const { clientX, clientY } = e;
        setCursorPos({ x: clientX, y: clientY });

        if (interactionState === 'idle') {
            if (mode === 'outpaint' && originalDims.h > 0) {
                const { x, y } = screenToContent(clientX, clientY);
                const halfH = (originalDims.h / 2) * imgTransform.scale;
                const handleDist = halfH + 28 / viewport.zoom;
                const rotRad = ((imgTransform.rotation - 90) * Math.PI) / 180;
                const handleX = imgTransform.x + handleDist * Math.cos(rotRad);
                const handleY = imgTransform.y + handleDist * Math.sin(rotRad);
                const dist = Math.hypot(x - handleX, y - handleY);
                setIsOverRotationHandle(dist <= 22 / viewport.zoom);
            }
            return;
        }

        const dx = clientX - pointerStart.x;
        const dy = clientY - pointerStart.y;

        if (interactionState === 'panning_viewport' && stateStart && 'zoom' in stateStart) {
            setViewport(applyPanDelta(stateStart, dx, dy));
        } else if (interactionState === 'orbiting_revolve' && stateStart && 'yaw' in stateStart) {
            const sensitivity = 0.35;
            const newYaw = clampAngle(Math.round(stateStart.yaw + dx * sensitivity), -90, 90);
            const newPitch = clampAngle(Math.round(stateStart.pitch - dy * sensitivity), -45, 45);
            setRevolveTransform((prev) => ({ ...prev, yaw: newYaw, pitch: newPitch }));
        } else if (interactionState === 'panning_revolve' && stateStart && 'panX' in stateStart) {
            setRevolveTransform((prev) => ({
                ...prev,
                panX: Math.round((stateStart.panX ?? 0) + dx),
                panY: Math.round((stateStart.panY ?? 0) + dy),
            }));
        } else if (interactionState === 'moving_image' && stateStart && 'scale' in stateStart) {
            setImgTransform({
                ...stateStart,
                x: stateStart.x + dx / viewport.zoom,
                y: stateStart.y + dy / viewport.zoom,
            });
        } else if (interactionState === 'rotating_image') {
            const { x, y } = screenToContent(clientX, clientY);
            const relX = x - imgTransform.x;
            const relY = y - imgTransform.y;
            const angleRad = Math.atan2(relY, relX);
            let rawDeg = (angleRad * 180) / Math.PI + 90;
            rawDeg = normalizeAngle(rawDeg);
            const finalDeg = snapAngle(rawDeg, isMagnetActive);
            setImgTransform((prev) => ({ ...prev, rotation: finalDeg }));
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
            if (e.shiftKey || e.altKey) {
                const step = isMagnetActive ? 45 : e.deltaY > 0 ? 5 : -5;
                const delta = e.deltaY > 0 ? step : -step;
                handleRotateStep(delta);
            } else {
                setImgTransform((prev) => ({
                    ...prev,
                    scale: applyWheelZoomDelta(prev.scale, e.deltaY, 0.001, 0.1, 5),
                }));
            }
        } else if (mode === 'revolve') {
            if (e.altKey) {
                const delta = e.deltaY > 0 ? 5 : -5;
                setRevolveTransform((prev) => ({
                    ...prev,
                    yaw: clampAngle(prev.yaw + delta, -90, 90),
                }));
            } else if (e.shiftKey) {
                const delta = e.deltaY > 0 ? -5 : 5;
                setRevolveTransform((prev) => ({
                    ...prev,
                    pitch: clampAngle(prev.pitch + delta, -45, 45),
                }));
            } else {
                setRevolveTransform((prev) => ({
                    ...prev,
                    zoom: applyWheelZoomDelta(prev.zoom ?? 1, e.deltaY, 0.001, 0.2, 3.0),
                }));
            }
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
            (mode === 'outpaint' &&
                (imgTransform.x !== 0 ||
                    imgTransform.y !== 0 ||
                    imgTransform.scale !== 1 ||
                    imgTransform.rotation !== 0)) ||
            (mode === 'revolve' &&
                (revolveTransform.yaw !== 0 ||
                    revolveTransform.pitch !== 0 ||
                    (revolveTransform.panX ?? 0) !== 0 ||
                    (revolveTransform.panY ?? 0) !== 0 ||
                    (revolveTransform.zoom ?? 1) !== 1));

        if (hasChanges) {
            setShowModeSwitchConfirm({ target });
        } else {
            onModeChange(target);
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
            activateRetouchMode(target);
        }
    };

    const confirmRetouchSwitch = () => {
        if (!showRetouchSwitchConfirm) return;
        const target = showRetouchSwitchConfirm.target;

        // Clear data of previous mode
        if (target === 'mask') {
            setDoodleHistory(resetHistoryState({ paths: [], texts: [] }));
        } else {
            setMaskHistory(resetHistoryState([]));
        }
        activateRetouchMode(target);
        setShowRetouchSwitchConfirm(null);
    };

    const resetTools = (keepPrompt: boolean = false) => {
        setMaskHistory(resetHistoryState([]));
        setDoodleHistory(resetHistoryState({ paths: [], texts: [] }));
        setImgTransform({ x: 0, y: 0, scale: 1, rotation: 0 });
        setRevolveTransform({ yaw: 0, pitch: 0, panX: 0, panY: 0, zoom: 1 });
        setRevolveTool('orbit');

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

        if (eventSurfaceRef.current && originalDims.w > 0) {
            const { clientWidth, clientHeight } = eventSurfaceRef.current;
            setViewport(fitImageToViewport(originalDims.w, originalDims.h, clientWidth, clientHeight));
        }
    };

    const confirmModeSwitch = () => {
        if (showModeSwitchConfirm) {
            onModeChange(showModeSwitchConfirm.target);
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
            (mode === 'outpaint' &&
                (imgTransform.x !== 0 ||
                    imgTransform.y !== 0 ||
                    imgTransform.scale !== 1 ||
                    imgTransform.rotation !== 0)) ||
            (mode === 'revolve' &&
                (revolveTransform.yaw !== 0 ||
                    revolveTransform.pitch !== 0 ||
                    (revolveTransform.panX ?? 0) !== 0 ||
                    (revolveTransform.panY ?? 0) !== 0 ||
                    (revolveTransform.zoom ?? 1) !== 1));

        if (hasChanges) {
            setShowExitConfirm(true);
        } else {
            onCancel();
        }
    };

    // --- Final Generation ---
    const buildEditorSubmissionPayload = () => {
        if (!imgElement || originalDims.w === 0) return;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // When mode === 'revolve', bound max canvas dimension to 1536px to prevent 429 TPM exhaustion
        let subW = frameDims.w;
        let subH = frameDims.h;
        if (mode === 'revolve') {
            const MAX_REVOLVE_DIM = 1536;
            const maxDim = Math.max(subW, subH);
            if (maxDim > MAX_REVOLVE_DIM) {
                const factor = MAX_REVOLVE_DIM / maxDim;
                subW = Math.max(1, Math.round(subW * factor));
                subH = Math.max(1, Math.round(subH * factor));
            }
        }

        canvas.width = subW;
        canvas.height = subH;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const promptResult = buildEditorPrompt({
            mode,
            retouchMode,
            prompt,
            visibleTextLabels,
            outpaintContext:
                mode === 'outpaint'
                    ? {
                          frameDims,
                          originalDims,
                          imgTransform,
                      }
                    : undefined,
            revolveContext:
                mode === 'revolve'
                    ? {
                          yaw: revolveTransform.yaw,
                          pitch: revolveTransform.pitch,
                          panX: revolveTransform.panX,
                          panY: revolveTransform.panY,
                          zoom: revolveTransform.zoom,
                      }
                    : undefined,
        });
        let finalPrompt = promptResult.finalPrompt;
        const finalModeLabel = promptResult.finalModeLabel;

        if (mode === 'inpaint') {
            if (retouchMode === 'mask') {
                // Inpaint: Image + Green Mask (source-over)
                ctx.drawImage(imgElement, 0, 0, originalDims.w, originalDims.h);
                drawStrokesToCanvas(ctx, maskPaths, { strokeStyle: '#00ff00' });
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
            }
        } else if (mode === 'revolve') {
            // Revolve: Render high-density smooth 3D Gaussian guidance with green mask
            const panScale = frameDims.w > 0 ? subW / frameDims.w : 1;
            const submissionRevolveTransform = {
                ...revolveTransform,
                panX: (revolveTransform.panX ?? 0) * panScale,
                panY: (revolveTransform.panY ?? 0) * panScale,
            };

            let submissionCloud = pointCloudRef.current;
            try {
                submissionCloud = createGaussianPointCloudFromImage(imgElement, subW, subH, {
                    sampleDensity: 'submission',
                });
            } catch (e) {
                console.warn('Failed to build high-density submission point cloud, falling back to draft:', e);
            }

            if (submissionCloud && submissionCloud.splats.length > 0) {
                renderGaussianSplatsToCanvas(ctx, submissionCloud, submissionRevolveTransform, subW, subH, {
                    clearColor: '#00ff00',
                    splatScaleMultiplier: 1.35,
                    renderMode: 'smooth',
                });
            } else {
                ctx.fillStyle = '#00ff00';
                ctx.fillRect(0, 0, subW, subH);
                ctx.save();
                ctx.translate(
                    subW / 2 + (submissionRevolveTransform.panX ?? 0),
                    subH / 2 + (submissionRevolveTransform.panY ?? 0),
                );
                ctx.scale(submissionRevolveTransform.zoom ?? 1, submissionRevolveTransform.zoom ?? 1);
                ctx.drawImage(imgElement, -subW / 2, -subH / 2, subW, subH);
                ctx.restore();
            }
        } else {
            // Outpaint Logic (Pre-fill canvas with bright green mask color)
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(0, 0, frameDims.w, frameDims.h);

            // Draw transformed Source Image
            ctx.save();
            ctx.translate(frameDims.w / 2, frameDims.h / 2);
            ctx.translate(imgTransform.x, imgTransform.y);
            ctx.rotate((imgTransform.rotation * Math.PI) / 180);
            ctx.scale(imgTransform.scale, imgTransform.scale);
            ctx.drawImage(imgElement, -originalDims.w / 2, -originalDims.h / 2);
            ctx.restore();
        }

        const base64 = canvas.toDataURL('image/png');
        return {
            finalPrompt,
            base64,
            finalModeLabel,
        };
    };

    const handleGenerateClick = () => {
        const submission = buildEditorSubmissionPayload();
        if (!submission) return;

        const sourceImageInput =
            mode === 'revolve' ? resolvedInitialImageUrl || initialImageUrl || undefined : undefined;

        onGenerate(
            submission.finalPrompt,
            submission.base64,
            batchSize,
            size,
            submission.finalModeLabel,
            objectImages,
            characterImages,
            ratio,
            sourceImageInput,
        );
    };

    const handleQueueBatchClick = () => {
        if (!onQueueBatch || queueBatchDisabledReason) return;

        const submission = buildEditorSubmissionPayload();
        if (!submission) return;

        const sourceImageInput =
            mode === 'revolve' ? resolvedInitialImageUrl || initialImageUrl || undefined : undefined;

        onQueueBatch(
            submission.finalPrompt,
            submission.base64,
            batchSize,
            size,
            submission.finalModeLabel,
            objectImages,
            characterImages,
            ratio,
            sourceImageInput,
        );
    };

    return (
        <div
            data-testid="image-editor"
            className="fixed inset-0 flex flex-row bg-gray-100 dark:bg-[#050505] animate-[fadeIn_0.2s_ease-out] select-none overflow-hidden text-gray-900 transition-colors duration-300 dark:text-gray-200"
            style={{ zIndex: WORKSPACE_EDITOR_Z_INDEX.root }}
        >
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

            {showTextToolFirstUseNotice && (
                <div
                    data-testid="editor-text-first-use-modal"
                    className="fixed inset-0 bg-black/50 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                    style={{ zIndex: WORKSPACE_EDITOR_Z_INDEX.exitConfirm }}
                >
                    <div className="nbu-modal-shell w-full max-w-md space-y-4 p-6 animate-[scaleIn_0.1s_ease-out]">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-600 dark:text-amber-300">
                                {t('editorTextToolHintTitle')}
                            </p>
                            <h3 className="mt-2 text-lg font-bold text-gray-900 dark:text-gray-100">
                                {t('editorTextFirstUseTitle')}
                            </h3>
                            <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                                {t('editorTextFirstUseBody')}
                            </p>
                        </div>
                        <div className="flex justify-end pt-2">
                            <button
                                data-testid="editor-text-first-use-confirm"
                                onClick={handleConfirmTextToolFirstUse}
                                className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-black shadow-lg shadow-amber-500/20 transition-colors hover:bg-amber-400"
                            >
                                {t('editorTextFirstUseConfirm')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* === MAIN WORKSPACE === */}
            <div className="flex-1 relative bg-gray-200 dark:bg-[#050505] overflow-hidden flex flex-col transition-colors">
                {/* UI LAYER */}
                <div className="absolute inset-0 z-50 pointer-events-none flex flex-col justify-between p-4">
                    <div className="relative z-10 flex justify-between items-start">
                        {/* Top Actions */}
                        <div className="nbu-toolbar-shell pointer-events-auto flex gap-2 p-1.5 transition-colors">
                            <div className="nbu-toolbar-segment grid grid-cols-3 gap-1 p-1">
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
                                <button
                                    data-testid="editor-mode-revolve"
                                    onClick={() => handleSwitchMode('revolve')}
                                    className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-all ${mode === 'revolve' ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
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
                                            d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                                        />
                                    </svg>
                                    <span>{t('modeRevolve')}</span>
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
                            ) : mode === 'revolve' ? (
                                <>
                                    <div className="flex items-center gap-1">
                                        <button
                                            data-testid="editor-revolve-preset-front"
                                            onClick={() => setRevolveTransform({ yaw: 0, pitch: 0 })}
                                            disabled={isGenerating}
                                            className={`px-2 py-1 text-xs font-bold rounded transition-colors ${revolveTransform.yaw === 0 && revolveTransform.pitch === 0 ? 'bg-amber-500 text-black shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                                            title={t('revolvePresetFront')}
                                        >
                                            {t('revolvePresetFront')}
                                        </button>
                                        <button
                                            data-testid="editor-revolve-preset-left"
                                            onClick={() => setRevolveTransform((p) => ({ ...p, yaw: -30 }))}
                                            disabled={isGenerating}
                                            className="px-2 py-1 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                                            title={t('revolvePresetLeft')}
                                        >
                                            {t('revolvePresetLeft')}
                                        </button>
                                        <button
                                            data-testid="editor-revolve-preset-right"
                                            onClick={() => setRevolveTransform((p) => ({ ...p, yaw: 30 }))}
                                            disabled={isGenerating}
                                            className="px-2 py-1 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                                            title={t('revolvePresetRight')}
                                        >
                                            {t('revolvePresetRight')}
                                        </button>
                                        <button
                                            data-testid="editor-revolve-preset-high"
                                            onClick={() => setRevolveTransform((p) => ({ ...p, pitch: 20 }))}
                                            disabled={isGenerating}
                                            className="px-2 py-1 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                                            title={t('revolvePresetHigh')}
                                        >
                                            {t('revolvePresetHigh')}
                                        </button>
                                        <button
                                            data-testid="editor-revolve-preset-low"
                                            onClick={() => setRevolveTransform((p) => ({ ...p, pitch: -20 }))}
                                            disabled={isGenerating}
                                            className="px-2 py-1 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                                            title={t('revolvePresetLow')}
                                        >
                                            {t('revolvePresetLow')}
                                        </button>
                                    </div>

                                    <div className="w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>

                                    {/* Yaw & Pitch & Zoom Badges */}
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            data-testid="editor-revolve-yaw-badge"
                                            onClick={() => setRevolveTransform((p) => ({ ...p, yaw: 0 }))}
                                            disabled={isGenerating || revolveTransform.yaw === 0}
                                            className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold transition-colors ${
                                                revolveTransform.yaw !== 0
                                                    ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                                                    : 'text-gray-400 dark:text-gray-500 cursor-default'
                                            }`}
                                            title={`Yaw: ${revolveTransform.yaw}° (Click to reset 0°)`}
                                        >
                                            Y:{' '}
                                            {revolveTransform.yaw > 0
                                                ? `+${revolveTransform.yaw}`
                                                : revolveTransform.yaw}
                                            °
                                        </button>
                                        <button
                                            data-testid="editor-revolve-pitch-badge"
                                            onClick={() => setRevolveTransform((p) => ({ ...p, pitch: 0 }))}
                                            disabled={isGenerating || revolveTransform.pitch === 0}
                                            className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold transition-colors ${
                                                revolveTransform.pitch !== 0
                                                    ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                                                    : 'text-gray-400 dark:text-gray-500 cursor-default'
                                            }`}
                                            title={`Pitch: ${revolveTransform.pitch}° (Click to reset 0°)`}
                                        >
                                            P:{' '}
                                            {revolveTransform.pitch > 0
                                                ? `+${revolveTransform.pitch}`
                                                : revolveTransform.pitch}
                                            °
                                        </button>
                                        <button
                                            data-testid="editor-revolve-zoom-badge"
                                            onClick={() => setRevolveTransform((p) => ({ ...p, zoom: 1 }))}
                                            disabled={isGenerating || (revolveTransform.zoom ?? 1) === 1}
                                            className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold transition-colors ${
                                                (revolveTransform.zoom ?? 1) !== 1
                                                    ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                                                    : 'text-gray-400 dark:text-gray-500 cursor-default'
                                            }`}
                                            title={`Zoom: ${Math.round((revolveTransform.zoom ?? 1) * 100)}% (Click to reset 100%)`}
                                        >
                                            Z: {Math.round((revolveTransform.zoom ?? 1) * 100)}%
                                        </button>
                                        {((revolveTransform.panX ?? 0) !== 0 || (revolveTransform.panY ?? 0) !== 0) && (
                                            <button
                                                data-testid="editor-revolve-pan-badge"
                                                onClick={() => setRevolveTransform((p) => ({ ...p, panX: 0, panY: 0 }))}
                                                disabled={isGenerating}
                                                className="px-1.5 py-0.5 rounded text-[11px] font-mono font-bold transition-colors text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                                                title="Pan (Click to reset center)"
                                            >
                                                Pan: {revolveTransform.panX ?? 0}, {revolveTransform.panY ?? 0}
                                            </button>
                                        )}
                                    </div>

                                    <div className="w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>
                                    <button
                                        data-testid="editor-revolve-reset"
                                        onClick={() =>
                                            setRevolveTransform({ yaw: 0, pitch: 0, panX: 0, panY: 0, zoom: 1 })
                                        }
                                        disabled={
                                            isGenerating ||
                                            (revolveTransform.yaw === 0 &&
                                                revolveTransform.pitch === 0 &&
                                                (revolveTransform.panX ?? 0) === 0 &&
                                                (revolveTransform.panY ?? 0) === 0 &&
                                                (revolveTransform.zoom ?? 1) === 1)
                                        }
                                        className="px-3 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded uppercase transition-colors disabled:opacity-50"
                                    >
                                        {t('btnReset')}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        data-testid="editor-fit-view"
                                        onClick={() => fitImageToFrame('contain')}
                                        disabled={isGenerating}
                                        className="px-2 py-1.5 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                                        title={t('btnFit')}
                                    >
                                        {t('btnFit')}
                                    </button>
                                    <button
                                        data-testid="editor-fill-view"
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
                                        data-testid="editor-reset"
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
                        {mode === 'inpaint' && leftDockTopOffset !== null && (
                            <div
                                data-testid="editor-retouch-toolbar"
                                className="nbu-toolbar-shell fixed left-4 flex flex-col gap-2 p-1.5 pointer-events-auto transition-all md:left-5"
                                style={{ top: leftDockTopOffset }}
                            >
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
                                    data-testid="editor-doodle-mode"
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

                        {/* Left Tools (Revolve: Orbit & Pan) */}
                        {mode === 'revolve' && leftDockTopOffset !== null && (
                            <div
                                data-testid="editor-revolve-toolbar"
                                className="nbu-toolbar-shell fixed left-4 flex flex-col gap-2 p-1.5 pointer-events-auto transition-all md:left-5"
                                style={{ top: leftDockTopOffset }}
                            >
                                {/* Orbit Tool */}
                                <button
                                    data-testid="editor-revolve-orbit-tool"
                                    onClick={() => setRevolveTool('orbit')}
                                    disabled={isGenerating}
                                    className={`p-3 rounded-lg transition-colors disabled:opacity-50 ${
                                        revolveTool === 'orbit'
                                            ? 'bg-amber-500 text-black shadow-md'
                                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                    }`}
                                    title={t('revolveToolOrbit')}
                                >
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                        />
                                    </svg>
                                </button>

                                {/* Pan Tool */}
                                <button
                                    data-testid="editor-revolve-pan-tool"
                                    onClick={() => setRevolveTool('pan')}
                                    disabled={isGenerating}
                                    className={`p-3 rounded-lg transition-colors disabled:opacity-50 ${
                                        revolveTool === 'pan'
                                            ? 'bg-amber-500 text-black shadow-md'
                                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                    }`}
                                    title={t('revolveToolPan')}
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
                                                data-testid="editor-text-tool"
                                                onClick={handleActivateTextTool}
                                                className={`p-2 rounded-lg ${activeTool === 'text' ? 'bg-amber-100 text-amber-600' : 'text-gray-400'}`}
                                                title={textToolButtonTitle}
                                                aria-label={t('editorTextToolHintTitle')}
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

                            {/* Rotation Slider (Outpaint mode) */}
                            {mode === 'outpaint' && (
                                <div className="nbu-toolbar-shell flex flex-col items-center gap-2 rounded-full px-1.5 py-3 transition-colors">
                                    <button
                                        data-testid="editor-rotation-badge"
                                        onClick={() => handleRotationChange(0)}
                                        disabled={isGenerating || imgTransform.rotation === 0}
                                        className={`text-[10px] font-mono font-bold transition-colors ${
                                            imgTransform.rotation !== 0
                                                ? 'text-amber-600 dark:text-amber-400 hover:underline cursor-pointer'
                                                : 'text-gray-500 dark:text-gray-400 cursor-default'
                                        }`}
                                        title={`${t('toolRotation')}: ${Math.round(imgTransform.rotation)}° (Click to reset 0°)`}
                                    >
                                        {Math.round(imgTransform.rotation)}°
                                    </button>
                                    <div className="h-32 w-2 relative flex justify-center">
                                        <input
                                            data-testid="editor-rotation-slider"
                                            type="range"
                                            min="-180"
                                            max="180"
                                            step={isMagnetActive ? 45 : 1}
                                            value={Math.round(imgTransform.rotation)}
                                            onChange={(e) => handleRotationChange(Number(e.target.value))}
                                            disabled={isGenerating}
                                            className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-32 -rotate-90 origin-center bg-transparent appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-amber-500 [&::-webkit-slider-thumb]:rounded-full disabled:opacity-50"
                                            style={{ width: '128px' }}
                                            title={t('toolRotation')}
                                        />
                                    </div>
                                    <button
                                        data-testid="editor-magnet-snap"
                                        onClick={toggleMagnet}
                                        disabled={isGenerating}
                                        aria-pressed={isMagnetActive}
                                        className={`flex flex-col items-center justify-center p-1.5 rounded-lg text-xs transition-colors ${
                                            isMagnetActive
                                                ? 'bg-amber-500 text-black font-bold shadow-sm ring-1 ring-amber-400'
                                                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                                        }`}
                                        title={`${t('toolMagnetSnap')}: ${isMagnetActive ? 'ON' : 'OFF'}`}
                                    >
                                        <svg
                                            className="w-4 h-4"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth={2}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <path
                                                d="M4 4v7a8 8 0 0 0 16 0V4h-4v7a4 4 0 0 1-8 0V4H4z"
                                                fill={isMagnetActive ? 'currentColor' : 'none'}
                                                fillOpacity={isMagnetActive ? 0.25 : 0}
                                            />
                                            <line x1="4" y1="8" x2="8" y2="8" strokeWidth={1.5} />
                                            <line x1="16" y1="8" x2="20" y2="8" strokeWidth={1.5} />
                                        </svg>
                                        <span className="text-[9px] font-mono font-bold leading-none mt-0.5">45°</span>
                                    </button>
                                </div>
                            )}

                            {/* Revolve Dual Sliders (Yaw & Pitch & Zoom) */}
                            {mode === 'revolve' && (
                                <div className="nbu-toolbar-shell flex flex-col items-center gap-3 rounded-2xl px-2 py-3 transition-colors">
                                    {/* Yaw Slider */}
                                    <div className="flex flex-col items-center gap-1">
                                        <div className="text-[10px] font-mono font-bold text-gray-500 dark:text-gray-400">
                                            Y: {revolveTransform.yaw}°
                                        </div>
                                        <div className="h-28 w-2 relative flex justify-center">
                                            <input
                                                data-testid="editor-revolve-yaw-slider"
                                                type="range"
                                                min="-90"
                                                max="90"
                                                step="1"
                                                value={revolveTransform.yaw}
                                                onChange={(e) =>
                                                    setRevolveTransform((p) => ({
                                                        ...p,
                                                        yaw: Number(e.target.value),
                                                    }))
                                                }
                                                disabled={isGenerating}
                                                className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-28 -rotate-90 origin-center bg-transparent appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-amber-500 [&::-webkit-slider-thumb]:rounded-full disabled:opacity-50"
                                                style={{ width: '112px' }}
                                                title={t('revolveYaw')}
                                            />
                                        </div>
                                    </div>

                                    <div className="w-full h-px bg-gray-200 dark:bg-gray-700" />

                                    {/* Pitch Slider */}
                                    <div className="flex flex-col items-center gap-1">
                                        <div className="text-[10px] font-mono font-bold text-gray-500 dark:text-gray-400">
                                            P: {revolveTransform.pitch}°
                                        </div>
                                        <div className="h-28 w-2 relative flex justify-center">
                                            <input
                                                data-testid="editor-revolve-pitch-slider"
                                                type="range"
                                                min="-45"
                                                max="45"
                                                step="1"
                                                value={revolveTransform.pitch}
                                                onChange={(e) =>
                                                    setRevolveTransform((p) => ({
                                                        ...p,
                                                        pitch: Number(e.target.value),
                                                    }))
                                                }
                                                disabled={isGenerating}
                                                className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-28 -rotate-90 origin-center bg-transparent appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-amber-500 [&::-webkit-slider-thumb]:rounded-full disabled:opacity-50"
                                                style={{ width: '112px' }}
                                                title={t('revolvePitch')}
                                            />
                                        </div>
                                    </div>

                                    <div className="w-full h-px bg-gray-200 dark:bg-gray-700" />

                                    {/* Zoom Slider */}
                                    <div className="flex flex-col items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setRevolveTransform((p) => ({ ...p, zoom: 1 }))}
                                            disabled={isGenerating || (revolveTransform.zoom ?? 1) === 1}
                                            className={`text-[10px] font-mono font-bold transition-colors ${
                                                (revolveTransform.zoom ?? 1) !== 1
                                                    ? 'text-amber-600 dark:text-amber-400 hover:underline cursor-pointer'
                                                    : 'text-gray-500 dark:text-gray-400 cursor-default'
                                            }`}
                                            title="Zoom (Click to reset 100%)"
                                        >
                                            Z: {Math.round((revolveTransform.zoom ?? 1) * 100)}%
                                        </button>
                                        <div className="h-28 w-2 relative flex justify-center">
                                            <input
                                                data-testid="editor-revolve-zoom-slider"
                                                type="range"
                                                min="20"
                                                max="300"
                                                step="5"
                                                value={Math.round((revolveTransform.zoom ?? 1) * 100)}
                                                onChange={(e) =>
                                                    setRevolveTransform((p) => ({
                                                        ...p,
                                                        zoom: Math.round(Number(e.target.value)) / 100,
                                                    }))
                                                }
                                                disabled={isGenerating}
                                                className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-28 -rotate-90 origin-center bg-transparent appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-amber-500 [&::-webkit-slider-thumb]:rounded-full disabled:opacity-50"
                                                style={{ width: '112px' }}
                                                title={t('revolveZoom')}
                                            />
                                        </div>
                                    </div>
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
                                        value={mode === 'outpaint' ? imgTransform.scale : viewport.zoom}
                                        onChange={(e) => {
                                            const v = Number(e.target.value);
                                            if (mode === 'outpaint') setImgTransform((p) => ({ ...p, scale: v }));
                                            else setViewport((p) => ({ ...p, zoom: v }));
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
                    <div className="pointer-events-auto mx-auto flex w-full max-w-[720px] items-center gap-3 px-4 pb-4">
                        <Button
                            data-testid="editor-generate"
                            onClick={handleGenerateClick}
                            disabled={isGenerating}
                            className={`
                                flex-1 min-w-0
                                shadow-[0_0_40px_rgba(245,158,11,0.6)] border border-yellow-200/60 
                                bg-gradient-to-r from-amber-600 via-yellow-500 to-orange-600 
                                bg-[length:200%_auto] px-5 py-3.5 rounded-full text-sm font-black tracking-[0.18em] sm:text-base sm:tracking-widest
                                relative group overflow-hidden transition-all duration-300 animate-gradient-xy hover:scale-105
                            `}
                        >
                            <span className="text-center leading-tight drop-shadow-md">{t('btnRender')}</span>
                        </Button>
                        {supportsQueuedBatch && onQueueBatch ? (
                            <Button
                                data-testid="editor-queue-batch"
                                variant="secondary"
                                onClick={handleQueueBatchClick}
                                disabled={isGenerating || Boolean(queueBatchDisabledReason)}
                                title={queueBatchDisabledReason || undefined}
                                className="flex-1 min-w-0 rounded-full border border-gray-300/70 px-5 py-3.5 text-sm font-extrabold tracking-[0.12em] text-gray-800 shadow-[0_12px_30px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-0.5 dark:border-gray-600/70 dark:text-gray-100 sm:text-base"
                            >
                                <span className="text-center leading-tight">{t('composerQueueBatchJob')}</span>
                            </Button>
                        ) : null}
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
                    ${mode === 'revolve' ? (interactionState === 'orbiting_revolve' || interactionState === 'panning_revolve' ? 'cursor-grabbing' : 'cursor-grab') : ''}
                    ${mode === 'outpaint' ? (interactionState === 'rotating_image' ? 'cursor-grabbing' : isOverRotationHandle ? 'cursor-grab' : 'cursor-move') : ''}
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
                    onContextMenu={(e) => {
                        if (mode === 'revolve') {
                            e.preventDefault();
                        }
                    }}
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
                                <img
                                    src={resolvedInitialImageUrl || initialImageUrl || undefined}
                                    className="w-full h-full block"
                                    alt="Source"
                                />
                                <canvas
                                    ref={overlayCanvasRef}
                                    width={originalDims.w}
                                    height={originalDims.h}
                                    className={`absolute inset-0 w-full h-full mix-blend-normal ${retouchMode === 'mask' ? 'opacity-60' : 'opacity-100'}`}
                                />
                                <div className="absolute inset-0 border border-white/20 pointer-events-none transition-colors duration-500" />
                            </div>
                        ) : mode === 'revolve' ? (
                            <div
                                className="relative overflow-hidden border border-gray-400 bg-checkerboard shadow-2xl transition-colors duration-500 dark:border-gray-700"
                                style={{ width: frameDims.w, height: frameDims.h }}
                            >
                                <canvas
                                    data-testid="editor-revolve-canvas"
                                    ref={revolveCanvasRef}
                                    width={frameDims.w}
                                    height={frameDims.h}
                                    className="w-full h-full block"
                                />
                                <div className="absolute top-2 left-2 pointer-events-none flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/70 text-[11px] font-mono font-medium text-emerald-300 backdrop-blur-sm border border-emerald-500/30 shadow-lg">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span>
                                        3DGS{' '}
                                        {revolveTransform.yaw > 0 ? `+${revolveTransform.yaw}` : revolveTransform.yaw}°
                                        /{' '}
                                        {revolveTransform.pitch > 0
                                            ? `+${revolveTransform.pitch}`
                                            : revolveTransform.pitch}
                                        °
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div
                                className="relative overflow-hidden border border-gray-400 bg-checkerboard shadow-2xl transition-colors duration-500 dark:border-gray-700"
                                style={{ width: frameDims.w, height: frameDims.h }}
                            >
                                <div
                                    className="absolute top-1/2 left-1/2 origin-center"
                                    style={{
                                        width: originalDims.w,
                                        height: originalDims.h,
                                        transform: `translate(-50%, -50%) translate(${imgTransform.x}px, ${imgTransform.y}px) rotate(${imgTransform.rotation}deg) scale(${imgTransform.scale})`,
                                    }}
                                >
                                    <img
                                        src={resolvedInitialImageUrl || initialImageUrl || undefined}
                                        className="w-full h-full object-cover shadow-xl"
                                        alt="Source"
                                    />
                                    <div className="absolute inset-0 border-2 border-blue-500/50 transition-colors" />

                                    {/* Rotation Handle Widget */}
                                    <div
                                        data-testid="editor-rotation-handle"
                                        className="absolute left-1/2 -top-7 flex -translate-x-1/2 flex-col items-center pointer-events-none"
                                        style={{ transformOrigin: 'bottom center' }}
                                    >
                                        <div
                                            className={`w-3.5 h-3.5 rounded-full border-2 bg-white shadow-md transition-all ${
                                                isOverRotationHandle || interactionState === 'rotating_image'
                                                    ? 'border-amber-500 bg-amber-100 scale-125'
                                                    : 'border-blue-500'
                                            }`}
                                        />
                                        <div className="w-0.5 h-3.5 bg-blue-500/80" />
                                    </div>
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
                    className="absolute z-[200] max-w-[340px]"
                    style={{
                        left: showTextInput.x,
                        top: showTextInput.y,
                        transform: 'translateY(-50%)',
                    }}
                >
                    <div className="rounded-xl border border-white/20 bg-black/70 p-2 shadow-2xl backdrop-blur-md">
                        <div className="flex items-center gap-1">
                            <input
                                ref={textInputRef}
                                type="text"
                                onKeyDown={handleTextSubmit}
                                className="min-w-[220px] bg-transparent px-3 py-2 text-lg text-white outline-none placeholder:text-white/50"
                                placeholder={t('editorTextInputPlaceholder')}
                                autoFocus
                            />
                            <button
                                onClick={commitText}
                                className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-lg transition-colors border border-white/20"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={3}
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                            </button>
                        </div>
                        <div className="mt-2 space-y-1 px-1">
                            <p className="text-[11px] leading-relaxed text-white/85">
                                {t('editorTextInputHintPrimary')}
                            </p>
                            <p className="text-[11px] leading-relaxed text-white/65">
                                {t('editorTextInputHintSecondary')}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImageEditor;
