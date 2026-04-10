# Changelog

## v3.4.2 - 2026-04-10

- Release title: Nano Banana Ultra 3.4.2 - Composer Reflow, Instruction / Conversation UX & Smart Overlay Placement
- Release prep summary:
    - composer shell reflow and action ownership regroup:
        - rebuilt the composer around a clearer `top settings row -> Image Tools + prompt -> Next send + Generate -> queue row` structure instead of the older mixed three-column surface, while keeping the style strip visible and preserving mobile stacking
        - kept the prompt helper area inside the prompt card, preserved the visible placeholder quick-tool slot, and made `Follow-up Edit` a permanent peer action beside `Generate` instead of hiding it whenever no stage image is active
        - kept `Image Tools` embedded in the composer ownership path and promoted `References` into a floating card that works on both desktop and mobile instead of staying a purely inline foldout

    - wording, responsive disclosure rules, and composer polish:
        - settled the prompt surface wording on `Instruction / Conversation`, updated the placeholders to distinguish stateless one-turn generate-or-edit instructions from remembered-context conversation edits, and aligned the maintained locales to the new wording
        - changed the quick-tool labels to `Surprise Me` / `Auto Rewrite`, matched `New Conversation` to the destructive red action family, moved the `Next send` and `Queue Batch Job` help cards above their triggers, and then normalized the shared Button radius contract so the larger `Generate` and `Follow-up Edit` corners render as intended instead of being visually sharpened by the shared base and secondary button styling
        - made `Image Tools` and `Advanced settings` collapsible only below `1280px`; desktop now renders both always open with no disclosure affordance, and the advanced summary strip now shows only actually editable controls supported by the active model instead of passive or unsupported chips such as `Return thoughts`
        - moved the desktop `References` floating card to the left side of its trigger so it no longer spills into the outer shell on wide layouts

    - floating references, advanced-settings cleanup, and header-language refinement:
        - re-anchored the floating `References` card so it grows upward instead of pushing below the viewport on narrow layouts, capped it with an internal scroll region, kept the denser five-up grid, and then switched the uploader onto session-scoped preview thumbnails so the card renders lightweight reference previews instead of decoding the original full-resolution uploads on open; the floating card still lazy-mounts those preview cells without changing the visible contract
        - strengthened the collapsed `References` summary so only populated `Objects` / `Characters` counts turn into the active amber emphasis state, making attached-reference totals easier to scan without changing the existing `Label current/max` text contract or summary selectors
        - removed the misleading `Grounding: Off` advanced-summary chip, restored the advanced settings modal to a two-column layout with separate `Output format`, `Thinking level`, and `Temperature` cards, brought back the original circular temperature info icon beside `Default temp = 1.0`, and simplified the grounding runtime copy down to the one actionable title-free `Image Search` 1K limit note
        - restored the top language toggle sizing, trimmed only the dropdown option rows to remove the lingering right-side dead gutter, deleted the short-lived `composerAdvancedTipsButton` locale key across the maintained translations, and aligned the locale/test contracts to the final modal and menu behavior

    - overlay placement hardening for support and response surfaces:
        - extended the shared `InfoTooltip` primitive with opt-in preferred vertical placement plus viewport-aware auto flipping so selected callers can open upward when needed without changing the default behavior of older tooltip surfaces
        - rebuilt `StructuredOutputActions` menu placement to auto-resolve horizontal and vertical direction on open, preventing the `Response` detail and viewer-side structured-output menus from always overflowing down and right near card boundaries

    - regression coverage and validation follow-through:
        - updated the focused composer, side-tool, response-rail, viewer-overlay, and translation Vitest expectations to the new layout and wording contract, and added direct jsdom coverage for `InfoTooltip` and `StructuredOutputActions` auto-placement behavior
        - extended the second-wave regression pass with the corrected language-menu contract, the restored icon-only temperature help, the simplified grounding-note path, and the collapsed References active-count emphasis; later follow-up passes reran the relevant uploader / Button / composer / side-tool / picker Vitest slices, a green `npm run build`, the restore regression slice at `22 / 22`, and the full Playwright suite at `64 / 64`, while the earlier broader validation still included focused diagnostics on touched files, restore Playwright mainline smoke at `6 / 6`, and the targeted Vitest slice at `6 files / 377 tests`

## v3.4.1 - 2026-04-09

- Release title: Nano Banana Ultra 3.4.1 - Prompt Helper Removal, History Rail Regroup & Stage Shell Alignment
- Release prep summary:
    - removed composer-side prompt helper persistence and template/history routes end-to-end by deleting `usePromptHistory`, removing the `Templates` / `History` launcher buttons and picker routes, stripping the related backend prompt-history endpoints and Playwright output isolation file list, and aligning the surviving shared-controls wording across the maintained locales to the smaller `Inspiration, rewrite` contract
    - corrected viewer prompt reuse so `Apply Prompt` now prefers the currently viewed history item's prompt or loaded metadata prompt instead of blindly replaying stale composer/view state when the inspected image changes
    - split `Image Tools` into clearer action ownership with dedicated `Upload Image To Repaint`, `Repaint Current Image`, and `Draw Reference Sketch` entries, wired a direct upload-to-repaint path from the shared side-tool surface, and added an App-level regression that keeps `Repaint Current Image` disabled after clearing the stage while the upload path remains available
    - regrouped unified history and recent-turn presentation by standardizing the surface title to `History`, moving utility actions back into the top-right header row, removing the old footer, enlarging the compact desktop history contract to centered `128px` six-up square thumbnails with tighter spacing, restyling the split left/right pagers into stronger button-plus-chip controls, and fixing the right pager order to `last`, `next`, then total-pages
    - expanded the recent-turn filmstrip into larger responsive mobile/desktop tokens, narrowed the composer three-column desktop widths around the embedded `Image Tools` shell, and preserved prompt text suppression plus preview-slot behavior through the updated history/filmstrip layout tests
    - unlocked the desktop main shell from the earlier viewport-fill chain, let the desktop stage outer shell stretch to the taller `History + Composer` column while keeping the same padded mobile-style shell spacing, restored the desktop inner square to shell-driven expansion, and removed the mobile viewport-height clamp so the mobile stage square also grows with the shell instead of staying artificially small on shorter screens
    - validation follow-through reran the focused history / stage / render-stability slices through the layout passes, then reran the full Vitest suite at `83 files / 714 tests` and `npm run build`

## v3.4.0 - 2026-04-09

- Release title: Nano Banana Ultra 3.4.0 - Support Surface Closeout & Sticky Send Intent
- Release prep summary:
    - finalized the shared support surface around `Progress`, `Response`, and `Sources`; earlier internal `Thoughts` / `Output` / `Evidence` phrasing now resolves to those three user-facing surfaces inside one support detail shell with in-surface tab switching
    - `Progress` now uses the intended middle-version contract: a trimmed top summary, a compact workflow summary block, a latest accumulated-thought snapshot card, and a chronological thought stream; the older workflow timeline list and Progress-owned current-stage-source / continuity cards remain removed
    - `Response` now uses one compact preview line even for structured output while preserving the existing response-rail body, `Sources` keeps labeled source/support count chips plus only distinct provenance metadata rows, and the standalone legacy Thoughts detail component remains absent from the live app
    - sticky send intent is now an explicit persisted composer/workspace field; legacy restores default to `independent`, official conversation replay activates only when intent is `memory`, and restored official-conversation fixtures now carry that intent explicitly instead of inferring it from stale conversation metadata
    - post-closeout Composer send-intent UX follow-through replaced the old split-button surface with one true whole-button `Next send` toggle, tightened the control width and padding, strengthened the active amber treatment for clearer contrast, moved the explanatory copy into a manual `i` info card, auto-opened that card on successful or blocked toggle attempts, kept blocked `Independent -> Memory` clicks on `Quantity != 1` as explanation-only no-ops instead of silent failures, and removed the now-redundant top-header intent chip once the Composer surface was clear enough
    - unified history remains the main owner for versions / import / export utility actions and desktop history density is locked to 6 visible slots; restore/browser coverage was rewritten away from the removed selected-item dock and legacy history-canvas selectors to the current main-shell, stage, versions, and file-backed thumbnail contracts
    - `Clear Workspace` now explicitly clears the shared workspace backup while legacy shared-snapshot migration stays startup-only, preventing stale backup replays from relighting the `Progress` / `Response` / `Sources` support signals after a reset; inactive support signals now use a muted slate off-state instead of the earlier bright white dot
    - finalized the support-family v2 lock by renaming the remaining live `WorkspaceWorkflow*` support components and tests to `WorkspaceProgress*`, keeping deprecated wording only in archived docs
    - validation realigned stale restore Playwright assertions away from the removed Progress-owned current-stage-source / continuity cards and onto surviving owner surfaces and persisted selection cues, then reran the earlier sticky-intent/browser follow-through slice at `3 / 3`, the post-header-dedup focused Vitest pass at `4 files / 24 tests`, the full restore Playwright spec at `62 / 62`, the full `npm run test:e2e` suite at `64 / 64`, and the full Vitest suite at `84 files / 712 tests`

## v3.3.1 - 2026-04-08

