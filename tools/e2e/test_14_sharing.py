"""
Step 14 — sharing: co-owners + privacy (PR #98 proof list).

Co-owner add/remove with the stranger-403 and last-owner guards; the private
wishlist denied on every direct read surface and absent (but owner-visible, as a
control) from every list surface; and the privacy_type 422s. Note the shipped
model has no "friends" tier — a follower is treated exactly like a stranger for
a private list (PR #98 deviation 2), so that is what these assert.
"""
import uuid

import pytest

pytestmark = [pytest.mark.e2e, pytest.mark.step14]


def _wishlist(owner, privacy="public", **extra):
    body = {"name": f"WL {uuid.uuid4().hex[:6]}", "privacy_type": privacy}
    body.update(extra)
    r = owner.client.post("/wishlists/", json=body)
    assert r.status_code == 201, r.text
    return r.json()["id"]


def _wish(owner, wishlist_id, name=None):
    r = owner.client.post("/wishes/", json={"wishlist_id": wishlist_id,
                                            "name": name or f"Wish {uuid.uuid4().hex[:6]}"})
    assert r.status_code == 201, r.text
    return r.json()["id"]


def test_co_owner_add_and_remove(clerk_user, table):
    owner = clerk_user("Olivia", "Owner")
    coowner = clerk_user("Cody", "Coowner")
    stranger = clerk_user("Stan", "Stranger")
    wid = _wishlist(owner)
    try:
        # stranger cannot add owners
        assert stranger.client.post(f"/wishlists/{wid}/owners",
                                    json={"user_id": coowner.user_id}).status_code == 403

        add = owner.client.post(f"/wishlists/{wid}/owners", json={"user_id": coowner.user_id})
        assert add.status_code == 200
        assert add.json() == {"success": True, "message": "Owner added"}
        assert "Item" in table("wishlist-owners").get_item(
            Key={"wishlist_id": wid, "user_id": coowner.user_id})

        # co-owner can now edit and add wishes
        assert coowner.client.put(f"/wishlists/{wid}", json={"name": "Renamed"}).status_code == 200
        assert coowner.client.post("/wishes/", json={"wishlist_id": wid,
                                                     "name": "Skillet"}).status_code == 201

        rm = owner.client.delete(f"/wishlists/{wid}/owners/{coowner.user_id}")
        assert rm.status_code == 200
        assert rm.json() == {"success": True, "message": "Owner removed"}
        assert "Item" not in table("wishlist-owners").get_item(
            Key={"wishlist_id": wid, "user_id": coowner.user_id})

        # removed co-owner loses edit access
        assert coowner.client.put(f"/wishlists/{wid}", json={"name": "Hijack"}).status_code == 403
    finally:
        owner.client.delete(f"/wishlists/{wid}")


def test_private_denies_follower_and_stranger_but_not_coowner(clerk_user):
    owner = clerk_user("Priya", "Private")
    follower = clerk_user("Fin", "Follower")
    stranger = clerk_user("Sara", "Stranger")
    coowner = clerk_user("Cara", "Coowner")
    wid = _wishlist(owner, privacy="public")
    try:
        assert follower.client.post(f"/users/{owner.user_id}/follow").status_code == 204
        # while public, everyone can read
        assert follower.client.get(f"/wishlists/{wid}").status_code == 200
        assert stranger.client.get(f"/wishlists/{wid}").status_code == 200

        assert owner.client.put(f"/wishlists/{wid}", json={"privacy_type": "private"}).status_code == 200

        # follower is treated exactly like a stranger (no friends tier)
        assert follower.client.get(f"/wishlists/{wid}").status_code == 403
        assert follower.client.get(f"/wishlists/{wid}/wishes").status_code == 403
        assert stranger.client.get(f"/wishlists/{wid}").status_code == 403

        # a co-owner still gets in
        assert owner.client.post(f"/wishlists/{wid}/owners",
                                 json={"user_id": coowner.user_id}).status_code == 200
        assert coowner.client.get(f"/wishlists/{wid}").status_code == 200
        assert coowner.client.get(f"/wishlists/{wid}/wishes").status_code == 200
    finally:
        owner.client.delete(f"/wishlists/{wid}")


def test_private_wishlist_absent_from_every_read_surface(clerk_user):
    owner = clerk_user("Owen", "Owner")
    stranger = clerk_user("Steve", "Stranger")
    wid = _wishlist(owner, privacy="public")
    wish_id = _wish(owner, wid)
    eid = None
    try:
        # make W a real candidate on the list surfaces while it's still public
        assert owner.client.post(f"/wishlists/{wid}/love").status_code == 204  # loved shelf
        ev = owner.client.post("/events/", json={"name": f"E {uuid.uuid4().hex[:6]}",
                                                 "is_public": True})
        assert ev.status_code == 201
        eid = ev.json()["id"]
        assert owner.client.post(f"/events/{eid}/wishlists",
                                 json={"wishlist_id": wid}).status_code == 200

        # control: while public, W is present for the owner on every list surface
        assert wid in [w["id"] for w in owner.client.get(f"/users/{owner.user_id}/wishlists").json()]
        assert wid in [w["id"] for w in owner.client.get(f"/users/{owner.user_id}/loved-wishlists").json()]
        assert wid in [w["id"] for w in owner.client.get(f"/events/{eid}").json()["wishlists"]]

        # flip private
        assert owner.client.put(f"/wishlists/{wid}", json={"privacy_type": "private"}).status_code == 200

        # direct reads: every surface denied to the stranger
        assert stranger.client.get(f"/wishlists/{wid}").status_code == 403
        assert stranger.client.get(f"/wishlists/{wid}/wishes").status_code == 403
        assert stranger.client.get(f"/wishlists/{wid}/owners").status_code == 403
        assert stranger.client.get(f"/wishes/{wish_id}").status_code == 403
        assert stranger.client.post(f"/wishes/{wish_id}/complete").status_code == 403

        # list surfaces: W absent for the stranger, still present for the owner (control)
        assert wid not in [w["id"] for w in stranger.client.get("/wishlists/popular").json()]
        assert wid not in [w["id"] for w in stranger.client.get(f"/users/{owner.user_id}/wishlists").json()]
        assert wid not in [w["id"] for w in stranger.client.get(f"/users/{owner.user_id}/loved-wishlists").json()]
        assert wid not in [w["id"] for w in stranger.client.get(f"/events/{eid}").json()["wishlists"]]
        assert wid in [w["id"] for w in owner.client.get(f"/users/{owner.user_id}/wishlists").json()]
    finally:
        if eid:
            owner.client.delete(f"/events/{eid}")
        owner.client.delete(f"/wishlists/{wid}")


def test_privacy_type_validation_422(clerk_user):
    owner = clerk_user("Val", "Validator")
    wid = _wishlist(owner)
    try:
        assert owner.client.put(f"/wishlists/{wid}",
                                json={"privacy_type": "banana"}).status_code == 422
        assert owner.client.post("/wishlists/",
                                 json={"name": "bad", "privacy_type": "banana"}).status_code == 422
    finally:
        owner.client.delete(f"/wishlists/{wid}")
