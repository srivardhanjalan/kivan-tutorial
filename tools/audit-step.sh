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

echo "── 3. Copy-paste duplication (jscpd) — fails on any clone ──"
npx --yes jscpd src App.tsx --min-tokens 35 --reporters console --exit-code 1 || exit 1

echo "── 4. Color literals outside constants/ (each needs a comment or a token) ──"
grep -rn "rgba(\|: '#" src --include="*.tsx" | grep -v "constants/" || true

echo "── 5. Semantic-duplication review (the rule: no step ships without it) ──"
if [ "${SEMANTIC_REVIEWED:-0}" != "1" ]; then
  cat <<'CHECKLIST'
The machines above catch dead code and copy-paste. What they cannot catch,
a human must — walk the PR diff and answer each:

  [ ] Do any two screens/views want the same layout or scaffold?
  [ ] Do any two functions do one job in two different ways?
  [ ] Is any JSX/logic block a candidate for a shared component or hook?
  [ ] Is anything hardcoded that should be config or a token?
  [ ] Would deleting this step's feature leave anything behind?

This gate FAILS until you attest the review happened:

  SEMANTIC_REVIEWED=1 tools/audit-step.sh <step>

CHECKLIST
  exit 1
fi
echo "attested — semantic review completed by the operator"
echo ""
echo "AUDIT CLEAN — also review the literals under section 4; each should be"
echo "a documented one-off or promoted to a token."
