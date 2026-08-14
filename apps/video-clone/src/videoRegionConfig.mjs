/* Video fanout target markets. Keep the value stable in task payloads so labels can evolve. */
export const VIDEO_REGIONS = [
  { value: 'br', label: '巴西', locale: 'pt-BR', language: '葡萄牙语' },
  { value: 'co', label: '哥伦比亚', locale: 'es-CO', language: '西班牙语' },
  { value: 'mx', label: '墨西哥', locale: 'es-MX', language: '西班牙语' },
  { value: 'us', label: '美国', locale: 'en-US', language: '英语' },
  { value: 'jp', label: '日本', locale: 'ja-JP', language: '日语' },
  { value: 'kr', label: '韩国', locale: 'ko-KR', language: '韩语' },
  { value: 'id', label: '印度尼西亚', locale: 'id-ID', language: '印尼语' },
  { value: 'th', label: '泰国', locale: 'th-TH', language: '泰语' },
  { value: 'in', label: '印度', locale: 'hi-IN', language: '印地语' },
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
