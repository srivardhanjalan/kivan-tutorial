# One Script to Set Up Everything

*Zero to Shipped · 01 — your machine, your accounts, and the Apple Silicon trap that eats evenings.*

---

![Zero to Shipped 01 — one script, everything ready](../mocks/mocks-hero-01.png)

Environment setup is where side projects go to die.

Not at the hard parts — nobody abandons an app because DynamoDB pagination got tricky. They abandon it on night one, forty minutes into a version conflict between tools they didn't choose, solving problems that have nothing to do with the thing they wanted to build. So this step has one goal: get all of that out of the way in a single evening, most of it while you make tea.

*(This is step 01 of **Zero to Shipped**, where we build a real social product — iPhone, iPad, Android, and a live AWS backend — one deployable step at a time. New here? **[Start with the introduction](https://medium.com/@srivardhanjalan/zero-to-shipped-2c13ce7e20e9)**. The code lives at [github.com/srivardhanjalan/kivan-tutorial](https://github.com/srivardhanjalan/kivan-tutorial); this post is the `01-prerequisites/` folder.)*

By the end, your machine can build and deploy everything in the series, and you'll know exactly what the cloud side costs: about **$5–10/month while deployed**, and `terraform destroy` stops every charge the moment you're done. No surprises later.

## One script does almost everything

```bash
cd 01-prerequisites && ./setup.sh
```

It's idempotent: it installs only what's missing and skips the rest, so you can re-run it any time. It covers Homebrew itself if you've never installed it, the Xcode command line tools, Node 20+, Python 3.12, Terraform, the AWS CLI, and Docker with Colima and watchman. It also checks your AWS credentials actually work, because "configured" and "working" are different claims. And on Apple Silicon it handles one more thing, which deserves its own paragraph.

**AWS App Runner only runs amd64 images, and on an M-series Mac the obvious ways of building them are broken.** QEMU emulation and docker-container builders produce images that build fine, run fine locally, and then die on AWS with `CREATE_FAILED` and empty logs. Nothing tells you why. I lost an evening to this; the script configures the one path that works (a Rosetta-backed Colima profile with the plain docker driver) so you don't have to know it exists. Step 03 tells the full story — it gets worse before it gets better.

Want Android too? One flag, no Android Studio:

```bash
./setup.sh --android
```

![The full Android toolchain, scripted — real setup.sh output](../mocks/mocks-01-android.png)

That's the JDK, the Android SDK, and a ready-to-boot Pixel 8 emulator named `kivan` (~2 GB, the only slow part). Afterward it's `emulator -avd kivan` and `npx expo run:android`. Nothing else in the series changes — same code, second platform.

When the script finishes, it prints exactly what's still yours to do. Which brings us to the honest part.

## The things a script can't do for you

![The six accounts, their steps, and their costs at a glance](../mocks/mocks-01-accounts.png)

Every tutorial has this list; most hide it. Six items, each with the exact clicks:

1. **Xcode + an iOS simulator** *(needed at step 2)* — install [Xcode from the App Store](https://apps.apple.com/app/xcode/id497799835), open it once, then Settings ▸ Components ▸ install an iOS simulator runtime. Apple's download servers are the real prerequisite test.
2. **An AWS account + credentials** *(step 3)* — [create an account](https://aws.amazon.com), add an IAM user with `AdministratorAccess` (fine for a tutorial account, and we say so out loud instead of pretending you'll write scoped policies today), create an access key, run `aws configure`.
3. **A Clerk application** *(step 4, free)* — the auth provider. Create an app at [dashboard.clerk.com](https://dashboard.clerk.com), toggle Email and Google on, and copy two keys into two gitignored files.
4. **A Firecrawl API key** *(step 9)* — [firecrawl.dev](https://firecrawl.dev) powers the in-app store scraping.
5. **[Mailgun](https://www.mailgun.com)** *(step 12, optional)* — a sandbox domain is enough to watch email notifications work; skip it entirely and everything else still runs.
6. **Apple Sign-In** *(step 4, optional)* — needs the paid [Apple Developer Program](https://developer.apple.com/programs/). Email + Google auth is complete without it; give Apple $99 only when you mean it.

## Secrets hygiene, from day one

Secrets live in exactly two gitignored files and nowhere else: `frontend/.env.local` (the Clerk publishable key and API URL) and `infra/terraform.tfvars` (the Clerk secret, Firecrawl, and Mailgun keys). Every step's README shows the exact entries it needs and nothing more. Boring, and boring is the entire point of secrets handling.

## You're done when

- `./setup.sh` shows a green ✓ for every tool — the only items it leaves you are the accounts above
- Xcode opens and an iPhone simulator boots
- `aws sts get-caller-identity` prints your account
- Your Clerk keys exist (Firecrawl and Mailgun can wait until their steps)

## What's next

In **step 02** we build the app shell and design system — a fully themed app with zero features, on purpose. It runs standalone with no backend at all, and it's where the series' central trick first pays rent: by the end of it, renaming the whole app to your own product is a config edit.

**Following along?** ⭐ [Star the repo](https://github.com/srivardhanjalan/kivan-tutorial) and follow me here so step 02 lands in your feed.

---

**Zero to Shipped — the series**

- **00 · [Introduction](https://medium.com/@srivardhanjalan/zero-to-shipped-2c13ce7e20e9)**
- **01 · One script to set up everything** *(this post)*
- **02 · Dressed to Ship** *(coming soon)*

*All code: [github.com/srivardhanjalan/kivan-tutorial](https://github.com/srivardhanjalan/kivan-tutorial)*
