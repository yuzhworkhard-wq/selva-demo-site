import React, { useState, useEffect, useRef } from 'react';
import { CloneModal } from './CloneModal';
import { VideoGenModal } from './VideoGenModal';
import { VideoFanoutModal } from './VideoFanoutModal';
import { CloneTaskDetail } from './CloneTaskDetail';
import { VideoGenTaskDetail } from './VideoGenTaskDetail';
import { buildFanoutScripts, buildVariantScripts, readVideoDims, FANOUT_DIMS } from './briefParser';
import './styles.css';

/* 嵌入模式（?embed）：宿主平台用 iframe 承载克隆功能（工具箱入口＝克隆流程，任务中心入口＝任务详情）。
   宿主只负责显示/隐藏 iframe 与任务中心列表行；会话与任务数据都在本应用内。
   协议：
   子 → 父 {type:'selva-clone-close'}                    关闭（宿主隐藏 iframe）
   子 → 父 {type:'selva-clone-task', task:{...}}          任务新建/状态更新（宿主任务中心 upsert 列表行）
   父 → 子 {type:'selva-clone-open'}                      从工具箱打开克隆流程
   父 → 子 {type:'selva-vgen-open'}                       从工具箱打开视频生成流程
   父 → 子 {type:'selva-vfanout-open'}                    从工具箱打开视频裂变流程
   父 → 子 {type:'selva-clone-hide'}                      宿主侧栏切换走（暂停视频、标记关闭态）
   父 → 子 {type:'selva-clone-open-task', id}             从任务中心打开任务详情
   父 → 子 {type:'selva-clone-seed', tasks:[...]}         平台里那些「早于本次会话」的视频生成任务，
                                                          点开也要看到同一套详情，故 iframe 一就绪就灌进任务表 */

// 任务存 module 级：CloneModal 重挂载（重新开始/完成重置）不影响已提交任务；页面刷新即清（与宿主 mock 数据同生命周期）
let taskStore = [];
let taskSeq = 0;

function pad(n) { return String(n).padStart(2, '0'); }
function nowStamp() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
/* 生成失败：模型侧的失败是常态（内容审核、素材解析、超时…），一批里可能只挂掉几条。
   demo 要能稳定演示这两种状态，所以失败是**规则触发不是随机**：
     · 一批 ≥3 条 → 第 3 条固定失败（演示部分失败）
     · 输入里写「测试失败」→ 整批失败（演示全失败）
   真实接入时把 decideClipFail 换成模型返回的逐条结果即可。 */
const FAIL_REASONS = [
  { code: 'E4201', reason: '内容审核未通过：画面中出现疑似真实货币特写，触发金融类素材风控。', fix: '改写提示词，避免真实币种与到账金额特写，或改用示意图。' },
  { code: 'E5013', reason: '参考素材解析失败：上传的参考图分辨率低于模型要求（最低 512×512）。', fix: '换一张更清晰的参考图后重新生成。' },
  { code: 'E5008', reason: '模型侧超时：该条渲染超过 180 秒未返回结果。', fix: '直接重新生成即可，通常是排队高峰导致。' },
];
function decideClipFail(index, total, sourceText) {
  if (sourceText && sourceText.includes('测试失败')) return FAIL_REASONS[index % FAIL_REASONS.length];
  if (total >= 3 && index === 2) return FAIL_REASONS[0];
  return null;
}
// 一批的整体状态：全挂=failed，挂了几条=partial，全好=done
function rollupStatus(variants) {
  const failed = variants.filter(v => v && v.status === 'failed').length;
  if (!failed) return 'done';
  return failed === variants.length ? 'failed' : 'partial';
}

// 上报给宿主任务中心的列表行元数据（提示词/视频等大字段留在本侧）
const HOST_STATUS = { done: 'completed', partial: 'partial', failed: 'failed' };
function postTaskMeta(task) {
  const failedCount = (task.variants || []).filter(v => v && v.status === 'failed').length;
  window.parent.postMessage({
    type: 'selva-clone-task',
    task: {
      id: task.id,
      name: task.name,
      status: HOST_STATUS[task.status] || 'generating',
      failedCount,
      totalCount: (task.variants || []).length,
      createdAt: task.createdAt,
      duration: task.duration || '—',
      toolName: task.toolName || '视频克隆',
    },
  }, '*');
}

