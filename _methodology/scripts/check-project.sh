#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "用法: bash check-project.sh <project-directory>" >&2
  exit 2
fi

project_dir="${1%/}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
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
  ".specify/README.md"
  ".specify/project-state.json"
  ".specify/sources/REGISTRY.md"
  ".specify/memory/project-charter.md"
  ".specify/memory/business-context.md"
  ".specify/memory/constitution.md"
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

if [[ -d "$project_dir/.specify/sources" ]]; then
  source_check_args=()
  if [[ "${CHECK_SOURCES_ALLOW_LEGACY:-0}" == "1" ]]; then
    source_check_args+=(--allow-legacy-unmanaged)
  fi
  if node "$script_dir/check-sources.mjs" "$project_dir" "${source_check_args[@]}"; then
    :
  else
    failed=1
  fi
fi

if [[ -f "$project_dir/.specify/project-state.json" ]]; then
  business_gate="$(node -e 'const fs=require("fs"); const s=JSON.parse(fs.readFileSync(process.argv[1], "utf8")); const g=s.gates?.business; process.stdout.write(String(typeof g === "object" ? g?.status : g ?? "missing"))' "$project_dir/.specify/project-state.json")"
  pass "项目级 Business Gate 状态已记录: $business_gate"
elif grep -Eq '结论[：:] *(pending|reopened)|Business Gate[：: ]+(pending|reopened)' \
  "$project_dir/.specify/memory/project-charter.md"; then
  pass "Business Gate 未批准或已重新打开，且已显式记录"
else
  pass "未发现项目级状态文件；Gate 真值需从切片 pipeline-state 与人工批准证据核对"
fi

if [[ $failed -ne 0 ]]; then
  echo "项目基线检查未通过" >&2
  exit 1
fi

echo "项目治理基线检查通过: $project_dir"
