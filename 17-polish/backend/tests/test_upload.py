"""The presigned-upload endpoint (POST /upload/signed-url).

Every image the app uploads rides one lifecycle: the client asks here for a
presigned PUT, uploads the bytes straight to S3 under `pending/`, and a later
save claims that object into the permanent keyspace. This covers the endpoint's
resource-type gate — the Literal that 422s an unknown kind before the handler
runs — with the step-17 catalog kinds (brand logo, storefront logo, product
photo) alongside a rejection, so the admin uploader's first hop is proven.
"""
import pytest
from conftest import photos_bucket, put_user

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


def test_signed_url_rejects_unknown_resource_type(aws, client):
    """An unknown kind is a 422 at the Literal boundary, never a signed URL for
    an arbitrary keyspace."""
    put_user(aws, "admin1", role="admin")
    resp = client("admin1").post(
        "/upload/signed-url",
        json={"resource_type": "not_a_real_kind", "file_extension": "jpeg"},
    )
    assert resp.status_code == 422
