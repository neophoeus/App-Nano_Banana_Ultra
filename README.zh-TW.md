# Nano Banana Ultra (繁體中文)

[English](README.md) | [繁體中文](README.zh-TW.md)

Nano Banana Ultra 是一個以 Google Gemini 影像模型為核心的影像創作工作區，聚焦在生成、引導式編修，以及多輪延伸創作。它不是只給你一個 prompt 輸入框，而是把提示詞、參考圖、歷史、編輯、重用與還原都放進同一個持續運作的工作區裡。

它更像一個可以推進整條創作脈絡的影像 workspace，而不是一次性的生圖工具。你可以從草稿開始，一路做到批次探索、來源接續、局部編修、版本比較、工作區回復，最後再把有價值的結果帶回下一輪。

這個 repo 是 Nano Banana Ultra 的本機 API 版本。如果你已經訂閱 Google AI Pro 或 Google AI Ultra，也可以改用 [App-Nano_Banana_Ultra_lite](https://github.com/neophoeus/App-Nano_Banana_Ultra_lite)：只要把它上傳到 Google AI Studio 裡執行，就能獲得相近的使用體驗，而且對 Google AI Pro / Ultra 訂閱者來說，額度通常也會更換算。

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

Nano Banana Ultra 目前支援四條 Gemini 影像模型路徑。介面會依模型能力顯示對應控制項，讓每條模型路徑都能發揮自己的長處，而不是全部共用同一套泛化表單。

### Nano Banana 2

- 模型 id：`gemini-3.1-flash-image`
- 目前產品主流程的預設模型
- 具備最完整的比例、尺寸、grounding 與 thinking 控制面
- 適合高彈性、多輪延伸、以及參考圖驅動的工作流

### Nano Banana 2 Lite

- 模型 id：`gemini-3.1-flash-lite-image`
- 專注於效率與低延遲的影像生成模型
- 限制為 1K 解析度，支援 14 種寬高比，最多可輸入 14 個物件參考，不支援角色參考，但支援思維控制
- 適合高頻率編輯或即時生成的應用情境

### Nano Banana Pro

- 模型 id：`gemini-3-pro-image`
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

### 最新版本：3.13.0

最新版本：3.13.0。實作亮綠色 `(R:0, G:255, B:0)` 重繪遮罩機制，並極簡化 Inpaint、Outpaint 與 Doodle 模式的提示詞，大幅提升大模型在修補與外擴時的指令遵循度。版本細節請見 [CHANGELOG.md](CHANGELOG.md)。

### 3.5.x

3.5.x 是 Nano Banana Ultra 3.x 正式收斂成以選取為核心的工作區模型版本。history 選取現在會直接決定下一輪來源，stage 有圖時會把 `以此圖接續` 提升為主要動作，Versions 也改成直接顯示查看中與目前來源狀態，而不是再分開查看 / 接續。

簡單說，3.5.x 是目前產品真正的實用基準版。

### 3.x

3.x 版本包含 2.x 的全部能力，並代表 Nano Banana Ultra 目前的產品狀態：它已不是單次生成工具，而是以選取決定來源的流程為核心的 Gemini 影像工作區，採用 summary-first shell 與按按需展開的 detail surfaces，並整合 persistent history、restore/import、provenance 檢視、queued batch、official conversation continuity，以及更安全的 file-backed recovery 行為。

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

Playwright 側欄操作與 browser-opening 流程有可能直接讀取 `playwright.config.ts`，而不是先經過 VS Code / Anti Gravity IDE 的 launch/task。現在這份 config 與它使用的 e2e helper 都已經改成以 app 目錄自身為錨點，所以不論編輯器目前從哪個工作目錄啟動，`output/`、`test-results/` 與 dev server 啟動位置都會留在 `App-Nano_Banana_Ultra` 內。
