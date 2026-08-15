# CloudWatch Alarms for the Kivan backend.
# Automated alarms that publish to SNS when a threshold is crossed.
#
# Every alarm's only action is the SNS topic from cost-management.tf — one
# notification channel for all severities. Note: provider default_tags applies
# the common Project/Environment/... tags; only resource-specific tags (Name,
# Severity) are set here.

locals {
  # AppRunner metrics are published with BOTH ServiceName and ServiceID
  # dimensions; without them an alarm watches a metric that does not exist and
  # never fires.
  apprunner_dimensions = {
    ServiceName = aws_apprunner_service.backend_ecr.service_name
    ServiceID   = aws_apprunner_service.backend_ecr.service_id
  }

  lambda_dimensions = {
    FunctionName = aws_lambda_function.notification_processor.function_name
  }

  # Simple single-metric alarms, keyed by alarm-name suffix.
  # statistic/extended_statistic are mutually exclusive; provide exactly one.
  metric_alarms = {
    api-high-latency = {
      description        = "Alert when API P99 latency exceeds 2 seconds"
      namespace          = "AWS/AppRunner"
      metric_name        = "RequestLatency"
      extended_statistic = "p99"
      evaluation_periods = 2
      threshold          = 2000
      dimensions         = local.apprunner_dimensions
      name_tag           = "${local.project_name}-high-latency-alarm"
      severity           = "medium"
    }
    api-high-cpu = {
      description        = "Alert when API CPU utilization exceeds 80%"
      namespace          = "AWS/AppRunner"
      metric_name        = "CPUUtilization"
      statistic          = "Average"
      evaluation_periods = 2
      threshold          = 80
      dimensions         = local.apprunner_dimensions
      name_tag           = "${local.project_name}-high-cpu-alarm"
      severity           = "high"
    }
    api-high-memory = {
      description        = "Alert when API memory utilization exceeds 85%"
      namespace          = "AWS/AppRunner"
      metric_name        = "MemoryUtilization"
      statistic          = "Average"
      evaluation_periods = 2
      threshold          = 85
      dimensions         = local.apprunner_dimensions
      name_tag           = "${local.project_name}-high-memory-alarm"
      severity           = "high"
    }
    lambda-errors = {
      description        = "Alert when the notification Lambda has errors"
      namespace          = "AWS/Lambda"
      metric_name        = "Errors"
      statistic          = "Sum"
      evaluation_periods = 1
      threshold          = 5
      dimensions         = local.lambda_dimensions
      name_tag           = "${local.project_name}-lambda-errors-alarm"
      severity           = "high"
    }
    lambda-throttles = {
      description        = "Alert when the notification Lambda is throttled"
      namespace          = "AWS/Lambda"
      metric_name        = "Throttles"
      statistic          = "Sum"
      evaluation_periods = 1
      threshold          = 1
      dimensions         = local.lambda_dimensions
      name_tag           = "${local.project_name}-lambda-throttles-alarm"
      severity           = "high"
    }
    lambda-duration = {
      description        = "Alert when Lambda duration approaches timeout (timeout is 60s)"
      namespace          = "AWS/Lambda"
      metric_name        = "Duration"
      statistic          = "Maximum"
      evaluation_periods = 2
      threshold          = 50000
      dimensions         = local.lambda_dimensions
      name_tag           = "${local.project_name}-lambda-duration-alarm"
      severity           = "medium"
    }
    sqs-dlq-messages = {
      description        = "CRITICAL: Messages in the dead-letter queue mean notification processing is failing"
      namespace          = "AWS/SQS"
      metric_name        = "ApproximateNumberOfMessagesVisible"
      statistic          = "Maximum"
      evaluation_periods = 1
      threshold          = 0
      dimensions         = { QueueName = aws_sqs_queue.notifications_dlq.name }
      name_tag           = "${local.project_name}-dlq-messages-alarm"
      severity           = "critical"
    }
    sqs-queue-depth = {
      description        = "Alert when the notifications queue has too many pending messages"
      namespace          = "AWS/SQS"
      metric_name        = "ApproximateNumberOfMessagesVisible"
      statistic          = "Average"
      evaluation_periods = 2
      threshold          = 100
      dimensions         = { QueueName = aws_sqs_queue.notifications.name }
      name_tag           = "${local.project_name}-queue-depth-alarm"
      severity           = "medium"
    }
    sqs-message-age = {
      description        = "Alert when messages are not being processed in time"
      namespace          = "AWS/SQS"
      metric_name        = "ApproximateAgeOfOldestMessage"
      statistic          = "Maximum"
      evaluation_periods = 1
      threshold          = 3600
      dimensions         = { QueueName = aws_sqs_queue.notifications.name }
      name_tag           = "${local.project_name}-message-age-alarm"
      severity           = "medium"
    }
    # DynamoDB UserErrors is an account/region-level metric (no dimensions), so a
    # dimensionless alarm is valid here. (SystemErrors, by contrast, is only
    # published per TableName+Operation — a dimensionless SystemErrors alarm can
    # never fire, so no such alarm is defined.)
    dynamodb-user-errors = {
      description        = "Alert when DynamoDB has user errors (validation, access denied, etc.)"
      namespace          = "AWS/DynamoDB"
      metric_name        = "UserErrors"
      statistic          = "Sum"
      evaluation_periods = 1
      threshold          = 10
      dimensions         = null
      name_tag           = "${local.project_name}-dynamodb-user-errors-alarm"
      severity           = "medium"
    }
  }
}

