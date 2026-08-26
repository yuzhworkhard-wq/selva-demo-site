import fs from 'node:fs';
import {
  INDUSTRIES, SOURCES, VIDEO_TYPES, REGIONS, DURATION_BANDS, SIZES, CREATED_BANDS,
  CAL_WEEKDAYS, formatSpend, deriveHeatScore, filterLibrary, sortLibrary, filterFavorites,
  toggleFavoriteId, loadFavoriteIds, saveFavoriteIds, FAVORITES_STORAGE_KEY,
  inCreatedWindow, toIsoDate, monthGrid,
  parseSpendBound, inSpendRange,
} from './src/viralLibrary.mjs';
import {
  VIDEO_REGIONS, REGION_GROUPS, matchRegionQuery, resolveRegionValue,
  isAllRegionsSelected, regionTriggerLabel, regionLabelByIndex, regionFlagCode,
} from './src/videoRegionConfig.mjs';

function check(condition, message) {
  if (!condition) throw new Error(message);
}

const SAMPLE = [
  { product: 'mixreels', industry: '网赚', type: '原生', source: 'TikTok', spend: 42800, region: '巴西', duration: 18, size: '9:16', days: 2 },
  { product: 'CashDrama', industry: '网赚', type: '实拍', source: 'Kwai', spend: 900, region: '印尼', duration: 12, size: '9:16', days: 8 },
  { product: 'LuckyTile', industry: '游戏', type: '精剪', source: 'TikTok', spend: 18600, region: '巴西', duration: 45, size: '1:1', days: 40 },
  { product: 'FaceTune AI', industry: '工具', type: 'AI', source: 'TikTok', spend: 54000, region: '美国', duration: 70, size: '16:9', days: 100 },
];

const TIKTOK_WIDE = { source: 'TikTok', created: '' };
const KWAI_WIDE = { source: 'Kwai', created: '' };
function fl(filters = {}, now) {
  return filterLibrary(SAMPLE, { ...TIKTOK_WIDE, ...filters }, now);
}
function flBoth(filters = {}, now) {
  return [
    ...filterLibrary(SAMPLE, { ...TIKTOK_WIDE, ...filters }, now),
    ...filterLibrary(SAMPLE, { ...KWAI_WIDE, ...filters }, now),
  ];
}

check(INDUSTRIES.join() === '全部,网赚,工具,游戏,社交,互娱,其他', '行业分类 pill 用文档枚举');
check(SOURCES.join() === 'TikTok,Kwai', '视频来源只有 TikTok / Kwai，默认 TikTok');
check(VIDEO_TYPES.join() === '全部,AI,精剪,混剪,原生,实拍', '视频类型用文档枚举，不露后缀');
check(REGIONS[0] === '全部地区', '投放地区第一项仍是全部地区');
check(VIDEO_REGIONS.every(region => REGIONS.includes(region.label)),
  '投放地区枚举覆盖全部裂变目标地区，不另开一份国家表');
check(REGIONS.length === VIDEO_REGIONS.length + 1, '地区选项 = 全部地区 + VIDEO_REGIONS');
check(REGIONS.includes('印度尼西亚') && !REGIONS.includes('印尼'), '筛选项用正式名印度尼西亚，不用短名印尼');
check(['巴西', '墨西哥', '美国'].every(label => REGIONS.includes(label)), '原 4 国仍在裂变名单里');
check(!VIDEO_REGIONS.some(region => ['西班牙', '印度', '中国香港', '香港', '澳门', '蒙古', '新加坡', '柬埔寨', '缅甸', '老挝'].includes(region.label)),
  '不把参考图里没有出现在裂变名单中的国家扩进库');
check(REGION_GROUPS.map(group => group.label).join() === '热门,港澳台,东亚,东南亚,南亚,欧洲,北美洲,拉丁美洲,大洋洲,非洲,西亚',
  '分组顺序对齐参考图：热门 / 港澳台 / 东亚 / 东南亚 / 南亚，其余按地理补齐');
check(REGION_GROUPS.every(group => group.values.every(value => VIDEO_REGIONS.some(region => region.value === value))),
  '分组只收录 VIDEO_REGIONS 已有 value');
const hot = REGION_GROUPS.find(group => group.label === '热门')?.values || [];
const greaterChina = REGION_GROUPS.find(group => group.label === '港澳台')?.values || [];
const eastAsia = REGION_GROUPS.find(group => group.label === '东亚')?.values || [];
check(hot.includes('tw') && greaterChina.includes('tw'), '中国台湾同时出现在热门和港澳台');
check(hot.includes('jp') && eastAsia.includes('jp'), '日本同时出现在热门和东亚');
check(hot[0] === 'us' && hot.includes('ph'), '热门组顺序对齐参考图：美国打头，并含菲律宾');
check(resolveRegionValue('印尼') === 'id' && resolveRegionValue('印度尼西亚') === 'id' && resolveRegionValue('id') === 'id',
  '印尼别名归一到 id / 印度尼西亚');
check(matchRegionQuery(VIDEO_REGIONS.find(region => region.value === 'id'), '印尼'), '搜索命中别名印尼');
check(matchRegionQuery(VIDEO_REGIONS.find(region => region.value === 'id'), '印度尼西亚'), '搜索命中正式名');
check(matchRegionQuery(VIDEO_REGIONS.find(region => region.value === 'br'), '巴西'), '搜索命中标签');
check(!matchRegionQuery(VIDEO_REGIONS.find(region => region.value === 'br'), '日本'), '搜索不误伤其他市场');
check(isAllRegionsSelected([]) && isAllRegionsSelected(VIDEO_REGIONS.map(region => region.value)),
  '空选和全选都视为不过滤');
check(!isAllRegionsSelected(['br', 'us']), '部分勾选不是全选');
check(regionTriggerLabel([]) === '全部地区', '未选时触发器显示全部地区');
check(regionTriggerLabel(['br']) === '巴西', '单选触发器显示正式名');
check(regionTriggerLabel(['br', 'us']) === '巴西 +1', '多选触发器显示首个标签加其余数量');
check(new Set(Array.from({ length: VIDEO_REGIONS.length }, (_, i) => regionLabelByIndex(i))).size === VIDEO_REGIONS.length,
  '下标轮转能覆盖全部目标地区');
