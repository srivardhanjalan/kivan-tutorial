# LinkedIn post: Two Places at Once (Zero to Shipped · 05)

## Post body (carousel PDF attached, NO link in post)

My app greets you by name. Change that name in Settings and the copy my backend keeps goes stale the same instant.

Step 5 looked small: a Settings screen to change your name, set a birthday, delete your account. The screen was an afternoon.

What sat under it was the real step, because every one of those edits touches data that lives in two places at once.

Start with the name. Clerk owns your identity and greets you on Home, so the obvious save writes it to Clerk and stops there.

But the backend keeps its own copy, written once when you first signed in and never touched again. Write only Clerk and that copy is stale the instant you rename yourself, with nothing to heal it.

So the Save fans out to both stores. One extra line.

A fact kept in two places and edited in one is a bug with a delay on it.

The birthday taught it from the other direction. I wired the picker to load a saved date and got three empty wheels on a record that clearly held 2000-01-01.

The stored value was padded ("01"), the wheels compared raw ("1"), and nothing matched. Strip the padding on load, re-pad on save.

Then deletion, the part worth getting right. Two writes tear you down: revoke the Clerk user, and flag the backend record.

My first pass flagged the record first, then called Clerk. My reviewer asked the obvious question: what if the Clerk call fails? The record says gone, the credentials still sign in, and the only way to reconcile it is a dashboard.

So I swapped the order. Delete the irreversible thing first, and a failure there changes nothing, you just retry.

Then the test I'd been waiting for. I typed DELETE into my own app, confirmed, and it signed me out. I signed back in with the same password and got four words back: "Couldn't find your account."

What's a two-places bug that's bitten you, one copy updated and the other left quietly stale? Tell me in the comments 👇

#FastAPI #DynamoDB #BuildInPublic

## First comment (posted immediately after publishing: article link ALONE, it's the conversion target)

Full article, Two Places at Once (Zero to Shipped · 05):
[PASTE LIVE MEDIUM URL AFTER PUBLISHING]

## Reply to your own first comment (secondary links live here, not in comment #1)

The previous step, 04 · Signed, Sealed, Delivered:
https://medium.com/@srivardhanjalan/signed-sealed-delivered-a481a02ac392

New to the series? Start with the introduction:
https://medium.com/@srivardhanjalan/zero-to-shipped-2c13ce7e20e9

All the code (every step is a runnable folder):
https://github.com/srivardhanjalan/kivan-tutorial

## Posting notes

- Upload `two-places-at-once-carousel.pdf` as a document post; LinkedIn renders it as a swipeable carousel.
- Document title (renders as a header on the doc; keep <60 chars): "Two Places at Once: editing and deleting a user, done right". Cover headline ("One name, two stores."), post hook ("My app greets you by name. Change that name in Settings…"), and doc title all vary the claim: checked, no verbatim tripling.
- Fold budget: mobile truncates at ~140 chars, desktop ~210. Hook must be complete inside ~140: current draft passes (the hook is 114 chars and self-sufficient: greeted by name, and the backend copy goes stale the moment you edit it).
- Hashtags: 3 relevant tags, end of post. Hashtag feeds were deprecated (late 2024); tags no longer drive reach: they're light topical metadata, nothing more.
- Proof before posting. Typo fixes are safe only in the first ~10 minutes; substantive edits inside the 60–90-min momentum window measurably cut impressions (30–50% in creator data; LinkedIn documents no penalty: it's momentum interruption).
- Post the first comment immediately (the carousel's final slide names it: "Link in the first comment ↓"; the body's one CTA is the closing question, so the link isn't restated in the body). Self-comments don't hurt reach. Article link ALONE in comment #1; series intro + repo as a reply to it.
- Publish Tue–Thu, 10 a.m.–12 p.m. audience-primary timezone (Wed is peak comment day; Thu can beat Tue for US B2B). Block the next 60–90 min to reply to every comment: 2026's algorithm weights first-hour comment velocity harder than ever.
- Formatting: 1–2 line paragraphs, → bullets and sparse emoji are fine; never Unicode "fancy font" bold/italic (breaks screen readers).

### Sources (mechanics carried forward from post 02/03/04; live-verified 2026-07-16)

- Fold/character limits: https://authoredup.com/blog/linkedin-character-limit
- Hashtags deprecated / 2–4 max: https://finallayer.com/blog/linkedin-hashtags-changes · https://contentin.io/blog/do-hashtags-work-on-linkedin/
- Edit-timing: https://connectsafely.ai/articles/does-editing-linkedin-post-affect-reach-2026
- Timing + first-comment mechanics: https://buffer.com/resources/best-time-to-post-on-linkedin/
- Document posts: https://www.linkedin.com/help/linkedin/answer/a566146
