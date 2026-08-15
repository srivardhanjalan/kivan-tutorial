# Step 13: Events

Step 11 gave the network a voice, but only inside the app: a follow, a new
wishlist, a new wish, or a love wrote an in-app row you'd see next time you
opened the fourth tab. This step lets that voice **reach your inbox**. The same
Lambda that writes the notification row now also **mails the recipient a copy**
through Mailgun, so a notification lands whether or not the app is open.

It is the **same consumer**, not a new one. Right after the notification row is
written, the handler attempts one email as a **best-effort** afterthought: an
email failure is caught and logged, and the notification it accompanies is never
failed by it. A recipient can turn email copies off with a new **Email copies**
switch on the notification settings screen (`email_notifications`, defaulting on),
and the Lambda honors that flag before it sends.

What ships here is **email only**. There are still **no events**
(`event_created` / `event_invitation` arrive in step 13) and no push. The four
types are `follow`, `wishlist_created`, `wish_added`, and `wishlist_loved`, and
every one of them now also mails, with one generic template (the type rides as a
label, there is no per-type copy).

**The exact delta this step adds:**
[PR #PLACEHOLDER · Files changed](https://github.com/srivardhanjalan/kivan-tutorial/pull/PLACEHOLDER/files)

## Run it locally

Same two terminals as step 11. Nothing about email changes the local story: the
Lambda (and therefore every email) runs only on the deployed stack, so locally
the new **Email copies** switch reads and writes the settings table like any
other preference, and no mail is sent.

```bash
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
CLERK_SECRET_KEY=sk_test_... .venv/bin/uvicorn app.main:app --reload
```

```bash
cd frontend
npx expo install            # SDK-matched versions, never hand-pinned
npx expo start -c --localhost
```

## Running the backend tests

The moto suite grows by six over step 11's 26, to **32 green**. Three cover the
settings route now that it carries `email_notifications` (the GET default, a
PUT round-trip, and a partial PUT that leaves other fields alone). Three exercise
the Lambda's email leg with `requests.post` monkeypatched, so no mail leaves the
process: an opted-out user gets no send, an opted-in user with an email on a
configured stack gets exactly one POST to the right Mailgun URL/auth/recipient,
and an unconfigured stack skips the send.

```bash
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt -r requirements-dev.txt
.venv/bin/python -m pytest
```

The suite works on Python 3.11 to 3.13 (pydantic-core has no 3.14 wheel yet).

## Deploy it

This step adds **no new infrastructure resources of its own** beyond one SSM
SecureString for the Mailgun key: the queue, the tables, and the Lambda are all
step 11's. What changes is the Lambda's package and its config.

**1. The Mailgun secret (vault first).** The API key is a secret, so it follows
the repo's established idiom: an SSM **SecureString**, never a plaintext Lambda
env var. Put the real values in your gitignored `infra/terraform.tfvars` (and in
the secrets vault first):

```hcl
mailgun_api_key    = "key-..."             # empty = email sending disabled
mailgun_domain     = "mg.example.com"      # a Mailgun sandbox domain works too
mailgun_from_email = "notifications@mg.example.com"
```

Leave `mailgun_api_key` empty and the whole leg ships **off**: the handler reads
a blank key as "not configured" and skips every send (it still writes the rows).
The domain and from-address are not secret and ride as plain Lambda env vars; the
key does not, because a Lambda env var is plaintext at rest, so the handler
fetches and decrypts it from SSM by parameter name at cold start.

**2. Build the zip, then apply.** The Lambda is still zip-deployed and
`infra/lambda.tf` reads that zip at plan time, so **build before apply**:

```bash
cd lambda
./build.sh                     # REQUIRED first: packages notification_processor.zip
cd ../infra
terraform apply                # + the mailgun SSM param, updated Lambda env + IAM
./scripts/deploy.sh            # rebuild :latest (unchanged backend contract)
```

`build.sh` now does more than `zip`. The handler gained one dependency
(`requests`, for the Mailgun HTTP call), and it is pure python, so `build.sh`
`pip install`s it into a build dir and zips it **alongside** `handler.py` (boto3
still ships with the runtime and is never vendored). The zip grows from a few KB
to roughly a megabyte as a result. Rebuild and re-apply whenever `handler.py` or
`requirements.txt` changes; the `source_code_hash` change triggers the redeploy.

**Try it end to end (on the deployed stack):** with a real `mailgun_*` set and a
recipient whose account email is a deliverable address (on a Mailgun sandbox
domain, an **authorized recipient**), have one user follow another. Within about
30 seconds the recipient gets both the in-app badge and an email copy. Open
**Settings → Notification settings → Email → Email copies**, turn it off, and the
next action produces the in-app row but no email. Watch the Lambda's CloudWatch
logs to see the decision: `Email sent successfully to ...`, `Email notifications
disabled for user ...`, `No email found for user ...`, or `Mailgun not
configured, skipping email send`.

## What's here (the step 12 delta)

```
lambda/
  notification_processor/handler.py  + the email leg: send_email_via_mailgun
                                  (Mailgun REST, basic auth, 200 = sent),
                                  get_user_email, send_notification_email, and a
                                  cold-start SSM fetch of the API key. The mute
                                  and email-opt-in checks now share ONE settings
                                  read per notification
  notification_processor/requirements.txt  requests (the one vendored dep)
  build.sh                        + pip-install requests into the zip
infra/
  ssm.tf                          + the mailgun-api-key SecureString (empty = off)
  variables.tf                    + mailgun_api_key (sensitive) / _domain / _from_email
  terraform.tfvars.example        + the three mailgun_* placeholders
  lambda.tf                       + MAILGUN_API_KEY_PARAM / _DOMAIN / _FROM_EMAIL env
                                  and an ssm:GetParameter grant on that one param
backend/
  app/models/notifications.py     + email_notifications on the settings models
  app/routes/notifications.py     + email_notifications in the GET defaults and the
                                  PUT allow-list (symmetric, unlike the source)
frontend/
  src/screens/NotificationSettingsScreen.tsx  + an Email section with an "Email
                                  copies" switch (NOT inverted: ON = copies on);
                                  the row + switch are now a shared ToggleRow
  src/services/api.ts             + email_notifications on the settings contracts
backend/tests/
  test_notification_settings.py   the settings route with email_notifications
  test_notification_email.py      the Lambda email leg, requests.post mocked
```

## The ideas this step plants

- **Email is best-effort, and best-effort means it can't fail the thing it
  decorates.** The send sits after the row write, inside its own try/except, and
  every failure path (opted out, no email, not configured, a non-200, a transport
  error) returns quietly. A mailer that can't reach Mailgun must never take the
  notification down with it.
- **A secret belongs in SSM, not a Lambda env var.** Lambda env vars are
  plaintext at rest, so the API key can't ride there the way the non-secret domain
  and from-address do. The handler fetches it from a SecureString once per cold
  start and caches it for the container's life, the same SSM idiom the App Runner
  backend already uses for its Clerk and Firecrawl keys.
- **Empty config is a first-class state, not a crash.** A blank key is the whole
  feature's off switch: no parameter, an empty value, or an SSM read error all
  resolve to "not configured", and the send path logs and skips. You can ship the
  step with email dark and light it up later by filling in one tfvar.
- **One read, many decisions.** A notification needs two facts from the user's
  settings row: which types they muted and whether they want email. The handler
  reads that row **once** and passes it to both checks, rather than fetching the
  same record twice per notification.

## Gotchas

- **Build vendors a dependency now.** `build.sh` is no longer a bare `zip` of
  `handler.py`; it `pip install`s `requests` into the package first. If you deploy
  a stale hand-zipped `handler.py` with no `requests` beside it, the Lambda
  cold-starts straight into `ImportError`. Always run `build.sh`.
- **Empty `mailgun_api_key` disables sending, silently and on purpose.** With no
  key the handler logs `Mailgun not configured, skipping email send` and moves on.
  That is the intended default, not a bug; a stack with email off is a valid ship.
- **The users key is `id`, not `user_id`.** The recipient's email is read from the
  users table keyed on `id`, while the settings table is keyed on `user_id`. Mixing
  them up is a silent `None` (and the `No email found` skip path), not an error.
- **Sandbox domains only mail authorized recipients.** A Mailgun sandbox domain
  refuses any recipient you haven't authorized in Mailgun, so an end-to-end test
  user's email has to be on that allow-list or the send comes back non-200. There
  is no sandbox-specific code here; it is purely which domain string you supply.

## Done when

- [ ] On a stack with real `mailgun_*` set, an action from one user produces both
      the in-app badge and an email copy for the recipient within ~30s.
- [ ] **Settings → Notification settings → Email → Email copies** turned off stops
      the email (the in-app row still appears); turned back on resumes it.
- [ ] With `mailgun_api_key` empty, notifications still write and the Lambda logs
      `Mailgun not configured, skipping email send` instead of sending.
- [ ] `pytest` is 32 green, including the settings round-trip and the three
      `requests.post`-mocked Lambda email tests.

Next: `13-events`, which adds the event notification types (`event_created`,
`event_invitation`) on top of the four social ones.
