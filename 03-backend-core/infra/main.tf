terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = local.common_tags
  }
}

# Local values for common configuration
locals {
  project_name = "kivan"
  environment  = var.environment

  common_tags = {
    Project     = "kivan"
    Environment = var.environment
    ManagedBy   = "terraform"
    Application = "kivan-backend"
    Repository  = "github.com/srivardhanjalan/kivan-tutorial"
  }
}

# ECR Repository for backend Docker images
resource "aws_ecr_repository" "backend" {
  name                 = "${local.project_name}-api-ecr-${local.environment}"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Name = "${local.project_name}-api-ecr"
  }
}

# ECR Lifecycle Policy to clean up old images
resource "aws_ecr_lifecycle_policy" "backend" {
  repository = aws_ecr_repository.backend.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 10 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = {
        type = "expire"
      }
    }]
  })
}

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

# App Runner Service (ECR-based) — pulls :latest from ECR and redeploys
# automatically on push (auto_deployments_enabled)
resource "aws_apprunner_service" "backend_ecr" {
  service_name = "${local.project_name}-api-apprunner-${local.environment}"

  source_configuration {
    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_ecr_access.arn
    }

    image_repository {
      image_configuration {
        port = "8000"

        runtime_environment_variables = {
          # Entries join when the backend first reads them (auth keys arrive
          # at step 04, queue/bucket names with their features)
          ENVIRONMENT = var.environment
          AWS_REGION  = var.aws_region
        }
      }

      image_identifier      = "${aws_ecr_repository.backend.repository_url}:latest"
      image_repository_type = "ECR"
    }

    auto_deployments_enabled = true
  }

  instance_configuration {
    cpu    = var.apprunner_cpu
    memory = var.apprunner_memory

    instance_role_arn = aws_iam_role.apprunner_instance.arn
  }

  # Using AWS DefaultConfiguration for autoscaling (matching working examples)
  # No custom auto_scaling_configuration_arn needed

  health_check_configuration {
    protocol            = "HTTP"
    path                = "/health"
    interval            = 10
    timeout             = 5
    healthy_threshold   = 1
    unhealthy_threshold = 5
  }

  tags = {
    Name = "${local.project_name}-api-apprunner-service"
  }
}

# Resource Group for all Kivan resources
resource "aws_resourcegroups_group" "kivan" {
  name        = "${local.project_name}-resources-${local.environment}"
  description = "Resource group for all Kivan ${local.environment} resources"

  resource_query {
    query = jsonencode({
      ResourceTypeFilters = ["AWS::AllSupported"]
      TagFilters = [
        {
          Key    = "Project"
          Values = ["kivan"]
        },
        {
          Key    = "Environment"
          Values = [var.environment]
        }
      ]
    })
  }

  tags = {
    Name = "${local.project_name}-resource-group"
  }
}
