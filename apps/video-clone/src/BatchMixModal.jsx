import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle, ArrowLeft, ArrowUp, Check, ChevronDown, ChevronLeft, ChevronRight,
  Clock, Film, FolderOpen, GripVertical, Layers, Loader2, Music, Pause, Play,
  Plus, SkipBack, SkipForward, SlidersHorizontal, Trash2, Upload, Video, Volume2, VolumeX, X,
} from 'lucide-react';
import { notifyHostModal } from './hostModal';
import { buildMixes, countMixes, durationBands, fmtTime, minMaterials, parseClock } from './mixEngine.mjs';

/* ── 批量混剪 ──
   同一品牌的几条素材，按不同顺序拼成多条完整广告。裂变改的是一条片子的细节，
   混剪拼的是整条片子的结构，所以这里的差异来源是**顺序**，不是画面参数。

   控件、色板、弹窗与视频克隆 / 生成 / 裂变同一套（clone-page、idea-pick、fo-preset、up-dialog）。
   布局是左右两栏：左边按「生成批次」折叠看成片，右边是素材池 + 勾选参与合成 + 规则。
   素材池可多传；每次点生成，从池里勾选的素材里最多用 MAX_ACTIVE 条做排列。 */

const MAX_ACTIVE = 6;   // 单次合成勾选上限（不是素材池上限）

const TRANSITIONS = [
  { value: 'fade', label: '淡入淡出', desc: '前段渐隐、后段渐显' },
  { value: 'push-up', label: '递进', desc: '后段自下而上推进' },
  { value: 'slide-left', label: '向左滑动', desc: '后段自右向左滑入' },
  { value: 'slide-right', label: '向右滑动', desc: '后段自左向右滑入' },
  { value: 'zoom-out', label: '拉远', desc: '前段拉远淡出、后段浮现' },
];
const SEGMENT_OPTS = [
  { value: 3, label: '3 段' },
  { value: 4, label: '4 段' },
  { value: 5, label: '5 段' },
];
const LIMIT_OPTS = [
  { value: 10, label: '产出 10 条' },
  { value: 20, label: '产出 20 条' },
  { value: 50, label: '产出 50 条' },
  { value: 0, label: '产出不限' },
];
const TIPS = [
  { icon: Film, text: `合成勾选最多 ${MAX_ACTIVE} 条` },
  { icon: Clock, text: '建议单条 5–20 秒' },
  { icon: Layers, text: '顺序不同即不同成片' },
];

/* 片段条底部标签色：按在成片里的位置轮换，对齐参考里的分段色条 */
const SEG_TAG_TONES = ['tone-a', 'tone-b', 'tone-c', 'tone-d', 'tone-e'];

const shortName = name => (name || '').replace(/\.[^.]+$/, '').slice(0, 8);

const ADD_REF_POP_EST = { w: 248, h: 156 };
const VIEW_MARGIN = 8;
const VIEW_GAP = 6;

/** 加素材小菜单：按锚点四周剩余空间决定上下、左右展开，避免被素材池裁切 */
function placeAddRefPop(anchor, size = ADD_REF_POP_EST) {
  const popW = size.w;
  const popH = size.h;
  const spaceBelow = window.innerHeight - anchor.bottom - VIEW_MARGIN;
  const spaceAbove = anchor.top - VIEW_MARGIN;
  const openBelow = spaceBelow >= popH + VIEW_GAP || spaceBelow >= spaceAbove;

  let top = openBelow ? anchor.bottom + VIEW_GAP : anchor.top - popH - VIEW_GAP;
  top = Math.max(VIEW_MARGIN, Math.min(top, window.innerHeight - popH - VIEW_MARGIN));

  let left = anchor.left;
  if (left + popW > window.innerWidth - VIEW_MARGIN) left = anchor.right - popW;
  left = Math.max(VIEW_MARGIN, Math.min(left, window.innerWidth - popW - VIEW_MARGIN));

  return {
    position: 'fixed',
    top: `${Math.round(top)}px`,
    left: `${Math.round(left)}px`,
    zIndex: 10000,
  };
}

function useFloatingAddRefPop(open, anchorRef, popRef) {
  const [style, setStyle] = useState(null);

  useLayoutEffect(() => {
    if (!open) {
      setStyle(null);
      return undefined;
    }
    let raf = 0;
    const place = () => {
      const anchor = anchorRef.current?.getBoundingClientRect();
      if (!anchor) return;
      const pop = popRef.current?.getBoundingClientRect();
      setStyle(placeAddRefPop(anchor, {
        w: pop?.width || ADD_REF_POP_EST.w,
        h: pop?.height || ADD_REF_POP_EST.h,
      }));
    };
    place();
    raf = requestAnimationFrame(place);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, anchorRef, popRef]);

  return style;
}

/* 资源库的视频素材：与视频生成的资源库同一批，混剪只挑视频 */
const LIB_VIDEOS = [
  { id: 'lv-1', name: '春季_15s_A.mp4', url: 'test-clip.mp4', cover: 'frames/frame_01.jpg', meta: '00:15' },
  { id: 'lv-2', name: '片头_标准版.mp4', url: 'test-clip.mp4', cover: 'frames/frame_08.jpg', meta: '00:05' },
  { id: 'lv-3', name: '竞品_口播A.mp4', url: 'test-clip.mp4', cover: 'frames/frame_09.jpg', meta: '00:22' },
  { id: 'lv-4', name: '竞品_到账B.mp4', url: 'test-clip.mp4', cover: 'frames/frame_04.jpg', meta: '00:18' },
  { id: 'lv-5', name: '夜景转场素材.mp4', url: 'test-clip.mp4', cover: 'frames/frame_07.jpg', meta: '00:08' },
  { id: 'lv-6', name: '片尾_温情版.mp4', url: 'test-clip.mp4', cover: 'frames/frame_06.jpg', meta: '00:06' },
];

const isBlob = url => typeof url === 'string' && url.startsWith('blob:');
const revokeBlob = url => { if (isBlob(url)) URL.revokeObjectURL(url); };

/* 结果区一屏可能有上百张卡：每条素材只在加进来时抓一次首帧存成图，
   卡片用 <img> 而不是 <video>，否则几百个播放器会把页面拖垮 */
