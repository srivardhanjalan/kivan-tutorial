# Signed, Sealed, Delivered

*Zero to Shipped · 04 — the app learns your name for real: Clerk sign-in, JWKS-verified tokens, and a user record the client is never allowed to create.*

---

![Zero to Shipped 04 hero — signed, sealed, delivered: the 401s terminal and the Home screen greeting Kivan Tester by name](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-hero-04.png?v=1d39c8c)

By the end of this step you sign up in the app, a code lands in your inbox, the first-run tutorial plays, and Home greets you by name above a record the backend wrote for you. Every interesting decision here comes back to one question — who's allowed to create a user — and I got it wrong first.

*(Step 04 of **Zero to Shipped** — a production social-wishlist app on Expo, FastAPI, and AWS. New here? **[Start with the introduction](https://medium.com/@srivardhanjalan/zero-to-shipped-2c13ce7e20e9)**. Code is the `04-auth/` folder; [PR #22](https://github.com/srivardhanjalan/kivan-tutorial/pull/22/files) is every line this step adds.)*

## Who's allowed to create a user

The obvious design, the one I reached for first: the phone signs up with Clerk, then calls `POST /users/sync` with the name and email so the backend has a record. Clean, direct, wrong.

It hands the client a pen to fill in its own database row — so the client can claim any name, any email, any field I haven't invented yet. And it fails on its own terms: only sign-*up* syncs, so a rebuilt database 404s every returning user forever, and a signup interrupted mid-sync leaves half a user in the table.

So there's no sync endpoint. The backend writes the record itself — the first time the auth dependency sees a valid token for a user it doesn't know, it fetches that user's real profile from Clerk server-to-server and writes the row:

```python
users_table.put_item(
    Item=new_user,
    ConditionExpression="attribute_not_exists(id)"  # create-only, race-safe
)
```

The profile comes from Clerk, not from whatever the phone sent. The condition stops two racing requests from both creating. And a rebuilt database heals on the next sign-in, because provisioning now runs on every authenticated request instead of once.

The record is eight fields — id, email, first and last name, avatar, the onboarding flag, two timestamps. No follower counts, no search keys, no roles: DynamoDB is schemaless, so each joins the step that first reads it, one line, no migration. The table under it is a hash key and nothing else.

## Sign-in and sign-up are the same screen

I built sign-in, started sign-up, and stopped ten lines in: same screen. Both are OAuth buttons, an "or" divider, email and password, a brand button, and a footer link to the other. Sign-up adds a verification step and nothing else.

So it's one component, `AuthMethods`, with the verb plugged in. The OAuth buttons are a config array — same idiom as the step-02 tab bar — so adding Apple next to Google is a line in a list, not a new screen.

![Three real simulator screenshots: the sign-in screen, the first-run tutorial, and Home greeting Kivan Tester by name](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-04-learns.png?v=1d39c8c)

Real screenshots from the verification run, not mockups. Clerk's dev instances let you sign up without an inbox — any `+clerk_test` address works, code always `424242` — which is how an automated UI test drives the whole flow.

The best cleanup here wasn't in my draft; it was in my fix. Collapsing the logo's size behind one config value made two style blocks byte-identical, the clone detector caught that, and the real fix fell out: a shared `BrandMark`. A fix to duplication can be duplication — which is why the gate never trusts a single clean pass.

## 401 means you, 503 means me

Auth is where you lose the most hours to debugging, so the status codes do the pointing. Missing token, garbage token, made-up key ID — the caller's problem, all a flat `401 Invalid authentication token`. Clerk unreachable, secret key wrong, users table missing — my problem, each a `503` whose message names the fix; the missing-table one says to run `terraform apply` and set `ENVIRONMENT` to match. Get this wrong and a Clerk outage surfaces as a `401` with the library's error string attached — sending a valid user to debug a fine token, and leaking internals to anyone who asks.

Two sharper traps live in the verifier, both found only by reading PyJWT's source. Spam tokens with unknown key IDs and the library re-fetches Clerk's key set every request; I can't stop the refetch, but I can stop it looking like an outage. An unknown key is the caller's `401` at info level — never a `503`, never error-level — or the spam poses as a Clerk failure while it floods the logs. The second hides in a flag: `cache_keys=True` looks like the performance option, but it's an `lru_cache` with no expiry, so a key Clerk rotates or revokes stays trusted until the process restarts. Caching the key *set* for an hour gives the same networkless hot path and catches a rotation within the hour.

## Keeping the secret key out of the console

The backend needs Clerk's secret key. The lazy way is a plaintext App Runner env var — sitting in the console in the clear, readable by anyone with `apprunner:DescribeService`. Instead: the key lives in SSM as a **SecureString**, App Runner resolves it at instance start via `runtime_environment_secrets`, and the instance role can read that one parameter and nothing else.

That last line broke my first rollout — `CREATE_FAILED`, no logs, the same empty failure step 03 hit twice, except this time the image was fine. App Runner checked its secret access *while Terraform was still attaching the SSM policy*: nothing tied the two together, so Terraform built them in parallel and the check lost the race. One line fixes it:

```hcl
depends_on = [aws_iam_role_policy.apprunner_instance_ssm]
```

![Terminal: CREATE_FAILED with no logs, the missing IAM policy, the depends_on fix, and the service reaching RUNNING](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-04-race.png?v=1d39c8c)

A `CREATE_FAILED` service won't heal itself, so it also takes a `terraform apply -replace` to rebuild the dead one with the policy in place. Same image, `RUNNING`.

## A tutorial that survives a reinstall

First sign-in plays a swipeable welcome carousel. The whole feature is one bit of state, and the only decision is where it lives: `onboarding_completed` sits on the backend record, not the device. Reinstall, switch phones, clear the cache — the tutorial stays done, because the flag was never on the phone to lose.

"Get Started" flips it through an endpoint guarded by `ConditionExpression="attribute_exists(id)"`. DynamoDB's `update_item` is secretly an upsert — call it on a missing id and it happily creates a half-formed user. The condition makes it refuse.

One last scar: the UI test could not tap the carousel's Next button. It's text inside a glass blur view, and unlabeled content in a `BlurView` never reaches the accessibility tree — the automation was stranded exactly where a VoiceOver user would be. One `accessibilityLabel` fixed the test and the screen reader in the same commit.

## You're done when

- `curl $API/users/me` → 401; with a garbage token → 401, generic detail
- Sign up with a `+clerk_test` address, code `424242` → the first-run tutorial appears
- Home greets you by name, and **Record** shows your email + provisioned date in green — read from DynamoDB, created by no client
- Sign out → sign in → no tutorial replay (the flag survived on the backend record)
- "Continue with Google" opens the browser consent sheet (Apple shares the code path — verify it the same way once enabled in your Clerk app)

## What's next

Step 05 gives the account a past and a delete button: profile data, birthdays, a Settings screen, account deletion — the first fields to join those eight, each with its first real caller.

**Following along?** ⭐ [Star the repo](https://github.com/srivardhanjalan/kivan-tutorial) — every step lands as a browsable pull request.

---

**Zero to Shipped — the series**

- **00 · [Introduction](https://medium.com/@srivardhanjalan/zero-to-shipped-2c13ce7e20e9)**
- **01 · [One script to set up everything](https://medium.com/@srivardhanjalan/one-script-to-set-up-everything-ae8bcea2d649)**
- **02 · [Dressed to Ship](https://medium.com/@srivardhanjalan/dressed-to-ship-1e2591179d8a)**
- **03 · [Alive on Arrival](https://medium.com/@srivardhanjalan/alive-on-arrival-cda0a351844f)**
- **04 · Signed, Sealed, Delivered** *(this post)*
- **05 · Profiles** *(coming soon)*

*All code: [github.com/srivardhanjalan/kivan-tutorial](https://github.com/srivardhanjalan/kivan-tutorial)*
