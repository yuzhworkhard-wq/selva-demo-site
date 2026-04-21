# Team Hierarchy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat group model with a hierarchical business model that controls member editing rights and drives data-center filtering.

**Architecture:** Keep the current single-file prototype structure, but introduce centralized organization helpers that derive display labels, editable scopes, and data-center visibility from user assignment. Existing project/group compatibility remains intact where possible so the rest of the prototype keeps working.

**Tech Stack:** Vanilla JavaScript, HTML, CSS, Node built-in test runner (`node --test`)

---

### Task 1: Add a Lightweight Test Harness

**Files:**
- Create: `tests/load-selva-app.test-helper.js`
- Create: `tests/team-hierarchy.test.js`

- [ ] **Step 1: Write the failing test harness**

```js
// tests/load-selva-app.test-helper.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function createStubElement() {
  return {
    style: {},
    className: '',
    innerHTML: '',
    textContent: '',
    value: '',
    dataset: {},
    children: [],
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    appendChild(child) { this.children.push(child); return child; },
    querySelector() { return createStubElement(); },
    querySelectorAll() { return []; },
    addEventListener() {},
    removeEventListener() {},
    focus() {},
    blur() {},
    setAttribute() {},
    getAttribute() { return ''; },
  };
}

function loadApp() {
  const root = path.resolve(__dirname, '..');
  const elements = new Map();
  const document = {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, createStubElement());
      return elements.get(id);
    },
    querySelector() { return createStubElement(); },
    querySelectorAll() { return []; },
    createElement() { return createStubElement(); },
    addEventListener() {},
    removeEventListener() {},
  };

  const context = vm.createContext({
    console,
    document,
    window: {},
    navigator: { clipboard: { writeText() {} } },
    confirm: () => true,
    requestAnimationFrame: cb => cb(),
    setTimeout,
    clearTimeout,
    Set,
    Map,
    Date,
    Math,
  });

  [
    'data.js',
    'state.js',
    'render/helpers.js',
    'render/pages.js',
    'actions/interactions.js',
    'actions/navigation.js',
    'app.js',
  ].forEach(file => {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    vm.runInContext(source, context, { filename: file });
  });

  return context;
}

module.exports = { loadApp };
```

- [ ] **Step 2: Write the first failing behavior tests**

```js
// tests/team-hierarchy.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./load-selva-app.test-helper');

test('superadmin sees four first-level business options', () => {
  const app = loadApp();
  app.currentUser = app.users.find(user => user.role === 'superadmin');
  const options = app.getScopedBusinessFilterOptions().map(item => item.v);
  assert.deepEqual(options, ['all', 'overseas-ent', 'local-ent', 'overseas-tool', 'local-tool']);
});
```

- [ ] **Step 3: Run the test to verify RED**

Run: `node --test tests/team-hierarchy.test.js`
Expected: FAIL because `getScopedBusinessFilterOptions` does not exist yet.

- [ ] **Step 4: Commit the red test checkpoint mentally and move to implementation**

Run no command. Keep the failing test intact.

### Task 2: Introduce Organization Helpers and Seed Data

**Files:**
- Modify: `data.js`
- Modify: `render/pages.js`

- [ ] **Step 1: Add explicit organization seed data**

```js
const BUSINESS_OPTIONS = [
  { id: 'overseas-ent', label: '出海互娱', color: '#3b82f6' },
  { id: 'local-ent', label: '本土互娱', color: '#f59e0b' },
  { id: 'overseas-tool', label: '出海工具', color: '#10b981' },
  { id: 'local-tool', label: '本土工具', color: '#8b5cf6' },
];
```

- [ ] **Step 2: Add organization metadata to `users`**

```js
{ id: 'u5', role: 'manager', businessId: 'overseas-ent', managerScopeId: 'mgr-u5', subgroupKey: '' }
{ id: 'u2', role: 'leader', businessId: 'overseas-ent', managerScopeId: 'mgr-u5', subgroupKey: 'a' }
```

- [ ] **Step 3: Add helper APIs in `render/pages.js` for labels and scope**

```js
function getScopedBusinessFilterOptions() {}
function getUserOrgPath(user) {}
function canEditMember(actor, target) {}
function getManagedMemberIds(user) {}
function getVisibleDataCenterUserIds(user) {}
```

- [ ] **Step 4: Run tests to verify GREEN for the first helper**

Run: `node --test tests/team-hierarchy.test.js`
Expected: PASS for the first test, remaining missing behaviors not added yet.

### Task 3: Extend Tests and Implement Permission Rules

**Files:**
- Modify: `tests/team-hierarchy.test.js`
- Modify: `render/pages.js`
- Modify: `actions/interactions.js`

- [ ] **Step 1: Add failing tests for member edit permissions**

