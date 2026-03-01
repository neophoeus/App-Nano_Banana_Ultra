# Nano Banana Ultra - v2.0 Release 🚀

*(English follows below)*

這是全新改版 (v2.0) 的 Nano Banana Ultra 影像生成應用程式。此專案基於前端 React 生態系建立，並直接串接 Google Gemini API 來協助使用者快速產生或編輯高品質的圖片。

> [!NOTE]
> 過去的 `v1.0` 舊版程式碼已封存，如果您需要查看舊版，請切換至 GitHub 上的 `v1.0-legacy` 標籤 (Tag)。

## ✨ 核心功能 (Features)

- **文字生圖 (Text-to-Image)**：輸入提示詞 (Prompt)，快速生成精美圖片。
- **圖生圖 / 風格轉換 (Image-to-Image & Style Transfer)**：上傳參考圖片，結合提示詞或內建風格，生成全新面貌的作品。
- **局部修改 (Inpainting)**：使用內建編輯器塗抹圖片特定區域，精準替換或修改細節。
- **智慧提示詞 (Smart Prompt Tools)**：包含「幫我寫 (Smart Rewrite)」與「驚喜一下 (Surprise Me)」功能，自動優化繪圖提示詞。
- **雙軌參考圖架構 (Dual Reference Trays)**：支援人物與物品獨立配置，並支援 HTML5 原生拖放 (Drag & Drop) 排序功能讓您輕鬆更動提示詞陣列。
- **手繪塗鴉板 (Sketch Pad)**：直接在畫布上勾勒草圖，作為生成的參考依據。
- **批次生成 (Batch Generation)**：一次生成多張圖片，節省等待時間。
- **豐富風格庫 (Rich Style Library)**：內建超過 40 種以上的影像風格 (如：賽博龐克、水彩、像素風、3D渲染等)。
- **多國語系與深色模式 (I18n & Dark Mode)**：支援多語言介面切換，並可依喜好切換深/淺色主題。

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

---

# Nano Banana Ultra - v2.0 Release 🚀

This is the newly rewritten version (v2.0) of the Nano Banana Ultra image generation application. Built on the React ecosystem, it integrates the Google Gemini API to help users generate or edit high-quality images quickly.

> [!NOTE]
> The previous `v1.0` codebase has been archived. If you need to reference the older version, please switch to the `v1.0-legacy` tag on GitHub.

## ✨ Features

- **Text-to-Image**: Generate beautiful images quickly by entering text prompts.
- **Image-to-Image & Style Transfer**: Upload reference images and combine them with prompts or built-in styles to create entirely new artworks.
- **Inpainting Editor**: Use the built-in editor to mask specific areas of an image for precise modification or detail replacement.
- **Smart Prompt Tools**: Includes "Smart Rewrite" and "Surprise Me" features to automatically optimize your drawing prompts using AI.
- **Dual Reference Trays**: Independently configure Characters and Objects schemas, equipped with native HTML5 Drag and Drop ordering for prompt structure matching.
- **Sketch Pad**: Draw rough sketches directly on the canvas to use as a structural reference for image generation.
- **Batch Generation**: Generate multiple images simultaneously to save waiting time.
- **Rich Style Library**: Comes with over 40 built-in image styles (e.g., Cyberpunk, Watercolor, Pixel Art, 3D Render, etc.).
- **I18n & Dark Mode**: Supports multiple interface languages and allows toggling between Light and Dark themes based on your preference.

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

---
*Built with React, Vite, and TailwindCSS. Powered by Google Gemini.*
