# The Clerk secret key lives in SSM as a SecureString and reaches the
# container via App Runner's runtime_environment_secrets — never as a
# plaintext env var readable in the console or DescribeService output.
resource "aws_ssm_parameter" "clerk_secret_key" {
  name = "/${local.project_name}/${local.environment}/clerk-secret-key"
  type = "SecureString"
  # Encrypt with our own key, not the default aws/ssm one: App Runner can't
  # satisfy the default key's ViaService-only decrypt policy when it injects
  # the secret, so the deploy fails before the container starts (see kms.tf).
  key_id = aws_kms_key.secrets.arn
  value  = var.clerk_secret_key

  tags = {
    Name = "${local.project_name}-clerk-secret-key-${local.environment}"
  }
}
