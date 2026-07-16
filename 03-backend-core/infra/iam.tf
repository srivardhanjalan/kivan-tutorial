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
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchGetImage",
          "ecr:GetDownloadUrlForLayer",
          "ecr:DescribeImages"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:BatchGetImage",
          "ecr:GetDownloadUrlForLayer"
        ]
        Resource = aws_ecr_repository.backend.arn
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
