#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root_dir="$(cd "$script_dir/../.." && pwd)"
cd "$root_dir"

bash _methodology/scripts/check-project.sh mcrm
node _methodology/scripts/check-matt-setup.mjs mcrm --require-git
bash _methodology/scripts/check-project.sh interaction-pattern-lab
node _methodology/scripts/check-sources.mjs mcrm
node _methodology/scripts/check-sources.mjs interaction-pattern-lab
(cd mcrm && corepack pnpm verify)
(cd interaction-pattern-lab && corepack pnpm verify)

echo "PASS  独立实践项目与交互验证场的当前实现检查通过；不代表其 pending Gate 已批准"
