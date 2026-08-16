# Cost Management & Budgets for Kivan
#
# The SNS topic here is the single notification channel: every CloudWatch alarm
# (alarms.tf) AND every budget below publishes to it, so the topic is declared
# first — the alarms and budgets reference its ARN.
#
# Cost Anomaly Detection is intentionally NOT provisioned here (no dead HCL); see
# the "Cost anomaly detection" note in README.md for how to add it.
#
# Budget/topic outputs live in outputs.tf, not this file.
#
# Note: provider default_tags applies the common Project/Environment/... tags;
# only resource-specific Name tags are set here.

# SNS Topic — the single notification channel for all operational alerts.
resource "aws_sns_topic" "budget_alerts" {
  name = "${local.project_name}-${local.environment}-budget-alerts"

  tags = {
    Name = "${local.project_name}-budget-alerts"
  }
}

# Email subscription. AWS emails a confirmation link on apply; until someone
# clicks it the subscription stays PendingConfirmation and no alert is delivered.
# The default is a placeholder — set budget_alert_email in terraform.tfvars to a
# real inbox you can confirm from.
resource "aws_sns_topic_subscription" "budget_alerts_email" {
  topic_arn = aws_sns_topic.budget_alerts.arn
  protocol  = "email"
  endpoint  = var.budget_alert_email
}

# Monthly Budget for Kivan Resources
# Filtered by Project=kivan tag to only track Kivan costs.
resource "aws_budgets_budget" "monthly_budget" {
  name              = "${local.project_name}-${local.environment}-monthly-budget"
  budget_type       = "COST"
  limit_amount      = var.monthly_budget_limit
  limit_unit        = "USD"
  time_unit         = "MONTHLY"
  time_period_start = "2025-01-01_00:00"

  # Filter by Project tag to only track Kivan resources
  cost_filter {
    name = "TagKeyValue"
    values = [
      "Project$kivan"
    ]
  }

  # Actual alerts at 50% / 80% / 100% of budget
  dynamic "notification" {
    for_each = [50, 80, 100]
    content {
      comparison_operator       = "GREATER_THAN"
      threshold                 = notification.value
      threshold_type            = "PERCENTAGE"
      notification_type         = "ACTUAL"
      subscriber_sns_topic_arns = [aws_sns_topic.budget_alerts.arn]
    }
  }

  # Forecasted alert at 100% (projected overspend)
  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 100
    threshold_type            = "PERCENTAGE"
    notification_type         = "FORECASTED"
    subscriber_sns_topic_arns = [aws_sns_topic.budget_alerts.arn]
  }

  tags = {
    Name = "${local.project_name}-monthly-budget"
  }
}

# Daily Budget (Optional - for strict cost control)
# Tracks daily spending to catch unexpected cost spikes.
resource "aws_budgets_budget" "daily_budget" {
  name              = "${local.project_name}-${local.environment}-daily-budget"
  budget_type       = "COST"
  limit_amount      = var.daily_budget_limit
  limit_unit        = "USD"
  time_unit         = "DAILY"
  time_period_start = "2025-01-01_00:00"

  # Filter by Project tag
  cost_filter {
    name = "TagKeyValue"
    values = [
      "Project$kivan"
    ]
  }

  # Alert if daily cost exceeds limit
  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 100
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_sns_topic_arns = [aws_sns_topic.budget_alerts.arn]
  }

  tags = {
    Name = "${local.project_name}-daily-budget"
  }
}

# Service-Specific Budgets
# Track individual service costs for granular monitoring.
# One budget per entry: alert at 80% of the monthly limit, scoped to the
# service AND the Project=kivan tag.
locals {
  service_budgets = {
    apprunner = {
      service = "AWS App Runner"
      limit   = "50.00"
    }
    dynamodb = {
      service = "Amazon DynamoDB"
      limit   = "30.00"
    }
    lambda = {
      service = "AWS Lambda"
      limit   = "10.00"
    }
    cloudwatch = {
      service = "Amazon CloudWatch Logs"
      limit   = "10.00"
    }
  }
}

resource "aws_budgets_budget" "service" {
  for_each = local.service_budgets

  name              = "${local.project_name}-${local.environment}-${each.key}-budget"
  budget_type       = "COST"
  limit_amount      = each.value.limit
  limit_unit        = "USD"
  time_unit         = "MONTHLY"
  time_period_start = "2025-01-01_00:00"

  cost_filter {
    name   = "Service"
    values = [each.value.service]
  }

  cost_filter {
    name   = "TagKeyValue"
    values = ["Project$kivan"]
  }

  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 80
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_sns_topic_arns = [aws_sns_topic.budget_alerts.arn]
  }

  tags = {
    Name = "${local.project_name}-${each.key}-budget"
  }
}