resource "aws_cloudwatch_metric_alarm" "metric" {
  for_each = local.metric_alarms

  alarm_name          = "${local.project_name}-${local.environment}-${each.key}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = each.value.evaluation_periods
  metric_name         = each.value.metric_name
  namespace           = each.value.namespace
  period              = 300
  statistic           = try(each.value.statistic, null)
  extended_statistic  = try(each.value.extended_statistic, null)
  threshold           = each.value.threshold
  alarm_description   = each.value.description
  treat_missing_data  = "notBreaching"
  dimensions          = each.value.dimensions

  alarm_actions = [aws_sns_topic.budget_alerts.arn]

  tags = {
    Name     = each.value.name_tag
    Severity = each.value.severity
  }
}

# ==========================================
# Error-rate alarms (metric math — kept explicit)
# ==========================================

# Alarm: High 5xx error rate (server errors)
resource "aws_cloudwatch_metric_alarm" "api_5xx_error_rate" {
  alarm_name          = "${local.project_name}-${local.environment}-api-5xx-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  threshold           = 5 # Alert if >5% of requests return 5xx
  alarm_description   = "Alert when API 5xx error rate exceeds 5%"
  treat_missing_data  = "notBreaching"

  metric_query {
    id          = "e1"
    expression  = "(m2/m1)*100"
    label       = "5xx Error Rate %"
    return_data = true
  }

  metric_query {
    id = "m1"
    metric {
      namespace   = "AWS/AppRunner"
      metric_name = "Requests"
      stat        = "Sum"
      period      = 300
      dimensions  = local.apprunner_dimensions
    }
  }

  metric_query {
    id = "m2"
    metric {
      namespace   = "AWS/AppRunner"
      metric_name = "5xxStatusResponses"
      stat        = "Sum"
      period      = 300
      dimensions  = local.apprunner_dimensions
    }
  }

  alarm_actions = [aws_sns_topic.budget_alerts.arn]

  tags = {
    Name     = "${local.project_name}-5xx-error-alarm"
    Severity = "high"
  }
}

# Alarm: High 4xx error rate (client errors)
resource "aws_cloudwatch_metric_alarm" "api_4xx_error_rate" {
  alarm_name          = "${local.project_name}-${local.environment}-api-4xx-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  threshold           = 15 # Alert if >15% of requests return 4xx
  alarm_description   = "Alert when API 4xx error rate exceeds 15%"
  treat_missing_data  = "notBreaching"

  metric_query {
    id          = "e1"
    expression  = "(m2/m1)*100"
    label       = "4xx Error Rate %"
    return_data = true
  }

  metric_query {
    id = "m1"
    metric {
      namespace   = "AWS/AppRunner"
      metric_name = "Requests"
      stat        = "Sum"
      period      = 300
      dimensions  = local.apprunner_dimensions
    }
  }

  metric_query {
    id = "m2"
    metric {
      namespace   = "AWS/AppRunner"
      metric_name = "4xxStatusResponses"
      stat        = "Sum"
      period      = 300
      dimensions  = local.apprunner_dimensions
    }
  }

  alarm_actions = [aws_sns_topic.budget_alerts.arn]

  tags = {
    Name     = "${local.project_name}-4xx-error-alarm"
    Severity = "medium"
  }
}

# ==========================================
# Composite alarms (logical combinations)
# ==========================================

# Composite: service degradation — fires only when high 5xx errors AND high
# latency happen together, so a lone blip on either signal stays quiet.
resource "aws_cloudwatch_composite_alarm" "service_degradation" {
  alarm_name        = "${local.project_name}-${local.environment}-service-degradation"
  alarm_description = "CRITICAL: Service degradation detected (high errors + high latency)"
  actions_enabled   = true

  alarm_actions = [aws_sns_topic.budget_alerts.arn]

  alarm_rule = "ALARM(${aws_cloudwatch_metric_alarm.api_5xx_error_rate.alarm_name}) AND ALARM(${aws_cloudwatch_metric_alarm.metric["api-high-latency"].alarm_name})"

  tags = {
    Name     = "${local.project_name}-service-degradation-alarm"
    Severity = "critical"
  }
}

# Composite: notification-system failure — fires when EITHER the Lambda is
# erroring OR anything has landed in the DLQ.
resource "aws_cloudwatch_composite_alarm" "notification_system_failure" {
  alarm_name        = "${local.project_name}-${local.environment}-notification-system-failure"
  alarm_description = "CRITICAL: Notification system is failing"
  actions_enabled   = true

  alarm_actions = [aws_sns_topic.budget_alerts.arn]

  alarm_rule = "ALARM(${aws_cloudwatch_metric_alarm.metric["lambda-errors"].alarm_name}) OR ALARM(${aws_cloudwatch_metric_alarm.metric["sqs-dlq-messages"].alarm_name})"

  tags = {
    Name     = "${local.project_name}-notification-failure-alarm"
    Severity = "critical"
  }
}

# ==========================================
# Outputs
# ==========================================

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
