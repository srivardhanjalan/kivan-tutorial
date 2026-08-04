# Users table — written by JIT provisioning on a user's first authenticated
# request. Step 04 kept it key-only; step 10 (social) adds the two indexes its
# search and Discover screens query. Every indexed user carries entity_type =
# "USER" as a constant partition key: the one value both GSIs hash on, so a
# single Query returns "all users" ordered by the index's range key.
resource "aws_dynamodb_table" "users" {
  name         = "${local.project_name}-${local.environment}-users"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  # entity_type is a constant "USER": the shared hash key that lets both GSIs
  # gather every user under one partition and sort by their range key.
  attribute {
    name = "entity_type"
    type = "S"
  }

  # Lowercased "first last", the sort key NameSearchIndex prefix-matches on.
  attribute {
    name = "name_lowercase"
    type = "S"
  }

  # Denormalized follower tally: the range key PopularUsersIndex sorts by, so
  # "most-followed first" is a Query, never a Scan-and-sort.
  attribute {
    name = "follower_count"
    type = "N"
  }

  # Typeahead search: entity_type = "USER" AND name_lowercase begins_with(q).
  global_secondary_index {
    name            = "NameSearchIndex"
    hash_key        = "entity_type"
    range_key       = "name_lowercase"
    projection_type = "ALL"
  }

  # Discover's default rail: every user under one partition, read newest-follow
  # first by querying this index in descending follower_count order.
  global_secondary_index {
    name            = "PopularUsersIndex"
    hash_key        = "entity_type"
    range_key       = "follower_count"
    projection_type = "ALL"
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

  # entity_type is a constant "WISHLIST": the shared hash key PopularWishlistsIndex
  # gathers every wishlist under, so Discover's "wishlists to love" rail is one
  # Query sorted by love_count, never a Scan-and-sort (the users-table pattern).
  attribute {
    name = "entity_type"
    type = "S"
  }

  # Denormalized love tally: the range key PopularWishlistsIndex ranks by.
  attribute {
    name = "love_count"
    type = "N"
  }

  global_secondary_index {
    name            = "CreatedByIndex"
    hash_key        = "created_by"
    projection_type = "ALL"
  }

  # Discover's rail: every wishlist under one partition, read most-loved first.
  global_secondary_index {
    name            = "PopularWishlistsIndex"
    hash_key        = "entity_type"
    range_key       = "love_count"
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

# Brands table: the real-store directory the in-app browser opens. Reference
# data like storefronts and life-events, read by a full Scan (GET /brands); no
# GSI, no query key (the directory screen groups by category client-side).
# Populated by infra/scripts/seed_brands.py.
resource "aws_dynamodb_table" "brands" {
  name         = "${local.project_name}-${local.environment}-brands"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  tags = {
    Name = "${local.project_name}-${local.environment}-brands"
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

# Followers table, one row per follow edge, keyed (follower_id, following_id):
# the actor's id partitions, so "who X follows" is a Query on the base table.
# FollowingIndex flips the edge (hash following_id) to answer "who follows X".
# The follower/following COUNTS live denormalized on the user record (see
# adjust_count); this table is the edges themselves.
resource "aws_dynamodb_table" "followers" {
  name         = "${local.project_name}-${local.environment}-followers"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "follower_id"
  range_key    = "following_id"

  attribute {
    name = "follower_id"
    type = "S"
  }

  attribute {
    name = "following_id"
    type = "S"
  }

  global_secondary_index {
    name            = "FollowingIndex"
    hash_key        = "following_id"
    projection_type = "KEYS_ONLY"
  }

  tags = {
    Name = "${local.project_name}-${local.environment}-followers"
  }
}

# Wishlist-loves table, one row per love edge, keyed (user_id, wishlist_id):
# the lover's id partitions, so "wishlists this user loves" is a Query on the
# base table and needs no GSI. The per-wishlist love COUNT lives denormalized
# on the wishlist record (adjust_count); "does user X love wishlist Y" is a
# direct GetItem on this composite key.
resource "aws_dynamodb_table" "wishlist_loves" {
  name         = "${local.project_name}-${local.environment}-wishlist-loves"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "user_id"
  range_key    = "wishlist_id"

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "wishlist_id"
    type = "S"
  }

  tags = {
    Name = "${local.project_name}-${local.environment}-wishlist-loves"
  }
}