check(DURATION_BANDS.includes('<15s') && SIZES.includes('9:16'), '时长和尺寸走分段筛选');
check(CREATED_BANDS.join() === '今天,近 7 天,近 30 天,近 90 天', '创建时间走分段：今天放最前，不含不限和近1年');
check(CREATED_BANDS[0] === '今天', '今天排在创建时间分段第一位');
check(!CREATED_BANDS.includes('不限') && !CREATED_BANDS.includes('近 1 年'), '创建时间去掉不限和近1年');
check(filterLibrary(
  [{ product: 'today', source: 'TikTok', days: 0 }, { product: 'old', source: 'TikTok', days: 2 }],
  { source: 'TikTok', created: '今天' },
).map(x => x.product).join() === 'today', '今天只保留当天上传素材');
check(filterLibrary(SAMPLE, { source: 'TikTok', created: '' }).length === 3,
  'created 空串不过滤上传时间，展示区才能按近 7 日消耗取全量');
check(filterLibrary(SAMPLE, { source: 'Kwai', created: '' }).map(x => x.product).join() === 'CashDrama',
  '展示区按渠道过滤时 created 空串仍只留该渠道');

check(formatSpend(42800) === '$43k', '消耗金额格式化为千美元');
check(formatSpend(9400) === '$9.4k', '不足一万保留一位小数');
check(formatSpend(900) === '$900', '不足一千显示原值');
check(deriveHeatScore(42800, 0) >= deriveHeatScore(42800, 3), '热度分随排名递减');
check(deriveHeatScore(0, 0) >= 40 && deriveHeatScore(99999, 0) <= 99, '热度分落在 40–99');

check(parseSpendBound('') === null && parseSpendBound('   ') === null, '空消耗边界视为无界');
check(parseSpendBound('10k') === 10000 && parseSpendBound('10K') === 10000, 'k 后缀乘 1000');
check(parseSpendBound('$1,000') === 1000 && parseSpendBound('$ 1,000') === 1000, '去掉美元符和逗号');
check(parseSpendBound('$43k') === 43000, '展示格式 $43k 可反解析');
check(parseSpendBound('abc') === null && parseSpendBound('-5') === null, '非法或负数视为无界');
check(parseSpendBound('0') === 0, '0 是合法下限');
check(parseSpendBound('10.4') === 10 && parseSpendBound('10.6') === 11, '四舍五入到整美元');

check(inSpendRange(900, {}) && inSpendRange(900, { spendMin: '', spendMax: '' }), '空消耗范围不过滤');
check(inSpendRange(900, { spendMin: '900' }) && !inSpendRange(899, { spendMin: '900' }), '只填下限时含边界');
check(inSpendRange(900, { spendMax: '900' }) && !inSpendRange(901, { spendMax: '900' }), '只填上限时含边界');
check(inSpendRange(18600, { spendMin: '10000', spendMax: '42800' }), '闭区间包含中间值');
check(!inSpendRange(54000, { spendMin: '10000', spendMax: '42800' }), '闭区间排除上限外');
check(inSpendRange(18600, { spendMin: '42800', spendMax: '10000' }), '上下限填反对调仍命中');
check(inSpendRange(10000, { spendMin: '10k' }), '10k 视为 10000');
check(!inSpendRange(999, { spendMin: '$1,000' }) && inSpendRange(1000, { spendMin: '$1,000' }), '$1,000 解析为 1000 且含边界');
check(inSpendRange(50, { spendMin: 'nope', spendMax: '-1' }), '非法文本当无界');

check(fl({ q: 'mix' }).map(x => x.product).join() === 'mixreels', '搜索只匹配产品名称');
check(fl({ q: '原生' }).length === 0, '搜索不匹配类型或提示词');
check(fl({ industry: '游戏' }).every(x => x.industry === '游戏'), '行业分类过滤');
check(filterLibrary(SAMPLE, { source: 'TikTok' }).every(x => x.source === 'TikTok'), '默认来源过滤只留 TikTok');
check(filterLibrary(SAMPLE, { source: 'Kwai' }).every(x => x.source === 'Kwai'), '来源过滤只留 Kwai');
check(fl({ type: 'AI' }).every(x => x.type === 'AI'), '视频类型过滤');
check(fl({ duration: '>60s' }).every(x => x.duration > 60), '时长大于 60 秒');
check(filterLibrary(SAMPLE, { source: 'TikTok', created: '近 7 天' }).every(x => x.days <= 7), '近 7 天按创建时间筛');
check(fl({ size: '9:16' }).every(x => x.size === '9:16'), '尺寸过滤');
check(flBoth({ region: [] }).length === SAMPLE.length, '空选不过滤地区');
check(flBoth({ region: '全部地区' }).length === SAMPLE.length, '全部地区字符串不过滤');
check(flBoth({ region: VIDEO_REGIONS.map(region => region.value) }).length === SAMPLE.length,
  '全选不过滤地区');
const brUs = fl({ region: ['br', 'us'] });
check(brUs.length > 0 && brUs.every(x => x.region === '巴西' || x.region === '美国') && !brUs.some(x => x.region === '印尼'),
  '多选只留巴西和美国');
check(fl({ region: ['巴西', '美国'] }).length === brUs.length, '标签多选与 value 多选等价');
const idHits = filterLibrary(SAMPLE, { ...KWAI_WIDE, region: ['id'] });
check(idHits.length > 0 && idHits.every(x => x.region === '印尼'), 'id 能命中演示数据里的印尼短名');
check(filterLibrary(SAMPLE, { ...KWAI_WIDE, region: ['印度尼西亚'] }).length === idHits.length, '正式名印度尼西亚与 id 等价');
check(filterLibrary(SAMPLE, { ...KWAI_WIDE, region: ['印尼'] }).length === idHits.length, '筛选别名印尼仍能命中');

const NOW = new Date(2026, 7, 20);
check(toIsoDate(NOW) === '2026-08-20', '本地日期转 YYYY-MM-DD');
check(inCreatedWindow(2, { createdFrom: '2026-08-18', createdTo: '2026-08-20' }, NOW) === true, '跨度包含当天创建');
check(inCreatedWindow(10, { createdFrom: '2026-08-18', createdTo: '2026-08-20' }, NOW) === false, '跨度排除更早素材');
check(inCreatedWindow(2, { createdFrom: '2026-08-20', createdTo: '2026-08-18' }, NOW) === true, '起止填反时对调仍能命中');
check(fl({ spendMin: '', spendMax: '' }).length === 3, '空消耗范围不过滤 TikTok 样本');
check(fl({ spendMin: '20000' }).map(x => x.product).join() === 'mixreels,FaceTune AI', '只填下限保留 ≥ 20000');
check(fl({ spendMax: '20000' }).map(x => x.product).join() === 'LuckyTile', '只填上限保留 ≤ 20000');
check(fl({ spendMin: '10000', spendMax: '50000' }).map(x => x.product).join() === 'mixreels,LuckyTile',
  '闭区间同时约束上下限');