- Release title: Nano Banana Ul44tra 3.3.1 - Sidecar Metadata Fidelity, Viewer Expansion & Temperature UX
- Release prep summary:
    - Per-image sidecar metadata contract, save-path enrichment, and thumbnail filename alignment:
        - added a shared `ImageSidecarMetadata` / `SavedImageActualOutput` contract plus sidecar builder and normalizer helpers so interactive generation, queued-batch imports, and plugin save/load flows persist the same richer per-image JSON payload instead of loosely shaped metadata objects
        - expanded output sidecars to record prompt, model, style, aspect ratio, requested size, output format, structured-output mode, temperature, thinking level, thought visibility, grounding flags and mode, execution mode, batch metadata, and actual output dimensions
        - added `/api/load-image-metadata` plus client-side sidecar loading utilities so the app can inspect each image's sibling JSON by saved filename instead of depending on session-only in-memory metadata
        - aligned persisted history thumbnails to the main saved image stem with a `-thumbnail` suffix across normal generation, queued-batch imports, and legacy thumbnail self-heal paths instead of writing unrelated thumbnail names

    - Viewer metadata hydration, provenance fidelity, and sparse-sidecar fallback hardening:
        - moved viewer metadata ownership to strict per-image sidecars with App-level hydration, loading and missing sentinel states, and no silent fallback to live composer/session state when the inspected image has no sidecar
        - expanded the viewer right-rail metadata cards to show ratio, size, style, model, temperature, output format, thinking level, grounding, and return-thoughts state instead of the smaller earlier set
        - hardened sparse or legacy sidecar handling by merging loaded sidecar values with already-known history metadata for the same image, preventing fields such as temperature from disappearing when an older sidecar omits newer keys
        - aligned provenance insight rows to the same sidecar-backed rules for output format, temperature, thinking, grounding, requested size, and actual output so the inspected-history contract stays truthful across viewer and provenance surfaces

    - Temperature UX and localized wording follow-through:
        - added temperature to the prompt-side `Advanced settings` summary chip so the main composer summary now exposes that control alongside output format, thinking, and grounding
        - revised the advanced temperature control copy so the title shows a compact `Default temp = 1.0` note while the guide body now focuses only on the `> 1.0` and `< 1.0` behavior requested in the follow-up pass
        - added the new viewer metadata loading/unavailable strings and the advanced temperature wording across the maintained locales, then aligned focused viewer/composer regressions to the updated text contract

    - Validation and release readiness:
        - updated affected Vitest coverage for sidecar save/load behavior, thumbnail naming, viewer metadata cards, advanced-settings temperature wording, App-side metadata hydration, and the extra `persistHistoryThumbnail(...)` filename argument
        - revalidated the session with the package Vitest run at `80 files / 688 tests`, the focused viewer stack at `3 files / 15 tests`, the focused advanced-settings slice at `2 files / 13 tests`, and `npm run build`

## v3.3.0 - 2026-04-07

- Release title: Nano Banana Ultra 3.3.0 - Unified History Workspace, Restore Hardening & Shell Chrome

- Fixed shell chrome header/footer pass:
    - pinned `WorkspaceTopHeader` to the viewport top and added a matching fixed bottom footer so the main shell now has persistent top-and-bottom chrome instead of a flow-only header with no footer treatment
    - aligned both bars to the existing `1560px` shell width, mirrored the footer geometry against the header with top rounded corners and square bottom corners, and increased App top/bottom content padding so the workspace body no longer scrolls underneath those fixed bars
    - added the footer copy `🍌 NANO BANANA ULTRA • Designed by Neophoeus Art • Powered by Gemini`, wired `Neophoeus Art` to `https://neophoeus.art/`, kept the link visually consistent with the surrounding footer text instead of emphasizing it separately, and updated the shared brand label in both header and footer to uppercase `NANO BANANA ULTRA`
    - expanded validation for the shell chrome with focused `WorkspaceTopHeader` / `WorkspaceBottomFooter` markup coverage plus a Playwright restore assertion that directly checks the header stays fixed at `top: 0` and the footer stays fixed at `bottom: 0` against the live viewport edge
    - revalidated the session with `npm run build`, the package Vitest run at `80 files / 687 tests`, and `npm run test:e2e:restore:shell-owners` at `3 / 3`

- Interactive batch preview, freshness, and unified-history viewer flow:
    - removed the old stage-local batch thumbnail strip for interactive multi-image runs and moved all in-flight batch progress into the right-side unified history rail, where Generate now creates one preview slot per requested result immediately and fills those slots in place as the backend returns each image
    - introduced transient batch preview sessions with per-slot `pending` / `ready` / `failed` state, kept locked-ready previews blurred and darkened until the full batch completes, and merged those preview tiles into the same compact history grid instead of rendering them on a separate row
    - preserved the intended visual contract that newer batch results live on the left and older items stay on the right, including first-page preview-slot reservation inside `WorkspaceUnifiedHistoryPanel` so transient previews and committed history share one consistent ordering model
    - decoupled viewing from generation so selecting older history during an active batch no longer cancels the running generation, while Generate still clears the current stage source immediately and the viewer now traverses completed successful history items instead of the removed stage-local batch strip
    - added freshness lifecycle support for completed successful results through `openedAt`, a persistent green glow around unopened history items, and a viewer-level `New` badge that remains until the user leaves that item; failed turns stay out of freshness treatment and viewer traversal
    - fixed the post-completion selection mismatch by ordering committed interactive-batch history items by descending `batchResultIndex` before prepending them into formal history and before emitting batch-complete callbacks, so preview order, committed history order, and auto-open all land on the same leftmost new card instead of selecting an item that still rendered on the right
    - persisted the freshness/opened state through workspace snapshot sanitation and restore so reload or restore keeps the same unopened/new semantics instead of clearing them prematurely

- Batch preview/history validation follow-through:
    - expanded focused regression coverage for `HistoryPanel`, `WorkspaceUnifiedHistoryPanel`, `WorkspaceViewerOverlay`, `GeneratedImage`, `useWorkspaceStageViewer`, `useHistorySourceOrchestration`, `usePerformGeneration`, and `workspacePersistence`, then reran the focused Vitest slice to `9 files / 67 tests` after the final committed-history ordering fix

- Workspace restore and unified history shell follow-up:
    - replaced the split `RecentHistoryFilmstrip` plus gallery stack with one App-owned `WorkspaceUnifiedHistoryPanel`, so the right desktop rail now keeps selected-item context, history paging, branch summary chips, clear-workspace affordance, and Versions inside a single aligned surface contract instead of mixing separate recent-lane and gallery ownership paths
    - rebuilt `HistoryPanel` so the embedded history surface can run in continuous compact mode, added a lazy-mounted `LazyHistoryImage` media path for history cards, kept mobile at four visible slots, and moved desktop to a true ten-up row with `100px` thumbnails plus auto-distributed horizontal spacing instead of the earlier fixed-gap `96px` contract
    - tightened the desktop shell geometry around a height-driven square stage by switching `GeneratedImage` to an XL height-owned square frame, stretching the left focus block to the combined History plus Versions rail height, shifting the desktop split to `0.6fr / 1.4fr`, and trimming selected-item / unified-history / Versions chrome in a second pass so the square-stage alignment remains intact without giving back thumbnail density

- Workspace clear semantics, thumbnail persistence, and restore hardening:
    - changed the old gallery-clear action into a true workspace reset flow through `useWorkspaceResetActions`, so clearing now resets the workspace snapshot, prompt history, transient modals, settings-session draft state, and sketch/editor transient surfaces instead of only deleting history cards while leaving stale workspace state behind
    - added persisted history-thumbnail ownership through `thumbnailSavedFilename`, `thumbnailInline`, `extractSavedFilename(...)`, and `persistHistoryThumbnail(...)`, so normal generations and queued-batch imports now save dedicated history previews when possible and keep inline thumbnail fallbacks only when persistence is unavailable
    - hardened restore and reopen behavior for legacy file-backed history turns by keeping runtime history cards on placeholders when they only have full-resolution file-backed URLs, reopening the selected stage from the original saved image, and background-repairing missing legacy thumbnails after a reopen when the original file can still be loaded locally
    - aligned workspace persistence, official-conversation tests, queued-batch tests, and restore browser assertions to the new thumbnail contract, including repaired `/api/load-image?...history-thumb...` preview URLs and the no-white-screen late shared-restore path against the unified-history counters

- Validation follow-through:
    - added new focused regression coverage for `WorkspaceUnifiedHistoryPanel`, `LazyHistoryImage`, `useWorkspaceResetActions`, legacy thumbnail repair in `useHistorySourceOrchestration`, file-backed thumbnail persistence in `workspacePersistence`, and the desktop square-stage/history-rail alignment browser case inside `e2e/workspace-restore.spec.ts`
    - revalidated the session through the package Vitest script at `79 files / 683 tests` and reran the full Playwright restore suite to `60 / 60` after the desktop `100px` second-pass density changes

## v3.2.7 - 2026-04-06

