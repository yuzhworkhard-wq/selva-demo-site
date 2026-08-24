import React, { useState, useEffect, useRef } from 'react';
import {
  X, Upload, ChevronRight, ChevronDown, ChevronUp,
  Loader2, Check, RefreshCw, Lock, SkipForward,
  User, Palette, Smartphone, Edit3,
  ToggleLeft, ToggleRight, Play, ExternalLink,
  MapPin, Package, Type, Globe2,
  ImagePlus, Sparkles, Clock, Camera, MessageSquare,
  Eye, Pencil, CheckCircle2, Circle, ArrowLeft,
  Dices, Send, AlertTriangle, Pause, Unlock, Languages, Film, RotateCcw,
  LayoutGrid, Clapperboard, Copy, Settings, Video, Trash2,
} from 'lucide-react';
import { notifyHostModal } from './hostModal';

const STEPS = [
  { key: 'upload', label: '上传参考视频' },
  { key: 'crop', label: '裁剪视频' },
  { key: 'storyboard', label: '分镜编辑' },
];

/* ── 左侧导航菜单（为未来的全局侧边菜单预留的占位）── */
function CloneSidebar({ onHome }) {
  const nav = [
    { icon: LayoutGrid, label: '工具箱', onClick: onHome },
    { icon: Clapperboard, label: '视频生成' },
    { icon: Copy, label: '视频克隆', active: true },
    { icon: Film, label: '任务中心' },
  ];
  return (
    <aside className="clone-sidebar">
      <button className="clone-sidebar-logo" onClick={onHome} title="返回工具箱">
        <span className="logo-mark">S</span>
        <span className="logo-text">SELVA</span>
      </button>
      <nav className="clone-sidebar-nav">
        {nav.map(n => (
          <button key={n.label}
            className={`clone-nav-item ${n.active ? 'active' : ''}`}
            onClick={n.onClick}>
            <n.icon size={17} strokeWidth={1.6} />
            <span>{n.label}</span>
          </button>
        ))}
      </nav>
      <div className="clone-sidebar-foot">
        <button className="clone-nav-item">
          <Settings size={17} strokeWidth={1.6} />
          <span>设置</span>
        </button>
      </div>
    </aside>
  );
}

