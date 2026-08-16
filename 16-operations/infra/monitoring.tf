# CloudWatch Dashboards for Kivan Backend Monitoring
# This file creates comprehensive dashboards for operations, errors, and performance monitoring
#
# Dashboard URL outputs live in outputs.tf (one output per dashboard), not here.

# AppRunner metrics are published with BOTH ServiceName and ServiceID dimensions;
# widgets/alarms that omit them plot a metric that does not exist.
locals {
  apprunner_dims = ["ServiceName", aws_apprunner_service.backend_ecr.service_name, "ServiceID", aws_apprunner_service.backend_ecr.service_id]
}

# 1. OPERATIONS DASHBOARD - API Health, Performance, Requests
resource "aws_cloudwatch_dashboard" "operations" {
  dashboard_name = "${local.project_name}-${local.environment}-operations"

  dashboard_body = jsonencode({
    widgets = [
      # AppRunner Service Status
      {
        type = "metric"
        properties = {
          metrics = [
            concat(["AWS/AppRunner", "Requests"], local.apprunner_dims, [{ stat = "Sum", label = "Total Requests" }]),
            concat([".", "2xxStatusResponses"], local.apprunner_dims, [{ stat = "Sum", label = "Success (2xx)" }]),
            concat([".", "4xxStatusResponses"], local.apprunner_dims, [{ stat = "Sum", label = "Client Errors (4xx)" }]),
            concat([".", "5xxStatusResponses"], local.apprunner_dims, [{ stat = "Sum", label = "Server Errors (5xx)" }])
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "API Requests & Status Codes"
          period  = 300
        }
      },
      # AppRunner Response Time
      {
        type = "metric"
        properties = {
          metrics = [
            concat(["AWS/AppRunner", "RequestLatency"], local.apprunner_dims, [{ stat = "Average", label = "Avg Latency" }]),
            ["...", { stat = "p99", label = "P99 Latency" }],
            ["...", { stat = "p95", label = "P95 Latency" }]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "API Response Time (ms)"
          period  = 300
        }
      },
      # AppRunner Active Instances
      {
        type = "metric"
        properties = {
          metrics = [
            concat(["AWS/AppRunner", "ActiveInstances"], local.apprunner_dims, [{ stat = "Average", label = "Active Instances" }])
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Active AppRunner Instances"
          period  = 300
        }
      },
      # AppRunner CPU & Memory
      {
        type = "metric"
        properties = {
          metrics = [
            concat(["AWS/AppRunner", "CPUUtilization"], local.apprunner_dims, [{ stat = "Average", label = "CPU %" }]),
            concat([".", "MemoryUtilization"], local.apprunner_dims, [{ stat = "Average", label = "Memory %" }])
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "AppRunner Resource Utilization"
          period  = 300
          yAxis = {
            left = {
              min = 0
              max = 100
            }
          }
        }
      }
    ]
  })
}

# 2. DATABASE DASHBOARD - DynamoDB Metrics
resource "aws_cloudwatch_dashboard" "database" {
  dashboard_name = "${local.project_name}-${local.environment}-database"

  dashboard_body = jsonencode({
    widgets = [
      # DynamoDB Read/Write Capacity
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/DynamoDB", "ConsumedReadCapacityUnits", "TableName", "${local.project_name}-${local.environment}-users", { stat = "Sum", label = "Users - Read" }],
            ["...", "${local.project_name}-${local.environment}-wishlists", { stat = "Sum", label = "Wishlists - Read" }],
            ["...", "${local.project_name}-${local.environment}-wishes", { stat = "Sum", label = "Wishes - Read" }],
            ["...", "${local.project_name}-${local.environment}-notifications", { stat = "Sum", label = "Notifications - Read" }]
          ]
          view    = "timeSeries"
          stacked = true
          region  = var.aws_region
          title   = "DynamoDB Read Capacity Units Consumed"
          period  = 300
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/DynamoDB", "ConsumedWriteCapacityUnits", "TableName", "${local.project_name}-${local.environment}-users", { stat = "Sum", label = "Users - Write" }],
            ["...", "${local.project_name}-${local.environment}-wishlists", { stat = "Sum", label = "Wishlists - Write" }],
            ["...", "${local.project_name}-${local.environment}-wishes", { stat = "Sum", label = "Wishes - Write" }],
            ["...", "${local.project_name}-${local.environment}-notifications", { stat = "Sum", label = "Notifications - Write" }]
          ]
          view    = "timeSeries"
          stacked = true
          region  = var.aws_region
          title   = "DynamoDB Write Capacity Units Consumed"
          period  = 300
        }
      },
      # DynamoDB User Errors
      # NOTE: UserErrors is an account/region-level metric with NO dimensions;
      # per-TableName UserErrors/SystemErrors series are not published, so the
      # old per-table widgets always rendered empty and were removed.
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/DynamoDB", "UserErrors", { stat = "Sum", label = "User Errors (account-wide)" }]
          ]
          view    = "timeSeries"
          stacked = true
          region  = var.aws_region
          title   = "DynamoDB User Errors"
          period  = 300
        }
      },
      # DynamoDB Latency
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/DynamoDB", "SuccessfulRequestLatency", "TableName", "${local.project_name}-${local.environment}-users", "Operation", "GetItem", { stat = "Average", label = "Users GetItem" }],
            ["...", "${local.project_name}-${local.environment}-wishlists", ".", ".", { stat = "Average", label = "Wishlists GetItem" }],
            ["...", "${local.project_name}-${local.environment}-wishes", ".", "Query", { stat = "Average", label = "Wishes Query" }]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "DynamoDB Operation Latency (ms)"
          period  = 300
        }
      }
    ]
  })
}