check(fl({ spendMin: '50000', spendMax: '10000' }).map(x => x.product).join() === 'mixreels,LuckyTile',
  '消耗上下限填反时对调');
check(fl({ spendMin: '10k' }).length === 3, '10k 后缀乘 1000 后仍覆盖 TikTok 样本');
check(fl({ spendMin: '$1,000' }).length === 3, '$ 和逗号可解析');
check(fl({ spendMin: 'nope', spendMax: 'abc' }).length === 3, '非法文本当无界');
check(flBoth({ spendMax: '1000' }).map(x => x.product).join() === 'CashDrama', 'Kwai 样本可按上限筛到 900');

check(filterLibrary(SAMPLE, { source: 'TikTok', created: '近 90 天', createdFrom: '2026-08-18', createdTo: '2026-08-20' }, NOW).map(x => x.days).join() === '2',
  '自定义跨度优先于快捷档');
check(inCreatedWindow(8, { created: '近 7 天', createdFrom: '2026-08-12', createdTo: '2026-08-20' }, NOW) === true,
  '有跨度时忽略快捷档');
check(inCreatedWindow(8, { created: '近 7 天' }, NOW) === false, '没有跨度时仍走快捷档');

const libSrc = fs.readFileSync(new URL('./src/viralLibrary.mjs', import.meta.url), 'utf8');
const filterFn = libSrc.slice(libSrc.indexOf('export function filterLibrary'), libSrc.indexOf('export function sortLibrary'));
const sortFn = libSrc.slice(libSrc.indexOf('export function sortLibrary'));
check(!libSrc.includes('SPEND_BANDS') && !libSrc.includes('inSpendBand') && !libSrc.includes('全部消耗'),
  '不用固定消耗档位下拉');
check(filterFn.includes("spendMin = ''") && filterFn.includes("spendMax = ''"),
  'filterLibrary 接收消耗美金上下限');
check(!/\bspend\s*=/.test(filterFn), 'filterLibrary 不以 spend 档位入参');
check(filterFn.includes('inSpendRange(item.spend'), '消耗范围筛 item.spend（近 7 日消耗），不筛 deriveTodaySpend');
check(!sortFn.includes('duration'), 'sortLibrary 没有时长排序分支');

const bySpend = sortLibrary(SAMPLE, 'spend');
check(bySpend[0].spend >= bySpend[1].spend, '默认按消耗从高到低');
check(sortLibrary(SAMPLE, 'new')[0].days <= sortLibrary(SAMPLE, 'new')[1].days, '最新创建按天数升序');
check(sortLibrary(SAMPLE, 'duration').map(x => x.product).join() === bySpend.map(x => x.product).join(),
  '传入时长排序仍回落到消耗');

const favA = toggleFavoriteId([], 'a');
check(favA.length === 1 && favA[0] === 'a', 'toggleFavoriteId 可加入收藏');
const favB = toggleFavoriteId(favA, 'a');
check(favB.length === 0, 'toggleFavoriteId 可取消收藏');
check(filterFavorites([{ id: 'a' }, { id: 'b' }], ['a']).length === 1, 'filterFavorites 只保留已收藏项');
check(filterFavorites(SAMPLE, []).length === 0, '空收藏夹过滤结果为空');
check(FAVORITES_STORAGE_KEY === 'selva-viral-favorites', '收藏夹 localStorage key 固定');
const memStore = { data: {} };
memStore.getItem = (k) => memStore.data[k] ?? null;
memStore.setItem = (k, v) => { memStore.data[k] = v; };
saveFavoriteIds(['sc-01', 'sc-02'], memStore);
check(loadFavoriteIds(memStore).join() === 'sc-01,sc-02', '收藏 id 可持久化到 storage');

const videoGen = fs.readFileSync(new URL('./src/VideoGenModal.jsx', import.meta.url), 'utf8');
const embed = fs.readFileSync(new URL('./src/EmbedApp.jsx', import.meta.url), 'utf8');
const cloneSrc = fs.readFileSync(new URL('./src/CloneModal.jsx', import.meta.url), 'utf8');
const styles = fs.readFileSync(new URL('./src/styles.css', import.meta.url), 'utf8');
const regionSelect = fs.readFileSync(new URL('./src/RegionMultiSelect.jsx', import.meta.url), 'utf8');
let regionPanel = '';
try {
  regionPanel = fs.readFileSync(new URL('./src/RegionPickerPanel.jsx', import.meta.url), 'utf8');
} catch {
  throw new Error('缺少共用地区面板 RegionPickerPanel.jsx');
}

check(videoGen.includes('export function ViralLibraryPage'), '爆款视频库提供可复用页面组件');
check(videoGen.includes("from './viralLibrary.mjs'"), '页面复用筛选函数，不在 JSX 里再抄一份');
check(videoGen.includes('const LIBRARY_PAGE_SIZE = 60'), '爆款视频库固定每页 60 条');
check(videoGen.includes('const SHOWCASE_SEEDS = ['), '爆款视频库保留可复用的演示数据种子');
check(videoGen.includes('const SHOWCASE_BATCHES = 12'), '爆款视频库扩展为 12 组变体');
check(videoGen.includes('SHOWCASE_SEEDS.length + index'), '演示数据按种子批量扩展');
check(!videoGen.includes('Array.from({ length: 6 }'), '不再只用 6 组变体');
check(videoGen.includes('onOpenLibrary'), '视频生成查看全部支持交给宿主导航');
check(!videoGen.includes('hot-card-media" style={{ aspectRatio'), '宫格卡片缩略图统一 9:16，不用素材尺寸撑开高度');
check(/\.hot-card-media\s*\{[^}]*aspect-ratio:\s*9\s*\/\s*16/.test(styles),
  '卡片缩略图区 CSS 固定 9:16');
check(videoGen.includes("placeholder=\"搜产品名称，例如 mixreels\""), '搜索框按产品名称检索');
check(videoGen.includes('aria-label="搜索爆款视频" autoFocus'), '进入爆款库后焦点落到搜索框');
check(videoGen.includes('aria-pressed={sort ==='), '排序选中态对辅助技术可见');
check(videoGen.includes('label="行业分类"'), '全屏库用行业分类而不是内容标签');
check(videoGen.includes('label="视频来源"'), '来源筛选项对辅助技术可见');
check(videoGen.includes('label="视频类型"'), '类型筛选项对辅助技术可见');
check(videoGen.includes('aria-label="广告信息"') && videoGen.includes('aria-label="消耗范围"')
  && videoGen.includes('aria-label="素材属性"'),
  '投放地区按广告信息分组，消耗范围独立成组，尺寸/时长按素材属性分组，并有可访问名称');
