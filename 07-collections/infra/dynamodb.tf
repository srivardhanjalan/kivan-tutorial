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
