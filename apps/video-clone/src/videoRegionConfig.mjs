/* Video fanout target markets. Keep the value stable in task payloads so labels can evolve.
   爆款库投放地区与裂变目标地区共用这一份名单，不另开国家表。 */
export const VIDEO_REGIONS = [
  { value: 'ar', label: '阿根廷', locale: 'es-AR', language: '西班牙语', flag: '🇦🇷' },
  { value: 'au', label: '澳大利亚', locale: 'en-AU', language: '英语', flag: '🇦🇺' },
  { value: 'br', label: '巴西', locale: 'pt-BR', language: '葡萄牙语', flag: '🇧🇷' },
  { value: 'ca', label: '加拿大', locale: 'en-CA', language: '英语', flag: '🇨🇦' },
  { value: 'cl', label: '智利', locale: 'es-CL', language: '西班牙语', flag: '🇨🇱' },
  { value: 'co', label: '哥伦比亚', locale: 'es-CO', language: '西班牙语', flag: '🇨🇴' },
  { value: 'de', label: '德国', locale: 'de-DE', language: '德语', flag: '🇩🇪' },
  { value: 'ec', label: '厄瓜多尔', locale: 'es-EC', language: '西班牙语', flag: '🇪🇨' },
  { value: 'fr', label: '法国', locale: 'fr-FR', language: '法语', flag: '🇫🇷' },
  { value: 'id', label: '印度尼西亚', locale: 'id-ID', language: '印尼语', flag: '🇮🇩', aliases: ['印尼'] },
  { value: 'jp', label: '日本', locale: 'ja-JP', language: '日语', flag: '🇯🇵' },
  { value: 'ke', label: '肯尼亚', locale: 'sw-KE', language: '斯瓦希里语', flag: '🇰🇪' },
  { value: 'kr', label: '韩国', locale: 'ko-KR', language: '韩语', flag: '🇰🇷' },
  { value: 'lk', label: '斯里兰卡', locale: 'si-LK', language: '僧伽罗语', flag: '🇱🇰' },
  { value: 'mx', label: '墨西哥', locale: 'es-MX', language: '西班牙语', flag: '🇲🇽' },
  { value: 'my', label: '马来西亚', locale: 'ms-MY', language: '马来语', flag: '🇲🇾' },
  { value: 'ng', label: '尼日利亚', locale: 'en-NG', language: '英语', flag: '🇳🇬' },
  { value: 'nz', label: '新西兰', locale: 'en-NZ', language: '英语', flag: '🇳🇿' },
  { value: 'pe', label: '秘鲁', locale: 'es-PE', language: '西班牙语', flag: '🇵🇪' },
  { value: 'ph', label: '菲律宾', locale: 'fil-PH', language: '菲律宾语', flag: '🇵🇭' },
  { value: 'pk', label: '巴基斯坦', locale: 'ur-PK', language: '乌尔都语', flag: '🇵🇰' },
  { value: 'th', label: '泰国', locale: 'th-TH', language: '泰语', flag: '🇹🇭' },
  { value: 'tr', label: '土耳其', locale: 'tr-TR', language: '土耳其语', flag: '🇹🇷' },
  { value: 'tw', label: '中国台湾', locale: 'zh-TW', language: '中文', flag: '🇹🇼', aliases: ['台湾', '台灣'] },
  { value: 'uk', label: '英国', locale: 'en-GB', language: '英语', flag: '🇬🇧' },
  { value: 'us', label: '美国', locale: 'en-US', language: '英语', flag: '🇺🇸' },
  { value: 'uy', label: '乌拉圭', locale: 'es-UY', language: '西班牙语', flag: '🇺🇾' },
  { value: 'vn', label: '越南', locale: 'vi-VN', language: '越南语', flag: '🇻🇳' },
  { value: 'za', label: '南非', locale: 'en-ZA', language: '英语', flag: '🇿🇦' },
];

