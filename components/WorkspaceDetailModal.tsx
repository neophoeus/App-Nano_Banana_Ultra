import React from 'react';
import { WORKSPACE_OVERLAY_Z_INDEX } from '../constants/workspaceOverlays';
import WorkspaceModalFrame from './WorkspaceModalFrame';

type WorkspaceDetailModalProps = {
    dataTestId: string;
    title: string;
    closeLabel: string;
    onClose: () => void;
    children: React.ReactNode;
    description?: string;
};

export default function WorkspaceDetailModal({
    dataTestId,
    title,
    closeLabel,
    onClose,
    children,
    description,
}: WorkspaceDetailModalProps) {
    return (
        <WorkspaceModalFrame
            dataTestId={dataTestId}
            zIndex={WORKSPACE_OVERLAY_Z_INDEX.workspaceDetail}
            maxWidthClass="max-w-6xl"
            onClose={onClose}
            closeLabel={closeLabel}
            title={title}
            description={description}
            backdropClassName="bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.16),_transparent_34%),rgba(15,23,42,0.74)] backdrop-blur-md"
            panelClassName="nbu-overlay-panel-neutral max-h-[88vh]"
            headerClassName="border-b border-gray-200/80 px-5 py-4 dark:border-gray-700/80"
            closeButtonClassName="nbu-control-button px-3 py-1.5 text-[11px] font-semibold"
            containerClassName="items-start justify-center py-4 md:py-6"
        >
            <div className="nbu-scrollbar-subtle max-h-[calc(88vh-88px)] overflow-y-auto p-5">{children}</div>
        </WorkspaceModalFrame>
    );
}
