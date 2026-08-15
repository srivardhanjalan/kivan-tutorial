# Cost Management — alerting channel for Kivan
#
# Phase A ships only the notification channel: one SNS topic and its email
# subscription. Every CloudWatch alarm (alarms.tf) publishes here, so the topic
# has to exist before the alarms that reference its ARN. The budgets that also
# publish to this topic join this file in the next step.
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
