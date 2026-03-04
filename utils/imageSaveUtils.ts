/**
 * Utility for saving images to local filesystem via Vite server plugin
 * and generating thumbnails for lightweight history display.
 */

const THUMBNAIL_MAX_DIM = 300; // Max width or height for history thumbnails

/**
 * Save a full-resolution image to the local filesystem via the server endpoint.
 * Optionally saves a JSON sidecar with generation metadata.
 * @returns The saved file path on success, or null on failure.
 */
export async function saveImageToLocal(
    dataUrl: string,
    prefix: string = 'gemini',
    metadata?: Record<string, unknown>
): Promise<string | null> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const ext = dataUrl.startsWith('data:image/png') ? 'png'
        : dataUrl.startsWith('data:image/jpeg') ? 'jpg'
            : dataUrl.startsWith('data:image/webp') ? 'webp'
                : 'png';
    const filename = `${prefix}_${timestamp}_${crypto.randomUUID().slice(0, 8)}.${ext}`;

    try {
        const res = await fetch('/api/save-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: dataUrl, filename, metadata }),
        });
        const result = await res.json();
        if (result.success) {
            return result.path;
        }
        console.error('Server save failed:', result.error);
        return null;
    } catch (err) {
        console.error('Failed to save image to local:', err);
        return null;
    }
}

/**
 * Generate a small thumbnail from a full-resolution data URL.
 * Returns a compressed JPEG data URL suitable for in-memory history.
 */
export const generateThumbnail = (dataUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_DIM = 200; // Lowered from 300 to 200 to save memory in history state

            let w = img.width;
            let h = img.height;
            if (w > h) {
                if (w > MAX_DIM) {
                    h = Math.round((h *= MAX_DIM / w));
                    w = MAX_DIM;
                }
            } else {
                if (h > MAX_DIM) {
                    w = Math.round((w *= MAX_DIM / h));
                    h = MAX_DIM;
                }
            }

            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, w, h);
                // Lower quality to 0.5 to drastically reduce base64 size for local storage cache
                resolve(canvas.toDataURL('image/jpeg', 0.5));
            } else {
                resolve(dataUrl);
            }
        };
        img.onerror = () => {
            reject(new Error("Failed to generate thumbnail"));
        };
        img.src = dataUrl;
    });
};
/**
 * Fetch a full-resolution image from the local filesystem via the server endpoint.
 * Returns a base64 data URL.
 */
export async function loadFullImage(filename: string): Promise<string | null> {
    try {
        const res = await fetch(`/api/load-image?filename=${encodeURIComponent(filename)}`);
        if (!res.ok) throw new Error(`Server returned ${res.status}`);

        const blob = await res.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch (err) {
        console.error('Failed to load full image:', err);
        return null;
    }
}
