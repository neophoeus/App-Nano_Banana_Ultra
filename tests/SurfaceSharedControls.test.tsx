import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import SurfaceSharedControls from '../components/SurfaceSharedControls';

describe('SurfaceSharedControls', () => {
    it('keeps the current prompt card summary-first while preserving shared control entry points', () => {
        const longPrompt =
            'This is a long shared prompt preview that should remain easy to scan from the shared controls surface without forcing the whole prompt body to stay expanded every time the sheet is opened.';
        const markup = renderToStaticMarkup(
            <SurfaceSharedControls
                currentLanguage="en"
                isOpen={true}
                workspaceLabel="Workspace A"
                stateDescription="Shared settings stay live here while Workspace A is open."
                activeSheetLabel="Prompt"
                activePickerSheet="prompt"
                isAdvancedSettingsOpen={false}
                promptPreview={longPrompt}
                totalReferenceCount={3}
                styleLabel="None"
                modelLabel="Gemini 3.1 Flash"
                aspectRatio="1:1"
                imageSize="1024x1024"
                batchSize={2}
                objectImageCount={2}
                characterImageCount={1}
                maxObjects={10}
                maxCharacters={4}
                settingsVariant="full"
                containerClassName="shared-shell"
                onToggleOpen={vi.fn()}
                onClosePanel={vi.fn()}
                onOpenSheet={vi.fn()}
                onOpenAdvancedSettings={vi.fn()}
            />,
        );

        const preview = `${longPrompt.slice(0, 140).trimEnd()}...`;

        expect(markup).toContain('shared-controls-state-details');
        expect(markup).toContain('shared-controls-state-summary');
        expect(markup).toContain('shared-controls-state-body');
        expect(markup).toContain('shared-controls-prompt-details');
        expect(markup).toContain('shared-controls-prompt-summary');
        expect(markup).toContain('shared-controls-prompt-body');
        expect(markup).toContain('group-open:rotate-180');
        expect(markup).toContain('Shared Composer State');
        expect(markup).toContain('Workspace A');
        expect(markup).toContain('Shared settings stay live here while Workspace A is open.');
        expect(markup).toContain(preview);
        expect(markup).toContain(longPrompt);
        expect(markup).toContain('shared-control-prompt');
        expect(markup).toContain('shared-control-settings');
        expect(markup).toContain('shared-control-advanced-settings');
        expect(markup).toContain('Advanced settings');
        expect(markup).toContain('Generation Settings');
        expect(markup).toContain('Reference Tray');
    });
});
