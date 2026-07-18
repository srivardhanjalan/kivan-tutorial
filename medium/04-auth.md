# Signed, Sealed, Delivered

*Zero to Shipped · 04 — the app learns your name for real: Clerk sign-in, JWKS-verified tokens, and a user record the client is never allowed to create.*

---

![Zero to Shipped 04 hero — signed, sealed, delivered: the 401s terminal and the Home screen greeting Kivan Tester by name](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-hero-04.png?v=1d39c8c)

By the end of this step you sign up inside the app, a verification code lands in your inbox, the first-run tutorial plays, and Home greets you by name above a record the backend wrote for you. Real accounts, end to end.

The interesting decisions all cluster around one question — who is allowed to create a user — and I got the first answer wrong.

*(This is step 04 of **Zero to Shipped** — building a production social-wishlist app on Expo, FastAPI, and AWS. New here? **[Start with the introduction](https://medium.com/@srivardhanjalan/zero-to-shipped-2c13ce7e20e9)**. The code is the `04-auth/` folder; [PR #22](https://github.com/srivardhanjalan/kivan-tutorial/pull/22/files) shows every line this step adds.)*

## Who's allowed to create a user

Here's the design I reached for first, because it's the obvious one. The phone signs up with Clerk. Then the app calls `POST /users/sync` with the new name and email, so the backend has a record to hang everything else on. Clean, direct, done.

Then I looked at what I'd actually built: an endpoint that hands the client a pen and asks it to fill in its own database row. A client can write anything. It can claim any name, any email, any field I haven't invented yet. And that's before the design even fails on its own terms — sign-*in* never syncs, only sign-*up* does, so the day I rebuild the database every returning user 404s forever. Close the app between "account created" and "sync succeeded" and there's half a user sitting in the table.

So this step has no sync endpoint. The backend creates the record itself, and it does it the first time it sees a valid token for a user it doesn't recognize. The auth dependency notices the gap, calls Clerk's API server-to-server for that user's real profile, and writes the row:

```python
users_table.put_item(
    Item=new_user,
    ConditionExpression="attribute_not_exists(id)"  # create-only, race-safe
)
```

Now the profile comes from Clerk, not from whatever the phone felt like sending. Two requests racing to be first can't both win the create. And a rebuilt database heals itself on the next sign-in, because provisioning isn't a one-time event any more — it's a guarantee that runs on every authenticated request.

The record is eight fields: id, email, first and last name, avatar, the onboarding flag, and two timestamps. No follower counts, no search keys, no roles. DynamoDB is schemaless, so each of those joins the step that first reads it, at the cost of one line and zero migrations. The table underneath is a hash key and nothing else.

## Sign-in and sign-up are the same screen

I built the sign-in screen, then started on sign-up, and stopped about ten lines in. They're the same screen. Both are a stack of OAuth buttons, an "or" divider, an email-and-password form, a brand-colored button, and a footer link to the other one. Sign-up adds a verification-code step after that, and nothing else.

So there's one component, `AuthMethods`, and the verb — sign in, sign up — is what you plug into it. The OAuth buttons aren't code, they're a config array, the same idiom as the tab bar back in step 02: adding Apple next to Google is a line in a list, not a new screen.

![Three real simulator screenshots: the sign-in screen, the first-run tutorial, and Home greeting Kivan Tester by name](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-04-learns.png?v=1d39c8c)

Those are real screenshots from the verification run, not mockups. Clerk's development instances let you sign up without an inbox: any address with a `+clerk_test` subaddress is accepted, and the verification code is always `424242`. That's what lets an automated UI test drive the whole flow end to end.

The audit gate found the best cleanup here, and it wasn't in my first draft — it was in my fix. I'd collapsed the brand logo's size behind one config value, which happened to make two style blocks byte-for-byte identical, which the clone detector then caught, which forced the real fix: a shared `BrandMark`. A fix to duplication can be duplication. That's why the gate doesn't trust a single clean pass.

## 401 means you, 503 means me

Auth is where readers lose the most hours to debugging, so I made the status codes do the pointing. A missing token, a garbage token, a made-up key ID — that's the caller's problem, and every one of them gets the same flat `401 Invalid authentication token`. Clerk unreachable, the secret key wrong, the users table missing — that's *my* problem, and each gets a `503` whose message names the fix. The missing-table one literally says to run `terraform apply` and set `ENVIRONMENT` to match.

Getting this wrong is easy and quiet. The naive verifier lets a Clerk outage surface as a `401` with the library's internal error string bolted on — which sends a perfectly valid user off to debug a token that was fine, while leaking library internals to anyone who asks.

Two sharper traps live in the token verifier itself, and I only found them by reading PyJWT's source:

Someone spamming tokens with unknown key IDs makes the library re-fetch Clerk's key set on every request. I can't stop the refetch — that's the library — but I can stop it from looking like an outage. An unknown key is the caller's `401`, logged at info level, never a `503` and never an error. Classify it wrong and the spam masquerades as a Clerk failure while it floods the logs.

The other one hides in an innocent-looking flag. `cache_keys=True` reads like the performance option; it's actually an `lru_cache` with no expiry, so a signing key that Clerk rotates or revokes stays trusted here until the process restarts. Caching the key *set* with a one-hour lifespan gives the same networkless hot path and picks up a rotation within the hour.

## Keeping the secret key out of the console

The backend needs Clerk's secret key, and the lazy way to give it one is a plaintext App Runner environment variable — sitting in the AWS console in the clear, readable by anyone with `apprunner:DescribeService`. This step does it properly. The key lives in SSM as a **SecureString**, App Runner resolves it at instance start through `runtime_environment_secrets`, and the instance role can read exactly that one parameter and nothing else.

That last decision is also what broke my first rollout — and it broke it in the now-familiar way, `CREATE_FAILED` with no logs, the same empty-handed failure step 03 hit twice. This time the image was fine. App Runner checked its access to the secret *while Terraform was still attaching the SSM read policy* — the two resources have no dependency between them, since the service only names the role's ARN, so Terraform built them in parallel and the secret check lost the race. The fix is one honest line:

```hcl
depends_on = [aws_iam_role_policy.apprunner_instance_ssm]
```

![Terminal: CREATE_FAILED with no logs, the missing IAM policy, the depends_on fix, and the service reaching RUNNING](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-04-race.png?v=1d39c8c)

One catch: a `CREATE_FAILED` service doesn't heal itself when you fix the cause, so the fix also needs a `terraform apply -replace` to tear down the dead one and build it again — this time with the policy already in place. Same image, `RUNNING`.

## A tutorial that survives a reinstall

First sign-in plays a swipeable welcome carousel. The whole feature comes down to one bit of state, and the only real decision is where it lives: `onboarding_completed` sits on the backend user record, not on the device. Reinstall the app, switch phones, clear the cache — the tutorial stays done, because the flag was never on the phone to lose.

"Get Started" flips it through an endpoint, and that endpoint carries a guard I learned to respect: `ConditionExpression="attribute_exists(id)"`. DynamoDB's `update_item` is secretly an upsert — call it on an id that isn't there and it cheerfully creates a half-formed user out of nothing. The condition makes it refuse.

The last scar came from the UI test, which could not tap the carousel's Next button no matter what I tried. The button is text inside a glass blur view, and unlabeled content inside a `BlurView` never reaches the accessibility tree — so the automation was failing in the exact spot a VoiceOver user would have been stranded. One `accessibilityLabel` on the touchable fixed the test and the screen reader in the same commit.

## You're done when

- `curl $API/users/me` → 401; with a garbage token → 401, generic detail
- Sign up with a `+clerk_test` address, code `424242` → the first-run tutorial appears
- Home greets you by name, and **Record** shows your email + provisioned date in green — read from DynamoDB, created by no client
- Sign out → sign in → no tutorial replay (the flag survived on the backend record)
- "Continue with Google" opens the browser consent sheet (Apple shares the code path — verify it the same way once enabled in your Clerk app)

## What's next

Step 05 gives the account a past and a delete button: profile data, birthdays, a Settings screen, account deletion — the first fields to join those eight, each landing with its first real caller.

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