- Release title: Nano Banana Ultra 3.2.7 - Queued Batch Recovery, Retry & Cleanup
- Release prep summary:
    - Queued batch import extraction hardening:
        - broadened queued-batch result extraction so the importer now accepts wrapped batch responses, snake_case payload fields such as `inline_data` / `thought_signature`, later-candidate image parts, and wrapped grounding metadata instead of assuming one strict happy-path shape
        - refined queued-batch import diagnostics so backend results now distinguish malformed responses, prompt-level policy block reasons, missing candidates, missing parts, explicit per-entry batch errors, and safety-style finish reasons, while the workspace import flow preserves partial-success imports, logs skipped failed entries, and persists the first concrete import failure summary back onto the queued job instead of only showing a generic no-image notice
        - follow-up reload UX hardening: succeeded jobs that previously landed in `extraction-failure` now remain manually re-importable after workspace restore or reload, and manual `Check status` refreshes always surface a visible status/error notification instead of only updating logs when the remote state has not changed
        - follow-up runtime diagnostics alignment: queued-batch imports now reuse the interactive image path's safety-category interpretation so safety-filtered non-image responses can surface concrete blocked categories such as `sexually explicit` instead of stopping at generic `no image data` / `candidate without content parts` errors when the batch payload includes safety ratings
        - follow-up live-payload diagnostics alignment: text-only batch responses now surface `Model returned text-only content instead of image data.`, and empty `finishReason: NO_IMAGE` candidates now surface `Model finished without producing an image (finish reason: NO_IMAGE).`, matching the real payload shapes returned by the two 2026-04-05 Nano Banana 2 jobs investigated on 2026-04-06
        - added focused regression coverage for `extractGeneratedContent(...)`, `extractBatchImportResults(...)`, `QueuedBatchJobsPanel`, and `useQueuedBatchWorkflow(...)`; local focused Vitest, production build, and queued-batch restore Playwright checks passed, and real runtime batch import verification is still in progress

    - Queued batch recovery and recent-list truthfulness:
        - added a formal recent-job recovery path around `/api/batches/list`, `listQueuedBatchJobs(...)`, and `handleRecoverRecentQueuedJobs(...)` so deleted local queue entries can be restored from recent remote Gemini Batch API jobs instead of being lost once the local tracked list is emptied
        - normalized `ai.batches.list()` model names such as `models/gemini-3.1-flash-image-preview` before image-model filtering, fixing the false `No additional recent remote batch jobs were found.` result that was hiding valid remote jobs from the recovery flow
        - upgraded recovery to hydrate each listed job with `get` details before upserting it locally, because Batch API list summaries alone do not expose enough payload detail to determine truthful import readiness for succeeded image jobs
        - kept the queue modal entry reachable even at `0 tracked`, added `Recover recent batch jobs` actions in both the populated and empty queue states, refreshed already tracked recovered jobs on later recover passes, and changed aggregate `ready to import` / `Import ready results` behavior to exclude jobs already confirmed as `extraction-failure` while still preserving per-job manual `Import` retries
        - manual runtime verification on 2026-04-06 recovered 19 remote jobs into the live queue, surfaced truthful expired / cancelled / no-image outcomes instead of silently dropping them, imported 1 real queued image result, and recorded concrete extraction-failure outcomes such as text-only content, `finish reason: NO_IMAGE`, `candidate without content parts`, and `no image data`

    - Queued batch retry and cleanup UX follow-up:
        - reclassified succeeded queued jobs with `importDiagnostic: extraction-failure` as warning-state retry targets rather than normal green import actions, so the queue panel now shows `Retry import` for previously non-importable payloads while still blocking them from bulk `Import ready results`
        - made `no-payload` results explicitly non-importable in the per-job UI through an `Import unavailable` action state, while preserving the existing inline diagnostic that the batch completed without inline payload
        - added queue-level `Clear non-importable` and `Clear imported` actions that remove local queue tracking in bulk without touching remote batch jobs or already imported history cards, and wired focused workflow notifications/logs so cleanup remains visible and reversible only through future recovery
        - revalidated the follow-up with focused Vitest at `5 files / 46 tests`, `npm run build`, and live browser spot-checking against the recovered 19-job queue on 2026-04-06

## v3.2.6 - 2026-04-04

- Release title: Nano Banana Ultra 3.2.6 - Composer Shell Refinement & Restore Hardening
- Release prep summary:
    - Prompt helper rail follow-up:
        - refined the four prompt helper buttons inside the composer prompt card so desktop now uses compact equal-width icon-and-label rows while mobile keeps the icon-above-label stack, with normalized letter spacing, refreshed helper glyphs, and clearer dark-theme icon-chip contrast
        - restored the helper buttons to the white surface family, shortened the prompt-history surface label from `Saved Prompts` / prompt-history equivalents to `History` across the maintained locales, and removed the trailing `✦` from `AI Enhance`
        - tightened the prompt rail and textarea pairing so the helper rail no longer overlaps the editor, kept the textarea on the subtle local scrollbar treatment for longer prompts, updated the focused composer and translation regressions, reran `npm exec vitest run tests/ComposerSettingsPanel.test.tsx tests/workspaceFlowTranslations.test.tsx`, reran the focused composer slice again through the final dark-mode color tuning, and kept `npm run build` green

    - Summary/action strip wrap follow-up:
        - replaced the horizontal-scroll treatment on the composer `Generation Settings` strip, composer `Advanced settings` strip, `History Summary Strip`, and selected-item action strip with wrap-first token rows so these summary/action surfaces no longer render a bottom scrollbar when their pills exceed the available width
        - kept every `History Summary Strip` chip visible across `wide`, `medium`, and `compact` dock buckets instead of hiding tail metadata, and flattened the selected-item action layout into one wrapping row while preserving the existing overflow-menu density rules for narrower action states
        - updated the focused composer and selected-item regression expectations to assert no local `overflow-x-auto` on those strip surfaces while explicitly leaving true carousel rails such as `RecentHistoryFilmstrip` on horizontal scroll, then revalidated with `npm exec vitest run tests/ComposerSettingsPanel.test.tsx tests/SelectedItemSurfaces.test.tsx tests/RecentHistoryFilmstrip.test.tsx` at `3 files / 19 tests` plus `npm run build`

    - Composer shell and prompt dock restructure:
        - moved `Image Tools` into the composer as the left child card owned by `ComposerSettingsPanel`, keeping the wide layout at `Image Tools | Prompt | Generation` while narrow screens now stack `Image Tools -> Prompt -> Generation`
        - moved the four prompt helper actions into the prompt card beside the textarea, removed the old quick `Styles` button, and kept advanced settings as the strip below the prompt editor
        - changed the style status into an always-visible composer strip that opens the styles sheet even when the current value is `None`, and added an inline clear affordance that appears only for active styles and resets them back to `None`
        - revalidated the restructure with the full Vitest suite at `75 files / 653 tests`, `npm run build`, and `npm run test:e2e:restore:shell-owners` at `3 / 3`

    - Composer spacing and references fold refinement:
        - normalized the composer card-level spacing rhythm to the tighter `1.5` cadence across the embedded `Image Tools`, prompt card, and generation card instead of mixing wider internal gaps
        - changed the `References` card inside `Image Tools` to default-collapsed disclosure behavior, with `References` on the first line and the compact `Objects {current}/{max} Characters {current}/{max}` summary on the second line so the chevron no longer crowds the counts
        - aligned the side-tools unit test and shell-owner restore Playwright coverage with the collapsed-by-default contract before rerunning focused validation and the full Vitest suite

    - Late shared-snapshot restore race hardening:
        - tightened `useLegacyWorkspaceSnapshotMigration.ts` so the async shared-backup restore path rechecks whether the current workspace is still effectively empty after `loadSharedWorkspaceSnapshot()` resolves, preventing a late legacy snapshot from overwriting a live prompt/settings draft that started after launch
        - added focused regression coverage in `tests/useLegacyWorkspaceSnapshotMigration.test.tsx` for the late-restore skip path and a dedicated Playwright guard in `e2e/workspace-late-shared-restore.spec.ts` that delays `/api/workspace-snapshot` and verifies the live draft stays intact while no legacy turn silently rehydrates
        - revalidated the fix with the focused migration Vitest slice, the new Playwright spec, and repeated manual browser use where the composer/viewer rollback no longer reproduced

    - Startup hydration replay hardening:
        - removed the broad launch-time composer replay from `useWorkspaceAppLifecycle.ts`, where `applyComposerState(initialComposerState)` could rerun during dev refresh and overwrite the live composer with an older startup snapshot while source files were being edited
        - moved restored startup presentation hydration into `useImageGeneration.ts` so `generationMode`, `executionMode`, and `displaySettings` now initialize directly from the restored composer snapshot instead of relying on a rerunnable lifecycle restore path
        - added focused regression coverage in `tests/useImageGeneration.test.tsx`, reran the targeted startup/restore Vitest slice with `tests/useImageGeneration.test.tsx tests/useLegacyWorkspaceSnapshotMigration.test.tsx tests/legacyWorkspaceSnapshotMigration.test.ts tests/usePerformGeneration.test.tsx`, reran `e2e/workspace-late-shared-restore.spec.ts`, and kept `npm run build` green

    - Post-audit hardening:
        - removed the duplicate Vitest import from `tests/useHistorySourceOrchestration.test.ts` so the Session A regression file stays syntactically clean
        - added legacy queued-job snapshot migration in `utils/workspacePersistence.ts` so pre-`hasInlinedResponses` succeeded jobs restore with truthful import-ready state until the next poll refreshes them
        - reran focused Session A and Session D Vitest slices at `10 files / 71 tests` and reran `npm run test:e2e:restore:queued-batch` to `2 / 2`

