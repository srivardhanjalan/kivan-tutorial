# Step 06 — Media

Photos arrive, and the backend owns their whole life. A profile and a cover
image upload straight to S3 through a short-lived presigned URL — the API
never touches the bytes — landing first under a `pending/` prefix. Saving
your profile *claims* that pending object into permanent storage; walking
away leaves it to an S3 lifecycle rule that expires anything unclaimed after
a day. Nothing the client says can create an orphan, and there is no
client-facing delete at all: replacement and account-deletion cleanup happen
server-side, so the bucket can't accumulate junk you can't see.

**The exact delta this step adds:**
[PR #42 — Files changed](https://github.com/srivardhanjalan/kivan-tutorial/pull/42/files)

## Run it locally

Same two terminals as step 05. The photo lifecycle needs a real bucket, so
uploads only work against a deployed backend (below) — locally,
`PHOTOS_BUCKET_NAME` is empty and every stored URL is treated as external and
passes through untouched, so the app still boots and every other screen works.

```bash
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
CLERK_SECRET_KEY=sk_test_... .venv/bin/uvicorn app.main:app --reload
```

```bash
cd frontend
npx expo install            # picks up expo-image-picker at the SDK-matched version
npx expo start -c --localhost
```

## Deploy it

Unlike step 05, this step **adds infrastructure** — the photos bucket and its
lifecycle rules, a customer-managed KMS key, the Clerk secret re-encrypted onto
that key, and the S3 + `kms:Decrypt` grants on the App Runner instance role. On
a stack that's already up, `terraform apply` creates them, then the image
redeploys:

```bash
cd infra
terraform apply              # + bucket, lifecycle, KMS key, re-encrypted secret, grants
./scripts/deploy.sh          # rebuild :latest so the backend can sign/claim
```

The App Runner service must be replaced (not just redeployed) to pick up the
new secret encryption — `terraform apply` handles that.

Deploying fresh? Follow step 03's staged bootstrap (registry → push → apply),
then the same line. The bucket name is derived once in `s3.tf`
(`kivan-<env>-photos-<account-id>` — S3 names are globally unique) and injected
into the container as `PHOTOS_BUCKET_NAME`, so nothing is hand-configured.

**Try it end to end:** open the gear on Home → **Photos** → set a profile
photo and a cover photo from your library, then **Save Photos**. The preview
appears the instant each upload lands (that *is* the success signal — no
toast), and both survive a reload because the save claimed them out of
`pending/`. Replace one and the old object is deleted; delete your account and
both are swept.

## What's here

```
backend/
  app/routes/upload.py         + POST /upload/signed-url — a 5-minute presigned
                                 PUT into pending/, profile & cover only
  app/utils/s3_helpers.py      + claim_pending_photo / delete_photo_by_url /
                                 get_signed_url_for_s3 — the whole lifecycle
  app/routes/users.py          PUT /me now claims the new photo and deletes the
                                 replaced one; DELETE /me sweeps both objects
  app/models/users.py          + cover_photo, + image_url/cover_photo on the
                                 update body, + a serializer that re-signs reads
  app/config.py                + photos_bucket_name (injected by App Runner)
  app/main.py                  includes the upload router
infra/
  s3.tf                        + the private bucket: public-access blocked,
                                 versioned, encrypted, CORS, three lifecycle
                                 rules (the pending/ 1-day expiry backstop), and
                                 an S3 grant scoped to this bucket's ARN
  kms.tf                       + a customer-managed key for the secret — the
                                 default aws/ssm key can't be decrypted by App
                                 Runner at injection time
  ssm.tf                       the Clerk secret, now encrypted with that key
  iam.tf                       + the instance role's kms:Decrypt on that key
  apprunner.tf                 + PHOTOS_BUCKET_NAME from the bucket
frontend/                      step 05's app plus:
  src/services/ImageUploadService.ts  pick → presigned URL → PUT bytes to S3
  src/hooks/usePendingImageUpload.ts  one image slot's pending/claim state,
                                      reusing useAsyncAction for load + errors
  src/components/ImageUploadField.tsx the label + preview + camera button
  src/services/api.ts          + the signed-url contract and cover_photo
  src/screens/SettingsScreen.tsx   + a Photos section: profile + cover, one
                                     "Save Photos" that claims both
  app.json                     + NSPhotoLibraryUsageDescription (the picker
                                 crashes without it)
  package.json                 + expo-image-picker
```

## The ideas this step plants

- **The client is never in the write path.** It uploads to S3 directly with a
  URL the backend mints and reads through URLs the backend signs — the API
  handles zero bytes. The bucket is fully private; a stored URL isn't
  fetchable until `get_signed_url_for_s3` re-signs it on read.
- **Pending → claim → expire.** An upload is provisional (`pending/…`) until a
  save promotes it to the permanent keyspace; a save that never comes costs
  almost nothing because the lifecycle rule reclaims the object *and its bytes*
  within a day (the bucket is versioned, so the rule expires the noncurrent
  version too, not just the current one). Orphans are impossible by
  construction, not by cleanup discipline.
- **Cleanup is backend-owned.** Replacing a photo deletes the old object;
  deleting your account sweeps both. There is deliberately **no** client
  delete endpoint — the one this app used to have shipped a no-op ownership
  check that let anyone delete anyone's photo.

## Gotchas

- **A private bucket means every read must be re-signed.** Persist the raw S3
  URL, forget the read-side serializer, and every image 403s. The serializer
  on the `User` model signs `image_url` and `cover_photo` on the way out;
  external URLs (a Clerk avatar) pass through unsigned.
- **Two windows, don't confuse them.** The presigned PUT lasts **5 minutes**
  (long enough for a phone photo, useless if leaked); the `pending/` sweep is
  **1 day** (the abandon-an-upload backstop). Different jobs, different clocks.
- **The bucket name is global.** Unlike the region-scoped DynamoDB table, an S3
  name is unique across all of AWS — hence the account-id suffix, derived in
  `s3.tf` and injected, never hand-typed in two places that can drift.
- **`expo-image-picker` needs the iOS permission string.** No
  `NSPhotoLibraryUsageDescription` in `app.json` and the picker crashes on
  open. Install the package with `npx expo install`, never a hand-pinned
  version — it must match Expo Go's renderer.
- **App Runner can't inject an SSM secret on the default key.** The managed
  `aws/ssm` key only allows decryption *through the SSM service*, and App
  Runner's secret injection doesn't qualify — so the SecureString is encrypted
  with a customer-managed key (`kms.tf`) the instance role is granted
  `kms:Decrypt` on. Miss this and the service dies with a bare `CREATE_FAILED`
  and no logs, long before the container starts.
- **Presigned URLs must be SigV4.** boto3 can still emit deprecated SigV2 URLs
  that only work in pre-2014 regions like `us-east-1`; the S3 client pins
  `signature_version=s3v4` so uploads and reads work in any region.

## Done when

- [ ] Setting a profile photo shows an instant preview and survives a reload.
- [ ] The same for a cover photo — both are real S3 uploads.
- [ ] The bucket blocks all public access; images load only via signed URLs.
- [ ] Replacing a photo leaves no old object behind; deleting the account
      sweeps both.
- [ ] An upload you never save is gone within a day (the `pending/` rule).

Next: `07-collections` — the wishlists and wishes the whole app exists for,
with photos that ride exactly this lifecycle.
