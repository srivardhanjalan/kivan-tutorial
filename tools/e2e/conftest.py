"""
Fixtures for the committed backend-flow E2E harness.

Everything the suites need to talk to a REAL deployed kivan stack comes from
here, and nothing here reads a secret from a file in the repo: the Clerk secret
key is taken from the caller's environment only.

Required environment (all e2e tests SKIP cleanly, never error, when the first
is unset — so a normal `pytest backend/tests` unit run is untouched):

  E2E_API_URL          Base URL of the deployed App Runner API, e.g.
                       https://xxxx.us-west-2.awsapprunner.com  (required)
  CLERK_SECRET_KEY     sk_test_… for the Clerk instance the stack authenticates
                       against (required for any auth'd flow; from the shell)
  E2E_ENVIRONMENT      The stack's ENVIRONMENT prefix (e.g. s17h) — used to name
                       the DynamoDB / CloudWatch / budget resources for the raw
                       boto3 evidence reads (required for evidence + step-16)
  E2E_AWS_REGION       AWS region of the stack (default us-east-1)
  E2E_MAILGUN=1        Opt in to the live-send email leg in test_12 (off by
                       default: those legs skip unless this is set).

Session JWTs are minted through the Clerk Backend API (create user → create
session → mint session token) rather than a Frontend-API sign-in: the FAPI
enforces a low per-instance rate limit that a ~100-user suite trips on a single
clean run, so BAPI (a much higher limit, and no browser client-trust dance) is
what keeps this harness re-runnable. The token is still a real Clerk RS256
session JWT the backend verifies via JWKS exactly as a signed-in app's would be.
"""
import os
import time
import uuid
from dataclasses import dataclass
from typing import Callable, Optional

import httpx
import pytest

CLERK_BAPI = "https://api.clerk.com/v1"
_TEST_PASSWORD = "Kivan-E2E-Harness-2026!verify"


# --------------------------------------------------------------------------- #
# The unset-URL skip (the e2e/stepNN markers themselves are declared once, in   #
# pytest.ini — this hook only reacts to them).                                  #
# --------------------------------------------------------------------------- #
def pytest_collection_modifyitems(config, items):
    """When E2E_API_URL is unset, mark every e2e test skipped so collection is
    clean and the unit suite is unaffected — a skip, never a collection error."""
    if os.environ.get("E2E_API_URL"):
        return
    skip = pytest.mark.skip(reason="E2E_API_URL unset — live-stack harness not targeted")
    for item in items:
        if "e2e" in item.keywords:
            item.add_marker(skip)


# --------------------------------------------------------------------------- #
# Environment fixtures                                                          #
# --------------------------------------------------------------------------- #
@pytest.fixture(scope="session")
def api_url() -> str:
    url = os.environ.get("E2E_API_URL")
    if not url:
        pytest.skip("E2E_API_URL unset")
    return url.rstrip("/")


@pytest.fixture(scope="session")
def aws_region() -> str:
    return os.environ.get("E2E_AWS_REGION", "us-east-1")


@pytest.fixture(scope="session")
def environment() -> str:
    env = os.environ.get("E2E_ENVIRONMENT")
    if not env:
        pytest.skip("E2E_ENVIRONMENT unset — needed to name the stack's resources")
    return env


@pytest.fixture(scope="session")
def clerk_secret_key() -> str:
    key = os.environ.get("CLERK_SECRET_KEY")
    if not key:
        pytest.skip("CLERK_SECRET_KEY unset — cannot mint auth'd users")
    return key


# --------------------------------------------------------------------------- #
# boto3 evidence fixtures (the caller's AWS profile, NOT the instance role)     #
# --------------------------------------------------------------------------- #
@pytest.fixture(scope="session")
def boto3_session(aws_region):
    boto3 = pytest.importorskip("boto3")
    return boto3.session.Session(region_name=aws_region)


@pytest.fixture(scope="session")
def dynamodb(boto3_session):
    return boto3_session.resource("dynamodb")


@pytest.fixture(scope="session")
def table(dynamodb, environment):
    """`table("event-invitees")` → the boto3 Table for kivan-{env}-event-invitees.
    Names mirror config.py's `*_table` properties (all dashed)."""
    def _table(logical_name: str):
        return dynamodb.Table(f"kivan-{environment}-{logical_name}")
    return _table


