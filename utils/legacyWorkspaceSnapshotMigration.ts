import { WorkspacePersistenceSnapshot } from '../types';
import {
    EMPTY_WORKSPACE_SNAPSHOT,
    WORKSPACE_SNAPSHOT_STORAGE_KEY,
    mergeWorkspaceSnapshots,
    parseWorkspaceSnapshotDocument,
    sanitizeWorkspaceSnapshot,
} from './workspacePersistence';
import { hasRestorableWorkspaceContent } from './workspaceSnapshotState';

export const LEGACY_WORKSPACE_MIGRATION_STATE_KEY = 'nbu_legacyWorkspaceMigrationState';
export const LEGACY_WORKSPACE_SNAPSHOT_REQUEST = 'nbu-request-workspace-snapshot';
export const LEGACY_WORKSPACE_SNAPSHOT_RESPONSE = 'nbu-workspace-snapshot-response';
export const KNOWN_WORKSPACE_MIGRATION_PORTS = ['4173', '22287', '22301'] as const;

export type LegacyWorkspaceSnapshotCandidate = {
    origin: string;
    snapshot: WorkspacePersistenceSnapshot;
    fingerprint: string;
};

export type LegacyWorkspaceMigrationState = {
    fingerprintsByOrigin: Record<string, string>;
};

export type LegacyWorkspaceMigrationPlan =
    | { mode: 'none' }
    | {
          mode: 'apply' | 'merge';
          sourceOrigin: string;
          sourceLabel: string;
          snapshot: WorkspacePersistenceSnapshot;
          fingerprint: string;
          mergedSnapshot: WorkspacePersistenceSnapshot;
      };

type LocationLike = Pick<Location, 'origin' | 'protocol' | 'hostname' | 'port'>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const getSnapshotRecency = (snapshot: WorkspacePersistenceSnapshot): number => {
    const historyRecency = snapshot.history.reduce((latest, item) => Math.max(latest, item.createdAt || 0), 0);
    const queuedJobRecency = snapshot.queuedJobs.reduce((latest, item) => Math.max(latest, item.updatedAt || 0), 0);
    return Math.max(historyRecency, queuedJobRecency, snapshot.workspaceSession.updatedAt || 0);
};

export { hasRestorableWorkspaceContent };

export const isWorkspaceSnapshotEffectivelyEmpty = (snapshot: WorkspacePersistenceSnapshot): boolean =>
    !hasRestorableWorkspaceContent(snapshot);

export const buildWorkspaceSnapshotMigrationFingerprint = (snapshot: WorkspacePersistenceSnapshot): string => {
    const normalized = sanitizeWorkspaceSnapshot(snapshot);
    return JSON.stringify({
        history: normalized.history
            .map((item) => [item.id, item.createdAt, item.status || 'unknown', item.savedFilename || ''])
            .slice(0, 4),
        historyCount: normalized.history.length,
        stagedAssetCount: normalized.stagedAssets.length,
        workflowLogCount: normalized.workflowLogs.length,
        queuedJobCount: normalized.queuedJobs.length,
        selectedHistoryId: normalized.viewState.selectedHistoryId,
        generatedImageCount: normalized.viewState.generatedImageUrls.length,
        prompt: normalized.composerState.prompt,
        updatedAt: normalized.workspaceSession.updatedAt,
        recency: getSnapshotRecency(normalized),
    });
};

export const getLegacyWorkspaceMigrationCandidateOrigins = (locationLike: LocationLike): string[] => {
    const ports = new Set<string>(KNOWN_WORKSPACE_MIGRATION_PORTS);
    if (locationLike.port) {
        ports.add(locationLike.port);
    }

    return Array.from(ports)
        .filter((port) => port && port !== locationLike.port)
        .map((port) => `${locationLike.protocol}//${locationLike.hostname}:${port}`)
        .filter((origin) => origin !== locationLike.origin);
};

export const loadLegacyWorkspaceMigrationState = (): LegacyWorkspaceMigrationState => {
    const raw = localStorage.getItem(LEGACY_WORKSPACE_MIGRATION_STATE_KEY);
    if (!raw) {
        return { fingerprintsByOrigin: {} };
    }

    try {
        const parsed = JSON.parse(raw);
        if (!isRecord(parsed) || !isRecord(parsed.fingerprintsByOrigin)) {
            return { fingerprintsByOrigin: {} };
        }

        return {
            fingerprintsByOrigin: Object.fromEntries(
                Object.entries(parsed.fingerprintsByOrigin).filter(
                    (entry): entry is [string, string] => typeof entry[0] === 'string' && typeof entry[1] === 'string',
                ),
            ),
        };
    } catch {
        return { fingerprintsByOrigin: {} };
    }
};

