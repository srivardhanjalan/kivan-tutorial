# LinkedIn post — Alive on Arrival (Zero to Shipped · 03)

## Post body (carousel PDF attached, NO link in post)

My deploy died three minutes into terraform apply. CREATE_FAILED — and the log group was completely empty.

On my laptop, the exact same image ran fine. The API code was innocent.

Step 03 of Zero to Shipped is everything that story kept getting in the way of:

A FastAPI backend running on AWS you own — four commands up, torn back down until a tag search finds nothing.

→ the backend earns its dependencies: requirements.txt is two lines, and there's no database, auth, or queue until a step actually consumes them
→ one console page shows the whole stack — and the empty page after teardown is the receipt
→ the frontend delta is ~60 lines and owns the diagnosis: kill the backend, cold-restart, and the status line tells you what to check

And the autopsy: two unrelated causes, one identical empty-log symptom.

One is the Apple Silicon build path everyone warns you about.

The other found me while verifying this exact step — newer Docker quietly attaches attestations that turn your push into an OCI image index. Updating a service tolerates that; creating one doesn't.

Both fixes now live in one deploy script.

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
- Document title (renders as a header on the doc; keep <60 chars): "Alive on Arrival — four commands to a live AWS backend". Cover headline ("The deploy died…"), post hook ("My deploy died…"), and doc title all vary the claim — checked, no verbatim tripling.
- Fold budget: mobile truncates at ~140 chars, desktop ~210. Hook must be complete inside ~140 — current draft passes (first sentence = 50 chars; sentence two completes the mystery at ~106).
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
