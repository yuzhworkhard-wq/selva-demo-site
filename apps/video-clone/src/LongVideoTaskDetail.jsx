import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, Check, ChevronDown, ChevronUp, Copy, Download,
  Image as ImageIcon, Loader2, MapPin, Package, Play, RefreshCw,
  Upload, UserRound,
} from 'lucide-react';
import { StepIndicator } from './CloneModal';
import { modelLabel } from './videoModelConfig.mjs';
import {
  allEntitiesFilled, autoFillMissingRefs, entityKindLabel,
} from './longVideoPlan.mjs';

const LV_STEPS = [
  { key: 'review', label: '确认编排' },
  { key: 'producing', label: '生成分镜' },
  { key: 'done', label: '成片预览' },
];

const KIND_ICON = { character: UserRound, scene: MapPin, prop: Package };

function stepIndex(phase) {
  if (phase === 'expanding' || phase === 'review') return 0;
  if (phase === 'producing') return 1;
  return 2;
}

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

/**
 * 长视频任务详情 —— 对齐视频克隆：StepIndicator + step-content/step-actions + ctd-* 详情。
 */
export function LongVideoTaskDetail({
  task, onBack, onPatchPlan, onConfirmProduce, onRegenerateShot,
}) {
  const [shotOpen, setShotOpen] = useState(null);
  const [advanced, setAdvanced] = useState(false);
  const [activeShot, setActiveShot] = useState(0);
  const [filling, setFilling] = useState(false);
  const [toast, setToast] = useState(null);
  const [copied, setCopied] = useState(false);
  const toastTimer = useRef(null);
  const fileRef = useRef(null);
  const [pickId, setPickId] = useState(null);

  useEffect(() => () => clearTimeout(toastTimer.current), []);
  useEffect(() => { setActiveShot(0); }, [task && task.id]);

  if (!task) return null;

  const phase = task.longPhase || 'review';
  const curStep = stepIndex(phase);
  const plan = task.longPlan;
  const entities = plan?.entities || [];
  const shots = plan?.shots || [];
  const global = plan?.global || {};
  const ready = allEntitiesFilled(entities);
  const missing = entities.filter(e => !e.imageUrl).length;
  const clips = task.variants || [];
  const displayModel = modelLabel(task.model);
  const generating = phase === 'producing' || phase === 'expanding';
  const doneOk = phase === 'done' && task.status !== 'failed';

  const statusPill = (() => {
    if (phase === 'expanding') {
      return <span className="ctd-status ctd-status--gen"><Loader2 size={11} className="spinner" /> 脚本扩写中</span>;
    }
    if (phase === 'review') {
      return <span className="ctd-status ctd-status--gen">待确认编排</span>;
    }
    if (phase === 'producing') {
      return <span className="ctd-status ctd-status--gen"><Loader2 size={11} className="spinner" /> 分镜生成中</span>;
    }
    if (task.status === 'failed') {
      return <span className="ctd-status ctd-status--fail">全部失败</span>;
    }
    if (task.status === 'partial') {
      return <span className="ctd-status ctd-status--part">部分失败</span>;
    }
    return <span className="ctd-status ctd-status--done"><Check size={11} /> 已完成</span>;
  })();

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  };

  const patchEntity = (id, patch) => {
    if (!plan) return;
    onPatchPlan({
      ...plan,
      entities: entities.map(e => (e.id === id ? { ...e, ...patch } : e)),
    });
  };

  const patchShot = (shotId, patch) => {
    if (!plan) return;
    const nextShots = shots.map((s) => {
      if (s.id !== shotId) return s;
      const next = { ...s, ...patch };
      next.promptFull = [
        `镜头${(s.index ?? 0) + 1}（${s.timeRange}）`,
        `叙事功能：${next.narrative}`,
        `画面与动作：景别 ${next.shotSize}；运镜 ${next.move}；${next.visualSummary}`,
        `对白：${next.dialogue}`,
      ].join('\n');
      return next;
    });
    onPatchPlan({ ...plan, shots: nextShots });
  };

  const openPick = (id) => {
    setPickId(id);
    fileRef.current?.click();
  };

  const onFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !pickId) return;
    patchEntity(pickId, { imageUrl: URL.createObjectURL(file), imageSource: 'upload' });
    setPickId(null);
  };

  const autoFill = () => {
    setFilling(true);
    setTimeout(() => {
      onPatchPlan({ ...plan, entities: autoFillMissingRefs(entities) });
      setFilling(false);
      showToast('已自动补全设定图');
    }, 800);
  };

  const copyBrief = () => {
    const text = task.sourceText || '';
    if (!text) return;
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  };

  const download = () => {
    const url = task.cloneUrl || task.videoUrl;
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${task.name || '长视频'}.mp4`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const list = clips.length ? clips : shots;
  const doneCount = clips.filter(c => c.status === 'done').length;
  const failCount = clips.filter(c => c.status === 'failed').length;

  return (
    <div className="clone-page">
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
      <div className="clone-main">
        <div className="clone-topbar">
          <div className="clone-topbar-left">
            <button type="button" className="icon-btn" onClick={onBack} title="返回任务中心"><ArrowLeft size={18} /></button>
            <span className="clone-topbar-title">{task.name || '长视频生成'}</span>
            {statusPill}
          </div>
          <div className="lvd-top-meta">
            {displayModel && <span>{displayModel}</span>}
            {task.outDuration && <span>{task.outDuration}</span>}
            {task.aspect && <span>{task.aspect}</span>}
          </div>
        </div>

        <StepIndicator steps={LV_STEPS} current={curStep} />

        {/* ── 扩写中：对齐克隆「分析中」桥接页 ── */}
        {phase === 'expanding' && (
          <div className="clone-page-body">
            <div className="clone-page-inner">
              <div className="step-content analyze-overlay">
                <div className="analyze-box">
                  <Loader2 size={28} className="spinner" />
                  <h3>正在结构化扩写脚本</h3>
                  <p className="analyze-stage">全局设定、人物 / 场景 / 物品与分镜已计费生成，完成后在本任务内确认。</p>
                  <div className="progress-bar-wrap"><div className="progress-bar" style={{ width: '62%' }} /></div>
                  {task.sourceText && <pre className="lvd-brief">{task.sourceText}</pre>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── 确认编排：对齐克隆分镜编辑的开放栏 + step-actions ── */}
        {phase === 'review' && plan && (
          <div className="clone-page-body">
            <div className="clone-page-inner">
              <div className="step-content sb-step">
                <div className="sb-layout">
                  <div className="sb-main">
                    <aside className="sb-video-pane lvd-ref-pane">
                      <div className="sb-video-pane-head">
                        <span className="sb-video-pane-title">全局参考设定图</span>
                        <span className="sb-block-meta">
                          {ready ? '已全部就绪' : `还差 ${missing} 张`}
                        </span>
                      </div>
                      <div className="lvd-ref-stack">
                        {entities.map((e) => {
                          const Icon = KIND_ICON[e.kind] || Package;
                          const empty = !e.imageUrl;
                          return (
                            <div key={e.id} className={`lvd-ref-row-item ${empty ? 'is-empty' : ''}`}>
                              <button type="button" className="lvd-ref-thumb" onClick={() => openPick(e.id)} title="上传设定图">
                                {e.imageUrl
                                  ? <img src={e.imageUrl} alt={e.label} />
                                  : <span className="lvd-ref-empty"><ImageIcon size={18} /><em>上传</em></span>}
                              </button>
                              <div className="lvd-ref-copy">
                                <span className={`lv-kind lv-kind--${e.kind}`}>
                                  <Icon size={11} /> {entityKindLabel(e.kind)}
                                </span>
                                <b>{e.label}</b>
                                <code>{e.tag}</code>
                                <button type="button" className="sb-video-reup" onClick={() => openPick(e.id)}>
                                  <Upload size={12} /> 上传
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {!ready && (
                        <button type="button" className="btn-outline btn-sm lvd-autofill-btn" disabled={filling} onClick={autoFill}>
                          {filling ? <Loader2 size={14} className="spinner" /> : <RefreshCw size={14} />}
                          自动补全缺图
                        </button>
                      )}
                    </aside>

                    <div className="sb-col">
                      <section className="sb-block">
                        <div className="sb-block-head">
                          <span className="sb-block-title">你的输入</span>
                          <button
                            type="button"
                            className={`ctd-copy ${copied ? 'ctd-copy--ok' : ''}`}
                            onClick={copyBrief}
                            title="复制输入"
                          >
                            {copied ? <Check size={14} /> : <Copy size={14} />}
                          </button>
                        </div>
                        <pre className="lvd-brief lvd-brief--flush">{task.sourceText || '（无文字）'}</pre>
                      </section>

                      <section className="sb-block">
                        <div className="sb-block-head">
                          <span className="sb-block-title">风格摘要</span>
                        </div>
                        <ul className="lvd-summary">
                          <li><b>风格</b>{global.style}</li>
                          <li><b>画幅</b>{global.aspect} · <b>时长</b>{global.duration}</li>
                          <li><b>运镜</b>{global.camera}</li>
                          <li><b>语言</b>{global.locale}</li>
                        </ul>
                      </section>

                      <section className="sb-block sb-block--prompt">
                        <div className="sb-block-head">
                          <span className="sb-block-title">分镜脚本</span>
                          <span className="sb-block-meta">{shots.length} 镜</span>
                        </div>
                        <ol className="lvd-shot-list">
                          {shots.map((s, i) => {
                            const open = shotOpen === s.id;
                            return (
                              <li key={s.id || i} className={`lvd-shot ${open ? 'is-open' : ''}`}>
                                <button type="button" className="lvd-shot-head" onClick={() => setShotOpen(open ? null : s.id)}>
                                  <span className="lvd-shot-idx">{i + 1}</span>
                                  <span className="lvd-shot-meta">
                                    <b>{s.narrative}</b>
                                    <em>{s.timeRange}</em>
                                  </span>
                                  {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                                {open ? (
                                  <div className="lvd-shot-body">
                                    <label className="lvd-field">
                                      <span>画面摘要</span>
                                      <textarea rows={2} value={s.visualSummary || ''}
                                        onChange={ev => patchShot(s.id, { visualSummary: ev.target.value })} />
                                    </label>
                                    <label className="lvd-field">
                                      <span>对白</span>
                                      <textarea rows={2} value={s.dialogue || ''}
                                        onChange={ev => patchShot(s.id, { dialogue: ev.target.value })} />
                                    </label>
                                  </div>
                                ) : (
                                  <p className="lvd-shot-preview">{s.dialogue}</p>
                                )}
                              </li>
                            );
                          })}
                        </ol>
                        <button type="button" className="lv-advanced-toggle" onClick={() => setAdvanced(a => !a)}>
                          {advanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          高级 · 完整字段
                        </button>
                        {advanced && (
                          <div className="lv-advanced">
                            <pre className="lv-pre">{plan.advancedGlobal}</pre>
                            {shots.map(s => <pre key={s.id} className="lv-pre">{s.promptFull}</pre>)}
                          </div>
                        )}
                      </section>
                    </div>
                  </div>
                </div>

                <div className="step-actions">
                  <button type="button" className="btn-ghost" onClick={onBack}>
                    <ArrowLeft size={14} /> 返回任务中心
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={!ready}
                    title={ready ? '确认编排并生成视频' : '请先填满全部设定图'}
                    onClick={() => { if (ready) onConfirmProduce(); }}
                  >
                    <Check size={15} /> 确认无误，开始生成
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── 生成中 / 成片：对齐克隆任务详情 ctd-body ── */}
        {(phase === 'producing' || phase === 'done') && (
          <div className="ctd-body">
            <section className="ctd-videos">
              <div className="ctd-video-row">
                <div className="ctd-vcol">
                  <span className="ctd-vtag ctd-vtag--clone">长视频成片</span>
                  {generating ? (
                    <div className="ctd-vbox ctd-vbox--slot">
                      <Loader2 size={20} className="spinner" />
                      <span>分镜并行生成中，完成后在此预览</span>
                    </div>
                  ) : (
                    <Vid src={task.cloneUrl || task.videoUrl} label="长视频成片预览" />
                  )}
                </div>
              </div>
              <div className="ctd-actions">
                <button
                  type="button"
                  className="btn-outline"
                  disabled={generating || !list[activeShot]}
                  onClick={() => {
                    if (list[activeShot]) {
                      onRegenerateShot(activeShot);
                      showToast(`镜头 ${activeShot + 1} 重新生成中`);
                    }
                  }}
                >
                  <RefreshCw size={14} /> 重跑本镜
                </button>
                <button type="button" className="btn-outline" disabled={generating || !doneOk} onClick={download}>
                  <Download size={14} /> 下载
                </button>
                <button type="button" className="btn-primary" disabled={generating} onClick={onBack}>
                  返回任务中心
                </button>
              </div>
            </section>

            <section className="ctd-prompt">
              <div className="ctd-prompt-head">
                <span className="ctd-prompt-title">分镜进度</span>
                <span className="sb-block-meta">
                  {doneCount}/{list.length || shots.length} 完成
                  {failCount ? ` · ${failCount} 失败` : ''}
                </span>
              </div>
              <div className="ctd-prompt-body lvd-rail-body">
                <div className="lvd-shot-cards">
                  {list.map((s, i) => {
                    const st = s.status || (phase === 'done' ? 'done' : 'pending');
                    const failed = st === 'failed';
                    const active = i === activeShot;
                    return (
                      <button
                        key={s.id || i}
                        type="button"
                        className={`lvd-shot-card ${active ? 'is-active' : ''} ${failed ? 'is-fail' : ''}`}
                        onClick={() => setActiveShot(i)}
                      >
                        <span className="lvd-shot-card-idx">{i + 1}</span>
                        <span className="lvd-shot-card-body">
                          <b>{s.narrative || `镜头 ${i + 1}`}</b>
                          <em>{s.timeRange || ''}</em>
                          <span className={`lvd-shot-st lvd-shot-st--${st}`}>
                            {st === 'done' ? '完成' : st === 'failed' ? '失败' : st === 'generating' || st === 'running' ? '生成中' : '等待'}
                          </span>
                        </span>
                        {(phase === 'done' || failed) && (
                          <span
                            className="lvd-shot-regen"
                            title="重跑本镜"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRegenerateShot(i);
                              showToast(`镜头 ${i + 1} 重新生成中`);
                            }}
                          >
                            <RefreshCw size={13} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {phase === 'done' && list[activeShot] && (
                  <div className="lvd-shot-detail">
                    <h3>{list[activeShot].narrative || `镜头 ${activeShot + 1}`}</h3>
                    <p>{list[activeShot].visualSummary}</p>
                    <p className="lvd-shot-dlg">{list[activeShot].dialogue}</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>

      {toast && (
        <div className="ctd-toast ctd-toast--lg">
          <Check size={14} /> {toast}
        </div>
      )}
    </div>
  );
}
