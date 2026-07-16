variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, production)"
  type        = string
  default     = "production"
}

variable "apprunner_cpu" {
  description = "CPU units for App Runner (1024 = 1 vCPU, 2048 = 2 vCPU)"
  type        = string
  default     = "1024"
}

variable "apprunner_memory" {
  description = "Memory for App Runner (2048 = 2GB, 4096 = 4GB)"
  type        = string
  default     = "2048"
}


