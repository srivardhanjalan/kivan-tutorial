# The notification processor (step 11): a zip-deployed Lambda triggered by the
# SQS queue in sqs.tf. It is the only writer of the notifications table, and
# (step 12) mails each recipient a copy via Mailgun. The zip is built by
# ../lambda/build.sh (handler.py plus vendored `requests`; boto3 ships with the
# runtime) and must exist before `terraform apply`.

# Execution role the function assumes.
resource "aws_iam_role" "notification_processor" {
  name = "${local.project_name}-${local.environment}-notification-processor"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action    = "sts:AssumeRole"
        Effect    = "Allow"
        Principal = { Service = "lambda.amazonaws.com" }
      }
    ]
  })

  tags = {
    Name = "${local.project_name}-${local.environment}-notification-processor-role"
  }
}

# SQS: the trigger needs to receive and delete the messages it processes, and
# read queue attributes. Scoped to this one queue.
resource "aws_iam_role_policy" "notification_processor_sqs" {
  name = "${local.project_name}-${local.environment}-notification-processor-sqs"
  role = aws_iam_role.notification_processor.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = aws_sqs_queue.notifications.arn
      }
    ]
  })
}

# DynamoDB: exactly the three tables the handler touches, each with only the
# action it uses — PutItem to write the notification, GetItem on settings for
# the mute check, GetItem on users for the recipient-exists guard. No Query
# (the read-side queries live on the App Runner role, not here).
resource "aws_iam_role_policy" "notification_processor_dynamodb" {
  name = "${local.project_name}-${local.environment}-notification-processor-dynamodb"
  role = aws_iam_role.notification_processor.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["dynamodb:PutItem"]
        Resource = aws_dynamodb_table.notifications.arn
      },
      {
        Effect   = "Allow"
        Action   = ["dynamodb:GetItem"]
        Resource = aws_dynamodb_table.notification_settings.arn
      },
      {
        Effect   = "Allow"
        Action   = ["dynamodb:GetItem"]
        Resource = aws_dynamodb_table.users.arn
      }
    ]
  })
}

# SSM: the Mailgun API key is a SecureString the handler fetches by name at cold
# start (step 12). GetParameter scoped to that one parameter: the default
# aws/ssm key needs no extra kms:Decrypt grant, matching the App Runner instance
# role's SSM idiom (see iam.tf / apprunner.tf).
resource "aws_iam_role_policy" "notification_processor_ssm" {
  name = "${local.project_name}-${local.environment}-notification-processor-ssm"
  role = aws_iam_role.notification_processor.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # The ARN is built from the parameter NAME, not the resource, because
        # the parameter only exists when a key is supplied; granting the name
        # is valid either way, and the handler treats ParameterNotFound as
        # "not configured".
        Effect   = "Allow"
        Action   = ["ssm:GetParameter"]
        Resource = "arn:aws:ssm:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:parameter/${local.project_name}/${local.environment}/mailgun-api-key"
      }
    ]
  })
}

# CloudWatch Logs write access for the function (create streams + put events).
resource "aws_iam_role_policy_attachment" "notification_processor_logs" {
  role       = aws_iam_role.notification_processor.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# The function's log group, owned explicitly so it carries the stack's tags and
# a bounded retention (App Runner's self-created groups get the same treatment
# in deploy.sh). Named to match the function so Lambda writes into this group
# rather than an untagged, never-expiring one it would create itself.
resource "aws_cloudwatch_log_group" "notification_processor" {
  name              = "/aws/lambda/${local.project_name}-${local.environment}-notification-processor"
  retention_in_days = 14

  tags = {
    Name = "${local.project_name}-${local.environment}-notification-processor-logs"
  }
}

resource "aws_lambda_function" "notification_processor" {
  function_name = "${local.project_name}-${local.environment}-notification-processor"
  role          = aws_iam_role.notification_processor.arn

  # Zip deployment. source_code_hash triggers a redeploy whenever the zip's
  # bytes change; guarded by fileexists so a plan before the first build (zip
  # absent) reads null instead of erroring.
  filename         = "${path.module}/../lambda/notification_processor.zip"
  source_code_hash = fileexists("${path.module}/../lambda/notification_processor.zip") ? filebase64sha256("${path.module}/../lambda/notification_processor.zip") : null

  handler     = "handler.lambda_handler"
  runtime     = "python3.11"
  timeout     = 60  # seconds
  memory_size = 512 # MB

  environment {
    variables = {
      # Only what handler.py actually reads. AWS_REGION is reserved by Lambda,
      # so the region rides in under a custom name the handler looks up.
      NOTIFICATIONS_TABLE         = aws_dynamodb_table.notifications.name
      NOTIFICATION_SETTINGS_TABLE = aws_dynamodb_table.notification_settings.name
      USERS_TABLE                 = aws_dynamodb_table.users.name
      AWS_REGION_NAME             = var.aws_region
      # Mailgun (step 12). The API key is NOT here: a Lambda env var is
      # plaintext at rest, so the handler fetches it from SSM by this parameter
      # NAME. The domain and from-address are not secret and ride as plain env.
      MAILGUN_API_KEY_PARAM = "/${local.project_name}/${local.environment}/mailgun-api-key"
      MAILGUN_DOMAIN        = var.mailgun_domain
      MAILGUN_FROM_EMAIL    = var.mailgun_from_email
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.notification_processor,
    aws_iam_role_policy.notification_processor_sqs,
    aws_iam_role_policy.notification_processor_dynamodb,
    aws_iam_role_policy.notification_processor_ssm,
    aws_iam_role_policy_attachment.notification_processor_logs
  ]

  tags = {
    Name = "${local.project_name}-${local.environment}-notification-processor"
  }
}

# The SQS trigger. Batches up to 10 messages (or a 5s window) per invocation,
# and reports partial batch failures so only the records the handler couldn't
# process are redelivered. maximum_concurrency caps how many copies run at once.
resource "aws_lambda_event_source_mapping" "notifications_trigger" {
  event_source_arn = aws_sqs_queue.notifications.arn
  function_name    = aws_lambda_function.notification_processor.arn

  batch_size                         = 10
  maximum_batching_window_in_seconds = 5
  function_response_types            = ["ReportBatchItemFailures"]

  scaling_config {
    maximum_concurrency = 10
  }
}