check(videoGen.includes('className="lib-segment"'), '创建时间用分段控件而不是散 pill');
check(videoGen.includes('aria-label="创建时间"'), '创建时间分段对辅助技术可见');
check(videoGen.includes('layout="stats"'), '库页卡片展示三列数据区');
check(videoGen.includes('hot-dur-center'), '时长 badge 居中展示');
check(videoGen.includes('hot-card-video'), '卡片 hover 可加载播放视频');
check(videoGen.includes("useState('TikTok')"), '视频来源默认 TikTok');
check(videoGen.includes("useState('今天')"), '创建时间默认今天');
const showcaseFn = videoGen.slice(
  videoGen.indexOf('function HotShowcase'),
  videoGen.indexOf('export function ViralLibraryPage'),
);
check(showcaseFn.includes('function HotShowcase'), '能切出视频生成下方展示区');
check(showcaseFn.includes('SOURCES.map'), '视频生成下方只按 TikTok / Kwai 分渠道');
check(!showcaseFn.includes('INDUSTRIES'), '视频生成下方不用行业分类 chip');
check(showcaseFn.includes('aria-label="投放渠道"'), '渠道 chip 对辅助技术可见');
check(showcaseFn.includes('layout="immersive"'), '视频生成下方用全铺卡片，不跟库页同一套');
check(showcaseFn.includes('做相似'), '悬停后用做相似把提示词灌进输入框');
check(showcaseFn.includes("created: '近 7 天'"), '展示区只取近 7 日消耗最高');
check(videoGen.includes('HOT_PREVIEW_COUNT = 14'), '展示区固定展示 14 条');
check(showcaseFn.includes('onOpenLibrary(source)'), '查看全部带上当前渠道');
check(!showcaseFn.includes('actionLabel="用这条"'), '展示区悬停才出现做相似按钮');
check(!showcaseFn.includes('hot-card-head'), '展示区调用不带头信息条');
check(videoGen.includes("layout === 'immersive'"), '全铺卡片是独立 layout');
check(videoGen.includes('onClick={immersive ? undefined'), '展示卡本身不灌提示词');
check(videoGen.includes("onOpenLibrary('全部', handleApplyTemplate, nextSource)"),
  '打开库页时把渠道交给宿主，行业仍从全部起');
check(videoGen.includes('hot-chip--heat') && videoGen.includes('formatSpend(item.spend)'),
  '展示卡左上角火焰 chip 展示近 7 日消耗');
check(videoGen.includes('hot-chip--src'), '展示卡右上角展示渠道 chip');
check(videoGen.includes('hot-fav-btn--immersive'), '展示卡 hover 时右上角出现收藏按钮');
check(/\.hot-card--immersive:hover \.hot-chip--src/.test(styles),
  '展示卡 hover 时隐藏右上角渠道 chip，与收藏 icon 互换');
check(!videoGen.includes('hot-card-hover-title'), '展示卡 hover 不展示视频名称');
check(!showcaseFn.includes('hot-new'), '展示区近 7 日榜单不再打 NEW');
check(!videoGen.includes('hot-new'), '库页卡片不再打 NEW 标签');
check(/\.hot-fav-btn\s*\{[^}]*width:\s*22px/.test(styles),
  '展示卡收藏按钮基准 22px');
check(/\.hot-card:not\(\.hot-card--immersive\) \.hot-fav-btn\s*\{[^}]*width:\s*28px/.test(styles),
  '库页宫格卡 hover 收藏 icon 放大至 28px');
check(videoGen.includes('hot-card-pick'), '做相似按钮只挂在展示卡悬停层');
check(showcaseFn.includes('onToggleFavorite={toggleFavorite}'), '展示区支持收藏');
check(videoGen.includes('<span className="hot-card-head">'), '库页卡片仍保留来源 / 产品 / 行业头');
check(styles.includes('.hot-card--immersive'), '全铺卡片有独立样式');
check(/\.hot-card--immersive \.hot-card-media\s*\{[^}]*position:\s*absolute/.test(styles),
  '展示卡视频铺满整张卡');
check(/\.hot-card--immersive\s*\{[^}]*cursor:\s*default/.test(styles),
  '展示卡整卡不可点，避免看起来像点卡片灌词');
check(/\.hot-chip\s*\{[^}]*font-size:\s*10px/.test(styles),
  '展示卡 chip 使用 10px 小号字');
check(/\.hot-card-pick\s*\{[^}]*min-height:\s*28px/.test(styles),
  '做相似按钮更紧凑');
check(/\.hot-card-pick\s*\{[^}]*bottom:\s*6px/.test(styles),
  '做相似按钮边距更小');
check(/@media \(hover: none\) \{\s*\.hot-card-scrim,\s*\.hot-card-pick/.test(styles),
  '触控设备不只靠悬停才能点做相似');
check(embed.includes('onUse = null, source = \'TikTok\''), '查看全部把当前渠道传给库页');
check(embed.includes('initialSource'), '从视频生成查看全部带入当前渠道');
check(embed.includes('librarySource'), '嵌入页记住展示区选中的渠道');
check(styles.includes('.lib-segment {'), '分段控件有独立样式');
check(styles.includes('.hot-card-stats {'), '卡片三列数据区有独立样式');
check(styles.includes('.hot-dur-center {'), '居中时长 badge 有独立样式');
check(videoGen.includes('aria-pressed={item === created && !customRange}'), '自定义跨度选中时快捷档全部松开');
check(videoGen.includes('aria-label="自定义时间跨度"'), '时间筛选提供自定义跨度选择器');
check(videoGen.includes('aria-label="开始日期"') && videoGen.includes('aria-label="结束日期"'), '起止日期输入有可访问名称');
check(videoGen.includes('aria-label="宫格"') && videoGen.includes('aria-label="列表"'), '视图切换是图标按钮但仍有名称');
check(!videoGen.includes('type="date"'), '时间跨度不用原生日期输入');
check(videoGen.includes('lib-cal') && videoGen.includes('lib-daterange-cal'), '时间跨度打开自定义月历弹层');
check(styles.includes('.lib-cal') && styles.includes('.lib-daterange-cal'), '自定义月历有独立样式');
check(/\.lib-cal(?:,\s*\.lib-daterange-cal)?\s*\{[^}]*position:\s*fixed/.test(styles),
  '月历 position:fixed，避免被 lib-body 裁切');
check(!styles.includes('::-webkit-calendar-picker-indicator'), '去掉原生日历指示器');
check(!styles.includes('input[type="date"]'), '样式不再针对原生 date 输入');
const pickBtnRule = styles.match(/\.lib-filter-selects \.idea-pick-btn\s*\{[^}]*\}/);
const pickMinWidth = pickBtnRule && pickBtnRule[0].match(/min-width:\s*(\d+)px/);
check(pickMinWidth && Number(pickMinWidth[1]) >= 152, '筛选下拉触发器至少 152px 宽');
check(/\.lib-filter-selects \.idea-pick-btn\s*\{[^}]*justify-content:\s*space-between/.test(styles),
  '筛选下拉 chevron 钉在触发器右侧');
