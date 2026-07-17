# Step 05 — Profiles

The account gets a past and a delete button: a Settings screen pushed over
the tabs (the app's first stack navigation), name edits that update Clerk
AND the backend record so neither goes stale, a birthday picker that
survives its own zero-padding history, and account deletion done properly —
soft-deleted server-side, removed from Clerk, and locked out forever.

**The exact delta this step adds:**
[PR #TBD — Files changed](https://github.com/srivardhanjalan/kivan-tutorial)

## Run it locally

Same two terminals as step 04 — nothing new to configure; the profile
fields ride the existing users table (DynamoDB is schemaless: no migration,
no new infrastructure this step).

```bash
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
CLERK_SECRET_KEY=sk_test_… ENVIRONMENT=production .venv/bin/python run.py
```

```bash
cd frontend
npm install
npm run ios
```

## Deploy it

Identical to step 04's rollout — `terraform apply` reports no changes if
step 04's stack is up (this step adds no resources). Push the new image:

```bash
cd infra && ./scripts/deploy.sh    # App Runner redeploys :latest
```

**Try it end to end:** tap the gear on Home → rename yourself (watch Home
greet the new name the moment you return — the record refetches on focus),
set your birthday on the three wheels, then walk the danger zone: type
`DELETE`, confirm, and try signing back in. The credentials are gone from
Clerk, and even a still-warm token bounces off the 403 guards.

## What's here

```
backend/
  app/routes/users.py          + PUT /me (names, birthday, prompt flag) and
                               DELETE /me (soft-delete → cache evict → Clerk)
  app/models/users.py          + UserUpdate (birthday parses as a real date),
                               AccountDeletionRequest
  app/utils/user_provisioning.py  + the is_deleted 403 guard and forget_user()
frontend/                      step 04's app plus:
  src/components/Navigation.tsx     the stack navigator — Tabs at the root,
                                    Settings the first screen ever pushed
  src/screens/SettingsScreen.tsx    name / email / birthday / replay tutorial /
                                    danger zone / sign out
  src/components/BirthdayPrompt.tsx the nudge, with a dismissal that PERSISTS
  src/components/FormInput.tsx      the text field (was AuthTextInput —
                                    Settings is its second home)
  src/components/PrimaryButton.tsx  + secondary and danger variants
  src/hooks/useFetch.ts             (was useFetchOnMount) + refetchOnFocus —
                                    Home re-reads the record after Settings
  src/components/FloatingHeader.tsx + a left slot: pushed screens get a back
                                    button in the same header language
```

## The ideas this step plants

- **Write to every store that reads.** Names live in Clerk (it greets you)
  and on the backend record (everything else reads it). The original app
  wrote names to Clerk only — the record's copy went stale after the first
  edit and nothing ever healed it. One extra call keeps both true.
- **Deletion is a flag plus a lockout, not a purge.** The record stays
  (later steps' data will reference it) but `is_deleted` 403s every future
  request — including tokens still warm when the Clerk user vanished, and
  including the in-process "known users" cache, which the delete evicts.
- **Fields join the record when the user creates them.** No migration added
  `birthday` — the first `PUT` did. The model's defaults absorb records
  from before the field existed.

## Gotchas

- **Picker values must match exactly — padding is data.** The original
  birthday wheels stored padded values against unpadded items, so the wheel
  silently showed no selection. Values here are unpadded (`"1"`), labels
  padded (`"01"`), and the load path strips zeros before it touches state.
- **The dismissal that never persisted.** The original app sent
  `birthday_prompt_dismissed` to a backend whose model didn't have the
  field — Pydantic silently dropped it and the nag returned forever. If a
  client sends a field, prove the server keeps it.
- **Don't confirm destructive actions with system alerts.** The delete
  confirmation is an in-app modal: system alerts live outside the app's
  accessibility tree, where neither VoiceOver nor UI automation can follow.

## Done when

- [ ] Rename yourself in Settings → back to Home → the greeting is the new
      name without an app restart
- [ ] Set a birthday → reopen Settings → the wheels show the saved date
- [ ] Dismiss the birthday prompt → force-quit and relaunch → it stays gone
- [ ] Type `DELETE` → the app signs out → signing in again fails (the
      account no longer exists in Clerk)
- [ ] `curl -X PUT $API/users/me` with no token → 401; with a birthday of
      `"not-a-date"` and a valid token → 422

Next: `06-media` — S3 photos with a backend-owned lifecycle: pending
upload → claim on save → auto-expiry.
