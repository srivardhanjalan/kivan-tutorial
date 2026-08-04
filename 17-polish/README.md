# Step 17: UI polish

*This is a scope spec, not a built step. The folder ships later; this README
is its written contract so the scope is documented rather than remembered.*

The feature steps ship their screens with a deliberately simpler UI than the
finished design; the repo's mocks show that design's look. That is on
purpose: a plainer screen keeps the feature's logic readable while you are
learning it, so the row list, the extra tap, and the placeholder layout are
teaching aids, not the finished product. This step is where the app converges
on that finished design. It applies the visual refinements and trims every
unnecessary tap, without dropping a single piece of functionality any earlier
step shipped. Nothing here adds a feature; it makes the features already built
look and feel like the real product.

**This is a living ledger, maintained per step.** Every step that adds or
changes a screen appends that screen's divergences from the finished design
here, in the same round it ships. The list below is organized by screen so the
polish pass reads top to bottom through the app; each box is one concrete
refinement, phrased as `source` (the finished design) vs `tutorial` (what the
step shipped). Behavior parity is NOT deferred here: functionality already
converges step by step, so this list is visual and workflow convergence only.
Anything a step deliberately holds for a later feature step (events, sharing
and privacy, notifications, admin uploads, currency conversion) is that step's
scope, not this one.

## Home

- [ ] Cover-photo profile header. *source:* an edge-to-edge cover band with the
      avatar overlapping it, the display name, and the settings button floated
      on the cover. *tutorial:* a plain floating header greeting `Hi, {name}`
      with a settings icon button, no cover.
- [ ] A horizontal wishlist chip rail that filters the feed. *source:* a rail
      of wishlist chips led by an **All Wishes** aggregate and an add tile,
      selecting one filters the wishes below. *tutorial:* a `Your wishlists`
      preview rail of the six newest lists, each chip opens the list.
- [ ] The wishes feed as the body of Home. *source:* a masonry grid of your
      wishes (image-forward, infinite scroll, pull to refresh) is the main
      surface. *tutorial:* Home shows no wishes; they live inside each wishlist.
- [ ] A fulfilled/unfulfilled/all view-mode filter over the wishes feed.
      *source:* a selection modal toggles the feed between unfulfilled, all, and
      fulfilled. *tutorial:* none (completion is still fully functional on the
      wish detail screen).
- [ ] Retire the teaching-only `Your account` panel. *source:* absent from the
      finished design. *tutorial:* an `ApiStatus` line and a backend
      provisioning record line teach how the app talks to its backend; polish
      removes them.

## My Stuff

- [ ] Image-forward wishlist tiles. *source:* tonal `WishlistRailCard` tiles
      (cover photo or life-event pastel wash, love pill, group chip, wish-count
      pill). *tutorial:* `WishlistCard` grid tiles in the simpler idiom.

## Settings

- [ ] Card-grouped settings rows. *source:* rows rendered as grouped
      `SettingItemList` cards. *tutorial:* plain hairline-divided rows.
- [ ] Cover photo picker matching the finished design. *source:* the cover
      photo is chosen from a set of default cover presets through a modal.
      *tutorial:* the cover photo is a custom upload (it persists to the
      backend), but it is rendered nowhere yet (see Shared tiles and headers).

## Discover

- [ ] Discover / Following / Followers tabs in the header. *source:* three
      floating-header tabs switch between the popular feed, the people you
      follow (with a loved-wishlists section), and your followers. *tutorial:*
      a single Discover view; following and followers are reached instead as
      drill-down lists from a profile's stat counts.
- [ ] A horizontal people rail. *source:* `People` is a horizontal rail of
      circular avatars (`UserRailItem`). *tutorial:* `People to follow` is a
      vertical list of `UserRow` rows.
- [ ] Paginated rails with refresh and error/retry states. *source:* the
      popular rails page in as you scroll, pull to refresh, and show a retry
      state on load failure. *tutorial:* a single fetch per rail, no pagination
      or retry surface.

## Public profile

- [ ] Cover-photo profile header. *source:* an edge-to-edge cover band with the
      avatar overlapping. *tutorial:* a plain header with the avatar centered
      above the stats.
- [ ] Follow as a cover heart. *source:* the follow control is a heart button
      overlaid on the cover with a follower-count badge. *tutorial:* tappable
      Followers/Following stat counts plus a Follow/Following text pill.
