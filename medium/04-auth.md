# Signed, Sealed, Delivered

*Zero to Shipped · 04. The app learns who you are: Clerk sign-in, JWKS-verified tokens, and a user record the client is never allowed to create.*

---

![Zero to Shipped 04 hero, signed, sealed, delivered: Home greeting Kivan Tester by name, and the record the backend wrote itself](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-hero-04.png?v=e31367e)

Who's allowed to create a user? I got it wrong first. By the end of this step you sign up in the app, a code lands in your inbox, the first-run tutorial plays, and Home greets you by name above a record the backend wrote for you, not the phone.

*(Step 04 of **Zero to Shipped**, a production social-wishlist app on Expo, FastAPI, and AWS. New here? **[Start with the introduction](https://medium.com/@srivardhanjalan/zero-to-shipped-2c13ce7e20e9)**. Code is the `04-auth/` folder; [PR #22](https://github.com/srivardhanjalan/kivan-tutorial/pull/22/files) is every line this step adds.)*

## Nobody creates their own user

Here's the obvious design, the one I reached for first. The phone signs up with Clerk, then calls `POST /users/sync` with the name and email to give the backend a record. Clean, direct, wrong.

It hands the client a pen to fill in its own database row. Any name, any email, any field I haven't invented yet, all attacker-controlled. And it fails on its own terms too. Only sign-*up* syncs, meaning a rebuilt database 404s every returning user forever, and a signup interrupted mid-sync leaves half a user in the table.

This step has no sync endpoint. The backend writes the record itself. The first time the auth dependency sees a valid token for a user it doesn't know, it fetches that user's real profile from Clerk server-to-server and writes the row:

```python
users_table.put_item(
    Item=new_user,
    ConditionExpression="attribute_not_exists(id)"  # create-only, race-safe
)
```

The profile comes from Clerk, not from whatever the phone sent, and the write is create-only. If two first-requests race, the loser is refused and caught, never clobbering the record. The check costs only the first request per user on a given instance, because a confirmed id stays cached in memory for the life of that process. A fresh database or an abandoned signup heals the next time that user calls, though a table rebuilt under a live backend needs a restart to clear that cache.

The record is eight fields: id, email, first and last name, avatar, the onboarding flag, two timestamps. No follower counts, no roles yet. DynamoDB is schemaless, and each of those joins the step that first reads it, one line, no migration. The table under it is a hash key and nothing else.

![Terminal: the eight-field user record read back from DynamoDB, every field written by the backend from Clerk — the client never sent one](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-04-record.png?v=e31367e)

## Sign-in and sign-up are the same screen

I built sign-in, started sign-up, and stopped ten lines in. Same screen. Both are OAuth buttons, an "or" divider, email and password, a brand button, and a footer link to the other. Sign-up adds a verification step and nothing else.

That makes them one component, `AuthMethods`, with the verb plugged in. The OAuth buttons are a config array, the same idiom as the step-02 tab bar, and adding Apple next to Google is a line in a list, not a new screen.

![Three real simulator screenshots: the sign-in screen, the first-run tutorial, and Home greeting Kivan Tester by name](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-04-learns.png?v=e31367e)

Real screenshots from the verification run, not mockups. Clerk's dev instances let you sign up without an inbox. Any `+clerk_test` address works, and the code is always `424242`. That's how an automated UI test drives the whole flow.

The best cleanup here came out of the fix, not the draft. Collapsing the logo's size behind one config value made two style blocks byte-identical, the clone detector caught that, and the real fix fell out: a shared `BrandMark`. A fix to duplication can be duplication, which is why the gate never trusts a single clean pass.

## 401 means you, 503 means me

Every request carries a Clerk session JWT as a Bearer token. The backend verifies it locally. It fetches Clerk's public signing keys from the JWKS endpoint (the JSON Web Key Set) and caches the set, checking each token's RS256 signature and expiry against a key it already holds. A token whose signature doesn't match, or whose key it can't find, is rejected.

The work is rejecting for the right reason. A missing token, a garbage token, a made-up key id are all the caller's problem, and each gets a flat `401 Invalid authentication token`. When the fault is mine instead (Clerk down, a wrong secret key, no users table), the answer is a `503` whose message names the fix; the missing-table one says to run `terraform apply` and set `ENVIRONMENT` to match, which only a caller with a valid token ever sees. Confuse the two and a Clerk outage surfaces as a `401` with the library's error string attached, which sends a valid user off to debug a fine token and leaks internals to anyone who asks.

![Terminal: a missing token and a garbage token both return a flat 401, while a server-side fault returns a 503 whose message names the fix](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-04-status.png?v=e31367e)

```python
except pyjwt.PyJWKClientConnectionError:   # JWKS unreachable: mine, 503
    raise HTTPException(503, "Authentication service temporarily unavailable")
except pyjwt.PyJWTError:                    # forged or expired token: theirs, 401
    raise HTTPException(401, "Invalid authentication token")
```

Two sharper traps hide in that verifier, both found only by reading PyJWT's source. Send tokens with unknown key ids and the library re-fetches Clerk's key set on every one. I can't stop the refetch, but I can stop it looking like an outage. An unknown key is the caller's `401` at info level, never a `503`, never error-level, or the spam masquerades as a Clerk failure while it floods the logs.

The second trap is a tempting flag. `cache_keys=True` reads like the performance option, but it is really an `lru_cache` with no expiry, and a key Clerk rotates or revokes stays trusted until the process restarts. Caching the key *set* with a one-hour lifespan instead keeps the networkless hot path and drops a revoked key within the hour, not never.

## Keeping the secret key out of the console

The backend makes two calls to Clerk (fetching the signing keys, and fetching a new user's profile), and both authorize with a Clerk secret key. The lazy way to hand that key to the container is a plaintext App Runner env var, sitting in the console, readable by anyone with `apprunner:DescribeService`. Instead, the key lives in SSM as a **SecureString**, App Runner resolves it at instance start via `runtime_environment_secrets`, and the instance role can read that one parameter and nothing else.

![Terminal: describe-service shows the Clerk secret as an SSM SecureString reference (an ARN), never the plaintext value, readable by a scoped instance role](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-04-secret.png?v=e31367e)

That last line broke my first rollout. `CREATE_FAILED`, no logs, the same empty failure step 03 hit twice. This time the image was fine. App Runner checked its secret access *while Terraform was still attaching the SSM policy*. Nothing tied the two together, and Terraform built them in parallel, losing the race. One line on the App Runner service resource fixes it:

```hcl
depends_on = [aws_iam_role_policy.apprunner_instance_ssm]
```

One `terraform apply -replace` rebuilt the service I'd already broken; with the line shipped, every apply since has been clean — same image, `RUNNING`.

## A tutorial that survives a reinstall

First sign-in plays a swipeable welcome carousel. The whole feature is one bit of state, and the only decision is where it lives: `onboarding_completed` sits on the backend record, not the device. Reinstall the app, switch phones. The tutorial stays done, because the flag was never on the phone to lose.

"Get Started" flips it through an endpoint guarded by `ConditionExpression="attribute_exists(id)"`. DynamoDB's `update_item` is secretly an upsert. Call it on a missing id and it happily creates a half-formed user. The condition makes it refuse, and the handler turns that refusal into a 404 rather than a phantom account.

The UI test could not tap the carousel's Next button. Its label sits behind a glass blur view, and the touchable wrapping it carried no `accessibilityLabel`. The automation was stranded exactly where a screen-reader user would be, and one label fixed both in the same commit.

## You're done when

- `curl $API/users/me` → 401; with a garbage token → 401, generic detail
- `curl -X POST $API/users/sync` → 404, the sync endpoint doesn't exist
- A wrong `ENVIRONMENT` on an authed route → `503` naming the `terraform apply` fix, never a `401`
- Sign up with a `+clerk_test` address, code `424242` → the first-run tutorial appears
- Home greets you by name, and **Record** shows your email + provisioned date in green, read from DynamoDB, created by no client
- Sign out → sign in → no tutorial replay (the flag survived on the backend record)
- "Continue with Google" opens the browser consent sheet (Apple shares the code path; verify it the same way once enabled in your Clerk app)
- `aws apprunner describe-service` shows the Clerk key as an SSM SecureString reference, never the plaintext value

## What's next

Step 05 gives the account a past and a delete button. Profile data, birthdays, a Settings screen, account deletion. These are the first fields to join those eight, each with its first real caller.

**Following along?** ⭐ [Star the repo](https://github.com/srivardhanjalan/kivan-tutorial). Every step lands as a browsable pull request.

---

**Zero to Shipped: the series**

- **00 · [Introduction](https://medium.com/@srivardhanjalan/zero-to-shipped-2c13ce7e20e9)**
- **01 · [One script to set up everything](https://medium.com/@srivardhanjalan/one-script-to-set-up-everything-ae8bcea2d649)**
- **02 · [Dressed to Ship](https://medium.com/@srivardhanjalan/dressed-to-ship-1e2591179d8a)**
- **03 · [Alive on Arrival](https://medium.com/@srivardhanjalan/alive-on-arrival-cda0a351844f)**
- **04 · Signed, Sealed, Delivered** *(this post)*
- **05 · Profiles** *(coming soon)*

*All code: [github.com/srivardhanjalan/kivan-tutorial](https://github.com/srivardhanjalan/kivan-tutorial)*
