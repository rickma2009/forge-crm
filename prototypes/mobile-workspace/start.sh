#!/bin/sh
set -eu
HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
mkdir -p "$HERE/.runtime"
if [ -f "$HERE/.runtime/server.pid" ]; then
 PID=$(cat "$HERE/.runtime/server.pid")
 if kill -0 "$PID" 2>/dev/null && ps -p "$PID" -o command= | grep -Fq "$HERE/vite.config.mjs"; then
  echo "移动原型已运行：http://127.0.0.1:5176";exit 0
 fi
fi
if lsof -tiTCP:5176 -sTCP:LISTEN >/dev/null 2>&1; then
 echo "5176端口已被占用，未启动或关闭其他服务。" >&2;exit 1
fi
nohup "$HERE/../../packages/web/node_modules/.bin/vite" --config "$HERE/vite.config.mjs" > "$HERE/.runtime/server.log" 2>&1 < /dev/null &
echo $! > "$HERE/.runtime/server.pid"
echo "移动原型启动中：http://127.0.0.1:5176"
