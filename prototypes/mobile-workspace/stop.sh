#!/bin/sh
set -eu
HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
if [ ! -f "$HERE/.runtime/server.pid" ];then echo "没有本原型的运行记录。";exit 0;fi
PID=$(cat "$HERE/.runtime/server.pid")
if kill -0 "$PID" 2>/dev/null;then
 if ! ps -p "$PID" -o command= | grep -Fq "$HERE/vite.config.mjs";then echo "PID不属于本原型，拒绝停止。" >&2;exit 1;fi
 kill "$PID"
fi
rm "$HERE/.runtime/server.pid"
echo "移动原型已关闭，正式服务未受影响。"
