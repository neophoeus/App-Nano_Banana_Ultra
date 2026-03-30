import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import WorkspaceHealthPanel from '../components/WorkspaceHealthPanel';
import { getTranslation } from '../utils/translations';

describe('WorkspaceHealthPanel', () => {
    it('renders health-only header content without log-oriented summary text', () => {
        const markup = renderToStaticMarkup(<WorkspaceHealthPanel currentLanguage="en" />);

        expect(markup).toContain(getTranslation('en', 'healthPanelTitle'));
        expect(markup).toContain(getTranslation('en', 'statusPanelLocalApi'));
        expect(markup).toContain(getTranslation('en', 'statusPanelGeminiKey'));
        expect(markup).toContain(getTranslation('en', 'statusPanelChecking'));
        expect(markup).not.toContain(getTranslation('en', 'statusPanelLastCheck'));
        expect(markup).not.toContain(getTranslation('en', 'workflowStatusLabel'));
        expect(markup).not.toContain('global-log-stage-source-entry');
        expect(markup).not.toContain('global-log-stage-source-badge');
        expect(markup).not.toContain('global-log-minimized-source');
    });
});
