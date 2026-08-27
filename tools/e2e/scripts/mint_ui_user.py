#!/usr/bin/env python3
"""Pre-arm a UI-E2E user and print a fresh Clerk sign-in TICKET for Maestro.

The Maestro flows in ../maestro sign in through the app's real SignInScreen,
which — in this harness run only — accepts a Clerk **sign-in ticket** in the
password field (a server-authorized bypass of the shared dev instance's MFA
prompt; see ../maestro/README.md "Auth"). Maestro itself never talks to Clerk:
this script is the pre-arm step the runner calls, and it prints the two values
`maestro test --env` needs:

    MAESTRO_E2E_EMAIL     any real address on the user's account (dummy-valid;
                          AuthMethods only requires the field be non-empty)
    MAESTRO_E2E_PASSWORD  a single-use Clerk sign-in ticket (~50 min TTL)

It reuses the Backend-API client and rate-limit retry from the pytest harness
(`conftest`) rather than re-implementing them, so there is exactly one source of
truth for how this harness talks to Clerk (same backoff, same base URL).

Usage (CLERK_SECRET_KEY from the shell, exactly like the pytest suite):

    python tools/e2e/scripts/mint_ui_user.py                 # Vera fixture, env format
    python tools/e2e/scripts/mint_ui_user.py --format json   # {user_id,email,ticket}
    python tools/e2e/scripts/mint_ui_user.py --email you+clerk_test@example.com \
        --first You --last Here

The default target is the seeded **Vera Verify** fixture
(vera+clerk_test@example.com), whose notification feed and wishlists the flows
assert on. `--admin` additionally grants that user the global admin role on the
stack named by ENVIRONMENT (reusing infra/scripts/grant_admin.py) so the admin
flow's Settings "Admin" row is present — that needs local AWS credentials and
boto3, unlike ticket minting which needs only the Clerk secret key.
"""
import argparse
import json
import os
import sys

# Import the harness's Backend-API helpers instead of duplicating them.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from conftest import _bapi, _retry, _TEST_PASSWORD  # noqa: E402


def find_or_create_user(bapi, email: str, first: str, last: str) -> str:
    """Resolve `email` to a Clerk user id, creating a +clerk_test user if absent.

    Find-or-create (not the pytest factory's always-create) because the flows
    reuse a *stable* seeded fixture whose data — notifications, wishlists — the
    UI asserts on; a fresh empty user would have none of it.
    """
    r = _retry(lambda: bapi.get("/users", params={"email_address": [email]}))
    r.raise_for_status()
    existing = r.json()
    if existing:
        return existing[0]["id"]
    r = _retry(lambda: bapi.post(
        "/users",
        json={
            "email_address": [email],
            "password": _TEST_PASSWORD,
            "skip_password_checks": True,
            "skip_legal_checks": True,
            "first_name": first,
            "last_name": last,
        },
    ))
    r.raise_for_status()
    return r.json()["id"]


def mint_sign_in_ticket(bapi, user_id: str, ttl_seconds: int = 3000) -> str:
    """POST /sign_in_tokens → a single-use ticket the SignInScreen exchanges for
    a complete session (strategy: 'ticket'), sidestepping the instance's MFA."""
    r = _retry(lambda: bapi.post(
        "/sign_in_tokens",
        json={"user_id": user_id, "expires_in_seconds": ttl_seconds},
    ))
    r.raise_for_status()
    return r.json()["token"]


def grant_admin(user_id: str) -> None:
    """Grant the global admin role by reusing infra/scripts/grant_admin.py against
    the stack named by ENVIRONMENT (needs local AWS creds + boto3). Idempotent."""
    region = os.environ.get("E2E_AWS_REGION") or os.environ.get("AWS_REGION", "us-east-1")
    environment = os.environ.get("E2E_ENVIRONMENT") or os.environ.get("ENVIRONMENT")
    if not environment:
        sys.exit("--admin needs E2E_ENVIRONMENT (or ENVIRONMENT) to name the users table")
    import boto3  # local: only --admin needs AWS; ticket minting never does

    # Reuse the operator script's grant logic — same role literal, one source.
    # It lives under the 17-polish app this harness targets (the admin feature
    # ships there); the tutorial repo keeps each step in its own top-level dir.
    repo_root = os.path.dirname(  # tools/e2e/scripts -> repo root
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    sys.path.insert(0, os.path.join(repo_root, "17-polish", "infra", "scripts"))
    import grant_admin as ga  # noqa: E402

    table = boto3.resource("dynamodb", region_name=region).Table(f"kivan-{environment}-users")
    row = ga.grant_admin(table, user_id=user_id)
    print(f"# granted admin: {row['id']} role={row.get('role')}", file=sys.stderr)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--email", default="vera+clerk_test@example.com",
                    help="target account email (default: the Vera Verify fixture)")
    ap.add_argument("--first", default="Vera")
    ap.add_argument("--last", default="Verify")
    ap.add_argument("--admin", action="store_true",
                    help="also grant the global admin role on ENVIRONMENT's stack")
    ap.add_argument("--format", choices=["env", "json"], default="env",
                    help="env: MAESTRO_E2E_* lines for `--env`; json: machine-readable")
    args = ap.parse_args()

    sk = os.environ.get("CLERK_SECRET_KEY")
    if not sk:
        sys.exit("CLERK_SECRET_KEY unset — cannot mint a sign-in ticket")

    bapi = _bapi(sk)
    try:
        user_id = find_or_create_user(bapi, args.email, args.first, args.last)
        if args.admin:
            grant_admin(user_id)
        ticket = mint_sign_in_ticket(bapi, user_id)
    finally:
        bapi.close()

    if args.format == "json":
        print(json.dumps({"user_id": user_id, "email": args.email, "ticket": ticket}))
    else:
        # Consumable as: maestro test --env "$(python ... )"  OR  eval / read line-by-line.
        print(f"MAESTRO_E2E_EMAIL={args.email}")
        print(f"MAESTRO_E2E_PASSWORD={ticket}")


if __name__ == "__main__":
    main()
