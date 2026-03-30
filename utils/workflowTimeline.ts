export type WorkflowStage = 'system' | 'input' | 'request' | 'processing' | 'output' | 'history' | 'error';

type WorkflowMessageDescriptor = {
    key: string;
    args: string[];
};

const WORKFLOW_MESSAGE_PREFIX = '__workflow_i18n__:';

const formatMessageTemplate = (template: string, args: string[]) =>
    args.reduce((message, value, index) => message.replace(`{${index}}`, value), template);

const decodeWorkflowMessage = (message: string): WorkflowMessageDescriptor | null => {
    if (!message.startsWith(WORKFLOW_MESSAGE_PREFIX)) {
        return null;
    }

    try {
        const parsed = JSON.parse(message.slice(WORKFLOW_MESSAGE_PREFIX.length)) as Partial<WorkflowMessageDescriptor>;
        if (!parsed || typeof parsed.key !== 'string') {
            return null;
        }

        return {
            key: parsed.key,
            args: Array.isArray(parsed.args) ? parsed.args.map((value) => String(value)) : [],
        };
    } catch {
        return null;
    }
};

const decodeLegacyWorkflowMessage = (message: string): WorkflowMessageDescriptor | null => {
    if (/^History loaded\.$/i.test(message)) {
        return { key: 'historySourceLoadedLog', args: [] };
    }

    const historyFailedMatch = message.match(/^History:\s*Failed\s*-\s*(.*)$/i);
    if (historyFailedMatch) {
        return { key: 'historySourceFailedLog', args: [historyFailedMatch[1] || ''] };
    }

    return null;
};

const getWorkflowMessageDescriptor = (message: string): WorkflowMessageDescriptor | null =>
    decodeWorkflowMessage(message) || decodeLegacyWorkflowMessage(message);

const workflowStageByMessageKey: Record<string, WorkflowStage> = {
    workspaceSnapshotImportedLog: 'history',
    workspaceSnapshotMergedLog: 'history',
    workspaceSnapshotExportedLog: 'output',
    historySourceStartConversationLog: 'history',
    historySourceVariantContinueLog: 'history',
    historySourceContinueLog: 'history',
    historySourceBranchLog: 'history',
    historySourceReopenLog: 'history',
    historySourceLoadedLog: 'history',
    historySourceFailedLog: 'error',
};

const getWorkflowMetaForStage = (
    stage: WorkflowStage,
    label?: 'Cancelled',
): Omit<WorkflowEntry, 'timestamp' | 'message'> => {
    if (label === 'Cancelled') {
        return {
            stage: 'error',
            label: 'Cancelled',
            icon: '■',
            tone: 'text-orange-500 dark:text-orange-400',
            border: 'border-orange-200 dark:border-orange-500/20 bg-orange-50 dark:bg-orange-900/10',
        };
    }

    switch (stage) {
        case 'input':
            return {
                stage,
                label: 'Input',
                icon: '⌘',
                tone: 'text-amber-600 dark:text-amber-300',
                border: 'border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-900/10',
            };
        case 'request':
            return {
                stage,
                label: 'Request',
                icon: '➜',
                tone: 'text-cyan-600 dark:text-cyan-400',
                border: 'border-cyan-200 dark:border-cyan-500/20 bg-cyan-50 dark:bg-cyan-900/10',
            };
        case 'processing':
            return {
                stage,
                label: 'Processing',
                icon: '⋯',
                tone: 'text-lime-600 dark:text-lime-400',
                border: 'border-lime-200 dark:border-lime-500/20 bg-lime-50 dark:bg-lime-900/10',
            };
        case 'output':
            return {
                stage,
                label: 'Output',
                icon: '✓',
                tone: 'text-emerald-600 dark:text-emerald-400',
                border: 'border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-900/10',
            };
        case 'history':
            return {
                stage,
                label: 'History',
                icon: '↺',
                tone: 'text-violet-600 dark:text-violet-300',
                border: 'border-violet-200 dark:border-violet-500/20 bg-violet-50 dark:bg-violet-900/10',
            };
        case 'error':
            return {
                stage,
                label: 'Error',
                icon: '✕',
                tone: 'text-red-500 dark:text-red-400',
                border: 'border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-900/10',
            };
        case 'system':
        default:
            return {
                stage: 'system',
                label: 'System',
                icon: '•',
                tone: 'text-gray-500 dark:text-gray-400',
                border: 'border-gray-200 dark:border-gray-800/50 bg-white/60 dark:bg-white/5',
            };
    }
};

export type WorkflowEntry = {
    timestamp: string | null;
    message: string;
    stage: WorkflowStage;
    label: string;
    icon: string;
    tone: string;
    border: string;
};

