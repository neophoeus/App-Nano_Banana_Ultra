# Nano Banana Ultra

[English](README.md) | [繁體中文](README.zh-TW.md)

Nano Banana Ultra is a Gemini-powered image workspace for creation, guided editing, and multi-pass iteration. It is built for people who need to move an idea forward across multiple turns, compare alternatives, recover earlier work, and keep source context intact while they do it.

Instead of treating image generation as a disposable one-shot action, Nano Banana Ultra keeps prompting, references, history, editing, reuse, and restore inside one connected workspace flow.

This repository is the local API edition of Nano Banana Ultra. If you already subscribe to Google AI Pro or Google AI Ultra, you can also use [App-Nano_Banana_Ultra_lite](https://github.com/neophoeus/App-Nano_Banana_Ultra_lite) by uploading it into Google AI Studio and running it there. That AI Studio path gives a similar day-to-day experience while usually being more quota-efficient for Google AI Pro and Google AI Ultra subscribers.

## At a Glance

- selection-first Gemini image workspace instead of a single prompt box
- one connected flow for create, edit, compare, branch, recover, and reuse
- source-aware history and Versions model so the current working source stays explicit
- model-aware controls that adapt to each Gemini image path instead of forcing one shared lowest-common-denominator UI
- built for longer-running visual work rather than only one-pass generation

## Core Capabilities

### Create

- text-to-image, image-to-image, and style-guided generation
- character and object references inside the same workspace flow
- prompt tools such as Smart Rewrite, Surprise Me, and Image to Prompt
- single-result generation or batch exploration when you want to compare directions

### Iterate

- selection-first continuation where the latest turn continues and older turns branch automatically
- built-in SketchPad workflow for rough ideation before generation
- editor workflow for inpainting, outpainting, reframing, and follow-up refinement
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

Nano Banana Ultra currently supports four Gemini image-model paths. The UI exposes model-aware controls so each path can lean into its own strengths instead of being flattened into one generic settings surface.

### Nano Banana 2

- model id: `gemini-3.1-flash-image`
- default mainline model in the current product flow
- broadest capability surface across ratio, size, grounding, and thinking controls
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

## Version Overview

### Latest Release: 3.14.1

Latest release: 3.14.1. Refined the settings locking system to prevent reference image uploads from triggering auto-ratio toast notifications, log messages, or aspect-ratio updates when locked, and resolved hook type integration warnings. See [CHANGELOG.md](CHANGELOG.md) for details.

### 3.5.x

Version 3.5.x is where Nano Banana Ultra's 3.x workspace model becomes clearly selection-first and easier to read. History selection now directly defines the next working source, staged-image continuation uses one stateful primary action, and Versions reflects the same state through direct badges instead of a separate open-versus-continue split.

In short, 3.5.x is the current practical baseline for the product.

### 3.x

Version 3.x includes everything from 2.x and represents the current Nano Banana Ultra product state: a selection-first Gemini image workspace with a summary-first shell, detail-on-demand surfaces, persistent history and restore/import flows, provenance review, queued-batch workflows, official-conversation continuity, and safer file-backed recovery behavior.

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
