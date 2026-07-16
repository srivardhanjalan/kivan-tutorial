# Step 03 — Backend & Infra Core

The app leaves the simulator: a FastAPI skeleton, the Terraform that gives it
a home on AWS (ECR + App Runner + IAM + logs), and the deploy loop — ending
with the shell from step 02 showing a live **Backend · healthy** line fetched
from your own infrastructure.

**The exact delta this step adds:**
[PR #12 — Files changed](https://github.com/srivardhanjalan/kivan-tutorial/pull/12/files)

## Run it locally (no AWS needed yet)

Terminal 1 — the backend (any Python 3.11+; the Docker image runs 3.11):

```bash
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python run.py            # serves http://localhost:8000 (blocking)
```

Prefer container parity with production? Same Dockerfile App Runner runs
(from the step root, not from inside `backend/`):

```bash
docker build -t kivan-api backend && docker run -p 8000:8000 kivan-api
```

Terminal 2 — the app:

```bash
cd frontend
cp .env.example .env.local         # EXPO_PUBLIC_API_URL=http://localhost:8000
npm install
npm run ios
```

Every tab now shows **Backend · healthy** under its section header — the
app and your API are talking.

## Deploy it (the real thing)

App Runner can't start from an empty registry, so the first rollout is
staged: create the registry, push an image, create the service, then one
instant re-run to tag what App Runner self-created.

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars    # no secrets needed this step
terraform init
terraform apply -target=aws_ecr_repository.backend   # 1. registry first
./scripts/deploy.sh                                   # 2. build amd64 → push
terraform apply                                       # 3. everything else (~5 min)
./scripts/deploy.sh                                   # 4. re-run: tags the log
                                                      #    groups (cached, instant)

terraform output -raw apprunner_ecr_service_url       # → frontend/.env.local
```

`EXPO_PUBLIC_*` values are inlined at **bundle time** — after editing
`.env.local`, restart the dev server (`npx expo start -c --localhost`), a reload is not
enough. Then: the same **Backend · healthy** line, now served from AWS.

Every resource is tagged (`Project=kivan`, `Environment=…`) and thereby in
the stack's resource group (IAM roles are tagged too, though as global
resources they don't appear in the regional group's listing). One resource
can't be Terraform-managed: App Runner creates its two log groups itself —
`deploy.sh` tags them into the group and caps retention at 30 days.
`terraform destroy` removes the stack; sweep the log groups after:

```bash
aws logs describe-log-groups --log-group-name-prefix /aws/apprunner/kivan \
  --region us-east-1 --query 'logGroups[].logGroupName' --output text \
  | xargs -n1 aws logs delete-log-group --region us-east-1 --log-group-name
```

## What's here

```
backend/
  app/main.py        FastAPI app: gzip, CORS, `/` and `/health` (plus
                     FastAPI's built-in /docs)
  run.py             local dev server (uvicorn, hot reload)
  Dockerfile         python:3.11-slim; the image App Runner runs
  requirements.txt   fastapi + uvicorn — dependencies join with their features
infra/
  main.tf            ECR (+lifecycle policy), App Runner service (health-checked
                     on /health, auto-deploys :latest), two IAM roles, and a
                     resource group holding everything tagged Project=kivan
  variables.tf       region, environment, App Runner cpu/memory — only what
                     main.tf consumes
  outputs.tf         the service URL, ECR URL, service ARN, resource group
  terraform.tfvars.example   copy to terraform.tfvars (gitignored)
  scripts/deploy.sh  the amd64 build-push loop (see the gotcha below)
frontend/            step 02's shell plus:
  src/services/api.ts          the API root (EXPO_PUBLIC_API_URL) + fetchHealth
  src/components/ApiStatus.tsx the proof-of-life line on every placeholder tab
  .env.example                 copy to .env.local (gitignored)
```

## The idea this step plants

**The backend earns its dependencies the same way the frontend earns its
tokens.** No database, no auth middleware, no queue — `requirements.txt` is
two lines because the skeleton reads nothing else. App Runner's env vars are
`ENVIRONMENT` and `AWS_REGION` only; Clerk keys, bucket names, and queue URLs
join in the steps that consume them. Same rule, both sides of the wire.

## Gotchas

- **Apple Silicon: the build that only fails in production.** App Runner
  runs amd64 only. QEMU and docker-container builders produce images that
  build and even run locally, then die on AWS with `CREATE_FAILED` and no
  logs. `deploy.sh` works because step 01 configured the colima-rosetta
  docker context (plain docker driver through Rosetta). Verify before your
  first push: `docker context show` → `colima-rosetta`.
- **The same `CREATE_FAILED`, second cause: BuildKit attestations.** Newer
  Docker attaches provenance/SBOM manifests by default, turning the push
  into an OCI image *index* — App Runner can't CREATE a service from it
  (identical symptom: failure before the first log line; updating an
  existing service tolerates it, which makes it maddening to bisect).
  `deploy.sh` passes `--provenance=false --sbom=false`. We hit this for
  real while verifying this step.
- **`terraform apply` name collisions** — resource names embed
  `environment`; if you deploy twice (or already ran the finished app),
  change `environment` in `terraform.tfvars`.
- **Physical phone?** Two changes, not one: run Metro without `--localhost`
  (`npx expo start`, same Wi-Fi) so the phone can reach the bundler, and put
  a URL the phone can reach in `.env.local` (your Mac's LAN IP, or the App
  Runner URL).

## Done when

- [ ] `curl localhost:8000/health` → `{"status":"healthy"}`
- [ ] Every tab shows **Backend · healthy** (green)
- [ ] After the four-command rollout + `.env.local` + `expo start -c --localhost`: the
      same green line, served from AWS
- [ ] Stop the backend → cold-restart the app → **Backend · unreachable**
      (red, with the reason): the line is real, not decorative

Next: `04-auth` — Clerk sign-in/up, JWKS verification, and just-in-time
user provisioning.
