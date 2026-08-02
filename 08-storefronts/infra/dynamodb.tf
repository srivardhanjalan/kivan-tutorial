# Users table — written by JIT provisioning on a user's first authenticated
# request. Key-only schema: every step-04 access is a get/put by id. The
# search and social indexes join in step 10 with the features that query them.
resource "aws_dynamodb_table" "users" {
  name         = "${local.project_name}-${local.environment}-users"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  tags = {
    Name = "${local.project_name}-${local.environment}-users"
  }
}

# Wishlists table — one row per collection, single-owner this step: created_by
# is the sole owner (co-owners join in step 14). CreatedByIndex serves
# GET /wishlists/me by the caller without a Scan.
resource "aws_dynamodb_table" "wishlists" {
  name         = "${local.project_name}-${local.environment}-wishlists"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "created_by"
    type = "S"
  }

  global_secondary_index {
    name            = "CreatedByIndex"
    hash_key        = "created_by"
    projection_type = "ALL"
  }

  tags = {
    Name = "${local.project_name}-${local.environment}-wishlists"
  }
}

# Wishes table — one row per wish, each belonging to a wishlist. WishlistIdIndex
# serves the wishlist-scoped listing and the cascade-delete without a Scan.
resource "aws_dynamodb_table" "wishes" {
  name         = "${local.project_name}-${local.environment}-wishes"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "wishlist_id"
    type = "S"
  }

  global_secondary_index {
    name            = "WishlistIdIndex"
    hash_key        = "wishlist_id"
    projection_type = "ALL"
  }

  tags = {
    Name = "${local.project_name}-${local.environment}-wishes"
  }
}

# Life-events table — the seeded taxonomy wishlists categorize against. Tiny
# reference data read by a full Scan (GET /life-events); no GSI, no query key.
# Populated by infra/scripts/seed_life_events.py.
resource "aws_dynamodb_table" "life_events" {
  name         = "${local.project_name}-${local.environment}-life-events"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  tags = {
    Name = "${local.project_name}-${local.environment}-life-events"
  }
}

# Storefronts table: the curated catalog of stores wishes can be added from.
# Reference data like life-events, read by a full Scan (GET /storefronts); no
# GSI, no query key. Populated by infra/scripts/seed_storefronts.py.
resource "aws_dynamodb_table" "storefronts" {
  name         = "${local.project_name}-${local.environment}-storefronts"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  tags = {
    Name = "${local.project_name}-${local.environment}-storefronts"
  }
}

# Products table: one row per catalog product, each belonging to a storefront.
# StorefrontIdIndex serves the storefront-scoped listing
# (GET /storefronts/{id}/products) without a Scan. Seeded alongside the
# storefronts by the same script.
resource "aws_dynamodb_table" "products" {
  name         = "${local.project_name}-${local.environment}-products"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "storefront_id"
    type = "S"
  }

  global_secondary_index {
    name            = "StorefrontIdIndex"
    hash_key        = "storefront_id"
    projection_type = "ALL"
  }

  tags = {
    Name = "${local.project_name}-${local.environment}-products"
  }
}
