import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle, ArrowLeft, Check, ChevronDown, FolderOpen,
  Layers, Loader2, Plus, Sparkles, Trash2, Upload, Video, X, Image,
} from 'lucide-react';
import { notifyHostModal } from './hostModal';

/* ── 批量套边框 ──
   主流程：① 生成若干批次边框（AI 生图，每批 4 张变体）→ ② 上传视频池 →
           ③ 选布局（居中 / 角落）→ ④ 批量合成（边框 × 视频全排列，上限 COMPOSE_CAP）
   布局镜像批量混剪：左栏=结果区（按批次折叠展示成片），右栏=素材配置区。  */

const MAX_FRAMES = 6;          // 单次最多生成几批边框
const VARIANTS_PER_BATCH = 4;  // 每批 AI 生成变体数
const COMPOSE_CAP = 20;        // 一次合成上限

/* 布局预设 */
const LAYOUTS = [
  {
    value: 'center',
    label: '居中布局',
    desc: '视频在边框中心',
    preview: 'center',
  },
  {
    value: 'corner',
    label: '角落布局',
    desc: '视频在右下角，左/上展示边框',
    preview: 'corner',
  },
];

/* 布局预览 SVG —— 轻量内联 */
function LayoutPreview({ type, active }) {
  const border = active ? 'var(--accent)' : 'var(--border-light)';
  const fill = active ? 'var(--accent-subtle)' : 'var(--bg-elevated)';
  return (
    <svg
      viewBox="0 0 80 52" width="80" height="52"
      style={{ display: 'block', borderRadius: 6, overflow: 'visible' }}
      aria-hidden="true"
    >
      {/* 外框 */}
      <rect x="1" y="1" width="78" height="50" rx="4" fill={fill}
        stroke={border} strokeWidth="1.5" />
      {type === 'center' ? (
        /* 居中：视频矩形居中 */
        <rect x="16" y="9" width="48" height="34" rx="3"
          fill="var(--bg-elevated)" stroke={active ? 'var(--accent)' : 'var(--border)'} strokeWidth="1.2" />
      ) : (
        /* 角落：视频在右下 */
        <rect x="36" y="22" width="36" height="24" rx="3"
          fill="var(--bg-elevated)" stroke={active ? 'var(--accent)' : 'var(--border)'} strokeWidth="1.2" />
      )}
      {/* 播放三角 */}
      <polygon
        points={type === 'center' ? '37,26 37,36 46,31' : '51,34 51,42 59,38'}
        fill={active ? 'var(--accent)' : 'var(--border-light)'} opacity="0.8"
      />
    </svg>
  );
}

/* 边框变体缩略图 */
function FrameVariantThumb({ variant, selected, onToggle }) {
  return (
    <button
      type="button"
      className={`bfm-variant-thumb ${selected ? 'is-on' : ''}`}
      onClick={onToggle}
      title={selected ? '点击取消选用' : '点击选用'}
      aria-pressed={selected}
    >
      <span
        className="bfm-variant-bg"
        style={{ '--frame-hue': variant.hue }}
      />
      {selected && (
        <span className="bfm-variant-check" aria-hidden="true">
          <Check size={9} strokeWidth={3} />
        </span>
      )}
      <span className="bfm-variant-no">{variant.idx}</span>
    </button>
  );
}

