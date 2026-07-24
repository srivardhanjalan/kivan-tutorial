# Step 07 — Collections

The app finally becomes the thing it exists to be: wishlists that hold wishes,
each wishlist filed under one of nine seeded occasions (birthday, wedding,
graduation… and a catch-all *general*). A wishlist has a single owner — the
account that created it — and every read and write is checked against that one
`created_by`. A wish's access is simply its wishlist's access: every wish route
funnels through the same ownership gate, so there's one rule, in one place, for
the whole domain. Deleting a wishlist cascades — its wishes and every photo they
uploaded go with it. And the photos ride step 06's pending → claim → expire
lifecycle unchanged — the upload kind-list grows two entries, and the shared
update-planner grows teeth: now that three routes store photos, it also checks
that a pending key belongs to the caller and actually exists before claiming it.

**The exact delta this step adds:**
[PR #48 — Files changed](https://github.com/srivardhanjalan/kivan-tutorial/pull/48/files)

## Run it locally

Same two terminals as step 06. The three new DynamoDB tables are read through
your local AWS credentials (boto3's standard chain), so a full local run wants
the tables to exist — apply the stack and seed the life-events table (below)
first, or expect the collections screens to error until they do. Everything else
(auth, profile, the photo lifecycle's local pass-through) boots exactly as
before.

```bash
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
CLERK_SECRET_KEY=sk_test_... .venv/bin/uvicorn app.main:app --reload
```

```bash
cd frontend
npx expo install            # SDK-matched versions, never hand-pinned
npx expo start -c --localhost
```

## Deploy it

This step **adds infrastructure** — three DynamoDB tables (`wishlists`,
`wishes`, `life-events`) and a per-table IAM grant on the App Runner instance
role. On a stack that's already up, `terraform apply` creates them, the image
redeploys, and then a one-time seed populates the reference table:

```bash
cd infra
terraform apply                                     # + 3 tables, + per-table IAM
./scripts/deploy.sh                                 # rebuild :latest with the new routes
AWS_REGION=us-east-1 ENVIRONMENT=production \
  ../backend/.venv/bin/python scripts/seed_life_events.py   # 9 occasions (idempotent)
```

(The seed runs on the backend venv from "Run it locally" — create that first if
you came straight here to deploy. `ENVIRONMENT` must match your terraform
`environment` and `AWS_REGION` its `aws_region` — `production` / `us-east-1`
are the series defaults; change both sides of a pair or neither.)

Deploying fresh? Follow step 03's staged bootstrap (registry → push → apply),
then the same three lines. The seed is **not optional and not one-off-forgettable**:
without it `GET /life-events` returns an empty list and the wishlist-creation
screen has no occasions to offer — run it once after every fresh apply, before
you use the app. It's idempotent (upsert by id), so re-running is harmless.

**Try it end to end:** open the **My Stuff** tab → **Create a wishlist** (the
empty state's button; once you have one, the same form is the **New Wishlist**
tile) → name it (required — save is blocked without one), pick an occasion,
optionally set a wishlist image → save. (Home now shows it too — the
"Your wishlists" rail is the content step 06's Home promised.) Open the
wishlist → **Add a wish** (again the empty state's button, becoming the **New
Wish** tile once the wishlist has one) → give it a name, a cost, a link, a
photo → save. Tap the wish → **Mark as
fulfilled** (the state flips instantly, no reload). Edit and delete live in each
detail header. Delete the wishlist and every wish and photo under it is swept;
delete your whole account (Settings danger zone) and all your collections go with
it.

## What's here

```
backend/
  app/routes/wishlists.py      + wishlist CRUD, GET /wishlists/me (a real
                                 CreatedByIndex Query — never a Scan), and a
                                 delete that cascades to wishes + photos
  app/routes/wishes.py         + wish CRUD, POST /{id}/complete|uncomplete, and
                                 GET /wishlists/{id}/wishes (WishlistIdIndex).
                                 Every route funnels through get_owned_wishlist
  app/routes/life_events.py    + GET /life-events — auth-gated Scan over the
                                 seeded taxonomy, ordered by display_order
  app/utils/wishlist_access.py + get_owned_wishlist (the one 404/403 gate) and
                                 delete_wishlist_and_contents (the cascade)
  app/utils/dynamo.py          + three shared helpers: query_all_pages (follows
                                 LastEvaluatedKey so a >1 MB collection never
                                 silently truncates); get_item_or_404 (the one
                                 get-or-404, with the empty/>2048-byte key guard
                                 that makes an impossible id a 404, not a 500 —
                                 the fetch half of every ownership gate); and
                                 update_item_fields (the guarded, field-scoped
                                 write every update funnels through — a stale
                                 full-item rewrite can't clobber a concurrent
                                 change or resurrect a deleted row)
  app/utils/s3_helpers.py      plan_photo_update lands here, shared and hardened:
                                 key-based compare (never raw signed URLs), plus
                                 an owner check and a pending-key existence gate
                                 now that three routes store photos
  app/routes/upload.py         the resource_type Literal union gains
                                 wishlist_photo / wish_photo
  app/routes/users.py          DELETE /me now sweeps the account's wishlists via
                                 the shared cascade; _plan_photo_update extracted
  app/models/{wishlists,wishes,life_events}.py  the three records; the photo-
                                 bearing two (wishlist, wish) re-sign image_url
                                 on read via the same signing helper as User
                                 (a life event is a fixed emoji, no photo)
  app/database.py / config.py  + the three table handles and their names
  app/main.py                  includes the new routers (wishes mounts twice —
                                 its own prefix plus the /wishlists nested list)
infra/
  dynamodb.tf                  + wishlists (CreatedByIndex), wishes
                                 (WishlistIdIndex), life-events (no index)
  iam.tf                       + a least-privilege statement per table: the
                                 running role only ever *Scans* life-events;
                                 GetItem/PutItem are withheld (seeding is a
                                 developer-credential job, not the runtime role's)
  scripts/seed_life_events.py  + the 9-occasion seeder (idempotent upsert)
frontend/                      step 06's app plus:
  src/screens/HomeScreen.tsx           + a "Your wishlists" rail — the 6 newest,
                                       each linking into its detail (the content
                                       step 06's Home promised)
  src/screens/MyStuffScreen.tsx        the wishlist grid (add tile + refetch on focus)
  src/screens/WishlistDetailScreen.tsx a pastel/photo hero + the wishes grid
  src/screens/WishlistFormScreen.tsx   create/edit a wishlist (name, occasion, photo)
  src/screens/WishDetailScreen.tsx     image, cost, link, and the got-it toggle
  src/screens/WishFormScreen.tsx       the manual add-wish form — built from
                                       scratch for this step: the finished app
                                       has no manual form at all; there, wishes
                                       arrive via 08's catalog and 09's browser
  src/components/ArtTile.tsx           the one clipped art block — owns the
                                       "placeholder only when no image" rule via
                                       a `placeholder` prop; the tile family
                                       (TileCaption, WishlistCard, WishCard,
                                       AddTileCard, TileGrid, the glyphs) rides it
  src/components/LifeEventSelector.tsx the occasion picker
  src/constants/lifeEventPastels.ts    the taxonomy-keyed pastel washes the
                                       wishlist card + detail hero read
  src/hooks/usePendingImageUpload.ts   + seed-at-mount and `changedUrl` — the
                                       hook itself answers "did the upload change
                                       anything", so no caller re-tracks the URL
  src/hooks/{useLifeEvents,useConfirmedDelete,useAppNavigation}.ts  the shared
                                       taxonomy fetch, confirm-then-delete, and
                                       typed navigation helpers
  src/utils/formatCost.ts              cost as a display string, currency symbol
                                       from one AppConfig constant
  src/services/api.ts                  + the wishlist / wish / life-event contracts
```

## The ideas this step plants

- **One owner, one gate.** A wishlist's `created_by` is its sole owner, and
  `get_owned_wishlist` is the *only* place access is judged (404 if missing, 403
  if not yours). Every wish route calls it — a wish's access is its wishlist's
  access, never re-derived — and `GET /wishlists/me` reads that ownership off a
  real `CreatedByIndex` Query, never a Scan of the whole table. Co-owners are a
  deliberate step-14 problem; the model is single-owner today so the rule can be
  this simple.
- **Delete means delete.** `delete_wishlist_and_contents` drops the wishlist, its
  wishes (batched off `WishlistIdIndex`), and every photo any of them uploaded.
  Account deletion reuses the exact same cascade over your wishlists — one
  teardown path, two callers, no orphaned rows and no orphaned bytes.
- **Reuse the lifecycle, don't rebuild it.** Wishlist and wish photos are just
  two more `resource_type` values on step 06's presign → `pending/` → claim →
  expire machinery. `plan_photo_update` moved into `s3_helpers` the moment a
  third route needed it — and sharing it forced it to grow up: it compares by S3
  *key* (not raw signed URL), refuses a pending key another user uploaded, and
  `head_object`-checks the key exists before any claim. One hardened path, three
  routes storing photos one identical way.
- **Least privilege is per table.** The running role gets exactly the DynamoDB
  actions each table's routes use — and for life-events that's `Scan` and nothing
  else. Writing the reference data is a job for your developer credentials, so
  the runtime role can't put or overwrite an occasion even if the code tried.
- **Reference data is seeded, not shipped in code.** The nine occasions live in a
  table, populated by an idempotent script. The taxonomy can grow without a
  redeploy, and the model ignores extra item fields so a later step can widen the
  seed without touching Python.

## Gotchas

- **A GSI has no range key — sort in the handler.** `CreatedByIndex` and
  `WishlistIdIndex` are hash-only, so DynamoDB returns items in no useful order.
  `GET /wishlists/me` sorts newest-first and the wishes listing oldest-first, in
  Python, after the Query. (ISO timestamps sort lexically = chronologically, so
  this is a plain string sort.)
- **A single Query page truncates at 1 MB.** DynamoDB caps one page and hands
  back a `LastEvaluatedKey`; read only the first page and a large collection
  silently loses its tail. Both Query-backed lists (wishlists, wishes) go through
  `query_all_pages`, which loops until the key is exhausted — the whole reason
  that helper exists. (Life-events reads a single Scan page on purpose: nine
  reference rows will never graze the cap.)
- **DynamoDB rejects `float`.** A wish's `cost` is stored as a `Decimal` and
  coerced back to `float` on read. The models bound `cost` at validation
  (`ge=0, le=1e12, allow_inf_nan=False`) — `ge=0` is the plain no-negative-price
  rule, but the other two each stop a distinct DynamoDB 500 that would otherwise
  fire long after the 422 should have: JSON's parser lets `Infinity`/`NaN`
  through (`allow_inf_nan=False` catches those), and DynamoDB rejects any finite
  magnitude past ~9.9e125 (`le=1e12` keeps a valid number far under that
  ceiling). Drop either of those two and a well-formed body blows up the
  serializer instead of getting a clean 422.
- **One currency, one place.** Cost is a plain number; the symbol (`₹`) is a
  single `AppConfig.currencySymbol` every cost adornment reads. Per-user currency
  (a picker + conversion) is a deliberate step-09 deferral — this keeps the swap
  point to exactly one constant until then.
- **App Runner images build ONLY on the colima-rosetta docker driver.**
  buildx/QEMU builds on Apple Silicon pass locally and die on AWS with
  `CREATE_FAILED` and no logs. `deploy.sh` builds on the right context — don't
  swap it.
- **`CREATE_FAILED` with no logs on a *fresh* create — just retry the apply.**
  Even with the instance role, its grants, and the `apprunner.tf` `depends_on`
  all in place, a fresh `terraform apply` intermittently dies with a bare
  `CREATE_FAILED` and no logs — AWS lists "temporary issues with the underlying
  services" among the causes. Terraform taints the failed service, so re-running
  `terraform apply` replaces it and it comes up `RUNNING`, identical config, no
  change. Not every failure has a config root cause; a plain retry is the fix.

## Done when

- [ ] Create a wishlist under an occasion → it shows in My Stuff newest-first,
      the moment you return.
- [ ] Add a wish with a name, cost, link, and photo → open it → the cost renders
      with the currency symbol and the photo loads via a signed URL.
- [ ] Mark a wish fulfilled → the state flips with no reload; reopen it and the
      state persisted.
- [ ] While you still have an account: `curl $API/wishlists/me` with no token
      → 401; `GET /wishlists/{id}` on a second account's wishlist → 403; on a
      made-up id → 404. (Run this BEFORE deleting your account below — after
      that, no new token can be minted.)
- [ ] Delete a wishlist → its wishes and their photos are gone (no orphan rows,
      no orphan objects).
- [ ] Delete your account → every wishlist you owned is swept along with it.

Next: `08-storefronts` — curated stores with products, so a wish can come from a
catalog instead of the hand-typed form built here.
