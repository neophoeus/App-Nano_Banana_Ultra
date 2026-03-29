import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import SessionReplayDialog from '../components/SessionReplayDialog';
import { translations } from '../utils/translations';
import { encodeWorkflowMessage } from '../utils/workflowTimeline';

const translationTokenRegex = /\{\d+\}|\$\{[^}]+\}|%s|%d|\bhttps?:\/\/\S+|\n/g;

const collectTranslationTokens = (value: string): string[] => [...(value.match(translationTokenRegex) ?? [])].sort();

const collectMissingLocaleKeys = (baselineKeys: string[], localeKeys: string[]) =>
    baselineKeys.filter((key) => !localeKeys.includes(key));

const collectExtraLocaleKeys = (baselineKeys: string[], localeKeys: string[]) =>
    localeKeys.filter((key) => !baselineKeys.includes(key));

const workspaceFlowKeys = [
    'workspaceTopHeaderModel',
    'workspaceTopHeaderRatio',
    'workspaceTopHeaderSize',
    'workspaceTopHeaderQty',
    'workspaceTopHeaderReferenceTray',
    'workspaceTopHeaderObjectRefs',
    'workspaceTopHeaderCharacterRefs',
    'workspacePickerPromptHistoryTitle',
    'workspaceSheetTitleGallery',
    'workspaceImportReviewEyebrow',
    'workspaceImportReviewTitle',
    'workspaceImportReviewDesc',
    'workspaceImportReviewFile',
    'workspaceImportReviewTurns',
    'workspaceImportReviewBranches',
    'workspaceImportReviewStagedAssets',
    'workspaceImportReviewSnapshotSummary',
    'workspaceImportReviewViewerImages',
    'workspaceImportReviewNoPromptSaved',
    'workspaceImportReviewLatestTurn',
    'workspaceImportReviewNoTurnsSaved',
    'workspaceImportReviewMode',
    'workspaceImportReviewExecution',
    'workspaceImportReviewSessionContinuity',
    'workspaceImportReviewNotActive',
    'workspaceImportReviewProvenance',
    'workspaceImportReviewNoProvenance',
    'workspaceImportReviewBranchPreview',
    'workspaceImportReviewSource',
    'workspaceImportReviewCandidate',
    'workspaceImportReviewLatest',
    'workspaceImportReviewLatestId',
    'workspaceImportReviewOpenLatest',
    'workspaceImportReviewContinueLatest',
    'workspaceImportReviewBranchLatest',
    'workspaceImportReviewNoBranchLineage',
    'workspaceImportReviewDirectReplacePath',
    'workspaceImportReviewDirectReplaceTitle',
    'workspaceImportReviewChooseRoute',
    'workspaceImportReviewChooseRouteHint',
    'workspaceImportReviewHistoryRouteGroup',
    'workspaceImportReviewHistoryRouteHint',
    'workspaceImportReviewActiveRouteGroup',
    'workspaceImportReviewActiveRouteHint',
    'workspaceImportReviewReplaceOpenLatest',
    'workspaceImportReviewReplaceContinueLatest',
    'workspaceImportReviewReplaceBranchLatest',
    'workspaceImportReviewFooterHint',
    'workspaceImportReviewMergeTurnsOnly',
    'workspaceImportReviewReplaceCurrentWorkspace',
    'workspaceImportReviewExecutionBatchVariants',
    'workspaceImportReviewExecutionChatContinuation',
    'workspaceImportReviewExecutionQueuedBatchJob',
    'workspaceImportReviewExecutionSingleTurn',
    'sessionReplayEyebrow',
    'sessionReplayTitle',
    'sessionReplayEvents',
    'sessionReplayStages',
    'sessionReplayHistorySteps',
    'sessionReplayErrors',
    'sessionReplayFocus',
    'sessionReplayPrev',
    'sessionReplayNext',
    'sessionReplayCurrentStageSource',
    'sessionReplayStepCounter',
    'historyActionOpenInHistory',
    'historyActionOwnerRoute',
    'historyActionOwnerRouteHint',
    'sessionReplayNoTimestamp',
    'sessionReplayEmpty',
    'sessionReplayTimeline',
    'sessionReplayJumpToSource',
    'sessionReplayJumpToLatest',
    'sessionReplayNoTime',
    'sessionReplayLabelSystem',
    'sessionReplayLabelInput',
    'sessionReplayLabelRequest',
    'sessionReplayLabelProcessing',
    'sessionReplayLabelOutput',
    'sessionReplayLabelHistory',
    'sessionReplayLabelError',
    'sessionReplayLabelCancelled',
    'workspaceSnapshotImportedLog',
    'workspaceSnapshotMergedLog',
    'workspaceSnapshotExportedLog',
    'historySourceStartConversationLog',
    'historySourceVariantContinueLog',
    'historySourceContinueLog',
    'historySourceBranchLog',
    'historySourceReopenLog',
    'historySourceLoadedLog',
    'historySourceFailedLog',
] as const;

const shellClosureKeys = [
    'surfaceSharedControlsBadge',
    'surfaceSharedControlsOpen',
    'surfaceSharedControlsHide',
    'surfaceSharedControlsRefsCount',
    'surfaceSharedControlsStateTitle',
    'surfaceSharedControlsStateDesc',
    'surfaceSharedControlsCurrentPrompt',
    'surfaceSharedControlsPromptDetail',
    'surfaceSharedControlsQuantityDetail',
    'surfaceSharedControlsReferenceDetail',
    'surfaceSharedControlsActiveSheet',
    'surfaceSharedControlsWorkspace',
    'workspacePanelResponseEyebrow',
    'workspacePanelSourceTrailEyebrow',
    'stageGeneratedImageAlt',
    'stageOpenViewer',
] as const;

const workspacePanelLocalizationKeys = [
    'workspacePanelResultTextReady',
    'workspacePanelResultTextReserved',
    'workspaceConstraintTrimObjects',
    'workspaceConstraintTrimCharacters',
] as const;

const workspacePanelStatusKeys = [
    'workspacePanelStatusEnabled',
    'workspacePanelStatusPrepared',
    'workspacePanelStatusReserved',
] as const;

const loadingStateKeys = [
    'loadingActivityConsole',
    'loadingPrepareSketchPad',
    'loadingPrepareUltraEditor',
    'loadingStageSurface',
] as const;

const stageGroundingKeys = ['stageGroundingResultStatus', 'stageGroundingResultSummary'] as const;

const workspacePanelFallbackSensitiveKeys = [
    'workspacePanelResultTextReady',
    'workspacePanelResultTextReserved',
    'workspaceConstraintTrimObjects',
    'workspaceConstraintTrimCharacters',
] as const;

const workspacePanelStatusFallbackSensitiveKeys = [
    'workspacePanelStatusEnabled',
    'workspacePanelStatusPrepared',
    'workspacePanelStatusReserved',
] as const;

const loadingStateFallbackSensitiveKeys = [
    'loadingActivityConsole',
    'loadingPrepareSketchPad',
    'loadingPrepareUltraEditor',
    'loadingStageSurface',
] as const;

const stageGroundingFallbackSensitiveKeys = ['stageGroundingResultStatus', 'stageGroundingResultSummary'] as const;

const historyBranchLabelKeys = [
    'historyBranchAuto',
    'historyBranchRoot',
    'historyBranchTurns',
    'historyBranchUpdated',
    'historyBranchOrigin',
    'historyBranchLatest',
] as const;

const historyBranchLabelFallbackSensitiveKeys = [
    'historyBranchRoot',
    'historyBranchTurns',
    'historyBranchUpdated',
    'historyBranchOrigin',
    'historyBranchLatest',
] as const;

const sourceLineageLabelKeys = [
    'composerFollowUpSource',
    'workspaceSourceBadge',
    'historyBranchContinuationSource',
    'workspaceCurrentStageSourceNoLinkedHistory',
    'workspaceInsightsReplaySession',
] as const;

const sourceLineageLabelFallbackSensitiveKeys = [
    'composerFollowUpSource',
    'historyBranchContinuationSource',
    'workspaceCurrentStageSourceNoLinkedHistory',
    'workspaceInsightsReplaySession',
] as const;

const branchRenameDialogKeys = [
    'branchRenameEyebrow',
    'branchRenameTitle',
    'branchRenameClose',
    'branchRenameAutomaticLabel',
    'branchRenameDisplayName',
    'branchRenameUseAutomatic',
    'branchRenameSave',
    'branchRenameResetNotice',
    'branchRenameSavedNotice',
] as const;

const historyContinueStageKeys = [
    'historyContinueFromTurn',
    'historyContinuePromoteVariant',
    'historyContinueSourceActive',
] as const;

const historyStageNoticeKeys = ['followUpEditRequiresStageImage', 'editorBaseStageNotice'] as const;

const composerControlChromeKeys = [
    'composerToolbarExportWorkspace',
    'composerToolbarImportWorkspace',
    'composerToolbarAdvancedSettings',
    'composerEnterSends',
    'composerEnterNewline',
    'composerVisibilityVisible',
    'composerVisibilityHidden',
    'composerActionPanelEyebrow',
    'composerActionPanelTitle',
    'composerActionPanelDesc',
    'composerAdvancedEyebrow',
] as const;

const composerQueueBatchJobKey = ['composerQueueBatchJob'] as const;

const historyActionBadgeKeys = [
    'historyActionOpen',
    'historyActionBranch',
    'historyActionRename',
    'historyActionOpenLatest',
    'historyActionOpenOrigin',
    'historyActionBranchFromOrigin',
    'historyModeImage',
    'historyBadgeParent',
    'historyBadgeCandidate',
    'historyBadgeActive',
] as const;

const historyFilmstripKeys = [
    'historyFilmstripTitle',
    'historyFilmstripDesc',
    'historyFilmstripSummary',
    'historyFilmstripEmpty',
] as const;

const workspaceInsightsSidebarLabelKeys = [
    'workspaceInsightsEyebrow',
    'workspaceInsightsModelSettingsTitle',
    'workspaceInsightsPhaseLabel',
    'workspaceInsightsCurrentModel',
    'workspaceInsightsCurrentSettings',
    'workspaceInsightsReferences',
    'workspaceInsightsObjects',
    'workspaceInsightsCharacters',
    'workspaceInsightsRenameBranch',
    'workspaceInsightsActiveBranch',
    'workspaceInsightsBranchesCount',
    'workspaceInsightsSessionContinuity',
    'workspaceInsightsLatestResultText',
    'workspaceInsightsLatestThoughts',
    'workspaceInsightsProvenance',
] as const;

const workspaceInsightsStructuralKeys = [
    'workspaceInsightsBranchesEmpty',
    'workspaceInsightsNoContinuitySignals',
    'workspaceInsightsOfficialConversation',
    'workspaceInsightsConversationBranchActiveSource',
    'workspaceInsightsSessionSource',
    'workspaceInsightsSessionStateHint',
    'workspaceInsightsTitle',
    'workspaceInsightsStageSourceEmpty',
    'workspaceInsightsLatestResultTextEmpty',
    'workspaceInsightsSessionTurnStack',
    'workspaceInsightsTurnsCount',
    'workspaceInsightsSessionTurnStackEmpty',
    'workspaceInsightsLineageMap',
    'workspaceInsightsRootsCount',
    'workspaceInsightsRoot',
    'workspaceInsightsLineageEmpty',
    'workspaceInsightsTimelineTitle',
    'workspaceInsightsTimelineDesc',
    'workspaceInsightsTimelineEmpty',
    'workspaceInsightsOpenGallery',
    'workspaceInsightsOpenPromptHistory',
    'workspaceInsightsItemsCount',
    'workspaceInsightsSessionHintsEmpty',
] as const;

const branchRenameDialogFallbackSensitiveKeys = [
    'branchRenameEyebrow',
    'branchRenameTitle',
    'branchRenameClose',
    'branchRenameAutomaticLabel',
    'branchRenameDisplayName',
    'branchRenameUseAutomatic',
    'branchRenameSave',
    'branchRenameResetNotice',
    'branchRenameSavedNotice',
] as const;

const historyContinueStageFallbackSensitiveKeys = [
    'historyContinueFromTurn',
    'historyContinuePromoteVariant',
    'historyContinueSourceActive',
] as const;

const historyStageNoticeFallbackSensitiveKeys = ['followUpEditRequiresStageImage', 'editorBaseStageNotice'] as const;

const composerControlChromeFallbackSensitiveKeys = [
    'composerToolbarExportWorkspace',
    'composerToolbarImportWorkspace',
    'composerToolbarAdvancedSettings',
    'composerEnterSends',
    'composerEnterNewline',
    'composerVisibilityHidden',
    'composerActionPanelTitle',
    'composerActionPanelDesc',
    'composerAdvancedEyebrow',
] as const;

const composerQueueBatchJobFallbackSensitiveKeys = ['composerQueueBatchJob'] as const;

const phaseEGroup1ShellParityKeys = [
    'workspaceTopHeaderModel',
    'workspaceTopHeaderRatio',
    'workspaceTopHeaderSize',
    'workspaceTopHeaderQty',
    'workspaceTopHeaderReferenceTray',
    'workspaceTopHeaderObjectRefs',
    'workspaceTopHeaderCharacterRefs',
    'workspacePanelResponseEyebrow',
    'workspaceViewerResultText',
    'workspaceViewerStructuredOutput',
    'workspaceResponseRailStructuredOutputHint',
    'workspaceViewerThoughts',
    'workspaceInsightsLatestThoughts',
    'workspacePanelStatusEnabled',
    'workspacePanelStatusPrepared',
    'workspacePanelStatusReserved',
] as const;

const phaseEGroup2ShellParityKeys = [
    'composerToolbarExportWorkspace',
    'composerToolbarImportWorkspace',
    'composerToolbarAdvancedSettings',
    'composerEnterSends',
    'composerEnterNewline',
    'composerVisibilityVisible',
    'composerVisibilityHidden',
    'composerActionPanelEyebrow',
    'composerActionPanelTitle',
    'composerActionPanelDesc',
    'composerAdvancedEyebrow',
    'composerAdvancedTitle',
    'composerAdvancedDesc',
    'composerDefaultTemp',
    'composerAdvancedGenerationSectionTitle',
    'composerAdvancedGenerationSectionDesc',
    'composerAdvancedStructuredOutput',
    'composerAdvancedStructuredOutputDesc',
    'composerAdvancedStructuredOutputGuideBestForLabel',
    'composerAdvancedStructuredOutputGuideFieldsLabel',
    'composerAdvancedStructuredOutputGuideExampleLabel',
    'structuredOutputPromptReady',
    'structuredOutputPromptReadyHintRevisionBrief',
    'structuredOutputPromptReadyHintVariationCompare',
    'composerAdvancedReturnThoughtsDesc',
    'composerAdvancedGroundingSectionTitle',
    'composerAdvancedGroundingSectionDesc',
    'composerAdvancedGroundingMode',
    'composerAdvancedGroundingDesc',
    'composerAdvancedGroundingResolutionWarningFlashImageSearch',
    'composerAdvancedGroundingGuideTitle',
    'composerAdvancedGroundingGuideDesc',
    'composerAdvancedGroundingGuideFlashGoogle',
    'composerAdvancedGroundingGuideFlashImage',
    'composerAdvancedGroundingGuideProGoogle',
    'composerQueueBatchJob',
    'queuedBatchJobsTitle',
    'queuedBatchJobsWorkflowHint',
    'queuedBatchJobsConversationNoticeLabel',
    'queueBatchModeEditor',
    'queueBatchModeStage',
    'queueBatchModeReferences',
    'queueBatchModePromptOnly',
    'queueBatchConversationNotice',
    'structuredOutputModeOff',
    'structuredOutputModeSceneBrief',
    'structuredOutputModePromptKit',
    'structuredOutputModeQualityCheck',
    'structuredOutputModeShotPlan',
    'structuredOutputModeDeliveryBrief',
    'structuredOutputModeRevisionBrief',
    'structuredOutputModeVariationCompare',
    'composerAdvancedStructuredOutputGuideOff',
    'composerAdvancedStructuredOutputGuideSceneBrief',
    'composerAdvancedStructuredOutputGuidePromptKit',
    'composerAdvancedStructuredOutputGuideQualityCheck',
    'composerAdvancedStructuredOutputGuideShotPlan',
    'composerAdvancedStructuredOutputGuideDeliveryBrief',
    'composerAdvancedStructuredOutputGuideRevisionBrief',
    'composerAdvancedStructuredOutputGuideVariationCompare',
    'composerAdvancedStructuredOutputGuideBestForSceneBrief',
    'composerAdvancedStructuredOutputGuideBestForPromptKit',
    'composerAdvancedStructuredOutputGuideBestForQualityCheck',
    'composerAdvancedStructuredOutputGuideBestForShotPlan',
    'composerAdvancedStructuredOutputGuideBestForDeliveryBrief',
    'composerAdvancedStructuredOutputGuideBestForRevisionBrief',
    'composerAdvancedStructuredOutputGuideBestForVariationCompare',
    'composerAdvancedStructuredOutputGuideAvoidWhenSceneBrief',
    'composerAdvancedStructuredOutputGuideAvoidWhenPromptKit',
    'composerAdvancedStructuredOutputGuideAvoidWhenQualityCheck',
    'composerAdvancedStructuredOutputGuideAvoidWhenShotPlan',
    'composerAdvancedStructuredOutputGuideAvoidWhenDeliveryBrief',
    'composerAdvancedStructuredOutputGuideAvoidWhenRevisionBrief',
    'composerAdvancedStructuredOutputGuideAvoidWhenVariationCompare',
] as const;

const phaseEGroup3ShellParityKeys = [
    'composerActionPanelEyebrow',
    'workspacePickerStageSource',
    'workspacePickerStageSourceHint',
    'workspacePickerEditorBase',
    'workspacePickerEditorBaseHint',
    'workspaceViewerEditCurrentImage',
    'workspaceViewerContinueEditing',
    'workspaceViewerUploadBaseToEdit',
    'surfaceSharedControlsReferenceDetail',
    'stageOriginNotStaged',
    'stageOriginUpload',
    'stageOriginSketch',
    'stageOriginGenerated',
    'stageOriginHistory',
    'stageOriginEditor',
    'workspacePickerUploadBaseImage',
    'workspacePickerOpenSketchPad',
    'workspacePickerObjects',
    'workspacePickerCharacters',
    'workspacePickerHasSketchAsset',
    'workspacePickerNoSketchAsset',
    'editorTitle',
    'editorDiscard',
    'editorDiscardMsg',
    'editorKeep',
    'editorYesDiscard',
    'editorSwitchTitle',
    'editorSwitchBtn',
    'editorErrorTitle',
    'editorErrorRetry',
    'editorErrorReturn',
    'btnRender',
    'btnReset',
    'btnFit',
    'btnFill',
    'btnAlignTop',
    'btnAlignBottom',
    'btnAlignLeft',
    'btnAlignRight',
    'warningSwitchMode',
    'warningResized4K',
    'modeInpaint',
    'modeOutpaint',
    'toolUndo',
    'toolRedo',
    'toolSize',
    'toolZoom',
    'toolText',
    'toolPan',
    'toolMask',
    'toolDoodle',
    'toolPen',
    'statusProcessing',
    'sketchExitTitle',
] as const;

const historyActionBadgeFallbackSensitiveKeys = [
    'historyActionOpen',
    'historyActionBranch',
    'historyActionRename',
    'historyActionOpenLatest',
    'historyActionOpenOrigin',
    'historyActionBranchFromOrigin',
] as const;

const historyFilmstripFallbackSensitiveKeys = [
    'historyFilmstripTitle',
    'historyFilmstripDesc',
    'historyFilmstripSummary',
    'historyFilmstripEmpty',
] as const;

const workspaceSideToolFallbackSensitiveKeys = [
    'workspaceSideToolTitle',
    'workspaceSideToolCurrentImage',
    'workspaceSideToolBaseImage',
] as const;

const workspaceInsightsSidebarLabelFallbackSensitiveKeys = [
    'workspaceInsightsEyebrow',
    'workspaceInsightsCurrentWork',
    'workspaceInsightsSourcesCitations',
    'workspaceInsightsActivity',
    'workspaceInsightsModelSettingsTitle',
    'workspaceInsightsPhaseLabel',
    'workspaceInsightsCurrentModel',
    'workspaceInsightsCurrentSettings',
    'workspaceInsightsReferences',
    'workspaceInsightsObjects',
    'workspaceInsightsCharacters',
    'workspaceInsightsRenameBranch',
    'workspaceInsightsActiveBranch',
    'workspaceInsightsBranchesCount',
    'workspaceInsightsSessionContinuity',
    'workspaceInsightsLatestResultText',
    'workspaceInsightsLatestThoughts',
    'workspaceInsightsProvenance',
] as const;

const workspaceInsightsStructuralFallbackSensitiveKeys = [
    'workspaceInsightsBranchesEmpty',
    'workspaceInsightsNoContinuitySignals',
    'workspaceInsightsOfficialConversation',
    'workspaceInsightsConversationBranchActiveSource',
    'workspaceInsightsSessionSource',
    'workspaceInsightsSessionStateHint',
    'workspaceInsightsTitle',
    'workspaceInsightsStageSourceEmpty',
    'workspaceInsightsLatestResultTextEmpty',
    'workspaceInsightsSessionTurnStack',
    'workspaceInsightsTurnsCount',
    'workspaceInsightsSessionTurnStackEmpty',
    'workspaceInsightsLineageMap',
    'workspaceInsightsRootsCount',
    'workspaceInsightsRoot',
    'workspaceInsightsLineageEmpty',
    'workspaceInsightsTimelineTitle',
    'workspaceInsightsTimelineDesc',
    'workspaceInsightsTimelineEmpty',
    'workspaceInsightsOpenGallery',
    'workspaceInsightsOpenPromptHistory',
    'workspaceInsightsItemsCount',
    'workspaceInsightsSessionHintsEmpty',
] as const;

const provenancePolishKeys = [
    'workspaceInsightsContinuitySourceTurn',
    'workspaceInsightsContinuitySourceGenerated',
    'workspaceInsightsContinuitySourceHistory',
    'workspaceInsightsContinuitySourceFollowUp',
    'workspaceInsightsContinuityHistoryLinked',
    'workspaceInsightsContinuityOfficialChat',
    'workspaceInsightsContinuityChatTurns',
    'workspaceInsightsContinuityProvenanceInherited',
    'workspaceInsightsContinuityProvenanceLive',
    'workspaceInsightsContinuityThoughtSignature',
    'workspaceInsightsContinuityGroundingMetadata',
    'workspaceInsightsContinuityGroundingSupports',
] as const;

const groundingProvenanceSummaryKeys = [
    'groundingProvenanceNoActiveSessionTurn',
    'groundingProvenanceInsightOutputFormat',
    'groundingProvenanceInsightTemperature',
    'groundingProvenanceInsightThinkingLevel',
    'groundingProvenanceInsightReturnThoughts',
    'groundingProvenanceInsightGrounding',
    'groundingProvenanceInsightRequestedSize',
    'groundingProvenanceInsightActualOutput',
    'groundingProvenanceCitedDetail',
    'groundingProvenanceSources',
    'groundingProvenanceReferenceSource',
    'groundingProvenanceReuseSupportBundle',
    'groundingProvenanceReuseSource',
    'groundingProvenanceReuseDetail',
    'groundingProvenanceSelectFirst',
    'groundingProvenanceReferenceCue',
    'groundingProvenanceAppendNotice',
    'groundingProvenanceAppendLog',
    'groundingProvenanceReplaceNotice',
    'groundingProvenanceReplaceLog',
    'groundingProvenanceThoughtVisible',
    'groundingProvenanceThoughtHiddenSignature',
    'groundingProvenanceThoughtRequestedNone',
    'groundingProvenanceThoughtNotRequested',
    'groundingProvenanceGroundingSourcesReturned',
    'groundingProvenanceGroundingQueriesNoSources',
    'groundingProvenanceGroundingMetadataNoSources',
    'groundingProvenanceGroundingRequestedNone',
    'groundingProvenanceGroundingNotRequested',
    'groundingProvenanceSupportBundlesUsed',
    'groundingProvenanceSupportMetadataNoBundles',
    'groundingProvenanceSupportNone',
    'groundingProvenanceSummaryMode',
    'groundingProvenanceSummarySourceTurn',
    'groundingProvenanceSummarySources',
    'groundingProvenanceSummarySupportBundles',
    'groundingProvenanceContinuityInherited',
    'groundingProvenanceContinuityLive',
    'groundingProvenanceContinuityInactive',
    'groundingProvenanceModeInherited',
    'groundingProvenanceModeLive',
    'groundingProvenanceModeInactive',
    'groundingProvenanceNone',
    'groundingProvenanceSelectionBundle',
    'groundingProvenanceSelectionSource',
    'groundingProvenanceSelectionNone',
] as const;

const groundingProvenanceFallbackSensitiveKeys = [
    'groundingProvenanceNoActiveSessionTurn',
    'groundingProvenanceInsightGrounding',
    'groundingProvenanceInsightRequestedSize',
    'groundingProvenanceInsightActualOutput',
    'groundingProvenanceCitedDetail',
    'groundingProvenanceSources',
    'groundingProvenanceReferenceSource',
    'groundingProvenanceReuseSupportBundle',
    'groundingProvenanceReuseSource',
    'groundingProvenanceReuseDetail',
    'groundingProvenanceSelectFirst',
    'groundingProvenanceReferenceCue',
    'groundingProvenanceAppendNotice',
    'groundingProvenanceAppendLog',
    'groundingProvenanceReplaceNotice',
    'groundingProvenanceReplaceLog',
    'groundingProvenanceThoughtVisible',
    'groundingProvenanceThoughtHiddenSignature',
    'groundingProvenanceThoughtRequestedNone',
    'groundingProvenanceThoughtNotRequested',
    'groundingProvenanceGroundingSourcesReturned',
    'groundingProvenanceGroundingQueriesNoSources',
    'groundingProvenanceGroundingMetadataNoSources',
    'groundingProvenanceGroundingRequestedNone',
    'groundingProvenanceGroundingNotRequested',
    'groundingProvenanceSupportBundlesUsed',
    'groundingProvenanceSupportMetadataNoBundles',
    'groundingProvenanceSupportNone',
    'groundingProvenanceSummarySourceTurn',
    'groundingProvenanceSummarySupportBundles',
    'groundingProvenanceContinuityInherited',
    'groundingProvenanceContinuityLive',
    'groundingProvenanceContinuityInactive',
    'groundingProvenanceModeInherited',
    'groundingProvenanceModeLive',
    'groundingProvenanceModeInactive',
    'groundingProvenanceNone',
    'groundingProvenanceSelectionBundle',
    'groundingProvenanceSelectionSource',
    'groundingProvenanceSelectionNone',
] as const;

const groundingPanelLocalizationKeys = [
    'provenanceCarryForwardLog',
    'groundingPanelContinuitySummary',
    'groundingPanelAttributionOverview',
    'groundingPanelAttributionCoverage',
    'groundingPanelAttributionCoverageValue',
    'groundingPanelAttributionSourceMix',
    'groundingPanelAttributionQueries',
    'groundingPanelAttributionEntryPoint',
    'groundingPanelAttributionEntryPointRendered',
    'groundingPanelAttributionEntryPointAvailable',
    'groundingPanelAttributionEntryPointNotReturned',
    'groundingPanelAttributionEntryPointNotRequested',
    'groundingPanelAttributionSourceTypeWeb',
    'groundingPanelAttributionSourceTypeImage',
    'groundingPanelAttributionSourceTypeContext',
    'groundingPanelAttributionWebQueries',
    'groundingPanelAttributionImageQueries',
    'groundingPanelAttributionNoSources',
    'groundingPanelAttributionNoSourcesToCompare',
    'groundingPanelAttributionNoQueriesShort',
    'groundingPanelAttributionEntryPointStatus',
    'groundingPanelAttributionSourceStatus',
    'groundingPanelAttributionSourceStatusValue',
    'groundingPanelAttributionStatus',
    'groundingPanelUncitedSourcesSection',
    'groundingPanelUncitedSourcesHint',
    'groundingPanelProvenanceSource',
    'groundingPanelCitationDetail',
    'groundingPanelEmptyDetail',
    'groundingPanelSourcesSection',
    'groundingPanelCoverageSection',
    'groundingPanelQueriesSection',
    'groundingPanelNoQueries',
    'groundingPanelSearchEntryPoint',
    'groundingPanelSelectedSourceState',
    'groundingPanelCoveredBySelectedBundleState',
    'groundingPanelSourceStatusCited',
    'groundingPanelSourceStatusRetrievedOnly',
    'groundingPanelSourceIndex',
    'groundingPanelOpenSource',
    'groundingPanelSupportBundleTitle',
    'groundingPanelSourcesCount',
    'groundingPanelChunksMeta',
    'groundingPanelFocusState',
    'groundingPanelFullContextState',
    'groundingPanelShowAllItems',
    'groundingPanelFocusLinkedItems',
    'groundingPanelClearSelection',
    'groundingPanelSelectedSource',
    'groundingPanelAppendPrompt',
    'groundingPanelReplacePrompt',
    'groundingPanelReusePreview',
    'groundingPanelReuseAppendPreview',
    'groundingPanelReuseReplacePreview',
    'groundingPanelReuseCurrentPromptLabel',
    'groundingPanelReuseAddedCueLabel',
    'groundingPanelReuseAppendImpactKeep',
    'groundingPanelReuseAppendImpactEmpty',
    'groundingPanelReuseReplaceImpact',
    'groundingPanelReusePreviewHint',
    'groundingPanelCitedSegments',
    'groundingPanelNoBundleSegmentText',
    'groundingPanelInspectBundle',
    'groundingPanelNoBundleCitesSource',
    'groundingPanelSourceCitationCount',
    'groundingPanelSourceCompareSummaryCited',
    'groundingPanelSourceCompareSummaryUncited',
    'groundingPanelSelectedBundle',
    'groundingPanelSelectedBundleMeta',
    'groundingPanelCitedSourcesCount',
    'groundingPanelLinkedSources',
    'groundingPanelCompareStateLinked',
    'groundingPanelCompareStateOutside',
    'groundingPanelBundleCompareSummary',
    'groundingPanelBundleCompareOtherSources',
    'groundingPanelOtherRetrievedSources',
    'groundingPanelInspectSource',
    'groundingPanelNoLinkedSourcesForBundle',
    'groundingPanelNoOtherSourcesForBundle',
    'groundingPanelNoLinkedSourcesForSelection',
    'groundingPanelNoLinkedBundlesForSelection',
] as const;

const groundingPanelFallbackSensitiveKeys = [
    'provenanceCarryForwardLog',
    'groundingPanelContinuitySummary',
    'groundingPanelAttributionOverview',
    'groundingPanelAttributionCoverage',
    'groundingPanelAttributionCoverageValue',
    'groundingPanelAttributionSourceMix',
    'groundingPanelAttributionQueries',
    'groundingPanelAttributionEntryPoint',
    'groundingPanelAttributionEntryPointRendered',
    'groundingPanelAttributionEntryPointAvailable',
    'groundingPanelAttributionEntryPointNotReturned',
    'groundingPanelAttributionEntryPointNotRequested',
    'groundingPanelAttributionSourceTypeContext',
    'groundingPanelAttributionNoSources',
    'groundingPanelAttributionNoSourcesToCompare',
    'groundingPanelAttributionNoQueriesShort',
    'groundingPanelAttributionEntryPointStatus',
    'groundingPanelAttributionSourceStatus',
    'groundingPanelAttributionSourceStatusValue',
    'groundingPanelAttributionStatus',
    'groundingPanelUncitedSourcesSection',
    'groundingPanelUncitedSourcesHint',
    'groundingPanelProvenanceSource',
    'groundingPanelCitationDetail',
    'groundingPanelEmptyDetail',
    'groundingPanelNoQueries',
    'groundingPanelSearchEntryPoint',
    'groundingPanelSelectedSourceState',
    'groundingPanelCoveredBySelectedBundleState',
    'groundingPanelSourceStatusCited',
    'groundingPanelSourceStatusRetrievedOnly',
    'groundingPanelOpenSource',
    'groundingPanelSupportBundleTitle',
    'groundingPanelChunksMeta',
    'groundingPanelFocusState',
    'groundingPanelFullContextState',
    'groundingPanelShowAllItems',
    'groundingPanelFocusLinkedItems',
    'groundingPanelClearSelection',
    'groundingPanelAppendPrompt',
    'groundingPanelReplacePrompt',
    'groundingPanelReusePreview',
    'groundingPanelReuseAppendPreview',
    'groundingPanelReuseReplacePreview',
    'groundingPanelReuseCurrentPromptLabel',
    'groundingPanelReuseAddedCueLabel',
    'groundingPanelReuseAppendImpactKeep',
    'groundingPanelReuseAppendImpactEmpty',
    'groundingPanelReuseReplaceImpact',
    'groundingPanelReusePreviewHint',
    'groundingPanelCitedSegments',
    'groundingPanelNoBundleSegmentText',
    'groundingPanelInspectBundle',
    'groundingPanelNoBundleCitesSource',
    'groundingPanelSourceCitationCount',
    'groundingPanelSourceCompareSummaryCited',
    'groundingPanelSourceCompareSummaryUncited',
    'groundingPanelSelectedBundle',
    'groundingPanelSelectedBundleMeta',
    'groundingPanelCitedSourcesCount',
    'groundingPanelLinkedSources',
    'groundingPanelCompareStateLinked',
    'groundingPanelCompareStateOutside',
    'groundingPanelBundleCompareSummary',
    'groundingPanelBundleCompareOtherSources',
    'groundingPanelOtherRetrievedSources',
    'groundingPanelInspectSource',
    'groundingPanelNoLinkedSourcesForBundle',
    'groundingPanelNoOtherSourcesForBundle',
    'groundingPanelNoLinkedSourcesForSelection',
    'groundingPanelNoLinkedBundlesForSelection',
] as const;

const provenanceLocalizedLabelKeys = [
    'workspaceInsightsContinuityProvenanceInherited',
    'workspaceInsightsContinuityProvenanceLive',
    'workspaceInsightsContinuityThoughtSignature',
    'workspaceInsightsContinuityGroundingMetadata',
    'workspaceInsightsContinuityGroundingSupports',
] as const;

const continuityLocalizedTextKeys = [
    'workspaceInsightsContinuitySourceTurn',
    'workspaceInsightsContinuitySourceFollowUp',
    'workspaceInsightsContinuityChatTurns',
] as const;

const phaseEGroup4ShellParityKeys = [
    ...branchRenameDialogKeys,
    ...historyContinueStageKeys,
    ...historyStageNoticeKeys,
] as const;

const phaseEGroup5ShellParityKeys = [
    ...workspaceInsightsSidebarLabelKeys,
    ...workspaceInsightsStructuralKeys,
    ...provenancePolishKeys,
    ...groundingProvenanceSummaryKeys,
    ...groundingPanelLocalizationKeys,
] as const;

const phaseEGroup6ShellParityKeys = [...historyActionBadgeKeys, ...historyFilmstripKeys] as const;

const phaseEGroup7ShellParityKeys = [
    ...historyBranchLabelFallbackSensitiveKeys,
    ...sourceLineageLabelFallbackSensitiveKeys,
] as const;

const englishGroundingProvenanceBaseline = {
    groundingProvenanceNoActiveSessionTurn: 'No active session turn',
    groundingProvenanceInsightOutputFormat: 'Output format',
    groundingProvenanceInsightTemperature: 'Temperature',
    groundingProvenanceInsightThinkingLevel: 'Thinking level',
    groundingProvenanceInsightReturnThoughts: 'Return thoughts',
    groundingProvenanceInsightGrounding: 'Grounding',
    groundingProvenanceSummaryMode: 'Mode',
    groundingProvenanceSummarySourceTurn: 'Source turn',
    groundingProvenanceSummarySources: 'Sources',
    groundingProvenanceSummarySupportBundles: 'Support bundles',
    groundingProvenanceSelectionNone: 'Select a source or support bundle to inspect how grounding evidence connects.',
} as const;

const zhTwGroundingProvenancePolishBaseline = {
    groundingProvenanceNoActiveSessionTurn: '目前沒有啟用中的工作階段回合',
    groundingProvenanceInsightReturnThoughts: '回傳思考內容',
    groundingProvenanceSummarySourceTurn: '來源回合',
    groundingProvenanceSelectionNone: '選擇來源或支援組合來檢查脈絡證據如何連接。',
    composerFollowUpSource: '延續來源',
} as const;

const zhCnGroundingProvenancePolishBaseline = {
    groundingProvenanceNoActiveSessionTurn: '当前没有活动中的会话回合',
    groundingProvenanceInsightReturnThoughts: '返回思考内容',
    groundingProvenanceSummarySourceTurn: '来源回合',
    groundingProvenanceSelectionNone: '选择来源或支持组合来查看脉络证据如何关联。',
    composerFollowUpSource: '延续来源',
} as const;

const zhTwGroundingProvenanceLongformBaseline = {
    groundingProvenanceThoughtVisible: '這個結果回傳了可見的思考內容。',
    groundingProvenanceThoughtHiddenSignature: '這個結果帶有隱藏的思考簽章，但沒有可見的思考文字。',
    groundingProvenanceThoughtRequestedNone: '雖然有要求思考內容，但模型沒有為這個結果回傳思考產物。',
    groundingProvenanceThoughtNotRequested: '這個結果沒有要求思考內容。',
    groundingProvenanceGroundingSourcesReturned: '這個結果回傳了脈絡來源。',
    groundingProvenanceGroundingQueriesNoSources: '這個結果發出了脈絡查詢，但沒有回傳可歸屬的來源。',
    groundingProvenanceGroundingMetadataNoSources: '這個結果回傳了脈絡中繼資料，但沒有公開任何來源連結。',
    groundingProvenanceGroundingRequestedNone: '這個結果有要求脈絡依據，但沒有回傳任何脈絡中繼資料。',
    groundingProvenanceGroundingNotRequested: '這個結果沒有要求脈絡依據。',
    groundingProvenanceSupportBundlesUsed: '脈絡支援組合會顯示哪些擷取到的來源實際被使用。',
    groundingProvenanceSupportMetadataNoBundles: '有回傳脈絡支援中繼資料，但沒有擷取出可顯示的支援組合。',
    groundingProvenanceSupportNone: '這個結果沒有回傳任何脈絡支援組合。',
    groundingProvenanceContinuityInherited: '目前顯示的脈絡依據是從這個工作區工作階段中前一個相容回合繼承而來。',
    groundingProvenanceContinuityLive: '目前顯示的脈絡依據是直接由啟用中的工作階段回合回傳。',
    groundingProvenanceContinuityInactive: '這個工作階段目前還沒有啟用脈絡延續。',
    provenanceCarryForwardLog: '已從前一個具脈絡依據的回合延續脈絡延續狀態。',
} as const;

const zhCnGroundingProvenanceLongformBaseline = {
    groundingProvenanceThoughtVisible: '这个结果返回了可见的思考内容。',
    groundingProvenanceThoughtHiddenSignature: '这个结果带有隐藏的思考签名，但没有可见的思考文本。',
    groundingProvenanceThoughtRequestedNone: '虽然请求了思考内容，但模型没有为这个结果返回思考产物。',
    groundingProvenanceThoughtNotRequested: '这个结果没有请求思考内容。',
    groundingProvenanceGroundingSourcesReturned: '这个结果返回了脉络来源。',
    groundingProvenanceGroundingQueriesNoSources: '这个结果发出了脉络查询，但没有返回可归属的来源。',
    groundingProvenanceGroundingMetadataNoSources: '这个结果返回了脉络元数据，但没有公开任何来源链接。',
    groundingProvenanceGroundingRequestedNone: '这个结果请求了脉络依据，但没有返回任何脉络元数据。',
    groundingProvenanceGroundingNotRequested: '这个结果没有请求脉络依据。',
    groundingProvenanceSupportBundlesUsed: '脉络支持组合会显示哪些检索到的来源被实际使用。',
    groundingProvenanceSupportMetadataNoBundles: '返回了脉络支持元数据，但没有提取出可显示的支持组合。',
    groundingProvenanceSupportNone: '这个结果没有返回任何脉络支持组合。',
    groundingProvenanceContinuityInherited: '当前显示的脉络依据是从这个工作区会话中前一个兼容回合继承而来。',
    groundingProvenanceContinuityLive: '当前显示的脉络依据是直接由活动会话回合返回的。',
    groundingProvenanceContinuityInactive: '这个会话目前还没有启用脉络延续。',
    provenanceCarryForwardLog: '已从前一个具脉络依据的回合延续脉络延续状态。',
} as const;

const zhTwShellMixedLanguageBaseline = {
    workspaceSnapshotImportedNotice: '已從 {0} 匯入工作區快照。',
    workspaceSnapshotImportedLog: '已從 {0} 匯入工作區快照（{1} 個回合）。',
    workspaceSnapshotMergedNotice: '已將 {0} 的匯入回合合併進目前工作區。',
    workspaceSnapshotMergedLog: '已將來自 {1} 的 {0} 個匯入回合合併進目前工作區。',
    workspaceSnapshotExportedNotice: '工作區快照已匯出，共 {0} 個回合。',
    workspaceSnapshotExportedLog: '工作區快照已匯出（{0} 個回合、{1} 個暫存資產）。',
    workspaceSnapshotExportFailed: '匯出目前工作區快照失敗。',
    workspaceSnapshotImportReadTextFailed: '匯入快照失敗，因為檔案無法以文字讀取。',
    workspaceSnapshotImportInvalidFormat: '匯入快照失敗，因為檔案格式無效。',
    workspaceSnapshotImportReadFailed: '讀取所選檔案時，快照匯入失敗。',
    historySourceStartConversationNotice: '已開始新的對話鏈，並保留提示設定與參考圖。',
    historySourceContinueNotice: '這個歷史回合現在是目前的延續來源。',
    historySourceContinueLog: '已將歷史回合對齊為目前的延續來源（{0}）。',
    historySourceBranchNotice: '已將歷史回合暫定為新的分支來源，並保留提示設定。',
    historySourceBranchLog: '已將歷史回合暫定為分支來源，同時保留目前提示設定（{0}）。',
    historySourceReopenNotice: '已將歷史回合重新開啟為目前的階段來源。',
    historySourceReopenLog: '已將歷史回合重新開啟為目前的階段來源（{0}）。',
    workspaceCurrentStageSourceNoLinkedHistory:
        '這個階段目前只有暫存狀態，沒有連結到歷史回合，因此延續動作只會使用目前暫存的圖片狀態。',
    workspaceInsightsReplaySession: '檢視工作階段',
    groundingPanelAttributionSourceTypeWeb: '網頁',
    groundingPanelAttributionSourceTypeImage: '圖片',
    groundingPanelAttributionSourceTypeContext: '上下文',
    groundingPanelAttributionWebQueries: '網頁',
    groundingPanelAttributionImageQueries: '圖片',
} as const;

const zhCnShellMixedLanguageBaseline = {
    workspaceSnapshotImportedNotice: '已从 {0} 导入工作区快照。',
    workspaceSnapshotImportedLog: '已从 {0} 导入工作区快照（{1} 个回合）。',
    workspaceSnapshotMergedNotice: '已将 {0} 的导入回合合并进当前工作区。',
    workspaceSnapshotMergedLog: '已将来自 {1} 的 {0} 个导入回合合并进当前工作区。',
    workspaceSnapshotExportedNotice: '工作区快照已导出，共 {0} 个回合。',
    workspaceSnapshotExportedLog: '工作区快照已导出（{0} 个回合、{1} 个暂存资源）。',
    workspaceSnapshotExportFailed: '导出当前工作区快照失败。',
    workspaceSnapshotImportReadTextFailed: '导入快照失败，因为文件无法按文本读取。',
    workspaceSnapshotImportInvalidFormat: '导入快照失败，因为文件格式无效。',
    workspaceSnapshotImportReadFailed: '读取所选文件时，快照导入失败。',
    historySourceStartConversationNotice: '已开始新的对话链，并保留提示设置与参考图。',
    historySourceContinueNotice: '这个历史回合现在是当前的延续来源。',
    historySourceContinueLog: '已将历史回合对齐为当前的延续来源（{0}）。',
    historySourceBranchNotice: '已将历史回合暂定为新的分支来源，并保留提示设置。',
    historySourceBranchLog: '已将历史回合暂定为分支来源，同时保留当前提示设置（{0}）。',
    historySourceReopenNotice: '已将历史回合重新打开为当前的阶段来源。',
    historySourceReopenLog: '已将历史回合重新打开为当前的阶段来源（{0}）。',
    workspaceCurrentStageSourceNoLinkedHistory:
        '这个阶段当前只有暂存状态，没有链接到历史回合，因此延续动作只会使用当前暂存的图片状态。',
    workspaceInsightsReplaySession: '查看会话',
    groundingPanelAttributionSourceTypeWeb: '网页',
    groundingPanelAttributionSourceTypeImage: '图片',
    groundingPanelAttributionSourceTypeContext: '上下文',
    groundingPanelAttributionWebQueries: '网页',
    groundingPanelAttributionImageQueries: '图片',
} as const;

const zhTwReplayComposerBaseline = {
    sessionReplayEmpty: '這個工作區目前還沒有擷取任何流程記錄。',
    groundingProvenanceAppendNotice: '已將引用細節加入提示詞編輯區。',
    groundingProvenanceAppendLog: '已從 {0} 將引用細節加入提示詞編輯區。',
    groundingProvenanceReplaceNotice: '已用選取的引用細節取代目前提示詞。',
    groundingProvenanceReplaceLog: '已用 {0} 取代目前提示詞。',
} as const;

const zhCnReplayComposerBaseline = {
    sessionReplayEmpty: '这个工作区目前还没有捕获任何流程记录。',
    groundingProvenanceAppendNotice: '已将引用细节加入提示词编辑区。',
    groundingProvenanceAppendLog: '已从 {0} 将引用细节加入提示词编辑区。',
    groundingProvenanceReplaceNotice: '已用所选引用细节替换当前提示词。',
    groundingProvenanceReplaceLog: '已用 {0} 替换当前提示词。',
} as const;

const zhTwGroundingPanelBaseline = {
    groundingPanelUncitedSourcesHint: '這個來源有被擷取進脈絡中繼資料，但沒有直接出現在回傳的支援組合引用中。',
    groundingPanelProvenanceSource: '脈絡來源',
    groundingPanelEmptyDetail: '選擇來源或支援組合來檢查段落層級的歸屬，並可重用到提示詞編輯區。',
} as const;

const zhCnGroundingPanelBaseline = {
    groundingPanelUncitedSourcesHint: '这个来源已出现在脉络元数据中，但没有直接出现在返回的支持组合引用里。',
    groundingPanelProvenanceSource: '脉络来源',
    groundingPanelEmptyDetail: '选择来源或支持组合来检查段落级归属，并可重用到提示词编辑区。',
} as const;

const zhTwGroundingReuseBaseline = {
    groundingPanelReuseAddedCueLabel: '新增的脈絡提示',
    groundingPanelReuseAppendImpactKeep: '會保留目前提示詞，並把脈絡提示加在下方。',
    groundingPanelReuseAppendImpactEmpty: '目前還沒有提示詞。附加會直接把這段脈絡文字當成新提示詞。',
    groundingPanelReuseReplaceImpact: '會用這段脈絡文字直接取代目前提示詞。',
} as const;

const zhCnGroundingReuseBaseline = {
    groundingPanelReuseAddedCueLabel: '新增的脉络提示',
    groundingPanelReuseAppendImpactKeep: '会保留当前提示词，并把脉络提示加在下方。',
    groundingPanelReuseAppendImpactEmpty: '当前还没有提示词。附加会直接把这段脉络文本当成新提示词。',
    groundingPanelReuseReplaceImpact: '会用这段脉络文本直接替换当前提示词。',
} as const;

const zhTwStageSurfaceBaseline = {
    loadingStageSurface: '正在載入階段畫面...',
    workspacePanelResultTextReserved: '切換到支援圖像與文字的模型後，這裡會顯示回應敘述。',
} as const;

const zhCnStageSurfaceBaseline = {
    loadingStageSurface: '正在加载阶段画面...',
    workspacePanelResultTextReserved: '切换到支持图像与文字的模型后，这里会显示响应叙述。',
} as const;

const zhTwGroundingBundleStateBaseline = {
    groundingPanelCoveredBySelectedBundleState: '已被選取的支援組合涵蓋',
} as const;

const zhCnGroundingBundleStateBaseline = {
    groundingPanelCoveredBySelectedBundleState: '已被选中的支持组合覆盖',
} as const;

const zhTwViewerSessionHintBaseline = {
    workspaceViewerSessionHintsEmpty: '後端可在不改變檢視器契約的前提下，將多輪或脈絡工作階段提示附加於此。',
} as const;

const zhCnViewerSessionHintBaseline = {
    workspaceViewerSessionHintsEmpty: '后端可以在不改变查看器契约的前提下，把多轮或脉络会话提示附加到这里。',
} as const;

const zhTwImportReviewDescBaseline = {
    workspaceImportReviewDesc:
        '這份工作區快照會先保持為待確認狀態。你可以取代目前工作區並重新開啟匯入鏈的還原動作、把匯入候選提升為延續來源，或只把匯入歷程合併進目前工作區，同時保留目前的階段畫面、工作階段與提示詞編輯區狀態。',
} as const;

const zhCnImportReviewDescBaseline = {
    workspaceImportReviewDesc:
        '这份工作区快照会先保持为待确认状态。你可以替换当前工作区并重新打开导入链的还原动作、把导入候选提升为延续来源，或只把导入的历史步骤合并进当前工作区，同时保留当前的阶段画面、会话和提示词编辑区状态。',
} as const;

const zhTwViewerDescBaseline = {
    workspaceViewerDesc: '把目前階段圖像、結果文字與來源脈絡集中在同一處查看。',
} as const;

const zhCnViewerDescBaseline = {
    workspaceViewerDesc: '在同一个位置查看当前阶段图像、结果文本与来源脉络。',
} as const;

const zhTwViewerResultTextEmptyBaseline = {
    workspaceViewerResultTextEmpty: '如果目前模型回傳圖像加文字結果，這裡會顯示對應內容。',
} as const;

const zhCnViewerResultTextEmptyBaseline = {
    workspaceViewerResultTextEmpty: '当所选模型返回图像加文本结果时，这里会显示对应内容。',
} as const;

const zhTwInsightsContinuityBaseline = {
    workspaceInsightsNoContinuitySignals: '目前還沒有延續訊號。',
} as const;

const zhCnInsightsContinuityBaseline = {
    workspaceInsightsNoContinuitySignals: '目前还没有延续信号。',
} as const;

const zhTwInsightsSessionSourceBaseline = {
    workspaceInsightsSessionSource: '本次工作',
} as const;

const zhCnInsightsSessionSourceBaseline = {
    workspaceInsightsSessionSource: '本次工作',
} as const;

const zhTwInsightsEyebrowBaseline = {
    workspaceInsightsEyebrow: '工作區脈絡',
} as const;

const zhCnInsightsEyebrowBaseline = {
    workspaceInsightsEyebrow: '工作区上下文',
} as const;

const englishInsightsRegroupHeadingBaseline = {
    workspaceInsightsCurrentWork: 'Current Work',
    workspaceInsightsVersions: 'Versions',
    workspaceInsightsSourcesCitations: 'Sources & Citations',
    workspaceInsightsActivity: 'Activity',
} as const;

const zhTwInsightsRegroupHeadingBaseline = {
    workspaceInsightsCurrentWork: '目前工作',
    workspaceInsightsVersions: '版本',
    workspaceInsightsSourcesCitations: '來源與引用',
    workspaceInsightsActivity: '活動',
} as const;

const zhCnInsightsRegroupHeadingBaseline = {
    workspaceInsightsCurrentWork: '当前工作',
    workspaceInsightsVersions: '版本',
    workspaceInsightsSourcesCitations: '来源与引用',
    workspaceInsightsActivity: '活动',
} as const;

const zhTwInsightsSessionStateHintBaseline = {
    workspaceInsightsSessionStateHint:
        '不管階段畫面切到哪個結果，這一欄都會保留目前成果、已存版本、來源依據與近期活動。',
} as const;

const zhCnInsightsSessionStateHintBaseline = {
    workspaceInsightsSessionStateHint:
        '无论阶段画面切到哪个结果，这一栏都会保留当前成果、已存版本、来源依据与近期活动。',
} as const;

const zhTwInsightsTimelineTitleBaseline = {
    workspaceInsightsTimelineTitle: '近期活動',
} as const;

const zhCnInsightsTimelineTitleBaseline = {
    workspaceInsightsTimelineTitle: '近期活动',
} as const;

const zhTwInsightsTimelineDescBaseline = {
    workspaceInsightsTimelineDesc: '請求、輸出、歷史與錯誤都會直接整理在這裡，不必離開工作區。',
} as const;

const zhCnInsightsTimelineDescBaseline = {
    workspaceInsightsTimelineDesc: '请求、输出、历史和错误都会直接整理在这里，不必离开工作区。',
} as const;

const zhTwInsightsSessionTurnStackEmptyBaseline = {
    workspaceInsightsSessionTurnStackEmpty: '最近成功的回合會整理在這裡，方便快速重新開啟、延續或分支。',
} as const;

const zhCnInsightsSessionTurnStackEmptyBaseline = {
    workspaceInsightsSessionTurnStackEmpty: '最近成功的回合会整理在这里，方便快速重新打开、延续或分支。',
} as const;

const zhTwInsightsLatestResultTextEmptyBaseline = {
    workspaceInsightsLatestResultTextEmpty: '當啟用圖片加文字模式時，階段摘要會顯示在這裡，也會同步出現在檢視器。',
} as const;

const zhCnInsightsLatestResultTextEmptyBaseline = {
    workspaceInsightsLatestResultTextEmpty: '当启用图片加文本模式时，阶段摘要会显示在这里，也会同步出现在查看器中。',
} as const;

const zhTwInsightsStageSourceEmptyBaseline = {
    workspaceInsightsStageSourceEmpty:
        '當結果進入階段畫面後，這張卡會顯示它是來自歷史、目前啟用的分支延續、編輯器後續編修，或重新開啟的回合。',
} as const;

const zhCnInsightsStageSourceEmptyBaseline = {
    workspaceInsightsStageSourceEmpty:
        '当结果进入阶段画面后，这张卡会显示它来自历史、当前激活的分支延续、编辑器后续编辑，还是重新打开的回合。',
} as const;

const zhTwHistoryFilmstripTitleBaseline = {
    historyFilmstripTitle: '最近回合',
} as const;

const zhCnHistoryFilmstripTitleBaseline = {
    historyFilmstripTitle: '最近回合',
} as const;

const zhTwInsightsSessionHintsEmptyBaseline = {
    workspaceInsightsSessionHintsEmpty: '脈絡依據或多輪工作流的工作階段提示會顯示在這裡。',
} as const;

const zhCnInsightsSessionHintsEmptyBaseline = {
    workspaceInsightsSessionHintsEmpty: '脉络依据或多轮工作流的会话层提示会显示在这里。',
} as const;

const zhTwHistoryFilmstripDescBaseline = {
    historyFilmstripDesc: '目前結果留在階段畫面，上下文相近的回合則隨時可重新開啟、延續或分支。',
} as const;

const zhCnHistoryFilmstripDescBaseline = {
    historyFilmstripDesc: '当前结果留在阶段画面，上下文相近的回合则随时可重新打开、延续或分支。',
} as const;

const zhTwHistoryFilmstripEmptyBaseline = {
    historyFilmstripEmpty: '先生成或載入圖片，這裡才會開始累積回合列。',
} as const;

const zhCnHistoryFilmstripEmptyBaseline = {
    historyFilmstripEmpty: '先生成或载入图片，这里才会开始累积回合列。',
} as const;

const zhTwQueuedBatchRefreshNoneBaseline = {
    queuedBatchRefreshNoneNotice: '目前沒有執行中的佇列批次工作可重新整理。',
} as const;

const zhCnQueuedBatchRefreshNoneBaseline = {
    queuedBatchRefreshNoneNotice: '当前没有运行中的队列批处理任务可刷新。',
} as const;

const zhTwQueuedBatchNoImportableResultsBaseline = {
    queuedBatchNoImportableResultsNotice: '這個批次工作沒有可匯入的圖片結果。',
} as const;

const zhCnQueuedBatchNoImportableResultsBaseline = {
    queuedBatchNoImportableResultsNotice: '这个批处理任务没有可导入的图片结果。',
} as const;

const zhTwQueuedBatchRefreshedLogBaseline = {
    queuedBatchRefreshedLog: '已重新整理 {0} 個佇列批次工作。',
} as const;

const zhCnQueuedBatchRefreshedLogBaseline = {
    queuedBatchRefreshedLog: '已刷新 {0} 个队列批处理任务。',
} as const;

const zhTwQueuedBatchCancelledLogBaseline = {
    queuedBatchCancelledLog: '已取消佇列批次工作 {0}。',
} as const;

const zhCnQueuedBatchCancelledLogBaseline = {
    queuedBatchCancelledLog: '已取消队列批处理任务 {0}。',
} as const;

const zhTwQueuedBatchCancelRequestedNoticeBaseline = {
    queuedBatchCancelRequestedNotice: '已送出佇列批次工作取消要求。',
} as const;

const zhCnQueuedBatchCancelRequestedNoticeBaseline = {
    queuedBatchCancelRequestedNotice: '已提交队列批处理任务取消请求。',
} as const;

const zhTwQueuedBatchImportWaitingNoticeBaseline = {
    queuedBatchImportWaitingNotice: '目前沒有已完成且等待匯入的佇列批次工作。',
} as const;

const zhCnQueuedBatchImportWaitingNoticeBaseline = {
    queuedBatchImportWaitingNotice: '当前没有已完成且等待导入的队列批处理任务。',
} as const;

const zhTwQueuedBatchImportedLogBaseline = {
    queuedBatchImportedLog: '已從 {1} 匯入 {0} 筆佇列批次結果。',
} as const;

const zhCnQueuedBatchImportedLogBaseline = {
    queuedBatchImportedLog: '已从 {1} 导入 {0} 条队列批处理结果。',
} as const;

const zhTwQueuedBatchImportedNoticeBaseline = {
    queuedBatchImportedNotice: '已匯入 {0} 筆佇列批次結果。',
} as const;

const zhCnQueuedBatchImportedNoticeBaseline = {
    queuedBatchImportedNotice: '已导入 {0} 条队列批处理结果。',
} as const;

const zhTwQueuedBatchImportAllLogBaseline = {
    queuedBatchImportAllLog: '已從 {1} 個工作匯入 {0} 筆佇列批次結果。',
} as const;

const zhCnQueuedBatchImportAllLogBaseline = {
    queuedBatchImportAllLog: '已从 {1} 个作业导入 {0} 条队列批处理结果。',
} as const;

const zhTwQueuedBatchImportAllNoticeBaseline = {
    queuedBatchImportAllNotice: '已從可匯入工作匯入 {0} 筆佇列批次結果。',
} as const;

const zhCnQueuedBatchImportAllNoticeBaseline = {
    queuedBatchImportAllNotice: '已从可导入作业导入 {0} 条队列批处理结果。',
} as const;

const zhTwQueuedBatchPollFailedLogBaseline = {
    queuedBatchPollFailedLog: '佇列批次工作輪詢失敗 {0}：{1}',
} as const;

const zhCnQueuedBatchPollFailedLogBaseline = {
    queuedBatchPollFailedLog: '队列批处理任务轮询失败 {0}：{1}',
} as const;

const zhTwQueuedBatchCancelFailedLogBaseline = {
    queuedBatchCancelFailedLog: '佇列批次工作取消失敗 {0}：{1}',
} as const;

const zhCnQueuedBatchCancelFailedLogBaseline = {
    queuedBatchCancelFailedLog: '队列批处理任务取消失败 {0}：{1}',
} as const;

const zhTwQueuedBatchImportFailedLogBaseline = {
    queuedBatchImportFailedLog: '佇列批次結果匯入失敗 {0}：{1}',
} as const;

const zhCnQueuedBatchImportFailedLogBaseline = {
    queuedBatchImportFailedLog: '队列批处理结果导入失败 {0}：{1}',
} as const;

const zhTwQueuedBatchImportAllNoneNoticeBaseline = {
    queuedBatchImportAllNoneNotice: '可匯入的佇列批次工作沒有任何可用圖片結果。',
} as const;

const zhCnQueuedBatchImportAllNoneNoticeBaseline = {
    queuedBatchImportAllNoneNotice: '可导入的队列批处理任务没有任何可用图片结果。',
} as const;

const zhTwQueuedBatchSubmittedNoticeBaseline = {
    queuedBatchSubmittedNotice: '佇列批次工作已送交官方批次 API。',
} as const;

const zhCnQueuedBatchSubmittedNoticeBaseline = {
    queuedBatchSubmittedNotice: '队列批处理任务已提交到官方批处理 API。',
} as const;

const zhTwQueuedBatchSubmittedLogBaseline = {
    queuedBatchSubmittedLog: '已建立官方佇列批次工作 {0}。',
} as const;

const zhCnQueuedBatchSubmittedLogBaseline = {
    queuedBatchSubmittedLog: '已创建官方队列批处理任务 {0}。',
} as const;

const zhTwQueuedBatchSubmissionFailedLogBaseline = {
    queuedBatchSubmissionFailedLog: '佇列批次工作送出失敗：{0}',
} as const;

const zhCnQueuedBatchSubmissionFailedLogBaseline = {
    queuedBatchSubmissionFailedLog: '队列批处理任务提交失败：{0}',
} as const;

const zhTwQueuedBatchPolledLogBaseline = {
    queuedBatchPolledLog: '已輪詢佇列批次工作 {0}：{1}。',
} as const;

const zhCnQueuedBatchPolledLogBaseline = {
    queuedBatchPolledLog: '已轮询队列批处理任务 {0}：{1}。',
} as const;

const zhTwQueuedBatchReadyToImportNoticeBaseline = {
    queuedBatchReadyToImportNotice: '佇列批次工作 {0} 已可匯入。',
} as const;

const zhCnQueuedBatchReadyToImportNoticeBaseline = {
    queuedBatchReadyToImportNotice: '队列批处理任务 {0} 已可导入。',
} as const;

const zhTwQueuedBatchFinishedStateNoticeBaseline = {
    queuedBatchFinishedStateNotice: '佇列批次工作 {0} 已以 {1} 結束。',
} as const;

const zhCnQueuedBatchFinishedStateNoticeBaseline = {
    queuedBatchFinishedStateNotice: '队列批处理任务 {0} 已以 {1} 结束。',
} as const;

const zhTwGroundingPanelNoQueriesBaseline = {
    groundingPanelNoQueries: '模型回傳脈絡依據查詢詞時，會顯示在這裡。',
} as const;

const zhCnGroundingPanelNoQueriesBaseline = {
    groundingPanelNoQueries: '当模型返回脉络依据查询词时，会显示在这里。',
} as const;

const zhTwComposerEnterHintsBaseline = {
    composerEnterSends: '按輸入鍵送出',
    composerEnterNewline: '按輸入鍵換行',
} as const;

const zhCnComposerEnterHintsBaseline = {
    composerEnterSends: '按回车键发送',
    composerEnterNewline: '按回车键换行',
} as const;

const zhTwShiftEnterHintBaseline = {
    shiftEnter: 'Shift+輸入鍵換行',
} as const;

const zhCnShiftEnterHintBaseline = {
    shiftEnter: 'Shift+回车键换行',
} as const;

const zhTwEnterToSendHintBaseline = {
    enterToSend: '輸入鍵送出',
} as const;

const zhCnEnterToSendHintBaseline = {
    enterToSend: '回车键发送',
} as const;

const zhTwImportReviewContinueLatestBaseline = {
    workspaceImportReviewContinueLatest: '延續最新回合',
} as const;

const zhCnImportReviewContinueLatestBaseline = {
    workspaceImportReviewContinueLatest: '延续最新回合',
} as const;

const zhTwLoadingPrepareUltraEditorBaseline = {
    loadingPrepareUltraEditor: '正在準備 Ultra 編輯器...',
} as const;

const zhCnLoadingPrepareUltraEditorBaseline = {
    loadingPrepareUltraEditor: '正在准备 Ultra 编辑器...',
} as const;

const zhTwSketchPadLabelBaseline = {
    workspacePickerOpenSketchPad: '開啟手繪畫板',
    loadingPrepareSketchPad: '正在準備手繪畫板...',
} as const;

const zhCnSketchPadLabelBaseline = {
    workspacePickerOpenSketchPad: '打开手绘画板',
    loadingPrepareSketchPad: '正在准备手绘画板...',
} as const;

const zhTwHistoryStageBaseline = {
    historyContinueFromTurn: '從這個回合延續',
    historyContinuePromoteVariant: '提升並延續',
    historyContinueSourceActive: '延續來源',
    followUpEditRequiresStageImage: '請先建立目前階段圖片，再執行後續編修。',
    editorBaseStageNotice: '目前階段圖片已設為編輯器底圖。',
} as const;

const zhCnHistoryStageBaseline = {
    historyContinueFromTurn: '从这个回合延续',
    historyContinuePromoteVariant: '提升并延续',
    historyContinueSourceActive: '延续来源',
    followUpEditRequiresStageImage: '请先建立当前阶段图像，再执行后续编辑。',
    editorBaseStageNotice: '当前阶段图像已设为编辑器底图。',
} as const;

const zhTwComposerControlsBaseline = {
    composerEnterSends: '按輸入鍵送出',
    composerEnterNewline: '按輸入鍵換行',
    composerQueueBatchJob: '排入批次工作',
    composerActionPanelEyebrow: '操作',
    composerActionPanelTitle: '建立',
    composerActionPanelDesc: '生成仍是主要動作，後續編修與工作區操作保持靠近，但語氣更收斂。',
    composerAdvancedEyebrow: '深度控制',
} as const;

const zhCnComposerControlsBaseline = {
    composerEnterSends: '按回车键发送',
    composerEnterNewline: '按回车键换行',
    composerQueueBatchJob: '加入批处理队列',
    composerActionPanelEyebrow: '操作',
    composerActionPanelTitle: '创建',
    composerActionPanelDesc: '生成仍然是主动作，后续编辑和工作区操作保持靠近，但语气更克制。',
    composerAdvancedEyebrow: '深度控制',
} as const;

const jaComposerControlChromeBaseline = {
    composerToolbarExportWorkspace: 'ワークスペースを書き出し',
    composerToolbarImportWorkspace: 'ワークスペースを読み込み',
    composerToolbarAdvancedSettings: '詳細設定',
    composerEnterSends: 'Enterで送信',
    composerEnterNewline: 'Enterで改行',
    composerVisibilityVisible: '表示',
    composerVisibilityHidden: '非表示',
    composerActionPanelEyebrow: 'アクション',
    composerActionPanelTitle: '作成',
    composerActionPanelDesc:
        '生成を主役に置いたまま、フォローアップとワークスペース操作を近くにまとめつつ控えめに扱います。',
    composerAdvancedEyebrow: '詳細操作',
} as const;

const koComposerControlChromeBaseline = {
    composerToolbarExportWorkspace: '워크스페이스 내보내기',
    composerToolbarImportWorkspace: '워크스페이스 가져오기',
    composerToolbarAdvancedSettings: '고급 설정',
    composerEnterSends: 'Enter로 전송',
    composerEnterNewline: 'Enter로 줄바꿈',
    composerVisibilityVisible: '표시',
    composerVisibilityHidden: '숨김',
    composerActionPanelEyebrow: '작업',
    composerActionPanelTitle: '생성',
    composerActionPanelDesc:
        '생성을 중심에 두고, 후속 편집과 워크스페이스 작업은 가까이에 두되 더 조용하게 유지합니다.',
    composerAdvancedEyebrow: '심화 제어',
} as const;

const esComposerControlChromeBaseline = {
    composerToolbarExportWorkspace: 'Exportar espacio de trabajo',
    composerToolbarImportWorkspace: 'Importar espacio de trabajo',
    composerToolbarAdvancedSettings: 'Ajustes avanzados',
    composerEnterSends: 'Enter envia',
    composerEnterNewline: 'Enter inserta salto de linea',
    composerVisibilityVisible: 'Se muestra',
    composerVisibilityHidden: 'Oculto',
    composerActionPanelEyebrow: 'Acciones',
    composerActionPanelTitle: 'Crear',
    composerActionPanelDesc:
        'Generar sigue siendo lo principal. Las acciones de seguimiento y del espacio de trabajo se mantienen cerca, pero mas discretas.',
    composerAdvancedEyebrow: 'Controles profundos',
} as const;

const frComposerControlChromeBaseline = {
    composerToolbarExportWorkspace: 'Exporter l espace de travail',
    composerToolbarImportWorkspace: 'Importer l espace de travail',
    composerToolbarAdvancedSettings: 'Parametres avances',
    composerEnterSends: 'Entrer pour envoyer',
    composerEnterNewline: 'Entrer pour un saut de ligne',
    composerVisibilityVisible: 'Affiché',
    composerVisibilityHidden: 'Masque',
    composerActionPanelEyebrow: 'Commandes',
    composerActionPanelTitle: 'Creer',
    composerActionPanelDesc:
        'La generation reste prioritaire. Les actions de suivi et d espace de travail restent proches, mais plus discretes.',
    composerAdvancedEyebrow: 'Controles avances',
} as const;

const deComposerControlChromeBaseline = {
    composerToolbarExportWorkspace: 'Arbeitsbereich exportieren',
    composerToolbarImportWorkspace: 'Arbeitsbereich importieren',
    composerToolbarAdvancedSettings: 'Erweiterte Einstellungen',
    composerEnterSends: 'Enter sendet',
    composerEnterNewline: 'Enter fur Zeilenumbruch',
    composerVisibilityVisible: 'Sichtbar',
    composerVisibilityHidden: 'Ausgeblendet',
    composerActionPanelEyebrow: 'Aktionen',
    composerActionPanelTitle: 'Erstellen',
    composerActionPanelDesc:
        'Generieren bleibt die Hauptaktion. Folgeaktionen und Arbeitsbereichsaktionen bleiben nah dran, aber leiser.',
    composerAdvancedEyebrow: 'Tiefere Steuerung',
} as const;

const ruComposerControlChromeBaseline = {
    composerToolbarExportWorkspace: 'Экспортировать рабочее пространство',
    composerToolbarImportWorkspace: 'Импортировать рабочее пространство',
    composerToolbarAdvancedSettings: 'Расширенные настройки',
    composerEnterSends: 'Enter отправляет',
    composerEnterNewline: 'Enter переводит строку',
    composerVisibilityVisible: 'Видимо',
    composerVisibilityHidden: 'Скрыто',
    composerActionPanelEyebrow: 'Действия',
    composerActionPanelTitle: 'Создать',
    composerActionPanelDesc:
        'Генерация остается основным действием. Последующие и рабочие действия остаются рядом, но звучат тише.',
    composerAdvancedEyebrow: 'Глубокие настройки',
} as const;

const jaComposerQueueBatchJobBaseline = {
    composerQueueBatchJob: 'バッチジョブに追加',
} as const;

const koComposerQueueBatchJobBaseline = {
    composerQueueBatchJob: '배치 작업에 추가',
} as const;

const esComposerQueueBatchJobBaseline = {
    composerQueueBatchJob: 'Poner en cola como trabajo por lotes',
} as const;

const frComposerQueueBatchJobBaseline = {
    composerQueueBatchJob: 'Ajouter au lot en file',
} as const;

const deComposerQueueBatchJobBaseline = {
    composerQueueBatchJob: 'Als Batch-Job einreihen',
} as const;

const ruComposerQueueBatchJobBaseline = {
    composerQueueBatchJob: 'Поставить в очередь как пакетное задание',
} as const;

const zhTwComposerThoughtTempBaseline = {
    composerAdvancedGenerationSectionDesc: '把輸出、溫度與思考行為放在同一區，模型層級的變化會更容易讀。',
    composerDefaultTemp: '預設溫度 {0}',
    composerAdvancedReturnThoughtsDesc:
        '支援的 Gemini 3 圖像模型現在會固定要求可見的思考摘要，讓脈絡依據與推理資訊能在工作區中持續可用。',
} as const;

const zhCnComposerThoughtTempBaseline = {
    composerAdvancedGenerationSectionDesc: '把输出、温度和思考行为放在同一区，模型级变化会更容易读。',
    composerDefaultTemp: '默认温度 {0}',
    composerAdvancedReturnThoughtsDesc:
        '支持的 Gemini 3 图像模型现在会始终请求可见的思考摘要，让脉络依据和推理信息能持续保留在工作区里。',
} as const;

const zhTwGroundingRuntimeLabelBaseline = {
    composerAdvancedGroundingSectionTitle: '脈絡依據行為',
    composerAdvancedGroundingMode: '脈絡依據模式',
    composerAdvancedGroundingGuideTitle: '執行指南',
    stageGroundingResultStatus: '脈絡依據結果',
    stageGroundingResultSummary: '{0} · 請求 {1} · 實際 {2}',
} as const;

const zhCnGroundingRuntimeLabelBaseline = {
    composerAdvancedGroundingSectionTitle: '脉络依据行为',
    composerAdvancedGroundingMode: '脉络依据模式',
    composerAdvancedGroundingGuideTitle: '运行指南',
    stageGroundingResultStatus: '脉络依据结果',
    stageGroundingResultSummary: '{0} · 请求 {1} · 实际 {2}',
} as const;

const zhTwGroundingDescriptionBaseline = {
    composerAdvancedGroundingSectionDesc:
        '解析度行為和請求契約是分開驗證的，所以這裡直接保留目前已知的脈絡依據路徑結果。',
    composerAdvancedGroundingDesc: '用明確模式決定這個模型如何執行脈絡依據，而不是手動組合多個切換。',
    composerAdvancedGroundingResolutionWarningFlashImageSearch:
        'Nano Banana 2 的圖片搜尋可能在請求 2K 或 4K 時回落成 1K。',
    composerAdvancedGroundingGuideDesc: '這些脈絡依據解析度說明是根據目前產品路徑的實機檢查結果。',
    composerGroundingImageSearchUpgradeNotice:
        '啟用圖片搜尋脈絡依據時，輸出會自動升級為圖片與文字，以便回傳歸屬中繼資料。',
} as const;

const zhCnGroundingDescriptionBaseline = {
    composerAdvancedGroundingSectionDesc:
        '分辨率行为和请求契约是分开验证的，所以这里直接保留目前已知的脉络依据路径结果。',
    composerAdvancedGroundingDesc: '用明确模式决定这个模型如何执行脉络依据，而不是手动组合多个开关。',
    composerAdvancedGroundingResolutionWarningFlashImageSearch:
        'Nano Banana 2 的图片搜索在请求 2K 或 4K 时，可能回落到 1K。',
    composerAdvancedGroundingGuideDesc: '这些脉络依据分辨率说明来自当前产品路径的实机验证。',
    composerGroundingImageSearchUpgradeNotice:
        '启用图片搜索脉络依据时，输出会自动升级为图片与文字，以便返回归属元数据。',
} as const;

const zhTwGroundingGuideSentenceBaseline = {
    composerAdvancedGroundingGuideFlashGoogle: 'Nano Banana 2 + Google 搜尋：請求 2K 與 4K 時，實際輸出維持請求尺寸。',
    composerAdvancedGroundingGuideFlashImage: 'Nano Banana 2 + 圖片搜尋：請求 2K 與 4K 時，實際輸出可能回落到 1K。',
    composerAdvancedGroundingGuideProGoogle: 'Nano Banana Pro + Google 搜尋：請求 2K 與 4K 時，實際輸出維持請求尺寸。',
} as const;

const zhCnGroundingGuideSentenceBaseline = {
    composerAdvancedGroundingGuideFlashGoogle: 'Nano Banana 2 + Google 搜索：请求 2K 与 4K 时，实际输出保持请求尺寸。',
    composerAdvancedGroundingGuideFlashImage: 'Nano Banana 2 + 图片搜索：请求 2K 与 4K 时，实际输出可能回落到 1K。',
    composerAdvancedGroundingGuideProGoogle: 'Nano Banana Pro + Google 搜索：请求 2K 与 4K 时，实际输出保持请求尺寸。',
} as const;

const zhTwQueuedBatchWordingBaseline = {
    queueBatchModeEditor: '這會以目前的編輯底圖與已暫存參考圖送出一個官方編輯批次工作。',
    queueBatchModeStage: '這會以目前的階段圖像與已暫存參考圖送出一個官方後續延伸批次工作。',
    queueBatchModeReferences: '這會以目前提示詞與參考圖托盤送出一個官方參考驅動批次工作。',
    queueBatchModePromptOnly: '這會送出一個僅依提示詞的官方批次工作。',
    queueBatchConversationNotice:
        '佇列批次工作會保留來源延續脈絡，但不會送出官方多輪對話歷史。若要延續對話，請使用開始生成。',
    queuedBatchJobsWorkflowHint: '先在這裡追蹤佇列狀態，結果就緒後匯入歷史，流程完成後再清除這筆工作。',
    queuedBatchJobsConversationNoticeLabel: '延續提醒',
    queuedBatchJobsMonitorGroup: '監看',
    queuedBatchJobsResultsGroup: '結果',
    queuedBatchJobsCleanupGroup: '清理',
} as const;

const zhCnQueuedBatchWordingBaseline = {
    queueBatchModeEditor: '这会以当前编辑底图和已暂存参考图提交一个官方编辑批处理任务。',
    queueBatchModeStage: '这会以当前阶段图像和已暂存参考图提交一个官方后续延展批处理任务。',
    queueBatchModeReferences: '这会以当前提示词和参考图托盘提交一个官方参考驱动批处理任务。',
    queueBatchModePromptOnly: '这会提交一个仅基于提示词的官方批处理任务。',
    queueBatchConversationNotice:
        '队列批处理任务会保留来源延续脉络，但不会发送官方多轮对话历史。若要继续对话，请使用开始生成。',
    queuedBatchJobsWorkflowHint: '先在这里跟踪队列状态，结果就绪后导入历史，流程完成后再清除这条任务。',
    queuedBatchJobsConversationNoticeLabel: '延续提醒',
    queuedBatchJobsMonitorGroup: '监看',
    queuedBatchJobsResultsGroup: '结果',
    queuedBatchJobsCleanupGroup: '清理',
} as const;

const zhTwQueuedBatchDescBaseline = {
    queuedBatchJobsDesc:
        '已保存的官方 Gemini 批次 API 工作會在這裡持續追蹤，待處理或執行中時可沿著狀態檢查、結果匯入與清理流程完成。',
} as const;

const zhCnQueuedBatchDescBaseline = {
    queuedBatchJobsDesc:
        '已保存的官方 Gemini 批处理 API 任务会在这里持续跟踪，待处理或运行中时可沿着状态检查、结果导入与清理流程完成。',
} as const;

const jaQueuedBatchWordingBaseline = {
    queueBatchModeEditor:
        'キュー投入バッチジョブは、現在のエディターベースとステージ済み参照を使って、編集ベースの公式画像条件付きバッチを送信します。',
    queueBatchModeStage:
        'キュー投入バッチジョブは、現在のステージ画像とステージ済み参照を使って、後続生成向けの公式画像条件付きバッチを送信します。',
    queueBatchModeReferences:
        'キュー投入バッチジョブは、現在のプロンプトと参照トレイを使って、参照駆動の公式バッチを送信します。',
    queueBatchModePromptOnly: 'キュー投入バッチジョブは、プロンプトのみの公式バッチジョブを送信します。',
    queueBatchConversationNotice:
        'キュー投入バッチジョブはソースの系統を保持しますが、公式の複数ターン会話履歴は送信しません。会話を継続する場合は通常の生成を使ってください。',
    queuedBatchJobsWorkflowHint:
        'ここでキューを見守り、結果の準備ができたら履歴へ取り込み、作業が終わったらこのエントリをクリアします。',
    queuedBatchJobsConversationNoticeLabel: '継続メモ',
    queuedBatchJobsMonitorGroup: '監視',
    queuedBatchJobsResultsGroup: '結果',
    queuedBatchJobsCleanupGroup: '整理',
    queuedBatchJobsDesc:
        '保存済みの公式 Gemini Batch API ジョブはここで追跡され、待機中または実行中の間に状態確認、結果の取り込み、後片付けまで進められます。',
} as const;

const koQueuedBatchWordingBaseline = {
    queueBatchModeEditor:
        '대기열 배치 작업은 현재 에디터 베이스와 스테이징된 참조를 사용해 편집 기반의 공식 이미지 조건부 배치 작업을 제출합니다.',
    queueBatchModeStage:
        '대기열 배치 작업은 현재 스테이지 이미지와 스테이징된 참조를 사용해 후속 생성용 공식 이미지 조건부 배치 작업을 제출합니다.',
    queueBatchModeReferences:
        '대기열 배치 작업은 현재 프롬프트와 참조 트레이를 사용해 공식 참조 기반 배치 작업을 제출합니다.',
    queueBatchModePromptOnly: '대기열 배치 작업은 프롬프트만 사용하는 공식 배치 작업을 제출합니다.',
    queueBatchConversationNotice:
        '대기열 배치 작업은 원본 계보를 유지하지만 공식 다중 턴 대화 기록은 전송하지 않습니다. 대화를 이어가려면 일반 생성 흐름을 사용하세요.',
    queuedBatchJobsWorkflowHint:
        '여기서 대기열을 살피고, 결과가 준비되면 히스토리로 가져온 뒤 작업이 끝나면 이 항목을 정리합니다.',
    queuedBatchJobsConversationNoticeLabel: '연속성 메모',
    queuedBatchJobsMonitorGroup: '모니터링',
    queuedBatchJobsResultsGroup: '결과',
    queuedBatchJobsCleanupGroup: '정리',
    queuedBatchJobsDesc:
        '저장된 공식 Gemini Batch API 작업은 여기에서 계속 추적되며, 대기 중이거나 실행 중일 때 상태 확인, 결과 가져오기, 정리 순서로 마무리할 수 있습니다.',
} as const;

const esQueuedBatchWordingBaseline = {
    queueBatchModeEditor:
        'El trabajo por lotes en cola enviara un lote oficial condicionado por imagen basado en el editor usando la base actual del editor y las referencias preparadas.',
    queueBatchModeStage:
        'El trabajo por lotes en cola enviara un lote oficial condicionado por imagen de seguimiento usando la imagen actual del escenario y las referencias preparadas.',
    queueBatchModeReferences:
        'El trabajo por lotes en cola enviara un lote oficial guiado por referencias usando el prompt actual y la bandeja de referencias.',
    queueBatchModePromptOnly: 'El trabajo por lotes en cola enviara un lote oficial basado solo en el prompt.',
    queueBatchConversationNotice:
        'Los trabajos por lotes en cola conservan el linaje de origen, pero no envian el historial oficial de conversacion de varios turnos. Para continuar un chat, usa la generacion normal.',
    queuedBatchJobsWorkflowHint:
        'Supervisa la cola aqui, importa los resultados terminados al historial cuando esten listos y limpia la entrada cuando el flujo haya terminado.',
    queuedBatchJobsConversationNoticeLabel: 'Nota de continuidad',
    queuedBatchJobsMonitorGroup: 'Seguimiento',
    queuedBatchJobsResultsGroup: 'Resultados',
    queuedBatchJobsCleanupGroup: 'Limpieza',
    queuedBatchJobsDesc:
        'Los trabajos oficiales persistidos de Gemini Batch API se siguen aqui mientras estan en espera o en ejecucion, para avanzar por comprobacion de estado, importacion de resultados y limpieza.',
} as const;

const frQueuedBatchWordingBaseline = {
    queueBatchModeEditor:
        "Le lot en file d'attente enverra un lot officiel conditionne par image base sur l'editeur en utilisant la base actuelle de l'editeur et les references preparees.",
    queueBatchModeStage:
        "Le lot en file d'attente enverra un lot officiel conditionne par image de suivi en utilisant l'image actuelle de la scene et les references preparees.",
    queueBatchModeReferences:
        "Le lot en file d'attente enverra un lot officiel pilote par references avec le prompt actuel et le bac de references.",
    queueBatchModePromptOnly: "Le lot en file d'attente enverra un lot officiel base uniquement sur le prompt.",
    queueBatchConversationNotice:
        "Les lots en file d'attente conservent la lignee source, mais n'envoient pas l'historique officiel des conversations multi-tours. Pour poursuivre une conversation, utilisez le flux de generation normal.",
    queuedBatchJobsWorkflowHint:
        "Surveillez la file ici, importez les resultats termines dans l'historique lorsqu'ils sont prets, puis effacez l'entree une fois le flux termine.",
    queuedBatchJobsConversationNoticeLabel: 'Note de continuite',
    queuedBatchJobsMonitorGroup: 'Suivi',
    queuedBatchJobsResultsGroup: 'Resultats',
    queuedBatchJobsCleanupGroup: 'Nettoyage',
    queuedBatchJobsDesc:
        "Les jobs officiels persistants Gemini Batch API restent suivis ici lorsqu'ils sont en attente ou en cours, afin d'avancer par verification d'etat, import des resultats et nettoyage.",
} as const;

const deQueuedBatchWordingBaseline = {
    queueBatchModeEditor:
        'Der Batchauftrag in der Warteschlange sendet einen offiziellen bildkonditionierten Batch auf Editor-Basis mit der aktuellen Editor-Basis und den vorbereiteten Referenzen.',
    queueBatchModeStage:
        'Der Batchauftrag in der Warteschlange sendet einen offiziellen bildkonditionierten Folge-Batch mit dem aktuellen Stufenbild und den vorbereiteten Referenzen.',
    queueBatchModeReferences:
        'Der Batchauftrag in der Warteschlange sendet einen offiziellen referenzgesteuerten Batch mit dem aktuellen Prompt und der Referenzablage.',
    queueBatchModePromptOnly:
        'Der Batchauftrag in der Warteschlange sendet einen offiziellen Batchauftrag nur mit Prompt.',
    queueBatchConversationNotice:
        'Batchauftrage in der Warteschlange behalten die Quellherkunft bei, senden aber keinen offiziellen Multi-Turn-Konversationsverlauf. Fur Chat-Fortsetzung verwenden Sie den normalen Generierungsablauf.',
    queuedBatchJobsWorkflowHint:
        'Uberwachen Sie die Warteschlange hier, holen Sie fertige Ergebnisse in den Verlauf, und entfernen Sie den Eintrag, sobald der Ablauf abgeschlossen ist.',
    queuedBatchJobsConversationNoticeLabel: 'Kontinuitatshinweis',
    queuedBatchJobsMonitorGroup: 'Uberwachung',
    queuedBatchJobsResultsGroup: 'Ergebnisse',
    queuedBatchJobsCleanupGroup: 'Bereinigen',
    queuedBatchJobsDesc:
        'Gespeicherte offizielle Gemini Batch API-Jobs bleiben hier im Blick, solange sie ausstehend oder in Ausfuhrung sind, sodass Statusprufung, Ergebnisimport und Aufraumen als Arbeitsablauf erfolgen konnen.',
} as const;

const ruQueuedBatchWordingBaseline = {
    queueBatchModeEditor:
        'Пакетная задача в очереди отправит официальный пакет с условием по изображению на основе редактора, используя текущую базу редактора и подготовленные референсы.',
    queueBatchModeStage:
        'Пакетная задача в очереди отправит официальный пакет с условием по изображению для продолжения, используя текущее изображение сцены и подготовленные референсы.',
    queueBatchModeReferences:
        'Пакетная задача в очереди отправит официальный пакет с опорой на референсы, используя текущий промпт и лоток референсов.',
    queueBatchModePromptOnly: 'Пакетная задача в очереди отправит официальный пакет только по промпту.',
    queueBatchConversationNotice:
        'Пакетные задачи в очереди сохраняют линию происхождения источника, но не отправляют официальный многходовый контекст диалога. Чтобы продолжить диалог, используйте обычную генерацию.',
    queuedBatchJobsWorkflowHint:
        'Следите здесь за очередью, переносите готовые результаты в историю, а после завершения работы очищайте эту запись.',
    queuedBatchJobsConversationNoticeLabel: 'Заметка о продолжении',
    queuedBatchJobsMonitorGroup: 'Контроль',
    queuedBatchJobsResultsGroup: 'Результаты',
    queuedBatchJobsCleanupGroup: 'Очистка',
    queuedBatchJobsDesc:
        'Сохраненные официальные задания Gemini Batch API остаются здесь под наблюдением, пока ждут или выполняются, чтобы пройти через проверку статуса, импорт результатов и очистку.',
} as const;

const zhTwLineageDescriptionBaseline = {
    lineageActionDescRoot: '目前的階段直接來自自己的根節點，沒有承接先前的分支動作。',
    lineageActionDescContinue: '這個階段會沿著目前分支繼續，作為下一次後續延伸的來源。',
    lineageActionDescBranch: '這個階段目前扮演分支來源，因此下一次生成可以分岔，同時保留目前提示詞編輯區內容。',
    lineageActionDescReopen: '這個階段是從歷史重新開啟，供檢視或重用，尚未隱含延續或分支。',
    lineageActionDescEditor: '這個階段帶有編輯器延續脈絡，因此後續延伸會持續錨定在已編輯的來源圖像上。',
    lineageActionDescReplay: '這個階段正在重播先前記錄的回合以供檢視。',
} as const;

const zhCnLineageDescriptionBaseline = {
    lineageActionDescRoot: '当前阶段直接来自自己的根节点，没有继承之前的分支动作。',
    lineageActionDescContinue: '这个阶段会沿当前分支继续，作为下一次后续延展的来源。',
    lineageActionDescBranch: '这个阶段当前充当分支来源，因此下一次生成可以分叉，同时保留当前提示词编辑区内容。',
    lineageActionDescReopen: '这个阶段是从历史重新打开以便查看或复用，尚未隐含延续或分支。',
    lineageActionDescEditor: '这个阶段带有编辑器延续脉络，因此后续延展会继续锚定在已编辑的源图像上。',
    lineageActionDescReplay: '这个阶段正在重播先前记录的回合以供查看。',
} as const;

const zhTwBranchRestoreBaseline = {
    branchRenameTitle: '重新命名延續脈絡分支',
    workspaceRestoreTurns: '{0} 個回合',
} as const;

const zhCnBranchRestoreBaseline = {
    branchRenameTitle: '重命名延续脉络分支',
    workspaceRestoreTurns: '{0} 个回合',
} as const;

const zhTwRestoreActionBaseline = {
    workspaceRestoreActionsHint:
        '你可以重新打開還原的鏈、把最新回合設為延續來源、從它分支，或清除還原的鏈但保留已恢復的提示詞編輯區設定。',
    workspaceRestoreOpenLatest: '開啟最新回合',
    workspaceRestoreContinueChain: '延續還原回合',
    workspaceRestoreBranch: '從還原回合分支',
} as const;

const zhCnRestoreActionBaseline = {
    workspaceRestoreActionsHint:
        '你可以重新打开恢复的链、把最新回合设为延续来源、从它分支，或清除恢复的链但保留已恢复的提示词编辑区设置。',
    workspaceRestoreOpenLatest: '打开最新回合',
    workspaceRestoreContinueChain: '延续恢复回合',
    workspaceRestoreBranch: '从恢复回合分支',
} as const;

const zhTwWorkspacePickerSupportBaseline = {
    workspacePickerModelSupportImageSearch: '支援已建立依據的圖片搜尋',
    workspacePickerModelSupportGoogleSearch: '支援 Google 搜尋脈絡依據',
} as const;

const zhCnWorkspacePickerSupportBaseline = {
    workspacePickerModelSupportImageSearch: '支持已建立依据的图片搜索',
    workspacePickerModelSupportGoogleSearch: '支持 Google 搜索脉络依据',
} as const;

const zhTwWorkspacePickerStageSourceBaseline = {
    workspacePickerEditorBaseHint: '可直接上傳一張，或重用目前的階段圖像。',
    workspacePickerStageSource: '階段來源',
    workspacePickerStageSourceHint:
        '目前階段與從歷史重新開啟的圖，現在都會進入同一套後續延伸來源模型，供編輯動作重用。',
    workspacePickerUseCurrentStageAsEditorBase: '將目前階段設為編輯底圖',
} as const;

const zhCnWorkspacePickerStageSourceBaseline = {
    workspacePickerEditorBaseHint: '可直接上传一张，或复用当前的阶段图像。',
    workspacePickerStageSource: '阶段来源',
    workspacePickerStageSourceHint:
        '当前阶段与从历史重新打开的图像，现在都会进入同一套后续延展来源模型，供编辑动作复用。',
    workspacePickerUseCurrentStageAsEditorBase: '将当前阶段设为编辑底图',
} as const;

const zhTwWorkspacePickerHelperBaseline = {
    workspacePickerSharedPromptPlaceholder: '在這裡更新共享提示詞。',
    workspacePickerCharacterHint: '角色參考會沿用同一套暫存匯入模型。',
    workspacePickerLoading: '正在載入選擇面板...',
} as const;

const zhCnWorkspacePickerHelperBaseline = {
    workspacePickerSharedPromptPlaceholder: '在这里更新共享提示词。',
    workspacePickerCharacterHint: '角色参考会沿用同一套暂存导入模型。',
    workspacePickerLoading: '正在加载选择面板...',
} as const;

const jaImportReviewExecutionLabelsBaseline = {
    workspaceImportReviewExecutionBatchVariants: 'バッチバリエーション',
    workspaceImportReviewExecutionChatContinuation: 'チャット継続',
    workspaceImportReviewExecutionQueuedBatchJob: 'キュー投入バッチ結果',
    workspaceImportReviewExecutionSingleTurn: '単一ターン',
} as const;

const koImportReviewExecutionLabelsBaseline = {
    workspaceImportReviewExecutionBatchVariants: '배치 변형',
    workspaceImportReviewExecutionChatContinuation: '채팅 연속',
    workspaceImportReviewExecutionQueuedBatchJob: '대기열 배치 결과',
    workspaceImportReviewExecutionSingleTurn: '단일 턴',
} as const;

const esImportReviewExecutionLabelsBaseline = {
    workspaceImportReviewExecutionBatchVariants: 'Variantes por lote',
    workspaceImportReviewExecutionChatContinuation: 'Continuacion de chat',
    workspaceImportReviewExecutionQueuedBatchJob: 'Resultado por lotes en cola',
    workspaceImportReviewExecutionSingleTurn: 'Un solo turno',
} as const;

const frImportReviewExecutionLabelsBaseline = {
    workspaceImportReviewExecutionBatchVariants: 'Variantes par lot',
    workspaceImportReviewExecutionChatContinuation: 'Continuation du chat',
    workspaceImportReviewExecutionQueuedBatchJob: "Resultat de lot en file d'attente",
    workspaceImportReviewExecutionSingleTurn: 'Un seul tour',
} as const;

const deImportReviewExecutionLabelsBaseline = {
    workspaceImportReviewExecutionBatchVariants: 'Stapelvarianten',
    workspaceImportReviewExecutionChatContinuation: 'Chat-Fortsetzung',
    workspaceImportReviewExecutionQueuedBatchJob: 'Warteschlangen-Batchergebnis',
    workspaceImportReviewExecutionSingleTurn: 'Einzelrunde',
} as const;

const ruImportReviewExecutionLabelsBaseline = {
    workspaceImportReviewExecutionBatchVariants: 'Пакетные варианты',
    workspaceImportReviewExecutionChatContinuation: 'Продолжение чата',
    workspaceImportReviewExecutionQueuedBatchJob: 'Результат пакетной очереди',
    workspaceImportReviewExecutionSingleTurn: 'Одиночный ход',
} as const;

const englishImportReviewExecutionLabelsBaseline = {
    workspaceImportReviewExecutionBatchVariants: 'Batch Variants',
    workspaceImportReviewExecutionChatContinuation: 'Chat Continuation',
    workspaceImportReviewExecutionQueuedBatchJob: 'Queued Batch Result',
    workspaceImportReviewExecutionSingleTurn: 'Single-turn',
} as const;

const jaWorkspaceSnapshotAndProvenanceBaseline = {
    workspaceSnapshotImportedNotice: '{0} からワークスペーススナップショットを読み込みました。',
    workspaceSnapshotImportedLog: '{0} からワークスペーススナップショットを読み込みました（{1} 件のターン）。',
    workspaceSnapshotMergedNotice: '{0} から読み込んだターンを現在のワークスペースへ統合しました。',
    workspaceSnapshotExportedNotice: '{0} 件のターンを含むワークスペーススナップショットを書き出しました。',
    workspaceSnapshotExportFailed: '現在のワークスペーススナップショットの書き出しに失敗しました。',
    workspaceSnapshotImportReadTextFailed:
        'スナップショットのインポートに失敗しました。ファイルをテキストとして読み込めませんでした。',
    workspaceSnapshotImportInvalidFormat: 'スナップショットのインポートに失敗しました。ファイル形式が無効です。',
    workspaceSnapshotImportReadFailed: '選択したファイルの読み込み中にスナップショットのインポートに失敗しました。',
    historySourceContinueNotice: '履歴ターンが現在のアクティブな継続元になりました。',
    historySourceBranchNotice: '履歴ターンを新しい分岐元として準備し、コンポーザー設定を保持しました。',
    historySourceReopenNotice: '履歴ターンを現在のステージソースとして開き直しました。',
    workspaceInsightsContinuityProvenanceInherited: '継承された由来情報',
    workspaceInsightsContinuityGroundingMetadata: 'グラウンディング メタデータ',
    workspaceInsightsContinuityGroundingSupports: 'グラウンディング支援情報',
} as const;

const koWorkspaceSnapshotAndProvenanceBaseline = {
    workspaceSnapshotImportedNotice: '{0}에서 워크스페이스 스냅샷을 가져왔습니다.',
    workspaceSnapshotImportedLog: '{0}에서 워크스페이스 스냅샷을 가져왔습니다 ({1}개 턴).',
    workspaceSnapshotMergedNotice: '{0}에서 가져온 턴을 현재 워크스페이스에 병합했습니다.',
    workspaceSnapshotExportedNotice: '{0}개 턴이 포함된 워크스페이스 스냅샷을 내보냈습니다.',
    workspaceSnapshotExportFailed: '현재 워크스페이스 스냅샷을 내보내지 못했습니다.',
    workspaceSnapshotImportReadTextFailed: '파일을 텍스트로 읽을 수 없어 스냅샷 가져오기에 실패했습니다.',
    workspaceSnapshotImportInvalidFormat: '파일 형식이 올바르지 않아 스냅샷 가져오기에 실패했습니다.',
    workspaceSnapshotImportReadFailed: '선택한 파일을 읽는 동안 스냅샷 가져오기에 실패했습니다.',
    historySourceContinueNotice: '기록 턴이 현재 활성 연속 원본이 되었습니다.',
    historySourceBranchNotice: '기록 턴을 새 분기 원본으로 준비했고 컴포저 설정을 유지했습니다.',
    historySourceReopenNotice: '기록 턴을 현재 스테이지 소스로 다시 열었습니다.',
    workspaceInsightsContinuityProvenanceInherited: '상속된 출처 정보',
    workspaceInsightsContinuityGroundingMetadata: '그라운딩 메타데이터',
    workspaceInsightsContinuityGroundingSupports: '그라운딩 지원 정보',
} as const;

const esWorkspaceSnapshotAndProvenanceBaseline = {
    workspaceSnapshotImportedNotice: 'Se importo la instantanea del espacio de trabajo desde {0}.',
    workspaceSnapshotImportedLog: 'Se importo la instantanea del espacio de trabajo desde {0} ({1} turnos).',
    workspaceSnapshotMergedNotice: 'Los turnos importados de {0} se fusionaron en el espacio de trabajo actual.',
    workspaceSnapshotExportedNotice: 'Se exporto la instantanea del espacio de trabajo con {0} turnos.',
    workspaceSnapshotExportFailed: 'No se pudo exportar la instantanea actual del espacio de trabajo.',
    workspaceSnapshotImportReadTextFailed:
        'La importacion de la instantanea fallo porque no se pudo leer el archivo como texto.',
    workspaceSnapshotImportInvalidFormat:
        'La importacion de la instantanea fallo porque el formato del archivo no es valido.',
    workspaceSnapshotImportReadFailed: 'La importacion de la instantanea fallo al leer el archivo seleccionado.',
    historySourceContinueNotice: 'El turno del historial ahora es la fuente activa de continuacion.',
    historySourceBranchNotice:
        'El turno del historial se preparo como nueva fuente de rama y se conservo la configuracion del compositor.',
    historySourceReopenNotice: 'El turno del historial se reabrio como origen actual de la escena.',
    workspaceInsightsContinuityProvenanceInherited: 'procedencia heredada',
    workspaceInsightsContinuityGroundingMetadata: 'metadatos de contexto',
    workspaceInsightsContinuityGroundingSupports: 'soportes de contexto',
} as const;

const frWorkspaceSnapshotAndProvenanceBaseline = {
    workspaceSnapshotImportedNotice: "L'instantane de l'espace de travail a ete importe depuis {0}.",
    workspaceSnapshotImportedLog: "L'instantane de l'espace de travail a ete importe depuis {0} ({1} tours).",
    workspaceSnapshotMergedNotice: "Les tours importes depuis {0} ont ete fusionnes dans l'espace de travail actuel.",
    workspaceSnapshotExportedNotice: "L'instantane de l'espace de travail a ete exporte avec {0} tours.",
    workspaceSnapshotExportFailed: "L'exportation de l'instantane actuel de l'espace de travail a echoue.",
    workspaceSnapshotImportReadTextFailed:
        "L'importation de l'instantane a echoue car le fichier n'a pas pu etre lu comme texte.",
    workspaceSnapshotImportInvalidFormat:
        "L'importation de l'instantane a echoue car le format du fichier est invalide.",
    workspaceSnapshotImportReadFailed:
        "L'importation de l'instantane a echoue pendant la lecture du fichier selectionne.",
    historySourceContinueNotice: "Le tour d'historique est maintenant la source active de continuation.",
    historySourceBranchNotice:
        "Le tour d'historique a ete prepare comme nouvelle source de branche et les reglages du compositeur ont ete conserves.",
    historySourceReopenNotice: "Le tour d'historique a ete rouvert comme source actuelle de la scene.",
} as const;

const deWorkspaceSnapshotAndProvenanceBaseline = {
    workspaceSnapshotImportedNotice: 'Schnappschuss des Arbeitsbereichs aus {0} importiert.',
    workspaceSnapshotImportedLog: 'Schnappschuss des Arbeitsbereichs aus {0} importiert ({1} Runden).',
    workspaceSnapshotMergedNotice:
        'Importierte Runden aus {0} wurden in den aktuellen Arbeitsbereich zusammengefuehrt.',
    workspaceSnapshotExportedNotice: 'Schnappschuss des Arbeitsbereichs mit {0} Runden exportiert.',
    workspaceSnapshotExportFailed: 'Export des aktuellen Arbeitsbereich-Schnappschusses fehlgeschlagen.',
    workspaceSnapshotImportReadTextFailed:
        'Import des Schnappschusses fehlgeschlagen, weil die Datei nicht als Text gelesen werden konnte.',
    workspaceSnapshotImportInvalidFormat:
        'Import des Schnappschusses fehlgeschlagen, weil das Dateiformat ungueltig ist.',
    workspaceSnapshotImportReadFailed: 'Import des Schnappschusses beim Lesen der ausgewahlten Datei fehlgeschlagen.',
    historySourceContinueNotice: 'Verlaufsrunde ist jetzt die aktive Fortsetzungsquelle.',
    historySourceBranchNotice:
        'Verlaufsrunde als neue Verzweigungsquelle vorgemerkt; die Kompositions-Einstellungen wurden beibehalten.',
    historySourceReopenNotice: 'Verlaufsrunde erneut als aktuelle Szenenquelle geoeffnet.',
    workspaceInsightsContinuityProvenanceInherited: 'vererbte Herkunft',
    workspaceInsightsContinuityGroundingMetadata: 'Kontext-Metadaten',
    workspaceInsightsContinuityGroundingSupports: 'Kontext-Unterstuetzungen',
} as const;

const ruWorkspaceSnapshotAndProvenanceBaseline = {
    workspaceSnapshotImportedNotice: 'Снимок рабочего пространства импортирован из {0}.',
    workspaceSnapshotImportedLog: 'Снимок рабочего пространства импортирован из {0} ({1} ходов).',
    workspaceSnapshotMergedNotice: 'Импортированные ходы из {0} объединены с текущим рабочим пространством.',
    workspaceSnapshotExportedNotice: 'Снимок рабочего пространства экспортирован ({0} ходов).',
    workspaceSnapshotExportFailed: 'Не удалось экспортировать текущий снимок рабочего пространства.',
    workspaceSnapshotImportReadTextFailed: 'Не удалось импортировать снимок: файл не удалось прочитать как текст.',
    workspaceSnapshotImportInvalidFormat: 'Не удалось импортировать снимок: формат файла недействителен.',
    workspaceSnapshotImportReadFailed: 'Не удалось импортировать снимок при чтении выбранного файла.',
    historySourceContinueNotice: 'Ход из истории теперь является активным источником продолжения.',
    historySourceBranchNotice: 'Ход из истории подготовлен как новый источник ветки; настройки компоновщика сохранены.',
    historySourceReopenNotice: 'Ход из истории снова открыт как текущий источник сцены.',
    workspaceInsightsContinuityProvenanceInherited: 'унаследованные сведения об источнике',
    workspaceInsightsContinuityGroundingMetadata: 'метаданные контекста',
    workspaceInsightsContinuityGroundingSupports: 'поддержка контекста',
} as const;

const jaGroundingProvenanceContinuityBaseline = {
    groundingProvenanceContinuityInherited:
        '現在表示しているグラウンディング根拠は、このワークスペース セッション内の直前の互換ターンから引き継がれています。',
    groundingProvenanceContinuityLive:
        '現在表示しているグラウンディング根拠は、アクティブなセッションターンから直接返されたものです。',
    groundingProvenanceContinuityInactive: 'このセッションでは、まだグラウンディング継続が有効になっていません。',
    groundingProvenanceModeInherited: '継承',
    groundingProvenanceModeLive: 'ライブ',
    groundingProvenanceModeInactive: '非アクティブ',
    groundingProvenanceNone: 'この結果には利用可能な由来情報がありません。',
    groundingProvenanceSelectionBundle: 'サポートバンドル {0} を選択中です。対応するソースがハイライト表示されます。',
    groundingProvenanceSelectionSource:
        '選択したソースにより、{0} を引用しているサポートバンドルがハイライト表示されます。',
} as const;

const koGroundingProvenanceContinuityBaseline = {
    groundingProvenanceContinuityInherited:
        '현재 표시되는 그라운딩 근거는 이 워크스페이스 세션의 이전 호환 턴에서 이어받은 것입니다.',
    groundingProvenanceContinuityLive: '현재 표시되는 그라운딩 근거는 활성 세션 턴에서 직접 반환된 것입니다.',
    groundingProvenanceContinuityInactive: '이 세션에서는 아직 그라운딩 연속성이 활성화되지 않았습니다.',
    groundingProvenanceModeInherited: '상속됨',
    groundingProvenanceModeLive: '실시간',
    groundingProvenanceModeInactive: '비활성',
    groundingProvenanceNone: '이 결과에는 사용 가능한 출처 정보가 없습니다.',
    groundingProvenanceSelectionBundle: '지원 번들 {0}이(가) 선택되었습니다. 일치하는 소스가 강조 표시됩니다.',
    groundingProvenanceSelectionSource: '선택한 소스는 {0}을(를) 인용하는 지원 번들을 강조 표시합니다.',
} as const;

const esGroundingProvenanceContinuityBaseline = {
    groundingProvenanceContinuityInherited:
        'La evidencia de fundamentacion mostrada actualmente se heredo del turno compatible anterior en esta sesion del espacio de trabajo.',
    groundingProvenanceContinuityLive:
        'La evidencia de fundamentacion mostrada actualmente fue devuelta directamente por el turno activo de la sesion.',
    groundingProvenanceContinuityInactive: 'Esta sesion todavia no tiene activada la continuidad de fundamentacion.',
    groundingProvenanceModeInherited: 'Heredado',
    groundingProvenanceModeLive: 'Activo',
    groundingProvenanceModeInactive: 'Inactivo',
    groundingProvenanceNone: 'Este resultado no tiene informacion de procedencia disponible.',
    groundingProvenanceSelectionBundle:
        'Se ha seleccionado el bloque de soporte {0}. Las fuentes coincidentes se resaltan.',
    groundingProvenanceSelectionSource: 'La fuente seleccionada resalta los bloques de soporte que citan {0}.',
} as const;

const frGroundingProvenanceContinuityBaseline = {
    groundingProvenanceContinuityInherited:
        "La preuve de contexte actuellement affichee est heritee du tour compatible precedent dans cette session de l'espace de travail.",
    groundingProvenanceContinuityLive:
        'La preuve de contexte actuellement affichee a ete renvoyee directement par le tour de session actif.',
    groundingProvenanceContinuityInactive: "Cette session n'a pas encore active la continuite de contexte.",
    groundingProvenanceModeInherited: 'Herite',
    groundingProvenanceModeLive: 'Actif',
    groundingProvenanceModeInactive: 'Inactif',
    groundingProvenanceNone: "Aucune information de provenance n'est disponible pour ce resultat.",
    groundingProvenanceSelectionBundle:
        'Le bloc de support {0} est selectionne. Les sources correspondantes sont mises en evidence.',
    groundingProvenanceSelectionSource: 'La source selectionnee met en evidence les blocs de support qui citent {0}.',
} as const;

const deGroundingProvenanceContinuityBaseline = {
    groundingProvenanceContinuityInherited:
        'Die aktuell angezeigten Verankerungsnachweise wurden von der vorherigen kompatiblen Runde in dieser Arbeitsbereichssitzung ubernommen.',
    groundingProvenanceContinuityLive:
        'Die aktuell angezeigten Verankerungsnachweise wurden direkt von der aktiven Sitzungsrunde zuruckgegeben.',
    groundingProvenanceContinuityInactive: 'In dieser Sitzung ist die Verankerungs-Kontinuitat noch nicht aktiviert.',
    groundingProvenanceModeInherited: 'Geerbt',
    groundingProvenanceModeLive: 'Aktiv',
    groundingProvenanceModeInactive: 'Inaktiv',
    groundingProvenanceNone: 'Fur dieses Ergebnis sind keine Herkunftsinformationen verfugbar.',
    groundingProvenanceSelectionBundle:
        'Unterstuetzungsbundle {0} ist ausgewaehlt. Passende Quellen werden hervorgehoben.',
    groundingProvenanceSelectionSource:
        'Die ausgewaehlte Quelle hebt die Unterstuetzungsbundles hervor, die {0} zitieren.',
} as const;

const ruGroundingProvenanceContinuityBaseline = {
    groundingProvenanceContinuityInherited:
        'Сейчас показаны унаследованные доказательства граундинга из предыдущего совместимого хода в этой сессии рабочего пространства.',
    groundingProvenanceContinuityLive:
        'Сейчас показаны доказательства граундинга, напрямую возвращенные активным ходом сессии.',
    groundingProvenanceContinuityInactive: 'В этой сессии продолжение граундинга пока не включено.',
    groundingProvenanceModeInherited: 'Унаследовано',
    groundingProvenanceModeLive: 'Активно',
    groundingProvenanceModeInactive: 'Неактивно',
    groundingProvenanceNone: 'Для этого результата нет доступных сведений об источнике.',
    groundingProvenanceSelectionBundle: 'Выбран пакет поддержки {0}. Подходящие источники подсвечены.',
    groundingProvenanceSelectionSource:
        'Выбранный источник подсвечивает все пакеты поддержки, которые ссылаются на {0}.',
} as const;

const jaGroundingProvenanceDetailReuseBaseline = {
    groundingProvenanceInsightRequestedSize: '要求サイズ',
    groundingProvenanceInsightActualOutput: '実際の出力',
    groundingProvenanceCitedDetail: '引用ディテール: {0}',
    groundingProvenanceSources: 'ソース: {0}',
    groundingProvenanceReferenceSource: '参照ソース: {0}（{1}）',
    groundingProvenanceReuseSupportBundle: 'サポートバンドル {0}',
    groundingProvenanceReuseSource: 'ソース {0}',
    groundingProvenanceReuseDetail: 'グラウンディング詳細',
    groundingProvenanceSelectFirst: '最初にソースまたはサポートバンドルを選択してください。',
    groundingProvenanceReferenceCue: '参照キュー: {0}',
    groundingProvenanceAppendNotice: 'グラウンディング詳細をコンポーザーに追加しました。',
    groundingProvenanceAppendLog: 'グラウンディング詳細を {0} からコンポーザーに追加しました。',
    groundingProvenanceReplaceNotice: '選択したグラウンディング詳細でコンポーザープロンプトを置き換えました。',
    groundingProvenanceReplaceLog: 'コンポーザープロンプトを {0} から置き換えました。',
} as const;

const koGroundingProvenanceDetailReuseBaseline = {
    groundingProvenanceInsightRequestedSize: '요청 크기',
    groundingProvenanceInsightActualOutput: '실제 출력',
    groundingProvenanceCitedDetail: '인용 세부 정보: {0}',
    groundingProvenanceSources: '소스: {0}',
    groundingProvenanceReferenceSource: '참조 소스: {0} ({1})',
    groundingProvenanceReuseSupportBundle: '지원 번들 {0}',
    groundingProvenanceReuseSource: '소스 {0}',
    groundingProvenanceReuseDetail: '그라운딩 세부 정보',
    groundingProvenanceSelectFirst: '먼저 소스나 지원 번들을 선택하세요.',
    groundingProvenanceReferenceCue: '참조 단서: {0}',
    groundingProvenanceAppendNotice: '그라운딩 세부 정보를 컴포저에 추가했습니다.',
    groundingProvenanceAppendLog: '{0}에서 그라운딩 세부 정보를 컴포저에 추가했습니다.',
    groundingProvenanceReplaceNotice: '선택한 그라운딩 세부 정보로 컴포저 프롬프트를 교체했습니다.',
    groundingProvenanceReplaceLog: '{0}에서 컴포저 프롬프트를 교체했습니다.',
} as const;

const esGroundingProvenanceDetailReuseBaseline = {
    groundingProvenanceInsightRequestedSize: 'Tamano solicitado',
    groundingProvenanceInsightActualOutput: 'Salida real',
    groundingProvenanceCitedDetail: 'Detalle citado: {0}',
    groundingProvenanceSources: 'Fuentes: {0}',
    groundingProvenanceReferenceSource: 'Fuente de referencia: {0} ({1})',
    groundingProvenanceReuseSupportBundle: 'bloque de soporte {0}',
    groundingProvenanceReuseSource: 'fuente {0}',
    groundingProvenanceReuseDetail: 'detalle de fundamentacion',
    groundingProvenanceSelectFirst: 'Selecciona primero una fuente o un bloque de soporte.',
    groundingProvenanceReferenceCue: 'Pista de referencia: {0}',
    groundingProvenanceAppendNotice: 'Se agrego el detalle de fundamentacion al compositor.',
    groundingProvenanceAppendLog: 'Se agrego el detalle de fundamentacion al compositor desde {0}.',
    groundingProvenanceReplaceNotice:
        'El prompt del compositor se reemplazo con el detalle de fundamentacion seleccionado.',
    groundingProvenanceReplaceLog: 'El prompt del compositor se reemplazo desde {0}.',
} as const;

const frGroundingProvenanceDetailReuseBaseline = {
    groundingProvenanceInsightRequestedSize: 'Taille demandee',
    groundingProvenanceInsightActualOutput: 'Sortie reelle',
    groundingProvenanceCitedDetail: 'Detail cite : {0}',
    groundingProvenanceSources: 'Sources : {0}',
    groundingProvenanceReferenceSource: 'Source de reference : {0} ({1})',
    groundingProvenanceReuseSupportBundle: 'bloc de support {0}',
    groundingProvenanceReuseSource: 'source {0}',
    groundingProvenanceReuseDetail: 'detail de contexte',
    groundingProvenanceSelectFirst: "Selectionnez d'abord une source ou un bloc de support.",
    groundingProvenanceReferenceCue: 'Indice de reference : {0}',
    groundingProvenanceAppendNotice: 'Le detail de contexte a ete ajoute au compositeur.',
    groundingProvenanceAppendLog: 'Le detail de contexte a ete ajoute au compositeur depuis {0}.',
    groundingProvenanceReplaceNotice: 'Le prompt du compositeur a ete remplace par le detail de contexte selectionne.',
    groundingProvenanceReplaceLog: 'Le prompt du compositeur a ete remplace depuis {0}.',
} as const;

const deGroundingProvenanceDetailReuseBaseline = {
    groundingProvenanceInsightRequestedSize: 'Angeforderte Grosse',
    groundingProvenanceInsightActualOutput: 'Tatsachliche Ausgabe',
    groundingProvenanceCitedDetail: 'Zitiertes Detail: {0}',
    groundingProvenanceSources: 'Quellen: {0}',
    groundingProvenanceReferenceSource: 'Referenzquelle: {0} ({1})',
    groundingProvenanceReuseSupportBundle: 'Unterstutzungsbundel {0}',
    groundingProvenanceReuseSource: 'Quelle {0}',
    groundingProvenanceReuseDetail: 'Verankerungsdetail',
    groundingProvenanceSelectFirst: 'Wahlen Sie zuerst eine Quelle oder ein Unterstutzungsbundel aus.',
    groundingProvenanceReferenceCue: 'Referenzhinweis: {0}',
    groundingProvenanceAppendNotice: 'Verankerungsdetail zum Kompositionsfeld hinzugefugt.',
    groundingProvenanceAppendLog: 'Verankerungsdetail aus {0} zum Kompositionsfeld hinzugefugt.',
    groundingProvenanceReplaceNotice: 'Kompositions-Prompt durch das ausgewahlte Verankerungsdetail ersetzt.',
    groundingProvenanceReplaceLog: 'Kompositions-Prompt aus {0} ersetzt.',
} as const;

const ruGroundingProvenanceDetailReuseBaseline = {
    groundingProvenanceInsightRequestedSize: 'Запрошенный размер',
    groundingProvenanceInsightActualOutput: 'Фактический вывод',
    groundingProvenanceCitedDetail: 'Цитируемая деталь: {0}',
    groundingProvenanceSources: 'Источники: {0}',
    groundingProvenanceReferenceSource: 'Источник-референс: {0} ({1})',
    groundingProvenanceReuseSupportBundle: 'пакет поддержки {0}',
    groundingProvenanceReuseSource: 'источник {0}',
    groundingProvenanceReuseDetail: 'деталь граундинга',
    groundingProvenanceSelectFirst: 'Сначала выберите источник или пакет поддержки.',
    groundingProvenanceReferenceCue: 'Опорная подсказка: {0}',
    groundingProvenanceAppendNotice: 'Деталь граундинга добавлена в компоновщик.',
    groundingProvenanceAppendLog: 'Деталь граундинга добавлена в компоновщик из {0}.',
    groundingProvenanceReplaceNotice: 'Промпт компоновщика заменен выбранной деталью граундинга.',
    groundingProvenanceReplaceLog: 'Промпт компоновщика заменен из {0}.',
} as const;

const jaGroundingProvenanceLongformBaseline = {
    groundingProvenanceThoughtVisible: 'この結果では表示可能な思考内容が返されました。',
    groundingProvenanceThoughtHiddenSignature:
        'この結果には非表示の思考シグネチャがありますが、表示可能な思考テキストはありません。',
    groundingProvenanceThoughtRequestedNone:
        '思考内容を要求しましたが、この結果ではモデルが思考アーティファクトを返しませんでした。',
    groundingProvenanceThoughtNotRequested: 'この結果では思考内容は要求されていません。',
    groundingProvenanceGroundingSourcesReturned: 'この結果ではグラウンディングされたソースが返されました。',
    groundingProvenanceGroundingQueriesNoSources:
        'この結果ではグラウンディング クエリが発行されましたが、帰属できるソースは返されませんでした。',
    groundingProvenanceGroundingMetadataNoSources:
        'この結果ではグラウンディング メタデータが返されましたが、公開されたソースリンクはありません。',
    groundingProvenanceGroundingRequestedNone:
        'この結果ではグラウンディングを要求しましたが、グラウンディング メタデータは返されませんでした。',
    groundingProvenanceGroundingNotRequested: 'この結果ではグラウンディングは要求されていません。',
    groundingProvenanceSupportBundlesUsed:
        'グラウンディングのサポートバンドルは、取得されたどのソースが実際に使われたかを示します。',
    groundingProvenanceSupportMetadataNoBundles:
        'グラウンディングのサポート メタデータは返されましたが、表示可能なサポートバンドルは抽出されませんでした。',
    groundingProvenanceSupportNone: 'この結果ではグラウンディングのサポートバンドルは返されませんでした。',
} as const;

const koGroundingProvenanceLongformBaseline = {
    groundingProvenanceThoughtVisible: '이 결과에서는 보이는 생각 내용이 반환되었습니다.',
    groundingProvenanceThoughtHiddenSignature: '이 결과에는 숨겨진 생각 서명이 있지만, 보이는 생각 텍스트는 없습니다.',
    groundingProvenanceThoughtRequestedNone:
        '생각 내용을 요청했지만, 이 결과에 대해 모델이 생각 아티팩트를 반환하지 않았습니다.',
    groundingProvenanceThoughtNotRequested: '이 결과에서는 생각 내용을 요청하지 않았습니다.',
    groundingProvenanceGroundingSourcesReturned: '이 결과에서는 그라운딩된 소스가 반환되었습니다.',
    groundingProvenanceGroundingQueriesNoSources:
        '이 결과에서는 그라운딩 질의가 실행되었지만, 귀속 가능한 소스는 반환되지 않았습니다.',
    groundingProvenanceGroundingMetadataNoSources:
        '이 결과에서는 그라운딩 메타데이터가 반환되었지만, 공개된 소스 링크는 없었습니다.',
    groundingProvenanceGroundingRequestedNone:
        '이 결과에서는 그라운딩을 요청했지만, 그라운딩 메타데이터는 반환되지 않았습니다.',
    groundingProvenanceGroundingNotRequested: '이 결과에서는 그라운딩을 요청하지 않았습니다.',
    groundingProvenanceSupportBundlesUsed: '그라운딩 지원 번들은 검색된 어떤 소스가 실제로 사용되었는지 보여줍니다.',
    groundingProvenanceSupportMetadataNoBundles:
        '그라운딩 지원 메타데이터는 반환되었지만, 표시할 수 있는 지원 번들은 추출되지 않았습니다.',
    groundingProvenanceSupportNone: '이 결과에서는 그라운딩 지원 번들이 반환되지 않았습니다.',
} as const;

const esGroundingProvenanceLongformBaseline = {
    groundingProvenanceThoughtVisible: 'Se devolvieron pensamientos visibles para este resultado.',
    groundingProvenanceThoughtHiddenSignature:
        'Este resultado incluyo una firma de pensamiento oculta, pero no texto de pensamiento visible.',
    groundingProvenanceThoughtRequestedNone:
        'Aunque se solicitaron pensamientos, el modelo no devolvio artefactos de pensamiento para este resultado.',
    groundingProvenanceThoughtNotRequested: 'No se solicitaron pensamientos para este resultado.',
    groundingProvenanceGroundingSourcesReturned: 'Se devolvieron fuentes fundamentadas para este resultado.',
    groundingProvenanceGroundingQueriesNoSources:
        'Este resultado emitio consultas de fundamentacion, pero no devolvio fuentes atribuibles.',
    groundingProvenanceGroundingMetadataNoSources:
        'Este resultado devolvio metadatos de fundamentacion, pero no expuso enlaces de fuentes.',
    groundingProvenanceGroundingRequestedNone:
        'Este resultado solicito fundamentacion, pero no devolvio metadatos de fundamentacion.',
    groundingProvenanceGroundingNotRequested: 'No se solicito fundamentacion para este resultado.',
    groundingProvenanceSupportBundlesUsed:
        'Los bloques de soporte de fundamentacion muestran que fuentes recuperadas se usaron realmente.',
    groundingProvenanceSupportMetadataNoBundles:
        'Se devolvieron metadatos de soporte de fundamentacion, pero no se extrajeron bloques de soporte visibles.',
    groundingProvenanceSupportNone: 'No se devolvieron bloques de soporte de fundamentacion para este resultado.',
} as const;

const frGroundingProvenanceLongformBaseline = {
    groundingProvenanceThoughtVisible: 'Des pensees visibles ont ete renvoyees pour ce resultat.',
    groundingProvenanceThoughtHiddenSignature:
        'Ce resultat contenait une signature de pensee masquee, mais aucun texte de pensee visible.',
    groundingProvenanceThoughtRequestedNone:
        "Des pensees avaient ete demandees, mais le modele n'a renvoye aucun artefact de pensee pour ce resultat.",
    groundingProvenanceThoughtNotRequested: "Aucune pensee n'a ete demandee pour ce resultat.",
    groundingProvenanceGroundingSourcesReturned: 'Des sources de contexte ont ete renvoyees pour ce resultat.',
    groundingProvenanceGroundingQueriesNoSources:
        "Ce resultat a emis des requetes de contexte, mais n'a renvoye aucune source attribuable.",
    groundingProvenanceGroundingMetadataNoSources:
        "Ce resultat a renvoye des metadonnees de contexte, mais n'a expose aucun lien de source.",
    groundingProvenanceGroundingRequestedNone:
        "Ce resultat demandait un contexte, mais aucune metadonnee de contexte n'a ete renvoyee.",
    groundingProvenanceGroundingNotRequested: "Aucun contexte n'a ete demande pour ce resultat.",
    groundingProvenanceSupportBundlesUsed:
        'Les blocs de support de contexte montrent quelles sources recuperees ont reellement ete utilisees.',
    groundingProvenanceSupportMetadataNoBundles:
        "Des metadonnees de support de contexte ont ete renvoyees, mais aucun bloc de support affichable n'a ete extrait.",
    groundingProvenanceSupportNone: "Aucun bloc de support de contexte n'a ete renvoye pour ce resultat.",
} as const;

const deGroundingProvenanceLongformBaseline = {
    groundingProvenanceThoughtVisible: 'Sichtbare Gedanken wurden fur dieses Ergebnis zuruckgegeben.',
    groundingProvenanceThoughtHiddenSignature:
        'Dieses Ergebnis enthielt eine verborgene Gedankensignatur, aber keinen sichtbaren Gedankentext.',
    groundingProvenanceThoughtRequestedNone:
        'Obwohl Gedanken angefordert wurden, hat das Modell fur dieses Ergebnis keine Gedankenartefakte zuruckgegeben.',
    groundingProvenanceThoughtNotRequested: 'Fur dieses Ergebnis wurden keine Gedanken angefordert.',
    groundingProvenanceGroundingSourcesReturned: 'Fur dieses Ergebnis wurden verankerte Quellen zuruckgegeben.',
    groundingProvenanceGroundingQueriesNoSources:
        'Dieses Ergebnis hat Verankerungsabfragen ausgegeben, aber keine zuordenbaren Quellen zuruckgegeben.',
    groundingProvenanceGroundingMetadataNoSources:
        'Dieses Ergebnis hat Verankerungs-Metadaten zuruckgegeben, aber keine Quellenlinks offengelegt.',
    groundingProvenanceGroundingRequestedNone:
        'Fur dieses Ergebnis wurde Verankerung angefordert, aber es wurden keine Verankerungs-Metadaten zuruckgegeben.',
    groundingProvenanceGroundingNotRequested: 'Fur dieses Ergebnis wurde keine Verankerung angefordert.',
    groundingProvenanceSupportBundlesUsed:
        'Verankerungs-Unterstutzungsbundel zeigen, welche abgerufenen Quellen tatsachlich verwendet wurden.',
    groundingProvenanceSupportMetadataNoBundles:
        'Es wurden Verankerungs-Unterstutzungsmetadaten zuruckgegeben, aber keine anzeigbaren Unterstutzungsbundel extrahiert.',
    groundingProvenanceSupportNone: 'Fur dieses Ergebnis wurden keine Verankerungs-Unterstutzungsbundel zuruckgegeben.',
} as const;

const ruGroundingProvenanceLongformBaseline = {
    groundingProvenanceThoughtVisible: 'Для этого результата были возвращены видимые мысли.',
    groundingProvenanceThoughtHiddenSignature:
        'Этот результат содержал скрытую сигнатуру мыслей, но без видимого текста мыслей.',
    groundingProvenanceThoughtRequestedNone:
        'Хотя мысли были запрошены, модель не вернула артефакты мыслей для этого результата.',
    groundingProvenanceThoughtNotRequested: 'Для этого результата мысли не запрашивались.',
    groundingProvenanceGroundingSourcesReturned: 'Для этого результата были возвращены источники граундинга.',
    groundingProvenanceGroundingQueriesNoSources:
        'Для этого результата были выполнены запросы граундинга, но не были возвращены источники, которые можно привязать.',
    groundingProvenanceGroundingMetadataNoSources:
        'Для этого результата были возвращены метаданные граундинга, но ссылки на источники не были раскрыты.',
    groundingProvenanceGroundingRequestedNone:
        'Для этого результата был запрошен граундинг, но метаданные граундинга не были возвращены.',
    groundingProvenanceGroundingNotRequested: 'Для этого результата граундинг не запрашивался.',
    groundingProvenanceSupportBundlesUsed:
        'Пакеты поддержки граундинга показывают, какие найденные источники действительно использовались.',
    groundingProvenanceSupportMetadataNoBundles:
        'Метаданные поддержки граундинга были возвращены, но отображаемые пакеты поддержки извлечь не удалось.',
    groundingProvenanceSupportNone: 'Для этого результата пакеты поддержки граундинга не были возвращены.',
} as const;

const jaGroundingPanelProvenanceBaseline = {
    provenanceCarryForwardLog: '前のグラウンディング済みターンから由来の継続状態を引き継ぎました。',
    groundingPanelContinuitySummary: '継続サマリー',
    groundingPanelAttributionOverview: '帰属概要',
    groundingPanelAttributionCoverage: 'カバレッジ',
    groundingPanelAttributionCoverageValue: '{0}/{1} 件を引用',
    groundingPanelAttributionSourceMix: 'ソース構成',
    groundingPanelAttributionQueries: 'クエリ',
    groundingPanelAttributionEntryPoint: 'エントリポイント',
    groundingPanelAttributionEntryPointRendered: 'レンダリング済みプレビューあり',
    groundingPanelAttributionEntryPointAvailable: 'レンダリング済みプレビューなしで利用可能',
    groundingPanelAttributionEntryPointNotReturned: '返却なし',
    groundingPanelAttributionEntryPointNotRequested: '未要求',
    groundingPanelAttributionSourceTypeWeb: 'ウェブ',
    groundingPanelAttributionSourceTypeImage: '画像',
    groundingPanelAttributionSourceTypeContext: 'コンテキスト',
    groundingPanelAttributionWebQueries: 'ウェブ',
    groundingPanelAttributionImageQueries: '画像',
    groundingPanelAttributionNoSources: 'ソースなし',
    groundingPanelAttributionNoSourcesToCompare: '比較するソースがありません',
    groundingPanelAttributionNoQueriesShort: 'クエリなし',
    groundingPanelAttributionEntryPointStatus: '検索エントリポイントの状態: {0}',
    groundingPanelAttributionSourceStatus: 'ソース引用状態',
    groundingPanelAttributionSourceStatusValue: '{0} 件引用 · {1} 件は取得のみ',
    groundingPanelAttributionStatus: '帰属状態',
    groundingPanelUncitedSourcesSection: '取得済みだが未引用',
    groundingPanelUncitedSourcesHint:
        'このソースはグラウンディング メタデータとして取得されましたが、返却されたサポートバンドルでは直接引用されていません。',
    groundingPanelProvenanceSource: '由来ソース',
    groundingPanelCitationDetail: '引用詳細',
    groundingPanelEmptyDetail:
        'ソースまたはサポートバンドルを選択すると、セグメント単位の帰属を確認し、コンポーザーで再利用できます。',
    groundingPanelSourcesSection: 'ソース',
    groundingPanelCoverageSection: 'カバレッジ',
    groundingPanelQueriesSection: 'クエリ',
    groundingPanelNoQueries: 'モデルが返したグラウンディング クエリ語はここに表示されます。',
    groundingPanelSearchEntryPoint: '検索エントリポイント',
    groundingPanelSelectedSourceState: '選択中のソース',
    groundingPanelCoveredBySelectedBundleState: '選択中のサポートバンドルに含まれる',
    groundingPanelSourceStatusCited: '引用済み',
    groundingPanelSourceStatusRetrievedOnly: '取得のみ',
    groundingPanelSourceIndex: 'ソース {0}',
    groundingPanelOpenSource: 'ソースを開く',
    groundingPanelSupportBundleTitle: 'サポートバンドル {0}',
    groundingPanelSourcesCount: '{0} 件のソース',
    groundingPanelChunksMeta: 'チャンク: {0}',
    groundingPanelFocusState: '現在の引用に関連する {0} 件のソースと {1} 件のバンドルに絞り込んでいます。',
    groundingPanelFullContextState:
        '完全な引用コンテキストを表示しています。関連項目に絞り込むと周辺リストを狭められます。',
    groundingPanelShowAllItems: 'すべて表示',
    groundingPanelFocusLinkedItems: '関連項目に絞る',
    groundingPanelClearSelection: '選択を解除',
    groundingPanelSelectedSource: '選択中のソース',
    groundingPanelAppendPrompt: 'プロンプトに追加',
    groundingPanelReplacePrompt: 'プロンプトを置き換え',
    groundingPanelReusePreview: 'コンポーザー再利用プレビュー',
    groundingPanelReuseAppendPreview: '追加結果',
    groundingPanelReuseReplacePreview: '置換結果',
    groundingPanelReuseCurrentPromptLabel: '保持される現在のプロンプト',
    groundingPanelReuseAddedCueLabel: '追加されるグラウンディング キュー',
    groundingPanelReuseAppendImpactKeep:
        '現在のコンポーザープロンプトを保持し、その下にグラウンディング キューを追加します。',
    groundingPanelReuseAppendImpactEmpty:
        '現在のプロンプトはまだありません。追加すると、このグラウンディング テキストが新しいプロンプトとして使われます。',
    groundingPanelReuseReplaceImpact: '現在のコンポーザープロンプトをこのグラウンディング テキストに置き換えます。',
    groundingPanelReusePreviewHint:
        '追加ではこのキューが現在のプロンプトの下に加わり、置換ではこの再利用テキストに入れ替わります。',
    groundingPanelCitedSegments: '引用セグメント',
    groundingPanelNoBundleSegmentText: 'この引用バンドルではセグメントテキストが公開されていません。',
    groundingPanelInspectBundle: 'バンドルを確認',
    groundingPanelNoBundleCitesSource: '現在このソースを引用しているサポートバンドルはありません。',
    groundingPanelSourceCitationCount: '{0} 件のバンドルで参照',
    groundingPanelSourceCompareSummaryCited: 'このソースは {1} 件のバンドルのうち {0} 件で引用されています。',
    groundingPanelSourceCompareSummaryUncited: 'このソースは {1} 件のバンドルのうち {0} 件で引用されています。',
    groundingPanelSelectedBundle: '選択中のバンドル',
    groundingPanelSelectedBundleMeta: 'チャンク: {0} · {1} 件の関連ソース',
    groundingPanelCitedSourcesCount: '{0} 件の引用ソース',
    groundingPanelLinkedSources: '関連ソース',
    groundingPanelCompareStateLinked: 'バンドル内',
    groundingPanelCompareStateOutside: 'バンドル外',
    groundingPanelBundleCompareSummary: 'このバンドルは取得された {1} 件のソースのうち {0} 件を引用しています。',
    groundingPanelBundleCompareOtherSources: '取得されたソースのうち {0} 件はこのバンドル外にあります。',
    groundingPanelOtherRetrievedSources: '他の取得済みソース',
    groundingPanelInspectSource: 'ソースを確認',
    groundingPanelNoLinkedSourcesForBundle: 'このバンドルに関連付いたソースはありません。',
    groundingPanelNoOtherSourcesForBundle: 'このバンドル外に残っている取得済みソースはありません。',
    groundingPanelNoLinkedSourcesForSelection: '現在の引用選択に一致する関連ソースはありません。',
    groundingPanelNoLinkedBundlesForSelection: '現在の引用選択に一致する関連サポートバンドルはありません。',
} as const;

const jaWorkspacePanelBaseline = {
    workspacePanelResultTextReady:
        'この設定ではテキスト応答を受け取れます。モデルが説明文を返すと、ここに表示されます。',
    workspacePanelResultTextReserved:
        '画像とテキストの両方に対応したモデルへ切り替えると、応答の説明文がここに表示されます。',
    workspaceConstraintTrimObjects: 'モデルの制約により、オブジェクト画像は {0} 枚に調整されました。',
    workspaceConstraintTrimCharacters: 'モデルの制約により、キャラクター画像は {0} 枚に調整されました。',
} as const;

const jaWorkspacePanelStatusBaseline = {
    workspacePanelStatusEnabled: '有効',
    workspacePanelStatusPrepared: '準備完了',
    workspacePanelStatusReserved: '待機',
} as const;

const koWorkspacePanelBaseline = {
    workspacePanelResultTextReady:
        '현재 설정은 텍스트 응답을 받을 수 있습니다. 모델이 설명을 반환하면 여기에 표시됩니다.',
    workspacePanelResultTextReserved: '이미지와 텍스트를 모두 지원하는 모델로 전환하면 응답 설명이 여기에 표시됩니다.',
    workspaceConstraintTrimObjects: '모델 제약으로 인해 오브젝트 이미지는 {0}장으로 줄였습니다.',
    workspaceConstraintTrimCharacters: '모델 제약으로 인해 캐릭터 이미지는 {0}장으로 줄였습니다.',
} as const;

const koWorkspacePanelStatusBaseline = {
    workspacePanelStatusEnabled: '사용 가능',
    workspacePanelStatusPrepared: '준비 완료',
    workspacePanelStatusReserved: '대기',
} as const;

const esWorkspacePanelBaseline = {
    workspacePanelResultTextReady:
        'Esta configuracion ya puede recibir respuestas de texto. Cuando el modelo devuelva una narracion, aparecera aqui.',
    workspacePanelResultTextReserved:
        'Cambia a un modelo compatible con imagenes y texto para mostrar aqui la narracion de la respuesta.',
    workspaceConstraintTrimObjects: 'Las imagenes de objetos se recortaron a {0} por restricciones del modelo.',
    workspaceConstraintTrimCharacters: 'Las imagenes de personajes se recortaron a {0} por restricciones del modelo.',
} as const;

const esWorkspacePanelStatusBaseline = {
    workspacePanelStatusEnabled: 'Activo',
    workspacePanelStatusPrepared: 'Listo',
    workspacePanelStatusReserved: 'En espera',
} as const;

const frWorkspacePanelBaseline = {
    workspacePanelResultTextReady:
        'Cette configuration peut deja recevoir des reponses textuelles. Quand le modele renverra une narration, elle apparaitra ici.',
    workspacePanelResultTextReserved:
        'Passez a un modele compatible avec les images et le texte pour afficher ici la narration de la reponse.',
    workspaceConstraintTrimObjects: "Les images d'objets ont ete reduites a {0} a cause des contraintes du modele.",
    workspaceConstraintTrimCharacters:
        'Les images de personnages ont ete reduites a {0} a cause des contraintes du modele.',
} as const;

const frWorkspacePanelStatusBaseline = {
    workspacePanelStatusEnabled: 'Actif',
    workspacePanelStatusPrepared: 'Pret',
    workspacePanelStatusReserved: 'En attente',
} as const;

const deWorkspacePanelBaseline = {
    workspacePanelResultTextReady:
        'Diese Konfiguration kann bereits Textantworten empfangen. Wenn das Modell eine Beschreibung zuruckgibt, erscheint sie hier.',
    workspacePanelResultTextReserved:
        'Wechseln Sie zu einem Modell, das Bilder und Text unterstutzt, damit die Antwortbeschreibung hier angezeigt wird.',
    workspaceConstraintTrimObjects: 'Objektbilder wurden aufgrund von Modellbeschrankungen auf {0} reduziert.',
    workspaceConstraintTrimCharacters: 'Charakterbilder wurden aufgrund von Modellbeschrankungen auf {0} reduziert.',
} as const;

const deWorkspacePanelStatusBaseline = {
    workspacePanelStatusEnabled: 'Aktiv',
    workspacePanelStatusPrepared: 'Bereit',
    workspacePanelStatusReserved: 'Bereitschaft',
} as const;

const ruWorkspacePanelBaseline = {
    workspacePanelResultTextReady:
        'Эта конфигурация уже может получать текстовые ответы. Когда модель вернет описание, оно появится здесь.',
    workspacePanelResultTextReserved:
        'Переключитесь на модель, которая поддерживает изображения и текст, чтобы здесь показывалось описание ответа.',
    workspaceConstraintTrimObjects: 'Изображения объектов сокращены до {0} из-за ограничений модели.',
    workspaceConstraintTrimCharacters: 'Изображения персонажей сокращены до {0} из-за ограничений модели.',
} as const;

const ruWorkspacePanelStatusBaseline = {
    workspacePanelStatusEnabled: 'Активно',
    workspacePanelStatusPrepared: 'Готово',
    workspacePanelStatusReserved: 'Резерв',
} as const;

const jaLoadingStateBaseline = {
    loadingActivityConsole: 'アクティビティコンソールを読み込み中...',
    loadingPrepareSketchPad: 'SketchPadを準備中...',
    loadingPrepareUltraEditor: 'Ultra Editorを準備中...',
    loadingStageSurface: 'ステージ画面を読み込み中...',
} as const;

const koLoadingStateBaseline = {
    loadingActivityConsole: '활동 콘솔을 불러오는 중...',
    loadingPrepareSketchPad: 'SketchPad를 준비하는 중...',
    loadingPrepareUltraEditor: 'Ultra Editor를 준비하는 중...',
    loadingStageSurface: '스테이지 화면을 불러오는 중...',
} as const;

const esLoadingStateBaseline = {
    loadingActivityConsole: 'Cargando la consola de actividad...',
    loadingPrepareSketchPad: 'Preparando SketchPad...',
    loadingPrepareUltraEditor: 'Preparando Ultra Editor...',
    loadingStageSurface: 'Cargando la superficie del escenario...',
} as const;

const frLoadingStateBaseline = {
    loadingActivityConsole: 'Chargement de la console d activite...',
    loadingPrepareSketchPad: 'Preparation de SketchPad...',
    loadingPrepareUltraEditor: 'Preparation de Ultra Editor...',
    loadingStageSurface: 'Chargement de la surface de scene...',
} as const;

const deLoadingStateBaseline = {
    loadingActivityConsole: 'Aktivitatskonsole wird geladen...',
    loadingPrepareSketchPad: 'SketchPad wird vorbereitet...',
    loadingPrepareUltraEditor: 'Ultra Editor wird vorbereitet...',
    loadingStageSurface: 'Stage-Oberflache wird geladen...',
} as const;

const ruLoadingStateBaseline = {
    loadingActivityConsole: 'Загрузка консоли активности...',
    loadingPrepareSketchPad: 'Подготовка SketchPad...',
    loadingPrepareUltraEditor: 'Подготовка Ultra Editor...',
    loadingStageSurface: 'Загрузка поверхности сцены...',
} as const;

const jaStageGroundingBaseline = {
    stageGroundingResultStatus: 'グラウンディング結果',
    stageGroundingResultSummary: '{0} ・ リクエスト {1} ・ 実際 {2}',
} as const;

const koStageGroundingBaseline = {
    stageGroundingResultStatus: '그라운딩 결과',
    stageGroundingResultSummary: '{0} · 요청 {1} · 실제 {2}',
} as const;

const esStageGroundingBaseline = {
    stageGroundingResultStatus: 'Resultado con grounding',
    stageGroundingResultSummary: '{0} · Solicitado {1} · Real {2}',
} as const;

const frStageGroundingBaseline = {
    stageGroundingResultStatus: 'Resultat contextualise',
    stageGroundingResultSummary: '{0} · Demande {1} · Reel {2}',
} as const;

const deStageGroundingBaseline = {
    stageGroundingResultStatus: 'Grounding-Ergebnis',
    stageGroundingResultSummary: '{0} · Angefordert {1} · Tatsachlich {2}',
} as const;

const ruStageGroundingBaseline = {
    stageGroundingResultStatus: 'Результат граундинга',
    stageGroundingResultSummary: '{0} · Запрошено {1} · Фактически {2}',
} as const;

const jaHistoryStageNoticeBaseline = {
    followUpEditRequiresStageImage: 'フォローアップ編集の前に、まず画像をステージしてください。',
    editorBaseStageNotice: '現在ステージしている画像をエディターのベースに設定しました。',
} as const;

const koHistoryStageNoticeBaseline = {
    followUpEditRequiresStageImage: '후속 편집을 실행하기 전에 먼저 이미지를 스테이지에 올려 주세요.',
    editorBaseStageNotice: '현재 스테이지 이미지가 에디터 기본 이미지로 설정되었습니다.',
} as const;

const esHistoryStageNoticeBaseline = {
    followUpEditRequiresStageImage:
        'Prepara primero una imagen en el escenario antes de ejecutar una edicion de seguimiento.',
    editorBaseStageNotice: 'La imagen actual en escena se ha establecido como base del editor.',
} as const;

const frHistoryStageNoticeBaseline = {
    followUpEditRequiresStageImage: 'Placez d abord une image sur la scene avant de lancer une retouche de suivi.',
    editorBaseStageNotice: 'L image actuellement placee sur la scene sert maintenant de base a l editeur.',
} as const;

const deHistoryStageNoticeBaseline = {
    followUpEditRequiresStageImage:
        'Stellen Sie zuerst ein Bild auf die Szene, bevor Sie eine Folgebearbeitung ausfuhren.',
    editorBaseStageNotice: 'Das aktuell auf der Szene platzierte Bild dient jetzt als Editor-Basis.',
} as const;

const ruHistoryStageNoticeBaseline = {
    followUpEditRequiresStageImage:
        'Сначала поместите изображение на сцену, прежде чем запускать последующее редактирование.',
    editorBaseStageNotice: 'Текущее изображение на сцене теперь используется как база редактора.',
} as const;

const jaHistoryBranchLabelBaseline = {
    historyBranchAuto: '自動',
    historyBranchRoot: 'ルート',
    historyBranchTurns: '{0} ターン',
    historyBranchUpdated: '更新',
    historyBranchOrigin: '起点',
    historyBranchLatest: '最新',
} as const;

const koHistoryBranchLabelBaseline = {
    historyBranchAuto: '자동',
    historyBranchRoot: '루트',
    historyBranchTurns: '{0}개 턴',
    historyBranchUpdated: '업데이트됨',
    historyBranchOrigin: '원본',
    historyBranchLatest: '최신',
} as const;

const esHistoryBranchLabelBaseline = {
    historyBranchAuto: 'auto',
    historyBranchRoot: 'Raiz',
    historyBranchTurns: '{0} turnos',
    historyBranchUpdated: 'actualizada',
    historyBranchOrigin: 'Origen',
    historyBranchLatest: 'mas reciente',
} as const;

const frHistoryBranchLabelBaseline = {
    historyBranchAuto: 'auto',
    historyBranchRoot: 'Racine',
    historyBranchTurns: '{0} tours',
    historyBranchUpdated: 'mise a jour',
    historyBranchOrigin: 'Origine',
    historyBranchLatest: 'plus recente',
} as const;

const deHistoryBranchLabelBaseline = {
    historyBranchAuto: 'automatisch',
    historyBranchRoot: 'Wurzel',
    historyBranchTurns: '{0} Zuge',
    historyBranchUpdated: 'aktualisiert',
    historyBranchOrigin: 'Ursprung',
    historyBranchLatest: 'neueste',
} as const;

const ruHistoryBranchLabelBaseline = {
    historyBranchAuto: 'авто',
    historyBranchRoot: 'Корень',
    historyBranchTurns: '{0} ходов',
    historyBranchUpdated: 'обновлено',
    historyBranchOrigin: 'Источник',
    historyBranchLatest: 'последняя',
} as const;

const jaSourceLineageLabelBaseline = {
    composerFollowUpSource: 'フォローアップ元',
    workspaceSourceBadge: 'ソース',
    historyBranchContinuationSource: '継続元',
    workspaceCurrentStageSourceNoLinkedHistory:
        'このステージは現在、履歴ターンにひも付かないまま一時配置されているため、フォローアップ操作では一時配置された画像状態のみを使います。',
    workspaceInsightsReplaySession: 'セッションを確認',
} as const;

const koSourceLineageLabelBaseline = {
    composerFollowUpSource: '후속 원본',
    workspaceSourceBadge: '원본',
    historyBranchContinuationSource: '연속 원본',
    workspaceCurrentStageSourceNoLinkedHistory:
        '이 스테이지는 현재 연결된 기록 턴 없이 임시 배치된 상태이므로, 후속 작업은 현재 임시 이미지 상태만 사용합니다.',
    workspaceInsightsReplaySession: '세션 보기',
} as const;

const esSourceLineageLabelBaseline = {
    composerFollowUpSource: 'Fuente de seguimiento',
    workspaceSourceBadge: 'Fuente',
    historyBranchContinuationSource: 'Fuente de continuacion',
    workspaceCurrentStageSourceNoLinkedHistory:
        'Esta etapa esta temporalmente preparada sin un turno de historial vinculado, por lo que las acciones de seguimiento solo usaran el estado de la imagen preparada.',
    workspaceInsightsReplaySession: 'Revisar sesion',
} as const;

const frSourceLineageLabelBaseline = {
    composerFollowUpSource: 'Source de suivi',
    workspaceSourceBadge: 'Source',
    historyBranchContinuationSource: 'Source de continuation',
    workspaceCurrentStageSourceNoLinkedHistory:
        "Cette etape est actuellement mise en attente sans tour d'historique lie, donc les actions de suivi utiliseront uniquement l'etat de l'image mise en attente.",
    workspaceInsightsReplaySession: 'Revoir la session',
} as const;

const deSourceLineageLabelBaseline = {
    composerFollowUpSource: 'Folgequelle',
    workspaceSourceBadge: 'Quelle',
    historyBranchContinuationSource: 'Fortsetzungsquelle',
    workspaceCurrentStageSourceNoLinkedHistory:
        'Diese Stage ist derzeit ohne verknupfte Verlaufsrunde zwischengespeichert, daher verwenden Folgeaktionen nur den zwischengespeicherten Bildstatus.',
    workspaceInsightsReplaySession: 'Sitzung ansehen',
} as const;

const ruSourceLineageLabelBaseline = {
    composerFollowUpSource: 'Источник продолжения',
    workspaceSourceBadge: 'Источник',
    historyBranchContinuationSource: 'Источник продолжения',
    workspaceCurrentStageSourceNoLinkedHistory:
        'Эта сцена сейчас подготовлена без связанного хода истории, поэтому действия продолжения будут использовать только текущее состояние подготовленного изображения.',
    workspaceInsightsReplaySession: 'Просмотреть сессию',
} as const;

const jaBranchRenameDialogBaseline = {
    branchRenameEyebrow: '分岐名の変更',
    branchRenameTitle: '系統分岐の名前を変更',
    branchRenameClose: '閉じる',
    branchRenameAutomaticLabel: '自動ラベル',
    branchRenameDisplayName: '表示名',
    branchRenameUseAutomatic: '自動ラベルを使う',
    branchRenameSave: '分岐名を保存',
    branchRenameResetNotice: '分岐名を自動ラベルに戻しました。',
    branchRenameSavedNotice: '分岐名を「{0}」に変更しました。',
} as const;

const koBranchRenameDialogBaseline = {
    branchRenameEyebrow: '브랜치 이름 변경',
    branchRenameTitle: '계보 브랜치 이름 바꾸기',
    branchRenameClose: '닫기',
    branchRenameAutomaticLabel: '자동 라벨',
    branchRenameDisplayName: '표시 이름',
    branchRenameUseAutomatic: '자동 라벨 사용',
    branchRenameSave: '브랜치 이름 저장',
    branchRenameResetNotice: '브랜치 이름이 자동 라벨로 재설정되었습니다.',
    branchRenameSavedNotice: '브랜치 이름을 "{0}"(으)로 변경했습니다.',
} as const;

const esBranchRenameDialogBaseline = {
    branchRenameEyebrow: 'Renombrar rama',
    branchRenameTitle: 'Renombrar rama de linaje',
    branchRenameClose: 'Cerrar',
    branchRenameAutomaticLabel: 'Etiqueta automatica',
    branchRenameDisplayName: 'Nombre para mostrar',
    branchRenameUseAutomatic: 'Usar etiqueta automatica',
    branchRenameSave: 'Guardar nombre de la rama',
    branchRenameResetNotice: 'El nombre de la rama se restablecio a su etiqueta automatica.',
    branchRenameSavedNotice: 'La rama se renombro a "{0}".',
} as const;

const frBranchRenameDialogBaseline = {
    branchRenameEyebrow: 'Renommer la branche',
    branchRenameTitle: 'Renommer la branche de lignage',
    branchRenameClose: 'Fermer',
    branchRenameAutomaticLabel: 'Libelle automatique',
    branchRenameDisplayName: 'Nom d affichage',
    branchRenameUseAutomatic: 'Utiliser le libelle automatique',
    branchRenameSave: 'Enregistrer le nom de la branche',
    branchRenameResetNotice: 'Le nom de la branche a ete retabli a son libelle automatique.',
    branchRenameSavedNotice: 'La branche a ete renommee en "{0}".',
} as const;

const deBranchRenameDialogBaseline = {
    branchRenameEyebrow: 'Branch umbenennen',
    branchRenameTitle: 'Verlaufs-Branch umbenennen',
    branchRenameClose: 'Schliessen',
    branchRenameAutomaticLabel: 'Automatische Beschriftung',
    branchRenameDisplayName: 'Anzeigename',
    branchRenameUseAutomatic: 'Automatische Beschriftung verwenden',
    branchRenameSave: 'Branch-Namen speichern',
    branchRenameResetNotice: 'Der Branch-Name wurde auf seine automatische Beschriftung zuruckgesetzt.',
    branchRenameSavedNotice: 'Die Branch wurde in "{0}" umbenannt.',
} as const;

const ruBranchRenameDialogBaseline = {
    branchRenameEyebrow: 'Переименование ветки',
    branchRenameTitle: 'Переименовать ветку линии',
    branchRenameClose: 'Закрыть',
    branchRenameAutomaticLabel: 'Автоматическая метка',
    branchRenameDisplayName: 'Отображаемое имя',
    branchRenameUseAutomatic: 'Использовать автоматическую метку',
    branchRenameSave: 'Сохранить имя ветки',
    branchRenameResetNotice: 'Имя ветки сброшено на автоматическую метку.',
    branchRenameSavedNotice: 'Ветка переименована в "{0}".',
} as const;

const jaHistoryContinueStageBaseline = {
    historyContinueFromTurn: 'このターンから継続',
    historyContinuePromoteVariant: '昇格して継続',
    historyContinueSourceActive: '継続元',
} as const;

const koHistoryContinueStageBaseline = {
    historyContinueFromTurn: '이 턴부터 이어가기',
    historyContinuePromoteVariant: '승격 후 이어가기',
    historyContinueSourceActive: '연속 원본',
} as const;

const esHistoryContinueStageBaseline = {
    historyContinueFromTurn: 'Continuar desde este turno',
    historyContinuePromoteVariant: 'Promover y continuar',
    historyContinueSourceActive: 'Fuente de continuacion',
} as const;

const frHistoryContinueStageBaseline = {
    historyContinueFromTurn: 'Continuer depuis ce tour',
    historyContinuePromoteVariant: 'Promouvoir et continuer',
    historyContinueSourceActive: 'Source de continuation',
} as const;

const deHistoryContinueStageBaseline = {
    historyContinueFromTurn: 'Von dieser Runde fortsetzen',
    historyContinuePromoteVariant: 'Hochstufen und fortsetzen',
    historyContinueSourceActive: 'Fortsetzungsquelle',
} as const;

const ruHistoryContinueStageBaseline = {
    historyContinueFromTurn: 'Продолжить с этого хода',
    historyContinuePromoteVariant: 'Повысить и продолжить',
    historyContinueSourceActive: 'Источник продолжения',
} as const;

const jaHistoryActionBadgeBaseline = {
    historyActionOpen: '開く',
    historyActionBranch: '分岐',
    historyActionRename: '名前を変更',
    historyActionOpenLatest: '最新を開く',
    historyActionOpenOrigin: '起点を開く',
    historyActionBranchFromOrigin: '起点から分岐',
    historyModeImage: '画像',
    historyBadgeParent: '親',
    historyBadgeCandidate: '候補',
    historyBadgeActive: 'アクティブ',
} as const;

const koHistoryActionBadgeBaseline = {
    historyActionOpen: '열기',
    historyActionBranch: '분기',
    historyActionRename: '이름 변경',
    historyActionOpenLatest: '최신 항목 열기',
    historyActionOpenOrigin: '시작점 열기',
    historyActionBranchFromOrigin: '시작점에서 분기',
    historyModeImage: '이미지',
    historyBadgeParent: '부모',
    historyBadgeCandidate: '후보',
    historyBadgeActive: '활성',
} as const;

const esHistoryActionBadgeBaseline = {
    historyActionOpen: 'Abrir',
    historyActionBranch: 'Ramificar',
    historyActionRename: 'Renombrar',
    historyActionOpenLatest: 'Abrir el mas reciente',
    historyActionOpenOrigin: 'Abrir origen',
    historyActionBranchFromOrigin: 'Ramificar desde el origen',
    historyModeImage: 'Imagen',
    historyBadgeParent: 'padre',
    historyBadgeCandidate: 'Candidata',
    historyBadgeActive: 'Activa',
} as const;

const frHistoryActionBadgeBaseline = {
    historyActionOpen: 'Ouvrir',
    historyActionBranch: 'Bifurquer',
    historyActionRename: 'Renommer',
    historyActionOpenLatest: 'Ouvrir la plus recente',
    historyActionOpenOrigin: "Ouvrir l'origine",
    historyActionBranchFromOrigin: "Bifurquer depuis l'origine",
    historyModeImage: 'Image generee',
    historyBadgeParent: 'parente',
    historyBadgeCandidate: 'Candidate locale',
    historyBadgeActive: 'Activee',
} as const;

const deHistoryActionBadgeBaseline = {
    historyActionOpen: 'Offnen',
    historyActionBranch: 'Verzweigen',
    historyActionRename: 'Umbenennen',
    historyActionOpenLatest: 'Neueste offnen',
    historyActionOpenOrigin: 'Ursprung offnen',
    historyActionBranchFromOrigin: 'Vom Ursprung verzweigen',
    historyModeImage: 'Bild',
    historyBadgeParent: 'Eltern',
    historyBadgeCandidate: 'Kandidat',
    historyBadgeActive: 'Aktiv',
} as const;

const ruHistoryActionBadgeBaseline = {
    historyActionOpen: 'Открыть',
    historyActionBranch: 'Ветвить',
    historyActionRename: 'Переименовать',
    historyActionOpenLatest: 'Открыть последний',
    historyActionOpenOrigin: 'Открыть источник',
    historyActionBranchFromOrigin: 'Ветвить от источника',
    historyModeImage: 'Изображение',
    historyBadgeParent: 'родитель',
    historyBadgeCandidate: 'Кандидат',
    historyBadgeActive: 'Активная',
} as const;

const jaHistoryFilmstripBaseline = {
    historyFilmstripTitle: '最近のターン',
    historyFilmstripDesc: '現在の結果はステージに残ったまま、近い文脈のターンをいつでも再表示、継続、分岐できます。',
    historyFilmstripSummary: '{0} ターン・{1} ブランチ',
    historyFilmstripEmpty: 'ターンストリップの蓄積を始めるには、まず画像を生成または読み込んでください。',
} as const;

const koHistoryFilmstripBaseline = {
    historyFilmstripTitle: '최근 턴',
    historyFilmstripDesc:
        '현재 결과는 스테이지에 그대로 유지되고, 가까운 문맥의 턴은 언제든 다시 열고 이어가거나 분기할 수 있습니다.',
    historyFilmstripSummary: '{0}개 턴 · {1}개 분기',
    historyFilmstripEmpty: '턴 스트립을 쌓기 시작하려면 먼저 이미지를 생성하거나 불러오세요.',
} as const;

const esHistoryFilmstripBaseline = {
    historyFilmstripTitle: 'Turnos recientes',
    historyFilmstripDesc:
        'El resultado actual permanece en escena mientras los turnos de contexto cercano siguen listos para abrir, continuar o ramificar en cualquier momento.',
    historyFilmstripSummary: '{0} turnos · {1} ramas',
    historyFilmstripEmpty: 'Genera o carga una imagen para empezar a construir la tira de turnos.',
} as const;

const frHistoryFilmstripBaseline = {
    historyFilmstripTitle: 'Tours recents',
    historyFilmstripDesc:
        'Le resultat actuel reste sur la scene pendant que les tours au contexte proche restent prets a etre rouverts, poursuivis ou bifurques a tout moment.',
    historyFilmstripSummary: '{0} tours · {1} branches',
    historyFilmstripEmpty: 'Generez ou chargez une image pour commencer a construire la bande de tours.',
} as const;

const deHistoryFilmstripBaseline = {
    historyFilmstripTitle: 'Letzte Zuge',
    historyFilmstripDesc:
        'Das aktuelle Ergebnis bleibt auf der Buehne, waehrend naheliegende Zuge jederzeit erneut geoeffnet, fortgesetzt oder verzweigt werden koennen.',
    historyFilmstripSummary: '{0} Zuge · {1} Zweige',
    historyFilmstripEmpty: 'Erzeugen oder laden Sie ein Bild, um den Zugstreifen aufzubauen.',
} as const;

const ruHistoryFilmstripBaseline = {
    historyFilmstripTitle: 'Недавние ходы',
    historyFilmstripDesc:
        'Текущий результат остается на сцене, а ходы с близким контекстом в любой момент можно снова открыть, продолжить или разветвить.',
    historyFilmstripSummary: '{0} ходов · {1} веток',
    historyFilmstripEmpty: 'Сгенерируйте или загрузите изображение, чтобы начать собирать ленту ходов.',
} as const;

const englishWorkspaceSideToolBaseline = {
    workspaceSideToolTitle: 'Image Tools',
    workspaceSideToolCurrentImage: 'Current image',
    workspaceSideToolBaseImage: 'Base image',
} as const;

const jaWorkspaceInsightsSidebarLabelBaseline = {
    workspaceInsightsEyebrow: 'ワークスペースの状況',
    workspaceInsightsCurrentWork: '現在の作業',
    workspaceInsightsVersions: 'バージョン',
    workspaceInsightsSourcesCitations: 'ソースと引用',
    workspaceInsightsActivity: 'アクティビティ',
    workspaceInsightsModelSettingsTitle: 'モデル設定',
    workspaceInsightsPhaseLabel: 'ライブ',
    workspaceInsightsCurrentModel: '現在のモデル',
    workspaceInsightsCurrentSettings: '現在の結果設定',
    workspaceInsightsReferences: '参照資料',
    workspaceInsightsObjects: 'オブジェクト: {0}/{1}',
    workspaceInsightsCharacters: 'キャラクター: {0}/{1}',
    workspaceInsightsRenameBranch: '分岐名を変更',
    workspaceInsightsActiveBranch: '現在のバージョン',
    workspaceInsightsBranchesCount: '{0} 個の分岐',
    workspaceInsightsSessionContinuity: '引き継がれる内容',
    workspaceInsightsLatestResultText: '最新の結果テキスト',
    workspaceInsightsLatestThoughts: '最新の思考',
    workspaceInsightsProvenance: 'ソースの詳細',
} as const;

const koWorkspaceInsightsSidebarLabelBaseline = {
    workspaceInsightsEyebrow: '작업 공간 개요',
    workspaceInsightsCurrentWork: '현재 작업',
    workspaceInsightsVersions: '버전',
    workspaceInsightsSourcesCitations: '출처 및 인용',
    workspaceInsightsActivity: '활동',
    workspaceInsightsModelSettingsTitle: '모델 설정',
    workspaceInsightsPhaseLabel: '실시간',
    workspaceInsightsCurrentModel: '현재 모델',
    workspaceInsightsCurrentSettings: '현재 결과 설정',
    workspaceInsightsReferences: '참조 자료',
    workspaceInsightsObjects: '오브젝트: {0}/{1}',
    workspaceInsightsCharacters: '캐릭터: {0}/{1}',
    workspaceInsightsRenameBranch: '브랜치 이름 변경',
    workspaceInsightsActiveBranch: '현재 버전',
    workspaceInsightsBranchesCount: '{0}개 브랜치',
    workspaceInsightsSessionContinuity: '이어지는 내용',
    workspaceInsightsLatestResultText: '최신 결과 텍스트',
    workspaceInsightsLatestThoughts: '최신 생각',
    workspaceInsightsProvenance: '출처 세부 정보',
} as const;

const esWorkspaceInsightsSidebarLabelBaseline = {
    workspaceInsightsEyebrow: 'Resumen del espacio de trabajo',
    workspaceInsightsCurrentWork: 'Trabajo actual',
    workspaceInsightsVersions: 'Versiones',
    workspaceInsightsSourcesCitations: 'Fuentes y citas',
    workspaceInsightsActivity: 'Actividad',
    workspaceInsightsModelSettingsTitle: 'Configuracion del modelo',
    workspaceInsightsPhaseLabel: 'Activo',
    workspaceInsightsCurrentModel: 'Modelo actual',
    workspaceInsightsCurrentSettings: 'Configuracion actual del resultado',
    workspaceInsightsReferences: 'Referencias',
    workspaceInsightsObjects: 'Objetos: {0}/{1}',
    workspaceInsightsCharacters: 'Personajes: {0}/{1}',
    workspaceInsightsRenameBranch: 'Renombrar rama',
    workspaceInsightsActiveBranch: 'Version actual',
    workspaceInsightsBranchesCount: '{0} ramas',
    workspaceInsightsSessionContinuity: 'Lo que se mantiene',
    workspaceInsightsLatestResultText: 'Texto del ultimo resultado',
    workspaceInsightsLatestThoughts: 'Ultimos pensamientos',
    workspaceInsightsProvenance: 'Detalles de origen',
} as const;

const frWorkspaceInsightsSidebarLabelBaseline = {
    workspaceInsightsEyebrow: 'Vue d ensemble de l espace de travail',
    workspaceInsightsCurrentWork: 'Travail en cours',
    workspaceInsightsVersions: 'Versions',
    workspaceInsightsSourcesCitations: 'Sources et citations',
    workspaceInsightsActivity: 'Activite',
    workspaceInsightsModelSettingsTitle: 'Parametres du modele',
    workspaceInsightsPhaseLabel: 'Actif',
    workspaceInsightsCurrentModel: 'Modele actuel',
    workspaceInsightsCurrentSettings: 'Parametres actuels du resultat',
    workspaceInsightsReferences: 'Elements de reference',
    workspaceInsightsObjects: 'Objets : {0}/{1}',
    workspaceInsightsCharacters: 'Personnages : {0}/{1}',
    workspaceInsightsRenameBranch: 'Renommer la branche',
    workspaceInsightsActiveBranch: 'Version actuelle',
    workspaceInsightsBranchesCount: 'Total des branches : {0}',
    workspaceInsightsSessionContinuity: 'Ce qui continue',
    workspaceInsightsLatestResultText: 'Dernier texte du resultat',
    workspaceInsightsLatestThoughts: 'Dernieres pensees',
    workspaceInsightsProvenance: 'Details des sources',
} as const;

const deWorkspaceInsightsSidebarLabelBaseline = {
    workspaceInsightsEyebrow: 'Arbeitsbereich im Blick',
    workspaceInsightsCurrentWork: 'Aktuelle Arbeit',
    workspaceInsightsVersions: 'Versionen',
    workspaceInsightsSourcesCitations: 'Quellen und Zitate',
    workspaceInsightsActivity: 'Aktivitat',
    workspaceInsightsModelSettingsTitle: 'Modelleinstellungen',
    workspaceInsightsPhaseLabel: 'Aktiv',
    workspaceInsightsCurrentModel: 'Aktuelles Modell',
    workspaceInsightsCurrentSettings: 'Aktuelle Ergebniseinstellungen',
    workspaceInsightsReferences: 'Referenzen',
    workspaceInsightsObjects: 'Objekte: {0}/{1}',
    workspaceInsightsCharacters: 'Charaktere: {0}/{1}',
    workspaceInsightsRenameBranch: 'Zweig umbenennen',
    workspaceInsightsActiveBranch: 'Aktuelle Version',
    workspaceInsightsBranchesCount: '{0} Zweige',
    workspaceInsightsSessionContinuity: 'Was erhalten bleibt',
    workspaceInsightsLatestResultText: 'Neuester Ergebnistext',
    workspaceInsightsLatestThoughts: 'Neueste Gedanken',
    workspaceInsightsProvenance: 'Quelldetails',
} as const;

const ruWorkspaceInsightsSidebarLabelBaseline = {
    workspaceInsightsEyebrow: 'Обзор рабочего пространства',
    workspaceInsightsCurrentWork: 'Текущая работа',
    workspaceInsightsVersions: 'Версии',
    workspaceInsightsSourcesCitations: 'Источники и цитаты',
    workspaceInsightsActivity: 'Активность',
    workspaceInsightsModelSettingsTitle: 'Настройки модели',
    workspaceInsightsPhaseLabel: 'Активно',
    workspaceInsightsCurrentModel: 'Текущая модель',
    workspaceInsightsCurrentSettings: 'Текущие настройки результата',
    workspaceInsightsReferences: 'Референсы',
    workspaceInsightsObjects: 'Объекты: {0}/{1}',
    workspaceInsightsCharacters: 'Персонажи: {0}/{1}',
    workspaceInsightsRenameBranch: 'Переименовать ветку',
    workspaceInsightsActiveBranch: 'Текущая версия',
    workspaceInsightsBranchesCount: '{0} веток',
    workspaceInsightsSessionContinuity: 'Что сохранится',
    workspaceInsightsLatestResultText: 'Текст последнего результата',
    workspaceInsightsLatestThoughts: 'Последние мысли',
    workspaceInsightsProvenance: 'Сведения об источниках',
} as const;

const jaWorkspaceInsightsStructuralBaseline = {
    workspaceInsightsBranchesEmpty: 'セッションが別方向へ分岐し始めると、ここに分岐が整理されます。',
    workspaceInsightsNoContinuitySignals: 'まだ継続シグナルはありません。',
    workspaceInsightsOfficialConversation: '会話の履歴',
    workspaceInsightsConversationBranchActiveSource: '分岐 {0} · 現在のソース {1}',
    workspaceInsightsSessionSource: 'このセッション',
    workspaceInsightsSessionStateHint:
        'ステージが切り替わっても、現在の結果、保存したバージョン、参照したソース、最近の動きがここにまとまって残ります。',
    workspaceInsightsTitle: '現在の作業、バージョン、ソース、アクティビティ',
    workspaceInsightsStageSourceEmpty:
        '結果がステージに入ると、このカードには履歴、アクティブな分岐継続、エディターのフォローアップ、または再度開いたターンのどれから来たかが表示されます。',
    workspaceInsightsLatestResultTextEmpty:
        '画像とテキストが有効なときは、ステージ要約がここにもビューアにも表示されます。',
    workspaceInsightsSessionTurnStack: '最近のターン',
    workspaceInsightsTurnsCount: '{0} ターン',
    workspaceInsightsSessionTurnStackEmpty:
        '直近で成功したターンがここに並び、再度開く、継続する、分岐する操作をすばやく行えます。',
    workspaceInsightsLineageMap: 'バージョンマップ',
    workspaceInsightsRootsCount: '{0} 個のルート',
    workspaceInsightsRoot: 'ルート',
    workspaceInsightsLineageEmpty: '複数の成功ターンがたまると、そのルートと分岐関係がここに表示されます。',
    workspaceInsightsTimelineTitle: '最近のアクティビティ',
    workspaceInsightsTimelineDesc:
        'リクエスト、出力、履歴、エラーの各ステップが、ワークスペースを離れなくてもここで読みやすく整理されます。',
    workspaceInsightsTimelineEmpty: '作業を進めると、システムや生成のメッセージがここに表示されます。',
    workspaceInsightsOpenGallery: 'ギャラリーを開く',
    workspaceInsightsOpenPromptHistory: 'プロンプト履歴を開く',
    workspaceInsightsItemsCount: '{0} 件',
    workspaceInsightsSessionHintsEmpty:
        'グラウンディングや複数ターンのワークフロー向けセッションヒントがここに表示されます。',
} as const;

const koWorkspaceInsightsStructuralBaseline = {
    workspaceInsightsBranchesEmpty: '세션이 다른 방향으로 갈라지기 시작하면 브랜치가 여기에 정리됩니다.',
    workspaceInsightsNoContinuitySignals: '아직 연속성 신호가 없습니다.',
    workspaceInsightsOfficialConversation: '대화 기록',
    workspaceInsightsConversationBranchActiveSource: '브랜치 {0} · 현재 원본 {1}',
    workspaceInsightsSessionSource: '이번 세션',
    workspaceInsightsSessionStateHint:
        '스테이지가 바뀌어도 현재 결과, 저장된 버전, 참고한 출처, 최근 활동이 이곳에 계속 정리되어 남습니다.',
    workspaceInsightsTitle: '현재 작업, 버전, 출처, 활동',
    workspaceInsightsStageSourceEmpty:
        '결과가 스테이지에 올라오면 이 카드에 기록, 활성 브랜치 연속, 에디터 후속 편집, 또는 다시 연 턴 가운데 어디에서 왔는지 표시됩니다.',
    workspaceInsightsLatestResultTextEmpty:
        '이미지와 텍스트가 활성화되면 스테이지 요약이 여기와 뷰어에 함께 표시됩니다.',
    workspaceInsightsSessionTurnStack: '최근 턴',
    workspaceInsightsTurnsCount: '{0}개 턴',
    workspaceInsightsSessionTurnStackEmpty:
        '최근 성공한 턴이 여기에 모여 빠르게 다시 열기, 이어가기, 브랜치 만들기를 할 수 있습니다.',
    workspaceInsightsLineageMap: '버전 맵',
    workspaceInsightsRootsCount: '루트 {0}개',
    workspaceInsightsRoot: '루트',
    workspaceInsightsLineageEmpty: '성공한 턴이 여러 개 쌓이면 루트와 브랜치 관계가 여기에 표시됩니다.',
    workspaceInsightsTimelineTitle: '최근 활동',
    workspaceInsightsTimelineDesc:
        '요청, 출력, 기록, 오류 단계가 워크스페이스를 떠나지 않아도 여기에서 읽기 쉽게 정리됩니다.',
    workspaceInsightsTimelineEmpty: '작업을 진행하면 시스템 및 생성 메시지가 여기에 표시됩니다.',
    workspaceInsightsOpenGallery: '갤러리 열기',
    workspaceInsightsOpenPromptHistory: '프롬프트 기록 열기',
    workspaceInsightsItemsCount: '{0}개 항목',
    workspaceInsightsSessionHintsEmpty: '그라운딩 또는 멀티턴 워크플로를 위한 세션 힌트가 여기에 표시됩니다.',
} as const;

const esWorkspaceInsightsStructuralBaseline = {
    workspaceInsightsBranchesEmpty:
        'Las ramas apareceran aqui cuando la sesion empiece a dividirse en direcciones alternativas.',
    workspaceInsightsNoContinuitySignals: 'Aun no hay senales de continuidad.',
    workspaceInsightsOfficialConversation: 'Historial del chat',
    workspaceInsightsConversationBranchActiveSource: 'Rama {0} · fuente activa {1}',
    workspaceInsightsSessionSource: 'Esta sesion',
    workspaceInsightsSessionStateHint:
        'Aunque cambie el escenario, aqui seguiran visibles el resultado actual, las versiones guardadas, las fuentes consultadas y la actividad reciente.',
    workspaceInsightsTitle: 'Trabajo actual, versiones, fuentes y actividad',
    workspaceInsightsStageSourceEmpty:
        'Cuando un resultado entra en escena, esta tarjeta mostrara si vino del historial, de una continuacion activa de rama, de un seguimiento desde el editor o de un turno reabierto.',
    workspaceInsightsLatestResultTextEmpty:
        'Cuando Imagenes y texto este activo, el resumen del escenario aparecera aqui y tambien en el visor.',
    workspaceInsightsSessionTurnStack: 'Turnos recientes',
    workspaceInsightsTurnsCount: '{0} turnos',
    workspaceInsightsSessionTurnStackEmpty:
        'Los turnos exitosos recientes apareceran aqui para reabrir, continuar o ramificar con rapidez.',
    workspaceInsightsLineageMap: 'Mapa de versiones',
    workspaceInsightsRootsCount: '{0} raices',
    workspaceInsightsRoot: 'Raiz',
    workspaceInsightsLineageEmpty:
        'Cuando se acumulen varios turnos exitosos, sus raices y relaciones de rama apareceran aqui.',
    workspaceInsightsTimelineTitle: 'Actividad reciente',
    workspaceInsightsTimelineDesc:
        'Las solicitudes, salidas, pasos del historial y errores se mantienen legibles aqui sin salir del espacio de trabajo.',
    workspaceInsightsTimelineEmpty: 'Los mensajes del sistema y de generacion apareceran aqui a medida que trabajes.',
    workspaceInsightsOpenGallery: 'Abrir galeria',
    workspaceInsightsOpenPromptHistory: 'Abrir historial de prompts',
    workspaceInsightsItemsCount: '{0} elementos',
    workspaceInsightsSessionHintsEmpty:
        'Las pistas de sesion para flujos con contexto o de varios turnos apareceran aqui.',
} as const;

const frWorkspaceInsightsStructuralBaseline = {
    workspaceInsightsBranchesEmpty:
        'Les branches apparaitront ici quand la session commencera a se diviser vers d autres directions.',
    workspaceInsightsNoContinuitySignals: 'Aucun signal de continuite pour le moment.',
    workspaceInsightsOfficialConversation: 'Historique du chat',
    workspaceInsightsConversationBranchActiveSource: 'Branche {0} · source active {1}',
    workspaceInsightsSessionSource: 'Cette session',
    workspaceInsightsSessionStateHint:
        'Meme si la scene change, le resultat actuel, les versions enregistrees, les sources consultees et l activite recente restent visibles ici.',
    workspaceInsightsTitle: 'Travail en cours, versions, sources et activite',
    workspaceInsightsStageSourceEmpty:
        'Quand un resultat est place sur la scene, cette carte indiquera s il vient de l historique, d une continuation active de branche, d une suite depuis l editeur ou d un tour rouvert.',
    workspaceInsightsLatestResultTextEmpty:
        'Quand Images et texte est actif, le resume de la scene apparait ici ainsi que dans le visualiseur.',
    workspaceInsightsSessionTurnStack: 'Tours recents',
    workspaceInsightsTurnsCount: '{0} tours',
    workspaceInsightsSessionTurnStackEmpty:
        'Les tours recents reussis arrivent ici pour rouvrir, continuer ou creer une branche rapidement.',
    workspaceInsightsLineageMap: 'Carte des versions',
    workspaceInsightsRootsCount: '{0} racines',
    workspaceInsightsRoot: 'Racine',
    workspaceInsightsLineageEmpty:
        'Quand plusieurs tours reussis s accumulent, leur racine et leurs relations de branche apparaitront ici.',
    workspaceInsightsTimelineTitle: 'Activite recente',
    workspaceInsightsTimelineDesc:
        'Les requetes, sorties, etapes d historique et erreurs restent lisibles ici sans quitter l espace de travail.',
    workspaceInsightsTimelineEmpty:
        'Les messages systeme et de generation apparaitront ici au fur et a mesure de votre travail.',
    workspaceInsightsOpenGallery: 'Ouvrir la galerie',
    workspaceInsightsOpenPromptHistory: 'Ouvrir l historique des prompts',
    workspaceInsightsItemsCount: '{0} elements',
    workspaceInsightsSessionHintsEmpty:
        'Les indices de session pour les flux avec contexte ou a plusieurs tours apparaitront ici.',
} as const;

const deWorkspaceInsightsStructuralBaseline = {
    workspaceInsightsBranchesEmpty:
        'Sobald sich die Sitzung in verschiedene Richtungen aufteilt, werden die Zweige hier gesammelt.',
    workspaceInsightsNoContinuitySignals: 'Noch keine Kontinuitatssignale vorhanden.',
    workspaceInsightsOfficialConversation: 'Chat-Verlauf',
    workspaceInsightsConversationBranchActiveSource: 'Zweig {0} · aktive Quelle {1}',
    workspaceInsightsSessionSource: 'Diese Sitzung',
    workspaceInsightsSessionStateHint:
        'Auch wenn sich die Ansicht andert, bleiben das aktuelle Ergebnis, gespeicherte Versionen, genutzte Quellen und die letzte Aktivitat hier sichtbar.',
    workspaceInsightsTitle: 'Aktuelle Arbeit, Versionen, Quellen und Aktivitat',
    workspaceInsightsStageSourceEmpty:
        'Sobald ein Ergebnis auf die Stage gelegt wird, zeigt diese Karte, ob es aus dem Verlauf, aus einer aktiven Zweigfortsetzung, aus einer Editor-Nachbearbeitung oder aus einer erneut geoffneten Runde stammt.',
    workspaceInsightsLatestResultTextEmpty:
        'Wenn Bilder und Text aktiv sind, erscheint die Stufenzusammenfassung hier und auch im Viewer.',
    workspaceInsightsSessionTurnStack: 'Letzte Zuge',
    workspaceInsightsTurnsCount: '{0} Zuge',
    workspaceInsightsSessionTurnStackEmpty:
        'Neuere erfolgreiche Runden erscheinen hier fur schnelles erneutes Offnen, Fortsetzen oder Verzweigen.',
    workspaceInsightsLineageMap: 'Versionskarte',
    workspaceInsightsRootsCount: '{0} Wurzeln',
    workspaceInsightsRoot: 'Wurzel',
    workspaceInsightsLineageEmpty:
        'Sobald mehrere erfolgreiche Runden vorhanden sind, erscheinen ihre Wurzeln und Verzweigungsbeziehungen hier.',
    workspaceInsightsTimelineTitle: 'Letzte Aktivitat',
    workspaceInsightsTimelineDesc:
        'Anfragen, Ausgaben, Verlaufsschritte und Fehler bleiben hier lesbar, ohne den Arbeitsbereich zu verlassen.',
    workspaceInsightsTimelineEmpty: 'System- und Generierungsnachrichten erscheinen hier, wahrend Sie arbeiten.',
    workspaceInsightsOpenGallery: 'Galerie offnen',
    workspaceInsightsOpenPromptHistory: 'Prompt-Verlauf offnen',
    workspaceInsightsItemsCount: '{0} Elemente',
    workspaceInsightsSessionHintsEmpty:
        'Sitzungshinweise fur Verankerungs- oder Mehrfachrunden-Ablaufe erscheinen hier.',
} as const;

const ruWorkspaceInsightsStructuralBaseline = {
    workspaceInsightsBranchesEmpty: 'Когда сессия начнет расходиться по разным направлениям, ветки появятся здесь.',
    workspaceInsightsNoContinuitySignals: 'Пока нет сигналов продолжения.',
    workspaceInsightsOfficialConversation: 'История чата',
    workspaceInsightsConversationBranchActiveSource: 'Ветка {0} · активный источник {1}',
    workspaceInsightsSessionSource: 'Эта сессия',
    workspaceInsightsSessionStateHint:
        'Даже когда сцена меняется, здесь остаются видны текущий результат, сохраненные версии, использованные источники и недавняя активность.',
    workspaceInsightsTitle: 'Текущая работа, версии, источники и активность',
    workspaceInsightsStageSourceEmpty:
        'Когда результат попадает на сцену, эта карточка покажет, пришел ли он из истории, из активного продолжения ветки, из последующего редактирования или из повторно открытого хода.',
    workspaceInsightsLatestResultTextEmpty:
        'Когда активен режим изображений и текста, сводка по сцене появляется здесь и в просмотрщике.',
    workspaceInsightsSessionTurnStack: 'Недавние ходы',
    workspaceInsightsTurnsCount: '{0} ходов',
    workspaceInsightsSessionTurnStackEmpty:
        'Недавние успешные ходы появятся здесь для быстрого повторного открытия, продолжения или ветвления.',
    workspaceInsightsLineageMap: 'Карта версий',
    workspaceInsightsRootsCount: '{0} корней',
    workspaceInsightsRoot: 'Корень',
    workspaceInsightsLineageEmpty:
        'Когда накопится несколько успешных ходов, их корни и связи между ветками появятся здесь.',
    workspaceInsightsTimelineTitle: 'Недавние события',
    workspaceInsightsTimelineDesc:
        'Запросы, результаты, шаги истории и ошибки остаются читаемыми здесь без выхода из рабочего пространства.',
    workspaceInsightsTimelineEmpty: 'Сообщения системы и генерации будут появляться здесь по мере работы.',
    workspaceInsightsOpenGallery: 'Открыть галерею',
    workspaceInsightsOpenPromptHistory: 'Открыть историю промптов',
    workspaceInsightsItemsCount: '{0} элементов',
    workspaceInsightsSessionHintsEmpty:
        'Здесь будут появляться подсказки уровня сессии для граундинга и многоходовых процессов.',
} as const;

const koGroundingPanelProvenanceBaseline = {
    provenanceCarryForwardLog: '출처 연속성이 이전 그라운딩 턴에서 이어졌습니다.',
    groundingPanelContinuitySummary: '연속성 요약',
    groundingPanelAttributionOverview: '귀속 개요',
    groundingPanelAttributionCoverage: '커버리지',
    groundingPanelAttributionCoverageValue: '{0}/{1}개 인용',
    groundingPanelAttributionSourceMix: '소스 구성',
    groundingPanelAttributionQueries: '질의',
    groundingPanelAttributionEntryPoint: '진입 지점',
    groundingPanelAttributionEntryPointRendered: '렌더링된 미리보기 반환됨',
    groundingPanelAttributionEntryPointAvailable: '렌더링된 미리보기 없이 사용 가능',
    groundingPanelAttributionEntryPointNotReturned: '반환되지 않음',
    groundingPanelAttributionEntryPointNotRequested: '요청되지 않음',
    groundingPanelAttributionSourceTypeWeb: '웹',
    groundingPanelAttributionSourceTypeImage: '이미지',
    groundingPanelAttributionSourceTypeContext: '컨텍스트',
    groundingPanelAttributionWebQueries: '웹',
    groundingPanelAttributionImageQueries: '이미지',
    groundingPanelAttributionNoSources: '소스 없음',
    groundingPanelAttributionNoSourcesToCompare: '비교할 소스 없음',
    groundingPanelAttributionNoQueriesShort: '질의 없음',
    groundingPanelAttributionEntryPointStatus: '검색 진입 지점 상태: {0}',
    groundingPanelAttributionSourceStatus: '소스 인용 상태',
    groundingPanelAttributionSourceStatusValue: '{0}개 인용 · {1}개는 검색만 됨',
    groundingPanelAttributionStatus: '귀속 상태',
    groundingPanelUncitedSourcesSection: '검색되었지만 인용되지 않음',
    groundingPanelUncitedSourcesHint:
        '이 소스는 그라운딩 메타데이터를 위해 검색되었지만, 반환된 지원 번들에서 직접 인용되지는 않았습니다.',
    groundingPanelProvenanceSource: '출처 원본',
    groundingPanelCitationDetail: '인용 세부 정보',
    groundingPanelEmptyDetail:
        '소스나 지원 번들을 선택하면 세그먼트 수준의 귀속을 살펴보고 컴포저에서 다시 사용할 수 있습니다.',
    groundingPanelSourcesSection: '소스',
    groundingPanelCoverageSection: '커버리지',
    groundingPanelQueriesSection: '질의',
    groundingPanelNoQueries: '모델이 그라운딩 질의어를 반환하면 여기에 표시됩니다.',
    groundingPanelSearchEntryPoint: '검색 진입 지점',
    groundingPanelSelectedSourceState: '선택한 소스',
    groundingPanelCoveredBySelectedBundleState: '선택한 번들로 커버됨',
    groundingPanelSourceStatusCited: '인용됨',
    groundingPanelSourceStatusRetrievedOnly: '검색만 됨',
    groundingPanelSourceIndex: '소스 {0}',
    groundingPanelOpenSource: '소스 열기',
    groundingPanelSupportBundleTitle: '지원 번들 {0}',
    groundingPanelSourcesCount: '소스 {0}개',
    groundingPanelChunksMeta: '청크: {0}',
    groundingPanelFocusState: '현재 인용과 연결된 소스 {0}개와 번들 {1}개에 초점을 맞추고 있습니다.',
    groundingPanelFullContextState:
        '전체 인용 컨텍스트를 표시하고 있습니다. 연결된 항목에 초점을 맞추면 주변 목록을 좁힐 수 있습니다.',
    groundingPanelShowAllItems: '모든 항목 보기',
    groundingPanelFocusLinkedItems: '연결된 항목에 초점',
    groundingPanelClearSelection: '선택 해제',
    groundingPanelSelectedSource: '선택된 소스',
    groundingPanelAppendPrompt: '프롬프트에 추가',
    groundingPanelReplacePrompt: '프롬프트 교체',
    groundingPanelReusePreview: '컴포저 재사용 미리보기',
    groundingPanelReuseAppendPreview: '추가 결과',
    groundingPanelReuseReplacePreview: '교체 결과',
    groundingPanelReuseCurrentPromptLabel: '유지되는 현재 프롬프트',
    groundingPanelReuseAddedCueLabel: '추가된 그라운딩 단서',
    groundingPanelReuseAppendImpactKeep: '현재 컴포저 프롬프트는 유지하고, 그 아래에 그라운딩 단서를 추가합니다.',
    groundingPanelReuseAppendImpactEmpty:
        '아직 현재 프롬프트가 없습니다. 추가하면 이 그라운딩 텍스트가 새 프롬프트로 사용됩니다.',
    groundingPanelReuseReplaceImpact: '현재 컴포저 프롬프트를 이 그라운딩 텍스트로 교체합니다.',
    groundingPanelReusePreviewHint:
        '추가는 이 단서를 현재 프롬프트 아래에 붙이고, 교체는 프롬프트를 이 재사용 텍스트로 바꿉니다.',
    groundingPanelCitedSegments: '인용 세그먼트',
    groundingPanelNoBundleSegmentText: '이 인용 번들에는 공개된 세그먼트 텍스트가 없습니다.',
    groundingPanelInspectBundle: '번들 살펴보기',
    groundingPanelNoBundleCitesSource: '현재 이 소스를 인용하는 지원 번들은 없습니다.',
    groundingPanelSourceCitationCount: '{0}개 번들에서 참조됨',
    groundingPanelSourceCompareSummaryCited: '이 소스는 {1}개 번들 중 {0}개에서 인용됩니다.',
    groundingPanelSourceCompareSummaryUncited: '이 소스는 {1}개 번들 중 {0}개에서 인용됩니다.',
    groundingPanelSelectedBundle: '선택한 번들',
    groundingPanelSelectedBundleMeta: '청크: {0} · 연결된 소스 {1}개',
    groundingPanelCitedSourcesCount: '인용된 소스 {0}개',
    groundingPanelLinkedSources: '연결된 소스',
    groundingPanelCompareStateLinked: '번들 내',
    groundingPanelCompareStateOutside: '번들 밖',
    groundingPanelBundleCompareSummary: '이 번들은 검색된 {1}개 소스 중 {0}개를 인용합니다.',
    groundingPanelBundleCompareOtherSources: '검색된 소스 {0}개가 이 번들 밖에 남아 있습니다.',
    groundingPanelOtherRetrievedSources: '기타 검색된 소스',
    groundingPanelInspectSource: '소스 살펴보기',
    groundingPanelNoLinkedSourcesForBundle: '이 번들에 사용할 수 있는 연결 소스가 없습니다.',
    groundingPanelNoOtherSourcesForBundle: '이 번들 밖에 남아 있는 다른 검색 소스가 없습니다.',
    groundingPanelNoLinkedSourcesForSelection: '현재 인용 선택과 일치하는 연결 소스가 없습니다.',
    groundingPanelNoLinkedBundlesForSelection: '현재 인용 선택과 일치하는 연결 지원 번들이 없습니다.',
} as const;

const esGroundingPanelProvenanceBaseline = {
    provenanceCarryForwardLog: 'La continuidad de procedencia se arrastro desde el turno fundamentado anterior.',
    groundingPanelContinuitySummary: 'Resumen de continuidad',
    groundingPanelAttributionOverview: 'Resumen de atribucion',
    groundingPanelAttributionCoverage: 'Cobertura',
    groundingPanelAttributionCoverageValue: '{0}/{1} citadas',
    groundingPanelAttributionSourceMix: 'Mezcla de fuentes',
    groundingPanelAttributionQueries: 'Consultas',
    groundingPanelAttributionEntryPoint: 'Punto de entrada',
    groundingPanelAttributionEntryPointRendered: 'Se devolvio vista previa renderizada',
    groundingPanelAttributionEntryPointAvailable: 'Disponible sin vista previa renderizada',
    groundingPanelAttributionEntryPointNotReturned: 'No devuelto',
    groundingPanelAttributionEntryPointNotRequested: 'No solicitado',
    groundingPanelAttributionSourceTypeWeb: 'sitio web',
    groundingPanelAttributionSourceTypeImage: 'imagen',
    groundingPanelAttributionSourceTypeContext: 'contexto',
    groundingPanelAttributionWebQueries: 'consultas web',
    groundingPanelAttributionImageQueries: 'imagen',
    groundingPanelAttributionNoSources: 'Sin fuentes',
    groundingPanelAttributionNoSourcesToCompare: 'No hay fuentes para comparar',
    groundingPanelAttributionNoQueriesShort: 'Sin consultas',
    groundingPanelAttributionEntryPointStatus: 'Estado del punto de entrada de busqueda: {0}',
    groundingPanelAttributionSourceStatus: 'Estado de citacion de fuentes',
    groundingPanelAttributionSourceStatusValue: '{0} citadas · {1} solo recuperadas',
    groundingPanelAttributionStatus: 'Estado de atribucion',
    groundingPanelUncitedSourcesSection: 'Recuperadas pero no citadas',
    groundingPanelUncitedSourcesHint:
        'Esta fuente se recupero para los metadatos de fundamentacion, pero no se cito directamente en los bloques de soporte devueltos.',
    groundingPanelProvenanceSource: 'Fuente de procedencia',
    groundingPanelCitationDetail: 'Detalle de citacion',
    groundingPanelEmptyDetail:
        'Selecciona una fuente o un bloque de soporte para revisar la atribucion por segmento y reutilizarla en el compositor.',
    groundingPanelSourcesSection: 'Fuentes',
    groundingPanelCoverageSection: 'Cobertura',
    groundingPanelQueriesSection: 'Consultas',
    groundingPanelNoQueries:
        'Los terminos de consulta de fundamentacion apareceran aqui cuando el modelo los devuelva.',
    groundingPanelSearchEntryPoint: 'Punto de entrada de busqueda',
    groundingPanelSelectedSourceState: 'Fuente seleccionada',
    groundingPanelCoveredBySelectedBundleState: 'Cubierta por el bloque seleccionado',
    groundingPanelSourceStatusCited: 'Citada',
    groundingPanelSourceStatusRetrievedOnly: 'Solo recuperada',
    groundingPanelSourceIndex: 'Fuente {0}',
    groundingPanelOpenSource: 'Abrir fuente',
    groundingPanelSupportBundleTitle: 'Bloque de soporte {0}',
    groundingPanelSourcesCount: '{0} fuentes',
    groundingPanelChunksMeta: 'Fragmentos: {0}',
    groundingPanelFocusState: 'Enfocado en {0} fuentes y {1} bloques vinculados a la cita actual.',
    groundingPanelFullContextState:
        'Mostrando el contexto completo de la cita. Enfoca los elementos vinculados para reducir las listas circundantes.',
    groundingPanelShowAllItems: 'Mostrar todos los elementos',
    groundingPanelFocusLinkedItems: 'Enfocar elementos vinculados',
    groundingPanelClearSelection: 'Borrar seleccion',
    groundingPanelSelectedSource: 'Fuente seleccionada',
    groundingPanelAppendPrompt: 'Anadir al prompt',
    groundingPanelReplacePrompt: 'Reemplazar prompt',
    groundingPanelReusePreview: 'Vista previa de reutilizacion del compositor',
    groundingPanelReuseAppendPreview: 'Resultado al anadir',
    groundingPanelReuseReplacePreview: 'Resultado al reemplazar',
    groundingPanelReuseCurrentPromptLabel: 'Prompt actual conservado',
    groundingPanelReuseAddedCueLabel: 'Indicacion de fundamentacion anadida',
    groundingPanelReuseAppendImpactKeep:
        'Conserva el prompt actual del compositor y anade debajo la indicacion de fundamentacion.',
    groundingPanelReuseAppendImpactEmpty:
        'Todavia no hay un prompt actual. Anadir usara este texto de fundamentacion como el nuevo prompt.',
    groundingPanelReuseReplaceImpact: 'Reemplaza el prompt actual del compositor con este texto de fundamentacion.',
    groundingPanelReusePreviewHint:
        'Anadir agrega esta indicacion debajo del prompt actual. Reemplazar cambia el prompt por este texto reutilizado.',
    groundingPanelCitedSegments: 'Segmentos citados',
    groundingPanelNoBundleSegmentText: 'No se expuso texto de segmentos para este bloque de citacion.',
    groundingPanelInspectBundle: 'Inspeccionar bloque',
    groundingPanelNoBundleCitesSource: 'Ningun bloque de soporte cita actualmente esta fuente.',
    groundingPanelSourceCitationCount: 'Referenciada en {0} bloques',
    groundingPanelSourceCompareSummaryCited: 'Esta fuente se cita en {0} de {1} bloques.',
    groundingPanelSourceCompareSummaryUncited: 'Esta fuente se cita en {0} de {1} bloques.',
    groundingPanelSelectedBundle: 'Bloque seleccionado',
    groundingPanelSelectedBundleMeta: 'Fragmentos: {0} · {1} fuentes vinculadas',
    groundingPanelCitedSourcesCount: '{0} fuentes citadas',
    groundingPanelLinkedSources: 'Fuentes vinculadas',
    groundingPanelCompareStateLinked: 'En el bloque',
    groundingPanelCompareStateOutside: 'Fuera del bloque',
    groundingPanelBundleCompareSummary: 'Este bloque cita {0} de {1} fuentes recuperadas.',
    groundingPanelBundleCompareOtherSources: 'Quedan {0} fuentes recuperadas fuera de este bloque.',
    groundingPanelOtherRetrievedSources: 'Otras fuentes recuperadas',
    groundingPanelInspectSource: 'Inspeccionar fuente',
    groundingPanelNoLinkedSourcesForBundle: 'No hay fuentes vinculadas disponibles para este bloque.',
    groundingPanelNoOtherSourcesForBundle: 'No quedan otras fuentes recuperadas fuera de este bloque.',
    groundingPanelNoLinkedSourcesForSelection: 'Ninguna fuente vinculada coincide con la seleccion de citacion actual.',
    groundingPanelNoLinkedBundlesForSelection:
        'Ningun bloque de soporte vinculado coincide con la seleccion de citacion actual.',
} as const;

const frGroundingPanelProvenanceBaseline = {
    provenanceCarryForwardLog: 'La continuite de provenance a ete reportee depuis le tour precedent avec contexte.',
    groundingPanelContinuitySummary: 'Resume de continuite',
    groundingPanelAttributionOverview: "Resume d'attribution",
    groundingPanelAttributionCoverage: 'Couverture',
    groundingPanelAttributionCoverageValue: '{0}/{1} citees',
    groundingPanelAttributionSourceMix: 'Repartition des sources',
    groundingPanelAttributionQueries: 'Requetes',
    groundingPanelAttributionEntryPoint: "Point d'entree",
    groundingPanelAttributionEntryPointRendered: 'Apercu rendu renvoye',
    groundingPanelAttributionEntryPointAvailable: 'Disponible sans apercu rendu',
    groundingPanelAttributionEntryPointNotReturned: 'Non renvoye',
    groundingPanelAttributionEntryPointNotRequested: 'Non demande',
    groundingPanelAttributionSourceTypeWeb: 'site web',
    groundingPanelAttributionSourceTypeImage: 'source image',
    groundingPanelAttributionSourceTypeContext: 'contexte',
    groundingPanelAttributionWebQueries: 'requetes web',
    groundingPanelAttributionImageQueries: 'requetes image',
    groundingPanelAttributionNoSources: 'Aucune source',
    groundingPanelAttributionNoSourcesToCompare: 'Aucune source a comparer',
    groundingPanelAttributionNoQueriesShort: 'Aucune requete',
    groundingPanelAttributionEntryPointStatus: "Etat du point d'entree de recherche : {0}",
    groundingPanelAttributionSourceStatus: 'Etat de citation des sources',
    groundingPanelAttributionSourceStatusValue: '{0} citees · {1} seulement recuperees',
    groundingPanelAttributionStatus: "Etat d'attribution",
    groundingPanelUncitedSourcesSection: 'Recuperees mais non citees',
    groundingPanelUncitedSourcesHint:
        "Cette source a ete recuperee pour les metadonnees de contexte, mais n'a pas ete citee directement dans les blocs de support renvoyes.",
    groundingPanelProvenanceSource: 'Source de provenance',
    groundingPanelCitationDetail: 'Detail de citation',
    groundingPanelEmptyDetail:
        "Selectionnez une source ou un bloc de support pour examiner l'attribution au niveau des segments et la reutiliser dans le compositeur.",
    groundingPanelSourcesSection: 'Sources de contexte',
    groundingPanelCoverageSection: 'Couverture',
    groundingPanelQueriesSection: 'Requetes',
    groundingPanelNoQueries: 'Les termes de requete de contexte apparaitront ici lorsque le modele les renverra.',
    groundingPanelSearchEntryPoint: "Point d'entree de recherche",
    groundingPanelSelectedSourceState: 'Source selectionnee',
    groundingPanelCoveredBySelectedBundleState: 'Couvert par le bloc selectionne',
    groundingPanelSourceStatusCited: 'Citee',
    groundingPanelSourceStatusRetrievedOnly: 'Recuperee seulement',
    groundingPanelSourceIndex: 'Source de contexte {0}',
    groundingPanelOpenSource: 'Ouvrir la source',
    groundingPanelSupportBundleTitle: 'Bloc de support {0}',
    groundingPanelSourcesCount: '{0} sources de contexte',
    groundingPanelChunksMeta: 'Segments : {0}',
    groundingPanelFocusState: 'Focalise sur {0} sources et {1} blocs lies a la citation actuelle.',
    groundingPanelFullContextState:
        'Affichage du contexte complet de citation. Focalisez les elements lies pour reduire les listes autour.',
    groundingPanelShowAllItems: 'Afficher tous les elements',
    groundingPanelFocusLinkedItems: 'Focaliser les elements lies',
    groundingPanelClearSelection: 'Effacer la selection',
    groundingPanelSelectedSource: 'Source selectionnee',
    groundingPanelAppendPrompt: 'Ajouter au prompt',
    groundingPanelReplacePrompt: 'Remplacer le prompt',
    groundingPanelReusePreview: 'Apercu de reutilisation du compositeur',
    groundingPanelReuseAppendPreview: "Resultat de l'ajout",
    groundingPanelReuseReplacePreview: 'Resultat du remplacement',
    groundingPanelReuseCurrentPromptLabel: 'Prompt actuel conserve',
    groundingPanelReuseAddedCueLabel: 'Indice de contexte ajoute',
    groundingPanelReuseAppendImpactKeep:
        "Conserve le prompt actuel du compositeur et ajoute en dessous l'indice de contexte.",
    groundingPanelReuseAppendImpactEmpty:
        "Aucun prompt actuel pour l'instant. L'ajout utilisera ce texte de contexte comme nouveau prompt.",
    groundingPanelReuseReplaceImpact: 'Remplace le prompt actuel du compositeur par ce texte de contexte.',
    groundingPanelReusePreviewHint:
        "L'ajout place cet indice sous le prompt actuel. Le remplacement substitue le prompt par ce texte reutilise.",
    groundingPanelCitedSegments: 'Segments cites',
    groundingPanelNoBundleSegmentText: "Aucun texte de segment n'a ete expose pour ce bloc de citation.",
    groundingPanelInspectBundle: 'Inspecter le bloc',
    groundingPanelNoBundleCitesSource: 'Aucun bloc de support ne cite actuellement cette source.',
    groundingPanelSourceCitationCount: 'Referencee dans {0} blocs',
    groundingPanelSourceCompareSummaryCited: 'Cette source est citee dans {0} des {1} blocs.',
    groundingPanelSourceCompareSummaryUncited: 'Cette source est citee dans {0} des {1} blocs.',
    groundingPanelSelectedBundle: 'Bloc selectionne',
    groundingPanelSelectedBundleMeta: 'Segments : {0} · {1} sources liees',
    groundingPanelCitedSourcesCount: '{0} sources citees',
    groundingPanelLinkedSources: 'Sources liees',
    groundingPanelCompareStateLinked: 'Dans le bloc',
    groundingPanelCompareStateOutside: 'Hors du bloc',
    groundingPanelBundleCompareSummary: 'Ce bloc cite {0} des {1} sources recuperees.',
    groundingPanelBundleCompareOtherSources: 'Il reste {0} sources recuperees hors de ce bloc.',
    groundingPanelOtherRetrievedSources: 'Autres sources recuperees',
    groundingPanelInspectSource: 'Inspecter la source',
    groundingPanelNoLinkedSourcesForBundle: "Aucune source liee n'est disponible pour ce bloc.",
    groundingPanelNoOtherSourcesForBundle: 'Aucune autre source recuperee ne reste hors de ce bloc.',
    groundingPanelNoLinkedSourcesForSelection: 'Aucune source liee ne correspond a la selection de citation actuelle.',
    groundingPanelNoLinkedBundlesForSelection:
        'Aucun bloc de support lie ne correspond a la selection de citation actuelle.',
} as const;

const deGroundingPanelProvenanceBaseline = {
    provenanceCarryForwardLog: 'Die Herkunfts-Kontinuitat wurde aus der vorherigen verankerten Runde ubernommen.',
    groundingPanelContinuitySummary: 'Kontinuitatsubersicht',
    groundingPanelAttributionOverview: 'Attributionsubersicht',
    groundingPanelAttributionCoverage: 'Abdeckung',
    groundingPanelAttributionCoverageValue: '{0}/{1} zitiert',
    groundingPanelAttributionSourceMix: 'Quellenmix',
    groundingPanelAttributionQueries: 'Abfragen',
    groundingPanelAttributionEntryPoint: 'Einstiegspunkt',
    groundingPanelAttributionEntryPointRendered: 'Gerenderte Vorschau zuruckgegeben',
    groundingPanelAttributionEntryPointAvailable: 'Ohne gerenderte Vorschau verfugbar',
    groundingPanelAttributionEntryPointNotReturned: 'Nicht zuruckgegeben',
    groundingPanelAttributionEntryPointNotRequested: 'Nicht angefordert',
    groundingPanelAttributionSourceTypeWeb: 'Web',
    groundingPanelAttributionSourceTypeImage: 'Bild',
    groundingPanelAttributionSourceTypeContext: 'Kontext',
    groundingPanelAttributionWebQueries: 'Web',
    groundingPanelAttributionImageQueries: 'Bild',
    groundingPanelAttributionNoSources: 'Keine Quellen',
    groundingPanelAttributionNoSourcesToCompare: 'Keine Quellen zum Vergleichen',
    groundingPanelAttributionNoQueriesShort: 'Keine Abfragen',
    groundingPanelAttributionEntryPointStatus: 'Status des Such-Einstiegspunkts: {0}',
    groundingPanelAttributionSourceStatus: 'Status der Quellenzitate',
    groundingPanelAttributionSourceStatusValue: '{0} zitiert · {1} nur abgerufen',
    groundingPanelAttributionStatus: 'Attributionsstatus',
    groundingPanelUncitedSourcesSection: 'Abgerufen, aber nicht zitiert',
    groundingPanelUncitedSourcesHint:
        'Diese Quelle wurde fur Verankerungs-Metadaten abgerufen, aber in den zuruckgegebenen Unterstutzungsbundeln nicht direkt zitiert.',
    groundingPanelProvenanceSource: 'Herkunftsquelle',
    groundingPanelCitationDetail: 'Zitierdetails',
    groundingPanelEmptyDetail:
        'Wahlen Sie eine Quelle oder ein Unterstutzungsbundel aus, um die segmentbezogene Attribution zu prufen und im Composer wiederzuverwenden.',
    groundingPanelSourcesSection: 'Quellen',
    groundingPanelCoverageSection: 'Abdeckung',
    groundingPanelQueriesSection: 'Abfragen',
    groundingPanelNoQueries: 'Begriffe aus Verankerungsabfragen erscheinen hier, wenn das Modell sie zuruckgibt.',
    groundingPanelSearchEntryPoint: 'Such-Einstiegspunkt',
    groundingPanelSelectedSourceState: 'Ausgewahlte Quelle',
    groundingPanelCoveredBySelectedBundleState: 'Vom ausgewahlten Bundel abgedeckt',
    groundingPanelSourceStatusCited: 'Zitiert',
    groundingPanelSourceStatusRetrievedOnly: 'Nur abgerufen',
    groundingPanelSourceIndex: 'Quelle {0}',
    groundingPanelOpenSource: 'Quelle offnen',
    groundingPanelSupportBundleTitle: 'Unterstutzungsbundel {0}',
    groundingPanelSourcesCount: '{0} Quellen',
    groundingPanelChunksMeta: 'Segmente: {0}',
    groundingPanelFocusState: 'Fokussiert auf {0} Quellen und {1} Bundel, die mit dem aktuellen Zitat verknupft sind.',
    groundingPanelFullContextState:
        'Der vollstandige Zitatkontext wird angezeigt. Fokussieren Sie verknupfte Elemente, um die umliegenden Listen einzugrenzen.',
    groundingPanelShowAllItems: 'Alle Elemente anzeigen',
    groundingPanelFocusLinkedItems: 'Verknupfte Elemente fokussieren',
    groundingPanelClearSelection: 'Auswahl aufheben',
    groundingPanelSelectedSource: 'Ausgewahlte Quelle',
    groundingPanelAppendPrompt: 'An Prompt anfugen',
    groundingPanelReplacePrompt: 'Prompt ersetzen',
    groundingPanelReusePreview: 'Composer-Wiederverwendungs-Vorschau',
    groundingPanelReuseAppendPreview: 'Anfugergebnis',
    groundingPanelReuseReplacePreview: 'Ersetzungsergebnis',
    groundingPanelReuseCurrentPromptLabel: 'Aktueller Prompt bleibt',
    groundingPanelReuseAddedCueLabel: 'Verankerungshinweis hinzugefugt',
    groundingPanelReuseAppendImpactKeep:
        'Behalt den aktuellen Composer-Prompt bei und fugt den Verankerungshinweis darunter hinzu.',
    groundingPanelReuseAppendImpactEmpty:
        'Es gibt noch keinen aktuellen Prompt. Anfugen verwendet diesen Verankerungstext als neuen Prompt.',
    groundingPanelReuseReplaceImpact: 'Ersetzt den aktuellen Composer-Prompt durch diesen Verankerungstext.',
    groundingPanelReusePreviewHint:
        'Anfugen setzt diesen Hinweis unter den aktuellen Prompt. Ersetzen tauscht den Prompt gegen diesen Wiederverwendungstext aus.',
    groundingPanelCitedSegments: 'Zitierte Segmente',
    groundingPanelNoBundleSegmentText: 'Fur dieses Zitatbundel wurde kein Segmenttext offengelegt.',
    groundingPanelInspectBundle: 'Bundel prufen',
    groundingPanelNoBundleCitesSource: 'Derzeit zitiert kein Unterstutzungsbundel diese Quelle.',
    groundingPanelSourceCitationCount: 'In {0} Bundeln referenziert',
    groundingPanelSourceCompareSummaryCited: 'Diese Quelle wird in {0} von {1} Bundeln zitiert.',
    groundingPanelSourceCompareSummaryUncited: 'Diese Quelle wird in {0} von {1} Bundeln zitiert.',
    groundingPanelSelectedBundle: 'Ausgewahltes Bundel',
    groundingPanelSelectedBundleMeta: 'Segmente: {0} · {1} verknupfte Quellen',
    groundingPanelCitedSourcesCount: '{0} zitierte Quellen',
    groundingPanelLinkedSources: 'Verknupfte Quellen',
    groundingPanelCompareStateLinked: 'Im Bundel',
    groundingPanelCompareStateOutside: 'Ausserhalb des Bundels',
    groundingPanelBundleCompareSummary: 'Dieses Bundel zitiert {0} von {1} abgerufenen Quellen.',
    groundingPanelBundleCompareOtherSources: '{0} abgerufene Quellen liegen ausserhalb dieses Bundels.',
    groundingPanelOtherRetrievedSources: 'Andere abgerufene Quellen',
    groundingPanelInspectSource: 'Quelle prufen',
    groundingPanelNoLinkedSourcesForBundle: 'Fur dieses Bundel sind keine verknupften Quellen verfugbar.',
    groundingPanelNoOtherSourcesForBundle: 'Ausserhalb dieses Bundels bleiben keine anderen abgerufenen Quellen ubrig.',
    groundingPanelNoLinkedSourcesForSelection: 'Keine verknupften Quellen passen zur aktuellen Zitatauswahl.',
    groundingPanelNoLinkedBundlesForSelection:
        'Keine verknupften Unterstutzungsbundel passen zur aktuellen Zitatauswahl.',
} as const;

const ruGroundingPanelProvenanceBaseline = {
    provenanceCarryForwardLog: 'Сведения об источнике были перенесены из предыдущего хода с граундингом.',
    groundingPanelContinuitySummary: 'Сводка продолжения',
    groundingPanelAttributionOverview: 'Обзор атрибуции',
    groundingPanelAttributionCoverage: 'Покрытие',
    groundingPanelAttributionCoverageValue: '{0}/{1} процитировано',
    groundingPanelAttributionSourceMix: 'Состав источников',
    groundingPanelAttributionQueries: 'Запросы',
    groundingPanelAttributionEntryPoint: 'Точка входа',
    groundingPanelAttributionEntryPointRendered: 'Возвращен отрисованный предпросмотр',
    groundingPanelAttributionEntryPointAvailable: 'Доступно без отрисованного предпросмотра',
    groundingPanelAttributionEntryPointNotReturned: 'Не возвращено',
    groundingPanelAttributionEntryPointNotRequested: 'Не запрошено',
    groundingPanelAttributionSourceTypeWeb: 'веб',
    groundingPanelAttributionSourceTypeImage: 'изображение',
    groundingPanelAttributionSourceTypeContext: 'контекст',
    groundingPanelAttributionWebQueries: 'веб',
    groundingPanelAttributionImageQueries: 'изображение',
    groundingPanelAttributionNoSources: 'Нет источников',
    groundingPanelAttributionNoSourcesToCompare: 'Нет источников для сравнения',
    groundingPanelAttributionNoQueriesShort: 'Нет запросов',
    groundingPanelAttributionEntryPointStatus: 'Статус точки входа поиска: {0}',
    groundingPanelAttributionSourceStatus: 'Статус цитирования источников',
    groundingPanelAttributionSourceStatusValue: '{0} процитировано · {1} только получено',
    groundingPanelAttributionStatus: 'Статус атрибуции',
    groundingPanelUncitedSourcesSection: 'Получено, но не процитировано',
    groundingPanelUncitedSourcesHint:
        'Этот источник был получен для метаданных граундинга, но не был напрямую процитирован в возвращенных пакетах поддержки.',
    groundingPanelProvenanceSource: 'Источник происхождения',
    groundingPanelCitationDetail: 'Детали цитирования',
    groundingPanelEmptyDetail:
        'Выберите источник или пакет поддержки, чтобы изучить атрибуцию по сегментам и переиспользовать ее в компоновщике.',
    groundingPanelSourcesSection: 'Источники',
    groundingPanelCoverageSection: 'Покрытие',
    groundingPanelQueriesSection: 'Запросы',
    groundingPanelNoQueries: 'Термины поисковых запросов граундинга появятся здесь, когда модель их вернет.',
    groundingPanelSearchEntryPoint: 'Точка входа поиска',
    groundingPanelSelectedSourceState: 'Выбранный источник',
    groundingPanelCoveredBySelectedBundleState: 'Покрыто выбранным пакетом',
    groundingPanelSourceStatusCited: 'Процитировано',
    groundingPanelSourceStatusRetrievedOnly: 'Только получено',
    groundingPanelSourceIndex: 'Источник {0}',
    groundingPanelOpenSource: 'Открыть источник',
    groundingPanelSupportBundleTitle: 'Пакет поддержки {0}',
    groundingPanelSourcesCount: '{0} источников',
    groundingPanelChunksMeta: 'Фрагменты: {0}',
    groundingPanelFocusState: 'Фокус на {0} источниках и {1} пакетах, связанных с текущей цитатой.',
    groundingPanelFullContextState:
        'Показан полный контекст цитирования. Сфокусируйте связанные элементы, чтобы сузить окружающие списки.',
    groundingPanelShowAllItems: 'Показать все элементы',
    groundingPanelFocusLinkedItems: 'Сфокусировать связанные элементы',
    groundingPanelClearSelection: 'Очистить выбор',
    groundingPanelSelectedSource: 'Выбранный источник',
    groundingPanelAppendPrompt: 'Добавить в промпт',
    groundingPanelReplacePrompt: 'Заменить промпт',
    groundingPanelReusePreview: 'Предпросмотр повторного использования в компоновщике',
    groundingPanelReuseAppendPreview: 'Результат добавления',
    groundingPanelReuseReplacePreview: 'Результат замены',
    groundingPanelReuseCurrentPromptLabel: 'Текущий промпт сохранен',
    groundingPanelReuseAddedCueLabel: 'Добавлена подсказка граундинга',
    groundingPanelReuseAppendImpactKeep:
        'Сохраняет текущий промпт компоновщика и добавляет под ним подсказку граундинга.',
    groundingPanelReuseAppendImpactEmpty:
        'Текущего промпта пока нет. Добавление использует этот текст граундинга как новый промпт.',
    groundingPanelReuseReplaceImpact: 'Заменяет текущий промпт компоновщика этим текстом граундинга.',
    groundingPanelReusePreviewHint:
        'Добавление помещает эту подсказку под текущим промптом. Замена меняет промпт на этот повторно используемый текст.',
    groundingPanelCitedSegments: 'Цитируемые сегменты',
    groundingPanelNoBundleSegmentText: 'Для этого пакета цитирования не был показан текст сегмента.',
    groundingPanelInspectBundle: 'Проверить пакет',
    groundingPanelNoBundleCitesSource: 'Сейчас ни один пакет поддержки не цитирует этот источник.',
    groundingPanelSourceCitationCount: 'Упоминается в {0} пакетах',
    groundingPanelSourceCompareSummaryCited: 'Этот источник цитируется в {0} из {1} пакетов.',
    groundingPanelSourceCompareSummaryUncited: 'Этот источник цитируется в {0} из {1} пакетов.',
    groundingPanelSelectedBundle: 'Выбранный пакет',
    groundingPanelSelectedBundleMeta: 'Фрагменты: {0} · {1} связанных источников',
    groundingPanelCitedSourcesCount: '{0} цитируемых источников',
    groundingPanelLinkedSources: 'Связанные источники',
    groundingPanelCompareStateLinked: 'В пакете',
    groundingPanelCompareStateOutside: 'Вне пакета',
    groundingPanelBundleCompareSummary: 'Этот пакет цитирует {0} из {1} найденных источников.',
    groundingPanelBundleCompareOtherSources: '{0} найденных источников остаются вне этого пакета.',
    groundingPanelOtherRetrievedSources: 'Другие найденные источники',
    groundingPanelInspectSource: 'Проверить источник',
    groundingPanelNoLinkedSourcesForBundle: 'Для этого пакета нет доступных связанных источников.',
    groundingPanelNoOtherSourcesForBundle: 'Вне этого пакета не осталось других найденных источников.',
    groundingPanelNoLinkedSourcesForSelection: 'Нет связанных источников, соответствующих текущему выбору цитаты.',
    groundingPanelNoLinkedBundlesForSelection:
        'Нет связанных пакетов поддержки, соответствующих текущему выбору цитаты.',
} as const;

const jaSessionReplayAndImportReviewBaseline = {
    workspaceImportReviewDirectReplaceTitle:
        '現在のワークスペースを置換し、履歴内のインポート済み最新成功ターンへ移動します。',
    workspaceImportReviewChooseRoute: '次のルートを選ぶ',
    workspaceImportReviewChooseRouteHint: 'まず置換してから、このインポート元をどこで継続するかを選びます。',
    workspaceImportReviewHistoryRouteGroup: '履歴ルート',
    workspaceImportReviewHistoryRouteHint: 'まずは履歴内でこのインポート連鎖をたどります。',
    workspaceImportReviewActiveRouteGroup: 'アクティブルート',
    workspaceImportReviewActiveRouteHint: 'このインポートターンを次の作業ソースへ昇格します。',
    workspaceImportReviewReplaceBranchLatest: '置換して最新ソースから分岐',
    workspaceImportReviewFooterHint:
        '統合すると現在の作業状態はそのまま維持され、置換するとインポートしたワークスペースへ切り替わります。',
    workspaceImportReviewMergeTurnsOnly: 'ターンのみ統合',
    workspaceImportReviewReplaceCurrentWorkspace: '現在のワークスペースを置換',
    sessionReplayTitle: 'このワークスペースに保存されたワークフロータイムラインを再生します。',
    sessionReplayCurrentStageSource: '現在のステージソース',
    sessionReplayEmpty: 'このワークスペースには、まだワークフロー項目が記録されていません。',
    sessionReplayTimeline: '再生タイムライン',
} as const;

const koSessionReplayAndImportReviewBaseline = {
    workspaceImportReviewDirectReplaceTitle:
        '현재 워크스페이스를 교체하고 히스토리에서 가져온 마지막 성공 턴으로 바로 이동합니다.',
    workspaceImportReviewChooseRoute: '다음 경로 선택',
    workspaceImportReviewChooseRouteHint: '먼저 교체한 뒤, 이 가져온 소스를 어디에서 이어갈지 선택합니다.',
    workspaceImportReviewHistoryRouteGroup: '히스토리 경로',
    workspaceImportReviewHistoryRouteHint: '먼저 히스토리 안에서 이 가져온 흐름을 둘러봅니다.',
    workspaceImportReviewActiveRouteGroup: '활성 경로',
    workspaceImportReviewActiveRouteHint: '이 가져온 턴을 다음 작업 소스로 승격합니다.',
    workspaceImportReviewReplaceBranchLatest: '교체 후 최신 소스에서 분기',
    workspaceImportReviewFooterHint:
        '병합하면 현재 작업 상태가 그대로 유지되고, 교체하면 가져온 워크스페이스로 전환됩니다.',
    workspaceImportReviewMergeTurnsOnly: '턴만 병합',
    workspaceImportReviewReplaceCurrentWorkspace: '현재 워크스페이스 교체',
    sessionReplayTitle: '이 워크스페이스에 저장된 워크플로 타임라인을 재생합니다.',
    sessionReplayCurrentStageSource: '현재 스테이지 소스',
    sessionReplayEmpty: '이 워크스페이스에는 아직 워크플로 항목이 기록되지 않았습니다.',
    workspaceInsightsContinuitySourceTurn: '{0}개 턴',
    workspaceInsightsContinuityChatTurns: '대화 {0}개 턴',
} as const;

const esSessionReplayAndImportReviewBaseline = {
    workspaceImportReviewDirectReplaceTitle:
        'Reemplaza el espacio de trabajo actual y entra directamente en el ultimo turno importado con exito dentro del historial.',
    workspaceImportReviewChooseRoute: 'Elegir la siguiente ruta',
    workspaceImportReviewChooseRouteHint:
        'Primero reemplaza y luego decide donde debe continuar esta fuente importada.',
    workspaceImportReviewHistoryRouteGroup: 'Ruta de historial',
    workspaceImportReviewHistoryRouteHint: 'Sigue revisando esta cadena importada dentro del historial.',
    workspaceImportReviewActiveRouteGroup: 'Ruta activa',
    workspaceImportReviewActiveRouteHint: 'Promueve este turno importado como la siguiente fuente de trabajo.',
    workspaceImportReviewReplaceBranchLatest: 'Reemplazar + ramificar desde la fuente mas reciente',
    workspaceImportReviewFooterHint:
        'Fusionar mantiene intacta tu configuracion actual. Reemplazar cambia al espacio de trabajo importado.',
    workspaceImportReviewMergeTurnsOnly: 'Fusionar solo turnos',
    workspaceImportReviewReplaceCurrentWorkspace: 'Reemplazar el espacio de trabajo actual',
    sessionReplayEyebrow: 'Repeticion de sesion',
    sessionReplayTitle: 'Repite la linea temporal del flujo de trabajo guardada para este espacio de trabajo.',
    sessionReplayCurrentStageSource: 'Origen actual de la escena',
    sessionReplayEmpty: 'Todavia no se han capturado entradas del flujo de trabajo para este espacio de trabajo.',
    sessionReplayTimeline: 'Linea temporal de repeticion',
} as const;

const frSessionReplayAndImportReviewBaseline = {
    workspaceImportReviewDirectReplaceTitle:
        "Remplacez l'espace de travail actuel et arrivez directement sur le dernier tour importe avec succes dans l'historique.",
    workspaceImportReviewChooseRoute: 'Choisir la route suivante',
    workspaceImportReviewChooseRouteHint: "Remplacez d'abord, puis choisissez ou cette source importee doit continuer.",
    workspaceImportReviewHistoryRouteGroup: 'Route historique',
    workspaceImportReviewHistoryRouteHint: "Continuez d'examiner cette chaine importee dans l'historique.",
    workspaceImportReviewActiveRouteGroup: 'Route active',
    workspaceImportReviewActiveRouteHint: 'Faites de ce tour importe la prochaine source de travail.',
    workspaceImportReviewReplaceBranchLatest: 'Remplacer + creer une branche depuis la source la plus recente',
    workspaceImportReviewFooterHint:
        "La fusion conserve votre configuration actuelle. Le remplacement bascule vers l'espace de travail importe.",
    workspaceImportReviewMergeTurnsOnly: 'Fusionner les tours seulement',
    workspaceImportReviewReplaceCurrentWorkspace: "Remplacer l'espace de travail actuel",
    sessionReplayTitle: 'Relisez la chronologie du flux de travail capturee pour cet espace de travail.',
    sessionReplayCurrentStageSource: 'Source actuelle de la scene',
    sessionReplayEmpty: "Aucune entree du flux de travail n'a encore ete capturee pour cet espace de travail.",
    sessionReplayTimeline: 'Chronologie de relecture',
} as const;

const deSessionReplayAndImportReviewBaseline = {
    workspaceImportReviewDirectReplaceTitle:
        'Ersetzen Sie den aktuellen Arbeitsbereich und landen Sie direkt beim zuletzt erfolgreich importierten Eintrag im Verlauf.',
    workspaceImportReviewChooseRoute: 'Nachste Route wahlen',
    workspaceImportReviewChooseRouteHint:
        'Ersetzen Sie zuerst und wahlen Sie dann, wo diese importierte Quelle weiterlaufen soll.',
    workspaceImportReviewHistoryRouteGroup: 'Verlaufsroute',
    workspaceImportReviewHistoryRouteHint: 'Prufen Sie diese importierte Kette zunachst weiter im Verlauf.',
    workspaceImportReviewActiveRouteGroup: 'Aktive Route',
    workspaceImportReviewActiveRouteHint: 'Machen Sie diese importierte Runde zur nachsten Arbeitsquelle.',
    workspaceImportReviewReplaceBranchLatest: 'Ersetzen + von der neuesten Quelle verzweigen',
    workspaceImportReviewFooterHint:
        'Beim Zusammenfuhren bleibt Ihre aktuelle Arbeitsansicht erhalten. Beim Ersetzen wechseln Sie zum importierten Arbeitsbereich.',
    workspaceImportReviewMergeTurnsOnly: 'Nur Runden zusammenfuhren',
    workspaceImportReviewReplaceCurrentWorkspace: 'Aktuellen Arbeitsbereich ersetzen',
    sessionReplayEyebrow: 'Sitzungswiedergabe',
    sessionReplayTitle: 'Spielen Sie die aufgezeichnete Ablaufchronik fur diesen Arbeitsbereich erneut ab.',
    sessionReplayCurrentStageSource: 'Aktuelle Szenenquelle',
    sessionReplayEmpty: 'Fur diesen Arbeitsbereich wurden noch keine Ablaufeintrage erfasst.',
    sessionReplayTimeline: 'Wiedergabe-Chronik',
    workspaceInsightsContinuitySourceTurn: 'Runde {0}',
    workspaceInsightsContinuityChatTurns: '{0} Chat-Runden',
} as const;

const ruSessionReplayAndImportReviewBaseline = {
    workspaceImportReviewDirectReplaceTitle:
        'Замените текущее рабочее пространство и сразу перейдите к последнему успешно импортированному ходу в истории.',
    workspaceImportReviewChooseRoute: 'Выбрать следующий маршрут',
    workspaceImportReviewChooseRouteHint:
        'Сначала замените, затем выберите, где должен продолжиться этот импортированный источник.',
    workspaceImportReviewHistoryRouteGroup: 'Маршрут истории',
    workspaceImportReviewHistoryRouteHint: 'Продолжайте просматривать эту импортированную цепочку в истории.',
    workspaceImportReviewActiveRouteGroup: 'Активный маршрут',
    workspaceImportReviewActiveRouteHint: 'Поднимите этот импортированный ход до следующего рабочего источника.',
    workspaceImportReviewReplaceBranchLatest: 'Заменить + ответвить от последнего источника',
    workspaceImportReviewFooterHint:
        'Объединение сохраняет текущее состояние работы. После замены вы переключаетесь на импортированное рабочее пространство.',
    workspaceImportReviewMergeTurnsOnly: 'Объединить только ходы',
    workspaceImportReviewReplaceCurrentWorkspace: 'Заменить текущее рабочее пространство',
    sessionReplayEyebrow: 'Повтор сеанса',
    sessionReplayTitle: 'Повторите сохраненную хронологию рабочего потока для этого рабочего пространства.',
    sessionReplayCurrentStageSource: 'Текущий источник сцены',
    sessionReplayEmpty: 'Для этого рабочего пространства еще не записаны элементы рабочего потока.',
    sessionReplayTimeline: 'Хронология повтора',
    workspaceInsightsContinuitySourceTurn: 'ход {0}',
} as const;

const jaImportReviewSummaryBaseline = {
    workspaceImportReviewTurns: 'ターン数',
    workspaceImportReviewBranches: '分岐数',
    workspaceImportReviewSnapshotSummary: 'スナップショット概要',
    workspaceImportReviewViewerImages: 'ビューアー画像',
    workspaceImportReviewLatestTurn: '最新ターン',
    workspaceImportReviewNoTurnsSaved: '保存されたターンはありません',
    workspaceImportReviewSessionContinuity: 'セッション継続性',
    workspaceImportReviewProvenance: '由来情報 {0}',
    workspaceImportReviewNoProvenance: '保存された由来継続情報はありません',
    workspaceImportReviewBranchPreview: '分岐プレビュー',
    workspaceImportReviewLatestId: '最新 {0}',
    workspaceImportReviewBranchLatest: '最新ソースから分岐',
    workspaceImportReviewNoBranchLineage: 'このスナップショットでは成功した分岐系統は見つかりませんでした。',
} as const;

const koImportReviewSummaryBaseline = {
    workspaceImportReviewTurns: '턴 수',
    workspaceImportReviewBranches: '분기 수',
    workspaceImportReviewStagedAssets: '준비된 자산',
    workspaceImportReviewSnapshotSummary: '스냅샷 요약',
    workspaceImportReviewViewerImages: '뷰어 이미지',
    workspaceImportReviewLatestTurn: '최신 턴',
    workspaceImportReviewNoTurnsSaved: '저장된 턴 없음',
    workspaceImportReviewSessionContinuity: '세션 연속성',
    workspaceImportReviewProvenance: '출처 정보 {0}',
    workspaceImportReviewNoProvenance: '저장된 출처 연속성 없음',
    workspaceImportReviewBranchPreview: '분기 미리보기',
    workspaceImportReviewLatestId: '최신 {0}',
    workspaceImportReviewBranchLatest: '최신 소스에서 분기',
    workspaceImportReviewNoBranchLineage: '이 스냅샷에서는 성공한 분기 계보를 찾지 못했습니다.',
} as const;

const esImportReviewSummaryBaseline = {
    workspaceImportReviewTurns: 'Turnos',
    workspaceImportReviewStagedAssets: 'Recursos preparados',
    workspaceImportReviewSnapshotSummary: 'Resumen de la instantanea',
    workspaceImportReviewViewerImages: 'Imagenes del visor',
    workspaceImportReviewLatestTurn: 'Ultimo turno',
    workspaceImportReviewNoTurnsSaved: 'No hay turnos guardados',
    workspaceImportReviewSessionContinuity: 'Continuidad de la sesion',
    workspaceImportReviewProvenance: 'Procedencia {0}',
    workspaceImportReviewNoProvenance: 'No hay continuidad de procedencia guardada',
    workspaceImportReviewBranchLatest: 'Ramificar desde la fuente mas reciente',
    workspaceImportReviewNoBranchLineage: 'No se encontro una linea de rama exitosa en esta instantanea.',
} as const;

const frImportReviewSummaryBaseline = {
    workspaceImportReviewTurns: 'Tours',
    workspaceImportReviewStagedAssets: 'Ressources preparees',
    workspaceImportReviewSnapshotSummary: "Resume de l'instantane",
    workspaceImportReviewViewerImages: 'Images du visualiseur',
    workspaceImportReviewLatestTurn: 'Dernier tour',
    workspaceImportReviewNoTurnsSaved: 'Aucun tour enregistre',
    workspaceImportReviewSessionContinuity: 'Continuite de la session',
    workspaceImportReviewLatestId: 'dernier {0}',
    workspaceImportReviewBranchLatest: 'Creer une branche depuis la source la plus recente',
    workspaceImportReviewNoBranchLineage: "Aucune lignee de branche reussie n'a ete trouvee dans cet instantane.",
} as const;

const deImportReviewSummaryBaseline = {
    workspaceImportReviewTurns: 'Runden',
    workspaceImportReviewBranches: 'Zweige',
    workspaceImportReviewStagedAssets: 'Vorbereitete Assets',
    workspaceImportReviewSnapshotSummary: 'Zusammenfassung des Schnappschusses',
    workspaceImportReviewViewerImages: 'Bilder im Betrachter',
    workspaceImportReviewLatestTurn: 'Neueste Runde',
    workspaceImportReviewNoTurnsSaved: 'Keine Runden gespeichert',
    workspaceImportReviewSessionContinuity: 'Sitzungskontinuitaet',
    workspaceImportReviewProvenance: 'Herkunft {0}',
    workspaceImportReviewNoProvenance: 'Keine Herkunftskontinuitat gespeichert',
    workspaceImportReviewBranchPreview: 'Zweigvorschau',
    workspaceImportReviewLatestId: 'neueste {0}',
    workspaceImportReviewBranchLatest: 'Von der neuesten Quelle verzweigen',
    workspaceImportReviewNoBranchLineage:
        'In diesem Schnappschuss wurde keine erfolgreiche Verzweigungslinie gefunden.',
} as const;

const ruImportReviewSummaryBaseline = {
    workspaceImportReviewTurns: 'Ходы',
    workspaceImportReviewStagedAssets: 'Подготовленные ресурсы',
    workspaceImportReviewSnapshotSummary: 'Сводка снимка',
    workspaceImportReviewViewerImages: 'Изображения просмотра',
    workspaceImportReviewLatestTurn: 'Последний ход',
    workspaceImportReviewNoTurnsSaved: 'Сохраненных ходов нет',
    workspaceImportReviewSessionContinuity: 'Непрерывность сеанса',
    workspaceImportReviewProvenance: 'Сведения об источнике {0}',
    workspaceImportReviewNoProvenance: 'Сохраненной непрерывности источника нет',
    workspaceImportReviewLatestId: 'последний {0}',
    workspaceImportReviewBranchLatest: 'Ответвить от последнего источника',
    workspaceImportReviewNoBranchLineage: 'В этом снимке не найдено успешной линии ветвления.',
} as const;

const jaImportReviewLongformBaseline = {
    workspaceImportReviewTitle: '現在のワークスペースを置き換える前に、インポート内容を確認してください。',
    workspaceImportReviewDesc:
        'このスナップショットは確定するまで保持されます。現在のワークスペースを置き換えてインポートした連鎖の復元操作を開き直すか、候補を継続元に昇格させるか、現在のステージ・セッション・コンポーザー状態を保ったままインポートしたターンを統合できます。',
} as const;

const koImportReviewLongformBaseline = {
    workspaceImportReviewTitle: '현재 워크스페이스를 교체하기 전에 가져온 내용을 검토하세요.',
    workspaceImportReviewDesc:
        '이 스냅샷은 확인 전까지 유지됩니다. 현재 워크스페이스를 교체하고 가져온 흐름의 복원 동작을 다시 열거나, 후보를 연속 원본으로 승격하거나, 현재 스테이지·세션·컴포저 상태를 유지한 채 가져온 턴을 병합할 수 있습니다.',
} as const;

const esImportReviewLongformBaseline = {
    workspaceImportReviewTitle: 'Revisa el espacio de trabajo importado antes de reemplazar el actual.',
    workspaceImportReviewDesc:
        'Esta instantanea permanece preparada hasta que la confirmes. Puedes reemplazar el espacio de trabajo actual y volver a abrir las acciones de restauracion para la cadena importada, promover un candidato importado como fuente de continuacion o fusionar los turnos importados manteniendo el estado actual del escenario, la sesion y el compositor.',
} as const;

const frImportReviewLongformBaseline = {
    workspaceImportReviewTitle: "Verifiez l'espace de travail importe avant de remplacer l'actuel.",
    workspaceImportReviewDesc:
        "Cet instantane reste prepare jusqu'a confirmation. Vous pouvez remplacer l'espace de travail actuel et rouvrir les actions de restauration pour la chaine importee, promouvoir un candidat importe comme source de continuation ou fusionner les tours importes tout en conservant l'etat actuel de la scene, de la session et du compositeur.",
} as const;

const deImportReviewLongformBaseline = {
    workspaceImportReviewDesc:
        'Dieser Schnappschuss bleibt vorbereitet, bis Sie ihn bestatigen. Sie konnen den aktuellen Arbeitsbereich ersetzen und die Wiederherstellungsaktionen fur die importierte Kette erneut offnen, einen importierten Kandidaten als Fortsetzungsquelle ubernehmen oder die importierten Runden zusammenfuhren, wahrend der aktuelle Status von Stufe, Sitzung und Komposition erhalten bleibt.',
} as const;

const ruImportReviewLongformBaseline = {
    workspaceImportReviewDesc:
        'Этот снимок остается подготовленным до подтверждения. Можно заменить текущее рабочее пространство и заново открыть действия восстановления для импортированной цепочки, повысить импортированного кандидата до источника продолжения или объединить импортированные ходы, сохранив текущее состояние сцены, сессии и компоновщика.',
} as const;

const jaLineageRestoreBaseline = {
    lineageActionDescRoot: '現在のステージは自身のルートターンから直接来ており、以前の分岐操作を引き継いでいません。',
    lineageActionDescContinue: 'このステージは現在の分岐をそのまま継続し、次の後続生成の元画像として扱われます。',
    lineageActionDescBranch:
        'このステージは分岐元として扱われるため、現在のコンポーザーを保ったまま次の生成を分岐できます。',
    lineageActionDescReopen:
        'このステージは履歴から再度開かれた状態で、確認や再利用のためのものであり、まだ継続や分岐は確定していません。',
    lineageActionDescEditor:
        'このステージはエディタ由来の系統を持つため、後続生成は編集済みの元画像に引き続き紐づきます。',
    lineageActionDescReplay: 'このステージは以前に記録されたターンを確認用に再生しています。',
    workspaceRestoreTurns: '{0} 件のターン',
    workspaceRestoreActiveBranch: '現在の分岐 {0}',
    workspaceRestoreActionsHint:
        '復元した連鎖を再び開くか、最新ターンを継続元に設定するか、そこから分岐するか、復元したコンポーザー設定だけ残して連鎖をクリアするかを選択してください。',
    workspaceRestoreOpenLatest: '最新ターンを開く',
    workspaceRestoreContinueChain: '復元した連鎖を継続',
    workspaceRestoreBranch: '復元地点から分岐',
    workspaceRestoreUseSettingsClear: '設定を使って連鎖をクリア',
} as const;

const koLineageRestoreBaseline = {
    lineageActionDescRoot: '현재 스테이지는 자신의 루트 턴에서 직접 왔으며, 이전 분기 동작을 물려받지 않았습니다.',
    lineageActionDescContinue: '이 스테이지는 현재 분기를 그대로 이어 다음 후속 생성의 원본으로 사용됩니다.',
    lineageActionDescBranch:
        '이 스테이지는 분기 원본으로 동작하므로 현재 컴포저를 유지한 채 다음 생성을 갈라낼 수 있습니다.',
    lineageActionDescReopen:
        '이 스테이지는 기록에서 다시 열어 확인하거나 재사용하는 상태이며, 아직 이어가기나 분기가 확정되지는 않았습니다.',
    lineageActionDescEditor:
        '이 스테이지는 에디터 계보를 지니고 있어 이후 후속 생성이 편집된 원본 이미지에 계속 고정됩니다.',
    lineageActionDescReplay: '이 스테이지는 이전에 기록된 턴을 확인용으로 재생하고 있습니다.',
    workspaceRestoreTurns: '{0}개 턴',
    workspaceRestoreActiveBranch: '현재 분기 {0}',
    workspaceRestoreActionsHint:
        '복구된 흐름을 다시 열지, 최신 턴을 연속 원본으로 둘지, 여기서 분기할지, 복구된 컴포저 설정만 유지하고 흐름을 지울지 선택하세요.',
    workspaceRestoreOpenLatest: '최신 턴 열기',
    workspaceRestoreContinueChain: '복원된 흐름 계속하기',
    workspaceRestoreBranch: '복원 지점에서 분기',
    workspaceRestoreUseSettingsClear: '설정만 유지하고 흐름 지우기',
} as const;

const esLineageRestoreBaseline = {
    lineageActionDescRoot:
        'La etapa actual proviene directamente de su turno raiz y no hereda una accion de rama anterior.',
    lineageActionDescContinue:
        'Esta etapa queda alineada para continuar la rama actual desde este turno como la siguiente fuente de seguimiento.',
    lineageActionDescBranch:
        'Esta etapa actua como fuente de rama, asi que la siguiente generacion puede bifurcarse sin perder el compositor actual.',
    lineageActionDescReopen:
        'Esta etapa se reabrio desde el historial para inspeccion o reutilizacion, sin implicar aun continuar o ramificar.',
    lineageActionDescEditor:
        'Esta etapa conserva el linaje del editor, por lo que los siguientes seguimientos siguen anclados a una imagen de origen ya editada.',
    lineageActionDescReplay: 'Esta etapa esta reproduciendo un turno capturado previamente para inspeccion.',
    workspaceRestoreTurns: '{0} turnos',
    workspaceRestoreActionsHint:
        'Elige si quieres reabrir la cadena recuperada, usar el ultimo turno como fuente de continuacion, crear una rama desde ahi o limpiar la cadena conservando la configuracion recuperada del compositor.',
    workspaceRestoreOpenLatest: 'Abrir ultimo turno',
    workspaceRestoreContinueChain: 'Continuar cadena restaurada',
    workspaceRestoreBranch: 'Crear rama desde la restauracion',
    workspaceRestoreUseSettingsClear: 'Usar ajustes y limpiar cadena',
} as const;

const frLineageRestoreBaseline = {
    lineageActionDescRoot:
        "L'etape actuelle vient directement de son tour racine et n'herite d'aucune action de branche precedente.",
    lineageActionDescContinue:
        'Cette etape est alignee pour continuer la branche actuelle a partir de ce tour comme prochaine source de suivi.',
    lineageActionDescBranch:
        'Cette etape agit comme source de branche, donc la prochaine generation peut bifurquer tout en conservant le compositeur actuel.',
    lineageActionDescReopen:
        "Cette etape a ete rouverte depuis l'historique pour inspection ou reutilisation, sans impliquer encore une continuation ou une bifurcation.",
    lineageActionDescEditor:
        "Cette etape conserve une lignee d'editeur, donc les suivis suivants restent ancres a une image source deja modifiee.",
    lineageActionDescReplay: 'Cette etape rejoue un tour precedemment capture pour inspection.',
    workspaceRestoreTurns: '{0} tours',
    workspaceRestoreViewerImages: '{0} images du visualiseur',
    workspaceRestoreActionsHint:
        "Choisissez de rouvrir la chaine recuperee, de definir le dernier tour comme source de continuation, de creer une branche depuis celui-ci, ou d'effacer la chaine tout en gardant les reglages recuperes du compositeur.",
    workspaceRestoreOpenLatest: 'Ouvrir le dernier tour',
    workspaceRestoreContinueChain: 'Continuer la chaine restauree',
    workspaceRestoreUseSettingsClear: 'Garder les reglages et effacer la chaine',
} as const;

const deLineageRestoreBaseline = {
    lineageActionDescRoot:
        'Die aktuelle Stufe stammt direkt aus ihrer eigenen Wurzelrunde und ubernimmt keine fruhere Verzweigungsaktion.',
    lineageActionDescContinue:
        'Diese Stufe ist darauf ausgerichtet, den aktuellen Zweig von dieser Runde aus als nachste Folgequelle fortzusetzen.',
    lineageActionDescBranch:
        'Diese Stufe fungiert als Verzweigungsquelle, sodass die nachste Generierung abzweigen kann, wahrend der aktuelle Kompositionsstand erhalten bleibt.',
    lineageActionDescReopen:
        'Diese Stufe wurde aus dem Verlauf wieder geoffnet, um sie zu prufen oder erneut zu verwenden, ohne bereits Fortsetzen oder Abzweigen festzulegen.',
    lineageActionDescEditor:
        'Diese Stufe tragt Editor-Herkunft, daher bleiben weitere Folgeschritte an ein bereits bearbeitetes Quellbild gebunden.',
    lineageActionDescReplay: 'Diese Stufe spielt eine zuvor aufgezeichnete Runde zur Prufung erneut ab.',
    workspaceRestoreTitle: 'Arbeitsbereich wiederhergestellt',
    workspaceRestoreTurns: '{0} Runden',
    workspaceRestoreStagedAssets: '{0} vorbereitete Ressourcen',
    workspaceRestoreViewerImages: '{0} Bilder im Betrachter',
    workspaceRestoreActiveBranch: 'aktiver Zweig {0}',
    workspaceRestoreActionsHint:
        'Wahlen Sie, ob Sie die wiederhergestellte Kette erneut offnen, die letzte Runde als Fortsetzungsquelle setzen, davon abzweigen oder die Kette loschen und nur die wiederhergestellten Kompositions-Einstellungen behalten mochten.',
    workspaceRestoreOpenLatest: 'Letzte Runde offnen',
    workspaceRestoreContinueChain: 'Wiederhergestellte Kette fortsetzen',
    workspaceRestoreUseSettingsClear: 'Einstellungen verwenden, Kette loschen',
} as const;

const ruLineageRestoreBaseline = {
    lineageActionDescRoot:
        'Текущий этап идет прямо от своего корневого хода и не наследует предыдущее действие ветвления.',
    lineageActionDescContinue:
        'Этот этап выровнен для продолжения текущей ветки от этого хода как следующего источника продолжения.',
    lineageActionDescBranch:
        'Этот этап выступает источником новой ветки, поэтому следующая генерация может ответвиться, сохранив текущий компоновщик.',
    lineageActionDescReopen:
        'Этот этап был повторно открыт из истории для просмотра или повторного использования и пока не означает продолжение или ветвление.',
    lineageActionDescEditor:
        'Этот этап несет редакторскую линию происхождения, поэтому следующие продолжения остаются привязанными к уже отредактированному исходному изображению.',
    lineageActionDescReplay: 'Этот этап воспроизводит ранее сохраненный ход для просмотра.',
    workspaceRestoreTurns: '{0} ходов',
    workspaceRestoreViewerImages: '{0} изображений в просмотре',
    workspaceRestoreActionsHint:
        'Выберите, нужно ли заново открыть восстановленную цепочку, сделать последний ход источником продолжения, создать от него ветку или очистить цепочку, сохранив восстановленные настройки компоновщика.',
    workspaceRestoreOpenLatest: 'Открыть последний ход',
    workspaceRestoreContinueChain: 'Продолжить восстановленную цепочку',
    workspaceRestoreBranch: 'Создать ветку от восстановления',
    workspaceRestoreUseSettingsClear: 'Использовать настройки и очистить цепочку',
} as const;

const jaPickerViewerBaseline = {
    workspacePickerSharedPrompt: '共有プロンプト',
    workspacePickerSharedPromptPlaceholder: 'ここで共有コンポーザープロンプトを更新します。',
    workspacePickerEditorBase: 'エディターベース',
    workspacePickerEditorBaseHint: '直接アップロードするか、現在のステージ画像を再利用できます。',
    workspaceViewerTitle: 'ビューアー',
    workspaceViewerDesc: '現在のステージ画像、結果テキスト、由来情報を一か所で確認します。',
    workspaceViewerResultText: '結果テキスト',
    workspaceViewerResultTextEmpty: '選択中のモデルが画像とテキストを返した場合、ここに結果が表示されます。',
    workspaceViewerThoughts: '思考',
    workspaceViewerSessionHints: 'セッションヒント',
    workspaceViewerSessionHintsEmpty:
        'ビューアー契約を変えずに、複数ターンやグラウンディングのセッションヒントをここに追加できます。',
    workspaceViewerOpenEditor: 'エディターを開く',
} as const;

const koPickerViewerBaseline = {
    workspacePickerSharedPrompt: '공유 프롬프트',
    workspacePickerSharedPromptPlaceholder: '여기에서 공유 컴포저 프롬프트를 업데이트합니다.',
    workspacePickerEditorBase: '에디터 베이스',
    workspacePickerEditorBaseHint: '직접 업로드하거나 현재 스테이지 이미지를 재사용할 수 있습니다.',
    workspaceViewerTitle: '뷰어',
    workspaceViewerDesc: '현재 스테이지 이미지, 결과 텍스트, 출처 정보를 한곳에서 확인합니다.',
    workspaceViewerResultText: '결과 텍스트',
    workspaceViewerResultTextEmpty: '선택한 모델이 이미지와 텍스트를 함께 반환하면 여기에 결과가 표시됩니다.',
    workspaceViewerThoughts: '생각',
    workspaceViewerSessionHints: '세션 힌트',
    workspaceViewerSessionHintsEmpty:
        '뷰어 계약을 바꾸지 않고도 다중 턴 또는 그라운딩 세션 힌트를 여기에 붙일 수 있습니다.',
    workspaceViewerOpenEditor: '에디터 열기',
} as const;

const esPickerViewerBaseline = {
    workspacePickerSharedPrompt: 'Prompt compartido',
    workspacePickerSharedPromptPlaceholder: 'Actualiza aqui el prompt compartido del compositor.',
    workspacePickerEditorBase: 'Base del editor',
    workspacePickerEditorBaseHint: 'Sube una imagen directamente o reutiliza la imagen actual del escenario.',
    workspaceViewerTitle: 'Visor',
    workspaceViewerDesc:
        'Revisa en un solo lugar la imagen actual del escenario, el texto de resultado y la procedencia.',
    workspaceViewerResultText: 'Texto de resultado',
    workspaceViewerResultTextEmpty: 'Si el modelo seleccionado devuelve imagenes y texto, el resultado aparecera aqui.',
    workspaceViewerThoughts: 'Pensamientos',
    workspaceViewerSessionHints: 'Pistas de sesion',
    workspaceViewerSessionHintsEmpty:
        'El backend puede adjuntar aqui pistas de sesion multigiro o con contexto sin cambiar el contrato del visor.',
    workspaceViewerOpenEditor: 'Abrir editor',
} as const;

const frPickerViewerBaseline = {
    workspacePickerSharedPrompt: 'Prompt partage',
    workspacePickerSharedPromptPlaceholder: 'Mettez a jour ici le prompt partage du compositeur.',
    workspacePickerEditorBase: "Base de l'editeur",
    workspacePickerEditorBaseHint: "Televersez-en une directement ou reutilisez l'image actuelle de la scene.",
    workspaceViewerTitle: 'Visualiseur',
    workspaceViewerDesc:
        "Inspectez en un seul endroit l'image actuelle de la scene, le texte de resultat et la provenance.",
    workspaceViewerResultText: 'Texte de resultat',
    workspaceViewerResultTextEmpty:
        'Si le modele selectionne renvoie des images et du texte, le resultat apparait ici.',
    workspaceViewerThoughts: 'Pensees',
    workspaceViewerSessionHints: 'Indices de session',
    workspaceViewerSessionHintsEmpty:
        'Le backend peut joindre ici des indices de session multi-tour ou ancree sans modifier le contrat du visualiseur.',
    workspaceViewerOpenEditor: "Ouvrir l'editeur",
} as const;

const dePickerViewerBaseline = {
    workspacePickerSharedPrompt: 'Gemeinsamer Prompt',
    workspacePickerSharedPromptPlaceholder: 'Aktualisieren Sie hier den gemeinsamen Kompositions-Prompt.',
    workspacePickerEditorBase: 'Editor-Basis',
    workspacePickerEditorBaseHint: 'Laden Sie direkt ein Bild hoch oder verwenden Sie das aktuelle Stufenbild erneut.',
    workspaceViewerTitle: 'Betrachter',
    workspaceViewerDesc: 'Prufen Sie aktuelles Stufenbild, Ergebnistext und Herkunft an einem Ort.',
    workspaceViewerResultText: 'Ergebnistext',
    workspaceViewerResultTextEmpty:
        'Wenn das ausgewahlte Modell Bilder und Text zuruckgibt, erscheint das Ergebnis hier.',
    workspaceViewerThoughts: 'Gedanken',
    workspaceViewerSessionHints: 'Sitzungshinweise',
    workspaceViewerSessionHintsEmpty:
        'Das Backend kann hier Mehrfachrunden- oder Kontext-Sitzungshinweise anhangen, ohne den Vertrag des Betrachters zu andern.',
    workspaceViewerOpenEditor: 'Editor offnen',
} as const;

const ruPickerViewerBaseline = {
    workspacePickerSharedPrompt: 'Общий промпт',
    workspacePickerSharedPromptPlaceholder: 'Обновите здесь общий промпт компоновщика.',
    workspacePickerEditorBase: 'База редактора',
    workspacePickerEditorBaseHint: 'Загрузите изображение напрямую или повторно используйте текущее изображение сцены.',
    workspaceViewerTitle: 'Просмотр',
    workspaceViewerDesc:
        'Просматривайте текущее изображение сцены, текст результата и сведения об источнике в одном месте.',
    workspaceViewerResultText: 'Текст результата',
    workspaceViewerResultTextEmpty: 'Если выбранная модель возвращает изображения и текст, результат появится здесь.',
    workspaceViewerThoughts: 'Мысли',
    workspaceViewerSessionHints: 'Подсказки сессии',
    workspaceViewerSessionHintsEmpty:
        'Бэкенд может добавлять сюда подсказки многходовой или граундинг-сессии без изменения контракта просмотра.',
    workspaceViewerOpenEditor: 'Открыть редактор',
} as const;

const jaPickerSheetSurfaceBaseline = {
    workspacePickerInspiration: 'インスピレーション',
    workspacePickerNoSavedPrompts: '保存済みプロンプトはまだありません。',
    workspacePickerRemovePrompt: '削除',
    workspacePickerClearPromptHistory: 'プロンプト履歴を消去',
    workspacePickerFullGallery: 'フルギャラリー',
    workspacePickerEmptyGallery: '画像を生成または読み込むとギャラリーに表示されます。',
    workspacePickerModelSupportImageSearch: 'グラウンディング済み画像検索に対応',
    workspacePickerModelSupportGoogleSearch: 'Google 検索グラウンディングに対応',
    workspacePickerModelSupportImageOnly: '画像専用生成に集中',
    workspacePickerObjects: 'オブジェクト',
    workspacePickerHasSketchAsset: '現在のスケッチ資産を含みます。',
    workspacePickerNoSketchAsset: 'スケッチ資産はまだステージされていません。',
    workspacePickerCharacters: 'キャラクター',
    workspacePickerCharacterHint: 'キャラクター参照は同じステージ済み入力モデルを維持します。',
    workspacePickerStageSource: 'ステージソース',
    workspacePickerHistoryLinked: '履歴にリンク済み',
    workspacePickerStageSourceHint:
        '現在のステージと履歴から再開した画像は、編集アクションで再利用できる同じ後続ソースモデルに送られます。',
    workspacePickerOpenSketchPad: 'スケッチパッドを開く',
    workspacePickerUploadBaseImage: 'ベース画像をアップロード',
    workspacePickerUseCurrentStageAsEditorBase: '現在のステージをエディターベースとして使う',
    workspacePickerClearEditorBase: 'エディターベースをクリア',
    workspacePickerLoading: 'ピッカーシートを読み込み中...',
    workspacePickerCapabilityHint: 'モデルが対応しない機能のコントロールは自動的に非表示になります。',
    workspaceSheetTitlePrompt: '共有プロンプト',
    workspaceSheetTitleHistory: 'プロンプト履歴',
    workspaceSheetTitleTemplates: 'テンプレート',
    workspaceSheetTitleStyles: 'スタイル',
    workspaceSheetTitleModel: 'モデル',
    workspaceSheetTitleRatio: 'アスペクト比',
    workspaceSheetTitleSize: '出力サイズ',
    workspaceSheetTitleBatch: '数量',
    workspaceSheetTitleReferences: '参照トレイ',
    workspaceSurfaceReady: '準備完了',
    workspaceSurfacePromptEmpty: 'まだプロンプトはありません',
} as const;

const koPickerSheetSurfaceBaseline = {
    workspacePickerInspiration: '영감',
    workspacePickerNoSavedPrompts: '저장된 프롬프트가 아직 없습니다.',
    workspacePickerRemovePrompt: '제거',
    workspacePickerClearPromptHistory: '프롬프트 기록 지우기',
    workspacePickerFullGallery: '전체 갤러리',
    workspacePickerEmptyGallery: '이미지를 생성하거나 불러오면 갤러리가 채워집니다.',
    workspacePickerModelSupportImageSearch: '그라운딩 이미지 검색 준비됨',
    workspacePickerModelSupportGoogleSearch: 'Google 검색 그라운딩 준비됨',
    workspacePickerModelSupportImageOnly: '이미지 전용 생성 중심',
    workspacePickerObjects: '오브젝트',
    workspacePickerHasSketchAsset: '현재 스케치 자산을 포함합니다.',
    workspacePickerNoSketchAsset: '스케치 자산이 아직 스테이징되지 않았습니다.',
    workspacePickerCharacters: '캐릭터',
    workspacePickerCharacterHint: '캐릭터 참조는 같은 스테이징 입력 모델을 유지합니다.',
    workspacePickerStageSource: '스테이지 소스',
    workspacePickerHistoryLinked: '기록 연동됨',
    workspacePickerStageSourceHint:
        '현재 스테이지와 기록에서 다시 연 이미지는 이제 편집 동작에서 재사용할 수 있는 동일한 후속 소스 모델로 전달됩니다.',
    workspacePickerOpenSketchPad: '스케치패드 열기',
    workspacePickerUploadBaseImage: '베이스 이미지 업로드',
    workspacePickerUseCurrentStageAsEditorBase: '현재 스테이지를 에디터 베이스로 사용',
    workspacePickerClearEditorBase: '에디터 베이스 지우기',
    workspacePickerLoading: '피커 시트를 불러오는 중...',
    workspacePickerCapabilityHint: '모델이 지원하지 않는 기능 제어는 자동으로 숨겨집니다.',
    workspaceSheetTitlePrompt: '공유 프롬프트',
    workspaceSheetTitleHistory: '프롬프트 기록',
    workspaceSheetTitleTemplates: '템플릿',
    workspaceSheetTitleStyles: '스타일',
    workspaceSheetTitleModel: '모델',
    workspaceSheetTitleRatio: '화면 비율',
    workspaceSheetTitleSize: '출력 크기',
    workspaceSheetTitleBatch: '수량',
    workspaceSheetTitleReferences: '참조 트레이',
    workspaceSurfaceReady: '준비됨',
    workspaceSurfacePromptEmpty: '아직 프롬프트가 없습니다',
} as const;

const esPickerSheetSurfaceBaseline = {
    workspacePickerInspiration: 'Inspiracion',
    workspacePickerNoSavedPrompts: 'Todavia no hay prompts guardados.',
    workspacePickerRemovePrompt: 'Quitar',
    workspacePickerClearPromptHistory: 'Borrar historial de prompts',
    workspacePickerFullGallery: 'Galeria completa',
    workspacePickerEmptyGallery: 'Genera o carga una imagen para llenar la galeria.',
    workspacePickerModelSupportImageSearch: 'Busqueda de imagenes con contexto lista',
    workspacePickerModelSupportGoogleSearch: 'Contexto de Google Search listo',
    workspacePickerModelSupportImageOnly: 'Enfoque en generacion solo de imagen',
    workspacePickerObjects: 'Objetos',
    workspacePickerHasSketchAsset: 'Incluye el recurso de boceto actual.',
    workspacePickerNoSketchAsset: 'No hay ningun recurso de boceto preparado.',
    workspacePickerCharacters: 'Personajes',
    workspacePickerCharacterHint: 'Las referencias de personajes se mantienen en el mismo modelo de ingreso preparado.',
    workspacePickerStageSource: 'Origen de la escena',
    workspacePickerHistoryLinked: 'vinculado al historial',
    workspacePickerStageSourceHint:
        'El escenario actual y las reaperturas desde el historial ahora alimentan el mismo modelo de origen para seguimientos que pueden reutilizar las acciones del editor.',
    workspacePickerOpenSketchPad: 'Abrir SketchPad',
    workspacePickerUploadBaseImage: 'Subir imagen base',
    workspacePickerUseCurrentStageAsEditorBase: 'Usar el escenario actual como base del editor',
    workspacePickerClearEditorBase: 'Limpiar base del editor',
    workspacePickerLoading: 'Cargando panel del selector...',
    workspacePickerCapabilityHint: 'Los controles segun capacidad se ocultan cuando el modelo no los admite.',
    workspaceSheetTitlePrompt: 'Prompt compartido',
    workspaceSheetTitleHistory: 'Historial de prompts',
    workspaceSheetTitleTemplates: 'Plantillas',
    workspaceSheetTitleStyles: 'Estilos',
    workspaceSheetTitleModel: 'Modelo',
    workspaceSheetTitleRatio: 'Proporcion',
    workspaceSheetTitleSize: 'Tamano de salida',
    workspaceSheetTitleBatch: 'Cantidad',
    workspaceSheetTitleReferences: 'Bandeja de referencias',
    workspaceSurfaceReady: 'Listo',
    workspaceSurfacePromptEmpty: 'Todavia no hay prompt',
} as const;

const frPickerSheetSurfaceBaseline = {
    workspacePickerInspiration: 'Inspiration',
    workspacePickerNoSavedPrompts: "Aucun prompt enregistre pour l'instant.",
    workspacePickerRemovePrompt: 'Supprimer',
    workspacePickerClearPromptHistory: "Effacer l'historique des prompts",
    workspacePickerFullGallery: 'Galerie complete',
    workspacePickerEmptyGallery: 'Generez ou chargez une image pour remplir la galerie.',
    workspacePickerModelSupportImageSearch: "Recherche d'images ancree prete",
    workspacePickerModelSupportGoogleSearch: 'Ancrage Google Search pret',
    workspacePickerModelSupportImageOnly: "Accent sur la generation d'images seule",
    workspacePickerObjects: 'Objets',
    workspacePickerHasSketchAsset: 'Inclut la ressource de croquis actuelle.',
    workspacePickerNoSketchAsset: "Aucune ressource de croquis n'est preparee.",
    workspacePickerCharacters: 'Personnages',
    workspacePickerCharacterHint: "Les references de personnage restent dans le meme modele d'ingestion prepare.",
    workspacePickerStageSource: 'Source de la scene',
    workspacePickerHistoryLinked: "lie a l'historique",
    workspacePickerStageSourceHint:
        "La scene actuelle et les reouvertures depuis l'historique alimentent maintenant le meme modele source de suivi, reutilisable par les actions de l'editeur.",
    workspacePickerOpenSketchPad: 'Ouvrir SketchPad',
    workspacePickerUploadBaseImage: "Televerser l'image de base",
    workspacePickerUseCurrentStageAsEditorBase: "Utiliser la scene actuelle comme base de l'editeur",
    workspacePickerClearEditorBase: "Effacer la base de l'editeur",
    workspacePickerLoading: 'Chargement du panneau du selecteur...',
    workspacePickerCapabilityHint:
        'Les controles adaptes aux capacites restent caches quand le modele ne les prend pas en charge.',
    workspaceSheetTitlePrompt: 'Prompt partage',
    workspaceSheetTitleHistory: 'Historique des prompts',
    workspaceSheetTitleTemplates: 'Modeles',
    workspaceSheetTitleStyles: 'Styles',
    workspaceSheetTitleModel: 'Modele',
    workspaceSheetTitleRatio: 'Format',
    workspaceSheetTitleSize: 'Taille de sortie',
    workspaceSheetTitleBatch: 'Quantite',
    workspaceSheetTitleReferences: 'Plateau de references',
    workspaceSurfaceReady: 'Pret',
    workspaceSurfacePromptEmpty: 'Pas encore de prompt',
} as const;

const dePickerSheetSurfaceBaseline = {
    workspacePickerInspiration: 'Inspiration',
    workspacePickerNoSavedPrompts: 'Noch keine gespeicherten Prompts.',
    workspacePickerRemovePrompt: 'Entfernen',
    workspacePickerClearPromptHistory: 'Prompt-Verlauf loschen',
    workspacePickerFullGallery: 'Vollstandige Galerie',
    workspacePickerEmptyGallery: 'Erzeugen oder laden Sie ein Bild, um die Galerie zu fullen.',
    workspacePickerModelSupportImageSearch: 'Geerdete Bildsuche bereit',
    workspacePickerModelSupportGoogleSearch: 'Google-Suche mit Verankerung bereit',
    workspacePickerModelSupportImageOnly: 'Fokus auf reine Bildgenerierung',
    workspacePickerObjects: 'Objekte',
    workspacePickerHasSketchAsset: 'Enthalt das aktuelle Skizzen-Asset.',
    workspacePickerNoSketchAsset: 'Kein Skizzen-Asset vorbereitet.',
    workspacePickerCharacters: 'Charaktere',
    workspacePickerCharacterHint: 'Charakter-Referenzen bleiben im selben vorbereiteten Eingabemodell.',
    workspacePickerStageSource: 'Szenenquelle',
    workspacePickerHistoryLinked: 'mit Verlauf verknupft',
    workspacePickerStageSourceHint:
        'Aktuelle Stufe und erneut aus dem Verlauf geoffnete Bilder speisen jetzt dasselbe Folgequellmodell, das Editor-Aktionen wiederverwenden konnen.',
    workspacePickerOpenSketchPad: 'SketchPad offnen',
    workspacePickerUploadBaseImage: 'Basisbild hochladen',
    workspacePickerUseCurrentStageAsEditorBase: 'Aktuelle Stufe als Editor-Basis verwenden',
    workspacePickerClearEditorBase: 'Editor-Basis loschen',
    workspacePickerLoading: 'Picker-Fenster wird geladen...',
    workspacePickerCapabilityHint:
        'Fahigkeitsbezogene Steuerelemente bleiben verborgen, wenn das Modell sie nicht unterstutzt.',
    workspaceSheetTitlePrompt: 'Gemeinsamer Prompt',
    workspaceSheetTitleHistory: 'Prompt-Verlauf',
    workspaceSheetTitleTemplates: 'Vorlagen',
    workspaceSheetTitleStyles: 'Stile',
    workspaceSheetTitleModel: 'Modell',
    workspaceSheetTitleRatio: 'Seitenverhaltnis',
    workspaceSheetTitleSize: 'Ausgabegrosse',
    workspaceSheetTitleBatch: 'Menge',
    workspaceSheetTitleReferences: 'Referenzablage',
    workspaceSurfaceReady: 'Bereit',
    workspaceSurfacePromptEmpty: 'Noch kein Prompt',
} as const;

const ruPickerSheetSurfaceBaseline = {
    workspacePickerInspiration: 'Вдохновение',
    workspacePickerNoSavedPrompts: 'Сохраненных промптов пока нет.',
    workspacePickerRemovePrompt: 'Удалить',
    workspacePickerClearPromptHistory: 'Очистить историю промптов',
    workspacePickerFullGallery: 'Полная галерея',
    workspacePickerEmptyGallery: 'Сгенерируйте или загрузите изображение, чтобы заполнить галерею.',
    workspacePickerModelSupportImageSearch: 'Поиск изображений с grounding готов',
    workspacePickerModelSupportGoogleSearch: 'Grounding через Google Search готов',
    workspacePickerModelSupportImageOnly: 'Фокус на генерации только изображений',
    workspacePickerObjects: 'Объекты',
    workspacePickerHasSketchAsset: 'Включает текущий скетч-ресурс.',
    workspacePickerNoSketchAsset: 'Скетч-ресурс не подготовлен.',
    workspacePickerCharacters: 'Персонажи',
    workspacePickerCharacterHint: 'Референсы персонажей остаются в той же подготовленной модели приема.',
    workspacePickerStageSource: 'Источник сцены',
    workspacePickerHistoryLinked: 'связано с историей',
    workspacePickerStageSourceHint:
        'Текущая сцена и повторно открытые из истории изображения теперь подают данные в одну и ту же модель источника продолжения, которую могут повторно использовать действия редактора.',
    workspacePickerOpenSketchPad: 'Открыть SketchPad',
    workspacePickerUploadBaseImage: 'Загрузить базовое изображение',
    workspacePickerUseCurrentStageAsEditorBase: 'Использовать текущую сцену как базу редактора',
    workspacePickerClearEditorBase: 'Очистить базу редактора',
    workspacePickerLoading: 'Загрузка панели выбора...',
    workspacePickerCapabilityHint:
        'Элементы управления по возможностям автоматически скрываются, если модель их не поддерживает.',
    workspaceSheetTitlePrompt: 'Общий промпт',
    workspaceSheetTitleHistory: 'История промптов',
    workspaceSheetTitleTemplates: 'Шаблоны',
    workspaceSheetTitleStyles: 'Стили',
    workspaceSheetTitleModel: 'Модель',
    workspaceSheetTitleRatio: 'Формат',
    workspaceSheetTitleSize: 'Размер вывода',
    workspaceSheetTitleBatch: 'Количество',
    workspaceSheetTitleReferences: 'Лоток референсов',
    workspaceSurfaceReady: 'Готово',
    workspaceSurfacePromptEmpty: 'Промпта пока нет',
} as const;

const jaViewerActionMetadataBaseline = {
    workspaceViewerClose: '閉じる',
    workspaceViewerImageAlt: 'ビューアー画像',
    workspaceViewerPrompt: 'プロンプト',
    workspaceViewerPromptEmpty: 'この画像にはプロンプトが記録されていません。',
    workspaceViewerRatio: '比率',
    workspaceViewerSize: 'サイズ',
    workspaceViewerStyle: 'スタイル',
    workspaceViewerModel: 'モデル',
    workspaceViewerProvenance: '由来情報',
    workspaceViewerNewConversation: '新しい会話',
    workspaceViewerGenerateAgain: 'もう一度生成',
    workspaceViewerFollowUpEdit: '続きの編集',
    workspaceViewerAddToReferences: '参照に追加',
} as const;

const koViewerActionMetadataBaseline = {
    workspaceViewerClose: '닫기',
    workspaceViewerImageAlt: '뷰어 이미지',
    workspaceViewerPrompt: '프롬프트',
    workspaceViewerPromptEmpty: '이 이미지에 기록된 프롬프트가 없습니다.',
    workspaceViewerRatio: '비율',
    workspaceViewerSize: '크기',
    workspaceViewerStyle: '스타일',
    workspaceViewerModel: '모델',
    workspaceViewerProvenance: '출처 정보',
    workspaceViewerNewConversation: '새 대화',
    workspaceViewerGenerateAgain: '다시 생성',
    workspaceViewerFollowUpEdit: '후속 편집',
    workspaceViewerAddToReferences: '참조에 추가',
} as const;

const esViewerActionMetadataBaseline = {
    workspaceViewerClose: 'Cerrar',
    workspaceViewerImageAlt: 'Imagen del visor',
    workspaceViewerPrompt: 'Prompt',
    workspaceViewerPromptEmpty: 'No hay prompt registrado para esta imagen.',
    workspaceViewerRatio: 'Proporcion',
    workspaceViewerSize: 'Tamano',
    workspaceViewerStyle: 'Estilo',
    workspaceViewerModel: 'Modelo',
    workspaceViewerProvenance: 'Procedencia',
    workspaceViewerNewConversation: 'Nueva conversacion',
    workspaceViewerGenerateAgain: 'Generar de nuevo',
    workspaceViewerFollowUpEdit: 'Edicion de seguimiento',
    workspaceViewerAddToReferences: 'Agregar a referencias',
} as const;

const frViewerActionMetadataBaseline = {
    workspaceViewerClose: 'Fermer',
    workspaceViewerImageAlt: 'Image du visualiseur',
    workspaceViewerPrompt: 'Prompt',
    workspaceViewerPromptEmpty: "Aucun prompt n'est enregistre pour cette image.",
    workspaceViewerRatio: 'Format',
    workspaceViewerSize: 'Taille',
    workspaceViewerStyle: 'Style',
    workspaceViewerModel: 'Modele',
    workspaceViewerProvenance: 'Provenance',
    workspaceViewerNewConversation: 'Nouvelle conversation',
    workspaceViewerGenerateAgain: 'Generer a nouveau',
    workspaceViewerFollowUpEdit: 'Modification de suivi',
    workspaceViewerAddToReferences: 'Ajouter aux references',
} as const;

const deViewerActionMetadataBaseline = {
    workspaceViewerClose: 'Schliessen',
    workspaceViewerImageAlt: 'Betrachterbild',
    workspaceViewerPrompt: 'Prompt',
    workspaceViewerPromptEmpty: 'Fur dieses Bild wurde kein Prompt gespeichert.',
    workspaceViewerRatio: 'Verhaltnis',
    workspaceViewerSize: 'Grosse',
    workspaceViewerStyle: 'Stil',
    workspaceViewerModel: 'Modell',
    workspaceViewerProvenance: 'Herkunft',
    workspaceViewerNewConversation: 'Neue Konversation',
    workspaceViewerGenerateAgain: 'Erneut generieren',
    workspaceViewerFollowUpEdit: 'Folgebearbeitung',
    workspaceViewerAddToReferences: 'Zu Referenzen hinzufugen',
} as const;

const ruViewerActionMetadataBaseline = {
    workspaceViewerClose: 'Закрыть',
    workspaceViewerImageAlt: 'Изображение просмотра',
    workspaceViewerPrompt: 'Промпт',
    workspaceViewerPromptEmpty: 'Для этого изображения промпт не сохранен.',
    workspaceViewerRatio: 'Формат',
    workspaceViewerSize: 'Размер',
    workspaceViewerStyle: 'Стиль',
    workspaceViewerModel: 'Модель',
    workspaceViewerProvenance: 'Происхождение',
    workspaceViewerNewConversation: 'Новый диалог',
    workspaceViewerGenerateAgain: 'Сгенерировать снова',
    workspaceViewerFollowUpEdit: 'Последующее редактирование',
    workspaceViewerAddToReferences: 'Добавить в референсы',
} as const;

describe('workspace flow translations', () => {
    it('keeps placeholder and token markers aligned with the English baseline', () => {
        const english = translations.en;

        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            const dictionary = translations[language];

            for (const [key, englishValue] of Object.entries(english)) {
                const localizedValue = dictionary[key];

                if (typeof localizedValue !== 'string') {
                    continue;
                }

                expect(collectTranslationTokens(localizedValue), `${language} token drifted for ${key}`).toEqual(
                    collectTranslationTokens(englishValue),
                );
            }
        }
    });

    it('keeps every locale key set aligned with the English baseline', () => {
        const englishKeys = Object.keys(translations.en).sort();

        for (const [language, localeTranslations] of Object.entries(translations)) {
            const localeKeys = Object.keys(localeTranslations).sort();

            expect(localeKeys, `${language} key count`).toHaveLength(englishKeys.length);
            expect(collectMissingLocaleKeys(englishKeys, localeKeys), `${language} missing keys`).toEqual([]);
            expect(collectExtraLocaleKeys(englishKeys, localeKeys), `${language} extra keys`).toEqual([]);
        }
    });

    it('defines top-header, import-review, and replay labels for every supported language', () => {
        for (const language of Object.keys(translations)) {
            const dictionary = translations[language as keyof typeof translations];

            for (const key of workspaceFlowKeys) {
                expect(dictionary[key], `${language} missing ${key}`).toBeTruthy();
            }
        }
    });

    it('defines the latest shell-closure i18n keys for every supported language', () => {
        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            const dictionary = translations[language];

            for (const key of shellClosureKeys) {
                expect(dictionary[key], `${language} missing ${key}`).toBeTruthy();
            }
        }
    });

    it('defines the workspace panel narration and trim keys for every supported language', () => {
        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            const dictionary = translations[language];

            for (const key of workspacePanelLocalizationKeys) {
                expect(dictionary[key], `${language} missing ${key}`).toBeTruthy();
            }
        }
    });

    it('defines the workspace panel status keys for every supported language', () => {
        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            const dictionary = translations[language];

            for (const key of workspacePanelStatusKeys) {
                expect(dictionary[key], `${language} missing ${key}`).toBeTruthy();
            }
        }
    });

    it('defines the loading state keys for every supported language', () => {
        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            const dictionary = translations[language];

            for (const key of loadingStateKeys) {
                expect(dictionary[key], `${language} missing ${key}`).toBeTruthy();
            }
        }
    });

    it('defines the stage grounding keys for every supported language', () => {
        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            const dictionary = translations[language];

            for (const key of stageGroundingKeys) {
                expect(dictionary[key], `${language} missing ${key}`).toBeTruthy();
            }
        }
    });

    it('defines the history branch label keys for every supported language', () => {
        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            const dictionary = translations[language];

            for (const key of historyBranchLabelKeys) {
                expect(dictionary[key], `${language} missing ${key}`).toBeTruthy();
            }
        }
    });

    it('defines the source lineage label keys for every supported language', () => {
        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            const dictionary = translations[language];

            for (const key of sourceLineageLabelKeys) {
                expect(dictionary[key], `${language} missing ${key}`).toBeTruthy();
            }
        }
    });

    it('defines the branch rename dialog keys for every supported language', () => {
        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            const dictionary = translations[language];

            for (const key of branchRenameDialogKeys) {
                expect(dictionary[key], `${language} missing ${key}`).toBeTruthy();
            }
        }
    });

    it('defines the history continue stage keys for every supported language', () => {
        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            const dictionary = translations[language];

            for (const key of historyContinueStageKeys) {
                expect(dictionary[key], `${language} missing ${key}`).toBeTruthy();
            }
        }
    });

    it('defines the history stage notice keys for every supported language', () => {
        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            const dictionary = translations[language];

            for (const key of historyStageNoticeKeys) {
                expect(dictionary[key], `${language} missing ${key}`).toBeTruthy();
            }
        }
    });

    it('defines the composer control chrome keys for every supported language', () => {
        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            const dictionary = translations[language];

            for (const key of composerControlChromeKeys) {
                expect(dictionary[key], `${language} missing ${key}`).toBeTruthy();
            }
        }
    });

    it('defines the composer queue batch job key for every supported language', () => {
        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            const dictionary = translations[language];

            for (const key of composerQueueBatchJobKey) {
                expect(dictionary[key], `${language} missing ${key}`).toBeTruthy();
            }
        }
    });

    it('defines the Phase E group 1 shell parity keys for every supported language', () => {
        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            const dictionary = translations[language];

            for (const key of phaseEGroup1ShellParityKeys) {
                expect(dictionary[key], `${language} missing ${key}`).toBeTruthy();
            }
        }
    });

    it('defines the Phase E group 2 shell parity keys for every supported language', () => {
        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            const dictionary = translations[language];

            for (const key of phaseEGroup2ShellParityKeys) {
                expect(dictionary[key], `${language} missing ${key}`).toBeTruthy();
            }
        }
    });

    it('defines the Phase E group 3 shell parity keys for every supported language', () => {
        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            const dictionary = translations[language];

            for (const key of phaseEGroup3ShellParityKeys) {
                expect(dictionary[key], `${language} missing ${key}`).toBeTruthy();
            }
        }
    });

    it('defines the Phase E group 4 shell parity keys for every supported language', () => {
        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            const dictionary = translations[language];

            for (const key of phaseEGroup4ShellParityKeys) {
                expect(dictionary[key], `${language} missing ${key}`).toBeTruthy();
            }
        }
    });

    it('defines the Phase E group 5 shell parity keys for every supported language', () => {
        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            const dictionary = translations[language];

            for (const key of phaseEGroup5ShellParityKeys) {
                expect(dictionary[key], `${language} missing ${key}`).toBeTruthy();
            }
        }
    });

    it('defines the Phase E group 6 shell parity keys for every supported language', () => {
        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            const dictionary = translations[language];

            for (const key of phaseEGroup6ShellParityKeys) {
                expect(dictionary[key], `${language} missing ${key}`).toBeTruthy();
            }
        }
    });

    it('defines the Phase E group 7 shell parity keys for every supported language', () => {
        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            const dictionary = translations[language];

            for (const key of phaseEGroup7ShellParityKeys) {
                expect(dictionary[key], `${language} missing ${key}`).toBeTruthy();
            }
        }
    });

    it('defines the history action and badge keys for every supported language', () => {
        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            const dictionary = translations[language];

            for (const key of historyActionBadgeKeys) {
                expect(dictionary[key], `${language} missing ${key}`).toBeTruthy();
            }
        }
    });

    it('defines the history filmstrip keys for every supported language', () => {
        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            const dictionary = translations[language];

            for (const key of historyFilmstripKeys) {
                expect(dictionary[key], `${language} missing ${key}`).toBeTruthy();
            }
        }
    });

    it('defines the workspace insights sidebar label keys for every supported language', () => {
        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            const dictionary = translations[language];

            for (const key of workspaceInsightsSidebarLabelKeys) {
                expect(dictionary[key], `${language} missing ${key}`).toBeTruthy();
            }
        }
    });

    it('defines the workspace insights structural keys for every supported language', () => {
        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            const dictionary = translations[language];

            for (const key of workspaceInsightsStructuralKeys) {
                expect(dictionary[key], `${language} missing ${key}`).toBeTruthy();
            }
        }
    });

    it('defines the provenance continuity polish keys for every supported language', () => {
        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            const dictionary = translations[language];

            for (const key of provenancePolishKeys) {
                expect(dictionary[key], `${language} missing ${key}`).toBeTruthy();
            }
        }
    });

    it('defines the latest grounding provenance summary keys for every supported language', () => {
        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            const dictionary = translations[language];

            for (const key of groundingProvenanceSummaryKeys) {
                expect(dictionary[key], `${language} missing ${key}`).toBeTruthy();
            }
        }
    });

    it('defines the grounding panel provenance keys for every supported language', () => {
        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            const dictionary = translations[language];

            for (const key of groundingPanelLocalizationKeys) {
                expect(dictionary[key], `${language} missing ${key}`).toBeTruthy();
            }
        }
    });

    it('keeps the latest provenance continuity labels localized outside English', () => {
        const english = translations.en;

        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            if (language === 'en') continue;

            const dictionary = translations[language];

            for (const key of provenanceLocalizedLabelKeys) {
                expect(dictionary[key], `${language} fell back to English for ${key}`).not.toBe(english[key]);
            }
        }
    });

    it('keeps continuity chip text localized outside English for the latest mixed-language labels', () => {
        const english = translations.en;

        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            if (language === 'en') continue;

            const dictionary = translations[language];

            for (const key of continuityLocalizedTextKeys) {
                expect(dictionary[key], `${language} fell back to English for ${key}`).not.toBe(english[key]);
            }
        }
    });

    it('keeps grounding provenance summary labels localized outside English', () => {
        const english = translations.en;

        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            if (language === 'en') continue;

            const dictionary = translations[language];

            for (const key of groundingProvenanceFallbackSensitiveKeys) {
                expect(dictionary[key], `${language} fell back to English for ${key}`).not.toBe(english[key]);
            }
        }
    });

    it('keeps grounding panel provenance labels localized outside English', () => {
        const english = translations.en;

        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            if (language === 'en') continue;

            const dictionary = translations[language];

            for (const key of groundingPanelFallbackSensitiveKeys) {
                expect(dictionary[key], `${language} fell back to English for ${key}`).not.toBe(english[key]);
            }
        }
    });

    it('keeps workspace panel narration and trim labels localized outside English', () => {
        const english = translations.en;

        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            if (language === 'en') continue;

            const dictionary = translations[language];

            for (const key of workspacePanelFallbackSensitiveKeys) {
                expect(dictionary[key], `${language} fell back to English for ${key}`).not.toBe(english[key]);
            }
        }
    });

    it('keeps workspace panel status labels localized outside English', () => {
        const english = translations.en;

        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            if (language === 'en') continue;

            const dictionary = translations[language];

            for (const key of workspacePanelStatusFallbackSensitiveKeys) {
                expect(dictionary[key], `${language} fell back to English for ${key}`).not.toBe(english[key]);
            }
        }
    });

    it('keeps loading state labels localized outside English', () => {
        const english = translations.en;

        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            if (language === 'en') continue;

            const dictionary = translations[language];

            for (const key of loadingStateFallbackSensitiveKeys) {
                expect(dictionary[key], `${language} fell back to English for ${key}`).not.toBe(english[key]);
            }
        }
    });

    it('keeps stage grounding labels localized outside English', () => {
        const english = translations.en;

        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            if (language === 'en') continue;

            const dictionary = translations[language];

            for (const key of stageGroundingFallbackSensitiveKeys) {
                expect(dictionary[key], `${language} fell back to English for ${key}`).not.toBe(english[key]);
            }
        }
    });

    it('keeps history stage notice labels localized outside English', () => {
        const english = translations.en;

        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            if (language === 'en') continue;

            const dictionary = translations[language];

            for (const key of historyStageNoticeFallbackSensitiveKeys) {
                expect(dictionary[key], `${language} fell back to English for ${key}`).not.toBe(english[key]);
            }
        }
    });

    it('keeps composer control chrome labels localized outside English', () => {
        const english = translations.en;

        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            if (language === 'en') continue;

            const dictionary = translations[language];

            for (const key of composerControlChromeFallbackSensitiveKeys) {
                expect(dictionary[key], `${language} fell back to English for ${key}`).not.toBe(english[key]);
            }
        }
    });

    it('keeps composer queue batch job labels localized outside English', () => {
        const english = translations.en;

        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            if (language === 'en') continue;

            const dictionary = translations[language];

            for (const key of composerQueueBatchJobFallbackSensitiveKeys) {
                expect(dictionary[key], `${language} fell back to English for ${key}`).not.toBe(english[key]);
            }
        }
    });

    it('keeps the Phase E group 1 shell parity keys localized outside English', () => {
        const english = translations.en;

        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            if (language === 'en') continue;

            const dictionary = translations[language];

            for (const key of phaseEGroup1ShellParityKeys) {
                expect(dictionary[key], `${language} fell back to English for ${key}`).not.toBe(english[key]);
            }
        }
    });

    it('keeps the Phase E group 2 shell parity keys localized outside English', () => {
        const english = translations.en;

        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            if (language === 'en') continue;

            const dictionary = translations[language];

            for (const key of phaseEGroup2ShellParityKeys) {
                expect(dictionary[key], `${language} fell back to English for ${key}`).not.toBe(english[key]);
            }
        }
    });

    it('keeps the Phase E group 3 shell parity keys localized outside English', () => {
        const english = translations.en;

        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            if (language === 'en') continue;

            const dictionary = translations[language];

            for (const key of phaseEGroup3ShellParityKeys) {
                expect(dictionary[key], `${language} fell back to English for ${key}`).not.toBe(english[key]);
            }
        }
    });

    it('keeps the Phase E group 4 shell parity keys localized outside English', () => {
        const english = translations.en;

        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            if (language === 'en') continue;

            const dictionary = translations[language];

            for (const key of phaseEGroup4ShellParityKeys) {
                expect(dictionary[key], `${language} fell back to English for ${key}`).not.toBe(english[key]);
            }
        }
    });

    it('keeps the Phase E group 5 shell parity keys localized outside English', () => {
        const english = translations.en;

        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            if (language === 'en') continue;

            const dictionary = translations[language];

            for (const key of phaseEGroup5ShellParityKeys) {
                expect(dictionary[key], `${language} fell back to English for ${key}`).not.toBe(english[key]);
            }
        }
    });

    it('keeps the Phase E group 6 shell parity keys localized outside English', () => {
        const english = translations.en;

        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            if (language === 'en') continue;

            const dictionary = translations[language];

            for (const key of phaseEGroup6ShellParityKeys) {
                expect(dictionary[key], `${language} fell back to English for ${key}`).not.toBe(english[key]);
            }
        }
    });

    it('keeps the Phase E group 7 shell parity keys localized outside English', () => {
        const english = translations.en;

        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            if (language === 'en') continue;

            const dictionary = translations[language];

            for (const key of phaseEGroup7ShellParityKeys) {
                expect(dictionary[key], `${language} fell back to English for ${key}`).not.toBe(english[key]);
            }
        }
    });

    it('keeps history branch labels localized outside English', () => {
        const english = translations.en;

        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            if (language === 'en') continue;

            const dictionary = translations[language];

            for (const key of historyBranchLabelFallbackSensitiveKeys) {
                expect(dictionary[key], `${language} fell back to English for ${key}`).not.toBe(english[key]);
            }
        }
    });

    it('keeps source lineage labels localized outside English', () => {
        const english = translations.en;

        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            if (language === 'en') continue;

            const dictionary = translations[language];

            for (const key of sourceLineageLabelFallbackSensitiveKeys) {
                expect(dictionary[key], `${language} fell back to English for ${key}`).not.toBe(english[key]);
            }
        }
    });

    it('keeps branch rename dialog labels localized outside English', () => {
        const english = translations.en;

        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            if (language === 'en') continue;

            const dictionary = translations[language];

            for (const key of branchRenameDialogFallbackSensitiveKeys) {
                expect(dictionary[key], `${language} fell back to English for ${key}`).not.toBe(english[key]);
            }
        }
    });

    it('keeps history continue stage labels localized outside English', () => {
        const english = translations.en;

        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            if (language === 'en') continue;

            const dictionary = translations[language];

            for (const key of historyContinueStageFallbackSensitiveKeys) {
                expect(dictionary[key], `${language} fell back to English for ${key}`).not.toBe(english[key]);
            }
        }
    });

    it('keeps history action and badge labels localized outside English', () => {
        const english = translations.en;

        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            if (language === 'en') continue;

            const dictionary = translations[language];

            for (const key of historyActionBadgeFallbackSensitiveKeys) {
                expect(dictionary[key], `${language} fell back to English for ${key}`).not.toBe(english[key]);
            }
        }
    });

    it('keeps history filmstrip labels localized outside English', () => {
        const english = translations.en;

        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            if (language === 'en') continue;

            const dictionary = translations[language];

            for (const key of historyFilmstripFallbackSensitiveKeys) {
                expect(dictionary[key], `${language} fell back to English for ${key}`).not.toBe(english[key]);
            }
        }
    });

    it('keeps workspace side tool labels localized outside English', () => {
        const english = translations.en;

        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            if (language === 'en') continue;

            const dictionary = translations[language];

            for (const key of workspaceSideToolFallbackSensitiveKeys) {
                expect(dictionary[key], `${language} fell back to English for ${key}`).not.toBe(english[key]);
            }
        }
    });

    it('keeps workspace insights sidebar labels localized outside English', () => {
        const english = translations.en;

        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            if (language === 'en') continue;

            const dictionary = translations[language];

            for (const key of workspaceInsightsSidebarLabelFallbackSensitiveKeys) {
                expect(dictionary[key], `${language} fell back to English for ${key}`).not.toBe(english[key]);
            }
        }
    });

    it('keeps workspace insights structural labels localized outside English', () => {
        const english = translations.en;

        for (const language of Object.keys(translations) as Array<keyof typeof translations>) {
            if (language === 'en') continue;

            const dictionary = translations[language];

            for (const key of workspaceInsightsStructuralFallbackSensitiveKeys) {
                expect(dictionary[key], `${language} fell back to English for ${key}`).not.toBe(english[key]);
            }
        }
    });

    it('keeps the English insights regroup headings baseline stable', () => {
        const english = translations.en;

        for (const [key, value] of Object.entries(englishInsightsRegroupHeadingBaseline)) {
            expect(english[key as keyof typeof english], `en drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW insights regroup headings baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwInsightsRegroupHeadingBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN insights regroup headings baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnInsightsRegroupHeadingBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the English workspace side tool wording baseline stable', () => {
        const english = translations.en;

        for (const [key, value] of Object.entries(englishWorkspaceSideToolBaseline)) {
            expect(english[key as keyof typeof english], `en drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the English grounding provenance summary baseline stable', () => {
        const english = translations.en;

        for (const [key, value] of Object.entries(englishGroundingProvenanceBaseline)) {
            expect(english[key as keyof typeof english], `en drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW provenance wording polish baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwGroundingProvenancePolishBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN provenance wording polish baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnGroundingProvenancePolishBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW longform provenance wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwGroundingProvenanceLongformBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN longform provenance wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnGroundingProvenanceLongformBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW shell mixed-language cleanup baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwShellMixedLanguageBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN shell mixed-language cleanup baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnShellMixedLanguageBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW replay and composer wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwReplayComposerBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN replay and composer wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnReplayComposerBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW grounding panel wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwGroundingPanelBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN grounding panel wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnGroundingPanelBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW history and stage wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwHistoryStageBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN history and stage wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnHistoryStageBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW composer controls wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwComposerControlsBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN composer controls wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnComposerControlsBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW composer thought and temp wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwComposerThoughtTempBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN composer thought and temp wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnComposerThoughtTempBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW grounding and runtime label baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwGroundingRuntimeLabelBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN grounding and runtime label baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnGroundingRuntimeLabelBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW grounding description wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwGroundingDescriptionBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN grounding description wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnGroundingDescriptionBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW grounding guide sentence baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwGroundingGuideSentenceBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN grounding guide sentence baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnGroundingGuideSentenceBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW queued batch wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwQueuedBatchWordingBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN queued batch wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnQueuedBatchWordingBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW queued batch description baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwQueuedBatchDescBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN queued batch description baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnQueuedBatchDescBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW lineage description baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwLineageDescriptionBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN lineage description baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnLineageDescriptionBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW branch and restore wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwBranchRestoreBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN branch and restore wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnBranchRestoreBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW restore action wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwRestoreActionBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN restore action wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnRestoreActionBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW workspace picker support wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwWorkspacePickerSupportBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN workspace picker support wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnWorkspacePickerSupportBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW workspace picker stage-source wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwWorkspacePickerStageSourceBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN workspace picker stage-source wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnWorkspacePickerStageSourceBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW workspace picker helper wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwWorkspacePickerHelperBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN workspace picker helper wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnWorkspacePickerHelperBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ja import-review execution labels localized', () => {
        const japanese = translations.ja;

        for (const [key, value] of Object.entries(jaImportReviewExecutionLabelsBaseline)) {
            expect(japanese[key as keyof typeof japanese], `ja drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ko import-review execution labels localized', () => {
        const korean = translations.ko;

        for (const [key, value] of Object.entries(koImportReviewExecutionLabelsBaseline)) {
            expect(korean[key as keyof typeof korean], `ko drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the es import-review execution labels localized', () => {
        const spanish = translations.es;

        for (const [key, value] of Object.entries(esImportReviewExecutionLabelsBaseline)) {
            expect(spanish[key as keyof typeof spanish], `es drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the fr import-review execution labels localized', () => {
        const french = translations.fr;

        for (const [key, value] of Object.entries(frImportReviewExecutionLabelsBaseline)) {
            expect(french[key as keyof typeof french], `fr drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the de import-review execution labels localized', () => {
        const german = translations.de;

        for (const [key, value] of Object.entries(deImportReviewExecutionLabelsBaseline)) {
            expect(german[key as keyof typeof german], `de drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ru import-review execution labels localized', () => {
        const russian = translations.ru;

        for (const [key, value] of Object.entries(ruImportReviewExecutionLabelsBaseline)) {
            expect(russian[key as keyof typeof russian], `ru drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the English import-review execution labels baseline stable', () => {
        const english = translations.en;

        for (const [key, value] of Object.entries(englishImportReviewExecutionLabelsBaseline)) {
            expect(english[key as keyof typeof english], `en drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ja workspace snapshot and provenance wording localized', () => {
        const japanese = translations.ja;

        for (const [key, value] of Object.entries(jaWorkspaceSnapshotAndProvenanceBaseline)) {
            expect(japanese[key as keyof typeof japanese], `ja drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ko workspace snapshot and provenance wording localized', () => {
        const korean = translations.ko;

        for (const [key, value] of Object.entries(koWorkspaceSnapshotAndProvenanceBaseline)) {
            expect(korean[key as keyof typeof korean], `ko drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the es workspace snapshot and provenance wording localized', () => {
        const spanish = translations.es;

        for (const [key, value] of Object.entries(esWorkspaceSnapshotAndProvenanceBaseline)) {
            expect(spanish[key as keyof typeof spanish], `es drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the fr workspace snapshot and provenance wording localized', () => {
        const french = translations.fr;

        for (const [key, value] of Object.entries(frWorkspaceSnapshotAndProvenanceBaseline)) {
            expect(french[key as keyof typeof french], `fr drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the de workspace snapshot and provenance wording localized', () => {
        const german = translations.de;

        for (const [key, value] of Object.entries(deWorkspaceSnapshotAndProvenanceBaseline)) {
            expect(german[key as keyof typeof german], `de drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ru workspace snapshot and provenance wording localized', () => {
        const russian = translations.ru;

        for (const [key, value] of Object.entries(ruWorkspaceSnapshotAndProvenanceBaseline)) {
            expect(russian[key as keyof typeof russian], `ru drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ja grounding provenance continuity wording localized', () => {
        const japanese = translations.ja;

        for (const [key, value] of Object.entries(jaGroundingProvenanceContinuityBaseline)) {
            expect(japanese[key as keyof typeof japanese], `ja drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ko grounding provenance continuity wording localized', () => {
        const korean = translations.ko;

        for (const [key, value] of Object.entries(koGroundingProvenanceContinuityBaseline)) {
            expect(korean[key as keyof typeof korean], `ko drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the es grounding provenance continuity wording localized', () => {
        const spanish = translations.es;

        for (const [key, value] of Object.entries(esGroundingProvenanceContinuityBaseline)) {
            expect(spanish[key as keyof typeof spanish], `es drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the fr grounding provenance continuity wording localized', () => {
        const french = translations.fr;

        for (const [key, value] of Object.entries(frGroundingProvenanceContinuityBaseline)) {
            expect(french[key as keyof typeof french], `fr drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the de grounding provenance continuity wording localized', () => {
        const german = translations.de;

        for (const [key, value] of Object.entries(deGroundingProvenanceContinuityBaseline)) {
            expect(german[key as keyof typeof german], `de drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ru grounding provenance continuity wording localized', () => {
        const russian = translations.ru;

        for (const [key, value] of Object.entries(ruGroundingProvenanceContinuityBaseline)) {
            expect(russian[key as keyof typeof russian], `ru drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ja grounding provenance detail and reuse wording localized', () => {
        const japanese = translations.ja;

        for (const [key, value] of Object.entries(jaGroundingProvenanceDetailReuseBaseline)) {
            expect(japanese[key as keyof typeof japanese], `ja drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ko grounding provenance detail and reuse wording localized', () => {
        const korean = translations.ko;

        for (const [key, value] of Object.entries(koGroundingProvenanceDetailReuseBaseline)) {
            expect(korean[key as keyof typeof korean], `ko drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the es grounding provenance detail and reuse wording localized', () => {
        const spanish = translations.es;

        for (const [key, value] of Object.entries(esGroundingProvenanceDetailReuseBaseline)) {
            expect(spanish[key as keyof typeof spanish], `es drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the fr grounding provenance detail and reuse wording localized', () => {
        const french = translations.fr;

        for (const [key, value] of Object.entries(frGroundingProvenanceDetailReuseBaseline)) {
            expect(french[key as keyof typeof french], `fr drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the de grounding provenance detail and reuse wording localized', () => {
        const german = translations.de;

        for (const [key, value] of Object.entries(deGroundingProvenanceDetailReuseBaseline)) {
            expect(german[key as keyof typeof german], `de drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ru grounding provenance detail and reuse wording localized', () => {
        const russian = translations.ru;

        for (const [key, value] of Object.entries(ruGroundingProvenanceDetailReuseBaseline)) {
            expect(russian[key as keyof typeof russian], `ru drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ja grounding provenance longform wording localized', () => {
        const japanese = translations.ja;

        for (const [key, value] of Object.entries(jaGroundingProvenanceLongformBaseline)) {
            expect(japanese[key as keyof typeof japanese], `ja drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ko grounding provenance longform wording localized', () => {
        const korean = translations.ko;

        for (const [key, value] of Object.entries(koGroundingProvenanceLongformBaseline)) {
            expect(korean[key as keyof typeof korean], `ko drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the es grounding provenance longform wording localized', () => {
        const spanish = translations.es;

        for (const [key, value] of Object.entries(esGroundingProvenanceLongformBaseline)) {
            expect(spanish[key as keyof typeof spanish], `es drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the fr grounding provenance longform wording localized', () => {
        const french = translations.fr;

        for (const [key, value] of Object.entries(frGroundingProvenanceLongformBaseline)) {
            expect(french[key as keyof typeof french], `fr drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the de grounding provenance longform wording localized', () => {
        const german = translations.de;

        for (const [key, value] of Object.entries(deGroundingProvenanceLongformBaseline)) {
            expect(german[key as keyof typeof german], `de drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ru grounding provenance longform wording localized', () => {
        const russian = translations.ru;

        for (const [key, value] of Object.entries(ruGroundingProvenanceLongformBaseline)) {
            expect(russian[key as keyof typeof russian], `ru drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ja grounding panel provenance wording localized', () => {
        const japanese = translations.ja;

        for (const [key, value] of Object.entries(jaGroundingPanelProvenanceBaseline)) {
            expect(japanese[key as keyof typeof japanese], `ja drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ko grounding panel provenance wording localized', () => {
        const korean = translations.ko;

        for (const [key, value] of Object.entries(koGroundingPanelProvenanceBaseline)) {
            expect(korean[key as keyof typeof korean], `ko drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the es grounding panel provenance wording localized', () => {
        const spanish = translations.es;

        for (const [key, value] of Object.entries(esGroundingPanelProvenanceBaseline)) {
            expect(spanish[key as keyof typeof spanish], `es drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the fr grounding panel provenance wording localized', () => {
        const french = translations.fr;

        for (const [key, value] of Object.entries(frGroundingPanelProvenanceBaseline)) {
            expect(french[key as keyof typeof french], `fr drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the de grounding panel provenance wording localized', () => {
        const german = translations.de;

        for (const [key, value] of Object.entries(deGroundingPanelProvenanceBaseline)) {
            expect(german[key as keyof typeof german], `de drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ru grounding panel provenance wording localized', () => {
        const russian = translations.ru;

        for (const [key, value] of Object.entries(ruGroundingPanelProvenanceBaseline)) {
            expect(russian[key as keyof typeof russian], `ru drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ja workspace panel narration and trim wording localized', () => {
        const japanese = translations.ja;

        for (const [key, value] of Object.entries(jaWorkspacePanelBaseline)) {
            expect(japanese[key as keyof typeof japanese], `ja drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ko workspace panel narration and trim wording localized', () => {
        const korean = translations.ko;

        for (const [key, value] of Object.entries(koWorkspacePanelBaseline)) {
            expect(korean[key as keyof typeof korean], `ko drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the es workspace panel narration and trim wording localized', () => {
        const spanish = translations.es;

        for (const [key, value] of Object.entries(esWorkspacePanelBaseline)) {
            expect(spanish[key as keyof typeof spanish], `es drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the fr workspace panel narration and trim wording localized', () => {
        const french = translations.fr;

        for (const [key, value] of Object.entries(frWorkspacePanelBaseline)) {
            expect(french[key as keyof typeof french], `fr drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the de workspace panel narration and trim wording localized', () => {
        const german = translations.de;

        for (const [key, value] of Object.entries(deWorkspacePanelBaseline)) {
            expect(german[key as keyof typeof german], `de drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ru workspace panel narration and trim wording localized', () => {
        const russian = translations.ru;

        for (const [key, value] of Object.entries(ruWorkspacePanelBaseline)) {
            expect(russian[key as keyof typeof russian], `ru drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ja workspace panel status wording localized', () => {
        const japanese = translations.ja;

        for (const [key, value] of Object.entries(jaWorkspacePanelStatusBaseline)) {
            expect(japanese[key as keyof typeof japanese], `ja drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ko workspace panel status wording localized', () => {
        const korean = translations.ko;

        for (const [key, value] of Object.entries(koWorkspacePanelStatusBaseline)) {
            expect(korean[key as keyof typeof korean], `ko drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the es workspace panel status wording localized', () => {
        const spanish = translations.es;

        for (const [key, value] of Object.entries(esWorkspacePanelStatusBaseline)) {
            expect(spanish[key as keyof typeof spanish], `es drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the fr workspace panel status wording localized', () => {
        const french = translations.fr;

        for (const [key, value] of Object.entries(frWorkspacePanelStatusBaseline)) {
            expect(french[key as keyof typeof french], `fr drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the de workspace panel status wording localized', () => {
        const german = translations.de;

        for (const [key, value] of Object.entries(deWorkspacePanelStatusBaseline)) {
            expect(german[key as keyof typeof german], `de drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ru workspace panel status wording localized', () => {
        const russian = translations.ru;

        for (const [key, value] of Object.entries(ruWorkspacePanelStatusBaseline)) {
            expect(russian[key as keyof typeof russian], `ru drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ja loading state wording localized', () => {
        const japanese = translations.ja;

        for (const [key, value] of Object.entries(jaLoadingStateBaseline)) {
            expect(japanese[key as keyof typeof japanese], `ja drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ko loading state wording localized', () => {
        const korean = translations.ko;

        for (const [key, value] of Object.entries(koLoadingStateBaseline)) {
            expect(korean[key as keyof typeof korean], `ko drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the es loading state wording localized', () => {
        const spanish = translations.es;

        for (const [key, value] of Object.entries(esLoadingStateBaseline)) {
            expect(spanish[key as keyof typeof spanish], `es drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the fr loading state wording localized', () => {
        const french = translations.fr;

        for (const [key, value] of Object.entries(frLoadingStateBaseline)) {
            expect(french[key as keyof typeof french], `fr drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the de loading state wording localized', () => {
        const german = translations.de;

        for (const [key, value] of Object.entries(deLoadingStateBaseline)) {
            expect(german[key as keyof typeof german], `de drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ru loading state wording localized', () => {
        const russian = translations.ru;

        for (const [key, value] of Object.entries(ruLoadingStateBaseline)) {
            expect(russian[key as keyof typeof russian], `ru drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ja stage grounding wording localized', () => {
        const japanese = translations.ja;

        for (const [key, value] of Object.entries(jaStageGroundingBaseline)) {
            expect(japanese[key as keyof typeof japanese], `ja drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ko stage grounding wording localized', () => {
        const korean = translations.ko;

        for (const [key, value] of Object.entries(koStageGroundingBaseline)) {
            expect(korean[key as keyof typeof korean], `ko drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the es stage grounding wording localized', () => {
        const spanish = translations.es;

        for (const [key, value] of Object.entries(esStageGroundingBaseline)) {
            expect(spanish[key as keyof typeof spanish], `es drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the fr stage grounding wording localized', () => {
        const french = translations.fr;

        for (const [key, value] of Object.entries(frStageGroundingBaseline)) {
            expect(french[key as keyof typeof french], `fr drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the de stage grounding wording localized', () => {
        const german = translations.de;

        for (const [key, value] of Object.entries(deStageGroundingBaseline)) {
            expect(german[key as keyof typeof german], `de drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ru stage grounding wording localized', () => {
        const russian = translations.ru;

        for (const [key, value] of Object.entries(ruStageGroundingBaseline)) {
            expect(russian[key as keyof typeof russian], `ru drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ja history branch label wording localized', () => {
        const japanese = translations.ja;

        for (const [key, value] of Object.entries(jaHistoryBranchLabelBaseline)) {
            expect(japanese[key as keyof typeof japanese], `ja drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ko history branch label wording localized', () => {
        const korean = translations.ko;

        for (const [key, value] of Object.entries(koHistoryBranchLabelBaseline)) {
            expect(korean[key as keyof typeof korean], `ko drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the es history branch label wording localized', () => {
        const spanish = translations.es;

        for (const [key, value] of Object.entries(esHistoryBranchLabelBaseline)) {
            expect(spanish[key as keyof typeof spanish], `es drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the fr history branch label wording localized', () => {
        const french = translations.fr;

        for (const [key, value] of Object.entries(frHistoryBranchLabelBaseline)) {
            expect(french[key as keyof typeof french], `fr drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the de history branch label wording localized', () => {
        const german = translations.de;

        for (const [key, value] of Object.entries(deHistoryBranchLabelBaseline)) {
            expect(german[key as keyof typeof german], `de drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ru history branch label wording localized', () => {
        const russian = translations.ru;

        for (const [key, value] of Object.entries(ruHistoryBranchLabelBaseline)) {
            expect(russian[key as keyof typeof russian], `ru drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ja source lineage label wording localized', () => {
        const japanese = translations.ja;

        for (const [key, value] of Object.entries(jaSourceLineageLabelBaseline)) {
            expect(japanese[key as keyof typeof japanese], `ja drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ko source lineage label wording localized', () => {
        const korean = translations.ko;

        for (const [key, value] of Object.entries(koSourceLineageLabelBaseline)) {
            expect(korean[key as keyof typeof korean], `ko drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the es source lineage label wording localized', () => {
        const spanish = translations.es;

        for (const [key, value] of Object.entries(esSourceLineageLabelBaseline)) {
            expect(spanish[key as keyof typeof spanish], `es drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the fr source lineage label wording localized', () => {
        const french = translations.fr;

        for (const [key, value] of Object.entries(frSourceLineageLabelBaseline)) {
            expect(french[key as keyof typeof french], `fr drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the de source lineage label wording localized', () => {
        const german = translations.de;

        for (const [key, value] of Object.entries(deSourceLineageLabelBaseline)) {
            expect(german[key as keyof typeof german], `de drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ru source lineage label wording localized', () => {
        const russian = translations.ru;

        for (const [key, value] of Object.entries(ruSourceLineageLabelBaseline)) {
            expect(russian[key as keyof typeof russian], `ru drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ja branch rename dialog wording localized', () => {
        const japanese = translations.ja;

        for (const [key, value] of Object.entries(jaBranchRenameDialogBaseline)) {
            expect(japanese[key as keyof typeof japanese], `ja drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ko branch rename dialog wording localized', () => {
        const korean = translations.ko;

        for (const [key, value] of Object.entries(koBranchRenameDialogBaseline)) {
            expect(korean[key as keyof typeof korean], `ko drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the es branch rename dialog wording localized', () => {
        const spanish = translations.es;

        for (const [key, value] of Object.entries(esBranchRenameDialogBaseline)) {
            expect(spanish[key as keyof typeof spanish], `es drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the fr branch rename dialog wording localized', () => {
        const french = translations.fr;

        for (const [key, value] of Object.entries(frBranchRenameDialogBaseline)) {
            expect(french[key as keyof typeof french], `fr drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the de branch rename dialog wording localized', () => {
        const german = translations.de;

        for (const [key, value] of Object.entries(deBranchRenameDialogBaseline)) {
            expect(german[key as keyof typeof german], `de drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ru branch rename dialog wording localized', () => {
        const russian = translations.ru;

        for (const [key, value] of Object.entries(ruBranchRenameDialogBaseline)) {
            expect(russian[key as keyof typeof russian], `ru drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ja history continue stage wording localized', () => {
        const japanese = translations.ja;

        for (const [key, value] of Object.entries(jaHistoryContinueStageBaseline)) {
            expect(japanese[key as keyof typeof japanese], `ja drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ko history continue stage wording localized', () => {
        const korean = translations.ko;

        for (const [key, value] of Object.entries(koHistoryContinueStageBaseline)) {
            expect(korean[key as keyof typeof korean], `ko drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the es history continue stage wording localized', () => {
        const spanish = translations.es;

        for (const [key, value] of Object.entries(esHistoryContinueStageBaseline)) {
            expect(spanish[key as keyof typeof spanish], `es drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the fr history continue stage wording localized', () => {
        const french = translations.fr;

        for (const [key, value] of Object.entries(frHistoryContinueStageBaseline)) {
            expect(french[key as keyof typeof french], `fr drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the de history continue stage wording localized', () => {
        const german = translations.de;

        for (const [key, value] of Object.entries(deHistoryContinueStageBaseline)) {
            expect(german[key as keyof typeof german], `de drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ru history continue stage wording localized', () => {
        const russian = translations.ru;

        for (const [key, value] of Object.entries(ruHistoryContinueStageBaseline)) {
            expect(russian[key as keyof typeof russian], `ru drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ja history stage notice wording localized', () => {
        const japanese = translations.ja;

        for (const [key, value] of Object.entries(jaHistoryStageNoticeBaseline)) {
            expect(japanese[key as keyof typeof japanese], `ja drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ko history stage notice wording localized', () => {
        const korean = translations.ko;

        for (const [key, value] of Object.entries(koHistoryStageNoticeBaseline)) {
            expect(korean[key as keyof typeof korean], `ko drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the es history stage notice wording localized', () => {
        const spanish = translations.es;

        for (const [key, value] of Object.entries(esHistoryStageNoticeBaseline)) {
            expect(spanish[key as keyof typeof spanish], `es drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the fr history stage notice wording localized', () => {
        const french = translations.fr;

        for (const [key, value] of Object.entries(frHistoryStageNoticeBaseline)) {
            expect(french[key as keyof typeof french], `fr drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the de history stage notice wording localized', () => {
        const german = translations.de;

        for (const [key, value] of Object.entries(deHistoryStageNoticeBaseline)) {
            expect(german[key as keyof typeof german], `de drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ru history stage notice wording localized', () => {
        const russian = translations.ru;

        for (const [key, value] of Object.entries(ruHistoryStageNoticeBaseline)) {
            expect(russian[key as keyof typeof russian], `ru drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ja composer control chrome wording localized', () => {
        const japanese = translations.ja;

        for (const [key, value] of Object.entries(jaComposerControlChromeBaseline)) {
            expect(japanese[key as keyof typeof japanese], `ja drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ko composer control chrome wording localized', () => {
        const korean = translations.ko;

        for (const [key, value] of Object.entries(koComposerControlChromeBaseline)) {
            expect(korean[key as keyof typeof korean], `ko drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the es composer control chrome wording localized', () => {
        const spanish = translations.es;

        for (const [key, value] of Object.entries(esComposerControlChromeBaseline)) {
            expect(spanish[key as keyof typeof spanish], `es drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the fr composer control chrome wording localized', () => {
        const french = translations.fr;

        for (const [key, value] of Object.entries(frComposerControlChromeBaseline)) {
            expect(french[key as keyof typeof french], `fr drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the de composer control chrome wording localized', () => {
        const german = translations.de;

        for (const [key, value] of Object.entries(deComposerControlChromeBaseline)) {
            expect(german[key as keyof typeof german], `de drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ru composer control chrome wording localized', () => {
        const russian = translations.ru;

        for (const [key, value] of Object.entries(ruComposerControlChromeBaseline)) {
            expect(russian[key as keyof typeof russian], `ru drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ja composer queue batch job wording localized', () => {
        const japanese = translations.ja;

        for (const [key, value] of Object.entries(jaComposerQueueBatchJobBaseline)) {
            expect(japanese[key as keyof typeof japanese], `ja drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ko composer queue batch job wording localized', () => {
        const korean = translations.ko;

        for (const [key, value] of Object.entries(koComposerQueueBatchJobBaseline)) {
            expect(korean[key as keyof typeof korean], `ko drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the es composer queue batch job wording localized', () => {
        const spanish = translations.es;

        for (const [key, value] of Object.entries(esComposerQueueBatchJobBaseline)) {
            expect(spanish[key as keyof typeof spanish], `es drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the fr composer queue batch job wording localized', () => {
        const french = translations.fr;

        for (const [key, value] of Object.entries(frComposerQueueBatchJobBaseline)) {
            expect(french[key as keyof typeof french], `fr drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the de composer queue batch job wording localized', () => {
        const german = translations.de;

        for (const [key, value] of Object.entries(deComposerQueueBatchJobBaseline)) {
            expect(german[key as keyof typeof german], `de drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ru composer queue batch job wording localized', () => {
        const russian = translations.ru;

        for (const [key, value] of Object.entries(ruComposerQueueBatchJobBaseline)) {
            expect(russian[key as keyof typeof russian], `ru drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ja history action and badge wording localized', () => {
        const japanese = translations.ja;

        for (const [key, value] of Object.entries(jaHistoryActionBadgeBaseline)) {
            expect(japanese[key as keyof typeof japanese], `ja drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ko history action and badge wording localized', () => {
        const korean = translations.ko;

        for (const [key, value] of Object.entries(koHistoryActionBadgeBaseline)) {
            expect(korean[key as keyof typeof korean], `ko drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the es history action and badge wording localized', () => {
        const spanish = translations.es;

        for (const [key, value] of Object.entries(esHistoryActionBadgeBaseline)) {
            expect(spanish[key as keyof typeof spanish], `es drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the fr history action and badge wording localized', () => {
        const french = translations.fr;

        for (const [key, value] of Object.entries(frHistoryActionBadgeBaseline)) {
            expect(french[key as keyof typeof french], `fr drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the de history action and badge wording localized', () => {
        const german = translations.de;

        for (const [key, value] of Object.entries(deHistoryActionBadgeBaseline)) {
            expect(german[key as keyof typeof german], `de drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ru history action and badge wording localized', () => {
        const russian = translations.ru;

        for (const [key, value] of Object.entries(ruHistoryActionBadgeBaseline)) {
            expect(russian[key as keyof typeof russian], `ru drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ja history filmstrip wording localized', () => {
        const japanese = translations.ja;

        for (const [key, value] of Object.entries(jaHistoryFilmstripBaseline)) {
            expect(japanese[key as keyof typeof japanese], `ja drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ko history filmstrip wording localized', () => {
        const korean = translations.ko;

        for (const [key, value] of Object.entries(koHistoryFilmstripBaseline)) {
            expect(korean[key as keyof typeof korean], `ko drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the es history filmstrip wording localized', () => {
        const spanish = translations.es;

        for (const [key, value] of Object.entries(esHistoryFilmstripBaseline)) {
            expect(spanish[key as keyof typeof spanish], `es drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the fr history filmstrip wording localized', () => {
        const french = translations.fr;

        for (const [key, value] of Object.entries(frHistoryFilmstripBaseline)) {
            expect(french[key as keyof typeof french], `fr drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the de history filmstrip wording localized', () => {
        const german = translations.de;

        for (const [key, value] of Object.entries(deHistoryFilmstripBaseline)) {
            expect(german[key as keyof typeof german], `de drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ru history filmstrip wording localized', () => {
        const russian = translations.ru;

        for (const [key, value] of Object.entries(ruHistoryFilmstripBaseline)) {
            expect(russian[key as keyof typeof russian], `ru drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ja workspace insights sidebar labels localized', () => {
        const japanese = translations.ja;

        for (const [key, value] of Object.entries(jaWorkspaceInsightsSidebarLabelBaseline)) {
            expect(japanese[key as keyof typeof japanese], `ja drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ko workspace insights sidebar labels localized', () => {
        const korean = translations.ko;

        for (const [key, value] of Object.entries(koWorkspaceInsightsSidebarLabelBaseline)) {
            expect(korean[key as keyof typeof korean], `ko drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the es workspace insights sidebar labels localized', () => {
        const spanish = translations.es;

        for (const [key, value] of Object.entries(esWorkspaceInsightsSidebarLabelBaseline)) {
            expect(spanish[key as keyof typeof spanish], `es drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the fr workspace insights sidebar labels localized', () => {
        const french = translations.fr;

        for (const [key, value] of Object.entries(frWorkspaceInsightsSidebarLabelBaseline)) {
            expect(french[key as keyof typeof french], `fr drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the de workspace insights sidebar labels localized', () => {
        const german = translations.de;

        for (const [key, value] of Object.entries(deWorkspaceInsightsSidebarLabelBaseline)) {
            expect(german[key as keyof typeof german], `de drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ru workspace insights sidebar labels localized', () => {
        const russian = translations.ru;

        for (const [key, value] of Object.entries(ruWorkspaceInsightsSidebarLabelBaseline)) {
            expect(russian[key as keyof typeof russian], `ru drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ja workspace insights structural labels localized', () => {
        const japanese = translations.ja;

        for (const [key, value] of Object.entries(jaWorkspaceInsightsStructuralBaseline)) {
            expect(japanese[key as keyof typeof japanese], `ja drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ko workspace insights structural labels localized', () => {
        const korean = translations.ko;

        for (const [key, value] of Object.entries(koWorkspaceInsightsStructuralBaseline)) {
            expect(korean[key as keyof typeof korean], `ko drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the es workspace insights structural labels localized', () => {
        const spanish = translations.es;

        for (const [key, value] of Object.entries(esWorkspaceInsightsStructuralBaseline)) {
            expect(spanish[key as keyof typeof spanish], `es drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the fr workspace insights structural labels localized', () => {
        const french = translations.fr;

        for (const [key, value] of Object.entries(frWorkspaceInsightsStructuralBaseline)) {
            expect(french[key as keyof typeof french], `fr drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the de workspace insights structural labels localized', () => {
        const german = translations.de;

        for (const [key, value] of Object.entries(deWorkspaceInsightsStructuralBaseline)) {
            expect(german[key as keyof typeof german], `de drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ru workspace insights structural labels localized', () => {
        const russian = translations.ru;

        for (const [key, value] of Object.entries(ruWorkspaceInsightsStructuralBaseline)) {
            expect(russian[key as keyof typeof russian], `ru drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ja session replay and import-review shell wording localized', () => {
        const japanese = translations.ja;

        for (const [key, value] of Object.entries(jaSessionReplayAndImportReviewBaseline)) {
            expect(japanese[key as keyof typeof japanese], `ja drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ko session replay and import-review shell wording localized', () => {
        const korean = translations.ko;

        for (const [key, value] of Object.entries(koSessionReplayAndImportReviewBaseline)) {
            expect(korean[key as keyof typeof korean], `ko drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the es session replay and import-review shell wording localized', () => {
        const spanish = translations.es;

        for (const [key, value] of Object.entries(esSessionReplayAndImportReviewBaseline)) {
            expect(spanish[key as keyof typeof spanish], `es drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the fr session replay and import-review shell wording localized', () => {
        const french = translations.fr;

        for (const [key, value] of Object.entries(frSessionReplayAndImportReviewBaseline)) {
            expect(french[key as keyof typeof french], `fr drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the de session replay and import-review shell wording localized', () => {
        const german = translations.de;

        for (const [key, value] of Object.entries(deSessionReplayAndImportReviewBaseline)) {
            expect(german[key as keyof typeof german], `de drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ru session replay and import-review shell wording localized', () => {
        const russian = translations.ru;

        for (const [key, value] of Object.entries(ruSessionReplayAndImportReviewBaseline)) {
            expect(russian[key as keyof typeof russian], `ru drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ja import-review summary wording localized', () => {
        const japanese = translations.ja;

        for (const [key, value] of Object.entries(jaImportReviewSummaryBaseline)) {
            expect(japanese[key as keyof typeof japanese], `ja drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ko import-review summary wording localized', () => {
        const korean = translations.ko;

        for (const [key, value] of Object.entries(koImportReviewSummaryBaseline)) {
            expect(korean[key as keyof typeof korean], `ko drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the es import-review summary wording localized', () => {
        const spanish = translations.es;

        for (const [key, value] of Object.entries(esImportReviewSummaryBaseline)) {
            expect(spanish[key as keyof typeof spanish], `es drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the fr import-review summary wording localized', () => {
        const french = translations.fr;

        for (const [key, value] of Object.entries(frImportReviewSummaryBaseline)) {
            expect(french[key as keyof typeof french], `fr drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the de import-review summary wording localized', () => {
        const german = translations.de;

        for (const [key, value] of Object.entries(deImportReviewSummaryBaseline)) {
            expect(german[key as keyof typeof german], `de drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ru import-review summary wording localized', () => {
        const russian = translations.ru;

        for (const [key, value] of Object.entries(ruImportReviewSummaryBaseline)) {
            expect(russian[key as keyof typeof russian], `ru drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ja import-review longform wording localized', () => {
        const japanese = translations.ja;

        for (const [key, value] of Object.entries(jaImportReviewLongformBaseline)) {
            expect(japanese[key as keyof typeof japanese], `ja drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ko import-review longform wording localized', () => {
        const korean = translations.ko;

        for (const [key, value] of Object.entries(koImportReviewLongformBaseline)) {
            expect(korean[key as keyof typeof korean], `ko drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the es import-review longform wording localized', () => {
        const spanish = translations.es;

        for (const [key, value] of Object.entries(esImportReviewLongformBaseline)) {
            expect(spanish[key as keyof typeof spanish], `es drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the fr import-review longform wording localized', () => {
        const french = translations.fr;

        for (const [key, value] of Object.entries(frImportReviewLongformBaseline)) {
            expect(french[key as keyof typeof french], `fr drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the de import-review longform wording localized', () => {
        const german = translations.de;

        for (const [key, value] of Object.entries(deImportReviewLongformBaseline)) {
            expect(german[key as keyof typeof german], `de drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ru import-review longform wording localized', () => {
        const russian = translations.ru;

        for (const [key, value] of Object.entries(ruImportReviewLongformBaseline)) {
            expect(russian[key as keyof typeof russian], `ru drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ja lineage and workspace-restore wording localized', () => {
        const japanese = translations.ja;

        for (const [key, value] of Object.entries(jaLineageRestoreBaseline)) {
            expect(japanese[key as keyof typeof japanese], `ja drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ko lineage and workspace-restore wording localized', () => {
        const korean = translations.ko;

        for (const [key, value] of Object.entries(koLineageRestoreBaseline)) {
            expect(korean[key as keyof typeof korean], `ko drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the es lineage and workspace-restore wording localized', () => {
        const spanish = translations.es;

        for (const [key, value] of Object.entries(esLineageRestoreBaseline)) {
            expect(spanish[key as keyof typeof spanish], `es drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the fr lineage and workspace-restore wording localized', () => {
        const french = translations.fr;

        for (const [key, value] of Object.entries(frLineageRestoreBaseline)) {
            expect(french[key as keyof typeof french], `fr drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the de lineage and workspace-restore wording localized', () => {
        const german = translations.de;

        for (const [key, value] of Object.entries(deLineageRestoreBaseline)) {
            expect(german[key as keyof typeof german], `de drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ru lineage and workspace-restore wording localized', () => {
        const russian = translations.ru;

        for (const [key, value] of Object.entries(ruLineageRestoreBaseline)) {
            expect(russian[key as keyof typeof russian], `ru drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ja picker and viewer wording localized', () => {
        const japanese = translations.ja;

        for (const [key, value] of Object.entries(jaPickerViewerBaseline)) {
            expect(japanese[key as keyof typeof japanese], `ja drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ko picker and viewer wording localized', () => {
        const korean = translations.ko;

        for (const [key, value] of Object.entries(koPickerViewerBaseline)) {
            expect(korean[key as keyof typeof korean], `ko drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the es picker and viewer wording localized', () => {
        const spanish = translations.es;

        for (const [key, value] of Object.entries(esPickerViewerBaseline)) {
            expect(spanish[key as keyof typeof spanish], `es drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the fr picker and viewer wording localized', () => {
        const french = translations.fr;

        for (const [key, value] of Object.entries(frPickerViewerBaseline)) {
            expect(french[key as keyof typeof french], `fr drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the de picker and viewer wording localized', () => {
        const german = translations.de;

        for (const [key, value] of Object.entries(dePickerViewerBaseline)) {
            expect(german[key as keyof typeof german], `de drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ru picker and viewer wording localized', () => {
        const russian = translations.ru;

        for (const [key, value] of Object.entries(ruPickerViewerBaseline)) {
            expect(russian[key as keyof typeof russian], `ru drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ja picker sheet and surface wording localized', () => {
        const japanese = translations.ja;

        for (const [key, value] of Object.entries(jaPickerSheetSurfaceBaseline)) {
            expect(japanese[key as keyof typeof japanese], `ja drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ko picker sheet and surface wording localized', () => {
        const korean = translations.ko;

        for (const [key, value] of Object.entries(koPickerSheetSurfaceBaseline)) {
            expect(korean[key as keyof typeof korean], `ko drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the es picker sheet and surface wording localized', () => {
        const spanish = translations.es;

        for (const [key, value] of Object.entries(esPickerSheetSurfaceBaseline)) {
            expect(spanish[key as keyof typeof spanish], `es drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the fr picker sheet and surface wording localized', () => {
        const french = translations.fr;

        for (const [key, value] of Object.entries(frPickerSheetSurfaceBaseline)) {
            expect(french[key as keyof typeof french], `fr drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the de picker sheet and surface wording localized', () => {
        const german = translations.de;

        for (const [key, value] of Object.entries(dePickerSheetSurfaceBaseline)) {
            expect(german[key as keyof typeof german], `de drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ru picker sheet and surface wording localized', () => {
        const russian = translations.ru;

        for (const [key, value] of Object.entries(ruPickerSheetSurfaceBaseline)) {
            expect(russian[key as keyof typeof russian], `ru drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ja viewer action and metadata wording localized', () => {
        const japanese = translations.ja;

        for (const [key, value] of Object.entries(jaViewerActionMetadataBaseline)) {
            expect(japanese[key as keyof typeof japanese], `ja drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ko viewer action and metadata wording localized', () => {
        const korean = translations.ko;

        for (const [key, value] of Object.entries(koViewerActionMetadataBaseline)) {
            expect(korean[key as keyof typeof korean], `ko drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the es viewer action and metadata wording localized', () => {
        const spanish = translations.es;

        for (const [key, value] of Object.entries(esViewerActionMetadataBaseline)) {
            expect(spanish[key as keyof typeof spanish], `es drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the fr viewer action and metadata wording localized', () => {
        const french = translations.fr;

        for (const [key, value] of Object.entries(frViewerActionMetadataBaseline)) {
            expect(french[key as keyof typeof french], `fr drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the de viewer action and metadata wording localized', () => {
        const german = translations.de;

        for (const [key, value] of Object.entries(deViewerActionMetadataBaseline)) {
            expect(german[key as keyof typeof german], `de drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ru viewer action and metadata wording localized', () => {
        const russian = translations.ru;

        for (const [key, value] of Object.entries(ruViewerActionMetadataBaseline)) {
            expect(russian[key as keyof typeof russian], `ru drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ja queued-batch wording localized', () => {
        const japanese = translations.ja;

        for (const [key, value] of Object.entries(jaQueuedBatchWordingBaseline)) {
            expect(japanese[key as keyof typeof japanese], `ja drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ko queued-batch wording localized', () => {
        const korean = translations.ko;

        for (const [key, value] of Object.entries(koQueuedBatchWordingBaseline)) {
            expect(korean[key as keyof typeof korean], `ko drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the es queued-batch wording localized', () => {
        const spanish = translations.es;

        for (const [key, value] of Object.entries(esQueuedBatchWordingBaseline)) {
            expect(spanish[key as keyof typeof spanish], `es drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the fr queued-batch wording localized', () => {
        const french = translations.fr;

        for (const [key, value] of Object.entries(frQueuedBatchWordingBaseline)) {
            expect(french[key as keyof typeof french], `fr drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the de queued-batch wording localized', () => {
        const german = translations.de;

        for (const [key, value] of Object.entries(deQueuedBatchWordingBaseline)) {
            expect(german[key as keyof typeof german], `de drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the ru queued-batch wording localized', () => {
        const russian = translations.ru;

        for (const [key, value] of Object.entries(ruQueuedBatchWordingBaseline)) {
            expect(russian[key as keyof typeof russian], `ru drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW grounding reuse wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwGroundingReuseBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN grounding reuse wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnGroundingReuseBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW stage surface wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwStageSurfaceBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN stage surface wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnStageSurfaceBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW grounding bundle-state wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwGroundingBundleStateBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN grounding bundle-state wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnGroundingBundleStateBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW viewer session-hint wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwViewerSessionHintBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN viewer session-hint wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnViewerSessionHintBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW import-review description wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwImportReviewDescBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN import-review description wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnImportReviewDescBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW viewer description wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwViewerDescBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN viewer description wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnViewerDescBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW viewer result-text empty wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwViewerResultTextEmptyBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN viewer result-text empty wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnViewerResultTextEmptyBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW insights continuity wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwInsightsContinuityBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN insights continuity wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnInsightsContinuityBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW insights session-source wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwInsightsSessionSourceBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN insights session-source wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnInsightsSessionSourceBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW insights eyebrow wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwInsightsEyebrowBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN insights eyebrow wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnInsightsEyebrowBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW insights session-state hint wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwInsightsSessionStateHintBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN insights session-state hint wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnInsightsSessionStateHintBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW insights timeline-title wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwInsightsTimelineTitleBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN insights timeline-title wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnInsightsTimelineTitleBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW insights timeline description wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwInsightsTimelineDescBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN insights timeline description wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnInsightsTimelineDescBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW insights session-turn-stack empty wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwInsightsSessionTurnStackEmptyBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN insights session-turn-stack empty wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnInsightsSessionTurnStackEmptyBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW insights latest-result-text empty wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwInsightsLatestResultTextEmptyBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN insights latest-result-text empty wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnInsightsLatestResultTextEmptyBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW insights stage-source empty wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwInsightsStageSourceEmptyBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN insights stage-source empty wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnInsightsStageSourceEmptyBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW history filmstrip title wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwHistoryFilmstripTitleBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN history filmstrip title wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnHistoryFilmstripTitleBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW insights session-hints empty wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwInsightsSessionHintsEmptyBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN insights session-hints empty wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnInsightsSessionHintsEmptyBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW history filmstrip description wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwHistoryFilmstripDescBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN history filmstrip description wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnHistoryFilmstripDescBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW history filmstrip empty wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwHistoryFilmstripEmptyBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN history filmstrip empty wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnHistoryFilmstripEmptyBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW queued batch refresh-empty wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwQueuedBatchRefreshNoneBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN queued batch refresh-empty wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnQueuedBatchRefreshNoneBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW queued batch no-importable-results wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwQueuedBatchNoImportableResultsBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN queued batch no-importable-results wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnQueuedBatchNoImportableResultsBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW queued batch refreshed-log wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwQueuedBatchRefreshedLogBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN queued batch refreshed-log wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnQueuedBatchRefreshedLogBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW queued batch cancelled-log wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwQueuedBatchCancelledLogBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN queued batch cancelled-log wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnQueuedBatchCancelledLogBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW queued batch cancel-requested wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwQueuedBatchCancelRequestedNoticeBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN queued batch cancel-requested wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnQueuedBatchCancelRequestedNoticeBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW queued batch import-waiting wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwQueuedBatchImportWaitingNoticeBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN queued batch import-waiting wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnQueuedBatchImportWaitingNoticeBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW queued batch imported-log wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwQueuedBatchImportedLogBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN queued batch imported-log wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnQueuedBatchImportedLogBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW queued batch imported-notice wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwQueuedBatchImportedNoticeBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN queued batch imported-notice wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnQueuedBatchImportedNoticeBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW queued batch import-all-log wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwQueuedBatchImportAllLogBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN queued batch import-all-log wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnQueuedBatchImportAllLogBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW queued batch import-all-notice wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwQueuedBatchImportAllNoticeBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN queued batch import-all-notice wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnQueuedBatchImportAllNoticeBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW queued batch poll-failed wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwQueuedBatchPollFailedLogBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN queued batch poll-failed wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnQueuedBatchPollFailedLogBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW queued batch cancel-failed wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwQueuedBatchCancelFailedLogBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN queued batch cancel-failed wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnQueuedBatchCancelFailedLogBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW queued batch import-failed wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwQueuedBatchImportFailedLogBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN queued batch import-failed wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnQueuedBatchImportFailedLogBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW queued batch import-all-none wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwQueuedBatchImportAllNoneNoticeBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN queued batch import-all-none wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnQueuedBatchImportAllNoneNoticeBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW queued batch submitted-notice wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwQueuedBatchSubmittedNoticeBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN queued batch submitted-notice wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnQueuedBatchSubmittedNoticeBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW queued batch submitted-log wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwQueuedBatchSubmittedLogBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN queued batch submitted-log wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnQueuedBatchSubmittedLogBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW queued batch submission-failed wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwQueuedBatchSubmissionFailedLogBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN queued batch submission-failed wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnQueuedBatchSubmissionFailedLogBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW queued batch polled wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwQueuedBatchPolledLogBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN queued batch polled wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnQueuedBatchPolledLogBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW queued batch ready-to-import wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwQueuedBatchReadyToImportNoticeBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN queued batch ready-to-import wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnQueuedBatchReadyToImportNoticeBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW queued batch finished-state wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwQueuedBatchFinishedStateNoticeBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN queued batch finished-state wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnQueuedBatchFinishedStateNoticeBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW grounding panel no-queries wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwGroundingPanelNoQueriesBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN grounding panel no-queries wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnGroundingPanelNoQueriesBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW composer Enter-hint wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwComposerEnterHintsBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN composer Enter-hint wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnComposerEnterHintsBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW Shift+Enter hint wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwShiftEnterHintBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN Shift+Enter hint wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnShiftEnterHintBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW Enter-to-send hint wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwEnterToSendHintBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN Enter-to-send hint wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnEnterToSendHintBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW import-review continue-latest wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwImportReviewContinueLatestBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN import-review continue-latest wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnImportReviewContinueLatestBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW Ultra Editor loading wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwLoadingPrepareUltraEditorBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN Ultra Editor loading wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnLoadingPrepareUltraEditorBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_TW SketchPad label wording baseline stable', () => {
        const traditionalChinese = translations.zh_TW;

        for (const [key, value] of Object.entries(zhTwSketchPadLabelBaseline)) {
            expect(traditionalChinese[key as keyof typeof traditionalChinese], `zh_TW drifted for ${key}`).toBe(value);
        }
    });

    it('keeps the zh_CN SketchPad label wording baseline stable', () => {
        const simplifiedChinese = translations.zh_CN;

        for (const [key, value] of Object.entries(zhCnSketchPadLabelBaseline)) {
            expect(simplifiedChinese[key as keyof typeof simplifiedChinese], `zh_CN drifted for ${key}`).toBe(value);
        }
    });

    it('renders localized replay chrome and workflow labels', () => {
        const markup = renderToStaticMarkup(
            <SessionReplayDialog
                currentLanguage="ru"
                logs={[
                    '[10:00] system boot',
                    '[10:01] uploading reference image',
                    '[10:02] sending request for SRC-77',
                    '[10:03] processing batch',
                    '[10:04] History loaded.',
                    `[10:05] ${encodeWorkflowMessage('historySourceReopenLog', 'SRC-77')}`,
                ]}
                currentStageSourceShortId="SRC-77"
                onClose={vi.fn()}
                onOpenCurrentStageSource={vi.fn()}
            />,
        );

        expect(markup).toContain('Повтор сеанса');
        expect(markup).toContain('Повторите сохраненную хронологию рабочего потока для этого рабочего пространства.');
        expect(markup).toContain('История');
        expect(markup).toContain('Текущий источник сцены');
        expect(markup).toContain('Шаг 6 / 6');
        expect(markup).toContain('Открыть в истории');
        expect(markup).toContain('История загружена.');
        expect(markup).toContain('Ход из истории снова открыт как текущий источник сцены (SRC-77).');
        expect(markup).not.toContain('Replay timeline');
        expect(markup).not.toContain('Current stage source');
        expect(markup).not.toContain('History loaded.');
    });
});
