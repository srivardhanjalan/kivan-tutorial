# LinkedIn post — Dressed to Ship (Zero to Shipped · 02)

## Post body (carousel PDF attached, NO link in post)

I shipped an app that does nothing.

Five tabs, and every one of them politely tells you its real screen hasn't arrived yet. It's step 02 of Zero to Shipped — and I'd argue it's the most important one in the series.

Because a consistent UI doesn't come from discipline. Discipline is what you have in week one. It comes from making inconsistency impossible:

→ every color, radius, and shadow is a named token — no screen ever invents a hex value
→ the chrome is shared, not copied — one header, one scaffold, one tab bar
→ the app's identity is data — the tab bar is literally an array in a config file

The humbling part: I broke my own rule while building it. I copied the finished app's full token files because "later steps would obviously need them." My own audit gate then needed 6 rounds to approve it, deleting half the code along the way: 1,670 lines down to 829, pixel-identical before and after.

Speculative code isn't foresight. It's inventory. And inventory rots.

Swipe through for the short version — the full step-by-step article is free, link in the first comment 👇

#ReactNative #DesignSystems #MobileAppDevelopment #SoftwareEngineering #BuildInPublic

## First comment (posted immediately after publishing)

Full article — Dressed to Ship (Zero to Shipped · 02):
https://medium.com/@srivardhanjalan/dressed-to-ship-1e2591179d8a

New to the series? Start with the introduction:
https://medium.com/@srivardhanjalan/zero-to-shipped-2c13ce7e20e9

All the code (every step is a runnable folder):
https://github.com/srivardhanjalan/kivan-tutorial

## Posting notes
- Upload `dressed-to-ship-carousel.pdf` as a document post; LinkedIn renders it as a swipeable carousel.
- Give the document a title when prompted: "Dressed to Ship — an app that does nothing, on purpose".
- Post the first comment right away (the CTA slide and post body both point to it).
- Best-practice window: Tue–Thu morning; carousels get judged on early dwell time.
