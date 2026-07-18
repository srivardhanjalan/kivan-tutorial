# LinkedIn post — Handle With Care (Zero to Shipped · 05)

## Post body (carousel PDF attached, NO link in post)

This week I made "delete my account" actually delete you — and it was trickier than the whole screen around it.

The step looked small: a Settings screen to change your name, set your birthday, and delete your account. The screen took an afternoon. The two boring things underneath it took the rest.

The first was a bug I inherited without noticing. The obvious way to save a name is to write it to Clerk — Clerk owns your identity, it greets you on Home. So the app did that, and stopped there.

But my backend keeps its own copy of your name, written once when you first sign in, create-only. Write to Clerk alone and that copy goes stale the instant you rename yourself, with nothing to heal it.

So the save writes to both. One extra line. A fact kept in two places and edited in one is a bug with a delay on it.

The second thing was deletion, and it came down to three decisions, each easy to get wrong:

→ Keep the record, just flag it — later steps will have wishlists and followers pointing at it, and dangling references are their own bug.

→ Delete from Clerk first, then flag the record — order the two writes so that whichever one fails, the leftover state is the harmless one.

→ Guard the write at the database, not in the app's memory — a server instance that still has you cached could otherwise keep writing after you're gone.

Then the test I'd been waiting for. I typed DELETE into my own app, confirmed, and it threw me out. I signed back in with the same password and got four words back: "Couldn't find your account."

Swipe for the short version — the full write-up is free 👇

#FastAPI #DynamoDB #BuildInPublic

## ⚠️ BEFORE POSTING — publish the article first

Post 05 ("Handle With Care") must be live on Medium before this goes up. The CTA slide and post both send readers to a first comment that has to contain a working link. Publish the article, grab its URL, then paste it into comment #1 below. Do not post the carousel until the article is live.

## First comment (posted immediately after publishing — article link ALONE, it's the conversion target)

Full article — Handle With Care (Zero to Shipped · 05):
[PASTE LIVE MEDIUM URL AFTER PUBLISHING]

## Reply to your own first comment (secondary links live here, not in comment #1)

The previous step — 04 · Signed, Sealed, Delivered:
[PASTE 04 MEDIUM URL — link when published]

New to the series? Start with the introduction:
https://medium.com/@srivardhanjalan/zero-to-shipped-2c13ce7e20e9

All the code (every step is a runnable folder):
https://github.com/srivardhanjalan/kivan-tutorial

## Posting notes

- Upload `handle-with-care-carousel.pdf` as a document post; LinkedIn renders it as a swipeable carousel.
- Document title (renders as a header on the doc; keep <60 chars): "Handle With Care — editing and deleting a user, done right". Cover headline ("Handle with care."), post hook ("I made 'delete my account' actually delete you…"), and doc title all vary the claim — checked, no verbatim tripling.
- Fold budget: mobile truncates at ~140 chars, desktop ~210. Hook must be complete inside ~140 — current draft passes (the hook sentence is ~108 chars and self-sufficient).
- Hashtags: 3 relevant tags, end of post. Hashtag feeds were deprecated (late 2024); tags no longer drive reach — they're light topical metadata, nothing more.
- Proof before posting. Typo fixes are safe only in the first ~10 minutes; substantive edits inside the 60–90-min momentum window measurably cut impressions (30–50% in creator data; LinkedIn documents no penalty — it's momentum interruption).
- Post the first comment immediately (the CTA slide and body point to it). Self-comments don't hurt reach. Article link ALONE in comment #1; series intro + repo as a reply to it.
- Publish Tue–Thu, 10 a.m.–12 p.m. audience-primary timezone (Wed is peak comment day; Thu can beat Tue for US B2B). Block the next 60–90 min to reply to every comment — the algorithm weights first-hour comment velocity heavily.
- Formatting: 1–2 line paragraphs, → bullets and sparse emoji are fine; never Unicode "fancy font" bold/italic (breaks screen readers).

### Sources (mechanics carried forward from post 02/03/04; live-verified 2026-07-16)

- Fold/character limits: https://authoredup.com/blog/linkedin-character-limit
- Hashtags deprecated / 2–4 max: https://finallayer.com/blog/linkedin-hashtags-changes · https://contentin.io/blog/do-hashtags-work-on-linkedin/
- Edit-timing: https://connectsafely.ai/articles/does-editing-linkedin-post-affect-reach-2026
- Timing + first-comment mechanics: https://buffer.com/resources/best-time-to-post-on-linkedin/
- Document posts: https://www.linkedin.com/help/linkedin/answer/a566146