export const getWorkflowEntryLabelKey = (entry: Pick<WorkflowEntry, 'stage' | 'label'>): string => {
    if (entry.label === 'Cancelled') {
        return 'workflowStageLabelCancelled';
    }

    switch (entry.stage) {
        case 'input':
            return 'workflowStageLabelInput';
        case 'request':
            return 'workflowStageLabelRequest';
        case 'processing':
            return 'workflowStageLabelProcessing';
        case 'output':
            return 'workflowStageLabelOutput';
        case 'history':
            return 'workflowStageLabelHistory';
        case 'error':
            return 'workflowStageLabelError';
        case 'system':
        default:
            return 'workflowStageLabelSystem';
    }
};

export const parseLogLine = (log: string): { timestamp: string | null; message: string } => {
    const match = log.match(/^\[(.*?)\]\s?(.*)$/);
    if (!match) {
        return { timestamp: null, message: log };
    }

    return {
        timestamp: match[1] || null,
        message: match[2] || log,
    };
};

export const encodeWorkflowMessage = (key: string, ...args: Array<string | number>): string =>
    `${WORKFLOW_MESSAGE_PREFIX}${JSON.stringify({ key, args: args.map((value) => String(value)) })}`;

export const renderWorkflowMessage = (message: string, translate: (key: string) => string): string => {
    const descriptor = getWorkflowMessageDescriptor(message);
    if (!descriptor) {
        return message;
    }

    return formatMessageTemplate(translate(descriptor.key), descriptor.args);
};

export const workflowMessageIncludes = (
    message: string,
    needle: string,
    translate?: (key: string) => string,
): boolean => {
    if (!needle) {
        return false;
    }

    if (message.includes(needle)) {
        return true;
    }

    const descriptor = getWorkflowMessageDescriptor(message);
    if (!descriptor) {
        return false;
    }

    if (descriptor.args.some((value) => value.includes(needle))) {
        return true;
    }

    return translate ? renderWorkflowMessage(message, translate).includes(needle) : false;
};

export const getWorkflowMeta = (message: string): Omit<WorkflowEntry, 'timestamp' | 'message'> => {
    const descriptor = getWorkflowMessageDescriptor(message);
    if (descriptor) {
        const descriptorStage = workflowStageByMessageKey[descriptor.key];
        if (descriptorStage) {
            return getWorkflowMetaForStage(descriptorStage);
        }
    }

    const lowerMsg = message.toLowerCase();
    const isZeroFailedMsg = lowerMsg.includes('0 failed') || lowerMsg.includes('0 error');

    if (
        (lowerMsg.includes('error') ||
            lowerMsg.includes('failed') ||
            lowerMsg.includes('fatal') ||
            lowerMsg.includes('block')) &&
        !isZeroFailedMsg
    ) {
        return getWorkflowMetaForStage('error');
    }
    if (lowerMsg.includes('cancel')) {
        return getWorkflowMetaForStage('error', 'Cancelled');
    }
    if (lowerMsg.includes('history')) {
        return getWorkflowMetaForStage('history');
    }
    if (
        lowerMsg.includes('saved') ||
        lowerMsg.includes('done:') ||
        lowerMsg.includes('success') ||
        lowerMsg.includes('completed')
    ) {
        return getWorkflowMetaForStage('output');
    }
    if (
        lowerMsg.includes('requesting') ||
        lowerMsg.includes('sending') ||
        lowerMsg.includes('mode:') ||
        lowerMsg.includes('source:')
    ) {
        return getWorkflowMetaForStage('request');
    }
    if (
        lowerMsg.includes('upload') ||
        lowerMsg.includes('reference') ||
        lowerMsg.includes('ratio') ||
        lowerMsg.includes('rewrite') ||
        lowerMsg.includes('inspiration') ||
        lowerMsg.includes('style')
    ) {
        return getWorkflowMetaForStage('input');
    }
    if (
        lowerMsg.includes('processing') ||
        lowerMsg.includes('initializing') ||
        lowerMsg.includes('warming') ||
        lowerMsg.includes('scanning')
    ) {
        return getWorkflowMetaForStage('processing');
    }

    return getWorkflowMetaForStage('system');
};

export const buildWorkflowEntries = (logs: string[]): WorkflowEntry[] =>
    logs.map((log) => {
        const parsed = parseLogLine(log);
        return {
            ...parsed,
            ...getWorkflowMeta(parsed.message),
        };
    });

export const buildWorkflowTimeline = (logs: string[], limit: number = 6): WorkflowEntry[] =>
    buildWorkflowEntries(logs)
        .reduce<WorkflowEntry[]>((acc, entry) => {
            const previous = acc[acc.length - 1];
            if (!previous || previous.stage !== entry.stage || previous.message !== entry.message) {
                acc.push(entry);
            } else {
                acc[acc.length - 1] = entry;
            }
            return acc;
        }, [])
        .slice(-limit);
