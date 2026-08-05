import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft, RefreshCw, Download, Pencil,
  Copy, Check, Loader2, Play,
} from 'lucide-react';
import { bindChipZoom } from './chipZoom';
import { notifyHostModal } from './hostModal';

// 关键帧 hover 操作 icon（原生 HTML 按钮，与第三步 KF_*_ICON 同风格）
const KFD_ZOOM_ICON = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="11" x2="11" y1="8" y2="14"/><line x1="8" x2="14" y1="11" y2="11"/></svg>';
const KFD_DL_ICON = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>';

/* 视频预览：点击播放/暂停，未播放时中央播放钮（对齐第三步参考视频的交互语言） */
function Vid({ src, label }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };
  return (
    <div className="ctd-vbox" onClick={toggle} title={playing ? '暂停' : '播放'}>
      <video
        ref={ref} src={src} playsInline preload="metadata"
        aria-label={label}
        onLoadedData={e => { try { e.currentTarget.currentTime = 0.1; } catch {} }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      {!playing && <span className="ctd-vplay"><Play size={15} /></span>}
    </div>
  );
}

/* 任务详情（嵌入模式）：左＝原视频 ⇄ 克隆成片对照，右＝可复制的提示词全文（竖线分隔，不套卡片壳）。
   操作：重新生成（重新提交任务，回任务中心跟踪）/ 下载成片 / 重新编辑（回到第三步分镜编辑）。 */
