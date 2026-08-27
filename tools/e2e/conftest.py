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
  E2E_CLERK_FAPI_URL   Clerk Frontend API base, e.g.
                       https://your-instance.clerk.accounts.dev — needed to mint
                       a real session JWT via FAPI sign-in. If unset it is
                       derived from E2E_CLERK_PUBLISHABLE_KEY (pk_test_…), which
                       is public. Auth'd tests skip if neither is provided.
  E2E_MAILGUN=1        Opt in to the live-send email leg in test_12 (off by
                       default: those legs skip unless this is set).
"""
import base64
import os
import time
import uuid
from dataclasses import dataclass, field
from typing import Callable, Optional

import httpx
import pytest

CLERK_BAPI = "https://api.clerk.com/v1"
# The Clerk Frontend API expects a native (mobile-app) caller: a browser UA is
# rejected, and the `_is_native` context is exactly how this backend's Expo
# client signs in — so it is also how we bypass browser client-trust here.
_NATIVE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) ClerkExpo/1.0"
_JS_VERSION = "_clerk_js_version=5.0.0"
_TEST_PASSWORD = "Kivan-E2E-Harness-2026!verify"


# --------------------------------------------------------------------------- #
# Marker registration + the unset-URL skip                                    #
# --------------------------------------------------------------------------- #
_STEP_MARKS = ("step11", "step12", "step13", "step14", "step15", "step16", "step17")


def pytest_configure(config):
    config.addinivalue_line("markers", "e2e: live-stack end-to-end test (needs E2E_API_URL)")
    for m in _STEP_MARKS:
        config.addinivalue_line("markers", f"{m}: kivan tutorial step {m[4:]} flow suite")


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


@pytest.fixture(scope="session")
def clerk_fapi_url() -> str:
    """The Clerk Frontend API base URL — explicit, or decoded from the (public)
    publishable key. Skips the auth'd flow if neither is available."""
    url = os.environ.get("E2E_CLERK_FAPI_URL")
    if url:
        return url.rstrip("/")
    pub = os.environ.get("E2E_CLERK_PUBLISHABLE_KEY", "")
    if pub.startswith("pk_"):
        try:
            b64 = pub.split("_", 2)[2]
            host = base64.b64decode(b64 + "===").decode().rstrip("$")
            if host:
                return f"https://{host}"
        except Exception:
            pass
    pytest.skip("E2E_CLERK_FAPI_URL (or E2E_CLERK_PUBLISHABLE_KEY) unset")


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
    first_name: str
    last_name: str
    client: httpx.Client  # base_url = api_url, auto-authed as this user
    mint_token: Callable[[], str]  # a fresh session JWT on demand


def _bapi(clerk_secret_key: str) -> httpx.Client:
    return httpx.Client(
        base_url=CLERK_BAPI,
        headers={"Authorization": f"Bearer {clerk_secret_key}"},
        timeout=30.0,
    )


def _fapi_post(fapi_url, path, data, device_token=None):
    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": _NATIVE_UA,
        "clerk-api-version": "2021-02-05",
    }
    # Origin and Authorization are mutually exclusive on the FAPI; the native
    # path uses the device token, never Origin.
    if device_token:
        headers["Authorization"] = f"Bearer {device_token}"
    return httpx.post(f"{fapi_url}{path}", data=data, headers=headers, timeout=30.0)


def _mint_session(fapi_url, email, password, bapi, user_id):
    """FAPI native sign-in → a callable that returns a fresh session JWT.

    Primary path is the password sign-in the task's playbook prescribes; if the
    instance doesn't complete a password factor we fall back to a BAPI
    sign-in-token (ticket) exchange, which needs no password on the FAPI leg.
    Both converge on the /sessions/{sid}/tokens mint, which we return so the
    auth layer can re-call it as the JWT ages.
    """
    # bootstrap a native client to obtain the device (client-trust) token
    r = _fapi_post(fapi_url, f"/v1/client?_is_native=1&{_JS_VERSION}", {})
    device = r.headers.get("Authorization")

    r = _fapi_post(
        fapi_url,
        f"/v1/client/sign_ins?_is_native=1&{_JS_VERSION}",
        {"identifier": email, "strategy": "password", "password": password},
        device_token=device,
    )
    device = r.headers.get("Authorization") or device
    resp = (r.json() or {}).get("response") or {}
    session_id = resp.get("created_session_id")

    if not session_id:
        # Fallback: a backend-minted sign-in ticket, exchanged on the FAPI.
        tok = bapi.post("/sign_in_tokens", json={"user_id": user_id})
        tok.raise_for_status()
        ticket = tok.json()["token"]
        r = _fapi_post(
            fapi_url,
            f"/v1/client/sign_ins?_is_native=1&{_JS_VERSION}",
            {"strategy": "ticket", "ticket": ticket},
        )
        device = r.headers.get("Authorization") or device
        resp = (r.json() or {}).get("response") or {}
        session_id = resp.get("created_session_id")
    if not session_id:
        raise RuntimeError(f"Clerk sign-in did not create a session: {r.text[:300]}")

    dev = device

    def mint() -> str:
        tr = _fapi_post(
            fapi_url,
            f"/v1/client/sessions/{session_id}/tokens?_is_native=1&{_JS_VERSION}",
            {},
            device_token=dev,
        )
        tr.raise_for_status()
        return tr.json()["jwt"]

    return mint


@pytest.fixture
def clerk_user(api_url, clerk_secret_key, clerk_fapi_url) -> Callable[..., ClerkUser]:
    """Factory: `make = clerk_user; alice = make("Alice", "Actor")`.

    Each call creates a fresh +clerk_test user via the Backend API (with a
    password, then verify_password as a sanity gate), signs it in on the
    Frontend API for a real RS256 session JWT, and returns a ClerkUser whose
    `.client` is an httpx.Client bound to the deployed API and authed as that
    user. Every minted user is DELETED at teardown; fresh uuid suffix per call
    so no two tests collide.
    """
    bapi = _bapi(clerk_secret_key)
    created: list[ClerkUser] = []

    def make(first_name: str = "E2E", last_name: str = "User", email: Optional[str] = None) -> ClerkUser:
        suffix = uuid.uuid4().hex[:12]
        email = email or f"kivan-e2e-{suffix}+clerk_test@example.com"
        pw = _TEST_PASSWORD

        r = bapi.post(
            "/users",
            json={
                "email_address": [email],
                "password": pw,
                "skip_password_checks": True,
                "skip_legal_checks": True,
                "first_name": first_name,
                "last_name": last_name,
            },
        )
        r.raise_for_status()
        user_id = r.json()["id"]

        # verify_password: sanity that the credential we'll sign in with is live
        vr = bapi.post(f"/users/{user_id}/verify_password", json={"password": pw})
        if vr.status_code == 200 and not vr.json().get("verified", False):
            raise RuntimeError(f"Clerk verify_password failed for {user_id}")

        mint = _mint_session(clerk_fapi_url, email, pw, bapi, user_id)
        client = httpx.Client(base_url=api_url, auth=_ClerkTokenAuth(mint), timeout=30.0)
        user = ClerkUser(user_id, email, first_name, last_name, client, mint)
        created.append(user)
        return user

    yield make

    for u in created:
        try:
            u.client.close()
        except Exception:
            pass
        try:
            bapi.delete(f"/users/{u.user_id}")
        except Exception:
            pass
    bapi.close()
