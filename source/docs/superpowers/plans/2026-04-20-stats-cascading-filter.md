# Stats Cascading Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add data-center-style cascading `industry -> client -> product` filters to the production stats page so users can narrow large product lists quickly.

**Architecture:** Extend the shared stats filter state in `render/pages.js` with `industry` and `client`, derive visible cascading options from role-scoped projects, and apply one shared project-dimension filter to stats tasks and produced videos. Keep the new UI inside the existing stats filter bar so personal and team stats inherit the same behavior.

**Tech Stack:** Vanilla JavaScript, HTML template strings in `render/pages.js`, Node built-in test runner in `tests/`.

---

### Task 1: Add regression tests for stats cascading filters

**Files:**
- Create: `tests/stats-cascading-filter.test.js`
- Modify: `/Users/a./Documents/selva/render/pages.js`
- Test: `tests/stats-cascading-filter.test.js`

- [ ] **Step 1: Write the failing test**

```js
const test = require('node:test');
const assert = require('node:assert/strict');

const { loadApp } = require('./load-selva-app.test-helper');

function normalize(value) {
  return JSON.parse(JSON.stringify(value));
}

test('stats cascading options shrink from industry to client to product', () => {
  const app = loadApp();
  app.setCurrentUserById('u1');
  app.eval("statsFilter = { scope:'all', industry:'ent', client:'all', product:'all', quick:'all', dateFrom:'', dateTo:'', trendTask:true, trendVideo:true, distTool:true, distWorkflow:true, member:'all', group:'all', business:'all' };");

  const options = normalize(app.call('getStatsCascadingOptions'));

  assert.deepEqual(options.industryOpts.map(option => option.v), ['all', 'ent', 'other', 'earn']);
  assert.deepEqual(options.clientOpts.map(option => option.v), ['all', '增长营销', '春季营销']);
  assert.deepEqual(options.productOpts.map(option => option.v), ['all', '品牌推广', '消除游戏']);
});

test('stats filters reset invalid child selections when parent changes', () => {
  const app = loadApp();
  app.setCurrentUserById('u1');
  app.eval("statsFilter = { scope:'all', industry:'ent', client:'春季营销', product:'品牌推广', quick:'all', dateFrom:'', dateTo:'', trendTask:true, trendVideo:true, distTool:true, distWorkflow:true, member:'all', group:'all', business:'all' };");

  app.call('setStatsFilter', 'industry', 'earn');

  const nextFilter = normalize(app.eval('statsFilter'));

  assert.equal(nextFilter.industry, 'earn');
  assert.equal(nextFilter.client, 'all');
  assert.equal(nextFilter.product, 'all');
});

test('stats task and video filters respect industry, client, and product together', () => {
  const app = loadApp();
  app.setCurrentUserById('u1');
  app.eval("statsFilter = { scope:'all', industry:'earn', client:'赚钱App', product:'赚钱App', quick:'all', dateFrom:'', dateTo:'', trendTask:true, trendVideo:true, distTool:true, distWorkflow:true, member:'all', group:'all', business:'all' };");

  const filteredTasks = normalize(app.call('filterStatsTasks', app.eval('MOCK_TASKS')));
  const filteredVideos = normalize(app.call('filterProducedVideos', app.call('collectProducedVideos', filteredTasks)));

  assert.equal(filteredTasks.length > 0, true);
  assert.equal(filteredVideos.length > 0, true);
  assert.equal(filteredTasks.every(task => task.product === '赚钱App'), true);
  assert.equal(filteredVideos.every(video => video.product === '赚钱App' && video.client === '赚钱App'), true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/stats-cascading-filter.test.js`
Expected: FAIL because `getStatsCascadingOptions` does not exist yet and `setStatsFilter` does not repair invalid cascading selections.

- [ ] **Step 3: Write minimal implementation**

