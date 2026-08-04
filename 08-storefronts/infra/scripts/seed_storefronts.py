#!/usr/bin/env python3
"""
Seed the storefronts and products reference tables.

Storefronts are the curated catalog a wish can be added from. The two tables
are reference data: without seeding them, GET /storefronts returns nothing and
the Wish Store tab has no stores to browse. Runs with your local AWS
credentials, not the App Runner instance role (the running role can only READ
these tables and the catalog images it signs).

Usage (needs a python with boto3: the backend venv is the one this tutorial
installs, and the photos bucket name the images upload to):
    AWS_REGION=us-east-1 ENVIRONMENT=production \
        PHOTOS_BUCKET_NAME=$(terraform -chdir=infra output -raw photos_bucket_name) \
        backend/.venv/bin/python infra/scripts/seed_storefronts.py

Idempotent: upserts each row by id and overwrites each image by key, so a
re-run is a safe no-op. Upsert-only, though. Renaming or removing a store or
product means deleting the old row (and its image) by hand; a re-run never
deletes, so a retired id would otherwise linger in the catalog forever.

The rows below are placeholder catalog data (prices in the app's single
currency, links pointing at example.com): enough to browse the feature and add
a wish from it. Each store carries a logo and each product a photo and a
category. The images are honest, license-clean placeholders committed under
08-storefronts/assets/catalog/; the seed uploads each to the private photos
bucket under a stable catalog/ key and stores that object's bucket URL on the
row, so the backend re-signs it on read (get_signed_url_for_s3) exactly as it
serves an uploaded wish photo. Swapping these placeholders for admin-uploaded
art is step 15's job: the S3 pipeline they ride is already the real one.
"""
import os
from decimal import Decimal
from pathlib import Path

import boto3
from botocore.config import Config

REGION = os.environ.get("AWS_REGION", "us-east-1")
ENVIRONMENT = os.environ.get("ENVIRONMENT", "production")
STOREFRONTS_TABLE = f"kivan-{ENVIRONMENT}-storefronts"
PRODUCTS_TABLE = f"kivan-{ENVIRONMENT}-products"

# The bucket is global (account-suffixed), so unlike the tables it can't be
# derived from ENVIRONMENT; read it exactly as the container does, from
# PHOTOS_BUCKET_NAME (infra/s3.tf owns the name, apprunner.tf injects it, and
# `terraform output -raw photos_bucket_name` prints it). Fail loudly if unset:
# without a bucket there is nowhere to upload the catalog images.
BUCKET = os.environ.get("PHOTOS_BUCKET_NAME")
if not BUCKET:
    raise SystemExit(
        "PHOTOS_BUCKET_NAME is required (the photos bucket to upload catalog "
        "images to). Get it with: terraform -chdir=infra output -raw photos_bucket_name"
    )

# Committed placeholder images live in this step's assets/catalog/ (two levels
# up from infra/scripts/). Each store logo is `<store-id>-logo.png` and each
# product photo is `<product-id>.png`.
ASSETS_DIR = Path(__file__).resolve().parents[2] / "assets" / "catalog"

# Catalog images upload to one shared, read-only keyspace:
# catalog/storefronts/<id>.png and catalog/products/<id>.png. The App Runner
# read grant already covers the whole bucket (infra/s3.tf), so signing them
# needs no IAM change; the pending/ lifecycle rule never touches this prefix, so
# they persist. s3_helpers.CATALOG_PREFIX matches, exempting these shared
# objects from the per-record photo ownership/delete rules.
IMAGE_PREFIX = "catalog"

# SigV4 to match the backend's signer (s3_helpers): there is no reason the
# seed's client should differ.
s3_client = boto3.client(
    "s3", region_name=REGION, config=Config(signature_version="s3v4")
)


def upload_catalog_image(filename: str, key: str) -> str:
    """Upload one committed placeholder to the photos bucket under `key`
    (overwrite by key, so re-running is idempotent) and return the canonical
    bucket URL `https://<bucket>.s3.<region>.amazonaws.com/<key>`, the same
    form the backend persists for an uploaded photo, so a stored catalog URL
    re-signs on read exactly like a wish's."""
    with (ASSETS_DIR / filename).open("rb") as f:
        s3_client.put_object(
            Bucket=BUCKET, Key=key, Body=f.read(), ContentType="image/png"
        )
    return f"https://{BUCKET}.s3.{REGION}.amazonaws.com/{key}"


# Each store carries its products inline; main() uploads the store logo and
# writes the store (with a denormalized product_count), then uploads and writes
# each product keyed to it. `price` is a string here and stored as Decimal:
# DynamoDB rejects float, exactly as a wish's cost is stored. Each product's
# `category` groups it inside its store so the store screen can filter by it.
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

    store_count = product_count = image_count = 0
    for store in CATALOG:
        products = store["products"]
        logo_url = upload_catalog_image(
            f"{store['id']}-logo.png", f"{IMAGE_PREFIX}/storefronts/{store['id']}.png"
        )
        image_count += 1
        storefronts_table.put_item(
            Item={
                "id": store["id"],
                "name": store["name"],
                "description": store["description"],
                "logo_url": logo_url,
                "display_order": store["display_order"],
                # Denormalized so the store card shows a count without a query
                "product_count": len(products),
            }
        )
        store_count += 1
        print(f"  ✓ {store['name']}  ({len(products)} products)")

        for order, product in enumerate(products, start=1):
            image_url = upload_catalog_image(
                f"{product['id']}.png", f"{IMAGE_PREFIX}/products/{product['id']}.png"
            )
            image_count += 1
            products_table.put_item(
                Item={
                    "id": product["id"],
                    "storefront_id": store["id"],
                    "name": product["name"],
                    "description": product["description"],
                    "price": Decimal(product["price"]),
                    "category": product["category"],
                    "image_url": image_url,
                    "link_url": product["link_url"],
                    "display_order": order,
                }
            )
            product_count += 1

    print("=" * 60)
    print(
        f"✅ Seeded {store_count} storefronts and {product_count} products "
        f"({image_count} images uploaded)"
    )
    print("=" * 60)


if __name__ == "__main__":
    main()
