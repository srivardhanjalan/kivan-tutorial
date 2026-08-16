"""Low-level DynamoDB helpers shared across the routes."""

import logging

from botocore.exceptions import ClientError
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)


def get_item_or_404(table, item_id: str, not_found_detail: str) -> dict:
    """Fetch an item by id or raise 404 — the one spelling of get-or-404.

    An empty or >2048-BYTE id is not-found by construction: DynamoDB rejects
    such a partition key with a ValidationException, which would surface as a
    500 for an id that simply cannot exist. Byte length matters — a multibyte
    id can pass a character-counting model bound and still exceed the key
    limit, so the guard lives structurally here, not in each caller."""
    if not item_id or len(item_id.encode()) > 2048:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=not_found_detail
        )
    response = table.get_item(Key={"id": item_id})
    if "Item" not in response:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=not_found_detail
        )
    return response["Item"]


def query_all_pages(table, **query_kwargs) -> list[dict]:
    """Run a Query and follow pagination to the end, returning every item.

    A single Query page returns at most 1 MB of data; DynamoDB then hands back
    a LastEvaluatedKey and expects the next call to resume from it via
    ExclusiveStartKey. Reading only the first page silently truncates the
    result once a caller's collection crosses 1 MB — the exact bug this helper
    exists to prevent. The caller passes the same kwargs it would give
    `table.query`; this loops until the key is exhausted.
    """
    items: list[dict] = []
    response = table.query(**query_kwargs)
    items.extend(response.get("Items", []))
    while "LastEvaluatedKey" in response:
        response = table.query(
            **query_kwargs, ExclusiveStartKey=response["LastEvaluatedKey"]
        )
        items.extend(response.get("Items", []))
    return items


def adjust_count(table, key: dict, field: str, delta: int) -> None:
    """Nudge a denormalized counter by +1/-1, best-effort.

    The follow and love edges are the source of truth; follower_count,
    following_count and love_count are caches that make a profile header or a
    Discover ranking an O(1) read instead of a COUNT query. So this is
    deliberately swallow-on-failure: a lost increment leaves a count slightly
    low, never blocks the edge write that already succeeded. if_not_exists
    seeds the field so the first ever increment starts from 0 (a record
    provisioned before this counter existed has no attribute to add to), and
    the guard floors a decrement at 0 so a racing double-unfollow can't drive
    it negative.
    """
    try:
        if delta >= 0:
            table.update_item(
                Key=key,
                UpdateExpression="SET #f = if_not_exists(#f, :zero) + :d",
                ExpressionAttributeNames={"#f": field},
                ExpressionAttributeValues={":zero": 0, ":d": delta},
            )
        else:
            # Only decrement when the current value can absorb it, never below 0
            table.update_item(
                Key=key,
                UpdateExpression="SET #f = #f - :d",
                ConditionExpression="#f >= :d",
                ExpressionAttributeNames={"#f": field},
                ExpressionAttributeValues={":d": -delta},
            )
    except ClientError as e:
        # A floored decrement (condition failed) is expected, not an error;
        # anything else is logged and swallowed: the count is a cache.
        if e.response["Error"]["Code"] != "ConditionalCheckFailedException":
            logger.warning(f"adjust_count({field}, {delta}) failed: {e}")


def batch_get_items(table, keys: list[dict]) -> list[dict]:
    """Resolve a list of primary keys to their items in one round of
    batch_get_item calls: the N+1 fix for turning an id list (a follower
    edge's ids, a loved-wishlist id list) into records.

    DynamoDB caps a BatchGetItem at 100 keys and can return UnprocessedKeys
    under throttling, so this chunks by 100 and re-requests whatever came back
    unprocessed. Order is NOT preserved (DynamoDB returns items ungrouped); a
    caller that needs the original order rebuilds it from an {id: item} map.
    Duplicate keys must be removed by the caller: BatchGetItem rejects a batch
    with duplicates.
    """
    items: list[dict] = []
    table_name = table.name
    for start in range(0, len(keys), 100):
        request = {table_name: {"Keys": keys[start:start + 100]}}
        while request:
            response = table.meta.client.batch_get_item(RequestItems=request)
            items.extend(response["Responses"].get(table_name, []))
            # Re-request only what DynamoDB deferred, until nothing is left
            request = response.get("UnprocessedKeys") or None
    return items


def delete_item_or_404(table, key: dict, not_found_detail: str) -> None:
    """Delete an item, 404-ing if it wasn't there — the one spelling of
    delete-or-404 the admin catalog routes share.

    delete_item is a silent no-op on a missing key (it returns 200 whether or
    not a row existed), so a DELETE of a already-gone id would look like success.
    The attribute_exists condition turns that into the same 404 a GET would give,
    so the caller reports honestly. Any reference guard the caller runs first
    (a life-event still in use, a storefront with products) has already fired by
    the time this runs — this only enforces existence."""
    try:
        table.delete_item(Key=key, ConditionExpression="attribute_exists(id)")
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail=not_found_detail
            )
        raise


def put_item_or_409(table, item: dict, conflict_detail: str) -> dict:
    """Write a brand-new item, 409-ing if its id is already taken — the one
    spelling of create-without-clobber the admin catalog routes share.

    put_item is an upsert: writing an id that already exists silently overwrites
    the whole row. Reference-data ids are hand-picked slugs (a seeded brand,
    life-event, storefront, or product), so an admin create that collided with a
    seeded id would erase it. The attribute_not_exists condition makes that a
    409 instead, and returns the item on success so the caller can echo it."""
    try:
        table.put_item(Item=item, ConditionExpression="attribute_not_exists(id)")
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail=conflict_detail
            )
        raise
    return item


def update_item_fields(table, key: dict, changes: dict, not_found_detail: str) -> dict:
    """SET exactly `changes` on an existing item and return the whole new item.

    Field-scoped on purpose: a read-modify-`put_item` rewrites every attribute
    it read, so it silently reverts a field a concurrent request just changed
    (a name edit racing the complete toggle would un-complete the wish). Every
    attribute name is aliased — `name` is a DynamoDB reserved word. And
    update_item is an upsert by default: the condition keeps an item deleted
    between the caller's access check and this write from being reinvented as
    a phantom row, surfacing as the same 404 the access check would have given
    (the users-table discipline).
    """
    names = {f"#f{i}": field for i, field in enumerate(changes)}
    values = {f":v{i}": value for i, value in enumerate(changes.values())}
    try:
        result = table.update_item(
            Key=key,
            UpdateExpression="SET "
            + ", ".join(f"#f{i} = :v{i}" for i in range(len(changes))),
            ExpressionAttributeNames=names,
            ExpressionAttributeValues=values,
            ConditionExpression="attribute_exists(id)",
            ReturnValues="ALL_NEW",
        )
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail=not_found_detail
            )
        raise
    return result["Attributes"]
