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

# CloudWatch dashboard URLs (dashboards live in monitoring.tf)
output "operations_dashboard_url" {
  description = "URL to Operations Dashboard"
  value       = "https://console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.operations.dashboard_name}"
}

output "database_dashboard_url" {
  description = "URL to Database Dashboard"
  value       = "https://console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.database.dashboard_name}"
}

output "lambda_sqs_dashboard_url" {
  description = "URL to Lambda & SQS Dashboard"
  value       = "https://console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.lambda_sqs.dashboard_name}"
}

output "errors_dashboard_url" {
  description = "URL to Errors Dashboard"
  value       = "https://console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.errors.dashboard_name}"
}

# Cost management (SNS topic + budgets live in cost-management.tf)
output "budget_alert_topic_arn" {
  description = "ARN of the SNS topic every alarm and budget publishes to"
  value       = aws_sns_topic.budget_alerts.arn
}

output "monthly_budget_name" {
  description = "Name of the monthly budget"
  value       = aws_budgets_budget.monthly_budget.name
}

output "cost_explorer_url" {
  description = "URL to AWS Cost Explorer filtered for Kivan resources"
  value       = "https://console.aws.amazon.com/cost-management/home?region=${var.aws_region}#/cost-explorer?chartStyle=STACK&costAggregate=unBlendedCost&endDate=2025-12-31&filter=%5B%7B%22dimension%22:%7B%22id%22:%22TagKey%22,%22displayValue%22:%22Tag%22%7D,%22operator%22:%22INCLUDES%22,%22values%22:%5B%7B%22value%22:%22Project%22,%22displayValue%22:%22Project%22%7D%5D%7D,%7B%22dimension%22:%7B%22id%22:%22TagKeyValue%22,%22displayValue%22:%22Tag%22%7D,%22operator%22:%22INCLUDES%22,%22values%22:%5B%7B%22value%22:%22Project%24kivan%22,%22displayValue%22:%22Project:kivan%22%7D%5D%7D%5D&granularity=Monthly&groupBy=%5B%22Service%22%5D&isDefault=false&reportName=Kivan%20Monthly%20Costs&startDate=2025-01-01"
}

output "budgets_dashboard_url" {
  description = "URL to AWS Budgets dashboard"
  value       = "https://console.aws.amazon.com/billing/home?region=${var.aws_region}#/budgets"
}