## v3.2.5 - 2026-04-04

- Release title: Nano Banana Ultra 3.2.5 - Queued Batch Truthfulness & Submit Feedback Closeout
- Release prep summary:
    - Queued batch truthfulness hardening:
        - threaded `hasInlinedResponses` into local queued-job state, added explicit local `submissionPending` plus import-diagnostic tracking, and centralized the queue truth predicates in `utils/queuedBatchJobs.ts` so import-ready no longer means `JOB_STATE_SUCCEEDED` alone
        - updated composer queue status, the queued-batch detail panel, workspace insights, and workflow detail surfaces so counts and actions now reflect real importability, while succeeded jobs without inline payload no longer appear ready to import
        - separated queued-batch diagnostics into two user-visible outcomes: jobs that finished with no inline payload and jobs that had inline responses but still produced no importable image after extraction

    - Immediate submit feedback and snapshot safety:
        - added optimistic local queued jobs for both main-composer and editor-origin batch submits so pending feedback appears immediately instead of waiting for the remote batch create response
        - made the editor-origin queue path rely on stable workspace queued-job state so submit feedback survives editor closure without requiring editor-local persistence
        - filtered optimistic `submissionPending` jobs out of workspace snapshot persistence so restore never revives local-only placeholder jobs as if they were real remote batches

    - Validation, restore alignment, and closeout:
        - expanded focused regression coverage for `hasInlinedResponses` mapping, truthful ready counts, no-payload versus extraction-failure diagnostics, optimistic pending feedback, and batch-helper payload/extraction behavior
        - aligned the queued-batch restore Playwright fixture with the new import-ready contract by marking restored ready jobs with `hasInlinedResponses: true`, then reran the targeted restore browser slice
        - revalidated Session D with the package Vitest script at `74 files / 648 tests`, reran `npm run build`, reran `npm run test:e2e:restore:queued-batch` to `2 / 2`, and updated the split-session docs / repo memory so Session D is explicitly marked complete with its preserved queued-batch contracts

## v3.2.4 - 2026-04-04

- Release title: Nano Banana Ultra 3.2.4 - Quantity Persistence Closeout & Session D Handoff
- Release prep summary:
    - Quantity persistence stale-state fix closeout:
        - confirmed the Session C root cause in `ImageEditor.resetTools(...)`, where editor-local reset replayed stale `initialBatchSize` back into committed composer state via `onBatchSizeChange(initialBatchSize)` and could silently overwrite a later committed Quantity such as `3`
        - kept the runtime fix narrow by removing that stale editor reset batch-size writeback instead of adding broad defensive clamping or widening settings-session ownership changes
        - expanded the Quantity regression coverage so `Quantity = 3` is now exercised across generation-settings round trip, advanced-settings round trip, and editor reset / close flows through `WorkspacePickerSheet.settingsSwitch`, `useWorkspaceEditorActions`, and the dedicated `ImageEditor.reset` regression

    - Validation and stale-suite cleanup:
        - aligned the stale `SurfaceSharedControls` Vitest expectation to the current shared-controls button label line-height class so the full suite reflects the existing component output instead of failing on an outdated assertion
        - revalidated the Quantity slice with focused Vitest at `4 files / 7 tests`, reran `SurfaceSharedControls` at `2 / 2`, reran the full suite at `74 files / 641 tests`, and reran `npm run build`
        - manually verified two real user paths in the browser: `Quantity 3` stayed draft-only until `Apply` through the generation-to-advanced round trip, and stayed committed at `3` across ImageEditor entry, `Reset`, and editor close

    - Session closeout and next-session handoff:
        - updated the split-session handoff docs so Session C is explicitly marked complete, its stop condition and validation are recorded, and Session D now starts from the verified A-C ready state instead of still treating Session C as pending
        - documented the preserved cross-session contract that committed `batchSize` must only change through explicit apply / restore flows and must not be mutated by editor-local stale snapshot replay

## v3.2.3 - 2026-04-04

- Release title: Nano Banana Ultra 3.2.3 - Composer / Viewer Surface Clarity & Image Tools Polish
- Release prep summary:
    - Composer / viewer / style-label cleanup:
        - added a conditional composer style status strip between `Generation Settings` and `Follow-up Source` that only renders when a real style is active, making shared style state visible without surfacing the `None` case as fake status
        - added an explicit viewer `Apply Prompt` CTA that routes through an App-owned prompt-replace helper so applying a viewed prompt only replaces composer prompt text and preserves the Session A continuation/source contract
        - removed the duplicate main-stage Upload/Repaint empty-state CTA so repaint entry stays owned by `Image Tools`, while the stage empty state keeps the cleaner ready-only presentation
        - fixed the English `catDesign` label, simplified `STYLE_CATEGORIES` to translation-driven ids, and aligned style category display plus the new viewer/action wording across the maintained locales instead of relying on hardcoded mixed-language labels

    - Image Tools wording and action-button polish:
        - renamed the three Image Tools entries to `Upload Image To Repaint`, `Repaint Current Image`, and `Draw Reference Sketch` so the side-tool verbs match the actual workflow surface ownership after chain cleanup
        - polished the visible Image Tools action buttons with left-side icons, slightly larger compact typography, and tighter multiline alignment so the longer labels stay readable without reopening the old loose action-card styling

    - Validation and handoff follow-through:
        - added focused regression coverage for composer style-strip visibility, viewer prompt-apply behavior, Image Tools wording, empty-stage CTA removal, and Session B translation coverage, then revalidated the main Session B slice with focused Vitest at `386/386` plus `npm run build`
        - reran the focused `WorkspaceSideToolPanel` Vitest slice after the post-closeout Image Tools typography/icon refinement at `2/2` and updated the split handoff docs so Session B is marked complete and Session C starts from the preserved Session A/B contracts

## v3.2.2 - 2026-04-04

- Release title: Nano Banana Ultra 3.2.2 - Chain Cleanup & Restore Contract Alignment
- Release prep summary:
    - Chain cleanup and explicit continuation-source contract:
        - stopped passive history open/reopen from promoting workspace session source, mutating conversation route, or rewriting composer state, so `Reopen` now stays in stage/view-only territory while `Continue`, `Promote Variant`, and `Branch` remain the only explicit route-changing actions
        - added `workspaceSession.sourceLineageAction` as explicit continuation intent, threaded it through session promotion, lineage selectors, imported-workspace review, provenance continuation, and branch continuation helpers, and stopped pending branch intent from being projected back onto the old branch continuation map
        - changed normal generation and conversation request assembly to read from the explicit continuation source instead of the last viewed stage image, while preserving current-stage ownership for follow-up editor flows
        - hardened snapshot sanitation and restore normalization so passive `selectedHistoryId` no longer rehydrates conversation/session route semantics, and aligned imported-workspace / versions / filmstrip restore expectations so passive history open continues to preserve composer text
        - added focused regression coverage for history orchestration, branch continuation, lineage selectors, generation context, and workspace persistence, then revalidated the slice with focused Vitest, adjacent continuity/provenance Vitest, `npm run build`, and focused restore Playwright coverage

    - Broader restore follow-up and editor shared-state restore:
        - broader `workspace-restore.spec.ts` validation exposed outdated advanced-settings assumptions plus an editor-close shared ratio/size regression, so standalone advanced-settings close is now treated as discard-only and no longer expected to persist unapplied draft changes
        - changed editor close to restore the pre-editor shared composer/object/character snapshot by default, keeping editor-entry auto-measured ratio and size isolated from the main workspace when no local editor changes are being kept
        - updated restore Playwright assertions to target stable advanced-settings controls instead of removed section-heading copy, added `useWorkspaceEditorActions` regression coverage for default restore versus explicit opt-out, and reran the full restore browser suite to `59 passed`

    - Session handoff and closeout documentation:
        - updated `docs/session-handoffs/README.md`, `session-a-chain-cleanup.md`, and `session-b-composer-viewer-surface-ui.md` so the next session can start from the verified Session A stop condition and preserve the fixed route/source and shared-settings contracts

## v3.2.1 - 2026-04-03

