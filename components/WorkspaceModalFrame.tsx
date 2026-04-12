import React, { useMemo, useRef, useState } from 'react';
import { ModalFloatingLayerContext } from './ModalFloatingLayerContext';
import { useOverlayEscapeDismiss } from '../hooks/useOverlayEscapeDismiss';
import { useOverlayFocusTrap } from '../hooks/useOverlayFocusTrap';
import { useOverlayScrollLock } from '../hooks/useOverlayScrollLock';

type WorkspaceModalFrameProps = {
    dataTestId?: string;
    zIndex: number;
    maxWidthClass: string;
    onClose: () => void;
    closeLabel: string;
    eyebrow?: string;
    title: string;
    description?: string;
    headerExtra?: React.ReactNode;
    children: React.ReactNode;
    backdropClassName?: string;
    panelClassName?: string;
    headerClassName?: string;
    closeButtonClassName?: string;
    closeButtonTestId?: string;
    hideCloseButton?: boolean;
    containerClassName?: string;
    closeOnBackdropClick?: boolean;
    initialFocusRef?: React.RefObject<HTMLElement | null>;
};

export default function WorkspaceModalFrame({
    dataTestId,
    zIndex,
    maxWidthClass,
    onClose,
    closeLabel,
    eyebrow,
    title,
    description,
    headerExtra,
    children,
    backdropClassName = 'bg-black/60 backdrop-blur-sm',
    panelClassName = 'border border-gray-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.2)] dark:border-gray-800 dark:bg-[#0d1117]',
    headerClassName = 'border-b border-gray-200 px-5 py-4 dark:border-gray-800',
    closeButtonClassName = 'nbu-control-button px-3 py-1.5 text-[11px] font-semibold',
    closeButtonTestId,
    hideCloseButton = false,
    containerClassName = 'items-center justify-center',
    closeOnBackdropClick = true,
    initialFocusRef,
}: WorkspaceModalFrameProps) {
    const modalRootRef = useRef<HTMLDivElement>(null);
    const dialogRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const [floatingHostElement, setFloatingHostElement] = useState<HTMLDivElement | null>(null);
    const floatingLayerValue = useMemo(
        () => ({
            floatingZIndex: zIndex + 1,
            hostElement: floatingHostElement,
        }),
        [floatingHostElement, zIndex],
    );

    useOverlayEscapeDismiss(true, onClose);
    useOverlayFocusTrap(modalRootRef, { isEnabled: true, initialFocusRef: initialFocusRef ?? closeButtonRef });
    useOverlayScrollLock(true);

    return (
        <div
            data-testid={dataTestId}
            className={`fixed inset-0 flex p-3 ${containerClassName} ${backdropClassName}`}
            style={{ zIndex }}
            onClick={closeOnBackdropClick ? onClose : undefined}
            role="presentation"
        >
            <div
                ref={modalRootRef}
                className={`relative w-full ${maxWidthClass}`}
                onClick={(event) => event.stopPropagation()}
                role="presentation"
            >
                <ModalFloatingLayerContext.Provider value={floatingLayerValue}>
                    <div
                        ref={dialogRef}
                        className={`w-full overflow-hidden rounded-[28px] ${panelClassName}`}
                        role="dialog"
                        aria-modal="true"
                        tabIndex={-1}
                    >
                        <div className={`flex flex-wrap items-start justify-between gap-3 ${headerClassName}`}>
                            <div>
                                {eyebrow && (
                                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-600 dark:text-amber-300">
                                        {eyebrow}
                                    </div>
                                )}
                                <h3 className="mt-1 text-[17px] font-black text-gray-900 dark:text-gray-100">
                                    {title}
                                </h3>
                                {description && (
                                    <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500 dark:text-gray-400">
                                        {description}
                                    </p>
                                )}
                                {headerExtra}
                            </div>
                            {!hideCloseButton && (
                                <button
                                    data-testid={closeButtonTestId}
                                    ref={closeButtonRef}
                                    type="button"
                                    onClick={onClose}
                                    className={closeButtonClassName}
                                >
                                    {closeLabel}
                                </button>
                            )}
                        </div>
                        {children}
                    </div>
                    <div
                        ref={setFloatingHostElement}
                        data-modal-floating-layer="true"
                        className="pointer-events-none fixed inset-0"
                        style={{ zIndex: zIndex + 1 }}
                    />
                </ModalFloatingLayerContext.Provider>
            </div>
        </div>
    );
}
