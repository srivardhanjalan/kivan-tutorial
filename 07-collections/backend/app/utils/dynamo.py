"""Low-level DynamoDB helpers shared across the routes."""

from botocore.exceptions import ClientError
from fastapi import HTTPException, status


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