- Release title: Nano Banana Ultra 3.2.1 - Shared Controls, Retouch Locking & Advanced Settings Draft Flow
- Release prep summary:
    - Shared controls, editor-local prompt/reference state, prompt draft/apply, and retouch/editor-entry hardening:
        - rebuilt the floating `Shared` surface controls into an always-visible compact settings card instead of an open/close disclosure, moved it to the left-side workspace edge, collapsed the surface summary into compact chips, limited SketchPad to first-layer `Model` and `Ratio` actions, and added bottom-offset reporting so the editor retouch toolbar can dock beneath the shared controls without overlap
        - moved editor prompt and reference ownership further into editor-local transient state so editor object/character references start empty from snapshot-backed editor sessions, clear correctly on editor exit, and stay isolated from the main composer while shared model and generation settings continue to follow the active workspace surface
        - changed the shared prompt sheet to a draft-and-apply flow: prompt edits now stay local until `Apply`, close and backdrop-dismiss discard unsaved prompt draft changes, the old prompt quick-action footer was removed from that route, and style entry points are hidden for editor-local picker flows that should not expose shared style changes
        - added prompt clear affordances in both the main composer and the shared prompt sheet, aligned the clear icon to the nicer SketchPad trash-can treatment, and polished the shared-controls button label wrapping so multi-line action text reads denser without feeling overly loose
        - changed editor entry so uploaded or reopened images are measured up front, clamped to the same 4K semantics used by the editor, and then auto-apply the closest aspect ratio plus the closest output-size bucket before the editor opens, while snapshot restore keeps the pre-editor shared settings separate from the editor-initial ratio and size used by `Reset` inside the editor
        - made retouch ratio-locking ratio-first at the app level: entering editor now starts in `inpaint`, only retouch/inpaint keeps the auto-selected ratio locked, outpaint stays free to change ratio, unsupported models auto-switch to the first ratio-compatible model with a localized notice, and the shared picker now filters model choices plus disables ratio changes whenever that retouch lock is active
        - hardened the ratio-lock path across capability normalization and editor constraints so locked retouch ratios are no longer bounced back to `1:1`, added the supporting editor auto-switch locale key across the maintained translations, expanded focused regression coverage for closest ratio/size helpers, picker retouch locking, and capability-hook preservation, and revalidated the slice with focused Vitest at `4 files / 374 tests` plus `npm run build`
        - updated maintained locale dictionaries for the new shared-controls `Settings` heading plus the revised editor-local wording, expanded focused regression coverage for shared controls, composer prompt clear, prompt draft/apply/discard behavior, and transient editor state, and revalidated the slice with focused Vitest coverage, full Vitest at `66 files / 614 tests`, and `workspace-restore.spec.ts` Playwright at `59 passed`

    - Advanced settings simplification and shared settings-session drill-in:
        - simplified `Advanced settings` into a cleaner apply/cancel flow: removed redundant header and section help chrome, kept `Runtime guide` always visible as a static note block, shortened structured-output and grounding guidance, removed the misleading live `Default temp` chip because the fixed baseline remains `1`, and aligned the simplified wording across the maintained locales
        - kept prompt and advanced edits in draft state until explicit `Apply`: shared prompt changes now stay local until applied, clear affordances were added for both composer and shared prompt textareas, advanced close/backdrop/Escape now behave as cancel, and editor-local picker routes no longer expose shared style entry points that should stay out of editor-local flows
        - replaced the older generation/advanced peer-switch behavior with one App-owned `WorkspaceSettingsDraft` session: `Generation Settings` is now the parent flow, `Advanced settings` is a one-way child drill-in, entering advanced from generation keeps the same uncommitted draft without auto-applying, and closing advanced after drill-in returns to generation with that draft intact
        - moved capability-aware settings normalization into `App.tsx` so draft model changes keep ratio, size, output format, structured output, thinking, and grounding choices valid from the draft itself, while `WorkspacePickerSheet` keeps prompt draft local and the advanced modal reads capability from the shared draft model instead of the last committed model
        - refreshed focused regression coverage for prompt draft/apply/discard, advanced-settings apply/cancel, the removed advanced footer return action, and the shared-draft generation-to-advanced drill-in flow, then revalidated the slice with clean touched-file diagnostics, focused Vitest at `7 files / 27 tests`, and `npm run build`

## v3.2.0 - 2026-04-02

- Release title: Nano Banana Ultra 3.2.0 - Shared Settings, Image Tools & Queue Workflow Refinement
- Release prep summary:
    - Image Tools secondary-card regrouping, reference-hint cleanup, and i18n follow-through:
        - removed the `Actions` eyebrow from the left `Image Tools` surface, regrouped the panel into nested secondary cards so editor and SketchPad actions share the upper card while object and character references share the lower card, and kept the existing side-tool action selectors stable while adding explicit inner-card test ids for the new structure
        - removed the `Rec. < x` recommendation text from the shared `ImageUploader` header so the hint disappears from both the main `Image Tools` panel and the shared-controls references sheet, while preserving the live count display plus the existing `safeLimit` thumbnail highlighting behavior
        - deleted the stale `EDITOR_MAX_REFS` constant so editor and homepage reference limits now stay aligned through the already-shared `MODEL_CAPABILITIES` source of truth instead of leaving an unused divergent editor-only contract in the repo
        - removed the now-unused `safeLimitTip` and `composerActionPanelEyebrow` translation keys from the maintained locale dictionaries, updated translation baselines and focused UI tests to the new contract, and kept the runtime/test surface aligned with the cleaned-up Image Tools wording
        - revalidated the slice with focused Vitest coverage for `WorkspaceSideToolPanel`, `WorkspacePickerSheet`, `ComposerSettingsPanel`, `workspaceFlowTranslations`, and `capabilityTruth`, plus repeated `npm run build`, `npm run test:e2e:restore:shell-owners`, and `npm run test:e2e:restore:mainline-smoke`

    - Composer reference-owner removal, upload-to-edit cleanup, and startup hardening:
        - removed the composer-owned `Reference Tray` and stale references launcher flow, moved object and character reference ownership fully into the left `Image Tools` panel, and aligned the shared references sheet to the new uploader-only contract so the main workspace no longer splits reference management across composer and side surfaces
        - removed the persistent editor-base/base-image concept from the active workspace flow, updated the side-tool editor entry to use the current stage image when available or fall back to `Upload Image To Edit`, and cleaned out the dead base-image wording and locale keys across the maintained translations instead of leaving orphaned editor terminology behind
        - fixed the startup white-screen regressions introduced by the refactor by removing stale `openReferencesPicker` and `handleOpenUploadDialog` runtime references, restoring the missing `Button` import in the picker sheet, and realigning the editor-close restore expectation so reopening editing after close now follows the upload-to-edit contract instead of assuming a removed persistent editor base
        - refreshed the focused regression coverage for composer settings, side tools, picker-sheet behavior, queued-batch editor handoff, workspace-flow translations, and restore flows, updated the restore npm grep scripts to the renamed shell-owner coverage, and revalidated the session with focused Vitest, `npm run build`, `npm run test:e2e:restore:shell-owners`, `npm run test:e2e:restore:mainline-smoke`, and full `npm run test:e2e` at `58 passed`

    - Composer / editor shared-settings refactor:
        - rebuilt the composer dock around a left-rail quick-tool stack (`Inspiration`, `AI Enhance`, `Templates`, `Saved Prompts`, `Styles`) plus a single `Generation Settings` status bar that now owns model, aspect ratio, output size, and quantity, while active follow-up source context can surface beside it instead of living under the prompt
        - compacted the composer settings chrome into 40px summary strips by keeping `Generation Settings` in the top row and moving `Advanced settings` below the prompt as a matching strip with label-plus-value state chips instead of the old inline helper copy or separate short button, highlighted the primary generation chips with stronger accent pill styling plus higher-contrast dark-theme fills, and switched both strips to the shared horizontal-scroll treatment used by the history summary strip so long summaries scroll instead of truncating while the strip itself grows taller to accommodate any visible horizontal scrollbar
        - aligned shared-controls across composer, editor, and SketchPad to the same unified settings-sheet contract, with SketchPad limited to model and ratio while editor keeps the full shared settings set without inheriting the main composer prompt, and with the floating shared-controls surface now collapsing model / ratio / size / quantity into a single `Generation Settings` entry that switches its detail summary by surface
        - removed the duplicate current-image lineage summaries from the left `Image Tools` panel so the composer `Follow-up source` strip is now the single place that surfaces `History · Reopen` style follow-up context, while `Base image` only appears there when an actual editor base is staged
        - continued simplifying the `Generation Settings` modal by removing the secondary topic tabs, removing the local theme toggle and intro explainer, reshaping the content into a model-left / controls-right layout on wide screens with a stacked narrow-screen fallback, upgrading model cards to a three-line title / formal-model-name / capability hierarchy, and adding a `Quantity 3` option beside the existing batch-size choices
        - moved editor prompt ownership into editor-local transient state, split `Inspiration` / `AI Enhance` / shared prompt editing so those tools now target the active surface prompt, preserved mode-specific auto-prompt fallbacks and blank-prompt submit behavior, and removed the editor-local loading HUD so edit submits hand back to the main stage/workflow immediately
        - expanded editor context snapshots and restore plumbing to carry model, style, output, thinking, and grounding settings so returning from editor flows restores the shared generation configuration instead of only ratio / size / quantity
        - added generation-settings and editor-shared-state translation coverage across the maintained locales, expanded focused Vitest coverage for composer/shared-controls/picker-sheet behavior, and revalidated the slice with `npx vitest run tests/WorkspacePickerSheet.test.tsx`, `npm run test:e2e:restore`, and full `npm run test:e2e`

    - Editor-side queued batch handoff:
        - moved editor-origin queued submissions into the editor surface itself with side-by-side `Repaint` and `Queue Batch Job` actions, made both actions share the same exported editor-canvas pipeline, and made the queue path return control to the main workspace the same way immediate editor generation already does
        - isolated editor queued payloads to the editor-local prompt plus exported canvas data, so queued submissions no longer leak the main composer prompt or reuse stale file-backed image URLs
        - changed queued waiting-list wording for editor-origin jobs to exact `Editor Edit` while stopping the main composer queue path from inferring editor mode from leftover `editorBaseAsset` state, so main-page queue now stays limited to prompt-only, staged follow-up, and reference-driven flows
        - added focused Vitest coverage for explicit editor queue draft submission plus waiting-list label rendering, added a dedicated restore Playwright regression for the editor-owned queue path, expanded the queued-batch / restore regression npm scripts to include that case, and revalidated the slice with `npx vitest run tests/useQueuedBatchWorkflow.test.tsx tests/QueuedBatchJobsPanel.test.tsx`, `npm run build`, `npm run test:e2e:restore:queued-batch`, and full `npm run test:e2e`

    - Restore queued-batch Playwright fixture hardening:
        - centralized snapshot-backed `/api/batches/get` fixture routing inside the restore helpers, cleared stale route handlers before reinstalling snapshot fixtures, and stopped unknown queued-job fixture names from falling through to the real backend, removing expected `Could not parse the batch name` noise from Playwright regression runs
        - added explicit file-backed and editor-owned queued-job fixture responses inside the restore specs so queued-batch coverage now stays deterministic

