# LinkedIn post — Signed, Sealed, Delivered (Zero to Shipped · 04)

## Post body (carousel PDF attached, NO link in post)

My app greets you by name. The twist? It refuses to believe you about what that name is.

Building it, I deleted the first piece of code I'd normally write.

The obvious version: someone signs up, the app tells my backend "here's who I am — save it." I started writing exactly that.

Then it hit me: that code trusts whatever the app claims.

Hand it any name. Any details. My backend writes them down as fact. It was taking the user's word for who they are.

So I deleted it. My app now has zero ability to tell the backend who someone is.

Instead: the first time you show up, my backend asks the identity service directly — the one that actually watched you sign in — and records you from that.

You prove who you are. You don't get to describe yourself.

So when the app greets you by name? That name came from a source that verified it. Not from anything your phone sent along.

Never let the thing asking for access be the thing that defines it.

What's the worst "it just believed whatever was sent" bug you've hit? Tell me in the comments. 👇

#BuildInPublic #BackendDevelopment #AppSec

## First comment (posted immediately after publishing — article link ALONE, it's the conversion target)

Full article — Signed, Sealed, Delivered (Zero to Shipped · 04):
https://medium.com/@srivardhanjalan/signed-sealed-delivered-a481a02ac392

## Reply to your own first comment (secondary links live here, not in comment #1)

The previous step — 03 · Alive on Arrival:
https://medium.com/@srivardhanjalan/alive-on-arrival-cda0a351844f

New to the series? Start with the introduction:
https://medium.com/@srivardhanjalan/zero-to-shipped-2c13ce7e20e9

All the code (every step is a runnable folder):
https://github.com/srivardhanjalan/kivan-tutorial

## Posting notes

- Upload `signed-sealed-delivered-carousel.pdf` as a document post; LinkedIn renders it as a swipeable carousel.
- Document title (renders as a header on the doc; keep <60 chars): "Signed, Sealed, Delivered — real accounts, end to end". Cover headline ("Zero fake accounts."), post hook ("My app greets you by name. The twist?…"), and doc title all vary the claim — checked, no verbatim tripling.
- Fold budget: mobile truncates at ~140 chars, desktop ~210. Hook must be complete inside ~140 — current draft passes (the opening line "My app greets you by name. The twist? It refuses to believe you about what that name is." is ~88 chars; the first sentence alone lands the paradox).
- Hashtags: 3 relevant tags, end of post. Hashtag feeds were deprecated (late 2024); tags no longer drive reach — they're light topical metadata, nothing more.
- Proof before posting. Typo fixes are safe only in the first ~10 minutes; substantive edits inside the 60–90-min momentum window measurably cut impressions (30–50% in creator data; LinkedIn documents no penalty — it's momentum interruption).
- Post the first comment immediately (the carousel's final slide names it — "Link in the first comment ↓"; the body's one CTA is the closing question, so the link isn't restated in the body). Self-comments don't hurt reach. Article link ALONE in comment #1; series intro + repo as a reply to it.
- Publish Tue–Thu, 10 a.m.–12 p.m. audience-primary timezone (Wed is peak comment day; Thu can beat Tue for US B2B). Block the next 60–90 min to reply to every comment — 2026's algorithm weights first-hour comment velocity harder than ever.
- Formatting: 1–2 line paragraphs, → bullets and sparse emoji are fine; never Unicode "fancy font" bold/italic (breaks screen readers).

### Sources (mechanics live-verified 2026-07-16; carried forward from post 02/03)

- Fold/character limits: https://authoredup.com/blog/linkedin-character-limit
- Hashtags deprecated / 2–4 max: https://finallayer.com/blog/linkedin-hashtags-changes · https://contentin.io/blog/do-hashtags-work-on-linkedin/
- Edit-timing: https://connectsafely.ai/articles/does-editing-linkedin-post-affect-reach-2026
- Timing + first-comment mechanics: https://buffer.com/resources/best-time-to-post-on-linkedin/
- Document posts: https://www.linkedin.com/help/linkedin/answer/a566146
