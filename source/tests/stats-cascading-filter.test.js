const test = require('node:test');
const assert = require('node:assert/strict');

const { loadApp } = require('./load-selva-app.test-helper');

function normalize(value) {
  return JSON.parse(JSON.stringify(value));
}

function setBaseStatsFilter(app, overrides = {}) {
  const filter = {
    scope: 'all',
    industry: 'all',
    client: 'all',
    product: 'all',
    quick: 'all',
    dateFrom: '',
    dateTo: '',
    trendTask: true,
    trendVideo: true,
    distTool: true,
    distWorkflow: true,
    member: 'all',
    group: 'all',
    business: 'all',
    ...overrides,
  };
  app.eval(`statsFilter = ${JSON.stringify(filter)};`);
}

test('stats cascading options shrink from industry to client to product', () => {
  const app = loadApp();
  app.setCurrentUserById('u1');
  app.eval("statsTab = 'team';");
  setBaseStatsFilter(app, { industry: 'ent' });

  const options = normalize(app.call('getStatsCascadingOptions'));

  assert.deepEqual(options.industryOpts.map(option => option.v), ['all', 'ent', 'earn', 'other']);
  assert.deepEqual(options.clientOpts.map(option => option.v), ['all', '春季营销', '增长营销']);
  assert.deepEqual(options.productOpts.map(option => option.v), ['all', '品牌推广', '消除游戏']);
});

test('stats filters reset invalid child selections when parent changes', () => {
  const app = loadApp();
  app.setCurrentUserById('u1');
  app.eval("statsTab = 'team';");
  setBaseStatsFilter(app, {
    industry: 'ent',
    client: '春季营销',
    product: '品牌推广',
  });

  app.call('setStatsFilter', 'industry', 'earn');

  const nextFilter = normalize(app.eval('statsFilter'));

  assert.equal(nextFilter.industry, 'earn');
  assert.equal(nextFilter.client, 'all');
  assert.equal(nextFilter.product, 'all');
});

test('stats filter bar shows industry client and product selects together', () => {
  const app = loadApp();
  app.setCurrentUserById('u1');
  app.eval("statsTab = 'team';");
  setBaseStatsFilter(app);

  const html = app.call('buildStatsFilterBar');

  assert.match(html, /行业/);
  assert.match(html, /客户/);
  assert.match(html, /产品/);
});

test('stats task and video filters respect industry client and product together', () => {
  const app = loadApp();
  app.setCurrentUserById('u1');
  app.eval("statsTab = 'team';");
  setBaseStatsFilter(app, {
    industry: 'earn',
    client: '赚钱App',
    product: '赚钱App',
  });

  const filteredTasks = normalize(app.call('filterStatsTasks', app.eval('MOCK_TASKS')));
  const filteredVideos = normalize(app.call('filterProducedVideos', app.call('collectProducedVideos', filteredTasks)));
  const taskMatches = filteredTasks.map(task => normalize(app.call('getStatsTaskProjectEntries', task)));

  assert.equal(filteredTasks.length > 0, true);
  assert.equal(filteredVideos.length > 0, true);
  assert.equal(taskMatches.every(entries => entries.some(entry => entry.industry === 'earn' && entry.client === '赚钱App' && entry.product === '赚钱App')), true);
  assert.equal(filteredVideos.every(video => video.product === '赚钱App' && video.client === '赚钱App'), true);
});
