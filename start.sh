#!/usr/bin/env bash
# 一键启动 Forge CRM 开发环境
# 用法: bash start.sh

set -euo pipefail
cd "$(dirname "$0")"

# 保留迁移前的容器和数据卷；不能按新目录名悄悄创建另一个空库。
db_container=interaction-pattern-lab-postgres-1
fail() { echo "错误：$*" >&2; exit 1; }
wait_ready() {
  local attempt
  for ((attempt = 1; attempt <= 30; attempt++)); do
    if "$@" >/dev/null 2>&1; then return 0; fi
    echo "    等待就绪... ($attempt/30)"
    sleep 2
  done
  return 1
}

echo "==> [1/4] 检查本地环境..."
for dependency in docker pnpm node lsof; do
  command -v "$dependency" >/dev/null 2>&1 || fail "缺少 $dependency，请先完成首次环境安装。"
done
[[ -f .env ]] || fail "缺少根目录 .env，请根据 .env.example 配置；不会自动覆盖或生成密钥。"
[[ -d node_modules ]] || fail "尚未安装项目依赖，请先执行 pnpm install --frozen-lockfile。"
# 当前开发入口使用默认前后端端口；不结束其他项目或已有服务。
for port in 5173 3000; do
  if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    fail "端口 $port 已被占用。如果本项目已启动，请使用原终端；需要重启时先在原终端按 Ctrl+C。"
  fi
done

echo "==> [2/4] 启动 Docker..."
if ! docker info >/dev/null 2>&1; then
  open -a OrbStack || fail "无法打开 OrbStack，请检查是否已安装。"
fi
wait_ready docker info || fail "Docker 在 60 秒内未就绪，请查看 OrbStack 状态后重试。"

echo "==> [3/4] 启动原数据库并等待就绪..."
docker inspect "$db_container" >/dev/null 2>&1 || fail "找不到原容器 $db_container。为保护原数据，未创建空库；请先核查原数据卷并恢复容器。"
docker start "$db_container" >/dev/null || fail "数据库容器启动失败，请检查上方错误（例如 55432 端口占用）。"
wait_ready docker exec "$db_container" pg_isready -U interaction_pattern_lab -d interaction_pattern_lab ||
  fail "Postgres 在 60 秒内未就绪。诊断命令：docker logs --tail 80 $db_container"

echo "==> [4/4] 启动 pnpm dev (前端+后端)..."
echo "    待 Vite / Nest 启动成功后访问：http://localhost:5173/"
echo "    保持此终端打开；Ctrl+C 停止前后端，数据库及数据卷保留。"
exec pnpm dev
