#!/usr/bin/env bash
set -euo pipefail
# Upstream source stays outside CRM. Existing checkouts are never modified.
destination="${1:-$HOME/projects/third-party/flowable-engine}"
commit=11a1cf83a8c03e343040b4d8edc751f9534d7323
if [[ -e "$destination" ]]; then
  actual="$(git -C "$destination" rev-parse HEAD)"
  [[ "$actual" == "$commit" ]] || { echo 'Existing checkout differs from the lock; no files changed.' >&2; exit 1; }
else
  git clone --depth 1 --branch flowable-7.2.0 https://github.com/flowable/flowable-engine.git "$destination"
  [[ "$(git -C "$destination" rev-parse HEAD)" == "$commit" ]] || { echo 'Upstream commit mismatch; do not use this checkout.' >&2; exit 1; }
fi
printf 'Verified source: %s\n' "$destination"
