#!/usr/bin/env python3
"""
Seed the brands reference table.

Brands are the real-store directory the in-app browser opens. Unlike the
storefronts catalog (a made-up shop of placeholder products), these are REAL
brands with real websites: you browse to a product page inside the app and
Firecrawl scrapes that page into a wish. Without seeding this table, GET
/brands returns nothing and the "Browse real stores" directory is empty. Runs
with your local AWS credentials, not the App Runner instance role (the running
role can only Scan this table and read the logos it signs).

Usage (needs a python with boto3: the backend venv is the one this tutorial
installs, and the photos bucket name the logos upload to):
    AWS_REGION=us-east-1 ENVIRONMENT=production \
        PHOTOS_BUCKET_NAME=$(terraform -chdir=infra output -raw photos_bucket_name) \
        backend/.venv/bin/python infra/scripts/seed_brands.py

Idempotent: upserts each row by id and overwrites each logo by key, so a re-run
is a safe no-op. Upsert-only, though. Renaming or removing a brand means
deleting the old row (and its logo) by hand; a re-run never deletes, so a
retired id would otherwise linger in the directory forever.

The rows below are a CURATED subset of real brands, spanning categories and
countries so the multi-currency capture is real when you browse them: a scrape
from an India store quotes ₹, a US store $, a UK store £, an EU store €, a UAE
store AED. Four of them (Nike, Zara, Nykaa, Puma) have a dedicated scraper in
frontend/src/scrapers/brands/, so browsing to one of those exercises the
brand-scraper path; the rest fall back to the generic Firecrawl scrape.

Each brand carries a logo. The logos are honest, license-clean placeholders
committed under 09-browser/assets/brands/ (a plain initial-on-wash wordmark, NOT
an imitation of any brand's real mark); the seed uploads each to the private
photos bucket under a stable catalog/ key and stores that object's bucket URL on
the row, so the backend re-signs it on read (get_signed_url_for_s3) exactly as
it serves a storefront logo or an uploaded wish photo. Swapping these for
admin-uploaded art is step 15's job: the S3 pipeline they ride is already the
real one.
"""
import os
from pathlib import Path

import boto3
from botocore.config import Config

REGION = os.environ.get("AWS_REGION", "us-east-1")
ENVIRONMENT = os.environ.get("ENVIRONMENT", "production")
BRANDS_TABLE = f"kivan-{ENVIRONMENT}-brands"

# The bucket is global (account-suffixed), so unlike the table it can't be
# derived from ENVIRONMENT; read it exactly as the container does, from
# PHOTOS_BUCKET_NAME (infra/s3.tf owns the name, apprunner.tf injects it, and
# `terraform output -raw photos_bucket_name` prints it). Fail loudly if unset:
# without a bucket there is nowhere to upload the brand logos.
BUCKET = os.environ.get("PHOTOS_BUCKET_NAME")
if not BUCKET:
    raise SystemExit(
        "PHOTOS_BUCKET_NAME is required (the photos bucket to upload brand "
        "logos to). Get it with: terraform -chdir=infra output -raw photos_bucket_name"
    )

# Committed placeholder logos live in this step's assets/brands/ (two levels up
# from infra/scripts/). Each logo is `<brand-id>.png`.
ASSETS_DIR = Path(__file__).resolve().parents[2] / "assets" / "brands"

# Brand logos upload to one shared, read-only keyspace: catalog/brands/<id>.png.
# The App Runner read grant already covers the whole bucket (infra/s3.tf), so
# signing them needs no IAM change; the pending/ lifecycle rule never touches
# this prefix, so they persist. s3_helpers.CATALOG_PREFIX ("catalog/") matches,
# exempting these shared objects from the per-record photo ownership/delete rules.
IMAGE_PREFIX = "catalog"

# SigV4 to match the backend's signer (s3_helpers): there is no reason the
# seed's client should differ.
s3_client = boto3.client(
    "s3", region_name=REGION, config=Config(signature_version="s3v4")
)

