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

output "photos_bucket_name" {
  description = "Private photos bucket; the storefronts seed uploads catalog images here (pass as PHOTOS_BUCKET_NAME)"
  value       = aws_s3_bucket.photos.bucket
}

output "notifications_queue_url" {
  description = "URL of the SQS notifications queue the backend publishes events to"
  value       = aws_sqs_queue.notifications.url
}

output "alarms_console_url" {
  description = "URL to the CloudWatch Alarms console"
  value       = "https://console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#alarmsV2:"
}

output "critical_alarms" {
  description = "The critical-severity alarms (DLQ + both composites)"
  value = [
    aws_cloudwatch_metric_alarm.metric["sqs-dlq-messages"].alarm_name,
    aws_cloudwatch_composite_alarm.service_degradation.alarm_name,
    aws_cloudwatch_composite_alarm.notification_system_failure.alarm_name
  ]
}