## v3.1.8 - 2026-04-01

- Release title: Nano Banana Ultra 3.1.8 - Restore Notice Removal & Startup Preference Persistence
- Release prep summary:
    - removed the blocking `WorkspaceRestoreNotice` flow from the real product runtime so startup restore, imported-workspace replace, and shared-backup migration now restore directly into the recovered workspace state instead of requiring a second decision modal
    - replaced the old restore-modal contract with lightweight toast feedback, updated snapshot application semantics from `showRestoreNotice` toward `announceRestoreToast`, and kept restore continuity intact for history source routing and official-conversation follow-up requests
    - preserved last-used startup preferences by restoring theme and language immediately on launch, persisting user language changes into local storage, and extracting shared theme persistence helpers so launch-time UI state comes back before restore feedback is announced
    - cleaned up restore-era translation surface area across all supported locales by removing modal-only restore action strings, retaining the shared restore keys still used by toast and import-review flows, and realigning the locale baseline tests with the new contract
    - rewrote the restore Playwright coverage around direct-restore behavior, removed obsolete modal-only restore tests, updated official-conversation restore assertions to the new no-click startup path, and revalidated the slice with focused Playwright, focused translation Vitest coverage, and a production `npm run build`

## v3.1.7 - 2026-04-01

- Release title: Nano Banana Ultra 3.1.7 - Shell Density, Theme Stability & Composer Cleanup
- Release prep summary:
    - tightened the main workspace shell into a denser contract by moving the top launcher strip, history canvas support flow, and bottom composer row onto the shared tighter spacing baseline, keeping the launcher cards at a 40px desktop height and bringing the composer row back to the same full-width alignment as the rest of the layout
    - reduced unnecessary UI churn by suppressing whole-document transitions during theme flips, narrowing several broad `transition-all` surfaces across stage, history, and filmstrip flows, and removing the redundant history branch-summary rebuild so shell interactions stay lighter under real workspace load
    - upgraded visual readability across the stage and language surfaces by switching stage top-right chips and overflow actions to higher-contrast solid treatments, improving dark-theme signal contrast, and moving the language selector off the frosted overlay shell onto a clearer solid panel contract
    - simplified composer chrome by removing the prompt-panel `Compose` eyebrow plus the separate right-side `Actions` / `Create` heading block, while keeping the action controls in place so the composer reads as one cleaner workspace-owned surface
    - revalidated the release with focused Vitest coverage around composer, stage, workflow, history-canvas, language-selector, render-stability, and lineage-helper paths, then reran a production `npm run build`

## v3.1.6 - 2026-04-01

- Release title: Nano Banana Ultra 3.1.6 - Compact Thumbnail & Stage Context Completion
- Release prep summary:
    - completed the compact-thumbnail and stage-context slice by turning `Recent Turns` and embedded `Gallery` history cards into scan-and-switch tokens, removing prompt preview from the main workspace surfaces, and keeping prompt detail viewer-owned instead of letting thumbnails or the stage act like mini detail cards
    - added the selected-item dock beside the history area so history-turn metadata and history-turn actions now live in dedicated `Selected Item Summary Strip` and `Selected Item Action Bar` surfaces rather than staying embedded in thumbnail overlays, while restoring branch-rename applicability so `Rename Branch` only appears when a real rename target exists
    - upgraded the main stage top-right into a compact current-stage context and quick-action cluster, preserved source and branch context during active generation, and finished the responsive overflow contract so both the selected-item dock and the stage cluster now follow explicit wide / medium / compact visibility priorities instead of relying on scroll-only or breakpoint-only fallbacks
    - tightened selection and source ownership across restore and browsing flows by aligning filmstrip selection to `selectedHistoryId`, preserving exact staged-source semantics when browsing diverges from the current stage, fixing the failed-history selection crash path, and removing prompt leakage from stage, filmstrip, and gallery image `alt` surfaces
    - closed the remaining validation and tooling tail work by constraining bare Vitest discovery to the `tests/` tree, excluding `e2e/**`, realigning the formal restore Playwright suite to the current selected-item-dock, workflow-detail, and queued-batch contracts, and fixing the modal-lifecycle helper so queued-batch restore assertions no longer lose their previously open detail modal context
    - revalidated the completed slice with focused Vitest coverage for generated-image, history, filmstrip, selected-item surfaces, lineage selectors, stage-viewer logic, and orchestration helpers, a full bare `npm exec vitest run` pass at `63 passed` / `602 tests`, the formal restore Playwright suite at `62 passed`, compact-width browser verification, and a broader restore-fixture sweep across real snapshot fixtures

## v3.1.5 - 2026-03-31

- Release title: Nano Banana Ultra 3.1.5 - Shell Polish & Queue Modal Cleanup
- Release prep summary:
    - tightened the top workspace launcher strip into a denser summary-first row, clarified the `Current Work` / `Response` / `Source Trail` ownership model, split their active-signal logic, renamed the English `Answer` surface to `Response`, and reduced the remaining shell gutters so the workspace reads as one tighter product shell
    - reorganized the right-side workspace support flow by moving `Recent Turns` above `Versions`, restyling and compacting the `Versions` summary actions, promoting `Gallery` out of the composer and then embedding the gallery surface directly into the support rail instead of keeping it behind the old modal launcher
    - simplified workflow detail ownership by compacting the reused context rail inside the detail modal and removing repeated workflow summary and latest-thought blocks, while merging returned thoughts into the main chronological workflow event stream
    - promoted `Queued Batch Jobs` into its own detail modal and hardened the queue workflow end to end: documented the verified 24-hour target versus 48-hour expiry contract in the local Gemini skill, surfaced active age warnings for long-running jobs, tightened queued image request validation, and cleaned up the modal framing so the shared title/description no longer repeat while the embedded panel keeps extra bottom breathing room
    - hardened restored workspace media handling by filtering empty viewer image URLs out of snapshots and replacing missing history, filmstrip, and queued-result thumbnails with explicit placeholders instead of letting restored browsers hit the empty-`img src` path
    - expanded focused regression coverage around the compact launcher contract, launcher signal behavior, workflow thought ordering, and queued batch panel rendering while repeatedly revalidating the product shell with `npm run build`

## v3.1.4 - 2026-03-31

- Release title: Nano Banana Ultra 3.1.4 - Shell, Restore & Queue Batch Hardening
- Release prep summary:
    - reorganized the top workspace shell around summary-first ownership: `Current Work` is now a single-line live-status card with a thought-aware indicator, while `Answer`, `Source Trail`, and `Versions` open dedicated detail modals instead of carrying their full content inline
    - moved heavyweight workflow, provenance, and version detail out of the compact summaries, including keeping `Workspace Snapshot` import/export controls inside the `Versions` detail modal and preserving full current-stage source routing, lineage context, and the full thoughts stack inside the workflow detail view
    - tightened overflow and mobile-fit behavior across the restored shell surfaces, generated-image overlays, structured-output menus, tooltip panels, and shared scroll containers so the compact shell stays readable without viewport-breaking UI states
    - split restore-time runtime hydration from save/export compaction so restored workspaces keep the selected turn and official-conversation image chain needed for viewer access and `priorTurns` continuation requests, while persisted snapshots still strip quota-heavy inline generated payloads wherever a file-backed or compact form should be used
    - fixed file-backed queue batch submission from restored stage sources by keeping the browser payload on `/api/load-image?filename=...` and resolving that reference into inline Gemini bytes only at the backend request boundary, avoiding a return to retained frontend base64 state
    - expanded regression coverage around the modal-owned shell and restored file-backed flows, including workflow/source assertions through detail modals, versions-owned workspace snapshot actions, official-conversation restore continuity, and a Playwright guard that confirms queued batch browser requests stay file-backed
    - revalidated the release hardening with focused Vitest coverage for workflow, response, history, viewer, image-reference, workspace-persistence, and backend integration paths, the full restore Playwright suite, a production `npm run build`, and a live browser spot-check against a restored workspace snapshot