check(/\.lib-filter-label\s*\{[^}]*width:\s*72px/.test(styles),
  '筛选行标签统一 72px，pill 与下拉左缘对齐');
check(!/\.lib-filter-group \.lib-filter-label\s*\{[^}]*width:\s*auto/.test(styles),
  '下拉分组标签不再单独缩成 auto 宽度');
check(CAL_WEEKDAYS.join() === '日,一,二,三,四,五,六', '月历星期从周日开始');
const aug2026 = monthGrid(2026, 8);
check(aug2026.length === 42, '月历固定 6 行 7 列');
check(aug2026[0].iso === '2026-07-26' && aug2026[0].inMonth === false, '2026年8月格子从周日 7/26 起');
check(aug2026[6].iso === '2026-08-01' && aug2026[6].inMonth && aug2026[6].day === 1, '2026-08-01 是周六');
check(videoGen.includes('className="lib-chrome"'), '时间范围与排序视图收进同一工具条');
check(styles.includes('.lib-chrome {'), '时间与排序条有独立样式');
check(!/\.lib-filter-row \+ \.lib-filter-row \{ border-top:/.test(styles), '分类行不再用横线隔开');
check(!/\.lib-filter-stack\s*\{[^}]*border:\s*1px solid var\(--border\)/.test(styles), '分类区不再套大卡片描边');
check(!videoGen.includes('口播带货'), '去掉旧内容分类标签');
check(!videoGen.includes("sort === 'heat'"), '不再按热度排序');
check(!videoGen.includes("src: 'YouTube'") && !videoGen.includes("src: 'Instagram'") && !videoGen.includes("src: 'AdFlow'"),
  '演示数据来源只保留 TikTok / Kwai');
check(videoGen.includes("setSort('spend')") || videoGen.includes("useState('spend')"), '默认按消耗排序');
check(videoGen.includes("{ value: 'spend', label: '消耗' }") && videoGen.includes("{ value: 'new', label: '最新创建' }")
  && videoGen.includes("{ value: 'fav', label: '收藏夹' }"),
  '排序 tab 包含消耗、最新创建和收藏夹');
check(!videoGen.includes("{ value: 'duration', label: '时长' }"), '去掉时长排序 tab');
const sortsBlock = videoGen.match(/const LIB_SORTS = \[([\s\S]*?)\];/);
check(sortsBlock && (sortsBlock[1].match(/value:/g) || []).length === 3,
  'LIB_SORTS 有消耗、最新创建、收藏夹三项');
check(videoGen.includes('hot-fav-btn'), '卡片右上角有收藏按钮');
check(videoGen.includes('filterFavorites('), '收藏夹 tab 复用 filterFavorites');
check(videoGen.includes('useViralFavorites'), '收藏状态用 hook 统一管理');
check(styles.includes('.hot-fav-btn {'), '收藏按钮有独立样式');
check(styles.includes('.hot-fav-btn.is-faved'), '已收藏态高亮样式');
check(/\.hot-card:hover \.hot-fav-btn/.test(styles), '库页宫格卡 hover 时显示收藏按钮');
check(videoGen.includes('formatSpend('), '卡片展示消耗金额');
check(videoGen.includes('item.product'), '卡片标题用产品名称');
check(videoGen.includes("view === 'list'"), '库页支持宫格 / 列表切换');
check(videoGen.includes('lib-list-actions'), '列表行收藏按钮有独立操作列，避免 grid 换行错位');
check(/\.lib-page--preview \.lib-list-row\s*\{[^}]*grid-template-columns:[^;]*36px/.test(styles),
  '预览分栏下列表行仍保留收藏操作列');
check(!styles.includes('.lib-list-row span:nth-child'), '列表行不再用 nth-child 隐藏列');
check(videoGen.includes('aria-label="爆款视频库分页"'), '爆款视频库分页控件提供可访问名称');
check(videoGen.includes('slice((currentPage - 1) * LIBRARY_PAGE_SIZE, currentPage * LIBRARY_PAGE_SIZE)'), '爆款视频库按页切分视频列表');
check(!videoGen.includes('className="lib-title-mark"'), '爆款库标题不显示独立图标');
check(styles.includes('.lib-topbar {') && !styles.includes('padding: 12px 20px; border-bottom: 1px solid var(--border);'),
  '爆款库标题栏不使用顶部横线分隔');
check(styles.includes('.lib-title { font-size: 24px; font-weight: 700;'), '爆款库标题使用页面标题层级字体');
check(styles.includes('.lib-pagination {'), '爆款视频库提供分页控件样式');
check(styles.includes('.lib-filter-stack'), '全屏库用多层筛选栈');
check(styles.includes('.hot-card-product'), '卡片展示产品名');

const viralPage = videoGen.slice(
  videoGen.indexOf('export function ViralLibraryPage'),
  videoGen.indexOf('const CN_NUM'),
);
const bodyAt = viralPage.indexOf('className="lib-body"');
const topbarAt = viralPage.indexOf('className="lib-topbar"');
const searchAt = viralPage.indexOf('className="lib-search-bar"');
const stackAt = viralPage.indexOf('className="lib-filter-stack"');
const chromeAt = viralPage.indexOf('className="lib-chrome"');
const toolbarAt = viralPage.indexOf('className="lib-toolbar"');
const filtersAt = viralPage.indexOf('className="lib-filters"');
check(bodyAt >= 0 && /className="lib-body"\s+ref=\{bodyRef\}/.test(viralPage), '分页滚动绑在 lib-body');
check(topbarAt >= 0 && topbarAt < bodyAt, '标题栏留在滚动区外，关闭/返回始终可点');
check(searchAt > bodyAt && stackAt > bodyAt && chromeAt > bodyAt && toolbarAt > bodyAt && filtersAt > bodyAt,
  '搜索、筛选栈、创建时间栏和排序行都在滚动容器内，跟视频列表一起滚');
check(viralPage.includes('广告信息') && viralPage.includes('消耗范围') && viralPage.includes('素材属性'),
  '额外筛选项按广告信息 / 消耗范围 / 素材属性分组');
check(!viralPage.includes('更多筛选'), '库页去掉更多筛选总标签');
check(viralPage.includes('className="lib-filter-row lib-filter-row--groups"'),
  '三组筛选项在同一横排');
const adGroupAt = viralPage.indexOf('aria-label="广告信息"');
const spendGroupAt = viralPage.indexOf('aria-label="消耗范围"');
const assetGroupAt = viralPage.indexOf('aria-label="素材属性"');
const regionAt = viralPage.indexOf('LibraryRegionPicker');
const spendAt = viralPage.indexOf('SpendRangeField');
const sizeAt = viralPage.indexOf('title="视频尺寸"');
const durationAt = viralPage.indexOf('title="视频时长"');
const adGroupSlice = viralPage.slice(adGroupAt, spendGroupAt);
const spendGroupSlice = viralPage.slice(spendGroupAt, assetGroupAt);
check(adGroupAt > stackAt && spendGroupAt > adGroupAt && assetGroupAt > spendGroupAt && assetGroupAt < chromeAt,
  '广告信息 → 消耗范围 → 素材属性，都还在筛选栈里');
check(regionAt > adGroupAt && regionAt < spendGroupAt,
  '投放地区仍在广告信息组');
check(!adGroupSlice.includes('SpendRangeField'),
  '广告信息组不再包含消耗范围控件');
check(spendAt > spendGroupAt && spendAt < assetGroupAt,
  '消耗范围在投放地区之后、素材属性之前');
check(spendGroupSlice.includes('SpendRangeField'),
  '消耗范围组使用 SpendRangeField 而不是档位下拉');
check(viralPage.includes('lib-filter-label">消耗范围') && viralPage.includes('aria-label="消耗范围"'),
  '消耗范围有可见标题和可访问名称');
const spendFn = videoGen.slice(
  videoGen.indexOf('function SpendRangeField'),
  videoGen.indexOf('function itemAspect'),
);
check(spendFn.includes('function SpendRangeField') && spendFn.includes('className={`lib-spendrange'),
  '能切出 SpendRangeField 本体');
check(!spendFn.includes('role="group"') && !spendFn.includes('aria-label="消耗范围"')
  && !spendFn.includes('aria-label="消耗美金范围"') && !spendFn.includes('title="消耗"'),
  'SpendRangeField 不自带第二层具名组');
check(!videoGen.includes('aria-label="消耗美金范围"') && !viralPage.includes('title="消耗"'),
  '库页和字段都不再使用消耗美金范围组名或 title 消耗');
check(videoGen.includes('aria-label="最低消耗美金"') && videoGen.includes('aria-label="最高消耗美金"'),
  '消耗上下限输入有可访问名称');
check(videoGen.includes('placeholder="最低"') && videoGen.includes('placeholder="最高"'),
  '消耗范围占位最低/最高');
check(videoGen.includes('aria-label="清除消耗范围"'), '有值时可清除消耗范围');
check(videoGen.includes('inputMode="decimal"'), '消耗输入用小数键盘');
check(viralPage.includes('[industry, source, type, region, duration, size, created, createdFrom, createdTo, q, sort, spendMin, spendMax, favoriteIds]'),
  '改筛选或收藏会把页码重置到第 1 页');
check(!viralPage.includes('全部消耗') && !viralPage.includes('SPEND_BANDS') && !viralPage.includes('inSpendBand'),
  '库页没有消耗档位下拉');
check(styles.includes('.lib-spendrange {'), '消耗范围有独立样式');
check(/\.lib-spendrange\s*\{[^}]*height:\s*var\(--lib-time-control-h,\s*32px\)/.test(styles),
  '消耗范围高度 32px 对齐时间跨度');
check(!/\.lib-spendrange\s*\{[^}]*min-width:\s*160px/.test(styles),
  '消耗范围不套筛选下拉的 160px 最小宽');
check(sizeAt > assetGroupAt && durationAt > sizeAt && durationAt < chromeAt,
  '素材属性组仍是视频尺寸 + 视频时长');
check(styles.includes('.lib-filter-row--groups') && styles.includes('.lib-filter-group'),
  '分组横排有独立样式，不另做一套筛选系统');
check(chromeAt < toolbarAt && toolbarAt < filtersAt && viralPage.indexOf('lib-count') > toolbarAt && viralPage.indexOf('lib-count') < filtersAt,
  '条数跟时间范围同一组，排序 tab 跟视图切换同一组');
check(!/\.lib-filter-stack\s*\{[^}]*flex-shrink:\s*0/.test(styles), '筛选栈不再用 flex-shrink:0 钉在滚动区外');
check(!/\.lib-search-bar\s*\{[^}]*flex-shrink:\s*0/.test(styles), '搜索栏不再钉在滚动区外');
check(!/\.lib-toolbar\s*\{[^}]*flex-shrink:\s*0/.test(styles), '创建时间栏不再钉在滚动区外');
check(!/\.lib-filters\s*\{[^}]*flex-shrink:\s*0/.test(styles), '排序/视图行不再钉在滚动区外');
check(!/\.lib-chrome\s*\{[^}]*flex-shrink:\s*0/.test(styles), '时间与排序条不钉在滚动区外');
check(/\.lib-topbar\s*\{[^}]*flex-shrink:\s*0/.test(styles), '标题栏仍 flex-shrink:0 钉住');
check(/\.lib-body\s*\{[^}]*overflow-y:\s*auto/.test(styles), 'lib-body 仍是唯一纵向滚动容器');
check(!/\.lib-(search-bar|filter-stack|filter-row|filter-group|toolbar|filters|chrome|spendrange)\s*\{[^}]*position:\s*(sticky|fixed)/.test(styles),
  '筛选区不用 sticky/fixed 钉顶');
check(!/\.lib-filter-(row--groups|group)\s*\{[^}]*flex-shrink:\s*0/.test(styles),
  '分组筛选行仍在 lib-body 里跟着卡片滚');
check(styles.includes('.lib-filter-selects .idea-pick { overflow: visible; }')
  || /lib-filter-selects \.idea-pick \{ overflow: visible; \}/.test(styles),
  '筛选下拉不裁切菜单，不把筛选移出滚动区');
check(embed.includes("t === 'selva-hot-library-open'"), '嵌入应用响应平台爆款库入口');
check(embed.includes('e.source !== window.parent'), '嵌入应用只接受宿主窗口消息');
check(embed.includes("setView('library')"), '嵌入应用提供独立爆款库视图');
check(embed.includes("section: 'viral-library', source: nextSource"),
  '查看全部把当前渠道带给宿主侧栏同步');
check(embed.includes("e.data.initialSource === 'Kwai'"),
  '侧栏打开库页时无 initialSource 则回落到 TikTok，有 Kwai 则保留');
check(embed.includes("document.querySelector('.composer-input--rich')?.focus()"), '一级菜单模板回填后焦点落到视频生成输入框');
check(embed.includes('visible={cloneOpen}'), '库页覆盖输入页时保持视频生成会话可见，返回时不误触发恢复弹窗');
check((embed.match(/visible=\{cloneOpen && view === 'flow'\}/g) || []).length === 3,
  '库页打开时暂停克隆 / 视频裂变 / 批量混剪流程，避免隐藏流程响应全局按键');
check(embed.includes("inert={view === 'library'}"), '库页打开时底层视频流程退出键盘和读屏焦点树');
check(styles.includes('.embed-flow-layer[inert] .clone-page'), '库页打开时底层视频流程同步降到详情页下方');

check(videoGen.includes('function LibraryPreview'), '库页提供右侧预览详情而不是直接制作同款');
check(videoGen.includes('基础信息'), '详情展示基础信息');
check(!videoGen.includes("label: '标题'"), '详情基础信息不展示标题');
check(!videoGen.includes("label: '素材 ID'"), '详情基础信息不展示素材 ID');
check(videoGen.includes("label: '近 7 日消耗'"), '基础信息展示消耗');
check(videoGen.includes('role="tablist" aria-label="视频详情"'), '详情用 tab 切换基础信息与提示词');
check(videoGen.includes('SHOWCASE_LONG_PROMPTS'), '部分爆款种子用长提示词演示展开收起');
check(videoGen.includes('useLayoutEffect'), '提示词折叠用行高检测而不只靠字数');
check(videoGen.includes('className="lib-preview-prompt-card"'), '提示词卡片支持折叠与复制');
check(videoGen.includes('使用提示词'), '提示词卡片提供使用提示词操作');
check(videoGen.includes('onUse={_onUse}'), '库页把制作同款回调交给详情提示词卡片');
check(!/label: '版权别名'|label: '制作团队'|label: '版权过期时间'/.test(videoGen), '不编造库数据里没有的字段');
check(viralPage.includes('onOpen={() => setPreviewId(item.id)}'), '宫格卡片点开预览详情');
check(viralPage.includes("aria-label={`${item.product}，${item.source}，消耗 ${formatSpend(item.spend)}，查看详情`}"),
  '列表行点开预览详情');
check(!viralPage.includes('onClick={() => useItem(item)}'), '库页不再把整卡点击绑到制作同款');
check(viralPage.includes('if (previewIdRef.current) setPreviewId(null)'), 'Escape 先关预览再关库页');
check(videoGen.includes('aria-label="关闭详情"'), '预览提供关闭');
check(videoGen.includes('aria-label="下载视频"'), '预览提供下载');
check(videoGen.includes('aria-label="上一条"') && videoGen.includes('aria-label="下一条"'), '预览可左右切视频');
check(styles.includes('.lib-preview {'), '预览层有独立样式');
check(styles.includes('.lib-preview-tabs {'), '详情 tab 有独立样式');
check(styles.includes('.lib-preview-prompt-card {'), '提示词卡片有独立样式');
check(viralPage.includes('lib-page--preview'), '预览打开时给页面根节点加上分栏 class');
check(styles.includes('.lib-page--preview'), '打开详情时页面进入分栏布局');
const libPreviewRule = styles.match(/(?:^|\n)\.lib-preview\s*\{[^}]*\}/);
check(libPreviewRule && !/position:\s*absolute/.test(libPreviewRule[0]) && !/inset:\s*0/.test(libPreviewRule[0]),
  '默认预览层不再用绝对定位盖住网格');
