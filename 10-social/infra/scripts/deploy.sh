#!/bin/bash
# Build the backend image for App Runner (amd64) and push it to ECR.
# App Runner auto-deploys :latest on push.
#
#   infra/scripts/deploy.sh
#
# APPLE SILICON: this must run on the colima-rosetta docker context (the
# plain docker driver through Rosetta). QEMU / docker-container builders
# produce images that pass locally and fail on AWS with CREATE_FAILED and
# no logs. setup.sh (step 01) configures the context; verify with:
#   docker context show   # → colima-rosetta
set -euo pipefail
cd "$(dirname "$0")/.."

ECR=$(terraform output -raw ecr_repository_url)
REGION=$(terraform output -raw ecr_repository_url | cut -d. -f4)

aws ecr get-login-password --region "$REGION" \
  | docker login --username AWS --password-stdin "${ECR%%/*}"

# --provenance/--sbom=false: BuildKit's default attestation manifests turn
# the push into an OCI image index App Runner cannot CREATE a service from
# (CREATE_FAILED, empty logs — same symptom as the QEMU trap, different cause)
docker build --platform linux/amd64 --provenance=false --sbom=false -t "${ECR}:latest" ../backend
docker push "${ECR}:latest"

echo "Pushed. App Runner redeploys automatically."

# App Runner creates its two log groups itself (their names embed a service
# ID that doesn't exist until the service does) — the one resource Terraform
# cannot own here. Tag them into the resource group and cap retention so
# nothing in the stack is untagged, ungrouped, or unbounded.
if ! SERVICE_ARN=$(terraform output -raw apprunner_ecr_service_arn 2>/dev/null); then
  echo "Service not created yet (first rollout) — after 'terraform apply',"
  echo "re-run this script once to tag the log groups (cached build, instant)."
  exit 0
fi
SERVICE_NAME=$(terraform output -raw apprunner_ecr_service_url >/dev/null 2>&1; aws apprunner describe-service --service-arn "$SERVICE_ARN" --region "$REGION" --query "Service.ServiceName" --output text)
SERVICE_ID=$(aws apprunner describe-service --service-arn "$SERVICE_ARN" --region "$REGION" --query "Service.ServiceId" --output text)
ENVIRONMENT=$(terraform output -raw resource_group_name | sed 's/.*-resources-//')
for LEG in application service; do
  LG="/aws/apprunner/${SERVICE_NAME}/${SERVICE_ID}/${LEG}"
  aws logs put-retention-policy --log-group-name "$LG" --retention-in-days 30 --region "$REGION" 2>/dev/null || true
  aws logs tag-log-group --log-group-name "$LG" --region "$REGION" \
    --tags "Project=kivan,Environment=${ENVIRONMENT},ManagedBy=deploy.sh" 2>/dev/null || true
done
echo "Log groups tagged into the resource group, retention 30d."
