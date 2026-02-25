<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Nano Banana Ultra - v2.0 Release 🚀

This is the newly rewritten version (v2.0) of Nano Banana Ultra, featuring significant architectural and UI improvements.

> [!NOTE]
> The previous `v1.0` codebase has been archived and is available under the `v1.0-legacy` tag on GitHub for reference.

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

   *(Note: `.env.local` is ignored by Git to keep your API key safe).*

3. **Run the app (Development Mode):**

   ```bash
   npm run dev
   ```

4. **Build for Production:**

   ```bash
   npm run build
   ```

---
*Built with React, Vite, and TailwindCSS. Powered by Google Gemini.*