check(/\.lib-page--preview\s+\.lib-preview\s*\{[^}]*grid-(column|row)/.test(styles),
  '分栏时预览走网格列而不是 overlay');
check(/\.hot-grid--dense\s*\{[^}]*minmax\(240px,\s*1fr\)/.test(styles),
  '默认库页网格用 1fr 铺满整行');
check(/\.lib-page--preview\s+\.hot-grid--dense\s*\{[^}]*minmax\(200px,\s*1fr\)/.test(styles),
  '打开详情时左侧仍 1fr 铺满，卡片 max-width 封顶防撑大');
check(/\.lib-page--preview\s+\.hot-card\s*\{[^}]*max-width:\s*248px/.test(styles),
  '详情分栏时单卡最大宽度 248px');
check(/\.lib-page--preview\s*\{[^}]*grid-template-columns:[^;]*420px/.test(styles),
  '详情侧栏加宽到 420px');
check(styles.includes('.hot-card.selected {'), '选中卡片有高亮');
check(!styles.includes('.hot-card-caption {'), '库页不改卡片标题区样式');
check(embed.includes('onUse={useViralTemplate}'), '从视频生成打开库时仍保留制作同款回调');
check(videoGen.includes('className="lib-preview-ctas"'), '详情底部钉住快捷操作，不跟基础信息一起滚走');
check(videoGen.includes('用「${item.product}」开始视频克隆'), '克隆快捷按钮有可见文案对应的可访问名称');
check(videoGen.includes('用「${item.product}」开始视频裂变'), '裂变快捷按钮有可见文案对应的可访问名称');
check(viralPage.includes('onClone={onClone}') && viralPage.includes('onFanout={onFanout}'),
  '库页把克隆/裂变快捷入口交给详情，不在卡片点击上绑制作同款');
