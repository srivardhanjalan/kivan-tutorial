# Kivan — Build a Production Social-Wishlist App

**One codebase. iPhone, iPad, Android, and web.** Kivan is a real product, not
a toy example: create wishlists for life's moments, add wishes by browsing
real stores inside the app (prices scraped in any currency), follow friends,
plan events around wishlists with RSVPs and email invites, and get notified
in-app and by email — all on live AWS infrastructure you deploy yourself.

![Kivan end-user experience mocks](mocks/mocks.png)

*Every screen above is rendered from the app's real design tokens — the
liquid-glass chrome, adaptive tile rails that reshape from iPhone to iPad,
device-aware masonry, and the floating glass tab bar. Interactive version:
open [`mocks/index.html`](mocks/index.html) in a browser.*

**What you'll have built by the end:**

- A polished **Expo / React Native** app (iOS + iPad + Android + web) with a
  token-driven design system and adaptive layouts
- A **FastAPI** backend on **AWS App Runner** with JWKS-verified Clerk auth,
  just-in-time user provisioning, and DynamoDB single-table-per-feature design
- **Terraform** for the entire stack — ECR, App Runner, DynamoDB, S3 with a
  backend-owned photo lifecycle, SQS → Lambda notifications, Mailgun email,
  CloudWatch alarms, budgets
- An **admin dashboard**, deep-link sharing, and CI/CD references

## Why this tutorial is different: the jigsaw principle

The app is split into a domain-agnostic **platform** (shell & design system,
auth, profiles, media, social, notifications, sharing, admin, operations) and
swappable **domain modules** 🧩 (collections, storefronts, browser acquisition,
events). The modules plug into the platform like jigsaw pieces — `final/MODULES.md`
documents each piece's contract so you can replace *wishlists + wish stores*
with *notes*, *trips + destinations*, or any collection-shaped domain of your
own. You're not just building Kivan; you're building a platform you can reuse.

**How the repository works:**

- **One folder per step** (`step-01` … `step-16`), each a **complete, runnable,
  deployable snapshot**. You never need another folder to run a step.
- **One commit per step**, in order — the git history *is* the curriculum, and
  `git diff` between adjacent steps shows exactly what a feature costs.
- **`final/`** (last commit) is the complete application.
- **Zero bloat**: every step contains exactly the code that stage needs.

## The steps

| Step | You build | You can then |
|---|---|---|
| 01 | Prerequisites — run `./setup.sh` | verify your machine is ready |
| 02 | App shell & design system — config (name, scheme, theme, tabs), liquid-glass chrome, shared components | run a fully themed app standalone |
| 03 | Backend & infra core — FastAPI skeleton, Terraform (ECR, App Runner, monitoring base), the amd64 deploy loop | see the app talk to your live AWS backend |
| 04 | Auth & onboarding — Clerk sign-in/up (email, Google, Apple), JWKS verification, just-in-time user provisioning, roles foundation, first-run tutorial | create real accounts end-to-end |
| 05 | Profiles — profile data, birthday, Settings, account deletion | manage a real user profile |
| 06 | Media — S3 photos with backend-owned lifecycle (pending upload → claim on save → auto-expiry), profile & cover photos | upload photos safely, orphan-free |
| 07 | 🧩 Collections — wishlists & wishes, life-events, Home/My Stuff/detail/create screens | keep real wishlists |
| 08 | 🧩 Storefronts — curated stores with products | add wishes from a curated catalog |
| 09 | 🧩 Browser acquisition — brand directory, in-app browser, product scrapers, multi-currency prices | add wishes from real store websites |
| 10 | Social — follow graph, Discover, public profiles, loves | build your network |
| 11 | In-app notifications — SQS → Lambda pipeline, notification screens, per-type mutes | get notified about social activity |
| 12 | Email notifications — Mailgun delivery leg, per-user opt-in, delivery-time checks | receive email copies of notifications |
| 13 | 🧩 Events — gatherings around wishlists: RSVP, hosts, guest invites (incl. email invites for non-users), multi-photo galleries | see the full delta of integrating a feature into notifications & media |
| 14 | Sharing — `kivan://` deep links + the share-modal family | share wishlists, profiles, events |
| 15 | Admin — role enforcement + an admin dashboard (brands, life events, storefronts & products, users) | operate the app's catalog |
| 16 | Operations — CloudWatch alarms & dashboards, cost management, CI/CD references | run it like production |
| `final/` | The complete application | the finished product + `MODULES.md` |

## Prerequisites

### 1. Run the setup script (5–20 minutes, mostly unattended)

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

### 2. Things a script can't do for you

| # | What | When | How (exact steps) |
|---|---|---|---|
| 1 | **Xcode + iOS simulator** | step 02 | App Store → install Xcode → open once → Settings ▸ Components → install an iOS simulator runtime |
| 2 | **AWS account + credentials** | step 03 | [aws.amazon.com](https://aws.amazon.com) → create account → IAM ▸ Users ▸ create user → attach `AdministratorAccess` (fine for a tutorial account) → Security credentials ▸ create access key → run `aws configure`. **Cost:** ≈ $5–10/month while deployed (App Runner dominates); step 16 adds budgets + alarms, and `terraform destroy` stops all charges. |
| 3 | **Clerk application** (auth) | step 04 | [dashboard.clerk.com](https://dashboard.clerk.com) → Create application → toggle **Email** and **Google** on → API Keys: **Publishable key** → `frontend/.env.local`, **Secret key** → `infra/terraform.tfvars` |
| 4 | **Firecrawl API key** (scraping) | step 09 | [firecrawl.dev](https://firecrawl.dev) → sign up → copy the `fc-…` key → `infra/terraform.tfvars` |
| 5 | **Mailgun** *(optional — email)* | step 12 | [mailgun.com](https://mailgun.com) → sign up → Sending ▸ Overview: copy the **sandbox domain** and **API key** → `infra/terraform.tfvars` → Sending ▸ Authorized Recipients: add your own address. Sandbox only delivers to authorized recipients; for real delivery add a domain you own and publish its SPF/DKIM records. Leave keys empty to skip email — everything else works. |
| 6 | **Apple Sign-In** *(optional)* | step 04 | Needs the paid Apple Developer Program; step 04's README covers the App ID + key. Skip it — email/Google auth is complete without it. |

### Secrets hygiene

Secrets live in exactly two gitignored files, never in code:
`frontend/.env.local` (Clerk publishable key, API URL) and
`infra/terraform.tfvars` (Clerk secret, Firecrawl, Mailgun). Each step's README
shows the exact entries it needs.

## Working through the steps

```bash
cd step-01   # read its README, run ./setup.sh from the repo root
cd step-02   # each step: README first, then build & run
…
```

Every step from 03 onward ends with a deployable state: `terraform apply`,
push the backend image, run the app, and verify the step's checklist before
moving on. When something breaks, each README has a *Gotchas* section with the
failure modes we hit for real while building this.
