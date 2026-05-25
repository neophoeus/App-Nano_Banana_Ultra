import { Dispatch, MutableRefObject, SetStateAction, useCallback, useEffect } from 'react';
import {
    GeneratedImage,
    GroundingMetadata,
    PendingProvenanceContext,
    ResultArtifacts,
    SessionContinuitySource,
    WorkspaceConversationState,
    WorkspaceSessionState,
} from '../types';
import { normalizeGenerationModeKind } from '../utils/generationMode';
import { recordConversationTurn } from '../utils/conversationState';

type PromoteResultArtifactsToSession = (
    artifacts: ResultArtifacts | null,
    source: SessionContinuitySource | null,
    provenanceOverride?: {
        grounding?: WorkspaceSessionState['continuityGrounding'];
        sessionHints?: WorkspaceSessionState['continuitySessionHints'];
        mode?: WorkspaceSessionState['provenanceMode'];
        sourceHistoryId?: string | null;
        sessionSourceHistoryId?: string | null;
        sourceLineageAction?: WorkspaceSessionState['sourceLineageAction'];
        conversationId?: string | null;
        conversationBranchOriginId?: string | null;
        conversationActiveSourceHistoryId?: string | null;
        conversationTurnIds?: string[];
    },
) => void;

type UseProvenanceContinuationArgs = {
    selectedGrounding: GroundingMetadata | null;
    selectedSessionHints: Record<string, unknown> | null;
    workspaceSession: WorkspaceSessionState;
    currentStageAssetSourceHistoryId: string | null;
    pendingProvenanceContext: PendingProvenanceContext | null;
    setPendingProvenanceContext: Dispatch<SetStateAction<PendingProvenanceContext | null>>;
    history: GeneratedImage[];
    generatedImageCount: number;
    isGenerating: boolean;
    lastPromotedHistoryIdRef: MutableRefObject<string | null>;
    buildResultArtifacts: (
        item: Pick<GeneratedImage, 'text' | 'thoughts' | 'grounding' | 'metadata' | 'sessionHints' | 'id'>,
    ) => ResultArtifacts;
    conversationState: WorkspaceConversationState;
    setConversationState: Dispatch<SetStateAction<WorkspaceConversationState>>;
    promoteResultArtifactsToSession: PromoteResultArtifactsToSession;
    applySelectedResultArtifacts: (artifacts: ResultArtifacts | null) => void;
    selectedHistoryId: string | null;
    addLog: (message: string) => void;
    t: (key: string) => string;
};

const getContinuitySourceFromMode = (mode?: string): SessionContinuitySource => {
    if (!mode || normalizeGenerationModeKind(mode) === 'text-to-image') {
        return 'generated';
    }

    return 'follow-up';
};