export const DEFAULT_VIDEO_REGION = VIDEO_REGIONS[0].value;
export const ALL_REGION_LABEL = '全部地区';
export const ALL_REGION_VALUES = VIDEO_REGIONS.map(region => region.value);

/* 热门与地理组允许重复。只收录上面已有的 value，不把参考图里多出来的国家扩进来。 */
export const REGION_GROUPS = [
  { id: 'hot', label: '热门', values: ['us', 'tw', 'jp', 'kr', 'id', 'ph', 'th', 'br', 'vn', 'mx'] },
  { id: 'greater-china', label: '港澳台', values: ['tw'] },
  { id: 'east-asia', label: '东亚', values: ['jp', 'kr'] },
  { id: 'southeast-asia', label: '东南亚', values: ['th', 'id', 'my', 'vn', 'ph'] },
  { id: 'south-asia', label: '南亚', values: ['lk', 'pk'] },
  { id: 'europe', label: '欧洲', values: ['de', 'fr', 'uk'] },
  { id: 'north-america', label: '北美洲', values: ['us', 'ca'] },
  { id: 'latin-america', label: '拉丁美洲', values: ['ar', 'br', 'cl', 'co', 'ec', 'mx', 'pe', 'uy'] },
  { id: 'oceania', label: '大洋洲', values: ['au', 'nz'] },
  { id: 'africa', label: '非洲', values: ['ke', 'ng', 'za'] },
  { id: 'west-asia', label: '西亚', values: ['tr'] },
];

export function regionFlagCode(value) {
  const code = String(typeof value === 'object' ? value?.value : value || '').toLowerCase();
  return code === 'uk' ? 'gb' : code;
}

export function regionByValue(value) {
  return VIDEO_REGIONS.find(region => region.value === value) || VIDEO_REGIONS[0];
}

export function resolveRegionValue(token) {
  if (token == null) return null;
  const raw = String(typeof token === 'object' ? token.value : token).trim();
  if (!raw || raw === ALL_REGION_LABEL || raw === '全部') return null;
  const lower = raw.toLowerCase();
  const hit = VIDEO_REGIONS.find(region => (
    region.value === raw
    || region.value === lower
    || region.label === raw
    || (region.aliases || []).includes(raw)
  ));
  return hit ? hit.value : null;
}

export function matchRegionQuery(region, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return true;
  if (!region) return false;
  const hay = [region.label, region.value, region.language, region.locale, ...(region.aliases || [])]
    .filter(Boolean)
    .join('\n')
    .toLowerCase();
  return hay.includes(q);
}

export function searchRegions(query) {
  return VIDEO_REGIONS.filter(region => matchRegionQuery(region, query));
}

export function normalizeRegionSelection(regions, { fallback = [DEFAULT_VIDEO_REGION], allowEmpty = false } = {}) {
  const tokens = Array.isArray(regions) ? regions : (regions == null || regions === '' ? [] : [regions]);
  const valid = [...new Set(tokens.map(resolveRegionValue).filter(Boolean))];
  if (valid.length) return valid;
  return allowEmpty ? [] : [...fallback];
}

export function normalizeRegions(regions, fallback = [DEFAULT_VIDEO_REGION]) {
  return normalizeRegionSelection(regions, { fallback, allowEmpty: false });
}

export function isAllRegionsSelected(selected) {
  const values = normalizeRegionSelection(selected, { allowEmpty: true, fallback: [] });
  return values.length === 0 || values.length === VIDEO_REGIONS.length;
}

export function regionTriggerLabel(selected) {
  const values = normalizeRegionSelection(selected, { allowEmpty: true, fallback: [] });
  if (isAllRegionsSelected(values)) return ALL_REGION_LABEL;
  const first = regionByValue(values[0]);
  if (values.length === 1) return first.label;
  return `${first.label} +${values.length - 1}`;
}

export function regionLabelByIndex(index) {
  const i = Number(index) || 0;
  const len = VIDEO_REGIONS.length;
  return VIDEO_REGIONS[((i % len) + len) % len].label;
}