# id is a slug-like string (the table's hash key, and what an upsert keys on),
# and also the logo's asset/key basename. The in-app browser opens `website_url`;
# `country` signals the currency a scrape from that store is likely to quote.
# display_order sorts within a category on the directory screen; the numbers
# below run per category so the grouped view reads in a deliberate order.
BRANDS = [
    # Fashion & Apparel
    {"id": "nike", "name": "Nike", "description": "Athletic footwear and apparel", "website_url": "https://www.nike.com", "category": "Fashion & Apparel", "country": "United States", "display_order": 1},
    {"id": "zara", "name": "Zara", "description": "Spanish fast-fashion retailer", "website_url": "https://www.zara.com", "category": "Fashion & Apparel", "country": "Spain", "display_order": 2},
    {"id": "fabindia", "name": "FabIndia", "description": "Indian ethnic wear and home goods", "website_url": "https://www.fabindia.com", "category": "Fashion & Apparel", "country": "India", "display_order": 3},
    {"id": "namshi", "name": "Namshi", "description": "Middle East fashion and lifestyle", "website_url": "https://www.namshi.com", "category": "Fashion & Apparel", "country": "United Arab Emirates", "display_order": 4},

    # Sports & Fitness
    {"id": "puma", "name": "Puma", "description": "German sportswear and footwear", "website_url": "https://www.puma.com", "category": "Sports & Fitness", "country": "Germany", "display_order": 1},

    # Beauty & Personal Care
    {"id": "nykaa", "name": "Nykaa", "description": "India's leading beauty retailer", "website_url": "https://www.nykaa.com", "category": "Beauty & Personal Care", "country": "India", "display_order": 1},
    {"id": "the-body-shop", "name": "The Body Shop", "description": "British cosmetics and skincare", "website_url": "https://www.thebodyshop.com", "category": "Beauty & Personal Care", "country": "United Kingdom", "display_order": 2},

    # Electronics & Tech
    {"id": "apple", "name": "Apple", "description": "Devices, accessories, and services", "website_url": "https://www.apple.com/in", "category": "Electronics & Tech", "country": "India", "display_order": 1},

    # E-Commerce & Retail
    {"id": "amazon", "name": "Amazon", "description": "Everything store", "website_url": "https://www.amazon.com", "category": "E-Commerce & Retail", "country": "United States", "display_order": 1},
    {"id": "noon", "name": "Noon", "description": "Middle East online marketplace", "website_url": "https://www.noon.com", "category": "E-Commerce & Retail", "country": "United Arab Emirates", "display_order": 2},

    # Luxury Fashion
    {"id": "burberry", "name": "Burberry", "description": "British luxury fashion house", "website_url": "https://www.burberry.com", "category": "Luxury Fashion", "country": "United Kingdom", "display_order": 1},
    {"id": "louis-vuitton", "name": "Louis Vuitton", "description": "French luxury fashion house", "website_url": "https://www.louisvuitton.com", "category": "Luxury Fashion", "country": "France", "display_order": 2},

    # Jewelry & Watches
    {"id": "tanishq", "name": "Tanishq", "description": "Indian fine jewelry", "website_url": "https://www.tanishq.co.in", "category": "Jewelry & Watches", "country": "India", "display_order": 1},
]


def upload_logo(brand_id: str, key: str) -> str:
    """Upload one committed placeholder logo to the photos bucket under `key`
    (overwrite by key, so re-running is idempotent) and return the canonical
    bucket URL `https://<bucket>.s3.<region>.amazonaws.com/<key>`, the same
    form the backend persists for an uploaded photo, so a stored logo URL
    re-signs on read exactly like a storefront's."""
    with (ASSETS_DIR / f"{brand_id}.png").open("rb") as f:
        s3_client.put_object(
            Bucket=BUCKET, Key=key, Body=f.read(), ContentType="image/png"
        )
    return f"https://{BUCKET}.s3.{REGION}.amazonaws.com/{key}"


def main():
    dynamodb = boto3.resource("dynamodb", region_name=REGION)
    brands_table = dynamodb.Table(BRANDS_TABLE)

    for brand in BRANDS:
        logo_url = upload_logo(brand["id"], f"{IMAGE_PREFIX}/brands/{brand['id']}.png")
        brands_table.put_item(Item={**brand, "logo_url": logo_url})
        print(f"  ✓ {brand['name']}  ({brand['country']})")

    print("=" * 60)
    print(f"✅ Seeded {len(BRANDS)} brands ({len(BRANDS)} logos uploaded)")
    print("=" * 60)


if __name__ == "__main__":
    main()