check(videoGen.includes('<Copy size={16}') && videoGen.includes('<GitBranch size={15}'),
  '快捷按钮用 lucide 图标，不用 emoji');
check(/className="btn-primary"[\s\S]{0,80}onClone\(item\)/.test(videoGen),
  '视频克隆是实心主按钮');
check(/className="btn-outline"[\s\S]{0,80}onFanout\(item\)/.test(videoGen),
  '视频裂变是描边次按钮');
check(videoGen.indexOf('onClone(item)') < videoGen.indexOf('onFanout(item)'),
  '主按钮视频克隆排在次按钮视频裂变前面');
check(!/lib-preview-ctas[\s\S]{0,400}onUse\(item\)/.test(videoGen),
  '详情快捷入口不走视频生成灌提示词');
check(embed.includes('fromLibrary: true'), '从库进入克隆/裂变时标记来路');
check(embed.includes("startLibraryTool('clone'") && embed.includes("startLibraryTool('fanout'"),
  '一级菜单库页和视频生成里的库页共用同一套快捷入口');
check(embed.includes("setFlowType(tool)"), '快捷入口切到对应工具，不新做一套流程');
check(embed.includes('initialStep={editSeed?.fromLibrary ? 0 : (editSeed ? 2 : 0)}'),
  '库入口的克隆停在上传完成态，重新编辑仍直达第三步');
