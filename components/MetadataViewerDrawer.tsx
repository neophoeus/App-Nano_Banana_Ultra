import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ViewerComposerSettingsSnapshot } from '../types';
import {
    convertMetadataToViewerSnapshot,
    extractNanoBananaMetadata,
    mergeSidecarMetadata,
    NanoBananaMetadataPayload,
    parseImageEmbeddedMetadata,
    RawImageEmbeddedMetadata,
} from '../utils/imageEmbeddedMetadataReader';
import { Language } from '../utils/translations';
import WorkspaceSupportDetailSurface from './WorkspaceSupportDetailSurface';

export type MetadataViewerDrawerProps = {
    isOpen: boolean;
    onClose: () => void;
    currentLanguage: Language;
    t: (key: string) => string;
    onApplyPrompt?: (prompt: string) => void;
    onApplySettings?: (snapshot: ViewerComposerSettingsSnapshot) => void;
    onApplyBoth?: (prompt: string, snapshot: ViewerComposerSettingsSnapshot) => void;
    settingsLocked?: boolean;
    showNotification?: (message: string, type?: 'info' | 'error') => void;
    initialImages?: LoadedImageItem[];
};

export interface LoadedImageItem {
    file?: Blob | File;
    name: string;
    url: string;
    rawMeta?: RawImageEmbeddedMetadata;
    parsedMeta?: NanoBananaMetadataPayload | null;
    sidecar?: Record<string, unknown> | null;
}

const DRAWER_LABELS: Record<
    Language,
    {
        title: string;
        applyBoth: string;
        bothAppliedNotice: string;
        dropPrompt: string;
        dropSubtext: string;
        noImages: string;
        copyPrompt: string;
        copied: string;
        model: string;
        style: string;
        aspectRatio: string;
        size: string;
        temperature: string;
        thinkingLevel: string;
        createdAt: string;
    }
