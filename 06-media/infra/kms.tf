# Customer-managed key for the app's SSM SecureString secrets.
#
# The default `aws/ssm` key only allows decryption *through the SSM service*
# (its policy pins `kms:ViaService = ssm.<region>.amazonaws.com`), and App
# Runner's secret injection doesn't decrypt that way — so a SecureString on
# the default key fails to inject and the container never starts (CREATE_FAILED
# with no logs). Encrypting the secret with this key instead, whose policy we
# own, lets IAM grant the App Runner instance role a direct Decrypt (iam.tf).
resource "aws_kms_key" "secrets" {
  description             = "kivan ${local.environment} — encrypts SSM secrets for App Runner"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  # Standard "enable IAM policies" key policy: the account root holds full
  # control, which lets the instance role's IAM grant (kms:Decrypt) take effect.
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "EnableIAMPolicies"
        Effect    = "Allow"
        Principal = { AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root" }
        Action    = "kms:*"
        Resource  = "*"
      }
    ]
  })

  tags = {
    Name = "${local.project_name}-secrets-${local.environment}"
  }
}

resource "aws_kms_alias" "secrets" {
  name          = "alias/${local.project_name}-${local.environment}-secrets"
  target_key_id = aws_kms_key.secrets.key_id
}
