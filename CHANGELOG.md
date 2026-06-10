# Changelog

## v3.10.17 - 2026-06-10

- Release title: Nano Banana Ultra 3.10.17 - History Layout Pagination Optimization
- Release summary:
    - Optimized the pagination layout inside `WorkspaceUnifiedHistoryPanel` by removing the preview slot reservation logic. Active generating slots (`previewTiles`) are now displayed inline on the first page alongside completed history entries, preventing completed items from being pushed to the next page and eliminating layout shifts during batch generation.

## v3.10.16 - 2026-06-10

- Release title: Nano Banana Ultra 3.10.16 - Cooperative Global Backoff Lock
- Release summary:
    - Implemented a cooperative global backoff lock in `retryOperation` to throttle and align parallel retry rates. When any slot hits a 429 rate limit, all other slots cooperate by delaying their next execution until the rate limit resets, incorporating a randomized release jitter of `0ms ~ 1000ms` to prevent concurrent thundering herd hits.

## v3.10.15 - 2026-06-10

- Release title: Nano Banana Ultra 3.10.15 - Dynamic 429 Retry Delay
- Release summary:
    - Implemented dynamic retry delay parsing in `retryOperation` for 429 rate limit errors. If the server response specifies a concrete wait time (e.g. "Please retry in X.Xs"), the client waits exactly that duration (plus safety buffer and jitter) instead of forcing a 60-second cooldown, significantly speeding up recovery on fast-reset limits.

## v3.10.14 - 2026-06-10

- Release title: Nano Banana Ultra 3.10.14 - 429 Retry Optimization
- Release summary:
    - Optimized the 429 `RESOURCE_EXHAUSTED` rate limit retry strategy inside `retryOperation` by enforcing a minimum 60-second cooldown delay (plus random jitter) to give API quotas sufficient time to recover under severe rate limiting, aligning with the protective measures in the Lite version.

## v3.10.13 - 2026-06-06

- Release title: Nano Banana Ultra 3.10.13 - Batch Concurrency & Retry Jitter Optimization
- Release summary:
    - Optimized batch image generation for `quantity > 1` by increasing the staggered parallel request delay from `300ms` to `1000ms`, significantly lowering the API concurrency pressure.
    - Introduced a random retry jitter of `0ms ~ 1500ms` and reduced the safety buffer to `600ms` in `retryOperation` for 429/RESOURCE_EXHAUSTED errors to prevent synchronized concurrent retries (thundering herd effect) when multiple slots are throttled.
    - This optimization is introduced to align with the Lite version's rate-limiting measures for Google AI plans (e.g., Google AI Pro or Google AI Ultra subscriptions) in Google AI Studio, rather than paid pay-as-you-go developer APIs.

## v3.10.12 - 2026-06-05

- Release title: Nano Banana Ultra 3.10.12 - Gemini API 429 Retry Robustness
- Release summary:
    - Fixed an issue where Gemini API 429 rate limit exceptions (RESOURCE_EXHAUSTED) containing the word "quota" (e.g. "You exceeded your current quota...") were misclassified as deterministic quota errors and failed to trigger retry loops.
    - Relaxed the deterministic quota detection in `retryOperation` for 429 rate limit errors, implemented regex to parse dynamic retry cooldown time (e.g., "Please retry in X.Xs") from error messages, and extended the maximum retry delay constraint to 60 seconds.
    - This robustness enhancement is introduced to align with the Lite version's rate-limiting measures for Google AI plans (e.g., Google AI Pro or Google AI Ultra subscriptions) in Google AI Studio, rather than paid pay-as-you-go developer APIs.

## v3.10.11 - 2026-06-03

- Release title: Nano Banana Ultra 3.10.11 - LazyHistoryImage Src Warning Fix
- Release summary:
    - Resolved React console warnings and redundant duplicate page requests by passing `undefined` to `img` tags' `src` attributes when URLs are empty or initializing in `LazyHistoryImage.tsx` (`src={imageUrl || undefined}`).

## v3.10.10 - 2026-06-02

- Release title: Nano Banana Ultra 3.10.10 - Compact Snapshot Serialization & Empty Image Src Warning Fix
- Release summary:
    - Ported critical stability and warning fixes from the Lite version to the Full version.
    - Switched workspace snapshot JSON serialization inside `workspacePersistence.ts` to compact format by removing `null, 2` formatting parameter, preventing browser V8 engine Out-Of-Memory/Invalid string length crashes when serializing large base64 image datasets.
    - Resolved empty-string `src=""` console warnings and duplicate page request behaviors on standard HTML `<img>` elements by using `undefined` fallbacks:
        - Updated `GeneratedImage.tsx` (`src={activeImage || undefined}`)
        - Updated `HistoryPanel.tsx` (`src={tile.previewUrl || undefined}`)
        - Updated `ImageEditor.tsx` (`src={initialImageUrl || undefined}`)
        - Updated `ImageUploader.tsx` (`src={displayImage || undefined}`)

## v3.10.9 - 2026-05-31

- Release title: Nano Banana Ultra 3.10.9 - E2E Test Output Isolation & Fragile Backup Mechanism Cleanup
- Release summary:
    - Isolated E2E testing output state by introducing a dedicated `output-test/` directory to prevent E2E runs from polluting the developer's manual workspace.
    - Simplified the testing lifecycle by removing fragile backup and restore setup/teardown logic (`outputStateIsolation.ts`, `globalSetup.ts`, and `globalTeardown.ts`), ensuring workspace recovery works reliably even if tests are aborted.
    - Updated E2E test specs to verify output assets in the correct isolated test folder.
    - Resolved TypeScript compilation errors in `playwright.config.ts` regarding named exports of `defineConfig` for CommonJS/ESM module compatibility.

## v3.10.8 - 2026-05-29

- Release title: Nano Banana Ultra 3.10.8 - Legacy Model Normalization, Compatibility Protection & Extended Test Coverage
- Release summary:
    - Resolved a critical React runtime error (`supportsGoogleSearch` undefined crash) when loading old workspace snapshots containing deprecated preview image models.
    - Added a robust `normalizeSavedImageModel` persistence sanitizer helper to automatically migrate legacy model names to current official ones.
    - Augmented the `MODEL_CAPABILITIES` dictionary with legacy property aliases mapping deprecated strings to current valid capability objects as a dual-layer safeguard.
    - Extended unit test coverage in `workspacePersistence.test.ts` and `promptHelpers.test.ts` to verify legacy model validation, style sensitivity, and forensic visual protocol instructions.

## v3.10.7 - 2026-05-29

- Release title: Nano Banana Ultra 3.10.7 - Official Google Gen AI Model Name Migration
- Release summary:
    - Updated Google Gen AI image generation model names to their official standard names (`gemini-3.1-flash-image` and `gemini-3-pro-image`) across types, UI components, capabilities definition, request configs, test cases, and translations, in alignment with official Google Gen AI specifications.

## v3.10.6 - 2026-05-26

- Release title: Nano Banana Ultra 3.10.6 - Comprehensive TypeScript Type Error Fixes Across Frontend & Backend Plugins
- Release summary:
    - Resolved all remaining compilation errors and warnings to achieve 100% successful type-check (`tsc --noEmit`).
    - Frontend UI & Hooks: Refactored union types, narrowed conditional assignments, corrected component prop types, and updated type definitions in `types.ts`, components (`GeneratedImage.tsx`, `GroundingProvenancePanel.tsx`, `SketchPad.tsx`, `WorkspaceProgressDetailPanel.tsx`, etc.), and hooks.
    - Backend Plugins: Fixed type assertions for image models/sizes in `batchRoutes.ts` and `generateRoutes.ts`, typed response structures utilizing `GroundingMetadata`, resolved stream events in `writeNdjsonEvent`, and prevented closure-bound type narrowing regressions in `batchHelpers.ts`.
    - Testing Environment: Fixed named exports imports (`defineConfig`, `devices`) from `@playwright/test` in `playwright.config.ts`.

## v3.10.5 - 2026-05-26

- Release title: Nano Banana Ultra 3.10.5 - Fullscreen Image Viewer Overflow Fix
- Release summary:
    - Fixed a potential fullscreen image overflow in `WorkspaceViewerOverlay.tsx` by adding `h-full w-full` styling constraints to the image container `div` to ensure layout robustness.

## v3.10.4 - 2026-05-25

- Release title: Nano Banana Ultra 3.10.4 - Lite Feature Synchronization, App.tsx Code Fixes & Comprehensive Test Resolutions
- Release summary:
    - Synchronized key optimizations from the Lite version to ensure robustness. This includes a robust history continuation logic using `history.reduce` based on `createdAt` (independent of array order), and an extended window unload warning to guard draft prompt status and ungenerated reference assets.
    - Wrapped stage generation callbacks with stable hooks in `App.tsx` to prevent downstream `WorkspaceStageViewer` re-renders and optimize UI performance.
    - Fixed 5 critical TypeScript compiler warnings and errors in `App.tsx`, resolving `ResultPart` type narrowing (distinguishing `ResultTextPart` and `ResultImagePart`), `searchEntryPointRenderedContent` argument conversions, `ImageEditor` error bindings (`error?.summary`), and `setGroundingMode` signature mismatch.
    - Fully resolved all TypeScript compile errors and runtime test failures inside the `tests/` directory (including `useGroundingProvenanceView`, `useLegacyWorkspaceSnapshotMigration`, `debugTerminalEvents`, `LazyHistoryImage`, `SketchPad`, `officialConversationRequest`, `queuedBatchRequest`, `useComposerSettingsPanelProps`, `useWorkspaceOverlayAuxiliaryProps`, `QueuedBatchJobsPanel`, and `GroundingProvenancePanel`), achieving a 100% test pass rate with 882/882 tests passing successfully.

## v3.10.3 - 2026-05-25

- Release title: Nano Banana Ultra 3.10.3 - Image to Prompt Forensic Precision & First Switch Language Fix
- Release summary:
    - Enhanced the "Image to Prompt" feature detail resolution by incorporating a strict Visual Forensic Protocol in the system instructions to explicitly extract subject expressions, fabric/surface textures, multi-layer background elements, precise color hues, camera focus, and rendering properties.
    - Micro-adjusted the generation temperature to 0.3, enhanced the user prompt for forensic-level details, and updated the integration test suites.
    - Fixed a language switch bug where the "Image to Prompt" (Image-to-Prompt) tool would still generate English prompts on the first language switch. Wrapped `onImageToPrompt` with an arrow function to ensure it dynamically resolves to the latest handler reference instead of capturing a stale reference.

## v3.10.2 - 2026-05-23

- Release title: Nano Banana Ultra 3.10.2 - Gemini 3.5 Flash Model Upgrade
- Release summary:
    - Gemini model upgraded to 3.5 Flash:
        - upgraded prompt enhancement, random generation, and image-to-prompt routes from the old preview model `gemini-3-flash-preview` to the official `gemini-3.5-flash` model
        - upgraded safety content analysis tool (`identifyBlockKeywords`) to use the official `gemini-3.5-flash` model
        - updated integration test suites and assertions to verify payload structures against the updated `gemini-3.5-flash` model

    - Prompt tools logic enhancements:
        - added missing error toast notification (`showNotification`) inside the `handleSurpriseMe` catch block in the prompt tools hook to align error feedback with other tools
        - de-structured and enhanced the image-to-prompt output: updated `buildImageToPromptInstruction` and route contents to request an unstructured but highly comprehensive pure prompt with absolute forensic precision (describing primary subject details, environmental layers, lighting, color gradient, camera composition, and art medium styles) to eliminate headings that polluted the image generator while capturing maximum visual detail
        - redesigned the random prompt scaffolds into a 3-tier hybrid strategy: completely open-ended random generation, a semi-structured template framework, and an "anti-common-sense" pairing strategy to maximize surprise and variance
        - simplified outbound route content payloads for prompt enhancement and image-to-prompt to remove rules redundancy and prevent system instruction clashes (saving token usage and avoiding hallucination)
        - added style sensitivity rules inside prompt enhancer and random generator system instructions to preserve and enhance non-photorealistic art styles (such as Anime, vector art, watercolor, flat design) instead of injecting realistic photo camera tags (4k lens, cinematic lighting, realistic texture)

## v3.10.1 - 2026-05-21

- Release title: Nano Banana Ultra 3.10.1 - Workspace Reset Terminal Sync Clear
- Release summary:
    - workspace reset terminal sync clear:
        - clearing the workspace now automatically triggers a cleanup of the diagnostics terminal's local event history in localStorage, instead of keeping terminal traces persisted indefinitely
        - a workspace-clear synchronization event now propagates the clear command across active component trees so the terminal UI updates to empty immediately

## v3.10.0 - 2026-05-18

- Release title: Nano Banana Ultra 3.10.0 - Advanced Safety Controls & Grounding-Adjacent Sync
- Release summary:
    - adjustable Gemini safety controls inside Advanced Settings:
        - Ultra now exposes the four officially adjustable Gemini safety categories directly inside the existing Advanced Settings flow instead of keeping those thresholds hardcoded behind the scenes
        - harassment, hate speech, sexually explicit, and dangerous content can each be set to model default, off, block none, block only high, block medium and above, or block low and above through a subtle slider-based panel

    - safety panel regrouped under grounding with one-step batch alignment:
        - the Safety filters card now lives in the right column directly below Grounding mode so the control stays available without becoming a loud primary-surface setting
        - the expanded panel now includes one sync-all slider for aligning all four safety categories in one move, while still keeping individual per-category overrides available underneath

    - shared safety behavior across generation surfaces:
        - the same safety threshold state now persists through the workspace settings draft flow and continues to apply consistently across main generation and prompt-tool request paths instead of splitting into separate hidden contracts
        - saved workspace state and restored sessions keep the selected safety thresholds together with the rest of the composer configuration

## v3.9.0 - 2026-05-18

