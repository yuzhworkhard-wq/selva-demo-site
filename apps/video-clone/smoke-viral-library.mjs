import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  INDUSTRIES, SOURCES, VIDEO_TYPES, REGIONS, DURATION_BANDS, SIZES, SPEND_BANDS, CREATED_BANDS,
  formatSpend, filterLibrary, sortLibrary, inSpendBand, inDurationBand, inCreatedBand,
} from './src/viralLibrary.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const read = path => readFileSync(join(root, path), 'utf8');
let failures = 0;

const check = (condition, message) => {
  console.log(`${condition ? '  ok' : 'FAIL'}  ${message}`);
  if (!condition) failures += 1;
};

const items = [
  { id: 'a', product: 'mixreels', title: 'CashDrama 口播', industry: '网赚', type: '原生', source: 'TikTok', spend: 42800, region: '巴西', duration: 18, size: '9:16', days: 11 },
  { id: 'b', product: 'CashDrama', title: 'mixreels 街边', industry: '网赚', type: '实拍', source: 'Kwai', spend: 800, region: '印尼', duration: 32, size: '16:9', days: 40 },
  { id: 'c', product: 'GlowSkin', title: '护肤', industry: '其他', type: '精剪', source: 'Kwai', spend: 9400, region: '墨西哥', duration: 12, size: '9:16', days: 2 },
  { id: 'd', product: 'LuckyTile', title: '手游', industry: '游戏', type: 'AI', source: 'TikTok', spend: 54100, region: '巴西', duration: 65, size: '1:1', days: 3 },
];

console.log('\n-- 爆款库筛选 --');
check(INDUSTRIES.join() === '全部,网赚,工具,游戏,社交,互娱,其他', '行业分类选项');
check(SOURCES.join() === '全部,TikTok,Kwai', '视频来源只有 TikTok / Kwai');
check(VIDEO_TYPES.join() === '全部,AI,精剪,混剪,原生,实拍', '视频类型选项');
check(REGIONS.includes('巴西') && REGIONS.includes('美国'), '投放地区含巴西 / 美国');
check(DURATION_BANDS[1] === '<15s' && SIZES.includes('9:16'), '时长 / 尺寸档位');
check(SPEND_BANDS.includes('$10k–50k') && CREATED_BANDS.includes('近 30 天'), '消耗 / 创建时间档位');

check(formatSpend(800) === '$800', '消耗 <$1k 原样');
check(formatSpend(9400) === '$9.4k', '消耗 $1k–10k 一位小数');
check(formatSpend(42800) === '$43k', '消耗 ≥$10k 取整 k');

check(inSpendBand(800, '< $1k') && !inSpendBand(1000, '< $1k'), '消耗 < $1k');
check(inDurationBand(18, '15–30s') && !inDurationBand(12, '15–30s'), '时长 15–30s');
check(inCreatedBand(2, '近 7 天') && !inCreatedBand(11, '近 7 天'), '创建近 7 天');

check(filterLibrary(items, { q: 'mixreels' }).map(x => x.id).join() === 'a', '搜索只匹配产品名，不匹配标题');
check(filterLibrary(items, { industry: '游戏' }).map(x => x.id).join() === 'd', '按行业分类');
check(filterLibrary(items, { source: 'Kwai' }).every(x => x.source === 'Kwai'), '按视频来源');
check(filterLibrary(items, { type: 'AI' }).map(x => x.id).join() === 'd', '按视频类型');
check(filterLibrary(items, { region: '巴西' }).every(x => x.region === '巴西'), '按投放地区');
check(filterLibrary(items, { duration: '>60s' }).map(x => x.id).join() === 'd', '按时长档');
check(filterLibrary(items, { size: '9:16' }).every(x => x.size === '9:16'), '按尺寸');
check(filterLibrary(items, { spend: '> $50k' }).map(x => x.id).join() === 'd', '按消耗档');
check(filterLibrary(items, { created: '近 7 天' }).every(x => x.days <= 7), '按创建时间');
check(filterLibrary(items, { industry: '网赚', source: 'TikTok' }).map(x => x.id).join() === 'a', '多条件同时生效');

check(sortLibrary(items, 'spend').map(x => x.id).join() === 'd,a,c,b', '默认按消耗降序');
check(sortLibrary(items, 'new').map(x => x.id).join() === 'c,d,a,b', '按最新创建');
check(sortLibrary(items, 'duration')[0].id === 'd', '按时长降序');

const modal = read('src/VideoGenModal.jsx');
const css = read('src/styles.css');

console.log('\n-- 页面结构：筛选和结果同一条滚动轴 --');
check(modal.includes('export function ViralLibraryPage'), '全屏库组件是 ViralLibraryPage');
check(!modal.includes('ShowcaseLibrary'), '旧 ShowcaseLibrary 已替换');
check(modal.includes('placeholder="搜产品名称，例如 mixreels"'), '搜索框提示搜产品名');
check(modal.includes('label="行业分类"') && modal.includes('label="视频来源"') && modal.includes('label="视频类型"'), '三行筛选 pill');
check(modal.includes('title="投放地区"') && modal.includes('title="消耗"'), '下拉含地区和消耗');
check(css.includes('.lib-page {') && /overflow-y:\s*auto/.test(css.slice(css.indexOf('.lib-page {'), css.indexOf('.lib-page {') + 180)), '.lib-page 自身滚动');
check(!/\.lib-topbar[\s\S]{0,220}position:\s*sticky/.test(css), '标题栏不钉顶');
check(!/\.lib-filter-stack[\s\S]{0,220}position:\s*sticky/.test(css), '筛选区不钉顶');
check(!/\.lib-body[\s\S]{0,120}overflow-y:\s*auto/.test(css), '卡片区不另开滚动层');
check(/requestAnimationFrame\(\(\) => pageRef\.current\?\.scrollTo/.test(modal), '翻页滚的是整页容器');

console.log(failures ? `\nX ${failures} checks failed\n` : '\nAll viral library checks passed\n');
process.exit(failures ? 1 : 0);
