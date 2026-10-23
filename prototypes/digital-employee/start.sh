#!/bin/sh
set -eu
HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
mkdir -p "$HERE/.runtime"
if [ -f "$HERE/.runtime/server.pid" ]; then
  PID=$(cat "$HERE/.runtime/server.pid")
  if kill -0 "$PID" 2>/dev/null && ps -p "$PID" -o command= | grep -Fq "$HERE/vite.config.mjs"; then
    echo "数字员工原型已运行：http://127.0.0.1:5175"; exit 0
  fi
fi
if lsof -tiTCP:5175 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "5175端口已被其他服务占用，未启动也未关闭其他服务。" >&2; exit 1
fi
nohup "$HERE/../../packages/web/node_modules/.bin/vite" --config "$HERE/vite.config.mjs" > "$HERE/.runtime/server.log" 2>&1 < /dev/null &
echo $! > "$HERE/.runtime/server.pid"
echo "数字员工原型启动中：http://127.0.0.1:5175"
echo "日志：$HERE/.runtime/server.log"
