# sns/variables.tf

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (e.g., dev, prod)"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "myproject"
}

variable "sns_topics" {
  description = "Map of SNS topics to create. Key = topic name, Value = config"
  type = map(object({
    display_name = optional(string)
    tags         = optional(map(string))
  }))
  default = {}
}

variable "sns_subscriptions" {
  description = "Map of SNS subscriptions. Key = subscription name, Value = config"
  type = map(object({
    topic_name = string      # must match a key in sns_topics
    protocol   = string      # e.g., email, lambda, sqs, https
    endpoint   = string      # e.g., email address or ARN
    raw_message_delivery = optional(bool)
  }))
  default = {}
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}
variable "deployment_id" {
  description = "Unique deployment identifier for cost tracking"
  type        = string
}
# modules/cloudwatch/variables.tf
variable "log_group_name" {
  description = "Name of the CloudWatch log group"
  type        = string
}

variable "application_name" {
  description = "Application name for alarms/SNS"
  type        = string
}

variable "alert_email" {
  description = "Email to subscribe to alerts"
  type        = string
  default     = ""
}

variable "log_retention_days" {
  description = "Retention period in days"
  type        = number
  default     = 14
}

variable "ecs_cluster_name" {
  description = "ECS cluster name (optional)"
  type        = string
  default     = ""
}

variable "alb_name" {
  description = "ALB name (optional)"
  type        = string
  default     = ""
}

variable "deployment_id" {
  description = "Unique deployment ID for cost tracking"
  type        = string
}

variable "common_tags" {
  description = "Common tags"
  type        = map(string)
  default     = {}
}

variable "kms_key_id" {
  description = "KMS key ID for log group encryption (optional)"
  type        = string
  default     = ""
}
