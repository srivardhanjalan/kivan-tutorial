# Step 02 — App Shell & Design System

A fully themed, runnable app with **zero domain code**: the design tokens,
the glass chrome (floating fade-wash header + two glass tab pills), the
shared primitives every later screen uses, and config files that make the
app's identity a data change. No backend, no auth — it runs standalone in
Expo Go.

**The exact delta this step adds:**
[PR #5 — Files changed](https://github.com/srivardhanjalan/kivan-tutorial/pull/5/files)

## Run it

```bash
cd frontend
npm install
npm run ios      # or: npm run android (emulator from step 01's --android)
```

Expo installs Expo Go on the simulator automatically on first run.

## What's here

```
frontend/
  App.tsx                      providers + navigation container — nothing else
  src/config/
    app.ts                     name, deep-link scheme, and branding (the
                               logo + the mark the loading spinner animates)
    tabs.ts                    the tab bar as data: key, title, icons
  src/constants/
    Colors.ts                  palette (primary #FF385C, surfaces, text tiers)
    Typography.ts              type scale (largeTitle 30/700/-0.5, …)
    ScreenStyles.ts            spacing + chrome metrics (contentHorizontal 12,
                               chromePillHeight 60, tabIconSize 34, …)
    BorderRadius.ts, Shadows.ts
  src/components/
    TabNavigation.tsx          two glass pills, built FROM config/tabs.ts
    FloatingHeader.tsx         translucent fade-wash header (no blur, no edge)
    HeaderIconButton.tsx       44pt header action, pressed-fill affordance
    SectionHeader.tsx          section title + inline meta + optional action
    EmptyStateView.tsx         icon + title + subtitle empty state
    ToastProvider.tsx          bottom toasts (useToast().show(...))
    KivanLoader.tsx            branded loading spinner
    LoadingView.tsx            full-screen loading state
    layouts/FloatingHeaderLayout.tsx
                               the screen scaffold: safe area + header +
                               scroll content with the app-wide edges
  src/screens/
    PlaceholderScreen.tsx      one screen, five tabs — exercises the header,
                               section header, empty state, and toasts
```

## The two ideas this step plants

1. **Every visual decision is a token.** No screen ever hardcodes a color,
   size, or offset — they import from `constants/`. When step 07 builds real
   screens, they'll look like this shell because they can't look like
   anything else.
2. **The shell is domain-blind.** `TabNavigation` renders whatever
   `config/tabs.ts` declares; `PlaceholderScreen` renders whatever tab it's
   given. Nothing in this folder knows what a wishlist is — that's the
   jigsaw principle, enforced from the first line of code.

## Make it yours (5 minutes)

Rename the product without touching a component:

- `src/config/app.ts` → change `name`, `scheme`, and point
  `branding.logo` / `branding.spinnerLogo` at your own mark — every spinner
  and logo spot follows
- `src/config/tabs.ts` → retitle/re-icon the tabs (try `Notes`, `Trips`…)
- `app.json` → keep `name`/`scheme` in sync for the native shell

Reload — it's your app now.

## Done when

- [ ] The app boots in Expo Go with the splash, then five tabs
- [ ] Tab switches move the pressed pill fill and swap icon weights
- [ ] Each tab shows its own title in the floating header
- [ ] The ✨ header button fires a toast
- [ ] Scrolling isn't possible yet (placeholders are short) — but the header
      wash is visible over the status bar

## Gotchas

- **Port already in use** — running two steps' Metros at once? Add
  `--port 8083` to the start command.
- **Expo Go SDK drift** — Expo Go tracks the newest SDK; this project pins
  SDK 54 with a committed lockfile. If Expo Go moves ahead of it later,
  `npx expo install --fix` realigns the set.
- **Testing on a physical phone?** The scripts pass `--localhost`, which is
  ideal for simulators/emulators but unreachable from a real device — drop
  the flag (`npx expo start`) and stay on the same Wi-Fi.
- **`id={undefined}` on the navigator** — React Navigation v7's types
  require an explicit `id` even when you don't want one. Intentional.
- **Watchman** — pre-resolved: `metro.config.js` uses Metro's Node watcher
  (`useWatchman: false`), so a stale watchman daemon can't hang Metro here.
  Delete those lines if you prefer watchman on a big monorepo.

Next: `03-backend-core` — FastAPI + Terraform, and the first deploy.
