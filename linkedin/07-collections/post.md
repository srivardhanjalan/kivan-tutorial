# LinkedIn post: Whose Wish Is It Anyway? (Zero to Shipped · 07)

## Post body (carousel PDF attached, article link in the body)

My app finally holds wishlists. Drawing the grid took an afternoon; deciding who is allowed to touch them was the actual step.

Step 7 is collections: wishlists that hold wishes, each filed under an occasion. The moment data belongs to someone, every route has to answer one question. Is this yours?

Get that answer in a handful of handlers and one of them drifts. So access is decided in exactly one function, and everything reads through it.

Ask for a wishlist that isn't yours and it is a flat 403. Ask for an id that never existed and it is a 404. No token at all is a 401. One gate, three answers.

A wish was the interesting case. It has no owner of its own, it just lives inside a wishlist. So a wish never gets its own rule: it borrows its wishlist's owner, and there is never a second rulebook to disagree with the first.

Delete had to be just as total. Dropping a wishlist takes its wishes and every photo they uploaded with it, in one cascade, so nothing is left orphaned. Deleting your whole account reuses that exact path.

Then the bug that cost me an evening. The first wish I saved with a price 500'd.

`Float types are not supported. Use Decimal types instead.` DynamoDB rejects Python floats outright. The cost now stores as a Decimal and comes back a number on read, with a couple of bounds so a weird value gets a clean 422 instead of blowing up deeper down.

Full write-up, with every snippet and the reasoning: Whose Wish Is It Anyway? (Zero to Shipped · 07):
[PASTE LIVE MEDIUM URL AFTER PUBLISHING]

What is a permission check you have seen re-derived in five places, each one a little bit different? Tell me in the comments 👇

#FastAPI #DynamoDB #BuildInPublic

## First comment (secondary links, posted after publishing)

The previous step, 06 · Photos Without the Exposure:
[PASTE STEP 06 MEDIUM URL]

New to the series? Start with the introduction:
https://medium.com/@srivardhanjalan/zero-to-shipped-2c13ce7e20e9

All the code (every step is a runnable folder):
https://github.com/srivardhanjalan/kivan-tutorial

## Posting notes

- Upload `whose-wish-is-it-anyway-carousel.pdf` as a document post; LinkedIn renders it as a swipeable carousel.
- The carousel is a layperson product story ("A home for your wishes"); the post body is the first-person build story for the developer audience. The article link lives in the BODY, near the end (no "link in the first comment" mechanic). The first comment carries only the secondary links (previous step, series intro, repo).
- Document title (renders as a header on the doc; keep <60 chars): "A home for your wishes: one owner, one gate" (43 chars). The cover headline ("A home for your wishes."), the post hook ("My app finally holds wishlists..."), and this doc title each vary the claim: checked, no verbatim tripling.
- Fold budget: mobile truncates at ~140 chars, desktop ~210. The hook must be complete and self-sufficient inside ~140: the current opening is 132 chars (the "grid was easy, access was the step" turn lands before the fold).
- NO em-dashes anywhere (post or slides). Colon, comma, period, parens instead.
- Hashtags: 3 relevant tags at the end. Hashtag feeds were deprecated (late 2024); tags are light topical metadata, not a reach lever.
- Proof before posting. Typo fixes are safe only in the first ~10 minutes; substantive edits inside the 60 to 90 minute momentum window measurably cut impressions (30 to 50% in creator data; LinkedIn documents no penalty, it is momentum interruption).
- Publish Tue to Thu, 10 a.m. to 12 p.m. audience-primary timezone (Wed is peak comment day; Thu can beat Tue for US B2B). Block the next 60 to 90 min to reply to every comment: the algorithm weights first-hour comment velocity heavily.
- Formatting: 1 to 2 line paragraphs, arrow bullets and sparse emoji are fine; never Unicode "fancy font" bold/italic (breaks screen readers).

### Sources (LinkedIn mechanics carried forward from posts 02 to 06; re-verify if a year has passed)

- Fold/character limits: https://authoredup.com/blog/linkedin-character-limit
- Hashtags deprecated / 2 to 4 max: https://finallayer.com/blog/linkedin-hashtags-changes
- Edit-timing: https://connectsafely.ai/articles/does-editing-linkedin-post-affect-reach-2026
- Timing + first-comment mechanics: https://buffer.com/resources/best-time-to-post-on-linkedin/
- Document posts: https://www.linkedin.com/help/linkedin/answer/a566146
