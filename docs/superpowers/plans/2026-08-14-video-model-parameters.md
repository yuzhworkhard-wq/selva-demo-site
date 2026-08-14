# Video Model Parameters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Synchronize the video generation model catalog, limits, display names, durations, and credits with the latest product document.

**Architecture:** Move pure model metadata into an importable `.mjs` module so React screens and Node regression tests consume one source of truth. Persist stable internal model identifiers and derive every visible model name through `modelLabel`.

**Tech Stack:** React 19, Vite 8, Node.js smoke tests, ES modules

---

### Task 1: Add the failing model catalog regression test

**Files:**
- Create: `apps/video-clone/smoke-video-model-config.mjs`
- Modify: `apps/video-clone/package.json`

- [x] **Step 1: Write the failing test**

Create a Node smoke test that imports `src/videoModelConfig.mjs` and asserts the five internal identifiers, five display names, exact durations, exact reference limits, prompt limits, and credits from the approved design.

```js
import {
  MODEL_FAMILIES,
  VIDEO_MODEL_CONFIG,
  modelLabel,
} from './src/videoModelConfig.mjs';

const expected = {
  'Seedance 2.0': { label: 'Seedance 2.0', durations: ['15s', '10s', '5s'], maxChars: 5000, limits: { image: 4, video: 3, audio: 1 }, credits: 2 },
  'Seedance 2.0 Fast': { label: 'Seedance 2.0 Fast', durations: ['15s', '10s', '5s'], maxChars: 5000, limits: { image: 4, video: 3, audio: 1 }, credits: 2 },
  'Minimax H3': { label: 'Minimax H3', durations: ['15s', '10s'], maxChars: 2000, limits: { image: 5, video: 0, audio: 1 }, credits: 1 },
  'Grok 1.5': { label: 'Grok imagine 1.5', durations: ['15s', '10s'], maxChars: 4000, limits: { image: 7, video: 0, audio: 0 }, credits: 1 },
  'Google omni': { label: 'omni', durations: ['10s'], maxChars: 4000, limits: { image: 4, video: 1, audio: 0 }, credits: 1 },
};
```

- [x] **Step 2: Run the test and verify RED**

Run: `cd apps/video-clone && node smoke-video-model-config.mjs`

Expected: failure because `src/videoModelConfig.mjs` does not exist.

- [x] **Step 3: Add the smoke test to the package test command**

Update `package.json` so `npm test` starts with `node smoke-video-model-config.mjs` and then runs the existing smoke suites.

### Task 2: Extract and update the shared model configuration

**Files:**
- Create: `apps/video-clone/src/videoModelConfig.mjs`
- Modify: `apps/video-clone/src/VideoGenModal.jsx`
- Modify: `apps/video-clone/src/FanoutDialog.jsx`

- [x] **Step 1: Implement the pure configuration module**

Export `VIDEO_MODEL_CONFIG`, `MODEL_FAMILIES`, `DEFAULT_MODEL`, `modelCfg`, `modelLabel`, `familyOf`, `REF_KINDS`, `kindLabel`, and `kindOfFile`. Use the exact approved values and return the original identifier from `modelLabel` when no catalog entry exists.

```js
export const modelLabel = model => VIDEO_MODEL_CONFIG[model]?.label || model || DEFAULT_MODEL;
```

- [x] **Step 2: Replace local configuration in VideoGenModal**

Import the shared exports and remove the duplicated local constants and helpers. Keep component exports used by `FanoutDialog.jsx` focused on React components.

- [x] **Step 3: Update FanoutDialog imports**

Import `modelCfg`, `REF_KINDS`, and `kindLabel` from `videoModelConfig.mjs`; keep React component imports from `VideoGenModal.jsx`.

- [x] **Step 4: Run the focused test and verify GREEN**

Run: `cd apps/video-clone && node smoke-video-model-config.mjs`

Expected: all model catalog checks pass.

### Task 3: Apply display names across the UI

**Files:**
- Modify: `apps/video-clone/src/VideoGenModal.jsx`
- Modify: `apps/video-clone/src/VideoGenTaskDetail.jsx`
- Modify: `apps/video-clone/smoke-video-model-config.mjs`

- [x] **Step 1: Add display integration assertions**

Extend the smoke test to read `VideoGenModal.jsx` and `VideoGenTaskDetail.jsx`, then assert that the selected model value, version row, validation messages, locked-duration title, parameter list, and inline metadata use `modelLabel`.

- [x] **Step 2: Run the focused test and verify RED**

Run: `cd apps/video-clone && node smoke-video-model-config.mjs`

Expected: catalog assertions pass and UI integration assertions fail.

- [x] **Step 3: Render display names in the model picker and validation text**

Use `modelLabel(value)` for the selected value, `modelLabel(v)` for version rows, and a local derived label for model-specific warnings and titles.

- [x] **Step 4: Render display names in task detail**

Import `modelLabel`, derive `displayModel = modelLabel(task.model)`, and use it in the parameter list and inline metadata while preserving `task.model` for data flow.

- [x] **Step 5: Run the focused test and verify GREEN**

Run: `cd apps/video-clone && node smoke-video-model-config.mjs`

Expected: all catalog and UI integration checks pass.

### Task 4: Verify the complete video tool

**Files:**
- Generated by build: `site/clone/**`
- Generated by sync: `source/clone/**`

- [x] **Step 1: Run all smoke tests**

Run: `cd apps/video-clone && npm test`

Expected: all smoke suites pass.

- [x] **Step 2: Build and synchronize mirrors**

Run: `cd apps/video-clone && npm run build`

Expected: Vite build succeeds and `site/clone/` synchronizes to `source/clone/`.

- [x] **Step 3: Check generated asset references and mirror equality**

Run: `rg -n "assets/index-" site/clone/index.html source/clone/index.html`

Expected: both entry files reference the same relative JS and CSS assets.

Run: `diff -qr site/clone source/clone`

Expected: no output.

- [x] **Step 4: Review the scoped diff**

Run: `git diff --check && git status --short`

Expected: no whitespace errors; status contains the parameter-sync source, test, plan, and generated build changes alongside the user's existing work.
