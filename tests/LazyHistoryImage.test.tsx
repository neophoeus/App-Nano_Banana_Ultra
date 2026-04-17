/** @vitest-environment jsdom */

import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import LazyHistoryImage from '../components/LazyHistoryImage';

type ObserverEntry = {
    isIntersecting: boolean;
    intersectionRatio: number;
    target: Element;
};

class MockIntersectionObserver {
    static instances: MockIntersectionObserver[] = [];

    private callback: (entries: ObserverEntry[]) => void;
    private target: Element | null = null;

    constructor(callback: (entries: ObserverEntry[]) => void) {
        this.callback = callback;
        MockIntersectionObserver.instances.push(this);
    }

    observe(target: Element) {
        this.target = target;
    }

    disconnect() {
        this.target = null;
    }

    unobserve() {
        this.target = null;
    }

    emit(isIntersecting: boolean) {
        if (!this.target) {
            return;
        }

        this.callback([
            {
                isIntersecting,
                intersectionRatio: isIntersecting ? 1 : 0,
                target: this.target,
            },
        ]);
    }
}

describe('LazyHistoryImage', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        MockIntersectionObserver.instances = [];
        (window as typeof window & { IntersectionObserver: typeof MockIntersectionObserver }).IntersectionObserver =
            MockIntersectionObserver as unknown as typeof IntersectionObserver;
    });

    afterEach(() => {
        root.unmount();
        container.remove();
        delete (window as typeof window & { IntersectionObserver?: typeof MockIntersectionObserver })
            .IntersectionObserver;
    });

    it('mounts image media only when intersecting and releases it when the card leaves the viewport', () => {
        flushSync(() => {
            root.render(
                <LazyHistoryImage
                    src="https://example.com/image.png"
                    alt="Generated image"
                    dataTestId="lazy-history-image"
                    placeholderTestId="lazy-history-placeholder"
                    wrapperClassName="h-24 w-24"
                    className="h-full w-full object-cover"
                    placeholderClassName="h-full w-full bg-gray-100"
                />,
            );
        });

        expect(container.querySelector('[data-testid="lazy-history-image"]')).toBeNull();
        expect(container.querySelector('[data-testid="lazy-history-placeholder"]')).not.toBeNull();

        flushSync(() => {
            MockIntersectionObserver.instances[0].emit(true);
        });

        expect(container.querySelector('[data-testid="lazy-history-image"]')).not.toBeNull();
        expect(container.querySelector('[data-testid="lazy-history-placeholder"]')).toBeNull();

        flushSync(() => {
            MockIntersectionObserver.instances[0].emit(false);
        });

        expect(container.querySelector('[data-testid="lazy-history-image"]')).toBeNull();
        expect(container.querySelector('[data-testid="lazy-history-placeholder"]')).not.toBeNull();
    });
});
