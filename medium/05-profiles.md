# Two Places at Once

*Zero to Shipped, step 5. Edit your name and the backend's copy goes stale; save a birthday and it loads back blank; delete your account and a naive flow leaves your login alive. One Settings screen fixes all three, and "delete" finally means delete.*

![Zero to Shipped 05 hero: the real Settings screen with a name, email, and birthday, beside a terminal where typing DELETE flags the record is_deleted and signing back in returns "Couldn't find your account"](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-hero-05.png?v=PLACEHOLDER)

## What we build

The app finally gets a Settings screen: change your name, set your birthday, delete your account. Drawing the screen is an afternoon. The work is underneath it, because every one of those edits touches data that lives in more than one place, and touching only one copy is a bug with a delay on it:

- **Your name lives in two stores.** Clerk owns your identity and greets you on Home; the backend keeps its own copy, the one every later feature reads. Write the edit to Clerk alone and that copy goes stale.
- **A saved birthday can load back blank.** The picker wheels carry unpadded values (`"1"`); a stored `"01"` matches none of them, so the wheels come up empty on a date that is clearly there.
- **A preference the client "saves" can vanish.** If the server never declares the field, it accepts the request and silently drops it, and the client believes it saved something.
- **A naive delete leaves you half-gone.** Flag the record first and a failed second step strands live credentials; trust an in-process cache and a deleted account keeps writing.

One decision answers all four: the backend record is the copy that matters, so every edit writes both stores, the server (not the screen) decides what is allowed to land, and deletion revokes Clerk first, then guards every future write at the table. Settings is also the first screen the app pushes over its tabs, so this is where the back button is born. The sections below build them in that order.

**What we need:** step 4 complete, including the record that JIT provisioning creates on first sign-in. The delete flow calls the Clerk Backend API, so the backend needs your Clerk secret key: run it locally with `python run.py`, or point the app at the step-3 deploy after a rebuild.

**Time:** about 45 to 75 minutes.

