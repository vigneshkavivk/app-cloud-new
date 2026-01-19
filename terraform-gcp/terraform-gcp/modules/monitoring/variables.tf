variable "project_id" {
  type = string
}

variable "alert_policy_name" {
  type = string
}

variable "metric_type" {
  type    = string
  default = "compute.googleapis.com/instance/cpu/utilization"
}

variable "threshold_percent" {
  type    = number
  default = 80
}