```js
test('manager can edit members inside own business scope but cannot change roles', () => {
  const app = loadApp();
  const manager = app.users.find(user => user.id === 'u5');
  const sameScopeMember = app.users.find(user => user.id === 'u4');
  const otherScopeMember = app.users.find(user => user.id === 'u7');

  assert.equal(app.canEditMember(manager, sameScopeMember), true);
  assert.equal(app.canEditMember(manager, otherScopeMember), false);
  assert.equal(app.canChangeMemberRole(manager, sameScopeMember), false);
});
```

- [ ] **Step 2: Run tests to verify RED**

Run: `node --test tests/team-hierarchy.test.js`
Expected: FAIL because permission helpers are incomplete.

- [ ] **Step 3: Implement permission helpers and edit guards**

```js
function canChangeMemberRole(actor, target) {
  return actor.role === 'superadmin' && actor.id !== target.id;
}
```

- [ ] **Step 4: Update invite/edit actions to respect new guards**

```js
if (!canEditMember(currentUser, user)) {
  toast('你没有权限编辑该成员');
  return;
}
```

- [ ] **Step 5: Run tests to verify GREEN**

Run: `node --test tests/team-hierarchy.test.js`
Expected: PASS for permission tests.

### Task 4: Rework Team Page and Group Page Rendering

**Files:**
- Modify: `render/pages.js`
- Modify: `actions/interactions.js`

- [ ] **Step 1: Replace the member table group label with organization path**

```js
<td>${renderOrgTag(u)}</td>
```

- [ ] **Step 2: Replace role dropdown visibility logic**

```js
${canChangeMemberRole(currentUser, u) ? renderRoleSelect(u) : renderReadonlyRole(u)}
```

- [ ] **Step 3: Rebuild the group tab into an organization view**

```js
function renderGroups(containerId) {
  const cards = getVisibleOrganizationCards(currentUser);
  // render business -> manager -> a类/b类 member counts
}
```

- [ ] **Step 4: Add a member assignment modal for superadmin and manager**

```js
showModal('member-assignment', userId)
```

- [ ] **Step 5: Run tests after UI logic changes**

Run: `node --test tests/team-hierarchy.test.js`
Expected: PASS with no regressions.

### Task 5: Wire Data Center and Team Stats to Organization Scope

**Files:**
- Modify: `render/pages.js`
- Modify: `state.js`

- [ ] **Step 1: Add failing tests for scoped business filters and visible uploader set**

```js
test('manager only sees a/b filters and own uploader scope in data center', () => {
  const app = loadApp();
  app.currentUser = app.users.find(user => user.id === 'u5');
  const options = app.getScopedBusinessFilterOptions().map(item => item.v);
  const visibleIds = [...app.getVisibleDataCenterUserIds(app.currentUser)].sort();

  assert.deepEqual(options, ['all', 'a', 'b']);
  assert.deepEqual(visibleIds, ['u2', 'u4', 'u6', 'u8']);
});
```

- [ ] **Step 2: Run tests to verify RED**

Run: `node --test tests/team-hierarchy.test.js`
Expected: FAIL because data-center scoping still uses legacy logic.

- [ ] **Step 3: Update data-center option generation and filtering**

```js
function getDcFilteredVideos() {
  const visibleIds = getVisibleDataCenterUserIds(currentUser);
  let list = getAllDcVideos().filter(video => visibleIds.has(video.uploader));
}
```

- [ ] **Step 4: Update stats helpers to reuse the same scope helpers**

```js
function getTeamScopedData(memberList) {
  const allowedIds = getVisibleDataCenterUserIds(currentUser);
}
```

- [ ] **Step 5: Run the full test suite to verify GREEN**

Run: `node --test tests/team-hierarchy.test.js`
Expected: PASS, 0 failures.

### Task 6: Final Verification

**Files:**
- Modify: `data.js`
- Modify: `render/pages.js`
- Modify: `actions/interactions.js`
- Create: `tests/load-selva-app.test-helper.js`
- Create: `tests/team-hierarchy.test.js`

- [ ] **Step 1: Run the full automated verification**

Run: `node --test tests/team-hierarchy.test.js`
Expected: PASS with all hierarchy tests green.

- [ ] **Step 2: Smoke-check the app entry loads without syntax errors**

Run: `node -e "const fs=require('fs'); ['data.js','state.js','render/helpers.js','render/pages.js','actions/interactions.js','actions/navigation.js','app.js'].forEach(f=>new Function(fs.readFileSync(f,'utf8'))); console.log('syntax ok')"`
Expected: `syntax ok`

- [ ] **Step 3: Review changed behavior against the approved spec**

Checklist:
- superadmin sees four first-level businesses
- manager sees only `a类` / `b类`
- all users can view all members
- only superadmin can change roles
- managers can only edit their own scope
- leaders cannot edit members

- [ ] **Step 4: Stop only after both commands succeed**

No additional command.