- Release title: Nano Banana Ultra 3.9.0 - Diagnostics Terminal & Correlated Local API Tracing
- Release summary:
    - hidden diagnostics terminal for workspace debugging:
        - Ultra now includes a hidden diagnostics terminal overlay opened from the top header, with request/response/error/stream/retry/log event capture in one place instead of leaving debugging scattered across browser tools and console output
        - the terminal keeps a local persisted event history with filtering by event kind, source, route, search text, and correlation id, and adds focused JSON inspection plus export/clear actions for session-level troubleshooting

    - broader frontend diagnostic instrumentation across real workspace flows:
        - interactive image generation, prompt tools, retry handling, workspace snapshot persistence, shared queued-batch space persistence, and image file save/load flows now emit structured debug events with redaction-safe summaries instead of exposing raw sensitive payloads
        - existing workflow log messages are now mirrored into the diagnostics terminal, so generation orchestration state can be read alongside transport-level request and response traces

    - backend request-id correlation across local API routes:
        - prompt, batch, workspace, image generation, live-progress streaming, and local image file routes now share one `X-NBU-Debug-Request-ID` correlation contract, echo that id on responses where applicable, and emit structured request/response/error logging through the local API helper layer
        - generate-stream and raw file-response paths now preserve the same correlation through stream open/complete/failure handling and file-backed image reads, making cross-layer tracing possible from the browser terminal all the way through the local backend route owners

## v3.8.1 - 2026-05-18

- Release title: Nano Banana Ultra 3.8.1 - Live Progress Ordering Drift Hardening
- Release summary:
    - live-progress ordering drift hardening:
        - live-progress streaming now continues emitting newly observed thought/result parts when provider chunks partially reorder or replace earlier stream content
        - stream summaries still mark these cases as `unstable-ordering` so Progress does not overclaim fully stable live progress

## v3.8.0 - 2026-05-16

- Release title: Nano Banana Ultra 3.8.0 - Lite Workspace Import Conversion & Local Output Recovery
- Release summary:
    - direct Lite workspace import with embedded image assets:
        - Ultra now accepts Lite workspace exports that embed `assets.savedImages` inside the workspace JSON instead of only handling the shared snapshot wrapper without the real image payloads
        - imported Lite workspace assets are converted before review so the imported workspace can open with usable local image references instead of silently dropping embedded image data

    - local output-file materialization for imported Lite assets:
        - embedded Lite images now save out as separate files inside the local `output/` folder with matching sidecar metadata instead of remaining trapped inside one giant JSON export
        - this conversion covers main generated images, saved thumbnails, embedded thought images, and stage-source assets so imported Lite workspaces can recover the same visual surfaces through the standard file-backed Ultra paths

    - safer repeated imports and truthful review feedback:
        - imported Lite asset filenames now dedupe safely on write instead of risking overwrite collisions when the same workspace is imported more than once
        - the import review now shows a conversion summary for embedded Lite assets, including how many were embedded, converted, renamed, or skipped before replace or merge actions proceed

## v3.7.2 - 2026-05-16

- Release title: Nano Banana Ultra 3.7.2 - Reference Image Persistence During History Viewing
- Release summary:
    - preserved workspace object and character references while viewing history:
        - opening or viewing another history image no longer silently clears the current object and character reference images
        - continue and branch actions from history now keep the current workspace references instead of discarding them through the shared history-selection path

    - explicit reference clearing remains intentional:
        - object and character reference images are removed only through the user-controlled clear-references action, while stage-source clearing and failed-turn state handling keep their existing behavior

## v3.7.1 - 2026-05-16

- Release title: Nano Banana Ultra 3.7.1 - Background Cancel Finalization & Safe Prep Unlock
- Release summary:
    - background finalization after cancel:
        - after canceling a multi-image run, the workspace now transitions into a dedicated finalizing state instead of leaving the whole foreground UI frozen until the canceled batch fully settles and writes completed results
        - the cancel action now hands off cleanly into background finalization while the run owner finishes persistence, history promotion, and cleanup

    - safe prep controls unlock during finalization:
        - while a canceled run is still finalizing, prompt editing and generation settings can now be adjusted immediately so the next idea can be prepared without waiting for all persistence work to finish
        - this early unlock is limited to safe prep surfaces only, keeping the broader generation contract truthful instead of pretending the run has fully ended before history commit is complete

    - history and viewer truthfulness preserved during the finalizing window:
        - fullscreen viewer, history-linked actions, and fresh generation actions remain locked until the completed results are formally written into history, so users cannot interact with half-finalized batch state
        - the composer now shows an explicit `Finalizing cancelled run` state and guidance instead of leaving an active cancel affordance visible after the cancel request has already been accepted

## v3.7.0 - 2026-05-16

- Release title: Nano Banana Ultra 3.7.0 - Per-Slot Preview Unlock, Partial Cancel Commit & Disconnect-Aware Batch Cancel
- Release summary:
    - preview-only unlock for interactive multi-image generation:
        - when a batch is generating, each ready preview tile can now be selected individually and shown on the main stage immediately instead of waiting for the full batch to finish
        - those early ready tiles stay as stage-only previews during generation, so fullscreen viewer and other history-linked actions remain locked until the batch is finalized into real history items

    - truthful partial cancel behavior for multi-image generation:
        - pressing `Cancel` now aborts only unfinished slots while preserving any already completed results, instead of holding the whole batch hostage until every slot resolves
        - completed results now commit cleanly into history after cancel, while canceled unfinished slots no longer surface as misleading failed preview/history entries
        - generation cancel ownership now stays with the generation orchestrator, avoiding premature local unlock races from UI action handlers

    - disconnect-aware backend abort handling:
        - the local generate and generate-stream routes now bind client disconnects to a route-level abort controller, pass that abort signal through the Gemini request config, and stop writing stream/failure payloads after disconnect
        - this keeps canceled or disconnected interactive batch runs from continuing to generate and emit stale late results after the client has already gone away

## v3.6.8 - 2026-05-14

- Release title: Nano Banana Ultra 3.6.8 - Gemini Enum Request Alignment
- Release summary:
    - Gemini request enum alignment for AI Studio and SDK-backed image flows:
        - interactive Gemini image requests now keep app-facing thinking states such as `minimal`, `high`, and `disabled` in product state while converting outbound `thinkingLevel` values to official Gemini enum tokens only at the API boundary
        - disabled thinking now omits `thinkingLevel` from outbound Gemini requests instead of sending a non-existent disabled enum value

    - centralized outbound Gemini request constants:
        - response modalities and permissive safety settings now resolve through one shared Gemini API config helper, keeping outbound `IMAGE` / `TEXT` modalities and existing `BLOCK_NONE` safety behavior consistent across request paths
        - prompt-helper paths continue using the same centralized permissive safety settings contract instead of maintaining duplicate local definitions

    - preserved batch-safe request shaping:
        - queued batch request shaping now continues to exclude interactive-only thinking config while preserving the existing batch-safe image, modality, temperature, and safety-setting behavior

## v3.6.7 - 2026-05-06

- Release title: Nano Banana Ultra 3.6.7 - Precise Workflow Labels, Status Copy Refresh & Deterministic Saved Filenames
- Release summary:
    - precise workflow label normalization across runtime surfaces:
        - generation mode handling now resolves through one shared normalization helper instead of repeated local `includes(...)` checks, so text-to-image, reference-image generation, follow-up edit, editor edit, retouch, and reframe all map through one canonical runtime contract
        - generated-image cards, queued batch panels, provenance surfaces, import-review summaries, workspace generation context, and provenance continuation logic now use the same workflow semantics and localized label resolution instead of mixing fragile English substring checks with hard-coded fallback text

    - broader workflow-label localization parity:
        - maintained locale dictionaries now include dedicated precise workflow keys for `Text to Image`, `Reference Image Generation`, and `Editor Re-render`, so the product no longer falls back to older short labels or English-only wording on those workflow surfaces
        - queued batch and viewer-facing workflow readback now consistently show the newer precise workflow naming family, including localized editor rerender wording and the new reference-image generation label instead of older mixed `Img2Img`-style shells

    - refreshed shell branding and runtime status copy:
        - the fixed workspace footer now reads `Powered by Gemini AI`, matching the updated product branding instead of the older Gemini footer wording
        - header health chips now use the shorter `Server` and `API Key` naming family across maintained locales instead of the older `Local API` and `Gemini Key` labels, while preserving the existing translation-driven runtime path

    - deterministic model-aligned saved filename contract:
        - interactive generation and queued batch import now save primary images with one explicit filename-stem helper using `{modelId}_{yyyyMMdd-HHmmss}_{slotNumber}-{shortId}_{workflowSlug}`, so saved filenames align with the actual model id and workflow instead of older prefix-plus-random naming
        - workflow slugs now stay stable and ASCII-safe through the saved filename contract, with canonical values such as `txt2img`, `ref2img`, `followup`, `editor-edit`, `editor-retouch`, and `editor-reframe`
        - result-part images now derive from the same saved primary basename when available, and newly generated thumbnails continue following the saved primary basename through the `-thumbnail` suffix instead of drifting onto unrelated stems

## v3.6.6 - 2026-04-23

- Release title: Nano Banana Ultra 3.6.6 - Stage-Image Wording Parity, Locked Reference Ratio Priority & Visible Ratio-Switch Feedback
- Release summary:
    - unified stage-image wording across maintained locales:
        - stage follow-up actions now consistently use the newer `stage image` naming family instead of older mixed `this image` wording, so continue, queue, source labels, and follow-up-source surfaces all describe the active stage source with one product vocabulary
        - maintained locale dictionaries now keep the same stage-image wording contract across action buttons, queue actions, source badges, and follow-up metadata instead of mixing older literal or context-specific variants

    - locked leading-reference aspect-ratio policy:
        - automatic aspect-ratio selection now derives from the leading ordered reference asset rather than loosely from uploaded-reference lists, so the active ratio always follows the reference that actually owns the front position in the workspace
        - uploaded reference images still pick the nearest supported output ratio from their real image dimensions, while a saved sketch reference now carries its own ratio metadata and can drive composer ratio selection directly without being reinterpreted through image probing

    - sketch-first reference priority and stable slot behavior:
        - when a sketch reference is added, it now stays pinned at the front of the reference list and takes precedence over later uploaded references for automatic ratio control
        - if reference capacity is already full, adding a front-priority sketch now removes the trailing existing reference instead of displacing the sketch, keeping the sketch as the first active reference under the fixed ordering policy
        - sketch-derived ratio context now survives workspace persistence paths so restored workspaces keep the same sketch-priority ratio behavior instead of losing that state after save or reopen

    - truthful ratio-switch notifications:
        - whenever automatic ratio selection changes the composer to a different supported ratio, the workspace now shows a toast announcing the new `X:Y` value so the switch is visible instead of silent
        - ratio-change notifications and related workspace logs now fire only on real ratio changes, avoiding repeated noise when the leading reference updates but resolves to the same effective aspect ratio

## v3.6.5 - 2026-04-22

- Release title: Nano Banana Ultra 3.6.5 - Grouped Queue Tracking, Localized Runtime Labels & Cleaner Detail Navigation
- Release summary:
    - grouped queued-batch submission tracking:
        - queued quantity now fans out into separate official batch jobs instead of one multi-request child payload, and the queued-jobs panel regroups those sibling jobs under one submission card with per-item numbering, grouped status chips, and clearer import/open cleanup flows
        - restored queue space now keeps only submission-group-aware batch records, so older legacy queue entries that cannot round-trip through the grouped tracking model no longer come back as misleading import-ready jobs

    - broader runtime localization parity:
        - output format, thinking level, grounding mode, aspect-ratio labels, and temperature readback now resolve through translation-backed runtime labels across advanced settings, shared controls, viewer metadata, provenance details, and picker/tooltips instead of mixing localized shells with hard-coded English control text
        - maintained locale dictionaries now carry matching runtime wording for queue launchers, queue actions, queued-result badges, import-review execution labels, and advanced-settings summaries so the shell reads as one coherent localized product surface

    - cleaner support and reset guidance surfaces:
        - the Progress and Support detail views now open directly from the top launcher rail without the older in-modal tab chip switcher, keeping those support surfaces as single-purpose detail entries instead of one shared tabbed header
        - Clear Workspace guidance now tells the truth about what resets locally versus what stays available in the shared queued-batch space, and recommends exporting the workspace before destructive reset

    - all-locale queue wording cleanup:
        - queue stage, reference-driven, prompt-only, and follow-up wording was rewritten across maintained locales so queued actions consistently distinguish fresh batch submission from stage-image continuation instead of reusing older mixed or overly literal phrasing
        - history and imported-result surfaces now use the newer queued-result naming family, aligning the queue launcher, queued jobs panel, and restored-result badges under the same product vocabulary

    - prompt textarea lane refinement:
        - the main prompt textarea now keeps its native scrollbar in a dedicated lane between typed content and the inline clear / Enter-behavior controls instead of leaving the scrollbar pinned to the far-right edge of the whole prompt card
        - the inline clear button and vertical Enter toggle now share one local right-side spacing contract, so both controls shift right together while staying aligned with the textarea reserve width

## v3.6.4 - 2026-04-21

