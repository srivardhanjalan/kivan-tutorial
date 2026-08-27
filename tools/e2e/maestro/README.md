# Maestro UI E2E flows (`tools/e2e/maestro`)

Six [Maestro](https://maestro.mobile.dev) flows that drive the **17-polish**
Kivan app in an iOS simulator and assert its **visual components** — not just
navigation, but the cover bands, the wish masonry + glass price pill, the
notification badge + feed rows, the admin catalog surface, and the event
segmented toggle. They are the re-runnable form of the manual visual captures
from the close-out's Phase A.

## Why the flows live here (not in `17-polish/frontend/.maestro`)

The E2E harness is a **separate branch** (`step-17-e2e-harness`, stacked on
`step-17-polish`) so the app PR's tree stays exactly what ships. Putting these
flows under `17-polish/frontend/.maestro` would edit the app PR's folder; they
live under `tools/e2e/maestro` instead, alongside the backend-flow pytest suite,
and run against **any** Expo Go simulator that is serving the 17-polish app —
the flows never import app code, they only assert what the app renders.

## What they assert (one flow per leg)

| Flow | Leg | Visual components asserted |
|------|-----|----------------------------|
| `00-signin.yaml` | Sign in | cover-band Home header (display name + `Settings` gear overlay) + **All-Wishes rail** lead card |
| `01-wishlist-create.yaml` | Create wishlist w/ life event + cover preset | pinned CTA carries the life-event **emoji** (`🎂  Start Adding Wishes`); lands **inside** the new wishlist with its cover band + life-event name |
| `02-wish-add.yaml` | Add wish w/ photo | wish **masonry card** (tile) + **glass price pill** (`₹1,299`) |
| `03-notifications.yaml` | Notifications | bell **unread badge** (`2`), feed **card rows** (+ per-type icon, via the row), grouped **Notification Settings** cards |
| `04-admin.yaml` | Admin | Settings **Admin dashboard** row (admin-gated) + admin **catalog** dashboard rows |
| `05-event.yaml` | Event | event-detail **cover band** + **segmented toggle** (`Wishlists` / `Guests`) |

Element matching (Maestro): **`id:` = the RN `accessibilityLabel`** (this app
uses no `testID`s); plain strings match rendered `<Text>` / `TextInput`
placeholders. Icon-only controls (tab bar, the cover gear, header actions) are
targeted by `id:`; the notification per-type icon has no addressable text, so a
row's message text stands in for the row+icon composite.

## Prerequisites

1. **maestro CLI** — `curl -Ls https://get.maestro.mobile.dev | bash` (user-local,
   no sudo). Verify `maestro --version` (developed against 2.6.1).
2. **A booted iOS simulator running the 17-polish app in Expo Go**, i.e. a Metro
   server for `17-polish/frontend` and the app opened via `exp://<host>:8081`.
   The flows themselves issue `openLink: exp://localhost:8081`, so you only need
   Metro up and Expo Go installed on the sim.
3. **A pre-armed user.** Auth is **not** Maestro's job: the dev Clerk instance is
   in a require-MFA state the app's custom SignInScreen can't complete, so the
   SignInScreen (harness run only) accepts a Clerk **sign-in ticket** in the
   password field. The runner pre-arms the user with
   [`../scripts/mint_ui_user.py`](../scripts/mint_ui_user.py), which reuses the
   pytest harness's Backend-API client (`conftest`) — one source of truth for how
   this harness talks to Clerk. It prints `MAESTRO_E2E_EMAIL` /
   `MAESTRO_E2E_PASSWORD` (the ticket) for `maestro test --env`.

   The default target is the seeded **Vera Verify** fixture, whose notifications,
   wishlists (`Kitchen Upgrade`), and admin role the flows assert on. `--admin`
   also grants the global admin role (reusing `17-polish/infra/scripts/grant_admin.py`)
   so flow 04's Admin row is present.

## Run

One command runs the whole suite (pre-arm + all six flows):

```bash
export CLERK_SECRET_KEY=sk_test_...          # the instance the stack authenticates against
export E2E_ENVIRONMENT=s17v                   # the stack, for the --admin grant
export E2E_AWS_REGION=us-west-2

cd tools/e2e/maestro
PYTHON=/path/to/e2e-venv/bin/python ./run.sh  # $PYTHON needs tools/e2e/requirements.txt
```

`run.sh` pre-arms Vera (mints a fresh single-use ticket + grants admin), runs
`00-signin` with the credentials via `--env`, then runs `01`–`05` (which ride the
session Expo Go persists). To run one flow by hand:

```bash
maestro test 03-notifications.yaml
# 00 needs the credentials — mint them first:
eval "$(python ../scripts/mint_ui_user.py --admin --format env | sed 's/^/export /')"
maestro test 00-signin.yaml \
  --env MAESTRO_E2E_EMAIL="$MAESTRO_E2E_EMAIL" --env MAESTRO_E2E_PASSWORD="$MAESTRO_E2E_PASSWORD"
```

Each flow starts with `stopApp` + `openLink: exp://localhost:8081`, which
cold-starts the app into Expo Go and lands on Home — a deterministic reset that
makes the flows **order-independent** (`openLink` alone only foregrounds an
already-running app on whatever screen it was left on). Each flow calls
`takeScreenshot` into `artifacts-gitignored/` (gitignored — the shots are per-run
evidence, not source). The single-use ticket is consumed by `00-signin`.

## Notes / deviations

- **Selectors are accessibility labels, matched as *text*.** The app defines no
  `testID`s, so Maestro's `id:` (which maps to the iOS accessibility *identifier*)
  matches nothing here — every target is an `accessibilityLabel` or a rendered
  `<Text>`, matched as plain text. Icon-only controls (tab bar, cover gear, header
  actions) carry accessibilityLabels and are matched by those strings.
- **Collapsed children aren't addressable.** A control with an `accessibilityLabel`
  (a tab button, a wish card, an admin `CatalogRow`) is a *single* accessibility
  element; its child `<Text>`s are hidden from the tree. So: the tab-bar bell
  badge is asserted via the **NotificationsScreen** header unread pill instead;
  the wish's **glass price pill** text is captured in the masonry screenshot and
  its value (`₹1,299`) is asserted on the **wish detail** (a standalone `<Text>`);
  the admin "Storefronts & products" row is matched by its label
  `"Storefronts and products"` (the visible `&` title is a collapsed child).
- **Sign-in exercises a real auth even though Expo Go persists the session.**
  `00` signs out first (Home gear → Settings → Sign Out), then signs back in with
  the ticket, so the SignInScreen is genuinely driven. It tolerates an already
  signed-out start (a conditional sign-out).
- **Ticket, not password.** The password field carries a Clerk sign-in ticket
  (`signIn.create({ strategy: 'ticket' })`) — a server-authorized MFA bypass for
  the shared dev instance. This is a harness-run accommodation in the *deployed*
  frontend, not shipped app behavior.
- **`04-admin` asserts the admin catalog *menu*, not an image grid.** AdminHome
  is a glyph-led row menu; the image-forward catalog tiles are on the user-facing
  Wish Store. The admin dashboard's catalog surface is the
  Storefronts/Brands/Life-events/Users rows this flow asserts.
- **`02-wish-add` creates the wish without a photo.** The image field opens the
  native iOS image picker (`UIImagePickerController`, out-of-process) which is not
  reliably scriptable from Maestro here; the required visual assertions (masonry
  card + glass price pill) don't depend on the image.
- **`05-event` opens the date picker but may leave the date "TBD".** The iOS
  inline `UICalendarView` day cells aren't reliably addressable, so the day tap is
  best-effort; the event is created regardless, and Create returns to My Stuff
  (the flow then opens the new event's detail to assert the cover band + toggle).
- **`01-wishlist-create` self-cleans.** After asserting, it deletes the wishlist
  it created (detail trash → confirm) so re-runs don't accumulate — and, crucially,
  so preset-cover wishlists don't pile up and trip the **My Stuff grid rendering
  bug** below. `02`/`05` leave their wish/event; a full suite run appends one of
  each (delete them out-of-band if the stack must stay pristine).

## Bug surfaced by the harness (latent 17-polish defect, not fixed here)

Creating a wishlist with a **cover preset** stores its cover as `preset:<id>`
(e.g. `preset:sunset-bliss`). The wishlist **detail** and the Home **rail**
resolve that to a gradient correctly, but the **My Stuff wishlist grid** passes
the `preset:` value straight to `<Image>` and throws
`No suitable URL request handler found for preset:sunset-bliss` (a red-box in
dev; a broken image in prod). The grid's cover path doesn't resolve the preset
encoding the way `CoverPhoto` does. Flagged for the app PR; not fixed on this
harness branch (which must not edit 17-polish).
```