/* 宿主种子任务只带了「用户当初写了什么」和逐条成败，没带脚本——它是另一个 bundle，
   拿不到 buildVariantScripts，让它自己抄一份就是第三处分叉。所以在这里补：
   同一份输入 + 同一个 magic 档位，按同一套规则重算，历史任务的详情就跟新任务一模一样
   （提示词 tab 有内容、magic=on 的批次逐条不同、magic=off 的批次逐字相同）。

   裂变来的种子同理：宿主只声明「从哪条任务的第几条裂的、点名变哪几维」，
   基准取值和 N 条脚本按跟真人操作同一条路径现算（读基准 → buildFanoutScripts），
   这样「只变人物、其余逐字沿用」在历史任务里也是真的，不是写死的一句话。 */
function fillSeedScripts(task, byId = {}, seen = new Set()) {
  const variants = task.variants || [];
  if (!variants.length || variants.some(v => v && v.promptHtml)) return task;
  const from = task.fanoutFrom;
  // 上传裂变的种子没有 taskId（基准是用户自己传的片子），照样走裂变这条路补脚本：
  // 基准任务查不到，baseDims 为空，buildFanoutScripts 按「只有指令没有基准」算，跟真人操作一致
  if (from && (from.taskId || from.videoUrl) && !seen.has(task.id)) {
    // 基准任务也是种子，脚本没补上就读不出它的 dims；成环时(seen)退回普通批次
    const baseSeed = from.taskId ? byId[from.taskId] : null;
    const base = baseSeed ? fillSeedScripts(baseSeed, byId, new Set([...seen, task.id])) : null;
    const baseIndex = from.baseIndex || 0;
    const varyKeys = from.varyKeys || [];
    /* readVideoDims 自己判断读不读得出：基准批 magic=off 时 dims 为空，
       自动档的共享补全批次则是 N 条 dims 相同；两种情况都从画面反解基准。 */
    const baseDims = base ? readVideoDims(base, baseIndex) : [];
    const scripts = buildFanoutScripts({
      sourceText: task.sourceText || '',
      imageUrls: task.images || [],
      baseDims, varyKeys,
      steer: from.steer || '',
      count: variants.length,
    });
    return {
      ...task,
      // 详情页要的是标签不是 key：宿主那侧只声明变哪几维，标签在这边的 FANOUT_DIMS 里
      fanoutFrom: {
        taskId: from.taskId || null,
        // 基准是用户自己传的片子时没有来源任务，片子本身在这上面（详情要拿它做缩略图）
        videoUrl: from.videoUrl || null,
        baseIndex,
        steer: from.steer || '',
        dimLabels: varyKeys.map(k => (FANOUT_DIMS.find(d => d.key === k) || {}).label).filter(Boolean),
        readBase: !!from.readBase,
      },
      variants: variants.map((v, i) => ({ ...scripts[i], ...v })),
    };
  }
  const scripts = buildVariantScripts(
    task.sourceText || '', task.images || [], task.magic || 'auto', variants.length,
  );
  return {
    ...task,
    // 逐条成败是宿主说的（列表与详情必须一致），脚本是这里补的，两者合并不互相覆盖
    variants: variants.map((v, i) => ({ ...scripts[i], ...v })),
  };
}

