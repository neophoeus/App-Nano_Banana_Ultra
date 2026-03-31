const INLINE_IMAGE_DATA_URL_PATTERN = /data:(image\/[\w.+-]+);base64,([A-Za-z0-9+/=]+)/gi;
const OPAQUE_PAYLOAD_PATTERN = /^[A-Za-z0-9+/_=-]+$/;
const OPAQUE_PAYLOAD_MIN_LENGTH = 256;
const MAX_SANITIZE_DEPTH = 6;

const estimateBytesFromBase64Length = (base64Length: number) => Math.max(0, Math.floor((base64Length * 3) / 4));

const formatByteSize = (bytes: number): string => {
    if (bytes >= 1024 * 1024) {
        const megabytes = bytes / (1024 * 1024);
        return `${megabytes >= 10 ? megabytes.toFixed(0) : megabytes.toFixed(1)} MB`;
    }

    if (bytes >= 1024) {
        return `${Math.round(bytes / 1024)} KB`;
    }

    return `${bytes} B`;
};

const buildInlineImageSummary = (mimeType: string, base64Data: string): string =>
    `[inline image data omitted: ${mimeType}, ${formatByteSize(estimateBytesFromBase64Length(base64Data.length))}]`;

const estimateOpaquePayloadBytes = (value: string): number => {
    const trimmedValue = value.trim();
    if (OPAQUE_PAYLOAD_PATTERN.test(trimmedValue)) {
        return estimateBytesFromBase64Length(trimmedValue.replace(/=+$/u, '').length);
    }

    return trimmedValue.length;
};

export const buildOmittedPayloadSummary = (label: string, value: string): string =>
    `[${label} omitted: ${formatByteSize(estimateOpaquePayloadBytes(value))}]`;

export const isOpaquePayloadString = (value: string): boolean => {
    const trimmedValue = value.trim();
    return trimmedValue.length >= OPAQUE_PAYLOAD_MIN_LENGTH && OPAQUE_PAYLOAD_PATTERN.test(trimmedValue);
};

export const sanitizeInlineImageDataInText = (value: string): string =>
    value.replace(INLINE_IMAGE_DATA_URL_PATTERN, (_match, mimeType: string, base64Data: string) =>
        buildInlineImageSummary(mimeType, base64Data),
    );

export const sanitizeOpaquePayloadText = (value: string, label = 'opaque payload'): string =>
    isOpaquePayloadString(value) ? buildOmittedPayloadSummary(label, value) : value;

export const sanitizeSensitiveDisplayText = (value: string, label = 'opaque payload'): string =>
    sanitizeOpaquePayloadText(sanitizeInlineImageDataInText(value), label);

export const sanitizeThoughtSignatureForStorage = (value: unknown): string | null => {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmedValue = value.trim();
    if (!trimmedValue || isOpaquePayloadString(trimmedValue)) {
        return null;
    }

    return trimmedValue;
};

export const sanitizeSessionHintsForStorage = (
    value: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return null;
    }

    const nextValue: Record<string, unknown> = { ...value };
    if (Object.prototype.hasOwnProperty.call(nextValue, 'thoughtSignature')) {
        const sanitizedThoughtSignature = sanitizeThoughtSignatureForStorage(nextValue.thoughtSignature);
        if (sanitizedThoughtSignature) {
            nextValue.thoughtSignature = sanitizedThoughtSignature;
        } else {
            delete nextValue.thoughtSignature;
        }
    }

    return Object.keys(nextValue).length > 0 ? nextValue : null;
};

export const sanitizeInlineImageDisplayValue = (
    value: unknown,
    depth = 0,
    seen = new WeakSet<object>(),
): unknown => {
    if (typeof value === 'string') {
        return sanitizeSensitiveDisplayText(value);
    }

    if (Array.isArray(value)) {
        if (depth >= MAX_SANITIZE_DEPTH) {
            return `[array:${value.length}]`;
        }

        return value.map((entry) => sanitizeInlineImageDisplayValue(entry, depth + 1, seen));
    }

    if (!value || typeof value !== 'object') {
        return value;
    }

    if (seen.has(value)) {
        return '[circular]';
    }

    if (depth >= MAX_SANITIZE_DEPTH) {
        return '[object]';
    }

    seen.add(value);

    return Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [key, sanitizeInlineImageDisplayValue(entry, depth + 1, seen)]),
    );
};