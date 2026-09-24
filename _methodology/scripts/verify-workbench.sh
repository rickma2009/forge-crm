#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root_dir="$(cd "$script_dir/../.." && pwd)"

cd "$root_dir"

node _methodology/scripts/init-skills.mjs --check
node _methodology/scripts/check-list-action-rule.mjs
node _methodology/scripts/check-page-style.mjs
node _methodology/scripts/check-matt-setup.mjs . --require-git
node _methodology/scripts/test-forge-init.mjs
node _methodology/scripts/check-database-governance.mjs .

for requirement_rule_file in AGENTS.md _methodology/templates/AGENTS-template.md _methodology/project-init/templates/AGENTS.md; do
  if ! rg -q "需求变更回写" "$requirement_rule_file"; then
    echo "FAIL  $requirement_rule_file 未声明需求变更回写规则" >&2
    exit 1
  fi
done
if ! rg -q "当前完整需求" _methodology/examples/000-golden-slice-customer-lead/requirements/original.md; then
  echo "FAIL  金标准案例未示范完整当前态需求" >&2
  exit 1
fi

node --test _methodology/examples/000-golden-slice-customer-lead/implementation/customer-lead.test.mjs
bash _methodology/scripts/check-sdd.sh _methodology/examples/000-golden-slice-customer-lead

node --test _methodology/examples/001-golden-slice-lead-review-workflow/implementation/lead-review-workflow.test.mjs
bash _methodology/scripts/check-sdd.sh _methodology/examples/001-golden-slice-lead-review-workflow

node _methodology/scripts/check-ui-patterns.mjs
node _methodology/scripts/check-record-workspace.mjs
node _methodology/scripts/check-enterprise-workbench-candidate.mjs
node _methodology/scripts/check-enterprise-interaction-catalog.mjs
node _methodology/scripts/check-enterprise-interaction-index.mjs
node --test _methodology/scripts/enterprise-interaction-index.test.mjs

node _methodology/scripts/check-markdown-links.mjs .
node _methodology/scripts/check-ui-adoption.mjs

if [[ ! -d .git ]]; then
  echo "FAIL  sdd-forge 根目录尚未初始化 Git" >&2
  exit 1
fi

if ! git check-ignore -q mcrm || ! git check-ignore -q _ref/gf_scm; then
  echo "FAIL  根仓库未隔离独立嵌套仓库" >&2
  exit 1
fi

echo "PASS  工作台方法论核心、初始化器、模板、案例和版本隔离全部通过"
