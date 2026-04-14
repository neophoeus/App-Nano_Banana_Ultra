import React, { useCallback, useEffect, useRef } from 'react';
import { type ModelCapability } from '../constants';
import { GroundingMode, OutputFormat, StructuredOutputMode, ThinkingLevel } from '../types';
import { getGroundingModeLabel } from '../utils/groundingMode';
import { getTranslation, Language } from '../utils/translations';

export type SurfaceSharedControlSheet =
    | 'prompt'
    | 'styles'
    | 'settings'
    | 'model'
    | 'ratio'
    | 'size'
    | 'batch'
    | 'references';

export type SurfaceSharedControlsVariant = 'full' | 'sketch';

type SurfaceSharedControlsProps = {
    currentLanguage: Language;
    activePickerSheet: SurfaceSharedControlSheet | null;
    isAdvancedSettingsOpen: boolean;
    totalReferenceCount: number;
    hasPrompt: boolean;
    capability: ModelCapability;
    availableGroundingModes: GroundingMode[];
    modelLabel: string;
    aspectRatio: string;
    imageSize: string;
    batchSize: number;
    objectImageCount: number;
    characterImageCount: number;
    maxObjects: number;
    maxCharacters: number;
    settingsVariant: SurfaceSharedControlsVariant;
    outputFormat: OutputFormat;
    structuredOutputMode: StructuredOutputMode;
    temperature: number;
    thinkingLevel: ThinkingLevel;
    includeThoughts: boolean;
    groundingMode: GroundingMode;
    containerClassName: string;
    containerStyle?: React.CSSProperties;
    onBottomOffsetChange?: (bottom: number) => void;
    onOpenSheet: (sheet: SurfaceSharedControlSheet) => void;
    onOpenAdvancedSettings: () => void;
};

type SheetButtonConfig = {
    id: string;
    title: string;
    summaryItems: Array<{
        id: string;
        label: string;
        value: string;
    }>;
    isActive: boolean;
    onClick: () => void;
    testId?: string;
};

const buildButtonClassName = (isActive: boolean) =>
    `${isActive ? 'rounded-xl border px-2.5 py-2 text-left transition-colors' : 'nbu-control-button rounded-xl px-2.5 py-2 text-left'} flex min-w-0 flex-col items-start gap-1.5 ${
        isActive
            ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200'
            : 'text-gray-800 dark:text-gray-100'
    }`;

const summaryChipClassName =
    'inline-flex max-w-full flex-wrap items-center gap-x-0.5 gap-y-0 rounded-full border border-slate-200/80 bg-white/88 px-2 py-px font-medium text-slate-700 dark:border-slate-700/80 dark:bg-slate-900/80 dark:text-slate-200';

const getSummaryModelLabel = (value: string) => value.replace(/\s*\([^)]*\)\s*$/, '').trim();

