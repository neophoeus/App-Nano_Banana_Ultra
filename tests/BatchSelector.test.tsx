import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import BatchSelector from '../components/BatchSelector';
import { getTranslation } from '../utils/translations';

describe('BatchSelector', () => {
    it('renders quantity options 1 through 4 including 3', () => {
        const markup = renderToStaticMarkup(
            <BatchSelector batchSize={3} onSelect={vi.fn()} currentLanguage="en" label="" />,
        );

        expect(markup).toContain(getTranslation('en', 'batchSize'));
        expect(markup).toContain(getTranslation('en', 'qtyX').replace('{0}', '3'));
        expect(markup).toMatch(/>1<|>1<div/);
        expect(markup).toMatch(/>2<|>2<div/);
        expect(markup).toMatch(/>3<|>3<div/);
        expect(markup).toMatch(/>4<|>4<div/);
    });
});