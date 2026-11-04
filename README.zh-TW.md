# Nano Banana Ultra (繁體中文)

[English](README.md) | [繁體中文](README.zh-TW.md)

Nano Banana Ultra 是一個以 Google Gemini 影像模型為核心的影像創作工作區，聚焦在生成、引導式編修，以及多輪延伸創作。它不是只給你一個 prompt 輸入框，而是把提示詞、參考圖、歷史、編輯、重用與還原都放進同一個持續運作的工作區裡。

它更像一個可以推進整條創作脈絡的影像 workspace，而不是一次性的生圖工具。你可以從草稿開始，一路做到批次探索、來源接續、局部編修、版本比較、工作區回復，最後再把有價值的結果帶回下一輪。

專案採用高效能本機後端架構（Node.js 外掛），深度整合官方 Google Gemini API。支援單一 `GEMINI_API_KEY` 直連呼叫，亦支援雙金鑰智慧分流模式（`GEMINI_FREE_API_KEY` 供免費模型與輔助工具、`GEMINI_PAID_API_KEY` 供付費旗艦模型與 4K/影片上傳，兼顧極致效能與費用節省），提供穩健的本機影像儲存、結構化中繼資料內嵌匯出、提示詞智能增強與互動式視覺創作工作流，無須依賴任何第三方代理服務。

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
- 可在同一工作區內加入角色、物件、風格參考圖，以及多模態視訊參考（支援模型可透過 Gemini Files API 上傳本機影片或貼上公開 YouTube 網址）
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
- **整合式圖片中繼資料檢視器 (Metadata Viewer)**：
    - **純離線免伺服器模式**：直接將圖片或資料夾拖曳至根目錄的 `run_read_metadata.bat`，或在瀏覽器開啟 `scripts/metadata-viewer/viewer.html`，純前端解析，完全不用啟動 Node/Vite 伺服器即可離線查看。支援自動識別同目錄或 `./output` 下同檔名的 `<stem>.json` 側車檔案，亦可使用 CLI 指令 `npm run read:metadata <image>`。
    - **App 內建抽屜檢視器**：在提示詞輸入區底部的「進階設定」旁，點擊 **`讀取參數`** 即可從右側呼叫出檢視抽屜。支援多圖與側車 JSON 拖放、鍵盤左右切換與底片軸預覽，並可一鍵 **「套用提示詞」**、**「套用設定」** 或 **「同時套用」** 至目前編輯區。

### 回復

- 支援歷史保存、工作區還原、匯入與來源狀態一致的回復
- 支援 queued batch 工作流，處理較長時間的生成任務
- 提示詞面板優化：「生成回合數」控制項已直接移入生成操作卡片的佇列列旁，版面更緊湊流暢
- 支援多語系介面與明暗主題切換

## 支援模型

Nano Banana Ultra 目前支援五條 Gemini 影像模型路徑。介面會依模型能力顯示對應控制項，讓每條模型路徑都能發揮自己的長處，而不是全部共用同一套泛化表單。

### Nano Banana 2.1

- 模型 id：`gemini-nano-banana-2.1`
- 目前產品主流程的預設旗艦模型
- 支援 1K、2K 與 4K 解析度、全部 14 種長寬比、最多 14 張參考圖（最多 10 個物件與 4 位角色）、多模態視訊參考（Gemini Files API 本機影片上傳與公開 YouTube 網址，輸入上限 131,072 tokens）、思維等級（`minimal`、`medium`、`high`；預設為 `medium`）與 Grounding（網頁搜尋與圖片搜尋）
- 修復了 2K/4K 全景比例的網格拼貼瑕疵，最適合高擬真度多輪創作、編輯與複雜參考圖控制工作流

### Nano Banana 2

- 模型 id：`gemini-3.1-flash-image`
- 現行活躍模型，支援 512px、1K、2K 與 4K 解析度，全部 14 種長寬比，最多 14 張參考圖（最多 10 個物件與 4 位角色），多模態視訊參考（Files API 與公開 YouTube 網址，輸入上限 131,072 tokens），具備完整的比例、尺寸、grounding 與 thinking（`minimal`、`high`）控制面
- 適合高彈性、多輪延伸、以及參考圖驅動的工作流

### Nano Banana 2 Lite

- 模型 id：`gemini-3.1-flash-lite-image`
- 專注於效率與極低延遲的影像生成模型
- 限制為 1K 解析度，支援 14 種寬高比，最多可輸入 14 個物件參考，不支援角色參考，支援思維控制（`minimal`、`high`）與多模態視訊參考（Files API 與公開 YouTube 網址）
- 官方輸入 Token 上限為 65,536 tokens（為 2.1 / 2 的一半）；專為極速批次與即時開發工作流設計，具備 1/6 極低視訊輸入成本（比 2.1 便宜 83%，搭配 Eco 模式極為合適），並於前端上傳區與快捷標籤提供專屬輔助提示與容量引導

