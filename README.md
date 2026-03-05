# Nano Banana Ultra 🚀

<details open>
<summary><b>🇧 English version</b></summary>

<br>

This is the newly rewritten version of the Nano Banana Ultra image generation application. Built on the React ecosystem, it integrates the Google Gemini API to help users generate or edit high-quality images quickly.

## ✨ Features

- **Text-to-Image**: Generate beautiful images quickly by entering text prompts.
- **Image-to-Image & Style Transfer**: Upload reference images and combine them with prompts or built-in styles to create entirely new artworks.
- **Advanced Model Selection**: Switch freely between the latest Gemini image models (Gemini 3.1 Flash, Gemini 3.0 Pro, Gemini 2.5 Flash). The UI smartly adapts and locks unsupported features based on your selection (e.g. tracking specific ratio limits or max object counts).
- **Global Theme & Language Sync**: SketchPad and ImageEditor now feature synchronized global theme and language controls for a seamless experience. Added consistent hover tooltips across all interactive UI elements.
- **Interactive Image Editor**: Built-in powerful canvas editor supporting Inpainting and Outpainting! Zoom, pan, and mask specific areas of an image using the brush tool for precise modification. Features a dedicated UI layout and optimized reference image limits specialized for editing tasks.
- **Dual Reference Trays**: Independently configure Characters and Objects schemas, equipped with native HTML5 Drag and Drop ordering for prompt structure matching.
- **Smart File Naming**: Auto-saving now embeds the generating model's name directly into the filename (e.g., `gemini-3-pro-image-preview-gen_...png`) for easy sorting and management.
- **Sketch Pad**: Draw rough sketches directly on the canvas to use as a structural reference for image generation.
- **Smart Prompt Tools**: Includes "Smart Rewrite" and "Surprise Me" features to automatically optimize your drawing prompts using AI.
- **Permanent Prompt History**: Your prompt history is now automatically saved securely to your local disk, supporting a massive **9,999** record capacity with smart UI rendering to prevent lag.
- **Batch Generation**: Generate multiple images simultaneously to save waiting time.
- **Rich Style Library**: Comes with over 40 built-in image styles (e.g., Cyberpunk, Watercolor, Pixel Art, 3D Render, etc.).
- **I18n & Dark Mode**: Supports multiple interface languages and allows toggling between Light and Dark themes based on your preference.
- **Mobile Optimized**: Featuring a completely fixed Z-Index hierarchy for sidebars and modals, ensuring a flawless and blur-free experience on mobile and tablet devices.

## 🛠️ Run Locally

**Prerequisites:** Node.js (v18+ recommended)

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Environment Setup:**
   - Copy the `.env.example` file and rename it to `.env.local`
   - Fill in your Gemini API key in the newly created `.env.local` file:

     ```env
     GEMINI_API_KEY=your_api_key_here
     ```

   *(Note: `.env.local` is intentionally ignored by Git to keep your API key secure).*

3. **Run the app in Development Mode:**

   ```bash
   npm run dev
   ```

4. **Build for Production:**

   ```bash
   npm run build
   ```

</details>

---

<details>
<summary><b>🇹🇼 繁體中文 (Traditional Chinese)</b></summary>
# Nano Banana Ultra 🚀

<br>

這是全新改版的 Nano Banana Ultra 影像生成應用程式。此專案基於前端 React 生態系建立，並直接串接 Google Gemini API 來協助使用者快速產生或編輯高品質的圖片。

## ✨ 核心功能 (Features)

- **文字生圖 (Text-to-Image)**：輸入提示詞 (Prompt)，快速生成精美圖片。
- **圖生圖 / 風格轉換 (Image-to-Image & Style Transfer)**：上傳參考圖片，結合提示詞或內建風格，生成全新面貌的作品。
- **進階模型選擇 (Advanced Model Selection)**：支援多款最新的 Gemini 影像生成模型（包含 Gemini 3.1 Flash, Gemini 3.0 Pro, Gemini 2.5 Flash 等）。介面會依據模型特性智慧化調整可用功能（例如根據模型限制動態匹配支援的長寬比或參考圖數量）。
- **全域佈景切換與語系同步**：手繪板 (SketchPad) 與編輯器 (ImageEditor) 現已與首頁完全同步色彩模式與語系設定。所有互動按鈕與滑桿皆已全面補齊懸停提示 (Tooltips)。
- **專業影像編輯器 (Interactive Image Editor)**：內建強大的畫布編輯器，支援局部修改 (Inpainting) 與畫面外擴 (Outpainting)！您可以在畫布上自由縮放原圖、使用筆刷塗抹遮罩，精準替換或擴充指定區域的細節。擁有專屬的最佳化操作介面與精準的參考圖數量控制設計。
- **雙軌參考圖架構 (Dual Reference Trays)**：支援人物與物品獨立配置，並支援 HTML5 原生拖放 (Drag & Drop) 排序功能讓您輕鬆更動提示詞陣列。
- **智慧檔名系統 (Smart File Naming)**：產生的圖片在存檔時，會自動擷取生成該圖片的 AI 模型名稱作為檔名標籤 (例如：`gemini-3-pro-image-preview-gen_...png`)，便於後續管理與分類。
- **手繪塗鴉板 (Sketch Pad)**：直接在畫布上勾勒草圖，作為生成的參考依據。
- **智慧提示詞 (Smart Prompt Tools)**：包含「幫我寫 (Smart Rewrite)」與「驚喜一下 (Surprise Me)」功能，自動優化繪圖提示詞。
- **永久歷史紀錄 (Permanent Prompt History)**：您的提示詞歷史將自動儲存在本機硬碟中，最高支援 **9,999** 筆超大容量，並採用智慧 UI 渲染，確保流暢不卡頓！
- **批次生成 (Batch Generation)**：一次生成多張圖片，節省等待時間。
- **豐富風格庫 (Rich Style Library)**：內建超過 40 種以上的影像風格 (如：賽博龐克、水彩、像素風、3D渲染等)。
- **多國語系與深色模式 (I18n & Dark Mode)**：支援多語言介面切換，並可依喜好切換深/淺色主題。
- **行動裝置完美適配 (Mobile Optimized)**：全新修復的側邊欄與彈出視窗 Z-Index 分層，確保在手機與平板上擁有與電腦版一樣完美的體驗。

## 🛠️ 本機執行 (Run Locally)

**環境要求：** Node.js (建議 v18 以上版本)

1. **安裝依賴套件 (Install dependencies)：**

   ```bash
   npm install
   ```

2. **環境變數設定 (Environment Setup)：**
   - 複製專案內的 `.env.example` 檔案，並將其重新命名為 `.env.local`
   - 將您的 Gemini API 金鑰填入剛建立的 `.env.local` 檔案中：

     ```env
     GEMINI_API_KEY=您的_API_KEY_填寫於此
     ```

   *(註：`.env.local` 已被 Git 忽略，因此直接填寫您的金鑰是安全的，不會被上傳到公開庫)*。

3. **啟動開發伺服器 (Run the app - Development Mode):**

   ```bash
   npm run dev
   ```

4. **打包正式環境版本 (Build for Production):**

   ```bash
   npm run build
   ```

</details>

---
*Built with React, Vite, and TailwindCSS. Powered by Google Gemini.*
