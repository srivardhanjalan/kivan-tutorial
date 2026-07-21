output "ecr_repository_url" {
  description = "URL of the ECR repository (push target for backend images)"
  value       = aws_ecr_repository.backend.repository_url
}

output "apprunner_ecr_service_url" {
  description = "URL of the ECR-based App Runner service (Production)"
  value       = try("https://${aws_apprunner_service.backend_ecr.service_url}", null)
}

output "apprunner_ecr_service_arn" {
  description = "ARN of the ECR-based App Runner service (Production)"
  value       = try(aws_apprunner_service.backend_ecr.arn, null)
}

output "resource_group_name" {
  description = "Name of the resource group"
  value       = aws_resourcegroups_group.kivan.name
}
