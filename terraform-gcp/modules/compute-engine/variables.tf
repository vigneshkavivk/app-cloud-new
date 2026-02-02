variable "project_id" {
  type = string
}

variable "instance_name" {
  type    = string
  default = "my-instance"
}

variable "machine_type" {
  type    = string
  default = "e2-micro"
}

variable "zone" {
  type    = string
  default = "us-central1-a"
}

variable "network" {
  type    = string
  default = "default"
}

variable "image" {
  type    = string
  default = "debian-cloud/debian-11"
}