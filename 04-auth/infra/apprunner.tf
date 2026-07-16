# App Runner Service (ECR-based) — pulls :latest from ECR and redeploys
# automatically on push (auto_deployments_enabled)
resource "aws_apprunner_service" "backend_ecr" {
  service_name = "${local.project_name}-api-apprunner-${local.environment}"

  # The instance role must already be able to read the SSM secret when the
  # service first provisions — Terraform can't infer that ordering from the
  # role ARN alone, and losing the race is a CREATE_FAILED with no logs
  depends_on = [aws_iam_role_policy.apprunner_instance_ssm]

  source_configuration {
    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_ecr_access.arn
    }

    image_repository {
      image_configuration {
        port = "8000"

        runtime_environment_variables = {
          # Entries join when the backend first reads them (queue/bucket
          # names arrive with their features in later steps)
          ENVIRONMENT = var.environment
          AWS_REGION  = var.aws_region
        }

        # Secrets resolve from SSM at instance start via the instance role
        runtime_environment_secrets = {
          CLERK_SECRET_KEY = aws_ssm_parameter.clerk_secret_key.arn
        }
      }

      image_identifier      = "${aws_ecr_repository.backend.repository_url}:latest"
      image_repository_type = "ECR"
    }

    auto_deployments_enabled = true
  }

  instance_configuration {
    cpu    = var.apprunner_cpu
    memory = var.apprunner_memory

    instance_role_arn = aws_iam_role.apprunner_instance.arn
  }

  # Using AWS DefaultConfiguration for autoscaling (matching working examples)
  # No custom auto_scaling_configuration_arn needed

  health_check_configuration {
    protocol            = "HTTP"
    path                = "/health"
    interval            = 10
    timeout             = 5
    healthy_threshold   = 1
    unhealthy_threshold = 5
  }

  tags = {
    Name = "${local.project_name}-api-apprunner-service"
  }
}
