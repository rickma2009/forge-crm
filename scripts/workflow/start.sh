#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/../.." && pwd)"
config="$root/infra/workflow/.env"
if [[ ! -f "$config" ]]; then
  umask 077
  { echo "WORKFLOW_DATABASE_PASSWORD=$(openssl rand -hex 24)"; echo "WORKFLOW_SERVICE_TOKEN=$(openssl rand -hex 32)"; } > "$config"
fi
bash "$root/scripts/workflow/test.sh"
docker compose --env-file "$config" -f "$root/infra/workflow/compose.yaml" up -d --build
printf '工作流内部服务：http://127.0.0.1:8091（需服务令牌；不是浏览器页面）\n'
