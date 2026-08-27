#!/usr/bin/env bash
# Pre-arm the Vera fixture and run all six Maestro UI flows in order.
#
# Prerequisites (see README.md):
#   - maestro CLI on PATH; a booted iOS simulator with Expo Go installed
#   - Metro serving 17-polish/frontend on :8081 (the flows deep-link into it)
#   - env: CLERK_SECRET_KEY (sk_test_… for the stack's Clerk instance),
#          E2E_ENVIRONMENT (e.g. s17v) and E2E_AWS_REGION (for the --admin grant)
#   - a Python with tools/e2e/requirements.txt installed (override via $PYTHON)
#
# Usage:
#   cd tools/e2e/maestro && \
#   CLERK_SECRET_KEY=sk_test_... E2E_ENVIRONMENT=s17v E2E_AWS_REGION=us-west-2 ./run.sh
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
PY="${PYTHON:-python}"

echo "== pre-arming Vera (grant admin + mint a fresh single-use sign-in ticket) =="
CREDS="$("$PY" "$HERE/../scripts/mint_ui_user.py" --admin --format json)"
EMAIL="$(printf '%s' "$CREDS" | "$PY" -c 'import sys,json;print(json.load(sys.stdin)["email"])')"
TICKET="$(printf '%s' "$CREDS" | "$PY" -c 'import sys,json;print(json.load(sys.stdin)["ticket"])')"
echo "   email=$EMAIL ticket_len=${#TICKET}"

# 00 needs the credentials; the rest ride the session Expo Go persists.
echo "== 00-signin =="
maestro test "$HERE/00-signin.yaml" \
  --env MAESTRO_E2E_EMAIL="$EMAIL" \
  --env MAESTRO_E2E_PASSWORD="$TICKET"

for flow in 01-wishlist-create 02-wish-add 03-notifications 04-admin 05-event; do
  echo "== $flow =="
  maestro test "$HERE/$flow.yaml"
done

echo "== all flows passed =="
