# Step 04 — Auth & Onboarding

The app learns your name: Clerk sign-in/up (email + code, Google, Apple),
JWKS-verified tokens on the backend, a DynamoDB user record created
**just-in-time** by your first authenticated request, and a first-run
tutorial whose "seen it" flag lives on that record — ending with Home
greeting you by name over a line item proving the backend knows you too.

**The exact delta this step adds:**
[PR #22 — Files changed](https://github.com/srivardhanjalan/kivan-tutorial/pull/22/files)

## Accounts first (5 minutes, once)

1. [dashboard.clerk.com](https://dashboard.clerk.com) → Create application →
   enable **Email** (with password + email verification code), **Google**,
   and **Apple**. Development instances ship with shared OAuth credentials —
   no Google/Apple console work needed for this step.
2. From **API keys**: the publishable key (`pk_test_…`) goes to
   `frontend/.env.local`, the secret key (`sk_test_…`) to
   `infra/terraform.tfvars` (both gitignored — they never enter the repo).

## Run it locally

Terminal 1 — the backend now needs the Clerk secret and a users table.
The table comes from Terraform (below); until it exists, authenticated
routes answer 503 naming exactly what's missing:

```bash
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
CLERK_SECRET_KEY=sk_test_… ENVIRONMENT=production .venv/bin/python run.py
```

Config is environment-variables-only, on purpose: a missing
`CLERK_SECRET_KEY` fails at startup naming the variable, and secrets keep
exactly two sanctioned homes (`.env.local`, `terraform.tfvars`) — no third
`.env` file to leak.

Terminal 2 — the app:

```bash
cd frontend
cp .env.example .env.local     # fill in EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
npm install
npm run ios
```

## Deploy it

Same staged rollout as step 03, plus one secret. The Clerk key reaches the
container as an SSM **SecureString** via App Runner's
`runtime_environment_secrets` — never a plaintext env var readable in the
console:

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars    # + your sk_test_… key
terraform init
terraform apply -target=aws_ecr_repository.backend
./scripts/deploy.sh
terraform apply
./scripts/deploy.sh                              # tags the log groups (instant)

terraform output -raw apprunner_ecr_service_url  # → frontend/.env.local
```

Restart the dev server after editing `.env.local`
(`npx expo start -c --localhost` — `EXPO_PUBLIC_*` is inlined at bundle time).

**Try it end to end:** sign up (Clerk dev instances accept test addresses —
any `you+clerk_test@example.com` verifies with code `424242`), watch the
first-run tutorial appear, and check Home: your name in the header, and a
**Record** line showing the email + provisioned date read back from
DynamoDB — a record no client ever wrote.

## What's here

```
backend/
  app/dependencies/auth.py     JWKS verification (FastAPI dependency, not
                               middleware — routes opt in via Depends)
  app/utils/user_provisioning.py   JIT user creation, create-only conditional write
  app/utils/timestamps.py      one spelling of "now" for records
  app/routes/users.py          /users/me + the onboarding flag endpoints
  app/models/users.py          the user record, one domain per file
  app/config.py                env-only settings; clerk_secret_key required
  app/database.py              boto3 + the users table handle
infra/                         step 03's stack plus:
  dynamodb.tf                  the users table — hash key only; indexes join
                               in step 10 with the features that query them
  ssm.tf                       the Clerk secret as a SecureString
  iam.tf                       + scoped ssm:GetParameters and DynamoDB
                               get/put/update (delete arrives with step 05)
frontend/                      step 03's shell plus:
  src/components/Navigation.tsx     the auth gate + onboarding orchestration
  src/screens/SignInScreen.tsx      both auth screens are AuthMethods
  src/screens/SignUpScreen.tsx        with different verbs
  src/components/AuthMethods.tsx    OAuth buttons + email form + switch row
  src/components/OAuthButtons.tsx   providers as config data (one line to add one)
  src/components/OnboardingTutorial.tsx  the first-run carousel
  src/screens/HomeScreen.tsx        the greeting + the Record proof line
  src/hooks/useAuthAction.ts        loading + toast-on-error, spelled once
  src/utils/tokenCache.ts           Clerk sessions in the device keychain
```

## The ideas this step plants

- **Never trust the client to create its own user.** There is no "sync me"
  endpoint. The backend provisions the record server-side on the first
  verified request, fetching the profile from Clerk directly — a client can
  never assert someone else's name. Sign-in on a fresh database self-heals
  the same way.
- **The schema is as small as today's app.** The users table has a hash key
  and nothing else; the record has eight fields. Follower counts, search
  fields, roles — each lands in the step that reads it (DynamoDB is
  schemaless; adding a field later costs one line, not a migration).
- **401 means *your* fault, 503 means *ours*.** A forged token gets 401; an
  unreachable Clerk or a missing table gets 503 with a message naming the
  fix. Auth is where readers debug the most — status codes should point at
  the right suspect.

## Gotchas

- **Expo Go pulls SDK-matched natives.** `@clerk/clerk-expo` transitively
  wants a newer `expo-auth-session` than Expo Go 54 ships — the app crashes
  at boot with `Cannot find native module 'ExpoCryptoAES'`. The fix is
  pinning `expo-auth-session`/`expo-crypto` via `npx expo install` (already
  in package.json) so npm dedupes Clerk onto the SDK-54 versions.
- **`CREATE_FAILED` with no logs, cause #3: IAM propagation.** App Runner
  validates its SSM secret while provisioning; Terraform doesn't know the
  service depends on the instance role's SSM policy unless told. We lost
  that race for real — hence the explicit `depends_on` in `apprunner.tf`.
- **Text inside a BlurView is invisible to the accessibility tree.** The
  onboarding's glass button carries `accessibilityRole`/`Label` on the
  touchable for VoiceOver (and UI tests) to find it. Icon-only buttons
  (sign-out) need labels for the same reason.
- **`cache_keys=True` on PyJWKClient is a trap.** It's an `lru_cache` with
  no TTL — a rotated Clerk signing key would stay trusted until restart.
  The JWK-*set* cache (with `lifespan`) is the right one; we cache only that.

## Done when

- [ ] `curl $URL/users/me` → 401; with a garbage token → 401 (generic detail)
- [ ] Sign up with a `+clerk_test` address, code `424242` → the first-run
      tutorial appears
- [ ] Home greets you by name; **Record** shows your email + provisioned
      date (green) — read from DynamoDB, written by no client
- [ ] Sign out → sign in again → no tutorial replay (the flag survived on
      the backend record)
- [ ] "Continue with Google" opens the browser consent sheet (Apple rides
      the same Clerk OAuth flow)

Next: `05-profiles` — profile data, birthday, Settings, account deletion.