export default function EmbedApp() {
  const [cloneOpen, setCloneOpen] = useState(true);   // iframe 首次加载即处于打开态
  const [cloneKey, setCloneKey] = useState(0);
  const [view, setView] = useState('flow');           // flow=工作流 | task=任务详情
  const [flowType, setFlowType] = useState('clone');  // clone=视频克隆 | vgen=视频生成 | fanout=视频裂变
  const [taskId, setTaskId] = useState(null);
  const [editSeed, setEditSeed] = useState(null);     // 「重新编辑」注入：{taskId, videoUrl, promptHtml, seq}
  const [, setTick] = useState(0);                    // 任务状态变化（模拟生成完成）时刷新
  const genTimers = useRef([]);
  useEffect(() => () => genTimers.current.forEach(clearTimeout), []);

  const bump = () => setTick(t => t + 1);
  const resetFlow = () => { setEditSeed(null); setCloneKey(k => k + 1); };   // 重挂载＝全新流程

  const closeClone = (keepSession) => {
    setCloneOpen(false);
    if (!keepSession) resetFlow();
    window.parent.postMessage({ type: 'selva-clone-close' }, '*');
  };

  // 提交生成：新任务 unshift（重新编辑提交则更新原任务），模拟数秒后出成片
  const submitTask = (p) => {
    let task = p.taskId ? taskStore.find(t => t.id === p.taskId) : null;
    if (!task) {
      taskSeq += 1;
      const d = new Date();
      task = {
        id: `T-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-C${pad(taskSeq)}`,
        createdAt: nowStamp(),
      };
      taskStore.unshift(task);
    }
    const tName = p.toolName || '视频克隆';
    Object.assign(task, {
      name: p.name || (tName === '视频生成' ? `视频生成-${p.region}` : tName === '视频裂变' ? '视频裂变' : `视频克隆-${p.region}`),
      videoUrl: p.videoUrl,
      promptHtml: p.promptHtml,
      promptText: p.promptText,
      variants: p.variants || null,       // 裂变任务：每条变体各自的脚本
      sourceText: p.sourceText || null,   // 原始输入（N 条共同来源）
      images: p.images || null,           // 参考素材（N 条共用）
      refVideos: p.refVideos || null,     // 参考视频 / 音频：只有部分模型收，详情页按名字列
      refAudios: p.refAudios || null,
      // 第一步的出参设置：「重新编辑」回去时要原样带回，不能让用户重设一遍
      model: p.model || null,
      fanoutFrom: p.fanoutFrom || null,   // 裂变来路：基准任务/基准条/变了哪几维/用户那句指令
      aspect: p.aspect || null,
      outDuration: p.outDuration || null,   // 出片时长(5s/10s)，与下面的任务耗时同名会被覆盖，必须分开
      magic: p.magic || null,             // Magic Prompt 档位，也是废片归因时的一条线索
      region: p.region,
      status: 'generating',
      cloneUrl: null,
      duration: '—',
      toolName: tName,
    });
    postTaskMeta(task);
    genTimers.current.push(setTimeout(() => {
      // 逐条落状态：视频生成才有失败一说，克隆是一对一走原路径
      if ((tName === '视频生成' || tName === '视频裂变') && Array.isArray(task.variants)) {
        const total = task.variants.length;
        task.variants = task.variants.map((v, i) => {
          const fail = decideClipFail(i, total, task.sourceText);
          return fail ? { ...v, status: 'failed', fail } : { ...v, status: 'done' };
        });
        task.status = rollupStatus(task.variants);
      } else {
        task.status = 'done';
      }
      task.cloneUrl = task.videoUrl;   // demo：克隆成片用原片素材占位
      task.duration = '2 分 47 秒';
      postTaskMeta(task);
      bump();
    }, 5000));
  };

  // 重新生成＝以原任务的素材与提示词在任务中心提交一条【新任务】；
  // 原任务与详情界面完全不动，唯一反馈是详情里的顶部轻提示
  // idx = 序号 | 序号数组（失败重试一次带走好几条）| 不传（整批重来）
  const regenerate = (task, idx) => {
    if (!task) return;
    const isFanout = task.toolName === '视频裂变';
    const wanted = Array.isArray(idx) ? idx : (typeof idx === 'number' ? [idx] : null);
    // 挑出要重来的那几条，并把上一轮的失败痕迹抹掉——新任务从干净状态开始跑
    const picked = (wanted && task.variants)
      ? wanted.map(i => task.variants[i]).filter(Boolean).map(({ status, fail, ...rest }) => rest)
      : null;
    const variants = picked && picked.length ? picked : task.variants;
    submitTask({
      videoUrl: task.videoUrl,
      variants,
      promptHtml: variants && variants[0] ? variants[0].promptHtml : task.promptHtml,
      promptText: variants
        ? variants.map(v => v.promptHtml.replace(/<[^>]+>/g, '')).join('\n---\n')
        : task.promptText,
      sourceText: task.sourceText,
      images: task.images, refVideos: task.refVideos, refAudios: task.refAudios,
      model: task.model, aspect: task.aspect, outDuration: task.outDuration, magic: task.magic,
      name: picked
        ? (picked.length > 1
          ? (isFanout ? `视频裂变 · ${picked.length} 条` : `视频生成 · ${picked.length} 条`)
          : (isFanout ? '视频裂变' : '视频生成'))
        : task.name,
      region: task.region, toolName: task.toolName, fanoutFrom: task.fanoutFrom,
    });
  };

  /* 定向裂变＝以某一条已出片的变体为基准，只换用户点名的那几维，提交一条【新任务】。
     跟重新生成同一条铁律：原任务与详情页零变化，反馈只有顶部轻提示。
     出参里画幅沿用基准条不给改（改了就跟它不可比），时长可能被新模型带走，
     面板上已经把这件事说破了，这里照面板算出来的值走。 */
  const fanout = (task, {
    baseIndex, steer, varyKeys, model, count, duration, baseDims, readBase, preset,
    images, refVideos, refAudios,
  }) => {
    const base = task.variants && task.variants[baseIndex];
    if (!base) return;
    // baseDims 由面板给：读不出基准时它是视频理解反解出来的那一组，比 base.dims 新鲜
    const dims = (baseDims && baseDims.length) ? baseDims : (base.dims || []);
    // 裂变时新挂的参考素材接着原任务那批一起进提示词（用户常拿一张脸/一个场景来指着说）
    const imgs = [...(task.images || []), ...(images || [])];
    const list = buildFanoutScripts({
      sourceText: task.sourceText || '',
      imageUrls: imgs,
      baseDims: dims,
      varyKeys, steer, count,
    });
    const dimLabels = varyKeys.map(k => (dims.find(d => d.key === k) || {}).label
      || (FANOUT_DIMS.find(d => d.key === k) || {}).label).filter(Boolean);
    submitTask({
      videoUrl: task.videoUrl,
      variants: list,
      promptHtml: list[0].promptHtml,
      promptText: list.map(v => v.promptHtml.replace(/<[^>]+>/g, '')).join('\n---\n'),
      sourceText: task.sourceText,
      images: imgs,
      refVideos: [...(task.refVideos || []), ...(refVideos || [])],
      refAudios: [...(task.refAudios || []), ...(refAudios || [])],
      model, aspect: task.aspect, outDuration: duration, magic: preset ? 'auto' : null,
      name: `${task.toolName === '视频裂变' ? '视频裂变 ·' : '视频生成 · 裂变'} ${count} 条`,
      region: task.region, toolName: task.toolName,
      // 新任务详情里的来路：没有这个，「你的输入」跟成片就对不上号了。
      // readBase 记下基准是反解来的——它不是用户写的，来源得说清楚。
      // 这条路径的基准必是某条任务的变体，所以带 taskId；
      // 将来若开「传一段自己的片子直接裂变」的入口，改带 {videoUrl}（没有来源任务可指），
      // 详情页对两种形状都认（fromTaskId 有无决定「来源任务」那行出不出）
      fanoutFrom: {
        taskId: task.id, baseIndex, steer, dimLabels, readBase: !!readBase,
        varyKeys, preset: preset || null,
      },
    });
  };

  // 重新编辑：换 key 重挂载工作流，落点按「编辑的是用户自己写的东西」来定——
  //   视频生成 → 第一步「你的输入」（脚本是机器产物，逐条改在第二步里已有入口），
  //             且提交算一条新任务（taskId 不带），原任务与那批成片原样留着可对比；
  //   视频克隆 → 第三步提示词（一对一，只有那一份提示词是可编辑的东西）。
  // 同时通知宿主把侧栏切到工具箱态（工作流属于工具箱功能，不该还高亮任务中心）
  const reEdit = (task) => {
    const isGen = task.toolName === '视频生成' || task.toolName === '视频裂变';
    const isFanout = task.toolName === '视频裂变';
    setEditSeed({
      taskId: isGen ? null : task.id,
      videoUrl: task.videoUrl,
      promptHtml: task.promptHtml,
      sourceText: task.sourceText || '',
      images: task.images || [],
      refVideos: task.refVideos || [], refAudios: task.refAudios || [],
      count: (task.variants && task.variants.length) || 1,
      model: task.model, aspect: task.aspect, outDuration: task.outDuration, magic: task.magic,
      fanoutFrom: task.fanoutFrom,
      seq: (editSeed ? editSeed.seq : 0) + 1,
    });
    setView('flow');
    setFlowType(isFanout ? 'fanout' : isGen ? 'vgen' : 'clone');
    window.parent.postMessage({ type: 'selva-clone-nav', section: 'toolbox' }, '*');
  };

  useEffect(() => {
    const onMsg = (e) => {
      const t = e.data && e.data.type;
      /* 宿主灌种子任务：只补本地没有的，不覆盖本次会话真提交过的同 id 任务
         （种子是"历史任务"的快照，用户在本次会话里对它做的任何事都更新鲜） */
      if (t === 'selva-clone-seed' && Array.isArray(e.data.tasks)) {
        const have = new Set(taskStore.map(x => x.id));
        // 裂变种子要按 id 找它的基准任务，所以先把整批摊成表再逐条补
        const byId = Object.fromEntries(e.data.tasks.map(x => [x.id, x]));
        taskStore = taskStore.concat(
          e.data.tasks.filter(x => !have.has(x.id)).map(x => fillSeedScripts(x, byId)),
        );
        bump();   // taskStore 是 module 级的，改了不会自己重渲染
      }
      if (t === 'selva-clone-open') { setFlowType('clone'); setView('flow'); setCloneOpen(true); }
      if (t === 'selva-vgen-open') { setFlowType('vgen'); setView('flow'); setCloneOpen(true); }
      if (t === 'selva-vfanout-open') { setFlowType('fanout'); setView('flow'); setCloneOpen(true); }
      if (t === 'selva-clone-hide') setCloneOpen(false);
      if (t === 'selva-clone-open-task') {
        const id = e.data.id;
        const task = taskStore.find(x => x.id === id);
        setTaskId(id);
        if (task) {
          setFlowType(task.toolName === '视频生成' ? 'vgen' : task.toolName === '视频裂变' ? 'fanout' : 'clone');
        }
        setView('task');
        setCloneOpen(true);
      }
    };
    window.addEventListener('message', onMsg);
    // 监听挂好了才开口要种子：宿主在 iframe load 时抢着发会早于这一行，消息就丢了
    window.parent.postMessage({ type: 'selva-clone-ready' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const curTask = taskStore.find(t => t.id === taskId) || null;
  /* 裂变任务的基准任务：详情里「裂变来源」要放原视频缩略图 + 点开放大 + 它的任务 ID，
     光靠 fanoutFrom 里那几个字段拿不到片子。taskStore 是 module 级的，只有这里够得着，
     所以在这一层解析好再传下去（详情组件不该知道任务表长什么样）。
     基准任务可能不在表里（种子没带上/被清过），那时候详情退回纯文字＋ID。 */
  const baseTask = (curTask && curTask.fanoutFrom && curTask.fanoutFrom.taskId)
    ? (taskStore.find(t => t.id === curTask.fanoutFrom.taskId) || null)
    : null;

  return (
    <>
      {view === 'flow' && cloneOpen && (
          flowType === 'vgen' ? (
          <VideoGenModal
            key={`${cloneKey}:${editSeed ? editSeed.seq : 0}`}
            visible={cloneOpen && view === 'flow'}
            embedded
            onClose={closeClone}
            onRestart={resetFlow}
            onSubmitTask={submitTask}
            initialSourceText={editSeed ? editSeed.sourceText : ''}
            initialImages={editSeed ? editSeed.images : null}
            initialVideos={editSeed ? editSeed.refVideos : null}
            initialAudios={editSeed ? editSeed.refAudios : null}
            initialCount={editSeed ? editSeed.count : 0}
            initialModel={editSeed ? editSeed.model : null}
            initialAspect={editSeed ? editSeed.aspect : null}
            initialDuration={editSeed ? editSeed.outDuration : null}
            initialMagic={editSeed ? editSeed.magic : null}
          />
        ) : flowType === 'fanout' ? (
          <VideoFanoutModal
            key={`${cloneKey}:${editSeed ? editSeed.seq : 0}`}
            visible={cloneOpen && view === 'flow'}
            embedded
            onClose={closeClone}
            onRestart={resetFlow}
            onSubmitTask={submitTask}
            initialVideoUrl={editSeed ? editSeed.videoUrl : null}
            initialFanout={editSeed ? {
              steer: editSeed.fanoutFrom?.steer || '',
              preset: editSeed.fanoutFrom?.preset || (editSeed.magic === 'auto' ? 'basic' : null),
              count: editSeed.count,
              model: editSeed.model,
              images: editSeed.images,
              refVideos: editSeed.refVideos,
              refAudios: editSeed.refAudios,
            } : null}
          />
        ) : (
          <CloneModal
            key={`${cloneKey}:${editSeed ? editSeed.seq : 0}`}
            visible={cloneOpen && view === 'flow'}
            embedded
            onClose={closeClone}
            onRestart={resetFlow}
            onSubmitTask={submitTask}
            initialStep={editSeed ? 2 : 0}
            initialVideoUrl={editSeed ? editSeed.videoUrl : null}
            initialPromptHtml={editSeed ? editSeed.promptHtml : null}
            initialTaskId={editSeed ? editSeed.taskId : null}
          />
        )
      )}
      {view === 'task' && cloneOpen && curTask && (
        (curTask.toolName === '视频生成' || curTask.toolName === '视频裂变') ? (
          <VideoGenTaskDetail
            task={curTask}
            baseTask={baseTask}
            onBack={() => closeClone(true)}
            onReEdit={() => reEdit(curTask)}
            onRegenerate={(i) => regenerate(curTask, i)}
            onFanout={(p) => fanout(curTask, p)}
          />
        ) : (
          <CloneTaskDetail
            task={curTask}
            onBack={() => closeClone(true)}
            onReEdit={() => reEdit(curTask)}
            onRegenerate={() => regenerate(curTask)}
          />
        )
      )}
    </>
  );
}
