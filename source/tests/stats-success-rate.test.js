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

test('canViewSuccessRate: 仅超管与经理可见，组长与成员不可见', () => {
  const app = loadApp();
  const matrix = app.eval(`(function(){
    return {
      superadmin: canViewSuccessRate(users.find(function(u){ return u.role === 'superadmin'; })),
      manager: canViewSuccessRate(users.find(function(u){ return u.role === 'manager'; })),
      leader: canViewSuccessRate(users.find(function(u){ return u.role === 'leader'; })),
      member: canViewSuccessRate(users.find(function(u){ return u.role === 'member'; })),
    };
  })()`);
  assert.equal(matrix.superadmin, true);
  assert.equal(matrix.manager, true);
  assert.equal(matrix.leader, false);
  assert.equal(matrix.member, false);
});

test('computeDailySuccessSeries: 每个点=当天成功率，无生成的天为 null，各天生成之和=总数', () => {
  const app = loadApp();
  const res = app.eval(`(function(){
    var videos = [
      { taskId:'T1', name:'a.mp4', createdAt:'2026-04-01 10:00' },
      { taskId:'T1', name:'b.mp4', createdAt:'2026-04-01 11:00' },
      { taskId:'T2', name:'c.mp4', createdAt:'2026-04-03 09:00' }
    ];
    var series = computeDailySuccessSeries(videos, ['2026-04-01','2026-04-02','2026-04-03']);
    var d1 = computeStatsSuccess(videos.slice(0, 2));
    var d3 = computeStatsSuccess(videos.slice(2));
    return {
      d1generated: series[0].generated, d1rate: series[0].rate, d1expected: d1.rate,
      d2isNull: series[1] === null,
      d3generated: series[2].generated, d3rate: series[2].rate, d3expected: d3.rate,
      sum: series.reduce(function(s, r){ return s + (r ? r.generated : 0); }, 0),
    };
  })()`);
  assert.equal(res.d1generated, 2);
  assert.equal(res.d1rate, res.d1expected);
  assert.equal(res.d2isNull, true);
  assert.equal(res.d3generated, 1);
  assert.equal(res.d3rate, res.d3expected);
  assert.equal(res.sum, 3);
});

test('口径一致：趋势折线各天生成之和 = 概览生成数（超管团队·全部范围）', () => {
  const app = loadApp();
  app.eval("statsTab='team'; statsFilter.scope='all'; statsFilter.industry='all'; statsFilter.client='all'; statsFilter.product='all'; statsFilter.quick='all'; statsFilter.dateFrom=''; statsFilter.dateTo='';");
  const res = app.eval(`(function(){
    var memberIds = new Set(getStatsTeamMemberList().map(function(u){ return u.id; }));
    var tasks = filterStatsTasks(filterTasksForMembers(MOCK_TASKS, memberIds));
    var videos = filterProducedVideos(collectProducedVideos(tasks));
    var days = [];
    videos.forEach(function(v){
      var d = (v.createdAt || '').slice(0, 10);
      if (days.indexOf(d) === -1) days.push(d);
    });
    var series = computeDailySuccessSeries(videos, days);
    var sumGen = 0, sumAdopt = 0;
    series.forEach(function(r){ if (r) { sumGen += r.generated; sumAdopt += r.adopted; } });
    var all = computeStatsSuccess(videos);
    return { totalGen: all.generated, totalAdopt: all.adopted, sumGen: sumGen, sumAdopt: sumAdopt };
  })()`);
  assert.ok(res.totalGen > 0, '演示数据应有已生成视频');
  assert.equal(res.sumGen, res.totalGen);
  assert.equal(res.sumAdopt, res.totalAdopt);
});

test('buildStatsOverview: 超管/经理见成功率卡；showSuccess:false、组长、成员视角无', () => {
  const app = loadApp();
  const mk = "({ tasks: [], videos: [] })";
  assert.match(app.eval(`buildStatsOverview(${mk})`), /素材成功率/);
  assert.doesNotMatch(app.eval(`buildStatsOverview(${mk}, { showSuccess: false })`), /素材成功率/);
  app.setCurrentUserById('u5'); // 经理
  assert.match(app.eval(`buildStatsOverview(${mk})`), /素材成功率/);
  app.setCurrentUserById('u2'); // 组长
  assert.doesNotMatch(app.eval(`buildStatsOverview(${mk})`), /素材成功率/);
  app.setCurrentUserById('u4'); // 成员
  assert.doesNotMatch(app.eval(`buildStatsOverview(${mk})`), /素材成功率/);
});

