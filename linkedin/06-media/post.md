# LinkedIn post: Photos Without the Exposure (Zero to Shipped · 06)

## Post body (carousel PDF attached, NO link in post)

My app keeps your photos on a fully private S3 bucket, no public URL anywhere, and every one still loads the instant you open the app.

Step 6 added two photos, a profile shot and a cover. Drawing the screen was an afternoon. Storing a file safely was the actual step.

A photo is four problems at once. The bucket can't be public, or one leaked link exposes everyone. The phone can't hold AWS keys. A private file still has to render on screen. And a photo nobody saved can't sit in storage forever.

One decision answered all four: my backend owns every file's whole life, but the photo bytes travel from the phone straight to S3 and never pass through it.

The client asks for a short-lived upload link, good for five minutes. It PUTs the bytes to a pending area, phone straight to S3. My backend never sees the image.

Nothing is permanent until you hit Save. Save is what promotes the pending object to storage. Walk away and S3 clears the pending file about a day later. No cleanup job, no cron.

The bucket is sealed, so a stored URL is a flat 403 on its own. Every time my backend returns your record, it signs a fresh link that works for an hour. Private at rest, viewable on demand.

Then the bug that cost me an evening. Hitting Save with nothing changed deleted the photo it was supposed to keep.

Reads come back as signed URLs, so the client echoed back a URL carrying an "X-Amz-Signature" query string that never string-matched the stored one. The cleanup saw a "new" photo and swept the "old" one, the same file.

The fix: compare by S3 key, never the raw string. An unchanged Save is now a clean no-op.

Sealed bucket, straight-to-S3 uploads, signed reads, and nothing left orphaned. The photo never touches the thing that guards it.

What's a bug you've hit where a safe-looking value (a signed URL, a reformatted string) quietly stopped matching itself? Tell me in the comments 👇

#AWS #S3 #BuildInPublic

## First comment (posted immediately after publishing: article link ALONE, it's the conversion target)

Full article, Photos Without the Exposure (Zero to Shipped · 06):
[PASTE LIVE MEDIUM URL AFTER PUBLISHING]

## Reply to your own first comment (secondary links live here, not in comment #1)

The previous step, 05 · Two Places at Once:
[PASTE STEP 05 MEDIUM URL]

New to the series? Start with the introduction:
https://medium.com/@srivardhanjalan/zero-to-shipped-2c13ce7e20e9

All the code (every step is a runnable folder):
https://github.com/srivardhanjalan/kivan-tutorial

## Posting notes

- Upload `photos-without-the-exposure-carousel.pdf` as a document post; LinkedIn renders it as a swipeable carousel.
- Document title (renders as a header on the doc; keep <60 chars): "Photos Without the Exposure: private S3, done right". Cover headline ("Photos that can't leak."), post hook ("My app keeps your photos on a fully private S3 bucket..."), and this doc title all vary the claim: checked, no verbatim tripling.
- Fold budget: mobile truncates at ~140 chars, desktop ~210. The hook must be complete and self-sufficient inside ~140: the current draft is 134 chars (the private-bucket-yet-it-loads paradox lands in the first line, before the fold).
- NO em-dashes anywhere (post or slides). Colon, comma, period, parens instead.
- Hashtags: 3 relevant tags at the end. Hashtag feeds were deprecated (late 2024); tags no longer drive reach, they are light topical metadata, nothing more.
- Proof before posting. Typo fixes are safe only in the first ~10 minutes; substantive edits inside the 60 to 90 minute momentum window measurably cut impressions (30 to 50% in creator data; LinkedIn documents no penalty, it is momentum interruption).
- Post the first comment immediately (the carousel's final slide names it: "Link in the first comment"; the body's one CTA is the closing question, so the link is not restated in the body). Self-comments do not hurt reach. Article link ALONE in comment #1; series intro + repo as a reply to it.
- Publish Tue to Thu, 10 a.m. to 12 p.m. audience-primary timezone (Wed is peak comment day; Thu can beat Tue for US B2B). Block the next 60 to 90 min to reply to every comment: the algorithm weights first-hour comment velocity heavily.
- Formatting: 1 to 2 line paragraphs, arrow bullets and sparse emoji are fine; never Unicode "fancy font" bold/italic (breaks screen readers).

### Sources (LinkedIn mechanics carried forward from posts 02 to 05; re-verify if a year has passed)

- Fold/character limits: https://authoredup.com/blog/linkedin-character-limit
- Hashtags deprecated / 2 to 4 max: https://finallayer.com/blog/linkedin-hashtags-changes
- Edit-timing: https://connectsafely.ai/articles/does-editing-linkedin-post-affect-reach-2026
- Timing + first-comment mechanics: https://buffer.com/resources/best-time-to-post-on-linkedin/
- Document posts: https://www.linkedin.com/help/linkedin/answer/a566146
