import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import {
  ArrowLeft, RefreshCw, Download, Pencil, GitBranch, Eye,
  Copy, Check, Loader2, Play, FileText, Info, AlertTriangle,
} from 'lucide-react';
import { notifyHostModal } from './hostModal';
import { FanoutDialog } from './FanoutDialog';

// 老任务（这版之前提交的）没有逐条状态，按全成功处理
const FALLBACK_FAIL = { code: 'E5000', reason: '模型未返回结果。', fix: '直接重新生成即可。' };

/* 成片预览：点击播放/暂停，未播放时中央播放钮（与克隆详情同一交互语言） */
function Vid({ src, label }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  return (
    <div
      className="ctd-vbox"
      onClick={() => { const v = ref.current; if (!v) return; v.paused ? v.play().catch(() => {}) : v.pause(); }}
      title={playing ? '暂停' : '播放'}
    >
      <video
        ref={ref} src={src} playsInline preload="metadata" aria-label={label}
        onLoadedData={e => { try { e.currentTarget.currentTime = 0.1; } catch {} }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      {!playing && <span className="ctd-vplay"><Play size={15} /></span>}
    </div>
  );
}

/* ── 视频生成任务详情 ──
   克隆是一对一（原片 ⇄ 成片）所以左右对照；生成是一对多（一份输入 → N 条视频），
   左边用序号选择器切换当前这条、主区放成片，右边两个 tab：
     你的输入      —— 你当初写的那份 brief + 参考图
     视频 N 的提示词 —— Magic Prompt 把它裂变成的这一条脚本
   逐条脚本原先藏着不露（"后台产物"），但有 Magic Prompt 这一层在，
   "我写的" 和 "机器跑的" 之间隔了一次改写，不给看就没法归因废片。
   两份都是长内容，所以是并列 tab 而不是折叠——挤在一栏里谁也读不下去。 */
export function VideoGenTaskDetail({ task, onBack, onReEdit, onRegenerate, onFanout }) {
  const [active, setActive] = useState(0);
  const [tab, setTab] = useState('input');           // input=你的输入 | script=本条提示词
  const [srcCopied, setSrcCopied] = useState(false);
  const [toast, setToast] = useState(null);
  const [failOpen, setFailOpen] = useState(false);   // 失败原因弹窗（红条点开才出，不自动弹）
  const [fanoutOpen, setFanoutOpen] = useState(false);
  const [railEdge, setRailEdge] = useState({ l: false, r: false });  // 轨道两端还有没有内容（决定边缘渐隐）
  const srcTimer = useRef(null);
  const toastTimer = useRef(null);
  const colRef = useRef(null);
  const stageRef = useRef(null);
  const railRef = useRef(null);

  useEffect(() => () => { clearTimeout(toastTimer.current); clearTimeout(srcTimer.current); }, []);

  // 弹窗开着时同步宿主遮罩，嵌入态下才有「全视口居中」的观感
  useEffect(() => {
    if (!failOpen) return;
    notifyHostModal(true);
    const onKey = (e) => { if (e.key === 'Escape') setFailOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); notifyHostModal(false); };
  }, [failOpen]);

  // variants 只用来决定这批有几条视频，它里面的脚本正文不再露面
  const clips = (task && task.variants && task.variants.length) ? task.variants : [null];
  const images = (task && task.images) || [];

  // 切走的那条如果超出范围（重新生成后条数变化），回到第一条
  useEffect(() => { if (active > clips.length - 1) setActive(0); }, [clips.length, active]);

  /* 换任务＝换一批片子，选中条和 tab 都得归零。
     组件在任务之间是复用的（宿主换 id 不重新挂载），不重置的话会带着上一个任务的
     选中条和「提示词」tab 进新任务——用户点开新任务，看到的是第 3 条的脚本页。 */
  useEffect(() => { setActive(0); setTab('input'); }, [task && task.id]);

  /* 成片位是「按高度定宽」的（9:16，高度吃剩余空间），实宽只有渲染后才知道。
     量出来写进 --vtd-vw，缩略图轨/红条/标题行都用这一个宽度——上下不再一个宽一个窄。
     用 CSS 常数去猜可用高度那条路走不通：红条出不出、轨道有没有滚动都会改高度。 */
  useLayoutEffect(() => {
    const col = colRef.current;
    const stage = stageRef.current;
    if (!col || !stage) return;
    const sync = () => {
      const box = stage.querySelector('.ctd-vbox');
      if (!box) return;
      const w = `${Math.round(box.getBoundingClientRect().width)}px`;
      // 同值不写：改宽会再触发一次观察，写死同值才收敛
      if (col.style.getPropertyValue('--vtd-vw') !== w) col.style.setProperty('--vtd-vw', w);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(stage);
    const box = stage.querySelector('.ctd-vbox');
    if (box) ro.observe(box);
    return () => ro.disconnect();
  }, [clips.length, task && task.status]);

  // 轨道两端渐隐：单行横滚没有滚动条，「右边还有」靠渐隐 + 露出半张缩略图来说
  const syncRailEdge = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const next = { l: el.scrollLeft > 2, r: max > 2 && el.scrollLeft < max - 2 };
    setRailEdge(p => (p.l === next.l && p.r === next.r ? p : next));
  }, []);
  useLayoutEffect(() => {
    const el = railRef.current;
    if (!el) return;
    syncRailEdge();
    const ro = new ResizeObserver(syncRailEdge);
    ro.observe(el);
    return () => ro.disconnect();
  }, [syncRailEdge, clips.length]);

  // 切到的那条要在轨道里看得见（键盘换条、重新生成后条数变化都会走到这）
  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const t = el.children[active];
    if (!t) return;
    const left = t.offsetLeft;
    const right = left + t.offsetWidth;
    if (left < el.scrollLeft) el.scrollTo({ left: Math.max(0, left - 8), behavior: 'smooth' });
    else if (right > el.scrollLeft + el.clientWidth) el.scrollTo({ left: right - el.clientWidth + 8, behavior: 'smooth' });
  }, [active]);

  // tablist 的键盘约定：左右方向键换条，Home/End 到头尾（焦点跟着走，不用 Tab 逐个过）
  function onRailKey(e) {
    const n = clips.length;
    const to = e.key === 'ArrowRight' ? (active + 1) % n
      : e.key === 'ArrowLeft' ? (active - 1 + n) % n
        : e.key === 'Home' ? 0
          : e.key === 'End' ? n - 1
            : null;
    if (to === null) return;
    e.preventDefault();
    setActive(to);
    const btn = railRef.current && railRef.current.children[to];
    if (btn) { const hit = btn.querySelector('.vtd-thumb-hit'); if (hit) hit.focus(); }
  }

  if (!task) return null;
  const generating = !['done', 'partial', 'failed'].includes(task.status);
  const multi = clips.length > 1;

  // 逐条状态：一批里可能只挂掉几条，成功那几条照常能看能下
  const isFailed = (i) => !generating && !!(clips[i] && clips[i].status === 'failed');
  const failOf = (i) => (clips[i] && clips[i].fail) || FALLBACK_FAIL;
  const failedIdx = clips.map((_, i) => i).filter(isFailed);
  const okCount = clips.length - failedIdx.length;
  const allFailed = failedIdx.length === clips.length && failedIdx.length > 0;

  /* 本条脚本。提交那一刻就配好了，不等出片——所以生成中、甚至挂掉的那条也照看不误，
     「当初到底发出去的是什么」正是废片归因要的第一手东西。 */
  const scriptHtml = (clips[active] && clips[active].promptHtml) || '';
  // Magic=off 的那批 N 条逐字相同，tab 名就不带条号：标着「视频 3」却跟视频 1 一字不差是骗人
  const sameScript = multi && clips.every(v => v && clips[0] && v.promptHtml === clips[0].promptHtml);
  const scriptTab = (!multi || sameScript) ? '本批提示词' : `视频 ${active + 1} 的提示词`;

  /* 裂变基准读不读得出来。
     dims 是这一条各维度的取值，「其余逐字沿用」全靠它。两种情况读不出：
       · magic=off／历史任务 —— N 条共用同一份 dims（或压根没存），
         那这一条跟别条的差异只存在于成片像素里，说「以视频 3 为底」是空话
       · 老任务 —— 这版之前提交的，字段根本不存在
     读不出时不置灰、也不硬着头皮拿共享 dims 去变（那是骗人），而是先过一遍视频理解，
     把成片反解成维度取值再当基准。needsRead 就是这个岔路口。 */
  const ownDims = (clips[active] && clips[active].dims) || null;
  const needsRead = !(ownDims && ownDims.length) || sameScript;
  const fanoutBlocked = generating || isFailed(active);

  const copyBtn = (tab === 'script' ? scriptHtml : task.sourceText) ? (
    /* 复制当前 tab 上这一份：输入贴回输入框接着用，脚本拿去核对模型侧 */
    <span className="vtd-tab-copy">
      <button
        className={`ctd-copy ${srcCopied ? 'ctd-copy--ok' : ''}`}
        onClick={copySource} title={tab === 'script' ? '复制这条提示词' : '复制你的输入'}
        aria-label={tab === 'script' ? '复制这条提示词' : '复制你的输入'}
      >
        {srcCopied ? <Check size={14} /> : <Copy size={14} />}
      </button>
      {srcCopied && <span className="ctd-copied-hint">已复制</span>}
    </span>
  ) : null;

  /* 生成参数：没值的字段直接不出现，不摆一排「未设置」占地方。
     平时只把最好认的两项摊在一行上，其余悬停「详细信息」再看，不占版面。 */
  const params = [
    ['任务 ID', task.id],
    ['工具名称', task.toolName],
    ['视频模型', task.model],
    ['视频时长', task.outDuration],
    ['画面比例', task.aspect],
    // 参考图在下面有缩略图可看，视频/音频只报个数（模型不同能挂的种类也不同）
    ['参考视频', (task.refVideos || []).length ? `${task.refVideos.length} 个` : ''],
    ['参考音频', (task.refAudios || []).length ? `${task.refAudios.length} 个` : ''],
    ['生成数量', clips.length ? (failedIdx.length ? `${clips.length} 条（${okCount} 成功 · ${failedIdx.length} 失败）` : `${clips.length} 条`) : ''],
    ['Magic Prompt', { auto: '自动', on: '开', off: '关' }[task.magic]],
    ['创建时间', task.createdAt],
    // 「关联产品」宿主对工具箱任务写死是 '—'，子应用收不到真值，按「没传的不显示」略过
    ['耗时', task.status === 'done' ? task.duration : ''],
  ].filter(([, v]) => v);
  const inlineMeta = [task.model, task.outDuration].filter(Boolean);

  function showToast(msg) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }

  function download(url, name) {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.mp4`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  function downloadAll() {
    // 失败的那几条没有文件，别混进批量下载里
    const ok = clips.map((_, i) => i).filter(i => !isFailed(i));
    ok.forEach((i, n) => setTimeout(() => download(task.cloneUrl, `${task.name}-视频${i + 1}`), n * 260));
    showToast(`已开始下载 ${ok.length} 条成片`);
  }

  // 重新生成＝拿这一条提交【新任务】，原任务与本页零变化（与克隆详情同一语义）
  function regenOne(i) {
    onRegenerate(i);
    showToast(multi ? `已用视频 ${i + 1} 的设定提交新任务` : '重新生成任务已提交至任务中心');
  }
  // 一键重试：失败的几条一次性提交成一条新任务，成功的不动
  function retryFailed() {
    if (!failedIdx.length) return;
    onRegenerate(failedIdx);
    setFailOpen(false);
    showToast(`已提交新任务重新生成 ${failedIdx.length} 条失败视频`);
  }

  // 裂变＝以当前这条为基准提交【新任务】，原任务与本页零变化（与重新生成同一语义）
  function doFanout(payload) {
    setFanoutOpen(false);
    onFanout(payload);
    showToast(`已按你的方向提交裂变任务（${payload.count} 条）`);
  }

  function copySource() {
    // 复制的是当前 tab 上摆着的那份：脚本带高亮标记，剥成纯文本再进剪贴板
    const text = tab === 'script'
      ? String(scriptHtml || '').replace(/<\/p>/g, '\n').replace(/<[^>]+>/g, '').trim()
      : (task.sourceText || '');
    const done = () => {
      setSrcCopied(true);
      clearTimeout(srcTimer.current);
      srcTimer.current = setTimeout(() => setSrcCopied(false), 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(done);
    } else done();
  }

  return (
    <div className="clone-page">
      <div className="clone-main">
        <div className="clone-topbar">
          <div className="clone-topbar-left">
            <button className="icon-btn" onClick={onBack} title="返回任务中心"><ArrowLeft size={18} /></button>
            <span className="clone-topbar-title">{task.name}</span>
            {generating
              ? <span className="ctd-status ctd-status--gen"><Loader2 size={11} className="spinner" /> 生成中</span>
              : allFailed
                ? <span className="ctd-status ctd-status--fail"><AlertTriangle size={11} /> 生成失败</span>
                : failedIdx.length
                  ? <span className="ctd-status ctd-status--part"><AlertTriangle size={11} /> 部分完成</span>
                  : <span className="ctd-status ctd-status--done"><Check size={11} /> 已完成</span>}
          </div>
        </div>

        <div className="ctd-body">
          <section className="ctd-videos" ref={colRef}>
            {/* 视频选择器：序号是这批的真实顺序，不是装饰 */}
            {multi && (
              <>
                <div className="vtd-picker-head">
                  <span className="vtd-picker-title">{clips.length} 条成片</span>
                  {/* 失败提示并进这一行，不另起一条红带——成片位是按高度定宽的（9:16），
                      上面每多占 16px 高度，成片就窄 9px，「有失败」和「没失败」两版的栏宽就对不上。
                      并进来＝零额外高度，两态宽度严格一致。
                      点它开原因弹窗；批量重试是弹窗里的主按钮，不在这儿重复第二个入口。 */}
                  {failedIdx.length > 0 && (
                    <button
                      className="vtd-fail-chip" onClick={() => setFailOpen(true)}
                      title={`${allFailed ? '全部' : failedIdx.length + ' 条'}生成失败，点击查看原因并重试`}
                    >
                      <AlertTriangle size={12} strokeWidth={2} />
                      {allFailed ? '全部失败' : `${failedIdx.length} 条失败`}
                    </button>
                  )}
                  <button className="vtd-batch" disabled={generating || okCount === 0} onClick={downloadAll}>
                    <Download size={13} strokeWidth={1.6} /> 下载全部
                  </button>
                </div>
                <div
                  className={`vtd-picker ${railEdge.l ? 'can-l' : ''} ${railEdge.r ? 'can-r' : ''}`}
                  role="tablist" aria-label="选择视频" aria-orientation="horizontal"
                  ref={railRef} onScroll={syncRailEdge} onKeyDown={onRailKey}
                >
                  {clips.map((v, i) => {
                    const failed = isFailed(i);
                    return (
                      <div key={i} className={`vtd-thumb ${i === active ? 'active' : ''} ${failed ? 'failed' : ''}`}>
                        <button
                          type="button" role="tab" aria-selected={i === active} tabIndex={i === active ? 0 : -1}
                          className="vtd-thumb-hit" onClick={() => setActive(i)}
                          title={failed ? `视频 ${i + 1} 生成失败` : `查看视频 ${i + 1}`}
                        >
                          <span className="vtd-thumb-pic">
                            {generating
                              ? <Loader2 size={16} className="spinner" />
                              : failed
                                ? <AlertTriangle size={15} strokeWidth={1.9} />
                                : <video src={task.cloneUrl} preload="metadata" muted playsInline
                                    onLoadedData={e => { try { e.currentTarget.currentTime = 0.1 + i * 0.6; } catch {} }} />}
                          </span>
                          <span className="vtd-thumb-no">视频 {i + 1}</span>
                          {!generating && (
                            <span className={`vtd-thumb-flag ${failed ? 'bad' : 'ok'}`}>
                              {failed ? '✕' : <Check size={9} strokeWidth={3} />}
                            </span>
                          )}
                        </button>
                        {/* 悬停即可直接对这一条动手，不用先切过去。
                            重新生成只对失败条出现——出好的片再无脑跑一遍没有意义，
                            要变就该说清楚变哪儿（那是「裂变」），不说方向的重来只在挂掉时才是解法。 */}
                        {!generating && (
                          <span className="vtd-thumb-acts">
                            {failed ? (
                              <button title={`重新生成视频 ${i + 1}`} aria-label={`重新生成视频 ${i + 1}`}
                                onClick={() => regenOne(i)}>
                                <RefreshCw size={12} strokeWidth={1.8} />
                              </button>
                            ) : (
                              <button title={`下载视频 ${i + 1}`} aria-label={`下载视频 ${i + 1}`}
                                onClick={() => download(task.cloneUrl, `${task.name}-视频${i + 1}`)}>
                                <Download size={12} strokeWidth={1.8} />
                              </button>
                            )}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <div className="vtd-stage" ref={stageRef}>
              {/* 当前是第几条／共几条：轨道只露三四张，成片位上得有个落脚的标识，
                  下面两个按钮说「这一条」时也才有指向 */}
              {multi && !generating && !isFailed(active) && (
                <span className="vtd-stage-tag">视频 {active + 1} / {clips.length}</span>
              )}
              {generating ? (
                <div className="ctd-vbox ctd-vbox--slot">
                  <Loader2 size={20} className="spinner" />
                  <span>生成中，成片就绪后在此预览</span>
                </div>
              ) : isFailed(active) ? (
                /* 失败这条不该放个黑框假装是视频：直接在成片位上说清楚挂了什么、下一步点哪 */
                <div className="ctd-vbox ctd-vbox--fail">
                  <AlertTriangle size={22} strokeWidth={1.8} />
                  <strong className="vtd-stage-fail-title">视频 {active + 1} 生成失败</strong>
                  <span className="vtd-stage-fail-why">{failOf(active).reason}</span>
                  <span className="vtd-fail-code">错误码 {failOf(active).code}</span>
                  <span className="vtd-stage-fail-acts">
                    <button className="btn-outline" onClick={() => setFailOpen(true)}>查看原因</button>
                    <button className="btn-primary" onClick={() => regenOne(active)}>
                      <RefreshCw size={13} /> 重新生成这条
                    </button>
                  </span>
                </div>
              ) : (
                <Vid key={active} src={task.cloneUrl} label={`视频 ${active + 1} 成片预览`} />
              )}
            </div>

            {/* 操作紧跟作用对象：前两个作用于当前这条；重新编辑作用于整批——
                改的是这批共同的「你的输入」，所以回到输入那一步。
                标签不带条数：这一行的宽度就是成片位的宽度（宽了就会把整列撑开、
                上面的缩略图轨跟着比视频宽出一截），指哪一条由成片位上的角标说。

                主按钮给「裂变」不给「重新编辑」：出了一条能看的片之后，最该做的是
                拿它当底继续试，重新编辑是推倒重来的退路。原先占这个位的「重新生成」
                整个撤掉了——不说方向地再跑一遍只在失败时才是解法，那两个入口在失败态里。 */}
            <div className="ctd-actions">
              <button className="btn-outline" disabled={generating || isFailed(active)}
                title={isFailed(active) ? '这条没有生成出成片' : multi ? `下载视频 ${active + 1}` : '下载成片'}
                onClick={() => download(task.cloneUrl, `${task.name}-视频${active + 1}`)}>
                <Download size={14} /> 下载
              </button>
              <button className="btn-outline" onClick={onReEdit} title="回到第一步修改你的输入，重新生成一批">
                <Pencil size={14} /> 重新编辑
              </button>
              <button className="btn-primary" disabled={fanoutBlocked} onClick={() => setFanoutOpen(true)}
                title={generating ? '出片后才能裂变'
                  : isFailed(active) ? '这条没出片，不能当基准'
                    : needsRead ? `先分析视频 ${active + 1} 的画面，再以它为底裂变`
                      : `以视频 ${active + 1} 为底，换个方向再跑几条`}>
                <GitBranch size={14} /> 裂变
              </button>
            </div>
          </section>

          {/* 右栏＝这批视频的来源，两个 tab：你写的 brief / Magic Prompt 把它裂变成的这一条脚本。
              中间隔着一次机器改写，两份都得能看，废片才归因得了。
              复制按钮跟在【激活的那个 tab】后面而不是钉在栏右端：右栏宽 800+，
              钉右端时它离 tab 一个屏宽，看不出复制的是哪一份。 */}
          <section className="ctd-prompt">
            <div className="ctd-prompt-head">
              <div className="vtd-tabs" role="tablist" aria-label="输入与提示词">
                <button type="button" role="tab" aria-selected={tab === 'input'}
                  className={`vtd-tab ${tab === 'input' ? 'on' : ''}`} onClick={() => setTab('input')}>
                  你的输入
                </button>
                {tab === 'input' && copyBtn}
                <button type="button" role="tab" aria-selected={tab === 'script'}
                  className={`vtd-tab ${tab === 'script' ? 'on' : ''}`} onClick={() => setTab('script')}
                  disabled={!scriptHtml} title={scriptHtml ? '' : '这条任务没有脚本记录'}>
                  {scriptTab}
                </button>
                {tab === 'script' && copyBtn}
              </div>
            </div>

            {tab === 'input' ? (
              <>
                {/* 这批是从别的任务裂变出来的：来路写在最前面，否则「我当初写的」跟成片对不上号 */}
                {task.fanoutFrom && (
                  <div className="vtd-from">
                    <GitBranch size={12} strokeWidth={1.8} />
                    裂变自 <b>视频 {task.fanoutFrom.baseIndex + 1}</b>
                    <span className="vtd-from-dims">只变 {task.fanoutFrom.dimLabels.join(' / ')}</span>
                    {task.fanoutFrom.steer && <em className="vtd-from-steer">「{task.fanoutFrom.steer}」</em>}
                    {/* 基准是模型看片反解的，不是用户写的——来源不说清楚就成了无主的事实 */}
                    {task.fanoutFrom.readBase && (
                      <span className="vtd-from-read" title="那批没开 Magic Prompt（或是历史任务），N 条提示词相同，基准由画面分析反解">
                        <Eye size={11} strokeWidth={1.9} /> 基准来自画面分析
                      </span>
                    )}
                  </div>
                )}

                {/* 参考图排在文字上面，而且放在滚动区之外——文字一长，图不会被顶走也不会被滚没 */}
                {images.length > 0 && (
                  <div className="vtd-input-assets">
                    <div className="vtd-input-assets-head">
                      <FileText size={13} strokeWidth={1.6} />
                      参考图
                      <span className="vtd-source-len">{images.length} 张</span>
                    </div>
                    <div className="vtd-source-imgs">
                      {images.map((u, i) => (
                        <a key={i} className="vtd-source-img" href={u} target="_blank" rel="noreferrer" title={`查看参考图 ${i + 1}`}>
                          <img src={u} alt={`参考图 ${i + 1}`} />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="ctd-prompt-body vtd-input-body">
                  {task.sourceText
                    ? <pre className="vtd-input-text">{task.sourceText}</pre>
                    : <span className="vtd-input-empty">这条任务没有文字输入</span>}
                </div>
              </>
            ) : (
              <>
                {/* 图例：满页文字里哪些是你写死的、哪些是机器补的，不说明白就是一坨 */}
                <div className="vtd-legend">
                  <span><i className="vtd-legend-lock" />你写死的，逐字不动</span>
                  <span><i className="vtd-legend-var" />系统补全</span>
                  {task.fanoutFrom && <span><i className="vtd-legend-fan" />本次在变</span>}
                </div>
                <div className="ctd-prompt-body vtd-script-body"
                  dangerouslySetInnerHTML={{ __html: scriptHtml }} />
              </>
            )}

            {/* 这一行在滚动正文【外面】：放里面浮层会被 overflow:auto 裁掉，
                钉在底部也省得看长提示词时还要滚到底才找得到 */}
            {params.length > 0 && (
              <div className="vtd-meta">
                {inlineMeta.length > 0 && (
                  <span className="vtd-meta-inline">{inlineMeta.join(' · ')}</span>
                )}
                <span className="vtd-meta-more" tabIndex={0}>
                  详细信息 <Info size={13} strokeWidth={1.7} />
                  <span className="vtd-meta-pop" role="tooltip">
                    {params.map(([label, value]) => (
                      <span className="vtd-meta-row" key={label}>
                        <span className="vtd-meta-k">{label}</span>
                        <span className="vtd-meta-v">{value}</span>
                      </span>
                    ))}
                  </span>
                </span>
              </div>
            )}
          </section>
        </div>
      </div>

      {toast && <div className="ctd-toast"><Check size={14} /> {toast}</div>}

      {fanoutOpen && (
        <FanoutDialog
          task={task} baseIndex={active} needsRead={needsRead}
          onClose={() => setFanoutOpen(false)} onSubmit={doFanout}
        />
      )}

      {/* 失败原因弹窗：面板规范对齐「检测到未完成的操作」；主按钮＝一键重试失败的那几条 */}
      {failOpen && (
        <div className="resume-overlay" onClick={() => setFailOpen(false)}>
          <div className="vtd-fail-dialog" role="dialog" aria-modal="true" aria-label="生成失败原因"
            onClick={e => e.stopPropagation()}>
            <h3 className="resume-title">生成失败原因</h3>
            <p className="resume-desc">
              这批共 {clips.length} 条，{failedIdx.length} 条失败{okCount > 0 ? `，${okCount} 条已正常出片` : ''}。失败的条目不计入额度消耗。
            </p>
            <div className="vtd-fail-list">
              {failedIdx.map(i => (
                <div className="vtd-fail-item" key={i}>
                  <span className="vtd-fail-no">视频 {i + 1}</span>
                  <span className="vtd-fail-main">
                    <span className="vtd-fail-reason">{failOf(i).reason}</span>
                    <span className="vtd-fail-fix">建议：{failOf(i).fix}</span>
                  </span>
                  <span className="vtd-fail-code">{failOf(i).code}</span>
                </div>
              ))}
            </div>
            <div className="resume-actions">
              <button className="btn-outline" onClick={() => setFailOpen(false)}>关闭</button>
              <button className="btn-primary" autoFocus onClick={retryFailed}>
                <RefreshCw size={14} /> 重新生成失败视频（{failedIdx.length} 条）
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
