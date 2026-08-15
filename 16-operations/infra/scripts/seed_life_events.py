#!/usr/bin/env python3
"""
Seed the life-events reference table.

Life events categorize wishlists by occasion. The table is reference data:
without seeding it, GET /life-events returns nothing and the
wishlist-creation screen has no occasions to offer. Runs with your local AWS
credentials, not the App Runner instance role.

Usage (needs a python with boto3 — the backend venv is the one this tutorial
installs):
    AWS_REGION=us-east-1 ENVIRONMENT=production \
        backend/.venv/bin/python infra/scripts/seed_life_events.py

Idempotent: upserts by id. Upsert-only, though — renaming or removing an
occasion means deleting the old row by hand; a re-run never deletes, so a
retired id would otherwise live in the picker forever.
"""
import os

import boto3

REGION = os.environ.get("AWS_REGION", "us-east-1")
ENVIRONMENT = os.environ.get("ENVIRONMENT", "production")
TABLE_NAME = f"kivan-{ENVIRONMENT}-life-events"

# "general" is the catch-all WishlistCreate.life_event_id defaults to, so it
# must always exist here.
LIFE_EVENTS = [
    {"id": "birthday",     "name": "Birthday",     "icon": "🎂", "description": "Birthday celebrations",          "display_order": 1},
    {"id": "wedding",      "name": "Wedding",      "icon": "💍", "description": "Weddings and engagements",       "display_order": 2},
    {"id": "baby-shower",  "name": "Baby Shower",  "icon": "👶", "description": "Welcoming a new arrival",        "display_order": 3},
    {"id": "graduation",   "name": "Graduation",   "icon": "🎓", "description": "Graduations and achievements",   "display_order": 4},
    {"id": "housewarming", "name": "Housewarming", "icon": "🏡", "description": "New home celebrations",          "display_order": 5},
    {"id": "anniversary",  "name": "Anniversary",  "icon": "💝", "description": "Anniversaries and milestones",   "display_order": 6},
    {"id": "retirement",   "name": "Retirement",   "icon": "🎉", "description": "Retirement celebrations",        "display_order": 7},
    {"id": "holiday",      "name": "Holiday",      "icon": "🎄", "description": "Holidays and festive occasions", "display_order": 8},
    {"id": "general",      "name": "General",      "icon": "🎁", "description": "Any occasion",                   "display_order": 9},
]


def main():
    dynamodb = boto3.resource("dynamodb", region_name=REGION)
    table = dynamodb.Table(TABLE_NAME)

    print(f"Seeding {len(LIFE_EVENTS)} life events into {TABLE_NAME}...")
    for event in LIFE_EVENTS:
        table.put_item(Item=event)
        print(f"  ✓ {event['icon']}  {event['name']}")

    print("=" * 60)
    print(f"✅ Successfully seeded: {len(LIFE_EVENTS)} life events")
    print("=" * 60)


if __name__ == "__main__":
    main()
