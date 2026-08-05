import React, { useState } from 'react';
import { ToolboxPage } from './ToolboxPage';
import { CloneModal } from './CloneModal';
import { VideoGenModal } from './VideoGenModal';
import './styles.css';

export default function App() {
  const [videoGenOpen, setVideoGenOpen] = useState(false);
  const [videoGenAlive, setVideoGenAlive] = useState(false);
  const [videoGenKey, setVideoGenKey] = useState(0);

  // 克隆会话：中途退出/切换只隐藏不卸载（进度保留），流程完成才卸载；换 key = 重新开始
  const [cloneOpen, setCloneOpen] = useState(false);
  const [cloneAlive, setCloneAlive] = useState(false);
  const [cloneKey, setCloneKey] = useState(0);

  const openClone = () => { setCloneAlive(true); setCloneOpen(true); };
  const closeClone = (keepSession) => { setCloneOpen(false); if (!keepSession) setCloneAlive(false); };

  const openVideoGen = () => { setVideoGenAlive(true); setVideoGenOpen(true); };
  const closeVideoGen = (keepSession) => { setVideoGenOpen(false); if (!keepSession) setVideoGenAlive(false); };

  return (
    <>
      <ToolboxPage
        onStartClone={openClone}
        onStartVideoGen={openVideoGen}
      />
      {cloneAlive && (
        <CloneModal
          key={cloneKey}
          visible={cloneOpen}
          onClose={closeClone}
          onRestart={() => setCloneKey(k => k + 1)}
        />
      )}
      {videoGenAlive && (
        <VideoGenModal
          key={videoGenKey}
          visible={videoGenOpen}
          onClose={closeVideoGen}
          onRestart={() => setVideoGenKey(k => k + 1)}
        />
      )}
    </>
  );
}
