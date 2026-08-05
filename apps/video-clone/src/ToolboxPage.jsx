import React from 'react';
import {
  FileText, Video, Globe, Mic, AlertTriangle,
  Clapperboard, Copy,
} from 'lucide-react';

const tools = [
  { icon: FileText, label: '脚本生成', category: 'content' },
  { icon: Video, label: '视频理解', category: 'content' },
  { icon: Globe, label: '文本翻译', category: 'content' },
  { icon: FileText, label: '文案提取', category: 'content' },
  { icon: Mic, label: '配音优化', category: 'content' },
  { icon: AlertTriangle, label: '添加警示语', category: 'content' },
  { icon: Clapperboard, label: '视频生成', category: 'video' },
];

export function ToolboxPage({ onStartClone, onStartVideoGen }) {
  return (
    <div className="toolbox-page">
      <div className="toolbox-header">
        <div className="toolbox-logo">
          <span className="logo-mark">S</span>
          <span className="logo-text">SELVA</span>
        </div>
        <h1 className="toolbox-title">工具箱</h1>
        <p className="toolbox-subtitle">选择工具开始创作</p>
      </div>

      <div className="toolbox-body">
        <section className="tool-section">
          <h2 className="section-label">内容工具</h2>
          <div className="tool-grid">
            {tools.filter(t => t.category === 'content').map(t => (
              <button key={t.label} className="tool-card" disabled>
                <t.icon size={20} strokeWidth={1.5} />
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="tool-section">
          <h2 className="section-label">视频生成工具</h2>
          <div className="tool-grid">
            <button className="tool-card tool-card--primary" onClick={onStartVideoGen}>
              <Clapperboard size={20} strokeWidth={1.5} />
              <span>视频生成</span>
              <span className="tool-badge">v2</span>
            </button>
          </div>
        </section>

        <section className="tool-section">
          <h2 className="section-label">克隆工具</h2>
          <div className="tool-grid">
            <button className="tool-card tool-card--primary" onClick={onStartClone}>
              <Copy size={20} strokeWidth={1.5} />
              <span>视频克隆</span>
              <span className="tool-badge">New</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