- Release title: Nano Banana Ultra 3.6.4 - Canonical Empty-Workspace Baseline, Queue Truth & Composer Shell Refinement
- Release summary:
    - canonical empty-workspace baseline:
        - fresh workspace load and `Clear Workspace` now resolve through one explicit empty-workspace composer baseline, keeping `Nano Banana 2`, `1:1`, `2K`, `1x`, `Images only`, `1.0`, `Minimal`, and `Grounding Off` aligned as the shared reset/start point

    - finer temperature control:
        - advanced settings temperature slider and numeric input now move in `0.05` increments instead of `0.1`, allowing narrower generation tuning without forcing a full tenth-step jump
        - temperature values now stay on one shared `0.05` contract across settings edits, viewer-applied settings, restored workspaces, generated metadata, and request assembly instead of drifting between different paths

    - more truthful temperature readback across surfaces:
        - advanced settings, composer summaries, shared controls, and viewer metadata now all render temperature with one decimal when exact and two decimals only when needed
        - values such as `1.05` now reopen, summarize, and round-trip as `1.05` instead of being flattened to `1.1`

    - truthful fresh-vs-follow-up generation and queue semantics:
        - `Generate` now stays a fresh prompt-driven action even when a stage image is visible, instead of silently switching into staged-image continuation behavior
        - `Continue with this image` is now the dedicated stage-image follow-up path, and queued submission mirrors the same split through `Queue` and `Queue with this image`
        - queue mode wording now tells the truth when a staged image is being ignored for a fresh queued generate, while reference-backed requests still surface as image-conditioned or mixed-mode flows where applicable

    - unified queue actions and top-shell queue ownership:
        - queue submit actions now sit directly with the main generate actions inside the composer action card instead of reading as a separate footer-owned workflow
        - queued submit wording was shortened to the final `Queue` and `Queue with this image` action labels, matching the fresh-vs-follow-up split and the main generate action pattern
        - the standalone queue-status entry moved out of the composer footer and into the desktop top launcher rail beside `Progress` and `Support`, so queued batch details now open from one shared shell-owned entry point

    - compact inline Enter behavior control:
        - the Enter behavior control now lives inside the prompt textarea as a compact vertical toggle instead of an external action strip
        - the selected thumb now stays visually aligned with the real send/newline mode instead of drifting out of sync with the active behavior
        - maintained locale dictionaries now use fixed two-line Enter labels so the compact toggle width stays stable across languages instead of relying on natural wrapping heuristics
        - prompt safe-area spacing around the inline Enter toggle and clear button was tightened so the bottom and right text clearance better match the top inset

    - desktop shell and reset-flow polish:
        - the desktop top shell now uses a `40/60` split between the main header bar and the launcher rail, and the right rail renders equal-width `Progress`, `Support`, and `Queue` launchers
        - `Clear Workspace` confirmation now opens through the app-level overlay stack instead of an inline history-panel overlay, so the reset dialog presents as one top-layer modal over the workspace shell

## v3.6.3 - 2026-04-20

- Release title: Nano Banana Ultra 3.6.3 - Leaner Shell Ownership, Narrower Settings Surfaces & On-Demand Detail Panels
- Release summary:
    - leaner workspace shell ownership:
        - editor entry state, batch preview and progress state, detail-modal state, queued-batch detail state, and floating shell control ownership now live behind dedicated workspace shell hooks instead of being scattered inline across the main app surface
        - Progress, Sources, and viewer-provenance state now derive through dedicated shell paths, keeping active detail views, restored workspaces, and archived-turn support flows aligned through one shared ownership model

    - narrower settings and picker surfaces:
        - generation settings, advanced settings, and picker-sheet flows now consume surface-specific contracts instead of inheriting older wide compatibility prop sets from the full composer toolbar path
        - advanced settings now runs on an explicit minimal settings contract, while the composer, picker, editor, and stage surfaces no longer carry stale props that had stopped affecting runtime behavior

    - on-demand detail panels:
        - Progress, Sources, Versions, and Queued Batch Jobs detail panels now load only when their detail surface opens instead of being bundled into the initial workspace shell payload
        - the initial workspace shell stays lighter while preserving the same detail modal and support-surface workflows after open

    - dead shell residue removal:
        - removed leftover no-longer-shipped workspace wording and stale shell traces tied to retired prompt-history, template, old header-counter, and obsolete stage-context paths
        - shared controls, viewer, generated-image, editor, and import-review paths now expose only the runtime inputs that still belong to the current product surface

## v3.6.2 - 2026-04-19

- Release title: Nano Banana Ultra 3.6.2 - File-Backed Batch Source, Response-File Import Readiness & Queue Continuation Policy
- Release summary:
    - file-backed official batch transport:
        - queued batch creation now uploads queue input images through the File API, writes newline-delimited batch request manifests, uploads that manifest as a reusable file resource, and creates official batch jobs from that uploaded source instead of relying on inline request arrays
        - queued batch request assembly now uses a dedicated manifest-normalization path, preserving queue-supported image settings while removing interactive-only controls that do not belong in the official image batch manifest shape

    - response-file import readiness and failure truth:
        - queued batch import now supports response-file-backed jobs, so completed batches can be imported from downloaded JSONL result payloads rather than depending only on inline response bodies
        - queued job readiness now tracks whether a batch has any importable payload, including downloaded response files, so `no payload` and `extraction failure` remain separate product states instead of collapsing into one generic import outcome
        - queued batch finish reasons now surface as readable humanized detail instead of collapsing into generic fallback wording when the provider returns a concrete non-neutral finish reason

    - queued job continuation policy:
        - Independent send can queue both composer stage-image submissions and queued editor edits as standalone batch jobs without implying official memory continuation
        - Memory send can queue only from a fresh new-conversation state, while editor queue stays hidden in memory mode instead of appearing as a supported continuation path

## v3.6.1 - 2026-04-19

- Release title: Nano Banana Ultra 3.6.1 - Viewer Settings Apply, Stable Viewer Context & Truthful Viewer Metadata
- Release summary:
    - viewer settings reuse from history:
        - added `Apply Settings to Composer` in the viewer so a viewed history item can send its generation settings back to the composer without replacing the current prompt
        - viewer-applied settings now respect the viewed model’s supported controls, so unsupported ratios, sizes, thinking modes, and grounding options fall back to valid composer state instead of surfacing mismatched values

    - calmer viewer browsing flow:
        - browsing different history items inside the viewer no longer immediately changes branch source, continue source, or other lineage-linked workspace context
        - the viewed item stays as a preview until the viewer closes or the user applies something back to the main workspace

    - cleaner workspace history after clear:
        - `Clear Workspace` no longer leaves behind empty history cards that have no real prompt or image content
        - restore and history views now ignore those ghost entries while keeping legitimate placeholders that still contain meaningful state

    - more truthful viewer metadata:
        - saved history items and reopened viewer entries now show settings and metadata that match what the selected model could actually honor
        - models that do not support requested size or certain advanced options no longer reopen with stale or misleading values in the viewer
        - requested size and actual output size are now treated separately in the viewer, so reopened items do not imply unsupported requested settings

    - clearer prompt tool failure feedback:
        - `Auto Rewrite` and `Image to Prompt` now show an immediate localized failure toast on the main workspace surface when the helper request fails
        - invalid image input still uses its dedicated validation toast instead of stacking an extra generic failure message

## v3.6.0 - 2026-04-18

- Release title: Nano Banana Ultra 3.6.0 - Independent Batch Space, Truthful Queue Import State & Clearer Queue Action Naming
- Release summary:
    - independent queued-batch space and persistence:
        - queued batch jobs now live in their own app-level batch space instead of being stored as part of the current workspace snapshot, so switching workspaces, restoring snapshots, and resetting a workspace no longer makes queued jobs appear to belong to one workspace
        - added a dedicated queued-batch persistence contract with its own local storage key and shared backup route, allowing tracked jobs to survive reloads and workspace changes without reintroducing workspace ownership
        - workspace snapshot save, restore, import, export, and reset flows now treat queued jobs as external shared state rather than as workspace content
        - legacy workspace snapshots that still carried queued jobs are now normalized into the dedicated batch-space model instead of preserving the older coupled ownership pattern

    - truthful queued-batch import and recovery semantics:
        - removed the older recent-job recovery model and the extra queue-list backend route, so the product no longer implies that queued jobs can be rediscovered from workspace-local context after the fact
        - queued-batch import, open-imported-results, and related action truth now derive from imported history in the currently active workspace instead of relying on a cross-workspace imported flag such as `importedAt`
        - completed queued jobs remain in the dedicated batch space after import, while workspace-local affordances such as reopening imported results stay scoped to the workspace that actually imported them
        - queued job normalization, polling state, and import-ready logic now reflect the shared batch-space contract consistently across runtime persistence, restore flows, and queued-job utilities

    - clearer queue action naming:
        - renamed the queue submit action to `Send to Queue` while keeping the status surface titled `Queued Batch Jobs`, making the submit action and the queue-status entry clearly distinct
        - aligned queue helper copy and accessibility labeling with the submit-vs-status split, and propagated the same submit wording to other queue-submit surfaces such as the editor

    - reset and restore alignment for shared batch space:
        - reset workspace now clears workspace-local snapshot state immediately while intentionally preserving the shared queued-batch space, so reset no longer implies that batch-space jobs are part of the workspace being cleared
        - workspace snapshot persistence now writes the empty local workspace state eagerly during reset, preventing stale prompt or history state from surviving into a fresh reload while the shared queued-batch space remains available

    - localized queue wording and queue-state UI alignment:
        - updated maintained locale dictionaries so the new queue submit wording and related queue terminology stay consistent outside English
        - refreshed queue-related component, translation, and restore-flow contracts to match the dedicated batch-space model and the clearer queue action naming

## v3.5.8 - 2026-04-18

- Release title: Nano Banana Ultra 3.5.8 - Localized Failure Surfaces & Adaptive Compact Composer Layout
- Release summary:
    - localized stage and failure surfaces:
        - failed stage messages, reopened failed history turns, queued batch import errors, and related failure notices now all render through one shared canonical failure formatter, so visible error copy stays aligned with the current UI language instead of leaking raw provider wording or mixed-language fallback text
        - restored and already-saved failed history items now rebuild canonical failure metadata from legacy stored error text plus persisted response hints, so older workspace snapshots can relocalize correctly after reopen instead of freezing previously saved language output
        - dynamic failure values such as policy block reasons, finish reasons, and blocked safety categories now resolve through maintained locale dictionaries rather than surfacing raw enum tokens like `IMAGE_SAFETY` or `PROHIBITED_CONTENT` directly to users
        - stage error state now preserves both raw failure context and localized display state separately, allowing the active stage failure message to refresh cleanly when the UI language changes or when a failed history item is reopened onto the stage

    - always-open composer tools on non-desktop layouts:
        - removed the outer composer Image Tools collapse on non-desktop layouts so the tool surface is visible immediately instead of requiring an extra expand step before use
        - removed the outer composer Advanced settings collapse on non-desktop layouts so the advanced-settings entry point stays directly available in compact composer flows
        - kept References as its own separate inner toggle so compact layouts still avoid forcing the full reference uploader open by default

    - image-tools layout now adapts to the composer slot position:
        - when Image Tools is stacked above the instruction textarea, the Image Tools body now switches to a two-column layout with Upload Image To Repaint and Repaint Current Image on the left and Draw Reference Sketch plus References on the right
        - when Image Tools sits to the left of the instruction textarea in the side-by-side composer layout, the Image Tools body stays in the original single-column stack instead of adopting the two-column grouping

## v3.5.7 - 2026-04-17

- Release title: Nano Banana Ultra 3.5.7 - Queued Batch Import Detail, Safer Queue Profile & Clearer Queue Cards
- Release summary:
    - queued-batch import detail and restore persistence:
        - queued batch jobs now keep structured per-result import issues instead of only collapsing all-failed imports into one summary string, so different failures inside the same batch can stay visible after import attempts
        - the queued jobs panel now renders those indexed import issue lines directly on the job card, making mixed outcomes such as no-image, text-only, and timeout-style failures readable without opening local storage or dev tools
        - queued batch import issue detail is now preserved through workspace snapshot persistence and restore, so reopened workspaces keep the same failed-import context on tracked queue cards

    - queue-only safer request profile:
        - queued batch submission now normalizes to an image-only batch profile instead of inheriting interactive text-plus-image output settings, reducing cases where queued jobs complete without importable image bytes
        - queued batch submission now explicitly disables returned thoughts for the queue path while leaving normal interactive generation behavior unchanged
        - the queue-mode tooltip wording now states that queued jobs use image-only output and do not request returned thoughts, so the queue action no longer silently differs from the currently visible interactive advanced settings

    - authoritative queued-job counts and visible batch resource names:
        - recovered and refreshed queued jobs now correct stale local request counts using authoritative remote batch data, including inline response counts when Gemini omits `batchStats.requestCount`
        - queued batch import also corrects stale request counts from the returned import result length when the provider still does not send batch request counts, keeping imported history sidecar metadata aligned with the real batch size
        - queued job cards now display the authoritative request count instead of relying only on the older local seed count, fixing recovered jobs that previously stayed stuck at `1 request(s)`
        - queued job cards now show the raw `batches/...` resource name directly on the card, so remote batch lookup and re-import troubleshooting no longer depend on local storage inspection

## v3.5.6 - 2026-04-17

