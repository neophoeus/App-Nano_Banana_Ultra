import { CSSProperties, RefObject, useCallback, useEffect, useState } from 'react';

export type FloatingHorizontalPlacement = 'start' | 'end' | 'center';
export type FloatingVerticalPlacement = 'top' | 'bottom';

type UseAnchoredFloatingPlacementOptions = {
    anchorRef: RefObject<HTMLElement | null>;
    panelRef: RefObject<HTMLElement | null>;
    isOpen: boolean;
    preferredHorizontalPlacement?: FloatingHorizontalPlacement;
    preferredVerticalPlacement?: FloatingVerticalPlacement;
    autoAdjustHorizontal?: boolean;
    autoAdjustVertical?: boolean;
    offset?: number;
    viewportPadding?: number;
};

type AnchoredFloatingPlacementState = {
    floatingStyle: CSSProperties;
    resolvedHorizontalPlacement: FloatingHorizontalPlacement;
    resolvedVerticalPlacement: FloatingVerticalPlacement;
    updatePlacement: () => void;
};

const DEFAULT_VIEWPORT_PADDING = 16;

function clamp(value: number, minimum: number, maximum: number) {
    if (maximum < minimum) {
        return minimum;
    }

    return Math.min(Math.max(value, minimum), maximum);
}

