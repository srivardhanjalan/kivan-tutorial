# Handle With Care

*Zero to Shipped · 05 — a Settings screen that edits you in two places at once, a birthday picker with a history, and account deletion that actually deletes.*

---

![Zero to Shipped 05 hero — the Settings screen and the terminal proof that a deleted account is flagged, locked out, and gone from Clerk](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-hero-05.png?v=PLACEHOLDER)

My app can forget me now. This step I gave it a Settings screen: change your name, set your birthday, and delete your account for good. The screen itself took an afternoon. The two boring-sounding things underneath it were the real work — keeping your name in sync, which the app's first life quietly got wrong, and deleting you so you're *actually* gone, which was new this step and just as easy to botch.

*(This is step 05 of **Zero to Shipped** — building a production social-wishlist app on Expo, FastAPI, and AWS. New here? **[Start with the introduction](https://medium.com/@srivardhanjalan/zero-to-shipped-2c13ce7e20e9)**. The code is the `05-profiles/` folder; [PR #32](https://github.com/srivardhanjalan/kivan-tutorial/pull/32/files) shows every line this step adds.)*

## The first thing the app ever pushes

Until now the app has been a tab bar and a swap between two auth screens. Settings is the first screen it *pushes* — a stack navigator over the tabs — so this is where the back button is born. I'd left a comment in step 04 promising the stack would "join when a later step first pushes a real screen." This is that step; the comment gets to come true.

There's a small design tax I paid twice here, both caught while I clicked around my own build. The back chevron sits at the screen edge, and my first version floated it a few points inward, misaligned with every section header below it. The original build had already solved this, and I'd dropped the trick in the port. The chevron's tap target is 44 points wide, but the little arrow glyph sits centered inside that box with empty padding around it. Align the box to the content edge and the glyph looks indented. So you pull the button left by the padding:

```tsx
// land the chevron's stroke on the content edge, not its 44pt box
marginLeft: -((TOUCH_TARGET - GLYPH_SIZE) / 2) - GLYPH_INSET,
```

Then the pulled button clipped its own pressed-circle off the edge of the screen, so the back button stopped being the standard header icon entirely: it keeps the 44-point tap target but presses with opacity, no circle to clip.

## Write to every store that reads

Here's the bug I inherited without noticing. The obvious way to save a name edit is to write it to Clerk — Clerk owns your identity, it's what greets you on the Home screen. So the original app did just that, and stopped there.

The problem: my backend keeps its own copy of your name, provisioned once when you first sign in. Write the edit to Clerk only, and that backend copy goes stale the instant you rename yourself — and nothing ever heals it, because provisioning is create-only. Any feature that reads the record instead of the live Clerk session would show the old name.

So the save writes to both:

```typescript
// Clerk greets you; the backend record is the copy later steps read
await user?.update({ firstName, lastName });
await updateProfile({ first_name: firstName, last_name: lastName });
```

One extra line. If two places hold the same fact, an edit that touches only one of them is a bug with a delay on it — and the backend's copy is the one you can't watch go wrong from the app. No screen reads it yet, so writing it now is insurance for the steps that will.

## Padding is data

![Two real screenshots — the Settings screen with a name, email, and birthday, and the delete-account confirmation modal](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-05-account.png?v=PLACEHOLDER)

The birthday is three picker wheels — day, month, year. When I first wired them to load a saved date, the wheels came up blank: no selection, even though the record clearly held `2000-01-01`.

The wheel's *values* were unpadded strings (`"1"`, `"2"`), while its *labels* were padded for display (`"01"`, `"02"`). Load a saved `01` back in and it doesn't match any wheel value, because the values are `1`, not `01`. The picker shrugs and shows nothing. So the fix lives on both ends of the round trip: the load path strips the zero-padding before it touches the wheels, and the save re-pads it for storage.

```tsx
// load: strip padding so a stored "01" matches the wheel's raw "1"
[year, month, day] = birthday.split('-').map((s) => String(parseInt(s, 10)));
// save: pad it back for the record
const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
```

And the three wheels are one component, so that raw-value/padded-label rule lives in one place instead of three.

The year wheel stops at the current year, which keeps the picker from wandering into next decade — but it doesn't actually close the door. Nothing stops you scrolling to a later month inside this year, and a hand-rolled API call bypasses the wheels entirely. So the real guard lives on the model, not the UI: the update model types the birthday as a `PastDate`, and any future date — however it arrives — comes back `422` instead of landing in the table.

## The dismissal that never happened

There's a card on Home nudging you to add your birthday. Dismiss it, and it should stay gone. In the original it came back every launch, and the reason is a small horror story about trusting a client.

The app dutifully sent `birthday_prompt_dismissed: true` to the backend on every dismiss. The backend's update model didn't *have* that field. Pydantic, doing just what it's told, silently dropped it. No error, no log, no persistence — the client believed it had saved a preference into a void. This step ships the version that actually remembers, because the field now exists on the backend's update model — the one line the original never declared:

```python
class UserUpdate(BaseModel):
    ...
    birthday_prompt_dismissed: Optional[bool] = None  # client sends this on every dismiss
```

The rule I took from it is unglamorous and load-bearing: if a client sends a field, prove the server actually keeps it.

## Deleting you properly

This is the part I cared about, and it comes down to three decisions.

![Terminal — the DELETE /users/me flow: Clerk deleted first, the record flagged not purged with a table-level guard, and every later request 403'd](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-05-delete.png?v=PLACEHOLDER)

**One: keep the record, flag it.** The record stays put, because later steps will have wishlists and followers pointing at it, and dangling references are a bug of their own. Deletion sets an `is_deleted` flag and leaves everything else where it was.

**Two: Clerk first, then the flag.** I got this backwards on my first pass, and my reviewer caught it. Whichever call fails, you want the leftover state to be the harmless one. Flag the record first and *then* delete the Clerk user, and a failed delete strands live credentials behind a record that says "gone" — fixable only from a dashboard. Clerk first inverts it: the irreversible step goes first, so a failure there changes nothing and the user just retries.

**Three: guard writes at the table, not in the app's memory.** My backend caches which users it's seen, one cache per process, to skip a lookup. A deleted user still sitting in one instance's cache could keep *writing* through that instance while the others have never heard of the deletion. So the deletion itself just flags the record — but every *mutating* endpoint (editing your name, finishing onboarding) carries a condition DynamoDB re-checks on each write: the record must exist and not be flagged deleted. Reads already re-fetch the record, so they catch the flag for free and 403; writes can't trust that cache, so the check rides on the write itself. A token minted seconds before you deleted your account bounces on both:

```python
# deletion: Clerk first, then flag the record — the flag write itself is unconditional
clerk.users.delete(user_id)
users.update_item(Key={"id": user_id}, UpdateExpression="SET is_deleted = :d")

# the guard rides on every *mutating* write, not on the delete;
# DynamoDB re-checks it each time and a failed condition surfaces as 403
ACTIVE = "attribute_exists(id) AND (attribute_not_exists(is_deleted) OR is_deleted = :active)"
users.update_item(Key=..., UpdateExpression=..., ConditionExpression=ACTIVE)
```

Then the test I'd been waiting to run. I typed `DELETE` into my own app, confirmed, and it threw me out. I signed back in with the same password and got four words back: **"Couldn't find your account."** I built that, and it's the line I'm proudest of in the whole step.

## You're done when

- Rename yourself in Settings → back to Home → the greeting is the new name, no restart
- Set a birthday → reopen Settings → the wheels show the saved date (not blank)
- Dismiss the birthday prompt → force-quit and relaunch → it stays gone
- Type `DELETE` → the app signs out → signing in again fails with "Couldn't find your account."

## What's next

Step 06 is media: S3 photos with a backend-owned lifecycle — pending upload, claimed on save, auto-expiring if you never save. Your avatar, handled as carefully as your account.

**Following along?** ⭐ [Star the repo](https://github.com/srivardhanjalan/kivan-tutorial) — every step lands as a browsable pull request.

---

**Zero to Shipped — the series**

- **00 · [Introduction](https://medium.com/@srivardhanjalan/zero-to-shipped-2c13ce7e20e9)**
- **01 · [One script to set up everything](https://medium.com/@srivardhanjalan/one-script-to-set-up-everything-ae8bcea2d649)**
- **02 · [Dressed to Ship](https://medium.com/@srivardhanjalan/dressed-to-ship-1e2591179d8a)**
- **03 · [Alive on Arrival](https://medium.com/@srivardhanjalan/alive-on-arrival-cda0a351844f)**
- **04 · [Signed, Sealed, Delivered](https://medium.com/@srivardhanjalan/signed-sealed-delivered-a481a02ac392)**
- **05 · Handle With Care** *(this post)*
- **06 · Media** *(coming soon)*

*All code: [github.com/srivardhanjalan/kivan-tutorial](https://github.com/srivardhanjalan/kivan-tutorial)*