# 3. LAMBDA & SQS DASHBOARD - Notification Processing
resource "aws_cloudwatch_dashboard" "lambda_sqs" {
  dashboard_name = "${local.project_name}-${local.environment}-lambda-sqs"

  dashboard_body = jsonencode({
    widgets = [
      # Lambda Invocations
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/Lambda", "Invocations", "FunctionName", "${local.project_name}-${local.environment}-notification-processor", { stat = "Sum", label = "Invocations" }],
            [".", "Errors", ".", ".", { stat = "Sum", label = "Errors" }],
            [".", "Throttles", ".", ".", { stat = "Sum", label = "Throttles" }]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Lambda Invocations & Errors"
          period  = 300
        }
      },
      # Lambda Duration & Concurrent Executions
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/Lambda", "Duration", "FunctionName", "${local.project_name}-${local.environment}-notification-processor", { stat = "Average", label = "Avg Duration" }],
            ["...", { stat = "Maximum", label = "Max Duration" }],
            [".", "ConcurrentExecutions", ".", ".", { stat = "Maximum", label = "Concurrent Executions" }]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Lambda Duration (ms) & Concurrency"
          period  = 300
        }
      },
      # SQS Messages Sent/Received
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/SQS", "NumberOfMessagesSent", "QueueName", "${local.project_name}-${local.environment}-notifications", { stat = "Sum", label = "Messages Sent" }],
            [".", "NumberOfMessagesReceived", ".", ".", { stat = "Sum", label = "Messages Received" }],
            [".", "NumberOfMessagesDeleted", ".", ".", { stat = "Sum", label = "Messages Deleted" }]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "SQS Messages Flow"
          period  = 300
        }
      },
      # SQS Queue Depth & DLQ
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/SQS", "ApproximateNumberOfMessagesVisible", "QueueName", "${local.project_name}-${local.environment}-notifications", { stat = "Average", label = "Queue Depth" }],
            ["...", "${local.project_name}-${local.environment}-notifications-dlq", { stat = "Average", label = "DLQ Depth" }],
            [".", "ApproximateAgeOfOldestMessage", ".", "${local.project_name}-${local.environment}-notifications", { stat = "Maximum", label = "Oldest Message Age (s)" }]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "SQS Queue Depth & Message Age"
          period  = 300
        }
      }
    ]
  })
}

# 4. ERROR DASHBOARD - All Error Rates & Failures
resource "aws_cloudwatch_dashboard" "errors" {
  dashboard_name = "${local.project_name}-${local.environment}-errors"

  dashboard_body = jsonencode({
    widgets = [
      # Error Rate Summary
      # NOTE: DynamoDB SystemErrors is only published per TableName+Operation, so
      # the old dimensionless SystemErrors line (which never had data) was removed.
      {
        type = "metric"
        properties = {
          metrics = [
            concat(["AWS/AppRunner", "4xxStatusResponses"], local.apprunner_dims, [{ stat = "Sum", label = "API 4xx Errors" }]),
            concat([".", "5xxStatusResponses"], local.apprunner_dims, [{ stat = "Sum", label = "API 5xx Errors" }]),
            ["AWS/Lambda", "Errors", "FunctionName", "${local.project_name}-${local.environment}-notification-processor", { stat = "Sum", label = "Lambda Errors" }],
            ["AWS/DynamoDB", "UserErrors", { stat = "Sum", label = "DynamoDB User Errors" }]
          ]
          view    = "timeSeries"
          stacked = true
          region  = var.aws_region
          title   = "Error Rate Summary (All Services)"
          period  = 300
        }
      },
      # AppRunner Error Rate %
      {
        type = "metric"
        properties = {
          metrics = [
            [{
              expression = "(m2/m1)*100"
              label      = "5xx Error Rate %"
              id         = "e1"
            }],
            [{
              expression = "(m3/m1)*100"
              label      = "4xx Error Rate %"
              id         = "e2"
            }],
            concat(["AWS/AppRunner", "Requests"], local.apprunner_dims, [{ id = "m1", visible = false }]),
            concat([".", "5xxStatusResponses"], local.apprunner_dims, [{ id = "m2", visible = false }]),
            concat([".", "4xxStatusResponses"], local.apprunner_dims, [{ id = "m3", visible = false }])
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "API Error Rate (%)"
          period  = 300
          yAxis = {
            left = {
              min = 0
            }
          }
        }
      },
      # Lambda Error Rate %
      {
        type = "metric"
        properties = {
          metrics = [
            [{
              expression = "(m2/m1)*100"
              label      = "Lambda Error Rate %"
              id         = "e1"
            }],
            ["AWS/Lambda", "Invocations", "FunctionName", "${local.project_name}-${local.environment}-notification-processor", { id = "m1", visible = false }],
            [".", "Errors", ".", ".", { id = "m2", visible = false }]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Lambda Error Rate (%)"
          period  = 300
        }
      },
      # Dead Letter Queue Messages (Critical Alert)
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/SQS", "ApproximateNumberOfMessagesVisible", "QueueName", "${local.project_name}-${local.environment}-notifications-dlq", { stat = "Maximum", label = "DLQ Messages" }]
          ]
          view   = "singleValue"
          region = var.aws_region
          title  = "Dead Letter Queue Messages (Should be 0)"
          period = 300
        }
      }
    ]
  })
}