**The code:** the snippets below are shown as images; the full, copyable source lives in [PR #32: Files changed](https://github.com/srivardhanjalan/kivan-tutorial/pull/32/files), organized by the file paths in each caption.

## What we touch this step

Six files carry the work, across the backend and the app. Each build section below takes one area.

![What we touch this step, six files grouped by folder: the backend model, the users route, and provisioning; the frontend Settings screen, the API client, and the navigation stack; each file marked new or modified](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-05-filemap.png?v=PLACEHOLDER)

## Write to every store that reads

Here is the bug the app shipped in its first life. The obvious way to save a name is to write it to Clerk: Clerk owns your identity, it is what greets you on Home. So the original did exactly that, and stopped.

The trouble is the backend keeps its own copy of your name, written once when you first signed in and never touched again, because provisioning is create-only. Rename yourself and that copy goes stale the same instant, and nothing heals it. Every feature that reads the record instead of the live Clerk session would show the old name. No screen reads it yet, which is exactly why the bug is invisible now and expensive later, so we write both:

[![The name save, writing to Clerk and the backend record](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-05-code-writeboth.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/05-profiles/frontend/src/screens/SettingsScreen.tsx)

One extra line. Clerk greets you; the backend record is what the rest of the product reads, so the name has to land in both or the two quietly disagree.

![Save your name: one Save fans out to two independent stores, user.update() to Clerk and updateProfile() to the backend record; writing only the first leaves the record everything else reads stale](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-05-writeboth.png?v=PLACEHOLDER)

## Fix the birthday on both ends of the trip

The birthday is three picker wheels: day, month, year. Wire them to load a saved date and, done naively, they come up blank on a record that plainly holds `2000-01-01`.

Each wheel carries two parallel strings per row: a value the code compares against, and a label the user sees. We pad the label for display (`"01"`) but leave the value raw (`"1"`), because a padded value would never match the raw item the wheel was built from. Load a stored `"01"` straight in and it matches no value, so the wheel selects nothing. The fix lives on both ends of the round trip: we strip the zero-padding on load so each part matches a raw wheel value, and pad it back on save for storage. One `WheelColumn` component holds the raw-value / padded-label rule, so it lives in one place instead of three:

[![The birthday wheel: raw values, padded labels](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-05-code-wheel.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/05-profiles/frontend/src/screens/SettingsScreen.tsx)

Reopen Settings and the wheels land on the saved date, not an empty column.

![The Settings birthday picker open on the real device, its three wheels resting on 01, 01, 2000, the stored date loaded back correctly](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/shot-05-birthday.png?v=PLACEHOLDER)

## Let the model reject what the screen can't

The year wheel stops at the current year, which keeps the picker tidy, but that is a convenience, not a lock: nothing stops you scrolling to a later month inside this year, and a hand-rolled request skips the wheels entirely. The real guard rides on the model. We type the birthday as a `PastDate`, so any future date, however it arrives, comes back `422` instead of landing in the table.

The same model carries a quieter fix. There is a card on Home nudging you to add a birthday, and dismissing it should keep it gone. In the first version it returned every launch, because the client dutifully sent `birthday_prompt_dismissed: true` to a backend whose update model never declared the field. Pydantic did as it was told and dropped it: no error, no log, no persistence. Declaring the field is the whole fix:

[![The UserUpdate model: a PastDate birthday and the dismiss flag](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-05-code-model.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/05-profiles/backend/app/models/users.py)

The rule underneath both: if a client sends a field, prove the server keeps it, and let the model, not the screen, decide what is allowed to land.

## Delete an account for good

This is the part worth getting right, and it comes down to three decisions.

![The delete-account confirmation on the real device: a modal titled "Delete your account?", a DELETE text field, a red Delete Account button, and Keep my account](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/shot-05-delete.png?v=PLACEHOLDER)

**Keep the record, flag it.** We leave the record in place, because later steps will have wishlists and followers pointing at it, and a dangling reference is its own bug. Deletion sets an `is_deleted` flag and evicts the user from the in-process cache, so the very next request re-reads the record and meets the guard:

[![Flag the record, then forget the cached user](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-05-code-flag.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/05-profiles/backend/app/routes/users.py)

**Clerk first, then the flag.** Two calls delete you: removing the Clerk user, and flagging the record. Whichever runs second can fail, so the survivor has to be the harmless state. Flag the record first and a failed Clerk delete strands live credentials behind a record that says "gone," fixable only from a dashboard. Clerk first inverts it: the irreversible step goes first, so a failure there changes nothing and the user just retries.

**Guard the writes at the table, not in memory.** The backend caches which users it has seen, one cache per instance, to skip a lookup. A deleted user still sitting in one instance's cache could keep writing through it while the other instances have never heard of the deletion. So deletion only flags the record, and every mutating endpoint carries a condition DynamoDB re-checks on each write: the record must exist and not be flagged deleted. Reads re-fetch and catch the flag for free; a write cannot trust the cache, so the check rides on the write itself:

[![The active-record condition that every mutating write re-checks](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-05-code-guard.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/05-profiles/backend/app/routes/users.py)

A token minted seconds before you deleted your account bounces on both paths. Type `DELETE`, confirm, and the app signs you out. Sign back in with the same password and it answers in four words:

![The sign-in screen after deletion on the real device, a red banner reading "Couldn't find your account."](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/shot-05-blocked.png?v=PLACEHOLDER)

## What bit me

Four things cost me time on this step, worst first.

**I flagged the record before I deleted the Clerk user.** My first pass did the safe-sounding thing: mark the account deleted, then call Clerk. My reviewer asked the obvious question, what if the Clerk call fails? The record says "gone," but the credentials still sign in, and the only way to reconcile it is the Clerk dashboard. Swapping the order fixes it: delete the irreversible thing first, so a failure there leaves nothing changed and the user simply retries.

**A preference I "saved" went into a void.** Dismissing the birthday card sent `birthday_prompt_dismissed: true` on every dismiss, and the card came back every single launch. The backend's update model never declared the field, so Pydantic accepted the request and dropped it, with no error and no log. The client had been saving a preference into nothing. The rule I took from it is unglamorous and load-bearing: if a client sends a field, prove the server actually keeps it.

**The birthday wheels came up blank.** I wired them to load a saved date and got three empty wheels on a record that clearly held `2000-01-01`. The values were unpadded (`"1"`) and the stored date was padded (`"01"`), so nothing matched and the picker showed nothing. Strip the padding on load, re-pad on save, and keep that rule in the one component instead of scattering it across three.

**The back chevron looked indented.** Settings is the first screen the app pushes, so it is the first with a back button, and mine sat a few points inward of every section header below it. The chevron's tap target is 44 points wide, but the little glyph sits centered inside that box with padding around it, so aligning the box to the content edge indents the stroke. Pull the button left by that padding, plus the glyph's own inset, to land the stroke on the margin. Then the pulled button clipped its own pressed circle off the screen edge, so the back button drops the circle and presses with opacity instead.

## You're done when

- [ ] Rename yourself in Settings, go back to Home: the greeting is the new name, no restart.
- [ ] Set a birthday, reopen Settings: the wheels show the saved date, not blank.
- [ ] Dismiss the birthday prompt, force-quit and relaunch: it stays gone.
- [ ] Send a future birthday with a raw API call: it comes back `422` and never lands in the table.
- [ ] Type `DELETE`, confirm: the app signs you out, and signing in again fails with "Couldn't find your account."

## What's next

Step 6, Media: profile and cover photos on S3, with the backend owning the whole file lifecycle, a pending upload claimed on save and auto-expiring if you never save. Your avatar, handled as carefully as your account.
