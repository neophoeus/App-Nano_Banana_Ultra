import { useEffect, useRef } from 'react';

const activeEscapeStack: Array<() => void> = [];

export function useOverlayEscapeDismiss(isEnabled: boolean, onClose: () => void) {
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    useEffect(() => {
        if (!isEnabled) {
            return;
        }

        const entry = () => onCloseRef.current();
        activeEscapeStack.push(entry);

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape' || event.defaultPrevented) {
                return;
            }
            if (activeEscapeStack[activeEscapeStack.length - 1] !== entry) {
                return;
            }

            event.preventDefault();
            entry();
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            const index = activeEscapeStack.lastIndexOf(entry);
            if (index !== -1) {
                activeEscapeStack.splice(index, 1);
            }
        };
    }, [isEnabled]);
}