### Nano Banana Pro

- 模型 id：`gemini-3-pro-image`
- 偏向高品質輸出的進階路徑
- 適合高品質輸出與較講究控制感的工作流，支援 1K、2K、4K 解析度，10 種長寬比，最多 6 個物件、5 位角色與 3 張風格參考圖，以及 Google 網頁搜尋 Grounding（不支援視訊參考）
- 適合把成品品質放在能力面廣度之前的使用者

### Nano Banana

- 模型 id：`gemini-2.5-flash-image`
- 保留作為較輕量、較低延遲的生成路徑
- 能力面比 Gemini 3 系列更精簡（10 種長寬比，最多 3 個物件參考；不支援視訊參考）
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

## 成品匯出與工作區快照提取工具 (Result Export & Extractor Companion)

Nano Banana Ultra 提供兩種靈活互補的成果匯出與歸檔管道：

1. **工作區內建「匯出成品」（Export Results）**：直接在工作區點擊「匯出成品」按鈕，即可將歷史生成成果（主圖、變體圖、可選思考過程圖）一鍵批次導出至指定資料夾（預設 `./export`，支援 Windows 原生資料夾選擇器），自動完成主圖去重並將生成參數完整內嵌至 PNG `iTXt` 與 JPEG `COM` 區塊。
2. **工作區快照批次提取器（Workspace Extractor）**：若你匯出並備份了完整的 `.json` 工作區快照檔案（`nano-banana-workspace-*.json`），可搭配使用專屬開源提取工具進行離線批量解析與圖片元數據內嵌：