- Release title: Nano Banana Ultra 3.5.6 - Failed Thought Rediscovery, Progress Failure Cues, App-Scoped Vitest Contracts & Style-First Prompt Recipes
- Release summary:
    - Progress-only failed thought rediscovery:
        - kept failed-generation thinking review inside the existing Progress path rather than broadening failed entry points into the main viewer, filmstrip, or versions surfaces
        - broadened archived Progress derivation so thought-bearing failed turns from full workspace history are merged into the archived Progress navigator, allowing failed thought text and thought images to be reopened even when the failed turn is no longer the active history selection
        - preserved selected Progress entry precedence during dedupe so explicitly reopened failed turns continue to surface their own persisted thought artifacts instead of being replaced by success-first branch summaries
        - added a small failed status chip in the archived Progress navigator and selected detail header, making failed thought streams recognizable without introducing extra CTA surfaces elsewhere in the workspace
        - kept the Progress support-rail signal active when archived failed thought artifacts exist, so persisted failed thinking remains discoverable through Progress after generation failure

    - app-scoped Vitest entry contracts:
        - added a dedicated `vitest.config.ts` at the app root so unit-test discovery, test-directory boundaries, and project alias resolution now live in one explicit project-scoped contract instead of being inferred from whichever working directory launched Vitest
        - updated the supported unit-test runners to point explicitly at that app-scoped Vitest config, including the repo wrappers and VS Code launch entries, so project-local testing stays anchored to `App-Nano_Banana_Ultra` while the parent workspace can still keep shared task and launch surfaces
        - kept `vitest` and `jsdom` isolated inside `dev-environment/` while making the supported `npm run test -- ...` and wrapper-driven unit-test paths resolve through the project contract instead of depending on bare `npx vitest` behavior or root-level dev dependencies

    - style-first prompt recipes and cross-path style consistency:
        - replaced the older suffix-only style prompt assembly with a shared style-first prompt builder so selected styles are now front-loaded as the governing visual treatment instead of being appended as trailing descriptor noise after long user prompts
        - changed the final image prompt structure to separate selected style, style directive, style anchors, and subject-scene intent, making prompt-heavy requests keep the chosen style dominant while still preserving the user's requested content and composition intent
        - applied that shared style prompt builder across interactive single-image generation, live-progress streaming requests, and queued batch submission so style behavior no longer diverges between those request paths
        - added a stronger per-style prompt directive for every active style in the central style registry, giving each style an explicit high-level rendering instruction in addition to its existing anchor descriptors so related styles can separate more clearly
        - upgraded style-transfer fallback prompts to use the same selected-style, directive, and anchor structure, so reference-image style transfer and style-only fallback requests now speak the same stronger prompt language as normal image generation
        - preserved existing style ids, labels, and normalization behavior while strengthening only the prompt contract, so stored style selections remain compatible with the current workspace, history, and sidecar metadata flows

## v3.5.5 - 2026-04-16

- Release title: Nano Banana Ultra 3.5.5 - Response Removal, Live Progress Streaming, Failure Persistence, Fan-Out & Capability Probe
- Release summary:
    - response-surface removal and Progress-first support flow:
        - removed the remaining user-facing `Response` surface from the top support rail, support-detail modal flow, and viewer overlay so the workspace support model now stays focused on `Progress` and `Sources`
        - removed the viewer-side standalone result-text presentation because the current image-generation paths do not reliably produce a separate user-facing text result worth keeping as a primary surface
        - preserved ordered provider result artifacts end to end through a shared `resultParts` contract that distinguishes thought text, output text, thought images, and output images instead of flattening everything into one generic text field
        - changed Progress to render chronological thought artifacts from those structured result parts, so persisted and reopened turns can show mixed thought text plus thought images in the same ordered stream
        - widened the desktop Progress detail modal so the thinking surface can support a broader two-column reading layout without changing the Sources modal width
        - replaced the older mixed Progress / Workflow / latest-thought / all-thought stack with a clearer structure that keeps only a compact Progress summary plus Workflow summary at the top and moves detailed reading into a dedicated master-detail body
        - split Progress navigation into separate live-slot and archived-turn sections, so active multi-image thought streams no longer compete visually with archived history in one flattened list
        - changed the selected-detail side to show one chosen live slot or archived turn at a time, including prompt preview, chronological thought text and thought images, and lightweight status cues for live state
        - changed default Progress selection to prefer the first live slot while generation is active and otherwise fall back to the newest archived thought entry, while still preserving manual user selection until that entry disappears

    - real-time live progress transport and truthful Progress activation:
        - added a dedicated `/api/images/generate-stream` NDJSON route for eligible interactive image requests so thought parts can arrive incrementally before the final image completes instead of only appearing after the full response finishes
        - changed the client generation service to prefer the live stream path for eligible single-image interactive requests and fall back to the existing blocking route only when the stream path is unavailable before any live event arrives
        - added App-level transient live-progress session state so in-flight streamed thought parts are merged directly into the Progress surface while generation is active rather than waiting for final history persistence
        - tightened the Progress signal so it lights up only when real thought artifacts exist, instead of activating merely because generation is currently running
        - added live-progress truthfulness tracking around transport-opened state, ordering stability, visible pre-completion thought artifacts, hidden thought-signature presence, and final-render arrival so the app can distinguish true live thought progress from weaker or misleading provider behaviors

    - failure persistence, multi-slot fan-out, and selected failed-item visibility:
        - changed streamed failure handling so stable pre-failure thought artifacts are merged back into failed partial responses when the provider emits visible thought parts but never produces a final image, preventing those failure-side process artifacts from disappearing at completion time
        - extended live-progress events with slot and batch-session metadata so interactive multi-image requests can be tracked as independent slot streams without introducing a separate transport contract
        - moved eligible `interactive-batch-variants` image generation onto a bounded per-slot fan-out path, letting multi-image interactive runs expose live slot progress instead of staying locked behind one shared blocking batch request
        - changed App live-progress state to track slot-scoped batch sessions and render active slot progress in parallel panels inside `Progress`, replacing the earlier merged multi-slot feed with independently readable per-slot streams
        - preserved failed history-turn artifacts through reopen and selection flows, so stored `thoughts` and `resultParts` survive failed-stage transitions instead of being cleared when the failed item becomes the active selection
        - changed archived Progress derivation to prioritize the explicitly selected history item, including failed turns, ahead of successful branch summaries so selecting a failed item now surfaces its own persisted thought text and thought images after completion or restore

    - explicit capability gate and live acceptance matrix:
        - introduced a dedicated live-progress capability matrix keyed by model, execution mode, output format, thinking level, and `includeThoughts`, replacing the looser earlier assumption that any streaming-capable path should surface live Progress
        - restricted live-progress eligibility to truthful interactive paths such as batch-size-1 `single-turn` and `chat-continuation` requests with visible-thought support enabled, while keeping unsupported paths out of the live Progress contract
        - added a `/api/images/live-progress-probe` route so finer-grained capability cells can be exercised against real provider behavior instead of relying only on static capability tables
        - aligned the shipped runtime truth so excluded model paths, including current `gemini-2.5-flash-image` live-thought cases, stay outside the live Progress acceptance contract even if other image generation flows remain available

    - repo-tracked dev environment and app-scoped workspace execution:
        - moved Vitest, Playwright, jsdom, and Prettier into a dedicated `dev-environment/` manifest with its own lockfile so the root product manifest stays limited to runtime, UI, and build dependencies
        - added repo-local install, test, e2e, format, and SDK-search wrappers so local tooling no longer depends on hard-coded VS Code internal tool paths
        - hardened app-scoped execution by pinning `cwd` to `App-Nano_Banana_Ultra`, preventing tests and generated output from drifting outside the app directory
        - promoted `tests/`, `e2e/`, and `playwright.config.ts` from local-only assets to tracked repository contracts so clean clones receive the same verification surface already implied by the tracked dev-environment manifest and wrapper scripts
        - kept generated artifacts such as `output/`, `coverage/`, `test-results/`, and `playwright-report/` ignored, so the repository continues to track source and contracts rather than local runtime byproducts
        - reserved `tests-local/`, `e2e-local/`, and `playwright.local.config.ts` as ignored scratch space for personal experiments and one-off debug flows instead of mixing them into the shared test surface

## v3.5.4 - 2026-04-15

- Release title: Nano Banana Ultra 3.5.4 - Interactive Failure Truthfulness, Structured-Output Removal & Explicit Finish-Reason Handling
- Release summary:
    - interactive failure truthfulness and localized error rendering:
        - unified interactive image failure classification around the shared `utils/generationFailure.ts` helper so the live generate route, failed-stage rendering, failed-history reopen flows, and batch-import parity all read from the same canonical failure contract instead of mixing raw strings with local fallback rewrites
        - expanded `/api/images/generate` failure payloads so the frontend now receives structured failure metadata including failure code, finish reason, prompt-block reason, extraction issue, and blocked safety categories rather than having to infer stage copy from generic error strings alone
        - changed failed stage and reopened failed history items to render localized summary-plus-detail error states, keeping the canonical failure metadata intact while removing the older reliance on opaque backend English error text as the primary user-facing message
        - added explicit image-model safety handling for finish reasons such as `IMAGE_SAFETY`, `IMAGE_PROHIBITED_CONTENT`, `BLOCKLIST`, and `PROHIBITED_CONTENT`, so blocked image generations now surface as safety-filter failures instead of falling through to generic no-image or missing-parts messaging
        - replaced the earlier `server received an incomplete model response` wording with neutral insufficient-signal copy when the provider returns too little evidence to identify a trustworthy cause, while still preserving technical extraction detail such as missing candidates or missing content parts
        - when one result in the same interactive batch is explicitly safety-blocked and another result remains ambiguous, the ambiguous failed item can now carry a UI-only contextual note that it may have been suppressed for the same reason without rewriting its canonical failure classification
        - adjusted failure classification so explicit non-neutral finish reasons such as `IMAGE_OTHER` now take precedence over structural extraction fallbacks like `missing-parts`, allowing those cases to surface as truthful `no image data` failures with the returned finish reason instead of being collapsed into the generic insufficient-signal path
        - preserved extraction diagnostics alongside those finish-reason-driven failures so product surfaces and future debugging can still inspect whether the provider returned missing candidates, missing parts, or other partial response shapes without losing the higher-signal finish reason
        - separated visible text content from internal thought-summary content inside the shared failure helper, so thought-only no-image responses no longer collapse into the misleading `text-only` failure path
        - thought-summary-only failures now surface through the broader `no image data` path with explicit detail that only thought summaries were returned, which better matches the live provider payloads observed during structured-output research

    - structured-output verification and shipped runtime removal:
        - added a real-provider structured-output matrix harness covering `gemini-3-pro-image-preview`, `gemini-2.5-flash-image`, schema transport, and prompt-instruction control paths, so the product no longer relies on docs-only capability assumptions for image-model structured outputs
        - disabled app-facing structured-output generation on the current image-model paths after live verification showed that `gemini-3-pro-image-preview` falls into `STOP` plus no-image thought-only responses on schema requests and `gemini-2.5-flash-image` rejects schema transport with `JSON mode is not enabled for this model`
        - treated prompt-instruction transport as research evidence only rather than a shippable fallback, because it was not reliable enough to preserve the product contract of trustworthy structured JSON returned alongside image generation
        - removed structured-output request transport, schema plumbing, structured-data parsing, viewer and response rendering, advanced-settings controls, and reuse actions from the active product surface instead of keeping a partial legacy compatibility path
        - preserved the image-to-prompt flow while simplifying results to plain response text and failure metadata, so the workspace no longer advertises or renders structured-output behavior anywhere in the active runtime

    - small UI polish:
        - the main composer style strip now renders `Style: None` with muted neutral styling instead of the active fuchsia accent, so unset style state appears visually distinct from active style selections
        - tightened the Enter behavior toggle in the generate card so it uses less space on both desktop and mobile while preserving the same two-state vertical interaction

    - product-repo surface alignment:
        - clarified in the official README that the formally tracked repo surface is limited to product runtime, UI, and build concerns, while local-only development assets such as `docs/`, `tests/`, `e2e/`, Playwright config, and Prettier config remain outside the published repo contract
        - removed tracked test, e2e, and formatter scripts from `package.json` and dropped the Vite test block so the shipped repo entry points no longer advertise local-only tooling that is intentionally excluded from the formal product repo surface

## v3.5.3 - 2026-04-14

- Release title: Nano Banana Ultra 3.5.3 - Unified Generate Bar, Primary Enter Routing & Composer Enter Copy Refresh
- Release summary:
    - unified composer generate bar and embedded Enter control:
        - rebuilt the composer bottom action area into one full-width generate surface instead of the earlier split layout, so the primary generate controls now read as one continuous action bar across the composer width
        - moved the Enter behavior control into the far right of that same generate surface and restyled it as a vertical two-state toggle, aligning it more closely with the existing send-intent toggle language while keeping the interaction dedicated to keyboard behavior
        - tightened the selected Enter toggle geometry so the active top or bottom state now follows the outer control corners instead of reading as a smaller inset pill

    - Enter now follows the visible primary generate action:
        - pressing Enter in the composer now always routes through the same primary CTA logic shown on screen instead of bypassing it, so keyboard submit stays aligned with the current action state
        - when no stage image is active, Enter triggers the main `Generate` action; when a stage image is active, Enter triggers the staged-image primary action instead of falling back to a fresh-generate path

    - composer Enter wording refresh across maintained locales:
        - updated the Enter behavior labels from the older short chip wording to the clearer `Press Enter to Send` and `Press Enter for New Line` phrasing
        - propagated the same wording intent across the maintained localized composer dictionaries so the refreshed Enter behavior copy stays consistent outside English

    - style hard migration and selector cleanup:
        - promoted `Vintage Polaroid` to the broader canonical style `Vintage Instant Photo` and promoted `Comic Book` to `Comic Illustration`, so new state now writes the updated style ids while restored legacy workspace snapshots, history items, queued jobs, and saved sidecar metadata are upgraded into the new canonical names automatically
        - moved style icon rendering onto shared registry-driven icon ids instead of keeping one large style-name switch inside the selector, which keeps the category browser unchanged while making future style maintenance and additions less repetitive
        - tightened the rewritten style descriptors so broad styles stay reusable without locking the output into overly specific scene assumptions, especially across `Vintage Instant Photo`, `Comic Illustration`, `Cyberpunk`, `Vaporwave`, `Fantasy Art`, `Graffiti`, `Neon`, `Doodle`, and `Miniature`
        - added maintained-locale labels for the new canonical style names so the renamed styles stay consistent across the supported UI dictionaries

    - art style category chip wrapping:
        - the Art Style theme/category chips in the styles sheet now wrap onto additional lines instead of staying in one horizontally scrolling strip, so the category bar remains inside the sheet width on narrower layouts
        - category chips now allow longer localized labels to break within the button when needed, preventing the category row from overflowing its container or showing a horizontal scrollbar

    - shared-controls surface simplification and no-style contract:
        - the floating shared-controls card now places the `Shared` badge and `Settings` title on a single header row, removes the old standalone summary strip, and turns the action area into a vertical stack of buttons with their own embedded summary chips
        - full shared-controls surfaces now expose only Prompt, Generation Settings, Advanced settings, and References, while sketch surfaces stay limited to Model and Ratio, removing Styles from the shared-controls surface model entirely
        - any generate or follow-up action triggered while a shared-controls surface is open now uses an effective style of `None`, so surface-local editor and sketch workflows no longer inherit the main page style even though the main composer still keeps the user’s saved style selection

