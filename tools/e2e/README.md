# Backend-flow E2E harness (`tools/e2e`)

Re-runnable pytest that turns each step's proof list (steps 11–17, originally
verified by one-time agent runs whose only artifacts were PR comments — PRs
#92/#94/#96/#98/#100/#102) into code you can point at any deployed kivan stack
and run in one command.

Each `test_NN_*.py` mirrors one step's proven proofs. Tests are independent
(fresh uuid-suffixed entities, per-test teardown), talk to the **real** API over
HTTPS, mint **real** Clerk `+clerk_test` users for a real session JWT, and read
DynamoDB / CloudWatch directly (with your AWS profile) for evidence.

## What it needs

| Env var | Required | Meaning |
|---|---|---|
| `E2E_API_URL` | yes | Deployed App Runner base URL, e.g. `https://xxxx.us-west-2.awsapprunner.com`. **Unset ⇒ every e2e test skips cleanly** (a normal `backend/tests` unit run is untouched). |
| `CLERK_SECRET_KEY` | yes¹ | `sk_test_…` for the Clerk instance the stack authenticates against. Taken from your shell — never a file in the repo. |
| `E2E_ENVIRONMENT` | yes¹ | The stack's `ENVIRONMENT` prefix (e.g. `s17h`). Names the DynamoDB / CloudWatch / budget resources for the raw evidence reads. |
| `E2E_CLERK_FAPI_URL` | yes¹ | Clerk Frontend API base, e.g. `https://your-instance.clerk.accounts.dev`. Needed to mint a session JWT via FAPI sign-in. If unset, it is derived from `E2E_CLERK_PUBLISHABLE_KEY` (a public `pk_test_…`). |
| `E2E_AWS_REGION` | no | Region of the stack (default `us-east-1`). |
| `E2E_MAILGUN` | no | Set `1` only against a Mailgun-configured stack to run the live-send email leg (off ⇒ that one leg skips; the Mailgun-not-configured log-contract legs run instead). |

¹ Auth'd suites (11–15, 17) skip if any of these is missing; the boto3-only
step-16 suite needs only `E2E_ENVIRONMENT` + AWS creds.

Your AWS credentials (profile / env) must be able to read DynamoDB, CloudWatch,
budgets, SNS, IAM and to call `cloudwatch:SetAlarmState` (step 16 fires the
composite alarms synthetically).

## Run it

```bash
python -m venv /tmp/kivan-e2e && . /tmp/kivan-e2e/bin/activate
pip install -r tools/e2e/requirements.txt

# collection sanity — no stack needed, everything skips:
pytest tools/e2e --collect-only -q

# against a stack:
export E2E_API_URL=https://xxxx.us-west-2.awsapprunner.com
export E2E_ENVIRONMENT=s17h
export E2E_AWS_REGION=us-west-2
export CLERK_SECRET_KEY=sk_test_...            # from your shell / vault, not committed
export E2E_CLERK_PUBLISHABLE_KEY=pk_test_...   # or E2E_CLERK_FAPI_URL=https://...clerk.accounts.dev
pytest tools/e2e -m e2e

# one step at a time:
pytest tools/e2e -m step13
```

Every minted Clerk user is deleted at teardown automatically. Notification
arrivals are async (SQS→Lambda), so those tests poll the feed (≤45s) rather than
sleep.

## Deploy an isolated stack to run against

Use a unique `ENVIRONMENT` so nothing touches the shared/production stack, fresh
local terraform state, and a plan grep proving zero production matches:

```bash
git worktree add ~/.kivan-wt-e2e origin/step-17-polish     # durable worktree, keep its tfstate
cd ~/.kivan-wt-e2e/17-polish
cp ~/workspace/secrets-vault/kivan/infra/terraform.tfvars infra/terraform.tfvars   # gitignored
# set environment = "s17h", aws_region = "us-west-2" in that tfvars (never commit it)
(cd backend && ./lambda-or lambda/build.sh)                # build the lambda zip first
cd infra && terraform init && terraform plan -out tfplan
terraform show tfplan | grep -nE 'production|kivan-production' && echo "ABORT" || true   # expect no matches
terraform apply tfplan
# build+push the API image (colima-rosetta amd64) and let App Runner reach RUNNING
```

Then export the vars above (`E2E_API_URL` = the App Runner URL, `E2E_ENVIRONMENT`
= `s17h`) and run the suite.

## Tear down to zero

```bash
# empty the photos bucket first (destroy won't delete a non-empty bucket)
cd ~/.kivan-wt-e2e/17-polish/infra && terraform destroy
# sweep the App-Runner-created log groups (not TF-managed), confirm a tag query = 0
git worktree remove ~/.kivan-wt-e2e     # after destroy completes
```

The harness's own Clerk users delete themselves; there is no other residue it
creates beyond the entities each test removes in its `finally`.