export function useAnchoredFloatingPlacement({
    anchorRef,
    panelRef,
    isOpen,
    preferredHorizontalPlacement = 'start',
    preferredVerticalPlacement = 'bottom',
    autoAdjustHorizontal = false,
    autoAdjustVertical = false,
    offset = 8,
    viewportPadding = DEFAULT_VIEWPORT_PADDING,
}: UseAnchoredFloatingPlacementOptions): AnchoredFloatingPlacementState {
    const [resolvedHorizontalPlacement, setResolvedHorizontalPlacement] =
        useState<FloatingHorizontalPlacement>(preferredHorizontalPlacement);
    const [resolvedVerticalPlacement, setResolvedVerticalPlacement] =
        useState<FloatingVerticalPlacement>(preferredVerticalPlacement);
    const [floatingStyle, setFloatingStyle] = useState<CSSProperties>({
        left: viewportPadding,
        maxWidth: `calc(100vw - ${viewportPadding * 2}px)`,
        position: 'fixed',
        top: viewportPadding,
    });

    useEffect(() => {
        setResolvedHorizontalPlacement(preferredHorizontalPlacement);
    }, [preferredHorizontalPlacement]);

    useEffect(() => {
        setResolvedVerticalPlacement(preferredVerticalPlacement);
    }, [preferredVerticalPlacement]);

    const updatePlacement = useCallback(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const anchorRect = anchorRef.current?.getBoundingClientRect();
        const panelRect = panelRef.current?.getBoundingClientRect();

        if (!anchorRect || !panelRect) {
            return;
        }

        const visualViewport = window.visualViewport;
        const viewportWidth = visualViewport?.width ?? window.innerWidth;
        const viewportHeight = visualViewport?.height ?? window.innerHeight;
        const viewportOffsetLeft = visualViewport?.offsetLeft ?? 0;
        const viewportOffsetTop = visualViewport?.offsetTop ?? 0;
        const availableForStart = viewportWidth - anchorRect.left - viewportPadding;
        const availableForEnd = anchorRect.right - viewportPadding;
        const availableTop = anchorRect.top - viewportPadding - offset;
        const availableBottom = viewportHeight - anchorRect.bottom - viewportPadding - offset;

        let nextHorizontalPlacement = preferredHorizontalPlacement;
        if (autoAdjustHorizontal && preferredHorizontalPlacement !== 'center') {
            const preferredFits =
                preferredHorizontalPlacement === 'start'
                    ? panelRect.width <= availableForStart
                    : panelRect.width <= availableForEnd;
            const fallbackFits =
                preferredHorizontalPlacement === 'start'
                    ? panelRect.width <= availableForEnd
                    : panelRect.width <= availableForStart;

            nextHorizontalPlacement =
                preferredFits || !fallbackFits
                    ? preferredHorizontalPlacement
                    : preferredHorizontalPlacement === 'start'
                      ? 'end'
                      : 'start';
        }

        let nextVerticalPlacement = preferredVerticalPlacement;
        if (autoAdjustVertical) {
            const preferredFits =
                preferredVerticalPlacement === 'top'
                    ? panelRect.height <= availableTop
                    : panelRect.height <= availableBottom;
            const fallbackFits =
                preferredVerticalPlacement === 'top'
                    ? panelRect.height <= availableBottom
                    : panelRect.height <= availableTop;

            nextVerticalPlacement =
                preferredFits || !fallbackFits
                    ? preferredVerticalPlacement
                    : preferredVerticalPlacement === 'top'
                      ? 'bottom'
                      : 'top';
        }

        const leftBase =
            nextHorizontalPlacement === 'center'
                ? anchorRect.left + anchorRect.width / 2 - panelRect.width / 2
                : nextHorizontalPlacement === 'end'
                  ? anchorRect.right - panelRect.width
                  : anchorRect.left;
        const topBase =
            nextVerticalPlacement === 'top' ? anchorRect.top - panelRect.height - offset : anchorRect.bottom + offset;
        const maxLeft = Math.max(viewportPadding, viewportWidth - panelRect.width - viewportPadding);
        const maxTop = Math.max(viewportPadding, viewportHeight - panelRect.height - viewportPadding);
        const nextLeft = clamp(leftBase, viewportPadding, maxLeft);
        const nextTop = clamp(topBase, viewportPadding, maxTop);

        setResolvedHorizontalPlacement(nextHorizontalPlacement);
        setResolvedVerticalPlacement(nextVerticalPlacement);
        setFloatingStyle({
            left: viewportOffsetLeft + nextLeft,
            maxWidth: `${Math.max(0, viewportWidth - viewportPadding * 2)}px`,
            position: 'fixed',
            top: viewportOffsetTop + nextTop,
        });
    }, [
        anchorRef,
        autoAdjustHorizontal,
        autoAdjustVertical,
        offset,
        panelRef,
        preferredHorizontalPlacement,
        preferredVerticalPlacement,
        viewportPadding,
    ]);

    useEffect(() => {
        if (!isOpen || typeof window === 'undefined') {
            return undefined;
        }

        let frameId: number | null = null;
        const schedulePlacementUpdate = () => {
            if (frameId != null) {
                window.cancelAnimationFrame(frameId);
            }

            frameId = window.requestAnimationFrame(() => {
                frameId = null;
                updatePlacement();
            });
        };

        const resizeObserver =
            typeof ResizeObserver === 'undefined'
                ? null
                : new ResizeObserver(() => {
                      schedulePlacementUpdate();
                  });
        if (anchorRef.current) {
            resizeObserver?.observe(anchorRef.current);
        }
        if (panelRef.current) {
            resizeObserver?.observe(panelRef.current);
        }

        const visualViewport = window.visualViewport;

        schedulePlacementUpdate();
        window.addEventListener('resize', schedulePlacementUpdate);
        window.addEventListener('scroll', schedulePlacementUpdate, true);
        visualViewport?.addEventListener('resize', schedulePlacementUpdate);
        visualViewport?.addEventListener('scroll', schedulePlacementUpdate);

        return () => {
            if (frameId != null) {
                window.cancelAnimationFrame(frameId);
            }

            resizeObserver?.disconnect();
            window.removeEventListener('resize', schedulePlacementUpdate);
            window.removeEventListener('scroll', schedulePlacementUpdate, true);
            visualViewport?.removeEventListener('resize', schedulePlacementUpdate);
            visualViewport?.removeEventListener('scroll', schedulePlacementUpdate);
        };
    }, [anchorRef, isOpen, panelRef, updatePlacement]);

    return {
        floatingStyle,
        resolvedHorizontalPlacement,
        resolvedVerticalPlacement,
        updatePlacement,
    };
}
