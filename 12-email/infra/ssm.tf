# The Clerk secret key lives in SSM as a SecureString and reaches the
# container via App Runner's runtime_environment_secrets — never as a
# plaintext env var readable in the console or DescribeService output.
resource "aws_ssm_parameter" "clerk_secret_key" {
  name  = "/${local.project_name}/${local.environment}/clerk-secret-key"
  type  = "SecureString"
  value = var.clerk_secret_key

  tags = {
    Name = "${local.project_name}-clerk-secret-key-${local.environment}"
  }
}

# The Firecrawl API key follows the exact same pattern as the Clerk secret: a
# SecureString the scrape proxy resolves at instance start (never a plaintext
# env var readable in the console). The frontend can't hold it (a public app
# bundle is readable), so it lives here and reaches the container as
# FIRECRAWL_API_KEY (see apprunner.tf).
resource "aws_ssm_parameter" "firecrawl_api_key" {
  name  = "/${local.project_name}/${local.environment}/firecrawl-api-key"
  type  = "SecureString"
  value = var.firecrawl_api_key

  tags = {
    Name = "${local.project_name}-firecrawl-api-key-${local.environment}"
  }
}

# The Mailgun API key (step 12's email leg) is a secret too, so it follows the
# same SecureString pattern. Unlike the App Runner keys above, its consumer is
# the notification-processor Lambda, which fetches and decrypts it by parameter
# name at cold start (a Lambda env var is plaintext at rest, so the key can't
# ride there (see lambda.tf and handler.py). An empty value = email sending
# disabled: the handler treats a blank key as "not configured" and skips the
# send, so the whole leg is off until a real key is supplied.
resource "aws_ssm_parameter" "mailgun_api_key" {
  name  = "/${local.project_name}/${local.environment}/mailgun-api-key"
  type  = "SecureString"
  value = var.mailgun_api_key

  tags = {
    Name = "${local.project_name}-mailgun-api-key-${local.environment}"
  }
}
