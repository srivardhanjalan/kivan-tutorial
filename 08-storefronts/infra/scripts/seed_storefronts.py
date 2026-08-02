#!/usr/bin/env python3
"""
Seed the storefronts and products reference tables.

Storefronts are the curated catalog a wish can be added from. The two tables
are reference data: without seeding them, GET /storefronts returns nothing and
the Wish Store tab has no stores to browse. Runs with your local AWS
credentials, not the App Runner instance role (the running role can only read
these tables).

Usage (needs a python with boto3: the backend venv is the one this tutorial
installs):
    AWS_REGION=us-east-1 ENVIRONMENT=production \
        backend/.venv/bin/python infra/scripts/seed_storefronts.py

Idempotent: upserts by id. Upsert-only, though. Renaming or removing a store
or product means deleting the old row by hand; a re-run never deletes, so a
retired id would otherwise linger in the catalog forever.

The rows below are placeholder catalog data (prices in the app's single
currency, links pointing at example.com): enough to browse the feature and add
a wish from it. Each store carries a logo and each product a photo and a
category. The images are honest, license-clean placeholders committed under
08-storefronts/assets/catalog/ and pointed at by raw.githubusercontent.com
URLs, so the seeded rows exercise the real URL-based image path. Uploading real
logos and photos from an admin dashboard is step 15's job.
"""
import os
from decimal import Decimal

import boto3

REGION = os.environ.get("AWS_REGION", "us-east-1")
ENVIRONMENT = os.environ.get("ENVIRONMENT", "production")
STOREFRONTS_TABLE = f"kivan-{ENVIRONMENT}-storefronts"
PRODUCTS_TABLE = f"kivan-{ENVIRONMENT}-products"

# The committed placeholder images live in this repo; the seed stores their raw
# URLs so the running app fetches them exactly as it will fetch admin-uploaded
# ones later. Pinned to main: the images land on main with this same change.
IMAGE_BASE = (
    "https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main"
    "/08-storefronts/assets/catalog"
)

