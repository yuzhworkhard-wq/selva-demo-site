import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle, ArrowLeft, ArrowUp, Check, ChevronLeft, ChevronRight, Crosshair, Download, Eye,
  Film, FolderOpen, Image, Layers, Loader2, Play, Plus, RotateCcw, Scissors, Trash2,
  Upload, UserRound, Video, X,
} from 'lucide-react';
import { notifyHostModal } from './hostModal';
import { StepIndicator } from './CloneModal';
import { AutoTextarea, Picker, Stepper } from './VideoGenModal';

/* 资源库视频（与批量混剪同一套 demo） */
const LIB_VIDEOS = [
  { id: 'lv-1', name: '春季_15s_A.mp4', url: 'test-clip.mp4', cover: 'frames/frame_01.jpg', meta: '00:15' },
  { id: 'lv-2', name: '片头_标准版.mp4', url: 'test-clip.mp4', cover: 'frames/frame_08.jpg', meta: '00:05' },
  { id: 'lv-3', name: '竞品_口播A.mp4', url: 'test-clip.mp4', cover: 'frames/frame_09.jpg', meta: '00:22' },
  { id: 'lv-4', name: '竞品_到账B.mp4', url: 'test-clip.mp4', cover: 'frames/frame_04.jpg', meta: '00:18' },
  { id: 'lv-5', name: '夜景转场素材.mp4', url: 'test-clip.mp4', cover: 'frames/frame_07.jpg', meta: '00:08' },
  { id: 'lv-6', name: '片尾_温情版.mp4', url: 'test-clip.mp4', cover: 'frames/frame_06.jpg', meta: '00:06' },
];

/* 资源库图片（与视频生成同一套 demo 镜像，角色+图片都可作边框参考） */
const LIB_REF_TABS = [
  {
    key: 'character', label: '角色', icon: UserRound, ratio: '9/16',
    items: [
      { id: 'lc-1', name: 'Chloe', url: 'showcase/chloe.jpg', meta: '女 · 青年 · 欧美' },
      { id: 'lc-2', name: 'Kai', url: 'showcase/kai.jpg', meta: '男 · 成年 · 东亚' },
      { id: 'lc-3', name: 'Elena', url: 'showcase/elena.jpg', meta: '女 · 青年 · 欧美' },
      { id: 'lc-4', name: 'Jonas', url: 'showcase/jonas.jpg', meta: '男 · 成年 · 欧美' },
      { id: 'lc-5', name: 'Sarah', url: 'showcase/sarah.jpg', meta: '女 · 成年 · 欧美' },
      { id: 'lc-6', name: 'Diego', url: 'showcase/diego.jpg', meta: '男 · 中年 · 拉丁裔' },
    ],
  },
  {
    key: 'image', label: '图片', icon: Image, ratio: '3/4',
    items: [
      { id: 'li-1', name: '街边ATM_到账实拍.jpg', url: 'frames/frame_01.jpg', meta: '产品场景' },
      { id: 'li-2', name: '居家沙发_中景.jpg', url: 'frames/frame_02.jpg', meta: '场景底图' },
      { id: 'li-3', name: '手机界面_收益页.jpg', url: 'frames/frame_03.jpg', meta: 'UI 截图' },
      { id: 'li-4', name: '金额档位_R$特写.jpg', url: 'frames/frame_04.jpg', meta: '金额镜' },
      { id: 'li-5', name: '街区台阶_日光.jpg', url: 'frames/frame_05.jpg', meta: '场景底图' },
      { id: 'li-6', name: '地毯萌宠_暖调.jpg', url: 'frames/frame_06.jpg', meta: '片尾素材' },
      { id: 'li-7', name: '商业街_夜景霓虹.jpg', url: 'frames/frame_07.jpg', meta: '场景底图' },
      { id: 'li-8', name: '柴犬正面_片头.jpg', url: 'frames/frame_08.jpg', meta: '片头素材' },
    ],
  },
];

function revokeIfBlob(url) {
  if (url && String(url).startsWith('blob:')) URL.revokeObjectURL(url);
}

/* 草稿兼容：旧版单张 refImg → 多张 refImgs */
function draftRefImgs(draft = {}) {
  const list = Array.isArray(draft.refImgs)
    ? draft.refImgs
    : (draft.refImg ? [draft.refImg] : []);
  return list.map((r, i) => ({
    id: r.id || `ref-draft-${i}`,
    name: r.name || `参考图 ${i + 1}`,
    url: r.url || '',
    ...(r.libId ? { libId: r.libId } : {}),
  }));
}

