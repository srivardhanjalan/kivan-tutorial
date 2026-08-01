# LinkedIn post: Off the Shelf (Zero to Shipped · 08)

## Post body (carousel PDF attached, article link in the body)

The app just got a store. Tap a product and it lands on your wishlist already filled in, no typing.

Step 8 is the catalog: a handful of curated stores, each with a few products, browsable from a new Wish Store tab.

Drawing the store list was the easy afternoon. The interesting part was everything the catalog is not allowed to do.

The stores and products are the same for every user. So the running server has no reason to write them, and every reason not to be able to: one bug or one breach should never get to rewrite the catalog for everyone.

So the app's role can read the two tables and cannot touch them. Seeding runs once, from my own machine, never the deployed container. Read-only in production by grant, not by good intentions.

Then the one seam. A product has to become a real wish without the store reaching into how wishlists work.

→ Tap Add to Wishlist, pick a list, and it creates the wish through the exact same endpoint the manual form already calls, carrying the name, price, and link onto it. Delete the store code tomorrow and wishlists keep working.

The part that actually cost me time: every new screen was a copy of one I had already built.

A product card is a wish card. A product detail is a wish detail. Built as copies, they would be four near-identical pieces that drift apart the first time I touched only one.

So each shared shape moved into one place the moment the product screen became its second caller: one tile card, one detail block, one open-a-link call. Never extracted ahead of that second use, never left a copy after it.

A new screen modeled on an old one is a duplication suspect before it is anything else.

Full write-up, with every snippet and the reasoning, Off the Shelf (Zero to Shipped · 08):
[PASTE LIVE MEDIUM URL AFTER PUBLISHING]

Where have you watched two screens that started identical quietly drift apart? Tell me in the comments 👇

#ReactNative #FastAPI #BuildInPublic

## First comment (secondary links, posted after publishing)

The previous step, 07 · Whose Wish Is It Anyway?:
[PASTE 07 MEDIUM URL]

New to the series? Start with the introduction:
https://medium.com/@srivardhanjalan/zero-to-shipped-2c13ce7e20e9

All the code (every step is a runnable folder):
https://github.com/srivardhanjalan/kivan-tutorial

## Posting notes

- Upload `off-the-shelf-carousel.pdf` as a document post; LinkedIn renders it as a swipeable carousel.
- The carousel is a layperson product story ("Shop your own wishlist"); the post body is the first-person build story for the developer audience. The article link lives in the BODY, near the end (no "link in the first comment" mechanic). The first comment carries only the secondary links (previous step, series intro, repo).
- Document title (renders as a header on the doc; keep <60 chars): "A wish you pick, not type" (25 chars). The cover headline ("Shop your own wishlist."), the post hook ("The app just got a store..."), and this doc title each vary the claim: checked, no verbatim tripling.
- Fold budget: mobile truncates at ~140 chars, desktop ~210. The hook must be complete and self-sufficient inside ~140: the current opening is 98 chars (the whole milestone plus "already filled in, no typing" lands before the fold).
- NO em-dashes anywhere (post or slides). Colon, comma, period, parens instead.
- Hashtags: 3 relevant tags at the end. Hashtag feeds were deprecated (late 2024); tags are light topical metadata, not a reach lever.
- Proof before posting. Typo fixes are safe only in the first ~10 minutes; substantive edits inside the 60 to 90 minute momentum window measurably cut impressions (30 to 50% in creator data; LinkedIn documents no penalty, it is momentum interruption).
- Publish Tue to Thu, 10 a.m. to 12 p.m. audience-primary timezone (Wed is peak comment day; Thu can beat Tue for US B2B). Block the next 60 to 90 min to reply to every comment: the algorithm weights first-hour comment velocity heavily.
- Formatting: 1 to 2 line paragraphs, arrow bullets and sparse emoji are fine; never Unicode "fancy font" bold/italic (breaks screen readers).

### Sources (LinkedIn mechanics carried forward from posts 02 to 07; re-verify if a year has passed)

- Fold/character limits: https://authoredup.com/blog/linkedin-character-limit
- Hashtags deprecated / 2 to 4 max: https://finallayer.com/blog/linkedin-hashtags-changes
- Edit-timing: https://connectsafely.ai/articles/does-editing-linkedin-post-affect-reach-2026
- Timing + first-comment mechanics: https://buffer.com/resources/best-time-to-post-on-linkedin/
- Document posts: https://www.linkedin.com/help/linkedin/answer/a566146
