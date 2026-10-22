# Nano Banana Ultra (繁體中文)

[English](README.md) | [繁體中文](README.zh-TW.md)

Nano Banana Ultra 是一個以 Google Gemini 影像模型為核心的影像創作工作區，聚焦在生成、引導式編修，以及多輪延伸創作。它不是只給你一個 prompt 輸入框，而是把提示詞、參考圖、歷史、編輯、重用與還原都放進同一個持續運作的工作區裡。

它更像一個可以推進整條創作脈絡的影像 workspace，而不是一次性的生圖工具。你可以從草稿開始，一路做到批次探索、來源接續、局部編修、版本比較、工作區回復，最後再把有價值的結果帶回下一輪。

專案採用雙引擎架構，將本機 API 模式（Node 後端）與 AI Studio 運行模式（原 Ultra Lite 專案）完整整合成單一專案。你可以於本地環境啟動本機開發伺服器運行，也可以直接部署／運行於 Google AI Studio 環境。工作區支援自動環境偵測，亦可在頂部導覽列隨時手動切換執行引擎（「自動偵測」、「本地 API 運行」、「AI Studio 運行」），並配備即時「共享算力池狀態監視器」（包含正常、限流、擁塞、耗盡四段燈號）、自適應漏桶節流保護與深度錯誤封包解析，能智慧因應各類配額狀況而無須承受人為訂閱等級限制。

## 產品概要

- 它是以選取決定來源的 Gemini 影像工作區，不只是 prompt 輸入器
- 它把生成、編輯、比較、分支、還原與重用整合在同一條工作流
- 它會把 stage、history、Versions 與目前工作來源對齊，避免多輪創作時失去脈絡
- 它會依不同 Gemini 模型能力調整控制項，而不是把所有模型硬塞進同一套最低公約數介面
- 具備可自由縮放字級與緊湊圖示工具的提示詞編輯器
- 它適合需要長流程創作、比較、修正、回復與延伸的人

## 核心功能

### 創作

- 支援文字生圖、圖生圖、與風格導向生成
- 可在同一工作區內加入角色與物件參考圖
- 內建 Smart Rewrite、Surprise Me、Image to Prompt 等提示工具（由 `gemini-3.8-flash` 驅動）
- 可單張生成，也可用批次探索快速比較方向

### 延伸

- 選到最新 turn 會直接接續，選到較早 turn 會自動開新分支
- 內建 SketchPad 工作流，適合先做草圖與視覺構想
- 內建 editor 工作流，支援 inpainting、doodling、outpainting 與後續細修
- Reframe 構圖模式支援旋轉狀態下精確保留角度之包圍盒 Fit/Fill 幾何計算，與 45° 經典馬蹄鐵磁吸對齊
- Revolve 模式支援 3D 高斯波濺（3DGS）空間視角調整，提供 Orbit/Pan 工具、垂直 Zoom 滑桿（20%~300%）、滾輪縮放、滑鼠右鍵直接平移快捷鍵、邊緣保持雙邊深度場、3D 表面法向量幾何、原生 WebGL2 GPU 著色器即時渲染與 2D 容錯降級、獨立 [Src_1] 原圖通道保護使用者參考圖，以及通用多風格提示詞約束
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

Nano Banana Ultra 目前支援五條 Gemini 影像模型路徑。介面會依模型能力顯示對應控制項，讓每條模型路徑都能發揮自己的長處，而不是全部共用同一套泛化表單。

### Nano Banana 2.1

- 模型 id：`gemini-nano-banana-2.1`
- 目前產品主流程的預設旗艦模型
- 支援 1K、2K 與 4K 解析度、全部 14 種長寬比、最多 14 張參考圖（最多 10 個物件與 4 位角色）、思維等級（`minimal`、`medium`、`high`；預設為 `medium`）與 Grounding（網頁搜尋與圖片搜尋）
- 修復了 2K/4K 全景比例的網格拼貼瑕疵，最適合高擬真度多輪創作、編輯與複雜參考圖控制工作流

### Nano Banana 2

- 模型 id：`gemini-3.1-flash-image`
- 現行活躍模型，支援 1K、2K 與 4K 解析度，具備完整的比例、尺寸、grounding 與 thinking 控制面
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

## 工作區快照匯出與成品提取工具 (Workspace Extractor Companion)

當你在 **Google AI Studio 運行模式**（或純瀏覽器端 Client 模式）下使用本專案時，產出的成品圖片、變體圖、思考過程圖與歷史紀錄會內嵌保存在匯出的 `.json` 工作區快照檔案中（檔名預設為 `nano-banana-workspace-*.json`）。

如果你希望從匯出的工作區快照中批次提取出高解析度的純淨成品圖片（PNG / JPEG），並完整保留無損提示詞與生成中繼資料（Metadata），可以搭配使用專屬開源提取工具：

