import { RefObject, useEffect } from 'react';

const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(',');

type UseOverlayFocusTrapOptions = {
    isEnabled: boolean;
    initialFocusRef?: RefObject<HTMLElement | null>;
    restoreFocus?: boolean;
};

function isElementVisible(element: HTMLElement) {
    if (element.hidden || element.getAttribute('aria-hidden') === 'true') {
        return false;
    }

    const styles = window.getComputedStyle(element);
    if (styles.display === 'none' || styles.visibility === 'hidden') {
        return false;
    }

    return element.getClientRects().length > 0;
}

function focusElement(element: HTMLElement) {
    try {
        element.focus({ preventScroll: true });
    } catch {
        element.focus();
    }
}

export function useOverlayFocusTrap(
    containerRef: RefObject<HTMLElement | null>,
    { isEnabled, initialFocusRef, restoreFocus = true }: UseOverlayFocusTrapOptions,
) {
    useEffect(() => {
        if (!isEnabled) {
            return;
        }

        const container = containerRef.current;
        if (!container) {
            return;
        }

        const previousActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;

        const getFocusableElements = () =>
            Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
                (element) => !element.hasAttribute('disabled') && element.tabIndex !== -1 && isElementVisible(element),
            );

        const frameHandle = window.requestAnimationFrame(() => {
            const preferredTarget = initialFocusRef?.current;
            if (
                preferredTarget &&
                isElementVisible(preferredTarget) &&
                preferredTarget.tabIndex !== -1 &&
                !preferredTarget.hasAttribute('disabled')
            ) {
                focusElement(preferredTarget);
                return;
            }

            const focusableElements = getFocusableElements();
            focusElement(focusableElements[0] || container);
        });

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Tab') {
                return;
            }

            const elements = getFocusableElements();
            if (elements.length === 0) {
                event.preventDefault();
                focusElement(container);
                return;
            }

            const firstElement = elements[0];
            const lastElement = elements[elements.length - 1];
            const activeElement = document.activeElement;

            if (event.shiftKey) {
                if (activeElement === firstElement || activeElement === container) {
                    event.preventDefault();
                    focusElement(lastElement);
                }
                return;
            }

            if (activeElement === lastElement) {
                event.preventDefault();
                focusElement(firstElement);
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.cancelAnimationFrame(frameHandle);
            window.removeEventListener('keydown', handleKeyDown);
            if (restoreFocus && previousActiveElement && document.contains(previousActiveElement)) {
                focusElement(previousActiveElement);
            }
        };
    }, [containerRef, initialFocusRef, isEnabled, restoreFocus]);
}
