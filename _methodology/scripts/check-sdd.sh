#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 || $# -gt 2 ]]; then
  echo "用法: bash check-sdd.sh <feature-directory> [spec|full]" >&2
  exit 2
fi

feature_dir="${1%/}"
stage="${2:-full}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
methodology_dir="$(cd "$script_dir/.." && pwd)"
failed=0

if [[ "$stage" != "spec" && "$stage" != "full" ]]; then
  echo "未知检查阶段: $stage（只支持 spec 或 full）" >&2
  exit 2
fi

pass() { echo "PASS  $1"; }
fail() { echo "FAIL  $1" >&2; failed=1; }

if [[ ! -d "$feature_dir" ]]; then
  echo "功能目录不存在: $feature_dir" >&2
  exit 2
fi

spec_files=(
  "README.md"
  "requirements/original.md"
  "clarification.md"
  "spec.md"
  "testcases.md"
  "traceability.md"
  "pipeline-state.json"
)

full_only_files=(
  "plan.md"
  "tasks.md"
  "review.md"
)

required_files=("${spec_files[@]}")
if [[ "$stage" == "full" ]]; then
  required_files+=("${full_only_files[@]}")
fi

for relative_path in "${required_files[@]}"; do
  if [[ -f "$feature_dir/$relative_path" ]]; then
    pass "存在 $relative_path"
  else
    fail "缺少 $relative_path"
  fi
done

if node -e 'JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8"))' \
  "$feature_dir/pipeline-state.json" 2>/dev/null; then
  pass "pipeline-state.json 是合法 JSON"
else
  fail "pipeline-state.json 不是合法 JSON"
fi

if grep -R -n -E '\{\{[^}]+\}\}' "$feature_dir" \
  --exclude='*.test.mjs' >/dev/null 2>&1; then
  fail "功能目录仍有未替换模板占位符"
else
  pass "无模板占位符残留"
fi

legacy_pattern='Spring Boot|MyBatis|MobX|React 17|Ant Design 4|cplm-software|cap-front|_spec/'
if grep -R -n -E "$legacy_pattern" "$methodology_dir/templates" "$feature_dir" \
  >/dev/null 2>&1; then
  fail "发现旧技术栈、旧项目或废弃目录标识"
else
  pass "无旧技术栈和废弃目录标识"
fi

id_prefixes=('BUS-' 'REQ-' 'AC-' 'TC-')
if [[ "$stage" == "full" ]]; then
  id_prefixes+=('TASK-')
fi

for id_prefix in "${id_prefixes[@]}"; do
  if grep -q "$id_prefix" "$feature_dir/traceability.md"; then
    pass "追溯矩阵包含 $id_prefix"
  else
    fail "追溯矩阵缺少 $id_prefix"
  fi
done

if [[ "$stage" == "spec" ]] && grep -q 'Specification Gate\|Spec Gate' "$feature_dir/spec.md"; then
  pass "Specification Gate 已记录"
elif [[ "$stage" == "full" ]] && \
   grep -q 'Spec Gate\|Specification Gate' "$feature_dir/spec.md" && \
   grep -q 'Architecture Gate' "$feature_dir/plan.md"; then
  pass "Spec 与 Architecture Gate 已记录"
else
  fail "缺少当前阶段要求的 Gate 记录"
fi

if node "$script_dir/check-traceability.mjs" "$feature_dir" "$stage"; then
  :
else
  failed=1
fi

if [[ $failed -ne 0 ]]; then
  echo "SDD 检查未通过" >&2
  exit 1
fi

echo "SDD 检查通过: ${feature_dir}（stage=${stage}）"
