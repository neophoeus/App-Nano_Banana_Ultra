# Changelog

This changelog is compiled from the repository's local git tags plus the published GitHub Releases and Tags pages for `neophoeus/App-Nano_Banana_Ultra`.

## Unreleased

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
- 繁中發版摘要:
    - 3.0.4 是主圖工作區的版面穩定化更新，重點是把主圖區固定成正方形，避免直式輸出把整個畫面拉得過長
    - 主圖、空狀態、生成中與錯誤狀態現在都共用同一個 square stage 版面契約，使用流程中的視覺佔位會更穩定
    - 已補上 `GeneratedImage` 的 focused Vitest 測試，避免之後有人把這個正方形 stage 契約改壞

## v3.0.3 - 2026-03-29

    - moved `Workspace Context` out of the desktop sticky side rail and into the main reading flow directly between `Response` and `Recent Turns`
    - aligned desktop and mobile to share the same collapsible `Workspace Context` container instead of maintaining separate always-open desktop and mobile-only disclosure paths
    - moved `Image Tools` into the main image workspace support rail so tool actions sit beside the focus surface instead of competing with context placement above the canvas
    - replaced the long desktop right-rail presentation with a single summary-first entry point that reduces the feeling of floating context cards across unrelated sections
        - hardened the auto-save failure persistence path so unsaved inline generated/history payloads no longer get written into local snapshots, shared backups, or exported workspace documents, while current-session viewing still keeps working and uploaded reference assets remain restorable
    - revalidated the layout refactor with focused Vitest coverage for `WorkspaceInsightsSidebar` and `WorkspaceHistoryCanvas`

- 繁中發版摘要:
    - 3.0.3 是針對 `Workspace Context` 與 `Image Tools` 版面流向的整理版，重點在於把脈絡資訊放回主要閱讀順序，而不是懸浮在多個區塊旁邊
    - `Workspace Context` 已從 desktop 的 sticky 右側欄移回主流程，固定排在 `Response` 與 `Recent Turns` 之間
    - desktop 與 mobile 現在共用同一個可收合 `Workspace Context` 容器，不再維持桌機常駐、手機另外一套 disclosure 的分裂路徑
    - `Image Tools` 已移到主圖工作區右側的 support rail，讓工具操作貼近主圖焦點區，而不是跟 context 區塊爭奪上方視覺空間
    - 相關版面調整已用 `WorkspaceInsightsSidebar` 與 `WorkspaceHistoryCanvas` 的 focused Vitest 測試重新驗證

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
- 繁中發版摘要:
    - 3.0.2 是針對 i18n 載入與 restore 測試基礎設施的穩定化版本，重點在於減少預設 bundle 負擔，同時把還原回歸測試從 runtime 輸出資料夾中解耦
    - 透過把 lineage 的英文 fallback label 從翻譯 runtime graph 拿掉，並將各語系拆成獨立 i18n chunk，清除了 Vite 的 chunk size warning
    - 非英文翻譯改成 runtime 按需載入，英文維持 eager，既保留既有翻譯呼叫方式，也避免預設首包把所有 locale 一次帶進來
    - 補上 Vitest 與 Playwright 的翻譯 preload 路徑，確保改成 lazy-load 後，測試環境仍能穩定驗證多語系介面
    - restore 與 import 的測試 fixture 正式搬到 `e2e/fixtures/restore`，不再依賴 `output/` 這種執行期產物目錄
    - 一併修整 smoke、variant、provenance、official conversation、invalid import 與 shared-context 這批 restore fixture，讓目前的 E2E 路徑都回到專用測試資料
    - restore Playwright 規格同步更新為讀取新 fixture 目錄、預先載入翻譯，並對齊目前 shell wording 與 selector
    - 新增 `test:e2e:restore` 指令，之後可用 `npm run test:e2e:restore -- --grep "..."` 做精準 restore 回歸，不再受 `npm exec` 參數吞掉問題影響
    - 完整 restore 回歸已重新驗證通過，`workspace-restore.spec.ts` 目前為 `66 passed`

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
- 繁中發版摘要:
    - 3.0.1 是 3.0.0 之後的工作區殼層整理版，重點不是新增新功能，而是把已完成的 continuity workspace 做到更清楚、更像一般使用者會理解的產品介面
    - 完成 A-I 全部後續收尾，把 `Model`、`Ratio`、`Size`、`Qty` 正式收進 composer，讓設定入口和 prompt 與 generate 行為放在同一個主操作區
    - `Reference Tray` 狀態改成 composer 自己管理，直接放在 helper 區下方，不再分散在 header、side tool、composer 多個表面之間
    - 頂部 header 壓回精簡全域列，只保留品牌、theme、language、console 等全域元素，不再兼任第二個參數設定列
    - 側邊工具面板收斂成純影像工具，保留上傳底圖、編輯當前圖、SketchPad 等真正的 image-tool 入口，同時移除舊的 reference owner contract
    - 右側脈絡欄重新整理成 `目前工作`、`版本`、`來源與引用`、`活動` 四個家族，降低舊版 branch / lineage / workflow dashboard 的工程味
    - 補完多語系收尾，把新版 shell 的首屏文案與分組名稱在 9 種語言中對齊，避免部分 locale 仍停留在舊的工程導向 wording
    - 相關 Vitest 回歸覆蓋一併補齊，3.0.1 的 shell owner 與文案契約已由 focused tests 守住

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
- 繁中發版摘要:
    - 3.0.0 是自 `v2.5.1` 之後的第一次大型正式改版，核心方向是把 Nano Banana Ultra 從單次生圖介面升級成可延續、多輪操作、可還原的影像工作區
    - 介面重新整併為更清楚的工作區殼層，讓輸出、歷史、右側脈絡、工具與底部 composer 各自有明確責任，不再讓多個次要面板重複提供同一類直接操作
    - 正式把 official conversation continuity、branch/source 延續、session replay、restore/import/reopen 等多輪工作流做成產品主幹，而不只是零散功能
    - 正式加入 structured outputs 工作流，包含多種 preset、結果檢視、JSON 或文字匯出、以及把結果直接 append 或 replace 回下一輪 prompt 的重用能力
    - 正式加入 queued batch job 工作流，支援提交、刷新、取消、匯入、批次結果回收、時間線顯示，並能在工作區快照還原後接續追蹤
    - 大幅強化 grounding 與 provenance 體驗，讓摘要、比較、來源檢視、bundle/source drill-down 與 prompt 重用都能在同一套語意下工作
    - 工作區快照與本地還原機制同步強化，支援更安全的檔案型影像回復、較小的 snapshot 負載，以及更穩定的 restore 行為
    - 九種語言的 shell 文案、queue、viewer、provenance、restore、replay、history、composer 等主要表面做了大範圍收斂，降低英文殘留與語意不一致
    - 視覺上建立了新的 shell token、overlay token、summary-first disclosure 模式與 modal theme-safe 行為，整體 UI 比 2.5.1 更像完整工作區產品而不是功能堆疊
    - 測試與驗證範圍也顯著擴大，Vitest 與 Playwright 都補上了針對 continuity、queued batch、structured outputs、restore、provenance 與多語系路徑的回歸覆蓋

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
- Tag subject: `feat: 專案大幅改版更新`
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
