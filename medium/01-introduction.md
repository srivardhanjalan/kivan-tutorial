# Build a Production Social-Wishlist App — iPhone, iPad, Android, and Web from One Codebase (Part 1)

*A step-by-step series where every step is a complete, deployable app — and the finished product is a platform you can reuse for your own ideas.*

---

> **[IMAGE 1 — insert `mocks/mocks.png` here, full width. Suggested caption:]**
> *Every screen above is rendered from the app's real design tokens — the adaptive tile rails that reshape from iPhone to iPad, device-aware masonry, the translucent header wash, and the floating glass tab bar.*

Most mobile-app tutorials teach you a todo list. You follow along, it works, and then you hit the wall every tutorial quietly avoids: real authentication, real infrastructure, real money on a cloud bill, photos that orphan themselves in S3, notifications that need a queue, and an app store's worth of screens that have to feel consistent.

This series takes the opposite approach. We're going to build **Kivan** — a real social-wishlist product, end to end:

- Create wishlists for life's moments — birthdays, weddings, housewarmings, graduations
- Add wishes by **browsing real stores inside the app**, with prices scraped in any currency
- Follow friends, discover popular wishlists, love the ones you like
- Plan events around wishlists — RSVPs, co-hosts, guest invites by email, photo galleries
- Get notified in-app and by email
- Operate it all — an admin dashboard, CloudWatch alarms, budgets, CI/CD

One codebase. iPhone, iPad, Android, and web. Live AWS infrastructure that **you** deploy, understand, and can tear down with one command.

By the end of the series you'll have built:

- A polished **Expo / React Native** app with a token-driven design system and layouts that adapt from a phone to an iPad without a single hardcoded size
- A **FastAPI** backend on **AWS App Runner**, with JWKS-verified Clerk authentication and just-in-time user provisioning
- **Terraform** for the entire stack — ECR, App Runner, DynamoDB, S3 with a backend-owned photo lifecycle, an SQS → Lambda notification pipeline, Mailgun email, CloudWatch alarms, and cost budgets
- An admin dashboard, deep-link sharing, and a production operations setup

## Why this series is different: the jigsaw principle

Here's the part I care about most, and the reason this isn't "yet another clone tutorial."

The app is deliberately split into two kinds of code:

- A domain-agnostic **platform**: the app shell and design system, auth and onboarding, profiles, media handling, the social graph, notifications, sharing, admin, and operations. None of it knows what a "wishlist" is.
- Swappable **domain modules** 🧩: collections (wishlists and wishes), storefronts, in-app browser acquisition, and events.

The modules plug into the platform like jigsaw pieces, and the final step of the series documents each piece's contract. Swap *wishlists + wish stores* for *notes*, or *trips + destinations*, or any collection-shaped domain you can think of — and the platform (accounts, photos, follows, notifications, sharing, admin) comes along for free.

You're not just building Kivan. You're building a platform you'll reuse for your next three ideas.

## How the repository works

The GitHub repository is structured so that **the git history is the curriculum**:

- **One folder per step** (`step-01` through `step-16`). `step-01` sets up your machine and accounts; every folder from `step-02` on is a **complete, runnable, deployable snapshot** of the app at that stage. You never need another folder to run a step.
- **One commit per step**, in order — so `git diff` between two adjacent steps shows you *exactly* what a feature costs in code.
- **`final/`** is the finished application, including `MODULES.md` — the jigsaw contract documentation.
- **Zero bloat**: every step contains exactly the code that stage needs. No dead files, no "we'll use this later," no scaffolding you have to ignore.

Every step from 03 onward ends in a deployable state: `terraform apply`, push the backend image, run the app, verify the step's checklist. And every step's README has a *Gotchas* section — the actual failure modes I hit while building this, not hypothetical ones.

> **[LINK — insert the GitHub repository link here once the repo is public.]**

## The roadmap

Sixteen steps, four of them jigsaw modules 🧩:

