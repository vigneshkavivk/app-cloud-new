variable "dynamodb_table_name" {
  description = "Name of the DynamoDB table"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "prod"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}
variable "deployment_id" {
  description = "Unique deployment identifier for cost tracking"
  type        = string
}
variable "tags" {
  description = "A map of tags to assign to the S3 bucket"
  type        = map(string)
  default     = {}
}
