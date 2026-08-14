# Magic Prompt State Semantics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align video-generation prompt data and task-detail labels with the approved Magic Prompt state table.

**Architecture:** `buildVariantScripts` remains the single producer of variant prompt data. `VideoGenTaskDetail` derives the tab label from batch size and script equality, while regression tests cover the producer output and the detail-view condition.

**Tech Stack:** React 19, JavaScript, Vite 8, Node smoke tests

---

### Task 1: Lock The State Table With Failing Tests

**Files:**
- Modify: `apps/video-clone/smoke-fanout.mjs`
- Modify: `apps/video-clone/smoke-video-fanout.mjs`

- [ ] **Step 1: Add producer assertions**

Assert that `buildVariantScripts(BRIEF, [], 'off', 3)` returns `dims: []` for every variant. Assert that `buildVariantScripts(BRIEF, [], 'on', 1)` returns one expanded prompt containing `自动补全`, carries non-empty dimensions, and contains no `本条差异` heading.

- [ ] **Step 2: Add detail-label assertion**

Assert that `VideoGenTaskDetail.jsx` derives a single-video label with:

```js
const scriptTab = !multi ? '扩写提示词' : sameScript ? '本批提示词' : `视频 ${active + 1} 的提示词`;
```

- [ ] **Step 3: Verify RED**

Run:

```bash
cd apps/video-clone
node smoke-fanout.mjs
node smoke-video-fanout.mjs
```

Expected: producer test fails because the current `off` branch stores generated dimensions; detail test fails because a single item is labeled `本批提示词`.

### Task 2: Implement The Approved Semantics

**Files:**
- Modify: `apps/video-clone/src/briefParser.js`
- Modify: `apps/video-clone/src/VideoGenTaskDetail.jsx`

- [ ] **Step 1: Clear dimensions in the off branch**

Return the escaped raw prompt with an empty dimension array:

```js
return Array.from({ length: total }, () => ({ promptHtml, dims: [] }));
```

- [ ] **Step 2: Label the single expanded prompt**

Use `扩写提示词` when `clips.length === 1`. Preserve `本批提示词` for multi-video batches sharing one generated script and `视频 N 的提示词` for diversified batches.

- [ ] **Step 3: Verify GREEN**

Run:

```bash
cd apps/video-clone
npm test
```

Expected: all smoke checks pass.

### Task 3: Synchronize Contracts And Build Artifacts

**Files:**
- Modify: `docs/video-gen-ux.md`
- Modify: `.trellis/spec/frontend/state-management.md`
- Generated: `site/clone/**`
- Generated: `source/clone/**`

- [ ] **Step 1: Update the product and frontend contracts**

Record `off => raw prompt + dims=[] + input-only detail` and `on + count=1 => one expanded prompt + 扩写提示词`.

- [ ] **Step 2: Build and sync both mirrors**

Run:

```bash
cd apps/video-clone
npm run build
```

Expected: Vite exits with code 0 and `npm run sync` mirrors `site/clone` into `source/clone`.

- [ ] **Step 3: Verify the browser flow**

Submit one `magic=off` task and one `magic=on, count=1` task. The first detail view exposes only `你的输入`; the second exposes `你的输入` and `扩写提示词`.

- [ ] **Step 4: Run final checks**

```bash
git diff --check
cd apps/video-clone
npm test
npm run build
```

Expected: every command exits with code 0.
