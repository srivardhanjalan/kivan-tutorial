import logging
import uuid
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.config import settings
from app.dependencies.auth import get_current_user_id
from app.utils.s3_helpers import permanent_url_for_key, s3_client  # one SigV4 client, shared

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/upload", tags=["upload"])

# 5 minutes: long enough for a phone photo to upload, short enough that a
# leaked URL is useless almost immediately.
_UPLOAD_URL_TTL_SECONDS = 300


class SignedUrlRequest(BaseModel):
    # Literal types make FastAPI reject anything else with a 422 before the
    # handler runs — the only photo kinds this step knows are the user's own
    # profile and cover images.
    resource_type: Literal["profile_photo", "cover_photo"]
    file_extension: Literal["jpeg", "png", "gif", "webp"]


class SignedUrlResponse(BaseModel):
    upload_url: str  # presigned PUT the client uploads the bytes to
    photo_url: str   # permanent bucket URL persisted on the record


@router.post("/signed-url", response_model=SignedUrlResponse)
def generate_signed_url(
    request: SignedUrlRequest, user_id: str = Depends(get_current_user_id)
):
    """
    Mint a presigned PUT URL so the client uploads a photo straight to S3,
    never through this API. The bytes land under `pending/` — an S3 lifecycle
    rule expires them if the entity is never saved; PUT /users/me claims a
    pending object into the permanent keyspace (see s3_helpers). Cleanup is
    entirely backend-owned, so there is deliberately no client delete route.
    """
    content_type = f"image/{request.file_extension}"

    unix_ts = int(datetime.now(timezone.utc).timestamp())
    unique_id = uuid.uuid4().hex[:8]

    # Format: pending/{resource_type}/{user_id}/{unix_ts}_{uuid8}.{ext}
    s3_key = (
        f"pending/{request.resource_type}/{user_id}/"
        f"{unix_ts}_{unique_id}.{request.file_extension}"
    )

    try:
        # A presigned PUT can't cap object size (only a presigned POST can, via
        # a content-length-range condition). An authed user could PUT a large
        # object here; the 1-day pending sweep bounds the exposure. Revisit with
        # a presigned POST + size condition if that becomes a concern.
        upload_url = s3_client.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": settings.photos_bucket_name,
                "Key": s3_key,
                "ContentType": content_type,
            },
            ExpiresIn=_UPLOAD_URL_TTL_SECONDS,
        )
    except Exception as e:
        # Don't echo the raw AWS error to the client — log it, stay generic.
        logger.error(f"Failed to presign upload for {s3_key}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not start the upload. Please try again.",
        )

    # The permanent URL is not itself fetchable (the bucket is fully private);
    # reads are re-signed by s3_helpers.get_signed_url_for_s3.
    return SignedUrlResponse(
        upload_url=upload_url, photo_url=permanent_url_for_key(s3_key)
    )
