#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root_dir="$(cd "$script_dir/../.." && pwd)"
cd "$root_dir"

bash _methodology/scripts/verify-workbench.sh
bash _methodology/scripts/verify-validation-projects.sh