const SurfaceSharedControls: React.FC<SurfaceSharedControlsProps> = ({
    currentLanguage,
    activePickerSheet,
    isAdvancedSettingsOpen,
    totalReferenceCount,
    hasPrompt,
    capability,
    availableGroundingModes,
    modelLabel,
    aspectRatio,
    imageSize,
    batchSize,
    settingsVariant,
    outputFormat,
    structuredOutputMode,
    temperature,
    thinkingLevel,
    includeThoughts,
    groundingMode,
    containerClassName,
    containerStyle,
    onBottomOffsetChange,
    onOpenSheet,
    onOpenAdvancedSettings,
}) => {
    const t = (key: string) => getTranslation(currentLanguage, key);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const getStructuredOutputModeLabel = (value: StructuredOutputMode) => {
        switch (value) {
            case 'scene-brief':
                return t('structuredOutputModeSceneBrief');
            case 'prompt-kit':
                return t('structuredOutputModePromptKit');
            case 'quality-check':
                return t('structuredOutputModeQualityCheck');
            case 'shot-plan':
                return t('structuredOutputModeShotPlan');
            case 'delivery-brief':
                return t('structuredOutputModeDeliveryBrief');
            case 'revision-brief':
                return t('structuredOutputModeRevisionBrief');
            case 'variation-compare':
                return t('structuredOutputModeVariationCompare');
            default:
                return t('structuredOutputModeOff');
        }
    };
    const getOutputFormatLabel = (value: OutputFormat) =>
        value === 'images-and-text' ? 'Images & text' : 'Images only';
    const getThinkingLevelLabel = (value: ThinkingLevel) => {
        switch (value) {
            case 'minimal':
                return 'Minimal';
            case 'high':
                return 'High';
            default:
                return t('structuredOutputModeOff');
        }
    };
    const getGroundingLabel = (value: GroundingMode) => getGroundingModeLabel(value);
    const isSketchSurface = settingsVariant === 'sketch';
    const summaryModelLabel = getSummaryModelLabel(modelLabel);
    const supportsThinkingLevelControl = capability.thinkingLevels.some((value) => value !== 'disabled');
    const hasGroundingControl = availableGroundingModes.length > 1;
    const promptSummaryItems = [
        {
            id: 'prompt',
            label: t('promptLabel'),
            value: hasPrompt ? t('workspaceSurfaceReady') : t('workspaceSurfacePromptEmpty'),
        },
    ];
    const generationSummaryItems = [
        {
            id: 'model',
            label: t('workspaceSheetTitleModel'),
            value: summaryModelLabel,
        },
        {
            id: 'ratio',
            label: t('workspaceSheetTitleRatio'),
            value: aspectRatio,
        },
        {
            id: 'size',
            label: t('workspaceSheetTitleSize'),
            value: imageSize,
        },
        {
            id: 'quantity',
            label: t('batchSize'),
            value: String(batchSize),
        },
    ];
    const advancedSummaryItems = [
        ...(capability.outputFormats.length > 1
            ? [
                  {
                      id: 'output-format',
                      label: t('groundingProvenanceInsightOutputFormat'),
                      value: getOutputFormatLabel(outputFormat),
                  },
              ]
            : []),
        ...(capability.supportsStructuredOutputs && structuredOutputMode !== 'off'
            ? [
                  {
                      id: 'structured-output',
                      label: t('composerAdvancedStructuredOutput'),
                      value: getStructuredOutputModeLabel(structuredOutputMode),
                  },
              ]
            : []),
        ...(capability.supportsTemperature
            ? [
                  {
                      id: 'temperature',
                      label: t('groundingProvenanceInsightTemperature'),
                      value: temperature.toFixed(1),
                  },
              ]
            : []),
        ...(supportsThinkingLevelControl
            ? [
                  {
                      id: 'thinking-level',
                      label: t('groundingProvenanceInsightThinkingLevel'),
                      value: getThinkingLevelLabel(thinkingLevel),
                  },
              ]
            : []),
        ...(hasGroundingControl && groundingMode !== 'off'
            ? [
                  {
                      id: 'grounding',
                      label: t('groundingProvenanceInsightGrounding'),
                      value: getGroundingLabel(groundingMode),
                  },
              ]
            : []),
    ];
    const referenceSummaryItems = [
        {
            id: 'references',
            label: t('workspaceSheetTitleReferences'),
            value: String(totalReferenceCount),
        },
    ];

    const sheetButtons: SheetButtonConfig[] = isSketchSurface
        ? [
              {
                  id: 'model',
                  title: t('workspaceSheetTitleModel'),
                  summaryItems: [
                      {
                          id: 'model',
                          label: t('workspaceSheetTitleModel'),
                          value: summaryModelLabel,
                      },
                  ],
                  isActive: activePickerSheet === 'model',
                  onClick: () => onOpenSheet('model'),
                  testId: 'shared-control-model',
              },
              {
                  id: 'ratio',
                  title: t('workspaceSheetTitleRatio'),
                  summaryItems: [
                      {
                          id: 'ratio',
                          label: t('workspaceSheetTitleRatio'),
                          value: aspectRatio,
                      },
                  ],
                  isActive: activePickerSheet === 'ratio',
                  onClick: () => onOpenSheet('ratio'),
                  testId: 'shared-control-ratio',
              },
          ]
        : [
              {
                  id: 'prompt',
                  title: t('workspaceSheetTitlePrompt'),
                  summaryItems: promptSummaryItems,
                  isActive: activePickerSheet === 'prompt',
                  onClick: () => onOpenSheet('prompt'),
                  testId: 'shared-control-prompt',
              },
              {
                  id: 'settings',
                  title: t('workspaceSheetTitleGenerationSettings'),
                  summaryItems: generationSummaryItems,
                  isActive: activePickerSheet === 'settings',
                  onClick: () => onOpenSheet('settings'),
                  testId: 'shared-control-settings',
              },
              {
                  id: 'advanced-settings',
                  title: t('composerToolbarAdvancedSettings'),
                  summaryItems: advancedSummaryItems,
                  isActive: isAdvancedSettingsOpen,
                  onClick: onOpenAdvancedSettings,
                  testId: 'shared-control-advanced-settings',
              },
              {
                  id: 'references',
                  title: t('workspaceTopHeaderReferenceTray'),
                  summaryItems: referenceSummaryItems,
                  isActive: activePickerSheet === 'references',
                  onClick: () => onOpenSheet('references'),
                  testId: 'shared-control-references',
              },
          ];
    const layoutSignature = `${currentLanguage}:${settingsVariant}:${activePickerSheet ?? 'none'}:${
        isAdvancedSettingsOpen ? 'advanced' : 'base'
    }:${sheetButtons
        .map((button) => `${button.id}:${button.summaryItems.map((item) => `${item.id}:${item.value}`).join(',')}`)
        .join('|')}`;

    const reportBottomOffset = useCallback(() => {
        if (!onBottomOffsetChange || !containerRef.current || typeof window === 'undefined') {
            return;
        }

        onBottomOffsetChange(Math.round(containerRef.current.getBoundingClientRect().bottom));
    }, [onBottomOffsetChange]);

    useEffect(() => {
        if (!onBottomOffsetChange || typeof window === 'undefined') {
            return;
        }

        const element = containerRef.current;
        if (!element) {
            return;
        }

        let frameId: number | null = null;
        const scheduleReport = () => {
            if (frameId !== null) {
                window.cancelAnimationFrame(frameId);
            }

            frameId = window.requestAnimationFrame(() => {
                frameId = null;
                reportBottomOffset();
            });
        };

        let resizeObserver: ResizeObserver | null = null;
        if (typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(() => {
                scheduleReport();
            });
            resizeObserver.observe(element);
        }

        scheduleReport();
        window.addEventListener('resize', scheduleReport);

        return () => {
            if (frameId !== null) {
                window.cancelAnimationFrame(frameId);
            }
            resizeObserver?.disconnect();
            window.removeEventListener('resize', scheduleReport);
        };
    }, [layoutSignature, onBottomOffsetChange, reportBottomOffset]);

    return (
        <div ref={containerRef} className={containerClassName} style={containerStyle}>
            <div data-testid="shared-controls-panel" className="nbu-floating-panel w-[min(16rem,calc(100vw-2rem))] p-3">
                <div data-testid="shared-controls-toggle" className="flex min-w-0 items-center gap-2.5">
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
                        {t('surfaceSharedControlsBadge')}
                    </span>
                    <div className="min-w-0 text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {t('surfaceSharedControlsSettingsTitle')}
                    </div>
                </div>

                <div data-testid="shared-controls-actions" className="mt-2.5 flex flex-col gap-1.5">
                    {sheetButtons.map((button) => (
                        <button
                            key={button.id}
                            data-testid={button.testId}
                            onClick={button.onClick}
                            className={buildButtonClassName(button.isActive)}
                        >
                            <span className="block text-xs font-semibold leading-[13px]">{button.title}</span>
                            {button.summaryItems.length > 0 ? (
                                <span className="flex min-w-0 flex-wrap items-start gap-1 text-[10px] leading-3.5">
                                    {button.summaryItems.map((item) => (
                                        <span
                                            key={item.id}
                                            data-testid={`shared-controls-summary-item-${item.id}`}
                                            className={summaryChipClassName}
                                        >
                                            <span className="text-slate-500 dark:text-slate-400">{item.label}</span>
                                            <span className="text-slate-900 dark:text-slate-100">{item.value}</span>
                                        </span>
                                    ))}
                                </span>
                            ) : null}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SurfaceSharedControls;
