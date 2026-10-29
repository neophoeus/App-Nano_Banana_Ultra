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
- **Integrated Image Metadata Viewer & Reuser**:
    - **Serverless Standalone Mode**: Drag images or folders directly onto `run_read_metadata.bat` or open `scripts/metadata-viewer/viewer.html` in any browser. 100% offline client-side parsing without running Node/Vite dev servers. Automatically pairs `<stem>.json` sidecars in the same directory or `./output`. Node.js CLI also available via `npm run read:metadata <image>`.
    - **In-App Slide-out Drawer**: Click **`Read Metadata`** next to Advanced Settings below the prompt box to open the slide-out inspector. Supports multi-image/sidecar drop, filmstrip navigation, and 1-click **"Apply Prompt"**, **"Apply Settings"**, or **"Apply Both"** into the active composer.

### Recover

- persistent history, restore, import, and source-aware workspace recovery
- extractor-compatible result export with embedded PNG iTXt and JPEG COM metadata
- queued batch workflows for longer-running generation work
- streamlined composer layout with Round Count relocated alongside Queue actions
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

### Latest Release: 5.5.0

See [CHANGELOG.md](CHANGELOG.md) for details.

### 5.x Series

Version 5.x focuses on **architectural purification in alignment with Google AI Studio's official policy adjustments**. The platform converged onto a unified, high-performance local Node.js backend, completely excising the legacy AI Studio direct-browser runtime, compute pool monitors, and redundant storage alerts. Building on this clean foundation, 5.x introduces zero-dependency result extraction with embedded PNG iTXt and JPEG COM metadata (100% compatible with Workspace Extractor, A1111, and ComfyUI), a newly integrated **Dual-Mode Image Metadata Viewer** (retiring Workspace Extractor), and a streamlined composer layout with round count controls repositioned beside generate actions.

#### 5.x Release History

- **v5.5.0** (2026-10-29): Reference Video Integration (Gemini Files API & YouTube) for Nano Banana 2/2.1, Default Thought Process Image Export, and Generation Lock Resilience
- **v5.4.0** (2026-10-29): Quality/Eco Optimization Modes, Global Flat Icon System, High-Contrast Read Metadata, Seamless Viewport Ambient Lighting, .gitignore Purification, and E2E Workspace Snapshot Isolation
- **v5.3.0** (2026-10-29): Role-Aware Per-Part MediaResolution, Multi-Turn Lossless Token Optimization, and Token Usage Telemetry
- **v5.2.0** (2026-10-29): Export Results Auto-Close & Filename Local Timestamp Alignment, Output Directory Selective Clear, and Workspace Metadata Viewer Compatibility
- **v5.1.0** (2026-10-28): Dual-Mode Image Metadata Viewer Integration, Workspace Extractor Retirement, and Composer Round Count Layout Refactor
- **v5.0.1** (2026-10-28): Deep Forensic Architecture Purification, Dual-Engine Provider & Virtual Image Layer Elimination, Frontend Key Isolation
- **v5.0.0** (2026-10-28): Unified Local Engine Architecture, AI Studio Dual-Engine Retirement (Policy Alignment), Extractor-Compatible Result Export with Embedded Metadata

### 4.x Series

