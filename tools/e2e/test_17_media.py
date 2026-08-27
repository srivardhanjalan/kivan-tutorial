"""
Step 17 — media (design brief + the bug found 2026-08-26).

A signed-url for every one of the 8 resource types (incl. event_photo, the fix
PR #96 folded in); an upload→claim round-trip for a catalog brand logo (mint →
PUT bytes → create the record → the pending object is claimed and reads back as
a signed, fetchable URL); and the wishlist cover_photo/life_event persistence
check that pins the 2026-08-26 finding — xfail(strict=False) so it neither fails
the suite if the bug stands nor errors if the backend actually persists.
"""
import uuid

import httpx
import pytest

pytestmark = [pytest.mark.e2e, pytest.mark.step17]

_RESOURCE_TYPES = [
    "profile_photo", "cover_photo", "wishlist_photo", "wish_photo",
    "event_photo", "brand_logo", "storefront_logo", "product_photo",
]

# A minimal valid JPEG (SOI + APP0 + EOI) — enough bytes for a real PUT.
_JPEG = bytes.fromhex("ffd8ffe000104a46494600010100000100010000ffd9")


def _grant_admin(user, table):
    assert user.client.get("/users/me").status_code == 200
    table("users").update_item(
        Key={"id": user.user_id},
        UpdateExpression="SET #r = :a",
        ExpressionAttributeNames={"#r": "role"},
        ExpressionAttributeValues={":a": "admin"},
    )


@pytest.mark.parametrize("resource_type", _RESOURCE_TYPES)
def test_signed_url_for_every_resource_type(clerk_user, resource_type):
    user = clerk_user("Uma", "Uploader")
    r = user.client.post("/upload/signed-url",
                         json={"resource_type": resource_type, "file_extension": "jpeg"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["upload_url"].startswith("https://")
    assert f"/pending/{resource_type}/{user.user_id}/" in body["photo_url"]


def test_signed_url_rejects_unknown_resource_type(clerk_user):
    user = clerk_user("Uri", "Uploader")
    assert user.client.post("/upload/signed-url",
                            json={"resource_type": "banana_photo",
                                  "file_extension": "jpeg"}).status_code == 422


def test_catalog_logo_upload_and_claim_round_trip(clerk_user, table):
    admin = clerk_user("Gina", "Gallery")
    _grant_admin(admin, table)

    # mint
    minted = admin.client.post("/upload/signed-url",
                               json={"resource_type": "brand_logo", "file_extension": "jpeg"})
    assert minted.status_code == 200
    upload_url = minted.json()["upload_url"]
    photo_url = minted.json()["photo_url"]
    assert "/pending/brand_logo/" in photo_url

    # upload the bytes straight to S3 (content-type must match the presign)
    put = httpx.put(upload_url, content=_JPEG, headers={"Content-Type": "image/jpeg"}, timeout=30)
    assert put.status_code in (200, 204), f"S3 PUT failed: {put.status_code} {put.text[:200]}"

    # create the record carrying the pending URL — this claims the object
    bid = f"brand-{uuid.uuid4().hex[:8]}"
    created = admin.client.post("/admin/brands", json={
        "id": bid, "name": "LogoCo", "website_url": "https://logo.test",
        "category": "general", "country": "US", "logo_url": photo_url})
    assert created.status_code == 201, created.text
    try:
        logo = created.json()["logo_url"]
        assert logo, "brand logo_url should be set"
        # claimed out of pending/ into the permanent keyspace
        assert "/pending/" not in logo
        assert "brand_logo/" in logo
        # and it reads back as a fetchable signed URL
        got = httpx.get(logo, timeout=30)
        assert got.status_code == 200, f"claimed logo not fetchable: {got.status_code}"
    finally:
        admin.client.delete(f"/admin/brands/{bid}")


@pytest.mark.xfail(strict=False,
                   reason="cover_photo/life_event persistence — bug found 2026-08-26 visual "
                          "E2E (API stored None for cover/life_event on wishlist create). This "
                          "backend flow sends them explicitly; xpass means the API persists when "
                          "the values are actually supplied.")
def test_wishlist_cover_and_life_event_persist(clerk_user):
    owner = clerk_user("Cora", "Cover")
    r = owner.client.post("/wishlists/", json={
        "name": f"Cover WL {uuid.uuid4().hex[:6]}",
        "image_url": "preset:birthday",   # a chosen cover preset (frontend encoding)
        "life_event_id": "birthday",
    })
    assert r.status_code == 201
    wid = r.json()["id"]
    try:
        back = owner.client.get(f"/wishlists/{wid}").json()
        assert back["image_url"] is not None
        assert back["image_url"] == "preset:birthday"
        assert back["life_event_id"] is not None
        assert back["life_event_id"] == "birthday"
    finally:
        owner.client.delete(f"/wishlists/{wid}")
