#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "用法: bash check-project.sh <project-directory>" >&2
  exit 2
fi

project_dir="${1%/}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
workspace_root="$(cd "$script_dir/../.." && pwd)"
project_abs="$(cd "$project_dir" 2>/dev/null && pwd || true)"
project_name="$(basename "$project_abs")"
failed=0

pass() { echo "PASS  $1"; }
fail() { echo "FAIL  $1" >&2; failed=1; }

if [[ ! -d "$project_dir" ]]; then
  echo "项目目录不存在: $project_dir" >&2
  exit 2
fi

required_files=(
  "README.md"
  "AGENTS.md"
  ".env.example"
  ".specify/README.md"
  ".specify/memory/project-charter.md"
  ".specify/memory/business-context.md"
  ".specify/memory/constitution.md"
  "package.json"
)

for relative_path in "${required_files[@]}"; do
  if [[ -f "$project_dir/$relative_path" ]]; then
    pass "存在 $relative_path"
  else
    fail "缺少 $relative_path"
  fi
done

if [[ -e "$project_dir/_spec" ]]; then
  fail "存在废弃目录 _spec"
else
  pass "未使用废弃目录 _spec"
fi

if [[ -L "$project_dir/CLAUDE.md" ]] && \
   [[ "$(readlink "$project_dir/CLAUDE.md")" == "AGENTS.md" ]]; then
  pass "CLAUDE.md 正确链接到 AGENTS.md"
else
  fail "CLAUDE.md 不是指向 AGENTS.md 的软链"
fi

if node -e '
  const pkg = JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8"));
  const required = ["lint", "typecheck", "test", "build", "verify"];
  if (!required.every((name) => typeof pkg.scripts?.[name] === "string")) process.exit(1);
' "$project_dir/package.json"; then
  pass "质量脚本 lint/typecheck/test/build/verify 完整"
else
  fail "package.json 缺少质量脚本"
fi

if [[ -f "$project_dir/.gitlab-ci.yml" || -d "$project_dir/.github/workflows" ]]; then
  pass "存在 CI 配置"
elif [[ "$project_abs" == "$workspace_root/"* ]] && \
     [[ -d "$workspace_root/.github/workflows" ]] && \
     grep -R -q -- "$project_name" "$workspace_root/.github/workflows"; then
  pass "根仓库 CI 明确引用项目 $project_name"
else
  fail "缺少 CI 配置"
fi

if [[ -d "$project_dir/.specify/sources" ]]; then
  if node "$script_dir/check-sources.mjs" "$project_dir"; then
    :
  else
    failed=1
  fi
fi

if grep -q 'Business Gate.*pending\|Business Gate：pending' \
  "$project_dir/.specify/memory/project-charter.md"; then
  pass "未批准的 Business Gate 已显式记录"
else
  pass "Business Gate 非 pending；需由人工批准记录负责"
fi

if [[ $failed -ne 0 ]]; then
  echo "项目基线检查未通过" >&2
  exit 1
fi

echo "项目基线检查通过: $project_dir"