- [ ] A wish-forward profile body. *source:* a horizontal wishlist chip rail
      (led by an **All Items** aggregate) filters a masonry grid of the user's
      wishes below. *tutorial:* two wishlist-tile grids, `Wishlists` and
      `Loved`, no wish grid.
- [ ] Profile aggregated all-items view. *source:* the **All Items** chip shows
      every wish the user owns in one grid. *tutorial:* wishes are only visible
      one wishlist at a time.

## Wishlist detail

- [ ] Cover-photo band hero. *source:* an edge-to-edge cover band carries the
      wishlist. *tutorial:* an `ArtTile` pastel/image hero with the life-event
      name beneath it.
- [ ] Love as a cover heart. *source:* love is a heart button overlaid on the
      cover with a count badge. *tutorial:* an outlined `LoveButton` pill sits
      below the hero.
- [ ] Masonry wishes grid. *source:* wishes lay out in a responsive masonry
      grid (2/3/4 columns by width). *tutorial:* a uniform `TileGrid`.

## Wish detail

- [ ] The glass price pill sits beside the store link. *source:* a `BlurView`
      glass price container in a price-plus-link row, the link button labeled
      with the wish's store domain. *tutorial:* the price is plain text in
      `DetailTitleBlock` and the link is a stacked **Open Link**
      `DetailAction`.

## Product detail

- [ ] The glass price pill sits beside a **View Product** action. *source:* a
      blurred glass price overlay next to the store link. *tutorial:* the price
      is plain text in the shared title block.
- [ ] The **Add to Wishlist** call to action is the floating pill. *source:* a
      floating pill pinned above the safe-area inset. *tutorial:* a stacked
      `DetailAction` button in the content flow.

## In-app browser

- [ ] Floating translucent pill chrome that auto-hides on scroll. *source:* a
      blurred floating header. *tutorial:* solid close and reload icon buttons
      in a fixed header.
- [ ] The recent-brands switcher strip / one-tap store switching. *source:* a
      horizontal strip of recent brand logos in the header switches stores in
      one tap, highlighting the active brand by URL. *tutorial:* the browser
      opens on a single brand with no switcher.
- [ ] No visible URL bar. *source:* the address is never shown. *tutorial:* the
      page host is shown as the header subtitle.

## Add-to-wishlist flow

- [ ] Inline quick-create wishlist, no dead-end detour. *source:* the modal
      creates a wishlist inline and continues the add. *tutorial:* the
      zero-wishlist path navigates away to the wishlist form, abandoning the
      draft.
- [ ] Editable wish name before save. *source:* the modal exposes an editable
      item-name field. *tutorial:* the name is fixed from the draft; the modal
      only picks a wishlist.
- [ ] Last-used-wishlist preselect. *tutorial:* the modal always preselects the
      first wishlist in the list; polish preselects the one you last added to, so
      the common case is a single confirm.
- [ ] Paste a URL to scrape. *source:* the add-a-wish entry accepts a pasted
      product URL, normalizes it, and scrapes it, alongside picking a
      storefront or brand. *tutorial:* the manual wish form and the
      browse/scrape flow are separate; there is no paste-a-URL entry.

## Directories (storefronts and brands)

- [ ] Image-forward grid layouts (storefront card grid, brand logo wall)
      replace the row lists. *source:* a two-column image card grid.
      *tutorial:* a `DirectoryLayout` list of `CatalogRow` rows with a small
      logo each.
- [ ] Masonry product grid driven by real image aspect ratios. *source:* the
      storefront's products lay out by their true image aspect ratios.
      *tutorial:* a uniform product tile grid.

## Shared tiles and headers

- [ ] Render the cover photo. *source:* a per-user cover band (from the default
      presets) heads the profile, Home, and wishlist screens. *tutorial:* the
      cover photo is captured and stored but never displayed; every header uses
      the plain floating idiom.
- [ ] Image-forward wish tiles with glass chrome. *source:* the wish tile is an
      image-filling rounded card with a blurred glass price overlay on the image
      and a blurred store/brand badge in the corner. *tutorial:* an
      image-plus-caption `ArtTileCard` with the cost as text below and a solid
      origin-logo badge in the corner.
- [ ] Resolve the origin-badge overlap. The store-logo origin badge must not
      collide with other on-tile chrome once tiles go image-forward (flagged in
      PR #74: the store-logo badge overlapping the category pill on wish tiles).

## Auth and onboarding

- [ ] Cosmetic-only convergence. Sign-in, sign-up (email plus code
      verification and OAuth), and the onboarding tutorial already hold
      functional parity; only styling and onboarding-slide copy need a polish
      pass here.
