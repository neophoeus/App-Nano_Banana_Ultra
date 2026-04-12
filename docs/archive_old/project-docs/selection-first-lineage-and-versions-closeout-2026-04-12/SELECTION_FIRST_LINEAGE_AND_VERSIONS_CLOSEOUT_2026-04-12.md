# Nano Banana Ultra Selection-First Lineage and Versions Closeout

Date: 2026-04-12
Scope: product model shift, implementation closeout, validation, and release-note handoff

## Why This Closeout Exists

This session changed a core continuity model in Nano Banana Ultra.

The earlier workspace still exposed too much of the older route-driven split between viewing, opening, continuing, and branching. The approved direction for this pass was to make source ownership selection-first: the user should define the next working source by selecting a successful history item, while the product resolves whether that selection means continuation or branching.

This closeout archives the final model, the implementation surfaces that changed, and the validation and documentation handoff completed in the same pass.

## Final Product Model

- Selecting a successful history turn now immediately defines the next working source.
- Selecting the latest turn on a branch now behaves as continuation from that branch.
- Selecting an older turn now starts a new branch automatically.
- The composer now exposes one stateful primary action instead of asking the user to interpret a parallel `Generate` plus visible `Follow-up Edit` pair.
- When no image is staged, fresh generate remains the main action.
- When an image is staged, `Continue with this image` becomes the main action and fresh generate becomes a smaller secondary fallback.
- The stage no longer duplicates continuation intent through extra branch/continue controls.
- Versions now communicates the current state through selection and badges instead of the older owner-route action shell.

## User-Visible Changes

### History and Source Ownership

- History selection now owns the next source directly.
- Restore and import-review flows now follow the same selection-first source rules as the live workspace.
- The user no longer needs to think in terms of a passive open-versus-continue split before the next send.

### Composer and Stage

- The primary composer action is now stateful and follows stage state.
- A staged image promotes `Continue with this image` to the main call to action.
- Fresh generate remains available, but only as the secondary fallback when continuation is possible.
- The stage surface was simplified by removing the extra continuation and branching action row plus the older divergence signal.

### Versions

- Versions now emphasizes branch identity, current source, and viewing state through badges on lineage cards.
- The active branch area no longer depends on the older open/continue action row.
- Branch rename remains available, but the model is now selection-first rather than route-first.

### Wording

- English and Traditional Chinese wording was aligned to the simplified model.
- The wording pass covered stage-source phrasing, continue-with-image phrasing, grounding-result wording, and the active/viewing badge language.

## Implementation Surfaces

The closeout touched the following implementation areas:

- `hooks/useHistorySourceOrchestration.ts` — selection-first source promotion and automatic continue-versus-branch resolution.
- `App.tsx` — wiring the revised history orchestration and stage-source data into the workspace shell.
- `components/ComposerSettingsPanel.tsx` — stateful primary CTA and smaller secondary fresh-generate fallback.
- `components/WorkspaceVersionsDetailPanel.tsx` — badge-first lineage presentation and stable branch-scoped test targeting.
- `hooks/useWorkspaceStageViewer.ts` — stage top-right simplification and removal of explicit continue/branch controls.
- `hooks/useHistoryPresentationHelpers.tsx` — badge and selected-item summary updates aligned to the new mental model.
- `utils/translations/en.ts` and `utils/translations/zh_TW.ts` — product-facing wording updates.
- `components/SelectedItemActionBar.tsx` and related types/tests — removed as dead path after the new model made the old action row obsolete.
- `e2e/workspace-restore.spec.ts` — restore coverage migrated away from the removed owner-route selectors and old reopen assumptions.

## Cleanup and Validation

- Focused Vitest coverage for the affected surfaces was rerun during the pass and passed.
- The restore Playwright file was updated to assert the selection-first flow instead of the removed open/continue controls.
- The full `e2e/workspace-restore.spec.ts` run passed with 63 tests after the final restore-alignment fixes.
- Follow-through cleanup removed the dead `SelectedItemActionBar` path from source, types, and tests so the workspace no longer carries a stale action model alongside the new one.

## Documentation Handoff

- Repo memory record: `/memories/repo/nano-banana-selection-first-lineage-and-versions-2026-04-12.md`
- Product-facing release note: `CHANGELOG.md` under `v3.5.0`
- Historical archive folder: `docs/archive_old/project-docs/selection-first-lineage-and-versions-closeout-2026-04-12/`

Use this archive when you need to reconstruct why the product moved from route-first continuity affordances to selection-first source ownership, or when future regressions touch History, Versions, restore behavior, or staged-image continuation.