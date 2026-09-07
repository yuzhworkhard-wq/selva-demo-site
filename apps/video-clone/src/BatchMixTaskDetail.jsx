import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, Check, Clock, Download, Film, Loader2, Music, Play, X,
} from 'lucide-react';
import { notifyHostModal } from './hostModal';

function download(url, name) {
  if (!url) return;
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name || 'mix'}.mp4`;
  a.click();
}

const MIX_STATUS = {
  pending: { key: 'pending', label: '待合成' },
  generating: { key: 'generating', label: '合成中' },
  done: { key: 'done', label: '合成成功' },
};

function clipStatus(v) {
  if (!v || !v.status || v.status === 'pending') return MIX_STATUS.pending;
  if (v.status === 'generating') return MIX_STATUS.generating;
  return MIX_STATUS.done;
}

function coverOf(v) {
  return v?.clips?.[0]?.cover || '';
}

function urlOf(v, task) {
  return v?.clips?.[0]?.url || task.cloneUrl || task.videoUrl || '';
}

function clipKey(v, i) {
  return v?.id || `mix-${i}`;
}

function PlayModal({ title, src, onClose }) {
  const videoRef = useRef(null);
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
          <video ref={videoRef} src={src} controls autoPlay playsInline />
        </div>
      </div>
    </div>
  );
}

/* ── 批量混剪任务详情 ──
   封面卡片墙；默认全选；仅点左上角勾选框改选中；点封面弹窗播放。
   套边框成片不走这里，留在批量套边框第二步右侧。 */
export function BatchMixTaskDetail({ task, onBack }) {
  const clips = (task && task.variants && task.variants.length) ? task.variants : [];
  const meta = task.mixMeta || {};
  const unit = '组合';
  const [picked, setPicked] = useState(() => new Set());
  const [preview, setPreview] = useState(null); // { title, src }

  useEffect(() => {
    setPicked(new Set(clips.map((v, i) => clipKey(v, i))));
  }, [task && task.id, clips.length]);

  const doneCount = clips.filter(v => clipStatus(v).key === 'done').length;
  const allDone = clips.length > 0 && doneCount === clips.length;
  const anyBusy = clips.some(v => {
    const s = clipStatus(v).key;
    return s === 'pending' || s === 'generating';
  });

  const selectedDone = clips.filter((v, i) => (
    picked.has(clipKey(v, i)) && clipStatus(v).key === 'done'
  ));
  const canBatch = selectedDone.length > 0;

  const toggle = (key, e) => {
    e?.stopPropagation?.();
    setPicked(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    if (picked.size === clips.length) setPicked(new Set());
    else setPicked(new Set(clips.map((v, i) => clipKey(v, i))));
  };

  const downloadBatch = () => {
    selectedDone.forEach((v) => {
      const i = clips.indexOf(v);
      download(urlOf(v, task), `${task.name}-${unit}${i + 1}`);
    });
  };

  const openPlay = (v, i) => {
    const st = clipStatus(v);
    if (st.key !== 'done') return;
    const src = urlOf(v, task);
    if (!src) return;
    setPreview({ title: `${unit} ${i + 1}`, src });
  };

  return (
    <div className="clone-page">
      <div className="clone-main">
        <div className="clone-topbar">
          <div className="clone-topbar-left">
            <button type="button" className="icon-btn" onClick={onBack} title="返回任务中心"><ArrowLeft size={18} /></button>
            <span className="clone-topbar-title">{task.name}</span>
            {allDone
              ? <span className="ctd-status ctd-status--done"><Check size={11} /> 全部合成</span>
              : <span className="ctd-status ctd-status--gen"><Loader2 size={11} className="spinner" /> {doneCount}/{clips.length} 已合成</span>}
          </div>
          <div className="bmd-top-acts">
            {meta.bgm && (
              <span className="bmd-top-bgm" title={meta.bgm.name}>
                <Music size={12} strokeWidth={1.8} /> {meta.bgm.name}
              </span>
            )}
            {clips.length > 0 && (
              <button type="button" className="btn-outline btn-sm" onClick={toggleAll}>
                {picked.size === clips.length ? '取消全选' : '全选'}
              </button>
            )}
            <button
              type="button"
              className="btn-primary btn-sm"
              disabled={!canBatch}
              title={
                !canBatch
                  ? (picked.size ? '所选条目尚未合成完成' : '请先勾选要下载的成片')
                  : `下载已勾选且已合成的 ${selectedDone.length} 条`
              }
              onClick={downloadBatch}
            >
              <Download size={13} /> 批量下载{canBatch ? ` (${selectedDone.length})` : ''}
            </button>
          </div>
        </div>

        <div className="bmd-gallery">
          {clips.length === 0 ? (
            <p className="bmd-gallery-empty">本任务没有成片</p>
          ) : (
            <div className="bmd-cards" role="list">
              {clips.map((v, i) => {
                const key = clipKey(v, i);
                const st = clipStatus(v);
                const cover = coverOf(v);
                const on = picked.has(key);
                const playable = st.key === 'done' && !!urlOf(v, task);
                return (
                  <article
                    key={key}
                    className={`bmd-card is-${st.key} ${on ? 'is-picked' : ''} ${playable ? 'is-playable' : ''}`}
                    role="listitem"
                  >
                    <div className="bmd-card-cover">
                      <button
                        type="button"
                        className="bmd-card-hit"
                        onClick={() => openPlay(v, i)}
                        disabled={!playable}
                        title={playable ? `播放${unit} ${i + 1}` : st.label}
                      >
                        {cover
                          ? <img src={cover} alt="" />
                          : urlOf(v, task)
                            ? <video src={urlOf(v, task)} preload="metadata" muted playsInline
                                onLoadedData={e => { try { e.currentTarget.currentTime = 0.1; } catch { /* ignore */ } }} />
                            : <span className="bmd-card-fallback"><Film size={28} strokeWidth={1.3} /></span>}

                        {playable && (
                          <span className="bmd-card-play" aria-hidden="true">
                            <Play size={18} fill="currentColor" />
                          </span>
                        )}

                        {st.key === 'generating' && (
                          <span className="bmd-card-overlay">
                            <Loader2 size={22} className="spinner" />
                            <em>合成中</em>
                          </span>
                        )}
                        {st.key === 'pending' && anyBusy && (
                          <span className="bmd-card-overlay bmd-card-overlay--dim">
                            <em>排队中</em>
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        className={`bmd-card-tick ${on ? 'is-on' : ''}`}
                        onClick={e => toggle(key, e)}
                        aria-pressed={on}
                        aria-label={on ? `取消勾选${unit} ${i + 1}` : `勾选${unit} ${i + 1}`}
                        title={on ? '取消勾选' : '勾选'}
                      >
                        {on && <Check size={11} strokeWidth={3} />}
                      </button>
                    </div>

                    <div className="bmd-card-foot">
                      <div className="bmd-card-title">{unit} {i + 1}</div>
                      <div className={`bmd-card-status is-${st.key}`}>
                        {st.key === 'generating'
                          ? <Loader2 size={12} className="spinner" />
                          : st.key === 'done'
                            ? <Check size={12} strokeWidth={2.6} />
                            : <Clock size={12} strokeWidth={2} />}
                        <span>{st.label}</span>
                        <i className="bmd-card-sep" aria-hidden="true" />
                        <em>1080*1920</em>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {preview && (
        <PlayModal title={preview.title} src={preview.src} onClose={() => setPreview(null)} />
      )}
    </div>
  );
}
