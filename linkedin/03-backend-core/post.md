# LinkedIn post — Alive on Arrival (Zero to Shipped · 03)

## Post body (carousel PDF attached, NO link in post)

My app went from localhost to real AWS this week — and the whole deploy is four commands.

Until now it was a shell: five tabs, design tokens, everything local. Now it has a pulse. FastAPI in a container, Terraform, App Runner, my own account.

The backend itself is two dependencies and one router. Nothing joins until something actually needs it.

And when I tear it down — destroy, plus one log-group sweep — a tag search across the account finds nothing.

Then a deploy died at the three-minute mark while I was verifying the step. CREATE_FAILED, and the log group was empty.

The same image ran fine on my laptop.

Turns out newer Docker quietly attaches attestations that turn a push into an OCI image index. App Runner will update a service from one of those — it just won't create one.

The fix is two flags on the push: --provenance=false --sbom=false. It lives in one deploy script now, next to the Apple Silicon build trap everyone warns you about.

Swipe for the short version — the complete write-up is free 👇

#FastAPI #Terraform #BuildInPublic

## First comment (posted immediately after publishing — article link ALONE, it's the conversion target)

Full article — Alive on Arrival (Zero to Shipped · 03):
https://medium.com/@srivardhanjalan/alive-on-arrival-cda0a351844f

## Reply to your own first comment (secondary links live here, not in comment #1)

New to the series? Start with the introduction:
https://medium.com/@srivardhanjalan/zero-to-shipped-2c13ce7e20e9

All the code (every step is a runnable folder):
https://github.com/srivardhanjalan/kivan-tutorial

## Posting notes

- Upload `alive-on-arrival-carousel.pdf` as a document post; LinkedIn renders it as a swipeable carousel.
- Document title (renders as a header on the doc; keep <60 chars): "Alive on Arrival — four commands to a live AWS backend". Cover headline ("My app has a real backend now."), post hook ("My app went from localhost to real AWS…"), and doc title all vary the claim — checked, no verbatim tripling.
- Fold budget: mobile truncates at ~140 chars, desktop ~210. Hook must be complete inside ~140 — current draft passes (the hook sentence is ~89 chars and self-sufficient).
- Hashtags: 3 relevant tags, end of post. Hashtag feeds were deprecated (late 2024); tags no longer drive reach — they're light topical metadata, nothing more.
- Proof before posting. Typo fixes are safe only in the first ~10 minutes; substantive edits inside the 60–90-min momentum window measurably cut impressions (30–50% in creator data; LinkedIn documents no penalty — it's momentum interruption).
- Post the first comment immediately (the CTA slide and body point to it). Self-comments don't hurt reach. Article link ALONE in comment #1; series intro + repo as a reply to it.
- Publish Tue–Thu, 10 a.m.–12 p.m. audience-primary timezone (Wed is peak comment day; Thu can beat Tue for US B2B). Block the next 60–90 min to reply to every comment — 2026's algorithm weights first-hour comment velocity harder than ever.
- Formatting: 1–2 line paragraphs, → bullets and sparse emoji are fine; never Unicode "fancy font" bold/italic (breaks screen readers).

### Sources (mechanics live-verified 2026-07-16 during the post-02 review; carried forward)

- Fold/character limits: https://authoredup.com/blog/linkedin-character-limit
- Hashtags deprecated / 2–4 max: https://finallayer.com/blog/linkedin-hashtags-changes · https://contentin.io/blog/do-hashtags-work-on-linkedin/
- Edit-timing: https://connectsafely.ai/articles/does-editing-linkedin-post-affect-reach-2026 · https://maverrik.io/blog/is-it-bad-to-edit-a-linkedin-post-after-publishing-algorithm-secrets/
- Timing + first-comment mechanics: https://buffer.com/resources/best-time-to-post-on-linkedin/ · https://www.linkboost.co/blog/best-time-to-post-on-linkedin-2026/
- Document posts: https://www.linkedin.com/help/linkedin/answer/a566146 · https://www.socialinsider.io/blog/linkedin-carousels/