test('buildStatsTrend: 管理视角有成功率图例+数据点+数值标签+折线；空档天跨接不断线；开关可关；个人视角与组长无', () => {
  const app = loadApp();
  // 两个生成日中间隔着空档天（落在默认 30 天窗口 3/16-4/14 内）：线应跨接成一条，点只落在生成日
  const dataExpr = `({ tasks: [], videos: [
    { taskId:'T1', name:'a.mp4', createdAt:'2026-04-02 10:00' },
    { taskId:'T1', name:'b.mp4', createdAt:'2026-04-12 11:00' }
  ] })`;
  const su = app.eval(`buildStatsTrend(${dataExpr})`);
  assert.match(su, /成功率/);
  assert.doesNotMatch(su, /近7日/, '不再使用滚动窗口口径');
  assert.match(su, /trend-rate-dot/);
  assert.match(su, /trend-rate-line/);
  assert.match(su, /trend-rate-label/, '点上有直接可读的百分比数字');
  assert.equal((su.match(/trend-rate-dot/g) || []).length, 2, '点只标在有生成的两天');
  assert.equal((su.match(/trend-rate-line/g) || []).length, 1, '跨空档连成一条线，不碎段');

  app.eval('statsFilter.trendRate = false;');
  const off = app.eval(`buildStatsTrend(${dataExpr})`);
  assert.match(off, /成功率/); // 图例仍在，供重新打开
  assert.doesNotMatch(off, /trend-rate-dot/);
  app.eval('statsFilter.trendRate = true;');

  const personal = app.eval(`buildStatsTrend(${dataExpr}, { showSuccess: false })`);
  assert.doesNotMatch(personal, /成功率/);
  assert.doesNotMatch(personal, /trend-rate-dot/);

  app.setCurrentUserById('u2'); // 组长
  const ld = app.eval(`buildStatsTrend(${dataExpr})`);
  assert.doesNotMatch(ld, /成功率/);
  assert.doesNotMatch(ld, /trend-rate-dot/);
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

test('buildTeamMemberOverview: 超管见成员成功率；组长视角只见视频数', () => {
  const app = loadApp();
  const videosExpr = `[
    { taskId:'T-20260401-101', name:'a.mp4', createdAt:'2026-04-01 10:00', task:{ id:'T-20260401-101' } },
    { taskId:'T-20260401-101', name:'b.mp4', createdAt:'2026-04-01 11:00', task:{ id:'T-20260401-101' } }
  ]`;
  const su = app.eval(`buildTeamMemberOverview([users.find(function(u){ return u.id === 'u4'; })], ${videosExpr})`);
  assert.match(su, /成员概览/);
  assert.match(su, /🎬/);
  assert.match(su, /素材成功率/);
  assert.doesNotMatch(su, /任务数/);

  app.setCurrentUserById('u2'); // 组长
  const ld = app.eval(`buildTeamMemberOverview([users.find(function(u){ return u.id === 'u4'; })], ${videosExpr})`);
  assert.match(ld, /🎬/);
  assert.doesNotMatch(ld, /素材成功率/);
});

test('renderStatsPage: 个人统计任何角色都不含成功率；旧的每日明细已移除', () => {
  const app = loadApp();
  assert.equal(app.eval('typeof buildStatsSuccessDaily'), 'undefined');
  app.eval("statsTab = 'personal'; renderStatsPage();");
  const su = app.eval("document.getElementById('stats-content').innerHTML");
  assert.match(su, /个人统计/);
  assert.doesNotMatch(su, /素材成功率/);
  assert.doesNotMatch(su, /每日明细/);

  app.setCurrentUserById('u4'); // 成员
  app.eval("statsTab = 'personal'; renderStatsPage();");
  const mb = app.eval("document.getElementById('stats-content').innerHTML");
  assert.doesNotMatch(mb, /素材成功率/);
});

test('renderStatsPage: 团队统计超管含成功率卡与折线；组长团队视图不含', () => {
  const app = loadApp();
  app.eval("statsTab = 'team'; renderStatsPage();");
  const su = app.eval("document.getElementById('stats-content').innerHTML");
  assert.match(su, /素材成功率/);
  assert.match(su, /trend-rate-dot/);

  app.setCurrentUserById('u2'); // 组长
  app.eval("statsTab = 'team'; renderStatsPage();");
  const ld = app.eval("document.getElementById('stats-content').innerHTML");
  assert.doesNotMatch(ld, /素材成功率/);
  assert.doesNotMatch(ld, /trend-rate-dot/);
});
