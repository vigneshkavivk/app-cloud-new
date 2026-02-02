# modules/cloudwatch/main.tf

# Create CloudWatch Log Group
resource "aws_cloudwatch_log_group" "this" {
  name              = var.log_group_name
  retention_in_days = var.log_retention_days == 0 ? null : var.log_retention_days
  kms_key_id        = var.kms_key_id != "" ? var.kms_key_id : null
  tags = merge(
    var.common_tags,
    {
      ManagedBy     = "Terraform"
      DeploymentId  = var.deployment_id
    }
  )
}

# Create SNS Topic for Alerts
resource "aws_sns_topic" "alert_topic" {
  name = "${var.application_name}-cloudwatch-alerts"
  tags = merge(
    var.common_tags,
    {
      ManagedBy     = "Terraform"
      DeploymentId  = var.deployment_id
    }
  )
}

# Subscribe email to SNS (if provided)
resource "aws_sns_topic_subscription" "email_alerts" {
  count = var.alert_email != "" ? 1 : 0

  topic_arn = aws_sns_topic.alert_topic.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# Optional: ECS Cluster Alarms
resource "aws_cloudwatch_metric_alarm" "ecs_cpu_high" {
  count = var.ecs_cluster_name != "" ? 1 : 0

  alarm_name          = "${var.application_name}-ecs-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "ECS cluster CPU utilization > 80% for 10 minutes"
  alarm_actions       = [aws_sns_topic.alert_topic.arn]
  dimensions = {
    ClusterName = var.ecs_cluster_name
  }
  tags = merge(
    var.common_tags,
    {
      ManagedBy     = "Terraform"
      DeploymentId  = var.deployment_id
    }
  )
}

resource "aws_cloudwatch_metric_alarm" "ecs_memory_high" {
  count = var.ecs_cluster_name != "" ? 1 : 0

  alarm_name          = "${var.application_name}-ecs-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "85"
  alarm_description   = "ECS cluster memory utilization > 85% for 10 minutes"
  alarm_actions       = [aws_sns_topic.alert_topic.arn]
  dimensions = {
    ClusterName = var.ecs_cluster_name
  }
  tags = merge(
    var.common_tags,
    {
      ManagedBy     = "Terraform"
      DeploymentId  = var.deployment_id
    }
  )
}