> = {
    zh_TW: {
        title: '圖片中繼資料檢視器 (Metadata Viewer)',
        applyBoth: '同時套用',
        bothAppliedNotice: '已將提示詞與設定同時套用到編輯區。',
        dropPrompt: '拖放圖片至此，或點擊選取檔案',
        dropSubtext: '支援 PNG, JPG, JPEG 及 .json 側車檔案',
        noImages: '尚未載入任何圖片',
        copyPrompt: '一鍵複製',
        copied: '已複製！',
        model: '模型',
        style: '風格',
        aspectRatio: '比例',
        size: '尺寸',
        temperature: '溫度',
        thinkingLevel: '思考層級',
        createdAt: '生成時間',
    },
    zh_CN: {
        title: '图片元数据查看器 (Metadata Viewer)',
        applyBoth: '同时应用',
        bothAppliedNotice: '已将提示词与设置同时应用到编辑区。',
        dropPrompt: '拖放图片至此，或点击选取文件',
        dropSubtext: '支持 PNG, JPG, JPEG 及 .json 侧车文件',
        noImages: '尚未加载任何图片',
        copyPrompt: '一键复制',
        copied: '已复制！',
        model: '模型',
        style: '风格',
        aspectRatio: '比例',
        size: '尺寸',
        temperature: '温度',
        thinkingLevel: '思考层级',
        createdAt: '生成时间',
    },
    en: {
        title: 'Image Metadata Viewer',
        applyBoth: 'Apply Both',
        bothAppliedNotice: 'Applied prompt and settings to composer.',
        dropPrompt: 'Drop images here, or click to browse',
        dropSubtext: 'Supports PNG, JPG, JPEG and sidecar .json files',
        noImages: 'No images loaded',
        copyPrompt: 'Copy Prompt',
        copied: 'Copied!',
        model: 'Model',
        style: 'Style',
        aspectRatio: 'Aspect Ratio',
        size: 'Size',
        temperature: 'Temperature',
        thinkingLevel: 'Thinking Level',
        createdAt: 'Created At',
    },
    ja: {
        title: '画像メタデータビューアー',
        applyBoth: '両方を適用',
        bothAppliedNotice: 'プロンプトと設定をコンポーザーに適用しました。',
        dropPrompt: '画像をドラッグ＆ドロップ、またはクリックして選択',
        dropSubtext: 'PNG, JPG, JPEG および .json サイドカーに対応',
        noImages: '画像が読み込まれていません',
        copyPrompt: 'コピー',
        copied: 'コピー完了！',
        model: 'モデル',
        style: 'スタイル',
        aspectRatio: '比率',
        size: 'サイズ',
        temperature: '温度',
        thinkingLevel: '思考レベル',
        createdAt: '生成日時',
    },
    ko: {
        title: '이미지 메타데이터 뷰어',
        applyBoth: '동시 적용',
        bothAppliedNotice: '프롬프트와 설정을 컴포저에 적용했습니다.',
        dropPrompt: '이미지를 드래그하여 놓거나 클릭하여 선택',
        dropSubtext: 'PNG, JPG, JPEG 및 .json 사이드카 지원',
        noImages: '불러온 이미지가 없습니다',
        copyPrompt: '복사',
        copied: '복사됨!',
        model: '모델',
        style: '스타일',
        aspectRatio: '비율',
        size: '크기',
        temperature: '온도',
        thinkingLevel: '생각 레벨',
        createdAt: '생성 시간',
    },
    de: {
        title: 'Bild-Metadaten-Betrachter',
        applyBoth: 'Beides anwenden',
        bothAppliedNotice: 'Prompt und Einstellungen auf Composer angewendet.',
        dropPrompt: 'Bilder hier ablegen oder zum Auswählen klicken',
        dropSubtext: 'Unterstützt PNG, JPG, JPEG und .json Sidecar-Dateien',
        noImages: 'Keine Bilder geladen',
        copyPrompt: 'Kopieren',
        copied: 'Kopiert!',
        model: 'Modell',
        style: 'Stil',
        aspectRatio: 'Seitenverhältnis',
        size: 'Größe',
        temperature: 'Temperatur',
        thinkingLevel: 'Denkstufe',
        createdAt: 'Erstellt am',
    },
    fr: {
        title: 'Visionneuse de métadonnées d’image',
        applyBoth: 'Appliquer les deux',
        bothAppliedNotice: 'Invite et paramètres appliqués au compositeur.',
        dropPrompt: 'Déposez des images ici, ou cliquez pour parcourir',
        dropSubtext: 'Prend en charge PNG, JPG, JPEG et fichiers .json annexes',
        noImages: 'Aucune image chargée',
        copyPrompt: 'Copier',
        copied: 'Copié !',
        model: 'Modèle',
        style: 'Style',
        aspectRatio: 'Format',
        size: 'Taille',
        temperature: 'Température',
        thinkingLevel: 'Niveau de réflexion',
        createdAt: 'Créé le',
    },
    es: {
        title: 'Visor de metadatos de imágenes',
        applyBoth: 'Aplicar ambos',
        bothAppliedNotice: 'Indicación y configuración aplicadas al editor.',
        dropPrompt: 'Arrastre imágenes aquí o haga clic para examinar',
        dropSubtext: 'Compatible con PNG, JPG, JPEG y archivos secundarios .json',
        noImages: 'No hay imágenes cargadas',
        copyPrompt: 'Copiar',
        copied: '¡Copiado!',
        model: 'Modelo',
        style: 'Estilo',
        aspectRatio: 'Proporción',
        size: 'Tamaño',
        temperature: 'Temperatura',
        thinkingLevel: 'Nivel de pensamiento',
        createdAt: 'Creado el',
    },
    ru: {
        title: 'Просмотр метаданных изображений',
        applyBoth: 'Применить оба',
        bothAppliedNotice: 'Промпт и параметры применены к редактору.',
        dropPrompt: 'Перетащите изображения сюда или нажмите для выбора',
        dropSubtext: 'Поддерживаются PNG, JPG, JPEG и сопутствующие файлы .json',
        noImages: 'Изображения не загружены',
        copyPrompt: 'Копировать',
        copied: 'Скопировано!',
        model: 'Модель',
        style: 'Стиль',
        aspectRatio: 'Соотношение сторон',
        size: 'Размер',
        temperature: 'Температура',
        thinkingLevel: 'Уровень размышления',
        createdAt: 'Создано',
    },
};

