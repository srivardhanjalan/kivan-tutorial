"""
S3 helpers for the photo lifecycle: sign reads, claim pending uploads into
the permanent keyspace, and delete objects that are being replaced or whose
account is gone. Photos are entirely backend-owned — clients only ever
upload to `pending/` and read via the signed URLs these helpers mint.
"""
import logging
from typing import Optional
from urllib.parse import urlparse

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from fastapi import HTTPException, status

from app.config import settings

logger = logging.getLogger(__name__)

# boto3 resolves credentials from the standard chain: the App Runner instance
# role in the cloud (see infra/s3.tf's S3 policy), your AWS profile locally.
# signature_version s3v4: presigned URLs must be SigV4 — the boto3 default can
# emit deprecated SigV2 URLs that only work in pre-2014 regions like us-east-1.
# Shared by the upload route too, so every presigned URL is signed one way.
s3_client = boto3.client(
    "s3", region_name=settings.aws_region, config=Config(signature_version="s3v4")
)

# Fresh uploads land here; a save claims them out of it, the lifecycle rule
# reaps whatever is never claimed.
PENDING_PREFIX = "pending/"


def s3_key_from_url(url: Optional[str]) -> Optional[str]:
    """The bare object key if `url` points at our photos bucket, else None.

    Parsed, not prefix-matched: the stored URL uses the regional host
    (`bucket.s3.us-east-1.amazonaws.com`) but a presigned read URL can use the
    global one (`bucket.s3.amazonaws.com`, boto3's us-east-1 quirk). Both are
    ours; matching the host by `bucket.s3…amazonaws.com` and taking the path
    means a signed URL the client echoes back resolves to the SAME key as its
    stored form, so callers compare keys, not raw strings.
    """
    if not url:
        return None
    parsed = urlparse(url)
    host = parsed.netloc
    if not (
        host.startswith(f"{settings.photos_bucket_name}.s3")
        and host.endswith(".amazonaws.com")
    ):
        return None
    return parsed.path.lstrip("/")  # urlparse already drops the ?query


def permanent_url_for_key(key: str) -> str:
    """The canonical (unsigned) URL we persist for an object key in our bucket.
    Note ours-ness is judged by s3_key_from_url's host parse, not by matching
    this exact regional form — a signed read URL may carry the global host."""
    return (
        f"https://{settings.photos_bucket_name}.s3."
        f"{settings.aws_region}.amazonaws.com/{key}"
    )


def get_signed_url_for_s3(url: Optional[str]) -> Optional[str]:
    """
    Turn a stored photo URL into a fresh presigned GET URL when it points at
    our (private) photos bucket; return any other URL unchanged.

    The bucket blocks all public access, so the permanent URLs we persist are
    not directly fetchable — every read re-signs here. External URLs (Clerk
    profile photos) are already public and pass straight through.
    """
    key = s3_key_from_url(url)
    if key is None:
        return url  # None or external (e.g. a Clerk avatar) — return as-is

    try:
        return s3_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.photos_bucket_name, "Key": key},
            ExpiresIn=3600,  # one hour: outlives any screen, forces re-reads to re-sign
        )
    except Exception as e:
        # Signing should never fail a read — log and fall back to the raw URL
        logger.warning(f"Failed to generate signed URL for {key}: {e}")
        return url


def delete_photo_by_url(url: Optional[str]) -> None:
    """
    Delete the S3 object behind a stored photo URL (best-effort).

    Called whenever a stored image is replaced or its account is deleted, so
    the bucket never accumulates orphans. URLs that aren't ours (Clerk
    avatars) are ignored. Failures are logged and swallowed — cleanup must
    never fail the primary operation.
    """
    key = s3_key_from_url(url)
    if key is None:
        return

    try:
        s3_client.delete_object(Bucket=settings.photos_bucket_name, Key=key)
        logger.info(f"Deleted photo {key}")
    except Exception as e:
        logger.warning(f"Failed to delete photo {key}: {e}")


def _key_owner(key: str) -> Optional[str]:
    """The user id stamped into an object key — every key in our bucket is
    `[pending/]{resource_type}/{user_id}/{file}` (upload.py builds them).
    None for a key that doesn't fit that shape."""
    parts = key.split("/")
    if parts and f"{parts[0]}/" == PENDING_PREFIX:
        parts = parts[1:]
    return parts[1] if len(parts) >= 3 else None