1. **Prerequisites** — one setup script, and the short list of accounts a script can't create for you
2. **App shell & design system** — config-driven identity (name, scheme, theme, tabs), the glass chrome, shared components; a fully themed app that runs standalone
3. **Backend & infra core** — the FastAPI skeleton, Terraform for ECR + App Runner + monitoring, and the amd64 deploy loop (with the Apple Silicon trap explained)
4. **Auth & onboarding** — Clerk sign-in/up with email, Google, and Apple; JWKS verification; just-in-time user provisioning; the roles foundation; a first-run tutorial
5. **Profiles** — profile data, Settings, account deletion done properly
6. **Media** — S3 photos with a backend-owned lifecycle: pending upload → claim on save → auto-expiry. Your bucket never accumulates orphans
7. 🧩 **Collections** — wishlists & wishes, life events, and the Home / My Stuff / detail / create screens
8. 🧩 **Storefronts** — curated stores with products
9. 🧩 **Browser acquisition** — a brand directory, an in-app browser, product scrapers, multi-currency prices
10. **Social** — the follow graph, Discover, public profiles, loves
11. **In-app notifications** — an SQS → Lambda pipeline, notification screens, per-type mutes
12. **Email notifications** — the Mailgun delivery leg, per-user opt-in, delivery-time checks
13. 🧩 **Events** — gatherings around wishlists: RSVPs, hosts, email invites for people who don't have the app yet, multi-photo galleries. This step doubles as a demonstration: you'll see the *full* delta of integrating a new module into notifications and media
14. **Sharing** — `kivan://` deep links and the share-modal family
15. **Admin** — role enforcement plus a dashboard for brands, life events, storefronts, products, and users
16. **Operations** — CloudWatch alarms and dashboards, cost management, CI/CD references

Each step will get its own post in this series.

## Step 1 — get your machine ready

That's this post. Step 1 is the `step-01/` folder in the repository: a setup script plus a README with the short list of accounts no script can create for you. Work through it here (or in `step-01/README.md` — they're the same list), and you're done with Part 1 of the series.

### One script does almost everything

```bash
cd step-01 && ./setup.sh
```

It's idempotent — it installs **only what's missing** and skips the rest, so it's safe to re-run any time. It covers Homebrew itself (if you've never installed it), the Xcode command line tools, Node.js 20+, Python 3.12, Terraform, the AWS CLI (and verifies your credentials actually work), Docker + Colima + buildx + watchman, and — on Apple Silicon — Rosetta 2 with a correctly configured build profile.

That last one deserves a sentence, because it will save someone a lost evening: **AWS App Runner only runs amd64 images, and on Apple Silicon the obvious ways of building them are broken.** QEMU emulation and docker-container builders produce images that build fine locally and then fail on AWS with `CREATE_FAILED` and no logs. The script configures the one path that works — a Rosetta-backed Colima profile with the plain docker driver — and step 03 explains the why.

When the script finishes, it prints exactly what's still yours to do. Which is this list:

### The things a script can't do for you

1. **Xcode + an iOS simulator** *(needed at step 2)* — install Xcode from the App Store, open it once, then Settings ▸ Components ▸ install an iOS simulator runtime.
2. **An AWS account + credentials** *(step 3)* — create an account, create an IAM user with `AdministratorAccess` (fine for a tutorial account), create an access key, run `aws configure`. **Cost while deployed: roughly $5–10/month**, dominated by App Runner. Step 16 adds budgets and alarms, and `terraform destroy` stops all charges the moment you're done.
3. **A Clerk application** *(step 4, free)* — this is the auth provider. Create an app at dashboard.clerk.com, toggle Email and Google on, and copy two keys into two gitignored files.
4. **A Firecrawl API key** *(step 9)* — powers the product scraping.
5. **Mailgun** *(step 12, optional)* — a sandbox domain is enough to see email notifications work; skip it entirely and everything else still runs.
6. **Apple Sign-In** *(step 4, optional)* — needs the paid Apple Developer Program. Email + Google auth is complete without it.

### Secrets hygiene, from day one

Secrets live in exactly two gitignored files, never in code: `frontend/.env.local` (the Clerk publishable key and API URL) and `infra/terraform.tfvars` (the Clerk secret, Firecrawl, and Mailgun keys). Every step's README shows the exact entries it needs and nothing more.

## What's next

In **Part 2**, we build the app shell and design system — the config files that name the product, the design tokens every screen draws from, and the shared components that make eleven screens feel like one app. It runs standalone, with no backend at all, and it's where the jigsaw principle starts paying rent: by the end of it, renaming Kivan to your own product is a one-file change.

If you want to work ahead, the repository has everything: each step folder is self-contained, and the READMEs don't assume you've read these posts.

*— Srivardhan*

---

> **[SERIES NOTE — after publishing, add each subsequent part's link here as a numbered list, and back-link this post from every part.]**
