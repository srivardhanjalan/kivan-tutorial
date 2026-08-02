#!/usr/bin/env python3
"""
Seed the brands reference table.

Brands are the real-store directory the in-app browser opens. Unlike the
storefronts catalog (a made-up shop of placeholder products), these are REAL
brands with real websites: you browse to a product page inside the app and
Firecrawl scrapes that page into a wish. Without seeding this table, GET
/brands returns nothing and the "Browse real stores" directory is empty. Runs
with your local AWS credentials, not the App Runner instance role (the running
role can only Scan this table).

Usage (needs a python with boto3: the backend venv is the one this tutorial
installs):
    AWS_REGION=us-east-1 ENVIRONMENT=production \
        backend/.venv/bin/python infra/scripts/seed_brands.py

Idempotent: upserts by id. Upsert-only, though. Renaming or removing a brand
means deleting the old row by hand; a re-run never deletes, so a retired id
would otherwise linger in the directory forever.

The rows below are a CURATED subset of real brands, spanning categories and
countries so the multi-currency capture is real when you browse them: a scrape
from an India store quotes ₹, a US store $, a UK store £, an EU store €, a UAE
store AED. Four of them (Nike, Zara, Nykaa, Puma) have a dedicated scraper in
frontend/src/scrapers/brands/, so browsing to one of those exercises the
brand-scraper path; the rest fall back to the generic Firecrawl scrape. Brand
logos are the admin dashboard's job in step 15: the directory row shows a
glyph, so no logo is seeded here.
"""
import os

import boto3

REGION = os.environ.get("AWS_REGION", "us-east-1")
ENVIRONMENT = os.environ.get("ENVIRONMENT", "production")
BRANDS_TABLE = f"kivan-{ENVIRONMENT}-brands"

# id is a slug-like string (the table's hash key, and what an upsert keys on).
# The in-app browser opens `website_url`; `country` signals the currency a
# scrape from that store is likely to quote. display_order sorts within a
# category on the directory screen; the numbers below run per category so the
# grouped view reads in a deliberate order.
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


def main():
    dynamodb = boto3.resource("dynamodb", region_name=REGION)
    brands_table = dynamodb.Table(BRANDS_TABLE)

    for brand in BRANDS:
        brands_table.put_item(Item=brand)
        print(f"  ✓ {brand['name']}  ({brand['country']})")

    print("=" * 60)
    print(f"✅ Seeded {len(BRANDS)} brands")
    print("=" * 60)


if __name__ == "__main__":
    main()