def plan_photo_update(new_url: str, old_url, user_id: str):
    """Decide how a submitted photo URL changes the stored one.

    Returns (value_to_store | None to leave the field untouched,
    pending_url_to_claim | None, old_url_to_delete | None). The claim/delete
    are S3 side-effects the caller runs AFTER its DB write commits — so a
    failed write never promotes or deletes an object it shouldn't. Shared by
    every route that stores a photo URL: the users/wishlists/wishes PUTs and
    the wishlist/wish creates (which plan against no prior object).

    Only three URL shapes are legal, and this is where that's enforced: an
    echo of the record's current photo (no-op), a fresh `pending/` upload
    stamped with the caller's own user id, or an external URL (a Clerk
    avatar). Any OTHER key in our bucket is rejected — someone else's key
    would let the serializers mint signed reads of their object, and even the
    caller's own other key would put one object behind two records, when
    every delete path here assumes exactly one record references an object
    (whichever record deleted or swapped first would strand the other).

    Comparison is by S3 key, never raw string: reads are served as signed
    URLs, so a client resubmitting the current photo sends back
    `.../key.jpg?X-Amz-Signature=…`. Keyed comparison sees that as no change,
    so an unchanged save neither re-stores a soon-expired signed URL nor
    deletes the very object it points at. A pending URL echoed again after
    its claim is the same no-op: its prospective permanent key is what the
    record already stores, and "replacing" it would delete the live object.
    """
    new_key = s3_key_from_url(new_url)
    old_key = s3_key_from_url(old_url)

    # Echo no-ops FIRST, ownership second: echoing the record's current photo
    # changes nothing, so it must never trip the uploader check — keys stamp
    # the ORIGINAL uploader, and the moment co-owners arrive (step 14) the
    # echo-er is legitimately not always the uploader.
    if new_key is not None and new_key == old_key:
        return None, None, None  # the current object echoed back — nothing to do
    is_pending = new_key is not None and new_key.startswith(PENDING_PREFIX)
    if is_pending and new_key[len(PENDING_PREFIX):] == old_key:
        return None, None, None  # already claimed — this echo's target IS the stored object

    # Past the echoes, the only legal our-bucket shape is a fresh pending
    # upload owned by the caller (uploads always arrive as pending/ — no
    # client flow legitimately introduces a bare permanent key).
    if new_key is not None and not is_pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="That photo belongs to another record — upload the image again",
        )
    if is_pending and _key_owner(new_key) != user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="That photo isn't one of your uploads",
        )

    if is_pending:
        # Shape alone isn't proof: a pending URL replayed after its claim, or
        # a live permanent key hand-prefixed with pending/, parses fine but
        # would alias one object across two records. Require the pending
        # object to actually EXIST right now. (A save retried after a
        # successful claim never gets here — the claimed-echo no-op above
        # catches it.) Existence is the guarantee, not "unclaimed": a prior
        # claim whose copy landed but whose best-effort delete failed leaves
        # the pending object behind, reopening replay for that one logged
        # failure; and two saves racing the same upload in the milliseconds
        # between this check and their claims can both pass. Both windows
        # need an already-failing or deliberately-parallel client.
        try:
            s3_client.head_object(Bucket=settings.photos_bucket_name, Key=new_key)
        except ClientError as e:
            # Without s3:ListBucket a missing key surfaces as 403, not 404 —
            # both mean "no such pending object" to this role.
            if e.response.get("Error", {}).get("Code") in ("404", "403", "NoSuchKey", "AccessDenied"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="That upload has expired or was already used — upload the image again",
                )
            logger.error(f"Pending-object check failed for {new_key}: {e}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Could not verify the upload right now — try again",
            )
        except Exception as e:
            # Transient transport failure is a server-side story, never the
            # client's "expired upload"
            logger.error(f"Pending-object check failed for {new_key}: {e}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Could not verify the upload right now — try again",
            )
        return (
            permanent_url_for_key(new_key[len(PENDING_PREFIX):]),
            new_url,
            old_url if old_url else None,
        )

    # External (e.g. a Clerk avatar): store as-is, sweep a replaced object of
    # ours (delete_photo_by_url ignores an external old URL anyway).
    return new_url, None, (old_url if old_url and old_key is not None else None)


def claim_pending_photo(url: Optional[str]) -> Optional[str]:
    """
    Promote a pending upload to its permanent key (copy, then delete the
    pending object) and return the permanent URL.

    Clients upload to `pending/...` (auto-expired by an S3 lifecycle rule if
    the entity is never saved); when the record is saved with a pending image
    the backend claims it here. Non-pending and external URLs pass through
    unchanged. Callers perform this AFTER the DB write commits, so a failed
    write never leaves a promoted-but-unreferenced object behind.
    """
    key = s3_key_from_url(url)
    if key is None or not key.startswith(PENDING_PREFIX):
        return url  # external or already-permanent — nothing to claim

    permanent_key = key[len(PENDING_PREFIX):]
    try:
        s3_client.copy_object(
            Bucket=settings.photos_bucket_name,
            CopySource={"Bucket": settings.photos_bucket_name, "Key": key},
            Key=permanent_key,
        )
        s3_client.delete_object(Bucket=settings.photos_bucket_name, Key=key)
    except Exception as e:
        # Never fail the save over photo promotion; the pending object will be
        # expired by the lifecycle rule, so log loudly.
        logger.error(f"Failed to claim pending photo {key}: {e}")
    return permanent_url_for_key(permanent_key)
