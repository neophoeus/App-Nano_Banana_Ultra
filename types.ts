export type AspectRatio =
    | '1:1'
    | '16:9'
    | '9:16'
    | '4:3'
    | '3:4'
    | '2:3'
    | '3:2'
    | '21:9'
    | '4:5'
    | '5:4'
    | '1:4'
    | '4:1'
    | '1:8'
    | '8:1';
export type EditorMode = 'inpaint' | 'outpaint';
export type ImageSize = '512' | '1K' | '2K' | '4K';

export type ImageStyleCategory =
    | 'All'
    | 'PhotoFilm'
    | 'PaintDrawing'
    | 'Illustration'
    | 'ComicsAnime'
    | 'GraphicDesign'
    | 'ThreeDPixel'
    | 'CraftMaterial'
    | 'Experimental';

export type ImageStyle =
    // Base
    | 'None'
    // Photo
    | 'Photorealistic'
    | 'Cinematic'
    | 'Film Noir'
    | 'Vintage Instant Photo'
    | 'Macro'
    | 'Long Exposure'
    | 'Double Exposure'
    | 'Tilt-Shift'
    | 'Knolling'
    // Classic
    | 'Oil Painting'
    | 'Watercolor'
    | 'Pencil Sketch'
    | 'Ukiyo-e'
    | 'Ink Wash'
    | 'Impressionism'
    | 'Mosaic'
    | 'Pastel'
    | 'Art Nouveau'
    | 'Baroque'
    | 'Art Deco'
    // Digital
    | 'Anime'
    | '3D Render'
    | 'Cyberpunk'
    | 'Pixel Art'
    | 'Low Poly'
    | 'Vaporwave'
    | 'Isometric'
    | 'Vector Art'
    | 'Glitch Art'
    | 'Manga'
    | 'Chibi'
    // Stylized
    | 'Surrealism'
    | 'Pop Art'
    | 'Psychedelic'
    | 'Gothic'
    | 'Steampunk'
    | 'Comic Illustration'
    | 'Fantasy Art'
    | 'Stained Glass'
    | 'Graffiti'
    // Illustration additions
    | 'Digital Illustration'
    | 'Painterly Illustration'
    | 'Editorial Illustration'
    | 'Concept Art'
    | 'Line Art'
    | 'Storybook Illustration'
    // Craft
    | 'Claymation'
    | 'Origami'
    | 'Knitted'
    | 'Paper Cutout'
    | 'Wood Carving'
    | 'Porcelain'
    | 'Embroidery'
    | 'Crystal'
    // Design
    | 'Blueprint'
    | 'Sticker'
    | 'Doodle'
    | 'Neon'
    | 'Flat Design'
    | 'Miniature';

export type ImageModel = 'gemini-3.1-flash-image-preview' | 'gemini-3-pro-image-preview' | 'gemini-2.5-flash-image';
export type OutputFormat = 'images-only' | 'images-and-text';
export type ThinkingLevel = 'disabled' | 'minimal' | 'high';
export type GroundingMode = 'off' | 'google-search' | 'image-search' | 'google-search-plus-image-search';
export type StickySendIntent = 'independent' | 'memory';
export type WorkspaceSettingsDraft = {
    imageModel: ImageModel;
    aspectRatio: AspectRatio;
    imageSize: ImageSize;
    batchSize: number;
    outputFormat: OutputFormat;
    temperature: number;
    thinkingLevel: ThinkingLevel;
    groundingMode: GroundingMode;
};
export type ExecutionMode = 'single-turn' | 'interactive-batch-variants' | 'chat-continuation' | 'queued-batch-job';
export type StageAssetRole = 'object' | 'character' | 'stage-source';
export type StageAssetOrigin = 'upload' | 'sketch' | 'generated' | 'history' | 'editor';
export type TurnLineageAction = 'root' | 'continue' | 'branch' | 'editor-follow-up' | 'reopen';
export type GenerationFailureCode =
    | 'policy-blocked'
    | 'safety-blocked'
    | 'text-only'
    | 'no-image-data'
    | 'empty-response'
    | 'unknown';
export type GenerationFailureExtractionIssue = 'missing-candidates' | 'missing-parts' | 'no-image-data';

export interface GenerationFailureInfo {
    code: GenerationFailureCode;
    message: string;
    promptBlockReason?: string | null;
    finishReason?: string | null;
    blockedSafetyCategories?: string[];
    extractionIssue?: GenerationFailureExtractionIssue | null;
    returnedTextContent?: boolean;
    returnedThoughtContent?: boolean;
}

