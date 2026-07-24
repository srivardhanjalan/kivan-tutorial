# Two Places at Once

*Zero to Shipped, step 5. A Settings screen that edits your profile without leaving a stale copy behind, and deletes your account for good.*

![Zero to Shipped 05 hero: the real Settings screen with a name, email, and birthday, beside a terminal where typing DELETE flags the record is_deleted and signing back in returns "Couldn't find your account"](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-hero-05.png?v=PLACEHOLDER)

*Step 05 of [**Zero to Shipped**](https://medium.com/@srivardhanjalan/zero-to-shipped-2c13ce7e20e9), a production social-wishlist app built one shippable step at a time on Expo, FastAPI, and AWS.*

*[All the code](https://github.com/srivardhanjalan/kivan-tutorial) is on GitHub, every step a runnable folder.*

## The problem

The app can sign you in, but not yet let you manage the account behind it: no way to fix your name, add a birthday, or leave. Step 5 adds a Settings screen that does all three. Drawing it is an afternoon; the data underneath is the work, because each of those edits has a quiet way to go wrong:

- **Your name lives in two stores.** Clerk greets you by it; the backend keeps the copy every later feature reads. Edit only Clerk and that copy goes stale.
- **A saved birthday loads back blank.** You set a date, reopen Settings, and the wheels come up empty on a record that plainly holds one.
- **A "saved" preference can vanish.** The client believes it saved the change; the server never kept it.
- **A naive delete leaves you half-gone.** A failed step can strand a live login behind a record that says "gone," and a stale cache can keep writing for an account that no longer exists.

## What we build

A Settings screen where those edits land honestly. A name edit writes both stores that hold it. A saved birthday round-trips through padding so it loads back onto the wheel, not blank. The backend, not the client, is the final word on what gets saved. And deleting your account revokes your Clerk login first, then guards every future write, so delete means delete. It is also the app's first pushed screen, so the back button is born here. The sections below build these one at a time.

**What we need:** step 4 complete, including the record that JIT provisioning creates on first sign-in. The delete flow calls the Clerk Backend API, so the backend needs your Clerk secret key: run it locally with `python run.py`, or point the app at the step-3 deploy after a rebuild.

**Time:** about 45 to 75 minutes.

**The code:** the snippets below are shown as images; the full, copyable source lives in [PR #32: Files changed](https://github.com/srivardhanjalan/kivan-tutorial/pull/32/files), organized by the file paths in each caption.

## What we touch this step

Six files carry the work, across the backend and the app. Each build section below takes one area.

![What we touch this step, six files grouped by folder: the backend model, the users route, and provisioning; the frontend Settings screen, the API client, and the navigation stack; each file marked new or modified](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-05-filemap.png?v=PLACEHOLDER)

## Write to every store that reads

Here is the bug the app shipped in its first life. The obvious way to save a name is to write it to Clerk: Clerk owns your identity, it is what greets you on Home. So the original did exactly that, and stopped.

The trouble is the backend keeps its own copy of your name, written once when you first signed in and never touched again, because provisioning is create-only. Rename yourself and that copy goes stale the same instant, and nothing heals it. Every feature that reads the record instead of the live Clerk session would show the old name. No screen reads it yet, so the bug is invisible now and expensive later. We write both:

[![The name save, writing to Clerk and the backend record](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-05-code-writeboth.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/05-profiles/frontend/src/screens/SettingsScreen.tsx)

One extra line, and the two stop disagreeing.

![Save your name: one Save fans out to two independent stores, user.update() to Clerk and updateProfile() to the backend record; writing only the first leaves the record everything else reads stale](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-05-writeboth.png?v=PLACEHOLDER)

## Fix the birthday on both ends of the trip

The birthday is three picker wheels: day, month, year. Wire them to load a saved date and, done naively, they come up blank on a record that plainly holds `2000-01-01`.

Each wheel carries two parallel strings per row: a value the code compares against, and a label the user sees. We pad the label for display (`"01"`) but leave the value raw (`"1"`), because a padded value would never match the raw item the wheel was built from. Load a stored `"01"` straight in and it matches no value, so the wheel selects nothing. The fix lives on both ends of the round trip: we strip the zero-padding on load so each part matches a raw wheel value, and pad it back on save for storage. One `WheelColumn` component holds the raw-value / padded-label rule, so it lives in one place instead of three:

[![The birthday wheel: raw values, padded labels](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-05-code-wheel.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/05-profiles/frontend/src/screens/SettingsScreen.tsx)

Reopen Settings and the wheels land on the saved date, not an empty column.

![The Settings birthday picker open on the real device, its three wheels resting on 01, 01, 2000, the stored date loaded back correctly](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/fig-05-birthday.png?v=PLACEHOLDER)

## Let the model reject what the screen can't

The year wheel stops at the current year, which keeps the picker tidy, but that is a convenience, not a lock: nothing stops you scrolling to a later month inside this year, and a hand-rolled request skips the wheels entirely. The real guard rides on the model. We type the birthday as a `PastDate`, so any future date, however it arrives, comes back `422` instead of landing in the table.

The same model carries a quieter fix. There is a card on Home nudging you to add a birthday, and dismissing it should keep it gone. In the first version it returned every launch, because the client dutifully sent `birthday_prompt_dismissed: true` to a backend whose update model never declared the field. Pydantic did as it was told and dropped it: no error, no log, no persistence. Declaring the field is the whole fix:

[![The UserUpdate model: a PastDate birthday and the dismiss flag](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-05-code-model.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/05-profiles/backend/app/models/users.py)

The two rules underneath: if a client sends a field, prove the server keeps it, and let the model, not the screen, decide what is allowed to land.

## Delete an account for good

This is the part worth getting right, and it comes down to three decisions.

![The delete-account confirmation on the real device: a modal titled "Delete your account?", a DELETE text field, a red Delete Account button, and Keep my account](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/fig-05-delete.png?v=PLACEHOLDER)

**Keep the record, flag it.** We leave the record in place, because later steps will have wishlists and followers pointing at it, and a dangling reference is its own bug. Deletion sets an `is_deleted` flag and evicts the user from the in-process cache, so the very next request re-reads the record and meets the guard:

[![Flag the record, then forget the cached user](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-05-code-flag.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/05-profiles/backend/app/routes/users.py)

**Clerk first, then the flag.** Two calls delete you: removing the Clerk user, and flagging the record. Whichever runs second can fail, so the survivor has to be the harmless state. Flag the record first and a failed Clerk delete strands live credentials behind a record that says "gone," fixable only from a dashboard. Clerk first inverts it: the irreversible step goes first, so a failure there changes nothing and the user just retries.

**Guard the writes at the table, not in memory.** The backend caches which users it has seen, one cache per instance, to skip a lookup. A deleted user still sitting in one instance's cache could keep writing through it while the other instances have never heard of the deletion. So deletion only flags the record, and every mutating endpoint carries a condition DynamoDB re-checks on each write: the record must exist and not be flagged deleted. Reads re-fetch and catch the flag for free; a write cannot trust the cache, so the check rides on the write itself:

[![The active-record condition that every mutating write re-checks](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-05-code-guard.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/05-profiles/backend/app/routes/users.py)

A token minted seconds before you deleted your account bounces on both paths. Type `DELETE`, confirm, and the app signs you out. Sign back in with the same password and it answers in four words:

![The sign-in screen after deletion on the real device, a red banner reading "Couldn't find your account."](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/fig-05-blocked.png?v=PLACEHOLDER)

## What bit me

Four things cost me time on this step, worst first.

**I flagged the record before I deleted the Clerk user.** My first pass marked the account deleted, then called Clerk, so the irreversible step ran second. I had it backwards: the irreversible one has to go first, or a failed call strands a live login behind a record that says gone. I swapped them.

**A preference I "saved" went into a void.** I dismissed the birthday card, and it came back on the very next launch, and the next. The server had never been told to keep that field, so every dismissal saved into nothing. One line on the model fixed it.

**The birthday wheels came up blank.** I wired them to load a saved date and got three empty wheels on a record that clearly held `2000-01-01`. The stored value was padded and the wheels were not, so nothing matched. Stripping the padding on load fixed it.

**The back chevron looked indented.** Settings is the first screen the app pushes, so it is the first with a back button, and mine sat a few points inward of every section header below it. The chevron's tap target is 44 points wide, but the little glyph sits centered inside that box with padding around it, so aligning the box to the content edge indents the stroke. Pull the button left by that padding, plus the glyph's own inset, to land the stroke on the margin. Then the pulled button clipped its own pressed circle off the screen edge, so the back button drops the circle and presses with opacity instead.

## You're done when

- [ ] Rename yourself in Settings, go back to Home: the greeting is the new name, no restart.
- [ ] Set a birthday, reopen Settings: the wheels show the saved date, not blank.
- [ ] Dismiss the birthday prompt, force-quit and relaunch: it stays gone.
- [ ] Send a future birthday with a raw API call: it comes back `422` and never lands in the table.
- [ ] Type `DELETE`, confirm: the app signs you out, and signing in again fails with "Couldn't find your account."

## What's next

Step 6, Media: profile and cover photos on S3, with the backend owning the whole file lifecycle, a pending upload claimed on save and auto-expiring if you never save. Your avatar, handled as carefully as your account.

---

**Zero to Shipped: the series**

- **00 · [Introduction](https://medium.com/@srivardhanjalan/zero-to-shipped-2c13ce7e20e9)**
- **01 · [One script to set up everything](https://medium.com/@srivardhanjalan/one-script-to-set-up-everything-ae8bcea2d649)**
- **02 · [Dressed to Ship](https://medium.com/@srivardhanjalan/dressed-to-ship-1e2591179d8a)**
- **03 · [Alive on Arrival](https://medium.com/@srivardhanjalan/alive-on-arrival-cda0a351844f)**
- **04 · [Signed, Sealed, Delivered](https://medium.com/@srivardhanjalan/signed-sealed-delivered-a481a02ac392)**
- **05 · Two Places at Once** (you are here)
- **06 · Photos Without the Exposure** (coming soon)

**[All the code on GitHub](https://github.com/srivardhanjalan/kivan-tutorial)**
