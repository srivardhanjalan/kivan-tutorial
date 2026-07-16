# Signed, Sealed, Delivered

*Zero to Shipped · 04 — the app learns your name: Clerk sign-in, JWKS-verified tokens, and a user record no client ever creates. Plus the third way a deploy dies with CREATE_FAILED and no logs.*

---

![Zero to Shipped 04 hero — signed, sealed, delivered: the 401s terminal and the Home screen greeting Kivan Tester by name](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-hero-04.png?v=39854ac)

While verifying this step, App Runner pulled my image, then printed: `Failed to deploy your application image.` The application log group didn't exist — the container had never started. [Step 03](https://github.com/srivardhanjalan/kivan-tutorial/tree/main/03-backend-core) hit `CREATE_FAILED` with empty logs twice — once from a QEMU-corrupted image, once from BuildKit's attestation manifests. Same symptom, two causes. This step found a third, and it wasn't the image at all.

By the end of this step you sign up inside the app, a verification code lands, the first-run tutorial plays, and Home greets you by name above a record the backend wrote for you. Real accounts, end to end.

*(This is step 04 of **Zero to Shipped** — building a production social-wishlist app on Expo, FastAPI, and AWS. New here? **[Start with the introduction](https://medium.com/@srivardhanjalan/zero-to-shipped-2c13ce7e20e9)**. The code is the `04-auth/` folder; [PR #22](https://github.com/srivardhanjalan/kivan-tutorial/pull/22/files) shows every line this step adds.)*

## Nobody creates their own user

The obvious auth design — and the one this app's first life actually shipped — is a sync endpoint: the client signs up with Clerk, then calls `POST /users/sync` with its profile so the backend has a record. It breaks four ways. Sign-in never syncs, so a fresh database 404s forever. The sync races whatever screen loads next. An interrupted signup leaves half an account. And — the one that got it filed as a security bug — the client controls the payload, so any caller can assert any profile.

So this step has no sync endpoint. The backend provisions the user **just in time**, inside the auth dependency: the first request carrying a valid token for an unknown user makes the backend fetch that user's profile from Clerk's own API — server to server — and write the record itself:

```python
users_table.put_item(
    Item=new_user,
    ConditionExpression="attribute_not_exists(id)"  # create-only, race-safe
)
```

The client can't lie about a profile it never sends. Two racing first-requests can't double-create. Sign-in on a rebuilt database self-heals, because the guarantee runs on every authenticated request. And the record is eight fields — id, email, first and last name, avatar, the onboarding flag, two timestamps. No follower counts, no search keys, no roles: DynamoDB is schemaless, so each field lands in the step that reads it, at the cost of one line and no migration. The table itself is a hash key and nothing else.

## One form, two verbs

On the frontend, sign-in and sign-up looked like two screens until the clone detector pointed out they were one. Both are OAuth buttons, an "or" rule, email + password, a brand CTA, and a footer that flips to the other screen. So both screens *are* one component — `AuthMethods` — with different verbs plugged in; sign-up adds its verification stage and nothing else. The OAuth buttons themselves are config data, the same idiom as the tab bar: adding a provider is one line in an array, not a new component.

![Three real simulator screenshots: the sign-in screen, the first-run tutorial, and Home greeting Kivan Tester by name](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-04-learns.png?v=39854ac)

Those are real simulator screenshots from the verification run — Clerk's development instances accept test addresses (any email with a `+clerk_test` subaddress, verification code `424242`), which is how an automated UI test can sign up without an inbox.

The audit gate ran eighteen times across two attack lenses before three consecutive passes came back clean — and the best finding wasn't even in my first draft. It was in my fix. I'd unified the brand logo's size behind one config value, which made two style blocks byte-identical, which the clone detector then flagged, which forced the real extraction (a shared `BrandMark`). Fixes to duplication are themselves duplication suspects. That's why the gate repeats until a full pass finds nothing.

## 401 means you, 503 means me

Auth is where readers spend the most time debugging, so a status code's job is to point at the right suspect. A missing token, a garbage token, a forged key ID — that's the caller's problem, and every one of them gets a generic `401 Invalid authentication token`. Clerk unreachable, the secret key wrong, the users table missing — that's our problem, and each gets a `503` whose message names the fix (the table one literally says "run terraform apply and set ENVIRONMENT to match"). The ported code did neither: a Clerk outage surfaced as a 401 *with the internal error string attached* — sending valid users off to debug their own tokens while leaking library internals to anyone unauthenticated.

![Terminal: CREATE_FAILED with no logs, the missing application log group, the depends_on fix, and the service reaching RUNNING](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-04-race.png?v=39854ac)

Two traps in the verifier, both found by reading the JWT library's source. One: an attacker spamming tokens with unknown key IDs forces a JWKS refetch per request. The refetch itself is the library's behavior — what the verifier must get right is the classification: an unknown key is the caller's 401 at info level, never a 503 or an error-level log, so the spam can't masquerade as a Clerk outage while it hammers your logs. Two: PyJWT's `cache_keys=True` looks like the performance option, but it's an `lru_cache` with no expiry — a rotated or revoked signing key can stay trusted until the process restarts. Key *set* caching with a one-hour lifespan gives you the same networkless hot path and picks up a rotation within the hour.

## The secret that skips the console

The backend needs Clerk's secret key. The lazy route is a plaintext App Runner environment variable — readable in the AWS console and by anyone with `apprunner:DescribeService`. This step does it properly: the key lives in SSM as a **SecureString**, App Runner resolves it at instance start via `runtime_environment_secrets`, and the instance role gets `ssm:GetParameters` on exactly that one parameter.

Which is where the opening story pays off. The first rollout died because App Runner validated its secret access *while Terraform was still attaching the SSM read policy*. Terraform saw no dependency — the service only references the role's ARN, not its policies — so it created both in parallel and lost the race. That's the third `CREATE_FAILED`-with-no-logs: not a bad image, not a bad manifest, but IAM that arrived seconds late. The fix is one honest line in the service resource — plus one `terraform apply -replace` of the dead service, because a `CREATE_FAILED` service doesn't heal itself:

```hcl
depends_on = [aws_iam_role_policy.apprunner_instance_ssm]
```

Same image, replaced with the policy in place first: `RUNNING`.

## A tutorial that survives a reinstall

First sign-in shows a swipeable welcome carousel. The whole feature is one bit: `onboarding_completed` lives on the backend user record, not on the device — so a reinstall, a new phone, or a cleared cache doesn't replay the tutorial. "Get Started" flips it through an endpoint whose DynamoDB update carries `ConditionExpression="attribute_exists(id)"`, because `update_item` is secretly an upsert and an unguarded one can invent a half-formed user.

One more scar from verification: the UI test could not tap the carousel's Next button. The button is text inside a glass blur view, and **unlabeled content inside a BlurView doesn't reach the accessibility tree**. The automation failed exactly where VoiceOver would have. Labels on the touchables fixed the test and the screen reader in the same commit.

## You're done when

- `curl $API/users/me` → 401; with a garbage token → 401, generic detail
- Sign up with a `+clerk_test` address, code `424242` → the first-run tutorial appears
- Home greets you by name, and **Record** shows your email + provisioned date in green — read from DynamoDB, created by no client
- Sign out → sign in → no tutorial replay (the flag survived on the backend record)
- "Continue with Google" opens the browser consent sheet (Apple shares the code path — verify it the same way once enabled in your Clerk app)

## What's next

Step 05 gives the account a past and a delete button: profile data, birthdays, Settings, account deletion — the first fields to join those eight, each with its first caller.

**Following along?** ⭐ [Star the repo](https://github.com/srivardhanjalan/kivan-tutorial) — every step lands as a browsable pull request.

---

**Zero to Shipped — the series**

- **00 · [Introduction](https://medium.com/@srivardhanjalan/zero-to-shipped-2c13ce7e20e9)**
- **01 · [One script to set up everything](https://medium.com/@srivardhanjalan/one-script-to-set-up-everything-ae8bcea2d649)**
- **02 · [Dressed to Ship](https://medium.com/@srivardhanjalan/dressed-to-ship-1e2591179d8a)**
- **03 · Alive on Arrival** *(link when published)*
- **04 · Signed, Sealed, Delivered** *(this post)*
- **05 · Profiles** *(coming soon)*

*All code: [github.com/srivardhanjalan/kivan-tutorial](https://github.com/srivardhanjalan/kivan-tutorial)*
