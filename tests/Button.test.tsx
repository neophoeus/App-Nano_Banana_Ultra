import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import Button from '../components/Button';

describe('Button', () => {
    it('does not force the default primary radius when the caller provides an explicit rounded class', () => {
        const markup = renderToStaticMarkup(
            <Button className="rounded-[28px] btn-shimmer min-h-[64px] text-[15px]">Generate</Button>,
        );

        expect(markup).toContain('rounded-[28px]');
        expect(markup).not.toContain('rounded-lg');
        expect(markup).not.toContain('overflow-hidden');
    });

    it('keeps the secondary surface styling while allowing an explicit radius override', () => {
        const markup = renderToStaticMarkup(
            <Button variant="secondary" className="rounded-[28px] min-h-[64px] px-3.5 text-left">
                Follow-up Edit
            </Button>,
        );

        expect(markup).toContain('nbu-control-button-surface');
        expect(markup).toContain('rounded-[28px]');
        expect(markup).not.toContain('rounded-full');
        expect(markup).not.toContain('rounded-lg');
    });
});