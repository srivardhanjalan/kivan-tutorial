"""The presigned-upload endpoint (POST /upload/signed-url).

Every image the app uploads rides one lifecycle: the client asks here for a
presigned PUT, uploads the bytes straight to S3 under `pending/`, and a later
save claims that object into the permanent keyspace. This covers the endpoint's
resource-type gate — the Literal that 422s an unknown kind before the handler
runs — with the step-17 catalog kinds (brand logo, storefront logo, product
photo) alongside a rejection, so the admin uploader's first hop is proven.
"""
from urllib.parse import urlparse

import pytest
from conftest import photos_bucket, put_user

from app.config import settings

# The step-17 catalog resource types the admin dashboard uploads for; each mints
# a key stamped `pending/{resource_type}/{user_id}/…` the claim-on-save routes
# then promote.
CATALOG_RESOURCE_TYPES = ["brand_logo", "storefront_logo", "product_photo"]


@pytest.mark.parametrize("resource_type", CATALOG_RESOURCE_TYPES)
def test_signed_url_accepts_catalog_resource_type(aws, client, monkeypatch, resource_type):
    """Each new catalog kind is accepted, and the minted keys are stamped with
    the resource type and the caller's id (the shape the claim path relies on)."""
    photos_bucket(monkeypatch)
    put_user(aws, "admin1", role="admin")
    resp = client("admin1").post(
        "/upload/signed-url",
        json={"resource_type": resource_type, "file_extension": "jpeg"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "upload_url" in body
    # The permanent URL the client persists points at the pending key stamped
    # with the resource type and the admin's id.
    assert f"pending/{resource_type}/admin1/" in body["photo_url"]


def test_signed_url_host_is_regional_never_global(aws, client, monkeypatch):
    """The presigned URL must carry the bucket's REGIONAL virtual-hosted host
    (``bucket.s3.{region}.amazonaws.com``), never the region-less global host
    (``bucket.s3.amazonaws.com``).

    boto3's default endpoint resolution signs a presigned URL against the global
    host even when the client region is us-west-2; S3 answers a non-us-east-1
    bucket on that host with a 307 to the regional host, and the redirected
    request's Host no longer matches the one the SigV4 signature was bound to —
    a 403 on every photo GET/PUT. s3_helpers pins an explicit regional endpoint
    so the signed host is the served host. This pins that host shape so a
    regression back to the global host fails here, not silently in a us-west-2
    deploy the test suite (us-east-1) would never catch."""
    bucket, _ = photos_bucket(monkeypatch)
    put_user(aws, "admin1", role="admin")
    resp = client("admin1").post(
        "/upload/signed-url",
        json={"resource_type": "profile_photo", "file_extension": "jpeg"},
    )
    assert resp.status_code == 200
    host = urlparse(resp.json()["upload_url"]).netloc
    assert host == f"{bucket}.s3.{settings.aws_region}.amazonaws.com", host
    # the region-less global host is exactly the shape that 307s outside us-east-1
    assert host != f"{bucket}.s3.amazonaws.com"


def test_signed_url_rejects_unknown_resource_type(aws, client):
    """An unknown kind is a 422 at the Literal boundary, never a signed URL for
    an arbitrary keyspace."""
    put_user(aws, "admin1", role="admin")
    resp = client("admin1").post(
        "/upload/signed-url",
        json={"resource_type": "not_a_real_kind", "file_extension": "jpeg"},
    )
    assert resp.status_code == 422
