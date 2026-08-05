#!/bin/zsh
# 本地预览 site/。用法：./scripts/serve.sh [端口]  （默认 8123）
#
# 为什么不用 python3 -m http.server：它不发 no-cache 头，浏览器会把 app.js / render/*.js
# 和 iframe 里的 clone/index.html 缓存住——改完刷新还是旧界面，看着像"改动没生效"。
# 这里强制 no-store，普通刷新即可看到最新代码，不必每次 Cmd+Shift+R。

set -euo pipefail

PORT=${1:-8123}
ROOT=$(cd "$(dirname "$0")/.." && pwd)/site

cd "$ROOT"
echo "SELVA demo → http://localhost:${PORT}/  (no-cache, Ctrl-C 退出)"

python3 - "$PORT" <<'PY'
import sys, functools, http.server, socketserver

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(('', int(sys.argv[1])), NoCache) as httpd:
    httpd.serve_forever()
PY
