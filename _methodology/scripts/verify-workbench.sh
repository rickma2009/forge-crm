#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root_dir="$(cd "$script_dir/../.." && pwd)"

cd "$root_dir"

node _methodology/scripts/init-skills.mjs --check

node --test _methodology/examples/000-golden-slice-customer-lead/implementation/customer-lead.test.mjs
bash _methodology/scripts/check-sdd.sh _methodology/examples/000-golden-slice-customer-lead

node --test _methodology/examples/001-golden-slice-lead-review-workflow/implementation/lead-review-workflow.test.mjs
bash _methodology/scripts/check-sdd.sh _methodology/examples/001-golden-slice-lead-review-workflow

node _methodology/scripts/check-ui-patterns.mjs
node _methodology/scripts/check-record-workspace.mjs
node _methodology/scripts/check-enterprise-interaction-catalog.mjs

bash _methodology/scripts/check-project.sh mcrm
bash _methodology/scripts/check-project.sh interaction-pattern-lab
bash _methodology/scripts/check-sdd.sh interaction-pattern-lab/.specify/specs/001-pattern-catalog-preview full
node _methodology/scripts/check-markdown-links.mjs .
(cd mcrm && corepack pnpm verify)
(cd interaction-pattern-lab && corepack pnpm verify)

if [[ ! -d .git ]]; then
  echo "FAIL  sdd-forge 根目录尚未初始化 Git" >&2
  exit 1
fi

if ! git check-ignore -q mcrm || ! git check-ignore -q _ref/gf_scm; then
  echo "FAIL  根仓库未隔离独立嵌套仓库" >&2
  exit 1
fi

echo "PASS  工作台方法论、模板、案例、项目基线和版本隔离全部通过"
