# LinkedIn post — Dressed to Ship (Zero to Shipped · 02)

## Post body (carousel PDF attached, NO link in post)

I shipped an app that does nothing.

Five tabs, and every one of them politely tells you its real screen hasn't arrived yet. It's step 02 of Zero to Shipped — and I'd argue it's the most important one in the series.

Because a consistent UI doesn't come from discipline. Discipline is what you have in week one. It comes from making inconsistency impossible:

→ every color, radius, and shadow is a named token — no screen ever invents a hex value
→ the chrome is shared, not copied — one header, one scaffold, one tab bar
→ the app's identity is data — the tab bar is literally an array in a config file

The humbling part: I broke my own rule while building it. I copied the finished app's full token files because "later steps would obviously need them."

It took six rounds to get past my own audit gate, and I deleted half the code along the way: 1,670 lines down to 829, pixel-identical before and after. (It's 858 today, src plus App.tsx — later rounds earned a few tokens back. Clone it and count.)

Speculative code isn't foresight, it's inventory — and inventory rots.

Swipe for the short version — the full step-by-step article is free, and it's the first comment 👇

#ReactNative #DesignSystems #BuildInPublic

## First comment (posted immediately after publishing — article link ALONE, it's the conversion target)

Full article — Dressed to Ship (Zero to Shipped · 02):
https://medium.com/@srivardhanjalan/dressed-to-ship-1e2591179d8a

## Reply to your own first comment (secondary links live here, not in comment #1)

New to the series? Start with the introduction:
https://medium.com/@srivardhanjalan/zero-to-shipped-2c13ce7e20e9

All the code (every step is a runnable folder):
https://github.com/srivardhanjalan/kivan-tutorial

## Posting notes

- Upload `dressed-to-ship-carousel.pdf` as a document post; LinkedIn renders it as a swipeable carousel.
- Document title (renders as a header on the doc; keep <60 chars): "Dressed to Ship — an app that does nothing, on purpose". Cover headline ("Today we build…"), post hook ("I shipped…"), and doc title all vary the claim — checked, no verbatim tripling.
- Fold budget: mobile truncates at ~140 chars, desktop ~210. Hook must be complete inside ~140 — current draft passes (hook = 35 chars; first two sentences ≈125).
- Hashtags: 3 relevant tags, end of post. Hashtag feeds were deprecated (late 2024); tags no longer drive reach — they're light topical metadata, nothing more.
- Do NOT edit the post body after publishing (early edits are widely reported to suppress distribution) — proof it before hitting Post.
- Post the first comment immediately (the CTA slide and body point to it). Self-comments don't hurt reach. Article link ALONE in comment #1; series intro + repo as a reply to it.
- Publish Tue or Wed, 8:00–10:00 a.m. audience-primary timezone (Thu fallback). Block the next 60–90 min to reply to every comment — early dwell + conversation decide distribution.
- Formatting: 1–2 line paragraphs, → bullets and sparse emoji are fine; never Unicode "fancy font" bold/italic (breaks screen readers).

### Sources (fold + hashtag claims live-verified 2026-07-16; others from persona research — spot-check before posting)

- Fold/character limits (live-verified): https://authoredup.com/blog/linkedin-character-limit
- Hashtags deprecated / 2–4 max (live-verified): https://finallayer.com/blog/linkedin-hashtags-changes · https://contentin.io/blog/do-hashtags-work-on-linkedin/
- Algorithm behavior (links, bait phrasing, edits, self-comments): https://www.justconnecting.nl/ (van der Blom, Algorithm Insights) · https://metricool.com/linkedin-study/
- Timing: https://blog.hootsuite.com/best-time-to-post-on-linkedin/ · https://sproutsocial.com/insights/best-times-to-post-on-linkedin/
- Document posts: https://www.linkedin.com/help/linkedin/answer/a566146 · https://www.socialinsider.io/blog/linkedin-carousels/