export interface GenerationFailureDisplayContext {
    hasSiblingSafetyBlockedFailure?: boolean;
}

export interface StageErrorState {
    summary: string;
    detail?: string | null;
    failure?: GenerationFailureInfo | null;
    rawError?: string | null;
    displayContext?: GenerationFailureDisplayContext | null;
}
export type BranchNameOverrides = Record<string, string>;
export type BranchContinuationSourceByOriginId = Record<string, string>;

export interface ConversationImageAssetReference {
    savedFilename?: string | null;
    dataUrl?: string | null;
    mimeType?: string | null;
}

export interface ConversationTurnReference {
    historyId: string;
    prompt: string;
    sourceImage: ConversationImageAssetReference | null;
    outputImage: ConversationImageAssetReference | null;
    text: string | null;
    thoughts: string | null;
    thoughtSignature: string | null;
}

export type BatchPreviewTileStatus = 'pending' | 'ready' | 'failed';

export interface BatchPreviewTile {
    id: string;
    slotIndex: number;
    status: BatchPreviewTileStatus;
    previewUrl?: string | null;
    error?: string | null;
}

export interface BatchPreviewSession {
    id: string;
    batchSize: number;
    didUserInspectExistingImage: boolean;
    tiles: BatchPreviewTile[];
}

export interface ConversationRequestContext {
    conversationId: string;
    branchOriginId: string;
    activeSourceHistoryId: string;
    priorTurns: ConversationTurnReference[];
}

export interface BranchConversationRecord {
    conversationId: string;
    branchOriginId: string;
    activeSourceHistoryId: string | null;
    turnIds: string[];
    startedAt: number;
    updatedAt: number | null;
}

export interface WorkspaceConversationState {
    byBranchOriginId: Record<string, BranchConversationRecord>;
}

export type QueuedBatchJobState =
    | 'JOB_STATE_PENDING'
    | 'JOB_STATE_RUNNING'
    | 'JOB_STATE_SUCCEEDED'
    | 'JOB_STATE_FAILED'
    | 'JOB_STATE_CANCELLED'
    | 'JOB_STATE_EXPIRED';

export interface QueuedBatchJobStats {
    requestCount: number;
    successfulRequestCount: number;
    failedRequestCount: number;
    pendingRequestCount: number;
}

export type QueuedBatchJobImportDiagnostic = 'no-payload' | 'extraction-failure';

export interface QueuedBatchJobImportIssue {
    index: number;
    error: string;
    finishReason?: string | null;
    extractionIssue?: GenerationFailureExtractionIssue | null;
    blockedSafetyCategories?: string[];
    returnedTextContent?: boolean;
    returnedThoughtContent?: boolean;
}

export interface QueuedBatchJob {
    localId: string;
    name: string;
    displayName: string;
    restoredFromSnapshot?: boolean;
    state: QueuedBatchJobState;
    model: ImageModel;
    prompt: string;
    generationMode?: string;
    aspectRatio: AspectRatio;
    imageSize: ImageSize;
    style: ImageStyle;
    outputFormat: OutputFormat;
    temperature: number;
    thinkingLevel: ThinkingLevel;
    includeThoughts: boolean;
    googleSearch: boolean;
    imageSearch: boolean;
    batchSize: number;
    batchStats?: QueuedBatchJobStats | null;
    objectImageCount: number;
    characterImageCount: number;
    createdAt: number;
    updatedAt: number;
    startedAt: number | null;
    completedAt: number | null;
    lastPolledAt: number | null;
    importedAt: number | null;
    hasInlinedResponses?: boolean;
    submissionPending?: boolean;
    importDiagnostic?: QueuedBatchJobImportDiagnostic | null;
    importIssues?: QueuedBatchJobImportIssue[] | null;
    error: string | null;
    parentHistoryId?: string | null;
    rootHistoryId?: string | null;
    sourceHistoryId?: string | null;
    lineageAction?: TurnLineageAction;
    lineageDepth?: number;
}

export interface ImageReceivedResult {
    displayUrl: string;
    savedFilename?: string;
}

export interface StageAsset {
    id: string;
    url: string;
    savedFilename?: string;
    role: StageAssetRole;
    origin: StageAssetOrigin;
    createdAt: number;
    isSketch?: boolean;
    sourceHistoryId?: string;
    lineageAction?: TurnLineageAction;
}