## v3.1.3 - 2026-03-30

- Release title: Nano Banana Ultra 3.1.3 - Restore & Payload Hardening
- Release prep summary:
    - reduced long-session slowdown by avoiding retained inline base64 for saved stage and viewer images when a saved file is available, so the main workspace no longer needs to keep full image data URLs in long-lived UI state after auto-save succeeds
    - redacted inline image payloads from viewer, provenance, and structured-output text surfaces so raw `data:image/...;base64,...` blobs no longer spill into the right-side inspection panels or other text-driven UI paths
    - aligned restore notice gating with the same restorable-content detection used by snapshot migration and import flows, so restored prompts, workflow logs, queued jobs, and other non-empty workspace states no longer silently skip the restore notice just because they lack visible viewer images or staged assets
    - hardened thought-signature handling by summarizing opaque signature payloads in viewer and provenance session-hint surfaces, and by stripping oversized raw `thoughtSignature` blobs from stored history and workspace session hints while preserving the lightweight `thoughtSignatureReturned` continuity signal
    - revalidated the follow-up hardening with focused Vitest coverage for restore snapshot state, legacy migration, provenance view, generation storage, and workspace persistence at `32 passed` across `5` files, plus `npm run build`

## v3.1.2 - 2026-03-30

- Release title: Nano Banana Ultra 3.1.2 - Versions & Viewer Refinement
- Release prep summary:
    - moved `Export Workspace` and `Import Workspace` out of the composer and into the history-owned `Versions` surface, adding a titled `Workspace Snapshot` strip and restoring a clearer multi-layer shell around active-branch and lineage sections
    - simplified the single-image viewer by removing redundant header copy, moving the red close action fully outside the modal shell, and keeping the dialog labeled through accessibility metadata rather than visible chrome
    - made the viewer sidebar independently scrollable, introduced the reusable `nbu-scrollbar-subtle` scrollbar utility, aligned legacy thin-scroll surfaces to the same understated treatment, updated localized snapshot-strip copy, and removed the banana emoji from the document title so browser chrome now reads `Nano Banana Ultra`
    - revalidated the UI refinement with focused Vitest coverage for composer, history, and viewer surfaces, restore viewer chrome assertions, and repeated `npm run build` validation

## v3.1.1 - 2026-03-30

- Release title: Nano Banana Ultra 3.1.1 - Workspace Layout Refinement
- Release prep summary:
    - this patch release is primarily a layout and density refinement pass on top of the 3.1 product-facing workspace baseline rather than a new workflow or feature release
    - tightened and aligned the main workspace surfaces so `Recent Turns`, `Versions`, side tools, stage wrappers, answer placeholders, and composer sections now share the same compact visual contract
    - applied the same layout standard to modal, picker-sheet, import, restore, viewer, rename, advanced-settings, confirm, and loading overlays so the whole workspace reads as one consistent shell family
    - revalidated the UI-only refinement with focused Vitest coverage for history/composer/response/output surfaces, focused Vitest coverage for overlay/dialog surfaces, restore mainline smoke at `6 passed`, and the full restore regression suite at `22 passed`

## v3.1.0 - 2026-03-30

- Release title: Nano Banana Ultra 3.1.0 - Product-Facing Workspace Baseline
- Release prep summary:
    - completed the shift away from engineering-oriented shell framing and locked the product-facing workspace contract: a health-only header, `Current Work` for live process and thoughts, `Answer` for result delivery, evidence-first `Sources & Citations`, and history-owned versions
    - closed the remaining post-Phase-F restore regressions by fixing the `Queue Batch Job` tooltip accessible-name collision and restoring the live provenance surfaces that workspace restore flows still depend on, including attribution overview rows, status strips, uncited-source cards, reuse previews, and compare summaries
    - consolidated maintained user guidance into `README.md` and removed the separate `USER_MANUAL.zh-TW.md` so 3.1 product docs live in one place instead of splitting between the product README and a secondary manual
    - validation summary:
        - focused Vitest: `npm exec vitest run tests/GroundingProvenancePanel.test.tsx tests/useGroundingProvenanceView.test.tsx` -> `13 passed`
        - full restore Playwright: `npx playwright test e2e/workspace-restore.spec.ts` -> `61 passed`
        - full Playwright suite: `npx playwright test` -> `61 passed`

## v3.0.5 - 2026-03-29

- Release title: Nano Banana Ultra 3.0.5 - Panel Simplification & Restore Regression Update
- Release prep summary:
    - removed redundant helper copy across panel surfaces and moved high-value guidance into reusable info-tooltips instead of keeping long inline instructions visible by default
    - flattened disclosure shells in workspace insights, provenance, viewer, and import review surfaces where collapsed and expanded states were effectively showing the same information
    - moved `Queue Batch Job` mode guidance beside the action as an info icon, simplified duplicated thoughts presentation into a single readable block, and made tooltip panels easier to read with fully opaque backgrounds
    - revalidated the cleanup with focused Vitest coverage plus a full restore regression pass at `25 passed`

## v3.0.4 - 2026-03-29

- Release title: Nano Banana Ultra 3.0.4 - Square Stage Layout Update
- Release prep summary:
    - locked the main generated-image stage to a square frame so portrait outputs no longer stretch the workspace and force extra scrolling
    - applied the same square-stage layout contract to the empty, loading, and error states so the focus surface keeps a stable footprint throughout the workflow
    - added focused Vitest coverage for the square stage-frame contract in `GeneratedImage`

## v3.0.3 - 2026-03-29

    - moved `Workspace Context` out of the desktop sticky side rail and into the main reading flow directly between `Response` and `Recent Turns`
    - aligned desktop and mobile to share the same collapsible `Workspace Context` container instead of maintaining separate always-open desktop and mobile-only disclosure paths
    - moved `Image Tools` into the main image workspace support rail so tool actions sit beside the focus surface instead of competing with context placement above the canvas
    - replaced the long desktop right-rail presentation with a single summary-first entry point that reduces the feeling of floating context cards across unrelated sections
        - hardened the auto-save failure persistence path so unsaved inline generated/history payloads no longer get written into local snapshots, shared backups, or exported workspace documents, while current-session viewing still keeps working and uploaded reference assets remain restorable
    - revalidated the layout refactor with focused Vitest coverage for `WorkspaceInsightsSidebar` and `WorkspaceHistoryCanvas`

## v3.0.2 - 2026-03-26

- Release title: Nano Banana Ultra 3.0.2 - i18n Chunking & Restore Fixture Hardening
- Release prep summary:
    - removed the Vite chunk-size warning by taking lineage fallback labels out of the translation runtime graph and splitting locale payloads into dedicated i18n chunks
    - switched runtime localization to lazy-load non-English dictionaries on demand while keeping English eager, reducing the default bundle cost without changing translation call sites
    - added translation preload helpers for Vitest and Playwright so test environments can still assert localized UI deterministically after the runtime loading change
    - moved restore and import snapshot fixtures out of `output/` into `e2e/fixtures/restore` so regression coverage no longer depends on runtime artifact directories
    - restored and normalized the dedicated restore fixtures used by smoke, variant, provenance, official conversation, invalid import, and shared-context paths
    - updated the restore Playwright suite to preload translations, consume the dedicated fixture directory, and align a few selectors and headings with the current shell wording
    - added a dedicated `test:e2e:restore` npm script so focused restore runs can safely pass `--grep` without the `npm exec` argument-swallowing problem
    - revalidated the restore workflow after the fixture migration, including a full `workspace-restore.spec.ts` pass at `66 passed`

## v3.0.1 - 2026-03-26

- Release title: Nano Banana Ultra 3.0.1 - Workspace Shell Clarity Update
- Release prep summary:
    - completed the post-3.0.0 workspace shell refinement plan across Sessions A-I without reopening the underlying continuity, restore, provenance, or picker-state architecture
    - moved visible ownership of `Model`, `Ratio`, `Size`, and `Qty` into the composer so setup now starts where prompt writing and generation actions already live
    - added a composer-owned `Reference Tray` strip directly under the helper row so reference state stays near the prompt instead of being split across header and side surfaces
    - simplified the top header into a compact global bar that keeps brand, theme, language, and console status without competing as a second settings surface
    - trimmed the side tool panel into image tools only, keeping upload, editor, and SketchPad actions while removing stale reference-surface ownership and related dead prop wiring
    - regrouped the right rail into `Current Work`, `Versions`, `Sources & Citations`, and `Activity` so the workspace reads more like a product flow and less like an engineering dashboard
    - softened first-read shell wording across the regrouped insights rail and side tools, including review/session/history/version phrasing that better matches normal-user mental models
    - closed translation parity for the new shell groupings and wording across all supported locales, including Japanese, Korean, Spanish, French, German, Russian, Traditional Chinese, and Simplified Chinese
    - extended regression coverage for the composer-owned settings row, composer reference strip, simplified header, image-only side tools, regrouped insights rail, and localized shell wording so the 3.0.1 shell contract is guarded by tests
    - kept focused validation green for the shell-owner path, including targeted Vitest coverage for composer, header, side tool, insights, and translation baselines