/* 视频缩略图卡片 */
function VideoThumb({ mat, onRemove }) {
  return (
    <div className="bfm-vid-card">
      <div className="bfm-vid-thumb">
        {mat.cover
          ? <img src={mat.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <Video size={18} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />}
      </div>
      <span className="bfm-vid-name" title={mat.name}>{mat.name}</span>
      <button
        type="button" className="bfm-vid-rm" onClick={() => onRemove(mat.id)}
        aria-label={`移除 ${mat.name}`}
      >
        <X size={10} />
      </button>
    </div>
  );
}

/* 成片结果行 */
function ResultRow({ result, index, batchFrameHue, batchLayout, picked, onPick, disabled }) {
  const blocked = !picked && disabled;
  return (
    <div
      className={`bfm-result-row ${picked ? 'is-picked' : ''}`}
      role="checkbox"
      aria-checked={picked}
    >
      <label
        className={`mix-tick bfm-row-tick ${blocked ? 'is-blocked' : ''}`}
        onClick={e => e.stopPropagation()}
        title={blocked ? `一次最多导出 ${COMPOSE_CAP} 条` : undefined}
      >
        <input
          type="checkbox" checked={picked} disabled={blocked}
          onChange={onPick}
          aria-label={`选择成片 ${index + 1}`}
        />
        <span className="mix-tick-box"><Check size={10} strokeWidth={3} /></span>
      </label>

      <span className="bfm-row-idx">{index + 1}</span>

      {/* 成片缩略图（合成预览占位） */}
      <div className="bfm-row-thumb" style={{ '--frame-hue': batchFrameHue }}>
        <div className="bfm-row-thumb-bg" />
        {result.videoCover
          ? <img src={result.videoCover} alt="" className="bfm-row-vid-cover" />
          : <Video size={12} strokeWidth={1.5} className="bfm-row-vid-icon" />}
      </div>

      {/* 边框 + 视频 标签 */}
      <div className="bfm-row-meta">
        <span className="bfm-row-frame-tag"
          style={{ '--frame-hue': batchFrameHue }}>
          边框 {result.frameIdx}
        </span>
        <span className="bfm-row-arrow">→</span>
        <span className="bfm-row-vid-name" title={result.videoName}>
          {(result.videoName || '').replace(/\.[^.]+$/, '').slice(0, 14) || '视频'}
        </span>
        <span className="bfm-row-layout-tag">{batchLayout === 'center' ? '居中' : '角落'}</span>
      </div>

      <span className="bfm-row-status">
        {result.status === 'generating'
          ? <Loader2 size={12} className="spinner" />
          : result.status === 'done'
            ? <span style={{ color: 'var(--success)', fontSize: 11 }}>完成</span>
            : null}
      </span>
    </div>
  );
}

export function BatchFrameModal({
  onClose, onRestart, visible = true, embedded = false, onSubmitTask = null,
}) {
  /* ── 边框批次状态 ── */
  const [frameBatches, setFrameBatches] = useState([]);  // [{id, prompt, refImg, hue, status, variants:[{id,idx,hue,selected}]}]
  const [nextBatchId, setNextBatchId] = useState(1);

  /* ── 视频池 ── */
  const [videos, setVideos] = useState([]);
  const [nextVidId, setNextVidId] = useState(1);

  /* ── 布局 ── */
  const [layout, setLayout] = useState('center');

  /* ── 结果批次 ── */
  const [resultBatches, setResultBatches] = useState([]);  // [{id, frameHue, layout, rows:[{...}], collapsed}]
  const [selected, setSelected] = useState(() => new Set());

  /* ── 其他 UI 状态 ── */
  const [toast, setToast] = useState(null);
  const [resumeAsk, setResumeAsk] = useState(false);
  const [exporting, setExporting] = useState(false);
  const rootRef = useRef(null);
  const poolInputRef = useRef(null);
  const toastTimer = useRef(null);
  const wasVisible = useRef(visible);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const showToast = msg => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  };

  const hasProgress = frameBatches.length > 0 || videos.length > 0;
  const exit = useCallback(() => onClose(hasProgress), [onClose, hasProgress]);

  /* ── 隐藏时暂停媒体 ── */
  useEffect(() => {
    if (!visible) rootRef.current?.querySelectorAll('video,audio').forEach(el => el.pause());
    else if (!wasVisible.current && hasProgress) setResumeAsk(true);
    wasVisible.current = visible;
  }, [visible, hasProgress]);

  useEffect(() => {
    if (!resumeAsk) return undefined;
    notifyHostModal(true);
    return () => notifyHostModal(false);
  }, [resumeAsk]);

  useEffect(() => {
    if (!visible) return undefined;
    const onKey = e => {
      if (e.key !== 'Escape') return;
      if (resumeAsk) return;
      exit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, resumeAsk, exit]);

  /* ── 边框批次操作 ── */
  const addBatch = () => {
    if (frameBatches.length >= MAX_FRAMES) {
      showToast(`最多添加 ${MAX_FRAMES} 批边框`);
      return;
    }
    const id = nextBatchId;
    setNextBatchId(n => n + 1);
    setFrameBatches(prev => [...prev, {
      id, prompt: '', refImg: null,
      hue: 200 + Math.floor(Math.random() * 160),
      status: 'idle', variants: [],
    }]);
  };

  const removeBatch = id => {
    setFrameBatches(prev => prev.filter(b => b.id !== id));
  };

  const updatePrompt = (id, val) => {
    setFrameBatches(prev => prev.map(b => b.id === id ? { ...b, prompt: val } : b));
  };

  const uploadRef = (id, file) => {
    setFrameBatches(prev => prev.map(b => b.id === id ? { ...b, refImg: file.name } : b));
  };

  const generateBatch = id => {
    const batch = frameBatches.find(b => b.id === id);
    if (!batch) return;
    if (!batch.prompt.trim() && !batch.refImg) {
      showToast('请先填写边框描述或上传参考图');
      return;
    }
    setFrameBatches(prev => prev.map(b =>
      b.id === id ? { ...b, status: 'generating', variants: [] } : b,
    ));
    setTimeout(() => {
      const baseHue = 20 + Math.floor(Math.random() * 300);
      const variants = Array.from({ length: VARIANTS_PER_BATCH }, (_, i) => ({
        id: `v-${id}-${i + 1}`,
        idx: i + 1,
        hue: (baseHue + i * 30) % 360,
        selected: true,
      }));
      setFrameBatches(prev => prev.map(b =>
        b.id === id ? { ...b, status: 'done', variants, hue: baseHue } : b,
      ));
    }, 1400);
  };

  const toggleVariant = (batchId, variantId) => {
    setFrameBatches(prev => prev.map(b => {
      if (b.id !== batchId) return b;
      return {
        ...b,
        variants: b.variants.map(v =>
          v.id === variantId ? { ...v, selected: !v.selected } : v,
        ),
      };
    }));
  };

  /* ── 视频池操作 ── */
  const addVideos = useCallback(fileList => {
    const files = Array.from(fileList || []).filter(f => f.type.startsWith('video/'));
    if (!files.length) return;
    setVideos(prev => {
      let seq = nextVidId;
      const added = files.map(file => ({
        id: `vid-${seq++}`,
        name: file.name,
        url: URL.createObjectURL(file),
        cover: '',
      }));
      setNextVidId(seq);
      return [...prev, ...added];
    });
  }, [nextVidId]);

  const removeVideo = id => {
    setVideos(prev => prev.filter(v => v.id !== id));
  };

  /* ── 计算合成数 ── */
  const selectedFrameVariants = frameBatches.flatMap(b =>
    (b.variants || []).filter(v => v.selected).map(v => ({ ...v, batchHue: b.hue })),
  );
  const product = selectedFrameVariants.length * videos.length;
  const overCap = product > COMPOSE_CAP;

  /* ── 生成成片 ── */
  const canCompose = product > 0 && !overCap && resultBatches.every(rb =>
    rb.rows.every(r => r.status !== 'generating'),
  );

  const compose = () => {
    if (!canCompose) return;
    const rows = [];
    selectedFrameVariants.forEach((fv, fi) => {
      videos.forEach((vid, vi) => {
        rows.push({
          id: `r-${Date.now()}-${fi}-${vi}`,
          frameIdx: fv.idx,
          batchHue: fv.batchHue,
          videoId: vid.id,
          videoName: vid.name,
          videoCover: vid.cover,
          status: 'pending',
        });
      });
    });

    const batchId = `bfm-batch-${Date.now()}`;
    setResultBatches(prev => [
      {
        id: batchId,
        frameHue: selectedFrameVariants[0]?.batchHue || 220,
        layout,
        rows: rows.map(r => ({ ...r, status: 'pending' })),
        collapsed: false,
      },
      ...prev.map(b => ({ ...b, collapsed: true })),
    ]);
    setSelected(new Set());

    /* 模拟逐条合成 */
    const STEP = 800;
    rows.forEach((row, i) => {
      setTimeout(() => {
        setResultBatches(prev => prev.map(b => {
          if (b.id !== batchId) return b;
          return {
            ...b,
            rows: b.rows.map(r => r.id === row.id ? { ...r, status: 'generating' } : r),
          };
        }));
      }, 300 + i * STEP);
      setTimeout(() => {
        setResultBatches(prev => prev.map(b => {
          if (b.id !== batchId) return b;
          const rows2 = b.rows.map(r => r.id === row.id ? { ...r, status: 'done' } : r);
          return { ...b, rows: rows2 };
        }));
      }, 300 + i * STEP + 640);
    });
  };

  /* ── 导出到任务中心 ── */
  const allResultRows = resultBatches.flatMap(b => b.rows.map(r => ({ ...r, batchId: b.id })));
  const selectedRows = allResultRows.filter(r => selected.has(r.id));
  const canExport = selected.size > 0 && !exporting;

  const exportToTaskCenter = () => {
    if (!canExport) return;
    const n = selected.size;
    setExporting(true);
    setTimeout(() => {
      if (onSubmitTask) {
        onSubmitTask({
          name: n > 1 ? `批量套边框 · ${n} 条` : '批量套边框',
          videoUrl: videos[0]?.url || 'test-clip.mp4',
          variants: selectedRows.map((r, i) => ({
            id: r.id,
            seq: [i],
            duration: 15 + Math.floor(Math.random() * 10),
            clips: [{ id: r.videoId, name: r.videoName, url: '', cover: r.videoCover, duration: 15 }],
            frameIdx: r.frameIdx,
            layout: r.batchLayout || layout,
            status: 'done',
          })),
          promptHtml: '',
          promptText: selectedRows.map((r, i) => `成片 ${i + 1}: 边框变体 ${r.frameIdx} + ${r.videoName}`).join('\n'),
          region: '—',
          toolName: '批量套边框',
          status: 'generating',
        });
      }
      setSelected(new Set());
      setExporting(false);
      showToast(`${n} 条视频已提交至任务中心生成`);
    }, 700);
  };

  const togglePick = id => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else if (next.size < COMPOSE_CAP) next.add(id);
    return next;
  });

  const allDone = allResultRows.length > 0 && allResultRows.every(r => r.status === 'done');
  const allPicked = allDone && allResultRows.every(r => selected.has(r.id));
  const toggleAll = () => setSelected(prev =>
    allPicked ? new Set() : new Set(allResultRows.map(r => r.id)),
  );

  const toggleCollapse = id => setResultBatches(prev =>
    prev.map(b => b.id === id ? { ...b, collapsed: !b.collapsed } : b),
  );

  /* ── 渲染 ── */
  const totalBatches = resultBatches.length;
  const totalResults = allResultRows.length;

  return (
    <div className="clone-page" ref={rootRef} style={visible ? undefined : { display: 'none' }}>
      {!embedded && (
        <aside className="clone-sidebar">
          <button className="clone-sidebar-logo" onClick={exit} title="返回工具箱">
            <span className="logo-mark">S</span>
            <span className="logo-text">SELVA</span>
          </button>
        </aside>
      )}

      <div className="clone-main">
        <div className="clone-topbar">
          <div className="clone-topbar-left">
            <button className="icon-btn" onClick={exit} title="返回"><ArrowLeft size={18} /></button>
            <span className="clone-topbar-title">批量套边框</span>
          </div>
          <button className="icon-btn" onClick={exit} title="关闭"><X size={18} /></button>
        </div>

        {toast && (
          <div className="ctd-toast ctd-toast--lg">
            <Check size={17} strokeWidth={2.2} /> {toast}
          </div>
        )}

        <div className="clone-page-body bfm-body">
          <div className="clone-page-inner bfm-inner">
            <div className="bfm-work">

              {/* ── 左：结果区 ── */}
              <section className="bfm-out">
                <header className="mix-out-head">
                  <div className="mix-out-title">
                    成片预览
                    <span className="mix-out-sub">
                      {totalBatches ? `${totalBatches} 批 · ${totalResults} 条成片` : '配置完成后点击「生成成片」'}
                    </span>
                  </div>
                </header>

                <div className="mix-out-body">
                  {resultBatches.length === 0 ? (
                    <div className="mix-out-empty">
                      <span className="mix-out-empty-icon" aria-hidden="true">
                        <Image size={38} strokeWidth={1.2} />
                      </span>
                      <h3 className="mix-out-empty-title">批量套边框，一键出片</h3>
                      <p>AI 生成多批次边框，上传视频池，全排列合成</p>
                      <div className="upload-tips">
                        <span className="upload-tip">
                          <Image size={13} strokeWidth={1.8} />边框 × 视频 = 成片数
                        </span>
                        <span className="upload-tip">
                          <Layers size={13} strokeWidth={1.8} />上限 {COMPOSE_CAP} 条
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="mix-batches">
                      {resultBatches.map((batch, batchOrd) => {
                        const batchN = resultBatches.length - batchOrd;
                        const keys = batch.rows.map(r => r.id);
                        const batchAllPicked = keys.length > 0 && keys.every(k => selected.has(k));
                        const batchAnyPicked = keys.some(k => selected.has(k));
                        const batchBlocked = !batchAllPicked && !batchAnyPicked && selected.size >= COMPOSE_CAP;
                        return (
                          <div key={batch.id} className={`mix-batch ${batch.collapsed ? 'is-collapsed' : ''}`}>
                            <div className="mix-batch-head">
                              <button
                                type="button" className="mix-batch-toggle"
                                onClick={() => toggleCollapse(batch.id)}
                                aria-expanded={!batch.collapsed}
                              >
                                <ChevronDown size={14} className="mix-batch-chevron" />
                                <span className="mix-batch-title">第 {batchN} 批</span>
                                <em className="mix-batch-meta">
                                  {batch.rows.length} 条 · {batch.layout === 'center' ? '居中' : '角落'}布局
                                </em>
                              </button>
                              <label
                                className={`mix-tick mix-batch-tick ${batchBlocked ? 'is-blocked' : ''}`}
                                onClick={e => e.stopPropagation()}
                                title={batchBlocked ? `一次最多导出 ${COMPOSE_CAP} 条` : undefined}
                              >
                                <input
                                  type="checkbox" checked={batchAllPicked}
                                  disabled={!keys.length || batchBlocked}
                                  onChange={() => {
                                    setSelected(prev => {
                                      const next = new Set(prev);
                                      const allOn = keys.every(k => next.has(k));
                                      if (allOn) keys.forEach(k => next.delete(k));
                                      else keys.forEach(k => { if (next.size < COMPOSE_CAP) next.add(k); });
                                      return next;
                                    });
                                  }}
                                  aria-label={`全选第 ${batchN} 批`}
                                />
                                <span className="mix-tick-box"><Check size={11} strokeWidth={3} /></span>
                              </label>
                            </div>

                            {!batch.collapsed && (
                              <div className="mix-rows bfm-rows">
                                <div className="bfm-rows-head">
                                  <span style={{ flex: '0 0 22px' }} />
                                  <span style={{ flex: '0 0 30px', textAlign: 'center' }}>序号</span>
                                  <span style={{ flex: '0 0 56px', textAlign: 'center' }}>预览</span>
                                  <span style={{ flex: 1 }}>拼接说明</span>
                                  <span style={{ flex: '0 0 50px', textAlign: 'right' }}>状态</span>
                                </div>
                                {batch.rows.map((row, i) => (
                                  <ResultRow
                                    key={row.id}
                                    result={row}
                                    index={i}
                                    batchFrameHue={batch.frameHue}
                                    batchLayout={batch.layout}
                                    picked={selected.has(row.id)}
                                    onPick={() => togglePick(row.id)}
                                    disabled={!selected.has(row.id) && selected.size >= COMPOSE_CAP}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <footer className="mix-out-foot">
                  <label className="mix-tick mix-tick--all" title={`一次最多导出 ${COMPOSE_CAP} 条`}>
                    <input
                      type="checkbox" checked={allPicked}
                      onChange={toggleAll} disabled={!allDone}
                      aria-label="全选"
                    />
                    <span className="mix-tick-box"><Check size={11} strokeWidth={3} /></span>
                    <span className="mix-foot-txt">已选 {selected.size}/{COMPOSE_CAP}</span>
                  </label>
                  <button
                    type="button" className="btn-primary"
                    disabled={!canExport}
                    onClick={exportToTaskCenter}
                  >
                    {exporting
                      ? <><Loader2 size={14} className="spinner" /> 提交中…</>
                      : <>导出到任务中心{selected.size ? ` (${selected.size})` : ''}</>}
                  </button>
                </footer>
              </section>

              {/* ── 右：配置区 ── */}
              <aside className="bfm-side">

                {/* 边框批次 */}
                <div className="bfm-panel">
                  <div className="bfm-panel-head">
                    <span className="bfm-panel-title">边框批次</span>
                    <span className="bfm-panel-hint">
                      AI 生成 · 每批 {VARIANTS_PER_BATCH} 变体 · 最多 {MAX_FRAMES} 批
                    </span>
                  </div>

                  {frameBatches.length === 0 ? (
                    <div className="bfm-empty-slot" onClick={addBatch}>
                      <Image size={20} strokeWidth={1.3} />
                      <span>点击添加边框批次</span>
                    </div>
                  ) : (
                    <div className="bfm-batch-list">
                      {frameBatches.map(batch => (
                        <div key={batch.id} className="bfm-batch-card">
                          <div className="bfm-batch-card-top">
                            <span className="bfm-batch-no">#{ batch.id}</span>
                            <textarea
                              rows={2}
                              className="bfm-prompt-input"
                              placeholder="描述边框风格…例：品牌红色+金色徽标，底部促销文案"
                              value={batch.prompt}
                              onChange={e => updatePrompt(batch.id, e.target.value)}
                            />
                            <div className="bfm-batch-card-actions">
                              <label className="bfm-ref-btn" title="上传参考图">
                                <input
                                  type="file" accept="image/*" hidden
                                  onChange={e => { if (e.target.files?.[0]) uploadRef(batch.id, e.target.files[0]); }}
                                />
                                <Image size={13} strokeWidth={1.7} />
                                <span>{batch.refImg ? '已上传' : '参考图'}</span>
                              </label>
                              <button
                                type="button"
                                className={`bfm-gen-btn ${batch.status === 'generating' ? 'is-busy' : ''}`}
                                onClick={() => generateBatch(batch.id)}
                                disabled={batch.status === 'generating'}
                              >
                                {batch.status === 'generating'
                                  ? <><Loader2 size={11} className="spinner" /> 生成中</>
                                  : <><Sparkles size={11} /> {batch.status === 'done' ? '重新生成' : '生成边框'}</>}
                              </button>
                              <button
                                type="button" className="bfm-rm-btn"
                                onClick={() => removeBatch(batch.id)}
                                aria-label="删除批次"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          </div>

                          {batch.refImg && (
                            <div className="bfm-ref-tag">
                              <Image size={10} /> {batch.refImg}
                            </div>
                          )}

                          {batch.variants.length > 0 && (
                            <div className="bfm-variants">
                              {batch.variants.map(v => (
                                <FrameVariantThumb
                                  key={v.id}
                                  variant={v}
                                  selected={v.selected}
                                  onToggle={() => toggleVariant(batch.id, v.id)}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {frameBatches.length > 0 && frameBatches.length < MAX_FRAMES && (
                    <button type="button" className="bfm-add-batch-btn" onClick={addBatch}>
                      <Plus size={13} /> 添加边框批次
                    </button>
                  )}
                </div>

                {/* 视频池 */}
                <div className="bfm-panel bfm-panel--vid">
                  <div className="bfm-panel-head">
                    <span className="bfm-panel-title">视频池</span>
                    <span className="bfm-panel-hint">{videos.length > 0 ? `${videos.length} 条` : '上传后与边框全排列合成'}</span>
                  </div>
                  {videos.length === 0 ? (
                    <div
                      className="bfm-empty-slot"
                      onClick={() => poolInputRef.current?.click()}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => { e.preventDefault(); addVideos(e.dataTransfer.files); }}
                    >
                      <Video size={20} strokeWidth={1.3} />
                      <span>上传视频素材</span>
                    </div>
                  ) : (
                    <div className="bfm-vid-pool">
                      {videos.map(v => (
                        <VideoThumb key={v.id} mat={v} onRemove={removeVideo} />
                      ))}
                      <label className="bfm-vid-add-slot">
                        <input
                          type="file" accept="video/*" multiple hidden
                          onChange={e => { if (e.target.files?.length) addVideos(e.target.files); }}
                        />
                        <Plus size={16} strokeWidth={1.8} />
                      </label>
                    </div>
                  )}
                  <input
                    ref={poolInputRef} type="file" hidden multiple accept="video/*"
                    onChange={e => { if (e.target.files?.length) addVideos(e.target.files); e.target.value = ''; }}
                  />
                  {videos.length > 0 && (
                    <div className="bfm-pool-foot">
                      <span className="mix-pool-stat">{videos.length} 条视频</span>
                      <button
                        type="button"
                        onClick={() => setVideos([])}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '3px 7px', border: 'none', borderRadius: 6,
                          background: 'transparent', color: 'var(--text-muted)',
                          fontSize: 11, cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={11} /> 清空
                      </button>
                    </div>
                  )}
                </div>

                {/* 布局选择 */}
                <div className="bfm-panel bfm-panel--layout">
                  <div className="bfm-panel-head">
                    <span className="bfm-panel-title">合成布局</span>
                  </div>
                  <div className="bfm-layout-opts">
                    {LAYOUTS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`bfm-layout-opt ${layout === opt.value ? 'is-on' : ''}`}
                        onClick={() => setLayout(opt.value)}
                        aria-pressed={layout === opt.value}
                      >
                        <LayoutPreview type={opt.value} active={layout === opt.value} />
                        <span className="bfm-layout-opt-label">{opt.label}</span>
                        <span className="bfm-layout-opt-desc">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 合成量预估 + 生成按钮 */}
                <div className="bfm-compose-bar">
                  <div className="bfm-compose-count">
                    <span className={`bfm-compose-num ${overCap ? 'is-over' : ''}`}>{product}</span>
                    <span className="bfm-compose-label">
                      条成片
                      <em>（{selectedFrameVariants.length} 变体 × {videos.length} 视频）</em>
                    </span>
                    {overCap && (
                      <span className="bfm-compose-warn">
                        <AlertCircle size={12} /> 超出上限 {COMPOSE_CAP}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  className="mix-go"
                  disabled={!canCompose}
                  onClick={compose}
                  title={
                    overCap
                      ? `超出上限，请减少变体或视频使乘积 ≤ ${COMPOSE_CAP}`
                      : product === 0
                        ? '先生成边框并上传视频'
                        : `生成 ${product} 条成片`
                  }
                >
                  生成 {product > 0 ? product : ''} 条成片
                </button>
              </aside>
            </div>
          </div>
        </div>
      </div>

      {resumeAsk && (
        <div className="resume-overlay" onClick={() => setResumeAsk(false)}>
          <div
            className="resume-dialog" role="alertdialog" aria-modal="true"
            aria-label="检测到未完成的操作"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="resume-title">检测到未完成的操作</h3>
            <p className="resume-desc">
              {frameBatches.length ? `已有 ${frameBatches.length} 批边框批次` : ''}
              {frameBatches.length && videos.length ? '，' : ''}
              {videos.length ? `视频池里有 ${videos.length} 条` : ''}
              ，是否继续这次套边框任务？
            </p>
            <div className="resume-actions">
              <button className="btn-outline" onClick={() => { setResumeAsk(false); onRestart(); }}>重新开始</button>
              <button className="btn-primary" autoFocus onClick={() => setResumeAsk(false)}>
                <Check size={15} /> 继续操作
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
