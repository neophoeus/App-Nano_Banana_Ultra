import { useEffect } from 'react';

export function useOverlayEscapeDismiss(isEnabled: boolean, onClose: () => void) {
    useEffect(() => {
        if (!isEnabled) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape' || event.defaultPrevented) {
                return;
            }

            event.preventDefault();
            onClose();
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isEnabled, onClose]);
}
