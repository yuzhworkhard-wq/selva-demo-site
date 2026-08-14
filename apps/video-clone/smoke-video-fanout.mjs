import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const read = path => readFileSync(join(root, path), 'utf8');
let failures = 0;
const check = (condition, message) => {
  console.log(`${condition ? '  ok' : 'FAIL'}  ${message}`);
  if (!condition) failures += 1;
};

console.log('\n-- 视频裂变整页流程 --');

const dialog = read('src/FanoutDialog.jsx');
const genModal = read('src/VideoGenModal.jsx');
check(genModal.includes('const COUNT_MAX = 4;'), '视频生成单次最多 4 条');
check(dialog.includes('<Stepper value={count} onChange={setCount} max={4}'), '视频裂变每个地区最多 4 条');
check(dialog.includes('每地区最多 4 条'), '裂变界面明确展示地区级条数上限');
check(dialog.includes('export function FanoutPanel'), '任务详情裂变核心导出为共享 FanoutPanel');
check(dialog.includes('return <FanoutPanel {...props} modal />'), '任务详情弹窗复用共享 FanoutPanel');

const flow = read('src/VideoFanoutModal.jsx');
const clone = read('src/CloneModal.jsx');
check(flow.includes("import { FanoutPanel } from './FanoutDialog'"), '整页流程复用同一个 FanoutPanel');
check(!flow.includes('StepIndicator'), '视频裂变采用单页链路，不显示步骤条');
check(!flow.includes('STEPS'), '视频裂变没有第二步状态');
check(flow.includes('showcaseSrc="fanout-showcase.jpg"'), '视频裂变入口使用独立海报');
check(flow.includes('afterDone='), '上传完成后在同一页展示裂变设置');
check(flow.includes('layout="inline"'), '整页裂变把输入卡嵌在上传区而不是滑出弹层');
check(clone.includes('afterDone = null'), '上传步骤支持在已选视频下方插入后续操作');
check(clone.includes('{!autoAdvance && !afterDone && ('), '嵌了后续操作时隐藏下一步按钮');
check(clone.includes('upload-hero-extra'), '裂变参数卡与上传预览同栏，预览可随参数卡伸缩');
check(!flow.includes('上一步'), '单页链路不显示上一步');
check(!flow.includes('baseIndex={0} needsRead'), '页内版沿用任务详情弹窗的核心面板状态');
check(flow.includes("toolName: '视频裂变'"), '提交任务归类为视频裂变');
check(flow.includes('fanoutFrom: { videoUrl'), '上传视频写入裂变来源');
check(!flow.includes('<div className="step-intro">'), '裂变设置直接嵌在上传页，不另开介绍层');
check(flow.includes('urlHandedOffRef'), '提交后基准视频 URL 由任务接管');
check(flow.includes('protectedUrl={initialVideoUrl}'), '重新编辑时保护原任务的基准视频 URL');
check(flow.includes('imageUrls: payload.images || []'), '基准视频不会混入参考图片');
check(flow.includes('images: payload.images || []'), '任务参考图片仅记录用户追加的图片');
check(flow.includes('initialFanout'), '重新编辑可注入完整裂变设置');
check(dialog.includes('layout = \'card\''), '共享面板支持页内 inline 布局');
check(dialog.includes('inline ? \'fo-inline\' : \'fo-dialog\''), '页内版去掉从底部滑出的弹层外壳');

check(dialog.includes('<button className="icon-btn" onClick={onClose} title="关闭">'), '页内版与弹窗版共用关闭控件');
check(!dialog.includes('{modal && <button className="icon-btn"'), '裂变核心 DOM 不按容器形态分叉');
check(dialog.includes('onRefsHandedOff'), '共享面板支持把本地参考素材移交给任务');
check(dialog.includes('refsHandedOffRef.current = true'), '提交后不释放已经移交的本地参考素材 URL');
check(dialog.includes('initialValues'), '共享面板可恢复已保存的裂变设置');

const toolbox = read('src/ToolboxPage.jsx');
check(toolbox.includes('onStartVideoFanout'), 'React 工具箱暴露视频裂变入口');
check(toolbox.includes('<span>视频裂变</span>'), 'React 工具箱显示视频裂变');

const embed = read('src/EmbedApp.jsx');
const taskDetail = read('src/VideoGenTaskDetail.jsx');
check(embed.includes("selva-vfanout-open"), 'iframe 协议支持打开视频裂变');
check(embed.includes("flowType === 'fanout'"), 'iframe 挂载独立视频裂变流程');
check(embed.includes("toolName === '视频裂变'"), '视频裂变任务使用视频生成详情页');
check(embed.includes('fanoutFrom: task.fanoutFrom'), '重新编辑保留裂变来源与设置');
check(embed.includes("isFanout ? `视频裂变 · ${picked.length} 条`"), '视频裂变失败重试沿用视频裂变名称');
check(embed.includes("name: `${task.toolName === '视频裂变' ? '视频裂变 ·' : '视频生成 · 裂变'} ${list.length} 条`"), '再次裂变名称按地区展开后的总条数显示');
check(taskDetail.includes("const showGeneratedPrompt = task.toolName === '视频裂变' || task.magic !== 'off'"),
  'Magic Prompt 关闭时任务详情识别为无扩写提示词');
check(taskDetail.includes('{showGeneratedPrompt && ('),
  '任务详情仅在存在扩写提示词时展示提示词 tab');
check(taskDetail.includes("const scriptTab = !multi ? '扩写提示词' : sameScript ? '本批提示词' : `视频 ${active + 1} 的提示词`"),
  '单条扩写任务的提示词 tab 命名为扩写提示词');

const styles = read('src/styles.css');
check(styles.includes('width: min(560px, calc(100vw - 24px))'), '模型菜单在窄屏限制为视口宽度');
check(styles.includes('.fo-inline {'), '页内裂变输入卡贴在上传区，不走底部滑出弹层');
check(styles.includes('.step-content--with-extra .upload-panel {'), '已上传预览框按剩余高度伸缩');
check(styles.includes('.upload-hero-right--locked'), '右栏不撑高外框，外框高度跟左侧海报走');
check(clone.includes('upload-hero-right--locked'), '上传完成后右栏改为铺满锁定外框');

for (const mirror of ['site', 'source']) {
  const helpers = read(`../../${mirror}/render/helpers.js`);
  const actions = read(`../../${mirror}/actions/interactions.js`);
  check(helpers.includes("id: 'tool-video-fanout'"), `${mirror} 工具列表包含视频裂变`);
  check(actions.includes("selva-vfanout-open"), `${mirror} 宿主能打开视频裂变`);
  check(actions.includes('pendingCloneFlowType'), `${mirror} 宿主记录 iframe 待打开流程`);
  check(actions.includes("if (e.data.type === 'selva-clone-ready')"), `${mirror} iframe 就绪后重发待打开流程`);
}

console.log(failures ? `\nX ${failures} checks failed\n` : '\nAll video fanout checks passed\n');
process.exit(failures ? 1 : 0);
