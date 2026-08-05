import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import EmbedApp from './EmbedApp';

// ?embed：作为 SELVA 平台工具箱内嵌 iframe 运行（只挂克隆流程，不带自己的工具箱首页）
const isEmbed = new URLSearchParams(window.location.search).has('embed');
if (isEmbed) document.documentElement.classList.add('is-embed');
createRoot(document.getElementById('root')).render(isEmbed ? <EmbedApp /> : <App />);