👉 **[App-Nano_Banana_Workspace_Extractor](https://github.com/neophoeus/App-Nano_Banana_Workspace_Extractor)**

- **純原生零依賴**：100% 原生 Node.js 實作，免去複雜的 `npm install`，並支援 Windows 桌面一鍵拖曳（`.bat`）與 CLI 批次解析。
- **無損中繼資料內嵌（極致無雜訊）**：
    - **PNG 格式**：將提示詞、模型、風格、尺寸等生成參數與思考過程完整內嵌至圖片的 `iTXt` 區塊。
    - **JPEG 格式**：針對 Gemini 模型產出之原生 JPEG，直接將結構化資料與標準參數注入標準 COM (`0xFF 0xFE`) 註解區塊，**不重新編碼或壓縮像素，100% 保持原圖無損畫質**。
    - 輸出目錄只保留乾淨的 `.png` 與 `.jpg` 圖片，不產生多餘的 `.txt` 檔案。
- **智慧過濾**：自動排除縮圖（Thumbnail）與舞台參考素材（Staged Assets），只萃取實際生成的成品圖、變體圖（Variant）與思考過程圖（Thought Image）。
- **專屬離線視覺化檢視器**：附帶輕量單檔 `viewer.html`，雙擊即可在瀏覽器中離線拖入圖片，提供高品質大圖預覽、底片切換條、結構化參數清單與**一鍵複製提示詞**功能。

## 版本總覽

### 最新版本：4.12.1

版本細節請見 [CHANGELOG.md](CHANGELOG.md)。

### 4.x 系列

4.x 系列確立了雙引擎架構（無縫橋接 Google AI Studio 瀏覽器直連模式與本機 Node.js 後端外掛），奠定專案進入生產級創作工作區的核心基礎。在全面收斂 Lite 版本的基石之上，4.x 帶來多圖生成漸進式即時預覽、多層級 Google AI 訂閱配額調度、以及突破瀏覽器限制的 IndexedDB v2 大型工作區快照持久化。

4.x 系列的核心重大里程碑包括：
- **共享算力池架構對齊與深度錯誤封包解析（v4.12.x）**：深度對齊 Google AI Studio 的 Build 模式基礎架構，確立預覽環境透過專案 API Key 呼叫標準 Gemini 開發者端點之機制。解除消費者訂閱等級（Pro/Ultra）的節流限制，改採統一基準節流、響應式算力池狀態燈號監控（🟢 正常 / 🟡 限流 / 🟠 擁塞 / 🔴 耗盡）與深度 Google RPC 錯誤封包解析器（`inspectGeminiErrorPacket`），精確區分個人每日配額耗盡（`RequestsPerDay` 即時中斷）、共享算力池擁塞（503 `MODEL_OVERLOADED` 去共振重試）與瞬時限流（RPM/TPM），徹底消除「billing details」導致的每日配額誤判。支援 Go/Protobuf 複合時間解析、每日配額耗盡時多圖批次提前止損、模型級別配額耗盡隔離，並強化診斷終端 Ring Buffer 防工作區快照洗版機制。
- **3D 空間視角互動操縱**：引入以 3D Gaussian Splatting (3DGS) 與 WebGL2 GPU 加速驅動的 Revolve 旋轉視角模式，將 3D 視角引導（`[Edit_1]`）與來源底圖（`[Src_1]`）完全解耦。
- **提示詞參考圖晶片與引用追蹤**：引進輸入框上方的快速插入標籤晶片（`[Obj_N]`、`[Char_N]`、`[Style_N]`），支援滑鼠懸停縮圖預覽卡片、游標精確插入、動態自動重排與底欄提示詞引用檢測條。
- **Gemini Nano Banana 2.1 旗艦模型整合**：全面導入主力預設模型 `gemini-nano-banana-2.1`，擴充思考等級矩陣（`medium`），並消除全 14 種長寬比在 2K/4K 輸出時的全景拼貼瑕疵。
- **Google 官方影像生成規範全面對齊**：深度對齊 Google 官方最新 Gemini Image Generation 與 Interactions API 規範（`ai.google.dev`），將解析度規格標準化（`'512'` 正規化為 `'512px'`），擴充風格參考圖（`gemini-3-pro-image` 專屬最多 3 張風格圖）與 Flash 模型多模態視訊輸入參考，並維持 9 國語言在地化完全對齊與 1,070 項測試 100% 通過。

### 3.5.x+（3.x 系列）

3.5.x 是 Nano Banana Ultra 3.x 正式收斂成以選取為核心的工作區模型版本，3.5.x 以後的所有版本皆為 3.x 系列的實用基準版：history 選取直接決定下一輪來源，stage 有圖時把 `以此圖接續` 提升為主要動作，Versions 直接顯示目前來源狀態。3.x 系列採用 summary-first shell 與按需展開的 detail surfaces，並整合 persistent history、restore/import、provenance 檢視、queued batch、official conversation continuity，以及更安全的 file-backed recovery 行為。

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
