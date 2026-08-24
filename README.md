# Selva Demo Site

SELVA 平台 demo 的**唯一**开发与发布仓库。所有改动都在这里做。

## Structure

- `site/`: GitHub Pages 实际部署的目录（推 `main` 即上线）
- `source/`: `site/` 的镜像备份 —— **改了 `site/` 就必须同改 `source/`，两处不允许分叉**
- `apps/video-clone/`: 视频克隆 / 视频生成两个工具的 React 源码（平台是纯 JS，这两个工具以 iframe 承载）
- `scripts/sync-source.sh`: 历史遗留脚本，**不要运行**（它会用旧的 `/Users/a./Documents/selva` 覆盖 `site/`）

## Update flow

验收只看主仓整体 demo：`site/`（`./scripts/serve.sh` → http://localhost:8123/），从平台里点进工具。
`apps/video-clone` 的 `npm run dev`（localhost:5180）只给开发自测，**不要拿给用户看**。子应用改完但没 `npm run build` 进 `site/clone/`，不算改好了。

### 平台本体（纯 JS，无构建）

1. 改 `site/` 下的 `app.js` / `data.js` / `state.js` / `render/` / `actions/` / `styles.css`。
2. 同步改 `source/` 下对应的同名文件（`source/` 另有 `tests/`、`docs/`）。
3. 提交前 `git diff --stat` 过一遍。

### 视频克隆 / 视频生成（React）

1. 改 `apps/video-clone/src/`。
2. `cd apps/video-clone && npm run build` —— 产物直接落 `site/clone/`，并自动同步到 `source/clone/`。
3. 给用户看效果：只用 `./scripts/serve.sh`，从平台里点进去。不要打开子应用独立页当演示。

## 本地预览

    ./scripts/serve.sh          # → http://localhost:8123/  （验收用这个）

**不要用 `python3 -m http.server`**：它不发 no-cache 头，浏览器会缓存 `render/*.js` 和 iframe 里的
`clone/index.html`，改完刷新还是旧界面，看着像"改动没生效"（已经因此误判过两次）。
`serve.sh` 强制 no-store，普通刷新即可。

## Deploy

推 `main` 后 GitHub Pages 自动重新部署。若 `deploy-pages` 失败，**不要 `gh run rerun --failed`**（双 artifact 会冲突），要重新触发一次完整的 workflow run。
