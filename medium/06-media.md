# Photos Without the Exposure

*Zero to Shipped, step 6. Profile and cover photos that travel straight from the phone to S3, never touch the backend, and can't leak.*

![Zero to Shipped 06 hero: a profile screen with its profile and cover photos set, beside a terminal showing the private S3 bucket, the presigned upload into pending/, the claim on Save, and the one-day expiry](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-hero-06.png?v=PLACEHOLDER)

*Zero to Shipped, step 6 of a production social-wishlist app built one shippable step at a time on Expo, FastAPI, and AWS.*

*[All the code](https://github.com/srivardhanjalan/kivan-tutorial) is on GitHub, every step a runnable folder.*

## The problem

The app is about to hold two photos, a profile shot and a cover, both in Amazon S3. Drawing the screen is the easy part; storing a user's photo safely is the work, because it is four problems at once:

- **The bucket can't be public.** One leaked URL would expose every user's photos.
- **The phone can't hold AWS credentials.** No mobile app can ship bucket keys.
- **A private file still has to render on screen.** A locked-down object won't load from a plain URL.
- **A photo nobody saved can't live forever.** Someone picks an image, backs out, and that storage piles up.

## What we build

A private S3 pipeline that answers all four. The bucket is a sealed box, no public access ever, which closes the first problem at the door. The phone never holds a key: it asks the backend for a presigned upload, and the photo bytes travel straight from the phone to S3, never through the backend. Every read comes back as a freshly signed link, so a private file still renders on demand. And an upload lands in a holding area, becoming permanent only on Save, with anything abandoned expiring about a day later. The backend owns every file's whole life; only the bytes skip it. That work splits into the sections below, built in order.

**What we need:** step 5 complete, an AWS account, and the step-3 deploy in place. Photos need a real bucket, so this step runs against a deployed backend.

**Time:** about 60 to 90 minutes, most of it the first deploy.

**The code:** the snippets below are shown as images; the full, copyable source lives in [PR #42: Files changed](https://github.com/srivardhanjalan/kivan-tutorial/pull/42/files), organized by the file paths shown in each caption.

## What we touch this step

Fifteen files carry the work, across the backend, the app, and the infra. Each build section below takes one area.

![What we touch this step, fifteen files grouped by folder: the backend signer and lifecycle (routes, utils, models, app), the frontend pick/preview/save flow (services, hooks, components, screens, project root), and the infra private bucket; each file marked new or modified](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-06-filemap.png?v=PLACEHOLDER)

## Start with a bucket no one can reach

Every photo lands in one S3 bucket, and the first decision shapes everything after it. Nobody gets standing access, not the browser, not the app. Every read and write is a short-lived link the backend signs. Get this wrong and nothing downstream can save us, so we lock the bucket down before a single byte goes in.

In `infra/s3.tf`, create the bucket and slam every public door shut:

[![A private bucket with every public-access door blocked](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-06-code-s3bucket.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/06-media/infra/s3.tf)

Then the rule that makes abandoned uploads free, expiring anything still under `pending/` after a day (plus versioning, encryption, and a CORS rule for the presigned PUT and signed reads, which the full file adds):

[![The lifecycle rule that expires abandoned pending/ uploads after one day](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-06-code-s3lifecycle.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/06-media/infra/s3.tf)

Finally, give the backend's role object access to *this bucket only*, never `"*"`:

[![The IAM grant giving the backend object access to this bucket only](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-06-code-s3iam.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/06-media/infra/s3.tf)

The bucket name has to be unique across all of AWS, so `s3.tf` derives it once and `apprunner.tf` injects it into the container as `PHOTOS_BUCKET_NAME`. We never type it twice. Apply this and the bucket is a sealed box. Now it's safe to hand out keys to it.

## Hand the client a key that expires in minutes

The client has no bucket credentials. But it still has to put one file into that sealed bucket. A presigned URL is how: the backend mints a link that grants write access to exactly one object, then expires five minutes later. This is where the headline promise comes true: the bytes go from the phone straight to S3, and the backend never sees them.

![Adding a photo: the client asks the backend for an upload link, uploads the bytes straight to S3 under pending/ (never through the backend), and on Save the backend claims the object into permanent storage](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-06-add.png?v=PLACEHOLDER)

The endpoint is one handler. It builds a `pending/` key scoped to the user, presigns a 5-minute PUT, and hands back two URLs, one to upload to and one to store on the record:

[![The presigned upload endpoint](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-06-code-presign.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/06-media/backend/app/routes/upload.py)

Two things make this safe: the `Literal` types reject any resource type or extension that isn't on the list, and the key always starts with `pending/`, so every upload lands in the holding area the lifecycle rule watches. One shared S3 client does all the signing, pinned to SigV4. Leave it default, and the day we deploy outside a pre-2014 region, every signed URL breaks with a 400:

[![The shared S3 client pinned to SigV4](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-06-code-s3client.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/06-media/backend/app/utils/s3_helpers.py)

## Upload to a holding area, keep on save

An upload is not a commitment. The photo lands under `pending/` first, and only saving the profile promotes it to permanent storage. This is the whole trick: nothing the client does can create a permanent file on its own. Walk away and the upload is left to the 1-day expiry rule. It costs nothing.

On the client, one function does the whole dance. It asks for a link, PUTs the bytes, and hands back the permanent URL to save and the local URI to preview:

[![Pick a photo, get a link, PUT the bytes to S3](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-06-code-pick.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/06-media/frontend/src/services/ImageUploadService.ts)

Wire it into a `usePendingImageUpload` hook (one photo slot's state) and an `ImageUploadField` (label, preview, camera button), then add a Photos section to `SettingsScreen` with one **Save Photos** button. The preview appears the instant the upload succeeds. That preview **is** the success signal, so we skip the toast.

On the backend, `PUT /users/me` promotes the new object out of `pending/` and sweeps the one it replaced:

[![Claim the pending object and sweep the replaced one after the write](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-06-code-claim.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/06-media/backend/app/routes/users.py)

(The real handler routes both through `_plan_photo_update`; full logic in the PR.)

Two last things the picker needs: run `npx expo install expo-image-picker`, and add `NSPhotoLibraryUsageDescription` to `app.json`.

## Sign every read

The bucket is private, so a stored S3 URL isn't fetchable on its own: paste one into a browser and it's a flat 403. To show a photo, the backend hands back a fresh, short-lived link every time it returns a user record. Forget this one step and every image in the app breaks.

![Viewing a photo: the client asks the backend to view; the backend signs a short-lived link and returns it; the client loads the photo straight from S3 before the link expires](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-06-read.png?v=PLACEHOLDER)

A Pydantic field serializer does it automatically, on both photo fields, every time the model is returned:

[![A field serializer that signs both photo fields on read](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-06-code-serializer.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/06-media/backend/app/models/users.py)

The signer turns a stored URL into a presigned GET, and passes anything that isn't ours (a Clerk avatar, or `None`) straight through:

[![Turn a stored URL into a short-lived signed GET URL](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-06-code-sign.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/06-media/backend/app/utils/s3_helpers.py)

Now a photo loads through a link that only works for an hour: private at rest, viewable on demand.

## Let the backend do the cleanup

Photos have no delete button, and we leave it out on purpose. A client-facing delete endpoint is exactly where ownership checks slip, and one weak check lets anyone delete anyone's photo. So we keep cleanup entirely on the backend, where the three cases are easy to get right.

![Replacing a photo: one Save, and the backend does two jobs, claiming the new object and deleting the old one](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-06-update.png?v=PLACEHOLDER)

![Deleting your account: the client asks the backend to delete the account; the backend deletes both the profile and cover objects from S3. An upload you never save needs no backend; S3 expires the pending object after one day.](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-06-delete.png?v=PLACEHOLDER)

Replacing a photo swaps the object (we saw the `delete_photo_by_url` call on save above). Deleting an account sweeps both photos in `DELETE /users/me`. Abandoning an upload needs no code at all. S3 expires it. The one helper behind every swap and sweep is best-effort by design: we never let cleanup fail the operation that triggered it.

[![Best-effort delete of the object behind a stored URL](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-06-code-delete.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/06-media/backend/app/utils/s3_helpers.py)

Because the bucket is versioned, deleting a photo leaves a noncurrent version behind, and a lifecycle rule reaps those thirty days on, once the recovery window closes. Put it all together and nothing is orphaned for good: S3 reclaims every stray byte on a schedule, so we never wrote a nightly cleanup job to catch it.

## Deploy it

This step adds infrastructure: the bucket, the lifecycle rules, and the S3 grant. Deploy on a stack that is already up:

[![The two deploy commands: terraform apply, then the image build and push](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-06-code-deploy.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/tree/main/06-media/infra)

## What bit me

Four things cost me time on this step, worst first.

**`CREATE_FAILED` with no logs.** My first App Runner deploy on this step died with a bare `CREATE_FAILED` and empty logs, nothing to fix. I build amd64 on colima-rosetta with BuildKit's provenance attestations off, so the only cause left was AWS flakiness: Terraform taints the failed service, and running `terraform apply` again brought it up `RUNNING` on identical config. A plain retry was the fix, and I stopped hunting for a bug that wasn't there.

**A save that deleted the photo it was keeping.** I hit Save with nothing changed and it deleted the current photo. Reads come back as *signed* URLs, so the client echoes `.../key.jpg?X-Amz-Signature=…`, which never string-matches the stored URL: my cleanup read a "new" photo and swept the "old" one, the same file. I compared by S3 *key* instead of the raw string, and an unchanged save became a clean no-op.

**A rejected write that still touched S3.** I ran the claim and delete inline with the update, so a write that failed its guard (a deleted account) had already promoted or deleted an object. I moved every S3 side-effect to run *after* the guarded DynamoDB write commits, so a rejected write never moves a byte.

**The picker crashing on open.** `expo-image-picker` crashed the instant it opened because `app.json` was missing `NSPhotoLibraryUsageDescription`: no error, just a dead screen. I added the permission string before testing.

## We're done when

- [ ] Setting a profile photo shows an instant preview and survives a reload.
- [ ] The cover photo does the same. Both are real S3 uploads.
- [ ] The bucket blocks all public access. Photos load only through signed URLs.
- [ ] Replacing a photo leaves no old object behind. Deleting an account sweeps both.
- [ ] An upload we never save is gone about a day later.

## What's next

Step 7, Collections: the wishlists and wishes the whole app exists for. Photos ride this exact lifecycle.

---

**Zero to Shipped: the series**

- **00 · [Introduction](https://medium.com/@srivardhanjalan/zero-to-shipped-2c13ce7e20e9)**
- **01 · [One script to set up everything](https://medium.com/@srivardhanjalan/one-script-to-set-up-everything-ae8bcea2d649)**
- **02 · [Dressed to Ship](https://medium.com/@srivardhanjalan/dressed-to-ship-1e2591179d8a)**
- **03 · [Alive on Arrival](https://medium.com/@srivardhanjalan/alive-on-arrival-cda0a351844f)**
- **04 · [Signed, Sealed, Delivered](https://medium.com/@srivardhanjalan/signed-sealed-delivered-a481a02ac392)**
- **05 · [Two Places at Once](https://medium.com/@srivardhanjalan/two-places-at-once-1e00bb46354b)**
- **06 · Photos Without the Exposure** (you are here)
- **07 · Whose Wish Is It Anyway?** (coming soon)

**[All the code on GitHub](https://github.com/srivardhanjalan/kivan-tutorial)**