## v3.0.0 - 2026-03-26

- Commit: `98c8ece`
- Release title: Nano Banana Ultra 3.0.0 - Continuity Workspace Release
- Tag subject: `v3.0.0: continuity workspace, structured outputs, queued batch, and restore hardening`
- Release notes summary:
    - rebuilt the product around a clearer workspace shell: top `Model Output`, center history canvas, right-side context and tools, and bottom composer
    - added dedicated shell surfaces such as `WorkspaceResponseRail`, `WorkspaceHistoryCanvas`, `WorkspaceInsightsSidebar`, `WorkspaceSideToolPanel`, `WorkspaceViewerOverlay`, `WorkspacePickerSheet`, `WorkspaceImportReview`, `WorkspaceRestoreNotice`, `SessionReplayDialog`, and `BranchRenameDialog`
    - removed older duplicated shell families so secondary surfaces route back to history ownership instead of exposing competing direct actions
    - made official conversation continuity first-class across generation, history, sidebar, replay, restore, and snapshot persistence
    - expanded branch and source-state workflows with clearer `open`, `open latest`, `continue latest`, source-active, branch rename, and lineage routing semantics
    - added a formal session replay path and strengthened import, restore, reopen, and active-source continuity behavior across the app
    - introduced preset-based structured outputs as a shipped product feature instead of an ad hoc response path
    - shipped the initial structured-output presets `scene-brief`, `shot-plan`, `prompt-kit`, `quality-check`, `delivery-brief`, `variation-compare`, and `revision-brief`
    - added structured-output rendering in both the response rail and viewer overlay, with copy JSON, copy text, and export actions plus richer preset-specific presentation ordering
    - turned structured outputs into reusable workflow artifacts by adding prompt-draft assembly, append/replace actions, and clearer guide-card onboarding in advanced settings
    - added an official queued-batch workflow with submit, refresh, cancel, import, import-ready summaries, grouped monitor/results actions, and per-job event timelines
    - persisted queued batch jobs through workspace snapshots and restore flows, including imported queued results entering normal history with lineage-aware labels
    - improved queued-batch support for staged follow-up and editor-based image-conditioned requests while keeping batch behavior aligned with official API constraints
    - substantially upgraded grounding and provenance UX with summary-first detail surfaces, compare flows, linked-source inspection, bundle/source drill-down, and composer reuse guidance
    - strengthened result and stage semantics so grounding status, workflow state, thoughts, session hints, and provenance context read consistently across stage, rail, sidebar, and viewer
    - hardened local workspace persistence by compacting inline snapshot payloads, favoring file-backed image restore when `savedFilename` is available, and failing soft on storage quota pressure
    - carried `savedFilename` and related asset metadata through stage assets, history assets, restore flows, and snapshot migration so restored workspaces can recover images more safely
    - centralized capability truth and model constraints, improving shared handling of model support, request assembly, and backend/frontend consistency
    - modularized the translation system into per-locale files and completed a broad 9-language shell wording convergence pass across restore, replay, provenance, queue, viewer, history, and composer surfaces
    - normalized owner-route and continuity wording across the product so compact secondary surfaces read as guided routes back into history rather than parallel execution surfaces
    - introduced a more deliberate visual system with shared shell surface tokens, overlay tokens, summary-first disclosure patterns, and theme-safe modal behavior including local theme toggles on blocking overlays
    - moved Advanced settings into a dedicated modal workflow and exposed the same entry path from the composer, shared controls, editor, and SketchPad
    - extracted substantial orchestration out of `App.tsx` into focused hooks for queue workflow, stage/viewer behavior, transient UI state, shell utilities, generation context, snapshot actions, and related view-model assembly
    - added or expanded major supporting docs for shell decisions, implementation structure, package ownership, and internal smoke verification to match the shipped 3.x workspace architecture
    - greatly expanded automated coverage with new and updated Vitest suites for structured outputs, official conversation flows, queued-batch workflow, persistence, provenance, lineage, restore/import UI, and shell surfaces
    - expanded Playwright restore coverage into focused entrypoints and broader locale-aware regression coverage for restore, replay, provenance, queued-batch, and owner-route workflows

## v2.5.1 - 2026-03-11

- Commit: `244a32e`
- Release title: Dev Server Port Optimization
- Tag subject: `v2.5.1: Port optimization and startup script refinement`
- Release notes summary:
    - fixed port collision issues
    - refined startup scripts

## v2.5.0 - 2026-03-10

- Commit: `fcc5837`
- Release title: System Status Monitor & Secure API Integration
- Tag subject: `v2.5.0: System Status Monitor & Secure API Integration`
- Release notes summary:
    - added a real-time system status monitor for Local API and Gemini key state
    - added multi-language support across 9 languages for the status surface
    - moved API key handling to backend health checks so keys are not exposed in the browser bundle
    - updated Gemini model naming to official versions
    - added health-check, preview, and security documentation
    - added structured error logging, locale normalization, z-index cleanup, and refactoring work

## v2.4.1 - 2026-03-05

- Commit: `019c26c`
- Release title: Enhanced UI consistency & Global Settings Sync
- Tag subject: `v2.4.1: Enhanced UI consistency, tooltips, global settings sync, and removed lock features`
- Release notes summary:
    - added consistent tooltips across SketchPad and ImageEditor controls in all supported languages
    - synchronized global theme and language settings across the app, including SketchPad
    - improved UI layering so global controls stay above modals and the log console hides during SketchPad sessions
    - removed the manual parameter lock feature for a simpler workflow
    - fixed duplicate translation-key issues and updated labels such as `Reference Images`

## v2.4.0 - 2026-03-05

- Commit: `979bc38`
- Release title: Editor Layout Refinements & Fine-tuned Model Limits
- Tag subject: `v2.4.0: Editor Layout Fixes & Official Model Input Limits`
- Release notes summary:
    - refined the Interactive Image Editor sidebar layout and compact spacing
    - implemented official reference-image limits for generate mode versus editor mode
    - fixed the fullscreen editor sidebar overlay prominence issue

## v2.3.0 - 2026-03-04

- Commit: `f763213`
- Release title: UI Refinements & Global i18n
- Tag subject: `docs: Reorder README to place English section before Traditional Chinese`
- Release notes summary:
    - added a custom model selector with short and full model names
    - corrected sidebar layout issues for resolution and quantity controls
    - expanded prompt templates and translations across 9 languages
    - replaced native browser select inputs with custom UI components

## v2.2.0 - 2026-03-04

- Commit: `d3d92df`
- Release title: 9999 Prompt History Limit & Smart Rendering
- Tag subject: `Release v2.2.0 - Expanded Local History to 9999 items with optimized UI rendering`
- Release notes summary:
    - expanded local prompt history capacity to 9,999 records
    - limited dropdown rendering to the newest items to avoid UI lag with large histories

## v2.1.0 - 2026-03-02

- Commit: `46e5ff3`
- Release title: Sidebar Fix & Local History
- Tag subject: `Release v2.1.0 - Full Mobile Sidebar Fix & Permanent Local Prompt History`
- Release notes summary:
    - moved prompt history persistence to local disk instead of browser cache
    - fixed mobile and tablet z-index issues around sidebar and modal rendering

## v2.0 - 2026-03-01

- Commit: `1e40672`
- Release title: Release v2.0
- Tag subject: `feat: implement dual reference trays with drag and drop`
- Release notes summary:
    - added support for all Gemini image model paths used by the project at that time
    - introduced dual reference trays with drag-and-drop handling

## v1.3 - 2026-02-25

- Commit: `503ce40`
- Release title: Release v1.3
- Tag subject: `feat: major project refresh update`
- Release notes summary:
    - major project refresh and rebuild wave

## v1.2.3 - 2025-12-25

- Commit: `55373eb`
- Release title: Nano-Banana-Ultra-v1.2.3
- Release channel: pre-release
- Release notes summary:
    - hot fix of v1.2.2

## v1.2.2 - 2025-12-25

- Commit: `754f5b4`
- Release title: Nano-Banana-Ultra-v1.2.2
- Release channel: pre-release
- Release notes summary:
    - improvements and fixes in editor mode

## v1.2.1 - 2025-12-20

- Commit: `057554a`
- Release title: Nano-Banana-Ultra-v1.2.1
- Release channel: pre-release
- Release notes summary:
    - enhanced the ImageEditor prompt column UI

## v1.2.0 - 2025-12-20

- Commit: `75f9b7f`
- Release title: Nano-Banana-Ultra-v1.2.0
- Release channel: pre-release
- Release notes summary:
    - added the doodle editing feature
    - improved translations
    - enhanced overall UI

## v1.1.3 - 2025-12-19

- Commit: `730e6ef`
- Release title: Nano-Banana-Ultra-v1.1.3
- Release channel: pre-release
- Release notes summary:
    - early image-generation capability release captured on GitHub Releases

## Notes

- `v1.2.3`, `v1.2.2`, `v1.2.1`, `v1.2.0`, and `v1.1.3` appear on the published GitHub Releases and Tags pages, but they are not present in the current local `git tag --list` output.
- `v2.3.0` local tag subject comes from the tagged commit message, while the published GitHub Release title provides the product-facing version name.