export function CloneModal({
  onClose, onRestart, visible = true, embedded = false,
  onSubmitTask = null,                                  // 嵌入模式：提交生成时上报任务（进任务中心）
  initialStep = 0, initialVideoUrl = null,              // 「重新编辑」：从任务详情直达第三步
  initialPromptHtml = null, initialTaskId = null,
}) {
  const [step, setStep] = useState(initialStep);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [targetRegion, setTargetRegion] = useState('巴西 (pt-BR)');
  const [videoFile, setVideoFile] = useState(initialVideoUrl ? { name: '已保存的基准视频' } : null); // 库入口 / 重新编辑：有预填视频就当上传完成
  const [videoUrl, setVideoUrl] = useState(initialVideoUrl);   // 对应对象 URL，供裁剪步骤播放

  // 中断退出/切换：有进度则保留会话（App 只隐藏不卸载），下次进入弹「是否继续」；流程完成则清会话
  const hasProgress = step > 0 || analyzing || !!videoFile;
  const exit = () => onClose(hasProgress);
  const finish = (task) => {
    if (task && onSubmitTask) {
      urlHandedOffRef.current = true;   // 视频 URL 移交给任务持有，本组件不再负责释放
      onSubmitTask({ ...task, taskId: initialTaskId });
    }
    onClose(false);
  };
  const [resumeAsk, setResumeAsk] = useState(false);
  const rootRef = useRef(null);
  const prevVisibleRef = useRef(visible);
  useEffect(() => {
    if (!visible) {
      rootRef.current?.querySelectorAll('video').forEach(v => v.pause());
    } else if (!prevVisibleRef.current && hasProgress) {
      setResumeAsk(true);   // 带着未完成进度被重新打开才询问
    }
    prevVisibleRef.current = visible;
  }, [visible]);
  useEffect(() => {
    if (!resumeAsk) return;
    notifyHostModal(true);   // 宿主同步遮罩（全局弹窗观感）
    const onKey = (e) => { if (e.key === 'Escape') setResumeAsk(false); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); notifyHostModal(false); };
  }, [resumeAsk]);
  // 「重新开始」重挂载时释放旧视频的对象 URL——但已移交给任务的、或重新编辑传入的（任务持有）不释放
  const videoUrlRef = useRef(null);
  const urlHandedOffRef = useRef(false);
  videoUrlRef.current = videoUrl;
  useEffect(() => () => {
    const url = videoUrlRef.current;
    if (url && url !== initialVideoUrl && !urlHandedOffRef.current) URL.revokeObjectURL(url);
  }, []);

  const startAnalyze = () => {
    setAnalyzing(true);
    setAnalyzeProgress(0);
    const stages = [
      { p: 15, delay: 400 }, { p: 35, delay: 600 }, { p: 55, delay: 500 },
      { p: 75, delay: 700 }, { p: 90, delay: 400 }, { p: 100, delay: 300 },
    ];
    let total = 0;
    stages.forEach(({ p, delay }) => {
      total += delay;
      setTimeout(() => setAnalyzeProgress(p), total);
    });
    setTimeout(() => { setAnalyzing(false); setStep(2); }, total + 400);   // 裁剪确认→拆解→分镜编辑
  };

  return (
    <div className="clone-page" ref={rootRef} style={visible ? undefined : { display: 'none' }}>
      {/* 嵌入平台时不带自己的侧边栏（宿主已有 SELVA 侧栏，iframe 只占内容区） */}
      {!embedded && <CloneSidebar onHome={exit} />}
      <div className="clone-main">
        <div className="clone-topbar">
          <div className="clone-topbar-left">
            <button className="icon-btn" onClick={exit} title="返回"><ArrowLeft size={18} /></button>
            <span className="clone-topbar-title">视频克隆</span>
          </div>
          <button className="icon-btn" onClick={exit} title="关闭"><X size={18} /></button>
        </div>

        <StepIndicator steps={STEPS} current={step} />

        <div className="clone-page-body">
          <div className="clone-page-inner">
            {analyzing ? (
              <div className="step-content analyze-overlay">
                <div className="analyze-box">
                  <Loader2 size={28} className="spinner" />
                  <h3>正在拆解视频...</h3>
                  <div className="progress-bar-wrap">
                    <div className="progress-bar" style={{ width: `${analyzeProgress}%` }} />
                  </div>
                  <p className="analyze-stage">
                    {analyzeProgress < 20 ? '提取视频帧...' :
                     analyzeProgress < 50 ? '分析镜头切点...' :
                     analyzeProgress < 80 ? '识别角色与场景...' :
                     analyzeProgress < 100 ? '生成分镜脚本...' : '拆解完成'}
                  </p>
                </div>
              </div>
            ) : (
              <>
                {step === 0 && <StepUpload onNext={() => setStep(1)} videoFile={videoFile} onVideoFile={setVideoFile} videoUrl={videoUrl} onVideoUrl={setVideoUrl} protectedUrl={initialVideoUrl} />}
                {step === 1 && <StepCrop videoUrl={videoUrl} onNext={startAnalyze} onBack={() => setStep(0)} />}
                {step === 2 && <StepStoryboard onNext={finish} onBack={() => setStep(1)} onReupload={() => setStep(0)} targetRegion={targetRegion} videoUrl={videoUrl} initialPromptHtml={initialPromptHtml} />}
              </>
            )}
          </div>
        </div>
      </div>

      {/* 恢复提示：中断退出/切换后再次进入，询问接着上次的步骤还是重新开始 */}
      {resumeAsk && (
        <div className="resume-overlay" onClick={() => setResumeAsk(false)}>
          <div className="resume-dialog" role="alertdialog" aria-modal="true"
            aria-label="检测到未完成的操作" onClick={e => e.stopPropagation()}>
            <h3 className="resume-title">检测到未完成的操作</h3>
            <p className="resume-desc">您上次进行到了「{STEPS[step].label}」步骤，是否继续？</p>
            <div className="resume-actions">
              <button className="btn-outline" onClick={() => { setResumeAsk(false); onRestart(); }}>重新开始</button>
              <button className="btn-primary" autoFocus onClick={() => setResumeAsk(false)}>继续操作</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function StepIndicator({ steps, current }) {
  return (
    <div className="step-indicator">
      {steps.map((s, i) => (
        <React.Fragment key={s.key}>
          <div className={`step-dot ${i < current ? 'done' : ''} ${i === current ? 'active' : ''}`}>
            {i < current ? <Check size={12} /> : <span>{i + 1}</span>}
          </div>
          <span className={`step-label ${i === current ? 'active' : ''}`}>{s.label}</span>
          {i < steps.length - 1 && <div className={`step-line ${i < current ? 'done' : ''}`} />}
        </React.Fragment>
      ))}
    </div>
  );
}

/* ── 全局下拉：自定义可展开菜单（选中项高亮），替代原生 select ── */
function Dropdown({ value, options, onChange, placeholder = '请选择' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);
  return (
    <div className={`dd ${open ? 'dd--open' : ''}`} ref={ref}>
      <button type="button" className="dd-trigger" onClick={() => setOpen(o => !o)}>
        <span className={value ? '' : 'dd-placeholder'}>{value || placeholder}</span>
        <ChevronDown size={14} className="dd-chevron" />
      </button>
      {open && (
        <div className="dd-menu">
          {options.map(o => (
            <button type="button" key={o}
              className={`dd-opt ${o === value ? 'dd-opt--sel' : ''}`}
              onClick={() => { onChange(o); setOpen(false); }}>
              <span>{o}</span>
              {o === value && <Check size={13} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Step: 裁剪视频（时间轴取一段） ── */
function StepCrop({ videoUrl, onNext, onBack }) {
  const TOTAL = 15;  // demo 总时长（秒）
  const [range, setRange] = useState({ start: 0, end: 13 });
  const [cur, setCur] = useState(0);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef(null);
  const trackRef = useRef(null);

  const frames = Array.from({ length: 9 }, (_, i) => `frames/frame_0${i + 1}.jpg`);
  const strip = [...frames, ...frames, ...frames];  // 铺满时间轴的缩略帧

  const fmt = (s) => `0:${String(Math.max(0, Math.round(s))).padStart(2, '0')}`;

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play().catch(() => {}); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  };

  const dragHandle = (which) => (e) => {
    e.preventDefault();
    const move = (ev) => {
      const rect = trackRef.current.getBoundingClientRect();
      const t = Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width)) * TOTAL;
      setRange(r => which === 'start'
        ? { ...r, start: Math.min(t, r.end - 1) }
        : { ...r, end: Math.max(t, r.start + 1) });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const reset = () => setRange({ start: 0, end: TOTAL });
  const leftPct = (range.start / TOTAL) * 100;
  const widthPct = ((range.end - range.start) / TOTAL) * 100;

  return (
    <div className="step-content crop-step">
      <div className="crop-panel">
        <div className="crop-stage">
          <div className="crop-video">
          {videoUrl
            ? <video ref={videoRef} src={videoUrl} className="crop-video-el" playsInline
                onTimeUpdate={e => setCur(e.target.currentTime)} onEnded={() => setPlaying(false)} />
            : <img src="frames/frame_04.jpg" alt="" className="crop-video-el" />}
          <div className="crop-caption">Kumpulkan jumlah hadiah untuk menyelesaikan tugas</div>
        </div>

        <div className="crop-transport">
          <button className="crop-reset" onClick={reset} title="重置选取"><RotateCcw size={16} /></button>
          <button className="crop-play" onClick={togglePlay}>{playing ? <Pause size={18} /> : <Play size={18} />}</button>
          <span className="crop-timer">{fmt(cur)} / {TOTAL}s</span>
        </div>

        <div className="crop-select">
          <span className="crop-select-label">选取</span>
          <span className="crop-select-t">{fmt(range.start)}</span>
          <span className="crop-select-dash">—</span>
          <span className="crop-select-t">{fmt(range.end)}</span>
          <span className="crop-select-total">共 {fmt(TOTAL)}</span>
        </div>
      </div>

      <div className="crop-timeline">
        <div className="crop-ruler">
          {Array.from({ length: 6 }, (_, i) => <span key={i}>{fmt(i * 3)}</span>)}
        </div>
        <div className="crop-track" ref={trackRef} onDoubleClick={reset}>
          <div className="crop-strip">
            {strip.map((f, i) => <img key={i} src={f} alt="" draggable={false} />)}
          </div>
          <div className="crop-range" style={{ left: `${leftPct}%`, width: `${widthPct}%` }}>
            <div className="crop-handle crop-handle--l" onPointerDown={dragHandle('start')}>
              <span className="crop-grip" />
            </div>
            <div className="crop-handle crop-handle--r" onPointerDown={dragHandle('end')}>
              <span className="crop-handle-time">{fmt(range.end)}</span>
              <span className="crop-grip" />
            </div>
          </div>
        </div>
        </div>
      </div>

      <div className="step-actions">
        <button className="btn-ghost" onClick={onBack}><ArrowLeft size={16} /> 上一步</button>
        <button className="btn-primary" onClick={onNext}><Check size={16} /> 确认裁剪</button>
      </div>
    </div>
  );
}

/* ── Step 1: Upload ── */
export function StepUpload({
  onNext, videoFile, onVideoFile, videoUrl, onVideoUrl, protectedUrl = null,
  title = '克隆爆款，', accent = '放大赢面', description = null, autoAdvance = false,
  afterDone = null,
  showcaseSrc = 'clone-showcase.jpg',
  showcaseAlt = 'AI 克隆效果展示',
  showcaseClass = '',
}) {
  const file = videoFile;        // 视频状态提升到 CloneModal，返回裁剪步骤后仍保留
  const setFile = onVideoFile;
  const setVideoUrl = onVideoUrl;
  const [phase, setPhase] = useState(() => (videoFile ? 'done' : 'empty'));  // empty | uploading | done
  const fileRef = useRef();
  const uploadTimer = useRef(null);

  useEffect(() => () => clearTimeout(uploadTimer.current), []);

  const canProceed = phase === 'done';

  const handleFile = (f) => {
    if (!f) return;
    if (videoUrl && videoUrl !== protectedUrl) URL.revokeObjectURL(videoUrl);   // 重新选择时释放旧视频（任务持有的除外）
    setFile(f);
    setVideoUrl(URL.createObjectURL(f));
    setPhase('uploading');
    clearTimeout(uploadTimer.current);
    uploadTimer.current = setTimeout(() => {
      setPhase('done');
      if (autoAdvance) onNext();
    }, 1500);  // 模拟上传
  };

  const removeFile = () => {
    clearTimeout(uploadTimer.current);
    if (videoUrl && videoUrl !== protectedUrl) URL.revokeObjectURL(videoUrl);
    setFile(null);
    setVideoUrl(null);
    setPhase('empty');
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer?.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };

  // 让 <video> 显示首帧（blob 视频默认黑屏，seek 一下强制出帧）
  const showFirstFrame = (e) => { try { e.currentTarget.currentTime = 0.1; } catch {} };

  // 素材要求提示（原链接解析区去掉后，这里给出「什么样的片子克隆效果好」）
  const tips = [
    { icon: Smartphone, text: '9:16 竖屏效果最佳' },
    { icon: Clock, text: '建议时长 15–60 秒' },
    { icon: Eye, text: '画面清晰 · 无水印' },
  ];

  const showExtra = phase === 'done' && afterDone;

  return (
    <div className={`step-content${showExtra ? ' step-content--with-extra' : ''}`}>
      <div className="upload-hero">
        {/* 左：克隆效果展示图（竖版，四周留边完整展示不裁切）*/}
        <div className="upload-hero-left">
          <img src={showcaseSrc} alt={showcaseAlt} className={`upload-showcase-img${showcaseClass ? ` ${showcaseClass}` : ''}`} />
        </div>

        {/* 右：上传参考视频 / 使用链接 */}
        <div className={`upload-hero-right${showExtra ? ' upload-hero-right--locked' : ''}`}>
          <div className={showExtra ? 'upload-hero-right-fill' : 'upload-hero-right-flow'}>
          <div className="upload-hero-head">
            <h2 className="upload-hero-title">{title}<span className="accent-text">{accent}</span></h2>
            <p className="upload-hero-desc">
              {description || '上传一条想复刻的参考视频，AI 自动拆解镜头、改写台词，生成符合目标地区的多语种广告克隆片'}
            </p>
          </div>

          <input ref={fileRef} type="file" accept="video/*" hidden
            onChange={e => { handleFile(e.target.files[0]); e.target.value = ''; }} />

          {phase === 'empty' && (
            <div
              className="upload-card"
              onDragOver={e => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => fileRef.current?.click()}
            >
              <div className="upload-card-icon"><Video size={22} strokeWidth={1.5} /></div>
              <span className="upload-card-title">上传参考视频</span>
              <span className="upload-card-hint">MP4 / MOV · 500MB 以内</span>
              <div className="upload-card-btns">
                <button type="button" className="btn-primary btn-sm"
                  onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}>
                  <Upload size={13} /> 上传视频
                </button>
              </div>
            </div>
          )}

          {phase === 'uploading' && (
            <div className="upload-panel upload-panel--busy">
              <video className="upload-panel-bg" src={videoUrl} muted playsInline
                preload="auto" onLoadedData={showFirstFrame} />
              <div className="upload-panel-body">
                <Loader2 size={26} className="spinner" />
                <span className="upload-panel-text">上传中...</span>
              </div>
            </div>
          )}

          {phase === 'done' && (
            <div className="upload-panel upload-panel--done" title="点击重新选择视频"
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={handleFileDrop}
            >
              <video className="upload-panel-bg" src={videoUrl} muted playsInline
                preload="auto" onLoadedData={showFirstFrame} />
              <div className="upload-panel-media">
                <video className="upload-panel-video" src={videoUrl} muted playsInline
                  preload="auto" onLoadedData={showFirstFrame} />
                <div className="upload-panel-overlay">
                  <Video size={22} />
                  <span className="upload-selected-pill">已选择</span>
                </div>
              </div>
              <button className="upload-panel-delete" title="移除视频"
                onClick={e => { e.stopPropagation(); removeFile(); }}>
                <Trash2 size={16} />
              </button>
            </div>
          )}

          {showExtra ? <div className="upload-hero-extra">{afterDone}</div> : (
            <div className="upload-tips">
              {tips.map(t => (
                <span key={t.text} className="upload-tip">
                  <t.icon size={13} strokeWidth={1.8} />
                  {t.text}
                </span>
              ))}
            </div>
          )}

          {!autoAdvance && !afterDone && (
            <button className="btn-primary upload-next" disabled={!canProceed} onClick={onNext}>
              下一步 <ChevronRight size={16} />
            </button>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Step 3: Storyboard ── */
function formatMs(ms) {
  const s = Math.floor(ms / 1000);
  const frac = Math.floor((ms % 1000) / 100);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}.${frac}`;
}

function parseLangLabel(region) {
  if (!region) return '本地语言';
  const m = region.match(/\(([^)]+)\)/);
  return m ? m[1] : region.trim();
}

// 目标地区 → 说话语言标签（对齐参考图「语言：印尼语 (Indonesian)」的写法）
const REGION_LANG = { 'pt-BR': '葡萄牙语 (Português)', 'id-ID': '印尼语 (Indonesian)', 'es-MX': '西班牙语 (Español)' };
function regionLangLabel(region) {
  const code = parseLangLabel(region);
  return REGION_LANG[code] || code;
}

// Demo 用的轻量「中文→本地语言(pt-BR)」短语匹配表：覆盖脚本常用词，
// 命中优先长短语，未命中的字保持原样（真实产品此处应接翻译/改写模型）。
const ZH_LOCAL_DICT = [
  ['你知道你可以赚钱吗', 'Você sabia que pode ganhar dinheiro'],
  ['看一集可以获得', 'Assista um episódio e ganhe'],
  ['看两集获得', 'Assista dois episódios e ganhe'],
  ['你看我赚了多少', 'Olha só quanto eu já ganhei'],
  ['现在就下载App', 'Baixe o app agora'],
  ['现在下载App', 'Baixe o app agora'],
  ['今天就开始赚', 'comece a lucrar hoje'],
  ['开始赚钱', 'comece a ganhar'],
  ['直接到账', 'direto na conta'],
  ['直接收到', 'Recebi direto'],
  ['直接拿', 'receba direto'],
  ['快下载', 'Corre, baixe agora'],
  ['快去吧', 'Corre lá'],
  ['你知道', 'Você sabia'],
  ['你可以', 'você pode'],
  ['你看', 'Olha só'],
  ['赚钱', 'ganhar dinheiro'],
  ['赚了', 'ganhei'],
  ['看一集', 'assista um episódio'],
  ['看一章', 'veja um capítulo'],
  ['看两集', 'assista dois episódios'],
  ['看两章', 'veja dois capítulos'],
  ['两集', 'dois episódios'],
  ['每集', 'cada episódio'],
  ['价值', 'vale'],
  ['获得', 'ganhe'],
  ['到账', 'na conta'],
  ['到手', 'na conta'],
  ['收到', 'recebi'],
  ['下载App', 'baixe o app'],
  ['安装App', 'instale o app'],
  ['下载', 'baixe'],
  ['安装', 'instale'],
  ['开始', 'comece'],
  ['现在', 'agora'],
  ['马上', 'na hora'],
  ['直接', 'direto'],
  ['可以', 'pode'],
  ['App', 'o app'],
  ['拿', 'receba'],
  ['赚', 'ganhe'],
  ['快', 'Corre'],
];

function zhToLocal(zh) {
  if (!zh || !zh.trim()) return '';
  let out = zh;
  out = out.replace(/(\d+)\s*雷亚尔/g, 'R$$$1');   // 2雷亚尔 → R$2
  out = out.replace(/雷亚尔/g, ' reais');
  const entries = [...ZH_LOCAL_DICT].sort((a, b) => b[0].length - a[0].length);
  for (const [k, v] of entries) {
    if (out.includes(k)) out = out.split(k).join(' ' + v + ' ');
  }
  out = out
    .replace(/，/g, ', ').replace(/。/g, '. ')
    .replace(/！/g, '!').replace(/？/g, '?')
    .replace(/、/g, ', ').replace(/…/g, '...')
    .replace(/：/g, ': ');
  out = out.replace(/\s+([,.!?:])/g, '$1');
  out = out.replace(/\s+/g, ' ').trim();
  if (out) out = out.charAt(0).toUpperCase() + out.slice(1);
  return out;
}

// 已锁定素材的内嵌小图 chip（对齐参考图里 @图片1 那种）——在 contenteditable 中作为原子块（整体删）
const CLONE_TOKENS = {
  scene: '<span class="sb-tok" contenteditable="false"><img src="frames/frame_01.jpg" alt="">@场景</span>',
  ui: '<span class="sb-tok" contenteditable="false"><img src="frames/frame_04.jpg" alt="">@产品界面</span>',
  keyframe: '<span class="sb-tok" contenteditable="false"><img src="frames/frame_03.jpg" alt="">@关键帧</span>',
};

// 说话者角色表：不用「角色A」，给具象外号；有参考图的 chip 带头像（引用图片），
// 没图的用虚线文字 chip 兜底（按文字描述生成）
const SPEAKER_FALLBACK_ICON = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
const SPEAKERS = {
  mei: { name: '长发小妹', img: 'frames/frame_09.jpg' },
  dashu: { name: '围观大叔', img: null },
};
function speakerTok(key) {
  const sp = SPEAKERS[key];
  if (sp.img) return `<span class="sb-tok sb-tok-speaker" contenteditable="false"><img src="${sp.img}" alt="">@${sp.name}</span>`;
  return `<span class="sb-tok sb-tok-speaker sb-tok-speaker--txt" contenteditable="false">${SPEAKER_FALLBACK_ICON}${sp.name}</span>`;
}

// 把画面描述里的关键词替换成内嵌小图 chip（重复出现是刻意的，跟参考图一致）
function injectCloneTokens(text) {
  return text
    .split(SPEAKERS.mei.name).join(speakerTok('mei'))
    .split(SPEAKERS.dashu.name).join(speakerTok('dashu'))
    .split('ATM').join(CLONE_TOKENS.scene)
    .split('App界面').join(CLONE_TOKENS.ui)
    .split('屏幕').join(CLONE_TOKENS.ui);
}

// 用户上传的替换参考图小图 chip（应用后织入设定段的「关键元素替换」一行）
function refTok(img, label) {
  return `<span class="sb-tok sb-tok-ref" contenteditable="false"><img src="${img.url}" alt="">${label}</span>`;
}

// 分镜关键帧：贴提示词右缘、从上到下一列，锚在各自镜头标题行（float 原子块，随该镜文字走位）
// kfState: slot = 应用前只占位 | generating = 槽内转圈 | done = 生成出的参考图
// done 态 hover 出操作：改完该镜脚本后可「按当前脚本重新生成」或「本地上传替换」
const KF_SLOT_ICON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';
const KF_REGEN_ICON = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>';
const KF_UPLOAD_ICON = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>';
function kfImgHtml(s, i, state) {
  const num = `<span class="sb-kfimg-num">${i + 1}</span>`;
  if (state === 'done') {
    return `<span class="sb-kfimg sb-kfimg--new" contenteditable="false" data-shot="${i}" data-v="0" title="镜头 ${i + 1} 关键帧 · ${s.time}">`
      + `<img src="${s.frameImg}" alt="镜头${i + 1}关键帧">${num}`
      + `<span class="sb-kfimg-acts">`
      + `<button class="sb-kfimg-act" data-act="regen" title="按当前脚本重新生成">${KF_REGEN_ICON}</button>`
      + `<button class="sb-kfimg-act" data-act="upload" title="本地上传替换">${KF_UPLOAD_ICON}</button>`
      + `</span>`
      + `<span class="sb-kfimg-load"><span class="sb-kfimg-spin"></span></span></span>`;
  }
  if (state === 'generating') {
    return `<span class="sb-kfimg sb-kfimg--slot sb-kfimg--gen" contenteditable="false" data-shot="${i}" title="镜头 ${i + 1} 关键帧生成中…">`
      + `${num}<span class="sb-kfimg-spin"></span></span>`;
  }
  return `<span class="sb-kfimg sb-kfimg--slot" contenteditable="false" data-shot="${i}" title="镜头 ${i + 1} · 点「应用并生成参考图」后在此生成">`
    + `${num}${KF_SLOT_ICON}</span>`;
}

// 把拆解出的镜头脚本拼成「可直接看着改」的提示词 HTML（对齐参考图「编辑提示词」大文本框 + @图片 chip）
// refImages / instruction：用户在「关键元素替换」上传并应用后，织入设定与各镜头旁的参考图
function buildClonePromptHtml(shots, region, refImages = [], instruction = '', kfState = 'slot') {
  const head = [
    `一个用于抖音 / TikTok 短视频首屏吸睛的 14 秒高清克隆视频提示词。视频采用第一人称手机拍摄视角（9:16 画幅），街头 ATM 网赚场景，本地化到${region}。全片 100% 复刻源视频的剪辑节奏与逐镜景别，保持真实街边采访拍摄感，画面清晰，节奏紧凑。`,
    '',
    '### 视频整体设定',
    '*   **格式**：9:16 竖屏，手机手持拍摄视角，画面自然轻微晃动，具有真实生活感。',
    `*   **剪辑 / 镜头（冻结）**：共 ${shots.length} 镜 14 秒，切点、每镜时长、分镜顺序与硬切转场 100% 复刻源视频；各镜景别 / 机位见下方分镜脚本，以 ${CLONE_TOKENS.keyframe}（关键帧参考）为基准逐镜一致。`,
    '*   **光线与风格（冻结）**：白天街头自然光，亮度 / 布光与源视频一致，无滤镜、无景深虚化。',
    `*   **场景**：街边 ATM ${CLONE_TOKENS.scene}（已锁定）；背景可微调（ATM 品牌 / 颜色可换），不可室外变室内。`,
    `*   **说话者（已锁定）**：全片共 2 人，换脸符合目标地区人群特征、各自全片锁同一人脸；身份属性不变，服装可换款式但须符合身份，动作与原片整体姿态一致。`,
    `    *   ${speakerTok('mei')}：主讲，全片出镜——二十多岁本地女性，黑长发，白色短袖 T 恤，形象以引用图为准。`,
    `    *   ${speakerTok('dashu')}（无参考图 · 按文字生成）：四十岁上下本地男性路人，短袖衬衫、身形微胖，仅镜头 8 入画帮腔喊话。`,
    `*   **产品 / 界面**：${CLONE_TOKENS.ui}（已锁定），手机屏幕展示短剧 App 界面与到账画面。`,
    '*   **声音**：只有人声与真实环境音（街道底噪、手机按键声、到账提示音），禁止任何配乐 / 背景音乐；两名说话者声线符合各自身份（小妹清亮、大叔粗哑），口型与台词完全同步。',
    `*   **语言 / 字幕**：${region}，金额用当地货币 R$，音频与字幕绝不出现汉语；字幕样式（字体 / 位置 / 描边 / 大小）与源视频一致（冻结）。`,
  ];
  if (refImages.length) {
    const toks = refImages.map((img, i) => refTok(img, `@图${i + 1}`)).join(' ');
    const how = instruction.trim() || '按下方各镜头的画面需要，织入对应分镜替换关键元素。';
    head.push(`*   **关键元素替换**：${toks} —— ${how}`);
  }
  head.push(
    '',
    '---',
    '',
    `### 分镜脚本（共 ${shots.length} 镜 · 14 秒）`,
    '',
  );
  const body = [];
  shots.forEach((s, i) => {
    body.push(kfImgHtml(s, i, kfState) + `**镜头 ${i + 1} (${s.time.replace('-', ' - ')})**`);
    body.push(`*   **镜头 / 景别（冻结）**：${s.angle}；${s.comp}。`);
    body.push(`*   **画面描述**：${injectCloneTokens(s.content)}。`);
    body.push(`*   **角色动作**：${s.action}。`);
    body.push(`*   **说话者**：${speakerTok(s.speaker)}${s.speakerNote ? `（${s.speakerNote}）` : ''} · **语言**：${regionLangLabel(region)}`);
    const lock = s.type === 'frozen' ? '冻结 · 跟原口型' : '改写 · 可本地化';
    body.push(`*   **台词（${lock}）**：${s.line}${s.zh ? `（中文对照：${s.zh}）` : ''}`);
    body.push(`*   **环境音说明**：${s.ambient}。`);
    if (s.emph) body.push(`*   **金额 / 到账（强调）**：${s.emph}。`);
    body.push('');
  });
  return head.concat(body).join('\n');
}

function fmtSec(s) {
  const n = Math.max(0, Math.floor(s || 0));
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
}

// 大文本编辑器：非受控 contenteditable —— 挂载时写入一次 HTML，之后交给浏览器原生编辑，
// React 不参与其子节点 diff（避免受控 contenteditable 的光标/清空问题）。@图片 chip 为原子块。
const PromptEditor = React.memo(function PromptEditor({ html, onCount, onKfAction, editorRef, onScroll }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (el) { el.innerHTML = html; onCount(el.innerText.length); }
  }, [html]);
  // 关键帧 hover 操作按钮是原生 HTML（不走 React），在容器上做事件委托
  const hitAct = (e) => e.target.closest?.('.sb-kfimg-act');
  return (
    <div
      ref={el => { ref.current = el; if (editorRef) editorRef.current = el; }}
      className="sb-prompt"
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      onScroll={onScroll}
      onInput={e => onCount(e.currentTarget.innerText.length)}
      onMouseDown={e => { if (hitAct(e)) e.preventDefault(); }}
      onClick={e => { const btn = hitAct(e); if (btn) { e.preventDefault(); onKfAction?.(btn); } }}
    />
  );
});

function StepStoryboard({ onNext, onBack, onReupload, targetRegion = '巴西 (pt-BR)', videoUrl = null, initialPromptHtml = null }) {
  const langLabel = parseLangLabel(targetRegion);
  const initShots = [
    { id: 1, time: '0:00-0:02', startMs: 0, endMs: 2000, kfMs: 0, angle: '中景 / 正面平角', content: '长发小妹站在街边ATM旁，面对镜头开口说话，身后有自然的街道人流', line: 'Voce sabia que pode ganhar...', zh: '你知道你可以赚钱吗...', type: 'frozen', keyframe: true, refVersion: 1, speaker: 'mei', speakerNote: '出镜口播',
      comp: '主体居中，胸上中景约占画面 2/3', action: '手持自拍面对镜头开场，语气抓人', ambient: '街道底噪（人声 / 车流），人声清晰',
      refDesc: '角色 IP + 街头ATM场景，中景正面', frameImg: 'frames/frame_01.jpg' },
    { id: 2, time: '0:02-0:04', startMs: 2000, endMs: 4000, kfMs: 2000, angle: '中景 / 正面平角', content: '长发小妹保持同一位置继续面对镜头讲述，神态自然', line: 'Olha so, ...', zh: '你看...', type: 'frozen', keyframe: false, refVersion: 0, speaker: 'mei', speakerNote: '出镜口播',
      comp: '与镜头 1 同机位，主体居中', action: '继续讲述并轻微点头示意，姿态与原片一致', ambient: '街道底噪延续',
      refDesc: '角色面对镜头讲述，中景正面', frameImg: 'frames/frame_02.jpg' },
    { id: 3, time: '0:04-0:06', startMs: 4000, endMs: 6000, kfMs: 4000, angle: '特写 / 俯拍15', content: '手机屏幕展示短剧App界面，剧集列表与单集奖励标签清晰可见', line: 'Assista um episodio e ganhe R$2...', zh: '看一集可以获得2雷亚尔...', type: 'rewrite', keyframe: true, refVersion: 1, speaker: 'mei', speakerNote: '画外音 · 仅手部出镜',
      comp: '屏幕充满画面，界面元素完整可读', action: '手指滑动展示短剧剧集列表，操作符合真实物理交互', ambient: '手机滑动 / 点击轻响 + 街道底噪',
      refDesc: '手机屏幕特写，展示短剧App界面', frameImg: 'frames/frame_03.jpg',
      rewrites: ['Assista um episodio e ganhe R$2 na hora!', 'Veja um capitulo e receba R$2 direto!', 'Cada episodio vale R$2 pra voce!'],
      rewritesZh: ['看一集马上赚2雷亚尔!', '看一章直接拿2雷亚尔!', '每集价值2雷亚尔!'] },
    { id: 4, time: '0:06-0:08', startMs: 6000, endMs: 8000, kfMs: 6000, angle: '特写 / 俯拍15', content: '屏幕上金额档位 R$2/4/6/10 依次排开，数字与货币符号醒目', line: '...assista dois e ganhe R$4...', zh: '...看两集获得4雷亚尔...', type: 'rewrite', keyframe: true, money: true, refVersion: 1, speaker: 'mei', speakerNote: '画外音 · 仅手部出镜',
      comp: '屏幕特写，金额档位居中', action: '手指逐个点过 R$2/4/6/10 金额档位', ambient: '手机按键声',
      emph: '金额数字与货币符号 R$ 必须完整清晰可读，金额画面清晰度足够辨认',
      refDesc: '手机屏幕特写，金额 R$2/4/6/10 清晰可读', frameImg: 'frames/frame_04.jpg',
      rewrites: ['...assista dois capitulos e ganhe R$4...', '...dois episodios, R$4 garantido...', '...veja dois e receba R$4 na conta...'],
      rewritesZh: ['...看两章获得4雷亚尔...', '...两集, 4雷亚尔到手...', '...看两集直接到账4雷亚尔...'] },
    { id: 5, time: '0:08-0:09', startMs: 8000, endMs: 9000, kfMs: 8000, angle: '中景 / 正面平角', content: '长发小妹把手机屏幕转向镜头，展示App里的累计收益页', line: 'E olha aqui o quanto ja ganhei...', zh: '你看我赚了多少...', type: 'frozen', keyframe: false, refVersion: 0, speaker: 'mei', speakerNote: '出镜口播',
      comp: '主体居中，手机屏幕为视觉中心', action: '将手机屏幕转向镜头展示', ambient: '街道底噪',
      refDesc: '角色手持手机展示屏幕', frameImg: 'frames/frame_05.jpg' },
    { id: 6, time: '0:09-0:11', startMs: 9000, endMs: 11000, kfMs: 9000, angle: '特写 / 俯拍15', content: '屏幕弹出银行到账通知，R$500 与银行名完整可见', line: 'Recebi R$500 direto na conta!', zh: '直接收到500雷亚尔!', type: 'frozen', keyframe: true, money: true, refVersion: 1, speaker: 'mei', speakerNote: '画外音 · 仅手部出镜',
      comp: '通知弹窗居中特写', action: '点击领取 → 弹出到账短信 → 银行收款通知', ambient: '到账提示音「叮」+ 手机按键声',
      emph: '到账画面含完整元素链：提现页 → 弹窗奖励 → 点击领取 → 到账短信 → 银行收款通知；银行须为目标地区知名银行（如 Nubank / Itau）；说到到账时同步展示到账信息',
      refDesc: '手机特写，银行到账通知 R$500', frameImg: 'frames/frame_06.jpg' },
    { id: 7, time: '0:11-0:13', startMs: 11000, endMs: 13000, kfMs: 11000, angle: '中景 / 正面平角', content: '长发小妹指向手机屏幕向观众喊话，画面带下载引导', line: 'Baixa o app agora e comeca...', zh: '现在就下载App...', type: 'rewrite', keyframe: true, refVersion: 1, speaker: 'mei', speakerNote: '出镜口播',
      comp: '主体居中，指向手机的手势入画', action: '指向手机屏幕做 CTA 手势', ambient: '街道底噪',
      refDesc: '角色指向手机，CTA动作', frameImg: 'frames/frame_07.jpg',
      rewrites: ['Baixa o app agora e comeca a ganhar!', 'Instala o app e comeca a lucrar hoje!', 'Corre, baixa agora e ganha dinheiro!'],
      rewritesZh: ['现在下载App开始赚钱!', '安装App今天就开始赚!', '快下载，马上赚钱!'] },
    { id: 8, time: '0:13-0:14', startMs: 13000, endMs: 14000, kfMs: 13000, angle: '中景 / 正面平角', content: '围观大叔探头入画，冲镜头喊话收尾，动作利落', line: 'Corre la!', zh: '快去吧!', type: 'frozen', keyframe: false, refVersion: 0, speaker: 'dashu', speakerNote: '入画帮腔 · 无参考图，按文字生成',
      comp: '主体居中收尾', action: '探头入画挥手喊话，动作干脆', ambient: '街道底噪渐出',
      refDesc: 'CTA收尾，大叔入画喊话', frameImg: 'frames/frame_08.jpg' },
  ];

  // 关键元素替换：用户自己上传 1–3 张参考图（素材库 / 本地 / AI 生图）+ 一句指令
  const [refImages, setRefImages] = useState([]);   // { id, url }
  const [instr, setInstr] = useState('');
  const [applied, setApplied] = useState(false);
  // 分镜关键帧：始终内嵌在提示词各镜头下；应用参考图后原位重生成一版供对照检查
  const [genState, setGenState] = useState('idle'); // idle | generating | done
  // 上传弹窗：素材库 / 本地上传 / AI 生图 三合一
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadTab, setUploadTab] = useState('library');  // library | local | ai
  const [localImgs, setLocalImgs] = useState([]);   // 本地上传的图：先进预览区（默认勾选），确认后点完成
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiGens, setAiGens] = useState([]);   // 生成结果 {id,url}：生成不限次数，只有「采用」上限 3 张
  const aiToastOnce = useRef(false);
  const [toast, setToast] = useState(null);
  // 素材库：预置素材 + AI 生成后存入的（可变），aiGenSet 记录哪些是 AI 生成用于打标
  const [libraryImgs, setLibraryImgs] = useState(['frames/frame_09.jpg', 'frames/frame_02.jpg', 'frames/frame_06.jpg', 'frames/frame_07.jpg', 'frames/frame_08.jpg', 'frames/frame_03.jpg']);
  const [aiGenSet, setAiGenSet] = useState(() => new Set());
  const refInputRef = useRef();
  const urlsRef = useRef([]);
  const toastRef = useRef();
  // 关键帧 hover 操作：重新生成（DOM 原位换图）/ 本地上传替换
  const kfFileRef = useRef();
  const kfTargetRef = useRef(null);
  const timersRef = useRef([]);
  // 最终确认：按钮原地转圈，提交完任务直接进任务中心（关闭流程）
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => () => {
    urlsRef.current.forEach(URL.revokeObjectURL);
    clearTimeout(toastRef.current);
    timersRef.current.forEach(clearTimeout);
  }, []);
  // 弹窗打开时支持 Esc 关闭；嵌入模式同步宿主遮罩
  useEffect(() => {
    if (!uploadOpen) return;
    notifyHostModal(true);
    const onKey = e => { if (e.key === 'Escape') setUploadOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); notifyHostModal(false); };
  }, [uploadOpen]);

  // 生图素材池（demo）：不限生成次数，超出后从头轮换
  const aiPool = ['frames/frame_04.jpg', 'frames/frame_05.jpg', 'frames/frame_01.jpg', 'frames/frame_09.jpg', 'frames/frame_02.jpg', 'frames/frame_06.jpg', 'frames/frame_07.jpg', 'frames/frame_08.jpg', 'frames/frame_03.jpg'];

  function showToast(msg) {
    setToast(msg);
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 3500);
  }

  // 任何输入变化都让上一版「应用 / 分镜参考图」作废，提示用户重新生成
  function invalidate() { setApplied(false); setGenState('idle'); }

  function addImageFromUrl(url) {
    setRefImages(prev => (prev.length >= 3 || prev.some(x => x.url === url)) ? prev : [...prev, { id: `${Date.now()}-${Math.random()}`, url }]);
    invalidate();
  }
  // 本地上传：先进弹窗预览区（与素材库同款网格），有空位的默认勾选，用户看过确认后再点完成
  function addLocalImages(files) {
    const picked = Array.from(files);   // 同步快照：input.value 清空会清掉 live FileList
    const next = picked.map(f => {
      const url = URL.createObjectURL(f);
      urlsRef.current.push(url);
      return { id: `${Date.now()}-${Math.random()}`, url };
    });
    setLocalImgs(prev => [...prev, ...next]);
    setRefImages(prev => {
      const room = 3 - prev.length;
      return [...prev, ...next.slice(0, room).map(x => ({ id: `ref-${x.id}`, url: x.url }))];
    });
    invalidate();
  }
  function removeRefImage(id) {
    setRefImages(prev => prev.filter(x => x.id !== id));
    invalidate();
  }
  function removeRefByUrl(url) {
    setRefImages(prev => prev.filter(x => x.url !== url));
    invalidate();
  }
  // AI 生图：生成不限次数（结果排在输入框上方，左→右），不采用就只是预览；点选 = 采用（选用为参考图 + 存入素材库，上限 3 张）
  function aiGenerate() {
    if (!aiPrompt.trim() || aiBusy) return;
    setAiBusy(true);
    setTimeout(() => {
      setAiGens(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, url: aiPool[prev.length % aiPool.length] }]);
      setAiBusy(false);
    }, 1300);
  }
  function aiAdopt(url) {
    addImageFromUrl(url);   // 勾选 = 采用为参考图
    setLibraryImgs(prev => prev.includes(url) ? prev : [url, ...prev]);   // 同时存入素材库便于复用
    setAiGenSet(prev => new Set(prev).add(url));
    if (!aiToastOnce.current) { aiToastOnce.current = true; showToast('已采用，并已存入素材库'); }
  }

  // 整段可直接编辑的提示词（挂载时生成 HTML，之后用户看着改；@图片 chip 为原子块）
  // 「重新编辑」从任务详情进来时，恢复上次提交的提示词而非重新生成
  const [promptHtml, setPromptHtml] = useState(() => initialPromptHtml || buildClonePromptHtml(initShots, targetRegion));
  const [charCount, setCharCount] = useState(0);

  // ── 视频 ⇄ 提示词双向联动：镜头时间轴（startMs/endMs）对 .sb-kfimg[data-shot] 锚点 ──
  // 拖进度条/播放 → 提示词滚到当前镜头并高亮；滚动提示词 → 视频 seek 到该镜头首帧。
  // syncSrcRef 记录最近一次驱动方，短窗口内忽略对向回声，防止两边互相抢滚动。
  const videoRef = useRef(null);
  const editorRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [vt, setVt] = useState(0);
  const [vdur, setVdur] = useState(0);
  const curShotRef = useRef(-1);
  const syncSrcRef = useRef({ src: null, until: 0 });
  const SYNC_ECHO_MS = 700;
  // 分镜表按 14s 源片写死；实际视频时长不同（尤其 demo 测试片）时按比例映射，保证 8 镜全程可达
  const shotScaleRef = useRef(1);
  const SHOT_TOTAL_MS = initShots[initShots.length - 1].endMs;

  function shotAt(sec) {
    const ms = (sec * 1000) / shotScaleRef.current;
    for (let i = initShots.length - 1; i >= 0; i--) if (ms >= initShots[i].startMs) return i;
    return 0;
  }
  function highlightShot(i, scroll) {
    const ed = editorRef.current;
    if (!ed) return;
    ed.querySelectorAll('.sb-kfimg--cur').forEach(n => n.classList.remove('sb-kfimg--cur'));
    const a = ed.querySelector(`.sb-kfimg[data-shot="${i}"]`);
    if (!a) return;
    a.classList.add('sb-kfimg--cur');
    if (scroll) {
      syncSrcRef.current = { src: 'video', until: Date.now() + SYNC_ECHO_MS };
      const top = a.getBoundingClientRect().top - ed.getBoundingClientRect().top + ed.scrollTop;
      ed.scrollTo({ top: Math.max(0, top - 14), behavior: 'smooth' });
    }
  }
  function onVideoTime() {
    const v = videoRef.current;
    if (!v) return;
    setVt(v.currentTime);
    const i = shotAt(v.currentTime);
    if (i === curShotRef.current) return;
    curShotRef.current = i;
    const s = syncSrcRef.current;
    highlightShot(i, !(s.src === 'editor' && Date.now() < s.until));
  }
  function onSeek(e) {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Number(e.target.value);
    onVideoTime();
  }
  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      if (v.ended || v.currentTime >= (v.duration || 0) - 0.05) v.currentTime = 0;   // 播完重看从头起
      v.play();
    } else v.pause();
  }
  const onEditorScroll = React.useCallback(() => {
    const s = syncSrcRef.current;
    if (s.src === 'video' && Date.now() < s.until) return;   // 程序滚动的回声
    const ed = editorRef.current, v = videoRef.current;
    if (!ed || !v) return;
    const edTop = ed.getBoundingClientRect().top;
    let idx = 0;   // 视口上沿基准线以上最近的镜头 = 当前镜头
    ed.querySelectorAll('.sb-kfimg[data-shot]').forEach(n => {
      if (n.getBoundingClientRect().top - edTop <= 90) idx = Number(n.dataset.shot);
    });
    if (idx === curShotRef.current) return;
    curShotRef.current = idx;
    syncSrcRef.current = { src: 'editor', until: Date.now() + SYNC_ECHO_MS };
    if (!v.paused) v.pause();
    v.currentTime = (initShots[idx].startMs / 1000) * shotScaleRef.current + 0.02;
    setVt(v.currentTime);
    highlightShot(idx, false);
  }, []);   // initShots 组件内常量，refs 稳定
  // 关键帧 hover 操作：提示词是非受控 contenteditable，React 不管其子树，改图直接操作该原子块的 DOM
  function handleKfAction(btn) {
    const span = btn.closest('.sb-kfimg');
    if (!span || span.classList.contains('sb-kfimg--busy')) return;
    if (btn.dataset.act === 'upload') {
      kfTargetRef.current = span;
      kfFileRef.current?.click();
      return;
    }
    // regen：按当前脚本重新生成（demo 用下一帧素材模拟出新图）
    span.classList.add('sb-kfimg--busy');
    const t = setTimeout(() => {
      const i = Number(span.dataset.shot) || 0;
      const v = (Number(span.dataset.v) || 0) + 1;
      span.dataset.v = String(v);
      const img = span.querySelector('img');
      if (img) img.src = `frames/frame_0${((i + v) % 9) + 1}.jpg`;
      span.classList.remove('sb-kfimg--busy');
    }, 1100);
    timersRef.current.push(t);
  }

  // 最终确认：模拟提交生成任务，按钮转圈约 1.2s 后任务进任务中心（直接关闭）
  // 载荷=用户实际编辑后的提示词全文（编辑器 DOM 为准）+ 原视频 + 目标地区，供任务详情展示/复制/重新编辑
  function submitGenerate() {
    if (submitting) return;
    setSubmitting(true);
    timersRef.current.push(setTimeout(() => onNext({
      promptHtml: editorRef.current ? editorRef.current.innerHTML : promptHtml,
      promptText: editorRef.current ? editorRef.current.innerText : '',
      videoUrl: videoUrl || 'test-clip.mp4',
      region: targetRegion,
    }), 1200));
  }
  function onKfFile(e) {
    const f = e.target.files?.[0];
    const span = kfTargetRef.current;
    e.target.value = '';
    if (!f || !span) return;
    const url = URL.createObjectURL(f);
    urlsRef.current.push(url);
    const img = span.querySelector('img');
    if (img) img.src = url;
    kfTargetRef.current = null;
  }

  // 应用：把参考图 + 指令织入提示词，并把各镜头下的关键帧原位重生成一版供对照检查
  function applyAndGenerate() {
    if (!refImages.length) return;
    setApplied(true);
    setGenState('generating');
    setPromptHtml(buildClonePromptHtml(initShots, targetRegion, refImages, instr, 'generating'));
    setTimeout(() => {
      setGenState('done');
      setPromptHtml(buildClonePromptHtml(initShots, targetRegion, refImages, instr, 'done'));
    }, 1400);
  }

  return (
    <div className="step-content sb-step">
      <div className="sb-layout">
        {/* 主排：左＝参考视频（开放栏，竖线分隔），右＝上下文补充 / 编辑提示词上下排 */}
        <div className="sb-main">
          <aside className="sb-video-pane">
            <div className="sb-video-pane-head">
              <span className="sb-video-pane-title">参考视频</span>
              <button className="sb-video-reup" onClick={onReupload}>
                <RotateCcw size={13} /> 重新上传
              </button>
            </div>
            <div className="sb-video-body">
              <video
                ref={videoRef}
                src={videoUrl || 'test-clip.mp4'}
                className="sb-video-el"
                playsInline
                preload="metadata"
                poster="frames/frame_01.jpg"
                onClick={togglePlay}
                onTimeUpdate={onVideoTime}
                onLoadedMetadata={e => {
                  const d = e.currentTarget.duration || 0;
                  setVdur(d);
                  shotScaleRef.current = d > 0 ? (d * 1000) / SHOT_TOTAL_MS : 1;
                }}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
              />
              {!playing && (
                <button className="sb-video-play" onClick={togglePlay} title="播放"><Play size={16} /></button>
              )}
              <div className="sb-video-ctrl">
                <input
                  type="range"
                  className="sb-video-seek"
                  min={0} max={vdur || 0.1} step={0.05}
                  value={Math.min(vt, vdur || 0)}
                  onInput={onSeek}
                  aria-label="播放进度"
                  style={{ '--seek-pct': `${vdur ? (Math.min(vt, vdur) / vdur) * 100 : 0}%` }}
                />
                <div className="sb-video-meta">
                  <span className="sb-video-name">source.mp4</span>
                  <span className="sb-video-dur">{fmtSec(vt)} / {fmtSec(vdur)}</span>
                </div>
              </div>
            </div>
            <p className="sb-video-tip"><Eye size={12} /> 拖动进度条，检查参考视频与关键帧是否对齐</p>
          </aside>

          <div className="sb-col">
            <section className="sb-block">
              <div className="sb-block-head">
                <span className="sb-block-title">上下文补充</span>
                <span className="sb-block-meta">选填 · 图片织入提示词并生成分镜参考图</span>
              </div>
              {/* 一体式输入框：附件在左、指令居右（含右下角操作） */}
              <div className="sb-kel">
                <div className="sb-kel-imgs">
                  {refImages.map((img, i) => (
                    <div key={img.id} className="sb-kel-thumb">
                      <img src={img.url} alt={`参考图 ${i + 1}`} />
                      <button className="sb-kel-del" onClick={() => removeRefImage(img.id)} aria-label={`移除参考图 ${i + 1}`}>
                        <X size={12} />
                      </button>
                      <span className="sb-kel-idx">图 {i + 1}</span>
                    </div>
                  ))}
                  {refImages.length < 3 && (
                    <button className="sb-kel-add" onClick={() => setUploadOpen(true)}>
                      <ImagePlus size={20} strokeWidth={1.5} />
                      <span>上传</span>
                    </button>
                  )}
                  <input ref={refInputRef} type="file" accept="image/*" multiple hidden
                    onChange={e => { addLocalImages(e.target.files); e.target.value = ''; }} />
                </div>
                <div className="sb-kel-main">
                  <textarea className="sb-kel-input" rows={2} value={instr}
                    onChange={e => { setInstr(e.target.value); invalidate(); }}
                    placeholder="补充上下文：这些图怎么用（例：@图1 换成新角色贯穿全片，@图2 作为手机里展示的产品）。留空则按脚本自动套用。" />
                  <div className="sb-kel-foot">
                    <span className="sb-kel-hint">
                      {refImages.length ? `已选 ${refImages.length} / 3 张` : '上传 1–3 张人物或产品图（选填）'}
                    </span>
                    <button className="sb-kel-apply" disabled={!refImages.length || genState === 'generating'} onClick={applyAndGenerate}>
                      {genState === 'generating'
                        ? <><Loader2 size={14} className="spinner" /> 生成中…</>
                        : <><Sparkles size={14} /> 应用并生成参考图</>}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* 编辑提示词：填满右列剩余高度，分镜关键帧图逐镜嵌在对应脚本下方 */}
            <section className="sb-block sb-block--prompt">
              <div className="sb-block-head">
                <span className="sb-block-title">编辑提示词</span>
                <span className="sb-block-meta">
                  {genState === 'generating' && <><Loader2 size={11} className="spinner" /> 分镜关键帧生成中 · </>}
                  {genState === 'done' && `${initShots.length} 镜关键帧已按参考图更新 · `}
                  {charCount} 字 · 直接改文字即可
                </span>
              </div>
              <PromptEditor html={promptHtml} onCount={setCharCount} onKfAction={handleKfAction}
                editorRef={editorRef} onScroll={onEditorScroll} />
              <input ref={kfFileRef} type="file" accept="image/*" hidden onChange={onKfFile} />
            </section>
          </div>
        </div>
      </div>

      <div className="step-actions">
        <button className="btn-ghost" onClick={onBack}>
          <ArrowLeft size={16} /> 上一步
        </button>
        <button className="btn-primary" disabled={submitting} onClick={submitGenerate}>
          {submitting
            ? <><Loader2 size={16} className="spinner" /> 已提交，任务进入任务中心…</>
            : <><Sparkles size={16} /> 确认无误，开始生成</>}
        </button>
      </div>

      {/* 上传参考图弹窗：素材库 / 本地上传 / AI 生图 三合一 */}
      {uploadOpen && (
        <div className="up-dialog-overlay" onClick={() => setUploadOpen(false)}>
          <div className="up-dialog" role="dialog" aria-modal="true" aria-label="添加参考图" onClick={e => e.stopPropagation()}>
            <div className="up-dialog-head">
              <span className="up-dialog-title">添加参考图 <em>{refImages.length}/3</em></span>
              <button className="up-dialog-x" onClick={() => setUploadOpen(false)} aria-label="关闭"><X size={16} /></button>
            </div>
            <div className="up-tabs" role="tablist">
              <button role="tab" aria-selected={uploadTab === 'library'} className={`up-tab ${uploadTab === 'library' ? 'active' : ''}`} onClick={() => setUploadTab('library')}><LayoutGrid size={14} /> 素材库</button>
              <button role="tab" aria-selected={uploadTab === 'local'} className={`up-tab ${uploadTab === 'local' ? 'active' : ''}`} onClick={() => setUploadTab('local')}><Upload size={14} /> 本地上传</button>
              <button role="tab" aria-selected={uploadTab === 'ai'} className={`up-tab ${uploadTab === 'ai' ? 'active' : ''}`} onClick={() => setUploadTab('ai')}><Sparkles size={14} /> AI 生图</button>
            </div>
            <div className="up-body">
              {uploadTab === 'library' && (
                <div className="up-lib">
                  {libraryImgs.map(src => {
                    const picked = refImages.some(r => r.url === src);
                    return (
                      <button key={src} className={`up-lib-item ${picked ? 'picked' : ''}`} disabled={refImages.length >= 3 && !picked}
                        onClick={() => picked ? removeRefByUrl(src) : addImageFromUrl(src)}>
                        <img src={src} alt="" />
                        {aiGenSet.has(src) && <span className="up-lib-ai">AI</span>}
                        {picked && <span className="up-lib-check"><Check size={12} /></span>}
                      </button>
                    );
                  })}
                </div>
              )}
              {uploadTab === 'local' && (
                localImgs.length === 0 ? (
                  <button className="up-drop" onClick={() => refInputRef.current?.click()}>
                    <Upload size={22} strokeWidth={1.5} />
                    <span className="up-drop-title">点击选择本地图片</span>
                    <span className="up-drop-hint">JPG / PNG · 选择后先在这里预览确认，再点完成</span>
                  </button>
                ) : (
                  <div className="up-lib">
                    {localImgs.map(img => {
                      const picked = refImages.some(r => r.url === img.url);
                      return (
                        <button key={img.id} className={`up-lib-item ${picked ? 'picked' : ''}`}
                          disabled={refImages.length >= 3 && !picked}
                          title={picked ? '取消选用' : '选用这张图'}
                          onClick={() => picked ? removeRefByUrl(img.url) : addImageFromUrl(img.url)}>
                          <img src={img.url} alt="" />
                          {picked && <span className="up-lib-check"><Check size={12} /></span>}
                        </button>
                      );
                    })}
                    <button className="up-lib-add" onClick={() => refInputRef.current?.click()}>
                      <ImagePlus size={18} strokeWidth={1.5} />
                      <span>继续添加</span>
                    </button>
                  </div>
                )
              )}
              {uploadTab === 'ai' && (
                <div className="up-ai-wrap">
                  {(aiGens.length > 0 || aiBusy) && (
                    <div className="up-ai-results">
                      <span className="up-ai-results-label">生成结果</span>
                      <div className="up-ai-gens">
                        {aiGens.map((g, i) => {
                          const picked = refImages.some(r => r.url === g.url);
                          return (
                            <button key={g.id} className={`up-ai-gen ${picked ? 'picked' : ''}`}
                              disabled={refImages.length >= 3 && !picked}
                              title={picked ? '取消采用' : '点选采用（自动存入素材库）'}
                              onClick={() => picked ? removeRefByUrl(g.url) : aiAdopt(g.url)}>
                              <img src={g.url} alt={`生成结果 ${i + 1}`} />
                              {picked && <span className="up-lib-check"><Check size={12} /></span>}
                            </button>
                          );
                        })}
                        {aiBusy && (
                          <div className="up-ai-gen up-ai-gen--busy">
                            <Loader2 size={15} className="spinner" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="up-ai">
                    <textarea className="up-ai-input" rows={2} value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
                      placeholder="描述想要的人物 / 产品图，例：巴西年轻男性，手持手机，街头自拍，暖色调" />
                    <div className="up-ai-foot">
                      <button className="sb-kel-apply" disabled={!aiPrompt.trim() || aiBusy} onClick={aiGenerate}>
                        {aiBusy
                          ? <><Loader2 size={14} className="spinner" /> 生成中…</>
                          : <><Sparkles size={14} /> {aiGens.length ? '再生成一张' : '生成图片'}</>}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="up-foot">
              <span className="up-foot-hint">已选 {refImages.length} / 3 张</span>
              <button className="btn-primary" onClick={() => setUploadOpen(false)}>完成</button>
            </div>
            {toast && <div className="up-toast"><CheckCircle2 size={14} /> {toast}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Step 5: Generate ── */
function StepGenerate({ onBack, onClose }) {
  const [phase, setPhase] = useState('generating');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(iv); setPhase('done'); return 100; }
        return p + 2;
      });
    }, 120);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="step-content">
      {phase === 'generating' && (
        <div className="generate-progress">
          <Loader2 size={36} className="spinner" />
          <h3>正在生成克隆视频...</h3>
          <div className="progress-bar-wrap">
            <div className="progress-bar" style={{ width: `${progress}%` }} />
          </div>
          <span className="progress-text">{progress}%</span>
          <p className="hint">
            {progress < 30 ? '正在合成角色 IP...' :
             progress < 60 ? '逐镜头生成画面中...' :
             progress < 85 ? '拼接视频片段...' :
             '最终渲染与质检...'}
          </p>
        </div>
      )}

      {phase === 'done' && (
        <div className="generate-done">
          <div className="done-icon"><CheckCircle2 size={48} /></div>
          <h3>克隆视频生成完成</h3>
          <p className="done-desc">任务已自动保存，可随时在任务中心查看和下载</p>
          <div className="done-preview">
            <div className="video-placeholder">
              <Play size={36} />
              <span>点击播放预览</span>
            </div>
          </div>
          <div className="done-actions">
            <button className="btn-outline" onClick={onBack}>
              <RefreshCw size={14} /> 调整后重新生成
            </button>
            <button className="btn-primary" onClick={onClose}>
              <Check size={14} /> 完成
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
