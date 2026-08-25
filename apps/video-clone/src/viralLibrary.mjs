/* 爆款库筛选的纯函数：页面和冒烟测试共用，避免 UI 和规则各写一份。 */

import { VIDEO_REGIONS, isAllRegionsSelected, resolveRegionValue } from './videoRegionConfig.mjs';

export const INDUSTRIES = ['全部', '网赚', '工具', '游戏', '社交', '互娱', '其他'];
export const SOURCES = ['TikTok', 'Kwai'];
export const VIDEO_TYPES = ['全部', 'AI', '精剪', '混剪', '原生', '实拍'];
export const ALL_REGION = '全部地区';
export const REGIONS = [ALL_REGION, ...VIDEO_REGIONS.map(region => region.label)];
export const DURATION_BANDS = ['全部时长', '<15s', '15–30s', '30–60s', '>60s'];
export const SIZES = ['全部尺寸', '9:16', '1:1', '16:9'];
export const CREATED_BANDS = ['今天', '近 7 天', '近 30 天', '近 90 天'];
export const CREATED_SEGMENT_LABELS = {
  '今天': '今天',
  '近 7 天': '7天',
  '近 30 天': '30天',
  '近 90 天': '90天',
};

export function parseIsoDate(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || '').trim());
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function toIsoDate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const CAL_WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

/** 本地月历 6×7 格。month 从 1 起（8 = 八月）。 */
export function monthGrid(year, month) {
  const y = Number(year);
  const m = Number(month);
  const first = new Date(y, m - 1, 1);
  const start = new Date(y, m - 1, 1 - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    return {
      iso: toIsoDate(date),
      day: date.getDate(),
      inMonth: date.getMonth() === m - 1,
    };
  });
}

function startOfLocalDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function createdOnFromDaysAgo(daysAgo, now = new Date()) {
  const created = startOfLocalDay(now);
  created.setDate(created.getDate() - (Number(daysAgo) || 0));
  return created;
}

export function formatSpend(n) {
  const v = Number(n) || 0;
  if (v >= 10000) return `$${(v / 1000).toFixed(0)}k`;
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`;
  return `$${v}`;
}

/** demo：按近 7 日消耗排名推导 40–99 热度分（展示区左上角火焰 chip）。 */
export function deriveHeatScore(spend7d, rank = 0) {
  const spend = Number(spend7d) || 0;
  const base = 70 - (Number(rank) || 0) * 2;
  const bump = spend > 0 ? spend % 5 : 0;
  return Math.min(99, Math.max(40, base + bump));
}

/** demo：从近 7 日消耗推导今日消耗，保证同一条素材每次展示一致。 */
export function deriveTodaySpend(spend7d) {
  const spend = Number(spend7d) || 0;
  if (spend <= 0) return 0;
  const ratio = 0.06 + (spend % 97) / 1000;
  return Math.max(50, Math.round(spend * ratio));
}

export function formatUploadDate(daysAgo, now = new Date()) {
  const created = createdOnFromDaysAgo(daysAgo, now);
  const m = String(created.getMonth() + 1).padStart(2, '0');
  const day = String(created.getDate()).padStart(2, '0');
  return `${m}-${day}`;
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
  if (!band) return true;
  const d = Number(daysAgo) || 0;
  if (band === '今天') return d <= 0;
  if (band === '近 7 天') return d <= 7;
  if (band === '近 30 天') return d <= 30;
  if (band === '近 90 天') return d <= 90;
  return true;
}

export function parseSpendBound(raw) {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s) return null;
  s = s.replace(/[$,\s]/g, '');
  if (!s) return null;
  let mul = 1;
  if (/k$/i.test(s)) {
    mul = 1000;
    s = s.slice(0, -1);
  }
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * mul);
}

/* 近 7 日消耗闭区间；只填一端则开口，填反了就对调。非法文本当无界。 */
export function inSpendRange(spend, { spendMin = '', spendMax = '' } = {}) {
  let min = parseSpendBound(spendMin);
  let max = parseSpendBound(spendMax);
  if (min == null && max == null) return true;
  if (min != null && max != null && min > max) {
    const swap = min;
    min = max;
    max = swap;
  }
  const v = Number(spend);
  const amount = Number.isFinite(v) ? v : 0;
  if (min != null && amount < min) return false;
  if (max != null && amount > max) return false;
  return true;
}

/* 自定义跨度优先于快捷档。from/to 都按本地日历日闭区间；填反了就对调，不让用户空手。 */
export function inCreatedWindow(daysAgo, {
  created = '今天',
  createdFrom = '',
  createdTo = '',
} = {}, now = new Date()) {
  let from = parseIsoDate(createdFrom);
  let to = parseIsoDate(createdTo);
  if (from || to) {
    if (from && to && from > to) {
      const swap = from;
      from = to;
      to = swap;
    }
    const createdOn = createdOnFromDaysAgo(daysAgo, now);
    if (from && createdOn < from) return false;
    if (to && createdOn > to) return false;
    return true;
  }
  return inCreatedBand(daysAgo, created);
}

function selectedRegionValues(region) {
  if (region == null || region === '' || region === ALL_REGION || region === '全部') return [];
  const tokens = Array.isArray(region) ? region : [region];
  return [...new Set(tokens.map(resolveRegionValue).filter(Boolean))];
}

export function filterLibrary(items, {
  q = '',
  industry = '全部',
  source = 'TikTok',
  type = '全部',
  region = ALL_REGION,
  duration = '全部时长',
  size = '全部尺寸',
  created = '今天',
  createdFrom = '',
  createdTo = '',
  spendMin = '',
  spendMax = '',
} = {}, now = new Date()) {
  const kw = String(q || '').trim().toLowerCase();
  const regionValues = selectedRegionValues(region);
  const filterByRegion = !isAllRegionsSelected(regionValues);
  return (items || []).filter(item => {
    if (kw && !String(item.product || '').toLowerCase().includes(kw)) return false;
    if (industry !== '全部' && item.industry !== industry) return false;
    if (item.source !== source) return false;
    if (type !== '全部' && item.type !== type) return false;
    if (filterByRegion && !regionValues.includes(resolveRegionValue(item.region))) return false;
    if (!inSpendRange(item.spend, { spendMin, spendMax })) return false;
    if (!inDurationBand(item.duration, duration)) return false;
    if (size !== '全部尺寸' && item.size !== size) return false;
    if (!inCreatedWindow(item.days, { created, createdFrom, createdTo }, now)) return false;
    return true;
  });
}

export function sortLibrary(items, sort = 'spend') {
  const list = [...(items || [])];
  if (sort === 'new') return list.sort((a, b) => a.days - b.days);
  return list.sort((a, b) => b.spend - a.spend);
}

export const FAVORITES_STORAGE_KEY = 'selva-viral-favorites';

export function loadFavoriteIds(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  if (!storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(FAVORITES_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter(id => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function saveFavoriteIds(ids, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  if (!storage) return;
  try {
    storage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...new Set(ids || [])]));
  } catch { /* quota */ }
}

export function toggleFavoriteId(ids, id) {
  const set = new Set(ids || []);
  if (set.has(id)) set.delete(id);
  else set.add(id);
  return [...set];
}

export function filterFavorites(items, favoriteIds) {
  const set = new Set(favoriteIds || []);
  if (set.size === 0) return [];
  return (items || []).filter(item => set.has(item.id));
}
