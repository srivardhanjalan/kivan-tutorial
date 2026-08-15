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

## Wishlist form

- [ ] Pinned editor CTA. *source:* `EditorLayout` pins the save action in a
      footer below the scroll, labeled with the life-event icon ("Start
      Adding Wishes"). *tutorial:* an inline `PrimaryButton` that scrolls
      with the form inside `FloatingHeaderLayout`.
- [ ] Post-create flow. *source:* `navigation.replace` lands the user inside
      the new wishlist, ready to add wishes. *tutorial:* `goBack()` returns
      to the previous screen.
- [ ] Delete lives with the form. *source:* Delete Wishlist sits inside the
      wishlist settings editor. *tutorial:* delete is an action on the
      wishlist detail screen. (Both reachable: placement only.)

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

## Notifications (step 11)

The notifications feature lands in step 11 (in-app only; email is step 12,
events are step 13). Its screens ship in the step's frontend phase, so their
visual/workflow convergence items are added here THEN, not now. What this entry
records today is the set of deliberate BACKEND divergences from the source: the
tutorial fixes three source defects on purpose, so the polish pass (which
converges the tutorial toward the finished design) must NOT "restore" them.

- [ ] Mute-field naming. *source:* the settings model stores `mute_follows`
      (plural) while the consumer derives `mute_{type}` = `mute_follow`
      (singular), so a follow can never actually be muted. *tutorial:* the four
      flags are named `mute_follow`/`mute_wishlist_created`/`mute_wish_added`/
      `mute_wishlist_loved` so the derivation matches exactly. Keep the singular
      names; do not converge to the source's plural.
- [ ] Notification TTL is written, not just declared. *source:* the table
      enables a 90-day TTL on a `ttl` attribute no code ever sets, so nothing
      expires (a lying config). *tutorial:* the consumer writes `ttl` (epoch
      seconds, 90 days out) on every row, so the reaper actually runs. Keep the
      writer.
- [ ] Wish notifications deep-link into their list. *source:* a `wish_added`
      notification's enriched resource carries `{id, type, name}` only, a
      dead-end tap (no route to the screen that shows the wish). *tutorial:* the
      wish resource also carries `wishlist_id`, so the tap opens the wish inside
      its parent list. Keep `wishlist_id` on the wish resource.
The step's frontend phase ships the feed, the settings screen, and the tab
badge in the tutorial's simpler idiom. Their visual/workflow divergences from
the finished design (behavior held at parity):

- [ ] Delete affordance. *source:* swipe-to-delete. A `Swipeable` row
      (react-native-gesture-handler) reveals a translucent trash action on a
      left-swipe. *tutorial:* long-press a row opens the shared `ConfirmModal`,
      then delete. The app carries no gesture-handler dependency, so the delete
      reuses the existing confirm idiom instead of adding one; polish brings the
      swipe.
- [ ] Notification-row surface. *source:* a shared `ListItemCard` (a raised card
      with the avatar, the type badge, title, meta, and an `unread` treatment)
      used across features. *tutorial:* a lighter in-screen `NotificationRow`
      (avatar with the type-badge overlay, the message, the timestamp, and an
      unread dot) in plain rows. The app has no `ListItemCard`.
- [ ] Header unread pill placement. *source:* the unread-count pill sits inline
      beside the large "Notifications" title in a split header. *tutorial:* the
      pill sits in the right header cluster next to the mark-all action, because
      the tutorial's `FloatingHeaderLayout` takes a plain string title with a
      single `headerRight` slot (no split-header).
- [ ] Mark-all-read control. *source:* a "Mark all read" text button in the
      header. *tutorial:* an icon action (`checkmark-done-outline` via
      `HeaderIconButton`), matching the tutorial's icon-only header convention.
- [ ] Per-type icon colors. *source:* raw hex literals (`#4CAF50`, `#FF9800`,
      `#E91E63`) beside `Colors.primary` in the screen. *tutorial:* the three
      literals become semantic `Colors` tokens (`notifyWishlistCreated`,
      `notifyWishAdded`, `notifyWishlistLoved`) and `follow` reuses
      `Colors.primary`, with no redundant `notifyFollow` alias, per the token rule
      (a value used with semantic meaning becomes a token; duplicate names
      collapse). This is a token-hygiene divergence only; the four colors match.
- [ ] Settings surface. *source:* grouped `SettingItemList` cards and a
      primary-tinted info card with an icon; the switch track is a primary-alpha
      wash (`Colors.primary + '40'`). *tutorial:* plain hairline-divided toggle
      rows, a plain muted info line with an info icon (no tinted-card surface),
      and a solid primary switch track with a white thumb, avoiding an
      alpha-tint color literal for a single-use surface. The inverted switch
      semantic (ON = receiving, OFF = muted) is held exactly.
- [ ] Mark-read timing. *source:* awaits the mark-read request, then flips the
      row read. *tutorial:* flips the row and drops the unread count
      optimistically, then fires the request (the next focus reload reconciles a
      failure). A workflow refinement, not a convergence target.

## Notifications email (step 12)

Step 12 adds the email leg: the same consumer that writes a notification row
now also mails the recipient a copy via Mailgun. It ships one new preference
(`email_notifications`, default on) and, deliberately, more than the source
did. These are backend/secrets divergences plus one frontend ADD, so the polish
pass must NOT "restore" the source's simpler-but-worse shape.

- [ ] Email preference has a real control. *source:* `email_notifications` is
      honored by the Lambda but has NO UI anywhere: the only way to flip it is a
      raw `PUT /settings` call, so a real user can never turn email copies off.
      *tutorial:* the notification settings screen gains an **Email** section
      with an "Email copies" switch bound to that flag (NOT inverted: ON = copies
      on, unlike the mute rows). This is a deliberate ADD (the tutorial exposes a
      preference the source hid); keep the toggle, do not converge it away.
- [ ] Mailgun API key lives in SSM, not a plaintext Lambda env var. *source:*
      injects `MAILGUN_API_KEY` straight into the Lambda's `environment.variables`
      (plaintext at rest), inconsistent with the same repo's App Runner secrets,
      which go through SSM SecureStrings. *tutorial:* the key is an SSM
      SecureString the handler fetches and decrypts once at cold start; only the
      non-secret domain and from-address ride as plain env. Keep the SSM path.
- [ ] Settings GET and PUT agree on `email_notifications`. *source:* the GET
      defaults object omits `email_notifications` while the PUT allow-list
      includes it, an asymmetry that lets a brand-new user's GET and their first
      PUT disagree on the field's presence. *tutorial:* both the GET defaults
      (via the model) and the PUT allow-list carry it. Keep them symmetric.
- [ ] One settings read per notification, not two. *source:* the consumer's
      mute check and its email-opt-in check each `get_item` the same settings row
      (two reads of one record per notification). *tutorial:* the row is read
      once and passed to both checks. Keep the single read.
- [ ] Email body has no per-type copy (parity note). *source:* one generic
      template for every type, the type shown only as a "Type: ..." label.
      *tutorial:* the same single template (no per-type subjects or bodies were
      invented). Not a divergence; recorded so a later step does not mistake the
      generic body for a gap to fill unless the finished design asks for it.

## Events (step 13, phase A)

Step 13 lands the events feature. Phase A ships the data model, core CRUD, and
wishlist linking; the invitee/RSVP surfaces and the notification legs (with
their own divergences) follow in later phases. As with notifications, some of
what phase A records is deliberate BACKEND divergence the polish pass must NOT
"restore".

Backend (deliberate, do-not-restore):

- [ ] Two source GSIs omitted for want of a reader. *source:* the events table
      carries a `CreatedByIndex` and the event-wishlists join carries a
      `WishlistIdIndex`. *tutorial:* neither is created: "events I created" is a
      subset of "events I host" (the creator is auto-inserted as a host), served
      by `event_hosts.UserIdIndex`, and the join is only ever read by `event_id`.
      A GSI is a second write; keep them omitted until a query needs them.
- [ ] Field-scoped, guarded event update. *source:* PUT reads the item, mutates
      it in memory, and `put_item`s the whole thing back (a full-item rewrite
      that can revert a field a concurrent host just changed). *tutorial:* an
      `update_item` sets only the fields the body carries, guarded by
      `attribute_exists(id)`, and re-asserts the sparse `public_marker`
      (SET on public, REMOVE on private) so the discovery index never drifts.
      Keep the field-scoped write.
- [ ] Retry-safe delete cascade order. *source:* deletes the event row FIRST,
      then its child rows (an interrupted cascade orphans hosts/invitees/links
      with no event to find them by). *tutorial:* deletes the cover object and
      the child rows first, the event row LAST, so an interrupted cascade leaves
      only states a retry can finish (the wishlist-cascade discipline). Keep the
      order.
- [ ] Public feed pagination is an in-Python slice (parity note / simpler
      idiom). *source & tutorial:* both Query the sparse `PublicEventsIndex` for
      every page, then slice `[offset:offset+limit]` in Python: honest and one
      partition while the public feed is small. Recorded so polish does not
      mistake it for a bug; the convergence is a real cursor when the feed
      outgrows a screen's worth of pages.
- [ ] `event_type` is an unvalidated free string (parity note). *source &
      tutorial:* the event's life-event id is stored verbatim and never checked
      against the life-events table, exactly the laxness a wishlist's
      `life_event_id` carries. Not a defect to "fix"; an unknown id just renders
      the neutral wash client-side.

Frontend (visual/workflow convergence, behavior held):

- [ ] One event form for create and edit. *source:* a `CreateEventScreen`
      (with a REQUIRED single-select wishlist grid and a co-host
      `UserPickerSection`) and a separate `EventSettingsScreen` (edit plus
      delete). *tutorial:* one `EventFormScreen` for both (the wishlist-form
      idiom), an OPTIONAL wishlist link via a `SelectableList` on create, and no
      co-host picker (co-hosts arrive with the invitee surfaces). Delete lives on
      the detail screen, and the CTA is an inline `PrimaryButton` that goes back
      on save, exactly the wishlist-form divergences above (pinned `EditorLayout`
      CTA, `replace`-into-detail, delete-in-settings). Both reachable; placement
      and merge only.
- [ ] Date entry is a plain text field. *source:* a `DatePickerField` (a real
      datetime picker). *tutorial:* a `FormInput` with a `YYYY-MM-DD` placeholder
      this step; the app carries no date-picker dependency yet, and
      `formatEventDate` reads the stored value defensively. Polish brings a
      picker.
- [ ] Privacy control. *source:* a `PrivacySelector`. *tutorial:* a labeled RN
      `Switch` ("Public event"), the notification-settings toggle idiom.
- [ ] Event detail. *source:* a cover BAND with location/type/date badges, an
      RSVP button and modal, a guests view, overlapping host avatars, invite
      modals, a share action, and a `WishlistCardGrid` + masonry `WishCard`
      view. *tutorial:* an `ArtTile` pastel/image hero, plain type/date/location
      and "Hosted by" text rows, the linked wishlists as a read-only
      `WishlistGrid`, and host-only edit/delete in the header. RSVP, guests,
      invites, and share arrive in later phases.
- [ ] Event card and My Stuff surfacing. *source:* an `EventRailCard`, a
      full-width duotone-gradient banner with a date chip and a Hosting/Invited
      pill, listed vertically. *tutorial:* an `EventCard` (`ArtTileCard`) washed
      in the event type's pastel with the date as its subtitle, in the My Stuff
      `TileGrid` behind a "New Event" add tile; hosting only this step (invited
      surfaces with RSVP).

## Events (step 13, phase B)

Phase B adds invitees and RSVP: the invite routes (create-time and add-later),
the RSVP PATCH, and the detail-screen Guests view with its invite flow. The
notification legs still wait for phase C. As with phase A, some of what phase B
records is deliberate divergence the polish pass must NOT "restore".

Backend (deliberate, do-not-restore):

- [ ] No standalone `GET /events/{id}/invitees` route. *source:* a
      `GET /events/{id}/invitees` returning raw `EventInvitee` rows, plus a
      `getEventInvitees` API client method. *tutorial:* neither exists. The
      detail response already carries the user-enriched invitees the Guests list
      needs, and the source's client method had NO caller (its own
      EventDetailScreen reads the detail's invitees). One invitee list, one
      place; keep it folded into the detail response.
- [ ] One shared add-invitees helper. *source:* `create_event` and the
      add-invitees route each duplicate the user/email split (batch-validate
      ids, write user rows, write email rows). *tutorial:* one `add_invitees`
      helper (with `_is_invited` / `_put_invitee`) that both create-time and
      add-later call, so the split lives once (the step-13 study flagged the
      duplication). Keep it unified.
- [ ] RSVP status validated at the model boundary. *source:* the PATCH route
      hand-checks `rsvp_status` against a list and raises 400. *tutorial:*
      `UpdateRsvpRequest.rsvp_status` is a `Literal["going","maybe","not_going"]`,
      so an out-of-set value is a 422 at the boundary and the route carries no
      validation branch. Behavior note: an invalid status is now 422, not 400.
      Keep the Literal.
- [ ] No notification calls yet (deferred to phase C, not a placeholder).
      *source:* `create_event` and `add_event_invitees` call
      `notify_event_invitation`. *tutorial:* neither call exists in phase B, and
      there is no dead placeholder hook; phase C adds the calls at the real
      sites and `add_invitees` will thread out the newly-added user ids then (it
      returns None for now). Restore in phase C, not before.
- [ ] `is_invitee` derived; `is_event_invitee` removed. *source:* a separate
      `is_event_invitee` helper does targeted GetItems for the detail access
      gate. *tutorial:* `get_enriched_invitees` already reads the invitee list
      for the Guests view and reports `my_rsvp_status`, and `is_invitee` falls
      out of it (None means not invited), so the standalone helper was orphaned
      and deleted. Keep it derived.

Frontend (visual/workflow convergence, behavior held):

- [ ] RSVP is an inline chip row, not a modal. *source:* a four-state RSVP
      button that auto-opens a Going/Maybe/Can't Go modal ~500ms after load for
      pending invitees. *tutorial:* an always-visible `RsvpControl` chip row
      (the life-event-selector chip look) under a "Your RSVP" header, no modal
      and no timer. Both set the same RSVP.
- [ ] One invite modal, and no "emailed" claim. *source:* separate add-invitee
      and invite-by-email modals, with a toast "Invitation emailed to X".
      *tutorial:* one `InviteGuestModal` on the shared `ModalCard`/`AddToWishlist`
      surface, carrying the Discover user search and an email field; the email
      toast reads "Invited X" because NO mail is sent to an email invitee (the
      study's negative result), so the source's copy would lie. Keep the truthful
      copy.
- [ ] Guest list is a stacked section, not a view toggle. *source:* a
      wishes/guests segmented toggle swaps the body between a `WishlistCardGrid`
      and the guest list, whose rows carry overlapping-avatar host chrome.
      *tutorial:* Guests and Wishlists are both plain stacked sections
      (`SectionHeader` + rows); `EventGuestList` is Avatar + name + RSVP rows
      with a host-only remove. Non-hosts still see only "going" guests (behavior
      held).
- [ ] My Stuff invited surfacing. *source:* hosting and invited merged in one
      list, each `EventRailCard` carrying a Hosting/Invited pill. *tutorial:* a
      separate "Invited" section shown only when non-empty (no empty prompt to
      plan someone else's event), `EventCard` tiles whose subtitle appends my
      RSVP ("Sep 1, 2026 · Going"). The `RSVP_LABEL` map is shared between the
      guest list and the tile so the wording can't drift.
- [ ] `useFetch` gained a `refetch`. *note:* `useFetch` now returns `refetch`
      (its existing `run`), so EventDetailScreen can re-pull the detail after an
      on-screen RSVP, invite, or remove whose server-computed result
      (`my_rsvp_status`, `is_invitee`, enriched invitees) can't be reconstructed
      client-side. Additive; existing callers are untouched.