export const saveLegacyWorkspaceMigrationState = (state: LegacyWorkspaceMigrationState): void => {
    localStorage.setItem(LEGACY_WORKSPACE_MIGRATION_STATE_KEY, JSON.stringify(state));
};

export const rememberLegacyWorkspaceMigration = (
    origin: string,
    fingerprint: string,
): LegacyWorkspaceMigrationState => {
    const current = loadLegacyWorkspaceMigrationState();
    const next = {
        fingerprintsByOrigin: {
            ...current.fingerprintsByOrigin,
            [origin]: fingerprint,
        },
    };
    saveLegacyWorkspaceMigrationState(next);
    return next;
};

export const parseLegacyWorkspaceSnapshotPayload = (raw: string | null): WorkspacePersistenceSnapshot | null => {
    if (!raw) {
        return null;
    }

    const parsedDocument = parseWorkspaceSnapshotDocument(raw);
    if (parsedDocument) {
        return parsedDocument;
    }

    try {
        return sanitizeWorkspaceSnapshot(JSON.parse(raw));
    } catch {
        return null;
    }
};

export const readLocalWorkspaceSnapshotPayload = (): string | null =>
    localStorage.getItem(WORKSPACE_SNAPSHOT_STORAGE_KEY);

const compareCandidates = (left: LegacyWorkspaceSnapshotCandidate, right: LegacyWorkspaceSnapshotCandidate): number => {
    const leftSnapshot = sanitizeWorkspaceSnapshot(left.snapshot);
    const rightSnapshot = sanitizeWorkspaceSnapshot(right.snapshot);

    if (leftSnapshot.history.length !== rightSnapshot.history.length) {
        return rightSnapshot.history.length - leftSnapshot.history.length;
    }

    if (leftSnapshot.stagedAssets.length !== rightSnapshot.stagedAssets.length) {
        return rightSnapshot.stagedAssets.length - leftSnapshot.stagedAssets.length;
    }

    if (leftSnapshot.queuedJobs.length !== rightSnapshot.queuedJobs.length) {
        return rightSnapshot.queuedJobs.length - leftSnapshot.queuedJobs.length;
    }

    return getSnapshotRecency(rightSnapshot) - getSnapshotRecency(leftSnapshot);
};

export const planLegacyWorkspaceMigration = ({
    currentSnapshot,
    candidates,
    migrationState,
}: {
    currentSnapshot: WorkspacePersistenceSnapshot;
    candidates: LegacyWorkspaceSnapshotCandidate[];
    migrationState?: LegacyWorkspaceMigrationState;
}): LegacyWorkspaceMigrationPlan => {
    const normalizedCurrent = sanitizeWorkspaceSnapshot(currentSnapshot);
    const normalizedState = migrationState || { fingerprintsByOrigin: {} };

    const eligibleCandidates = candidates
        .map((candidate) => ({
            ...candidate,
            snapshot: sanitizeWorkspaceSnapshot(candidate.snapshot),
            fingerprint: candidate.fingerprint || buildWorkspaceSnapshotMigrationFingerprint(candidate.snapshot),
        }))
        .filter((candidate) => hasRestorableWorkspaceContent(candidate.snapshot))
        .filter((candidate) => normalizedState.fingerprintsByOrigin[candidate.origin] !== candidate.fingerprint)
        .sort(compareCandidates);

    const selectedCandidate = eligibleCandidates[0];
    if (!selectedCandidate) {
        return { mode: 'none' };
    }

    const mode = isWorkspaceSnapshotEffectivelyEmpty(normalizedCurrent) ? 'apply' : 'merge';
    return {
        mode,
        sourceOrigin: selectedCandidate.origin,
        sourceLabel: selectedCandidate.origin,
        snapshot: selectedCandidate.snapshot,
        fingerprint: selectedCandidate.fingerprint,
        mergedSnapshot:
            mode === 'apply'
                ? selectedCandidate.snapshot
                : mergeWorkspaceSnapshots(normalizedCurrent, selectedCandidate.snapshot),
    };
};

export const createEmptyLegacyWorkspaceMigrationPlan = (): LegacyWorkspaceMigrationPlan => ({ mode: 'none' });

export const LEGACY_WORKSPACE_EMPTY_SNAPSHOT = EMPTY_WORKSPACE_SNAPSHOT;
