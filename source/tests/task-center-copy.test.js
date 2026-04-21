const test = require('node:test');
const assert = require('node:assert/strict');

const { loadApp } = require('./load-selva-app.test-helper');

test('workflow output config refers to task center instead of library', () => {
  const app = loadApp();

  const html = app.call('renderWfNodeConfig', {
    id: 'test-output-node',
    type: 'output',
    label: '广告视频'
  });

  assert.match(html, /保存到任务中心/);
  assert.match(html, /自动归档到任务中心/);
  assert.doesNotMatch(html, /素材库/);
});

test('stats overview video source refers to task center instead of library', () => {
  const app = loadApp();

  const html = app.call('buildStatsOverview', {
    tasks: [],
    videos: [{ id: 'video-1' }]
  });

  assert.match(html, /来源：任务中心中的视频文件/);
  assert.doesNotMatch(html, /素材库/);
});
