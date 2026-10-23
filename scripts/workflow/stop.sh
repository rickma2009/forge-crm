#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/../.." && pwd)"
docker compose --env-file "$root/infra/workflow/.env" -f "$root/infra/workflow/compose.yaml" stop