## v3.5.2 - 2026-04-13

- Release title: Nano Banana Ultra 3.5.2 - Editor Entry Performance, Final-Frame Editor Contract, Shared Settings Parity & Viewer Contrast Polish
- Release summary:
    - editor entry preparation and large-image responsiveness:
        - large sources now complete any required 4K editor preparation before the editor canvas mounts, preventing the earlier duplicate mount-time re-encode and the second visible stall when entering the editor with oversized images
        - oversized upload and stage-based editor sources now follow the same shared preparation path, so the editor opens on the already-prepared image instead of redoing the same resize work after the surface is visible

    - final-frame editor preservation contract:
        - reframe and retouch submissions now treat the final submitted editor canvas as the approved composition, preserving already-visible content by default instead of inferring different prompt families from whether the frame came from pan, crop-zoom, or other geometry history
        - blank or transparent editor regions are now described as the only areas to regenerate, while fully covered reframe submissions fall back to detail-recovery wording without asking the model to re-center, zoom out, or recompose the scene
        - strengthened the editor prompt contract so transparent cutouts and blank canvas regions are explicitly treated as missing image areas to render, reducing cases where the model preserves them as unintended white blocks or matte rectangles

    - shared controls advanced-settings chip parity:
        - the shared-controls Advanced settings summary now follows the same visibility rules as composer, hiding chips for unsupported features, unavailable controls, and values currently set to `off`
        - output format, grounding, structured output, thinking, and temperature chips now appear only when they represent a real adjustable or active state for the current model instead of creating noisy summary rows

    - unified main-surface source ownership:
        - main history thumbnails and the stage top-right chip now share one green `Source` marker driven by the current working source, replacing the earlier split between `Stage Source` and branch-local continuation markers on the main browsing surfaces
        - branch-local continuation ownership is still preserved in detail surfaces such as Versions, so the main workspace stays singular while lineage debugging and branch archaeology remain available where they are actually needed
        - restore and history verification was realigned to the unified `Source` contract so imported workspaces, restored sessions, and live selection-first flows present the same next-source mental model

    - fullscreen viewer readability polish:
        - the fullscreen viewer `New` badge now uses stronger dark-theme contrast so the label stays readable against the darker overlay background

## v3.5.1 - 2026-04-13

- Release title: Nano Banana Ultra 3.5.1 - Editor Continuation Realignment, Visible Text Guidance & Smarter Outpaint Continuity
- Release summary:
    - editor and staged-image continuation alignment:
        - editor generate, editor queue batch, and stage-based follow-up edits now resolve lineage from the active working source, preventing unintended revival of stale continuation context from elsewhere in the workspace
        - upload-only and otherwise unlinked staged images now begin as fresh root-like edits rather than inheriting hidden prior lineage
        - reopening or continuing from older selected turns now preserves branch intent consistently across both live and restored workspace flows

    - editor prompt ownership and visible-text workflow:
        - removed the duplicate centered editor prompt card so hidden editor instructions now remain in the existing shared-controls prompt sheet, while visible wording intended for the final image can be placed directly on the canvas
        - doodle-and-text edits now preserve drawn canvas wording as literal visible-output guidance, while non-doodle editor modes remain prompt-only without additional prompt chrome layered over the canvas
        - the doodle text tool now explains the baked-label workflow through a reusable modal that can be reopened on every explicit activation, replacing the earlier one-time and doodle-entry guidance pattern

    - outpaint intent analysis and framing continuity:
        - outpaint now evaluates live frame, zoom, and blank-side geometry to distinguish detail-only reframe, crop-preserving extension, directional side extension, and balanced extension cases
        - crop-preserving outpaint now retains the current zoomed framing and extends only into genuine blank sides instead of falling back to a generic extend-the-scene instruction

## v3.5.0 - 2026-04-12

- Release title: Nano Banana Ultra 3.5.0 - Selection-First Lineage, Stateful Continue CTA & Versions Flow Simplification
- Release summary:
    - selection-first source and continuation workflow:
        - selecting a successful history turn now immediately defines the next working source, removing the previous dependence on a separate passive open-versus-continue split
        - selecting the latest turn on a branch now behaves as continuation from that branch, while selecting an older turn now initiates a new branch automatically
        - restore and import-review flows now follow the same source-selection rules as the live workspace instead of maintaining a separate route model

    - composer and stage action consolidation:
        - replaced the prior `Generate` plus visible `Follow-up Edit` pairing with a single stateful primary action: when no image is staged, fresh generate remains primary; when a staged image is present, `Continue with this image` becomes the primary action and fresh generate remains as the smaller secondary fallback
        - simplified the stage surface by removing duplicate continue/branch controls and the older divergence signal, so continuation intent is now owned by source selection rather than repeated across multiple controls

    - Versions surface alignment under the selection-first model:
        - updated the Versions view so lineage cards now communicate state directly through badges such as `Viewing` and `Continue with this image` instead of relying on separate owner-route action buttons
        - simplified the active-branch area so branch switching remains selection-first and branch rename stays available without retaining the earlier open/continue action row
        - kept the selected turn, current stage source, and branch state visually aligned across Versions, stage, and restore flows

    - user-facing wording follow-through:
        - updated English and Traditional Chinese labels to match the simplified workflow, including stage-source wording, continue-with-image wording, grounding-result wording, and active/viewing badge wording

## v3.4.5 - 2026-04-12

- Release title: Nano Banana Ultra 3.4.5 - Immediate UI Locale Switching & Startup Translation Preload
- Release summary:
    - UI language timing repair across bootstrap and manual switching:
        - preloaded the preferred locale before the first app render so non-English startup no longer mounts against the temporary English dictionary and waits for a later interaction before repainting translated chrome
        - changed runtime language switching so the app persists the new preference immediately but only commits `currentLang` after the target dictionary finishes loading, preventing the earlier state where the UI claimed to be on another locale while still reading fallback English strings
        - aligned workspace lifecycle restoration with the same await-before-commit contract and guarded stale async completions so rapid language changes cannot let an older lazy-load resolve overwrite the latest request

## v3.4.4 - 2026-04-11

- Release title: Nano Banana Ultra 3.4.4 - Modal Floating Top Layer for Advanced Settings & Detail Surfaces
- Release summary:
    - modal-scoped custom floating top-layer infrastructure:
        - added a modal-scoped floating host inside `WorkspaceModalFrame` instead of loosening modal overflow rules, so shared modal flows can render custom floating UI above scrollable modal content without changing the existing rounded-shell, max-height, or internal scroll contracts
        - introduced a shared `ModalFloatingLayerContext` plus the new `useAnchoredFloatingPlacement(...)` primitive to centralize anchored fixed-position placement, viewport clamping, auto-flip behavior, and future modal-floating reuse instead of leaving each surface on local absolute positioning
        - kept the floating host scoped to the active modal stack rather than promoting it to a body-global overlay layer, preserving the existing modal z-index ownership and backdrop relationship

    - modal floating migration for tooltips and response actions:
        - rebuilt `InfoTooltip` so modal-hosted help cards now portal into the shared modal floating host while non-modal callers keep the earlier inline behavior, preventing Advanced settings and similar modal help cards from expanding the modal scroll height or clipping at scroll-container boundaries
        - replaced the old `StructuredOutputActions` inline `details` menu ownership with controlled open state backed by the same modal floating host, so response-detail structured-output actions can layer above the support-detail scroll region instead of being trapped inside local overflow
        - aligned the new shared floating boundary around both trigger and panel interaction so hover, blur, outside-click dismissal, and fixed-position anchoring remain stable after portalization

    - overlay interaction and modal-surface follow-through:
        - updated `useOverlayEscapeDismiss(...)` to respect already-handled Escape events, allowing inner floating panels to consume Escape before the parent modal closes and preventing the new portaled floating surfaces from fighting the modal dismiss path
        - applied the shared modal-floating behavior to the Advanced settings modal path and to support-family response-detail flows, covering the concrete surfaces that were overflowing or clipping inside scrollable modal bodies during this session's implementation pass

    - composer send-control regroup follow-through:
        - moved the sticky `Independent send` / `Memory send` toggle up into the prompt header, kept the `i` helper button on the same row, removed the visible `Next send` heading, tightened the toggle footprint, and moved `Enter sends` / `Enter newline` down into the lower action row without changing sticky-send persistence or Memory availability rules
        - promoted the sticky send-intent helper card onto a new workspace-scoped floating host so the helper can escape composer clipping with the same anchored fixed-layer behavior used by modal floating surfaces, while preserving outside-click and Escape dismissal boundaries after portalization
        - added a Memory send helper note that warns remembered context increases token usage, keeping the guidance visible in both normal and blocked-memory helper states

## v3.4.3 - 2026-04-11

- Release title: Nano Banana Ultra 3.4.3 - Image to Prompt Quick Tool, Prompt Locale Locking & Scaffolded Surprise Me
- Release summary:
    - composer quick-tool expansion and prompt-action state polish:
        - added `Image to Prompt` as a true composer quick tool with localized labels, hidden file-picker wiring, and active helper spinner state so uploaded reference images can replace the composer prompt directly instead of routing through a separate surface
        - removed the old placeholder quick-tool slot, kept `Surprise Me` and `Auto Rewrite` as peers, and propagated the current language code instead of a display-label alias through prompt-helper requests so rewrite, random, and image-to-prompt all submit the intended backend locale
        - added the matching prompt-tool success and failure locale strings across the maintained translations and kept sibling quick-tool actions blocked while another helper is already running

    - prompt backend modernization and image-to-prompt contract recovery:
        - rebuilt the rewrite and random prompt instructions around richer prompt-only output with optional multiline segmentation, explicit supported-language naming, and route-level temperature tuning so both helpers stay direct-to-model without regressing into labeled commentary
        - hardened prompt-tool locale locking so `Auto Rewrite`, `Surprise Me`, and `Image to Prompt` now stay pinned to the active UI language from the first render onward by seeding App language state from `resolvePreferredLanguage()`, persisting language switches before lazy locale loading completes, and reapplying the preferred language immediately during startup restoration instead of letting helper requests slip through the old temporary English default
        - removed the remaining hidden English prompt-helper fallbacks by tightening the frontend prompt services around explicit `Language` inputs, rejecting empty helper payloads instead of silently substituting generic English filler, and normalizing unsupported backend `lang` values back to the maintained locale set before building prompt instructions
        - redesigned `Surprise Me` away from the old English theme-seed list and into high-variance scaffold families so the model now invents subject, setting, composition, lighting, materials, style blend, narrative clue, and unexpected twist itself while still being forced to answer in the active UI language
        - added `/api/prompt/image-to-prompt` end to end, including inline data-url parsing on the backend plus a new frontend `generatePromptFromImage(...)` service path and the matching hook workflow for image upload, resize, request, and prompt replacement
        - restored the recovered six-section Image to Prompt contract with `Scene Overview`, `Subjects and Composition`, `Visual Details`, `Lighting and Color`, `Mood and Style`, and `Final Prompt`, while preserving the earlier uncertainty wording and illegible-text handling instead of the later precision-heavy variant and extending the contract so the full structured brief also stays in the requested UI language unless visible source text must remain unchanged
        - further tightened the Image to Prompt section guidance without changing the six-part shape: `Scene Overview` now emphasizes environment / scale / genre-or-era / visible creative twist, `Subjects and Composition` now covers main subject hierarchy plus composition and camera angle, `Visual Details` now explicitly calls for secondary elements, depth-of-field behavior, and hidden details only when truly visible, `Lighting and Color` now owns palette logic and atmospheric depth, and `Mood and Style` now distinguishes emotional tone, style fusion, and rendering finish
        - aligned the prompt route error path so missing API keys and malformed image payloads are classified through the same backend response family used by the other prompt tools

    - references surface merge and workspace utility follow-through:
        - merged `Draw Reference Sketch` into the `References` ownership path, replacing the separate sketch card with one combined references surface that keeps the floating reference dialog and summary counts while exposing sketch launch from the same card
        - added a compact right-aligned `Clear` action on the references card that clears object and character references together when present, and kept the control disabled when the workspace has nothing attached or generation is active
        - tightened workspace API-key connection behavior so already-ready environments skip the extra prompt-for-key alert and only open the key prompt when readiness checks actually fail

## v3.4.2 - 2026-04-10

- Release title: Nano Banana Ultra 3.4.2 - Composer Reflow, Instruction / Conversation UX & Smart Overlay Placement
- Release summary:
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

## v3.4.1 - 2026-04-09