The core theme of the 4.x series was the **integration of the unified Dual-Engine Architecture**: formally integrating and retiring the standalone [App-Nano_Banana_Ultra_lite](https://github.com/neophoeus/App-Nano_Banana_Ultra_lite) browser edition into this repository, merging the local Node.js backend with Google AI Studio's direct browser mode into a single cohesive codebase. This resolved cross-environment persistence, quota scheduling, and advanced creative controls, establishing the production-grade foundation of the platform. Key milestones include:

- **Dual-Engine Integration & Adaptive Pacing Infrastructure**: Seamlessly bridged Google AI Studio preview environments and the local Node.js backend, equipped with real-time Shared Compute Pool health monitoring (🟢 Healthy / 🟡 Throttled / 🟠 Congested / 🔴 Exhausted), deep Google RPC error packet inspection (inspectGeminiErrorPacket), compound duration parsing, and dual-engine persistence isolation with IndexedDB v2 large workspace recovery.
- **Spatial 3D Viewpoint Manipulation**: Interactive Revolve mode powered by 3D Gaussian Splatting (3DGS) and WebGL2 GPU acceleration, decoupling viewpoint guidance ([Edit_1]) from source images ([Src_1]).
- **Prompt Reference Chips & Citation Tracking**: Interactive tag insertion chips ([Obj_N], [Char_N], [Style_N]) with hover preview cards, dynamic cursor placement, and live prompt citation tracking.
- **Flagship Model & Official Spec Alignment**: Full integration of gemini-nano-banana-2.1 with thinking levels (medium) and panoramic 2K/4K artifact elimination, official API alignment (512px normalization, up to 3 style reference images, multimodal video inputs), progressive generation previews, and Gemini 2.5+ inherent safety alignment.

#### 4.x Release History

- **v4.14.0** (2026-10-28): Dual-Engine Persistence Isolation, 404 Shared Endpoint Guardrails, Safety Block Short-Circuiting & Server-Directed Rate-Limit Recovery
- **v4.13.0** (2026-10-22): Deprecation & Complete Retirement of Obsolete Safety Settings, Alignment with Gemini 2.5+ Inherent Safety Architecture
- **v4.12.1** (2026-10-22): Production Diagnostics Forensics, Deep 429 Classification Refinement & Telemetry Buffer Protection
- **v4.12.0** (2026-10-22): AI Studio Shared Compute Pool Architecture Alignment, Deep Error Packet Inspection & Telemetry Monitors
- **v4.11.0** (2026-10-20): AI Studio-Compatible 3DGS Revolve Rendering Upgrade & Official Queued Batch Workflow Alignment
- **v4.10.0** (2026-10-12): Google Gemini Official Image Generation Spec Alignment, Style Reference Images & Multimodal Video-to-Image Support
- **v4.9.1** (2026-10-12): Gemini Nano Banana 2.1 Temperature Parameter Removal & Request Config Alignment
- **v4.9.0** (2026-10-12): Gemini Nano Banana 2.1 Flagship Model Integration, Default Migration & Expanded Thinking Matrix
- **v4.8.1** (2026-10-01): Reference Tag Tooltip Viewport Boundary Fix & Hover Presentation Polish
- **v4.8.0** (2026-10-01): Reference Image Quick-Insert Tags, Live Hover Previews & Prompt Citation Tracking
- **v4.7.2** (2026-10-01): Progressive Batch Generation Preview & Gallery Synchronization Fix
- **v4.7.1** (2026-09-23): Lite Edition Parity: Multilingual Window Confirmation, Extended Lifecycle Test Coverage & Browser-Only Test Service Overrides
- **v4.7.0** (2026-09-21): Gemini Batch Queue Official Standardization & App Shell Modularization
- **v4.6.2** (2026-09-21): 3DGS Solution A+B: Edge-Aware Disparity Fields, Surface Normal Geometry & WebGL2 GPU Acceleration
- **v4.6.1** (2026-09-21): Revolve Independent Source Image Channel [Src_1], Universal Multi-Style Prompt & Reference Image Preservation
- **v4.6.0** (2026-09-21): Revolve 3D Gaussian Splatting Spatial Perspective, Pan/Zoom Controls & Reframe Geometry Precision
- **v4.5.0** (2026-09-09): Full Lite Feature Integration Milestone & Zero-Regression Quota Protection
- **v4.4.4** (2026-09-09): Sequential Batch Generation Progressive Preview & Direct Mode Large Workspace Thumbnail Resilience
- **v4.4.3** (2026-09-07): Direct Mode Image Dimensions Measurement & Missing Import Fix
- **v4.4.2** (2026-09-06): AI Studio Direct Mode Transient 401 Token Refresh Resilience & Subscription Quota Protection
- **v4.4.1** (2026-09-03): Image Editor Shared Settings Resolution Sync & Model Constraint Guard
- **v4.4.0** (2026-09-03): AI Studio Large Workspace Resilience, IndexedDB Snapshot Storage, Multi-Tier Memory Cache & Thought Image Persistence Fix
- **v4.3.0** (2026-09-03): Google AI Pro & Ultra Subscription Adaptive Pacing, 429 Anti-Resonance Backoff, Gemini 3.8 Flash Upgrade & Live Rate Limit Cooldown Modal
- **v4.2.0** (2026-09-02): Google AI Subscription Tiers (Pro / Ultra 5x / Ultra 20x) Pacing & Persistent 429 Adaptive Backoff
- **v4.1.4** (2026-08-23): Round Count Independence & Focused Model Lock Scope
- **v4.1.3** (2026-08-19): AI Studio Fullscreen Viewer Metadata Loading Fix & Sidecar Hydration Resilience
- **v4.1.2** (2026-08-19): Execution Engine Mode Localization, Dynamic Header Badges & Dark Mode Diagnostics Toggle Ergonomics
- **v4.1.1** (2026-08-19): Workspace Stage Stability, Lite Mode Thought Images & History Chips Ergonomics
- **v4.1.0** (2026-08-19): Workspace Layout Proportions Restructure & Prompt Composer Ergonomics
- **v4.0.2** (2026-08-19): Full Lite Capabilities Integration & Strict Engine-Mode Gating
- **v4.0.1** (2026-08-19): Dual-Engine Image Resolution & Queue Controls Refinement
- **v4.0.0** (2026-08-18): Unified Dual-Engine Architecture (formally integrating and retiring [App-Nano_Banana_Ultra_lite](https://github.com/neophoeus/App-Nano_Banana_Ultra_lite), merging Local API and Google AI Studio Direct browser modes)

### 3.x Series

Version 3.x delivers a summary-first shell with detail-on-demand surfaces, centered around a selection-first workspace model (established in 3.5.x as the practical baseline: history selection defines the next working source, staged-image continuation acts as primary action, and Versions reflects direct badges). Features persistent history, restore/import, provenance review, queued-batch workflows, official conversation continuity, and safer file-backed recovery.

#### 3.x Release History

- **v3.16.1** (2026-08-18): Localized Prompt Thinking Level Options
- **v3.16.0** (2026-08-18): Gemini 3.7 Flash Text LLM & Thinking Level Controls
- **v3.15.2** (2026-07-30): Locked Settings Guard Fix
- **v3.15.1** (2026-07-30): Memory Send Quantity Warning Actions
- **v3.15.0** (2026-07-22): Gemini 3.6 Flash Text Model Upgrade
- **v3.14.1** (2026-07-11): Auto-Ratio Locking & ShowNotification Integration Fix
- **v3.14.0** (2026-07-11): Global Settings Locking System
- **v3.13.0** (2026-07-06): Bright Green Paint Mask & Streamlined Prompt Semantics
- **v3.12.0** (2026-07-06): High Thinking Warning & Streaming Loop Circuit Breaker
- **v3.11.0** (2026-07-02): Nano Banana 2 Lite Model Integration & Documentation Split
- **v3.10.20** (2026-06-10): Stage Selection Sync & Failed Slot Layout Fixes
- **v3.10.19** (2026-06-10): Shifted Paginated Slice Layout
- **v3.10.18** (2026-06-10): Global Backoff and Utility Retries
- **v3.10.17** (2026-06-10): History Layout Pagination Optimization
- **v3.10.16** (2026-06-10): Cooperative Global Backoff Lock
- **v3.10.15** (2026-06-10): Dynamic 429 Retry Delay
- **v3.10.14** (2026-06-10): 429 Retry Optimization
- **v3.10.13** (2026-06-06): Batch Concurrency & Retry Jitter Optimization
- **v3.10.12** (2026-06-05): Gemini API 429 Retry Robustness
- **v3.10.11** (2026-06-03): LazyHistoryImage Src Warning Fix
- **v3.10.10** (2026-06-02): Compact Snapshot Serialization & Empty Image Src Warning Fix
- **v3.10.9** (2026-05-31): E2E Test Output Isolation & Fragile Backup Mechanism Cleanup
- **v3.10.8** (2026-05-29): Legacy Model Normalization, Compatibility Protection & Extended Test Coverage
- **v3.10.7** (2026-05-29): Official Google Gen AI Model Name Migration
- **v3.10.6** (2026-05-26): Comprehensive TypeScript Type Error Fixes Across Frontend & Backend Plugins
- **v3.10.5** (2026-05-26): Fullscreen Image Viewer Overflow Fix
- **v3.10.4** (2026-05-25): Lite Feature Synchronization, App.tsx Code Fixes & Comprehensive Test Resolutions
- **v3.10.3** (2026-05-25): Image to Prompt Forensic Precision & First Switch Language Fix
- **v3.10.2** (2026-05-23): Gemini 3.5 Flash Model Upgrade
- **v3.10.1** (2026-05-21): Workspace Reset Terminal Sync Clear
- **v3.10.0** (2026-05-18): Advanced Safety Controls & Grounding-Adjacent Sync
- **v3.9.0** (2026-05-18): Diagnostics Terminal & Correlated Local API Tracing
- **v3.8.1** (2026-05-18): Live Progress Ordering Drift Hardening
- **v3.8.0** (2026-05-16): Lite Workspace Import Conversion & Local Output Recovery
- **v3.7.2** (2026-05-16): Reference Image Persistence During History Viewing
- **v3.7.1** (2026-05-16): Background Cancel Finalization & Safe Prep Unlock
- **v3.7.0** (2026-05-16): Per-Slot Preview Unlock, Partial Cancel Commit & Disconnect-Aware Batch Cancel
- **v3.6.8** (2026-05-14): Gemini Enum Request Alignment
- **v3.6.7** (2026-05-06): Precise Workflow Labels, Status Copy Refresh & Deterministic Saved Filenames
- **v3.6.6** (2026-04-23): Stage-Image Wording Parity, Locked Reference Ratio Priority & Visible Ratio-Switch Feedback
- **v3.6.5** (2026-04-22): Grouped Queue Tracking, Localized Runtime Labels & Cleaner Detail Navigation
- **v3.6.4** (2026-04-21): Canonical Empty-Workspace Baseline, Queue Truth & Composer Shell Refinement
- **v3.6.3** (2026-04-20): Leaner Shell Ownership, Narrower Settings Surfaces & On-Demand Detail Panels
- **v3.6.2** (2026-04-19): File-Backed Batch Source, Response-File Import Readiness & Queue Continuation Policy
- **v3.6.1** (2026-04-19): Viewer Settings Apply, Stable Viewer Context & Truthful Viewer Metadata
- **v3.6.0** (2026-04-18): Independent Batch Space, Truthful Queue Import State & Clearer Queue Action Naming
- **v3.5.8** (2026-04-18): Localized Failure Surfaces & Adaptive Compact Composer Layout
- **v3.5.7** (2026-04-17): Queued Batch Import Detail, Safer Queue Profile & Clearer Queue Cards
- **v3.5.6** (2026-04-17): Failed Thought Rediscovery, Progress Failure Cues, App-Scoped Vitest Contracts & Style-First Prompt Recipes
- **v3.5.5** (2026-04-16): Response Removal, Live Progress Streaming, Failure Persistence, Fan-Out & Capability Probe
- **v3.5.4** (2026-04-15): Interactive Failure Truthfulness, Structured-Output Removal & Explicit Finish-Reason Handling
- **v3.5.3** (2026-04-14): Unified Generate Bar, Primary Enter Routing & Composer Enter Copy Refresh
- **v3.5.2** (2026-04-13): Editor Entry Performance, Final-Frame Editor Contract, Shared Settings Parity & Viewer Contrast Polish
- **v3.5.1** (2026-04-13): Editor Continuation Realignment, Visible Text Guidance & Smarter Outpaint Continuity
- **v3.5.0** (2026-04-12): Selection-First Lineage, Stateful Continue CTA & Versions Flow Simplification
- **v3.4.5** (2026-04-12): Immediate UI Locale Switching & Startup Translation Preload
- **v3.4.4** (2026-04-11): Modal Floating Top Layer for Advanced Settings & Detail Surfaces
- **v3.4.3** (2026-04-11): Image to Prompt Quick Tool, Prompt Locale Locking & Scaffolded Surprise Me
- **v3.4.2** (2026-04-10): Composer Reflow, Instruction / Conversation UX & Smart Overlay Placement
- **v3.4.1** (2026-04-09): Prompt Helper Removal, History Rail Regroup & Stage Shell Alignment
- **v3.4.0** (2026-04-09): Support Surface Closeout & Sticky Send Intent
- **v3.3.1** (2026-04-08): Nano Banana Ul44tra 3.3.1 - Sidecar Metadata Fidelity, Viewer Expansion & Temperature UX
- **v3.3.0** (2026-04-07): Unified History Workspace, Restore Hardening & Shell Chrome
- **v3.2.7** (2026-04-06): Queued Batch Recovery, Retry & Cleanup
- **v3.2.6** (2026-04-04): Composer Shell Refinement & Restore Hardening
- **v3.2.5** (2026-04-04): Queued Batch Truthfulness & Submit Feedback Closeout
- **v3.2.4** (2026-04-04): Quantity Persistence Closeout & Session D Handoff
- **v3.2.3** (2026-04-04): Composer / Viewer Surface Clarity & Image Tools Polish
- **v3.2.2** (2026-04-04): Chain Cleanup & Restore Contract Alignment
- **v3.2.1** (2026-04-03): Shared Controls, Retouch Locking & Advanced Settings Draft Flow
- **v3.2.0** (2026-04-02): Shared Settings, Image Tools & Queue Workflow Refinement
- **v3.1.8** (2026-04-01): Restore Notice Removal & Startup Preference Persistence
- **v3.1.7** (2026-04-01): Shell Density, Theme Stability & Composer Cleanup
- **v3.1.6** (2026-04-01): Compact Thumbnail & Stage Context Completion
- **v3.1.5** (2026-03-31): Shell Polish & Queue Modal Cleanup
- **v3.1.4** (2026-03-31): Shell, Restore & Queue Batch Hardening
- **v3.1.3** (2026-03-30): Restore & Payload Hardening
- **v3.1.2** (2026-03-30): Versions & Viewer Refinement
- **v3.1.1** (2026-03-30): Workspace Layout Refinement
- **v3.1.0** (2026-03-30): Product-Facing Workspace Baseline
- **v3.0.5** (2026-03-29): Panel Simplification & Restore Regression Update
- **v3.0.4** (2026-03-29): Square Stage Layout Update
- **v3.0.3** (2026-03-29): Workspace Context Main Reading Flow Refactor & Unified Desktop/Mobile Container
- **v3.0.2** (2026-03-26): i18n Chunking & Restore Fixture Hardening
- **v3.0.1** (2026-03-26): Workspace Shell Clarity Update
- **v3.0.0** (2026-03-26): Continuity Workspace Release

### 2.x Series

Version 2.x expands the product into a broader creation workspace, adding support for the full Nano Banana model family, dual reference trays with drag-and-drop ordering, permanent local prompt history with 9999-entry capacity, custom model-selection UI, global theme and 9-language synchronization, real-time system status monitor, official model input limits, and secure local API key handling.

#### 2.x Release History

- **v2.5.1** (2026-03-11): Dev Server Port Optimization
- **v2.5.0** (2026-03-10): System Status Monitor & Secure API Integration
- **v2.4.1** (2026-03-05): Enhanced UI consistency & Global Settings Sync
- **v2.4.0** (2026-03-05): Editor Layout Refinements & Fine-tuned Model Limits
- **v2.3.0** (2026-03-04): UI Refinements & Global i18n
- **v2.2.0** (2026-03-04): 9999 Prompt History Limit & Smart Rendering
- **v2.1.0** (2026-03-02): Sidebar Fix & Local History
- **v2.0** (2026-03-01): Official v2.0 release, expanding into a complete multi-model creative workspace

### 1.x Series

Version 1.x established the creative foundation of Nano Banana Ultra, delivering the original model path built around gemini-3-pro-image-preview, the early image editor workflow, doodle and sketch-assisted creation, early multilingual UI, and the initial product identity for Nano Banana.

#### 1.x Release History

- **v1.3** (2026-02-25): Major project refresh and rebuild wave
- **v1.2.3** (2025-12-25): Hotfix release for v1.2.2
- **v1.2.2** (2025-12-25): Editor mode improvements and bug fixes
- **v1.2.1** (2025-12-20): Enhanced ImageEditor prompt column UI
- **v1.2.0** (2025-12-20): Doodle editing, UI improvements, and translation updates
- **v1.1.3** (2025-12-19): Initial core image generation capability release

## Repository Scope

This repository currently tracks the product runtime, UI, build surface, and stable automated test contracts.

Tracked test source now includes `tests/`, `e2e/`, and `playwright.config.ts`, so clean clones receive the same unit and Playwright verification contracts that the tracked wrapper scripts and dev-environment manifest already advertise.

Local-only development assets such as `.prettierignore` and `prettier.config.mjs` remain intentionally excluded from the formal tracked repo surface.

Generated local artifacts such as `output/`, `test-results/`, `playwright-report/`, and `coverage/` are also intentionally kept out of version control.

For repo-tracked local tooling and test execution, use `run_install_all.bat`, `scripts/setup-dev-environment.bat`, `scripts/run-unit-tests.bat`, `scripts/run-e2e-tests.bat`, or `npm run test -- ...`. Unit-test discovery is now pinned through `vitest.config.ts`, so the supported test entry points stay anchored to `App-Nano_Banana_Ultra` instead of following the editor or terminal working directory.

The app root now also exposes formal Vitest entry points through `npm test`, `npm run test:unit`, and `npm run test:watch`. Those scripts delegate to the tracked `dev-environment/` Vitest install instead of moving test dependencies back into the product manifest.

Playwright sidebar actions and browser-opening flows can invoke `playwright.config.ts` directly instead of the VS Code / Antigravity IDE launch/task layer. That config and its e2e helpers are now anchored to the app directory itself so `output/`, `test-results/`, and dev-server startup stay inside `App-Nano_Banana_Ultra` regardless of the editor's current working directory.
