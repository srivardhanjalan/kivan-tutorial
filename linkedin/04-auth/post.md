# LinkedIn post — Signed, Sealed, Delivered (Zero to Shipped · 04)

## Post body (carousel PDF attached, NO link in post)

My app started signing people up for real this week — and I never wrote a "create user" endpoint.

The obvious design is a sync endpoint: the client signs up, then POSTs its profile so the backend has a record. It's the first design I reached for.

It breaks in a few ways — the worst a security hole: the client controls the payload, so any caller can assert any profile.

So there's no sync endpoint. The backend provisions you just in time.

The first request with a valid token for an unknown user makes the backend fetch your profile from Clerk's own API, server to server, and write the record itself. Create-only:

ConditionExpression="attribute_not_exists(id)"

A caller can't forge a profile it never sends. Two racing requests can't double-create.

Now you sign up inside the app, a code lands, the tutorial plays, and Home greets you by name, over a record the backend wrote for you.

Swipe for the short version — the full write-up is free 👇

#Clerk #FastAPI #BuildInPublic

## ⚠️ BEFORE POSTING — publish the article first

Post 04 ("Signed, Sealed, Delivered") is NOT yet live on Medium (published series is 00–03). The CTA slide and post both point readers to a first comment that must contain a working link. Publish the article first, grab its URL, then paste it into comment #1 below. Do not post the carousel until the article is live.

## First comment (posted immediately after publishing — article link ALONE, it's the conversion target)

Full article — Signed, Sealed, Delivered (Zero to Shipped · 04):
[PASTE LIVE MEDIUM URL AFTER PUBLISHING]

## Reply to your own first comment (secondary links live here, not in comment #1)

The previous step — 03 · Alive on Arrival:
https://medium.com/@srivardhanjalan/alive-on-arrival-cda0a351844f

New to the series? Start with the introduction:
https://medium.com/@srivardhanjalan/zero-to-shipped-2c13ce7e20e9

All the code (every step is a runnable folder):
https://github.com/srivardhanjalan/kivan-tutorial

## Posting notes

- Upload `signed-sealed-delivered-carousel.pdf` as a document post; LinkedIn renders it as a swipeable carousel.
- Document title (renders as a header on the doc; keep <60 chars): "Signed, Sealed, Delivered — real accounts, end to end". Cover headline ("From nobody to a name."), post hook ("My app started signing people up for real…"), and doc title all vary the claim — checked, no verbatim tripling.
- Fold budget: mobile truncates at ~140 chars, desktop ~210. Hook must be complete inside ~140 — current draft passes (the hook sentence is ~95 chars and self-sufficient).
- Hashtags: 3 relevant tags, end of post. Hashtag feeds were deprecated (late 2024); tags no longer drive reach — they're light topical metadata, nothing more.
- Proof before posting. Typo fixes are safe only in the first ~10 minutes; substantive edits inside the 60–90-min momentum window measurably cut impressions (30–50% in creator data; LinkedIn documents no penalty — it's momentum interruption).
- Post the first comment immediately (the CTA slide and body point to it). Self-comments don't hurt reach. Article link ALONE in comment #1; series intro + repo as a reply to it.
- Publish Tue–Thu, 10 a.m.–12 p.m. audience-primary timezone (Wed is peak comment day; Thu can beat Tue for US B2B). Block the next 60–90 min to reply to every comment — 2026's algorithm weights first-hour comment velocity harder than ever.
- Formatting: 1–2 line paragraphs, → bullets and sparse emoji are fine; never Unicode "fancy font" bold/italic (breaks screen readers).

### Sources (mechanics live-verified 2026-07-16; carried forward from post 02/03)

- Fold/character limits: https://authoredup.com/blog/linkedin-character-limit
- Hashtags deprecated / 2–4 max: https://finallayer.com/blog/linkedin-hashtags-changes · https://contentin.io/blog/do-hashtags-work-on-linkedin/
- Edit-timing: https://connectsafely.ai/articles/does-editing-linkedin-post-affect-reach-2026
- Timing + first-comment mechanics: https://buffer.com/resources/best-time-to-post-on-linkedin/
- Document posts: https://www.linkedin.com/help/linkedin/answer/a566146