- Release title: Nano Banana Ultra 3.4.1 - Prompt Helper Removal, History Rail Regroup & Stage Shell Alignment
- Release summary:
    - removed composer-side prompt helper persistence and template/history routes end-to-end by deleting `usePromptHistory`, removing the `Templates` / `History` launcher buttons and picker routes, stripping the related backend prompt-history endpoints, and aligning the surviving shared-controls wording across the maintained locales to the smaller `Inspiration, rewrite` contract
    - corrected viewer prompt reuse so `Apply Prompt` now prefers the currently viewed history item's prompt or loaded metadata prompt instead of blindly replaying stale composer/view state when the inspected image changes
    - split `Image Tools` into clearer action ownership with dedicated `Upload Image To Repaint`, `Repaint Current Image`, and `Draw Reference Sketch` entries, wired a direct upload-to-repaint path from the shared side-tool surface, and added an App-level regression that keeps `Repaint Current Image` disabled after clearing the stage while the upload path remains available
    - regrouped unified history and recent-turn presentation by standardizing the surface title to `History`, moving utility actions back into the top-right header row, removing the old footer, enlarging the compact desktop history contract to centered `128px` six-up square thumbnails with tighter spacing, restyling the split left/right pagers into stronger button-plus-chip controls, and fixing the right pager order to `last`, `next`, then total-pages
    - expanded the recent-turn filmstrip into larger responsive mobile/desktop tokens, narrowed the composer three-column desktop widths around the embedded `Image Tools` shell, and preserved prompt text suppression plus preview-slot behavior through the updated history/filmstrip layout tests
    - unlocked the desktop main shell from the earlier viewport-fill chain, let the desktop stage outer shell stretch to the taller `History + Composer` column while keeping the same padded mobile-style shell spacing, restored the desktop inner square to shell-driven expansion, and removed the mobile viewport-height clamp so the mobile stage square also grows with the shell instead of staying artificially small on shorter screens

## v3.4.0 - 2026-04-09

- Release title: Nano Banana Ultra 3.4.0 - Support Surface Closeout & Sticky Send Intent
- Release summary:
    - finalized the shared support surface around `Progress`, `Response`, and `Sources`; earlier internal `Thoughts` / `Output` / `Evidence` phrasing now resolves to those three user-facing surfaces inside one support detail shell with in-surface tab switching
    - `Progress` now uses the intended middle-version contract: a trimmed top summary, a compact workflow summary block, a latest accumulated-thought snapshot card, and a chronological thought stream; the older workflow timeline list and Progress-owned current-stage-source / continuity cards remain removed
    - `Response` now uses one compact preview line even for structured output while preserving the existing response-rail body, `Sources` keeps labeled source/support count chips plus only distinct provenance metadata rows, and the standalone legacy Thoughts detail component remains absent from the live app
    - sticky send intent is now an explicit persisted composer/workspace field; legacy restores default to `independent`, official conversation replay activates only when intent is `memory`, and restored official-conversation fixtures now carry that intent explicitly instead of inferring it from stale conversation metadata
    - post-closeout Composer send-intent UX follow-through replaced the old split-button surface with one true whole-button `Next send` toggle, tightened the control width and padding, strengthened the active amber treatment for clearer contrast, moved the explanatory copy into a manual `i` info card, auto-opened that card on successful or blocked toggle attempts, kept blocked `Independent -> Memory` clicks on `Quantity != 1` as explanation-only no-ops instead of silent failures, and removed the now-redundant top-header intent chip once the Composer surface was clear enough
    - unified history remains the main owner for versions / import / export utility actions and desktop history density is locked to 6 visible slots
    - `Clear Workspace` now explicitly clears the shared workspace backup while legacy shared-snapshot migration stays startup-only, preventing stale backup replays from relighting the `Progress` / `Response` / `Sources` support signals after a reset; inactive support signals now use a muted slate off-state instead of the earlier bright white dot
    - finalized the support-family v2 lock by renaming the remaining live `WorkspaceWorkflow*` support components to `WorkspaceProgress*`, keeping deprecated wording only in archived docs

## v3.3.1 - 2026-04-08

- Release title: Nano Banana Ul44tra 3.3.1 - Sidecar Metadata Fidelity, Viewer Expansion & Temperature UX
- Release summary:
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
        - added the new viewer metadata loading/unavailable strings and the advanced temperature wording across the maintained locales

## v3.3.0 - 2026-04-07

- Release title: Nano Banana Ultra 3.3.0 - Unified History Workspace, Restore Hardening & Shell Chrome

- Fixed shell chrome header/footer pass:
    - pinned `WorkspaceTopHeader` to the viewport top and added a matching fixed bottom footer so the main shell now has persistent top-and-bottom chrome instead of a flow-only header with no footer treatment
    - aligned both bars to the existing `1560px` shell width, mirrored the footer geometry against the header with top rounded corners and square bottom corners, and increased App top/bottom content padding so the workspace body no longer scrolls underneath those fixed bars
    - added the footer copy `🍌 NANO BANANA ULTRA • Designed by Neophoeus Art • Powered by Gemini`, wired `Neophoeus Art` to `https://neophoeus.art/`, kept the link visually consistent with the surrounding footer text instead of emphasizing it separately, and updated the shared brand label in both header and footer to uppercase `NANO BANANA ULTRA`

- Interactive batch preview, freshness, and unified-history viewer flow:
    - removed the old stage-local batch thumbnail strip for interactive multi-image runs and moved all in-flight batch progress into the right-side unified history rail, where Generate now creates one preview slot per requested result immediately and fills those slots in place as the backend returns each image
    - introduced transient batch preview sessions with per-slot `pending` / `ready` / `failed` state, kept locked-ready previews blurred and darkened until the full batch completes, and merged those preview tiles into the same compact history grid instead of rendering them on a separate row
    - preserved the intended visual contract that newer batch results live on the left and older items stay on the right, including first-page preview-slot reservation inside `WorkspaceUnifiedHistoryPanel` so transient previews and committed history share one consistent ordering model
    - decoupled viewing from generation so selecting older history during an active batch no longer cancels the running generation, while Generate still clears the current stage source immediately and the viewer now traverses completed successful history items instead of the removed stage-local batch strip
    - added freshness lifecycle support for completed successful results through `openedAt`, a persistent green glow around unopened history items, and a viewer-level `New` badge that remains until the user leaves that item; failed turns stay out of freshness treatment and viewer traversal
    - fixed the post-completion selection mismatch by ordering committed interactive-batch history items by descending `batchResultIndex` before prepending them into formal history and before emitting batch-complete callbacks, so preview order, committed history order, and auto-open all land on the same leftmost new card instead of selecting an item that still rendered on the right
    - persisted the freshness/opened state through workspace snapshot sanitation and restore so reload or restore keeps the same unopened/new semantics instead of clearing them prematurely

- Workspace restore and unified history shell follow-up:
    - replaced the split `RecentHistoryFilmstrip` plus gallery stack with one App-owned `WorkspaceUnifiedHistoryPanel`, so the right desktop rail now keeps selected-item context, history paging, branch summary chips, clear-workspace affordance, and Versions inside a single aligned surface contract instead of mixing separate recent-lane and gallery ownership paths
    - rebuilt `HistoryPanel` so the embedded history surface can run in continuous compact mode, added a lazy-mounted `LazyHistoryImage` media path for history cards, kept mobile at four visible slots, and moved desktop to a true ten-up row with `100px` thumbnails plus auto-distributed horizontal spacing instead of the earlier fixed-gap `96px` contract
    - tightened the desktop shell geometry around a height-driven square stage by switching `GeneratedImage` to an XL height-owned square frame, stretching the left focus block to the combined History plus Versions rail height, shifting the desktop split to `0.6fr / 1.4fr`, and trimming selected-item / unified-history / Versions chrome in a second pass so the square-stage alignment remains intact without giving back thumbnail density

- Workspace clear semantics, thumbnail persistence, and restore hardening:
    - changed the old gallery-clear action into a true workspace reset flow through `useWorkspaceResetActions`, so clearing now resets the workspace snapshot, prompt history, transient modals, settings-session draft state, and sketch/editor transient surfaces instead of only deleting history cards while leaving stale workspace state behind
    - added persisted history-thumbnail ownership through `thumbnailSavedFilename`, `thumbnailInline`, `extractSavedFilename(...)`, and `persistHistoryThumbnail(...)`, so normal generations and queued-batch imports now save dedicated history previews when possible and keep inline thumbnail fallbacks only when persistence is unavailable
    - hardened restore and reopen behavior for legacy file-backed history turns by keeping runtime history cards on placeholders when they only have full-resolution file-backed URLs, reopening the selected stage from the original saved image, and background-repairing missing legacy thumbnails after a reopen when the original file can still be loaded locally
    - aligned workspace persistence to the new thumbnail contract, including repaired `/api/load-image?...history-thumb...` preview URLs and the no-white-screen late shared-restore path against the unified-history counters

## v3.2.7 - 2026-04-06

- Release title: Nano Banana Ultra 3.2.7 - Queued Batch Recovery, Retry & Cleanup
- Release summary:
    - Queued batch import extraction hardening:
        - broadened queued-batch result extraction so the importer now accepts wrapped batch responses, snake_case payload fields such as `inline_data` / `thought_signature`, later-candidate image parts, and wrapped grounding metadata instead of assuming one strict happy-path shape
        - refined queued-batch import diagnostics so backend results now distinguish malformed responses, prompt-level policy block reasons, missing candidates, missing parts, explicit per-entry batch errors, and safety-style finish reasons, while the workspace import flow preserves partial-success imports, logs skipped failed entries, and persists the first concrete import failure summary back onto the queued job instead of only showing a generic no-image notice
        - follow-up reload UX hardening: succeeded jobs that previously landed in `extraction-failure` now remain manually re-importable after workspace restore or reload, and manual `Check status` refreshes always surface a visible status/error notification instead of only updating logs when the remote state has not changed
        - follow-up runtime diagnostics alignment: queued-batch imports now reuse the interactive image path's safety-category interpretation so safety-filtered non-image responses can surface concrete blocked categories such as `sexually explicit` instead of stopping at generic `no image data` / `candidate without content parts` errors when the batch payload includes safety ratings
        - follow-up live-payload diagnostics alignment: text-only batch responses now surface `Model returned text-only content instead of image data.`, and empty `finishReason: NO_IMAGE` candidates now surface `Model finished without producing an image (finish reason: NO_IMAGE).`, matching the real payload shapes returned by the two 2026-04-05 Nano Banana 2 jobs investigated on 2026-04-06

    - Queued batch recovery and recent-list truthfulness:
        - added a formal recent-job recovery path around `/api/batches/list`, `listQueuedBatchJobs(...)`, and `handleRecoverRecentQueuedJobs(...)` so deleted local queue entries can be restored from recent remote Gemini Batch API jobs instead of being lost once the local tracked list is emptied
        - normalized `ai.batches.list()` model names such as `models/gemini-3.1-flash-image-preview` before image-model filtering, fixing the false `No additional recent remote batch jobs were found.` result that was hiding valid remote jobs from the recovery flow
        - upgraded recovery to hydrate each listed job with `get` details before upserting it locally, because Batch API list summaries alone do not expose enough payload detail to determine truthful import readiness for succeeded image jobs
        - kept the queue modal entry reachable even at `0 tracked`, added `Recover recent batch jobs` actions in both the populated and empty queue states, refreshed already tracked recovered jobs on later recover passes, and changed aggregate `ready to import` / `Import ready results` behavior to exclude jobs already confirmed as `extraction-failure` while still preserving per-job manual `Import` retries

    - Queued batch retry and cleanup UX follow-up:
        - reclassified succeeded queued jobs with `importDiagnostic: extraction-failure` as warning-state retry targets rather than normal green import actions, so the queue panel now shows `Retry import` for previously non-importable payloads while still blocking them from bulk `Import ready results`
        - made `no-payload` results explicitly non-importable in the per-job UI through an `Import unavailable` action state, while preserving the existing inline diagnostic that the batch completed without inline payload
        - added queue-level `Clear non-importable` and `Clear imported` actions that remove local queue tracking in bulk without touching remote batch jobs or already imported history cards, and wired focused workflow notifications/logs so cleanup remains visible and reversible only through future recovery

## v3.2.6 - 2026-04-04

- Release title: Nano Banana Ultra 3.2.6 - Composer Shell Refinement & Restore Hardening
- Release summary:
    - Prompt helper rail follow-up:
        - refined the four prompt helper buttons inside the composer prompt card so desktop now uses compact equal-width icon-and-label rows while mobile keeps the icon-above-label stack, with normalized letter spacing, refreshed helper glyphs, and clearer dark-theme icon-chip contrast
        - restored the helper buttons to the white surface family, shortened the prompt-history surface label from `Saved Prompts` / prompt-history equivalents to `History` across the maintained locales, and removed the trailing `✦` from `AI Enhance`
        - tightened the prompt rail and textarea pairing so the helper rail no longer overlaps the editor, kept the textarea on the subtle local scrollbar treatment for longer prompts, and tuned the final dark-mode color balance for the refined helper strip

    - Summary/action strip wrap follow-up:
        - replaced the horizontal-scroll treatment on the composer `Generation Settings` strip, composer `Advanced settings` strip, `History Summary Strip`, and selected-item action strip with wrap-first token rows so these summary/action surfaces no longer render a bottom scrollbar when their pills exceed the available width
        - kept every `History Summary Strip` chip visible across `wide`, `medium`, and `compact` dock buckets instead of hiding tail metadata, and flattened the selected-item action layout into one wrapping row while preserving the existing overflow-menu density rules for narrower action states

    - Composer shell and prompt dock restructure:
        - moved `Image Tools` into the composer as the left child card owned by `ComposerSettingsPanel`, keeping the wide layout at `Image Tools | Prompt | Generation` while narrow screens now stack `Image Tools -> Prompt -> Generation`
        - moved the four prompt helper actions into the prompt card beside the textarea, removed the old quick `Styles` button, and kept advanced settings as the strip below the prompt editor
        - changed the style status into an always-visible composer strip that opens the styles sheet even when the current value is `None`, and added an inline clear affordance that appears only for active styles and resets them back to `None`

    - Composer spacing and references fold refinement:
        - normalized the composer card-level spacing rhythm to the tighter `1.5` cadence across the embedded `Image Tools`, prompt card, and generation card instead of mixing wider internal gaps
        - changed the `References` card inside `Image Tools` to default-collapsed disclosure behavior, with `References` on the first line and the compact `Objects {current}/{max} Characters {current}/{max}` summary on the second line so the chevron no longer crowds the counts

    - Late shared-snapshot restore race hardening:
        - tightened `useLegacyWorkspaceSnapshotMigration.ts` so the async shared-backup restore path rechecks whether the current workspace is still effectively empty after `loadSharedWorkspaceSnapshot()` resolves, preventing a late legacy snapshot from overwriting a live prompt/settings draft that started after launch

    - Startup hydration replay hardening:
        - removed the broad launch-time composer replay from `useWorkspaceAppLifecycle.ts`, where `applyComposerState(initialComposerState)` could rerun during dev refresh and overwrite the live composer with an older startup snapshot while source files were being edited
        - moved restored startup presentation hydration into `useImageGeneration.ts` so `generationMode`, `executionMode`, and `displaySettings` now initialize directly from the restored composer snapshot instead of relying on a rerunnable lifecycle restore path

    - Post-audit hardening:
        - added legacy queued-job snapshot migration in `utils/workspacePersistence.ts` so pre-`hasInlinedResponses` succeeded jobs restore with truthful import-ready state until the next poll refreshes them

