variable "project_id" {
  type        = string
  description = "GCP Project ID"
}

variable "bucket_name" {
  type        = string
  description = "Name of the logging bucket"
  default     = "my-logging-bucket"
}

variable "sink_name" {
  type        = string
  description = "Name of the sink"
  default     = "my-sink"
}

variable "filter" {
  type        = string
  description = "Log filter expression"
  default     = null  # ✅ no interpolation allowed
}