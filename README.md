# Nano Banana Ultra

[English](#english) | [繁體中文](#繁體中文)

<a id="english"></a>

## English

Nano Banana Ultra is a Gemini-powered visual creation workspace for image generation, guided editing, and continuity-based iteration. It is designed for people who do more than run one prompt at a time: concept artists, prompt designers, visual storytellers, and anyone who needs to evolve an image idea across multiple passes without losing context.

Instead of treating image generation as a disposable single-shot action, Nano Banana Ultra turns it into a persistent workspace. You can move from prompt drafting to reference-guided creation, from batch exploration to branch continuation, from targeted editing to result reuse, all inside one connected flow.

## Why It Feels Different

- it is built as a workspace, not just a prompt box
- it keeps image history, continuation state, and reusable outputs visible
- it supports both exploratory generation and more deliberate editing workflows
- it lets different Gemini image models expose different strengths without forcing a one-size-fits-all UI
- it is designed for iterative image work where compare, refine, continue, and recover are all first-class actions

## Product Highlights

- text-to-image, image-to-image, and style-guided creation
- built-in SketchPad workflow for rough visual ideation before generation
- image editing workflow for inpainting, outpainting, and follow-up refinement
- prompt enhancement tools such as Smart Rewrite and Surprise Me
- batch exploration, variant promotion, and branch-based continuation
- persistent history, restore, import, and continuity-aware workspace recovery
- structured output reuse, provenance review, and insight surfaces
- multilingual UI and light/dark theme support

## Supported Models

Nano Banana Ultra currently supports three Gemini image-model paths, each presented with capability-aware controls instead of a generic shared form.

### Nano Banana 2

- model id: `gemini-3.1-flash-image-preview`
- default mainline model in the current product flow
- supports broad aspect-ratio coverage and sizes from `512` to `4K`
- supports Google Search grounding and Image Search grounding paths
- supports selectable thinking levels in the current product flow
- best fit for flexible generation, richer grounding paths, and the broadest feature surface

### Nano Banana Pro

- model id: `gemini-3-pro-image-preview`
- quality-focused alternative for higher-end image work
- supports `1K`, `2K`, and `4K` image sizes in the current product path
- supports standard Google Search grounding
- supports structured-output-oriented flows where the product enables them
- best fit for users who want stronger high-quality output and richer controlled workflows

### Nano Banana

- model id: `gemini-2.5-flash-image`
- lighter legacy path kept for lower-latency image generation scenarios
- uses a narrower capability surface than the newer Gemini 3 family
- best fit for simpler, faster generation needs when the full Gemini 3.x surface is not required

## Core Workflows

### Create

- start from text prompts
- add character and object references
- choose aspect ratio, model, size, style, and generation settings
- generate one result or explore multiple outputs in a batch

### Edit

- reopen a result as the next working source
- refine images with the built-in editor workflow
- use inpainting and outpainting style edits for targeted changes
- carry prior results forward instead of rebuilding from scratch every time

### Explore

- compare sibling variants from the same creative pass
- promote exactly one result into the active continuation source when needed
- branch into different visual directions without flattening everything into one timeline

### Recover

- restore previous workspace state after reload
- import saved workspaces, reopen recovered turns, and continue from the right source state
- keep history, source, and continuity context visible across longer sessions

### Reuse

- extract reusable prompt material from structured outputs
- inspect provenance and grounding context when available
- push useful results back into the next generation pass instead of copying everything by hand

## Version Overview

### Latest Release: 3.4.1

Latest release: 3.4.1. See [CHANGELOG.md](CHANGELOG.md) for release details.

### 3.4.x

Version 3.4.x is where Nano Banana Ultra 3.x becomes truly usable as an everyday product. It turns the earlier 3.x groundwork into a clearer, steadier creative workspace: simpler support surfaces, more intentional follow-up behavior, more trustworthy history and restore flows, and a more cohesive generate-review-reuse loop.

In short, 3.4.x is the practical 3.x baseline.

### 3.x

Version 3.x includes everything from 2.x and represents the current Nano Banana Ultra product state: a continuity-first Gemini image workspace with a summary-first shell, detail-on-demand surfaces, persistent history and restore/import flows, structured-output and provenance reuse, queued-batch workflows, official-conversation continuity, and safer file-backed recovery behavior.

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

---

<a id="繁體中文"></a>

## 繁體中文

Nano Banana Ultra 是一個以 Google Gemini 影像模型為核心的視覺創作工作區產品，聚焦在影像生成、引導式編修、以及可延續的多輪創作流程。它不是只給你一個 prompt 輸入框，而是讓整個創作過程可以在同一個工作區裡持續推進。

你可以從提示詞開始，加入參考圖、做批次探索、從某一張結果繼續延伸、進入編輯模式做局部修正、在稍後重新還原工作區，再把有價值的結果重用到下一輪。整體體驗更像影像工作區，而不是一次性的生圖工具。

## 產品定位

- 它是工作區，不只是 prompt 輸入器
- 它把歷史、延續關係、與可重用結果保留在同一個產品空間
- 它同時支援探索式生成與較精準的編輯工作流
- 它會依不同 Gemini 模型能力調整介面，而不是所有模型都硬塞同一套控制項
- 它適合需要比較、修正、延續、還原、重用的長流程影像創作

## 產品重點

- 支援文字生圖、圖生圖、與風格導向生成
- 內建 SketchPad 與影像編輯工作流
- 提供 Smart Rewrite、Surprise Me 等提示詞增強工具
- 支援批次探索、變體升格、與 branch 式延續
- 支援歷史保存、工作區還原、匯入與延續導向回復
- 支援 structured output 重用、provenance 檢視、與 insight 顯示
- 支援多語系介面與明暗主題切換

## 支援模型

Nano Banana Ultra 目前支援三條 Gemini 影像模型路徑，並會依模型能力顯示不同的控制選項，而不是用同一個表單硬套全部模型。

### Nano Banana 2

- 模型 id：`gemini-3.1-flash-image-preview`
- 目前產品主流程的預設模型
- 支援從 `512` 到 `4K` 的解析度範圍與更廣的長寬比選擇
- 支援 Google Search grounding 與 Image Search grounding
- 在目前產品流程中支援 thinking level 選擇
- 適合需要高彈性、較完整功能面、以及較多 grounding 路徑的生成工作

### Nano Banana Pro

- 模型 id：`gemini-3-pro-image-preview`
- 偏向高品質輸出的進階路徑
- 在目前產品中支援 `1K`、`2K`、`4K` 尺寸
- 支援標準 Google Search grounding
- 在產品支援的路徑中可搭配 structured output 類能力
- 適合重視輸出品質、控制性、與較成熟工作流的使用者

### Nano Banana

- 模型 id：`gemini-2.5-flash-image`
- 保留作為較輕量、較低延遲的生成路徑
- 能力面比 Gemini 3 系列更精簡
- 適合需求較單純、希望更快完成生成的情境

## 核心工作流

### 創作

- 從文字 prompt 開始
- 加入角色與物件參考圖
- 選擇模型、比例、尺寸、風格與生成設定
- 可以單張生成，也可以一次探索多個結果

### 編輯

- 把某張結果重新打開成下一輪工作來源
- 使用內建 editor 工作流做影像細修
- 透過 inpainting、outpainting 這類方式做局部調整
- 不需要每次都從零重建整張圖

### 探索

- 比較同一輪生成下的多個 sibling variants
- 在需要時只升格其中一張成為 active continuation source
- 讓不同視覺方向能分支發展，而不是全部擠進同一條線

### 回復

- 重新整理後可還原先前工作區狀態
- 可匯入舊工作區、重新開啟還原回合，並從正確的來源狀態延續
- 長流程工作時，歷史、來源、延續脈絡仍保持可見

### 重用

- 從 structured output 擷取可重用的 prompt 素材
- 在可用時查看 provenance 與 grounding 脈絡
- 把有價值的結果直接回灌到下一輪，而不是手動重複複製整理

## 版本總覽

### 最新版本：3.4.1

最新版本：3.4.1。版本細節請見 [CHANGELOG.md](CHANGELOG.md)。

### 3.4.x

3.4.x 才是 Nano Banana Ultra 3.x 真正進入日常可用狀態的版本。它把前面 3.x 累積的方向正式收斂成更清楚、更穩定、也更像產品的創作工作區：support surfaces 更簡潔、follow-up 行為更明確、history 與 restore 更可靠，整體 generate-review-reuse 流程也終於真正接起來。

簡單說，3.4.x 才是 3.x 的實用基準版。

### 3.x

3.x 版本包含 2.x 的全部能力，並代表 Nano Banana Ultra 目前的產品狀態：它已不是單次生成工具，而是以 continuity 為核心的 Gemini 影像工作區，採用 summary-first shell 與按需展開的 detail surfaces，並整合 persistent history、restore/import、structured output 與 provenance 重用、queued batch、official conversation continuity，以及更安全的 file-backed recovery 行為。

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
