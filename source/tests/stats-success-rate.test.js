const test = require('node:test');
const assert = require('node:assert/strict');

const { loadApp } = require('./load-selva-app.test-helper');

test('computeStatsSuccess: 空集返回 0 且不崩', () => {
  const app = loadApp();
  const r = app.call('computeStatsSuccess', []);
  assert.equal(r.generated, 0);
  assert.equal(r.adopted, 0);
  assert.equal(r.rate, 0);
});

test('isStatVideoAdopted: 同一条视频判定稳定（去重后是否被采用的稳定标记）', () => {
  const app = loadApp();
  const v = { taskId: 'T-X', name: 'a.mp4' };
  const a = app.call('isStatVideoAdopted', v);
  const b = app.call('isStatVideoAdopted', v);
  assert.equal(typeof a, 'boolean');
  assert.equal(a, b);
});

test('computeStatsSuccess: 采用数=被采用视频数，rate=四舍五入百分比且落在 0-100', () => {
  const app = loadApp();
  const videos = Array.from({ length: 20 }, (_, i) => ({ taskId: 'T' + i, name: i + '.mp4' }));
  const r = app.call('computeStatsSuccess', videos);
  const adopted = videos.filter(v => app.call('isStatVideoAdopted', v)).length;
  assert.equal(r.generated, 20);
  assert.equal(r.adopted, adopted);
  assert.equal(r.rate, Math.round((adopted / 20) * 100));
  assert.ok(r.rate >= 0 && r.rate <= 100);
});

test('successRateColor: 无生成灰色，阈值分档（≥70 绿 / ≥45 黄 / 其余红）', () => {
  const app = loadApp();
  assert.equal(app.call('successRateColor', 0, 0), '#666');
  assert.equal(app.call('successRateColor', 80, 10), '#4ade80');
  assert.equal(app.call('successRateColor', 56, 10), '#fbbf24');
  assert.equal(app.call('successRateColor', 20, 10), '#f87171');
});

test('口径一致：每日明细各天生成之和 = 概览生成数（个人统计·超管·全部范围）', () => {
  const app = loadApp();
  app.eval("statsTab='personal'; statsFilter.scope='all'; statsFilter.industry='all'; statsFilter.client='all'; statsFilter.product='all'; statsFilter.quick='all'; statsFilter.dateFrom=''; statsFilter.dateTo='';");
  const build = `(function(){
    var ids = getStatsPersonalTaskIds();
    var tasks = filterStatsTasks(MOCK_TASKS.filter(function(t){ return ids.has(t.id); }));
    return filterProducedVideos(collectProducedVideos(tasks));
  })()`;
  const overview = app.eval(`computeStatsSuccess(${build})`);
  const daySum = app.eval(`(function(){
    var vids = ${build};
    var m = new Map();
    vids.forEach(function(v){ var d = (v.createdAt||'').slice(0,10); m.set(d, (m.get(d)||0)+1); });
    var s = 0; m.forEach(function(n){ s += n; }); return s;
  })()`);
  assert.ok(overview.generated > 0, '演示数据应有已生成视频');
  assert.equal(daySum, overview.generated);
});

test('computeMemberCounts: 按成员归集 生成/采用/成功率，不再输出任务数', () => {
  const app = loadApp();
  const res = app.eval(`(function(){
    var u4 = users.find(function(u){ return u.id === 'u4'; });
    var videos = [
      { taskId:'T-20260401-101', name:'a.mp4', createdAt:'2026-04-01 10:00', task:{ id:'T-20260401-101' } },
      { taskId:'T-20260401-101', name:'b.mp4', createdAt:'2026-04-01 11:00', task:{ id:'T-20260401-101' } }
    ];
    var rows = computeMemberCounts([u4], videos);
    return { len: rows.length, generated: rows[0].generated, adopted: rows[0].adopted, rate: rows[0].rate, hasTaskCount: ('taskCount' in rows[0]) };
  })()`);
  assert.equal(res.len, 1);
  assert.equal(res.generated, 2);
  assert.ok(res.adopted <= res.generated);
  assert.ok(res.rate >= 0 && res.rate <= 100);
  assert.equal(res.hasTaskCount, false);
});

test('渲染冒烟：每日明细带成功率与空状态；成员概览展示视频数+成功率且无任务数', () => {
  const app = loadApp();
  const videos = [
    { taskId: 'T-20260401-101', name: 'a.mp4', createdAt: '2026-04-01 10:00', task: { id: 'T-20260401-101' } },
    { taskId: 'T-20260401-101', name: 'b.mp4', createdAt: '2026-04-01 11:00', task: { id: 'T-20260401-101' } },
  ];
  const daily = app.call('buildStatsSuccessDaily', { videos });
  assert.match(daily, /素材成功率 · 每日明细/);
  assert.match(daily, /4\/1/);
  const empty = app.call('buildStatsSuccessDaily', { videos: [] });
  assert.match(empty, /该范围内暂无生成记录/);

  const overview = app.eval(`(function(){
    var u4 = users.find(function(u){ return u.id === 'u4'; });
    var videos = [
      { taskId:'T-20260401-101', name:'a.mp4', createdAt:'2026-04-01 10:00', task:{ id:'T-20260401-101' } },
      { taskId:'T-20260401-101', name:'b.mp4', createdAt:'2026-04-01 11:00', task:{ id:'T-20260401-101' } }
    ];
    return buildTeamMemberOverview([u4], videos);
  })()`);
  assert.match(overview, /成员概览/);
  assert.match(overview, /🎬/);
  assert.doesNotMatch(overview, /任务数/);
});
