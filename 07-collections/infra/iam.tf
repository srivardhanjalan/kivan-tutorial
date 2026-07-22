# IAM Role for App Runner ECR Access (pull images from ECR)
resource "aws_iam_role" "apprunner_ecr_access" {
  name = "${local.project_name}-apprunner-ecr-access-${local.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "build.apprunner.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${local.project_name}-apprunner-ecr-access-role"
  }
}

# IAM Policy for App Runner to access ECR
resource "aws_iam_role_policy" "apprunner_ecr_access" {
  name = "${local.project_name}-apprunner-ecr-access-policy-${local.environment}"
  role = aws_iam_role.apprunner_ecr_access.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # The only ECR action that requires "*" — it issues the registry
        # login token, not access to any repository
        Effect   = "Allow"
        Action   = ["ecr:GetAuthorizationToken"]
        Resource = "*"
      },
      {
        # Image pulls are scoped to this service's one repository
        Effect = "Allow"
        Action = [
          "ecr:BatchGetImage",
          "ecr:GetDownloadUrlForLayer",
          "ecr:DescribeImages"
        ]
        Resource = aws_ecr_repository.backend.arn
      }
    ]
  })
}

# IAM Policy for the running backend to resolve its secret from SSM
resource "aws_iam_role_policy" "apprunner_instance_ssm" {
  name = "${local.project_name}-apprunner-ssm-policy-${local.environment}"
  role = aws_iam_role.apprunner_instance.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["ssm:GetParameters"]
        Resource = aws_ssm_parameter.clerk_secret_key.arn
      }
    ]
  })
}

# IAM Policy for the running backend to reach its DynamoDB tables
resource "aws_iam_role_policy" "apprunner_instance_dynamodb" {
  name = "${local.project_name}-apprunner-dynamodb-policy-${local.environment}"
  role = aws_iam_role.apprunner_instance.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Users: key-only get/put/update by id (JIT provisioning + profile)
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem"
        ]
        Resource = aws_dynamodb_table.users.arn
      },
      {
        # Wishlists: get/put/delete by id, UpdateItem (PUT is a guarded
        # field-scoped update — utils/dynamo.update_item_fields), and Query
        # on CreatedByIndex (GET /wishlists/me + the account-deletion sweep).
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query"
        ]
        Resource = [
          aws_dynamodb_table.wishlists.arn,
          "${aws_dynamodb_table.wishlists.arn}/index/*"
        ]
      },
      {
        # Wishes: item CRUD (UpdateItem flips `completed`), Query on
        # WishlistIdIndex (listing + cascade delete), and BatchWriteItem for
        # the cascade's batched deletes.
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:BatchWriteItem"
        ]
        Resource = [
          aws_dynamodb_table.wishes.arn,
          "${aws_dynamodb_table.wishes.arn}/index/*"
        ]
      },
      {
        # Life events: reference data the app reads with a full-table Scan
        # (GET /life-events) and nothing more. The running role only Scans;
        # seeding writes under local developer credentials, not this role, so
        # GetItem/PutItem are deliberately withheld. Scan is granted on this
        # table and nowhere else.
        Effect   = "Allow"
        Action   = ["dynamodb:Scan"]
        Resource = aws_dynamodb_table.life_events.arn
      }
    ]
  })
}

# IAM Role for App Runner Instance
resource "aws_iam_role" "apprunner_instance" {
  name = "${local.project_name}-apprunner-instance-role-${local.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "tasks.apprunner.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${local.project_name}-apprunner-instance-role"
  }
}
