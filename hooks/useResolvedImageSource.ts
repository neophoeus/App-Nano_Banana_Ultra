import { useEffect, useState } from 'react';
import {
    BROWSER_SAVED_IMAGE_PATH_PREFIX,
    resolveDisplayImageSource,
    resolveDisplayImageSourceAsync,
} from '../utils/browserImageStore';

export function useResolvedImageSource(source: string | null | undefined): string {
    const [resolvedSrc, setResolvedSrc] = useState<string>(() => resolveDisplayImageSource(source));

    useEffect(() => {
        if (!source) {
            setResolvedSrc('');
            return;
        }

        const immediate = resolveDisplayImageSource(source);
        setResolvedSrc(immediate);

        const isVirtual =
            source.startsWith(BROWSER_SAVED_IMAGE_PATH_PREFIX) ||
            source.startsWith('browser-img://') ||
            source.includes('filename=');

        if (isVirtual && !immediate.startsWith('data:') && !immediate.startsWith('blob:')) {
            let active = true;
            resolveDisplayImageSourceAsync(source)
                .then((asyncResolved) => {
                    if (active && asyncResolved && asyncResolved !== source) {
                        setResolvedSrc(asyncResolved);
                    }
                })
                .catch(() => {});

            return () => {
                active = false;
            };
        }
    }, [source]);

    return resolvedSrc || source || '';
}
