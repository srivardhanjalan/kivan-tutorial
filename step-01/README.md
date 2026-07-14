# Step 01 — Prerequisites

Everything your machine and your accounts need before any code runs. Two
parts: a script that handles the machine, and a short list of accounts no
script can create for you.

## 1. Run the setup script (5–20 minutes, mostly unattended)

```bash
./setup.sh
```

Idempotent and safe to re-run: it installs **only what's missing** and skips
the rest — including Homebrew itself if you've never installed it. It covers:

| Installs / verifies | Notes |
|---|---|
| Homebrew | via the official installer if absent |
| Xcode command line tools | triggers the macOS dialog if needed |
| Node.js 20+ | Metro/Expo runtime |
| Python 3.12 | **not 3.13+** — the pinned pydantic won't build there |
| Terraform | via the HashiCorp tap |
| AWS CLI | and verifies your credentials work |
| Docker + Colima + buildx + watchman | container tooling & file watcher |
| Rosetta 2 + the `colima rosetta` profile | **Apple Silicon:** App Runner images must build through Rosetta with the *docker* driver — QEMU and docker-container builders corrupt layers (builds pass locally, `CREATE_FAILED` on AWS). The script configures this correctly; step 03 explains it. |

It finishes by printing exactly what's still yours to do — which is the list below.

## 2. Things a script can't do for you

| # | What | When | How (exact steps) |
|---|---|---|---|
| 1 | **Xcode + iOS simulator** | step 02 | App Store → install Xcode → open once → Settings ▸ Components → install an iOS simulator runtime |
| 2 | **AWS account + credentials** | step 03 | [aws.amazon.com](https://aws.amazon.com) → create account → IAM ▸ Users ▸ create user → attach `AdministratorAccess` (fine for a tutorial account) → Security credentials ▸ create access key → run `aws configure`. **Cost:** ≈ $5–10/month while deployed (App Runner dominates); step 16 adds budgets + alarms, and `terraform destroy` stops all charges. |
| 3 | **Clerk application** (auth) | step 04 | [dashboard.clerk.com](https://dashboard.clerk.com) → Create application → toggle **Email** and **Google** on → API Keys: **Publishable key** → `frontend/.env.local`, **Secret key** → `infra/terraform.tfvars` |
| 4 | **Firecrawl API key** (scraping) | step 09 | [firecrawl.dev](https://firecrawl.dev) → sign up → copy the `fc-…` key → `infra/terraform.tfvars` |
| 5 | **Mailgun** *(optional — email)* | step 12 | [mailgun.com](https://mailgun.com) → sign up → Sending ▸ Overview: copy the **sandbox domain** and **API key** → `infra/terraform.tfvars` → Sending ▸ Authorized Recipients: add your own address. Sandbox only delivers to authorized recipients; for real delivery add a domain you own and publish its SPF/DKIM records. Leave keys empty to skip email — everything else works. |
| 6 | **Apple Sign-In** *(optional)* | step 04 | Needs the paid Apple Developer Program; step 04's README covers the App ID + key. Skip it — email/Google auth is complete without it. |

## Secrets hygiene

Secrets live in exactly two gitignored files, never in code:
`frontend/.env.local` (Clerk publishable key, API URL) and
`infra/terraform.tfvars` (Clerk secret, Firecrawl, Mailgun). Each step's README
shows the exact entries it needs.

## Done when

- [ ] `./setup.sh` finishes with **"Everything is ready"** (no remaining manual items)
- [ ] Xcode opens and an iPhone simulator boots
- [ ] `aws sts get-caller-identity` prints your account
- [ ] Clerk keys created (Firecrawl/Mailgun can wait until their steps)

Next: `step-02` — the app shell & design system.
