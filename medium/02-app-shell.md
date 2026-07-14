# The App With No Features

*Zero to Shipped · 02 — a fully themed app with zero domain code: design tokens, glass chrome, and a tab bar that's data.*

---

![Step 02 — the shell running (real simulator screenshots)](../mocks/mocks-hero-02.png)

This is step 02 of **Zero to Shipped**, a series where we build a real social product — iPhone, iPad, Android, and a live AWS backend — one deployable step at a time. New here? **[Start with the introduction](https://medium.com/@srivardhanjalan/zero-to-shipped-2c13ce7e20e9)**. The code lives at **[github.com/srivardhanjalan/kivan-tutorial](https://github.com/srivardhanjalan/kivan-tutorial)**; this post is the `02-app-shell/` folder, and [PR #2](https://github.com/srivardhanjalan/kivan-tutorial/pull/2/files) shows every line this step adds.

Today we build an app with **no features whatsoever** — and I'll argue it's the most important step in the series.

## Why start with an empty shell?

Because consistency isn't something you add later. Every app-store-quality product you admire has one property tutorials never teach: every screen looks like it was made by the same hands. That doesn't come from discipline — it comes from *making inconsistency impossible*. That's this step:

- **Every visual decision is a token.** Colors, type sizes, spacing, radii, shadows — all live in `src/constants/`. Screens import them; they never invent them. When we build eleven real screens in later steps, they'll look like one app because they *can't* look like anything else.
- **The chrome is shared, not copied.** One floating header, one screen layout, one tab bar — components every screen composes instead of re-implementing.
- **The app's identity is data.** The product's name, deep-link scheme, logo, and even the mark the loading spinner animates live in `config/app.ts`; the tab bar is literally an array in `config/tabs.ts`.

Run it:

```bash
cd 02-app-shell/frontend
npm install
npm run ios
```

No backend, no accounts, no API keys — it runs standalone in Expo Go.

## The pieces

### Design tokens

`src/constants/` is the whole visual language: `Colors.ts` (the `#FF385C` primary, surface tiers, text tiers), `Typography.ts` (a large-title scale — 30pt/700/-0.5 — down to captions), `ScreenStyles.ts` (the app-wide 12pt content edge, the 60pt chrome pill height, the 34pt tab icons), plus radii and shadows. Small files, boring on purpose — and the foundation everything else stands on.

### The chrome

Two signature moves you saw in the mocks:

- **The floating header** doesn't blur or draw an edge. It paints a translucent wash of the page background that eases out to nothing — content scrolling under the title stays visible, just lighter. (The Apple large-title treatment, without a `BlurView`.)
- **The tab bar** is two floating glass pills — main tabs on the left, search on its own pill on the right. Active tabs get a soft pressed fill and a filled icon variant.

### The tab bar is data

This is the jigsaw principle showing up on day one:

```ts
export const Tabs = [
  { key: 'HomeTab',          title: 'Home',          icon: 'home-outline',          iconActive: 'home' },
  { key: 'AddWishTab',       title: 'Wish Store',    icon: 'gift-outline',          iconActive: 'gift' },
  { key: 'MyStuffTab',       title: 'My Stuff',      icon: 'layers-outline',        iconActive: 'layers' },
  { key: 'NotificationsTab', title: 'Notifications', icon: 'notifications-outline', iconActive: 'notifications' },
] as const satisfies readonly TabConfig[];
```

`TabNavigation` renders whatever this array declares — it doesn't know what a wishlist is. The route-name union is *derived* from the config (`(typeof Tabs)[number]['key']`), so adding a tab types the whole navigator automatically.

Every tab mounts the same `PlaceholderScreen`, which exists to exercise the system end to end: the floating header with a working action button, a section header, an empty state, and a toast when you tap ✨.

## Make it yours in five minutes

The point of config-driven identity is that *renaming the product is a data change*:

1. `src/config/app.ts` — change `name: 'Kivan'`, `scheme: 'kivan'`, and point `branding.logo` / `branding.spinnerLogo` at your own mark — the animated loader rebrands itself
2. `src/config/tabs.ts` — retitle the tabs: `Notes`, `Notebooks`, `Shared`…
3. `app.json` — keep the native `name`/`scheme` in sync

Reload. Your app, your name, your tabs — and not one component file touched. Hold that thought for step 07, when the same trick swaps whole feature modules.

## Gotchas from the real run

- **Metro port conflicts** — running two steps at once? Add `--port 8083`.
- **Watchman can't hurt you here** — `metro.config.js` opts into Metro's Node file watcher (`useWatchman: false`); on a project this size watchman adds no speed, only a failure mode (a stale daemon hangs Metro at "Waiting for Watchman"). One config line deletes the whole problem.
- **Expo Go tracks the newest SDK** — this project pins SDK 54 with a committed lockfile, so `npm install` gives you the exact working set. If Expo Go itself moves ahead months from now, `npx expo install --fix` realigns everything.
- **Physical device instead of a simulator?** The npm scripts pass `--localhost` (immune to VPN/firewall weirdness on simulators); a real phone needs the LAN — run `npx expo start` without the flag, same Wi-Fi.
- **`id={undefined}` on the navigator** — React Navigation v7's types demand an explicit `id` even when you don't want one. It's deliberate; leave it.

## You're done when

- The app boots in Expo Go and shows five tabs in the glass pills
- Switching tabs moves the pressed fill and swaps outline → filled icons
- Each tab's title appears in the floating header
- The ✨ button fires a toast

## What's next

In **step 03** we leave the simulator: a FastAPI skeleton, Terraform for ECR + App Runner + monitoring, and the first real deploy — including the Apple Silicon Docker trap that fails only in production, and how the tutorial's build loop dodges it.

**Following along?** ⭐ [Star the repo](https://github.com/srivardhanjalan/kivan-tutorial) and follow me here so step 03 lands in your feed.

---

**Zero to Shipped — the series**

- **00 · [Introduction](https://medium.com/@srivardhanjalan/zero-to-shipped-2c13ce7e20e9)**
- **01 · [One script to set up everything](https://medium.com/@srivardhanjalan/one-script-to-set-up-everything-ae8bcea2d649)**
- **02 · The app with no features** *(this post)*
- **03 · Backend & infra core** *(coming soon)*

*All code: [github.com/srivardhanjalan/kivan-tutorial](https://github.com/srivardhanjalan/kivan-tutorial)*
