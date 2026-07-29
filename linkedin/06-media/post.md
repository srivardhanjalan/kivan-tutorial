# LinkedIn post: Photos Without the Exposure (Zero to Shipped · 06)

## Post body (carousel PDF attached, article link in the body)

My app keeps your photos on a fully private S3 bucket, no public URL anywhere, and every one still loads the instant you open the app.

Step 6 added two photos, a profile shot and a cover. Drawing the screen was an afternoon. Storing a file safely was the actual step.

A photo is four problems at once. The bucket can't be public, or one leaked link exposes everyone. The phone can't hold AWS keys. A private file still has to render on screen. And a photo nobody saved can't sit in storage forever.

One decision answered all four: my backend owns every file's whole life, but the photo bytes travel from the phone straight to S3 and never pass through it.

The client asks for a short-lived upload link, good for five minutes. It PUTs the bytes to a pending area, phone straight to S3. My backend never sees the image.

Nothing is permanent until you hit Save. Save promotes the pending file to storage. Walk away and S3 clears it about a day later. No cleanup job, no cron.

The bucket is sealed, so a stored URL is a flat 403 on its own. Every time my backend returns your record, it signs a fresh link that works for an hour. Private at rest, viewable on demand.

Then the bug that cost me an evening. Hitting Save with nothing changed deleted the photo it was supposed to keep.

Reads come back as signed URLs, so the client echoed back a URL whose signature never string-matched the stored one. The cleanup saw a "new" photo and swept the "old" one, the same file. The fix: compare by S3 key, never the raw string.

Full write-up, with every snippet and the reasoning: Photos Without the Exposure (Zero to Shipped · 06):
https://medium.com/@srivardhanjalan/photos-without-the-exposure-96e9acf11db3

What is a bug you've hit where a safe-looking value (a signed URL, a reformatted string) quietly stopped matching itself? Tell me in the comments 👇

#AWS #S3 #BuildInPublic

## First comment (secondary links, posted after publishing)

The previous step, 05 · Two Places at Once:
https://medium.com/@srivardhanjalan/two-places-at-once-1e00bb46354b

New to the series? Start with the introduction:
https://medium.com/@srivardhanjalan/zero-to-shipped-2c13ce7e20e9

All the code (every step is a runnable folder):
https://github.com/srivardhanjalan/kivan-tutorial

## Posting notes

- Upload `photos-without-the-exposure-carousel.pdf` as a document post; LinkedIn renders it as a swipeable carousel.
- The carousel is a layperson product story ("Photos that can't leak"); the post body is the first-person build story for the developer audience. The article link lives in the BODY, near the end (no "link in the first comment" mechanic). The first comment carries only the secondary links (previous step, series intro, repo).
- Document title (renders as a header on the doc; keep <60 chars): "Photos that can't leak: private by default" (42 chars). The cover headline ("Photos that can't leak."), the post hook ("My app keeps your photos on a fully private S3 bucket..."), and this doc title each vary the claim: checked, no verbatim tripling.
- Fold budget: mobile truncates at ~140 chars, desktop ~210. The hook must be complete and self-sufficient inside ~140.
- NO em-dashes anywhere (post or slides). Colon, comma, period, parens instead.
- Hashtags: 3 relevant tags at the end. Hashtag feeds were deprecated (late 2024); tags are light topical metadata, not a reach lever.
- Proof before posting. Typo fixes are safe only in the first ~10 minutes; substantive edits inside the 60 to 90 minute momentum window measurably cut impressions (30 to 50% in creator data; LinkedIn documents no penalty, it is momentum interruption).
- Publish Tue to Thu, 10 a.m. to 12 p.m. audience-primary timezone (Wed is peak comment day; Thu can beat Tue for US B2B). Block the next 60 to 90 min to reply to every comment: the algorithm weights first-hour comment velocity heavily.
- Formatting: 1 to 2 line paragraphs, arrow bullets and sparse emoji are fine; never Unicode "fancy font" bold/italic (breaks screen readers).

### Sources (LinkedIn mechanics carried forward from posts 02 to 05; re-verify if a year has passed)

- Fold/character limits: https://authoredup.com/blog/linkedin-character-limit
- Hashtags deprecated / 2 to 4 max: https://finallayer.com/blog/linkedin-hashtags-changes
- Edit-timing: https://connectsafely.ai/articles/does-editing-linkedin-post-affect-reach-2026
- Timing + first-comment mechanics: https://buffer.com/resources/best-time-to-post-on-linkedin/
- Document posts: https://www.linkedin.com/help/linkedin/answer/a566146
