import { describe, expect, it, vi } from 'vitest';
import { buildBranchRenameDialogOverlayProps } from '../hooks/useWorkspaceBranchRenameDialogProps';
import { buildWorkspaceImportReviewOverlayProps } from '../hooks/useWorkspaceImportReviewProps';
import { buildSurfaceSharedControlsOverlayProps } from '../hooks/useWorkspaceSurfaceSharedControlsProps';

describe('useWorkspaceOverlayAuxiliaryProps builders', () => {
    it('builds surface shared controls props only while the surface workspace is open', () => {
        const onBottomOffsetChange = vi.fn();
        const onOpenSheet = vi.fn();
        const onOpenAdvancedSettings = vi.fn();

        const props = buildSurfaceSharedControlsOverlayProps({
            currentLanguage: 'en',
            isSurfaceWorkspaceOpen: true,
            isAdvancedSettingsOpen: false,
            activePickerSheet: 'references',
            settingsVariant: 'full',
            totalReferenceCount: 3,
            hasSurfacePrompt: true,
            imageModel: 'gemini-3.1-flash-image-preview',
            capability: {
                maxReferences: 10,
                maxObjects: 5,
                maxCharacters: 3,
                supportedSizes: ['1K', '2K'],
                outputFormats: ['images-only'],
                thinkingLevels: ['minimal', 'high'],
                supportsIncludeThoughts: true,
                supportsGoogleSearch: true,
                supportsImageSearch: true,
                supportsBatchGeneration: true,
            } as any,
            availableGroundingModes: ['off', 'google-search'],
            aspectRatio: '16:9',
            imageSize: '2K',
            batchSize: 2,
            outputFormat: 'images-only',
            temperature: 0.7,
            thinkingLevel: 'high',
            groundingMode: 'google-search',
            objectImageCount: 2,
            characterImageCount: 1,
            floatingControlsZIndex: 120,
            onSurfaceSharedControlsBottomChange: onBottomOffsetChange,
            openSurfacePickerSheet: onOpenSheet,
            openAdvancedSettings: onOpenAdvancedSettings,
            getModelLabel: () => 'Gemini 3.1 Flash Image',
        });

        expect(props).not.toBeNull();
        expect(props?.modelLabel).toBe('Gemini 3.1 Flash Image');
        expect(props?.maxObjects).toBe(5);
        expect(props?.maxCharacters).toBe(3);
        expect(props?.containerStyle).toEqual({ zIndex: 120 });
        expect(props?.onBottomOffsetChange).toBe(onBottomOffsetChange);
        expect(props?.onOpenSheet).toBe(onOpenSheet);
        expect(props?.onOpenAdvancedSettings).toBe(onOpenAdvancedSettings);
        expect(
            buildSurfaceSharedControlsOverlayProps({
                currentLanguage: 'en',
                isSurfaceWorkspaceOpen: false,
                isAdvancedSettingsOpen: false,
                activePickerSheet: null,
                settingsVariant: 'full',
                totalReferenceCount: 0,
                hasSurfacePrompt: false,
                imageModel: 'gemini-3.1-flash-image-preview',
                capability: props!.capability,
                availableGroundingModes: ['off'],
                aspectRatio: '1:1',
                imageSize: '1K',
                batchSize: 1,
                outputFormat: 'images-only',
                temperature: 1,
                thinkingLevel: 'minimal',
                groundingMode: 'off',
                objectImageCount: 0,
                characterImageCount: 0,
                floatingControlsZIndex: 99,
                onSurfaceSharedControlsBottomChange: vi.fn(),
                openSurfacePickerSheet: vi.fn(),
                openAdvancedSettings: vi.fn(),
                getModelLabel: () => 'label',
            }),
        ).toBeNull();
    });

    it('builds import review props with all direct-action handlers wired through', () => {
        const actions = {
            openLatest: vi.fn(),
            continueLatest: vi.fn(),
            branchLatest: vi.fn(),
            openBranchLatest: vi.fn(),
            continueBranchLatest: vi.fn(),
            branchFromBranchLatest: vi.fn(),
        };

        const props = buildWorkspaceImportReviewOverlayProps({
            currentLanguage: 'en',
            workspaceImportReview: {
                incomingConversationId: 'conv-1',
                incomingConversationTurnCount: 2,
                hasDifferentConversationId: true,
                incomingLatestTimestamp: 123,
                currentLatestTimestamp: 100,
                incomingHistoryCount: 2,
                currentHistoryCount: 1,
                incomingHasStage: true,
                currentHasStage: true,
            } as any,
            importedBranchSummaries: [],
            importedLatestTurn: null,
            importedLatestSuccessfulTurn: null,
            isImportedPromotedContinuationSource: () => false,
            getImportedContinueActionLabel: () => 'Continue',
            handleCloseWorkspaceImportReview: vi.fn(),
            handleMergeImportedWorkspaceSnapshot: vi.fn(),
            handleApplyImportedWorkspaceSnapshot: vi.fn(),
            importReviewBranchActions: actions,
        });

        expect(props).not.toBeNull();
        expect(props?.onReplaceAndOpenLatest).toBe(actions.openLatest);
        expect(props?.onReplaceAndContinueLatest).toBe(actions.continueLatest);
        expect(props?.onReplaceAndBranchLatest).toBe(actions.branchLatest);
        expect(props?.onReplaceAndOpenBranchLatest).toBe(actions.openBranchLatest);
        expect(props?.onReplaceAndContinueBranchLatest).toBe(actions.continueBranchLatest);
        expect(props?.onReplaceAndBranchFromBranchLatest).toBe(actions.branchFromBranchLatest);
        expect(
            buildWorkspaceImportReviewOverlayProps({
                currentLanguage: 'en',
                workspaceImportReview: null,
                importedBranchSummaries: [],
                importedLatestTurn: null,
                importedLatestSuccessfulTurn: null,
                isImportedPromotedContinuationSource: () => false,
                getImportedContinueActionLabel: () => 'Continue',
                handleCloseWorkspaceImportReview: vi.fn(),
                handleMergeImportedWorkspaceSnapshot: vi.fn(),
                handleApplyImportedWorkspaceSnapshot: vi.fn(),
                importReviewBranchActions: actions,
            }),
        ).toBeNull();
    });

    it('builds branch rename dialog props and keeps draft reset helpers local to the overlay', () => {
        const setBranchRenameDraft = vi.fn();

        const props = buildBranchRenameDialogOverlayProps({
            currentLanguage: 'en',
            branchRenameDialog: {
                branchOriginId: 'turn-12345678',
                autoLabel: 'Auto Label',
            },
            getShortTurnId: (historyId) => String(historyId).slice(0, 8),
            branchRenameDraft: 'Draft Label',
            setBranchRenameDraft,
            closeBranchRenameDialog: vi.fn(),
            handleSubmitBranchRename: vi.fn(),
        });

        expect(props).not.toBeNull();
        expect(props?.branchOriginShortId).toBe('turn-123');
        props?.onUseAutomaticLabel();
        props?.onReset();
        expect(setBranchRenameDraft).toHaveBeenNthCalledWith(1, 'Auto Label');
        expect(setBranchRenameDraft).toHaveBeenNthCalledWith(2, '');
        expect(
            buildBranchRenameDialogOverlayProps({
                currentLanguage: 'en',
                branchRenameDialog: null,
                getShortTurnId: () => 'unused',
                branchRenameDraft: '',
                setBranchRenameDraft,
                closeBranchRenameDialog: vi.fn(),
                handleSubmitBranchRename: vi.fn(),
            }),
        ).toBeNull();
    });
});
