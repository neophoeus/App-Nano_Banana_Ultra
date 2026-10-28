import React, { useEffect, useRef, useState } from 'react';
import { buildSavedImageLoadUrl } from '../utils/imageSaveUtils';

type LazyHistoryImageProps = {
    src: string;
    savedFilename?: string;
    alt: string;
    className?: string;
    wrapperClassName?: string;
    placeholderClassName?: string;
    rootMargin?: string;
    dataTestId?: string;
    placeholderTestId?: string;
};

function LazyHistoryImage({
    src,
    savedFilename,
    alt,
    className,
    wrapperClassName,
    placeholderClassName,
    rootMargin = '120px',
    dataTestId,
    placeholderTestId,
}: LazyHistoryImageProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [isVisible, setIsVisible] = useState(() => {
        if (typeof window === 'undefined') {
            return true;
        }

        return typeof window.IntersectionObserver === 'undefined';
    });

    const displaySrc = src || (savedFilename ? buildSavedImageLoadUrl(savedFilename) : '');

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.IntersectionObserver === 'undefined') {
            setIsVisible(true);
            return;
        }

        const node = containerRef.current;
        if (!node) {
            return;
        }

        const observer = new window.IntersectionObserver(
            ([entry]) => {
                setIsVisible(entry.isIntersecting || entry.intersectionRatio > 0);
            },
            { rootMargin, threshold: 0.01 },
        );

        observer.observe(node);

        return () => {
            observer.disconnect();
        };
    }, [rootMargin]);

    return (
        <div ref={containerRef} className={wrapperClassName}>
            {isVisible && displaySrc ? (
                <img
                    src={displaySrc || undefined}
                    alt={alt}
                    className={className}
                    data-testid={dataTestId}
                    loading="lazy"
                    decoding="async"
                />
            ) : (
                <div aria-hidden="true" data-testid={placeholderTestId} className={placeholderClassName} />
            )}
        </div>
    );
}

export default React.memo(LazyHistoryImage);
