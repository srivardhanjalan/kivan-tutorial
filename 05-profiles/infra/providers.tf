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