export function CloneTaskDetail({ task, onBack, onReEdit, onRegenerate }) {
  const [copied, setCopied] = useState(false);
  const [zoom, setZoom] = useState(null);   // 大图查看：{src, name}
  const [toast, setToast] = useState(null); // 轻提示（如重新生成已提交）
  const copyTimer = useRef(null);
  const toastTimer = useRef(null);
  const bodyRef = useRef(null);
  useEffect(() => () => { clearTimeout(copyTimer.current); clearTimeout(toastTimer.current); }, []);

  function showToast(msg) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }

  // 渲染前处理提示词 HTML（字符串级，不依赖挂载时序）：
  // 每镜关键帧统一重建——占位态补成关键帧图（frames 命名与分镜表对应），已有图保留；
  // hover 操作换成详情语义的「放大 / 下载」（编辑器里的重生成/上传在只读详情不适用）
  const displayHtml = React.useMemo(() => {
    const raw = (task && task.promptHtml) || '';
    if (!raw) return '';
    const div = document.createElement('div');
    div.innerHTML = raw;
    div.querySelectorAll('.sb-kfimg').forEach(span => {
      const i = Number(span.dataset.shot) || 0;
      const num = span.querySelector('.sb-kfimg-num');
      const img = span.querySelector('img');
      const src = img ? img.getAttribute('src') : `frames/frame_0${(i % 9) + 1}.jpg`;
      span.className = 'sb-kfimg sb-kfimg--new';
      span.removeAttribute('title');
      span.innerHTML = `<img src="${src}" alt="镜头${i + 1}关键帧">${num ? num.outerHTML : ''}`
        + '<span class="sb-kfimg-acts">'
        + `<button class="sb-kfimg-act" data-act="zoom" title="放大查看">${KFD_ZOOM_ICON}</button>`
        + `<button class="sb-kfimg-act" data-act="download" title="下载">${KFD_DL_ICON}</button>`
        + '</span>';
    });
    return div.innerHTML;
  }, [task && task.promptHtml]);

  // 小图 hover 放大预览（@chip 与关键帧共用）
  useEffect(() => bindChipZoom(bodyRef.current), [displayHtml]);

  // 大图查看：Esc 关闭；嵌入模式同步宿主遮罩（全局弹窗观感）
  useEffect(() => {
    if (!zoom) return;
    notifyHostModal(true);
    const onKey = (e) => { if (e.key === 'Escape') setZoom(null); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); notifyHostModal(false); };
  }, [zoom]);

  if (!task) return null;
  const generating = task.status !== 'done';

  // 提示词内点击分流：关键帧 hover 操作（放大/下载）→ 对应动作；点图本体（关键帧/@chip）→ 放大弹窗
  function downloadImg(src, name) {
    const a = document.createElement('a');
    a.href = src;
    a.download = `${name}.jpg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  function onPromptClick(e) {
    const closest = (sel) => (e.target && e.target.closest ? e.target.closest(sel) : null);
    const act = closest('.sb-kfimg-act');
    if (act) {
      const img = act.closest('.sb-kfimg').querySelector('img');
      if (!img) return;
      if (act.dataset.act === 'download') downloadImg(img.src, img.alt || '关键帧');
      else setZoom({ src: img.src, name: img.alt || '关键帧' });
      return;
    }
    const kf = closest('.sb-kfimg');
    if (kf) {
      const img = kf.querySelector('img');
      if (img) setZoom({ src: img.src, name: img.alt || '关键帧' });
      return;
    }
    const chip = closest('.sb-tok img');
    if (chip) setZoom({ src: chip.src, name: chip.alt || '参考图' });
  }
  function downloadZoom() {
    if (zoom) downloadImg(zoom.src, zoom.name);
  }

  function copyPrompt() {
    const text = task.promptText || '';
    const done = () => {
      setCopied(true);
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(done);
    } else done();
  }

  function download() {
    if (!task.cloneUrl) return;
    const a = document.createElement('a');
    a.href = task.cloneUrl;
    a.download = `${task.name || 'clone-video'}.mp4`;
    document.body.appendChild(a);
    a.click();
    a.remove();
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
              : <span className="ctd-status ctd-status--done"><Check size={11} /> 已完成</span>}
          </div>
        </div>

        <div className="ctd-body">
          <section className="ctd-videos">
            <div className="ctd-video-row">
              <div className="ctd-vcol">
                <span className="ctd-vtag">原视频</span>
                <Vid src={task.videoUrl} label="原视频预览" />
              </div>
              <div className="ctd-vcol">
                <span className="ctd-vtag ctd-vtag--clone">克隆成片</span>
                {generating ? (
                  <div className="ctd-vbox ctd-vbox--slot">
                    <Loader2 size={20} className="spinner" />
                    <span>生成中，成片就绪后在此预览</span>
                  </div>
                ) : (
                  <Vid src={task.cloneUrl} label="克隆成片预览" />
                )}
              </div>
            </div>
            {/* 操作紧跟作用对象：三个动作都是对成片的操作，放视频区下方而非顶栏角落 */}
            <div className="ctd-actions">
              {/* 重新生成＝提交新任务，原任务/本页无任何状态变化，仅顶部轻提示告知 */}
              <button className="btn-outline" disabled={generating}
                onClick={() => { onRegenerate(); showToast('重新生成任务已提交至任务中心'); }}>
                <RefreshCw size={14} /> 重新生成
              </button>
              <button className="btn-outline" disabled={generating} onClick={download}>
                <Download size={14} /> 下载
              </button>
              <button className="btn-primary" onClick={onReEdit}>
                <Pencil size={14} /> 重新编辑
              </button>
            </div>
          </section>

          <section className="ctd-prompt">
            <div className="ctd-prompt-head">
              <span className="ctd-prompt-title">提示词</span>
              <button
                className={`ctd-copy ${copied ? 'ctd-copy--ok' : ''}`}
                onClick={copyPrompt}
                title="复制提示词"
                aria-label="复制提示词"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
              {copied && <span className="ctd-copied-hint">已复制</span>}
            </div>
            <div
              ref={bodyRef}
              className="ctd-prompt-body"
              onClick={onPromptClick}
              dangerouslySetInnerHTML={{ __html: displayHtml }}
            />
          </section>
        </div>
      </div>

      {/* 轻提示：胶囊 toast（沿用上传弹窗 up-toast 规格），底部居中 */}
      {toast && <div className="ctd-toast"><Check size={14} /> {toast}</div>}

      {/* 大图查看弹窗：面板规范对齐「检测到未完成的操作」——深色面板 + 标题 + 右下按钮组 */}
      {zoom && (
        <div className="ctd-zoom-overlay" onClick={() => setZoom(null)}>
          <div className="ctd-zoom-dialog" role="dialog" aria-modal="true" aria-label={zoom.name}
            onClick={e => e.stopPropagation()}>
            <h3 className="ctd-zoom-title">{zoom.name}</h3>
            <div className="ctd-zoom-pic"><img src={zoom.src} alt={zoom.name} /></div>
            <div className="ctd-zoom-acts">
              <button className="btn-outline" onClick={() => setZoom(null)}>关闭</button>
              <button className="btn-primary" autoFocus onClick={downloadZoom}><Download size={14} /> 下载</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
