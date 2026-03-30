# Changelog

This changelog is compiled from the repository's local git tags plus the published GitHub Releases and Tags pages for `neophoeus/App-Nano_Banana_Ultra`.

## Unreleased

- no unreleased changes tracked yet

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

- Release title: Nano Banana Ultra 3.0.3 - Workspace Context Flow Alignment
- Release prep summary:
    - moved `Workspace Context` out of the desktop sticky side rail and into the main reading flow directly between `Response` and `Recent Turns`
    - aligned desktop and mobile to share the same collapsible `Workspace Context` container instead of maintaining separate always-open desktop and mobile-only disclosure paths
    - moved `Image Tools` into the main image workspace support rail so tool actions sit beside the focus surface instead of competing with context placement above the canvas
    - replaced the long desktop right-rail presentation with a single summary-first entry point that reduces the feeling of floating context cards across unrelated sections
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