export interface GroundingMetadata {
    enabled: boolean;
    imageSearch?: boolean;
    webQueries?: string[];
    imageQueries?: string[];
    searchEntryPointAvailable?: boolean;
    searchEntryPointRenderedContent?: string;
    supports?: Array<{
        chunkIndices: number[];
        sourceIndices?: number[];
        segmentText?: string;
        sourceTitles?: string[];
    }>;
    sources?: Array<{
        title: string;
        url: string;
        imageUrl?: string;
        sourceType?: 'web' | 'image' | 'context';
    }>;
}

export type ResultPartTextKind = 'thought-text' | 'output-text';
export type ResultPartImageKind = 'thought-image' | 'output-image';

export interface ResultTextPart {
    sequence: number;
    kind: ResultPartTextKind;
    text: string;
}

export interface ResultImagePart {
    sequence: number;
    kind: ResultPartImageKind;
    imageUrl: string;
    mimeType: string;
    savedFilename?: string;
}

export type ResultPart = ResultTextPart | ResultImagePart;

export interface GenerationSettings {
    prompt: string;
    aspectRatio: AspectRatio;
    size: ImageSize;
    style: ImageStyle;
    model: ImageModel;
    batchSize: number;
    outputFormat: OutputFormat;
    temperature: number;
    thinkingLevel: ThinkingLevel;
    includeThoughts: boolean;
    googleSearch: boolean;
    imageSearch: boolean;
}

export interface SavedImageActualOutput {
    width: number;
    height: number;
    mimeType?: string | null;
}

export interface ImageSidecarMetadata {
    prompt: string;
    model: ImageModel | string;
    style: ImageStyle | string;
    aspectRatio: AspectRatio | string;
    requestedImageSize: ImageSize | string;
    size: ImageSize | string;
    outputFormat: OutputFormat | string;
    temperature: number;
    thinkingLevel: ThinkingLevel | string;
    includeThoughts: boolean;
    googleSearch: boolean;
    imageSearch: boolean;
    groundingMode: string;
    generationMode: string;
    mode: string;
    executionMode: ExecutionMode | string;
    batchSize?: number;
    batchJobName?: string;
    batchResultIndex?: number;
    actualOutput?: SavedImageActualOutput | null;
    filename?: string;
    timestamp?: string;
    [key: string]: unknown;
}

export type ImageSidecarMetadataState = 'loading' | 'missing';

export interface GenerateResponse {
    imageUrl?: string;
    text?: string;
    thoughts?: string;
    resultParts?: ResultPart[];
    metadata?: Record<string, unknown>;
    grounding?: GroundingMetadata;
    sessionHints?: Record<string, unknown>;
    failure?: GenerationFailureInfo;
    conversation?: {
        used: boolean;
        conversationId?: string;
        branchOriginId?: string;
        activeSourceHistoryId?: string;
        priorTurnCount?: number;
        historyLength?: number;
    };
}

export interface ResultArtifacts {
    text: string | null;
    thoughts: string | null;
    resultParts?: ResultPart[] | null;
    grounding: GroundingMetadata | null;
    metadata: Record<string, unknown> | null;
    sessionHints: Record<string, unknown> | null;
    historyId: string | null;
}

export interface PendingProvenanceContext {
    grounding: GroundingMetadata | null;
    sessionHints: Record<string, unknown> | null;
    sourceHistoryId: string | null;
}

export type SessionContinuitySource = 'generated' | 'history' | 'follow-up';
export type ContinuationLineageAction = 'continue' | 'branch';
export type ProvenanceContinuityMode = 'live' | 'inherited';

export interface WorkspaceBranchState {
    nameOverrides: BranchNameOverrides;
    continuationSourceByBranchOriginId: BranchContinuationSourceByOriginId;
}

export interface WorkspaceViewState {
    generatedImageUrls: string[];
    selectedImageIndex: number;
    selectedHistoryId: string | null;
}

export interface WorkspaceComposerState {
    prompt: string;
    aspectRatio: AspectRatio;
    imageSize: ImageSize;
    imageStyle: ImageStyle;
    imageModel: ImageModel;
    batchSize: number;
    outputFormat: OutputFormat;
    temperature: number;
    thinkingLevel: ThinkingLevel;
    includeThoughts: boolean;
    googleSearch: boolean;
    imageSearch: boolean;
    stickySendIntent?: StickySendIntent;
    generationMode: string;
    executionMode: ExecutionMode;
}

