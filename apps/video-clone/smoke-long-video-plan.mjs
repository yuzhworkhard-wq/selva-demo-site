import {
  allEntitiesFilled,
  autoFillMissingRefs,
  buildLongVideoPlan,
  needsOrchestration,
} from './src/longVideoPlan.mjs';
import { modelCfg } from './src/videoModelConfig.mjs';

let failures = 0;
const check = (condition, message) => {
  console.log(`${condition ? '  ok' : 'FAIL'}  ${message}`);
  if (!condition) failures += 1;
};

console.log('\n-- 长视频编排 --');

check(needsOrchestration(modelCfg('Seedance 2.0'), '60s'), 'Seedance 60s 需要编排');
check(!needsOrchestration(modelCfg('Seedance 2.0'), '15s'), 'Seedance 15s 不编排');
check(!needsOrchestration(modelCfg('Google omni'), '10s'), 'omni 无超限档');
check(!needsOrchestration(modelCfg('Grok 1.5'), '15s'), 'Grok 最高仍直出');

const plan = buildLongVideoPlan({
  sourceText: '街头采访测 App 到账',
  aspect: '9:16',
  duration: '60s',
  imageUrls: ['showcase/diego.jpg'],
});

check(plan.entities.length >= 5, '识别人物/场景/物品实体');
check(plan.shots.length === 6, '60s 拆成 6 镜');
check(plan.entities[0].imageUrl === 'showcase/diego.jpg', '第一步附图自动挂实体');
check(!allEntitiesFilled(plan.entities), '未自动补全前不可开渲');

const filled = autoFillMissingRefs(plan.entities);
check(allEntitiesFilled(filled), '自动补全后全部就绪');
check(filled.filter(e => e.imageSource === 'auto').length >= 4, '缺图实体标记为 auto');

console.log(failures ? `\nX ${failures} checks failed\n` : '\nAll long-video plan checks passed\n');
process.exit(failures ? 1 : 0);
