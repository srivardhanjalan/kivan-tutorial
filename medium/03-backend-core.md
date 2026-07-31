# Alive on Arrival

*Zero to Shipped, step 3. A FastAPI backend live on your own AWS in four commands, torn down to zero spend when you're done, and the two ways an image that runs on your laptop still arrives dead on App Runner.*

![Zero to Shipped 03 hero: the app showing a green Backend healthy line beside a terminal running the staged rollout, ending in the App Runner service creation complete and curl returning status healthy](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-hero-03.png?v=PLACEHOLDER)

*Zero to Shipped, step 3 of a production social-wishlist app built one shippable step at a time on Expo, FastAPI, and AWS.*

*[All the code](https://github.com/srivardhanjalan/kivan-tutorial) is on GitHub, every step a runnable folder.*

## The problem

The app has been a shell. Real screens, real navigation, and nothing behind them: every tab reads "coming soon" because there is no server to ask. This step gives the app a backend of its own, a FastAPI service running on AWS infrastructure you control. Writing the skeleton is the easy part. Getting it live, clean, and honest is the work, because it is four problems at once:

- **A cloud stack leaves orphans.** Click a resource into the console and it is untagged, ungrouped, and billed long after you think you tore it down.
- **The service can't boot from nothing.** App Runner needs an image before it will create the service, but the image needs a registry that does not exist yet.
- **An image that runs on your laptop can die on AWS.** It builds, it runs locally, and App Runner rejects it with a bare failure and no logs to say why.
- **A green status has to be earned.** The app should prove it reaches the backend, and say why when it can't, not just show a hopeful dot.

## What we build

A FastAPI backend deployed to your own AWS, every resource tagged into one group, torn down with `terraform destroy` plus one sweep for the two log groups App Runner writes on its own. Five moves get us there.

We start with a skeleton that earns its dependencies: `main.py` only assembles, each route lives in its own file, and `requirements.txt` is two lines because the app reads nothing else yet. The stack lives in Terraform, one file per concern, and the provider stamps `Project` and `Environment` on every resource, so a single tag query lists the whole thing and proves when it is gone. That closes the orphan problem. The first rollout is staged into four commands, registry first and the service last, so App Runner never looks at an empty registry. The build runs one specific way, amd64 with attestations off, which is the difference between an image that boots on AWS and one that dies there. And the app grows a proof-of-life line: a green Backend healthy when it reaches the API, a red Backend unreachable with the reason when it can't.

What this step is not: there is no database, no auth, no queue. Those arrive with the steps that consume them (sign-in is step 4).

**What we need:** step 2 complete, an AWS account, and the Docker, Terraform, and AWS CLI that step 1's setup installed (including the colima-rosetta Docker context). No secrets this step.

**Time:** about 45 to 60 minutes, most of it the first deploy.

**The code:** the snippets below are shown as images; the full, copyable source is the [step folder on `main`](https://github.com/srivardhanjalan/kivan-tutorial/tree/main/03-backend-core), organized by the file paths in each caption. [PR #16: Files changed](https://github.com/srivardhanjalan/kivan-tutorial/pull/16/files) is the build's story, with a follow-up in PR #21 tightening the ECR pulls to this one repository and dropping a credentialed wildcard CORS.

## What we touch this step

Nineteen files carry the work, across the backend, the app, and the infra. Each build section below takes one area.

![What we touch this step, nineteen files grouped by folder: the backend FastAPI skeleton (health route, main assembler, run, Dockerfile, requirements), the frontend proof-of-life line (api, ApiStatus, placeholder screen, Colors.ts, env example), and the infra one file per concern (ecr, apprunner, iam, providers, resource-group, variables, outputs, tfvars example, deploy.sh); each file marked new or modified](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-03-filemap.png?v=PLACEHOLDER)

## Give the backend a skeleton, not a framework

The skeleton is bare on purpose: one health route, and an assembler that includes it. That single route is all App Runner needs to health-check, and all the app needs to prove it can reach the backend.

[![The health route in its own file: GET /health returns status healthy](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-03-code-health.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/03-backend-core/backend/app/routes/health.py)

`main.py` does nothing but assemble: it creates the app, adds gzip and CORS middleware, and includes the router. Routes never live in `main.py`; each domain gets its own file under `app/routes/`, so the structure that will hold every later router already holds this one. The CORS origin is a wildcard, and that is safe here on purpose: nothing is cookie-authenticated yet (the Bearer token arrives in step 4), so an open origin has no credentials to leak. `requirements.txt` is two lines, FastAPI and Uvicorn.

## Describe the stack in Terraform, one file per concern

Everything the backend runs on is code in the `infra/` folder, and the first rule is that no resource is ever born in the console. A console-created resource is untagged and ungrouped, which means it survives `terraform destroy` and quietly bills you. So the provider stamps a `Project` and `Environment` tag on every resource it makes:

[![The AWS provider with default_tags, stamping Project and Environment on every resource](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-03-code-providers.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/03-backend-core/infra/providers.tf)

Those tags feed `resource-group.tf`, a group defined by one query: everything tagged `Project=kivan`. One console page then shows your whole stack.

The registry comes next. App Runner pulls the backend image from ECR, so `ecr.tf` creates the repository and a lifecycle rule that keeps only the last ten images, so old builds do not pile up:

[![The ECR repository and a lifecycle rule that keeps only the last ten images](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-03-code-ecr.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/03-backend-core/infra/ecr.tf)

Then the service itself. `apprunner.tf` points App Runner at `:latest` in that registry, turns on auto-deploy so a new push rolls out on its own, and health-checks the container on `/health`, the exact route the skeleton serves:

[![The App Runner service pointed at :latest, auto-deploying, health-checked on /health](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-03-code-apprunner.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/03-backend-core/infra/apprunner.tf)

## Give App Runner the smallest key that works

App Runner needs to pull images, and the lazy grant is `ecr:*` on `"*"`. We don't. The role gets exactly two things: permission to fetch a registry login token, which genuinely has to be account-wide, and permission to pull images from this one repository, named by ARN. Nothing else.

[![The ECR-access policy: a login token account-wide, image pulls scoped to one repository by ARN](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-03-code-iam.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/03-backend-core/infra/iam.tf)

The split matters. `ecr:GetAuthorizationToken` issues the login and cannot be scoped to a repository, so it takes `"*"`; every other action is pinned to `aws_ecr_repository.backend.arn`. If this role ever leaks, it can read one repository's images, not touch your whole account.

## Let the app prove it can reach the backend

A backend you can't see from the app is a backend you can't trust. So step 2's shell grows one honest line under each tab header. It calls `/health` on startup and reports what happened.

[![The API root: reads EXPO_PUBLIC_API_URL from .env.local, resolves on /health, rejects with a readable reason](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-03-code-api.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/03-backend-core/frontend/src/services/api.ts)

`api.ts` holds the whole contract. It reads `EXPO_PUBLIC_API_URL` from the gitignored `.env.local` (your localhost while developing, your App Runner URL once deployed) and resolves only when `/health` answers. When it can't, it rejects with a human-readable reason, and the `ApiStatus` line renders that reason in red. The caller shows the line; `api.ts` owns the diagnosis, so the app never shows a vague failure.

Run the backend locally with `cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt && .venv/bin/python run.py`, point `.env.local` at `http://localhost:8000`, and every tab turns green. Miss that `.env.local` on a fresh checkout, or kill the backend and cold-restart, and the same line turns red and names the exact reason.

![The proof-of-life line in the real app: a green Backend healthy when the API answers on localhost, and a red Backend unreachable naming the missing EXPO_PUBLIC_API_URL on a fresh checkout before .env.local exists](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-03-proof.png?v=PLACEHOLDER)

## Deploy it

Now the real thing, on AWS. The first rollout is staged because of a chicken-and-egg: App Runner will not create a service from a registry with no image in it. So we build the registry, push an image into it, and only then create the service:

[![Four commands, one first rollout: prep lines to cd into infra, copy the tfvars example, and terraform init, then the four numbered commands, apply the ECR repository first, deploy.sh to build and push the image, apply the service, and deploy.sh once more to tag the log groups](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-03-code-rollout.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/tree/main/03-backend-core/infra)

Step 2 there runs `deploy.sh`, the one part of the deploy with a strong opinion. It builds the image for `linux/amd64` (App Runner runs amd64 only) with BuildKit's attestations turned off, then pushes it. App Runner auto-deploys the new `:latest`:

[![deploy.sh: log in to ECR, docker build for linux/amd64 with provenance and sbom off, docker push](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-03-code-deploy.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/03-backend-core/infra/scripts/deploy.sh)

The fourth command is that same `deploy.sh`, run once more after the service exists. App Runner creates two log groups itself, named with a service ID that does not exist until the service does, so Terraform can't own them; the re-run tags them into the resource group and caps their retention at 30 days. Grab the service URL from `terraform output`, put it in `.env.local`, restart Expo, and the green line is now served from AWS. When you're done, `terraform destroy` removes the stack; sweep those two log groups after, and a tag search finds nothing left.

## What bit me

Two things cost me real time on this step, worst first.

**`CREATE_FAILED`, empty logs, and the image was innocent.** My first deploy on this step waited three minutes on `terraform apply`, then returned a bare `CREATE_FAILED` with an empty log group: the container never printed a line. The same image had built and run fine on my Mac. The cause was BuildKit. Newer Docker attaches a provenance attestation manifest to a push by default, which turns the image into an OCI index; updating an existing service tolerates that, but creating one does not, and it fails before the first log line, so there is nothing to read. Provenance is the default culprit; the deploy pins `--provenance=false --sbom=false` to keep every attestation manifest out of the push (SBOM is opt-in rather than default, but the flag keeps it out too), which brought the service up `RUNNING` on identical application code. I had been hunting a bug in code that was never wrong. (There is a second, separate way to earn this exact failure: a QEMU-built amd64 image on Apple Silicon. Step 1's colima-rosetta context is what keeps us clear of it, and it is why `deploy.sh` builds there.)

**The green line that stayed red after I pointed it at AWS.** I deployed, put the App Runner URL in `.env.local`, reloaded the app, and the status line kept hitting localhost. `EXPO_PUBLIC_*` values are inlined at bundle time, not read at runtime, so a hot reload never picked up the new URL. Restarting the dev server with `npx expo start -c --localhost` (the `-c` clears the cache) was the fix, and the line went green against AWS.

## You're done when

- [ ] `curl localhost:8000/health` returns `{"status":"healthy"}`.
- [ ] Every tab shows a green Backend healthy line, first against localhost.
- [ ] After the four-command rollout and pointing `.env.local` at the App Runner URL (with `npx expo start -c --localhost`), the same green line is served from AWS.
- [ ] Stop the backend, cold-restart the app, and the line turns red with the reason.
- [ ] `terraform destroy` plus the log-group sweep leaves no resource behind: a tag search finds nothing.

## What's next

Step 4, Signed, Sealed, Delivered: the app gets real users. Clerk sign-in with Apple, Google, or email, tokens the backend verifies against Clerk's JWKS, and a user record the backend writes for you the first time it sees a valid token, never one the phone is allowed to create.

---

**Zero to Shipped: the series**

- **00 · [Introduction](https://medium.com/@srivardhanjalan/zero-to-shipped-2c13ce7e20e9)**
- **01 · [One script to set up everything](https://medium.com/@srivardhanjalan/one-script-to-set-up-everything-ae8bcea2d649)**
- **02 · [Dressed to Ship](https://medium.com/@srivardhanjalan/dressed-to-ship-1e2591179d8a)**
- **03 · Alive on Arrival** (you are here)
- **04 · [Signed, Sealed, Delivered](https://medium.com/@srivardhanjalan/signed-sealed-delivered-a481a02ac392)**
- **05 · [Two Places at Once](https://medium.com/@srivardhanjalan/two-places-at-once-1e00bb46354b)**
- **06 · [Photos Without the Exposure](https://medium.com/@srivardhanjalan/photos-without-the-exposure-96e9acf11db3)**
- **07 · Whose Wish Is It Anyway?** (coming soon)

**[All the code on GitHub](https://github.com/srivardhanjalan/kivan-tutorial)**
