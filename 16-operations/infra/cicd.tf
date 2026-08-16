# CI/CD plumbing for the backend deploy workflow (cicd/backend/deploy.yml).
#
# This is the AWS side of GitHub Actions OIDC: a federated identity provider and
# an IAM role the workflow assumes with a short-lived token — no long-lived AWS
# keys stored in GitHub. The workflow authenticates as this role, pushes the
# backend image to ECR, and App Runner auto-deploys it (auto_deployments_enabled
# in apprunner.tf).
#
# HONEST DEFAULT — why these resources are count-gated:
# var.github_repository defaults to "" and every resource here is gated on it
# being set. A default that pointed at the tutorial's own repo would create a
# LIVE, assumable deploy role on every learner's account the moment they apply —
# a real credential to a repo they don't control. So, like the SSM empty-pattern
# in ssm.tf (an unset secret creates no parameter), an unset github_repository
# creates no provider and no role. A learner wiring up their own fork sets
# github_repository = "their-org/their-fork" and the plumbing appears, trust
# scoped to exactly that repo.
#
# NOTE: AWS allows only one GitHub OIDC provider per account. If your account
# already has one (e.g. from another project), import it or reference it instead
# of creating a second — a duplicate apply will fail.

# GitHub OIDC provider — lets token.actions.githubusercontent.com federate into
# STS. The thumbprint is GitHub's (rotated 2023/2024); the audience is the STS
# service principal the aws-actions/configure-aws-credentials action requests.
resource "aws_iam_openid_connect_provider" "github_actions" {
  count = var.github_repository == "" ? 0 : 1

  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]

  tags = {
    Name = "${local.project_name}-github-actions-oidc-provider"
  }
}

# The role GitHub Actions assumes. Trust is scoped to var.github_repository via
# the `sub` claim (repo:<owner>/<repo>:* — any branch/tag/environment of that one
# repo), and to the STS audience via the `aud` claim.
resource "aws_iam_role" "github_actions" {
  count = var.github_repository == "" ? 0 : 1

  name        = "${local.project_name}-github-actions-role-${local.environment}"
  description = "Role for GitHub Actions to push the Kivan backend image to ECR and trigger App Runner"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github_actions[0].arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:${var.github_repository}:*"
          }
        }
      }
    ]
  })

  tags = {
    Name = "${local.project_name}-github-actions-role"
  }
}

# Deploy policy — scoped to THIS stack's resources, not "*". The two actions that
# don't support resource-level permissions (ecr:GetAuthorizationToken and
# apprunner:ListServices) get their own "*" statements; everything else is pinned
# to this stack's ECR repo and App Runner service ARNs.
resource "aws_iam_policy" "github_actions" {
  count = var.github_repository == "" ? 0 : 1

  name        = "${local.project_name}-github-actions-policy-${local.environment}"
  description = "Push to this stack's ECR repo and trigger its App Runner deployment"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Account-level: ECR auth token has no resource scope.
        Sid      = "EcrAuthToken"
        Effect   = "Allow"
        Action   = "ecr:GetAuthorizationToken"
        Resource = "*"
      },
      {
        # Push/pull, scoped to this stack's repository only.
        Sid    = "EcrPushPull"
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:DescribeImages",
          "ecr:DescribeRepositories"
        ]
        Resource = aws_ecr_repository.backend.arn
      },
      {
        # Account-level: App Runner list has no resource scope.
        Sid      = "AppRunnerList"
        Effect   = "Allow"
        Action   = "apprunner:ListServices"
        Resource = "*"
      },
      {
        # Describe + trigger a deployment, scoped to this stack's service.
        Sid    = "AppRunnerDeploy"
        Effect = "Allow"
        Action = [
          "apprunner:DescribeService",
          "apprunner:StartDeployment",
          "apprunner:ListOperations",
          "apprunner:DescribeOperation"
        ]
        Resource = aws_apprunner_service.backend_ecr.arn
      }
    ]
  })

  tags = {
    Name = "${local.project_name}-github-actions-policy"
  }
}

resource "aws_iam_role_policy_attachment" "github_actions" {
  count = var.github_repository == "" ? 0 : 1

  role       = aws_iam_role.github_actions[0].name
  policy_arn = aws_iam_policy.github_actions[0].arn
}
