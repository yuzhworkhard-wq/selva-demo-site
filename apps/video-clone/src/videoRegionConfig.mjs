/* Video fanout target markets. Keep the value stable in task payloads so labels can evolve. */
export const VIDEO_REGIONS = [
  { value: 'ar', label: '阿根廷', locale: 'es-AR', language: '西班牙语' },
  { value: 'au', label: '澳大利亚', locale: 'en-AU', language: '英语' },
  { value: 'br', label: '巴西', locale: 'pt-BR', language: '葡萄牙语' },
  { value: 'ca', label: '加拿大', locale: 'en-CA', language: '英语' },
  { value: 'cl', label: '智利', locale: 'es-CL', language: '西班牙语' },
  { value: 'co', label: '哥伦比亚', locale: 'es-CO', language: '西班牙语' },
  { value: 'de', label: '德国', locale: 'de-DE', language: '德语' },
  { value: 'ec', label: '厄瓜多尔', locale: 'es-EC', language: '西班牙语' },
  { value: 'fr', label: '法国', locale: 'fr-FR', language: '法语' },
  { value: 'id', label: '印度尼西亚', locale: 'id-ID', language: '印尼语' },
  { value: 'jp', label: '日本', locale: 'ja-JP', language: '日语' },
  { value: 'ke', label: '肯尼亚', locale: 'sw-KE', language: '斯瓦希里语' },
  { value: 'kr', label: '韩国', locale: 'ko-KR', language: '韩语' },
  { value: 'lk', label: '斯里兰卡', locale: 'si-LK', language: '僧伽罗语' },
  { value: 'mx', label: '墨西哥', locale: 'es-MX', language: '西班牙语' },
  { value: 'my', label: '马来西亚', locale: 'ms-MY', language: '马来语' },
  { value: 'ng', label: '尼日利亚', locale: 'en-NG', language: '英语' },
  { value: 'nz', label: '新西兰', locale: 'en-NZ', language: '英语' },
  { value: 'pe', label: '秘鲁', locale: 'es-PE', language: '西班牙语' },
  { value: 'ph', label: '菲律宾', locale: 'fil-PH', language: '菲律宾语' },
  { value: 'pk', label: '巴基斯坦', locale: 'ur-PK', language: '乌尔都语' },
  { value: 'th', label: '泰国', locale: 'th-TH', language: '泰语' },
  { value: 'tr', label: '土耳其', locale: 'tr-TR', language: '土耳其语' },
  { value: 'tw', label: '中国台湾', locale: 'zh-TW', language: '中文' },
  { value: 'uk', label: '英国', locale: 'en-GB', language: '英语' },
  { value: 'us', label: '美国', locale: 'en-US', language: '英语' },
  { value: 'uy', label: '乌拉圭', locale: 'es-UY', language: '西班牙语' },
  { value: 'vn', label: '越南', locale: 'vi-VN', language: '越南语' },
  { value: 'za', label: '南非', locale: 'en-ZA', language: '英语' },
];

export const DEFAULT_VIDEO_REGION = VIDEO_REGIONS[0].value;

export function regionByValue(value) {
  return VIDEO_REGIONS.find(region => region.value === value) || VIDEO_REGIONS[0];
}

export function normalizeRegions(regions, fallback = [DEFAULT_VIDEO_REGION]) {
  const values = Array.isArray(regions) ? regions : regions ? [regions] : fallback;
  const valid = [...new Set(values.map(value => value && typeof value === 'object' ? value.value : value))]
    .filter(value => VIDEO_REGIONS.some(region => region.value === value));
  return valid.length ? valid : fallback;
}
