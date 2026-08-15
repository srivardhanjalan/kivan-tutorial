# The notification pipeline's queue (step 11). The backend publishes an event
# here on a follow/love/create; the Lambda in lambda.tf drains it and writes the
# notification rows. The queue is what decouples the two — a slow or failing
# consumer never slows the action that triggered the notification.

# Dead-letter queue: a message the consumer fails on maxReceiveCount times lands
# here instead of redelivering forever. 14-day retention gives room to inspect a
# poison message before it ages out.
resource "aws_sqs_queue" "notifications_dlq" {
  name                      = "${local.project_name}-${local.environment}-notifications-dlq"
  message_retention_seconds = 1209600 # 14 days

  tags = {
    Name = "${local.project_name}-${local.environment}-notifications-dlq"
  }
}

# The main queue. visibility_timeout must be >= the Lambda's timeout (60s) so a
# message isn't redelivered while the function is still processing it; 300s
# leaves generous headroom. After maxReceiveCount failed receives a message is
# routed to the DLQ above.
resource "aws_sqs_queue" "notifications" {
  name                       = "${local.project_name}-${local.environment}-notifications"
  message_retention_seconds  = 345600 # 4 days
  visibility_timeout_seconds = 300    # 5 min, comfortably >= the 60s Lambda timeout

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.notifications_dlq.arn
    maxReceiveCount     = 3 # retry 3 times, then dead-letter
  })

  tags = {
    Name = "${local.project_name}-${local.environment}-notifications"
  }
}