👉 **[App-Nano_Banana_Workspace_Extractor](https://github.com/neophoeus/App-Nano_Banana_Workspace_Extractor)**

- **純原生零依賴**：100% 原生 Node.js 實作，免去複雜的 `npm install`，並支援 Windows 桌面一鍵拖曳（`.bat`）與 CLI 批次解析。
- **無損中繼資料內嵌（極致無雜訊）**：
    - **PNG 格式**：將提示詞、模型、風格、尺寸等生成參數與思考過程完整內嵌至圖片的 `iTXt` 區塊。
    - **JPEG 格式**：針對 Gemini 模型產出之原生 JPEG，直接將結構化資料與標準參數注入標準 COM (`0xFF 0xFE`) 註解區塊，**不重新編碼或壓縮像素，100% 保持原圖無損畫質**。
    - 輸出目錄只保留乾淨的 `.png` 與 `.jpg` 圖片，不產生多餘的 `.txt` 檔案。
- **智慧過濾**：自動排除縮圖（Thumbnail）與舞台參考素材（Staged Assets），只萃取實際生成的成品圖、變體圖（Variant）與思考過程圖（Thought Image）。
- **專屬離線視覺化檢視器**：附帶輕量單檔 `viewer.html`，雙擊即可在瀏覽器中離線拖入圖片，提供高品質大圖預覽、底片切換條、結構化參數清單與**一鍵複製提示詞**功能。

## 版本總覽

### 最新版本：5.7.1

完整歷史版本紀錄與更新細節請見 [CHANGELOG.md](CHANGELOG.md)。

### 5.x 系列

5.x 系列的核心在於**配合 Google AI Studio 官方政策調整進行架構純化**。全面回歸單一、純淨且高效的本機 Node.js 後端架構，徹底廢除已無存在意義的 AI Studio 雙引擎直連分支、算力池監控與歷史自動備份殘留；並全面導入零外部依賴的「成品匯出」（100% 相容 Workspace Extractor、A1111 與 ComfyUI，無損內嵌 PNG iTXt 與 JPEG COM 參數）、全新整合的「雙模中繼資料檢視器」（廢除 Workspace Extractor）、角色感知每圖元解析度（`MediaResolution`）無損 Token 最佳化、Nano Banana 2.1 / 2 / 2 Lite 多模態視訊參考（Gemini Files API 與 YouTube）、**品質／節流最佳化模式（Quality/Eco Modes）**，以及**雙金鑰（免費/付費層級）智慧分流與串聯降級引擎**（含即時 Toast 通知），帶來極致流暢純淨的端到端創作體驗。

### 4.x 系列

4.x 系列的核心主軸為**整合雙引擎架構（Dual-Engine Architecture）**：正式將原先獨立運作於 Google AI Studio 預覽環境的 [App-Nano_Banana_Ultra_lite](https://github.com/neophoeus/App-Nano_Banana_Ultra_lite) 完整整合進本專案（並將該專案宣告廢除），將本機 Node.js API 模式與 AI Studio 瀏覽器直連模式（Direct Mode）融合為單一專案，解決跨環境下的配額調度、狀態持久化與進階創作控制，奠定專案進入生產級創作工作區的基石。其核心里程碑包括：

- **雙引擎架構整合與自適應節流調度**：無縫串聯 Google AI Studio 預覽環境與本機 Node.js 後端，配備即時「共享算力池狀態燈號」（🟢 正常 / 🟡 限流 / 🟠 擁塞 / 🔴 耗盡）、深度 Google RPC 錯誤封包解析（精確區分每日配額、503 伺服器擁塞與瞬態限流）、複合時長解析，以及雙引擎持久化語意隔離與 IndexedDB v2 大型工作區快照還原。
- **3D 空間視角互動操縱**：引入以 3D Gaussian Splatting (3DGS) 與 WebGL2 GPU 加速驅動的 Revolve 旋轉視角模式，將 3D 視角引導（[Edit_1]）與來源底圖（[Src_1]）完全解耦。
- **提示詞參考圖晶片與引用追蹤**：引進輸入框上方快速標籤晶片（[Obj_N]、[Char_N]、[Style_N]），支援滑鼠懸停縮圖預覽卡片、游標精確插入、動態自動重排與底欄提示詞引用檢測條。
- **旗艦模型與官方影像生成規範對齊**：全面導入主力旗艦模型 gemini-nano-banana-2.1（支援 medium 思考等級與全 14 種比例 2K/4K 全景拼貼消除）、官方 API 規範對齊（標準 512px 解析度、最多 3 張風格參考圖、多模態視訊輸入）、多圖漸進式即時預覽，以及 Gemini 2.5+ 模型內生安全架構對齊。

### 3.x 系列

3.x 系列採用 summary-first shell 與按需展開的 detail surfaces，並以選取為核心的工作區模型（3.5.x 起收斂為實用基準版：歷史選取直接決定下一輪來源、stage 有圖時將「以此圖接續」設為主要動作、Versions 顯示目前來源狀態），整合 persistent history、restore/import、provenance 檢視、queued batch、official conversation continuity，以及更安全的 file-backed recovery 行為。

### 2.x 系列

2.x 版本把產品從早期單點生成擴展為完整的創作工作區，新增 Nano Banana 全模型家族支援、雙軌參考圖區與拖放排序、9999 筆大容量本機提示詞歷史、自訂模型選擇 UI、全域主題與 9 國語言同步、系統狀態即時監控儀表板，以及官方模型輸入限制與更安全的本機金鑰管理。

### 1.x 系列

1.x 版本建立了 Nano Banana Ultra 的核心創作基礎，奠定以 Nano Banana Pro gemini-3-pro-image-preview 為核心的最初模型路徑、早期影像編輯工作流、塗鴉與草圖輔助創作、初步多語系介面，以及第一代 prompt 與 editor 介面整理。

## Repo 範圍說明

目前這個 repo 正式追蹤的是產品執行面、UI、build 相關內容，以及穩定的自動化測試契約。

現在 `tests/`、`e2e/`、`playwright.config.ts` 已經納入正式追蹤，讓 clean clone 下來的人可以直接拿到和 repo 內 wrapper scripts、dev-environment manifest 一致的測試驗證契約。

像 `.prettierignore`、`prettier.config.mjs` 這類本機開發資產，仍然刻意不納入正式追蹤範圍。

`output/`、`test-results/`、`playwright-report/`、`coverage/` 這類本機產物也同樣刻意不納入版本控制。

如果要使用正式放在 repo 內的本機開發工具與測試入口，請用 `run_install_all.bat`、`scripts/setup-dev-environment.bat`、`scripts/run-unit-tests.bat`、`scripts/run-e2e-tests.bat`，或 `npm run test -- ...`。現在 unit test 的探索規則也固定寫在 `vitest.config.ts`，所以正式支援的測試入口會持續錨定在 `App-Nano_Banana_Ultra`，不會跟著編輯器或 terminal 的目前工作目錄漂移。

Playwright 側欄操作與 browser-opening 流程有可能直接讀取 `playwright.config.ts`，而不是先經過 VS Code / Anti Gravity IDE 的 launch/task。現在這份 config 與它使用的 e2e helper 都已經改成以 app 目錄自身為錨點，所以不論編輯器目前從哪個工作目錄啟動，`output/`、`test-results/` 與 dev server 啟動位置都會留在 `App-Nano_Banana_Ultra` 內。
