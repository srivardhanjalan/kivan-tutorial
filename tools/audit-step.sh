#!/bin/bash
# The pre-PR audit gate: a step may not ship code without a caller.
#
#   tools/audit-step.sh 02-app-shell
#
# Run after EVERY change round, to a fixed point (until it passes with no
# findings) — deleting dead code orphans other code transitively.
set -euo pipefail
STEP=${1:?usage: tools/audit-step.sh <step-folder>}
DIR="$(cd "$(dirname "$0")/.." && pwd)/$STEP/frontend"
cd "$DIR" || { echo "no such step folder: $DIR"; exit 1; }

echo "── 1. TypeScript ──"
npx tsc --noEmit || exit 1

echo "── 2. Dead files / exports / types / dependencies (knip) ──"
npx --yes knip --include files,exports,types,dependencies || exit 1

echo "── 3. Color literals outside constants/ (each needs a comment or a token) ──"
grep -rn "rgba(\|: '#" src --include="*.tsx" | grep -v "constants/" || true

echo ""
echo "AUDIT CLEAN — review any literals listed above; each should be a"
echo "documented one-off or promoted to a token."
