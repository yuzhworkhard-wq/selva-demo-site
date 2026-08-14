/* 视频模型能力的单一来源：界面保存稳定的内部标识，所有可见名称通过 label 渲染。 */
export const VIDEO_MODEL_CONFIG = {
  'Seedance 2.0': {
    label: 'Seedance 2.0',
    durations: ['15s', '10s', '5s'],
    maxChars: 5000,
    limits: { image: 4, video: 3, audio: 1 },
    credits: 2,
    tagline: '旗舰画质，动作与镜头最稳',
  },
  'Seedance 2.0 Fast': {
    label: 'Seedance 2.0 Fast',
    durations: ['15s', '10s', '5s'],
    maxChars: 5000,
    limits: { image: 4, video: 3, audio: 1 },
    credits: 2,
    tagline: '同等参考素材能力，出片速度更快',
  },
  'Minimax H3': {
    label: 'Minimax H3',
    durations: ['15s', '10s'],
    maxChars: 2000,
    limits: { image: 5, video: 0, audio: 1 },
    credits: 1,
    tagline: '参考图最多 5 张，可挂参考音频对齐语速',
  },
  'Grok 1.5': {
    label: 'Grok imagine 1.5',
    durations: ['15s', '10s'],
    maxChars: 4000,
    limits: { image: 7, video: 0, audio: 0 },
    credits: 1,
    tagline: '参考图最多 7 张，适合图像驱动创作',
  },
  'Google omni': {
    label: 'omni',
    durations: ['10s'],
    maxChars: 4000,
    limits: { image: 4, video: 1, audio: 0 },
    credits: 1,
    tagline: '固定 10s，可挂 1 条参考视频定风格',
  },
};

export const MODEL_FAMILIES = [
  { name: 'Seedance', desc: '字节 · 参考素材最全', versions: ['Seedance 2.0', 'Seedance 2.0 Fast'] },
  { name: 'Minimax H3', desc: 'MiniMax · 时长可选', versions: ['Minimax H3'] },
  { name: 'Grok imagine 1.5', desc: 'xAI · 参考图最多', versions: ['Grok 1.5'] },
  { name: 'omni', desc: 'Google · 可挂参考视频', versions: ['Google omni'] },
];

export const DEFAULT_MODEL = 'Seedance 2.0';
export const modelCfg = model => VIDEO_MODEL_CONFIG[model] || VIDEO_MODEL_CONFIG[DEFAULT_MODEL];
export const modelLabel = model => model ? (VIDEO_MODEL_CONFIG[model]?.label || model) : '';
export const familyOf = model => MODEL_FAMILIES.find(family => family.versions.includes(model)) || MODEL_FAMILIES[0];

export const REF_KINDS = [
  { key: 'image', label: '参考图', accept: 'image/*' },
  { key: 'video', label: '参考视频', accept: 'video/*' },
  { key: 'audio', label: '参考音频', accept: 'audio/*' },
];

export const kindLabel = (model, key) => (
  (key === 'image' && modelCfg(model).imageLabel)
  || REF_KINDS.find(kind => kind.key === key)?.label
  || key
);

export const kindOfFile = file => {
  const type = file.type || '';
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('audio/')) return 'audio';
  return null;
};