export function useProvenanceContinuation({
    selectedGrounding,
    selectedSessionHints,
    workspaceSession,
    currentStageAssetSourceHistoryId,
    pendingProvenanceContext,
    setPendingProvenanceContext,
    history,
    generatedImageCount,
    isGenerating,
    lastPromotedHistoryIdRef,
    buildResultArtifacts,
    conversationState,
    setConversationState,
    promoteResultArtifactsToSession,
    applySelectedResultArtifacts,
    selectedHistoryId,
    addLog,
    t,
}: UseProvenanceContinuationArgs) {
    const clearPendingProvenanceContext = useCallback(() => {
        setPendingProvenanceContext(null);
    }, [setPendingProvenanceContext]);

    const primePendingProvenanceContinuation = useCallback(
        (sourceHistoryId?: string | null, options?: { useExplicitSource?: boolean }) => {
            const grounding =
                selectedGrounding ??
                workspaceSession.activeResult?.grounding ??
                workspaceSession.continuityGrounding ??
                null;
            const sessionHints =
                selectedSessionHints ??
                workspaceSession.activeResult?.sessionHints ??
                workspaceSession.continuitySessionHints ??
                null;
            const hasContinuity = Boolean(
                grounding || sessionHints?.groundingMetadataReturned || sessionHints?.groundingSupportsReturned,
            );

            if (!hasContinuity) {
                setPendingProvenanceContext(null);
                return false;
            }

            const resolvedSourceHistoryId = options?.useExplicitSource
                ? (sourceHistoryId ?? null)
                : (sourceHistoryId ??
                  currentStageAssetSourceHistoryId ??
                  workspaceSession.provenanceSourceHistoryId ??
                  workspaceSession.sourceHistoryId ??
                  null);

            setPendingProvenanceContext({
                grounding,
                sessionHints,
                sourceHistoryId: resolvedSourceHistoryId,
            });
            return true;
        },
        [
            currentStageAssetSourceHistoryId,
            selectedGrounding,
            selectedSessionHints,
            setPendingProvenanceContext,
            workspaceSession.activeResult?.grounding,
            workspaceSession.activeResult?.sessionHints,
            workspaceSession.continuityGrounding,
            workspaceSession.continuitySessionHints,
            workspaceSession.provenanceSourceHistoryId,
            workspaceSession.sourceHistoryId,
        ],
    );

    useEffect(() => {
        if (isGenerating || history.length === 0) {
            return;
        }

        const latestSuccessful = history.reduce<GeneratedImage | null>(
            (latestItem, item) => {
                if (item.status !== 'success') {
                    return latestItem;
                }

                if (!latestItem || item.createdAt >= latestItem.createdAt) {
                    return item;
                }

                return latestItem;
            },
            null,
        );
        if (!latestSuccessful) {
            return;
        }

        if (latestSuccessful.id === lastPromotedHistoryIdRef.current) {
            return;
        }

        const latestArtifacts = buildResultArtifacts(latestSuccessful);
        const continuitySource = getContinuitySourceFromMode(latestSuccessful.mode);
        const shouldRecordConversationTurn =
            latestSuccessful.executionMode === 'chat-continuation' &&
            Boolean(latestSuccessful.conversationId) &&
            Boolean(latestSuccessful.conversationBranchOriginId);
        const nextConversationState = shouldRecordConversationTurn
            ? recordConversationTurn(conversationState, {
                  branchOriginId: latestSuccessful.conversationBranchOriginId!,
                  conversationId: latestSuccessful.conversationId!,
                  nextActiveSourceHistoryId: latestSuccessful.id,
                  turnId: latestSuccessful.id,
              })
            : conversationState;
        const shouldInheritProvenance =
            continuitySource === 'follow-up' &&
            Boolean(pendingProvenanceContext) &&
            !latestArtifacts.grounding &&
            Boolean(
                pendingProvenanceContext?.grounding ||
                pendingProvenanceContext?.sessionHints?.groundingMetadataReturned ||
                pendingProvenanceContext?.sessionHints?.groundingSupportsReturned,
            );
        const mergedSessionHints = shouldInheritProvenance
            ? {
                  ...(pendingProvenanceContext?.sessionHints || {}),
                  ...(latestArtifacts.sessionHints || {}),
                  provenanceInherited: true,
                  groundingMetadataReturned: Boolean(
                      latestArtifacts.grounding ||
                      pendingProvenanceContext?.grounding ||
                      latestArtifacts.sessionHints?.groundingMetadataReturned ||
                      pendingProvenanceContext?.sessionHints?.groundingMetadataReturned,
                  ),
                  groundingSupportsReturned: Boolean(
                      latestArtifacts.grounding?.supports?.length ||
                      pendingProvenanceContext?.grounding?.supports?.length ||
                      latestArtifacts.sessionHints?.groundingSupportsReturned ||
                      pendingProvenanceContext?.sessionHints?.groundingSupportsReturned,
                  ),
              }
            : latestArtifacts.sessionHints;
        const mergedArtifacts: ResultArtifacts = shouldInheritProvenance
            ? {
                  ...latestArtifacts,
                  grounding: pendingProvenanceContext?.grounding || null,
                  sessionHints: mergedSessionHints || null,
              }
            : latestArtifacts;

        const shouldPromoteContinuationSource = latestSuccessful.executionMode !== 'interactive-batch-variants';
        if (shouldRecordConversationTurn) {
            setConversationState(nextConversationState);
        }
        promoteResultArtifactsToSession(mergedArtifacts, continuitySource, {
            grounding: mergedArtifacts.grounding,
            sessionHints: mergedSessionHints || mergedArtifacts.sessionHints,
            mode: mergedArtifacts.grounding ? (shouldInheritProvenance ? 'inherited' : 'live') : null,
            sourceHistoryId: pendingProvenanceContext?.sourceHistoryId ?? mergedArtifacts.historyId ?? null,
            sessionSourceHistoryId: shouldPromoteContinuationSource
                ? latestSuccessful.id
                : null,
            sourceLineageAction: shouldPromoteContinuationSource ? 'continue' : null,
            conversationId: latestSuccessful.conversationId,
            conversationBranchOriginId: latestSuccessful.conversationBranchOriginId,
            conversationActiveSourceHistoryId: latestSuccessful.id,
            conversationTurnIds: latestSuccessful.conversationBranchOriginId
                ? nextConversationState.byBranchOriginId[latestSuccessful.conversationBranchOriginId]?.turnIds || []
                : [],
        });

        if (shouldInheritProvenance) {
            addLog(t('provenanceCarryForwardLog'));
        }

        if (!selectedHistoryId) {
            applySelectedResultArtifacts(mergedArtifacts);
        }
        lastPromotedHistoryIdRef.current = latestSuccessful.id;
        setPendingProvenanceContext(null);
    }, [
        addLog,
        applySelectedResultArtifacts,
        buildResultArtifacts,
        conversationState,
        generatedImageCount,
        history,
        isGenerating,
        lastPromotedHistoryIdRef,
        pendingProvenanceContext,
        promoteResultArtifactsToSession,
        selectedHistoryId,
        setConversationState,
        setPendingProvenanceContext,
        t,
    ]);

    return {
        clearPendingProvenanceContext,
        primePendingProvenanceContinuation,
    };
}