# Each store carries its products inline; main() writes the store (with a
# denormalized product_count and its logo) and then each product keyed to it.
# `price` is a string here and stored as Decimal: DynamoDB rejects float,
# exactly as a wish's cost is stored. Each product's `category` groups it inside
# its store so the store screen can filter by category. Image filenames follow
# the id: `<store-id>-logo.png` and `<product-id>.png` under IMAGE_BASE.
CATALOG = [
    {
        "id": "nestwell",
        "name": "Nestwell",
        "description": "Home comforts and everyday living",
        "display_order": 1,
        "products": [
            {"id": "nestwell-linen-set",   "name": "Stonewashed Linen Bedding Set", "description": "King-size linen in oatmeal", "price": "6499", "category": "Bedding",  "link_url": "https://example.com/nestwell/linen-bedding-set"},
            {"id": "nestwell-table-lamp",  "name": "Ceramic Table Lamp",            "description": "Warm-dimmable bedside lamp",  "price": "2799", "category": "Lighting", "link_url": "https://example.com/nestwell/ceramic-table-lamp"},
            {"id": "nestwell-throw",       "name": "Chunky Knit Throw",             "description": "Hand-knit wool blend",        "price": "3199", "category": "Textiles", "link_url": "https://example.com/nestwell/chunky-knit-throw"},
            {"id": "nestwell-mug-set",     "name": "Stoneware Mug Set of 4",        "description": "Speckled glaze, dishwasher-safe", "price": "1499", "category": "Kitchen", "link_url": "https://example.com/nestwell/stoneware-mug-set"},
        ],
    },
    {
        "id": "volt",
        "name": "Volt",
        "description": "Gadgets and everyday tech",
        "display_order": 2,
        "products": [
            {"id": "volt-earbuds",     "name": "Wireless Earbuds",       "description": "Active noise cancelling", "price": "8999", "category": "Audio",     "link_url": "https://example.com/volt/wireless-earbuds"},
            {"id": "volt-charger",     "name": "65W GaN Charger",        "description": "Three-port fast charger",  "price": "3499", "category": "Charging",  "link_url": "https://example.com/volt/gan-charger"},
            {"id": "volt-speaker",     "name": "Portable Speaker",       "description": "Splash-proof, 12h battery", "price": "4599", "category": "Audio",     "link_url": "https://example.com/volt/portable-speaker"},
            {"id": "volt-smartwatch",  "name": "Fitness Smartwatch",     "description": "Heart-rate and sleep tracking", "price": "12999", "category": "Wearables", "link_url": "https://example.com/volt/fitness-smartwatch"},
        ],
    },
    {
        "id": "pageturner",
        "name": "Pageturner",
        "description": "Books and reading things",
        "display_order": 3,
        "products": [
            {"id": "pageturner-notebook", "name": "Hardcover Dot-Grid Notebook", "description": "A5, lay-flat binding",     "price": "899",  "category": "Stationery", "link_url": "https://example.com/pageturner/dot-grid-notebook"},
            {"id": "pageturner-lamp",     "name": "Clip-On Reading Light",       "description": "Rechargeable, three warmths", "price": "1299", "category": "Lighting",   "link_url": "https://example.com/pageturner/clip-on-reading-light"},
            {"id": "pageturner-bookends", "name": "Brass Bookends",              "description": "Weighted pair",            "price": "1899", "category": "Decor",      "link_url": "https://example.com/pageturner/brass-bookends"},
        ],
    },
    {
        "id": "trailhead",
        "name": "Trailhead",
        "description": "Gear for the outdoors",
        "display_order": 4,
        "products": [
            {"id": "trailhead-bottle",  "name": "Insulated Water Bottle", "description": "1L, keeps cold 24h",   "price": "1999", "category": "Hydration", "link_url": "https://example.com/trailhead/insulated-water-bottle"},
            {"id": "trailhead-daypack", "name": "22L Daypack",            "description": "Weather-resistant, padded straps", "price": "4299", "category": "Packs",     "link_url": "https://example.com/trailhead/daypack"},
            {"id": "trailhead-lantern", "name": "Rechargeable Lantern",   "description": "Collapsible camp lantern", "price": "2499", "category": "Lighting",  "link_url": "https://example.com/trailhead/rechargeable-lantern"},
            {"id": "trailhead-stove",   "name": "Compact Camp Stove",     "description": "Single burner, folds flat", "price": "3799", "category": "Cooking",   "link_url": "https://example.com/trailhead/compact-camp-stove"},
        ],
    },
]


def main():
    dynamodb = boto3.resource("dynamodb", region_name=REGION)
    storefronts_table = dynamodb.Table(STOREFRONTS_TABLE)
    products_table = dynamodb.Table(PRODUCTS_TABLE)

    store_count = product_count = 0
    for store in CATALOG:
        products = store["products"]
        storefronts_table.put_item(
            Item={
                "id": store["id"],
                "name": store["name"],
                "description": store["description"],
                "logo_url": f"{IMAGE_BASE}/{store['id']}-logo.png",
                "display_order": store["display_order"],
                # Denormalized so the store card shows a count without a query
                "product_count": len(products),
            }
        )
        store_count += 1
        print(f"  ✓ {store['name']}  ({len(products)} products)")

        for order, product in enumerate(products, start=1):
            products_table.put_item(
                Item={
                    "id": product["id"],
                    "storefront_id": store["id"],
                    "name": product["name"],
                    "description": product["description"],
                    "price": Decimal(product["price"]),
                    "category": product["category"],
                    "image_url": f"{IMAGE_BASE}/{product['id']}.png",
                    "link_url": product["link_url"],
                    "display_order": order,
                }
            )
            product_count += 1

    print("=" * 60)
    print(f"✅ Seeded {store_count} storefronts and {product_count} products")
    print("=" * 60)


if __name__ == "__main__":
    main()
