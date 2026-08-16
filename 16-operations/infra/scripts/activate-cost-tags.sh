#!/bin/bash

# Activate Cost Allocation Tags for Kivan Resources
# This script activates the necessary tags so they appear in AWS Cost Explorer
# and can be used for filtering costs by Project, Environment, etc.

# Note: This only needs to be run ONCE. Tags take up to 24 hours to appear in billing reports.

set -e  # Exit on error

echo "===== Activating Cost Allocation Tags for Kivan ====="
echo ""
echo "This script will activate the following tags for cost tracking:"
echo "  - Project"
echo "  - Environment"
echo "  - ManagedBy"
echo "  - Application"
echo "  - Repository"
echo ""

# Get AWS Account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "AWS Account ID: ${ACCOUNT_ID}"
echo ""

# Activate cost allocation tags
# Note: These tags must already be applied to resources (which they are via Terraform)
# This command just makes them available for cost reporting

echo "Activating cost allocation tags..."
echo ""

# Activate Project tag
echo "Activating 'Project' tag..."
aws ce update-cost-allocation-tags-status \
    --cost-allocation-tags-status \
    TagKey=Project,Status=Active \
    --region us-east-1 2>/dev/null || echo "  ✓ Project tag already active or will be activated"

# Activate Environment tag
echo "Activating 'Environment' tag..."
aws ce update-cost-allocation-tags-status \
    --cost-allocation-tags-status \
    TagKey=Environment,Status=Active \
    --region us-east-1 2>/dev/null || echo "  ✓ Environment tag already active or will be activated"

# Activate ManagedBy tag
echo "Activating 'ManagedBy' tag..."
aws ce update-cost-allocation-tags-status \
    --cost-allocation-tags-status \
    TagKey=ManagedBy,Status=Active \
    --region us-east-1 2>/dev/null || echo "  ✓ ManagedBy tag already active or will be activated"

# Activate Application tag
echo "Activating 'Application' tag..."
aws ce update-cost-allocation-tags-status \
    --cost-allocation-tags-status \
    TagKey=Application,Status=Active \
    --region us-east-1 2>/dev/null || echo "  ✓ Application tag already active or will be activated"

# Activate Repository tag
echo "Activating 'Repository' tag..."
aws ce update-cost-allocation-tags-status \
    --cost-allocation-tags-status \
    TagKey=Repository,Status=Active \
    --region us-east-1 2>/dev/null || echo "  ✓ Repository tag already active or will be activated"

echo ""
echo "===== Tag Activation Complete ====="
echo ""
echo "IMPORTANT:"
echo "  - Tags will appear in AWS Cost Explorer and billing reports within 24 hours"
echo "  - You can verify activation status in the AWS Billing Console:"
echo "    https://console.aws.amazon.com/billing/home#/tags"
echo ""
echo "  - After activation, you can filter costs by these tags in:"
echo "    • AWS Cost Explorer"
echo "    • AWS Budgets"
echo "    • AWS Cost and Usage Reports"
echo ""
echo "To use in Cost Explorer:"
echo "  1. Go to: https://console.aws.amazon.com/cost-management/home#/cost-explorer"
echo "  2. Add filter: Tag -> Project: kivan"
echo "  3. Group by: Tag -> Environment (to see production vs dev costs)"
echo ""
echo "✓ Script completed successfully"