function captureCover(url) {
  return new Promise(resolve => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    let done = false;
    const finish = value => { if (!done) { done = true; resolve(value); } };
    video.onloadeddata = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 270;
        canvas.height = video.videoHeight || 480;
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        finish({ cover: canvas.toDataURL('image/jpeg', 0.7), duration: video.duration || 0 });
      } catch { finish({ cover: '', duration: video.duration || 0 }); }
    };
    video.onerror = () => finish({ cover: '', duration: 0 });
    setTimeout(() => finish({ cover: '', duration: video.duration || 0 }), 2500);
    video.src = url;
    video.currentTime = 0.1;
  });
}

/* 底栏下拉：与视频生成底栏的参数选择器同一套 idea-pick */
function MixPick({ value, options, onChange, title, align = 'right', renderOption = null }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const current = options.find(o => o.value === value) || options[0];
  useEffect(() => {
    if (!open) return undefined;
    const away = e => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    const esc = e => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc, true);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc, true); };
  }, [open]);
  return (
    <div className={`idea-pick ${open ? 'open' : ''}`} ref={wrapRef} title={title}>
      <button type="button" className="idea-pick-btn" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-label={title}>
        <span className="idea-pick-val">{current?.label}</span>
        <ChevronDown size={13} className="idea-pick-chev" />
      </button>
      {open && (
        <div className={`idea-pick-menu idea-pick-menu--${align} idea-pick-menu--up`} role="listbox">
          {options.map(opt => (
            <button
              type="button" key={String(opt.value)} role="option" aria-selected={opt.value === value}
              className={`idea-pick-opt ${opt.value === value ? 'sel' : ''}`}
              onClick={() => { onChange(opt.value); setOpen(false); }}
            >
              {renderOption ? renderOption(opt) : <span>{opt.label}</span>}
              {opt.value === value && <Check size={13} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* 素材池里的「添加」格：本地上传 / 资源库二选一，底栏不再重复放「继续上传」 */
function MixSlotAdd({ poolCount, activeCount, onFiles, onOpenLibrary }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const btnRef = useRef(null);
  const popRef = useRef(null);
  const fileRef = useRef(null);
  const popStyle = useFloatingAddRefPop(open, btnRef, popRef);

  useEffect(() => {
    if (!open) return undefined;
    const away = e => {
      const t = e.target;
      if (wrapRef.current?.contains(t) || popRef.current?.contains(t)) return;
      setOpen(false);
    };
    const esc = e => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc, true);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc, true); };
  }, [open]);

  const menu = open && popStyle && createPortal(
    <div ref={popRef} className="add-ref-pop add-ref-pop--floating" role="menu" style={popStyle}>
      <button type="button" role="menuitem" className="add-ref-src" onClick={() => { setOpen(false); fileRef.current?.click(); }}>
        <Upload size={16} strokeWidth={1.7} />
        <span className="add-ref-src-text"><b>本地上传</b><em>视频素材 / 配乐，可多选</em></span>
      </button>
      <button type="button" role="menuitem" className="add-ref-src" onClick={() => { setOpen(false); onOpenLibrary(); }}>
        <FolderOpen size={16} strokeWidth={1.7} />
        <span className="add-ref-src-text"><b>从资源库选择</b><em>已有视频素材</em></span>
      </button>
      <div className="add-ref-quota">
        <span className="add-ref-q">池内 {poolCount} · 已勾选 {activeCount}/{MAX_ACTIVE}</span>
      </div>
    </div>,
    document.body,
  );

  return (
    <div className="mix-slot-add-wrap" ref={wrapRef}>
      <input
        ref={fileRef} type="file" hidden multiple accept="video/*,audio/*"
        onChange={e => { if (e.target.files?.length) onFiles(e.target.files); e.target.value = ''; }}
      />
      <button
        ref={btnRef}
        type="button" className={`mix-slot-add ${open ? 'is-open' : ''}`} aria-expanded={open}
        onClick={() => setOpen(o => !o)} title="添加素材"
      >
        <Plus size={15} strokeWidth={2} />
        <span>添加</span>
      </button>
      {menu}
    </div>
  );
}

/* 从资源库挑素材：与视频生成的资源库弹窗同一套 up-dialog；素材池不设条数上限 */
function ClipLibraryDialog({ chosenIds, onConfirm, onClose }) {
  const [picked, setPicked] = useState([]);
  useEffect(() => {
    notifyHostModal(true);
    const esc = e => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', esc, true);
    return () => { window.removeEventListener('keydown', esc, true); notifyHostModal(false); };
  }, [onClose]);
  const toggle = item => setPicked(prev => (
    prev.some(p => p.id === item.id) ? prev.filter(p => p.id !== item.id) : [...prev, item]
  ));
  return (
    <div className="up-dialog-overlay" onClick={onClose}>
      <div className="up-dialog up-dialog--lib" role="dialog" aria-modal="true" aria-label="从资源库选择素材" onClick={e => e.stopPropagation()}>
        <div className="up-dialog-head">
          <span className="up-dialog-title">从资源库选择 <em>我的资源库</em></span>
          <button className="up-dialog-x" onClick={onClose} aria-label="关闭"><X size={16} /></button>
        </div>
        <div className="up-body up-body--lib">
          <div className="up-lib up-lib--named">
            {LIB_VIDEOS.map(item => {
              const already = chosenIds.includes(item.id);
              const sel = picked.some(p => p.id === item.id);
              return (
                <button
                  key={item.id} type="button" disabled={already}
                  className={`up-lib-item up-lib-item--named ${sel ? 'picked' : ''}`}
                  style={{ aspectRatio: '3/4' }}
                  title={already ? '已在素材池中' : item.name}
                  onClick={() => toggle(item)}
                >
                  <img src={item.cover} alt="" />
                  <span className="up-lib-play"><Film size={12} strokeWidth={2} /></span>
                  {sel && <span className="up-lib-check"><Check size={12} /></span>}
                  <span className="up-lib-cap"><b>{item.name}</b><em>{item.meta}</em></span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="up-foot">
          <span className="up-foot-hint"><span className="up-foot-q">已选 {picked.length} 条，加入素材池后可勾选参与合成</span></span>
          <div className="up-foot-btns">
            <button type="button" className="btn-outline" onClick={onClose}>取消</button>
            <button type="button" className="btn-primary" disabled={!picked.length} onClick={() => { onConfirm(picked); onClose(); }}>
              <Check size={15} /> 添加 {picked.length ? `${picked.length} 条` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* 更多设置：把不常改但要能改的三项收进来（对齐筷子底栏的「其他配置」） */
function MoreSettings({ leadLock, onLeadLock, bgm, onBgmFile, onBgmClear, keepVoice, onKeepVoice }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const fileRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const away = e => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    const esc = e => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc, true);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc, true); };
  }, [open]);
  const dirty = leadLock || !!bgm;
  return (
    <div className="mix-more" ref={wrapRef}>
      <input
        ref={fileRef} type="file" hidden accept="audio/*"
        onChange={e => { if (e.target.files?.[0]) onBgmFile(e.target.files[0]); e.target.value = ''; }}
      />
      <button
        type="button" className={`mix-more-btn ${dirty ? 'is-on' : ''}`} aria-expanded={open}
        onClick={() => setOpen(o => !o)} title="更多设置"
      >
        <SlidersHorizontal size={15} strokeWidth={1.9} />
      </button>
      {open && (
        <div className="mix-more-pop" role="menu">
          <div className="mix-more-row">
            <span className="mix-more-text">
              <b>片头锁定</b>
              <em>第一段固定不变，只让后面的段落变化</em>
            </span>
            <button
              type="button" className={`fo-preset-control ${leadLock ? 'is-on' : ''}`} role="switch" aria-checked={leadLock}
              onClick={() => onLeadLock(!leadLock)}
            >
              <span className="fo-preset-switch" aria-hidden="true"><i /></span>
            </button>
          </div>
          <div className="mix-more-row">
            <span className="mix-more-text">
              <b>配乐</b>
              <em>{bgm ? bgm.name : '未添加，成片使用素材原声'}</em>
            </span>
            {bgm
              ? <button type="button" className="mix-more-link" onClick={onBgmClear}>移除</button>
              : <button type="button" className="mix-more-link" onClick={() => fileRef.current?.click()}>上传</button>}
          </div>
          <div className={`mix-more-row ${bgm ? '' : 'is-off'}`}>
            <span className="mix-more-text">
              <b>保留原声</b>
              <em>{bgm ? (keepVoice ? '原声 + 配乐混音' : '仅配乐，素材原声静音') : '添加配乐后可选'}</em>
            </span>
            <button
              type="button" className={`fo-preset-control ${bgm && keepVoice ? 'is-on' : ''}`} role="switch"
              aria-checked={keepVoice} disabled={!bgm} onClick={() => onKeepVoice(!keepVoice)}
            >
              <span className="fo-preset-switch" aria-hidden="true"><i /></span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* 拼接轨道上的一个片段：勾选后才参与本次合成，池内可多过 MAX_ACTIVE */
function TrackClip({
  mat, index, lead, active, activeRank, canActivate,
  dragging, onToggleActive, onRemove, onDragStart, onDrop, onDragEnd,
}) {
  return (
    <div
      className={`mix-clip ${active ? 'is-active' : ''} ${lead ? 'is-lead' : ''} ${dragging ? 'is-dragging' : ''}`}
      draggable
      onDragStart={e => { onDragStart(mat.id); e.dataTransfer.effectAllowed = 'move'; }}
      onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('is-over'); }}
      onDragLeave={e => e.currentTarget.classList.remove('is-over')}
      onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('is-over'); onDrop(mat.id); }}
      onDragEnd={e => { e.currentTarget.classList.remove('is-over'); onDragEnd(); }}
      title={lead ? `${mat.name}（片头锁定）` : active ? `${mat.name} · 参与合成 · 拖动调整顺序` : `${mat.name} · 勾选后参与合成`}
    >
      <label
        className={`mix-clip-pick ${!active && !canActivate ? 'is-blocked' : ''}`}
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
        title={!active && !canActivate ? `单次合成最多勾选 ${MAX_ACTIVE} 条` : (active ? '取消参与合成' : '勾选参与合成')}
      >
        <input
          type="checkbox"
          checked={active}
          disabled={!active && !canActivate}
          onChange={onToggleActive}
          aria-label={active ? `取消勾选 ${mat.name}` : `勾选 ${mat.name} 参与合成`}
        />
        <span className="mix-tick-box"><Check size={10} strokeWidth={3} /></span>
      </label>
      <span className="mix-clip-media">
        {mat.cover
          ? <img className="mix-clip-cover" src={mat.cover} alt="" />
          : <span className="mix-clip-fallback"><Video size={16} strokeWidth={1.6} /></span>}
        <span className="mix-clip-no">{active ? activeRank + 1 : index + 1}</span>
        {lead && <span className="mix-clip-lead">片头</span>}
        <span className="mix-clip-time">{fmtTime(mat.duration)}</span>
        <GripVertical size={12} className="mix-clip-grip" aria-hidden="true" />
        <button type="button" className="idea-chip-close mix-clip-x" onClick={() => onRemove(mat.id)} aria-label={`移除 ${mat.name}`}>
          <X size={10} />
        </button>
      </span>
      <span className="mix-clip-name" title={mat.name}>{mat.name}</span>
    </div>
  );
}

export function BatchMixModal({ onClose, onRestart, visible = true, embedded = false }) {
  const [materials, setMaterials] = useState([]);
  const [activeIds, setActiveIds] = useState(() => new Set()); // 勾选参与本次合成，≤ MAX_ACTIVE
  const [bgm, setBgm] = useState(null);
  const [leadLock, setLeadLock] = useState(false);
  const [keepVoice, setKeepVoice] = useState(true);
  const [segments, setSegments] = useState(3);
  const [transition, setTransition] = useState('fade');
  const [limit, setLimit] = useState(20);
  const [batches, setBatches] = useState([]); // 每次生成追加一批，左侧可折叠
  const [band, setBand] = useState('all');
  const [busy, setBusy] = useState(false);
  const [libOpen, setLibOpen] = useState(false);
  const [resumeAsk, setResumeAsk] = useState(false);
  const [previewAt, setPreviewAt] = useState(null); // flatShown 下标
  const [dragId, setDragId] = useState(null);
  const [selected, setSelected] = useState(() => new Set());   // 跨批勾选导出
  const rootRef = useRef(null);
  const poolInputRef = useRef(null);
  const resultRef = useRef(null);
  const wasVisible = useRef(visible);
  const batchesRef = useRef(batches);
  batchesRef.current = batches;

  const activeMaterials = useMemo(
    () => materials.filter(m => activeIds.has(m.id)),
    [materials, activeIds],
  );
  const hasProgress = materials.length > 0 || batches.length > 0;
  const total = countMixes(activeMaterials.length, segments, leadLock);
  const need = minMaterials(segments);
  const willMake = total ? (limit > 0 ? Math.min(total, limit) : total) : 0;
  const allMixes = useMemo(() => batches.flatMap(b => b.mixes), [batches]);
  const bands = useMemo(() => durationBands(allMixes), [allMixes]);
  const flatShown = useMemo(() => {
    const hit = band === 'all' ? null : bands.find(b => b.key === band);
    const rows = [];
    batches.forEach(batch => {
      batch.mixes.forEach((mix, i) => {
        if (hit && (mix.duration < hit.min || mix.duration >= hit.max)) return;
        rows.push({
          key: `${batch.id}::${mix.id}`,
          batch,
          mix,
          localIndex: i,
          flatIndex: rows.length,
        });
      });
    });
    return rows;
  }, [batches, band, bands]);
  const rowsByBatch = useMemo(() => {
    const map = new Map();
    flatShown.forEach(row => {
      if (!map.has(row.batch.id)) map.set(row.batch.id, []);
      map.get(row.batch.id).push(row);
    });
    return map;
  }, [flatShown]);
  const transitionLabel = TRANSITIONS.find(t => t.value === transition)?.label || '';
  const poolDuration = materials.reduce((sum, m) => sum + (m.duration || 0), 0);
  const allPicked = flatShown.length > 0 && flatShown.every(r => selected.has(r.key));
  const durRange = flatShown.length
    ? (() => {
      const list = flatShown.map(r => r.mix.duration);
      const lo = Math.min(...list);
      const hi = Math.max(...list);
      return lo === hi ? fmtTime(lo) : `${fmtTime(lo)} ~ ${fmtTime(hi)}`;
    })()
    : '';

  const clearPool = () => {
    materials.forEach(m => revokeBlob(m.url));
    setMaterials([]);
    setActiveIds(new Set());
    setBatches([]);
    setSelected(new Set());
    setPreviewAt(null);
  };
  const togglePick = key => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });
  const toggleAll = () => setSelected(prev => (
    allPicked ? new Set() : new Set(flatShown.map(r => r.key))
  ));
  const toggleBatchPick = (batchId, keys) => {
    setSelected(prev => {
      const next = new Set(prev);
      const allOn = keys.length > 0 && keys.every(k => next.has(k));
      if (allOn) keys.forEach(k => next.delete(k));
      else keys.forEach(k => next.add(k));
      return next;
    });
  };
  const toggleCollapse = batchId => setBatches(prev => prev.map(b => (
    b.id === batchId ? { ...b, collapsed: !b.collapsed } : b
  )));
  const toggleActive = id => setActiveIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else if (next.size < MAX_ACTIVE) next.add(id);
    return next;
  });

  const warn = activeMaterials.length < need
    ? `${segments} 段成片至少勾选 ${need} 条素材，当前已勾选 ${activeMaterials.length} 条`
    : '';

  const exit = useCallback(() => onClose(hasProgress), [onClose, hasProgress]);

  // 被宿主隐藏时暂停播放；再次打开且还有素材，问一次是继续还是重来
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
      if (libOpen || resumeAsk || previewAt !== null) return;   // 各自的层自己收 Esc
      exit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, libOpen, resumeAsk, previewAt, exit]);

  const matsRef = useRef(materials);
  matsRef.current = materials;
  const bgmRef = useRef(bgm);
  bgmRef.current = bgm;
  useEffect(() => () => {
    matsRef.current.forEach(m => revokeBlob(m.url));
    revokeBlob(bgmRef.current?.url);
  }, []);

  const addFiles = useCallback(fileList => {
    const files = Array.from(fileList || []);
    const audio = files.find(f => (f.type || '').startsWith('audio/'));
    if (audio) {
      setBgm(prev => { revokeBlob(prev?.url); return { name: audio.name, url: URL.createObjectURL(audio) }; });
    }
    const videos = files.filter(f => (f.type || '').startsWith('video/'));
    if (!videos.length) return;
    setMaterials(prev => {
      const added = videos.map((file, i) => ({
        id: `mix-local-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        name: file.name,
        source: 'local',
        url: URL.createObjectURL(file),
        cover: '',
        duration: 0,
      }));
      added.forEach(mat => {
        captureCover(mat.url).then(({ cover, duration }) => {
          setMaterials(cur => cur.map(m => (m.id === mat.id ? { ...m, cover: cover || m.cover, duration: duration || m.duration } : m)));
        });
      });
      // 池空时自动勾选前 MAX_ACTIVE 条，降低「忘了勾选」的空操作
      setActiveIds(cur => {
        if (cur.size > 0 || prev.length > 0) return cur;
        return new Set(added.slice(0, MAX_ACTIVE).map(m => m.id));
      });
      return [...prev, ...added];
    });
  }, []);

  const addFromLibrary = useCallback(items => {
    setMaterials(prev => {
      const added = items
        .filter(item => !prev.some(m => m.libId === item.id))
        .map(item => ({
          id: `mix-lib-${item.id}`,
          libId: item.id,
          name: item.name,
          source: 'library',
          url: item.url,
          cover: item.cover,
          duration: parseClock(item.meta),
        }));
      setActiveIds(cur => {
        if (cur.size > 0 || prev.length > 0) return cur;
        return new Set(added.slice(0, MAX_ACTIVE).map(m => m.id));
      });
      return [...prev, ...added];
    });
  }, []);

  const removeMaterial = id => {
    setMaterials(prev => {
      const gone = prev.find(m => m.id === id);
      const keptInBatch = batchesRef.current.some(b => b.matsById[id]);
      if (gone && !keptInBatch) revokeBlob(gone.url);
      return prev.filter(m => m.id !== id);
    });
    setActiveIds(prev => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const dropOn = targetId => {
    if (!dragId || dragId === targetId) return;
    setMaterials(prev => {
      const next = [...prev];
      const from = next.findIndex(m => m.id === dragId);
      const to = next.findIndex(m => m.id === targetId);
      if (from < 0 || to < 0) return prev;
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const generate = () => {
    if (warn || busy || !total) return;
    setBusy(true);
    setTimeout(() => {
      const built = buildMixes(activeMaterials, segments, leadLock, limit);
      const matsById = Object.fromEntries(activeMaterials.map(m => [m.id, {
        id: m.id, name: m.name, url: m.url, cover: m.cover, duration: m.duration,
      }]));
      const batch = {
        id: `batch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        mixes: built,
        matsById,
        segments,
        leadLock,
        transition,
        transitionLabel,
        collapsed: false,
      };
      setBatches(prev => [
        { ...batch },
        ...prev.map(b => ({ ...b, collapsed: true })),
      ]);
      setBand('all');
      setPreviewAt(null);
      setBusy(false);
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }, 900);
  };

  const previewRow = previewAt !== null ? flatShown[previewAt] : null;

  return (
    <div className="clone-page" ref={rootRef} style={visible ? undefined : { display: 'none' }}>
      {!embedded && (
        <aside className="clone-sidebar">
          <button className="clone-sidebar-logo" onClick={exit} title="返回工具箱">
            <span className="logo-mark">S</span><span className="logo-text">SELVA</span>
          </button>
        </aside>
      )}
      <div className="clone-main">
        <div className="clone-topbar">
          <div className="clone-topbar-left">
            <button className="icon-btn" onClick={exit} title="返回"><ArrowLeft size={18} /></button>
            <span className="clone-topbar-title">批量混剪</span>
          </div>
          <button className="icon-btn" onClick={exit} title="关闭"><X size={18} /></button>
        </div>
        <div className="clone-page-body">
          <div className="clone-page-inner">
            {/* 工作台：左边看成片，右边配素材与规则。素材一多，结果区一屏能扫完。
                 多素材工具没有独立欢迎页——素材池要反复加删排序，开场就该是它自己 */}
            <div className="mix-work" ref={resultRef}>
                <section className="mix-out">
                  <header className="mix-out-head">
                    <div className="mix-out-title">
                      批量混剪
                      <span className="mix-out-sub">
                        {batches.length ? `${batches.length} 批 · ${allMixes.length} 条成片` : ''}
                        {batches.length ? '' : `${transitionLabel}转场`}
                        {bgm ? ' · 已配乐' : ''}
                      </span>
                    </div>
                  </header>

                  <div className="mix-out-body">
                    {busy ? (
                      <div className="mix-batch">
                        <div className="mix-batch-head mix-batch-head--static">
                          <ChevronDown size={14} className="mix-batch-chevron" />
                          <span className="mix-batch-title">新一批生成中…</span>
                          <em className="mix-batch-meta">{willMake} 条</em>
                        </div>
                        <div className="mix-rows">
                          {Array.from({ length: Math.min(willMake, 8) }, (_, i) => (
                            <div key={i} className="mix-row mix-row--wait">
                              <span className="mix-row-idx">{i + 1}</span>
                              <span className="mix-row-cover mix-row-cover--wait" />
                              <span className="mix-row-seq">
                                {Array.from({ length: segments }, (_, k) => (
                                  <span key={k} className="mix-seg mix-seg--wait" />
                                ))}
                              </span>
                              <span className="mix-row-tail"><Loader2 size={13} className="spinner" /> 待合成</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : batches.length ? (
                      <div className="mix-batches">
                        {batches.map((batch, batchOrd) => {
                          const rows = rowsByBatch.get(batch.id) || [];
                          const keys = rows.map(r => r.key);
                          const batchAll = keys.length > 0 && keys.every(k => selected.has(k));
                          const batchN = batches.length - batchOrd;
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
                                    {batch.mixes.length} 条 · {batch.transitionLabel}转场
                                    {batch.leadLock ? ' · 片头锁定' : ''}
                                  </em>
                                </button>
                                <label className="mix-tick mix-batch-tick" onClick={e => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={batchAll}
                                    disabled={!keys.length}
                                    onChange={() => toggleBatchPick(batch.id, keys)}
                                    aria-label={`全选第 ${batchN} 批`}
                                  />
                                  <span className="mix-tick-box"><Check size={11} strokeWidth={3} /></span>
                                </label>
                              </div>
                              {!batch.collapsed && (
                                rows.length ? (
                                  <div className="mix-rows">
                                    <div className="mix-rows-head">
                                      <span className="mix-rows-h1">序号</span>
                                      <span className="mix-rows-h-cover">封面</span>
                                      <span className="mix-rows-h2">拼接片段<em>点击任意一条可预览拼接效果</em></span>
                                      <span className="mix-rows-h3">{durRange}</span>
                                    </div>
                                    {rows.map(row => {
                                      const { mix, key, flatIndex } = row;
                                      const names = mix.seq.map(id => batch.matsById[id]?.name || '?').join(' → ');
                                      const on = selected.has(key);
                                      const coverMat = batch.matsById[mix.seq[0]];
                                      return (
                                        <div
                                          key={key} className={`mix-row ${on ? 'is-picked' : ''}`}
                                          role="button" tabIndex={0} title={names}
                                          onClick={() => setPreviewAt(flatIndex)}
                                          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPreviewAt(flatIndex); } }}
                                        >
                                          <label className="mix-tick mix-row-tick" onClick={e => e.stopPropagation()}>
                                            <input type="checkbox" checked={on} onChange={() => togglePick(key)} aria-label={`选择 ${names}`} />
                                            <span className="mix-tick-box"><Check size={11} strokeWidth={3} /></span>
                                          </label>

                                          <span className="mix-row-idx">{row.localIndex + 1}</span>

                                          <span className="mix-row-cover" title="成片封面">
                                            {coverMat?.cover
                                              ? <img src={coverMat.cover} alt="" />
                                              : <span className="mix-clip-fallback"><Video size={16} strokeWidth={1.4} /></span>}
                                          </span>

                                          <span className="mix-row-seq">
                                            {mix.seq.map((id, k) => {
                                              const mat = batch.matsById[id];
                                              return (
                                                <span key={`${id}-${k}`} className={`mix-seg ${batch.leadLock && k === 0 ? 'is-lead' : ''}`} title={mat?.name}>
                                                  <span className="mix-seg-media">
                                                    {mat?.cover
                                                      ? <img src={mat.cover} alt="" />
                                                      : <span className="mix-clip-fallback"><Video size={14} strokeWidth={1.4} /></span>}
                                                    <b className="mix-seg-no">{k + 1}</b>
                                                  </span>
                                                  <span className={`mix-seg-label ${SEG_TAG_TONES[k % SEG_TAG_TONES.length]}`}>
                                                    {shortName(mat?.name) || `片段 ${k + 1}`}
                                                  </span>
                                                </span>
                                              );
                                            })}
                                          </span>

                                          <span className="mix-row-play"><Play size={14} /></span>
                                          <span className="mix-row-tail">{fmtTime(mix.duration)}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <p className="mix-batch-empty">本批没有符合当前时长筛选的成片</p>
                                )
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="mix-out-empty">
                        {materials.length === 0 ? (
                          <>
                            <span className="mix-out-empty-icon" aria-hidden="true">
                              <Layers size={40} strokeWidth={1.2} />
                            </span>
                            <h3 className="mix-out-empty-title">同品牌素材，批量成片</h3>
                            <p>素材池可多传，勾选最多 {MAX_ACTIVE} 条参与合成；每次生成在左侧落成一批</p>
                            <div className="upload-tips">
                              {TIPS.map(tip => (
                                <span key={tip.text} className="upload-tip"><tip.icon size={13} strokeWidth={1.8} />{tip.text}</span>
                              ))}
                            </div>
                          </>
                        ) : (
                          <>
                            <Layers size={26} strokeWidth={1.3} />
                            <p>右边勾选素材并配好规则，点「生成 {willMake} 条成片」出片</p>
                            <span>已勾选 {activeMaterials.length}/{MAX_ACTIVE}，可拼出 {total} 条</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <footer className="mix-out-foot">
                    <label className="mix-tick mix-tick--all">
                      <input type="checkbox" checked={allPicked} onChange={toggleAll} disabled={!flatShown.length} aria-label="全选" />
                      <span className="mix-tick-box"><Check size={11} strokeWidth={3} /></span>
                      <span className="mix-foot-txt">已选 {selected.size} 个</span>
                    </label>
                    <div className="mix-out-foot-r">
                      {bands.length > 1 && (
                        <MixPick
                          value={band} title="按时长筛选" align="right"
                          options={[{ value: 'all', label: '全部时长' }, ...bands.map(b => ({ value: b.key, label: b.label }))]}
                          onChange={setBand}
                        />
                      )}
                      <button type="button" className="btn-primary" disabled={!selected.size}>
                        导出视频{selected.size ? ` (${selected.size})` : ''}
                      </button>
                    </div>
                  </footer>
                </section>

                <aside className="mix-side">
                  <div className="mix-pool-card">
                    {materials.length === 0 ? (
                      <div
                        className="mix-pool-empty"
                        onClick={() => poolInputRef.current?.click()}
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => { e.preventDefault(); if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files); }}
                      >
                        <span className="upload-card-icon"><Video size={22} strokeWidth={1.5} /></span>
                        <span className="upload-card-title">上传视频素材</span>
                        <span className="upload-card-hint">MP4 / MOV · 池内不限 · 合成勾选最多 {MAX_ACTIVE} 条</span>
                        <span className="upload-card-btns">
                          <button type="button" className="btn-primary btn-sm" onClick={e => { e.stopPropagation(); poolInputRef.current?.click(); }}>
                            <Upload size={13} /> 上传视频
                          </button>
                          <button type="button" className="btn-outline btn-sm" onClick={e => { e.stopPropagation(); setLibOpen(true); }}>
                            <FolderOpen size={13} /> 从资源库选择
                          </button>
                        </span>
                      </div>
                    ) : (
                    <div className="mix-pool" role="list" aria-label="素材池">
                      {materials.map((mat, i) => {
                        const active = activeIds.has(mat.id);
                        const activeRank = active ? activeMaterials.findIndex(m => m.id === mat.id) : -1;
                        return (
                          <TrackClip
                            key={mat.id} mat={mat} index={i}
                            active={active}
                            activeRank={activeRank}
                            canActivate={activeIds.size < MAX_ACTIVE}
                            lead={leadLock && active && activeRank === 0}
                            dragging={dragId === mat.id}
                            onToggleActive={() => toggleActive(mat.id)}
                            onRemove={removeMaterial}
                            onDragStart={setDragId}
                            onDrop={dropOn}
                            onDragEnd={() => setDragId(null)}
                          />
                        );
                      })}
                      <MixSlotAdd
                        poolCount={materials.length}
                        activeCount={activeIds.size}
                        onFiles={addFiles}
                        onOpenLibrary={() => setLibOpen(true)}
                      />
                    </div>
                    )}
                    <div className="mix-pool-foot">
                      <span className="mix-pool-stat">
                        池内 {materials.length} · 已勾选 {activeIds.size}/{MAX_ACTIVE} · {fmtTime(poolDuration)}
                      </span>
                      <span className="mix-pool-acts">
                        <input
                          ref={poolInputRef} type="file" hidden multiple accept="video/*,audio/*"
                          onChange={e => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ''; }}
                        />
                        <button type="button" onClick={clearPool}><Trash2 size={12} /> 清空</button>
                      </span>
                    </div>
                  </div>

                  {/* 配置即算量：改任一项，这块立刻跟着变 */}
                  <div className="mix-meter-card">
                    <div className="mix-meter-top">
                      <span className="mix-meter-n">{total}</span>
                      <span className="mix-meter-unit">条可生成</span>
                    </div>
                    <p className="mix-meter-desc">
                      已勾选 {activeMaterials.length} 条按不同顺序拼成 {segments} 段成片
                      {leadLock ? '，第一段锁定为片头' : ''}
                    </p>
                    {total > 0 && (
                      <p className="mix-meter-out">本次产出 <b>{willMake}</b> 条{limit > 0 && total > limit ? `（上限 ${limit} 条）` : ''}</p>
                    )}
                  </div>

                  {warn && (
                    <div className="composer-warn" role="alert">
                      <AlertCircle size={13} strokeWidth={2} /><span>{warn}</span>
                    </div>
                  )}

                  <div className="mix-params">
                    <MixPick value={segments} options={SEGMENT_OPTS} onChange={setSegments} title="每条成片的片段数" align="right" />
                    <MixPick
                      value={transition} options={TRANSITIONS} onChange={setTransition} title="转场" align="right"
                      renderOption={opt => (
                        <span className="mix-trans-opt">
                          <span className="mix-trans-demo" data-trans={opt.value}><i className="mix-trans-a" /><i className="mix-trans-b" /></span>
                          <span className="mix-trans-text"><b>{opt.label}</b><em>{opt.desc}</em></span>
                        </span>
                      )}
                    />
                    <MixPick value={limit} options={LIMIT_OPTS} onChange={setLimit} title="限制产出条数" align="right" />
                    <MoreSettings
                      leadLock={leadLock} onLeadLock={setLeadLock}
                      bgm={bgm}
                      onBgmFile={file => setBgm(prev => { revokeBlob(prev?.url); return { name: file.name, url: URL.createObjectURL(file) }; })}
                      onBgmClear={() => { revokeBlob(bgm?.url); setBgm(null); }}
                      keepVoice={keepVoice} onKeepVoice={setKeepVoice}
                    />
                  </div>

                  <button
                    type="button" className="mix-go" disabled={!!warn || busy || !total} onClick={generate}
                    title={warn || (busy ? '正在生成' : `生成 ${willMake} 条成片`)}
                  >
                    {busy ? <><Loader2 size={15} className="spinner" /> 正在生成…</> : <>生成 {willMake} 条成片</>}
                  </button>
                </aside>
            </div>
          </div>
        </div>
      </div>

      {libOpen && (
        <ClipLibraryDialog
          chosenIds={materials.map(m => m.libId).filter(Boolean)}
          onConfirm={addFromLibrary}
          onClose={() => setLibOpen(false)}
        />
      )}

      {resumeAsk && (
        <div className="resume-overlay" onClick={() => setResumeAsk(false)}>
          <div className="resume-dialog" role="alertdialog" aria-modal="true" aria-label="检测到未完成的操作" onClick={e => e.stopPropagation()}>
            <h3 className="resume-title">检测到未完成的操作</h3>
            <p className="resume-desc">
              {materials.length ? `素材池里还有 ${materials.length} 条素材` : ''}
              {materials.length && batches.length ? '，' : ''}
              {batches.length ? `已生成 ${batches.length} 批成片` : ''}
              ，是否继续这次批量混剪？
            </p>
            <div className="resume-actions">
              <button className="btn-outline" onClick={() => { setResumeAsk(false); onRestart(); }}>重新开始</button>
              <button className="btn-primary" autoFocus onClick={() => setResumeAsk(false)}><Check size={15} /> 继续操作</button>
            </div>
          </div>
        </div>
      )}

      {previewRow && (
        <MixPreview
          mix={previewRow.mix}
          materials={Object.values(previewRow.batch.matsById)}
          transition={previewRow.batch.transition}
          transitionLabel={previewRow.batch.transitionLabel}
          bgm={bgm}
          keepVoice={keepVoice}
          index={previewAt}
          count={flatShown.length}
          onPrev={() => setPreviewAt(i => Math.max(0, i - 1))}
          onNext={() => setPreviewAt(i => Math.min(flatShown.length - 1, i + 1))}
          onClose={() => setPreviewAt(null)}
        />
      )}
    </div>
  );
}

/* 拼接预览：两层播放器交替，切段时按所选转场做动画，配乐单独一路音轨。
   demo 不做真合成，这里演的就是成片实际会长成的样子。 */
function MixPreview({
  mix, materials, transition, transitionLabel, bgm, keepVoice,
  index, count, onPrev, onNext, onClose,
}) {
  const clips = useMemo(
    () => mix.seq.map(id => materials.find(m => m.id === id)).filter(Boolean),
    [mix, materials],
  );
  const total = clips.reduce((sum, c) => sum + (c.duration || 0), 0);
  const [at, setAt] = useState(0);          // 当前第几段
  const [layer, setLayer] = useState(0);    // 0/1 哪一层在前台
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(!keepVoice);
  const [elapsed, setElapsed] = useState(0);
  const [moving, setMoving] = useState(false);
  const layerA = useRef(null);
  const layerB = useRef(null);
  const audioRef = useRef(null);
  const atRef = useRef(0);
  const movingRef = useRef(false);
  atRef.current = at;
  movingRef.current = moving;

  const layers = () => [layerA.current, layerB.current];
  const front = () => layers()[layer % 2];
  const back = () => layers()[(layer + 1) % 2];

  useEffect(() => {
    notifyHostModal(true);
    const esc = e => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', esc, true);
    return () => { window.removeEventListener('keydown', esc, true); notifyHostModal(false); };
  }, [onClose, onPrev, onNext]);

  // 换一条成片：回到第一段
  useEffect(() => {
    setAt(0); setLayer(0); setPlaying(false); setElapsed(0); setMoving(false);
    const [a, b] = layers();
    if (a && clips[0]) { a.src = clips[0].url; a.currentTime = 0; a.muted = muted; }
    if (b) { b.pause(); b.removeAttribute('src'); b.load(); }
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
  }, [mix.id]);   // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { layers().forEach(el => { if (el) el.muted = muted; }); }, [muted, layer]);

  const goTo = (nextAt, autoplay) => {
    const clip = clips[nextAt];
    if (!clip) return;
    const el = front();
    if (!el) return;
    setMoving(false);
    setAt(nextAt);
    el.src = clip.url;
    el.currentTime = 0;
    el.muted = muted;
    const before = clips.slice(0, nextAt).reduce((s, c) => s + (c.duration || 0), 0);
    setElapsed(before);
    if (audioRef.current && bgm) audioRef.current.currentTime = Math.min(before, audioRef.current.duration || before);
    if (autoplay) { el.play().catch(() => {}); setPlaying(true); }
    else { el.pause(); setPlaying(false); audioRef.current?.pause(); }
  };

  // 走到本段结尾就切下一段：后台层先起播，两层同时做转场动画，动画完成后互换前后台
  const advance = () => {
    if (movingRef.current) return;
    const nextIdx = atRef.current + 1;
    const nextClip = clips[nextIdx];
    if (!nextClip) { setPlaying(false); return; }
    const nextEl = back();
    if (!nextEl) return;
    nextEl.src = nextClip.url;
    nextEl.currentTime = 0;
    nextEl.muted = muted;
    nextEl.play().catch(() => {});
    setMoving(true);
    setTimeout(() => {
      setLayer(l => l + 1);
      setAt(nextIdx);
      setMoving(false);
      const outgoing = layers()[layer % 2];   // 刚退到后台的那一层，停掉别继续跑
      if (outgoing) outgoing.pause();
    }, 620);
  };

  useEffect(() => {
    if (!playing) return undefined;
    const timer = setInterval(() => {
      const el = front();
      if (!el) return;
      const clip = clips[atRef.current];
      const dur = clip?.duration || el.duration || 0;
      const pos = Number.isFinite(el.currentTime) ? el.currentTime : 0;
      const before = clips.slice(0, atRef.current).reduce((s, c) => s + (c.duration || 0), 0);
      setElapsed(Math.min(before + pos, total));
      if (dur > 0 && pos >= dur - 0.18) {
        if (atRef.current >= clips.length - 1) { el.pause(); setPlaying(false); audioRef.current?.pause(); }
        else advance();
      }
    }, 120);
    return () => clearInterval(timer);
  }, [playing, layer, clips, total]);   // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = () => {
    const el = front();
    if (!el) return;
    if (playing) {
      el.pause(); audioRef.current?.pause(); setPlaying(false);
    } else {
      if (!el.src && clips[at]) el.src = clips[at].url;
      el.play().catch(() => {});
      if (bgm && audioRef.current) audioRef.current.play().catch(() => {});
      setPlaying(true);
    }
  };

  const seekBar = e => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    let acc = 0;
    for (let i = 0; i < clips.length; i += 1) {
      const dur = clips[i].duration || 0;
      if (ratio * total <= acc + dur || i === clips.length - 1) { goTo(i, playing); return; }
      acc += dur;
    }
  };

  const frontIsA = layer % 2 === 0;
  const cls = (isFront) => [
    'mix-pv-layer',
    isFront ? 'is-front' : 'is-back',
    moving ? (isFront ? 'is-out' : 'is-in') : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="up-dialog-overlay" onClick={onClose}>
      <div className="up-dialog mix-preview" role="dialog" aria-modal="true" aria-label="拼接预览" onClick={e => e.stopPropagation()}>
        <div className="up-dialog-head">
          <span className="up-dialog-title">
            拼接预览 <em>{transitionLabel}转场{bgm ? ' · 已配乐' : ''}</em>
          </span>
          <div className="mix-preview-nav">
            <button type="button" className="icon-btn" disabled={index <= 0} onClick={onPrev} title="上一条成片"><ChevronLeft size={16} /></button>
            <span className="mix-preview-idx">{index + 1}/{count}</span>
            <button type="button" className="icon-btn" disabled={index >= count - 1} onClick={onNext} title="下一条成片"><ChevronRight size={16} /></button>
            <button type="button" className="up-dialog-x" onClick={onClose} aria-label="关闭"><X size={16} /></button>
          </div>
        </div>

        <div className="mix-stage" data-trans={transition}>
          <video ref={layerA} className={cls(frontIsA)} playsInline preload="auto" muted={muted} />
          <video ref={layerB} className={cls(!frontIsA)} playsInline preload="auto" muted={muted} />
          {moving && <span className="mix-stage-tag">{transitionLabel}</span>}
          {bgm && <audio ref={audioRef} src={bgm.url} loop />}
        </div>

        <div className="mix-bar" onClick={seekBar} role="progressbar" aria-valuemin={0} aria-valuemax={Math.round(total)} aria-valuenow={Math.round(elapsed)}>
          <span className="mix-bar-fill" style={{ width: `${total ? (elapsed / total) * 100 : 0}%` }} />
          {clips.slice(0, -1).map((c, i) => {
            const acc = clips.slice(0, i + 1).reduce((s, x) => s + (x.duration || 0), 0);
            return <span key={c.id + i} className="mix-bar-cut" style={{ left: `${total ? (acc / total) * 100 : 0}%` }} />;
          })}
        </div>

        <div className="mix-controls">
          <button type="button" className="crop-play" onClick={toggle} aria-label={playing ? '暂停' : '播放'}>
            {playing ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <button type="button" className="crop-reset" disabled={at <= 0} onClick={() => goTo(at - 1, playing)} aria-label="上一段"><SkipBack size={15} /></button>
          <button type="button" className="crop-reset" disabled={at >= clips.length - 1} onClick={() => goTo(at + 1, playing)} aria-label="下一段"><SkipForward size={15} /></button>
          <button type="button" className="crop-reset" onClick={() => setMuted(m => !m)} aria-label={muted ? '打开原声' : '静音原声'}>
            {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
          <span className="crop-timer">{fmtTime(elapsed)} / {fmtTime(total)}</span>
          <span className="mix-controls-seg">第 {at + 1}/{clips.length} 段</span>
        </div>

        <div className="mix-chips">
          {clips.map((clip, i) => (
            <button
              key={`${clip.id}-${i}`} type="button"
              className={`mix-chip ${i === at ? 'is-on' : ''}`}
              onClick={() => goTo(i, false)}
              title={clip.name}
            >
              {clip.cover && <img src={clip.cover} alt="" />}
              <span className="mix-chip-t">{i + 1}. {clip.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