export default function MetadataViewerDrawer({
    isOpen,
    onClose,
    currentLanguage,
    t,
    onApplyPrompt,
    onApplySettings,
    onApplyBoth,
    settingsLocked = false,
    showNotification,
    initialImages,
}: MetadataViewerDrawerProps) {
    const fileInputId = useId();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [loadedImages, setLoadedImages] = useState<LoadedImageItem[]>(() => initialImages || []);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [copied, setCopied] = useState(false);

    const labels = DRAWER_LABELS[currentLanguage] || DRAWER_LABELS.en;

    // Clean up created Blob URLs when unmounting or reloading images
    useEffect(() => {
        return () => {
            loadedImages.forEach((img) => {
                if (img.url && img.url.startsWith('blob:')) {
                    try {
                        URL.revokeObjectURL(img.url);
                    } catch {
                        // ignore
                    }
                }
            });
        };
    }, [loadedImages]);

    const handleFiles = useCallback(async (files: FileList | File[]) => {
        const fileList = Array.from(files);
        const imageFiles = fileList.filter((f) => /\.(png|jpe?g)$/i.test(f.name));
        const jsonFiles = fileList.filter((f) => /\.json$/i.test(f.name));

        if (imageFiles.length === 0 && jsonFiles.length === 0) {
            return;
        }

        // Parse sidecars map by base filename
        const sidecarMap = new Map<string, Record<string, unknown>>();
        for (const jf of jsonFiles) {
            try {
                const text = await jf.text();
                const parsed = JSON.parse(text);
                const stem = jf.name.replace(/\.json$/i, '');
                sidecarMap.set(stem, parsed);
            } catch {
                // Ignore parse error
            }
        }

        const newItems: LoadedImageItem[] = [];
        const processedStems = new Set<string>();

        for (const file of imageFiles) {
            try {
                const buffer = await file.arrayBuffer();
                const stem = file.name.replace(/\.[^.]+$/, '');
                processedStems.add(stem);

                let sidecar = sidecarMap.get(stem) || null;
                const partMatch = stem.match(/^(.+)-part-\d+$/);
                if (partMatch) {
                    const parentSidecar = sidecarMap.get(partMatch[1]);
                    if (parentSidecar) {
                        sidecar = mergeSidecarMetadata(sidecar, parentSidecar);
                    }
                }

                const rawMeta = parseImageEmbeddedMetadata(buffer);
                let parsedMeta = extractNanoBananaMetadata(buffer, sidecar);

                if (!parsedMeta || (!parsedMeta.prompt && !parsedMeta.model)) {
                    try {
                        const res = await fetch(`/api/load-image-metadata?filename=${encodeURIComponent(file.name)}`);
                        if (res.ok) {
                            const remoteSidecar = await res.json();
                            if (remoteSidecar && typeof remoteSidecar === 'object') {
                                sidecar = mergeSidecarMetadata(sidecar, remoteSidecar);
                                parsedMeta = extractNanoBananaMetadata(buffer, sidecar);
                            }
                        }
                    } catch {
                        // ignore network error
                    }
                }

                const url = URL.createObjectURL(file);

                newItems.push({
                    file,
                    name: file.name,
                    url,
                    rawMeta,
                    parsedMeta,
                    sidecar,
                });
            } catch (err) {
                console.error('Failed reading image metadata:', file.name, err);
            }
        }

        // Process standalone JSON sidecars (not matching any selected imageFile)
        for (const jf of jsonFiles) {
            const stem = jf.name.replace(/\.json$/i, '');
            if (processedStems.has(stem)) continue;
            processedStems.add(stem);

            try {
                let sidecar = sidecarMap.get(stem) || null;
                const partMatch = stem.match(/^(.+)-part-\d+$/);
                if (partMatch) {
                    const parentSidecar = sidecarMap.get(partMatch[1]);
                    if (parentSidecar) {
                        sidecar = mergeSidecarMetadata(sidecar, parentSidecar);
                    } else {
                        try {
                            const res = await fetch(
                                `/api/load-image-metadata?filename=${encodeURIComponent(partMatch[1] + '.json')}`,
                            );
                            if (res.ok) {
                                const remoteParent = await res.json();
                                sidecar = mergeSidecarMetadata(sidecar, remoteParent);
                            }
                        } catch {}
                    }
                }

                const parsedMeta = extractNanoBananaMetadata(new ArrayBuffer(0), sidecar);
                const candidateFilename = (sidecar as any)?.filename || `${stem}.png`;
                const previewUrl = `/api/load-image?filename=${encodeURIComponent(candidateFilename)}`;

                newItems.push({
                    file: jf,
                    name: jf.name,
                    url: previewUrl,
                    rawMeta: {},
                    parsedMeta,
                    sidecar,
                });
            } catch (err) {
                console.error('Failed reading standalone sidecar json:', jf.name, err);
            }
        }

        if (newItems.length > 0) {
            setLoadedImages((prev) => {
                // Revoke old URLs
                prev.forEach((p) => {
                    if (p.url.startsWith('blob:')) {
                        try {
                            URL.revokeObjectURL(p.url);
                        } catch {}
                    }
                });
                return newItems;
            });
            setCurrentIndex(0);
        }
    }, []);

    // Drag and drop listeners
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
                void handleFiles(e.dataTransfer.files);
            }
        },
        [handleFiles],
    );

    const handleFileInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.files && e.target.files.length > 0) {
                void handleFiles(e.target.files);
            }
        },
        [handleFiles],
    );

    // Keyboard navigation: ArrowLeft / ArrowRight
    useEffect(() => {
        if (!isOpen || loadedImages.length <= 1) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (
                e.target instanceof HTMLElement &&
                (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)
            ) {
                return;
            }
            if (e.key === 'ArrowRight' || e.key === 'Right') {
                setCurrentIndex((prev) => (prev + 1) % loadedImages.length);
            } else if (e.key === 'ArrowLeft' || e.key === 'Left') {
                setCurrentIndex((prev) => (prev - 1 + loadedImages.length) % loadedImages.length);
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isOpen, loadedImages.length]);

    const currentItem = loadedImages[currentIndex] || null;
    const currentMeta = currentItem?.parsedMeta || null;
    const currentPrompt = currentMeta?.prompt || currentItem?.rawMeta?.['parameters'] || '';

    const handleCopyPrompt = useCallback(() => {
        if (!currentPrompt) return;
        void navigator.clipboard.writeText(currentPrompt).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
        });
    }, [currentPrompt]);

    const handleApplyPromptClick = useCallback(() => {
        if (!currentPrompt || !onApplyPrompt) return;
        onApplyPrompt(currentPrompt);
    }, [currentPrompt, onApplyPrompt]);

    const handleApplySettingsClick = useCallback(() => {
        if (settingsLocked) {
            showNotification?.(t('settingsLockedNotice'), 'info');
            return;
        }
        if (!currentMeta || !onApplySettings) return;
        const snapshot = convertMetadataToViewerSnapshot(currentMeta);
        if (snapshot) {
            onApplySettings(snapshot);
        }
    }, [currentMeta, onApplySettings, settingsLocked, showNotification, t]);

    const handleApplyBothClick = useCallback(() => {
        if (!currentPrompt && !currentMeta) return;

        if (settingsLocked) {
            showNotification?.(t('settingsLockedNotice'), 'info');
            // If settings locked, only apply prompt
            if (currentPrompt && onApplyPrompt) {
                onApplyPrompt(currentPrompt);
            }
            onClose();
            return;
        }

        const snapshot = currentMeta ? convertMetadataToViewerSnapshot(currentMeta) : null;
        if (onApplyBoth && currentPrompt && snapshot) {
            onApplyBoth(currentPrompt, snapshot);
        } else {
            if (currentPrompt && onApplyPrompt) {
                onApplyPrompt(currentPrompt);
            }
            if (snapshot && onApplySettings) {
                onApplySettings(snapshot);
            }
        }
        onClose();
    }, [
        currentMeta,
        currentPrompt,
        onApplyBoth,
        onApplyPrompt,
        onApplySettings,
        onClose,
        settingsLocked,
        showNotification,
        t,
    ]);

    if (!isOpen) {
        return null;
    }

    return (
        <WorkspaceSupportDetailSurface
            dataTestId="metadata-viewer-drawer"
            title={labels.title}
            closeLabel={t('workspaceViewerClose') || '關閉'}
            onClose={onClose}
            desktopWidthClass="max-w-[920px]"
        >
            <div className="flex h-full flex-col gap-4 p-4 text-slate-800 dark:text-slate-100">
                {/* Drop Zone */}
                <div
                    data-testid="metadata-viewer-dropzone"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`cursor-pointer rounded-2xl border-2 border-dashed p-4 text-center transition-all ${
                        isDragging
                            ? 'border-amber-400 bg-amber-400/10'
                            : 'border-slate-300 bg-slate-50/60 hover:border-amber-400 hover:bg-amber-400/5 dark:border-slate-700 dark:bg-slate-800/40'
                    }`}
                >
                    <input
                        id={fileInputId}
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,.png,.jpg,.jpeg,.json"
                        multiple
                        className="hidden"
                        onChange={handleFileInputChange}
                    />
                    <div className="text-2xl">🖼️</div>
                    <div className="text-sm font-semibold">{labels.dropPrompt}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{labels.dropSubtext}</div>
                </div>

                {loadedImages.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-slate-400">
                        {labels.noImages}
                    </div>
                ) : (
                    <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto lg:grid-cols-2">
                        {/* Left column: Preview & Filmstrip */}
                        <div className="flex flex-col items-center gap-3">
                            {currentItem && (
                                <div className="flex max-h-[460px] w-full items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-900/40 p-2 shadow-inner dark:border-slate-800">
                                    <img
                                        key={currentItem.url}
                                        data-testid="metadata-viewer-preview-image"
                                        src={currentItem.url}
                                        alt={currentItem.name}
                                        className="max-h-[440px] max-w-full rounded-lg object-contain"
                                        onError={(e) => {
                                            (e.currentTarget as HTMLElement).style.display = 'none';
                                        }}
                                    />
                                </div>
                            )}

                            {/* Filmstrip if multiple images */}
                            {loadedImages.length > 1 && (
                                <div
                                    data-testid="metadata-viewer-filmstrip"
                                    className="flex w-full gap-2 overflow-x-auto p-1"
                                >
                                    {loadedImages.map((img, idx) => {
                                        const isActive = idx === currentIndex;
                                        return (
                                            <button
                                                key={`${img.name}-${idx}`}
                                                type="button"
                                                onClick={() => setCurrentIndex(idx)}
                                                className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                                                    isActive
                                                        ? 'border-amber-400 scale-105 shadow-md'
                                                        : 'border-transparent opacity-60 hover:opacity-100'
                                                }`}
                                            >
                                                <img
                                                    src={img.url}
                                                    alt={img.name}
                                                    className="h-full w-full object-cover"
                                                    onError={(e) => {
                                                        (e.currentTarget as HTMLElement).style.opacity = '0.3';
                                                    }}
                                                />
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Right column: Prompt, Actions & Parameters */}
                        <div className="flex flex-col gap-3">
                            {/* Actions Header Bar */}
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    data-testid="metadata-viewer-apply-both"
                                    onClick={handleApplyBothClick}
                                    disabled={!currentPrompt && !currentMeta}
                                    className="nbu-control-button flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 shadow-sm transition-all hover:brightness-105 disabled:opacity-40"
                                >
                                    <span>✨</span>
                                    <span>{labels.applyBoth}</span>
                                </button>
                                <button
                                    type="button"
                                    data-testid="metadata-viewer-apply-prompt"
                                    onClick={handleApplyPromptClick}
                                    disabled={!currentPrompt}
                                    className="nbu-control-button rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                                >
                                    {t('workspaceViewerApplyPrompt')}
                                </button>
                                <button
                                    type="button"
                                    data-testid="metadata-viewer-apply-settings"
                                    onClick={handleApplySettingsClick}
                                    disabled={!currentMeta}
                                    className="nbu-control-button rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                                >
                                    {t('workspaceViewerApplySettings')}
                                </button>
                            </div>

                            {/* Prompt Card */}
                            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
                                <div className="mb-2 flex items-center justify-between">
                                    <span className="text-xs font-bold text-amber-500">
                                        {t('workspaceViewerPrompt') || '提示詞'}
                                    </span>
                                    <button
                                        type="button"
                                        data-testid="metadata-viewer-copy-prompt"
                                        onClick={handleCopyPrompt}
                                        disabled={!currentPrompt}
                                        className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-40 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                                    >
                                        {copied ? `✓ ${labels.copied}` : labels.copyPrompt}
                                    </button>
                                </div>
                                <div className="max-h-36 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-2 text-xs text-slate-800 dark:bg-slate-950/60 dark:text-slate-200">
                                    {currentPrompt || '(無設定提示詞)'}
                                </div>
                            </div>

                            {/* Parameters Card */}
                            {currentMeta && (
                                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
                                    <div className="mb-2 text-xs font-bold text-amber-500">{labels.title}</div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        {currentMeta.model && (
                                            <div className="rounded bg-slate-50 p-1.5 dark:bg-slate-950/50">
                                                <div className="text-[10px] text-slate-500">{labels.model}</div>
                                                <div className="font-semibold">{currentMeta.model}</div>
                                            </div>
                                        )}
                                        {currentMeta.style && (
                                            <div className="rounded bg-slate-50 p-1.5 dark:bg-slate-950/50">
                                                <div className="text-[10px] text-slate-500">{labels.style}</div>
                                                <div className="font-semibold">{currentMeta.style}</div>
                                            </div>
                                        )}
                                        {currentMeta.aspectRatio && (
                                            <div className="rounded bg-slate-50 p-1.5 dark:bg-slate-950/50">
                                                <div className="text-[10px] text-slate-500">{labels.aspectRatio}</div>
                                                <div className="font-semibold">{currentMeta.aspectRatio}</div>
                                            </div>
                                        )}
                                        {(currentMeta.size || currentMeta.requestedImageSize) && (
                                            <div className="rounded bg-slate-50 p-1.5 dark:bg-slate-950/50">
                                                <div className="text-[10px] text-slate-500">{labels.size}</div>
                                                <div className="font-semibold">
                                                    {currentMeta.size || currentMeta.requestedImageSize}
                                                </div>
                                            </div>
                                        )}
                                        {currentMeta.temperature !== undefined && (
                                            <div className="rounded bg-slate-50 p-1.5 dark:bg-slate-950/50">
                                                <div className="text-[10px] text-slate-500">{labels.temperature}</div>
                                                <div className="font-semibold">{currentMeta.temperature}</div>
                                            </div>
                                        )}
                                        {currentMeta.thinkingLevel && (
                                            <div className="rounded bg-slate-50 p-1.5 dark:bg-slate-950/50">
                                                <div className="text-[10px] text-slate-500">{labels.thinkingLevel}</div>
                                                <div className="font-semibold">{currentMeta.thinkingLevel}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Model text response or thoughts if present */}
                            {currentMeta?.text && (
                                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
                                    <div className="mb-1 text-xs font-bold text-slate-600 dark:text-slate-300">
                                        Model Response
                                    </div>
                                    <div className="max-h-24 overflow-y-auto whitespace-pre-wrap rounded bg-slate-50 p-2 text-xs text-slate-700 dark:bg-slate-950/60 dark:text-slate-300">
                                        {currentMeta.text}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </WorkspaceSupportDetailSurface>
    );
}