## v3.2.5 - 2026-04-04

- Release title: Nano Banana Ultra 3.2.5 - Queued Batch Truthfulness & Submit Feedback Closeout
- Release summary:
    - Queued batch truthfulness hardening:
        - threaded `hasInlinedResponses` into local queued-job state, added explicit local `submissionPending` plus import-diagnostic tracking, and centralized the queue truth predicates in `utils/queuedBatchJobs.ts` so import-ready no longer means `JOB_STATE_SUCCEEDED` alone
        - updated composer queue status, the queued-batch detail panel, workspace insights, and workflow detail surfaces so counts and actions now reflect real importability, while succeeded jobs without inline payload no longer appear ready to import
        - separated queued-batch diagnostics into two user-visible outcomes: jobs that finished with no inline payload and jobs that had inline responses but still produced no importable image after extraction

    - Immediate submit feedback and snapshot safety:
        - added optimistic local queued jobs for both main-composer and editor-origin batch submits so pending feedback appears immediately instead of waiting for the remote batch create response
        - made the editor-origin queue path rely on stable workspace queued-job state so submit feedback survives editor closure without requiring editor-local persistence
        - filtered optimistic `submissionPending` jobs out of workspace snapshot persistence so restore never revives local-only placeholder jobs as if they were real remote batches

## v3.2.4 - 2026-04-04

- Release title: Nano Banana Ultra 3.2.4 - Quantity Persistence Closeout & Session D Handoff
- Release summary:
    - Quantity persistence stale-state fix closeout:
        - confirmed the Session C root cause in `ImageEditor.resetTools(...)`, where editor-local reset replayed stale `initialBatchSize` back into committed composer state via `onBatchSizeChange(initialBatchSize)` and could silently overwrite a later committed Quantity such as `3`
        - kept the runtime fix narrow by removing that stale editor reset batch-size writeback instead of adding broad defensive clamping or widening settings-session ownership changes

    - batchSize ownership contract:
        - documented and preserved the contract that committed `batchSize` must only change through explicit apply / restore flows and must not be mutated by editor-local stale snapshot replay

## v3.2.3 - 2026-04-04

- Release title: Nano Banana Ultra 3.2.3 - Composer / Viewer Surface Clarity & Image Tools Polish
- Release summary:
    - Composer / viewer / style-label cleanup:
        - added a conditional composer style status strip between `Generation Settings` and `Follow-up Source` that only renders when a real style is active, making shared style state visible without surfacing the `None` case as fake status
        - added an explicit viewer `Apply Prompt` CTA that routes through an App-owned prompt-replace helper so applying a viewed prompt only replaces composer prompt text and preserves the Session A continuation/source contract
        - removed the duplicate main-stage Upload/Repaint empty-state CTA so repaint entry stays owned by `Image Tools`, while the stage empty state keeps the cleaner ready-only presentation
        - fixed the English `catDesign` label, simplified `STYLE_CATEGORIES` to translation-driven ids, and aligned style category display plus the new viewer/action wording across the maintained locales instead of relying on hardcoded mixed-language labels

    - Image Tools wording and action-button polish:
        - renamed the three Image Tools entries to `Upload Image To Repaint`, `Repaint Current Image`, and `Draw Reference Sketch` so the side-tool verbs match the actual workflow surface ownership after chain cleanup
        - polished the visible Image Tools action buttons with left-side icons, slightly larger compact typography, and tighter multiline alignment so the longer labels stay readable without reopening the old loose action-card styling

## v3.2.2 - 2026-04-04

- Release title: Nano Banana Ultra 3.2.2 - Chain Cleanup & Restore Contract Alignment
- Release summary:
    - Chain cleanup and explicit continuation-source contract:
        - stopped passive history open/reopen from promoting workspace session source, mutating conversation route, or rewriting composer state, so `Reopen` now stays in stage/view-only territory while `Continue`, `Promote Variant`, and `Branch` remain the only explicit route-changing actions
        - added `workspaceSession.sourceLineageAction` as explicit continuation intent, threaded it through session promotion, lineage selectors, imported-workspace review, provenance continuation, and branch continuation helpers, and stopped pending branch intent from being projected back onto the old branch continuation map
        - changed normal generation and conversation request assembly to read from the explicit continuation source instead of the last viewed stage image, while preserving current-stage ownership for follow-up editor flows
        - hardened snapshot sanitation and restore normalization so passive `selectedHistoryId` no longer rehydrates conversation/session route semantics, and aligned imported-workspace / versions / filmstrip restore expectations so passive history open continues to preserve composer text

    - Broader restore follow-up and editor shared-state restore:
        - treated standalone advanced-settings close as discard-only and fixed an editor-close shared ratio/size regression, so unapplied draft changes no longer persist unexpectedly
        - changed editor close to restore the pre-editor shared composer/object/character snapshot by default, keeping editor-entry auto-measured ratio and size isolated from the main workspace when no local editor changes are being kept

## v3.2.1 - 2026-04-03

- Release title: Nano Banana Ultra 3.2.1 - Shared Controls, Retouch Locking & Advanced Settings Draft Flow
- Release summary:
    - Shared controls, editor-local prompt/reference state, prompt draft/apply, and retouch/editor-entry hardening:
        - rebuilt the floating `Shared` surface controls into an always-visible compact settings card instead of an open/close disclosure, moved it to the left-side workspace edge, collapsed the surface summary into compact chips, limited SketchPad to first-layer `Model` and `Ratio` actions, and added bottom-offset reporting so the editor retouch toolbar can dock beneath the shared controls without overlap
        - moved editor prompt and reference ownership further into editor-local transient state so editor object/character references start empty from snapshot-backed editor sessions, clear correctly on editor exit, and stay isolated from the main composer while shared model and generation settings continue to follow the active workspace surface
        - changed the shared prompt sheet to a draft-and-apply flow: prompt edits now stay local until `Apply`, close and backdrop-dismiss discard unsaved prompt draft changes, the old prompt quick-action footer was removed from that route, and style entry points are hidden for editor-local picker flows that should not expose shared style changes
        - added prompt clear affordances in both the main composer and the shared prompt sheet, aligned the clear icon to the nicer SketchPad trash-can treatment, and polished the shared-controls button label wrapping so multi-line action text reads denser without feeling overly loose
        - changed editor entry so uploaded or reopened images are measured up front, clamped to the same 4K semantics used by the editor, and then auto-apply the closest aspect ratio plus the closest output-size bucket before the editor opens, while snapshot restore keeps the pre-editor shared settings separate from the editor-initial ratio and size used by `Reset` inside the editor
        - made retouch ratio-locking ratio-first at the app level: entering editor now starts in `inpaint`, only retouch/inpaint keeps the auto-selected ratio locked, outpaint stays free to change ratio, unsupported models auto-switch to the first ratio-compatible model with a localized notice, and the shared picker now filters model choices plus disables ratio changes whenever that retouch lock is active
        - hardened the ratio-lock path across capability normalization and editor constraints so locked retouch ratios are no longer bounced back to `1:1`, and added the supporting editor auto-switch locale key across the maintained translations
        - updated maintained locale dictionaries for the new shared-controls `Settings` heading plus the revised editor-local wording

    - Advanced settings simplification and shared settings-session drill-in:
        - simplified `Advanced settings` into a cleaner apply/cancel flow: removed redundant header and section help chrome, kept `Runtime guide` always visible as a static note block, shortened structured-output and grounding guidance, removed the misleading live `Default temp` chip because the fixed baseline remains `1`, and aligned the simplified wording across the maintained locales
        - kept prompt and advanced edits in draft state until explicit `Apply`: shared prompt changes now stay local until applied, clear affordances were added for both composer and shared prompt textareas, advanced close/backdrop/Escape now behave as cancel, and editor-local picker routes no longer expose shared style entry points that should stay out of editor-local flows
        - replaced the older generation/advanced peer-switch behavior with one App-owned `WorkspaceSettingsDraft` session: `Generation Settings` is now the parent flow, `Advanced settings` is a one-way child drill-in, entering advanced from generation keeps the same uncommitted draft without auto-applying, and closing advanced after drill-in returns to generation with that draft intact
        - moved capability-aware settings normalization into `App.tsx` so draft model changes keep ratio, size, output format, structured output, thinking, and grounding choices valid from the draft itself, while `WorkspacePickerSheet` keeps prompt draft local and the advanced modal reads capability from the shared draft model instead of the last committed model

## v3.2.0 - 2026-04-02

- Release title: Nano Banana Ultra 3.2.0 - Shared Settings, Image Tools & Queue Workflow Refinement
- Release summary:
    - Image Tools secondary-card regrouping, reference-hint cleanup, and i18n follow-through:
        - removed the `Actions` eyebrow from the left `Image Tools` surface, regrouped the panel into nested secondary cards so editor and SketchPad actions share the upper card while object and character references share the lower card, and kept the existing side-tool action selectors stable while adding explicit inner-card test ids for the new structure
        - removed the `Rec. < x` recommendation text from the shared `ImageUploader` header so the hint disappears from both the main `Image Tools` panel and the shared-controls references sheet, while preserving the live count display plus the existing `safeLimit` thumbnail highlighting behavior
        - deleted the stale `EDITOR_MAX_REFS` constant so editor and homepage reference limits now stay aligned through the already-shared `MODEL_CAPABILITIES` source of truth instead of leaving an unused divergent editor-only contract in the repo
        - removed the now-unused `safeLimitTip` and `composerActionPanelEyebrow` translation keys from the maintained locale dictionaries, keeping the runtime wording aligned with the cleaned-up Image Tools contract

    - Composer reference-owner removal, upload-to-edit cleanup, and startup hardening:
        - removed the composer-owned `Reference Tray` and stale references launcher flow, moved object and character reference ownership fully into the left `Image Tools` panel, and aligned the shared references sheet to the new uploader-only contract so the main workspace no longer splits reference management across composer and side surfaces
        - removed the persistent editor-base/base-image concept from the active workspace flow, updated the side-tool editor entry to use the current stage image when available or fall back to `Upload Image To Edit`, and cleaned out the dead base-image wording and locale keys across the maintained translations instead of leaving orphaned editor terminology behind
        - fixed the startup white-screen regressions introduced by the refactor by removing stale `openReferencesPicker` and `handleOpenUploadDialog` runtime references, restoring the missing `Button` import in the picker sheet, and realigning the editor-close restore expectation so reopening editing after close now follows the upload-to-edit contract instead of assuming a removed persistent editor base

    - Composer / editor shared-settings refactor:
        - rebuilt the composer dock around a left-rail quick-tool stack (`Inspiration`, `AI Enhance`, `Templates`, `Saved Prompts`, `Styles`) plus a single `Generation Settings` status bar that now owns model, aspect ratio, output size, and quantity, while active follow-up source context can surface beside it instead of living under the prompt
        - compacted the composer settings chrome into 40px summary strips by keeping `Generation Settings` in the top row and moving `Advanced settings` below the prompt as a matching strip with label-plus-value state chips instead of the old inline helper copy or separate short button, highlighted the primary generation chips with stronger accent pill styling plus higher-contrast dark-theme fills, and switched both strips to the shared horizontal-scroll treatment used by the history summary strip so long summaries scroll instead of truncating while the strip itself grows taller to accommodate any visible horizontal scrollbar
        - aligned shared-controls across composer, editor, and SketchPad to the same unified settings-sheet contract, with SketchPad limited to model and ratio while editor keeps the full shared settings set without inheriting the main composer prompt, and with the floating shared-controls surface now collapsing model / ratio / size / quantity into a single `Generation Settings` entry that switches its detail summary by surface
        - removed the duplicate current-image lineage summaries from the left `Image Tools` panel so the composer `Follow-up source` strip is now the single place that surfaces `History · Reopen` style follow-up context, while `Base image` only appears there when an actual editor base is staged
        - continued simplifying the `Generation Settings` modal by removing the secondary topic tabs, removing the local theme toggle and intro explainer, reshaping the content into a model-left / controls-right layout on wide screens with a stacked narrow-screen fallback, upgrading model cards to a three-line title / formal-model-name / capability hierarchy, and adding a `Quantity 3` option beside the existing batch-size choices
        - moved editor prompt ownership into editor-local transient state, split `Inspiration` / `AI Enhance` / shared prompt editing so those tools now target the active surface prompt, preserved mode-specific auto-prompt fallbacks and blank-prompt submit behavior, and removed the editor-local loading HUD so edit submits hand back to the main stage/workflow immediately
        - expanded editor context snapshots and restore plumbing to carry model, style, output, thinking, and grounding settings so returning from editor flows restores the shared generation configuration instead of only ratio / size / quantity
        - added generation-settings and editor-shared-state translations across the maintained locales

    - Editor-side queued batch handoff:
        - moved editor-origin queued submissions into the editor surface itself with side-by-side `Repaint` and `Queue Batch Job` actions, made both actions share the same exported editor-canvas pipeline, and made the queue path return control to the main workspace the same way immediate editor generation already does
        - isolated editor queued payloads to the editor-local prompt plus exported canvas data, so queued submissions no longer leak the main composer prompt or reuse stale file-backed image URLs
        - changed queued waiting-list wording for editor-origin jobs to exact `Editor Edit` while stopping the main composer queue path from inferring editor mode from leftover `editorBaseAsset` state, so main-page queue now stays limited to prompt-only, staged follow-up, and reference-driven flows

