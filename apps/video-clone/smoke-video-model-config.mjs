import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MODEL_FAMILIES,
  VIDEO_MODEL_CONFIG,
  modelLabel,
} from './src/videoModelConfig.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const read = path => readFileSync(join(root, path), 'utf8');
let failures = 0;

const check = (condition, message) => {
  console.log(`${condition ? '  ok' : 'FAIL'}  ${message}`);
  if (!condition) failures += 1;
};

const expected = {
  'Seedance 2.0': {
    label: 'Seedance 2.0', durations: ['15s', '10s', '5s'], maxChars: 5000,
    limits: { image: 4, video: 3, audio: 1 }, credits: 2,
  },
  'Seedance 2.0 Fast': {
    label: 'Seedance 2.0 Fast', durations: ['15s', '10s', '5s'], maxChars: 5000,
    limits: { image: 4, video: 3, audio: 1 }, credits: 2,
  },
  'Minimax H3': {
    label: 'Minimax H3', durations: ['15s', '10s'], maxChars: 2000,
    limits: { image: 5, video: 0, audio: 1 }, credits: 1,
  },
  'Grok 1.5': {
    label: 'Grok imagine 1.5', durations: ['15s', '10s'], maxChars: 4000,
    limits: { image: 7, video: 0, audio: 0 }, credits: 1,
  },
  'Google omni': {
    label: 'omni', durations: ['10s'], maxChars: 4000,
    limits: { image: 4, video: 1, audio: 0 }, credits: 1,
  },
};

console.log('\n-- 视频模型参数 --');

const catalogIds = MODEL_FAMILIES.flatMap(family => family.versions);
check(JSON.stringify(catalogIds) === JSON.stringify(Object.keys(expected)), '模型目录与最新文档一致');
check(!catalogIds.includes('Seedance 2.0 Mini'), '模型目录已移除 Seedance 2.0 Mini');

Object.entries(expected).forEach(([id, wanted]) => {
  const actual = VIDEO_MODEL_CONFIG[id];
  check(!!actual, `${id} 存在`);
  if (!actual) return;
  check(modelLabel(id) === wanted.label, `${id} 展示为 ${wanted.label}`);
  check(JSON.stringify(actual.durations) === JSON.stringify(wanted.durations), `${wanted.label} 时长正确`);
  check(actual.maxChars === wanted.maxChars, `${wanted.label} 字数上限正确`);
  check(JSON.stringify(actual.limits) === JSON.stringify(wanted.limits), `${wanted.label} 参考素材上限正确`);
  check(actual.credits === wanted.credits, `${wanted.label} 额度正确`);
});

check(modelLabel('历史模型') === '历史模型', '未知历史模型保留原始展示名称');
check(modelLabel('') === '', '缺少模型值时保持空展示');

const modal = read('src/VideoGenModal.jsx');
const detail = read('src/VideoGenTaskDetail.jsx');
check(modal.includes('modelLabel(value)'), '模型选择器当前值使用前端展示名称');
check(modal.includes('modelLabel(v)'), '模型版本行使用前端展示名称');
check(modal.includes('const displayModel = modelLabel(model)'), '生成校验使用前端展示名称');
check(modal.includes('const displayModel = modelLabel(videoModel)'), '输入区提示使用前端展示名称');
check(detail.includes('const displayModel = modelLabel(task.model)'), '任务详情派生前端展示名称');
check(detail.includes("['视频模型', displayModel]"), '任务详情参数使用前端展示名称');
check(detail.includes('[displayModel, task.outDuration]'), '任务详情摘要使用前端展示名称');

console.log(failures ? `\nX ${failures} checks failed\n` : '\nAll video model parameter checks passed\n');
process.exit(failures ? 1 : 0);
