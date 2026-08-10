import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, ArrowUp, Lock, AlertCircle, Loader2, Eye, Film, Music, ChevronDown, Check } from 'lucide-react';
import { notifyHostModal } from './hostModal';
import { steerToDims, readVideoDims } from './briefParser';
import {
  ModelPicker, Stepper, AutoTextarea, modelCfg,
  AddRefButton, LibraryPickDialog, REF_KINDS, kindLabel,
} from './VideoGenModal';

const PRESET_LEVELS = [
  { value: 'basic', label: '初级', description: '保持主题，仅调整人物、场景或视觉呈现。' },
  { value: 'medium', label: '中级', description: '保留核心信息，重组叙事结构与关键表达。' },
  { value: 'advanced', label: '高级', description: '保留创作目标，重新构建内容策略与表达方式。' },
];

function FanoutPresetControl({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const lastValue = useRef(value || 'basic');
  const ref = useRef(null);
  const active = PRESET_LEVELS.find(level => level.value === value) || PRESET_LEVELS[0];

  useEffect(() => {
    if (value) lastValue.current = value;
  }, [value]);
  useEffect(() => {
    if (!open) return;
    const away = e => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const escape = e => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  const toggle = () => {
    if (value) {
      setOpen(false);
      onChange(null);
    } else {
      onChange(lastValue.current);
    }
  };

  return (
    <div className={`fo-preset-control ${value ? 'is-on' : ''}`} ref={ref}>
      <button type="button" className="fo-preset-toggle" onClick={toggle}
        role="switch" aria-checked={!!value} title={value ? '关闭自动，改用自定义指令' : '开启自动裂变'}>
        <span className="fo-preset-switch" aria-hidden="true"><i /></span>
        <span>自动</span>
      </button>
      {value && (
        <>
          <span className="fo-preset-divider" />
          <button type="button" className="fo-preset-value" onClick={() => setOpen(v => !v)}
            aria-expanded={open} aria-haspopup="menu" title={active.description}>
            <span>{active.label}</span><ChevronDown size={12} />
          </button>
          {open && (
            <div className="fo-preset-menu" role="menu">
              <div className="fo-preset-menu-title">自动裂变</div>
              {PRESET_LEVELS.map(level => (
                <button key={level.value} type="button" role="menuitemradio"
                  aria-checked={value === level.value}
                  className={`fo-preset-option ${value === level.value ? 'active' : ''}`}
                  onClick={() => { onChange(level.value); setOpen(false); }}>
                  <span className="fo-preset-option-copy">
                    <b>{level.label}</b><small>{level.description}</small>
                  </span>
                  {value === level.value && <Check size={14} />}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ══ 定向裂变面板 ══
   任务详情里点「裂变」弹出。语义是**控制变量**：以某一条已出片的变体为基准，
   用户说变什么就变什么、没说的逐字沿用——这样 N 条之间的差异才归因得清楚。

   界面上不谈「维度」：用户写一句话就行，认成哪几维是后台的事（steerToDims 照常算，
   只是不摆到脸上让他确认）。形态照搬第一步那张输入卡（.composer）：
   素材 chip、中间 textarea、底栏左＝加素材、右＝生成选项 + 圆形发送。
   画幅/时长走 idea-pick--locked 锁定态，因为一旦跟着改，出来的片子就跟基准条不可比了。 */

export function FanoutDialog({ task, baseIndex, onClose, onSubmit, needsRead = false }) {
  const base = (task.variants && task.variants[baseIndex]) || null;

  /* 视频理解：读不出基准时先跑这一道。
     为什么必须有——magic=off 的那批 N 条提示词逐字相同，历史任务连 dims 都没存。
     这时「以视频 3 为底」在文字里是句空话：它跟视频 1 的差异只存在于成片像素里。
     不跑理解就拿那份共享 dims 去变，出来的东西跟视频 3 长什么样毫无关系——那是骗人。
     所以先看片，把成片反解成维度取值，用户确认后才谈得上「其余逐字沿用」。

     demo 里用「模型看完片报出来的取值」模拟：优先用这条自己的 dims（有就直接认），
     没有就从库里按 baseIndex 定一组——真实接入时换成视频理解接口的返回即可。 */
  const [reading, setReading] = useState(needsRead);
  const [readDims, setReadDims] = useState(() => (needsRead ? null : (base && base.dims) || []));
  useEffect(() => {
    if (!needsRead) return;
    const t = setTimeout(() => {
      setReadDims(readVideoDims(task, baseIndex));
      setReading(false);
    }, 1600);
    return () => clearTimeout(t);
  }, [needsRead, task, baseIndex]);
  const baseDims = readDims || [];

  const [steer, setSteer] = useState('');
  /* 变哪几维只在后台算，界面上不摆：用户写了什么就变什么，没写的沿用基准条。
     让他先确认「你是说人物设定吗」是把系统的活推给用户干。 */
  const [model, setModel] = useState(task.model || 'Seedance 2.0');
  const [count, setCount] = useState(4);
  /* 自动裂变：用户不写自定义指令时，可按三个层级自动生成变化。 */
  const [preset, setPreset] = useState('basic'); // null | 'basic' | 'medium' | 'advanced'
  const [sending, setSending] = useState(false);
  /* 参考素材：跟第一步那张输入卡同一套入口（本地上传 / 资源库），同一套模型配额。
     裂变时最常见的动作就是「换成这张脸/这个场景」——没有图，那句话说不清楚。 */
  const [refImages, setRefImages] = useState([]);
  const [refVideos, setRefVideos] = useState([]);
  const [refAudios, setRefAudios] = useState([]);
  const [libOpen, setLibOpen] = useState(false);
  const objUrls = useRef([]);
  useEffect(() => () => objUrls.current.forEach(u => URL.revokeObjectURL(u)), []);
  const refs = { image: refImages, video: refVideos, audio: refAudios };
  const setRefs = { image: setRefImages, video: setRefVideos, audio: setRefAudios };

  const varyKeys = useMemo(() => steerToDims(steer).map(d => d.key), [steer]);

  const clearPresetForInput = () => { if (preset) setPreset(null); };
  const setPresetMode = value => {
    setPreset(value);
    if (value) setSteer('');
  };

  // 弹窗开着时同步宿主遮罩，嵌入态下才有「全视口居中」的观感
  useEffect(() => {
    notifyHostModal(true);
    const onKey = (e) => { if (e.key === 'Escape' && !libOpen) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); notifyHostModal(false); };
  }, [onClose, libOpen]);

  /* 本地上传：一个文件框收全部类型，按 file.type 自己归类，超出模型配额的直接不收 */
  const addLocalFiles = (fileList) => {
    Array.from(fileList).forEach(file => {
      const kind = file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'image';
      if (cfgLimit(kind) <= refs[kind].length) return;
      const url = URL.createObjectURL(file);
      objUrls.current.push(url);
      setRefs[kind](prev => [...prev, { url, name: file.name }]);
    });
  };
  const addLibraryItems = (picked) => {
    picked.forEach(p => setRefs[p.kind](prev => [...prev, { url: p.url, name: p.name }]));
  };
  const removeRef = (kind, index) => setRefs[kind](prev => prev.filter((_, i) => i !== index));

  /* 基准条一句话认领：人物 + 场景是权重最高的两维，也最认得出是哪条片子。
     基准条没这两维（用户当初写死了）就退回序号，不编。 */
  const baseTag = ['character', 'setting']
    .map(k => baseDims.find(d => d.key === k))
    .filter(Boolean).map(d => d.value).join(' · ');

  /* 换模型可能把时长带走：基准条 15s，Google omni 只出 10s，
     那就不是控制变量了。不拦着换，但必须说破。 */
  const cfg = modelCfg(model);
  const durationKept = cfg.durations.includes(task.outDuration);
  const duration = durationKept ? task.outDuration : cfg.durations[0];
  function cfgLimit(kind) { return modelCfg(model).limits[kind] || 0; }
  const refCount = refImages.length + refVideos.length + refAudios.length;

  // 说了要变什么才发得出去（写一句话，或挂一张图指着说，或开启自动）
  const blocked = (!steer.trim() && refCount === 0 && !preset) || sending || reading;
  const submit = () => {
    if (blocked) return;
    setSending(true);
    // 反解出来的基准要一起交出去：新任务的「其余逐字沿用」以它为准，
    // 不能让下游再去读那份共用的 dims（那份读不出这一条）
    onSubmit({
      baseIndex, steer: steer.trim(), varyKeys, model, count, duration, baseDims,
      readBase: needsRead, preset,
      images: refImages.map(x => x.url), refVideos, refAudios,
    });
  };

  return (
    <div className="resume-overlay" onClick={onClose}>
      <div className="fo-dialog" role="dialog" aria-modal="true" aria-label="裂变"
        onClick={e => e.stopPropagation()}>
        <div className="fo-head">
          <div>
            <h3 className="resume-title">裂变</h3>
            <p className="resume-desc">以这一条为底，你说改什么就改什么，没说的原样不动</p>
          </div>
          <button className="icon-btn" onClick={onClose} title="关闭"><X size={18} /></button>
        </div>

        {/* 基准条：控制变量的前提摆在最显眼处，用户不会误以为是从零重开 */}
        <div className="fo-base">
          <span className="fo-base-th">
            <video src={task.cloneUrl} preload="metadata" muted playsInline
              onLoadedData={e => { try { e.currentTarget.currentTime = 0.1 + baseIndex * 0.6; } catch {} }} />
          </span>
          <span className="fo-base-txt">
            <em>基准</em>
            <b>视频 {baseIndex + 1}{baseTag ? ` · ${baseTag}` : ''}</b>
          </span>
          {/* 分析中时这里留空：下面那条横幅已经在说「正在分析画面」，
              同一句话在同一个弹窗里出现两遍是噪音 */}
          {!reading && <span className="fo-base-tail">没说到的部分逐字沿用</span>}
        </div>

        {/* 为什么要等这一下：这批没开 Magic Prompt（或是历史任务），N 条提示词一模一样，
            文字里读不出这一条长什么样，只能先看片。说清楚了用户才不觉得是卡住了。 */}
        {needsRead && (
          <div className={`fo-read ${reading ? 'is-on' : 'is-done'}`}>
            {reading ? (
              <><Loader2 size={13} className="spinner" />
                <span>这批 N 条提示词相同，正在分析这一条的画面，读出它的人物 / 场景 / 镜头当作基准…</span></>
            ) : (
              <><Eye size={13} strokeWidth={1.8} />
                <span>基准取自<b>这一条的画面分析</b>（提示词里读不出各条差异）——下面这些是模型读到的，不对可以改。</span></>
            )}
          </div>
        )}

        <div className={`composer composer--fanout ${preset ? 'composer--fanout-auto' : ''}`}>
          {/* 挂上来的参考素材：跟第一步那张输入卡同一种 chip */}
          {refCount > 0 && (
            <div className="idea-dock">
              <div className="idea-dock-imgs">
                {REF_KINDS.map(({ key }) => refs[key].map((item, idx) => {
                  const over = idx >= cfgLimit(key);
                  const lbl = kindLabel(model, key);
                  const tip = over ? `超出 ${model} 的${lbl}上限，请删除` : (item.name || lbl);
                  if (key === 'image') return (
                    <div key={`${key}-${idx}`} className={`idea-img-chip ${over ? 'over' : ''}`} title={tip}>
                      <img src={item.url} alt="" className="idea-chip-thumb" />
                      <button type="button" className="idea-chip-close" onClick={() => removeRef(key, idx)} title="删除"><X size={10} /></button>
                    </div>
                  );
                  return (
                    <div key={`${key}-${idx}`} className={`idea-file-chip ${over ? 'over' : ''}`} title={tip}>
                      {key === 'video' ? <Film size={13} strokeWidth={1.8} /> : <Music size={13} strokeWidth={1.8} />}
                      <span className="idea-file-name">{item.name || lbl}</span>
                      <button type="button" className="idea-chip-close" onClick={() => removeRef(key, idx)} title="删除"><X size={10} /></button>
                    </div>
                  );
                }))}
              </div>
            </div>
          )}

          <div className={`fo-steer-collapse ${preset ? 'is-collapsed' : ''}`} aria-hidden={!!preset}>
            <AutoTextarea
              value={steer} onFocus={clearPresetForInput}
              onChange={value => { clearPresetForInput(); setSteer(value); }} onSubmit={submit}
              readOnly={!!preset} tabIndex={preset ? -1 : 0}
              minRows={2} maxHeight={140} maxLength={200}
              placeholder={reading ? '正在分析画面…' : '想怎么变？比如：换成这张脸、场景挪到户外'}
            />
          </div>

          {!durationKept && (
            <div className="composer-warn">
              <AlertCircle size={13} strokeWidth={2} />
              <span>{model} 只出 {duration}，跟基准条的 {task.outDuration} 对不上，这批时长会变</span>
            </div>
          )}

          <div className="composer-bar">
            <div className="composer-bar-left">
              <AddRefButton
                model={model} refs={refs}
                onAddFiles={addLocalFiles} onOpenLibrary={() => setLibOpen(true)}
              />
              <FanoutPresetControl value={preset} onChange={setPresetMode} />
            </div>
            <div className="composer-bar-right">
              <ModelPicker value={model} onChange={setModel} />
              <span className="idea-pick idea-pick--locked" title="沿用基准条的画幅——改了就跟它不可比了">
                <span className="idea-pick-btn">
                  <span className="idea-pick-val">{task.aspect || '9:16'}</span>
                  <Lock size={11} className="idea-pick-chev" />
                </span>
              </span>
              <span className="idea-pick idea-pick--locked" title={durationKept ? '沿用基准条的时长——改了就跟它不可比了' : `${model} 的时长固定为 ${duration}`}>
                <span className="idea-pick-btn">
                  <span className="idea-pick-val">{duration}</span>
                  <Lock size={11} className="idea-pick-chev" />
                </span>
              </span>
              <Stepper value={count} onChange={setCount} title="裂变条数" />
              <button
                type="button" className="composer-send" disabled={blocked} onClick={submit}
                title={reading ? '正在分析画面…' : blocked ? '先说说要变什么' : `裂变 ${count} 条`}
              >
                {reading || sending ? <Loader2 size={16} className="spinner" /> : <ArrowUp size={17} strokeWidth={2.2} />}
              </button>
            </div>
          </div>
        </div>
        {libOpen && (
          <LibraryPickDialog
            model={model} refs={refs}
            onConfirm={(picked) => { addLibraryItems(picked); setLibOpen(false); }}
            onClose={() => setLibOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