```js
function getStatsScopedProjects() {
  return projects.filter(project => canSeeProject(project));
}

function getStatsCascadingOptions() {
  const scopedProjects = getStatsScopedProjects();
  const industryOpts = PROJECT_INDUSTRY_OPTIONS.filter(option =>
    scopedProjects.some(project => dcDeriveIndustry(project) === option.v)
  );
  const clientPool = scopedProjects.filter(project =>
    statsFilter.industry === 'all' || dcDeriveIndustry(project) === statsFilter.industry
  );
  const productPool = clientPool.filter(project =>
    statsFilter.client === 'all' || project.client === statsFilter.client
  );
  return {
    industryOpts: [{ v: 'all', l: '全部' }, ...industryOpts],
    clientOpts: [{ v: 'all', l: '全部' }, ...dedupeClientOptions(clientPool)],
    productOpts: [{ v: 'all', l: '全部' }, ...dedupeProductOptions(productPool)],
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/stats-cascading-filter.test.js`
Expected: PASS with all stats cascading filter tests green.

- [ ] **Step 5: Commit**

```bash
git add tests/stats-cascading-filter.test.js render/pages.js
git commit -m "test: cover stats cascading filters"
```

### Task 2: Update stats filter bar and shared filtering logic

**Files:**
- Modify: `/Users/a./Documents/selva/render/pages.js`
- Test: `tests/stats-cascading-filter.test.js`

- [ ] **Step 1: Write the failing test**

```js
test('stats filter bar shows industry client and product selects together', () => {
  const app = loadApp();
  app.setCurrentUserById('u1');

  const html = app.call('buildStatsFilterBar');

  assert.match(html, /行业/);
  assert.match(html, /客户/);
  assert.match(html, /产品/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/stats-cascading-filter.test.js`
Expected: FAIL because the filter bar still only renders the product select.

- [ ] **Step 3: Write minimal implementation**

```js
function buildStatsFilterBar() {
  const cascading = getStatsCascadingOptions();
  return `
    <div>
      <div style="display:flex; align-items:center; gap:6px;"><span>行业</span>${selectHtml('industry', cascading.industryOpts, statsFilter.industry)}</div>
      <div style="display:flex; align-items:center; gap:6px;"><span>客户</span>${selectHtml('client', cascading.clientOpts, statsFilter.client)}</div>
      <div style="display:flex; align-items:center; gap:6px;"><span>产品</span>${selectHtml('product', cascading.productOpts, statsFilter.product)}</div>
    </div>`;
}

function filterStatsTasks(tasks) {
  return applyStatsProjectFilters(tasks, task => resolveStatsTaskProject(task));
}

function filterProducedVideos(videos) {
  return applyStatsProjectFilters(videos, video => video);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/stats-cascading-filter.test.js`
Expected: PASS and the rendered filter bar includes all three cascading selects.

- [ ] **Step 5: Commit**

```bash
git add render/pages.js tests/stats-cascading-filter.test.js
git commit -m "feat: add cascading filters to stats"
```

### Task 3: Run focused and regression verification

**Files:**
- Modify: `/Users/a./Documents/selva/tests/stats-cascading-filter.test.js`
- Test: `tests/stats-cascading-filter.test.js`
- Test: `tests/team-hierarchy.test.js`

- [ ] **Step 1: Re-run the focused stats tests**

Run: `node --test tests/stats-cascading-filter.test.js`
Expected: PASS with 0 failures.

- [ ] **Step 2: Re-run hierarchy regression tests that touch stats/data scope**

Run: `node --test tests/team-hierarchy.test.js`
Expected: PASS with 0 failures.

- [ ] **Step 3: Review the requirements against the spec**

Checklist:

- [ ] Stats page uses `行业 -> 客户 -> 产品`
- [ ] Every select keeps an `全部` option
- [ ] Child options shrink when parent filters change
- [ ] Invalid child selections reset to `all`
- [ ] Personal and team stats share the same top filter bar
- [ ] Task and video metrics use the same cascading filter rules

- [ ] **Step 4: Commit**

```bash
git add render/pages.js tests/stats-cascading-filter.test.js
git commit -m "test: verify stats cascading filter regressions"
```
