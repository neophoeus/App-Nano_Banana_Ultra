import { describe, expect, it } from 'vitest';
import {
    encodeWorkflowMessage,
    getWorkflowEntryLabelKey,
    getWorkflowMeta,
    renderWorkflowMessage,
    workflowMessageIncludes,
} from '../utils/workflowTimeline';

const translations: Record<string, string> = {
    historySourceLoadedLog: 'История загружена.',
    historySourceReopenLog: 'Turn истории снова открыт как текущий источник stage ({0}).',
};

const t = (key: string) => translations[key] || key;

describe('workflowTimeline', () => {
    it('maps workflow stages to translation keys', () => {
        expect(getWorkflowEntryLabelKey({ stage: 'system', label: 'System' })).toBe('workflowStageLabelSystem');
        expect(getWorkflowEntryLabelKey({ stage: 'input', label: 'Input' })).toBe('workflowStageLabelInput');
        expect(getWorkflowEntryLabelKey({ stage: 'request', label: 'Request' })).toBe('workflowStageLabelRequest');
        expect(getWorkflowEntryLabelKey({ stage: 'processing', label: 'Processing' })).toBe(
            'workflowStageLabelProcessing',
        );
        expect(getWorkflowEntryLabelKey({ stage: 'output', label: 'Output' })).toBe('workflowStageLabelOutput');
        expect(getWorkflowEntryLabelKey({ stage: 'history', label: 'History' })).toBe('workflowStageLabelHistory');
        expect(getWorkflowEntryLabelKey({ stage: 'error', label: 'Error' })).toBe('workflowStageLabelError');
    });

    it('uses the cancelled label override ahead of stage mapping', () => {
        expect(getWorkflowEntryLabelKey({ stage: 'error', label: 'Cancelled' })).toBe('workflowStageLabelCancelled');
    });

    it('renders encoded and legacy workflow messages through the active translator', () => {
        expect(renderWorkflowMessage('[raw]', t)).toBe('[raw]');
        expect(renderWorkflowMessage('History loaded.', t)).toBe('История загружена.');
        expect(renderWorkflowMessage(encodeWorkflowMessage('historySourceReopenLog', 'SRC-77'), t)).toBe(
            'Turn истории снова открыт как текущий источник stage (SRC-77).',
        );
    });

    it('matches stage source ids inside encoded workflow messages', () => {
        expect(workflowMessageIncludes(encodeWorkflowMessage('historySourceReopenLog', 'SRC-77'), 'SRC-77', t)).toBe(
            true,
        );
        expect(workflowMessageIncludes(encodeWorkflowMessage('historySourceReopenLog', 'SRC-77'), 'SRC-88', t)).toBe(
            false,
        );
    });

    it('classifies encoded and legacy history workflow messages correctly', () => {
        expect(getWorkflowMeta(encodeWorkflowMessage('historySourceReopenLog', 'SRC-77')).stage).toBe('history');
        expect(getWorkflowMeta('History loaded.').stage).toBe('history');
        expect(getWorkflowMeta(encodeWorkflowMessage('historySourceFailedLog', 'boom')).stage).toBe('error');
    });
});