## v3.1.8 - 2026-04-01

- Release title: Nano Banana Ultra 3.1.8 - Restore Notice Removal & Startup Preference Persistence
- Release summary:
    - removed the blocking `WorkspaceRestoreNotice` flow from the real product runtime so startup restore, imported-workspace replace, and shared-backup migration now restore directly into the recovered workspace state instead of requiring a second decision modal
    - replaced the old restore-modal contract with lightweight toast feedback, updated snapshot application semantics from `showRestoreNotice` toward `announceRestoreToast`, and kept restore continuity intact for history source routing and official-conversation follow-up requests
    - preserved last-used startup preferences by restoring theme and language immediately on launch, persisting user language changes into local storage, and extracting shared theme persistence helpers so launch-time UI state comes back before restore feedback is announced
    - cleaned up restore-era translation surface area across all supported locales by removing modal-only restore action strings, retaining the shared restore keys still used by toast and import-review flows, and realigning the locale baseline tests with the new contract

## v3.1.7 - 2026-04-01

- Release title: Nano Banana Ultra 3.1.7 - Shell Density, Theme Stability & Composer Cleanup
- Release summary:
    - tightened the main workspace shell into a denser contract by moving the top launcher strip, history canvas support flow, and bottom composer row onto the shared tighter spacing baseline, keeping the launcher cards at a 40px desktop height and bringing the composer row back to the same full-width alignment as the rest of the layout
    - reduced unnecessary UI churn by suppressing whole-document transitions during theme flips, narrowing several broad `transition-all` surfaces across stage, history, and filmstrip flows, and removing the redundant history branch-summary rebuild so shell interactions stay lighter under real workspace load
    - upgraded visual readability across the stage and language surfaces by switching stage top-right chips and overflow actions to higher-contrast solid treatments, improving dark-theme signal contrast, and moving the language selector off the frosted overlay shell onto a clearer solid panel contract
    - simplified composer chrome by removing the prompt-panel `Compose` eyebrow plus the separate right-side `Actions` / `Create` heading block, while keeping the action controls in place so the composer reads as one cleaner workspace-owned surface

## v3.1.6 - 2026-04-01

- Release title: Nano Banana Ultra 3.1.6 - Compact Thumbnail & Stage Context Completion
- Release summary:
    - completed the compact-thumbnail and stage-context slice by turning `Recent Turns` and embedded `Gallery` history cards into scan-and-switch tokens, removing prompt preview from the main workspace surfaces, and keeping prompt detail viewer-owned instead of letting thumbnails or the stage act like mini detail cards
    - added the selected-item dock beside the history area so history-turn metadata and history-turn actions now live in dedicated `Selected Item Summary Strip` and `Selected Item Action Bar` surfaces rather than staying embedded in thumbnail overlays, while restoring branch-rename applicability so `Rename Branch` only appears when a real rename target exists
    - upgraded the main stage top-right into a compact current-stage context and quick-action cluster, preserved source and branch context during active generation, and finished the responsive overflow contract so both the selected-item dock and the stage cluster now follow explicit wide / medium / compact visibility priorities instead of relying on scroll-only or breakpoint-only fallbacks
    - tightened selection and source ownership across restore and browsing flows by aligning filmstrip selection to `selectedHistoryId`, preserving exact staged-source semantics when browsing diverges from the current stage, fixing the failed-history selection crash path, and removing prompt leakage from stage, filmstrip, and gallery image `alt` surfaces

## v3.1.5 - 2026-03-31

- Release title: Nano Banana Ultra 3.1.5 - Shell Polish & Queue Modal Cleanup
- Release summary:
    - tightened the top workspace launcher strip into a denser summary-first row, clarified the `Current Work` / `Response` / `Source Trail` ownership model, split their active-signal logic, renamed the English `Answer` surface to `Response`, and reduced the remaining shell gutters so the workspace reads as one tighter product shell
    - reorganized the right-side workspace support flow by moving `Recent Turns` above `Versions`, restyling and compacting the `Versions` summary actions, promoting `Gallery` out of the composer and then embedding the gallery surface directly into the support rail instead of keeping it behind the old modal launcher
    - simplified workflow detail ownership by compacting the reused context rail inside the detail modal and removing repeated workflow summary and latest-thought blocks, while merging returned thoughts into the main chronological workflow event stream
    - promoted `Queued Batch Jobs` into its own detail modal and hardened the queue workflow end to end: documented the 24-hour target versus 48-hour expiry contract in the local Gemini skill, surfaced active age warnings for long-running jobs, tightened queued image request validation, and cleaned up the modal framing so the shared title/description no longer repeat while the embedded panel keeps extra bottom breathing room
    - hardened restored workspace media handling by filtering empty viewer image URLs out of snapshots and replacing missing history, filmstrip, and queued-result thumbnails with explicit placeholders instead of letting restored browsers hit the empty-`img src` path

## v3.1.4 - 2026-03-31

- Release title: Nano Banana Ultra 3.1.4 - Shell, Restore & Queue Batch Hardening
- Release summary:
    - reorganized the top workspace shell around summary-first ownership: `Current Work` is now a single-line live-status card with a thought-aware indicator, while `Answer`, `Source Trail`, and `Versions` open dedicated detail modals instead of carrying their full content inline
    - moved heavyweight workflow, provenance, and version detail out of the compact summaries, including keeping `Workspace Snapshot` import/export controls inside the `Versions` detail modal and preserving full current-stage source routing, lineage context, and the full thoughts stack inside the workflow detail view
    - tightened overflow and mobile-fit behavior across the restored shell surfaces, generated-image overlays, structured-output menus, tooltip panels, and shared scroll containers so the compact shell stays readable without viewport-breaking UI states
    - split restore-time runtime hydration from save/export compaction so restored workspaces keep the selected turn and official-conversation image chain needed for viewer access and `priorTurns` continuation requests, while persisted snapshots still strip quota-heavy inline generated payloads wherever a file-backed or compact form should be used
    - fixed file-backed queue batch submission from restored stage sources by keeping the browser payload on `/api/load-image?filename=...` and resolving that reference into inline Gemini bytes only at the backend request boundary, avoiding a return to retained frontend base64 state

## v3.1.3 - 2026-03-30

- Release title: Nano Banana Ultra 3.1.3 - Restore & Payload Hardening
- Release summary:
    - reduced long-session slowdown by avoiding retained inline base64 for saved stage and viewer images when a saved file is available, so the main workspace no longer needs to keep full image data URLs in long-lived UI state after auto-save succeeds
    - redacted inline image payloads from viewer, provenance, and structured-output text surfaces so raw `data:image/...;base64,...` blobs no longer spill into the right-side inspection panels or other text-driven UI paths
    - aligned restore notice gating with the same restorable-content detection used by snapshot migration and import flows, so restored prompts, workflow logs, queued jobs, and other non-empty workspace states no longer silently skip the restore notice just because they lack visible viewer images or staged assets
    - hardened thought-signature handling by summarizing opaque signature payloads in viewer and provenance session-hint surfaces, and by stripping oversized raw `thoughtSignature` blobs from stored history and workspace session hints while preserving the lightweight `thoughtSignatureReturned` continuity signal

## v3.1.2 - 2026-03-30

- Release title: Nano Banana Ultra 3.1.2 - Versions & Viewer Refinement
- Release summary:
    - moved `Export Workspace` and `Import Workspace` out of the composer and into the history-owned `Versions` surface, adding a titled `Workspace Snapshot` strip and restoring a clearer multi-layer shell around active-branch and lineage sections
    - simplified the single-image viewer by removing redundant header copy, moving the red close action fully outside the modal shell, and keeping the dialog labeled through accessibility metadata rather than visible chrome
    - made the viewer sidebar independently scrollable, introduced the reusable `nbu-scrollbar-subtle` scrollbar utility, aligned legacy thin-scroll surfaces to the same understated treatment, updated localized snapshot-strip copy, and removed the banana emoji from the document title so browser chrome now reads `Nano Banana Ultra`

## v3.1.1 - 2026-03-30

- Release title: Nano Banana Ultra 3.1.1 - Workspace Layout Refinement
- Release summary:
    - this patch release is primarily a layout and density refinement pass on top of the 3.1 product-facing workspace baseline rather than a new workflow or feature release
    - tightened and aligned the main workspace surfaces so `Recent Turns`, `Versions`, side tools, stage wrappers, answer placeholders, and composer sections now share the same compact visual contract
    - applied the same layout standard to modal, picker-sheet, import, restore, viewer, rename, advanced-settings, confirm, and loading overlays so the whole workspace reads as one consistent shell family

## v3.1.0 - 2026-03-30

- Release title: Nano Banana Ultra 3.1.0 - Product-Facing Workspace Baseline
- Release summary:
    - completed the shift away from engineering-oriented shell framing and locked the product-facing workspace contract: a health-only header, `Current Work` for live process and thoughts, `Answer` for result delivery, evidence-first `Sources & Citations`, and history-owned versions
    - closed the remaining post-Phase-F restore regressions by fixing the `Queue Batch Job` tooltip accessible-name collision and restoring the live provenance surfaces that workspace restore flows still depend on, including attribution overview rows, status strips, uncited-source cards, reuse previews, and compare summaries
    - consolidated maintained user guidance into `README.md` and removed the separate `USER_MANUAL.zh-TW.md` so 3.1 product docs live in one place instead of splitting between the product README and a secondary manual

## v3.0.5 - 2026-03-29

- Release title: Nano Banana Ultra 3.0.5 - Panel Simplification & Restore Regression Update
- Release summary:
    - removed redundant helper copy across panel surfaces and moved high-value guidance into reusable info-tooltips instead of keeping long inline instructions visible by default
    - flattened disclosure shells in workspace insights, provenance, viewer, and import review surfaces where collapsed and expanded states were effectively showing the same information
    - moved `Queue Batch Job` mode guidance beside the action as an info icon, simplified duplicated thoughts presentation into a single readable block, and made tooltip panels easier to read with fully opaque backgrounds

## v3.0.4 - 2026-03-29

- Release title: Nano Banana Ultra 3.0.4 - Square Stage Layout Update
- Release summary:
    - locked the main generated-image stage to a square frame so portrait outputs no longer stretch the workspace and force extra scrolling
    - applied the same square-stage layout contract to the empty, loading, and error states so the focus surface keeps a stable footprint throughout the workflow

## v3.0.3 - 2026-03-29

- moved `Workspace Context` out of the desktop sticky side rail and into the main reading flow directly between `Response` and `Recent Turns`
- aligned desktop and mobile to share the same collapsible `Workspace Context` container instead of maintaining separate always-open desktop and mobile-only disclosure paths
- moved `Image Tools` into the main image workspace support rail so tool actions sit beside the focus surface instead of competing with context placement above the canvas
- replaced the long desktop right-rail presentation with a single summary-first entry point that reduces the feeling of floating context cards across unrelated sections
- hardened the auto-save failure persistence path so unsaved inline generated/history payloads no longer get written into local snapshots, shared backups, or exported workspace documents, while current-session viewing still keeps working and uploaded reference assets remain restorable

## v3.0.2 - 2026-03-26

- Release title: Nano Banana Ultra 3.0.2 - i18n Chunking & Restore Fixture Hardening
- Release summary:
    - removed the Vite chunk-size warning by taking lineage fallback labels out of the translation runtime graph and splitting locale payloads into dedicated i18n chunks
    - switched runtime localization to lazy-load non-English dictionaries on demand while keeping English eager, reducing the default bundle cost without changing translation call sites
    - moved restore and import snapshot fixtures out of `output/` into `e2e/fixtures/restore` so restore and import paths no longer depend on runtime artifact directories
    - restored and normalized the dedicated restore fixtures used by smoke, variant, provenance, official conversation, invalid import, and shared-context paths

## v3.0.1 - 2026-03-26

- Release title: Nano Banana Ultra 3.0.1 - Workspace Shell Clarity Update
- Release summary:
    - completed the post-3.0.0 workspace shell refinement plan across Sessions A-I without reopening the underlying continuity, restore, provenance, or picker-state architecture
    - moved visible ownership of `Model`, `Ratio`, `Size`, and `Qty` into the composer so setup now starts where prompt writing and generation actions already live
    - added a composer-owned `Reference Tray` strip directly under the helper row so reference state stays near the prompt instead of being split across header and side surfaces
    - simplified the top header into a compact global bar that keeps brand, theme, language, and console status without competing as a second settings surface
    - trimmed the side tool panel into image tools only, keeping upload, editor, and SketchPad actions while removing stale reference-surface ownership and related dead prop wiring
    - regrouped the right rail into `Current Work`, `Versions`, `Sources & Citations`, and `Activity` so the workspace reads more like a product flow and less like an engineering dashboard
    - softened first-read shell wording across the regrouped insights rail and side tools, including review/session/history/version phrasing that better matches normal-user mental models
    - closed translation parity for the new shell groupings and wording across all supported locales, including Japanese, Korean, Spanish, French, German, Russian, Traditional Chinese, and Simplified Chinese

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
    - added or expanded major supporting docs for shell decisions, implementation structure, package ownership, and internal workspace guidance to match the shipped 3.x workspace architecture

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
