import React from 'react';
import { WORKSPACE_OVERLAY_Z_INDEX } from '../constants/workspaceOverlays';
import { useResponsivePanelState } from '../hooks/useResponsivePanelState';
import WorkspaceModalFrame from './WorkspaceModalFrame';

type WorkspaceSupportDetailSurfaceProps = {
    dataTestId: string;
    title: string;
    closeLabel: string;
    onClose: () => void;
    children: React.ReactNode;
    description?: string;
    compact?: boolean;
    headerExtra?: React.ReactNode;
    desktopWidthClass?: string;
};

export default function WorkspaceSupportDetailSurface({
    dataTestId,
    title,
    closeLabel,
    onClose,
    children,
    description,
    compact = false,
    headerExtra,
    desktopWidthClass = 'max-w-[840px]',
}: WorkspaceSupportDetailSurfaceProps) {
    const { isDesktop } = useResponsivePanelState();

    return (
        <WorkspaceModalFrame
            dataTestId={dataTestId}
            zIndex={WORKSPACE_OVERLAY_Z_INDEX.supportConsole}
            maxWidthClass={isDesktop ? desktopWidthClass : 'max-w-none'}
            onClose={onClose}
            closeLabel={closeLabel}
            title={title}
            description={description}
            headerExtra={headerExtra}
            backdropClassName={
                isDesktop
                    ? 'bg-[linear-gradient(90deg,rgba(15,23,42,0)_0%,rgba(15,23,42,0.08)_54%,rgba(15,23,42,0.30)_100%)] backdrop-blur-[2px]'
                    : 'bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.16),_transparent_34%),rgba(15,23,42,0.74)] backdrop-blur-md'
            }
            panelClassName={
                isDesktop
                    ? 'nbu-overlay-panel-neutral h-full max-h-[calc(100vh-124px)] rounded-[28px] border border-gray-200/80 shadow-[0_24px_80px_rgba(15,23,42,0.18)] dark:border-gray-800/80'
                    : 'nbu-overlay-panel-neutral max-h-[84vh] rounded-t-[28px] rounded-b-none border border-gray-200/80 shadow-[0_-24px_80px_rgba(15,23,42,0.24)] dark:border-gray-800/80'
            }
            headerClassName={
                compact
                    ? 'border-b border-gray-200/80 px-4 py-3 dark:border-gray-700/80'
                    : 'border-b border-gray-200/80 px-5 py-4 dark:border-gray-700/80'
            }
            closeButtonClassName="nbu-control-button px-3 py-1.5 text-[11px] font-semibold"
            containerClassName={
                isDesktop
                    ? 'items-stretch justify-end px-3 pb-[54px] pl-10 pt-[64px]'
                    : 'items-end justify-stretch p-0 pt-16'
            }
        >
            <div
                className={
                    isDesktop
                        ? compact
                            ? 'nbu-scrollbar-subtle h-[calc(100%-72px)] overflow-y-auto p-4'
                            : 'nbu-scrollbar-subtle h-[calc(100%-82px)] overflow-y-auto p-5'
                        : compact
                          ? 'nbu-scrollbar-subtle max-h-[calc(84vh-76px)] overflow-y-auto px-4 pb-5 pt-4'
                          : 'nbu-scrollbar-subtle max-h-[calc(84vh-88px)] overflow-y-auto px-5 pb-6 pt-5'
                }
            >
                {children}
            </div>
        </WorkspaceModalFrame>
    );
}
