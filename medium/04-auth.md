# Signed, Sealed, Delivered

*Zero to Shipped, step 4. Sign in with Clerk, and the backend writes your user record itself, straight from Clerk, never from the phone. A forged token gets a flat 401; a 503 means the fault is ours, and the one that bites fresh setups hands you the fix.*

![Zero to Shipped 04 hero: the real Kivan sign-in screen with Apple, Google, and email, beside a terminal where a request with no token gets a flat 401 and a request with a valid token gets back the user record the backend wrote itself](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-hero-04.png?v=PLACEHOLDER)

*Step 04 of [**Zero to Shipped**](https://medium.com/@srivardhanjalan/zero-to-shipped-2c13ce7e20e9), a production social-wishlist app built one shippable step at a time on Expo, FastAPI, and AWS.*

*[All the code](https://github.com/srivardhanjalan/kivan-tutorial) is on GitHub, every step a runnable folder.*

## The problem

Until now the app has no idea who is using it. Every screen is anonymous, and the backend holds no user records at all. Teaching it who you are is the whole step, and it is four problems at once, none of them the login form.

- **Someone has to create the user record, and it can't be the phone.** The obvious move (let the app send its name and email up after signup) hands the client a pen to write its own database row: any name, any email, all attacker-controlled.
- **The backend can't trust a token on sight.** A session token rides on every request, and verifying it wrong either lets a forged one through or blames the user for an outage that is ours.
- **The first-run tutorial can't remember on the phone.** A welcome that plays once has to stay played across reinstalls and new devices.
- **The backend's Clerk secret can't sit in the console.** The server needs a secret key to reach Clerk, and it must not land somewhere the console will read back.

## What we build

A real sign-in that ends with the backend knowing you. The phone signs in with Clerk (Apple, Google, or email and a password). Every request after that carries a Clerk token, and the backend verifies it locally against Clerk's own public keys. The first time it sees a valid token for someone it has never met, it fetches that person's profile from Clerk server-to-server and writes the DynamoDB record itself. The client is never handed a create-user endpoint at all.

That answers all four:

- **The record** is created just-in-time, server-side, from Clerk's copy of your profile, with a create-only write so a returning user is never overwritten.
- **The token** is verified against Clerk's cached signing keys: a bad token is the caller's flat 401, an unreachable Clerk or a missing table is our 503, and the missing-table 503 names the exact fix.
- **The tutorial** flag lives on the backend record, not the device, so a reinstall or a new phone never replays it.
- **The secret** lives in SSM as a SecureString and reaches the container at boot, never as a plaintext value the console can read.

This step gives you an account, not a profile to edit or a way to delete it. Those are step 5. It splits into five moves, in build order: one screen for both sign-in and sign-up, the just-in-time record, the token verifier, the reinstall-proof tutorial, and the Clerk secret kept out of the console.

**What we need:** step 3 done, a Clerk application with Email and Google enabled (Apple optional), and an AWS account. The users table is real DynamoDB, so `terraform apply` runs this step even when you run the API on your laptop.

**Time:** about 45 to 75 minutes, most of it the one-time Clerk setup and the deploy.

**The code:** the snippets below are shown as images; the full, copyable source lives in [PR #22: Files changed](https://github.com/srivardhanjalan/kivan-tutorial/pull/22/files), organized by the file paths shown in each caption.

## What we touch this step

Seventeen files carry the work, across the backend, the app, and the infra. Each build section below takes one area.

![What we touch this step, seventeen files grouped by folder: the backend verifier and record (auth dependency, provisioning, users routes, model, config), the frontend way in (the ClerkProvider entry point, both auth screens, the shared methods column, OAuth config, onboarding, the auth gate, Home), and the infra table and secret; each file marked new or modified](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-04-filemap.png?v=PLACEHOLDER)

## One screen for sign-in and sign-up

An auth screen you build twice is an auth screen that drifts twice. Sign-in and sign-up are the same column: the OAuth buttons, an "or" rule, an email and password, a brand button, and a link to the other screen. Sign-up adds a verification step and nothing else. So they are one component, `AuthMethods`, with the verb plugged in.

The OAuth providers are a config array, the same config-as-data idiom as the step-02 tab bar. Adding Apple next to Google is one line in a list, not a new screen:

[![The OAuth providers as a config array, one button rendered per entry](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-04-code-oauth.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/04-auth/frontend/src/components/OAuthButtons.tsx)

Notice what the button does not do on success: it calls no backend sync. It sets the Clerk session active and stops. The record gets written on the server, by the next authenticated request, which is the whole point of the next section.

## Nobody creates their own user

Hand the client a create-user call and it can write anyone's name into your table. So we ship no sync endpoint at all; the backend writes the record itself.

The first time the auth dependency verifies a token for a user it has never seen, it fetches that user's real profile from Clerk, server-to-server, and writes the row. The profile comes from Clerk, not from whatever the phone sent, so a client can never assert someone else's name. The write is create-only: if two first requests race, the loser is refused and caught, never clobbering the record.

![Provisioning a user just-in-time: the app sends its Clerk token, the backend fetches that user's profile from Clerk server-to-server, and the backend writes the DynamoDB record. The phone is never on the write path.](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-04-provision.png?v=PLACEHOLDER)

The record is eight fields: id, email, first and last name, an avatar URL, the onboarding flag, and two timestamps. No follower counts, no roles yet. DynamoDB is schemaless, so each new field joins the step that first reads it, one line, no migration. The write is one conditional put:

[![The just-in-time user record, written create-only with a conditional put so a race never clobbers an existing row](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-04-code-provision.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/04-auth/backend/app/utils/user_provisioning.py)

The existence check costs only the first request per user on a given instance: a confirmed id stays cached in memory for the life of the process. A fresh database, or a signup interrupted mid-flight, heals itself the next time that user calls. (Rebuild the table under a running backend and that cache needs a restart to clear, but that is a development snag, not something a user hits.)

## Verify the token, and blame the right party

Confuse "your token is bad" with "our service is down" and a Clerk outage sends a valid user off to debug a token that was fine, with the library's internal error string attached for anyone to read. So the backend is careful about who each failure belongs to.

Every request carries a Clerk session token as a Bearer token. The backend verifies it locally: it fetches Clerk's public signing keys once from the JWKS endpoint, caches the set for an hour, and checks each token's signature and expiry against a key it already holds. A missing token, a garbage token, or one signed by a key it can't find is the caller's problem, and each gets a flat `401`. When the fault is ours instead (Clerk unreachable, a wrong secret key, no users table) the answer is a `503`, not a `401`: the generic ones say the service is temporarily unavailable, and the missing-table one names the fix outright:

[![The verifier splitting failures by owner: an unreachable JWKS endpoint raises 503, a forged or expired token raises 401](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-04-code-verify.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/04-auth/backend/app/dependencies/auth.py)

One tempting flag would have quietly undone this. `cache_keys=True` reads like the performance option, but it is really a per-key cache with no expiry, and a key Clerk rotates or revokes would stay trusted until the process restarts. So we cache the key set with a one-hour lifespan instead, which keeps the hot path networkless and drops a revoked key within the hour, not never.

## A tutorial that survives a reinstall

Store "seen it" on the phone and a reinstall replays the welcome carousel. So the `onboarding_completed` flag sits on the backend record, not the device. Reinstall the app or switch phones: the tutorial stays done, because the flag was never on the phone to lose.

"Get Started" flips it through an endpoint guarded by a condition. DynamoDB's `update_item` is secretly an upsert: call it on an id that doesn't exist and it happily creates a half-formed user. The `attribute_exists(id)` guard makes it refuse, and the handler turns that refusal into a 404 instead of a phantom account:

[![The onboarding endpoint flipping the flag, guarded by attribute_exists so an upsert can never invent a partial user](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-04-code-onboarding.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/04-auth/backend/app/routes/users.py)

## Keep the Clerk secret out of the console

A plaintext environment variable is readable by anyone with `apprunner:DescribeService`, and a secret key that talks to Clerk is exactly the wrong thing to leave sitting in the console. So we never let the key become a plain env var.

It lives in SSM as a **SecureString**. App Runner resolves it at instance start through `runtime_environment_secrets`, and the instance role can read that one SSM parameter and no other. The container gets `CLERK_SECRET_KEY` in its environment; `DescribeService` shows only an SSM reference:

[![App Runner injecting the Clerk key from SSM at instance start via runtime_environment_secrets, never as a plaintext value](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-04-code-secret.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/04-auth/infra/apprunner.tf)

## Deploy it

This step adds infrastructure: the users table, the SSM secret, the scoped IAM, and the secret injection on the service. The rollout is the same staged one as step 3, plus the one secret in `terraform.tfvars`:

[![The deploy commands: init, build the ECR repo, push the amd64 image, apply the stack, then read the service URL into the app](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-04-code-deploy.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/tree/main/04-auth/infra)

## What bit me

Three things cost me time on this step, worst first.

**`CREATE_FAILED` with no logs, and the image was fine.** My first rollout of this step died with a bare `CREATE_FAILED` and empty logs. Step 3 taught me that empty failure usually means a bad image, so I went hunting there and found nothing wrong. The real cause was ordering: App Runner validates its access to the SSM secret while it provisions, and Terraform had no reason to know the service depended on the instance role's SSM policy, so it built the two in parallel and the service lost the race. A `depends_on` from the service to the SSM policy serializes them. One `terraform apply -replace` rebuilt the service I had already broken, and every apply since has come up `RUNNING` on the same config.

**The app crashed at boot with a missing native module.** `@clerk/clerk-expo` transitively wants a newer `expo-auth-session` than Expo Go 54 ships, so the app died on launch with `Cannot find native module 'ExpoCryptoAES'`, before a single screen drew. Pinning `expo-auth-session` and `expo-crypto` with `npx expo install` (so npm dedupes Clerk onto the SDK-54 versions) fixed it. It is already in `package.json`, so you inherit the fix, but it cost me an afternoon of blaming my own code.

**A button my UI test could not tap.** The onboarding carousel's Next button lives inside a glass blur view, and text inside a `BlurView` is invisible to the accessibility tree. The touchable wrapping it carried no accessibility label, so my automation was stranded exactly where a screen-reader user would be. One `accessibilityLabel` on the touchable fixed the test and VoiceOver in the same commit.

## You're done when

- [ ] `curl $API/users/me` → 401; with a garbage token → 401, generic detail
- [ ] `curl -X POST $API/users/sync` → 404, because the sync endpoint does not exist
- [ ] A wrong `ENVIRONMENT` on an authenticated route → 503 naming the `terraform apply` fix, never a 401
- [ ] Sign up with a `+clerk_test` address, code `424242` → the first-run tutorial appears
- [ ] Home greets you by name, and **Record** shows your email and provisioned date in green, read from DynamoDB, written by no client
- [ ] Sign out, then sign in again → no tutorial replay, because the flag survived on the backend record
- [ ] "Continue with Google" opens the browser consent sheet (Apple shares the code path; verify it the same way once enabled in your Clerk app)
- [ ] `aws apprunner describe-service` shows the Clerk key as an SSM SecureString reference, never the plaintext value

## What's next

Step 5, Profiles: the account gets a past and a delete button. Profile fields, a birthday, a Settings screen, and account deletion. These are the first fields to join those eight, each with its first real reader.

---

**Zero to Shipped: the series**

- **00 · [Introduction](https://medium.com/@srivardhanjalan/zero-to-shipped-2c13ce7e20e9)**
- **01 · [One script to set up everything](https://medium.com/@srivardhanjalan/one-script-to-set-up-everything-ae8bcea2d649)**
- **02 · [Dressed to Ship](https://medium.com/@srivardhanjalan/dressed-to-ship-1e2591179d8a)**
- **03 · [Alive on Arrival](https://medium.com/@srivardhanjalan/alive-on-arrival-cda0a351844f)**
- **04 · Signed, Sealed, Delivered** (you are here)
- **05 · [Two Places at Once](https://medium.com/@srivardhanjalan/two-places-at-once-1e00bb46354b)**
- **06 · [Photos Without the Exposure](https://medium.com/@srivardhanjalan/photos-without-the-exposure-96e9acf11db3)**
- **07 · Whose Wish Is It Anyway?** (coming soon)

**[All the code on GitHub](https://github.com/srivardhanjalan/kivan-tutorial)**