@pytest.fixture(scope="session")
def s3(boto3_session):
    return boto3_session.client("s3")


@pytest.fixture(scope="session")
def photos_bucket(environment, account_id) -> str:
    # s3.tf: the photos bucket carries an account-id suffix for global uniqueness.
    return f"kivan-{environment}-photos-{account_id}"


@pytest.fixture(scope="session")
def cloudwatch(boto3_session):
    return boto3_session.client("cloudwatch")


@pytest.fixture(scope="session")
def logs_client(boto3_session):
    return boto3_session.client("logs")


@pytest.fixture(scope="session")
def sns(boto3_session):
    return boto3_session.client("sns")


@pytest.fixture(scope="session")
def budgets(boto3_session):
    # Budgets is a global service; its endpoint lives in us-east-1 regardless of
    # where the stack runs (the ARNs the run created are us-east-1 too).
    return boto3_session.client("budgets", region_name="us-east-1")


@pytest.fixture(scope="session")
def iam(boto3_session):
    return boto3_session.client("iam")


@pytest.fixture(scope="session")
def account_id(boto3_session):
    return boto3_session.client("sts").get_caller_identity()["Account"]


# --------------------------------------------------------------------------- #
# Polling — the notification pipeline is SQS→Lambda async                       #
# --------------------------------------------------------------------------- #
@pytest.fixture(scope="session")
def poll():
    """poll(fn, until=..., timeout=45, interval=2) → the first fn() result for
    which until(result) is truthy, or the last result once timeout elapses.
    Used to wait on the async notification feed without a fixed sleep."""
    def _poll(fn: Callable, until: Callable, timeout: float = 45.0, interval: float = 2.0):
        deadline = time.monotonic() + timeout
        result = fn()
        while not until(result) and time.monotonic() < deadline:
            time.sleep(interval)
            result = fn()
        return result
    return _poll


# --------------------------------------------------------------------------- #
# Clerk user factory: mint +clerk_test users, yield an authed httpx client      #
# --------------------------------------------------------------------------- #
class _ClerkTokenAuth(httpx.Auth):
    """Re-mints a short-lived Clerk session JWT as it ages. Clerk session tokens
    expire in ~60s; a flow that polls for 45s must not carry a stale one, so we
    cache for 40s and re-mint on the next request past that."""

    def __init__(self, mint: Callable[[], str]):
        self._mint = mint
        self._token: Optional[str] = None
        self._minted_at = 0.0

    def sync_auth_flow(self, request):
        now = time.monotonic()
        if self._token is None or now - self._minted_at > 40:
            self._token = self._mint()
            self._minted_at = now
        request.headers["Authorization"] = f"Bearer {self._token}"
        yield request


@dataclass
class ClerkUser:
    user_id: str
    email: str
    client: httpx.Client  # base_url = api_url, auto-authed as this user
    # (first/last name are set on the Clerk account at creation — they surface in
    #  the "Alan Actor" notification messages tests assert on — but nothing reads
    #  them back off this object, so they are not carried here.)


def _bapi(clerk_secret_key: str) -> httpx.Client:
    return httpx.Client(
        base_url=CLERK_BAPI,
        headers={"Authorization": f"Bearer {clerk_secret_key}"},
        timeout=30.0,
    )


_RETRY_STATUSES = {429, 500, 502, 503}


def _retry(send, tries=7, base=2.0):
    """Call send() (→ httpx.Response) and retry on Clerk throttling. A dev Clerk
    instance rate-limits bursts hard (a full suite mints ~100 users), so back off
    on 429/5xx, honouring Retry-After when present."""
    resp = None
    for attempt in range(tries):
        resp = send()
        if resp.status_code not in _RETRY_STATUSES:
            return resp
        if attempt == tries - 1:
            break
        retry_after = resp.headers.get("Retry-After")
        try:
            wait = min(float(retry_after), 30.0) if retry_after else base * (2 ** attempt)
        except ValueError:
            wait = base * (2 ** attempt)
        time.sleep(min(wait, 30.0))
    return resp


