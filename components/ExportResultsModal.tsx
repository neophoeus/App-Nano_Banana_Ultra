import React, { useState, useMemo } from 'react';
import WorkspaceModalFrame from './WorkspaceModalFrame';
import { WORKSPACE_OVERLAY_Z_INDEX } from '../constants/workspaceOverlays';
import { GeneratedImage } from '../types';
import { exportWorkspaceResults, browseExportFolder } from '../services/geminiService';
import { buildSavedImageFilenameStem, buildResultPartFilenameStem } from '../utils/savedImageFilename';
import type { EmbeddedNanoBananaMeta } from '../plugins/utils/imageMetadataEmbedder';

export interface ExportResultsModalProps {
    isOpen: boolean;
    onClose: () => void;
    history: GeneratedImage[];
    t: (key: string) => string;
    showNotification?: (message: string, type?: 'info' | 'error') => void;
}

function normalizeExportSourceKey(rawUrlOrFilename: string): string {
    const trimmed = (rawUrlOrFilename || '').trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('data:')) return trimmed.slice(0, 128);
    const match = trimmed.match(/[?&]filename=([^&]+)/);
    if (match) return decodeURIComponent(match[1]).split(/[\\/]/).pop() || trimmed;
    return trimmed.split(/[\\/]/).pop() || trimmed;
}

function extractFilenameCandidate(rawUrlOrFilename: string): string {
    const trimmed = (rawUrlOrFilename || '').trim();
    if (!trimmed || trimmed.startsWith('data:')) return '';
    const match = trimmed.match(/[?&]filename=([^&]+)/);
    if (match) return decodeURIComponent(match[1]).split(/[\\/]/).pop() || '';
    return trimmed.split(/[\\/]/).pop() || '';
}

function resolveItemBaseFilename(options: {
    turn: GeneratedImage;
    turnMeta: Record<string, any>;
    rawUrlOrFilename: string;
    kind: 'main' | 'variant' | 'thought';
    sequence?: number;
    baseMainStem?: string;
}): string {
    const { turn, turnMeta, rawUrlOrFilename, kind, sequence = 1, baseMainStem } = options;
    const candidate = extractFilenameCandidate(rawUrlOrFilename);
    if (candidate && /\.(png|jpe?g|webp)$/i.test(candidate)) {
        return candidate.replace(/\.[^.]+$/, '');
    }

    const slotIndex = typeof turnMeta.batchResultIndex === 'number' ? turnMeta.batchResultIndex : 0;
    const createdAt = turn.createdAt ? new Date(turn.createdAt) : new Date();
    const requestId = turn.id || crypto.randomUUID();

    if (kind === 'main') {
        return buildSavedImageFilenameStem({
            model: turn.model || '',
            mode: turn.mode,
            slotIndex,
            createdAt,
            requestId,
        });
    }

    return buildResultPartFilenameStem({
        model: turn.model || '',
        mode: turn.mode,
        slotIndex,
        createdAt,
        requestId,
        sequence,
        sourceSavedFilename: baseMainStem,
    });
}

