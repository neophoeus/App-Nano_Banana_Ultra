/** @vitest-environment jsdom */

import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorkspaceResetActions } from '../hooks/useWorkspaceResetActions';

type HookHandle = ReturnType<typeof useWorkspaceResetActions>;

describe('useWorkspaceResetActions', () => {
    let container: HTMLDivElement;
    let root: Root;
    let latestHook: HookHandle | null;

    const renderHook = () => {
        const lastPromotedHistoryIdRef = { current: 'turn-last' };
        const handleClearResults = vi.fn();
        const clearAssetRoles = vi.fn();
        const applyEmptyWorkspaceSnapshot = vi.fn();
        const clearSharedWorkspaceSnapshot = vi.fn();
        const setActiveWorkspaceDetailModal = vi.fn() as any;
        const setIsAdvancedSettingsOpen = vi.fn() as any;
        const setIsSketchPadOpen = vi.fn() as any;
        const setShowSketchReplaceConfirm = vi.fn() as any;
        const setSettingsSessionDraft = vi.fn() as any;
        const setSettingsSessionReturnToGeneration = vi.fn() as any;
        const setSurfaceSharedControlsBottom = vi.fn() as any;

        function TestComponent() {
            latestHook = useWorkspaceResetActions({
                lastPromotedHistoryIdRef,
                handleClearResults,
                clearAssetRoles,
                applyEmptyWorkspaceSnapshot,
                clearSharedWorkspaceSnapshot,
                setActiveWorkspaceDetailModal,
                setIsAdvancedSettingsOpen,
                setIsSketchPadOpen,
                setShowSketchReplaceConfirm,
                setSettingsSessionDraft,
                setSettingsSessionReturnToGeneration,
                setSurfaceSharedControlsBottom,
            });

            return null;
        }

        flushSync(() => {
            root.render(<TestComponent />);
        });

        return {
            lastPromotedHistoryIdRef,
            handleClearResults,
            clearAssetRoles,
            applyEmptyWorkspaceSnapshot,
            clearSharedWorkspaceSnapshot,
            setActiveWorkspaceDetailModal,
            setIsAdvancedSettingsOpen,
            setIsSketchPadOpen,
            setShowSketchReplaceConfirm,
            setSettingsSessionDraft,
            setSettingsSessionReturnToGeneration,
            setSurfaceSharedControlsBottom,
        };
    };

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        latestHook = null;
    });

    afterEach(() => {
        root.unmount();
        container.remove();
    });

    it('clears only the current stage source when clearing the stage', () => {
        const context = renderHook();

        flushSync(() => {
            latestHook!.handleClearCurrentStage();
        });

        expect(context.handleClearResults).toHaveBeenCalledTimes(1);
        expect(context.clearAssetRoles).toHaveBeenCalledTimes(1);
        expect(context.clearAssetRoles).toHaveBeenCalledWith(['stage-source']);
        expect(context.applyEmptyWorkspaceSnapshot).not.toHaveBeenCalled();
    });

    it('performs a workspace hard reset and closes transient surfaces when clearing history', () => {
        const context = renderHook();

        flushSync(() => {
            latestHook!.handleClearGalleryHistory();
        });

        expect(context.applyEmptyWorkspaceSnapshot).toHaveBeenCalledTimes(1);
        expect(context.clearSharedWorkspaceSnapshot).toHaveBeenCalledTimes(1);
        expect(context.setActiveWorkspaceDetailModal).toHaveBeenCalledWith(null);
        expect(context.setIsAdvancedSettingsOpen).toHaveBeenCalledWith(false);
        expect(context.setIsSketchPadOpen).toHaveBeenCalledWith(false);
        expect(context.setShowSketchReplaceConfirm).toHaveBeenCalledWith(false);
        expect(context.setSettingsSessionDraft).toHaveBeenCalledWith(null);
        expect(context.setSettingsSessionReturnToGeneration).toHaveBeenCalledWith(false);
        expect(context.setSurfaceSharedControlsBottom).toHaveBeenCalledWith(null);
        expect(context.clearAssetRoles).not.toHaveBeenCalled();
        expect(context.lastPromotedHistoryIdRef.current).toBeNull();
    });
});
