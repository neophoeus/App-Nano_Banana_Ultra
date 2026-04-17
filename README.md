# Nano Banana Ultra

[English](#english) | [繁體中文](#繁體中文)

<a id="english"></a>

## English

Nano Banana Ultra is a Gemini-powered image workspace for creation, guided editing, and multi-pass iteration. It is built for people who need to move an idea forward across multiple turns, compare alternatives, recover earlier work, and keep source context intact while they do it.

Instead of treating image generation as a disposable one-shot action, Nano Banana Ultra keeps prompting, references, history, editing, reuse, and restore inside one connected workspace flow.

## At a Glance

- selection-first Gemini image workspace instead of a single prompt box
- one connected flow for create, edit, compare, branch, recover, and reuse
- source-aware history and Versions model so the current working source stays explicit
- model-aware controls that adapt to each Gemini image path instead of forcing one shared lowest-common-denominator UI
- built for longer-running visual work rather than only one-pass generation

## Core Capabilities

### Create

- text-to-image, image-to-image, and style-guided generation
- character and object references inside the same workspace flow
- prompt tools such as Smart Rewrite, Surprise Me, and Image to Prompt
- single-result generation or batch exploration when you want to compare directions

### Iterate

- selection-first continuation where the latest turn continues and older turns branch automatically
- built-in SketchPad workflow for rough ideation before generation
- editor workflow for inpainting, outpainting, reframing, and follow-up refinement
- direct Versions and stage-source visibility so it stays clear what the next pass is built from

### Review

- plain response text, provenance, grounding, and insight surfaces
- side-by-side comparison of sibling results and older turns in the same workspace
- reusable prompt context from current results when you want to push the next pass forward

### Recover

- persistent history, restore, import, and source-aware workspace recovery
- queued batch workflows for longer-running generation work
- multilingual UI plus light and dark themes

## Supported Models

Nano Banana Ultra currently supports three Gemini image-model paths. The UI exposes model-aware controls so each path can lean into its own strengths instead of being flattened into one generic settings surface.

### Nano Banana 2

- model id: `gemini-3.1-flash-image-preview`
- default mainline model in the current product flow
- broadest capability surface across ratio, size, grounding, and thinking controls
- best fit for flexible generation, iteration, and reference-aware workspace use

### Nano Banana Pro

- model id: `gemini-3-pro-image-preview`
- quality-focused alternative for higher-end image work
- tuned for higher-quality results and more deliberate controlled workflows
- best fit when output quality matters more than having the broadest capability matrix

### Nano Banana

- model id: `gemini-2.5-flash-image`
- lighter legacy path kept for lower-latency image generation scenarios
- uses a narrower capability surface than the newer Gemini 3 family
- best fit for simpler, faster generation needs when the full Gemini 3.x surface is not required

## Typical Workflow

### Create

- start from text prompts and optional references
- choose model, ratio, size, style, and generation settings
- generate one result or explore several directions in a batch

### Edit

- select any successful result as the next working source
- continue from the latest turn or branch from an older one automatically
- refine images with the built-in editor and targeted edit tools
- carry prior results forward instead of rebuilding from scratch every time

### Explore

- compare sibling variants and older turns inside the same workspace
- use Versions and source state to keep alternate directions understandable
- spin out different visual lines without manual route switching

### Recover

- restore previous workspace state after reload
- import saved workspaces and continue from the restored source state using the same selection-first rules as the live workspace
- keep history, stage source, and Versions state aligned across longer sessions

### Reuse

- reuse plain response text and prompt context from current results when it is helpful
- inspect provenance and grounding context when available
- push useful results back into the next generation pass instead of copying everything by hand

## Version Overview

### Latest Release: 3.5.6

Latest release: 3.5.6. See [CHANGELOG.md](CHANGELOG.md) for release details.

### 3.5.x

Version 3.5.x is where Nano Banana Ultra's 3.x workspace model becomes clearly selection-first and easier to read. History selection now directly defines the next working source, staged-image continuation uses one stateful primary action, and Versions reflects the same state through direct badges instead of a separate open-versus-continue split.

In short, 3.5.x is the current practical baseline for the product.

### 3.x

Version 3.x includes everything from 2.x and represents the current Nano Banana Ultra product state: a selection-first Gemini image workspace with a summary-first shell, detail-on-demand surfaces, persistent history and restore/import flows, provenance review, queued-batch workflows, official-conversation continuity, and safer file-backed recovery behavior.

### 2.x

Version 2.x includes everything from 1.x and expands the product into a broader creation workspace.

New in 2.x:

- expansion from the original Pro-focused path into the full Nano Banana model family
- dual reference trays with drag-and-drop ordering
- permanent local prompt history with large-capacity storage
- refined mobile and sidebar behavior
- custom model-selection UI and broader internationalization
- editor layout refinements and official model input-limit handling
- global theme and language synchronization across tools
- richer tooltip coverage and overall UI consistency
- system status monitoring and more secure local API-key handling
- updated Gemini model naming and stronger runtime health visibility
- a more mature transition from single-shot generation toward reusable multi-step image work

### 1.x

Version 1.x established the core creative foundation of Nano Banana Ultra.

Included capabilities:

- the original Nano Banana Pro model path built around `gemini-3-pro-image-preview`
- early image editor workflow
- doodle and sketch-assisted creation
- early multilingual UI improvements
- first-generation interface refinement for prompt and editor surfaces
- the initial product identity for Nano Banana as an image-focused creative tool

## Version Detail

For release-by-release history, see [CHANGELOG.md](CHANGELOG.md).

## Repository Scope

This repository currently tracks the product runtime, UI, build surface, and stable automated test contracts.

Tracked test source now includes `tests/`, `e2e/`, and `playwright.config.ts`, so clean clones receive the same unit and Playwright verification contracts that the tracked wrapper scripts and dev-environment manifest already advertise.

Local-only development assets such as `docs/`, `.prettierignore`, and `prettier.config.mjs` remain intentionally excluded from the formal tracked repo surface. If you need personal scratch tests or temporary debug-only Playwright flows, keep them in `tests-local/`, `e2e-local/`, or `playwright.local.config.ts` so they stay outside the shared product contract.

Generated local artifacts such as `output/`, `test-results/`, `playwright-report/`, and `coverage/` are also intentionally kept out of version control.

For repo-tracked local tooling and test execution, use `run_install_all.bat`, `scripts/setup-dev-environment.bat`, `scripts/run-unit-tests.bat`, `scripts/run-e2e-tests.bat`, or `npm run test -- ...`. Unit-test discovery is now pinned through `vitest.config.ts`, so the supported test entry points stay anchored to `App-Nano_Banana_Ultra` instead of following the editor or terminal working directory.

The app root now also exposes formal Vitest entry points through `npm test`, `npm run test:unit`, and `npm run test:watch`. Those scripts delegate to the tracked `dev-environment/` Vitest install instead of moving test dependencies back into the product manifest.

Playwright sidebar actions and browser-opening flows can invoke `playwright.config.ts` directly instead of the VS Code launch/task layer. That config and its e2e helpers are now anchored to the app directory itself so `output/`, `test-results/`, and dev-server startup stay inside `App-Nano_Banana_Ultra` regardless of the editor's current working directory.

---

<a id="繁體中文"></a>

## 繁體中文

Nano Banana Ultra 是一個以 Google Gemini 影像模型為核心的影像創作工作區，聚焦在生成、引導式編修，以及多輪延伸創作。它不是只給你一個 prompt 輸入框，而是把提示詞、參考圖、歷史、編輯、重用與還原都放進同一個持續運作的工作區裡。

它更像一個可以推進整條創作脈絡的影像 workspace，而不是一次性的生圖工具。你可以從草稿開始，一路做到批次探索、來源接續、局部編修、版本比較、工作區回復，最後再把有價值的結果帶回下一輪。

## 產品概要

- 它是以選取決定來源的 Gemini 影像工作區，不只是 prompt 輸入器
- 它把生成、編輯、比較、分支、還原與重用整合在同一條工作流
- 它會把 stage、history、Versions 與目前工作來源對齊，避免多輪創作時失去脈絡
- 它會依不同 Gemini 模型能力調整控制項，而不是把所有模型硬塞進同一套最低公約數介面
- 它適合需要長流程創作、比較、修正、回復與延伸的人

## 核心功能

### 創作

- 支援文字生圖、圖生圖、與風格導向生成
- 可在同一工作區內加入角色與物件參考圖
- 內建 Smart Rewrite、Surprise Me、Image to Prompt 等提示工具
- 可單張生成，也可用批次探索快速比較方向

### 延伸

- 選到最新 turn 會直接接續，選到較早 turn 會自動開新分支
- 內建 SketchPad 工作流，適合先做草圖與視覺構想
- 內建 editor 工作流，支援 inpainting、outpainting、reframe 與後續細修
- Versions 與 stage source 會直接顯示目前下一輪是從哪個來源延伸

### 檢視

- 支援純文字回應、provenance、grounding 與 insight 檢視
- 可在同一工作區中比較 sibling variants 與較早歷史結果
- 可直接把目前結果中的 prompt 脈絡帶進下一輪

### 回復

- 支援歷史保存、工作區還原、匯入與來源狀態一致的回復
- 支援 queued batch 工作流，處理較長時間的生成任務
- 支援多語系介面與明暗主題切換

## 支援模型

Nano Banana Ultra 目前支援三條 Gemini 影像模型路徑。介面會依模型能力顯示對應控制項，讓每條模型路徑都能發揮自己的長處，而不是全部共用同一套泛化表單。

### Nano Banana 2

- 模型 id：`gemini-3.1-flash-image-preview`
- 目前產品主流程的預設模型
- 具備最完整的比例、尺寸、grounding 與 thinking 控制面
- 適合高彈性、多輪延伸、以及參考圖驅動的工作流

### Nano Banana Pro

- 模型 id：`gemini-3-pro-image-preview`
- 偏向高品質輸出的進階路徑
- 適合高品質輸出與較講究控制感的工作流
- 適合把成品品質放在能力面廣度之前的使用者

### Nano Banana

- 模型 id：`gemini-2.5-flash-image`
- 保留作為較輕量、較低延遲的生成路徑
- 能力面比 Gemini 3 系列更精簡
- 適合需求較單純、希望更快完成生成的情境

## 典型工作流

### 創作

- 從文字 prompt 與參考圖開始
- 選擇模型、比例、尺寸、風格與生成設定
- 可以單張生成，也可以一次探索多個方向

### 編輯

- 選取任何成功結果作為下一輪工作來源
- 選到某分支最新 turn 會直接沿該分支接續，選到較早 turn 則會自動開出新分支
- 使用內建 editor 工作流做影像細修與局部調整
- 不需要每次都從零重建整張圖

### 探索

- 比較同一輪生成下的多個 sibling variants 與較早歷史 turn
- 利用 Versions 與來源狀態看清楚不同方向之間的關係
- 不需要先理解額外的查看 / 接續分流才能往下做下一輪

### 回復

- 重新整理後可還原先前工作區狀態
- 可匯入舊工作區，並用和目前工作區相同的選取規則決定下一輪來源
- 長流程工作時，歷史、stage 來源、與 Versions 狀態仍保持對齊

### 重用

- 直接重用目前結果中的純文字回應與 prompt 脈絡
- 在可用時查看 provenance 與 grounding 脈絡
- 把有價值的結果直接回灌到下一輪，而不是手動重複複製整理

## 版本總覽

### 最新版本：3.5.6

最新版本：3.5.6。版本細節請見 [CHANGELOG.md](CHANGELOG.md)。

### 3.5.x

3.5.x 是 Nano Banana Ultra 3.x 正式收斂成以選取為核心的工作區模型版本。history 選取現在會直接決定下一輪來源，stage 有圖時會把 `以此圖接續` 提升為主要動作，Versions 也改成直接顯示查看中與目前來源狀態，而不是再分開查看 / 接續。

簡單說，3.5.x 是目前產品真正的實用基準版。

### 3.x

3.x 版本包含 2.x 的全部能力，並代表 Nano Banana Ultra 目前的產品狀態：它已不是單次生成工具，而是以選取決定來源的流程為核心的 Gemini 影像工作區，採用 summary-first shell 與按需展開的 detail surfaces，並整合 persistent history、restore/import、provenance 檢視、queued batch、official conversation continuity，以及更安全的 file-backed recovery 行為。

### 2.x

2.x 版本包含 1.x 的全部能力，並把產品擴展成更完整的創作工作區。

2.x 新增：

- 從早期以 Nano Banana Pro 為主的單一路徑，擴展成完整的 Nano Banana 模型家族
- 雙軌參考圖區與拖放排序
- 大容量永久本地 prompt history
- 更成熟的 mobile 與 sidebar 行為修正
- 自訂模型選擇 UI 與更完整的多語系支援
- editor 版面優化與官方模型輸入限制處理
- 全域主題與語言設定同步
- 更完整的 tooltip 與整體 UI 一致性提升
- 系統狀態監控與更安全的本機 API 金鑰處理
- 更新後的 Gemini 模型命名與更清楚的執行健康狀態顯示
- 讓產品從單點生成逐步變成更完整的創作介面

### 1.x

1.x 版本建立了 Nano Banana Ultra 的核心創作基礎。

包含功能：

- 以 Nano Banana Pro `gemini-3-pro-image-preview` 為核心的最初模型路徑
- 早期影像編輯工作流
- 塗鴉與草圖輔助創作
- 初步多語系介面改進
- 第一代 prompt 與 editor 介面整理
- 建立 Nano Banana 作為影像創作工具的最初產品輪廓

## 版本細節

逐版本的 release 歷史請參考 [CHANGELOG.md](CHANGELOG.md).

## Repo 範圍說明

目前這個 repo 正式追蹤的是產品執行面、UI、build 相關內容，以及穩定的自動化測試契約。

現在 `tests/`、`e2e/`、`playwright.config.ts` 已經納入正式追蹤，讓 clean clone 下來的人可以直接拿到和 repo 內 wrapper scripts、dev-environment manifest 一致的測試驗證契約。

像 `docs/`、`.prettierignore`、`prettier.config.mjs` 這類本機開發資產，仍然刻意不納入正式追蹤範圍。如果你需要個人 scratch 測試或一次性 debug 用的 Playwright 流程，請放在 `tests-local/`、`e2e-local/` 或 `playwright.local.config.ts`，不要混進共享的正式測試面。

`output/`、`test-results/`、`playwright-report/`、`coverage/` 這類本機產物也同樣刻意不納入版本控制。

如果要使用正式放在 repo 內的本機開發工具與測試入口，請用 `run_install_all.bat`、`scripts/setup-dev-environment.bat`、`scripts/run-unit-tests.bat`、`scripts/run-e2e-tests.bat`，或 `npm run test -- ...`。現在 unit test 的探索規則也固定寫在 `vitest.config.ts`，所以正式支援的測試入口會持續錨定在 `App-Nano_Banana_Ultra`，不會跟著編輯器或 terminal 的目前工作目錄漂移。

Playwright 側欄操作與 browser-opening 流程有可能直接讀取 `playwright.config.ts`，而不是先經過 VS Code 的 launch/task。現在這份 config 與它使用的 e2e helper 都已經改成以 app 目錄自身為錨點，所以不論編輯器目前從哪個工作目錄啟動，`output/`、`test-results/` 與 dev server 啟動位置都會留在 `App-Nano_Banana_Ultra` 內。
