import { normalizeGenerationModeKind } from './generationMode';

const MODEL_PREFIX_FALLBACK = 'generated-image';

const sanitizeCompactId = (value: string): string => {
    const compact = value.replace(/[^a-z0-9]/gi, '').toLowerCase();
    return compact.slice(0, 8) || '00000000';
};

const slugifyMode = (mode?: string | null): string => {
    const normalized = mode?.trim().toLowerCase() || '';
    const compactSlug = normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    return compactSlug || 'image';
};

const pad2 = (n: number) => String(n).padStart(2, '0');

export const formatLocalTimestamp = (value: Date): string => {
    const year = value.getFullYear();
    const month = pad2(value.getMonth() + 1);
    const day = pad2(value.getDate());
    const hours = pad2(value.getHours());
    const minutes = pad2(value.getMinutes());
    const seconds = pad2(value.getSeconds());
    return `${year}${month}${day}-${hours}${minutes}${seconds}`;
};

export const formatUtcTimestamp = formatLocalTimestamp;

export const normalizeSavedImageModelId = (model: string): string => {
    const normalized = model.trim().replace(/^models\//, '');
    return normalized || MODEL_PREFIX_FALLBACK;
};

export const getSavedImageWorkflowSlug = (mode?: string | null): string => {
    switch (normalizeGenerationModeKind(mode)) {
        case 'text-to-image':
            return 'txt2img';
        case 'reference-image-generation':
            return 'ref2img';
        case 'follow-up-edit':
            return 'followup';
        case 'editor-edit':
            return 'editor-edit';
        case 'retouch':
            return 'editor-retouch';
        case 'reframe':
            return 'editor-reframe';
        case 'revolve':
            return 'editor-revolve';
        default:
            return slugifyMode(mode);
    }
};

type BuildSavedImageFilenameStemArgs = {
    model: string;
    mode?: string | null;
    slotIndex?: number;
    createdAt?: Date;
    requestId?: string;
};

export const buildSavedImageFilenameStem = ({
    model,
    mode,
    slotIndex = 0,
    createdAt = new Date(),
    requestId = crypto.randomUUID(),
}: BuildSavedImageFilenameStemArgs): string => {
    const normalizedModelId = normalizeSavedImageModelId(model);
    const timestamp = formatUtcTimestamp(createdAt);
    const slotNumber = String(slotIndex + 1).padStart(2, '0');
    const shortId = sanitizeCompactId(requestId);
    const workflowSlug = getSavedImageWorkflowSlug(mode);

    return `${normalizedModelId}_${timestamp}_${slotNumber}-${shortId}_${workflowSlug}`;
};

type BuildResultPartFilenameStemArgs = BuildSavedImageFilenameStemArgs & {
    sequence: number;
    sourceSavedFilename?: string;
};

export const buildResultPartFilenameStem = ({
    model,
    mode,
    slotIndex = 0,
    createdAt,
    requestId,
    sequence,
    sourceSavedFilename,
}: BuildResultPartFilenameStemArgs): string => {
    const baseStem = sourceSavedFilename
        ? sourceSavedFilename.replace(/\.[^.]+$/, '')
        : buildSavedImageFilenameStem({
              model,
              mode,
              slotIndex,
              createdAt,
              requestId,
          });

    return `${baseStem}-part-${String(sequence).padStart(2, '0')}`;
};
