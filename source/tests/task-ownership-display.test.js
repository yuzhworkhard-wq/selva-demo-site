const test = require('node:test');
const assert = require('node:assert/strict');

const { loadApp } = require('./load-selva-app.test-helper');

function normalize(value) {
  return JSON.parse(JSON.stringify(value));
}

test('superadmin task center shows task ownership members', () => {
  const app = loadApp();
  app.setCurrentUserById('u1');

  app.call('renderTaskCenter');
  const html = app.eval("document.getElementById('tasks-content').innerHTML");

  assert.match(html, /归属成员/);
  assert.match(html, /赵强/);
});

test('superadmin folder generation history shows task ownership members', () => {
  const app = loadApp();
  app.setCurrentUserById('u1');

  const html = app.eval("renderFolderHistory(projects.find(project => project.id === 1).folders.find(folder => folder.id === 102))");

  assert.match(html, /归属成员/);
  assert.match(html, /赵强/);
  assert.match(html, /刘洋/);
});

test('every task resolves to exactly one ownership user and no pending fallback appears', () => {
  const app = loadApp();
  app.setCurrentUserById('u1');

  const ownerCounts = normalize(app.eval('MOCK_TASKS.map(task => ({ name: task.name, count: getTaskOwnerUsers(task).length }))'));
  const unresolved = ownerCounts.filter(item => item.count !== 1);

  assert.deepEqual(unresolved, []);

  app.call('renderTaskCenter');
  const html = app.eval("document.getElementById('tasks-content').innerHTML");
  assert.doesNotMatch(html, /待关联/);
});
