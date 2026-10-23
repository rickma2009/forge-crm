#!/bin/sh
set -eu
HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
if [ ! -f "$HERE/.runtime/server.pid" ]; then echo "没有此原型的服务PID。"; exit 0; fi
PID=$(cat "$HERE/.runtime/server.pid")
case "$PID" in ''|*[!0-9]*) echo "PID无效，未终止进程。" >&2; exit 1;; esac
if kill -0 "$PID" 2>/dev/null; then
  if ! ps -p "$PID" -o command= | grep -Fq "$HERE/vite.config.mjs"; then echo "PID已不属于审批原型，未终止进程。" >&2; exit 1; fi
  kill "$PID"
fi
rm -f "$HERE/.runtime/server.pid"
echo "审批原型已关闭，正式系统服务未受影响。"
