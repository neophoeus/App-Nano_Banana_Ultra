import { describe, expect, it } from 'vitest';
import { WorkspacePersistenceSnapshot } from '../types';
import { EMPTY_WORKSPACE_SNAPSHOT } from '../utils/workspacePersistence';
import {
    buildWorkspaceSnapshotMigrationFingerprint,
    getLegacyWorkspaceMigrationCandidateOrigins,
    hasRestorableWorkspaceContent,
    planLegacyWorkspaceMigration,
} from '../utils/legacyWorkspaceSnapshotMigration';

const buildSnapshot = (overrides: Partial<WorkspacePersistenceSnapshot> = {}): WorkspacePersistenceSnapshot => ({
    ...EMPTY_WORKSPACE_SNAPSHOT,
    ...overrides,
});

describe('legacyWorkspaceSnapshotMigration', () => {
    it('returns the other known Nano Banana origins for the current host', () => {
        const origins = getLegacyWorkspaceMigrationCandidateOrigins({
            origin: 'http://127.0.0.1:22287',
            protocol: 'http:',
            hostname: '127.0.0.1',
            port: '22287',
        });

        expect(origins).toContain('http://127.0.0.1:4173');
        expect(origins).toContain('http://127.0.0.1:22301');
        expect(origins).not.toContain('http://127.0.0.1:22287');
    });

    it('detects whether a snapshot actually contains restorable workspace state', () => {
        expect(hasRestorableWorkspaceContent(EMPTY_WORKSPACE_SNAPSHOT)).toBe(false);
        expect(
            hasRestorableWorkspaceContent(
                buildSnapshot({
                    history: [
                        {
                            id: 'turn-1',
                            url: 'https://example.com/turn-1.png',
                            prompt: 'Restore me',
                            aspectRatio: '1:1',
                            size: '2K',
                            style: 'None',
                            model: 'gemini-3.1-flash-image-preview',
                            createdAt: 1,
                        },
                    ],
                }),
            ),
        ).toBe(true);
    });

    it('plans a direct apply when the current origin is effectively empty', () => {
        const importedSnapshot = buildSnapshot({
            history: [
                {
                    id: 'legacy-turn',
                    url: 'https://example.com/legacy.png',
                    prompt: 'Legacy turn',
                    aspectRatio: '1:1',
                    size: '2K',
                    style: 'None',
                    model: 'gemini-3.1-flash-image-preview',
                    createdAt: 10,
                },
            ],
        });
        const fingerprint = buildWorkspaceSnapshotMigrationFingerprint(importedSnapshot);
        const plan = planLegacyWorkspaceMigration({
            currentSnapshot: EMPTY_WORKSPACE_SNAPSHOT,
            candidates: [
                {
                    origin: 'http://127.0.0.1:4173',
                    sourceLabel: 'http://127.0.0.1:4173',
                    snapshot: importedSnapshot,
                    fingerprint,
                } as any,
            ],
        });

        expect(plan.mode).toBe('apply');
        expect(plan.mode === 'none' ? null : plan.snapshot.history).toHaveLength(1);
    });

    it('plans a merge when the current origin already has workspace state', () => {
        const currentSnapshot = buildSnapshot({
            history: [
                {
                    id: 'current-turn',
                    url: 'https://example.com/current.png',
                    prompt: 'Current turn',
                    aspectRatio: '1:1',
                    size: '2K',
                    style: 'None',
                    model: 'gemini-3.1-flash-image-preview',
                    createdAt: 20,
                },
            ],
        });
        const importedSnapshot = buildSnapshot({
            history: [
                {
                    id: 'legacy-turn',
                    url: 'https://example.com/legacy.png',
                    prompt: 'Legacy turn',
                    aspectRatio: '1:1',
                    size: '2K',
                    style: 'None',
                    model: 'gemini-3.1-flash-image-preview',
                    createdAt: 10,
                },
            ],
        });
        const fingerprint = buildWorkspaceSnapshotMigrationFingerprint(importedSnapshot);
        const plan = planLegacyWorkspaceMigration({
            currentSnapshot,
            candidates: [
                {
                    origin: 'http://127.0.0.1:4173',
                    snapshot: importedSnapshot,
                    fingerprint,
                },
            ],
        });

        expect(plan.mode).toBe('merge');
        expect(plan.mode === 'none' ? 0 : plan.mergedSnapshot.history).toHaveLength(2);
    });

    it('skips candidates that were already migrated with the same fingerprint', () => {
        const importedSnapshot = buildSnapshot({
            history: [
                {
                    id: 'legacy-turn',
                    url: 'https://example.com/legacy.png',
                    prompt: 'Legacy turn',
                    aspectRatio: '1:1',
                    size: '2K',
                    style: 'None',
                    model: 'gemini-3.1-flash-image-preview',
                    createdAt: 10,
                },
            ],
        });
        const fingerprint = buildWorkspaceSnapshotMigrationFingerprint(importedSnapshot);
        const plan = planLegacyWorkspaceMigration({
            currentSnapshot: EMPTY_WORKSPACE_SNAPSHOT,
            candidates: [
                {
                    origin: 'http://127.0.0.1:4173',
                    snapshot: importedSnapshot,
                    fingerprint,
                },
            ],
            migrationState: {
                fingerprintsByOrigin: {
                    'http://127.0.0.1:4173': fingerprint,
                },
            },
        });

        expect(plan.mode).toBe('none');
    });
});
