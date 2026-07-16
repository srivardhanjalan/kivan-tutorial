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

# IAM Policy for App Runner to resolve runtime_environment_secrets from SSM
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
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem"
        ]
        Resource = aws_dynamodb_table.users.arn
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
