/* 定向裂变的冒烟测试：node smoke-fanout.mjs
   验的是「控制变量」这条核心承诺真的成立：只有点名的维度在变，其余逐条对得上。

   briefParser.js 是纯 js 没有 jsx，本可以直接 import——但本包没声明 type:module，
   node 会把 .js 当 CommonJS 拒掉命名导出。所以运行时复制成一份 .mjs 再动态 import，
   不在仓里留副本：副本迟早跟源码分叉，那时测试就是在验一个不存在的实现。 */
import { copyFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const shim = join(tmpdir(), `briefParser.${process.pid}.mjs`);
copyFileSync(join(here, 'src/briefParser.js'), shim);
process.on('exit', () => { try { unlinkSync(shim); } catch {} });

const {
  parseBrief, pickVariant, buildVariantScripts, buildFanoutScripts,
  steerToDims, fanoutPresetKeys, FANOUT_DIMS, readVideoDims,
} = await import(shim);

let fail = 0;
const ok = (cond, msg) => { console.log(`${cond ? '  ok' : 'FAIL'}  ${msg}`); if (!cond) fail++; };

const BRIEF = `为 SofaDrama（看剧赚钱App）制作巴西投放视频，葡语口播，时长 15 秒内。
核心卖点：
- 看一集可获得2雷亚尔
- 随时提现
红线：不用 logo 开场
全程配字幕`;

console.log('\n── 1. 指令识别 ──');
ok(steerToDims('只换个男女角色长相').map(d => d.key).join() === 'character', '「只换个男女角色长相」→ character');
ok(steerToDims('换个场景试试').map(d => d.key).join() === 'setting', '「换个场景」→ setting');
ok(steerToDims('开场首句换一下').map(d => d.key).includes('firstLine'), '「开场首句」→ firstLine（细粒度先于 hook）');
ok(steerToDims('人物和服装都换').map(d => d.key).sort().join() === 'character,outfit', '一句话可认出多维');
ok(steerToDims('随便变变').length === 0, '认不出来就返回空，不瞎猜');
ok(steerToDims('').length === 0, '空指令返回空');
ok(fanoutPresetKeys('basic').join() === 'character,setting,lighting', '自动初级映射人物 / 场景 / 光线');
ok(fanoutPresetKeys('medium').includes('script'), '自动中级包含叙事表达变化');
ok(fanoutPresetKeys('advanced').includes('cta'), '自动高级包含内容策略与收尾变化');

console.log('\n── 2. 首次生成的 variant 带上了维度取值 ──');
const first = buildVariantScripts(BRIEF, [], 'on', 4);
ok(first.length === 4, '生成 4 条');
ok(first.every(v => Array.isArray(v.dims) && v.dims.length > 0), '每条都带 dims（裂变基准要用）');
ok(new Set(first.map(v => v.dims.find(d => d.key === 'character').value)).size === 4,
  'magic=on 时 4 条人物各不相同');

const off = buildVariantScripts(BRIEF, [], 'off', 3);
ok(new Set(off.map(v => v.promptHtml)).size === 1, 'magic=off 时 3 条脚本逐字相同');
ok(off.every(v => Array.isArray(v.dims) && v.dims.length === 0),
  'magic=off 时不生成维度取值');
ok(off.every(v => v.promptHtml === `<p>${BRIEF}</p>`),
  'magic=off 时模型提示词直接使用用户原始输入');
ok(off.every(v => !v.promptHtml.includes('自动补全') && !v.promptHtml.includes('【分镜】')),
  'magic=off 时不生成扩写段落');
const offEscaped = buildVariantScripts('保留 <产品名> & 原文', [], 'off', 1);
ok(offEscaped[0].promptHtml === '<p>保留 &lt;产品名&gt; &amp; 原文</p>',
  'magic=off 的原始输入经过 HTML 转义后再保存');

const singleOn = buildVariantScripts(BRIEF, [], 'on', 1);
ok(singleOn.length === 1, 'magic=on 且只生成 1 条时只产出一份提示词');
ok(singleOn[0].dims.length > 0, 'magic=on 且只生成 1 条时保留扩写维度');
ok(singleOn[0].promptHtml.includes('自动补全'), 'magic=on 且只生成 1 条时执行扩写');
ok(!singleOn[0].promptHtml.includes('本条差异'), '单条扩写不使用批次差异标题');

console.log('\n── 3. 定向裂变＝控制变量 ──');
const parsed = parseBrief(BRIEF);
const base = first[2].dims;                      // 拿第 3 条当基准
const varyKeys = ['character'];
const fan = buildFanoutScripts({
  sourceText: BRIEF, baseDims: base, varyKeys, steer: '只换个男女角色长相', count: 4,
});
ok(fan.length === 4, '裂变出 4 条');

const chars = fan.map(v => v.dims.find(d => d.key === 'character').value);
ok(new Set(chars).size === 4, '4 条的人物各不相同');

// 核心承诺：除了 character，每一维在 4 条之间都必须完全一致，且等于基准条的值
const others = base.filter(d => d.key !== 'character');
const drifted = others.filter(bd =>
  fan.some(v => (v.dims.find(d => d.key === bd.key) || {}).value !== bd.value));
ok(drifted.length === 0,
  `其余 ${others.length} 维全部沿用基准条${drifted.length ? '（漂移：' + drifted.map(d => d.key).join() + '）' : ''}`);

console.log('\n── 4. 被点名的维度可以盖过用户写死的值 ──');
const B2 = BRIEF + '\n场景：居家客厅';
const p2 = parseBrief(B2);
ok(p2.locked.some(x => x.key === 'setting'), '前提：场景已被识别为锁死');
const base2 = pickVariant(p2, 0);
const fan2 = buildFanoutScripts({ sourceText: B2, baseDims: base2, varyKeys: ['setting'], count: 3 });
ok(fan2.every(v => v.dims.some(d => d.key === 'setting')),
  '点名 setting 后，即使基准条没这一维也补了进来');
ok(new Set(fan2.map(v => v.dims.find(d => d.key === 'setting').value)).size === 3,
  '3 条场景各不相同（盖过了写死的「居家客厅」）');
ok(!fan2[0].promptHtml.includes('【已指定 · 全条一致】场景'),
  '脚本里不再把「居家客厅」声明为全条一致');

console.log('\n── 5. 脚本标注 ──');
ok(fan[0].promptHtml.includes('sb-fan'), '本次在变的那一维用 sb-fan 标出来');
ok(fan[0].promptHtml.includes('只变人物设定'), '标题说明「只变什么」');
ok(fan[0].promptHtml.includes('只换个男女角色长相'), '带上用户那句指令');
ok(fan[0].promptHtml.includes('sb-lock'), '用户写死的仍然是锁定高亮');
ok(!first[0].promptHtml.includes('sb-fan'), '首次生成（非定向）不出现 sb-fan');

console.log('\n── 5b. 地区多选按地区展开 ──');
const regional = buildFanoutScripts({
  sourceText: BRIEF, baseDims: base, varyKeys: ['character'], steer: '换个人', count: 4,
  regions: ['br', 'co'],
});
ok(regional.length === 8, '2 个地区 × 每地区 4 条 = 8 条');
ok(regional.filter(v => v.region === 'br').length === 4 && regional.filter(v => v.region === 'co').length === 4,
  '每个地区独立生成 4 条');
ok(regional[0].promptHtml.includes('面向<mark') && regional[0].promptHtml.includes('巴西'),
  '每条提示词写入目标地区');
ok(regional[4].promptHtml.includes('哥伦比亚'), '第二个地区的提示词切换到哥伦比亚');
ok(regional[4].dims.find(d => d.key === 'character').value.includes('哥伦比亚'),
  '人物维度跟随目标地区人物库');

console.log('\n── 6. 联动规则没被破坏 ──');
const B3 = '为某产品制作视频，场景：户外街边';
const p3 = parseBrief(B3);
const base3 = pickVariant(p3, 0);
const fan3 = buildFanoutScripts({ sourceText: B3, baseDims: base3, varyKeys: ['spot'], count: 5 });
const indoorSpots = ['沙发上', '餐桌旁', '床边', '料理台前'];
ok(fan3.every(v => !indoorSpots.includes(v.dims.find(d => d.key === 'spot').value)),
  '锁定室外时，裂变 spot 仍走室外库（不出现「室外·沙发上」）');

const B4 = '为某产品制作视频，面向巴西';
const p4 = parseBrief(B4);
const fan4 = buildFanoutScripts({
  sourceText: B4, baseDims: pickVariant(p4, 0), varyKeys: ['character'], count: 3,
});
ok(fan4.every(v => v.dims.find(d => d.key === 'character').value.includes('巴西')),
  '锁定地区时，裂变 character 仍走该国人物库');

console.log('\n── 7. 面板能点名的维度都真的有库 ──');
ok(FANOUT_DIMS.length >= 18, `可点名维度 ${FANOUT_DIMS.length} 个`);
const bankless = FANOUT_DIMS.filter(d => {
  const t = buildFanoutScripts({ sourceText: BRIEF, baseDims: base, varyKeys: [d.key], count: 2 });
  return new Set(t.map(v => (v.dims.find(x => x.key === d.key) || {}).value)).size < 2;
});
ok(bankless.length === 0,
  `每一维点了都真的会变${bankless.length ? '（哑火：' + bankless.map(d => d.key).join() + '）' : ''}`);

/* ── 8. magic=off／历史任务：基准读不出来，必须先过视频理解 ──
   这是用户点出来的坑：off 档 N 条提示词逐字相同、dims 为空，
   此时说「以视频 3 为底」是空话——差异只存在于成片像素里。
   不跑理解就拿那份共用 dims 去变，出来的东西跟视频 3 长什么样毫无关系。 */
console.log('\n── 8. 读不出基准时的视频理解 ──');
const offBatch = buildVariantScripts(BRIEF, [], 'off', 4);
ok(offBatch.every(v => Array.isArray(v.dims) && v.dims.length === 0),
  '前提：magic=off 时 4 条的 dims 都为空（所以读不出某一条）');

const offTask = { sourceText: BRIEF, images: [], magic: 'off', variants: offBatch };
const read1 = readVideoDims(offTask, 0);
const read3 = readVideoDims(offTask, 2);
ok(read1.length > 0, `视频理解反解出 ${read1.length} 个维度取值`);
// 用户点第 3 条就该读出第 3 条：反解结果必须跟着 index 走，否则等于没看片
ok(JSON.stringify(read1) !== JSON.stringify(read3), '第 1 条和第 3 条反解出来的不一样');
ok(JSON.stringify(readVideoDims(offTask, 2)) === JSON.stringify(read3), '同一条反解可复现（确定性，能对账）');

// 反解不能覆盖用户写死的东西——「用户写了的锁死」这条总规则在理解链路里同样成立
const B5 = '为某产品制作视频，场景：街边 ATM，面向巴西';
const p5 = parseBrief(B5);
const lockedKeys = p5.locked.map(x => x.key);
const read5 = readVideoDims({ sourceText: B5, variants: [{}] }, 0);
ok(lockedKeys.includes('setting') && !read5.some(d => d.key === 'setting'),
  '用户写死了场景，反解就不报场景（不覆盖用户原话）');
ok(read5.some(d => d.key === 'character') && read5.find(d => d.key === 'character').value.includes('巴西'),
  '反解人物仍走该地区的库（联动规则在理解链路里也成立）');

// 拿反解结果当基准，控制变量照样成立
const fanFromRead = buildFanoutScripts({
  sourceText: BRIEF, baseDims: read3, varyKeys: ['character'], steer: '换个人', count: 3,
});
ok(new Set(fanFromRead.map(v => v.promptHtml)).size === 3, '以反解基准裂变，3 条脚本各不相同');
const keptFromRead = read3.filter(d => d.key !== 'character');
ok(keptFromRead.every(bd => fanFromRead.every(v =>
  (v.dims.find(d => d.key === bd.key) || {}).value === bd.value)),
  `反解基准的其余 ${keptFromRead.length} 维全部沿用`);

/* ── 9. 历史任务补脚本：宿主种子只带成败不带脚本 ──
   宿主是另一个 bundle，拿不到 buildVariantScripts。让它自己抄一份就是第三处分叉，
   所以由子应用收到种子时按同一套规则重算。这里验重算出来的东西是对的。 */
console.log('\n── 9. 历史任务补脚本 ──');
const seedVariants = [{ status: 'done' }, { status: 'done' }, { status: 'failed', fail: {} }];
ok(seedVariants.every(v => !v.promptHtml), '前提：种子 variant 没有 promptHtml');
const refilled = buildVariantScripts(BRIEF, [], 'on', seedVariants.length)
  .map((s, i) => ({ ...s, ...seedVariants[i] }));
ok(refilled.every(v => v.promptHtml && v.dims), '补完后每条都有脚本和维度取值');
ok(new Set(refilled.map(v => v.promptHtml)).size === 3, 'magic=on 的历史任务，3 条脚本各不相同');
ok(refilled[2].status === 'failed', '逐条成败是宿主说的，没被脚本覆盖（列表与详情必须一致）');

console.log(fail ? `\n✗ ${fail} 条未通过\n` : '\n✓ 全部通过\n');
process.exit(fail ? 1 : 0);
