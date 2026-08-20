/* 爆款库筛选的纯函数：页面和冒烟测试共用，避免 UI 和规则各写一份。 */

export const INDUSTRIES = ['全部', '网赚', '工具', '游戏', '社交', '互娱', '其他'];
export const SOURCES = ['全部', 'TikTok', 'Kwai'];
export const VIDEO_TYPES = ['全部', 'AI', '精剪', '混剪', '原生', '实拍'];
export const REGIONS = ['全部地区', '巴西', '印尼', '墨西哥', '美国'];
export const DURATION_BANDS = ['全部时长', '<15s', '15–30s', '30–60s', '>60s'];
export const SIZES = ['全部尺寸', '9:16', '1:1', '16:9'];
export const SPEND_BANDS = ['全部消耗', '< $1k', '$1k–10k', '$10k–50k', '> $50k'];
export const CREATED_BANDS = ['不限', '近 7 天', '近 30 天', '近 90 天', '近 1 年'];

export function formatSpend(n) {
  const v = Number(n) || 0;
  if (v >= 10000) return `$${(v / 1000).toFixed(0)}k`;
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`;
  return `$${v}`;
}

export function inSpendBand(n, band) {
  if (!band || band === '全部消耗') return true;
  if (band === '< $1k') return n < 1000;
  if (band === '$1k–10k') return n >= 1000 && n < 10000;
  if (band === '$10k–50k') return n >= 10000 && n < 50000;
  if (band === '> $50k') return n >= 50000;
  return true;
}

export function inDurationBand(sec, band) {
  if (!band || band === '全部时长') return true;
  const s = Number(sec) || 0;
  if (band === '<15s') return s < 15;
  if (band === '15–30s') return s >= 15 && s <= 30;
  if (band === '30–60s') return s > 30 && s <= 60;
  if (band === '>60s') return s > 60;
  return true;
}

export function inCreatedBand(daysAgo, band) {
  if (!band || band === '不限') return true;
  const d = Number(daysAgo) || 0;
  if (band === '近 7 天') return d <= 7;
  if (band === '近 30 天') return d <= 30;
  if (band === '近 90 天') return d <= 90;
  if (band === '近 1 年') return d <= 365;
  return true;
}

export function filterLibrary(items, {
  q = '',
  industry = '全部',
  source = '全部',
  type = '全部',
  region = '全部地区',
  duration = '全部时长',
  size = '全部尺寸',
  spend = '全部消耗',
  created = '不限',
} = {}) {
  const kw = String(q || '').trim().toLowerCase();
  return (items || []).filter(item => {
    if (kw && !String(item.product || '').toLowerCase().includes(kw)) return false;
    if (industry !== '全部' && item.industry !== industry) return false;
    if (source !== '全部' && item.source !== source) return false;
    if (type !== '全部' && item.type !== type) return false;
    if (region !== '全部地区' && item.region !== region) return false;
    if (!inDurationBand(item.duration, duration)) return false;
    if (size !== '全部尺寸' && item.size !== size) return false;
    if (!inSpendBand(item.spend, spend)) return false;
    if (!inCreatedBand(item.days, created)) return false;
    return true;
  });
}

export function sortLibrary(items, sort = 'spend') {
  const list = [...(items || [])];
  if (sort === 'new') return list.sort((a, b) => a.days - b.days);
  if (sort === 'duration') return list.sort((a, b) => b.duration - a.duration);
  return list.sort((a, b) => b.spend - a.spend);
}
