# Nano Banana Ultra

[English](README.md) | [繁體中文](README.zh-TW.md)

Nano Banana Ultra is a Gemini-powered image workspace for creation, guided editing, and multi-pass iteration. It is built for people who need to move an idea forward across multiple turns, compare alternatives, recover earlier work, and keep source context intact while they do it.

Instead of treating image generation as a disposable one-shot action, Nano Banana Ultra keeps prompting, references, history, editing, reuse, and restore inside one connected workspace flow.

The workspace runs on a high-performance local backend architecture powered by Node.js and the official Google Gemini API. It connects directly with your Gemini API key, providing robust offline image persistence, structured metadata embedding, prompt assistance, and interactive visual generation workflows without third-party proxy dependencies.

## At a Glance

- selection-first Gemini image workspace instead of a single prompt box
- one connected flow for create, edit, compare, branch, recover, and reuse
- source-aware history and Versions model so the current working source stays explicit
- model-aware controls that adapt to each Gemini image path instead of forcing one shared lowest-common-denominator UI
- flexible prompt composer with adjustable font sizing and compact aligned action tools
- built for longer-running visual work rather than only one-pass generation

## Core Capabilities

### Create

- text-to-image, image-to-image, and style-guided generation
- character and object references inside the same workspace flow
- prompt tools such as Smart Rewrite, Surprise Me, and Image to Prompt (powered by `gemini-3.8-flash`)
- single-result generation or batch exploration when you want to compare directions

### Iterate

- selection-first continuation where the latest turn continues and older turns branch automatically
- built-in SketchPad workflow for rough ideation before generation
- editor workflow for inpainting, doodling, outpainting, and follow-up refinement
- Reframe mode with exact rotated bounding-box Fit/Fill view preservation and 45° horseshoe magnetic angle snap
- Revolve mode with 3D Gaussian Splatting (3DGS) spatial perspective control, Orbit/Pan tools, vertical Zoom slider (20%~300%), wheel zoom, right-click drag pan shortcut, edge-preserving bilateral depth estimation, 3D surface normal geometry, hardware-accelerated WebGL2 GPU shader rendering with 2D fallback, independent [Src_1] source image channel protecting user references, and universal multi-style prompt conditioning
- direct Versions and stage-source visibility so it stays clear what the next pass is built from

### Review

- plain response text, provenance, grounding, and insight surfaces
- side-by-side comparison of sibling results and older turns in the same workspace
- reusable prompt context from current results when you want to push the next pass forward

### Recover

- persistent history, restore, import, and source-aware workspace recovery
- extractor-compatible result export with embedded PNG iTXt and JPEG COM metadata
- queued batch workflows for longer-running generation work
- multilingual UI plus light and dark themes

## Supported Models

Nano Banana Ultra currently supports five Gemini image-model paths. The UI exposes model-aware controls so each path can lean into its own strengths instead of being flattened into one generic settings surface.

### Nano Banana 2.1

- model id: `gemini-nano-banana-2.1`
- default mainline model in the current product flow
- upgraded flagship model supporting 1K, 2K, and 4K resolutions, all 14 aspect ratios, up to 14 reference images (up to 10 objects and 4 characters), thinking levels (`minimal`, `medium`, `high`; default `medium`), and grounding capabilities (Web Search and Image Search)
- resolves panoramic 2K/4K grid-tiling artifacts, making it ideal for high-fidelity generation, guided editing, and complex reference-conditioned workflows

### Nano Banana 2

- model id: `gemini-3.1-flash-image`
- active model supporting 1K, 2K, and 4K resolutions with broad capability surface across ratio, size, grounding, and thinking controls
- best fit for flexible generation, iteration, and reference-aware workspace use

### Nano Banana 2 Lite

- model id: `gemini-3.1-flash-lite-image`
- efficiency-focused specialist of the image generation family with low end-to-end latency
- restricted to 1K resolution, supporting 14 aspect ratios, up to 14 object references, 0 character references, and thinking capabilities
- best fit for high-volume interactive developer use cases and real-time generation needs

### Nano Banana Pro

- model id: `gemini-3-pro-image`
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

## Result Export & Workspace Extraction Companion

Nano Banana Ultra provides two complementary ways to export and manage your creative outputs:

1. **Native Result Export (`Export Results` button)**: Extract all generated artworks, variants, and optional thought images directly into a dedicated folder (default `./export` or custom folder) with generation parameters and structured metadata losslessly embedded into PNG `iTXt` and JPEG `COM` chunks.
2. **Workspace Snapshot Extractor**: If you backup or share entire workspace snapshots (`nano-banana-workspace-*.json`), you can extract raw high-resolution images with embedded metadata using the companion tool:

👉 **[App-Nano_Banana_Workspace_Extractor](https://github.com/neophoeus/App-Nano_Banana_Workspace_Extractor)**

- **Zero Dependencies**: 100% native Node.js implementation without `npm install`, supporting Windows desktop drag-and-drop batch scripts (`.bat`) and CLI batch extraction.
- **Lossless Metadata Injection (Zero Clutter)**:
    - **PNG Format**: Embeds generation prompts, models, styles, aspect ratios, and thinking logs directly into PNG `iTXt` chunks.
    - **JPEG Format**: For native JPEG outputs from Gemini models, injects structured metadata and standard parameters into COM (`0xFF 0xFE`) comment markers **without re-encoding or compressing pixels, maintaining 100% lossless image quality**.
    - Keeps output folders neat and tidy with pure `.png` and `.jpg` files without redundant `.txt` sidecars.
- **Intelligent Filtering**: Automatically isolates finished artworks, variants, and thought images while completely excluding low-res thumbnails and staged references.
- **Offline Visual HTML Viewer**: Includes a standalone single-file `viewer.html` for offline parameter inspection, filmstrip browsing, and one-click prompt copying.

## Version Overview

### Latest Release: 5.0.1

See [CHANGELOG.md](CHANGELOG.md) for details.

### 5.x Series

Version 5.x focuses on **architectural purification in alignment with Google AI Studio's policy adjustments**. As Google AI Studio preview mode discontinued browser-level consumer subscription quota injection—strictly requiring standard project API keys for model interaction—the dual-engine architecture and direct-browser runtime were formally retired. The platform converged onto a unified, high-performance local Node.js backend. Building on this clean foundation, 5.x introduces zero-dependency result extraction with embedded PNG `iTXt` and JPEG `COM` metadata (100% compatible with Workspace Extractor, A1111, and ComfyUI), native directory browsing, and enhanced end-to-end generation efficiency.

### 4.x Series

The core theme of the 4.x series was the **integration of the unified Dual-Engine Architecture**, seamlessly merging the local Node.js backend with Google AI Studio's direct browser mode into a single cohesive codebase. This resolved cross-environment persistence, quota scheduling, and advanced creative controls, establishing the production-grade foundation of the platform.

Key achievements across the 4.x series include:
- **Dual-Engine Integration & Adaptive Pacing Infrastructure**: Seamlessly bridged Google AI Studio preview environments and the local Node.js backend, equipped with real-time Shared Compute Pool health monitoring (🟢 Healthy / 🟡 Throttled / 🟠 Congested / 🔴 Exhausted), deep Google RPC error packet inspection (`inspectGeminiErrorPacket`), compound duration parsing, and dual-engine persistence isolation with IndexedDB v2 large workspace recovery.
- **Spatial 3D Viewpoint Manipulation**: Interactive Revolve mode powered by 3D Gaussian Splatting (3DGS) and WebGL2 GPU acceleration, decoupling viewpoint guidance (`[Edit_1]`) from source images (`[Src_1]`).
- **Prompt Reference Chips & Citation Tracking**: Interactive tag insertion chips (`[Obj_N]`, `[Char_N]`, `[Style_N]`) with hover preview cards, dynamic cursor placement, and live prompt citation tracking.
- **Flagship Model & Official Spec Alignment**: Full integration of `gemini-nano-banana-2.1` with thinking levels (`medium`) and panoramic 2K/4K artifact elimination, official API alignment (`512px` normalization, up to 3 style reference images, multimodal video inputs), progressive generation previews, and Gemini 2.5+ inherent safety alignment.

### 3.5.x+ (3.x Series)

Version 3.5.x established the practical selection-first baseline for Nano Banana Ultra 3.x, and all subsequent releases in the 3.x series build upon this foundation. History selection directly defines the next working source, staged-image continuation uses a stateful primary action, and Versions reflects source state through direct badges. The 3.x series delivers a summary-first shell with detail-on-demand surfaces, persistent history/restore flows, provenance review, queued-batch workflows, official-conversation continuity, and safer file-backed recovery.

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

Version 1.x established the creative foundation of Nano Banana Ultra.

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

Playwright sidebar actions and browser-opening flows can invoke `playwright.config.ts` directly instead of the VS Code / Antigravity IDE launch/task layer. That config and its e2e helpers are now anchored to the app directory itself so `output/`, `test-results/`, and dev-server startup stay inside `App-Nano_Banana_Ultra` regardless of the editor's current working directory.
