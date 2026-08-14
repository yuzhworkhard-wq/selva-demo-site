import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, Loader2, X } from 'lucide-react';
import { StepUpload } from './CloneModal';
import { FanoutPanel } from './FanoutDialog';
import { buildFanoutScripts, FANOUT_DIMS, readVideoDims } from './briefParser';
import { normalizeRegions } from './videoRegionConfig.mjs';

const EMPTY_TASK = {
  id: 'uploaded-video-fanout',
  name: '视频裂变',
  toolName: '视频裂变',
  sourceText: '',
  images: [],
  variants: [{ dims: readVideoDims({ sourceText: '', variants: [{}] }, 0) }],
  aspect: '9:16',
  outDuration: '15s',
  model: 'Seedance 2.0',
  cloneUrl: null,
};

export function VideoFanoutModal({
  onClose, onRestart, visible = true, embedded = false, onSubmitTask = null,
  initialVideoUrl = null, initialFanout = null,
}) {
  const [videoFile, setVideoFile] = useState(initialVideoUrl ? { name: '已保存的基准视频' } : null);
  const [videoUrl, setVideoUrl] = useState(initialVideoUrl);
  const [sending, setSending] = useState(false);
  const [resumeAsk, setResumeAsk] = useState(false);
  const rootRef = useRef(null);
  const prevVisibleRef = useRef(visible);
  const videoUrlRef = useRef(null);
  const urlHandedOffRef = useRef(false);

  videoUrlRef.current = videoUrl;
  const hasProgress = !!videoFile || sending;

  useEffect(() => () => {
    const url = videoUrlRef.current;
    if (url && url !== initialVideoUrl && !urlHandedOffRef.current) URL.revokeObjectURL(url);
  }, []);

  useEffect(() => {
    if (!visible) {
      rootRef.current?.querySelectorAll('video').forEach(video => video.pause());
    } else if (!prevVisibleRef.current && hasProgress) {
      setResumeAsk(true);
    }
    prevVisibleRef.current = visible;
  }, [visible, hasProgress]);

  const exit = () => onClose(hasProgress);
  const task = {
    ...EMPTY_TASK,
    videoUrl,
    cloneUrl: videoUrl,
    fanoutFrom: videoUrl ? { videoUrl } : null,
  };

  const submit = payload => {
    if (sending || !videoUrl) return;
    setSending(true);
    const count = Math.min(4, Math.max(1, payload.count || 4));
    const regions = normalizeRegions(payload.regions);
    const baseDims = payload.baseDims && payload.baseDims.length
      ? payload.baseDims
      : readVideoDims({ sourceText: '', variants: [{}] }, 0);
    const varyKeys = payload.varyKeys || [];
    const variants = buildFanoutScripts({
      sourceText: '', imageUrls: payload.images || [], baseDims,
      varyKeys, steer: payload.steer || '', count, regions,
    });
    const taskPayload = {
      name: `视频裂变 · ${regions.length * count} 条`,
      toolName: '视频裂变',
      videoUrl,
      cloneUrl: videoUrl,
      variants,
      promptHtml: variants[0]?.promptHtml || '',
      promptText: variants.map(v => v.promptHtml.replace(/<[^>]+>/g, '')).join('\n---\n'),
      sourceText: '',
      images: payload.images || [],
      refVideos: payload.refVideos || [],
      refAudios: payload.refAudios || [],
      model: payload.model,
      regions,
      aspect: '9:16',
      outDuration: payload.duration,
      magic: payload.preset ? 'auto' : null,
      fanoutFrom: { videoUrl, baseIndex: 0, steer: payload.steer || '', regions, count,
        varyKeys,
        dimLabels: varyKeys.map(key => (FANOUT_DIMS.find(dim => dim.key === key) || {}).label).filter(Boolean),
        readBase: !!payload.readBase, preset: payload.preset || null },
    };
    if (onSubmitTask) {
      urlHandedOffRef.current = true;
      onSubmitTask(taskPayload);
    }
    onClose(false);
  };

  useEffect(() => {
    if (!visible) return undefined;
    const onKey = event => { if (event.key === 'Escape' && !resumeAsk) exit(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, resumeAsk, hasProgress]);

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
            <span className="clone-topbar-title">视频裂变</span>
          </div>
          <button className="icon-btn" onClick={exit} title="关闭"><X size={18} /></button>
        </div>
        <div className="clone-page-body">
          <div className="clone-page-inner">
            <StepUpload
              videoFile={videoFile} onVideoFile={setVideoFile}
              videoUrl={videoUrl} onVideoUrl={setVideoUrl}
              protectedUrl={initialVideoUrl}
              title="爆款视频，" accent="裂变更多可能"
              description="上传一条想继续测试的参考视频，保持基准片的核心内容，按你的方向生成多条视频变体"
              showcaseSrc="fanout-showcase.jpg"
              showcaseAlt="一条视频裂变出多种故事"
              showcaseClass="upload-showcase-img--poster"
              afterDone={
                <>
                  <FanoutPanel
                    task={task} baseIndex={0}
                    modal={false} layout="inline" onClose={exit} onSubmit={submit}
                    initialValues={initialFanout}
                  />
                  {sending && <span className="video-fanout-sending"><Loader2 size={14} className="spinner" /> 正在提交裂变任务</span>}
                </>
              }
            />
          </div>
        </div>
      </div>
      {resumeAsk && (
        <div className="resume-overlay" onClick={() => setResumeAsk(false)}>
          <div className="resume-dialog" role="alertdialog" aria-modal="true" aria-label="检测到未完成的操作" onClick={event => event.stopPropagation()}>
            <h3 className="resume-title">检测到未完成的操作</h3>
            <p className="resume-desc">检测到已上传的参考视频，是否继续裂变？</p>
            <div className="resume-actions">
              <button className="btn-outline" onClick={() => { setResumeAsk(false); onRestart(); }}>重新开始</button>
              <button className="btn-primary" autoFocus onClick={() => setResumeAsk(false)}><Check size={15} /> 继续操作</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