function nextRefId() {
  return `ref-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/* 加号菜单：与视频生成 AddRefButton 同一套交互（本地上传 / 从资源库）；参考图不限张数 */
function FrameAddRefButton({ count, onFiles, onOpenLibrary }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const away = e => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    const esc = e => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <div className="add-ref" ref={wrapRef}>
      <input
        ref={inputRef} type="file" hidden multiple accept="image/*"
        onChange={e => {
          if (e.target.files?.length) onFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        className="composer-icon-btn"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        title="添加参考图"
      >
        <Plus size={18} />
      </button>
      {open && (
        <div className="add-ref-pop" role="menu">
          <button
            type="button" role="menuitem" className="add-ref-src"
            onClick={() => { setOpen(false); inputRef.current?.click(); }}
          >
            <Upload size={16} strokeWidth={1.7} />
            <span className="add-ref-src-text">
              <b>本地上传</b>
              <em>可多选图片</em>
            </span>
          </button>
          <button
            type="button" role="menuitem" className="add-ref-src"
            onClick={() => { setOpen(false); onOpenLibrary(); }}
          >
            <FolderOpen size={16} strokeWidth={1.7} />
            <span className="add-ref-src-text">
              <b>从资源库选择</b>
              <em>角色 / 图片 · 可多选</em>
            </span>
          </button>
          <div className="add-ref-quota">
            <span className="add-ref-q">参考图 {count} 张</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* 从资源库多选参考图：交互对齐视频池的 up-dialog */
function FrameRefLibraryDialog({ chosenKeys, onConfirm, onClose }) {
  const [tab, setTab] = useState(LIB_REF_TABS[0].key);
  const [picked, setPicked] = useState([]);
  const active = LIB_REF_TABS.find(t => t.key === tab) || LIB_REF_TABS[0];
  const chosen = new Set(chosenKeys || []);

  useEffect(() => {
    notifyHostModal(true);
    const esc = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => { window.removeEventListener('keydown', esc); notifyHostModal(false); };
  }, [onClose]);

  const toggle = item => setPicked(prev => (
    prev.some(p => p.id === item.id) ? prev.filter(p => p.id !== item.id) : [...prev, item]
  ));

  return (
    <div className="up-dialog-overlay" onClick={onClose}>
      <div
        className="up-dialog up-dialog--lib"
        role="dialog" aria-modal="true" aria-label="从资源库选择参考图"
        onClick={e => e.stopPropagation()}
      >
        <div className="up-dialog-head">
          <span className="up-dialog-title">从资源库选择 <em>我的资源库</em></span>
          <button className="up-dialog-x" onClick={onClose} aria-label="关闭"><X size={16} /></button>
        </div>
        <div className="up-tabs" role="tablist">
          {LIB_REF_TABS.map(t => (
            <button
              key={t.key} role="tab" aria-selected={tab === t.key}
              className={`up-tab ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              <t.icon size={14} /> {t.label}
              <span className="up-tab-n">{t.items.length}</span>
            </button>
          ))}
        </div>
        <div className="up-body up-body--lib">
          <div className="up-lib up-lib--named">
            {active.items.map(item => {
              const already = chosen.has(item.id) || chosen.has(item.url);
              const sel = picked.some(p => p.id === item.id);
              return (
                <button
                  key={item.id} type="button" disabled={already}
                  className={`up-lib-item up-lib-item--named ${sel ? 'picked' : ''}`}
                  style={{ aspectRatio: active.ratio }}
                  title={already ? '已添加' : item.name}
                  onClick={() => toggle(item)}
                >
                  <img src={item.url} alt="" />
                  {sel && <span className="up-lib-check"><Check size={12} /></span>}
                  <span className="up-lib-cap"><b>{item.name}</b><em>{item.meta}</em></span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="up-foot">
          <span className="up-foot-hint">
            <span className="up-foot-q">已选 {picked.length} 张 · 不限数量</span>
          </span>
          <span className="up-foot-btns">
            <button type="button" className="btn-outline" onClick={onClose}>取消</button>
            <button
              type="button" className="btn-primary" disabled={!picked.length}
              onClick={() => { onConfirm(picked); onClose(); }}
            >
              <Check size={15} /> 添加 {picked.length ? `${picked.length} 张` : ''}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}

/* 视频池加号格：池内已有素材时继续添加（对齐批量混剪 MixSlotAdd） */
function FrameAddVidButton({ onFiles, onOpenLibrary, poolCount = 0 }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const away = e => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    const esc = e => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <div className="add-ref" ref={wrapRef}>
      <input
        ref={inputRef} type="file" hidden multiple accept="video/*"
        onChange={e => {
          if (e.target.files?.length) onFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        className="bfm-vid-add-slot"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        title="添加视频"
      >
        <Plus size={16} strokeWidth={1.8} />
      </button>
      {open && (
        <div className="add-ref-pop" role="menu">
          <button
            type="button" role="menuitem" className="add-ref-src"
            onClick={() => { setOpen(false); inputRef.current?.click(); }}
          >
            <Upload size={16} strokeWidth={1.7} />
            <span className="add-ref-src-text">
              <b>本地上传</b>
              <em>视频素材，可多选</em>
            </span>
          </button>
          <button
            type="button" role="menuitem" className="add-ref-src"
            onClick={() => { setOpen(false); onOpenLibrary(); }}
          >
            <FolderOpen size={16} strokeWidth={1.7} />
            <span className="add-ref-src-text">
              <b>从资源库选择</b>
              <em>已有视频素材</em>
            </span>
          </button>
          <div className="add-ref-quota">
            <span className="add-ref-q">池内 {poolCount} 条</span>
          </div>
        </div>
      )}
    </div>
  );
}

function FrameVidLibraryDialog({ chosenIds, onConfirm, onClose }) {
  const [picked, setPicked] = useState([]);
  useEffect(() => {
    notifyHostModal(true);
    const esc = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => { window.removeEventListener('keydown', esc); notifyHostModal(false); };
  }, [onClose]);
  const toggle = item => setPicked(prev => (
    prev.some(p => p.id === item.id) ? prev.filter(p => p.id !== item.id) : [...prev, item]
  ));
  return (
    <div className="up-dialog-overlay" onClick={onClose}>
      <div
        className="up-dialog up-dialog--lib"
        role="dialog" aria-modal="true" aria-label="从资源库选择视频"
        onClick={e => e.stopPropagation()}
      >
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
                  title={already ? '已在视频池中' : item.name}
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
          <span className="up-foot-hint">
            <span className="up-foot-q">已选 {picked.length} 条</span>
          </span>
          <span className="up-foot-btns">
            <button type="button" className="btn-outline" onClick={onClose}>取消</button>
            <button
              type="button" className="btn-primary" disabled={!picked.length}
              onClick={() => { onConfirm(picked); onClose(); }}
            >
              <Check size={15} /> 添加 {picked.length ? `${picked.length} 条` : ''}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── 批量套边框 ──
   三步配置，点第一步「生成」就建一条任务（可离开，点任务接着做）：

   第一步 · 生成边框
     写提示词（可挂多张参考图）→ 出 N 张 9:16 原图（中间是一块纯色）→ 逐张抠掉中心纯色区。
     反复生成往同一个平铺列表里追加，不分批次；风格一不一致由用户自己判断。
     抠像会失败（中心不是纯色、被装饰压住、纯色块太小都挖不出洞），失败的跳过、可单张重试。
     生图模型产不出中间透明的图，不挖空就没法叠在视频上，这一步省不掉。

   第二步 · 调整视频位置
     生图给不出稳定的洞位——同一个提示词出的 10 张，洞宽从 61% 到 87%，没有一张正好是 9:16。
     所以系统不读洞，只给一个 9:16 矩形让用户自己摆：拖动、缩放、圆角、视频在图上还是图下。
     一次压一张边框图当对齐参照（拖动时边框自动半透明，能看清矩形超出去多少），
     左右按钮切换 + 底部缩略图条，对不上的那张不勾选就是了。
     整个任务共用这一套矩形参数——这批要居中、下批要靠右，那是另建一个任务的事。
     默认「矩形略大于洞 + 视频在图下」：边框自己把视频裁成洞的形状，圆角是洞现成的，
     对齐精度要求直接归零；洞本身的形状不好看时才切「视频在图上」自己加圆角。

   第三步 · 套用与合成
     视频池 × 边框按配比逐条套框（排队 / 合成中 / 完成），不跳进混剪那种成片卡片墙，
     全部完成后右栏底栏可勾选下载。

   第一步布局：左上缩略图列表 · 左下提示词 · 右侧选中边框大预览（不要示意海报）。 */

const FRAME_CAP = 24;          // 边框总数上限
const GEN_COUNT_MAX = 8;       // 单次生图张数上限
const COMPOSE_CAP = 20;        // 一次合成上限
const COMPOSE_STEP = 1100;     // 逐条套框间隔
const COMPOSE_RUN = 820;       // 单条「合成中」时长
const OUT_SIZE = '9:16';       // 边框只出竖版：套的是手机视频，别的比例没用

const STEPS = [
  { key: 'frame', label: '生成边框' },
  { key: 'place', label: '调整视频位置' },
  { key: 'compose', label: '套用与合成' },
];

/* demo 边框素材＝真实生图产物（巴西网赚消除游戏广告框），中心已抠成透明。
   只存挖空版一份：第一步的「原图」= 挖空版垫白底，看着就是模型刚吐出来的样子。 */
const FRAME_SRCS = Array.from(
  { length: 10 },
  (_, i) => `frames-border/border_${String(i + 1).padStart(2, '0')}.webp`,
);

/* ── 视频矩形 ──
   矩形是 9:16，画布也是 9:16 —— 所以矩形高度占画布的比例，恰好等于它宽度占画布的比例。
   一个 size 就说完了，不用分开存宽高。 */
const RECT_MIN = 0.25;
const RECT_MAX = 1.4;
const RADIUS_MAX = 24;         // 圆角上限，按矩形宽度的百分比算
/* 实测 10 张同提示词的图，洞大致落在 13%~87%（宽 61%~87%、高 68%~77%）。
   默认 74% 居中正好把中位洞盖住一圈，配「视频在图下」开箱就是成片。 */
const DEFAULT_RECT = { x: 0.13, y: 0.13, size: 0.74, radius: 0, z: 'under' };

const Z_MODES = [
  { value: 'under', label: '视频在图下', desc: '边框盖住视频，超出洞口的部分自动被裁掉，圆角跟着洞走' },
  { value: 'over', label: '视频在图上', desc: '视频盖住边框，可以自己加圆角，但超出的部分会露在画面上' },
];
const zLabel = z => (Z_MODES.find(m => m.value === z) || Z_MODES[0]).label;

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const pct = n => `${(n * 100).toFixed(2)}%`;
/* 9:16 的盒子上写 border-radius: r% 会被拉成椭圆角（横向按宽算、纵向按高算）。
   纵向那半乘回 9/16 才是正圆角。 */
const radiusCss = r => (r > 0 ? `${r}% / ${(r * 9 / 16).toFixed(2)}%` : '0');
const normRect = r => ({ ...DEFAULT_RECT, ...(r || {}) });

/** 提交默认任务名：套框-月日（点生成时还没有边框，不把张数写进名字） */
function defaultFrameTaskName() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `套框-${mm}${dd}`;
}

function nextVidSeq(videos) {
  let n = 1;
  (videos || []).forEach(v => {
    const m = String(v.id || '').match(/(\d+)$/);
    if (m) n = Math.max(n, Number(m[1]) + 1);
  });
  return n;
}

/* 边框 × 视频怎么配。
   全排列适合少量精选；条数一多就得用轮换，否则配额全烧在没人要的交叉组合上。 */
const PAIR_MODES = [
  {
    value: 'cross',
    label: '全排列',
    desc: '每个边框都配每条视频',
    count: (f, v) => f * v,
    formula: (f, v) => `${f} 边框 × ${v} 视频`,
  },
  {
    value: 'cycle',
    label: '逐条轮换',
    desc: '边框与视频一一配对，少的一方循环使用',
    count: (f, v) => (f && v ? Math.max(f, v) : 0),
    formula: (f, v) => `max(${f} 边框, ${v} 视频)`,
  },
];
const pairModeOf = value => PAIR_MODES.find(m => m.value === value) || PAIR_MODES[0];

/* 抠像失败是常态（中心不是纯色、被装饰压住、纯色块太小都会挖不出洞）。
   demo 要能稳定演示这个状态，所以按规则触发不随机：
     · 一次出 ≥4 张 → 第 4 张固定失败
     · 提示词里写「测试失败」→ 整次失败
   成败在出图时就定死写进 willFail，切走再回来接着跑也是同一个结果。
   重试固定成功——不然「重试」这个按钮就是摆设。
   真接模型时把 decideCutFail 换成抠像服务返回的逐张结果即可。 */
const CUT_FAIL_REASON = '未找到足够大的中间纯色区域，已自动跳过。';
function decideCutFail(index, total, prompt) {
  if (prompt && prompt.includes('测试失败')) return CUT_FAIL_REASON;
  if (total >= 4 && index === 3) return CUT_FAIL_REASON;
  return null;
}

/* 出图 → 抠像的动画时序。切走再回来时，按同样的节奏把没跑完的接着跑完。 */
function scheduleShots(items, push, patch) {
  const settle = f => (f.willFail
    ? { state: 'failed', fail: f.willFail }
    : { state: 'cut', fail: '' });
  items.forEach(({ f, i }) => {
    const base = i * 260;
    if (f.state === 'generating') {
      push(setTimeout(() => patch(f.id, { state: 'raw' }), base + 520));
      push(setTimeout(() => patch(f.id, { state: 'cutting' }), base + 900));
      push(setTimeout(() => patch(f.id, settle(f)), base + 1420));
    } else if (f.state === 'raw') {
      push(setTimeout(() => patch(f.id, { state: 'cutting' }), base + 200));
      push(setTimeout(() => patch(f.id, settle(f)), base + 720));
    } else if (f.state === 'cutting') {
      push(setTimeout(() => patch(f.id, settle(f)), base + 520));
    }
  });
}

/* 一张边框图。
   原图 = 中间那块还在（垫白底，看着就是模型刚出的图）；抠像后 = 那块透明（棋盘格）。
   这个差别必须一眼看得见，否则用户不理解提示词为什么要写「中间留出纯色空白区」。 */
function FrameShot({ src, state }) {
  return (
    <span className={`bfm-shot bfm-shot--${state}`} aria-hidden="true">
      {state !== 'generating' && <img className="bfm-shot-img" src={src} alt="" />}
    </span>
  );
}

/* 第一步缩略图：出图中 → 原图 → 抠像中 → 已挖空 / 抠像失败（可重试）；点选进右侧大预览 */
function GenShotCard({ img, selected, onSelect, onRemove, onRetry }) {
  const failed = img.state === 'failed';
  return (
    <div className={`bfm-shot-card ${failed ? 'is-failed' : ''} ${selected ? 'is-selected' : ''}`}>
      <button
        type="button"
        className="bfm-shot-hit"
        onClick={() => onSelect?.(img.id)}
        aria-pressed={!!selected}
        aria-label={`预览边框 ${img.no}`}
        title={`预览边框 ${img.no}`}
      >
        <span className="bfm-shot-wrap">
          <FrameShot src={img.src} state={img.state} />
          {img.state === 'cutting' && (
            <span className="bfm-shot-busy"><Loader2 size={15} className="spinner" /></span>
          )}
          <span className="bfm-shot-no">{img.no}</span>
        </span>
      </button>
      <button
        type="button" className="bfm-shot-rm"
        onClick={e => { e.stopPropagation(); onRemove(img.id); }}
        aria-label={`删除边框 ${img.no}`}
      >
        <X size={11} />
      </button>
      <div className="bfm-shot-state">
        {img.state === 'generating' && <span className="bfm-state-raw">出图中…</span>}
        {img.state === 'raw' && <span className="bfm-state-raw">原图</span>}
        {img.state === 'cutting' && <span className="bfm-state-cutting">抠像中…</span>}
        {img.state === 'cut' && <span className="bfm-state-cut"><Scissors size={10} /> 已挖空</span>}
        {failed && (
          <button type="button" className="bfm-state-failed" onClick={() => onRetry(img.id)} title={img.fail}>
            <RotateCcw size={10} /> 重试
          </button>
        )}
      </div>
    </div>
  );
}

/* 矩形里放什么：有封面就用封面，第二步对齐时看到的画面和第三步出片一致；
   没封面的本地上传，舞台上直接放会动的视频。 */
function VideoFill({ video, live = false }) {
  if (video && video.cover) return <img className="bfm-rect-media" src={video.cover} alt="" />;
  if (video && live && video.url) {
    return <video className="bfm-rect-media" src={video.url} muted loop autoPlay playsInline />;
  }
  if (video && video.url) {
    return <video className="bfm-rect-media" src={video.url} muted playsInline preload="metadata" />;
  }
  return <span className="bfm-rect-empty"><Video size={16} strokeWidth={1.5} /></span>;
}

/* 边框 + 视频矩形的真实叠放。第二步和第三步共用一套渲染，所见即所得。
   ghost=true 时边框半透明，用来看矩形超出去多少。 */
function FrameComposite({ src, rect, fill, ghost = false, outline = false, children }) {
  const r = normRect(rect);
  const box = { left: pct(r.x), top: pct(r.y), width: pct(r.size), height: pct(r.size) };
  /* 视频在图下时圆角由洞口决定，矩形自己那份圆角是看不见的，不画 */
  const radius = radiusCss(r.z === 'over' ? r.radius : 0);
  const layer = (
    <span className="bfm-rect" style={{ ...box, borderRadius: radius }}>{fill}</span>
  );
  return (
    <span className={`bfm-canvas ${ghost ? 'is-ghost' : ''}`}>
      {r.z === 'under' && layer}
      <img className="bfm-canvas-img" src={src} alt="" />
      {r.z === 'over' && layer}
      {outline && <span className="bfm-rect-outline" style={{ ...box, borderRadius: radius }} />}
      {children}
    </span>
  );
}

/* 第二步舞台：9:16 矩形压在边框图上，拖动 / 四角缩放 / 方向键微调。
   拖的时候边框自动半透明——不然矩形被边框盖住的那截看不见，用户没法判断超没超。 */
function PlaceStage({ frame, rect, video, onChange, ghostPin }) {
  const boxRef = useRef(null);
  const dragRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const r = normRect(rect);

  const frac = e => {
    const b = boxRef.current?.getBoundingClientRect();
    if (!b || !b.width || !b.height) return null;
    return { fx: (e.clientX - b.left) / b.width, fy: (e.clientY - b.top) / b.height };
  };

  const begin = (e, mode) => {
    const p = frac(e);
    if (!p) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = { mode, ...p, rect: r };
    setDragging(true);
  };

  const move = e => {
    const d = dragRef.current;
    if (!d) return;
    const p = frac(e);
    if (!p) return;
    const base = d.rect;
    if (d.mode === 'move') {
      /* 允许拖出画布，但至少留 10% 在画面里，免得矩形整个飞走找不回来 */
      onChange({
        ...base,
        x: clamp(base.x + p.fx - d.fx, -base.size + 0.1, 0.9),
        y: clamp(base.y + p.fy - d.fy, -base.size + 0.1, 0.9),
      });
      return;
    }
    /* 缩放：对角锚点钉死，矩形跟着指针长；比例锁 9:16，取位移大的那个轴 */
    const ax = (d.mode === 'nw' || d.mode === 'sw') ? base.x + base.size : base.x;
    const ay = (d.mode === 'nw' || d.mode === 'ne') ? base.y + base.size : base.y;
    const size = clamp(Math.max(Math.abs(p.fx - ax), Math.abs(p.fy - ay)), RECT_MIN, RECT_MAX);
    onChange({
      ...base,
      size,
      x: (d.mode === 'nw' || d.mode === 'sw') ? ax - size : ax,
      y: (d.mode === 'nw' || d.mode === 'ne') ? ay - size : ay,
    });
  };

  const end = e => {
    dragRef.current = null;
    setDragging(false);
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  const onKeyDown = e => {
    const step = e.shiftKey ? 0.02 : 0.005;
    const delta = {
      ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step],
    }[e.key];
    if (!delta) return;
    e.preventDefault();
    onChange({
      ...r,
      x: clamp(r.x + delta[0], -r.size + 0.1, 0.9),
      y: clamp(r.y + delta[1], -r.size + 0.1, 0.9),
    });
  };

  const grab = { onPointerMove: move, onPointerUp: end, onPointerCancel: end };

  return (
    <div className="bfm-stage" ref={boxRef}>
      <FrameComposite
        src={frame.src}
        rect={r}
        ghost={ghostPin || dragging}
        outline
        fill={<VideoFill video={video} live />}
      >
        <span
          className={`bfm-rect-hit ${dragging ? 'is-dragging' : ''}`}
          tabIndex={0}
          role="application"
          aria-label="拖动调整视频位置，四角缩放，方向键微调"
          style={{ left: pct(r.x), top: pct(r.y), width: pct(r.size), height: pct(r.size) }}
          onPointerDown={e => begin(e, 'move')}
          onKeyDown={onKeyDown}
          {...grab}
        >
          {['nw', 'ne', 'sw', 'se'].map(h => (
            <span
              key={h}
              className={`bfm-handle bfm-handle--${h}`}
              onPointerDown={e => begin(e, h)}
              {...grab}
            />
          ))}
        </span>
      </FrameComposite>
    </div>
  );
}

/* 视频池：第二步要它才判断得出上/下和圆角，第三步要它才配得出比。同一份 state，两步都能改。 */
function VideoPoolPanel({ videos, onFiles, onLibrary, onRemove, onClear, hint, grow = true }) {
  const inputRef = useRef(null);
  return (
    <div className={`bfm-panel bfm-panel--vid ${grow ? 'bfm-panel--grow' : ''}`}>
      <div className="bfm-panel-head">
        <span className="bfm-panel-title">视频池</span>
        <span className="bfm-panel-hint">{videos.length > 0 ? `${videos.length} 条` : hint}</span>
      </div>
      {videos.length === 0 ? (
        <div
          className="mix-pool-empty"
          onClick={() => inputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files); }}
        >
          <span className="upload-card-icon"><Video size={22} strokeWidth={1.5} /></span>
          <span className="upload-card-title">上传视频</span>
          <span className="upload-card-hint">MP4 / MOV · 用来预览并合成</span>
          <span className="upload-card-btns">
            <button
              type="button" className="btn-primary btn-sm"
              onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}
            >
              <Upload size={13} /> 上传视频
            </button>
            <button
              type="button" className="btn-outline btn-sm"
              onClick={e => { e.stopPropagation(); onLibrary(); }}
            >
              <FolderOpen size={13} /> 从资源库选择
            </button>
          </span>
        </div>
      ) : (
        <div className="bfm-vid-pool">
          {videos.map(v => (
            <div className="bfm-vid-card" key={v.id}>
              <div className="bfm-vid-thumb">
                {v.cover
                  ? <img src={v.cover} alt="" />
                  : <Video size={18} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />}
              </div>
              <span className="bfm-vid-name" title={v.name}>{v.name}</span>
              <button
                type="button" className="bfm-vid-rm" onClick={() => onRemove(v.id)}
                aria-label={`移除 ${v.name}`}
              >
                <X size={10} />
              </button>
            </div>
          ))}
          <FrameAddVidButton poolCount={videos.length} onFiles={onFiles} onOpenLibrary={onLibrary} />
        </div>
      )}
      <div className="bfm-pool-foot">
        <span className="mix-pool-stat">{videos.length ? `${videos.length} 条视频` : '池内暂无视频'}</span>
        <span className="mix-pool-acts">
          <input
            ref={inputRef} type="file" hidden multiple accept="video/*"
            onChange={e => { if (e.target.files?.length) onFiles(e.target.files); e.target.value = ''; }}
          />
          {videos.length > 0 && (
            <button type="button" onClick={onClear}><Trash2 size={12} /> 清空</button>
          )}
        </span>
      </div>
    </div>
  );
}

function downloadClip(url, name) {
  if (!url) return;
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name || 'frame'}.mp4`;
  a.click();
}

function PlayModal({ title, src, onClose }) {
  useEffect(() => {
    notifyHostModal(true);
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      notifyHostModal(false);
    };
  }, [onClose]);

  return (
    <div className="resume-overlay" onClick={onClose}>
      <div className="bmd-play-dialog" role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}>
        <div className="bmd-play-head">
          <strong>{title}</strong>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="关闭"><X size={16} /></button>
        </div>
        <div className="bmd-play-stage">
          <video src={src} controls autoPlay playsInline />
        </div>
      </div>
    </div>
  );
}

function ComposeResultCard({ row, picked, onToggle, onPlay }) {
  const done = row.status === 'done';
  return (
    <div className={`bfm-result-card ${picked ? 'is-picked' : ''}`}>
      <div className="bfm-result-preview">
        <button
          type="button"
          className="bfm-result-hit"
          onClick={() => done && onPlay(row)}
          disabled={!done}
          title={done ? `播放成片 ${row.no}` : (row.status === 'generating' ? '合成中' : '排队中')}
        >
          <FrameComposite
            src={row.frameSrc}
            rect={row.rect}
            fill={<VideoFill video={{ url: row.videoUrl, cover: row.videoCover }} />}
          />
          {row.status === 'generating' && (
            <span className="bfm-result-busy">
              <Loader2 size={16} className="spinner" />
              <em>合成中</em>
            </span>
          )}
          {row.status === 'pending' && (
            <span className="bfm-result-busy bfm-result-busy--dim"><em>排队中</em></span>
          )}
          {done && (
            <span className="bfm-result-play" aria-hidden="true"><Play size={16} fill="currentColor" /></span>
          )}
        </button>
        <label className="mix-tick bfm-result-tick" title={picked ? '取消勾选' : '勾选下载'}>
          <input
            type="checkbox" checked={picked} onChange={onToggle}
            aria-label={`成片 ${row.no} ${picked ? '取消勾选' : '勾选'}`}
          />
          <span className="mix-tick-box"><Check size={10} strokeWidth={3} /></span>
        </label>
        <span className="bfm-result-no">{row.no}</span>
      </div>
      <div className="bfm-result-cap">
        <span className="bfm-result-frame">边框 {row.frameNo}</span>
        <span className="bfm-result-vid" title={row.videoName}>{row.videoName}</span>
      </div>
    </div>
  );
}

function rowsToVariants(rows) {
  return (rows || []).map((r, i) => ({
    id: r.id,
    seq: [i],
    duration: 15,
    clips: [{ id: r.videoId, name: r.videoName, url: r.videoUrl || '', cover: r.videoCover, duration: 15 }],
    frameNo: r.frameNo,
    rect: r.rect,
    status: r.status || 'pending',
  }));
}

export function BatchFrameModal({
  onClose, onRestart, visible = true, embedded = false, onSubmitTask = null,
  initialTaskId = null, initialName = null, initialDraft = null,
}) {
  const draft = initialDraft || {};
  const [step, setStep] = useState(() => (
    (draft.composeRows && draft.composeRows.length) ? 2 : (draft.step || 0)
  ));

  /* ── 第一步：生图 + 抠像 ── */
  const [prompt, setPrompt] = useState(draft.prompt || '');
  const [refImgs, setRefImgs] = useState(() => draftRefImgs(draft)); // [{ id, name, url, libId? }]
  const [assetLibOpen, setAssetLibOpen] = useState(false);
  const [vidLibOpen, setVidLibOpen] = useState(false);
  const [genCount, setGenCount] = useState(draft.genCount || 4);
  // frames: [{ id, no, src, state:'generating'|'raw'|'cutting'|'cut'|'failed', willFail, fail, use }]
  const [frames, setFrames] = useState(() => draft.frames || []);
  const [nextFrameNo, setNextFrameNo] = useState(draft.nextFrameNo || 1);
  /* 第一步右侧大预览：点缩略图切换；生成后默认看最新一批的第一张 */
  const [focusId, setFocusId] = useState(() => (draft.frames && draft.frames[0]?.id) || null);

  /* ── 第二步：视频池 + 矩形（整个任务共用一套） ── */
  const [videos, setVideos] = useState(() => draft.videos || []);
  const vidSeq = useRef(nextVidSeq(draft.videos));
  const [rect, setRect] = useState(() => normRect(draft.rect));
  const [cursor, setCursor] = useState(0);
  const [ghostPin, setGhostPin] = useState(false);

  /* ── 第三步：配比 / 套框成片 ── */
  const [pairMode, setPairMode] = useState(draft.pairMode || 'cross');
  const [composeRows, setComposeRows] = useState(() => draft.composeRows || []);
  const [picked, setPicked] = useState(() => new Set((draft.composeRows || []).map(r => r.id)));
  const [preview, setPreview] = useState(null);

  /* ── 其他 UI 状态 ── */
  const [toast, setToast] = useState(null);
  const [resumeAsk, setResumeAsk] = useState(false);
  const rootRef = useRef(null);
  const toastTimer = useRef(null);
  const cutTimers = useRef([]);
  const composeTimers = useRef([]);
  const wasVisible = useRef(visible);
  const refImgUrlsRef = useRef([]);
  const taskIdRef = useRef(initialTaskId);
  const nameRef = useRef(initialName || '');
  const handedOffRef = useRef(false);
  const submitRef = useRef(onSubmitTask);
  const draftRef = useRef(null);
  const skipResumeAsk = !!initialTaskId;
  submitRef.current = onSubmitTask;
  draftRef.current = {
    step, prompt, refImgs, genCount, frames, nextFrameNo, videos, rect, pairMode, composeRows,
  };
  useEffect(() => {
    refImgUrlsRef.current = refImgs.map(r => r.url).filter(Boolean);
  }, [refImgs]);
  useEffect(() => () => {
    clearTimeout(toastTimer.current);
    cutTimers.current.forEach(clearTimeout);
    composeTimers.current.forEach(clearTimeout);
    /* 已建任务：参考图 blob 跟草稿走，卸载不回收。没建任务才清掉以免泄漏。 */
    if (!taskIdRef.current) refImgUrlsRef.current.forEach(revokeIfBlob);
  }, []);

  const showToast = msg => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  };

  const removeRefImg = id => {
    setRefImgs(prev => {
      const hit = prev.find(r => r.id === id);
      if (hit && !taskIdRef.current) revokeIfBlob(hit.url);
      return prev.filter(r => r.id !== id);
    });
  };
  const setRefFromFiles = fileList => {
    const files = Array.from(fileList || []).filter(f => f.type.startsWith('image/'));
    if (!files.length) {
      showToast('请选择图片文件');
      return;
    }
    const added = files.map(file => ({
      id: nextRefId(),
      name: file.name,
      url: URL.createObjectURL(file),
    }));
    setRefImgs(prev => [...prev, ...added]);
  };
  const setRefFromLibrary = items => {
    if (!items?.length) return;
    setRefImgs(prev => {
      const have = new Set(prev.flatMap(r => [r.libId, r.url].filter(Boolean)));
      const added = items
        .filter(item => !have.has(item.id) && !have.has(item.url))
        .map(item => ({
          id: nextRefId(),
          libId: item.id,
          name: item.name,
          url: item.url,
        }));
      return added.length ? [...prev, ...added] : prev;
    });
  };

  /* 挖空且勾选的才往下走。第一步不设勾选——挖出来就都在，第二步对不齐的再摘掉。 */
  const cutFrames = frames.filter(f => f.state === 'cut');
  const useFrames = cutFrames.filter(f => f.use);

  const persistDraft = (overrides = {}) => {
    const submit = submitRef.current;
    if (!submit || handedOffRef.current) return null;
    const snap = { ...(draftRef.current || {}), ...overrides };
    draftRef.current = snap;
    const rows = snap.composeRows || [];
    const anyCompose = rows.length > 0;
    const allDone = anyCompose && rows.every(r => r.status === 'done');
    const phase = anyCompose ? (allDone ? 'done' : 'composing') : 'draft';
    const created = !taskIdRef.current;
    const useCount = (snap.frames || []).filter(f => f.state === 'cut' && f.use).length;
    const modeNow = pairModeOf(snap.pairMode);
    const rc = normRect(snap.rect);
    const id = submit({
      taskId: taskIdRef.current,
      name: created ? (nameRef.current || defaultFrameTaskName()) : undefined,
      toolName: '批量套边框',
      framePhase: phase,
      frameDraft: snap,
      sourceText: snap.prompt || '',
      images: (snap.refImgs && snap.refImgs.length) ? snap.refImgs : null,
      videoUrl: (snap.videos && snap.videos[0]?.url) || 'test-clip.mp4',
      variants: anyCompose ? rowsToVariants(rows) : undefined,
      promptText: anyCompose
        ? [
          snap.prompt ? `边框描述：${snap.prompt}` : '',
          `边框 ${useCount} 个 · ${OUT_SIZE} · ${modeNow.label}`,
          `视频位置：${zLabel(rc.z)} · 大小 ${Math.round(rc.size * 100)}%`
            + ` · X ${Math.round(rc.x * 100)}% / Y ${Math.round(rc.y * 100)}%`
            + (rc.z === 'over' && rc.radius ? ` · 圆角 ${rc.radius}` : ''),
          ...rows.map((r, i) => `成片 ${i + 1}: 边框 ${r.frameNo} + ${r.videoName}`),
        ].filter(Boolean).join('\n')
        : undefined,
      frameMeta: {
        phase,
        size: OUT_SIZE,
        genCount: anyCompose ? useCount : snap.genCount,
        pairMode: snap.pairMode,
        pairLabel: modeNow.label,
        refName: (snap.refImgs && snap.refImgs[0]?.name) || null,
        refCount: (snap.refImgs && snap.refImgs.length) || 0,
        rect: rc,
      },
      region: '—',
      status: allDone ? 'done' : 'generating',
    });
    if (id && !taskIdRef.current) {
      taskIdRef.current = id;
      if (created) {
        nameRef.current = nameRef.current || defaultFrameTaskName();
        showToast('任务已创建，可从任务中心继续');
      }
    }
    return id;
  };

  const hasProgress = frames.length > 0 || videos.length > 0 || prompt.trim().length > 0
    || refImgs.length > 0 || composeRows.length > 0;
  const exit = useCallback(() => onClose(hasProgress), [onClose, hasProgress]);

  useEffect(() => {
    if (!visible) rootRef.current?.querySelectorAll('video,audio').forEach(el => el.pause());
    else if (!wasVisible.current && hasProgress && !skipResumeAsk) setResumeAsk(true);
    wasVisible.current = visible;
  }, [visible, hasProgress, skipResumeAsk]);

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

  /* 草稿已在任务里：切走时把最新进度写回，下次点任务接着做 */
  useEffect(() => () => {
    if (taskIdRef.current && !handedOffRef.current) persistDraft();
  }, []);

  const patchFrame = useCallback((id, patch) => {
    setFrames(prev => prev.map(f => (f.id === id ? { ...f, ...patch } : f)));
  }, []);
  const pushTimer = useCallback(t => cutTimers.current.push(t), []);

  /* 切走期间仍在出图/抠像的，回来把剩下的动画跑完 */
  useEffect(() => {
    const busy = (draft.frames || [])
      .map((f, i) => ({ f, i }))
      .filter(({ f }) => f.state !== 'cut' && f.state !== 'failed');
    if (busy.length) scheduleShots(busy, pushTimer, patchFrame);
  }, []);

  /* 任务一旦建了，后续抠像 / 换步 / 加视频 / 调矩形 / 套框进度都写回同一条 */
  useEffect(() => {
    if (!taskIdRef.current || handedOffRef.current) return;
    persistDraft();
  }, [step, prompt, refImgs, genCount, frames, nextFrameNo, videos, rect, pairMode, composeRows]);

  /* ── 生成边框：出原图 → 自动逐张抠像 ── */
  const anyBusy = frames.some(f => f.state !== 'cut' && f.state !== 'failed');
  const roomLeft = FRAME_CAP - frames.length;

  const generate = () => {
    if (!prompt.trim() && !refImgs.length) {
      showToast('先写边框描述，或挂一张参考图');
      return;
    }
    if (roomLeft <= 0) {
      showToast(`边框最多 ${FRAME_CAP} 张，删掉几张再生成`);
      return;
    }
    const total = Math.min(genCount, roomLeft);
    const stamp = Date.now();
    const text = prompt.trim();
    const added = Array.from({ length: total }, (_, i) => ({
      id: `bf-${stamp}-${i}`,
      no: nextFrameNo + i,
      /* demo 素材循环取用；真接模型时这里换成返回的图 URL */
      src: FRAME_SRCS[(nextFrameNo - 1 + i) % FRAME_SRCS.length],
      state: 'generating',
      willFail: decideCutFail(i, total, text),
      fail: '',
      use: true,
    }));
    const nextFrames = [...frames, ...added];
    const nextNo = nextFrameNo + total;
    setFrames(nextFrames);
    setNextFrameNo(nextNo);
    setFocusId(added[0].id);
    persistDraft({ frames: nextFrames, nextFrameNo: nextNo });
    scheduleShots(added.map((f, i) => ({ f, i })), pushTimer, patchFrame);
    if (total < genCount) showToast(`边框上限 ${FRAME_CAP} 张，本次只生成 ${total} 张`);
  };

  /* 重试固定成功：让「抠像失败」这个状态可演示，也可脱身 */
  const retryCut = id => {
    patchFrame(id, { state: 'cutting', willFail: null, fail: '' });
    cutTimers.current.push(setTimeout(() => patchFrame(id, { state: 'cut', fail: '' }), 640));
  };
  const removeFrame = id => {
    setFrames(prev => {
      const next = prev.filter(f => f.id !== id);
      setFocusId(cur => {
        if (cur !== id) return cur;
        return next[0]?.id || null;
      });
      return next;
    });
  };
  const toggleUse = id => setFrames(prev => prev.map(f => (f.id === id ? { ...f, use: !f.use } : f)));

  /* ── 视频池 ──
     序号用 ref 而不是 state：发号和 createObjectURL 都是副作用，
     放进 setVideos 的 updater 里会被 React 重放，一次上传入池两份。
     blob 会随任务移交到详情页，故不在卸载时 revoke。 */
  const addVideos = useCallback(fileList => {
    const files = Array.from(fileList || []).filter(f => f.type.startsWith('video/'));
    if (!files.length) return;
    const added = files.map(file => ({
      id: `vid-${vidSeq.current++}`,
      name: file.name,
      url: URL.createObjectURL(file),
      cover: '',
    }));
    setVideos(prev => [...prev, ...added]);
  }, []);

  const addLibraryVideos = useCallback(items => {
    if (!items?.length) return;
    setVideos(prev => {
      const have = new Set(prev.map(v => v.libId).filter(Boolean));
      const added = items
        .filter(item => !have.has(item.id))
        .map(item => ({
          id: `vid-${vidSeq.current++}`,
          libId: item.id,
          name: item.name,
          url: item.url,
          cover: item.cover || '',
        }));
      return added.length ? [...prev, ...added] : prev;
    });
  }, []);

  const removeVideo = id => setVideos(prev => prev.filter(v => v.id !== id));

  /* ── 第二步：矩形 ── */
  const patchRect = patch => setRect(prev => ({ ...normRect(prev), ...patch }));
  /* 滑杆缩放绕矩形中心，不然一动就往右下跑 */
  const setRectSize = next => setRect(prev => {
    const p = normRect(prev);
    const size = clamp(next, RECT_MIN, RECT_MAX);
    return { ...p, size, x: p.x + (p.size - size) / 2, y: p.y + (p.size - size) / 2 };
  });
  const curIndex = cutFrames.length ? Math.min(cursor, cutFrames.length - 1) : 0;
  const curFrame = cutFrames[curIndex] || null;
  const previewVideo = videos[0] || null;
  const allUsed = cutFrames.length > 0 && useFrames.length === cutFrames.length;
  const toggleAllUse = () => {
    const next = !allUsed;
    setFrames(prev => prev.map(f => (f.state === 'cut' ? { ...f, use: next } : f)));
  };

  /* ── 第三步：配比预估 + 逐条套框 ── */
  const mode = pairModeOf(pairMode);
  const product = mode.count(useFrames.length, videos.length);
  const overCap = product > COMPOSE_CAP;
  const composing = composeRows.some(r => r.status === 'pending' || r.status === 'generating');
  const composeDone = composeRows.length > 0 && composeRows.every(r => r.status === 'done');
  const canSubmit = product > 0 && !overCap && !composing;

  const buildPairRows = () => {
    const stamp = Date.now();
    const rc = normRect(rect);
    const mk = (f, vid, key) => ({
      id: `r-${stamp}-${key}`,
      frameId: f.id, frameNo: f.no, frameSrc: f.src, rect: rc,
      videoId: vid.id, videoName: vid.name, videoCover: vid.cover, videoUrl: vid.url,
    });
    const rows = [];
    if (pairMode === 'cross') {
      useFrames.forEach((f, fi) => videos.forEach((vid, vi) => rows.push(mk(f, vid, `${fi}-${vi}`))));
    } else {
      for (let i = 0; i < product; i += 1) {
        rows.push(mk(useFrames[i % useFrames.length], videos[i % videos.length], String(i)));
      }
    }
    return rows.map((r, i) => ({ ...r, no: i + 1, status: 'pending' }));
  };

  const scheduleCompose = rows => {
    composeTimers.current.forEach(clearTimeout);
    composeTimers.current = [];
    const pending = rows.map((r, i) => ({ r, i })).filter(({ r }) => r.status !== 'done');
    pending.forEach(({ r, i }, order) => {
      const base = r.status === 'generating' ? 0 : 240 + order * COMPOSE_STEP;
      if (r.status !== 'generating') {
        composeTimers.current.push(setTimeout(() => {
          setComposeRows(prev => prev.map((x, j) => (j === i ? { ...x, status: 'generating' } : x)));
        }, base));
      }
      composeTimers.current.push(setTimeout(() => {
        setComposeRows(prev => prev.map((x, j) => (j === i ? { ...x, status: 'done' } : x)));
      }, base + COMPOSE_RUN));
    });
  };

  useEffect(() => {
    const rows = draft.composeRows || [];
    if (!rows.some(r => r.status === 'pending' || r.status === 'generating')) return undefined;
    scheduleCompose(rows);
    return () => {
      composeTimers.current.forEach(clearTimeout);
      composeTimers.current = [];
    };
  }, []);

  const selectedDone = composeRows.filter(r => picked.has(r.id) && r.status === 'done');
  const canBatch = selectedDone.length > 0;
  const allPicked = composeRows.length > 0 && picked.size === composeRows.length;

  const togglePickRow = id => {
    setPicked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleAllRows = () => {
    if (allPicked) setPicked(new Set());
    else setPicked(new Set(composeRows.map(r => r.id)));
  };
  const downloadBatch = () => {
    selectedDone.forEach(r => downloadClip(r.videoUrl, `套框-${r.no}-边框${r.frameNo}`));
  };

  const startCompose = () => {
    if (!canSubmit) return;
    const rows = buildPairRows();
    if (!rows.length) return;
    setComposeRows(rows);
    setPicked(new Set(rows.map(r => r.id)));
    persistDraft({ composeRows: rows });
    scheduleCompose(rows);
  };

  /* ── 步骤闸门 ── */
  const canLeaveGen = cutFrames.length > 0;
  const canLeavePlace = useFrames.length > 0 && videos.length > 0;
  const cutCount = cutFrames.length;
  const failCount = frames.filter(f => f.state === 'failed').length;
  const focusFrame = frames.find(f => f.id === focusId) || frames[0] || null;
  const focusIndex = focusFrame ? frames.findIndex(f => f.id === focusFrame.id) : -1;
  const stepFocus = dir => {
    if (frames.length < 2 || focusIndex < 0) return;
    const next = frames[(focusIndex + dir + frames.length) % frames.length];
    if (next) setFocusId(next.id);
  };

  const videoPool = (
    <VideoPoolPanel
      videos={videos}
      onFiles={addVideos}
      onLibrary={() => setVidLibOpen(true)}
      onRemove={removeVideo}
      onClear={() => setVideos([])}
      hint={step === 1 ? '上传后才看得出上下层效果' : '与边框配比合成'}
    />
  );

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
            <button className="icon-btn" onClick={exit} title="返回">
              <ArrowLeft size={18} />
            </button>
            <span className="clone-topbar-title">批量套边框</span>
          </div>
          <button className="icon-btn" onClick={exit} title="关闭"><X size={18} /></button>
        </div>

        <StepIndicator steps={STEPS} current={step} />

        {toast && (
          <div className="ctd-toast ctd-toast--lg">
            <Check size={17} strokeWidth={2.2} /> {toast}
          </div>
        )}

        <div className="clone-page-body bfm-body">
          <div className="clone-page-inner bfm-inner">
            <div className="bfm-shell">
            <div className="bfm-work">

              {/* ══════════ 第一步 · 生成边框 ══════════
                  左上缩略图 · 左下提示词 · 右侧大预览 */}
              {step === 0 && (
                <>
                  <aside className="bfm-side bfm-side--gen">
                    <div className="bfm-panel bfm-panel--grow bfm-gen-thumbs">
                      <div className="bfm-panel-head">
                        <span className="bfm-panel-title">生成结果</span>
                        <span className="bfm-panel-hint">
                          {frames.length
                            ? `${frames.length}/${FRAME_CAP} · 挖空 ${cutCount}${failCount ? ` · 失败 ${failCount}` : ''}`
                            : '点缩略图看大图'}
                        </span>
                      </div>
                      <div className="bfm-gen-thumbs-body">
                        {frames.length === 0 ? (
                          <div className="bfm-gen-thumbs-empty">
                            <Image size={22} strokeWidth={1.4} />
                            <span>还没有边框</span>
                            <em>下方写描述后点生成</em>
                          </div>
                        ) : (
                          <>
                            <div className="bfm-shot-grid bfm-shot-grid--thumbs">
                              {frames.map(f => (
                                <GenShotCard
                                  key={f.id}
                                  img={f}
                                  selected={focusFrame?.id === f.id}
                                  onSelect={setFocusId}
                                  onRemove={removeFrame}
                                  onRetry={retryCut}
                                />
                              ))}
                            </div>
                            {failCount > 0 && (
                              <p className="bfm-batch-fail-note">
                                <AlertCircle size={11} /> {failCount} 张{CUT_FAIL_REASON}
                                提示词里写明「中间留出大块纯色空白区」可提高成功率。
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="composer bfm-composer bfm-composer--solo">
                      {refImgs.length > 0 && (
                        <div className="idea-dock">
                          <div className="idea-dock-imgs">
                            {refImgs.map(img => (
                              <div key={img.id} className="idea-img-chip" title={img.name}>
                                {img.url
                                  ? <img src={img.url} alt="" className="idea-chip-thumb" />
                                  : <span className="bfm-ref-fallback"><Image size={16} /></span>}
                                <button
                                  type="button"
                                  className="idea-chip-close"
                                  onClick={() => removeRefImg(img.id)}
                                  title="删除"
                                >
                                  <X size={10} />
                                </button>
                              </div>
                            ))}
                          </div>
                          <span className="idea-dock-tag">参考图 {refImgs.length}</span>
                        </div>
                      )}

                      <AutoTextarea
                        value={prompt}
                        onChange={setPrompt}
                        onSubmit={() => { if (!anyBusy) generate(); }}
                        minRows={3}
                        maxHeight={160}
                        placeholder="描述边框风格，并写清「中间留出大块纯色空白区」…"
                      />

                      <div className="composer-bar">
                        <div className="composer-bar-left">
                          <FrameAddRefButton
                            count={refImgs.length}
                            onFiles={setRefFromFiles}
                            onOpenLibrary={() => setAssetLibOpen(true)}
                          />
                        </div>
                        <div className="composer-bar-right">
                          <span className="bfm-fixed-tag" title="边框固定出 9:16 竖版">{OUT_SIZE}</span>
                          <Stepper
                            value={genCount}
                            onChange={setGenCount}
                            min={1}
                            max={GEN_COUNT_MAX}
                            title="生成张数"
                          />
                          <button
                            type="button"
                            className="composer-send"
                            onClick={generate}
                            disabled={anyBusy || roomLeft <= 0}
                            title={
                              roomLeft <= 0
                                ? `边框已满（${FRAME_CAP} 张）`
                                : `生成 ${genCount} 张边框，并在任务中心留下本条任务`
                            }
                          >
                            {anyBusy
                              ? <Loader2 size={16} className="spinner" />
                              : <ArrowUp size={17} strokeWidth={2.2} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </aside>

                  <section className="bfm-out bfm-gen-preview">
                    <header className="mix-out-head">
                      <div className="mix-out-title">
                        大预览
                        <span className="mix-out-sub">
                          {focusFrame
                            ? `边框 ${focusFrame.no}${
                                focusFrame.state === 'cut' ? ' · 已挖空'
                                  : focusFrame.state === 'failed' ? ' · 抠像失败'
                                    : focusFrame.state === 'generating' ? ' · 出图中'
                                      : focusFrame.state === 'cutting' ? ' · 抠像中'
                                        : ' · 原图'
                              }`
                            : '生成后点左侧缩略图查看'}
                        </span>
                      </div>
                      {anyBusy && (
                        <span className="bfm-head-hint">
                          <Loader2 size={12} className="spinner" /> 出图并抠像中
                        </span>
                      )}
                    </header>

                    <div className="mix-out-body bfm-gen-preview-body">
                      {!focusFrame ? (
                        <div className="mix-out-empty">
                          <span className="mix-out-empty-icon" aria-hidden="true">
                            <Image size={38} strokeWidth={1.2} />
                          </span>
                          <h3 className="mix-out-empty-title">先生成边框</h3>
                          <p>点生成就会在任务中心留下一条；切走了再点这条任务，还能接着调位置、套视频</p>
                          <div className="upload-tips">
                            <span className="upload-tip">
                              <Image size={13} strokeWidth={1.8} />固定出 9:16 竖版
                            </span>
                            <span className="upload-tip">
                              <Scissors size={13} strokeWidth={1.8} />出图后自动挖空中心
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="bfm-gen-hero">
                          <div className="bfm-gen-hero-row">
                            <button
                              type="button"
                              className="bfm-nav bfm-nav--prev"
                              disabled={frames.length < 2}
                              onClick={() => stepFocus(-1)}
                              aria-label="上一张边框"
                            >
                              <ChevronLeft size={20} />
                            </button>

                            <div className={`bfm-gen-hero-frame ${focusFrame.state === 'cutting' ? 'is-busy' : ''}`}>
                              <FrameShot src={focusFrame.src} state={focusFrame.state} />
                              {focusFrame.state === 'cutting' && (
                                <span className="bfm-shot-busy">
                                  <Loader2 size={22} className="spinner" />
                                </span>
                              )}
                              <span className="bfm-shot-no">{focusFrame.no}</span>
                            </div>

                            <button
                              type="button"
                              className="bfm-nav bfm-nav--next"
                              disabled={frames.length < 2}
                              onClick={() => stepFocus(1)}
                              aria-label="下一张边框"
                            >
                              <ChevronRight size={20} />
                            </button>
                          </div>
                          {focusFrame.state === 'failed' && (
                            <button
                              type="button"
                              className="btn-outline btn-sm"
                              onClick={() => retryCut(focusFrame.id)}
                            >
                              <RotateCcw size={13} /> 抠像失败 · 重试
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </section>
                </>
              )}

              {/* ══════════ 第二步 · 调整视频位置 ══════════ */}
              {step === 1 && (
                <>
                  <aside className="bfm-side">
                    {videoPool}

                    <div className="bfm-panel">
                      <div className="bfm-panel-head">
                        <span className="bfm-panel-title">视频位置</span>
                        <span className="bfm-panel-hint">整个任务共用一套</span>
                      </div>
                      <div className="bfm-place-ctl">
                        <div className="bfm-ctl-row">
                          <span className="bfm-ctl-label">层级</span>
                          <div className="bfm-seg">
                            {Z_MODES.map(m => (
                              <button
                                key={m.value} type="button" title={m.desc}
                                className={`bfm-seg-btn ${rect.z === m.value ? 'is-on' : ''}`}
                                onClick={() => patchRect({ z: m.value })}
                              >
                                {m.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="bfm-ctl-row">
                          <span className="bfm-ctl-label">大小</span>
                          <input
                            type="range" className="bfm-range"
                            min={Math.round(RECT_MIN * 100)} max={Math.round(RECT_MAX * 100)} step={1}
                            value={Math.round(rect.size * 100)}
                            onChange={e => setRectSize(Number(e.target.value) / 100)}
                            aria-label="矩形大小"
                          />
                          <em className="bfm-ctl-val">{Math.round(rect.size * 100)}%</em>
                        </div>

                        <div className={`bfm-ctl-row ${rect.z === 'under' ? 'is-off' : ''}`}>
                          <span className="bfm-ctl-label">圆角</span>
                          <input
                            type="range" className="bfm-range"
                            min={0} max={RADIUS_MAX} step={1}
                            value={rect.radius}
                            disabled={rect.z === 'under'}
                            onChange={e => patchRect({ radius: Number(e.target.value) })}
                            aria-label="矩形圆角"
                          />
                          <em className="bfm-ctl-val">{rect.radius}</em>
                        </div>

                        {rect.z === 'under' && (
                          <p className="bfm-ctl-note">
                            视频在图下时，露出来的形状就是边框洞口本身，圆角由它决定，这里不用调。
                          </p>
                        )}

                        <div className="bfm-ctl-foot">
                          <span className="bfm-ctl-pos">
                            X {Math.round(rect.x * 100)}% · Y {Math.round(rect.y * 100)}%
                          </span>
                          <button
                            type="button" className="bfm-link-btn"
                            onClick={() => setRect({ ...DEFAULT_RECT, z: rect.z, radius: rect.radius })}
                          >
                            <Crosshair size={12} /> 复位居中
                          </button>
                        </div>
                      </div>
                    </div>
                  </aside>

                  <section className="bfm-out">
                    <header className="mix-out-head">
                      <div className="mix-out-title">
                        调整视频位置
                        <span className="mix-out-sub">
                          {cutFrames.length
                            ? `第 ${curIndex + 1}/${cutFrames.length} 张 · 已勾选 ${useFrames.length}`
                            : '先回上一步挖出边框'}
                        </span>
                      </div>
                      <div className="bfm-out-tools">
                        <button
                          type="button"
                          className={`bfm-ghost-btn ${ghostPin ? 'is-on' : ''}`}
                          onClick={() => setGhostPin(v => !v)}
                          title="边框半透明，看清矩形超出去多少（拖动时自动开）"
                        >
                          <Eye size={13} /> 透视边框
                        </button>
                        {cutFrames.length > 0 && (
                          <button type="button" className="bfm-link-btn" onClick={toggleAllUse}>
                            {allUsed ? '全不选' : '全选'}
                          </button>
                        )}
                      </div>
                    </header>

                    <div className="mix-out-body bfm-place-body">
                      {!curFrame ? (
                        <div className="mix-out-empty">
                          <span className="mix-out-empty-icon" aria-hidden="true">
                            <Scissors size={38} strokeWidth={1.2} />
                          </span>
                          <h3 className="mix-out-empty-title">还没有挖空的边框</h3>
                          <p>回第一步生成并抠像，挖空成功的边框会出现在这里</p>
                        </div>
                      ) : (
                        <>
                          <div className="bfm-stage-wrap">
                            <button
                              type="button" className="bfm-nav bfm-nav--prev"
                              disabled={cutFrames.length < 2}
                              onClick={() => setCursor((curIndex - 1 + cutFrames.length) % cutFrames.length)}
                              aria-label="上一张边框"
                            >
                              <ChevronLeft size={20} />
                            </button>

                            <PlaceStage
                              frame={curFrame}
                              rect={rect}
                              video={previewVideo}
                              onChange={setRect}
                              ghostPin={ghostPin}
                            />

                            <button
                              type="button" className="bfm-nav bfm-nav--next"
                              disabled={cutFrames.length < 2}
                              onClick={() => setCursor((curIndex + 1) % cutFrames.length)}
                              aria-label="下一张边框"
                            >
                              <ChevronRight size={20} />
                            </button>
                          </div>

                          <p className="bfm-stage-hint">
                            {previewVideo
                              ? '拖动矩形移动，四角缩放，方向键微调。矩形略大于洞口 + 视频在图下，边框会自己把视频裁成洞的形状。'
                              : '左侧上传一条视频，才看得出「视频在图上 / 图下」和圆角的差别。'}
                          </p>

                          <div className="bfm-strip" role="list">
                            {cutFrames.map((f, i) => (
                              <div
                                key={f.id} role="listitem"
                                className={`bfm-strip-item ${i === curIndex ? 'is-cur' : ''} ${f.use ? 'is-use' : ''}`}
                              >
                                <button
                                  type="button" className="bfm-strip-hit"
                                  onClick={() => setCursor(i)} title={`边框 ${f.no}`}
                                >
                                  <FrameComposite
                                    src={f.src} rect={rect}
                                    fill={<VideoFill video={previewVideo} />}
                                  />
                                </button>
                                <label className="mix-tick bfm-strip-tick" title={f.use ? '不用这张' : '用这张'}>
                                  <input
                                    type="checkbox" checked={f.use} onChange={() => toggleUse(f.id)}
                                    aria-label={`边框 ${f.no} ${f.use ? '取消勾选' : '勾选'}`}
                                  />
                                  <span className="mix-tick-box"><Check size={9} strokeWidth={3} /></span>
                                </label>
                                <span className="bfm-strip-no">{f.no}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </section>
                </>
              )}

              {/* ══════════ 第三步 · 套用与合成 ══════════ */}
              {step === 2 && (
                <>
                  <aside className="bfm-side">
                    <div className="bfm-panel">
                      <div className="bfm-panel-head">
                        <span className="bfm-panel-title">已选边框</span>
                        <span className="bfm-panel-hint">
                          {useFrames.length} 个 · {zLabel(rect.z)} {Math.round(rect.size * 100)}%
                        </span>
                      </div>
                      <div className="bfm-pool-grid bfm-pool-grid--compact">
                        {useFrames.map(f => (
                          <span key={f.id} className="bfm-pool-item" title={`边框 ${f.no}`}>
                            <FrameComposite
                              src={f.src} rect={rect}
                              fill={<VideoFill video={videos[0] || null} />}
                            />
                          </span>
                        ))}
                      </div>
                    </div>

                    {videoPool}

                    {/* 配比下拉 + 成片预估同行 */}
                    <div className="bfm-compose-bar">
                      <div className="bfm-compose-count">
                        <span className={`bfm-compose-num ${overCap ? 'is-over' : ''}`}>{product}</span>
                        <span className="bfm-compose-label">
                          条成片
                          <em>（{mode.formula(useFrames.length, videos.length)}）</em>
                        </span>
                        {overCap && (
                          <span className="bfm-compose-warn">
                            <AlertCircle size={12} /> 超出上限 {COMPOSE_CAP}
                          </span>
                        )}
                      </div>
                      <Picker
                        value={mode.label}
                        options={PAIR_MODES.map(m => m.label)}
                        onChange={lab => {
                          const next = PAIR_MODES.find(m => m.label === lab);
                          if (next) setPairMode(next.value);
                        }}
                        align="right"
                        up
                        title={mode.desc}
                      />
                    </div>

                    <button
                      type="button" className="mix-go"
                      disabled={!canSubmit}
                      onClick={startCompose}
                      title={
                        overCap
                          ? `超出上限，改用逐条轮换或减少素材，使条数 ≤ ${COMPOSE_CAP}`
                          : composing ? '正在逐条套框'
                            : product === 0 ? '先上传视频' : `开始套框合成 ${product} 条`
                      }
                    >
                      {composing
                        ? <><Loader2 size={15} className="spinner" /> 合成中…</>
                        : <>开始套框合成{product > 0 ? ` ${product} 条` : ''}</>}
                    </button>
                  </aside>

                  <section className="bfm-out">
                    <header className="mix-out-head">
                      <div className="mix-out-title">
                        套框成片
                        <span className="mix-out-sub">
                          {composeRows.length
                            ? (composeDone
                              ? `${composeRows.length} 条已合成，可下载`
                              : `${composeRows.filter(r => r.status === 'done').length}/${composeRows.length} 已合成`)
                            : '点左侧开始后，这里逐条套框'}
                        </span>
                      </div>
                    </header>

                    <div className="mix-out-body">
                      {composeRows.length === 0 ? (
                        <div className="mix-out-empty">
                          <span className="mix-out-empty-icon" aria-hidden="true">
                            <Layers size={38} strokeWidth={1.2} />
                          </span>
                          <h3 className="mix-out-empty-title">配好比后开始套框</h3>
                          <p>合成会一条一条出现在这里，位置用的是第二步定好的那套矩形</p>
                          <div className="upload-tips">
                            <span className="upload-tip">
                              <Image size={13} strokeWidth={1.8} />边框 {useFrames.length} 个
                            </span>
                            <span className="upload-tip">
                              <Video size={13} strokeWidth={1.8} />视频 {videos.length} 条
                            </span>
                            <span className="upload-tip">
                              <Layers size={13} strokeWidth={1.8} />将生成 {product} 条 · 上限 {COMPOSE_CAP}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="bfm-result-grid">
                          {composeRows.map(row => (
                            <ComposeResultCard
                              key={row.id}
                              row={row}
                              picked={picked.has(row.id)}
                              onToggle={() => togglePickRow(row.id)}
                              onPlay={r => setPreview({ title: `成片 ${r.no}`, src: r.videoUrl })}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {composeRows.length > 0 && (
                      <footer className="mix-out-foot bfm-out-foot">
                        <span className="bfm-out-foot-meta">
                          {useFrames.length} 框 · {OUT_SIZE} · {mode.label}
                        </span>
                        <div className="mix-out-foot-r">
                          <button type="button" className="btn-outline" onClick={toggleAllRows}>
                            {allPicked ? '取消全选' : '全选'}
                          </button>
                          <button
                            type="button"
                            className="btn-primary"
                            disabled={!canBatch}
                            title={canBatch ? `下载已勾选的 ${selectedDone.length} 条` : '请先勾选已合成的成片'}
                            onClick={downloadBatch}
                          >
                            <Download size={15} /> 批量下载{canBatch ? ` (${selectedDone.length})` : ''}
                          </button>
                        </div>
                      </footer>
                    )}
                  </section>
                </>
              )}

            </div>

            <div className="step-actions bfm-step-actions">
              {step > 0 ? (
                <button type="button" className="btn-ghost" onClick={() => setStep(step - 1)}>
                  <ArrowLeft size={16} /> 上一步
                </button>
              ) : (
                <span />
              )}
              {step === 0 && (
                <button
                  type="button"
                  className="btn-primary"
                  disabled={!canLeaveGen}
                  onClick={() => setStep(1)}
                  title={canLeaveGen ? '去调整视频位置' : '先抠像出至少一个边框'}
                >
                  下一步 <ChevronRight size={16} />
                </button>
              )}
              {step === 1 && (
                <button
                  type="button"
                  className="btn-primary"
                  disabled={!canLeavePlace}
                  onClick={() => setStep(2)}
                  title={
                    !useFrames.length ? '至少勾选一个边框'
                      : !videos.length ? '先上传视频' : '去套用与合成'
                  }
                >
                  下一步 <ChevronRight size={16} />
                </button>
              )}
              {step === 2 && (composeRows.length ? <span /> : (
                <button
                  type="button"
                  className="btn-primary"
                  disabled={!canSubmit}
                  onClick={startCompose}
                >
                  {composing
                    ? <><Loader2 size={16} className="spinner" /> 合成中…</>
                    : <>开始套框合成{product ? ` (${product})` : ''}</>}
                </button>
              ))}
            </div>
            </div>
          </div>
        </div>
      </div>

      {assetLibOpen && (
        <FrameRefLibraryDialog
          chosenKeys={refImgs.flatMap(r => [r.libId, r.url].filter(Boolean))}
          onConfirm={setRefFromLibrary}
          onClose={() => setAssetLibOpen(false)}
        />
      )}

      {vidLibOpen && (
        <FrameVidLibraryDialog
          chosenIds={videos.map(v => v.libId).filter(Boolean)}
          onConfirm={addLibraryVideos}
          onClose={() => setVidLibOpen(false)}
        />
      )}

      {preview && preview.src && (
        <PlayModal title={preview.title} src={preview.src} onClose={() => setPreview(null)} />
      )}

      {resumeAsk && (
        <div className="resume-overlay" onClick={() => setResumeAsk(false)}>
          <div
            className="resume-dialog" role="alertdialog" aria-modal="true"
            aria-label="检测到未完成的操作"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="resume-title">检测到未完成的操作</h3>
            <p className="resume-desc">
              您上次进行到了「{STEPS[step].label}」步骤
              {cutFrames.length ? `，已挖空 ${cutFrames.length} 个边框` : ''}
              {videos.length ? `，视频池里有 ${videos.length} 条` : ''}
              ，是否继续？
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
