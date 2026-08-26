/* 批量混剪组合引擎的冒烟测试：锁死排列口径与档位切分 */
import { countMixes, minMaterials, buildMixes, durationBands, permutations, fmtTime, parseClock } from './src/mixEngine.mjs';

let failed = 0;
const eq = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) { failed += 1; console.error(`✗ ${label}\n   got  ${JSON.stringify(got)}\n   want ${JSON.stringify(want)}`); }
  else console.log(`✓ ${label}`);
};

const mats = n => Array.from({ length: n }, (_, i) => ({ id: `m${i + 1}`, duration: 10 + i }));

// 排列口径：顺序敏感，单条内不重复
eq('P(6,3)', permutations(6, 3), 120);
eq('P(5,2)', permutations(5, 2), 20);

// 自由模式：6 条素材
eq('自由 6 条 · 3 段 = 120', countMixes(6, 3, false), 120);
eq('自由 6 条 · 4 段 = 360', countMixes(6, 4, false), 360);
eq('自由 6 条 · 5 段 = 720', countMixes(6, 5, false), 720);

// 首条锁定：片头固定，剩下 n-1 条排 segments-1 个位置
eq('首条 6 条 · 3 段 = 20', countMixes(6, 3, true), 20);
eq('首条 6 条 · 4 段 = 60', countMixes(6, 4, true), 60);
eq('首条 6 条 · 5 段 = 120', countMixes(6, 5, true), 120);

// 素材不足
eq('自由 2 条 · 3 段 = 0', countMixes(2, 3, false), 0);
eq('首条 2 条 · 3 段 = 0', countMixes(2, 3, true), 0);
eq('最少素材 = 段数', [minMaterials(3), minMaterials(4), minMaterials(5)], [3, 4, 5]);

// 列举：条数与去重
const free3 = buildMixes(mats(6), 3, false, 0);
eq('自由列举条数 = 120', free3.length, 120);
eq('自由列举无重复', new Set(free3.map(m => m.id)).size, 120);
eq('123 与 321 都在（顺序敏感）', [free3.some(m => m.id === 'm1>m2>m3'), free3.some(m => m.id === 'm3>m2>m1')], [true, true]);
eq('单条内素材不重复', free3.every(m => new Set(m.seq).size === m.seq.length), true);

// 首条锁定：每条成片第一段都是 m1
const lead3 = buildMixes(mats(6), 3, true, 0);
eq('首条列举条数 = 20', lead3.length, 20);
eq('首条恒为 m1', lead3.every(m => m.seq[0] === 'm1'), true);
eq('首条成片仍是 3 段', lead3.every(m => m.seq.length === 3), true);

const free5 = buildMixes(mats(6), 5, false, 10);
eq('5 段列举截断 10', free5.length, 10);
eq('5 段成片长度', free5.every(m => m.seq.length === 5), true);

const lead5 = buildMixes(mats(6), 5, true, 0);
eq('首条 5 段条数 = 120', lead5.length, 120);
eq('首条 5 段恒为 m1', lead5.every(m => m.seq[0] === 'm1' && m.seq.length === 5), true);

// 限制产出截断
eq('limit 20 截断', buildMixes(mats(6), 4, false, 20).length, 20);
eq('limit 0 = 不限制', buildMixes(mats(6), 4, false, 0).length, 360);

// 时长 = 各段之和
const one = buildMixes([{ id: 'a', duration: 10 }, { id: 'b', duration: 5 }, { id: 'c', duration: 7 }], 3, false, 1)[0];
eq('成片时长 = 各段之和', one.duration, 22);

// 档位：只切出真实存在的档
eq('档位按真实分布', durationBands([{ duration: 12 }, { duration: 13 }, { duration: 26 }]).map(b => b.label), ['10-15s', '25-30s']);
eq('无结果无档位', durationBands([]), []);

// 小工具
eq('fmtTime', [fmtTime(0), fmtTime(75)], ['00:00', '01:15']);
eq('parseClock', parseClock('00:15'), 15);

console.log(failed ? `\n${failed} 个断言失败` : '\n批量混剪引擎全部通过');
process.exit(failed ? 1 : 0);
