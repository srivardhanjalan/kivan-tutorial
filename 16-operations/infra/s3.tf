# S3 bucket for user-uploaded photos (profile/cover images, wishlist and
# wish art — every upload slot rides the same pending/claim lifecycle).
# Fully private: clients never read or write it directly — the backend mints
# short-lived presigned URLs (see backend/app/utils/s3_helpers.py). This file
# owns the one true bucket name; apprunner.tf injects it into the container as
# PHOTOS_BUCKET_NAME and config.py reads it, so all three always agree.

resource "aws_s3_bucket" "photos" {
  # force_destroy: with versioning on, delete every object/version so
  # `terraform destroy` can actually remove the bucket. The account id makes
  # the name globally unique (S3 names are unique across ALL of AWS, unlike
  # the region-scoped DynamoDB tables).
  bucket        = "${local.project_name}-${local.environment}-photos-${data.aws_caller_identity.current.account_id}"
  force_destroy = true

  tags = {
    Name = "${local.project_name}-${local.environment}-photos"
  }
}

# Fully private — we serve every object through presigned URLs, never public
# reads. All four blocks on so neither an ACL nor a policy can expose it.
resource "aws_s3_bucket_public_access_block" "photos" {
  bucket = aws_s3_bucket.photos.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Versioning: a replaced or deleted photo is recoverable until the lifecycle
# rule below expires the noncurrent version.
resource "aws_s3_bucket_versioning" "photos" {
  bucket = aws_s3_bucket.photos.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Encrypt objects at rest with S3-managed keys.
resource "aws_s3_bucket_server_side_encryption_configuration" "photos" {
  bucket = aws_s3_bucket.photos.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# CORS: the browser/app PUTs bytes straight to S3 via the presigned URL and
# GETs them back, so those methods must be allowed cross-origin.
resource "aws_s3_bucket_cors_configuration" "photos" {
  bucket = aws_s3_bucket.photos.id

  cors_rule {
    allowed_headers = ["*"]
    # Uploads are presigned PUT, reads are GET/HEAD — no presigned POST here.
    allowed_methods = ["PUT", "GET", "HEAD"]
    # TODO(prod-tighten): pin to the real frontend origin(s) before launch —
    # "*" is fine while the app is unshipped but too open for production.
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "photos" {
  bucket = aws_s3_bucket.photos.id

  # Reclaim old versions left behind by replaced/deleted photos.
  rule {
    id     = "delete-noncurrent-versions"
    status = "Enabled"

    filter {} # all objects

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }

  # Reclaim storage from uploads that were started but never finished.
  rule {
    id     = "abort-incomplete-multipart"
    status = "Enabled"

    filter {} # all objects

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }

  # Photo lifecycle is backend-owned: clients upload to pending/, and the API
  # claims the object into the permanent keyspace when the record is saved.
  # Anything still under pending/ after a day was abandoned — expire it. On a
  # versioned bucket "expire" writes a delete marker, so also reap the
  # noncurrent bytes fast (pending uploads need no recovery window) — otherwise
  # an abandoned upload's bytes would linger the full 30 days of the rule above.
  rule {
    id     = "expire-unclaimed-pending-uploads"
    status = "Enabled"

    filter {
      prefix = "pending/"
    }

    expiration {
      days = 1
    }

    noncurrent_version_expiration {
      noncurrent_days = 1
    }
  }
}

# The running backend copies, signs (get_object), presigns (put_object), and
# deletes objects in this one bucket — all object-level, scoped to its ARN/*,
# never "*". No ListBucket: nothing enumerates the bucket.
resource "aws_iam_role_policy" "apprunner_instance_s3" {
  name = "${local.project_name}-apprunner-s3-policy-${local.environment}"
  role = aws_iam_role.apprunner_instance.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject"
        ]
        Resource = "${aws_s3_bucket.photos.arn}/*"
      }
    ]
  })
}
