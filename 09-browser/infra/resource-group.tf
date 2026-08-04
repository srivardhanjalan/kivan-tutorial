# Resource Group for all Kivan resources
resource "aws_resourcegroups_group" "kivan" {
  name        = "${local.project_name}-resources-${local.environment}"
  description = "Resource group for all Kivan ${local.environment} resources"

  resource_query {
    query = jsonencode({
      ResourceTypeFilters = ["AWS::AllSupported"]
      TagFilters = [
        {
          Key    = "Project"
          Values = ["kivan"]
        },
        {
          Key    = "Environment"
          Values = [var.environment]
        }
      ]
    })
  }

  tags = {
    Name = "${local.project_name}-resource-group"
  }
}
