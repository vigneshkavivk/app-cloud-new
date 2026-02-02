variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "us-central1"
}

variable "network_name" {
  description = "Name of the VPC network"
  type        = string
}

variable "subnets" {
  description = "List of subnets to create"
  type = list(object({
    name   = string
    region = string
    cidr   = string
  }))
}

variable "firewall_rules" {
  description = "List of firewall rules"
  type = list(object({
    name          = string
    network       = string
    source_ranges = list(string)
    allow = list(object({
      protocol = string
      ports    = list(string)
    }))
  }))
}
