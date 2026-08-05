import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/* 视频克隆 / 视频生成两个工具的源码。平台（site/）是纯 JS 无构建，这两个工具是 React，
   所以构建产物直接落到 site/clone/ —— 平台用 iframe 承载它（clone/index.html?embed=EmbedApp）。
   npm run build 会连带同步 source/clone/，两份镜像不允许分叉。 */
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // 线上走 GitHub Pages 项目子路径，构建产物用相对路径即可自适配
  base: command === 'build' ? './' : '/',
  server: { port: 5180 },
  build: {
    outDir: '../../site/clone',
    emptyOutDir: true,
  },
}));
