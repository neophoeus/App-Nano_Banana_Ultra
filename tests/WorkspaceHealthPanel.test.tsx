import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import WorkspaceHealthPanel from '../components/WorkspaceHealthPanel';
import { getTranslation } from '../utils/translations';

describe('WorkspaceHealthPanel', () => {
    it('renders compact health indicators without expandable status copy', () => {
        const markup = renderToStaticMarkup(<WorkspaceHealthPanel currentLanguage="en" />);

        expect(markup).toContain('global-health-summary');
        expect(markup).toContain('global-health-local-api');
        expect(markup).toContain('global-health-gemini-key');
        expect(markup).toContain(getTranslation('en', 'statusPanelLocalApi'));
        expect(markup).toContain(getTranslation('en', 'statusPanelGeminiKey'));
        expect(markup).not.toContain(getTranslation('en', 'statusPanelLive'));
        expect(markup).not.toContain('HEALTH');
        expect(markup).not.toContain('Last Check');
        expect(markup).not.toContain(getTranslation('en', 'workflowStatusLabel'));
        expect(markup).not.toContain('global-log-stage-source-entry');
        expect(markup).not.toContain('global-log-stage-source-badge');
        expect(markup).not.toContain('global-log-minimized-source');
    });
});