def _mint_session(bapi, user_id):
    """BAPI create-session → a callable that returns a fresh session JWT.

    One `POST /sessions {user_id}` opens an active session for the user; the
    returned callable mints a fresh short-lived token off it on demand, so the
    auth layer can re-mint as the JWT ages without re-opening the session.
    """
    s = _retry(lambda: bapi.post("/sessions", json={"user_id": user_id}))
    s.raise_for_status()
    session_id = s.json()["id"]

    def mint() -> str:
        tr = _retry(lambda: bapi.post(f"/sessions/{session_id}/tokens", json={}))
        tr.raise_for_status()
        jwt = tr.json().get("jwt")
        if not jwt:
            raise RuntimeError(f"Clerk token mint returned no jwt: {tr.text[:200]}")
        return jwt

    return mint


def _create_user(bapi, email: str, first_name: str, last_name: str) -> str:
    """POST /users → the new +clerk_test user's id. The single place the harness
    encodes the create-user payload (a password plus the skip_*_checks a dev
    instance needs), shared by the pytest factory below and the mint_ui_user
    pre-arm script so the two never drift on how a harness user is created."""
    r = _retry(lambda: bapi.post(
        "/users",
        json={
            "email_address": [email],
            "password": _TEST_PASSWORD,
            "skip_password_checks": True,
            "skip_legal_checks": True,
            "first_name": first_name,
            "last_name": last_name,
        },
    ))
    r.raise_for_status()
    return r.json()["id"]


@pytest.fixture
def clerk_user(api_url, clerk_secret_key) -> Callable[..., ClerkUser]:
    """Factory: `make = clerk_user; alice = make("Alice", "Actor")`.

    Each call creates a fresh +clerk_test user via the Backend API (with a
    password, then verify_password as a sanity gate that the credential is live),
    opens a BAPI session for a real RS256 session JWT, and returns a ClerkUser
    whose `.client` is an httpx.Client bound to the deployed API and authed as
    that user. Every minted user is DELETED at teardown; fresh uuid suffix per
    call so no two tests collide.
    """
    bapi = _bapi(clerk_secret_key)
    created: list[ClerkUser] = []
    created_ids: list[str] = []  # every BAPI-created id, even if sign-in later fails

    def make(first_name: str = "E2E", last_name: str = "User", email: Optional[str] = None) -> ClerkUser:
        suffix = uuid.uuid4().hex[:12]
        email = email or f"kivan-e2e-{suffix}+clerk_test@example.com"

        user_id = _create_user(bapi, email, first_name, last_name)
        created_ids.append(user_id)  # mark for deletion before anything can fail

        # verify_password: sanity that the credential we'll sign in with is live
        vr = _retry(lambda: bapi.post(f"/users/{user_id}/verify_password",
                                      json={"password": _TEST_PASSWORD}))
        if vr.status_code == 200 and not vr.json().get("verified", False):
            raise RuntimeError(f"Clerk verify_password failed for {user_id}")

        mint = _mint_session(bapi, user_id)
        client = httpx.Client(base_url=api_url, auth=_ClerkTokenAuth(mint), timeout=30.0)
        user = ClerkUser(user_id, email, client)
        created.append(user)

        # Provision the DynamoDB row now (JIT provisioning fires on the first
        # authed call) so this user can be a follow / invite / RSVP target the
        # moment the factory returns — otherwise those routes 404 the target.
        for _ in range(3):
            if client.get("/users/me").status_code == 200:
                break
            time.sleep(1)
        return user

    yield make

    for u in created:
        try:
            u.client.close()
        except Exception:
            pass
    for uid in created_ids:
        try:
            bapi.delete(f"/users/{uid}")
        except Exception:
            pass
    bapi.close()


@pytest.fixture
def grant_admin(table):
    """`grant_admin(user)` promotes a ClerkUser to catalog admin.

    Provisions the DynamoDB row (a /users/me touch) then writes role=admin onto
    it — the same effect the operator infra/scripts/grant_admin.py has, done here
    as a direct table write so the suite is re-runnable without a subprocess. The
    step-15 default-deny gate reads role off this exact row. Shared here (not
    per-suite) because both the admin (step 15) and media (step 17) suites need
    an admin identity.
    """
    def _grant(user):
        assert user.client.get("/users/me").status_code == 200
        table("users").update_item(
            Key={"id": user.user_id},
            UpdateExpression="SET #r = :a",
            ExpressionAttributeNames={"#r": "role"},
            ExpressionAttributeValues={":a": "admin"},
        )
    return _grant
