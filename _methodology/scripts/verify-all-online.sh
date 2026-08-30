#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root_dir="$(cd "$script_dir/../.." && pwd)"
cd "$root_dir"

bash _methodology/scripts/verify-all.sh
node _methodology/scripts/test-generated-profile.mjs

echo "PASS  离线全量检查与联网生成项目工程验证全部通过"
