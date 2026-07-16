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

echo "── 5. Semantic-duplication review (AI reviewer) ──"
if command -v claude >/dev/null 2>&1; then
  PROMPT=$(mktemp)
  {
    cat <<'BRIEF'
You are the semantic-duplication reviewer for a React Native tutorial step.
Mechanical gates already passed: no dead exports (knip), no copy-paste
clones (jscpd). Your job is what tokenizers cannot judge:

1. Do any two screens/views want the same layout or scaffold?
2. Do any two functions do one job in two different ways?
3. Is any JSX/logic block a candidate for a shared component or hook?
4. Is anything hardcoded that should be config or a token (semantic values,
   or values used in 2+ places)?
5. Would deleting this step's feature leave anything behind?

Judge pragmatically. This codebase's rule is "never add things that might
be needed later" — flag ONLY extractions that reduce net complexity in the
code as it exists now; speculative abstraction is itself a defect.

Reply with exactly NO_FINDINGS if nothing meets that bar. Otherwise reply
FINDINGS: followed by a terse bullet list (file, what, why it meets the bar).

SOURCE FILES:
BRIEF
    find App.tsx src -name '*.ts' -o -name '*.tsx' | sort | while read -r f; do
      echo ""; echo "=== $f ==="; cat "$f"
    done
  } > "$PROMPT"
  VERDICT=$(claude -p < "$PROMPT" 2>/dev/null)
  rm -f "$PROMPT"
  if echo "$VERDICT" | grep -q "NO_FINDINGS"; then
    echo "AI review: no semantic duplication meets the extraction bar"
  else
    echo "$VERDICT"
    exit 1
  fi
else
  # Fallback when the claude CLI is unavailable: block until a human attests
  if [ "${SEMANTIC_REVIEWED:-0}" != "1" ]; then
    echo "claude CLI not found — review questions 1-5 above by hand, then"
    echo "re-run with SEMANTIC_REVIEWED=1"
    exit 1
  fi
  echo "attested — semantic review completed by the operator"
fi
echo ""
echo "AUDIT CLEAN — also review the literals under section 4; each should be"
echo "a documented one-off or promoted to a token."
