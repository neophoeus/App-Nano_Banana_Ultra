import React, { useMemo, useState } from 'react';
import { WORKSPACE_OVERLAY_Z_INDEX } from '../constants/workspaceOverlays';
import {
    buildWorkflowEntries,
    getWorkflowEntryLabelKey,
    renderWorkflowMessage,
    type WorkflowEntry,
    workflowMessageIncludes,
} from '../utils/workflowTimeline';
import { getTranslation, Language } from '../utils/translations';
import ThemeToggle from './ThemeToggle';
import WorkspaceModalFrame from './WorkspaceModalFrame';

export type SessionReplayDialogProps = {
    currentLanguage: Language;
    logs: string[];
    onClose: () => void;
    currentStageSourceShortId?: string | null;
    onOpenCurrentStageSource?: () => void;
};

const SessionReplayDialog: React.FC<SessionReplayDialogProps> = ({
    currentLanguage,
    logs,
    onClose,
    currentStageSourceShortId = null,
    onOpenCurrentStageSource,
}) => {
    const t = (key: string) => getTranslation(currentLanguage, key);
    const compactNeutralActionButtonClassName =
        'nbu-control-button px-3 py-1.5 text-[11px] font-semibold disabled:opacity-40';
    const entries = useMemo(
        () =>
            buildWorkflowEntries(logs).map((entry) => ({
                ...entry,
                displayMessage: renderWorkflowMessage(entry.message, t),
                isCurrentStageSourceEntry: Boolean(
                    currentStageSourceShortId && workflowMessageIncludes(entry.message, currentStageSourceShortId, t),
                ),
            })),
        [currentStageSourceShortId, logs, t],
    );
    const [activeIndex, setActiveIndex] = useState(entries.length > 0 ? entries.length - 1 : 0);
    const activeEntry = entries[activeIndex] || null;
    const stageCount = new Set(entries.map((entry) => entry.stage)).size;
    const historyCount = entries.filter((entry) => entry.stage === 'history').length;
    const errorCount = entries.filter((entry) => entry.stage === 'error').length;
    const currentStageSourceEntryIndex = entries.reduce(
        (latestIndex, entry, index) => (entry.isCurrentStageSourceEntry ? index : latestIndex),
        -1,
    );

    const getEntryLabel = (entry: WorkflowEntry) => t(getWorkflowEntryLabelKey(entry));

    const moveReplay = (direction: 'prev' | 'next') => {
        setActiveIndex((current) => {
            if (entries.length === 0) {
                return 0;
            }

            if (direction === 'prev') {
                return Math.max(0, current - 1);
            }

            return Math.min(entries.length - 1, current + 1);
        });
    };

    return (
        <WorkspaceModalFrame
            dataTestId="session-replay-dialog"
            zIndex={WORKSPACE_OVERLAY_Z_INDEX.sessionReplay}
            maxWidthClass="max-w-5xl"
            onClose={onClose}
            closeLabel={t('branchRenameClose')}
            eyebrow={t('sessionReplayEyebrow')}
            title={t('sessionReplayTitle')}
            headerExtra={
                <div className="mt-4 flex items-center gap-3">
                    <ThemeToggle currentLanguage={currentLanguage} className="h-9 w-9" />
                </div>
            }
            backdropClassName="bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.14),_transparent_34%),rgba(15,23,42,0.76)] backdrop-blur-md"
            panelClassName="nbu-overlay-panel-neutral max-h-[90vh]"
            headerClassName="border-b border-slate-200/80 px-6 py-5 dark:border-slate-700/80"
        >
            <div className="grid gap-4 border-b border-slate-200/80 px-6 py-4 md:grid-cols-4 dark:border-slate-700/80">
                <div className="nbu-context-rail-callout rounded-2xl border px-4 py-3">
                    <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-sky-700 dark:text-sky-200">
                        {t('sessionReplayEvents')}
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">{entries.length}</div>
                </div>
                <div className="nbu-overlay-card-neutral rounded-2xl border px-4 py-3">
                    <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                        {t('sessionReplayStages')}
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">{stageCount}</div>
                </div>
                <div className="nbu-overlay-card-neutral rounded-2xl border px-4 py-3">
                    <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                        {t('sessionReplayHistorySteps')}
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">{historyCount}</div>
                </div>
                <div className="nbu-overlay-card-neutral rounded-2xl border px-4 py-3">
                    <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                        {t('sessionReplayErrors')}
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">{errorCount}</div>
                </div>
            </div>

            <div className="grid max-h-[calc(90vh-208px)] gap-0 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                <div className="nbu-overlay-pane-neutral border-r border-slate-200/80 p-4 dark:border-slate-700/80">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                            {t('sessionReplayFocus')}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => moveReplay('prev')}
                                disabled={activeIndex <= 0 || entries.length === 0}
                                className={compactNeutralActionButtonClassName}
                            >
                                {t('sessionReplayPrev')}
                            </button>
                            <button
                                type="button"
                                onClick={() => moveReplay('next')}
                                disabled={entries.length === 0 || activeIndex >= entries.length - 1}
                                className={compactNeutralActionButtonClassName}
                            >
                                {t('sessionReplayNext')}
                            </button>
                        </div>
                    </div>

                    {activeEntry ? (
                        <div
                            data-testid="session-replay-active"
                            className={`nbu-overlay-card-neutral rounded-[28px] border p-5 ${activeEntry.border}`}
                        >
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <span className={`text-lg font-bold ${activeEntry.tone}`}>{activeEntry.icon}</span>
                                    <span
                                        className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${activeEntry.border} ${activeEntry.tone}`}
                                    >
                                        {getEntryLabel(activeEntry)}
                                    </span>
                                    {activeEntry.isCurrentStageSourceEntry && (
                                        <span
                                            data-testid="session-replay-stage-source-badge"
                                            className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
                                        >
                                            {t('sessionReplayCurrentStageSource')}
                                        </span>
                                    )}
                                </div>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {t('sessionReplayStepCounter')
                                        .replace('{0}', String(activeIndex + 1))
                                        .replace('{1}', String(entries.length))}
                                </span>
                            </div>
                            <div className="mt-4 text-sm leading-7 text-gray-800 dark:text-gray-100">
                                {activeEntry.displayMessage}
                            </div>
                            {activeEntry.isCurrentStageSourceEntry && onOpenCurrentStageSource && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <button
                                        data-testid="session-replay-source-open"
                                        type="button"
                                        onClick={onOpenCurrentStageSource}
                                        className="rounded-full bg-amber-500 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-amber-600"
                                    >
                                        {t('historyActionOpenInHistory')}
                                    </button>
                                </div>
                            )}
                            <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                                {activeEntry.timestamp || t('sessionReplayNoTimestamp')}
                            </div>
                        </div>
                    ) : (
                        <div className="nbu-overlay-card-neutral rounded-[28px] border border-dashed px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                            {t('sessionReplayEmpty')}
                        </div>
                    )}
                </div>

                <div className="nbu-overlay-pane-neutral min-h-0 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                            {t('sessionReplayTimeline')}
                        </div>
                        <div className="flex items-center gap-2">
                            {currentStageSourceEntryIndex >= 0 && (
                                <button
                                    data-testid="session-replay-jump-source"
                                    type="button"
                                    onClick={() => setActiveIndex(currentStageSourceEntryIndex)}
                                    className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-700 dark:border-amber-500/40 dark:bg-amber-950/20 dark:text-amber-200"
                                >
                                    {t('sessionReplayJumpToSource')}
                                </button>
                            )}
                            {entries.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setActiveIndex(entries.length - 1)}
                                    className={compactNeutralActionButtonClassName}
                                >
                                    {t('sessionReplayJumpToLatest')}
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="max-h-[calc(90vh-300px)] space-y-2 overflow-y-auto pr-1">
                        {entries.length > 0
                            ? entries.map((entry: WorkflowEntry, index) => {
                                  const isActive = index === activeIndex;

                                  return (
                                      <button
                                          key={`${entry.timestamp || 'no-time'}-${index}-${entry.message}`}
                                          type="button"
                                          data-testid={
                                              entry.isCurrentStageSourceEntry
                                                  ? `session-replay-stage-source-entry-${index}`
                                                  : `session-replay-entry-${index}`
                                          }
                                          onClick={() => setActiveIndex(index)}
                                          className={`w-full rounded-2xl border px-3 py-3 text-left transition-colors ${isActive ? 'border-amber-400 bg-amber-50 shadow-[0_0_0_1px_rgba(245,158,11,0.14)] dark:border-amber-500/50 dark:bg-amber-950/20' : entry.border} ${entry.isCurrentStageSourceEntry ? 'ring-1 ring-amber-300/80 dark:ring-amber-500/30' : ''}`}
                                      >
                                          <div className="flex items-center justify-between gap-3">
                                              <div className="flex min-w-0 items-center gap-2">
                                                  <span className={`shrink-0 text-sm font-bold ${entry.tone}`}>
                                                      {entry.icon}
                                                  </span>
                                                  <span
                                                      className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${entry.border} ${entry.tone}`}
                                                  >
                                                      {getEntryLabel(entry)}
                                                  </span>
                                                  {entry.isCurrentStageSourceEntry && (
                                                      <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
                                                          {t('sessionReplayCurrentStageSource')}
                                                      </span>
                                                  )}
                                              </div>
                                              <span className="shrink-0 text-[11px] text-gray-400 dark:text-gray-500">
                                                  {entry.timestamp || t('sessionReplayNoTime')}
                                              </span>
                                          </div>
                                          <div className="mt-2 line-clamp-2 text-sm leading-6 text-gray-700 dark:text-gray-200">
                                              {entry.displayMessage}
                                          </div>
                                      </button>
                                  );
                              })
                            : null}
                    </div>
                </div>
            </div>
        </WorkspaceModalFrame>
    );
};

export default SessionReplayDialog;
