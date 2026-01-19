variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "network_name" {
  description = "Name of the VPC network"
  type        = string
  default     = "my-vpc"
}

variable "cidr_block" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "subnets" {
  description = "List of subnets to create"
  type = list(object({
    name   = string
    region = string
    cidr   = string
  }))
  default = [
    {
      name   = "subnet-1"
      region = "us-central1"
      cidr   = "10.0.1.0/24"
    }
  ]
}

variable "firewall_rules" {
  description = "List of firewall rules"
  type = list(object({
    name    = string
    network = string
    allow   = list(object({ protocol = string, ports = list(string) }))
    source_ranges = list(string)
  }))
  default = [
    {
      name          = "allow-ssh"
      network       = "default"
      allow         = [{ protocol = "tcp", ports = ["22"] }]
      source_ranges = ["0.0.0.0/0"]
    }
  ]
}