check(embed.includes('initialFanout={editSeed && !editSeed.fromLibrary ?'),
  '库入口的裂变用独立工具默认面板，不套重新编辑的档位');
check(cloneSrc.includes("initialVideoUrl ? { name: '已保存的基准视频' } : null"),
  '克隆有预填视频时直接进入上传完成态，和裂变一致');
check(styles.includes('.lib-preview-ctas {'), '快捷操作栏有独立样式');
check(/\.lib-preview-ctas\s*\{[^}]*flex-shrink:\s*0/.test(styles),
  '快捷操作栏钉在详情底部，不随基础信息滚动');
check(/\.lib-preview-ctas\s*\{[^}]*grid-template-columns:\s*1\.15fr\s+1fr/.test(styles),
  '主次按钮左右排列，克隆略宽');
check(/\.lib-preview-ctas\s+\.btn-primary\s*\{[^}]*font-weight:\s*600/.test(styles),
  '主按钮字重更重');
check(/\.lib-preview-ctas\s+\.btn-outline\s*\{[^}]*color:\s*var\(--accent-hover\)/.test(styles)
  && /\.lib-preview-ctas\s+\.btn-outline\s*\{[^}]*border-color:\s*var\(--accent\)/.test(styles)
  && /\.lib-preview-ctas\s+\.btn-outline\s*\{[^}]*background:\s*var\(--accent-subtle\)/.test(styles),
  '次按钮也走紫色描边和浅紫底，不做成灰黑弱操作');
check(/\.lib-preview-ctas\s+\.btn-primary\s*\{[^}]*min-height:\s*48px/.test(styles)
  && /\.lib-preview-ctas\s+\.btn-outline\s*\{[^}]*min-height:\s*48px/.test(styles),
  '左右按钮同高 48px');
check(/\.lib-preview-ctas\s+\.btn-primary:focus-visible/.test(styles)
  && /\.lib-preview-ctas\s+\.btn-outline:focus-visible/.test(styles),
  '主次按钮都保留可见焦点环');

check(regionPanel.includes('快速检索国家与地区'), '共用面板搜索占位为快速检索国家与地区');
check(regionPanel.includes('>全部<') || regionPanel.includes('全部</'), '共用面板右侧提供全部按钮');
check(regionPanel.includes('REGION_GROUPS') && regionPanel.includes('type="checkbox"'),
  '共用面板按分组勾选，每项是复选框');
check(regionPanel.includes('allowEmpty'), '库筛选允许空选，裂变可关掉空选');
check(videoGen.includes("from './RegionPickerPanel") || videoGen.includes('LibraryRegionPicker'),
  '爆款库投放地区接入共用面板，而不是旧 4 项 Picker');
check(!viralPage.includes('<Picker value={region} options={REGIONS}'),
  '投放地区不再使用 4 项 Picker');
check(videoGen.includes('useState([])') && videoGen.includes('LibraryRegionPicker'),
  '库页地区筛选默认空选（全部地区）');
check(regionPanel.includes('deferCommit') && regionPanel.includes('onConfirm'),
  'LibraryRegionPicker 点确定才 onChange，关闭/取消不改当前筛选');
check(regionSelect.includes('RegionPickerPanel'), '裂变目标地区下拉复用同一块面板');
check(regionSelect.includes('allowEmpty={false}') || regionSelect.includes('allowEmpty={false }'),
  '裂变至少保留一个目标地区');
check(styles.includes('.region-picker-panel'), '共用地区面板有独立样式');
check(/\.region-picker-panel\s*\{[^}]*position:\s*fixed/.test(styles),
  '地区面板 position:fixed，避免被 lib-body 裁切');
check(regionPanel.includes('useLayoutEffect'), '锚点在 layout 阶段计算，避免 fixed 面板先闪一帧');
check(regionPanel.includes('Math.min(maxHeight, avail)'),
  '短视口把面板高度钳在剩余空间内，让内部滚动而不是溢出窗口');
check(styles.includes('min(720px, calc(100vw - 48px))'), '面板宽度约 720，窄屏随视口收缩');
check(regionPanel.includes('deferCommit'), '库筛选勾选先进入草稿，确定后才提交');
check(regionPanel.includes('>确定<') || regionPanel.includes('确定</') || regionPanel.includes('确定{'),
  '面板底部提供确定，点了才把选择交给筛选');
check(regionPanel.includes('>取消<') || regionPanel.includes('取消</'),
  '面板提供取消，点外部或取消都丢掉这次勾选');
check(regionPanel.includes('region-picker-search-field'), '搜索图标放在输入框内，不再和全部挤成一排散件');
check(styles.includes('.region-picker-foot'), '确定/取消落在独立页脚，和列表用分割线分开');
check(/grid-template-columns:\s*repeat\(auto-fill,\s*minmax\(/.test(styles),
  '国家网格按最小宽度自适应，不再硬塞 6 列把长名字挤乱');
check(/\.region-picker-grid\s*\{[^}]*gap:\s*8px/.test(styles), '格子间距至少 8px，避免勾选热区贴在一起');
check(regionFlagCode('uk') === 'gb' && regionFlagCode('us') === 'us', '英国国旗用 gb 码，其余跟地区 value');
check(regionPanel.includes('regionFlagCode') && regionPanel.includes('flagcdn.com'),
  '国旗用图片资源，不用 emoji 当结构图标');
check(videoGen.includes('regionLabelByIndex('), '演示卡片按 VIDEO_REGIONS 下标轮转地区');
check(!/region: '印尼'/.test(videoGen), '卡片展示用印度尼西亚正式名，不再写死印尼');

console.log('viral library smoke checks passed');
