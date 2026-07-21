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


def _bucket_url_prefix() -> str:
    """The permanent-URL prefix for objects in our photos bucket. A stored
    URL is "ours" iff it starts with this — anything else (a Clerk avatar) is
    external and passes through the helpers untouched."""
    return f"https://{settings.photos_bucket_name}.s3.{settings.aws_region}.amazonaws.com/"


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
    """The canonical (unsigned) URL we persist for an object key in our bucket."""
    return f"{_bucket_url_prefix()}{key}"


def get_signed_url_for_s3(url: Optional[str], expiry: int = 3600) -> Optional[str]:
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
            ExpiresIn=expiry,
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


def claim_pending_photo(url: Optional[str]) -> Optional[str]:
    """
    Promote a pending upload to its permanent key (copy, then delete the
    pending object) and return the permanent URL.

    Clients upload to `pending/...` (auto-expired by an S3 lifecycle rule if
    the entity is never saved); when the record is saved with a pending image
    the backend claims it here. Non-pending and external URLs pass through
    unchanged. Callers perform this AFTER the guarded DB write commits, so a
    rejected write never leaves a promoted-but-unreferenced object behind.
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
