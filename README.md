# Nano Banana Ultra

[English](README.md) | [繁體中文](README.zh-TW.md)

Nano Banana Ultra is a Gemini-powered image workspace for creation, guided editing, and multi-pass iteration. It is built for people who need to move an idea forward across multiple turns, compare alternatives, recover earlier work, and keep source context intact while they do it.

Instead of treating image generation as a disposable one-shot action, Nano Banana Ultra keeps prompting, references, history, editing, reuse, and restore inside one connected workspace flow.

The workspace features a dual-engine architecture combining both the Local API (Node backend) and AI Studio mode into a single cohesive codebase. You can run it locally with your local dev server, or run directly within Google AI Studio to take advantage of Google AI Studio environments. The workspace automatically detects the environment and provides an on-the-fly engine selector in the top bar (`Auto Detect`, `Local API`, and `AI Studio`), along with real-time Shared Compute Pool health monitoring (Healthy, Throttled, Congested, Exhausted), workload-adaptive leaky-bucket pacing, and deep error packet inspection to intelligently handle rate limits and pool congestion without arbitrary subscription tier penalties.

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

## Workspace Export & Image Extraction Companion

When running in **Google AI Studio Mode** (or client-side browser mode), all generated images, variant outputs, thought images, and session histories are embedded directly inside exported `.json` workspace snapshots (default filename pattern: `nano-banana-workspace-*.json`).

If you want to extract raw high-resolution images (PNG / JPEG) directly from these workspace files while embedding complete generation prompts and metadata into the images themselves, you can use the companion tool:

👉 **[App-Nano_Banana_Workspace_Extractor](https://github.com/neophoeus/App-Nano_Banana_Workspace_Extractor)**

- **Zero Dependencies**: 100% native Node.js implementation without `npm install`, supporting Windows desktop drag-and-drop batch scripts (`.bat`) and CLI batch extraction.
- **Lossless Metadata Injection (Zero Clutter)**:
    - **PNG Format**: Embeds generation prompts, models, styles, aspect ratios, and thinking logs directly into PNG `iTXt` chunks.
    - **JPEG Format**: For native JPEG outputs from Gemini models, injects structured metadata and standard parameters into COM (`0xFF 0xFE`) comment markers **without re-encoding or compressing pixels, maintaining 100% lossless image quality**.
    - Keeps output folders neat and tidy with pure `.png` and `.jpg` files without redundant `.txt` sidecars.
- **Intelligent Filtering**: Automatically isolates finished artworks, variants, and thought images while completely excluding low-res thumbnails and staged references.
- **Offline Visual HTML Viewer**: Includes a standalone single-file `viewer.html` for offline parameter inspection, filmstrip browsing, and one-click prompt copying.

## Version Overview

### Latest Release: 4.13.0

See [CHANGELOG.md](CHANGELOG.md) for details.

### 4.x Series

Version 4.x establishes the unified dual-engine architecture (seamlessly bridging Google AI Studio direct browser mode and the local Node.js backend plugin) and serves as the production-grade foundation for the entire platform. Building upon the core convergence of the Lite edition, 4.x delivers progressive multi-image generation previews, multi-tier Google AI quota pacing, and persistent IndexedDB v2 large workspace recovery.

Key milestones across the 4.x series include:
- **Gemini 2.5+ Inherent Safety Alignment & Obsolete Safety Settings Retirement (v4.13.0)**: Formally aligned with Google Gemini API 2.5+ official specifications where external safety filter thresholds default to Off due to model-level inherent safety (RLHF). Completely retired legacy safety setting UI dropdowns, store states, and API payload parameters across 38 files, streamlining generation request contracts and ensuring clean, direct interaction with modern Gemini models.
- **Shared Compute Pool Architecture Alignment & Deep Error Packet Inspection (v4.12.x)**: Formally aligned with Google AI Studio's Build mode infrastructure where preview environments access standard Gemini Developer API endpoints via project API keys. Eliminated legacy consumer subscription tier pacing penalties in favor of unified adaptive pacing, reactive Compute Pool health monitoring (🟢/🟡/🟠/🔴), and a deep Google RPC error inspection engine (`inspectGeminiErrorPacket`) that differentiates daily quota exhaustion (`RequestsPerDay`), shared pool congestion (503 `MODEL_OVERLOADED`), and transient rate limits (RPM/TPM) without false-positive daily aborts. Features Go/Protobuf compound duration parsing, multi-image batch early termination on genuine daily exhaustion, isolated per-model exhaustion tracking, and diagnostic telemetry ring-buffer protections.
- **Spatial 3D Viewpoint Manipulation**: Interactive Revolve mode powered by 3D Gaussian Splatting (3DGS) and WebGL2 GPU acceleration, decoupling viewpoint guidance (`[Edit_1]`) from source images (`[Src_1]`).
- **Prompt Reference Chips & Citation Tracking**: Interactive tag insertion chips (`[Obj_N]`, `[Char_N]`, `[Style_N]`) with downward-projecting hover preview cards and live prompt citation tracking.
- **Gemini Nano Banana 2.1 Flagship Integration**: Full support for `gemini-nano-banana-2.1` with expanded thinking level matrix (`medium`), seamless quota pacing, and panoramic 2K/4K artifact elimination across all 14 aspect ratios.
- **Official Image Generation Spec Alignment**: Full alignment with Google's official Gemini Image Generation & Interactions API specifications (`ai.google.dev`), introducing canonical `512px` resolution normalization, first-class Style Reference images (up to 3 style images on `gemini-3-pro-image`), and multimodal video input reference support on Flash models with complete 9-language localization.

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