export interface WorkspaceSessionState {
    activeResult: ResultArtifacts | null;
    continuityGrounding: GroundingMetadata | null;
    continuitySessionHints: Record<string, unknown> | null;
    provenanceMode: ProvenanceContinuityMode | null;
    provenanceSourceHistoryId: string | null;
    conversationId: string | null;
    conversationBranchOriginId: string | null;
    conversationActiveSourceHistoryId: string | null;
    conversationTurnIds: string[];
    source: SessionContinuitySource | null;
    sourceHistoryId: string | null;
    sourceLineageAction?: ContinuationLineageAction | null;
    updatedAt: number | null;
}

export interface GenerationLineageContext {
    parentHistoryId: string | null;
    rootHistoryId: string | null;
    sourceHistoryId: string | null;
    lineageAction: TurnLineageAction;
    lineageDepth: number;
}

export interface GeneratedImage {
    id: string;
    url: string;
    savedFilename?: string;
    thumbnailSavedFilename?: string;
    thumbnailInline?: boolean;
    prompt: string;
    aspectRatio: AspectRatio;
    size: ImageSize;
    style: ImageStyle;
    model: ImageModel;
    createdAt: number;
    openedAt?: number | null;
    mode?: string;
    executionMode?: ExecutionMode;
    variantGroupId?: string | null;
    status?: 'success' | 'failed';
    error?: string;
    failure?: GenerationFailureInfo;
    failureContext?: GenerationFailureDisplayContext;
    text?: string;
    thoughts?: string;
    resultParts?: ResultPart[];
    metadata?: Record<string, unknown>;
    grounding?: GroundingMetadata;
    sessionHints?: Record<string, unknown>;
    conversationId?: string | null;
    conversationBranchOriginId?: string | null;
    conversationSourceHistoryId?: string | null;
    conversationTurnIndex?: number | null;
    parentHistoryId?: string | null;
    rootHistoryId?: string | null;
    sourceHistoryId?: string | null;
    lineageAction?: TurnLineageAction;
    lineageDepth?: number;
}

export type SelectedItemDerivationSource = 'selected-history' | 'stage-source';

export interface SelectedItemModel {
    source: SelectedItemDerivationSource;
    historyId: string;
    item: GeneratedImage;
    shortId: string;
    branchOriginId: string;
    branchLabel: string;
    continuationSourceHistoryId: string | null;
    isStageSource: boolean;
    isContinuationSource: boolean;
}

export type SelectedItemSummaryStripChipKey =
    | 'failed'
    | 'stage-source'
    | 'continuation-source'
    | 'branch'
    | 'lineage-action'
    | 'model'
    | 'size'
    | 'aspect-ratio'
    | 'queued-batch-position'
    | 'execution-mode'
    | 'mode'
    | 'created-at';

export type SelectedItemSummaryStripChipGroup = 'status' | 'core' | 'tail';

export interface SelectedItemSummaryStripChip {
    key: SelectedItemSummaryStripChipKey;
    group: SelectedItemSummaryStripChipGroup;
    label: string;
}

export interface SelectedItemSummaryStripProps {
    selectedItem: SelectedItemModel;
    chips: SelectedItemSummaryStripChip[];
}

export interface WorkspacePersistenceSnapshot {
    history: GeneratedImage[];
    stagedAssets: StageAsset[];
    workflowLogs: string[];
    queuedJobs: QueuedBatchJob[];
    workspaceSession: WorkspaceSessionState;
    branchState: WorkspaceBranchState;
    conversationState: WorkspaceConversationState;
    viewState: WorkspaceViewState;
    composerState: WorkspaceComposerState;
}

export interface GenerateOptions {
    prompt: string;
    aspectRatio?: AspectRatio;
    imageSize: ImageSize;
    style: ImageStyle;
    model: ImageModel;
    editingInput?: string;
    objectImageInputs?: string[];
    characterImageInputs?: string[];
    outputFormat?: OutputFormat;
    temperature?: number;
    thinkingLevel?: ThinkingLevel;
    includeThoughts?: boolean;
    googleSearch?: boolean;
    imageSearch?: boolean;
    executionMode?: ExecutionMode;
    conversationContext?: ConversationRequestContext | null;
    liveProgressBatchSessionId?: string;
}