export default function ExportResultsModal({ isOpen, onClose, history, t, showNotification }: ExportResultsModalProps) {
    const [targetDir, setTargetDir] = useState('./export');
    const [includeThoughtImages, setIncludeThoughtImages] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isBrowsing, setIsBrowsing] = useState(false);
    const [exportStatus, setExportStatus] = useState<{
        exportedCount?: number;
        outputDir?: string;
        errors?: string[];
    } | null>(null);

    // Calculate exportable items
    const exportItems = useMemo(() => {
        const items: Array<{
            imageUrl: string;
            baseFilename: string;
            metadata: EmbeddedNanoBananaMeta;
        }> = [];
        const seenSources = new Set<string>();

        history.forEach((turn) => {
            if (turn.status === 'failed' && !turn.url && !turn.savedFilename) {
                return;
            }

            const turnAny = turn as any;
            const turnMeta = (turn.metadata || {}) as Record<string, any>;

            // 1. Main product image (exclude thumbnail)
            const mainUrl = turn.savedFilename || turn.url || turnAny.displayUrl;
            const mainKey = normalizeExportSourceKey(mainUrl);
            const baseMainStem = resolveItemBaseFilename({
                turn,
                turnMeta,
                rawUrlOrFilename: mainUrl,
                kind: 'main',
            });

            if (mainUrl && !mainUrl.includes('-thumbnail') && !seenSources.has(mainKey)) {
                seenSources.add(mainKey);
                items.push({
                    imageUrl: mainUrl,
                    baseFilename: baseMainStem,
                    metadata: {
                        id: turn.id,
                        prompt: turn.prompt || '',
                        model: turn.model || '',
                        aspectRatio: turn.aspectRatio || '',
                        size: turn.size || '',
                        style: turn.style || '',
                        mode: turn.mode || '',
                        executionMode: turn.executionMode || '',
                        lineageAction: turn.lineageAction,
                        outputFormat: turnMeta.outputFormat,
                        actualOutput: turnMeta.actualOutput
                            ? `${turnMeta.actualOutput.width}x${turnMeta.actualOutput.height}`
                            : undefined,
                        groundingMode: turnMeta.groundingMode,
                        groundingSources: turn.grounding?.sources,
                        sessionHints: turn.sessionHints,
                        temperature: turnAny.temperature ?? turnMeta.temperature,
                        thinkingLevel: turnAny.thinkingLevel ?? turnMeta.thinkingLevel,
                        includeThoughts: turnAny.includeThoughts ?? turnMeta.includeThoughts,
                        googleSearch: turnAny.googleSearch ?? turnMeta.googleSearch,
                        imageSearch: turnAny.imageSearch ?? turnMeta.imageSearch,
                        status: turn.status,
                        text: turn.text,
                        thoughts: turn.thoughts,
                        createdAt: turn.createdAt ? new Date(turn.createdAt).toISOString() : undefined,
                        exportSourceType: 'product',
                        parentHistoryId: turn.id,
                    },
                });
            }

            // 2. Variants (either in turn.variants or turn.resultParts with kind === 'output-image', EXCLUDING main image!)
            const rawVariantList: any[] = Array.isArray(turnAny.variants)
                ? turnAny.variants
                : turn.resultParts?.filter((p) => p.kind === 'output-image') || [];

            let variantIndexCounter = 0;
            rawVariantList.forEach((v: any) => {
                const vUrl = v.savedFilename || v.imageUrl || v.url || v.displayUrl;
                const vKey = normalizeExportSourceKey(vUrl);
                if (vUrl && !vUrl.includes('-thumbnail') && vKey !== mainKey && !seenSources.has(vKey)) {
                    seenSources.add(vKey);
                    variantIndexCounter += 1;
                    const vSequence = typeof v.sequence === 'number' ? v.sequence : variantIndexCounter;
                    const vBaseFilename = resolveItemBaseFilename({
                        turn,
                        turnMeta,
                        rawUrlOrFilename: vUrl,
                        kind: 'variant',
                        sequence: vSequence,
                        baseMainStem,
                    });
                    items.push({
                        imageUrl: vUrl,
                        baseFilename: vBaseFilename,
                        metadata: {
                            id: v.id || `${turn.id}_v${variantIndexCounter}`,
                            prompt: turn.prompt || '',
                            model: turn.model || '',
                            aspectRatio: turn.aspectRatio || '',
                            size: turn.size || '',
                            style: turn.style || '',
                            mode: turn.mode || '',
                            executionMode: turn.executionMode || '',
                            lineageAction: turn.lineageAction,
                            outputFormat: turnMeta.outputFormat,
                            groundingMode: turnMeta.groundingMode,
                            groundingSources: turn.grounding?.sources,
                            temperature: turnAny.temperature ?? turnMeta.temperature,
                            thinkingLevel: turnAny.thinkingLevel ?? turnMeta.thinkingLevel,
                            status: 'success',
                            text: turn.text,
                            thoughts: turn.thoughts,
                            createdAt: turn.createdAt ? new Date(turn.createdAt).toISOString() : undefined,
                            exportSourceType: 'variant',
                            parentHistoryId: turn.id,
                            variantIndex: variantIndexCounter - 1,
                        },
                    });
                }
            });

            // 3. Thought images (if enabled)
            if (includeThoughtImages) {
                const thoughtList: any[] = Array.isArray(turnAny.thoughtImages)
                    ? turnAny.thoughtImages
                    : turn.resultParts?.filter((p) => p.kind === 'thought-image') || [];

                let thoughtIndexCounter = 0;
                thoughtList.forEach((th: any) => {
                    const thUrl = th.savedFilename || th.imageUrl || th.url;
                    const thKey = normalizeExportSourceKey(thUrl);
                    if (thUrl && !thUrl.includes('-thumbnail') && !seenSources.has(thKey)) {
                        seenSources.add(thKey);
                        thoughtIndexCounter += 1;
                        const thSequence = typeof th.sequence === 'number' ? th.sequence : thoughtIndexCounter;
                        const thBaseFilename = resolveItemBaseFilename({
                            turn,
                            turnMeta,
                            rawUrlOrFilename: thUrl,
                            kind: 'thought',
                            sequence: thSequence,
                            baseMainStem,
                        });
                        items.push({
                            imageUrl: thUrl,
                            baseFilename: thBaseFilename,
                            metadata: {
                                id: th.id || `${turn.id}_thought${thoughtIndexCounter}`,
                                prompt: turn.prompt || '',
                                model: turn.model || '',
                                aspectRatio: turn.aspectRatio || '',
                                size: turn.size || '',
                                style: turn.style || '',
                                mode: turn.mode || '',
                                status: 'success',
                                createdAt: turn.createdAt ? new Date(turn.createdAt).toISOString() : undefined,
                                exportSourceType: 'thought',
                                parentHistoryId: turn.id,
                                thoughtIndex: thoughtIndexCounter - 1,
                            },
                        });
                    }
                });
            }
        });

        return items;
    }, [history, includeThoughtImages]);

    if (!isOpen) return null;

    const handleBrowseFolder = async () => {
        setIsBrowsing(true);
        try {
            const res = await browseExportFolder();
            if (!res.cancelled && res.path) {
                setTargetDir(res.path);
            }
        } catch (err) {
            console.error('Browse folder error:', err);
        } finally {
            setIsBrowsing(false);
        }
    };

    const handleStartExport = async () => {
        if (exportItems.length === 0) {
            showNotification?.(t('exportResultsEmptyNotice') || 'No generated images available to export.', 'info');
            return;
        }

        setIsExporting(true);
        setExportStatus(null);
        try {
            const res = await exportWorkspaceResults({
                targetDir: targetDir.trim() || './export',
                items: exportItems,
            });

            setExportStatus({
                exportedCount: res.exportedCount,
                outputDir: res.outputDir,
                errors: res.errors,
            });

            const successMsg = (
                t('exportResultsSuccessNotice') || 'Successfully exported {0} images with embedded metadata to {1}'
            )
                .replace('{0}', String(res.exportedCount))
                .replace('{1}', res.outputDir);
            showNotification?.(successMsg, 'info');

            if (res.success && (!res.errors || res.errors.length === 0)) {
                onClose();
            }
        } catch (err: any) {
            const failMsg = err?.message || 'Failed to export results.';
            showNotification?.(failMsg, 'error');
            setExportStatus({
                errors: [failMsg],
            });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <WorkspaceModalFrame
            dataTestId="export-results-modal"
            zIndex={WORKSPACE_OVERLAY_Z_INDEX.historyConfirm}
            maxWidthClass="max-w-md"
            onClose={onClose}
            closeLabel={t('clearHistoryCancel')}
            title={t('exportResultsTitle') || 'Export All Generated Results'}
            description={
                t('exportResultsDesc') ||
                'Extract generated images with embedded metadata into a dedicated folder, 100% compatible with Workspace Extractor.'
            }
            panelClassName="nbu-modal-shell"
            headerClassName="px-6 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800"
        >
            <div className="space-y-4 p-5 text-xs text-slate-700 dark:text-slate-300">
                {/* Target Directory Setting */}
                <div>
                    <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                        {t('exportResultsFolderLabel') || 'Export Destination Folder'}
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            data-testid="export-results-target-dir-input"
                            value={targetDir}
                            onChange={(e) => setTargetDir(e.target.value)}
                            disabled={isExporting}
                            placeholder="./export"
                            className="flex-1 rounded-xl border border-gray-200 bg-white px-3.5 py-2 font-mono text-xs text-slate-900 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                        <button
                            type="button"
                            data-testid="export-results-browse-btn"
                            onClick={handleBrowseFolder}
                            disabled={isExporting || isBrowsing}
                            className="rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 font-semibold text-slate-700 transition-colors hover:bg-white hover:border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                        >
                            {isBrowsing ? '...' : t('exportResultsBrowseBtn') || 'Browse...'}
                        </button>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                        {t('exportResultsFolderHint') ||
                            'Supports relative path (e.g. ./export) or absolute path (e.g. D:\\AI_Outputs).'}
                    </p>
                </div>

                {/* Options */}
                <div className="rounded-xl border border-gray-100 bg-slate-50/70 p-3.5 dark:border-slate-800/80 dark:bg-slate-900/40">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={includeThoughtImages}
                            onChange={(e) => setIncludeThoughtImages(e.target.checked)}
                            disabled={isExporting}
                            className="h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400 dark:border-slate-700 dark:bg-slate-800"
                        />
                        <div>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {t('exportResultsIncludeThoughts') || 'Include Thought Process Images'}
                            </span>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {t('exportResultsIncludeThoughtsDesc') ||
                                    'Export intermediate reasoning/draft images if available.'}
                            </p>
                        </div>
                    </label>
                </div>

                {/* Count summary preview */}
                <div className="flex items-center justify-between rounded-xl bg-amber-500/10 px-3.5 py-2.5 text-[11px] font-medium text-amber-900 dark:text-amber-200">
                    <span>{t('exportResultsEstimatedCount') || 'Images to Export'}:</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">{exportItems.length}</span>
                </div>

                {/* Progress / Status feedback */}
                {exportStatus && (
                    <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                        {exportStatus.exportedCount !== undefined && (
                            <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                                ✓{' '}
                                {(t('exportResultsSuccessCount') || 'Successfully exported {0} images').replace(
                                    '{0}',
                                    String(exportStatus.exportedCount),
                                )}
                            </p>
                        )}
                        {exportStatus.outputDir && (
                            <p className="mt-0.5 truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">
                                {exportStatus.outputDir}
                            </p>
                        )}
                        {exportStatus.errors && exportStatus.errors.length > 0 && (
                            <div className="mt-2 text-red-500 text-[11px]">
                                {exportStatus.errors.map((e, i) => (
                                    <p key={i}>• {e}</p>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex gap-2.5 border-t border-gray-100 bg-gray-50/80 p-3 dark:border-gray-800 dark:bg-gray-900/60">
                <button
                    type="button"
                    onClick={onClose}
                    disabled={isExporting}
                    className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                    {t('clearHistoryCancel')}
                </button>
                <button
                    type="button"
                    data-testid="export-results-confirm-btn"
                    onClick={handleStartExport}
                    disabled={isExporting || exportItems.length === 0}
                    className="flex-1 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-amber-500/20 transition-all hover:bg-amber-600 disabled:opacity-50"
                >
                    {isExporting
                        ? t('exportResultsRunning') || 'Exporting...'
                        : t('exportResultsConfirm') || 'Start Export'}
                </button>
            </div>
        </WorkspaceModalFrame>
    );
}
